'use strict';

const { supabase } = require('../config/supabase');
const { escapeHtml } = require('../utils/sanitize');
const { DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_PREFERENCE_KEYS, MAX_DAILY_EMAILS } = require('../constants');
const logger = require('../utils/logger');

// ─── In-memory email daily limit (replaced with Redis-backed counter in prod) ─
let dailyUsage = { day: '', count: 0 };

function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function sendEmailViaResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !to) return { sent: false, reason: 'email_not_configured' };
  if (to.length > 320 || subject.length > 180 || text.length > 4000 || html.length > 12000) {
    return { sent: false, reason: 'email_payload_rejected' };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dailyUsage.day !== today) dailyUsage = { day: today, count: 0 };
  if (dailyUsage.count >= MAX_DAILY_EMAILS) return { sent: false, reason: 'email_daily_limit' };
  dailyUsage.count += 1;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: controller.signal
    });
    if (!response.ok) { dailyUsage.count -= 1; return { sent: false, reason: 'email_provider_rejected' }; }
    return { sent: true };
  } catch (error) {
    dailyUsage.count -= 1;
    return { sent: false, reason: error.name === 'AbortError' ? 'email_timeout' : 'email_provider_unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

async function queueNotificationEmail({ userId, type, message, eventKey }) {
  if (!isEmailConfigured()) return;

  const { data: profile } = await supabase
    .from('profiles').select('email, notification_preferences').eq('id', userId).maybeSingle();
  if (!profile?.email) return;

  const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(profile.notification_preferences || {}) };
  const preferenceKey = NOTIFICATION_PREFERENCE_KEYS[type] || 'activity';
  if (!preferences.emailEnabled || !preferences[preferenceKey]) return;

  if (eventKey) {
    const { error: deliveryError } = await supabase
      .from('notification_deliveries').insert({ user_id: userId, notification_type: type, event_key: eventKey });
    if (deliveryError) return; // Already delivered
  }

  const subjectMap = {
    task_assigned: 'new task assignment',
    deadline_reminder: 'upcoming deadline'
  };
  const result = await sendEmailViaResend({
    to: profile.email,
    subject: `SyncBoard: ${subjectMap[type] || 'workspace update'}`,
    text: `${message}\n\nOpen SyncBoard to review this update.`,
    html: `<p>${escapeHtml(message)}</p><p>Open SyncBoard to review this update.</p>`
  });

  if (!result.sent && eventKey) {
    await supabase.from('notification_deliveries')
      .delete().eq('user_id', userId).eq('notification_type', type).eq('event_key', eventKey);
  }
}

/**
 * Creates a persistent notification in the DB and emits it via socket to the user.
 * Optionally queues an email if the user's preferences allow it.
 */
async function createNotification(userId, type, message, taskId, teamId, options = {}, io = null) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    message,
    task_id: taskId || null,
    team_id: teamId || null
  });

  if (error) {
    logger.warn({ err: error.message, userId, type }, 'Failed to create notification');
    return;
  }

  // Emit to connected user socket(s)
  if (io) {
    io.sockets.sockets.forEach(socket => {
      if (socket.userId === userId) {
        socket.emit('notification:new', { userId, type, message });
      }
    });
  }

  if (options.sendEmail !== false) {
    void queueNotificationEmail({ userId, type, message, eventKey: options.eventKey });
  }
}

async function getNotifications(userId, limit = 50) {
  const clampedLimit = Math.min(Math.max(limit, 1), 100);
  const { data: notifications } = await supabase
    .from('notifications').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(clampedLimit);

  return (notifications || []).map(n => ({
    id: n.id,
    type: n.type,
    message: n.message,
    taskId: n.task_id,
    teamId: n.team_id,
    read: n.read,
    createdAt: n.created_at
  }));
}

async function markRead(notificationId, userId) {
  const { error } = await supabase
    .from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId);
  if (error) throw Object.assign(new Error('Failed to update notification'), { status: 500 });
  return { success: true };
}

async function markAllRead(userId) {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  return { success: true };
}

async function sendDeadlineReminders(io) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const deadline = tomorrow.toISOString().slice(0, 10);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { data: tasks } = await supabase
    .from('tasks').select('id, title, team_id, assignee_id')
    .eq('due_date', deadline).neq('status', 'done').not('assignee_id', 'is', null);

  for (const task of tasks || []) {
    const { data: existingReminder } = await supabase
      .from('notifications').select('id')
      .eq('user_id', task.assignee_id).eq('type', 'deadline_reminder').eq('task_id', task.id)
      .gte('created_at', today.toISOString()).limit(1).maybeSingle();
    if (existingReminder) continue;

    await createNotification(
      task.assignee_id, 'deadline_reminder',
      `Your task "${task.title}" is due tomorrow.`,
      task.id, task.team_id,
      { sendEmail: false },
      io
    );
    void queueNotificationEmail({
      userId: task.assignee_id,
      type: 'deadline_reminder',
      message: `Your task "${task.title}" is due tomorrow.`,
      eventKey: `${task.id}:${deadline}`
    });
  }
}

module.exports = {
  createNotification,
  getNotifications,
  markRead,
  markAllRead,
  sendDeadlineReminders,
  isEmailConfigured,
  sendEmailViaResend,
  queueNotificationEmail
};

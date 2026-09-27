'use strict';

const { supabase } = require('../config/supabase');
const { sanitize } = require('../utils/sanitize');

async function getProfile(userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, user_id, name, email, avatar, created_at')
    .eq('id', userId)
    .single();
  if (error || !profile) throw Object.assign(new Error('Profile not found'), { status: 404 });
  return {
    id: profile.id,
    userId: profile.user_id,
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar,
    joinedAt: profile.created_at
  };
}

async function updateProfile(userId, { name, avatar }) {
  const cleanName = sanitize(name || '').trim();
  if (!cleanName || cleanName.length > 80) {
    throw Object.assign(new Error('Name must be between 1 and 80 characters.'), { code: 'INVALID_PROFILE_NAME', status: 400 });
  }

  const requestedAvatar = sanitize(avatar || '').trim().toUpperCase();
  const finalAvatar = requestedAvatar.slice(0, 3) || cleanName.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ name: cleanName, avatar: finalAvatar })
    .eq('id', userId)
    .select('id, user_id, name, email, avatar, created_at')
    .single();

  if (error || !profile) throw Object.assign(new Error('Unable to update profile'), { status: 500 });

  return {
    id: profile.id,
    userId: profile.user_id,
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar,
    joinedAt: profile.created_at
  };
}

async function getNotificationPreferences(userId, DEFAULT_PREFS) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();
  if (error || !profile) throw Object.assign(new Error('Notification preferences not found'), { status: 404 });
  return { preferences: { ...DEFAULT_PREFS, ...(profile.notification_preferences || {}) } };
}

async function updateNotificationPreferences(userId, incoming, DEFAULT_PREFS) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    throw Object.assign(new Error('Notification preferences are required'), { status: 400 });
  }

  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();
  if (profileError || !currentProfile) throw Object.assign(new Error('Notification preferences not found'), { status: 404 });

  const current = { ...DEFAULT_PREFS, ...(currentProfile.notification_preferences || {}) };
  const preferences = Object.fromEntries(
    Object.keys(DEFAULT_PREFS).map(key => [
      key,
      incoming[key] === undefined ? current[key] : incoming[key] === true
    ])
  );

  const { error } = await supabase.from('profiles').update({ notification_preferences: preferences }).eq('id', userId);
  if (error) throw Object.assign(new Error('Unable to save notification preferences'), { status: 500 });
  return { preferences };
}

async function getUserProfile(requesterId, targetUserId) {
  // Shared team validation
  const { data: requesterMemberships, error: requesterError } = await supabase
    .from('team_members').select('team_id').eq('user_id', requesterId);
  if (requesterError) throw Object.assign(new Error('Failed to validate profile access'), { status: 500 });

  const teamIds = (requesterMemberships || []).map(m => m.team_id);
  if (!teamIds.length) throw Object.assign(new Error('You do not share a team with this user'), { status: 403 });

  let sharedTeamIds = teamIds;
  if (requesterId !== targetUserId) {
    const { data: targetMemberships, error: targetError } = await supabase
      .from('team_members').select('team_id').eq('user_id', targetUserId).in('team_id', teamIds);
    if (targetError) throw Object.assign(new Error('Failed to validate profile access'), { status: 500 });
    const targetTeamIds = new Set((targetMemberships || []).map(m => m.team_id));
    sharedTeamIds = teamIds.filter(id => targetTeamIds.has(id));
  }

  if (!sharedTeamIds.length) throw Object.assign(new Error('You do not share a team with this user'), { status: 403 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
  if (!profile) throw Object.assign(new Error('User not found'), { status: 404 });

  const { data: tasks } = await supabase
    .from('tasks').select('*').eq('assignee_id', targetUserId).in('team_id', sharedTeamIds);

  const allTasks = tasks || [];
  const completed = allTasks.filter(t => t.status === 'done').length;
  const active = allTasks.filter(t => t.status === 'in progress').length;
  const missed = allTasks.filter(t => {
    const dl = t.deadline || t.due_date;
    return dl && new Date(dl) < new Date() && t.status !== 'done';
  }).length;

  const recentCompleted = allTasks
    .filter(t => t.status === 'done')
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 10)
    .map(t => ({ title: t.title, completedAt: t.updated_at }));

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar,
    joinedAt: profile.created_at,
    stats: { total: allTasks.length, completed, active, missed },
    recentActivity: recentCompleted
  };
}

module.exports = {
  getProfile,
  updateProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  getUserProfile
};

'use strict';

const { supabase } = require('../config/supabase');
const { sanitize } = require('../utils/sanitize');
const { TASK_STATUSES, TIMER_ACTIONS } = require('../constants');
const notificationService = require('./notification.service');
const activityService = require('./activity.service');

function mapTask(t) {
  return {
    id: t.id,
    teamId: t.team_id,
    title: t.title,
    description: t.description,
    status: t.status,
    assigneeId: t.assignee_id,
    milestoneId: t.milestone_id || null,
    estimatedTime: t.estimated_time,
    actualTime: t.actual_time,
    dueDate: t.due_date,
    deadline: t.deadline || t.due_date,
    difficulty: t.difficulty || null,
    timerRunning: t.timer_running,
    timerStart: t.timer_start,
    createdAt: t.created_at
  };
}

async function getTasks(userId, teamId) {
  if (teamId) {
    const { data: tasks } = await supabase.from('tasks').select('*').eq('team_id', teamId);
    return (tasks || []).map(mapTask);
  }

  const { data: memberships } = await supabase.from('team_members').select('team_id').eq('user_id', userId);
  if (!memberships || !memberships.length) return [];

  const teamIds = memberships.map(m => m.team_id);
  const { data: tasks } = await supabase.from('tasks').select('*').in('team_id', teamIds);
  return (tasks || []).map(mapTask);
}

async function createTask(actor, body, io) {
  const { teamId, assigneeId: rawAssigneeId, title: rawTitle, status, estimatedTime, milestoneId, deadline, dueDate, description } = body;
  const assigneeId = rawAssigneeId || actor.id;
  const title = sanitize(rawTitle);
  const taskStatus = status || 'planned';
  const estimated = Number(estimatedTime || 60);

  if (!title) throw Object.assign(new Error('Task title is required'), { status: 400 });
  if (!TASK_STATUSES.includes(taskStatus)) throw Object.assign(new Error('Invalid task status'), { status: 400 });
  if (!Number.isFinite(estimated) || estimated < 0 || estimated > 100_000) {
    throw Object.assign(new Error('Estimated time must be a valid positive number'), { status: 400 });
  }

  const deadlineVal = deadline || dueDate || null;

  if (milestoneId) {
    const { data: milestone } = await supabase
      .from('milestones').select('id').eq('id', milestoneId).eq('team_id', teamId).maybeSingle();
    if (!milestone) throw Object.assign(new Error('Milestone must belong to this project.'), { code: 'INVALID_MILESTONE', status: 400 });
  }

  const insertData = {
    title,
    description: sanitize(description),
    team_id: teamId,
    status: taskStatus,
    assignee_id: assigneeId,
    estimated_time: estimated,
    due_date: deadlineVal,
    deadline: deadlineVal,
    actual_time: 0,
    timer_running: false,
    timer_start: null
  };
  if (milestoneId) insertData.milestone_id = milestoneId;

  const { data: task, error } = await supabase.from('tasks').insert(insertData).select().single();
  if (error) throw Object.assign(new Error('Failed to create task'), { status: 500 });

  const result = mapTask(task);
  io.to(teamId).emit('task:created', result);

  void activityService.recordActivity({ teamId, actor, entityType: 'task', entityId: task.id, action: 'created', metadata: { title: task.title, status: task.status }, io });

  if (assigneeId && assigneeId !== actor.id) {
    await notificationService.createNotification(
      assigneeId, 'task_assigned',
      `${actor.name} assigned you a task: "${title}"`,
      task.id, teamId,
      { eventKey: `task:${task.id}:assignment:${assigneeId}` }
    );
  }

  return result;
}

async function updateTask(actor, taskId, body, io) {
  const updates = {};
  if (body.title !== undefined) updates.title = sanitize(body.title);
  if (body.description !== undefined) updates.description = sanitize(body.description);
  if (body.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status)) throw Object.assign(new Error('Invalid task status'), { status: 400 });
    updates.status = body.status;
  }
  if (body.assigneeId !== undefined) updates.assignee_id = body.assigneeId;
  if (body.milestoneId !== undefined) updates.milestone_id = body.milestoneId || null;
  if (body.estimatedTime !== undefined) {
    const et = Number(body.estimatedTime);
    if (!Number.isFinite(et) || et < 0 || et > 100_000) throw Object.assign(new Error('Estimated time must be a nonnegative number'), { status: 400 });
    updates.estimated_time = et;
  }
  if (body.actualTime !== undefined) {
    const at = Number(body.actualTime);
    if (!Number.isFinite(at) || at < 0 || at > 100_000) throw Object.assign(new Error('Actual time must be a nonnegative number'), { status: 400 });
    updates.actual_time = at;
  }
  if (body.dueDate !== undefined) { updates.due_date = body.dueDate; updates.deadline = body.dueDate; }
  if (body.deadline !== undefined) { updates.due_date = body.deadline; updates.deadline = body.deadline; }
  if (body.timerRunning !== undefined) updates.timer_running = body.timerRunning;
  if (body.timerStart !== undefined) updates.timer_start = body.timerStart;

  const { data: oldTask } = await supabase.from('tasks')
    .select('id, title, status, assignee_id, team_id').eq('id', taskId).single();
  if (!oldTask) throw Object.assign(new Error('Task not found.'), { code: 'TASK_NOT_FOUND', status: 404 });

  if (updates.milestone_id) {
    const { data: milestone } = await supabase.from('milestones')
      .select('id').eq('id', updates.milestone_id).eq('team_id', oldTask.team_id).maybeSingle();
    if (!milestone) throw Object.assign(new Error('Milestone must belong to this project.'), { code: 'INVALID_MILESTONE', status: 400 });
  }

  const { data: task, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single();
  if (error || !task) throw Object.assign(new Error('Not found'), { status: 404 });

  const result = mapTask(task);
  io.to(oldTask.team_id).emit('task:updated', result);
  void activityService.recordActivity({
    teamId: oldTask.team_id, actor, entityType: 'task', entityId: task.id,
    action: oldTask.status !== task.status ? 'status_changed' : 'updated',
    metadata: { title: task.title, status: task.status }, io
  });
  return result;
}

async function deleteTask(actor, taskId, io) {
  const { data: task } = await supabase.from('tasks').select('team_id, title').eq('id', taskId).single();
  if (!task) throw Object.assign(new Error('Not found'), { status: 404 });

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw Object.assign(new Error('Not found'), { status: 404 });

  io.to(task.team_id).emit('task:deleted', taskId);
  void activityService.recordActivity({ teamId: task.team_id, actor, entityType: 'task', entityId: taskId, action: 'deleted', metadata: { title: task.title }, io });
  return { success: true };
}

async function timerAction(actor, taskId, action, io) {
  if (!TIMER_ACTIONS.includes(action)) throw Object.assign(new Error('Invalid timer action'), { status: 400 });

  const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  if (!task) throw Object.assign(new Error('Not found'), { status: 404 });

  const updates = {};
  if (action === 'start') {
    updates.timer_running = true;
    updates.timer_start = Date.now();
    updates.status = 'in progress';
  } else if (action === 'stop') {
    let actual = task.actual_time || 0;
    if (task.timer_start) actual += Math.floor((Date.now() - task.timer_start) / 60000);
    updates.actual_time = actual;
    updates.timer_running = false;
    updates.timer_start = null;
  } else if (action === 'complete') {
    let actual = task.actual_time || 0;
    if (task.timer_start) actual += Math.floor((Date.now() - task.timer_start) / 60000);
    updates.actual_time = actual;
    updates.timer_running = false;
    updates.timer_start = null;
    updates.status = 'done';
  }

  const { data: updated, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single();
  if (error || !updated) throw Object.assign(new Error('Failed to update timer'), { status: 500 });

  const result = mapTask(updated);
  io.to(task.team_id).emit('task:updated', result);
  return result;
}

async function extendTime(actor, taskId, additionalMinutes, io) {
  const mins = Number(additionalMinutes);
  if (!Number.isInteger(mins) || mins <= 0 || mins > 100_000) {
    throw Object.assign(new Error('Provide positive additional minutes'), { status: 400 });
  }

  const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  if (!task) throw Object.assign(new Error('Task not found'), { status: 404 });

  const { data: team } = await supabase.from('teams').select('owner_id').eq('id', task.team_id).single();
  if (!team || team.owner_id !== actor.id) {
    throw Object.assign(new Error('Only the team leader can extend time'), { status: 403 });
  }

  const newEstimate = (task.estimated_time || 0) + mins;
  const { data: updated, error } = await supabase.from('tasks').update({ estimated_time: newEstimate }).eq('id', taskId).select().single();
  if (error || !updated) throw Object.assign(new Error('Failed to extend task time'), { status: 500 });

  const result = mapTask(updated);
  io.to(task.team_id).emit('task:updated', result);
  return result;
}

module.exports = { mapTask, getTasks, createTask, updateTask, deleteTask, timerAction, extendTime };

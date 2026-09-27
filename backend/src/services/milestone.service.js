'use strict';

const { supabase } = require('../config/supabase');
const { sanitize } = require('../utils/sanitize');
const { MILESTONE_STATUSES } = require('../constants');
const activityService = require('./activity.service');

function mapMilestone(m, taskCounts = {}) {
  return {
    id: m.id,
    teamId: m.team_id,
    name: m.name,
    description: m.description,
    dueDate: m.due_date,
    status: m.status,
    createdBy: m.created_by,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    totalTasks: taskCounts.total || 0,
    completedTasks: taskCounts.completed || 0
  };
}

async function getMilestones(teamId) {
  const { data: milestones, error } = await supabase
    .from('milestones').select('*').eq('team_id', teamId)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw Object.assign(new Error('Failed to load milestones'), { status: 500 });

  const { data: tasks } = await supabase
    .from('tasks').select('milestone_id, status').eq('team_id', teamId).not('milestone_id', 'is', null);

  const counts = new Map();
  (tasks || []).forEach(t => {
    const current = counts.get(t.milestone_id) || { total: 0, completed: 0 };
    current.total += 1;
    if (t.status === 'done') current.completed += 1;
    counts.set(t.milestone_id, current);
  });

  return (milestones || []).map(m => mapMilestone(m, counts.get(m.id)));
}

async function createMilestone(actor, { teamId, name, description, dueDate }, io) {
  const cleanName = sanitize(name);
  if (!teamId || !cleanName) throw Object.assign(new Error('Team and milestone name are required'), { status: 400 });
  if (cleanName.length > 120) throw Object.assign(new Error('Milestone name is too long'), { status: 400 });

  const { data: milestone, error } = await supabase.from('milestones')
    .insert({ team_id: teamId, name: cleanName, description: sanitize(description || ''), due_date: dueDate || null, created_by: actor.id })
    .select().single();
  if (error) throw Object.assign(new Error('Failed to create milestone'), { status: 500 });

  const result = mapMilestone(milestone);
  io.to(teamId).emit('milestone:created', result);
  void activityService.recordActivity({ teamId, actor, entityType: 'milestone', entityId: milestone.id, action: 'created', metadata: { name: cleanName }, io });
  return result;
}

async function updateMilestone(actor, milestoneId, body, io) {
  const { data: existing } = await supabase.from('milestones').select('*').eq('id', milestoneId).single();
  if (!existing) throw Object.assign(new Error('Milestone not found'), { status: 404 });

  const updates = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) {
    const name = sanitize(body.name);
    if (!name || name.length > 120) throw Object.assign(new Error('Milestone name is invalid'), { status: 400 });
    updates.name = name;
  }
  if (body.description !== undefined) updates.description = sanitize(body.description);
  if (body.dueDate !== undefined) updates.due_date = body.dueDate || null;
  if (body.status !== undefined) {
    if (!MILESTONE_STATUSES.includes(body.status)) throw Object.assign(new Error('Invalid milestone status'), { status: 400 });
    updates.status = body.status;
  }

  const { data: milestone, error } = await supabase.from('milestones').update(updates).eq('id', milestoneId).select().single();
  if (error || !milestone) throw Object.assign(new Error('Failed to update milestone'), { status: 500 });

  const result = mapMilestone(milestone);
  io.to(milestone.team_id).emit('milestone:updated', result);
  void activityService.recordActivity({ teamId: milestone.team_id, actor, entityType: 'milestone', entityId: milestone.id, action: 'updated', metadata: { name: milestone.name, status: milestone.status }, io });
  return result;
}

async function deleteMilestone(actor, milestoneId, io) {
  const { data: milestone } = await supabase.from('milestones').select('*').eq('id', milestoneId).single();
  if (!milestone) throw Object.assign(new Error('Milestone not found'), { status: 404 });

  const { error } = await supabase.from('milestones').delete().eq('id', milestoneId);
  if (error) throw Object.assign(new Error('Failed to delete milestone'), { status: 500 });

  io.to(milestone.team_id).emit('milestone:deleted', milestoneId);
  void activityService.recordActivity({ teamId: milestone.team_id, actor, entityType: 'milestone', entityId: milestoneId, action: 'deleted', metadata: { name: milestone.name }, io });
  return { success: true };
}

module.exports = { mapMilestone, getMilestones, createMilestone, updateMilestone, deleteMilestone };

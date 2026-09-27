'use strict';

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

function mapActivity(event, actor = {}) {
  return {
    id: event.id,
    teamId: event.team_id,
    actorId: event.actor_id,
    actorName: actor.name || 'Team member',
    actorAvatar: actor.avatar || null,
    entityType: event.entity_type,
    entityId: event.entity_id,
    action: event.action,
    metadata: event.metadata || {},
    createdAt: event.created_at
  };
}

/**
 * Records an activity event in the DB and emits it to the team's socket room.
 * This is a fire-and-forget helper (call with void) — failures are logged but not propagated.
 */
async function recordActivity({ teamId, actor, entityType, entityId, action, metadata = {}, io }) {
  const { data: event, error } = await supabase
    .from('activity_events')
    .insert({
      team_id: teamId,
      actor_id: actor?.id || null,
      entity_type: entityType,
      entity_id: entityId || null,
      action,
      metadata
    })
    .select()
    .single();

  if (error || !event) {
    logger.error({ err: error?.message || 'No activity returned' }, 'Activity record error');
    return null;
  }

  const result = mapActivity(event, actor);
  if (io) io.to(teamId).emit('activity:created', result);
  return result;
}

async function getActivity(teamId, limit = 25) {
  const clampedLimit = Math.min(Math.max(limit, 1), 100);
  const { data: events, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(clampedLimit);

  if (error) throw Object.assign(new Error('Failed to load project activity'), { status: 500 });

  const actorIds = [...new Set((events || []).map(e => e.actor_id).filter(Boolean))];
  const { data: profiles } = actorIds.length
    ? await supabase.from('profiles').select('id, name, avatar').in('id', actorIds)
    : { data: [] };
  const actors = new Map((profiles || []).map(p => [p.id, p]));

  return (events || []).map(e => mapActivity(e, actors.get(e.actor_id)));
}

module.exports = { mapActivity, recordActivity, getActivity };

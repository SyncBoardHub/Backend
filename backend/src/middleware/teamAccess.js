'use strict';

const { supabase, supabaseAdmin } = require('../config/supabase');
const env = require('../config/env');

/**
 * Verifies the requesting user is a member of `teamId`.
 * Attaches membership result to `res.locals.membership` for downstream use.
 *
 * Usage in controllers:
 *   if (!await requireTeamMember(req, res, teamId)) return;
 */
async function requireTeamMember(req, res, teamId) {
  if (!teamId) {
    res.status(400).json({ code: 'MISSING_TEAM_ID', error: 'Team is required.' });
    return false;
  }

  const { data: membership, error } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ code: 'TEAM_VALIDATION_FAILED', error: 'Failed to validate team membership.' });
    return false;
  }

  if (!membership) {
    res.status(403).json({ code: 'FORBIDDEN_TEAM_ACCESS', error: 'You are not a member of this team.' });
    return false;
  }

  return true;
}

/**
 * Verifies the requesting user is the owner of the team.
 * Returns the full team object if authorized, null otherwise.
 */
async function requireTeamOwner(req, res, teamId) {
  if (!teamId) {
    res.status(400).json({ code: 'MISSING_TEAM_ID', error: 'Team is required.' });
    return null;
  }

  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .maybeSingle();

  if (error) {
    res.status(500).json({ code: 'TEAM_LOOKUP_FAILED', error: 'Unable to load the team.' });
    return null;
  }
  if (!team) {
    res.status(404).json({ code: 'TEAM_NOT_FOUND', error: 'Team not found.' });
    return null;
  }
  if (team.owner_id !== req.user.id) {
    res.status(403).json({ code: 'TEAM_OWNER_REQUIRED', error: 'Only the team leader can perform this action.' });
    return null;
  }

  return team;
}

/**
 * Validates assignment: the requester must be in the team, and the assignee (if specified)
 * must also be a member.
 */
async function validateTaskAssignmentAccess({ requesterId, teamId, assigneeId }) {
  if (!teamId) {
    return { ok: false, status: 400, body: { code: 'MISSING_TEAM_ID', error: 'Team is required.' } };
  }

  const { data: memberships, error } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (error) {
    return { ok: false, status: 500, body: { code: 'TEAM_VALIDATION_FAILED', error: 'Failed to validate team membership.' } };
  }

  const memberIds = new Set((memberships || []).map(m => m.user_id));

  if (!memberIds.has(requesterId)) {
    return { ok: false, status: 403, body: { code: 'FORBIDDEN_TEAM_ACCESS', error: 'You are not a member of this team.' } };
  }

  if (assigneeId && !memberIds.has(assigneeId)) {
    return { ok: false, status: 400, body: { code: 'INVALID_ASSIGNEE', error: 'Assignee must belong to this team.' } };
  }

  return { ok: true };
}

/**
 * Express middleware: requires admin user IDs and service role.
 */
function requireAdmin(req, res, next) {
  if (!supabaseAdmin || !env.ADMIN_USER_IDS.has(req.user.id)) {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  next();
}

/**
 * Express middleware: requires the service role key to be configured.
 * Used for storage/file operations that need admin access to Supabase Storage.
 */
function requireServiceRole(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Server service-role configuration is required.' });
  }
  next();
}

module.exports = {
  requireTeamMember,
  requireTeamOwner,
  validateTaskAssignmentAccess,
  requireAdmin,
  requireServiceRole
};

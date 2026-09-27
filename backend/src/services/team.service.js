'use strict';

const { supabase } = require('../config/supabase');
const { sanitize } = require('../utils/sanitize');
const { generateInviteCode } = require('./auth.service');
const notificationService = require('./notification.service');

function formatTeam(team, members = []) {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    inviteCode: team.invite_code,
    inviteEnabled: team.invite_enabled !== false,
    ownerId: team.owner_id,
    githubRepo: team.github_repo || null,
    members,
    createdAt: team.created_at
  };
}

async function getTeams(userId) {
  const { data: memberships } = await supabase
    .from('team_members').select('team_id').eq('user_id', userId);
  if (!memberships || !memberships.length) return [];

  const teamIds = memberships.map(m => m.team_id);
  const { data: teams } = await supabase.from('teams').select('*').in('id', teamIds);
  if (!teams) return [];

  const { data: members } = await supabase
    .from('team_members').select('team_id, user_id').in('team_id', teamIds);
  const memberIds = [...new Set((members || []).map(m => m.user_id))];
  const { data: profiles } = memberIds.length
    ? await supabase.from('profiles').select('id, name, avatar').in('id', memberIds)
    : { data: [] };

  const profilesById = new Map((profiles || []).map(p => [p.id, p]));
  const membersByTeam = new Map();
  (members || []).forEach(m => {
    const arr = membersByTeam.get(m.team_id) || [];
    const profile = profilesById.get(m.user_id);
    if (profile) arr.push(profile);
    membersByTeam.set(m.team_id, arr);
  });

  return teams.map(team => formatTeam(team, membersByTeam.get(team.id) || []));
}

async function createTeam(userId, userInfo, { name, description }) {
  const cleanName = sanitize(name);
  if (!cleanName) throw Object.assign(new Error('Team name is required'), { status: 400 });

  const inviteCode = generateInviteCode();
  const { data: team, error } = await supabase
    .from('teams')
    .insert({ name: cleanName, description: sanitize(description), invite_code: inviteCode, owner_id: userId })
    .select().single();

  if (error) throw Object.assign(new Error('Failed to create team'), { status: 500 });

  const { error: memberError } = await supabase
    .from('team_members').insert({ team_id: team.id, user_id: userId });
  if (memberError) {
    await supabase.from('teams').delete().eq('id', team.id);
    throw Object.assign(new Error('Failed to finish creating the team.'), { status: 500 });
  }

  return formatTeam(team, [{ id: userId, name: userInfo.name, avatar: userInfo.avatar }]);
}

async function getTeamMembers(teamId) {
  const { data: team } = await supabase.from('teams').select('owner_id').eq('id', teamId).single();
  if (!team) throw Object.assign(new Error('Team not found'), { status: 404 });

  const { data: members } = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
  const memberIds = (members || []).map(m => m.user_id);

  const { data: profiles } = await supabase
    .from('profiles').select('id, user_id, name, email, avatar').in('id', memberIds);

  return (profiles || []).map(p => ({
    id: p.id,
    userId: p.user_id,
    name: p.name,
    email: p.email,
    avatar: p.avatar,
    role: p.id === team.owner_id ? 'leader' : 'member'
  }));
}

async function deleteTeam(teamId, userId) {
  const { error } = await supabase.from('teams').delete().eq('id', teamId).eq('owner_id', userId);
  if (error) throw Object.assign(new Error('Unable to delete this team.'), { status: 500 });
}

async function removeMember(team, targetUserId, io) {
  if (targetUserId === team.owner_id) {
    throw Object.assign(new Error('The team leader cannot be removed.'), { status: 400 });
  }

  const { data: membership } = await supabase
    .from('team_members').select('user_id').eq('team_id', team.id).eq('user_id', targetUserId).maybeSingle();
  if (!membership) throw Object.assign(new Error('Team member not found.'), { status: 404 });

  const { error } = await supabase
    .from('team_members').delete().eq('team_id', team.id).eq('user_id', targetUserId);
  if (error) throw Object.assign(new Error('Unable to remove this team member.'), { status: 500 });

  await supabase.from('tasks').update({ assignee_id: null }).eq('team_id', team.id).eq('assignee_id', targetUserId);
  await notificationService.createNotification(targetUserId, 'team_member_removed', `You were removed from ${team.name}.`, null, team.id);
  io.to(team.id).emit('team:updated', { id: team.id });
}

async function joinTeam(userId, userName, inviteCode) {
  const normalizedCode = inviteCode?.toUpperCase();
  if (!normalizedCode || !/^[A-Z0-9]{8,16}$/.test(normalizedCode)) {
    throw Object.assign(new Error('Invite code is required'), { status: 400 });
  }

  const { data: team } = await supabase
    .from('teams').select('*').eq('invite_code', normalizedCode).eq('invite_enabled', true).single();
  if (!team) throw Object.assign(new Error('Invalid invite code'), { status: 404 });

  const { data: existingMembership } = await supabase
    .from('team_members').select('user_id').eq('team_id', team.id).eq('user_id', userId).maybeSingle();

  const result = formatTeam(team);
  if (existingMembership) return { ...result, status: 'approved' };

  const { data: existingRequest } = await supabase
    .from('team_join_requests').select('id, status').eq('team_id', team.id).eq('user_id', userId).eq('status', 'pending').maybeSingle();
  if (existingRequest) return { ...result, status: 'pending', requestId: existingRequest.id };

  const { data: request, error: requestError } = await supabase
    .from('team_join_requests').insert({ team_id: team.id, user_id: userId }).select('id, status, requested_at').single();

  if (requestError || !request) throw Object.assign(new Error('Unable to submit the join request.'), { status: 500 });

  if (team.owner_id && team.owner_id !== userId) {
    await notificationService.createNotification(
      team.owner_id, 'team_join_requested',
      `${userName} requested to join ${team.name}.`,
      null, team.id,
      { eventKey: `team:${team.id}:join-request:${request.id}` }
    );
  }

  return { ...result, status: 'pending', requestId: request.id };
}

async function getJoinRequests(teamId) {
  const { data: requests, error } = await supabase
    .from('team_join_requests').select('id, user_id, status, requested_at')
    .eq('team_id', teamId).eq('status', 'pending').order('requested_at', { ascending: true });
  if (error) throw Object.assign(new Error('Unable to load join requests.'), { status: 500 });

  const userIds = [...new Set((requests || []).map(r => r.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, name, email, avatar').in('id', userIds)
    : { data: [] };
  const profilesById = new Map((profiles || []).map(p => [p.id, p]));

  return (requests || []).map(r => ({
    id: r.id,
    userId: r.user_id,
    requestedAt: r.requested_at,
    user: profilesById.get(r.user_id) || { id: r.user_id, name: 'Unknown user', email: '', avatar: '' }
  }));
}

async function approveJoinRequest(team, requestId, reviewerId, io) {
  const { data: request } = await supabase
    .from('team_join_requests').select('*').eq('id', requestId).eq('team_id', team.id).eq('status', 'pending').maybeSingle();
  if (!request) throw Object.assign(new Error('Pending join request not found.'), { status: 404 });

  const { error: memberError } = await supabase
    .from('team_members').upsert({ team_id: team.id, user_id: request.user_id }, { onConflict: 'team_id,user_id' });
  if (memberError) throw Object.assign(new Error('Unable to approve this join request.'), { status: 500 });

  await supabase.from('team_join_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
    .eq('id', requestId).eq('status', 'pending');

  await notificationService.createNotification(
    request.user_id, 'team_join_approved',
    `Your request to join ${team.name} was approved.`,
    null, team.id,
    { eventKey: `team:${team.id}:join-approved:${requestId}` }
  );
  io.to(team.id).emit('team:updated', { id: team.id });
  return { id: requestId, status: 'approved', teamId: team.id, userId: request.user_id };
}

async function rejectJoinRequest(team, requestId, reviewerId) {
  const { data: request } = await supabase
    .from('team_join_requests').select('*').eq('id', requestId).eq('team_id', team.id).eq('status', 'pending').maybeSingle();
  if (!request) throw Object.assign(new Error('Pending join request not found.'), { status: 404 });

  const { error } = await supabase.from('team_join_requests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
    .eq('id', requestId).eq('status', 'pending');
  if (error) throw Object.assign(new Error('Unable to reject this join request.'), { status: 500 });

  await notificationService.createNotification(
    request.user_id, 'team_join_rejected',
    `Your request to join ${team.name} was declined.`,
    null, team.id,
    { eventKey: `team:${team.id}:join-rejected:${requestId}` }
  );
  return { id: requestId, status: 'rejected', teamId: team.id, userId: request.user_id };
}

async function regenerateInvite(team) {
  const { data: updated, error } = await supabase
    .from('teams')
    .update({ invite_code: generateInviteCode(), invite_enabled: true, invite_regenerated_at: new Date().toISOString() })
    .eq('id', team.id).select('*').single();
  if (error || !updated) throw Object.assign(new Error('Failed to regenerate invite'), { status: 500 });
  return formatTeam(updated);
}

async function revokeInvite(team) {
  const { data: updated, error } = await supabase
    .from('teams').update({ invite_enabled: false }).eq('id', team.id)
    .select('id, name, description, invite_code, invite_enabled, owner_id, created_at').single();
  if (error || !updated) throw Object.assign(new Error('Failed to revoke invite'), { status: 500 });
  return formatTeam(updated);
}

async function linkGithubRepo(teamId, userId, repoUrl) {
  const { data: team } = await supabase.from('teams').select('owner_id').eq('id', teamId).single();
  if (!team) throw Object.assign(new Error('Team not found'), { status: 404 });
  if (team.owner_id !== userId) throw Object.assign(new Error('Only the team leader can link a GitHub repo'), { status: 403 });

  let githubRepo = null;
  if (repoUrl) {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw Object.assign(new Error('Invalid GitHub URL. Use format: https://github.com/owner/repo'), { status: 400 });
    githubRepo = `${match[1]}/${match[2]}`.replace(/\.git$/, '');
  }

  await supabase.from('teams').update({ github_repo: githubRepo }).eq('id', teamId);
  return { success: true, githubRepo };
}

async function unlinkGithubRepo(teamId, userId) {
  const { data: team } = await supabase.from('teams').select('owner_id').eq('id', teamId).single();
  if (!team) throw Object.assign(new Error('Team not found'), { status: 404 });
  if (team.owner_id !== userId) throw Object.assign(new Error('Only the team leader can unlink a GitHub repo'), { status: 403 });
  await supabase.from('teams').update({ github_repo: null }).eq('id', teamId);
  return { success: true };
}

async function getTeamAnalytics(teamId) {
  const { data: tasks } = await supabase.from('tasks').select('*').eq('team_id', teamId);
  const allTasks = tasks || [];

  const { data: members } = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
  const memberIds = (members || []).map(m => m.user_id);
  const { data: profiles } = await supabase.from('profiles').select('id, name, avatar').in('id', memberIds);

  const done = allTasks.filter(t => t.status === 'done').length;
  const inProgress = allTasks.filter(t => t.status === 'in progress').length;
  const planned = allTasks.filter(t => t.status === 'planned').length;

  return {
    total: allTasks.length,
    done,
    inProgress,
    planned,
    completionRate: allTasks.length ? Math.round(done / allTasks.length * 100) : 0,
    memberWorkload: (profiles || []).map(p => {
      const memberTasks = allTasks.filter(t => t.assignee_id === p.id);
      return {
        name: p.name,
        avatar: p.avatar,
        tasks: memberTasks.length,
        done: memberTasks.filter(t => t.status === 'done').length
      };
    })
  };
}

async function getInviteByCode(code) {
  const normalizedCode = code?.toUpperCase();
  if (!normalizedCode || !/^[A-Z0-9]{8,16}$/.test(normalizedCode)) return null;
  const { data: team } = await supabase
    .from('teams').select('id, name').eq('invite_code', normalizedCode).eq('invite_enabled', true).maybeSingle();
  return team;
}

module.exports = {
  formatTeam,
  getTeams,
  createTeam,
  getTeamMembers,
  deleteTeam,
  removeMember,
  joinTeam,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  regenerateInvite,
  revokeInvite,
  linkGithubRepo,
  unlinkGithubRepo,
  getTeamAnalytics,
  getInviteByCode
};

'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { requireTeamMember, requireTeamOwner } = require('../middleware/teamAccess');
const teamService = require('../services/team.service');

// Public invite lookups
router.get('/invites/:code', rateLimit(60_000, 30), async (req, res, next) => {
  try {
    const team = await teamService.getInviteByCode(req.params.code);
    if (!team) return res.status(404).json({ error: 'Invite not found' });
    res.json({ id: team.id, name: team.name });
  } catch (err) {
    next(err);
  }
});

// GET /api/teams
router.get('/teams', auth, async (req, res, next) => {
  try {
    res.json(await teamService.getTeams(req.user.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/teams
router.post('/teams', auth, async (req, res, next) => {
  try {
    const team = await teamService.createTeam(req.user.id, req.user, req.body);
    const io = req.app.get('io');
    if (io) io.to(team.id).emit('team:created', team);
    res.json(team);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/teams/join
router.post('/teams/join', auth, rateLimit(60_000, 20), async (req, res, next) => {
  try {
    const result = await teamService.joinTeam(req.user.id, req.user.name, req.body.inviteCode);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/teams/:id/join-requests
router.get('/teams/:id/join-requests', auth, rateLimit(60_000, 30), async (req, res, next) => {
  try {
    const team = await requireTeamOwner(req, res, req.params.id);
    if (!team) return;
    res.json(await teamService.getJoinRequests(req.params.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/teams/:id/join-requests/:requestId/approve
router.post('/teams/:id/join-requests/:requestId/approve', auth, rateLimit(60_000, 30), async (req, res, next) => {
  try {
    const team = await requireTeamOwner(req, res, req.params.id);
    if (!team) return;
    const result = await teamService.approveJoinRequest(team, req.params.requestId, req.user.id, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/teams/:id/join-requests/:requestId/reject
router.post('/teams/:id/join-requests/:requestId/reject', auth, rateLimit(60_000, 30), async (req, res, next) => {
  try {
    const team = await requireTeamOwner(req, res, req.params.id);
    if (!team) return;
    const result = await teamService.rejectJoinRequest(team, req.params.requestId, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/teams/:id/members/:userId
router.delete('/teams/:id/members/:userId', auth, rateLimit(60_000, 20), async (req, res, next) => {
  try {
    const team = await requireTeamOwner(req, res, req.params.id);
    if (!team) return;
    const result = await teamService.removeMember(team, req.params.userId, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/teams/:id
router.delete('/teams/:id', auth, rateLimit(60_000, 10), async (req, res, next) => {
  try {
    const result = await teamService.deleteTeam(req.params.id, req.user.id);
    const io = req.app.get('io');
    if (io) io.to(req.params.id).emit('team:deleted', { id: req.params.id });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/teams/:id/invite/regenerate
router.post('/teams/:id/invite/regenerate', auth, rateLimit(60_000, 10), async (req, res, next) => {
  try {
    const team = await requireTeamOwner(req, res, req.params.id);
    if (!team) return;
    const result = await teamService.regenerateInvite(team);
    const io = req.app.get('io');
    if (io) io.to(team.id).emit('team:updated', result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/teams/:id/invite/revoke
router.post('/teams/:id/invite/revoke', auth, rateLimit(60_000, 10), async (req, res, next) => {
  try {
    const team = await requireTeamOwner(req, res, req.params.id);
    if (!team) return;
    const result = await teamService.revokeInvite(team);
    const io = req.app.get('io');
    if (io) io.to(team.id).emit('team:updated', result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/teams/:id/members
router.get('/teams/:id/members', auth, async (req, res, next) => {
  try {
    if (!await requireTeamMember(req, res, req.params.id)) return;
    res.json(await teamService.getTeamMembers(req.params.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/analytics
router.get('/analytics', auth, async (req, res, next) => {
  try {
    const teamId = req.query.teamId;
    if (!teamId) return res.status(400).json({ error: 'teamId is required' });
    if (!await requireTeamMember(req, res, teamId)) return;
    res.json(await teamService.getTeamAnalytics(teamId));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/teams/:id/github
router.post('/teams/:id/github', auth, async (req, res, next) => {
  try {
    const { repoUrl } = req.body;
    const team = await teamService.linkGithubRepo(req.params.id, req.user.id, repoUrl);
    res.json(team);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/teams/:id/github
router.delete('/teams/:id/github', auth, async (req, res, next) => {
  try {
    const team = await teamService.unlinkGithubRepo(req.params.id, req.user.id);
    res.json(team);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

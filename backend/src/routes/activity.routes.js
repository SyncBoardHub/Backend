'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireTeamMember } = require('../middleware/teamAccess');
const activityService = require('../services/activity.service');

// GET /api/activity
router.get('/', auth, async (req, res, next) => {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId is required' });
    if (!await requireTeamMember(req, res, teamId)) return;

    const limit = parseInt(req.query.limit, 10) || 25;
    res.json(await activityService.getActivity(teamId, limit));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

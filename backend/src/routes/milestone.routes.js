'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireTeamMember } = require('../middleware/teamAccess');
const milestoneService = require('../services/milestone.service');

// GET /api/milestones
router.get('/', auth, async (req, res, next) => {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId is required' });
    if (!await requireTeamMember(req, res, teamId)) return;
    res.json(await milestoneService.getMilestones(teamId));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/milestones
router.post('/', auth, async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ error: 'teamId is required' });
    if (!await requireTeamMember(req, res, teamId)) return;
    const milestone = await milestoneService.createMilestone(req.user, req.body, req.app.get('io'));
    res.json(milestone);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PUT /api/milestones/:id
router.put('/:id', auth, async (req, res, next) => {
  try {
    const milestone = await milestoneService.updateMilestone(req.user, req.params.id, req.body, req.app.get('io'));
    res.json(milestone);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/milestones/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const result = await milestoneService.deleteMilestone(req.user, req.params.id, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

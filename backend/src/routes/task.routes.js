'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireTeamMember } = require('../middleware/teamAccess');
const taskService = require('../services/task.service');

// GET /api/tasks
router.get('/', auth, async (req, res, next) => {
  try {
    const teamId = req.query.teamId;
    if (teamId) {
      if (!await requireTeamMember(req, res, teamId)) return;
    }
    const tasks = await taskService.getTasks(req.user.id, teamId);
    res.json(tasks);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/tasks
router.post('/', auth, async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!await requireTeamMember(req, res, teamId)) return;
    const task = await taskService.createTask(req.user, req.body, req.app.get('io'));
    res.json(task);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.user, req.params.id, req.body, req.app.get('io'));
    res.json(task);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const result = await taskService.deleteTask(req.user, req.params.id, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/tasks/:id/timer
router.post('/:id/timer', auth, async (req, res, next) => {
  try {
    const result = await taskService.timerAction(req.user, req.params.id, req.body.action, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/tasks/:id/extend-time
router.post('/:id/extend-time', auth, async (req, res, next) => {
  try {
    const result = await taskService.extendTime(req.user, req.params.id, req.body.additionalMinutes, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const notificationService = require('../services/notification.service');

// GET /api/notifications
router.get('/', auth, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    res.json(await notificationService.getNotifications(req.user.id, limit));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    res.json(await notificationService.markRead(req.params.id, req.user.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', auth, async (req, res, next) => {
  try {
    res.json(await notificationService.markAllRead(req.user.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

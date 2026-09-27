'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const profileService = require('../services/profile.service');
const { DEFAULT_NOTIFICATION_PREFERENCES } = require('../constants');

// GET /api/profile
router.get('/profile', auth, async (req, res, next) => {
  try {
    res.json(await profileService.getProfile(req.user.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PATCH /api/profile
router.patch('/profile', auth, async (req, res, next) => {
  try {
    res.json(await profileService.updateProfile(req.user.id, req.body));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ code: err.code, error: err.message });
    next(err);
  }
});

// GET /api/preferences/notifications
router.get('/preferences/notifications', auth, async (req, res, next) => {
  try {
    res.json(await profileService.getNotificationPreferences(req.user.id, DEFAULT_NOTIFICATION_PREFERENCES));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PATCH /api/preferences/notifications
router.patch('/preferences/notifications', auth, async (req, res, next) => {
  try {
    res.json(await profileService.updateNotificationPreferences(req.user.id, req.body.preferences, DEFAULT_NOTIFICATION_PREFERENCES));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/user-profile/:userId
router.get('/user-profile/:userId', auth, async (req, res, next) => {
  try {
    res.json(await profileService.getUserProfile(req.user.id, req.params.userId));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

'use strict';

const router = require('express').Router();
const authService = require('../services/auth.service');
const rateLimit = require('../middleware/rateLimit');
const env = require('../config/env');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { sanitize } = require('../utils/sanitize');

// POST /api/auth/register
router.post('/register', rateLimit(60_000, 5), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', rateLimit(60_000, 10), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/auth/me
const auth = require('../middleware/auth');
router.get('/me', auth, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/forgot-password
router.post('/forgot-password', rateLimit(60_000, 5), async (req, res, next) => {
  try {
    const frontendUrl = (env.FRONTEND_URL || env.CORS_ORIGINS[0]).replace(/\/+$/, '');
    const result = await authService.forgotPassword({ email: req.body.email, frontendUrl });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', rateLimit(60_000, 5), async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

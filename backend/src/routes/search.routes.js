'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const searchService = require('../services/search.service');

// GET /api/search
router.get('/', auth, async (req, res, next) => {
  try {
    const q = req.query.q || '';
    res.json(await searchService.search(req.user.id, q));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

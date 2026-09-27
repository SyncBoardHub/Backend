'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const aiService = require('../services/ai.service');

// POST /api/ai/assistant
router.post('/assistant', auth, rateLimit(60_000, 20), async (req, res, next) => {
  try {
    const { prompt, teamName = 'Workspace', tasks = [] } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' });

    const result = await aiService.generateAiReply(prompt.trim(), teamName, tasks);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireTeamMember } = require('../middleware/teamAccess');
const noteService = require('../services/note.service');

// ─── Notes ───────────────────────────────────────────────────────────────────

// GET /api/notes
router.get('/notes', auth, async (req, res, next) => {
  try {
    const { teamId } = req.query;
    if (teamId) {
      if (!await requireTeamMember(req, res, teamId)) return;
    }
    res.json(await noteService.getNotes(req.user.id, teamId));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/notes
router.post('/notes', auth, async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!await requireTeamMember(req, res, teamId)) return;
    const note = await noteService.createNote(req.user, req.body, req.app.get('io'));
    res.json(note);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PUT /api/notes/:id
router.put('/notes/:id', auth, async (req, res, next) => {
  try {
    const note = await noteService.updateNote(req.user, req.params.id, req.body, req.app.get('io'));
    res.json(note);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/notes/:id
router.delete('/notes/:id', auth, async (req, res, next) => {
  try {
    const result = await noteService.deleteNote(req.user, req.params.id, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ─── Diagrams ────────────────────────────────────────────────────────────────

// GET /api/diagrams
router.get('/diagrams', auth, async (req, res, next) => {
  try {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId is required' });
    if (!await requireTeamMember(req, res, teamId)) return;
    res.json(await noteService.getDiagrams(teamId));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/diagrams
router.post('/diagrams', auth, async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!await requireTeamMember(req, res, teamId)) return;
    const diagram = await noteService.saveDiagram(req.user.id, req.body, req.app.get('io'));
    res.json(diagram);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/diagrams/:id
router.delete('/diagrams/:id', auth, async (req, res, next) => {
  try {
    const result = await noteService.deleteDiagram(req.params.id, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

'use strict';

const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { requireTeamMember, requireServiceRole } = require('../middleware/teamAccess');
const fileService = require('../services/file.service');
const { supabaseAdmin } = require('../config/supabase');
const { STORAGE_BUCKET } = require('../constants');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: fileService.fileFilter
});

// GET /api/files
router.get('/', auth, async (req, res, next) => {
  try {
    const { teamId } = req.query;
    if (teamId) {
      if (!await requireTeamMember(req, res, teamId)) return;
    }
    res.json(await fileService.getFiles(req.user.id, teamId));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/files/upload
router.post('/upload', auth, requireServiceRole, upload.single('file'), async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ error: 'Team is required' });
    if (!await requireTeamMember(req, res, teamId)) return;
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const result = await fileService.uploadFile(req.user, req.file, req.body, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/files/import-url
router.post('/import-url', auth, requireServiceRole, async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ error: 'Team is required' });
    if (!await requireTeamMember(req, res, teamId)) return;

    const result = await fileService.importFromUrl(req.user, req.body, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/files/:id/download
router.get('/:id/download', auth, requireServiceRole, async (req, res, next) => {
  try {
    const result = await fileService.getDownloadUrl(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/files/:id
router.delete('/:id', auth, requireServiceRole, async (req, res, next) => {
  try {
    const result = await fileService.deleteFile(req.user, req.params.id, req.app.get('io'));
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/debug/storage
router.get('/debug/storage', auth, requireServiceRole, async (req, res) => {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      return res.status(500).json({ error: listError.message, code: 'BUCKET_LIST_FAILED' });
    }
    const teamFilesBucket = (buckets || []).find(b => b.name === STORAGE_BUCKET);
    return res.json({
      status: 'ok',
      hasServiceRole: true,
      bucketExists: Boolean(teamFilesBucket),
      bucketInfo: teamFilesBucket || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireTeamMember } = require('../middleware/teamAccess');
const teamService = require('../services/team.service');
const githubService = require('../services/github.service');

// POST /api/teams/:id/github (link repo)
router.post('/teams/:id/github', auth, async (req, res, next) => {
  try {
    const { repoUrl } = req.body;
    const team = await teamService.linkGithubRepo(req.params.id, req.user.id, repoUrl);
    res.json(team);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/teams/:id/github (unlink repo)
router.delete('/teams/:id/github', auth, async (req, res, next) => {
  try {
    const team = await teamService.unlinkGithubRepo(req.params.id, req.user.id);
    res.json(team);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/github/contents/:owner/:repo
router.get('/contents/:owner/:repo', auth, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const filePath = req.query.path || '';
    const contents = await githubService.getContents(owner, repo, filePath);
    res.json(contents);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/github/file/:owner/:repo/*
router.get('/file/:owner/:repo/*', auth, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const filePath = req.params[0];
    const file = await githubService.getFileContent(owner, repo, filePath);
    res.json(file);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/github/branches/:owner/:repo
router.get('/branches/:owner/:repo', auth, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const branches = await githubService.getBranches(owner, repo);
    res.json(branches);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/github/commits/:owner/:repo
router.get('/commits/:owner/:repo', auth, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const branch = req.query.branch || 'main';
    const limit = parseInt(req.query.limit, 10) || 20;
    const commits = await githubService.getCommits(owner, repo, branch, limit);
    res.json(commits);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/github/repo/:owner/:repo
router.get('/repo/:owner/:repo', auth, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const repoInfo = await githubService.getRepoInfo(owner, repo);
    res.json(repoInfo);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;

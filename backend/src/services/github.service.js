'use strict';

const logger = require('../utils/logger');

const GITHUB_HEADERS = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'SyncBoard/2.0'
};

/**
 * Optional: if GITHUB_TOKEN is set, use it for higher rate limits.
 * Never expose this token to the frontend.
 */
function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return token
    ? { ...GITHUB_HEADERS, Authorization: `token ${token}` }
    : GITHUB_HEADERS;
}

async function githubFetch(url) {
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = Object.assign(new Error(err.message || 'GitHub API error'), { status: response.status });
    throw error;
  }
  return response.json();
}

async function getContents(owner, repo, filePath = '') {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  return githubFetch(url);
}

async function getFileContent(owner, repo, filePath) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  return githubFetch(url);
}

async function getBranches(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/branches`;
  return githubFetch(url);
}

async function getCommits(owner, repo, branch = 'main', limit = 20) {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${Math.min(limit, 100)}`;
  return githubFetch(url);
}

async function getRepoInfo(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  return githubFetch(url);
}

module.exports = { getContents, getFileContent, getBranches, getCommits, getRepoInfo };

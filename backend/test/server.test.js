const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

const { app } = require('../src/server');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const req = http.request({
        hostname: '127.0.0.1',
        port: address.port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          server.close(() => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null }));
        });
      });
      req.on('error', (error) => server.close(() => reject(error)));
      req.end();
    });
    server.on('error', reject);
  });
}

test('health endpoint reports a live API', async () => {
  const response = await request('/healthz');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'syncboard-api');
  assert.ok(response.body.timestamp);
});

test('protected workspace routes reject unauthenticated requests', async () => {
  const paths = ['/api/auth/me', '/api/profile', '/api/teams', '/api/tasks', '/api/activity', '/api/milestones'];
  for (const path of paths) {
    const response = await request(path);
    assert.equal(response.status, 401, `${path} should require authentication`);
    assert.equal(response.body.error, 'Unauthorized');
  }
});

test('owner controls reject unauthenticated requests', async () => {
  const requests = [
    ['/api/teams/test-team/join-requests', 'GET'],
    ['/api/teams/test-team/join-requests/test-request/approve', 'POST'],
    ['/api/teams/test-team/members/test-user', 'DELETE'],
    ['/api/teams/test-team', 'DELETE']
  ];
  for (const [path, method] of requests) {
    const response = await request(path, { method });
    assert.equal(response.status, 401, `${method} ${path} should require authentication`);
  }
});

test('unknown API routes return a JSON 404', async () => {
  const response = await request('/api/does-not-exist');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Not found');
});

test('malformed public invite codes fail without a database lookup', async () => {
  const response = await request('/api/invites/not-a-valid-code');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Invite not found');
});

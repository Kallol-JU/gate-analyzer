import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';

const { createApp } = await import('../src/app.js');

async function startServer(t) {
  const server = createApp().listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test('GET /api/v1/health reports the API as up and the database state honestly', async (t) => {
  const base = await startServer(t);
  const res = await fetch(`${base}/api/v1/health`);
  assert.equal(res.status, 200);

  const { success, data } = await res.json();
  assert.equal(success, true);
  assert.equal(data.service, 'gate-cbt-api');
  assert.equal(typeof data.uptimeSeconds, 'number');
  // This process never connects to MongoDB, so it must say so instead of claiming "ok".
  assert.equal(data.database.status, 'disconnected');
  assert.equal(data.status, 'degraded');
});

test('unknown routes return the standard error envelope', async (t) => {
  const base = await startServer(t);
  const res = await fetch(`${base}/api/v1/does-not-exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('malformed JSON returns 400 INVALID_JSON', async (t) => {
  const base = await startServer(t);
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'gate-cbt' },
    body: '{ bad json',
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_JSON');
});

test('state-changing requests without the CSRF header are rejected', async (t) => {
  const base = await startServer(t);
  const res = await fetch(`${base}/api/v1/auth/logout`, { method: 'POST' });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error.code, 'CSRF_REJECTED');
});

test('protected routes reject anonymous visitors', async (t) => {
  const base = await startServer(t);
  for (const path of ['/auth/me', '/questions', '/tests', '/admin/questions']) {
    const res = await fetch(`${base}/api/v1${path}`);
    assert.equal(res.status, 401, path);
  }
});

import './setup.js';
process.env.LOGIN_RATE_LIMIT_MAX = '3'; // must be set before the app (and its limiter) loads
import test from 'node:test';
import assert from 'node:assert/strict';

const { createApp } = await import('../src/app.js');

test('login is rate limited after repeated failed attempts (no database needed)', async (t) => {
  const server = createApp().listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/auth/login`;
  const attempt = () =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'gate-cbt' },
      body: JSON.stringify({ email: 'not-an-email', password: 'x' }), // fails validation, still counts
    });

  for (let i = 0; i < 3; i += 1) assert.equal((await attempt()).status, 400);
  const blocked = await attempt();
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error.code, 'RATE_LIMITED');
});

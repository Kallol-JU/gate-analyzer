import './setup.js';
process.env.CLIENT_ORIGIN = 'https://gate-analyzer-jade.vercel.app';
import test from 'node:test';
import assert from 'node:assert/strict';

const { createApp } = await import('../src/app.js');

async function startServer(t) {
  const server = createApp().listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

const ORIGIN = 'https://gate-analyzer-jade.vercel.app';

test('CORS allows only the configured frontend origin, with credentials, never a wildcard', async (t) => {
  const base = await startServer(t);
  // This is what the browser sends to Render once Vercel proxies a same-origin POST.
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-requested-with',
    },
  });
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  assert.notEqual(res.headers.get('access-control-allow-origin'), '*');
});

test('CORS never echoes a foreign origin', async (t) => {
  const base = await startServer(t);
  const evil = 'https://evil.example';
  const res = await fetch(`${base}/api/v1/health`, { headers: { Origin: evil } });
  assert.notEqual(res.headers.get('access-control-allow-origin'), evil);
  assert.notEqual(res.headers.get('access-control-allow-origin'), '*');
});

test('CSRF header is still enforced when the request carries the Vercel origin', async (t) => {
  const base = await startServer(t);
  const res = await fetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers: { Origin: ORIGIN } });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error.code, 'CSRF_REJECTED');
});

import './setup.js';
delete process.env.COOKIE_SAME_SITE;
import test from 'node:test';
import assert from 'node:assert/strict';

const { setAuthCookie } = await import('../src/modules/auth/auth.tokens.js');

test('non-production cookie works over plain http (Vite proxy): HttpOnly, SameSite=Lax, not Secure', () => {
  const calls = [];
  setAuthCookie({ cookie: (n, v, o) => calls.push(o) }, '64b000000000000000000001');
  assert.equal(calls[0].httpOnly, true);
  assert.equal(calls[0].secure, false);
  assert.equal(calls[0].sameSite, 'lax');
  assert.ok(!('domain' in calls[0]));
});

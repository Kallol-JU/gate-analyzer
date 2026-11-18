import './setup.js';
// Must be set before the (dynamic) import below: env.js reads process.env once at load.
process.env.NODE_ENV = 'production';
delete process.env.COOKIE_SAME_SITE;
import test from 'node:test';
import assert from 'node:assert/strict';

const { setAuthCookie, clearAuthCookie, AUTH_COOKIE } = await import('../src/modules/auth/auth.tokens.js');

function fakeRes() {
  const calls = [];
  return {
    calls,
    cookie: (name, value, options) => calls.push({ fn: 'cookie', name, value, options }),
    clearCookie: (name, options) => calls.push({ fn: 'clearCookie', name, options }),
  };
}

test('production login cookie is HttpOnly, Secure, SameSite=None, path / and has no Domain', () => {
  const res = fakeRes();
  setAuthCookie(res, '64b000000000000000000001');
  const { name, value, options } = res.calls[0];
  assert.equal(name, AUTH_COOKIE);
  assert.equal(name, 'gate_token');
  assert.ok(value && value.split('.').length === 3, 'value is a signed JWT');
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, 'none');
  assert.equal(options.path, '/');
  assert.ok(!('domain' in options), 'no Domain attribute: cookie stays host-only on the Vercel domain');
  assert.ok(options.maxAge > 0);
});

test('logout clears the cookie with the same attributes it was set with', () => {
  const res = fakeRes();
  clearAuthCookie(res);
  const { fn, name, options } = res.calls[0];
  assert.equal(fn, 'clearCookie');
  assert.equal(name, 'gate_token');
  assert.deepEqual(
    { httpOnly: options.httpOnly, secure: options.secure, sameSite: options.sameSite, path: options.path },
    { httpOnly: true, secure: true, sameSite: 'none', path: '/' }
  );
  assert.ok(!('domain' in options));
});

# FIX_REPORT: 401 on /tests after login

## Status (read first)
Code changes are made and the **dependency-free** checks pass. The frontend production build and the
backend test suite were **NOT run**: the sandbox this was prepared in has no network access, so
`npm install` could not fetch packages. The production cookie flow through the Vercel rewrite has
**NOT been tested**, and Vercel/Render were not touched. Run the steps under "Tests to run" and the
manual verification in DEPLOYMENT.md before treating this as fixed.

## Root cause (likely, not confirmed in production)
The frontend (`*.vercel.app`) and API (`*.onrender.com`) are different sites, so `gate_token` was a
third-party `SameSite=None` cookie. Browsers that block third-party cookies (Safari, Brave, Chrome
incognito or with the setting on) drop it, so login "succeeds" but the next request has no cookie
and `authenticate` returns 401. The code itself (cookie options, CORS, middleware) is consistent.
I could not reproduce this against your live deployment, so confirm with the manual steps.

## Fix
Same-origin proxy: Vercel rewrites `/api/v1/*` to `https://gate-analyzer.onrender.com/api/v1/*`, and the
client always uses the relative `/api/v1`. The cookie then belongs to the Vercel domain.

## Files changed
- `client/vercel.json` (new): API rewrite + SPA fallback (`/api/` paths excluded). The SPA fallback is
  needed because adding a `vercel.json` rewrite set otherwise leaves deep links such as `/tests`
  on refresh unhandled; no previous `vercel.json` existed.
- `vercel.json` (new, repo root): same rewrites plus install/build/output paths, for the case
  where Vercel's Root Directory is the repo root. Only one is read; I could not see your Vercel
  settings, so I did not determine the actual Root Directory. **Check it.**
- `client/src/api/baseUrl.js` (new) and `client/src/api/axios.js`: base URL is always `/api/v1`;
  `VITE_API_BASE_URL` is no longer read, so a stale value on Vercel cannot bypass the proxy.
- `client/package.json`: added `test` script.
- Tests (new): `client/tests/apiConfig.test.mjs`, `server/tests/authCookie.prod.test.js`,
  `server/tests/authCookie.dev.test.js`, `server/tests/cors.test.js`.
- Docs: `DEPLOYMENT.md` (new), `README.md`, `client/README.md`.
- Not changed: server code, database, schema, users, passwords, UI, CORS config, cookie options
  (no `Domain`), CSRF header `X-Requested-With: gate-cbt`, Vite dev proxy.

## CORS review
No change needed. Proxied requests carry `Origin: https://gate-analyzer-jade.vercel.app`, which
matches `CLIENT_ORIGIN`; credentials stay enabled; no wildcard. `COOKIE_SAME_SITE=lax` on Render is a
possible later hardening once the proxy is verified, but it would break direct calls to Render.

## Open issue: rate limiting behind two proxies
With the rewrite, Render sees Vercel's IP and `trust proxy` is `1`, so login/register limiters may
count all users together (login limit 10 failed attempts / 15 min). Raising `trust proxy` to 2 would
fix attribution but lets anyone calling Render directly spoof `X-Forwarded-For` to dodge limits, so I
left it alone. Decide deliberately (e.g. raise `LOGIN_RATE_LIMIT_MAX`, or restrict direct access).

## URL construction check
`axios` baseURL `/api/v1` + endpoint paths such as `/auth/login`. A test asserts no `src/api/*.api.js`
file contains `/api/v1` in code and all paths start with a single `/`.

## Tests
Run and passing (Node 22, no dependencies needed):
- `cd client && npm test`: 5 tests (base URL, no `VITE_API_BASE_URL`, no duplicated prefix, both
  `vercel.json` files rewrite order/regex).

Written, syntax-checked only, **not executed**:
- `server/tests/authCookie.prod.test.js`: production cookie is HttpOnly, Secure, SameSite=None, path `/`,
  no Domain; logout clears with the same attributes.
- `server/tests/authCookie.dev.test.js`: development cookie is Lax, not Secure.
- `server/tests/cors.test.js`: only the configured origin is allowed, with credentials, never `*`;
  CSRF header still enforced.

Tests to run before deploying:
```
npm --prefix client install && npm --prefix client test && npm --prefix client run build
npm --prefix server install && npm --prefix server test
```
(DB integration tests need `TEST_MONGODB_URI` pointing at a disposable test database, per
`server/README.md`. Never point it at production.)

## Deployment steps
1. Commit and push these files.
2. Vercel: confirm Root Directory, delete `VITE_API_BASE_URL`, redeploy without build cache.
3. Render: no changes (`CLIENT_ORIGIN` already correct).
4. Run the manual verification in `DEPLOYMENT.md`, including Safari or Brave.

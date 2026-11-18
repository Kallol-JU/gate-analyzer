# Deployment (Vercel frontend + Render backend)

## How requests flow

```
Browser -> https://gate-analyzer-jade.vercel.app/api/v1/*   (same origin as the page)
        -> Vercel rewrite -> https://gate-analyzer.onrender.com/api/v1/*
```

The browser never calls Render directly, so the `gate_token` cookie is set on and sent to the
Vercel domain as a first-party cookie. No cookie `Domain` attribute is used (host-only cookie).

## Vercel

Only one `vercel.json` is read: the one inside the project's **Root Directory**.

| Vercel "Root Directory" | File used | Notes |
| --- | --- | --- |
| `client` (recommended) | `client/vercel.json` | Framework preset Vite. Build `npm run build`, output `dist`. |
| repository root (`gate_work`, or wherever `client/` and `server/` sit side by side) | `vercel.json` | Sets install/build/output for the monorepo layout itself. |

Check Project > Settings > General > Root Directory and keep it as it is. Do not change it unless
you want to.

Environment variables:

- **Delete `VITE_API_BASE_URL`** (all environments). The client ignores it, but a stale value is
  confusing. Nothing else is needed for the frontend.
- No secrets belong on Vercel.

After changing environment variables or `vercel.json`, **redeploy** (Deployments > ... > Redeploy,
untick "Use existing Build Cache").

## Render (backend)

Unchanged. Required: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`,
`CLIENT_ORIGIN=https://gate-analyzer-jade.vercel.app` (exact origin, no trailing slash).
Leave `COOKIE_SAME_SITE` unset (defaults to `none` + Secure in production, which also keeps
working through the proxy).

Known side effect: Render now sees Vercel's servers as the client, and `trust proxy` is `1`, so the
login/register rate limiters (`rateLimiters.js`) key on Vercel's egress IP instead of each user's IP.
Users may then share limit buckets. This was not changed here; see FIX_REPORT.md.

## Verify after deploying (manual)

1. Open https://gate-analyzer-jade.vercel.app/api/v1/health: it must return JSON from the API
   (first request after idle can take ~30s on Render's free tier).
2. In a private window open DevTools > Network, log in. The `POST /api/v1/auth/login` request URL must
   be on `gate-analyzer-jade.vercel.app`, and its response must contain a `Set-Cookie: gate_token=...;
   HttpOnly; Secure; SameSite=None` header with no `Domain`.
3. DevTools > Application > Cookies > the Vercel domain: `gate_token` is listed (HttpOnly).
4. Open `/tests` and refresh: `GET /api/v1/auth/me` and `/api/v1/tests` return 200.
5. Log out: the cookie disappears and `/auth/me` returns 401.
6. Repeat once in Safari or Brave (the browsers that block cross-site cookies).

## Local development

Unchanged: `npm run dev` in `client/` (port 5173) and `server/` (port 5000); Vite proxies `/api`.

/**
 * Every API call goes to the SAME ORIGIN as the page, under this path.
 *  - Development: Vite proxies /api to Express (see vite.config.js).
 *  - Production: Vercel rewrites /api/v1/* to the Render backend (see vercel.json).
 * Because the browser only ever talks to the frontend's own origin, the HttpOnly auth cookie is a
 * first-party cookie and is not affected by third-party cookie blocking.
 *
 * VITE_API_BASE_URL is intentionally NOT read any more: a stale value left in Vercel would send
 * requests straight to Render and bring the cross-site cookie problem back.
 */
export const API_BASE_URL = '/api/v1';

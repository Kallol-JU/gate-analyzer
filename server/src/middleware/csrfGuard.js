import { ApiError } from '../utils/ApiError.js';

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'gate-cbt';

/**
 * Cookie auth is vulnerable to CSRF, and in production the cookie is SameSite=None (frontend and
 * API are on different domains). Requiring a custom header on every state-changing request closes
 * that hole: browsers send a cross-site request with a custom header only after a CORS preflight,
 * and our CORS policy only allows CLIENT_ORIGIN.
 */
export function csrfGuard(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get(CSRF_HEADER) !== CSRF_VALUE) {
    return next(new ApiError(403, 'CSRF_REJECTED', 'Missing or invalid request header.'));
  }
  return next();
}

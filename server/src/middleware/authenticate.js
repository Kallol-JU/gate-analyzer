import { verifyToken, AUTH_COOKIE, clearAuthCookie } from '../modules/auth/auth.tokens.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Requires a valid login cookie. Loads the user fresh so role changes and deletions apply at once. */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in.');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    clearAuthCookie(res);
    throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has expired. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    clearAuthCookie(res);
    throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in.');
  }
  req.user = user;
  next();
});

/** Use after authenticate: requireRole('admin') */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to do that.'));
    }
    return next();
  };

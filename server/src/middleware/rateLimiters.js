import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const make = ({ windowMs, limit, message, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, 'RATE_LIMITED', message)),
  });

/** Counts only failed attempts (status >= 400), per IP. Runs before validation so junk requests count. */
export const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const registerLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: env.REGISTER_RATE_LIMIT_MAX,
  message: 'Too many sign-ups from this network. Please try again later.',
});

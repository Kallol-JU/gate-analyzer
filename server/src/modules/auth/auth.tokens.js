import jwt from 'jsonwebtoken';
import { env, isProd } from '../../config/env.js';

export const AUTH_COOKIE = 'gate_token';

const sameSite = env.COOKIE_SAME_SITE ?? (isProd ? 'none' : 'lax');

// HttpOnly: JavaScript cannot read the cookie. Secure in production (required for SameSite=None).
const baseOptions = { httpOnly: true, secure: isProd, sameSite, path: '/' };

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.JWT_EXPIRES_DAYS}d`,
  });
}

/** Throws if the token is missing, tampered with or expired. */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
}

export function setAuthCookie(res, userId) {
  res.cookie(AUTH_COOKIE, signToken(userId), { ...baseOptions, maxAge: env.JWT_EXPIRES_DAYS * 86_400_000 });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, baseOptions);
}

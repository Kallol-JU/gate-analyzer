import { asyncHandler } from '../../utils/asyncHandler.js';
import { registerUser, verifyCredentials } from './auth.service.js';
import { clearAuthCookie, setAuthCookie } from './auth.tokens.js';

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  setAuthCookie(res, user.id);
  res.status(201).json({ success: true, data: { user } });
});

export const login = asyncHandler(async (req, res) => {
  const user = await verifyCredentials(req.body.email, req.body.password);
  setAuthCookie(res, user.id);
  res.json({ success: true, data: { user } });
});

export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, data: { loggedOut: true } });
};

export const me = (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimiters.js';
import { validate } from '../../middleware/validate.js';
import { login, logout, me, register } from './auth.controller.js';
import { loginBody, registerBody } from './auth.schema.js';

const router = Router();

router.post('/register', registerLimiter, validate({ body: registerBody }), register);
router.post('/login', loginLimiter, validate({ body: loginBody }), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;

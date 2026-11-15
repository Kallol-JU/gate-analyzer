import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env, isProd } from './config/env.js';
import { csrfGuard } from './middleware/csrfGuard.js';
import { authenticate } from './middleware/authenticate.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import adminRoutes from './modules/admin/admin.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import questionRoutes from './modules/questions/question.routes.js';
import taxonomyRoutes from './modules/taxonomy/taxonomy.routes.js';
import testRoutes from './modules/tests/test.routes.js';

/** Builds the Express app without starting it, so tests can mount it on any port. */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Behind Render's proxy: needed so rate limiting sees the real client IP.
  if (isProd) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(csrfGuard);

  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1', taxonomyRoutes);
  app.use('/api/v1/questions', authenticate, questionRoutes);
  app.use('/api/v1/tests', authenticate, testRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

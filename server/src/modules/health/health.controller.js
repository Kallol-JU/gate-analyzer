import { readFileSync } from 'node:fs';
import { dbStatus } from '../../config/db.js';
import { env } from '../../config/env.js';

// server/src/modules/health -> server/package.json
const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));

/** Always 200 when the API process is up. `status` is 'degraded' while MongoDB is not connected. */
export function getHealth(_req, res) {
  const database = dbStatus();
  res.json({
    success: true,
    data: {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'gate-cbt-api',
      version: pkg.version,
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: { status: database },
    },
  });
}

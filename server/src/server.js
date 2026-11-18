import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { startAttemptSweeper } from './jobs/attemptSweeper.js';

try {
  await connectDb(env.MONGODB_URI);
  console.log('MongoDB connected');
} catch (err) {
  console.error(`MongoDB connection failed: ${err.message}`);
  console.error('Check MONGODB_URI in server/.env, and that your IP is allowed in Atlas > Network Access.');
  process.exit(1);
}

const server = createApp().listen(env.PORT, () => {
  console.log(`PrepGate API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

const stopSweeper = startAttemptSweeper();

function shutdown(signal) {
  console.log(`${signal} received, closing...`);
  stopSweeper();
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

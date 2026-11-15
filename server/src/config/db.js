import mongoose from 'mongoose';

const STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

/** 'connected' | 'connecting' | 'disconnecting' | 'disconnected' */
export function dbStatus() {
  return STATES[mongoose.connection.readyState] ?? 'disconnected';
}

export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  // Fail fast (10 s) instead of Mongoose's default 30 s when Atlas is unreachable.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

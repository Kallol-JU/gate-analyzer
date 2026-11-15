import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const send = (res, status, code, message, details) =>
  res.status(status).json({ success: false, error: { code, message, ...(details && { details }) } });

/** Every error response: { success: false, error: { code, message, details? } } */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) return send(res, err.statusCode, err.code, err.message, err.details);

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return send(res, 400, 'VALIDATION_ERROR', 'Validation failed.', details);
  }
  if (err instanceof mongoose.Error.CastError) return send(res, 400, 'INVALID_ID', 'Invalid identifier.');
  if (err?.code === 11000) {
    return send(res, 409, 'DUPLICATE', 'A record with the same unique value already exists.');
  }
  if (err?.type === 'entity.parse.failed') return send(res, 400, 'INVALID_JSON', 'Request body is not valid JSON.');
  if (err?.type === 'entity.too.large') return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');

  console.error(err);
  return send(
    res,
    500,
    'INTERNAL_ERROR',
    env.NODE_ENV === 'production' ? 'Something went wrong.' : String(err?.message ?? err),
  );
}

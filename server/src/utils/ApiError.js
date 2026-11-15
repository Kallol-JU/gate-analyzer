/**
 * Error with an HTTP status and a stable machine-readable code.
 * `details` is an optional array of { path, message } for field-level problems.
 */
export class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

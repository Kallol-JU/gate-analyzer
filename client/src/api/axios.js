import axios from 'axios';

/**
 * Single Axios instance for the whole app.
 * Development: baseURL is "/api/v1" and Vite proxies it to Express (see vite.config.js).
 * Production: set VITE_API_BASE_URL to the full backend URL, e.g. https://api.example.com/api/v1
 *
 * Login state lives in an HttpOnly cookie that JavaScript cannot read, so requests must be sent
 * with credentials. The X-Requested-With header is required by the server on every
 * state-changing request (CSRF protection).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 8000,
  withCredentials: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'gate-cbt' },
});

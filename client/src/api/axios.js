import axios from 'axios';
import { API_BASE_URL } from './baseUrl.js';

/**
 * Single Axios instance for the whole app.
 * baseURL is always the relative "/api/v1" (same origin). In development Vite proxies it to
 * Express (vite.config.js); in production Vercel rewrites it to the Render API (vercel.json).
 * Endpoint paths in src/api/*.api.js must NOT repeat "/api/v1".
 *
 * Login state lives in an HttpOnly cookie that JavaScript cannot read, so requests must be sent
 * with credentials. The X-Requested-With header is required by the server on every
 * state-changing request (CSRF protection).
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  withCredentials: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'gate-cbt' },
});

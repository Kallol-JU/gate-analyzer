import { api } from './axios.js';

/** Resolves with the `data` field of GET /api/v1/health, or rejects with an Axios error. */
export async function fetchHealth() {
  const res = await api.get('/health');
  return res.data.data;
}

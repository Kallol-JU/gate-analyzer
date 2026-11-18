import { api } from './axios.js';

export async function getDashboardAnalytics() {
  const res = await api.get('/attempts/analytics');
  return res.data.data;
}

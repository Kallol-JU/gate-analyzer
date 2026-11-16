import { api } from './axios.js';

const data = (res) => res.data.data;

export const startAttempt = async (testId) => data(await api.post('/attempts', { testId })); // { resumed, attempt }
export const startPractice = async (body) => data(await api.post('/attempts/practice', body));
export const listActive = async () => data(await api.get('/attempts/active'));
export async function listHistory(params = {}) {
  const res = await api.get('/attempts', { params });
  return { items: res.data.data, meta: res.data.meta };
}
export const getAttempt = async (id) => data(await api.get(`/attempts/${id}`));
export const getStatus = async (id) => data(await api.get(`/attempts/${id}/status`));
/** updates: [{ index, answer, marked, visited, seq }] */
export const saveResponses = async (id, updates) => data(await api.put(`/attempts/${id}/responses`, { updates }));
export const submitAttempt = async (id) => data(await api.post(`/attempts/${id}/submit`));
export const getResult = async (id) => data(await api.get(`/attempts/${id}/result`));

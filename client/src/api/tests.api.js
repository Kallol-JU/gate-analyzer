import { api } from './axios.js';

/** Published tests, metadata only. params: { kind, mode, page, limit } */
export async function listTests(params = {}) {
  const res = await api.get('/tests', { params });
  return { items: res.data.data, meta: res.data.meta };
}
export const getTest = async (id) => (await api.get(`/tests/${id}`)).data.data;

import { api } from './axios.js';

const d = (res) => res.data.data;
const page = (res) => ({ items: res.data.data, meta: res.data.meta });

// Question bank and review workflow
export const listQuestions = async (params) => page(await api.get('/admin/questions', { params }));
export const getQuestion = async (id) => d(await api.get(`/admin/questions/${id}`));
export const createQuestion = async (body) => d(await api.post('/admin/questions', body));
export const updateQuestion = async (id, body) => d(await api.patch(`/admin/questions/${id}`, body));
export const verifyQuestion = async (id, body) => d(await api.post(`/admin/questions/${id}/verify`, body));
export const rejectQuestion = async (id, reason) => d(await api.post(`/admin/questions/${id}/reject`, { reason }));
export const publishQuestion = async (id) => d(await api.post(`/admin/questions/${id}/publish`));
export const unpublishQuestion = async (id) => d(await api.post(`/admin/questions/${id}/unpublish`));
export const revalidateQuestion = async (id) => d(await api.post(`/admin/questions/${id}/revalidate`));
export const bulkAction = async (body) => d(await api.post('/admin/questions/bulk', body));
export const importQuestions = async (body) => d(await api.post('/admin/questions/import', body, { timeout: 60000 }));

// AI generation
export const aiStatus = async () => d(await api.get('/admin/ai/status'));
export const generate = async (body) => d(await api.post('/admin/ai/generate', body));
export const listBatches = async (params) => page(await api.get('/admin/ai/batches', { params }));
export const getBatch = async (id) => d(await api.get(`/admin/ai/batches/${id}`));

// Tests
export const listAdminTests = async (params) => page(await api.get('/admin/tests', { params }));
export const publishTest = async (id) => d(await api.post(`/admin/tests/${id}/publish`));
export const unpublishTest = async (id) => d(await api.post(`/admin/tests/${id}/unpublish`));
export const buildTest = async (body) => d(await api.post('/admin/tests/build', body));
export const listAllTopics = async () => d(await api.get('/admin/topics'));

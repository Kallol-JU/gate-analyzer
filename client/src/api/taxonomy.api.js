import { api } from './axios.js';

export const listSubjects = async () => (await api.get('/subjects')).data.data;
export const listTopics = async (subjectId) => (await api.get(`/subjects/${subjectId}/topics`)).data.data;

import { api } from './axios.js';

// Each function resolves with the user object, or rejects with an Axios error.
export const fetchMe = async () => (await api.get('/auth/me')).data.data.user;
export const login = async (credentials) => (await api.post('/auth/login', credentials)).data.data.user;
export const register = async (details) => (await api.post('/auth/register', details)).data.data.user;
export const logout = async () => {
  await api.post('/auth/logout');
};

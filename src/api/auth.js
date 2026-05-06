import { apiClient } from '@/api/client';

export const authApi = {
  async login({ email, password }) {
    const result = await apiClient.post('/api/auth/login', { email, password }, { auth: false });
    apiClient.setToken(result.token);
    return result.user;
  },

  async register({ email, password, full_name }) {
    const result = await apiClient.post('/api/auth/register', { email, password, full_name }, { auth: false });
    apiClient.setToken(result.token);
    return result.user;
  },

  async me() {
    const result = await apiClient.get('/api/auth/me');
    return result.user;
  },

  async logout() {
    apiClient.clearToken();
  },

  async updateMe(payload) {
    const result = await apiClient.patch('/api/users/me', payload);
    return result.user;
  },
};
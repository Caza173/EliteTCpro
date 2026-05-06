import { apiClient } from '@/api/client';

export const usersApi = {
  async list() {
    const result = await apiClient.get('/api/users');
    return result.users;
  },

  async filter(filters = {}) {
    const result = await apiClient.get('/api/users', { query: filters });
    return result.users;
  },

  async update(id, payload) {
    const result = await apiClient.patch(`/api/users/${id}`, payload);
    return result.user;
  },

  async delete(id) {
    await apiClient.delete(`/api/users/${id}`);
    return { success: true };
  },
};
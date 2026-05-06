import { apiClient } from '@/api/client';

export const tasksApi = {
  async list(filters = {}) {
    const result = await apiClient.get('/api/tasks', { query: filters });
    return result.tasks;
  },

  async get(id) {
    const result = await apiClient.get(`/api/tasks/${id}`);
    return result.task;
  },

  async create(payload) {
    const result = await apiClient.post('/api/tasks', payload);
    return result.task;
  },

  async update(id, payload) {
    const result = await apiClient.patch(`/api/tasks/${id}`, payload);
    return result.task;
  },

  async delete(id) {
    await apiClient.delete(`/api/tasks/${id}`);
    return { success: true };
  },
};
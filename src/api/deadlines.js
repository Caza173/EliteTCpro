import { apiClient } from '@/api/client';

export const deadlinesApi = {
  async list(transactionId) {
    const result = await apiClient.get('/api/deadlines', {
      query: transactionId ? { transaction_id: transactionId } : undefined,
    });
    return result.deadlines;
  },

  async filter(filters = {}) {
    const result = await apiClient.get('/api/deadlines', { query: filters });
    return result.deadlines;
  },

  async create(payload) {
    const result = await apiClient.post('/api/deadlines', payload);
    return result.deadline;
  },

  async update(id, payload) {
    const result = await apiClient.patch(`/api/deadlines/${id}`, payload);
    return result.deadline;
  },

  async delete(id) {
    await apiClient.delete(`/api/deadlines/${id}`);
    return { success: true };
  },
};
import { apiClient } from '@/api/client';

export const transactionsApi = {
  async list(filters = {}) {
    const result = await apiClient.get('/api/transactions', { query: filters });
    return result.transactions;
  },

  async get(id) {
    const result = await apiClient.get(`/api/transactions/${id}`);
    return result.transaction;
  },

  async filter(filters = {}) {
    return transactionsApi.list(filters);
  },

  async create(payload) {
    const result = await apiClient.post('/api/transactions', payload);
    return result.transaction;
  },

  async update(id, payload) {
    const result = await apiClient.patch(`/api/transactions/${id}`, payload);
    return result.transaction;
  },

  async delete(id) {
    await apiClient.delete(`/api/transactions/${id}`);
    return { success: true };
  },
};
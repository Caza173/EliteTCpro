import { apiClient } from '@/api/client';

export const checklistItemsApi = {
  async list(filters = {}) {
    const result = await apiClient.get('/api/checklist-items', { query: filters });
    return result.checklist_items;
  },

  async get(id) {
    const result = await apiClient.get(`/api/checklist-items/${id}`);
    return result.checklist_item;
  },

  async create(payload) {
    const result = await apiClient.post('/api/checklist-items', payload);
    return result.checklist_item;
  },

  async update(id, payload) {
    const result = await apiClient.patch(`/api/checklist-items/${id}`, payload);
    return result.checklist_item;
  },

  async delete(id) {
    await apiClient.delete(`/api/checklist-items/${id}`);
    return { success: true };
  },
};
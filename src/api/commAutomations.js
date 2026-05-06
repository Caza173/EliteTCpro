import { apiClient } from '@/api/client';

export const commAutomationsApi = {
  async list(filters = {}) {
    const result = await apiClient.get('/api/comm-automations', { query: filters });
    return result.comm_automations;
  },

  async get(id) {
    const result = await apiClient.get(`/api/comm-automations/${id}`);
    return result.comm_automation;
  },

  async create(payload) {
    const result = await apiClient.post('/api/comm-automations', payload);
    return result.comm_automation;
  },

  async update(id, payload) {
    const result = await apiClient.patch(`/api/comm-automations/${id}`, payload);
    return result.comm_automation;
  },

  async delete(id) {
    await apiClient.delete(`/api/comm-automations/${id}`);
    return { success: true };
  },

  async generate(transactionId, action = 'generate') {
    const result = await apiClient.post('/api/comm-automations/generate', {
      transaction_id: transactionId,
      action,
    });
    return result.comm_automations ?? result;
  },

  async send(id) {
    const result = await apiClient.post(`/api/comm-automations/${id}/send`, {});
    return result.comm_automation;
  },
};
import { apiClient } from '@/api/client';

export const complianceReportsApi = {
  async list(filters = {}) {
    const result = await apiClient.get('/api/compliance-reports', { query: filters });
    return result.compliance_reports;
  },

  async get(id) {
    const result = await apiClient.get(`/api/compliance-reports/${id}`);
    return result.compliance_report;
  },

  async create(payload) {
    const result = await apiClient.post('/api/compliance-reports', payload);
    return result.compliance_report;
  },

  async scan(payload) {
    return apiClient.post('/api/compliance-reports/scan', payload);
  },

  async getScanStatus(transactionId) {
    return apiClient.get('/api/compliance-reports/scan/status', {
      query: { transaction_id: transactionId },
    });
  },

  async update(id, payload) {
    const result = await apiClient.patch(`/api/compliance-reports/${id}`, payload);
    return result.compliance_report;
  },

  async delete(id) {
    await apiClient.delete(`/api/compliance-reports/${id}`);
    return { success: true };
  },
};
import { apiClient } from '@/api/client';

export const signatureRequestsApi = {
  async list(filters = {}) {
    const result = await apiClient.get('/api/signature-requests', { query: filters });
    return result.signature_requests;
  },

  async create(payload) {
    const result = await apiClient.post('/api/signature-requests', payload);
    return result.signature_request;
  },

  async previewPlacement(payload) {
    return apiClient.post('/api/signature-requests/placement-preview', payload);
  },

  async refresh(id) {
    const result = await apiClient.post(`/api/signature-requests/${id}/refresh`, {});
    return result.signature_request;
  },

  async resend(id) {
    const result = await apiClient.post(`/api/signature-requests/${id}/resend`, {});
    return result.signature_request;
  },

  async cancel(id) {
    const result = await apiClient.post(`/api/signature-requests/${id}/cancel`, {});
    return result.signature_request;
  },

  async markCompleted(id) {
    const result = await apiClient.post(`/api/signature-requests/${id}/mark-completed`, {});
    return result.signature_request;
  },

  async markCompletedExternal(payload) {
    const result = await apiClient.post('/api/signature-requests/mark-completed', payload);
    return result.signature_request;
  },

  async getAuditTrail(id) {
    const result = await apiClient.get(`/api/signature-requests/${id}/audit-trail`);
    return result.events;
  },
};
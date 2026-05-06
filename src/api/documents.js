import { apiClient } from '@/api/client';

export const documentsApi = {
  async list(filters = {}) {
    const result = await apiClient.get('/api/documents', { query: filters });
    return result.documents;
  },

  async filter(filters = {}) {
    return documentsApi.list(filters);
  },

  async create(payload) {
    const result = await apiClient.post('/api/documents', payload);
    return result.document;
  },

  async upload(file, payload) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      formData.append(key, String(value));
    });

    const result = await apiClient.post('/api/documents/upload', formData);
    return result.document;
  },

  async getSignedUrl(id) {
    return apiClient.get(`/api/documents/${id}/signed-url`);
  },

  async update(id, payload) {
    const result = await apiClient.patch(`/api/documents/${id}`, payload);
    return result.document;
  },

  async delete(id) {
    await apiClient.delete(`/api/documents/${id}`);
    return { success: true };
  },
};
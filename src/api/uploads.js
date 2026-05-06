import { apiClient } from '@/api/client';

function buildUploadFormData(file, payload = {}) {
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    formData.append(key, String(value));
  });
  return formData;
}

export const uploadsApi = {
  async uploadTemporary(file, payload = {}) {
    const result = await apiClient.post('/api/uploads/temporary', buildUploadFormData(file, payload));
    return result.upload;
  },

  async uploadImage(file, payload = {}) {
    const result = await apiClient.post('/api/uploads/images', buildUploadFormData(file, payload));
    return result.upload;
  },

  async getSignedUrl(objectKey) {
    const result = await apiClient.get('/api/uploads/signed-url', { query: { object_key: objectKey } });
    return result.signed_url;
  },

  async delete(objectKey) {
    await apiClient.delete('/api/uploads', { body: { object_key: objectKey } });
    return { success: true };
  },
};
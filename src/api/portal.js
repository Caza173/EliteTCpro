import { apiClient } from '@/api/client';

export const portalApi = {
  async generateCodes(transactionId) {
    return apiClient.post('/api/portal/generate-codes', { transaction_id: transactionId });
  },

  async lookup(code) {
    return apiClient.post('/api/portal/lookup', { code }, { auth: false });
  },
};
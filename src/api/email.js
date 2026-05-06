import { apiClient } from '@/api/client';

export const emailApi = {
  async send(payload) {
    return apiClient.post('/api/emails/send', payload);
  },

  async sendFinancialCommitment(payload) {
    return apiClient.post('/api/emails/financial-commitment', payload);
  },
};
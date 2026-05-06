import { authApi } from '@/api/auth';
import { deadlinesApi } from '@/api/deadlines';
import { documentsApi } from '@/api/documents';
import { transactionsApi } from '@/api/transactions';
import { usersApi } from '@/api/users';
import { redirectToLogin } from '@/lib/authRouting';

function createUnsupportedEntityApi(entityName) {
  return {
    async list() {
      return [];
    },
    async filter() {
      return [];
    },
    async create() {
      throw new Error(`${entityName} has not been migrated to the Express API yet.`);
    },
    async bulkCreate() {
      throw new Error(`${entityName} has not been migrated to the Express API yet.`);
    },
    async update() {
      throw new Error(`${entityName} has not been migrated to the Express API yet.`);
    },
    async delete() {
      throw new Error(`${entityName} has not been migrated to the Express API yet.`);
    },
  };
}

const entityAdapters = {
  Transaction: transactionsApi,
  Document: documentsApi,
  Deadline: deadlinesApi,
  User: usersApi,
};

const entities = new Proxy(
  {},
  {
    get(_target, property) {
      if (typeof property !== 'string') return undefined;
      return entityAdapters[property] || createUnsupportedEntityApi(property);
    },
  }
);

export const base44 = {
  auth: {
    me: authApi.me,
    login: authApi.login,
    register: authApi.register,
    updateMe: authApi.updateMe,
    async logout(redirectTo = '/') {
      await authApi.logout();
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    },
    redirectToLogin(redirectTo = '/Dashboard') {
      redirectToLogin(redirectTo);
    },
  },
  entities,
  functions: {
    async invoke(name, payload = {}) {
      switch (name) {
        case 'getTeamTransactions': {
          const transactions = await transactionsApi.list(payload);
          return { data: { transactions } };
        }
        case 'createTransaction': {
          const transaction = await transactionsApi.create(payload);
          return { data: transaction };
        }
        case 'updateTransaction': {
          const id = payload.transaction_id || payload.id;
          const data = payload.data || payload;
          const transaction = await transactionsApi.update(id, data);
          return { data: transaction };
        }
        case 'deleteTransaction': {
          await transactionsApi.delete(payload.transaction_id || payload.id);
          return { data: { success: true } };
        }
        case 'listUsers': {
          const users = await usersApi.list();
          return { data: { users } };
        }
        case 'updateUserRole': {
          const user = await usersApi.update(payload.user_id || payload.id, { role: payload.role });
          return { data: user };
        }
        case 'deleteUser': {
          await usersApi.delete(payload.user_id || payload.id);
          return { data: { success: true } };
        }
        case 'syncDeadlineAlerts': {
          const deadlines = await deadlinesApi.list(payload.transaction_id);
          return { data: { alerts: deadlines } };
        }
        default:
          throw new Error(`Function ${name} has not been migrated to the Express API yet.`);
      }
    },
  },
  integrations: {
    Core: {
      async UploadFile() {
        throw new Error('File upload migration is not implemented yet. Route uploads through the new backend before using this flow.');
      },
      async UploadPrivateFile() {
        throw new Error('Private file upload migration is not implemented yet.');
      },
      async CreateFileSignedUrl() {
        throw new Error('Signed URL generation migration is not implemented yet.');
      },
      async InvokeLLM() {
        throw new Error('AI migration is not implemented yet. Use the new backend AI routes.');
      },
    },
  },
  users: {
    async inviteUser() {
      throw new Error('User invitation has not been migrated to the Express API yet.');
    },
  },
};

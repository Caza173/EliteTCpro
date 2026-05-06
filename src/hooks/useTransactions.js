import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/api/transactions';

export const transactionQueryKeys = {
  all: ['transactions'],
  list: (filters = {}) => ['transactions', filters],
  detail: (id) => ['transactions', 'detail', id],
};

function updateCachedTransaction(cacheValue, transactionId, updater) {
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((transaction) =>
      transaction.id === transactionId ? updater(transaction) : transaction
    );
  }

  if (cacheValue && typeof cacheValue === 'object' && cacheValue.id === transactionId) {
    return updater(cacheValue);
  }

  return cacheValue;
}

export function useTransactions(filters = {}, options = {}) {
  return useQuery({
    queryKey: transactionQueryKeys.list(filters),
    queryFn: () => transactionsApi.list(filters),
    ...options,
  });
}

export function useTransaction(id, options = {}) {
  return useQuery({
    queryKey: transactionQueryKeys.detail(id),
    queryFn: () => transactionsApi.get(id),
    enabled: Boolean(id) && (options.enabled ?? true),
    retry: false,
    ...options,
  });
}

export function useUpdateTransaction(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => transactionsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: transactionQueryKeys.all });
      const snapshots = queryClient.getQueriesData({ queryKey: transactionQueryKeys.all });

      queryClient.setQueriesData({ queryKey: transactionQueryKeys.all }, (current) =>
        updateCachedTransaction(current, id, (transaction) => ({ ...transaction, ...data }))
      );

      options.onMutate?.({ id, data, snapshots });
      return { snapshots };
    },
    onError: (error, variables, context) => {
      context?.snapshots?.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
      options.onError?.(error, variables, context);
    },
    onSuccess: (transaction, variables, context) => {
      queryClient.setQueryData(transactionQueryKeys.detail(transaction.id), transaction);
      options.onSuccess?.(transaction, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.detail(variables.id) });
      }
      options.onSettled?.(data, error, variables, context);
    },
  });
}

export function useDeleteTransaction(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => transactionsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: transactionQueryKeys.all });
      const snapshots = queryClient.getQueriesData({ queryKey: transactionQueryKeys.all });

      queryClient.setQueriesData({ queryKey: transactionQueryKeys.all }, (current) => {
        if (Array.isArray(current)) {
          return current.filter((transaction) => transaction.id !== id);
        }
        return current;
      });

      options.onMutate?.(id, snapshots);
      return { snapshots };
    },
    onError: (error, id, context) => {
      context?.snapshots?.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
      options.onError?.(error, id, context);
    },
    onSuccess: (_result, id, context) => {
      queryClient.removeQueries({ queryKey: transactionQueryKeys.detail(id) });
      options.onSuccess?.(_result, id, context);
    },
    onSettled: (_data, _error, id, context) => {
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      options.onSettled?.(_data, _error, id, context);
    },
  });
}
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checklistItemsApi } from '@/api/checklistItems';
import { commAutomationsApi } from '@/api/commAutomations';
import { complianceReportsApi } from '@/api/complianceReports';
import { documentsApi } from '@/api/documents';
import { tasksApi } from '@/api/tasks';

export const transactionResourceQueryKeys = {
  tasks: (transactionId) => ['txTasks', transactionId],
  checklist: (transactionId) => ['checklist', transactionId],
  documents: (transactionId) => ['tx-documents', transactionId],
  complianceReports: (transactionId) => ['compliance-reports', transactionId],
  commAutomations: (transactionId) => ['comm-automations', transactionId],
};

function invalidateTransactionResourceQueries(queryClient, transactionId) {
  queryClient.invalidateQueries({ queryKey: transactionResourceQueryKeys.tasks(transactionId) });
  queryClient.invalidateQueries({ queryKey: transactionResourceQueryKeys.checklist(transactionId) });
  queryClient.invalidateQueries({ queryKey: transactionResourceQueryKeys.documents(transactionId) });
  queryClient.invalidateQueries({ queryKey: transactionResourceQueryKeys.complianceReports(transactionId) });
  queryClient.invalidateQueries({ queryKey: transactionResourceQueryKeys.commAutomations(transactionId) });
}

export function useTransactionTasks(transactionId, options = {}) {
  return useQuery({
    queryKey: transactionResourceQueryKeys.tasks(transactionId),
    queryFn: () => tasksApi.list({ transaction_id: transactionId }),
    enabled: Boolean(transactionId) && (options.enabled ?? true),
    ...options,
  });
}

export function useTransactionChecklistItems(transactionId, options = {}) {
  return useQuery({
    queryKey: transactionResourceQueryKeys.checklist(transactionId),
    queryFn: () => checklistItemsApi.list({ transaction_id: transactionId }),
    enabled: Boolean(transactionId) && (options.enabled ?? true),
    ...options,
  });
}

export function useTransactionDocuments(transactionId, options = {}) {
  return useQuery({
    queryKey: transactionResourceQueryKeys.documents(transactionId),
    queryFn: () => documentsApi.list({ transaction_id: transactionId }),
    enabled: Boolean(transactionId) && (options.enabled ?? true),
    ...options,
  });
}

export function useTransactionComplianceReports(transactionId, options = {}) {
  return useQuery({
    queryKey: transactionResourceQueryKeys.complianceReports(transactionId),
    queryFn: () => complianceReportsApi.list({ transaction_id: transactionId }),
    enabled: Boolean(transactionId) && (options.enabled ?? true),
    ...options,
  });
}

export function useTransactionCommAutomations(transactionId, options = {}) {
  return useQuery({
    queryKey: transactionResourceQueryKeys.commAutomations(transactionId),
    queryFn: () => commAutomationsApi.list({ transaction_id: transactionId }),
    enabled: Boolean(transactionId) && (options.enabled ?? true),
    ...options,
  });
}

export function useTaskMutation(transactionId, mutationFn, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: transactionResourceQueryKeys.tasks(transactionId) });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useChecklistMutation(transactionId, mutationFn, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: transactionResourceQueryKeys.checklist(transactionId) });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useDocumentsMutation(transactionId, mutationFn, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: transactionResourceQueryKeys.documents(transactionId) });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useCommAutomationMutation(transactionId, mutationFn, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: transactionResourceQueryKeys.commAutomations(transactionId) });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function invalidateTransactionResourceSlice(queryClient, transactionId) {
  invalidateTransactionResourceQueries(queryClient, transactionId);
}
import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook for managing deadline alerts with dismissal state
 */
export function useDeadlineAlerts(transactionId, userTimezone = 'America/New_York') {
  const queryClient = useQueryClient();
  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`dismissed_alerts_${transactionId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Fetch all alerts for transaction
  const { data: allAlerts = [], isLoading, refetch } = useQuery({
    queryKey: ['monitorAlerts', transactionId],
    queryFn: () => base44.entities.MonitorAlert.filter({ transaction_id: transactionId }, '-generated_at'),
    enabled: !!transactionId,
    staleTime: 30000, // 30 seconds
  });

  // Sync alerts via backend
  const syncMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('syncDeadlineAlerts', {
        transaction_id: transactionId,
        user_timezone: userTimezone,
        include_dismissed: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitorAlerts', transactionId] });
    },
  });

  // Filter alerts
  const activeAlerts = allAlerts.filter(
    a => a.alert_state === 'active' && !dismissedAlertIds.has(a.deadline_id)
  );

  const resolvedAlerts = allAlerts.filter(a => a.alert_state === 'resolved');
  const dismissedAlerts = allAlerts.filter(
    a => a.alert_state === 'active' && dismissedAlertIds.has(a.deadline_id)
  );

  // Dismiss alert
  const handleDismiss = useCallback((deadlineId) => {
    setDismissedAlertIds(prev => {
      const updated = new Set(prev);
      updated.add(deadlineId);
      localStorage.setItem(`dismissed_alerts_${transactionId}`, JSON.stringify([...updated]));
      return updated;
    });
  }, [transactionId]);

  // Undismiss alert
  const handleUndismiss = useCallback((deadlineId) => {
    setDismissedAlertIds(prev => {
      const updated = new Set(prev);
      updated.delete(deadlineId);
      localStorage.setItem(`dismissed_alerts_${transactionId}`, JSON.stringify([...updated]));
      return updated;
    });
  }, [transactionId]);

  // Clear dismissal (re-evaluate all)
  const handleClearDismissals = useCallback(() => {
    setDismissedAlertIds(new Set());
    localStorage.removeItem(`dismissed_alerts_${transactionId}`);
  }, [transactionId]);

  // Auto-sync on transaction change
  useEffect(() => {
    if (transactionId) {
      syncMutation.mutate();
    }
  }, [transactionId]);

  return {
    // Alerts
    activeAlerts,
    resolvedAlerts,
    dismissedAlerts,
    allAlerts,

    // State
    isLoading: isLoading || syncMutation.isPending,
    isSyncing: syncMutation.isPending,

    // Actions
    dismissAlert: handleDismiss,
    undismissAlert: handleUndismiss,
    clearDismissals: handleClearDismissals,
    refreshAlerts: () => refetch(),
    syncAlerts: () => syncMutation.mutate(),

    // Summaries
    criticalCount: activeAlerts.filter(a => a.severity === 'critical').length,
    warningCount: activeAlerts.filter(a => a.severity === 'warning').length,
    infoCount: activeAlerts.filter(a => a.severity === 'info').length,
    totalActive: activeAlerts.length,
  };
}
/**
 * useDealAccess — Centralized role-based deal access control
 *
 * BACKEND-ENFORCED: All transaction queries go through getTeamTransactions
 * which applies team-based isolation server-side.
 *
 * Visibility rules (enforced on server):
 *  - Super admin (owner/admin/master): ALL deals
 *  - TC / tc_lead: pending team deals + assigned deals
 *  - Team admin: all deals in their team(s)
 *  - Viewer: all deals in their team(s), read-only
 *  - Agent: only their own deals (by agent_email)
 *  - Client: only their deal (by client_email)
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser, isOwnerOrAdmin, isMasterAccount } from "@/components/auth/useCurrentUser";

export function isSuperAdmin(user) {
  if (!user) return false;
  return isMasterAccount(user) || isOwnerOrAdmin(user);
}

export function isTC(user) {
  return user?.role === "tc" || user?.role === "tc_lead";
}

export function useDealAccess() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  // Server-enforced team-scoped query — replaces raw entity.list()
  const { data: serverData, isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () =>
      base44.functions.invoke("getTeamTransactions", { sort: "-created_date", limit: 200 })
        .then(r => r.data?.transactions || []),
    enabled: !!currentUser,
    staleTime: 60_000,
    cacheTime: 90_000,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10_000),
  });

  const allTransactions = serverData || [];
  const isLoading = userLoading || txLoading;

  // All transactions returned by the server are already access-controlled
  // so we can treat the full list as "accessible"
  const transactions = allTransactions;

  const accessibleDealIds = new Set(allTransactions.map(t => t.id));

  // Derived views
  const pendingDeals = allTransactions.filter(t => t.status === "pending" && !t.assigned_tc_id);
  const myDeals = allTransactions.filter(t =>
    t.assigned_tc_id === currentUser?.id || t.assigned_tc_email === currentUser?.email
  );

  function canAccess(dealId) {
    if (!currentUser || !dealId) return false;
    return accessibleDealIds.has(dealId);
  }

  return {
    transactions,
    pendingDeals,
    myDeals,
    allTransactions,
    accessibleDealIds,
    isLoading,
    canAccess,
    currentUser,
    isSuperAdmin: isSuperAdmin(currentUser),
    isTC: isTC(currentUser),
  };
}

export function useAccessibleDealIds() {
  const { accessibleDealIds, isLoading } = useDealAccess();
  return { accessibleDealIds, isLoading };
}
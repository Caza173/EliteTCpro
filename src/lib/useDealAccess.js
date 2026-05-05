/**
 * useDealAccess — Per-user isolated deal access.
 *
 * Each user only sees transactions where created_by === user.id.
 * Super admin (nhcazateam@gmail.com) sees all transactions.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/auth/useCurrentUser";

const SUPER_ADMIN_EMAIL = "nhcazateam@gmail.com";

export function isSuperAdmin(user) {
  if (!user) return false;
  return user.email === SUPER_ADMIN_EMAIL || user.role === "owner" || user.role === "admin";
}

export function useDealAccess() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const { data: serverData, isLoading: txLoading, error: txError } = useQuery({
    queryKey: ["transactions", currentUser?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke("getTeamTransactions", { sort: "-created_date", limit: 200 });
      const txs = r.data?.transactions;
      if (!Array.isArray(txs)) throw new Error("Invalid response from getTeamTransactions");
      return txs;
    },
    enabled: !!currentUser,
    staleTime: 30_000,
    retry: 2,
  });

  if (txError) console.error("[useDealAccess] Error fetching transactions:", txError);

  const allTransactions = serverData || [];
  const isLoading = userLoading || txLoading;
  const accessibleDealIds = new Set(allTransactions.map(t => t.id));

  const pendingDeals = allTransactions.filter(t => t.status === "pending" && !t.assigned_tc_id);
  const myDeals = allTransactions; // All returned deals are already the user's own

  function canAccess(dealId) {
    if (!currentUser || !dealId) return false;
    if (txError || isLoading) return true; // fail open on error/loading
    return accessibleDealIds.has(dealId);
  }

  return {
    transactions: allTransactions,
    pendingDeals,
    myDeals,
    allTransactions,
    accessibleDealIds,
    isLoading,
    canAccess,
    currentUser,
    isSuperAdmin: isSuperAdmin(currentUser),
    isTC: currentUser?.role === "tc" || currentUser?.role === "tc_lead",
  };
}

export function useAccessibleDealIds() {
  const { accessibleDealIds, isLoading } = useDealAccess();
  return { accessibleDealIds, isLoading };
}
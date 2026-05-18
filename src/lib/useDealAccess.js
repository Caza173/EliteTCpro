/**
 * useDealAccess — Strictly per-user isolated deal access.
 *
 * Each user only sees transactions they own (created_by, owner_id, agent_email).
 * Super admin (nhcazateam@gmail.com) sees all transactions.
 * No team, brokerage, or shared access of any kind.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser as useCurrentUserCtx } from "@/lib/CurrentUserContext.jsx";

const SUPER_ADMIN_EMAIL = "nhcazateam@gmail.com";

export function isSuperAdmin(user) {
  if (!user) return false;
  return user.email === SUPER_ADMIN_EMAIL;
}

export function useDealAccess() {
  const ctx = useCurrentUserCtx();
  const currentUser = ctx?.currentUser ?? null;
  const userLoading = ctx?.isLoading ?? true;

  const { data: serverData, isLoading: txLoading, error: txError } = useQuery({
    queryKey: ["transactions", currentUser?.id ?? "none"],
    queryFn: async () => {
      const r = await base44.functions.invoke("getTeamTransactions", { sort: "-created_date", limit: 200 });
      const txs = r.data?.transactions;
      if (!Array.isArray(txs)) throw new Error("Invalid response from getTeamTransactions");
      return txs;
    },
    enabled: !!currentUser && !userLoading,
    staleTime: 30_000,
    retry: 2,
    suspense: false,
  });

  if (txError) console.error("[useDealAccess] Error fetching transactions:", txError);

  const allTransactions = serverData || [];
  const isLoading = userLoading || txLoading;
  const accessibleDealIds = new Set(allTransactions.map(t => t.id));

  function canAccess(dealId) {
    if (!currentUser || !dealId) return false;
    if (txError || isLoading) return true;
    return accessibleDealIds.has(dealId);
  }

  return {
    transactions: allTransactions,
    allTransactions,
    accessibleDealIds,
    isLoading,
    canAccess,
    currentUser,
    isSuperAdmin: isSuperAdmin(currentUser),
  };
}

export function useAccessibleDealIds() {
  const { accessibleDealIds, isLoading } = useDealAccess();
  return { accessibleDealIds, isLoading };
}
/**
 * useDealAccess — Ownership-based deal access control.
 *
 * A user can see a deal if:
 *   - deal.created_by === currentUser.id
 *   - OR deal.assigned_tc_id === currentUser.id
 *   - OR user is super_admin (owner/admin/master email)
 *
 * All filtering is enforced server-side via getTeamTransactions.
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

  // Pending = unassigned deals the user created (they're waiting for a TC)
  const pendingDeals = allTransactions.filter(t => t.status === "pending" && !t.assigned_tc_id);
  const myDeals = allTransactions.filter(t =>
    t.assigned_tc_id === currentUser?.id || t.created_by === currentUser?.id
  );

  function canAccess(dealId) {
    if (!currentUser || !dealId) return false;
    // If transactions failed to load (network error), fail open — don't deny access
    if (txError) return true;
    // If still loading, fail open
    if (isLoading) return true;
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
    // Keep isTC as a helper but base it on ownership/role
    isTC: currentUser?.role === "tc" || currentUser?.role === "tc_lead",
  };
}

export function useAccessibleDealIds() {
  const { accessibleDealIds, isLoading } = useDealAccess();
  return { accessibleDealIds, isLoading };
}
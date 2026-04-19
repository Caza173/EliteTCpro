/**
 * useDealAccess — Centralized role-based deal access control
 *
 * Super admins (owner/admin/master) see ALL deals.
 * Standard users (tc, tc_lead, agent) see only:
 *   - Deals they created (created_by === user.email)
 *   - Deals where they are a DealCollaborator
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser, isOwnerOrAdmin, isMasterAccount } from "@/components/auth/useCurrentUser";

/** Returns true if the user has super-admin level access (sees all deals) */
export function isSuperAdmin(user) {
  if (!user) return false;
  return isMasterAccount(user) || isOwnerOrAdmin(user);
}

/**
 * Primary hook — returns:
 *   transactions: the filtered list the user is allowed to see
 *   accessibleDealIds: Set of deal IDs the user can access (useful for sub-filtering)
 *   isLoading: true while either query is in flight
 *   canAccess(dealId): function — returns true if user may view this deal
 */
export function useDealAccess() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  // Fetch ALL transactions (admins) or all (we filter client-side for non-admins)
  const { data: allTransactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions", "all"],
    queryFn: () => base44.entities.Transaction.list("-created_date"),
    enabled: !!currentUser,
    staleTime: 30_000,
  });

  // Fetch DealCollaborator rows for the current user (non-admins only — avoids unnecessary query for admins)
  const { data: myCollaborations = [], isLoading: collabLoading } = useQuery({
    queryKey: ["dealCollaborators", currentUser?.email],
    queryFn: () =>
      base44.entities.DealCollaborator.filter({ user_email: currentUser.email }),
    enabled: !!currentUser && !isSuperAdmin(currentUser),
    staleTime: 30_000,
  });

  const isLoading = userLoading || txLoading || (!!currentUser && !isSuperAdmin(currentUser) && collabLoading);

  // Build the accessible deal ID set
  const accessibleDealIds = (() => {
    if (!currentUser) return new Set();
    if (isSuperAdmin(currentUser)) {
      // Super admin — all deals
      return new Set(allTransactions.map(t => t.id));
    }
    // Standard user: owned deals + collaborator deals
    const collabDealIds = new Set(myCollaborations.map(c => c.deal_id));
    const owned = allTransactions
      .filter(t =>
        t.created_by === currentUser.email ||
        t.agent_email === currentUser.email ||
        collabDealIds.has(t.id)
      )
      .map(t => t.id);
    return new Set(owned);
  })();

  // The filtered transaction list
  const transactions = isSuperAdmin(currentUser)
    ? allTransactions
    : allTransactions.filter(t => accessibleDealIds.has(t.id));

  /** Returns true if the current user may access a specific deal */
  function canAccess(dealId) {
    if (!currentUser || !dealId) return false;
    return accessibleDealIds.has(dealId);
  }

  return {
    transactions,
    accessibleDealIds,
    isLoading,
    canAccess,
    currentUser,
    isSuperAdmin: isSuperAdmin(currentUser),
  };
}

/**
 * Lightweight hook — just fetches the collaborator-filtered deal ID set.
 * Useful in components that already have transactions but need to gate access.
 */
export function useAccessibleDealIds() {
  const { accessibleDealIds, isLoading } = useDealAccess();
  return { accessibleDealIds, isLoading };
}
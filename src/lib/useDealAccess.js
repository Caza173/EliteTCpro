/**
 * useDealAccess — Centralized role-based deal access control
 *
 * Visibility rules:
 *  - Super admin (owner/admin/master): ALL deals
 *  - TC / tc_lead: 
 *      - ALL pending deals (status === "pending")
 *      - Deals where assigned_tc_id === user.id
 *      - Deals where user is a DealCollaborator
 *  - Agent: deals where agent_email matches OR is a collaborator
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

  const { data: allTransactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions", "all"],
    queryFn: () => base44.entities.Transaction.list("-created_date"),
    enabled: !!currentUser,
    staleTime: 30_000,
  });

  const { data: myCollaborations = [], isLoading: collabLoading } = useQuery({
    queryKey: ["dealCollaborators", currentUser?.email],
    queryFn: () => base44.entities.DealCollaborator.filter({ user_email: currentUser.email }),
    enabled: !!currentUser && !isSuperAdmin(currentUser),
    staleTime: 30_000,
  });

  const isLoading = userLoading || txLoading || (!isSuperAdmin(currentUser) && !!currentUser && collabLoading);

  const accessibleDealIds = (() => {
    if (!currentUser) return new Set();
    if (isSuperAdmin(currentUser)) return new Set(allTransactions.map(t => t.id));

    const collabDealIds = new Set(myCollaborations.map(c => c.deal_id));
    const userIsTC = isTC(currentUser);

    return new Set(
      allTransactions
        .filter(t =>
          // All pending deals visible to TCs (for claiming)
          (userIsTC && t.status === "pending") ||
          // Assigned to this TC
          t.assigned_tc_id === currentUser.id ||
          t.assigned_tc_email === currentUser.email ||
          // Legacy: agent email match
          t.agent_email === currentUser.email ||
          // Collaborator
          collabDealIds.has(t.id)
        )
        .map(t => t.id)
    );
  })();

  const transactions = isSuperAdmin(currentUser)
    ? allTransactions
    : allTransactions.filter(t => accessibleDealIds.has(t.id));

  // Derived views
  const pendingDeals = allTransactions.filter(t => t.status === "pending");
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
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    retry: false,
  });
}

const MASTER_EMAIL = "nhcazateam@gmail.com";
const FULL_ACCESS_ROLES = ["admin", "owner", "tc_lead", "tc"];

/** Super admin / master account override */
export function isMasterAccount(user) {
  return user?.email === MASTER_EMAIL;
}

/** Full internal staff access — can do everything */
export function hasFullAccess(user) {
  if (!user) return false;
  return isMasterAccount(user) || FULL_ACCESS_ROLES.includes(user?.role);
}

export function canManageTransactions(user) {
  return hasFullAccess(user);
}

export function canDeleteRecords(user) {
  return hasFullAccess(user);
}

export function canManageUsers(user) {
  return hasFullAccess(user);
}

export function canManageBilling(user) {
  return isMasterAccount(user) || user?.role === "owner" || user?.role === "admin";
}

// Legacy helpers — kept for backward compatibility
export function isOwnerOrAdmin(user) {
  return isMasterAccount(user) || user?.role === "owner" || user?.role === "admin";
}

export function isTCOrAdmin(user) {
  return hasFullAccess(user);
}

export function isTC(user) {
  return user?.role === "tc" || user?.role === "tc_lead";
}

export function isTCLead(user) {
  return user?.role === "tc_lead";
}

export function isAgent(user) {
  return user?.role === "agent";
}

export function isClient(user) {
  return user?.role === "client";
}

export function canEdit(user) {
  return hasFullAccess(user) || user?.role === "agent";
}
/**
 * useCurrentUser — delegates to the global CurrentUserContext.
 * Strictly per-user, no team or brokerage role logic.
 */
import { useCurrentUser as _useCurrentUser } from '@/lib/CurrentUserContext.jsx';

export function useCurrentUser() {
  const ctx = _useCurrentUser();
  const currentUser = (ctx ?? {}).currentUser ?? null;
  const isLoading = (ctx ?? {}).isLoading ?? true;
  // Shim: return same shape as react-query { data, isLoading }
  return { data: currentUser, isLoading };
}

const MASTER_EMAIL = "nhcazateam@gmail.com";

export function isMasterAccount(user) {
  return user?.email === MASTER_EMAIL;
}

export function hasFullAccess(user) {
  return isMasterAccount(user) || user?.role === "admin";
}

export function canManageTransactions(user) {
  return !!user;
}

export function canDeleteRecords(user) {
  return !!user;
}

export function canManageUsers(user) {
  return isMasterAccount(user) || user?.role === "admin";
}

// Legacy compat
export function isOwnerOrAdmin(user) {
  return isMasterAccount(user) || user?.role === "admin";
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

export function canEdit(user) {
  return !!user;
}

export function isAgent(user) {
  return user?.role === "agent";
}

export function isClient(user) {
  return user?.role === "client";
}
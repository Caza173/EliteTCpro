import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    retry: false,
  });
}

export function isOwnerOrAdmin(user) {
  return user?.role === "owner" || user?.role === "admin";
}

export function isTCOrAdmin(user) {
  return ["tc", "tc_lead", "admin", "owner"].includes(user?.role);
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
  return ["owner", "admin", "tc_lead", "tc", "agent"].includes(user?.role);
}

export function canManageBilling(user) {
  return user?.role === "owner" || user?.role === "admin";
}
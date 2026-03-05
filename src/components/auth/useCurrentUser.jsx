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
  return user?.role === "tc" || user?.role === "admin" || user?.role === "owner";
}

export function isAgent(user) {
  return user?.role === "agent";
}

export function isClient(user) {
  return user?.role === "client";
}

export function canEdit(user) {
  return ["owner", "admin", "tc", "agent"].includes(user?.role);
}

export function canManageBilling(user) {
  return user?.role === "owner" || user?.role === "admin";
}
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    retry: false,
  });
}

export function isTCOrAdmin(user) {
  return user?.role === "tc" || user?.role === "admin";
}

export function isAgent(user) {
  return user?.role === "agent";
}

export function isClient(user) {
  return user?.role === "client";
}

export function canEdit(user) {
  return user?.role === "tc" || user?.role === "admin" || user?.role === "agent";
}
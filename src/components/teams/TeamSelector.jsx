/**
 * TeamSelector — Dropdown to pick a team when creating a transaction.
 * Shows teams the current user belongs to (or all teams for admins).
 */
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function TeamSelector({ value, onChange, currentUser, className = "" }) {
  const { data, isLoading } = useQuery({
    queryKey: ["my-teams-selector"],
    queryFn: () => base44.functions.invoke("manageTeam", { action: "list_my_teams" }).then(r => r.data),
    enabled: !!currentUser,
    staleTime: 60_000,
  });

  const teams = data?.teams || [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-md border text-xs text-gray-400"
        style={{ borderColor: "var(--input-border)", background: "var(--input-bg)" }}>
        <Loader2 className="w-3 h-3 animate-spin" /> Loading teams…
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="h-9 px-3 flex items-center rounded-md border text-xs text-gray-400 italic"
        style={{ borderColor: "var(--input-border)", background: "var(--input-bg)" }}>
        No teams available — contact your admin
      </div>
    );
  }

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className={`h-9 text-sm ${className}`}>
        <SelectValue placeholder="Select team…" />
      </SelectTrigger>
      <SelectContent>
        {teams.map(t => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Search } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser, isOwnerOrAdmin } from "../components/auth/useCurrentUser";

const ACTION_COLORS = {
  phase_changed: "bg-blue-50 text-blue-700",
  task_completed: "bg-emerald-50 text-emerald-700",
  doc_uploaded: "bg-purple-50 text-purple-700",
  doc_approved: "bg-emerald-50 text-emerald-700",
  doc_rejected: "bg-red-50 text-red-700",
  user_invited: "bg-cyan-50 text-cyan-700",
  role_changed: "bg-amber-50 text-amber-700",
  billing_event: "bg-orange-50 text-orange-700",
  deadline_edited: "bg-amber-50 text-amber-700",
};

export default function AuditLogPage() {
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditLogs", currentUser?.brokerage_id],
    queryFn: () => base44.entities.AuditLog.filter({ brokerage_id: currentUser?.brokerage_id }, "-created_date", 100),
    enabled: !!currentUser?.brokerage_id && isOwnerOrAdmin(currentUser),
  });

  if (!isOwnerOrAdmin(currentUser)) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Audit log access is restricted to Owner/Admin accounts.</p>
      </div>
    );
  }

  const filtered = logs.filter((l) =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" /> Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">All brokerage-level activity and change history.</p>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder="Search logs…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No audit events recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${ACTION_COLORS[log.action] || "bg-gray-50 text-gray-600"}`}>
                        {log.action?.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm text-gray-700">{log.description || `${log.entity_type} ${log.entity_id}`}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      by <span className="font-medium text-gray-500">{log.actor_email || "system"}</span>
                      {log.transaction_id && <> · tx: <span className="font-mono text-[10px]">{log.transaction_id?.slice(-6)}</span></>}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {log.created_date ? format(new Date(log.created_date), "MMM d, h:mm a") : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
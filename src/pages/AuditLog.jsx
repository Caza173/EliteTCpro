import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, X } from "lucide-react";
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

function AuditDetailDialog({ log, onClose }) {
  if (!log) return null;

  const hasData = log.before || log.after;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${ACTION_COLORS[log.action] || "bg-gray-50 text-gray-600"}`}>
              {log.action?.replace(/_/g, " ")}
            </Badge>
            <span className="text-sm font-semibold text-gray-800">{log.description || `${log.entity_type} ${log.entity_id}`}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Actor: <span className="font-medium text-gray-700">{log.actor_email || "system"}</span></span>
          {log.transaction_id && <span>Transaction: <span className="font-medium text-gray-700">{txAddressMap[log.transaction_id] || log.transaction_id}</span></span>}
          {log.entity_type && <span>Entity: <span className="font-medium text-gray-700">{log.entity_type}</span></span>}
          {log.entity_id && <span>ID: <span className="font-mono text-gray-700">{log.entity_id}</span></span>}
          <span>Time: <span className="font-medium text-gray-700">{log.created_date ? format(new Date(log.created_date), "MMM d, yyyy h:mm:ss a") : "—"}</span></span>
        </div>

        {/* Data */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!hasData ? (
            <p className="text-sm text-gray-400 text-center py-8">No before/after data recorded for this event.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {log.before && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Before</p>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 overflow-auto whitespace-pre-wrap break-words">
                    {JSON.stringify(log.before, null, 2)}
                  </pre>
                </div>
              )}
              {log.after && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">After</p>
                  <pre className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-gray-700 overflow-auto whitespace-pre-wrap break-words">
                    {JSON.stringify(log.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditLogs", currentUser?.brokerage_id],
    queryFn: () => base44.entities.AuditLog.filter({ brokerage_id: currentUser?.brokerage_id }, "-created_date", 100),
    enabled: !!currentUser?.brokerage_id && isOwnerOrAdmin(currentUser),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list(),
    enabled: isOwnerOrAdmin(currentUser),
  });

  const txAddressMap = Object.fromEntries(transactions.map(t => [t.id, t.address]));

  if (!isOwnerOrAdmin(currentUser)) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Audit log access is restricted to Owner/Admin accounts.</p>
      </div>
    );
  }

  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type).filter(Boolean))].sort();

  const filtered = logs.filter((l) => {
    const matchesSearch = !search ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    const matchesEntity = entityFilter === "all" || l.entity_type === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 w-full min-w-0">
      <AuditDetailDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" /> Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">All brokerage-level activity and change history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-9 w-56" placeholder="Search logs…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map(a => (
                <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {uniqueEntities.map(e => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(actionFilter !== "all" || entityFilter !== "all" || search) && (
            <button
              onClick={() => { setActionFilter("all"); setEntityFilter("all"); setSearch(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
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
                <div key={log.id} onClick={() => setSelectedLog(log)} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${ACTION_COLORS[log.action] || "bg-gray-50 text-gray-600"}`}>
                        {log.action?.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm text-gray-700">{log.description || `${log.entity_type} ${log.entity_id}`}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      by <span className="font-medium text-gray-500">{log.actor_email || "system"}</span>
                      {log.transaction_id && <> · <span className="text-gray-500">{txAddressMap[log.transaction_id] || log.transaction_id?.slice(-6)}</span></>}
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
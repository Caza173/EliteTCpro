import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch, CheckCircle2, FileText, AlertTriangle,
  User, Clock, Activity
} from "lucide-react";
import { format, parseISO } from "date-fns";

const ACTION_CONFIG = {
  phase_changed:   { icon: GitBranch, color: "text-indigo-500", bg: "bg-indigo-50" },
  task_completed:  { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
  doc_uploaded:    { icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
  status_changed:  { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
  deadline_alert:  { icon: Clock, color: "text-rose-500", bg: "bg-rose-50" },
};

export default function TransactionActivityFeed({ transactionId }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditLog", transactionId],
    queryFn: () =>
      base44.entities.AuditLog.filter(
        { transaction_id: transactionId },
        "-created_date",
        50
      ),
    enabled: !!transactionId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No activity recorded yet.</p>
        <p className="text-xs text-gray-300 mt-1">Actions on this transaction will appear here.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline connector */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />
      <div className="space-y-4">
        {logs.map((log, i) => {
          const cfg = ACTION_CONFIG[log.action] || {
            icon: Activity,
            color: "text-gray-500",
            bg: "bg-gray-50",
          };
          const Icon = cfg.icon;
          const isLast = i === logs.length - 1;

          return (
            <div key={log.id} className="relative flex gap-3 pl-1">
              {/* Dot */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
              >
                <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
              </div>
              <div className="flex-1 pb-4 min-w-0">
                <p className="text-sm font-medium text-gray-800 leading-snug">
                  {log.description || log.action.replace(/_/g, " ")}
                </p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {log.actor_email && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <User className="w-3 h-3" />
                      {log.actor_email}
                    </span>
                  )}
                  {log.created_date && (
                    <span className="text-xs text-gray-400">
                      {format(parseISO(log.created_date), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
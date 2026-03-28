import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { format, parseISO } from "date-fns";
import { Bell, CheckCheck, AlertTriangle, AlertCircle, Info, Clock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SEVERITY_CONFIG = {
  critical: { label: "Critical", color: "bg-red-50 border-red-300", badge: "bg-red-100 text-red-700", icon: AlertCircle, iconColor: "text-red-500" },
  urgent:   { label: "Urgent",   color: "bg-orange-50 border-orange-300", badge: "bg-orange-100 text-orange-700", icon: AlertTriangle, iconColor: "text-orange-500" },
  warning:  { label: "Warning",  color: "bg-yellow-50 border-yellow-200", badge: "bg-yellow-100 text-yellow-700", icon: Clock, iconColor: "text-yellow-500" },
  notice:   { label: "Notice",   color: "bg-blue-50 border-blue-200",   badge: "bg-blue-100 text-blue-700",   icon: Info, iconColor: "text-blue-500" },
};

const ADDENDUM_BADGE = {
  REQUIRED:     { label: "Addendum Required", cls: "bg-red-100 text-red-700 border-red-200" },
  COMPLETED:    { label: "Addendum Done",     cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  NOT_REQUIRED: { label: "No Addendum",       cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

const SEVERITY_ORDER = { critical: 0, urgent: 1, warning: 2, notice: 3 };

export default function Notifications() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [running, setRunning] = React.useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", currentUser?.email],
    queryFn: () => base44.entities.InAppNotification.filter({ user_email: currentUser.email, dismissed: false }, "-created_date", 100),
    enabled: !!currentUser?.email,
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => base44.entities.InAppNotification.update(id, { dismissed: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.InAppNotification.update(id, { read_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleRunEngine = async () => {
    setRunning(true);
    try {
      await base44.functions.invoke("deadlineEngine", {});
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Deadline engine ran successfully");
    } catch (e) {
      toast.error("Engine failed: " + e.message);
    }
    setRunning(false);
  };

  const sorted = [...notifications].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 9;
    const sb = SEVERITY_ORDER[b.severity] ?? 9;
    return sa - sb;
  });

  const unread = notifications.filter(n => !n.read_at).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Bell className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</h1>
          {unread > 0 && (
            <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">{unread}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRunEngine} disabled={running} className="h-8 text-xs gap-1.5">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Check Deadlines
          </Button>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-gray-500"
              onClick={async () => {
                await Promise.all(notifications.filter(n => !n.read_at).map(n => markReadMutation.mutateAsync(n.id)));
              }}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No active notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(n => {
            const sev = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.notice;
            const SevIcon = sev.icon;
            const addBadge = n.addendum_status ? ADDENDUM_BADGE[n.addendum_status] : null;
            const isUnread = !n.read_at;

            return (
              <div
                key={n.id}
                className={`rounded-xl border p-4 transition-all ${sev.color} ${isUnread ? "ring-1 ring-blue-300" : ""}`}
                onClick={() => { if (isUnread) markReadMutation.mutate(n.id); }}
              >
                <div className="flex items-start gap-3">
                  <SevIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${sev.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sev.badge}`}>{sev.label}</span>
                      {addBadge && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${addBadge.cls}`}>{addBadge.label}</span>
                      )}
                      {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {n.created_date ? format(new Date(n.created_date), "MMM d, yyyy h:mm a") : ""}
                      {n.transaction_id && <span className="ml-2 opacity-60">TX: {n.transaction_id.slice(-6)}</span>}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); dismissMutation.mutate(n.id); }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-white/50 flex-shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
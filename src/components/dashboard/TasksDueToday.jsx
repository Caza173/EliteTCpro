import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, Circle, AlertTriangle, Bell, FileInput, X, Trash2 } from "lucide-react";
import { parseISO, isToday } from "date-fns";
import { getDaysUntil } from "@/utils/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "../auth/useCurrentUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const DEADLINE_LABELS = {
  earnest_money_deadline: "Earnest Money Deposit",
  inspection_deadline: "Inspection Deadline",
  due_diligence_deadline: "Due Diligence Deadline",
  appraisal_deadline: "Appraisal Deadline",
  financing_deadline: "Financing Commitment",
  closing_date: "Closing Date",
};

const DEADLINE_TASK_KEYWORDS = {
  earnest_money_deadline: ["earnest money", "emd", "deposit received"],
  inspection_deadline:    ["inspection completed", "inspection scheduled", "inspection report", "inspection"],
  due_diligence_deadline: ["due diligence", "contingency removal"],
};

function isDeadlineCompletedByTask(deadlineKey, txTasks = []) {
  const keywords = DEADLINE_TASK_KEYWORDS[deadlineKey];
  if (!keywords) return false;
  const linked = txTasks.filter(t =>
    keywords.some(kw => t.title?.toLowerCase().includes(kw.toLowerCase()))
  );
  return linked.length > 0 && linked.every(t => t.is_completed);
}

const ADDENDUM_STATUS_BADGE = {
  completed:   { label: "Addendum Done", cls: "bg-emerald-100 text-emerald-700" },
  not_needed:  { label: "Not Needed",    cls: "bg-gray-100 text-gray-500" },
  suggested:   { label: "Addendum",      cls: "bg-purple-100 text-purple-700" },
};

export default function TasksDueToday({ transactions = [], notifications = [] }) {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [localDismissed, setLocalDismissed] = useState(new Set());

  // Fetch completed tasks for deadline resolution check
  const activeIds = transactions.filter(t => t.status !== "closed" && t.status !== "cancelled").map(t => t.id);
  const { data: allTxTasks = [] } = useQuery({
    queryKey: ["allTxTasksForDeadlines", activeIds.join(",")],
    queryFn: () => base44.entities.TransactionTask.filter({ is_completed: true }),
    enabled: activeIds.length > 0,
    staleTime: 30_000,
  });

  // ── Deduplicate addendum notifications: 1 per (transaction_id + deadline_field) ──
  // Priority order: completed > not_needed > suggested > pending
  const STATUS_PRIORITY = { completed: 0, not_needed: 1, suggested: 2, pending: 3 };
  const deduplicatedNotifMap = new Map(); // key = `${txId}-${deadline_field}`
  for (const n of notifications) {
    if (!n.deadline_field || !n.transaction_id) continue;
    if (n.dismissed) continue;
    const key = `${n.transaction_id}-${n.deadline_field}`;
    const existing = deduplicatedNotifMap.get(key);
    const nPriority = STATUS_PRIORITY[n.addendum_status] ?? STATUS_PRIORITY[n.addendum_response] ?? 99;
    const ePriority = existing ? (STATUS_PRIORITY[existing.addendum_status] ?? STATUS_PRIORITY[existing.addendum_response] ?? 99) : 999;
    if (!existing || nPriority < ePriority) {
      deduplicatedNotifMap.set(key, n);
    }
  }
  const deduplicatedNotifs = Array.from(deduplicatedNotifMap.values());

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateNotifMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InAppNotification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inAppNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["deadlineNotifications"] });
    },
  });

  const logAction = async (txId, label, action, brokerageId) => {
    try {
      await base44.entities.AuditLog.create({
        brokerage_id: brokerageId,
        transaction_id: txId,
        actor_email: currentUser?.email || "unknown",
        action: `deadline_${action}`,
        entity_type: "deadline",
        description: `${action}: "${label}"`,
      });
    } catch (_) {}
  };

  // Mark addendum as completed / not_needed
  const handleAddendumAction = (e, notif, status) => {
    e.preventDefault();
    e.stopPropagation();
    updateNotifMutation.mutate({
      id: notif.id,
      data: { addendum_status: status, addendum_response: status },
    });
    if (status === "not_needed" || status === "completed") {
      setLocalDismissed(prev => new Set([...prev, `addendum-${notif.id}`]));
    }
    const tx = transactions.find(t => t.id === notif.transaction_id);
    logAction(notif.transaction_id, notif.title, status, tx?.brokerage_id);
  };

  // Dismiss a deadline item (persisted)
  const handleDismiss = (e, notif) => {
    e.preventDefault();
    e.stopPropagation();
    updateNotifMutation.mutate({
      id: notif.id,
      data: { dismissed: true, dismissed_at: new Date().toISOString() },
    });
    setLocalDismissed(prev => new Set([...prev, `addendum-${notif.id}`]));
  };

  // ── Clear all completed/dismissed/not_needed notifications ────────────────
  const clearCompletedMutation = useMutation({
    mutationFn: async () => {
      // Use backend function to batch-process — avoids frontend rate limits
      const res = await base44.functions.invoke("clearDeadlineNotifications", {});
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.cleared ?? 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inAppNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["deadlineNotifications"] });
    },
  });

  // ── Build item list ────────────────────────────────────────────────────────
  const items = [];

  // 1 — Tasks due within 2 days
  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    (tx.tasks || []).forEach((task) => {
      if (!task.completed && task.due_date) {
        const days = getDaysUntil(task.due_date);
        if (days !== null && days >= 0 && days <= 1) {
          items.push({
            key: `task-${task.id}`,
            type: "task",
            label: task.name,
            sub: tx.address,
            txId: tx.id,
            badge: days === 0 ? "Due Today" : "Due Tomorrow",
            badgeColor: days === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700",
          });
        }
      }
    });
  });

  // 2 — New deals submitted today (no tasks yet)
  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    try {
      const created = parseISO(tx.created_date);
      if (isToday(created) && (!tx.tasks || tx.tasks.length === 0)) {
        items.push({
          key: `new-deal-${tx.id}`,
          type: "new_deal",
          label: `New Deal Submitted: ${tx.address}`,
          sub: `${tx.transaction_type || "buyer"} · ${tx.agent || ""}`.trim().replace(/·\s*$/, ""),
          txId: tx.id,
          badge: "New Deal",
          badgeColor: "bg-blue-100 text-blue-700",
        });
      }
    } catch {}
  });

  // 3 — Deadline notifications (deduplicated — 1 per tx+deadline_field)
  //     Skip completed/not_needed/dismissed ones
  for (const n of deduplicatedNotifs) {
    const addendumStatus = n.addendum_status || n.addendum_response;
    if (addendumStatus === "completed" || addendumStatus === "not_needed") continue;

    const itemKey = `addendum-${n.id}`;
    if (localDismissed.has(itemKey)) continue;

    const badgeInfo = ADDENDUM_STATUS_BADGE[addendumStatus] || ADDENDUM_STATUS_BADGE.suggested;

    items.push({
      key: itemKey,
      type: "addendum",
      label: n.title || "Deadline Alert",
      sub: n.body || "",
      txId: n.transaction_id,
      notif: n,
      badge: badgeInfo.label,
      badgeColor: badgeInfo.cls,
      addendumStatus,
    });
  }

  // 4 — Approaching deadlines not covered by a notification (within 3 days, not dismissed by tasks)
  const notifDeadlineKeys = new Set(deduplicatedNotifs.map(n => `${n.transaction_id}-${n.deadline_field}`));
  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    Object.keys(DEADLINE_LABELS).forEach((field) => {
      const dateStr = tx[field];
      if (!dateStr) return;
      // Already covered by a notification
      if (notifDeadlineKeys.has(`${tx.id}-${field}`)) return;
      const days = getDaysUntil(dateStr);
      if (days === null || days < 0 || days > 3) return;
      const txCompletedTasks = allTxTasks.filter(t => t.transaction_id === tx.id);
      if (isDeadlineCompletedByTask(field, txCompletedTasks)) return;
      const key = `deadline-${tx.id}-${field}`;
      if (localDismissed.has(key)) return;
      const badge = days === 0 ? "Due Today" : days === 1 ? "Due Tomorrow" : `${days}d`;
      const badgeColor = days <= 1 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700";
      items.push({
        key,
        type: "deadline",
        label: `${DEADLINE_LABELS[field]}: ${tx.address}`,
        sub: days === 0 ? "Due Today" : days === 1 ? "Due Tomorrow" : `Due in ${days}d`,
        txId: tx.id,
        badge,
        badgeColor,
      });
    });
  });

  const ICONS = {
    task:     <Circle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
    new_deal: <FileInput className="w-4 h-4 text-blue-400 flex-shrink-0" />,
    addendum: <Bell className="w-4 h-4 text-purple-400 flex-shrink-0" />,
    deadline: <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />,
  };

  // Count clearable items from the prop (may be a subset, but good enough for display)
  const clearableCount = notifications.filter(n =>
    n.dismissed ||
    n.addendum_status === "completed" || n.addendum_status === "not_needed" ||
    n.addendum_response === "completed" || n.addendum_response === "not_needed" ||
    (n.type === "deadline" && n.dismissed)
  ).length;

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-300" />
        <p className="text-sm text-gray-400">No upcoming tasks or deadlines</p>
        {clearableCount > 0 && (
          <Button
            size="sm" variant="outline"
            className="mt-3 text-xs text-gray-500 gap-1.5"
            onClick={() => clearCompletedMutation.mutate()}
            disabled={clearCompletedMutation.isPending}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear {clearableCount} completed / not needed
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Clear all button */}
      <div className="flex justify-end">
        <Button
          size="sm" variant="ghost"
          className="h-7 text-xs text-gray-400 hover:text-gray-600 gap-1.5"
          onClick={() => clearCompletedMutation.mutate()}
          disabled={clearCompletedMutation.isPending || !currentUser?.email}
        >
          <Trash2 className="w-3 h-3" />
          {clearCompletedMutation.isPending ? "Clearing…" : `Clear ${clearableCount > 0 ? clearableCount + " " : ""}completed / not needed`}
        </Button>
      </div>

      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors group"
        >
          <Link
            to={item.txId ? `/transactions/${item.txId}` : "#"}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            {ICONS[item.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
              {item.sub && <p className="text-xs text-gray-500 truncate">{item.sub}</p>}
            </div>
          </Link>

          <Badge className={`text-xs flex-shrink-0 ${item.badgeColor}`}>{item.badge}</Badge>

          {/* Addendum actions — shown for deadline notifications */}
          {item.type === "addendum" && item.notif && (
            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleAddendumAction(e, item.notif, "completed")}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 transition-colors whitespace-nowrap"
              >
                ✓ Addendum Done
              </button>
              <button
                onClick={(e) => handleAddendumAction(e, item.notif, "not_needed")}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-colors whitespace-nowrap"
              >
                Not Needed
              </button>
              <button
                onClick={(e) => handleDismiss(e, item.notif)}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-gray-400 hover:bg-gray-100 border border-gray-200 transition-colors"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Simple dismiss for non-addendum items */}
          {item.type !== "addendum" && (
            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.preventDefault(); setLocalDismissed(p => new Set([...p, item.key])); }}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-gray-400 hover:bg-gray-100 border border-gray-200 transition-colors"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
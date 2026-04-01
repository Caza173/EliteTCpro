import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, Circle, AlertTriangle, Bell, FileInput, X } from "lucide-react";
import { differenceInHours, parseISO, isToday } from "date-fns";
import { getDaysUntil, normalizeDeadline } from "@/utils/dateUtils";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "../auth/useCurrentUser";

const DEADLINE_LABELS = {
  earnest_money_deadline: "Earnest Money Deposit",
  inspection_deadline: "Inspection Deadline",
  due_diligence_deadline: "Due Diligence Deadline",
  appraisal_deadline: "Appraisal Deadline",
  financing_deadline: "Financing Commitment",
  closing_date: "Closing Date",
};

export default function TasksDueToday({ transactions = [], notifications = [] }) {
  const items = [];
  const [dismissed, setDismissed] = useState(new Set());
  const [resolved, setResolved] = useState(new Set());
  const { data: currentUser } = useCurrentUser();

  const logAction = async (item, action) => {
    const tx = transactions.find(t => t.id === item.txId);
    try {
      await base44.entities.AuditLog.create({
        brokerage_id: tx?.brokerage_id,
        transaction_id: item.txId,
        actor_email: currentUser?.email || "unknown",
        action: `${item.type}_${action}`,
        entity_type: item.type === "deadline" ? "deadline" : "task",
        entity_id: item.key,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)}: "${item.label}"`,
      });
    } catch (_) {}
  };

  const handleDismiss = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(prev => new Set([...prev, item.key]));
    logAction(item, "dismissed");
  };

  const handleResolve = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setResolved(prev => new Set([...prev, item.key]));
    logAction(item, "resolved");
  };

  // 1 — Tasks due within 24 hours (use calendar days for consistency)
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

  // 2 — New deals submitted by agent (created today, not yet processed = no tasks)
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

  // 3 — Pending addendum requests (must have a deadline_field set, indicating a real deadline alert)
  notifications.forEach((n) => {
    if (n.addendum_response === "pending" && n.deadline_field && n.transaction_id) {
      items.push({
        key: `addendum-${n.id}`,
        type: "addendum",
        label: n.title || "Addendum Request",
        sub: n.body || "",
        txId: n.transaction_id,
        badge: "Addendum",
        badgeColor: "bg-purple-100 text-purple-700",
      });
    }
  });

  // 4 — Deadlines within 3 days that haven't been actioned
  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    Object.keys(DEADLINE_LABELS).forEach((field) => {
      const dateStr = tx[field];
      if (!dateStr) return;
      const days = getDaysUntil(dateStr);
      if (days === null || days < 0 || days > 3) return;
      const linkedTaskDone = (tx.tasks || []).some(
        (t) => t.linked_deadline === field && t.completed
      );
      if (!linkedTaskDone) {
        const badge = days === 0 ? "Due Today" : days === 1 ? "Due Tomorrow" : `${days}d`;
        const badgeColor = days === 0 ? "bg-red-100 text-red-700" : days === 1 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700";
        items.push({
          key: `deadline-${tx.id}-${field}`,
          type: "deadline",
          label: `${DEADLINE_LABELS[field]}: ${tx.address}`,
          sub: days === 0 ? "Due Today" : days === 1 ? "Due Tomorrow" : `Due in ${days}d`,
          txId: tx.id,
          badge,
          badgeColor,
        });
      }
    });
  });

  const ICONS = {
    task: <Circle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
    new_deal: <FileInput className="w-4 h-4 text-blue-400 flex-shrink-0" />,
    addendum: <Bell className="w-4 h-4 text-purple-400 flex-shrink-0" />,
    deadline: <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />,
  };

  const visibleItems = items.filter(i => !dismissed.has(i.key) && !resolved.has(i.key));

  if (visibleItems.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-300" />
        <p className="text-sm text-gray-400">No upcoming tasks or deadlines</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors group"
        >
          <Link
            to={item.txId ? `${createPageUrl("TransactionDetail")}?id=${item.txId}` : "#"}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            {ICONS[item.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
              {item.sub && <p className="text-xs text-gray-500 truncate">{item.sub}</p>}
            </div>
          </Link>
          <Badge className={`text-xs flex-shrink-0 ${item.badgeColor}`}>{item.badge}</Badge>
          {/* Action buttons — visible on hover */}
          <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            <button
              onClick={(e) => handleResolve(e, item)}
              title="Mark resolved"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" /> Resolved
            </button>
            <button
              onClick={(e) => handleDismiss(e, item)}
              title="Dismiss"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
            >
              <X className="w-3 h-3" /> Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
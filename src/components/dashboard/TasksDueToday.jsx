import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, Circle, AlertTriangle, Bell, FileInput, Clock } from "lucide-react";
import { isToday, parseISO, differenceInHours, isAfter } from "date-fns";
import { Badge } from "@/components/ui/badge";

const DEADLINE_LABELS = {
  earnest_money_deadline: "Earnest Money Deposit",
  inspection_deadline: "Inspection Deadline",
  due_diligence_deadline: "Due Diligence Deadline",
  appraisal_deadline: "Appraisal Deadline",
  financing_deadline: "Financing Commitment",
  closing_date: "Closing Date",
};

export default function TasksDueToday({ transactions = [], notifications = [] }) {
  const now = new Date();
  const items = [];

  // 1 — Tasks due within 24 hours
  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    (tx.tasks || []).forEach((task) => {
      if (!task.completed && task.due_date) {
        try {
          const deadline = parseISO(task.due_date);
          const hoursUntil = differenceInHours(deadline, now);
          const dueToday = isToday(deadline);
          if (dueToday || (hoursUntil >= 0 && hoursUntil <= 24)) {
            items.push({
              key: `task-${task.id}`,
              type: "task",
              label: task.name,
              sub: tx.address,
              txId: tx.id,
              badge: dueToday ? "Due Today" : `< ${hoursUntil}h`,
              badgeColor: dueToday ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700",
            });
          }
        } catch {}
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

  // 4 — Deadlines within 72 hours that haven't been actioned
  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    Object.keys(DEADLINE_LABELS).forEach((field) => {
      const dateStr = tx[field];
      if (!dateStr) return;
      try {
        const deadline = parseISO(dateStr);
        const hoursUntil = differenceInHours(deadline, now);
        const dueToday = isToday(deadline);
        if (dueToday || (hoursUntil > 0 && hoursUntil <= 72)) {
          const linkedTaskDone = (tx.tasks || []).some(
            (t) => t.linked_deadline === field && t.completed
          );
          if (!linkedTaskDone) {
            const badge = dueToday ? "Due Today" : hoursUntil <= 24 ? "< 24h" : "< 72h";
            const badgeColor = dueToday ? "bg-red-100 text-red-700" : hoursUntil <= 24 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700";
            items.push({
              key: `deadline-${tx.id}-${field}`,
              type: "deadline",
              label: `${DEADLINE_LABELS[field]}: ${tx.address}`,
              sub: dueToday ? "Due Today" : `Due in ${hoursUntil}h`,
              txId: tx.id,
              badge,
              badgeColor,
            });
          }
        }
      } catch {}
    });
  });

  const ICONS = {
    task: <Circle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
    new_deal: <FileInput className="w-4 h-4 text-blue-400 flex-shrink-0" />,
    addendum: <Bell className="w-4 h-4 text-purple-400 flex-shrink-0" />,
    deadline: <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />,
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-300" />
        <p className="text-sm text-gray-400">No upcoming tasks or deadlines</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.key}
          to={item.txId ? `${createPageUrl("TransactionDetail")}?id=${item.txId}` : "#"}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
        >
          {ICONS[item.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
            {item.sub && <p className="text-xs text-gray-500 truncate">{item.sub}</p>}
          </div>
          <Badge className={`text-xs flex-shrink-0 ${item.badgeColor}`}>{item.badge}</Badge>
        </Link>
      ))}
    </div>
  );
}
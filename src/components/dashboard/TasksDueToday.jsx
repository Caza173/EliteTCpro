import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import { isToday, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function TasksDueToday({ transactions = [] }) {
  const dueTodayTasks = [];

  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    (tx.tasks || []).forEach((task) => {
      if (!task.completed && task.due_date) {
        try {
          if (isToday(parseISO(task.due_date))) {
            dueTodayTasks.push({ ...task, address: tx.address, txId: tx.id });
          }
        } catch {}
      }
    });
  });

  if (dueTodayTasks.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-300" />
        <p className="text-sm text-gray-400">No tasks due today</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dueTodayTasks.map((task) => (
        <Link
          key={task.id}
          to={`${createPageUrl("TransactionDetail")}?id=${task.txId}`}
          className="flex items-center gap-3 p-3 rounded-lg border border-amber-100 bg-amber-50 hover:bg-amber-100 transition-colors"
        >
          <Circle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{task.name}</p>
            <p className="text-xs text-gray-500 truncate">{task.address}</p>
          </div>
          <Badge className="bg-amber-100 text-amber-700 text-xs flex-shrink-0">Today</Badge>
        </Link>
      ))}
    </div>
  );
}
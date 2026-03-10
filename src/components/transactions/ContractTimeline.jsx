import React from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { CheckCircle2, Circle, Clock, AlertTriangle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DEADLINE_MILESTONES = [
  { key: "contract_date", label: "Effective Date", color: "blue" },
  { key: "earnest_money_deadline", label: "Earnest Money Due", color: "indigo" },
  { key: "inspection_deadline", label: "Inspection Deadline", color: "orange", cashOk: true },
  { key: "appraisal_deadline", label: "Appraisal Deadline", color: "teal" },
  { key: "financing_deadline", label: "Financing Commitment", color: "green", cashExcluded: true },
  { key: "due_diligence_deadline", label: "Due Diligence", color: "purple" },
  { key: "closing_date", label: "Closing Date", color: "rose" },
];

const COLORS = {
  blue:   { dot: "bg-blue-500 border-blue-500",   line: "bg-blue-200",   label: "text-blue-700",   badge: "bg-blue-50 text-blue-700 border-blue-200" },
  indigo: { dot: "bg-indigo-500 border-indigo-500", line: "bg-indigo-200", label: "text-indigo-700", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  orange: { dot: "bg-orange-500 border-orange-500", line: "bg-orange-200", label: "text-orange-700", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  teal:   { dot: "bg-teal-500 border-teal-500",   line: "bg-teal-200",   label: "text-teal-700",   badge: "bg-teal-50 text-teal-700 border-teal-200" },
  green:  { dot: "bg-emerald-500 border-emerald-500", line: "bg-emerald-200", label: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  purple: { dot: "bg-purple-500 border-purple-500", line: "bg-purple-200", label: "text-purple-700", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  rose:   { dot: "bg-rose-500 border-rose-500",   line: "bg-rose-200",   label: "text-rose-700",   badge: "bg-rose-50 text-rose-700 border-rose-200" },
};

function daysLabel(dateStr) {
  if (!dateStr) return null;
  try {
    const d = differenceInCalendarDays(parseISO(dateStr), new Date());
    if (d < 0) return { label: `${Math.abs(d)}d ago`, cls: "bg-red-100 text-red-700 border-red-200" };
    if (d === 0) return { label: "Today", cls: "bg-red-100 text-red-700 border-red-200" };
    if (d <= 3) return { label: `${d}d left`, cls: "bg-orange-100 text-orange-700 border-orange-200" };
    if (d <= 7) return { label: `${d}d left`, cls: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    return { label: `${d}d left`, cls: "bg-gray-100 text-gray-500 border-gray-200" };
  } catch {
    return null;
  }
}

function formatSafe(dateStr) {
  try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return dateStr; }
}

export default function ContractTimeline({ transaction }) {
  const isCash = transaction.is_cash_transaction;
  const tasks = transaction.tasks || [];

  const milestones = DEADLINE_MILESTONES.filter((m) => {
    if (m.cashExcluded && isCash) return false;
    return transaction[m.key];
  });

  // Sort milestones chronologically
  const sorted = [...milestones].sort((a, b) => {
    try {
      return parseISO(transaction[a.key]) - parseISO(transaction[b.key]);
    } catch { return 0; }
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-10">
        <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No contract dates set. Upload a P&S or set deadlines manually.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical spine */}
      <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200 rounded-full" />

      <div className="space-y-0">
        {sorted.map((milestone, idx) => {
          const dateStr = transaction[milestone.key];
          const c = COLORS[milestone.color] || COLORS.blue;
          const urgency = daysLabel(dateStr);
          const isLast = idx === sorted.length - 1;

          // Find tasks linked to this deadline
          const linkedTasks = tasks.filter(
            (t) => t.linked_deadline === milestone.key
          );
          // Also show tasks whose due_date matches or is near this deadline (fallback)
          const nearbyTasks = tasks.filter(
            (t) =>
              !t.linked_deadline &&
              t.due_date &&
              dateStr &&
              Math.abs(differenceInCalendarDays(parseISO(t.due_date), parseISO(dateStr))) <= 3
          );
          const allLinked = [...linkedTasks, ...nearbyTasks];

          return (
            <div key={milestone.key} className={`relative ${isLast ? "" : "pb-8"}`}>
              {/* Dot */}
              <div
                className={`absolute -left-6 w-5 h-5 rounded-full border-2 ${c.dot} flex items-center justify-center z-10`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Content */}
              <div className="ml-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${c.label}`}>{milestone.label}</span>
                  <span className="text-xs text-gray-500 font-medium">{formatSafe(dateStr)}</span>
                  {urgency && (
                    <Badge className={`text-[10px] px-1.5 py-0 border ${urgency.cls}`}>
                      {urgency.label}
                    </Badge>
                  )}
                </div>

                {/* Linked tasks */}
                {allLinked.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {allLinked.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 pl-3 py-1.5 rounded-lg text-sm border ${
                          task.completed
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                            : "bg-gray-50 border-gray-100 text-gray-600"
                        }`}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={task.completed ? "line-through text-xs" : "text-xs font-medium"}>
                          {task.name}
                        </span>
                        {task.offset_days != null && task.offset_days !== 0 && (
                          <span className="text-[10px] text-gray-400 ml-auto pr-1">
                            {task.offset_days > 0 ? `+${task.offset_days}d` : `${task.offset_days}d`}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="text-[10px] text-gray-400 ml-auto pr-1">
                            {formatSafe(task.due_date)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
import React from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import {
  Calendar,
  Clock,
  DollarSign,
  Search,
  FileCheck,
  Home,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DEADLINES = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit", icon: DollarSign, color: "blue" },
  { key: "inspection_deadline", label: "Inspection Deadline", icon: Search, color: "orange" },
  { key: "due_diligence_deadline", label: "Due Diligence Deadline", icon: FileCheck, color: "purple" },
  { key: "appraisal_deadline", label: "Appraisal Deadline", icon: Clock, color: "teal" },
  { key: "financing_deadline", label: "Financing Commitment", icon: DollarSign, color: "green", cashExcluded: true },
  { key: "closing_date", label: "Closing / Transfer of Title", icon: Home, color: "red" },
];

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", icon: "text-blue-400" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", icon: "text-orange-400" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", icon: "text-purple-400" },
  teal: { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-100", icon: "text-teal-400" },
  green: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", icon: "text-emerald-400" },
  red: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", icon: "text-rose-400" },
};

function urgency(dateStr) {
  if (!dateStr) return null;
  try {
    const days = differenceInCalendarDays(parseISO(dateStr), new Date());
    if (days < 0) return { label: "Overdue", cls: "bg-red-100 text-red-700" };
    if (days === 0) return { label: "Today", cls: "bg-red-100 text-red-700" };
    if (days <= 3) return { label: `${days}d`, cls: "bg-orange-100 text-orange-700" };
    if (days <= 7) return { label: `${days}d`, cls: "bg-yellow-100 text-yellow-700" };
    return { label: `${days}d`, cls: "bg-gray-100 text-gray-600" };
  } catch {
    return null;
  }
}

export default function DeadlineDashboard({ transaction }) {
  const isCash = transaction.is_cash_transaction;

  const visibleDeadlines = DEADLINES.filter(
    (d) => !(d.cashExcluded && isCash)
  );

  return (
    <div className="space-y-3">
      {isCash && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Cash transaction — no financing commitment required
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleDeadlines.map((d) => {
          const dateStr = transaction[d.key];
          const c = COLOR_MAP[d.color];
          const u = urgency(dateStr);
          const Icon = d.icon;

          return (
            <div
              key={d.key}
              className={`flex items-center gap-3 rounded-xl border p-3.5 ${c.border} ${c.bg}`}
            >
              <div className={`w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0 border ${c.border}`}>
                <Icon className={`w-4 h-4 ${c.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">{d.label}</p>
                <p className={`text-sm font-semibold ${dateStr ? c.text : "text-gray-300 italic"}`}>
                  {dateStr
                    ? (() => { try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return "—"; } })()
                    : "Not set"}
                </p>
              </div>
              {u && (
                <Badge className={`text-[10px] font-semibold px-2 py-0.5 ${u.cls}`}>
                  {u.label}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
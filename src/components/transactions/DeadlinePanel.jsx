import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CalendarCheck, Calendar } from "lucide-react";
import { format, differenceInDays, isPast, isToday } from "date-fns";

export default function DeadlinePanel({ transactions = [] }) {
  const deadlines = [];

  const FIELDS = [
    { key: "earnest_money_deadline", label: "Earnest Money Due", type: "earnest" },
    { key: "inspection_deadline", label: "Inspection Deadline", type: "inspection" },
    { key: "due_diligence_deadline", label: "Due Diligence", type: "diligence" },
    { key: "appraisal_deadline", label: "Appraisal Deadline", type: "appraisal" },
    { key: "financing_deadline", label: "Financing Commitment", type: "financing", cashExcluded: true },
    { key: "closing_date", label: "Closing Date", type: "closing" },
  ];

  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    FIELDS.forEach((f) => {
      if (f.cashExcluded && tx.is_cash_transaction) return;
      if (tx[f.key]) {
        deadlines.push({
          id: `${tx.id}-${f.key}`,
          label: f.label,
          date: tx[f.key],
          address: tx.address,
          type: f.type,
        });
      }
    });
  });

  deadlines.sort((a, b) => new Date(a.date) - new Date(b.date));

  const getUrgencyStyle = (dateStr) => {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return { badge: "bg-red-50 text-red-700 border-red-200", icon: "text-red-500", label: "Overdue" };
    const days = differenceInDays(date, new Date());
    if (days <= 3) return { badge: "bg-amber-50 text-amber-700 border-amber-200", icon: "text-amber-500", label: `${days}d left` };
    if (days <= 7) return { badge: "bg-blue-50 text-blue-700 border-blue-200", icon: "text-blue-500", label: `${days}d left` };
    return { badge: "bg-gray-50 text-gray-600 border-gray-200", icon: "text-gray-400", label: `${days}d left` };
  };

  if (deadlines.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <CalendarCheck className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No upcoming deadlines</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {deadlines.map((dl) => {
        const urgency = getUrgencyStyle(dl.date);
        return (
          <div
            key={dl.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors bg-white"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              dl.type === "closing" ? "bg-purple-50" : dl.type === "inspection" ? "bg-orange-50" : "bg-cyan-50"
            }`}>
              {dl.type === "closing" ? (
                <Calendar className="w-4 h-4 text-purple-500" />
              ) : dl.type === "inspection" ? (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              ) : (
                <Clock className="w-4 h-4 text-cyan-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{dl.label}</p>
              <p className="text-xs text-gray-500 truncate">{dl.address}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-medium text-gray-700">
                {format(new Date(dl.date), "MMM d")}
              </p>
              <Badge variant="outline" className={`text-[10px] mt-0.5 ${urgency.badge}`}>
                {urgency.label}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, DollarSign, Search, FileCheck, Home, Clock } from "lucide-react";

const DEADLINE_TYPES = [
  { key: "earnest_money_deadline", label: "Earnest Money", color: "bg-blue-500", dot: "bg-blue-400" },
  { key: "inspection_deadline", label: "Inspection", color: "bg-orange-500", dot: "bg-orange-400" },
  { key: "due_diligence_deadline", label: "Due Diligence", color: "bg-purple-500", dot: "bg-purple-400" },
  { key: "financing_deadline", label: "Financing", color: "bg-emerald-500", dot: "bg-emerald-400" },
  { key: "closing_date", label: "Closing", color: "bg-rose-500", dot: "bg-rose-400" },
];

export default function DeadlineCalendarView({ transactions = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();

  // Deduplicate by address — keep the first encountered
  const dedupedTx = React.useMemo ? 
    React.useMemo(() => {
      const seen = new Set();
      return transactions.filter(tx => { if (seen.has(tx.address)) return false; seen.add(tx.address); return true; });
    }, [transactions]) :
    (() => { const seen = new Set(); return transactions.filter(tx => { if (seen.has(tx.address)) return false; seen.add(tx.address); return true; }); })();

  // Build events map: dateStr -> [{label, address, color}]
  const events = {};
  dedupedTx.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    DEADLINE_TYPES.forEach((dt) => {
      if (tx[dt.key] && !(dt.key === "financing_deadline" && tx.is_cash_transaction)) {
        const key = tx[dt.key];
        if (!events[key]) events[key] = [];
        events[key].push({ label: dt.label, address: tx.address, color: dt.dot, dotColor: dt.dot });
      }
    });
  });

  const prevMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-px">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
        {/* Empty cells before month start */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-gray-50 h-16 sm:h-20" />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = events[key] || [];
          const today = isToday(day);
          return (
            <div
              key={key}
              className={`bg-white h-16 sm:h-20 p-1 flex flex-col ${today ? "ring-2 ring-inset ring-blue-400" : ""}`}
            >
              <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${
                today ? "bg-blue-500 text-white" : "text-gray-700"
              }`}>
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev, i) => (
                  <div key={i} className="flex items-center gap-1 truncate" title={`${ev.label} — ${ev.address}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ev.dotColor}`} />
                    <span className="text-[9px] text-gray-600 truncate hidden sm:block">
                      {ev.label} · {ev.address?.split(",")[0]}
                    </span>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[9px] text-gray-400">+{dayEvents.length - 2} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {DEADLINE_TYPES.map((dt) => (
          <div key={dt.key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dt.dot}`} />
            <span className="text-[11px] text-gray-500">{dt.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
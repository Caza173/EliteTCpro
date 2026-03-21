import React, { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const DEADLINE_TYPES = [
  { key: "earnest_money_deadline",  label: "Earnest Money",   dot: "bg-blue-400",   pill: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "inspection_deadline",     label: "Inspection",      dot: "bg-orange-400", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "due_diligence_deadline",  label: "Due Diligence",   dot: "bg-purple-400", pill: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "appraisal_deadline",      label: "Appraisal",       dot: "bg-teal-400",   pill: "bg-teal-50 text-teal-700 border-teal-200" },
  { key: "financing_deadline",      label: "Financing",       dot: "bg-emerald-400",pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "closing_date",            label: "Closing",         dot: "bg-rose-400",   pill: "bg-rose-50 text-rose-700 border-rose-200" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DeadlineCalendarView({ transactions = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();

  const dedupedTx = useMemo(() => {
    const seen = new Set();
    return transactions.filter(tx => {
      if (seen.has(tx.address)) return false;
      seen.add(tx.address);
      return true;
    });
  }, [transactions]);

  // Build events map: dateStr -> [{label, address, dot, pill, txId}]
  const events = useMemo(() => {
    const map = {};
    dedupedTx.forEach((tx) => {
      if (tx.status === "closed" || tx.status === "cancelled") return;
      DEADLINE_TYPES.forEach((dt) => {
        if (!tx[dt.key]) return;
        if (dt.key === "financing_deadline" && tx.is_cash_transaction) return;
        const key = tx[dt.key];
        if (!map[key]) map[key] = [];
        map[key].push({ label: dt.label, address: tx.address, dot: dt.dot, pill: dt.pill, txId: tx.id });
      });
    });
    return map;
  }, [dedupedTx]);

  const selectedEvents = selectedDay ? (events[format(selectedDay, "yyyy-MM-dd")] || []) : [];

  const prevMonth = () => { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDay(null); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
          <button
            onClick={() => { setCurrentMonth(new Date()); setSelectedDay(null); }}
            className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Today
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border" style={{ background: "var(--border)", borderColor: "var(--border)" }}>
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`e-${i}`} className="h-16 sm:h-20" style={{ background: "var(--bg-tertiary)" }} />
        ))}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = events[key] || [];
          const today = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          return (
            <div
              key={key}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`h-16 sm:h-20 p-1 flex flex-col cursor-pointer transition-colors ${
                isSelected ? "ring-2 ring-inset ring-blue-500" : "hover:opacity-80"
              } ${today ? "ring-2 ring-inset ring-blue-400" : ""}`}
              style={{ background: isSelected ? "var(--accent-subtle)" : "var(--card-bg)" }}
            >
              <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 flex-shrink-0 ${
                today ? "bg-blue-500 text-white" : ""
              }`} style={{ color: today ? "white" : "var(--text-primary)" }}>
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev, i) => (
                  <div key={i} className="flex items-center gap-1 truncate" title={`${ev.label} — ${ev.address}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ev.dot}`} />
                    <span className="text-[9px] truncate hidden sm:block" style={{ color: "var(--text-secondary)" }}>
                      {ev.label} · {ev.address?.split(",")[0]}
                    </span>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[9px]" style={{ color: "var(--accent)" }}>+{dayEvents.length - 2} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {format(selectedDay, "EEEE, MMMM d")}
            </h4>
            <button onClick={() => setSelectedDay(null)} className="p-1 rounded hover:bg-gray-100">
              <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No deadlines on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev, i) => (
                <Link
                  key={i}
                  to={`${createPageUrl("TransactionDetail")}?id=${ev.txId}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:opacity-80 transition-opacity border"
                  style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{ev.address}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{ev.label}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ev.pill}`}>{ev.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {DEADLINE_TYPES.map(dt => (
          <div key={dt.key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dt.dot}`} />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{dt.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
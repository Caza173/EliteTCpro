import React, { useState, useMemo, useRef, useEffect } from "react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isToday,
  parseISO, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks,
  addDays, subDays, isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const DEADLINE_TYPES = [
  { key: "earnest_money_deadline",  label: "Earnest Money",   dot: "bg-blue-400",    pill: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "inspection_deadline",     label: "Inspection",      dot: "bg-orange-400",  pill: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "due_diligence_deadline",  label: "Due Diligence",   dot: "bg-purple-400",  pill: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "appraisal_deadline",      label: "Appraisal",       dot: "bg-teal-400",    pill: "bg-teal-50 text-teal-700 border-teal-200" },
  { key: "financing_deadline",      label: "Financing",       dot: "bg-emerald-400", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "closing_date",            label: "Closing",         dot: "bg-rose-400",    pill: "bg-rose-50 text-rose-700 border-rose-200" },
];

function useContingencies(txIds) {
  const [contingencies, setContingencies] = React.useState([]);
  const cachedTxIds = React.useRef("");
  
  React.useEffect(() => {
    if (!txIds.length) return;
    
    // Only refetch if tx list actually changed
    const newKey = txIds.sort().join(",");
    if (cachedTxIds.current === newKey) return;
    cachedTxIds.current = newKey;
    
    (async () => {
      try {
        // Fetch all contingencies once, then filter client-side
        const allConts = await base44.entities.Contingency.list(undefined, 1000);
        const filtered = allConts.filter(c => txIds.includes(c.transaction_id));
        setContingencies(filtered);
      } catch {
        setContingencies([]);
      }
    })();
  }, [txIds]);
  
  return contingencies;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VIEWS = ["month", "week", "day"];

// ── Hover Popup ───────────────────────────────────────────────────────────────
function DayHoverPopup({ day, dayEvents, dayRect, onClose }) {
  if (!dayEvents.length || !dayRect) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: dayRect.bottom + window.scrollY + 8,
        left: dayRect.left + window.scrollX,
        zIndex: 9999,
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        width: "256px",
        borderRadius: "12px",
        border: "1px solid var(--card-border)",
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
        padding: "8px 0",
        pointerEvents: "auto",
      }}
      onMouseEnter={e => e.stopPropagation()}
    >
      <div style={{ padding: "8px 12px 6px", marginBottom: "4px", borderBottom: "1px solid var(--card-border)" }}>
        <p style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-primary)" }}>
          {format(day, "EEEE, MMMM d")}
        </p>
        <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
          {dayEvents.length} deadline{dayEvents.length > 1 ? "s" : ""}
        </p>
      </div>
      <div style={{ padding: "0 8px", maxHeight: "208px", overflowY: "auto" }}>
        {dayEvents.map((ev, i) => (
          <Link
            key={i}
            to={`${createPageUrl("TransactionDetail")}?id=${ev.txId}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 8px",
              borderRadius: "6px",
              background: "var(--bg-tertiary)",
              marginBottom: "4px",
              textDecoration: "none",
              cursor: "pointer",
            }}
            onClick={onClose}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                flexShrink: 0,
                background: ev.dot.split("bg-")[1]?.split("-")[0] || "blue",
              }}
              className={ev.dot}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ev.address?.split(",")[0]}
              </p>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: 0 }}>{ev.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>,
    document.body
  );
}

// ── Day Cell (extracted to fix hooks-in-callback violation) ──────────────────
function DayCell({ day, events, selectedDay, hoveredDay, setSelectedDay, setHoveredDay }) {
  const key = format(day, "yyyy-MM-dd");
  const dayEvents = events[key] || [];
  const today = isToday(day);
  const isSelected = selectedDay && isSameDay(day, selectedDay);
  const isHovered = hoveredDay && isSameDay(day, hoveredDay);
  const dayRef = useRef(null);
  const [dayRect, setDayRect] = useState(null);

  useEffect(() => {
    if (isHovered && dayRef.current) {
      setDayRect(dayRef.current.getBoundingClientRect());
    }
  }, [isHovered]);

  return (
    <div
      ref={dayRef}
      onClick={() => setSelectedDay(isSelected ? null : day)}
      onMouseEnter={() => dayEvents.length > 0 && setHoveredDay(day)}
      onMouseLeave={() => setHoveredDay(null)}
      className={`h-16 sm:h-20 p-1 flex flex-col cursor-pointer transition-colors relative z-10 overflow-visible ${isSelected ? "ring-2 ring-inset ring-blue-500" : ""} ${today ? "ring-2 ring-inset ring-blue-400" : ""}`}
      style={{ background: isSelected ? "var(--accent-subtle)" : isHovered ? "var(--bg-hover)" : "var(--card-bg)" }}
    >
      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 flex-shrink-0 ${today ? "bg-blue-500 text-white" : ""}`}
        style={{ color: today ? "white" : "var(--text-primary)" }}>
        {format(day, "d")}
      </span>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {dayEvents.slice(0, 2).map((ev, i) => (
          <div key={i} className="flex items-center gap-1 truncate">
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
      {isHovered && (
        <DayHoverPopup
          day={day}
          dayEvents={dayEvents}
          dayRect={dayRect}
          onClose={() => setHoveredDay(null)}
        />
      )}
    </div>
  );
}

export default function DeadlineCalendarView({ transactions = [] }) {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date()); // reference date
  const [selectedDay, setSelectedDay] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [txList, setTxList] = useState(transactions);

  // Subscribe to transaction & contingency updates for real-time deadline syncing
  useEffect(() => {
    if (!transactions.length) return;
    
    const unsubTx = base44.entities.Transaction.subscribe((event) => {
      setTxList(prev => {
        if (event.type === "update") {
          return prev.map(t => t.id === event.id ? event.data : t);
        }
        return prev;
      });
    });
    
    // Also listen for contingency changes (custom deadlines) to trigger calendar refresh
    const unsubCont = base44.entities.Contingency.subscribe((event) => {
      // When a contingency is created/updated, refresh transactions to pick up new deadline
      const txId = event.data?.transaction_id;
      if (txId) {
        setTxList(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(t => t.id === txId);
          if (idx >= 0) {
            // Force re-render by shallow copy
            updated[idx] = { ...updated[idx] };
          }
          return updated;
        });
      }
    });
    
    return () => {
      unsubTx();
      unsubCont();
    };
  }, [transactions.length]);

  // Fallback to prop updates if subscription doesn't fire
  useEffect(() => {
    setTxList(transactions);
  }, [transactions]);

  const dedupedTx = useMemo(() => {
    const seen = new Set();
    return txList.filter(tx => {
      if (seen.has(tx.address)) return false;
      seen.add(tx.address);
      return true;
    });
  }, [txList]);

  // Fetch contingencies (custom deadlines) for all transactions
  const contingencies = useContingencies(dedupedTx.map(t => t.id));

  const events = useMemo(() => {
    const map = {};
    
    // System deadlines
    dedupedTx.forEach((tx) => {
      if (tx.status === "closed" || tx.status === "cancelled") return;
      DEADLINE_TYPES.forEach((dt) => {
        if (!tx[dt.key]) return;
        if (dt.key === "financing_deadline" && tx.is_cash_transaction) return;
        const key = tx[dt.key];
        if (!map[key]) map[key] = [];
        map[key].push({ label: dt.label, address: tx.address, dot: dt.dot, pill: dt.pill, txId: tx.id, category: dt.key });
      });
    });
    
    // Custom contingency deadlines
    contingencies.forEach((cont) => {
      if (!cont.due_date || !cont.is_active) return;
      const tx = dedupedTx.find(t => t.id === cont.transaction_id);
      if (!tx || tx.status === "closed" || tx.status === "cancelled") return;
      const label = cont.contingency_type === "Other" ? cont.sub_type : `${cont.contingency_type}${cont.sub_type ? ` – ${cont.sub_type}` : ""}`;
      const categoryDot = {
        Inspection: "bg-orange-400",
        Financing: "bg-emerald-400",
        Appraisal: "bg-teal-400",
        Title: "bg-purple-400",
        "Due Diligence": "bg-purple-400",
        Other: "bg-gray-400",
      }[cont.contingency_type] || "bg-gray-400";
      
      if (!map[cont.due_date]) map[cont.due_date] = [];
      map[cont.due_date].push({ label, address: tx.address, dot: categoryDot, pill: "bg-gray-50 text-gray-700 border-gray-200", txId: tx.id, category: "custom" });
    });
    
    return map;
  }, [dedupedTx, contingencies]);

  const getEventsForDay = (day) => events[format(day, "yyyy-MM-dd")] || [];

  // Navigation helpers
  const goToday = () => { setCursor(new Date()); setSelectedDay(null); };
  const goPrev = () => {
    if (view === "month") setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else if (view === "week") setCursor(d => subWeeks(d, 1));
    else setCursor(d => subDays(d, 1));
    setSelectedDay(null);
  };
  const goNext = () => {
    if (view === "month") setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else if (view === "week") setCursor(d => addWeeks(d, 1));
    else setCursor(d => addDays(d, 1));
    setSelectedDay(null);
  };

  // Title
  const title = view === "month"
    ? format(cursor, "MMMM yyyy")
    : view === "week"
      ? `${format(startOfWeek(cursor), "MMM d")} – ${format(endOfWeek(cursor), "MMM d, yyyy")}`
      : format(cursor, "EEEE, MMMM d, yyyy");

  // ── Month View ────────────────────────────────────────────────────────────────
  const MonthView = () => {
    const days = eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) });
    const startDay = startOfMonth(cursor).getDay();
    return (
      <>
        <div className="grid grid-cols-7">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
          ))}
        </div>
        <div className="relative overflow-visible">
          <div className="grid grid-cols-7 gap-px rounded-xl border overflow-visible" style={{ background: "var(--border)", borderColor: "var(--border)" }}>
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`e-${i}`} className="h-16 sm:h-20" style={{ background: "var(--bg-tertiary)" }} />
          ))}
          {days.map((day) => (
            <DayCell
              key={format(day, "yyyy-MM-dd")}
              day={day}
              events={events}
              selectedDay={selectedDay}
              hoveredDay={hoveredDay}
              setSelectedDay={setSelectedDay}
              setHoveredDay={setHoveredDay}
            />
          ))}
        </div>
        </div>
      </>
    );
  };

  // ── Week View ─────────────────────────────────────────────────────────────────
  const WeekView = () => {
    const weekStart = startOfWeek(cursor);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border)" }}>
          {weekDays.map(day => (
            <div key={day} className={`text-center py-2 ${isToday(day) ? "bg-blue-50" : ""}`}
              style={{ borderRight: "1px solid var(--border)" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{format(day, "EEE")}</p>
              <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mx-auto mt-0.5 ${isToday(day) ? "bg-blue-500 text-white" : ""}`}
                style={{ color: isToday(day) ? "white" : "var(--text-primary)" }}>
                {format(day, "d")}
              </span>
            </div>
          ))}
        </div>
        {/* Events row */}
        <div className="grid grid-cols-7 min-h-[120px]">
          {weekDays.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`p-2 cursor-pointer transition-colors ${isSelected ? "ring-2 ring-inset ring-blue-500" : "hover:bg-gray-50"}`}
                style={{ borderRight: i < 6 ? "1px solid var(--border)" : "none", background: isSelected ? "var(--accent-subtle)" : "var(--card-bg)" }}
              >
                {dayEvents.length === 0 && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>—</p>}
                {dayEvents.map((ev, j) => (
                  <Link key={j} to={`${createPageUrl("TransactionDetail")}?id=${ev.txId}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-start gap-1 mb-1.5 group"
                    title={`${ev.label} — ${ev.address}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${ev.dot}`} />
                    <span className="text-[10px] leading-tight group-hover:underline" style={{ color: "var(--text-secondary)" }}>
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{ev.label}</span><br />
                      {ev.address?.split(",")[0]}
                    </span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Day View ──────────────────────────────────────────────────────────────────
  const DayView = () => {
    const dayEvents = getEventsForDay(cursor);
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className={`px-4 py-3 border-b ${isToday(cursor) ? "bg-blue-50" : ""}`} style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{format(cursor, "EEEE, MMMM d, yyyy")}</p>
          {isToday(cursor) && <span className="text-xs text-blue-600 font-medium">Today</span>}
        </div>
        <div className="p-4 min-h-[140px]" style={{ background: "var(--card-bg)" }}>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No deadlines on this day.</p>
          ) : (
            <div className="space-y-2">
              {dayEvents.map((ev, i) => (
                <Link key={i} to={`${createPageUrl("TransactionDetail")}?id=${ev.txId}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:opacity-80 transition-opacity"
                  style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{ev.address}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ev.label}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ev.pill}`}>{ev.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedEvents = selectedDay ? (events[format(selectedDay, "yyyy-MM-dd")] || []) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
            {VIEWS.map(v => (
              <button key={v} onClick={() => { setView(v); setSelectedDay(null); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${view === v ? "bg-white shadow-sm" : "hover:opacity-70"}`}
                style={{ color: view === v ? "var(--text-primary)" : "var(--text-muted)" }}>
                {v}
              </button>
            ))}
          </div>
          {/* Nav */}
          <div className="flex gap-1">
            <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
            <button onClick={goToday} className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors" style={{ color: "var(--text-secondary)" }}>
              Today
            </button>
            <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Active view */}
      {view === "month" && <MonthView />}
      {view === "week" && <WeekView />}
      {view === "day" && <DayView />}

      {/* Selected day detail (month view only) */}
      {view === "month" && selectedDay && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{format(selectedDay, "EEEE, MMMM d")}</h4>
            <button onClick={() => setSelectedDay(null)} className="p-1 rounded hover:bg-gray-100">
              <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No deadlines on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev, i) => (
                <Link key={i} to={`${createPageUrl("TransactionDetail")}?id=${ev.txId}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:opacity-80 transition-opacity border"
                  style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
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
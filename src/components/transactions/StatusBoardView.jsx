import React from "react";
import { Link } from "react-router-dom";
import { MapPin, User, Calendar, ChevronRight } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const STATUS_COLUMNS = [
  { id: "pending",   label: "Pending",   color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.3)" },
  { id: "active",    label: "Active",    color: "#10B981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.3)" },
  { id: "closed",    label: "Closed",    color: "#64748B", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.3)" },
  { id: "cancelled", label: "Cancelled", color: "#EF4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.3)" },
];

function DealCard({ tx }) {
  const clientName = tx.buyers?.[0] || tx.buyer || tx.sellers?.[0] || tx.seller || "—";
  const daysToClose = tx.closing_date
    ? differenceInDays(parseISO(tx.closing_date), new Date())
    : null;

  return (
    <Link
      to={`/transactions/${tx.id}`}
      className="group block rounded-xl border p-3 space-y-2 transition-all hover:shadow-md"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-start gap-1.5 min-w-0">
          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
          <p className="text-xs font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
            {tx.address}
          </p>
        </div>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity mt-0.5" style={{ color: "var(--text-muted)" }} />
      </div>

      <div className="flex items-center gap-1">
        <User className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <span className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{clientName}</span>
      </div>

      {tx.closing_date && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {tx.closing_date}
            </span>
          </div>
          {daysToClose !== null && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              daysToClose < 0 ? "bg-red-100 text-red-600" :
              daysToClose < 7 ? "bg-red-50 text-red-500" :
              daysToClose < 21 ? "bg-amber-50 text-amber-600" :
              "bg-slate-100 text-slate-500"
            }`}>
              {daysToClose < 0 ? `${Math.abs(daysToClose)}d past` : `${daysToClose}d`}
            </span>
          )}
        </div>
      )}

      {tx.transaction_phase && (
        <p className="text-[10px] font-medium truncate" style={{ color: "var(--text-muted)" }}>
          {tx.transaction_phase.replace(/_/g, " ")}
        </p>
      )}
    </Link>
  );
}

export default function StatusBoardView({ transactions }) {
  const grouped = {};
  STATUS_COLUMNS.forEach(col => {
    grouped[col.id] = transactions.filter(tx => (tx.status || "pending") === col.id);
  });

  // Any status not in our columns goes to a catch-all
  const other = transactions.filter(tx => !STATUS_COLUMNS.find(c => c.id === tx.status));

  return (
    <div className="flex gap-4 h-full min-h-0 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
      {STATUS_COLUMNS.map(col => {
        const deals = grouped[col.id] || [];
        return (
          <div
            key={col.id}
            className="flex-shrink-0 flex flex-col rounded-2xl"
            style={{
              width: "280px",
              background: col.bg,
              border: `1px solid ${col.border}`,
              minHeight: "200px",
            }}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{col.label}</span>
              </div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: col.color + "22", color: col.color }}
              >
                {deals.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2" style={{ scrollbarWidth: "thin" }}>
              {deals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No {col.label.toLowerCase()} deals</p>
                </div>
              ) : (
                deals.map(tx => <DealCard key={tx.id} tx={tx} />)
              )}
            </div>
          </div>
        );
      })}

      {/* Other statuses */}
      {other.length > 0 && (
        <div
          className="flex-shrink-0 flex flex-col rounded-2xl"
          style={{
            width: "280px",
            background: "rgba(148,163,184,0.08)",
            border: "1px solid rgba(148,163,184,0.3)",
          }}
        >
          <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Other</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{other.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
            {other.map(tx => <DealCard key={tx.id} tx={tx} />)}
          </div>
        </div>
      )}
    </div>
  );
}
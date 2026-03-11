import React, { useState, useMemo } from "react";
import { differenceInCalendarDays, format, isPast, isToday, parseISO } from "date-fns";
import { AlertTriangle, Clock, ChevronDown, ChevronRight, ExternalLink, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline", label: "Earnest Money" },
  { key: "inspection_deadline", label: "Inspection" },
  { key: "due_diligence_deadline", label: "Due Diligence" },
  { key: "appraisal_deadline", label: "Appraisal" },
  { key: "financing_deadline", label: "Financing Commitment", cashExcluded: true },
  { key: "closing_date", label: "Closing" },
];

function categorizeDays(days, date) {
  if (isPast(date) && !isToday(date)) return "overdue";
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  if (days <= 14) return "upcoming";
  return null;
}

function buildDeadlineGroups(transactions) {
  const groups = {}; // txId -> { tx, deadlines: [{label, date, days, category}] }

  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;
    DEADLINE_FIELDS.forEach((f) => {
      if (f.cashExcluded && tx.is_cash_transaction) return;
      if (!tx[f.key]) return;
      const date = parseISO(tx[f.key]);
      const days = differenceInCalendarDays(date, new Date());
      const category = categorizeDays(days, date);
      if (!category) return;
      if (!groups[tx.id]) groups[tx.id] = { tx, deadlines: [] };
      groups[tx.id].deadlines.push({ label: f.label, date: tx[f.key], days, category });
    });
  });

  // Sort deadlines within each group by urgency
  Object.values(groups).forEach((g) => {
    g.deadlines.sort((a, b) => a.days - b.days);
  });

  return Object.values(groups);
}

const CATEGORY_CONFIG = {
  overdue: { label: "Overdue", color: "bg-red-500", textColor: "text-red-700", bg: "bg-red-50", border: "border-red-200", badgeClass: "bg-red-100 text-red-700" },
  today:   { label: "Due Today", color: "bg-orange-500", textColor: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", badgeClass: "bg-orange-100 text-orange-700" },
  soon:    { label: "Due in 3 Days", color: "bg-amber-400", textColor: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", badgeClass: "bg-amber-100 text-amber-700" },
  upcoming:{ label: "Upcoming (14d)", color: "bg-blue-400", textColor: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100", badgeClass: "bg-blue-100 text-blue-700" },
};

const DEADLINE_LABEL_COLOR = {
  overdue:  "text-red-600",
  today:    "text-orange-600",
  soon:     "text-amber-600",
  upcoming: "text-blue-600",
};

function TransactionDeadlineRow({ group, showLimit = false }) {
  const navigate = useNavigate();
  const { tx, deadlines } = group;

  const worstCategory = ["overdue", "today", "soon", "upcoming"].find((c) =>
    deadlines.some((d) => d.category === c)
  );
  const config = CATEGORY_CONFIG[worstCategory];

  return (
    <div
      className={`rounded-lg border cursor-pointer hover:opacity-90 transition-opacity ${config.bg} ${config.border}`}
      onClick={() => navigate(createPageUrl("TransactionDetail") + `?id=${tx.id}`)}
    >
      <div className="px-3 py-2.5 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{tx.address}</p>
          <div className="flex flex-wrap gap-x-3 mt-1">
            {deadlines.map((d, i) => (
              <span key={i} className={`text-xs font-medium ${DEADLINE_LABEL_COLOR[d.category]}`}>
                {d.label}
                {d.category === "overdue"
                  ? ` (${Math.abs(d.days)}d overdue)`
                  : d.category === "today"
                  ? " (today)"
                  : ` (${d.days}d)`}
              </span>
            ))}
          </div>
        </div>
        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-1" style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );
}

function CategorySection({ category, groups, defaultOpen = false, showLimit = 5 }) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const config = CATEGORY_CONFIG[category];
  const filtered = groups.filter((g) => g.deadlines.some((d) => d.category === category));
  // Also include groups where the WORST is this category or worse, filtered to only show relevant deadlines
  const relevant = filtered.map((g) => ({
    ...g,
    deadlines: g.deadlines.filter((d) => d.category === category),
  }));

  if (relevant.length === 0) return null;

  const visible = showAll ? relevant : relevant.slice(0, showLimit);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:opacity-80"
        style={{ background: "var(--bg-tertiary)" }}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{config.label}</span>
          <Badge className={`text-xs ${config.badgeClass} border-0`}>{relevant.length} transaction{relevant.length !== 1 ? "s" : ""}</Badge>
        </div>
        {open ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
      </button>

      {open && (
        <div className="px-3 py-3 space-y-2" style={{ background: "var(--card-bg)" }}>
          {visible.map((g) => (
            <TransactionDeadlineRow key={g.tx.id} group={g} />
          ))}
          {!showAll && relevant.length > showLimit && (
            <button
              className="w-full text-xs font-medium py-2 text-center hover:underline"
              style={{ color: "var(--accent)" }}
              onClick={() => setShowAll(true)}
            >
              Show {relevant.length - showLimit} more...
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeadlineSummaryPanel({ transactions = [], compact = false }) {
  const groups = useMemo(() => buildDeadlineGroups(transactions), [transactions]);

  const counts = useMemo(() => ({
    overdue:  groups.filter((g) => g.deadlines.some((d) => d.category === "overdue")).length,
    today:    groups.filter((g) => g.deadlines.some((d) => d.category === "today")).length,
    soon:     groups.filter((g) => g.deadlines.some((d) => d.category === "soon")).length,
    upcoming: groups.filter((g) => g.deadlines.some((d) => d.category === "upcoming")).length,
  }), [groups]);

  const hasAny = Object.values(counts).some((v) => v > 0);

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => (
          <div
            key={cat}
            className={`rounded-lg p-3 border text-center ${cfg.bg} ${cfg.border}`}
          >
            <p className={`text-2xl font-bold ${cfg.textColor}`}>{counts[cat]}</p>
            <p className={`text-xs font-medium mt-0.5 ${cfg.textColor} opacity-80`}>{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* Section groups */}
      {!hasAny ? (
        <div className="text-center py-8">
          <CalendarDays className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No urgent deadlines in the next 14 days</p>
        </div>
      ) : (
        <div className="space-y-2">
          <CategorySection category="overdue" groups={groups} defaultOpen={true} showLimit={compact ? 3 : 8} />
          <CategorySection category="today" groups={groups} defaultOpen={true} showLimit={compact ? 3 : 8} />
          <CategorySection category="soon" groups={groups} defaultOpen={false} showLimit={compact ? 3 : 8} />
          <CategorySection category="upcoming" groups={groups} defaultOpen={false} showLimit={compact ? 3 : 8} />
        </div>
      )}

      <Link to={createPageUrl("Deadlines")} className="flex items-center justify-end gap-1 text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>
        View Full Deadline Manager <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}
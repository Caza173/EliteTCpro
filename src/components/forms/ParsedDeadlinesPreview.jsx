import React from "react";
import { format, addDays, parseISO, isValid } from "date-fns";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";

const TIMELINE_ITEMS = [
  { key: "acceptance_date",           label: "Effective Date",         type: "date" },
  { key: "earnest_money_deadline",    label: "Earnest Money Due",      type: "date" },
  { key: "inspection_deadline",       label: "Inspection Deadline",    type: "date" },
  { key: "due_diligence_deadline",    label: "Due Diligence Deadline", type: "date" },
  { key: "financing_commitment_date", label: "Financing Commitment",   type: "date" },
  { key: "closing_date",              label: "Closing Date",           type: "date" },
];

function resolveDate(item, parsed) {
  if (item.type === "date") {
    const val = parsed[item.key];
    if (!val) return null;
    // Handle both ISO strings and numeric timestamps
    const d = typeof val === "number" ? new Date(val) : parseISO(String(val));
    return isValid(d) ? (typeof val === "number" ? format(d, "yyyy-MM-dd") : val) : null;
  }
  if (item.type === "offset") {
    const days = parsed[item.key];
    const anchor = parsed[item.anchor];
    if (days != null && anchor) {
      try {
        const d = addDays(parseISO(anchor), days);
        return isValid(d) ? format(d, "yyyy-MM-dd") : null;
      } catch { return null; }
    }
    return null;
  }
  return null;
}

export default function ParsedDeadlinesPreview({ parsed, isCash = false }) {
  if (!parsed) {
    console.warn("ParsedDeadlinesPreview: parsed data is undefined");
    return null;
  }
  
  const items = TIMELINE_ITEMS.filter(item => !(item.key === "financing_commitment_date" && isCash));

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(210,163,95,0.2)",
      background: "rgba(210,163,95,0.04)",
      padding: "14px 16px",
    }}>
      <p className="section-label mb-3">Transaction Timeline</p>
      <div className="space-y-2">
        {items.map((item) => {
          const dateStr = resolveDate(item, parsed);
          return (
            <div key={item.key} className="flex items-center gap-3">
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: dateStr ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${dateStr ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}>
                {dateStr
                  ? <CheckCircle2 style={{ width: 13, height: 13, color: "#22c55e" }} />
                  : <AlertCircle style={{ width: 13, height: 13, color: "var(--text-muted)" }} />
                }
              </div>
              <div className="flex-1">
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.label}</span>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: dateStr ? "var(--text-primary)" : "var(--text-muted)",
                fontStyle: dateStr ? "normal" : "italic",
              }}>
                {dateStr
                  ? (() => { const d = parseISO(dateStr); return isValid(d) ? format(d, "MMM d, yyyy") : "Invalid date"; })()
                  : "Not detected"
                }
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
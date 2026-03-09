import React from "react";
import { format, addDays, parseISO } from "date-fns";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";

const TIMELINE_ITEMS = [
  { key: "effectiveDate", label: "Effective Date", type: "date" },
  { key: "earnestMoneyDays", label: "Earnest Money Due", type: "offset", anchor: "effectiveDate" },
  { key: "inspectionDays", label: "Inspection Deadline", type: "offset", anchor: "effectiveDate" },
  { key: "dueDiligenceDays", label: "Due Diligence Deadline", type: "offset", anchor: "effectiveDate" },
  { key: "financingCommitmentDate", label: "Financing Commitment", type: "date" },
  { key: "closingDate", label: "Closing Date", type: "date" },
];

function resolveDate(item, parsed) {
  if (item.type === "date") {
    const val = parsed[item.key];
    if (!val) return null;
    try { parseISO(val); return val; } catch { return null; }
  }
  if (item.type === "offset") {
    const days = parsed[item.key];
    const anchor = parsed[item.anchor];
    if (days != null && anchor) {
      try { return format(addDays(parseISO(anchor), days), "yyyy-MM-dd"); } catch { return null; }
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
  
  const items = TIMELINE_ITEMS.filter(item => !(item.key === "financingCommitmentDate" && isCash));

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-2">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Transaction Timeline</p>
      {items.map((item, i) => {
        const dateStr = resolveDate(item, parsed);
        return (
          <div key={item.key} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              dateStr ? "bg-emerald-100" : "bg-gray-100"
            }`}>
              {dateStr
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                : <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
              }
            </div>
            {i < items.length - 1 && (
              <div className="absolute left-[1.75rem] mt-7 w-px h-5 bg-gray-200" style={{ display: "none" }} />
            )}
            <div className="flex-1">
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
            <span className={`text-xs font-medium ${dateStr ? "text-gray-800" : "text-gray-400 italic"}`}>
              {dateStr
                ? (() => { try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return "Invalid date"; } })()
                : "Not detected in contract"
              }
            </span>
          </div>
        );
      })}
    </div>
  );
}
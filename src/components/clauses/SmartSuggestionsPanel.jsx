import React from "react";
import { Zap, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PRIORITY_STYLE = {
  10: "bg-red-50 text-red-700 border-red-200",
  9:  "bg-red-50 text-red-700 border-red-200",
  8:  "bg-orange-50 text-orange-700 border-orange-200",
  7:  "bg-amber-50 text-amber-700 border-amber-200",
  6:  "bg-blue-50 text-blue-700 border-blue-200",
  5:  "bg-slate-50 text-slate-600 border-slate-200",
};
const priorityLabel = p => p >= 9 ? "Urgent" : p >= 7 ? "High" : p >= 5 ? "Medium" : "Low";

export default function SmartSuggestionsPanel({ suggestions = [], onAddClause, selectedIds = [] }) {
  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <Zap className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--accent)" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>No smart suggestions for this transaction.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map(({ clause, reason, priority }) => {
        const isAdded = selectedIds.includes(clause.id);
        const styleClass = PRIORITY_STYLE[priority] || PRIORITY_STYLE[5];
        return (
          <div
            key={clause.id}
            className="rounded-xl border p-3 transition-all"
            style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
          >
            <div className="flex items-start gap-2">
              <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{clause.name}</p>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${styleClass}`}>{priorityLabel(priority)}</Badge>
                </div>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{reason}</p>
              </div>
              <button
                onClick={() => onAddClause?.(clause)}
                disabled={isAdded}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                style={{
                  background: isAdded ? "var(--success-bg)" : "var(--accent-subtle)",
                  color: isAdded ? "var(--success)" : "var(--accent)",
                }}
              >
                {isAdded ? "✓ Added" : <><Plus className="w-3 h-3" />Add</>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
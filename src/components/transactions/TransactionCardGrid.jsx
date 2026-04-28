import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, User, Calendar, Clock, ChevronRight } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const STATUS_STYLES = {
  active:         { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending:        { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   dot: "bg-amber-500" },
  closed:         { bg: "bg-slate-100 border-slate-200",    text: "text-slate-500",   dot: "bg-slate-400" },
  cancelled:      { bg: "bg-red-50 border-red-200",         text: "text-red-700",     dot: "bg-red-500" },
  under_contract: { bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",    dot: "bg-blue-500" },
  withdrawn:      { bg: "bg-gray-50 border-gray-200",       text: "text-gray-500",    dot: "bg-gray-400" },
  expired:        { bg: "bg-orange-50 border-orange-200",   text: "text-orange-700",  dot: "bg-orange-400" },
  terminated:     { bg: "bg-red-50 border-red-200",         text: "text-red-700",     dot: "bg-red-500" },
};

const PHASE_LABELS = {
  intake: "Intake", under_contract: "Under Contract", inspection: "Inspection",
  financing: "Financing", appraisal: "Appraisal", clear_to_close: "Clear to Close",
  closing: "Closing", closed: "Closed",
};

export default function TransactionCardGrid({ transactions }) {
  if (!transactions.length) {
    return (
      <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
        <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
      {transactions.map((tx) => {
        const status = STATUS_STYLES[tx.status] || STATUS_STYLES.active;
        const daysToClose = tx.closing_date
          ? differenceInDays(parseISO(tx.closing_date), new Date())
          : null;
        const clientName = tx.buyers?.[0] || tx.buyer || tx.sellers?.[0] || tx.seller || "—";
        const phase = PHASE_LABELS[tx.transaction_phase] || tx.transaction_phase || "Intake";

        return (
          <Link
            key={tx.id}
            to={`/transactions/${tx.id}`}
            className="group block rounded-xl border transition-all hover:shadow-md"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            {/* Color bar by status */}
            <div className={`h-1 rounded-t-xl ${
              tx.status === "active" ? "bg-emerald-500" :
              tx.status === "under_contract" ? "bg-blue-500" :
              tx.status === "closed" ? "bg-slate-400" :
              tx.status === "pending" ? "bg-amber-500" :
              "bg-gray-300"
            }`} />

            <div className="p-4 space-y-3">
              {/* Address */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
                  <p className="text-sm font-semibold leading-snug truncate" style={{ color: "var(--text-primary)" }}>
                    {tx.address}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: "var(--text-muted)" }} />
              </div>

              {/* Client */}
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{clientName}</span>
              </div>

              {/* Closing date */}
              {tx.closing_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Closing {tx.closing_date}
                  </span>
                  {daysToClose !== null && (
                    <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
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

              {/* Footer: status + phase */}
              <div className="flex items-center justify-between pt-1 border-t gap-2" style={{ borderColor: "var(--border)" }}>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.bg} ${status.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {tx.status?.replace("_", " ") || "active"}
                </span>
                <span className="text-[10px] font-medium truncate" style={{ color: "var(--text-muted)" }}>
                  {phase}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
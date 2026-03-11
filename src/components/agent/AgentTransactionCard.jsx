import React from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const PHASES = [
  "Pre-Contract","Offer Drafting","Offer Accepted","Escrow Opened",
  "Inspection Period","Repair Negotiation","Appraisal Ordered",
  "Loan Processing","Clear to Close","Final Walkthrough","Closing","Post Closing"
];

const STATUS_STYLES = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  closed:    "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function AgentTransactionCard({ tx }) {
  const navigate = useNavigate();
  const status = tx.status || "active";
  const phase = tx.phase || 1;

  return (
    <div
      onClick={() => navigate(createPageUrl("TransactionDetail") + `?id=${tx.id}`)}
      className="cursor-pointer rounded-xl border p-5 space-y-4 hover:shadow-md transition-all duration-200"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-snug truncate" style={{ color: "var(--text-primary)" }}>
            {tx.address}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="outline" className={`text-[11px] capitalize ${STATUS_STYLES[status]}`}>
              {status}
            </Badge>
            <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200">
              Phase {phase}: {PHASES[phase - 1] || "—"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-gray-400 mb-0.5 flex items-center gap-1"><User className="w-3 h-3" /> Buyer</p>
          <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {(tx.buyers || []).join(", ") || tx.buyer || "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5 flex items-center gap-1"><User className="w-3 h-3" /> Seller</p>
          <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {(tx.sellers || []).join(", ") || tx.seller || "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Contract</p>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
            {tx.contract_date ? format(new Date(tx.contract_date), "MMM d, yyyy") : "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Closing</p>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
            {tx.closing_date ? format(new Date(tx.closing_date), "MMM d, yyyy") : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
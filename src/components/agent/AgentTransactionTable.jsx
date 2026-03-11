import React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";

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

const COLS = [
  { key: "address",       label: "Address" },
  { key: "status",        label: "Status" },
  { key: "phase",         label: "Phase" },
  { key: "buyer",         label: "Buyer" },
  { key: "seller",        label: "Seller" },
  { key: "contract_date", label: "Contract Date" },
  { key: "closing_date",  label: "Closing Date" },
];

export default function AgentTransactionTable({ transactions, sortKey, sortDir, onSort }) {
  const navigate = useNavigate();

  const fmtDate = (d) => d ? format(new Date(d), "MMM d, yyyy") : "—";

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--table-header-bg)" }}>
            {COLS.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
                style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--table-border)" }}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  <ArrowUpDown className={`w-3 h-3 ${sortKey === col.key ? "opacity-80" : "opacity-30"}`} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => {
            const status = tx.status || "active";
            const phase = tx.phase || 1;
            const buyer = (tx.buyers || []).join(", ") || tx.buyer || "—";
            const seller = (tx.sellers || []).join(", ") || tx.seller || "—";
            return (
              <tr
                key={tx.id}
                onClick={() => navigate(createPageUrl("TransactionDetail") + `?id=${tx.id}`)}
                className="cursor-pointer transition-colors"
                style={{
                  borderBottom: i < transactions.length - 1 ? "1px solid var(--table-border)" : "none",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--table-row-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = ""}
              >
                <td className="px-4 py-3 font-medium max-w-[180px] truncate" style={{ color: "var(--text-primary)" }}>
                  {tx.address}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-[11px] capitalize ${STATUS_STYLES[status]}`}>
                    {status}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-medium">{phase}.</span> {PHASES[phase - 1] || "—"}
                </td>
                <td className="px-4 py-3 max-w-[140px] truncate" style={{ color: "var(--text-primary)" }}>{buyer}</td>
                <td className="px-4 py-3 max-w-[140px] truncate" style={{ color: "var(--text-primary)" }}>{seller}</td>
                <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--text-secondary)" }}>{fmtDate(tx.contract_date)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--text-secondary)" }}>{fmtDate(tx.closing_date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-10">No transactions match your search.</p>
      )}
    </div>
  );
}
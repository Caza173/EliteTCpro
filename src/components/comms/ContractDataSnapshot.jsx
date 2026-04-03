import React, { useState } from "react";
import { ChevronDown, ChevronUp, Database } from "lucide-react";
import { format } from "date-fns";

const FIELD_LABELS = {
  buyer_name: "Buyer",
  seller_name: "Seller",
  property_address: "Property Address",
  purchase_price: "Purchase Price",
  closing_date: "Closing Date",
  earnest_money_amount: "Earnest Money Amount",
  earnest_money_due_date: "EMD Due Date",
  inspection_deadline: "Inspection Deadline",
  financing_deadline: "Financing Deadline",
  due_diligence_deadline: "Due Diligence Deadline",
  buyer_agent_name: "Buyer's Agent",
  listing_agent_name: "Listing Agent",
  lender_name: "Lender",
  title_company: "Title Company",
  tc_name: "Transaction Coordinator",
};

function fmtVal(key, val) {
  if (!val) return "—";
  if (typeof val === "number" && (key.includes("price") || key.includes("amount"))) {
    return "$" + val.toLocaleString("en-US");
  }
  if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/)) {
    try { return format(new Date(val), "MMM d, yyyy"); } catch { return val; }
  }
  return String(val);
}

export default function ContractDataSnapshot({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;

  const entries = Object.entries(FIELD_LABELS).map(([key, label]) => ({
    key, label, value: data[key],
  }));

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
      <button
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-xl"
        onClick={() => setOpen(o => !o)}
      >
        <Database className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <span className="text-sm font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
          Contract Data Used for Generation
        </span>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3 grid grid-cols-2 gap-x-6 gap-y-2" style={{ borderColor: "var(--card-border)" }}>
          {entries.map(({ key, label, value }) => (
            <div key={key}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
              <p className={`text-sm font-medium ${!value ? "opacity-40" : ""}`} style={{ color: "var(--text-primary)" }}>
                {fmtVal(key, value)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
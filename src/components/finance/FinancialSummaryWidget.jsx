import React from "react";
import { DollarSign, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const fmt = (n) =>
  n != null && n > 0
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
    : "—";

export default function FinancialSummaryWidget({ transaction }) {
  const { data: financeRecords = [] } = useQuery({
    queryKey: ["finance", transaction.id],
    queryFn: () => base44.entities.TransactionFinance.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
    staleTime: 60_000,
  });

  const finance = financeRecords[0];
  const salePrice = finance?.sale_price || transaction?.sale_price;

  // Try to get commission structure for split breakdown
  let structure = null;
  if (finance?.commission_structure) {
    try {
      structure = typeof finance.commission_structure === "string"
        ? JSON.parse(finance.commission_structure)
        : finance.commission_structure;
    } catch {}
  }

  const calcSideAmt = (side) => {
    if (!side?.amount || !salePrice) return 0;
    const base = side.gross_or_net === "net" ? salePrice - (side.net_deduction || 0) : salePrice;
    return side.calculation_type === "percentage" ? base * (side.amount / 100) : side.amount;
  };

  const listingEst = structure ? calcSideAmt(structure.listing_side) : 0;
  const buyerEst = structure ? calcSideAmt(structure.buyer_side) : 0;
  const grossCommission = finance?.gross_commission || (listingEst + buyerEst) || null;
  const totalCredits = structure
    ? (structure.seller_credit_amount || 0) + (structure.repair_credit_amount || 0) + (structure.closing_cost_credit_amount || 0)
    : 0;

  const items = [
    { label: "Sale Price", value: fmt(salePrice), highlight: true },
    { label: "Listing Side", value: listingEst > 0 ? fmt(listingEst) : (finance?.gross_commission ? fmt(finance.gross_commission) : "—") },
    { label: "Buyer Side", value: buyerEst > 0 ? fmt(buyerEst) : "—" },
    { label: "Credits", value: totalCredits > 0 ? `-${fmt(totalCredits)}` : "—" },
    { label: "Est. Brokerage Gross", value: fmt(grossCommission), highlight: true },
  ];

  if (!salePrice && !grossCommission) return null;

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Financial Summary
        </p>
      </div>
      <div className="space-y-1.5">
        {items.map(({ label, value, highlight }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span
              className={`text-xs font-semibold tabular-nums ${highlight ? "text-emerald-600" : ""}`}
              style={!highlight ? { color: "var(--text-primary)" } : {}}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
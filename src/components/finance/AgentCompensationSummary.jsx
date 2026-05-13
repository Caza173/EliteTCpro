import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function AgentRow({ role, name, brokerage, amount, pct }) {
  if (!amount || amount === 0) return null;
  return (
    <div className="flex items-start justify-between py-3 border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
      <div>
        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{name || "—"}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {role} {brokerage ? `· ${brokerage}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-emerald-600">{fmt(amount)}</p>
        {pct > 0 && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{pct.toFixed(2)}%</p>}
      </div>
    </div>
  );
}

export default function AgentCompensationSummary({ transaction, financeData }) {
  const salePrice = financeData?.sale_price || transaction?.sale_price || 0;

  let structure = null;
  if (financeData?.commission_structure) {
    try {
      structure = typeof financeData.commission_structure === "string"
        ? JSON.parse(financeData.commission_structure)
        : financeData.commission_structure;
    } catch {}
  }

  const calcAmt = (side) => {
    if (!side?.amount || !salePrice) return 0;
    const base = side.gross_or_net === "net" ? salePrice - (side.net_deduction || 0) : salePrice;
    return side.calculation_type === "percentage" ? base * (side.amount / 100) : side.amount;
  };

  const listingAmt = structure ? calcAmt(structure.listing_side) : 0;
  const buyerAmt = structure ? calcAmt(structure.buyer_side) : (financeData?.gross_commission || 0);

  const agents = [
    {
      role: "Listing Agent",
      name: structure?.listing_side?.agent_name || transaction?.sellers_agent_name || "",
      brokerage: structure?.listing_side?.brokerage_name || transaction?.seller_brokerage || "",
      amount: listingAmt,
      pct: salePrice > 0 ? (listingAmt / salePrice) * 100 : 0,
    },
    {
      role: "Buyer Agent",
      name: structure?.buyer_side?.agent_name || transaction?.buyers_agent_name || transaction?.agent || "",
      brokerage: structure?.buyer_side?.brokerage_name || transaction?.buyer_brokerage || "",
      amount: buyerAmt,
      pct: salePrice > 0 ? (buyerAmt / salePrice) * 100 : 0,
    },
  ].filter(a => a.amount > 0 || a.name);

  const total = listingAmt + buyerAmt;

  if (agents.length === 0 && total === 0) return null;

  return (
    <Card className="border shadow-sm" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Users className="w-4 h-4 text-indigo-500" /> Agent Compensation Summary
          </CardTitle>
          {total > 0 && (
            <span className="text-xs font-semibold text-indigo-600">{fmt(total)}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {agents.map((a, i) => (
          <AgentRow key={i} {...a} />
        ))}
        {salePrice > 0 && total > 0 && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--bg-tertiary)" }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--text-muted)" }}>Total Commission as % of Sale</span>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                {((total / salePrice) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min((total / salePrice) * 100 * 5, 100)}%` }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
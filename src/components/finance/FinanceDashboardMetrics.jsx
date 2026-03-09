import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, BarChart3, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function MetricCard({ label, value, sub, icon: Icon, color }) {
  return (
    <Card className="shadow-sm border-gray-100">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color || "text-gray-900"}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color ? "bg-opacity-10" : "bg-gray-50"}`} style={{ backgroundColor: "rgba(59,130,246,0.08)" }}>
            <Icon className="w-4 h-4 text-blue-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanceDashboardMetrics({ transactions }) {
  const { data: allFinance = [] } = useQuery({
    queryKey: ["allFinance"],
    queryFn: () => base44.entities.TransactionFinance.list(),
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["allExpenses"],
    queryFn: () => base44.entities.DealExpense.list(),
  });

  const pendingTx = transactions.filter((t) => t.status === "active" || t.status === "pending");
  const closedTx = transactions.filter((t) => t.status === "closed");

  const getFinance = (txId) => allFinance.find((f) => f.transaction_id === txId);
  const getTxExpenses = (txId) => allExpenses.filter((e) => e.transaction_id === txId).reduce((s, e) => s + (e.amount || 0), 0);

  const calcNet = (txId) => {
    const f = getFinance(txId);
    if (!f) return 0;
    const gross = f.gross_commission || 0;
    const referral = f.referral_amount || 0;
    const afterReferral = gross - referral;
    const brokerSplit = afterReferral * ((f.broker_split_percent || 0) / 100);
    const agentAfterSplit = afterReferral - brokerSplit;
    const franchiseFee = agentAfterSplit * ((f.franchise_fee_percent || 0) / 100);
    const fees = (f.transaction_fee || 0) + (f.eo_fee || 0) + (f.other_brokerage_fees || 0);
    const expenses = getTxExpenses(txId);
    return agentAfterSplit - franchiseFee - fees - expenses;
  };

  const grossPending = pendingTx.reduce((s, t) => s + (getFinance(t.id)?.gross_commission || 0), 0);
  const netPending = pendingTx.reduce((s, t) => s + calcNet(t.id), 0);
  const grossClosed = closedTx.reduce((s, t) => s + (getFinance(t.id)?.gross_commission || 0), 0);
  const netClosed = closedTx.reduce((s, t) => s + calcNet(t.id), 0);
  const totalExpenses = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const avgCommission = allFinance.length > 0
    ? allFinance.reduce((s, f) => s + (f.gross_commission || 0), 0) / allFinance.length
    : 0;
  const avgSalePrice = allFinance.length > 0
    ? allFinance.reduce((s, f) => s + (f.sale_price || 0), 0) / allFinance.length
    : 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-emerald-500" /> Financial Overview
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Pending Deals" value={pendingTx.length} sub="active + pending" icon={Briefcase} />
        <MetricCard label="Closed Deals" value={closedTx.length} sub="YTD" icon={BarChart3} />
        <MetricCard label="Net Income Pending" value={fmt(netPending)} sub="projected" icon={TrendingUp} color="text-emerald-600" />
        <MetricCard label="Net Income Closed" value={fmt(netClosed)} sub="YTD" icon={DollarSign} color="text-blue-600" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Gross Pending" value={fmt(grossPending)} icon={DollarSign} />
        <MetricCard label="Gross Closed YTD" value={fmt(grossClosed)} icon={DollarSign} />
        <MetricCard label="Total Deal Expenses" value={fmt(totalExpenses)} icon={TrendingUp} color="text-rose-600" />
        <MetricCard label="Avg Commission" value={fmt(avgCommission)} sub={`avg sale: ${fmt(avgSalePrice)}`} icon={BarChart3} />
      </div>
    </div>
  );
}
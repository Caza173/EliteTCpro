import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";

const TC_FEE = 350;
const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function MetricCard({ label, value, sub, icon: IconComp, color }) {
  return (
    <Card className="shadow-sm border-gray-100">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color || "text-gray-900"}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.08)" }}>
            <IconComp className="w-4 h-4 text-blue-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanceDashboardMetrics({ transactions }) {
  const closedTx = transactions.filter((t) => t.status === "closed");
  const activeTx = transactions.filter((t) => t.status === "active" || t.status === "pending");

  const earnedIncome = closedTx.length * TC_FEE;
  const projectedIncome = activeTx.length * TC_FEE;
  const totalProjected = earnedIncome + projectedIncome;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-emerald-500" /> TC Income Tracker
        <span className="text-xs font-normal text-gray-400 ml-1">${TC_FEE}/transaction</span>
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Closed Transactions"
          value={closedTx.length}
          sub="all time"
          icon={CheckCircle}
        />
        <MetricCard
          label="Income Earned"
          value={fmt(earnedIncome)}
          sub={`${closedTx.length} closed × $${TC_FEE}`}
          icon={DollarSign}
          color="text-emerald-600"
        />
        <MetricCard
          label="Active Transactions"
          value={activeTx.length}
          sub="in progress"
          icon={Clock}
        />
        <MetricCard
          label="Projected Income"
          value={fmt(totalProjected)}
          sub={`${activeTx.length} active + ${closedTx.length} closed`}
          icon={TrendingUp}
          color="text-blue-600"
        />
      </div>
    </div>
  );
}
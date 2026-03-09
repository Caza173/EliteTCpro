import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function Row({ label, value, deduction, sub, highlight }) {
  return (
    <div className={`flex items-center justify-between py-2 ${sub ? "pl-4 border-l-2 border-gray-100" : ""} ${highlight ? "border-t border-gray-200 mt-1 pt-3" : ""}`}>
      <span className={`text-sm ${sub ? "text-gray-500" : "text-gray-700 font-medium"}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${deduction ? "text-red-500" : highlight ? "text-blue-700 text-base" : "text-gray-900"}`}>
        {deduction ? `- ${fmt(value)}` : fmt(value)}
      </span>
    </div>
  );
}

export default function CommissionBreakdown({ computed, form }) {
  const { gross, referralAmt, afterReferral, brokerSplitAmt, agentAfterSplit, franchiseFeeAmt, txFee, eoFee, otherFees, professionalFeeAmt, sellerConcessionAmt, netBeforeExpenses } = computed;
  const grossPct = gross > 0 ? 100 : 0;
  const agentPct = gross > 0 ? Math.round((agentAfterSplit / gross) * 100) : 0;

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" /> Commission Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calculation waterfall */}
          <div className="divide-y divide-gray-50">
            <Row label="Gross Commission" value={gross} />
            {referralAmt > 0 && <Row label={`Referral (${form.referral_percent}%)`} value={referralAmt} deduction sub />}
            {referralAmt > 0 && <Row label="Remaining Commission" value={afterReferral} />}
            <Row label={`Broker Split (${form.broker_split_percent}%)`} value={brokerSplitAmt} deduction sub />
            <Row label="Agent Commission After Split" value={agentAfterSplit} />
            {franchiseFeeAmt > 0 && <Row label={`Franchise Fee (${form.franchise_fee_percent}%)`} value={franchiseFeeAmt} deduction sub />}
            {txFee > 0 && <Row label="Transaction Fee" value={txFee} deduction sub />}
            {eoFee > 0 && <Row label="E&O Fee" value={eoFee} deduction sub />}
            {otherFees > 0 && <Row label="Other Brokerage Fees" value={otherFees} deduction sub />}
            <Row label="Net Commission (Before Expenses)" value={netBeforeExpenses} highlight />
          </div>

          {/* Visual bars */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Agent Share vs. Gross</p>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Gross Commission</span>
                <span>{fmt(gross)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>After Broker Split</span>
                <span>{fmt(agentAfterSplit)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${gross > 0 ? (agentAfterSplit / gross) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Net Before Expenses</span>
                <span>{fmt(netBeforeExpenses)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${gross > 0 ? (netBeforeExpenses / gross) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Agent keeps</p>
              <p className="text-2xl font-bold text-emerald-600">{agentPct}%</p>
              <p className="text-xs text-gray-400">of gross commission after broker split</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { TrendingUp, Users } from "lucide-react";

const PHASES = [
  "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
  "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
  "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing"
];

const BAR_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#14b8a6", "#06b6d4", "#f97316", "#ef4444", "#84cc16", "#a855f7"];

export default function TCAnalyticsDashboard({ transactions = [] }) {
  // --- Avg Closing Time (contract_date → closing_date for closed txns) ---
  const avgClosingDays = useMemo(() => {
    const closed = transactions.filter(
      (t) => t.status === "closed" && t.contract_date && t.closing_date
    );
    if (!closed.length) return null;
    const total = closed.reduce((sum, t) => {
      const days = differenceInCalendarDays(parseISO(t.closing_date), parseISO(t.contract_date));
      return sum + (days > 0 ? days : 0);
    }, 0);
    return Math.round(total / closed.length);
  }, [transactions]);

  // --- Active transactions per agent ---
  const perAgent = useMemo(() => {
    const active = transactions.filter((t) => t.status === "active");
    const map = {};
    active.forEach((t) => {
      const name = t.agent || "Unassigned";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([agent, count]) => ({ agent: agent.split(" ")[0], fullName: agent, count }))
      .sort((a, b) => b.count - a.count);
  }, [transactions]);

  // --- Bottleneck phases (how many active txns are stuck at each phase) ---
  const bottleneckData = useMemo(() => {
    const active = transactions.filter((t) => t.status === "active");
    const counts = Array(12).fill(0);
    active.forEach((t) => {
      const p = (t.phase || 1) - 1;
      if (p >= 0 && p < 12) counts[p]++;
    });
    return PHASES.map((name, i) => ({ phase: name, count: counts[i] }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [transactions]);

  const topBottleneck = bottleneckData[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-indigo-500" />
        <h2 className="text-base font-semibold text-gray-800">Brokerage Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Avg Closing Time */}
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Avg. Closing Time</CardTitle>
          </CardHeader>
          <CardContent>
            {avgClosingDays !== null ? (
              <div>
                <p className="text-4xl font-bold text-gray-900">{avgClosingDays}</p>
                <p className="text-sm text-gray-500 mt-1">days from contract to close</p>
                <p className="text-xs text-gray-400 mt-2">
                  Based on {transactions.filter(t => t.status === "closed" && t.contract_date && t.closing_date).length} closed transactions
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-20 text-center">
                <p className="text-sm text-gray-400">No closed transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Txns per Agent */}
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-sm font-semibold text-gray-600">Active Txns per Agent</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {perAgent.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-4">No active transactions</p>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={perAgent} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="agent" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val, _, props) => [val, props.payload.fullName]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {perAgent.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
import React from "react";
import { FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export default function DashboardStats({ transactions = [] }) {
  const stats = [
    {
      label: "Total Transactions",
      value: transactions.length,
      icon: FileText,
      color: "blue",
    },
    {
      label: "Active",
      value: transactions.filter((t) => t.status === "active").length,
      icon: Clock,
      color: "emerald",
    },
    {
      label: "Closed",
      value: transactions.filter((t) => t.status === "closed").length,
      icon: CheckCircle,
      color: "slate",
    },
    {
      label: "Pending",
      value: transactions.filter((t) => t.status === "pending").length,
      icon: AlertTriangle,
      color: "amber",
    },
  ];

  const colorMap = {
    blue: { bg: "bg-blue-50", icon: "text-blue-500", text: "text-blue-700" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-500", text: "text-emerald-700" },
    slate: { bg: "bg-slate-50", icon: "text-slate-500", text: "text-slate-700" },
    amber: { bg: "bg-amber-50", icon: "text-amber-500", text: "text-amber-700" },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const colors = colorMap[stat.color];
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
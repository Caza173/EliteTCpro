import React from "react";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

const CONFIG = {
  READY:   { icon: ShieldCheck, label: "Ready to Send",       cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  PARTIAL: { icon: ShieldAlert, label: "Partial – Missing Data", cls: "bg-amber-50 border-amber-200 text-amber-700" },
  BLOCKED: { icon: ShieldX,     label: "Blocked – Missing Data", cls: "bg-red-50 border-red-200 text-red-700" },
};

export default function CommPreflightBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG.BLOCKED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}
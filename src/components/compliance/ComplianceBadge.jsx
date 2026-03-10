import React from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";

export default function ComplianceBadge({ report, scanning = false, size = "sm" }) {
  if (scanning) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Scanning…
      </span>
    );
  }

  if (!report) return null;

  const cfg = {
    compliant: { icon: ShieldCheck, label: "Compliant", cls: "text-emerald-600" },
    warnings:  { icon: ShieldAlert, label: `${report.warnings?.length || 0} Warning${(report.warnings?.length || 0) !== 1 ? "s" : ""}`, cls: "text-amber-500" },
    blockers:  { icon: ShieldX,    label: `${report.blockers?.length || 0} Blocker${(report.blockers?.length || 0) !== 1 ? "s" : ""}`, cls: "text-red-500" },
  };

  const { icon: Icon, label, cls } = cfg[report.status] || cfg.compliant;
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${cls} ${textSize}`}>
      <Icon className={iconSize} />
      {label}
    </span>
  );
}
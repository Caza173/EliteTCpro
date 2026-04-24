/**
 * AutoPlacementBadge
 * Shows the detected signature placement mode and summary inline in the send modal.
 */
import React from "react";
import { Zap, Search, AlertCircle, Loader2 } from "lucide-react";

const MODE_CONFIG = {
  ai: {
    icon: Zap,
    label: "AI-detected",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  pattern: {
    icon: Search,
    label: "Pattern-matched",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  fallback: {
    icon: AlertCircle,
    label: "Standard block",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
};

export default function AutoPlacementBadge({ status }) {
  if (!status) return null;

  if (status === "detecting") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs bg-slate-50 border-slate-200 text-slate-600">
        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        Detecting signature fields…
      </div>
    );
  }

  const cfg = MODE_CONFIG[status.placement_mode] || MODE_CONFIG.fallback;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="font-semibold">{cfg.label}:</span>{" "}
        {status.summary
          ? `${status.summary} across ${status.zones_detected?.length ?? 0} zone(s)`
          : status.message}
        {status.placement_mode === "fallback" && (
          <p className="mt-0.5 opacity-80">
            Signature blocks will be appended — no manual tagging needed.
          </p>
        )}
      </div>
    </div>
  );
}
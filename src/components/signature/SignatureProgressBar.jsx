/**
 * SignatureProgressBar
 * Shows signing progress: "2 / 3 Signed" with a progress bar.
 */
import React from "react";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export default function SignatureProgressBar({ completed, total, status, compact = false }) {
  const percent = Math.round((completed / Math.max(total, 1)) * 100);

  const isComplete = status === "completed";
  const needsAttention = ["declined", "expired", "error"].includes(status);

  const barColor = isComplete
    ? "bg-emerald-500"
    : needsAttention
      ? "bg-red-500"
      : "bg-blue-500";

  const textColor = isComplete
    ? "text-emerald-600"
    : needsAttention
      ? "text-red-600"
      : "text-blue-600";

  const Icon = isComplete ? CheckCircle2 : needsAttention ? AlertTriangle : Clock;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${textColor}`} />
        <span className={`text-xs font-semibold ${textColor}`}>{completed} / {total} Signed</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${textColor}`} />
          <span className={`text-xs font-semibold ${textColor}`}>{completed} / {total} Signed</span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-tertiary)" }}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
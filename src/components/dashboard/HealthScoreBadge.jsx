import React from "react";
import { RISK_STYLES } from "../utils/tenantUtils";
import { Badge } from "@/components/ui/badge";

export default function HealthScoreBadge({ healthScore, riskLevel }) {
  const style = RISK_STYLES[riskLevel] || RISK_STYLES.on_track;
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-8 h-8 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            stroke={riskLevel === "on_track" ? "#10b981" : riskLevel === "watch" ? "#f59e0b" : "#ef4444"}
            strokeWidth="3"
            strokeDasharray={`${(healthScore / 100) * 94.25} 94.25`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700">
          {healthScore}
        </span>
      </div>
      <Badge variant="outline" className={`text-xs ${style.className}`}>{style.label}</Badge>
    </div>
  );
}
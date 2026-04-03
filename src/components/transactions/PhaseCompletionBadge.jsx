import React, { useState } from "react";
import { CheckCircle2, Mail, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PhaseCompletionBadge({ transaction, phaseNumber }) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  
  const phaseEmailKey = `phase_${phaseNumber}_email_sent`;
  const isPhaseEmailSent = transaction[phaseEmailKey];
  
  if (!isPhaseEmailSent) return null;

  const phaseName = {
    1: "Under Contract",
    2: "Due Diligence",
    3: "Financing",
    4: "Closing",
    5: "Post-Close"
  }[phaseNumber] || `Phase ${phaseNumber}`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <span className="text-xs font-semibold text-emerald-700">Phase Complete</span>
      <Button
        size="sm"
        variant="ghost"
        className="h-5 px-1.5 text-[10px] text-emerald-600 hover:bg-emerald-100"
        onClick={() => setSummaryOpen(!summaryOpen)}
      >
        <Eye className="w-3 h-3 mr-0.5" /> View
      </Button>
      <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
        <Mail className="w-3 h-3" /> Sent
      </div>

      {summaryOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 rounded-lg border shadow-lg p-3 bg-white border-emerald-200 text-xs text-gray-700 max-w-xs">
          <p className="font-semibold text-emerald-700 mb-1">{phaseName} Complete</p>
          <p>Client summaries have been sent for this phase completion.</p>
        </div>
      )}
    </div>
  );
}
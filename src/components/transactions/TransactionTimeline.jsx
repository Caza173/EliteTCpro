import React from "react";
import { Check, Circle } from "lucide-react";

// TC phases only — 1 & 2 are agent-side. Phase 3 includes escrow, Phase 5 includes repair.
const TIMELINE_PHASES = [
  { num: 3, label: "Offer Accepted & Escrow" },
  { num: 5, label: "Inspection & Repair" },
  { num: 7, label: "Appraisal" },
  { num: 8, label: "Loan Processing" },
  { num: 9, label: "Clear to Close" },
  { num: 10, label: "Final Walkthrough" },
  { num: 11, label: "Closing" },
  { num: 12, label: "Post Closing" },
];

export default function TransactionTimeline({ phasesCompleted = [], currentPhase = 1 }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-max px-2 py-2">
        {TIMELINE_PHASES.map((phase, index) => {
          const isCompleted = phasesCompleted.includes(phase.num);
          const isCurrent = phase.num === currentPhase ||
            (!phasesCompleted.includes(phase.num) && 
             index > 0 &&
             phasesCompleted.includes(TIMELINE_PHASES[index - 1]?.num));
          const isUpcoming = !isCompleted && !isCurrent;
          const isLast = index === TIMELINE_PHASES.length - 1;

          return (
            <div key={phase.num} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                {/* Circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500"
                      : isCurrent
                      ? "bg-blue-500 border-blue-500"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : isCurrent ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
                {/* Label */}
                <span
                  className={`text-[11px] font-medium text-center max-w-[72px] leading-tight ${
                    isCompleted ? "text-emerald-600" : isCurrent ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  {phase.label}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={`h-0.5 w-12 mx-1 mb-5 flex-shrink-0 rounded-full ${
                    isCompleted ? "bg-emerald-400" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";

const PHASES = [
  { num: 1, label: "Pre-Contract" },
  { num: 2, label: "Offer Drafting" },
  { num: 3, label: "Offer Accepted" },
  { num: 4, label: "Escrow Opened" },
  { num: 5, label: "Inspection Period" },
  { num: 6, label: "Repair Negotiation" },
  { num: 7, label: "Appraisal Ordered" },
  { num: 8, label: "Loan Processing" },
  { num: 9, label: "Clear to Close" },
  { num: 10, label: "Final Walkthrough" },
  { num: 11, label: "Closing" },
  { num: 12, label: "Post Closing" },
];

export default function PhaseChecklist({ phasesCompleted = [], currentPhase, onTogglePhase }) {
  return (
    <div className="space-y-1">
      {PHASES.map((phase) => {
        const isCompleted = phasesCompleted.includes(phase.num);
        const isCurrent = phase.num === currentPhase;

        return (
          <div
            key={phase.num}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group ${
              isCurrent
                ? "bg-blue-50 border border-blue-200"
                : isCompleted
                ? "bg-emerald-50/50"
                : "hover:bg-gray-50"
            }`}
            onClick={() => onTogglePhase(phase.num)}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                isCompleted
                  ? "bg-emerald-500 text-white"
                  : isCurrent
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
              }`}
            >
              {isCompleted ? <Check className="w-3.5 h-3.5" /> : phase.num}
            </div>
            <span
              className={`text-sm font-medium transition-colors ${
                isCompleted
                  ? "text-emerald-700 line-through"
                  : isCurrent
                  ? "text-blue-700"
                  : "text-gray-600"
              }`}
            >
              {phase.label}
            </span>
            {isCurrent && (
              <span className="ml-auto text-[10px] font-semibold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Current
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
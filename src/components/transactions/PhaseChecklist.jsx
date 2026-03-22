import React from "react";
import { Check, Lock, ChevronRight } from "lucide-react";
import { PHASE_TASK_LIBRARY, getPhaseProgress, isPhaseComplete } from "@/lib/taskLibrary";

function getPhasesForTransaction(txType, currentPhase) {
  // Listing-only: show pre-listing + active listing. Once converted (phase >= 3), show all.
  if ((txType === "seller") && currentPhase <= 2) {
    return PHASE_TASK_LIBRARY.filter(p => p.phaseNum <= 2).map(p => ({ num: p.phaseNum, label: p.label }));
  }
  return PHASE_TASK_LIBRARY.map(p => ({ num: p.phaseNum, label: p.label }));
}

export default function PhaseChecklist({ phasesCompleted = [], currentPhase, onTogglePhase, tasks = [], selectedPhase, onSelectPhase }) {
  return (
    <div className="space-y-1">
      {PHASES.map((phase) => {
        const progress = getPhaseProgress(phase.num, tasks);
        const tasksDriven = progress.total > 0;
        const isCompleted = tasksDriven ? isPhaseComplete(phase.num, tasks) : phasesCompleted.includes(phase.num);
        const isCurrent = phase.num === currentPhase;
        const isSelected = selectedPhase === phase.num;

        // Locked if tasks exist and required ones aren't done
        const isLocked = tasksDriven && !isCompleted && progress.requiredDone < progress.required;

        const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

        return (
          <div
            key={phase.num}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer group ${
              isSelected
                ? "bg-blue-50 border border-blue-300"
                : isCompleted
                ? "bg-emerald-50/50 hover:bg-emerald-50"
                : "hover:bg-gray-50"
            } ${isLocked ? "opacity-70" : ""}`}
            onClick={() => onSelectPhase?.(phase.num)}
            title={isLocked ? "Complete required tasks to unlock this phase" : phase.label}
          >
            {/* Status circle */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
              isCompleted
                ? "bg-emerald-500 text-white"
                : isCurrent
                ? "bg-blue-500 text-white"
                : isLocked
                ? "bg-gray-100 text-gray-300"
                : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
            }`}>
              {isCompleted ? <Check className="w-3.5 h-3.5" /> : isLocked ? <Lock className="w-3 h-3" /> : phase.num}
            </div>

            {/* Label + progress bar */}
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium block truncate ${
                isCompleted ? "text-emerald-700 line-through" : isCurrent ? "text-blue-700" : "text-gray-600"
              }`}>
                {phase.label}
              </span>
              {progress.total > 0 && !isCompleted && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-400" : "bg-blue-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 flex-shrink-0">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              )}
            </div>

            {/* Right indicator */}
            {isSelected ? (
              <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            ) : isCurrent && !isCompleted ? (
              <span className="text-[10px] font-semibold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">
                Active
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
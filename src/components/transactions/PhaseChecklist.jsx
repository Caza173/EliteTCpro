import React from "react";
import { Check, Lock, ChevronRight } from "lucide-react";
import { getPhasesForType, getPhaseProgress, isPhaseComplete } from "@/lib/taskLibrary";

export default function PhaseChecklist({ phasesCompleted = [], currentPhase, onTogglePhase, tasks = [], txTasks = [], selectedPhase, onSelectPhase, transactionType }) {
  const phases = getPhasesForType(transactionType);

  return (
    <div className="space-y-1">
      {phases.map((phase) => {
        const newPhaseTasks = txTasks.filter(t => t.phase === phase.phaseNum);
        let progress, isCompleted, isLocked, pct;

        if (newPhaseTasks.length > 0) {
          const total = newPhaseTasks.length;
          const completed = newPhaseTasks.filter(t => t.is_completed).length;
          const required = newPhaseTasks.filter(t => t.is_required).length;
          const requiredDone = newPhaseTasks.filter(t => t.is_required && t.is_completed).length;
          progress = { total, completed, required, requiredDone };
          isCompleted = required > 0 && requiredDone === required;
          isLocked = false;
          pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        } else {
          progress = getPhaseProgress(phase.phaseNum, tasks);
          const tasksDriven = progress.total > 0;
          isCompleted = tasksDriven
            ? isPhaseComplete(phase.phaseNum, tasks)
            : phasesCompleted.includes(phase.phaseNum);
          isLocked = tasksDriven && !isCompleted && progress.requiredDone < progress.required;
          pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
        }

        const isCurrent = phase.phaseNum === currentPhase;
        const isSelected = selectedPhase === phase.phaseNum;

        return (
          <div
            key={phase.phaseNum}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer group ${
              isSelected
                ? "bg-blue-50 border border-blue-300"
                : isCompleted
                ? "bg-emerald-50/50 hover:bg-emerald-50"
                : "hover:bg-gray-50"
            } ${isLocked ? "opacity-70" : ""}`}
            onClick={() => onSelectPhase?.(phase.phaseNum)}
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
              {isCompleted ? <Check className="w-3.5 h-3.5" /> : isLocked ? <Lock className="w-3 h-3" /> : phase.phaseNum}
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
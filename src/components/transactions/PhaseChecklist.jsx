import React from "react";
import { Check, Lock } from "lucide-react";

// TC-visible phases only (1 & 2 are agent-side)
// Phase 3 absorbs escrow tasks (was phase 4)
// Phase 5 absorbs repair tasks (was phase 6)
const PHASES = [
  { num: 3, label: "Offer Accepted & Escrow" },
  { num: 5, label: "Inspection & Repair" },
  { num: 7, label: "Appraisal Ordered" },
  { num: 8, label: "Loan Processing" },
  { num: 9, label: "Clear to Close" },
  { num: 10, label: "Final Walkthrough" },
  { num: 11, label: "Closing" },
  { num: 12, label: "Post Closing" },
];

// Tasks that belong to each phase (includes merged phases)
const PHASE_TASK_GROUPS = {
  3: [3], // phase 3 tasks
  5: [5], // phase 5 tasks (includes repair)
  7: [7],
  8: [8],
  9: [9],
  10: [10],
  11: [11],
  12: [12],
};

function arePhaseTasksDone(phaseNum, tasks = []) {
  const phaseTasks = tasks.filter((t) => PHASE_TASK_GROUPS[phaseNum]?.includes(t.phase));
  if (phaseTasks.length === 0) return true; // no tasks = can mark freely
  return phaseTasks.every((t) => t.completed);
}

export default function PhaseChecklist({ phasesCompleted = [], currentPhase, onTogglePhase, tasks = [] }) {
  return (
    <div className="space-y-1">
      {PHASES.map((phase) => {
        const isCompleted = phasesCompleted.includes(phase.num);
        const isCurrent = phase.num === currentPhase;
        const tasksDone = arePhaseTasksDone(phase.num, tasks);
        const isLocked = !tasksDone && !isCompleted;

        return (
          <div
            key={phase.num}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer group"
            } ${
              isCurrent
                ? "bg-blue-50 border border-blue-200"
                : isCompleted
                ? "bg-emerald-50/50"
                : "hover:bg-gray-50"
            }`}
            onClick={() => {
              if (!isLocked) onTogglePhase(phase.num);
            }}
            title={isLocked ? "Complete all phase tasks before marking this phase done" : ""}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                isCompleted
                  ? "bg-emerald-500 text-white"
                  : isCurrent
                  ? "bg-blue-500 text-white"
                  : isLocked
                  ? "bg-gray-100 text-gray-300"
                  : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
              }`}
            >
              {isCompleted ? <Check className="w-3.5 h-3.5" /> : isLocked ? <Lock className="w-3 h-3" /> : phase.num}
            </div>
            <span
              className={`text-sm font-medium transition-colors flex-1 ${
                isCompleted
                  ? "text-emerald-700 line-through"
                  : isCurrent
                  ? "text-blue-700"
                  : "text-gray-600"
              }`}
            >
              {phase.label}
            </span>
            {isLocked && (
              <span className="text-[10px] text-gray-400 font-medium">Tasks pending</span>
            )}
            {isCurrent && !isLocked && (
              <span className="text-[10px] font-semibold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Current
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
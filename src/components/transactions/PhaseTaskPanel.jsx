import React from "react";
import { CheckCircle2, Circle, AlertCircle, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PHASE_MAP, generateTasksForPhase, getPhaseProgress } from "@/lib/taskLibrary";

export default function PhaseTaskPanel({ phaseNum, tasks = [], onToggleTask, onGenerateTasks }) {
  const phaseDef = PHASE_MAP[phaseNum];
  const phaseTasks = tasks.filter(t => t.phase === phaseNum);
  const progress = getPhaseProgress(phaseNum, tasks);

  if (!phaseDef) return null;

  // If no tasks for this phase yet, offer auto-generate
  if (phaseTasks.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <ClipboardList className="w-10 h-10 mx-auto text-gray-300" />
        <p className="text-sm text-gray-500">No tasks for <strong>{phaseDef.label}</strong> yet.</p>
        <button
          onClick={() => onGenerateTasks?.(phaseNum)}
          className="text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          + Generate {phaseDef.tasks.length} Tasks
        </button>
      </div>
    );
  }

  const requiredDone = progress.requiredDone;
  const requiredTotal = progress.required;
  const allRequiredDone = requiredDone === requiredTotal;

  return (
    <div className="space-y-3">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {phaseDef.label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {progress.completed} / {progress.total} completed · {requiredDone}/{requiredTotal} required
          </p>
        </div>
        {allRequiredDone && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            ✓ Phase complete
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${allRequiredDone ? "bg-emerald-400" : "bg-blue-400"}`}
          style={{ width: `${progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%` }}
        />
      </div>

      {/* Task list */}
      <div className="space-y-1.5">
        {phaseTasks.map(task => {
          const isAtRisk = !task.completed && task.due_date && new Date(task.due_date) < new Date();
          return (
            <div
              key={task.id}
              onClick={() => onToggleTask?.(task.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all group ${
                task.completed
                  ? "bg-emerald-50/60 border-emerald-100"
                  : isAtRisk
                  ? "bg-red-50/50 border-red-100"
                  : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
              }`}
              style={{ background: task.completed ? undefined : "var(--card-bg)" }}
            >
              <div className="flex-shrink-0">
                {task.completed
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : isAtRisk
                  ? <AlertCircle className="w-5 h-5 text-red-400" />
                  : <Circle className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
                }
              </div>
              <span className={`text-sm font-medium flex-1 ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                {task.name}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {task.required && !task.completed && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200">
                    Required
                  </Badge>
                )}
                {!task.required && !task.completed && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-400 border-gray-200">
                    Optional
                  </Badge>
                )}
                {isAtRisk && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-600 border-red-200">
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
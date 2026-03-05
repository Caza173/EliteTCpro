import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ClipboardList } from "lucide-react";

const PHASE_LABELS = [
  "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
  "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
  "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing"
];

export default function TaskList({ tasks = [], onToggleTask }) {
  if (!tasks.length) {
    return (
      <div className="text-center py-10">
        <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No tasks yet.</p>
      </div>
    );
  }

  // Group by phase
  const grouped = tasks.reduce((acc, task) => {
    const key = task.phase || 0;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const sortedPhases = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      {sortedPhases.map((phaseNum) => {
        const phaseTasks = grouped[phaseNum];
        const completedCount = phaseTasks.filter((t) => t.completed).length;
        return (
          <div key={phaseNum}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Phase {phaseNum} — {PHASE_LABELS[phaseNum - 1]}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-500 border-gray-200">
                {completedCount}/{phaseTasks.length}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {phaseTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer group ${
                    task.completed
                      ? "bg-emerald-50/60 border-emerald-100"
                      : "bg-white border-gray-100 hover:border-gray-200"
                  }`}
                  onClick={() => onToggleTask(task.id)}
                >
                  <div className="flex-shrink-0">
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
                    )}
                  </div>
                  <span className={`text-sm font-medium flex-1 ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {task.name}
                  </span>
                  {task.assigned_to && (
                    <span className="text-xs text-gray-400 hidden sm:block">{task.assigned_to}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
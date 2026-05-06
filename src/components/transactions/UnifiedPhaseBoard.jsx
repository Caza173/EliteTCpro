import React, { useState, useRef, useCallback, memo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  CheckCircle2, Circle, AlertCircle, GripVertical,
  Plus, Trash2, Pencil, BookOpen, ChevronDown, ChevronUp, Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { tasksApi } from "@/api/tasks";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { getPhasesForType, isTaskIncompatible, SUB_PHASE_MAP } from "@/lib/taskLibrary";
import TaskLibraryModal from "@/components/tasks/TaskLibraryModal";
import PhaseCompletionBadge from "./PhaseCompletionBadge";
import TaskActionToolbar from "@/components/tasks/TaskActionToolbar";
import MovePhasePopover from "./MovePhasePopover";

// ── Determine phase status ──────────────────────────────────────────────────
// For phase 1 (Under Contract): complete only when BOTH phase 1 AND phase 2
// required tasks are all done (Due Diligence is a sub-phase of Under Contract).
function getPhaseStatus(phaseNum, tasks, phasesCompleted = []) {
  const subPhases = SUB_PHASE_MAP[phaseNum] || [];
  const allPhaseNums = [phaseNum, ...subPhases];

  const ownTasks = tasks.filter(t => t.phase === phaseNum);
  const requiredOwn = ownTasks.filter(t => t.is_required);

  // Sub-phase required tasks must also be done for the parent to be complete
  const subTasks = tasks.filter(t => subPhases.includes(t.phase));
  const requiredSub = subTasks.filter(t => t.is_required);

  const allRequired = [...requiredOwn, ...requiredSub];
  const allRequiredDone = allRequired.length > 0 && allRequired.every(t => t.is_completed);

  if (allRequiredDone) return "complete";
  if (phasesCompleted.map(Number).includes(phaseNum) && ownTasks.length === 0) return "complete";

  // Active if any task in own or sub-phases has been started
  const anyStarted = tasks.filter(t => allPhaseNums.includes(t.phase)).some(t => t.is_completed);
  if (anyStarted) return "active";
  return "not_started";
}

// Due Diligence (phase 2) is a sub-phase — skip it when finding the active top-level phase
// so the board doesn't advance past Under Contract until BOTH are done.
function getActivePhaseNum(phases, tasks, phasesCompleted) {
  // Collect phaseNums that are sub-phases (they don't count as standalone active phase)
  const allSubPhases = new Set(Object.values(SUB_PHASE_MAP).flat());

  for (const p of phases) {
    // Skip sub-phases in the active-phase search — they roll up to their parent
    if (allSubPhases.has(p.phaseNum)) continue;
    const status = getPhaseStatus(p.phaseNum, tasks, phasesCompleted);
    if (status !== "complete") return p.phaseNum;
  }
  return phases[phases.length - 1]?.phaseNum;
}

// ── Task Row ────────────────────────────────────────────────────────────────
const TaskRow = memo(function TaskRow({
  task, index, allPhases, onToggleTask, onDelete, onMoveTo, onSaveEdit,
  transaction, currentUser, onTaskUpdated, phase
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [moveOpen, setMoveOpen] = useState(false);
  const rowRef = useRef(null);

  // Only show at-risk if task is NOT completed AND deadline has passed
  // Completed tasks permanently suppress all overdue alerts regardless of date
  const isAtRisk = !task.is_completed && task.due_date &&
    new Date(task.due_date + "T23:59:59") < new Date();
  const phaseNum = phase?.phaseNum || 0;

  const saveEdit = async () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== task.title) {
      await onSaveEdit(task.id, draft.trim());
    }
  };

  // Close popover on click-outside
  useEffect(() => {
    if (!moveOpen) return;
    const handleClickOutside = (e) => {
      if (rowRef.current && !rowRef.current.contains(e.target)) {
        setMoveOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moveOpen]);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(drag, snap) => (
        <div
           ref={(el) => { drag.innerRef(el); rowRef.current = el; }}
           {...drag.draggableProps}
           className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-sm group transition-all border-l-4 relative ${
              snap.isDragging
                ? "shadow-lg border-l-blue-400 opacity-95"
                : task.is_completed
                ? "border-l-emerald-500"
                : isAtRisk
                ? "border-l-red-500 hover:border-l-red-600"
                : "border-l-gray-400 hover:border-l-gray-500"
            }`}
           style={{ ...drag.draggableProps.style, background: "var(--bg-secondary)", borderColor: "var(--card-border)" }}
         >
          <div {...drag.dragHandleProps} className="cursor-grab flex-shrink-0 opacity-20 hover:opacity-50">
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>

          <button onClick={() => onToggleTask(task.id)} className="flex-shrink-0">
             {task.is_completed
               ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
               : isAtRisk
               ? <AlertCircle className="w-4 h-4 text-red-400" />
               : <Circle className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
           </button>

          {editing ? (
            <input
              autoFocus
              className="flex-1 text-xs border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            />
          ) : (
            <span
               className={`flex-1 text-xs font-medium leading-tight ${task.is_completed ? "line-through opacity-50" : ""}`}
               style={{ color: task.is_completed ? "var(--text-muted)" : "var(--text-primary)" }}
               onDoubleClick={() => { setDraft(task.title); setEditing(true); }}
             >
               {task.title}
             </span>
          )}

          {task.is_required && !task.is_completed && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 flex-shrink-0">REQ</span>
          )}

          {/* Task-specific actions toolbar */}
          {!task.is_completed && transaction && (
            <TaskActionToolbar 
              task={task} 
              transaction={transaction} 
              onTaskUpdated={onTaskUpdated}
              phaseNum={phaseNum}
            />
          )}

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {!editing && (
              <button onClick={() => { setDraft(task.title); setEditing(true); }} className="p-0.5 rounded" style={{ background: "transparent" }}>
                 <Pencil className="w-2.5 h-2.5" style={{ color: "var(--text-muted)" }} />
               </button>
            )}
            <div className="relative">
              <button
                onClick={() => setMoveOpen(v => !v)}
                className="p-0.5 rounded" title="Move to phase"
              >
                <ChevronDown className="w-2.5 h-2.5 text-gray-500 hover:text-gray-400" />
              </button>
              {moveOpen && rowRef.current && (
                <MovePhasePopover
                  rowEl={rowRef.current}
                  allPhases={allPhases}
                  currentPhase={task.phase}
                  onSelect={(phaseNum) => {
                    setMoveOpen(false);
                    onMoveTo(task.id, phaseNum);
                  }}
                  onClose={() => setMoveOpen(false)}
                />
              )}
            </div>
            <button onClick={() => onDelete(task.id)} className="p-0.5 rounded">
              <Trash2 className="w-2.5 h-2.5 text-red-400 hover:text-red-300" />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
});

// ── Phase Card ───────────────────────────────────────────────────────────────
function PhaseCard({
  phase, tasks, allPhases, isActive, isComplete, isMobile, defaultExpanded,
  onToggleTask, onDelete, onMoveTo, onSaveEdit, onAddTask, brokerageId, transactionId, onTasksChanged, transaction,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const queryClient = useQueryClient();

  const phaseTasks = tasks
    .filter(t => t.phase === phase.phaseNum)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  // For parent phases, include sub-phase tasks in progress calculation
  const subPhaseNums = SUB_PHASE_MAP[phase.phaseNum] || [];
  const allProgressTasks = tasks.filter(t => t.phase === phase.phaseNum || subPhaseNums.includes(t.phase));
  const total = allProgressTasks.length;
  const completed = allProgressTasks.filter(t => t.is_completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAddTask = async () => {
    const title = newTitle.trim();
    if (!title) { setAddingTask(false); return; }
    const maxOrder = phaseTasks.length > 0 ? Math.max(...phaseTasks.map(t => t.order_index ?? 0)) + 1 : 0;
    await tasksApi.create({
      transaction_id: transactionId,
      brokerage_id: brokerageId,
      phase: phase.phaseNum,
      title,
      order_index: maxOrder,
      is_completed: false,
      is_required: false,
      is_custom: true,
    });
    setNewTitle("");
    setAddingTask(false);
    onTasksChanged?.();
  };

  const borderStyle = isComplete
     ? "border-emerald-500"
     : isActive
     ? "border-blue-500 ring-1 ring-blue-400/30"
     : "";

   const headerStyle = isComplete
     ? "bg-emerald-500/10"
     : isActive
     ? "bg-blue-500/10"
     : "";

  return (
    <div
      className={`rounded-xl border flex-shrink-0 flex flex-col overflow-hidden transition-all ${borderStyle} ${
        isMobile ? "w-full" : "min-w-[220px] max-w-[280px]"
      }`}
      style={{ background: "var(--card-bg)", borderColor: borderStyle ? undefined : "var(--card-border)" }}
    >
      {/* Card Header */}
      <div
        className={`px-3 py-2.5 ${headerStyle} flex items-center justify-between gap-2 cursor-pointer`}
        onClick={() => isMobile && setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isComplete ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-white" />
            </div>
          ) : isActive ? (
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold truncate ${isComplete ? "text-emerald-400 line-through" : isActive ? "text-blue-400" : "text-gray-500"}`}>
                {phase.label}
              </p>
              <p className="text-[10px] text-gray-500">{completed}/{total} tasks{subPhaseNums.length > 0 ? " incl. sub-phase" : ""}</p>
            </div>
        </div>
        {transaction && isComplete && (
          <PhaseCompletionBadge transaction={transaction} phaseNumber={phase.phaseNum} />
        )}
        {isMobile && (
          expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1" style={{ background: "var(--bg-tertiary)" }}>
        <div
          className={`h-full transition-all ${isComplete ? "bg-emerald-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Task list — hidden on mobile when collapsed */}
      {(!isMobile || expanded) && (
        <Droppable droppableId={`phase-${phase.phaseNum}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 p-2 space-y-1.5 min-h-[60px] transition-colors ${snapshot.isDraggingOver ? "bg-blue-500/10" : ""}`}
            >
              {phaseTasks.length === 0 && (
                <p className="text-[10px] text-gray-500 py-1 text-center">
                  {snapshot.isDraggingOver ? "Drop here →" : "No tasks yet"}
                </p>
              )}
              {phaseTasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  index={index}
                  allPhases={allPhases}
                  onToggleTask={onToggleTask}
                  onDelete={onDelete}
                  onMoveTo={onMoveTo}
                  onSaveEdit={onSaveEdit}
                  transaction={transaction}
                  onTaskUpdated={onTasksChanged}
                  phase={phase}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}

      {/* Add task footer */}
      {(!isMobile || expanded) && (
        <div className="px-2 pb-2">
          {addingTask ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                autoFocus
                className="flex-1 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                style={{ border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
                placeholder="Task title..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleAddTask();
                  if (e.key === "Escape") { setAddingTask(false); setNewTitle(""); }
                }}
              />
              <button onClick={handleAddTask} className="text-[10px] font-semibold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>
              <button onClick={() => { setAddingTask(false); setNewTitle(""); }} className="text-[10px] px-1.5 py-1 rounded" style={{ color: "var(--text-muted)" }}>✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setAddingTask(true)}
                className="flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:text-blue-400 px-1 py-0.5 rounded"
              >
                <Plus className="w-3 h-3" /> Add Task
              </button>
              <button
                onClick={() => setLibraryOpen(true)}
                className="flex items-center gap-1 text-[10px] font-medium text-purple-500 hover:text-purple-400 px-1 py-0.5 rounded"
              >
                <BookOpen className="w-3 h-3" /> Library
              </button>
            </div>
          )}
        </div>
      )}

      {libraryOpen && (
        <TaskLibraryModal
          phaseNum={phase.phaseNum}
          phaseLabel={phase.label}
          brokerageId={brokerageId}
          transactionType={transaction?.transaction_type}
          currentTasks={phaseTasks}
          onClose={() => setLibraryOpen(false)}
          onApply={async (items, replaceExisting = false) => {
            if (replaceExisting) {
              // Template apply: delete existing phase tasks first, then create template tasks
              await Promise.all(phaseTasks.map((task) => tasksApi.delete(task.id)));
              await Promise.all(items.map((item, i) =>
                tasksApi.create({
                  transaction_id: transactionId,
                  brokerage_id: brokerageId,
                  phase: phase.phaseNum,
                  title: item.title,
                  order_index: i,
                  is_completed: false,
                  is_required: item.required || false,
                  is_custom: true,
                })
              ));
            } else {
              const maxOrder = phaseTasks.length > 0 ? Math.max(...phaseTasks.map(t => t.order_index ?? 0)) + 1 : 0;
              await Promise.all(items.map((item, i) =>
                tasksApi.create({
                  transaction_id: transactionId,
                  brokerage_id: brokerageId,
                  phase: phase.phaseNum,
                  title: item.title || item.title,
                  order_index: maxOrder + i,
                  is_completed: false,
                  is_required: item.is_required || item.required || false,
                  is_custom: true,
                })
              ));
            }
            onTasksChanged?.();
          }}
        />
      )}
    </div>
  );
}

// ── Phase Progress Bar (top stepper) ────────────────────────────────────────
function PhaseProgressBar({ phases, tasks, phasesCompleted, scrollRef }) {
  const scrollToPhase = (phaseNum) => {
    const el = scrollRef.current?.querySelector(`[data-phase="${phaseNum}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  return (
    <div className="flex items-start overflow-x-auto scrollbar-none gap-0 pb-1">
      {phases.map((phase, i) => {
        const status = getPhaseStatus(phase.phaseNum, tasks, phasesCompleted);
        const isLast = i === phases.length - 1;
        const isComplete = status === "complete";
        const isActive = status === "active";

        return (
          <div key={phase.phaseNum} className="flex items-center flex-shrink-0">
            <button
              onClick={() => scrollToPhase(phase.phaseNum)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                isComplete ? "bg-emerald-500 border-emerald-500" :
                isActive ? "bg-blue-500 border-blue-500" :
                "bg-white border-gray-300 group-hover:border-gray-400"
              }`}>
                {isComplete
                  ? <Check className="w-3.5 h-3.5 text-white" />
                  : isActive
                  ? <div className="w-2 h-2 rounded-full bg-white" />
                  : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
              </div>
              <span className={`text-[10px] font-medium text-center max-w-[64px] leading-tight ${
                isComplete ? "text-emerald-600" : isActive ? "text-blue-600" : "text-gray-400"
              }`}>
                {phase.label}
              </span>
            </button>
            {!isLast && (
              <div className={`h-0.5 w-10 mx-1 mb-5 flex-shrink-0 rounded-full ${isComplete ? "bg-emerald-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Board ───────────────────────────────────────────────────────────────
export default function UnifiedPhaseBoard({
  tasks = [],
  onToggleTask,
  onTasksChanged,
  transactionId,
  brokerageId,
  transactionType,
  transaction,
  currentUser,
}) {
  const allPhases = getPhasesForType(transactionType);
  const phasesCompleted = (transaction?.phases_completed || []).map(Number);
  const currentPhase = transaction?.phase || 1;
  const queryClient = useQueryClient();
  const [localTasks, setLocalTasks] = useState(null);
  const boardRef = useRef(null);

  const activeTasks = localTasks || tasks;
  const activePhaseNum = getActivePhaseNum(allPhases, activeTasks, phasesCompleted);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Drag end ───────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const srcPhase = parseInt(source.droppableId.replace("phase-", ""), 10);
    const dstPhase = parseInt(destination.droppableId.replace("phase-", ""), 10);
    if (srcPhase === dstPhase && source.index === destination.index) return;

    const current = (localTasks || tasks).map(t => ({ ...t }));
    const srcList = current.filter(t => t.phase === srcPhase).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const dragged = srcList[source.index];
    if (!dragged) return;

    srcList.splice(source.index, 1);
    const dstList = dstPhase === srcPhase
      ? srcList
      : current.filter(t => t.phase === dstPhase && t.id !== dragged.id).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    dstList.splice(destination.index, 0, { ...dragged, phase: dstPhase });

    const updates = [];
    srcList.forEach((t, i) => updates.push({ id: t.id, phase: srcPhase, order_index: i }));
    if (dstPhase !== srcPhase) {
      dstList.forEach((t, i) => updates.push({ id: t.id, phase: dstPhase, order_index: i }));
    } else {
      dstList.forEach((t, i) => {
        const ex = updates.find(u => u.id === t.id);
        if (ex) { ex.order_index = i; ex.phase = dstPhase; }
        else updates.push({ id: t.id, phase: dstPhase, order_index: i });
      });
    }

    const nextTasks = current.map(t => {
      const u = updates.find(x => x.id === t.id);
      return u ? { ...t, phase: u.phase, order_index: u.order_index } : t;
    });
    setLocalTasks(nextTasks);

    await Promise.all(updates.map(u => {
      const payload = { order_index: u.order_index };
      if (u.id === dragged.id && dstPhase !== srcPhase) payload.phase = u.phase;
      return tasksApi.update(u.id, payload);
    }));
    setLocalTasks(null);
    onTasksChanged?.();
  }, [localTasks, tasks, onTasksChanged]);

  const handleSaveEdit = async (taskId, newTitle) => {
    await tasksApi.update(taskId, { title: newTitle });
    onTasksChanged?.();
  };

  const handleDelete = async (taskId) => {
    const task = activeTasks.find(t => t.id === taskId);
    await tasksApi.delete(taskId);
    if (task?.is_custom && brokerageId) {
      const libraryItems = await base44.entities.TaskLibraryItem.filter({ brokerage_id: brokerageId, title: task.title });
      await Promise.all(libraryItems.map(i => base44.entities.TaskLibraryItem.delete(i.id)));
    }
    onTasksChanged?.();
  };

  const handleMoveTo = async (taskId, targetPhaseNum) => {
    const task = activeTasks.find(t => t.id === taskId);
    if (!task || task.phase === targetPhaseNum) return;
    const targetTasks = activeTasks.filter(t => t.phase === targetPhaseNum);
    const newOrder = targetTasks.length > 0 ? Math.max(...targetTasks.map(t => t.order_index ?? 0)) + 1 : 0;
    setLocalTasks(activeTasks.map(t => t.id === taskId ? { ...t, phase: targetPhaseNum, order_index: newOrder } : t));
    await tasksApi.update(taskId, { phase: targetPhaseNum, order_index: newOrder });
    setLocalTasks(null);
    onTasksChanged?.();
  };

  return (
    <div className="space-y-4">
      {/* Phase Progress Stepper */}
      <div className="overflow-x-auto scrollbar-none">
        <PhaseProgressBar
          phases={allPhases}
          tasks={activeTasks}
          phasesCompleted={phasesCompleted}
          scrollRef={boardRef}
        />
      </div>

      {/* Phase Cards Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div
          ref={boardRef}
          className={isMobile ? "flex flex-col gap-3" : "flex gap-3 overflow-x-auto pb-2 items-start"}
        >
          {allPhases.map(phase => {
            const status = getPhaseStatus(phase.phaseNum, activeTasks, phasesCompleted);
            return (
              <div key={phase.phaseNum} data-phase={phase.phaseNum} className={isMobile ? "w-full" : ""}>
                <PhaseCard
                  phase={phase}
                  tasks={activeTasks}
                  allPhases={allPhases}
                  isActive={status === "active" || phase.phaseNum === activePhaseNum}
                  isComplete={status === "complete"}
                  isMobile={isMobile}
                  defaultExpanded={status === "active" || phase.phaseNum === activePhaseNum}
                  onToggleTask={onToggleTask}
                  onDelete={handleDelete}
                  onMoveTo={handleMoveTo}
                  onSaveEdit={handleSaveEdit}
                  brokerageId={brokerageId}
                  transactionId={transactionId}
                  onTasksChanged={onTasksChanged}
                  transaction={transaction}
                />
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
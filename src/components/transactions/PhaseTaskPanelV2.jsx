import React, { useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  CheckCircle2, Circle, AlertCircle, GripVertical,
  Plus, Trash2, Pencil, BookOpen, ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPhasesForType } from "@/lib/taskLibrary";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import TaskLibraryModal from "@/components/tasks/TaskLibraryModal";
import NotifyClientButton from "@/components/transactions/NotifyClientButton";
import { isTaskIncompatible } from "@/lib/taskLibrary";

/**
 * PhaseTaskPanelV2
 *
 * Renders ALL phases as droppable zones simultaneously so tasks can be
 * dragged freely between phases. The "selected" phase is highlighted/expanded.
 *
 * tasks prop = ALL TransactionTask records for this transaction (all phases).
 * phaseNum   = currently selected/active phase.
 */
export default function PhaseTaskPanelV2({
  phaseNum,
  tasks = [],
  onToggleTask,
  onTasksChanged,
  transactionId,
  brokerageId,
  transactionType,
  transaction,
  onUpdateTransaction,
}) {
  const allPhases = getPhasesForType(transactionType);
  const phaseDef = allPhases.find(p => p.phaseNum === phaseNum);
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  // optimistic local task list while drag is in-flight
  const [localTasks, setLocalTasks] = useState(null);
  const [incompatibleWarning, setIncompatibleWarning] = useState(null);
  // which phases are expanded (others show as compact drop targets)
  const [expandedPhases, setExpandedPhases] = useState(new Set([phaseNum]));
  const inputRef = useRef(null);

  if (!phaseDef) return null;

  const allTasks = localTasks || tasks;

  const getPhaseTasksSorted = (num) =>
    allTasks
      .filter(t => t.phase === num)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  // Progress for the active (selected) phase
  const phaseTasks = getPhaseTasksSorted(phaseNum);
  const progress = {
    total: phaseTasks.length,
    completed: phaseTasks.filter(t => t.is_completed).length,
    required: phaseTasks.filter(t => t.is_required).length,
    requiredDone: phaseTasks.filter(t => t.is_required && t.is_completed).length,
  };
  const allRequiredDone = progress.required > 0 && progress.requiredDone === progress.required;

  // ── Cross-phase drag end ──────────────────────────────────────────────────
  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const srcPhaseNum = parseInt(source.droppableId.replace("phase-", ""), 10);
    const dstPhaseNum = parseInt(destination.droppableId.replace("phase-", ""), 10);

    if (srcPhaseNum === dstPhaseNum && source.index === destination.index) return;

    // Auto-expand destination phase so the moved task is visible
    setExpandedPhases(prev => new Set([...prev, dstPhaseNum]));

    const updated = (localTasks || tasks).map(t => ({ ...t }));

    const srcPhaseTasks = updated
      .filter(t => t.phase === srcPhaseNum)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const draggedTask = srcPhaseTasks[source.index];
    if (!draggedTask) return;

    // Remove from source
    srcPhaseTasks.splice(source.index, 1);

    const dstPhaseTasks = dstPhaseNum === srcPhaseNum
      ? srcPhaseTasks
      : updated
          .filter(t => t.phase === dstPhaseNum && t.id !== draggedTask.id)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    // Insert at destination
    dstPhaseTasks.splice(destination.index, 0, { ...draggedTask, phase: dstPhaseNum });

    // Build update list
    const updates = [];
    srcPhaseTasks.forEach((t, i) => updates.push({ id: t.id, phase: srcPhaseNum, order_index: i }));
    if (dstPhaseNum !== srcPhaseNum) {
      dstPhaseTasks.forEach((t, i) => updates.push({ id: t.id, phase: dstPhaseNum, order_index: i }));
    } else {
      dstPhaseTasks.forEach((t, i) => {
        const ex = updates.find(u => u.id === t.id);
        if (ex) { ex.order_index = i; ex.phase = dstPhaseNum; }
        else updates.push({ id: t.id, phase: dstPhaseNum, order_index: i });
      });
    }

    // Optimistic update
    const nextTasks = updated.map(t => {
      const upd = updates.find(u => u.id === t.id);
      return upd ? { ...t, phase: upd.phase, order_index: upd.order_index } : t;
    });
    setLocalTasks(nextTasks);

    // Persist
    await Promise.all(
      updates.map(u => {
        const payload = { order_index: u.order_index };
        if (u.id === draggedTask.id && dstPhaseNum !== srcPhaseNum) payload.phase = u.phase;
        return base44.entities.TransactionTask.update(u.id, payload);
      })
    );

    setLocalTasks(null);
    onTasksChanged?.();
  };

  // ── Inline edit ───────────────────────────────────────────────────────────
  const saveEdit = async (taskId) => {
    if (editDraft.trim()) {
      await base44.entities.TransactionTask.update(taskId, { title: editDraft.trim() });
      onTasksChanged?.();
    }
    setEditingId(null);
  };

  // ── Add task ──────────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    const title = newTitle.trim();
    if (!title) { setAddingTask(false); return; }

    if (transactionType && isTaskIncompatible(title, transactionType)) {
      setIncompatibleWarning({
        title,
        onConfirm: () => { setIncompatibleWarning(null); doAddTask(title); },
      });
      return;
    }
    doAddTask(title);
  };

  const doAddTask = async (title) => {
    const currentPhaseTasks = getPhaseTasksSorted(phaseNum);
    const maxOrder = currentPhaseTasks.length > 0
      ? Math.max(...currentPhaseTasks.map(t => t.order_index ?? 0)) + 1
      : 0;

    await Promise.all([
      base44.entities.TransactionTask.create({
        transaction_id: transactionId,
        brokerage_id: brokerageId,
        phase: phaseNum,
        title,
        order_index: maxOrder,
        is_completed: false,
        is_required: false,
        is_custom: true,
      }),
      base44.entities.TaskLibraryItem.create({
        brokerage_id: brokerageId,
        title,
        phase: phaseNum,
        is_required: false,
      }),
    ]);

    setNewTitle("");
    setAddingTask(false);
    queryClient.invalidateQueries({ queryKey: ["taskLibrary", brokerageId] });
    onTasksChanged?.();
  };

  // ── Delete task ───────────────────────────────────────────────────────────
  const handleDelete = async (taskId) => {
    const task = allTasks.find(t => t.id === taskId);
    await base44.entities.TransactionTask.delete(taskId);
    if (task?.is_custom && brokerageId) {
      const libraryItems = await base44.entities.TaskLibraryItem.filter({
        brokerage_id: brokerageId,
        title: task.title,
      });
      await Promise.all(libraryItems.map(i => base44.entities.TaskLibraryItem.delete(i.id)));
      queryClient.invalidateQueries({ queryKey: ["taskLibrary", brokerageId] });
    }
    onTasksChanged?.();
  };

  // ── Move-to-phase dropdown (backup for mobile) ────────────────────────────
  const handleMoveTo = async (taskId, targetPhaseNum) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task || task.phase === targetPhaseNum) return;

    const targetTasks = getPhaseTasksSorted(targetPhaseNum);
    const newOrder = targetTasks.length > 0
      ? Math.max(...targetTasks.map(t => t.order_index ?? 0)) + 1
      : 0;

    // Optimistic
    setLocalTasks((localTasks || tasks).map(t =>
      t.id === taskId ? { ...t, phase: targetPhaseNum, order_index: newOrder } : t
    ));
    setExpandedPhases(prev => new Set([...prev, targetPhaseNum]));

    await base44.entities.TransactionTask.update(taskId, { phase: targetPhaseNum, order_index: newOrder });
    setLocalTasks(null);
    onTasksChanged?.();
  };

  // ── Render a single task row ──────────────────────────────────────────────
  const TaskRow = ({ task, index, phaseTasksForPhase }) => {
    const isAtRisk = !task.is_completed && task.due_date && new Date(task.due_date) < new Date();
    const isEditing = editingId === task.id;
    const [moveMenuOpen, setMoveMenuOpen] = useState(false);

    return (
      <Draggable key={task.id} draggableId={task.id} index={index}>
        {(drag, snap) => (
          <div
            ref={drag.innerRef}
            {...drag.draggableProps}
            className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-all group ${
              snap.isDragging
                ? "shadow-lg border-blue-300 bg-blue-50 opacity-90"
                : task.is_completed
                ? "bg-emerald-50/60 border-emerald-100"
                : isAtRisk
                ? "bg-red-50/50 border-red-100"
                : "border-gray-100 hover:border-gray-200"
            }`}
            style={{
              ...drag.draggableProps.style,
              background: snap.isDragging ? undefined : task.is_completed ? undefined : "var(--card-bg)",
            }}
          >
            {/* Drag handle */}
            <div
              {...drag.dragHandleProps}
              className="cursor-grab flex-shrink-0 opacity-30 hover:opacity-60"
              title="Drag to reorder or move to another phase"
            >
              <GripVertical className="w-3.5 h-3.5 text-gray-400" />
            </div>

            {/* Toggle complete */}
            <button onClick={() => onToggleTask?.(task.id)} className="flex-shrink-0">
              {task.is_completed
                ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                : isAtRisk
                ? <AlertCircle className="w-5 h-5 text-red-400" />
                : <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />}
            </button>

            {/* Title */}
            {isEditing ? (
              <input
                ref={inputRef}
                className="flex-1 text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                onBlur={() => saveEdit(task.id)}
                onKeyDown={e => {
                  if (e.key === "Enter") saveEdit(task.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
            ) : (
              <span
                className={`flex-1 text-sm font-medium ${
                  task.is_completed ? "line-through text-gray-400" : "text-gray-700"
                }`}
                onDoubleClick={() => { setEditingId(task.id); setEditDraft(task.title); }}
              >
                {task.title}
              </span>
            )}

            {/* Badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {task.is_required && !task.is_completed && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200">Req</Badge>
              )}
              {task.is_custom && !task.is_completed && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-600 border-purple-200">Custom</Badge>
              )}
            </div>

            {/* Hover actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 relative">
              {!isEditing && (
                <button
                  onClick={() => { setEditingId(task.id); setEditDraft(task.title); }}
                  className="p-1 rounded hover:bg-gray-100"
                  title="Edit title"
                >
                  <Pencil className="w-3 h-3 text-gray-400" />
                </button>
              )}

              {/* Move to phase dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMoveMenuOpen(v => !v)}
                  className="p-1 rounded hover:bg-gray-100"
                  title="Move to phase"
                >
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                {moveMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMoveMenuOpen(false)} />
                    <div className="absolute right-0 top-6 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                      <p className="text-[10px] font-semibold text-gray-400 px-3 py-1 uppercase tracking-wider">Move to phase</p>
                      {allPhases.map(p => (
                        <button
                          key={p.phaseNum}
                          disabled={p.phaseNum === task.phase}
                          onClick={() => { setMoveMenuOpen(false); handleMoveTo(task.id, p.phaseNum); }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors ${
                            p.phaseNum === task.phase ? "text-gray-300 cursor-default" : "text-gray-700"
                          }`}
                        >
                          {p.phaseNum === task.phase ? "✓ " : ""}{p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => handleDelete(task.id)}
                className="p-1 rounded hover:bg-red-50"
                title="Delete task"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header for active phase */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {phaseDef.label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {progress.completed}/{progress.total} completed · {progress.requiredDone}/{progress.required} required
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {allRequiredDone && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              ✓ Phase complete
            </span>
          )}
          {transaction && (
            <NotifyClientButton
              transaction={transaction}
              phaseNum={phaseNum}
              phaseName={phaseDef.label}
              allRequiredDone={allRequiredDone}
              onUpdateTransaction={onUpdateTransaction}
            />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${allRequiredDone ? "bg-emerald-400" : "bg-blue-400"}`}
          style={{ width: `${progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%` }}
        />
      </div>

      {/* ALL phases rendered as droppable zones inside a single DragDropContext */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-2">
          {allPhases.map(phase => {
            const isActive = phase.phaseNum === phaseNum;
            const isExpanded = expandedPhases.has(phase.phaseNum);
            const phTasks = getPhaseTasksSorted(phase.phaseNum);
            const phCompleted = phTasks.filter(t => t.is_completed).length;

            return (
              <div
                key={phase.phaseNum}
                className={`rounded-lg border transition-all ${
                  isActive
                    ? "border-blue-200 bg-blue-50/30"
                    : "border-gray-100"
                }`}
              >
                {/* Phase header (clickable to expand/collapse non-active) */}
                {!isActive && (
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-left"
                    onClick={() => setExpandedPhases(prev => {
                      const next = new Set(prev);
                      if (next.has(phase.phaseNum)) next.delete(phase.phaseNum);
                      else next.add(phase.phaseNum);
                      return next;
                    })}
                  >
                    <span className="text-xs font-medium text-gray-500 flex-1">{phase.label}</span>
                    <span className="text-[10px] text-gray-400">{phCompleted}/{phTasks.length}</span>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                )}

                {/* Droppable zone — always mounted so cross-phase DnD works */}
                <Droppable droppableId={`phase-${phase.phaseNum}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`transition-colors rounded-b-lg ${
                        snapshot.isDraggingOver
                          ? "bg-blue-50 ring-1 ring-blue-300 ring-inset"
                          : ""
                      } ${isExpanded || isActive ? "p-2 space-y-1.5 min-h-[36px]" : "min-h-[8px]"}`}
                    >
                      {/* Only show task rows when expanded or active */}
                      {(isExpanded || isActive) && (
                        <>
                          {phTasks.length === 0 && !snapshot.isDraggingOver && (
                            <p className="text-xs text-gray-400 py-1 px-1">
                              {isActive ? "No tasks yet. Click + Add Task below." : "Drop tasks here"}
                            </p>
                          )}
                          {snapshot.isDraggingOver && phTasks.length === 0 && (
                            <p className="text-xs text-blue-500 py-1 px-1 font-medium">Drop here →</p>
                          )}
                          {phTasks.map((task, index) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              index={index}
                              phaseTasksForPhase={phTasks}
                            />
                          ))}
                        </>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Add task (always for active phase) */}
      {addingTask ? (
        <div className="flex items-center gap-2 mt-1">
          <input
            className="flex-1 text-sm border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Task title..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleAddTask();
              if (e.key === "Escape") { setAddingTask(false); setNewTitle(""); }
            }}
            autoFocus
          />
          <button
            onClick={handleAddTask}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Add
          </button>
          <button
            onClick={() => { setAddingTask(false); setNewTitle(""); }}
            className="text-xs px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => setAddingTask(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 px-1 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
          <button
            onClick={() => setLibraryOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 px-1 py-1 rounded hover:bg-purple-50 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" /> From Library
          </button>
        </div>
      )}

      {/* Incompatible task warning */}
      {incompatibleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIncompatibleWarning(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-3">
            <p className="text-sm font-semibold text-gray-900">⚠️ Task may not belong here</p>
            <p className="text-sm text-gray-600">
              "<strong>{incompatibleWarning.title}</strong>" looks like a{" "}
              {transactionType === "buyer" || transactionType === "buyer_under_contract" ? "listing-side" : "buyer-side"}{" "}
              task on a{" "}
              {transactionType === "buyer" || transactionType === "buyer_under_contract" ? "buyer" : "listing"}{" "}
              file. Add anyway?
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setIncompatibleWarning(null)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={incompatibleWarning.onConfirm} className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-semibold">Add Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Library Modal */}
      {libraryOpen && (
        <TaskLibraryModal
          phaseNum={phaseNum}
          brokerageId={brokerageId}
          onClose={() => setLibraryOpen(false)}
          onApply={async (items) => {
            const currentPhaseTasks = getPhaseTasksSorted(phaseNum);
            const maxOrder = currentPhaseTasks.length > 0
              ? Math.max(...currentPhaseTasks.map(t => t.order_index ?? 0)) + 1
              : 0;
            await Promise.all(
              items.map((item, i) =>
                base44.entities.TransactionTask.create({
                  transaction_id: transactionId,
                  brokerage_id: brokerageId,
                  phase: phaseNum,
                  title: item.title,
                  order_index: maxOrder + i,
                  is_completed: false,
                  is_required: item.is_required || false,
                  is_custom: true,
                })
              )
            );
            onTasksChanged?.();
          }}
        />
      )}
    </div>
  );
}
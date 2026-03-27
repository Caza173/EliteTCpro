import React, { useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  CheckCircle2, Circle, AlertCircle, GripVertical,
  Plus, Trash2, Pencil, BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPhasesForType, normalizeTransactionType } from "@/lib/taskLibrary";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import TaskLibraryModal from "@/components/tasks/TaskLibraryModal";
import NotifyClientButton from "@/components/transactions/NotifyClientButton";

const VALID_PHASE_IDS = [
  "intake", "under_contract", "due_diligence", "financing",
  "closing", "post_close", "pre_listing", "active_listing", "pending",
];

function safePhaseId(phaseId) {
  if (!phaseId || !VALID_PHASE_IDS.includes(phaseId)) return "under_contract";
  return phaseId;
}

/**
 * PhaseTaskPanelV2
 *
 * Shows tasks for the selected phase with:
 * - Within-phase drag-and-drop reordering (persisted to DB)
 * - Cross-phase drag-and-drop (task.phase updated + order_index recalculated)
 * - Add task / From Library (assigned to selected phase, appended at end)
 * - Inline edit, delete
 *
 * tasks prop = ALL TransactionTask records for this transaction (all phases).
 * phaseNum = currently selected phase number.
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
}) {
  const allPhases = getPhasesForType(transactionType);
  const phaseDef = allPhases.find(p => p.phaseNum === phaseNum);
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [localTasks, setLocalTasks] = useState(null); // optimistic ordering
  const inputRef = useRef(null);

  if (!phaseDef) return null;

  // Use optimistic local state while dragging, fallback to server data
  const allTasks = localTasks || tasks;

  // Tasks for the selected phase, sorted by order_index
  const phaseTasks = allTasks
    .filter(t => t.phase === phaseNum)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

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

    // Parse droppable IDs: "phase-{phaseNum}"
    const srcPhaseNum = parseInt(source.droppableId.replace("phase-", ""), 10);
    const dstPhaseNum = parseInt(destination.droppableId.replace("phase-", ""), 10);

    if (srcPhaseNum === dstPhaseNum && source.index === destination.index) return;

    // Build a mutable copy of all tasks
    const updated = (localTasks || tasks).map(t => ({ ...t }));

    // Find the dragged task
    const srcPhaseTasks = updated
      .filter(t => t.phase === srcPhaseNum)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const draggedTask = srcPhaseTasks[source.index];
    if (!draggedTask) return;

    // Determine destination phase's phaseId for the task's phase field
    const dstPhaseDef = allPhases.find(p => p.phaseNum === dstPhaseNum);
    const newPhaseId = dstPhaseDef ? dstPhaseDef.phaseId : safePhaseId(null);

    // Remove from source phase
    srcPhaseTasks.splice(source.index, 1);

    // Get destination phase tasks (after removal if same phase)
    const dstPhaseTasks = dstPhaseNum === srcPhaseNum
      ? srcPhaseTasks
      : updated
          .filter(t => t.phase === dstPhaseNum && t.id !== draggedTask.id)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    // Insert at destination
    dstPhaseTasks.splice(destination.index, 0, {
      ...draggedTask,
      phase: dstPhaseNum,
    });

    // Reassign order_index for both affected phases
    const updates = [];
    srcPhaseTasks.forEach((t, i) => updates.push({ id: t.id, phase: srcPhaseNum, order_index: i }));
    if (dstPhaseNum !== srcPhaseNum) {
      dstPhaseTasks.forEach((t, i) => updates.push({ id: t.id, phase: dstPhaseNum, order_index: i }));
    } else {
      // Same phase — dstPhaseTasks already includes moved item, overwrite src updates
      dstPhaseTasks.forEach((t, i) => {
        const existing = updates.find(u => u.id === t.id);
        if (existing) { existing.order_index = i; existing.phase = dstPhaseNum; }
        else updates.push({ id: t.id, phase: dstPhaseNum, order_index: i });
      });
    }

    // Optimistic UI update
    const nextTasks = updated.map(t => {
      const upd = updates.find(u => u.id === t.id);
      return upd ? { ...t, phase: upd.phase, order_index: upd.order_index } : t;
    });
    setLocalTasks(nextTasks);

    // Persist to DB
    await Promise.all(
      updates.map(u => {
        const payload = { order_index: u.order_index };
        if (u.id === draggedTask.id && dstPhaseNum !== srcPhaseNum) {
          payload.phase = u.phase;
        }
        return base44.entities.TransactionTask.update(u.id, payload);
      })
    );

    setLocalTasks(null); // let server data take over
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

    const maxOrder = phaseTasks.length > 0
      ? Math.max(...phaseTasks.map(t => t.order_index ?? 0)) + 1
      : 0;

    // Deduplicate order values within phase
    const finalOrder = phaseTasks.some(t => t.order_index === maxOrder)
      ? phaseTasks.length
      : maxOrder;

    await Promise.all([
      base44.entities.TransactionTask.create({
        transaction_id: transactionId,
        brokerage_id: brokerageId,
        phase: phaseNum,
        title,
        order_index: finalOrder,
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
    const task = phaseTasks.find(t => t.id === taskId);
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {phaseDef.label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {progress.completed}/{progress.total} completed · {progress.requiredDone}/{progress.required} required
          </p>
        </div>
        {allRequiredDone && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              ✓ Phase complete
            </span>
            {transaction && (
              <NotifyClientButton
                transaction={transaction}
                phaseNum={phaseNum}
                phaseName={phaseDef.label}
              />
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${allRequiredDone ? "bg-emerald-400" : "bg-blue-400"}`}
          style={{ width: `${progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%` }}
        />
      </div>

      {/* Drag-and-drop context wraps just this phase's droppable */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`phase-${phaseNum}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-1.5 min-h-[32px] rounded-lg transition-colors ${
                snapshot.isDraggingOver ? "bg-blue-50/60 ring-1 ring-blue-200" : ""
              }`}
            >
              {phaseTasks.length === 0 && !snapshot.isDraggingOver && (
                <p className="text-xs text-gray-400 py-2 px-1">No tasks yet. Click + Add Task below.</p>
              )}

              {phaseTasks.map((task, index) => {
                const isAtRisk = !task.is_completed && task.due_date && new Date(task.due_date) < new Date();
                const isEditing = editingId === task.id;

                return (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-all group ${
                          snapshot.isDragging
                            ? "shadow-lg border-blue-300 bg-blue-50 opacity-90"
                            : task.is_completed
                            ? "bg-emerald-50/60 border-emerald-100"
                            : isAtRisk
                            ? "bg-red-50/50 border-red-100"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                        style={{
                          ...drag.draggableProps.style,
                          background: snapshot.isDragging
                            ? undefined
                            : task.is_completed
                            ? undefined
                            : "var(--card-bg)",
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
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {!isEditing && (
                            <button
                              onClick={() => { setEditingId(task.id); setEditDraft(task.title); }}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Edit title"
                            >
                              <Pencil className="w-3 h-3 text-gray-400" />
                            </button>
                          )}
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
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add task */}
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

      {/* Task Library Modal */}
      {libraryOpen && (
        <TaskLibraryModal
          phaseNum={phaseNum}
          brokerageId={brokerageId}
          onClose={() => setLibraryOpen(false)}
          onApply={async (items) => {
            const maxOrder = phaseTasks.length > 0
              ? Math.max(...phaseTasks.map(t => t.order_index ?? 0)) + 1
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
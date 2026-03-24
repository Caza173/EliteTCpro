import React, { useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { CheckCircle2, Circle, AlertCircle, GripVertical, Plus, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PHASE_MAP, getPhaseProgress } from "@/lib/taskLibrary";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function PhaseTaskPanelV2({
  phaseNum,
  tasks = [],           // TransactionTask records for this transaction
  onToggleTask,         // (taskId) => void  — keeps existing logic
  onTasksChanged,       // () => void — refetch signal
  transactionId,
  brokerageId,
}) {
  const phaseDef = PHASE_MAP[phaseNum];
  const queryClient = useQueryClient();
  const phaseTasks = tasks
    .filter(t => t.phase === phaseNum)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef(null);

  if (!phaseDef) return null;

  const progress = {
    total: phaseTasks.length,
    completed: phaseTasks.filter(t => t.is_completed).length,
    required: phaseTasks.filter(t => t.is_required).length,
    requiredDone: phaseTasks.filter(t => t.is_required && t.is_completed).length,
  };
  const allRequiredDone = progress.required > 0 && progress.requiredDone === progress.required;

  // ── Drag end ─────────────────────────────────────────────────────────────
  const handleDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(phaseTasks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    // Persist new order_index for each task
    await Promise.all(
      reordered.map((t, i) => base44.entities.TransactionTask.update(t.id, { order_index: i }))
    );
    onTasksChanged?.();
  };

  // ── Inline edit save ──────────────────────────────────────────────────────
  const saveEdit = async (taskId) => {
    if (editDraft.trim()) {
      await base44.entities.TransactionTask.update(taskId, { title: editDraft.trim() });
      onTasksChanged?.();
    }
    setEditingId(null);
  };

  // ── Add custom task ───────────────────────────────────────────────────────
  const handleAddTask = async () => {
    const title = newTitle.trim();
    if (!title) { setAddingTask(false); return; }
    const maxOrder = phaseTasks.length > 0 ? Math.max(...phaseTasks.map(t => t.order_index ?? 0)) + 1 : 0;
    await base44.entities.TransactionTask.create({
      transaction_id: transactionId,
      brokerage_id: brokerageId,
      phase: phaseNum,
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

  // ── Delete custom task ────────────────────────────────────────────────────
  const handleDelete = async (taskId) => {
    await base44.entities.TransactionTask.delete(taskId);
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

      {/* Drag-and-drop task list */}
      {phaseTasks.length === 0 && !addingTask ? (
        <p className="text-xs text-gray-400 py-2">No tasks yet. Click + Add Task below.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={`phase-${phaseNum}`}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
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
                            snapshot.isDragging ? "shadow-lg border-blue-300 bg-blue-50" :
                            task.is_completed ? "bg-emerald-50/60 border-emerald-100" :
                            isAtRisk ? "bg-red-50/50 border-red-100" :
                            "border-gray-100 hover:border-gray-200"
                          }`}
                          style={{ ...drag.draggableProps.style, background: snapshot.isDragging ? undefined : task.is_completed ? undefined : "var(--card-bg)" }}
                        >
                          {/* Drag handle */}
                          <div {...drag.dragHandleProps} className="cursor-grab flex-shrink-0 opacity-30 hover:opacity-60">
                            <GripVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>

                          {/* Toggle complete */}
                          <button
                            onClick={() => onToggleTask?.(task.id)}
                            className="flex-shrink-0"
                          >
                            {task.is_completed
                              ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              : isAtRisk
                              ? <AlertCircle className="w-5 h-5 text-red-400" />
                              : <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                            }
                          </button>

                          {/* Title — inline editable */}
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              className="flex-1 text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={editDraft}
                              onChange={e => setEditDraft(e.target.value)}
                              onBlur={() => saveEdit(task.id)}
                              onKeyDown={e => { if (e.key === "Enter") saveEdit(task.id); if (e.key === "Escape") setEditingId(null); }}
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`flex-1 text-sm font-medium ${task.is_completed ? "line-through text-gray-400" : "text-gray-700"}`}
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

                          {/* Actions (hover) */}
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
                            {task.is_custom && (
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="p-1 rounded hover:bg-red-50"
                                title="Delete task"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            )}
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
      )}

      {/* Add task input */}
      {addingTask ? (
        <div className="flex items-center gap-2 mt-1">
          <input
            className="flex-1 text-sm border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Task title..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAddTask(); if (e.key === "Escape") { setAddingTask(false); setNewTitle(""); } }}
            autoFocus
          />
          <button onClick={handleAddTask} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Add</button>
          <button onClick={() => { setAddingTask(false); setNewTitle(""); }} className="text-xs px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setAddingTask(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 mt-1 px-1 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Task
        </button>
      )}
    </div>
  );
}
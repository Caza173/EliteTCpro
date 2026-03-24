import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2, Check, X } from "lucide-react";
import { PHASE_MAP } from "@/lib/taskLibrary";

export default function TaskLibraryModal({ phaseNum, brokerageId, onApply, onClose }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { data: libraryItems = [] } = useQuery({
    queryKey: ["taskLibrary", brokerageId],
    queryFn: () => base44.entities.TaskLibraryItem.filter({ brokerage_id: brokerageId }),
    enabled: !!brokerageId,
  });

  // Filter to current phase or unassigned
  const phaseItems = libraryItems.filter(i => !i.phase || i.phase === phaseNum);
  const otherItems = libraryItems.filter(i => i.phase && i.phase !== phaseNum);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskLibraryItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taskLibrary", brokerageId] }),
  });

  const addToLibrary = async () => {
    const title = newTitle.trim();
    if (!title) return;
    await base44.entities.TaskLibraryItem.create({
      brokerage_id: brokerageId,
      title,
      phase: phaseNum,
      is_required: false,
    });
    setNewTitle("");
    queryClient.invalidateQueries({ queryKey: ["taskLibrary", brokerageId] });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleApply = () => {
    const selected = libraryItems.filter(i => selectedIds.has(i.id));
    onApply(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Task Library</h2>
            <span className="text-xs text-gray-400">— {PHASE_MAP[phaseNum]?.label}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Add new */}
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Add new task to library..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addToLibrary(); }}
            />
            <button
              onClick={addToLibrary}
              disabled={!newTitle.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" /> Save
            </button>
          </div>

          {/* This phase tasks */}
          {phaseItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">This Phase</p>
              <div className="space-y-1">
                {phaseItems.map(item => (
                  <LibraryRow
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                    onDelete={() => deleteMutation.mutate(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other phase tasks */}
          {otherItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Other Phases</p>
              <div className="space-y-1">
                {otherItems.map(item => (
                  <LibraryRow
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                    onDelete={() => deleteMutation.mutate(item.id)}
                    showPhase
                  />
                ))}
              </div>
            </div>
          )}

          {libraryItems.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No saved tasks yet. Add one above!</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleApply}
              disabled={selectedIds.size === 0}
              className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              Add to Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LibraryRow({ item, selected, onToggle, onDelete, showPhase }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
        selected ? "border-blue-300 bg-blue-50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
      }`}
      onClick={onToggle}
    >
      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
        selected ? "bg-blue-600 border-blue-600" : "border-gray-300"
      }`}>
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      <span className="flex-1 text-sm text-gray-700">{item.title}</span>
      {showPhase && (
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Phase {item.phase}</span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="p-0.5 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}
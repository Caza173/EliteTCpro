import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2, Check, X, Save, LayoutTemplate, ChevronRight } from "lucide-react";
import { getPhasesForType } from "@/lib/taskLibrary";

export default function TaskLibraryModal({ phaseNum, phaseLabel, brokerageId, transactionType, currentTasks = [], onApply, onClose }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("tasks"); // "tasks" | "templates"
  const [newTitle, setNewTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // ── Individual saved tasks ──────────────────────────────────────────────────
  const { data: libraryItems = [] } = useQuery({
    queryKey: ["taskLibrary", brokerageId],
    queryFn: () => base44.entities.TaskLibraryItem.filter({ brokerage_id: brokerageId }),
    enabled: !!brokerageId,
  });

  const phaseItems = libraryItems.filter(i => !i.phase || i.phase === phaseNum);
  const otherItems = libraryItems.filter(i => i.phase && i.phase !== phaseNum);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskLibraryItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taskLibrary", brokerageId] }),
  });

  const addToLibrary = async () => {
    const title = newTitle.trim();
    if (!title) return;
    await base44.entities.TaskLibraryItem.create({ brokerage_id: brokerageId, title, phase: phaseNum, is_required: false });
    setNewTitle("");
    queryClient.invalidateQueries({ queryKey: ["taskLibrary", brokerageId] });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleApplyTasks = () => {
    const selected = libraryItems.filter(i => selectedIds.has(i.id));
    onApply(selected.map(i => ({ title: i.title, required: i.is_required || false })));
    onClose();
  };

  // ── Templates ───────────────────────────────────────────────────────────────
  const { data: templates = [] } = useQuery({
    queryKey: ["taskTemplates", brokerageId, phaseNum],
    queryFn: () => base44.entities.TaskTemplate.filter({ brokerage_id: brokerageId, phase_num: phaseNum }),
    enabled: !!brokerageId && tab === "templates",
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taskTemplates", brokerageId, phaseNum] }),
  });

  const saveTemplate = async () => {
    const name = templateName.trim();
    if (!name || !currentTasks.length) return;
    setSavingTemplate(true);
    await base44.entities.TaskTemplate.create({
      brokerage_id: brokerageId,
      name,
      transaction_type: transactionType || "buyer",
      phase_num: phaseNum,
      phase_label: phaseLabel || `Phase ${phaseNum}`,
      tasks: currentTasks.map(t => ({ title: t.title, required: t.is_required || false })),
    });
    setTemplateName("");
    setSavingTemplate(false);
    queryClient.invalidateQueries({ queryKey: ["taskTemplates", brokerageId, phaseNum] });
  };

  const applyTemplate = (template) => {
    onApply(template.tasks, true); // true = replaceExisting
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Task Library</h2>
            {phaseLabel && <span className="text-xs text-gray-400">— {phaseLabel}</span>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("tasks")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === "tasks" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}
          >
            Saved Tasks
          </button>
          <button
            onClick={() => setTab("templates")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === "templates" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}
          >
            Phase Templates
          </button>
        </div>

        {/* ── Tab: Saved Tasks ── */}
        {tab === "tasks" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Add task to library..."
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

              {phaseItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">This Phase</p>
                  <div className="space-y-1">
                    {phaseItems.map(item => (
                      <LibraryRow key={item.id} item={item} selected={selectedIds.has(item.id)} onToggle={() => toggleSelect(item.id)} onDelete={() => deleteMutation.mutate(item.id)} />
                    ))}
                  </div>
                </div>
              )}

              {otherItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Other Phases</p>
                  <div className="space-y-1">
                    {otherItems.map(item => (
                      <LibraryRow key={item.id} item={item} selected={selectedIds.has(item.id)} onToggle={() => toggleSelect(item.id)} onDelete={() => deleteMutation.mutate(item.id)} showPhase />
                    ))}
                  </div>
                </div>
              )}

              {libraryItems.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No saved tasks yet. Add one above!</p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleApplyTasks} disabled={selectedIds.size === 0} className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40">
                  Add to Transaction
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Tab: Phase Templates ── */}
        {tab === "templates" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Save current as template */}
              {currentTasks.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5" /> Save current tasks as template
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      placeholder="Template name..."
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveTemplate(); }}
                    />
                    <button
                      onClick={saveTemplate}
                      disabled={!templateName.trim() || savingTemplate}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                  <p className="text-[10px] text-blue-500">{currentTasks.length} current tasks will be saved</p>
                </div>
              )}

              {/* Existing templates */}
              {templates.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Saved Templates</p>
                  <div className="space-y-2">
                    {templates.map(t => (
                      <div key={t.id} className="border border-gray-100 rounded-xl p-3 hover:border-blue-200 transition-colors group">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{t.tasks?.length || 0} tasks</span>
                            <button onClick={() => deleteTemplateMutation.mutate(t.id)} className="p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <ul className="space-y-0.5 mb-2.5">
                          {(t.tasks || []).slice(0, 4).map((task, i) => (
                            <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                              {task.title}
                            </li>
                          ))}
                          {(t.tasks || []).length > 4 && (
                            <li className="text-xs text-gray-400 italic">+{t.tasks.length - 4} more...</li>
                          )}
                        </ul>
                        <button
                          onClick={() => applyTemplate(t)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                        >
                          Apply Template <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <LayoutTemplate className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No templates saved yet.</p>
                  <p className="text-xs text-gray-300 mt-1">Save your current tasks as a template above.</p>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LibraryRow({ item, selected, onToggle, onDelete, showPhase }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors group ${selected ? "border-blue-300 bg-blue-50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
      onClick={onToggle}
    >
      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      <span className="flex-1 text-sm text-gray-700">{item.title}</span>
      {showPhase && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Phase {item.phase}</span>}
      <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-0.5 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}
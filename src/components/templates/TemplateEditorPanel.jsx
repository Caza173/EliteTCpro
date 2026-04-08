import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, GripVertical, CheckCircle2, Circle, Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const TX_TYPES = ["buyer", "seller", "land", "commercial", "multifamily", "dual", "lease"];
const ROLES = ["tc", "agent", "client"];
const ANCHORS = ["contract_date", "closing_date", "effective_date"];

const PHASE_OPTIONS = [
  "Pre-Contract",
  "Offer Drafting",
  "Offer Accepted / Under Contract",
  "Escrow Opened",
  "Due Diligence",
  "Inspection Period",
  "Repair Negotiation",
  "Appraisal Ordered",
  "Financing / Loan Processing",
  "Clear to Close",
  "Final Walkthrough",
  "Closing",
  "Post Closing",
  "Pre-Listing",
  "Active Listing",
  "Coming Soon",
  "Under Contract",
  "Expired / Withdrawn",
];

export default function TemplateEditorPanel({ template, onSave, onCancel }) {
  const [tpl, setTpl] = useState(() => JSON.parse(JSON.stringify(template)));
  const [saving, setSaving] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState(() => {
    const s = {};
    (template.phases || []).forEach(p => { s[p.phase_number] = true; });
    return s;
  });

  const update = (key, val) => setTpl(t => ({ ...t, [key]: val }));

  // Phases
  const addPhase = () => {
    const num = (tpl.phases || []).length + 1;
    update("phases", [...(tpl.phases || []), { phase_number: num, phase_name: `Phase ${num}`, phase_description: "" }]);
    setExpandedPhases(e => ({ ...e, [num]: true }));
  };
  const updatePhase = (idx, key, val) => {
    const phases = [...tpl.phases];
    phases[idx] = { ...phases[idx], [key]: val };
    update("phases", phases);
  };
  const deletePhase = (phaseNum) => {
    update("phases", tpl.phases.filter(p => p.phase_number !== phaseNum));
    update("tasks", (tpl.tasks || []).filter(t => t.phase_number !== phaseNum));
  };

  // Tasks
  const addTask = (phaseNum) => {
    const id = `t_${Date.now()}`;
    update("tasks", [...(tpl.tasks || []), {
      id, phase_number: phaseNum, task_name: "New Task", required: true, default_assignee_role: "tc", status: "pending"
    }]);
  };
  const updateTask = (idx, key, val) => {
    const tasks = [...tpl.tasks];
    tasks[idx] = { ...tasks[idx], [key]: val };
    update("tasks", tasks);
  };
  const deleteTask = (idx) => {
    update("tasks", tpl.tasks.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!tpl.name?.trim()) { toast.error("Template name required"); return; }
    setSaving(true);
    if (tpl.id) {
      await base44.entities.WorkflowTemplate.update(tpl.id, tpl);
    } else {
      await base44.entities.WorkflowTemplate.create(tpl);
    }
    setSaving(false);
    onSave(tpl);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500 -ml-2 h-8">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-lg font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
          {tpl.id ? "Edit Template" : "New Template"}
        </h1>
        <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Template
        </Button>
      </div>

      {/* Meta */}
      <div className="theme-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Template Name *</label>
          <input
            className="w-full text-sm rounded-lg px-3 py-2 border outline-none focus:ring-2 focus:ring-blue-300"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            value={tpl.name}
            onChange={e => update("name", e.target.value)}
            placeholder="e.g. NH Buyer Standard Workflow"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Transaction Type</label>
          <select
            className="w-full text-sm rounded-lg px-3 py-2 border outline-none capitalize"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            value={tpl.transaction_type}
            onChange={e => update("transaction_type", e.target.value)}
          >
            {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!tpl.is_default}
              onChange={e => update("is_default", e.target.checked)}
              className="rounded" />
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Set as default for this transaction type</span>
          </label>
        </div>
      </div>

      {/* Phases + Tasks */}
      <div className="theme-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--card-border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Phases & Tasks</h3>
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addPhase}>
            <Plus className="w-3.5 h-3.5" /> Add Phase
          </Button>
        </div>

        {(tpl.phases || []).length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No phases yet. Click "Add Phase" to get started.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
            {(tpl.phases || []).map((phase, pi) => {
              const phaseTasks = (tpl.tasks || []).filter(t => t.phase_number === phase.phase_number);
              const isExpanded = expandedPhases[phase.phase_number];
              return (
                <div key={phase.phase_number}>
                  {/* Phase header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/60">
                    <button onClick={() => setExpandedPhases(e => ({ ...e, [phase.phase_number]: !e[phase.phase_number] }))}>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {phase.phase_number}
                    </span>
                    <select
                      className="flex-1 text-sm font-semibold bg-transparent border-none outline-none rounded cursor-pointer"
                      style={{ color: "var(--text-primary)", background: "transparent" }}
                      value={phase.phase_name}
                      onChange={e => updatePhase(pi, "phase_name", e.target.value)}
                    >
                      {PHASE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      {!PHASE_OPTIONS.includes(phase.phase_name) && (
                        <option value={phase.phase_name}>{phase.phase_name}</option>
                      )}
                    </select>
                    <span className="text-xs mr-2" style={{ color: "var(--text-muted)" }}>{phaseTasks.length} task{phaseTasks.length !== 1 ? "s" : ""}</span>
                    <button onClick={() => addTask(phase.phase_number)} className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-0.5 rounded hover:bg-blue-50">
                      + Task
                    </button>
                    <button onClick={() => deletePhase(phase.phase_number)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tasks */}
                  {isExpanded && (
                    <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                      {phaseTasks.length === 0 && (
                        <div className="px-10 py-3 text-xs" style={{ color: "var(--text-muted)" }}>No tasks yet — click "+ Task" above.</div>
                      )}
                      {phaseTasks.map((task) => {
                        const globalIdx = (tpl.tasks || []).findIndex(t => t.id === task.id);
                        return (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onChange={(key, val) => updateTask(globalIdx, key, val)}
                            onDelete={() => deleteTask(globalIdx)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Doc Checklist */}
      <DocChecklistSection
        items={tpl.doc_checklist || []}
        onChange={val => update("doc_checklist", val)}
      />

      {/* Compliance Rules (read-only summary) */}
      {(tpl.compliance_rules || []).length > 0 && (
        <div className="theme-card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Compliance Rules</h3>
          <div className="space-y-2">
            {tpl.compliance_rules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${
                  r.severity === "blocker" ? "bg-red-100 text-red-700" :
                  r.severity === "warning" ? "bg-amber-100 text-amber-700" :
                  "bg-blue-100 text-blue-700"
                }`}>{r.severity}</span>
                <span style={{ color: "var(--text-secondary)" }}>{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pb-8">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Template
        </Button>
      </div>
    </div>
  );
}

function TaskRow({ task, onChange, onDelete }) {
  return (
    <div className="flex items-start gap-2 px-10 py-2.5 hover:bg-gray-50/50 group">
      <button onClick={() => onChange("required", !task.required)} className="mt-0.5 flex-shrink-0">
        {task.required
          ? <CheckCircle2 className="w-4 h-4 text-blue-500" />
          : <Circle className="w-4 h-4 text-gray-300" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <input
          className="w-full text-sm bg-transparent border-none outline-none"
          style={{ color: "var(--text-primary)" }}
          value={task.task_name}
          onChange={e => onChange("task_name", e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="text-xs rounded px-1.5 py-0.5 border"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-muted)" }}
            value={task.default_assignee_role || "tc"}
            onChange={e => onChange("default_assignee_role", e.target.value)}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              className="w-14 text-xs rounded px-1.5 py-0.5 border"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-muted)" }}
              placeholder="+days"
              value={task.due_offset_days || ""}
              onChange={e => onChange("due_offset_days", e.target.value ? Number(e.target.value) : null)}
            />
            <select
              className="text-xs rounded px-1.5 py-0.5 border"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-muted)" }}
              value={task.due_anchor || "contract_date"}
              onChange={e => onChange("due_anchor", e.target.value)}
            >
              {ANCHORS.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          {!task.required && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">optional</span>
          )}
        </div>
      </div>
      <button onClick={onDelete} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DocChecklistSection({ items, onChange }) {
  const addItem = () => {
    onChange([...items, { id: `dc_${Date.now()}`, doc_type: "New Document", required: true, required_by_phase: 1 }]);
  };
  const updateItem = (idx, key, val) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: val };
    onChange(updated);
  };
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="theme-card overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--card-border)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Document Checklist</h3>
        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addItem}>
          <Plus className="w-3.5 h-3.5" /> Add Doc
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>No checklist items yet.</div>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-gray-50/50">
              <button onClick={() => updateItem(idx, "required", !item.required)} className="flex-shrink-0">
                {item.required
                  ? <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  : <Circle className="w-4 h-4 text-gray-300" />}
              </button>
              <input
                className="flex-1 text-sm bg-transparent border-none outline-none"
                style={{ color: "var(--text-primary)" }}
                value={item.doc_type}
                onChange={e => updateItem(idx, "doc_type", e.target.value)}
              />
              <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>Phase</span>
                <input
                  type="number"
                  className="w-10 text-xs rounded px-1.5 py-0.5 border"
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-muted)" }}
                  value={item.required_by_phase || 1}
                  onChange={e => updateItem(idx, "required_by_phase", Number(e.target.value))}
                />
              </div>
              <button onClick={() => removeItem(idx)} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
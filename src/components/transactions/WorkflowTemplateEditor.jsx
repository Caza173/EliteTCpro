import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  X, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Save, Loader2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPhasesForType, normalizeTransactionType } from "@/lib/taskLibrary";

// Default tasks mirroring createTransaction backend
const DEFAULT_TEMPLATE_TASKS = {
  buyer_under_contract: {
    1: [
      { title: "Upload Executed Purchase & Sales Agreement", required: true },
      { title: "Verify Effective Date", required: true },
      { title: "Verify Closing Date", required: true },
      { title: "Verify Earnest Money Amount", required: true },
      { title: "Verify Escrow Holder", required: true },
      { title: "Verify Buyer Agency Agreement", required: true },
      { title: "Verify Brokerage Disclosure", required: true },
      { title: "Verify Pre-Approval or Proof of Funds", required: true },
      { title: "Create Transaction Record", required: true },
      { title: "Add Buyer Contact Information", required: true },
      { title: "Add Seller Contact Information", required: true },
      { title: "Add Lender", required: false },
      { title: "Add Title Company", required: true },
      { title: "Send Introduction Email", required: true },
      { title: "Send Wire Fraud Notice", required: true },
      { title: "Deliver Earnest Money", required: true },
      { title: "Verify Earnest Money Receipt", required: true },
      { title: "Upload Property Disclosure", required: false },
      { title: "Upload Lead Paint Disclosure", required: false },
      { title: "Upload HOA Documents", required: false },
    ],
    2: [
      { title: "Schedule Home Inspection", required: true },
      { title: "Complete Home Inspection", required: true },
      { title: "Upload Inspection Report", required: true },
      { title: "Schedule Septic Inspection", required: false },
      { title: "Schedule Water Test", required: false },
      { title: "Schedule Radon Test", required: false },
      { title: "Review Inspection Results", required: true },
      { title: "Prepare Inspection Addendum", required: false },
      { title: "Negotiate Repairs", required: false },
      { title: "Upload Signed Addendum", required: false },
      { title: "Remove Inspection Contingency", required: true },
      { title: "Review Title Commitment", required: true },
      { title: "Review Easements", required: false },
      { title: "Review Survey", required: false },
      { title: "Review HOA Documents", required: false },
      { title: "Review Restrictive Covenants", required: false },
    ],
    3: [
      { title: "Loan Application Submitted", required: true },
      { title: "Loan Disclosures Signed", required: true },
      { title: "Processing Started", required: false },
      { title: "Appraisal Ordered", required: true },
      { title: "Appraisal Completed", required: true },
      { title: "Appraisal Received", required: true },
      { title: "Appraisal Contingency Removed", required: false },
      { title: "Homeowners Insurance Obtained", required: false },
      { title: "Title Search Complete", required: true },
      { title: "Conditional Approval Received", required: true },
      { title: "Conditions Submitted", required: false },
      { title: "Clear To Close Received", required: true },
      { title: "Confirm Buyer Funds", required: true },
      { title: "Confirm Wire Instructions", required: true },
      { title: "Confirm Closing Date", required: true },
    ],
    4: [
      { title: "Schedule Final Walkthrough", required: true },
      { title: "Complete Walkthrough", required: true },
      { title: "Review Closing Disclosure", required: true },
      { title: "Confirm Cash To Close", required: true },
      { title: "Confirm Seller Proceeds", required: false },
      { title: "Confirm Attorney Appointment", required: false },
      { title: "Confirm Closing Package", required: true },
      { title: "Closing Complete", required: true },
      { title: "Funds Disbursed", required: true },
      { title: "Deed Recorded", required: false },
      { title: "Keys Delivered", required: true },
    ],
    5: [
      { title: "Upload Closing Disclosure", required: true },
      { title: "Upload ALTA", required: false },
      { title: "Upload Recorded Deed", required: false },
      { title: "Upload Commission Statement", required: true },
      { title: "Submit Compliance File", required: true },
      { title: "Archive Transaction", required: false },
      { title: "Send Congratulations Email", required: true },
      { title: "Send Client Gift", required: false },
      { title: "Request Review", required: false },
      { title: "Request Testimonial", required: false },
      { title: "Add To Post-Close Campaign", required: false },
      { title: "Schedule 30-Day Follow-Up", required: true },
      { title: "Schedule 6-Month Follow-Up", required: false },
      { title: "Schedule Annual Follow-Up", required: false },
    ],
  },
};

function TaskItem({ task, onUpdate, onDelete }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg group" style={{ background: "var(--bg-secondary)" }}>
      <GripVertical className="w-3 h-3 flex-shrink-0 opacity-30" style={{ color: "var(--text-muted)" }} />
      <input
        className="flex-1 text-xs bg-transparent border-none outline-none"
        style={{ color: "var(--text-primary)" }}
        value={task.title}
        onChange={e => onUpdate({ ...task, title: e.target.value })}
      />
      <button
        onClick={() => onUpdate({ ...task, required: !task.required })}
        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 transition-colors ${
          task.required
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
            : "border text-gray-500"
        }`}
        style={{ borderColor: task.required ? undefined : "var(--border)" }}
        title="Toggle required"
      >
        REQ
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 transition-all flex-shrink-0"
      >
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}

function PhaseSection({ phase, tasks, onAddTask, onUpdateTask, onDeleteTask, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    if (!newTitle.trim()) { setAdding(false); return; }
    onAddTask(phase.phaseNum, newTitle.trim());
    setNewTitle("");
    setAdding(false);
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{phase.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
            {tasks.length} tasks
          </span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {tasks.map((task, idx) => (
            <TaskItem
              key={idx}
              task={task}
              onUpdate={updated => onUpdateTask(phase.phaseNum, idx, updated)}
              onDelete={() => onDeleteTask(phase.phaseNum, idx)}
            />
          ))}

          {adding ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                autoFocus
                className="flex-1 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                style={{ border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
                placeholder="New task title..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
                }}
              />
              <button onClick={handleAdd} className="text-[10px] font-semibold px-2 py-1.5 rounded bg-blue-600 text-white">Add</button>
              <button onClick={() => { setAdding(false); setNewTitle(""); }} className="text-[10px] px-1.5 py-1.5 rounded" style={{ color: "var(--text-muted)" }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:text-blue-400 px-1 py-1 rounded mt-1"
            >
              <Plus className="w-3 h-3" /> Add Task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkflowTemplateEditor({ transactionType, brokerageId, currentUser, onClose }) {
  const normalized = normalizeTransactionType(transactionType);
  const phases = getPhasesForType(transactionType);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Build initial tasks state from defaults
  const buildInitialTasks = () => {
    const map = {};
    const defaults = DEFAULT_TEMPLATE_TASKS[normalized] || DEFAULT_TEMPLATE_TASKS.buyer_under_contract;
    phases.forEach(phase => {
      map[phase.phaseNum] = (defaults[phase.phaseNum] || []).map(t => ({ ...t }));
    });
    return map;
  };

  const [tasksByPhase, setTasksByPhase] = useState(buildInitialTasks);
  const [loading, setLoading] = useState(true);

  // Load existing brokerage template if available
  useEffect(() => {
    if (!brokerageId) { setLoading(false); return; }
    base44.entities.WorkflowTemplate.filter({ brokerage_id: brokerageId, transaction_type: normalized })
      .then(templates => {
        if (templates && templates.length > 0) {
          const t = templates[0];
          if (t.phases && Array.isArray(t.phases)) {
            const map = {};
            t.phases.forEach(p => {
              map[p.phase_num] = (p.tasks || []).map(task => ({ title: task.title, required: task.required }));
            });
            setTasksByPhase(map);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [brokerageId, normalized]);

  const handleAddTask = (phaseNum, title) => {
    setTasksByPhase(prev => ({
      ...prev,
      [phaseNum]: [...(prev[phaseNum] || []), { title, required: false }],
    }));
  };

  const handleUpdateTask = (phaseNum, idx, updated) => {
    setTasksByPhase(prev => {
      const tasks = [...(prev[phaseNum] || [])];
      tasks[idx] = updated;
      return { ...prev, [phaseNum]: tasks };
    });
  };

  const handleDeleteTask = (phaseNum, idx) => {
    setTasksByPhase(prev => {
      const tasks = [...(prev[phaseNum] || [])];
      tasks.splice(idx, 1);
      return { ...prev, [phaseNum]: tasks };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const phasesPayload = phases.map(phase => ({
        phase_num: phase.phaseNum,
        phase_id: phase.phaseId,
        label: phase.label,
        tasks: (tasksByPhase[phase.phaseNum] || []).map((task, i) => ({
          title: task.title,
          required: task.required,
          sort_order: i,
          auto_generated: false,
        })),
      }));

      // Upsert: check if existing template
      let existing = null;
      if (brokerageId) {
        const existing_list = await base44.entities.WorkflowTemplate.filter({
          brokerage_id: brokerageId,
          transaction_type: normalized,
        });
        existing = existing_list?.[0] || null;
      }

      if (existing) {
        await base44.entities.WorkflowTemplate.update(existing.id, {
          phases: phasesPayload,
          updated_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.WorkflowTemplate.create({
          name: `${normalized === "buyer_under_contract" ? "Buyer" : "Listing"} Default Template`,
          transaction_type: normalized,
          brokerage_id: brokerageId || null,
          created_by: currentUser?.id || null,
          phases: phasesPayload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err) {
      console.error("[WorkflowTemplateEditor] save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = ["admin", "owner", "super_admin"].includes(currentUser?.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-base font-bold font-serif" style={{ color: "var(--text-primary)" }}>Workflow Template</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {isAdmin ? "Edit default tasks for new transactions" : "View default task template"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : (
            phases.map((phase, i) => (
              <PhaseSection
                key={phase.phaseNum}
                phase={phase}
                tasks={tasksByPhase[phase.phaseNum] || []}
                onAddTask={isAdmin ? handleAddTask : () => {}}
                onUpdateTask={isAdmin ? handleUpdateTask : () => {}}
                onDeleteTask={isAdmin ? handleDeleteTask : () => {}}
                defaultOpen={i === 0}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Changes apply to new transactions only
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs rounded-lg border"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || saved}
                style={{ background: saved ? "#22c55e" : "#d2a35f", color: "#050506", fontWeight: 600 }}
                className="gap-1.5"
              >
                {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><Save className="w-3.5 h-3.5" /> Save Template</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
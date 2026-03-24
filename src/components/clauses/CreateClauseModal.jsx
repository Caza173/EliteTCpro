import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
  { id: "deadline",   label: "Deadline" },
  { id: "financial",  label: "Financial" },
  { id: "inspection", label: "Inspection" },
  { id: "title",      label: "Title" },
  { id: "legal",      label: "Contingency" },
  { id: "occupancy",  label: "Occupancy" },
  { id: "custom",     label: "Custom" },
];

const TYPES = [
  { id: "extension",    label: "Extension" },
  { id: "modification", label: "Modification" },
  { id: "contingency",  label: "Contingency" },
  { id: "disclosure",   label: "Disclosure" },
  { id: "addendum",     label: "Addendum" },
];

export default function CreateClauseModal({ onClose, onSaved, brokerageId, editClause = null }) {
  const isEdit = !!editClause;
  const [form, setForm] = useState({
    name: editClause?.name || "",
    category: editClause?.category || "custom",
    type: editClause?.type || "modification",
    use_case: editClause?.use_case || "",
    text: editClause?.text || "",
    tags: editClause?.tags || [],
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  };

  const removeTag = (t) => set("tags", form.tags.filter(x => x !== t));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Clause Name is required."); return; }
    if (!form.text.trim()) { setError("Clause Text is required."); return; }
    setSaving(true);
    const data = { ...form, brokerage_id: brokerageId, is_system: false };
    if (isEdit) {
      await base44.entities.Clause.update(editClause.id, data);
    } else {
      await base44.entities.Clause.create(data);
    }
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">{isEdit ? "Edit Clause" : "New Custom Clause"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <Label className="text-xs font-medium text-gray-600">Clause Name *</Label>
            <Input className="mt-1" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Custom Repair Agreement" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600">Category</Label>
              <select
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                value={form.category} onChange={e => set("category", e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Clause Type</Label>
              <select
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                value={form.type} onChange={e => set("type", e.target.value)}
              >
                {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600">Use Case <span className="text-gray-400">(optional)</span></Label>
            <Input className="mt-1" value={form.use_case} onChange={e => set("use_case", e.target.value)} placeholder="When is this clause used?" />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600">Tags <span className="text-gray-400">(optional)</span></Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="Type tag and press Enter"
              />
              <button onClick={addTag} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600">Clause Text *</Label>
            <textarea
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
              rows={7}
              value={form.text}
              onChange={e => set("text", e.target.value)}
              placeholder="Enter the full clause text. Use [Placeholder] for variable fields (e.g. [Property Address], [Buyer Name])."
            />
            <p className="text-[10px] text-gray-400 mt-1">Tip: Use [Buyer Name], [Property Address], [Closing Date] for auto-fill.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Clause"}
          </button>
        </div>
      </div>
    </div>
  );
}
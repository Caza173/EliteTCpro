import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const TARGET_ROLES = ["TC", "Agent", "Client", "Admin", "Multiple roles"];
const FREQUENCIES = ["Every transaction", "Weekly", "Occasionally", "Rarely"];
const VALUE_OPTIONS = [
  "Save time", "Reduce compliance risk", "Reduce missed deadlines",
  "Improve communication", "Improve reporting", "Improve client experience", "Other"
];

export default function FeatureRequestForm({ onSubmit, submitting }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    current_behavior: "",
    target_role: "",
    request_frequency: "",
    value_tags: [],
    current_behavior: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      value_tags: f.value_tags.includes(tag) ? f.value_tags.filter(t => t !== tag) : [...f.value_tags, tag]
    }));
  };

  const valid = form.title && form.description && form.target_role && form.request_frequency;

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) onSubmit(form); }} className="space-y-4">
      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Feature Name *</Label>
        <Input placeholder="e.g. Bulk deadline editor" value={form.title} onChange={e => set("title", e.target.value)} required className="text-sm" />
      </div>

      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>What problem does this solve? *</Label>
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
          rows={3} placeholder="Describe the pain point…" value={form.description}
          onChange={e => set("description", e.target.value)} required
        />
      </div>

      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>How are you handling this today?</Label>
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
          rows={2} placeholder="Manual workaround, spreadsheet, etc." value={form.current_behavior}
          onChange={e => set("current_behavior", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Who is this for? *</Label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            value={form.target_role} onChange={e => set("target_role", e.target.value)} required
          >
            <option value="">Select…</option>
            {TARGET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>How often? *</Label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            value={form.request_frequency} onChange={e => set("request_frequency", e.target.value)} required
          >
            <option value="">Select…</option>
            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>This would… (select all that apply)</Label>
        <div className="flex flex-wrap gap-2">
          {VALUE_OPTIONS.map(tag => (
            <button
              key={tag} type="button"
              onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-all ${
                form.value_tags.includes(tag) ? "bg-amber-100 border-amber-400 text-amber-800" : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
              style={!form.value_tags.includes(tag) ? { borderColor: "var(--card-border)", color: "var(--text-muted)" } : {}}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={!valid || submitting} className="w-full bg-amber-600 hover:bg-amber-700 mt-2">
        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit Feature Request"}
      </Button>
    </form>
  );
}
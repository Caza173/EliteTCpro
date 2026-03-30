import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const CATEGORIES = ["Transaction Management", "CRM", "Accounting", "Calendar", "E-signature", "Email", "MLS / Data", "Storage / Documents", "Other"];
const SYNC_ITEMS = ["Contacts", "Documents", "Deadlines", "Tasks", "Financials", "Notes", "Emails", "Compliance status", "Other"];
const PRIORITIES = [
  { value: "nice_to_have", label: "Nice to have" },
  { value: "important", label: "Important" },
  { value: "required", label: "Required for workflow" },
];

export default function IntegrationRequestForm({ onSubmit, submitting }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    integration_category: "",
    requested_sync_items: [],
    severity: "medium",
    current_behavior: "",
    requested_platform: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSync = (item) => {
    setForm(f => ({
      ...f,
      requested_sync_items: f.requested_sync_items.includes(item)
        ? f.requested_sync_items.filter(i => i !== item)
        : [...f.requested_sync_items, item]
    }));
  };

  const valid = form.requested_platform && form.description && form.severity;

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) onSubmit({ ...form, title: form.title || `Integration: ${form.requested_platform}` }); }} className="space-y-4">
      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Platform / Tool Name *</Label>
        <Input
          placeholder="e.g. QuickBooks, Dotloop, Salesforce"
          value={form.requested_platform}
          onChange={e => set("requested_platform", e.target.value)}
          required className="text-sm"
        />
      </div>

      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Category</Label>
        <select
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
          value={form.integration_category} onChange={e => set("integration_category", e.target.value)}
        >
          <option value="">Select category…</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>What should it do? *</Label>
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
          rows={3} placeholder="Describe the integration use case…" value={form.description}
          onChange={e => set("description", e.target.value)} required
        />
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>What should sync? (select all that apply)</Label>
        <div className="flex flex-wrap gap-2">
          {SYNC_ITEMS.map(item => (
            <button
              key={item} type="button"
              onClick={() => toggleSync(item)}
              className={`px-2.5 py-1 rounded-full text-xs border font-medium transition-all ${
                form.requested_sync_items.includes(item) ? "bg-purple-100 border-purple-400 text-purple-800" : "border-gray-200 text-gray-500"
              }`}
              style={!form.requested_sync_items.includes(item) ? { borderColor: "var(--card-border)", color: "var(--text-muted)" } : {}}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Priority *</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map(p => (
            <button
              key={p.value} type="button"
              onClick={() => set("severity", p.value === "required" ? "critical" : p.value === "important" ? "high" : "low")}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all text-center ${
                (p.value === "required" && form.severity === "critical") ||
                (p.value === "important" && form.severity === "high") ||
                (p.value === "nice_to_have" && form.severity === "low")
                  ? "border-purple-400 bg-purple-50 text-purple-800"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
              style={{ borderColor: "var(--card-border)" }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Additional notes</Label>
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
          rows={2} placeholder="Any other details…" value={form.current_behavior}
          onChange={e => set("current_behavior", e.target.value)}
        />
      </div>

      <Button type="submit" disabled={!valid || submitting} className="w-full bg-purple-600 hover:bg-purple-700 mt-2">
        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit Integration Request"}
      </Button>
    </form>
  );
}
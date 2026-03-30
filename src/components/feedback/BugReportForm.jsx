import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const MODULES = ["Dashboard", "Transaction Page", "Tasks", "Deadlines", "Documents", "Compliance", "Calendar", "Email / Notifications", "AI Assistant", "Settings", "Other"];
const SEVERITIES = [
  { value: "critical", label: "Critical", desc: "App is broken / data loss risk" },
  { value: "high", label: "High", desc: "Major workflow blocked" },
  { value: "medium", label: "Medium", desc: "Frustrating but workable" },
  { value: "low", label: "Low", desc: "Minor annoyance" },
];
const REPRO = ["Always", "Sometimes", "Once", "Not sure"];

export default function BugReportForm({ context = {}, onSubmit, submitting }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    expected_behavior: "",
    module: context.route_name || "",
    severity: "medium",
    reproducibility: "",
    transaction_id: context.transaction_id || "",
    transaction_address: context.transaction_address || "",
    document_id: context.document_id || "",
    current_behavior: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title && form.description && form.expected_behavior && form.module && form.severity;

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) onSubmit(form); }} className="space-y-4">
      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Bug Title *</Label>
        <Input placeholder="e.g. Inspection deadline not saving" value={form.title} onChange={e => set("title", e.target.value)} required className="text-sm" />
      </div>

      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>What happened? *</Label>
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
          rows={3} placeholder="Describe what went wrong..." value={form.description}
          onChange={e => set("description", e.target.value)} required
        />
      </div>

      <div>
        <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>What should have happened? *</Label>
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
          rows={2} placeholder="Expected behavior..." value={form.expected_behavior}
          onChange={e => set("expected_behavior", e.target.value)} required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Where? *</Label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            value={form.module} onChange={e => set("module", e.target.value)} required
          >
            <option value="">Select module…</option>
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Can you reproduce? </Label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            value={form.reproducibility} onChange={e => set("reproducibility", e.target.value)}
          >
            <option value="">Select…</option>
            {REPRO.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Severity */}
      <div>
        <Label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Severity *</Label>
        <div className="grid grid-cols-2 gap-2">
          {SEVERITIES.map(s => (
            <button
              key={s.value} type="button"
              onClick={() => set("severity", s.value)}
              className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                form.severity === s.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
              style={form.severity !== s.value ? { borderColor: "var(--card-border)", background: "var(--bg-tertiary)" } : {}}
            >
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{s.label}</p>
              <p style={{ color: "var(--text-muted)" }}>{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Linked context (prefilled, editable) */}
      {(context.transaction_id || context.transaction_address) && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}>
          <span className="font-semibold">Context auto-attached:</span> {context.transaction_address || context.transaction_id}
          {context.document_id && ` · Doc: ${context.document_id}`}
        </div>
      )}

      <Button type="submit" disabled={!valid || submitting} className="w-full bg-red-600 hover:bg-red-700 mt-2">
        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit Bug Report"}
      </Button>
    </form>
  );
}
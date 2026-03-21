import React from "react";
import { Input } from "@/components/ui/input";
import { GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function ClauseInputForm({ clause, values = {}, onChange, onRemove, expanded, onToggle }) {
  const handleChange = (key, value) => {
    onChange?.({ ...values, [key]: value });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        style={{ background: "var(--bg-tertiary)", borderBottom: expanded ? "1px solid var(--border)" : "none" }}
        onClick={onToggle}
      >
        <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <span className="text-xs font-semibold flex-1 truncate" style={{ color: "var(--text-primary)" }}>{clause.name}</span>
        <button
          onClick={e => { e.stopPropagation(); onRemove?.(); }}
          className="p-1 rounded hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
      </div>

      {/* Fields */}
      {expanded && (
        <div className="p-3 space-y-3">
          {clause.requiredInputs.map(input => (
            <div key={input.key}>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                {input.label}
              </label>
              <Input
                type={input.type === "date" ? "date" : input.type === "number" || input.type === "currency" ? "number" : "text"}
                placeholder={input.type === "currency" ? "$0.00" : input.label}
                value={values[input.key] || ""}
                onChange={e => handleChange(input.key, e.target.value)}
                className="h-8 text-xs"
                step={input.type === "currency" ? "0.01" : undefined}
                min={input.type === "number" || input.type === "currency" ? "0" : undefined}
              />
            </div>
          ))}

          {/* Live preview */}
          <div>
            <p className="text-[11px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Preview</p>
            <div className="rounded-lg p-3 text-[11px] leading-relaxed whitespace-pre-wrap"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {renderPreview(clause.bodyTemplate, values)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderPreview(template, values) {
  let out = template;
  for (const [k, v] of Object.entries(values)) {
    out = out.replace(new RegExp(`\\[${k}\\]`, "g"), v ? `[${v}]` : `[${k}]`);
  }
  // highlight remaining unfilled placeholders
  return out;
}
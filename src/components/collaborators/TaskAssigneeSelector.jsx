import React, { useState } from "react";
import { User, ChevronDown } from "lucide-react";

function Initials({ name }) {
  if (!name) return null;
  const parts = name.split(" ");
  const init = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
      style={{ backgroundColor: "var(--accent-subtle)", color: "var(--accent)" }}
      title={name}
    >
      {init}
    </div>
  );
}

export default function TaskAssigneeSelector({ task, collaborators = [], onAssign, disabled }) {
  const [open, setOpen] = useState(false);

  const assigned = collaborators.find(c => c.user_email === task.assigned_to_email);
  const assignedLabel = assigned?.user_name || task.assigned_to_email || null;

  if (disabled) {
    return assignedLabel ? (
      <div className="flex items-center gap-1">
        <Initials name={assignedLabel} />
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{assignedLabel.split(" ")[0]}</span>
      </div>
    ) : null;
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors hover:opacity-70"
        style={{
          backgroundColor: assignedLabel ? "var(--accent-subtle)" : "transparent",
          color: "var(--text-muted)",
        }}
        title={assignedLabel ? `Assigned to ${assignedLabel}` : "Assign task"}
      >
        {assignedLabel ? <Initials name={assignedLabel} /> : <User className="w-3.5 h-3.5" />}
        {assignedLabel && (
          <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>
            {assignedLabel.split(" ")[0]}
          </span>
        )}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-7 z-50 rounded-xl border shadow-lg py-1 min-w-[160px]"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1" style={{ color: "var(--text-muted)" }}>
              Assign to
            </p>
            <button
              onClick={() => { onAssign(null); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
            >
              <User className="w-3 h-3" /> Unassigned
              {!task.assigned_to_email && " ✓"}
            </button>
            {collaborators.filter(c => c.status === "active" && c.role !== "viewer_tc").map(collab => (
              <button
                key={collab.id}
                onClick={() => { onAssign(collab); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:opacity-80"
                style={{ color: "var(--text-primary)" }}
              >
                <Initials name={collab.user_name} />
                <span className="truncate">{collab.user_name || collab.user_email}</span>
                {task.assigned_to_email === collab.user_email && " ✓"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
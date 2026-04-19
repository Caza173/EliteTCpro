/**
 * InspectionPanel
 * Clearly separates:
 *  - Inspection Deadline (contractual, date-only, parsed from contract)
 *  - Inspection Scheduled (manual user input, datetime)
 *  - Inspection Completed (manual user input, datetime)
 *
 * Rules enforced:
 *  - Never auto-populates inspectionScheduled from contract data
 *  - Flags if scheduled datetime is after the contractual deadline date
 *  - Flags if deadline has passed and inspection is not completed
 *  - Suppresses deadline warnings once inspectionCompleted is set
 */
import React, { useState } from "react";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { AlertTriangle, CheckCircle2, Calendar, Clock, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fmtDate(d) {
  if (!d) return null;
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function fmtDateTime(dt) {
  if (!dt) return null;
  try { return format(new Date(dt), "MMM d, yyyy h:mm a"); } catch { return dt; }
}

function EditableDate({ value, onSave, label, placeholder = "Set date", readOnlyNote }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) onSave(draft || null);
  };

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
      {readOnlyNote && <p className="text-[10px] italic" style={{ color: "var(--text-muted)" }}>{readOnlyNote}</p>}
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="h-7 text-xs"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={handleSave}><Check className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400" onClick={() => { setEditing(false); setDraft(value || ""); }}><X className="w-3.5 h-3.5" /></Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => { setDraft(value || ""); setEditing(true); }}>
          <span className="text-sm font-medium" style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}>
            {value ? fmtDate(value) : <span className="italic">{placeholder}</span>}
          </span>
          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        </div>
      )}
    </div>
  );
}

function EditableDateTime({ value, onSave, label, placeholder = "Set date & time" }) {
  const [editing, setEditing] = useState(false);
  // datetime-local input needs "YYYY-MM-DDTHH:MM" format
  const toInputVal = (v) => {
    if (!v) return "";
    try { return format(new Date(v), "yyyy-MM-dd'T'HH:mm"); } catch { return ""; }
  };
  const [draft, setDraft] = useState(toInputVal(value));

  const handleSave = () => {
    setEditing(false);
    const out = draft ? new Date(draft).toISOString() : null;
    if (out !== value) onSave(out);
  };

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
      {editing ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Input
            type="datetime-local"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="h-7 text-xs"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={handleSave}><Check className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400" onClick={() => { setEditing(false); setDraft(toInputVal(value)); }}><X className="w-3.5 h-3.5" /></Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => { setDraft(toInputVal(value)); setEditing(true); }}>
          <span className="text-sm font-medium" style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}>
            {value ? fmtDateTime(value) : <span className="italic">{placeholder}</span>}
          </span>
          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        </div>
      )}
    </div>
  );
}

export default function InspectionPanel({ transaction, onSave }) {
  const deadline = transaction.inspection_deadline || null;       // date only
  const scheduled = transaction.inspection_scheduled || null;    // datetime
  const completed = transaction.inspection_completed || null;     // datetime

  const now = new Date();
  const isCompleted = !!completed;

  // Flag: scheduled is after deadline
  const scheduledAfterDeadline = (() => {
    if (!scheduled || !deadline) return false;
    const scheduledDay = startOfDay(new Date(scheduled));
    const deadlineDay = startOfDay(parseISO(deadline));
    return isAfter(scheduledDay, deadlineDay);
  })();

  // Flag: deadline passed and not completed
  const deadlineMissed = (() => {
    if (!deadline || isCompleted) return false;
    return isBefore(parseISO(deadline), startOfDay(now));
  })();

  // Flag: scheduled is today or past but not completed
  const scheduledPastNotDone = (() => {
    if (!scheduled || isCompleted) return false;
    return isBefore(new Date(scheduled), now);
  })();

  return (
    <div className="rounded-xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--card-border)" }}>
        <Calendar className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Inspection</span>
        {isCompleted && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        )}
        {!isCompleted && deadlineMissed && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-red-600 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
            <AlertTriangle className="w-3 h-3" /> Deadline Missed
          </span>
        )}
        {!isCompleted && !deadlineMissed && scheduledAfterDeadline && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-amber-600 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Scheduled After Deadline
          </span>
        )}
      </div>

      {/* Fields */}
      <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-3 gap-5">

        {/* 1. Contractual Deadline */}
        <div className={`p-3 rounded-lg border ${deadlineMissed && !isCompleted ? "border-red-200 bg-red-50/40" : ""}`}
          style={!(deadlineMissed && !isCompleted) ? { borderColor: "var(--card-border)", background: "var(--bg-tertiary)" } : {}}>
          <EditableDate
            label="Deadline (Contract)"
            value={deadline}
            placeholder="Set from contract"
            readOnlyNote="Parsed from contract — date only"
            onSave={v => onSave({ inspection_deadline: v })}
          />
          {deadlineMissed && !isCompleted && (
            <p className="mt-1.5 text-[11px] text-red-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Passed — mark completed below
            </p>
          )}
        </div>

        {/* 2. Scheduled (manual) */}
        <div className={`p-3 rounded-lg border ${scheduledAfterDeadline ? "border-amber-200 bg-amber-50/40" : ""}`}
          style={!scheduledAfterDeadline ? { borderColor: "var(--card-border)", background: "var(--bg-tertiary)" } : {}}>
          <EditableDateTime
            label="Scheduled (User Entry)"
            value={scheduled}
            placeholder="Enter date & time"
            onSave={v => onSave({ inspection_scheduled: v })}
          />
          {scheduledAfterDeadline && (
            <p className="mt-1.5 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> After contractual deadline
            </p>
          )}
          {scheduledPastNotDone && !scheduledAfterDeadline && (
            <p className="mt-1.5 text-[11px] text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Scheduled time passed — mark completed
            </p>
          )}
        </div>

        {/* 3. Completed */}
        <div className="p-3 rounded-lg border" style={{ borderColor: isCompleted ? undefined : "var(--card-border)", background: isCompleted ? undefined : "var(--bg-tertiary)" }}
          {...(isCompleted ? { style: { borderColor: "var(--card-border)", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)" } } : {})}>
          <EditableDateTime
            label="Completed"
            value={completed}
            placeholder="Mark when done"
            onSave={v => onSave({ inspection_completed: v })}
          />
          {isCompleted && (
            <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Deadline alerts suppressed
            </p>
          )}
        </div>
      </div>

      {/* Clear completed button */}
      {isCompleted && (
        <div className="px-4 pb-3">
          <button
            onClick={() => onSave({ inspection_completed: null })}
            className="text-[11px] text-gray-400 hover:text-red-500 underline transition-colors"
          >
            Clear completion mark
          </button>
        </div>
      )}
    </div>
  );
}
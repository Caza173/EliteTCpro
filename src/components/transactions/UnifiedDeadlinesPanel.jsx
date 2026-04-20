/**
 * UnifiedDeadlinesPanel — Deadlines Tab (OUTPUT / ACTION)
 *
 * Shows ALL deadlines in one place:
 *  - System deadlines (effective date, earnest money, closing) stored on Transaction fields
 *  - Contingency-derived deadlines pulled from the Contingency entity (source of truth)
 *  - Custom manual deadlines (Contingency records with source = "Manual" and no contingency category match)
 *
 * Editing a contingency-derived deadline updates the Contingency record directly.
 * Editing a system deadline updates the Transaction record via onSave.
 * Calendar sync is available per row.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { getTodayLocal, normalizeDeadline, getDaysUntil } from "@/utils/dateUtils";
import { evaluateDeadline } from "@/lib/deadlineUtils";
import {
  Pencil, Check, X, Calendar, DollarSign, Home,
  CalendarCheck, CalendarPlus, Loader2, AlertTriangle,
  Plus, Tag, Zap, CheckCircle2, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// System deadlines stored directly on the transaction record
const SYSTEM_FIELDS = [
  { key: "contract_date",          label: "Effective / Acceptance Date", category: "effective_date",  color: "blue",   nonActionable: true },
  { key: "inspection_deadline",    label: "Inspection",                  category: "inspection",      color: "orange", hasTime: true, timeKey: "inspection_time" },
  { key: "appraisal_deadline",     label: "Appraisal",                   category: "appraisal",       color: "teal",   hasTime: true, timeKey: "appraisal_time" },
  { key: "earnest_money_deadline", label: "Earnest Money Due",           category: "earnest_money",   color: "indigo", isEMD: true },
  { key: "closing_date",           label: "Closing / Transfer of Title", category: "closing",         color: "rose",   hasTime: true, timeKey: "closing_time" },
];

// These are reference dates — never "overdue"
const NON_ACTIONABLE = new Set(["effective_date", "acceptance_date"]);

const CATEGORY_COLORS = {
  effective_date:   { leftBorder: "border-l-blue-400",   labelText: "text-white", dot: "bg-blue-400" },
  earnest_money:    { leftBorder: "border-l-indigo-400", labelText: "text-white", dot: "bg-indigo-400" },
  closing:          { leftBorder: "border-l-rose-500",   labelText: "text-white", dot: "bg-rose-500" },
  Inspection:       { leftBorder: "border-l-orange-400", labelText: "text-white", dot: "bg-orange-400" },
  Financing:        { leftBorder: "border-l-emerald-500",labelText: "text-white", dot: "bg-emerald-500" },
  Appraisal:        { leftBorder: "border-l-teal-500",   labelText: "text-white", dot: "bg-teal-500" },
  Title:            { leftBorder: "border-l-purple-500", labelText: "text-white", dot: "bg-purple-500" },
  "Due Diligence":  { leftBorder: "border-l-violet-500", labelText: "text-white", dot: "bg-violet-500" },
  Other:            { leftBorder: "border-l-gray-400",   labelText: "text-white", dot: "bg-gray-400" },
};

function formatTime(t) {
  if (!t) return "";
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${m} ${ampm}`;
  } catch { return t; }
}

function fmtDate(d) {
  if (!d) return null;
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function getDaysLabel(dateStr, opts = {}) {
  if (!dateStr) return null;
  const days = getDaysUntil(dateStr);
  if (days === null) return null;
  // Non-actionable dates (e.g. Effective Date) — never show overdue
  if (opts.nonActionable) {
    if (days === 0) return { label: "Today", cls: "text-blue-600 font-semibold" };
    if (days > 0)   return { label: `${days}d away`, cls: "text-gray-400" };
    return { label: "Reference Date", cls: "text-gray-400" };
  }
  // EMD with received flag
  if (opts.emdReceived) {
    return { label: "Received", cls: "text-emerald-600 font-semibold" };
  }
  if (days < 0)  return { label: `${Math.abs(days)}d overdue`, cls: "text-red-600 font-semibold" };
  if (days === 0) return { label: "Today", cls: "text-orange-600 font-semibold" };
  if (days <= 3)  return { label: `${days}d left`, cls: "text-amber-600 font-semibold" };
  if (days <= 7)  return { label: `${days}d left`, cls: "text-yellow-600" };
  return { label: `${days}d away`, cls: "text-gray-400" };
}

// ── Single deadline row ──────────────────────────────────────────────────────
function DeadlineRow({ item, calendarMaps, transactionId, onUpdateContingency, onUpdateTransaction, onAddManual, onRefreshCalendar, completedDeadlines, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState(item.date || "");
  const [editTime, setEditTime] = useState(item.time || "");
  // For contingency/manual: label is built as "type – sub_type", editable part is sub_type only
  const editableLabelInitial = item.sourceType === "system" ? item.label : (item.subType || item.label || "");
  const [editLabel, setEditLabel] = useState(editableLabelInitial);
  const [syncing, setSyncing] = useState(false);
  const [markingReceived, setMarkingReceived] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
  const emdReceived = item.isEMD && item.emdReceived;
  const isCompleted = item.status === "Completed" || item.isCompleted;
  const daysInfo = getDaysLabel(item.date, { nonActionable: item.nonActionable, emdReceived });
  // Only show overdue ring for actionable, non-received, non-completed deadlines
  const isOverdue = !item.nonActionable && !emdReceived && !isCompleted && daysInfo?.cls?.includes("red");
  
  // Determine left border and title color based on state
  let borderClass = "border-l-transparent";
  
  if (isCompleted) {
    borderClass = "border-l-emerald-500";
  } else if (isOverdue) {
    borderClass = "border-l-red-500";
  } else if (daysInfo?.cls?.includes("amber")) {
    borderClass = "border-l-amber-500";
  } else {
    borderClass = colors.leftBorder;
  }

  const handleMarkComplete = async () => {
    setMarkingComplete(true);
    try {
      if (item.sourceType === "system") {
        const current = completedDeadlines || [];
        if (!current.includes(item.key)) {
          onUpdateTransaction({ completed_deadlines: [...current, item.key] });
        }
      } else {
        await onUpdateContingency(item.id, { status: "Completed", completed_date: new Date().toISOString().split("T")[0] });
      }
    } catch (e) {
      toast.error("Failed to mark complete");
    }
    setMarkingComplete(false);
  };

  // Check if this item has a calendar sync
  const calMapKey = item.sourceType === "system" ? item.key : `contingency_${item.id}`;
  const calEntry = calendarMaps.find(m => m.field_key === calMapKey);
  const isSynced = !!calEntry;

  const handleSave = async () => {
    if (item.sourceType === "system") {
      const updates = { [item.key]: editDate };
      if (item.timeKey && editTime !== undefined) {
        updates[item.timeKey] = editTime || null;
      }
      onUpdateTransaction(updates);
    } else {
      const updates = { due_date: editDate };
      // Save the editable label as sub_type (always update so user changes are persisted)
      if (editLabel.trim()) {
        updates.sub_type = editLabel.trim();
      }
      await onUpdateContingency(item.id, updates);
    }
    setEditing(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const payload = item.sourceType === "system"
        ? { transaction_id: transactionId, field_key: item.key }
        : { 
            transaction_id: transactionId, 
            contingency_id: item.id, 
            field_key: calMapKey, 
            date: item.date, 
            title: item.label,
            due_time: item.due_time,
            is_all_day: item.is_all_day
          };

      const res = await base44.functions.invoke("syncTransactionDeadlinesToCalendar", payload);
      if (res.data?.error) throw new Error(res.data.error);
      onRefreshCalendar();
      toast.success(isSynced ? "Calendar event updated" : "Added to Google Calendar");
    } catch (e) {
      toast.error(e.message || "Calendar sync failed");
    }
    setSyncing(false);
  };

  return (
    <div className={`rounded-xl border border-l-4 p-3.5 ${borderClass} transition-all`} style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Label row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {editing ? null : (
              <span
                className={`text-sm font-semibold cursor-pointer hover:underline decoration-dotted underline-offset-2 ${isOverdue ? "text-red-500" : ""}`}
                style={!isOverdue ? { color: "var(--text-primary)" } : {}}
                onClick={() => { setEditLabel(item.subType || ""); setEditDate(item.date || ""); setEditing(true); }}
                title="Click to edit"
              >{item.label}</span>
            )}
            {item.sourceType === "contingency" && (
              <span className="text-[10px] bg-white/70 border border-current/20 px-1.5 py-0.5 rounded font-medium opacity-70">
                From Contingency
              </span>
            )}
            {item.sourceType === "manual" && (
              <span className="text-[10px] bg-white/70 border border-current/20 px-1.5 py-0.5 rounded font-medium opacity-70">
                Custom
              </span>
            )}
          </div>

          {/* Inline label editor — only for contingency/manual (system labels are fixed) */}
          {editing && item.sourceType !== "system" && (
            <Input
              placeholder="Deadline name"
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              className="h-7 text-xs py-0 mb-1.5"
              autoFocus
            />
          )}

          {editing ? (
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
              <Input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="h-7 text-xs py-0 bg-white/80 border-white"
                autoFocus={item.sourceType !== "manual"}
              />
              {item.timeKey && (
                <Input
                  type="time"
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                  className="h-7 text-xs py-0 bg-white/80 border-white w-24"
                  title="Optional time"
                />
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-white/40" onClick={handleSave}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-white/40" onClick={() => { setEditing(false); setEditDate(item.date || ""); setEditTime(item.time || ""); setEditLabel(item.subType || ""); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  {item.date ? (
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{fmtDate(item.date)}</span>
                  ) : (
                    <span className="text-xs italic text-gray-500">Not set</span>
                  )}
                  {item.time && (
                    <span className="text-xs font-semibold text-blue-400">{formatTime(item.time)}</span>
                  )}
                  {!item.is_all_day && item.due_time && (
                    <span className="text-xs font-semibold text-blue-400">{formatTime(item.due_time)}</span>
                  )}
                </div>
                {isCompleted && item.date ? (
                  <span className="ml-2 text-xs text-emerald-400 font-semibold">Completed</span>
                ) : daysInfo && item.date && (
                  <span className={`ml-2 text-xs ${daysInfo.cls}`}>{daysInfo.label}</span>
                )}
                {item.isEMD && emdReceived && item.emdReceivedDate && (
                  <span className="ml-2 text-xs text-emerald-400">on {fmtDate(item.emdReceivedDate)}</span>
                )}
                {item.daysFromEffective && (
                  <span className="ml-2 text-xs text-gray-500">{item.daysFromEffective}d from effective</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Completed badge */}
                {isCompleted && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </span>
                )}
                {/* Complete button — show for overdue or today deadlines that aren't already complete */}
                {!isCompleted && !item.nonActionable && !emdReceived && item.date && (isOverdue || (daysInfo && daysInfo.cls?.includes("orange"))) && (
                  <Button
                    size="sm" variant="ghost"
                    className="h-6 px-2 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 gap-1"
                    disabled={markingComplete}
                    onClick={handleMarkComplete}
                    title="Mark as completed"
                  >
                    {markingComplete ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Complete
                  </Button>
                )}
                {/* EMD: Mark Received button */}
                {item.isEMD && !emdReceived && !isCompleted && item.date && (
                  <Button
                    size="sm" variant="ghost"
                    className="h-6 px-2 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 gap-1"
                    disabled={markingReceived}
                    onClick={async () => {
                      setMarkingReceived(true);
                      onUpdateTransaction({ earnest_money_received: true, earnest_money_received_date: new Date().toISOString().split("T")[0] });
                      setMarkingReceived(false);
                    }}
                    title="Mark earnest money as received"
                  >
                    {markingReceived ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Received
                  </Button>
                )}
                {item.date && (
                  <Button
                    size="icon" variant="ghost"
                    className={`h-6 w-6 transition-colors ${isSynced ? "text-emerald-500" : "text-gray-400 hover:text-gray-600"}`}
                    onClick={handleSync}
                    disabled={syncing}
                    title={isSynced ? "Update calendar event" : "Sync to Google Calendar"}
                  >
                    {syncing
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : isSynced ? <CalendarCheck className="w-3 h-3" /> : <CalendarPlus className="w-3 h-3" />
                    }
                  </Button>
                )}
                <Button
                  size="icon" variant="ghost"
                  className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  onClick={() => { setEditDate(item.date || ""); setEditLabel(item.subType || ""); setEditing(true); }}
                  title={item.sourceType === "manual" ? "Edit deadline" : "Edit date"}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                {/* Delete button */}
                {confirmingDelete ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost"
                      className="h-6 px-1.5 text-[10px] text-red-400 hover:bg-red-500/20"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        await onDelete(item);
                        setDeleting(false);
                        setConfirmingDelete(false);
                      }}
                    >
                      {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-6 px-1 text-[10px] text-gray-400"
                      onClick={() => setConfirmingDelete(false)}
                    >✕</Button>
                  </div>
                ) : (
                  <Button
                    size="icon" variant="ghost"
                    className="h-6 w-6 text-gray-600 hover:text-red-400 hover:bg-red-500/20"
                    onClick={() => setConfirmingDelete(true)}
                    title="Delete deadline"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Calendar synced label */}
           {isSynced && !editing && (
             <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
               <CalendarCheck className="w-2.5 h-2.5 text-emerald-400" /> Synced to calendar
             </p>
           )}

           {/* Notes if any (contingency records) */}
           {item.scheduledDate && (
             <p className="text-xs text-gray-400 mt-0.5">
               Scheduled: {item.scheduledDate}{item.scheduledTime ? ` at ${formatTime(item.scheduledTime)}` : ""}
             </p>
           )}
           {item.notes && (
             <p className="text-xs text-gray-400 mt-0.5 italic truncate">{item.notes}</p>
           )}
        </div>
      </div>
    </div>
  );
}

// ── Add Custom Deadline modal (inline) ──────────────────────────────────────
function AddCustomDeadlineRow({ transactionId, brokerageId, onAdded, onCancel }) {
  const [form, setForm] = useState({ label: "", date: "", due_time: "", is_all_day: true, notes: "" });

  const handleSave = async () => {
    if (!form.label || !form.date) { toast.error("Name and date are required"); return; }
    await base44.entities.Contingency.create({
      transaction_id: transactionId,
      brokerage_id: brokerageId,
      contingency_type: "Other",
      sub_type: form.label,
      due_date: form.date,
      due_time: form.is_all_day ? null : (form.due_time || null),
      is_all_day: form.is_all_day,
      notes: form.notes,
      status: "Pending",
      is_active: true,
      is_custom: true,
      source: "Manual",
    });
    onAdded();
  };

  return (
    <div className="rounded-xl border border-dashed p-3.5 space-y-2" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}>
      <p className="text-xs font-semibold text-blue-400">Add Custom Deadline</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <Input
          placeholder="Name (e.g. HOA Docs Due)"
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          className="h-7 text-xs sm:col-span-2"
          autoFocus
        />
        <Input
          type="date"
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="h-7 text-xs"
        />
      </div>
      <div className="flex items-center gap-3 mt-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={form.is_all_day}
            onChange={e => setForm(f => ({ ...f, is_all_day: e.target.checked, due_time: e.target.checked ? "" : f.due_time }))}
            className="rounded text-blue-500 focus:ring-blue-400"
          />
          All Day Event
        </label>
        {!form.is_all_day && (
          <Input
            type="time"
            value={form.due_time}
            onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))}
            className="h-7 text-xs w-32"
          />
        )}
      </div>
      <Input
        placeholder="Notes (optional)"
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        className="h-7 text-xs mt-2"
      />
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>
          <Check className="w-3 h-3 mr-1" /> Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function UnifiedDeadlinesPanel({ transaction, onSave }) {
  const queryClient = useQueryClient();
  const [addingCustom, setAddingCustom] = useState(false);

  const { data: contingencies = [] } = useQuery({
    queryKey: ["contingencies", transaction.id],
    queryFn: () => base44.entities.Contingency.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
  });

  const { data: calendarMaps = [] } = useQuery({
    queryKey: ["calendarMaps", transaction.id],
    queryFn: () => base44.entities.CalendarEventMap.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
  });

  const refreshCalendar = () => queryClient.invalidateQueries({ queryKey: ["calendarMaps", transaction.id] });
  const refreshContingencies = () => queryClient.invalidateQueries({ queryKey: ["contingencies", transaction.id] });

  const handleUpdateContingency = async (id, data) => {
    await base44.entities.Contingency.update(id, data);
    refreshContingencies();
  };

  const handleDeleteDeadline = async (item) => {
    if (item.sourceType === "system") {
      // Call the updateTransaction backend function directly (it handles RLS and null stripping)
      try {
        await base44.functions.invoke("updateTransaction", {
          transaction_id: transaction.id,
          data: { [item.key]: "" },
        });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        toast.success(`${item.label} date cleared`);
      } catch (e) {
        toast.error("Failed to clear: " + (e.message || "unknown error"));
      }
    } else {
      // Delete the contingency record
      try {
        await base44.entities.Contingency.delete(item.id);
        refreshContingencies();
        toast.success(`${item.label} deleted`);
      } catch (e) {
        toast.error("Failed to delete: " + (e.message || "unknown error"));
      }
    }
  };

  // ── Build unified deadline list ──────────────────────────────────────────
  const completedDeadlines = transaction.completed_deadlines || [];

  // 1. System fields from Transaction
  const systemItems = SYSTEM_FIELDS.map(f => ({
    id: f.key,
    key: f.key,
    label: f.label,
    date: transaction[f.key] || null,
    time: f.timeKey ? transaction[f.timeKey] || null : null,
    timeKey: f.timeKey || null,
    category: f.category,
    sourceType: "system",
    nonActionable: !!f.nonActionable,
    isEMD: !!f.isEMD,
    emdReceived: f.isEMD ? !!transaction.earnest_money_received : false,
    emdReceivedDate: f.isEMD ? transaction.earnest_money_received_date : null,
    isCompleted: completedDeadlines.includes(f.key),
    completedDeadlines,
    sortOrder: f.key === "contract_date" ? 0 : f.key === "closing_date" ? 999 : 1,
  }));

  // 2. Contingency-derived deadlines
  const contingencyItems = contingencies
    .filter(c => c.is_active !== false)
    .map(c => ({
      id: c.id,
      key: `contingency_${c.id}`,
      label: [c.contingency_type, c.sub_type].filter(Boolean).join(" – "),
      subType: c.sub_type || "",
      date: c.due_date || null,
      due_time: c.due_time || null,
      is_all_day: c.is_all_day ?? true,
      category: c.contingency_type,
      sourceType: c.source === "Manual" && c.is_custom ? "manual" : "contingency",
      daysFromEffective: c.days_from_effective || null,
      notes: c.notes || null,
      scheduledDate: c.scheduled_date ? fmtDate(c.scheduled_date) : null,
      scheduledTime: c.scheduled_time || null,
      status: c.status,
      sortOrder: 50,
    }));

  // Merge: sort by date, putting null dates last
  const allItems = [...systemItems, ...contingencyItems].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  // Stats — all using timezone-safe getDaysUntil
  const overdue = allItems.filter(i => {
    if (!i.date || i.nonActionable || (i.isEMD && i.emdReceived) || i.isCompleted) return false;
    if (i.status === "Completed" || i.status === "Waived") return false;
    const days = getDaysUntil(i.date);
    return days !== null && days < 0;
  }).length;
  const upcoming = allItems.filter(i => {
    if (!i.date) return false;
    const days = getDaysUntil(i.date);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const allItemKeys = new Set(allItems.map(i => i.sourceType === "system" ? i.key : `contingency_${i.id}`));
  const synced = calendarMaps.filter(m => allItemKeys.has(m.field_key)).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-600">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          {allItems.filter(i => i.date).length} deadlines
        </div>
        {overdue > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" /> {overdue} overdue
          </div>
        )}
        {upcoming > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <Zap className="w-3.5 h-3.5" /> {upcoming} this week
          </div>
        )}
        {synced > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            <CalendarCheck className="w-3.5 h-3.5" /> {synced} synced
          </div>
        )}
      </div>

      {/* Deadline grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allItems.map(item => (
          <DeadlineRow
            key={item.id}
            item={item}
            calendarMaps={calendarMaps}
            transactionId={transaction.id}
            onUpdateContingency={handleUpdateContingency}
            onUpdateTransaction={onSave}
            onRefreshCalendar={refreshCalendar}
            completedDeadlines={completedDeadlines}
            onDelete={handleDeleteDeadline}
          />
        ))}
      </div>

      {/* Custom deadline add */}
      {addingCustom ? (
        <AddCustomDeadlineRow
          transactionId={transaction.id}
          brokerageId={transaction.brokerage_id}
          onAdded={() => { refreshContingencies(); setAddingCustom(false); }}
          onCancel={() => setAddingCustom(false)}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-dashed"
          onClick={() => setAddingCustom(true)}
        >
          <Plus className="w-3.5 h-3.5" /> Add Custom Deadline
        </Button>
      )}
    </div>
  );
}
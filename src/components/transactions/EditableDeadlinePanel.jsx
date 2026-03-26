import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Pencil, Check, X, Calendar, DollarSign, Search, FileCheck, Clock, Home, CalendarCheck, CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recalculateTaskDueDates } from "./deadlineUtils";
import { toast } from "sonner";

const DEADLINE_FIELDS = [
  { key: "contract_date",           label: "Effective / Acceptance Date", icon: Calendar,   color: "blue" },
  { key: "earnest_money_deadline",  label: "Earnest Money Due",           icon: DollarSign, color: "indigo" },
  { key: "inspection_deadline",     label: "Inspection Deadline",         icon: Search,     color: "orange" },
  { key: "appraisal_deadline",      label: "Appraisal Deadline",          icon: Clock,      color: "teal" },
  { key: "financing_deadline",      label: "Financing Commitment",        icon: DollarSign, color: "green", cashExcluded: true },
  { key: "due_diligence_deadline",  label: "Due Diligence Deadline",      icon: FileCheck,  color: "purple" },
  { key: "closing_date",            label: "Closing / Transfer of Title", icon: Home,       color: "rose" },
];

const COLORS = {
  blue:   "bg-blue-50 border-blue-200 text-blue-700",
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  teal:   "bg-teal-50 border-teal-200 text-teal-700",
  green:  "bg-emerald-50 border-emerald-200 text-emerald-700",
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  rose:   "bg-rose-50 border-rose-200 text-rose-700",
};

function formatSafe(d) {
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return "—"; }
}

export default function EditableDeadlinePanel({ transaction, onSave }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [syncingField, setSyncingField] = useState(null);
  const isCash = transaction.is_cash_transaction;

  const fields = DEADLINE_FIELDS.filter((f) => !(f.cashExcluded && isCash));

  // Load CalendarEventMap for this transaction to know which deadlines are synced
  const { data: calendarMaps = [] } = useQuery({
    queryKey: ["calendarMaps", transaction.id],
    queryFn: () => base44.entities.CalendarEventMap.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
  });

  // Build a quick lookup: field_key → calendar_event_id
  const syncedFields = {};
  for (const m of calendarMaps) {
    syncedFields[m.field_key] = m.calendar_event_id;
  }

  const startEdit = (key, currentVal) => {
    setEditing(key);
    setEditValue(currentVal || "");
  };

  const cancelEdit = () => { setEditing(null); setEditValue(""); };

  const saveEdit = () => {
    if (!editing) return;
    const updated = { ...transaction, [editing]: editValue };
    const updatedTasks = recalculateTaskDueDates(transaction.tasks || [], updated);
    onSave({ [editing]: editValue, tasks: updatedTasks });
    setEditing(null);
    setEditValue("");
  };

  const syncSingle = async (fieldKey) => {
    setSyncingField(fieldKey);
    try {
      const res = await base44.functions.invoke("syncTransactionDeadlinesToCalendar", {
        transaction_id: transaction.id,
        field_key: fieldKey,
      });
      if (res.data?.error) throw new Error(res.data.error);
      // Refresh the map
      queryClient.invalidateQueries({ queryKey: ["calendarMaps", transaction.id] });
      const wasSynced = !!syncedFields[fieldKey];
      toast.success(wasSynced ? "Calendar event updated" : "Added to Google Calendar");
    } catch (e) {
      toast.error(e.message || "Calendar sync failed");
    }
    setSyncingField(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((field) => {
        const dateStr = transaction[field.key];
        const Icon = field.icon;
        const colorCls = COLORS[field.color] || COLORS.blue;
        const isEditingThis = editing === field.key;
        const isSynced = !!syncedFields[field.key];
        const isSyncing = syncingField === field.key;

        return (
          <div
            key={field.key}
            className={`rounded-xl border p-3.5 ${colorCls} flex items-center gap-3`}
          >
            <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0 border border-white/80">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium opacity-70 mb-0.5">{field.label}</p>
              {isEditingThis ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Input
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-7 text-xs py-0 bg-white border-white/80"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-white/40" onClick={saveEdit}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-white/40" onClick={cancelEdit}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-semibold">
                    {dateStr ? formatSafe(dateStr) : <span className="italic opacity-50 font-normal">Not set</span>}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Calendar sync button — only show if date is set */}
                    {dateStr && (
                      <Button
                        size="icon" variant="ghost"
                        className={`h-6 w-6 hover:bg-white/40 transition-colors ${isSynced ? "text-emerald-600 opacity-90" : "opacity-50 hover:opacity-100"}`}
                        onClick={() => syncSingle(field.key)}
                        disabled={isSyncing}
                        title={isSynced ? "Update calendar event" : "Sync to Google Calendar"}
                      >
                        {isSyncing
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : isSynced
                            ? <CalendarCheck className="w-3 h-3" />
                            : <CalendarPlus className="w-3 h-3" />
                        }
                      </Button>
                    )}
                    <Button
                      size="icon" variant="ghost"
                      className="h-6 w-6 opacity-50 hover:opacity-100 hover:bg-white/40"
                      onClick={() => startEdit(field.key, dateStr)}
                      title="Edit date"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
              {/* Synced indicator */}
              {isSynced && !isEditingThis && (
                <p className="text-[10px] opacity-60 mt-0.5 flex items-center gap-1">
                  <CalendarCheck className="w-2.5 h-2.5" /> Synced to calendar
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
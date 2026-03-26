import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Check, X, AlertTriangle, CheckCircle2,
  Clock, Calendar, ChevronDown, ChevronRight, Zap,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

const TYPE_COLORS = {
  Inspection:    { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-400" },
  Financing:     { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  Appraisal:    { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  Title:         { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500" },
  "Due Diligence": { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" },
  Other:         { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400" },
};

const STATUS_STYLES = {
  Pending:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  Scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Waived:    "bg-gray-100 text-gray-500 border-gray-200 line-through",
  Overdue:   "bg-red-100 text-red-700 border-red-200",
};

const CONTINGENCY_TYPES = ["Inspection", "Financing", "Appraisal", "Title", "Due Diligence", "Other"];
const STATUSES = ["Pending", "Scheduled", "Completed", "Waived", "Overdue"];

function addDaysToDate(dateStr, days) {
  if (!dateStr || days == null) return "";
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
    return d.toISOString().split("T")[0];
  } catch { return ""; }
}

function fmtDate(d) {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function getDaysLabel(dateStr) {
  if (!dateStr) return null;
  try {
    const days = differenceInDays(parseISO(dateStr), new Date());
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: "text-red-600 font-semibold" };
    if (days === 0) return { label: "Today", cls: "text-red-600 font-semibold" };
    if (days <= 3) return { label: `${days}d left`, cls: "text-amber-600 font-semibold" };
    return { label: `${days}d`, cls: "text-gray-500" };
  } catch { return null; }
}

function ContingencyRow({ c, effectiveDate, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    sub_type: c.sub_type || "",
    days_from_effective: c.days_from_effective || "",
    due_date: c.due_date || "",
    scheduled_date: c.scheduled_date || "",
    status: c.status || "Pending",
    notes: c.notes || "",
  });

  const handleDaysChange = (val) => {
    const recalcDate = addDaysToDate(effectiveDate, val);
    setForm(f => ({ ...f, days_from_effective: val, due_date: recalcDate }));
  };

  const handleSave = () => {
    onUpdate(c.id, {
      sub_type: form.sub_type,
      days_from_effective: form.days_from_effective ? Number(form.days_from_effective) : null,
      due_date: form.due_date || null,
      scheduled_date: form.scheduled_date || null,
      status: form.status,
      notes: form.notes,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({
      sub_type: c.sub_type || "",
      days_from_effective: c.days_from_effective || "",
      due_date: c.due_date || "",
      scheduled_date: c.scheduled_date || "",
      status: c.status || "Pending",
      notes: c.notes || "",
    });
    setEditing(false);
  };

  const daysInfo = getDaysLabel(c.due_date);
  const isOverdue = c.status !== "Completed" && c.status !== "Waived" && c.due_date && differenceInDays(parseISO(c.due_date), new Date()) < 0;

  return (
    <tr className={`border-b last:border-0 ${isOverdue ? "bg-red-50/50" : "hover:bg-gray-50/50"} transition-colors`}>
      {editing ? (
        <>
          <td className="px-3 py-2">
            <Input
              value={form.sub_type}
              onChange={e => setForm(f => ({ ...f, sub_type: e.target.value }))}
              placeholder="Sub-type"
              className="h-7 text-xs"
            />
          </td>
          <td className="px-3 py-2">
            <div className="flex gap-1.5 items-center">
              <Input
                type="number"
                value={form.days_from_effective}
                onChange={e => handleDaysChange(e.target.value)}
                placeholder="Days"
                className="h-7 text-xs w-16"
              />
              <span className="text-xs text-gray-400">or</span>
              <Input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value, days_from_effective: "" }))}
                className="h-7 text-xs"
              />
            </div>
          </td>
          <td className="px-3 py-2">
            <Input
              type="date"
              value={form.scheduled_date}
              onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
              className="h-7 text-xs"
            />
          </td>
          <td className="px-3 py-2">
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </td>
          <td className="px-3 py-2">
            <Input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes…"
              className="h-7 text-xs"
            />
          </td>
          <td className="px-3 py-2 text-right">
            <button onClick={handleSave} className="p-1 rounded hover:bg-emerald-100 text-emerald-600 mr-1"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={handleCancel} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-3.5 h-3.5" /></button>
          </td>
        </>
      ) : (
        <>
          <td className="px-3 py-2.5 text-sm font-medium text-gray-800">
            {c.sub_type || <span className="text-gray-400 italic text-xs">—</span>}
            {c.source === "Parsed" && (
              <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-normal">auto</span>
            )}
          </td>
          <td className="px-3 py-2.5">
            <div>
              <p className="text-sm text-gray-800">{fmtDate(c.due_date)}</p>
              {daysInfo && <p className={`text-xs ${daysInfo.cls}`}>{daysInfo.label}</p>}
              {c.days_from_effective && <p className="text-xs text-gray-400">{c.days_from_effective} days from effective</p>}
            </div>
          </td>
          <td className="px-3 py-2.5 text-sm text-gray-600">{fmtDate(c.scheduled_date)}</td>
          <td className="px-3 py-2.5">
            <Badge variant="outline" className={`text-xs ${STATUS_STYLES[c.status] || STATUS_STYLES.Pending}`}>
              {c.status}
            </Badge>
          </td>
          <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[120px] truncate">{c.notes || "—"}</td>
          <td className="px-3 py-2.5 text-right">
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 mr-1"><Pencil className="w-3 h-3" /></button>
            <button onClick={() => onDelete(c.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </td>
        </>
      )}
    </tr>
  );
}

function AddContingencyRow({ transactionId, brokerageId, effectiveDate, type, onAdded, onCancel }) {
  const [form, setForm] = useState({
    sub_type: "",
    days_from_effective: "",
    due_date: "",
    status: "Pending",
    notes: "",
  });

  const handleDaysChange = (val) => {
    const recalcDate = addDaysToDate(effectiveDate, val);
    setForm(f => ({ ...f, days_from_effective: val, due_date: recalcDate }));
  };

  const handleSave = async () => {
    await base44.entities.Contingency.create({
      transaction_id: transactionId,
      brokerage_id: brokerageId,
      contingency_type: type,
      sub_type: form.sub_type,
      days_from_effective: form.days_from_effective ? Number(form.days_from_effective) : null,
      due_date: form.due_date || null,
      status: form.status,
      notes: form.notes,
      is_active: true,
      is_custom: true,
      source: "Manual",
    });
    onAdded();
  };

  return (
    <tr className="bg-blue-50/40 border-b">
      <td className="px-3 py-2">
        <Input value={form.sub_type} onChange={e => setForm(f => ({ ...f, sub_type: e.target.value }))} placeholder="Sub-type (e.g. General Building)" className="h-7 text-xs" autoFocus />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1.5 items-center">
          <Input type="number" value={form.days_from_effective} onChange={e => handleDaysChange(e.target.value)} placeholder="Days" className="h-7 text-xs w-16" />
          <span className="text-xs text-gray-400">or</span>
          <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value, days_from_effective: "" }))} className="h-7 text-xs" />
        </div>
      </td>
      <td className="px-3 py-2"><Input type="date" className="h-7 text-xs" /></td>
      <td className="px-3 py-2">
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2"><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes…" className="h-7 text-xs" /></td>
      <td className="px-3 py-2 text-right">
        <button onClick={handleSave} className="p-1 rounded hover:bg-emerald-100 text-emerald-600 mr-1"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-3.5 h-3.5" /></button>
      </td>
    </tr>
  );
}

function TypeGroup({ type, contingencies, transactionId, brokerageId, effectiveDate, onUpdate, onDelete, onAdded }) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const colors = TYPE_COLORS[type] || TYPE_COLORS.Other;

  const activeItems = contingencies.filter(c => c.is_active !== false);
  const overdueCount = activeItems.filter(c => {
    if (c.status === "Completed" || c.status === "Waived") return false;
    return c.due_date && differenceInDays(parseISO(c.due_date), new Date()) < 0;
  }).length;

  return (
    <div className={`rounded-xl border ${colors.border} overflow-hidden mb-3`}>
      <div
        className={`flex items-center justify-between px-4 py-2.5 ${colors.bg} cursor-pointer`}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
          <span className={`text-sm font-semibold ${colors.text}`}>{type}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
            {activeItems.length}
          </span>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
              <AlertTriangle className="w-3 h-3" /> {overdueCount} overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); setAdding(a => !a); }}
            className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg border font-medium transition-colors ${colors.border} ${colors.text} hover:opacity-80`}
          >
            <Plus className="w-3 h-3" /> Add
          </button>
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-white/60">
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Sub-Type</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheduled</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {activeItems.length === 0 && !adding && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-400">
                    No {type.toLowerCase()} contingencies. Click "Add" to add one.
                  </td>
                </tr>
              )}
              {activeItems.map(c => (
                <ContingencyRow
                  key={c.id}
                  c={c}
                  effectiveDate={effectiveDate}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
              {adding && (
                <AddContingencyRow
                  transactionId={transactionId}
                  brokerageId={brokerageId}
                  effectiveDate={effectiveDate}
                  type={type}
                  onAdded={() => { onAdded(); setAdding(false); }}
                  onCancel={() => setAdding(false)}
                />
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ContingencyPanel({ transaction }) {
  const queryClient = useQueryClient();
  const [addingType, setAddingType] = useState(null);

  const { data: contingencies = [], isLoading } = useQuery({
    queryKey: ["contingencies", transaction.id],
    queryFn: () => base44.entities.Contingency.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["contingencies", transaction.id] });

  const handleUpdate = async (id, data) => {
    await base44.entities.Contingency.update(id, data);
    refetch();
  };

  const handleDelete = async (id) => {
    await base44.entities.Contingency.delete(id);
    refetch();
  };

  const effectiveDate = transaction.contract_date || null;

  // Group by type - only show types that have items OR are in the default set if no contingencies exist
  const grouped = CONTINGENCY_TYPES.reduce((acc, type) => {
    acc[type] = contingencies.filter(c => c.contingency_type === type);
    return acc;
  }, {});

  const usedTypes = CONTINGENCY_TYPES.filter(t => grouped[t].length > 0);

  // Stats
  const total = contingencies.length;
  const overdue = contingencies.filter(c =>
    c.status !== "Completed" && c.status !== "Waived" && c.due_date &&
    differenceInDays(parseISO(c.due_date), new Date()) < 0
  ).length;
  const pending = contingencies.filter(c => c.status === "Pending" || c.status === "Scheduled").length;
  const completed = contingencies.filter(c => c.status === "Completed" || c.status === "Waived").length;

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      {total > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600 font-medium">{pending} pending</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-700 font-medium">{completed} cleared</span>
          </div>
          {overdue > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs text-red-700 font-semibold">{overdue} overdue</span>
            </div>
          )}
          {!effectiveDate && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-amber-700">Set effective date to auto-calculate deadlines</span>
            </div>
          )}
        </div>
      )}

      {/* No contingencies yet */}
      {!isLoading && total === 0 && (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
          <Zap className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium text-gray-600 mb-1">No contingencies yet</p>
          <p className="text-xs text-gray-400 mb-4">Upload a P&S Agreement to auto-parse, or add manually below.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Inspection", "Financing", "Appraisal"].map(type => (
              <Button key={type} size="sm" variant="outline" className="h-8 text-xs gap-1"
                onClick={() => setAddingType(type)}>
                <Plus className="w-3 h-3" /> {type}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Groups for types that have items */}
      {usedTypes.map(type => (
        <TypeGroup
          key={type}
          type={type}
          contingencies={grouped[type]}
          transactionId={transaction.id}
          brokerageId={transaction.brokerage_id}
          effectiveDate={effectiveDate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAdded={refetch}
        />
      ))}

      {/* Add to a new type */}
      <div className="flex flex-wrap gap-2 pt-1">
        {CONTINGENCY_TYPES.filter(t => !usedTypes.includes(t) || addingType === t).map(type => (
          <Button key={type} size="sm" variant="outline" className="h-8 text-xs gap-1 text-gray-600"
            onClick={() => setAddingType(type)}>
            <Plus className="w-3 h-3" /> Add {type}
          </Button>
        ))}
      </div>

      {/* Inline add for new types */}
      {addingType && !usedTypes.includes(addingType) && (
        <TypeGroup
          type={addingType}
          contingencies={[]}
          transactionId={transaction.id}
          brokerageId={transaction.brokerage_id}
          effectiveDate={effectiveDate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAdded={() => { refetch(); setAddingType(null); }}
        />
      )}
    </div>
  );
}
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, CalendarPlus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function AddAppointmentModal({ transactions = [], defaultDate = null, onClose, onSaved }) {
  const [form, setForm] = useState({
    transaction_id: "",
    title: "",
    date: defaultDate ? format(defaultDate, "yyyy-MM-dd") : "",
    time: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.transaction_id || !form.title || !form.date) return;
    setSaving(true);
    const tx = transactions.find(t => t.id === form.transaction_id);
    await base44.entities.CalendarEventMap.create({
      transaction_id: form.transaction_id,
      event_title: form.title,
      event_date: form.date,
      event_time: form.time || null,
      notes: form.notes || null,
      event_type: "appointment",
      address: tx?.address || "",
      synced: false,
    });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl shadow-2xl"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--card-border)" }}>
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Add Appointment</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Transaction */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              Transaction <span className="text-red-500">*</span>
            </label>
            <select
              value={form.transaction_id}
              onChange={e => set("transaction_id", e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            >
              <option value="">Select a transaction…</option>
              {transactions.filter(t => t.status !== "cancelled").map(tx => (
                <option key={tx.id} value={tx.id}>{tx.address}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              Appointment Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Final Walkthrough, Inspection"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Date & Time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => set("date", e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => set("time", e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes…"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: "var(--card-border)" }}>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--card-bg)" }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.transaction_id || !form.title || !form.date}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CalendarPlus className="w-3 h-3" />}
            Save Appointment
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
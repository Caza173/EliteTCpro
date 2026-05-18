import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, CalendarPlus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { toast } from "sonner";

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
    if (saving) return; // prevent double submit

    setSaving(true);
    try {
      const user = await base44.auth.me();
      const tx = transactions.find(t => t.id === form.transaction_id);

      console.log("[AddAppointment] saving payload:", {
        owner_id: user?.id,
        transaction_id: form.transaction_id,
        title: form.title,
        event_date: form.date,
        event_time: form.time || null,
        notes: form.notes || null,
        address: tx?.address || "",
      });

      await base44.entities.Appointment.create({
        owner_id: user?.id,
        transaction_id: form.transaction_id,
        title: form.title,
        event_date: form.date,
        event_time: form.time || null,
        notes: form.notes || null,
        address: tx?.address || "",
      });

      console.log("[AddAppointment] saved successfully");
      toast.success("Appointment Created");
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("[AddAppointment] save failed:", err);
      toast.error("Failed to save appointment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isValid = form.transaction_id && form.title && form.date;

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
            <CalendarPlus className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Add Appointment</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:opacity-70">
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Transaction */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--accent)" }}>
              Transaction <span className="text-red-500">*</span>
            </label>
            <select
              value={form.transaction_id}
              onChange={e => set("transaction_id", e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
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
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--accent)" }}>
              Appointment Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Final Walkthrough, Inspection"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Date & Time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--accent)" }}>
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => set("date", e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => set("time", e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes…"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: "var(--card-border)" }}>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--card-bg)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            style={{ background: "var(--accent)", color: "#050506" }}
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
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CalendarPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { toast } from "sonner";

// Minimal Google Calendar icon (SVG, neutral color)
function GCalIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 13h2v2H8zM11 13h2v2h-2zM14 13h2v2h-2zM8 16h2v2H8zM11 16h2v2h-2z" fill="currentColor" opacity="0.6"/>
    </svg>
  );
}

export default function AddAppointmentModal({ transactions = [], defaultDate = null, onClose, onSaved }) {
  const [form, setForm] = useState({
    transaction_id: "",
    title: "",
    date: defaultDate ? format(defaultDate, "yyyy-MM-dd") : "",
    time: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(null); // null = loading, true/false
  const [calendarEmail, setCalendarEmail] = useState(null);
  const [syncResult, setSyncResult] = useState(null); // 'success' | 'failed' | null

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Check if Google Calendar is connected on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('checkCalendarConnection', {});
        setCalendarConnected(res.data?.connected === true);
        setCalendarEmail(res.data?.email || null);
      } catch {
        setCalendarConnected(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!form.transaction_id || !form.title || !form.date) return;
    if (saving) return;

    setSaving(true);
    setSyncResult(null);

    let apptId = null;

    try {
      const user = await base44.auth.me();
      const tx = transactions.find(t => t.id === form.transaction_id);

      const created = await base44.entities.Appointment.create({
        owner_id: user?.id,
        transaction_id: form.transaction_id,
        title: form.title,
        event_date: form.date,
        event_time: form.time || null,
        notes: form.notes || null,
        address: tx?.address || "",
        google_calendar_synced: false,
        sync_status: syncToGoogle ? "pending" : null,
      });

      apptId = created?.id;

      // Google Calendar sync (async after DB save)
      if (syncToGoogle && apptId) {
        try {
          const syncRes = await base44.functions.invoke('syncAppointmentToCalendar', {
            appointment_id: apptId,
            action: 'create',
          });
          if (syncRes.data?.success) {
            setSyncResult('success');
            toast.success("Appointment saved and synced to Google Calendar");
          } else {
            setSyncResult('failed');
            toast.warning("Appointment saved, but Google Calendar sync failed.");
          }
        } catch {
          setSyncResult('failed');
          toast.warning("Appointment saved, but Google Calendar sync failed.");
        }
      } else {
        toast.success("Appointment Created");
      }

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

          {/* Google Calendar Sync */}
          <div
            className="rounded-xl px-3.5 py-3"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
            }}
          >
            {calendarConnected === null ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--text-muted)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Checking calendar connection…</span>
              </div>
            ) : calendarConnected ? (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={syncToGoogle}
                    onChange={e => setSyncToGoogle(e.target.checked)}
                  />
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-all"
                    style={{
                      background: syncToGoogle ? "var(--accent)" : "var(--input-bg)",
                      border: `1px solid ${syncToGoogle ? "var(--accent)" : "var(--input-border)"}`,
                    }}
                  >
                    {syncToGoogle && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#050506" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <GCalIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-secondary)" }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Sync to Google Calendar</p>
                    {calendarEmail && (
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{calendarEmail}</p>
                    )}
                  </div>
                </div>
              </label>
            ) : (
              <div className="flex items-center gap-2">
                <GCalIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Connect Google Calendar in{" "}
                  <a href="/Settings" className="underline underline-offset-2" style={{ color: "var(--accent)" }}>
                    Settings
                  </a>{" "}
                  to enable syncing
                </p>
              </div>
            )}
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
            {saving ? (syncToGoogle ? "Saving & Syncing…" : "Saving…") : "Save Appointment"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
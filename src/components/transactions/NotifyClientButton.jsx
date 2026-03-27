import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle, Zap } from "lucide-react";
import { getPhasesForType } from "@/lib/taskLibrary";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return null;
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline", label: "Earnest Money Due" },
  { key: "inspection_deadline",    label: "Inspection Deadline" },
  { key: "due_diligence_deadline", label: "Due Diligence Deadline" },
  { key: "appraisal_deadline",     label: "Appraisal Deadline" },
  { key: "financing_deadline",     label: "Financing Commitment" },
  { key: "closing_date",           label: "Closing Date" },
];

function getRecipients(transaction) {
  const isSeller = transaction.transaction_type === "seller";
  return isSeller
    ? [transaction.sellerEmail, transaction.client_email].filter(Boolean)
    : (transaction.client_emails?.length
        ? transaction.client_emails
        : [transaction.client_email].filter(Boolean));
}

function getUpcomingDeadlines(transaction) {
  const today = new Date();
  return DEADLINE_FIELDS
    .filter(f => transaction[f.key] && new Date(transaction[f.key]) >= today)
    .sort((a, b) => new Date(transaction[a.key]) - new Date(transaction[b.key]))
    .slice(0, 3)
    .map(f => ({ label: f.label, date: transaction[f.key] }));
}

function buildEmailHTML({ transaction, phaseName, nextPhaseName, deadlines }) {
  const isSeller = transaction.transaction_type === "seller";
  const clientNames = isSeller
    ? (transaction.sellers?.length ? transaction.sellers.join(" & ") : transaction.seller || "Valued Client")
    : (transaction.buyers?.length  ? transaction.buyers.join(" & ")  : transaction.buyer  || "Valued Client");

  const address = transaction.address || "your property";

  const deadlineRows = deadlines.length > 0
    ? deadlines.map(d => `
      <tr>
        <td style="padding:6px 14px;border-bottom:1px solid #f0f4f8;font-size:13px;color:#475569;">${d.label}</td>
        <td style="padding:6px 14px;border-bottom:1px solid #f0f4f8;font-size:13px;font-weight:600;color:#0f172a;">${fmtDate(d.date)}</td>
      </tr>`).join("")
    : `<tr><td colspan="2" style="padding:8px 14px;font-size:13px;color:#94a3b8;">No upcoming deadlines at this time.</td></tr>`;

  return `
<div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:#1e3a5f;padding:28px 32px;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#93c5fd;">Transaction Update</p>
    <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">✅ ${phaseName} Complete</h1>
  </div>
  <div style="padding:28px 32px;">
    <p style="margin:0 0 16px;font-size:14px;color:#475569;">Hi ${clientNames},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
      Great news! We've successfully completed the <strong style="color:#0f172a;">${phaseName}</strong> phase
      for your transaction at <strong style="color:#0f172a;">${address}</strong>.
    </p>
    ${nextPhaseName ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#3b82f6;">Next Phase</p>
      <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:#1e3a5f;">${nextPhaseName}</p>
    </div>` : ""}
    ${deadlines.length > 0 ? `
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Upcoming Deadlines</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      ${deadlineRows}
    </table>` : ""}
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
      We'll keep you updated as we move forward. Please don't hesitate to reach out with any questions.
    </p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Transaction Coordinator · EliteTC Platform</p>
  </div>
</div>`;
}

async function sendPhaseEmail({ transaction, phaseNum, phaseName, mode = "Manual" }) {
  const recipients = getRecipients(transaction);
  if (!recipients.length) throw new Error("No client email found on this transaction.");

  const allPhases = getPhasesForType(transaction.transaction_type);
  const nextPhase = allPhases.find(p => p.phaseNum === phaseNum + 1);
  const nextPhaseName = nextPhase?.label || null;
  const deadlines = getUpcomingDeadlines(transaction);

  const subject = `Update: ${phaseName} Completed – ${transaction.address}`;
  const htmlBody = buildEmailHTML({ transaction, phaseName, nextPhaseName, deadlines });

  const isSeller = transaction.transaction_type === "seller";

  const res = await base44.functions.invoke("sendGmailEmail", {
    to: recipients,
    subject,
    htmlBody,
    transaction_id: transaction.id,
    brokerage_id: transaction.brokerage_id,
  });
  if (res.data?.error) throw new Error(res.data.error);

  await base44.entities.AIActivityLog.create({
    brokerage_id: transaction.brokerage_id,
    transaction_id: transaction.id,
    transaction_address: transaction.address,
    deadline_type: "phase_completion",
    deadline_label: `Phase Completion Email Sent (${mode}) – ${phaseName}`,
    interval_label: null,
    recipient_email: recipients.join(", "),
    recipient_name: isSeller ? (transaction.seller || "") : (transaction.buyer || ""),
    subject,
    message: `Phase completion notification sent (${mode}) for phase: ${phaseName} at ${new Date().toISOString()}`,
    response_status: "sent",
  });

  return recipients;
}

// ── Per-phase notify state helpers (stored on transaction.phase_notify_settings) ──
// Shape: { [phaseNum]: { autoEnabled: bool, notified: bool, notifiedAt: string|null } }

function getPhaseNotifySettings(transaction) {
  return transaction.phase_notify_settings || {};
}

function getPhaseSettings(transaction, phaseNum) {
  const all = getPhaseNotifySettings(transaction);
  return all[phaseNum] || { autoEnabled: false, notified: false, notifiedAt: null };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function NotifyClientButton({
  transaction,
  phaseNum,
  phaseName,
  allRequiredDone,
  onUpdateTransaction,
}) {
  const [sending, setSending] = useState(false);
  const [recentlySent, setRecentlySent] = useState(false);
  const [confirmPrompt, setConfirmPrompt] = useState(false); // "phase already complete, send now?"
  const prevDoneRef = useRef(allRequiredDone);

  const settings = getPhaseSettings(transaction, phaseNum);
  const autoEnabled = settings.autoEnabled;
  const notified = settings.notified;

  // Helper: persist settings for this phase
  const saveSettings = (patch) => {
    const current = getPhaseNotifySettings(transaction);
    const updated = {
      ...current,
      [phaseNum]: { ...getPhaseSettings(transaction, phaseNum), ...patch },
    };
    onUpdateTransaction?.({ phase_notify_settings: updated });
  };

  // ── Auto-notify: fire when phase transitions incomplete → complete ─────────
  useEffect(() => {
    const wasComplete = prevDoneRef.current;
    prevDoneRef.current = allRequiredDone;

    // Phase became incomplete → reset notified flag
    if (wasComplete && !allRequiredDone && notified) {
      saveSettings({ notified: false, notifiedAt: null });
      return;
    }

    // Phase just became complete + auto is ON + not yet notified
    if (!wasComplete && allRequiredDone && autoEnabled && !notified) {
      handleSend("Auto");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRequiredDone]);

  const handleSend = async (mode = "Manual") => {
    setSending(true);
    try {
      const recipients = await sendPhaseEmail({ transaction, phaseNum, phaseName, mode });
      saveSettings({ notified: true, notifiedAt: new Date().toISOString() });
      setRecentlySent(true);
      toast.success(`Notification sent to ${recipients.join(", ")}`);
      setTimeout(() => setRecentlySent(false), 4000);
    } catch (err) {
      toast.error(err.message || "Failed to send notification");
    }
    setSending(false);
    setConfirmPrompt(false);
  };

  // Toggle auto-notify
  const handleToggleAuto = () => {
    const newVal = !autoEnabled;
    if (newVal && allRequiredDone && !notified) {
      // Phase already complete — ask if they want to send now
      saveSettings({ autoEnabled: true });
      setConfirmPrompt(true);
    } else {
      saveSettings({ autoEnabled: newVal });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Manual notify button — only show when phase is complete */}
      {allRequiredDone && (
        recentlySent ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Notified
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSend("Manual")}
            disabled={sending}
            className="h-7 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            {sending
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
              : <><Mail className="w-3 h-3" /> Notify Client</>
            }
          </Button>
        )
      )}

      {/* Auto Notify toggle — always visible */}
      <button
        onClick={handleToggleAuto}
        title="Automatically notify client when this phase is completed"
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium transition-all ${
          autoEnabled
            ? "bg-violet-600 border-violet-600 text-white"
            : "border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600"
        }`}
      >
        <Zap className="w-3 h-3" />
        Auto Notify
        {/* Toggle pill */}
        <span className={`ml-0.5 inline-block w-6 h-3.5 rounded-full relative transition-colors ${autoEnabled ? "bg-white/30" : "bg-gray-200"}`}>
          <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${autoEnabled ? "left-3 bg-white" : "left-0.5 bg-gray-400"}`} />
        </span>
      </button>

      {/* Confirm prompt: phase already complete, send now? */}
      {confirmPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmPrompt(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-3">
            <p className="text-sm font-semibold text-gray-900">Phase already complete</p>
            <p className="text-sm text-gray-600">This phase is already complete. Would you like to send the client notification now?</p>
            <div className="flex gap-2 justify-end pt-1">
              <Button size="sm" variant="outline" onClick={() => setConfirmPrompt(false)}>Cancel</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSend("Auto")} disabled={sending}>
                {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send Now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
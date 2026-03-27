import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { getPhasesForType, normalizeTransactionType } from "@/lib/taskLibrary";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

function fmtDate(d) {
  if (!d) return null;
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function buildEmailContent({ transaction, phaseName, nextPhaseName, deadlines }) {
  const isSeller = transaction.transaction_type === "seller";
  const clientNames = isSeller
    ? (transaction.sellers?.length ? transaction.sellers.join(" & ") : transaction.seller || "Valued Client")
    : (transaction.buyers?.length ? transaction.buyers.join(" & ") : transaction.buyer || "Valued Client");

  const address = transaction.address || "your property";

  const deadlineRows = deadlines.length > 0
    ? deadlines.map(d => `
      <tr>
        <td style="padding:6px 14px;border-bottom:1px solid #f0f4f8;font-size:13px;color:#475569;">${d.label}</td>
        <td style="padding:6px 14px;border-bottom:1px solid #f0f4f8;font-size:13px;font-weight:600;color:#0f172a;">${fmtDate(d.date)}</td>
      </tr>`).join("")
    : `<tr><td colspan="2" style="padding:8px 14px;font-size:13px;color:#94a3b8;">No upcoming deadlines at this time.</td></tr>`;

  const subject = `Update: ${phaseName} Completed – ${address}`;

  const body = `
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

  return { subject, body };
}

export default function NotifyClientButton({ transaction, phaseNum, phaseName }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleNotify = async () => {
    const isSeller = transaction.transaction_type === "seller";

    // Determine recipients
    const recipients = isSeller
      ? [transaction.sellerEmail, transaction.client_email].filter(Boolean)
      : (transaction.client_emails?.length
          ? transaction.client_emails
          : [transaction.client_email].filter(Boolean));

    if (!recipients.length) {
      toast.error("No client email found on this transaction.");
      return;
    }

    setSending(true);

    // Get next phase name
    const allPhases = getPhasesForType(transaction.transaction_type);
    const nextPhase = allPhases.find(p => p.phaseNum === phaseNum + 1);
    const nextPhaseName = nextPhase?.label || null;

    // Pull upcoming deadlines (top 3 with dates)
    const DEADLINE_FIELDS = [
      { key: "earnest_money_deadline", label: "Earnest Money Due" },
      { key: "inspection_deadline",    label: "Inspection Deadline" },
      { key: "due_diligence_deadline", label: "Due Diligence Deadline" },
      { key: "appraisal_deadline",     label: "Appraisal Deadline" },
      { key: "financing_deadline",     label: "Financing Commitment" },
      { key: "closing_date",           label: "Closing Date" },
    ];
    const today = new Date();
    const deadlines = DEADLINE_FIELDS
      .filter(f => transaction[f.key] && new Date(transaction[f.key]) >= today)
      .sort((a, b) => new Date(transaction[a.key]) - new Date(transaction[b.key]))
      .slice(0, 3)
      .map(f => ({ label: f.label, date: transaction[f.key] }));

    const { subject, body } = buildEmailContent({ transaction, phaseName, nextPhaseName, deadlines });

    try {
      const res = await base44.functions.invoke("sendGmailEmail", {
        to: recipients,
        subject,
        htmlBody: body,
        transaction_id: transaction.id,
        brokerage_id: transaction.brokerage_id,
      });
      if (res.data?.error) throw new Error(res.data.error);

      // Log to AIActivityLog
      await base44.entities.AIActivityLog.create({
        brokerage_id: transaction.brokerage_id,
        transaction_id: transaction.id,
        transaction_address: transaction.address,
        deadline_type: "phase_completion",
        deadline_label: `Phase Completion Email Sent – ${phaseName}`,
        interval_label: null,
        recipient_email: recipients.join(", "),
        recipient_name: isSeller ? (transaction.seller || "") : (transaction.buyer || ""),
        subject,
        message: `Phase completion notification sent for phase: ${phaseName}`,
        response_status: "sent",
      });

      setSent(true);
      toast.success(`Notification sent to ${recipients.join(", ")}`);
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      toast.error(err.message || "Failed to send notification");
    }
    setSending(false);
  };

  if (sent) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
        <CheckCircle className="w-3 h-3" /> Notified
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleNotify}
      disabled={sending}
      className="h-7 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
    >
      {sending
        ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
        : <><Mail className="w-3 h-3" /> Notify Client</>
      }
    </Button>
  );
}
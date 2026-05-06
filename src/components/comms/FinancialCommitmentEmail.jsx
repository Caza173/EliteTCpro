import React, { useState } from "react";
import { emailApi } from "@/api/email";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Send, Eye, Loader2, AlertTriangle, X, Edit2 } from "lucide-react";
import { toast } from "sonner";

function buildEmailBody(transaction, currentUser) {
  const buyerFirst = transaction.buyers?.[0] || transaction.buyer?.split(" ")[0] || "Buyer";
  const address = transaction.address || "your property";
  const closingDate = transaction.closing_date
    ? new Date(transaction.closing_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "[Closing Date]";
  const tcName = currentUser?.full_name || currentUser?.email || "Your Transaction Coordinator";
  const teamName = transaction.agent_company || "EliteTC";

  return `Hi ${buyerFirst},

Your financial commitment has been received for ${address}.

This satisfies the financing contingency in your contract.

What this means:
- Financing is approved per contract terms
- We are clear to move toward closing
- No further action needed on the financing contingency

Next steps:
- Your lender will finalize any remaining conditions
- Title and closing coordination will continue
- We will schedule your final walkthrough closer to closing

Your closing is currently scheduled for ${closingDate}.

If you have any questions, feel free to reach out.

– ${tcName}
Transaction Coordinator
${teamName}`;
}

function getMissingFields(transaction) {
  const missing = [];
  const buyerFirst = transaction.buyers?.[0] || transaction.buyer;
  if (!buyerFirst) missing.push("Buyer first name");
  if (!transaction.address) missing.push("Property address");
  if (!transaction.closing_date) missing.push("Closing date");
  const buyerEmail = transaction.client_emails?.[0] || transaction.client_email;
  if (!buyerEmail) missing.push("Buyer email");
  return missing;
}

export default function FinancialCommitmentEmail({ transaction, currentUser }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [bodyOverride, setBodyOverride] = useState(null);

  const missingFields = getMissingFields(transaction);
  const canSend = missingFields.length === 0;
  const buyerEmail = transaction.client_emails?.[0] || transaction.client_email;
  const emailBody = bodyOverride ?? buildEmailBody(transaction, currentUser);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await emailApi.sendFinancialCommitment({
        transaction_id: transaction.id,
        body_override: bodyOverride || null,
      });
      setSent(true);
      toast.success("Financial Commitment email sent!");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["comm-automations", transaction.id] });
    } catch (err) {
      toast.error(err.message || "Failed to send email");
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Financial Commitment Email Sent</p>
          <p className="text-xs text-emerald-600 mt-0.5">Financing contingency marked cleared. Deal phase updated to Closing.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-xl border p-4 space-y-3 ${canSend ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${canSend ? "bg-emerald-100" : "bg-amber-100"}`}>
              {canSend
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                : <AlertTriangle className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Financial Commitment Received</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {canSend
                  ? `Ready to send to ${buyerEmail}`
                  : "Missing required fields — resolve to enable send"}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${canSend ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {canSend ? "✓ Ready to Send" : "⚠ Blocked"}
          </span>
        </div>

        {/* Missing fields warning */}
        {!canSend && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 space-y-1">
            <p className="text-xs font-semibold text-amber-700">Required fields missing:</p>
            {missingFields.map(f => (
              <p key={f} className="text-xs text-amber-600 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" /> {f}
              </p>
            ))}
          </div>
        )}

        {/* System actions preview */}
        <div className="rounded-lg border border-dashed px-3 py-2 space-y-1" style={{ borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>System actions on send</p>
          <div className="space-y-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            <p>✓ Mark financing contingency → <strong>Cleared</strong></p>
            <p>✓ Update deal phase → <strong>Closing / Pre-Close</strong></p>
            <p>✓ Log activity: Financial Commitment Received</p>
            <p>✓ Reduce risk score (financing risk removed)</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setPreviewOpen(true)}>
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setEditMode(true)}>
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            className={`h-8 text-xs gap-1.5 ml-auto ${canSend ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "opacity-50 cursor-not-allowed bg-gray-300"}`}
            onClick={handleSend}
            disabled={!canSend || sending}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? "Sending…" : "Send Now"}
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Email Preview</h3>
              <button onClick={() => setPreviewOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs">
                <p><span className="font-semibold text-gray-500 w-14 inline-block">To:</span> {buyerEmail || "—"}</p>
                <p><span className="font-semibold text-gray-500 w-14 inline-block">Subject:</span> Financial Commitment Received</p>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 border rounded-lg p-4">{emailBody}</pre>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => { setPreviewOpen(false); handleSend(); }} disabled={!canSend || sending}>
                <Send className="w-3.5 h-3.5" /> Send Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Edit Email Body</h3>
              <button onClick={() => setEditMode(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                rows={16}
                value={bodyOverride ?? emailBody}
                onChange={e => setBodyOverride(e.target.value)}
              />
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setBodyOverride(null); setEditMode(false); }}>Reset</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setEditMode(false)}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
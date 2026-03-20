import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Send, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * EmailComposerModal
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - transaction: object (optional — pre-fills fields)
 *  - defaultRecipients: string[] (optional)
 *  - defaultSubject: string (optional)
 *  - defaultBody: string (optional)
 *  - issueList: string[] (optional — use template mode)
 */
export default function EmailComposerModal({
  open,
  onClose,
  transaction,
  defaultRecipients,
  defaultSubject,
  defaultBody,
  issueList,
}) {
  const initRecipients = () => {
    if (defaultRecipients?.length) return defaultRecipients;
    const r = [];
    if (transaction?.client_email) r.push(transaction.client_email);
    if (transaction?.agent_email) r.push(transaction.agent_email);
    return r.length ? r : [""];
  };

  const [recipients, setRecipients] = useState(initRecipients);
  const [subject, setSubject] = useState(
    defaultSubject ||
    (transaction ? `Action Required – ${transaction.address}` : "")
  );
  const [body, setBody] = useState(
    defaultBody ||
    (transaction ? buildDefaultBody(transaction, issueList) : "")
  );
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const addRecipient = () => setRecipients(r => [...r, ""]);
  const removeRecipient = (i) => setRecipients(r => r.filter((_, idx) => idx !== i));
  const updateRecipient = (i, v) => setRecipients(r => r.map((x, idx) => idx === i ? v : x));

  const handleSend = async () => {
    const validTo = recipients.filter(r => r.trim());
    if (!validTo.length) { toast.error("Add at least one recipient"); return; }
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!body.trim()) { toast.error("Body is required"); return; }

    setSending(true);
    try {
      const res = await base44.functions.invoke("sendGmailEmail", {
        to: validTo,
        subject,
        body,
        transaction_id: transaction?.id,
        brokerage_id: transaction?.brokerage_id,
      });

      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`Email sent to ${res.data.sent} recipient(s)`);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to send email");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" /> Compose Email
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Recipients */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">To</label>
            {recipients.map((r, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="email"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="recipient@example.com"
                  value={r}
                  onChange={e => updateRecipient(i, e.target.value)}
                />
                {recipients.length > 1 && (
                  <button onClick={() => removeRecipient(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addRecipient} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add recipient
            </button>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Subject</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Message</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              rows={12}
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-700 text-white">
            {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : <><Send className="w-4 h-4 mr-2" /> Send Email</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function buildDefaultBody(transaction, issueList) {
  const issues = issueList?.length
    ? "\n" + issueList.map(i => `• ${i}`).join("\n") + "\n"
    : "";
  return `Hi,

We are reviewing the Purchase and Sales Agreement for ${transaction.address} and identified the following items that require your attention:
${issues}
Please address these at your earliest convenience.

Thank you,
Team Caza`;
}
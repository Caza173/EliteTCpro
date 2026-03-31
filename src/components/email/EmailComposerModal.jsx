import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Send, Loader2, Plus, Trash2, Paperclip, FileText, Check } from "lucide-react";
import { toast } from "sonner";

/** Build all known parties from a transaction object */
function buildParties(transaction) {
  if (!transaction) return [];
  const parties = [];
  const add = (label, email) => { if (email && email.trim()) parties.push({ label, email: email.trim() }); };

  // Clients
  if (transaction.client_emails?.length) {
    transaction.client_emails.forEach((e, i) => add(i === 0 ? "Client" : `Client ${i + 1}`, e));
  } else if (transaction.client_email) {
    add("Client", transaction.client_email);
  }

  // Agents
  add("TC / Agent", transaction.agent_email);
  add("Buyer's Agent", transaction.buyers_agent_email);
  add("Seller's Agent", transaction.sellers_agent_email);

  // Vendors
  add("Lender", transaction.lender_email);
  add("Title Company", transaction.title_company_email);
  add("Inspector", transaction.inspector_email);
  add("Attorney", transaction.attorney_email);
  add("Appraiser", transaction.appraiser_email);

  // Deduplicate by email
  const seen = new Set();
  return parties.filter(p => { if (seen.has(p.email)) return false; seen.add(p.email); return true; });
}

const DOC_LABELS = {
  purchase_and_sale: "Purchase & Sale",
  listing_agreement: "Listing Agreement",
  addendum: "Addendum",
  buyer_agency_agreement: "Buyer Agency",
  disclosure: "Disclosure",
  inspection: "Inspection",
  appraisal: "Appraisal",
  title: "Title",
  closing: "Closing",
  other: "Other",
};

/**
 * EmailComposerModal
 * Props:
 *  - open, onClose
 *  - transaction (optional)
 *  - defaultRecipients, defaultSubject, defaultBody, issueList
 *  - documents: Document[] (optional) — list of transaction docs for attachment picker
 *  - preselectedDocId: string (optional) — pre-check a document
 */
export default function EmailComposerModal({
  open,
  onClose,
  transaction,
  defaultRecipients,
  defaultSubject,
  defaultBody,
  issueList,
  documents = [],
  preselectedDocId,
  htmlBody: defaultHtmlBody,   // pre-built HTML (renders as preview, editable via plain text override)
}) {
  const parties = buildParties(transaction);

  const initSelectedEmails = () => {
    if (defaultRecipients?.length) return new Set(defaultRecipients);
    const r = new Set();
    if (transaction?.client_emails?.length) transaction.client_emails.forEach(e => r.add(e));
    else if (transaction?.client_email) r.add(transaction.client_email);
    if (transaction?.agent_email) r.add(transaction.agent_email);
    return r;
  };

  const [selectedPartyEmails, setSelectedPartyEmails] = useState(initSelectedEmails);
  const [customRecipients, setCustomRecipients] = useState([""]);
  const [subject, setSubject] = useState(
    defaultSubject || (transaction ? `Action Required – ${transaction.address}` : "")
  );
  const [body, setBody] = useState(
    defaultBody || (transaction ? buildDefaultBody(transaction, issueList) : "")
  );
  // If an HTML body was provided, we send it as HTML. User can switch to plain text override.
  const [htmlBody, setHtmlBody] = useState(defaultHtmlBody || null);
  const [showHtmlPreview, setShowHtmlPreview] = useState(!!defaultHtmlBody);
  const [sending, setSending] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState(preselectedDocId ? [preselectedDocId] : []);

  // Sync preselected doc when it changes (e.g. opened from doc row)
  useEffect(() => {
    if (preselectedDocId) setSelectedDocIds([preselectedDocId]);
  }, [preselectedDocId, open]);

  if (!open) return null;

  const toggleParty = (email) => setSelectedPartyEmails(prev => {
    const next = new Set(prev);
    if (next.has(email)) next.delete(email); else next.add(email);
    return next;
  });

  const addCustomRecipient = () => setCustomRecipients(r => [...r, ""]);
  const removeCustomRecipient = (i) => setCustomRecipients(r => r.filter((_, idx) => idx !== i));
  const updateCustomRecipient = (i, v) => setCustomRecipients(r => r.map((x, idx) => idx === i ? v : x));

  const toggleDoc = (id) => {
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    const validTo = [
      ...selectedPartyEmails,
      ...customRecipients.filter(r => r.trim()),
    ];
    if (!validTo.length) { toast.error("Add at least one recipient"); return; }
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    const hasContent = htmlBody || body.trim();
    if (!hasContent) { toast.error("Body is required"); return; }

    setSending(true);
    const attachedDocs = documents.filter(d => selectedDocIds.includes(d.id));

    // If HTML body — append attachment links as an HTML block
    let finalHtmlBody = htmlBody || null;
    let finalBody = body;

    if (attachedDocs.length > 0) {
      const links = attachedDocs.map(d => `• ${d.file_name}: ${d.file_url}`).join("\n");
      if (finalHtmlBody) {
        const linksHtml = attachedDocs.map(d =>
          `<li><a href="${d.file_url}" style="color:#2563eb;">${d.file_name}</a></li>`
        ).join("");
        finalHtmlBody += `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/><p style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin:0 0 8px;">Attachments</p><ul style="margin:0;padding:0 0 0 16px;">${linksHtml}</ul>`;
      } else {
        finalBody += `\n\nAttached Documents:\n${links}`;
      }
    }

    try {
      const res = await base44.functions.invoke("sendGmailEmail", {
        to: validTo,
        subject,
        ...(finalHtmlBody ? { htmlBody: finalHtmlBody } : { body: finalBody }),
        transaction_id: transaction?.id,
        brokerage_id: transaction?.brokerage_id,
        attachment_document_ids: selectedDocIds,
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

            {/* Party quick-select chips */}
            {parties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {parties.map(p => {
                  const selected = selectedPartyEmails.has(p.email);
                  return (
                    <button
                      key={p.email}
                      type="button"
                      onClick={() => toggleParty(p.email)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-400"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      <span className="font-semibold">{p.label}</span>
                      <span className={selected ? "text-blue-200" : "text-gray-400"}>{p.email}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom / additional recipients */}
            {customRecipients.map((r, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="email"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="other@example.com"
                  value={r}
                  onChange={e => updateCustomRecipient(i, e.target.value)}
                />
                {customRecipients.length > 1 && (
                  <button onClick={() => removeCustomRecipient(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addCustomRecipient} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add other recipient
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</label>
              {htmlBody && (
                <button
                  onClick={() => setShowHtmlPreview(p => !p)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {showHtmlPreview ? "Edit as plain text" : "Show preview"}
                </button>
              )}
            </div>
            {showHtmlPreview && htmlBody ? (
              <div
                className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 overflow-auto text-sm"
                style={{ maxHeight: "360px" }}
                dangerouslySetInnerHTML={{ __html: htmlBody }}
              />
            ) : (
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                rows={10}
                value={body}
                onChange={e => { setBody(e.target.value); setHtmlBody(null); }}
                placeholder={htmlBody ? "Type here to override the HTML template with plain text…" : ""}
              />
            )}
          </div>

          {/* Document Attachments */}
          {documents.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Paperclip className="w-3.5 h-3.5" /> Attach Documents
                {selectedDocIds.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-[10px]">
                    {selectedDocIds.length} selected
                  </span>
                )}
              </label>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {documents.map(doc => (
                  <label key={doc.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-300"
                    />
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate flex-1">{doc.file_name || "Document"}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{DOC_LABELS[doc.doc_type] || "Other"}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Document links will be appended to the email body.</p>
            </div>
          )}
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
  if (issueList?.length) {
    const issues = issueList.map(i => `• ${i}`).join("\n");
    return `Hi,

We are reviewing the Purchase and Sales Agreement for ${transaction.address} and identified the following items that require your attention:

${issues}

Please address these at your earliest convenience.

Thank you,
Team Caza`;
  }

  return `Hi,

We are following up regarding the transaction at ${transaction.address}.

Please don't hesitate to reach out if you have any questions.

Thank you,
Team Caza`;
}
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, X as XIcon, Plus } from "lucide-react";
import { toast } from "sonner";

const ZILLOW_LINK = "https://zillow.com/reviews/write/?s=X1-ZU15ev58s7ky03t_4u6i9";

const DARK = {
  bg: "#0f172a",
  border: "#1e293b",
  borderFocus: "#3b82f6",
  text: "#e2e8f0",
  muted: "#64748b",
  chip: "#1e293b",
  chipText: "#e2e8f0",
  chipX: "#94a3b8",
  previewBg: "#0b1220",
  labelColor: "#94a3b8",
};

function interpolate(template, vars) {
  let result = template;
  Object.entries(vars).forEach(([key, val]) => {
    if (val) result = result.replace(new RegExp(`{{${key}}}`, "g"), val);
  });
  return result;
}

// ── Email chip input ─────────────────────────────────────────────────────────
function ChipEmailInput({ label, emails, onChange, placeholder }) {
  const [inputVal, setInputVal] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const addEmail = (val) => {
    const trimmed = val.trim().replace(/,$/, "");
    if (trimmed && !emails.includes(trimmed)) {
      onChange([...emails, trimmed]);
    }
    setInputVal("");
  };

  const removeEmail = (idx) => onChange(emails.filter((_, i) => i !== idx));

  const handleKeyDown = (e) => {
    if (["Enter", ",", "Tab"].includes(e.key) && inputVal.trim()) {
      e.preventDefault();
      addEmail(inputVal);
    } else if (e.key === "Backspace" && !inputVal && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  const containerStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    padding: "8px",
    backgroundColor: DARK.bg,
    border: `1px solid ${focused ? DARK.borderFocus : DARK.border}`,
    borderRadius: "8px",
    boxShadow: focused ? `0 0 0 1px ${DARK.borderFocus}` : "none",
    transition: "all 0.2s ease",
    cursor: "text",
  };

  return (
    <div>
      <label style={{ fontSize: "12px", color: DARK.labelColor, display: "block", marginBottom: "4px" }}>
        {label}
      </label>
      <div style={containerStyle} onClick={() => inputRef.current?.focus()}>
        {emails.map((email, i) => (
          <span
            key={i}
            style={{
              backgroundColor: DARK.chip,
              color: DARK.chipText,
              padding: "3px 8px",
              borderRadius: "6px",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
            }}
          >
            {email}
            <button
              onClick={(e) => { e.stopPropagation(); removeEmail(i); }}
              style={{ background: "none", border: "none", color: DARK.chipX, cursor: "pointer", lineHeight: 1, padding: 0 }}
            >
              <XIcon style={{ width: 11, height: 11 }} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="email"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { setFocused(false); if (inputVal.trim()) addEmail(inputVal); }}
          onFocus={() => setFocused(true)}
          placeholder={emails.length === 0 ? placeholder : ""}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: DARK.text,
            flex: 1,
            minWidth: "120px",
            fontSize: "13px",
          }}
        />
      </div>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function ReviewEmailModal({ open, onClose, transaction, currentUser, task, onTaskUpdated }) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("Quick favor - would you leave a review?");
  const [showCC, setShowCC] = useState(false);
  const [subjectFocused, setSubjectFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);

  const initialEmails = transaction?.client_emails?.length
    ? transaction.client_emails
    : transaction?.client_email ? [transaction.client_email] : [];

  const [toEmails, setToEmails] = useState(initialEmails);
  const [ccEmails, setCcEmails] = useState([]);

  const [body, setBody] = useState(`Hi {{client_name}},

Thank you again for working with us on {{property_address}}. It was a pleasure helping you through the transaction.

When you have a minute, we'd really appreciate it if you would leave a Zillow review:

${ZILLOW_LINK}

Thank you again. We appreciate your trust and support.

Best,
{{agent_name}}
{{tc_name}}`);

  if (!transaction) return null;

  const clientName = transaction.buyers?.length ? transaction.buyers[0] : transaction.buyer || "Valued Client";
  const vars = {
    client_name: clientName,
    property_address: transaction.address || "Property",
    agent_name: transaction.buyers_agent_name || transaction.agent || "Your Agent",
    tc_name: currentUser?.full_name || currentUser?.email || "TC",
  };
  const finalBody = interpolate(body, vars);
  const finalSubject = interpolate(subject, vars);

  const handleSend = async () => {
    if (!toEmails.length) { toast.error("Add at least one recipient"); return; }
    setLoading(true);
    try {
      const allRecipients = [...toEmails, ...ccEmails];
      await Promise.all(toEmails.map(email =>
        base44.integrations.Core.SendEmail({ to: email, subject: finalSubject, body: finalBody }).catch(() => {})
      ));

      await base44.entities.Transaction.update(transaction.id, {
        email_tracking: {
          ...transaction.email_tracking,
          zillow_review_sent_at: new Date().toISOString(),
          zillow_review_sent_by: currentUser?.email,
          zillow_review_drafted_at: null,
        },
        last_activity_at: new Date().toISOString(),
      });

      await base44.entities.AuditLog.create({
        brokerage_id: transaction.brokerage_id,
        transaction_id: transaction.id,
        actor_email: currentUser?.email,
        action: "zillow_review_email_sent",
        entity_type: "task",
        entity_id: task?.id,
        description: `Zillow review request sent to ${allRecipients.length} recipient(s)`,
        before: null,
        after: { sent_at: new Date().toISOString() },
      }).catch(() => {});

      toast.success(`Review request sent to ${toEmails.length} recipient(s)`);
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to send email");
    }
    setLoading(false);
  };

  const inputStyle = (focused) => ({
    width: "100%",
    backgroundColor: DARK.bg,
    border: `1px solid ${focused ? DARK.borderFocus : DARK.border}`,
    color: DARK.text,
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    boxShadow: focused ? `0 0 0 1px ${DARK.borderFocus}` : "none",
    transition: "all 0.2s ease",
    resize: "vertical",
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl"
        style={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "#f1f5f9" }}>Send Zillow Review Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* To field with + CC toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label style={{ fontSize: "12px", color: DARK.labelColor }}>To</label>
              {!showCC && (
                <button
                  onClick={() => setShowCC(true)}
                  style={{ fontSize: "11px", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                >
                  <Plus style={{ width: 11, height: 11 }} /> CC
                </button>
              )}
            </div>
            <ChipEmailInput
              label=""
              emails={toEmails}
              onChange={setToEmails}
              placeholder="Recipient email — press Enter or comma to add"
            />
          </div>

          {/* CC field (collapsed by default) */}
          {showCC && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label style={{ fontSize: "12px", color: DARK.labelColor }}>CC (optional)</label>
                <button
                  onClick={() => { setShowCC(false); setCcEmails([]); }}
                  style={{ fontSize: "11px", color: DARK.muted, background: "none", border: "none", cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
              <ChipEmailInput
                label=""
                emails={ccEmails}
                onChange={setCcEmails}
                placeholder="CC email — press Enter or comma to add"
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <label style={{ fontSize: "12px", color: DARK.labelColor, display: "block", marginBottom: "4px" }}>Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              onFocus={() => setSubjectFocused(true)}
              onBlur={() => setSubjectFocused(false)}
              style={inputStyle(subjectFocused)}
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <div>
            <label style={{ fontSize: "12px", color: DARK.labelColor, display: "block", marginBottom: "4px" }}>Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onFocus={() => setBodyFocused(true)}
              onBlur={() => setBodyFocused(false)}
              style={{ ...inputStyle(bodyFocused), height: "200px", fontFamily: "monospace", fontSize: "13px" }}
              placeholder="Email body"
            />
            <p style={{ fontSize: "10px", color: DARK.muted, marginTop: "4px" }}>
              {"Available variables: {{client_name}}, {{property_address}}, {{agent_name}}, {{tc_name}}"}
            </p>
          </div>

          {/* Preview */}
          <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: DARK.previewBg, border: `1px solid ${DARK.border}` }}>
            <p style={{ fontSize: "10px", fontWeight: 600, color: DARK.labelColor, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</p>
            <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.6" }}>
              <p><strong style={{ color: "#e2e8f0" }}>Subject:</strong> {finalSubject}</p>
              <p style={{ marginTop: "6px" }}><strong style={{ color: "#e2e8f0" }}>Body:</strong></p>
              <p style={{ whiteSpace: "pre-wrap", marginTop: "4px" }}>{finalBody}</p>
            </div>
          </div>

          {/* Zillow link */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <code style={{ fontSize: "11px", color: "#93c5fd", flex: 1, wordBreak: "break-all" }}>{ZILLOW_LINK}</code>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-blue-400 hover:text-blue-300"
              onClick={() => { navigator.clipboard.writeText(ZILLOW_LINK); toast.success("Link copied"); }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSend} disabled={loading || !toEmails.length} className="bg-blue-600 hover:bg-blue-700 text-xs h-8">
              {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : "Send"}
            </Button>
            <Button variant="outline" onClick={onClose} className="text-xs h-8" style={{ borderColor: DARK.border, color: DARK.muted }}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
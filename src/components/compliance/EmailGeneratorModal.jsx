import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, ExternalLink, Wand2, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function buildTransactionContext(transaction) {
  const fmt = (d) => { try { return d ? format(new Date(d), "MM/dd/yyyy") : "N/A"; } catch { return d || "N/A"; } };
  return {
    property_address: transaction.address || "N/A",
    buyer_name: (transaction.buyers || []).join(", ") || transaction.buyer || "N/A",
    seller_name: (transaction.sellers || []).join(", ") || transaction.seller || "N/A",
    buyer_agent_name: transaction.buyers_agent_name || "N/A",
    buyer_agent_email: transaction.buyers_agent_email || "",
    buyer_agent_brokerage: transaction.buyer_brokerage || "N/A",
    seller_agent_name: transaction.sellers_agent_name || "N/A",
    seller_agent_email: transaction.sellers_agent_email || "",
    seller_agent_brokerage: transaction.seller_brokerage || "N/A",
    title_company_name: transaction.closing_title_company || "N/A",
    title_company_email: transaction.title_company_email || "",
    lender_email: transaction.lender_email || "",
    client_email: transaction.client_email || (transaction.client_emails?.[0] ?? ""),
    tc_email: transaction.agent_email || "",
    closing_date: fmt(transaction.closing_date),
    inspection_deadline: fmt(transaction.inspection_deadline),
    financing_deadline: fmt(transaction.financing_deadline),
    earnest_money_deadline: fmt(transaction.earnest_money_deadline),
  };
}

/**
 * Resolve real email recipients from transaction fields based on issue type.
 * No guessing — only uses actual stored emails.
 */
function resolveRecipients(issue, ctx) {
  const add = (set, email) => { if (email) set.add(email); };
  const toSet = new Set();
  const ccSet = new Set();
  const category = (issue.category || "").toLowerCase();
  const issueType = (issue.issue_type || "").toLowerCase();
  const msg = (issue.message || "").toLowerCase();

  // Inspection issues → buyer_agent, buyer
  if (category === "inspection" || msg.includes("inspection")) {
    add(toSet, ctx.buyer_agent_email);
    add(ccSet, ctx.client_email);
  }
  // Financing issues → lender, buyer_agent
  else if (category === "financing" || issueType === "financial" || msg.includes("financ") || msg.includes("loan") || msg.includes("lender")) {
    add(toSet, ctx.lender_email);
    add(ccSet, ctx.buyer_agent_email);
  }
  // Title / closing issues → title_company, both agents
  else if (category === "title" || category === "closing" || msg.includes("title") || msg.includes("closing")) {
    add(toSet, ctx.title_company_email);
    add(ccSet, ctx.buyer_agent_email);
    add(ccSet, ctx.seller_agent_email);
  }
  // Listing issues → seller_agent, seller
  else if (category === "listing" || msg.includes("listing") || msg.includes("seller")) {
    add(toSet, ctx.seller_agent_email);
    add(ccSet, ctx.client_email);
  }
  // Missing signatures → all responsible parties + agents
  else if (issueType === "signature" || msg.includes("signature") || msg.includes("sign")) {
    if (msg.includes("buyer")) {
      add(toSet, ctx.buyer_agent_email);
      add(ccSet, ctx.client_email);
    } else if (msg.includes("seller")) {
      add(toSet, ctx.seller_agent_email);
    } else {
      add(toSet, ctx.buyer_agent_email);
      add(toSet, ctx.seller_agent_email);
      add(ccSet, ctx.client_email);
    }
  }
  // Default fallback → TC + buyer agent
  else {
    add(toSet, ctx.buyer_agent_email);
    add(ccSet, ctx.tc_email);
  }

  // Always CC the TC
  add(ccSet, ctx.tc_email);

  return {
    to: Array.from(toSet).filter(Boolean).join(", "),
    cc: Array.from(ccSet).filter(e => !toSet.has(e) && e).join(", "),
  };
}

export default function EmailGeneratorModal({ issue, transaction, onClose, currentUser }) {
  const ctx = buildTransactionContext(transaction);
  const resolved = resolveRecipients(issue, ctx);

  // Determine locked TC email
  const tcEmail = (() => {
    const role = currentUser?.role;
    if (role === "tc" || role === "tc_lead" || role === "admin" || role === "owner") {
      return currentUser?.email || null;
    }
    return ctx.tc_email || null;
  })();

  // Build initial CC: always include TC, plus any resolved CCs
  const buildInitialCc = () => {
    const parts = new Set();
    if (tcEmail) parts.add(tcEmail);
    resolved.cc.split(",").map(s => s.trim()).filter(Boolean).forEach(e => parts.add(e));
    return Array.from(parts).join(", ");
  };

  const [loading, setLoading] = useState(false);
  const [emailTo, setEmailTo] = useState(resolved.to);
  const [emailCc, setEmailCc] = useState(buildInitialCc());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generated, setGenerated] = useState(false);
  const [sending, setSending] = useState(false);

  const generateEmail = async () => {
    setLoading(true);

    // Determine tone level based on severity
    const severity = (issue.severity || "warning").toLowerCase();
    let toneLevel, toneInstructions;
    if (severity === "info") {
      toneLevel = "NEUTRAL";
      toneInstructions = `Tone: Informational. Assumes the issue may already be in progress. No pressure.
Opening: Flag the item casually.
CTA: "Please let me know the status or if this has already been handled."`;
    } else if (severity === "warning") {
      toneLevel = "FIRM";
      toneInstructions = `Tone: Direct, adds light urgency without pressure.
Opening: "Following up on the transaction for [address]."
CTA: "Please confirm status or next steps to keep everything on track for closing."`;
    } else {
      toneLevel = "ESCALATION";
      toneInstructions = `Tone: Clear and firm, still professional and controlled. No emotional or threatening language.
Opening: "I wanted to follow up on the transaction for [address]."
CTA: "Please provide an update as soon as possible on status and next steps."
Note: Mention that this may impact the closing timeline.`;
    }

    const prompt = `You are a professional real estate transaction coordinator drafting a transaction follow-up email.

TONE: ${toneLevel}
${toneInstructions}

STRICT RULES — follow exactly:
- Under 120 words
- No exclamation points
- No emojis
- No words like: "critical", "urgent", "immediate attention", "high severity", "failure", "violation"
- No legal jargon or compliance-heavy language
- Plain, calm, solution-focused language only
- Always assume positive intent — do not accuse
- Sign off as "Team EliteTC"

Transaction details:
- Property Address: ${ctx.property_address}
- Buyer(s): ${ctx.buyer_name}
- Seller(s): ${ctx.seller_name}
- Closing Date: ${ctx.closing_date}
- Inspection Deadline: ${ctx.inspection_deadline}
- Financing Deadline: ${ctx.financing_deadline}

Issue:
"${issue.message}"
Category: ${issue.category || "general"}

Return JSON with:
{
  "subject": "concise subject line (no alarming words)",
  "body": "plain text email body with line breaks"
}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
          },
          required: ["subject", "body"],
        },
      });

      setSubject(result.subject || `Following Up: ${issue.message} – ${ctx.property_address}`);
      setBody(result.body || "");
      // Never overwrite resolved recipients from LLM output
      setGenerated(true);
    } catch (e) {
      console.error("Email generation failed:", e);
    }
    setLoading(false);
  };

  const openGmail = () => {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: emailTo,
      cc: emailCc,
      su: subject,
      body: body,
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4 text-blue-500" />
            AI Email Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Issue context */}
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800">
            <span className="font-medium">Issue: </span>{issue.message}
          </div>
          {/* Warn if no recipients resolved */}
          {!resolved.to && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              ⚠ No recipient email found for this issue type. Please add contact emails to the transaction and try again, or enter recipients manually.
            </div>
          )}

          {!generated ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm text-gray-500 text-center">
                The AI will generate a professional email based on this compliance issue and transaction data.
              </p>
              <Button
                onClick={generateEmail}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                  : <><Wand2 className="w-4 h-4 mr-2" /> Generate Email</>
                }
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="recipient@email.com" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5">
                    CC
                    {tcEmail && (
                      <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">TC auto-included</span>
                    )}
                  </Label>
                  <Input value={emailCc} onChange={e => {
                    // Prevent removing TC email
                    const val = e.target.value;
                    if (tcEmail && !val.includes(tcEmail)) return;
                    setEmailCc(val);
                  }} placeholder="cc@email.com" className="h-8 text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} className="h-8 text-sm" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Body</Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={12}
                  className="text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateEmail}
                  disabled={loading || sending}
                  className="text-xs"
                >
                  {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                  Regenerate
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={openGmail}
                    className="gap-2 text-sm"
                    disabled={sending}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Gmail
                  </Button>
                  <Button
                    onClick={async () => {
                      const to = emailTo.split(",").map(s => s.trim()).filter(Boolean);
                      if (!to.length) { toast.error("Enter a recipient"); return; }
                      const cc = emailCc.split(",").map(s => s.trim()).filter(Boolean);
                      if (tcEmail && !cc.includes(tcEmail)) { toast.error("TC email must remain in CC"); return; }
                      setSending(true);
                      try {
                        const res = await base44.functions.invoke("sendGmailEmail", {
                          to,
                          cc,
                          subject,
                          body,
                          transaction_id: transaction?.id,
                          brokerage_id: transaction?.brokerage_id,
                        });
                        if (res.data?.error) throw new Error(res.data.error);
                        toast.success("Email sent!");
                        onClose();
                      } catch (e) {
                        toast.error(e.message || "Send failed");
                      }
                      setSending(false);
                    }}
                    disabled={sending}
                    className="bg-blue-600 hover:bg-blue-700 gap-2 text-sm"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
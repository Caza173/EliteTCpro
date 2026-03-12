import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, ExternalLink, Wand2 } from "lucide-react";
import { format } from "date-fns";

function buildTransactionContext(transaction) {
  const fmt = (d) => { try { return d ? format(new Date(d), "MM/dd/yyyy") : "N/A"; } catch { return d || "N/A"; } };
  return {
    property_address: transaction.address || "N/A",
    buyer_name: (transaction.buyers || []).join(", ") || transaction.buyer || "N/A",
    seller_name: (transaction.sellers || []).join(", ") || transaction.seller || "N/A",
    buyer_agent_name: transaction.buyers_agent_name || "N/A",
    buyer_agent_email: transaction.agent_email || "",
    buyer_agent_brokerage: transaction.buyer_brokerage || "N/A",
    seller_agent_name: transaction.sellers_agent_name || "N/A",
    seller_agent_email: "",
    seller_agent_brokerage: transaction.seller_brokerage || "N/A",
    title_company_name: transaction.closing_title_company || "N/A",
    closing_date: fmt(transaction.closing_date),
    inspection_deadline: fmt(transaction.inspection_deadline),
    financing_deadline: fmt(transaction.financing_deadline),
    earnest_money_deadline: fmt(transaction.earnest_money_deadline),
  };
}

export default function EmailGeneratorModal({ issue, transaction, onClose }) {
  const ctx = buildTransactionContext(transaction);

  const [loading, setLoading] = useState(false);
  const [emailTo, setEmailTo] = useState(ctx.seller_agent_email || "");
  const [emailCc, setEmailCc] = useState(ctx.buyer_agent_email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generated, setGenerated] = useState(false);

  const generateEmail = async () => {
    setLoading(true);
    const prompt = `
You are a professional real estate transaction coordinator at a brokerage.
Generate a professional, concise email to a real estate agent about a compliance issue found in a transaction document.

Transaction details:
- Property Address: ${ctx.property_address}
- Buyer(s): ${ctx.buyer_name}
- Seller(s): ${ctx.seller_name}
- Buyer's Agent: ${ctx.buyer_agent_name} (${ctx.buyer_agent_brokerage})
- Seller's Agent: ${ctx.seller_agent_name} (${ctx.seller_agent_brokerage})
- Title Company: ${ctx.title_company_name}
- Closing Date: ${ctx.closing_date}
- Inspection Deadline: ${ctx.inspection_deadline}

Compliance Issue Detected:
"${issue.message}"
Category: ${issue.category || "general"}
Severity: ${issue.severity || "warning"}

Generate a professional email. Return JSON with these exact keys:
{
  "to": "seller agent email if relevant, otherwise buyer agent email",
  "subject": "email subject line",
  "body": "full email body text (no HTML, plain text, use line breaks)"
}

The email should:
- Address the specific issue directly
- Be professional but friendly
- Reference the property address
- Request action clearly
- Sign off as "Team EliteTC"
- Be concise (under 200 words)
`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            to: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
          },
          required: ["subject", "body"],
        },
      });

      setSubject(result.subject || `Action Required: ${issue.message} – ${ctx.property_address}`);
      setBody(result.body || "");
      if (result.to) setEmailTo(result.to);
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
                  <Label className="text-xs">CC</Label>
                  <Input value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="cc@email.com" className="h-8 text-sm" />
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

              <div className="flex items-center justify-between pt-2 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateEmail}
                  disabled={loading}
                  className="text-xs"
                >
                  {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                  Regenerate
                </Button>
                <Button
                  onClick={openGmail}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Gmail
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
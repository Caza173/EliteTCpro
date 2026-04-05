import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

const ZILLOW_LINK = "https://zillow.com/reviews/write/?s=X1-ZU15ev58s7ky03t_4u6i9";

function interpolate(template, vars) {
  let result = template;
  Object.entries(vars).forEach(([key, val]) => {
    if (val) result = result.replace(new RegExp(`{{${key}}}`, "g"), val);
  });
  return result;
}

export default function ReviewEmailModal({ open, onClose, transaction, currentUser, task, onTaskUpdated }) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("Quick favor - would you leave a review?");
  const [body, setBody] = useState(`Hi {{client_name}},

Thank you again for working with us on {{property_address}}. It was a pleasure helping you through the transaction.

When you have a minute, we'd really appreciate it if you would leave a Zillow review:

${ZILLOW_LINK}

Thank you again. We appreciate your trust and support.

Best,
{{agent_name}}
{{tc_name}}`);

  if (!transaction) return null;

  const clientEmails = transaction.client_emails?.length ? transaction.client_emails : (transaction.client_email ? [transaction.client_email] : []);
  const clientName = transaction.buyers?.length ? transaction.buyers[0] : transaction.buyer || "Valued Client";

  const vars = {
    client_name: clientName,
    property_address: transaction.address || "Property",
    agent_name: transaction.buyers_agent_name || transaction.agent || "Your Agent",
    tc_name: currentUser?.full_name || currentUser?.email || "TC"
  };

  const finalBody = interpolate(body, vars);

  const handleSend = async () => {
    if (!clientEmails.length) { toast.error("No client email on file"); return; }
    
    setLoading(true);
    try {
      // Send emails
      await Promise.all(clientEmails.map(email =>
        base44.integrations.Core.SendEmail({
          to: email,
          subject,
          body: finalBody
        }).catch(() => {})
      ));

      // Update transaction tracking
      await base44.entities.Transaction.update(transaction.id, {
        email_tracking: {
          ...transaction.email_tracking,
          zillow_review_sent_at: new Date().toISOString(),
          zillow_review_sent_by: currentUser?.email,
          zillow_review_drafted_at: null
        },
        last_activity_at: new Date().toISOString()
      });

      // Log activity
      await base44.entities.AuditLog.create({
        brokerage_id: transaction.brokerage_id,
        transaction_id: transaction.id,
        actor_email: currentUser?.email,
        action: "zillow_review_email_sent",
        entity_type: "task",
        entity_id: task?.id,
        description: `Zillow review request sent to ${clientEmails.length} recipient(s)`,
        before: null,
        after: { sent_at: new Date().toISOString() }
      }).catch(() => {});

      toast.success(`Review request sent to ${clientEmails.length} recipient(s)`);
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to send email");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Zillow Review Request</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <label className="text-xs font-semibold text-gray-600">Recipients</label>
            <div className="mt-1 text-sm text-gray-700 space-y-1">
              {clientEmails.map((email, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-blue-50 border border-blue-100 text-xs">
                  <span>{email}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-gray-600">Subject</label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="h-8 text-xs mt-1"
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-semibold text-gray-600">Message</label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="text-xs mt-1 h-56 font-mono"
              placeholder="Email body"
            />
            <p className="text-[10px] text-gray-400 mt-1">Available variables: {{client_name}}, {{property_address}}, {{agent_name}}, {{tc_name}}</p>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
            <p className="text-[10px] font-semibold text-gray-600">Preview</p>
            <div className="text-xs text-gray-700 space-y-2 whitespace-pre-wrap">
              <p><strong>Subject:</strong> {subject}</p>
              <p><strong>Body:</strong></p>
              <p>{finalBody}</p>
            </div>
          </div>

          {/* Copy link button */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
            <code className="text-xs text-blue-700 flex-1 break-all">{ZILLOW_LINK}</code>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() => {
                navigator.clipboard.writeText(ZILLOW_LINK);
                toast.success("Link copied");
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSend}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-xs h-8"
            >
              {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : "Send"}
            </Button>
            <Button variant="outline" onClick={onClose} className="text-xs h-8">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
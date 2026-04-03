import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function interpolate(template, vars) {
  let result = template;
  Object.entries(vars).forEach(([key, val]) => {
    if (val) result = result.replace(new RegExp(`{{${key}}}`, "g"), val);
  });
  return result;
}

export default function UtilityDraftModal({ open, onClose, transaction, currentUser, task, onTaskUpdated, isExistingDraft }) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("draft"); // "draft" or "utility"
  
  const sellerAgentEmail = transaction.sellers_agent_email;
  const sellerAgentName = transaction.sellers_agent_name || "Seller Agent";
  
  const vars = {
    seller_agent_name: sellerAgentName,
    buyer_name: transaction.buyers?.length ? transaction.buyers[0] : transaction.buyer || "Buyer",
    property_address: transaction.address || "Property",
    closing_date: transaction.closing_date || "closing date",
    agent_name: transaction.agent || "Your Agent",
    tc_name: currentUser?.full_name || currentUser?.email || "TC"
  };

  const defaultSubject = "Utility information request for {{property_address}}";
  const defaultBody = `Hi {{seller_agent_name}},

We have received clear to close for {{property_address}} and are getting final details organized for the buyer.

When you have a chance, please send over the utility information for the property, including any available providers and account transfer details if applicable.

Thank you,
{{tc_name}}
{{agent_name}}`;

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  
  const [utilityInfo, setUtilityInfo] = useState(transaction.utility_info || {});

  const finalBody = interpolate(body, vars);

  const handleSaveDraft = async () => {
    // Just save the draft state
    await base44.entities.Transaction.update(transaction.id, {
      email_tracking: {
        ...transaction.email_tracking,
        utility_request_draft_created_at: new Date().toISOString()
      }
    });
    toast.success("Draft saved");
    onTaskUpdated?.();
  };

  const handleSendEmail = async () => {
    if (!sellerAgentEmail) { toast.error("Seller agent email not found"); return; }
    
    setLoading(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: sellerAgentEmail,
        subject,
        body: finalBody
      });

      await base44.entities.Transaction.update(transaction.id, {
        email_tracking: {
          ...transaction.email_tracking,
          utility_request_sent_at: new Date().toISOString(),
          utility_request_sent_by: currentUser?.email
        },
        last_activity_at: new Date().toISOString()
      });

      await base44.entities.AuditLog.create({
        brokerage_id: transaction.brokerage_id,
        transaction_id: transaction.id,
        actor_email: currentUser?.email,
        action: "utility_request_email_sent",
        entity_type: "task",
        entity_id: task?.id,
        description: `Utility information request sent to ${sellerAgentEmail}`,
        before: null,
        after: { sent_at: new Date().toISOString() }
      }).catch(() => {});

      toast.success("Email sent to seller agent");
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to send email");
    }
    setLoading(false);
  };

  const handleSaveUtilityInfo = async () => {
    await base44.entities.Transaction.update(transaction.id, {
      utility_info: utilityInfo,
      email_tracking: {
        ...transaction.email_tracking,
        utility_info_received_at: new Date().toISOString()
      },
      last_activity_at: new Date().toISOString()
    });

    await base44.entities.AuditLog.create({
      brokerage_id: transaction.brokerage_id,
      transaction_id: transaction.id,
      actor_email: currentUser?.email,
      action: "utility_info_entered",
      entity_type: "transaction",
      entity_id: transaction.id,
      description: "Utility information entered manually",
      before: null,
      after: utilityInfo
    }).catch(() => {});

    toast.success("Utility information saved");
    onTaskUpdated?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Utility Information Request</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 border-b mb-4">
          <button
            onClick={() => setTab("draft")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "draft"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            Email Draft
          </button>
          <button
            onClick={() => setTab("utility")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "utility"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            Utility Info
          </button>
        </div>

        {tab === "draft" && (
          <div className="space-y-4">
            {/* Recipient */}
            <div>
              <label className="text-xs font-semibold text-gray-600">Recipient</label>
              <div className="mt-1 px-2 py-1 rounded bg-blue-50 border border-blue-100 text-xs text-gray-700">
                {sellerAgentName} &lt;{sellerAgentEmail}&gt;
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-semibold text-gray-600">Subject</label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-xs font-semibold text-gray-600">Message</label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                className="text-xs mt-1 h-48 font-mono"
              />
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
              <p className="text-[10px] font-semibold text-gray-600">Preview</p>
              <div className="text-xs text-gray-700 whitespace-pre-wrap">{finalBody}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveUtilityInfo}
                variant="outline"
                className="text-xs h-8"
              >
                Save Draft Only
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-xs h-8"
              >
                {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : "Send Email"}
              </Button>
              <Button variant="outline" onClick={onClose} className="text-xs h-8">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {tab === "utility" && (
          <div className="space-y-3">
            {[
              ["electric_provider", "Electric Provider"],
              ["natural_gas_provider", "Natural Gas"],
              ["propane_provider", "Propane"],
              ["oil_provider", "Oil"],
              ["water_provider", "Water"],
              ["sewer_provider", "Sewer"],
              ["internet_provider", "Internet"],
              ["trash_provider", "Trash"],
              ["other_utility_notes", "Other Notes"]
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-600">{label}</label>
                {key === "other_utility_notes" ? (
                  <Textarea
                    value={utilityInfo[key] || ""}
                    onChange={e => setUtilityInfo({ ...utilityInfo, [key]: e.target.value })}
                    className="text-xs mt-1 h-20"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                  />
                ) : (
                  <Input
                    value={utilityInfo[key] || ""}
                    onChange={e => setUtilityInfo({ ...utilityInfo, [key]: e.target.value })}
                    className="h-8 text-xs mt-1"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                  />
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveUtilityInfo}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8"
              >
                Save Utility Info
              </Button>
              <Button variant="outline" onClick={onClose} className="text-xs h-8">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
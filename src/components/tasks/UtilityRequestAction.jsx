import React, { useState } from "react";
import { Mail, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UtilityDraftModal from "./UtilityDraftModal";

export default function UtilityRequestAction({ task, transaction, currentUser, onTaskUpdated }) {
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  
  const emailTracking = transaction.email_tracking || {};
  const draftCreated = emailTracking.utility_request_draft_created_at;
  const sentAt = emailTracking.utility_request_sent_at;
  const utilityReceived = emailTracking.utility_info_received_at;
  
  // Check prerequisites
  const sellerAgentEmail = transaction.sellers_agent_email;
  const hasAddress = transaction.address;

  // Status badge
  let statusBadge = null;
  if (utilityReceived) {
    statusBadge = <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">✓ Info Received</Badge>;
  } else if (sentAt) {
    statusBadge = <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">✓ Sent</Badge>;
  } else if (draftCreated) {
    statusBadge = <Badge className="bg-blue-100 text-blue-700 text-[10px] gap-1"><Eye className="w-3 h-3" /> Draft Ready</Badge>;
  }

  // Warning if missing contact
  let warningBadge = null;
  if (!sellerAgentEmail || !hasAddress) {
    warningBadge = <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-1"><AlertCircle className="w-3 h-3" /> Missing Info</Badge>;
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {statusBadge && <div>{statusBadge}</div>}
      {warningBadge && <div>{warningBadge}</div>}
      
      {!sentAt && !utilityReceived && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
          onClick={() => setDraftModalOpen(true)}
          disabled={!sellerAgentEmail}
          title={!sellerAgentEmail ? "Seller agent email not found" : "Generate utility request draft"}
        >
          <Mail className="w-3 h-3" />
          {draftCreated ? "View Draft" : "Generate Draft"}
        </Button>
      )}

      {draftModalOpen && (
        <UtilityDraftModal
          open={draftModalOpen}
          onClose={() => setDraftModalOpen(false)}
          transaction={transaction}
          currentUser={currentUser}
          task={task}
          onTaskUpdated={onTaskUpdated}
          isExistingDraft={!!draftCreated}
        />
      )}
    </div>
  );
}
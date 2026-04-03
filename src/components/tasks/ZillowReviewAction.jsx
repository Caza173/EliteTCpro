import React, { useState } from "react";
import { Mail, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReviewEmailModal from "./ReviewEmailModal";

const ZILLOW_REVIEW_LINK = "https://zillow.com/reviews/write/?s=X1-ZU15ev58s7ky03t_4u6i9";

export default function ZillowReviewAction({ task, transaction, currentUser, onTaskUpdated }) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  
  const emailTracking = transaction.email_tracking || {};
  const sentAt = emailTracking.zillow_review_sent_at;
  const sentBy = emailTracking.zillow_review_sent_by;
  const draftedAt = emailTracking.zillow_review_drafted_at;

  // Status badge
  let statusBadge = null;
  if (sentAt) {
    statusBadge = <Badge className="bg-emerald-100 text-emerald-700 text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</Badge>;
  } else if (draftedAt) {
    statusBadge = <Badge className="bg-blue-100 text-blue-700 text-[10px] gap-1"><Clock className="w-3 h-3" /> Draft Ready</Badge>;
  }

  // Check if client emails exist
  const clientEmails = transaction.client_emails?.length ? transaction.client_emails : (transaction.client_email ? [transaction.client_email] : []);
  const canSend = clientEmails.length > 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      {statusBadge && <div>{statusBadge}</div>}
      
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-2 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
        onClick={() => setEmailModalOpen(true)}
        disabled={!canSend}
        title={!canSend ? "No client email on file" : "Send Zillow review request"}
      >
        <Mail className="w-3 h-3" />
        Send Review
      </Button>

      {emailModalOpen && (
        <ReviewEmailModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          transaction={transaction}
          currentUser={currentUser}
          task={task}
          onTaskUpdated={onTaskUpdated}
        />
      )}
    </div>
  );
}
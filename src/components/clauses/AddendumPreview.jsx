import React, { useState } from "react";
import { buildAddendum } from "@/lib/clauseEngine";
import { base44 } from "@/api/base44Client";
import { Download, Mail, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AddendumPreview({ transaction, selectedClauses, inputs, recipientEmail }) {
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  if (selectedClauses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Add clauses to preview the addendum.</p>
      </div>
    );
  }

  const { text, html } = buildAddendum(transaction, selectedClauses, inputs);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Addendum_${(transaction.address || "property").replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEmail = async () => {
    if (!recipientEmail) return;
    setSending(true);
    const subject = `Addendum — ${transaction.address}`;
    await base44.integrations.Core.SendEmail({ to: recipientEmail, subject, body: html });
    // Log to AIActivityLog
    await base44.entities.AIActivityLog.create({
      brokerage_id: transaction.brokerage_id,
      transaction_id: transaction.id,
      transaction_address: transaction.address,
      deadline_type: "addendum_sent",
      deadline_label: "Addendum",
      recipient_email: recipientEmail,
      subject,
      message: `Addendum with ${selectedClauses.length} clause(s) sent to ${recipientEmail}`,
      response_status: "sent",
    });
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Actions */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
          <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy Text"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> Download
        </Button>
        {recipientEmail && (
          <Button size="sm" onClick={handleEmail} disabled={sending} className="gap-1.5"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            <Mail className="w-3.5 h-3.5" /> {sending ? "Sending…" : "Email Addendum"}
          </Button>
        )}
      </div>

      {/* Document */}
      <div className="flex-1 overflow-y-auto rounded-xl border p-5"
        style={{ borderColor: "var(--card-border)", background: "var(--bg-secondary)" }}>
        <pre className="whitespace-pre-wrap text-[12px] leading-relaxed font-mono"
          style={{ color: "var(--text-primary)" }}>
          {text}
        </pre>
      </div>
    </div>
  );
}
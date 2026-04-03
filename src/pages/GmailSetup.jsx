import React from "react";
import { Mail, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GmailSetup() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
          <Mail className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Gmail Integration</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Send transactional emails directly from your Gmail account</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border p-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700">Connected & Active</span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Gmail integration is configured and ready to use. Emails sent through the Atlas platform will be delivered from your connected Gmail account.
        </p>
      </div>

      {/* Features */}
      <div className="rounded-xl border p-6 space-y-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>What You Can Do</h2>
        <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>Send transaction updates and deadline reminders to clients</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>Generate and email custom documents (addendums, disclosures)</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>Automate email notifications for important transaction milestones</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>Send reports and summaries to team members and clients</span>
          </li>
        </ul>
      </div>

      {/* Usage */}
      <div className="rounded-xl border p-6 space-y-4" style={{ background: "var(--bg-tertiary)", borderColor: "var(--card-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>How to Use</h2>
        <ol className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li className="flex gap-3">
            <span className="font-semibold text-blue-600 flex-shrink-0">1.</span>
            <span>Navigate to any transaction and click the "Email" button in the header</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-blue-600 flex-shrink-0">2.</span>
            <span>Compose your message with recipients, subject, and body</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-blue-600 flex-shrink-0">3.</span>
            <span>Optionally attach documents from the transaction</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-blue-600 flex-shrink-0">4.</span>
            <span>Click "Send" to deliver through Gmail</span>
          </li>
        </ol>
      </div>

      {/* Info */}
      <div className="flex gap-3 p-4 rounded-lg border" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}>
        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <div className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
          <p className="font-semibold">Email Tracking</p>
          <p>Sent emails and responses are logged in the transaction activity feed for reference.</p>
        </div>
      </div>

      {/* Back Button */}
      <Link to={createPageUrl("Integrations")}>
        <Button variant="outline" className="w-full">Back to Integrations</Button>
      </Link>
    </div>
  );
}
import React from "react";
import { Calendar, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GoogleCalendarSetup() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Google Calendar Integration</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Sync transaction deadlines to your Google Calendar</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border p-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700">Connected & Active</span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Google Calendar integration is configured. You can now sync transaction deadlines directly to your personal Google Calendar.
        </p>
      </div>

      {/* Features */}
      <div className="rounded-xl border p-6 space-y-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>What You Can Do</h2>
        <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>Sync inspection, appraisal, and closing deadlines to your calendar</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>Receive Google Calendar reminders for approaching deadlines</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>See all transaction deadlines alongside personal events</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>Keep calendar synced as deadlines change or extend</span>
          </li>
        </ul>
      </div>

      {/* Usage */}
      <div className="rounded-xl border p-6 space-y-4" style={{ background: "var(--bg-tertiary)", borderColor: "var(--card-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>How to Use</h2>
        <ol className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li className="flex gap-3">
            <span className="font-semibold text-blue-600 flex-shrink-0">1.</span>
            <span>Open a transaction and navigate to the "Deadlines" tab</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-blue-600 flex-shrink-0">2.</span>
            <span>Find the deadline you want to sync (inspection, closing, etc.)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-blue-600 flex-shrink-0">3.</span>
            <span>Click the calendar icon next to the deadline date</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-blue-600 flex-shrink-0">4.</span>
            <span>Confirm to add it to your Google Calendar</span>
          </li>
        </ol>
      </div>

      {/* Info */}
      <div className="flex gap-3 p-4 rounded-lg border" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}>
        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <div className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
          <p className="font-semibold">Calendar Updates</p>
          <p>If a deadline is extended or moved, you can re-sync to update the calendar event.</p>
        </div>
      </div>

      {/* Back Button */}
      <Link to={createPageUrl("Integrations")}>
        <Button variant="outline" className="w-full">Back to Integrations</Button>
      </Link>
    </div>
  );
}
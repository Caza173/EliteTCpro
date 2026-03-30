import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Bug, Lightbulb, Puzzle, CheckCircle, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BugReportForm from "./BugReportForm";
import FeatureRequestForm from "./FeatureRequestForm";
import IntegrationRequestForm from "./IntegrationRequestForm";

const TABS = [
  { id: "bug", label: "Report a Bug", icon: Bug, color: "text-red-500", bg: "bg-red-50 border-red-200" },
  { id: "feature", label: "Suggest a Feature", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
  { id: "integration", label: "Request Integration", icon: Puzzle, color: "text-purple-500", bg: "bg-purple-50 border-purple-200" },
];

export default function FeedbackModal({ open, onClose, defaultType = "bug", context = {} }) {
  const [activeType, setActiveType] = useState(defaultType);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const payload = {
        ...formData,
        type: activeType,
        user_name: user?.full_name || "",
        user_email: user?.email || "",
        transaction_id: context.transaction_id || "",
        transaction_address: context.transaction_address || "",
        document_id: context.document_id || "",
        deadline_id: context.deadline_id || "",
        page_url: window.location.href,
        route_name: context.route_name || window.location.hash || "",
        browser_info: navigator.userAgent,
        status: "new",
      };

      const created = await base44.entities.FeedbackItem.create(payload);

      // Fire-and-forget AI triage
      base44.functions.invoke("triageFeedback", { feedback_item_id: created.id }).catch(() => {});

      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const activeTab = TABS.find(t => t.id === activeType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--card-border)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Feedback Center</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Help us improve EliteTC</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              {activeType === "bug" ? "Bug report received." : activeType === "feature" ? "Feature request submitted." : "Integration request logged."}
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              We'll review it shortly. You can track the status in Settings → Feedback & Requests.
            </p>
            <Button onClick={handleClose} size="sm" className="bg-blue-600 hover:bg-blue-700">Done</Button>
          </div>
        ) : (
          <>
            {/* Type tabs */}
            <div className="flex border-b flex-shrink-0" style={{ borderColor: "var(--card-border)" }}>
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveType(tab.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all border-b-2 ${
                      isActive ? "border-blue-500" : "border-transparent"
                    }`}
                    style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    <Icon className={`w-4 h-4 ${tab.color}`} />
                    <span className="hidden sm:block">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form area */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeType === "bug" && (
                <BugReportForm
                  context={context}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}
              {activeType === "feature" && (
                <FeatureRequestForm
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}
              {activeType === "integration" && (
                <IntegrationRequestForm
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
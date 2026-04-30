import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Calendar, Shield, ClipboardList, Mail, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const HIGHLIGHTS = [
  {
    icon: Calendar,
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    title: "Deadline Tracking",
    desc: "All critical deadlines automatically tracked — inspection, appraisal, financing, closing.",
  },
  {
    icon: Shield,
    color: "text-purple-400",
    bg: "bg-purple-500/20",
    title: "Compliance Alerts",
    desc: "Instant alerts when documents are missing or signatures are needed.",
  },
  {
    icon: ClipboardList,
    color: "text-green-400",
    bg: "bg-green-500/20",
    title: "Task Checklists",
    desc: "Phase-by-phase task lists auto-generated from your transaction type.",
  },
  {
    icon: Mail,
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    title: "Email Automation",
    desc: "Automated deadline alerts emailed to agents, clients, and parties.",
  },
  {
    icon: Zap,
    color: "text-cyan-400",
    bg: "bg-cyan-500/20",
    title: "AI-Powered Parsing",
    desc: "Upload a contract and EliteTC extracts deadlines, parties, and key dates instantly.",
  },
];

export default function Step5Value({ parsedData, onComplete }) {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleFinish = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      onboarding_complete: true,
      onboarding_step: 5,
    });
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    setSaving(false);
    onComplete();
  };

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">You're all set! 🎉</h2>
        <p className="text-slate-300 text-sm max-w-sm mx-auto">
          Here's what EliteTC will do for you on every transaction.
        </p>
      </div>

      {/* Highlights */}
      <div className="space-y-3">
        {HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex items-start gap-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4"
            >
              <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Parsed data preview */}
      {parsedData && (parsedData.closing_date || parsedData.inspection_deadline || parsedData.address) && (
        <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-4">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
            From your uploaded document
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {parsedData.address && (
              <div>
                <p className="text-slate-500 text-xs">Property</p>
                <p className="text-white font-medium truncate">{parsedData.address}</p>
              </div>
            )}
            {parsedData.closing_date && (
              <div>
                <p className="text-slate-500 text-xs">Closing</p>
                <p className="text-blue-300 font-medium">{parsedData.closing_date}</p>
              </div>
            )}
            {parsedData.inspection_deadline && (
              <div>
                <p className="text-slate-500 text-xs">Inspection</p>
                <p className="text-amber-300 font-medium">{parsedData.inspection_deadline}</p>
              </div>
            )}
            {parsedData.financing_deadline && (
              <div>
                <p className="text-slate-500 text-xs">Financing</p>
                <p className="text-green-300 font-medium">{parsedData.financing_deadline}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        onClick={handleFinish}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-base"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Go to Dashboard →
      </Button>
    </div>
  );
}
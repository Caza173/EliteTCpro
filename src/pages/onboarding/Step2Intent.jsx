import React, { useState } from "react";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Compass } from "lucide-react";

const OPTIONS = [
  {
    id: "start_transaction",
    icon: FileText,
    title: "Start a Transaction",
    description: "I have an active deal and want to set it up right now.",
    color: "blue",
  },
  {
    id: "explore_demo",
    icon: Compass,
    title: "Explore the Platform",
    description: "I want to see what EliteTC can do before diving in.",
    color: "purple",
  },
];

export default function Step2Intent({ onComplete }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    await authApi.updateMe({
      onboarding_intent: selected,
      onboarding_step: selected === "explore_demo" ? 5 : 3,
    });
    setSaving(false);
    onComplete(selected);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 shadow-xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">What would you like to do first?</h2>
        <p className="text-slate-400 text-sm">Pick one — you can always change course later.</p>
      </div>

      <div className="space-y-3 mb-6">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-600 bg-slate-900/50 hover:border-slate-500"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "bg-blue-500/20" : "bg-slate-700"
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? "text-blue-400" : "text-slate-400"}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${isSelected ? "text-blue-300" : "text-white"}`}>
                    {opt.title}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">{opt.description}</p>
                </div>
                {isSelected && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        onClick={handleContinue}
        disabled={!selected || saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Continue →
      </Button>
    </div>
  );
}
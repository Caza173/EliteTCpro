import React from "react";
import { Building2 } from "lucide-react";

const STEPS = [
  { num: 1, label: "Profile" },
  { num: 2, label: "Intent" },
  { num: 3, label: "Transaction" },
  { num: 4, label: "Document" },
  { num: 5, label: "Review" },
];

export default function OnboardingShell({ currentStep, children }) {
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0F172A" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">EliteTC</span>
        </div>
        <span className="text-slate-400 text-xs">Step {currentStep} of {STEPS.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-700">
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-between px-6 pt-3 pb-1 max-w-2xl mx-auto w-full">
        {STEPS.map((step) => (
          <div key={step.num} className="flex flex-col items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step.num < currentStep
                  ? "bg-blue-500 text-white"
                  : step.num === currentStep
                  ? "bg-blue-500 text-white ring-4 ring-blue-500/30"
                  : "bg-slate-700 text-slate-500"
              }`}
            >
              {step.num < currentStep ? "✓" : step.num}
            </div>
            <span
              className={`text-[10px] font-medium hidden sm:block ${
                step.num === currentStep ? "text-blue-400" : "text-slate-500"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </div>
  );
}
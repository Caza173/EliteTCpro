import React from "react";
import { CheckCircle2 } from "lucide-react";

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
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: "#050506",
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)
        `,
        backgroundSize: "64px 64px",
        color: "#f5f1e8",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(210,163,95,0.04) 0%, transparent 70%)",
      }} />

      {/* Top bar */}
      <div
        className="relative z-10 flex items-center justify-between px-6 py-4"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backgroundColor: "rgba(5,5,6,0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{
              background: "rgba(210,163,95,0.12)",
              border: "1px solid rgba(210,163,95,0.3)",
              color: "#d2a35f",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            E
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#f5f1e8", fontFamily: "'Playfair Display', serif", letterSpacing: "0.06em" }}>
              ELITETC
            </div>
            <div style={{ fontSize: 8, letterSpacing: "0.14em", color: "#6f7683", textTransform: "uppercase" }}>
              Transaction Coordination
            </div>
          </div>
        </div>

        <span style={{ fontSize: 11, color: "#6f7683", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
          Step {currentStep} of {STEPS.length}
        </span>
      </div>

      {/* Gold progress bar */}
      <div className="relative z-10" style={{ height: 2, backgroundColor: "rgba(255,255,255,0.06)" }}>
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg, #c99655, #d2a35f, #e0b874)",
            transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: "0 0 10px rgba(210,163,95,0.4)",
          }}
        />
      </div>

      {/* Step stepper */}
      <div className="relative z-10 flex justify-between items-start px-6 pt-6 pb-2 mx-auto w-full" style={{ maxWidth: 560 }}>
        {STEPS.map((step, idx) => {
          const isCompleted = step.num < currentStep;
          const isActive = step.num === currentStep;
          const isInactive = step.num > currentStep;

          return (
            <div key={step.num} className="flex flex-col items-center gap-2" style={{ flex: 1, position: "relative" }}>
              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div style={{
                  position: "absolute",
                  top: 14,
                  left: "50%",
                  width: "100%",
                  height: 1,
                  background: isCompleted
                    ? "linear-gradient(90deg, rgba(210,163,95,0.6), rgba(210,163,95,0.2))"
                    : "rgba(255,255,255,0.07)",
                  zIndex: 0,
                  transition: "background 0.4s ease",
                }} />
              )}

              {/* Circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 1,
                  flexShrink: 0,
                  transition: "all 0.3s ease",
                  ...(isCompleted ? {
                    background: "#d2a35f",
                    border: "1px solid #d2a35f",
                    boxShadow: "0 0 10px rgba(210,163,95,0.3)",
                  } : isActive ? {
                    background: "rgba(210,163,95,0.08)",
                    border: "1.5px solid #d2a35f",
                    boxShadow: "0 0 16px rgba(210,163,95,0.18)",
                  } : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }),
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 style={{ width: 13, height: 13, color: "#050506" }} />
                ) : (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "Inter, sans-serif",
                    color: isActive ? "#d2a35f" : "#6f7683",
                    lineHeight: 1,
                  }}>
                    {step.num}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className="hidden sm:block"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: "Inter, sans-serif",
                  color: isActive ? "#d2a35f" : isCompleted ? "rgba(210,163,95,0.5)" : "#6f7683",
                  transition: "color 0.3s ease",
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full" style={{ maxWidth: 560 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
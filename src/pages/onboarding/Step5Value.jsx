import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, Calendar, Shield, ClipboardList, Mail, Zap, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const C = {
  bg:         "#050506",
  panel:      "#0d0e11",
  border:     "rgba(255,255,255,0.08)",
  borderGold: "rgba(210,163,95,0.22)",
  text:       "#f5f1e8",
  textSoft:   "#a6adbb",
  textMuted:  "#6f7683",
  gold:       "#d2a35f",
};

const HIGHLIGHTS = [
  {
    icon: Calendar,
    title: "Deadline Tracking",
    desc: "All critical deadlines automatically tracked — inspection, appraisal, financing, and closing.",
  },
  {
    icon: Shield,
    title: "Compliance Alerts",
    desc: "Instant alerts when documents are missing or signatures are needed.",
  },
  {
    icon: ClipboardList,
    title: "Task Checklists",
    desc: "Phase-by-phase task lists auto-generated from your transaction type.",
  },
  {
    icon: Mail,
    title: "Email Automation",
    desc: "Automated deadline alerts emailed to agents, clients, and all parties.",
  },
  {
    icon: Zap,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Hero card */}
      <div style={{
        background: "rgba(13,14,17,0.9)",
        border: `1px solid ${C.borderGold}`,
        borderRadius: 14,
        padding: "40px 32px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient glow behind icon */}
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
          width: 160, height: 160,
          background: "radial-gradient(circle, rgba(210,163,95,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "rgba(210,163,95,0.1)",
          border: `1px solid ${C.borderGold}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "0 0 20px rgba(210,163,95,0.12)",
          position: "relative",
        }}>
          <CheckCircle2 style={{ width: 26, height: 26, color: C.gold }} />
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 32,
          fontWeight: 800,
          color: C.text,
          margin: "0 0 10px",
          lineHeight: 1.1,
        }}>
          You're <span style={{ color: C.gold, fontStyle: "italic" }}>Ready.</span>
        </h2>
        <p style={{ fontSize: 14, color: C.textSoft, maxWidth: 360, margin: "0 auto", lineHeight: 1.75, fontFamily: "Inter, sans-serif" }}>
          Your EliteTC workspace is configured. Here's what the platform will handle on every transaction.
        </p>
      </div>

      {/* Highlights */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "16px 18px",
                transition: "border-color 0.2s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.borderGold}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "rgba(210,163,95,0.08)",
                border: `1px solid rgba(210,163,95,0.2)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.gold, flexShrink: 0,
              }}>
                <Icon style={{ width: 15, height: 15 }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "0 0 4px", fontFamily: "Inter, sans-serif" }}>
                  {item.title}
                </p>
                <p style={{ fontSize: 12, color: C.textSoft, margin: 0, lineHeight: 1.65, fontFamily: "Inter, sans-serif" }}>
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Parsed data preview */}
      {parsedData && (parsedData.closing_date || parsedData.inspection_deadline || parsedData.address) && (
        <div style={{
          background: C.panel,
          border: `1px solid ${C.borderGold}`,
          borderRadius: 10,
          padding: "18px 20px",
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, marginBottom: 14, fontFamily: "Inter, sans-serif" }}>
            From Your Uploaded Document
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {parsedData.address && (
              <div>
                <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 3, fontFamily: "Inter, sans-serif" }}>Property</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, fontFamily: "Inter, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parsedData.address}</p>
              </div>
            )}
            {parsedData.closing_date && (
              <div>
                <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 3, fontFamily: "Inter, sans-serif" }}>Closing</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.gold, margin: 0, fontFamily: "Inter, sans-serif" }}>{parsedData.closing_date}</p>
              </div>
            )}
            {parsedData.inspection_deadline && (
              <div>
                <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 3, fontFamily: "Inter, sans-serif" }}>Inspection</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.gold, margin: 0, fontFamily: "Inter, sans-serif" }}>{parsedData.inspection_deadline}</p>
              </div>
            )}
            {parsedData.financing_deadline && (
              <div>
                <p style={{ fontSize: 10, color: C.textMuted, marginBottom: 3, fontFamily: "Inter, sans-serif" }}>Financing</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.gold, margin: 0, fontFamily: "Inter, sans-serif" }}>{parsedData.financing_deadline}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleFinish}
        disabled={saving}
        style={{
          width: "100%",
          padding: "16px 28px",
          background: saving ? "rgba(210,163,95,0.5)" : "#d2a35f",
          color: "#050506",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: saving ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: "Inter, sans-serif",
          letterSpacing: "0.02em",
          transition: "background 0.18s ease",
          marginTop: 4,
        }}
        onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#e0b874"; }}
        onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#d2a35f"; }}
      >
        {saving
          ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Saving...</>
          : <>Enter Dashboard <ArrowRight style={{ width: 15, height: 15 }} /></>
        }
      </button>

    </div>
  );
}
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function DeadlineResponse() {
  const [status, setStatus] = useState("loading"); // loading | success_yes | success_no | already_responded | error
  const [message, setMessage] = useState("");
  const [action, setAction] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const act = urlParams.get("action");
    const token = urlParams.get("token");
    setAction(act);

    if (!act || !token) {
      setStatus("error");
      setMessage("This link is missing required parameters. Please contact your TC.");
      return;
    }

    base44.functions.invoke("deadlineResponse", { action: act, token })
      .then((res) => {
        const data = res.data;
        if (data.code === "INVALID_TOKEN") {
          setStatus("error");
          setMessage("This link has expired or is invalid. Please contact your TC directly.");
        } else if (data.code === "ALREADY_RESPONDED") {
          setStatus("already_responded");
          setMessage(data.message || "This response has already been recorded.");
        } else if (data.success) {
          setStatus(act === "yes" ? "success_yes" : "success_no");
          setMessage(data.message || "Response recorded.");
        } else {
          setStatus("error");
          setMessage(data.error || "An unexpected error occurred.");
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err?.message || "Failed to process your response. Please contact your TC.");
      });
  }, []);

  const configs = {
    loading: {
      icon: "⏳",
      iconBg: "#f1f5f9",
      title: "Processing your response…",
      body: "Please wait while we record your answer.",
    },
    success_yes: {
      icon: "📋",
      iconBg: "#fef2f2",
      title: "Extension Request Submitted",
      body: message,
    },
    success_no: {
      icon: "✓",
      iconBg: "#f0fdf4",
      title: "Confirmed — No Extension Needed",
      body: message,
    },
    already_responded: {
      icon: "ℹ",
      iconBg: "#eff6ff",
      title: "Already Responded",
      body: message,
    },
    error: {
      icon: "✗",
      iconBg: "#fef2f2",
      title: "Link Expired or Invalid",
      body: message,
    },
  };

  const cfg = configs[status] || configs.loading;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        padding: "48px 40px",
        maxWidth: "480px",
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: cfg.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "26px",
        }}>
          {status === "loading" ? (
            <span style={{
              display: "inline-block",
              width: "24px",
              height: "24px",
              border: "3px solid #e2e8f0",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }} />
          ) : cfg.icon}
        </div>

        <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: "0 0 12px" }}>
          {cfg.title}
        </h1>

        <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.6", margin: "0 0 24px" }}>
          {cfg.body}
        </p>

        {(status === "success_yes" || status === "success_no") && (
          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "13px",
            color: "#64748b",
          }}>
            {status === "success_yes"
              ? "Your TC will prepare an extension addendum and be in touch shortly."
              : "Great! We'll continue to monitor your transaction and send reminders as needed."}
          </div>
        )}

        <p style={{ marginTop: "32px", fontSize: "12px", color: "#94a3b8" }}>
          EliteTC — Transaction Coordinator Platform
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
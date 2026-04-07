import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Pen } from "lucide-react";
import { base44 } from "@/api/base44Client";

const NAVY = "#0D1B2A";
const GOLD = "#C9A84C";
const GOLD_DIM = "rgba(201,168,76,0.15)";
const GOLD_BORDER = "rgba(201,168,76,0.3)";
const WHITE_BORDER = "rgba(255,255,255,0.12)";
const WHITE_DIM = "rgba(255,255,255,0.07)";

export default function TCSignIn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null); // null | "google" | "apple" | "email"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleOAuth = async (provider) => {
    setLoading(provider);
    await base44.auth.redirectToLogin("/Dashboard");
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading("email");
    await base44.auth.redirectToLogin("/Dashboard");
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${WHITE_BORDER}`,
    background: WHITE_DIM,
    color: "#fff",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #0A1628 60%, #0D1F35 100%)` }}
    >
      {/* Header */}
      <nav
        className="px-6 py-3 border-b flex items-center"
        style={{ borderColor: GOLD_BORDER, background: "rgba(13,27,42,0.92)", backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 transition-colors"
          style={{ color: "rgba(255,255,255,0.55)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mx-auto">
          <div
            className="relative flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: 28, height: 28, border: `2px solid ${GOLD}` }}
          >
            <FileText style={{ color: GOLD, width: 15, height: 15 }} />
            <div className="absolute" style={{ bottom: -3, right: -3, background: NAVY, borderRadius: "50%", padding: 1 }}>
              <Pen style={{ color: GOLD, width: 9, height: 9 }} />
            </div>
          </div>
          <span className="font-serif font-bold text-lg tracking-tight">
            <span style={{ color: "#fff" }}>Elite</span>
            <span style={{ color: GOLD }}>TC</span>
          </span>
        </div>

        <div style={{ width: 60 }} /> {/* spacer to balance back button */}
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div
            className="rounded-2xl p-8 border"
            style={{ borderColor: GOLD_BORDER, background: "rgba(17,34,54,0.7)" }}
          >
            <h2 className="text-2xl font-bold text-white mb-1 font-serif">Sign In</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              Access your EliteTC dashboard
            </p>

            {/* Email / Password form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: GOLD }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = GOLD)}
                  onBlur={e => (e.target.style.borderColor = WHITE_BORDER)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: GOLD }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = GOLD)}
                  onBlur={e => (e.target.style.borderColor = WHITE_BORDER)}
                />
              </div>

              <button
                type="submit"
                disabled={!!loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: GOLD, color: NAVY }}
              >
                {loading === "email" ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background: WHITE_BORDER }} />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>or continue with</span>
              <div className="flex-1 h-px" style={{ background: WHITE_BORDER }} />
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              {/* Google */}
              <button
                onClick={() => handleOAuth("google")}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: WHITE_DIM, border: `1px solid ${WHITE_BORDER}`, color: "#fff" }}
              >
                {/* Google icon */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                {loading === "google" ? "Redirecting…" : "Continue with Google"}
              </button>

              {/* Apple */}
              <button
                onClick={() => handleOAuth("apple")}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: WHITE_DIM, border: `1px solid ${WHITE_BORDER}`, color: "#fff" }}
              >
                {/* Apple icon */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
                  <path d="M14.236 9.558c-.022-2.293 1.874-3.396 1.96-3.452-1.07-1.565-2.73-1.78-3.322-1.804-1.411-.143-2.76.833-3.474.833-.716 0-1.822-.814-2.994-.793-1.535.023-2.952.895-3.742 2.27C1.076 9.15 2.16 13.4 3.72 15.71c.777 1.13 1.7 2.397 2.913 2.352 1.17-.047 1.613-.758 3.03-.758 1.415 0 1.813.758 3.054.735 1.258-.02 2.05-1.147 2.822-2.28a10.7 10.7 0 0 0 1.284-2.642c-.03-.013-2.56-.983-2.587-3.559ZM11.977 2.943c.63-.776 1.057-1.845.94-2.916-.909.038-2.038.614-2.696 1.374-.58.668-1.1 1.758-.965 2.8 1.022.078 2.073-.526 2.721-1.258Z"/>
                </svg>
                {loading === "apple" ? "Redirecting…" : "Continue with Apple"}
              </button>
            </div>

            {/* Footer */}
            <p className="text-xs text-center mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
              Don't have an account? Contact your brokerage administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { X, Send, Loader2, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ContactModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", brokerage: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.functions.invoke("portalSupport", { action: "contact", ...form });
      setSuccess(true);
    } catch (err) {
      setError("Failed to send your message. Please try again.");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#e2e8f0",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 relative"
        style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">Message Sent!</h3>
            <p className="text-slate-400 text-sm">Our TC team will get back to you shortly.</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ backgroundColor: "#c9a227", color: "#0f172a" }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-white font-bold text-xl mb-1">Contact Us</h2>
            <p className="text-slate-400 text-sm mb-6">Send a message to the EliteTC team.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Email *</label>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Brokerage</label>
                <input
                  style={inputStyle}
                  placeholder="Your brokerage (optional)"
                  value={form.brokerage}
                  onChange={e => setForm({ ...form, brokerage: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subject *</label>
                <input
                  style={inputStyle}
                  placeholder="What's this about?"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Message *</label>
                <textarea
                  style={{ ...inputStyle, height: "100px", resize: "vertical" }}
                  placeholder="How can we help?"
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-60"
                style={{ backgroundColor: "#c9a227", color: "#0f172a" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "Sending…" : "Send Message"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
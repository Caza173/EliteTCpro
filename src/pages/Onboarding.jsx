import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/CurrentUserContext.jsx";

import { Button } from "@/components/ui/button";
import { Loader2, Camera, CheckCircle2, Building2, ImagePlus, X } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshUser, updateCurrentUser } = useCurrentUser();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);
  const sigInputRef = useRef(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    company: "",
    team_name: "",
    email_signature: "",
    profile_photo_url: "",
    signature_block_url: "",
  });

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!u) return;
      // Note: do NOT redirect if already completed here — Layout handles that.
      // Only populate the form for the user.
      setUser(u);
      setForm((f) => ({
        ...f,
        full_name: u.full_name || u.profile?.full_name || "",
        phone: u.profile?.phone || u.phone || "",
        company: u.profile?.company || u.company || "",
        team_name: u.profile?.team_name || u.team_name || "",
        email_signature: u.profile?.email_signature || u.email_signature || "",
        profile_photo_url: u.profile?.profile_photo_url || u.profile_photo_url || "",
        signature_block_url: u.profile?.signature_block_url || u.signature_block_url || "",
      }));
    });
  }, []);

  // Autosave on field change (debounced)
  const autosaveTimer = useRef(null);
  const handleChange = (field, value) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => autosave(updated), 1500);
      return updated;
    });
    setSaved(false);
  };

  const autosave = async (data) => {
    try {
      await base44.auth.updateMe({ profile: { ...data } });
      setSaved(true);
    } catch (_) {}
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange("profile_photo_url", file_url);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSigUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange("signature_block_url", file_url);
    } finally {
      setUploadingSig(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.email_signature.trim()) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({
        profile: { ...form },
        profile_completed: true,
        role: "tc",
        onboarding_completed_at: new Date().toISOString(),
      });
      // Optimistically update context so AuthGate sees profile_completed=true immediately
      updateCurrentUser({ profile_completed: true, role: "tc" });
      navigate("/Dashboard", { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const isValid = form.full_name.trim() && form.phone.trim() && form.email_signature.trim();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-8 space-y-6"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--sidebar-accent)", opacity: 0.9 }}
          >
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Welcome to EliteTC
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Complete your profile to get started
            </p>
          </div>
        </div>

        {/* Profile Photo */}
        <div className="flex items-center gap-4">
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0"
            style={{ backgroundColor: "var(--bg-tertiary)", border: "2px solid var(--card-border)" }}
            onClick={() => fileInputRef.current?.click()}
          >
            {form.profile_photo_url ? (
              <img src={form.profile_photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium"
              style={{ color: "var(--accent)" }}
            >
              {form.profile_photo_url ? "Change photo" : "Upload photo"}
            </button>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Optional — JPG or PNG
            </p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <Field label="Full Name" required>
            <input
              value={form.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              placeholder="Your full name"
              className="theme-input w-full"
            />
          </Field>

          <Field label="Email" required>
            <input
              value={user?.email || ""}
              disabled
              className="theme-input w-full opacity-50 cursor-not-allowed"
            />
          </Field>

          <Field label="Phone" required>
            <input
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(555) 000-0000"
              className="theme-input w-full"
              type="tel"
            />
          </Field>

          <Field label="Company / Brokerage">
            <input
              value={form.company}
              onChange={(e) => handleChange("company", e.target.value)}
              placeholder="Optional"
              className="theme-input w-full"
            />
          </Field>

          <Field label="Team Name">
            <input
              value={form.team_name}
              onChange={(e) => handleChange("team_name", e.target.value)}
              placeholder="Optional"
              className="theme-input w-full"
            />
          </Field>

          <Field label="Email Signature" required>
            <textarea
              value={form.email_signature}
              onChange={(e) => handleChange("email_signature", e.target.value)}
              placeholder={"Best regards,\nYour Name\nYour Company"}
              rows={4}
              className="theme-input w-full resize-none"
            />
          </Field>

          <Field label="Signature Block Image">
            <div className="space-y-2">
              {form.signature_block_url ? (
                <div className="relative inline-block">
                  <img
                    src={form.signature_block_url}
                    alt="Signature block"
                    className="max-h-24 rounded-lg border object-contain"
                    style={{ borderColor: "var(--card-border)" }}
                  />
                  <button
                    onClick={() => handleChange("signature_block_url", "")}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => sigInputRef.current?.click()}
                disabled={uploadingSig}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm transition-colors hover:bg-opacity-80"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-tertiary)" }}
              >
                {uploadingSig
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ImagePlus className="w-4 h-4" />}
                {uploadingSig ? "Uploading…" : form.signature_block_url ? "Replace image" : "Upload signature image"}
              </button>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Optional — PNG or JPG. Used in email footers and documents.
              </p>
              <input ref={sigInputRef} type="file" accept="image/*" className="hidden" onChange={handleSigUpload} />
            </div>
          </Field>
        </div>

        {/* Autosave indicator */}
        {saved && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--success)" }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Progress saved
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full h-11 text-sm font-semibold"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)" }}
          onClick={handleSubmit}
          disabled={!isValid || saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {saving ? "Saving…" : "Complete Profile"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
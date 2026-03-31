import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, User, Camera, ChevronRight, ChevronLeft, CheckCircle, Loader2, Upload } from "lucide-react";

const STEPS = [
  { id: 1, title: "Basic Info", desc: "Tell us about yourself" },
  { id: 2, title: "Profile Photo", desc: "Add a photo to your profile" },
  { id: 3, title: "Email Signature", desc: "Optional — customize your signature" },
];

function ProgressBar({ step }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500">Step {step} of {STEPS.length}</span>
        <span className="text-xs text-slate-400">This takes less than 2 minutes</span>
      </div>
      <div className="flex gap-1.5">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{ background: s.id <= step ? "#2563eb" : "#e2e8f0" }}
          />
        ))}
      </div>
      <div className="mt-3">
        <p className="text-lg font-bold text-slate-900">{STEPS[step - 1].title}</p>
        <p className="text-sm text-slate-500">{STEPS[step - 1].desc}</p>
      </div>
    </div>
  );
}

function AvatarUpload({ photoUrl, onUpload, uploading }) {
  const inputRef = useRef();

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="w-28 h-28 rounded-full border-4 border-white shadow-lg flex items-center justify-center overflow-hidden cursor-pointer relative group"
        style={{ background: photoUrl ? "transparent" : "#f1f5f9" }}
        onClick={() => inputRef.current?.click()}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <User className="w-12 h-12 text-slate-300" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onUpload(e.target.files[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="w-3.5 h-3.5" />
        {uploading ? "Uploading..." : photoUrl ? "Change Photo" : "Upload Photo"}
      </Button>
      {photoUrl && (
        <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
          <CheckCircle className="w-4 h-4" /> Photo uploaded
        </div>
      )}
    </div>
  );
}

export default function SetupProfile() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    company_name: "",
    profile_photo_url: "",
    sig_role: "",
  });

  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validatePhone = (phone) => /^[\d\s\(\)\-\+]{10,15}$/.test(phone.replace(/\s/g, ""));
  const validateStep1 = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Required";
    if (!form.last_name.trim()) e.last_name = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    else if (!validatePhone(form.phone)) e.phone = "Invalid phone number";
    if (!form.company_name.trim()) e.company_name = "Required";
    return e;
  };

  const step1Complete = form.first_name && form.last_name && form.phone && validatePhone(form.phone) && form.company_name;
  const step2Complete = !!form.profile_photo_url;
  const allComplete = step1Complete && step2Complete;

  const handleNext = () => {
    if (step === 1) {
      const e = validateStep1();
      if (Object.keys(e).length) { setErrors(e); return; }
    }
    setStep((s) => s + 1);
  };

  const handleUploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("profile_photo_url", file_url);
    setUploading(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      company_name: form.company_name.trim(),
      profile_photo_url: form.profile_photo_url,
      sig_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
      sig_role: form.sig_role.trim() || "",
      sig_company: form.company_name.trim(),
      sig_phone: form.phone.trim(),
      profile_completed: true,
    });
    setSaving(false);
    navigate("/Dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-900 tracking-tight">EliteTC</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <ProgressBar step={step} />

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">First Name *</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  placeholder="Jane"
                  className={errors.first_name ? "border-red-400" : ""}
                />
                {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Last Name *</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  placeholder="Smith"
                  className={errors.last_name ? "border-red-400" : ""}
                />
                {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Phone *</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(603) 555-1234"
                className={errors.phone ? "border-red-400" : ""}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Company / Brokerage *</Label>
              <Input
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                placeholder="Realty One Group"
                className={errors.company_name ? "border-red-400" : ""}
              />
              {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name}</p>}
            </div>
          </div>
        )}

        {/* Step 2: Photo */}
        {step === 2 && (
          <div className="flex flex-col items-center py-4">
            <AvatarUpload
              photoUrl={form.profile_photo_url}
              onUpload={handleUploadPhoto}
              uploading={uploading}
            />
            <p className="text-xs text-slate-400 mt-6 text-center max-w-xs">
              Your photo appears in emails and reports. Use a professional headshot for best results.
            </p>
          </div>
        )}

        {/* Step 3: Signature (optional) */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              This step is optional — you can always update it in Settings later.
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Role / Title</Label>
              <Input
                value={form.sig_role}
                onChange={(e) => set("sig_role", e.target.value)}
                placeholder="e.g. Transaction Coordinator"
              />
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Signature Preview</p>
              <div className="flex items-center gap-3">
                {form.profile_photo_url && (
                  <img src={form.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                )}
                <div className="text-sm text-slate-700 leading-relaxed">
                  <p className="font-semibold text-slate-900">{form.first_name} {form.last_name}</p>
                  {form.sig_role && <p>{form.sig_role}</p>}
                  <p>{form.company_name}</p>
                  <p>{form.phone}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={step === 1 && !step1Complete}
              className="gap-2 bg-slate-900 hover:bg-slate-800"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!allComplete || saving}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {saving ? "Saving..." : "Complete Setup"}
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        You can update all of this later in Settings → Profile.
      </p>
    </div>
  );
}
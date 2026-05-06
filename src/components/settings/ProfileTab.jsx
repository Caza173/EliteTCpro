import React, { useState, useEffect, useRef } from "react";
import { authApi } from "@/api/auth";
import { uploadsApi } from "@/api/uploads";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser as useCurrentUserCtx } from "@/lib/CurrentUserContext.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Loader2, Camera, Building2, User, Mail, Globe, Phone, MapPin, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

function AvatarUpload({ currentUrl, onUploaded, label, icon: Icon, round }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const upload = await uploadsApi.uploadImage(file, { namespace: round ? "profiles/photos" : "profiles/company-logos" });
      onUploaded(upload.signed_url);
    } catch {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative group overflow-hidden border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors flex items-center justify-center bg-gray-50 ${round ? "w-20 h-20 rounded-full" : "w-24 h-20 rounded-xl"}`}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={label} className={`w-full h-full object-cover ${round ? "rounded-full" : "rounded-xl"}`} />
        ) : (
          <Icon className="w-6 h-6 text-gray-300" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </button>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function SystemSignaturePreview({ form }) {
  return (
    <div className="p-4 rounded-lg border bg-gray-50 text-sm text-gray-700 leading-relaxed">
      <p className="text-[10px] text-gray-400 mb-2 font-semibold uppercase tracking-wide">Signature Preview</p>
      <div className="flex items-start gap-3">
        {form.profile_photo_url && (
          <img src={form.profile_photo_url} alt="Profile" className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{form.sig_name || form.first_name + " " + form.last_name || "Your Name"}</p>
          <p className="text-gray-600">{form.sig_role || form.role || "Transaction Coordinator"}</p>
          <p className="text-gray-600">{form.company_name || form.sig_company || ""}</p>
          {form.phone && <p className="text-gray-500 text-xs mt-0.5">📞 {form.phone}</p>}
          {form.website && <p className="text-blue-500 text-xs">{form.website}</p>}
        </div>
        {form.company_logo_url && (
          <img src={form.company_logo_url} alt="Logo" className="w-16 h-10 object-contain flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

export default function ProfileTab({ currentUser }) {
  const queryClient = useQueryClient();
  const { refreshUser } = useCurrentUserCtx();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    company_name: "",
    website: "",
    alternate_email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    profile_photo_url: "",
    company_logo_url: "",
    sig_name: "",
    sig_role: "",
    sig_company: "",
    sig_phone: "",
    signature_type: "system",
    custom_signature_html: "",
  });

  useEffect(() => {
    if (!currentUser) return;
    setForm({
      first_name: currentUser.first_name || currentUser.full_name?.split(" ")[0] || "",
      last_name: currentUser.last_name || currentUser.full_name?.split(" ").slice(1).join(" ") || "",
      phone: currentUser.phone || "",
      company_name: currentUser.company_name || "",
      website: currentUser.website || "",
      alternate_email: currentUser.alternate_email || "",
      address_line1: currentUser.address_line1 || "",
      address_line2: currentUser.address_line2 || "",
      city: currentUser.city || "",
      state: currentUser.state || "",
      zip: currentUser.zip || "",
      profile_photo_url: currentUser.profile_photo_url || "",
      company_logo_url: currentUser.company_logo_url || "",
      sig_name: currentUser.sig_name || currentUser.full_name || "",
      sig_role: currentUser.sig_role || "",
      sig_company: currentUser.sig_company || currentUser.company_name || "",
      sig_phone: currentUser.sig_phone || currentUser.phone || "",
      signature_type: currentUser.signature_type || "system",
      custom_signature_html: currentUser.custom_signature_html || "",
    });
  }, [currentUser]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: (data) => authApi.updateMe(data),
    onSuccess: () => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleSave = () => mutation.mutate(form);

  const useSystem = form.signature_type === "system";

  return (
    <div className="space-y-5">

      {/* Media + Identity */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" /> Profile Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo + Logo row */}
          <div className="flex items-center gap-6 pb-4 border-b border-gray-100">
            <AvatarUpload
              currentUrl={form.profile_photo_url}
              onUploaded={(url) => set("profile_photo_url", url)}
              label="Profile Photo"
              icon={User}
              round
            />
            <AvatarUpload
              currentUrl={form.company_logo_url}
              onUploaded={(url) => set("company_logo_url", url)}
              label="Company Logo"
              icon={Building2}
              round={false}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{currentUser?.full_name}</p>
              <p className="text-xs text-gray-500">{currentUser?.email}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{currentUser?.role}</p>
            </div>
          </div>

          {/* Name + Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">First Name</Label>
              <Input value={form.first_name} onChange={e => set("first_name", e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Last Name</Label>
              <Input value={form.last_name} onChange={e => set("last_name", e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(603) 555-0100" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Mail className="w-3 h-3" /> Alternate Email</Label>
              <Input type="email" value={form.alternate_email} onChange={e => set("alternate_email", e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Building2 className="w-3 h-3" /> Company Name</Label>
              <Input value={form.company_name} onChange={e => set("company_name", e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
              <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://" className="h-8 text-sm" />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</Label>
            <div className="space-y-2">
              <Input value={form.address_line1} onChange={e => set("address_line1", e.target.value)} placeholder="Street address" className="h-8 text-sm" />
              <Input value={form.address_line2} onChange={e => set("address_line2", e.target.value)} placeholder="Apt, suite, etc." className="h-8 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" className="h-8 text-sm col-span-1" />
                <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="State" className="h-8 text-sm" />
                <Input value={form.zip} onChange={e => set("zip", e.target.value)} placeholder="ZIP" className="h-8 text-sm" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Signature */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" /> Email Signature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {useSystem ? "Using system-generated signature" : "Using custom signature"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {useSystem ? "Auto-built from your profile data above" : "You control the full HTML"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("signature_type", useSystem ? "custom" : "system")}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {useSystem
                ? <ToggleRight className="w-6 h-6 text-blue-500" />
                : <ToggleLeft className="w-6 h-6 text-gray-400" />}
              {useSystem ? "System" : "Custom"}
            </button>
          </div>

          {useSystem ? (
            <>
              {/* Signature override fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Display Name", field: "sig_name" },
                  { label: "Title / Role", field: "sig_role" },
                  { label: "Company", field: "sig_company" },
                  { label: "Phone in Signature", field: "sig_phone" },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <Label className="text-xs text-gray-500 mb-1 block">{label}</Label>
                    <Input value={form[field]} onChange={e => set(field, e.target.value)} className="h-8 text-sm" />
                  </div>
                ))}
              </div>
              <SystemSignaturePreview form={form} />
            </>
          ) : (
            <>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Custom Signature HTML</Label>
                <Textarea
                  value={form.custom_signature_html}
                  onChange={e => set("custom_signature_html", e.target.value)}
                  rows={8}
                  placeholder="<p>Your Name</p><p>Your Title</p>..."
                  className="text-sm font-mono resize-none"
                />
              </div>
              {form.custom_signature_html && (
                <div className="p-3 rounded-lg border bg-gray-50">
                  <p className="text-[10px] text-gray-400 mb-2 font-semibold uppercase tracking-wide">Preview</p>
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: form.custom_signature_html }}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={mutation.isPending}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {mutation.isPending
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
          : saved
          ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</>
          : "Save Profile"}
      </Button>
    </div>
  );
}
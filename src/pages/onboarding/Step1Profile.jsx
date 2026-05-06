import React, { useState } from "react";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";

export default function Step1Profile({ user, onComplete }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    company_name: user?.company_name || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await authApi.updateMe({
      first_name: form.full_name.split(" ")[0] || form.full_name,
      last_name: form.full_name.split(" ").slice(1).join(" ") || "",
      company_name: form.company_name,
      profile_completed: true,
      profile: {
        ...(user?.profile || {}),
        full_name: form.full_name,
        company: form.company_name,
      },
      onboarding_step: 2,
    });
    setSaving(false);
    onComplete();
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <User className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Set up your profile</h2>
          <p className="text-slate-400 text-sm">Let's get to know you before we dive in.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label className="text-slate-300 text-sm mb-1.5 block">Full Name</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="Corey Caza"
            required
            className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>

        <div>
          <Label className="text-slate-300 text-sm mb-1.5 block">Company / Brokerage</Label>
          <Input
            value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
            placeholder="Realty One Group"
            required
            className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>

        <Button
          type="submit"
          disabled={saving || !form.full_name || !form.company_name}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 mt-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Continue →
        </Button>
      </form>
    </div>
  );
}
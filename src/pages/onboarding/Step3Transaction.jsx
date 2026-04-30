import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Home } from "lucide-react";

export default function Step3Transaction({ user, onComplete, onSkip }) {
  const [form, setForm] = useState({
    address: "",
    agent: user?.full_name || "",
    transaction_type: "buyer",
    closing_date: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const tx = await base44.entities.Transaction.create({
      address: form.address,
      agent: form.agent,
      agent_email: user?.email || "",
      transaction_type: form.transaction_type,
      closing_date: form.closing_date || undefined,
      status: "active",
    });
    await base44.auth.updateMe({ onboarding_step: 4 });
    setSaving(false);
    onComplete(tx.id);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <Home className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create your first transaction</h2>
          <p className="text-slate-400 text-sm">Add the basics — you can fill in more later.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-slate-300 text-sm mb-1.5 block">Property Address</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="123 Main St, Concord, NH 03301"
            required
            className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>

        <div>
          <Label className="text-slate-300 text-sm mb-1.5 block">Agent Name</Label>
          <Input
            value={form.agent}
            onChange={(e) => setForm((f) => ({ ...f, agent: e.target.value }))}
            placeholder="Agent full name"
            required
            className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300 text-sm mb-1.5 block">Transaction Type</Label>
            <Select value={form.transaction_type} onValueChange={(v) => setForm((f) => ({ ...f, transaction_type: v }))}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="seller">Seller</SelectItem>
                <SelectItem value="dual">Dual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 text-sm mb-1.5 block">Closing Date (optional)</Label>
            <Input
              type="date"
              value={form.closing_date}
              onChange={(e) => setForm((f) => ({ ...f, closing_date: e.target.value }))}
              className="bg-slate-900 border-slate-600 text-white focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            className="flex-1 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500"
          >
            Skip for now
          </Button>
          <Button
            type="submit"
            disabled={saving || !form.address || !form.agent}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Continue →
          </Button>
        </div>
      </form>
    </div>
  );
}
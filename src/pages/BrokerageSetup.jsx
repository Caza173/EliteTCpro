import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle, Loader2 } from "lucide-react";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import { DEFAULT_NH_TEMPLATE, buildChecklistItems } from "../components/utils/tenantUtils";

const TIMEZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix"];

export default function BrokerageSetup() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    primary_contact_name: currentUser?.full_name || "",
    primary_contact_email: currentUser?.email || "",
    phone: "",
    address: "",
    timezone: "America/New_York",
    status: "trial",
  });

  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerages"],
    queryFn: () => base44.entities.Brokerage.list(),
  });

  const setupMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Create brokerage
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const brokerage = await base44.entities.Brokerage.create({ ...data, slug });

      // 2. Create default template
      const template = await base44.entities.WorkflowTemplate.create({
        ...DEFAULT_NH_TEMPLATE,
        brokerage_id: brokerage.id,
      });

      // 3. Update brokerage with default template
      await base44.entities.Brokerage.update(brokerage.id, { default_template_id: template.id });

      // 4. Create billing account (trial)
      const today = new Date();
      const trialEnd = new Date(today);
      trialEnd.setDate(trialEnd.getDate() + 14);
      await base44.entities.BillingAccount.create({
        brokerage_id: brokerage.id,
        plan: "starter",
        seat_limit: 6,
        seats_used: 1,
        status: "trial",
        trial_ends_at: trialEnd.toISOString().split("T")[0],
      });

      // 5. Update current user with brokerage_id + owner role
      await base44.auth.updateMe({ brokerage_id: brokerage.id, role: "owner", status: "active" });

      return brokerage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["brokerages"] });
      setDone(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setupMutation.mutate(form);
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center py-24 space-y-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Brokerage Created!</h2>
        <p className="text-gray-500">Your 14-day trial is active. You've been set as Owner.</p>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => window.location.href = "/"}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (brokerages.length > 0 && currentUser?.brokerage_id) {
    return (
      <div className="max-w-xl mx-auto text-center py-24">
        <p className="text-gray-500">Your brokerage is already configured.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/"}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Brokerage</h1>
          <p className="text-sm text-gray-500">This creates your multi-tenant workspace. 14-day free trial.</p>
        </div>
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardHeader><CardTitle className="text-base font-semibold">Brokerage Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Brokerage Name *" id="name">
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Real Estate" required />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Primary Contact Name" id="pcn">
                <Input id="pcn" value={form.primary_contact_name} onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })} placeholder="Jane Smith" />
              </Field>
              <Field label="Primary Contact Email" id="pce">
                <Input id="pce" type="email" value={form.primary_contact_email} onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })} placeholder="jane@brokerage.com" />
              </Field>
              <Field label="Phone" id="phone">
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(603) 555-0100" />
              </Field>
              <Field label="Timezone" id="tz">
                <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Office Address" id="addr">
              <Input id="addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, Concord, NH 03301" />
            </Field>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <Button type="submit" disabled={setupMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {setupMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
                Create Brokerage & Start Trial
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, id, children }) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
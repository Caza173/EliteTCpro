import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { generateDeadlines } from "../components/transactions/deadlineUtils";
import { generateDefaultTasks } from "../components/transactions/defaultTasks";

const initial = {
  agent: "", agent_email: "", buyer: "", seller: "",
  address: "", mls_number: "", contract_date: "", closing_date: "",
  commission: "", transaction_type: "buyer",
};

export default function AgentIntake() {
  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setSubmitted(true);
      setForm(initial);
    },
  });

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const deadlines = form.contract_date ? generateDeadlines(form.contract_date, form.closing_date) : {};
    const tasks = generateDefaultTasks();
    createMutation.mutate({
      ...form,
      phase: 1,
      phases_completed: [],
      status: "active",
      ...deadlines,
      tasks,
    });
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaction Submitted!</h2>
        <p className="text-gray-500 mb-6">Your transaction has been sent to the TC for processing.</p>
        <Button onClick={() => setSubmitted(false)} className="bg-blue-600 hover:bg-blue-700">
          Submit Another
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Agent Intake Form</h1>
        <p className="text-sm text-gray-500 mt-0.5">Submit your transaction details to your TC for processing.</p>
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Transaction Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Agent Info */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Agent Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Agent Name *" id="agent">
                  <Input id="agent" value={form.agent} onChange={(e) => handleChange("agent", e.target.value)} placeholder="Your full name" required />
                </Field>
                <Field label="Agent Email *" id="agent_email">
                  <Input id="agent_email" type="email" value={form.agent_email} onChange={(e) => handleChange("agent_email", e.target.value)} placeholder="agent@brokerage.com" required />
                </Field>
              </div>
            </div>

            {/* Property */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Property Details</p>
              <div className="space-y-4">
                <Field label="Property Address *" id="address">
                  <Input id="address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="123 Main St, City, State" required />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="MLS Number" id="mls">
                    <Input id="mls" value={form.mls_number} onChange={(e) => handleChange("mls_number", e.target.value)} placeholder="MLS#" />
                  </Field>
                  <Field label="Commission" id="commission">
                    <Input id="commission" value={form.commission} onChange={(e) => handleChange("commission", e.target.value)} placeholder="e.g. 3% or $12,000" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Parties</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Buyer Name *" id="buyer">
                  <Input id="buyer" value={form.buyer} onChange={(e) => handleChange("buyer", e.target.value)} placeholder="Buyer full name" required />
                </Field>
                <Field label="Seller Name *" id="seller">
                  <Input id="seller" value={form.seller} onChange={(e) => handleChange("seller", e.target.value)} placeholder="Seller full name" required />
                </Field>
                <Field label="Transaction Type" id="type">
                  <Select value={form.transaction_type} onValueChange={(v) => handleChange("transaction_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="dual">Dual</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            {/* Dates */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Key Dates</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Contract Date" id="contract_date">
                  <Input id="contract_date" type="date" value={form.contract_date} onChange={(e) => handleChange("contract_date", e.target.value)} />
                </Field>
                <Field label="Closing Date" id="closing_date">
                  <Input id="closing_date" type="date" value={form.closing_date} onChange={(e) => handleChange("closing_date", e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit to TC
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
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";

const initialForm = {
  address: "",
  buyer: "",
  seller: "",
  agent: "",
  client_email: "",
  client_phone: "",
  contract_date: "",
  closing_date: "",
  transaction_type: "buyer",
};

export default function TransactionForm({ onSubmit, isSubmitting }) {
  const [form, setForm] = useState(initialForm);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      phase: 1,
      phases_completed: [],
      status: "active",
    });
    setForm(initialForm);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property */}
      <div>
        <Label htmlFor="address" className="text-sm font-medium text-gray-700">Property Address *</Label>
        <Input
          id="address"
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
          placeholder="123 Main Street, City, State"
          required
          className="mt-1.5"
        />
      </div>

      {/* Names Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="buyer" className="text-sm font-medium text-gray-700">Buyer Name *</Label>
          <Input
            id="buyer"
            value={form.buyer}
            onChange={(e) => handleChange("buyer", e.target.value)}
            placeholder="John Smith"
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="seller" className="text-sm font-medium text-gray-700">Seller Name *</Label>
          <Input
            id="seller"
            value={form.seller}
            onChange={(e) => handleChange("seller", e.target.value)}
            placeholder="Jane Doe"
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="agent" className="text-sm font-medium text-gray-700">Agent Name *</Label>
          <Input
            id="agent"
            value={form.agent}
            onChange={(e) => handleChange("agent", e.target.value)}
            placeholder="Agent Name"
            required
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">Client Email</Label>
          <Input
            id="email"
            type="email"
            value={form.client_email}
            onChange={(e) => handleChange("client_email", e.target.value)}
            placeholder="client@email.com"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Client Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={form.client_phone}
            onChange={(e) => handleChange("client_phone", e.target.value)}
            placeholder="(555) 123-4567"
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Dates & Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="contract_date" className="text-sm font-medium text-gray-700">Contract Date</Label>
          <Input
            id="contract_date"
            type="date"
            value={form.contract_date}
            onChange={(e) => handleChange("contract_date", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="closing_date" className="text-sm font-medium text-gray-700">Closing Date</Label>
          <Input
            id="closing_date"
            type="date"
            value={form.closing_date}
            onChange={(e) => handleChange("closing_date", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-700">Transaction Type</Label>
          <Select value={form.transaction_type} onValueChange={(v) => handleChange("transaction_type", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="dual">Dual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Create Transaction
        </Button>
      </div>
    </form>
  );
}
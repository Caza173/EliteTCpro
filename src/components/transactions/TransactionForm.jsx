import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, FileSearch, X, UserPlus } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import PurchaseAgreementUpload from "../forms/PurchaseAgreementUpload";
import ParsedDeadlinesPreview from "../forms/ParsedDeadlinesPreview";
import AddressAutocomplete from "../forms/AddressAutocomplete";

const initialForm = {
  address: "",
  buyer: "",
  seller: "",
  buyers: [""],
  sellers: [""],
  buyers_agent_name: "",
  sellers_agent_name: "",
  buyer_brokerage: "",
  seller_brokerage: "",
  agent: "",
  agent_email: "",
  closing_title_company: "",
  client_email: "",
  client_phone: "",
  is_cash_transaction: false,
  contract_date: "",
  closing_date: "",
  inspection_deadline: "",
  due_diligence_deadline: "",
  earnest_money_deadline: "",
  appraisal_deadline: "",
  financing_deadline: "",
  transaction_type: "buyer",
};

export default function TransactionForm({ onSubmit, isSubmitting }) {
  const [form, setForm] = useState(initialForm);
  const [parsedData, setParsedData] = useState(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePartyChange = (side, index, value) => {
    const arr = [...(form[side] || [""])];
    arr[index] = value;
    setForm((prev) => ({ ...prev, [side]: arr }));
  };

  const addParty = (side) => {
    setForm((prev) => ({ ...prev, [side]: [...(prev[side] || [""]), ""] }));
  };

  const removeParty = (side, index) => {
    const arr = (form[side] || [""]).filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, [side]: arr.length ? arr : [""] }));
  };

  const handleParsed = (parsed) => {
    setParsedData(parsed);
    const updates = {};
    if (parsed.effectiveDate) updates.contract_date = parsed.effectiveDate;
    if (parsed.closingDate || parsed.transferOfTitleDate)
      updates.closing_date = parsed.closingDate || parsed.transferOfTitleDate;
    if (parsed.propertyAddress) updates.address = parsed.propertyAddress;
    if (parsed.buyerName) { updates.buyer = parsed.buyerName; updates.buyers = [parsed.buyerName]; }
    if (parsed.sellerName) { updates.seller = parsed.sellerName; updates.sellers = [parsed.sellerName]; }
    if (parsed.buyersAgentName) updates.buyers_agent_name = parsed.buyersAgentName;
    if (parsed.sellersAgentName) updates.sellers_agent_name = parsed.sellersAgentName;
    if (parsed.buyerBrokerage) updates.buyer_brokerage = parsed.buyerBrokerage;
    if (parsed.sellerBrokerage) updates.seller_brokerage = parsed.sellerBrokerage;
    if (parsed.closingTitleCompany) updates.closing_title_company = parsed.closingTitleCompany;
    if (parsed.financingCommitmentDate) updates.financing_deadline = parsed.financingCommitmentDate;

    // Compute offset-based deadlines from effectiveDate
    const base = parsed.effectiveDate;
    if (base) {
      try {
        if (parsed.earnestMoneyDays != null)
          updates.earnest_money_deadline = format(addDays(parseISO(base), parsed.earnestMoneyDays), "yyyy-MM-dd");
        if (parsed.inspectionDays != null)
          updates.inspection_deadline = format(addDays(parseISO(base), parsed.inspectionDays), "yyyy-MM-dd");
        if (parsed.dueDiligenceDays != null)
          updates.due_diligence_deadline = format(addDays(parseISO(base), parsed.dueDiligenceDays), "yyyy-MM-dd");
      } catch {}
    }
    setForm((prev) => ({ ...prev, ...updates }));
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
    setParsedData(null);
  };

  const field = (id, label, type = "text", placeholder = "", required = false) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}{required ? " *" : ""}</Label>
      <Input
        id={id}
        type={type}
        value={form[id]}
        onChange={(e) => handleChange(id, e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1.5"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* P&S Upload Section */}
      <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-blue-500" />
          <p className="text-sm font-semibold text-gray-700">Upload Purchase &amp; Sales Agreement</p>
          <span className="text-xs text-gray-400 ml-1">— auto-fills deadlines</span>
        </div>
        <PurchaseAgreementUpload onParsed={handleParsed} />
        {parsedData && <ParsedDeadlinesPreview parsed={parsedData} isCash={form.is_cash_transaction} />}
      </div>

      <Separator />

      {/* Cash Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-800">Cash Transaction</p>
          <p className="text-xs text-gray-400">No financing commitment required</p>
        </div>
        <Switch
          checked={form.is_cash_transaction}
          onCheckedChange={(v) => handleChange("is_cash_transaction", v)}
        />
      </div>

      {/* Property */}
      <div>
        <Label htmlFor="address" className="text-sm font-medium text-gray-700">Property Address *</Label>
        <Input
          id="address"
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
          placeholder="123 Main Street, City, NH 00000"
          required
          className="mt-1.5"
        />
      </div>

      {/* Buyer side */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Buyer Side</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("buyer", "Buyer Name(s)", "text", "John & Jane Smith", true)}
          {field("buyers_agent_name", "Buyer's Agent Name", "text", "Agent Name")}
          {field("buyer_brokerage", "Buyer Brokerage", "text", "Brokerage Name")}
        </div>
      </div>

      {/* Seller side */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Seller Side</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("seller", "Seller Name(s)", "text", "Robert Doe", true)}
          {field("sellers_agent_name", "Seller's Agent Name", "text", "Agent Name")}
          {field("seller_brokerage", "Seller Brokerage", "text", "Brokerage Name")}
        </div>
      </div>

      {/* TC / Title */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Coordinator &amp; Title</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("agent", "Transaction Coordinator *", "text", "TC Name", true)}
          {field("agent_email", "TC Email", "email", "tc@office.com")}
        </div>
        {field("closing_title_company", "Closing / Title Company Name", "text", "NH Title & Escrow Co.")}
      </div>

      {/* Client Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field("client_email", "Client Email", "email", "client@email.com")}
        {field("client_phone", "Client Phone", "tel", "(555) 123-4567")}
      </div>

      {/* Dates */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contract Dates &amp; Deadlines</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("contract_date", "Contract / Effective Date", "date")}
          {field("closing_date", "Closing / Transfer of Title Date", "date")}
          {field("earnest_money_deadline", "Earnest Money Deadline", "date")}
          {field("inspection_deadline", "Inspection Deadline", "date")}
          {field("due_diligence_deadline", "Due Diligence Deadline", "date")}
          {field("appraisal_deadline", "Appraisal Deadline", "date")}
          {!form.is_cash_transaction && field("financing_deadline", "Financing Commitment Date", "date")}
        </div>
      </div>

      {/* Type */}
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

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Create Transaction
        </Button>
      </div>
    </form>
  );
}
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

function Field({ label, id, type = "text", value, onChange, required, warn }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-medium text-gray-600 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {warn && <AlertCircle className="w-3 h-3 text-amber-500" />}
      </Label>
      <Input
        id={id}
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 h-8 text-sm ${warn ? "border-amber-300 bg-amber-50" : ""}`}
        required={required}
      />
      {warn && <p className="text-[11px] text-amber-600 mt-0.5">{warn}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 border-b pb-1.5">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

export default function ContractReviewForm({ data, onChange }) {
  const set = (field) => (val) => onChange({ ...data, [field]: val });

  return (
    <div className="space-y-6 text-sm">
      {/* Property */}
      <Section title="Property">
        <div className="sm:col-span-2">
          <Field
            label="Property Address" id="property_address" value={data.property_address}
            onChange={set("property_address")} required
            warn={!data.property_address ? "Required — please enter manually" : null}
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-600">Transaction Type</Label>
          <Select value={data.transaction_type || "buyer"} onValueChange={set("transaction_type")}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="dual">Dual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      {/* Parties */}
      <Section title="Parties">
        <Field label="Buyer Name(s)" id="buyer_names" value={data.buyer_names} onChange={set("buyer_names")} required
          warn={!data.buyer_names ? "Required" : null} />
        <Field label="Seller Name(s)" id="seller_names" value={data.seller_names} onChange={set("seller_names")} required
          warn={!data.seller_names ? "Required" : null} />
      </Section>

      {/* Agents */}
      <Section title="Agents & Brokerages">
        <Field label="Buyer's Agent" id="buyer_agent" value={data.buyer_agent} onChange={set("buyer_agent")} />
        <Field label="Buyer Brokerage" id="buyer_brokerage" value={data.buyer_brokerage} onChange={set("buyer_brokerage")} />
        <Field label="Listing Agent" id="seller_agent" value={data.seller_agent} onChange={set("seller_agent")} />
        <Field label="Seller Brokerage" id="seller_brokerage" value={data.seller_brokerage} onChange={set("seller_brokerage")} />
        <div className="sm:col-span-2">
          <Field label="Closing / Title Company" id="title_company" value={data.title_company} onChange={set("title_company")} />
        </div>
      </Section>

      {/* Financials */}
      <Section title="Financial">
        <Field label="Purchase Price ($)" id="purchase_price" type="number" value={data.purchase_price} onChange={set("purchase_price")}
          warn={!data.purchase_price ? "Not detected — verify manually" : null} />
        <Field label="Earnest Money Deposit ($)" id="deposit_amount" type="number" value={data.deposit_amount} onChange={set("deposit_amount")}
          warn={!data.deposit_amount ? "Not detected — verify manually" : null} />
        <Field label="Seller Concessions ($)" id="seller_concession_amount" type="number" value={data.seller_concession_amount} onChange={set("seller_concession_amount")} />
        <Field label="Commission (%)" id="commission_percent" type="number" value={data.commission_percent} onChange={set("commission_percent")} />
      </Section>

      {/* Dates */}
      <Section title="Key Dates">
        <Field label="Acceptance / Effective Date" id="acceptance_date" type="date" value={data.acceptance_date} onChange={set("acceptance_date")} />
        <Field label="Closing Date" id="closing_date" type="date" value={data.closing_date} onChange={set("closing_date")} />
        <Field label="Inspection Deadline" id="inspection_deadline" type="date" value={data.inspection_deadline} onChange={set("inspection_deadline")} />
        <Field label="Earnest Money Deadline" id="earnest_money_deadline" type="date" value={data.earnest_money_deadline} onChange={set("earnest_money_deadline")} />
        <Field label="Due Diligence Deadline" id="due_diligence_deadline" type="date" value={data.due_diligence_deadline} onChange={set("due_diligence_deadline")} />
        <Field label="Financing Commitment Date" id="financing_commitment_date" type="date" value={data.financing_commitment_date} onChange={set("financing_commitment_date")} />
      </Section>
    </div>
  );
}
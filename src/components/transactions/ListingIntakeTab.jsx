import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Save, CheckCircle2, Home, BarChart2, Eye, Megaphone, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Collapsible Section ───────────────────────────────────────────────────────
function Section({ title, icon: Icon, color = "blue", children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    blue:   { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100" },
    green:  { bg: "bg-emerald-50",text: "text-emerald-600",border: "border-emerald-100" },
    purple: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100" },
    teal:   { bg: "bg-teal-50",   text: "text-teal-600",   border: "border-teal-100" },
  }[color] || {};

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:opacity-90"
        style={{ background: "var(--bg-tertiary)" }}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.border} border`}>
          <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
        </div>
        <span className="flex-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</span>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mr-1">{badge}</span>
        )}
        {open ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-4" style={{ background: "var(--card-bg)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Field Row ─────────────────────────────────────────────────────────────────
function Field({ label, required, children, half }) {
  return (
    <div className={half ? "" : "w-full"}>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", required }) {
  return (
    <Input
      type={type}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="text-sm"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-1 resize-none"
      style={{
        borderColor: "var(--input-border)",
        background: "var(--input-bg)",
        color: "var(--text-primary)",
      }}
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full flex items-center transition-colors flex-shrink-0 ${checked ? "bg-blue-500" : "bg-gray-200"}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
    </label>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ListingIntakeTab({ transaction, onSave }) {
  const existing = transaction.listing_details || {};

  const [form, setForm] = useState({
    // Core
    address: existing.address || transaction.address || "",
    city: existing.city || "",
    state: existing.state || "NH",
    zip: existing.zip || "",
    property_type: existing.property_type || transaction.property_type || "residential",
    list_price: existing.list_price || transaction.sale_price || "",
    list_date: existing.list_date || transaction.contract_date || "",
    expiration_date: existing.expiration_date || transaction.closing_date || "",
    seller_names: existing.seller_names || (transaction.sellers?.join(", ") || transaction.seller || ""),
    seller_email: existing.seller_email || transaction.client_email || "",
    seller_phone: existing.seller_phone || transaction.client_phone || "",
    listing_agent: existing.listing_agent || transaction.sellers_agent_name || transaction.agent || "",
    // MLS Minimum
    zoning: existing.zoning || "",
    county: existing.county || "",
    bedrooms: existing.bedrooms || "",
    bathrooms: existing.bathrooms || "",
    sqft: existing.sqft || "",
    year_built: existing.year_built || "",
    lot_size: existing.lot_size || "",
    heating: existing.heating || "",
    water: existing.water || "",
    sewer: existing.sewer || "",
    parking: existing.parking || "",
    public_remarks: existing.public_remarks || "",
    // Showing
    showing_instructions: existing.showing_instructions || transaction.showingInstructions || "",
    showing_service: existing.showing_service || "",
    occupancy: existing.occupancy || transaction.occupancy || "",
    lockbox: existing.lockbox || "",
    // Marketing
    photos_uploaded: existing.photos_uploaded || false,
    virtual_tour_url: existing.virtual_tour_url || "",
    allow_public_display: existing.allow_public_display !== undefined ? existing.allow_public_display : true,
    allow_avm: existing.allow_avm !== undefined ? existing.allow_avm : true,
    // Commission
    listing_commission: existing.listing_commission || transaction.listSideCommission || "",
    buyer_agent_commission: existing.buyer_agent_commission || transaction.buyerAgentCommission || "",
    commission_basis: existing.commission_basis || "percentage",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (field) => (value) => setForm(f => ({ ...f, [field]: value }));

  // Sync core fields back to transaction on save
  const handleSave = async () => {
    setSaving(true);
    const coreSync = {
      address: form.address,
      sale_price: form.list_price ? Number(form.list_price) : undefined,
      contract_date: form.list_date,
      closing_date: form.expiration_date,
      seller: form.seller_names,
      sellers: form.seller_names ? [form.seller_names] : [],
      client_email: form.seller_email,
      client_phone: form.seller_phone,
      sellers_agent_name: form.listing_agent,
      property_type: form.property_type,
      listing_details: form,
    };
    await onSave(coreSync);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Completion badge for MLS section
  const mlsFields = ["bedrooms", "bathrooms", "sqft", "year_built", "public_remarks"];
  const mlsDone = mlsFields.filter(f => form[f]).length;

  const showingFields = ["showing_instructions", "occupancy"];
  const showingDone = showingFields.filter(f => form[f]).length;

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Listing Intake</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Complete core info first — other sections are optional for MLS submission</p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="gap-1.5"
          style={{ background: saved ? "#16a34a" : "var(--accent)", color: "white" }}
        >
          {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </Button>
      </div>

      {/* SECTION 1 — Core (always open) */}
      <Section title="Core Info" icon={Home} color="blue" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Field label="Property Address" required>
              <TextInput value={form.address} onChange={set("address")} placeholder="123 Main St" required />
            </Field>
          </div>
          <Field label="City" required>
            <TextInput value={form.city} onChange={set("city")} placeholder="Concord" required />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="State">
              <TextInput value={form.state} onChange={set("state")} placeholder="NH" />
            </Field>
            <Field label="Zip">
              <TextInput value={form.zip} onChange={set("zip")} placeholder="03301" />
            </Field>
          </div>
          <Field label="Property Type">
            <select
              value={form.property_type}
              onChange={e => set("property_type")(e.target.value)}
              className="w-full text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
              style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            >
              <option value="residential">Residential</option>
              <option value="condo">Condo</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
              <option value="multi_family">Multi-Family</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="List Price" required>
            <TextInput value={form.list_price} onChange={set("list_price")} placeholder="500000" type="number" required />
          </Field>
          <Field label="List Date">
            <TextInput value={form.list_date} onChange={set("list_date")} type="date" />
          </Field>
          <Field label="Expiration Date">
            <TextInput value={form.expiration_date} onChange={set("expiration_date")} type="date" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Seller Name(s)" required>
              <TextInput value={form.seller_names} onChange={set("seller_names")} placeholder="John & Jane Smith" required />
            </Field>
          </div>
          <Field label="Seller Email">
            <TextInput value={form.seller_email} onChange={set("seller_email")} placeholder="seller@email.com" type="email" />
          </Field>
          <Field label="Seller Phone">
            <TextInput value={form.seller_phone} onChange={set("seller_phone")} placeholder="(555) 123-4567" type="tel" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Listing Agent" required>
              <TextInput value={form.listing_agent} onChange={set("listing_agent")} placeholder="Agent name" required />
            </Field>
          </div>
        </div>
      </Section>

      {/* SECTION 2 — MLS Minimum */}
      <Section title="MLS Minimum Info" icon={BarChart2} color="purple" badge={mlsDone > 0 ? `${mlsDone}/${mlsFields.length}` : undefined}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="County">
            <TextInput value={form.county} onChange={set("county")} placeholder="Merrimack" />
          </Field>
          <Field label="Zoning">
            <TextInput value={form.zoning} onChange={set("zoning")} placeholder="R-1" />
          </Field>
          <Field label="Year Built">
            <TextInput value={form.year_built} onChange={set("year_built")} placeholder="1995" />
          </Field>
          <Field label="Bedrooms">
            <TextInput value={form.bedrooms} onChange={set("bedrooms")} placeholder="3" type="number" />
          </Field>
          <Field label="Bathrooms">
            <TextInput value={form.bathrooms} onChange={set("bathrooms")} placeholder="2.5" />
          </Field>
          <Field label="Sq Ft">
            <TextInput value={form.sqft} onChange={set("sqft")} placeholder="1800" type="number" />
          </Field>
          <Field label="Lot Size">
            <TextInput value={form.lot_size} onChange={set("lot_size")} placeholder="0.5 acres" />
          </Field>
          <Field label="Heating">
            <TextInput value={form.heating} onChange={set("heating")} placeholder="Gas forced air" />
          </Field>
          <Field label="Water">
            <TextInput value={form.water} onChange={set("water")} placeholder="Public" />
          </Field>
          <Field label="Sewer">
            <TextInput value={form.sewer} onChange={set("sewer")} placeholder="Public" />
          </Field>
          <div className="col-span-2 sm:col-span-3">
            <Field label="Parking">
              <TextInput value={form.parking} onChange={set("parking")} placeholder="2-car attached garage" />
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <Field label="Public Remarks">
              <Textarea value={form.public_remarks} onChange={set("public_remarks")} placeholder="Describe the property for MLS…" rows={4} />
            </Field>
          </div>
        </div>
      </Section>

      {/* SECTION 3 — Showing */}
      <Section title="Showing" icon={Eye} color="teal" badge={showingDone > 0 ? `${showingDone}/${showingFields.length}` : undefined}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Field label="Showing Instructions">
              <Textarea value={form.showing_instructions} onChange={set("showing_instructions")} placeholder="Call listing agent 24hrs in advance…" rows={2} />
            </Field>
          </div>
          <Field label="Showing Service">
            <TextInput value={form.showing_service} onChange={set("showing_service")} placeholder="ShowingTime, CSS, etc." />
          </Field>
          <Field label="Occupancy">
            <select
              value={form.occupancy}
              onChange={e => set("occupancy")(e.target.value)}
              className="w-full text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
              style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            >
              <option value="">Select…</option>
              <option value="owner">Owner Occupied</option>
              <option value="tenant">Tenant Occupied</option>
              <option value="vacant">Vacant</option>
            </select>
          </Field>
          <Field label="Lockbox">
            <TextInput value={form.lockbox} onChange={set("lockbox")} placeholder="Supra, combo, etc." />
          </Field>
        </div>
      </Section>

      {/* SECTION 4 — Marketing */}
      <Section title="Marketing" icon={Megaphone} color="amber">
        <div className="space-y-3">
          <Toggle checked={form.photos_uploaded} onChange={set("photos_uploaded")} label="Photos uploaded" />
          <Toggle checked={form.allow_public_display} onChange={set("allow_public_display")} label="Allow public display (IDX)" />
          <Toggle checked={form.allow_avm} onChange={set("allow_avm")} label="Allow AVM (estimated value)" />
          <Field label="Virtual Tour URL">
            <TextInput value={form.virtual_tour_url} onChange={set("virtual_tour_url")} placeholder="https://tour.example.com/..." type="url" />
          </Field>
        </div>
      </Section>

      {/* SECTION 5 — Commission */}
      <Section title="Commission" icon={DollarSign} color="green">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Listing Commission">
            <TextInput value={form.listing_commission} onChange={set("listing_commission")} placeholder="3%" />
          </Field>
          <Field label="Buyer Agent Commission">
            <TextInput value={form.buyer_agent_commission} onChange={set("buyer_agent_commission")} placeholder="2.5%" />
          </Field>
          <Field label="Commission Basis">
            <select
              value={form.commission_basis}
              onChange={e => set("commission_basis")(e.target.value)}
              className="w-full text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
              style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat Fee</option>
              <option value="negotiable">Negotiable</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Bottom Save */}
      <div className="flex justify-end pt-1">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5" style={{ background: saved ? "#16a34a" : "var(--accent)", color: "white" }}>
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Listing Intake"}
        </Button>
      </div>
    </div>
  );
}
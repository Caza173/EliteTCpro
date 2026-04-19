import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function F({ label, id, children }) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
    </div>
  );
}

/**
 * InspectionContingencySection
 *
 * Props:
 *   form        — the parent form state object
 *   set(k, v)   — setter for individual fields
 */
export default function InspectionContingencySection({ form, set }) {
  const waived = !!form.inspections_waived;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inspection Contingency</p>

      {/* Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-800">Inspections Waived</p>
          <p className="text-xs text-gray-400">Buyer is waiving inspection contingencies</p>
        </div>
        <Switch
          checked={waived}
          onCheckedChange={v => {
            set("inspections_waived", v);
            // Clear dates when waiving
            if (v) {
              [
                "general_inspection_date",
                "septic_inspection_date",
                "water_test_date",
                "radon_air_date",
                "radon_water_date",
                "custom_inspection_label",
                "custom_inspection_date",
              ].forEach(k => set(k, ""));
            }
          }}
        />
      </div>

      {/* NOT waived — show inspection dates */}
      {!waived && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F label="General Inspection Date" id="general_inspection_date">
            <Input
              id="general_inspection_date"
              type="date"
              value={form.general_inspection_date || ""}
              onChange={e => set("general_inspection_date", e.target.value)}
              className="mt-1.5"
            />
          </F>
          <F label="Septic Inspection Date" id="septic_inspection_date">
            <Input
              id="septic_inspection_date"
              type="date"
              value={form.septic_inspection_date || ""}
              onChange={e => set("septic_inspection_date", e.target.value)}
              className="mt-1.5"
            />
          </F>
          <F label="Water Test Date" id="water_test_date">
            <Input
              id="water_test_date"
              type="date"
              value={form.water_test_date || ""}
              onChange={e => set("water_test_date", e.target.value)}
              className="mt-1.5"
            />
          </F>
          <F label="Radon Air Date" id="radon_air_date">
            <Input
              id="radon_air_date"
              type="date"
              value={form.radon_air_date || ""}
              onChange={e => set("radon_air_date", e.target.value)}
              className="mt-1.5"
            />
          </F>
          <F label="Radon Water Date" id="radon_water_date">
            <Input
              id="radon_water_date"
              type="date"
              value={form.radon_water_date || ""}
              onChange={e => set("radon_water_date", e.target.value)}
              className="mt-1.5"
            />
          </F>
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Custom Inspection Type" id="custom_inspection_label">
              <Input
                id="custom_inspection_label"
                value={form.custom_inspection_label || ""}
                onChange={e => set("custom_inspection_label", e.target.value)}
                placeholder="e.g. Chimney, Pool, Lead"
                className="mt-1.5"
              />
            </F>
            <F label="Custom Inspection Date" id="custom_inspection_date">
              <Input
                id="custom_inspection_date"
                type="date"
                value={form.custom_inspection_date || ""}
                onChange={e => set("custom_inspection_date", e.target.value)}
                disabled={!form.custom_inspection_label}
                className="mt-1.5"
              />
            </F>
          </div>
        </div>
      )}

      {/* Waived — show waiver type + notes */}
      {waived && (
        <div className="space-y-4">
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm"
            style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.3)", color: "#92400e" }}
          >
            <span className="text-base">⚠️</span>
            <p>Inspections are waived. No inspection tasks, deadlines, or addendum triggers will be created.</p>
          </div>
          <F label="Waiver Type" id="inspection_waiver_type">
            <div className="mt-1.5">
              <Select
                value={form.inspection_waiver_type || ""}
                onValueChange={v => set("inspection_waiver_type", v)}
              >
                <SelectTrigger id="inspection_waiver_type">
                  <SelectValue placeholder="Select waiver type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_waiver">Full Waiver</SelectItem>
                  <SelectItem value="informational_only">Informational Only</SelectItem>
                  <SelectItem value="partial_waiver">Partial Waiver</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </F>
          {form.inspection_waiver_type === "informational_only" && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs"
              style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)", color: "#1e3a5f" }}
            >
              <span>ℹ️</span>
              Informational Only — scheduling tasks are permitted, but no repair or addendum workflows will be triggered.
            </div>
          )}
          <F label="Waiver Notes" id="inspection_waiver_notes">
            <textarea
              id="inspection_waiver_notes"
              rows={3}
              value={form.inspection_waiver_notes || ""}
              onChange={e => set("inspection_waiver_notes", e.target.value)}
              placeholder="Optional notes about this waiver…"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </F>
        </div>
      )}
    </div>
  );
}
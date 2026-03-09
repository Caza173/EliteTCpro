import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, FileSearch, ChevronDown, ChevronUp } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function DetectedClause({ label, text }) {
  if (!text) return null;
  return (
    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xs text-gray-700 italic leading-relaxed">"{text}"</p>
    </div>
  );
}

export default function Section20ReviewPanel({ parsed, salePrice, onApply }) {
  const hasSection20Data =
    parsed?.section20ProfessionalFee ||
    parsed?.section20Concessions ||
    parsed?.section20AdditionalProvisions ||
    parsed?.professionalFeeValue ||
    parsed?.sellerConcessionAmount;

  const [expanded, setExpanded] = useState(true);
  const [feeType, setFeeType] = useState(parsed?.professionalFeeType || "percent");
  const [feeValue, setFeeValue] = useState(parsed?.professionalFeeValue ?? "");
  const [feeBase, setFeeBase] = useState(parsed?.professionalFeeBase || "contract_price");
  const [concessionAmount, setConcessionAmount] = useState(parsed?.sellerConcessionAmount ?? "");
  const [concessionPercent, setConcessionPercent] = useState(parsed?.sellerConcessionPercent ?? "");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    setFeeType(parsed?.professionalFeeType || "percent");
    setFeeValue(parsed?.professionalFeeValue ?? "");
    setFeeBase(parsed?.professionalFeeBase || "contract_price");
    setConcessionAmount(parsed?.sellerConcessionAmount ?? "");
    setConcessionPercent(parsed?.sellerConcessionPercent ?? "");
    setApplied(false);
  }, [parsed]);

  if (!hasSection20Data) return null;

  // Calculate resolved dollar amounts for preview
  const resolvedFee = feeType === "percent" && feeValue && salePrice
    ? (salePrice * (parseFloat(feeValue) / 100))
    : feeType === "flat" && feeValue
    ? parseFloat(feeValue)
    : null;

  const resolvedConcession = concessionPercent && salePrice
    ? (salePrice * (parseFloat(concessionPercent) / 100))
    : concessionAmount
    ? parseFloat(concessionAmount)
    : null;

  const handleApply = () => {
    onApply({
      professionalFeeType: feeType,
      professionalFeeValue: parseFloat(feeValue) || 0,
      professionalFeeBase: feeBase,
      professionalFeeAmount: resolvedFee || 0,
      sellerConcessionAmount: parseFloat(concessionAmount) || (resolvedConcession || 0),
    });
    setApplied(true);
  };

  return (
    <Card className="border-amber-200 shadow-sm bg-amber-50/30">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-amber-500" />
          Section 20 — Detected Financial Clauses
          <Badge className="bg-amber-100 text-amber-700 text-xs ml-1">Review Required</Badge>
          <span className="ml-auto text-gray-400">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Verbatim detected clauses */}
          <div className="space-y-2">
            <DetectedClause label="Additional Provisions" text={parsed?.section20AdditionalProvisions} />
            <DetectedClause label="Concessions" text={parsed?.section20Concessions} />
            <DetectedClause label="Professional Fee" text={parsed?.section20ProfessionalFee} />
            {parsed?.additionalCompensationNotes && (
              <DetectedClause label="Other Compensation Language" text={parsed.additionalCompensationNotes} />
            )}
          </div>

          <div className="border-t border-amber-200 pt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Confirm Extracted Values</p>

            {/* Professional Fee */}
            {(parsed?.professionalFeeValue || parsed?.section20ProfessionalFee) && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Professional Fee (Section 20)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Type</Label>
                    <Select value={feeType} onValueChange={setFeeType}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                        <SelectItem value="flat">Flat Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">
                      {feeType === "percent" ? "Percent (%)" : "Amount ($)"}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={feeValue}
                      onChange={(e) => setFeeValue(e.target.value)}
                      className="h-8 text-xs"
                      placeholder={feeType === "percent" ? "e.g. 2" : "e.g. 5000"}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Resolved Amount</Label>
                    <div className="h-8 flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-md px-2 border border-emerald-100">
                      {resolvedFee != null ? fmt(resolvedFee) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Seller Concession */}
            {(parsed?.sellerConcessionAmount || parsed?.sellerConcessionPercent || parsed?.section20Concessions) && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Seller Concession</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Flat Amount ($)</Label>
                    <Input
                      type="number"
                      value={concessionAmount}
                      onChange={(e) => setConcessionAmount(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="e.g. 5000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Or Percent (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={concessionPercent}
                      onChange={(e) => setConcessionPercent(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="e.g. 2.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Resolved Amount</Label>
                    <div className="h-8 flex items-center text-xs font-semibold text-orange-700 bg-orange-50 rounded-md px-2 border border-orange-100">
                      {resolvedConcession != null ? fmt(resolvedConcession) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {applied ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Applied to Finance tab
              </div>
            ) : (
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleApply}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Apply to Finance Calculations
              </Button>
            )}
            <p className="text-xs text-gray-400">Review and confirm before applying</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Upload, CheckCircle, Loader2, X } from "lucide-react";

export default function BrokerageLogoUpload({ brokerage, onSaved }) {
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Brokerage.update(brokerage.id, { branding_logo: file_url });
    setUploading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  };

  const handleRemove = async () => {
    await base44.entities.Brokerage.update(brokerage.id, { branding_logo: "" });
    onSaved?.();
  };

  return (
    <Card className="shadow-sm border-gray-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-500" /> Brokerage Logo
        </CardTitle>
        <p className="text-xs text-gray-400 mt-0.5">Displayed on the landing page and client-facing areas.</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Preview */}
          <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {brokerage?.branding_logo ? (
              <img src={brokerage.branding_logo} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Building2 className="w-8 h-8 text-gray-300" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
              <Button size="sm" variant="outline" className="gap-1.5 pointer-events-none" asChild>
                <span>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Upload className="w-3.5 h-3.5" />}
                  {saved ? "Saved!" : uploading ? "Uploading…" : "Upload Logo"}
                </span>
              </Button>
            </label>
            {brokerage?.branding_logo && (
              <button onClick={handleRemove} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                <X className="w-3 h-3" /> Remove logo
              </button>
            )}
            <p className="text-xs text-gray-400">PNG, JPG, or SVG. Recommended: 200×60px.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
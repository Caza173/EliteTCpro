import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { authApi } from "@/api/auth";
import { documentsApi } from "@/api/documents";
import { uploadsApi } from "@/api/uploads";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, CheckCircle, Sparkles } from "lucide-react";

export default function Step4Document({ transactionId, onComplete, onSkip }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [done, setDone] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const uploadResult = transactionId
      ? await documentsApi.upload(file, {
          transaction_id: transactionId,
          file_name: file.name,
          doc_type: "purchase_and_sale",
        })
      : await uploadsApi.uploadTemporary(file, { namespace: "onboarding/purchase-and-sale" });
    setUploading(false);

    // Trigger AI parse
    setParsing(true);
    let parsed = null;
    try {
      const res = await base44.functions.invoke("parsePurchaseAgreementV2", {
        file_url: uploadResult.file_url || uploadResult.signed_url,
        file_key: uploadResult.storage_key || uploadResult.object_key,
        transaction_id: transactionId,
      });
      parsed = res.data;
    } catch (_) {}
    setParsing(false);
    setParsedData(parsed);
    setDone(true);

    await authApi.updateMe({ onboarding_step: 5 });
  };

  if (done) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 shadow-xl text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Document uploaded & analyzed!</h2>
        <p className="text-slate-400 text-sm mb-6">
          EliteTC extracted deadlines and key details from your document.
        </p>
        <Button
          onClick={() => onComplete(parsedData)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5"
        >
          See What We Found →
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Upload your P&S Agreement</h2>
          <p className="text-slate-400 text-sm">AI will extract deadlines and key data instantly.</p>
        </div>
      </div>

      <input type="file" ref={fileRef} onChange={handleFile} accept=".pdf" className="hidden" />

      <button
        onClick={() => fileRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all mb-5 ${
          file
            ? "border-blue-500 bg-blue-500/10"
            : "border-slate-600 bg-slate-900/40 hover:border-slate-500"
        }`}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-blue-400">
            <FileText className="w-5 h-5" />
            <span className="font-medium text-sm">{file.name}</span>
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Click to select a PDF</p>
            <p className="text-slate-600 text-xs mt-1">Purchase & Sale Agreement</p>
          </div>
        )}
      </button>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={uploading || parsing}
          className="flex-1 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500"
        >
          Skip for now
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!file || uploading || parsing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          {(uploading || parsing) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {uploading ? "Uploading..." : parsing ? "Analyzing with AI..." : "Upload & Analyze →"}
        </Button>
      </div>
    </div>
  );
}
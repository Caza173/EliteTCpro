import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/auth/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, FileText, Loader2, X, ChevronRight, Mail } from "lucide-react";
import { toast } from "sonner";
import EmailComposerModal from "@/components/email/EmailComposerModal";

export default function GenerateDocumentModal({ transaction, onClose, onGenerated }) {
  const { data: currentUser } = useCurrentUser();
  const brokerageId = transaction?.brokerage_id || currentUser?.brokerage_id;

  const [step, setStep] = useState(1); // 1=select template, 2=select clauses, 3=generating
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedClauseIds, setSelectedClauseIds] = useState([]);
  const [customText, setCustomText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null); // { file_url, file_name }
  const [emailOpen, setEmailOpen] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["pdfTemplates", brokerageId],
    queryFn: () => base44.entities.PDFTemplate.filter({ brokerage_id: brokerageId }),
    enabled: !!brokerageId,
  });

  const { data: clauses = [] } = useQuery({
    queryKey: ["clauses", brokerageId],
    queryFn: () => base44.entities.Clause.filter({ brokerage_id: brokerageId }),
    enabled: !!brokerageId,
  });

  const toggleClause = (id) => {
    setSelectedClauseIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) { toast.error("Select a template first"); return; }
    setGenerating(true);
    setStep(3);
    try {
      const res = await base44.functions.invoke("generateAddendum", {
        template_id: selectedTemplate.id,
        transaction_id: transaction.id,
        clause_ids: selectedClauseIds,
        custom_text: customText.trim() || null,
        brokerage_id: brokerageId,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      onGenerated?.();
      toast.success("Document generated and saved to Documents tab!");
    } catch (err) {
      toast.error(err.message || "Generation failed");
      setStep(2);
    }
    setGenerating(false);
  };

  const typeColors = {
    addendum: "bg-blue-50 text-blue-700 border-blue-200",
    disclosure: "bg-amber-50 text-amber-700 border-amber-200",
    agreement: "bg-purple-50 text-purple-700 border-purple-200",
    other: "bg-gray-50 text-gray-600",
  };

  const categoryColors = {
    deadline: "bg-orange-50 text-orange-700 border-orange-200",
    financial: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inspection: "bg-blue-50 text-blue-700 border-blue-200",
    title: "bg-purple-50 text-purple-700 border-purple-200",
    legal: "bg-red-50 text-red-700 border-red-200",
    custom: "bg-gray-50 text-gray-600",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Create Document</h2>
            <p className="text-xs text-gray-400 mt-0.5">{transaction?.address}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Steps indicator */}
        {step < 3 && (
          <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium">
            <span className={step >= 1 ? "text-blue-600" : "text-gray-400"}>1. Template</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className={step >= 2 ? "text-blue-600" : "text-gray-400"}>2. Clauses</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-gray-400">3. Generate</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">

          {/* Step 1: Select template */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">Select a PDF template to use for this document:</p>
              {templates.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-dashed border-gray-200">
                  <FileText className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No templates available.</p>
                  <p className="text-xs text-gray-400 mt-1">Upload templates in Settings → Templates.</p>
                </div>
              ) : (
                templates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => { setSelectedTemplate(tmpl); setStep(2); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedTemplate?.id === tmpl.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{tmpl.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] capitalize ${typeColors[tmpl.type] || ""}`}>{tmpl.type}</Badge>
                        {tmpl.is_mapped
                          ? <span className="text-[10px] text-emerald-600">✓ Fields mapped</span>
                          : <span className="text-[10px] text-amber-600">⚠ Using defaults</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2: Select clauses */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Select clauses to include:</p>
                <button onClick={() => setStep(1)} className="text-xs text-blue-600 hover:underline">← Back</button>
              </div>

              {/* Auto-fill preview */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                <p className="font-semibold text-slate-600 mb-1.5">Auto-filled from transaction:</p>
                <p><span className="text-slate-400">Buyer:</span> <span className="font-medium">{transaction?.buyers?.join(', ') || transaction?.buyer || '—'}</span></p>
                <p><span className="text-slate-400">Seller:</span> <span className="font-medium">{transaction?.sellers?.join(', ') || transaction?.seller || '—'}</span></p>
                <p><span className="text-slate-400">Address:</span> <span className="font-medium">{transaction?.address || '—'}</span></p>
                <p><span className="text-slate-400">Effective Date:</span> <span className="font-medium">{transaction?.contract_date || new Date().toLocaleDateString()}</span></p>
              </div>

              {/* Clause list */}
              {clauses.length > 0 ? (
                <div className="space-y-2">
                  {clauses.map(clause => {
                    const selected = selectedClauseIds.includes(clause.id);
                    return (
                      <button
                        key={clause.id}
                        onClick={() => toggleClause(clause.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                          selected ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                        }`}
                      >
                        <div className={`w-4 h-4 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                          selected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                        }`}>
                          {selected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">{clause.name}</p>
                            <Badge variant="outline" className={`text-[10px] capitalize ${categoryColors[clause.category] || ""}`}>{clause.category}</Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{clause.text}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">No clauses in library. Add them in Addendum Builder.</p>
              )}

              {/* Custom text */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Additional custom text (optional)</Label>
                <Textarea
                  placeholder="Enter any additional clause text here..."
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  className="text-sm h-24 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Generating / Done */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {generating ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm font-medium text-gray-700">Generating document...</p>
                  <p className="text-xs text-gray-400">Overlaying text on PDF template</p>
                </>
              ) : result ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Document Generated!</p>
                  <p className="text-xs text-gray-400 text-center">{result.file_name}<br/>Saved to Documents tab.</p>
                  <div className="flex gap-2 mt-2">
                    <a href={result.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> View PDF
                      </Button>
                    </a>
                    <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                      onClick={() => setEmailOpen(true)}>
                      <Mail className="w-3.5 h-3.5" /> Generate & Email
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step === 2 && (
          <div className="border-t border-gray-100 px-5 py-3 flex justify-between items-center">
            <p className="text-xs text-gray-400">
              {selectedClauseIds.length} clause{selectedClauseIds.length !== 1 ? "s" : ""} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5"
                onClick={handleGenerate}
                disabled={selectedClauseIds.length === 0 && !customText.trim()}>
                Generate Document
              </Button>
            </div>
          </div>
        )}
      </div>

      {emailOpen && result && (
        <EmailComposerModal
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          transaction={transaction}
          documents={[{
            id: 'generated',
            file_url: result.file_url,
            file_name: result.file_name,
            doc_type: 'addendum',
          }]}
          defaultSubject={`Addendum – ${transaction?.address}`}
        />
      )}
    </div>
  );
}
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Trash2, Download, Loader2, FolderOpen, ClipboardCheck, Eye, Mail, Filter, FilePlus, Layers, AlertCircle, CheckSquare, Square, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import DocumentViewerModal from "./DocumentViewerModal";
import { format } from "date-fns";
import { writeAuditLog } from "../utils/tenantUtils";
import DocChecklistPanel from "./DocChecklistPanel";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SuggestedDocuments from "./SuggestedDocuments";
import EmailComposerModal from "../email/EmailComposerModal";
import GenerateDocumentModal from "@/components/templates/GenerateDocumentModal";

const DOC_TYPES = [
  { value: "purchase_and_sale", label: "Purchase & Sale Agreement" },
  { value: "listing_agreement", label: "Listing Agreement" },
  { value: "addendum", label: "Addendum" },
  { value: "buyer_agency_agreement", label: "Buyer Agency Agreement" },
  { value: "disclosure", label: "Disclosure" },
  { value: "inspection", label: "Inspection Report" },
  { value: "appraisal", label: "Appraisal" },
  { value: "title", label: "Title Document" },
  { value: "closing", label: "Closing Document" },
  { value: "other", label: "Other" },
];

const DOC_LABELS = {
  purchase_and_sale: "Purchase & Sale",
  listing_agreement: "Listing Agreement",
  addendum: "Addendum",
  buyer_agency_agreement: "Buyer Agency",
  disclosure: "Disclosure",
  inspection: "Inspection",
  appraisal: "Appraisal",
  title: "Title",
  closing: "Closing",
  other: "Other",
};

const TYPE_COLORS = {
  purchase_and_sale: "bg-blue-50 text-blue-700",
  listing_agreement: "bg-emerald-50 text-emerald-700",
  addendum: "bg-amber-50 text-amber-700",
  buyer_agency_agreement: "bg-purple-50 text-purple-700",
  disclosure: "bg-orange-50 text-orange-700",
  inspection: "bg-cyan-50 text-cyan-700",
  appraisal: "bg-indigo-50 text-indigo-700",
  title: "bg-teal-50 text-teal-700",
  closing: "bg-rose-50 text-rose-700",
  other: "bg-gray-50 text-gray-600",
};

export default function TransactionDocumentsTab({ transaction, currentUser }) {
  const queryClient = useQueryClient();
  const [selectedDocType, setSelectedDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [emailModal, setEmailModal] = useState({ open: false, preselectedDoc: null });
  const [typeFilter, setTypeFilter] = useState("all");
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const fileInputRef = useRef(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["tx-documents", transaction.id],
    queryFn: () => base44.entities.Document.filter({ transaction_id: transaction.id, is_deleted: { $ne: true } }, "-created_date"),
    enabled: !!transaction.id,
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ["checklist", transaction.id],
    queryFn: () => base44.entities.DocumentChecklistItem.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
  });

  const handleDeleteDocument = async (id) => {
    setDeleteError(null);
    setDeletingId(id);
    try {
      await base44.functions.invoke("deleteDocument", {
        document_id: id,
        transaction_id: transaction.id,
      });
    } catch (err) {
      // Show error but still remove from local cache and refetch
      setDeleteError('Delete may have partially failed. Refreshing list...');
    } finally {
      setDeletingId(null);
    }
    // Always remove from cache and force fresh fetch, regardless of error
    queryClient.setQueryData(["tx-documents", transaction.id], (old) =>
      Array.isArray(old) ? old.filter(d => d.id !== id) : old
    );
    await queryClient.invalidateQueries({ queryKey: ["tx-documents", transaction.id] });
    await queryClient.refetchQueries({ queryKey: ["tx-documents", transaction.id] });
  };

  const handleDedupeCleanup = async () => {
    // Group by file_name, keep the most recent (by created_date), delete the rest
    const grouped = {};
    for (const doc of documents) {
      if (!grouped[doc.file_name]) grouped[doc.file_name] = [];
      grouped[doc.file_name].push(doc);
    }
    const toDelete = [];
    for (const fileName in grouped) {
      const sorted = grouped[fileName].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      toDelete.push(...sorted.slice(1).map(d => d.id)); // keep index 0 (newest), delete rest
    }
    if (toDelete.length === 0) return;
    for (const id of toDelete) {
      try { await base44.functions.invoke("deleteDocument", { document_id: id, transaction_id: transaction.id }); } catch (_) {}
    }
    // Force fresh fetch
    await queryClient.invalidateQueries({ queryKey: ["tx-documents", transaction.id] });
    await queryClient.refetchQueries({ queryKey: ["tx-documents", transaction.id] });
  };

  // Auto-classify document type from filename
  const classifyDocType = (fileName) => {
    const n = (fileName || "").toLowerCase();
    if (n.includes("purchase") || n.includes("p&s") || n.includes("psa")) return "purchase_and_sale";
    if (n.includes("listing agreement") || n.includes("listing_agreement")) return "listing_agreement";
    if (n.includes("buyer agency") || n.includes("buyer representation") || n.includes("baa")) return "buyer_agency_agreement";
    if (n.includes("addendum")) return "addendum";
    if (n.includes("disclosure")) return "disclosure";
    if (n.includes("inspection")) return "inspection";
    if (n.includes("appraisal")) return "appraisal";
    if (n.includes("title") || n.includes("closing") || n.includes("hud") || n.includes("settlement")) return "title";
    return null; // no match — use user-selected type
  };

  const [uploadError, setUploadError] = useState(null);

  const uploadFile = async (file) => {
    // Client-side duplicate check against current cache
    const isDuplicate = documents.some(d => d.file_name === file.name);
    if (isDuplicate) {
      setUploadError(`"${file.name}" already exists for this transaction. Delete the existing file first, or rename yours before uploading.`);
      return;
    }
    const autoType = classifyDocType(file.name);
    const docType = autoType || selectedDocType;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const response = await base44.functions.invoke('createDocument', {
      brokerage_id: transaction.brokerage_id,
      transaction_id: transaction.id,
      doc_type: docType,
      file_url,
      file_name: file.name,
      uploaded_by: currentUser?.email || "unknown",
      uploaded_by_role: currentUser?.role || "agent",
    });
    // Backend duplicate check — response.data.duplicate means blocked
    if (response.data?.duplicate || response.data?.error) {
      setUploadError(response.data.error || `"${file.name}" already exists.`);
      return;
    }
    const doc = response.data;
    const matchingItem = checklistItems.find(
      (ci) => ci.doc_type === selectedDocType && ci.status === "missing"
    );
    if (matchingItem) {
      await base44.entities.DocumentChecklistItem.update(matchingItem.id, {
        status: "uploaded",
        uploaded_document_id: doc.id,
      });
      queryClient.invalidateQueries({ queryKey: ["checklist", transaction.id] });
    }
    await writeAuditLog({
      brokerageId: transaction.brokerage_id,
      transactionId: transaction.id,
      actorEmail: currentUser?.email,
      action: "doc_uploaded",
      entityType: "document",
      entityId: doc.id,
      description: `${currentUser?.email} uploaded ${file.name} (${docType}${autoType ? " — auto-classified" : ""})`,
    });

    // Auto-trigger compliance scan in the background
    toast.info("Compliance scan started in background…", { icon: "🔍", duration: 3000 });
    base44.functions.invoke('complianceEngine', {
      document_url: file_url,
      file_name: file.name,
      document_id: doc.id,
      transaction_id: transaction.id,
      brokerage_id: transaction.brokerage_id,
      transaction_data: {
        address: transaction.address,
        transaction_type: transaction.transaction_type,
        is_cash_transaction: transaction.is_cash_transaction,
        sale_price: transaction.sale_price,
        agent_email: transaction.agent_email,
        phase: transaction.phase,
        inspection_deadline: transaction.inspection_deadline,
        appraisal_deadline: transaction.appraisal_deadline,
        financing_deadline: transaction.financing_deadline,
        earnest_money_deadline: transaction.earnest_money_deadline,
        due_diligence_deadline: transaction.due_diligence_deadline,
        closing_date: transaction.closing_date,
        ctc_target: transaction.ctc_target,
      }
    }).then((res) => {
      queryClient.invalidateQueries({ queryKey: ["compliance-reports", transaction.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      if (res?.data?.blockers_count > 0) {
        toast.error(`Compliance scan found ${res.data.blockers_count} blocker(s) — check Compliance tab`, { duration: 6000 });
      } else if (res?.data?.status === "compliant") {
        toast.success("Document passed compliance check", { icon: "✅", duration: 4000 });
      }
    }).catch(() => {});
  };

  const handleUpload = async (e) => {
    if (uploading) return; // upload lock
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError(null);
    setUploading(true);
    for (const file of files) await uploadFile(file);
    await queryClient.invalidateQueries({ queryKey: ["tx-documents", transaction.id] });
    await queryClient.refetchQueries({ queryKey: ["tx-documents", transaction.id] });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return; // upload lock
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    setUploadError(null);
    setUploading(true);
    for (const file of files) await uploadFile(file);
    await queryClient.invalidateQueries({ queryKey: ["tx-documents", transaction.id] });
    await queryClient.refetchQueries({ queryKey: ["tx-documents", transaction.id] });
    setUploading(false);
  };

  const canDelete = currentUser?.email === "nhcazateam@gmail.com" || ["tc", "tc_lead", "admin", "owner"].includes(currentUser?.role);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (filteredDocs) => {
    if (selectedIds.size === filteredDocs.length && filteredDocs.every(d => selectedIds.has(d.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selectedIds];
    for (const id of ids) {
      try {
        await base44.functions.invoke("deleteDocument", { document_id: id, transaction_id: transaction.id });
      } catch (_) {}
    }
    const deleteSet = new Set(ids);
    queryClient.setQueryData(["tx-documents", transaction.id], (old) =>
      Array.isArray(old) ? old.filter(d => !deleteSet.has(d.id)) : old
    );
    setSelectedIds(new Set());
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
    await queryClient.invalidateQueries({ queryKey: ["tx-documents", transaction.id] });
    await queryClient.refetchQueries({ queryKey: ["tx-documents", transaction.id] });
  };

  const getFileIcon = (fileName) => {
    const ext = (fileName || "").split(".").pop().toLowerCase();
    const colors = { pdf: "text-red-500", docx: "text-blue-600", doc: "text-blue-600", xlsx: "text-green-600", xls: "text-green-600", png: "text-purple-500", jpg: "text-purple-500", jpeg: "text-purple-500" };
    return colors[ext] || "text-gray-400";
  };

  return (
    <div className="space-y-5">
      {generateModalOpen && (
        <GenerateDocumentModal
          transaction={transaction}
          onClose={() => setGenerateModalOpen(false)}
          onGenerated={() => {
            queryClient.invalidateQueries({ queryKey: ["tx-documents", transaction.id] });
            setGenerateModalOpen(false);
          }}
        />
      )}
      <DocumentViewerModal
        doc={viewingDoc}
        onClose={() => setViewingDoc(null)}
        onAttachToEmail={(doc) => { setViewingDoc(null); setEmailModal({ open: true, preselectedDoc: doc }); }}
      />
      <EmailComposerModal
        open={emailModal.open}
        onClose={() => setEmailModal({ open: false, preselectedDoc: null })}
        transaction={transaction}
        documents={documents}
        preselectedDocId={emailModal.preselectedDoc?.id}
      />
      <ConfirmDialog
        open={!!confirmDeleteDoc}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => { const id = confirmDeleteDoc; setConfirmDeleteDoc(null); handleDeleteDocument(id); }}
        onCancel={() => setConfirmDeleteDoc(null)}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedIds.size} Document${selectedIds.size !== 1 ? "s" : ""}`}
        message={`Are you sure you want to delete ${selectedIds.size} selected document${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`}
        confirmText={bulkDeleting ? "Deleting..." : "Delete All"}
        cancelText="Cancel"
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
      {deleteError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{deleteError}</span>
          <button className="ml-auto text-red-400 hover:text-red-600 text-xs underline" onClick={() => setDeleteError(null)}>Dismiss</button>
        </div>
      )}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{uploadError}</span>
          <button className="ml-auto text-amber-500 hover:text-amber-700 text-xs underline" onClick={() => setUploadError(null)}>Dismiss</button>
        </div>
      )}
      {/* Create Document from Template + Dedupe */}
      <div className="flex justify-end gap-2">
        {(() => {
          const seen = new Set();
          const hasDupes = documents.some(d => {
            if (seen.has(d.file_name)) return true;
            seen.add(d.file_name);
            return false;
          });
          return hasDupes ? (
            <Button
              onClick={handleDedupeCleanup}
              variant="outline"
              size="sm"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Layers className="w-4 h-4" /> Remove Duplicates
            </Button>
          ) : null;
        })()}
        <Button
          onClick={() => setGenerateModalOpen(true)}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          size="sm"
        >
          <FilePlus className="w-4 h-4" /> Create Document
        </Button>
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" /> Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
                dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}
            >
              <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />
              <p className="text-sm text-gray-400">Drag & drop files here, or <span className="text-blue-500">browse</span></p>
              <p className="text-xs text-gray-300 mt-0.5">Supports multiple files</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {checklistItems.length > 0 && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-500" /> Document Checklist
              </CardTitle>
              <span className="text-xs text-gray-400">
                {checklistItems.filter((i) => i.status === "approved").length}/{checklistItems.length} approved
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <DocChecklistPanel
              items={checklistItems}
              currentUser={currentUser}
              transactionId={transaction.id}
              brokerageId={transaction.brokerage_id}
            />
          </CardContent>
        </Card>
      )}

      {transaction.property_type && (
        <SuggestedDocuments
          propertyType={transaction.property_type}
          uploadedFileNames={documents.map(d => d.file_name)}
        />
      )}

      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-gray-500" /> Uploaded Files
              {documents.length > 0 && (
                <Badge variant="outline" className="text-xs">{documents.length}</Badge>
              )}
            </CardTitle>
            {documents.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-7 text-xs w-44">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {DOC_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-9 h-9 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No documents uploaded yet.</p>
            </div>
          ) : (() => {
            const filteredDocs = documents.filter(d => typeFilter === "all" || d.doc_type === typeFilter);
            const allSelected = filteredDocs.length > 0 && filteredDocs.every(d => selectedIds.has(d.id));
            return (
              <div className="space-y-2">
                {canDelete && filteredDocs.length > 0 && (
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <button
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => toggleSelectAll(filteredDocs)}
                    >
                      {allSelected
                        ? <CheckSquare className="w-4 h-4 text-blue-500" />
                        : <Square className="w-4 h-4" />}
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                    {selectedIds.size > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 gap-1.5 text-xs"
                        disabled={bulkDeleting}
                        onClick={() => setConfirmBulkDelete(true)}
                      >
                        {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Delete {selectedIds.size} selected
                      </Button>
                    )}
                  </div>
                )}
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors bg-white ${selectedIds.has(doc.id) ? "border-red-200 bg-red-50/30" : "border-gray-100 hover:border-gray-200"}`}>
                    {canDelete && (
                      <button onClick={() => toggleSelect(doc.id)} className="flex-shrink-0">
                        {selectedIds.has(doc.id)
                          ? <CheckSquare className="w-4 h-4 text-blue-500" />
                          : <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />}
                      </button>
                    )}
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <FileText className={`w-4 h-4 ${getFileIcon(doc.file_name)}`} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingDoc(doc)}>
                      <p className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">{doc.file_name || "Document"}</p>
                      <p className="text-xs text-gray-400">
                        {doc.uploaded_by || "unknown"}
                        {doc.created_date ? ` · ${format(new Date(doc.created_date), "MMM d, yyyy h:mm a")}` : ""}
                        {" · "}
                        <span
                          className="font-mono text-[10px] opacity-50 cursor-help"
                          title={`Document ID: ${doc.id}\nUploaded: ${doc.created_date ? new Date(doc.created_date).toLocaleString() : "unknown"}`}
                        >
                          #{doc.id?.slice(-6)}
                        </span>
                      </p>
                    </div>
                    <Badge className={`text-xs hidden sm:inline-flex ${TYPE_COLORS[doc.doc_type] || TYPE_COLORS.other}`}>
                      {DOC_LABELS[doc.doc_type] || doc.doc_type}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700" title="Preview"
                        onClick={() => setViewingDoc(doc)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700" title="Download">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:text-indigo-700" title="Attach to Email"
                        onClick={() => setEmailModal({ open: true, preselectedDoc: doc })}>
                        <Mail className="w-4 h-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                          disabled={deletingId === doc.id}
                          onClick={() => setConfirmDeleteDoc(doc.id)}
                        >
                          {deletingId === doc.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredDocs.length === 0 && typeFilter !== "all" && (
                  <p className="text-sm text-center text-gray-400 py-4">No documents of this type.</p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
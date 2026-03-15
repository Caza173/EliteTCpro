import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Trash2, Download, Loader2, FolderOpen, ClipboardCheck, Scan } from "lucide-react";
import { format } from "date-fns";
import { writeAuditLog } from "../utils/tenantUtils";
import DocChecklistPanel from "./DocChecklistPanel";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SuggestedDocuments from "./SuggestedDocuments";

const DOC_TYPES = [
  { value: "purchase_and_sale", label: "Purchase & Sale Agreement" },
  { value: "listing_agreement", label: "Listing Agreement" },
  { value: "addendum", label: "Addendum" },
  { value: "buyer_agency_agreement", label: "Buyer Agency Agreement" },
  { value: "other", label: "Other" },
];

const DOC_LABELS = {
  purchase_and_sale: "Purchase & Sale",
  listing_agreement: "Listing Agreement",
  addendum: "Addendum",
  buyer_agency_agreement: "Buyer Agency Agreement",
  other: "Other",
};

const TYPE_COLORS = {
  purchase_and_sale: "bg-blue-50 text-blue-700",
  listing_agreement: "bg-emerald-50 text-emerald-700",
  addendum: "bg-amber-50 text-amber-700",
  buyer_agency_agreement: "bg-purple-50 text-purple-700",
  other: "bg-gray-50 text-gray-600",
};

export default function TransactionDocumentsTab({ transaction, currentUser }) {
  const queryClient = useQueryClient();
  const [selectedDocType, setSelectedDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);
  const fileInputRef = useRef(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["tx-documents", transaction.id],
    queryFn: () => base44.entities.Document.filter({ transaction_id: transaction.id }, "-created_date"),
    enabled: !!transaction.id,
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ["checklist", transaction.id],
    queryFn: () => base44.entities.DocumentChecklistItem.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.functions.invoke('deleteDocument', { document_id: id });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tx-documents", transaction.id] });
      const prev = queryClient.getQueryData(["tx-documents", transaction.id]);
      queryClient.setQueryData(["tx-documents", transaction.id], (old = []) => old.filter((d) => d.id !== id));
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(["tx-documents", transaction.id], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tx-documents", transaction.id] }),
  });

  const uploadFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const response = await base44.functions.invoke('createDocument', {
      brokerage_id: transaction.brokerage_id,
      transaction_id: transaction.id,
      doc_type: selectedDocType,
      file_url,
      file_name: file.name,
      uploaded_by: currentUser?.email || "unknown",
      uploaded_by_role: currentUser?.role || "agent",
    });
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
      description: `${currentUser?.email} uploaded ${file.name} (${selectedDocType})`,
    });

    // Auto-trigger compliance scan in the background
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
      }
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["compliance-reports", transaction.id] });
    }).catch(() => {});
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) await uploadFile(file);
    queryClient.invalidateQueries({ queryKey: ["tx-documents", transaction.id] });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) await uploadFile(file);
    queryClient.invalidateQueries({ queryKey: ["tx-documents", transaction.id] });
    setUploading(false);
  };

  const canDelete = ["tc", "tc_lead", "admin", "owner"].includes(currentUser?.role);

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={!!confirmDeleteDoc}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => deleteMutation.mutate(confirmDeleteDoc)}
        onCancel={() => setConfirmDeleteDoc(null)}
      />
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
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gray-500" /> Uploaded Files
            {documents.length > 0 && (
              <Badge variant="outline" className="text-xs">{documents.length}</Badge>
            )}
          </CardTitle>
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
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-white transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name || "Document"}</p>
                    <p className="text-xs text-gray-400">
                      {doc.uploaded_by || "unknown"}
                      {doc.created_date ? ` · ${format(new Date(doc.created_date), "MMM d, yyyy")}` : ""}
                    </p>
                  </div>
                  <Badge className={`text-xs hidden sm:inline-flex ${TYPE_COLORS[doc.doc_type] || TYPE_COLORS.other}`}>
                    {DOC_LABELS[doc.doc_type] || doc.doc_type}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    {canDelete && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600"
                        onClick={() => setConfirmDeleteDoc(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
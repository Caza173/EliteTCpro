import React, { useState, useRef } from "react";
import { documentsApi } from "@/api/documents";
import { checklistItemsApi } from "@/api/checklistItems";
import { transactionsApi } from "@/api/transactions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Trash2, Download, Loader2, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import { writeAuditLog, createNotification } from "../components/utils/tenantUtils";

const DOC_TYPES = ["contract", "disclosures", "inspection", "appraisal", "title", "lender", "closing", "other"];

const typeColors = {
  contract: "bg-blue-50 text-blue-700",
  disclosures: "bg-purple-50 text-purple-700",
  inspection: "bg-orange-50 text-orange-700",
  appraisal: "bg-cyan-50 text-cyan-700",
  title: "bg-emerald-50 text-emerald-700",
  lender: "bg-indigo-50 text-indigo-700",
  closing: "bg-rose-50 text-rose-700",
  other: "bg-gray-50 text-gray-600",
};

export default function Documents() {
  const { data: currentUser } = useCurrentUser();
  const [selectedTxId, setSelectedTxId] = useState("all");
  const [selectedDocType, setSelectedDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => transactionsApi.list(),
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentsApi.list(),
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ["allChecklist"],
    queryFn: () => checklistItemsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => documentsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTxId || selectedTxId === "all") {
      alert("Please select a transaction first.");
      return;
    }
    setUploading(true);

    try {
      const doc = await documentsApi.upload(file, {
        transaction_id: selectedTxId,
        doc_type: selectedDocType,
        file_name: file.name,
        uploaded_by: currentUser?.email || "unknown",
        uploaded_by_role: currentUser?.role || "agent",
      });

      const matchingItem = checklistItems.find(
        (ci) => ci.transaction_id === selectedTxId && ci.doc_type === selectedDocType && ci.status === "missing"
      );
      if (matchingItem) {
        await checklistItemsApi.update(matchingItem.id, {
          status: "uploaded",
          uploaded_document_id: doc.id,
        });
        queryClient.invalidateQueries({ queryKey: ["checklist"] });
        queryClient.invalidateQueries({ queryKey: ["allChecklist"] });
      }

      await writeAuditLog({
        brokerageId: currentUser?.brokerage_id,
        transactionId: selectedTxId,
        actorEmail: currentUser?.email,
        action: "doc_uploaded",
        entityType: "document",
        entityId: doc.id,
        description: `${currentUser?.email} uploaded ${file.name} (${selectedDocType})`,
      });

      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = selectedTxId === "all"
    ? documents
    : documents.filter((d) => d.transaction_id === selectedTxId);

  const getAddress = (txId) => transactions.find((t) => t.id === txId)?.address || txId;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{documents.length} total documents</p>
        </div>
      </div>

      {/* Upload Card */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedTxId} onValueChange={setSelectedTxId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select transaction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">— Select Transaction —</SelectItem>
                {transactions.map((tx) => (
                  <SelectItem key={tx.id} value={tx.id}>{tx.address}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDocType} onValueChange={setSelectedDocType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || selectedTxId === "all"}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={selectedTxId} onValueChange={setSelectedTxId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by transaction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            {transactions.map((tx) => (
              <SelectItem key={tx.id} value={tx.id}>{tx.address}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card className="shadow-sm border-gray-100">
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-white">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name || "Document"}</p>
                    <p className="text-xs text-gray-400 truncate">{getAddress(doc.transaction_id)}</p>
                  </div>
                  <Badge className={`text-xs capitalize hidden sm:inline-flex ${typeColors[doc.doc_type] || typeColors.other}`}>
                    {doc.doc_type}
                  </Badge>
                  <span className="text-xs text-gray-400 hidden md:block">
                    {doc.created_date ? format(new Date(doc.created_date), "MMM d") : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    {(currentUser?.role === "tc" || currentUser?.role === "admin" || currentUser?.role === "owner") && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600"
                        onClick={() => deleteMutation.mutate(doc.id)}
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
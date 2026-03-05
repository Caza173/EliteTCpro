import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Upload, Loader2, FileText, Download, CheckCircle2, Circle } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import TransactionTimeline from "../components/transactions/TransactionTimeline";
import DeadlinePanel from "../components/transactions/DeadlinePanel";

const PHASES = [
  "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
  "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
  "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing"
];

export default function ClientPortal() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [docType, setDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-created_date"),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date"),
  });

  // Filter to transactions where client_email matches current user
  const myTransactions = transactions.filter(
    (tx) => tx.client_email === currentUser?.email || tx.agent_email === currentUser?.email
  );

  const myDocs = documents.filter((d) =>
    myTransactions.some((tx) => tx.id === d.transaction_id)
  );

  const handleFileUpload = async (txId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Document.create({
      transaction_id: txId,
      doc_type: docType,
      file_url,
      file_name: file.name,
      uploaded_by: currentUser?.email || "client",
      uploaded_by_role: "client",
    });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    setUploading(false);
  };

  if (userLoading || txLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (myTransactions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Transaction Found</h2>
        <p className="text-gray-400 text-sm">Your transaction will appear here once your TC sets it up.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Transaction</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your real estate transaction progress.</p>
      </div>

      {myTransactions.map((tx) => {
        const txDocs = myDocs.filter((d) => d.transaction_id === tx.id);
        return (
          <div key={tx.id} className="space-y-4">
            {/* Summary */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{tx.address}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize bg-emerald-50 text-emerald-700 border-emerald-200">
                        {tx.status || "active"}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50 border-blue-200">
                        {PHASES[(tx.phase || 1) - 1]}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-xs text-gray-400">Buyer</p><p className="font-medium">{tx.buyer}</p></div>
                  <div><p className="text-xs text-gray-400">Seller</p><p className="font-medium">{tx.seller}</p></div>
                  <div><p className="text-xs text-gray-400">Contract Date</p><p className="font-medium">{tx.contract_date ? format(new Date(tx.contract_date), "MMM d, yyyy") : "—"}</p></div>
                  <div><p className="text-xs text-gray-400">Closing Date</p><p className="font-medium">{tx.closing_date ? format(new Date(tx.closing_date), "MMM d, yyyy") : "—"}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Progress Timeline</CardTitle></CardHeader>
              <CardContent>
                <TransactionTimeline phasesCompleted={tx.phases_completed || []} currentPhase={tx.phase || 1} />
              </CardContent>
            </Card>

            {/* Deadlines */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Key Deadlines</CardTitle></CardHeader>
              <CardContent>
                <DeadlinePanel transactions={[tx]} />
              </CardContent>
            </Card>

            {/* Tasks (read-only) */}
            {(tx.tasks || []).length > 0 && (
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Transaction Tasks</CardTitle>
                  <p className="text-xs text-gray-400">{(tx.tasks || []).filter((t) => t.completed).length} / {(tx.tasks || []).length} completed</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {(tx.tasks || []).slice(0, 10).map((task) => (
                      <div key={task.id} className="flex items-center gap-2.5 py-1.5">
                        {task.completed
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                        <span className={`text-sm ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                          {task.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Documents</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["contract","disclosures","inspection","appraisal","title","lender","closing","other"].map((t) => (
                          <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(tx.id, e)} />
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                      Upload
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {txDocs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No documents yet.</p>
                ) : (
                  <div className="space-y-2">
                    {txDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 truncate">{doc.file_name || "Document"}</span>
                        <Badge className="text-[10px] capitalize bg-white border">{doc.doc_type}</Badge>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
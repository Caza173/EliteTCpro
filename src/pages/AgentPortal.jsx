import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Upload, Loader2, FileText, Download, CheckCircle2,
  Circle, Calendar, User, Users, Clock
} from "lucide-react";
import { format, differenceInDays, isPast, parseISO, isValid } from "date-fns";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import TransactionTimeline from "../components/transactions/TransactionTimeline";
import DeadlinePanel from "../components/transactions/DeadlinePanel";

const PHASES = [
  "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
  "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
  "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing"
];

const DEADLINE_FIELDS = [
  { field: "earnest_money_deadline", label: "Earnest Money" },
  { field: "inspection_deadline", label: "Inspection" },
  { field: "due_diligence_deadline", label: "Due Diligence" },
  { field: "financing_deadline", label: "Financing" },
  { field: "appraisal_deadline", label: "Appraisal" },
  { field: "closing_date", label: "Closing" },
];

function DeadlineItem({ label, dateStr }) {
  if (!dateStr) return null;
  let date;
  try { date = parseISO(dateStr); if (!isValid(date)) return null; } catch { return null; }
  const days = differenceInDays(date, new Date());
  const overdue = isPast(date) && days < 0;
  const urgent = !overdue && days <= 3;
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${overdue ? "bg-red-50 border border-red-100" : urgent ? "bg-amber-50 border border-amber-100" : "bg-gray-50 border border-gray-100"}`}>
      <div className="flex items-center gap-2">
        <Clock className={`w-3.5 h-3.5 ${overdue ? "text-red-500" : urgent ? "text-amber-500" : "text-gray-400"}`} />
        <span className={overdue ? "text-red-700 font-medium" : urgent ? "text-amber-700 font-medium" : "text-gray-700"}>{label}</span>
      </div>
      <span className={`font-semibold text-xs ${overdue ? "text-red-600" : urgent ? "text-amber-600" : "text-gray-600"}`}>
        {format(date, "MMM d, yyyy")}
        {overdue ? " · Overdue" : days === 0 ? " · Today" : days === 1 ? " · Tomorrow" : ` · ${days}d`}
      </span>
    </div>
  );
}

export default function AgentPortal() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [docType, setDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const [activeUploadTxId, setActiveUploadTxId] = useState(null);
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

  // Show transactions where this user is the agent
  const myTransactions = transactions.filter(
    (tx) => tx.agent_email === currentUser?.email || tx.created_by === currentUser?.email
  );

  const handleFileUpload = async (txId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setActiveUploadTxId(txId);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Document.create({
      transaction_id: txId,
      doc_type: docType,
      file_url,
      file_name: file.name,
      uploaded_by: currentUser?.email || "agent",
      uploaded_by_role: "agent",
    });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    setUploading(false);
    setActiveUploadTxId(null);
    e.target.value = "";
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
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Transactions Found</h2>
        <p className="text-gray-400 text-sm">Your transactions will appear here once your TC assigns them to your email.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Transactions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your deals, view deadlines, and upload documents.</p>
      </div>

      {myTransactions.map((tx) => {
        const txDocs = documents.filter((d) => d.transaction_id === tx.id);
        const completedTasks = (tx.tasks || []).filter((t) => t.completed).length;
        const totalTasks = (tx.tasks || []).length;

        return (
          <div key={tx.id} className="space-y-4">
            {/* Summary */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tx.address}</CardTitle>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize bg-emerald-50 text-emerald-700 border-emerald-200">
                          {tx.status || "active"}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Phase {tx.phase || 1}: {PHASES[(tx.phase || 1) - 1]}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize bg-gray-50 text-gray-600 border-gray-200">
                          {tx.transaction_type || "buyer"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {totalTasks > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Tasks</p>
                      <p className="text-sm font-semibold text-gray-700">{completedTasks}/{totalTasks}</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-xs text-gray-400 mb-0.5">Buyer</p><p className="font-medium text-gray-800">{tx.buyer || "—"}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Seller</p><p className="font-medium text-gray-800">{tx.seller || "—"}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Contract Date</p><p className="font-medium text-gray-800">{tx.contract_date ? format(new Date(tx.contract_date), "MMM d, yyyy") : "—"}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Closing Date</p><p className="font-medium text-gray-800">{tx.closing_date ? format(new Date(tx.closing_date), "MMM d, yyyy") : "—"}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Progress Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionTimeline phasesCompleted={tx.phases_completed || []} currentPhase={tx.phase || 1} />
              </CardContent>
            </Card>

            {/* Deadlines */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Key Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {DEADLINE_FIELDS.map(({ field, label }) => (
                    <DeadlineItem key={field} label={label} dateStr={tx[field]} />
                  ))}
                  {DEADLINE_FIELDS.every(({ field }) => !tx[field]) && (
                    <p className="text-sm text-gray-400 text-center py-4">No deadlines set.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tasks (read-only) */}
            {totalTasks > 0 && (
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Transaction Tasks</CardTitle>
                  <p className="text-xs text-gray-400">{completedTasks} / {totalTasks} completed</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {(tx.tasks || []).map((task) => (
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

            {/* Documents + Upload */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base font-semibold">Documents</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["addendum", "contract", "disclosures", "inspection", "appraisal", "title", "lender", "closing", "other"].map((t) => (
                          <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => handleFileUpload(tx.id, e)}
                    />
                    <Button
                      size="sm"
                      onClick={() => { setActiveUploadTxId(tx.id); fileInputRef.current?.click(); }}
                      disabled={uploading && activeUploadTxId === tx.id}
                      className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                    >
                      {uploading && activeUploadTxId === tx.id
                        ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        : <Upload className="w-3 h-3 mr-1" />}
                      Upload
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {txDocs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No documents yet. Upload addendums or supporting documents above.</p>
                ) : (
                  <div className="space-y-2">
                    {txDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 truncate">{doc.file_name || "Document"}</span>
                        <Badge className="text-[10px] capitalize bg-white border">{doc.doc_type}</Badge>
                        <Badge className={`text-[10px] ${doc.uploaded_by_role === "agent" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-500 border"}`}>
                          {doc.uploaded_by_role || "tc"}
                        </Badge>
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
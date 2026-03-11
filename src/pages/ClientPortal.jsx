import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, FileText, Download, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
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

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-created_date"),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date"),
  });

  // Only show transactions where client_email matches current user
  const myTransactions = transactions.filter(
    (tx) => tx.client_email === currentUser?.email
  );

  const myDocs = documents.filter((d) =>
    myTransactions.some((tx) => tx.id === d.transaction_id)
  );

  // Mock data for preview when no real transactions exist
  const MOCK_TRANSACTION = {
    id: "mock-1",
    address: "42 Birchwood Lane, Concord, NH 03301",
    buyer: "Sarah & James Mitchell",
    seller: "Robert & Carol Hayes",
    contract_date: "2026-02-15",
    closing_date: "2026-04-01",
    status: "active",
    phase: 6,
    phases_completed: [1, 2, 3, 4, 5],
    inspection_deadline: "2026-03-15",
    financing_deadline: "2026-03-20",
    appraisal_deadline: "2026-03-22",
    tasks: [
      { id: "t1", name: "Sign Purchase & Sale Agreement", completed: true },
      { id: "t2", name: "Submit Earnest Money Deposit", completed: true },
      { id: "t3", name: "Schedule Home Inspection", completed: true },
      { id: "t4", name: "Review Inspection Report", completed: false },
      { id: "t5", name: "Apply for Mortgage", completed: false },
      { id: "t6", name: "Order Appraisal", completed: false },
    ],
  };
  const MOCK_DOCS = [
    { id: "d1", transaction_id: "mock-1", file_name: "Purchase & Sale Agreement.pdf", doc_type: "contract", file_url: "#", uploaded_by: "tc@brokerage.com", created_date: "2026-02-15" },
    { id: "d2", transaction_id: "mock-1", file_name: "Property Disclosures.pdf", doc_type: "disclosures", file_url: "#", uploaded_by: "tc@brokerage.com", created_date: "2026-02-18" },
  ];

  const displayTransactions = myTransactions.length > 0 ? myTransactions : [MOCK_TRANSACTION];
  const displayDocs = myTransactions.length > 0 ? myDocs : MOCK_DOCS;
  const isMock = myTransactions.length === 0;

  if (userLoading || txLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Transaction</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your real estate transaction progress.</p>
        {isMock && (
          <div className="mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 inline-block">
            Preview mode — showing sample data
          </div>
        )}
      </div>

      {displayTransactions.map((tx) => {
        const txDocs = displayDocs.filter((d) => d.transaction_id === tx.id);
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

            {/* Documents (read-only for clients) */}
            {txDocs.length > 0 && (
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Documents</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}
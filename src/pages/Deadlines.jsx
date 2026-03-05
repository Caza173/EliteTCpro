import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DeadlinePanel from "../components/transactions/DeadlinePanel";

export default function Deadlines() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-created_date"),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Upcoming Deadlines</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track inspection, appraisal, and closing deadlines across all active transactions.
        </p>
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold">All Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded" />
              ))}
            </div>
          ) : (
            <DeadlinePanel transactions={transactions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import DashboardStats from "../components/dashboard/DashboardStats";
import TransactionTable from "../components/transactions/TransactionTable";
import DeadlinePanel from "../components/transactions/DeadlinePanel";

export default function Dashboard() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-created_date"),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your real estate transactions</p>
        </div>
        <Link to={createPageUrl("AddTransaction")}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <DashboardStats transactions={transactions} />
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="xl:col-span-2 shadow-sm border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            <Link to={createPageUrl("Transactions")}>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {isLoading ? (
              <div className="space-y-3 px-6 pb-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded" />
                ))}
              </div>
            ) : (
              <TransactionTable transactions={transactions.slice(0, 5)} />
            )}
          </CardContent>
        </Card>

        {/* Deadlines */}
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Deadlines</CardTitle>
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
    </div>
  );
}
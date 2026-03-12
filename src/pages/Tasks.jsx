import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";
import TaskList from "../components/transactions/TaskList";
import { useCurrentUser, isOwnerOrAdmin } from "../components/auth/useCurrentUser";

export default function Tasks() {
  const [selectedTxId, setSelectedTxId] = useState("all");
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () => {
      if (!currentUser) return [];
      if (isOwnerOrAdmin(currentUser)) return base44.entities.Transaction.list("-created_date");
      return base44.entities.Transaction.filter({ agent_email: currentUser.email }, "-created_date");
    },
    enabled: !!currentUser,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const prev = queryClient.getQueryData(["transactions", currentUser?.email, currentUser?.role]);
      queryClient.setQueryData(["transactions", currentUser?.email, currentUser?.role], (old = []) =>
        old.map((tx) => tx.id === id ? { ...tx, ...data } : tx)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["transactions", currentUser?.email, currentUser?.role], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const activeTransactions = transactions.filter((t) => t.status !== "cancelled");

  const handleToggleTask = (txId, taskId) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;
    const updatedTasks = (tx.tasks || []).map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    updateMutation.mutate({ id: txId, data: { tasks: updatedTasks } });
  };

  // Aggregate tasks from selected or all transactions
  const displayData = selectedTxId === "all"
    ? activeTransactions
    : activeTransactions.filter((t) => t.id === selectedTxId);

  const totalTasks = displayData.reduce((sum, tx) => sum + (tx.tasks?.length || 0), 0);
  const completedTasks = displayData.reduce((sum, tx) => sum + (tx.tasks?.filter((t) => t.completed).length || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </div>
        <Select value={selectedTxId} onValueChange={setSelectedTxId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by transaction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            {activeTransactions.map((tx) => (
              <SelectItem key={tx.id} value={tx.id}>{tx.address}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : displayData.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No transactions with tasks found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayData.map((tx) => (
            <Card key={tx.id} className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-800">{tx.address}</CardTitle>
                <p className="text-xs text-gray-400">
                  {(tx.tasks || []).filter((t) => t.completed).length} / {(tx.tasks || []).length} completed
                </p>
              </CardHeader>
              <CardContent>
                <TaskList
                  tasks={tx.tasks || []}
                  onToggleTask={(taskId) => handleToggleTask(tx.id, taskId)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
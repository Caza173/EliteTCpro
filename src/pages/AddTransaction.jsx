import React from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TransactionForm from "../components/transactions/TransactionForm";
import { generateDeadlines } from "../components/transactions/deadlineUtils";
import { generateDefaultTasks } from "../components/transactions/defaultTasks";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import { generateTasksFromTemplate, generateDeadlinesFromTemplate, buildChecklistItems, writeAuditLog } from "../components/utils/tenantUtils";

export default function AddTransaction() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", currentUser?.brokerage_id],
    queryFn: () => base44.entities.WorkflowTemplate.filter({ brokerage_id: currentUser?.brokerage_id }),
    enabled: !!currentUser?.brokerage_id,
  });

  const defaultTemplate = templates.find((t) => t.is_default) || templates[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      navigate(createPageUrl("Transactions"));
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Create New Transaction</CardTitle>
          <p className="text-sm text-gray-500">Fill in the details to add a new real estate transaction.</p>
        </CardHeader>
        <CardContent>
          <TransactionForm
            onSubmit={(data) => {
              const deadlines = data.contract_date ? generateDeadlines(data.contract_date, data.closing_date) : {};
              const tasks = generateDefaultTasks();
              createMutation.mutate({ ...data, ...deadlines, tasks });
            }}
            isSubmitting={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
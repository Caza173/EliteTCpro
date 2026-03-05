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
    mutationFn: async (data) => {
      const tx = await base44.entities.Transaction.create(data);
      // Generate doc checklist from template
      if (defaultTemplate) {
        const checklistData = buildChecklistItems(defaultTemplate, tx.id, currentUser?.brokerage_id);
        if (checklistData.length > 0) {
          await base44.entities.DocumentChecklistItem.bulkCreate(checklistData);
        }
      }
      await writeAuditLog({
        brokerageId: currentUser?.brokerage_id,
        transactionId: tx.id,
        actorEmail: currentUser?.email,
        action: "transaction_created",
        entityType: "transaction",
        entityId: tx.id,
        description: `New transaction created: ${tx.address}`,
      });
      return tx;
    },
    onSuccess: (tx) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["allChecklist"] });
      navigate(createPageUrl(`TransactionDetail?id=${tx.id}`));
    },
  });

  const handleSubmit = (data) => {
    let tasks, deadlines;
    if (defaultTemplate) {
      tasks = generateTasksFromTemplate(defaultTemplate, data.contract_date, data.closing_date);
      deadlines = generateDeadlinesFromTemplate(defaultTemplate, data.contract_date, data.closing_date);
    } else {
      tasks = generateDefaultTasks();
      deadlines = data.contract_date ? generateDeadlines(data.contract_date, data.closing_date) : {};
    }
    createMutation.mutate({
      ...data,
      brokerage_id: currentUser?.brokerage_id,
      template_id: defaultTemplate?.id,
      phase: 1,
      phases_completed: [],
      status: "active",
      health_score: 100,
      risk_level: "on_track",
      last_activity_at: new Date().toISOString(),
      ...deadlines,
      tasks,
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Create New Transaction</CardTitle>
          <p className="text-sm text-gray-500">
            Fill in the details to add a new real estate transaction.
            {defaultTemplate && <span className="text-blue-500 ml-1">Using template: {defaultTemplate.name}</span>}
          </p>
        </CardHeader>
        <CardContent>
          <TransactionForm
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
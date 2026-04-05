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

  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerages"],
    queryFn: async () => {
      try {
        return await base44.entities.Brokerage.list();
      } catch (err) {
        console.error("Error fetching brokerages:", err);
        return [];
      }
    },
    retry: false,
  });

  const brokerageId = currentUser?.data?.brokerage_id || brokerages[0]?.id;

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", brokerageId],
    queryFn: async () => {
      try {
        return await base44.entities.WorkflowTemplate.filter({ brokerage_id: brokerageId });
      } catch (err) {
        console.error("Error fetching templates:", err);
        return [];
      }
    },
    enabled: !!brokerageId,
  });

  const defaultTemplate = templates.find((t) => t.is_default) || templates[0];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('createTransaction', data);
      const tx = res.data;
      // Generate doc checklist from template
      if (defaultTemplate) {
        const checklistData = buildChecklistItems(defaultTemplate, tx.id, brokerageId);
        if (checklistData.length > 0) {
          await base44.entities.DocumentChecklistItem.bulkCreate(checklistData);
        }
      }
      await writeAuditLog({
        brokerageId: brokerageId,
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
    let tasks;
    // Use deadlines from the form (auto-filled from P&S or manually entered)
    // Only fall back to template/default generator if no dates set at all
    const hasManualDeadlines = data.inspection_deadline || data.closing_date || data.earnest_money_deadline;
    let templateDeadlines = {};
    if (defaultTemplate) {
      tasks = generateTasksFromTemplate(defaultTemplate, data.contract_date, data.closing_date);
      if (!hasManualDeadlines) {
        templateDeadlines = generateDeadlinesFromTemplate(defaultTemplate, data.contract_date, data.closing_date);
      }
    } else {
      tasks = generateDefaultTasks();
      if (!hasManualDeadlines && data.contract_date) {
        templateDeadlines = generateDeadlines(data.contract_date, data.closing_date);
      }
    }
    createMutation.mutate({
      ...templateDeadlines,
      ...data,
      brokerage_id: brokerageId,
      template_id: defaultTemplate?.id,
      phase: 1,
      phases_completed: [],
      status: "active",
      health_score: 100,
      risk_level: "on_track",
      last_activity_at: new Date().toISOString(),
      tasks,
      // Normalize transaction_type for new workflow system
      transaction_type: data.transaction_type || "buyer_under_contract",
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
import { base44 } from "@/api/base44Client";
import { addDays, format } from "date-fns";

// Compute health score for a transaction
export function computeHealthScore(tx, checklistItems = []) {
  let score = 100;
  const today = new Date();

  const overdueTasks = (tx.tasks || []).filter(
    (t) => !t.completed && t.required && t.due_date && new Date(t.due_date) < today
  );
  score -= overdueTasks.length * 20;

  const missingRequiredDocs = checklistItems.filter(
    (ci) =>
      ci.transaction_id === tx.id &&
      ci.required &&
      ci.status === "missing" &&
      ci.required_by_phase <= (tx.phase || 1)
  );
  score -= missingRequiredDocs.length * 25;

  const deadlineFields = ["inspection_deadline", "appraisal_deadline", "financing_deadline", "closing_date"];
  deadlineFields.forEach((field) => {
    if (tx[field]) {
      const diffHrs = (new Date(tx[field]) - today) / (1000 * 60 * 60);
      if (diffHrs >= 0 && diffHrs <= 48) score -= 15;
    }
  });

  if (tx.last_activity_at) {
    const daysSince = (today - new Date(tx.last_activity_at)) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) score += 5;
  }

  const clamped = Math.max(0, Math.min(100, score));
  const risk_level = clamped >= 80 ? "on_track" : clamped >= 60 ? "watch" : "at_risk";
  return { health_score: clamped, risk_level };
}

export const RISK_STYLES = {
  on_track: { label: "On Track", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  watch: { label: "Watch", className: "bg-amber-50 text-amber-700 border-amber-200" },
  at_risk: { label: "At Risk", className: "bg-red-50 text-red-700 border-red-200" },
};

export async function writeAuditLog({ brokerageId, transactionId, actorEmail, action, entityType, entityId, before, after, description }) {
  try {
    await base44.entities.AuditLog.create({
      brokerage_id: brokerageId,
      transaction_id: transactionId,
      actor_email: actorEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      before: before || {},
      after: after || {},
      description,
    });
  } catch (_) {}
}

export async function createNotification({ brokerageId, userEmail, transactionId, title, body, type = "system" }) {
  try {
    await base44.entities.InAppNotification.create({
      brokerage_id: brokerageId,
      user_email: userEmail,
      transaction_id: transactionId,
      title,
      body,
      type,
    });
  } catch (_) {}
}

export const PLAN_DETAILS = {
  starter: { label: "Starter", price: "$49/mo", seat_limit: 6, description: "1 TC + 5 Agents" },
  pro: { label: "Pro", price: "$149/mo", seat_limit: 28, description: "3 TC + 25 Agents" },
  team: { label: "Team", price: "$299/mo", seat_limit: 999, description: "Unlimited seats" },
};

export const ROLE_COLORS = {
  owner: "bg-red-50 text-red-700 border-red-200",
  admin: "bg-red-50 text-red-700 border-red-200",
  tc: "bg-purple-50 text-purple-700 border-purple-200",
  agent: "bg-blue-50 text-blue-700 border-blue-200",
  client: "bg-gray-50 text-gray-600 border-gray-200",
};

// Generate tasks from template for a transaction
export function generateTasksFromTemplate(template, contractDate, closingDate) {
  if (!template?.tasks) return [];
  const today = new Date();
  return template.tasks.map((t) => {
    let dueDate = "";
    const anchor = t.due_anchor === "closing_date" && closingDate ? new Date(closingDate) : contractDate ? new Date(contractDate) : null;
    if (anchor) {
      dueDate = format(addDays(anchor, t.due_offset_days || 0), "yyyy-MM-dd");
    }
    return {
      id: `${t.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: t.task_name,
      phase: t.phase_number,
      completed: false,
      assigned_to: t.default_assignee_role || "tc",
      due_date: dueDate,
      required: t.required !== false,
    };
  });
}

// Generate deadline fields from template
export function generateDeadlinesFromTemplate(template, contractDate, closingDate) {
  if (!template?.deadlines || !contractDate) return {};
  const result = {};
  template.deadlines.forEach((d) => {
    const anchor = d.due_anchor === "closing_date" && closingDate ? new Date(closingDate) : new Date(contractDate);
    const date = format(addDays(anchor, d.due_offset_days || 0), "yyyy-MM-dd");
    if (d.deadline_type === "inspection") result.inspection_deadline = date;
    else if (d.deadline_type === "appraisal") result.appraisal_deadline = date;
    else if (d.deadline_type === "financing") result.financing_deadline = date;
    else if (d.deadline_type === "ctc") result.ctc_target = date;
  });
  return result;
}

// Generate doc checklist items from template for a transaction
export function buildChecklistItems(template, transactionId, brokerageId) {
  if (!template?.doc_checklist) return [];
  return template.doc_checklist.map((item) => ({
    brokerage_id: brokerageId,
    transaction_id: transactionId,
    doc_type: item.doc_type,
    label: item.doc_type.charAt(0).toUpperCase() + item.doc_type.slice(1),
    required: item.required !== false,
    required_by_phase: item.required_by_phase || 1,
    status: "missing",
    visible_to_client: item.visible_to_client || false,
  }));
}

export const DEFAULT_NH_TEMPLATE = {
  name: "NH Standard (Buyer)",
  transaction_type: "buyer",
  state: "NH",
  is_default: true,
  phases: [
    { phase_number: 1, phase_name: "Pre-Contract" },
    { phase_number: 2, phase_name: "Offer Drafting" },
    { phase_number: 3, phase_name: "Offer Accepted" },
    { phase_number: 4, phase_name: "Escrow Opened" },
    { phase_number: 5, phase_name: "Inspection Period" },
    { phase_number: 6, phase_name: "Repair Negotiation" },
    { phase_number: 7, phase_name: "Appraisal Ordered" },
    { phase_number: 8, phase_name: "Loan Processing" },
    { phase_number: 9, phase_name: "Clear to Close" },
    { phase_number: 10, phase_name: "Final Walkthrough" },
    { phase_number: 11, phase_name: "Closing" },
    { phase_number: 12, phase_name: "Post Closing" },
  ],
  tasks: [
    { id: "t1", phase_number: 3, task_name: "Send contract to title company", default_assignee_role: "tc", due_offset_days: 1, due_anchor: "contract_date", required: true },
    { id: "t2", phase_number: 3, task_name: "Send intro email to all parties", default_assignee_role: "tc", due_offset_days: 1, due_anchor: "contract_date", required: true },
    { id: "t3", phase_number: 3, task_name: "Open transaction file", default_assignee_role: "tc", due_offset_days: 1, due_anchor: "contract_date", required: true },
    { id: "t4", phase_number: 4, task_name: "Confirm earnest money received", default_assignee_role: "tc", due_offset_days: 3, due_anchor: "contract_date", required: true },
    { id: "t5", phase_number: 5, task_name: "Schedule inspection", default_assignee_role: "agent", due_offset_days: 5, due_anchor: "contract_date", required: true },
    { id: "t6", phase_number: 5, task_name: "Upload inspection report", default_assignee_role: "tc", due_offset_days: 10, due_anchor: "contract_date", required: true },
    { id: "t7", phase_number: 7, task_name: "Confirm appraisal ordered", default_assignee_role: "tc", due_offset_days: 7, due_anchor: "contract_date", required: true },
    { id: "t8", phase_number: 8, task_name: "Follow up with lender", default_assignee_role: "tc", due_offset_days: 21, due_anchor: "contract_date", required: false },
    { id: "t9", phase_number: 9, task_name: "Confirm CTC received", default_assignee_role: "tc", due_offset_days: 30, due_anchor: "contract_date", required: true },
    { id: "t10", phase_number: 11, task_name: "Verify settlement statement", default_assignee_role: "tc", due_offset_days: -1, due_anchor: "closing_date", required: true },
    { id: "t11", phase_number: 12, task_name: "Upload closing documents", default_assignee_role: "tc", due_offset_days: 1, due_anchor: "closing_date", required: true },
  ],
  deadlines: [
    { id: "d1", deadline_type: "inspection", due_offset_days: 10, due_anchor: "contract_date" },
    { id: "d2", deadline_type: "appraisal", due_offset_days: 14, due_anchor: "contract_date" },
    { id: "d3", deadline_type: "financing", due_offset_days: 21, due_anchor: "contract_date" },
    { id: "d4", deadline_type: "ctc", due_offset_days: 30, due_anchor: "contract_date" },
  ],
  doc_checklist: [
    { id: "c1", doc_type: "contract", required: true, required_by_phase: 3, visible_to_client: true },
    { id: "c2", doc_type: "disclosures", required: true, required_by_phase: 4, visible_to_client: true },
    { id: "c3", doc_type: "inspection", required: true, required_by_phase: 5, visible_to_client: true },
    { id: "c4", doc_type: "appraisal", required: true, required_by_phase: 7, visible_to_client: false },
    { id: "c5", doc_type: "title", required: true, required_by_phase: 9, visible_to_client: false },
    { id: "c6", doc_type: "closing", required: true, required_by_phase: 11, visible_to_client: true },
  ],
};
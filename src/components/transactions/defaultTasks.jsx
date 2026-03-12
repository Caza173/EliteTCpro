import { addDays, format, parseISO } from "date-fns";

let _id = 1;
const uid = () => `task-${_id++}-${Date.now()}`;

/**
 * Relative task templates linked to deadline anchors.
 * linked_deadline maps to a transaction field key.
 * offset_days: positive = after deadline, negative = before.
 */
const LINKED_TASK_TEMPLATES = [
  // Phase 1 — Offer Accepted & Escrow
  { name: "Send contract to title company",         phase: 1, linked_deadline: "contract_date",          offset_days: 1  },
  { name: "Send introduction email to all parties", phase: 1, linked_deadline: "contract_date",          offset_days: 1  },
  { name: "Open transaction file",                  phase: 1, linked_deadline: "contract_date",          offset_days: 1  },
  { name: "Verify earnest money received",          phase: 1, linked_deadline: "earnest_money_deadline", offset_days: 0  },
  { name: "Confirm escrow deposit",                 phase: 1, linked_deadline: "earnest_money_deadline", offset_days: 1  },
  // Phase 2 — Escrow Opened (placeholder — earnest money confirmation)
  // Phase 3 — Inspection & Repair
  { name: "Schedule inspection",                    phase: 3, linked_deadline: "inspection_deadline",    offset_days: -7 },
  { name: "Send inspection reminder to agent",      phase: 3, linked_deadline: "inspection_deadline",    offset_days: -2 },
  { name: "Upload inspection report",               phase: 3, linked_deadline: "inspection_deadline",    offset_days: 2  },
  { name: "Review repair requests",                 phase: 3, linked_deadline: "inspection_deadline",    offset_days: 4  },
  // Phase 4 — Repair Negotiation (tasks added manually as needed)
  // Phase 5 — Appraisal Ordered
  { name: "Confirm appraisal ordered",              phase: 5, linked_deadline: "appraisal_deadline",     offset_days: -14 },
  { name: "Upload appraisal report",                phase: 5, linked_deadline: "appraisal_deadline",     offset_days: 1   },
  // Phase 6 — Loan Processing
  { name: "Verify loan in processing",              phase: 6, linked_deadline: "financing_deadline",     offset_days: -14 },
  { name: "Follow up with lender",                  phase: 6, linked_deadline: "financing_deadline",     offset_days: -7  },
  { name: "Confirm financing commitment received",  phase: 6, linked_deadline: "financing_deadline",     offset_days: -3  },
  // Phase 7 — Clear to Close
  { name: "Confirm Clear to Close received",        phase: 7, linked_deadline: "closing_date",           offset_days: -5 },
  { name: "Schedule final walkthrough",             phase: 7, linked_deadline: "closing_date",           offset_days: -3 },
  // Phase 8 — Closing & Post Closing
  { name: "Prepare closing docs",                   phase: 8, linked_deadline: "closing_date",           offset_days: -7 },
  { name: "Send final reminders to all parties",    phase: 8, linked_deadline: "closing_date",           offset_days: -1 },
  { name: "Confirm closing time and location",      phase: 8, linked_deadline: "closing_date",           offset_days: -2 },
  { name: "Verify settlement statement",            phase: 8, linked_deadline: "closing_date",           offset_days: -1 },
  { name: "Upload closing documents",               phase: 8 },
  { name: "Send thank you emails",                  phase: 8 },
  { name: "Archive transaction file",               phase: 8 },
];

function makeTask(template, transactionFields = {}) {
  let due_date = "";
  if (template.linked_deadline && template.offset_days != null && transactionFields[template.linked_deadline]) {
    try {
      const base = parseISO(transactionFields[template.linked_deadline]);
      due_date = format(addDays(base, template.offset_days), "yyyy-MM-dd");
    } catch {}
  }
  return {
    id: uid(),
    name: template.name,
    phase: template.phase,
    completed: false,
    assigned_to: "",
    due_date,
    linked_deadline: template.linked_deadline || null,
    offset_days: template.offset_days ?? null,
  };
}

export function generateDefaultTasks(transactionFields = {}) {
  return LINKED_TASK_TEMPLATES.map((t) => makeTask(t, transactionFields));
}

/**
 * Generate smart tasks based on P&S extraction data.
 */
export function generateSmartTasks(parsedData, isCash = false, transactionFields = {}) {
  let templates = [...LINKED_TASK_TEMPLATES];

  // Remove financing tasks for cash transactions
  if (isCash) {
    templates = templates.filter((t) => t.linked_deadline !== "financing_deadline");
  }

  // Deduplicate
  const seen = new Set();
  const unique = templates.filter((t) => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });

  return unique.map((t) => makeTask(t, transactionFields));
}
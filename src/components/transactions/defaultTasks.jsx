let _id = 1;
const uid = () => `task-${_id++}-${Date.now()}`;

// Phases 1 & 2 (Pre-Contract, Offer Drafting) are handled by the agent side.
// TC workflow starts at Phase 3 (Offer Accepted).
const PHASE_TASKS = {
  3: [
    "Send contract to title company",
    "Send introduction email to all parties",
    "Open transaction file",
    "Confirm escrow deposit",
    "Verify escrow opened",
    "Confirm earnest money received",
  ],
  5: [
    "Schedule inspection",
    "Track inspection deadline",
    "Upload inspection report",
    "Send inspection results to agent",
    "Review repair requests",
    "Negotiate repair addendum",
    "Upload signed addendum",
  ],
  7: [
    "Confirm appraisal ordered",
    "Track appraisal deadline",
    "Upload appraisal report",
  ],
  8: ["Verify loan in processing", "Follow up with lender", "Track loan commitment date"],
  9: ["Confirm Clear to Close received", "Notify all parties of CTC"],
  10: ["Schedule final walkthrough", "Confirm walkthrough completed"],
  11: [
    "Confirm closing time and location",
    "Send final reminders to all parties",
    "Verify settlement statement",
    "Confirm funds wired",
  ],
  12: ["Upload closing documents", "Send thank you emails", "Archive transaction file"],
};

// Contingency-based tasks generated from P&S extraction data
const INSPECTION_CONTINGENCY_TASKS = [
  "Schedule building inspection",
  "Confirm inspection completed",
  "Upload inspection report",
  "Review repair requests",
];

const FINANCING_CONTINGENCY_TASKS = [
  "Send contract to lender",
  "Confirm loan application submitted",
  "Verify appraisal ordered",
  "Confirm financing commitment received",
];

function makeTask(name, phase) {
  return { id: uid(), name, phase, completed: false, assigned_to: "", due_date: "" };
}

export function generateDefaultTasks() {
  const tasks = [];
  Object.entries(PHASE_TASKS).forEach(([phase, names]) => {
    names.forEach((name) => {
      tasks.push(makeTask(name, Number(phase)));
    });
  });
  return tasks;
}

/**
 * Generate smart tasks based on P&S extraction data.
 * Merges contingency-specific tasks with the default task set.
 * @param {object} parsedData - normalized extraction output from normalizeV2()
 * @param {boolean} isCash - whether this is a cash transaction
 */
export function generateSmartTasks(parsedData, isCash = false) {
  const tasks = generateDefaultTasks();

  const hasInspection = parsedData?.inspectionDeadline || parsedData?.inspectionDays != null;
  const hasFinancing = !isCash && (parsedData?.financingCommitmentDate || parsedData?.financingDeadline);

  if (hasInspection) {
    INSPECTION_CONTINGENCY_TASKS.forEach((name) => {
      // Only add if not already present (avoid duplication with phase 5 tasks)
      if (!tasks.find((t) => t.name.toLowerCase().includes(name.toLowerCase().split(" ")[0]))) {
        tasks.push(makeTask(name, 5));
      }
    });
  }

  if (hasFinancing) {
    FINANCING_CONTINGENCY_TASKS.forEach((name) => {
      if (!tasks.find((t) => t.name.toLowerCase().includes(name.toLowerCase().split(" ")[0]))) {
        tasks.push(makeTask(name, 8));
      }
    });
  }

  return tasks;
}
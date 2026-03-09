let _id = 1;
const uid = () => `task-${_id++}-${Date.now()}`;

// Phases 1 & 2 (Pre-Contract, Offer Drafting) are handled by the agent side.
// TC workflow starts at Phase 3 (Offer Accepted).
// Phase 4 tasks are merged into Phase 3. Phase 6 tasks are merged into Phase 5.
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

export function generateDefaultTasks() {
  const tasks = [];
  Object.entries(PHASE_TASKS).forEach(([phase, names]) => {
    names.forEach((name) => {
      tasks.push({
        id: uid(),
        name,
        phase: Number(phase),
        completed: false,
        assigned_to: "",
        due_date: "",
      });
    });
  });
  return tasks;
}
// ─── ELITETC TASK LIBRARY ─────────────────────────────────────────────────────
// Canonical task templates per phase. Phase numbers match PhaseChecklist nums.

export const PHASE_TASK_LIBRARY = [
  {
    phaseNum: 3,
    phaseId: "offer_accepted_escrow",
    label: "Offer Accepted & Escrow",
    tasks: [
      { id: "ps_uploaded",           name: "Executed Purchase & Sales uploaded",          required: true,  source: "system" },
      { id: "effective_date",         name: "Effective date confirmed",                    required: true,  source: "system" },
      { id: "earnest_money",          name: "Earnest money received",                      required: true,  source: "system" },
      { id: "buyer_agency",           name: "Buyer agency agreement uploaded",             required: true,  source: "system" },
      { id: "seller_disclosures",     name: "Seller disclosures received",                 required: true,  source: "system" },
      { id: "create_tx_file",         name: "Create transaction file (SkySlope/Dotloop)",  required: true,  source: "system" },
      { id: "add_all_parties",        name: "Add all parties (buyer, seller, agent, lender, title)", required: true, source: "system" },
      { id: "confirm_escrow",         name: "Confirm escrow agent",                        required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 5,
    phaseId: "inspection_repair",
    label: "Inspection & Repair",
    tasks: [
      { id: "inspection_ordered",     name: "Inspection ordered",                          required: true,  source: "system" },
      { id: "inspection_completed",   name: "Inspection completed",                        required: true,  source: "system" },
      { id: "inspection_report",      name: "Inspection report uploaded",                  required: true,  source: "system" },
      { id: "repair_negotiations",    name: "Repair negotiations completed",                required: true,  source: "system" },
      { id: "addendum_created",       name: "Addendum created (if applicable)",            required: true,  source: "system" },
      { id: "contingency_removed",    name: "Inspection contingency removed",               required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 7,
    phaseId: "appraisal_ordered",
    label: "Appraisal Ordered",
    tasks: [
      { id: "appraisal_ordered",      name: "Appraisal ordered",                           required: true,  source: "system" },
      { id: "appraisal_scheduled",    name: "Appraisal scheduled",                         required: true,  source: "system" },
      { id: "appraisal_completed",    name: "Appraisal completed",                         required: false, source: "system" },
      { id: "appraisal_received",     name: "Appraisal received",                          required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 8,
    phaseId: "loan_processing",
    label: "Loan Processing",
    tasks: [
      { id: "lender_docs",            name: "Buyer submitted lender documents",            required: true,  source: "system" },
      { id: "loan_app_completed",     name: "Loan application completed",                  required: true,  source: "system" },
      { id: "conditional_approval",   name: "Conditional approval received",               required: true,  source: "system" },
      { id: "conditions_cleared",     name: "Conditions cleared",                          required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 9,
    phaseId: "clear_to_close",
    label: "Clear to Close",
    tasks: [
      { id: "ctc_received",           name: "Clear to close received",                     required: true,  source: "system" },
      { id: "closing_scheduled",      name: "Closing scheduled",                           required: true,  source: "system" },
      { id: "alta_cd_received",       name: "ALTA/CD received",                            required: true,  source: "system" },
      { id: "title_completed",        name: "Title work completed",                        required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 10,
    phaseId: "final_walkthrough",
    label: "Final Walkthrough",
    tasks: [
      { id: "walkthrough_scheduled",  name: "Walkthrough scheduled",                       required: true,  source: "system" },
      { id: "walkthrough_completed",  name: "Walkthrough completed",                       required: true,  source: "system" },
      { id: "issues_resolved",        name: "Issues resolved",                             required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 11,
    phaseId: "closing",
    label: "Closing",
    tasks: [
      { id: "docs_signed",            name: "Closing documents signed",                    required: true,  source: "system" },
      { id: "funds_received",         name: "Funds received",                              required: true,  source: "system" },
      { id: "deed_recorded",          name: "Deed recorded",                               required: true,  source: "system" },
      { id: "commission_submitted",   name: "Commission submitted",                        required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 12,
    phaseId: "post_closing",
    label: "Post Closing",
    tasks: [
      { id: "docs_to_skyslope",       name: "All documents uploaded to SkySlope",          required: true,  source: "system" },
      { id: "mls_closed",             name: "Transaction marked closed in MLS",            required: true,  source: "system" },
      { id: "client_followup",        name: "Client follow-up initiated",                  required: true,  source: "system" },
      { id: "client_gift",            name: "Client gift ordered",                         required: false, source: "system" },
    ],
  },
];

/** Map phaseNum → library entry */
export const PHASE_MAP = Object.fromEntries(PHASE_TASK_LIBRARY.map(p => [p.phaseNum, p]));

/**
 * Generate task objects for a specific phase, scoped to a transactionId.
 * Returns array ready to merge into transaction.tasks.
 */
export function generateTasksForPhase(phaseNum, transactionId) {
  const phase = PHASE_MAP[phaseNum];
  if (!phase) return [];
  return phase.tasks.map(t => ({
    id: `${phaseNum}_${t.id}`,
    name: t.name,
    phase: phaseNum,
    completed: false,
    required: t.required,
    source: t.source,
    assigned_to: "",
    due_date: "",
  }));
}

/**
 * isPhaseComplete — a phase is done when all required tasks are completed.
 */
export function isPhaseComplete(phaseNum, tasks = []) {
  const phaseTasks = tasks.filter(t => t.phase === phaseNum && t.required);
  if (phaseTasks.length === 0) return false;
  return phaseTasks.every(t => t.completed);
}

/**
 * getPhaseProgress — returns { completed, total, required, requiredDone }
 */
export function getPhaseProgress(phaseNum, tasks = []) {
  const phaseTasks = tasks.filter(t => t.phase === phaseNum);
  const required = phaseTasks.filter(t => t.required);
  return {
    total: phaseTasks.length,
    completed: phaseTasks.filter(t => t.completed).length,
    required: required.length,
    requiredDone: required.filter(t => t.completed).length,
  };
}
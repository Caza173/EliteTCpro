// ─── ELITETC TASK LIBRARY ─────────────────────────────────────────────────────
// Architecture: transaction_type → phase_template → tasks
// Two primary workflows: "buyer" and "listing"
// NEVER cross-load tasks between types.

// ─── PHASE DEFINITIONS ────────────────────────────────────────────────────────

export const PHASES_BY_TYPE = {
  // ── BUYER UNDER CONTRACT (5 phases — no intake) ───────────────────────────
  buyer_under_contract: [
    { phaseNum: 1, phaseId: "under_contract", label: "Under Contract" },
    { phaseNum: 2, phaseId: "due_diligence",  label: "Due Diligence / Inspections" },
    { phaseNum: 3, phaseId: "financing",      label: "Financing / Pending" },
    { phaseNum: 4, phaseId: "closing",        label: "Closing" },
    { phaseNum: 5, phaseId: "post_close",     label: "Post-Close" },
  ],

  // ── LISTING (5 phases) ────────────────────────────────────────────────────
  listing: [
    { phaseNum: 1, phaseId: "listing_intake", label: "Listing Intake / Setup" },
    { phaseNum: 2, phaseId: "active_listing", label: "Active Listing" },
    { phaseNum: 3, phaseId: "under_contract", label: "Under Contract" },
    { phaseNum: 4, phaseId: "closing",        label: "Closing" },
    { phaseNum: 5, phaseId: "post_close",     label: "Post-Close" },
  ],

  // ── DUAL / OTHER (mirrors buyer, no intake) ───────────────────────────────
  dual: [
    { phaseNum: 1, phaseId: "under_contract", label: "Under Contract" },
    { phaseNum: 2, phaseId: "due_diligence",  label: "Due Diligence / Inspections" },
    { phaseNum: 3, phaseId: "financing",      label: "Financing / Pending" },
    { phaseNum: 4, phaseId: "closing",        label: "Closing" },
    { phaseNum: 5, phaseId: "post_close",     label: "Post-Close" },
  ],
  other: [
    { phaseNum: 1, phaseId: "under_contract", label: "Under Contract" },
    { phaseNum: 2, phaseId: "due_diligence",  label: "Due Diligence / Inspections" },
    { phaseNum: 3, phaseId: "closing",        label: "Closing" },
    { phaseNum: 4, phaseId: "post_close",     label: "Post-Close" },
  ],
};

// ─── NORMALIZE ────────────────────────────────────────────────────────────────

export function normalizeTransactionType(txType) {
  if (!txType) return "buyer_under_contract";
  if (txType === "buyer") return "buyer_under_contract";
  if (txType === "seller") return "listing";
  if (["buyer_under_contract", "listing", "dual", "other"].includes(txType)) return txType;
  return "buyer_under_contract";
}

export function getPhasesForType(transactionType) {
  return PHASES_BY_TYPE[normalizeTransactionType(transactionType)] || PHASES_BY_TYPE.buyer_under_contract;
}

// ─── TASK TEMPLATES ───────────────────────────────────────────────────────────
// Strictly scoped — buyer tasks NEVER appear in listing, and vice versa.

const TASKS_BY_TYPE = {

  // ════════════════════════════════════════════════════
  // BUYER TRANSACTION — 5 phases (no intake phase)
  // ════════════════════════════════════════════════════
  buyer_under_contract: {
    under_contract: [
      { id: "create_transaction_file", name: "Create transaction file (SkySlope/Dotloop)", required: true  },
      { id: "enter_property_system",   name: "Enter property into system",                 required: true  },
      { id: "verify_initials_sigs",    name: "Verify initials & signatures",               required: true  },
      { id: "upload_psa",              name: "Executed P&S uploaded",                      required: true  },
      { id: "buyer_agency",            name: "Buyer agency agreement uploaded",             required: true  },
      { id: "preapproval",             name: "Pre-approval / proof of funds uploaded",      required: true  },
      { id: "earnest_money_terms",     name: "Earnest money terms confirmed",               required: true  },
      { id: "add_contacts",            name: "Contacts added (lender, title, agent)",       required: true  },
      { id: "enter_dates",             name: "All critical dates entered into system",       required: true  },
      { id: "calendar_sync",           name: "Deadlines synced to calendar",                required: false },
      { id: "timeline_email",          name: "Timeline email sent to all parties",          required: true  },
      { id: "deposit_received",        name: "Earnest money deposit received + verified",   required: true  },
      { id: "inspection_scheduled",    name: "Inspection(s) scheduled",                     required: true  },
      { id: "add_inspector",           name: "Inspector / vendors added to file",           required: true  },
      { id: "initial_email_lender",    name: "Initial email sent to lender/title",          required: true  },
      { id: "seller_disclosure",       name: "Seller disclosure received",                  required: true  },
    ],
    due_diligence: [
      { id: "inspections_completed",name: "Inspections completed",                        required: true  },
      { id: "reports_uploaded",     name: "Inspection reports uploaded",                  required: true  },
      { id: "repair_negotiations",  name: "Repair negotiations drafted",                  required: true  },
      { id: "inspection_addendum",  name: "Inspection addendum signed",                   required: false },
      { id: "contingency_removed",  name: "Contingency removed or extended",             required: true  },
    ],
    financing: [
      { id: "appraisal_ordered",    name: "Appraisal ordered",                           required: true  },
      { id: "appraisal_received",   name: "Appraisal received",                          required: true  },
      { id: "loan_commitment",      name: "Loan commitment obtained",                    required: true  },
      { id: "title_in_progress",    name: "Title work in progress",                      required: true  },
      { id: "ctc_received",         name: "Clear to close received",                     required: true  },
    ],
    closing: [
      { id: "closing_scheduled",    name: "Closing scheduled",                           required: true  },
      { id: "final_numbers",        name: "Final numbers reviewed",                      required: true  },
      { id: "walkthrough_completed",name: "Final walkthrough completed",                 required: true  },
      { id: "utilities_confirmed",  name: "Utilities confirmed",                         required: true  },
      { id: "closing_completed",    name: "Closing completed",                           required: true  },
    ],
    post_close: [
      { id: "hud_alta_uploaded",    name: "HUD/ALTA uploaded",                           required: true  },
      { id: "commission_tracked",   name: "Commission tracked",                          required: true  },
      { id: "followup_14day",       name: "14 Day Follow-up Scheduled",                  required: true  },
      { id: "followup_30day",       name: "30 Day Follow-up Scheduled",                  required: true  },
      { id: "followup_90day",       name: "90 Day Follow-up",                            required: false },
      { id: "followup_6month",      name: "6 Month Follow-up",                           required: false },
      { id: "followup_1year",       name: "1 Year Anniversary Follow-up",                required: false },
    ],
  },

  // ════════════════════════════════════════════════════
  // LISTING TRANSACTION — 5 phases
  // ════════════════════════════════════════════════════
  listing: {
    listing_intake: [
      { id: "cma_completed",        name: "CMA completed",                               required: true  },
      { id: "listing_agreement",    name: "Listing agreement signed",                    required: true  },
      { id: "seller_disclosures",   name: "Seller disclosures collected",                required: true  },
      { id: "property_data",        name: "Property data collected",                     required: true  },
      { id: "photos_scheduled",     name: "Photos scheduled",                            required: false },
    ],
    active_listing: [
      { id: "mls_input",            name: "MLS input completed",                         required: true  },
      { id: "photos_uploaded",      name: "Photos uploaded to MLS",                      required: true  },
      { id: "map_verified",         name: "Map/location verified",                       required: true  },
      { id: "listing_live",         name: "Listing live / syndicated",                   required: true  },
      { id: "showings_active",      name: "Showings active",                             required: false },
      { id: "weekly_seller_update", name: "Weekly seller updates sent",                  required: false },
    ],
    under_contract: [
      { id: "offer_accepted",       name: "Offer accepted",                              required: true  },
      { id: "deposit_verified",     name: "Earnest money deposit verified",              required: true  },
      { id: "buyer_info_received",  name: "Buyer info received",                         required: true  },
      { id: "inspections_scheduled",name: "Inspections scheduled",                       required: true  },
      { id: "contingency_tracking", name: "Contingency tracking active",                 required: true  },
      { id: "enter_dates",          name: "All critical dates entered into system",      required: true  },
      { id: "timeline_email",       name: "Timeline email sent to all parties",         required: true  },
    ],
    closing: [
      { id: "title_payoff",         name: "Title + payoff coordination",                 required: true  },
      { id: "closing_scheduled",    name: "Closing scheduled",                           required: true  },
      { id: "walkthrough_completed",name: "Final walkthrough completed",                 required: true  },
      { id: "closing_completed",    name: "Closing completed",                           required: true  },
    ],
    post_close: [
      { id: "commission_recorded",  name: "Commission recorded",                         required: true  },
      { id: "file_closed_skyslope", name: "File closed in SkySlope",                    required: true  },
      { id: "followup_14day",       name: "14 Day Follow-up Scheduled",                  required: true  },
      { id: "followup_30day",       name: "30 Day Follow-up Scheduled",                  required: true  },
      { id: "followup_90day",       name: "90 Day Follow-up",                            required: false },
      { id: "followup_6month",      name: "6 Month Follow-up",                           required: false },
      { id: "followup_1year",       name: "1 Year Anniversary Follow-up",                required: false },
    ],
  },
};

// Dual mirrors buyer; other uses a simplified buyer subset
TASKS_BY_TYPE.dual = TASKS_BY_TYPE.buyer_under_contract;
TASKS_BY_TYPE.other = {
  under_contract: TASKS_BY_TYPE.buyer_under_contract.under_contract,
  due_diligence:  TASKS_BY_TYPE.buyer_under_contract.due_diligence,
  closing:        TASKS_BY_TYPE.buyer_under_contract.closing,
  post_close:     TASKS_BY_TYPE.buyer_under_contract.post_close,
};

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Generate task records for a specific phase and transaction type.
 * phaseNum is 1-based within that type's phase list.
 */
export function generateTasksForPhase(phaseNum, transactionId, transactionType = null) {
  const normalized = normalizeTransactionType(transactionType);
  const phases = PHASES_BY_TYPE[normalized] || PHASES_BY_TYPE.buyer_under_contract;
  const phase = phases.find(p => p.phaseNum === phaseNum);
  if (!phase) return [];

  const typeTasks = TASKS_BY_TYPE[normalized] || TASKS_BY_TYPE.buyer_under_contract;
  const tasks = typeTasks[phase.phaseId] || [];

  return tasks.map(t => ({
    id: `${phaseNum}_${t.id}`,
    name: t.name,
    phase: phaseNum,
    completed: false,
    required: t.required,
    source: "system",
    assigned_to: "",
    due_date: "",
  }));
}

// ─── PHASE RELATIONSHIP MAP ───────────────────────────────────────────────────
// Due Diligence (phaseNum 2) is a sub-phase of Under Contract (phaseNum 1).
// Under Contract is NOT complete unless both phase 1 AND phase 2 tasks are done.
// This applies to buyer_under_contract and dual types.
export const SUB_PHASE_MAP = {
  // parent phaseNum → sub-phase phaseNum(s) that must also be complete
  1: [2], // Under Contract requires Due Diligence to also be complete
};

/**
 * Check if a phase is logically complete.
 * For phase 1 (Under Contract): requires phase 1 AND phase 2 required tasks complete.
 * For phase 2 (Due Diligence): only its own tasks (it feeds the parent).
 */
export function isPhaseComplete(phaseNum, tasks = []) {
  const ownTasks = tasks.filter(t => t.phase === phaseNum && t.required);
  if (ownTasks.length === 0) return false;
  const ownDone = ownTasks.every(t => t.completed || t.is_completed);
  if (!ownDone) return false;

  // If this phase has sub-phases, they must also be complete
  const subPhases = SUB_PHASE_MAP[phaseNum] || [];
  return subPhases.every(subNum => {
    const subTasks = tasks.filter(t => t.phase === subNum && t.required);
    if (subTasks.length === 0) return true; // no tasks = not blocking
    return subTasks.every(t => t.completed || t.is_completed);
  });
}

export function getPhaseProgress(phaseNum, tasks = []) {
  // For phase 1, include sub-phase tasks in the progress calculation
  const subPhases = SUB_PHASE_MAP[phaseNum] || [];
  const allPhaseNums = [phaseNum, ...subPhases];
  const phaseTasks = tasks.filter(t => allPhaseNums.includes(t.phase));
  const required = phaseTasks.filter(t => t.required || t.is_required);
  const completed = phaseTasks.filter(t => t.completed || t.is_completed);
  const requiredDone = required.filter(t => t.completed || t.is_completed);
  return {
    total: phaseTasks.length,
    completed: completed.length,
    required: required.length,
    requiredDone: requiredDone.length,
  };
}

export function getStartingPhase() { return 1; }

// ─── COMPATIBILITY FILTERS ────────────────────────────────────────────────────
// Hard-block wrong tasks from ever appearing in wrong transaction type.

export const LISTING_ONLY_TASK_KEYWORDS = [
  "input listing into mls",
  "upload photos to mls",
  "map/location verification",
  "map location verified",
  "syndication confirmed live",
  "track showings",
  "weekly seller update",
  "weekly seller update sent",
  "showings active",
  "listing live",
  "mls input completed",
  "mls data verified",
  "create coming soon",
  "install sign",
  "sign install",
  "showing service",
  "showing instructions",
  "active listing",
  "cma completed",
  "listing agreement signed",
  "listing appointment",
  "mls status to closed",
  "update mls status",
  "payoff requested",
  "marketing closeout",
  "listing file closed",
  "pre-listing",
  "listing prep",
];

export const BUYER_ONLY_TASK_KEYWORDS = [
  "earnest money received",
  "order inspections",
  "order home inspection",
  "upload inspections",
  "inspection addendum",
  "remove inspection contingency",
  "order appraisal",
  "appraisal ordered",
  "loan commitment",
  "clear to close",
  "final walkthrough",
  "send buyers links to utilities",
  "buyer representation agreement",
  "buyer pre-approval",
  "proof of funds",
  "buyer agency agreement",
  "buyer informed of key dates",
  "initial email sent to lender",
  "initial email to lender",
  "wire fraud notice",
];

/**
 * Returns true if a task title is incompatible with the given transaction type.
 * Used to warn or block wrong tasks.
 */
export function isTaskIncompatible(taskTitle, transactionType) {
  const normalized = normalizeTransactionType(transactionType);
  const lower = taskTitle.toLowerCase();

  if (normalized === "buyer_under_contract") {
    return LISTING_ONLY_TASK_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  }
  if (normalized === "listing") {
    return BUYER_ONLY_TASK_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  }
  return false;
}

// Legacy exports
export const PHASE_TASK_LIBRARY = [];
export const PHASE_MAP = {};
// ─── ELITETC TASK LIBRARY ─────────────────────────────────────────────────────
// Phase templates are scoped strictly to transaction_type.
// "buyer_under_contract" and "listing" are the two primary workflows.

// ─── PHASE DEFINITIONS ────────────────────────────────────────────────────────

export const PHASES_BY_TYPE = {
  buyer_under_contract: [
    { phaseNum: 1, phaseId: "intake",       label: "Intake / Contract Setup" },
    { phaseNum: 2, phaseId: "under_contract", label: "Under Contract" },
    { phaseNum: 3, phaseId: "due_diligence", label: "Due Diligence" },
    { phaseNum: 4, phaseId: "financing",    label: "Financing / Pending" },
    { phaseNum: 5, phaseId: "closing",      label: "Closing" },
    { phaseNum: 6, phaseId: "post_close",   label: "Post-Close" },
  ],
  listing: [
    { phaseNum: 1, phaseId: "pre_listing",    label: "Pre-Listing" },
    { phaseNum: 2, phaseId: "active_listing", label: "Active Listing" },
    { phaseNum: 3, phaseId: "under_contract", label: "Under Contract" },
    { phaseNum: 4, phaseId: "due_diligence",  label: "Due Diligence" },
    { phaseNum: 5, phaseId: "pending",        label: "Pending" },
    { phaseNum: 6, phaseId: "closing",        label: "Closing" },
    { phaseNum: 7, phaseId: "post_close",     label: "Post-Close" },
  ],
  dual: [
    { phaseNum: 1, phaseId: "intake",         label: "Intake / Contract Setup" },
    { phaseNum: 2, phaseId: "under_contract", label: "Under Contract" },
    { phaseNum: 3, phaseId: "due_diligence",  label: "Due Diligence" },
    { phaseNum: 4, phaseId: "financing",      label: "Financing / Pending" },
    { phaseNum: 5, phaseId: "closing",        label: "Closing" },
    { phaseNum: 6, phaseId: "post_close",     label: "Post-Close" },
  ],
  other: [
    { phaseNum: 1, phaseId: "intake",         label: "Intake / Contract Setup" },
    { phaseNum: 2, phaseId: "under_contract", label: "Under Contract" },
    { phaseNum: 3, phaseId: "due_diligence",  label: "Due Diligence" },
    { phaseNum: 4, phaseId: "closing",        label: "Closing" },
    { phaseNum: 5, phaseId: "post_close",     label: "Post-Close" },
  ],
};

// Fallback for legacy transaction_type values
export function normalizeTransactionType(txType) {
  if (!txType) return "buyer_under_contract";
  if (txType === "buyer") return "buyer_under_contract";
  if (txType === "seller") return "listing";
  if (["buyer_under_contract", "listing", "dual", "other"].includes(txType)) return txType;
  return "buyer_under_contract";
}

export function getPhasesForType(transactionType) {
  const normalized = normalizeTransactionType(transactionType);
  return PHASES_BY_TYPE[normalized] || PHASES_BY_TYPE.buyer_under_contract;
}

// ─── TASK TEMPLATES ───────────────────────────────────────────────────────────

const TASKS_BY_TYPE = {
  buyer_under_contract: {
    intake: [
      { id: "create_tx_file",       name: "Create transaction file (SkySlope/Dotloop)",   required: true },
      { id: "upload_psa",           name: "Upload executed Purchase & Sale Agreement",     required: true },
      { id: "effective_date",       name: "Confirm effective / acceptance date",           required: true },
      { id: "enter_critical_dates", name: "Enter all critical dates into system",          required: true },
      { id: "add_all_parties",      name: "Add all parties (buyer, seller, lender, title)", required: true },
      { id: "buyer_agency",         name: "Buyer agency agreement uploaded",               required: true },
      { id: "earnest_money",        name: "Earnest money confirmed / tracked",             required: true },
      { id: "confirm_escrow",       name: "Confirm escrow / title company",                required: true },
      { id: "calendar_sync",        name: "Sync deadlines to calendar",                   required: false },
      { id: "timeline_email",       name: "Timeline email sent to all parties",           required: true },
    ],
    under_contract: [
      { id: "verify_signatures",    name: "Verify all signatures on P&S",                 required: true },
      { id: "add_lender",           name: "Add lender contact info",                      required: true },
      { id: "order_inspection",     name: "Order home inspection",                        required: true },
      { id: "track_appraisal",      name: "Track appraisal order",                        required: true },
      { id: "send_timeline_buyer",  name: "Send deadline timeline to buyer",              required: true },
      { id: "confirm_title_search", name: "Confirm title search initiated",               required: false },
    ],
    due_diligence: [
      { id: "inspection_scheduled", name: "Inspection scheduled",                         required: true },
      { id: "inspection_completed", name: "Inspection completed",                         required: true },
      { id: "inspection_report",    name: "Inspection report uploaded",                   required: true },
      { id: "repair_negotiations",  name: "Repair negotiations completed",                required: true },
      { id: "inspection_addendum",  name: "Inspection addendum drafted (if needed)",      required: false },
      { id: "contingency_removed",  name: "Inspection contingency removed",               required: true },
    ],
    financing: [
      { id: "appraisal_ordered",    name: "Appraisal ordered",                            required: true },
      { id: "appraisal_scheduled",  name: "Appraisal scheduled",                         required: true },
      { id: "appraisal_received",   name: "Appraisal received",                          required: true },
      { id: "lender_docs",          name: "Buyer submitted lender documents",            required: true },
      { id: "conditional_approval", name: "Conditional approval received",               required: true },
      { id: "conditions_cleared",   name: "Loan conditions cleared",                     required: true },
      { id: "ctc_received",         name: "Clear to close received",                     required: true },
      { id: "title_completed",      name: "Title work completed",                        required: true },
      { id: "alta_cd_received",     name: "ALTA/CD received",                            required: true },
    ],
    closing: [
      { id: "closing_scheduled",    name: "Closing scheduled",                           required: true },
      { id: "confirm_utilities",    name: "Confirm utilities & access",                  required: true },
      { id: "walkthrough_scheduled",name: "Final walkthrough scheduled",                 required: true },
      { id: "walkthrough_completed",name: "Final walkthrough completed",                 required: true },
      { id: "docs_signed",          name: "Closing documents signed",                    required: true },
      { id: "funds_received",       name: "Funds received",                              required: true },
      { id: "deed_recorded",        name: "Deed recorded",                               required: true },
      { id: "commission_submitted", name: "Commission statement submitted",              required: true },
      { id: "hud_alta_uploaded",    name: "HUD/ALTA uploaded",                           required: true },
    ],
    post_close: [
      { id: "docs_to_skyslope",     name: "All documents uploaded to SkySlope",          required: true },
      { id: "client_followup",      name: "Client follow-up initiated",                  required: true },
      { id: "client_gift",          name: "Client gift ordered",                         required: false },
      { id: "start_followup",       name: "Start follow-up campaign",                    required: false },
    ],
  },

  listing: {
    pre_listing: [
      { id: "create_tx_file",         name: "Create transaction file (SkySlope/Dotloop)", required: true },
      { id: "upload_listing_agreement",name: "Upload listing agreement",                  required: true },
      { id: "verify_seller_names",    name: "Verify seller names match deed",            required: true },
      { id: "enter_property_system",  name: "Enter property into system",                required: true },
      { id: "collect_disclosures",    name: "Collect seller disclosures",                required: true },
      { id: "lead_paint",             name: "Lead paint disclosure (if applicable)",      required: false },
      { id: "hoa_docs",               name: "HOA docs collected (if applicable)",         required: false },
      { id: "order_photos",           name: "Order photos",                              required: false },
      { id: "showing_instructions",   name: "Create showing instructions",               required: false },
      { id: "install_lockbox",        name: "Install lockbox",                           required: false },
    ],
    active_listing: [
      { id: "input_mls",              name: "Input listing into MLS",                    required: true },
      { id: "upload_photos_mls",      name: "Upload photos to MLS",                     required: true },
      { id: "map_verification",       name: "Map/location verification",                 required: true },
      { id: "syndication_live",       name: "Syndication confirmed live",                required: false },
      { id: "track_showings",         name: "Track showings",                            required: false },
      { id: "weekly_seller_update",   name: "Weekly seller update sent",                 required: false },
    ],
    under_contract: [
      { id: "upload_psa",             name: "Upload executed Purchase & Sale Agreement",  required: true },
      { id: "effective_date",         name: "Confirm effective / acceptance date",        required: true },
      { id: "add_all_parties",        name: "Add all parties (buyer, seller, lender, title)", required: true },
      { id: "enter_critical_dates",   name: "Enter all critical dates into system",       required: true },
      { id: "earnest_money",          name: "Earnest money received / confirmed",         required: true },
      { id: "verify_signatures",      name: "Verify all signatures",                     required: true },
      { id: "seller_disclosures_uctr",name: "Seller disclosures sent to buyer",          required: true },
      { id: "review_offer",           name: "Review offer with seller",                  required: true },
      { id: "add_buyer_agent",        name: "Add buyer's agent contact info",            required: true },
      { id: "coordinate_inspection",  name: "Coordinate inspection access with seller",  required: true },
      { id: "timeline_email",         name: "Timeline email sent to all parties",        required: true },
      { id: "calendar_sync",          name: "Sync deadlines to calendar",                required: false },
    ],
    due_diligence: [
      { id: "inspection_access",      name: "Confirm inspection access for buyer",       required: true },
      { id: "inspection_completed",   name: "Inspection completed",                      required: true },
      { id: "repair_request_received",name: "Repair request received from buyer",        required: false },
      { id: "repair_negotiations",    name: "Repair negotiations completed",             required: true },
      { id: "inspection_addendum",    name: "Inspection addendum drafted (if needed)",   required: false },
      { id: "contingency_removed",    name: "Inspection contingency removed",            required: true },
    ],
    pending: [
      { id: "appraisal_access",       name: "Confirm property access for appraisal",    required: true },
      { id: "appraisal_completed",    name: "Appraisal completed",                      required: true },
      { id: "conditions_cleared",     name: "Buyer loan conditions cleared",            required: true },
      { id: "ctc_received",           name: "Clear to close received",                  required: true },
      { id: "title_completed",        name: "Title work completed",                     required: true },
      { id: "alta_cd_received",       name: "ALTA/CD received",                         required: true },
    ],
    closing: [
      { id: "closing_scheduled",      name: "Closing scheduled",                        required: true },
      { id: "walkthrough_scheduled",  name: "Final walkthrough scheduled",              required: true },
      { id: "walkthrough_completed",  name: "Final walkthrough completed",              required: true },
      { id: "docs_signed",            name: "Closing documents signed",                 required: true },
      { id: "commission_submitted",   name: "Commission statement submitted",           required: true },
      { id: "hud_alta_uploaded",      name: "HUD/ALTA uploaded",                        required: true },
      { id: "mls_status_closed",      name: "Update MLS status to closed",             required: true },
    ],
    post_close: [
      { id: "docs_to_skyslope",       name: "All documents uploaded to SkySlope",       required: true },
      { id: "client_followup",        name: "Client follow-up initiated",               required: true },
      { id: "client_gift",            name: "Client gift ordered",                      required: false },
      { id: "start_followup",         name: "Start follow-up campaign",                 required: false },
    ],
  },
};

// Dual uses buyer_under_contract tasks; other uses a simplified subset
TASKS_BY_TYPE.dual = TASKS_BY_TYPE.buyer_under_contract;
TASKS_BY_TYPE.other = {
  intake:         TASKS_BY_TYPE.buyer_under_contract.intake,
  under_contract: TASKS_BY_TYPE.buyer_under_contract.under_contract,
  due_diligence:  TASKS_BY_TYPE.buyer_under_contract.due_diligence,
  closing:        TASKS_BY_TYPE.buyer_under_contract.closing,
  post_close:     TASKS_BY_TYPE.buyer_under_contract.post_close,
};

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Generate task records for a specific phase and transaction type.
 * phaseNum is the 1-based index within that type's phase list.
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

/** Starting phase number — always 1 now, phases are type-scoped */
export function getStartingPhase() {
  return 1;
}

// Legacy export for any code that still references PHASE_TASK_LIBRARY
export const PHASE_TASK_LIBRARY = [];
export const PHASE_MAP = {};
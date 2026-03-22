// ─── ELITETC TASK LIBRARY ─────────────────────────────────────────────────────
// 7-Phase lifecycle: Pre-Listing → Active Listing → Under Contract →
//                    Due Diligence → Pending → Closing → Post-Close

export const PHASE_TASK_LIBRARY = [
  {
    phaseNum: 1,
    phaseId: "pre_listing",
    label: "Pre-Listing",
    appliesTo: ["listing", "seller", "dual"],
    tasks: [
      { id: "create_tx_file",         name: "Create transaction file (SkySlope/Dotloop)",      required: true,  source: "system" },
      { id: "upload_listing_agreement",name: "Upload listing agreement",                        required: true,  source: "system" },
      { id: "verify_seller_names",     name: "Verify seller names match deed",                  required: true,  source: "system" },
      { id: "enter_property_system",   name: "Enter property into system",                      required: true,  source: "system" },
      { id: "order_photos",            name: "Order photos",                                    required: false, source: "system" },
      { id: "schedule_photos",         name: "Schedule photo session",                          required: false, source: "system" },
      { id: "collect_seller_disclosures", name: "Collect seller disclosures",                  required: true,  source: "system" },
      { id: "lead_paint_disclosure",   name: "Lead paint disclosure (if applicable)",           required: false, source: "system" },
      { id: "hoa_docs",                name: "HOA docs collected (if applicable)",              required: false, source: "system" },
      { id: "showing_instructions",    name: "Create showing instructions",                     required: false, source: "system" },
      { id: "install_lockbox",         name: "Install lockbox",                                 required: false, source: "system" },
      { id: "confirm_utilities_access",name: "Confirm utilities & access",                      required: false, source: "system" },
    ],
  },
  {
    phaseNum: 2,
    phaseId: "active_listing",
    label: "Active Listing",
    appliesTo: ["listing", "seller", "dual"],
    tasks: [
      { id: "input_mls",               name: "Input listing into MLS",                          required: true,  source: "system" },
      { id: "upload_photos_mls",       name: "Upload photos to MLS",                           required: true,  source: "system" },
      { id: "map_verification",        name: "Map/location verification",                       required: true,  source: "system" },
      { id: "syndication_live",        name: "Syndication confirmed live",                      required: false, source: "system" },
      { id: "track_showings",          name: "Track showings",                                  required: false, source: "system" },
      { id: "weekly_seller_update",    name: "Weekly seller update sent",                       required: false, source: "system" },
    ],
  },
  {
    phaseNum: 3,
    phaseId: "under_contract",
    label: "Under Contract",
    appliesTo: ["buyer", "seller", "dual", "listing"],
    tasks: [
      // Shared
      { id: "psa_uploaded",            name: "Executed Purchase & Sale uploaded",               required: true,  source: "system", side: "both" },
      { id: "effective_date",          name: "Effective date confirmed",                        required: true,  source: "system", side: "both" },
      { id: "earnest_money",           name: "Earnest money received/confirmed",                required: true,  source: "system", side: "both" },
      { id: "add_all_parties",         name: "Add all parties (buyer, seller, lender, title)", required: true,  source: "system", side: "both" },
      { id: "confirm_escrow",          name: "Confirm escrow / title company",                  required: true,  source: "system", side: "both" },
      { id: "enter_critical_dates",    name: "Enter all critical dates into system",            required: true,  source: "system", side: "both" },
      { id: "timeline_email",          name: "Timeline email sent to all parties",              required: true,  source: "system", side: "both" },
      { id: "verify_signatures",       name: "Verify all signatures",                           required: true,  source: "system", side: "both" },
      { id: "calendar_sync",           name: "Deadlines synced to calendar",                   required: false, source: "system", side: "both" },
      // Seller-side only
      { id: "seller_disclosures_uctr", name: "Seller disclosures sent to buyer",               required: true,  source: "system", side: "seller" },
      { id: "review_offer",            name: "Review offer with seller",                        required: true,  source: "system", side: "seller" },
      { id: "add_buyer_agent",         name: "Add buyer's agent contact info",                  required: true,  source: "system", side: "seller" },
      { id: "coordinate_inspection_seller", name: "Coordinate inspection access with seller",  required: true,  source: "system", side: "seller" },
      // Buyer-side only
      { id: "buyer_agency",            name: "Buyer agency agreement uploaded",                 required: true,  source: "system", side: "buyer" },
      { id: "add_lender",              name: "Add lender contact info",                         required: true,  source: "system", side: "buyer" },
      { id: "order_inspection",        name: "Order home inspection",                           required: true,  source: "system", side: "buyer" },
      { id: "track_appraisal",         name: "Track appraisal order",                          required: true,  source: "system", side: "buyer" },
      { id: "send_timeline_buyer",     name: "Send deadline timeline to buyer",                 required: true,  source: "system", side: "buyer" },
    ],
  },
  {
    phaseNum: 4,
    phaseId: "due_diligence",
    label: "Due Diligence",
    appliesTo: ["buyer", "seller", "dual"],
    tasks: [
      { id: "inspection_ordered",      name: "Inspection ordered",                              required: true,  source: "system" },
      { id: "inspection_scheduled",    name: "Inspection scheduled",                            required: true,  source: "system" },
      { id: "inspection_completed",    name: "Inspection completed",                            required: true,  source: "system" },
      { id: "inspection_report",       name: "Inspection report uploaded",                      required: true,  source: "system" },
      { id: "repair_negotiations",     name: "Repair negotiations completed",                   required: true,  source: "system" },
      { id: "inspection_addendum",     name: "Inspection addendum drafted (if applicable)",    required: false, source: "system" },
      { id: "contingency_removed",     name: "Inspection contingency removed",                  required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 5,
    phaseId: "pending",
    label: "Pending",
    appliesTo: ["buyer", "seller", "dual"],
    tasks: [
      { id: "appraisal_ordered",       name: "Appraisal ordered",                              required: true,  source: "system" },
      { id: "appraisal_scheduled",     name: "Appraisal scheduled",                            required: true,  source: "system" },
      { id: "appraisal_received",      name: "Appraisal received",                             required: true,  source: "system" },
      { id: "lender_docs",             name: "Buyer submitted lender documents",               required: true,  source: "system" },
      { id: "conditional_approval",    name: "Conditional approval received",                  required: true,  source: "system" },
      { id: "conditions_cleared",      name: "Loan conditions cleared",                        required: true,  source: "system" },
      { id: "ctc_received",            name: "Clear to close received",                        required: true,  source: "system" },
      { id: "title_completed",         name: "Title work completed",                           required: true,  source: "system" },
      { id: "alta_cd_received",        name: "ALTA/CD received",                               required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 6,
    phaseId: "closing",
    label: "Closing",
    appliesTo: ["buyer", "seller", "dual"],
    tasks: [
      { id: "closing_scheduled",       name: "Closing scheduled",                              required: true,  source: "system" },
      { id: "walkthrough_scheduled",   name: "Final walkthrough scheduled",                    required: true,  source: "system" },
      { id: "walkthrough_completed",   name: "Final walkthrough completed",                    required: true,  source: "system" },
      { id: "docs_signed",             name: "Closing documents signed",                       required: true,  source: "system" },
      { id: "funds_received",          name: "Funds received",                                 required: true,  source: "system" },
      { id: "deed_recorded",           name: "Deed recorded",                                  required: true,  source: "system" },
      { id: "commission_submitted",    name: "Commission statement submitted",                 required: true,  source: "system" },
      { id: "hud_alta_uploaded",       name: "HUD/ALTA uploaded",                              required: true,  source: "system" },
    ],
  },
  {
    phaseNum: 7,
    phaseId: "post_close",
    label: "Post-Close",
    appliesTo: ["buyer", "seller", "dual"],
    tasks: [
      { id: "docs_to_skyslope",        name: "All documents uploaded to SkySlope",             required: true,  source: "system" },
      { id: "mls_closed",              name: "Transaction marked closed in MLS",               required: true,  source: "system" },
      { id: "client_followup",         name: "Client follow-up initiated",                     required: true,  source: "system" },
      { id: "client_gift",             name: "Client gift ordered",                            required: false, source: "system" },
      { id: "start_followup_campaign", name: "Start follow-up campaign",                       required: false, source: "system" },
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

/**
 * Get phases relevant to a transaction type
 */
export function getPhasesForType(transactionType) {
  return PHASE_TASK_LIBRARY.filter(p =>
    !p.appliesTo || p.appliesTo.includes(transactionType)
  );
}

/** Starting phase number based on deal type */
export function getStartingPhase(dealType) {
  return dealType === "listing" ? 1 : 3;
}
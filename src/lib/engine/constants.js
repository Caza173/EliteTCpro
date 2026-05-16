/**
 * EliteTC Transaction Intelligence Engine — Constants
 * Single source of truth for all business rules, thresholds, and labels.
 */

export const TIMEZONE = "America/New_York";

// ─── Phase Definitions ────────────────────────────────────────────────────────
export const PHASES = {
  intake:          { num: 1, label: "Intake",          order: 1 },
  under_contract:  { num: 2, label: "Under Contract",  order: 2 },
  inspection:      { num: 3, label: "Inspection",      order: 3 },
  financing:       { num: 4, label: "Financing",       order: 4 },
  appraisal:       { num: 5, label: "Appraisal",       order: 5 },
  title:           { num: 6, label: "Title",           order: 6 },
  pre_closing:     { num: 7, label: "Pre-Closing",     order: 7 },
  closing:         { num: 8, label: "Closing",         order: 8 },
  closed:          { num: 9, label: "Closed",          order: 9 },
};

// ─── Deadline Field Registry ──────────────────────────────────────────────────
export const DEADLINE_FIELDS = [
  {
    key:          "earnest_money_deadline",
    label:        "Earnest Money Deposit",
    type:         "earnest_money",
    completedKey: "earnest_money_received",
    criticalDays: 1,
    warningDays:  3,
  },
  {
    key:          "inspection_deadline",
    label:        "Inspection Deadline",
    type:         "inspection",
    completedKey: "inspection_completed",
    criticalDays: 1,
    warningDays:  3,
  },
  {
    key:         "due_diligence_deadline",
    label:       "Due Diligence",
    type:        "due_diligence",
    criticalDays: 1,
    warningDays:  3,
  },
  {
    key:         "financing_deadline",
    label:       "Financing Commitment",
    type:        "financing",
    criticalDays: 2,
    warningDays:  5,
  },
  {
    key:         "appraisal_deadline",
    label:       "Appraisal Deadline",
    type:        "appraisal",
    criticalDays: 1,
    warningDays:  3,
  },
  {
    key:         "ctc_target",
    label:       "Clear to Close Target",
    type:        "ctc",
    criticalDays: 0,
    warningDays:  2,
  },
  {
    key:         "closing_date",
    label:       "Closing Date",
    type:        "closing",
    criticalDays: 2,
    warningDays:  7,
  },
];

// ─── Closed Status Values ─────────────────────────────────────────────────────
export const CLOSED_STATUSES = new Set([
  "closed", "closed successfully", "closed & funded",
  "archived", "expired", "withdrawn", "cancelled", "canceled", "terminated",
]);

// ─── Risk Weights ─────────────────────────────────────────────────────────────
export const RISK_WEIGHTS = {
  overdue_closing:          40,
  overdue_financing:        35,
  missing_psa_signature:    30,
  overdue_emd:              25,
  closing_within_48h_no_title: 30,
  overdue_inspection:       20,
  appraisal_pending:        15,
  incomplete_disclosures:   15,
  missing_required_doc:     10,
  no_contract_date:         10,
  overdue_due_diligence:    20,
  closing_soon_30d:          5,
};

// ─── Required Documents by Transaction Type ───────────────────────────────────
export const REQUIRED_DOCS_BY_TYPE = {
  buyer: [
    "purchase_and_sale",
    "buyer_agency_agreement",
    "disclosure",
  ],
  seller: [
    "listing_agreement",
    "disclosure",
    "purchase_and_sale",
  ],
  dual: [
    "purchase_and_sale",
    "listing_agreement",
    "buyer_agency_agreement",
    "disclosure",
  ],
};

export const REQUIRED_DOCS_LEAD_PAINT = "lead_paint_disclosure"; // if year_built <= 1978

// ─── Phase → Minimum Phase Number Mapping ────────────────────────────────────
export const PHASE_STRING_TO_NUM = {
  intake:         1,
  under_contract: 2,
  inspection:     3,
  financing:      4,
  appraisal:      5,
  clear_to_close: 6,
  closing:        7,
  closed:         8,
};
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Add calendar days to a YYYY-MM-DD date string
function addDays(isoDate, days) {
  if (!isoDate || days == null || isNaN(Number(days))) return null;
  try {
    const d = new Date(isoDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
    return d.toISOString().split("T")[0];
  } catch { return null; }
}

// Subtract hours from a YYYY-MM-DD date string (returns ISO datetime string)
function subtractHours(isoDate, hours) {
  if (!isoDate || hours == null) return null;
  try {
    const d = new Date(isoDate + "T23:59:00Z");
    d.setUTCHours(d.getUTCHours() - Math.round(Number(hours)));
    return d.toISOString();
  } catch { return null; }
}

// Build a confidence-annotated field object
function field(value, confidence, source_section, note = null) {
  return { value, confidence, source_section, ...(note ? { note } : {}) };
}

// Apply all relative-date calculations from extracted day-counts + effective date
function calculateDeadlines(raw, effectiveDate) {
  const calc = {};

  // Section 3 — Earnest money initial deposit
  if (raw.earnest_money_days > 0) {
    calc.earnest_money_initial_deadline = field(
      addDays(effectiveDate, raw.earnest_money_days),
      "MEDIUM", "Section 3",
      `Calculated: effective_date + ${raw.earnest_money_days} days`
    );
  } else if (raw.earnest_money_deadline_explicit) {
    calc.earnest_money_initial_deadline = field(raw.earnest_money_deadline_explicit, "HIGH", "Section 3");
  }

  // Section 3 — Additional deposit
  if (raw.additional_emd_date_explicit) {
    calc.additional_emd_deadline = field(raw.additional_emd_date_explicit, "HIGH", "Section 3");
  }

  // Section 15 — Inspection (MAX of all YES inspections)
  const inspDays = [
    raw.general_building_days, raw.sewage_days, raw.water_quality_days,
    raw.radon_air_days, raw.radon_water_days, raw.lead_paint_days,
    raw.pest_days, raw.hazardous_waste_days,
    raw.custom_inspection_i_days, raw.custom_inspection_j_days,
  ].filter(d => d > 0).map(Number);

  if (inspDays.length > 0) {
    const maxDays = Math.max(...inspDays);
    calc.inspection_deadline = field(
      addDays(effectiveDate, maxDays),
      "MEDIUM", "Section 15",
      `Calculated: effective_date + ${maxDays} days (MAX across YES inspections)`
    );
    calc.inspection_deadline_days = maxDays;
  } else if (raw.inspection_deadline_explicit) {
    calc.inspection_deadline = field(raw.inspection_deadline_explicit, "HIGH", "Section 15");
  }

  // Section 15 — Response periods (event-relative, not effective-date-relative)
  calc.inspection_seller_response_days = field(raw.inspection_seller_response_days || 5, "HIGH", "Section 15", "Relative to receipt of buyer notification");
  calc.inspection_buyer_response_days  = field(raw.inspection_buyer_response_days  || 5, "HIGH", "Section 15", "Relative to seller notification");

  // Section 16 — Due diligence
  if (raw.due_diligence_days > 0) {
    calc.due_diligence_deadline = field(
      addDays(effectiveDate, raw.due_diligence_days),
      "MEDIUM", "Section 16",
      `Calculated: effective_date + ${raw.due_diligence_days} days`
    );
  } else if (raw.due_diligence_deadline_explicit) {
    calc.due_diligence_deadline = field(raw.due_diligence_deadline_explicit, "HIGH", "Section 16");
  }

  // Section 9 — Title resolution (event-relative)
  calc.title_resolution_days = field(raw.title_resolution_days || 30, "HIGH", "Section 9", "Relative to notification of title defect");

  // Section 6 — Final walkthrough window
  if (raw.walkthrough_hours_prior > 0 && raw.closing_date) {
    calc.final_walkthrough_latest = field(
      subtractHours(raw.closing_date, raw.walkthrough_hours_prior),
      "MEDIUM", "Section 6",
      `Calculated: closing_date - ${raw.walkthrough_hours_prior} hours`
    );
    calc.walkthrough_hours_prior = raw.walkthrough_hours_prior;
  }

  // Section 19 — Financing
  if (raw.financing_commitment_date_explicit) {
    calc.financing_commitment_date = field(raw.financing_commitment_date_explicit, "HIGH", "Section 19");
  } else if (raw.financing_application_days > 0) {
    calc.financing_application_deadline = field(
      addDays(effectiveDate, raw.financing_application_days),
      "MEDIUM", "Section 19",
      `Calculated: effective_date + ${raw.financing_application_days} days`
    );
  }

  // Optional addendum fields
  if (raw.appraisal_days > 0) {
    calc.appraisal_deadline = field(addDays(effectiveDate, raw.appraisal_days), "MEDIUM", "Addendum/Clause", `Calculated: effective_date + ${raw.appraisal_days} days`);
  } else if (raw.appraisal_deadline_explicit) {
    calc.appraisal_deadline = field(raw.appraisal_deadline_explicit, "HIGH", "Addendum");
  }

  if (raw.buyer_home_sale_deadline_explicit) {
    calc.buyer_home_sale_deadline = field(raw.buyer_home_sale_deadline_explicit, "HIGH", "Addendum");
  }

  if (raw.hoa_review_days > 0) {
    calc.hoa_review_deadline = field(addDays(effectiveDate, raw.hoa_review_days), "MEDIUM", "Addendum/Section 16d", `Calculated: effective_date + ${raw.hoa_review_days} days`);
  }

  if (raw.attorney_review_days > 0) {
    calc.attorney_review_deadline = field(addDays(effectiveDate, raw.attorney_review_days), "MEDIUM", "Addendum", `Calculated: effective_date + ${raw.attorney_review_days} days`);
  }

  if (raw.board_approval_days > 0) {
    calc.board_approval_deadline = field(addDays(effectiveDate, raw.board_approval_days), "MEDIUM", "Addendum", `Calculated: effective_date + ${raw.board_approval_days} days`);
  }

  if (raw.post_closing_occupancy_start) {
    calc.post_closing_occupancy_start = field(raw.post_closing_occupancy_start, "HIGH", "Addendum");
  }
  if (raw.post_closing_occupancy_end) {
    calc.post_closing_occupancy_end = field(raw.post_closing_occupancy_end, "HIGH", "Addendum");
  }

  if (raw.showings_start_date) {
    calc.showings_start_date = field(raw.showings_start_date, "HIGH", "Addendum");
  }

  if (raw.offer_expiration_datetime) {
    calc.offer_expiration_datetime = field(raw.offer_expiration_datetime, "HIGH", "Offer/Cover Sheet");
  }

  return calc;
}

// Validate that required deadlines exist given detected sections
function validateDeadlines(raw, calc, flags) {
  const errors = [];

  // Section 15 present + any YES inspection → must have inspection deadline
  const anyInspectionYes = raw.inspection_types_yes && raw.inspection_types_yes.length > 0;
  if (anyInspectionYes && !calc.inspection_deadline) {
    errors.push({ field: "inspection_deadline", section: "Section 15", page: 3, message: "Inspection section detected with YES entries but no deadline extracted" });
    flags.push("INSPECTION_DETECTED_NOT_PARSED");
  }

  // Deposit present → EMD deadline must exist
  if ((raw.deposit_amount > 0 || raw.earnest_money_days > 0) && !calc.earnest_money_initial_deadline) {
    errors.push({ field: "earnest_money_initial_deadline", section: "Section 3", page: 1, message: "Deposit detected but no EMD deadline extracted" });
    flags.push("EMD_DETECTED_NOT_PARSED");
  }

  // Due diligence section present → deadline must exist
  if (raw.due_diligence_section_present && !calc.due_diligence_deadline) {
    errors.push({ field: "due_diligence_deadline", section: "Section 16", page: 3, message: "Due Diligence section detected but no deadline extracted" });
    flags.push("DD_DETECTED_NOT_PARSED");
  }

  return errors;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { file_url, transaction_id, brokerage_id } = await req.json();
    if (!file_url) return Response.json({ error: "No file_url provided" }, { status: 400 });

    const debugFlags = [];
    console.log("NHAR P&S Parse — Pass 1: Full structured extraction");

    // ── PASS 1: Full structured extraction ──────────────────────────────────────
    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        description: `NHAR (New Hampshire Association of REALTORS) Purchase & Sales Agreement — 2025 Standard Form (6 pages).

KEY CONTRACT RULES (Section 23):
- ALL "within X days" deadlines are CALENDAR DAYS counted from the EFFECTIVE DATE
- Day 1 = first day AFTER the effective date
- Deadline ends at 12:00 midnight Eastern Time on the last day
- EFFECTIVE DATE = date contract is fully signed AND that fact communicated in writing (top of Page 1)

SECTION-BY-SECTION EXTRACTION GUIDE:

PAGE 1 — EFFECTIVE DATE: In the box at the top right of Page 1. Format: written date + "EFFECTIVE DATE". Extract as YYYY-MM-DD.

SECTION 1 (Page 1): Parties and property address. Format: "[SELLER NAME] (SELLER) of [SELLER ADDRESS] ... and [BUYER NAME] (BUYER) of [BUYER ADDRESS]".
  - Extract FULL SELLER ADDRESS (street, city, state, zip) from the line after SELLER name
  - This seller address is the PROPERTY ADDRESS
  - Buyer address is a different address and should NOT be used for property_address

SECTION 3 (Page 1): Financials & earnest money.
- SELLING PRICE: dollar value on same line or line after "SELLING PRICE is _____ Dollars $___"
- DEPOSIT AMOUNT: dollar value after "deposit of earnest money in the amount of $___"  
- EARNEST MONEY DAYS: integer in "within ___days of the EFFECTIVE DATE" — THIS IS A FILL-IN BLANK, extract the number written in the blank
- ADDITIONAL DEPOSIT: dollar amount after "additional deposit of earnest money in the amount of $___"
- ADDITIONAL DEPOSIT DATE: date after "will be delivered on or before ___"

SECTION 5 (Page 1): Transfer of Title / Closing. "On or before [DATE] at [LOCATION]". Extract date as YYYY-MM-DD.

SECTION 6 (Page 1): Walkthrough. "within ___hours prior to time of closing". Extract the hours integer.

SECTION 7 (Page 1): Agent names and roles. Two agents listed with checkboxes for role type.

SECTION 9 (Page 2): Title. "not to exceed thirty (30) days from the date of notification". Always 30 days.

SECTION 15 (Pages 2-3): Inspections table. 10 inspection types (a through j):
  a. General Building, b. Sewage Disposal, c. Water Quality, d. Radon Air Quality, e. Radon Water Quality,
  f. Lead Paint, g. Pests, h. Hazardous Waste, i. (custom), j. (custom)
  Each row has YES checkbox, NO checkbox, and "within ___days" fill-in.
  ONLY extract day values for rows where YES is checked/marked.
  Response periods (Section 15 text): "within five (5) days of receipt" for seller, "within five (5) days" for buyer.

SECTION 16 (Page 3): Due Diligence. "BUYER must notify SELLER in writing within ___days from the effective date". Extract the integer from the blank.
  Also note whether due diligence items (a-g) are checked YES.

SECTION 19 (Page 4): Financing. 
  - Application days: "within __ calendar days from the effective date, submit a complete and accurate application"
  - Financing Deadline: explicit date in "If BUYER provides written evidence of inability to obtain financing to SELLER by ___ (Financing Deadline)"

SECTION 20 (Page 5): Additional Provisions, Concessions, Professional Fee.`,
        properties: {
          // ── Core parties & property
           buyer_names:               { type: "string",  description: "Buyer name(s) from Section 1. On the line after 'BUYER' parenthesis. Appears AFTER 'and' keyword. E.g., 'Micheal J Fox and Mary J Fox'." },
           seller_names:              { type: "string",  description: "Seller name(s) from Section 1. On the first line after 'THIS AGREEMENT made this [date] between'. This is the FIRST name(s) before 'and'. E.g., 'Gordon Ramsey'." },
          acceptance_date:           { type: "string",  description: "Effective date in YYYY-MM-DD from the box at top right of Page 1. This is the master anchor for all relative deadlines." },
          property_address:          { type: "string",  description: "SELLER'S ADDRESS from Section 1 — this is the PROPERTY ADDRESS. Appears on the line after 'SELLER' name. Format: street address, City/Town, State ZIP. Do NOT use buyer address." },
          property_city:             { type: "string",  description: "City/Town of property from Section 2." },

          // ── Section 3 financials
          purchase_price:            { type: "number",  description: "Selling price dollar amount. May appear after 'SELLING PRICE is' or on next line. No $ or commas." },
          deposit_amount:            { type: "number",  description: "Initial earnest money deposit amount. After 'deposit of earnest money in the amount of $'. No $ or commas." },
          earnest_money_days:        { type: "number",  description: "INTEGER in the blank: 'within ___days of the EFFECTIVE DATE' in Section 3. This is the key field — always extract it. E.g. if blank says '3', return 3." },
          earnest_money_deadline_explicit: { type: "string", description: "Explicit calendar date for earnest money if written as 'on or before [date]'. YYYY-MM-DD. Usually null." },
          additional_emd_amount:     { type: "number",  description: "Additional earnest money deposit amount from Section 3. No $ or commas." },
          additional_emd_date_explicit: { type: "string", description: "Date in 'additional deposit ... will be delivered on or before [date]'. YYYY-MM-DD." },
          remainder_amount:          { type: "number",  description: "Remainder of purchase price (wire/certified check amount) from Section 3." },
          escrow_agent:              { type: "string",  description: "Escrow agent name from Section 3." },

          // ── Section 5
          closing_date:              { type: "string",  description: "Transfer of Title date in YYYY-MM-DD from Section 5 'On or before [date]'." },
          closing_location:          { type: "string",  description: "Location of closing from Section 5." },

          // ── Section 6
          walkthrough_hours_prior:   { type: "number",  description: "INTEGER hours before closing for walkthrough. From 'within ___hours prior to time of closing' in Section 6." },

          // ── Section 7 agents
          buyer_agent:               { type: "string",  description: "Buyer agent full name from Section 7 REPRESENTATION. Look for the agent name with 'buyer agent' checkbox CHECKED. E.g., 'Scottie Pippen'." },
          seller_agent:              { type: "string",  description: "Seller/listing agent full name from Section 7 REPRESENTATION. Look for the agent name with 'seller agent' checkbox CHECKED. E.g., 'Micheal Jordan'." },
          buyer_brokerage:           { type: "string",  description: "Buyer agent brokerage/firm name from Section 7 REPRESENTATION. The firm name next to the buyer agent name (where buyer agent checkbox is CHECKED). E.g., 'Chicago Bulls Realty'." },
          seller_brokerage:          { type: "string",  description: "Seller agent brokerage/firm name from Section 7 REPRESENTATION. The firm name next to the seller agent name (where seller agent checkbox is CHECKED). E.g., 'Realty One Group Next Level'." },
          buyer_agent_role:          { type: "string",  description: "Checked role for buyer agent: 'buyer agent', 'seller agent', 'facilitator', or 'disclosed dual agent'." },
          seller_agent_role:         { type: "string",  description: "Checked role for seller agent: 'buyer agent', 'seller agent', 'facilitator', or 'disclosed dual agent'." },

          // ── Section 9
          title_resolution_days:     { type: "number",  description: "Days to resolve title defect. Standard is 30. From Section 9 'not to exceed thirty (30) days'." },

          // ── Section 15 — per-inspection-type day values (only if YES checked)
          inspection_types_yes:      { type: "string",  description: "Comma-separated list of inspection types with YES checked in Section 15. E.g. 'General Building, Sewage Disposal, Radon Air Quality'." },
          general_building_days:     { type: "number",  description: "Days for General Building inspection (row a) IF YES is checked. INTEGER from 'within ___days'. 0 if NO or blank." },
          sewage_days:               { type: "number",  description: "Days for Sewage Disposal inspection (row b) IF YES is checked. 0 if NO or blank." },
          water_quality_days:        { type: "number",  description: "Days for Water Quality inspection (row c) IF YES is checked. 0 if NO or blank." },
          radon_air_days:            { type: "number",  description: "Days for Radon Air Quality inspection (row d) IF YES is checked. 0 if NO or blank." },
          radon_water_days:          { type: "number",  description: "Days for Radon Water Quality inspection (row e) IF YES is checked. 0 if NO or blank." },
          lead_paint_days:           { type: "number",  description: "Days for Lead Paint inspection (row f) IF YES is checked. 0 if NO or blank." },
          pest_days:                 { type: "number",  description: "Days for Pests inspection (row g) IF YES is checked. 0 if NO or blank." },
          hazardous_waste_days:      { type: "number",  description: "Days for Hazardous Waste inspection (row h) IF YES is checked. 0 if NO or blank." },
          custom_inspection_i_days:  { type: "number",  description: "Days for custom inspection type (row i) IF YES is checked. 0 if NO or blank." },
          custom_inspection_j_days:  { type: "number",  description: "Days for custom inspection type (row j) IF YES is checked. 0 if NO or blank." },
          custom_inspection_i_name:  { type: "string",  description: "Name of custom inspection type row i if filled in." },
          custom_inspection_j_name:  { type: "string",  description: "Name of custom inspection type row j if filled in." },
          inspection_deadline_explicit: { type: "string", description: "Explicit calendar inspection deadline if written as a date. YYYY-MM-DD. Usually null — typically calculated from days." },
          inspection_seller_response_days: { type: "number", description: "Days for seller to respond to inspection issues. Standard is 5. From 'within five (5) days of receipt'." },
          inspection_buyer_response_days:  { type: "number", description: "Days for buyer to respond to seller notification. Standard is 5. From 'within five (5) days'." },

          // ── Section 16 — Due diligence
          due_diligence_days:        { type: "number",  description: "INTEGER from blank in Section 16: 'BUYER must notify SELLER in writing within ___days from the effective date'. Always extract this." },
          due_diligence_deadline_explicit: { type: "string", description: "Explicit due diligence deadline as calendar date. YYYY-MM-DD. Usually null." },
          due_diligence_section_present: { type: "boolean", description: "True if Section 16 Due Diligence section is present/applicable in the contract." },

          // ── Section 19 — Financing
          financing_contingency:     { type: "boolean", description: "True if financing contingency checkbox IS checked (not 'is not'). Section 19." },
          financing_amount:          { type: "number",  description: "Loan amount from Section 19 financing terms." },
          financing_term_years:      { type: "number",  description: "Loan term in years from Section 19." },
          financing_rate:            { type: "string",  description: "Interest rate from Section 19." },
          financing_mortgage_type:   { type: "string",  description: "Mortgage type (conventional, FHA, VA, etc.) from Section 19." },
          financing_application_days:{ type: "number",  description: "INTEGER: Days from effective date to submit mortgage application. From 'within __ calendar days from the effective date, submit a complete and accurate application'." },
          financing_commitment_date_explicit: { type: "string", description: "Explicit financing deadline date from 'BUYER provides written evidence ... by [DATE] (Financing Deadline)'. YYYY-MM-DD." },

          // ── Section 20
          seller_concession_amount:  { type: "number",  description: "Seller concession dollar amount from Section 20 CONCESSIONS." },
          professional_fee:          { type: "string",  description: "Professional fee terms from Section 20 PROFESSIONAL FEE." },
          addenda_attached:          { type: "boolean", description: "True if addenda attached checkbox is YES in Section 21." },

          // ── Optional addendum fields (detect if present)
          appraisal_days:            { type: "number",  description: "Days for appraisal contingency if mentioned in addendum. 0 if not present." },
          appraisal_deadline_explicit: { type: "string", description: "Explicit appraisal deadline if stated. YYYY-MM-DD." },
          hoa_review_days:           { type: "number",  description: "Days for HOA/condo document review if mentioned. 0 if not present." },
          attorney_review_days:      { type: "number",  description: "Days for attorney review if mentioned in addendum. 0 if not present." },
          board_approval_days:       { type: "number",  description: "Days for board approval contingency if mentioned. 0 if not present." },
          buyer_home_sale_deadline_explicit: { type: "string", description: "Date for buyer's home sale contingency deadline if present. YYYY-MM-DD." },
          post_closing_occupancy_start: { type: "string", description: "Post-closing occupancy start date if addendum present. YYYY-MM-DD." },
          post_closing_occupancy_end:   { type: "string", description: "Post-closing occupancy end date if addendum present. YYYY-MM-DD." },
          showings_start_date:       { type: "string",  description: "Date from which showings are permitted if 'no showings until' clause present. YYYY-MM-DD." },
          offer_expiration_datetime: { type: "string",  description: "Offer expiration date/time if present on cover or offer page. ISO format." },

          // ── Title company
          title_company:             { type: "string",  description: "Closing/title/escrow company name." },
        }
      }
    });

    if (extraction.status === "error") {
      console.error("Pass 1 extraction failed:", extraction.details);
      return Response.json({ error: extraction.details || "Extraction failed" }, { status: 500 });
    }

    let raw = extraction.output || {};
    console.log("Pass 1 raw:", {
      acceptance_date: raw.acceptance_date,
      earnest_money_days: raw.earnest_money_days,
      general_building_days: raw.general_building_days,
      sewage_days: raw.sewage_days,
      due_diligence_days: raw.due_diligence_days,
      closing_date: raw.closing_date,
      financing_commitment_date_explicit: raw.financing_commitment_date_explicit,
    });

    // ── PASS 2: Financial fallback (price/deposit multi-line scan) ─────────────
    if (!raw.purchase_price || !raw.deposit_amount) {
      console.log("Pass 2: Financial fallback");
      const fb2 = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          description: `NHAR P&S — financial field extraction only.
SELLING PRICE: Find 'SELLING PRICE is ___ Dollars $___'. Dollar amount may be on next line. Extract first $###,### value after this label.
DEPOSIT: Find 'deposit of earnest money in the amount of $___'. Dollar amount may be on next line. Extract first $###,### value.
Strip $ and commas. Return plain numbers.`,
          properties: {
            purchase_price: { type: "number", description: "Dollar amount at or within 3 lines after 'SELLING PRICE'." },
            deposit_amount: { type: "number", description: "Dollar amount at or within 3 lines after 'deposit of earnest money in the amount of'." },
          }
        }
      });
      if (fb2.status !== "error" && fb2.output) {
        if (!raw.purchase_price && fb2.output.purchase_price) raw.purchase_price = fb2.output.purchase_price;
        if (!raw.deposit_amount && fb2.output.deposit_amount) raw.deposit_amount = fb2.output.deposit_amount;
      }
    }

    // ── PASS 3: Relative deadline OCR reinforcement ────────────────────────────
    // Run if any deadline day count is missing and we have an effective date
    const missingAnyDeadline = (!raw.earnest_money_days && !raw.earnest_money_deadline_explicit)
      || (!raw.general_building_days && !raw.inspection_deadline_explicit)
      || (!raw.due_diligence_days && !raw.due_diligence_deadline_explicit);

    if (missingAnyDeadline && raw.acceptance_date) {
      console.log("Pass 3: OCR reinforcement for relative deadlines (Sections 3, 15, 16)");
      const fb3 = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          description: `NHAR P&S — extract ONLY the fill-in-blank day integers from Sections 3, 15, and 16.

SECTION 3 rule: Find the sentence "BUYER has delivered, or will deliver to the ESCROW AGENT's FIRM within ___days of the EFFECTIVE DATE". The blank has a handwritten or typed number. Extract it as earnest_money_days.

SECTION 15 rule: Look at the inspection table on Page 3. For each row (a through j), check if YES is marked. For every YES row, there is a "within ___days" blank — extract the integer in that blank. Return 0 for NO rows or blank rows.

SECTION 16 rule: Find "BUYER must notify SELLER in writing within ___days from the effective date of the Agreement". Extract the integer from the blank as due_diligence_days.

Return -1 if the section is present but the blank is illegible. Return 0 if the section is absent.`,
          properties: {
            earnest_money_days:      { type: "number", description: "INTEGER from Section 3 blank 'within ___days of the EFFECTIVE DATE'. Return -1 if section present but blank illegible." },
            general_building_days:   { type: "number", description: "INTEGER from row (a) General Building IF YES checked. 0 if NO. -1 if illegible." },
            sewage_days:             { type: "number", description: "INTEGER from row (b) Sewage Disposal IF YES checked. 0 if NO." },
            water_quality_days:      { type: "number", description: "INTEGER from row (c) Water Quality IF YES checked. 0 if NO." },
            radon_air_days:          { type: "number", description: "INTEGER from row (d) Radon Air Quality IF YES checked. 0 if NO." },
            radon_water_days:        { type: "number", description: "INTEGER from row (e) Radon Water Quality IF YES checked. 0 if NO." },
            lead_paint_days:         { type: "number", description: "INTEGER from row (f) Lead Paint IF YES checked. 0 if NO." },
            pest_days:               { type: "number", description: "INTEGER from row (g) Pests IF YES checked. 0 if NO." },
            hazardous_waste_days:    { type: "number", description: "INTEGER from row (h) Hazardous Waste IF YES checked. 0 if NO." },
            due_diligence_days:      { type: "number", description: "INTEGER from Section 16 blank 'within ___days from the effective date'. Return -1 if section present but blank illegible." },
            inspection_types_yes:    { type: "string", description: "Comma-separated list of inspection type names that have YES checked." },
          }
        }
      });

      if (fb3.status !== "error" && fb3.output) {
        const fb = fb3.output;
        console.log("Pass 3 result:", fb);

        // Apply positive values only (-1 = detected/illegible, 0 = absent)
        if (!raw.earnest_money_days && fb.earnest_money_days > 0)    raw.earnest_money_days    = fb.earnest_money_days;
        if (!raw.general_building_days && fb.general_building_days > 0) raw.general_building_days = fb.general_building_days;
        if (!raw.sewage_days && fb.sewage_days > 0)                   raw.sewage_days           = fb.sewage_days;
        if (!raw.water_quality_days && fb.water_quality_days > 0)     raw.water_quality_days    = fb.water_quality_days;
        if (!raw.radon_air_days && fb.radon_air_days > 0)             raw.radon_air_days        = fb.radon_air_days;
        if (!raw.radon_water_days && fb.radon_water_days > 0)         raw.radon_water_days      = fb.radon_water_days;
        if (!raw.lead_paint_days && fb.lead_paint_days > 0)           raw.lead_paint_days       = fb.lead_paint_days;
        if (!raw.pest_days && fb.pest_days > 0)                       raw.pest_days             = fb.pest_days;
        if (!raw.hazardous_waste_days && fb.hazardous_waste_days > 0) raw.hazardous_waste_days  = fb.hazardous_waste_days;
        if (!raw.due_diligence_days && fb.due_diligence_days > 0)     raw.due_diligence_days    = fb.due_diligence_days;
        if (!raw.inspection_types_yes && fb.inspection_types_yes)     raw.inspection_types_yes  = fb.inspection_types_yes;

        // Flag illegible sections
        if (fb.earnest_money_days === -1)  debugFlags.push("EMD_SECTION_ILLEGIBLE");
        if (fb.due_diligence_days === -1)  debugFlags.push("DD_SECTION_ILLEGIBLE");
      }
    }

    // ── Calculate all deadlines ────────────────────────────────────────────────
    const effectiveDate = raw.acceptance_date || null;
    const calc = effectiveDate ? calculateDeadlines(raw, effectiveDate) : {};

    // ── Validate ───────────────────────────────────────────────────────────────
    const validationErrors = validateDeadlines(raw, calc, debugFlags);

    // ── Mark undetected financial fields ──────────────────────────────────────
    if (!raw.purchase_price)  debugFlags.push("PURCHASE_PRICE_NOT_FOUND");
    if (!raw.deposit_amount)  debugFlags.push("DEPOSIT_AMOUNT_NOT_FOUND");
    if (!effectiveDate)       debugFlags.push("EFFECTIVE_DATE_NOT_FOUND");

    // ── Build final output ─────────────────────────────────────────────────────
    const output = {
      // Raw extracted values
      raw: {
        buyer_names:                   raw.buyer_names || null,
        seller_names:                  raw.seller_names || null,
        acceptance_date:               raw.acceptance_date || null,
        property_address:              raw.property_address || null,
        property_city:                 raw.property_city || null,
        purchase_price:                raw.purchase_price || null,
        deposit_amount:                raw.deposit_amount || null,
        additional_emd_amount:         raw.additional_emd_amount || null,
        additional_emd_date_explicit:  raw.additional_emd_date_explicit || null,
        closing_date:                  raw.closing_date || null,
        closing_location:              raw.closing_location || null,
        escrow_agent:                  raw.escrow_agent || null,
        title_company:                 raw.title_company || null,
        buyer_agent:                   raw.buyer_agent || null,
        seller_agent:                  raw.seller_agent || null,
        buyer_brokerage:               raw.buyer_brokerage || null,
        seller_brokerage:              raw.seller_brokerage || null,
        buyer_agent_role:              raw.buyer_agent_role || null,
        seller_agent_role:             raw.seller_agent_role || null,
        financing_contingency:         raw.financing_contingency || false,
        financing_amount:              raw.financing_amount || null,
        financing_term_years:          raw.financing_term_years || null,
        financing_rate:                raw.financing_rate || null,
        financing_mortgage_type:       raw.financing_mortgage_type || null,
        seller_concession_amount:      raw.seller_concession_amount || null,
        professional_fee:              raw.professional_fee || null,
        addenda_attached:              raw.addenda_attached || false,
        inspection_types_yes:          raw.inspection_types_yes || null,
        // Day counts
        earnest_money_days:            raw.earnest_money_days || null,
        general_building_days:         raw.general_building_days || null,
        sewage_days:                   raw.sewage_days || null,
        water_quality_days:            raw.water_quality_days || null,
        radon_air_days:                raw.radon_air_days || null,
        radon_water_days:              raw.radon_water_days || null,
        lead_paint_days:               raw.lead_paint_days || null,
        pest_days:                     raw.pest_days || null,
        hazardous_waste_days:          raw.hazardous_waste_days || null,
        custom_inspection_i_days:      raw.custom_inspection_i_days || null,
        custom_inspection_i_name:      raw.custom_inspection_i_name || null,
        custom_inspection_j_days:      raw.custom_inspection_j_days || null,
        custom_inspection_j_name:      raw.custom_inspection_j_name || null,
        due_diligence_days:            raw.due_diligence_days || null,
        walkthrough_hours_prior:       raw.walkthrough_hours_prior || null,
        financing_application_days:    raw.financing_application_days || null,
      },

      // Calculated deadline fields (with confidence scoring)
      deadlines: calc,

      // Top-level flattened fields (backward compat with frontend)
      buyer_names:               raw.buyer_names || null,
      seller_names:              raw.seller_names || null,
      acceptance_date:           raw.acceptance_date || null,
      property_address:          raw.property_address || null,
      purchase_price:            raw.purchase_price || null,
      deposit_amount:            raw.deposit_amount || null,
      closing_date:              raw.closing_date || null,
      buyer_agent:               raw.buyer_agent || null,
      seller_agent:              raw.seller_agent || null,
      buyer_brokerage:           raw.buyer_brokerage || null,
      seller_brokerage:          raw.seller_brokerage || null,
      title_company:             raw.title_company || null,
      financing_contingency:     raw.financing_contingency || false,
      seller_concession_amount:  raw.seller_concession_amount || null,
      // Flattened deadline dates for direct use
      earnest_money_deadline:    calc.earnest_money_initial_deadline?.value || null,
      inspection_deadline:       calc.inspection_deadline?.value || null,
      due_diligence_deadline:    calc.due_diligence_deadline?.value || null,
      financing_commitment_date: calc.financing_commitment_date?.value || calc.financing_application_deadline?.value || raw.financing_commitment_date_explicit || null,
      appraisal_deadline:        calc.appraisal_deadline?.value || null,

      // Validation & debug
      validation_errors: validationErrors,
      _debug: {
        passes_run: missingAnyDeadline ? 3 : ((!raw.purchase_price || !raw.deposit_amount) ? 2 : 1),
        effective_date_found: !!effectiveDate,
        flags: debugFlags,
        confidence_summary: {
          effective_date:       effectiveDate ? "HIGH" : "LOW",
          earnest_money:        calc.earnest_money_initial_deadline?.confidence || "LOW",
          inspection:           calc.inspection_deadline?.confidence || "LOW",
          due_diligence:        calc.due_diligence_deadline?.confidence || "LOW",
          financing:            calc.financing_commitment_date?.confidence || "LOW",
        }
      }
    };

    console.log("Final result:", {
      acceptance_date: output.acceptance_date,
      earnest_money_deadline: output.earnest_money_deadline,
      inspection_deadline: output.inspection_deadline,
      due_diligence_deadline: output.due_diligence_deadline,
      financing_commitment_date: output.financing_commitment_date,
      closing_date: output.closing_date,
      validation_errors: validationErrors.length,
      flags: debugFlags,
    });

    // ── Auto-create Contingency records if transaction_id provided ─────────────
    if (transaction_id && effectiveDate) {
      const contingenciesToCreate = [];

      const inspTypes = [
        { key: "general_building_days",   label: "General Building" },
        { key: "sewage_days",             label: "Sewage / Septic" },
        { key: "water_quality_days",      label: "Water Quality" },
        { key: "radon_air_days",          label: "Radon Air Quality" },
        { key: "radon_water_days",        label: "Radon Water Quality" },
        { key: "lead_paint_days",         label: "Lead Paint" },
        { key: "pest_days",               label: "Pests" },
        { key: "hazardous_waste_days",    label: "Hazardous Waste" },
        { key: "custom_inspection_i_days",label: raw.custom_inspection_i_name || "Custom Inspection (i)" },
        { key: "custom_inspection_j_days",label: raw.custom_inspection_j_name || "Custom Inspection (j)" },
      ];

      for (const { key, label } of inspTypes) {
        if (raw[key] && Number(raw[key]) > 0) {
          contingenciesToCreate.push({
            transaction_id, brokerage_id: brokerage_id || null,
            contingency_type: "Inspection", sub_type: label,
            days_from_effective: Number(raw[key]),
            due_date: addDays(effectiveDate, raw[key]),
            is_active: true, is_custom: false, source: "Parsed", status: "Pending",
          });
        }
      }

      if (raw.due_diligence_days > 0) {
        contingenciesToCreate.push({
          transaction_id, brokerage_id: brokerage_id || null,
          contingency_type: "Due Diligence", sub_type: "Due Diligence Period",
          days_from_effective: Number(raw.due_diligence_days),
          due_date: output.due_diligence_deadline,
          is_active: true, is_custom: false, source: "Parsed", status: "Pending",
        });
      }

      if (raw.financing_contingency && output.financing_commitment_date) {
        contingenciesToCreate.push({
          transaction_id, brokerage_id: brokerage_id || null,
          contingency_type: "Financing", sub_type: "Mortgage Commitment",
          due_date: output.financing_commitment_date,
          is_active: true, is_custom: false, source: "Parsed", status: "Pending",
        });
      }

      if (contingenciesToCreate.length > 0) {
        const existing = await base44.asServiceRole.entities.Contingency.filter({ transaction_id, source: "Parsed" });
        await Promise.all(existing.map(e => base44.asServiceRole.entities.Contingency.delete(e.id)));
        await Promise.all(contingenciesToCreate.map(c => base44.asServiceRole.entities.Contingency.create(c)));
        console.log(`Created ${contingenciesToCreate.length} contingencies`);
        output._contingencies_created = contingenciesToCreate.length;
      }
    }

    return Response.json(output);
  } catch (error) {
    console.error("parsePurchaseAgreementV2 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
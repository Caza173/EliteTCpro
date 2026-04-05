import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function addDays(isoDate, days) {
  if (!isoDate || days == null || isNaN(Number(days))) return null;
  try {
    const d = new Date(isoDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
    return d.toISOString().split("T")[0];
  } catch { return null; }
}

/**
 * Regex-based relative date extractor — runs on raw text returned by AI.
 * Handles all "within X days of the effective date" patterns.
 */
function extractRelativeDates(text, effectiveDate) {
  if (!text || !effectiveDate) return {};
  const result = {};

  // Generic "within N days of the effective date" — used as earnest money fallback
  const genericMatch = text.match(/deposit[^.]*?within\s+(\d+)\s+(?:banking\s+)?days?\s+of\s+the\s+(?:effective|acceptance)\s+date/i)
    || text.match(/earnest\s+money[^.]*?within\s+(\d+)\s+(?:banking\s+)?days/i)
    || text.match(/within\s+(\d+)\s+(?:banking\s+)?days?\s+of\s+the\s+(?:effective|acceptance)\s+date[^.]*?deposit/i);
  if (genericMatch) result.earnest_money_days = parseInt(genericMatch[1]);

  // Inspection: find ALL "within X days" near "inspection" — take the MAX per NHAR Section 15
  const inspMatches = [...text.matchAll(/inspection[^.\n]*?within\s+(\d+)\s+(?:banking\s+)?days/gi)];
  if (inspMatches.length > 0) {
    result.inspection_days = Math.max(...inspMatches.map(m => parseInt(m[1])));
  }

  // Due diligence: Section 16
  const ddMatch = text.match(/due\s+diligence[^.\n]*?within\s+(\d+)\s+(?:banking\s+)?days/i)
    || text.match(/within\s+(\d+)\s+(?:banking\s+)?days[^.\n]*?due\s+diligence/i);
  if (ddMatch) result.due_diligence_days = parseInt(ddMatch[1]);

  // Appraisal
  const apprMatch = text.match(/appraisal[^.\n]*?within\s+(\d+)\s+(?:banking\s+)?days/i);
  if (apprMatch) result.appraisal_days = parseInt(apprMatch[1]);

  // Calculate deadlines from days
  if (result.earnest_money_days) result.earnest_money_deadline = addDays(effectiveDate, result.earnest_money_days);
  if (result.inspection_days)    result.inspection_deadline    = addDays(effectiveDate, result.inspection_days);
  if (result.due_diligence_days) result.due_diligence_deadline = addDays(effectiveDate, result.due_diligence_days);
  if (result.appraisal_days)     result.appraisal_deadline     = addDays(effectiveDate, result.appraisal_days);

  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { file_url, transaction_id, brokerage_id } = await req.json();
    if (!file_url) return Response.json({ error: "No file_url provided" }, { status: 400 });

    console.log("Pass 1: Primary structured extraction...");
    const debugFlags = [];

    // ── PASS 1: Full structured extraction ────────────────────────────────────
    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        description: `New Hampshire NHAR Purchase & Sales Agreement parser.

CRITICAL RULES:
- RELATIVE DATES: The contract uses "within X days of the effective date" — DO NOT ignore these. Extract the integer X for each deadline. Calendar deadlines must be calculated from the effective/acceptance date + X days.
- Section 1: Parties — format is "between [SELLER] (SELLER) and [BUYER] (BUYER)". Seller is listed FIRST.
- Section 3: Purchase price and earnest money deposit amount. Deposit due date expressed as "within X days of the effective date" — extract X as earnest_money_days.
- Section 5: Closing / Transfer of Title date (explicit calendar date).
- Section 7: Agent names and brokerages.
- Section 15: Inspection contingencies. Each inspection type (General Building, Sewage/Septic, Water Quality, Radon, etc.) may be checked YES or NO. For each YES row, extract the "within X days" value. Return the MAXIMUM X as inspection_days (the binding deadline is the latest one).
- Section 16: Due Diligence. Extract "within X days" as due_diligence_days.
- Section 19: Financing commitment — look for an explicit calendar date OR "within X days".
- Section 20: Commission/compensation terms.

IMPORTANT: Return day counts (earnest_money_days, inspection_days, due_diligence_days) even if no explicit calendar date is present. These are calculated fields.`,
        properties: {
          buyer_names:               { type: "string",  description: "Buyer name(s) from Section 1. BUYER appears AFTER 'and' keyword." },
          seller_names:              { type: "string",  description: "Seller name(s) from Section 1. Appears BEFORE 'and' keyword." },
          acceptance_date:           { type: "string",  description: "Effective/acceptance date in YYYY-MM-DD format. Look for 'effective date', 'acceptance date', or 'date of acceptance'." },
          property_address:          { type: "string",  description: "Full property address from Section 2." },
          purchase_price:            { type: "number",  description: "SELLING PRICE. Dollar value often appears on line AFTER 'SELLING PRICE' label. Return as plain number (540000)." },
          deposit_amount:            { type: "number",  description: "Earnest money deposit dollar amount. Look for value after 'deposit of earnest money in the amount of'. Return as plain number." },
          earnest_money_days:        { type: "number",  description: "INTEGER: Number of days from effective date that earnest money deposit is due. Look for 'within X days of the effective date' near 'deposit' or 'earnest money'. This is the most important deadline field — always extract it." },
          earnest_money_deadline:    { type: "string",  description: "Earnest money due date in YYYY-MM-DD only if an explicit calendar date is written in the contract (rare). Usually left null — calculated from earnest_money_days instead." },
          closing_date:              { type: "string",  description: "Transfer of Title / Closing date in YYYY-MM-DD from Section 5." },
          title_company:             { type: "string",  description: "Closing/escrow/title company name." },
          buyer_agent:               { type: "string",  description: "Buyer agent name from Section 7." },
          seller_agent:              { type: "string",  description: "Seller/listing agent name from Section 7." },
          buyer_brokerage:           { type: "string",  description: "Buyer agent's firm/brokerage." },
          seller_brokerage:          { type: "string",  description: "Seller agent's firm/brokerage." },
          inspection_days:           { type: "number",  description: "INTEGER: Max days from effective date for inspection contingency (Section 15). For each YES-checked inspection row, extract its 'within X days' value. Return the MAXIMUM X. E.g. if General Building = 10 days and Septic = 15 days, return 15." },
          inspection_deadline:       { type: "string",  description: "Explicit inspection deadline calendar date YYYY-MM-DD only if written explicitly. Usually null — calculated from inspection_days." },
          inspection_types_yes:      { type: "string",  description: "Comma-separated list of inspection types checked YES in Section 15 (e.g. 'General Building, Sewage/Septic, Radon')." },
          sewage_days:               { type: "number",  description: "INTEGER: Days for sewage/septic inspection if checked YES." },
          water_quality_days:        { type: "number",  description: "INTEGER: Days for water quality inspection if checked YES." },
          radon_days:                { type: "number",  description: "INTEGER: Days for radon inspection if checked YES." },
          due_diligence_days:        { type: "number",  description: "INTEGER: Days for due diligence period from Section 16. Look for 'within X days from the effective date' or 'within X days of acceptance'. Always extract this." },
          due_diligence_deadline:    { type: "string",  description: "Explicit due diligence deadline YYYY-MM-DD only if written explicitly. Usually null — calculated from due_diligence_days." },
          financing_commitment_date: { type: "string",  description: "Financing commitment deadline YYYY-MM-DD from Section 19. May be explicit date or calculated from days." },
          financing_days:            { type: "number",  description: "INTEGER: Days from effective date for financing commitment if expressed as relative days (Section 19)." },
          appraisal_deadline:        { type: "string",  description: "Explicit appraisal deadline YYYY-MM-DD if stated." },
          appraisal_days:            { type: "number",  description: "INTEGER: Days for appraisal contingency if expressed as relative days." },
          commission_percent:        { type: "number",  description: "Commission percentage from Section 20." },
          commission_type:           { type: "string",  description: "'percent' or 'flat'." },
          seller_concession_amount:  { type: "number",  description: "Seller concession dollar amount." },
          commission_notes:          { type: "string",  description: "Summary of Section 20 compensation terms." }
        }
      }
    });

    if (extraction.status === "error") {
      console.error("Primary extraction failed:", extraction.details);
      return Response.json({ error: extraction.details || "Extraction failed" }, { status: 500 });
    }

    const result = extraction.output || {};
    console.log("Pass 1 raw output:", {
      acceptance_date: result.acceptance_date,
      earnest_money_days: result.earnest_money_days,
      inspection_days: result.inspection_days,
      due_diligence_days: result.due_diligence_days,
      financing_commitment_date: result.financing_commitment_date,
    });

    // ── PASS 2: Financial fallback ─────────────────────────────────────────────
    if (!result.purchase_price || !result.deposit_amount) {
      console.log("Pass 2: Financial field fallback...");
      const fb2 = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          description: `NHAR P&S financial field extraction.
            SELLING PRICE: Find 'SELLING PRICE'. Dollar amount is often on the NEXT line. Extract first $###,### match.
            EARNEST MONEY: Find 'deposit of earnest money in the amount of'. Dollar amount is often on the NEXT line. Extract first $###,### match.
            Strip $ and commas, return as plain number.`,
          properties: {
            purchase_price: { type: "number", description: "Dollar amount on or within 3 lines after 'SELLING PRICE'." },
            deposit_amount: { type: "number", description: "Dollar amount on or within 3 lines after 'deposit of earnest money in the amount of'." },
          }
        }
      });
      if (fb2.status !== "error" && fb2.output) {
        if (!result.purchase_price && fb2.output.purchase_price) result.purchase_price = fb2.output.purchase_price;
        if (!result.deposit_amount && fb2.output.deposit_amount) result.deposit_amount = fb2.output.deposit_amount;
      }
    }

    // ── PASS 3: OCR reinforcement for relative deadline text ──────────────────
    // Run if any deadline day count is missing
    const missingDeadlines = !result.earnest_money_days || !result.inspection_days || !result.due_diligence_days;
    if (missingDeadlines && result.acceptance_date) {
      console.log("Pass 3: OCR reinforcement pass for relative deadlines...");
      const fb3 = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          description: `NHAR Purchase & Sales Agreement — RELATIVE DEADLINE EXTRACTION ONLY.
          
Your ONLY job: find every "within X days" phrase and identify what it applies to.

EARNEST MONEY (Section 3): The deposit is due "within X days of the effective date". Extract X.
  Example: "Buyer shall deliver a deposit... within 3 days of the effective date" → earnest_money_days = 3

INSPECTION (Section 15): Multiple inspection types may be checked YES. Each has "within X days of the acceptance date".
  Find ALL checked inspection types and their day values. Return the MAXIMUM value as inspection_days.
  Example: "General Building Inspection: YES, within 10 days" and "Sewage: YES, within 15 days" → inspection_days = 15

DUE DILIGENCE (Section 16): "within X days from the effective date" or "within X days of acceptance".
  Example: "Buyer shall have X days from the effective date to conduct due diligence" → due_diligence_days = X

Return ONLY integers. If a section exists but no day count is legible, return -1 to flag it as "detected but not parsed".`,
          properties: {
            earnest_money_days:  { type: "number", description: "Days from effective date earnest money is due (Section 3). Return integer. Return -1 if section found but days not readable." },
            inspection_days:     { type: "number", description: "MAX days across all YES-checked inspections (Section 15). Return integer. Return -1 if section found but days not readable." },
            inspection_types_yes:{ type: "string", description: "Comma-separated YES inspection types found in Section 15." },
            sewage_days:         { type: "number", description: "Sewage/septic inspection days if checked YES." },
            water_quality_days:  { type: "number", description: "Water quality inspection days if checked YES." },
            radon_days:          { type: "number", description: "Radon inspection days if checked YES." },
            due_diligence_days:  { type: "number", description: "Days for due diligence period (Section 16). Return integer. Return -1 if section found but days not readable." },
            raw_deadline_text:   { type: "string", description: "Copy of ALL raw text from Sections 3, 15, and 16 verbatim for debugging." },
          }
        }
      });

      if (fb3.status !== "error" && fb3.output) {
        const fb = fb3.output;
        console.log("Pass 3 result:", fb);

        // Apply only positive values (-1 = detected but not parsed)
        if (!result.earnest_money_days && fb.earnest_money_days > 0) result.earnest_money_days = fb.earnest_money_days;
        if (!result.inspection_days && fb.inspection_days > 0)       result.inspection_days    = fb.inspection_days;
        if (!result.due_diligence_days && fb.due_diligence_days > 0) result.due_diligence_days = fb.due_diligence_days;
        if (!result.sewage_days && fb.sewage_days > 0)               result.sewage_days        = fb.sewage_days;
        if (!result.water_quality_days && fb.water_quality_days > 0) result.water_quality_days = fb.water_quality_days;
        if (!result.radon_days && fb.radon_days > 0)                 result.radon_days         = fb.radon_days;
        if (!result.inspection_types_yes && fb.inspection_types_yes) result.inspection_types_yes = fb.inspection_types_yes;

        // Flag sections detected but not parsed
        if (fb.earnest_money_days === -1)  debugFlags.push("EMD_DETECTED_NOT_PARSED");
        if (fb.inspection_days === -1)     debugFlags.push("INSPECTION_DETECTED_NOT_PARSED");
        if (fb.due_diligence_days === -1)  debugFlags.push("DD_DETECTED_NOT_PARSED");

        // Regex pass on raw text as last resort
        if (fb.raw_deadline_text) {
          const regexDates = extractRelativeDates(fb.raw_deadline_text, result.acceptance_date);
          if (!result.earnest_money_days && regexDates.earnest_money_days) result.earnest_money_days = regexDates.earnest_money_days;
          if (!result.inspection_days && regexDates.inspection_days)       result.inspection_days    = regexDates.inspection_days;
          if (!result.due_diligence_days && regexDates.due_diligence_days) result.due_diligence_days = regexDates.due_diligence_days;
          if (Object.keys(regexDates).length > 0) debugFlags.push("REGEX_FALLBACK_USED");
        }
      }
    }

    // ── Calculate all deadlines from day offsets + acceptance date ─────────────
    const acceptanceDate = result.acceptance_date || null;

    // Inspection: use per-type days if available; overall inspection_days is the max
    const allInspDays = [result.inspection_days, result.sewage_days, result.water_quality_days, result.radon_days]
      .filter(d => d && Number(d) > 0).map(Number);
    if (allInspDays.length > 0 && !result.inspection_days) {
      result.inspection_days = Math.max(...allInspDays);
    }

    result.earnest_money_deadline  = result.earnest_money_deadline  || addDays(acceptanceDate, result.earnest_money_days);
    result.inspection_deadline     = result.inspection_deadline     || addDays(acceptanceDate, result.inspection_days);
    result.due_diligence_deadline  = result.due_diligence_deadline  || addDays(acceptanceDate, result.due_diligence_days);
    result.appraisal_deadline      = result.appraisal_deadline      || addDays(acceptanceDate, result.appraisal_days);
    result.sewage_deadline         = addDays(acceptanceDate, result.sewage_days);
    result.water_quality_deadline  = addDays(acceptanceDate, result.water_quality_days);
    result.radon_deadline          = addDays(acceptanceDate, result.radon_days);

    // Financing: may be days-based too
    if (!result.financing_commitment_date && result.financing_days) {
      result.financing_commitment_date = addDays(acceptanceDate, result.financing_days);
    }

    // Mark undetected financial fields
    if (!result.purchase_price) result.purchase_price_undetected = true;
    if (!result.deposit_amount) result.deposit_amount_undetected = true;

    // ── Debug info ─────────────────────────────────────────────────────────────
    result._debug = {
      text_confidence: result.acceptance_date ? "HIGH" : "LOW",
      flags: debugFlags,
      deadlines_from_days: {
        earnest_money_days: result.earnest_money_days || null,
        inspection_days: result.inspection_days || null,
        due_diligence_days: result.due_diligence_days || null,
      }
    };

    console.log("Final extraction result:", {
      acceptance_date: result.acceptance_date,
      earnest_money_days: result.earnest_money_days,
      earnest_money_deadline: result.earnest_money_deadline,
      inspection_days: result.inspection_days,
      inspection_deadline: result.inspection_deadline,
      inspection_types_yes: result.inspection_types_yes,
      due_diligence_days: result.due_diligence_days,
      due_diligence_deadline: result.due_diligence_deadline,
      financing_commitment_date: result.financing_commitment_date,
      closing_date: result.closing_date,
      flags: debugFlags,
    });

    // ── Auto-create Contingency records if transaction_id provided ─────────────
    if (transaction_id) {
      const contingenciesToCreate = [];

      const inspectionTypes = [
        { key: "inspection_days",     label: "General Building" },
        { key: "sewage_days",         label: "Sewage / Septic" },
        { key: "water_quality_days",  label: "Water Quality" },
        { key: "radon_days",          label: "Radon" },
      ];

      for (const { key, label } of inspectionTypes) {
        if (result[key] && Number(result[key]) > 0) {
          contingenciesToCreate.push({
            transaction_id,
            brokerage_id: brokerage_id || null,
            contingency_type: "Inspection",
            sub_type: label,
            days_from_effective: Number(result[key]),
            due_date: addDays(acceptanceDate, result[key]),
            is_active: true,
            is_custom: false,
            source: "Parsed",
            status: "Pending",
          });
        }
      }

      if (result.financing_commitment_date) {
        contingenciesToCreate.push({
          transaction_id,
          brokerage_id: brokerage_id || null,
          contingency_type: "Financing",
          sub_type: "Mortgage Commitment",
          due_date: result.financing_commitment_date,
          is_active: true,
          is_custom: false,
          source: "Parsed",
          status: "Pending",
        });
      }

      if (result.due_diligence_days && Number(result.due_diligence_days) > 0) {
        contingenciesToCreate.push({
          transaction_id,
          brokerage_id: brokerage_id || null,
          contingency_type: "Due Diligence",
          sub_type: "Due Diligence Period",
          days_from_effective: Number(result.due_diligence_days),
          due_date: result.due_diligence_deadline,
          is_active: true,
          is_custom: false,
          source: "Parsed",
          status: "Pending",
        });
      }

      if (contingenciesToCreate.length > 0) {
        const existing = await base44.asServiceRole.entities.Contingency.filter({ transaction_id, source: "Parsed" });
        await Promise.all(existing.map(e => base44.asServiceRole.entities.Contingency.delete(e.id)));
        await Promise.all(contingenciesToCreate.map(c => base44.asServiceRole.entities.Contingency.create(c)));
        console.log(`Created ${contingenciesToCreate.length} contingencies for transaction ${transaction_id}`);
        result._contingencies_created = contingenciesToCreate.length;
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error("parsePurchaseAgreementV2 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
/**
 * parsePurchaseAgreementV2
 *
 * Pipeline:
 *   1. Call textractDocument  → Textract AnalyzeDocument (FORMS + TABLES)
 *   2. Feed structured Textract output into GPT-4.1 via OpenAI API
 *   3. calculateDeadlines()   → derive deadline dates from day offsets
 *   4. validateDeadlines()    → flag missing required fields
 *   5. Auto-create Contingency records if transaction_id provided
 *
 * Existing downstream consumers (createTransactionFromContract, ContractIntakeModal,
 * PurchaseAgreementUpload) are fully preserved — output shape is unchanged.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai@4.52.0';

// ── Date helpers ───────────────────────────────────────────────────────────────

function addDays(isoDate, days) {
  if (!isoDate || days == null || isNaN(Number(days))) return null;
  try {
    const d = new Date(isoDate + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
    return d.toISOString().split('T')[0];
  } catch { return null; }
}

function subtractHours(isoDate, hours) {
  if (!isoDate || hours == null) return null;
  try {
    const d = new Date(isoDate + 'T23:59:00Z');
    d.setUTCHours(d.getUTCHours() - Math.round(Number(hours)));
    return d.toISOString();
  } catch { return null; }
}

function field(value, confidence, source_section, note = null) {
  return { value, confidence, source_section, ...(note ? { note } : {}) };
}

// ── Deadline calculator (unchanged from original) ─────────────────────────────

function calculateDeadlines(raw, effectiveDate) {
  const calc = {};

  if (raw.earnest_money_days > 0) {
    calc.earnest_money_initial_deadline = field(
      addDays(effectiveDate, raw.earnest_money_days), 'MEDIUM', 'Section 3',
      `Calculated: effective_date + ${raw.earnest_money_days} days`
    );
  } else if (raw.earnest_money_deadline_explicit) {
    calc.earnest_money_initial_deadline = field(raw.earnest_money_deadline_explicit, 'HIGH', 'Section 3');
  }

  if (raw.additional_emd_date_explicit) {
    calc.additional_emd_deadline = field(raw.additional_emd_date_explicit, 'HIGH', 'Section 3');
  }

  const inspDays = [
    raw.general_building_days, raw.sewage_days, raw.water_quality_days,
    raw.radon_air_days, raw.radon_water_days, raw.lead_paint_days,
    raw.pest_days, raw.hazardous_waste_days,
    raw.custom_inspection_i_days, raw.custom_inspection_j_days,
  ].filter(d => d > 0).map(Number);

  if (inspDays.length > 0) {
    const maxDays = Math.max(...inspDays);
    calc.inspection_deadline = field(
      addDays(effectiveDate, maxDays), 'MEDIUM', 'Section 15',
      `Calculated: effective_date + ${maxDays} days (MAX across YES inspections)`
    );
    calc.inspection_deadline_days = maxDays;
  } else if (raw.inspection_deadline_explicit) {
    calc.inspection_deadline = field(raw.inspection_deadline_explicit, 'HIGH', 'Section 15');
  }

  calc.inspection_seller_response_days = field(raw.inspection_seller_response_days || 5, 'HIGH', 'Section 15', 'Relative to receipt of buyer notification');
  calc.inspection_buyer_response_days  = field(raw.inspection_buyer_response_days  || 5, 'HIGH', 'Section 15', 'Relative to seller notification');

  if (raw.due_diligence_days > 0) {
    calc.due_diligence_deadline = field(
      addDays(effectiveDate, raw.due_diligence_days), 'MEDIUM', 'Section 16',
      `Calculated: effective_date + ${raw.due_diligence_days} days`
    );
  } else if (raw.due_diligence_deadline_explicit) {
    calc.due_diligence_deadline = field(raw.due_diligence_deadline_explicit, 'HIGH', 'Section 16');
  }

  calc.title_resolution_days = field(raw.title_resolution_days || 30, 'HIGH', 'Section 9', 'Relative to notification of title defect');

  if (raw.walkthrough_hours_prior > 0 && raw.closing_date) {
    calc.final_walkthrough_latest = field(
      subtractHours(raw.closing_date, raw.walkthrough_hours_prior), 'MEDIUM', 'Section 6',
      `Calculated: closing_date - ${raw.walkthrough_hours_prior} hours`
    );
    calc.walkthrough_hours_prior = raw.walkthrough_hours_prior;
  }

  if (raw.financing_commitment_date_explicit) {
    calc.financing_commitment_date = field(raw.financing_commitment_date_explicit, 'HIGH', 'Section 19');
  } else if (raw.financing_application_days > 0) {
    calc.financing_application_deadline = field(
      addDays(effectiveDate, raw.financing_application_days), 'MEDIUM', 'Section 19',
      `Calculated: effective_date + ${raw.financing_application_days} days`
    );
  }

  if (raw.appraisal_days > 0) {
    calc.appraisal_deadline = field(addDays(effectiveDate, raw.appraisal_days), 'MEDIUM', 'Addendum/Clause', `Calculated: effective_date + ${raw.appraisal_days} days`);
  } else if (raw.appraisal_deadline_explicit) {
    calc.appraisal_deadline = field(raw.appraisal_deadline_explicit, 'HIGH', 'Addendum');
  } else if (calc.financing_commitment_date) {
    calc.appraisal_deadline = field(calc.financing_commitment_date.value, 'HIGH', 'Section 19', 'Mirrors financing commitment date per NH P&S standard');
  }

  if (raw.buyer_home_sale_deadline_explicit)  calc.buyer_home_sale_deadline   = field(raw.buyer_home_sale_deadline_explicit, 'HIGH', 'Addendum');
  if (raw.hoa_review_days > 0)               calc.hoa_review_deadline        = field(addDays(effectiveDate, raw.hoa_review_days), 'MEDIUM', 'Addendum/Section 16d', `Calculated: effective_date + ${raw.hoa_review_days} days`);
  if (raw.attorney_review_days > 0)          calc.attorney_review_deadline   = field(addDays(effectiveDate, raw.attorney_review_days), 'MEDIUM', 'Addendum', `Calculated: effective_date + ${raw.attorney_review_days} days`);
  if (raw.board_approval_days > 0)           calc.board_approval_deadline    = field(addDays(effectiveDate, raw.board_approval_days), 'MEDIUM', 'Addendum', `Calculated: effective_date + ${raw.board_approval_days} days`);
  if (raw.post_closing_occupancy_start)      calc.post_closing_occupancy_start = field(raw.post_closing_occupancy_start, 'HIGH', 'Addendum');
  if (raw.post_closing_occupancy_end)        calc.post_closing_occupancy_end   = field(raw.post_closing_occupancy_end, 'HIGH', 'Addendum');
  if (raw.showings_start_date)               calc.showings_start_date        = field(raw.showings_start_date, 'HIGH', 'Addendum');
  if (raw.offer_expiration_datetime)         calc.offer_expiration_datetime  = field(raw.offer_expiration_datetime, 'HIGH', 'Offer/Cover Sheet');

  return calc;
}

// ── Deadline validator (unchanged from original) ──────────────────────────────

function validateDeadlines(raw, calc, flags) {
  const errors = [];
  const anyInspectionYes = raw.inspection_types_yes && raw.inspection_types_yes.length > 0;
  if (anyInspectionYes && !calc.inspection_deadline) {
    errors.push({ field: 'inspection_deadline', section: 'Section 15', page: 3, message: 'Inspection section detected with YES entries but no deadline extracted' });
    flags.push('INSPECTION_DETECTED_NOT_PARSED');
  }
  if ((raw.deposit_amount > 0 || raw.earnest_money_days > 0) && !calc.earnest_money_initial_deadline) {
    errors.push({ field: 'earnest_money_initial_deadline', section: 'Section 3', page: 1, message: 'Deposit detected but no EMD deadline extracted' });
    flags.push('EMD_DETECTED_NOT_PARSED');
  }
  if (raw.due_diligence_section_present && !calc.due_diligence_deadline) {
    errors.push({ field: 'due_diligence_deadline', section: 'Section 16', page: 3, message: 'Due Diligence section detected but no deadline extracted' });
    flags.push('DD_DETECTED_NOT_PARSED');
  }
  return errors;
}

// ── GPT-4.1 extraction schema ─────────────────────────────────────────────────

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    buyer_names:                        { type: 'string'  },
    seller_names:                       { type: 'string'  },
    acceptance_date:                    { type: 'string'  },
    property_address:                   { type: 'string'  },
    property_city:                      { type: 'string'  },
    purchase_price:                     { type: 'number'  },
    deposit_amount:                     { type: 'number'  },
    earnest_money_days:                 { type: 'number'  },
    earnest_money_deadline_explicit:    { type: 'string'  },
    additional_emd_amount:              { type: 'number'  },
    additional_emd_date_explicit:       { type: 'string'  },
    remainder_amount:                   { type: 'number'  },
    escrow_agent:                       { type: 'string'  },
    closing_date:                       { type: 'string'  },
    closing_location:                   { type: 'string'  },
    walkthrough_hours_prior:            { type: 'number'  },
    buyer_agent:                        { type: 'string'  },
    seller_agent:                       { type: 'string'  },
    buyer_brokerage:                    { type: 'string'  },
    seller_brokerage:                   { type: 'string'  },
    buyer_agent_role:                   { type: 'string'  },
    seller_agent_role:                  { type: 'string'  },
    title_resolution_days:              { type: 'number'  },
    inspection_types_yes:               { type: 'string'  },
    general_building_days:              { type: 'number'  },
    sewage_days:                        { type: 'number'  },
    water_quality_days:                 { type: 'number'  },
    radon_air_days:                     { type: 'number'  },
    radon_water_days:                   { type: 'number'  },
    lead_paint_days:                    { type: 'number'  },
    pest_days:                          { type: 'number'  },
    hazardous_waste_days:               { type: 'number'  },
    custom_inspection_i_days:           { type: 'number'  },
    custom_inspection_j_days:           { type: 'number'  },
    custom_inspection_i_name:           { type: 'string'  },
    custom_inspection_j_name:           { type: 'string'  },
    inspection_deadline_explicit:       { type: 'string'  },
    inspection_seller_response_days:    { type: 'number'  },
    inspection_buyer_response_days:     { type: 'number'  },
    due_diligence_days:                 { type: 'number'  },
    due_diligence_deadline_explicit:    { type: 'string'  },
    due_diligence_section_present:      { type: 'boolean' },
    financing_contingency:              { type: 'boolean' },
    financing_amount:                   { type: 'number'  },
    financing_term_years:               { type: 'number'  },
    financing_rate:                     { type: 'string'  },
    financing_mortgage_type:            { type: 'string'  },
    financing_application_days:         { type: 'number'  },
    financing_commitment_date_explicit: { type: 'string'  },
    seller_concession_amount:           { type: 'number'  },
    professional_fee:                   { type: 'string'  },
    addenda_attached:                   { type: 'boolean' },
    appraisal_days:                     { type: 'number'  },
    appraisal_deadline_explicit:        { type: 'string'  },
    hoa_review_days:                    { type: 'number'  },
    attorney_review_days:               { type: 'number'  },
    board_approval_days:                { type: 'number'  },
    buyer_home_sale_deadline_explicit:  { type: 'string'  },
    post_closing_occupancy_start:       { type: 'string'  },
    post_closing_occupancy_end:         { type: 'string'  },
    showings_start_date:                { type: 'string'  },
    offer_expiration_datetime:          { type: 'string'  },
    title_company:                      { type: 'string'  },
  },
  required: [],
  additionalProperties: false,
};

// ── GPT-4.1 system prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a real estate document parser specializing in NHAR (New Hampshire Association of REALTORS) Purchase & Sales Agreements.

You will receive structured OCR output from AWS Textract — including full page text, key-value pairs, tables, and checkbox states. Use ALL provided data to extract transaction fields as accurately as possible.

KEY CONTRACT RULES (Section 23):
- ALL "within X days" deadlines are CALENDAR DAYS counted from the EFFECTIVE DATE
- EFFECTIVE DATE = date contract is fully signed (top right box on Page 1)
- Day 1 = first day AFTER the effective date

EXTRACTION RULES:
1. EFFECTIVE DATE (acceptance_date): Top-right box on Page 1 labeled "EFFECTIVE DATE". Also check "THIS AGREEMENT made this ___ day of ___" and signature area. Return YYYY-MM-DD.

2. PROPERTY ADDRESS: Use Section 2 (labeled "PROPERTY") for the actual property address — NOT Section 1 seller mailing address. Format: street, city, state ZIP.

3. BUYER/SELLER NAMES: Section 1. Seller = first name(s) before "and". Buyer = name(s) after "and ... (BUYER)".

4. SELLING PRICE (purchase_price): After "SELLING PRICE is ___ Dollars $___". Amount may be on next line. Return number only.

5. DEPOSIT AMOUNT (deposit_amount): After "deposit of earnest money in the amount of $". Return number only.

6. EARNEST MONEY DAYS (earnest_money_days): The INTEGER written in the blank of "within ___days of the EFFECTIVE DATE" in Section 3. Textract key-value pairs will often surface this directly.

7. CLOSING DATE: Section 5 "On or before [DATE] at [LOCATION]". Return YYYY-MM-DD.

8. INSPECTION TABLE (Section 15): Use Textract table data. For each row (a-j):
   - Check if the YES checkbox in that row is SELECTED (use checkbox states by position and key-value pairs)
   - If YES: extract the integer from "within ___days" blank for that row
   - Return 0 for NO rows

9. DUE DILIGENCE DAYS (Section 16): Integer from "within ___days from the effective date".

10. FINANCING (Section 19): 
    - financing_contingency = true if "IS" checkbox is checked (not "is not")
    - financing_commitment_date_explicit = explicit date in "by ___ (Financing Deadline)"
    - financing_application_days = integer from "within __ calendar days from the effective date"

11. AGENTS (Section 7): Extract names and brokerages. Identify role from checked checkbox.

12. ALL DATES: Return in YYYY-MM-DD format. Return null if not found — never guess.

13. ALL DAY COUNTS: Return as integers. Return 0 if section absent, null if section present but blank illegible.

Use the Textract key-value pairs and table data as authoritative sources when available — they are more reliable than raw text for fill-in-blank values.`;

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceBase44 = base44.asServiceRole;

    const { file_url, transaction_id, brokerage_id } = await req.json();
    if (!file_url) return Response.json({ error: 'No file_url provided' }, { status: 400 });

    const debugFlags = [];
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // ── STEP 1: Textract extraction ───────────────────────────────────────────
    console.log('parsePurchaseAgreementV2 — Step 1: Textract AnalyzeDocument');
    const textractRes = await serviceBase44.functions.invoke('textractDocument', { file_url });

    let textractData = null;
    let structuredContext = null;

    if (textractRes?.structured_context) {
      textractData = textractRes;
      structuredContext = textractRes.structured_context;
      console.log(`Textract success: ${textractRes.block_count} blocks, ${textractRes.kv_pair_count} KV pairs, ${textractRes.table_count} tables, ${textractRes.checkbox_count} checkboxes`);
    } else {
      // Textract failed — fall back to passing file_url directly for Base44 vision extraction
      console.warn('Textract unavailable, falling back to Base44 vision extraction');
      debugFlags.push('TEXTRACT_UNAVAILABLE_FALLBACK');
    }

    // ── STEP 2: GPT-4.1 extraction ────────────────────────────────────────────
    console.log('parsePurchaseAgreementV2 — Step 2: GPT-4.1 structured extraction');

    let raw = {};

    if (structuredContext) {
      // Primary path: Textract context → GPT-4.1
      const userMessage = `Extract all transaction fields from this NHAR P&S Agreement.

${structuredContext}

Return a JSON object matching the schema exactly. Use null for missing/unknown fields. Never hallucinate values.`;

      const gptResponse = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'nhar_extraction', schema: EXTRACTION_SCHEMA, strict: true } },
        temperature: 0,
      });

      const content = gptResponse.choices[0]?.message?.content;
      if (content) {
        raw = JSON.parse(content);
        console.log('GPT-4.1 extraction complete. acceptance_date:', raw.acceptance_date, 'closing_date:', raw.closing_date);
      } else {
        debugFlags.push('GPT_EMPTY_RESPONSE');
      }

    } else {
      // Fallback path: Base44 ExtractDataFromUploadedFile (original behavior)
      debugFlags.push('USING_BASE44_VISION_FALLBACK');
      const extraction = await serviceBase44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          description: `NHAR Purchase & Sales Agreement. Extract all fields. Dates as YYYY-MM-DD. Numbers without $ or commas. PROPERTY ADDRESS from Section 2 (not seller mailing address).`,
          properties: EXTRACTION_SCHEMA.properties,
        },
      });
      if (extraction.status === 'error') {
        return Response.json({ error: extraction.details || 'Extraction failed' }, { status: 500 });
      }
      raw = extraction.output || {};
    }

    // ── STEP 3: Targeted GPT-4.1 reinforcement pass for missing critical fields ─
    const missingCritical = !raw.acceptance_date || !raw.earnest_money_days || !raw.due_diligence_days;
    const missingFinancials = !raw.purchase_price || !raw.deposit_amount;

    if ((missingCritical || missingFinancials) && structuredContext) {
      console.log('Step 3: GPT-4.1 reinforcement pass for missing fields');
      debugFlags.push('REINFORCEMENT_PASS_RUN');

      const reinforcementMsg = `The previous extraction missed some critical fields. Focus ONLY on finding these missing values from the Textract data below.

MISSING FIELDS TO FIND:
${!raw.acceptance_date ? '- acceptance_date: The EFFECTIVE DATE in the top-right box of Page 1 (YYYY-MM-DD)' : ''}
${!raw.closing_date ? '- closing_date: Section 5 "On or before [DATE]" (YYYY-MM-DD)' : ''}
${!raw.purchase_price ? '- purchase_price: After "SELLING PRICE is ___ Dollars $___" (number only)' : ''}
${!raw.deposit_amount ? '- deposit_amount: After "deposit of earnest money in the amount of $" (number only)' : ''}
${!raw.earnest_money_days ? '- earnest_money_days: Integer in blank "within ___days of the EFFECTIVE DATE" Section 3' : ''}
${!raw.due_diligence_days ? '- due_diligence_days: Integer in blank "within ___days from the effective date" Section 16' : ''}
${!raw.general_building_days ? '- general_building_days: Days for General Building inspection row (a) IF YES checked' : ''}

TEXTRACT KEY-VALUE PAIRS (authoritative for fill-in blanks):
${structuredContext.split('=== TABLES')[0].split('=== KEY-VALUE')[1] || '(none)'}

Return JSON with ONLY the fields listed above. Use null if still not found.`;

      const reinResponse = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: 'You are a precise data extractor. Return only the requested JSON fields. Never guess — return null if not found.' },
          { role: 'user', content: reinforcementMsg },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      });

      const reinContent = reinResponse.choices[0]?.message?.content;
      if (reinContent) {
        const rein = JSON.parse(reinContent);
        // Only apply non-null improvements
        for (const [k, v] of Object.entries(rein)) {
          if (v !== null && v !== undefined && !raw[k]) {
            raw[k] = v;
          }
        }
        console.log('Reinforcement result:', { acceptance_date: rein.acceptance_date, earnest_money_days: rein.earnest_money_days, due_diligence_days: rein.due_diligence_days });
      }
    }

    // ── STEP 4: Calculate deadlines ───────────────────────────────────────────
    const effectiveDate = raw.acceptance_date || null;
    const calc = effectiveDate ? calculateDeadlines(raw, effectiveDate) : {};

    // ── STEP 5: Validate ──────────────────────────────────────────────────────
    const validationErrors = validateDeadlines(raw, calc, debugFlags);

    if (!raw.purchase_price)  debugFlags.push('PURCHASE_PRICE_NOT_FOUND');
    if (!raw.deposit_amount)  debugFlags.push('DEPOSIT_AMOUNT_NOT_FOUND');
    if (!effectiveDate)       debugFlags.push('EFFECTIVE_DATE_NOT_FOUND');

    // ── STEP 6: Build output (shape unchanged — backward compatible) ───────────
    const output = {
      raw: {
        buyer_names:                  raw.buyer_names || null,
        seller_names:                 raw.seller_names || null,
        acceptance_date:              raw.acceptance_date || null,
        property_address:             raw.property_address || null,
        property_city:                raw.property_city || null,
        purchase_price:               raw.purchase_price || null,
        deposit_amount:               raw.deposit_amount || null,
        additional_emd_amount:        raw.additional_emd_amount || null,
        additional_emd_date_explicit: raw.additional_emd_date_explicit || null,
        closing_date:                 raw.closing_date || null,
        closing_location:             raw.closing_location || null,
        escrow_agent:                 raw.escrow_agent || null,
        title_company:                raw.title_company || null,
        buyer_agent:                  raw.buyer_agent || null,
        seller_agent:                 raw.seller_agent || null,
        buyer_brokerage:              raw.buyer_brokerage || null,
        seller_brokerage:             raw.seller_brokerage || null,
        buyer_agent_role:             raw.buyer_agent_role || null,
        seller_agent_role:            raw.seller_agent_role || null,
        financing_contingency:        raw.financing_contingency || false,
        financing_amount:             raw.financing_amount || null,
        financing_term_years:         raw.financing_term_years || null,
        financing_rate:               raw.financing_rate || null,
        financing_mortgage_type:      raw.financing_mortgage_type || null,
        seller_concession_amount:     raw.seller_concession_amount || null,
        professional_fee:             raw.professional_fee || null,
        addenda_attached:             raw.addenda_attached || false,
        inspection_types_yes:         raw.inspection_types_yes || null,
        earnest_money_days:           raw.earnest_money_days || null,
        general_building_days:        raw.general_building_days || null,
        sewage_days:                  raw.sewage_days || null,
        water_quality_days:           raw.water_quality_days || null,
        radon_air_days:               raw.radon_air_days || null,
        radon_water_days:             raw.radon_water_days || null,
        lead_paint_days:              raw.lead_paint_days || null,
        pest_days:                    raw.pest_days || null,
        hazardous_waste_days:         raw.hazardous_waste_days || null,
        custom_inspection_i_days:     raw.custom_inspection_i_days || null,
        custom_inspection_i_name:     raw.custom_inspection_i_name || null,
        custom_inspection_j_days:     raw.custom_inspection_j_days || null,
        custom_inspection_j_name:     raw.custom_inspection_j_name || null,
        due_diligence_days:           raw.due_diligence_days || null,
        walkthrough_hours_prior:      raw.walkthrough_hours_prior || null,
        financing_application_days:   raw.financing_application_days || null,
      },
      deadlines: calc,
      // Flattened top-level fields (backward compat)
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
      earnest_money_deadline:    calc.earnest_money_initial_deadline?.value || null,
      inspection_deadline:       calc.inspection_deadline?.value || null,
      due_diligence_deadline:    calc.due_diligence_deadline?.value || null,
      financing_commitment_date: calc.financing_commitment_date?.value || calc.financing_application_deadline?.value || raw.financing_commitment_date_explicit || null,
      appraisal_deadline:        calc.appraisal_deadline?.value || calc.financing_commitment_date?.value || null,
      validation_errors: validationErrors,
      _debug: {
        pipeline: structuredContext ? 'textract+gpt4.1' : 'base44_vision_fallback',
        textract_blocks:    textractData?.block_count || 0,
        textract_kv_pairs:  textractData?.kv_pair_count || 0,
        textract_tables:    textractData?.table_count || 0,
        textract_checkboxes: textractData?.checkbox_count || 0,
        effective_date_found: !!effectiveDate,
        flags: debugFlags,
        confidence_summary: {
          effective_date: effectiveDate ? 'HIGH' : 'LOW',
          earnest_money:  calc.earnest_money_initial_deadline?.confidence || 'LOW',
          inspection:     calc.inspection_deadline?.confidence || 'LOW',
          due_diligence:  calc.due_diligence_deadline?.confidence || 'LOW',
          financing:      calc.financing_commitment_date?.confidence || 'LOW',
        },
      },
    };

    console.log('Final result:', {
      pipeline: output._debug.pipeline,
      acceptance_date: output.acceptance_date,
      earnest_money_deadline: output.earnest_money_deadline,
      inspection_deadline: output.inspection_deadline,
      due_diligence_deadline: output.due_diligence_deadline,
      closing_date: output.closing_date,
      flags: debugFlags,
    });

    // ── STEP 7: Auto-create Contingency records ───────────────────────────────
    if (transaction_id && effectiveDate) {
      const contingenciesToCreate = [];

      const inspTypes = [
        { key: 'general_building_days',    label: 'General Building' },
        { key: 'sewage_days',              label: 'Sewage / Septic' },
        { key: 'water_quality_days',       label: 'Water Quality' },
        { key: 'radon_air_days',           label: 'Radon Air Quality' },
        { key: 'radon_water_days',         label: 'Radon Water Quality' },
        { key: 'lead_paint_days',          label: 'Lead Paint' },
        { key: 'pest_days',                label: 'Pests' },
        { key: 'hazardous_waste_days',     label: 'Hazardous Waste' },
        { key: 'custom_inspection_i_days', label: raw.custom_inspection_i_name || 'Custom Inspection (i)' },
        { key: 'custom_inspection_j_days', label: raw.custom_inspection_j_name || 'Custom Inspection (j)' },
      ];

      for (const { key, label } of inspTypes) {
        if (raw[key] && Number(raw[key]) > 0) {
          contingenciesToCreate.push({
            transaction_id, brokerage_id: brokerage_id || null,
            contingency_type: 'Inspection', sub_type: label,
            days_from_effective: Number(raw[key]),
            due_date: addDays(effectiveDate, raw[key]),
            is_active: true, is_custom: false, source: 'Parsed', status: 'Pending',
          });
        }
      }

      if (raw.due_diligence_days > 0) {
        contingenciesToCreate.push({
          transaction_id, brokerage_id: brokerage_id || null,
          contingency_type: 'Due Diligence', sub_type: 'Due Diligence Period',
          days_from_effective: Number(raw.due_diligence_days),
          due_date: output.due_diligence_deadline,
          is_active: true, is_custom: false, source: 'Parsed', status: 'Pending',
        });
      }

      if (raw.financing_contingency && output.financing_commitment_date) {
        contingenciesToCreate.push({
          transaction_id, brokerage_id: brokerage_id || null,
          contingency_type: 'Financing', sub_type: 'Mortgage Commitment',
          due_date: output.financing_commitment_date,
          is_active: true, is_custom: false, source: 'Parsed', status: 'Pending',
        });
      }

      if (contingenciesToCreate.length > 0) {
        const existing = await base44.asServiceRole.entities.Contingency.filter({ transaction_id, source: 'Parsed' });
        await Promise.all(existing.map(e => base44.asServiceRole.entities.Contingency.delete(e.id)));
        await Promise.all(contingenciesToCreate.map(c => base44.asServiceRole.entities.Contingency.create(c)));
        console.log(`Created ${contingenciesToCreate.length} contingencies`);
        output._contingencies_created = contingenciesToCreate.length;
      }
    }

    return Response.json(output);

  } catch (error) {
    console.error('parsePurchaseAgreementV2 error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
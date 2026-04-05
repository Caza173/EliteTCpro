import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function addDays(isoDate, days) {
  if (!isoDate || days == null) return null;
  try {
    const d = new Date(isoDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
    return d.toISOString().split("T")[0];
  } catch { return null; }
}

// Extract relative dates from text (e.g., "within 5 days of the effective date")
function extractRelativeDates(text, effectiveDate) {
  if (!text || !effectiveDate) return {};
  
  const result = {};
  
  // Earnest money due
  const emdMatch = text.match(/within\s+(\d+)\s+days\s+of\s+the\s+(?:effective\s+)?date/i);
  if (emdMatch) {
    const days = parseInt(emdMatch[1]);
    result.earnest_money_deadline = addDays(effectiveDate, days);
  }
  
  // Inspection deadline
  const inspMatch = text.match(/inspection[^.]*?within\s+(\d+)\s+days/i);
  if (inspMatch) {
    const days = parseInt(inspMatch[1]);
    result.inspection_deadline = addDays(effectiveDate, days);
  }
  
  // Due diligence deadline
  const dueDilMatch = text.match(/due\s+diligence[^.]*?within\s+(\d+)\s+days/i);
  if (dueDilMatch) {
    const days = parseInt(dueDilMatch[1]);
    result.due_diligence_deadline = addDays(effectiveDate, days);
  }
  
  // Appraisal deadline
  const apprMatch = text.match(/appraisal[^.]*?within\s+(\d+)\s+days/i);
  if (apprMatch) {
    const days = parseInt(apprMatch[1]);
    result.appraisal_deadline = addDays(effectiveDate, days);
  }
  
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { file_url, transaction_id, brokerage_id } = await req.json();
    if (!file_url) return Response.json({ error: "No file_url provided" }, { status: 400 });

    console.log("Extracting data from document...");
    const debugFlags = [];

    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        description: "New Hampshire NHAR Purchase & Sales Agreement. Section 1: parties (format: 'between [SELLER] (SELLER) and [BUYER] (BUYER)' - seller listed first). Section 3: price/deposit. Section 5: closing date. Section 7: agents. Section 15: inspection days. Section 19: financing date. Section 20: commission.",
        properties: {
          buyer_names:               { type: "string", description: "Buyer name(s) from Section 1. In NHAR form, BUYER appears AFTER 'and' keyword." },
          seller_names:              { type: "string", description: "Seller name(s) from Section 1. Appears BEFORE 'and' keyword." },
          acceptance_date:           { type: "string", description: "Effective/acceptance date in YYYY-MM-DD format" },
          property_address:          { type: "string", description: "Full property address from Section 2" },
          purchase_price:            { type: "number", description: "SELLING PRICE / purchase price. In NHAR forms the dollar value (e.g. $540,000) often appears on the line AFTER the 'SELLING PRICE' label — scan up to 3 lines after that label. Return as a plain number (540000), no $ or commas." },
          deposit_amount:            { type: "number", description: "Earnest money deposit amount. In NHAR forms the dollar value often appears on the line AFTER 'deposit of earnest money in the amount of' — scan up to 3 lines after that phrase. Return as a plain number (10000), no $ or commas." },
          earnest_money_days:        { type: "number", description: "Days from acceptance date to deliver deposit" },
          earnest_money_deadline:    { type: "string", description: "Explicit earnest money deadline date in YYYY-MM-DD format if stated in document" },
          closing_date:              { type: "string", description: "Transfer of Title date in YYYY-MM-DD" },
          title_company:             { type: "string", description: "Closing/escrow/title company name" },
          buyer_agent:               { type: "string", description: "Buyer agent name from Section 7" },
          seller_agent:              { type: "string", description: "Seller/listing agent name from Section 7" },
          buyer_brokerage:           { type: "string", description: "Buyer agent's firm/brokerage" },
          seller_brokerage:          { type: "string", description: "Seller agent's firm/brokerage" },
          inspection_days:           { type: "number", description: "General building inspection days from Section 15" },
          inspection_deadline:       { type: "string", description: "Explicit inspection deadline date in YYYY-MM-DD format if stated" },
          sewage_days:               { type: "number", description: "Sewage/septic inspection days" },
          water_quality_days:        { type: "number", description: "Water quality inspection days" },
          radon_days:                { type: "number", description: "Radon inspection days" },
          due_diligence_days:        { type: "number", description: "Due diligence days from Section 16" },
          due_diligence_deadline:    { type: "string", description: "Explicit due diligence deadline date in YYYY-MM-DD format if stated" },
          financing_commitment_date: { type: "string", description: "Financing commitment deadline in YYYY-MM-DD from Section 19" },
          appraisal_deadline:        { type: "string", description: "Explicit appraisal deadline date in YYYY-MM-DD format if stated" },
          commission_percent:        { type: "number", description: "Commission percentage from Section 20" },
          commission_type:           { type: "string", description: "'percent' or 'flat'" },
          seller_concession_amount:  { type: "number", description: "Seller concession dollar amount" },
          professional_fee_percent:  { type: "number", description: "Professional fee percentage" },
          professional_fee_amount:   { type: "number", description: "Professional fee dollar amount" },
          commission_notes:          { type: "string", description: "Summary of Section 20 compensation terms" }
        }
      }
    });

    if (extraction.status === "error") {
      console.error("Extraction failed:", extraction.details);
      return Response.json({ error: extraction.details || "Extraction failed" }, { status: 500 });
    }

    const result = extraction.output || {};

    // --- Fallback: targeted multi-line extraction for financial fields ---
    const needsFinancialFallback = !result.purchase_price || !result.deposit_amount;
    if (needsFinancialFallback) {
      console.log("Running targeted financial field fallback extraction...");
      const financialExtraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          description: `NHAR P&S Agreement financial field extraction. 
            RULE 1 - SELLING PRICE: Find the text 'SELLING PRICE'. The dollar amount is often on the NEXT line or up to 3 lines after it. Extract the first value matching $###,### or $######.
            RULE 2 - EARNEST MONEY: Find the phrase 'deposit of earnest money in the amount of'. The dollar amount is often on the NEXT line or up to 3 lines after it. Extract the first value matching $###,### or $######.
            Strip $ and commas, return as plain number.`,
          properties: {
            purchase_price: { type: "number", description: "Dollar amount found within 3 lines after 'SELLING PRICE' label. Strip $ and commas." },
            deposit_amount: { type: "number", description: "Dollar amount found within 3 lines after 'deposit of earnest money in the amount of'. Strip $ and commas." },
          }
        }
      });

      if (financialExtraction.status !== "error" && financialExtraction.output) {
        const fb = financialExtraction.output;
        if (!result.purchase_price && fb.purchase_price) result.purchase_price = fb.purchase_price;
        if (!result.deposit_amount && fb.deposit_amount) result.deposit_amount = fb.deposit_amount;
      }
    }

    // Mark undetected financial fields with sentinel so UI can show "verify manually"
    if (!result.purchase_price) result.purchase_price_undetected = true;
    if (!result.deposit_amount) result.deposit_amount_undetected = true;

    // --- Fallback: targeted deadline day extraction ---
    const needsDeadlineFallback = !result.earnest_money_days && !result.earnest_money_deadline ||
                                   !result.inspection_days && !result.inspection_deadline ||
                                   !result.due_diligence_days && !result.due_diligence_deadline;

    if (needsDeadlineFallback && result.acceptance_date) {
      console.log("Running targeted deadline day fallback extraction...");
      const deadlineExtraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          description: `NHAR Purchase & Sales Agreement deadline extraction.
            EARNEST MONEY: Find "deposit of earnest money" or "earnest money" section. Look for a number of days (e.g. "within 3 days", "within 5 banking days"). Extract the number.
            INSPECTION: Find Section 15 or any "inspection" contingency. Look for "within X days" from acceptance/effective date. Extract X.
            DUE DILIGENCE: Find Section 16 or "due diligence" section. Look for "within X days". Extract X.
            Return ONLY the number of days as integers.`,
          properties: {
            earnest_money_days: { type: "number", description: "Number of days after acceptance date that earnest money deposit is due. Look for phrases like 'within X days of the effective date' near 'earnest money' or 'deposit'." },
            inspection_days:    { type: "number", description: "Number of days for inspection contingency period from Section 15. e.g. 'within 10 days of the acceptance date'." },
            due_diligence_days: { type: "number", description: "Number of days for due diligence period from Section 16 or similar. e.g. 'within 15 days'." },
          }
        }
      });

      if (deadlineExtraction.status !== "error" && deadlineExtraction.output) {
        const fb = deadlineExtraction.output;
        if (!result.earnest_money_days && fb.earnest_money_days) result.earnest_money_days = fb.earnest_money_days;
        if (!result.inspection_days && fb.inspection_days) result.inspection_days = fb.inspection_days;
        if (!result.due_diligence_days && fb.due_diligence_days) result.due_diligence_days = fb.due_diligence_days;
        console.log("Deadline fallback result:", fb);
      }
    }

    // Calculate deadline dates from day offsets + acceptance date (fallback if explicit dates not extracted)
    const acceptanceDate = result.acceptance_date || null;

    // Try to extract relative dates from raw document text via second AI pass
    let relativeDatesFromText = {};
    if (acceptanceDate) {
      try {
        const textExtraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            description: "Extract all deadline-related text for relative date calculation",
            properties: {
              raw_deadline_text: { type: "string", description: "All text containing deadline deadlines, inspection, due diligence, and appraisal information" }
            }
          }
        });

        if (textExtraction.status !== "error" && textExtraction.output?.raw_deadline_text) {
          relativeDatesFromText = extractRelativeDates(textExtraction.output.raw_deadline_text, acceptanceDate);
          debugFlags.push("RELATIVE_DATES_EXTRACTED");
        }
      } catch (e) {
        console.warn("Could not extract relative dates from text:", e.message);
      }
    }

    // Apply extracted relative dates, fall back to calculated dates
    result.inspection_deadline    = result.inspection_deadline || relativeDatesFromText.inspection_deadline || addDays(acceptanceDate, result.inspection_days);
    result.sewage_deadline        = addDays(acceptanceDate, result.sewage_days);
    result.water_quality_deadline = addDays(acceptanceDate, result.water_quality_days);
    result.radon_deadline         = addDays(acceptanceDate, result.radon_days);
    result.earnest_money_deadline = result.earnest_money_deadline || relativeDatesFromText.earnest_money_deadline || addDays(acceptanceDate, result.earnest_money_days);
    result.due_diligence_deadline = result.due_diligence_deadline || relativeDatesFromText.due_diligence_deadline || addDays(acceptanceDate, result.due_diligence_days);
    result.appraisal_deadline     = result.appraisal_deadline || relativeDatesFromText.appraisal_deadline;

    // Add debug info
    result._debug = {
      text_confidence: !result.acceptance_date ? "LOW" : "HIGH",
      relative_dates_detected: debugFlags.includes("RELATIVE_DATES_EXTRACTED"),
      flags: debugFlags,
    };

    console.log("Extraction complete:", {
      buyer: result.buyer_names,
      seller: result.seller_names,
      address: result.property_address,
      price: result.purchase_price,
      closing: result.closing_date,
      earnest_money_days: result.earnest_money_days,
      earnest_money_deadline: result.earnest_money_deadline,
      inspection_days: result.inspection_days,
      inspection_deadline: result.inspection_deadline,
      due_diligence_days: result.due_diligence_days,
      due_diligence_deadline: result.due_diligence_deadline,
      financing_commitment_date: result.financing_commitment_date,
      debug: result._debug,
    });

    // ── Auto-create Contingency records if transaction_id provided ──
    if (transaction_id) {
      const contingenciesToCreate = [];

      const inspectionTypes = [
        { key: "inspection_days", label: "General Building" },
        { key: "sewage_days", label: "Sewage / Septic" },
        { key: "water_quality_days", label: "Water Quality" },
        { key: "radon_days", label: "Radon" },
      ];

      for (const { key, label } of inspectionTypes) {
        if (result[key] && Number(result[key]) > 0) {
          const dueDate = addDays(acceptanceDate, result[key]);
          contingenciesToCreate.push({
            transaction_id,
            brokerage_id: brokerage_id || null,
            contingency_type: "Inspection",
            sub_type: label,
            days_from_effective: Number(result[key]),
            due_date: dueDate,
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
        const dueDate = addDays(acceptanceDate, result.due_diligence_days);
        contingenciesToCreate.push({
          transaction_id,
          brokerage_id: brokerage_id || null,
          contingency_type: "Due Diligence",
          sub_type: "Due Diligence Period",
          days_from_effective: Number(result.due_diligence_days),
          due_date: dueDate,
          is_active: true,
          is_custom: false,
          source: "Parsed",
          status: "Pending",
        });
      }

      if (contingenciesToCreate.length > 0) {
        // Remove existing parsed contingencies to avoid duplicates on re-parse
        const existing = await base44.asServiceRole.entities.Contingency.filter({
          transaction_id,
          source: "Parsed",
        });
        await Promise.all(existing.map(e => base44.asServiceRole.entities.Contingency.delete(e.id)));
        // Create new ones
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
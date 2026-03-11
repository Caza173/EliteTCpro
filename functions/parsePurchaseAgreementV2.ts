import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function addDays(isoDate, days) {
  if (!isoDate || days == null) return null;
  try {
    const d = new Date(isoDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
    return d.toISOString().split("T")[0];
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: "No file_url provided" }, { status: 400 });

    console.log("Extracting data from document...");

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
          closing_date:              { type: "string", description: "Transfer of Title date in YYYY-MM-DD" },
          title_company:             { type: "string", description: "Closing/escrow/title company name" },
          buyer_agent:               { type: "string", description: "Buyer agent name from Section 7" },
          seller_agent:              { type: "string", description: "Seller/listing agent name from Section 7" },
          buyer_brokerage:           { type: "string", description: "Buyer agent's firm/brokerage" },
          seller_brokerage:          { type: "string", description: "Seller agent's firm/brokerage" },
          inspection_days:           { type: "number", description: "General building inspection days from Section 15" },
          sewage_days:               { type: "number", description: "Sewage/septic inspection days" },
          water_quality_days:        { type: "number", description: "Water quality inspection days" },
          radon_days:                { type: "number", description: "Radon inspection days" },
          due_diligence_days:        { type: "number", description: "Due diligence days from Section 16" },
          financing_commitment_date: { type: "string", description: "Financing commitment deadline in YYYY-MM-DD from Section 19" },
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

    // Calculate deadline dates from day offsets + acceptance date
    const acceptanceDate = result.acceptance_date || null;
    result.inspection_deadline    = addDays(acceptanceDate, result.inspection_days);
    result.sewage_deadline        = addDays(acceptanceDate, result.sewage_days);
    result.water_quality_deadline = addDays(acceptanceDate, result.water_quality_days);
    result.radon_deadline         = addDays(acceptanceDate, result.radon_days);
    result.earnest_money_deadline = addDays(acceptanceDate, result.earnest_money_days);
    result.due_diligence_deadline = addDays(acceptanceDate, result.due_diligence_days);

    console.log("Extraction complete:", {
      buyer: result.buyer_names,
      seller: result.seller_names,
      address: result.property_address,
      price: result.purchase_price,
      closing: result.closing_date,
    });

    return Response.json(result);
  } catch (error) {
    console.error("parsePurchaseAgreementV2 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
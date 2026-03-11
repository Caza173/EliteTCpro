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

    const body = await req.json();
    const { file_url } = body;

    if (!file_url) return Response.json({ error: "No file_url provided" }, { status: 400 });

    console.log("Running single-pass AI extraction on document...");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are parsing a New Hampshire NHAR Purchase & Sales Agreement PDF.

Extract ALL of the following fields from the document in a single pass.

IMPORTANT NHAR form layout notes:
- Section 1: Parties. Format is "between [SELLER] (SELLER) and [BUYER] (BUYER)". Seller is listed FIRST.
- Section 2: Property address
- Section 3: Purchase price, deposit/earnest money amount, earnest money days, title company
- Section 5: Closing date ("Transfer of Title on or before [date]")
- Section 7: Agent names and brokerages
- Section 15: Inspection periods in days from acceptance date
- Section 16: Due diligence days
- Section 19: Financing commitment date
- Section 20: Commission/compensation terms

Return ONLY valid JSON with these exact fields (use null for anything not found):
{
  "buyer_names": "string or null",
  "seller_names": "string or null",
  "acceptance_date": "YYYY-MM-DD or null",
  "property_address": "string or null",
  "purchase_price": "number or null",
  "deposit_amount": "number or null",
  "earnest_money_days": "number or null",
  "closing_date": "YYYY-MM-DD or null",
  "title_company": "string or null",
  "buyer_agent": "string or null",
  "seller_agent": "string or null",
  "buyer_brokerage": "string or null",
  "seller_brokerage": "string or null",
  "inspection_days": "number or null",
  "sewage_days": "number or null",
  "water_quality_days": "number or null",
  "radon_days": "number or null",
  "due_diligence_days": "number or null",
  "financing_commitment_date": "YYYY-MM-DD or null",
  "commission_percent": "number or null",
  "commission_type": "percent or flat or null",
  "seller_concession_amount": "number or null",
  "professional_fee_percent": "number or null",
  "professional_fee_amount": "number or null",
  "commission_notes": "string or null"
}`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          buyer_names:               { type: "string" },
          seller_names:              { type: "string" },
          acceptance_date:           { type: "string" },
          property_address:          { type: "string" },
          purchase_price:            { type: "number" },
          deposit_amount:            { type: "number" },
          earnest_money_days:        { type: "number" },
          closing_date:              { type: "string" },
          title_company:             { type: "string" },
          buyer_agent:               { type: "string" },
          seller_agent:              { type: "string" },
          buyer_brokerage:           { type: "string" },
          seller_brokerage:          { type: "string" },
          inspection_days:           { type: "number" },
          sewage_days:               { type: "number" },
          water_quality_days:        { type: "number" },
          radon_days:                { type: "number" },
          due_diligence_days:        { type: "number" },
          financing_commitment_date: { type: "string" },
          commission_percent:        { type: "number" },
          commission_type:           { type: "string" },
          seller_concession_amount:  { type: "number" },
          professional_fee_percent:  { type: "number" },
          professional_fee_amount:   { type: "number" },
          commission_notes:          { type: "string" },
        }
      }
    });

    // Calculate deadline dates from day offsets
    const acceptanceDate = result.acceptance_date || null;
    result.inspection_deadline    = result.inspection_deadline    || addDays(acceptanceDate, result.inspection_days);
    result.sewage_deadline        = result.sewage_deadline        || addDays(acceptanceDate, result.sewage_days);
    result.water_quality_deadline = result.water_quality_deadline || addDays(acceptanceDate, result.water_quality_days);
    result.radon_deadline         = result.radon_deadline         || addDays(acceptanceDate, result.radon_days);
    result.earnest_money_deadline = result.earnest_money_deadline || addDays(acceptanceDate, result.earnest_money_days);
    result.due_diligence_deadline = result.due_diligence_deadline || addDays(acceptanceDate, result.due_diligence_days);

    console.log("Extraction complete:", {
      buyer: result.buyer_names,
      seller: result.seller_names,
      address: result.property_address,
      price: result.purchase_price,
      closing: result.closing_date,
      acceptance: result.acceptance_date,
    });

    return Response.json(result);
  } catch (error) {
    console.error("parsePurchaseAgreementV2 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
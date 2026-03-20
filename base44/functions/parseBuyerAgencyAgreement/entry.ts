import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Parse NHAR Exclusive Buyer Representation Agreement / Designated Agency form
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: "No file_url provided" }, { status: 400 });

    console.log("Parsing NHAR Exclusive Buyer Representation Agreement...");

    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        description: `NHAR Exclusive Buyer Representation Agreement / Designated Agency (New Hampshire Association of REALTORS® Standard Form).
          Section 1: Buyer name(s), Firm name, date of agreement, general property description/features desired, location desired, price range.
          Section 2: Professional services fee ($ or %), retainer fee, post-expiration protection months.
          Section 3: Agreement start date (FROM ___), agreement end date (through ___), retainer amount.
          Section 5: Designated agent name appointed to represent the buyer.
          Section 10: Additional provisions.`,
        properties: {
          buyer_names:              { type: "string",  description: "Buyer name(s) from Section 1, the undersigned BUYER." },
          firm_name:                { type: "string",  description: "Brokerage / FIRM name representing the buyer." },
          agreement_date:           { type: "string",  description: "Date of the agreement in YYYY-MM-DD format (Section 1)." },
          property_description:     { type: "string",  description: "General features/description of property buyer is seeking (Section 1)." },
          location_desired:         { type: "string",  description: "Location/area where buyer is looking (Section 1)." },
          price_range_min:          { type: "number",  description: "Minimum price range buyer is targeting. Return as plain number." },
          price_range_max:          { type: "number",  description: "Maximum price range buyer is targeting. Return as plain number." },
          fee_percent:              { type: "number",  description: "Section 2 — Professional services fee as a percentage of contract price." },
          fee_flat:                 { type: "number",  description: "Section 2 — Professional services fee as flat dollar amount." },
          retainer_fee:             { type: "number",  description: "Retainer fee amount paid upon signing (Section 2 / Section 3)." },
          protection_period_months: { type: "number",  description: "Post-expiration protection period in months (Section 2)." },
          agreement_start_date:     { type: "string",  description: "Agreement start date in YYYY-MM-DD (Section 3: 'FROM ___')." },
          agreement_end_date:       { type: "string",  description: "Agreement end date in YYYY-MM-DD (Section 3: 'through ___')." },
          designated_agent:         { type: "string",  description: "Designated agent name(s) appointed to represent the buyer (Section 5)." },
          additional_provisions:    { type: "string",  description: "Any text in Section 10 Additional Provisions." }
        }
      }
    });

    if (extraction.status === "error") {
      console.error("Extraction failed:", extraction.details);
      return Response.json({ error: extraction.details || "Extraction failed" }, { status: 500 });
    }

    const result = extraction.output || {};

    console.log("Buyer agency agreement parsed:", {
      buyer: result.buyer_names,
      firm: result.firm_name,
      agent: result.designated_agent,
      from: result.agreement_start_date,
      through: result.agreement_end_date,
    });

    return Response.json(result);
  } catch (error) {
    console.error("parseBuyerAgencyAgreement error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
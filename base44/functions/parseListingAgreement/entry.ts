import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Parse NHAR Exclusive Listing Agreement / Designated Agency form
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: "No file_url provided" }, { status: 400 });

    console.log("Parsing NHAR Exclusive Listing Agreement...");

    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        description: `NHAR Exclusive Listing Agreement / Designated Agency (New Hampshire Association of REALTORS® Standard Form).
          Section 1: Seller name, Firm name, date of agreement, property address, property description (type), county, Book/Page.
          Section 1 also has the list price after 'at a price of $'.
          Section 2: Commission structure — (a) listing firm commission % or $, buyer-unrepresented additional %, (b) buyer agent compensation % or $, (c) additional provisions.
          Section 3: Agreement start date (from ___), expiration date (through ___), post-expiration protection months.
          Section 4: Designated agent name.`,
        properties: {
          seller_names:                   { type: "string",  description: "Seller name(s) from Section 1, the undersigned seller." },
          firm_name:                       { type: "string",  description: "Brokerage / FIRM name that receives the listing." },
          agreement_date:                  { type: "string",  description: "Date of the agreement in YYYY-MM-DD format (Section 1)." },
          property_address:                { type: "string",  description: "Full property address from Section 1." },
          property_description:            { type: "string",  description: "Property type or description (e.g. 'Single Fam Res. Home') from Section 1." },
          county:                          { type: "string",  description: "County where property is recorded." },
          deed_book:                       { type: "string",  description: "Registry of Deeds Book number." },
          deed_page:                       { type: "string",  description: "Registry of Deeds Page number." },
          list_price:                      { type: "number",  description: "Listing price (exclusive right to sell at a price of $___). Return as plain number, no $ or commas." },
          listing_commission_percent:      { type: "number",  description: "Section 2(a) — Listing firm commission percentage. Look for '___% of the contract price' in Section 2a." },
          listing_commission_flat:         { type: "number",  description: "Section 2(a) — Listing firm commission flat dollar amount if percent not used." },
          unrepresented_buyer_add_percent: { type: "number",  description: "Section 2(a) bullet — Additional % if buyer is unrepresented." },
          buyer_agent_commission_percent:  { type: "number",  description: "Section 2(b) — Compensation % offered to buyer's agent/firm." },
          buyer_agent_commission_flat:     { type: "number",  description: "Section 2(b) — Flat dollar compensation to buyer agent if percent not used." },
          listing_start_date:              { type: "string",  description: "Agreement start date in YYYY-MM-DD (Section 3: 'from ___')." },
          listing_expiration_date:         { type: "string",  description: "Agreement expiration date in YYYY-MM-DD (Section 3: 'through ___')." },
          protection_period_months:        { type: "number",  description: "Post-expiration protection period in months (Section 3)." },
          designated_agent:                { type: "string",  description: "Designated agent name(s) appointed for the seller (Section 4)." },
          mls_entry:                       { type: "boolean", description: "Whether the listing will be entered into MLS (true/false, Section 3 default is true)." },
          additional_provisions:           { type: "string",  description: "Any text in Section 9 Additional Provisions." }
        }
      }
    });

    if (extraction.status === "error") {
      console.error("Extraction failed:", extraction.details);
      return Response.json({ error: extraction.details || "Extraction failed" }, { status: 500 });
    }

    const result = extraction.output || {};

    console.log("Listing agreement parsed:", {
      seller: result.seller_names,
      firm: result.firm_name,
      address: result.property_address,
      listPrice: result.list_price,
      from: result.listing_start_date,
      through: result.listing_expiration_date,
      agent: result.designated_agent,
    });

    return Response.json(result);
  } catch (error) {
    console.error("parseListingAgreement error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
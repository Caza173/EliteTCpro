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
        description: `You are a real estate document parser specialized in New Hampshire Association of REALTORS® forms.
Extract structured data from an Exclusive Listing Agreement (Designated Agency).

PARSING RULES:
- Dates may appear inline (e.g., "03/18/2026 06/30/2026") — split them correctly using context (Section 3 "from" and "through").
- Ignore timestamps (e.g., 8:03 PM EDT). Ignore dotloop verification text and URLs.
- Normalize all dates to ISO format: YYYY-MM-DD.
- Strip all currency symbols and commas from numeric values.
- If a value is missing, return null — do NOT guess.

SECTIONS:
- Section 1: Seller names, firm/brokerage name, property address, list price, agreement date.
- Section 2a: Listing firm commission (% of contract price or flat fee). Additional % if buyer is unrepresented.
- Section 2b: Buyer agent compensation — may be YES (with % or flat) or NO (return null).
- Section 3: Start date ("from ___") and expiration date ("through ___"), protection period months.
- Section 4: Designated agent name(s).`,
        properties: {
          seller_names: {
            type: "string",
            description: "Full legal name(s) of all sellers from Section 1 / signature block. If multiple, join with ' & '."
          },
          firm_name: {
            type: "string",
            description: "Brokerage / FIRM name receiving the listing (Section 1)."
          },
          agreement_date: {
            type: "string",
            description: "Date the agreement was signed, YYYY-MM-DD (Section 1)."
          },
          property_address: {
            type: "string",
            description: "Full property address including street, city, state, and zip from Section 1."
          },
          property_description: {
            type: "string",
            description: "Property type or description (e.g. 'Single Fam Res. Home') from Section 1."
          },
          county: {
            type: "string",
            description: "County where property is located."
          },
          list_price: {
            type: "number",
            description: "Listing price from Section 1 ('at a price of $___'). Plain number, no $ or commas."
          },
          listing_commission_percent: {
            type: "number",
            description: "Section 2(a) — Listing firm commission as a percentage of contract price (e.g. 5 for 5%). null if flat fee used instead."
          },
          listing_commission_flat: {
            type: "number",
            description: "Section 2(a) — Listing firm commission as a flat dollar amount. null if percentage used."
          },
          buyer_agent_offered: {
            type: "boolean",
            description: "Section 2(b) — Is compensation offered to a buyer's agent/firm? true if YES, false if NO."
          },
          buyer_agent_commission_percent: {
            type: "number",
            description: "Section 2(b) — Buyer agent compensation as a percentage. null if not offered or flat fee used."
          },
          buyer_agent_commission_flat: {
            type: "number",
            description: "Section 2(b) — Buyer agent compensation as a flat dollar amount. null if not offered or percentage used."
          },
          listing_start_date: {
            type: "string",
            description: "Agreement start date YYYY-MM-DD from Section 3 ('from ___'). If two dates appear inline, the FIRST is the start date."
          },
          listing_expiration_date: {
            type: "string",
            description: "Agreement expiration date YYYY-MM-DD from Section 3 ('through ___'). If two dates appear inline, the SECOND is the expiration date."
          },
          protection_period_months: {
            type: "number",
            description: "Post-expiration protection period in months (Section 3)."
          },
          designated_agent: {
            type: "string",
            description: "Designated agent name(s) appointed for the seller (Section 4)."
          },
          additional_provisions: {
            type: "string",
            description: "Any text from Section 9 Additional Provisions."
          }
        }
      }
    });

    if (extraction.status === "error") {
      console.error("Extraction failed:", extraction.details);
      return Response.json({ error: extraction.details || "Extraction failed" }, { status: 500 });
    }

    const raw = extraction.output || {};

    // Shape the response to match what the frontend expects
    const result = {
      seller_names: raw.seller_names || null,
      firm_name: raw.firm_name || null,
      agreement_date: raw.agreement_date || null,
      property_address: raw.property_address || null,
      property_description: raw.property_description || null,
      county: raw.county || null,
      list_price: raw.list_price || null,
      listing_commission_percent: raw.listing_commission_percent || null,
      listing_commission_flat: raw.listing_commission_flat || null,
      listing_agent_commission: {
        percentage: raw.listing_commission_percent || null,
        flat_fee: raw.listing_commission_flat || null,
      },
      buyer_agent_commission: raw.buyer_agent_offered === false ? null : {
        percentage: raw.buyer_agent_commission_percent || null,
        flat_fee: raw.buyer_agent_commission_flat || null,
      },
      listing_start_date: raw.listing_start_date || null,
      listing_expiration_date: raw.listing_expiration_date || null,
      protection_period_months: raw.protection_period_months || null,
      designated_agent: raw.designated_agent || null,
      additional_provisions: raw.additional_provisions || null,
    };

    console.log("Listing agreement parsed:", {
      seller: result.seller_names,
      firm: result.firm_name,
      address: result.property_address,
      listPrice: result.list_price,
      from: result.listing_start_date,
      through: result.listing_expiration_date,
      listingCommission: result.listing_agent_commission,
      buyerAgentCommission: result.buyer_agent_commission,
      agent: result.designated_agent,
    });

    return Response.json(result);
  } catch (error) {
    console.error("parseListingAgreement error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
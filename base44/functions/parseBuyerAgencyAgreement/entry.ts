import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Parse NHAR Exclusive Buyer Agency Agreement / Designated Agency form
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: "No file_url provided" }, { status: 400 });

    console.log("Parsing NHAR Exclusive Buyer Agency Agreement...");

    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        description: `You are a real estate document parser specialized in New Hampshire Association of REALTORS® forms.
Extract structured data from an Exclusive Buyer Agency Agreement (Designated Agency).

PARSING RULES:
- Dates may appear inline or in different sections → normalize to YYYY-MM-DD.
- Ignore timestamps, Dotloop verification text, and URLs.
- Strip currency symbols and commas from numbers.
- Percentages should be numeric only (e.g., 3 for 3%).
- If multiple compensation structures exist, prioritize: percentage > flat_fee > hourly_rate.
- If a field is missing, return null — do NOT infer or guess.

SECTIONS TO LOOK FOR:
- Buyer names: near signature lines and "BUYER" label in Section 1.
- Brokerage: FIRM name in Section 1.
- Designated agent: the specific agent appointed for the buyer.
- Agreement dates: start ("from ___") and expiration ("through ___").
- Compensation: percentage of purchase price, flat fee, or hourly rate.
- Compensation source: whether seller, buyer, or combination pays the agent.
- Retainer: any upfront fee paid by buyer.
- Exclusivity: whether the agreement grants exclusive representation.`,
        properties: {
          buyer_names: {
            type: "string",
            description: "Full legal name(s) of all buyers. If multiple, join with ' & '."
          },
          brokerage_name: {
            type: "string",
            description: "Name of the brokerage / FIRM representing the buyer (Section 1)."
          },
          agent_name: {
            type: "string",
            description: "Designated agent name appointed to represent the buyer."
          },
          agreement_start_date: {
            type: "string",
            description: "Effective start date of the agreement in YYYY-MM-DD format."
          },
          agreement_expiration_date: {
            type: "string",
            description: "Expiration date of the agreement in YYYY-MM-DD format."
          },
          compensation_percent: {
            type: "number",
            description: "Buyer agent compensation as a percentage of purchase price (e.g. 3 for 3%). null if not applicable."
          },
          compensation_flat_fee: {
            type: "number",
            description: "Buyer agent compensation as a flat dollar amount. null if not applicable."
          },
          compensation_hourly_rate: {
            type: "number",
            description: "Buyer agent compensation as an hourly rate in dollars. null if not applicable."
          },
          compensation_source: {
            type: "string",
            description: "How compensation is expected to be paid. One of: 'seller_offered' (from MLS or listing agreement), 'buyer_direct' (buyer pays directly), 'combination'. Return null if unclear."
          },
          retainer_fee: {
            type: "number",
            description: "Any upfront retainer fee paid by the buyer at signing. null if none."
          },
          is_exclusive: {
            type: "boolean",
            description: "Whether the agreement grants exclusive buyer representation (true/false)."
          }
        }
      }
    });

    if (extraction.status === "error") {
      console.error("Extraction failed:", extraction.details);
      return Response.json({ error: extraction.details || "Extraction failed" }, { status: 500 });
    }

    const raw = extraction.output || {};

    // Shape response to match frontend expectations and the defined output format
    const result = {
      buyer_names: raw.buyer_names || null,
      brokerage_name: raw.brokerage_name || null,
      // Legacy field aliases used by AgentIntake
      firm_name: raw.brokerage_name || null,
      designated_agent: raw.agent_name || null,
      agent_name: raw.agent_name || null,
      agreement_start_date: raw.agreement_start_date || null,
      agreement_expiration_date: raw.agreement_expiration_date || null,
      buyer_agent_compensation: {
        percentage: raw.compensation_percent || null,
        flat_fee: raw.compensation_flat_fee || null,
        hourly_rate: raw.compensation_hourly_rate || null,
      },
      compensation_source: raw.compensation_source || null,
      retainer_fee: raw.retainer_fee || null,
      exclusive: raw.is_exclusive !== undefined ? raw.is_exclusive : true,
    };

    console.log("Buyer agency agreement parsed:", {
      buyers: result.buyer_names,
      brokerage: result.brokerage_name,
      agent: result.agent_name,
      start: result.agreement_start_date,
      expiration: result.agreement_expiration_date,
      compensation: result.buyer_agent_compensation,
      source: result.compensation_source,
    });

    return Response.json(result);
  } catch (error) {
    console.error("parseBuyerAgencyAgreement error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
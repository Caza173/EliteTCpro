import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Parse Buyer Agency Agreement PDF using AI to extract all key fields.
 *
 * Payload: { file_url }
 * Returns: {
 *   buyer_names, firm_name, designated_agent,
 *   agreement_start_date, agreement_expiration_date,
 *   compensation, retainer_fee
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url } = body;

    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    // Use AI to extract all fields from the document image/PDF
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a real estate document parser. Extract the following fields from this Buyer Agency / Buyer Representation Agreement document. Return ONLY the JSON object with these exact keys:

- buyer_names: Full name(s) of the buyer(s) (string, join multiple with " & ")
- firm_name: The real estate firm / brokerage name representing the buyer
- designated_agent: The agent's full name designated to represent the buyer
- agreement_start_date: Agreement start/effective date in YYYY-MM-DD format (or null)
- agreement_expiration_date: Agreement expiration/end date in YYYY-MM-DD format (or null)
- compensation: Compensation or commission (e.g. "2.5%" or "$5,000" or null)
- retainer_fee: Any retainer fee amount (e.g. "$500" or null)

If a field is not found, use null. Return valid JSON only, no explanation.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          buyer_names: { type: "string" },
          firm_name: { type: "string" },
          designated_agent: { type: "string" },
          agreement_start_date: { type: "string" },
          agreement_expiration_date: { type: "string" },
          compensation: { type: "string" },
          retainer_fee: { type: "string" },
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    console.error("parseBuyerAgencyAgreement error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
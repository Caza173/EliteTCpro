import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Section Splitter ────────────────────────────────────────────────────────
// Splits raw PDF text into numbered NHAR sections using section number patterns.
// Handles both "1." style and "SECTION 1" style headings.

function splitIntoSections(text) {
  const sections = {};

  // Normalize line endings
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  const sectionPattern = /^(?:SECTION\s+)?(\d{1,2})\.\s*(.*)$/i;
  let currentSection = null;
  let buffer = [];

  for (const line of lines) {
    const match = line.trim().match(sectionPattern);
    if (match) {
      // Save previous section
      if (currentSection !== null) {
        sections[currentSection] = buffer.join(" ").replace(/\s+/g, " ").trim();
      }
      currentSection = parseInt(match[1]);
      buffer = [match[2] || ""];
    } else {
      if (currentSection !== null) {
        buffer.push(line.trim());
      }
    }
  }

  // Save last section
  if (currentSection !== null) {
    sections[currentSection] = buffer.join(" ").replace(/\s+/g, " ").trim();
  }

  // Fallback: if no sections found, try to detect via "1." patterns mid-text
  if (Object.keys(sections).length === 0) {
    const inlinePattern = /(?:^|\s)(\d{1,2})\.\s+(?=[A-Z])/gm;
    let lastIdx = 0;
    let lastNum = null;
    let match;
    const flat = text.replace(/\r\n/g, "\n");

    while ((match = inlinePattern.exec(flat)) !== null) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 25) {
        if (lastNum !== null) {
          sections[lastNum] = flat.slice(lastIdx, match.index).replace(/\s+/g, " ").trim();
        }
        lastNum = num;
        lastIdx = match.index + match[0].length;
      }
    }
    if (lastNum !== null) {
      sections[lastNum] = flat.slice(lastIdx).replace(/\s+/g, " ").trim();
    }
  }

  console.log("Sections found:", Object.keys(sections).sort((a,b) => a-b).join(", "));
  return sections;
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

function addDays(isoDate, days) {
  if (!isoDate || days == null) return null;
  try {
    const d = new Date(isoDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
    return d.toISOString().split("T")[0];
  } catch { return null; }
}

// ─── Per-Section AI Extractions ──────────────────────────────────────────────

async function extractSection(base44, sectionNum, text, schema, prompt) {
  if (!text || text.length < 10) return {};
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are parsing Section ${sectionNum} of a New Hampshire NHAR Purchase & Sales Agreement.\n\n${prompt}\n\nSection ${sectionNum} text:\n"""\n${text.substring(0, 2000)}\n"""\n\nReturn ONLY the JSON fields listed. Use null for missing fields. Dates must be ISO format YYYY-MM-DD. Numbers must be plain numbers.`,
    response_json_schema: { type: "object", properties: schema },
  });
  return result || {};
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { text } = body;

    if (!text) return Response.json({ error: "No text provided" }, { status: 400 });

    console.log("Stage 1: Splitting document into sections...");
    const sections = splitIntoSections(text);
    const sectionKeys = Object.keys(sections);
    console.log(`Found ${sectionKeys.length} sections:`, sectionKeys.join(", "));

    // If section splitter found very few sections, pass whole text as section context
    const getSection = (nums) => {
      for (const n of nums) {
        if (sections[n] && sections[n].length > 20) return sections[n];
      }
      // fallback: search in full text for the section number
      return text.substring(0, 8000);
    };

    console.log("Stage 2: Running parallel AI extractions per section...");

    // Run all section extractions in parallel
    const [
      sec1,   // parties + date
      sec2,   // property address
      sec3,   // price + deposit + earnest days
      sec5,   // closing date + title company
      sec7,   // agents + brokerages
      sec15,  // inspection days
      sec16,  // due diligence days
      sec19,  // financing commitment date
      sec20,  // commission
    ] = await Promise.all([
      extractSection(base44, 1, getSection([1]),
        {
          buyer_names:     { type: "string" },
          seller_names:    { type: "string" },
          acceptance_date: { type: "string" },
        },
        `Extract:
- buyer_names: The BUYER name(s). In NHAR form layout: "between [SELLER] (SELLER) and [BUYER] (BUYER)". The BUYER appears AFTER "and".
- seller_names: The SELLER name(s). Appears FIRST before "and".
- acceptance_date: The EFFECTIVE DATE from the top-right box. Format: YYYY-MM-DD.`
      ),

      extractSection(base44, 2, getSection([2]),
        { property_address: { type: "string" } },
        `Extract:
- property_address: The full property address including city and state. Look for "located at" or "WITNESSETH" clause.`
      ),

      extractSection(base44, 3, getSection([3]),
        {
          purchase_price:    { type: "number" },
          deposit_amount:    { type: "number" },
          earnest_money_days:{ type: "number" },
          title_company:     { type: "string" },
        },
        `Extract:
- purchase_price: The SELLING PRICE dollar amount (number only, no $ sign, e.g. 540000).
- deposit_amount: The earnest money deposit amount (number only).
- earnest_money_days: How many days from EFFECTIVE DATE to deliver the deposit. Look for "within X days".
- title_company: The ESCROW AGENT or closing company name.`
      ),

      extractSection(base44, 5, getSection([5]),
        {
          closing_date:  { type: "string" },
          title_company: { type: "string" },
        },
        `Extract:
- closing_date: From "TRANSFER OF TITLE: On or before [date]". Format YYYY-MM-DD.
- title_company: The closing location or title company mentioned in this section.`
      ),

      extractSection(base44, 7, getSection([7]),
        {
          buyer_agent:      { type: "string" },
          seller_agent:     { type: "string" },
          buyer_brokerage:  { type: "string" },
          seller_brokerage: { type: "string" },
        },
        `Extract:
- buyer_agent: Name of the agent representing the BUYER (labeled as "buyer agent" or "selling agent").
- seller_agent: Name of the agent representing the SELLER (labeled as "seller agent" or "listing agent").
- buyer_brokerage: The firm/brokerage of the buyer agent.
- seller_brokerage: The firm/brokerage of the seller agent.`
      ),

      extractSection(base44, 15, getSection([15]),
        {
          inspection_days:  { type: "number" },
          sewage_days:      { type: "number" },
          water_quality_days: { type: "number" },
          radon_days:       { type: "number" },
        },
        `Extract inspection periods (number of days from acceptance date):
- inspection_days: General Building inspection days. Look for "General Building within X days".
- sewage_days: Sewage/septic inspection days.
- water_quality_days: Water quality inspection days.
- radon_days: Radon inspection days.`
      ),

      extractSection(base44, 16, getSection([16]),
        { due_diligence_days: { type: "number" } },
        `Extract:
- due_diligence_days: Number of days for due diligence. Look for "BUYER must notify SELLER in writing within X days".`
      ),

      extractSection(base44, 19, getSection([19]),
        { financing_commitment_date: { type: "string" } },
        `Extract:
- financing_commitment_date: The Financing Deadline or commitment date. Format YYYY-MM-DD.`
      ),

      extractSection(base44, 20, getSection([20]),
        {
          buyer_agent_commission:   { type: "string" },
          commission_percent:       { type: "number" },
          commission_type:          { type: "string" },
          seller_concession_amount: { type: "number" },
          professional_fee_percent: { type: "number" },
          professional_fee_amount:  { type: "number" },
          commission_notes:         { type: "string" },
        },
        `Extract commission/compensation terms:
- commission_percent: The percentage the seller pays to buyer's firm. E.g. "2% of the net contract price" → 2.
- commission_type: "percent" or "flat".
- seller_concession_amount: Any seller concession dollar amount.
- professional_fee_percent: Any professional fee percentage.
- professional_fee_amount: Any professional fee dollar amount.
- commission_notes: A brief summary of what Section 20 says about compensation.`
      ),
    ]);

    console.log("Stage 3: Combining extracted sections...");

    // Merge all results, with later sources winning on conflicts
    const combined = {
      ...sec1, ...sec2, ...sec3, ...sec5, ...sec7,
      ...sec15, ...sec16, ...sec19, ...sec20,
    };

    // Title company: prefer Section 5 over Section 3
    combined.title_company = sec5?.title_company || sec3?.title_company || null;

    // Stage 4: Calculate deadline dates from day offsets + acceptance_date
    const acceptanceDate = combined.acceptance_date || null;

    combined.inspection_deadline     = addDays(acceptanceDate, combined.inspection_days);
    combined.sewage_deadline         = addDays(acceptanceDate, combined.sewage_days);
    combined.water_quality_deadline  = addDays(acceptanceDate, combined.water_quality_days);
    combined.radon_deadline          = addDays(acceptanceDate, combined.radon_days);
    combined.earnest_money_deadline  = addDays(acceptanceDate, combined.earnest_money_days);
    combined.due_diligence_deadline  = addDays(acceptanceDate, combined.due_diligence_days);

    // Include raw sections in response for debugging / review screen
    combined._sections_found = Object.keys(sections).map(Number).sort((a,b) => a-b);
    combined._section_count  = sectionKeys.length;

    console.log("Extraction complete:", {
      buyer: combined.buyer_names,
      seller: combined.seller_names,
      address: combined.property_address,
      price: combined.purchase_price,
      closing: combined.closing_date,
      acceptance: combined.acceptance_date,
      inspection_days: combined.inspection_days,
      inspection_deadline: combined.inspection_deadline,
      financing: combined.financing_commitment_date,
      sections: combined._sections_found,
    });

    return Response.json(combined);
  } catch (error) {
    console.error("parsePurchaseAgreementV2 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
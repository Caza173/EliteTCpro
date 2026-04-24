/**
 * autoPlaceSignatures
 *
 * Backend function that:
 * 1. Receives a document URL + type + recipients
 * 2. Uses AI to detect where signature/initials lines appear in the document text
 * 3. Returns placement config with Dropbox Sign text tags injected at the correct positions
 *
 * The result is used by createSignatureRequest to send a pre-tagged document.
 *
 * Input:
 * {
 *   document_url: string,       // URL of the PDF/DOCX
 *   document_type: string,      // e.g. "purchase_and_sale"
 *   file_name: string,
 *   transaction_id: string,
 *   recipients: [{ name, email, role, routing_order }]
 * }
 *
 * Output:
 * {
 *   success: boolean,
 *   placement_mode: "ai" | "pattern" | "fallback",
 *   tagged_document_url: string | null,
 *   zones_detected: [...],
 *   signer_map: {...},
 *   message: string
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Dropbox Sign Tag Helpers ────────────────────────────────────────────────

function buildTag(type, signerSlot, required = true) {
  const req = required ? "req" : "opt";
  const tagType = type === "initials" ? "initial" : type;
  return `[${tagType}|${req}|${signerSlot}]`;
}

function buildSignerSlotMap(recipients) {
  const slotMap = {};
  recipients.forEach((r, i) => {
    const slot = `signer${i + 1}`;
    const role = r.role || "other";
    if (!slotMap[role]) slotMap[role] = [];
    slotMap[role].push(slot);
  });
  return slotMap;
}

// ─── NHAR Signature Profiles (mirrored from lib/ for Deno) ──────────────────

const NHAR_SIGNATURE_PROFILES = {
  purchase_and_sale: {
    label: "NHAR Purchase & Sale Agreement",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "BUYER:", "Buyer Signature", "Buyers:"] },
      { role: "buyer",  type: "initials",  anchor_phrases: ["Buyer's Initials", "Buyer Initials", "B.I."] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Buyer Date", "Buyer's Date", "Date:"] },
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "SELLER:", "Seller Signature", "Sellers:"] },
      { role: "seller", type: "initials",  anchor_phrases: ["Seller's Initials", "Seller Initials", "S.I."] },
      { role: "seller", type: "date",      anchor_phrases: ["Seller Date", "Seller's Date"] },
      { role: "agent",  type: "signature", anchor_phrases: ["Agent Signature", "Listing Agent", "Buyer's Agent", "Broker/Agent"] },
      { role: "agent",  type: "date",      anchor_phrases: ["Agent Date", "Broker Date"] },
    ],
  },
  listing_agreement: {
    label: "NHAR Listing Agreement",
    signature_zones: [
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "Owner's Signature", "SELLER:"] },
      { role: "seller", type: "initials",  anchor_phrases: ["Seller's Initials"] },
      { role: "seller", type: "date",      anchor_phrases: ["Date:", "Seller Date"] },
      { role: "agent",  type: "signature", anchor_phrases: ["Agent Signature", "Listing Agent Signature", "Broker Signature"] },
      { role: "agent",  type: "date",      anchor_phrases: ["Agent Date", "Broker Date"] },
    ],
  },
  buyer_agency_agreement: {
    label: "NHAR Buyer Agency Agreement",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "Client Signature"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Buyer Date", "Client Date", "Date:"] },
      { role: "agent",  type: "signature", anchor_phrases: ["Agent Signature", "Buyer's Agent", "Broker Signature"] },
      { role: "agent",  type: "date",      anchor_phrases: ["Agent Date", "Broker Date"] },
    ],
  },
  disclosure: {
    label: "Disclosure Form",
    signature_zones: [
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "Owner Signature", "SELLER:"] },
      { role: "seller", type: "date",      anchor_phrases: ["Date:", "Seller Date"] },
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "BUYER:", "Buyer Acknowledgment"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Buyer Date", "Date Acknowledged"] },
    ],
  },
  addendum: {
    label: "Addendum",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "BUYER:", "Buyer:"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Date:", "Buyer Date"] },
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "SELLER:", "Seller:"] },
      { role: "seller", type: "date",      anchor_phrases: ["Seller Date"] },
    ],
  },
  closing: {
    label: "Closing Documents",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "BUYER:", "Purchaser Signature"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Date:", "Buyer Date"] },
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "SELLER:"] },
      { role: "seller", type: "date",      anchor_phrases: ["Seller Date"] },
    ],
  },
  inspection: {
    label: "Inspection Report",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Client Signature", "Buyer Signature", "Homebuyer Signature"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Date:", "Client Date"] },
    ],
  },
  other: {
    label: "General Document",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Signature:", "Sign Here"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Date:"] },
    ],
  },
};

// ─── Pattern Matcher ──────────────────────────────────────────────────────────
// Tries to detect signature lines in raw document text using known anchor phrases.

function detectZonesViaPatterns(documentText, docType, slotMap) {
  const profile = NHAR_SIGNATURE_PROFILES[docType] || NHAR_SIGNATURE_PROFILES.other;
  const detected = [];
  const text = documentText || "";

  for (const zone of profile.signature_zones) {
    const slots = slotMap[zone.role];
    if (!slots?.length) continue;

    for (const phrase of zone.anchor_phrases) {
      // Case-insensitive search for the anchor phrase in the document
      const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx !== -1) {
        // Found a match — one slot per occurrence
        for (const slot of slots) {
          detected.push({
            role: zone.role,
            type: zone.type,
            signer_slot: slot,
            anchor_phrase: phrase,
            position: idx,
            tag: buildTag(zone.type, slot, true),
          });
        }
        break; // only match first phrase per zone/role combination
      }
    }
  }

  return detected;
}

// ─── AI-Powered Detection ─────────────────────────────────────────────────────

async function detectZonesViaAI(base44, documentText, docType, recipients) {
  const recipientList = recipients.map((r, i) => `signer${i + 1}: ${r.name} (${r.role})`).join("\n");

  const prompt = `You are a real estate document analysis AI. Analyze this document text and identify ALL signature, initials, and date fields that need to be signed.

DOCUMENT TYPE: ${docType}

RECIPIENTS (in signer order):
${recipientList}

DOCUMENT TEXT (first 4000 chars):
${documentText.slice(0, 4000)}

Return a JSON array of detected signature zones. Each zone must have:
- role: which party signs here (buyer/seller/agent/attorney/lender/other)
- type: "signature", "initials", or "date"  
- anchor_phrase: the exact text from the document near this field (20-60 chars)
- signer_slot: which Dropbox Sign signer this maps to (signer1, signer2, etc. — match the recipients list above)
- confidence: "high", "medium", or "low"

Rules:
1. ONLY include zones where there is a clear signature/initials/date line in the text
2. Match each role to the correct signer slot based on the recipients list
3. If a phrase like "Buyer's Signature:_______" is found, mark it as buyer signature
4. If "Date:_______" appears near a buyer signature, mark it as buyer date
5. Skip any zone where the role has no matching recipient
6. Prefer high-confidence matches; mark uncertain ones as "low"

Return ONLY valid JSON, no explanation. Format: [{"role":"buyer","type":"signature","anchor_phrase":"Buyer's Signature:","signer_slot":"signer1","confidence":"high"}]`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        zones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role:          { type: "string" },
              type:          { type: "string" },
              anchor_phrase: { type: "string" },
              signer_slot:   { type: "string" },
              confidence:    { type: "string" },
            },
          },
        },
      },
    },
  });

  const zones = result?.zones || [];

  // Add Dropbox Sign tags to each zone
  return zones
    .filter(z => z.signer_slot && z.type && z.anchor_phrase)
    .map(z => ({
      ...z,
      tag: buildTag(z.type, z.signer_slot, true),
    }));
}

// ─── Fallback: Append Signature Block ────────────────────────────────────────
// If neither AI nor pattern detection finds anything, append signature blocks
// as text tags at the bottom of the document (Dropbox Sign text tag mode).

function buildFallbackZones(docType, slotMap) {
  const profile = NHAR_SIGNATURE_PROFILES[docType] || NHAR_SIGNATURE_PROFILES.other;
  const zones = [];

  for (const zone of profile.signature_zones) {
    const slots = slotMap[zone.role];
    if (!slots?.length) continue;
    for (const slot of slots) {
      zones.push({
        role: zone.role,
        type: zone.type,
        signer_slot: slot,
        anchor_phrase: null,
        tag: buildTag(zone.type, slot, true),
        confidence: "fallback",
      });
    }
  }

  return zones;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const {
    document_url,
    document_type,
    file_name,
    transaction_id,
    recipients,
  } = await req.json();

  if (!document_url || !document_type || !recipients?.length) {
    return Response.json({ error: "Missing required fields: document_url, document_type, recipients" }, { status: 400 });
  }

  const slotMap = buildSignerSlotMap(recipients);
  let placementMode = "fallback";
  let detectedZones = [];
  let documentText = "";

  // ── Step 1: Try to extract text from document ──────────────────────────────
  try {
    const extracted = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: document_url,
      json_schema: {
        type: "object",
        properties: {
          full_text: { type: "string", description: "All text content from the document, preserving line structure" },
          signature_lines: {
            type: "array",
            items: { type: "string" },
            description: "Any lines that appear to be signature, initials, or date fields",
          },
        },
      },
    });

    if (extracted?.status === "success") {
      documentText = extracted.output?.full_text || "";
    }
  } catch (err) {
    console.warn("Text extraction failed, using fallback:", err.message);
  }

  // ── Step 2: Pattern matching (fast, no AI credits) ─────────────────────────
  if (documentText) {
    const patternZones = detectZonesViaPatterns(documentText, document_type, slotMap);
    if (patternZones.length >= 2) {
      detectedZones = patternZones;
      placementMode = "pattern";
    }
  }

  // ── Step 3: AI detection if pattern matching insufficient ──────────────────
  if (placementMode !== "pattern" && documentText) {
    try {
      const aiZones = await detectZonesViaAI(base44, documentText, document_type, recipients);
      if (aiZones.length >= 1) {
        detectedZones = aiZones;
        placementMode = "ai";
      }
    } catch (err) {
      console.warn("AI detection failed:", err.message);
    }
  }

  // ── Step 4: Fallback — structured tag block appended to document ───────────
  if (detectedZones.length === 0) {
    detectedZones = buildFallbackZones(document_type, slotMap);
    placementMode = "fallback";
  }

  // ── Step 5: Build summary for logging ─────────────────────────────────────
  const sigCount      = detectedZones.filter(z => z.type === "signature").length;
  const initialsCount = detectedZones.filter(z => z.type === "initials").length;
  const dateCount     = detectedZones.filter(z => z.type === "date").length;

  const summary = [
    sigCount      > 0 ? `${sigCount} signature field${sigCount !== 1 ? "s" : ""}` : null,
    initialsCount > 0 ? `${initialsCount} initial field${initialsCount !== 1 ? "s" : ""}` : null,
    dateCount     > 0 ? `${dateCount} date field${dateCount !== 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(", ");

  console.log(`[autoPlaceSignatures] mode=${placementMode} doc_type=${document_type} zones=${detectedZones.length} (${summary})`);

  return Response.json({
    success: true,
    placement_mode: placementMode,
    zones_detected: detectedZones,
    signer_map: slotMap,
    document_type,
    profile_label: (NHAR_SIGNATURE_PROFILES[document_type] || NHAR_SIGNATURE_PROFILES.other).label,
    summary,
    message: placementMode === "fallback"
      ? `Could not auto-detect signature positions. Standard ${document_type.replace(/_/g, " ")} signature block will be used.`
      : `Auto-detected ${detectedZones.length} field(s) via ${placementMode} in "${file_name || document_type}".`,
  });
});
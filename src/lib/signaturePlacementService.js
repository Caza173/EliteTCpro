/**
 * signaturePlacementService.js
 *
 * Automated signature field placement for Dropbox Sign.
 * Detects where signatures/initials belong based on document type and party roles,
 * then injects Dropbox Sign text tags into the document before sending.
 *
 * Browser-safe — no Deno imports.
 */

// ─── Dropbox Sign Text Tag Format ─────────────────────────────────────────────
// Format: [sig|req|signer1]  [initial|req|signer2]  [date|req|signer1]
// signer1 = first recipient, signer2 = second, etc.

// ─── Role → Dropbox Sign signer slot mapping ──────────────────────────────────
// Order must match the order recipients are added in createSignatureRequest
export const ROLE_SIGNER_MAP = {
  buyer:    "signer1",
  seller:   "signer2",
  agent:    "signer3",
  attorney: "signer4",
  lender:   "signer5",
  title:    "signer6",
  other:    "signer7",
};

// ─── NHAR Document Signature Profiles ─────────────────────────────────────────
// Defines where signature blocks appear and what they look like in each doc type.

export const NHAR_SIGNATURE_PROFILES = {
  purchase_and_sale: {
    label: "NHAR Purchase & Sale Agreement",
    signature_zones: [
      // Buyers sign first
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "BUYER:", "Buyer Signature", "Buyers:"] },
      { role: "buyer",  type: "initials",  anchor_phrases: ["Buyer's Initials", "Buyer Initials", "B.I."] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Buyer Date", "Date:", "Buyer's Date"] },
      // Sellers sign second
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "SELLER:", "Seller Signature", "Sellers:"] },
      { role: "seller", type: "initials",  anchor_phrases: ["Seller's Initials", "Seller Initials", "S.I."] },
      { role: "seller", type: "date",      anchor_phrases: ["Seller Date", "Seller's Date"] },
      // Agent signs last
      { role: "agent",  type: "signature", anchor_phrases: ["Agent Signature", "Listing Agent", "Buyer's Agent", "Broker/Agent"] },
      { role: "agent",  type: "date",      anchor_phrases: ["Agent Date", "Broker Date"] },
    ],
    page_order: ["buyer", "seller", "agent"],
  },

  listing_agreement: {
    label: "NHAR Listing Agreement",
    signature_zones: [
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "Owner's Signature", "SELLER:", "Sellers:"] },
      { role: "seller", type: "initials",  anchor_phrases: ["Seller's Initials", "Seller Initials"] },
      { role: "seller", type: "date",      anchor_phrases: ["Date:", "Seller Date", "Owner Date"] },
      { role: "agent",  type: "signature", anchor_phrases: ["Agent Signature", "Listing Agent Signature", "Realtor Signature", "Broker Signature"] },
      { role: "agent",  type: "date",      anchor_phrases: ["Agent Date", "Broker Date", "Listing Date"] },
    ],
    page_order: ["seller", "agent"],
  },

  buyer_agency_agreement: {
    label: "NHAR Buyer Agency Agreement",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "BUYER:", "Client Signature"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Buyer Date", "Date:", "Client Date"] },
      { role: "agent",  type: "signature", anchor_phrases: ["Agent Signature", "Buyer's Agent", "Broker Signature"] },
      { role: "agent",  type: "date",      anchor_phrases: ["Agent Date", "Broker Date"] },
    ],
    page_order: ["buyer", "agent"],
  },

  disclosure: {
    label: "Disclosure Form",
    signature_zones: [
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "Owner Signature", "SELLER:"] },
      { role: "seller", type: "date",      anchor_phrases: ["Date:", "Seller Date"] },
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "BUYER:", "Buyer Acknowledgment"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Buyer Date", "Date Acknowledged"] },
    ],
    page_order: ["seller", "buyer"],
  },

  addendum: {
    label: "Addendum",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "BUYER:", "Buyer:"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Date:", "Buyer Date"] },
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "SELLER:", "Seller:"] },
      { role: "seller", type: "date",      anchor_phrases: ["Seller Date"] },
    ],
    page_order: ["buyer", "seller"],
  },

  closing: {
    label: "Closing Documents",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Buyer's Signature", "BUYER:", "Purchaser Signature"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Date:", "Buyer Date"] },
      { role: "seller", type: "signature", anchor_phrases: ["Seller's Signature", "SELLER:"] },
      { role: "seller", type: "date",      anchor_phrases: ["Seller Date", "Date:"] },
    ],
    page_order: ["buyer", "seller"],
  },

  inspection: {
    label: "Inspection Report",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Client Signature", "Buyer Signature", "Homebuyer Signature"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Date:", "Client Date"] },
    ],
    page_order: ["buyer"],
  },

  other: {
    label: "General Document",
    signature_zones: [
      { role: "buyer",  type: "signature", anchor_phrases: ["Signature:", "Sign Here", "Party 1 Signature"] },
      { role: "buyer",  type: "date",      anchor_phrases: ["Date:"] },
    ],
    page_order: ["buyer"],
  },
};

// ─── Tag Generator ────────────────────────────────────────────────────────────

/**
 * Build a Dropbox Sign text tag string.
 * @param {"signature"|"initials"|"date"} type
 * @param {string} signerSlot e.g. "signer1"
 * @param {boolean} required
 */
export function buildTag(type, signerSlot, required = true) {
  const req = required ? "req" : "opt";
  const tagType = type === "initials" ? "initial" : type; // DSL: initial not initials
  return `[${tagType}|${req}|${signerSlot}]`;
}

// ─── Recipient Slot Builder ───────────────────────────────────────────────────

/**
 * Given a list of recipients (ordered as they'll be sent to Dropbox Sign),
 * build a role → signerSlot map.
 * Multiple buyers each get consecutive slots.
 */
export function buildSignerSlotMap(recipients) {
  const slotMap = {}; // role → [signerSlot, ...]
  recipients.forEach((r, i) => {
    const slot = `signer${i + 1}`;
    const role = r.role || "other";
    if (!slotMap[role]) slotMap[role] = [];
    slotMap[role].push(slot);
  });
  return slotMap;
}

// ─── Auto-Placement Config Builder ───────────────────────────────────────────

/**
 * Build the configuration object that the backend function uses to place tags.
 * Input:
 *   docType: string
 *   recipients: [{ name, email, role, routing_order }]
 * Output: { zones: [...], signer_map: {...} }
 */
export function buildPlacementConfig(docType, recipients) {
  const profile = NHAR_SIGNATURE_PROFILES[docType] || NHAR_SIGNATURE_PROFILES.other;
  const slotMap = buildSignerSlotMap(recipients);

  // For each zone, resolve which signer slots apply
  const resolvedZones = [];
  for (const zone of profile.signature_zones) {
    const slots = slotMap[zone.role];
    if (!slots || slots.length === 0) continue; // skip if no recipient for this role

    for (const slot of slots) {
      resolvedZones.push({
        role: zone.role,
        type: zone.type,
        signer_slot: slot,
        anchor_phrases: zone.anchor_phrases,
        tag: buildTag(zone.type, slot, true),
      });
    }
  }

  return {
    document_type: docType,
    profile_label: profile.label,
    zones: resolvedZones,
    signer_map: slotMap,
    page_order: profile.page_order,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate that all required roles for a document type have recipients.
 * Returns { valid: boolean, missing_roles: string[] }
 */
export function validateRecipientsForDocType(docType, recipients) {
  const profile = NHAR_SIGNATURE_PROFILES[docType] || NHAR_SIGNATURE_PROFILES.other;
  const neededRoles = [...new Set(profile.signature_zones.map(z => z.role))];
  const presentRoles = new Set(recipients.map(r => r.role));
  const missingRoles = neededRoles.filter(r => !presentRoles.has(r));

  return {
    valid: missingRoles.length === 0,
    missing_roles: missingRoles,
    needed_roles: neededRoles,
  };
}

// ─── Summary for UI ───────────────────────────────────────────────────────────

/**
 * Human-readable summary of what will be placed.
 */
export function describePlacementConfig(config) {
  if (!config?.zones?.length) return "No signature fields will be placed.";

  const byRole = {};
  for (const zone of config.zones) {
    if (!byRole[zone.role]) byRole[zone.role] = [];
    byRole[zone.role].push(zone.type);
  }

  return Object.entries(byRole)
    .map(([role, types]) => {
      const unique = [...new Set(types)];
      return `${role}: ${unique.join(", ")}`;
    })
    .join(" · ");
}
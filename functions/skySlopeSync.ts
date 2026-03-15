import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SKYSLOPE_BASE = "https://api.skyslope.com";

// --- HMAC Auth ---
// Supports both SKYSLOPE_ACCESS_KEY/SECRET and SKYSLOPE_API_KEY/API_SECRET aliases
async function skySlopeHeaders(method, path) {
  const date = new Date().toUTCString();
  const stringToSign = `${method.toUpperCase()}\n${path}\n${date}`;
  const accessKey = Deno.env.get("SKYSLOPE_ACCESS_KEY") || Deno.env.get("SKYSLOPE_API_KEY");
  const accessSecret = Deno.env.get("SKYSLOPE_ACCESS_SECRET") || Deno.env.get("SKYSLOPE_API_SECRET");

  const encoder = new TextEncoder();
  const keyData = encoder.encode(accessSecret);
  const msgData = encoder.encode(stringToSign);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

  return {
    "Content-Type": "application/json",
    "X-SS-AccessKey": accessKey,
    "X-SS-Date": date,
    "X-SS-Signature": signature,
  };
}

async function ssRequest(method, path, body = null, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const headers = await skySlopeHeaders(method, path);
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${SKYSLOPE_BASE}${path}`, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (res.ok) return data;
    if (attempt < retries) {
      console.warn(`SkySlope ${method} ${path} attempt ${attempt + 1} failed (${res.status}), retrying...`);
      await new Promise(r => setTimeout(r, 1500));
    } else {
      throw new Error(`SkySlope ${method} ${path} → ${res.status}: ${text}`);
    }
  }
}

// --- Map EliteTC doc_type to SkySlope document name tag ---
function mapDocType(docType) {
  const map = {
    purchase_and_sale: "Purchase Agreement",
    listing_agreement: "Listing Agreement",
    addendum: "Addendum",
    buyer_agency_agreement: "Buyer Agency Agreement",
    disclosure: "Disclosure",
    inspection: "Inspection Report",
    appraisal: "Appraisal",
    title: "Title",
    closing: "Closing Documents",
    other: "Other",
  };
  return map[docType] || "Other";
}

// --- Create SkySlope Sale from EliteTC transaction ---
async function createSkySlopeSale(tx) {
  const addressParts = (tx.address || "").split(",").map(s => s.trim());
  const street = addressParts[0] || tx.address;
  const city = addressParts[1] || "";
  const stateZip = (addressParts[2] || "").split(" ").filter(Boolean);
  const state = stateZip[0] || "";
  const zip = stateZip[1] || "";

  const buyerName = tx.buyers?.length ? tx.buyers[0] : (tx.buyer || "");
  const sellerName = tx.sellers?.length ? tx.sellers[0] : (tx.seller || "");

  const payload = {
    property: {
      streetAddress: street,
      city,
      state,
      zip,
    },
    buyerName,
    sellerName,
    agentEmail: tx.agent_email || "",
    closeDate: tx.closing_date || null,
    transactionType: tx.transaction_type === "seller" ? "Listing" : "Sale",
  };

  // Use /v1/sales for buyer/dual, /v1/listings for seller
  const isSeller = tx.transaction_type === "seller";
  const endpoint = isSeller ? "/v1/listings" : "/v1/sales";
  const result = await ssRequest("POST", endpoint, payload);

  return {
    id: result?.id || result?.saleId || result?.listingId || null,
    fileGuid: result?.fileGuid || result?.guid || result?.id || null,
    saleGuid: isSeller ? null : (result?.saleGuid || result?.guid || result?.id || null),
    listingGuid: isSeller ? (result?.listingGuid || result?.guid || result?.id || null) : null,
  };
}

// --- Upload document to SkySlope sale ---
async function uploadDocumentToSkySlope(skySlopeId, doc, txType) {
  const endpoint = txType === "seller"
    ? `/v1/listings/${skySlopeId}/documents`
    : `/v1/sales/${skySlopeId}/documents`;

  // Fetch the actual file bytes from the stored URL
  const fileRes = await fetch(doc.file_url);
  if (!fileRes.ok) throw new Error(`Could not fetch document file: ${doc.file_url}`);
  const fileBuffer = await fileRes.arrayBuffer();
  const fileBytes = new Uint8Array(fileBuffer);
  const base64 = btoa(String.fromCharCode(...fileBytes));

  const payload = {
    fileName: doc.file_name || `document-${doc.id}`,
    documentName: mapDocType(doc.doc_type),
    fileContent: base64,
  };

  await ssRequest("POST", endpoint, payload);
}

// --- Check if document already exists in SkySlope ---
async function documentExistsInSkySlope(skySlopeId, fileName, txType) {
  const endpoint = txType === "seller"
    ? `/v1/listings/${skySlopeId}/documents`
    : `/v1/sales/${skySlopeId}/documents`;
  try {
    const result = await ssRequest("GET", endpoint);
    const docs = result?.items || result?.documents || result || [];
    return Array.isArray(docs) && docs.some(
      d => d.fileName === fileName || d.name === fileName
    );
  } catch {
    return false;
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { action, transaction_id, document_id } = body;

    if (!action) return Response.json({ error: "action required" }, { status: 400 });

    // Allow both direct user calls and service-role automation calls
    let user = null;
    try { user = await base44.auth.me(); } catch { /* service-role or unauthenticated call */ }

    // ---- ACTION: syncTransaction ----
    if (action === "syncTransaction") {
      if (!transaction_id) return Response.json({ error: "transaction_id required" }, { status: 400 });

      // Use large page to find the transaction across all records
      const { brokerage_id: brokerageId } = body;
      if (!brokerageId) return Response.json({ error: "brokerage_id required" }, { status: 400 });

      let txList = [];
      try {
        txList = await base44.asServiceRole.entities.Transaction.filter({ brokerage_id: brokerageId });
      } catch (listErr) {
        return Response.json({ error: "Failed to find transaction: " + listErr.message }, { status: 500 });
      }
      const tx = txList.find(t => t.id === transaction_id);
      if (!tx) return Response.json({ error: `Transaction ${transaction_id} not found` }, { status: 404 });

      if (tx.skyslope_transaction_id) {
        return Response.json({ skipped: true, skyslope_transaction_id: tx.skyslope_transaction_id, message: "Already synced" });
      }

      let skySlopeId;
      try {
        skySlopeId = await createSkySlopeSale(tx);
      } catch (err) {
        await base44.asServiceRole.entities.Transaction.update(tx.id, {
          skyslope_sync_status: "error",
          skyslope_sync_error: err.message,
        });
        console.error("SkySlope createSale error:", err.message);
        return Response.json({ error: err.message }, { status: 502 });
      }

      await base44.asServiceRole.entities.Transaction.update(tx.id, {
        skyslope_transaction_id: String(skySlopeId),
        skyslope_sync_status: "synced",
        skyslope_sync_error: "",
      });

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        brokerage_id: tx.brokerage_id,
        transaction_id: tx.id,
        actor_email: user?.email || "system",
        action: "skyslope_transaction_created",
        entity_type: "transaction",
        entity_id: tx.id,
        description: `SkySlope transaction created: ${skySlopeId}`,
      });

      return Response.json({ success: true, skyslope_transaction_id: skySlopeId });
    }

    // ---- ACTION: syncDocument ----
    if (action === "syncDocument") {
      if (!document_id) return Response.json({ error: "document_id required" }, { status: 400 });

      const { brokerage_id: brokerageId2 } = body;
      if (!brokerageId2) return Response.json({ error: "brokerage_id required" }, { status: 400 });

      const docList = await base44.asServiceRole.entities.Document.filter({ brokerage_id: brokerageId2 });
      const doc = docList.find(d => d.id === document_id);
      if (!doc) return Response.json({ error: "Document not found" }, { status: 404 });

      const txList2 = await base44.asServiceRole.entities.Transaction.filter({ brokerage_id: brokerageId2 });
      const tx = txList2.find(t => t.id === doc.transaction_id);
      if (!tx) return Response.json({ error: "Transaction not found for document" }, { status: 404 });

      if (!tx.skyslope_transaction_id) {
        return Response.json({ skipped: true, message: "No SkySlope transaction ID on transaction; skipping document sync" });
      }

      const fileName = doc.file_name || `document-${doc.id}`;
      const alreadyExists = await documentExistsInSkySlope(tx.skyslope_transaction_id, fileName, tx.transaction_type);
      if (alreadyExists) {
        console.log(`SkySlope: document "${fileName}" already exists, skipping.`);
        return Response.json({ skipped: true, message: "Document already exists in SkySlope" });
      }

      try {
        await uploadDocumentToSkySlope(tx.skyslope_transaction_id, doc, tx.transaction_type);
      } catch (err) {
        console.error("SkySlope uploadDocument error:", err.message);
        // Notify TC via in-app notification
        await base44.asServiceRole.entities.InAppNotification.create({
          brokerage_id: tx.brokerage_id,
          user_email: user?.email || "system",
          transaction_id: tx.id,
          title: "SkySlope Document Sync Failed",
          body: `Failed to upload "${fileName}" to SkySlope for ${tx.address}: ${err.message}`,
          type: "document",
        });
        return Response.json({ error: err.message }, { status: 502 });
      }

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        brokerage_id: tx.brokerage_id,
        transaction_id: tx.id,
        actor_email: user?.email || "system",
        action: "skyslope_document_uploaded",
        entity_type: "document",
        entity_id: doc.id,
        description: `Document "${fileName}" uploaded to SkySlope (${tx.skyslope_transaction_id})`,
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("skySlopeSync error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
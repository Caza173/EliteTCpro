import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SKYSLOPE_BASE = "https://api.skyslope.com";

// ============================================================
// SKYSLOPE SESSION AUTH (HMAC-SHA256 login → SS-Session token)
// ============================================================
let _session = null; // { token, expiresAt }

async function generateHmac(clientId, clientSecret, timestamp) {
  const secret = Deno.env.get("SKYSLOPE_ACCESS_SECRET");
  if (!secret) throw new Error("SKYSLOPE_ACCESS_SECRET not set");
  const message = `${clientId}:${clientSecret}:${timestamp}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function refreshSession() {
  const clientId = Deno.env.get("SKYSLOPE_CLIENT_ID");
  const clientSecret = Deno.env.get("SKYSLOPE_CLIENT_SECRET");
  const accessKey = Deno.env.get("SKYSLOPE_ACCESS_KEY");
  if (!clientId || !clientSecret || !accessKey) {
    throw new Error("Missing SkySlope credentials (CLIENT_ID, CLIENT_SECRET, ACCESS_KEY)");
  }
  const timestamp = new Date().toISOString();
  const hmac = await generateHmac(clientId, clientSecret, timestamp);

  const res = await fetch(`${SKYSLOPE_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Authorization": `SS ${accessKey}:${hmac}`,
      "Timestamp": timestamp,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clientID: clientId, clientSecret }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[SkySlope Auth] Login failed (${res.status}): ${text}`);
    if (res.status === 401) throw new Error("SkySlope auth failed: invalid credentials or timestamp mismatch");
    throw new Error(`SkySlope login error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.Session) throw new Error("SkySlope login did not return a session token");

  const expiresAt = data.Expiration ? new Date(data.Expiration).getTime() : Date.now() + 2 * 60 * 60 * 1000;
  _session = { token: data.Session, expiresAt };
  console.info(`[SkySlope Auth] Session acquired, expires ${new Date(expiresAt).toISOString()}`);
  return _session;
}

async function getToken() {
  const TEN_MIN = 10 * 60 * 1000;
  if (_session && _session.expiresAt - Date.now() > TEN_MIN) return _session.token;
  if (_session) console.info("[SkySlope Auth] Token near expiry, refreshing...");
  return (await refreshSession()).token;
}

// Authenticated fetch with one auto-retry on 401
async function ssRequest(method, path, body = null) {
  const doFetch = async (token) => {
    const opts = {
      method,
      headers: { "Authorization": `SS-Session ${token}`, "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(`${SKYSLOPE_BASE}${path}`, opts);
  };

  let token = await getToken();
  let res = await doFetch(token);

  if (res.status === 401) {
    console.warn("[SkySlope Auth] 401 received, refreshing session and retrying...");
    _session = null;
    token = await getToken();
    res = await doFetch(token);
  }

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`SkySlope ${method} ${path} → ${res.status}: ${text}`);
  return data;
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

      if (tx.skyslope_file_guid || tx.skyslope_transaction_id) {
        return Response.json({ skipped: true, skyslope_file_guid: tx.skyslope_file_guid, message: "Already synced" });
      }

      let ssResult;
      try {
        ssResult = await createSkySlopeSale(tx);
      } catch (err) {
        await base44.asServiceRole.entities.Transaction.update(tx.id, {
          skyslope_sync_status: "error",
          skyslope_sync_error: err.message,
        });
        console.error("SkySlope createSale error:", err.message);
        // Notify the TC dashboard of the failure
        try {
          await base44.asServiceRole.entities.InAppNotification.create({
            brokerage_id: tx.brokerage_id,
            user_email: tx.agent_email || "system",
            transaction_id: tx.id,
            title: "SkySlope Sync Failed",
            body: `Could not create SkySlope compliance file for ${tx.address}: ${err.message}`,
            type: "system",
          });
        } catch { /* don't block on notification failure */ }
        return Response.json({ error: err.message }, { status: 502 });
      }

      const syncTime = new Date().toISOString();
      await base44.asServiceRole.entities.Transaction.update(tx.id, {
        skyslope_transaction_id: String(ssResult.id),
        skyslope_file_guid: ssResult.fileGuid ? String(ssResult.fileGuid) : String(ssResult.id),
        skyslope_sale_guid: ssResult.saleGuid ? String(ssResult.saleGuid) : "",
        skyslope_listing_guid: ssResult.listingGuid ? String(ssResult.listingGuid) : "",
        skyslope_last_sync: syncTime,
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
        description: `SkySlope compliance file created: ${ssResult.fileGuid || ssResult.id}`,
      });

      return Response.json({ success: true, skyslope_file_guid: ssResult.fileGuid, skyslope_transaction_id: ssResult.id });
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
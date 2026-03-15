import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Classify doc type from dotloop document name
function classifyDocType(name = "") {
  const n = name.toLowerCase();
  if (n.includes("purchase") || n.includes("p&s") || n.includes("sales agreement") || n.includes("offer")) return "purchase_and_sale";
  if (n.includes("listing")) return "listing_agreement";
  if (n.includes("addendum")) return "addendum";
  if (n.includes("disclosure") || n.includes("lead paint")) return "disclosure";
  if (n.includes("inspection")) return "inspection";
  if (n.includes("appraisal")) return "appraisal";
  if (n.includes("title")) return "title";
  if (n.includes("closing") || n.includes("settlement") || n.includes("hud") || n.includes("cd ")) return "closing";
  if (n.includes("buyer agency") || n.includes("buyer rep")) return "buyer_agency_agreement";
  return "other";
}

// Parse document name to extract address hints
function normalizeAddress(addr = "") {
  return addr.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

Deno.serve(async (req) => {
  // Dotloop sends POST for webhook events
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Validate shared secret from query param
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expectedSecret = Deno.env.get("DOTLOOP_WEBHOOK_SECRET");
    if (expectedSecret && secret !== expectedSecret) {
      console.warn("Dotloop webhook: invalid secret");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("Dotloop webhook received:", JSON.stringify(body).slice(0, 500));

    const eventType = body.event || body.type || body.event_type || "";
    const loopData = body.loop || body.data?.loop || {};
    const docData = body.document || body.data?.document || {};

    // We care about document-related events
    const docEvents = ["document_added", "document_signed", "document_updated", "loop_created"];
    if (!docEvents.some(e => eventType.includes(e))) {
      console.log("Dotloop webhook: ignoring event type:", eventType);
      return Response.json({ status: "ignored", event: eventType });
    }

    // --- Resolve brokerage ---
    const brokerages = await base44.asServiceRole.entities.Brokerage.list();
    const brokerage_id = brokerages[0]?.id;
    if (!brokerage_id) {
      console.error("No brokerage found");
      return Response.json({ error: "No brokerage configured" }, { status: 500 });
    }

    // --- Extract identifying info from payload ---
    const loopName = loopData.name || loopData.loop_name || docData.loop_name || "";
    const mlsNumber = loopData.mls_number || loopData.mlsNumber || "";
    const participantEmails = (loopData.participants || []).map(p => p.email).filter(Boolean);
    const docName = docData.name || docData.filename || docData.document_name || "Dotloop Document";
    const docUrl = docData.url || docData.file_url || docData.download_url || null;
    const dotloopDocId = docData.id || docData.document_id || null;
    const dotloopLoopId = loopData.id || loopData.loop_id || body.loop_id || null;

    if (!docUrl) {
      console.log("Dotloop webhook: no document URL in payload, skipping download");
      return Response.json({ status: "skipped", reason: "no_document_url" });
    }

    // --- Try to fetch the document from Dotloop if API key is available ---
    let fileUrl = docUrl; // Use direct URL if provided
    const dotloopApiKey = Deno.env.get("DOTLOOP_API_KEY");

    if (dotloopApiKey && docUrl && !docUrl.startsWith("http")) {
      // docUrl is a path — build full Dotloop API URL
      try {
        const dlResp = await fetch(`https://dotloop.com/public/api${docUrl}`, {
          headers: { "Authorization": `Bearer ${dotloopApiKey}`, "Accept": "application/pdf" }
        });
        if (dlResp.ok) {
          const blob = await dlResp.blob();
          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
          fileUrl = uploadResult.file_url;
          console.log("Dotloop: fetched and uploaded document:", fileUrl);
        }
      } catch (fetchErr) {
        console.warn("Dotloop: could not fetch document from API, using direct URL:", fetchErr.message);
      }
    }

    // --- Match or create transaction ---
    let transaction = null;

    // 0. Try Dotloop loop_id match (most reliable)
    if (dotloopLoopId) {
      const byLoop = await base44.asServiceRole.entities.Transaction.filter({ dotloop_loop_id: String(dotloopLoopId), brokerage_id });
      if (byLoop.length > 0) transaction = byLoop[0];
    }

    // 1. Try MLS match
    if (!transaction && mlsNumber) {
      const byMls = await base44.asServiceRole.entities.Transaction.filter({ mls_number: mlsNumber, brokerage_id });
      if (byMls.length > 0) transaction = byMls[0];
    }

    // 2. Try address match from loop name
    if (!transaction && loopName) {
      const allTx = await base44.asServiceRole.entities.Transaction.filter({ brokerage_id });
      const normTarget = normalizeAddress(loopName);
      transaction = allTx.find(tx => tx.address && normalizeAddress(tx.address).includes(normTarget.slice(0, 20)));
    }

    // 3. Try participant email match
    if (!transaction && participantEmails.length > 0) {
      const allTx = await base44.asServiceRole.entities.Transaction.filter({ brokerage_id });
      for (const email of participantEmails) {
        const match = allTx.find(tx => tx.client_email === email || tx.agent_email === email);
        if (match) { transaction = match; break; }
      }
    }

    // 4. No match — create a pending transaction
    if (!transaction) {
      console.log("Dotloop: no matching transaction found, creating pending record");
      transaction = await base44.asServiceRole.entities.Transaction.create({
        brokerage_id,
        address: loopName || `Dotloop Import (Loop ${dotloopLoopId || "unknown"})`,
        agent: "Dotloop Import",
        status: "pending",
        transaction_phase: "intake",
        mls_number: mlsNumber || "",
        dotloop_loop_id: dotloopLoopId ? String(dotloopLoopId) : "",
        notes: `Auto-created from Dotloop webhook. Event: ${eventType}. Review and match manually.`,
        last_activity_at: new Date().toISOString(),
        tasks: [],
      });
      console.log("Dotloop: created pending transaction:", transaction.id);
    }

    const txId = transaction.id;

    // Persist dotloop_loop_id on matched transaction if not already set
    if (dotloopLoopId && !transaction.dotloop_loop_id) {
      await base44.asServiceRole.entities.Transaction.update(txId, { dotloop_loop_id: String(dotloopLoopId) });
    }

    const docType = classifyDocType(docName);

    // --- Store document in EliteTC ---
    const existingDocs = await base44.asServiceRole.entities.Document.filter({ transaction_id: txId });
    const alreadyImported = existingDocs.some(d => d.notes?.includes(`dotloop:${dotloopDocId}`));

    if (alreadyImported) {
      console.log("Dotloop: document already imported, skipping:", dotloopDocId);
      return Response.json({ status: "duplicate", transaction_id: txId });
    }

    const doc = await base44.asServiceRole.entities.Document.create({
      transaction_id: txId,
      brokerage_id,
      doc_type: docType,
      file_url: fileUrl,
      file_name: docName,
      uploaded_by: "dotloop-integration",
      uploaded_by_role: "system",
      notes: `Imported from Dotloop. Event: ${eventType}. dotloop:${dotloopDocId || "unknown"}`,
    });

    // --- Audit log ---
    await base44.asServiceRole.entities.AuditLog.create({
      brokerage_id,
      transaction_id: txId,
      actor_email: "dotloop-integration",
      action: "document_imported",
      entity_type: "document",
      entity_id: doc.id,
      description: `Document "${docName}" imported from Dotloop via ${eventType} webhook.`,
    });

    // --- Trigger AI parsing for purchase agreements ---
    if (docType === "purchase_and_sale" || docType === "other") {
      console.log("Dotloop: triggering AI parse for:", docName);
      base44.asServiceRole.functions.invoke("parsePurchaseAgreementV2", {
        file_url: fileUrl,
      }).then(async (parsed) => {
        if (!parsed || parsed.error) return;
        const updates = {};
        if (parsed.property_address && !transaction.address?.includes(parsed.property_address)) {
          updates.address = parsed.property_address;
        }
        if (parsed.closing_date) updates.closing_date = parsed.closing_date;
        if (parsed.acceptance_date) updates.contract_date = parsed.acceptance_date;
        if (parsed.purchase_price) updates.sale_price = parsed.purchase_price;
        if (parsed.inspection_deadline) updates.inspection_deadline = parsed.inspection_deadline;
        if (parsed.financing_commitment_date) updates.financing_deadline = parsed.financing_commitment_date;
        if (parsed.earnest_money_deadline) updates.earnest_money_deadline = parsed.earnest_money_deadline;
        if (parsed.buyer_names) {
          const buyers = parsed.buyer_names.split(/[,&]/).map(s => s.trim()).filter(Boolean);
          updates.buyers = buyers;
          updates.buyer = buyers.join(" & ");
        }
        if (parsed.seller_names) {
          const sellers = parsed.seller_names.split(/[,&]/).map(s => s.trim()).filter(Boolean);
          updates.sellers = sellers;
          updates.seller = sellers.join(" & ");
        }
        if (Object.keys(updates).length > 0) {
          updates.last_activity_at = new Date().toISOString();
          await base44.asServiceRole.entities.Transaction.update(txId, updates);
          console.log("Dotloop: updated transaction from AI parse:", Object.keys(updates));
        }
      }).catch(err => console.warn("Dotloop: AI parse failed:", err.message));

      // Trigger compliance scan
      base44.asServiceRole.functions.invoke("complianceEngine", {
        document_url: fileUrl,
        file_name: docName,
        document_id: doc.id,
        transaction_id: txId,
        brokerage_id,
        transaction_data: {
          address: transaction.address,
          brokerage_id,
          phase: transaction.phase || 1,
        },
      }).catch(() => {});
    }

    console.log("Dotloop webhook processed:", { event: eventType, transaction_id: txId, doc_id: doc.id, doc_type: docType });
    return Response.json({
      status: "ok",
      transaction_id: txId,
      document_id: doc.id,
      doc_type: docType,
      matched: !!transaction?.address && transaction.agent !== "Dotloop Import",
    });

  } catch (error) {
    console.error("dotloopWebhook error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
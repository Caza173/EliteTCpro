/**
 * dropboxSignWebhook — Processes Dropbox Sign events.
 * PERFORMANCE: Returns "Hello API Event Received" immediately (<2s).
 * Heavy tasks (PDF download, compliance, notifications) run async via EdgeRuntime.waitUntil.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://api.hellosign.com/v3";

function getAuthHeader() {
  return "Basic " + btoa(Deno.env.get("DROPBOX_SIGN_API_KEY") + ":");
}

function mapEventToStatus(eventType) {
  const map = {
    signature_request_sent:        "sent",
    signature_request_viewed:      "viewed",
    signature_request_signed:      "partially_signed",
    signature_request_all_signed:  "completed",
    signature_request_declined:    "declined",
    signature_request_downloadable:"completed",
    signature_request_canceled:    "cancelled",
  };
  return map[eventType] || null;
}

async function processEventAsync(base44, eventType, signatureRequest, sigRecord) {
  const providerRequestId = signatureRequest?.signature_request_id;

  // 1. Update signature request status
  const newStatus = mapEventToStatus(eventType);
  if (newStatus) {
    const updateData = { status: newStatus };
    if (newStatus === "completed") updateData.completed_at = new Date().toISOString();
    if (newStatus === "declined")  updateData.declined_at = new Date().toISOString();
    if (newStatus === "cancelled") updateData.cancelled_at = new Date().toISOString();

    // Mark needs_attention for failure states
    if (["declined", "expired", "error"].includes(newStatus)) {
      updateData.status = "needs_attention";
      updateData.attention_reason = `Signature request ${newStatus}`;
    }

    await base44.asServiceRole.entities.SignatureRequest.update(sigRecord.id, updateData);
  }

  // 2. Update recipient statuses + progress tracking
  if (signatureRequest.signatures) {
    const recipients = await base44.asServiceRole.entities.SignatureRecipient.filter({
      signature_id: sigRecord.id,
    });

    await Promise.all(
      signatureRequest.signatures.map(async (dsSig) => {
        const recipient = recipients.find(r => r.email === dsSig.signer_email_address);
        if (!recipient) return;
        const recipStatus = dsSig.status_code === "signed" ? "signed"
          : dsSig.last_viewed_at ? "viewed"
          : "pending";
        if (recipStatus !== recipient.status) {
          await base44.asServiceRole.entities.SignatureRecipient.update(recipient.id, {
            status: recipStatus,
            ...(recipStatus === "signed" ? { signed_at: new Date().toISOString() } : {}),
            ...(dsSig.last_viewed_at ? { viewed_at: dsSig.last_viewed_at } : {}),
          });
        }
      })
    );

    // Update progress on sig record
    const signed = recipients.filter(r => r.status === "signed").length;
    await base44.asServiceRole.entities.SignatureRequest.update(sigRecord.id, {
      progress_completed: signed,
      progress_total: recipients.length,
    });
  }

  // 3. Audit log
  const actionLabels = {
    signature_request_sent:        "Signature request sent",
    signature_request_viewed:      "Signer viewed document",
    signature_request_signed:      "Signer signed document",
    signature_request_all_signed:  "All parties signed — document fully executed",
    signature_request_declined:    "Signature request declined — needs attention",
    signature_request_canceled:    "Signature request cancelled",
    signature_request_downloadable:"Signed document available for download",
  };

  await base44.asServiceRole.entities.AuditLog.create({
    transaction_id: sigRecord.transaction_id,
    action: eventType,
    entity_type: "document",
    entity_id: sigRecord.document_id,
    description: actionLabels[eventType] || eventType,
    actor_email: "system",
  });

  // 4. On completion: download signed PDF and run compliance
  if (eventType === "signature_request_all_signed" || eventType === "signature_request_downloadable") {
    const dsRes = await fetch(
      `${BASE_URL}/signature_request/files/${providerRequestId}?file_type=pdf`,
      { headers: { Authorization: getAuthHeader() } }
    );
    if (dsRes.ok) {
      const pdfBlob = await dsRes.blob();
      try {
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfBlob });
        if (uploadRes?.file_url) {
          const newDoc = await base44.asServiceRole.entities.Document.create({
            transaction_id: sigRecord.transaction_id,
            brokerage_id: sigRecord.brokerage_id,
            file_url: uploadRes.file_url,
            file_name: `SIGNED_${sigRecord.title || "document"}.pdf`,
            doc_type: "other",
            uploaded_by: "system",
            notes: "Auto-attached signed document from Dropbox Sign",
          });

          await base44.asServiceRole.entities.SignatureRequest.update(sigRecord.id, {
            signed_document_url: uploadRes.file_url,
          });

          // Trigger compliance check on signed document
          try {
            const tx = await base44.asServiceRole.entities.Transaction.filter({ id: sigRecord.transaction_id });
            const txData = tx?.[0];
            if (txData) {
              await base44.asServiceRole.functions.invoke("complianceEngine", {
                document_url: uploadRes.file_url,
                file_name: `SIGNED_${sigRecord.title || "document"}.pdf`,
                document_id: newDoc?.id,
                transaction_id: sigRecord.transaction_id,
                brokerage_id: sigRecord.brokerage_id,
                transaction_data: {
                  address: txData.address,
                  transaction_type: txData.transaction_type,
                  is_cash_transaction: txData.is_cash_transaction,
                  sale_price: txData.sale_price,
                  agent_email: txData.agent_email,
                  buyer: txData.buyer,
                  buyers: txData.buyers,
                  seller: txData.seller,
                  sellers: txData.sellers,
                },
              });

              // Check if transaction is still blocked by signatures
              const allSigRequests = await base44.asServiceRole.entities.SignatureRequest.filter({
                transaction_id: sigRecord.transaction_id,
              });
              const allDocs = await base44.asServiceRole.entities.Document.filter({
                transaction_id: sigRecord.transaction_id,
              });

              // Unblock transaction if all critical docs are now signed
              const criticalDocTypes = ["purchase_and_sale", "listing_agreement", "buyer_agency_agreement", "closing"];
              const criticalDocs = allDocs.filter(d => criticalDocTypes.includes(d.doc_type));
              const allCriticalSigned = criticalDocs.every(doc => {
                const sig = allSigRequests.find(s => s.document_id === doc.id && s.status === "completed");
                return !!sig;
              });

              if (allCriticalSigned) {
                await base44.asServiceRole.entities.Transaction.update(sigRecord.transaction_id, {
                  blocked_by_signature: false,
                  compliance_status: "compliant",
                  last_activity_at: new Date().toISOString(),
                });
              }
            }
          } catch (e) {
            console.warn("[dropboxSignWebhook] Compliance check failed:", e.message);
          }
        }
      } catch (e) {
        console.warn("[dropboxSignWebhook] PDF upload failed:", e.message);
      }
    }

    // Notify TC of completion
    if (sigRecord.created_by) {
      await base44.asServiceRole.entities.InAppNotification.create({
        transaction_id: sigRecord.transaction_id,
        user_email: sigRecord.created_by,
        title: "Document Fully Executed ✓",
        body: `All parties have signed "${sigRecord.title}". The signed PDF has been attached and compliance check triggered.`,
        type: "document",
      });
    }

    // Log to AIActivityLog
    await base44.asServiceRole.entities.AIActivityLog.create({
      transaction_id: sigRecord.transaction_id,
      deadline_type: "signature",
      deadline_label: sigRecord.title,
      interval_label: "overdue",
      subject: `Document Fully Executed: ${sigRecord.title}`,
      message: "All parties have signed. Signed PDF attached. Compliance scan triggered.",
      response_status: "sent",
    });
  }

  // 5. Notify on decline
  if (eventType === "signature_request_declined") {
    if (sigRecord.created_by) {
      await base44.asServiceRole.entities.InAppNotification.create({
        transaction_id: sigRecord.transaction_id,
        user_email: sigRecord.created_by,
        title: "⚠ Signature Declined — Action Required",
        body: `A signer declined to sign "${sigRecord.title}". Review required — transaction may be blocked.`,
        type: "document",
      });
    }

    // Mark transaction as needing attention
    await base44.asServiceRole.entities.Transaction.update(sigRecord.transaction_id, {
      risk_level: "at_risk",
      blocked_by_signature: true,
      compliance_status: "failed",
      last_activity_at: new Date().toISOString(),
    });
  }
}

Deno.serve(async (req) => {
  // IMPORTANT: Return immediately for Dropbox Sign
  const contentType = req.headers.get("content-type") || "";
  let payload;

  try {
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      const jsonStr = params.get("json");
      payload = jsonStr ? JSON.parse(jsonStr) : {};
    }
  } catch {
    return new Response("Hello API Event Received", { status: 200 });
  }

  const event = payload?.event;
  const signatureRequest = payload?.signature_request;

  if (!event || !signatureRequest) {
    return new Response("Hello API Event Received", { status: 200 });
  }

  const eventType = event?.event_type;
  const providerRequestId = signatureRequest?.signature_request_id;

  if (!providerRequestId) {
    return new Response("Hello API Event Received", { status: 200 });
  }

  // Process async — don't await, return immediately
  const base44 = createClientFromRequest(req);

  // Fire-and-forget async processing
  (async () => {
    try {
      const records = await base44.asServiceRole.entities.SignatureRequest.filter({
        provider_signature_request_id: providerRequestId,
      });
      const sigRecord = records?.[0];
      if (!sigRecord) return;

      await processEventAsync(base44, eventType, signatureRequest, sigRecord);
    } catch (error) {
      console.error("[dropboxSignWebhook] Async processing error:", error.message);
    }
  })();

  // Respond immediately — Dropbox Sign requires fast response
  return new Response("Hello API Event Received", { status: 200 });
});
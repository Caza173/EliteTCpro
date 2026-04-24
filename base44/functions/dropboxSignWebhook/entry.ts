import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://api.hellosign.com/v3";

function getAuthHeader() {
  return "Basic " + btoa(Deno.env.get("DROPBOX_SIGN_API_KEY") + ":");
}

function mapEventToStatus(eventType) {
  const map = {
    signature_request_sent: "sent",
    signature_request_viewed: "viewed",
    signature_request_signed: "partially_signed",
    signature_request_all_signed: "completed",
    signature_request_declined: "declined",
    signature_request_downloadable: "completed",
    signature_request_canceled: "cancelled",
  };
  return map[eventType] || null;
}

Deno.serve(async (req) => {
  try {
    // Dropbox Sign requires a "Hello API Event Received" response
    const contentType = req.headers.get("content-type") || "";
    let payload;

    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      // Form-encoded
      const text = await req.text();
      const params = new URLSearchParams(text);
      const jsonStr = params.get("json");
      payload = jsonStr ? JSON.parse(jsonStr) : {};
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

    const base44 = createClientFromRequest(req);

    // Find matching signature record
    const records = await base44.asServiceRole.entities.SignatureRequest.filter({
      provider_signature_request_id: providerRequestId,
    });
    const sigRecord = records?.[0];

    if (!sigRecord) {
      return new Response("Hello API Event Received", { status: 200 });
    }

    const newStatus = mapEventToStatus(eventType);

    if (newStatus) {
      const updateData = { status: newStatus };
      if (newStatus === "completed") updateData.completed_at = new Date().toISOString();
      if (newStatus === "declined") updateData.declined_at = new Date().toISOString();
      if (newStatus === "cancelled") updateData.cancelled_at = new Date().toISOString();
      await base44.asServiceRole.entities.SignatureRequest.update(sigRecord.id, updateData);
    }

    // Update recipient statuses
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
    }

    // Log activity
    const actionLabels = {
      signature_request_sent: "Signature request sent",
      signature_request_viewed: "Signer viewed document",
      signature_request_signed: "Signer signed document",
      signature_request_all_signed: "All parties signed — document fully executed",
      signature_request_declined: "Signature request declined",
      signature_request_canceled: "Signature request cancelled",
      signature_request_downloadable: "Signed document available for download",
    };

    await base44.asServiceRole.entities.AuditLog.create({
      transaction_id: sigRecord.transaction_id,
      action: eventType,
      entity_type: "document",
      entity_id: sigRecord.document_id,
      description: actionLabels[eventType] || eventType,
      actor_email: "system",
    });

    // On completion: download and attach signed PDF, send notifications
    if (eventType === "signature_request_all_signed" || eventType === "signature_request_downloadable") {
      // Download signed PDF from Dropbox Sign
      const dsRes = await fetch(
        `${BASE_URL}/signature_request/files/${providerRequestId}?file_type=pdf`,
        { headers: { Authorization: getAuthHeader() } }
      );
      if (dsRes.ok) {
        const pdfBlob = await dsRes.blob();
        try {
          const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfBlob });
          if (uploadRes?.file_url) {
            // Attach as document record
            await base44.asServiceRole.entities.Document.create({
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
          }
        } catch (_) {}
      }

      // Notify TC
      if (sigRecord.created_by) {
        await base44.asServiceRole.entities.InAppNotification.create({
          transaction_id: sigRecord.transaction_id,
          user_email: sigRecord.created_by,
          title: "Document Fully Executed",
          body: `All parties have signed "${sigRecord.title}". The signed PDF has been attached to the transaction.`,
          type: "document",
        });
      }
    }

    if (eventType === "signature_request_declined") {
      if (sigRecord.created_by) {
        await base44.asServiceRole.entities.InAppNotification.create({
          transaction_id: sigRecord.transaction_id,
          user_email: sigRecord.created_by,
          title: "Signature Request Declined",
          body: `A signer declined to sign "${sigRecord.title}". Review required.`,
          type: "document",
        });
      }
    }

    return new Response("Hello API Event Received", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response("Hello API Event Received", { status: 200 });
  }
});
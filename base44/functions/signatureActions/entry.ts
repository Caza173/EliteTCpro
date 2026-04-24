import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://api.hellosign.com/v3";

function getAuthHeader() {
  return "Basic " + btoa(Deno.env.get("DROPBOX_SIGN_API_KEY") + ":");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, signature_id } = body;

    if (!signature_id || !action) {
      return Response.json({ error: "action and signature_id required" }, { status: 400 });
    }

    const records = await base44.asServiceRole.entities.SignatureRequest.filter({ id: signature_id });
    const sigRecord = records?.[0];
    if (!sigRecord) return Response.json({ error: "Signature request not found" }, { status: 404 });

    const provId = sigRecord.provider_signature_request_id;

    if (action === "resend") {
      if (!provId) return Response.json({ error: "No provider request ID" }, { status: 400 });
      const recipients = await base44.asServiceRole.entities.SignatureRecipient.filter({ signature_id });
      const pending = recipients.filter(r => r.status === "pending");

      for (const r of pending) {
        const fd = new FormData();
        fd.append("email_address", r.email);
        await fetch(`${BASE_URL}/signature_request/remind/${provId}`, {
          method: "POST",
          headers: { Authorization: getAuthHeader() },
          body: fd,
        });
      }

      await base44.asServiceRole.entities.AuditLog.create({
        transaction_id: sigRecord.transaction_id,
        actor_email: user.email,
        action: "signature_request_resent",
        entity_type: "document",
        entity_id: sigRecord.document_id,
        description: `Signature request resent to pending signers`,
      });

      return Response.json({ success: true, message: "Reminder sent to pending signers" });
    }

    if (action === "cancel") {
      if (!provId) return Response.json({ error: "No provider request ID" }, { status: 400 });

      const dsRes = await fetch(`${BASE_URL}/signature_request/cancel/${provId}`, {
        method: "POST",
        headers: { Authorization: getAuthHeader() },
      });

      if (!dsRes.ok) {
        const data = await dsRes.json().catch(() => ({}));
        return Response.json({ error: data?.error?.error_msg || "Failed to cancel" }, { status: 502 });
      }

      await base44.asServiceRole.entities.SignatureRequest.update(signature_id, {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.AuditLog.create({
        transaction_id: sigRecord.transaction_id,
        actor_email: user.email,
        action: "signature_request_cancelled",
        entity_type: "document",
        entity_id: sigRecord.document_id,
        description: `Signature request cancelled`,
      });

      return Response.json({ success: true });
    }

    if (action === "download") {
      if (!provId) return Response.json({ error: "No provider request ID" }, { status: 400 });
      if (sigRecord.status !== "completed") {
        return Response.json({ error: "Document not yet fully signed" }, { status: 400 });
      }

      // If we already have a stored URL, return it
      if (sigRecord.signed_document_url) {
        return Response.json({ success: true, url: sigRecord.signed_document_url });
      }

      // Download from Dropbox Sign
      const dsRes = await fetch(`${BASE_URL}/signature_request/files/${provId}?file_type=pdf`, {
        headers: { Authorization: getAuthHeader() },
      });
      if (!dsRes.ok) return Response.json({ error: "Failed to download signed PDF" }, { status: 502 });

      const pdfBlob = await dsRes.blob();

      // Upload to our storage
      const uploadFd = new FormData();
      uploadFd.append("file", pdfBlob, `signed_${sigRecord.title || "document"}.pdf`);
      const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfBlob });
      const fileUrl = uploadRes?.file_url;

      if (fileUrl) {
        await base44.asServiceRole.entities.SignatureRequest.update(signature_id, { signed_document_url: fileUrl });
        await base44.asServiceRole.entities.AuditLog.create({
          transaction_id: sigRecord.transaction_id,
          actor_email: user.email,
          action: "signed_document_downloaded",
          entity_type: "document",
          entity_id: sigRecord.document_id,
          description: `Signed document downloaded`,
        });
        return Response.json({ success: true, url: fileUrl });
      }

      return Response.json({ error: "Failed to store signed document" }, { status: 500 });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
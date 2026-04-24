import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://api.hellosign.com/v3";

function getAuthHeader() {
  const apiKey = Deno.env.get("DROPBOX_SIGN_API_KEY");
  return "Basic " + btoa(apiKey + ":");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { transaction_id, document_id, title, subject, message, recipients } = body;

    if (!transaction_id || !document_id) {
      return Response.json({ error: "transaction_id and document_id are required" }, { status: 400 });
    }
    if (!recipients || recipients.length === 0) {
      return Response.json({ error: "At least one recipient is required" }, { status: 400 });
    }
    for (const r of recipients) {
      if (!r.name || !r.email) return Response.json({ error: `Recipient missing name or email` }, { status: 400 });
      if (!r.email.includes("@")) return Response.json({ error: `Invalid email: ${r.email}` }, { status: 400 });
    }

    // Fetch transaction and document
    const [transactions, documents] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter({ id: transaction_id }),
      base44.asServiceRole.entities.Document.filter({ id: document_id }),
    ]);

    const transaction = transactions?.[0];
    const document = documents?.[0];

    if (!transaction) return Response.json({ error: "Transaction not found" }, { status: 404 });
    if (!document) return Response.json({ error: "Document not found" }, { status: 404 });
    if (!document.file_url) return Response.json({ error: "Document has no file attached" }, { status: 400 });

    const signatureTitle = title || `Signature Request: ${transaction.address}`;
    const signatureSubject = subject || `Signature Request: ${transaction.address}`;
    const signatureMessage = message || `Please review and sign the attached document for ${transaction.address}.`;

    // Build form data for Dropbox Sign
    const formData = new FormData();
    formData.append("title", signatureTitle);
    formData.append("subject", signatureSubject);
    formData.append("message", signatureMessage);
    formData.append("test_mode", "1"); // set to "0" for production

    // Fetch the document file
    const fileRes = await fetch(document.file_url);
    if (!fileRes.ok) throw new Error("Failed to fetch document file");
    const fileBlob = await fileRes.blob();
    const fileName = document.file_name || "document.pdf";
    formData.append("file[0]", fileBlob, fileName);

    // Add signers
    recipients.forEach((signer, idx) => {
      formData.append(`signers[${idx}][name]`, signer.name);
      formData.append(`signers[${idx}][email_address]`, signer.email);
      formData.append(`signers[${idx}][order]`, String(signer.routing_order || idx + 1));
    });

    // Send to Dropbox Sign
    const dsRes = await fetch(`${BASE_URL}/signature_request/send`, {
      method: "POST",
      headers: { Authorization: getAuthHeader() },
      body: formData,
    });

    const dsData = await dsRes.json();
    if (!dsRes.ok) {
      const errMsg = dsData?.error?.error_msg || "Dropbox Sign API error";
      return Response.json({ error: errMsg }, { status: 502 });
    }

    const dsRequest = dsData.signature_request;
    const providerRequestId = dsRequest.signature_request_id;

    // Check if document needs manual field review (no text tags detected)
    const needsReview = !fileName.toLowerCase().endsWith(".pdf");

    // Save SignatureRequest record
    const sigRecord = await base44.asServiceRole.entities.SignatureRequest.create({
      transaction_id,
      document_id,
      provider: "dropbox_sign",
      provider_signature_request_id: providerRequestId,
      status: "sent",
      title: signatureTitle,
      subject: signatureSubject,
      message: signatureMessage,
      sent_at: new Date().toISOString(),
      created_by: user.email,
      brokerage_id: user.data?.brokerage_id || transaction.brokerage_id || "",
      needs_manual_field_review: needsReview,
    });

    // Save recipients
    const dsSigners = dsRequest.signatures || [];
    await Promise.all(
      recipients.map((r, idx) => {
        const dsSigner = dsSigners[idx];
        return base44.asServiceRole.entities.SignatureRecipient.create({
          signature_id: sigRecord.id,
          transaction_id,
          name: r.name,
          email: r.email,
          role: r.role || "other",
          routing_order: r.routing_order || idx + 1,
          status: "pending",
          provider_signer_id: dsSigner?.signature_id || "",
        });
      })
    );

    // Log activity
    await base44.asServiceRole.entities.AuditLog.create({
      transaction_id,
      actor_email: user.email,
      action: "signature_request_sent",
      entity_type: "document",
      entity_id: document_id,
      description: `Signature request sent for "${document.file_name || "document"}" to ${recipients.map(r => r.name).join(", ")}`,
    });

    // Create in-app notification
    await base44.asServiceRole.entities.InAppNotification.create({
      transaction_id,
      user_email: user.email,
      title: "Signature Request Sent",
      body: `Document sent for signature: ${document.file_name || "document"} for ${transaction.address}`,
      type: "document",
    });

    return Response.json({ success: true, signature: sigRecord, provider_request_id: providerRequestId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
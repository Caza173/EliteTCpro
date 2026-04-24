import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DROPBOX_SIGN_API_KEY = Deno.env.get("DROPBOX_SIGN_API_KEY");
const BASE_URL = "https://api.hellosign.com/v3";

// Map role to Dropbox Sign signer index
const ROLE_TO_SIGNER = {
  buyer: "signer1",
  seller: "signer3",
  agent: "signer5",
  attorney: "signer6",
  lender: "signer7",
  title: "signer8",
  other: "signer9",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { transaction_id, document_id, title, subject, message, recipients } = await req.json();

  if (!transaction_id || !document_id || !recipients?.length) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  for (const r of recipients) {
    if (!r.name || !r.email) {
      return Response.json({ error: `Recipient missing name or email: ${JSON.stringify(r)}` }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
      return Response.json({ error: `Invalid email: ${r.email}` }, { status: 400 });
    }
  }

  // Fetch transaction and document
  const [transactions, documents] = await Promise.all([
    base44.asServiceRole.entities.Transaction.filter({ id: transaction_id }),
    base44.asServiceRole.entities.Document.filter({ id: document_id }),
  ]);

  const tx = transactions?.[0];
  const doc = documents?.[0];

  if (!tx) return Response.json({ error: "Transaction not found" }, { status: 404 });
  if (!doc) return Response.json({ error: "Document not found" }, { status: 404 });
  if (!doc.file_url) return Response.json({ error: "Document has no file URL" }, { status: 400 });

  // Check for supported file type
  const fileExt = doc.file_name?.split(".").pop()?.toLowerCase();
  if (fileExt && !["pdf", "doc", "docx"].includes(fileExt)) {
    return Response.json({ error: `Unsupported file type: ${fileExt}` }, { status: 400 });
  }

  // Download the document file
  const fileResponse = await fetch(doc.file_url);
  if (!fileResponse.ok) {
    return Response.json({ error: "Failed to fetch document file" }, { status: 500 });
  }
  const fileBlob = await fileResponse.blob();

  // Build Dropbox Sign signers list
  const signers = recipients
    .sort((a, b) => (a.routing_order || 1) - (b.routing_order || 1))
    .map((r, i) => ({
      email_address: r.email,
      name: r.name,
      order: r.routing_order || i + 1,
    }));

  // Build multipart form for Dropbox Sign API
  const form = new FormData();
  form.append("title", title || doc.file_name || "Signature Request");
  form.append("subject", subject || `Signature Request: ${tx.address}`);
  form.append("message", message || `Please review and sign the attached document for ${tx.address}.`);
  form.append("use_text_tags", "1");
  form.append("hide_text_tags", "1");
  form.append("files[0]", fileBlob, doc.file_name || "document.pdf");

  signers.forEach((signer, i) => {
    form.append(`signers[${i}][email_address]`, signer.email_address);
    form.append(`signers[${i}][name]`, signer.name);
    form.append(`signers[${i}][order]`, String(signer.order));
  });

  // Send to Dropbox Sign
  const dsResponse = await fetch(`${BASE_URL}/signature_request/send`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(DROPBOX_SIGN_API_KEY + ":")}`,
    },
    body: form,
  });

  const dsData = await dsResponse.json();

  if (!dsResponse.ok) {
    console.error("Dropbox Sign API Error:", dsData);
    return Response.json({
      error: dsData?.error?.error_msg || "Dropbox Sign API error",
    }, { status: 500 });
  }

  const providerRequestId = dsData?.signature_request?.signature_request_id;

  // Create signature record
  const sigRecord = await base44.asServiceRole.entities.SignatureRequest.create({
    transaction_id,
    document_id,
    provider: "dropbox_sign",
    provider_signature_request_id: providerRequestId,
    status: "sent",
    title: title || doc.file_name,
    subject: subject || `Signature Request: ${tx.address}`,
    message: message || `Please review and sign the attached document for ${tx.address}.`,
    sent_at: new Date().toISOString(),
    created_by: user.email,
  });

  // Create recipient records
  await Promise.all(
    recipients.map((r) =>
      base44.asServiceRole.entities.SignatureRecipient.create({
        signature_id: sigRecord.id,
        name: r.name,
        email: r.email,
        role: r.role || "other",
        routing_order: r.routing_order || 1,
        status: "pending",
      })
    )
  );

  // Log activity
  await base44.asServiceRole.entities.AuditLog.create({
    transaction_id,
    actor_email: user.email,
    action: "signature_request_sent",
    entity_type: "document",
    entity_id: document_id,
    description: `Signature request sent via Dropbox Sign for "${title || doc.file_name}" to ${recipients.map(r => r.email).join(", ")}`,
  });

  // In-app notification
  await base44.asServiceRole.entities.InAppNotification.create({
    transaction_id,
    title: "Document Sent for Signature",
    body: `"${title || doc.file_name}" has been sent for signature to ${recipients.length} recipient(s).`,
    type: "document",
    user_email: user.email,
  });

  return Response.json({ success: true, signature_id: sigRecord.id, provider_request_id: providerRequestId });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DROPBOX_SIGN_API_KEY = Deno.env.get("DROPBOX_SIGN_API_KEY");
const BASE_URL = "https://api.hellosign.com/v3";

Deno.serve(async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { signature_id, recipient_email } = await req.json();
  if (!signature_id) return Response.json({ error: "Missing signature_id" }, { status: 400 });

  const sigs = await base44.asServiceRole.entities.SignatureRequest.filter({ id: signature_id });
  const sig = sigs?.[0];
  if (!sig) return Response.json({ error: "Signature request not found" }, { status: 404 });

  // Get the signer ID from Dropbox Sign to resend to specific recipient
  const dsStatusRes = await fetch(`${BASE_URL}/signature_request/${sig.provider_signature_request_id}`, {
    headers: { Authorization: `Basic ${btoa(DROPBOX_SIGN_API_KEY + ":")}` },
  });
  const dsData = await dsStatusRes.json();
  const signers = dsData?.signature_request?.signatures || [];

  let signerGuid = null;
  if (recipient_email) {
    const match = signers.find(s => s.signer_email_address?.toLowerCase() === recipient_email.toLowerCase());
    signerGuid = match?.signature_id;
  }

  const form = new FormData();
  if (signerGuid) form.append("signature_id", signerGuid);

  const dsRes = await fetch(`${BASE_URL}/signature_request/remind/${sig.provider_signature_request_id}`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(DROPBOX_SIGN_API_KEY + ":")}` },
    body: form,
  });

  if (!dsRes.ok) {
    return Response.json({ error: "Failed to resend reminder" }, { status: 500 });
  }

  await base44.asServiceRole.entities.AuditLog.create({
    transaction_id: sig.transaction_id,
    actor_email: user.email,
    action: "signature_request_resent",
    entity_type: "document",
    entity_id: sig.document_id || sig.id,
    description: `Signature reminder resent by ${user.email}${recipient_email ? ` to ${recipient_email}` : ""}`,
  });

  return Response.json({ success: true });
});
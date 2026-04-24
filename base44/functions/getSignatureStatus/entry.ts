import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DROPBOX_SIGN_API_KEY = Deno.env.get("DROPBOX_SIGN_API_KEY");
const BASE_URL = "https://api.hellosign.com/v3";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { signature_id } = await req.json();
  if (!signature_id) return Response.json({ error: "Missing signature_id" }, { status: 400 });

  const sigs = await base44.asServiceRole.entities.SignatureRequest.filter({ id: signature_id });
  const sig = sigs?.[0];
  if (!sig) return Response.json({ error: "Signature request not found" }, { status: 404 });

  // Fetch live status from Dropbox Sign
  const dsRes = await fetch(`${BASE_URL}/signature_request/${sig.provider_signature_request_id}`, {
    headers: { Authorization: `Basic ${btoa(DROPBOX_SIGN_API_KEY + ":")}` },
  });

  const dsData = await dsRes.json();
  if (!dsRes.ok) return Response.json({ error: "Failed to fetch from Dropbox Sign" }, { status: 500 });

  const dsRequest = dsData?.signature_request;
  const newStatus =
    dsRequest?.is_complete ? "completed" :
    dsRequest?.is_declined ? "declined" :
    dsRequest?.has_error ? "error" :
    sig.status;

  // Update local record
  await base44.asServiceRole.entities.SignatureRequest.update(sig.id, { status: newStatus });

  // Update recipients
  const recipients = await base44.asServiceRole.entities.SignatureRecipient.filter({ signature_id: sig.id });
  for (const signer of (dsRequest?.signatures || [])) {
    const match = recipients.find(r => r.email?.toLowerCase() === signer.signer_email_address?.toLowerCase());
    if (match) {
      await base44.asServiceRole.entities.SignatureRecipient.update(match.id, {
        status: signer.status_code === "signed" ? "signed" : signer.status_code === "declined" ? "declined" : "pending",
        signed_at: signer.signed_at ? new Date(signer.signed_at * 1000).toISOString() : match.signed_at,
      });
    }
  }

  return Response.json({
    signature_id: sig.id,
    status: newStatus,
    provider_data: dsRequest,
  });
});
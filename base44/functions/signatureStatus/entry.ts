import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://api.hellosign.com/v3";

function getAuthHeader() {
  return "Basic " + btoa(Deno.env.get("DROPBOX_SIGN_API_KEY") + ":");
}

function mapDropboxStatus(dsReq) {
  if (dsReq.is_complete) return "completed";
  if (dsReq.is_declined) return "declined";
  if (dsReq.has_error) return "error";
  const sigs = dsReq.signatures || [];
  const anySigned = sigs.some(s => s.status_code === "signed");
  const anyViewed = sigs.some(s => s.last_viewed_at);
  if (anySigned) return "partially_signed";
  if (anyViewed) return "viewed";
  return "sent";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { signature_id } = body;
    if (!signature_id) return Response.json({ error: "signature_id required" }, { status: 400 });

    const records = await base44.asServiceRole.entities.SignatureRequest.filter({ id: signature_id });
    const sigRecord = records?.[0];
    if (!sigRecord) return Response.json({ error: "Signature request not found" }, { status: 404 });

    if (!sigRecord.provider_signature_request_id) {
      return Response.json({ signature: sigRecord, recipients: [] });
    }

    // Fetch fresh status from Dropbox Sign
    const dsRes = await fetch(`${BASE_URL}/signature_request/${sigRecord.provider_signature_request_id}`, {
      headers: { Authorization: getAuthHeader() },
    });
    const dsData = await dsRes.json();
    if (!dsRes.ok) return Response.json({ error: "Failed to fetch from Dropbox Sign" }, { status: 502 });

    const dsRequest = dsData.signature_request;
    const newStatus = mapDropboxStatus(dsRequest);

    // Update local status
    await base44.asServiceRole.entities.SignatureRequest.update(signature_id, {
      status: newStatus,
      ...(dsRequest.is_complete ? { completed_at: new Date().toISOString() } : {}),
    });

    // Update recipient statuses
    const recipients = await base44.asServiceRole.entities.SignatureRecipient.filter({ signature_id });
    const dsSigners = dsRequest.signatures || [];

    await Promise.all(
      recipients.map(async (r) => {
        const dsSigner = dsSigners.find(s => s.signer_email_address === r.email);
        if (!dsSigner) return;
        const recipStatus = dsSigner.status_code === "signed" ? "signed"
          : dsSigner.last_viewed_at ? "viewed"
          : "pending";
        if (recipStatus !== r.status) {
          await base44.asServiceRole.entities.SignatureRecipient.update(r.id, {
            status: recipStatus,
            ...(recipStatus === "signed" ? { signed_at: new Date().toISOString() } : {}),
            ...(dsSigner.last_viewed_at ? { viewed_at: dsSigner.last_viewed_at } : {}),
          });
        }
      })
    );

    const updatedRecipients = await base44.asServiceRole.entities.SignatureRecipient.filter({ signature_id });
    const updatedSig = { ...sigRecord, status: newStatus };

    return Response.json({ signature: updatedSig, recipients: updatedRecipients });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
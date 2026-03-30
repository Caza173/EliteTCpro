import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ─── Signature Service — provider-agnostic layer ───────────────────────────
// provider: "internal" (default) | "dotloop" | "docusign" (future)
const PROVIDER = "internal";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ── CREATE signature request ──────────────────────────────────────────────
  if (action === "create") {
    const { transaction_id, document_id, document_name, document_url, signers, signature_fields, brokerage_id } = body;

    const record = await base44.entities.SignatureRequest.create({
      brokerage_id,
      transaction_id,
      document_id,
      document_name,
      document_url,
      provider: PROVIDER,
      status: "draft",
      signers: signers.map(s => ({ ...s, status: "pending", token: crypto.randomUUID() })),
      signature_fields: signature_fields || [],
      created_by: user.email,
    });

    await base44.entities.SignatureAuditEvent.create({
      signature_request_id: record.id,
      transaction_id,
      brokerage_id,
      signer_name: user.full_name || user.email,
      signer_email: user.email,
      event_type: "created",
      timestamp: new Date().toISOString(),
      document_version: document_id,
      notes: `Request created by ${user.email}`,
    });

    return Response.json({ success: true, request: record });
  }

  // ── SEND — email each signer their unique link ────────────────────────────
  if (action === "send") {
    const { request_id } = body;
    const requests = await base44.entities.SignatureRequest.filter({ id: request_id });
    const sigReq = requests[0];
    if (!sigReq) return Response.json({ error: "Not found" }, { status: 404 });

    const appOrigin = req.headers.get("origin") || "https://app.base44.com";
    const signingBaseUrl = `${appOrigin}/#/SignDocument`;

    // Send email to each signer
    for (const signer of sigReq.signers) {
      const signingUrl = `${signingBaseUrl}?token=${signer.token}&reqId=${sigReq.id}`;
      const emailBody = `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#0F172A;font-size:20px;margin-bottom:8px;">Signature Required</h2>
          <p style="color:#475569;">Hello ${signer.name},</p>
          <p style="color:#475569;">You have been requested to sign <strong>${sigReq.document_name}</strong>.</p>
          <div style="margin:24px 0;">
            <a href="${signingUrl}" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
              Review &amp; Sign Document
            </a>
          </div>
          <p style="color:#94A3B8;font-size:12px;">This link is unique to you. Do not share it. By signing, you agree to execute this document electronically in accordance with the ESIGN Act.</p>
        </div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: signer.email,
        subject: `Action Required: Sign "${sigReq.document_name}"`,
        body: emailBody,
      });
    }

    // Update status to sent
    await base44.entities.SignatureRequest.update(sigReq.id, {
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    await base44.entities.SignatureAuditEvent.create({
      signature_request_id: sigReq.id,
      transaction_id: sigReq.transaction_id,
      brokerage_id: sigReq.brokerage_id,
      signer_email: user.email,
      event_type: "sent",
      timestamp: new Date().toISOString(),
      notes: `Sent to ${sigReq.signers.map(s => s.email).join(", ")}`,
    });

    return Response.json({ success: true });
  }

  // ── VIEW — signer opens their link (record IP, mark viewed) ──────────────
  if (action === "view") {
    const { request_id, token } = body;
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    const requests = await base44.asServiceRole.entities.SignatureRequest.filter({ id: request_id });
    const sigReq = requests[0];
    if (!sigReq) return Response.json({ error: "Not found" }, { status: 404 });

    const signerIdx = sigReq.signers.findIndex(s => s.token === token);
    if (signerIdx === -1) return Response.json({ error: "Invalid token" }, { status: 403 });

    const signer = sigReq.signers[signerIdx];
    if (signer.status === "pending") {
      const updatedSigners = sigReq.signers.map((s, i) =>
        i === signerIdx ? { ...s, status: "viewed", viewed_at: new Date().toISOString(), ip_address: ip } : s
      );
      await base44.asServiceRole.entities.SignatureRequest.update(sigReq.id, {
        signers: updatedSigners,
        status: "viewed",
      });
      await base44.asServiceRole.entities.SignatureAuditEvent.create({
        signature_request_id: sigReq.id,
        transaction_id: sigReq.transaction_id,
        brokerage_id: sigReq.brokerage_id,
        signer_name: signer.name,
        signer_email: signer.email,
        event_type: "viewed",
        timestamp: new Date().toISOString(),
        ip_address: ip,
      });
    }

    return Response.json({ success: true, request: { ...sigReq, signers: sigReq.signers.map(s => s.token === token ? { ...s } : { name: s.name, email: s.email, role: s.role, status: s.status }) } });
  }

  // ── SIGN — signer submits their signature ─────────────────────────────────
  if (action === "sign") {
    const { request_id, token, signature_data } = body;
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    const requests = await base44.asServiceRole.entities.SignatureRequest.filter({ id: request_id });
    const sigReq = requests[0];
    if (!sigReq) return Response.json({ error: "Not found" }, { status: 404 });

    const signerIdx = sigReq.signers.findIndex(s => s.token === token);
    if (signerIdx === -1) return Response.json({ error: "Invalid token" }, { status: 403 });

    const updatedSigners = sigReq.signers.map((s, i) =>
      i === signerIdx ? {
        ...s, status: "signed",
        signed_at: new Date().toISOString(),
        ip_address: ip,
        signature_data,
      } : s
    );

    const allSigned = updatedSigners.every(s => s.status === "signed");
    const anySigned = updatedSigners.some(s => s.status === "signed");
    const newStatus = allSigned ? "completed" : anySigned ? "partially_signed" : "sent";

    await base44.asServiceRole.entities.SignatureRequest.update(sigReq.id, {
      signers: updatedSigners,
      status: newStatus,
      ...(allSigned ? { completed_at: new Date().toISOString() } : {}),
    });

    const signer = sigReq.signers[signerIdx];
    await base44.asServiceRole.entities.SignatureAuditEvent.create({
      signature_request_id: sigReq.id,
      transaction_id: sigReq.transaction_id,
      brokerage_id: sigReq.brokerage_id,
      signer_name: signer.name,
      signer_email: signer.email,
      event_type: allSigned ? "completed" : "signed",
      timestamp: new Date().toISOString(),
      ip_address: ip,
      document_version: sigReq.document_id,
    });

    return Response.json({ success: true, completed: allSigned });
  }

  // ── LIST — get all requests for a transaction ────────────────────────────
  if (action === "list") {
    const { transaction_id } = body;
    const requests = await base44.entities.SignatureRequest.filter({ transaction_id });
    return Response.json({ requests });
  }

  // ── AUDIT — get audit trail for a request ────────────────────────────────
  if (action === "audit") {
    const { request_id } = body;
    const events = await base44.entities.SignatureAuditEvent.filter({ signature_request_id: request_id }, "timestamp");
    return Response.json({ events });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});
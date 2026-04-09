import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Under-Contract Communications Automation
 * 
 * Actions:
 *   generate   — parse contract data, run preflight, generate all communications
 *   send       — send a specific CommAutomation record
 *   send_all   — send all READY communications for a transaction
 *   regenerate — re-run generation for a transaction (e.g. after TC fills missing fields)
 *   preflight  — run validation only, return status without generating
 */

// ─── Template Builders ──────────────────────────────────────────────────────

function fmt(val, fallback = "") {
  return val || fallback;
}

function fmtPrice(val) {
  if (!val) return "";
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return String(val);
  return "$" + n.toLocaleString("en-US");
}

function fmtDate(val) {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return val;
  }
}

function buildBuyerEmail(data) {
  const {
    buyer_name, property_address, purchase_price, closing_date,
    earnest_money_amount, earnest_money_due_date,
    inspection_deadline, financing_deadline,
    lender_name, title_company, buyer_agent_name,
    has_inspection_contingency, has_financing_contingency,
  } = data;

  const lenderLine = lender_name ? lender_name : "your lender";
  const titleLine = title_company ? title_company : "the title company";

  let emdSection = "";
  if (earnest_money_amount || earnest_money_due_date) {
    emdSection = `\nEarnest Money`;
    if (earnest_money_amount) emdSection += `\n- Amount: ${fmtPrice(earnest_money_amount)}`;
    if (earnest_money_due_date) emdSection += `\n- Due: ${fmtDate(earnest_money_due_date)}`;
  }

  let inspectionSection = "";
  if (has_inspection_contingency !== false && inspection_deadline) {
    inspectionSection = `\nInspections\n- Schedule as soon as possible\n- Deadline: ${fmtDate(inspection_deadline)}`;
  }

  let financingSection = "";
  if (has_financing_contingency !== false && financing_deadline) {
    financingSection = `\nFinancing\n- Submit any remaining lender documents\n- Commitment date: ${fmtDate(financing_deadline)}`;
  }

  const body = `Hi ${fmt(buyer_name, "there")},

You're officially under contract.

Property: ${fmt(property_address)}
Purchase Price: ${fmtPrice(purchase_price)}
Closing Date: ${fmtDate(closing_date)}

Next steps:
${emdSection}${inspectionSection}${financingSection}

We'll coordinate with ${lenderLine} and ${titleLine} and keep everything on track.

You'll receive reminders as deadlines approach.

Reach out anytime if you need anything.

-${fmt(buyer_agent_name, "Your Agent")}`;

  return {
    subject: `Under Contract – ${fmt(property_address)}`,
    body: body.trim(),
  };
}

function buildSellerEmail(data) {
  const {
    seller_name, property_address, purchase_price, closing_date,
    earnest_money_due_date, inspection_deadline, financing_deadline,
    listing_agent_name, has_inspection_contingency, has_financing_contingency,
  } = data;

  let timelineLines = [];
  if (earnest_money_due_date) timelineLines.push(`Earnest money due: ${fmtDate(earnest_money_due_date)}`);
  if (has_inspection_contingency !== false && inspection_deadline)
    timelineLines.push(`Inspection deadline: ${fmtDate(inspection_deadline)}`);
  if (has_financing_contingency !== false && financing_deadline)
    timelineLines.push(`Financing deadline: ${fmtDate(financing_deadline)}`);

  const body = `Hi ${fmt(seller_name, "there")},

Your property is now under contract.

Property: ${fmt(property_address)}
Contract Price: ${fmtPrice(purchase_price)}
Closing Date: ${fmtDate(closing_date)}

Buyer timeline:
${timelineLines.map(l => l).join("\n")}

What to expect:
- Buyer will schedule inspections
- We may receive repair requests after inspections
- Appraisal will be ordered through the buyer's lender

We'll review anything that comes in and decide next steps together.

I'll handle coordination and keep you updated throughout.

-${fmt(listing_agent_name, "Your Agent")}`;

  return {
    subject: `Under Contract – ${fmt(property_address)}`,
    body: body.trim(),
  };
}

function buildLenderTitleEmail(data) {
  const {
    property_address, purchase_price, closing_date,
    buyer_name, seller_name, lender_name, title_company,
    inspection_deadline, financing_deadline,
    buyer_agent_name, tc_name, tc_email,
    has_inspection_contingency, has_financing_contingency,
  } = data;

  const greeting = [lender_name, title_company].filter(Boolean).join(" and ") || "Team";

  let keyDates = "";
  if (has_inspection_contingency !== false && inspection_deadline)
    keyDates += `\nInspection deadline: ${fmtDate(inspection_deadline)}`;
  if (has_financing_contingency !== false && financing_deadline)
    keyDates += `\nFinancing deadline: ${fmtDate(financing_deadline)}`;

  const body = `Hi ${greeting},

We are under contract on the following:

Property: ${fmt(property_address)}
Purchase Price: ${fmtPrice(purchase_price)}
Closing Date: ${fmtDate(closing_date)}

Buyer: ${fmt(buyer_name)}
Seller: ${fmt(seller_name)}

Key dates:${keyDates || "\nPlease confirm dates upon receipt."}

Please confirm receipt and let us know if anything is needed at this stage.

${fmt(tc_name, "The TC")} is copied and will assist with coordination.

Thank you,
${fmt(buyer_agent_name, "The Agent")}`;

  return {
    subject: `New Under Contract – ${fmt(property_address)}`,
    body: body.trim(),
  };
}

function buildBuyerSMS(data) {
  const { property_address, earnest_money_due_date, inspection_deadline, closing_date, has_inspection_contingency } = data;
  let lines = [`You're officially under contract on ${fmt(property_address)}.`, ""];
  if (earnest_money_due_date) lines.push(`EMD due: ${fmtDate(earnest_money_due_date)}`);
  if (has_inspection_contingency !== false && inspection_deadline) lines.push(`Inspection deadline: ${fmtDate(inspection_deadline)}`);
  if (closing_date) lines.push(`Closing: ${fmtDate(closing_date)}`);
  lines.push("", "I'll keep everything on track and send reminders as we go.");
  return { subject: "Buyer SMS", body: lines.join("\n") };
}

function buildSellerSMS(data) {
  const { property_address, inspection_deadline, closing_date, has_inspection_contingency } = data;
  let lines = [`We're under contract on ${fmt(property_address)}.`, ""];
  if (has_inspection_contingency !== false && inspection_deadline) lines.push(`Inspection deadline: ${fmtDate(inspection_deadline)}`);
  if (closing_date) lines.push(`Closing: ${fmtDate(closing_date)}`);
  lines.push("", "I'll keep you updated as things move forward.");
  return { subject: "Seller SMS", body: lines.join("\n") };
}

// ─── Preflight Validation ────────────────────────────────────────────────────

function runPreflight(data) {
  const issues = [];

  const req = (field, label, section, requiredFor) => {
    if (!data[field]) {
      issues.push({ severity: "blocking", field, label, section, message: `Missing ${label} from ${section}`, required_for: requiredFor });
    }
  };
  const warn = (field, label, section, requiredFor) => {
    if (!data[field]) {
      issues.push({ severity: "warning", field, label, section, message: `Missing ${label} from ${section}`, required_for: requiredFor });
    }
  };

  // Core blocking fields
  req("buyer_name", "Buyer Name", "P&S Header / Parties Section", "buyer_email,seller_email,lender_email");
  req("seller_name", "Seller Name", "P&S Header / Parties Section", "seller_email,lender_email");
  req("property_address", "Property Address", "P&S Header", "all");
  req("purchase_price", "Purchase Price", "P&S Section 3", "all");
  req("closing_date", "Closing Date", "P&S Section 5 – Transfer of Title", "all");

  // Conditional warnings
  if (data.earnest_money_amount && !data.earnest_money_due_date) {
    issues.push({
      severity: "blocking",
      field: "earnest_money_due_date",
      label: "Earnest Money Due Date",
      section: "P&S Section 3",
      message: "Earnest money amount exists but due date is missing from P&S Section 3",
      required_for: "buyer_email,buyer_sms",
    });
  }
  if (data.has_inspection_contingency && !data.inspection_deadline) {
    issues.push({
      severity: "blocking",
      field: "inspection_deadline",
      label: "Inspection Deadline",
      section: "P&S Section 15",
      message: "Inspection contingency marked yes but no inspection deadline found in Section 15",
      required_for: "buyer_email,seller_email",
    });
  }
  if (data.has_financing_contingency && !data.financing_deadline) {
    issues.push({
      severity: "warning",
      field: "financing_deadline",
      label: "Financing Deadline",
      section: "P&S Section 16",
      message: "Financing contingency present but no financing commitment date found in Section 16",
      required_for: "buyer_email,seller_email,lender_email",
    });
  }

  const blockingIssues = issues.filter(i => i.severity === "blocking");
  const warningIssues = issues.filter(i => i.severity === "warning");

  let status;
  if (blockingIssues.length > 0) status = "BLOCKED";
  else if (warningIssues.length > 0) status = "PARTIAL";
  else status = "READY";

  return { status, issues, blockingIssues, warningIssues };
}

// ─── Task-Triggered Template Builders ────────────────────────────────────────

function buildEarnestMoneySubmittedEmail(data) {
  const { buyer_name, property_address, earnest_money_amount, lender_name } = data;
  const escrow = lender_name || "the escrow holder";
  return {
    subject: `Earnest Money Submitted – ${fmt(property_address)}`,
    body: `Dear ${fmt(buyer_name, "there")},\n\nThe earnest money deposit${earnest_money_amount ? ` of $${Number(earnest_money_amount).toLocaleString("en-US")}` : ""} for ${fmt(property_address)} has been submitted to ${escrow}.\n\nPlease confirm receipt and let us know if you have any questions.\n\nBest regards`,
  };
}

function buildEarnestMoneyConfirmedEmail(data) {
  const { buyer_name, property_address, earnest_money_amount, earnest_money_due_date, lender_name } = data;
  const escrow = lender_name || "the escrow holder";
  return {
    subject: `Earnest Money Confirmed – ${fmt(property_address)}`,
    body: `Dear ${fmt(buyer_name, "there")},\n\nWe are pleased to confirm receipt of your earnest money deposit${earnest_money_amount ? ` of $${Number(earnest_money_amount).toLocaleString("en-US")}` : ""}${earnest_money_due_date ? ` on ${fmtDate(earnest_money_due_date)}` : ""}.\n\nThe funds are being held by ${escrow}.\n\nBest regards`,
  };
}

function buildInspectionScheduledEmail(data) {
  const { buyer_name, property_address, inspection_deadline } = data;
  return {
    subject: `Inspection Scheduled – ${fmt(property_address)}`,
    body: `Dear ${fmt(buyer_name, "there")},\n\nYour home inspection has been scheduled for ${fmt(property_address)}.\n\nDeadline: ${fmtDate(inspection_deadline)}\n\nPlease ensure the property is accessible at the scheduled time.\n\nBest regards`,
  };
}

function buildInspectionCompletedEmail(data) {
  const { buyer_name, property_address } = data;
  return {
    subject: `Inspection Completed – Next Steps – ${fmt(property_address)}`,
    body: `Dear ${fmt(buyer_name, "there")},\n\nThe inspection for ${fmt(property_address)} has been completed. The inspection report will be delivered within the timeframe specified in your contract.\n\nPlease review the report carefully and contact us with any questions or concerns.\n\nBest regards`,
  };
}

function buildAppraisalOrderedEmail(data) {
  const { buyer_name, property_address, lender_name } = data;
  return {
    subject: `Appraisal Ordered – ${fmt(property_address)}`,
    body: `Dear ${fmt(buyer_name, "there")},\n\nYour lender, ${fmt(lender_name, "your lender")}, has ordered the appraisal for your property at ${fmt(property_address)}. The appraiser will contact you to schedule an inspection time.\n\nPlease be prepared to provide access to the property as requested.\n\nBest regards`,
  };
}

function buildAppraisalScheduledEmail(data) {
  const { buyer_name, property_address, appraisal_deadline } = data;
  return {
    subject: `Appraisal Scheduled – ${fmt(property_address)}`,
    body: `Dear ${fmt(buyer_name, "there")},\n\nThe appraisal for your property at ${fmt(property_address)} has been scheduled${appraisal_deadline ? ` for ${fmtDate(appraisal_deadline)}` : ""}. Please ensure the property is accessible and in good condition.\n\nIf you need to reschedule, contact the appraiser directly.\n\nBest regards`,
  };
}

// ─── Communication Records Builder ──────────────────────────────────────────

function buildAllComms(data, preflight, transaction, sourceDocId, sourceDocName) {
  const base = {
    transaction_id: transaction.id,
    brokerage_id: transaction.brokerage_id || null,
    source_document_id: sourceDocId || null,
    source_document_name: sourceDocName || null,
    contract_data_snapshot: data,
    preflight_status: preflight.status,
    preflight_issues: preflight.issues,
    missing_fields: preflight.issues.map(i => ({
      field: i.field,
      label: i.label,
      section: i.section,
      required_for: i.required_for,
    })),
    source_sections_used: ["Section 3", "Section 5", "Section 15", "Section 16"].filter(Boolean),
    template_status: preflight.status === "BLOCKED" ? "blocked" : preflight.status === "PARTIAL" ? "partial" : "ready",
  };

  const tcEmail = data.tc_email || transaction.agent_email || null;
  const tcName = data.tc_name || transaction.agent || "TC";

  const comms = [];

  // A. Buyer email
  const buyerEmails = transaction.client_emails?.length
    ? transaction.client_emails
    : transaction.client_email ? [transaction.client_email] : [];
  const { subject: bSubj, body: bBody } = buildBuyerEmail({ ...data, tc_name: tcName });
  comms.push({
    ...base,
    template_type: "buyer_under_contract_email",
    subject: bSubj,
    generated_content: bBody,
    recipients: buyerEmails,
    cc_recipients: [tcEmail].filter(Boolean),
  });

  // B. Seller email
  const sellerEmails = data.seller_email ? [data.seller_email] : [];
  const { subject: sSubj, body: sBody } = buildSellerEmail({ ...data });
  comms.push({
    ...base,
    template_type: "seller_under_contract_email",
    subject: sSubj,
    generated_content: sBody,
    recipients: sellerEmails,
    cc_recipients: [tcEmail].filter(Boolean),
  });

  // C. Lender/Title email
  const lenderTitleRecipients = [data.lender_email, data.title_company_email].filter(Boolean);
  const { subject: ltSubj, body: ltBody } = buildLenderTitleEmail({ ...data, tc_name: tcName });
  comms.push({
    ...base,
    template_type: "lender_title_intro_email",
    subject: ltSubj,
    generated_content: ltBody,
    recipients: lenderTitleRecipients,
    cc_recipients: [tcEmail].filter(Boolean),
  });

  // D. Buyer SMS
  const { subject: bsSubj, body: bsBody } = buildBuyerSMS(data);
  comms.push({
    ...base,
    template_type: "buyer_sms",
    subject: bsSubj,
    generated_content: bsBody,
    recipients: buyerEmails,
    cc_recipients: [],
  });

  // E. Seller SMS
  const { subject: ssSubj, body: ssBody } = buildSellerSMS(data);
  comms.push({
    ...base,
    template_type: "seller_sms",
    subject: ssSubj,
    generated_content: ssBody,
    recipients: sellerEmails,
    cc_recipients: [],
  });

  // Task-triggered templates always get their own "ready" base — no preflight blocking
  const taskBase = {
    ...base,
    template_status: "ready",
    preflight_status: "READY",
    preflight_issues: [],
  };

  // F. Task-triggered: Earnest Money Submitted
  const { subject: emsSub, body: emsBody } = buildEarnestMoneySubmittedEmail(data);
  comms.push({ ...taskBase, template_type: "earnest_money_submitted_email", subject: emsSub, generated_content: emsBody, recipients: buyerEmails, cc_recipients: [] });

  // G. Task-triggered: Earnest Money Confirmed
  const { subject: emcSub, body: emcBody } = buildEarnestMoneyConfirmedEmail(data);
  comms.push({ ...taskBase, template_type: "earnest_money_confirmed_email", subject: emcSub, generated_content: emcBody, recipients: buyerEmails, cc_recipients: [] });

  // H. Task-triggered: Inspection Scheduled
  const { subject: insSub, body: insBody } = buildInspectionScheduledEmail(data);
  comms.push({ ...taskBase, template_type: "inspection_scheduled_email", subject: insSub, generated_content: insBody, recipients: buyerEmails, cc_recipients: [] });

  // I. Task-triggered: Inspection Completed
  const { subject: incSub, body: incBody } = buildInspectionCompletedEmail(data);
  comms.push({ ...taskBase, template_type: "inspection_completed_email", subject: incSub, generated_content: incBody, recipients: buyerEmails, cc_recipients: [] });

  // J. Task-triggered: Appraisal Ordered
  const { subject: apoSub, body: apoBody } = buildAppraisalOrderedEmail(data);
  comms.push({ ...taskBase, template_type: "appraisal_ordered_email", subject: apoSub, generated_content: apoBody, recipients: buyerEmails, cc_recipients: [] });

  // K. Task-triggered: Appraisal Scheduled
  const { subject: apsSub, body: apsBody } = buildAppraisalScheduledEmail(data);
  comms.push({ ...taskBase, template_type: "appraisal_scheduled_email", subject: apsSub, generated_content: apsBody, recipients: buyerEmails, cc_recipients: [] });

  return comms;
}

// ─── Extract Contract Data from Transaction ──────────────────────────────────

function extractContractData(transaction, parsedFields) {
  // Merge: parsed doc fields take priority, then transaction fields as fallback
  const tf = transaction;
  const pf = parsedFields || {};

  const buyers = tf.buyers?.length ? tf.buyers : tf.buyer ? [tf.buyer] : [];
  const sellers = tf.sellers?.length ? tf.sellers : tf.seller ? [tf.seller] : [];

  return {
    buyer_name: pf.buyer_name || buyers.join(" & ") || "",
    seller_name: pf.seller_name || sellers.join(" & ") || "",
    property_address: pf.property_address || tf.address || "",
    purchase_price: pf.purchase_price || tf.sale_price || null,
    earnest_money_amount: pf.earnest_money_amount || null,
    earnest_money_due_date: pf.earnest_money_due_date || tf.earnest_money_deadline || null,
    closing_date: pf.closing_date || tf.closing_date || null,
    inspection_deadline: pf.inspection_deadline || tf.inspection_deadline || null,
    financing_deadline: pf.financing_deadline || tf.financing_deadline || null,
    due_diligence_deadline: pf.due_diligence_deadline || tf.due_diligence_deadline || null,
    buyer_agent_name: pf.buyer_agent_name || tf.buyers_agent_name || tf.agent || "",
    listing_agent_name: pf.listing_agent_name || tf.sellers_agent_name || "",
    lender_name: pf.lender_name || tf.lender_name || "",
    lender_email: pf.lender_email || tf.lender_email || "",
    title_company: pf.title_company || tf.closing_title_company || "",
    title_company_email: pf.title_company_email || tf.title_company_email || "",
    seller_email: pf.seller_email || "",
    tc_email: tf.agent_email || "",
    tc_name: tf.agent || "",
    has_inspection_contingency: pf.has_inspection_contingency ?? true,
    has_financing_contingency: pf.has_financing_contingency ?? !tf.is_cash_transaction,
  };
}

// ─── Log Audit Entry ─────────────────────────────────────────────────────────

async function logActivity(base44, transactionId, brokerageId, action, description, actorEmail) {
  await base44.asServiceRole.entities.AuditLog.create({
    transaction_id: transactionId,
    brokerage_id: brokerageId || null,
    actor_email: actorEmail || "atlas",
    action,
    entity_type: "communication",
    entity_id: transactionId,
    description,
  });
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action = "generate", transaction_id, comm_id, parsed_fields, source_document_id, source_document_name } = body;

    if (!transaction_id) return Response.json({ error: "transaction_id is required" }, { status: 400 });

    // Fetch transaction
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const transaction = transactions[0];
    if (!transaction) return Response.json({ error: "Transaction not found" }, { status: 404 });

    // ── PREFLIGHT ────────────────────────────────────────────────────────────
    if (action === "preflight") {
      const data = extractContractData(transaction, parsed_fields || {});
      const preflight = runPreflight(data);
      return Response.json({ preflight, data });
    }

    // ── GENERATE ─────────────────────────────────────────────────────────────
    if (action === "generate" || action === "regenerate") {
      // Delete any existing comm records for this transaction if regenerating
      if (action === "regenerate") {
        const existing = await base44.asServiceRole.entities.CommAutomation.filter({ transaction_id });
        await Promise.all(existing.map(c => base44.asServiceRole.entities.CommAutomation.delete(c.id)));
      }

      const data = extractContractData(transaction, parsed_fields || {});
      const preflight = runPreflight(data);
      const comms = buildAllComms(data, preflight, transaction, source_document_id, source_document_name);

      const created = await Promise.all(
        comms.map(c => base44.asServiceRole.entities.CommAutomation.create(c))
      );

      await logActivity(
        base44, transaction_id, transaction.brokerage_id,
        action === "regenerate" ? "comms_regenerated" : "comms_generated",
        `Atlas generated ${created.length} under-contract communication drafts. Preflight: ${preflight.status}. Issues: ${preflight.issues.length}`,
        user.email
      );

      return Response.json({
        success: true,
        preflight_status: preflight.status,
        issues: preflight.issues,
        comms_created: created.length,
        comms: created,
      });
    }

    // ── SEND (single) ────────────────────────────────────────────────────────
    if (action === "send") {
      if (!comm_id) return Response.json({ error: "comm_id required for send action" }, { status: 400 });

      const comms = await base44.asServiceRole.entities.CommAutomation.filter({ id: comm_id });
      const comm = comms[0];
      if (!comm) return Response.json({ error: "Communication not found" }, { status: 404 });

      if (comm.template_status === "blocked") {
        return Response.json({ error: "Cannot send a blocked communication. Resolve missing fields first.", preflight_issues: comm.preflight_issues }, { status: 422 });
      }

      const isEmail = comm.template_type.includes("email");
      const subject = comm.subject || "(no subject)";
      const body = comm.generated_content || "";

      if (isEmail && comm.recipients?.length) {
        const allRecipients = [...(comm.recipients || []), ...(comm.cc_recipients || [])].filter(Boolean);
        for (const to of allRecipients) {
          await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body });
        }
      }

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.CommAutomation.update(comm_id, {
        template_status: "sent",
        sent_at: now,
        sent_by: user.email,
      });

      await logActivity(
        base44, transaction_id, transaction.brokerage_id,
        "comm_sent",
        `Sent "${comm.template_type}" to ${(comm.recipients || []).join(", ")} — Subject: ${subject}`,
        user.email
      );

      return Response.json({ success: true, sent_at: now, recipients: comm.recipients });
    }

    // ── SEND ALL READY ───────────────────────────────────────────────────────
    if (action === "send_all") {
      const allComms = await base44.asServiceRole.entities.CommAutomation.filter({ transaction_id });
      const toSend = allComms.filter(c => c.template_status === "ready" || c.template_status === "partial");

      const results = [];
      for (const comm of toSend) {
        if (comm.template_status === "blocked") continue;
        const isEmail = comm.template_type.includes("email");
        if (isEmail && comm.recipients?.length) {
          const allR = [...(comm.recipients || []), ...(comm.cc_recipients || [])].filter(Boolean);
          for (const to of allR) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to,
              subject: comm.subject,
              body: comm.generated_content,
            });
          }
        }
        const now = new Date().toISOString();
        await base44.asServiceRole.entities.CommAutomation.update(comm.id, {
          template_status: "sent",
          sent_at: now,
          sent_by: user.email,
        });
        results.push({ id: comm.id, type: comm.template_type, sent_at: now });
      }

      await logActivity(
        base44, transaction_id, transaction.brokerage_id,
        "comms_sent_all",
        `Sent ${results.length} under-contract communications.`,
        user.email
      );

      return Response.json({ success: true, sent: results });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
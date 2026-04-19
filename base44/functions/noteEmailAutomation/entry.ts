import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process note creation
    if (event.type !== "create" || event.entity_name !== "Note") {
      return Response.json({ status: "skip", reason: "not a note creation" });
    }

    const note = data;
    const transaction = await base44.entities.Transaction.filter({ id: note.transaction_id });
    if (!transaction || transaction.length === 0) {
      return Response.json({ status: "skip", reason: "transaction not found" });
    }

    const tx = transaction[0];

    // Only auto-send for "Agent Action" note type
    if (note.note_type !== "agent_action") {
      return Response.json({ status: "skip", reason: "not an agent action note" });
    }

    // Don't duplicate emails
    if (note.email_sent) {
      return Response.json({ status: "skip", reason: "email already sent" });
    }

    // Check if any deadline is within 48 hours
    const now = new Date();
    const deadlines = [
      { date: tx.inspection_deadline, label: "Inspection" },
      { date: tx.appraisal_deadline, label: "Appraisal" },
      { date: tx.financing_deadline, label: "Financing" },
      { date: tx.due_diligence_deadline, label: "Due Diligence" },
      { date: tx.closing_date, label: "Closing" },
    ].filter(d => d.date);

    let urgentDeadline = null;
    let isHighPriority = false;

    for (const deadline of deadlines) {
      const deadlineDate = new Date(deadline.date);
      const hoursUntil = (deadlineDate - now) / (1000 * 60 * 60);

      if (hoursUntil > 0 && hoursUntil <= 48) {
        urgentDeadline = deadline;
        isHighPriority = hoursUntil <= 24;
        break;
      }
    }

    // If no urgent deadline, skip
    if (!urgentDeadline) {
      return Response.json({ status: "skip", reason: "no urgent deadline" });
    }

    // Extract mentioned user from note
    const mentions = note.message.match(/@(\S+)/g) || [];
    if (mentions.length === 0) {
      return Response.json({ status: "skip", reason: "no mentions in note" });
    }

    const firstMention = mentions[0].slice(1); // remove @
    const allUsers = await base44.entities.User.list();
    const mentionedUser = allUsers.find(u =>
      (u.full_name || "").toLowerCase().includes(firstMention.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(firstMention.toLowerCase())
    );

    if (!mentionedUser) {
      return Response.json({ status: "skip", reason: "mentioned user not found" });
    }

    // Send email
    const subject = `Action Needed – ${tx.address}${isHighPriority ? " [HIGH PRIORITY]" : ""}`;
    const transactionLink = `https://app.elitetc.com/#/transactions/${tx.id}`;

    const body = `<p>You were mentioned in a transaction note.</p>
<p><strong>Property:</strong> ${tx.address}</p>
<p><strong>Urgent Deadline:</strong> ${urgentDeadline.label}</p>
<p><strong>Message:</strong></p>
<p>${note.message.replace(/\n/g, "<br>")}</p>
<p><a href="${transactionLink}" style="background:#2563EB;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;font-weight:600;display:inline-block;">View Transaction</a></p>`;

    await base44.integrations.Core.SendEmail({
      to: mentionedUser.email,
      subject,
      body,
    });

    // Update note with send metadata
    await base44.entities.Note.update(note.id, {
      email_sent: true,
      recipient_email: mentionedUser.email,
      sent_timestamp: new Date().toISOString(),
    });

    return Response.json({
      status: "sent",
      recipient: mentionedUser.email,
      deadline: urgentDeadline.label,
      highPriority: isHighPriority,
    });
  } catch (error) {
    console.error("noteEmailAutomation error:", error);
    return Response.json({ status: "error", message: error.message }, { status: 500 });
  }
});
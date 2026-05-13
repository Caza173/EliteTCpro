/**
 * Internal Notification Router
 * Routes alerts ONLY to assigned agents + assigned TC
 * Never sends to external parties (buyers, sellers, lenders, title, inspectors, vendors)
 *
 * Recipients:
 * - assigned_buyer_agent (agent_email, agent_id)
 * - assigned_listing_agent (sellers_agent_email, sellers_agent_id)
 * - assigned_tc_id (transaction coordinator)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const NOTIFICATION_TYPES = {
  DEADLINE_NOTICE: 'deadline_notice',
  DEADLINE_WARNING: 'deadline_warning',
  DEADLINE_CRITICAL: 'deadline_critical',
  COMPLIANCE_ALERT: 'compliance_alert',
  TASK_OVERDUE: 'task_overdue',
};

/**
 * Get internal recipients for a transaction
 * Returns array of {email, name, role, type} objects
 */
async function getInternalRecipients(base44, transaction) {
  const recipients = [];

  // Buyer agent
  if (transaction.agent_email) {
    recipients.push({
      email: transaction.agent_email,
      name: transaction.agent || 'Agent',
      role: 'buyer_agent',
      type: 'TO',
    });
  }

  // Listing agent
  if (transaction.sellers_agent_email) {
    recipients.push({
      email: transaction.sellers_agent_email,
      name: transaction.sellers_agent_name || 'Listing Agent',
      role: 'listing_agent',
      type: 'TO',
    });
  }

  // Transaction Coordinator (always CC)
  if (transaction.assigned_tc_id) {
    try {
      const tc = await base44.entities.User.get(transaction.assigned_tc_id);
      if (tc?.email) {
        recipients.push({
          email: tc.email,
          name: tc.full_name || 'TC',
          role: 'transaction_coordinator',
          type: 'CC',
        });
      }
    } catch (err) {
      console.error(`Failed to fetch TC ${transaction.assigned_tc_id}:`, err.message);
    }
  }

  return recipients;
}

/**
 * Route internal notification
 * type: 'deadline' | 'compliance' | 'task'
 * severity: 'notice' | 'warning' | 'critical'
 */
export async function routeInternalNotification(base44, transaction, notification) {
  const { type, severity, title, body, deadline_field } = notification;

  const recipients = await getInternalRecipients(base44, transaction);
  if (recipients.length === 0) {
    console.log(`No internal recipients for transaction ${transaction.id}`);
    return { sent: 0, recipients: [] };
  }

  // Get brokerage notification rules
  const brokerage = await base44.entities.Brokerage.get(transaction.brokerage_id);
  const rules = brokerage?.notification_rules || {};

  // Check if this notification type is enabled
  const isEnabled = getNotificationEnabled(type, severity, rules);
  if (!isEnabled) {
    console.log(`Notification type ${type}/${severity} disabled`);
    return { sent: 0, recipients: [] };
  }

  const results = {
    sent: 0,
    recipients,
    errors: [],
  };

  // Send via enabled channels
  if (rules.email_alerts_enabled) {
    try {
      await sendEmailNotification(base44, transaction, recipients, {
        title,
        body,
        type,
        severity,
      });
      results.email_sent = true;
    } catch (err) {
      results.errors.push({ channel: 'email', error: err.message });
    }
  }

  if (rules.sns_enabled) {
    try {
      await publishSNSNotification(base44, transaction, recipients, {
        title,
        body,
        type,
        severity,
      });
      results.sns_sent = true;
    } catch (err) {
      results.errors.push({ channel: 'sns', error: err.message });
    }
  }

  // Create in-app notification (always stored for record)
  try {
    for (const recipient of recipients) {
      await base44.entities.InAppNotification.create({
        brokerage_id: transaction.brokerage_id,
        user_email: recipient.email,
        transaction_id: transaction.id,
        title,
        body,
        type,
        severity,
        deadline_field,
      });
    }
    results.inapp_created = true;
  } catch (err) {
    results.errors.push({ channel: 'inapp', error: err.message });
  }

  results.sent = recipients.length;
  return results;
}

function getNotificationEnabled(type, severity, rules) {
  if (type === 'deadline') {
    if (severity === 'notice') return rules.deadline_notice_enabled ?? true;
    if (severity === 'warning') return rules.deadline_warning_enabled ?? true;
    if (severity === 'critical') return rules.deadline_critical_enabled ?? true;
  }
  if (type === 'compliance') return rules.compliance_alerts_enabled ?? true;
  if (type === 'task') return rules.task_reminders_enabled ?? true;
  return true;
}

async function sendEmailNotification(base44, transaction, recipients, notification) {
  const { title, body, severity } = notification;

  const severityBadge = {
    notice: '⏰ Reminder',
    warning: '⚠️ Warning',
    critical: '🚨 Urgent',
  }[severity] || '📬 Notification';

  const to = recipients.filter(r => r.type === 'TO').map(r => r.email).join(',');
  const cc = recipients.filter(r => r.type === 'CC').map(r => r.email).join(',');

  const subject = `[EliteTC] ${severityBadge} - ${title} (${transaction.address})`;

  const htmlBody = `
    <h2 style="color: #0F172A; margin-top: 0;">${title}</h2>
    <p style="color: #475569; line-height: 1.6;">${body}</p>
    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
    <p style="color: #94A3B8; font-size: 12px;">
      <strong>Property:</strong> ${transaction.address}<br>
      <strong>Transaction ID:</strong> ${transaction.id}
    </p>
  `;

  await base44.functions.invoke('sendEmail', {
    to,
    cc,
    subject,
    body: htmlBody,
  });
}

async function publishSNSNotification(base44, transaction, recipients, notification) {
  const { title, body, severity } = notification;

  const recipientList = recipients.map(r => `${r.name} (${r.role})`).join(', ');

  const payload = {
    type: 'internal_transaction_alert',
    transaction_id: transaction.id,
    address: transaction.address,
    title,
    body,
    severity,
    recipients: recipientList,
    timestamp: new Date().toISOString(),
  };

  await base44.functions.invoke('snsService', {
    message: JSON.stringify(payload, null, 2),
    subject: `[Internal Alert] ${title}`,
  });
}

/**
 * Deno endpoint — called by notification engine or manual trigger
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['owner', 'admin', 'tc_lead'].includes(user.role)) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { transaction_id, notification_type, title, body: notifBody, severity = 'warning', deadline_field } = body;

    if (!transaction_id) {
      return Response.json({ error: 'Missing transaction_id' }, { status: 400 });
    }

    const transaction = await base44.entities.Transaction.get(transaction_id);
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Verify user has access to this transaction
    if (transaction.brokerage_id !== user.brokerage_id && user.role !== 'owner') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await routeInternalNotification(base44, transaction, {
      type: notification_type,
      severity,
      title: title || 'Transaction Alert',
      body: notifBody || '',
      deadline_field,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
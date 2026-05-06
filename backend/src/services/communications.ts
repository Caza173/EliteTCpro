import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { commAutomations, transactions } from '../db/schema.js';
import { serializeCommAutomation, serializeTransaction } from '../lib/serializers.js';
import { sendEmail } from './email/index.js';

function fmt(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function fmtPrice(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (Number.isNaN(numeric)) return String(value);
  return `$${numeric.toLocaleString('en-US')}`;
}

function fmtDate(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function buildBuyerEmail(data: Record<string, unknown>) {
  const body = `Hi ${fmt(data.buyer_name, 'there')},

You're officially under contract.

Property: ${fmt(data.property_address)}
Purchase Price: ${fmtPrice(data.purchase_price)}
Closing Date: ${fmtDate(data.closing_date)}

Next steps:
${data.earnest_money_amount || data.earnest_money_due_date ? `\nEarnest Money\n- Amount: ${fmtPrice(data.earnest_money_amount)}\n- Due: ${fmtDate(data.earnest_money_due_date)}` : ''}
${data.has_inspection_contingency !== false && data.inspection_deadline ? `\nInspections\n- Schedule as soon as possible\n- Deadline: ${fmtDate(data.inspection_deadline)}` : ''}
${data.has_financing_contingency !== false && data.financing_deadline ? `\nFinancing\n- Submit any remaining lender documents\n- Commitment date: ${fmtDate(data.financing_deadline)}` : ''}

We'll keep everything on track and let you know as each milestone is completed.

-${fmt(data.buyer_agent_name, 'Your Agent')}`;

  return {
    subject: `Under Contract – ${fmt(data.property_address)}`,
    body: body.trim(),
  };
}

function buildSellerEmail(data: Record<string, unknown>) {
  const timelineLines = [
    data.earnest_money_due_date ? `Earnest money due: ${fmtDate(data.earnest_money_due_date)}` : null,
    data.has_inspection_contingency !== false && data.inspection_deadline ? `Inspection deadline: ${fmtDate(data.inspection_deadline)}` : null,
    data.has_financing_contingency !== false && data.financing_deadline ? `Financing deadline: ${fmtDate(data.financing_deadline)}` : null,
  ].filter(Boolean);

  const body = `Hi ${fmt(data.seller_name, 'there')},

Your property is now under contract.

Property: ${fmt(data.property_address)}
Contract Price: ${fmtPrice(data.purchase_price)}
Closing Date: ${fmtDate(data.closing_date)}

Buyer timeline:
${timelineLines.join('\n')}

We will review inspections, repair requests, and any lender/title updates together as they arrive.

-${fmt(data.listing_agent_name, 'Your Agent')}`;

  return {
    subject: `Under Contract – ${fmt(data.property_address)}`,
    body: body.trim(),
  };
}

function buildLenderTitleEmail(data: Record<string, unknown>) {
  const keyDates = [
    data.has_inspection_contingency !== false && data.inspection_deadline ? `Inspection deadline: ${fmtDate(data.inspection_deadline)}` : null,
    data.has_financing_contingency !== false && data.financing_deadline ? `Financing deadline: ${fmtDate(data.financing_deadline)}` : null,
  ].filter(Boolean);

  const body = `Hi ${[data.lender_name, data.title_company].filter(Boolean).join(' and ') || 'Team'},

We are under contract on the following:

Property: ${fmt(data.property_address)}
Purchase Price: ${fmtPrice(data.purchase_price)}
Closing Date: ${fmtDate(data.closing_date)}

Buyer: ${fmt(data.buyer_name)}
Seller: ${fmt(data.seller_name)}

Key dates:
${keyDates.join('\n') || 'Please confirm dates upon receipt.'}

Please confirm receipt and let us know if anything is needed at this stage.`;

  return {
    subject: `New Under Contract – ${fmt(data.property_address)}`,
    body: body.trim(),
  };
}

function buildTaskTriggeredEmail(templateType: string, data: Record<string, unknown>) {
  const address = fmt(data.property_address);
  const buyerName = fmt(data.buyer_name, 'there');
  const lenderName = fmt(data.lender_name, 'your lender');
  const earnestMoneyAmount = fmtPrice(data.earnest_money_amount);
  const earnestMoneyDueDate = fmtDate(data.earnest_money_due_date);
  const appraisalDeadline = fmtDate(data.appraisal_deadline);
  const inspectionDeadline = fmtDate(data.inspection_deadline);

  const builders: Record<string, { subject: string; body: string }> = {
    earnest_money_submitted_email: {
      subject: `Earnest Money Submitted – ${address}`,
      body: `Dear ${buyerName},\n\nThe earnest money deposit${earnestMoneyAmount ? ` of ${earnestMoneyAmount}` : ''} for ${address} has been submitted to ${lenderName}.\n\nBest regards`,
    },
    earnest_money_confirmed_email: {
      subject: `Earnest Money Confirmed – ${address}`,
      body: `Dear ${buyerName},\n\nWe are pleased to confirm receipt of your earnest money deposit${earnestMoneyAmount ? ` of ${earnestMoneyAmount}` : ''}${earnestMoneyDueDate ? ` on ${earnestMoneyDueDate}` : ''}.\n\nBest regards`,
    },
    inspection_scheduled_email: {
      subject: `Inspection Scheduled – ${address}`,
      body: `Dear ${buyerName},\n\nYour home inspection has been scheduled for ${address}.${inspectionDeadline ? ` Deadline: ${inspectionDeadline}.` : ''}\n\nBest regards`,
    },
    inspection_completed_email: {
      subject: `Inspection Completed – Next Steps – ${address}`,
      body: `Dear ${buyerName},\n\nThe inspection for ${address} has been completed. Please review the report and let us know if you have any questions.\n\nBest regards`,
    },
    appraisal_ordered_email: {
      subject: `Appraisal Ordered – ${address}`,
      body: `Dear ${buyerName},\n\n${lenderName} has ordered the appraisal for ${address}. The appraiser will contact you to schedule access if needed.\n\nBest regards`,
    },
    appraisal_scheduled_email: {
      subject: `Appraisal Scheduled – ${address}`,
      body: `Dear ${buyerName},\n\nThe appraisal for ${address} has been scheduled${appraisalDeadline ? ` for ${appraisalDeadline}` : ''}.\n\nBest regards`,
    },
    appraisal_completed_email: {
      subject: `Appraisal Completed – ${address}`,
      body: `Dear ${buyerName},\n\nThe appraisal for ${address} has been completed and submitted to ${lenderName}.\n\nBest regards`,
    },
  };

  return builders[templateType];
}

export function extractContractData(transaction: Record<string, unknown>) {
  const buyers = Array.isArray(transaction.buyers) && transaction.buyers.length > 0
    ? transaction.buyers
    : transaction.buyer
      ? [transaction.buyer]
      : [];
  const sellers = Array.isArray(transaction.sellers) && transaction.sellers.length > 0
    ? transaction.sellers
    : transaction.seller
      ? [transaction.seller]
      : [];

  return {
    buyer_name: buyers.filter(Boolean).join(' & '),
    seller_name: sellers.filter(Boolean).join(' & '),
    property_address: transaction.address || '',
    purchase_price: transaction.sale_price || null,
    earnest_money_amount: transaction.earnest_money_amount || null,
    earnest_money_due_date: transaction.earnest_money_deadline || null,
    closing_date: transaction.closing_date || null,
    inspection_deadline: transaction.inspection_deadline || null,
    financing_deadline: transaction.financing_deadline || null,
    due_diligence_deadline: transaction.due_diligence_deadline || null,
    buyer_agent_name: transaction.buyers_agent_name || transaction.agent || '',
    listing_agent_name: transaction.sellers_agent_name || '',
    lender_name: transaction.lender_name || '',
    lender_email: transaction.lender_email || '',
    title_company: transaction.closing_title_company || '',
    title_company_email: transaction.title_company_email || '',
    seller_email: transaction.seller_email || '',
    tc_email: transaction.agent_email || '',
    tc_name: transaction.agent || '',
    has_inspection_contingency: transaction.has_inspection_contingency ?? true,
    has_financing_contingency: transaction.has_financing_contingency ?? !transaction.is_cash_transaction,
  } as Record<string, unknown>;
}

export function runCommPreflight(data: Record<string, unknown>) {
  const issues: Array<Record<string, string>> = [];
  const requireField = (field: string, label: string, section: string, requiredFor: string) => {
    if (!data[field]) {
      issues.push({ severity: 'blocking', field, label, section, message: `Missing ${label} from ${section}`, required_for: requiredFor });
    }
  };
  const warnField = (field: string, label: string, section: string, requiredFor: string) => {
    if (!data[field]) {
      issues.push({ severity: 'warning', field, label, section, message: `Missing ${label} from ${section}`, required_for: requiredFor });
    }
  };

  requireField('buyer_name', 'Buyer Name', 'P&S Header / Parties Section', 'buyer_email,seller_email,lender_email');
  requireField('property_address', 'Property Address', 'P&S Header', 'all');
  warnField('seller_name', 'Seller Name', 'P&S Header / Parties Section', 'seller_email,lender_email');
  warnField('purchase_price', 'Purchase Price', 'P&S Section 3', 'all');
  warnField('closing_date', 'Closing Date', 'P&S Section 5 – Transfer of Title', 'all');

  const blockingIssues = issues.filter((issue) => issue.severity === 'blocking');
  const warningIssues = issues.filter((issue) => issue.severity === 'warning');
  const status = blockingIssues.length > 0 ? 'BLOCKED' : warningIssues.length > 0 ? 'PARTIAL' : 'READY';

  return { status, issues, blockingIssues, warningIssues };
}

export async function generateCommAutomations(userId: string, transactionId: string, replaceExisting = false) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.ownerId, userId)))
    .limit(1);

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  if (replaceExisting) {
    await db.delete(commAutomations).where(and(eq(commAutomations.transactionId, transactionId), eq(commAutomations.ownerId, userId)));
  }

  const serializedTransaction = serializeTransaction(transaction) as Record<string, unknown>;
  const data = extractContractData(serializedTransaction);
  const preflight = runCommPreflight(data);
  const buyerRecipients = Array.isArray(serializedTransaction.client_emails) && serializedTransaction.client_emails.length > 0
    ? serializedTransaction.client_emails.filter(Boolean)
    : [serializedTransaction.client_email].filter(Boolean);
  const agentEmail = typeof serializedTransaction.agent_email === 'string' ? serializedTransaction.agent_email : null;

  const records = [
    {
      template_type: 'buyer_under_contract_email',
      ...buildBuyerEmail(data),
      recipients: buyerRecipients,
      cc_recipients: [agentEmail].filter(Boolean),
    },
    {
      template_type: 'seller_under_contract_email',
      ...buildSellerEmail(data),
      recipients: [data.seller_email].filter(Boolean),
      cc_recipients: [agentEmail].filter(Boolean),
    },
    {
      template_type: 'lender_title_intro_email',
      ...buildLenderTitleEmail(data),
      recipients: [data.lender_email, data.title_company_email].filter(Boolean),
      cc_recipients: [agentEmail].filter(Boolean),
    },
    ...[
      'earnest_money_submitted_email',
      'earnest_money_confirmed_email',
      'inspection_scheduled_email',
      'inspection_completed_email',
      'appraisal_ordered_email',
      'appraisal_scheduled_email',
      'appraisal_completed_email',
    ].map((templateType) => ({
      template_type: templateType,
      ...buildTaskTriggeredEmail(templateType, data),
      recipients: buyerRecipients,
      cc_recipients: [],
    })),
  ];

  const inserted = await db
    .insert(commAutomations)
    .values(
      records.map((record) => ({
        ownerId: userId,
        transactionId,
        templateType: record.template_type,
        templateStatus: preflight.status === 'BLOCKED' ? 'blocked' : preflight.status === 'PARTIAL' ? 'partial' : 'ready',
        subject: record.subject,
        generatedContent: record.body,
        data: {
          recipients: record.recipients,
          cc_recipients: record.cc_recipients,
          contract_data_snapshot: data,
          preflight_status: preflight.status,
          preflight_issues: preflight.issues,
          missing_fields: preflight.issues.map((issue) => ({
            field: issue.field,
            label: issue.label,
            section: issue.section,
            required_for: issue.required_for,
          })),
          source_sections_used: ['Section 3', 'Section 5', 'Section 15', 'Section 16'],
        },
      }))
    )
    .returning();

  return inserted.map(serializeCommAutomation);
}

export async function sendCommAutomation(comm: Record<string, unknown>, actorEmail: string) {
  if (comm.template_status === 'blocked') {
    throw new Error('Cannot send a blocked communication');
  }

  const recipients = Array.isArray(comm.recipients) ? comm.recipients.filter(Boolean) : [];
  const ccRecipients = Array.isArray(comm.cc_recipients) ? comm.cc_recipients.filter(Boolean) : [];

  if (recipients.length === 0 && ccRecipients.length === 0) {
    throw new Error('Communication has no recipients');
  }

  await sendEmail({
    to: recipients.length > 0 ? recipients : ccRecipients,
    cc: recipients.length > 0 ? ccRecipients : [],
    subject: String(comm.subject || ''),
    text: typeof comm.generated_content === 'string' ? comm.generated_content : undefined,
    metadata: {
      transactionId: comm.transaction_id,
      commAutomationId: comm.id,
      workflow: 'under-contract-automation',
    },
  });

  const [updated] = await db
    .update(commAutomations)
    .set({
      templateStatus: 'sent',
      sentAt: new Date(),
      sentBy: actorEmail,
      data: {
        ...(comm as Record<string, unknown>),
        recipients,
        cc_recipients: ccRecipients,
      },
    })
    .where(eq(commAutomations.id, String(comm.id)))
    .returning();

  return serializeCommAutomation(updated);
}
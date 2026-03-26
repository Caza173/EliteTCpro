import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileSignature, AlertCircle, Loader2 } from "lucide-react";
import EmailComposerModal from "./EmailComposerModal";
import { format, parseISO } from "date-fns";

const NP = "Not Provided";
const fmt = (v) => v || NP;
const fmtPrice = (v) => (v ? `$${Number(v).toLocaleString()}` : NP);
const fmtDate = (v) => {
  if (!v) return NP;
  try { return format(parseISO(v), "MMMM d, yyyy"); } catch { return v; }
};

// Validation: returns array of missing field labels
function validateTransaction(tx) {
  const missing = [];
  if (!tx.address) missing.push("Property Address");
  const buyers = tx.buyers?.length ? tx.buyers : (tx.buyer ? [tx.buyer] : []);
  if (!buyers.length) missing.push("Buyer Name(s)");
  if (!tx.sale_price) missing.push("Purchase Price");
  if (!tx.contract_date) missing.push("Effective Date");
  if (!tx.closing_date) missing.push("Closing Date");
  return missing;
}

function buildHTML(tx, contingencies, currentUser) {
  const buyers = tx.buyers?.length ? tx.buyers : (tx.buyer ? [tx.buyer] : []);
  const sellers = tx.sellers?.length ? tx.sellers : (tx.seller ? [tx.seller] : []);
  const buyerNames = buyers.join(", ") || NP;
  const sellerNames = sellers.join(", ") || NP;

  const lenderName = tx.lender_name || "Lender";
  const titleName = tx.closing_title_company || tx.title_company_contact_name || "Title Company";

  // Inspections: pull from contingencies array (type = "Inspection")
  const inspections = (contingencies || []).filter(c => c.contingency_type === "Inspection" && c.is_active !== false);

  // Financing / Appraisal from contingencies
  const financingC = (contingencies || []).find(c => c.contingency_type === "Financing" && c.is_active !== false && c.due_date);
  const appraisalC = (contingencies || []).find(c => c.contingency_type === "Appraisal" && c.is_active !== false && c.due_date);
  // Also fall back to transaction fields
  const financingDate = financingC?.due_date || tx.financing_deadline;
  const appraisalDate = appraisalC?.due_date || tx.appraisal_deadline;

  const earnestMoney = tx.earnest_money_amount || tx.sale_price ? null : null; // not a standard field, use note
  const earnestDeadline = tx.earnest_money_deadline;

  const senderName = currentUser?.full_name || tx.buyers_agent_name || NP;
  const senderEmail = currentUser?.email || tx.agent_email || NP;
  const senderPhone = currentUser?.data?.phone || NP;

  const divider = `<tr><td colspan="2"><hr style="border:none;border-top:1px solid #E2E8F0;margin:0;"/></td></tr>`;

  const row = (label, value) =>
    `<tr>
      <td style="padding:6px 16px 6px 0;color:#64748B;font-size:13px;white-space:nowrap;vertical-align:top;width:42%;">${label}</td>
      <td style="padding:6px 0;color:#0F172A;font-size:13px;font-weight:500;">${value}</td>
    </tr>`;

  const sectionHeader = (title) =>
    `<tr><td colspan="2" style="padding:16px 0 6px;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748B;">${title}</p>
    </td></tr>`;

  // Build inspections block
  let inspectionsBlock = "";
  if (inspections.length > 0) {
    inspectionsBlock = inspections.map(c => {
      const label = c.sub_type || "Inspection";
      const date = c.due_date ? fmtDate(c.due_date) : NP;
      return row(label, date);
    }).join("");
  } else {
    inspectionsBlock = `<tr><td colspan="2" style="padding:6px 0;color:#94A3B8;font-size:13px;font-style:italic;">No inspections specified</td></tr>`;
  }

  // Financing / Appraisal block
  let contingencyBlock = "";
  if (financingDate) {
    contingencyBlock += row("Financing Contingency", fmtDate(financingDate));
  }
  if (appraisalDate) {
    contingencyBlock += row("Appraisal", fmtDate(appraisalDate));
  }
  if (!financingDate && !appraisalDate) {
    contingencyBlock = `<tr><td colspan="2" style="padding:6px 0;color:#94A3B8;font-size:13px;font-style:italic;">No financing or appraisal contingencies specified</td></tr>`;
  }

  return `
<div style="font-family:Arial,Inter,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1E293B;line-height:1.6;font-size:14px;">

  <!-- Header Banner -->
  <div style="background:linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%);border-radius:12px;padding:24px;margin-bottom:28px;text-align:center;">
    <div style="display:inline-block;background:rgba(37,99,235,0.25);border-radius:8px;padding:6px 16px;margin-bottom:10px;">
      <span style="color:#93C5FD;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Under Contract</span>
    </div>
    <h1 style="color:#FFFFFF;font-size:20px;margin:0 0 4px;font-weight:700;">${tx.address || "Property Address"}</h1>
    <p style="color:#94A3B8;margin:0;font-size:13px;">Notification to Lender &amp; Title</p>
  </div>

  <!-- Greeting -->
  <p style="margin:0 0 6px;color:#1E293B;">Hi <strong>${lenderName}</strong> and <strong>${titleName}</strong>,</p>
  <p style="margin:0 0 24px;color:#475569;">The following property is now <strong>under contract</strong>. Please review the details below and confirm receipt at your earliest convenience.</p>

  <table style="width:100%;border-collapse:collapse;">

    ${sectionHeader("Property")}
    ${row("Address", fmt(tx.address))}

    ${divider}
    ${sectionHeader("Buyer(s)")}
    ${row("Name(s)", buyerNames)}
    ${row("Phone", fmt(tx.client_phone))}
    ${row("Email", (() => { const emails = tx.client_emails?.length ? tx.client_emails.join(", ") : tx.client_email; return fmt(emails); })())}

    ${divider}
    ${sectionHeader("Seller(s)")}
    ${row("Name(s)", sellerNames)}

    ${divider}
    ${sectionHeader("Key Contract Terms")}
    ${row("Purchase Price", fmtPrice(tx.sale_price))}
    ${row("Effective / Acceptance Date", fmtDate(tx.contract_date))}
    ${row("Closing Date", fmtDate(tx.closing_date))}
    ${earnestDeadline ? row("Earnest Money Due", fmtDate(earnestDeadline)) : ""}

    ${divider}
    ${sectionHeader("Inspection Deadlines")}
    ${inspectionsBlock}

    ${divider}
    ${sectionHeader("Financing / Appraisal")}
    ${contingencyBlock}

    ${divider}
    ${sectionHeader("Agent Contacts")}
    ${row("Buyer Agent", `${fmt(tx.buyers_agent_name)}<br/><span style="color:#64748B;font-weight:400;">${fmt(tx.buyers_agent_phone)}</span><br/><span style="color:#64748B;font-weight:400;">${fmt(tx.buyers_agent_email)}</span>`)}
    ${row("Listing Agent", `${fmt(tx.sellers_agent_name)}<br/><span style="color:#64748B;font-weight:400;">${fmt(tx.sellers_agent_phone)}</span><br/><span style="color:#64748B;font-weight:400;">${fmt(tx.sellers_agent_email)}</span>`)}

  </table>

  <!-- CTA -->
  <div style="margin:28px 0 24px;padding:16px 20px;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:10px;">
    <p style="margin:0;font-size:13px;color:#0369A1;font-weight:600;">Next Steps</p>
    <ul style="margin:8px 0 0;padding:0 0 0 16px;color:#0369A1;font-size:13px;line-height:1.8;">
      <li>Please <strong>confirm receipt</strong> of this notification.</li>
      <li><strong>Title:</strong> Begin title search and confirm closing scheduling.</li>
      <li><strong>Lender:</strong> Proceed with loan processing and provide status updates at each milestone.</li>
    </ul>
  </div>

  <p style="margin:0 0 20px;color:#64748B;font-size:13px;">Please don't hesitate to reach out if anything further is needed.</p>

  <!-- Sender signature -->
  <div style="border-top:1px solid #E2E8F0;padding-top:16px;margin-top:4px;">
    <p style="margin:0;color:#1E293B;font-size:13px;line-height:1.8;">
      <strong>${senderName}</strong><br/>
      ${senderPhone !== NP ? `${senderPhone}<br/>` : ""}
      ${senderEmail !== NP ? `<a href="mailto:${senderEmail}" style="color:#2563EB;">${senderEmail}</a>` : ""}
    </p>
  </div>

</div>`;
}

export default function UnderContractEmailButton({ transaction, currentUser, documents = [] }) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [emailData, setEmailData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  const handleClick = async () => {
    // Validate required fields
    const missing = validateTransaction(transaction);
    if (missing.length > 0) {
      setValidationErrors(missing);
      return;
    }
    setValidationErrors([]);
    setLoading(true);

    // Fetch contingencies
    let contingencies = [];
    try {
      contingencies = await base44.entities.Contingency.filter({ transaction_id: transaction.id });
    } catch (_) {}

    const htmlBody = buildHTML(transaction, contingencies, currentUser);

    // Recipients: lender + title
    const to = [tx.lender_email, tx.title_company_email].filter(Boolean);
    // Auto-select P&S document
    const psDoc = documents.find(d => d.doc_type === "purchase_and_sale");

    setEmailData({
      to,
      subject: `Under Contract – ${transaction.address}`,
      htmlBody,
      preselectedDocId: psDoc?.id,
    });

    setLoading(false);
    setModalOpen(true);
  };

  const tx = transaction;

  return (
    <>
      {/* Validation error banner */}
      {validationErrors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white border border-red-200 rounded-xl shadow-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Complete required fields before sending:</p>
              <ul className="mt-1 space-y-0.5">
                {validationErrors.map(f => (
                  <li key={f} className="text-xs text-red-600">• {f}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setValidationErrors([])} className="ml-auto text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
        onClick={handleClick}
        disabled={loading}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Building…</>
          : <><FileSignature className="w-4 h-4 mr-1" /> Under Contract Email</>
        }
      </Button>

      {modalOpen && emailData && (
        <EmailComposerModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          transaction={transaction}
          defaultRecipients={emailData.to}
          defaultSubject={emailData.subject}
          htmlBody={emailData.htmlBody}
          documents={documents}
          preselectedDocId={emailData.preselectedDocId}
        />
      )}
    </>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSignature } from "lucide-react";
import EmailComposerModal from "./EmailComposerModal";

const NP = "Not Provided";
const fmt = (v) => v || NP;
const fmtPrice = (v) => (v ? `$${Number(v).toLocaleString()}` : NP);
const fmtDate = (v) => {
  if (!v) return NP;
  const d = new Date(v);
  return isNaN(d) ? v : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

function buildUnderContractHTML(tx, currentUser) {
  const buyerNames = tx.buyers?.length ? tx.buyers.join(", ") : fmt(tx.buyer);
  const sellerNames = tx.sellers?.length ? tx.sellers.join(", ") : fmt(tx.seller);

  const senderName = currentUser?.full_name || NP;
  const senderEmail = currentUser?.email || NP;
  const senderPhone = currentUser?.data?.phone || NP;
  const senderCompany = currentUser?.data?.company || "EliteTC";

  const divider = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>`;

  const row = (label, value) =>
    `<tr>
      <td style="padding:5px 12px 5px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top;width:45%;">${label}</td>
      <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:500;">${value}</td>
    </tr>`;

  const section = (title, rows) => `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">${title}</p>
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
    </div>`;

  const agentBlock = (label, name, company, phone, email) => `
    <div style="margin-bottom:12px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1e293b;">${label}</p>
      <p style="margin:0;font-size:13px;color:#475569;line-height:1.7;">
        ${fmt(name)}<br/>
        ${fmt(company)}<br/>
        ${fmt(phone)}<br/>
        ${fmt(email)}
      </p>
    </div>`;

  return `
<div style="font-family:Arial,Inter,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;font-size:14px;">
  <div style="background:#0f172a;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
    <h1 style="color:#ffffff;font-size:22px;margin:0 0 4px;">Under Contract</h1>
    <p style="color:#94a3b8;margin:0;font-size:13px;">${fmt(tx.address)}</p>
  </div>

  <p style="margin:0 0 16px;">Hi Team,</p>
  <p style="margin:0 0 20px;color:#475569;">
    The property below is now <strong>under contract</strong>. Please see the key details and contact information below to begin processing.
  </p>

  ${divider}
  ${section("Transaction Overview", [
    row("Property Address", fmt(tx.address)),
    row("Purchase Price", fmtPrice(tx.sale_price)),
    row("Effective Date", fmtDate(tx.contract_date)),
    row("Closing Date", fmtDate(tx.closing_date)),
    row("Cash Transaction", tx.is_cash_transaction ? "Yes" : "No"),
  ].join(""))}

  ${divider}
  ${section("Buyer Information", [
    row("Name(s)", buyerNames),
    row("Phone", fmt(tx.client_phone)),
    row("Email", tx.client_emails?.length ? tx.client_emails.join(", ") : fmt(tx.client_email)),
  ].join(""))}

  ${divider}
  ${section("Seller Information", [
    row("Name(s)", sellerNames),
    row("Phone", fmt(tx.sellerPhone)),
    row("Email", fmt(tx.sellerEmail)),
  ].join(""))}

  ${divider}
  <div style="margin-bottom:20px;">
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Agent Information</p>
    ${agentBlock("Buyer's Agent", tx.buyers_agent_name, tx.buyer_brokerage, tx.buyers_agent_phone, tx.buyers_agent_email)}
    ${agentBlock("Seller's Agent / Listing Agent", tx.sellers_agent_name, tx.seller_brokerage, tx.sellers_agent_phone, tx.sellers_agent_email)}
  </div>

  ${divider}
  <div style="margin-bottom:20px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Next Steps</p>
    <ul style="margin:0;padding:0 0 0 16px;color:#1e293b;">
      <li style="margin-bottom:6px;">Please <strong>confirm receipt</strong> of this email.</li>
      <li style="margin-bottom:6px;"><strong>Title:</strong> Please begin title work and confirm closing scheduling.</li>
      <li style="margin-bottom:6px;"><strong>Lender:</strong> Please proceed with loan processing and provide status updates as milestones are reached.</li>
    </ul>
  </div>

  ${divider}
  <p style="margin:0 0 20px;color:#64748b;font-size:13px;">Let me know if anything further is needed.</p>
  <p style="margin:0;color:#475569;font-size:13px;line-height:1.8;">
    <strong>${senderName}</strong><br/>
    ${senderCompany}<br/>
    ${senderPhone}<br/>
    ${senderEmail}
  </p>
</div>`;
}

export default function UnderContractEmailButton({ transaction, currentUser, documents = [] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [emailData, setEmailData] = useState(null);

  const handleClick = async () => {
    // Build recipients
    const to = [tx.lender_email, tx.title_company_email].filter(Boolean);
    const cc = [tx.buyers_agent_email, tx.sellers_agent_email].filter(Boolean);

    const subject = tx.address
      ? `Under Contract – ${tx.address}`
      : "Under Contract Notification";

    const htmlBody = buildUnderContractHTML(transaction, currentUser);

    // Auto-select the P&S document if available
    const psDoc = documents.find(d => d.doc_type === "purchase_and_sale");
    const preselectedDocId = psDoc?.id;

    setEmailData({ to, cc, subject, htmlBody, preselectedDocId });
    setModalOpen(true);
  };

  const tx = transaction;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
        onClick={handleClick}
      >
        <FileSignature className="w-4 h-4 mr-1" />
        Under Contract Email
      </Button>

      {modalOpen && emailData && (
        <UnderContractModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          transaction={transaction}
          currentUser={currentUser}
          documents={documents}
          emailData={emailData}
        />
      )}
    </>
  );
}

// Thin wrapper that passes pre-built data into EmailComposerModal
function UnderContractModal({ open, onClose, transaction, currentUser, documents, emailData }) {
  return (
    <EmailComposerModal
      open={open}
      onClose={onClose}
      transaction={transaction}
      defaultRecipients={emailData.to}
      defaultSubject={emailData.subject}
      defaultBody={emailData.htmlBody}
      documents={documents}
      preselectedDocId={emailData.preselectedDocId}
    />
  );
}
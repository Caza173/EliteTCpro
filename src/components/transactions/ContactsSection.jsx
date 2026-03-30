import React, { useState } from "react";
import ContactCard from "./ContactCard";
import { hasFullAccess } from "../auth/useCurrentUser";
import { base44 } from "@/api/base44Client";
import QuickEmailModal from "./QuickEmailModal";

const GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "8px",
  alignItems: "start",
};

function SectionGroup({ title, children }) {
  const cards = React.Children.toArray(children).filter(c => c && c.type !== undefined);
  if (cards.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{title}</p>
      <div style={GRID}>{cards}</div>
    </div>
  );
}

export default function ContactsSection({ transaction, onUpdate, currentUser }) {
  const tx = transaction;
  const canEdit = hasFullAccess(currentUser);
  const [emailModal, setEmailModal] = useState(null); // { to, toName }

  const openEmail = (to, toName) => setEmailModal({ to, toName });

  const buyers = tx.buyers?.length ? tx.buyers : (tx.buyer ? [tx.buyer] : []);
  const sellers = tx.sellers?.length ? tx.sellers : (tx.seller ? [tx.seller] : []);
  const clientEmails = tx.client_emails?.length ? tx.client_emails : (tx.client_email ? [tx.client_email] : []);

  const hasLender    = tx.lender_name || tx.lender_email || tx.lender_phone;
  const hasTitle     = tx.title_company_contact_name || tx.closing_title_company || tx.title_company_email;
  const hasInspector = tx.inspector_name || tx.inspector_email || tx.inspector_phone;
  const hasAttorney  = tx.attorney_name || tx.attorney_email || tx.attorney_phone;
  const hasAppraiser = tx.appraiser_name || tx.appraiser_email || tx.appraiser_phone;

  // Direct entity save to avoid RLS/backend-function timing issues
  const save = async (data) => {
    if (onUpdate) onUpdate(data);
    await base44.entities.Transaction.update(tx.id, data);
  };

  return (
    <div className="space-y-4">
      {emailModal && (
        <QuickEmailModal
          to={emailModal.to}
          toName={emailModal.toName}
          transaction={tx}
          onClose={() => setEmailModal(null)}
        />
      )}

      {/* Buyers */}
      {buyers.length > 0 && (
        <SectionGroup title="Buyers">
          {buyers.map((name, i) => (
            <ContactCard
              key={i}
              name={name}
              role="Buyer"
              email={clientEmails[i] || ""}
              phone={i === 0 ? (tx.client_phone || "") : ""}
              accent="#2563EB"
              canEdit={canEdit}
              onEmailClick={openEmail}
              fields={{ name: true, email: true, phone: true, company: false }}
              onSave={({ name: n, email: e, phone: p }) => {
                const newBuyers = [...buyers];
                newBuyers[i] = n;
                const newEmails = [...clientEmails];
                newEmails[i] = e;
                save({
                  buyers: newBuyers,
                  buyer: newBuyers[0] || "",
                  client_emails: newEmails,
                  client_email: newEmails[0] || "",
                  ...(i === 0 && { client_phone: p }),
                });
              }}
            />
          ))}
        </SectionGroup>
      )}

      {/* Sellers */}
      {sellers.length > 0 && (
        <SectionGroup title="Sellers">
          {sellers.map((name, i) => (
            <ContactCard
              key={i}
              name={name}
              role="Seller"
              accent="#16a34a"
              canEdit={canEdit}
              fields={{ name: true, email: false, phone: false, company: false }}
              onSave={({ name: n }) => {
                const newSellers = [...sellers];
                newSellers[i] = n;
                save({ sellers: newSellers, seller: newSellers[0] || "" });
              }}
            />
          ))}
        </SectionGroup>
      )}

      {/* Agents */}
      {(tx.buyers_agent_name || tx.sellers_agent_name || tx.agent) && (
        <SectionGroup title="Agents">
          {tx.buyers_agent_name && (
            <ContactCard
              name={tx.buyers_agent_name}
              role="Buyer's Agent"
              email={tx.buyers_agent_email}
              phone={tx.buyers_agent_phone}
              company={tx.buyer_brokerage}
              accent="#7c3aed"
              canEdit={canEdit}
              onEmailClick={openEmail}
              fields={{ name: true, email: true, phone: true, company: true }}
              onSave={({ name, email, phone, company }) => save({
                buyers_agent_name: name,
                buyers_agent_email: email,
                buyers_agent_phone: phone,
                buyer_brokerage: company,
              })}
            />
          )}
          {tx.sellers_agent_name && (
            <ContactCard
              name={tx.sellers_agent_name}
              role="Seller's Agent"
              email={tx.sellers_agent_email}
              phone={tx.sellers_agent_phone}
              company={tx.seller_brokerage}
              accent="#7c3aed"
              canEdit={canEdit}
              onEmailClick={openEmail}
              fields={{ name: true, email: true, phone: true, company: true }}
              onSave={({ name, email, phone, company }) => save({
                sellers_agent_name: name,
                sellers_agent_email: email,
                sellers_agent_phone: phone,
                seller_brokerage: company,
              })}
            />
          )}
          {tx.agent && (
            <ContactCard
              name={tx.agent}
              role="Transaction Coordinator"
              email={tx.agent_email}
              company={tx.agent_company}
              accent="#0891b2"
              canEdit={canEdit}
              onEmailClick={openEmail}
              fields={{ name: true, email: true, phone: false, company: true }}
              onSave={({ name, email, company }) => save({
                agent: name,
                agent_email: email,
                agent_company: company,
              })}
            />
          )}
        </SectionGroup>
      )}

      {/* Service Providers */}
      {(hasLender || hasTitle || hasInspector || hasAttorney || hasAppraiser) && (
        <SectionGroup title="Service Providers">
          {hasLender && (
            <ContactCard
              name={tx.lender_name}
              role="Lender"
              email={tx.lender_email}
              phone={tx.lender_phone}
              company={tx.lender_company}
              accent="#d97706"
              canEdit={canEdit}
              onEmailClick={openEmail}
              fields={{ name: true, email: true, phone: true, company: true }}
              onSave={({ name, email, phone, company }) => save({
                lender_name: name,
                lender_email: email,
                lender_phone: phone,
                lender_company: company,
              })}
            />
          )}
          {hasTitle && (
            <ContactCard
              name={tx.title_company_contact_name || tx.closing_title_company}
              role="Title Company"
              email={tx.title_company_email}
              phone={tx.title_company_phone}
              company={tx.closing_title_company && tx.title_company_contact_name ? tx.closing_title_company : undefined}
              accent="#db2777"
              canEdit={canEdit}
              onEmailClick={openEmail}
              fields={{ name: true, email: true, phone: true, company: true }}
              onSave={({ name, email, phone, company }) => save({
                title_company_contact_name: name,
                title_company_email: email,
                title_company_phone: phone,
                closing_title_company: company,
              })}
            />
          )}
          {hasInspector && (
            <ContactCard
              name={tx.inspector_name}
              role="Inspector"
              email={tx.inspector_email}
              phone={tx.inspector_phone}
              company={tx.inspector_company}
              accent="#059669"
              canEdit={canEdit}
              onEmailClick={openEmail}
              fields={{ name: true, email: true, phone: true, company: true }}
              onSave={({ name, email, phone, company }) => save({
                inspector_name: name,
                inspector_email: email,
                inspector_phone: phone,
                inspector_company: company,
              })}
            />
          )}
          {hasAppraiser && (
            <ContactCard
              name={tx.appraiser_name}
              role="Appraiser"
              email={tx.appraiser_email}
              phone={tx.appraiser_phone}
              company={tx.appraiser_company}
              accent="#6366f1"
              canEdit={canEdit}
              onEmailClick={openEmail}
              fields={{ name: true, email: true, phone: true, company: true }}
              onSave={({ name, email, phone, company }) => save({
                appraiser_name: name,
                appraiser_email: email,
                appraiser_phone: phone,
                appraiser_company: company,
              })}
            />
          )}
          {hasAttorney && (
            <ContactCard
              name={tx.attorney_name}
              role="Attorney"
              email={tx.attorney_email}
              phone={tx.attorney_phone}
              company={tx.attorney_firm}
              accent="#64748b"
              canEdit={canEdit}
              onEmailClick={openEmail}
              fields={{ name: true, email: true, phone: true, company: true }}
              onSave={({ name, email, phone, company }) => save({
                attorney_name: name,
                attorney_email: email,
                attorney_phone: phone,
                attorney_firm: company,
              })}
            />
          )}
        </SectionGroup>
      )}
    </div>
  );
}
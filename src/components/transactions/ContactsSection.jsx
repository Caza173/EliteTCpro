import React from "react";
import ContactCard from "./ContactCard";

function SectionGroup({ title, children }) {
  const cards = React.Children.toArray(children).filter(Boolean);
  if (cards.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards}
      </div>
    </div>
  );
}

export default function ContactsSection({ transaction }) {
  const tx = transaction;

  // Buyers — support multiple
  const buyers = tx.buyers?.length ? tx.buyers : (tx.buyer ? [tx.buyer] : []);
  const sellers = tx.sellers?.length ? tx.sellers : (tx.seller ? [tx.seller] : []);
  const clientEmails = tx.client_emails?.length ? tx.client_emails : (tx.client_email ? [tx.client_email] : []);

  // Service providers — only render if at least a name exists
  const hasLender     = tx.lender_name;
  const hasTitle      = tx.title_company_contact_name || tx.closing_title_company || tx.title_company_email;
  const hasInspector  = tx.inspector_name;
  const hasAttorney   = tx.attorney_name;
  const hasAppraiser  = tx.appraiser_name;

  return (
    <div className="space-y-5">

      {/* Buyers */}
      {buyers.length > 0 && (
        <SectionGroup title="Buyers">
          {buyers.map((name, i) => (
            <ContactCard
              key={i}
              name={name}
              role="Buyer"
              email={i === 0 ? (clientEmails[i] || tx.client_email || "") : (clientEmails[i] || "")}
              phone={i === 0 ? tx.client_phone : ""}
              accent="#2563EB"
            />
          ))}
        </SectionGroup>
      )}

      {/* Sellers */}
      {sellers.length > 0 && (
        <SectionGroup title="Sellers">
          {sellers.map((name, i) => (
            <ContactCard key={i} name={name} role="Seller" accent="#16a34a" />
          ))}
        </SectionGroup>
      )}

      {/* Agents */}
      {(tx.buyers_agent_name || tx.sellers_agent_name) && (
        <SectionGroup title="Agents">
          {tx.buyers_agent_name && (
            <ContactCard
              name={tx.buyers_agent_name}
              role="Buyer's Agent"
              email={tx.buyers_agent_email}
              phone={tx.buyers_agent_phone}
              company={tx.buyer_brokerage}
              accent="#7c3aed"
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
            />
          )}
          {tx.agent && (
            <ContactCard
              name={tx.agent}
              role="Transaction Coordinator"
              email={tx.agent_email}
              company={tx.agent_company}
              accent="#0891b2"
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
            />
          )}
        </SectionGroup>
      )}
    </div>
  );
}
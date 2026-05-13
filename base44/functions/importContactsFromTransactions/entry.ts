import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const transactions = await base44.entities.Transaction.list();

  // Extract all potential contacts from transaction fields
  const candidates = [];

  for (const tx of transactions) {
    // Buyers agent
    if (tx.buyers_agent_name) {
      const parts = tx.buyers_agent_name.trim().split(/\s+/);
      candidates.push({
        contact_type: 'agent',
        first_name: parts[0] || tx.buyers_agent_name,
        last_name: parts.slice(1).join(' ') || '',
        email: tx.buyers_agent_email || '',
        phone: tx.buyers_agent_phone || '',
        company_name: tx.buyer_brokerage || '',
      });
    }
    // Sellers agent
    if (tx.sellers_agent_name) {
      const parts = tx.sellers_agent_name.trim().split(/\s+/);
      candidates.push({
        contact_type: 'agent',
        first_name: parts[0] || tx.sellers_agent_name,
        last_name: parts.slice(1).join(' ') || '',
        email: tx.sellers_agent_email || '',
        phone: tx.sellers_agent_phone || '',
        company_name: tx.seller_brokerage || '',
      });
    }
    // Title company
    if (tx.title_company_contact_name || tx.closing_title_company) {
      const name = tx.title_company_contact_name || '';
      const parts = name.trim().split(/\s+/);
      candidates.push({
        contact_type: 'title',
        first_name: parts[0] || name || tx.closing_title_company,
        last_name: parts.slice(1).join(' ') || '',
        email: tx.title_company_email || '',
        phone: tx.title_company_phone || '',
        company_name: tx.closing_title_company || '',
      });
    }
    // Lender
    if (tx.lender_name) {
      const parts = tx.lender_name.trim().split(/\s+/);
      candidates.push({
        contact_type: 'lender',
        first_name: parts[0] || tx.lender_name,
        last_name: parts.slice(1).join(' ') || '',
        email: tx.lender_email || '',
        phone: tx.lender_phone || '',
        company_name: tx.lender_company || '',
      });
    }
    // Inspector
    if (tx.inspector_name) {
      const parts = tx.inspector_name.trim().split(/\s+/);
      candidates.push({
        contact_type: 'inspector',
        first_name: parts[0] || tx.inspector_name,
        last_name: parts.slice(1).join(' ') || '',
        email: tx.inspector_email || '',
        phone: tx.inspector_phone || '',
        company_name: tx.inspector_company || '',
      });
    }
    // Attorney
    if (tx.attorney_name) {
      const parts = tx.attorney_name.trim().split(/\s+/);
      candidates.push({
        contact_type: 'attorney',
        first_name: parts[0] || tx.attorney_name,
        last_name: parts.slice(1).join(' ') || '',
        email: tx.attorney_email || '',
        phone: tx.attorney_phone || '',
        company_name: tx.attorney_firm || '',
      });
    }
    // Appraiser
    if (tx.appraiser_name) {
      const parts = tx.appraiser_name.trim().split(/\s+/);
      candidates.push({
        contact_type: 'vendor',
        first_name: parts[0] || tx.appraiser_name,
        last_name: parts.slice(1).join(' ') || '',
        email: tx.appraiser_email || '',
        phone: tx.appraiser_phone || '',
        company_name: tx.appraiser_company || '',
      });
    }
    // Buyers (clients)
    if (tx.buyers && Array.isArray(tx.buyers)) {
      for (const name of tx.buyers) {
        if (!name) continue;
        const parts = name.trim().split(/\s+/);
        candidates.push({
          contact_type: 'buyer',
          first_name: parts[0] || name,
          last_name: parts.slice(1).join(' ') || '',
          email: tx.client_email || '',
          phone: tx.client_phone || '',
          company_name: '',
        });
      }
    } else if (tx.buyer) {
      const parts = tx.buyer.trim().split(/\s+/);
      candidates.push({
        contact_type: 'buyer',
        first_name: parts[0] || tx.buyer,
        last_name: parts.slice(1).join(' ') || '',
        email: tx.client_email || '',
        phone: tx.client_phone || '',
        company_name: '',
      });
    }
    // Sellers
    if (tx.sellers && Array.isArray(tx.sellers)) {
      for (const name of tx.sellers) {
        if (!name) continue;
        const parts = name.trim().split(/\s+/);
        candidates.push({
          contact_type: 'seller',
          first_name: parts[0] || name,
          last_name: parts.slice(1).join(' ') || '',
          email: '',
          phone: '',
          company_name: '',
        });
      }
    } else if (tx.seller) {
      const parts = tx.seller.trim().split(/\s+/);
      candidates.push({
        contact_type: 'seller',
        first_name: parts[0] || tx.seller,
        last_name: parts.slice(1).join(' ') || '',
        email: '',
        phone: '',
        company_name: '',
      });
    }
    // Additional contacts array
    if (tx.additional_contacts && Array.isArray(tx.additional_contacts)) {
      for (const ac of tx.additional_contacts) {
        if (!ac.name) continue;
        const parts = ac.name.trim().split(/\s+/);
        candidates.push({
          contact_type: ac.role || 'other',
          first_name: parts[0] || ac.name,
          last_name: parts.slice(1).join(' ') || '',
          email: ac.email || '',
          phone: ac.phone || '',
          company_name: ac.company || '',
        });
      }
    }
  }

  // De-duplicate by email (if present) or first+last name
  const seen = new Set();
  const unique = [];
  for (const c of candidates) {
    if (!c.first_name) continue;
    const key = c.email
      ? c.email.toLowerCase()
      : `${c.first_name.toLowerCase()}_${c.last_name.toLowerCase()}_${c.contact_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
  }

  // Fetch existing contacts to avoid re-importing
  const existing = await base44.entities.Contact.filter({ owner_id: user.id });
  const existingKeys = new Set(existing.map(e =>
    e.email ? e.email.toLowerCase() : `${(e.first_name||'').toLowerCase()}_${(e.last_name||'').toLowerCase()}_${e.contact_type}`
  ));

  const toCreate = unique.filter(c => {
    const key = c.email
      ? c.email.toLowerCase()
      : `${c.first_name.toLowerCase()}_${c.last_name.toLowerCase()}_${c.contact_type}`;
    return !existingKeys.has(key);
  });

  let created = 0;
  for (const c of toCreate) {
    await base44.entities.Contact.create({ ...c, owner_id: user.id, is_active: true });
    created++;
  }

  return Response.json({ imported: created, skipped: unique.length - created, total_candidates: candidates.length });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { extracted, file_url, file_name } = body;

    // Resolve brokerage_id — optional, new users may not have one yet
    let brokerage_id = user.data?.brokerage_id || null;
    if (!brokerage_id) {
      try {
        const brokerages = await base44.asServiceRole.entities.Brokerage.list();
        brokerage_id = brokerages[0]?.id || null;
      } catch (_) {}
    }

    // --- 1. Build buyer/seller arrays ---
    const buyerList = (extracted.buyer_names || "")
      .split(/[,&]/).map(s => s.trim()).filter(Boolean);
    const sellerList = (extracted.seller_names || "")
      .split(/[,&]/).map(s => s.trim()).filter(Boolean);

    // --- 2. Create Transaction ---
    // Use user-scoped client so Base44 auto-stamps created_by = user.id
    const tx = await base44.entities.Transaction.create({
      brokerage_id,
      address: extracted.property_address,
      buyer: buyerList.join(" & "),
      seller: sellerList.join(" & "),
      buyers: buyerList,
      sellers: sellerList,
      buyers_agent_name: extracted.buyer_agent || "",
      sellers_agent_name: extracted.seller_agent || "",
      buyer_brokerage: extracted.buyer_brokerage || "",
      seller_brokerage: extracted.seller_brokerage || "",
      closing_title_company: extracted.title_company || "",
      mls_number: extracted.mls_number || "",
      sale_price: extracted.purchase_price || null,
      commission_percent: extracted.commission_percent || null,
      contract_date: extracted.acceptance_date || null,
      closing_date: extracted.closing_date || null,
      inspection_deadline: extracted.inspection_deadline || null,
      financing_deadline: extracted.financing_commitment_date || null,
      earnest_money_deadline: extracted.earnest_money_deadline || null,
      due_diligence_deadline: extracted.due_diligence_deadline || null,
      transaction_type: extracted.transaction_type || "buyer",
      agent: user.full_name || user.email,
      agent_email: user.email,
      status: "active",
      phase: 3,
      phases_completed: [1, 2],
      tasks: [],
      last_activity_at: new Date().toISOString(),
    });
    console.log('[createTransactionFromContract] created tx.id:', tx.id, '| created_by:', tx.created_by);

    const txId = tx.id;

    // --- 3. Create Contacts + Participants ---
    const participantDefs = [
      ...buyerList.map(name => ({ name, role: "buyer" })),
      ...sellerList.map(name => ({ name, role: "seller" })),
      ...(extracted.buyer_agent ? [{ name: extracted.buyer_agent, role: "buyer_agent" }] : []),
      ...(extracted.seller_agent ? [{ name: extracted.seller_agent, role: "listing_agent" }] : []),
    ];

    for (const p of participantDefs) {
      const nameParts = p.name.trim().split(/\s+/);
      const first_name = nameParts[0] || p.name;
      const last_name = nameParts.slice(1).join(" ") || "";

      // Check for existing contact by name
      let contactId = null;
      try {
        const existing = await base44.asServiceRole.entities.Contact.filter({ first_name, last_name });
        if (existing.length > 0) {
          contactId = existing[0].id;
        }
      } catch (_) {}

      if (!contactId) {
        const roleType = ["buyer_agent", "listing_agent"].includes(p.role) ? "agent"
          : p.role === "buyer" ? "buyer"
          : p.role === "seller" ? "seller"
          : "other";
        const contact = await base44.asServiceRole.entities.Contact.create({
          first_name,
          last_name,
          role_type: roleType,
        });
        contactId = contact.id;
      }

      await base44.asServiceRole.entities.TransactionParticipant.create({
        transaction_id: txId,
        contact_id: contactId,
        role: p.role,
      });
    }

    // --- 4. Create Finance record ---
    if (extracted.purchase_price || extracted.deposit_amount || extracted.seller_concession_amount) {
      await base44.asServiceRole.entities.TransactionFinance.create({
        transaction_id: txId,
        brokerage_id,
        sale_price: extracted.purchase_price || null,
        commission_percent: extracted.commission_percent || null,
        seller_concession_amount: extracted.seller_concession_amount || 0,
        professional_fee_type: extracted.professional_fee_amount ? "flat" : "percent",
        professional_fee_value: extracted.professional_fee_amount || extracted.professional_fee_percent || 0,
        professional_fee_amount: extracted.professional_fee_amount || 0,
      });
    }

    // --- 5. Store Document ---
    if (file_url) {
      await base44.asServiceRole.entities.Document.create({
        transaction_id: txId,
        brokerage_id,
        doc_type: "purchase_and_sale",
        file_url,
        file_name: file_name || "Purchase and Sale Agreement",
        uploaded_by: user.email,
        uploaded_by_role: user.role || "tc",
        notes: "Auto-uploaded via Contract Intake Engine",
      });
    }

    // --- 6. Create TransactionSummary ---
    await base44.asServiceRole.entities.TransactionSummary.create({
      transaction_id: txId,
      brokerage_id,
      property_address: extracted.property_address,
      transaction_type: extracted.transaction_type || "buyer",
      status: "active",
      closing_date: extracted.closing_date || null,
      acceptance_date: extracted.acceptance_date || null,
      listing_agent_name: extracted.seller_agent || "",
      buyer_agent_name: extracted.buyer_agent || "",
      purchase_price: extracted.purchase_price || null,
      mls_number: extracted.mls_number || "",
      task_count_open: 0,
      document_count: file_url ? 1 : 0,
    });

    // --- 7. Audit log ---
    await base44.asServiceRole.entities.AuditLog.create({
      brokerage_id,
      transaction_id: txId,
      actor_email: user.email,
      action: "transaction_created",
      entity_type: "transaction",
      entity_id: txId,
      description: `Transaction created via AI Contract Intake from file: ${file_name || "uploaded file"}`,
    });

    // --- 8. Seed Contingencies from parsed data ---
    const acceptanceDate = extracted.acceptance_date || null;
    const addDays = (dateStr, days) => {
      if (!dateStr || days == null) return null;
      try {
        const d = new Date(dateStr + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() + Math.round(Number(days)));
        return d.toISOString().split("T")[0];
      } catch { return null; }
    };

    const contingenciesToCreate = [];
    const inspectionTypes = [
      { key: "inspection_days", label: "General Building" },
      { key: "sewage_days", label: "Sewage / Septic" },
      { key: "water_quality_days", label: "Water Quality" },
      { key: "radon_days", label: "Radon" },
    ];
    for (const { key, label } of inspectionTypes) {
      if (extracted[key] && Number(extracted[key]) > 0) {
        contingenciesToCreate.push({
          transaction_id: txId, brokerage_id,
          contingency_type: "Inspection", sub_type: label,
          days_from_effective: Number(extracted[key]),
          due_date: addDays(acceptanceDate, extracted[key]),
          is_active: true, is_custom: false, source: "Parsed", status: "Pending",
        });
      }
    }
    if (extracted.financing_commitment_date) {
      contingenciesToCreate.push({
        transaction_id: txId, brokerage_id,
        contingency_type: "Financing", sub_type: "Mortgage Commitment",
        due_date: extracted.financing_commitment_date,
        is_active: true, is_custom: false, source: "Parsed", status: "Pending",
      });
    }
    if (extracted.due_diligence_days && Number(extracted.due_diligence_days) > 0) {
      contingenciesToCreate.push({
        transaction_id: txId, brokerage_id,
        contingency_type: "Due Diligence", sub_type: "Due Diligence Period",
        days_from_effective: Number(extracted.due_diligence_days),
        due_date: addDays(acceptanceDate, extracted.due_diligence_days),
        is_active: true, is_custom: false, source: "Parsed", status: "Pending",
      });
    }
    if (contingenciesToCreate.length > 0) {
      await Promise.all(contingenciesToCreate.map(c => base44.asServiceRole.entities.Contingency.create(c)));
      console.log(`Seeded ${contingenciesToCreate.length} contingencies for transaction ${txId}`);
    }

    // --- 9. Auto compliance scan (document + deadline check) ---
    if (file_url) {
      base44.asServiceRole.functions.invoke("complianceEngine", {
        document_url: file_url,
        file_name: file_name || "Purchase and Sale Agreement",
        document_id: null, // doc was just created, id may not be stable yet
        transaction_id: txId,
        brokerage_id,
        transaction_data: {
          address: extracted.property_address,
          transaction_type: extracted.transaction_type || "buyer",
          is_cash_transaction: extracted.is_cash_transaction || false,
          sale_price: extracted.purchase_price || null,
          seller_concession_amount: extracted.seller_concession_amount || 0,
          professional_fee_amount: extracted.professional_fee_amount || 0,
          phase: 3,
          brokerage_id,
          inspection_deadline: extracted.inspection_deadline || null,
          financing_deadline: extracted.financing_commitment_date || null,
          earnest_money_deadline: extracted.earnest_money_deadline || null,
          closing_date: extracted.closing_date || null,
        },
      }).catch(() => {});
    }

    return Response.json({ transaction_id: txId, transaction: tx });
  } catch (error) {
    console.error('createTransactionFromContract error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
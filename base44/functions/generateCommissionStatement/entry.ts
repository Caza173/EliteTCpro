import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const fmtPct = (n) => (n != null ? `${n}%` : "—");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { transaction_id } = await req.json();
    if (!transaction_id) return Response.json({ error: "transaction_id required" }, { status: 400 });

    // Fetch transaction
    const transactions = await base44.entities.Transaction.filter({ id: transaction_id });
    const tx = transactions[0];
    if (!tx) return Response.json({ error: "Transaction not found" }, { status: 404 });

    // Fetch finance record if exists
    const financeRecords = await base44.entities.TransactionFinance.filter({ transaction_id });
    const fin = financeRecords[0];

    const salePrice = fin?.sale_price || tx.sale_price || 0;
    const commissionPct = fin?.commission_percent || tx.commission_percent || 0;
    const grossCommission = fin?.gross_commission || (salePrice * commissionPct / 100) || 0;
    const netCommission = fin?.net_commission || grossCommission;
    const brokerSplit = fin?.broker_split_percent || 20;
    const agentShare = grossCommission * (1 - brokerSplit / 100);

    // Build PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Header bar
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Commission Statement", margin, 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 20);

    // Property info block
    let y = 38;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(tx.address || "—", margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    if (tx.closing_date) doc.text(`Closing Date: ${tx.closing_date}`, margin, y);
    y += 10;

    // Horizontal divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // Two-column party info
    const col1 = margin;
    const col2 = pageW / 2 + 5;

    const label = (text, x, yy) => {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(text, x, yy);
    };
    const value = (text, x, yy) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(text || "—", x, yy);
    };

    label("BUYER'S AGENT", col1, y);
    label("SELLER'S AGENT", col2, y);
    y += 5;
    value(tx.buyers_agent_name || "—", col1, y);
    value(tx.sellers_agent_name || "—", col2, y);
    y += 5;
    label("BUYER'S BROKERAGE", col1, y);
    label("SELLER'S BROKERAGE", col2, y);
    y += 5;
    value(tx.buyer_brokerage || "—", col1, y);
    value(tx.seller_brokerage || "—", col2, y);
    y += 5;
    label("BUYER(S)", col1, y);
    label("SELLER(S)", col2, y);
    y += 5;
    value(tx.buyer || (tx.buyers || []).join(", ") || "—", col1, y);
    value(tx.seller || (tx.sellers || []).join(", ") || "—", col2, y);
    y += 12;

    // Section divider
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // Commission calculation table
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Commission Calculation", margin, y);
    y += 7;

    const tableLeft = margin;
    const tableRight = pageW - margin;
    const valueCol = tableRight - 5;

    const row = (lbl, val, isTotal = false, deduction = false) => {
      if (isTotal) {
        doc.setFillColor(239, 246, 255);
        doc.rect(tableLeft, y - 4, tableRight - tableLeft, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }
      doc.setTextColor(deduction ? 239 : 15, deduction ? 68 : 23, deduction ? 68 : 42);
      doc.text(lbl, tableLeft + 2, y);
      doc.setTextColor(deduction ? 239 : 15, deduction ? 68 : 23, deduction ? 68 : 42);
      doc.text(val, valueCol, y, { align: "right" });
      y += 7;
    };

    row(`Sale Price`, fmt(salePrice));
    row(`Commission Rate`, fmtPct(commissionPct));
    row(`Gross Commission (${fmtPct(commissionPct)} of ${fmt(salePrice)})`, fmt(grossCommission), true);

    if (fin) {
      if (fin.referral_amount > 0) row(`Referral Fee (${fin.referral_percent}%)`, `-${fmt(fin.referral_amount)}`, false, true);
      if (fin.gross_commission > 0) {
        const brokerAmt = (fin.gross_commission - (fin.referral_amount || 0)) * ((fin.broker_split_percent || 20) / 100);
        row(`Broker Split (${fin.broker_split_percent || 20}%)`, `-${fmt(brokerAmt)}`, false, true);
      }
      if (fin.transaction_fee > 0) row("Transaction Fee", `-${fmt(fin.transaction_fee)}`, false, true);
      if (fin.eo_fee > 0) row("E&O Fee", `-${fmt(fin.eo_fee)}`, false, true);
      if (fin.franchise_fee_percent > 0) row(`Franchise Fee (${fin.franchise_fee_percent}%)`, `-${fmt(fin.gross_commission * fin.franchise_fee_percent / 100)}`, false, true);
      if (fin.professional_fee_amount > 0) row("Professional Fee (Sec. 20)", `-${fmt(fin.professional_fee_amount)}`, false, true);
      if (fin.seller_concession_amount > 0) row("Seller Concession", `-${fmt(fin.seller_concession_amount)}`, false, true);
    }

    y += 2;
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.6);
    doc.line(tableLeft, y, tableRight, y);
    y += 5;

    row(`Net Commission`, fmt(fin?.net_commission || agentShare), true);

    y += 5;

    // Footer
    doc.setFillColor(248, 250, 252);
    doc.rect(0, doc.internal.pageSize.getHeight() - 18, pageW, 18, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("This statement is generated by EliteTC and is for informational purposes only.", pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });

    const pdfBytes = doc.output("arraybuffer");

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=commission-statement-${transaction_id}.pdf`,
      },
    });
  } catch (error) {
    console.error("generateCommissionStatement error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { format } from "date-fns";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

export default function CommissionStatementButton({ transaction, financeData }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const fin = financeData;
      const salePrice = fin?.sale_price || transaction.sale_price || 0;
      const commissionPct = fin?.commission_percent || transaction.commission_percent || 0;
      const grossCommission = fin?.gross_commission || (salePrice * commissionPct / 100);
      const netCommission = fin?.net_commission ?? grossCommission;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Header
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageW, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(17);
      doc.setFont("helvetica", "bold");
      doc.text("Commission Statement", margin, 13);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated: ${format(new Date(), "MMMM d, yyyy")}`,
        margin, 22
      );

      // Property
      let y = 42;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(transaction.address || "—", margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      if (transaction.closing_date)
        doc.text(`Closing Date: ${transaction.closing_date}`, margin, y);
      y += 10;

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // Party columns
      const col1 = margin;
      const col2 = pageW / 2 + 5;
      const lbl = (t, x, yy) => {
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139); doc.text(t, x, yy);
      };
      const val = (t, x, yy) => {
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42); doc.text(t || "—", x, yy);
      };

      lbl("BUYER'S AGENT", col1, y); lbl("SELLER'S AGENT", col2, y); y += 5;
      val(transaction.buyers_agent_name || "—", col1, y); val(transaction.sellers_agent_name || "—", col2, y); y += 5;
      lbl("BUYER BROKERAGE", col1, y); lbl("SELLER BROKERAGE", col2, y); y += 5;
      val(transaction.buyer_brokerage || "—", col1, y); val(transaction.seller_brokerage || "—", col2, y); y += 5;
      lbl("BUYER(S)", col1, y); lbl("SELLER(S)", col2, y); y += 5;
      val(transaction.buyer || (transaction.buyers || []).join(", ") || "—", col1, y);
      val(transaction.seller || (transaction.sellers || []).join(", ") || "—", col2, y);
      y += 12;

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // Commission table header
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Commission Calculation", margin, y);
      y += 8;

      const vCol = pageW - margin - 5;
      const tableRow = (label, amount, isTotal = false, deduction = false) => {
        if (isTotal) {
          doc.setFillColor(239, 246, 255);
          doc.rect(margin, y - 4.5, pageW - margin * 2, 8, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        } else {
          doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        }
        const textColor = deduction ? [220, 38, 38] : [15, 23, 42];
        doc.setTextColor(...textColor);
        // Truncate label so it never overlaps the value column (leave ~45mm for value)
        const maxLabelW = vCol - margin - 47;
        const truncatedLabel = doc.splitTextToSize(label, maxLabelW)[0];
        doc.text(truncatedLabel, margin + 2, y);
        doc.text(deduction ? `-${fmt(amount)}` : fmt(amount), vCol, y, { align: "right" });
        y += 7;
      };

      tableRow(`Sale Price`, salePrice);
      // Commission Rate row — render as plain text, not currency
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Commission Rate", margin + 2, y);
      doc.text(`${commissionPct}%`, vCol, y, { align: "right" });
      y += 7;
      tableRow(`Gross Commission (${commissionPct}% of ${fmt(salePrice)})`, grossCommission, true);

      if (fin) {
        if ((fin.referral_amount || 0) > 0)
          tableRow(`Referral Fee (${fin.referral_percent}%)`, fin.referral_amount, false, true);
        if ((fin.broker_split_percent || 0) > 0) {
          const base = grossCommission - (fin.referral_amount || 0);
          const brokerAmt = base * (fin.broker_split_percent / 100);
          tableRow(`Broker Split (${fin.broker_split_percent}%)`, brokerAmt, false, true);
        }
        if ((fin.transaction_fee || 0) > 0) tableRow("Transaction Fee", fin.transaction_fee, false, true);
        if ((fin.eo_fee || 0) > 0) tableRow("E&O Fee", fin.eo_fee, false, true);
        if ((fin.franchise_fee_percent || 0) > 0)
          tableRow(`Franchise Fee (${fin.franchise_fee_percent}%)`, grossCommission * fin.franchise_fee_percent / 100, false, true);
        if ((fin.professional_fee_amount || 0) > 0)
          tableRow("Professional Fee (Sec. 20)", fin.professional_fee_amount, false, true);
        if ((fin.seller_concession_amount || 0) > 0)
          tableRow("Seller Concession", fin.seller_concession_amount, false, true);
      }

      y += 2;
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
      tableRow("Net Commission", netCommission, true);

      // Footer
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageH - 16, pageW, 16, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        "This statement is generated by EliteTC and is for informational purposes only.",
        pageW / 2, pageH - 6,
        { align: "center" }
      );

      const safeName = (transaction.address || "transaction").replace(/[^a-z0-9]/gi, "-").toLowerCase();
      doc.save(`commission-statement-${safeName}.pdf`);
    } catch (e) {
      console.error("Commission statement generation failed:", e);
    }
    setGenerating(false);
  };

  return (
    <Button
      variant="outline"
      onClick={handleGenerate}
      disabled={generating}
      className="h-9 text-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50"
    >
      {generating ? (
        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
      ) : (
        <FileText className="w-4 h-4 mr-1.5" />
      )}
      {generating ? "Generating..." : "Generate Commission Statement"}
    </Button>
  );
}
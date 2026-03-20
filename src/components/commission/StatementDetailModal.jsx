import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Download, Send, CheckCircle, Building2, Loader2, Pencil, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  sent_to_agent: "bg-blue-50 text-blue-700",
  approved: "bg-emerald-50 text-emerald-700",
  revision_requested: "bg-amber-50 text-amber-700",
  sent_to_title: "bg-purple-50 text-purple-700",
};
const STATUS_LABELS = {
  draft: "Draft", sent_to_agent: "Sent to Agent", approved: "Approved",
  revision_requested: "Revision Requested", sent_to_title: "Sent to Title",
};

const fmt$ = (v) => v != null ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtDate = (d) => { try { return d ? format(new Date(d), "MMM d, yyyy") : "—"; } catch { return "—"; } };

function buildPDF(s) {
  const doc = new jsPDF();
  const gray = [100, 100, 100];
  const black = [15, 23, 42];

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("Commission Statement", 20, 26);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, 20, 34);

  doc.setDrawColor(220, 220, 220);
  doc.line(20, 40, 190, 40);

  let y = 50;
  const section = (title) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(title.toUpperCase(), 20, y);
    y += 7;
    doc.setTextColor(...black);
    doc.setFont("helvetica", "normal");
  };
  const row = (label, value) => {
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(label, 20, y);
    doc.setTextColor(...black);
    doc.setFont("helvetica", "bold");
    doc.text(value || "—", 80, y);
    doc.setFont("helvetica", "normal");
    y += 7;
  };

  section("Property Details");
  row("Address:", s.property_address);
  row("Closing Date:", fmtDate(s.closing_date));
  row("Side:", s.side ? s.side.charAt(0).toUpperCase() + s.side.slice(1) : "—");
  y += 4;

  section("Agent Information");
  row("Agent Name:", s.agent_name);
  row("Agent Email:", s.agent_email);
  y += 4;

  section("Commission Breakdown");
  row("Purchase Price:", fmt$(s.purchase_price));
  if (s.listing_commission_percent) row(`Listing Commission (${s.listing_commission_percent}%):`, fmt$((s.purchase_price || 0) * s.listing_commission_percent / 100));
  if (s.buyer_commission_percent) row(`Buyer Commission (${s.buyer_commission_percent}%):`, fmt$((s.purchase_price || 0) * s.buyer_commission_percent / 100));
  row("Gross Commission:", fmt$(s.gross_commission));
  row(`Brokerage Split (${s.brokerage_split_percent || 0}%):`, `−${fmt$(s.brokerage_split_amount)}`);
  if (s.referral_fee) row("Referral Fee:", `−${fmt$(s.referral_fee)}`);
  if (s.tc_fee) row("TC Fee:", `−${fmt$(s.tc_fee)}`);
  if (s.transaction_fee) row("Transaction Fee:", `−${fmt$(s.transaction_fee)}`);

  y += 2;
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y, 190, y);
  y += 8;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text("Agent Net Commission:", 20, y);
  doc.text(fmt$(s.agent_net), 120, y);

  if (s.notes) {
    y += 14;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...gray);
    doc.text(`Notes: ${s.notes}`, 20, y);
  }

  return doc;
}

export default function StatementDetailModal({ statement: s, onClose, onEdit, onUpdated }) {
  const [sending, setSending] = useState(null);

  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerage"],
    queryFn: () => base44.entities.Brokerage.list(),
  });
  const brokerage = brokerages[0];

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CommissionStatement.update(s.id, data),
    onSuccess: onUpdated,
  });

  const handleDownload = () => {
    const doc = buildPDF(s);
    doc.save(`commission_${(s.property_address || "statement").replace(/[^a-z0-9]/gi, "_")}.pdf`);
  };

  const sendEmail = async (type) => {
    setSending(type);
    const doc = buildPDF(s);
    // Get PDF as base64 string for attachment
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    const pdfFileName = `commission_${(s.property_address || "statement").replace(/[^a-z0-9]/gi, "_")}.pdf`;

    // Also upload for download link
    const blob = doc.output("blob");
    const file = new File([blob], pdfFileName, { type: "application/pdf" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    if (type === "agent") {
      await base44.functions.invoke("sendCommissionEmail", {
        to: s.agent_email,
        subject: `Commission Statement for Review — ${s.property_address}`,
        htmlBody: `<p>Hello ${s.agent_name || ""},</p>
<p>Please review your commission statement for <strong>${s.property_address}</strong>. The PDF is attached to this email.</p>
<table style="border-collapse:collapse;width:100%;max-width:460px;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:6px 0;color:#666;">Purchase Price</td><td style="padding:6px 0;font-weight:600;">${fmt$(s.purchase_price)}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Gross Commission</td><td style="padding:6px 0;font-weight:600;">${fmt$(s.gross_commission)}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Brokerage Split</td><td style="padding:6px 0;font-weight:600;">−${fmt$(s.brokerage_split_amount)}</td></tr>
  <tr style="background:#f0fdf4;"><td style="padding:8px;font-weight:700;">Your Net Commission</td><td style="padding:8px;font-weight:700;color:#16a34a;">${fmt$(s.agent_net)}</td></tr>
</table>
<br/><p>Please reply <strong>Approved</strong> if this looks correct, or let us know if any changes are needed.</p>
<p>Best regards,<br/>Transaction Coordinator</p>`,
        pdfBase64,
        pdfFileName,
      });
      await updateMutation.mutateAsync({ status: "sent_to_agent", pdf_url: file_url });
    } else {
      await base44.functions.invoke("sendCommissionEmail", {
        to: s.title_company_email,
        subject: `Commission Disbursement Authorization — ${s.property_address}`,
        htmlBody: `<p>Hello,</p>
<p>Please find the commission disbursement authorization for the following transaction. The PDF statement is attached.</p>
<p><strong>Property:</strong> ${s.property_address}<br/>
<strong>Closing Date:</strong> ${fmtDate(s.closing_date)}<br/>
<strong>Agent:</strong> ${s.agent_name || "—"} (${s.agent_email || "—"})</p>
<table style="border-collapse:collapse;width:100%;max-width:460px;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:6px 0;color:#666;">Purchase Price</td><td style="padding:6px 0;font-weight:600;">${fmt$(s.purchase_price)}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Gross Commission</td><td style="padding:6px 0;font-weight:600;">${fmt$(s.gross_commission)}</td></tr>
  <tr style="background:#f0fdf4;"><td style="padding:8px;font-weight:700;">Agent Net Payout</td><td style="padding:8px;font-weight:700;color:#16a34a;">${fmt$(s.agent_net)}</td></tr>
</table>
<br/><p>Please disburse agent net commission as per the attached statement at closing.</p>
<p>Best regards,<br/>Transaction Coordinator</p>`,
        pdfBase64,
        pdfFileName,
      });
      await updateMutation.mutateAsync({ status: "sent_to_title", sent_to_title_at: new Date().toISOString(), pdf_url: file_url });
    }
    setSending(null);
  };

  const breakdownRows = [
    s.listing_commission_percent ? { label: `Listing Commission (${s.listing_commission_percent}%)`, value: fmt$((s.purchase_price || 0) * s.listing_commission_percent / 100) } : null,
    s.buyer_commission_percent ? { label: `Buyer Commission (${s.buyer_commission_percent}%)`, value: fmt$((s.purchase_price || 0) * s.buyer_commission_percent / 100) } : null,
    { label: "Gross Commission", value: fmt$(s.gross_commission), bold: true },
    { label: `Brokerage Split (${s.brokerage_split_percent || 0}%)`, value: `−${fmt$(s.brokerage_split_amount)}`, negative: true },
    s.referral_fee ? { label: "Referral Fee", value: `−${fmt$(s.referral_fee)}`, negative: true } : null,
    s.tc_fee ? { label: "TC Fee", value: `−${fmt$(s.tc_fee)}`, negative: true } : null,
    s.transaction_fee ? { label: "Transaction Fee", value: `−${fmt$(s.transaction_fee)}`, negative: true } : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{s.property_address}</h2>
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 ${STATUS_STYLES[s.status] || STATUS_STYLES.draft}`}>
              {STATUS_LABELS[s.status] || "Draft"}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onEdit} className="h-8 text-xs gap-1">
              <Pencil className="w-3 h-3" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 text-xs gap-1">
              <Download className="w-3 h-3" /> PDF
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 ml-1">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Agent", value: s.agent_name || "—" },
              { label: "Agent Email", value: s.agent_email || "—" },
              { label: "Side", value: s.side ? s.side.charAt(0).toUpperCase() + s.side.slice(1) : "—" },
              { label: "Closing Date", value: fmtDate(s.closing_date) },
              { label: "Purchase Price", value: fmt$(s.purchase_price) },
              { label: "Title Co. Email", value: s.title_company_email || "—" },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs font-medium text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Breakdown table */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Commission Breakdown</p>
            </div>
            <div className="divide-y divide-gray-50">
              {breakdownRows.map((row, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${row.bold ? "bg-blue-50/60" : ""}`}>
                  <span className={`text-sm ${row.bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>{row.label}</span>
                  <span className={`text-sm font-semibold ${row.negative ? "text-red-600" : row.bold ? "text-blue-700" : "text-gray-800"}`}>{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
                <span className="text-sm font-bold text-gray-900">Agent Net Commission</span>
                <span className="text-lg font-bold text-emerald-700">{fmt$(s.agent_net)}</span>
              </div>
            </div>
          </div>

          {s.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{s.notes}</p>
            </div>
          )}

          {s.approved_at && (
            <p className="text-xs text-emerald-600 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Approved {fmtDate(s.approved_at)}
            </p>
          )}
          {s.sent_to_title_at && (
            <p className="text-xs text-purple-600 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Sent to Title {fmtDate(s.sent_to_title_at)}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-2 flex-shrink-0">
          {(s.status === "draft" || s.status === "revision_requested") && (
            <Button onClick={() => sendEmail("agent")} disabled={!!sending || !s.agent_email}
              className="gap-1.5 text-sm" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              {sending === "agent" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send to Agent for Approval
            </Button>
          )}
          {s.status === "sent_to_agent" && (
            <>
              <Button onClick={() => updateMutation.mutate({ status: "approved", agent_approved: true, approved_at: new Date().toISOString() })}
                disabled={updateMutation.isPending}
                className="gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle className="w-3.5 h-3.5" /> Mark Approved
              </Button>
              <Button variant="outline" onClick={() => updateMutation.mutate({ status: "revision_requested" })}
                disabled={updateMutation.isPending}
                className="gap-1.5 text-sm text-amber-600 border-amber-200 hover:bg-amber-50">
                <RotateCcw className="w-3.5 h-3.5" /> Request Revision
              </Button>
            </>
          )}
          {s.status === "approved" && (
            <Button onClick={() => sendEmail("title")} disabled={!!sending || !s.title_company_email}
              className="gap-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white">
              {sending === "title" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
              Send to Title Company
            </Button>
          )}
          {!s.agent_email && (s.status === "draft" || s.status === "revision_requested") && (
            <p className="text-xs text-amber-600 self-center">Add agent email to send for approval.</p>
          )}
          {!s.title_company_email && s.status === "approved" && (
            <p className="text-xs text-amber-600 self-center">Add title company email to send.</p>
          )}
        </div>
      </div>
    </div>
  );
}
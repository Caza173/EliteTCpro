import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Download, Send, Building2, Loader2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";

const STATUS_STYLES = { draft: "bg-gray-100 text-gray-600", ready: "bg-blue-50 text-blue-700", sent: "bg-purple-50 text-purple-700" };
const STATUS_LABELS = { draft: "Draft", ready: "Ready", sent: "Sent" };

const fmt$ = (v) => v != null ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtDate = (d) => { try { return d ? format(new Date(d), "MMM d, yyyy") : "—"; } catch { return "—"; } };

function calcTank(tank) {
  const cap = parseFloat(tank.capacity) || 0;
  const pct = parseFloat(tank.fill_percent) || 0;
  const ppg = parseFloat(tank.price_per_gallon) || 0;
  const gallons = tank.fill_method === "percent" ? cap * (pct / 100) : (tank.gallons_calculated || parseFloat(tank.gallons_remaining) || 0);
  return { gallons: Math.round(gallons * 10) / 10, subtotal: Math.round(gallons * ppg * 100) / 100 };
}

function buildPDF(p, logoDataUrl) {
  const doc = new jsPDF();
  const gray = [100, 100, 100];
  const black = [15, 23, 42];
  let y = 20;

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", 20, 12, 36, 14); y = 34; } catch (_) {}
  }

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text("Fuel Proration Statement", logoDataUrl ? 62 : 20, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, logoDataUrl ? 62 : 20, y);
  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y, 190, y);
  y += 8;

  const section = (title) => {
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235); doc.text(title.toUpperCase(), 20, y);
    y += 7; doc.setTextColor(...black); doc.setFont("helvetica", "normal");
  };

  const row = (label, value) => {
    doc.setFontSize(9); doc.setTextColor(...gray); doc.text(label, 20, y);
    doc.setTextColor(...black); doc.setFont("helvetica", "bold");
    doc.text(String(value || "—"), 80, y);
    doc.setFont("helvetica", "normal"); y += 7;
  };

  section("Property Details");
  row("Address:", p.property_address);
  row("Closing Date:", fmtDate(p.closing_date));
  row("Buyer:", p.buyer_name || "—");
  row("Seller:", p.seller_name || "—");
  y += 4;

  section("Fuel Tank Proration");
  const cols = [20, 55, 95, 125, 153];
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.setFillColor(241, 245, 249);
  doc.rect(20, y - 5, 170, 8, "F");
  ["Tank", "Fuel Type", "Gallons", "$/Gal", "Subtotal"].forEach((h, i) => {
    doc.setTextColor(...black); doc.text(h, cols[i], y);
  });
  y += 8; doc.setFont("helvetica", "normal");

  (p.tanks || []).forEach(tank => {
    if (y > 250) { doc.addPage(); y = 20; }
    const { gallons, subtotal } = calcTank(tank);
    doc.setFontSize(8); doc.setTextColor(...black);
    doc.text(String(tank.tank_label || "—"), cols[0], y);
    doc.text(String(tank.fuel_type || "—"), cols[1], y);
    doc.text(`${gallons.toFixed(1)} gal`, cols[2], y);
    doc.text(`$${(parseFloat(tank.price_per_gallon) || 0).toFixed(2)}`, cols[3], y);
    doc.text(`$${subtotal.toFixed(2)}`, cols[4], y);
    y += 7;
  });

  y += 4;
  doc.setDrawColor(220, 220, 220); doc.line(20, y, 190, y); y += 8;
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text("Total Amount Due:", 20, y);
  doc.text(`$${(p.total_amount || 0).toFixed(2)}`, 130, y);
  y += 6;
  doc.setFontSize(9); doc.setTextColor(...gray);
  doc.text(`Total Gallons: ${(p.total_gallons || 0).toFixed(1)}`, 20, y);

  if (p.notes) {
    y += 10; doc.setFontSize(9); doc.setFont("helvetica", "italic");
    doc.setTextColor(...gray); doc.text(`Notes: ${p.notes}`, 20, y);
  }

  y = Math.min(y + 18, 268);
  doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(150, 150, 150);
  const disclaimer = "Fuel proration is based on estimated or measured fuel remaining and most recent available pricing. Final verification is the responsibility of the parties and settlement agent.";
  doc.text(doc.splitTextToSize(disclaimer, 170), 20, y);

  return doc;
}

export default function FuelProrationDetailModal({ proration: p, onClose, onUpdated }) {
  const [sending, setSending] = useState(null);

  const { data: brokerages = [] } = useQuery({
    queryKey: ["brokerage"],
    queryFn: () => base44.entities.Brokerage.list(),
  });
  const brokerage = brokerages[0];

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.FuelProration.update(p.id, data),
    onSuccess: onUpdated,
  });

  const fetchLogoDataUrl = async () => {
    if (!brokerage?.branding_logo) return null;
    try {
      const res = await fetch(brokerage.branding_logo);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (_) { return null; }
  };

  const handleDownload = async () => {
    const logoDataUrl = await fetchLogoDataUrl();
    const doc = buildPDF(p, logoDataUrl);
    doc.save(`fuel_proration_${(p.property_address || "statement").replace(/[^a-z0-9]/gi, "_")}.pdf`);
  };

  const sendEmail = async (type) => {
    setSending(type);
    const logoDataUrl = await fetchLogoDataUrl();
    const doc = buildPDF(p, logoDataUrl);
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    const pdfFileName = `fuel_proration_${(p.property_address || "statement").replace(/[^a-z0-9]/gi, "_")}.pdf`;
    const to = type === "agent" ? p.agent_email : p.title_company_email;

    const tankRows = (p.tanks || []).map(tank => {
      const { gallons, subtotal } = calcTank(tank);
      return `<tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${tank.tank_label}</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-transform:capitalize;">${tank.fuel_type}</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${gallons.toFixed(1)} gal</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">$${(parseFloat(tank.price_per_gallon)||0).toFixed(2)}</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-weight:600;">$${subtotal.toFixed(2)}</td></tr>`;
    }).join("");

    const htmlBody = `<p>Hello,</p>
<p>Please find the fuel proration statement for <strong>${p.property_address}</strong>. The PDF is attached.</p>
<table style="border-collapse:collapse;width:100%;max-width:520px;font-size:13px;font-family:sans-serif;">
  <thead><tr style="background:#f8fafc;"><th style="padding:6px 8px;text-align:left;font-size:11px;color:#64748b;">Tank</th><th style="padding:6px 8px;text-align:left;font-size:11px;color:#64748b;">Fuel</th><th style="padding:6px 8px;text-align:left;font-size:11px;color:#64748b;">Gallons</th><th style="padding:6px 8px;text-align:left;font-size:11px;color:#64748b;">$/Gal</th><th style="padding:6px 8px;text-align:left;font-size:11px;color:#64748b;">Subtotal</th></tr></thead>
  <tbody>${tankRows}</tbody>
</table>
<p style="margin-top:12px;"><strong>Total Amount Due: <span style="color:#16a34a;">${fmt$(p.total_amount)}</span></strong><br/><small style="color:#94a3b8;">Total Gallons: ${(p.total_gallons||0).toFixed(1)}</small></p>
<p style="font-size:11px;color:#94a3b8;font-style:italic;">Fuel proration is based on estimated or measured fuel remaining and most recent available pricing. Final verification is the responsibility of the parties and settlement agent.</p>
<p>Best regards,<br/>Transaction Coordinator</p>`;

    await base44.functions.invoke("sendCommissionEmail", {
      to, subject: `Fuel Proration Statement — ${p.property_address}`, htmlBody, pdfBase64, pdfFileName,
    });
    await updateMutation.mutateAsync({ status: "sent" });
    setSending(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{p.property_address}</h2>
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 ${STATUS_STYLES[p.status] || STATUS_STYLES.draft}`}>
              {STATUS_LABELS[p.status] || "Draft"}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 text-xs gap-1">
              <Download className="w-3 h-3" /> PDF
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 ml-1"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Buyer", value: p.buyer_name || "—" },
              { label: "Seller", value: p.seller_name || "—" },
              { label: "Closing Date", value: fmtDate(p.closing_date) },
              { label: "Total Gallons", value: p.total_gallons ? `${Number(p.total_gallons).toFixed(1)} gal` : "—" },
              { label: "Agent Email", value: p.agent_email || "—" },
              { label: "Title Co. Email", value: p.title_company_email || "—" },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs font-medium text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fuel Tanks</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Tank", "Fuel Type", "Gallons", "$/Gal", "Subtotal"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(p.tanks || []).map((tank, i) => {
                    const { gallons, subtotal } = calcTank(tank);
                    return (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{tank.tank_label}</td>
                        <td className="px-4 py-2.5 text-gray-600 capitalize">{tank.fuel_type}</td>
                        <td className="px-4 py-2.5 text-gray-600">{gallons.toFixed(1)} gal</td>
                        <td className="px-4 py-2.5 text-gray-600">${(parseFloat(tank.price_per_gallon)||0).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt$(subtotal)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-emerald-50">
                    <td colSpan={4} className="px-4 py-3 font-bold text-gray-900 text-sm">Total Amount Due</td>
                    <td className="px-4 py-3 font-bold text-emerald-700 text-base">{fmt$(p.total_amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-amber-800 italic">
              Fuel proration is based on estimated or measured fuel remaining and most recent available pricing. Final verification is the responsibility of the parties and settlement agent.
            </p>
          </div>

          {p.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{p.notes}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-2 flex-shrink-0">
          {p.status === "draft" && (
            <Button variant="outline" onClick={() => updateMutation.mutate({ status: "ready" })} disabled={updateMutation.isPending} className="text-blue-600 border-blue-200 gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Mark Ready
            </Button>
          )}
          {p.agent_email && (
            <Button onClick={() => sendEmail("agent")} disabled={!!sending} className="gap-1.5 text-sm" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              {sending === "agent" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send to Agent
            </Button>
          )}
          {p.title_company_email && (
            <Button onClick={() => sendEmail("title")} disabled={!!sending} className="gap-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white">
              {sending === "title" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
              Send to Title
            </Button>
          )}
          {!p.agent_email && !p.title_company_email && (
            <p className="text-xs text-amber-600 self-center">Add email addresses to send this proration.</p>
          )}
        </div>
      </div>
    </div>
  );
}
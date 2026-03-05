import React from "react";
import { differenceInDays, isPast, isToday, parseISO } from "date-fns";
import { AlertTriangle, Clock, X } from "lucide-react";

function getAlerts(transactions) {
  const alerts = [];
  const today = new Date();

  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;

    const checkDeadline = (dateStr, label) => {
      if (!dateStr) return;
      const date = parseISO(dateStr);
      const days = differenceInDays(date, today);
      if (isPast(date) && !isToday(date)) {
        alerts.push({ id: `${tx.id}-${label}`, address: tx.address, label, days, overdue: true });
      } else if (days <= 3) {
        alerts.push({ id: `${tx.id}-${label}`, address: tx.address, label, days, overdue: false });
      }
    };

    checkDeadline(tx.inspection_deadline, "Inspection Deadline");
    checkDeadline(tx.appraisal_deadline, "Appraisal Deadline");
    checkDeadline(tx.financing_deadline, "Financing Commitment");
    checkDeadline(tx.ctc_target, "Clear to Close Target");
    checkDeadline(tx.closing_date, "Closing Date");
  });

  return alerts.sort((a, b) => a.days - b.days);
}

function dayLabel(days, overdue) {
  if (overdue) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export default function DeadlineAlerts({ transactions = [] }) {
  const alerts = getAlerts(transactions);
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
            alert.overdue
              ? "bg-red-50 border-red-200 text-red-800"
              : alert.days <= 1
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-yellow-50 border-yellow-200 text-yellow-800"
          }`}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">{alert.label}</span> for{" "}
            <span className="font-medium">{alert.address}</span>{" "}
            is <span className="font-semibold">{dayLabel(alert.days, alert.overdue)}</span>.
          </span>
        </div>
      ))}
    </div>
  );
}
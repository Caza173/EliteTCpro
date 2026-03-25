import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { differenceInHours, parseISO, isValid } from "date-fns";

const DEADLINE_FIELDS = [
  { field: "inspection_deadline", label: "Inspection Deadline" },
  { field: "appraisal_deadline", label: "Appraisal Deadline" },
  { field: "financing_deadline", label: "Financing Commitment" },
  { field: "due_diligence_deadline", label: "Due Diligence Deadline" },
  { field: "earnest_money_deadline", label: "Earnest Money Deadline" },
  { field: "ctc_target", label: "Clear to Close Target" },
  { field: "closing_date", label: "Closing Date" },
];

// Intervals at which we send alerts (hours before deadline)
const ALERT_INTERVALS = [24, 18, 12, 6, 3, 1];

export default function AddendumAlertChecker({ transactions = [], currentUser }) {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!currentUser || checkedRef.current) return;
    const role = currentUser.role;
    if (!["tc", "agent", "admin", "owner"].includes(role)) return;

    checkedRef.current = true;
    checkAndNotify(transactions, currentUser);
  }, [transactions, currentUser]);

  return null;
}

async function checkAndNotify(transactions, currentUser) {
  const now = new Date();

  // Fetch existing deadline notifications for this user to avoid duplicate intervals
  const recentNotifications = await base44.entities.InAppNotification.filter(
    { user_email: currentUser.email, type: "deadline" },
    "-created_date",
    200
  );

  // Build a set of already-sent keys: "transactionId|deadlineField|intervalHours"
  const sentKeys = new Set(
    recentNotifications.map((n) => {
      if (n.transaction_id && n.deadline_field && n.alert_interval_hours) {
        return `${n.transaction_id}|${n.deadline_field}|${n.alert_interval_hours}`;
      }
      return null;
    }).filter(Boolean)
  );

  const toCreate = [];

  transactions.forEach((tx) => {
    if (tx.status === "closed" || tx.status === "cancelled") return;

    DEADLINE_FIELDS.forEach(({ field, label }) => {
      const dateStr = tx[field];
      if (!dateStr) return;

      let date;
      try {
        date = parseISO(dateStr);
        if (!isValid(date)) return;
      } catch {
        return;
      }

      const hoursUntil = differenceInHours(date, now);
      if (hoursUntil < 0 || hoursUntil > 24) return;

      // Find which interval bracket we're in (the closest one that hasn't been sent yet)
      // e.g. if hoursUntil = 17, the current bracket is 18h (we're just past 18h warning)
      const triggeredInterval = ALERT_INTERVALS.find((h) => hoursUntil <= h);
      if (!triggeredInterval) return;

      const recipients = [];
      // TC (created_by)
      if (tx.created_by) recipients.push(tx.created_by);
      // Agent if different
      if (tx.agent_email && tx.agent_email !== tx.created_by) recipients.push(tx.agent_email);

      recipients.forEach((email) => {
        const key = `${tx.id}|${field}|${triggeredInterval}`;
        if (sentKeys.has(key)) return;
        sentKeys.add(key); // prevent duplicate in this batch

        const title = `⚠️ Addendum needed? ${label} in ${triggeredInterval}h`;
        const body = `The ${label} for ${tx.address} is approaching within ${triggeredInterval} hours. Do you need to prepare an addendum?`;

        toCreate.push({
          user_email: email,
          transaction_id: tx.id,
          brokerage_id: tx.brokerage_id,
          title,
          body,
          type: "deadline",
          alert_interval_hours: triggeredInterval,
          deadline_field: field,
          addendum_response: "pending",
        });

        // Email notifications are handled by the scheduled backend function (sendDeadlineAlerts)
      });
    });
  });

  if (toCreate.length > 0) {
    await base44.entities.InAppNotification.bulkCreate(toCreate);
  }
}
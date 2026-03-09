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

export default function AddendumAlertChecker({ transactions = [], currentUser }) {
  const checkedRef = useRef(false);

  useEffect(() => {
    // Only run for TC or agent roles, and only once per session
    if (!currentUser || checkedRef.current) return;
    const role = currentUser.role;
    if (role !== "tc" && role !== "agent" && role !== "admin" && role !== "owner") return;

    checkedRef.current = true;
    checkAndNotify(transactions, currentUser);
  }, [transactions, currentUser]);

  return null;
}

async function checkAndNotify(transactions, currentUser) {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Fetch recent notifications to avoid duplicates
  const recentNotifications = await base44.entities.InAppNotification.filter(
    { user_email: currentUser.email, type: "deadline" },
    "-created_date",
    100
  );

  const alreadyNotifiedKeys = new Set(
    recentNotifications
      .filter((n) => n.created_date && n.created_date.slice(0, 10) === todayKey)
      .map((n) => n.title)
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

      const title = `⚠️ Addendum needed? ${label} in ${hoursUntil}h`;
      const body = `The ${label} for ${tx.address} is approaching within 24 hours. Do you need to prepare an addendum?`;

      // Notify the TC (created_by of the transaction)
      if (tx.created_by) {
        const key = `${title}|${tx.created_by}`;
        if (!alreadyNotifiedKeys.has(title)) {
          toCreate.push({
            user_email: tx.created_by,
            transaction_id: tx.id,
            brokerage_id: tx.brokerage_id,
            title,
            body,
            type: "deadline",
          });
        }
      }

      // Notify the agent if different from TC
      if (tx.agent_email && tx.agent_email !== tx.created_by) {
        if (!alreadyNotifiedKeys.has(title)) {
          toCreate.push({
            user_email: tx.agent_email,
            transaction_id: tx.id,
            brokerage_id: tx.brokerage_id,
            title,
            body,
            type: "deadline",
          });
        }
      }
    });
  });

  if (toCreate.length > 0) {
    await base44.entities.InAppNotification.bulkCreate(toCreate);
  }
}
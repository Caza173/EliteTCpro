import { addDays, format } from "date-fns";

/**
 * Generate standard transaction deadlines based on contract date.
 * @param {string} contractDate - ISO date string
 * @param {string} [closingDate] - ISO date string (optional override)
 * @returns {object} deadline fields to spread onto transaction
 */
export function generateDeadlines(contractDate, closingDate) {
  const base = new Date(contractDate);

  return {
    inspection_deadline: format(addDays(base, 10), "yyyy-MM-dd"),
    appraisal_deadline: format(addDays(base, 7), "yyyy-MM-dd"),
    financing_deadline: format(addDays(base, 21), "yyyy-MM-dd"),
    ctc_target: format(addDays(base, 30), "yyyy-MM-dd"),
    ...(closingDate ? { closing_date: closingDate } : {}),
  };
}

/**
 * Console-log a simulated email notification.
 */
export function sendEmailNotification({ subject, body }) {
  console.log("─── Email Notification ───");
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log("──────────────────────────");
}
import { addDays, format, parseISO } from "date-fns";

/**
 * Generate standard transaction deadlines based on contract date.
 */
export function generateDeadlines(contractDate, closingDate) {
  const base = new Date(contractDate);
  return {
    inspection_deadline: format(addDays(base, 10), "yyyy-MM-dd"),
    appraisal_deadline: format(addDays(base, 21), "yyyy-MM-dd"),
    financing_deadline: format(addDays(base, 30), "yyyy-MM-dd"),
    ctc_target: format(addDays(base, 45), "yyyy-MM-dd"),
    ...(closingDate ? { closing_date: closingDate } : {}),
  };
}

/**
 * Recalculate due_dates for all tasks that have a linked_deadline + offset_days.
 * Call this whenever a deadline date changes.
 *
 * @param {Array} tasks - current task array from transaction
 * @param {object} transactionFields - the transaction object (has deadline date strings)
 * @returns {Array} updated tasks with recalculated due_dates
 */
export function recalculateTaskDueDates(tasks, transactionFields) {
  return tasks.map((task) => {
    if (!task.linked_deadline || task.offset_days == null) return task;
    const anchorDate = transactionFields[task.linked_deadline];
    if (!anchorDate) return task;
    try {
      const base = parseISO(anchorDate);
      const due = addDays(base, task.offset_days);
      return { ...task, due_date: format(due, "yyyy-MM-dd") };
    } catch {
      return task;
    }
  });
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
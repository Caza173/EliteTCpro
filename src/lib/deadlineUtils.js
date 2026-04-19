// deadlineUtils.js - Centralized Deadline Evaluation Engine

const DEFAULT_TIME = "23:59:59";

const RISK_THRESHOLDS = {
  LOW: 7,
  MEDIUM: 4,
  HIGH: 2,
};

export function normalizeDate(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T${DEFAULT_TIME}`);
}

export function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysBetween(dateA, dateB) {
  const ms = dateA - dateB;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function getDeadlineState({
  deadlineDate,
  isCompleted = false,
  isWaived = false,
}) {
  if (!deadlineDate) return null;

  if (isWaived) return "WAIVED";
  if (isCompleted) return "COMPLETED";

  const now = today();
  const deadline = normalizeDate(deadlineDate);
  const days = daysBetween(deadline, now);

  if (days < 0) return "CRITICAL";
  if (days === 0) return "DUE_TODAY";
  if (days <= RISK_THRESHOLDS.HIGH) return "HIGH";
  if (days <= RISK_THRESHOLDS.MEDIUM) return "MEDIUM";
  if (days <= RISK_THRESHOLDS.LOW) return "LOW";

  return "UPCOMING";
}

export function getRiskLabel(state) {
  switch (state) {
    case "CRITICAL":
      return "Critical";
    case "HIGH":
    case "DUE_TODAY":
      return "High";
    case "MEDIUM":
      return "Medium";
    default:
      return "Low";
  }
}

export function shouldTriggerAlert({
  state,
  hasTriggered = false,
}) {
  if (!state) return false;
  if (state === "COMPLETED" || state === "WAIVED") return false;
  if (hasTriggered) return false;

  return (
    state === "HIGH" ||
    state === "CRITICAL" ||
    state === "DUE_TODAY"
  );
}

export function shouldSuggestAddendum({
  state,
  isCompleted,
  isWaived,
}) {
  if (isCompleted || isWaived) return false;
  return state === "HIGH" || state === "CRITICAL";
}

export function evaluateDeadline(deadline) {
  const {
    date,
    completed,
    waived,
    alertSent,
    type,
  } = deadline;

  const state = getDeadlineState({
    deadlineDate: date,
    isCompleted: completed,
    isWaived: waived,
  });

  return {
    type,
    date,
    state,
    risk: getRiskLabel(state),
    shouldAlert: shouldTriggerAlert({
      state,
      hasTriggered: alertSent,
    }),
    suggestAddendum: shouldSuggestAddendum({
      state,
      isCompleted: completed,
      isWaived: waived,
    }),
  };
}

export function evaluateTransactionDeadlines(deadlines = []) {
  return deadlines.map(evaluateDeadline);
}

export function getNextActiveDeadline(deadlines = []) {
  const active = deadlines
    .filter(d => !d.completed && !d.waived)
    .map(d => ({
      ...d,
      normalized: normalizeDate(d.date),
    }))
    .sort((a, b) => a.normalized - b.normalized);

  return active.length ? active[0] : null;
}

export function getAlertableDeadlines(transaction = {}) {
  if (!transaction) return [];

  const deadlinesList = [
    { type: "inspection", date: transaction.inspection_deadline, label: "Inspection", completed: transaction.inspection_completed },
    { type: "appraisal", date: transaction.appraisal_deadline, label: "Appraisal" },
    { type: "financing", date: transaction.financing_deadline, label: "Financing" },
    { type: "due_diligence", date: transaction.due_diligence_deadline, label: "Due Diligence" },
    { type: "earnest_money", date: transaction.earnest_money_deadline, label: "Earnest Money", completed: transaction.earnest_money_received },
    { type: "closing", date: transaction.closing_date, label: "Closing" },
  ].filter(d => d.date);

  return deadlinesList.map(dl => {
    const state = getDeadlineState({
      deadlineDate: dl.date,
      isCompleted: dl.completed,
      isWaived: false,
    });

    const now = today();
    const deadline = normalizeDate(dl.date);
    const daysRemaining = deadline ? daysBetween(deadline, now) : null;

    return {
      ...dl,
      evaluation: {
        state,
        isOverdue: state === "CRITICAL",
        isDueSoon: state === "HIGH" || state === "DUE_TODAY",
        daysRemaining: daysRemaining >= 0 ? daysRemaining : 0,
      },
    };
  });
}
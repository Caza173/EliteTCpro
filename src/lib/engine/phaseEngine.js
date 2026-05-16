/**
 * EliteTC Phase Engine
 * Determines transaction phase state deterministically.
 * NO AI involvement.
 */

import { PHASE_STRING_TO_NUM, CLOSED_STATUSES } from "./constants.js";
import { getDaysUntil } from "./deadlineEngine.js";

const PHASE_SEQUENCE = [
  { key: "intake",         label: "Intake",         num: 1 },
  { key: "under_contract", label: "Under Contract",  num: 2 },
  { key: "inspection",     label: "Inspection",      num: 3 },
  { key: "financing",      label: "Financing",       num: 4 },
  { key: "appraisal",      label: "Appraisal",       num: 5 },
  { key: "clear_to_close", label: "Clear to Close",  num: 6 },
  { key: "closing",        label: "Closing",         num: 7 },
  { key: "closed",         label: "Closed",          num: 8 },
];

/**
 * Build phase state for a transaction.
 * @param {object} tx        - Transaction record
 * @param {array}  txTasks   - TransactionTask records
 * @param {object} deadlines - Output from buildDeadlines()
 */
export function buildPhaseState(tx, txTasks = [], deadlines = {}) {
  const isClosed = CLOSED_STATUSES.has((tx.status || "").toLowerCase());
  const phaseStr = (tx.transaction_phase || "intake").toLowerCase();
  const phaseNum = PHASE_STRING_TO_NUM[phaseStr] || 1;

  // Completed phases from DB
  const phasesCompleted = tx.phases_completed || [];

  // Task completion rate for current phase
  const phaseTasks        = txTasks.filter(t => t.phase === phaseNum);
  const completedTasks    = phaseTasks.filter(t => t.is_completed);
  const taskCompletionPct = phaseTasks.length > 0
    ? Math.round((completedTasks.length / phaseTasks.length) * 100)
    : 0;

  // Overall progress = (completedPhases / totalPhases) + partial credit from tasks
  const totalPhases     = PHASE_SEQUENCE.length;
  const completedPhaseCount = phasesCompleted.length;
  const phaseProgress   = isClosed ? 100
    : Math.round(((completedPhaseCount + (taskCompletionPct / 100)) / totalPhases) * 100);

  // Determine next action
  const nextAction = determineNextAction(tx, phaseStr, txTasks, deadlines);

  // Blocked phases
  const blockedPhases = [];
  if (!tx.is_cash_transaction && phaseNum < PHASE_STRING_TO_NUM["financing"]) {
    if (!tx.financing_deadline) {
      blockedPhases.push({ phase: "financing", reason: "Financing deadline not set." });
    }
  }

  return {
    currentPhase:      phaseStr,
    currentPhaseLabel: PHASE_SEQUENCE.find(p => p.key === phaseStr)?.label || phaseStr,
    phaseNum,
    phaseProgress:     Math.min(100, Math.max(0, phaseProgress)),
    phasesCompleted,
    taskCompletionPct,
    phaseTasks:        phaseTasks.length,
    completedTasks:    completedTasks.length,
    blockedPhases,
    nextAction,
    isClosed,
  };
}

function determineNextAction(tx, phase, txTasks, deadlines) {
  const isClosed = CLOSED_STATUSES.has((tx.status || "").toLowerCase());
  if (isClosed) return null;

  // Find first incomplete required task in current phase num
  const phaseNum = PHASE_STRING_TO_NUM[phase] || 1;
  const firstIncomplete = txTasks
    .filter(t => t.phase === phaseNum && !t.is_completed && t.is_required)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))[0];

  if (firstIncomplete) return `Complete task: "${firstIncomplete.title}"`;

  // Phase-specific default actions
  const actions = {
    intake:         "Upload Purchase & Sale Agreement to begin processing.",
    under_contract: "Confirm all parties and schedule inspection.",
    inspection:     "Track inspection completion and upload report.",
    financing:      "Monitor financing commitment deadline.",
    appraisal:      "Confirm appraisal is ordered and track deadline.",
    clear_to_close: "Confirm CTC from lender and prepare closing docs.",
    closing:        "Prepare for closing — verify all documents are signed.",
    closed:         null,
  };

  // Override with overdue deadline if present
  const overdue = (deadlines.overdueDeadlines || [])[0];
  if (overdue) return `Resolve overdue deadline: ${overdue.label}.`;

  const next = (deadlines.nextCriticalDeadline);
  if (next) return `Upcoming: ${next.label} — ${next.displayLabel}.`;

  return actions[phase] || null;
}
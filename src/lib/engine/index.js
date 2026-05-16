/**
 * EliteTC Transaction Intelligence Engine — Public API
 *
 * Import everything from here. Do not import sub-engines directly in UI components.
 */
export { buildTransactionInsights } from "./transactionInsightsBuilder.js";
export { buildDeadlines, getDaysUntil, getTodayNY, normalizeDateStr } from "./deadlineEngine.js";
export { buildCompliance } from "./complianceEngine.js";
export { buildDocumentRequirements } from "./documentEngine.js";
export { buildRiskProfile } from "./riskEngine.js";
export { buildPhaseState } from "./phaseEngine.js";
export * from "./constants.js";
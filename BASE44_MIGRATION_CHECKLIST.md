# Base44 Migration Checklist

Last updated: 2026-05-06
Scope: active app under `src/`, `backend/`, and `base44/`

## Completed in current migration state

- [x] Root frontend build no longer depends on `@base44/vite-plugin`
- [x] Root package no longer depends on `@base44/sdk`
- [x] Added Express backend scaffold under `backend/`
- [x] Added JWT auth flow and frontend session storage
- [x] Replaced active app auth redirects with router-native `/TCSignIn?next=...`
- [x] Removed direct `base44.auth.*` usage from the active `src/` app control path
- [x] Replaced active `RequireAuth` redirect logic with native route redirect handling
- [x] Replaced `AuthContext` and `CurrentUserContext` direct Base44 auth calls with `authApi`
- [x] Replaced `useDealAccess` Base44 function fetch with direct transaction REST fetch
- [x] Changed `useDealAccess.canAccess()` from fail-open to fail-closed
- [x] Added backend ownership filter on transaction list route
- [x] Migrated these screens off entity-style transaction reads:
  - `src/pages/PendingDeals.jsx`
  - `src/pages/Tasks.jsx`
  - `src/pages/Deadlines.jsx`
  - `src/pages/Documents.jsx`
- [x] Migrated `src/pages/Transactions.jsx` to direct REST transaction hooks
- [x] Migrated `src/pages/TransactionDetail.jsx` to direct REST transaction detail/update/delete hooks
- [x] Migrated `src/pages/TransactionDetail.jsx` related resource reads to REST hooks for tasks, checklist items, documents, compliance reports, and comm automations
- [x] Migrated `src/pages/TransactionDetail.jsx` portal and generic email workflows to `portalApi` and `emailApi`
- [x] Migrated TransactionDetail child resource components off Base44 for active task/checklist/document/compliance/comm paths:
  - `src/components/transactions/DocChecklistPanel.jsx`
  - `src/components/transactions/TransactionDocumentsTab.jsx`
  - `src/components/issues/IssueDetectionPanel.jsx`
  - `src/components/comms/UnderContractCommsPanel.jsx`
  - `src/components/comms/CommMessageCard.jsx`
  - `src/components/comms/FinancialCommitmentEmail.jsx`
  - `src/components/transactions/UnifiedPhaseBoard.jsx`
  - `src/components/transactions/PhaseTaskPanelV2.jsx`
  - `src/components/email/EmailComposerModal.jsx`
  - `src/components/compliance/EmailGeneratorModal.jsx`
- [x] Migrated TransactionDetail document/compliance/signature infrastructure off Base44:
  - `src/components/transactions/TransactionDocumentsTab.jsx` now uses backend upload + compliance scan + signature APIs
  - `src/components/signature/SendForSignatureModal.jsx`
  - `src/components/signature/SignatureRequestsPanel.jsx`
  - `src/components/signature/SignatureBlockBanner.jsx`
  - `src/components/signature/SignatureAuditTrailModal.jsx`
  - `src/components/signature/RequestSignatureModal.jsx`
  - `src/components/compliance/ComplianceScanPanel.jsx`
  - `src/components/compliance/ComplianceMonitorWidget.jsx`
- [x] Replaced the hybrid storage layer with S3-only object-key storage, signed URL generation, upload middleware, and document/temp upload routes under `backend/src/services/storage/`, `backend/src/middleware/upload.ts`, `backend/src/routes/documents.ts`, and `backend/src/routes/uploads.ts`
- [x] Added backend transaction-scoped compliance scan service and scan-status routes under `backend/src/services/compliance/` and `backend/src/routes/compliance-reports.ts`
- [x] Added backend signature request provider abstraction and REST routes under `backend/src/services/signatures/` and `backend/src/routes/signature-requests.ts`
- [x] Migrated document list/delete reads to REST client in `src/pages/Documents.jsx`
- [x] Frontend build passes after these changes
- [x] Backend TypeScript build passes after these changes

## Authentication and session

- [x] `src/components/auth/RequireAuth.jsx`
- [x] `src/lib/AuthContext.jsx`
- [x] `src/lib/CurrentUserContext.jsx`
- [x] `src/pages/Landing.jsx` login redirects
- [x] `src/pages/PortalSelect.jsx` login redirects
- [x] `src/pages/TCSignIn.jsx`
- [x] `src/lib/app-params.js` no longer uses Base44 token/cookie naming
- [ ] Remove compatibility auth shim from `src/api/base44Client.js` once remaining callers are gone

## Transaction ownership and REST migration

### Already moved to REST reads

- [x] `src/lib/useDealAccess.js`
- [x] `src/pages/PendingDeals.jsx`
- [x] `src/pages/Tasks.jsx`
- [x] `src/pages/Deadlines.jsx`
- [x] `src/pages/Documents.jsx`

### Still using Base44 transaction entities or functions in active app

- [ ] `src/pages/AddTransaction.jsx`
- [ ] `src/pages/AddendumBuilder.jsx`
- [ ] `src/pages/AuditLog.jsx`
- [ ] `src/pages/AgentIntake.jsx`
- [ ] `src/pages/AgentSubmitTransaction.jsx`
- [ ] `src/pages/Dashboard.jsx`
- [ ] `src/pages/Settings.jsx`
- [x] `src/pages/Transactions.jsx`
- [ ] `src/pages/TransactionDetail.jsx` still has limited Base44 dependencies in the detail slice:
  - `AuditLog`
  - `InAppNotification`
  - `src/components/tasks/TaskEmailTrigger.jsx` still depends on Base44 task-email workflow
- [ ] `src/pages/UserManagement.jsx`
- [ ] `src/pages/onboarding/Step3Transaction.jsx`
- [ ] `src/components/ai/TCAIAssistant.jsx`
- [ ] `src/components/commission/StatementFormModal.jsx`
- [ ] `src/components/fuel/FuelProrationFormModal.jsx`
- [ ] `src/components/intake/IntakePendingReviews.jsx`
- [ ] `src/components/tasks/ReviewEmailModal.jsx`
- [ ] `src/components/tasks/UtilityDraftModal.jsx`

## Document upload and retrieval

### Retrieval partially migrated

- [x] `src/pages/Documents.jsx` document list/delete uses REST client

### Still using Base44 upload or document creation paths

- [x] `src/pages/Documents.jsx` upload path moved to backend documents API
- [x] `src/pages/Documents.jsx` checklist updates moved off Base44 entities
- [x] `src/pages/AgentIntake.jsx` upload path moved to backend temp uploads; authenticated submissions now attach document metadata through the REST documents API
- [x] `src/pages/AgentSubmitTransaction.jsx`
- [x] `src/pages/onboarding/Step4Document.jsx`
- [x] `src/components/forms/PurchaseAgreementUpload.jsx`
- [x] `src/components/intake/ContractIntakeModal.jsx`
- [x] `src/pages/SetupProfile.jsx` media uploads
- [x] `src/components/settings/ProfileTab.jsx` media uploads
- [x] `src/components/settings/BrokerageLogoUpload.jsx` media uploads
- [x] `src/components/commission/StatementDetailModal.jsx` PDF upload handoff
- [x] `src/components/templates/TemplateUploadModal.jsx`
- [x] `src/components/templates/TemplateLibraryPanel.jsx`

## Dashboard and notifications

- [ ] `src/pages/Dashboard.jsx`
- [ ] `src/pages/Notifications.jsx`
- [ ] `src/pages/AuditLog.jsx`
- [ ] `src/components/utils/tenantUtils.jsx`
- [ ] `src/components/feedback/MyFeedbackSection.jsx`

## Deadline engine and task automation

- [ ] `src/pages/DeadlineResponse.jsx`
- [ ] `src/pages/Notifications.jsx` (`deadlineEngine` invocation)
- [ ] `src/pages/Deadlines.jsx` still reads `TransactionTask` via Base44 entities
- [x] `src/pages/TransactionDetail.jsx` task/deadline/compliance/document/comms subqueries moved to REST hooks
- [ ] `src/components/tasks/TaskEmailTrigger.jsx`
- [ ] `src/components/tasks/TaskLibraryModal.jsx`
- [ ] `base44/functions/deadlineEngine/**`
- [ ] `base44/functions/deadlineResponse/**`
- [ ] `base44/functions/syncDeadlineAlerts/**`
- [ ] `base44/functions/sendDeadlineAlerts/**`

## AI and automation

- [ ] `src/components/ai/TCAIAssistant.jsx`
- [ ] `src/components/ai/GlobalAIAssistant.jsx`
- [ ] `src/components/feedback/FeedbackModal.jsx` still creates `FeedbackItem` via Base44 entity and triggers Base44 triage function
- [ ] `src/pages/AddendumBuilder.jsx`
- [ ] `base44/functions/complianceEngine/**`
- [ ] `base44/functions/parsePurchaseAgreementV2/**`
- [ ] `base44/functions/parseListingAgreement/**`
- [ ] `base44/functions/transactionIntelligenceAgent/**`
- [ ] `base44/functions/superagentMonitor/**`
- [ ] `base44/functions/superagentDeadlineMonitor/**`
- [ ] `base44/functions/superagentWeeklySummary/**`

## Billing, templates, admin, and portal flows

- [ ] `src/pages/Billing.jsx`
- [ ] `src/pages/ClientLookup.jsx`
- [ ] `src/pages/CommissionStatements.jsx`
- [ ] `src/pages/FuelProrations.jsx`
- [ ] `src/pages/Invoices.jsx`
- [ ] `src/pages/Settings.jsx`
- [ ] `src/pages/Templates.jsx`
- [ ] `src/pages/TemplateManager.jsx`
- [ ] `src/pages/UserManagement.jsx`
- [ ] `src/components/portal/ContactModal.jsx`
- [ ] `src/components/portal/TransactionUpdateModal.jsx`
- [ ] `src/components/user/PortalAccessCell.jsx`
- [ ] `src/components/user/PortalAccessSendModal.jsx`

## Signature and email service functions still on Base44

- [ ] `src/pages/SignDocument.jsx`
- [ ] `src/components/clauses/AddendumPreview.jsx`
- [ ] `src/components/notes/NoteEmailModal.jsx`
- [ ] `src/components/tasks/ReviewEmailModal.jsx`
- [ ] `src/components/tasks/UtilityDraftModal.jsx`
- [ ] `base44/functions/signatureService/**`
- [ ] `base44/functions/createSignatureRequest/**`
- [ ] `base44/functions/getSignatureStatus/**`
- [ ] `base44/functions/sendEmail/**`
- [ ] `base44/functions/sendGmailEmail/**`

## Backend Base44 runtime still present

- [ ] `base44/functions/**` remains the largest unmigrated surface
- [ ] Priority function families to port next:
  - `createTransaction`
  - `updateTransaction`
  - `deleteTransaction`
  - `claimDeal`
  - `submitIntake`
  - `createTransactionFromContract`
  - `createDocument`
  - `deleteDocument`
  - `getTeamTransactions`
  - `deadlineEngine`

## Duplicate app tree

- [ ] `EliteTC_PR/` is still a full duplicate Base44 app tree
- [ ] Decide whether `EliteTC_PR/` is archival or active before migrating it
- [ ] Keep it out of the primary migration path until the main app is stable

## Notes

- Direct Base44 auth usage in the active `src/` app has been removed from the primary auth path.
- The remaining Base44 dependency in the active app is now mostly entity CRUD, file upload, Base44 function invocation, and AI/integration surfaces.
- Compatibility shims are still active in `src/api/base44Client.js` and should only be removed after the above callers are migrated.
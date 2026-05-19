# EliteTC — Phase 4 System Audit
**Generated: 2026-05-19**
**Purpose: Pre-implementation architectural audit before any Phase 4 work**

---

## EXECUTIVE SUMMARY

The EliteTC codebase is **more consolidated than expected**. Core engines already exist and are well-structured. The primary issues are:

1. **Deadline logic is duplicated in 4 places** (backend functions re-implement what the frontend engine already does cleanly)
2. **`isTransactionClosed()` is copy-pasted in every backend function** instead of being shared
3. **Two backend notification engines** (`deadlineEngine` + `notificationEngine`) run overlapping logic
4. **Calendar sync has two separate services** (appointments vs transaction deadlines) with no shared abstraction
5. **Compliance deadline checks in `complianceEngine` function** duplicate the frontend `lib/engine/complianceEngine.js`
6. **No feature flags** — all systems run unconditionally

---

## SYSTEM MAP

### ── FRONTEND ENGINES (lib/engine/) ──────────────────────────────────────────

| File | Purpose | Status |
|------|---------|--------|
| `lib/engine/index.js` | Public API — single import point | ✅ Well-structured |
| `lib/engine/constants.js` | DEADLINE_FIELDS, PHASES, RISK_WEIGHTS, CLOSED_STATUSES | ✅ Single source of truth |
| `lib/engine/deadlineEngine.js` | buildDeadlines(), getDaysUntil(), normalizeDateStr() | ✅ Correct, deterministic |
| `lib/engine/complianceEngine.js` | buildCompliance() — rule-based, reads DB ComplianceReport | ✅ Correct |
| `lib/engine/documentEngine.js` | buildDocumentRequirements() — required/missing docs | ✅ Correct |
| `lib/engine/riskEngine.js` | buildRiskProfile() — score + risk factors | ✅ Correct |
| `lib/engine/phaseEngine.js` | buildPhaseState() — phase progress, next action | ✅ Correct |
| `lib/engine/transactionInsightsBuilder.js` | **THE ORCHESTRATOR** — calls all sub-engines | ✅ Excellent |

**Assessment: Frontend engine layer is the gold standard. All other systems should defer to it.**

---

### ── BACKEND FUNCTIONS ─────────────────────────────────────────────────────

| Function | Purpose | Issues |
|----------|---------|--------|
| `functions/deadlineEngine` | Scheduled: scan transactions → create InAppNotifications | ⚠️ Duplicates constants from `lib/engine/constants.js` |
| `functions/notificationEngine` | Scheduled: ALSO scans transactions → create InAppNotifications + SNS | 🔴 OVERLAPS with deadlineEngine — two functions doing same job |
| `functions/complianceEngine` | AI document scan + deadline checks + ComplianceIssue creation | ⚠️ Has its OWN inline deadline evaluation loop |
| `functions/syncTransactionDeadlinesToCalendar` | Syncs deadline dates to Google Calendar via CalendarEventMap | ✅ Idempotent via CalendarEventMap |
| `functions/syncAppointmentToCalendar` | Syncs Appointment entity to Google Calendar | ✅ Idempotent via google_calendar_event_id |
| `functions/underContractAutomation` | Generate CommAutomation records + send under-contract emails | ✅ Correct |
| `functions/notificationEngine` | Advanced: reads ComplianceIssue.status=open, deduplicates | ✅ Has better dedup logic than deadlineEngine |

---

### ── DATE / DEADLINE UTILITIES ─────────────────────────────────────────────

| Location | Function | Issue |
|----------|----------|-------|
| `utils/dateUtils.js` | `getTodayLocal()`, `getDaysUntil()`, `normalizeDeadline()` | ✅ Frontend canonical |
| `lib/deadlineUtils.js` | Re-exports from `utils/dateUtils.js` | ✅ Thin shim, fine |
| `lib/engine/deadlineEngine.js` | `getTodayNY()`, `normalizeDateStr()`, `getDaysUntil()` | ✅ Slightly different names but same logic |
| `functions/deadlineEngine` | Inline `getTodayStr()`, `normalizeDate()`, `getDaysUntil()` | 🔴 Copy-paste of frontend logic |
| `functions/notificationEngine` | Inline `getTodayStr()`, `normalizeDate()`, `getDaysUntil()` | 🔴 Copy-paste of frontend logic |
| `functions/syncTransactionDeadlinesToCalendar` | Inline `nextDay()`, `buildLocalDateTime()`, `addHours()` | ⚠️ Calendar-specific, acceptable |
| `functions/complianceEngine` | Inline `new Date()` + `Math.ceil()` for deadline days | 🔴 Does NOT use noon-force fix — timezone bug risk |

**Root cause: Deno backend functions cannot import from `lib/` (frontend code). Each function must inline or call another function.**

---

### ── CLOSED TRANSACTION STATUS CHECK ──────────────────────────────────────

`isTransactionClosed()` is copy-pasted in **6 places**:

1. `lib/transactionStatusHelpers.js` — canonical frontend version
2. `lib/engine/constants.js` — `CLOSED_STATUSES` Set (used by all lib/engine/* files)
3. `functions/deadlineEngine` — inline function
4. `functions/notificationEngine` — inline function
5. `functions/complianceEngine` — inline function (shorter list, **BUG: missing "withdrawn", "expired", "cancelled", "canceled", "terminated"**)
6. Various frontend components — use `lib/transactionStatusHelpers.js` correctly

**ACTION: `functions/complianceEngine` has an incomplete closed-status list. Must be fixed.**

---

### ── NOTIFICATION SYSTEM ───────────────────────────────────────────────────

**Two overlapping backend notification engines exist:**

#### `functions/deadlineEngine` (older)
- Simple: scans active transactions, checks 6 DEADLINE_FIELDS
- Alert windows: <=1d, 3d, 7d
- Creates InAppNotification records
- No SNS publishing
- No compliance alert evaluation
- Targets: `status: 'active'` only (misses pending transactions)

#### `functions/notificationEngine` (newer, more complete)
- Scans ALL non-closed transactions (better)
- Checks 8 DEADLINE_FIELDS (includes `agreement_expiration_deadline`, `ctc_target`)
- Alert windows: 0,1,2,3,7 days
- Creates InAppNotification records
- Publishes SNS alerts
- Evaluates ComplianceIssue.status='open' blockers
- Reads Contingency records for deadline overrides
- Writes AuditLog entries
- Has `dry_run` mode

**VERDICT: `notificationEngine` is the superior implementation. `deadlineEngine` is redundant.**
**ACTION: Deprecate `functions/deadlineEngine`, route all automation to `functions/notificationEngine`.**

---

### ── CALENDAR SYNC SYSTEM ──────────────────────────────────────────────────

**Two separate calendar sync services with NO shared abstraction:**

#### `functions/syncTransactionDeadlinesToCalendar`
- Syncs: Transaction deadline fields (DEADLINE_FIELDS array)
- Idempotency: CalendarEventMap entity (field_key → google_calendar_event_id)
- Update-in-place: YES (PUT existing event, create if 404)
- Bulk mode: Supported
- Uses: `CalendarEventMap` entity for persistence
- Timezone: America/New_York (default)

#### `functions/syncAppointmentToCalendar`
- Syncs: Appointment entity records
- Idempotency: `Appointment.google_calendar_event_id` field
- Update-in-place: YES (PATCH existing)
- Bulk mode: NOT supported (single appointment only)
- Uses: `Appointment` entity fields directly
- Timezone: America/Denver (hardcoded — **INCONSISTENCY**)

**VERDICT: Two services, two persistence mechanisms, two different timezones.**
**ACTION: Create a shared calendar helper that both can call. Fix timezone to use user's configured timezone or the CalendarEventMap approach consistently.**

---

### ── COMPLIANCE SYSTEM ─────────────────────────────────────────────────────

**Two compliance evaluation paths:**

#### Path 1: Frontend Rules Engine (`lib/engine/complianceEngine.js`)
- Pure deterministic rules (lead paint, missing dates, overdue deadlines)
- Reads ComplianceReport records from DB (AI scan results)
- Returns structured ComplianceResult
- Used by: TransactionDetail, dashboard, insights builder

#### Path 2: Backend AI Scan (`functions/complianceEngine`)
- Does its OWN deadline evaluation (re-implements deadline checks)
- Does AI document scanning (PDF + LLM)
- Writes ComplianceReport and ComplianceIssue to DB
- Auto-marks transaction `risk_level: "at_risk"` if blockers found
- Auto-sends email if blockers detected

**OVERLAP: `functions/complianceEngine` re-calculates deadline issues inline instead of calling the deadline engine. These results are stored in ComplianceIssue and then READ by `lib/engine/complianceEngine.js`. So the flow is:**

```
functions/complianceEngine → stores ComplianceIssue (source: "deadline_check")
lib/engine/complianceEngine.js → reads ComplianceReport.blockers (source: "compliance_report")
functions/notificationEngine → reads ComplianceIssue.status='open'
```

**This is a legitimate separation: backend writes, frontend reads. But the deadline recalculation in the backend is using a simpler, less correct date math.**

---

### ── TASK SYSTEM ───────────────────────────────────────────────────────────

| Location | Purpose | Status |
|----------|---------|--------|
| `lib/taskLibrary.js` | Phase/task templates, `generateTasksForPhase()`, `isPhaseComplete()` | ✅ Single authoritative source |
| `functions/seedPhaseTasks` | Backend function to seed tasks from taskLibrary for a transaction | ✅ Correct |
| `functions/toggleTask` | Backend toggle task is_completed | ✅ Simple, correct |
| `entities/TransactionTask` | Persistent task records | ✅ Correct |
| `entities/WorkflowTemplate` | Custom workflow templates per brokerage | ✅ Exists, used by TemplateManager |
| `entities/TaskTemplate` | Phase-level task templates | ✅ Exists |

**Assessment: Task system is well-consolidated. No critical duplication.**

---

### ── TRANSACTION STATE MACHINE ────────────────────────────────────────────

Current state fields on Transaction:
- `status`: "pending" | "active" | "closed" | "cancelled"
- `transaction_phase`: 8-value enum (intake → closed)
- `pipeline_stage`: free-text string
- `phase`: number (1-9)
- `phases_completed`: array of numbers
- `health_score`: number (0-100)
- `risk_level`: "on_track" | "watch" | "at_risk"

**Issues:**
- `status` and `transaction_phase` partially overlap in meaning
- `phase` (number) vs `transaction_phase` (string) — two parallel representations
- `risk_level` can be set by `functions/complianceEngine` AND `lib/engine/riskEngine.js` — no single authority
- No backend-enforced transition rules — frontend can set any phase/status combination

---

### ── AI PARSING SYSTEM ────────────────────────────────────────────────────

| Function | Purpose | Stores Results In |
|----------|---------|-------------------|
| `parsePurchaseAgreement` | Parse P&S PDF → extract fields | Direct response (not stored) |
| `parsePurchaseAgreementV2` | Enhanced P&S parsing | Direct response |
| `parseBuyerAgencyAgreement` | Parse buyer agency agreement | Direct response |
| `parseListingAgreement` | Parse listing agreement | Direct response |
| `parseTemplateDocument` | Parse uploaded workflow template | Direct response |
| `createTransactionFromContract` | Parse + create Transaction record | Transaction entity |

**Assessment: AI parsing is already well-structured. Outputs go to caller, not auto-applied to state. `createTransactionFromContract` is the only one that writes to DB, which is correct.**

---

### ── ACTIVITY / AUDIT LOG ─────────────────────────────────────────────────

| System | Entity | Status |
|--------|--------|--------|
| `AuditLog` entity | Core audit trail — action, actor, before/after | ✅ Used by most backend functions |
| `AIActivityLog` entity | AI-specific actions | ✅ Separate, good |
| Frontend `TransactionActivityFeed` component | Reads AuditLog | ✅ Reads correctly |
| `functions/notificationEngine` | Writes AuditLog entries | ✅ |
| `functions/underContractAutomation` | Writes AuditLog entries | ✅ |
| `functions/complianceEngine` | Does NOT write AuditLog | ⚠️ Gap |

---

### ── POLLING / REALTIME SUBSCRIPTIONS ────────────────────────────────────

- No uncontrolled realtime subscriptions observed
- Most data fetching uses `@tanstack/react-query` with reasonable stale times
- `base44.entities.*.subscribe()` used in notification bell component (controlled)
- No cascading subscription chains identified

---

### ── AUTOMATIONS (Scheduled) ─────────────────────────────────────────────

Need to verify what automations are currently running (list_automations needed).

Known automation functions:
- `notificationEngine` — should run hourly
- `deadlineEngine` — overlap with above (should be retired)
- `superagentMonitor` — AI monitoring
- `superagentWeeklySummary` — weekly AI summary
- `sendDeadlineAlerts` — another deadline-related function (may overlap)
- `syncDeadlineAlerts` — yet another (may overlap)
- `signatureReminderJob` — signature-specific reminders
- `contingencyMonitor` — contingency tracking
- `weeklyAgentUpdates` — weekly reports to agents

---

## DUPLICATION MAP

### CRITICAL DUPLICATIONS (must fix before Phase 4)

| Logic | Locations | Action |
|-------|-----------|--------|
| `isTransactionClosed()` | 5 backend functions (inline) | Create shared `isClosedStatus()` util inline in each — they CANNOT share a file. **Document the canonical list in comments.** Fix the incomplete list in `complianceEngine`. |
| `getDaysUntil()` / date math | `lib/engine/deadlineEngine.js`, `utils/dateUtils.js`, `functions/deadlineEngine`, `functions/notificationEngine`, `functions/complianceEngine` | Frontend: already unified. Backend: each function must inline — **ensure all use noon-force `T12:00:00` to prevent timezone shifts** |
| Notification creation logic | `functions/deadlineEngine` + `functions/notificationEngine` | **Retire `functions/deadlineEngine`**. Route automation to `functions/notificationEngine` only |
| Deadline alert evaluation | `functions/deadlineEngine` + `functions/notificationEngine` + `functions/complianceEngine` | Each has a purpose. `complianceEngine` should use simpler check (it does) — but **fix timezone math**. `deadlineEngine` should be retired |
| DEADLINE_FIELDS array | `lib/engine/constants.js` (7 fields), `functions/deadlineEngine` (6 fields, missing `ctc_target` + `agreement_expiration`), `functions/notificationEngine` (8 fields) | Document canonical list in each file — cannot share |

### ACCEPTABLE SEPARATIONS (by design)

| Separation | Reason |
|-----------|--------|
| Frontend `lib/engine/` vs backend `functions/` | Cannot share — different runtimes |
| Calendar: deadline sync vs appointment sync | Different data sources (Transaction fields vs Appointment entity) |
| Compliance: rules engine vs AI scanner | Different purposes — deterministic rules vs AI document analysis |
| Task library (frontend) vs seedPhaseTasks (backend) | Backend reads the same template structure |

---

## RISK REGISTER

| Risk | Severity | Status |
|------|----------|--------|
| `functions/deadlineEngine` + `functions/notificationEngine` both running → duplicate notifications | 🔴 HIGH | If both automations are active, users get doubled alerts |
| `complianceEngine` incomplete closed-status list → closed transactions get compliance scans | 🟡 MEDIUM | Will auto-mark risk_level on closed deals |
| Appointment calendar uses hardcoded `America/Denver` timezone | 🟡 MEDIUM | Wrong timezone for non-Colorado users |
| No feature flags for Phase 4 features | 🟡 MEDIUM | Cannot roll back without code deploy |
| Transaction state machine has no backend enforcement | 🟡 MEDIUM | Frontend can set any phase combination |
| `functions/complianceEngine` uses `Math.ceil` not noon-force for deadline math | 🟡 MEDIUM | Off-by-one-day errors near midnight |

---

## SAFE EXTENSION POINTS (for Phase 4)

The following systems are stable and can be safely extended:

1. **`lib/engine/transactionInsightsBuilder.js`** — Add new insight fields here. All dashboards consume this.
2. **`functions/notificationEngine`** — Add new notification types here. Has dedup + SNS + audit trail.
3. **`lib/taskLibrary.js`** — Add new task templates here. Structured, well-typed.
4. **`functions/syncTransactionDeadlinesToCalendar`** — Already idempotent. Extend DEADLINE_FIELDS array here.
5. **`entities/AuditLog`** — Every new action should write here. Schema is open.
6. **`entities/WorkflowTemplate`** — Extend for new workflow types.

---

## RECOMMENDED CONSOLIDATIONS (in priority order)

### Priority 1 — MUST DO before Phase 4
1. **Retire `functions/deadlineEngine`** (or disable its automation) — route to `notificationEngine` only
2. **Fix `functions/complianceEngine` closed-status list** — add missing statuses
3. **Fix `functions/complianceEngine` deadline math** — use noon-force T12:00:00 pattern
4. **Fix appointment calendar timezone** — use transaction timezone or America/New_York default

### Priority 2 — Improve before Phase 4
5. **Add comments to each backend function** documenting the canonical CLOSED_STATUSES and DEADLINE_FIELDS lists
6. **Add `complianceEngine` AuditLog writes** — currently silent
7. **Unify DEADLINE_FIELDS count** — `notificationEngine` has 8, others have 6. Ensure all use the same 7-8 fields.

### Priority 3 — Phase 4 new additions
8. **Feature flags** — Add `FeatureFlag` entity or simple check against `Brokerage.feature_flags` JSON
9. **Workflow orchestration** — Extend `functions/notificationEngine` or create `functions/workflowEngine` as event-bus entry point
10. **Transaction state machine** — Add backend validation in `functions/updateTransaction`

---

## WHAT DOES NOT EXIST YET (Phase 4 additions)

| Feature | Current State | Phase 4 Plan |
|---------|--------------|-------------|
| Feature flags | None | Add FeatureFlag entity or Brokerage.feature_flags JSON |
| Workflow automation rules | Manual tasks only | `functions/workflowEngine` — event-driven task creation |
| Notification deduplication tracking | Per-(tx+field) in InAppNotification | Already exists in notificationEngine |
| Automation loop prevention | None | Add `last_executed_at` + cooldown check in automation functions |
| Transaction state machine (backend-enforced) | None | Validation layer in `functions/updateTransaction` |
| Dependency-aware task orchestration | None | Extend taskLibrary with dependency graph |
| Centralized event bus | None | Can be implemented as `functions/eventBus` + `EventLog` entity |

---

## CONCLUSION

**The EliteTC codebase has a solid architectural foundation.** The frontend engine layer (`lib/engine/`) is well-designed and should be the reference implementation for all business logic.

**Phase 4 should:**
1. Fix the 4 Priority 1 issues above (safe, low-risk)
2. Retire `functions/deadlineEngine` in favor of `functions/notificationEngine`
3. Add feature flags infrastructure
4. Extend `functions/notificationEngine` as the event bus entry point
5. Layer workflow orchestration ON TOP of existing systems — never replacing them

**Phase 4 should NOT:**
- Rebuild the deadline engine (already excellent)
- Rebuild the compliance engine (already excellent)
- Create a parallel notification system (already has a good one)
- Create a new calendar sync service (the two existing ones work)
- Touch the frontend engine layer (it's the gold standard)
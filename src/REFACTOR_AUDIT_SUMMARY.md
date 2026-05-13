# EliteTC App Refactor Audit Summary
**Date:** 2026-05-13 | **Focus:** Transaction-driven centralized architecture

---

## Current State Assessment

### ✅ What's Working Well

1. **User Isolation**
   - `CurrentUserContext` provides authenticated user consistently
   - `getTeamTransactions` filters transactions by `created_by` (UUID) or `agent_email`
   - `createTransaction` stamps `created_by = user.id` (prevents user spoofing)
   - Super admin detection (`nhcazateam@gmail.com` → sees all)

2. **Deadline Logic (Centralized)**
   - `utils/dateUtils.js` is the single source of truth
   - Used by: `deadlineEngine` (backend), `Dashboard`, `TransactionDetail`
   - Consistent rules: America/New_York timezone, calendar-day comparisons
   - Functions: `getDaysUntil()`, `getDeadlineStatus()`, `getAlertLevel()`, `getAlertableDeadlines()`

3. **Notification Engine**
   - `notificationEngine` runs scheduled, creates `InAppNotification` records
   - Deduplicates: one active alert per (transaction_id + deadline_field)
   - Resolves alerts when deadline completed (task + flag)
   - Publishes SNS for external alerts
   - Writes `AuditLog` entries

4. **Contact Entity**
   - Has RLS: `owner_id` filters to current user
   - Used by: `Contacts` page, transaction fields
   - Reusable across transactions

5. **Transaction Entity**
   - Comprehensive schema (170+ fields)
   - Includes: property info, deadlines, tasks, contacts, compliance, finance
   - Open RLS (backend enforces in functions)

### ⚠️ Areas Needing Consolidation

1. **Transaction Access Filtering**
   - `Transaction` RLS is open (`create/read/update/delete: true`)
   - **Backend functions** enforce ownership via:
     - `createTransaction`: stamps `created_by`
     - `getTeamTransactions`: filters by `created_by` OR `agent_email`
     - `updateTransaction`: not inspected, assumed open
     - `deleteTransaction`: not inspected, assumed open
   - **Risk:** If `updateTransaction` or `deleteTransaction` don't enforce ownership, users could modify/delete others' deals
   
2. **Task/Checklist Isolation**
   - `TransactionTask` entity exists (not fully inspected)
   - No clear RLS or ownership enforcement visible
   - Should inherit `created_by` or link to transaction owner

3. **Document Upload Safety**
   - `Document` entity has RLS (brokerage-based)
   - Parser functions (`parsePurchaseAgreement`, etc.) not audited
   - **Risk:** If parser doesn't validate transaction ownership before saving

4. **Deadline Logic Duplication**
   - `utils/dateUtils.js` in frontend (used by UI)
   - `deadlineEngine` function duplicates logic (for backend)
   - Not a bug, but maintenance risk if rules diverge

5. **Contact Inline Data in Transactions**
   - `Transaction.additional_contacts` (array) stores contact objects inline
   - Also uses individual fields: `buyer`, `seller`, `inspector_name`, etc.
   - Mixing denormalized + normalized contact patterns
   - No clear `TransactionContact` linking strategy

6. **Notification Routing**
   - `notificationEngine` sends to `tx.agent_email`
   - But agents are not necessarily the transaction owner
   - Should verify agent is owner OR explicitly assigned

7. **Calendar Sync**
   - `syncTransactionDeadlinesToCalendar` function not inspected
   - Should only sync user's own transactions

### 🔴 Missing Pieces

1. **Backend Ownership Enforcement in Update/Delete**
   - `updateTransaction` needs to verify `created_by === user.id`
   - `deleteTransaction` needs to verify ownership

2. **Task Template → Property Type Mapping**
   - `WorkflowTemplate` and `TaskTemplate` entities exist (not inspected)
   - No clear rule: "buyer residential gets task set X, seller condo gets task set Y"

3. **Checklist Driven by Property Type**
   - `DocumentChecklistItem` exists
   - Should auto-generate based on `transaction.property_type`

4. **Commission/Finance Ownership**
   - `TransactionFinance` entity exists
   - Should inherit transaction owner restriction

5. **Approval Workflow RLS**
   - `Approval` entity has complex RLS (team-based)
   - **Conflicts with per-user goal** — not clear if this is intentional

6. **Team Logic**
   - Layout and `manageTeam` function exist
   - **Instruction says:** "Do not reintroduce team logic unless explicitly requested"
   - **Current state:** Team references in entities + functions exist but may be dormant

---

## Architecture Summary

### Transaction-Centric Model ✓
```
User (authenticated via base44.auth.me())
  ↓ created_by / agent_email
  └── Transaction (id, address, status, phase, deadline fields, contact fields, compliance_status)
        ├── TransactionTask (phase, title, is_completed, assigned_to_*) — **needs RLS**
        ├── Document (file_url, doc_type, is_deleted)
        ├── TransactionFinance (sale_price, commission, expenses) — **needs owner check**
        ├── DocumentChecklistItem (status, uploaded_document_id)
        ├── InAppNotification (deadline_field, deadline_type, severity) — **created by engine**
        └── AuditLog (action, before, after) — **created by system**
```

### Data Flow
- **Create:** `createTransaction` stamps `created_by = user.id`
- **List:** `getTeamTransactions` filters by `created_by OR agent_email`
- **Read:** `TransactionDetail` page (no explicit access check, relies on list)
- **Update:** `updateTransaction` **NOT AUDITED** — must enforce ownership
- **Delete:** `deleteTransaction` **NOT AUDITED** — must enforce ownership
- **Notifications:** `notificationEngine` creates `InAppNotification` for `tx.agent_email`

---

## Recommended Refactor Steps (Priority Order)

### Phase 1: Enforce Ownership at the Backend
1. **Add ownership checks to `updateTransaction` and `deleteTransaction`**
   - Before any mutation, verify `user.id === transaction.created_by`
   - Return 403 if not owner (unless admin)

2. **Add RLS to `TransactionTask`**
   - Link to transaction owner via `transaction_id`
   - Inherit read/update/delete rules from parent transaction

3. **Add RLS to `TransactionFinance` and `DocumentChecklistItem`**
   - Same pattern: link to transaction, inherit owner rule

### Phase 2: Notification Routing Fix
1. **Update `notificationEngine`**
   - Verify `tx.created_by` before sending notification
   - Send to transaction owner email, not `agent_email`
   - **OR** validate `agent_email === owner` if agents are explicitly assigned

### Phase 3: Contact Consolidation
1. **Normalize contact usage**
   - Decide: Use `Contact` entity + `TransactionContact` links **OR** denormalized `additional_contacts` array
   - Current: Mixed approach
   - **Recommendation:** Phase out inline contacts → `TransactionContact` junction table + `Contact` lookups

2. **Update `Contacts` page and transaction detail forms**
   - Use `TransactionContact.read` queries instead of inline arrays

### Phase 4: Task Template → Property Type Mapping
1. **Create or inspect `WorkflowTemplate` logic**
   - Define: "residential buyer" → task set, "condo seller" → task set, etc.
   - Link `transaction.property_type` to template during creation

2. **Auto-seed tasks on transaction create**
   - `createTransaction` → lookup template → seed `TransactionTask` records

### Phase 5: Checklist Auto-Generation
1. **Define property-type-specific document requirements**
   - "residential" → septic inspection, lead paint, etc.
   - "commercial" → different docs
   - Update `DocumentChecklistItem` creation logic

### Phase 6: Calendar Sync Audit
1. **Verify `syncTransactionDeadlinesToCalendar` only syncs user's own transactions**
   - Check ownership before syncing to calendar

### Phase 7: Parser Function Security Audit
1. **Audit all document parsers** (`parsePurchaseAgreement`, etc.)
   - Verify transaction ownership before saving extracted data
   - Prevent cross-user data leakage

---

## Key Rules to Enforce (Non-Negotiable)

1. **Every transaction belongs to ONE user** (the creator, `created_by`)
2. **User can only see/edit/delete their own transactions** (unless admin)
3. **Backend enforces ownership, frontend filters for UX**
4. **All deadline logic uses `utils/dateUtils.js`** (single source of truth)
5. **All notifications routed to transaction owner** (not arbitrary agents)
6. **All audit logs record who did what** (actor_email + action)

---

## Files to Modify (Proposed)

| File | Change | Priority |
|------|--------|----------|
| `functions/updateTransaction` | Add ownership check | **Phase 1** |
| `functions/deleteTransaction` | Add ownership check | **Phase 1** |
| `entities/TransactionTask.json` | Add RLS | **Phase 1** |
| `entities/TransactionFinance.json` | Add owner check or RLS | **Phase 1** |
| `entities/DocumentChecklistItem.json` | Add RLS | **Phase 1** |
| `functions/notificationEngine` | Route to owner, not agent | **Phase 2** |
| `functions/parsePurchaseAgreement*` | Verify transaction ownership | **Phase 7** |
| `functions/syncTransactionDeadlinesToCalendar` | Verify transaction ownership | **Phase 6** |
| `pages/Contacts` | Normalize to `TransactionContact` links | **Phase 3** |
| `WorkflowTemplate` usage | Define property-type mappings | **Phase 4** |
| `DocumentChecklistItem` creation | Auto-generate by property type | **Phase 5** |

---

## Next Steps

1. **Start Phase 1** (ownership enforcement) — highest security impact
2. **Verify existing data integrity** (are there orphaned transactions?)
3. **Add integration tests** for ownership rules (prevent regression)
4. **Document team logic decision** — is it being removed or kept dormant?
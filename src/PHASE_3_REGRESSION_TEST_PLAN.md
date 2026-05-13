# Phase 3 Regression Test Plan — Data Isolation Verification

**Purpose:** Verify that the ownership hardening completed in Phase 3 prevents cross-user data access.

**Status:** ⏳ READY FOR EXECUTION (Phase 3 acceptance gate)

**Test Window:** Before marking Phase 3 as complete

---

## Executive Summary

**Previous Bug:** Unrelated users could see each other's transactions, documents, tasks, and notifications.

**Fix Applied:** Ownership resolver + RLS + backend checks (Phase 3)

**This Test Confirms:** The bug does not regress.

---

## Test Environment Setup

### Prerequisites
- [ ] Two separate user accounts created (User A and User B in different emails)
- [ ] Both users registered and profile complete
- [ ] Both have "active" status
- [ ] Access to browser dev tools (network tab, console)
- [ ] Test environment logged in as User A first

---

## Test Case 1: User A Creates Transaction + Child Records

### 1.1 Create Transaction
**User:** User A  
**Action:** 
```
Dashboard → Create Transaction
Address: "123 Main St, Boston, MA 02101"
Type: Buyer
Status: Active
```

**Expected Result:** ✅ Transaction created, assigned ID (tx_abc123)

### 1.2 Upload Document
**User:** User A  
**Action:**
```
Transaction Detail → Documents Tab → Upload
File: sample_purchase_agreement.pdf
```

**Expected Result:** ✅ Document uploaded, appears in checklist

### 1.3 Create Task
**User:** User A  
**Action:**
```
Transaction Detail → Tasks Tab → New Task
Phase: 1
Title: "Review inspection report"
Required: True
```

**Expected Result:** ✅ Task created, visible in phase board

### 1.4 Add Checklist Item
**User:** User A  
**Action:**
```
Transaction Detail → Documents Tab
Mark item "Purchase & Sale Agreement" as "Uploaded"
```

**Expected Result:** ✅ Checklist status updated

### 1.5 Add Finance Record
**User:** User A  
**Action:**
```
Transaction Detail → Finance Tab → Commission
Sale Price: $350,000
Commission: 2.5%
```

**Expected Result:** ✅ Finance record created

### 1.6 Add Deadline
**User:** User A  
**Action:**
```
Transaction Detail → Deadlines → Set
Earnest Money Deadline: [today + 3 days]
Inspection Deadline: [today + 10 days]
```

**Expected Result:** ✅ Deadlines set, visible in calendar

### 1.7 Link Contact
**User:** User A  
**Action:**
```
Transaction Detail → Contacts → Add
Select existing or create: "John Smith (Buyer)"
```

**Expected Result:** ✅ Contact linked to transaction

### 1.8 Confirm Notification
**User:** User A  
**Action:**
```
Wait or trigger: Notifications → Check for deadline alert
OR Dashboard → Check for new alert card
```

**Expected Result:** ✅ Notification created (if within alert window)

---

## Test Case 2: Log Out User A, Log In User B

### 2.1 Logout
**User:** User A  
**Action:**
```
Top menu → Profile → Logout
OR Layout → Footer → Logout Button
```

**Expected Result:** ✅ Redirected to login page, session cleared

### 2.2 Login as User B
**User:** User B  
**Action:**
```
Email: user_b@example.com
Password: [User B password]
```

**Expected Result:** ✅ User B authenticated, Dashboard loads

### 2.3 Verify User B is Logged In
**Check:**
```
Profile menu → Shows "User B" name
Sidebar → Shows "User B" role
```

**Expected Result:** ✅ Correct user authenticated

---

## Test Case 3: User B Cannot See User A's Transaction

### 3.1 List View — Transaction Missing
**User:** User B  
**Action:**
```
Navigate to: Transactions page
Search/filter for "123 Main St" OR User A's transaction
```

**Expected Result:** ✅ User A's transaction (tx_abc123) NOT in list
- [ ] Transaction list shows User B's deals only
- [ ] Search for "123 Main" returns no results
- [ ] No transaction with User A's address appears

### 3.2 Direct URL Access — Blocked
**User:** User B  
**Action:**
```
Open DevTools → Copy Network request from User A's transaction detail
Construct URL: /transactions/tx_abc123
Navigate directly: [app-url]/transactions/tx_abc123
```

**Expected Result:** ✅ ONE of the following occurs:
- [ ] 404 Page Not Found (recommended)
- [ ] Redirected to /Transactions with no data
- [ ] Error toast "Transaction not found"
- [ ] Silent redirect to Dashboard

**Verify:**
```
Check DevTools Network:
  GET /transactions/tx_abc123
  Response Status: 404 OR Redirect OR 403
```

### 3.3 Check API Response
**User:** User B  
**Action:**
```
DevTools → Network → XHR/Fetch
Call: getTeamTransactions({ transaction_id: 'tx_abc123' })
OR manual API call via console
```

**Expected Result:** ✅ One of:
- [ ] `{ transactions: [], transaction: null }`
- [ ] `{ error: "Forbidden" }` (status 403)
- [ ] `{ error: "Not found" }` (status 404)

**Never:**
- [ ] ❌ `{ transactions: [User A's transaction], ... }`
- [ ] ❌ Return any User A transaction data

---

## Test Case 4: User B Cannot Access User A's Child Records

### 4.1 Document Access
**User:** User B  
**Action:**
```
Try to fetch document directly (if exposed):
  DevTools → Copy document ID from User A's transaction
  Attempt download or view
```

**Expected Result:** ✅ Document not accessible
- [ ] 404 or 403 error
- [ ] Document not found in User B's list
- [ ] Cannot download or view file

### 4.2 Task Access
**User:** User B  
**Action:**
```
API call: TransactionTask.list() (if exposed on dashboard)
Filter attempt: TransactionTask.filter({ transaction_id: 'tx_abc123' })
```

**Expected Result:** ✅ No tasks returned for User A's transaction
- [ ] RLS prevents read
- [ ] Task not in list
- [ ] Error if attempting direct fetch

### 4.3 Checklist Item Access
**User:** User B  
**Action:**
```
Transaction Detail (own transaction) → Documents Tab
Check for User A's checklist items
```

**Expected Result:** ✅ Only User B's checklist items visible
- [ ] User A's checklist items NOT shown
- [ ] Direct API fetch blocked

### 4.4 Finance Record Access
**User:** User B  
**Action:**
```
API call: TransactionFinance.filter({ transaction_id: 'tx_abc123' })
OR Finance tab on dashboard (if showing all)
```

**Expected Result:** ✅ Finance records isolated
- [ ] Cannot access User A's commission data
- [ ] 403 Forbidden or empty result

### 4.5 Deadline Access
**User:** User B  
**Action:**
```
Dashboard → Calendar (if showing all deadlines)
Check for User A's deadlines (earnest money, inspection, etc.)
```

**Expected Result:** ✅ Only User B's deadlines visible
- [ ] User A's deadline dates NOT shown
- [ ] User A's alerts NOT visible

### 4.6 Contact Access
**User:** User B  
**Action:**
```
Contacts Page → Search
Look for contacts User A linked (e.g., "John Smith")
```

**Expected Result:** ✅ Only User B's contacts visible
- [ ] User A's linked contacts NOT shown
- [ ] Direct API fetch: TransactionContact.filter({ transaction_id: 'tx_abc123' }) → blocked or empty

### 4.7 Notification Access
**User:** User B  
**Action:**
```
Notifications Page / InAppNotification list
Check for User A's deadline alerts
```

**Expected Result:** ✅ Only User B's notifications visible
- [ ] User A's deadline alert NOT shown
- [ ] User A's transaction NOT in notification body

### 4.8 Activity Log Access
**User:** User B  
**Action:**
```
If exposed: AuditLog query for User A's transaction
Check transaction's activity feed
```

**Expected Result:** ✅ Activity log isolated
- [ ] User A's audit entries NOT visible
- [ ] No cross-transaction activity leakage

---

## Test Case 5: User B Modifies Own Record — User A Unaffected

### 5.1 User B Edits Own Transaction
**User:** User B  
**Action:**
```
Transaction Detail (User B's own) → Edit
Change: address from "X" to "Y"
Save
```

**Expected Result:** ✅ User B's transaction updated
- [ ] Change persists
- [ ] Audit log shows User B as editor

### 5.2 Verify User A's Transaction Unaffected
**User:** User A (re-login)  
**Action:**
```
Log out User B
Log in as User A
Navigate to original transaction (tx_abc123)
```

**Expected Result:** ✅ User A's transaction unchanged
- [ ] Address still "123 Main St"
- [ ] All original records intact
- [ ] No spurious audit entries

---

## Test Case 6: Backend Validation

### 6.1 RLS Check — TransactionTask
**Test:** API directly call entity
```javascript
// In console or API tester, as User B:
await base44.entities.TransactionTask.filter({ transaction_id: 'tx_abc123' })
```

**Expected Result:** ✅ Empty array or RLS error
- [ ] Does NOT return User A's tasks
- [ ] RLS blocks based on `created_by`

### 6.2 RLS Check — TransactionFinance
**Test:** API directly call entity
```javascript
// As User B:
await base44.entities.TransactionFinance.filter({ transaction_id: 'tx_abc123' })
```

**Expected Result:** ✅ Empty array or RLS error
- [ ] Does NOT return User A's finance data

### 6.3 RLS Check — DocumentChecklistItem
**Test:** API directly call entity
```javascript
// As User B:
await base44.entities.DocumentChecklistItem.filter({ transaction_id: 'tx_abc123' })
```

**Expected Result:** ✅ Empty array or RLS error
- [ ] Does NOT return User A's checklist

### 6.4 Function Check — getTeamTransactions
**Test:** Backend function with transaction_id parameter
```javascript
// As User B:
await base44.functions.invoke('getTeamTransactions', { transaction_id: 'tx_abc123' })
```

**Expected Result:** ✅ One of:
- [ ] `{ transactions: [], transaction: null }`
- [ ] `{ error: "Forbidden" }`
- [ ] `{ error: "Not found" }`

### 6.5 Function Check — updateTransaction
**Test:** Attempt to update User A's transaction as User B
```javascript
// As User B:
await base44.functions.invoke('updateTransaction', {
  transaction_id: 'tx_abc123',
  data: { address: 'HACKED' }
})
```

**Expected Result:** ✅ Update rejected
- [ ] Returns error 403 or 404
- [ ] Update NOT applied to database

### 6.6 Function Check — deleteTransaction
**Test:** Attempt to delete User A's transaction as User B
```javascript
// As User B:
await base44.functions.invoke('deleteTransaction', {
  transaction_id: 'tx_abc123'
})
```

**Expected Result:** ✅ Delete rejected
- [ ] Returns error 403 or 404
- [ ] Record still exists in database

---

## Test Case 7: Notification Routing Isolation

### 7.1 Deadline Alert Routing
**Test:** Trigger a deadline alert manually (or wait for scheduled run)
```
Dashboard → manually trigger: deadlineEngine or notificationEngine
Observe: which user receives notification
```

**Expected Result:** ✅ Notifications route to correct owner
- [ ] User A gets notifications for User A's deadlines ONLY
- [ ] User B gets notifications for User B's deadlines ONLY
- [ ] No cross-user alert delivery

### 7.2 Check Notification Recipients (Backend)
**Test:** Inspect InAppNotification records created
```sql
SELECT * FROM InAppNotification 
WHERE transaction_id = 'tx_abc123'
AND created_date > [today]
```

**Expected Result:** ✅ Notifications match owner
- [ ] All notifications for User A's tx have `user_email = User A email`
- [ ] No entries with User B email

---

## Critical Fail Conditions (Stop Work If Any Occur)

### ❌ FAIL: User B sees User A's transaction in list
```
User B's Transactions page shows:
- "123 Main St" (User A's address)
- Any of User A's transaction IDs
```
**Action:** STOP → Fix ownership enforcement

### ❌ FAIL: User B accesses transaction detail
```
User B opens: /transactions/tx_abc123
Page loads successfully with User A's data
```
**Action:** STOP → Fix page-level access control

### ❌ FAIL: API returns User A's data to User B
```
getTeamTransactions returns tx_abc123 data when called as User B
TransactionTask.filter() returns User A's tasks to User B
```
**Action:** STOP → Fix RLS or backend filters

### ❌ FAIL: User B modifies User A's record
```
updateTransaction or deleteTransaction succeeds as User B on User A's tx
Record in database is modified
```
**Action:** STOP → Fix ownership verification

### ❌ FAIL: User B receives User A's notifications
```
User B's notification inbox contains alerts from User A's transactions
SNS or email routed to User B for User A's deadline
```
**Action:** STOP → Fix notification routing

---

## Sign-Off Criteria

**Phase 3 is COMPLETE when:**

- [ ] ALL Test Cases 1–7 pass without intervention
- [ ] NO critical fail conditions occur
- [ ] User A and User B data remains completely isolated
- [ ] Direct URL access to User A's tx as User B is blocked
- [ ] RLS enforces ownership at entity level
- [ ] Backend functions verify ownership before returning/modifying data
- [ ] Notifications route only to transaction owner
- [ ] Tester has verified at least 3 of the 6 backend API calls (6.1–6.6)

**Tester Name:** _______________  
**Date Tested:** _______________  
**All Checks Passed:** ☐ Yes ☐ No  
**Issues Found:** (list any failures below)

---

## Post-Test Actions

### If All Tests Pass ✅
- [ ] Update PHASE_3_REGRESSION_TEST_PLAN.md with sign-off date
- [ ] Mark Phase 3 as COMPLETE in REFACTOR_AUDIT_SUMMARY.md
- [ ] Proceed to Phase 4 (Document access + Parser security)

### If Any Test Fails ❌
- [ ] Document the exact failure (what happened vs. expected)
- [ ] Identify which component failed (RLS, function, page, etc.)
- [ ] Create bug ticket with reproduction steps
- [ ] FIX the issue before re-running tests
- [ ] Re-run failing test case + one adjacent test to confirm fix

---

## Appendix: Quick Reference

### Test User Accounts
```
User A: 
  Email: [test_user_a@example.com]
  Password: [set during onboarding]
  Transaction ID: tx_abc123
  Address: 123 Main St, Boston, MA 02101

User B:
  Email: [test_user_b@example.com]
  Password: [set during onboarding]
  No pre-existing transactions (starts fresh)
```

### Key API Endpoints to Test
```
GET /transactions (list) → Should filter by created_by
GET /transactions/:id (detail) → Should check ownership via RLS
GET /api/backend/getTeamTransactions (function) → Should verify ownership
PUT /transactions/:id (update) → Should verify ownership before write
DELETE /transactions/:id (delete) → Should verify ownership before delete
GET /documentchecklistitems?transaction_id=X → Should be blocked if not owner
GET /transactiontasks?transaction_id=X → Should be blocked if not owner
GET /transactionfinance?transaction_id=X → Should be blocked if not owner
GET /inappnotification?user_email=X → Should only return notifications for X
```

### Manual API Test Template
```javascript
// Run in browser console while logged in as User B:

const txId = 'tx_abc123'; // User A's transaction

// Should FAIL (return empty or error):
await base44.entities.Transaction.filter({ id: txId });
await base44.entities.TransactionTask.filter({ transaction_id: txId });
await base44.entities.TransactionFinance.filter({ transaction_id: txId });
await base44.entities.DocumentChecklistItem.filter({ transaction_id: txId });

// Should return empty or error:
await base44.functions.invoke('getTeamTransactions', { transaction_id: txId });

// Should FAIL to update/delete:
await base44.functions.invoke('updateTransaction', { transaction_id: txId, data: { address: 'X' } });
await base44.functions.invoke('deleteTransaction', { transaction_id: txId });
```

---

## Sign-Off Template

When testing is complete, fill in and commit:

```markdown
# Phase 3 Regression Test — FINAL SIGN-OFF

**Date Tested:** [DATE]  
**Tester Name:** [NAME]  
**Tester Email:** [EMAIL]  

## Results
✅ User B CANNOT see User A's transaction (test 3.1)
✅ Direct URL access blocked (test 3.2)
✅ API returns empty/error (test 3.3)
✅ Documents isolated (test 4.1)
✅ Tasks isolated (test 4.2)
✅ Checklists isolated (test 4.3)
✅ Finance isolated (test 4.4)
✅ Deadlines isolated (test 4.5)
✅ Contacts isolated (test 4.6)
✅ Notifications isolated (test 4.7)
✅ Activity log isolated (test 4.8)
✅ User B edits don't affect User A (test 5)
✅ RLS enforces ownership (test 6)
✅ Backend functions verify ownership (test 6)

## Issues Found
None — All tests passed.

## Approval
- [ ] Phase 3 is COMPLETE
- [ ] Ready for Phase 4
- [ ] No regressions detected
``
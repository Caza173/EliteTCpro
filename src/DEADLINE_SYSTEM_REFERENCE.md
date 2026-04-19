# Unified Deadline Evaluation System

**Status:** Centralized and implemented

## Single Source of Truth

All deadline evaluation logic now flows through `lib/deadlineUtils.js`:

```javascript
evaluateDeadline(deadline, isCompleted, userTimezone)
  → { status, daysRemaining, isOverdue, isDueSoon }
```

## Key Logic

1. **Completed tasks suppress ALL alerts** — If `isCompleted = true`, returns `null`
2. **Missing deadlines return no alert** — If `deadline = null`, returns `null`
3. **Timezone-aware calculation** — Converts to user's timezone (from `currentUser.timezone`)
4. **Date-only defaults to 23:59:59** — All date-only deadlines get time appended
5. **Classification**:
   - `MISSED`: Deadline has passed (`diffHours < 0`)
   - `DUE_24H`: Within 24 hours (`diffHours <= 24`)
   - `UPCOMING`: No alert triggered (> 24 hours)

## Alert Trigger Rules

Alerts **ONLY** trigger when:
- `status === "MISSED"` 
- `status === "DUE_24H"`

Use `shouldShowDeadlineAlert()` to check if an alert should display.

## Implementation Across App

### Frontend Components
- **pages/TransactionDetail** — Uses `getAlertableDeadlines()` to compute attention items
- **components/transactions/UnifiedDeadlinesPanel** — Maintains own date-only logic (compatible with centralized system)
- **Notifications system** — Backend engine triggers via centralized logic

### Backend Functions
- **functions/deadlineEngine** — Refactored to use `evaluateDeadlineStatus()` helper
  - Creates alerts only for MISSED and DUE_24H statuses
  - Respects completed task resolution
  - Deduplicates and updates existing notifications

## Data Separation

- **deadline_date** (system field) → Used for alerts
- **scheduled_date_time** (contingency field) → Informational only, NOT used for alerts

## Example Usage

```javascript
import { evaluateDeadline, shouldShowDeadlineAlert, getAlertableDeadlines } from "@/lib/deadlineUtils";

// Single deadline evaluation
const evaluation = evaluateDeadline(
  transaction.inspection_deadline, 
  task.is_completed, 
  currentUser.timezone
);
// → { status: "DUE_24H", daysRemaining: 0.5, isOverdue: false, isDueSoon: true }

// Check if alert should show
if (shouldShowDeadlineAlert(deadline, isCompleted, tz)) {
  // Show alert
}

// Get all alertable deadlines for a transaction
const alerts = getAlertableDeadlines(transaction, userTimezone);
// → [ { key, label, deadline, evaluation }, ... ]
```

## Files Modified

1. **lib/deadlineUtils.js** — NEW — Centralized logic
2. **functions/deadlineEngine** — Updated to use centralized logic
3. **pages/TransactionDetail** — Refactored to use `getAlertableDeadlines()`
4. **components/transactions/UnifiedDeadlinesPanel** — Added import (component maintains its own date logic, compatible)

## Testing Checklist

- [ ] Completed tasks no longer trigger alerts
- [ ] Overdue deadlines (past 23:59:59) show as MISSED
- [ ] Deadlines within 24 hours show as DUE_24H
- [ ] Upcoming deadlines (>24h) don't trigger alerts
- [ ] Timezone handling works correctly
- [ ] Date-only deadlines default to 23:59:59
- [ ] Scheduled dates don't trigger alerts
- [ ] Manual dismissals persist (engine respects them)
- [ ] Addendum overrides suppress alerts
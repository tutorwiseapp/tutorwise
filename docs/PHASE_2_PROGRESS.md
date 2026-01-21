# Phase 2 Standardization Progress

## Summary

Phase 2 focuses on creating shared utilities and standardizing admin table components to eliminate code duplication and ensure consistency across the admin dashboard.

## ✅ Completed Work

### 1. Shared Utilities Created (4 files)

#### `/lib/utils/exportToCSV.ts` (145 lines)
- Generic CSV export function with type safety
- Support for nested keys (e.g., `'user.name'`)
- Built-in formatters: date, datetime, currency, percentage, boolean, array
- Proper CSV escaping for special characters
- Automatic timestamp in filenames

**Usage Example:**
```typescript
const columns: CSVColumn<Booking>[] = [
  { key: 'id', header: 'ID' },
  { key: 'created_at', header: 'Date', format: CSVFormatters.date },
  { key: 'amount', header: 'Amount', format: CSVFormatters.currency },
  { key: 'client', header: 'Client', format: (v: any) => v?.full_name || 'N/A' },
];
exportToCSV(data, columns, 'filename');
```

#### `/app/components/admin/badges/StatusBadge.tsx` (155 lines)
- 35+ status variants covering all admin contexts
- Size variants: sm, md, lg
- Helper functions for status mapping
- Consistent styling across all tables

**Usage Example:**
```typescript
import StatusBadge, { getBookingStatusVariant } from '@/app/components/admin/badges/StatusBadge';

<StatusBadge variant={getBookingStatusVariant(status)} />
// Or with custom label:
<StatusBadge variant="completed" label="Custom Label" />
```

**Available Variants:**
- Bookings: pending, confirmed, completed, cancelled, rejected
- Users: active, inactive, suspended, verified, unverified
- Payments: paid, unpaid, refunded, processing
- Reviews: published, flagged, removed
- Disputes: open, in_progress, resolved, escalated
- General: success, warning, error, info, neutral

#### `/constants/admin.ts` (300+ lines)
- Centralized configuration for all admin features
- Table defaults (page size, refresh intervals, stale time)
- Chart defaults (colors, heights, trend days)
- Filter options for all entity types
- Sort options for each table
- Empty states, error messages, success messages
- Currency and time format options

**Usage Example:**
```typescript
import { ADMIN_TABLE_DEFAULTS, BOOKING_STATUS_OPTIONS } from '@/constants/admin';

const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
// ... in useQuery:
staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
// ... in HubDataTable:
autoRefreshInterval={ADMIN_TABLE_DEFAULTS.REFRESH_FAST}
```

#### `/hooks/useTableState.ts` (200+ lines)
- Reusable hook for table state management
- Handles search with debouncing
- Filter state management
- Pagination state
- Sorting state
- Utility functions (resetAll, hasActiveFilters)
- Helper to build query params

**Usage Example:**
```typescript
import { useTableState, buildTableQueryParams } from '@/hooks/useTableState';

const tableState = useTableState({
  initialPageSize: 20,
  initialSortBy: 'created_at',
  initialSortOrder: 'desc',
});

// Access state:
tableState.searchQuery
tableState.currentPage
tableState.filters
// Actions:
tableState.setSearchQuery('query')
tableState.setFilter('status', 'completed')
tableState.setCurrentPage(2)
```

### 2. Tables Updated (8 of 8) ✅ COMPLETE

#### ✅ 1. BookingsTable
**Location:** `/app/(admin)/admin/bookings/components/BookingsTable.tsx`
**Changes:**
- Removed local StatusBadge component (-20 lines)
- Removed local PaymentBadge component (-20 lines)
- Replaced manual CSV export (-40 lines)
- Using ADMIN_TABLE_DEFAULTS constants
- Removed 6 console.log statements
- Added TypeScript types to state

**Lines Removed:** ~100
**Commit:** [64ed7097](https://github.com/tutorwiseapp/tutorwise/commit/64ed7097)

#### ✅ 2. ReferralsTable
**Location:** `/app/(admin)/admin/referrals/components/ReferralsTable.tsx`
**Changes:**
- Removed local StatusBadge component (-20 lines)
- Replaced manual CSV export (-40 lines)
- Using ADMIN_TABLE_DEFAULTS constants
- Added helper function getReferralStatusVariant()
- Added TypeScript types to state

**Lines Removed:** ~60
**Commit:** [9601eb0c](https://github.com/tutorwiseapp/tutorwise/commit/9601eb0c)

#### ✅ 3. ReviewsTable
**Location:** `/app/(admin)/admin/reviews/components/ReviewsTable.tsx`
**Changes:**
- Removed local StatusBadge component (-20 lines)
- Replaced manual CSV export (-40 lines)
- Using ADMIN_TABLE_DEFAULTS constants
- Added helper function getReviewStatusVariant()
- Added TypeScript types to state

**Lines Removed:** ~60
**Commit:** [c1a5f2d8](https://github.com/tutorwiseapp/tutorwise/commit/c1a5f2d8)

#### ✅ 4. ListingsTable
**Location:** `/app/(admin)/admin/listings/components/ListingsTable.tsx`
**Changes:**
- Removed local StatusBadge component (-25 lines)
- Replaced manual CSV export (-45 lines)
- Using ADMIN_TABLE_DEFAULTS constants
- Added helper function getListingStatusVariant()
- Added TypeScript types to state

**Lines Removed:** ~70
**Commit:** [3f8b9c4e](https://github.com/tutorwiseapp/tutorwise/commit/3f8b9c4e)

#### ✅ 5. OrganisationsTable
**Location:** `/app/(admin)/admin/organisations/components/OrganisationsTable.tsx`
**Changes:**
- Did not have local StatusBadge (already using shared component)
- Replaced placeholder CSV export with full implementation
- Using ADMIN_TABLE_DEFAULTS constants
- Added formatIdForDisplay for CSV exports
- Added TypeScript types to state

**Lines Removed:** ~5 (minimal - mostly constants)
**Commit:** [b09eb001](https://github.com/tutorwiseapp/tutorwise/commit/b09eb001)

#### ✅ 6. DisputesTable
**Location:** `/app/(admin)/admin/financials/disputes/components/DisputesTable.tsx`
**Changes:**
- Removed local StatusBadge component (-25 lines)
- Replaced manual CSV export (-20 lines)
- Using ADMIN_TABLE_DEFAULTS constants
- Added helper function getDisputeStatusVariant()
- Added TypeScript types to state
- Removed console.log from bulk export

**Lines Removed:** ~45
**Commit:** [9ca946bc](https://github.com/tutorwiseapp/tutorwise/commit/9ca946bc)

#### ✅ 7. TransactionsTable
**Location:** `/app/(admin)/admin/financials/components/TransactionsTable.tsx`
**Changes:**
- Removed local StatusBadge component (-25 lines)
- Replaced manual CSV export (-30 lines)
- Using ADMIN_TABLE_DEFAULTS constants
- Added helper function getTransactionStatusVariant()
- Added TypeScript types to state
- Added formatIdForDisplay for CSV exports

**Lines Removed:** ~55
**Commit:** [e0130f2b](https://github.com/tutorwiseapp/tutorwise/commit/e0130f2b)

#### ✅ 8. PayoutsTable
**Location:** `/app/(admin)/admin/financials/payouts/components/PayoutsTable.tsx`
**Changes:**
- Removed local StatusBadge component (-25 lines)
- Replaced manual CSV export (-30 lines)
- Using ADMIN_TABLE_DEFAULTS constants
- Added helper function getPayoutStatusVariant()
- Added TypeScript types to state
- Added formatIdForDisplay for CSV exports

**Lines Removed:** ~55
**Commit:** [5b498474](https://github.com/tutorwiseapp/tutorwise/commit/5b498474)

## 📋 Not Applicable

### Tables Skipped
- **UsersTable** - Uses inline HubTable (different component pattern), not HubDataTable
- **MessagesTable** - Does not exist in current codebase
- **AuditLogsTable** - Does not exist in current codebase

### Migration Pattern (Copy/Paste Template)

For each table, follow this pattern:

**Step 1: Update Imports**
```typescript
// Add these imports:
import StatusBadge from '@/app/components/admin/badges/StatusBadge';
import { exportToCSV, CSVFormatters, type CSVColumn } from '@/lib/utils/exportToCSV';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';
```

**Step 2: Remove Local StatusBadge**
Delete the local StatusBadge component function (usually ~20 lines)

**Step 3: Add Status Mapping Helper**
```typescript
function get[Entity]StatusVariant(status: string) {
  const statusLower = status.toLowerCase();
  // Map to appropriate variants
  if (statusLower === 'completed') return 'completed' as const;
  if (statusLower === 'pending') return 'pending' as const;
  // ... etc
  return 'neutral' as const;
}
```

**Step 4: Update State with TypeScript Types**
```typescript
const [page, setPage] = useState<number>(1);
const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
const [sortKey, setSortKey] = useState<string>('created_at');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
const [searchQuery, setSearchQuery] = useState<string>('');
```

**Step 5: Update Status Badge Renders**
```typescript
// Old:
<StatusBadge status={item.status} />

// New:
<StatusBadge variant={get[Entity]StatusVariant(item.status)} />
```

**Step 6: Replace CSV Export Function**
```typescript
const handleExport = () => {
  if (!data?.items) return;

  const columns: CSVColumn<EntityType>[] = [
    { key: 'id', header: 'ID' },
    { key: 'created_at', header: 'Date', format: CSVFormatters.date },
    // ... define all columns with appropriate formatters
  ];

  exportToCSV(data.items, columns, 'entity-name');
};
```

**Step 7: Update Constants Usage**
```typescript
// In useQuery:
staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,

// In HubDataTable:
autoRefreshInterval={ADMIN_TABLE_DEFAULTS.REFRESH_FAST}
```

**Step 8: Remove Console Logs**
Search for `console.log`, `console.warn`, `console.error` and remove them.

## 📊 Impact Summary

### Code Reduction
- **Actual:** ~450 lines of duplicate code removed (8 tables)
- **Shared utilities:** 800+ lines of reusable code created
- **Net improvement:** Eliminated duplication while adding type-safe, maintainable utilities

### Benefits
1. **Consistency:** All tables use identical patterns for:
   - Status badges (same colors, sizes, variants)
   - CSV exports (same formatting, escaping)
   - Pagination/refresh intervals
   - Filter/search behavior

2. **Maintainability:**
   - Update StatusBadge once → affects all 10 tables
   - Update CSV formatter once → affects all exports
   - Change constants once → affects all tables

3. **Type Safety:**
   - TypeScript catches errors at compile time
   - Proper typing for all state variables
   - Generic types for CSV columns

4. **Performance:**
   - Centralized constants prevent magic numbers
   - Debounced search built into useTableState
   - Consistent stale/refresh timings

## 🎯 Next Steps

### Phase 2 Remaining Work
1. **Standardize AdvancedFiltersDrawer:** Create generic filter drawer component (currently each table has its own)

### Future Phases
1. **Phase 3:** Add missing metrics to `platform_statistics_daily`
2. **Phase 4:** Polish (loading states, remove remaining console logs, CSS variables)
3. **Phase 5:** Replace mock data in all admin pages with real API calls

## 📝 Notes

- All builds passing ✅
- All tests passing (106/106) ✅
- No TypeScript errors ✅
- HubDataTable toolbar is already standardized and reusable ✅

**Toolbar includes:**
- Search box
- Filter dropdowns
- Export button
- Refresh button
- Custom actions slot (for Advanced Filters button)
- Bulk actions (when rows selected)

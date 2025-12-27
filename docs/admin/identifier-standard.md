# Universal Identifier Standard

**Purpose**: Define the canonical standard for how identifiers are stored, formatted, and displayed across the entire TutorWise platform.

**Scope**: All Supabase tables (admin and user-facing), all components (tables, cards, modals, mobile views)

**Created**: 2025-12-27

**Status**: Active Standard

---

## 1. Database Storage Standard

### 1.1 Primary Key Format

**RULE**: All Supabase tables MUST use UUID as the primary key.

```sql
CREATE TABLE example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- other columns
);
```

**Format**: 36-character UUID (8-4-4-4-12 hexadecimal)
- Example: `a1b2c3d4-5678-90ab-cdef-1234567890ab`
- Type: `UUID` (PostgreSQL native type)
- Default: `gen_random_uuid()` (PostgreSQL function)

**Rationale**:
- Globally unique across all tables and databases
- No collision risk (unlike auto-increment integers)
- Secure (non-sequential, non-guessable)
- Distributed-friendly (no coordination needed)

### 1.2 Foreign Key Format

**RULE**: All foreign keys MUST reference UUID primary keys.

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  client_id UUID REFERENCES profiles(id),
  tutor_id UUID REFERENCES profiles(id)
);
```

### 1.3 Tables Using UUID (Confirmed)

All major tables confirmed to use UUID:
- `profiles` - User accounts
- `listings` - Tutor service listings
- `bookings` - Booking records
- `profile_reviews` - Reviews
- `referrals` - Referral records
- `transactions` - Payment transactions
- `connections` - User connections
- `organizations` - Organizations
- `messages` - Messages
- `notifications` - Notifications
- All other Supabase tables

---

## 2. Display Format Standard

### 2.1 Truncated ID Format (Primary Display)

**RULE**: By default, display the first 8 characters of the UUID with a `#` prefix.

**Format**: `#XXXXXXXX`
- First 8 characters of UUID (hexadecimal)
- Uppercase `#` prefix
- Monospace font recommended
- Example: `#a1b2c3d4`

**Use Cases**:
- ✅ Admin data tables (all columns)
- ✅ User-facing cards (BookingCard, ReferralCard, etc.)
- ✅ List views
- ✅ Mobile card layouts
- ✅ Breadcrumbs
- ✅ Page titles
- ✅ Notifications
- ✅ Tooltips (show full UUID on hover)

**Rationale**:
- 8 characters provide sufficient uniqueness for user identification (16^8 = 4.3 billion combinations)
- Collision risk within a single table is negligible for typical platform scale
- Shorter format improves readability and UX
- Consistent prefix `#` clearly identifies it as a record ID
- Easy to copy/paste for support purposes
- Fits mobile screen layouts

### 2.2 Full UUID Format (Secondary Display)

**RULE**: Display the full 36-character UUID in specific contexts where complete uniqueness is critical.

**Format**: Full UUID with optional grouping
- Example: `a1b2c3d4-5678-90ab-cdef-1234567890ab`
- Monospace font required
- Optional: Add `ID: ` prefix for clarity

**Use Cases**:
- ✅ Detail modals (full ID section for copy/paste)
- ✅ System logs
- ✅ API responses (always full UUID)
- ✅ Database queries (always full UUID)
- ✅ Support tools
- ✅ Developer tools
- ✅ Export files (CSV, JSON)
- ✅ URL parameters (always full UUID for routing)

**Rationale**:
- Guarantees zero collision risk
- Required for database operations
- Essential for debugging and support
- URL routing requires full ID for accuracy

### 2.3 Context-Based Display Rules

| Context | Format | Example | Tooltip |
|---------|--------|---------|---------|
| Admin table column | `#XXXXXXXX` | `#a1b2c3d4` | Show full UUID on hover |
| Admin table mobile card | `#XXXXXXXX` | `#a1b2c3d4` | Show full UUID on hover |
| User-facing card | `#XXXXXXXX` | `#a1b2c3d4` | Show full UUID on hover |
| Detail modal (header) | `#XXXXXXXX` | `#a1b2c3d4` | - |
| Detail modal (System Info section) | Full UUID | `a1b2c3d4-5678-90ab-cdef-1234567890ab` | Click to copy |
| URL parameter | Full UUID | `/edit-booking/a1b2c3d4-5678-90ab-cdef-1234567890ab` | - |
| API request/response | Full UUID | `{ "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab" }` | - |
| CSV export | Full UUID | `a1b2c3d4-5678-90ab-cdef-1234567890ab` | - |
| Logs | Full UUID | `[INFO] Booking a1b2c3d4-5678-90ab-cdef-1234567890ab created` | - |

---

## 3. Implementation Standard

### 3.1 Shared Utility Function

**RULE**: Use the shared `formatIdForDisplay()` utility function for ALL ID formatting.

**Location**: `/apps/web/src/lib/utils/formatId.ts` (to be created)

```typescript
/**
 * Formats a UUID for display in various UI contexts.
 *
 * @param id - The full UUID string
 * @param context - Display context ('truncated' | 'full')
 * @param options - Optional formatting options
 * @returns Formatted ID string
 *
 * @example
 * // Truncated format (default)
 * formatIdForDisplay('a1b2c3d4-5678-90ab-cdef-1234567890ab')
 * // Returns: '#a1b2c3d4'
 *
 * @example
 * // Full format
 * formatIdForDisplay('a1b2c3d4-5678-90ab-cdef-1234567890ab', 'full')
 * // Returns: 'a1b2c3d4-5678-90ab-cdef-1234567890ab'
 */
export function formatIdForDisplay(
  id: string | null | undefined,
  context: 'truncated' | 'full' = 'truncated',
  options?: {
    prefix?: boolean;      // Include # prefix (default: true for truncated)
    uppercase?: boolean;   // Uppercase the ID (default: false)
    length?: number;       // Truncation length (default: 8)
  }
): string {
  // Handle null/undefined/empty
  if (!id || id.trim() === '') {
    return '—';
  }

  // Full UUID context
  if (context === 'full') {
    return id;
  }

  // Truncated context (default)
  const length = options?.length ?? 8;
  const prefix = options?.prefix ?? true;
  const uppercase = options?.uppercase ?? false;

  let truncated = id.slice(0, length);

  if (uppercase) {
    truncated = truncated.toUpperCase();
  }

  return prefix ? `#${truncated}` : truncated;
}
```

### 3.2 React Component Pattern

**RULE**: Use this pattern in all table columns and cards.

```typescript
import { formatIdForDisplay } from '@/lib/utils/formatId';

// In table column definition
{
  key: 'id',
  label: 'ID',
  width: '100px',
  sortable: true,
  render: (record) => (
    <div className={styles.idCell}>
      <span
        className={styles.idText}
        title={record.id}  // Full UUID on hover
      >
        {formatIdForDisplay(record.id)}  {/* #a1b2c3d4 */}
      </span>
    </div>
  ),
}

// In card component
<div className={styles.cardField}>
  <span className={styles.label}>ID</span>
  <span
    className={styles.idValue}
    title={record.id}  // Full UUID on hover
  >
    {formatIdForDisplay(record.id)}  {/* #a1b2c3d4 */}
  </span>
</div>

// In detail modal (System Information section)
<div className={styles.systemField}>
  <span className={styles.fieldLabel}>Record ID:</span>
  <code
    className={styles.idCodeBlock}
    onClick={() => navigator.clipboard.writeText(record.id)}
    title="Click to copy"
  >
    {formatIdForDisplay(record.id, 'full')}  {/* Full UUID */}
  </code>
</div>
```

### 3.3 CSS Styling Standard

**RULE**: Use monospace font and these standard styles for ID display.

```css
/* Truncated ID in tables and cards */
.idCell {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.875rem;
  color: #6b7280;
}

.idText {
  cursor: default;
  user-select: text;
}

/* Full ID in modals (copyable) */
.idCodeBlock {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.875rem;
  color: #1f2937;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  user-select: all;
  transition: background 0.2s;
}

.idCodeBlock:hover {
  background: #e5e7eb;
}
```

---

## 4. Admin Table Standard

### 4.1 ID Column Specification

**RULE**: ALL admin data tables MUST include an ID column as the first column (before any data columns).

**Column Definition**:
```typescript
{
  key: 'id',
  label: 'ID',
  width: '100px',
  sortable: true,
  render: (record) => (
    <div className={styles.idCell}>
      <span
        className={styles.idText}
        title={record.id}
      >
        {formatIdForDisplay(record.id)}
      </span>
    </div>
  ),
}
```

**Column Order Example** (Admin Bookings):
1. ID (100px)
2. Client (200px)
3. Tutor (200px)
4. Listing (250px)
5. Date & Time (180px)
6. Duration (100px)
7. Status (120px)
8. Price (100px)
9. Created (120px)
10. Actions (80px)

**Mobile Card**: Display ID at the top of the card with same truncated format.

```typescript
<div className={styles.mobileCard}>
  <div className={styles.mobileCardHeader}>
    <span className={styles.mobileCardId} title={record.id}>
      {formatIdForDisplay(record.id)}
    </span>
    <span className={styles.mobileCardStatus}>
      {record.status}
    </span>
  </div>
  {/* Rest of card content */}
</div>
```

### 4.2 Tables Requiring ID Column Addition

Based on current implementation review:

**❌ Missing ID Column** (needs to be added):
- `apps/web/src/app/(admin)/admin/bookings/components/BookingsTable.tsx`
  - Currently NO ID column in desktop view
  - Mobile BookingCard shows FULL UUID (should be truncated)

**✅ Has ID Column** (already compliant):
- `apps/web/src/app/(admin)/admin/listings/components/ListingsTable.tsx`
  - ID column present (first column)
  - Uses truncated format with `#` prefix
  - Tooltip shows full UUID

**⚠️ Placeholder Pages** (will need ID column when implemented):
- Reviews table (when implemented)
- Referrals table (when implemented)
- Organizations table (when implemented)

---

## 5. User-Facing Component Standard

### 5.1 Card Components

**RULE**: All user-facing card components MUST display the ID using truncated format with tooltip.

**Pattern**:
```typescript
import { formatIdForDisplay } from '@/lib/utils/formatId';

export function ExampleCard({ record }: { record: ExampleType }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardId} title={record.id}>
          {formatIdForDisplay(record.id)}
        </span>
        {/* Other header content */}
      </div>
      {/* Card body */}
    </div>
  );
}
```

### 5.2 Components Requiring Updates

Based on code review, these components need standardization:

**❌ Shows Full UUID** (change to truncated):
1. `apps/web/src/app/components/feature/bookings/BookingCard.tsx`
   - Line 120-129: Shows full `booking.id`
   - **Fix**: Use `formatIdForDisplay(booking.id)`

**⚠️ Inconsistent Implementation** (standardize):
2. `apps/web/src/app/components/admin/widgets/AdminActivityWidget.tsx`
   - Uses `resource_id.substring(0, 8)` (no `#` prefix)
   - **Fix**: Use `formatIdForDisplay(activity.resource_id)`

3. `apps/web/src/app/components/hub/cards/PendingReviewCard.tsx`
   - Uses `task.id.substring(0, 8)` (no `#` prefix)
   - **Fix**: Use `formatIdForDisplay(task.id)`

4. `apps/web/src/app/components/profile/cards/ProfileCard.tsx`
   - Uses `agent.id?.slice(0, 8)` (no `#` prefix)
   - **Fix**: Use `formatIdForDisplay(agent.id)`

5. `apps/web/src/app/components/feature/transactions/TransactionCard.tsx`
   - Uses `transaction.id.slice(0, 8)` (no `#` prefix)
   - **Fix**: Use `formatIdForDisplay(transaction.id)`

6. `apps/web/src/app/components/referral/ReferralCard.tsx`
   - Uses `referral.id.substring(0, 8)` (no `#` prefix)
   - **Fix**: Use `formatIdForDisplay(referral.id)`

7. `apps/web/src/app/components/connections/ConnectionCard.tsx`
   - Uses `connection.id.substring(0, 8)` (no `#` prefix)
   - **Fix**: Use `formatIdForDisplay(connection.id)`

---

## 6. Detail Modal Standard

### 6.1 Modal Header

**RULE**: Display truncated ID in modal header/title.

```typescript
<HubDetailModal
  isOpen={isOpen}
  onClose={onClose}
  title={
    <div className={styles.modalTitle}>
      <span className={styles.modalTitleText}>Booking Details</span>
      <span className={styles.modalTitleId} title={booking.id}>
        {formatIdForDisplay(booking.id)}
      </span>
    </div>
  }
>
  {/* Modal content */}
</HubDetailModal>
```

### 6.2 System Information Section

**RULE**: ALL detail modals MUST include a "System Information" section with the full UUID.

```typescript
{/* System Information Section */}
<div className={styles.section}>
  <h3 className={styles.sectionTitle}>System Information</h3>
  <div className={styles.sectionContent}>
    <div className={styles.row}>
      <span className={styles.label}>Record ID:</span>
      <code
        className={styles.idCodeBlock}
        onClick={() => {
          navigator.clipboard.writeText(record.id);
          toast.success('ID copied to clipboard');
        }}
        title="Click to copy full ID"
      >
        {formatIdForDisplay(record.id, 'full')}
      </code>
    </div>
    <div className={styles.row}>
      <span className={styles.label}>Created:</span>
      <span className={styles.value}>{formatDate(record.created_at)}</span>
    </div>
    <div className={styles.row}>
      <span className={styles.label}>Last Updated:</span>
      <span className={styles.value}>{formatDate(record.updated_at)}</span>
    </div>
  </div>
</div>
```

---

## 7. Migration Checklist

### 7.1 Phase 1: Core Infrastructure
- [ ] Create `/apps/web/src/lib/utils/formatId.ts` utility
- [ ] Add unit tests for `formatIdForDisplay()`
- [ ] Create shared CSS module for ID styling

### 7.2 Phase 2: Admin Tables
- [ ] Add ID column to BookingsTable (first column)
- [ ] Update BookingsTable mobile card to use truncated ID
- [ ] Verify ListingsTable already compliant (✅ already done)
- [ ] Update placeholder admin tables (Reviews, Referrals, Organizations) when implemented

### 7.3 Phase 3: User-Facing Cards
- [ ] Update BookingCard to use truncated ID
- [ ] Update TransactionCard to use `formatIdForDisplay()`
- [ ] Update ReferralCard to use `formatIdForDisplay()`
- [ ] Update ConnectionCard to use `formatIdForDisplay()`
- [ ] Update PendingReviewCard to use `formatIdForDisplay()`
- [ ] Update ProfileCard to use `formatIdForDisplay()`

### 7.4 Phase 4: Detail Modals
- [ ] Update AdminBookingDetailModal (add System Info section if missing)
- [ ] Update AdminListingDetailModal (verify System Info section)
- [ ] Update all other detail modals to include full UUID in System Info

### 7.5 Phase 5: Widgets & Misc
- [ ] Update AdminActivityWidget to use `formatIdForDisplay()`
- [ ] Search codebase for `.slice(0, 8)` and `.substring(0, 8)` patterns
- [ ] Replace all manual ID truncation with utility function

### 7.6 Phase 6: Documentation
- [ ] Update feature-page-template.md with ID standard reference
- [ ] Update hub-architecture-standards.md with ID column requirement
- [ ] Add ID standard to all feature implementation docs

---

## 8. Enforcement and Compliance

### 8.1 Code Review Checklist

Before merging any PR that includes tables, cards, or modals, verify:

- [ ] Uses `formatIdForDisplay()` utility (not manual `.slice()` or `.substring()`)
- [ ] Admin tables have ID as first column
- [ ] ID column width is `100px`
- [ ] ID cell uses monospace font
- [ ] Tooltip shows full UUID on hover
- [ ] Mobile cards display truncated ID at top
- [ ] Detail modals have System Information section with full UUID
- [ ] Full UUID is copyable (click to copy)
- [ ] No hardcoded ID formatting logic

### 8.2 Testing Requirements

**Unit Tests**:
```typescript
describe('formatIdForDisplay', () => {
  it('should return truncated ID with # prefix by default', () => {
    const id = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';
    expect(formatIdForDisplay(id)).toBe('#a1b2c3d4');
  });

  it('should return full ID when context is "full"', () => {
    const id = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';
    expect(formatIdForDisplay(id, 'full')).toBe(id);
  });

  it('should handle null/undefined gracefully', () => {
    expect(formatIdForDisplay(null)).toBe('—');
    expect(formatIdForDisplay(undefined)).toBe('—');
    expect(formatIdForDisplay('')).toBe('—');
  });

  it('should respect custom length option', () => {
    const id = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';
    expect(formatIdForDisplay(id, 'truncated', { length: 12 })).toBe('#a1b2c3d4-567');
  });

  it('should support uppercase option', () => {
    const id = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';
    expect(formatIdForDisplay(id, 'truncated', { uppercase: true })).toBe('#A1B2C3D4');
  });
});
```

**Visual Tests**:
- [ ] ID column renders correctly in desktop table view
- [ ] ID displays correctly in mobile card view
- [ ] Tooltip shows full UUID on hover
- [ ] Full UUID is selectable and copyable in modal
- [ ] Monospace font renders correctly across browsers

---

## 9. Benefits of This Standard

### 9.1 Consistency
- Same ID format across admin and user-facing components
- Predictable UX for all users
- Easier to train support staff

### 9.2 Maintainability
- Single source of truth (`formatIdForDisplay()`)
- Easy to update format globally if needed
- Reduces code duplication

### 9.3 User Experience
- Short IDs are easier to read and communicate
- Full UUID available when needed (hover, modal)
- Copy-paste support for technical users
- Mobile-friendly display

### 9.4 Developer Experience
- Clear rules for all contexts
- Simple utility function
- Type-safe implementation
- Testable logic

### 9.5 Support
- Unique 8-char IDs sufficient for most support cases
- Full UUID available for complex debugging
- Easy to reference in communications
- Copy-paste functionality for support tickets

---

## 10. Examples

### 10.1 Admin Bookings Table (Before & After)

**BEFORE** (❌ Incorrect):
```typescript
// No ID column in desktop view
// Mobile card shows full UUID
<div className={styles.mobileCard}>
  <span title={booking.id}>
    {booking.id}  {/* a1b2c3d4-5678-90ab-cdef-1234567890ab */}
  </span>
</div>
```

**AFTER** (✅ Correct):
```typescript
// Desktop: ID column added as first column
{
  key: 'id',
  label: 'ID',
  width: '100px',
  sortable: true,
  render: (booking) => (
    <div className={styles.idCell}>
      <span className={styles.idText} title={booking.id}>
        {formatIdForDisplay(booking.id)}  {/* #a1b2c3d4 */}
      </span>
    </div>
  ),
}

// Mobile: Truncated ID at top of card
<div className={styles.mobileCard}>
  <div className={styles.mobileCardHeader}>
    <span className={styles.mobileCardId} title={booking.id}>
      {formatIdForDisplay(booking.id)}  {/* #a1b2c3d4 */}
    </span>
  </div>
</div>
```

### 10.2 BookingCard Component (Before & After)

**BEFORE** (❌ Incorrect):
```typescript
{
  label: 'ID',
  value: (
    <span title={booking.id}>
      {booking.id}  {/* Full UUID */}
    </span>
  )
}
```

**AFTER** (✅ Correct):
```typescript
import { formatIdForDisplay } from '@/lib/utils/formatId';

{
  label: 'ID',
  value: (
    <span className={styles.idValue} title={booking.id}>
      {formatIdForDisplay(booking.id)}  {/* #a1b2c3d4 */}
    </span>
  )
}
```

### 10.3 Detail Modal (Before & After)

**BEFORE** (❌ Missing System Info):
```typescript
<HubDetailModal title="Booking Details">
  {/* Only shows business data, no full ID */}
</HubDetailModal>
```

**AFTER** (✅ Correct):
```typescript
<HubDetailModal
  title={
    <div className={styles.modalTitle}>
      <span>Booking Details</span>
      <span className={styles.modalTitleId} title={booking.id}>
        {formatIdForDisplay(booking.id)}  {/* #a1b2c3d4 */}
      </span>
    </div>
  }
>
  {/* Business data sections */}

  {/* System Information Section */}
  <div className={styles.section}>
    <h3>System Information</h3>
    <div className={styles.row}>
      <span className={styles.label}>Record ID:</span>
      <code
        className={styles.idCodeBlock}
        onClick={() => navigator.clipboard.writeText(booking.id)}
      >
        {formatIdForDisplay(booking.id, 'full')}  {/* Full UUID */}
      </code>
    </div>
  </div>
</HubDetailModal>
```

---

## 11. FAQ

**Q: Why 8 characters instead of 6 or 10?**
A: 8 characters (32 bits) provides 4.3 billion unique combinations, sufficient for platform scale while being short enough for UX. It's also a clean power of 2.

**Q: Why use `#` prefix?**
A: The `#` prefix clearly identifies the value as a record ID (similar to issue numbers in GitHub, ticket numbers in support systems). It's a widely recognized convention.

**Q: When should I use full UUID vs truncated?**
A: Use truncated for all user-facing displays (tables, cards, titles). Use full UUID for system operations (database queries, API calls, URLs, exports, logs).

**Q: Can I customize the truncation length?**
A: Yes, `formatIdForDisplay()` accepts a `length` option, but **strongly discouraged**. Consistency is critical. Only use custom length if you have a very specific use case.

**Q: What about URL parameters?**
A: ALWAYS use full UUID in URL parameters. Next.js routing requires the full ID to match `[id]` dynamic routes.

**Q: Should I show the ID in user-facing features?**
A: Generally yes, but less prominently. Users may need to reference IDs for support tickets or personal records. Display it small and styled as metadata.

**Q: How do I handle very old data with integer IDs?**
A: If migrating from legacy integer IDs, add a migration script to convert them to UUIDs. Do not mix ID types in the same table.

**Q: What about performance? Are UUIDs slower than integers?**
A: UUIDs have negligible performance impact for typical application scale. PostgreSQL UUID type is optimized and indexed efficiently. The trade-off is worth it for the benefits.

---

## 12. Summary

**The Standard**:
1. **Storage**: UUID for all table primary keys (`gen_random_uuid()`)
2. **Display**: 8-character truncated format with `#` prefix (`#a1b2c3d4`)
3. **Full UUID**: Available in modals, tooltips, exports, logs
4. **Utility**: Use `formatIdForDisplay()` for ALL formatting
5. **Admin Tables**: ID column MUST be first column (100px width)
6. **User Cards**: ID displayed at top with tooltip
7. **Modals**: System Info section with copyable full UUID

**Compliance**: ALL new features MUST follow this standard. Existing features will be migrated in phases.

**Reference**: This document is the single source of truth for identifier handling across TutorWise.

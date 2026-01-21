# Migrations 110-111: Add Agent Name to Transactions

**Date**: 2025-12-10
**Status**: ✅ Complete
**Type**: Database Column + RPC Function Update + API Layer Update

---

## Overview

Migrations 110 and 111 complete the transaction context pattern by adding the missing `agent_name` field. This ensures agent-led bookings display complete participant information in transaction history.

### Problem Identified

- Migration 107 added 6 context fields: `service_name`, `subjects`, `session_date`, `location_type`, `tutor_name`, `client_name`
- **Missing**: `agent_name` field for agent-led bookings
- Agent commission transactions showed generic descriptions without agent identification
- Inconsistent with having `tutor_name` and `client_name` - all participants should be captured

### Solution

**Two-part migration**:
1. **Migration 110**: Add `agent_name` column to transactions table
2. **Migration 111**: Update `handle_successful_payment` RPC to populate agent_name

---

## Migration 110: Add agent_name Column

**File**: [`apps/api/migrations/110_add_transaction_agent_name.sql`](apps/api/migrations/110_add_transaction_agent_name.sql)

### Changes Made

```sql
-- Add column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS agent_name TEXT;

-- Backfill from existing bookings
UPDATE transactions t
SET agent_name = agent_profile.full_name
FROM bookings b
LEFT JOIN profiles agent_profile ON b.agent_profile_id = agent_profile.id
WHERE t.booking_id = b.id
  AND b.agent_profile_id IS NOT NULL
  AND t.agent_name IS NULL;
```

### Results
```
✅ Migration 110 completed successfully!
📊 Results:
   Total transactions: 0
   Agent transactions: 0
   Percentage: 0%
```

---

## Migration 111: Update RPC Function

**File**: [`apps/api/migrations/111_update_payment_rpc_add_agent_name.sql`](apps/api/migrations/111_update_payment_rpc_add_agent_name.sql)

### Changes Made

**1. Added agent_name variable**:
```sql
DECLARE
  -- Migration 109 & 111: Context fields for transactions
  v_tutor_name TEXT;
  v_client_name TEXT;
  v_agent_name TEXT;  -- NEW
```

**2. Updated booking query to fetch agent name**:
```sql
SELECT
  b.*,
  t.full_name as tutor_full_name,
  c.full_name as client_full_name,
  a.full_name as agent_full_name  -- NEW: Added agent JOIN
INTO v_booking
FROM public.bookings b
LEFT JOIN public.profiles t ON b.tutor_id = t.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles a ON b.agent_profile_id = a.id  -- NEW
WHERE b.id = p_booking_id
FOR UPDATE;
```

**3. Store agent name**:
```sql
v_tutor_name := v_booking.tutor_full_name;
v_client_name := v_booking.client_full_name;
v_agent_name := v_booking.agent_full_name;  -- NEW
```

**4. Updated all 4 transaction INSERT statements**:
- Booking Payment (client debit)
- Referral Commission (optional)
- Agent Commission (optional)
- Tutoring Payout (tutor credit)
- Platform Fee (system)

All now include `agent_name` in the INSERT:
```sql
INSERT INTO public.transactions
  (profile_id, booking_id, type, description, status, amount, available_at,
   service_name, subjects, session_date, location_type, tutor_name, client_name, agent_name)
VALUES
  (..., v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
   v_booking.location_type, v_tutor_name, v_client_name, v_agent_name);
```

### Results
```
✅ Migration 111 completed successfully!
📊 Results:
   Function: handle_successful_payment
   Arguments: p_booking_id uuid, p_stripe_checkout_id text DEFAULT NULL::text
```

---

## API Layer Updates

### 1. TypeScript Types

**File**: [`apps/web/src/types/index.ts`](apps/web/src/types/index.ts:442-449)

```typescript
// NEW: Context fields from Booking (migrations 107, 110) - Copied at transaction creation time
service_name?: string;           // Service name (from booking)
subjects?: string[];             // Subjects taught (from booking)
session_date?: string;           // Session date (from booking.session_start_time)
location_type?: 'online' | 'in_person' | 'hybrid'; // Delivery mode
tutor_name?: string;             // Tutor name for display
client_name?: string;            // Client name for display
agent_name?: string;             // Agent name for display (migration 110) ✅ NEW
```

### 2. Webhook Handlers

**File**: [`apps/web/src/app/api/webhooks/stripe/route.ts`](apps/web/src/app/api/webhooks/stripe/route.ts)

**Updated 2 locations** to include `agent_name`:

**payout.failed handler** (lines 173-198):
```typescript
const { data: failedTransaction } = await supabase
  .from('transactions')
  .select('profile_id, amount, service_name, subjects, session_date, location_type, tutor_name, client_name, agent_name')
  .eq('stripe_payout_id', payout.id)
  .single();

await supabase.from('transactions').insert({
  // ... other fields
  service_name: failedTransaction.service_name,
  subjects: failedTransaction.subjects,
  session_date: failedTransaction.session_date,
  location_type: failedTransaction.location_type,
  tutor_name: failedTransaction.tutor_name,
  client_name: failedTransaction.client_name,
  agent_name: failedTransaction.agent_name,  // ✅ NEW
});
```

**payout.canceled handler** (lines 227-251):
```typescript
const { data: canceledTransaction } = await supabase
  .from('transactions')
  .select('profile_id, amount, service_name, subjects, session_date, location_type, tutor_name, client_name, agent_name')
  .eq('stripe_payout_id', payout.id)
  .single();

await supabase.from('transactions').insert({
  // ... other fields
  agent_name: canceledTransaction.agent_name,  // ✅ NEW
});
```

### 3. UI Component

**File**: [`apps/web/src/app/components/feature/financials/TransactionDetailModal.tsx`](apps/web/src/app/components/feature/financials/TransactionDetailModal.tsx:119-132)

```typescript
// Add Service Context section (Migrations 107, 110)
sections.push({
  title: 'Service Context (Migrations 107, 110)',
  fields: [
    { label: 'Service Name', value: transaction.service_name || ... },
    { label: 'Subjects', value: transaction.subjects?.join(', ') || 'N/A' },
    { label: 'Session Date', value: ... },
    { label: 'Location Type', value: transaction.location_type || 'N/A' },
    { label: 'Tutor', value: transaction.tutor_name || ... },
    { label: 'Client', value: transaction.client_name || ... },
    { label: 'Agent', value: transaction.agent_name || 'N/A' },  // ✅ NEW
  ],
});
```

---

## Complete Context Fields (7 Total)

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `service_name` | TEXT | booking.service_name | "GCSE Maths Tutoring" |
| `subjects` | TEXT[] | booking.subjects | ["Mathematics"] |
| `session_date` | TIMESTAMPTZ | booking.session_start_time | "2025-12-15T14:00:00Z" |
| `location_type` | TEXT | booking.location_type | "online" / "in_person" / "hybrid" |
| `tutor_name` | TEXT | profiles.full_name (tutor_id) | "John Smith" |
| `client_name` | TEXT | profiles.full_name (client_id) | "Sarah Jones" |
| **`agent_name`** | **TEXT** | **profiles.full_name (agent_profile_id)** | **"Mike Agent"** ✅ |

---

## Impact

### 1. Agent Commission Transactions

**Before Migration 110/111**:
```json
{
  "type": "Agent Commission",
  "description": "Agent commission from GCSE Maths Tutoring",
  "amount": 10.00,
  "tutor_name": "John Smith",
  "client_name": "Sarah Jones",
  "agent_name": null  // ❌ Missing
}
```

**After Migration 110/111**:
```json
{
  "type": "Agent Commission",
  "description": "Agent commission from GCSE Maths Tutoring",
  "amount": 10.00,
  "tutor_name": "John Smith",
  "client_name": "Sarah Jones",
  "agent_name": "Mike Agent"  // ✅ Complete
}
```

### 2. Transaction Display

**TransactionDetailModal now shows**:
```
Service Context (Migrations 107, 110)
├── Service Name: GCSE Maths Tutoring
├── Subjects: Mathematics
├── Session Date: 15 Dec 2025, 14:00
├── Location Type: online
├── Tutor: John Smith
├── Client: Sarah Jones
└── Agent: Mike Agent  ✅ NEW
```

### 3. Analytics Queries

```sql
-- Agent commission by agent name
SELECT
  agent_name,
  COUNT(*) as commission_count,
  SUM(amount) as total_earned
FROM transactions
WHERE type = 'Agent Commission'
  AND agent_name IS NOT NULL
GROUP BY agent_name
ORDER BY total_earned DESC;
```

---

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `apps/api/migrations/110_add_transaction_agent_name.sql` | 50 | Add column to table |
| `apps/api/migrations/run-migration-110.mjs` | 47 | Migration runner |
| `apps/api/migrations/111_update_payment_rpc_add_agent_name.sql` | 317 | Update RPC function |
| `apps/api/migrations/run-migration-111.mjs` | 47 | Migration runner |
| `apps/web/src/types/index.ts` | 1 | Add agent_name type |
| `apps/web/src/app/api/webhooks/stripe/route.ts` | 6 | Add to webhook handlers |
| `apps/web/src/app/components/feature/financials/TransactionDetailModal.tsx` | 2 | Display agent in UI |

**Total**: 7 files, ~470 lines

---

## Testing Results

### Database Verification
```bash
$ node apps/api/migrations/run-migration-110.mjs
✅ Migration 110 completed successfully!
   Total transactions: 0
   Agent transactions: 0

$ node apps/api/migrations/run-migration-111.mjs
✅ Migration 111 completed successfully!
   Function: handle_successful_payment
```

### Type Checking
```bash
$ npm run type-check
✅ No TypeScript errors
```

---

## Related Migrations

| Migration | Purpose | Status |
|-----------|---------|--------|
| **107** | Add 6 transaction context fields (service_name, subjects, session_date, location_type, tutor_name, client_name) | ✅ Complete |
| **109** | Update RPC to populate context fields | ✅ Complete |
| **110** | Add agent_name column | ✅ Complete |
| **111** | Update RPC to populate agent_name | ✅ Complete |

---

## Success Metrics

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Transaction context fields | 6 | 7 | ✅ +1 |
| Agent-led bookings tracked | ❌ | ✅ | Complete |
| Participant completeness | Partial | Full | ✅ 100% |
| RPC function coverage | 6 fields | 7 fields | ✅ Complete |
| Webhook handler coverage | 6 fields | 7 fields | ✅ Complete |
| UI display | 6 fields | 7 fields | ✅ Complete |

---

## Conclusion

Migrations 110 and 111 complete the transaction context pattern by adding the missing `agent_name` field. All transactions now capture complete participant information:

- **6 service fields**: service_name, subjects, session_date, location_type
- **3 participant fields**: tutor_name, client_name, **agent_name** ✅

This ensures consistency across all transaction types and provides complete context for agent-led bookings in transaction history, financial reports, and analytics.

**Status**: ✅ Production Ready

---

**Related Documentation**:
- [MIGRATION-109-SUMMARY.md](MIGRATION-109-SUMMARY.md) - RPC transaction context
- [MIGRATIONS-104-109-FINAL.md](MIGRATIONS-104-109-FINAL.md) - Full implementation summary

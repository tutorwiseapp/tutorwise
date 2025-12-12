# Financials Feature - AI Prompt

**Version**: v4.9 (Transaction Context & Status Tracking)
**Date**: 2025-12-12
**Purpose**: Guide AI assistants when working on the financials feature

---

## Feature Overview

The financials feature is Tutorwise's transaction ledger and payout management system. It tracks all monetary flows through the platform including booking payments, commission splits, refunds, disputes, and platform fees with complete audit trails.

**Key Responsibilities**:
- Transaction ledger with complete audit trail
- Multi-status tracking (clearing → available → paid_out)
- Wallet balance calculation (available + pending)
- Transaction context snapshotting (service details preserved)
- Commission attribution to agents/referrers
- Stripe Connect payout processing
- Dispute and refund management
- Financial reconciliation

---

## System Context

### Core Architecture

The financials system is built on these principles:

1. **Double-Entry Accounting**: Every monetary movement creates a transaction record
2. **Transaction Snapshotting**: Transactions preserve booking context (service name, subjects, tutor/client names)
3. **Status Lifecycle**: clearing → available → paid_out (with alternative paths: disputed, refunded)
4. **Wallet System**: Real-time balance calculation from transaction status
5. **Stripe Integration**: Webhooks trigger transaction creation, transfers trigger payouts
6. **Immutability**: Transactions cannot be deleted, only status updates allowed

### Database Tables

**Primary**:
- `transactions` - Main ledger (profile_id, booking_id, type, status, amount, context fields)

**Related**:
- `bookings` - Source of transactions (when payments processed)
- `profiles` - Transaction ownership (profile_id)
- `listings` - Context source (via bookings)

**Key Fields**:
```sql
transactions {
  id UUID,
  profile_id UUID,              -- NULL for platform fees
  booking_id UUID,              -- Link to booking
  type TEXT,                    -- 'Session Payment', 'Commission', 'Platform Fee', etc.
  status TEXT,                  -- 'clearing', 'available', 'paid_out', 'disputed', 'refunded'
  amount DECIMAL(10,2),         -- Positive = credit, Negative = debit
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  -- Context fields (v5.10)
  service_name TEXT,
  subjects TEXT[],
  session_date TIMESTAMPTZ,
  location_type TEXT,
  tutor_name TEXT,
  client_name TEXT,
  agent_name TEXT,
  created_at TIMESTAMPTZ,
  paid_out_at TIMESTAMPTZ
}
```

---

## Integration Points

### Critical Dependencies

1. **Bookings** (CRITICAL):
   - Stripe webhook triggers `process_booking_payment()`
   - Creates 3 transactions: platform fee, tutor payout, agent commission
   - Copies context fields from bookings

2. **Payments** (CRITICAL):
   - Stripe webhook handler processes payment events
   - `checkout.session.completed` → create transactions
   - `transfer.paid` → update status to 'paid_out'
   - `charge.refunded` → create refund transaction
   - `charge.dispute.created` → update status to 'disputed'

3. **Referrals**:
   - Agent commission calculated based on `bookings.agent_profile_id`
   - 10% of tutor share (10% of £90 = £9 if client paid £100)

4. **Auth**:
   - RLS policies enforce transaction ownership
   - Role-based filtering (tutors see payments, agents see commissions)

5. **Dashboard**:
   - Transactions hub displays filtered transaction history
   - Wallet balance widget shows available/pending/total
   - Payout history page

---

## Key Functions & RPC

### Database Functions

**1. process_booking_payment(booking_id, amount, payment_intent_id)**
- **Purpose**: Create financial transactions when booking is paid
- **Location**: `apps/api/migrations/030_create_payment_webhook_rpc.sql` (v1), `060_update_payment_webhook_rpc_v4_9.sql` (v2), `109_update_payment_rpc_with_context.sql` (v3)
- **Logic**:
  1. Fetch booking + listing context
  2. Calculate splits: 10% platform, 80% tutor, 10% agent (if exists)
  3. Create 3 transaction records with status='clearing'
  4. Update booking.payment_status = 'Paid'
- **Returns**: `{ platform_fee, tutor_payout, agent_commission, transaction_ids[] }`

**2. get_wallet_balance(profile_id)**
- **Purpose**: Calculate user's wallet balance
- **Location**: `apps/api/migrations/059_create_wallet_balance_functions.sql`
- **Logic**:
  - available = SUM(amount) WHERE status='available' AND amount > 0
  - pending = SUM(amount) WHERE status='clearing' AND amount > 0
  - total = available + pending
- **Returns**: `{ available, pending, total }`

### API Routes

**1. GET /api/financials**
- Fetch user's transactions + wallet balance
- Role-based filtering (tutor/agent/client)
- Returns: `{ transactions[], balances: { available, pending, total } }`

**2. POST /api/webhooks/stripe**
- Handle Stripe webhook events
- Events: checkout.session.completed, transfer.paid, charge.refunded, charge.dispute.created
- Calls: process_booking_payment() or updates transaction status

---

## Transaction Types

| Type | Direction | Profile | Description |
|------|-----------|---------|-------------|
| Session Payment | Credit (+) | Tutor | Earnings from booking |
| Commission | Credit (+) | Agent | Referral commission |
| Platform Fee | Credit (+) | NULL | Tutorwise revenue |
| Refund | Debit (-) | Tutor/Client | Refunded payment |
| Payout | Debit (-) | Tutor/Agent | Bank transfer |
| Dispute | Debit (-) | Tutor | Chargeback |

---

## Status Lifecycle

```
clearing (0-2 days)    → Stripe settlement pending
    ↓
available (2-7 days)   → Funds cleared, ready for payout
    ↓
paid_out (final)       → Transferred to bank account

Alternative paths:
  disputed  → Chargeback initiated
  refunded  → Refund processed
```

---

## Common Tasks & Patterns

### Task 1: Add New Transaction Type

**Example**: Add "Reward" transaction type for review completion

```typescript
// 1. Update transaction type enum (if using enums)
ALTER TYPE transaction_type_enum ADD VALUE 'reward';

// 2. Create transaction
INSERT INTO transactions (
  profile_id,
  type,
  description,
  status,
  amount
) VALUES (
  :reviewer_id,
  'Reward',
  'Review completion reward',
  'available',
  0.50
);

// 3. Update UI to display new type
// apps/web/src/app/components/feature/financials/TransactionCard.tsx
const typeIcons = {
  'Session Payment': <DollarSign />,
  'Commission': <Percent />,
  'Reward': <Gift />,  // ← Add new icon
  ...
};
```

### Task 2: Implement Payout Hold Period

**Requirement**: Commission should have 14-day hold before becoming available

```sql
-- 1. Add release_date column (already exists in schema)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ;

-- 2. Update process_booking_payment() to set release_date
INSERT INTO transactions (
  ...
  status,
  release_date
) VALUES (
  ...
  'pending',  -- New status
  NOW() + INTERVAL '14 days'
);

-- 3. Create cron job to release funds
CREATE OR REPLACE FUNCTION release_pending_transactions()
RETURNS VOID AS $$
BEGIN
  UPDATE transactions
  SET status = 'available'
  WHERE status = 'pending'
    AND release_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- 4. Update get_wallet_balance() to include 'pending'
available_balance = SUM(amount) WHERE status IN ('available', 'pending')
```

### Task 3: Add Refund Processing

**Requirement**: Handle Stripe refund webhooks

```typescript
// apps/api/webhooks/stripe/route.ts
case 'charge.refunded': {
  const charge = event.data.object as Stripe.Charge;
  const bookingId = charge.metadata?.booking_id;

  // Find original transactions
  const { data: originalTxs } = await supabase
    .from('transactions')
    .select('*')
    .eq('stripe_payment_intent_id', charge.payment_intent);

  // Create refund transactions (negative amounts)
  for (const tx of originalTxs) {
    await supabase.from('transactions').insert({
      profile_id: tx.profile_id,
      booking_id: tx.booking_id,
      type: 'Refund',
      description: `Refund for ${tx.description}`,
      status: 'refunded',
      amount: -tx.amount,  // Negative (reverse original)
      stripe_refund_id: charge.refund.id
    });
  }
  break;
}
```

### Task 4: Add Financial Reconciliation

**Requirement**: Daily job to match Tutorwise ledger with Stripe balance

```typescript
// reconciliation-job.ts
async function reconcileFinancials(date: Date) {
  // 1. Sum Tutorwise transactions
  const { data } = await supabase.rpc('sum_transactions_by_date', {
    target_date: date
  });
  const dbTotal = data[0].total;

  // 2. Sum Stripe balance transactions
  const stripeTransactions = await stripe.balanceTransactions.list({
    created: {
      gte: Math.floor(date.getTime() / 1000),
      lt: Math.floor(date.getTime() / 1000) + 86400
    }
  });
  const stripeTotal = stripeTransactions.data.reduce(
    (sum, txn) => sum + txn.amount / 100,
    0
  );

  // 3. Alert if mismatch
  if (Math.abs(dbTotal - stripeTotal) > 0.01) {
    await sendAlert({
      type: 'RECONCILIATION_MISMATCH',
      date,
      dbTotal,
      stripeTotal,
      diff: dbTotal - stripeTotal
    });
  }
}
```

---

## Testing Checklist

When modifying the financials feature, test:

- [ ] Transaction creation (correct amounts, types, status)
- [ ] Wallet balance calculation (available + pending = total)
- [ ] Status transitions (clearing → available → paid_out)
- [ ] Refund processing (negative amounts created)
- [ ] Dispute handling (status updated to 'disputed')
- [ ] Commission calculation (correct agent attribution)
- [ ] Context snapshotting (service_name, subjects preserved)
- [ ] RLS policies (users only see own transactions)
- [ ] Platform fee transactions (profile_id = NULL)
- [ ] Financial reconciliation (matches Stripe)

---

## Security Considerations

1. **RLS Policies**: Users can only see their own transactions (profile_id = auth.uid())
2. **Immutability**: Transactions cannot be deleted (only status updates)
3. **Stripe Webhook Verification**: ALWAYS verify webhook signatures
4. **Amount Validation**: Negative amounts only for debits (Refund, Payout)
5. **Audit Logging**: All transaction changes logged for compliance

---

## Performance Optimization

1. **Indexes**:
   - `idx_transactions_profile_id` - Fast user lookup
   - `idx_transactions_status` - Fast status filtering
   - `idx_transactions_created_at DESC` - Fast sorting
   - Partial index for available balance: `WHERE status = 'available' AND amount > 0`

2. **Caching**:
   - Cache wallet balance (30-second stale time)
   - Auto-refresh transactions every 60 seconds

3. **Pagination**:
   - Limit transactions list to 50 per page
   - Use offset-based pagination for history

---

## Migration Guidelines

When creating new migrations for financials:

1. **Add Context Fields**: Always include COMMENT ON COLUMN for new fields
2. **Backfill Existing Data**: Use UPDATE to populate new fields from related tables
3. **Create Indexes**: Add indexes for new filterable/sortable columns
4. **Test Rollback**: Ensure migration can be rolled back safely
5. **Document Changes**: Update this prompt with new fields/functions

---

## Related Documentation

- [Solution Design](./financials-solution-design.md) - Complete architecture
- [README](./README.md) - Quick reference
- [Bookings Solution Design](../bookings/bookings-solution-design.md) - Transaction source
- [Payments Solution Design](../payments/payments-solution-design.md) - Stripe integration
- [Referrals Solution Design](../referrals/referrals-solution-design.md) - Commission logic

---

**Last Updated**: 2025-12-12
**Maintainer**: Backend Team
**For Questions**: See solution-design.md or ask team lead

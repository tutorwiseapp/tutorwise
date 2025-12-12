# Financials

**Status**: Active
**Last Code Update**: 2025-12-10 (Migration 111)
**Last Doc Update**: 2025-12-12
**Priority**: Critical (Tier 1 - Revenue Operations)
**Architecture**: Hub-Based Ledger + Stripe Connect

## Quick Links
- [Solution Design](./financials-solution-design.md) - Complete architecture, 9 system integrations

## Overview

The financials feature is Tutorwise's comprehensive transaction ledger and payout management system. Built on a double-entry accounting model with Stripe Connect integration, it tracks all monetary flows through the platform including booking payments, commission splits, refunds, disputes, and platform fees with complete audit trails and automated reconciliation.

## Key Features

- **Transaction Ledger**: Complete audit trail of all financial movements
- **Multi-Status Tracking**: clearing → available → paid_out (v4.9)
- **Wallet Balances**: Real-time available/pending balance calculation
- **Transaction Context**: Service snapshots for historical accuracy (v5.10)
- **Commission Attribution**: Automatic agent/referral commission tracking
- **Stripe Connect Payouts**: Automated weekly batch processing
- **Dispute Management**: Chargeback and refund tracking
- **Role-Based Views**: Client/tutor/agent-specific filtering
- **Financial Reconciliation**: Daily Stripe balance matching

## Implementation Status

### ✅ Completed (v4.9)
- Transaction ledger with full audit trail
- Multi-status lifecycle (clearing, available, paid_out, disputed, refunded)
- Wallet balance calculation
- Transaction context snapshotting (v5.10)
- Commission attribution
- Transactions hub UI with filtering
- Stripe webhook integration
- Role-based transaction filtering

### 🚧 In Progress
- Automated payout processing (manual trigger implemented)
- Financial reconciliation job (logic exists, automation pending)
- Dispute resolution workflow

### 📋 Planned
- Automated weekly payout batches
- Multi-currency support
- Tax reporting (1099/VAT)
- Advanced analytics dashboard
- Reserve account modeling

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION FLOW                                 │
└────────────────────────────────────────────────────────────────────┘

Booking Completed
      ↓
Stripe Webhook (checkout.session.completed)
      ↓
process_booking_payment(booking_id, amount)
      ↓
3 Transactions Created:
  1. Platform Fee (10%) → profile_id: NULL
  2. Tutor Payout (72%) → profile_id: tutor_id
  3. Agent Commission (9%) → profile_id: agent_profile_id
      ↓
Status Lifecycle:
  clearing (0-2 days) → available (2-7 days) → paid_out (completed)
      ↓
Stripe Connect Payout (weekly batch or manual)
```

## Database Schema

```sql
-- Core ledger table
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),  -- NULL for platform fees
  booking_id UUID REFERENCES bookings(id),

  -- Transaction details
  type TEXT NOT NULL,           -- 'Session Payment', 'Commission', 'Platform Fee', etc.
  description TEXT,
  status TEXT NOT NULL,         -- 'clearing', 'available', 'paid_out', 'disputed', 'refunded'
  amount DECIMAL(10, 2) NOT NULL,

  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,

  -- Transaction context (v5.10)
  service_name TEXT,            -- e.g., "GCSE Maths Tutoring"
  subjects TEXT[],              -- e.g., ["Mathematics"]
  session_date TIMESTAMPTZ,     -- When session occurred
  location_type TEXT,           -- 'online', 'in_person', 'hybrid'
  tutor_name TEXT,              -- Snapshot for history
  client_name TEXT,             -- Snapshot for history
  agent_name TEXT,              -- Agent/business name

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_out_at TIMESTAMPTZ
);

-- Wallet balance function
CREATE FUNCTION get_wallet_balance(profile_id UUID)
RETURNS TABLE (available DECIMAL, pending DECIMAL, total DECIMAL);
```

## Transaction Types

| Type | Direction | Profile Type | Description |
|------|-----------|--------------|-------------|
| Session Payment | Credit (+) | Tutor | Earnings from completed booking |
| Commission | Credit (+) | Agent | Referral commission |
| Platform Fee | Credit (+) | Platform (NULL) | Tutorwise revenue |
| Refund | Debit (-) | Tutor/Client | Refunded payment |
| Payout | Debit (-) | Tutor/Agent | Bank transfer |
| Dispute | Debit (-) | Tutor | Chargeback deduction |

## Status Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│  TRANSACTION STATUS FLOW                                         │
└──────────────────────────────────────────────────────────────────┘

clearing    → Stripe settlement pending (0-2 days)
    ↓
available   → Funds cleared, ready for payout (2-7 days)
    ↓
paid_out    → Transferred to bank account (final)

Alternative paths:
  disputed  → Chargeback initiated
  refunded  → Refund processed
```

## API Routes

### Get Financials
```typescript
GET /api/financials
```
**Purpose**: Fetch transactions and wallet balance for authenticated user

**Response**:
```json
{
  "transactions": [
    {
      "id": "txn_123",
      "type": "Session Payment",
      "description": "Payment for GCSE Maths Tutoring",
      "status": "available",
      "amount": 72.00,
      "service_name": "GCSE Maths Tutoring",
      "subjects": ["Mathematics"],
      "session_date": "2025-12-12T14:00:00Z",
      "tutor_name": "John Smith",
      "client_name": "Jane Doe",
      "created_at": "2025-12-10T10:30:00Z"
    }
  ],
  "balances": {
    "available": 150.00,
    "pending": 50.00,
    "total": 200.00
  }
}
```

### Stripe Webhook
```typescript
POST /api/webhooks/stripe
```
**Purpose**: Handle Stripe payment events

**Events**:
- `checkout.session.completed` → Create transactions
- `transfer.paid` → Update status to `paid_out`
- `charge.refunded` → Create refund transaction
- `charge.dispute.created` → Update status to `disputed`

## Key Files

### Frontend
```
apps/web/src/app/
├── (authenticated)/financials/
│   ├── page.tsx                                # Transactions hub
│   ├── payouts/page.tsx                        # Payout history
│   └── disputes/page.tsx                       # Dispute management
├── components/feature/financials/
│   ├── TransactionCard.tsx                     # Transaction display
│   ├── WalletBalanceWidget.tsx                 # Balance summary
│   ├── BalanceSummaryWidget.tsx                # Detailed breakdown
│   ├── PayoutCard.tsx                          # Payout history card
│   └── DisputeCard.tsx                         # Dispute card
└── lib/api/financials.ts                       # API client
```

### Backend
```
apps/api/
├── webhooks/stripe/route.ts                    # Stripe webhook handler
├── migrations/
│   ├── 028_create_hubs_v3_6_schema.sql        # Created transactions table
│   ├── 030_create_payment_webhook_rpc.sql     # process_booking_payment() v1
│   ├── 057_add_transaction_status_and_clearing.sql  # Status tracking (v4.9)
│   ├── 059_create_wallet_balance_functions.sql     # get_wallet_balance()
│   ├── 060_update_payment_webhook_rpc_v4_9.sql     # process_booking_payment() v2
│   ├── 107_add_transaction_context_fields.sql      # Context snapshotting (v5.10)
│   ├── 109_update_payment_rpc_with_context.sql     # process_booking_payment() v3
│   ├── 110_add_transaction_agent_name.sql          # agent_name field
│   └── 111_update_payment_rpc_add_agent_name.sql   # process_booking_payment() v4
```

## System Integrations

The financials system integrates with **9 major platform features**:

1. **Bookings** - Transaction creation on booking completion
2. **Payments** - Stripe webhook processing
3. **Referrals** - Agent commission attribution
4. **Stripe Connect** - Payout processing
5. **Auth** - User authentication and role-based filtering
6. **Dashboard** - Financial widgets and UI
7. **Account** - Stripe Connect onboarding
8. **Reviews** - Review completion rewards (future)
9. **Wiselist** - Shared referral commissions (future)

See [financials-solution-design.md](./financials-solution-design.md) for detailed integration documentation.

## Commission Model

### Standard 80/10/10 Split

**Client pays £100 for tutoring session:**
```
Platform:  £10 (10%)
Tutor:     £72 (80% - agent commission)
Agent:     £9  (10% of tutor's £90 share)
```

### No Agent (90/10 Split)

**Client pays £100, no referral agent:**
```
Platform:  £10 (10%)
Tutor:     £90 (90%)
```

## Usage Examples

### Calculate Wallet Balance

```typescript
// Get user's balance
const { data: balance } = await supabase.rpc('get_wallet_balance', {
  p_profile_id: userId
});

console.log(balance);
// {
//   available: 150.00,
//   pending: 50.00,
//   total: 200.00
// }
```

### Fetch Transactions

```typescript
// Get all available transactions
const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .eq('profile_id', userId)
  .eq('status', 'available')
  .order('created_at', { ascending: false });
```

### Process Booking Payment

```sql
-- Called by Stripe webhook
SELECT * FROM process_booking_payment(
  p_booking_id := 'booking-123',
  p_payment_amount := 100.00,
  p_payment_intent_id := 'pi_test_123'
);

-- Returns:
-- {
--   platform_fee: 10.00,
--   tutor_payout: 72.00,
--   agent_commission: 9.00,
--   transaction_ids: [uuid1, uuid2, uuid3]
-- }
```

## Security & Compliance

### Row Level Security

```sql
-- Users can only see their own transactions
CREATE POLICY transactions_select_own ON transactions
  FOR SELECT
  USING (auth.uid() = profile_id);
```

### Transaction Immutability

- Transactions cannot be deleted (only status updates)
- Audit log tracks all changes
- Stripe webhook signatures verified

### Financial Reconciliation

```typescript
// Daily reconciliation job (runs nightly)
async function reconcileFinancials(date: Date) {
  const dbTotal = await sumDatabaseTransactions(date);
  const stripeTotal = await sumStripeBalance(date);

  if (Math.abs(dbTotal - stripeTotal) > 0.01) {
    alert('Financial mismatch detected');
  }
}
```

## Testing

### Manual Test Scenarios

**Scenario 1: Booking Payment with Agent**
```
1. Create booking (tutor has referred_by_profile_id)
2. Complete Stripe checkout
3. Verify 3 transactions created:
   - Platform Fee: £10
   - Tutor Payout: £72
   - Agent Commission: £9
✅ Verify: Total = £100, balances updated
```

**Scenario 2: Refund Processing**
```
1. Process refund via Stripe dashboard
2. Webhook triggers refund transaction
3. Verify tutor balance decreased
✅ Verify: Refund transaction created with negative amount
```

**Scenario 3: Payout Processing**
```
1. Tutor has available balance > £10
2. Trigger payout (manual or automated)
3. Stripe transfer created
4. Verify status updated to 'paid_out'
✅ Verify: Available balance = 0, transactions marked paid_out
```

### Automated Tests

```typescript
describe('Financial Transactions', () => {
  it('should create correct commission split', async () => {
    const result = await processBookingPayment({
      bookingId: 'test-123',
      amount: 100
    });

    expect(result.platform_fee).toBe(10);
    expect(result.tutor_payout).toBe(72);
    expect(result.agent_commission).toBe(9);
  });

  it('should calculate wallet balance correctly', async () => {
    const balance = await getWalletBalance(userId);
    expect(balance.total).toBe(balance.available + balance.pending);
  });
});
```

## Performance

### Database Optimization

```sql
-- Indexes for fast queries
CREATE INDEX idx_transactions_profile_id ON transactions(profile_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Partial indexes for common filters
CREATE INDEX idx_transactions_available_balance
  ON transactions(profile_id, amount)
  WHERE status = 'available' AND amount > 0;
```

### Caching Strategy

```typescript
// React Query configuration
const { data: financials } = useQuery({
  queryKey: ['financials', userId],
  queryFn: getFinancials,
  staleTime: 30 * 1000,       // 30 seconds
  refetchInterval: 60 * 1000  // Auto-refresh every minute
});
```

## Troubleshooting

### Issue 1: Transaction Not Created

**Symptoms**: Booking paid but no transactions

**Check**:
```sql
-- Verify webhook processed
SELECT * FROM stripe_webhook_logs WHERE booking_id = :booking_id;
```

**Fix**: Re-process webhook or manually call `process_booking_payment()`

### Issue 2: Incorrect Balance

**Symptoms**: Wallet balance doesn't match reality

**Check**:
```sql
-- Manual calculation
SELECT
  SUM(amount) FILTER (WHERE status = 'available') AS available,
  SUM(amount) FILTER (WHERE status = 'clearing') AS pending
FROM transactions
WHERE profile_id = :user_id AND amount > 0;
```

**Fix**: Verify transaction statuses are correct

### Issue 3: Payout Failed

**Symptoms**: Stripe transfer created but status not updated

**Check**: Verify `transfer.paid` webhook configured

**Fix**: Manually update transaction status to `paid_out`

## Monitoring

### Key Metrics

```typescript
{
  "daily_transaction_volume": 12453.50,
  "daily_transaction_count": 127,
  "pending_balance_total": 5234.23,
  "available_balance_total": 8901.12,
  "failed_webhook_count": 0,
  "reconciliation_diff": 0.00
}
```

### Alerts

```typescript
if (reconciliationDiff > 10) alert('Financial mismatch > £10');
if (failedWebhookCount > 5) alert('Multiple webhook failures');
if (avgPayoutTimeDays > 7) alert('Payout delays detected');
```

## Related Documentation

- [Bookings Solution Design](../bookings/bookings-solution-design.md) - Transaction triggers
- [Payments Solution Design](../payments/payments-solution-design.md) - Stripe integration
- [Referrals Solution Design](../referrals/referrals-solution-design.md) - Commission logic
- [Account Solution Design](../account/account-solution-design.md) - Stripe Connect setup

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-12 | v4.9 | Documentation complete with full integrations |
| 2025-12-10 | v5.10 | Added transaction context fields (migration 111) |
| 2025-11-23 | v4.9 | Added multi-status tracking (clearing/available/paid_out) |
| 2025-11-14 | v4.9 | Created wallet balance functions |
| 2025-11-02 | v3.6 | Initial transactions system |

---

**Last Updated**: 2025-12-12
**Version**: v4.9 (Transaction Context & Status Tracking)
**Status**: Active - 85% Complete
**Architecture**: Hub-Based Ledger + Stripe Connect

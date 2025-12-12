# Financials Solution Design

**Version**: v4.9 (Transaction Context & Status Tracking)
**Date**: 2025-12-12
**Status**: Active
**Owner**: Backend Team
**Architecture**: Hub-Based Ledger + Stripe Connect Payouts

---

## Executive Summary

The Financials feature provides a comprehensive transaction ledger and payout management system for Tutorwise. Built on a double-entry accounting model with Stripe Connect integration, the system tracks all monetary flows through the platform including booking payments, commission splits, refunds, disputes, and platform fees. The system maintains financial accuracy with transaction snapshotting, status tracking, and automated payout reconciliation.

**Key Capabilities**:
- **Transaction Ledger**: Complete audit trail of all financial movements
- **Multi-Status Tracking**: clearing → available → paid_out (v4.9)
- **Wallet Balances**: Real-time available/pending balance calculation
- **Transaction Context**: Service snapshots for historical accuracy (v5.10)
- **Commission Attribution**: Agent/referral commission tracking
- **Stripe Connect Payouts**: Automated payout processing
- **Dispute Management**: Chargeback and refund tracking
- **Role-Based Views**: Client/tutor/agent-specific transaction filtering

---

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     FINANCIALS SYSTEM ARCHITECTURE                  │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION CREATION FLOW                        │
└────────────────────────────────────────────────────────────────────┘

                    [Booking Completed]
                            │
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Stripe Webhook: checkout.session.completed                         │
│  → apps/api/webhooks/stripe/route.ts                                │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│  process_booking_payment(booking_id, amount, payment_intent_id)     │
│  → Database RPC function (migration 030, 060, 109)                  │
│                                                                      │
│  1. Fetch booking + listing snapshot                                │
│  2. Calculate commission splits (80/10/10)                          │
│  3. Create transaction records:                                     │
│                                                                      │
│     A) PLATFORM FEE (10%)                                           │
│        profile_id: NULL                                             │
│        type: 'Platform Fee'                                         │
│        amount: £10                                                  │
│        status: 'clearing'                                           │
│        service_name: "GCSE Maths Tutoring"                          │
│        subjects: ["Mathematics"]                                    │
│        tutor_name: "John Smith"                                     │
│        client_name: "Jane Doe"                                      │
│                                                                      │
│     B) TUTOR PAYOUT (80% - agent commission)                       │
│        profile_id: tutor_id                                         │
│        type: 'Session Payment'                                      │
│        amount: £72                                                  │
│        status: 'clearing'                                           │
│        + same context fields                                        │
│                                                                      │
│     C) AGENT COMMISSION (10% of tutor share)                       │
│        profile_id: agent_profile_id                                 │
│        type: 'Commission'                                           │
│        amount: £9                                                   │
│        status: 'clearing'                                           │
│        agent_name: "Agency Name"                                    │
│        + same context fields                                        │
│                                                                      │
│  4. Update booking.payment_status = 'Paid'                         │
│  5. Trigger review session creation                                 │
│  6. Trigger CaaS recalculation                                      │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│  STATUS LIFECYCLE (v4.9)                                            │
│                                                                      │
│  clearing (0-2 days)    → Stripe settlement pending                │
│     ↓                                                               │
│  available (2-7 days)   → Funds cleared, ready for payout          │
│     ↓                                                               │
│  paid_out (completed)   → Transferred to bank account              │
│                                                                      │
│  Alternative paths:                                                 │
│  disputed               → Chargeback initiated                      │
│  refunded               → Refund processed                          │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│  WALLET BALANCE CALCULATION (Real-Time)                            │
│  → get_wallet_balance(profile_id)                                   │
│                                                                      │
│  available_balance = SUM(amount) WHERE status = 'available'        │
│  pending_balance   = SUM(amount) WHERE status = 'clearing'         │
│  total_balance     = available_balance + pending_balance           │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│  PAYOUT PROCESSING (Stripe Connect)                                │
│  → Automated weekly batch OR manual withdrawal                      │
│                                                                      │
│  1. Check available_balance > £10 (minimum payout)                 │
│  2. Create Stripe Transfer to connected account                    │
│  3. Update transactions: status = 'paid_out'                       │
│  4. Record payout transaction                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## System Integrations

The financials system integrates with **9 major platform features**:

### 1. Bookings Integration (CRITICAL - Transaction Source)

**Purpose**: Create financial transactions when bookings are completed and paid

**Key Files**:
- `apps/api/webhooks/stripe/route.ts` - Stripe webhook handler
- `apps/api/migrations/030_create_payment_webhook_rpc.sql` - `process_booking_payment()` function
- `apps/api/migrations/109_update_payment_rpc_with_context.sql` - Added context snapshotting

**Mechanism**:

```sql
-- process_booking_payment(booking_id UUID, payment_amount DECIMAL, payment_intent_id TEXT)
CREATE OR REPLACE FUNCTION process_booking_payment(
  p_booking_id UUID,
  p_payment_amount DECIMAL,
  p_payment_intent_id TEXT
) RETURNS TABLE (
  platform_fee DECIMAL,
  tutor_payout DECIMAL,
  agent_commission DECIMAL,
  transaction_ids UUID[]
) AS $$
DECLARE
  v_booking RECORD;
  v_platform_fee DECIMAL;
  v_tutor_payout DECIMAL;
  v_agent_commission DECIMAL := 0;
  v_transaction_ids UUID[] := ARRAY[]::UUID[];
  v_tutor_profile RECORD;
  v_client_profile RECORD;
BEGIN
  -- 1. Get booking details with snapshot context (v5.8)
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Get profiles for context
  SELECT * INTO v_tutor_profile FROM profiles WHERE id = v_booking.tutor_id;
  SELECT * INTO v_client_profile FROM profiles WHERE id = v_booking.client_id;

  -- 2. Calculate splits (80/10/10)
  v_platform_fee := p_payment_amount * 0.10;
  v_tutor_payout := p_payment_amount * 0.80;

  -- 3. Agent commission (10% of tutor share = 10% of 80%)
  IF v_booking.agent_profile_id IS NOT NULL THEN
    v_agent_commission := v_tutor_payout * 0.10;
    v_tutor_payout := v_tutor_payout - v_agent_commission;
  END IF;

  -- 4. Create platform fee transaction
  INSERT INTO transactions (
    profile_id,
    booking_id,
    type,
    description,
    status,
    amount,
    stripe_payment_intent_id,
    -- Context fields (v5.10)
    service_name,
    subjects,
    session_date,
    location_type,
    tutor_name,
    client_name
  ) VALUES (
    NULL,  -- Platform fee belongs to platform
    p_booking_id,
    'Platform Fee',
    'Platform fee for booking ' || v_booking.id::TEXT,
    'clearing',
    v_platform_fee,
    p_payment_intent_id,
    -- Snapshot context
    v_booking.service_name,
    v_booking.subjects,
    v_booking.session_start_time,
    v_booking.location_type,
    v_tutor_profile.full_name,
    v_client_profile.full_name
  ) RETURNING id INTO v_transaction_ids[1];

  -- 5. Create tutor payout transaction
  INSERT INTO transactions (
    profile_id,
    booking_id,
    type,
    description,
    status,
    amount,
    stripe_payment_intent_id,
    service_name,
    subjects,
    session_date,
    location_type,
    tutor_name,
    client_name
  ) VALUES (
    v_booking.tutor_id,
    p_booking_id,
    'Session Payment',
    'Payment for ' || v_booking.service_name,
    'clearing',
    v_tutor_payout,
    p_payment_intent_id,
    v_booking.service_name,
    v_booking.subjects,
    v_booking.session_start_time,
    v_booking.location_type,
    v_tutor_profile.full_name,
    v_client_profile.full_name
  ) RETURNING id INTO v_transaction_ids[2];

  -- 6. Create agent commission transaction (if applicable)
  IF v_agent_commission > 0 THEN
    INSERT INTO transactions (
      profile_id,
      booking_id,
      type,
      description,
      status,
      amount,
      stripe_payment_intent_id,
      agent_name,  -- v5.10
      service_name,
      subjects,
      session_date,
      location_type,
      tutor_name,
      client_name
    ) VALUES (
      v_booking.agent_profile_id,
      p_booking_id,
      'Commission',
      'Referral commission for ' || v_booking.service_name,
      'clearing',
      v_agent_commission,
      p_payment_intent_id,
      (SELECT business_name FROM profiles WHERE id = v_booking.agent_profile_id),
      v_booking.service_name,
      v_booking.subjects,
      v_booking.session_start_time,
      v_booking.location_type,
      v_tutor_profile.full_name,
      v_client_profile.full_name
    ) RETURNING id INTO v_transaction_ids[3];
  END IF;

  -- 7. Update booking payment status
  UPDATE bookings
  SET payment_status = 'Paid'
  WHERE id = p_booking_id;

  -- Return summary
  RETURN QUERY SELECT v_platform_fee, v_tutor_payout, v_agent_commission, v_transaction_ids;
END;
$$ LANGUAGE plpgsql;
```

**Integration Points**:
- Stripe webhook creates transactions via `process_booking_payment()`
- Booking snapshot fields copied to transactions (service_name, subjects, session_date)
- Agent commission attribution from `bookings.agent_profile_id`

**Data Flow**:
```
Booking Paid → Webhook → process_booking_payment() → 3 Transactions Created
  1. Platform Fee (NULL profile_id)
  2. Tutor Payout (tutor_id)
  3. Agent Commission (agent_profile_id, if exists)
```

---

### 2. Payments Integration (CRITICAL - Stripe Connect)

**Purpose**: Process payments via Stripe and handle webhooks

**Key Files**:
- `apps/api/webhooks/stripe/route.ts` - Webhook endpoint
- `apps/web/src/app/api/create-checkout-session/route.ts` - Payment initialization

**Webhook Events Handled**:

```typescript
// apps/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(await req.text(), sig!, webhookSecret!);
  } catch (err) {
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;

      if (bookingId) {
        // Call process_booking_payment RPC
        const { data, error } = await supabase.rpc('process_booking_payment', {
          p_booking_id: bookingId,
          p_payment_amount: session.amount_total! / 100, // Convert from cents
          p_payment_intent_id: session.payment_intent
        });

        if (error) {
          console.error('Payment processing failed:', error);
          return Response.json({ error: 'Payment processing failed' }, { status: 500 });
        }
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      // Update transaction status to 'refunded'
      await handleRefund(charge);
      break;
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute;
      // Update transaction status to 'disputed'
      await handleDispute(dispute);
      break;
    }

    case 'transfer.paid': {
      const transfer = event.data.object as Stripe.Transfer;
      // Update transaction status to 'paid_out'
      await handleTransferPaid(transfer);
      break;
    }
  }

  return Response.json({ received: true });
}
```

**Integration Points**:
- Stripe checkout session metadata includes `booking_id`
- Webhook processes payment and creates transactions
- Stripe transfer events update transaction status to `paid_out`

---

### 3. Referrals Integration (Commission Attribution)

**Purpose**: Attribute agent commissions to referred bookings

**Key Files**:
- `profiles.referred_by_profile_id` - Lifetime attribution
- `bookings.agent_profile_id` - Copied from tutor's profile
- `transactions` with agent_name field (v5.10)

**Mechanism**:

```sql
-- During booking creation (apps/web/src/app/api/bookings/route.ts)
-- Copy agent attribution from tutor's profile
INSERT INTO bookings (
  client_id,
  tutor_id,
  agent_profile_id, -- ← Copied from tutor's referred_by_profile_id
  ...
)
SELECT
  :client_id,
  listing.profile_id,
  tutor_profile.referred_by_profile_id, -- ← Lifetime attribution
  ...
FROM listings
JOIN profiles tutor_profile ON listing.profile_id = tutor_profile.id
WHERE listing.id = :listing_id;
```

**Integration Points**:
- Booking copies `tutor.referred_by_profile_id` to `bookings.agent_profile_id`
- Payment processing creates agent commission transaction
- Agent sees commission in their financials dashboard

**Commission Calculation**:
```
Client pays £100
├─ Platform: £10 (10%)
├─ Agent: £9 (10% of tutor's £90 share)
└─ Tutor: £81 (remaining)
```

---

### 4. Stripe Connect Integration (Payout Processing)

**Purpose**: Transfer funds to user bank accounts

**Key Files**:
- `profiles.stripe_account_id` - Connected account ID
- Payout processing logic (future implementation)

**Payout Flow**:

```typescript
// Automated weekly payout (cron job or manual trigger)
async function processPayouts() {
  // 1. Get all profiles with available balance > £10
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, stripe_account_id')
    .rpc('get_wallet_balance')
    .gte('available', 10.00);

  for (const profile of profiles) {
    // 2. Calculate payout amount
    const { data: balance } = await supabase.rpc('get_wallet_balance', {
      p_profile_id: profile.id
    });

    if (balance.available < 10) continue; // Skip if below minimum

    // 3. Create Stripe Transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(balance.available * 100), // Convert to cents
      currency: 'gbp',
      destination: profile.stripe_account_id,
      description: `Payout for ${profile.full_name}`,
      metadata: {
        profile_id: profile.id,
        payout_date: new Date().toISOString()
      }
    });

    // 4. Update transactions to 'paid_out' status
    await supabase
      .from('transactions')
      .update({ status: 'paid_out', paid_out_at: new Date() })
      .eq('profile_id', profile.id)
      .eq('status', 'available');

    // 5. Create payout transaction record
    await supabase.from('transactions').insert({
      profile_id: profile.id,
      type: 'Payout',
      description: `Payout via Stripe Connect`,
      status: 'paid_out',
      amount: -balance.available, // Negative (debit)
      stripe_transfer_id: transfer.id
    });
  }
}
```

**Integration Points**:
- Stripe Connect onboarding during account setup
- Automated payout processing (weekly batch)
- Transfer events trigger status updates via webhooks

---

### 5. Auth Integration (User Identity)

**Purpose**: Authenticate users and filter transactions by role

**Key Files**:
- `apps/web/src/app/api/financials/route.ts` - Transaction fetching
- `UserProfileContext` - Active role management

**Role-Based Filtering**:

```typescript
// GET /api/financials
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's active role
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  // Role-based filtering
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('profile_id', user.id);

  // Filter by role context
  if (profile.active_role === 'tutor') {
    query = query.in('type', ['Session Payment', 'Refund']);
  } else if (profile.active_role === 'agent') {
    query = query.eq('type', 'Commission');
  } else if (profile.active_role === 'client') {
    query = query.in('type', ['Booking Payment', 'Refund']);
  }

  const { data: transactions } = await query.order('created_at', { ascending: false });

  // Calculate balances
  const { data: balances } = await supabase.rpc('get_wallet_balance', {
    p_profile_id: user.id
  });

  return Response.json({ transactions, balances });
}
```

---

### 6. Dashboard Integration (Financial Widgets)

**Purpose**: Display earnings, transactions, and wallet balance in hub UI

**Key Files**:
- `apps/web/src/app/(authenticated)/financials/page.tsx` - Transactions hub
- `apps/web/src/app/components/feature/financials/WalletBalanceWidget.tsx`
- `apps/web/src/app/components/feature/financials/BalanceSummaryWidget.tsx`

**Dashboard Components**:

```typescript
// Wallet Balance Widget
interface WalletBalance {
  available: number;  // Status = 'available'
  pending: number;    // Status = 'clearing'
  total: number;      // available + pending
}

// Transaction Tabs (v4.9)
const tabs = [
  { id: 'all', label: 'All Transactions' },
  { id: 'clearing', label: 'Clearing', count: clearingCount },
  { id: 'available', label: 'Available', count: availableCount },
  { id: 'paid_out', label: 'Paid Out', count: paidOutCount },
  { id: 'disputed', label: 'Disputed', count: disputedCount },
  { id: 'refunded', label: 'Refunded', count: refundedCount }
];
```

**Integration Points**:
- React Query for real-time balance updates (30-second stale time)
- Auto-refresh every 60 seconds
- Status filtering via URL params (`?status=available`)

---

### 7. Account Integration (Stripe Connect Onboarding)

**Purpose**: Collect bank details for payouts

**Key Files**:
- `apps/web/src/app/(authenticated)/account/settings/page.tsx` - Payout settings
- `profiles.stripe_account_id` - Connected account ID

**Onboarding Flow**:

```typescript
// Create Stripe Connect account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'GB',
  email: profile.email,
  capabilities: {
    transfers: { requested: true }
  }
});

// Save account ID
await supabase
  .from('profiles')
  .update({ stripe_account_id: account.id })
  .eq('id', profile.id);

// Generate onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${baseUrl}/account/settings?refresh=true`,
  return_url: `${baseUrl}/account/settings?success=true`,
  type: 'account_onboarding'
});

// Redirect user to Stripe onboarding
window.location.href = accountLink.url;
```

---

### 8. Reviews Integration (Review Completion Rewards)

**Purpose**: Trigger financial rewards for completed reviews (future feature)

**Potential Integration**:
```sql
-- Future: Reward users for completing reviews
CREATE OR REPLACE FUNCTION reward_review_completion(
  p_review_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO transactions (
    profile_id,
    type,
    description,
    status,
    amount
  )
  SELECT
    reviewer_profile_id,
    'Review Reward',
    'Reward for completing review',
    'available',
    0.50  -- £0.50 per review
  FROM reviews
  WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql;
```

---

### 9. Wiselist Integration (Shared Referral Commissions)

**Purpose**: Track commissions from in-network referrals via wiselist connections

**Key Files**:
- `bookings.wiselist_id` - Attribution to wiselist
- `wiselist_invitations` - Invitation tracking

**Future Enhancement**:
```sql
-- Commission sharing for wiselist referrals
IF v_booking.wiselist_id IS NOT NULL THEN
  -- Split commission between agent and wiselist creator
  v_wiselist_commission := v_agent_commission * 0.50;
  v_agent_commission := v_agent_commission * 0.50;

  INSERT INTO transactions (
    profile_id,
    booking_id,
    type,
    description,
    status,
    amount
  ) VALUES (
    v_wiselist_creator_id,
    p_booking_id,
    'Wiselist Commission',
    'Commission for wiselist referral',
    'clearing',
    v_wiselist_commission
  );
END IF;
```

---

## Database Schema

### Core Tables

```sql
-- 1. transactions (main ledger)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL for platform fees
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Transaction details
  type TEXT NOT NULL,  -- 'Session Payment', 'Commission', 'Platform Fee', 'Refund', 'Payout'
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',  -- 'clearing', 'available', 'paid_out', 'disputed', 'refunded'
  amount DECIMAL(10, 2) NOT NULL,  -- Positive = credit, Negative = debit

  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,

  -- Transaction context (v5.10 - Snapshot for historical accuracy)
  service_name TEXT,              -- e.g., "GCSE Maths Tutoring"
  subjects TEXT[],                -- e.g., ["Mathematics"]
  session_date TIMESTAMPTZ,       -- When the session occurred
  location_type TEXT,             -- 'online', 'in_person', 'hybrid'
  tutor_name TEXT,                -- Tutor display name
  client_name TEXT,               -- Client display name
  agent_name TEXT,                -- Agent/business name (v5.10)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_out_at TIMESTAMPTZ,        -- When status changed to 'paid_out'

  -- Audit
  metadata JSONB                  -- Additional context (dispute details, refund reason, etc.)
);

-- Indexes for performance
CREATE INDEX idx_transactions_profile_id ON transactions(profile_id);
CREATE INDEX idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_subjects ON transactions USING GIN (subjects);
CREATE INDEX idx_transactions_session_date ON transactions(session_date);
```

### Helper Functions

```sql
-- Calculate wallet balance for a user
CREATE OR REPLACE FUNCTION get_wallet_balance(p_profile_id UUID)
RETURNS TABLE (
  available DECIMAL,
  pending DECIMAL,
  total DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'available'), 0) AS available,
    COALESCE(SUM(amount) FILTER (WHERE status = 'clearing'), 0) AS pending,
    COALESCE(SUM(amount) FILTER (WHERE status IN ('clearing', 'available')), 0) AS total
  FROM transactions
  WHERE profile_id = p_profile_id
    AND amount > 0;  -- Only credits (positive amounts)
END;
$$ LANGUAGE plpgsql;
```

### Transaction Types

| Type | Description | Profile Type | Amount |
|------|-------------|--------------|--------|
| **Session Payment** | Tutor earnings from booking | Tutor | Positive |
| **Commission** | Agent referral commission | Agent | Positive |
| **Platform Fee** | Tutorwise revenue | NULL (platform) | Positive |
| **Refund** | Refunded booking payment | Tutor/Client | Negative |
| **Payout** | Bank transfer (withdrawal) | Tutor/Agent | Negative |
| **Booking Payment** | Client payment (rare - usually hidden) | Client | Negative |
| **Dispute** | Chargeback deduction | Tutor | Negative |

### Transaction Status Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│  STATUS FLOW (v4.9)                                              │
└──────────────────────────────────────────────────────────────────┘

  [Transaction Created]
         │
         ↓
   ┌─────────────┐
   │  clearing   │  (0-2 days) - Stripe settlement pending
   └──────┬──────┘
          │
          ↓
   ┌─────────────┐
   │  available  │  (2-7 days) - Funds cleared, ready for payout
   └──────┬──────┘
          │
          ↓
   ┌─────────────┐
   │  paid_out   │  (final) - Transferred to bank account
   └─────────────┘

Alternative paths:
   clearing → disputed  (chargeback initiated)
   clearing → refunded  (refund processed)
   available → refunded (late refund)
```

---

## Security & Compliance

### 1. Row Level Security (RLS)

```sql
-- Users can only see their own transactions
CREATE POLICY transactions_select_own ON transactions
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Platform admins can see all transactions
CREATE POLICY transactions_admin_all ON transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND 'admin' = ANY(roles)
    )
  );
```

### 2. Transaction Immutability

```sql
-- Transactions cannot be deleted (only status updates)
CREATE POLICY transactions_no_delete ON transactions
  FOR DELETE
  USING (false);

-- Audit log for status changes
CREATE TRIGGER transactions_audit
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_transaction_change();
```

### 3. Financial Reconciliation

```typescript
// Daily reconciliation job
async function reconcileFinancials(date: Date) {
  // 1. Sum all transactions
  const { data: dbTotal } = await supabase
    .rpc('sum_transactions_by_date', { target_date: date });

  // 2. Fetch Stripe balance transactions
  const stripeTransactions = await stripe.balanceTransactions.list({
    created: {
      gte: Math.floor(date.getTime() / 1000),
      lt: Math.floor(date.getTime() / 1000) + 86400
    }
  });

  const stripeTotal = stripeTransactions.data.reduce(
    (sum, txn) => sum + txn.amount,
    0
  );

  // 3. Alert if mismatch
  if (Math.abs(dbTotal - stripeTotal / 100) > 0.01) {
    await sendAlert({
      type: 'RECONCILIATION_MISMATCH',
      date,
      dbTotal,
      stripeTotal: stripeTotal / 100,
      diff: dbTotal - stripeTotal / 100
    });
  }
}
```

---

## Performance Considerations

### Database Optimization

```sql
-- Partial indexes for common queries
CREATE INDEX idx_transactions_available_balance
  ON transactions(profile_id, amount)
  WHERE status = 'available' AND amount > 0;

CREATE INDEX idx_transactions_pending_balance
  ON transactions(profile_id, amount)
  WHERE status = 'clearing' AND amount > 0;

-- Materialized view for analytics (refreshed nightly)
CREATE MATERIALIZED VIEW transaction_summary AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  type,
  status,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_amount
FROM transactions
GROUP BY DATE_TRUNC('day', created_at), type, status;

CREATE INDEX idx_transaction_summary_day ON transaction_summary(day);
```

### Caching Strategy

```typescript
// React Query configuration
const { data: financials } = useQuery({
  queryKey: ['financials', userId],
  queryFn: getFinancials,
  staleTime: 30 * 1000,      // 30 seconds
  gcTime: 5 * 60 * 1000,     // 5 minutes
  refetchInterval: 60 * 1000  // Auto-refresh every minute
});
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Transaction Creation', () => {
  it('should create 3 transactions for booking payment with agent', async () => {
    const result = await processBookingPayment({
      bookingId: 'test-booking-123',
      amount: 100,
      paymentIntentId: 'pi_test_123'
    });

    expect(result.transaction_ids).toHaveLength(3);
    expect(result.platform_fee).toBe(10);
    expect(result.tutor_payout).toBe(72);
    expect(result.agent_commission).toBe(9);
  });

  it('should calculate wallet balance correctly', async () => {
    const balance = await getWalletBalance(userId);

    expect(balance.available).toBe(150.00);
    expect(balance.pending).toBe(50.00);
    expect(balance.total).toBe(200.00);
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Payment Flow', () => {
  it('should process booking payment and create correct transactions', async () => {
    // 1. Create booking
    const booking = await createBooking({
      clientId: 'client-123',
      tutorId: 'tutor-456',
      listingId: 'listing-789',
      amount: 100
    });

    // 2. Simulate Stripe webhook
    const webhook = await simulateStripeWebhook({
      type: 'checkout.session.completed',
      booking_id: booking.id,
      amount: 100
    });

    // 3. Verify transactions created
    const transactions = await getTransactions(booking.id);
    expect(transactions).toHaveLength(3);

    // 4. Verify balances updated
    const tutorBalance = await getWalletBalance(booking.tutor_id);
    expect(tutorBalance.pending).toBeGreaterThan(0);
  });
});
```

---

## Troubleshooting

### Issue 1: Transaction Not Created

**Symptoms**: Booking marked as paid but no transactions in database

**Debug**:
```sql
-- Check if webhook processed
SELECT * FROM stripe_webhook_logs WHERE booking_id = :booking_id;

-- Check if RPC function executed
SELECT * FROM pg_stat_user_functions WHERE funcname = 'process_booking_payment';
```

**Fix**:
- Verify webhook signature (check `STRIPE_WEBHOOK_SECRET`)
- Check database function logs
- Re-process webhook manually

### Issue 2: Incorrect Balance

**Symptoms**: Wallet balance doesn't match sum of transactions

**Debug**:
```sql
-- Manual balance calculation
SELECT
  SUM(amount) FILTER (WHERE status = 'available') AS available,
  SUM(amount) FILTER (WHERE status = 'clearing') AS pending
FROM transactions
WHERE profile_id = :user_id AND amount > 0;

-- Compare with function result
SELECT * FROM get_wallet_balance(:user_id);
```

**Fix**:
- Check for negative amounts in credits
- Verify status values are correct
- Run reconciliation job

### Issue 3: Payout Failed

**Symptoms**: Stripe transfer created but transaction status not updated

**Debug**:
```typescript
// Check Stripe transfer status
const transfer = await stripe.transfers.retrieve(transferId);
console.log(transfer.status);

// Check webhook events
const events = await stripe.events.list({
  type: 'transfer.paid',
  limit: 100
});
```

**Fix**:
- Verify `transfer.paid` webhook configured
- Manually update transaction status
- Re-trigger payout

---

## Monitoring & Alerts

### Key Metrics

```typescript
{
  "daily_transaction_volume": 12453.50,
  "daily_transaction_count": 127,
  "pending_balance_total": 5234.23,
  "available_balance_total": 8901.12,
  "failed_webhook_count": 0,
  "reconciliation_diff": 0.00,
  "avg_payout_time_days": 4.2
}
```

### Automated Alerts

```typescript
// Alert conditions
if (reconciliationDiff > 10) {
  alert('Financial reconciliation mismatch > £10');
}

if (failedWebhookCount > 5) {
  alert('Multiple webhook failures detected');
}

if (avgPayoutTimeDays > 7) {
  alert('Payout processing slower than expected');
}
```

---

## Related Documentation

- [Bookings Solution Design](../bookings/bookings-solution-design.md) - Transaction creation trigger
- [Payments Solution Design](../payments/payments-solution-design.md) - Stripe integration
- [Referrals Solution Design](../referrals/referrals-solution-design.md) - Commission attribution
- [Account Solution Design](../account/account-solution-design.md) - Stripe Connect onboarding

---

**Last Updated**: 2025-12-12
**Version**: v4.9 (Transaction Context & Status Tracking)
**Status**: Active - 85% Complete
**Architecture**: Hub-Based Ledger + Stripe Connect

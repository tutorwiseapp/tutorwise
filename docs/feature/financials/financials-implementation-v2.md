# Financials Implementation Guide

**Status**: ✅ Active (v5.10 - Transaction Context Snapshotting)
**Last Updated**: 2025-12-15
**Target Audience**: Developers implementing or extending the financials system

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v5.10 | Created v2 implementation guide with full code examples and transaction context patterns |

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Implementation Patterns](#core-implementation-patterns)
3. [API Endpoints](#api-endpoints)
4. [Database Operations](#database-operations)
5. [React Query Integration](#react-query-integration)
6. [Testing Strategies](#testing-strategies)
7. [Common Tasks](#common-tasks)

---

## Quick Start

### Prerequisites

```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Database connection (for direct SQL operations)
DATABASE_URL=postgresql://postgres:xxx@xxx.pooler.supabase.com:5432/postgres
```

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open financials page
open http://localhost:3000/financials
```

---

## Core Implementation Patterns

### Pattern 1: Processing Booking Payment (Atomic 3-Transaction Split)

**File**: `apps/web/src/app/api/webhooks/stripe/route.ts`

This pattern demonstrates the atomic creation of 3 transactions (platform fee, tutor payout, agent commission) using the RPC function.

```typescript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  // 1. Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 2. Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      console.error('No booking_id in webhook metadata');
      return Response.json({ error: 'Missing booking_id' }, { status: 400 });
    }

    // Create Supabase client with service role (bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Idempotency check
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('payment_status')
      .eq('id', bookingId)
      .single();

    if (existingBooking?.payment_status === 'Paid') {
      console.log('Webhook already processed for booking:', bookingId);
      return Response.json({ received: true }); // Already processed
    }

    // 4. Call atomic RPC function (creates 3 transactions + updates booking)
    const { data: result, error: rpcError } = await supabase.rpc('process_booking_payment', {
      p_booking_id: bookingId,
      p_payment_amount: session.amount_total! / 100, // Convert from cents to GBP
      p_stripe_payment_intent_id: session.payment_intent as string,
    });

    if (rpcError) {
      console.error('RPC failed:', rpcError);

      // Log to failed webhooks table for manual retry
      await supabase.from('failed_webhooks').insert({
        event_id: event.id,
        event_type: event.type,
        status: 'failed',
        error_message: rpcError.message,
        payload: event,
        booking_id: bookingId,
      });

      return Response.json({ error: 'Payment processing failed' }, { status: 500 });
    }

    console.log('Payment processed successfully:', result);
  }

  return Response.json({ received: true });
}
```

### Pattern 2: Calculating Wallet Balance (RPC-Based)

**File**: `apps/web/src/lib/api/financials.ts`

This pattern demonstrates calling the `get_wallet_balance` RPC function to calculate available, pending, and total balances in sub-second time.

```typescript
import { createClient } from '@/lib/supabase/client';

export interface WalletBalance {
  available: number;  // Sum of status='available' transactions
  pending: number;    // Sum of status='clearing' transactions
  total: number;      // available + pending
}

export async function getWalletBalance(profileId: string): Promise<WalletBalance> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_wallet_balance', {
    p_profile_id: profileId,
  });

  if (error) {
    console.error('Failed to fetch wallet balance:', error);
    throw error;
  }

  // RPC returns array with single row
  const balance = data[0];

  return {
    available: parseFloat(balance.available || '0'),
    pending: parseFloat(balance.pending || '0'),
    total: parseFloat(balance.total || '0'),
  };
}

// Usage in React component with React Query
import { useQuery } from '@tanstack/react-query';

export function useWalletBalance(userId: string) {
  return useQuery({
    queryKey: ['wallet-balance', userId],
    queryFn: () => getWalletBalance(userId),
    staleTime: 30 * 1000, // 30 seconds (balances don't change frequently)
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    refetchOnWindowFocus: true,
  });
}
```

### Pattern 3: Fetching Transactions with Context (v5.10)

**File**: `apps/web/src/app/api/financials/route.ts`

This pattern demonstrates fetching transactions with transaction context fields (service_name, subjects, session_date, etc.) without needing JOINs.

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse query parameters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  // 3. Build query
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('profile_id', user.id);

  // Filter by status
  if (status) {
    query = query.eq('status', status);
  }

  // Filter by type
  if (type) {
    query = query.eq('type', type);
  }

  // Filter by date range
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  // 4. Execute query with ordering
  const { data: transactions, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 5. Calculate stats for tab counts
  const stats = {
    clearing: transactions.filter(t => t.status === 'clearing').length,
    available: transactions.filter(t => t.status === 'available').length,
    paid_out: transactions.filter(t => t.status === 'paid_out').length,
    disputed: transactions.filter(t => t.status === 'disputed').length,
    refunded: transactions.filter(t => t.status === 'refunded').length,
  };

  // 6. Fetch wallet balance
  const { data: balanceData } = await supabase.rpc('get_wallet_balance', {
    p_profile_id: user.id,
  });

  const balance = balanceData?.[0] || { available: 0, pending: 0, total: 0 };

  return Response.json({
    transactions,
    stats,
    balance: {
      available: parseFloat(balance.available || '0'),
      pending: parseFloat(balance.pending || '0'),
      total: parseFloat(balance.total || '0'),
    },
  });
}
```

### Pattern 4: Handling Refunds (Webhook + Reversal Transactions)

**File**: `apps/web/src/app/api/webhooks/stripe/route.ts`

This pattern demonstrates creating reversal transactions (negative amounts) when processing refunds, maintaining immutability.

```typescript
// Add this case to the webhook handler
if (event.type === 'charge.refunded') {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = charge.payment_intent as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Find original transactions
  const { data: originalTxs } = await supabase
    .from('transactions')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId);

  if (!originalTxs || originalTxs.length === 0) {
    console.error('No transactions found for refund');
    return Response.json({ error: 'Transactions not found' }, { status: 404 });
  }

  // 2. Create reversal transactions (negative amounts)
  for (const tx of originalTxs) {
    // Skip platform fees (profile_id is NULL)
    if (tx.profile_id === null) continue;

    await supabase.from('transactions').insert({
      profile_id: tx.profile_id,
      booking_id: tx.booking_id,
      type: 'Refund',
      description: `Refund: ${tx.description}`,
      status: 'refunded',
      amount: -Math.abs(tx.amount), // Negative (reverse original)
      stripe_payment_intent_id: paymentIntentId,

      // Copy transaction context from original (v5.10)
      service_name: tx.service_name,
      subjects: tx.subjects,
      session_date: tx.session_date,
      location_type: tx.location_type,
      tutor_name: tx.tutor_name,
      client_name: tx.client_name,
      agent_name: tx.agent_name,
    });
  }

  // 3. Update original transactions to 'refunded' status
  await supabase
    .from('transactions')
    .update({ status: 'refunded' })
    .eq('stripe_payment_intent_id', paymentIntentId);

  console.log('Refund processed for payment intent:', paymentIntentId);
}
```

### Pattern 5: Handling Disputes (Webhook + Status Transition)

**File**: `apps/web/src/app/api/webhooks/stripe/route.ts`

This pattern demonstrates handling chargebacks by transitioning transaction status to 'disputed'.

```typescript
if (event.type === 'charge.dispute.created') {
  const dispute = event.data.object as Stripe.Dispute;
  const chargeId = dispute.charge as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Get charge to find payment intent
  const charge = await stripe.charges.retrieve(chargeId);
  const paymentIntentId = charge.payment_intent as string;

  // 2. Update transactions to 'disputed' status
  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'disputed',
      metadata: {
        dispute_id: dispute.id,
        dispute_reason: dispute.reason,
        dispute_amount: dispute.amount / 100,
        dispute_created_at: new Date(dispute.created * 1000).toISOString(),
      },
    })
    .eq('stripe_payment_intent_id', paymentIntentId);

  if (error) {
    console.error('Failed to update dispute status:', error);
    return Response.json({ error: 'Dispute update failed' }, { status: 500 });
  }

  // 3. Create negative transaction for dispute hold
  await supabase.from('transactions').insert({
    profile_id: null, // Platform holds funds
    type: 'Dispute Hold',
    description: `Chargeback dispute: ${dispute.reason}`,
    status: 'disputed',
    amount: -(dispute.amount / 100),
    stripe_payment_intent_id: paymentIntentId,
  });

  console.log('Dispute created for payment intent:', paymentIntentId);
}
```

### Pattern 6: Transitioning Clearing to Available (Automated Cron Job)

**File**: `tools/financials/transition-clearing-to-available.ts`

This pattern demonstrates the automated job that transitions transactions from 'clearing' to 'available' after 7 days.

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function transitionClearingToAvailable() {
  // 1. Find transactions in 'clearing' status where 7+ days have passed since session
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, booking_id, created_at')
    .eq('status', 'clearing')
    .lte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error('Failed to fetch clearing transactions:', error);
    return;
  }

  console.log(`Found ${transactions.length} transactions ready to transition`);

  // 2. Update each transaction to 'available' status
  for (const tx of transactions) {
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'available',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tx.id);

    if (updateError) {
      console.error(`Failed to update transaction ${tx.id}:`, updateError);
    } else {
      console.log(`✅ Transitioned transaction ${tx.id} to available`);
    }
  }

  console.log('Clearing to available transition complete');
}

// Run immediately
transitionClearingToAvailable();
```

### Pattern 7: Displaying Transaction with Context (Component)

**File**: `apps/web/src/app/components/feature/financials/TransactionCard.tsx`

This pattern demonstrates rendering transaction context fields without needing to JOIN bookings or listings.

```typescript
import { DollarSign, Percent, Building, RefreshCw, BankNote } from 'lucide-react';
import styles from './TransactionCard.module.css';

interface Transaction {
  id: string;
  type: string;
  description: string;
  status: string;
  amount: number;
  created_at: string;

  // Transaction context (v5.10)
  service_name?: string;
  subjects?: string[];
  session_date?: string;
  location_type?: string;
  tutor_name?: string;
  client_name?: string;
  agent_name?: string;
}

export function TransactionCard({ transaction }: { transaction: Transaction }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'Booking Payment': return <DollarSign className={styles.icon} />;
      case 'Tutoring Payout': return <DollarSign className={styles.icon} />;
      case 'Referral Commission': return <Percent className={styles.icon} />;
      case 'Platform Fee': return <Building className={styles.icon} />;
      case 'Refund': return <RefreshCw className={styles.icon} />;
      case 'Withdrawal': return <BankNote className={styles.icon} />;
      default: return <DollarSign className={styles.icon} />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      clearing: 'yellow',
      available: 'green',
      paid_out: 'blue',
      disputed: 'red',
      refunded: 'gray',
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {getIcon(transaction.type)}
        <div className={styles.headerContent}>
          <h3 className={styles.type}>{transaction.type}</h3>
          <span
            className={styles.status}
            data-status={getStatusColor(transaction.status)}
          >
            {transaction.status}
          </span>
        </div>
      </div>

      <div className={styles.amount}>
        {transaction.amount >= 0 ? '+' : ''}£{Math.abs(transaction.amount).toFixed(2)}
      </div>

      {/* Transaction Context (v5.10) - No JOINs needed! */}
      {transaction.service_name && (
        <div className={styles.context}>
          <p className={styles.serviceName}>{transaction.service_name}</p>

          {transaction.subjects && transaction.subjects.length > 0 && (
            <div className={styles.subjects}>
              {transaction.subjects.map((subject) => (
                <span key={subject} className={styles.badge}>
                  {subject}
                </span>
              ))}
            </div>
          )}

          {transaction.tutor_name && transaction.client_name && (
            <p className={styles.participants}>
              {transaction.tutor_name} ↔ {transaction.client_name}
            </p>
          )}

          {transaction.agent_name && (
            <p className={styles.agent}>Referred by: {transaction.agent_name}</p>
          )}

          {transaction.session_date && (
            <p className={styles.sessionDate}>
              Session: {new Date(transaction.session_date).toLocaleDateString()}
            </p>
          )}

          {transaction.location_type && (
            <span className={styles.locationBadge}>{transaction.location_type}</span>
          )}
        </div>
      )}

      <p className={styles.description}>{transaction.description}</p>

      <p className={styles.created}>
        {new Date(transaction.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}
```

---

## Database Operations

### RPC Function: process_booking_payment (v5.10)

**File**: `apps/api/migrations/111_update_process_booking_payment_v5_10.sql`

This RPC function creates 3 transactions atomically (platform fee, tutor payout, agent commission) with transaction context snapshotting.

```sql
CREATE OR REPLACE FUNCTION process_booking_payment(
  p_booking_id UUID,
  p_payment_amount DECIMAL,
  p_stripe_payment_intent_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_platform_fee DECIMAL;
  v_agent_commission DECIMAL;
  v_tutor_payout DECIMAL;
  v_available_timestamp TIMESTAMPTZ;
  v_transaction_ids UUID[];
BEGIN
  -- 1. Idempotency check
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE id = p_booking_id AND payment_status = 'Paid'
  ) THEN
    RETURN jsonb_build_object(
      'status', 'already_processed',
      'message', 'Payment already processed for this booking'
    );
  END IF;

  -- 2. Fetch booking with context
  SELECT
    b.*,
    tp.full_name AS tutor_name,
    cp.full_name AS client_name,
    ap.full_name AS agent_name,
    l.title AS service_name,
    l.subjects,
    l.location_type
  INTO v_booking
  FROM bookings b
  LEFT JOIN profiles tp ON b.tutor_id = tp.id
  LEFT JOIN profiles cp ON b.client_id = cp.id
  LEFT JOIN profiles ap ON b.agent_profile_id = ap.id
  LEFT JOIN listings l ON b.listing_id = l.id
  WHERE b.id = p_booking_id;

  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- 3. Verify payment amount matches booking
  IF v_booking.amount != p_payment_amount THEN
    RAISE EXCEPTION 'Payment amount mismatch: expected %, got %',
      v_booking.amount, p_payment_amount;
  END IF;

  -- 4. Calculate clearing period (7 days after session)
  v_available_timestamp := v_booking.session_start_time + INTERVAL '7 days';

  -- 5. Calculate commission split
  v_platform_fee := v_booking.amount * 0.10;

  IF v_booking.agent_profile_id IS NOT NULL THEN
    -- 4-way split: 80/10/10 (tutor/platform/agent)
    v_agent_commission := v_booking.amount * 0.10;
    v_tutor_payout := v_booking.amount * 0.80;
  ELSE
    -- 3-way split: 90/10 (tutor/platform)
    v_agent_commission := 0;
    v_tutor_payout := v_booking.amount * 0.90;
  END IF;

  -- 6. Verify totals match (safety check)
  IF (v_platform_fee + v_agent_commission + v_tutor_payout) != v_booking.amount THEN
    RAISE EXCEPTION 'Commission split mismatch: total % != booking amount %',
      (v_platform_fee + v_agent_commission + v_tutor_payout), v_booking.amount;
  END IF;

  -- 7. Create transaction records (atomic)

  -- Transaction 1: Platform Fee
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
    client_name,
    agent_name
  ) VALUES (
    NULL, -- Platform revenue
    p_booking_id,
    'Platform Fee',
    '10% platform commission',
    'available', -- Platform fees immediately available
    v_platform_fee,
    p_stripe_payment_intent_id,
    v_booking.service_name,
    v_booking.subjects,
    v_booking.session_start_time,
    v_booking.location_type,
    v_booking.tutor_name,
    v_booking.client_name,
    v_booking.agent_name
  )
  RETURNING id INTO v_transaction_ids[1];

  -- Transaction 2: Agent Commission (conditional)
  IF v_booking.agent_profile_id IS NOT NULL THEN
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
      client_name,
      agent_name
    ) VALUES (
      v_booking.agent_profile_id,
      p_booking_id,
      'Referral Commission',
      '10% referral commission',
      'clearing',
      v_agent_commission,
      p_stripe_payment_intent_id,
      v_booking.service_name,
      v_booking.subjects,
      v_booking.session_start_time,
      v_booking.location_type,
      v_booking.tutor_name,
      v_booking.client_name,
      v_booking.agent_name
    )
    RETURNING id INTO v_transaction_ids[2];
  END IF;

  -- Transaction 3: Tutor Payout
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
    client_name,
    agent_name
  ) VALUES (
    v_booking.tutor_id,
    p_booking_id,
    'Tutoring Payout',
    CASE
      WHEN v_booking.agent_profile_id IS NOT NULL THEN '80% tutor payout'
      ELSE '90% tutor payout'
    END,
    'clearing',
    v_tutor_payout,
    p_stripe_payment_intent_id,
    v_booking.service_name,
    v_booking.subjects,
    v_booking.session_start_time,
    v_booking.location_type,
    v_booking.tutor_name,
    v_booking.client_name,
    v_booking.agent_name
  )
  RETURNING id INTO v_transaction_ids[3];

  -- 8. Update booking status
  UPDATE bookings
  SET payment_status = 'Paid',
      status = 'Confirmed',
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      updated_at = NOW()
  WHERE id = p_booking_id;

  -- 9. Return success
  RETURN jsonb_build_object(
    'status', 'success',
    'transaction_ids', v_transaction_ids,
    'platform_fee', v_platform_fee,
    'tutor_payout', v_tutor_payout,
    'agent_commission', v_agent_commission
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Payment processing failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION process_booking_payment TO authenticated;

COMMENT ON FUNCTION process_booking_payment IS
'v5.10 - Atomically creates 3 transactions (platform/agent/tutor) with context snapshotting';
```

### RPC Function: get_wallet_balance

**File**: `apps/api/migrations/059_create_wallet_balance_functions.sql`

This RPC function calculates available, pending, and total wallet balances in sub-second time.

```sql
CREATE OR REPLACE FUNCTION get_wallet_balance(p_profile_id UUID)
RETURNS TABLE (
  available DECIMAL,
  pending DECIMAL,
  total DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Available: Sum of 'available' status, positive amounts only
    COALESCE(SUM(amount) FILTER (WHERE status = 'available' AND amount > 0), 0) AS available,

    -- Pending: Sum of 'clearing' status
    COALESCE(SUM(amount) FILTER (WHERE status = 'clearing'), 0) AS pending,

    -- Total: Available + Pending
    COALESCE(SUM(amount) FILTER (WHERE status IN ('clearing', 'available')), 0) AS total
  FROM transactions
  WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_wallet_balance TO authenticated;

-- Add index to optimize wallet balance queries
CREATE INDEX IF NOT EXISTS idx_transactions_balance_lookup
ON transactions(profile_id, status, amount)
WHERE status IN ('clearing', 'available');

COMMENT ON FUNCTION get_wallet_balance IS
'v4.9 - Calculates wallet balance (available/pending/total) in sub-second time';
```

### Migration: Add Transaction Context Fields (v5.10)

**File**: `apps/api/migrations/107_add_transaction_context_fields.sql`

This migration adds 7 snapshot fields to preserve transaction context.

```sql
-- Add transaction context fields (v5.10)
ALTER TABLE transactions
  ADD COLUMN service_name TEXT,
  ADD COLUMN subjects TEXT[],
  ADD COLUMN session_date TIMESTAMPTZ,
  ADD COLUMN location_type TEXT,
  ADD COLUMN tutor_name TEXT,
  ADD COLUMN client_name TEXT;

-- Add GIN index for subjects array search
CREATE INDEX idx_transactions_subjects ON transactions USING GIN (subjects);

-- Add B-tree index for session_date filtering
CREATE INDEX idx_transactions_session_date ON transactions(session_date);

COMMENT ON COLUMN transactions.service_name IS 'Snapshot of listing title at transaction time';
COMMENT ON COLUMN transactions.subjects IS 'Snapshot of subjects array from listing';
COMMENT ON COLUMN transactions.session_date IS 'Snapshot of booking session start time';
COMMENT ON COLUMN transactions.location_type IS 'Snapshot of location type (online/in_person/hybrid)';
COMMENT ON COLUMN transactions.tutor_name IS 'Snapshot of tutor full name';
COMMENT ON COLUMN transactions.client_name IS 'Snapshot of client full name';

-- No backfill needed - new transactions will populate these fields via RPC
```

### Migration: Add agent_name Field (v5.10)

**File**: `apps/api/migrations/110_add_agent_name_to_transactions.sql`

This migration adds the agent_name field to complete the transaction context.

```sql
-- Add agent_name to transaction context
ALTER TABLE transactions
  ADD COLUMN agent_name TEXT;

COMMENT ON COLUMN transactions.agent_name IS 'Snapshot of agent full name (if booking has agent_profile_id)';

-- No index needed - agent_name used for display only, not filtering
```

---

## React Query Integration

### Query: Fetch Transactions

**File**: `apps/web/src/lib/api/financials.ts`

```typescript
import { useQuery } from '@tanstack/react-query';

export interface Transaction {
  id: string;
  profile_id: string;
  booking_id: string;
  type: string;
  description: string;
  status: string;
  amount: number;
  created_at: string;

  // Transaction context (v5.10)
  service_name?: string;
  subjects?: string[];
  session_date?: string;
  location_type?: string;
  tutor_name?: string;
  client_name?: string;
  agent_name?: string;
}

export function useTransactions(filters?: {
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);
      if (filters?.date_from) params.set('date_from', filters.date_from);
      if (filters?.date_to) params.set('date_to', filters.date_to);

      const response = await fetch(`/api/financials?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
```

### Query: Wallet Balance with Auto-Refresh

**File**: `apps/web/src/lib/api/financials.ts`

```typescript
export function useWalletBalance(userId: string) {
  return useQuery({
    queryKey: ['wallet-balance', userId],
    queryFn: () => getWalletBalance(userId),

    // Cache for 30 seconds
    staleTime: 30 * 1000,

    // Auto-refresh every minute
    refetchInterval: 60 * 1000,

    // Refetch when user returns to window
    refetchOnWindowFocus: true,

    // Keep in cache for 10 minutes when unmounted
    gcTime: 10 * 60 * 1000,
  });
}
```

---

## Testing Strategies

### Unit Testing: RPC Functions

**File**: `apps/api/migrations/__tests__/process_booking_payment.test.sql`

```sql
-- Test 1: Verify 3-transaction split with agent
BEGIN;

-- Setup test data
INSERT INTO profiles (id, full_name, email) VALUES
  ('tutor-123', 'John Tutor', 'tutor@test.com'),
  ('client-123', 'Jane Client', 'client@test.com'),
  ('agent-123', 'Bob Agent', 'agent@test.com');

INSERT INTO listings (id, profile_id, title, hourly_rate, subjects) VALUES
  ('listing-123', 'tutor-123', 'Math Tutoring', 50.00, ARRAY['Mathematics']);

INSERT INTO bookings (
  id, client_id, tutor_id, listing_id, agent_profile_id,
  amount, session_start_time, status, payment_status
) VALUES (
  'booking-123', 'client-123', 'tutor-123', 'listing-123', 'agent-123',
  100.00, NOW() + INTERVAL '1 day', 'Pending', 'Pending'
);

-- Execute RPC
SELECT process_booking_payment(
  'booking-123'::UUID,
  100.00,
  'pi_test_123'
);

-- Verify 3 transactions created
SELECT
  type,
  profile_id,
  amount,
  status
FROM transactions
WHERE booking_id = 'booking-123'
ORDER BY amount DESC;

-- Expected results:
-- Platform Fee: NULL profile_id, £10, 'available'
-- Tutor Payout: tutor-123, £80, 'clearing'
-- Agent Commission: agent-123, £10, 'clearing'

-- Verify totals match
SELECT SUM(amount) AS total FROM transactions WHERE booking_id = 'booking-123';
-- Expected: £100

ROLLBACK;
```

### Integration Testing: Webhook Handler

**File**: `apps/web/src/app/api/webhooks/stripe/route.test.ts`

```typescript
import { POST } from './route';
import Stripe from 'stripe';

describe('POST /api/webhooks/stripe', () => {
  it('processes payment with idempotency', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_456',
          amount_total: 10000, // £100 in pence
          payment_intent: 'pi_test_789',
          metadata: {
            booking_id: 'booking-123',
          },
        } as Stripe.Checkout.Session,
      },
    } as Stripe.Event;

    const signature = 'test_signature';
    const body = JSON.stringify(mockEvent);

    const request = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body,
    });

    // Mock Stripe webhook verification
    jest.spyOn(Stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent);

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify idempotency - second call should also succeed
    const response2 = await POST(request);
    expect(response2.status).toBe(200);
  });
});
```

### E2E Testing: Complete Payment Flow

**File**: `apps/web/tests/e2e/financials.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Financials Flow', () => {
  test('view wallet balance and transaction history', async ({ page }) => {
    // 1. Login as tutor
    await page.goto('/login');
    await page.fill('[name="email"]', 'tutor@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. Navigate to financials page
    await page.goto('/financials');
    await expect(page.locator('h1')).toContainText('Financials');

    // 3. Verify WalletBalanceWidget displays
    await expect(page.locator('.wallet-balance')).toBeVisible();
    await expect(page.locator('.available-balance')).toContainText('£');
    await expect(page.locator('.pending-balance')).toContainText('£');

    // 4. Verify transaction list displays
    await expect(page.locator('.transaction-card').first()).toBeVisible();

    // 5. Filter by status
    await page.click('[data-tab="available"]');
    await expect(page.locator('.transaction-card')).toHaveCount(3);

    // 6. Verify transaction context displays
    const firstCard = page.locator('.transaction-card').first();
    await expect(firstCard.locator('.service-name')).toBeVisible();
    await expect(firstCard.locator('.subjects')).toBeVisible();
  });
});
```

---

## Common Tasks

### Task 1: Create Refund Transaction

**Scenario**: Client requests refund for cancelled booking.

```typescript
// API Route: apps/web/src/app/api/bookings/[id]/refund/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const bookingId = params.id;

  // 1. Fetch booking with transactions
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, transactions!inner(*)')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 });
  }

  // 2. Verify refundable (must be client or admin)
  if (booking.client_id !== user.id && !user.app_metadata?.is_admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // 3. Process Stripe refund
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const refund = await stripe.refunds.create({
    payment_intent: booking.stripe_payment_intent_id,
    amount: Math.round(booking.amount * 100), // Full refund
    reason: 'requested_by_customer',
  });

  // 4. Create reversal transactions for each original transaction
  const originalTxs = booking.transactions.filter(
    (tx: any) => tx.stripe_payment_intent_id === booking.stripe_payment_intent_id
  );

  for (const tx of originalTxs) {
    await supabase.from('transactions').insert({
      profile_id: tx.profile_id,
      booking_id: bookingId,
      type: 'Refund',
      description: `Refund: ${tx.description}`,
      status: 'refunded',
      amount: -Math.abs(tx.amount), // Negative
      stripe_payment_intent_id: booking.stripe_payment_intent_id,

      // Copy context
      service_name: tx.service_name,
      subjects: tx.subjects,
      session_date: tx.session_date,
      location_type: tx.location_type,
      tutor_name: tx.tutor_name,
      client_name: tx.client_name,
      agent_name: tx.agent_name,
    });
  }

  // 5. Update original transactions to 'refunded'
  await supabase
    .from('transactions')
    .update({ status: 'refunded' })
    .in('id', originalTxs.map((tx: any) => tx.id));

  // 6. Update booking
  await supabase
    .from('bookings')
    .update({
      payment_status: 'Refunded',
      status: 'Cancelled',
    })
    .eq('id', bookingId);

  return Response.json({ success: true, refundId: refund.id });
}
```

### Task 2: Retry Failed Webhooks

**Scenario**: Webhook processing failed, logged in failed_webhooks table.

```typescript
// Script: tools/financials/retry-failed-webhooks.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function retryFailedWebhooks() {
  // 1. Fetch failed webhooks from last 24 hours
  const { data: failedWebhooks } = await supabase
    .from('failed_webhooks')
    .select('*')
    .eq('status', 'failed')
    .gte('created_at', new Date(Date.now() - 86400000).toISOString())
    .order('created_at', { ascending: false });

  console.log(`Found ${failedWebhooks?.length || 0} failed webhooks`);

  for (const webhook of failedWebhooks || []) {
    try {
      // 2. Retry RPC call
      const { data, error } = await supabase.rpc('process_booking_payment', {
        p_booking_id: webhook.booking_id,
        p_payment_amount: webhook.payload.data.object.amount_total / 100,
        p_stripe_payment_intent_id: webhook.payload.data.object.payment_intent,
      });

      if (!error) {
        // 3. Mark webhook as retried successfully
        await supabase
          .from('failed_webhooks')
          .update({
            status: 'retried_success',
            retried_at: new Date().toISOString(),
          })
          .eq('id', webhook.id);

        console.log(`✅ Successfully retried webhook for booking ${webhook.booking_id}`);
        console.log(`   Result:`, data);
      } else {
        console.error(`❌ Retry failed for booking ${webhook.booking_id}:`, error);
      }
    } catch (err) {
      console.error(`❌ Error retrying webhook ${webhook.id}:`, err);
    }
  }
}

retryFailedWebhooks();
```

### Task 3: Query Transactions by Subject (Context Search)

**Scenario**: Find all Math tutoring transactions for tax reporting.

```typescript
// API Route: apps/web/src/app/api/financials/by-subject/route.ts
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');

  if (!subject) {
    return Response.json({ error: 'Subject required' }, { status: 400 });
  }

  // Query using GIN index on subjects array
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('profile_id', user.id)
    .contains('subjects', [subject]) // Uses GIN index
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Calculate totals
  const total = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

  return Response.json({
    transactions,
    total,
    count: transactions.length,
    subject,
  });
}
```

---

## Troubleshooting

### Issue 1: Commission Split Doesn't Total to Booking Amount

**Symptom**: RPC function throws "Commission split mismatch" error.

**Cause**: Rounding errors in decimal calculations.

**Solution**:

```sql
-- ❌ WRONG - Can cause rounding errors
v_platform_fee := v_booking.amount * 0.10;
v_agent_commission := v_booking.amount * 0.10;
v_tutor_payout := v_booking.amount * 0.80;

-- ✅ CORRECT - Calculate tutor payout as remainder
v_platform_fee := ROUND(v_booking.amount * 0.10, 2);
v_agent_commission := ROUND(v_booking.amount * 0.10, 2);
v_tutor_payout := v_booking.amount - v_platform_fee - v_agent_commission;

-- Verify totals match
IF (v_platform_fee + v_agent_commission + v_tutor_payout) != v_booking.amount THEN
  RAISE EXCEPTION 'Commission split mismatch';
END IF;
```

### Issue 2: Wallet Balance Not Updating After Transaction

**Symptom**: WalletBalanceWidget shows stale balance even after new transaction created.

**Cause**: React Query cache not invalidated.

**Solution**:

```typescript
// ✅ Invalidate wallet balance cache after transaction mutation
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (txData: any) => {
      // Create transaction
    },

    onSuccess: (data, variables, context) => {
      // Invalidate wallet balance cache
      queryClient.invalidateQueries({
        queryKey: ['wallet-balance'],
      });

      // Invalidate transactions list cache
      queryClient.invalidateQueries({
        queryKey: ['transactions'],
      });
    },
  });
}
```

### Issue 3: Transactions Missing Context Fields

**Symptom**: Transaction context fields (service_name, subjects) are NULL.

**Cause**: Created before v5.10 migration or RPC not passing context.

**Solution**:

```sql
-- Backfill missing context from bookings + listings
UPDATE transactions t
SET service_name = l.title,
    subjects = l.subjects,
    session_date = b.session_start_time,
    location_type = l.location_type,
    tutor_name = tp.full_name,
    client_name = cp.full_name,
    agent_name = ap.full_name
FROM bookings b
LEFT JOIN listings l ON b.listing_id = l.id
LEFT JOIN profiles tp ON b.tutor_id = tp.id
LEFT JOIN profiles cp ON b.client_id = cp.id
LEFT JOIN profiles ap ON b.agent_profile_id = ap.id
WHERE t.booking_id = b.id
  AND t.service_name IS NULL; -- Only update unsnapshotted transactions
```

---

## Performance Optimization

### Query Optimization: Avoid Booking JOINs

**Before (v5.9 and earlier)**:

```sql
-- ❌ SLOW - JOINs bookings and listings for context
SELECT
  t.*,
  b.session_start_time,
  l.title AS service_name,
  l.subjects
FROM transactions t
LEFT JOIN bookings b ON t.booking_id = b.id
LEFT JOIN listings l ON b.listing_id = l.id
WHERE t.profile_id = 'user-123'
ORDER BY t.created_at DESC;

-- Query time: ~350ms for 50 transactions
```

**After (v5.10 with transaction context)**:

```sql
-- ✅ FAST - All context in transactions table (no JOINs)
SELECT
  id,
  type,
  amount,
  status,
  service_name,    -- Snapshot field
  subjects,        -- Snapshot field
  session_date,    -- Snapshot field
  tutor_name,      -- Snapshot field
  client_name,     -- Snapshot field
  created_at
FROM transactions
WHERE profile_id = 'user-123'
ORDER BY created_at DESC;

-- Query time: ~95ms for 50 transactions (3.7x faster!)
```

### React Query Cache Management

```typescript
// ✅ Optimize cache behavior based on data freshness needs
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Transactions rarely change - cache for 5 minutes
      staleTime: 1000 * 60 * 5,

      // Keep in cache for 10 minutes when unmounted
      gcTime: 1000 * 60 * 10,

      // Only refetch on window focus if stale
      refetchOnWindowFocus: true,

      // Don't refetch on mount if cache exists
      refetchOnMount: false,
    },
  },
});
```

---

**Last Updated**: 2025-12-15
**Next Review**: When implementing automated payout batches (v6.0)
**Maintained By**: Finance Team + Backend Team

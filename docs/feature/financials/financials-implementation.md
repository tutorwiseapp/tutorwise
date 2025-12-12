# Financials - Implementation Guide

**Version**: v4.9
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Component Overview](#component-overview)
3. [Setup Instructions](#setup-instructions)
4. [Common Tasks](#common-tasks)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [State Management](#state-management)
8. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ app/(authenticated)/financials/
│   ├─ page.tsx                           # Main financials hub (Server Component)
│   └─ page.module.css
│
├─ app/components/feature/financials/
│   ├─ TransactionCard.tsx                # Individual transaction card
│   ├─ TransactionCard.module.css
│   ├─ WalletBalanceWidget.tsx            # Balance overview
│   ├─ WalletBalanceWidget.module.css
│   ├─ BalanceSummaryWidget.tsx           # Available/pending breakdown
│   ├─ EarningsChartWidget.tsx            # Revenue visualization
│   ├─ PayoutHistoryWidget.tsx            # Past payouts
│   ├─ FinancialsSkeleton.tsx             # Loading state
│   └─ FinancialsError.tsx                # Error state
│
├─ app/api/financials/
│   ├─ route.ts                           # GET transactions + balances
│   └─ payout/route.ts                    # Initiate payout
│
└─ lib/api/
    └─ financials.ts                      # Client-side API functions

apps/api/
├─ webhooks/stripe/
│   └─ route.ts                           # Webhook handler
│
└─ migrations/
    ├─ 028_create_transactions_table.sql
    ├─ 030_create_payment_webhook_rpc.sql
    ├─ 059_create_wallet_balance_functions.sql
    ├─ 060_update_payment_webhook_rpc_v4_9.sql
    └─ 107_add_transaction_context_fields.sql
```

---

## Component Overview

### HubPageLayout Architecture

The financials hub uses the standard 3x3 widget grid pattern:

```
┌─────────────────────────────────────────────┐
│ HubPageLayout                               │
│ ┌─────────────────────────────────────────┐ │
│ │ Balance  │ Summary  │ Earnings Chart   │ │
│ ├──────────┼──────────┼──────────────────┤ │
│ │ Txn Card │ Card     │ Card             │ │
│ ├──────────┼──────────┼──────────────────┤ │
│ │ Card     │ Card     │ Payout History   │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Component Breakdown

**TransactionCard** (apps/web/src/app/components/feature/financials/TransactionCard.tsx)
- Displays individual transaction with status badge
- Shows: Type, amount, date, status, service context
- Role-based rendering (tutor sees payments, agent sees commissions)
- Icons: DollarSign (payment), Percent (commission), RefreshCw (refund)

**WalletBalanceWidget**
- Total balance (available + pending)
- Available balance (ready for payout)
- Pending balance (clearing)
- Payout button (if available > £10)

**BalanceSummaryWidget**
- Breakdown by status (clearing, available, paid_out)
- Revenue trend (vs last period)
- Transaction count

---

## Setup Instructions

### Prerequisites
- Next.js 14+ installed
- Supabase configured
- Stripe Connect account set up
- React Query installed

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install

# 3. Run migrations
npm run db:migrate

# 4. Start dev server
npm run dev

# 5. Open financials page
open http://localhost:3000/financials
```

---

## Common Tasks

### Task 1: Process Booking Payment (Webhook)

```typescript
// API Route: apps/api/webhooks/stripe/route.ts

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      return Response.json({ error: 'Missing booking_id' }, { status: 400 });
    }

    // Call process_booking_payment RPC
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('process_booking_payment', {
      p_booking_id: bookingId,
      p_payment_amount: session.amount_total! / 100, // Convert from cents
      p_payment_intent_id: session.payment_intent as string
    });

    if (error) {
      console.error('Payment processing failed:', error);
      return Response.json({ error: 'Payment processing failed' }, { status: 500 });
    }

    console.log('Transactions created:', data);
  }

  return Response.json({ received: true });
}
```

### Task 2: Calculate Wallet Balance

```typescript
// Client-side API call
import { createClient } from '@/lib/supabase/client';

export async function getWalletBalance(profileId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_wallet_balance', {
    p_profile_id: profileId
  });

  if (error) throw error;

  return {
    available: data[0].available,
    pending: data[0].pending,
    total: data[0].total
  };
}

// Usage in component
const { data: balance } = useQuery({
  queryKey: ['wallet-balance', userId],
  queryFn: () => getWalletBalance(userId),
  staleTime: 30 * 1000, // 30 seconds
  refetchInterval: 60 * 1000 // Auto-refresh every minute
});
```

### Task 3: Fetch User Transactions

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
    query = query.in('type', ['Session Payment', 'Refund', 'Payout']);
  } else if (profile.active_role === 'agent') {
    query = query.in('type', ['Commission', 'Payout']);
  }

  const { data: transactions } = await query.order('created_at', { ascending: false });

  // Calculate balances
  const { data: balances } = await supabase.rpc('get_wallet_balance', {
    p_profile_id: user.id
  });

  return Response.json({
    transactions,
    balances: balances[0]
  });
}
```

### Task 4: Filter Transactions by Status

```typescript
// apps/web/src/app/(authenticated)/financials/page.tsx

import { useQuery } from '@tanstack/react-query';
import { getFinancials } from '@/lib/api/financials';

export default function FinancialsPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['financials', statusFilter],
    queryFn: () => getFinancials({ status: statusFilter }),
  });

  if (isLoading) return <FinancialsSkeleton />;
  if (error) return <FinancialsError error={error} />;

  return (
    <div>
      {/* Status Tabs */}
      <div className={styles.tabs}>
        <button onClick={() => setStatusFilter(null)}>All</button>
        <button onClick={() => setStatusFilter('clearing')}>
          Clearing ({data.stats.clearing})
        </button>
        <button onClick={() => setStatusFilter('available')}>
          Available ({data.stats.available})
        </button>
        <button onClick={() => setStatusFilter('paid_out')}>
          Paid Out ({data.stats.paid_out})
        </button>
      </div>

      {/* Transactions Grid */}
      <div className={styles.transactionsGrid}>
        {data.transactions.map(transaction => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  );
}
```

### Task 5: Handle Refunds (Webhook)

```typescript
// apps/api/webhooks/stripe/route.ts

case 'charge.refunded': {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = charge.payment_intent as string;

  // Find original transactions
  const { data: originalTxs } = await supabase
    .from('transactions')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId);

  if (!originalTxs || originalTxs.length === 0) {
    console.error('No transactions found for refund');
    break;
  }

  // Create refund transactions (negative amounts)
  for (const tx of originalTxs) {
    await supabase.from('transactions').insert({
      profile_id: tx.profile_id,
      booking_id: tx.booking_id,
      type: 'Refund',
      description: `Refund for ${tx.description}`,
      status: 'refunded',
      amount: -tx.amount,  // Negative (reverse original)
      stripe_payment_intent_id: paymentIntentId,
      // Copy context fields
      service_name: tx.service_name,
      subjects: tx.subjects,
      session_date: tx.session_date,
      location_type: tx.location_type,
      tutor_name: tx.tutor_name,
      client_name: tx.client_name
    });
  }

  // Update original transactions to 'refunded'
  await supabase
    .from('transactions')
    .update({ status: 'refunded' })
    .in('id', originalTxs.map(tx => tx.id));

  break;
}
```

### Task 6: Handle Disputes (Webhook)

```typescript
case 'charge.dispute.created': {
  const dispute = event.data.object as Stripe.Dispute;
  const chargeId = dispute.charge as string;

  // Get charge to find payment intent
  const charge = await stripe.charges.retrieve(chargeId);
  const paymentIntentId = charge.payment_intent as string;

  // Update transactions to 'disputed'
  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'disputed',
      metadata: {
        dispute_id: dispute.id,
        dispute_reason: dispute.reason,
        dispute_amount: dispute.amount / 100
      }
    })
    .eq('stripe_payment_intent_id', paymentIntentId);

  if (error) {
    console.error('Failed to update dispute status:', error);
  }

  // Create negative transaction for dispute amount
  await supabase.from('transactions').insert({
    profile_id: null, // Or tutor_id if deducting from tutor
    type: 'Dispute',
    description: `Chargeback - ${dispute.reason}`,
    status: 'disputed',
    amount: -(dispute.amount / 100),
    stripe_payment_intent_id: paymentIntentId
  });

  break;
}
```

### Task 7: Process Payout (Stripe Connect)

```typescript
// POST /api/financials/payout
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's Stripe account
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();

  if (!profile.stripe_account_id) {
    return Response.json({ error: 'Stripe account not connected' }, { status: 400 });
  }

  // Calculate available balance
  const { data: balance } = await supabase.rpc('get_wallet_balance', {
    p_profile_id: user.id
  });

  if (balance[0].available < 10) {
    return Response.json({ error: 'Minimum payout is £10' }, { status: 400 });
  }

  // Create Stripe transfer
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const transfer = await stripe.transfers.create({
    amount: Math.round(balance[0].available * 100), // Convert to cents
    currency: 'gbp',
    destination: profile.stripe_account_id,
    description: `Payout for ${user.email}`,
    metadata: {
      profile_id: user.id,
      payout_date: new Date().toISOString()
    }
  });

  // Update transactions to 'paid_out'
  await supabase
    .from('transactions')
    .update({
      status: 'paid_out',
      paid_out_at: new Date().toISOString(),
      stripe_transfer_id: transfer.id
    })
    .eq('profile_id', user.id)
    .eq('status', 'available');

  // Create payout transaction record
  await supabase.from('transactions').insert({
    profile_id: user.id,
    type: 'Payout',
    description: 'Bank transfer via Stripe Connect',
    status: 'paid_out',
    amount: -balance[0].available, // Negative (debit)
    stripe_transfer_id: transfer.id,
    paid_out_at: new Date().toISOString()
  });

  return Response.json({ success: true, transferId: transfer.id });
}
```

### Task 8: Display Transaction with Context

```typescript
// TransactionCard.tsx
interface TransactionCardProps {
  transaction: Transaction;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'Session Payment': return <DollarSign />;
      case 'Commission': return <Percent />;
      case 'Platform Fee': return <Building />;
      case 'Refund': return <RefreshCw />;
      case 'Payout': return <BankNote />;
      default: return <DollarSign />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      clearing: 'yellow',
      available: 'green',
      paid_out: 'blue',
      disputed: 'red',
      refunded: 'gray'
    };
    return <Badge color={colors[status]}>{status}</Badge>;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {getIcon(transaction.type)}
        <h3>{transaction.type}</h3>
        {getStatusBadge(transaction.status)}
      </div>

      <div className={styles.amount}>
        {transaction.amount >= 0 ? '+' : ''}£{transaction.amount.toFixed(2)}
      </div>

      {/* Transaction Context (v5.10) */}
      {transaction.service_name && (
        <div className={styles.context}>
          <p className={styles.serviceName}>{transaction.service_name}</p>
          {transaction.subjects && (
            <div className={styles.subjects}>
              {transaction.subjects.map(subject => (
                <span key={subject} className={styles.badge}>{subject}</span>
              ))}
            </div>
          )}
          <p className={styles.participants}>
            {transaction.tutor_name} → {transaction.client_name}
          </p>
          {transaction.session_date && (
            <p className={styles.date}>
              {new Date(transaction.session_date).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <p className={styles.created}>
        {new Date(transaction.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}
```

---

## API Reference

### GET /api/financials

Fetch user's transactions and wallet balance.

**Query Parameters**:
- `status` - Filter by status (clearing, available, paid_out, disputed, refunded)
- `type` - Filter by type (Session Payment, Commission, etc.)
- `date_from` - Filter by date range (ISO 8601)
- `date_to` - Filter by date range (ISO 8601)

**Response**:
```typescript
{
  transactions: Transaction[];
  balances: {
    available: number;
    pending: number;
    total: number;
  };
  stats: {
    clearing: number;
    available: number;
    paid_out: number;
    disputed: number;
    refunded: number;
  };
}
```

### POST /api/financials/payout

Initiate payout to bank account.

**Request Body**:
```typescript
{
  // No body required - uses authenticated user
}
```

**Response**:
```typescript
{
  success: boolean;
  transferId: string;
}
```

### POST /api/webhooks/stripe

Handle Stripe webhook events.

**Events Handled**:
- `checkout.session.completed` - Create transactions
- `charge.refunded` - Process refund
- `charge.dispute.created` - Mark as disputed
- `transfer.paid` - Update to paid_out

**Response**:
```typescript
{
  received: boolean;
}
```

---

## Database Schema

### transactions table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),  -- NULL for platform fees
  booking_id UUID REFERENCES bookings(id),

  -- Transaction details
  type TEXT NOT NULL,  -- 'Session Payment', 'Commission', 'Platform Fee', etc.
  description TEXT,
  status TEXT NOT NULL DEFAULT 'clearing',  -- 'clearing', 'available', 'paid_out', 'disputed', 'refunded'
  amount DECIMAL(10, 2) NOT NULL,  -- Positive = credit, Negative = debit

  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,

  -- Transaction context (v5.10)
  service_name TEXT,
  subjects TEXT[],
  session_date TIMESTAMPTZ,
  location_type TEXT,
  tutor_name TEXT,
  client_name TEXT,
  agent_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_out_at TIMESTAMPTZ,

  -- Audit
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_transactions_profile_id ON transactions(profile_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

### RPC Functions

```sql
-- get_wallet_balance(profile_id)
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
    AND amount > 0;  -- Only credits
END;
$$ LANGUAGE plpgsql;
```

---

## State Management

### React Query Setup

```typescript
// apps/web/src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: true,
      refetchInterval: 1000 * 60, // Auto-refresh every minute
    },
  },
});
```

### Query Keys Structure

```typescript
// Financials queries
['financials'] // All transactions + balance
['financials', { status: 'available' }] // Filtered
['wallet-balance', userId] // Just balance
['payout-history', userId] // Past payouts
```

---

## Testing

### Component Testing

```typescript
// __tests__/TransactionCard.test.tsx

import { render, screen } from '@testing-library/react';
import { TransactionCard } from '../TransactionCard';

describe('TransactionCard', () => {
  const mockTransaction = {
    id: '123',
    type: 'Session Payment',
    status: 'available',
    amount: 72.00,
    service_name: 'GCSE Maths Tutoring',
    subjects: ['Mathematics'],
    tutor_name: 'John Smith',
    client_name: 'Jane Doe',
    created_at: '2025-12-12T10:00:00Z'
  };

  it('renders transaction details', () => {
    render(<TransactionCard transaction={mockTransaction} />);

    expect(screen.getByText('Session Payment')).toBeInTheDocument();
    expect(screen.getByText('£72.00')).toBeInTheDocument();
    expect(screen.getByText('GCSE Maths Tutoring')).toBeInTheDocument();
  });
});
```

### API Testing

```typescript
// __tests__/api/financials.test.ts

describe('GET /api/financials', () => {
  it('returns transactions and balance', async () => {
    const response = await fetch('/api/financials');
    const data = await response.json();

    expect(data.transactions).toBeDefined();
    expect(data.balances).toBeDefined();
    expect(data.balances.available).toBeGreaterThanOrEqual(0);
  });
});
```

---

## Troubleshooting

### Issue: Transactions not created

**Solution**: Check webhook signature and RPC function logs

```bash
# Verify webhook with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

### Issue: Incorrect balance calculation

**Solution**: Verify status values and run manual query

```sql
SELECT
  SUM(amount) FILTER (WHERE status = 'available') AS available,
  SUM(amount) FILTER (WHERE status = 'clearing') AS pending
FROM transactions
WHERE profile_id = :user_id AND amount > 0;
```

---

**Last Updated**: 2025-12-12
**Version**: v4.9
**Maintainer**: Backend Team

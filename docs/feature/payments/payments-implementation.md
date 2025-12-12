# Payments - Implementation Guide

**Version**: v4.9
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Stripe Setup](#stripe-setup)
3. [Common Tasks](#common-tasks)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [RPC Payment Processing](#rpc-payment-processing)
7. [Webhook Handling](#webhook-handling)
8. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ app/(authenticated)/
│   ├─ payments/
│   │   └─ page.tsx                       # Payment method management
│   ├─ financials/
│   │   ├─ page.tsx                       # Transaction history
│   │   ├─ payouts/page.tsx               # Withdrawal management
│   │   └─ disputes/page.tsx              # Chargeback handling
│
├─ app/components/
│   ├─ ui/payments/
│   │   └─ SavedCardList.tsx              # Card list component
│   └─ feature/payments/
│       ├─ PaymentHelpWidget.tsx          # Help widget
│       ├─ PaymentTipWidget.tsx           # Tips widget
│       └─ PaymentVideoWidget.tsx         # Video widget
│
├─ app/api/stripe/
│   ├─ create-checkout-session/route.ts   # Add card (setup mode)
│   ├─ create-booking-checkout/route.ts   # Booking payment
│   ├─ get-cards-by-customer/route.ts     # List cards
│   ├─ verify-and-get-cards/route.ts      # Post-checkout verify
│   ├─ set-default-card/route.ts          # Set default
│   ├─ remove-card/route.ts               # Delete card
│   ├─ connect-account/route.ts           # Create Express account
│   ├─ get-connect-account/route.ts       # Get account status
│   ├─ disconnect-account/route.ts        # Remove account
│   └─ create-charge-and-transfer/route.ts # Direct charge
│
├─ app/api/webhooks/stripe/
│   └─ route.ts                           # Main webhook handler
│
└─ lib/
    ├─ stripe.ts                          # Stripe client singleton
    └─ api/payments.ts                    # Client-side API functions
```

---

## Stripe Setup

### Install Dependencies

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

### Environment Variables

Create `.env.local`:

```bash
# Test/Development Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx

# Live/Production Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxxxx

# Feature Flag
NEXT_PUBLIC_ENABLE_STRIPE=true
```

### Initialize Stripe Client

**File**: `lib/stripe.ts`

```typescript
import Stripe from 'stripe';

export const getStripeClient = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // Uses library's pinned API version
  });
};
```

---

## Common Tasks

### Task 1: Add Payment Method (Card)

**Frontend** (apps/web/src/app/(authenticated)/payments/page.tsx):

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

const PaymentsPage = () => {
  const queryClient = useQueryClient();

  const { mutate: addCard, isLoading } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
      });
      const { sessionId } = await res.json();

      // Redirect to Stripe
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      await stripe?.redirectToCheckout({ sessionId });
    },
  });

  return (
    <button onClick={() => addCard()} disabled={isLoading}>
      Add Card
    </button>
  );
};
```

**Backend** (apps/web/src/app/api/stripe/create-checkout-session/route.ts):

```typescript
import { createClient } from '@/utils/supabase/server';
import { getStripeClient } from '@/lib/stripe';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const stripe = getStripeClient();

  // Create or get customer
  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });

    customerId = customer.id;

    // Save customer ID
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // Create checkout session (setup mode)
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    payment_method_types: ['card'],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?success=true&customer_id=${customerId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?cancelled=true`,
  });

  return Response.json({ sessionId: session.id });
}
```

### Task 2: Create Booking Payment

**API Route** (apps/web/src/app/api/stripe/create-booking-checkout/route.ts):

```typescript
export async function POST(request: Request) {
  const { bookingId } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get booking
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      listing:listings(title, service_name),
      wiselist_item:wiselist_items(referrer_profile_id)
    `)
    .eq('id', bookingId)
    .eq('client_id', user.id) // Verify ownership
    .single();

  if (!booking || booking.payment_status !== 'Pending') {
    return Response.json({ error: 'Invalid booking' }, { status: 400 });
  }

  // Get or create customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const stripe = getStripeClient();
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });

    customerId = customer.id;

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // Create payment session
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: booking.listing.title || 'Tutoring Session',
        },
        unit_amount: Math.round(booking.amount * 100), // Pence
      },
      quantity: 1,
    }],
    metadata: {
      booking_id: bookingId,
      supabase_user_id: user.id,
      wiselist_referrer_id: booking.wiselist_item?.referrer_profile_id || '',
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingId}?cancelled=true`,
  });

  return Response.json({
    sessionId: session.id,
    checkoutUrl: session.url,
  });
}
```

### Task 3: Handle Successful Payment (Webhook)

**Webhook Handler** (apps/web/src/app/api/webhooks/stripe/route.ts):

```typescript
import { headers } from 'next/headers';
import { getStripeClient } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = headers();
  const signature = headersList.get('stripe-signature')!;

  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const bookingId = session.metadata?.booking_id;

      if (!bookingId) {
        console.error('Missing booking_id in metadata');
        await logToDLQ(event, 'Missing booking_id');
        return Response.json({ received: true }, { status: 200 });
      }

      try {
        // Call RPC to process payment
        const { data, error } = await supabase.rpc('handle_successful_payment', {
          p_booking_id: bookingId,
          p_stripe_checkout_id: session.id,
          p_wiselist_referrer_id: session.metadata?.wiselist_referrer_id || null,
        });

        if (error) throw error;
      } catch (error) {
        console.error('Payment processing failed:', error);
        await logToDLQ(event, error.message, bookingId);
        return Response.json({ received: true }, { status: 200 });
      }
      break;

    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object;
      // Update booking status to Failed
      // (Implementation depends on how you track payment_intent_id)
      break;

    case 'payout.paid':
      const payout = event.data.object;
      await supabase
        .from('transactions')
        .update({ status: 'paid_out' })
        .eq('stripe_payout_id', payout.id);
      break;

    case 'payout.failed':
    case 'payout.canceled':
      const failedPayout = event.data.object;
      // Get original transaction
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('stripe_payout_id', failedPayout.id)
        .single();

      if (transaction) {
        // Update to failed
        await supabase
          .from('transactions')
          .update({ status: 'Failed' })
          .eq('id', transaction.id);

        // Create reversal (refund to balance)
        await supabase
          .from('transactions')
          .insert({
            profile_id: transaction.profile_id,
            booking_id: transaction.booking_id,
            type: 'Refund',
            description: `Payout failed - funds returned to balance`,
            amount: transaction.amount,
            status: 'available',
            // Copy context fields
            service_name: transaction.service_name,
            subjects: transaction.subjects,
            session_date: transaction.session_date,
            location_type: transaction.location_type,
            tutor_name: transaction.tutor_name,
            client_name: transaction.client_name,
            agent_name: transaction.agent_name,
          });
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return Response.json({ received: true }, { status: 200 });
}

// Dead-Letter Queue logging
async function logToDLQ(event: any, errorMessage: string, bookingId?: string) {
  const supabase = await createClient();

  await supabase
    .from('failed_webhooks')
    .insert({
      event_id: event.id,
      event_type: event.type,
      status: 'failed',
      error_message: errorMessage,
      payload: event,
      booking_id: bookingId,
    });
}
```

### Task 4: Create Stripe Connect Account (Receiving Payments)

**API Route** (apps/web/src/app/api/stripe/connect-account/route.ts):

```typescript
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();

  const stripe = getStripeClient();

  // Create or get account
  let accountId = profile?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        supabase_user_id: user.id,
      },
    });

    accountId = account.id;

    // Save account ID
    await supabase
      .from('profiles')
      .update({ stripe_account_id: accountId })
      .eq('id', user.id);
  }

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?refresh=true`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?success=true`,
    type: 'account_onboarding',
  });

  return Response.json({ url: accountLink.url });
}
```

### Task 5: Set Default Payment Method

**API Route** (apps/web/src/app/api/stripe/set-default-card/route.ts):

```typescript
export async function POST(request: Request) {
  const { paymentMethodId } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'No customer ID' }, { status: 400 });
  }

  const stripe = getStripeClient();

  // Update customer default payment method
  await stripe.customers.update(profile.stripe_customer_id, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  return Response.json({ success: true });
}
```

### Task 6: Remove Payment Method

**API Route** (apps/web/src/app/api/stripe/remove-card/route.ts):

```typescript
export async function POST(request: Request) {
  const { paymentMethodId } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripeClient();

  // Detach payment method from customer
  await stripe.paymentMethods.detach(paymentMethodId);

  return Response.json({ success: true });
}
```

---

## API Reference

### POST /api/stripe/create-checkout-session
Create checkout session for adding card (setup mode)

**Request Body**: None

**Response**:
```typescript
{ sessionId: string }
```

### POST /api/stripe/create-booking-checkout
Create checkout session for booking payment

**Request Body**:
```typescript
{ bookingId: string }
```

**Response**:
```typescript
{ sessionId: string, checkoutUrl: string }
```

### POST /api/stripe/get-cards-by-customer
List saved payment methods

**Request Body**:
```typescript
{ customerId: string }
```

**Response**:
```typescript
{
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId: string | null;
}
```

### POST /api/stripe/set-default-card
Set default payment method

**Request Body**:
```typescript
{ paymentMethodId: string }
```

**Response**:
```typescript
{ success: boolean }
```

### POST /api/stripe/remove-card
Delete payment method

**Request Body**:
```typescript
{ paymentMethodId: string }
```

**Response**:
```typescript
{ success: boolean }
```

### GET /api/stripe/connect-account
Create Stripe Express account

**Response**:
```typescript
{ url: string } // Onboarding URL
```

### GET /api/stripe/get-connect-account
Get connected account status

**Response**:
```typescript
{
  account: Stripe.Account;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}
```

### POST /api/stripe/disconnect-account
Remove connected account

**Response**:
```typescript
{ success: boolean }
```

---

## Database Schema

### profiles table (Stripe fields)

```sql
ALTER TABLE profiles
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_account_id TEXT;
```

### bookings table (Payment tracking)

```sql
ALTER TABLE bookings
ADD COLUMN payment_status payment_status_enum DEFAULT 'Pending',
ADD COLUMN stripe_checkout_id TEXT UNIQUE,
ADD COLUMN amount DECIMAL(10, 2),
ADD COLUMN referrer_profile_id UUID REFERENCES profiles(id),
ADD COLUMN agent_profile_id UUID REFERENCES profiles(id);

CREATE TYPE payment_status_enum AS ENUM ('Pending', 'Paid', 'Failed');
```

### transactions table

```sql
CREATE TYPE transaction_status_enum AS ENUM (
  'clearing',
  'available',
  'paid_out',
  'disputed',
  'refunded'
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  profile_id UUID REFERENCES profiles(id), -- NULL for platform fees
  booking_id UUID REFERENCES bookings(id),

  -- Transaction details
  type TEXT NOT NULL, -- 'Booking Payment', 'Tutoring Payout', etc.
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  status transaction_status_enum DEFAULT 'clearing',
  available_at TIMESTAMPTZ,

  -- Context fields (v4.9 - Migration 107)
  service_name TEXT,
  subjects TEXT[],
  session_date TIMESTAMPTZ,
  location_type TEXT,
  tutor_name TEXT,
  client_name TEXT,
  agent_name TEXT, -- Migration 110

  -- Stripe integration
  stripe_payout_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_available_at ON transactions(available_at);
CREATE INDEX idx_transactions_profile_status_available ON transactions(profile_id, status, available_at);
CREATE INDEX idx_transactions_subjects ON transactions USING GIN (subjects);
CREATE INDEX idx_transactions_session_date ON transactions(session_date);
CREATE INDEX idx_transactions_service_name ON transactions(service_name);
```

### failed_webhooks table (DLQ)

```sql
CREATE TABLE failed_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'failed',
  error_message TEXT,
  payload JSONB,
  booking_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## RPC Payment Processing

### handle_successful_payment Function

**File**: `apps/api/migrations/109_update_payment_rpc_with_context.sql`

**Signature**:
```sql
CREATE OR REPLACE FUNCTION handle_successful_payment(
  p_booking_id UUID,
  p_stripe_checkout_id TEXT,
  p_wiselist_referrer_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
```

**What it does**:
1. Locks booking row for atomic processing
2. Idempotency check using stripe_checkout_id
3. Creates client's "Booking Payment" transaction (negative)
4. Calculates clearing period (7 days from session end)
5. Creates tutor's "Tutoring Payout" transaction
6. Creates referrer commission (if applicable - 10%)
7. Creates agent commission (if applicable - 20%)
8. Creates platform fee transaction (10%)
9. Updates booking payment_status to 'Paid'
10. Updates referrals table for first booking conversion
11. Saves stripe_checkout_id to prevent duplicates

**Commission Logic**:
- Direct booking: Tutor 90%, Platform 10%
- Referred booking: Tutor 80%, Referrer 10%, Platform 10%
- Agent booking: Tutor 70%, Agent 20%, Platform 10%
- Agent + Referrer: Tutor 60%, Agent 20%, Referrer 10%, Platform 10%

---

## Webhook Handling

### Security

**Verify Signature**:
```typescript
const signature = headers().get('stripe-signature')!;
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

### Idempotency

**Unique stripe_checkout_id**:
- Prevents duplicate processing if webhook fires twice
- RPC checks if booking already has stripe_checkout_id
- Returns early if already processed

### Dead-Letter Queue (DLQ)

**Purpose**: Log failed webhook events without blocking Stripe

**When to use**:
- Missing booking_id in metadata
- RPC processing fails
- Database errors

**Implementation**:
```typescript
try {
  // Process webhook
} catch (error) {
  await logToDLQ(event, error.message, bookingId);
  return Response.json({ received: true }, { status: 200 }); // Don't retry
}
```

---

## Testing

### Test Stripe Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger payout.paid
stripe trigger payout.failed
```

### Test Payment Flow

```bash
# Use Stripe test cards
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
# Auth required: 4000 0027 6000 3184
```

### Component Testing

```typescript
// __tests__/payments.test.ts

import { POST } from '@/app/api/stripe/create-booking-checkout/route';

describe('POST /api/stripe/create-booking-checkout', () => {
  it('creates checkout session', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ bookingId: 'booking-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessionId).toBeDefined();
  });
});
```

---

## Troubleshooting

### Issue: Webhook signature verification fails

**Solution**: Check webhook secret matches Stripe dashboard

```bash
# Get webhook secret from Stripe CLI
stripe listen --print-secret
```

### Issue: Payment processed twice

**Solution**: Check idempotency - stripe_checkout_id should be unique

```sql
SELECT * FROM bookings WHERE stripe_checkout_id = 'cs_test_xxxxx';
```

### Issue: Commission split incorrect

**Solution**: Review RPC logic and check referrer_profile_id/agent_profile_id

```sql
SELECT * FROM transactions WHERE booking_id = 'booking-123';
```

---

## Related Files

- Stripe Client: [lib/stripe.ts](../../../apps/web/src/lib/stripe.ts)
- Payment API: [lib/api/payments.ts](../../../apps/web/src/lib/api/payments.ts)
- RPC: `apps/api/migrations/109_update_payment_rpc_with_context.sql`
- Tests: [apps/web/tests/api/stripe-webhook.test.ts](../../../apps/web/tests/api/stripe-webhook.test.ts)

---

**Last Updated**: 2025-12-12
**Version**: v4.9
**Maintainer**: Backend Team

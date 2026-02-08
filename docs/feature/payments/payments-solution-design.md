# Payments Feature - Solution Design

**Version**: v4.9 (Implemented)
**Last Updated**: 2025-12-12
**Status**: Active
**Architecture**: Stripe Connect + Atomic RPC Pattern
**Owner**: Backend Team

---

## Executive Summary

The Payments feature is a sophisticated multi-party marketplace payment system built on Stripe Connect, supporting 3-way and 4-way payment splits with lifetime referral attribution. The system handles bookings, payments, commissions, payouts, disputes, refunds, and integrates deeply with Auth, Bookings, Referrals, Agents, Wiselists, Network, Dashboard, and Analytics.

**Key Capabilities**:
- **3-Way & 4-Way Payment Splits**: Platform (10%) + Agent (20%) + Referring Agent (10%) + Tutor (60-80%)
- **Lifetime Referral Attribution**: Permanent commission tracking via `referred_by_agent_id`
- **Atomic RPC Transactions**: All payment processing via `handle_successful_payment` RPC
- **Idempotency & DLQ**: Webhook idempotency via `stripe_checkout_id` + Dead-Letter Queue
- **Dynamic Clearing Periods**: 7-day hold period with `available_at` timestamp
- **Payout Management**: Stripe Connect payouts with status tracking and reversals
- **Transaction Context Snapshotting**: Self-contained transaction records for audit trails

---

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     PAYMENT SYSTEM ARCHITECTURE                     │
└────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                      ┌──────────────┐
│   Client     │                                      │    Tutor     │
│  (Payer)     │                                      │ (Payee)      │
└──────┬───────┘                                      └──────┬───────┘
       │                                                     │
       │ 1. Create Booking                                  │
       ↓                                                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│              BOOKING API (/api/bookings/route.ts)                   │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. Create booking (status: Pending, payment_status: Pending)  │ │
│ │ 2. Copy agent_profile_id from client's referred_by_agent_id   │ │
│ │ 3. Snapshot listing fields (subjects, levels, hourly_rate)    │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 2. Redirect to Stripe Checkout
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│      STRIPE CHECKOUT API (/api/stripe/create-booking-checkout)     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. Find/create Stripe customer ID                             │ │
│ │ 2. Create checkout session with metadata:                     │ │
│ │    - booking_id (CRITICAL for webhook)                        │ │
│ │    - wiselist_referrer_id (optional)                          │ │
│ │ 3. Return checkout URL                                        │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 3. Client Pays
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       STRIPE PLATFORM                               │
│   - Processes payment                                               │
│   - Sends webhook: checkout.session.completed                       │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 4. Webhook Event
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│             STRIPE WEBHOOK (/api/webhooks/stripe/route.ts)          │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. Verify signature (STRIPE_WEBHOOK_SECRET)                   │ │
│ │ 2. Extract booking_id from metadata                           │ │
│ │ 3. Call handle_successful_payment RPC (ATOMIC)                │ │
│ │ 4. Save wiselist_referrer_id to booking (optional)            │ │
│ │ 5. On error: Log to failed_webhooks (DLQ)                     │ │
│ │ 6. Return 200 OK (prevent Stripe retries)                     │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 5. RPC Processing
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│      handle_successful_payment RPC (Migration 060, 109)             │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ [IDEMPOTENCY CHECK]                                            │ │
│ │ 1. Check if stripe_checkout_id already processed               │ │
│ │    - If yes: Return success immediately (no-op)                │ │
│ │                                                                 │ │
│ │ [FETCH BOOKING]                                                │ │
│ │ 2. Lock booking row with context (service_name, participants)  │ │
│ │                                                                 │ │
│ │ [CALCULATE CLEARING PERIOD]                                    │ │
│ │ 3. available_at = service_end_time + 7 days                    │ │
│ │                                                                 │ │
│ │ [CREATE TRANSACTIONS]                                          │ │
│ │ 4. Client Payment: -£100, status='paid_out', available_at=NOW │ │
│ │ 5. Platform Fee: +£10, status='paid_out', profile_id=NULL     │ │
│ │ 6. Referring Agent (if exists): +£10, status='clearing'        │ │
│ │ 7. Booking Agent (if agent-led): +£20, status='clearing'       │ │
│ │ 8. Tutor Payout: +£60-80, status='clearing'                   │ │
│ │    ↳ Each transaction includes context snapshot                │ │
│ │                                                                 │ │
│ │ [UPDATE BOOKING]                                               │ │
│ │ 9. Set payment_status='Paid', stripe_checkout_id=session.id    │ │
│ │                                                                 │ │
│ │ [UPDATE REFERRALS]                                             │ │
│ │ 10. Mark first conversion as 'Converted'                       │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION RECORDS CREATED                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Profile: NULL (Platform) | Amount: +£10.00 | Status: paid_out │ │
│ │ Profile: Agent   | Amount: +£10.00 | Status: clearing        │ │
│ │ Profile: Tutor   | Amount: +£80.00 | Status: clearing        │ │
│ │ Available At: 2025-11-25 (7 days from service end)            │ │
│ │ Context: Service="GCSE Maths", Tutor="Jane Smith", etc.       │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ↓ (After clearing period)
┌─────────────────────────────────────────────────────────────────────┐
│                      PAYOUT FLOW (Optional)                         │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. Tutor requests payout via /api/financials/withdraw          │ │
│ │ 2. Check available balance (status='available', available_at<NOW)│ │
│ │ 3. Create withdrawal transaction (status='clearing')            │ │
│ │ 4. Call Stripe createConnectPayout                             │ │
│ │ 5. Update transaction with stripe_payout_id (status='paid_out')│ │
│ │ 6. Mark all available transactions as 'paid_out'                │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## System Integrations

### 1. AUTHENTICATION INTEGRATION

**How It Works**:

**API Route Protection**:
```typescript
// All payment endpoints require authentication
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Stripe Metadata**:
```typescript
// User IDs passed to Stripe for payment tracking
metadata: {
  booking_id: booking.id,
  client_id: booking.client_id,
  tutor_id: booking.tutor_id,
  agent_id: booking.agent_profile_id,
  wiselist_referrer_id: cookies.get('wiselist_referrer_id')?.value,
}
```

**Integration Points**:
- **Files**: All `/api/webhooks/stripe/*`, `/api/bookings/*`, `/api/financials/*`
- **Purpose**: Ensures only authenticated users can create bookings, request payouts, view transactions
- **User Context**: Stripe customer IDs linked to profile IDs for payment history

---

### 2. BOOKINGS INTEGRATION - CRITICAL DEPENDENCY

**How It Works**:

**Booking Creation with Payment**:
```typescript
// apps/web/src/app/api/bookings/route.ts (lines 125-134, 266)

// 1. Create booking (status: Pending, payment_status: Pending)
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    client_id: clientProfile.id,
    tutor_id: listing.profile_id,
    agent_profile_id: clientProfile.referred_by_agent_id, // LIFETIME ATTRIBUTION
    listing_id: listing.id,
    service_name: listing.title,
    session_start_time: sessionDate,
    amount: totalCost,
    status: 'Pending',
    payment_status: 'Pending',
    // Snapshot fields (Migration 104)
    subjects: listing.subjects,
    levels: listing.levels,
    location_type: listing.location_type,
    hourly_rate: listing.hourly_rate,
    listing_slug: listing.slug,
  })
  .select()
  .single();

// 2. Redirect to Stripe checkout
// /api/stripe/create-booking-checkout creates session with booking_id
```

**Payment Confirmation Flow**:
```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts

// Webhook receives checkout.session.completed
const bookingId = session.metadata.booking_id;

// Call RPC to process payment
await supabase.rpc('handle_successful_payment', {
  p_booking_id: bookingId,
  p_stripe_checkout_id: session.id,
});

// Booking updated: payment_status='Paid'
```

**Database Schema**:
```sql
-- bookings table
id uuid PRIMARY KEY
client_id uuid → profiles(id)
tutor_id uuid → profiles(id)
agent_profile_id uuid → profiles(id)  -- Lifetime referrer attribution
booking_referrer_id uuid → profiles(id)  -- ❌ REMOVED (v5.7 wiselist attribution - deprecated 2026-02-08)
amount DECIMAL(10,2)
status booking_status_enum  -- Pending, Confirmed, Completed, Cancelled
payment_status transaction_status_enum  -- Pending, Paid, Failed
stripe_checkout_id TEXT UNIQUE  -- Idempotency key
-- Snapshot fields (Migration 104)
subjects TEXT[]
levels TEXT[]
location_type TEXT
hourly_rate DECIMAL
listing_slug TEXT
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/bookings/route.ts` - Booking creation
- **File**: `/apps/web/src/app/api/stripe/create-booking-checkout/route.ts` - Checkout session
- **File**: `/apps/web/src/app/api/webhooks/stripe/route.ts` - Payment confirmation
- **Migration**: `104_add_listing_snapshot_to_bookings.sql` - Snapshot fields

**Key Flows**:
1. Booking created → Payment initiated
2. Payment successful → Booking confirmed
3. Booking completed → Clearing period starts
4. Clearing period ends → Funds available for payout

---

### 3. REFERRALS INTEGRATION (Lifetime Attribution)

**How It Works**:

**Permanent Referrer Attribution**:
```typescript
// At signup (auth system):
// User B signs up with referral code from User A
// profiles.referred_by_agent_id = User A's profile_id (PERMANENT)

// At booking creation:
// apps/web/src/app/api/bookings/route.ts (line 266)
const { data: clientProfile } = await supabase
  .from('profiles')
  .select('referred_by_agent_id')
  .eq('id', userId)
  .single();

// Copy to booking
agent_profile_id: clientProfile.referred_by_agent_id, // Lifetime attribution
```

**Commission Calculation**:
```sql
-- apps/api/migrations/060_update_payment_webhook_rpc_v4_9.sql (lines 99-164)

-- 1. Get client's referring agent
SELECT referred_by_agent_id INTO v_referring_agent_id
FROM profiles
WHERE id = p_client_id;

-- 2. Check if referring agent exists AND is NOT the booking agent or tutor
IF v_referring_agent_id IS NOT NULL
   AND v_referring_agent_id NOT IN (v_booking.agent_profile_id, v_booking.tutor_id)
THEN
  -- Pay 10% lifetime commission
  v_referral_commission := p_amount * 0.10;

  INSERT INTO transactions (
    profile_id, booking_id, type, amount, status, available_at,
    service_name, subjects, session_date, tutor_name, client_name
  ) VALUES (
    v_referring_agent_id,
    p_booking_id,
    'Referral Commission',
    v_referral_commission,
    'clearing',
    v_available_timestamp,
    v_service_name, v_subjects, v_session_date, v_tutor_name, v_client_name
  );

  v_remaining_amount := v_remaining_amount - v_referral_commission;
END IF;
```

**Referral Pipeline Tracking**:
```sql
-- referrals table (Migration 028)
id uuid PRIMARY KEY
agent_profile_id uuid → profiles(id)  -- Renamed from referrer_profile_id
referred_profile_id uuid → profiles(id)  -- New user who signed up
status referral_status_enum  -- 'Referred', 'Signed Up', 'Converted', 'Expired'
booking_id uuid  -- First booking that triggered conversion
transaction_id uuid  -- First commission payment
referral_source referral_source_enum  -- 'Direct Link', 'QR Code', 'Embed Code'
geographic_data JSONB  -- IP geolocation
converted_at TIMESTAMPTZ
```

**Update Referral Status**:
```sql
-- In handle_successful_payment RPC
-- Mark first conversion
UPDATE referrals
SET status = 'Converted',
    booking_id = p_booking_id,
    transaction_id = (SELECT id FROM transactions WHERE type='Referral Commission' LIMIT 1),
    converted_at = NOW()
WHERE referred_profile_id = v_client_id
  AND status = 'Signed Up';
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/bookings/route.ts` (line 266) - Lifetime attribution copy
- **File**: `/apps/api/migrations/060_update_payment_webhook_rpc_v4_9.sql` (lines 120-140) - Commission calculation
- **File**: `/apps/api/migrations/028_create_hubs_v3_6_schema.sql` - Referrals table
- **File**: `/apps/api/migrations/096_add_referral_tracking_enhancements.sql` - Source tracking

**Commission Scenarios**:
- **Direct Booking**: No referrer → 90% Tutor, 10% Platform
- **Referred Booking**: Referrer exists → 80% Tutor, 10% Referrer, 10% Platform
- **Agent-Led Booking**: Agent assigned → 70% Tutor, 20% Agent, 10% Platform
- **Referred + Agent-Led**: 60% Tutor, 20% Agent, 10% Referrer, 10% Platform

---

### 4. AGENT COMMISSIONS INTEGRATION

**How It Works**:

**Agent-Led Bookings**:
```typescript
// Agent creates booking on behalf of client
// bookings.agent_profile_id can be set via:
// 1. Lifetime Attribution: Copied from profiles.referred_by_agent_id (automatic)
// 2. Direct Agent Assignment: Manually set for agent-led bookings
```

**Agent Commission Calculation**:
```sql
-- apps/api/migrations/060_update_payment_webhook_rpc_v4_9.sql (lines 141-164)

-- Check for Agent-Led Split (20% commission)
IF v_booking.agent_profile_id IS NOT NULL THEN
  v_agent_commission := p_amount * 0.20;

  INSERT INTO transactions (
    profile_id, booking_id, type, amount, status, available_at,
    service_name, subjects, session_date, tutor_name, client_name, agent_name
  ) VALUES (
    v_booking.agent_profile_id,
    p_booking_id,
    'Agent Commission',
    v_agent_commission,
    'clearing',
    v_available_timestamp,
    v_service_name, v_subjects, v_session_date, v_tutor_name, v_client_name, v_agent_name
  );

  v_remaining_amount := v_remaining_amount - v_agent_commission;

  -- Tutor gets remainder
  INSERT INTO transactions (
    profile_id, booking_id, type, amount, status, available_at, ...
  ) VALUES (
    v_booking.tutor_id,
    p_booking_id,
    'Tutoring Payout',
    v_remaining_amount,  -- 60-70%
    'clearing',
    v_available_timestamp,
    ...
  );
END IF;
```

**Prevention of Double-Commission**:
```sql
-- Line 120: Only pay referral commission if referring agent is NOT the booking agent or tutor
AND v_referring_agent_id NOT IN (v_booking.agent_profile_id, v_booking.tutor_id)
```

**Integration Points**:
- **File**: `/apps/api/migrations/060_update_payment_webhook_rpc_v4_9.sql` (lines 141-164)
- **File**: `/apps/web/src/app/api/bookings/assign/route.ts` - Agent assignment endpoint

**Commission Rates**:
- Referring Agent (lifetime): **10%**
- Booking Agent (direct): **20%**
- Platform Fee: **10%** (always)
- Tutor: **60-80%** (remainder)

---

### 5. ~~WISELIST/NETWORK INTEGRATION~~ ❌ REMOVED (2026-02-08)

> **⚠️ DEPRECATION NOTICE**
>
> Wiselist attribution tracking has been PERMANENTLY REMOVED.
> The referral system (v4.3) was removed from the platform.
> Wiselists are now organizational tools only - no attribution or commission tracking.

**~~How It Works~~**: (No longer applicable)

**~~Wiselist Sharing with Attribution~~**: REMOVED
```typescript
// ❌ THIS CODE HAS BEEN REMOVED FROM ALL ENDPOINTS

// 1. User shares Wiselist via /w/[slug] with their profile_id in cookie
// Middleware sets cookie: wiselist_referrer_id [REMOVED]

// 2. Cookie passed to Stripe checkout [REMOVED]
// apps/web/src/app/api/stripe/create-booking-checkout/route.ts
// wiselist_referrer_id tracking has been removed

// 3. Webhook saves attribution [REMOVED]
// apps/web/src/app/api/webhooks/stripe/route.ts
// wiselist attribution validation has been removed
```

**Database Schema**:
```sql
-- Migration 084: Add booking_referrer_id [DEPRECATED - field unused]
ALTER TABLE bookings
ADD COLUMN booking_referrer_id uuid REFERENCES profiles(id);
-- ⚠️ Column remains in database but is no longer populated or used
```

**~~Integration Points~~**: ALL REMOVED
- ~~**File**: `/apps/web/src/app/api/stripe/create-booking-checkout/route.ts`~~ (code removed)
- ~~**File**: `/apps/web/src/app/api/webhooks/stripe/route.ts`~~ (code removed)
- **Migration**: `084_add_booking_referrer_id.sql` (field deprecated but not dropped)

**Current Status**: ❌ Feature removed entirely - no attribution tracking or commission structure

---

### 6. DASHBOARD & ANALYTICS INTEGRATION

**How It Works**:

**Earnings Tracking**:
```typescript
// apps/web/src/app/api/dashboard/summary/route.ts

// Tutors: Sum of tutor_earnings from bookings
const { data: tutorStats } = await supabase
  .from('bookings')
  .select('amount')
  .eq('tutor_id', profileId)
  .eq('payment_status', 'Paid');

// Agents: Sum of agent_commission from transactions
const { data: agentStats } = await supabase
  .from('transactions')
  .select('amount')
  .eq('profile_id', profileId)
  .in('type', ['Agent Commission', 'Referral Commission'])
  .eq('status', 'available');

// Clients: Sum of total_price from bookings
const { data: clientStats } = await supabase
  .from('bookings')
  .select('amount')
  .eq('client_id', profileId)
  .eq('payment_status', 'Paid');
```

**Weekly Trends**:
```typescript
// apps/web/src/app/api/dashboard/earnings-trend/route.ts

// Last 6 weeks of earnings
const { data: trends } = await supabase
  .from('transactions')
  .select('amount, created_at')
  .eq('profile_id', profileId)
  .gte('created_at', sixWeeksAgo)
  .order('created_at', { ascending: true });

// Group by week and sum
const weeklyTotals = groupByWeek(trends);
```

**Agency Analytics**:
```sql
-- apps/api/migrations/095_create_agency_analytics_function.sql

CREATE FUNCTION get_agency_member_analytics(p_org_id UUID)
RETURNS TABLE (
  profile_id UUID,
  total_revenue DECIMAL,
  last_session_at TIMESTAMPTZ,
  active_students INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.profile_id,
    SUM(t.amount) FILTER (WHERE t.status = 'Paid') AS total_revenue,
    MAX(b.session_start_time) AS last_session_at,
    COUNT(DISTINCT b.client_id) FILTER (WHERE b.status IN ('Confirmed', 'Completed')) AS active_students
  FROM transactions t
  LEFT JOIN bookings b ON t.booking_id = b.id
  WHERE t.type = 'Referral Commission'
    AND t.profile_id IN (SELECT profile_id FROM org_members WHERE org_id = p_org_id)
  GROUP BY t.profile_id;
END;
$$ LANGUAGE plpgsql;
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/dashboard/earnings-trend/route.ts`
- **File**: `/apps/web/src/app/api/dashboard/summary/route.ts`
- **Migration**: `095_create_agency_analytics_function.sql`

---

### 7. TRANSACTION CONTEXT SNAPSHOTTING

**How It Works**:

**Problem**: Transactions lose context when bookings deleted

**Solution**: Snapshot booking context at transaction creation

**Context Fields Added** (Migrations 107, 109, 110, 111):
```sql
ALTER TABLE transactions ADD COLUMN service_name TEXT;
ALTER TABLE transactions ADD COLUMN subjects TEXT[];
ALTER TABLE transactions ADD COLUMN session_date TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN location_type TEXT;
ALTER TABLE transactions ADD COLUMN tutor_name TEXT;
ALTER TABLE transactions ADD COLUMN client_name TEXT;
ALTER TABLE transactions ADD COLUMN agent_name TEXT;  -- Migration 110
```

**RPC Implementation**:
```sql
-- Migration 109: Update handle_successful_payment RPC with context

-- Fetch context
SELECT
  b.service_name,
  b.subjects,
  b.session_start_time,
  b.location_type,
  tutor.full_name AS tutor_name,
  client.full_name AS client_name,
  agent.full_name AS agent_name
INTO v_service_name, v_subjects, v_session_date, v_location_type,
     v_tutor_name, v_client_name, v_agent_name
FROM bookings b
LEFT JOIN profiles tutor ON b.tutor_id = tutor.id
LEFT JOIN profiles client ON b.client_id = client.id
LEFT JOIN profiles agent ON b.agent_profile_id = agent.id
WHERE b.id = p_booking_id;

-- Create transactions with context
INSERT INTO transactions (
  profile_id, booking_id, type, amount, status, available_at,
  service_name, subjects, session_date, location_type,
  tutor_name, client_name, agent_name
) VALUES (...);
```

**Benefits**:
1. **Self-Contained Records**: No joins needed for transaction display
2. **Better UX**: "Payment for GCSE Maths Tutoring" vs "Payment"
3. **Revenue Analytics**: Filter by subject without joins
4. **Historical Accuracy**: Preserved even if booking deleted
5. **Platform Fee Tracking**: Platform transactions have context too

**Integration Points**:
- **Migration**: `107_add_transaction_context_fields.sql`
- **Migration**: `109_update_payment_rpc_with_context.sql`
- **Migration**: `110_add_transaction_agent_name.sql`
- **Migration**: `111_update_rpc_with_agent_name.sql`

---

### 8. STRIPE INTEGRATION

**How It Works**:

**Stripe Checkout Sessions**:
```typescript
// apps/web/src/app/api/stripe/create-booking-checkout/route.ts

const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer: stripeCustomerId,
  line_items: [{
    price_data: {
      currency: 'gbp',
      product_data: {
        name: `${booking.service_name}`,
        description: `${booking.hours_requested} hours @ £${booking.hourly_rate}/hr`,
      },
      unit_amount: Math.round(booking.total_cost * 100), // Convert to pence
    },
    quantity: 1,
  }],
  metadata: {
    booking_id: booking.id,
    client_id: booking.client_id,
    tutor_id: booking.tutor_id,
    agent_id: booking.agent_profile_id,
    wiselist_referrer_id: wiselistReferrerId,
  },
  success_url: `${origin}/bookings/${booking.id}/success`,
  cancel_url: `${origin}/bookings/${booking.id}`,
});
```

**Webhook Events Handled**:
```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts

switch (event.type) {
  case 'checkout.session.completed':
    // Process payment via handle_successful_payment RPC
    break;

  case 'payment_intent.payment_failed':
    // Update booking payment_status to 'Failed'
    break;

  case 'payout.paid':
    // Mark transaction as paid_out
    break;

  case 'payout.failed':
    // Refund to available balance (reversal transaction)
    break;

  case 'payout.canceled':
    // Refund to available balance
    break;

  case 'payout.updated':
    // Update transaction status
    break;
}
```

**Idempotency Handling**:
```sql
-- RPC checks if stripe_checkout_id already processed
SELECT 1 FROM bookings WHERE stripe_checkout_id = p_stripe_checkout_id;

IF FOUND THEN
  -- Already processed, return success immediately
  RETURN;
END IF;
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/stripe/create-booking-checkout/route.ts`
- **File**: `/apps/web/src/app/api/webhooks/stripe/route.ts`
- **Migration**: `056_add_stripe_checkout_id_to_bookings.sql` - Idempotency

---

### 9. PAYOUT MANAGEMENT INTEGRATION

**How It Works**:

**Payout Initiation**:
```typescript
// apps/web/src/app/api/financials/withdraw/route.ts

// 1. Validate amount (min £10, max £10,000)
if (amount < 10 || amount > 10000) {
  return Response.json({ error: 'Amount out of bounds' }, { status: 400 });
}

// 2. Check available balance
const { data: availableBalance } = await supabase
  .rpc('get_available_balance', { p_profile_id: profileId });

if (amount > availableBalance) {
  return Response.json({ error: 'Insufficient funds' }, { status: 400 });
}

// 3. Verify Stripe Connect account ready
const canPayout = await canReceivePayouts(stripeAccountId);
if (!canPayout) {
  return Response.json({ error: 'Account not ready' }, { status: 400 });
}

// 4. Create withdrawal transaction
const { data: transaction } = await supabase
  .from('transactions')
  .insert({
    profile_id: profileId,
    type: 'Withdrawal',
    amount: -amount,
    status: 'clearing',
  })
  .select()
  .single();

// 5. Call Stripe createConnectPayout
const payout = await stripe.payouts.create(
  {
    amount: Math.round(amount * 100), // Convert to pence
    currency: 'gbp',
    metadata: { transaction_id: transaction.id },
  },
  { stripeAccount: stripeAccountId }
);

// 6. Update transaction with stripe_payout_id
await supabase
  .from('transactions')
  .update({
    stripe_payout_id: payout.id,
    status: 'paid_out',
  })
  .eq('id', transaction.id);
```

**Payout Status Tracking**:
```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts (lines 124-293)

case 'payout.paid':
  // Update transaction to 'paid_out'
  await supabase
    .from('transactions')
    .update({ status: 'paid_out' })
    .eq('stripe_payout_id', payout.id);
  break;

case 'payout.failed':
  // Create reversal transaction (refund to available balance)
  const failedTransaction = await getTransactionByPayoutId(payout.id);

  await supabase
    .from('transactions')
    .insert({
      profile_id: failedTransaction.profile_id,
      type: 'Refund',
      description: `Payout reversal: ${payout.id}`,
      amount: Math.abs(failedTransaction.amount), // Positive to add back
      status: 'available',
      available_at: new Date().toISOString(),
      // Copy context from failed transaction
      service_name: failedTransaction.service_name,
      subjects: failedTransaction.subjects,
      ...
    });
  break;
```

**Balance Calculation RPCs**:
```sql
-- Migration 059: Wallet balance functions

CREATE FUNCTION get_available_balance(p_profile_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE profile_id = p_profile_id
    AND status = 'available'
    AND available_at <= NOW();
$$ LANGUAGE sql;

CREATE FUNCTION get_pending_balance(p_profile_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE profile_id = p_profile_id
    AND status = 'clearing';
$$ LANGUAGE sql;

CREATE FUNCTION get_total_earnings(p_profile_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE profile_id = p_profile_id
    AND amount > 0
    AND status IN ('available', 'clearing', 'paid_out');
$$ LANGUAGE sql;
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/financials/withdraw/route.ts`
- **File**: `/apps/web/src/lib/stripe/payouts.ts`
- **Migration**: `059_create_wallet_balance_functions.sql`

---

### 10. DEAD-LETTER QUEUE (DLQ) INTEGRATION

**How It Works**:

**Failed Webhook Logging**:
```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts

try {
  // Process webhook
  await handleWebhookEvent(event);
} catch (error) {
  // Log to DLQ
  await supabase
    .from('failed_webhooks')
    .insert({
      event_id: event.id,
      event_type: event.type,
      status: 'failed',
      error_message: error.message,
      payload: event,
      booking_id: extractBookingId(event),
    });

  // Return 200 to prevent Stripe retries
  return Response.json({ received: true }, { status: 200 });
}
```

**Database Schema**:
```sql
-- Migration 058: Dead-Letter Queue
CREATE TABLE failed_webhooks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'failed',
  error_message TEXT,
  payload JSONB NOT NULL,
  booking_id uuid,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);
```

**Manual Review Process**:
1. Admin queries `failed_webhooks` table
2. Reviews error message and payload
3. Manually re-processes or resolves
4. Updates status to 'resolved' with notes

**Integration Points**:
- **File**: `/apps/web/src/app/api/webhooks/stripe/route.ts`
- **Migration**: `058_create_failed_webhooks_table.sql`

---

## Data Flow Diagrams

### Payment Split Calculation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│               PAYMENT SPLIT CALCULATION FLOW                     │
└──────────────────────────────────────────────────────────────────┘

Booking Amount: £100.00
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Platform Fee (10% - Always Applied)                    │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Platform Fee: £100.00 × 0.10 = £10.00                      │ │
│ │ Transaction: profile_id=NULL, amount=+£10.00, status=paid_out│
│ │ Remaining: £100.00 - £10.00 = £90.00                        │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Check for Referring Agent (Lifetime Attribution)       │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Query: SELECT referred_by_agent_id FROM profiles           │ │
│ │        WHERE id = client_id                                │ │
│ │                                                             │ │
│ │ IF referring_agent_id IS NOT NULL AND                      │ │
│ │    referring_agent_id NOT IN (booking_agent_id, tutor_id): │ │
│ │                                                             │ │
│ │   Referral Commission: £100.00 × 0.10 = £10.00             │ │
│ │   Transaction: profile_id=referring_agent_id,              │ │
│ │                amount=+£10.00, type='Referral Commission'  │ │
│ │                status='clearing', available_at=7 days      │ │
│ │   Remaining: £90.00 - £10.00 = £80.00                      │ │
│ │                                                             │ │
│ │ ELSE: Skip (no referrer or referrer is agent/tutor)        │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Check for Agent-Led Booking (20% Commission)           │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ IF booking.agent_profile_id IS NOT NULL:                   │ │
│ │                                                             │ │
│ │   Agent Commission: £100.00 × 0.20 = £20.00                │ │
│ │   Transaction: profile_id=agent_profile_id,                │ │
│ │                amount=+£20.00, type='Agent Commission'      │ │
│ │                status='clearing', available_at=7 days      │ │
│ │   Remaining: £80.00 - £20.00 = £60.00 (or £70 if no referrer)│
│ │                                                             │ │
│ │ ELSE: Skip (no agent)                                       │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Tutor Payout (Remainder)                               │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Tutor Payout: Remaining amount                             │ │
│ │ Transaction: profile_id=tutor_id,                          │ │
│ │              amount=£60-80 (depending on splits),          │ │
│ │              type='Tutoring Payout'                        │ │
│ │              status='clearing', available_at=7 days        │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FINAL SPLIT SCENARIOS                        │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Direct Booking (No Referrer, No Agent):                    │ │
│ │   - Platform: £10 (10%)                                    │ │
│ │   - Tutor: £90 (90%)                                       │ │
│ │                                                             │ │
│ │ Referred Booking (Referrer, No Agent):                     │ │
│ │   - Platform: £10 (10%)                                    │ │
│ │   - Referring Agent: £10 (10%)                             │ │
│ │   - Tutor: £80 (80%)                                       │ │
│ │                                                             │ │
│ │ Agent-Led Booking (No Referrer):                           │ │
│ │   - Platform: £10 (10%)                                    │ │
│ │   - Booking Agent: £20 (20%)                               │ │
│ │   - Tutor: £70 (70%)                                       │ │
│ │                                                             │ │
│ │ Referred + Agent-Led (4-Way Split):                        │ │
│ │   - Platform: £10 (10%)                                    │ │
│ │   - Referring Agent: £10 (10%)                             │ │
│ │   - Booking Agent: £20 (20%)                               │ │
│ │   - Tutor: £60 (60%)                                       │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### transactions Table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL for platform fees
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  type transaction_type_enum NOT NULL,
  status transaction_status_v4_9 NOT NULL DEFAULT 'clearing',
  amount DECIMAL(10,2) NOT NULL,  -- Negative=debit, Positive=credit
  description TEXT,
  available_at TIMESTAMPTZ,  -- Clearing period end timestamp
  stripe_payout_id TEXT,  -- For withdrawals

  -- Context snapshot fields (Migrations 107, 109, 110, 111)
  service_name TEXT,
  subjects TEXT[],
  session_date TIMESTAMPTZ,
  location_type TEXT,
  tutor_name TEXT,
  client_name TEXT,
  agent_name TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Types (Migration 028)
CREATE TYPE transaction_type_enum AS ENUM (
  'Booking Payment',      -- Client pays for session (negative amount)
  'Tutoring Payout',      -- Tutor earnings (positive)
  'Referral Commission',  -- Referrer earnings (positive)
  'Agent Commission',     -- Agent earnings (positive)
  'Withdrawal',           -- Payout to bank (negative)
  'Platform Fee',         -- Platform revenue (positive, profile_id=NULL)
  'Refund'                -- Reversal transaction (positive to add back)
);

-- Transaction Status (Migration 057)
CREATE TYPE transaction_status_v4_9 AS ENUM (
  'clearing',    -- Funds held during clearing period (7 days default)
  'available',   -- Funds ready for payout (available_at <= NOW())
  'paid_out',    -- Funds withdrawn to bank
  'disputed',    -- Under dispute/chargeback
  'refunded'     -- Transaction refunded
);

-- Indexes
CREATE INDEX idx_transactions_profile_id ON transactions(profile_id);
CREATE INDEX idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_available_at ON transactions(available_at);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

---

## Security Considerations

### Webhook Security

1. **Signature Verification**:
   - All Stripe webhooks verify `stripe.webhooks.constructEvent` signature
   - Uses `STRIPE_WEBHOOK_SECRET` environment variable
   - Rejects invalid signatures with 400 Bad Request

2. **Idempotency**:
   - `stripe_checkout_id` uniqueness prevents duplicate processing
   - RPC checks before executing any logic
   - Returns success immediately if already processed

3. **Dead-Letter Queue**:
   - Failed webhooks logged to `failed_webhooks` table
   - Returns 200 OK to prevent Stripe retries
   - Manual review process for resolution

### Financial Integrity

1. **Atomic Transactions**:
   - All payment processing via RPC (atomic database transactions)
   - Either all transactions created or none (rollback on error)
   - Prevents partial payment states

2. **Balance Validation**:
   - Payout requests check available balance before processing
   - Insufficient funds rejection
   - Stripe account validation (payouts_enabled, external_accounts)

3. **Clearing Periods**:
   - 7-day hold period mitigates chargeback risk
   - Funds locked in `status='clearing'` until `available_at <= NOW()`
   - Platform can adjust clearing periods based on trust scores

---

## Performance Considerations

### Optimizations

1. **Database Indexes**:
   - `idx_transactions_profile_id` for user balance queries
   - `idx_transactions_status` for status filtering
   - `idx_transactions_available_at` for clearing period checks
   - `idx_transactions_created_at` for chronological ordering

2. **RPC Functions**:
   - `get_available_balance` optimized with single query + index scan
   - `get_pending_balance` optimized with status filter
   - Context snapshotting eliminates joins in transaction queries

3. **Webhook Processing**:
   - Async processing via RPC
   - Returns 200 OK immediately to Stripe
   - Background processing via database triggers

### Performance Metrics

- **Webhook Processing Time**: ~200-500ms (RPC execution)
- **Balance Calculation**: ~50-100ms (indexed query)
- **Payout Initiation**: ~1-2s (Stripe API call + database update)
- **Dashboard Earnings Query**: ~100-200ms (with indexes)

---

## Testing Strategy

### Unit Tests

1. **RPC Functions**:
   - Test idempotency (duplicate stripe_checkout_id)
   - Test commission splits (2-way, 3-way, 4-way)
   - Test clearing period calculation
   - Test balance calculation functions

2. **API Routes**:
   - Test webhook signature verification
   - Test payout validation (min/max amount, balance check)
   - Test unauthorized access rejection

### Integration Tests

1. **Payment Flow**:
   - Create booking → Stripe checkout → Webhook → Commission split
   - Verify correct transaction creation
   - Verify booking status update

2. **Payout Flow**:
   - Request payout → Stripe payout → Webhook → Status update
   - Verify transaction status changes
   - Test payout failure reversals

### E2E Tests

1. **Full Booking Payment Flow**:
   - Client creates booking
   - Client pays via Stripe
   - Webhook processes payment
   - All parties receive correct amounts
   - Clearing period expires
   - Funds become available for payout

---

## Summary of System Integrations

### ✅ Strong Integrations

1. **Auth** - Full authentication via Supabase Auth for all payment endpoints
2. **Bookings** - CRITICAL dependency (bookings trigger payments, payment confirms bookings)
3. **Referrals** - Lifetime attribution via `referred_by_agent_id` (10% commission)
4. **Agents** - Agent-led bookings with 20% commission
5. **Stripe** - Complete Stripe Connect integration (checkout, webhooks, payouts)
6. **Dashboard** - Earnings tracking, trends, agency analytics
7. ~~**Wiselist/Network**~~ - ❌ REMOVED (2026-02-08) - Attribution tracking removed, no commission
8. **Transactions** - Context snapshotting for self-contained audit trails

### ⚠️ Partial Integrations

~~1. **Wiselist**~~ - ❌ REMOVED (2026-02-08) - Attribution tracking permanently removed

### ❌ No Integration Found

1. **Messages** - No payment features in messaging
2. **Reviews** - No payment-triggered review logic found

---

**Last Updated**: 2025-12-12
**Version**: v4.9 (Implemented)
**Architecture**: Stripe Connect + Atomic RPC Pattern
**Owner**: Backend Team
**For Questions**: See implementation guides and migration files

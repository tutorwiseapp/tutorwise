# Tutorwise Financials System - Complete Guide

**Last Updated**: 2026-02-07
**Version**: 2.0 (Post-Audit Fixes)
**Status**: Production-Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Transaction Types](#transaction-types)
4. [Payment Flow](#payment-flow)
5. [Commission Structure](#commission-structure)
6. [Refund & Cancellation Policy](#refund--cancellation-policy)
7. [Security & RLS Policies](#security--rls-policies)
8. [Recent Audit Fixes (2026-02-07)](#recent-audit-fixes-2026-02-07)
9. [UI Enhancements (2026-02-07)](#ui-enhancements-2026-02-07)
10. [API Endpoints](#api-endpoints)
11. [Database Schema](#database-schema)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)

---

## System Overview

The Tutorwise financials system handles all monetary transactions, including:
- **Booking payments** from clients
- **Commission distributions** to tutors, agents, and referrers
- **Platform fee collection** (10%)
- **Withdrawals** (payouts to tutors/agents)
- **Refunds** (cancellations and disputes)
- **Clearing period** (7-day fraud protection)

### Key Features

✅ **Atomic Payment Processing** - All-or-nothing transaction splits
✅ **Stripe Integration** - PCI-compliant payment processing
✅ **Row Level Security (RLS)** - Complete data privacy
✅ **Idempotency** - Prevents duplicate charges and refunds
✅ **Audit Trail** - Immutable transaction ledger
✅ **Automated Payouts** - Weekly batch processing
✅ **Dispute Handling** - Chargeback protection

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    FINANCIALS SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │   Frontend   │────▶│   API Routes │────▶│   Stripe    │ │
│  │  Components  │◀────│  /financials │◀────│     API     │ │
│  └──────────────┘     └──────────────┘     └─────────────┘ │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────┐                     │
│                    │  Transactions    │                     │
│                    │     Table        │                     │
│                    │  (RLS Enabled)   │                     │
│                    └──────────────────┘                     │
│                              │                               │
│                    ┌─────────┴─────────┐                   │
│                    ▼                   ▼                   │
│           ┌──────────────┐    ┌──────────────┐           │
│           │ RPC Functions│    │  Stripe      │           │
│           │ (Payments)   │    │ Webhooks     │           │
│           └──────────────┘    └──────────────┘           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Transaction Lifecycle

```
1. Payment Initiated (Client)
   ↓
2. Stripe Checkout Created
   ↓
3. Payment Succeeded (Webhook)
   ↓
4. handle_successful_payment RPC
   ↓
5. Transaction Records Created:
   - Client: -£100 (Booking Payment)
   - Tutor: +£80 (Tutoring Payout) → 'clearing' status
   - Referrer: +£10 (Referral Commission) → 'clearing' status
   - Platform: +£10 (Platform Fee) → 'paid_out' status
   ↓
6. Clearing Period (7 days)
   ↓
7. Transition to 'available' (Cron Job)
   ↓
8. Withdrawal Requested
   ↓
9. Stripe Payout Created
   ↓
10. Payout Confirmed (Webhook)
    ↓
11. Status → 'paid_out'
```

---

## Transaction Types

The system uses 5 transaction types:

| Type | Code | Amount Sign | Description |
|------|------|-------------|-------------|
| **Booking Payment** | T-TYPE-1 | Negative (-) | Client pays for session |
| **Tutoring Payout** | T-TYPE-2 | Positive (+) | Tutor earns commission |
| **Referral Commission** | T-TYPE-3 | Positive (+) | Agent/referrer earns commission |
| **Withdrawal** | T-TYPE-4 | Negative (-) | User requests bank transfer |
| **Platform Fee** | T-TYPE-5 | Positive (+) | Platform revenue (10%) |
| **Refund** | - | Negative (-) | Reversal transaction (cancellations/disputes) |

### Transaction Status Lifecycle

```
┌──────────┐
│ clearing │ ──┐
└──────────┘   │ 7 days
               ↓
          ┌──────────┐
          │available │ ──┐
          └──────────┘   │ Withdrawal
                         ↓
                   ┌──────────┐
                   │ paid_out │
                   └──────────┘

Special statuses:
- disputed  → Chargeback pending
- refunded  → Cancelled/reversed
```

---

## Payment Flow

### Standard Booking Payment (Direct)

**£100 Booking → 90/10 Split**

```
Client pays £100 via Stripe
↓
Stripe processes payment (£1.70 fee kept by Stripe)
↓
Platform receives £100 payment intent
↓
RPC creates 4 transactions atomically:

1. Client:   -£100.00  (Booking Payment)    [paid_out]
2. Tutor:    +£90.00   (Tutoring Payout)    [clearing → available → paid_out]
3. Platform: +£10.00   (Platform Fee)       [paid_out immediately]
4. Referrer: +£0.00    (No referrer)

Total: -£100 + £90 + £10 = £0 ✓ (Balanced)
```

### Referred Booking Payment

**£100 Booking → 80/10/10 Split**

```
Client (referred by Agent A) pays £100 via Stripe
↓
RPC creates 4 transactions:

1. Client:     -£100.00  (Booking Payment)
2. Tutor:      +£80.00   (Tutoring Payout)     [clearing]
3. Agent A:    +£10.00   (Referral Commission) [clearing]
4. Platform:   +£10.00   (Platform Fee)        [paid_out]

Total: -£100 + £80 + £10 + £10 = £0 ✓
```

### Refund Flow (Cancellation)

**Client cancels with 48h notice (full refund)**

```
Original Payment: £100
↓
Stripe fee: £1.70 (non-refundable)
↓
Client gets: £98.30 refund
↓
Reverse all commission transactions:

1. Tutor Payout Reversal:      -£80.00 (Refund)
2. Referral Commission Reversal: -£10.00 (Refund)
3. Platform Fee Reversal:        -£10.00 (Refund)

Original transactions marked as 'refunded' status
Reversal transactions created with negative amounts
Net result: All balances returned to zero
```

---

## Commission Structure

### Tier 1: Active (Legal Clearance Approved)

- **Platform Fee**: 10% (fixed)
- **Referral Commission**: 10% (lifetime attribution)
- **Tutor Payout**: 80-90% (depends on referral)

### Calculation Rules

```typescript
const bookingAmount = 100;
const platformFee = bookingAmount * 0.10;        // £10
const referralCommission = hasReferrer ? bookingAmount * 0.10 : 0;  // £10 or £0
const tutorPayout = bookingAmount - platformFee - referralCommission; // £80 or £90
```

### Tiers 2-7: Disabled

Multi-level marketing tiers are configured but disabled pending legal review. Only Tier 1 (direct referrer) is currently active.

---

## Refund & Cancellation Policy

### Client Cancellation

| Notice Period | Refund | Tutor Payout | Policy Code |
|---------------|--------|--------------|-------------|
| **≥ 24 hours** | 100% - Stripe fee (£98.30) | £0 | `client_24h+` |
| **< 24 hours** | £0 (No refund) | Full amount (£100) | `client_<24h` |
| **No-show** | £0 | Full amount (£100) | `client_no_show` |

### Tutor Cancellation

| Scenario | Refund | CaaS Impact | Policy Code |
|----------|--------|-------------|-------------|
| **Cancellation** (any time) | 100% - Stripe fee | -10 points | `tutor_cancellation` |
| **No-show** | 100% - Stripe fee | -50 points | `tutor_no_show` |

### Stripe Fee Policy

- **Fee Structure**: 1.5% + £0.20 per transaction (UK/EU cards)
- **Non-Refundable**: Stripe keeps fees even when refunds are issued
- **Client Impact**: £100 payment → £98.30 refund (£1.70 Stripe fee lost)
- **Example**: £100 booking = £1.70 fee → Client gets £98.30 back

### Late Cancellation Penalties

- **Repeat Offender**: 3+ late cancellations in 30 days
- **Warning System**: Progressive warnings before cancellation
- **Tracking**: `cancellation_penalties` table stores history
- **Enforcement**: Account restrictions for repeated violations

---

## Security & RLS Policies

### Row Level Security (RLS)

**Migration 244** implemented comprehensive RLS policies:

#### 1. Users View Own Transactions

```sql
CREATE POLICY "Users view own transactions"
ON transactions FOR SELECT
USING (
  profile_id = auth.uid()
  OR auth.jwt() ->> 'role' = 'service_role'
);
```

Users can only see transactions where they are the `profile_id`.

#### 2. Admins View All Transactions

```sql
CREATE POLICY "Admins view all transactions"
ON transactions FOR SELECT
USING (is_admin());
```

Admins can view all transactions, including platform fees.

#### 3. Service Role Only Inserts

```sql
CREATE POLICY "Service role only inserts"
ON transactions FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
```

Only backend RPC functions can create transactions. No direct client access.

#### 4. Service Role Only Updates

```sql
CREATE POLICY "Service role only updates"
ON transactions FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role');
```

Status transitions (clearing → available → paid_out) are backend-only.

#### 5. No Transaction Deletions

```sql
CREATE POLICY "No transaction deletions"
ON transactions FOR DELETE
USING (false);
```

Transactions are immutable. Use reversal transactions instead.

---

## Recent Audit Fixes (2026-02-07)

A comprehensive security audit identified and fixed 7 critical issues:

### ✅ Fix #1: RLS Policies Added (CRITICAL)
- **Issue**: Transactions table had no RLS policies
- **Risk**: Potential data leak
- **Fix**: Migration 244 - Complete RLS implementation
- **Impact**: Users can only see their own financial data

### ✅ Fix #2: Withdrawal Race Condition (CRITICAL)
- **Issue**: Bulk status update marked all available funds as paid_out
- **Risk**: Concurrent withdrawals corrupt balance state
- **Fix**: Removed bulk update, webhook handles status transitions
- **File**: `withdraw/route.ts:258-269`

### ✅ Fix #3: Refund Reversal Enhanced (CRITICAL)
- **Issue**: Original transactions not marked as 'refunded'
- **Risk**: Incomplete audit trail
- **Fix**: Mark originals as 'refunded', create offsetting reversals
- **File**: `cancellation.ts:358-370`

### ✅ Fix #4: Platform Fee in Reversals (CRITICAL)
- **Issue**: Platform Fee excluded from refund reversals
- **Risk**: Unaccounted funds in cancellations
- **Fix**: Include 'Platform Fee' in reversal transaction types
- **File**: `cancellation.ts:302-309`

### ✅ Fix #5: Field Name Standardization (HIGH)
- **Issue**: `location_type` vs `delivery_mode` inconsistency
- **Risk**: Code confusion and bugs
- **Fix**: Migration 245 - Renamed to `delivery_mode` everywhere
- **Impact**: Consistent naming across all tables

### ✅ Fix #6: Concurrent Withdrawal Prevention (HIGH)
- **Issue**: Multiple simultaneous withdrawals allowed
- **Risk**: Duplicate payouts possible
- **Fix**: Check for pending withdrawals (15min window), return 409 Conflict
- **File**: `withdraw/route.ts:171-193`

### ✅ Fix #7: Dispute/Chargeback Handler (HIGH)
- **Issue**: No webhook handler for chargebacks
- **Risk**: Non-compliant with Stripe best practices
- **Fix**: Added `charge.dispute.created` handler
- **File**: `webhooks/stripe/route.ts:402-490`

### ✅ Fix #8: Refund Idempotency (MEDIUM)
- **Issue**: Duplicate refunds possible if endpoint called twice
- **Risk**: Double refunds
- **Fix**: Check for existing refunds, use Stripe idempotency keys
- **File**: `cancel/route.ts:140-175`

---

## UI Enhancements (2026-02-07)

Following the security audit, comprehensive UI enhancements were added to both user and admin financials pages:

### User-Facing Enhancements

#### 1. Enhanced Wallet Balance Widget
**Component**: `WalletBalanceWidget.tsx`
- **Earnings Projections**: Expandable "Upcoming Earnings" section
- **Date Grouping**: Shows when clearing funds become available (up to 5 future dates)
- **Amount Breakdown**: Total clearing amount per date
- **Transaction Count**: Number of transactions clearing on each date
- **7-Day Timeline**: Automatically calculates based on session completion + 7 days

**Usage**: Pass `transactions` prop to enable projections feature.

#### 2. Functional Withdrawal System
**Component**: `WithdrawalConfirmationModal.tsx`
- **On-Demand Withdrawals**: Users can request withdrawals anytime
- **Confirmation Modal**: Shows available balance, processing time (2-3 days), limitations
- **API Integration**: Calls `/api/financials/withdraw` with full error handling
- **Conflict Prevention**: Shows error if another withdrawal is processing
- **Auto-Refresh**: Refetches balance data after successful withdrawal

**Flow**:
1. User clicks "Request Withdrawal" button on `/financials`
2. Modal displays available balance and terms
3. User confirms
4. POST request to `/api/financials/withdraw`
5. Success: Balance refreshes, modal closes
6. Error: Toast message with specific reason (409 Conflict, 400 Bad Request, etc.)

#### 3. Withdrawal History Section
**Component**: `WithdrawalHistorySection.tsx`
- **Collapsible Section**: Appears below transaction list (if withdrawals exist)
- **Last 10 Withdrawals**: Sorted by most recent first
- **Status Tracking**: Processing, Completed, Failed, Disputed
- **Stripe Integration**: Direct links to Stripe Dashboard for each payout
- **Estimated Arrival**: Shows ETA for processing withdrawals (if available_at set)

**Statuses**:
- `clearing` → "Processing" (yellow badge)
- `paid_out` → "Completed" (green badge)
- `failed` → "Failed" (red badge)
- `disputed` → "Disputed" (red badge)

#### 4. Enhanced Transaction Cards with Dispute Alerts
**Component**: `TransactionCard.tsx`
- **Dispute Banner**: Prominent red gradient alert for disputed transactions
- **Refund Notice**: Yellow banner for refunded transactions
- **Stripe Links**: Direct links to Stripe Dashboard for disputes
- **Contextual Info**: Explains dispute status and recommends immediate action

**Visual Indicators**:
- Disputed: Red border, AlertTriangle icon, "View in Stripe Dashboard" link
- Refunded: Yellow background, softer alert styling

### Admin-Facing Enhancements

#### 5. Reconciliation Dashboard (New Tab)
**Component**: `ReconciliationDashboard.tsx`
**Route**: `/admin/financials` → "Reconciliation" tab
**API**: `/api/admin/financials/reconciliation`

**Features**:
- **Balance Comparison**: Stripe vs Supabase side-by-side
- **Discrepancy Detection**: Highlights mismatches (> £0.01 tolerance)
- **Visual Indicators**:
  - Green checkmark badge if balanced
  - Red alert badge if discrepancy exists
- **Refresh Button**: Manual sync trigger
- **Help Section**: Explains causes (webhook failures, manual Stripe ops, rounding) and resolution steps

**Calculation**:
```javascript
// Supabase balance = sum of Platform Fee transactions with status 'paid_out'
supabaseBalance = SUM(amount) WHERE type='Platform Fee' AND status='paid_out'

// Stripe balance from API (converted from pence to pounds)
stripeBalance = stripe.balance.available[0].amount / 100

// Discrepancy
discrepancy = supabaseBalance - stripeBalance
```

#### 6. Disputes Management (New Tab)
**Component**: `DisputesManagement.tsx`
**Route**: `/admin/financials` → "Disputes" tab
**API**: `/api/admin/financials/disputes`

**Features**:
- **Dispute Queue**: All transactions with `status='disputed'`
- **Status Filtering**: All, Pending, Under Review, Won, Lost
- **Booking Context**: Client name, tutor name, amount, reason, booking reference
- **Quick Actions**:
  - "View Booking" → `/admin/bookings/[id]`
  - "View in Stripe" → `https://dashboard.stripe.com/disputes/[id]`
- **Empty States**: Clear messaging when no disputes exist

**Dispute Card Info**:
- Booking reference (first 8 chars of ID)
- Amount (absolute value)
- Status badge (color-coded)
- Reason (from chargeback)
- Client/tutor names
- Filed date

#### 7. Platform Revenue KPI Card (Overview Tab)
**Component**: `HubKPICard` in admin financials page
**Location**: First row of KPI grid, second position

**Display**:
- Label: "Platform Revenue"
- Value: £X (formatted, from `platform_revenue` metric)
- Sublabel: Month-over-month trend (±X%, ↑↓ arrow)
- Icon: PiggyBank

**Data Source**: `useAdminMetric({ metric: 'platform_revenue', compareWith: 'last_month' })`

#### 8. Updated Admin Tabs
**Route**: `/admin/financials`

**4 Tabs**:
1. **Overview**: Existing KPIs + charts (now includes Platform Revenue)
2. **Reconciliation** (NEW): Balance comparison dashboard
3. **Disputes** (NEW): Dispute management queue (with count badge)
4. **All Transactions**: Existing transactions table

**Implementation**: Updated `activeTab` state, `HubTabs` configuration, conditional rendering

---

## API Endpoints

### Financials Management

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/financials` | GET | Fetch user transactions & balances | Required |
| `/api/financials/withdraw` | POST | Request withdrawal (manual, on-demand) | Required |
| `/api/bookings/[id]/cancel` | POST | Cancel booking & process refund | Required |
| `/api/webhooks/stripe` | POST | Stripe webhook handler | Webhook signature |

### Admin Financials (New!)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/admin/financials/reconciliation` | GET | Compare Stripe vs Supabase balances | Admin only |
| `/api/admin/financials/disputes` | GET | Fetch all disputed transactions | Admin only |

### Cron Jobs (Automated)

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/process-pending-commissions` | Hourly (minute 15) | Clear 'pending' → 'available' after 7 days |
| `/api/cron/process-batch-payouts` | Weekly (Fri 10am) | Auto-pay all available balances |

---

## Database Schema

### Transactions Table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),  -- NULL for Platform Fee
  booking_id UUID REFERENCES bookings(id),
  type TEXT NOT NULL,  -- See Transaction Types
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,  -- Positive = credit, Negative = debit
  status TEXT NOT NULL,  -- clearing, available, paid_out, disputed, refunded
  available_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context fields (snapshot at transaction creation)
  service_name TEXT,
  subjects TEXT[],
  session_date TIMESTAMPTZ,
  delivery_mode TEXT,  -- online/in_person/hybrid (was location_type)
  tutor_name TEXT,
  client_name TEXT,
  agent_name TEXT,

  -- Stripe metadata
  stripe_payout_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_id TEXT,

  metadata JSONB  -- Additional context (reversals, disputes)
);
```

### Related Tables

- **bookings**: Links to booking details
- **profiles**: User information
- **cancellation_penalties**: Late cancellation tracking
- **no_show_reports**: No-show tracking
- **organisation_subscriptions**: Premium subscription billing

---

## Testing

### Run Tests

```bash
npm test -- financials-audit-fixes.test.ts
```

### Test Coverage

The test suite covers:
- ✅ Stripe fee calculation accuracy
- ✅ Cancellation policy edge cases (24h threshold)
- ✅ Commission split calculations (80/10/10, 90/10)
- ✅ Refund accounting accuracy
- ✅ Zero-amount bookings
- ✅ Fractional hours handling
- ✅ Platform fee reversal verification

### Critical Test Cases

1. **Exactly 24h notice** → Full refund
2. **23h 59min notice** → No refund
3. **Tutor cancellation** → Always full refund + CaaS penalty
4. **Refund + Stripe fee = Original amount** → Accounting accuracy

---

## Troubleshooting

### Common Issues

#### 1. "Insufficient balance" Error

**Cause**: User trying to withdraw more than available balance
**Solution**: Check transaction status - funds may still be in 'clearing'
**Fix**: Wait for clearing period (7 days after session completion)

#### 2. Withdrawal Already in Progress (409 Conflict)

**Cause**: Concurrent withdrawal prevention (Fix #6)
**Solution**: Wait for existing withdrawal to complete (15min window)
**Fix**: User can retry after pending withdrawal processes

#### 3. RLS Policy Violation

**Cause**: User trying to access another user's transactions
**Solution**: RLS policies correctly blocking unauthorized access
**Fix**: This is expected behavior - no fix needed

#### 4. Refund Already Exists

**Cause**: Idempotency protection (Fix #8)
**Solution**: Refund already processed for this booking
**Fix**: Check Stripe dashboard for existing refund

### Debugging

Enable detailed logging:

```typescript
console.log('[FINANCIALS] Transaction created:', transaction.id);
console.log('[WITHDRAWAL] Payout initiated:', payoutId);
console.log('[REFUND] Stripe refund:', refundId);
```

Check transaction status:

```sql
SELECT * FROM transactions WHERE booking_id = '<booking_id>';
```

Verify RLS policies:

```sql
SELECT * FROM pg_policies WHERE tablename = 'transactions';
```

---

## Best Practices

### For Developers

1. **Never bypass RLS** - Use service role only in backend
2. **Always use idempotency keys** - Prevent duplicate charges
3. **Log all financial operations** - Complete audit trail
4. **Test refund calculations** - Verify amounts match policy
5. **Use reversals, not deletions** - Immutable ledger

### For Admins

1. **Monitor clearing period** - Ensure cron jobs running
2. **Review disputed transactions** - Handle chargebacks promptly
3. **Verify commission splits** - Audit payment distributions
4. **Check Stripe reconciliation** - Monthly balance verification
5. **Track repeat late cancellations** - Enforce penalties

---

## Support & Maintenance

**Database Migrations**: Run in order (244, 245, ...)
**Cron Jobs**: Verify via Supabase pg_cron dashboard
**Stripe Dashboard**: [https://dashboard.stripe.com](https://dashboard.stripe.com)
**Issue Tracker**: Report bugs via GitHub Issues

---

**Document Maintainer**: Development Team
**Last Audit**: 2026-02-07
**Next Review**: Q2 2026

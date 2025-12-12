# Payments

**Status**: 🟢 Active
**Last Code Update**: 2025-12-12 (v4.9 - Transaction Context Fields)
**Last Doc Update**: 2025-12-12
**Priority**: High (Tier 1 - Critical)
**Architecture**: Stripe Integration + Hub Layout

## Quick Links
- [Implementation Guide](./payments-implementation.md)
- [AI Prompt Context](./payments-ai-prompt.md)
- [Solution Design](./payments-solution-design-v4.9.md)

## Overview

The payments feature is a comprehensive financial system built on Stripe for payment processing, commission management, and payout handling. Features payment method management, Stripe Connect for receiving payments, automated commission splits, clearing periods, and robust webhook handling with Dead-Letter Queue (DLQ) error resilience.

## Key Features

- **Payment Method Management**: Add, set default, and remove credit/debit cards
- **Stripe Connect**: Receive payments with Express accounts
- **Booking Payments**: Checkout sessions with automated processing
- **Commission Splits**: 3-way and 4-way payment distribution
- **Clearing Periods**: Dynamic 7-day fraud protection window
- **Transaction Tracking**: Complete history with context snapshots
- **Payout Management**: Withdrawal to bank accounts via Stripe
- **Webhook Handling**: Idempotent processing with DLQ for failures
- **Chargeback Management**: Dispute handling and resolution

## Component Architecture

### Main Hub Page
- [page.tsx](../../../apps/web/src/app/(authenticated)/payments/page.tsx) - Payment method management

### Financial Pages (Related)
- [financials/page.tsx](../../../apps/web/src/app/(authenticated)/financials/page.tsx) - Transaction history
- [financials/payouts/page.tsx](../../../apps/web/src/app/(authenticated)/financials/payouts/page.tsx) - Withdrawal management
- [financials/disputes/page.tsx](../../../apps/web/src/app/(authenticated)/financials/disputes/page.tsx) - Chargeback handling

### Core Components
- **SavedCardList.tsx** - Display and manage saved cards
- **PaymentHelpWidget.tsx** - Information about Stripe security
- **PaymentTipWidget.tsx** - Payment tips
- **PaymentVideoWidget.tsx** - Video guides

## Routes

### Main Routes
- `/payments` - Manage payment methods (authenticated)
- `/financials` - View transactions (authenticated)
- `/financials/payouts` - Manage payouts (authenticated)
- `/financials/disputes` - Handle chargebacks (authenticated)

### API Endpoints (14 total)

**Card Management**:
1. `POST /api/stripe/create-checkout-session` - Add payment method (setup mode)
2. `POST /api/stripe/get-cards-by-customer` - List saved cards
3. `POST /api/stripe/verify-and-get-cards` - Post-checkout verification
4. `POST /api/stripe/set-default-card` - Set default payment method
5. `POST /api/stripe/remove-card` - Delete payment method

**Booking Payments**:
6. `POST /api/stripe/create-booking-checkout` - Create booking checkout session
7. `POST /api/stripe/create-charge-and-transfer` - Direct charge with transfer

**Stripe Connect**:
8. `GET /api/stripe/connect-account` - Create Express account
9. `GET /api/stripe/get-connect-account` - Get account status
10. `POST /api/stripe/disconnect-account` - Remove connected account

**Webhooks**:
11. `POST /api/webhooks/stripe` - Main webhook handler (6 events)

## Database Tables

### Primary Tables

**profiles** (Stripe Integration)
```sql
- stripe_customer_id TEXT - For payment methods
- stripe_account_id TEXT - For receiving payments (Express)
```

**bookings** (Payment Tracking)
```sql
- payment_status ENUM - Pending | Paid | Failed
- stripe_checkout_id TEXT UNIQUE - Idempotency key
- amount DECIMAL - Booking price
- referrer_profile_id UUID - For commission attribution
- agent_profile_id UUID - For agent-led bookings
```

**transactions** (Complete Financial Records)
```sql
Core Fields:
- id UUID PRIMARY KEY
- profile_id UUID - Beneficiary (NULL for platform fees)
- booking_id UUID - Related booking
- type TEXT - Transaction type (7 types)
- description TEXT
- amount DECIMAL
- status transaction_status_enum - clearing/available/paid_out/disputed/refunded
- available_at TIMESTAMPTZ - When funds become available

Context Fields (v4.9 - Migration 107):
- service_name TEXT - Snapshot of service
- subjects TEXT[] - Subject categories
- session_date TIMESTAMPTZ - Session start
- location_type TEXT - online/in_person/hybrid
- tutor_name TEXT - Tutor display name
- client_name TEXT - Client display name
- agent_name TEXT - Agent name (Migration 110)

Stripe Integration:
- stripe_payout_id TEXT - Payout tracking
```

**failed_webhooks** (Dead-Letter Queue)
```sql
- event_id TEXT
- event_type TEXT
- status TEXT
- error_message TEXT
- payload JSONB
- booking_id UUID
- created_at TIMESTAMPTZ
```

## Commission Split Logic

### Direct Booking (90/10)
```
Total: £100
- Tutor Payout: £90 (90%)
- Platform Fee: £10 (10%)
```

### Referred Booking (80/10/10)
```
Total: £100
- Tutor Payout: £80 (80%)
- Referrer Commission: £10 (10%)
- Platform Fee: £10 (10%)
```

### Agent-Led Booking (70/20/10 or 60/20/10/10)
```
With Agent (no referrer):
Total: £100
- Tutor Payout: £70 (70%)
- Agent Commission: £20 (20%)
- Platform Fee: £10 (10%)

With Agent + Referrer:
Total: £100
- Tutor Payout: £60 (60%)
- Agent Commission: £20 (20%)
- Referrer Commission: £10 (10%)
- Platform Fee: £10 (10%)
```

## Transaction Types

1. **Booking Payment** - Client pays (negative amount)
2. **Tutoring Payout** - Tutor receives payment
3. **Referral Commission** - Referrer commission (10%)
4. **Agent Commission** - Agent commission (20%)
5. **Platform Fee** - Platform revenue (10%)
6. **Withdrawal** - Payout to bank account
7. **Refund** - Refund transaction

## Transaction Statuses (v4.9)

1. **clearing** - Funds held during 7-day fraud protection period
2. **available** - Ready for withdrawal
3. **paid_out** - Withdrawn to bank account
4. **disputed** - Under chargeback dispute
5. **refunded** - Refunded to customer

## Key Workflows

### 1. Add Payment Method Flow
```
User clicks "Add Card" → Create checkout session (setup mode) →
Redirect to Stripe → User enters card → Success redirect with customer_id →
Frontend polls verify endpoint → Card appears in list
```

### 2. Booking Payment Flow
```
User books session → Create checkout session (payment mode) →
Redirect to Stripe → User pays → Webhook: checkout.session.completed →
RPC: handle_successful_payment() →
Split commissions (tutor, referrer, agent, platform) →
Set clearing period (7 days from session end) →
Update booking payment_status to 'Paid'
```

### 3. Payout Flow
```
Tutor has available balance → Request withdrawal →
Create Stripe payout → Webhook: payout.paid →
Update transaction status to 'paid_out' →
Funds arrive in bank account (2-5 days)
```

### 4. Clearing Period Flow
```
Booking completed → Transaction created with status='clearing' →
available_at = session_date + 7 days →
After clearing period → Status: available →
Funds eligible for payout
```

### 5. Webhook Processing with DLQ
```
Stripe sends webhook → Verify signature →
Process event → Success: Return 200 →
Failure: Log to failed_webhooks (DLQ) → Return 200 to prevent retries →
Manual review and retry from DLQ
```

## Webhook Events Handled

1. **checkout.session.completed** - Process booking payment via RPC
2. **payment_intent.payment_failed** - Update booking to failed
3. **payout.paid** - Mark transaction as paid_out
4. **payout.failed** - Create reversal transaction
5. **payout.canceled** - Create reversal transaction
6. **payout.updated** - Update clearing/in_transit status

## Integration Points

- **Stripe**: Payment processing, Connect accounts, payouts
- **Bookings**: Payment status tracking
- **Profiles**: Customer and account IDs
- **Financials**: Transaction history and analytics
- **Referrals**: Commission attribution
- **Supabase RPC**: Atomic payment processing

## Security Features

1. **Webhook Signature Validation** - Verify Stripe signatures
2. **Idempotency** - stripe_checkout_id unique constraint
3. **Ownership Verification** - Metadata checks on verify endpoints
4. **Authentication** - Supabase Auth on all routes
5. **Dead-Letter Queue** - Error resilience without data loss
6. **RPC Atomicity** - All-or-nothing transaction processing

## Recent Changes (v4.9)

### Transaction Context Fields (Migration 107, 109, 110)
- Added 7 snapshot fields to preserve booking context
- Prevents data loss if booking/listing is deleted
- Enables rich transaction history display

### Clearing Periods (Migration 057)
- 7-day default clearing period from session end
- `transaction_status_enum` for status tracking
- `available_at` timestamp for withdrawal eligibility

### Idempotency (Migration 056)
- `stripe_checkout_id` column in bookings table
- Prevents duplicate payment processing
- Unique constraint enforcement

### DLQ Error Handling
- `failed_webhooks` table for error logging
- Prevents webhook retries on known failures
- Manual review and retry capability

## Stripe Configuration

### Environment Variables
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxxxx
NEXT_PUBLIC_ENABLE_STRIPE=false  # Feature flag
```

### Dependencies
- `@stripe/react-stripe-js@^2.9.0` - React components
- `@stripe/stripe-js@^3.5.0` - Client library
- `stripe@latest` - Server SDK

## Testing

**Test File**: [apps/web/tests/api/stripe-webhook.test.ts](../../../apps/web/tests/api/stripe-webhook.test.ts)

**Coverage**:
- Checkout session completion
- Missing booking_id validation
- DLQ logging on RPC failure
- Payment failure handling
- Webhook signature validation
- Unhandled event types

## Migration History

| File | Version | Purpose |
|------|---------|---------|
| 030 | v3.6 | Core payment webhook RPC |
| 056 | v4.9 | Add stripe_checkout_id for idempotency |
| 057 | v4.9 | Transaction status enum + clearing periods |
| 107 | v4.9 | Add transaction context fields |
| 109 | v4.9 | Update RPC with context snapshotting |
| 110 | v4.9 | Add agent_name to transactions |
| 111 | v4.9 | Update RPC with agent name support |

## Status

- [x] Solution design v4.9 complete
- [x] Implementation guide complete
- [x] AI prompt context complete
- [x] Stripe integration documented
- [x] Commission logic documented
- [x] Webhook handling documented
- [x] DLQ system documented

---

**Last Updated**: 2025-12-12
**Version**: v4.9 (Transaction Context Fields)
**Architecture**: Stripe + Supabase RPC
**For Questions**: See [implementation.md](./implementation.md)

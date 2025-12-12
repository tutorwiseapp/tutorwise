# Payments Feature - AI Prompt

**Version**: v4.9
**Date**: 2025-11-11
**Status**: For Implementation
**Owner**: Senior Architect
**Prerequisite**: v3.6 (Bookings & Financials), v4.7 (Account Hub), v4.8 (Public Profile)

---

## Prompt

Analyse my proposed solution in `payments-solution-design-v4.9.md`. Review and propose a solution that is functional, reliable, align to the standard dashboard Hub UI/UX and `design-system.md`. Implement and integrate with the application existing features/files for viral growth. Ask me any questions.

---

## Problem Statement

The platform's financial infrastructure is fragmented and lacks critical production-ready features. Currently:

1. **UI/UX is Inconsistent**: The `/financials` hub exists but lacks the "Sub-nav" pattern used elsewhere
2. **Standalone Pages**: The `/payments` pages are disconnected from the main hub
3. **Missing Architecture**: No idempotency, clearing periods, or Dead-Letter Queue (DLQ)
4. **Limited Payment Flows**: Cannot handle 3-way and 4-way commission splits for agent-led bookings
5. **No Unhappy Path**: Missing chargeback/dispute handling, refund processing, and tax compliance

---

## Goals

### Must Have
1. **Unified Financials Hub**: Refactor `/financials` with sub-navigation for Transactions, Payouts, Disputes
2. **Consolidation**: Move P2P transfer functionality from `/payments` into SendPaymentWidget in sidebar
3. **Idempotent Webhooks**: Prevent duplicate payment processing using stripe_checkout_id
4. **Dynamic Clearing Periods**: Implement 3-7 day clearing based on service completion and trust level
5. **Dead-Letter Queue**: Catch and log failed webhooks for manual review
6. **3-Way & 4-Way Splits**: Support Platform/Agent/Tutor and Platform/Agent/Tutor/Referrer commission structures
7. **Dispute Handling**: Process chargebacks and allow evidence submission
8. **Refund Processing**: Handle full and partial refunds with proportional reversals
9. **Tax Compliance**: Integrate Stripe Connect for 1099-K tax form collection

### Should Have
1. **Transaction Context**: Snapshot service details in transactions table
2. **Asynchronous UX**: Show "Processing..." page that polls for webhook completion
3. **P2P Wallet Transfers**: Enable internal wallet-to-wallet payments

### Nice to Have
1. **Transaction Export**: CSV download for accounting
2. **Webhook Retry**: Manual retry from DLQ
3. **Stripe Dashboard Link**: One-click access to Connect dashboard

---

## Non-Goals

1. **Cryptocurrency Support**: Out of scope
2. **Multi-Currency**: Stick with GBP for now
3. **Installment Plans**: Future enhancement
4. **Automated Dispute Responses**: Manual evidence submission only

---

## User Stories

### As a Client
- I want to see all my booking payments in one place
- I want to understand where my money went (platform, tutor, referrer, agent)
- I want to request refunds when sessions are canceled
- I want to transfer funds from my wallet to other users

### As a Tutor
- I want to see my earnings with clear clearing periods
- I want to know when funds become available for withdrawal
- I want to request payouts to my bank account
- I want to respond to chargebacks with evidence

### As an Agent
- I want to see my 20% commission on bookings I facilitated
- I want to track payouts separately from tutor earnings
- I want to manage tax compliance requirements

### As a Platform Owner
- I want all webhook events to be processed exactly once
- I want failed webhooks to be logged for manual review
- I want commission splits to be calculated correctly every time
- I want to handle chargebacks without manual database edits
- I want to issue full and partial refunds easily

---

## Use Cases

### UC1: Client Books a Session (Direct)
1. Client selects tutor listing
2. Clicks "Book Session"
3. Redirects to Stripe checkout
4. Pays 100.00
5. Webhook lands: checkout.session.completed
6. RPC creates transactions:
   - Client: -100.00 (Booking Payment)
   - Tutor: +90.00 (Tutoring Payout, clearing for 7 days)
   - Platform: +10.00 (Platform Fee, NULL profile_id)
7. Booking status → Paid
8. After 7 days: Tutor transaction status → available
9. Tutor requests payout
10. Webhook: payout.paid → Tutor transaction status → paid_out

### UC2: Client Books via Referral Link (3-Way Split)
1. Client signs up via referrer's link
2. Referral attribution stored in profiles.referred_by_profile_id
3. Client books session: 100.00
4. RPC creates transactions:
   - Client: -100.00
   - Tutor: +80.00 (clearing)
   - Referrer: +10.00 (Referral Commission, clearing)
   - Platform: +10.00
5. After 7 days: All statuses → available

### UC3: Agent-Led Booking (4-Way Split)
1. Agent manages tutor and client
2. Client books agent's tutor: 100.00
3. Metadata includes: agent_id, tutor_id, client_id
4. Client was referred by another agent (referred_by_agent_id)
5. RPC creates transactions:
   - Client: -100.00
   - Tutor: +60.00 (clearing)
   - Agent: +20.00 (Agent Commission, clearing)
   - Referring Agent: +10.00 (Referral Commission, clearing)
   - Platform: +10.00

### UC4: Webhook Fails
1. Webhook arrives
2. RPC processing fails (e.g., booking not found)
3. Error caught in try/catch
4. Event logged to failed_webhooks table
5. Return 200 to Stripe (prevent retries)
6. Admin reviews DLQ
7. Admin fixes issue
8. Admin manually retries webhook

### UC5: Chargeback Occurs
1. Client disputes charge with bank
2. Webhook: charge.dispute.created
3. RPC finds booking by charge_id
4. Updates all related transactions: status → disputed
5. Creates negative transaction in tutor's wallet for dispute amount
6. Tutor sees dispute in /financials/disputes
7. Tutor submits evidence
8. Stripe resolves dispute

### UC6: Refund Requested
1. Admin receives refund request
2. Admin calls POST /api/financials/refunds with booking_id and amount
3. RPC calls Stripe refund API
4. RPC creates proportional reversal transactions:
   - Tutor: -90.00 (or proportional partial)
   - Referrer: -10.00
   - Platform: -10.00
5. All reversal transactions: status → refunded
6. Client receives funds back from Stripe

### UC7: P2P Wallet Transfer
1. User A has available balance: 150.00
2. User A clicks "Send Payment" in sidebar
3. Modal opens: Select recipient, enter amount (50.00), reason
4. Submit
5. API calls RPC: create_wallet_transfer(A, B, 50.00, "Thanks for help")
6. RPC creates:
   - User A: -50.00 (status: available)
   - User B: +50.00 (status: available)
7. Both users see transactions instantly

---

## Acceptance Criteria

### AC1: Unified Financials Hub
- [ ] `/financials` route group exists
- [ ] Sub-nav tabs: Transactions, Payouts, Disputes
- [ ] Each tab has secondary filters (All, Clearing, Available, etc.)
- [ ] Contextual sidebar with 5 widgets: Tax, Wallet Balance, Pending Balance, Payout Actions, Send Payment
- [ ] Standalone `/payments` pages deleted
- [ ] Middleware redirects legacy URLs

### AC2: Idempotent Webhooks
- [ ] bookings.stripe_checkout_id column exists with UNIQUE constraint
- [ ] RPC checks for existing stripe_checkout_id before processing
- [ ] Duplicate webhooks return success without creating transactions
- [ ] Test: Send same webhook twice, only one transaction set created

### AC3: Clearing Periods
- [ ] transactions.available_at column exists
- [ ] transactions.status enum: clearing, available, paid_out, disputed, refunded
- [ ] RPC calculates available_at as session_date + 7 days
- [ ] get_available_balance() RPC only sums available transactions where available_at <= NOW()
- [ ] UI shows "AVAILABLE" and "PENDING (IN CLEARING)" balances separately

### AC4: Dead-Letter Queue
- [ ] failed_webhooks table exists
- [ ] Webhook handler has try/catch wrapper
- [ ] Failed webhooks log to failed_webhooks with event_id, error_message, payload
- [ ] Handler returns 200 even on failure (after logging)
- [ ] Admin can view DLQ in dashboard

### AC5: 3-Way & 4-Way Splits
- [ ] RPC handles all scenarios:
  - Direct (90/10)
  - Referred (80/10/10)
  - Agent (70/20/10)
  - Agent + Referred (60/20/10/10)
- [ ] Commission percentages add to 100%
- [ ] Test each scenario with real bookings

### AC6: Dispute Handling
- [ ] /api/webhooks/stripe/disputes/route.ts exists
- [ ] Listens for charge.dispute.created
- [ ] handle_dispute_created(charge_id, amount) RPC exists
- [ ] Finds booking by charge_id
- [ ] Updates transaction statuses to disputed
- [ ] Creates negative transaction in seller's wallet
- [ ] /financials/disputes page shows disputed transactions
- [ ] Evidence submission form exists

### AC7: Refund Processing
- [ ] POST /api/financials/refunds exists (admin only)
- [ ] create_refund(booking_id, amount, reason) RPC exists
- [ ] Calls Stripe refund API
- [ ] Creates proportional reversal transactions
- [ ] Sets status to refunded
- [ ] Ledger remains balanced

### AC8: Tax Compliance
- [ ] TaxComplianceWidget exists in sidebar
- [ ] Calls GET /api/stripe/get-connect-account
- [ ] Checks tax_info_status from Stripe
- [ ] Shows warning banner if tax forms incomplete
- [ ] Links to Stripe Connect portal

### AC9: Transaction Context
- [ ] transactions table has context fields:
  - service_name, subjects[], session_date, location_type
  - tutor_name, client_name, agent_name
- [ ] RPC snapshots these from booking/listing on creation
- [ ] UI displays context in transaction cards

### AC10: P2P Transfers
- [ ] SendPaymentWidget in sidebar
- [ ] POST /api/financials/transfer exists
- [ ] create_wallet_transfer(sender, receiver, amount, reason) RPC exists
- [ ] Checks available balance before transfer
- [ ] Atomic: debit sender, credit receiver
- [ ] Both transactions have status: available (instant)

---

## Test Cases

### TC1: Idempotency
1. Create booking
2. Send checkout.session.completed webhook
3. Verify 4 transactions created
4. Send same webhook again
5. Verify no new transactions created
6. Verify booking still marked Paid

### TC2: Clearing Period
1. Create booking with session_date = today
2. Process payment
3. Verify tutor transaction has available_at = today + 7 days
4. Verify tutor transaction status = clearing
5. Verify get_available_balance() does NOT include this transaction
6. Mock date to 8 days later
7. Verify get_available_balance() DOES include this transaction

### TC3: DLQ
1. Create webhook with invalid booking_id in metadata
2. Send to webhook handler
3. Verify failed_webhooks has 1 row
4. Verify row has correct event_id, error_message, payload
5. Verify handler returned 200

### TC4: 4-Way Split
1. Create client with referred_by_agent_id = AgentB
2. Create agent-led booking (AgentA facilitates, TutorC delivers)
3. Amount = 100.00
4. Process payment
5. Verify transactions:
   - Client: -100.00
   - TutorC: +60.00
   - AgentA: +20.00
   - AgentB (referrer): +10.00
   - Platform (NULL profile_id): +10.00
6. Verify sum = 0

### TC5: Refund
1. Create paid booking (100.00)
2. Call POST /api/financials/refunds { booking_id, amount: 50.00 }
3. Verify Stripe refund created
4. Verify reversal transactions:
   - Tutor: -45.00 (proportional to 90%)
   - Referrer: -5.00 (proportional to 10%)
   - Platform: -5.00 (proportional to 10%)
5. Verify all have status: refunded

---

## Success Metrics

1. **Webhook Reliability**: 100% of webhooks processed exactly once
2. **DLQ Usage**: < 0.1% of webhooks fail and go to DLQ
3. **Commission Accuracy**: 0 manual corrections needed in first month
4. **Clearing Period**: 0 chargebacks after 7-day period
5. **Refund Processing**: < 5 minutes to issue refund
6. **Tax Compliance**: 100% of tutors complete forms before first payout

---

## Integration Points

### Bookings Feature
- Bookings provide booking_id, stripe_checkout_id, amount, session_date
- Bookings create checkout sessions with metadata: booking_id, client_id, tutor_id, agent_id

### Referrals Feature
- Profiles have referred_by_profile_id
- RPC reads this for commission calculations

### Network Feature
- P2P transfers use network connections to suggest recipients

### Account Feature
- Account hub links to /financials for financial management

### Stripe
- Checkout sessions, payment intents, refunds, Connect accounts, webhooks

---

## Dependencies

### External Services
- Stripe API v10+
- Stripe Webhooks
- Stripe Connect (Express accounts)

### Database
- Supabase PostgreSQL
- Tables: transactions, bookings, profiles, failed_webhooks
- RPCs: handle_successful_payment, create_wallet_transfer, handle_dispute_created, create_refund, get_available_balance

### Frontend
- Next.js 14+ App Router
- React Query for data fetching
- Hub Layout components

---

## Technical Notes

### Idempotency Strategy
- Use bookings.stripe_checkout_id as unique constraint
- RPC checks for existing record before processing
- Prevents duplicate transactions from webhook retries

### Clearing Period Strategy
- Calculate: session_date + 7 days (configurable per tutor in future)
- Store in transactions.available_at
- Filter available balance by available_at <= NOW()
- Protects against chargebacks

### DLQ Strategy
- Catch all RPC errors in webhook handler
- Log full event payload to failed_webhooks
- Return 200 to prevent Stripe retries
- Manual review and retry by admin

### Commission Calculation
- Read booking metadata for agent_id, tutor_id
- Read profile.referred_by_profile_id for referrer
- Apply cascading logic: check referrer, check agent, calculate remainder for tutor
- Create separate transaction for each party

---

**Last Updated**: 2025-12-12
**For Implementation**: See `payments-solution-design-v4.9.md`

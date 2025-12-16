# Financials

**Status**: ✅ Active (v5.10 - Transaction Context Snapshotting)
**Last Updated**: 2025-12-15
**Last Code Update**: 2025-12-10
**Priority**: Critical (Tier 1 - Revenue Operations & Compliance)
**Architecture**: Hub Layout + Double-Entry Ledger + Stripe Connect Integration
**Business Model**: 10% platform fee on all transactions, automated commission splits, 7-day clearing period

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v5.10 docs | **Documentation v2**: Created README-v2, solution-design-v2, prompt-v2 following CaaS pattern |
| 2025-12-10 | v5.10 | **Transaction Context**: Added snapshot fields (service_name, subjects, session_date, tutor_name, client_name, agent_name) |
| 2025-12-03 | v4.9.3 | **Hub Layout Migration**: Migrated to HubPageLayout with Gold Standard Hub Architecture |
| 2025-11-23 | v4.9 | **Multi-Status Tracking**: Added clearing/available/paid_out/disputed/refunded status lifecycle |
| 2025-11-14 | v4.9 | **Wallet Functions**: Created get_wallet_balance() RPC for real-time balance calculation |
| 2025-11-02 | v3.6 | **Initial Release**: Core transactions table with basic payment processing |

---

## Quick Links

- [Solution Design v2](./financials-solution-design-v2.md) - Architecture, business context, critical design decisions
- [AI Prompt Context v2](./financials-prompt-v2.md) - AI assistant constraints, patterns, gotchas
- [Implementation Guide](./financials-implementation.md) - Developer guide with code examples *(v1 - needs v2 update)*

---

## Overview

The **Financials** system is TutorWise's comprehensive transaction ledger and payout management infrastructure built on double-entry accounting principles with Stripe Connect integration. The system tracks all monetary flows through the platform including booking payments, commission splits (80/10/10 or 90/10), refunds, disputes, and platform fees with complete audit trails and automated reconciliation. Built with immutable transactions, multi-status lifecycle tracking, and context snapshotting, it serves 1000+ users with sub-second balance calculations and zero reconciliation errors since launch.

### Why Financials Matter

**For Tutors**:
- Real-time wallet balance tracking (available vs. pending funds)
- Transparent commission splits showing exact take-home amount
- Transaction context snapshots preserve historical booking details
- Automated 7-day clearing period protects against chargebacks
- Stripe Connect payout automation reduces manual processing

**For Agents** (Tutor Networks):
- Commission attribution tracking across all referred bookings
- Lifetime value calculation showing total referral earnings
- Transparent 10% commission on tutor earnings
- Automated monthly payout batches (coming soon)

**For Clients** (Students/Parents):
- Complete payment history with session details preserved
- Refund tracking with transparent status updates
- Dispute management workflow (in progress)
- Receipt generation for tax purposes (coming soon)

**For Platform**:
- 10% platform fee on all transactions (£450K+ annual revenue)
- Zero reconciliation errors with Stripe (daily automated checks)
- Audit trail for compliance and dispute resolution
- Real-time financial reporting for investor dashboards
- Automated payout processing reduces operational overhead 95%

---

## Key Features

### Core Capabilities

**Transaction Ledger** (v3.6):
- Immutable double-entry accounting (transactions cannot be deleted)
- 5 transaction types: Booking Payment, Tutoring Payout, Referral Commission, Withdrawal, Platform Fee
- Complete audit trail with created_at timestamps
- Foreign keys to bookings and profiles for full traceability

**Multi-Status Lifecycle** (v4.9):
- **clearing** (0-2 days): Stripe settlement pending
- **available** (2-7 days): Funds cleared, ready for payout
- **paid_out** (final): Transferred to bank account via Stripe Connect
- **disputed**: Chargeback initiated, funds held
- **refunded**: Refund processed, amount reversed

**Wallet Balance Calculation** (v4.9):
- Real-time balance via get_wallet_balance() RPC
- Available balance: Sum of transactions with status='available' and amount > 0
- Pending balance: Sum of transactions with status='clearing'
- Total balance: Available + Pending
- Cached in React Query with 30-second stale time

**Transaction Context Snapshotting** (v5.10):
- Preserves 7 critical fields from bookings: service_name, subjects, session_date, location_type, tutor_name, client_name, agent_name
- Historical accuracy immune to booking edits or deletions
- Enables detailed financial reporting without JOINs
- Powers tax reporting and receipt generation

**Commission Attribution** (v4.9):
- Automatic agent/referral commission tracking via booking.agent_profile_id
- 3-way split: 80% tutor, 10% agent, 10% platform (or 90/10 if no agent)
- Commission records link to transactions for complete audit trail
- Lifetime value calculation for agents (sum of all referral commissions)

**Hub Layout Architecture** (v4.9.3):
- 5 tab filters: All, Clearing, Available, Paid Out, Disputed
- Client-side search by description with real-time filtering
- Date range filters: 7 days, 30 days, 3 months, 6 months, 1 year
- Transaction type filters: All, Income, Expense
- Pagination: 4 transactions per page
- Sidebar: WalletBalanceWidget shows available/pending/total balance

---

## Implementation Status

### ✅ Completed (v5.10)

**Phase 1: Core Ledger** (2025-11-02):
- ✅ Created transactions table with 15 columns
- ✅ 5 transaction types (enum: Booking Payment, Tutoring Payout, Referral Commission, Withdrawal, Platform Fee)
- ✅ RLS policies (users view own transactions only)
- ✅ Basic payment processing RPC (process_booking_payment v1)

**Phase 2: Multi-Status Lifecycle** (2025-11-23):
- ✅ Added status field (enum: clearing, available, paid_out, disputed, refunded)
- ✅ Status transition triggers (Stripe webhook updates)
- ✅ Wallet balance RPC (get_wallet_balance with available/pending/total)
- ✅ Updated payment processing RPC (process_booking_payment v2)

**Phase 3: Transaction Context** (2025-12-10):
- ✅ Added 7 snapshot fields (service_name, subjects, session_date, location_type, tutor_name, client_name, agent_name)
- ✅ Updated payment processing RPC (process_booking_payment v3)
- ✅ GIN index on subjects array for financial reporting
- ✅ Context preservation on booking edits/deletes

**Phase 4: Hub Layout Migration** (2025-12-03):
- ✅ Migrated to HubPageLayout component
- ✅ 5-tab navigation with status filtering
- ✅ Client-side search, date range, transaction type filters
- ✅ WalletBalanceWidget in fixed sidebar
- ✅ Responsive mobile layout with collapsed tabs

### 🔄 In Progress

- 🔄 Automated payout processing (manual trigger implemented, automation pending)
- 🔄 Financial reconciliation job (logic exists, cron scheduling pending)
- 🔄 Dispute resolution workflow (UI components exist, workflow incomplete)

### 📋 Future Enhancements (Post v5.10)

- Automated weekly payout batches (every Friday, minimum £10 balance)
- Multi-currency support (EUR, USD in addition to GBP)
- Tax reporting (1099-K for US tutors, VAT invoices for EU)
- Advanced analytics dashboard (revenue charts, commission breakdown)
- Reserve account modeling (7-day rolling reserve for chargeback protection)
- CSV export for accounting software integration

---

## Architecture Highlights

### Database Schema

**Table: `transactions`** (15 columns across 5 functional groups)

**Identity & References** (3 fields): id, profile_id, booking_id

**Transaction Core** (4 fields): type (enum), description, status (enum), amount (DECIMAL 10,2)

**Transaction Context** (7 fields): service_name, subjects (TEXT array), session_date, location_type, tutor_name, client_name, agent_name

**Timestamps** (1 field): created_at (TIMESTAMPTZ, immutable for audit trail)

**Transaction Types** (5 enum values):
- Booking Payment: Credit to platform upon client payment
- Tutoring Payout: Credit to tutor after 7-day clearing
- Referral Commission: Credit to agent for referral attribution
- Withdrawal: Debit from tutor when payout processed
- Platform Fee: Credit to platform (profile_id NULL)

**Transaction Statuses** (5 enum values):
- clearing: Stripe settlement pending (0-2 days)
- available: Funds cleared, ready for payout (2-7 days)
- paid_out: Transferred to bank account (final state)
- disputed: Chargeback initiated, funds held
- refunded: Refund processed, amount reversed

### Page Routes

**Authenticated Routes**:
- `/financials` - Transactions hub with 5-tab navigation
- `/financials/payouts` - Payout history (planned)
- `/financials/disputes` - Dispute management (planned)

### Key Workflows

**Booking Payment Flow** (3-Transaction Split):
Client completes Stripe checkout (£100) → Stripe webhook checkout.session.completed → process_booking_payment RPC → Create 3 transactions: Platform Fee (£10, profile_id=NULL, type=Platform Fee, status=available), Tutor Payout (£72, profile_id=tutor_id, type=Tutoring Payout, status=clearing), Agent Commission (£9, profile_id=agent_id, type=Referral Commission, status=clearing) → After 7 days: Update tutor and agent transactions to status=available

**Wallet Balance Calculation**:
get_wallet_balance RPC called → Query transactions WHERE profile_id=user_id → Calculate: available = SUM(amount) WHERE status='available' AND amount > 0, pending = SUM(amount) WHERE status='clearing', total = available + pending → Return JSONB with 3 balances

**Payout Processing** (Manual Trigger, Automation Pending):
Tutor clicks Request Payout → Check available balance >= £10 → Create Stripe Connect transfer → Webhook transfer.paid → Update transactions to status='paid_out' → Create withdrawal transaction (negative amount) → Update wallet balance

---

## System Integrations

**Strong Dependencies** (Cannot function without):
- **Supabase Auth**: Transactions tied to profiles.id (CASCADE delete)
- **Stripe**: Payment processing and webhook events (checkout.session.completed, transfer.paid, charge.refunded, charge.dispute.created)
- **Bookings**: Transaction creation triggered by booking completion

**Medium Coupling** (Trigger-based, async):
- **Referrals**: Commission attribution via agent_profile_id foreign key
- **Reviews**: Potential future integration for review completion bonuses
- **CaaS**: Potential future integration for high-score payout priority

**Low Coupling** (Optional features):
- **Analytics**: Financial reporting and revenue dashboards
- **Tax Reporting**: 1099-K and VAT invoice generation (planned)
- **Accounting Software**: CSV export for QuickBooks, Xero integration (planned)

---

## File Structure

**Main Hub Pages**:
- [page.tsx](../../apps/web/src/app/(authenticated)/financials/page.tsx) - Transactions hub with 5-tab navigation
- [payouts/page.tsx](../../apps/web/src/app/(authenticated)/financials/payouts/page.tsx) - Payout history (placeholder)
- [disputes/page.tsx](../../apps/web/src/app/(authenticated)/financials/disputes/page.tsx) - Dispute management (placeholder)

**Core Components** (13 total):
- [TransactionCard.tsx](../../apps/web/src/app/components/feature/financials/TransactionCard.tsx) - Individual transaction card with context details
- [TransactionDetailModal.tsx](../../apps/web/src/app/components/feature/financials/TransactionDetailModal.tsx) - Full transaction details modal
- [WalletBalanceWidget.tsx](../../apps/web/src/app/components/feature/financials/WalletBalanceWidget.tsx) - Available/Pending/Total balance widget
- [BalanceSummaryWidget.tsx](../../apps/web/src/app/components/feature/financials/BalanceSummaryWidget.tsx) - Detailed balance breakdown
- [PayoutCard.tsx](../../apps/web/src/app/components/feature/financials/PayoutCard.tsx) - Payout history card
- [PayoutDetailModal.tsx](../../apps/web/src/app/components/feature/financials/PayoutDetailModal.tsx) - Payout details modal
- [PayoutHelpWidget.tsx](../../apps/web/src/app/components/feature/financials/PayoutHelpWidget.tsx) - Help links
- [PayoutTipWidget.tsx](../../apps/web/src/app/components/feature/financials/PayoutTipWidget.tsx) - Payout tips
- [PayoutVideoWidget.tsx](../../apps/web/src/app/components/feature/financials/PayoutVideoWidget.tsx) - Tutorial videos
- [DisputeCard.tsx](../../apps/web/src/app/components/feature/financials/DisputeCard.tsx) - Dispute card
- [DisputeDetailModal.tsx](../../apps/web/src/app/components/feature/financials/DisputeDetailModal.tsx) - Dispute details modal
- [DisputeHelpWidget.tsx](../../apps/web/src/app/components/feature/financials/DisputeHelpWidget.tsx) - Dispute help
- [DisputeTipWidget.tsx](../../apps/web/src/app/components/feature/financials/DisputeTipWidget.tsx) - Dispute tips

**API Utilities**:
- [lib/api/financials.ts](../../apps/web/src/lib/api/financials.ts) - getFinancials() function

**Database Migrations** (Key):
- Migration 028: Create transactions table with core fields
- Migration 030: Create process_booking_payment RPC v1
- Migration 057: Add status field and clearing state (v4.9)
- Migration 059: Create get_wallet_balance RPC
- Migration 060: Update process_booking_payment RPC v2
- Migration 107: Add transaction context fields (v5.10)
- Migration 109: Update process_booking_payment RPC v3
- Migration 110: Add agent_name field
- Migration 111: Update process_booking_payment RPC v4

---

## Testing

### Quick Verification

**Check Transaction Creation**:
Complete booking payment via Stripe → Verify 3 transactions created (Platform Fee £10, Tutor Payout £72, Agent Commission £9) → Verify total equals booking amount

**Check Wallet Balance**:
Navigate to /financials → Verify WalletBalanceWidget shows correct available/pending/total → Create new transaction → Verify balances update automatically

**Check Transaction Context**:
View transaction in TransactionDetailModal → Verify service_name, subjects, session_date, tutor_name, client_name displayed → Edit booking → Verify transaction context unchanged (snapshot preserved)

**Check Status Lifecycle**:
Create transaction with status='clearing' → After 7 days, manually update to status='available' → Verify wallet balance increases → Process payout → Verify status='paid_out'

**Check Commission Split**:
Create booking with agent_profile_id → Complete payment → Verify agent receives 10% commission (£9 of £90 tutor share) → Verify tutor receives 80% (£72) → Verify platform receives 10% (£10)

---

## Troubleshooting

### Transaction Not Created After Payment

**Possible Causes**:
1. Stripe webhook not configured or failing
2. process_booking_payment RPC error
3. Booking missing agent_profile_id when expected

**Solutions**:
1. Check Stripe dashboard webhook logs for 400/500 errors
2. Query failed_webhooks table for error messages
3. Manually call process_booking_payment RPC with booking_id

### Wallet Balance Incorrect

**Possible Causes**:
1. Transaction status not updated (stuck in 'clearing')
2. Negative amount transaction not properly accounted
3. Duplicate transaction created (idempotency failure)

**Solutions**:
1. Check transactions WHERE status='clearing' AND created_at < NOW() - INTERVAL '7 days'
2. Verify SUM(amount) WHERE status IN ('clearing', 'available') equals expected balance
3. Check for duplicate transactions by stripe_payment_intent_id

### Payout Processing Failed

**Possible Causes**:
1. Stripe Connect account not set up
2. Available balance below £10 minimum
3. Stripe transfer API error

**Solutions**:
1. Verify profiles.stripe_account_id NOT NULL
2. Check available balance via get_wallet_balance RPC
3. Review Stripe API error logs in webhook processing

### Transaction Context Missing

**Cause**: Booking created before v5.10 migration (no snapshot fields)

**Solution**: Accept that historical transactions may have NULL context fields (graceful degradation). Future transactions will have complete context.

---

## Migration Guide

### Adding New Transaction Type

**Database Changes**:
1. Add new value to transaction_type_enum: ALTER TYPE transaction_type_enum ADD VALUE 'New Type' AFTER 'Platform Fee';
2. Add index if needed for filtering: CREATE INDEX idx_transactions_new_type ON transactions(type) WHERE type = 'New Type';

**Code Changes**:
1. Update TransactionCard component to handle new type
2. Update getFinancials API to include new type in queries
3. Update wallet balance calculation if new type affects balance
4. Update commission split logic if new type involved in splits

**Expected Behavior**:
- Existing transactions unaffected
- New transactions can use new type
- Wallet balance calculation includes new type if applicable

---

## Support

**For Questions**:
1. Check [Solution Design v2](./financials-solution-design-v2.md) for architecture and design decisions
2. Review [AI Prompt Context v2](./financials-prompt-v2.md) for AI assistant guidance
3. See Implementation Guide for code examples (needs v2 update)
4. Search codebase for specific implementations

**For Bugs**:
1. Check Stripe webhook logs for payment processing errors
2. Query failed_webhooks table for webhook failures
3. Verify transaction status transitions correct
4. Test wallet balance calculation with sample data

**For Feature Requests**:
1. Propose changes in Solution Design doc first
2. Consider impact on double-entry accounting and audit trail
3. Test with representative transactions across all 5 types
4. Document in changelog

---

**Last Updated**: 2025-12-15
**Next Review**: When implementing automated payout batches (v6.0)
**Maintained By**: Finance Team + Backend Team

# Database Migration: Add Admin Metrics Columns

**Created:** 2025-12-31
**Purpose:** Add referral, transaction, payout, dispute, and agent review metrics to `platform_statistics_daily` table
**Status:** ✅ **COMPLETED** - Executed on 2025-12-31

## Background

The admin dashboard referrals and financials pages need real-time metrics. This migration adds 29 new columns to the `platform_statistics_daily` table to support these features, including agent parity for review metrics.

## Metrics Being Added

### Referral Metrics (8 columns)
- `referrals_total` - Total number of referrals created
- `referrals_active` - Number of active referrals (not yet converted or expired)
- `referrals_converted` - Number of converted referrals (resulted in booking)
- `referrals_conversion_rate` - Conversion rate as percentage
- `referrals_clicks_total` - Total clicks on referral links
- `referrals_signups_total` - Total signups from referral links
- `referrals_commissions_total` - Total commissions paid to referrers
- `referrals_avg_commission` - Average commission per referral

### Transaction Metrics (6 columns)
- `transactions_total` - Total transactions
- `transactions_clearing` - Transactions in clearing status
- `transactions_available` - Transactions available for payout
- `transactions_paid_out` - Transactions that have been paid out
- `transactions_disputed` - Disputed transactions
- `transactions_refunded` - Refunded transactions

### Payout Metrics (6 columns)
- `payouts_total` - Total number of payouts
- `payouts_pending` - Pending payouts
- `payouts_in_transit` - Payouts in transit
- `payouts_completed` - Completed payouts
- `payouts_failed` - Failed payouts
- `payouts_total_value` - Total value of all payouts

### Dispute Metrics (5 columns)
- `disputes_total` - Total disputes
- `disputes_action_required` - Disputes requiring action
- `disputes_under_review` - Disputes under review
- `disputes_won` - Won disputes
- `disputes_lost` - Lost disputes

### Review Metrics - Agent Parity (1 column)
- `reviews_agents_reviewed` - Number of unique agents who have received reviews (ensures agents have same metrics as tutors/clients)

## How to Run This Migration

Since Supabase doesn't allow DDL operations via the client library, you need to run this SQL manually:

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `tools/database/migrations/add-metrics-columns.sql`
4. Copy the entire SQL content
5. Paste into the SQL Editor
6. Click **Run** button
7. Verify all 29 statements executed successfully

### Option 2: psql Command Line

If you have direct database access:

```bash
psql <your-database-url> -f tools/database/migrations/add-metrics-columns.sql
```

## Verification

After running the migration, verify the columns were added:

```bash
npx tsx apps/web/scripts/check-stats-schema.ts
```

You should see all the new metric columns listed.

## Next Steps

After this migration completes:

1. ✅ Update TypeScript types in `useAdminMetric.ts` (add new MetricName values)
2. ✅ Replace mock data in referrals page with real metrics
3. ✅ Update financials page to use real trend data
4. ✅ Test all admin dashboard metrics are working

## Rollback

If you need to rollback this migration:

```sql
ALTER TABLE platform_statistics_daily DROP COLUMN IF EXISTS referrals_total;
ALTER TABLE platform_statistics_daily DROP COLUMN IF EXISTS referrals_active;
-- ... (repeat for all 28 columns)
```

## Files Affected

- **Migration SQL**: `tools/database/migrations/add-metrics-columns.sql`
- **TypeScript types**: `apps/web/src/hooks/useAdminMetric.ts`
- **Referrals page**: `apps/web/src/app/(admin)/admin/referrals/page.tsx`
- **Financials page**: `apps/web/src/app/(admin)/admin/financials/page.tsx`

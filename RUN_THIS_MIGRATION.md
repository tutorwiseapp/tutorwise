# ⚠️  IMPORTANT: Database Migration Required

**Action Required:** Run SQL migration to enable admin dashboard metrics

## What This Does

Adds 29 new columns to `platform_statistics_daily` table to support:
- Referral metrics (clicks, conversions, commissions)
- Transaction metrics (clearing, available, disputed, refunded)
- Payout metrics (pending, in transit, completed, failed)
- Dispute metrics (action required, under review, won, lost)
- Agent review metrics (ensuring agents have parity with tutors/clients)

## How to Run (2 minutes)

1. **Open Supabase Dashboard**
   - Go to your project at https://supabase.com/dashboard

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Execute Migration**
   - Copy the contents of: `tools/database/migrations/add-metrics-columns.sql`
   - Paste into SQL Editor
   - Click "Run" button

4. **Verify Success**
   - You should see ✅ Success message
   - Run: `npx tsx apps/web/scripts/check-stats-schema.ts` to verify

## Files Created

- `tools/database/migrations/add-metrics-columns.sql` - SQL migration
- `tools/database/MIGRATION_README.md` - Detailed documentation
- `tools/database/scripts/create-exec-sql-function.sql` - Optional helper function

## After Migration

The following pages will immediately start using real metrics:
- Admin > Referrals (8 new KPIs)
- Admin > Financials (6 existing KPIs now with data)

## Questions?

See `tools/database/MIGRATION_README.md` for full documentation.

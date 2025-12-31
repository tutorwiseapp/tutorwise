/**
 * Script to add referral, transaction, payout, and dispute metrics to platform_statistics_daily
 * Usage: npx tsx scripts/add-referral-metrics.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMetrics() {
  console.log('Adding new metrics to platform_statistics_daily table...\n');

  try {
    // Add referral metrics columns
    const referralMetrics = [
      'referrals_total',
      'referrals_active',
      'referrals_converted',
      'referrals_conversion_rate',
      'referrals_clicks_total',
      'referrals_signups_total',
      'referrals_commissions_total',
      'referrals_avg_commission',
    ];

    // Add transaction metrics columns
    const transactionMetrics = [
      'transactions_total',
      'transactions_clearing',
      'transactions_available',
      'transactions_paid_out',
      'transactions_disputed',
      'transactions_refunded',
    ];

    // Add payout metrics columns
    const payoutMetrics = [
      'payouts_total',
      'payouts_pending',
      'payouts_in_transit',
      'payouts_completed',
      'payouts_failed',
      'payouts_total_value',
    ];

    // Add dispute metrics columns
    const disputeMetrics = [
      'disputes_total',
      'disputes_action_required',
      'disputes_under_review',
      'disputes_won',
      'disputes_lost',
    ];

    const allMetrics = [
      ...referralMetrics,
      ...transactionMetrics,
      ...payoutMetrics,
      ...disputeMetrics,
    ];

    console.log(`Adding ${allMetrics.length} new columns...`);

    for (const metric of allMetrics) {
      const columnType = metric.includes('_rate') || metric.includes('_avg') ? 'real' : 'integer';

      console.log(`  Adding ${metric} (${columnType})`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE platform_statistics_daily ADD COLUMN IF NOT EXISTS ${metric} ${columnType} DEFAULT 0;`
      });

      if (error) {
        console.error(`  ❌ Error adding ${metric}:`, error.message);
      } else {
        console.log(`  ✅ Added ${metric}`);
      }
    }

    console.log('\n✅ All metrics added successfully!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

addMetrics();

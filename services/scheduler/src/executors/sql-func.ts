/**
 * Filename: services/scheduler/src/executors/sql-func.ts
 * Purpose: Execute a PostgreSQL function directly (e.g. cleanup_expired_slot_reservations)
 */

import { query } from '../db.js';
import { logger } from '../logger.js';
import type { ScheduledItem, ExecutorResult } from '../types.js';

// Allowlist of SQL functions that can be called — prevents SQL injection
const ALLOWED_FUNCTIONS = new Set([
  // Cleanup
  'cleanup_expired_slot_reservations',
  // Growth + intelligence metrics
  'compute_growth_scores',
  'compute_caas_platform_metrics',
  'compute_resources_platform_metrics',
  'compute_article_readiness_score',
  'compute_article_intelligence_scores',
  'compute_seo_platform_metrics',
  'compute_marketplace_platform_metrics',
  'compute_bookings_platform_metrics',
  'compute_listings_platform_metrics',
  'compute_listing_completeness_score',
  'compute_financials_platform_metrics',
  'compute_virtualspace_platform_metrics',
  'compute_referral_metrics',
  'compute_retention_platform_metrics',
  'compute_ai_adoption_platform_metrics',
  'compute_org_conversion_platform_metrics',
  'compute_ai_studio_platform_metrics',
  'compute_onboarding_platform_metrics',
  // Decision outcome measurement
  'measure_tutor_approval_outcomes',
  'measure_payout_outcomes',
  'measure_nudge_outcomes',
  // Subscription management
  'sage_pro_monthly_quota_reset',
  'sage_pro_file_cleanup',
  // Analytics aggregation
  'aggregate_daily_statistics',
  'aggregate_user_statistics',
  'aggregate_organisation_statistics',
  'refresh_profile_view_counts',
  'refresh_network_trust_metrics',
  // Referrals
  'refresh_referral_network_stats',
  'expire_stale_referrals',
  // Scheduler self-maintenance
  'cleanup_scheduler_runs',
]);

export async function executeSqlFunc(item: ScheduledItem): Promise<ExecutorResult> {
  const funcName = item.sql_function;
  if (!funcName) {
    throw new Error('No sql_function specified');
  }

  // Security: only allow known functions
  if (!ALLOWED_FUNCTIONS.has(funcName)) {
    throw new Error(`SQL function not in allowlist: ${funcName}`);
  }

  const start = Date.now();

  // Standard function call — only allowlisted functions
  await query(`SELECT ${funcName}()`);

  const durationMs = Date.now() - start;
  logger.info('sql_func_executed', { id: item.id, function: funcName, duration_ms: durationMs });

  return {
    success: true,
    result: { function: funcName, duration_ms: durationMs },
  };
}

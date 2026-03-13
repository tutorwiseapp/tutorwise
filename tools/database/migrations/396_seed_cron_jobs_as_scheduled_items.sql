-- Migration: 396_seed_cron_jobs_as_scheduled_items.sql
-- Purpose: Seed all existing pg_cron jobs as scheduled_items for visual management + future migration
-- Created: 2026-03-13
-- NOTE: Does NOT disable pg_cron jobs — both run in parallel. Cron routes have idempotency guards.
--       Phase 2 will unschedule pg_cron jobs one by one after verification.
-- IDEMPOTENCY: Uses WHERE NOT EXISTS guards since scheduled_items has no UNIQUE constraint on title.

-- ============================================================
-- HTTP CRON JOBS (type = 'cron_job')
-- ============================================================

-- Session reminders — hourly
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Session Reminders', 'cron_job', 'scheduled', now(), 'cron', '0 * * * *',
   '/api/cron/session-reminders', 'GET',
   '{"description": "Send 24h, 1h, and 15min session reminders", "migration": "215"}',
   ARRAY['cron', 'notifications', 'sessions'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Session Reminders');

-- Weekly reports — Monday 8am UTC
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Weekly Reports', 'cron_job', 'scheduled', now(), 'cron', '0 8 * * 1',
   '/api/cron/weekly-reports', 'GET',
   '{"description": "Send weekly activity reports to tutors and agents", "migration": "216"}',
   ARRAY['cron', 'notifications', 'reports'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Weekly Reports');

-- Process pending commissions — hourly at :15
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Process Pending Commissions', 'cron_job', 'scheduled', now(), 'cron', '15 * * * *',
   '/api/cron/process-pending-commissions', 'GET',
   '{"description": "Transition Pending to Available commissions after 7 days", "migration": "232"}',
   ARRAY['cron', 'financials', 'commissions'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Process Pending Commissions');

-- Process batch payouts — Friday 10am UTC
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Process Batch Payouts', 'cron_job', 'scheduled', now(), 'cron', '0 10 * * 5',
   '/api/cron/process-batch-payouts', 'GET',
   '{"description": "Weekly batch payout processor for referral commissions", "migration": "232"}',
   ARRAY['cron', 'financials', 'payouts'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Process Batch Payouts');

-- Expire guardian invitations — daily 3am UTC
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Expire Guardian Invitations', 'cron_job', 'scheduled', now(), 'cron', '0 3 * * *',
   '/api/cron/expire-invitations', 'GET',
   '{"description": "Expire old guardian invitation tokens", "migration": "251"}',
   ARRAY['cron', 'auth', 'invitations'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Expire Guardian Invitations');

-- EduPay clear pending — daily 6am UTC
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'EduPay Clear Pending', 'cron_job', 'scheduled', now(), 'cron', '0 6 * * *',
   '/api/cron/edupay-clear-pending', 'GET',
   '{"description": "Clear pending EP after 7-day clearing period", "migration": "259"}',
   ARRAY['cron', 'financials', 'edupay'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'EduPay Clear Pending');

-- CAS DSPy optimization — Sunday 2am UTC
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'CAS DSPy Weekly Optimization', 'cron_job', 'scheduled', now(), 'cron', '0 2 * * 0',
   '/api/cron/cas-dspy-optimize', 'POST',
   '{"description": "Weekly DSPy prompt optimization for Sage/Lexi", "migration": "326"}',
   ARRAY['cron', 'ai', 'optimization'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'CAS DSPy Weekly Optimization');

-- Complete sessions — hourly
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Complete Sessions', 'cron_job', 'scheduled', now(), 'cron', '0 * * * *',
   '/api/cron/complete-sessions', 'GET',
   '{"description": "Auto-complete bookings after session end time passes", "migration": ""}',
   ARRAY['cron', 'sessions', 'bookings'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Complete Sessions');

-- No-show detection — every 15 min
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'No-Show Detection', 'cron_job', 'scheduled', now(), 'cron', '*/15 * * * *',
   '/api/cron/no-show-detection', 'GET',
   '{"description": "Auto-detect and report potential no-shows for sessions", "migration": ""}',
   ARRAY['cron', 'sessions', 'attendance'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'No-Show Detection');

-- SEO sync — daily 6am UTC (main sync)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'SEO Sync', 'cron_job', 'scheduled', now(), 'cron', '0 6 * * *',
   '/api/cron/seo-sync', 'POST',
   '{"description": "Sync Google Search Console, track keywords, analyze content quality", "migration": "151"}',
   ARRAY['cron', 'seo', 'content'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'SEO Sync');

-- MCP health check — every 5 min
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'MCP Health Check', 'cron_job', 'scheduled', now(), 'cron', '*/5 * * * *',
   '/api/cron/mcp-health-check', 'POST',
   '{"description": "Health check all active MCP server connections", "migration": "388"}',
   ARRAY['cron', 'mcp', 'health'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'MCP Health Check');

-- Process nudges — every 4 hours
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Process Nudges', 'cron_job', 'scheduled', now(), 'cron', '0 */4 * * *',
   '/api/cron/process-nudges', 'GET',
   '{"description": "Process proactive nudges for tutor profiles", "migration": ""}',
   ARRAY['cron', 'notifications', 'nudges'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Process Nudges');

-- Process failed webhooks — every 15 min
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Process Failed Webhooks', 'cron_job', 'scheduled', now(), 'cron', '*/15 * * * *',
   '/api/cron/process-failed-webhooks', 'GET',
   '{"description": "DLQ retry for failed webhook payloads with exponential backoff", "migration": "372"}',
   ARRAY['cron', 'webhooks', 'dlq'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Process Failed Webhooks');

-- Workflow trigger fallback — every 30 min
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Workflow Trigger Fallback', 'cron_job', 'scheduled', now(), 'cron', '*/30 * * * *',
   '/api/cron/workflow-trigger-fallback', 'GET',
   '{"description": "Fallback for profiles stuck in under_review state > 60 min", "migration": "372"}',
   ARRAY['cron', 'workflows', 'fallback'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Workflow Trigger Fallback');

-- Shadow reconcile — hourly at :05
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Shadow Reconcile', 'cron_job', 'scheduled', now(), 'cron', '5 * * * *',
   '/api/cron/shadow-reconcile', 'GET',
   '{"description": "Shadow divergence reconciliation and conformance checking", "migration": "372"}',
   ARRAY['cron', 'workflows', 'shadow'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Shadow Reconcile');

-- Process referral email queue — every 5 min
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Process Referral Email Queue', 'cron_job', 'scheduled', now(), 'cron', '*/5 * * * *',
   '/api/referrals/process-email-queue', 'POST',
   '{"description": "Process pending referral emails (new_referral, stage_change, etc.)", "migration": "214"}',
   ARRAY['cron', 'referrals', 'email'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Process Referral Email Queue');

-- Process admin notifications — daily 9am UTC
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Process Admin Notifications', 'cron_job', 'scheduled', now(), 'cron', '0 9 * * *',
   '/api/admin/notifications/process', 'GET',
   '{"description": "Process admin activity notifications", "migration": "214"}',
   ARRAY['cron', 'notifications', 'admin'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Process Admin Notifications');

-- Market Intelligence agent — Monday 9am UTC
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Market Intelligence Weekly', 'cron_job', 'scheduled', now(), 'cron', '0 9 * * 1',
   '/api/admin/agents/market-intelligence/run', 'POST',
   '{"description": "Market Intelligence specialist agent weekly run", "migration": "350", "agent_slug": "market-intelligence"}',
   ARRAY['cron', 'agents', 'intelligence'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Market Intelligence Weekly');

-- Retention Monitor agent — daily 8am UTC
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Retention Monitor Daily', 'cron_job', 'scheduled', now(), 'cron', '0 8 * * *',
   '/api/admin/agents/retention-monitor/run', 'POST',
   '{"description": "Retention Monitor specialist agent daily run", "migration": "350", "agent_slug": "retention-monitor"}',
   ARRAY['cron', 'agents', 'intelligence'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Retention Monitor Daily');

-- Operations Monitor agent — daily 7am UTC
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, endpoint, http_method, metadata, tags, max_retries)
SELECT 'Operations Monitor Daily', 'cron_job', 'scheduled', now(), 'cron', '0 7 * * *',
   '/api/admin/agents/operations-monitor/run', 'POST',
   '{"description": "Operations Monitor specialist agent daily run", "migration": "350", "agent_slug": "operations-monitor"}',
   ARRAY['cron', 'agents', 'intelligence'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Operations Monitor Daily');

-- ============================================================
-- DIRECT SQL FUNCTION JOBS (type = 'sql_func')
-- ============================================================

-- Cleanup expired slot reservations — every 5 min (migration 220)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Cleanup Expired Slot Reservations', 'sql_func', 'scheduled', now(), 'cron', '*/5 * * * *',
   'cleanup_expired_slot_reservations',
   '{"description": "Reset bookings with expired 15-min slot reservations", "migration": "220"}',
   ARRAY['cron', 'bookings', 'cleanup'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Cleanup Expired Slot Reservations');

-- Sage Pro monthly quota reset — 1st of month (migration 277)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Sage Pro Monthly Quota Reset', 'sql_func', 'scheduled', now(), 'cron', '0 0 1 * *',
   'sage_pro_monthly_quota_reset',
   '{"description": "Reset questions_used_this_month for active sage_pro_subscriptions", "migration": "277", "sql": "UPDATE sage_pro_subscriptions SET questions_used_this_month = 0 WHERE status IN (''active'', ''trialing'')"}',
   ARRAY['cron', 'sage', 'subscriptions'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Sage Pro Monthly Quota Reset');

-- Compute growth scores — every 30 min (migration 381)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Growth Scores', 'sql_func', 'scheduled', now(), 'cron', '*/30 * * * *',
   'compute_growth_scores',
   '{"description": "Compute growth scores for all profiles", "migration": "381"}',
   ARRAY['cron', 'growth', 'metrics'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Growth Scores');

-- Measure tutor approval outcomes — Monday 9:15am UTC (migration 377)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Measure Tutor Approval Outcomes', 'sql_func', 'scheduled', now(), 'cron', '15 9 * * 1',
   'measure_tutor_approval_outcomes',
   '{"description": "Measure decision outcomes for Tutor Approval process", "migration": "377", "sql": "UPDATE decision_outcomes SET outcome_value = ... WHERE process_slug = ''tutor-approval''"}',
   ARRAY['cron', 'workflows', 'outcomes'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Measure Tutor Approval Outcomes');

-- Measure payout outcomes — Friday 10:30am UTC (migration 377)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Measure Payout Outcomes', 'sql_func', 'scheduled', now(), 'cron', '30 10 * * 5',
   'measure_payout_outcomes',
   '{"description": "Measure decision outcomes for Commission Payout", "migration": "377"}',
   ARRAY['cron', 'workflows', 'outcomes'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Measure Payout Outcomes');

-- Measure nudge outcomes — every 3 days 8:30am UTC (migration 377)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Measure Nudge Outcomes', 'sql_func', 'scheduled', now(), 'cron', '30 8 */3 * *',
   'measure_nudge_outcomes',
   '{"description": "Measure decision outcomes for nudges at 14d lag", "migration": "377"}',
   ARRAY['cron', 'workflows', 'outcomes'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Measure Nudge Outcomes');

-- ============================================================
-- MISSING PG_CRON SQL FUNCTION JOBS (H-7)
-- These pg_cron jobs call SQL functions directly and were not
-- included in the original seed. Added for completeness.
-- ============================================================

-- Compute CaaS Platform Metrics — daily 5:30am UTC (migration 355)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute CaaS Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '30 5 * * *',
   'compute_caas_platform_metrics',
   '{"description": "Daily CaaS platform metrics aggregation", "migration": "355"}',
   ARRAY['cron', 'intelligence', 'caas'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute CaaS Platform Metrics');

-- Compute Resources Platform Metrics — daily 4:30am UTC (migration 356)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Resources Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '30 4 * * *',
   'compute_resources_platform_metrics',
   '{"description": "Daily resources platform metrics aggregation", "migration": "356"}',
   ARRAY['cron', 'intelligence', 'resources'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Resources Platform Metrics');

-- Compute Article Intelligence Scores — daily 4:45am UTC (migration 358)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Article Intelligence Scores', 'sql_func', 'scheduled', now(), 'cron', '45 4 * * *',
   'compute_article_intelligence_scores',
   '{"description": "Daily article readiness and intelligence score computation", "migration": "358"}',
   ARRAY['cron', 'intelligence', 'articles'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Article Intelligence Scores');

-- Compute SEO Platform Metrics — daily 5:00am UTC (migration 357)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute SEO Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '0 5 * * *',
   'compute_seo_platform_metrics',
   '{"description": "Daily SEO platform metrics aggregation", "migration": "357"}',
   ARRAY['cron', 'intelligence', 'seo'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute SEO Platform Metrics');

-- Compute Marketplace Platform Metrics — daily 6:00am UTC (migration 359)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Marketplace Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '0 6 * * *',
   'compute_marketplace_platform_metrics',
   '{"description": "Daily marketplace platform metrics aggregation", "migration": "359"}',
   ARRAY['cron', 'intelligence', 'marketplace'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Marketplace Platform Metrics');

-- Compute Bookings Platform Metrics — daily 6:30am UTC (migration 360)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Bookings Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '30 6 * * *',
   'compute_bookings_platform_metrics',
   '{"description": "Daily bookings platform metrics aggregation", "migration": "360"}',
   ARRAY['cron', 'intelligence', 'bookings'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Bookings Platform Metrics');

-- Compute Listings Platform Metrics — daily 7:00am UTC (migration 361)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Listings Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '0 7 * * *',
   'compute_listings_platform_metrics',
   '{"description": "Daily listings platform metrics aggregation", "migration": "361"}',
   ARRAY['cron', 'intelligence', 'listings'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Listings Platform Metrics');

-- Compute Financials Platform Metrics — daily 7:30am UTC (migration 362)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Financials Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '30 7 * * *',
   'compute_financials_platform_metrics',
   '{"description": "Daily financials platform metrics aggregation", "migration": "362"}',
   ARRAY['cron', 'intelligence', 'financials'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Financials Platform Metrics');

-- Compute Virtualspace Platform Metrics — daily 8:00am UTC (migration 363)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Virtualspace Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '0 8 * * *',
   'compute_virtualspace_platform_metrics',
   '{"description": "Daily virtualspace platform metrics aggregation", "migration": "363"}',
   ARRAY['cron', 'intelligence', 'virtualspace'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Virtualspace Platform Metrics');

-- Compute Referral Metrics — daily 9:00am UTC (migration 364)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Referral Metrics', 'sql_func', 'scheduled', now(), 'cron', '0 9 * * *',
   'compute_referral_metrics',
   '{"description": "Daily referral metrics aggregation", "migration": "364"}',
   ARRAY['cron', 'intelligence', 'referrals'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Referral Metrics');

-- Compute Retention Platform Metrics — daily 9:30am UTC (migration 366)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Retention Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '30 9 * * *',
   'compute_retention_platform_metrics',
   '{"description": "Daily retention platform metrics aggregation", "migration": "366"}',
   ARRAY['cron', 'intelligence', 'retention'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Retention Platform Metrics');

-- Compute AI Adoption Platform Metrics — daily 10:00am UTC (migration 367)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute AI Adoption Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '0 10 * * *',
   'compute_ai_adoption_platform_metrics',
   '{"description": "Daily AI adoption platform metrics aggregation", "migration": "367"}',
   ARRAY['cron', 'intelligence', 'ai-adoption'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute AI Adoption Platform Metrics');

-- Compute Org Conversion Platform Metrics — daily 10:30am UTC (migration 368)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Org Conversion Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '30 10 * * *',
   'compute_org_conversion_platform_metrics',
   '{"description": "Daily org conversion platform metrics aggregation", "migration": "368"}',
   ARRAY['cron', 'intelligence', 'org-conversion'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Org Conversion Platform Metrics');

-- Compute AI Studio Platform Metrics — daily 11:00am UTC (migration 369)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute AI Studio Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '0 11 * * *',
   'compute_ai_studio_platform_metrics',
   '{"description": "Daily AI studio platform metrics aggregation", "migration": "369"}',
   ARRAY['cron', 'intelligence', 'ai-studio'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute AI Studio Platform Metrics');

-- Compute Onboarding Platform Metrics — daily 4:00am UTC (migration 391)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Compute Onboarding Platform Metrics', 'sql_func', 'scheduled', now(), 'cron', '0 4 * * *',
   'compute_onboarding_platform_metrics',
   '{"description": "Daily onboarding platform metrics aggregation", "migration": "391"}',
   ARRAY['cron', 'intelligence', 'onboarding'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Compute Onboarding Platform Metrics');

-- Refresh Referral Network Stats — every 30 min at :30 (migration 365)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Refresh Referral Network Stats', 'sql_func', 'scheduled', now(), 'cron', '30 * * * *',
   'refresh_referral_network_stats',
   '{"description": "Refresh referral_network_stats materialized view", "migration": "365", "sql": "REFRESH MATERIALIZED VIEW CONCURRENTLY referral_network_stats"}',
   ARRAY['cron', 'referrals', 'materialized-view'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Refresh Referral Network Stats');

-- Aggregate Daily Statistics — midnight UTC (migration 140)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Aggregate Daily Statistics', 'sql_func', 'scheduled', now(), 'cron', '0 0 * * *',
   'aggregate_daily_statistics',
   '{"description": "Aggregate daily platform statistics", "migration": "140", "sql": "SELECT aggregate_daily_statistics(CURRENT_DATE)"}',
   ARRAY['cron', 'analytics', 'statistics'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Aggregate Daily Statistics');

-- Aggregate User Statistics — daily 1:00am UTC (migration 207)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Aggregate User Statistics', 'sql_func', 'scheduled', now(), 'cron', '0 1 * * *',
   'aggregate_user_statistics',
   '{"description": "Aggregate user-level statistics nightly", "migration": "207", "sql": "SELECT aggregate_user_statistics(NULL, CURRENT_DATE)"}',
   ARRAY['cron', 'analytics', 'statistics'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Aggregate User Statistics');

-- Aggregate Organisation Statistics — daily 1:30am UTC (migration 209)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Aggregate Organisation Statistics', 'sql_func', 'scheduled', now(), 'cron', '30 1 * * *',
   'aggregate_organisation_statistics',
   '{"description": "Aggregate organisation-level statistics nightly", "migration": "209", "sql": "SELECT aggregate_organisation_statistics(NULL, CURRENT_DATE)"}',
   ARRAY['cron', 'analytics', 'statistics'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Aggregate Organisation Statistics');

-- Refresh Profile View Counts — hourly at :00 (migration 097)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Refresh Profile View Counts', 'sql_func', 'scheduled', now(), 'cron', '0 * * * *',
   'refresh_profile_view_counts',
   '{"description": "Refresh profile view count aggregates hourly", "migration": "097", "sql": "SELECT refresh_profile_view_counts()"}',
   ARRAY['cron', 'analytics', 'profile-views'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Refresh Profile View Counts');

-- Refresh Network Trust Metrics — daily 2:00am UTC (migration 155)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Refresh Network Trust Metrics', 'sql_func', 'scheduled', now(), 'cron', '0 2 * * *',
   'refresh_network_trust_metrics',
   '{"description": "Refresh network trust graph metrics daily", "migration": "155", "sql": "SELECT refresh_network_trust_metrics()"}',
   ARRAY['cron', 'analytics', 'trust'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Refresh Network Trust Metrics');

-- Sage Pro File Cleanup — Sunday 2:00am UTC (migration 277)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Sage Pro File Cleanup', 'sql_func', 'scheduled', now(), 'cron', '0 2 * * 0',
   'sage_pro_file_cleanup',
   '{"description": "Clean up expired Sage Pro uploaded files weekly", "migration": "277"}',
   ARRAY['cron', 'sage', 'cleanup'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Sage Pro File Cleanup');

-- Expire Stale Referrals — daily 3:00am UTC (migration 231)
INSERT INTO scheduled_items (title, type, status, scheduled_at, recurrence, cron_expression, sql_function, metadata, tags, max_retries)
SELECT 'Expire Stale Referrals', 'sql_func', 'scheduled', now(), 'cron', '0 3 * * *',
   'expire_stale_referrals',
   '{"description": "Expire referrals that have been stale beyond threshold", "migration": "231", "sql": "SELECT expire_stale_referrals()"}',
   ARRAY['cron', 'referrals', 'cleanup'], 3
WHERE NOT EXISTS (SELECT 1 FROM scheduled_items WHERE title = 'Expire Stale Referrals');

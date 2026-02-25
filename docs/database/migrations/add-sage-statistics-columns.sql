/**
 * Migration: Add Comprehensive Sage Statistics Columns and Cron Job
 * Date: 2026-02-25
 * Purpose: Add all Sage metrics to platform_statistics_daily table for Hub architecture compliance
 *
 * Instructions:
 * This migration has already been executed in the database.
 * This file is for documentation and reference purposes.
 *
 * Changes Applied:
 * 1. Added 23 total columns to platform_statistics_daily table:
 *    - 7 original metrics (sessions, questions, users, subscriptions, MRR)
 *    - 4 subject metrics (maths, english, science, general)
 *    - 5 quota metrics (free daily usage, limit hits, averages)
 *    - 4 cost metrics (AI cost, cost per question, margins)
 *    - 3 additional Pro metrics (monthly usage, Pro average)
 * 2. Created comprehensive aggregate_sage_statistics() PostgreSQL function
 * 3. Scheduled pg_cron job (jobid 54) to run daily at midnight UTC
 *
 * Related Files:
 * - Frontend: apps/web/src/app/(admin)/admin/sage/page.tsx
 * - Hooks: apps/web/src/hooks/useAdminMetric.ts, useAdminTrendData.ts
 * - Components: apps/web/src/app/components/hub/charts/*
 */

-- ========================================
-- STEP 1: ADD SAGE METRICS COLUMNS (23 Total)
-- ========================================

-- Original 7 metrics (session, user, subscription data)
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS sage_sessions_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_questions_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_unique_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_free_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_pro_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_pro_subscriptions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_pro_mrr NUMERIC(10,2) DEFAULT 0;

-- Subject metrics (4 columns) - questions grouped by subject
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS sage_subject_maths INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_subject_english INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_subject_science INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_subject_general INTEGER DEFAULT 0;

-- Quota metrics (5 columns) - usage tracking and limits
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS sage_free_daily_usage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_free_limit_hits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_free_avg_questions NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_pro_monthly_usage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_pro_avg_questions NUMERIC(10,2) DEFAULT 0;

-- Cost metrics (4 columns) - AI cost analysis
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS sage_total_ai_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_cost_per_question NUMERIC(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_margin_free NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sage_margin_pro NUMERIC(10,2) DEFAULT 0;

-- ========================================
-- STEP 2: CREATE COMPREHENSIVE STATISTICS FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION aggregate_sage_statistics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Original metrics (7)
  v_sessions_total INTEGER;
  v_questions_total INTEGER;
  v_unique_users INTEGER;
  v_free_users INTEGER;
  v_pro_users INTEGER;
  v_pro_subscriptions INTEGER;
  v_pro_mrr NUMERIC(10,2);

  -- Subject metrics (4)
  v_subject_maths INTEGER;
  v_subject_english INTEGER;
  v_subject_science INTEGER;
  v_subject_general INTEGER;

  -- Quota metrics (5)
  v_free_daily_usage INTEGER;
  v_free_limit_hits INTEGER;
  v_free_avg_questions NUMERIC(10,2);
  v_pro_monthly_usage INTEGER;
  v_pro_avg_questions NUMERIC(10,2);

  -- Cost metrics (4)
  v_total_ai_cost NUMERIC(10,2);
  v_cost_per_question NUMERIC(10,4);
  v_margin_free NUMERIC(10,2);
  v_margin_pro NUMERIC(10,2);

  v_result jsonb;
BEGIN
  -- ========================================
  -- ORIGINAL METRICS (7)
  -- ========================================

  -- Total Sage sessions
  SELECT COUNT(*) INTO v_sessions_total
  FROM sage_sessions;

  -- Total questions asked (count user messages)
  SELECT COUNT(*) INTO v_questions_total
  FROM sage_messages
  WHERE role = 'user';

  -- Unique users who have used Sage
  SELECT COUNT(DISTINCT user_id) INTO v_unique_users
  FROM sage_sessions;

  -- Pro subscriptions (active or trialing)
  SELECT COUNT(*) INTO v_pro_subscriptions
  FROM sage_pro_subscriptions
  WHERE status IN ('active', 'trialing');

  -- Pro users count
  SELECT COUNT(DISTINCT user_id) INTO v_pro_users
  FROM sage_pro_subscriptions
  WHERE status IN ('active', 'trialing');

  -- Free users (unique users minus pro users)
  v_free_users := GREATEST(0, v_unique_users - v_pro_users);

  -- Monthly Recurring Revenue (MRR) from active Pro subscriptions
  -- Sage Pro is £5.99/month
  SELECT COALESCE(COUNT(*) * 5.99, 0) INTO v_pro_mrr
  FROM sage_pro_subscriptions
  WHERE status = 'active';

  -- ========================================
  -- SUBJECT METRICS (4)
  -- ========================================

  -- Questions grouped by subject (from sage_sessions.subject)
  SELECT
    COALESCE(SUM(CASE WHEN s.subject = 'maths' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.subject = 'english' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.subject = 'science' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.subject = 'general' THEN 1 ELSE 0 END), 0)
  INTO v_subject_maths, v_subject_english, v_subject_science, v_subject_general
  FROM sage_messages m
  JOIN sage_sessions s ON m.session_id = s.id
  WHERE m.role = 'user';

  -- ========================================
  -- QUOTA METRICS (5)
  -- ========================================

  -- Free tier daily usage (questions asked today by free users)
  SELECT COUNT(*) INTO v_free_daily_usage
  FROM sage_messages m
  JOIN sage_sessions s ON m.session_id = s.id
  LEFT JOIN sage_pro_subscriptions p ON s.user_id = p.user_id AND p.status IN ('active', 'trialing')
  WHERE m.role = 'user'
    AND m.created_at >= CURRENT_DATE
    AND p.user_id IS NULL;

  -- Free tier limit hits (users who hit the 10 questions/day limit today)
  WITH free_user_daily_counts AS (
    SELECT s.user_id, COUNT(*) as question_count
    FROM sage_messages m
    JOIN sage_sessions s ON m.session_id = s.id
    LEFT JOIN sage_pro_subscriptions p ON s.user_id = p.user_id AND p.status IN ('active', 'trialing')
    WHERE m.role = 'user'
      AND m.created_at >= CURRENT_DATE
      AND p.user_id IS NULL
    GROUP BY s.user_id
  )
  SELECT COUNT(*) INTO v_free_limit_hits
  FROM free_user_daily_counts
  WHERE question_count >= 10;

  -- Average questions per free user (all time)
  SELECT COALESCE(
    CASE
      WHEN v_free_users > 0
      THEN (
        SELECT COUNT(*)::NUMERIC
        FROM sage_messages m
        JOIN sage_sessions s ON m.session_id = s.id
        LEFT JOIN sage_pro_subscriptions p ON s.user_id = p.user_id AND p.status IN ('active', 'trialing')
        WHERE m.role = 'user' AND p.user_id IS NULL
      ) / v_free_users
      ELSE 0
    END,
    0
  ) INTO v_free_avg_questions;

  -- Pro tier monthly usage (questions asked this month by Pro users)
  SELECT COUNT(*) INTO v_pro_monthly_usage
  FROM sage_messages m
  JOIN sage_sessions s ON m.session_id = s.id
  JOIN sage_pro_subscriptions p ON s.user_id = p.user_id
  WHERE m.role = 'user'
    AND p.status IN ('active', 'trialing')
    AND m.created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- Average questions per Pro user (all time)
  SELECT COALESCE(
    CASE
      WHEN v_pro_users > 0
      THEN (
        SELECT COUNT(*)::NUMERIC
        FROM sage_messages m
        JOIN sage_sessions s ON m.session_id = s.id
        JOIN sage_pro_subscriptions p ON s.user_id = p.user_id
        WHERE m.role = 'user' AND p.status IN ('active', 'trialing')
      ) / v_pro_users
      ELSE 0
    END,
    0
  ) INTO v_pro_avg_questions;

  -- ========================================
  -- COST METRICS (4)
  -- ========================================

  -- Total AI cost (from sage_usage_log, converted USD to GBP)
  SELECT COALESCE(SUM(estimated_cost_usd) * 0.79, 0) INTO v_total_ai_cost
  FROM sage_usage_log;

  -- Cost per question
  v_cost_per_question := CASE
    WHEN v_questions_total > 0
    THEN v_total_ai_cost / v_questions_total
    ELSE 0
  END;

  -- Free tier margin (cost for free users - revenue from free tier = negative)
  -- Free users generate no revenue, only costs
  SELECT COALESCE(-1 * SUM(ul.estimated_cost_usd) * 0.79, 0) INTO v_margin_free
  FROM sage_usage_log ul
  JOIN sage_sessions s ON ul.session_id = s.id
  LEFT JOIN sage_pro_subscriptions p ON s.user_id = p.user_id AND p.status IN ('active', 'trialing')
  WHERE p.user_id IS NULL;

  -- Pro tier margin (revenue from Pro tier - cost for Pro users)
  WITH pro_cost AS (
    SELECT COALESCE(SUM(ul.estimated_cost_usd) * 0.79, 0) as cost
    FROM sage_usage_log ul
    JOIN sage_sessions s ON ul.session_id = s.id
    JOIN sage_pro_subscriptions p ON s.user_id = p.user_id
    WHERE p.status IN ('active', 'trialing')
  )
  SELECT v_pro_mrr - pro_cost.cost INTO v_margin_pro
  FROM pro_cost;

  -- ========================================
  -- INSERT/UPDATE ALL 23 METRICS
  -- ========================================

  INSERT INTO platform_statistics_daily (
    date,
    -- Original 7
    sage_sessions_total,
    sage_questions_total,
    sage_unique_users,
    sage_free_users,
    sage_pro_users,
    sage_pro_subscriptions,
    sage_pro_mrr,
    -- Subject 4
    sage_subject_maths,
    sage_subject_english,
    sage_subject_science,
    sage_subject_general,
    -- Quota 5
    sage_free_daily_usage,
    sage_free_limit_hits,
    sage_free_avg_questions,
    sage_pro_monthly_usage,
    sage_pro_avg_questions,
    -- Cost 4
    sage_total_ai_cost,
    sage_cost_per_question,
    sage_margin_free,
    sage_margin_pro
  )
  VALUES (
    p_date,
    -- Original 7
    v_sessions_total,
    v_questions_total,
    v_unique_users,
    v_free_users,
    v_pro_users,
    v_pro_subscriptions,
    v_pro_mrr,
    -- Subject 4
    v_subject_maths,
    v_subject_english,
    v_subject_science,
    v_subject_general,
    -- Quota 5
    v_free_daily_usage,
    v_free_limit_hits,
    v_free_avg_questions,
    v_pro_monthly_usage,
    v_pro_avg_questions,
    -- Cost 4
    v_total_ai_cost,
    v_cost_per_question,
    v_margin_free,
    v_margin_pro
  )
  ON CONFLICT (date) DO UPDATE
  SET
    -- Original 7
    sage_sessions_total = EXCLUDED.sage_sessions_total,
    sage_questions_total = EXCLUDED.sage_questions_total,
    sage_unique_users = EXCLUDED.sage_unique_users,
    sage_free_users = EXCLUDED.sage_free_users,
    sage_pro_users = EXCLUDED.sage_pro_users,
    sage_pro_subscriptions = EXCLUDED.sage_pro_subscriptions,
    sage_pro_mrr = EXCLUDED.sage_pro_mrr,
    -- Subject 4
    sage_subject_maths = EXCLUDED.sage_subject_maths,
    sage_subject_english = EXCLUDED.sage_subject_english,
    sage_subject_science = EXCLUDED.sage_subject_science,
    sage_subject_general = EXCLUDED.sage_subject_general,
    -- Quota 5
    sage_free_daily_usage = EXCLUDED.sage_free_daily_usage,
    sage_free_limit_hits = EXCLUDED.sage_free_limit_hits,
    sage_free_avg_questions = EXCLUDED.sage_free_avg_questions,
    sage_pro_monthly_usage = EXCLUDED.sage_pro_monthly_usage,
    sage_pro_avg_questions = EXCLUDED.sage_pro_avg_questions,
    -- Cost 4
    sage_total_ai_cost = EXCLUDED.sage_total_ai_cost,
    sage_cost_per_question = EXCLUDED.sage_cost_per_question,
    sage_margin_free = EXCLUDED.sage_margin_free,
    sage_margin_pro = EXCLUDED.sage_margin_pro;

  -- Build comprehensive result summary
  v_result := jsonb_build_object(
    'date', p_date,
    'metrics', jsonb_build_object(
      'original', jsonb_build_object(
        'sage_sessions_total', v_sessions_total,
        'sage_questions_total', v_questions_total,
        'sage_unique_users', v_unique_users,
        'sage_free_users', v_free_users,
        'sage_pro_users', v_pro_users,
        'sage_pro_subscriptions', v_pro_subscriptions,
        'sage_pro_mrr', v_pro_mrr
      ),
      'subjects', jsonb_build_object(
        'maths', v_subject_maths,
        'english', v_subject_english,
        'science', v_subject_science,
        'general', v_subject_general
      ),
      'quota', jsonb_build_object(
        'free_daily_usage', v_free_daily_usage,
        'free_limit_hits', v_free_limit_hits,
        'free_avg_questions', v_free_avg_questions,
        'pro_monthly_usage', v_pro_monthly_usage,
        'pro_avg_questions', v_pro_avg_questions
      ),
      'costs', jsonb_build_object(
        'total_ai_cost', v_total_ai_cost,
        'cost_per_question', v_cost_per_question,
        'margin_free', v_margin_free,
        'margin_pro', v_margin_pro
      )
    ),
    'success', true
  );

  RETURN v_result;
END;
$$;

-- ========================================
-- STEP 3: SCHEDULE CRON JOB
-- ========================================

SELECT cron.schedule(
  'aggregate-sage-statistics',
  '0 0 * * *',
  $$SELECT aggregate_sage_statistics(CURRENT_DATE);$$
);

-- Expected jobid: 54

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify all 23 columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'platform_statistics_daily'
  AND column_name LIKE 'sage_%'
ORDER BY ordinal_position;

-- Expected output (23 columns):
-- column_name                  | data_type | column_default
-- -----------------------------|-----------|---------------
-- sage_sessions_total          | integer   | 0
-- sage_questions_total         | integer   | 0
-- sage_unique_users            | integer   | 0
-- sage_free_users              | integer   | 0
-- sage_pro_users               | integer   | 0
-- sage_pro_subscriptions       | integer   | 0
-- sage_pro_mrr                 | numeric   | 0
-- sage_subject_maths           | integer   | 0
-- sage_subject_english         | integer   | 0
-- sage_subject_science         | integer   | 0
-- sage_subject_general         | integer   | 0
-- sage_free_daily_usage        | integer   | 0
-- sage_free_limit_hits         | integer   | 0
-- sage_free_avg_questions      | numeric   | 0
-- sage_pro_monthly_usage       | integer   | 0
-- sage_pro_avg_questions       | numeric   | 0
-- sage_total_ai_cost           | numeric   | 0
-- sage_cost_per_question       | numeric   | 0
-- sage_margin_free             | numeric   | 0
-- sage_margin_pro              | numeric   | 0

-- Verify function exists
SELECT proname, pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'aggregate_sage_statistics';

-- Verify cron job is scheduled
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'aggregate-sage-statistics';

-- Expected output:
-- jobid | jobname                   | schedule   | command
-- ------|---------------------------|------------|------------------------------------------
-- 54    | aggregate-sage-statistics | 0 0 * * *  | SELECT aggregate_sage_statistics(CURRENT_DATE);

-- Test function manually
SELECT aggregate_sage_statistics(CURRENT_DATE);

-- Verify data was inserted (all 23 metrics)
SELECT
  date,
  -- Original 7
  sage_sessions_total, sage_questions_total, sage_unique_users,
  sage_free_users, sage_pro_users, sage_pro_subscriptions, sage_pro_mrr,
  -- Subject 4
  sage_subject_maths, sage_subject_english, sage_subject_science, sage_subject_general,
  -- Quota 5
  sage_free_daily_usage, sage_free_limit_hits, sage_free_avg_questions,
  sage_pro_monthly_usage, sage_pro_avg_questions,
  -- Cost 4
  sage_total_ai_cost, sage_cost_per_question, sage_margin_free, sage_margin_pro
FROM platform_statistics_daily
WHERE date = CURRENT_DATE;

-- ========================================
-- MONITORING CRON EXECUTION
-- ========================================

-- View recent cron job executions
SELECT
  jobid,
  runid,
  job_pid,
  database,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid = 54
ORDER BY start_time DESC
LIMIT 10;

-- ========================================
-- DETAILED NOTES
-- ========================================

-- METRICS COLLECTED (23 Total):
--
-- Original Metrics (7):
-- 1. sage_sessions_total: Total number of Sage chat sessions
-- 2. sage_questions_total: Total number of questions asked by users
-- 3. sage_unique_users: Unique users who have used Sage
-- 4. sage_free_users: Users on free tier (calculated: unique - pro)
-- 5. sage_pro_users: Users with active or trialing Pro subscriptions
-- 6. sage_pro_subscriptions: Count of active/trialing Pro subscriptions
-- 7. sage_pro_mrr: Monthly Recurring Revenue from active Pro subscriptions (£5.99/user)
--
-- Subject Metrics (4):
-- 8. sage_subject_maths: Questions asked about Mathematics
-- 9. sage_subject_english: Questions asked about English
-- 10. sage_subject_science: Questions asked about Science
-- 11. sage_subject_general: Questions asked about General topics
--
-- Quota Metrics (5):
-- 12. sage_free_daily_usage: Questions asked today by free tier users
-- 13. sage_free_limit_hits: Free users who hit 10 questions/day limit today
-- 14. sage_free_avg_questions: Average questions per free user (all time)
-- 15. sage_pro_monthly_usage: Questions asked this month by Pro users
-- 16. sage_pro_avg_questions: Average questions per Pro user (all time)
--
-- Cost Metrics (4):
-- 17. sage_total_ai_cost: Total AI cost in GBP (from sage_usage_log, USD * 0.79)
-- 18. sage_cost_per_question: Average AI cost per question
-- 19. sage_margin_free: Free tier margin (negative, cost only)
-- 20. sage_margin_pro: Pro tier margin (revenue - cost)

-- TABLES USED:
-- - sage_sessions: Session records (user_id, subject, created_at)
-- - sage_messages: User and assistant messages (role='user' for questions)
-- - sage_pro_subscriptions: Pro subscription status and details
-- - sage_usage_log: AI usage tracking (estimated_cost_usd per session)
-- - platform_statistics_daily: Aggregated metrics storage

-- CRON SCHEDULE:
-- - Runs daily at 00:00 UTC
-- - Job ID: 54
-- - Job Name: aggregate-sage-statistics
-- - Command: SELECT aggregate_sage_statistics(CURRENT_DATE);

-- FRONTEND USAGE:
-- - Hook: useAdminMetric({ metric: 'sage_sessions_total', compareWith: 'last_month' })
-- - Returns: { value, change, changePercent, trend, previousValue }
-- - Trend indicators: 'up', 'down', 'neutral'
-- - Used in: HubKPICard components for real-time metrics with historical comparison

-- HISTORICAL DATA:
-- - Data is stored in platform_statistics_daily table
-- - Used by useAdminMetric hook for trend indicators (compare with last_month)
-- - Used by useAdminTrendData hook for charts (last 7/30 days)
-- - Enables month-over-month comparisons and visualizations

-- HUB ARCHITECTURE COMPLIANCE:
-- - All metrics follow Hub architecture pattern
-- - Matches Listings/Bookings admin pages design
-- - Uses HubKPICard, HubKPIGrid, HubTrendChart, HubCategoryBreakdownChart
-- - Consistent styling and user experience across admin dashboard

-- ========================================
-- ROLLBACK (if needed)
-- ========================================

/*
-- To remove the cron job:
SELECT cron.unschedule('aggregate-sage-statistics');

-- To drop the function:
DROP FUNCTION IF EXISTS aggregate_sage_statistics(DATE);

-- To remove all 23 columns:
ALTER TABLE platform_statistics_daily
DROP COLUMN IF EXISTS sage_sessions_total,
DROP COLUMN IF EXISTS sage_questions_total,
DROP COLUMN IF EXISTS sage_unique_users,
DROP COLUMN IF EXISTS sage_free_users,
DROP COLUMN IF EXISTS sage_pro_users,
DROP COLUMN IF EXISTS sage_pro_subscriptions,
DROP COLUMN IF EXISTS sage_pro_mrr,
DROP COLUMN IF EXISTS sage_subject_maths,
DROP COLUMN IF EXISTS sage_subject_english,
DROP COLUMN IF EXISTS sage_subject_science,
DROP COLUMN IF EXISTS sage_subject_general,
DROP COLUMN IF EXISTS sage_free_daily_usage,
DROP COLUMN IF EXISTS sage_free_limit_hits,
DROP COLUMN IF EXISTS sage_free_avg_questions,
DROP COLUMN IF EXISTS sage_pro_monthly_usage,
DROP COLUMN IF EXISTS sage_pro_avg_questions,
DROP COLUMN IF EXISTS sage_total_ai_cost,
DROP COLUMN IF EXISTS sage_cost_per_question,
DROP COLUMN IF EXISTS sage_margin_free,
DROP COLUMN IF EXISTS sage_margin_pro;
*/

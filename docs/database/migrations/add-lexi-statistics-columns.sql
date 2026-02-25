/**
 * Migration: Add Comprehensive Lexi Statistics Columns and Cron Job
 * Date: 2026-02-25
 * Purpose: Add all Lexi AI Assistant metrics to platform_statistics_daily table for Hub architecture compliance
 *
 * Instructions:
 * This migration needs to be executed in the database.
 * Run these commands to implement Lexi analytics infrastructure.
 *
 * Changes to Apply:
 * 1. Add 24 total columns to platform_statistics_daily table:
 *    - 7 core metrics (conversations, messages, users, feedback, satisfaction)
 *    - 5 persona metrics (student, tutor, client, agent, organisation)
 *    - 3 provider metrics (rules, claude, gemini)
 *    - 4 quota metrics (daily usage, limits, averages)
 *    - 5 cost metrics (AI costs, projections)
 * 2. Create comprehensive aggregate_lexi_statistics() PostgreSQL function
 * 3. Schedule pg_cron job to run daily at midnight UTC
 *
 * Related Files:
 * - Frontend: apps/web/src/app/(admin)/admin/lexi/page.tsx
 * - Hooks: apps/web/src/hooks/useAdminMetric.ts, useAdminTrendData.ts
 * - Components: apps/web/src/app/components/hub/charts/*
 * - Tracking: docs/feature/lexi-analytics-tracking.md
 */

-- ========================================
-- STEP 1: ADD LEXI METRICS COLUMNS (24 Total)
-- ========================================

-- Core metrics (7 columns) - conversation and feedback data
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_conversations_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_messages_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_unique_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_avg_messages_per_conversation NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_feedback_positive INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_feedback_negative INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_satisfaction_rate NUMERIC(5,2) DEFAULT 0;

-- Persona metrics (5 columns) - conversations by user type
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_persona_student INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_persona_tutor INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_persona_client INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_persona_agent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_persona_organisation INTEGER DEFAULT 0;

-- Provider metrics (3 columns) - AI provider usage
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_provider_rules INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_provider_claude INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_provider_gemini INTEGER DEFAULT 0;

-- Quota metrics (4 columns) - usage tracking and limits
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_daily_usage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_limit_hits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_total_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_avg_conversations_per_user NUMERIC(10,2) DEFAULT 0;

-- Cost metrics (5 columns) - AI cost analysis
ALTER TABLE platform_statistics_daily
ADD COLUMN IF NOT EXISTS lexi_ai_cost_total NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_cost_per_conversation NUMERIC(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_free_usage_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_paid_usage_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexi_monthly_projection NUMERIC(10,2) DEFAULT 0;

-- ========================================
-- STEP 2: CREATE COMPREHENSIVE STATISTICS FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION aggregate_lexi_statistics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Core metrics (7)
  v_conversations_total INTEGER;
  v_messages_total INTEGER;
  v_unique_users INTEGER;
  v_avg_messages_per_conversation NUMERIC(10,2);
  v_feedback_positive INTEGER;
  v_feedback_negative INTEGER;
  v_satisfaction_rate NUMERIC(5,2);

  -- Persona metrics (5)
  v_persona_student INTEGER;
  v_persona_tutor INTEGER;
  v_persona_client INTEGER;
  v_persona_agent INTEGER;
  v_persona_organisation INTEGER;

  -- Provider metrics (3)
  v_provider_rules INTEGER;
  v_provider_claude INTEGER;
  v_provider_gemini INTEGER;

  -- Quota metrics (4)
  v_daily_usage INTEGER;
  v_limit_hits INTEGER;
  v_total_users INTEGER;
  v_avg_conversations_per_user NUMERIC(10,2);

  -- Cost metrics (5)
  v_ai_cost_total NUMERIC(10,2);
  v_cost_per_conversation NUMERIC(10,4);
  v_free_usage_percent NUMERIC(5,2);
  v_paid_usage_percent NUMERIC(5,2);
  v_monthly_projection NUMERIC(10,2);

  v_feedback_total INTEGER;
  v_result jsonb;
BEGIN
  -- ========================================
  -- CORE METRICS (7)
  -- ========================================

  -- Total Lexi conversations
  SELECT COUNT(*) INTO v_conversations_total
  FROM lexi_conversations;

  -- Total messages (user + assistant)
  SELECT COUNT(*) INTO v_messages_total
  FROM lexi_messages;

  -- Unique users who have used Lexi
  SELECT COUNT(DISTINCT user_id) INTO v_unique_users
  FROM lexi_conversations
  WHERE user_id IS NOT NULL;

  -- Average messages per conversation
  v_avg_messages_per_conversation := CASE
    WHEN v_conversations_total > 0
    THEN v_messages_total::NUMERIC / v_conversations_total
    ELSE 0
  END;

  -- Feedback metrics (positive and negative thumbs)
  SELECT
    COALESCE(SUM(CASE WHEN feedback = 'positive' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN feedback = 'negative' THEN 1 ELSE 0 END), 0)
  INTO v_feedback_positive, v_feedback_negative
  FROM lexi_messages
  WHERE feedback IS NOT NULL;

  -- Calculate satisfaction rate
  v_feedback_total := v_feedback_positive + v_feedback_negative;
  v_satisfaction_rate := CASE
    WHEN v_feedback_total > 0
    THEN (v_feedback_positive::NUMERIC / v_feedback_total) * 100
    ELSE 0
  END;

  -- ========================================
  -- PERSONA METRICS (5)
  -- ========================================

  -- Conversations grouped by persona
  SELECT
    COALESCE(SUM(CASE WHEN persona = 'student' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN persona = 'tutor' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN persona = 'client' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN persona = 'agent' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN persona = 'organisation' THEN 1 ELSE 0 END), 0)
  INTO v_persona_student, v_persona_tutor, v_persona_client, v_persona_agent, v_persona_organisation
  FROM lexi_conversations;

  -- ========================================
  -- PROVIDER METRICS (3)
  -- ========================================

  -- Conversations grouped by provider (rules, claude, gemini)
  SELECT
    COALESCE(SUM(CASE WHEN provider = 'rules' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN provider = 'claude' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN provider = 'gemini' THEN 1 ELSE 0 END), 0)
  INTO v_provider_rules, v_provider_claude, v_provider_gemini
  FROM lexi_conversations;

  -- ========================================
  -- QUOTA METRICS (4)
  -- ========================================

  -- Daily usage (conversations created today)
  SELECT COUNT(*) INTO v_daily_usage
  FROM lexi_conversations
  WHERE created_at >= CURRENT_DATE;

  -- Limit hits (users who hit conversation limits today)
  -- Note: Lexi may not have explicit limits, defaulting to 0
  -- TODO: Implement limit tracking if needed
  v_limit_hits := 0;

  -- Total authenticated users
  SELECT COUNT(DISTINCT user_id) INTO v_total_users
  FROM lexi_conversations
  WHERE user_id IS NOT NULL;

  -- Average conversations per user
  v_avg_conversations_per_user := CASE
    WHEN v_total_users > 0
    THEN v_conversations_total::NUMERIC / v_total_users
    ELSE 0
  END;

  -- ========================================
  -- COST METRICS (5)
  -- ========================================

  -- Total AI cost (Gemini and Claude conversations)
  -- Assuming cost tracking exists in lexi_conversations or separate table
  -- For now, estimating based on provider usage
  -- TODO: Update with actual cost tracking when available
  v_ai_cost_total := 0.0; -- Placeholder

  -- Cost per conversation
  v_cost_per_conversation := CASE
    WHEN v_conversations_total > 0
    THEN v_ai_cost_total / v_conversations_total
    ELSE 0
  END;

  -- Free usage percentage (rules-based conversations)
  v_free_usage_percent := CASE
    WHEN v_conversations_total > 0
    THEN (v_provider_rules::NUMERIC / v_conversations_total) * 100
    ELSE 0
  END;

  -- Paid usage percentage (Claude + Gemini conversations)
  v_paid_usage_percent := CASE
    WHEN v_conversations_total > 0
    THEN ((v_provider_claude + v_provider_gemini)::NUMERIC / v_conversations_total) * 100
    ELSE 0
  END;

  -- Monthly projection (daily usage * 30 * cost per conversation)
  v_monthly_projection := v_daily_usage * 30 * v_cost_per_conversation;

  -- ========================================
  -- INSERT/UPDATE ALL 24 METRICS
  -- ========================================

  INSERT INTO platform_statistics_daily (
    date,
    -- Core 7
    lexi_conversations_total,
    lexi_messages_total,
    lexi_unique_users,
    lexi_avg_messages_per_conversation,
    lexi_feedback_positive,
    lexi_feedback_negative,
    lexi_satisfaction_rate,
    -- Persona 5
    lexi_persona_student,
    lexi_persona_tutor,
    lexi_persona_client,
    lexi_persona_agent,
    lexi_persona_organisation,
    -- Provider 3
    lexi_provider_rules,
    lexi_provider_claude,
    lexi_provider_gemini,
    -- Quota 4
    lexi_daily_usage,
    lexi_limit_hits,
    lexi_total_users,
    lexi_avg_conversations_per_user,
    -- Cost 5
    lexi_ai_cost_total,
    lexi_cost_per_conversation,
    lexi_free_usage_percent,
    lexi_paid_usage_percent,
    lexi_monthly_projection
  )
  VALUES (
    p_date,
    -- Core 7
    v_conversations_total,
    v_messages_total,
    v_unique_users,
    v_avg_messages_per_conversation,
    v_feedback_positive,
    v_feedback_negative,
    v_satisfaction_rate,
    -- Persona 5
    v_persona_student,
    v_persona_tutor,
    v_persona_client,
    v_persona_agent,
    v_persona_organisation,
    -- Provider 3
    v_provider_rules,
    v_provider_claude,
    v_provider_gemini,
    -- Quota 4
    v_daily_usage,
    v_limit_hits,
    v_total_users,
    v_avg_conversations_per_user,
    -- Cost 5
    v_ai_cost_total,
    v_cost_per_conversation,
    v_free_usage_percent,
    v_paid_usage_percent,
    v_monthly_projection
  )
  ON CONFLICT (date) DO UPDATE
  SET
    -- Core 7
    lexi_conversations_total = EXCLUDED.lexi_conversations_total,
    lexi_messages_total = EXCLUDED.lexi_messages_total,
    lexi_unique_users = EXCLUDED.lexi_unique_users,
    lexi_avg_messages_per_conversation = EXCLUDED.lexi_avg_messages_per_conversation,
    lexi_feedback_positive = EXCLUDED.lexi_feedback_positive,
    lexi_feedback_negative = EXCLUDED.lexi_feedback_negative,
    lexi_satisfaction_rate = EXCLUDED.lexi_satisfaction_rate,
    -- Persona 5
    lexi_persona_student = EXCLUDED.lexi_persona_student,
    lexi_persona_tutor = EXCLUDED.lexi_persona_tutor,
    lexi_persona_client = EXCLUDED.lexi_persona_client,
    lexi_persona_agent = EXCLUDED.lexi_persona_agent,
    lexi_persona_organisation = EXCLUDED.lexi_persona_organisation,
    -- Provider 3
    lexi_provider_rules = EXCLUDED.lexi_provider_rules,
    lexi_provider_claude = EXCLUDED.lexi_provider_claude,
    lexi_provider_gemini = EXCLUDED.lexi_provider_gemini,
    -- Quota 4
    lexi_daily_usage = EXCLUDED.lexi_daily_usage,
    lexi_limit_hits = EXCLUDED.lexi_limit_hits,
    lexi_total_users = EXCLUDED.lexi_total_users,
    lexi_avg_conversations_per_user = EXCLUDED.lexi_avg_conversations_per_user,
    -- Cost 5
    lexi_ai_cost_total = EXCLUDED.lexi_ai_cost_total,
    lexi_cost_per_conversation = EXCLUDED.lexi_cost_per_conversation,
    lexi_free_usage_percent = EXCLUDED.lexi_free_usage_percent,
    lexi_paid_usage_percent = EXCLUDED.lexi_paid_usage_percent,
    lexi_monthly_projection = EXCLUDED.lexi_monthly_projection;

  -- Build comprehensive result summary
  v_result := jsonb_build_object(
    'date', p_date,
    'metrics', jsonb_build_object(
      'core', jsonb_build_object(
        'conversations_total', v_conversations_total,
        'messages_total', v_messages_total,
        'unique_users', v_unique_users,
        'avg_messages_per_conversation', v_avg_messages_per_conversation,
        'feedback_positive', v_feedback_positive,
        'feedback_negative', v_feedback_negative,
        'satisfaction_rate', v_satisfaction_rate
      ),
      'personas', jsonb_build_object(
        'student', v_persona_student,
        'tutor', v_persona_tutor,
        'client', v_persona_client,
        'agent', v_persona_agent,
        'organisation', v_persona_organisation
      ),
      'providers', jsonb_build_object(
        'rules', v_provider_rules,
        'claude', v_provider_claude,
        'gemini', v_provider_gemini
      ),
      'quota', jsonb_build_object(
        'daily_usage', v_daily_usage,
        'limit_hits', v_limit_hits,
        'total_users', v_total_users,
        'avg_conversations_per_user', v_avg_conversations_per_user
      ),
      'costs', jsonb_build_object(
        'ai_cost_total', v_ai_cost_total,
        'cost_per_conversation', v_cost_per_conversation,
        'free_usage_percent', v_free_usage_percent,
        'paid_usage_percent', v_paid_usage_percent,
        'monthly_projection', v_monthly_projection
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
  'aggregate-lexi-statistics',
  '0 0 * * *',
  $$SELECT aggregate_lexi_statistics(CURRENT_DATE);$$
);

-- Will get a new jobid (likely 55 or next available)

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify all 24 columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'platform_statistics_daily'
  AND column_name LIKE 'lexi_%'
ORDER BY ordinal_position;

-- Expected output (24 columns):
-- column_name                          | data_type | column_default
-- -------------------------------------|-----------|---------------
-- lexi_conversations_total             | integer   | 0
-- lexi_messages_total                  | integer   | 0
-- lexi_unique_users                    | integer   | 0
-- lexi_avg_messages_per_conversation   | numeric   | 0
-- lexi_feedback_positive               | integer   | 0
-- lexi_feedback_negative               | integer   | 0
-- lexi_satisfaction_rate               | numeric   | 0
-- lexi_persona_student                 | integer   | 0
-- lexi_persona_tutor                   | integer   | 0
-- lexi_persona_client                  | integer   | 0
-- lexi_persona_agent                   | integer   | 0
-- lexi_persona_organisation            | integer   | 0
-- lexi_provider_rules                  | integer   | 0
-- lexi_provider_claude                 | integer   | 0
-- lexi_provider_gemini                 | integer   | 0
-- lexi_daily_usage                     | integer   | 0
-- lexi_limit_hits                      | integer   | 0
-- lexi_total_users                     | integer   | 0
-- lexi_avg_conversations_per_user      | numeric   | 0
-- lexi_ai_cost_total                   | numeric   | 0
-- lexi_cost_per_conversation           | numeric   | 0
-- lexi_free_usage_percent              | numeric   | 0
-- lexi_paid_usage_percent              | numeric   | 0
-- lexi_monthly_projection              | numeric   | 0

-- Verify function exists
SELECT proname, pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'aggregate_lexi_statistics';

-- Verify cron job is scheduled
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'aggregate-lexi-statistics';

-- Test function manually
SELECT aggregate_lexi_statistics(CURRENT_DATE);

-- Verify data was inserted (all 24 metrics)
SELECT
  date,
  -- Core 7
  lexi_conversations_total, lexi_messages_total, lexi_unique_users,
  lexi_avg_messages_per_conversation, lexi_feedback_positive, lexi_feedback_negative, lexi_satisfaction_rate,
  -- Persona 5
  lexi_persona_student, lexi_persona_tutor, lexi_persona_client, lexi_persona_agent, lexi_persona_organisation,
  -- Provider 3
  lexi_provider_rules, lexi_provider_claude, lexi_provider_gemini,
  -- Quota 4
  lexi_daily_usage, lexi_limit_hits, lexi_total_users, lexi_avg_conversations_per_user,
  -- Cost 5
  lexi_ai_cost_total, lexi_cost_per_conversation, lexi_free_usage_percent,
  lexi_paid_usage_percent, lexi_monthly_projection
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
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'aggregate-lexi-statistics'
)
ORDER BY start_time DESC
LIMIT 10;

-- ========================================
-- DETAILED NOTES
-- ========================================

-- METRICS COLLECTED (24 Total):
--
-- Core Metrics (7):
-- 1. lexi_conversations_total: Total number of Lexi conversations
-- 2. lexi_messages_total: Total number of messages (user + assistant)
-- 3. lexi_unique_users: Unique users who have used Lexi
-- 4. lexi_avg_messages_per_conversation: Average messages per conversation
-- 5. lexi_feedback_positive: Positive feedback count (thumbs up)
-- 6. lexi_feedback_negative: Negative feedback count (thumbs down)
-- 7. lexi_satisfaction_rate: Percentage of positive feedback
--
-- Persona Metrics (5):
-- 8. lexi_persona_student: Conversations from student persona
-- 9. lexi_persona_tutor: Conversations from tutor persona
-- 10. lexi_persona_client: Conversations from client (parent) persona
-- 11. lexi_persona_agent: Conversations from agent persona
-- 12. lexi_persona_organisation: Conversations from organisation persona
--
-- Provider Metrics (3):
-- 13. lexi_provider_rules: Rules-based conversations (free, no AI cost)
-- 14. lexi_provider_claude: Claude (Anthropic) conversations
-- 15. lexi_provider_gemini: Gemini (Google) conversations
--
-- Quota Metrics (4):
-- 16. lexi_daily_usage: Conversations created today
-- 17. lexi_limit_hits: Users hitting conversation limits today
-- 18. lexi_total_users: Total authenticated users
-- 19. lexi_avg_conversations_per_user: Average conversations per user
--
-- Cost Metrics (5):
-- 20. lexi_ai_cost_total: Total AI provider costs
-- 21. lexi_cost_per_conversation: Average cost per conversation
-- 22. lexi_free_usage_percent: Percentage of free (rules-based) usage
-- 23. lexi_paid_usage_percent: Percentage of paid (AI) usage
-- 24. lexi_monthly_projection: Estimated monthly cost based on daily usage

-- TABLES USED:
-- - lexi_conversations: Conversation records (user_id, persona, provider, created_at)
-- - lexi_messages: Messages and feedback (role, content, feedback)
-- - platform_statistics_daily: Aggregated metrics storage

-- CRON SCHEDULE:
-- - Runs daily at 00:00 UTC
-- - Job Name: aggregate-lexi-statistics
-- - Command: SELECT aggregate_lexi_statistics(CURRENT_DATE);

-- FRONTEND USAGE:
-- - Hook: useAdminMetric({ metric: 'lexi_conversations_total', compareWith: 'last_month' })
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
-- - Matches Sage/Listings/Bookings admin pages design
-- - Uses HubKPICard, HubKPIGrid, HubTrendChart, HubCategoryBreakdownChart
-- - Consistent styling and user experience across admin dashboard

-- ========================================
-- ROLLBACK (if needed)
-- ========================================

/*
-- To remove the cron job:
SELECT cron.unschedule('aggregate-lexi-statistics');

-- To drop the function:
DROP FUNCTION IF EXISTS aggregate_lexi_statistics(DATE);

-- To remove all 24 columns:
ALTER TABLE platform_statistics_daily
DROP COLUMN IF EXISTS lexi_conversations_total,
DROP COLUMN IF EXISTS lexi_messages_total,
DROP COLUMN IF EXISTS lexi_unique_users,
DROP COLUMN IF EXISTS lexi_avg_messages_per_conversation,
DROP COLUMN IF EXISTS lexi_feedback_positive,
DROP COLUMN IF EXISTS lexi_feedback_negative,
DROP COLUMN IF EXISTS lexi_satisfaction_rate,
DROP COLUMN IF EXISTS lexi_persona_student,
DROP COLUMN IF EXISTS lexi_persona_tutor,
DROP COLUMN IF EXISTS lexi_persona_client,
DROP COLUMN IF EXISTS lexi_persona_agent,
DROP COLUMN IF EXISTS lexi_persona_organisation,
DROP COLUMN IF EXISTS lexi_provider_rules,
DROP COLUMN IF EXISTS lexi_provider_claude,
DROP COLUMN IF EXISTS lexi_provider_gemini,
DROP COLUMN IF EXISTS lexi_daily_usage,
DROP COLUMN IF EXISTS lexi_limit_hits,
DROP COLUMN IF EXISTS lexi_total_users,
DROP COLUMN IF EXISTS lexi_avg_conversations_per_user,
DROP COLUMN IF EXISTS lexi_ai_cost_total,
DROP COLUMN IF EXISTS lexi_cost_per_conversation,
DROP COLUMN IF EXISTS lexi_free_usage_percent,
DROP COLUMN IF EXISTS lexi_paid_usage_percent,
DROP COLUMN IF EXISTS lexi_monthly_projection;
*/

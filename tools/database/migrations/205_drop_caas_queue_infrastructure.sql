/**
 * Migration 205: Drop CaaS Queue Infrastructure
 *
 * Purpose:
 * - Remove old queue-based CaaS recalculation system
 * - Clean up queue table, triggers, and functions
 * - Complete migration to Tier 1 (Immediate) architecture
 *
 * What Gets Removed:
 * - caas_recalculation_queue table
 * - Queue-insertion trigger functions (if any remain)
 * - Related indexes and constraints
 *
 * Created: 2026-01-22
 * Version: 6.1 (Immediate Triggers)
 */

-- ================================================================
-- STEP 1: DROP QUEUE TABLE
-- ================================================================

-- Drop the queue table (CASCADE removes dependent objects)
DROP TABLE IF EXISTS caas_recalculation_queue CASCADE;

-- ================================================================
-- STEP 2: DROP OLD TRIGGER FUNCTIONS (if they still exist)
-- ================================================================

-- These functions were used by migrations 200-202
-- They should already be removed by migration 204, but let's be thorough

DROP FUNCTION IF EXISTS queue_caas_on_listing_publish() CASCADE;
DROP FUNCTION IF EXISTS queue_caas_on_booking_payment() CASCADE;
DROP FUNCTION IF EXISTS queue_caas_on_referral_created() CASCADE;
DROP FUNCTION IF EXISTS queue_caas_on_referral_conversion() CASCADE;
DROP FUNCTION IF EXISTS queue_profile_for_caas_recalc() CASCADE;

-- ================================================================
-- STEP 3: VERIFY CLEANUP
-- ================================================================

DO $$
DECLARE
  v_queue_triggers INT;
  v_immediate_triggers INT;
BEGIN
  -- Count any remaining queue-based triggers
  SELECT COUNT(*)
  INTO v_queue_triggers
  FROM information_schema.triggers
  WHERE trigger_name LIKE '%queue%caas%' OR trigger_name LIKE 'trigger_queue%';

  -- Count immediate triggers
  SELECT COUNT(*)
  INTO v_immediate_triggers
  FROM information_schema.triggers
  WHERE trigger_name LIKE 'trigger_caas_immediate%';

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Migration 205: Drop CaaS Queue Infrastructure - COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Removed:';
  RAISE NOTICE '  ✓ caas_recalculation_queue table';
  RAISE NOTICE '  ✓ Old queue-insertion trigger functions';
  RAISE NOTICE '  ✓ Related indexes and constraints';
  RAISE NOTICE '';
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  Queue-based triggers remaining: %', v_queue_triggers;
  RAISE NOTICE '  Immediate triggers active: %', v_immediate_triggers;
  RAISE NOTICE '';

  IF v_queue_triggers > 0 THEN
    RAISE WARNING 'Found % queue-based triggers still active! Manual cleanup may be needed.', v_queue_triggers;
  ELSE
    RAISE NOTICE '  ✅ All queue-based triggers removed successfully';
  END IF;

  IF v_immediate_triggers = 0 THEN
    RAISE WARNING 'No immediate triggers found! Migration 204 may not have run.';
  ELSE
    RAISE NOTICE '  ✅ Immediate triggers operational';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Architecture: Tier 1 (Immediate) - Queue-Free';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update Next.js to poll caas_calculation_events';
  RAISE NOTICE '  2. Remove /api/caas-worker endpoint';
  RAISE NOTICE '  3. Remove Vercel cron job from vercel.json';
  RAISE NOTICE '  4. Run backfill script for existing users';
  RAISE NOTICE '';
END $$;

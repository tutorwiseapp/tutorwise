/**
 * Migration 204: Attach Immediate CaaS Calculation Triggers (CORRECTED)
 *
 * Purpose:
 * - Attach immediate calculation triggers to all CaaS-affecting events
 * - Replaces queue-insertion triggers with direct calculation triggers
 * - Implements Tier 1 (Immediate) architecture
 *
 * Schema-Aware:
 * - Uses actual column names from database
 * - Uses correct enum values (Paid, not Completed; Converted, not converted)
 * - Uses actual table names (profile_reviews, student_integration_links)
 *
 * Created: 2026-01-22
 * Version: 6.1 (Immediate Triggers - Corrected)
 */

-- ================================================================
-- PROFILES TABLE: Verification & Profile Completion Events
-- ================================================================

-- Drop old queue-based trigger if exists
DROP TRIGGER IF EXISTS trigger_queue_on_profile_update ON profiles;

-- Create immediate calculation trigger
CREATE TRIGGER trigger_caas_immediate_on_profile_update
  AFTER UPDATE OF
    identity_verified,
    dbs_verified,
    dbs_expiry_date,
    proof_of_address_verified,
    business_verified,
    bio,
    bio_video_url,
    avatar_url,
    onboarding_progress
  ON profiles
  FOR EACH ROW
  WHEN (
    -- Only trigger if relevant fields actually changed
    NEW.identity_verified IS DISTINCT FROM OLD.identity_verified OR
    NEW.dbs_verified IS DISTINCT FROM OLD.dbs_verified OR
    NEW.dbs_expiry_date IS DISTINCT FROM OLD.dbs_expiry_date OR
    NEW.proof_of_address_verified IS DISTINCT FROM OLD.proof_of_address_verified OR
    NEW.business_verified IS DISTINCT FROM OLD.business_verified OR
    NEW.bio IS DISTINCT FROM OLD.bio OR
    NEW.bio_video_url IS DISTINCT FROM OLD.bio_video_url OR
    NEW.avatar_url IS DISTINCT FROM OLD.avatar_url OR
    NEW.onboarding_progress IS DISTINCT FROM OLD.onboarding_progress
  )
  EXECUTE FUNCTION trigger_recalculate_caas_immediate();

COMMENT ON TRIGGER trigger_caas_immediate_on_profile_update ON profiles IS
  'v6.1 Immediate CaaS recalculation on profile updates (verification, credentials, completeness)';

-- ================================================================
-- LISTINGS TABLE: Publish Events
-- ================================================================

-- Drop old queue-based trigger
DROP TRIGGER IF EXISTS trigger_queue_on_listing_publish ON listings;

-- Create immediate calculation trigger
CREATE TRIGGER trigger_caas_immediate_on_listing_publish
  AFTER INSERT OR UPDATE OF status
  ON listings
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION trigger_recalculate_caas_immediate();

COMMENT ON TRIGGER trigger_caas_immediate_on_listing_publish ON listings IS
  'v6.1 Immediate CaaS recalculation when listing is published (Delivery bucket)';

-- ================================================================
-- BOOKINGS TABLE: Completion + Payment Events
-- ================================================================

-- Drop old queue-based triggers
DROP TRIGGER IF EXISTS trigger_queue_on_booking_payment ON bookings;
DROP TRIGGER IF EXISTS trigger_queue_on_booking_completion ON bookings;

-- Create immediate calculation trigger
-- Note: payment_status uses transaction_status_enum ('Paid', not 'Completed')
-- Note: status uses booking_status_enum ('Completed')
CREATE TRIGGER trigger_caas_immediate_on_booking_complete
  AFTER UPDATE OF status, payment_status
  ON bookings
  FOR EACH ROW
  WHEN (
    NEW.status = 'Completed' AND
    NEW.payment_status = 'Paid' AND
    (
      OLD.status != 'Completed' OR
      OLD.payment_status != 'Paid'
    )
  )
  EXECUTE FUNCTION trigger_recalculate_caas_immediate();

COMMENT ON TRIGGER trigger_caas_immediate_on_booking_complete ON bookings IS
  'v6.1 Immediate CaaS recalculation on booking completion (Delivery bucket for tutor, client, agent)';

-- ================================================================
-- REFERRALS TABLE: Creation + Conversion Events
-- ================================================================

-- Drop old queue-based triggers
DROP TRIGGER IF EXISTS trigger_queue_on_referral_created ON referrals;
DROP TRIGGER IF EXISTS trigger_queue_on_referral_conversion ON referrals;

-- Trigger on referral creation (agent gets credit immediately)
CREATE TRIGGER trigger_caas_immediate_on_referral_created
  AFTER INSERT
  ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_caas_immediate();

-- Trigger on referral conversion (agent gets boost, referred user gets initial score)
-- Note: status uses referral_status_enum ('Converted', not 'converted')
CREATE TRIGGER trigger_caas_immediate_on_referral_conversion
  AFTER UPDATE OF status
  ON referrals
  FOR EACH ROW
  WHEN (NEW.status = 'Converted' AND OLD.status != 'Converted')
  EXECUTE FUNCTION trigger_recalculate_caas_immediate();

COMMENT ON TRIGGER trigger_caas_immediate_on_referral_created ON referrals IS
  'v6.1 Immediate CaaS recalculation on referral creation (Network bucket for agent)';

COMMENT ON TRIGGER trigger_caas_immediate_on_referral_conversion ON referrals IS
  'v6.1 Immediate CaaS recalculation on referral conversion (Network bucket boost for agent + referred user)';

-- ================================================================
-- PROFILE_REVIEWS TABLE: New Review Events
-- ================================================================

-- Drop old queue-based trigger if exists (from old 'reviews' table)
DROP TRIGGER IF EXISTS trigger_queue_on_new_review ON profile_reviews;

-- Create immediate calculation trigger
CREATE TRIGGER trigger_caas_immediate_on_new_review
  AFTER INSERT OR UPDATE OF rating
  ON profile_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_caas_immediate();

COMMENT ON TRIGGER trigger_caas_immediate_on_new_review ON profile_reviews IS
  'v6.1 Immediate CaaS recalculation on new review (Delivery bucket rating)';

-- ================================================================
-- PROFILE_GRAPH TABLE: Social Connection Events
-- ================================================================

-- Drop old queue-based trigger if exists
DROP TRIGGER IF EXISTS trigger_queue_on_profile_graph_change ON profile_graph;

-- Create immediate calculation trigger
CREATE TRIGGER trigger_caas_immediate_on_connection_change
  AFTER INSERT OR DELETE
  ON profile_graph
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_caas_immediate();

COMMENT ON TRIGGER trigger_caas_immediate_on_connection_change ON profile_graph IS
  'v6.1 Immediate CaaS recalculation on social connection change (Network bucket)';

-- ================================================================
-- STUDENT_INTEGRATION_LINKS TABLE: Digital Integration Events
-- ================================================================

-- Drop old queue-based trigger if exists
DROP TRIGGER IF EXISTS trigger_queue_on_integration_link_change ON student_integration_links;

-- Create immediate calculation trigger
CREATE TRIGGER trigger_caas_immediate_on_integration_change
  AFTER INSERT OR UPDATE OR DELETE
  ON student_integration_links
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_caas_immediate();

COMMENT ON TRIGGER trigger_caas_immediate_on_integration_change ON student_integration_links IS
  'v6.1 Immediate CaaS recalculation on integration link change (Digital bucket)';

-- ================================================================
-- BOOKINGS TABLE: Recording URL Updates (Lessonspace)
-- ================================================================

-- Note: Check if recording_url column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'recording_url'
  ) THEN
    -- Drop old queue-based trigger if exists
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_queue_on_recording_url_update ON bookings';

    -- Create immediate calculation trigger
    EXECUTE 'CREATE TRIGGER trigger_caas_immediate_on_recording_url_added
      AFTER UPDATE OF recording_url
      ON bookings
      FOR EACH ROW
      WHEN (NEW.recording_url IS NOT NULL AND OLD.recording_url IS NULL)
      EXECUTE FUNCTION trigger_recalculate_caas_immediate()';

    RAISE NOTICE '✓ Recording URL trigger created';
  ELSE
    RAISE NOTICE 'ℹ recording_url column does not exist - skipping trigger';
  END IF;
END $$;

-- ================================================================
-- FREE_HELP_SESSIONS TABLE: Impact Bucket Events
-- ================================================================

-- Check if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'free_help_sessions') THEN
    -- Drop old queue-based trigger if exists
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_queue_caas_for_free_help ON free_help_sessions';

    -- Create immediate calculation trigger
    EXECUTE 'CREATE TRIGGER trigger_caas_immediate_on_free_help_complete
      AFTER UPDATE OF status
      ON free_help_sessions
      FOR EACH ROW
      WHEN (NEW.status = ''completed'' AND OLD.status != ''completed'')
      EXECUTE FUNCTION trigger_recalculate_caas_immediate()';

    RAISE NOTICE '✓ Free help sessions trigger created';
  ELSE
    RAISE NOTICE 'ℹ Free help sessions table does not exist - skipping trigger';
  END IF;
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
DECLARE
  v_trigger_count INT;
BEGIN
  -- Count all caas_immediate triggers
  SELECT COUNT(*)
  INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name LIKE 'trigger_caas_immediate%';

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Migration 204: CaaS Immediate Triggers - COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Immediate triggers attached: %', v_trigger_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Coverage:';
  RAISE NOTICE '  ✓ Profile updates (verification, credentials, completeness)';
  RAISE NOTICE '  ✓ Listing publish';
  RAISE NOTICE '  ✓ Booking completion + payment';
  RAISE NOTICE '  ✓ Referral creation + conversion';
  RAISE NOTICE '  ✓ Review submission';
  RAISE NOTICE '  ✓ Social connections';
  RAISE NOTICE '  ✓ Integration links (Calendar, Classroom)';
  RAISE NOTICE '  ✓ Recording URL updates (if column exists)';
  RAISE NOTICE '  ✓ Free help sessions (if table exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'Old queue-based triggers: REMOVED';
  RAISE NOTICE 'Architecture: Tier 1 (Immediate) - Event-Driven';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Apply migration 205 to drop queue infrastructure';
  RAISE NOTICE '  2. Test immediate triggers on staging';
  RAISE NOTICE '  3. Run backfill script for existing users';
  RAISE NOTICE '';
END $$;

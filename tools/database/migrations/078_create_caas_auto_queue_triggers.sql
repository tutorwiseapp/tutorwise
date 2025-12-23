-- ===================================================================
-- Migration: 078_create_caas_auto_queue_triggers.sql
-- Purpose: Create database triggers to auto-queue CaaS score recalculations (v5.5)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: profiles, reviews, profile_graph, caas_recalculation_queue tables exist
-- ===================================================================
-- This migration creates database triggers that automatically add profiles to the
-- caas_recalculation_queue when relevant data changes (e.g., new review, profile update).
-- This ensures CaaS scores are always up-to-date without manual intervention.
-- ===================================================================

-- ===================================================================
-- HELPER FUNCTION: QUEUE_CAAS_RECALCULATION
-- ===================================================================
-- This function is called by multiple triggers to queue a profile for recalculation.
-- Uses ON CONFLICT DO NOTHING to prevent duplicate queue entries (idempotent).
-- ===================================================================

CREATE OR REPLACE FUNCTION public.queue_caas_recalculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue the profile for CaaS score recalculation
  -- ON CONFLICT DO NOTHING ensures we don't create duplicates (table has UNIQUE constraint on profile_id)
  INSERT INTO public.caas_recalculation_queue (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.queue_caas_recalculation() IS
'v5.5: Helper function to queue a profile for CaaS score recalculation.
Called by triggers when relevant data changes (profile updates, new reviews, etc).
Uses ON CONFLICT DO NOTHING to prevent duplicate queue entries.';

-- ===================================================================
-- HELPER FUNCTION: QUEUE_CAAS_FOR_TUTOR (for bookings/reviews)
-- ===================================================================
-- This function queues the TUTOR (listing owner) when booking/review data changes.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.queue_caas_for_tutor()
RETURNS TRIGGER AS $$
DECLARE
  v_tutor_id UUID;
BEGIN
  -- For reviews table: NEW.receiver_id is the tutor
  IF TG_TABLE_NAME = 'reviews' THEN
    v_tutor_id := NEW.receiver_id;
  -- For bookings table: Need to lookup tutor from listings
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    SELECT l.profile_id INTO v_tutor_id
    FROM public.listings l
    WHERE l.id = NEW.listing_id;
  END IF;

  -- Queue the tutor for recalculation
  IF v_tutor_id IS NOT NULL THEN
    INSERT INTO public.caas_recalculation_queue (profile_id)
    VALUES (v_tutor_id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.queue_caas_for_tutor() IS
'v5.5: Helper function to queue the tutor for CaaS score recalculation.
Extracts tutor_id from reviews (receiver_id) or bookings (via listings join).
Called by triggers on reviews and bookings tables.';

-- ===================================================================
-- HELPER FUNCTION: QUEUE_CAAS_FOR_BOTH_PROFILES (for profile_graph)
-- ===================================================================
-- This function queues BOTH source and target when profile_graph changes.
-- Used for SOCIAL connections and AGENT_REFERRAL relationships.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.queue_caas_for_both_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue both source and target profiles for recalculation
  INSERT INTO public.caas_recalculation_queue (profile_id)
  VALUES (NEW.source_profile_id), (NEW.target_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.queue_caas_for_both_profiles() IS
'v5.5: Helper function to queue both source and target profiles for CaaS recalculation.
Used when profile_graph relationships change (SOCIAL connections, AGENT_REFERRAL links).
Both users scores may be affected by network changes.';

-- ===================================================================
-- TRIGGER 1: ON PROFILE UPDATES (Qualifications, Verifications)
-- ===================================================================
-- Queue recalculation when tutor updates their profile fields that affect CaaS score
-- ===================================================================

CREATE TRIGGER trigger_queue_on_profile_update
AFTER UPDATE OF identity_verified, dbs_verified, dbs_expiry, qualifications,
               teaching_experience, degree_level, bio_video_url
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.queue_caas_recalculation();

COMMENT ON TRIGGER trigger_queue_on_profile_update ON public.profiles IS
'v5.5: Auto-queue CaaS recalculation when profile fields affecting score are updated.
Triggers on: identity_verified, dbs_verified, dbs_expiry, qualifications, teaching_experience, degree_level, bio_video_url.
Affects Buckets 2 (Qualifications), 4 (Safety), 5 (Digital Professionalism).';

-- ===================================================================
-- TRIGGER 2: ON NEW REVIEWS (Performance)
-- ===================================================================
-- Queue tutor recalculation when they receive a new review
-- ===================================================================

CREATE TRIGGER trigger_queue_on_new_review
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.queue_caas_for_tutor();

COMMENT ON TRIGGER trigger_queue_on_new_review ON public.reviews IS
'v5.5: Auto-queue tutor CaaS recalculation when they receive a new review.
Affects Bucket 1 (Performance & Quality) - avg_rating changes.';

-- ===================================================================
-- TRIGGER 3: ON BOOKING STATUS CHANGES (Performance, Retention)
-- ===================================================================
-- Queue tutor recalculation when bookings are completed (affects session count and retention)
-- ===================================================================

CREATE TRIGGER trigger_queue_on_booking_completion
AFTER UPDATE OF status
ON public.bookings
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION public.queue_caas_for_tutor();

COMMENT ON TRIGGER trigger_queue_on_booking_completion ON public.bookings IS
'v5.5: Auto-queue tutor CaaS recalculation when booking status changes to completed.
Affects Bucket 1 (Performance) - completed_sessions and retention_rate.';

-- ===================================================================
-- TRIGGER 4: ON RECORDING URL UPDATES (Digital Professionalism)
-- ===================================================================
-- Queue tutor recalculation when recording_url is added (Lessonspace integration used)
-- ===================================================================

CREATE TRIGGER trigger_queue_on_recording_url_update
AFTER UPDATE OF recording_url
ON public.bookings
FOR EACH ROW
WHEN (NEW.recording_url IS NOT NULL AND OLD.recording_url IS NULL)
EXECUTE FUNCTION public.queue_caas_for_tutor();

COMMENT ON TRIGGER trigger_queue_on_recording_url_update ON public.bookings IS
'v5.5: Auto-queue tutor CaaS recalculation when recording_url is added to booking.
Affects Bucket 5 (Digital Professionalism) - lessonspace_usage_rate increases.';

-- ===================================================================
-- TRIGGER 5: ON PROFILE_GRAPH CHANGES (Network & Referrals)
-- ===================================================================
-- Queue recalculation when SOCIAL or AGENT_REFERRAL relationships change
-- ===================================================================

CREATE TRIGGER trigger_queue_on_profile_graph_change
AFTER INSERT OR UPDATE OF status
ON public.profile_graph
FOR EACH ROW
WHEN (NEW.relationship_type IN ('SOCIAL', 'AGENT_REFERRAL'))
EXECUTE FUNCTION public.queue_caas_for_both_profiles();

COMMENT ON TRIGGER trigger_queue_on_profile_graph_change ON public.profile_graph IS
'v5.5: Auto-queue CaaS recalculation for both profiles when SOCIAL or AGENT_REFERRAL relationships change.
Affects Bucket 3 (Network & Referrals) - connection_count and referral_count.';

-- ===================================================================
-- TRIGGER 6: ON INTEGRATION LINK CHANGES (Digital Professionalism)
-- ===================================================================
-- Queue recalculation when Google Calendar/Classroom is connected
-- ===================================================================

CREATE TRIGGER trigger_queue_on_integration_link_change
AFTER INSERT OR UPDATE OF is_active
ON public.student_integration_links
FOR EACH ROW
WHEN (NEW.integration_type IN ('GOOGLE_CALENDAR', 'GOOGLE_CLASSROOM') AND NEW.is_active = true)
EXECUTE FUNCTION public.queue_caas_recalculation();

COMMENT ON TRIGGER trigger_queue_on_integration_link_change ON public.student_integration_links IS
'v5.5: Auto-queue CaaS recalculation when Google Calendar/Classroom is connected.
Affects Bucket 5 (Digital Professionalism) - integration bonus points.';

-- ===================================================================
-- SECTION 4: GRANT PERMISSIONS
-- ===================================================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.queue_caas_recalculation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_caas_for_tutor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_caas_for_both_profiles() TO authenticated;

-- ===================================================================
-- SECTION 5: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  function_count INTEGER;
  trigger_count INTEGER;
BEGIN
  -- Count helper functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('queue_caas_recalculation', 'queue_caas_for_tutor', 'queue_caas_for_both_profiles')
  AND pronamespace = 'public'::regnamespace;

  IF function_count != 3 THEN
    RAISE EXCEPTION 'Expected 3 queue helper functions, found %', function_count;
  END IF;

  -- Count triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname LIKE 'trigger_queue_%';

  IF trigger_count != 6 THEN
    RAISE EXCEPTION 'Expected 6 CaaS queue triggers, found %', trigger_count;
  END IF;

  RAISE NOTICE 'Migration 078 completed successfully';
  RAISE NOTICE 'Queue helper functions created: %', function_count;
  RAISE NOTICE 'CaaS auto-queue triggers created: %', trigger_count;
  RAISE NOTICE 'Triggers installed on:';
  RAISE NOTICE '  - profiles (UPDATE: qualifications, verifications, bio_video_url)';
  RAISE NOTICE '  - reviews (INSERT: new reviews)';
  RAISE NOTICE '  - bookings (UPDATE: status completed, recording_url added)';
  RAISE NOTICE '  - profile_graph (INSERT/UPDATE: SOCIAL and AGENT_REFERRAL)';
  RAISE NOTICE '  - student_integration_links (INSERT/UPDATE: Google integrations)';
  RAISE NOTICE 'CaaS scores will now auto-update when relevant data changes';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================

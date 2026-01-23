-- Migration 212: Fix CaaS trigger to use profile_id instead of tutor_id for listings
-- Created: 2026-01-22
-- Issue: trigger_recalculate_caas_immediate was referencing NEW.tutor_id for listings table,
--        but listings table uses profile_id column, not tutor_id

CREATE OR REPLACE FUNCTION public.trigger_recalculate_caas_immediate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Determine which profile ID to recalculate
  -- Different tables have different column names

  IF TG_TABLE_NAME = 'profiles' THEN
    v_profile_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'listings' THEN
    v_profile_id := NEW.profile_id;  -- FIXED: Changed from NEW.tutor_id to NEW.profile_id
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    -- Recalculate for tutor, client, and agent (if exists)
    PERFORM trigger_caas_recalculation_http(NEW.tutor_id);
    PERFORM trigger_caas_recalculation_http(NEW.client_id);

    -- Check if there's an agent referral
    IF EXISTS (
      SELECT 1 FROM referrals
      WHERE referred_user_id = NEW.tutor_id
      AND referral_type = 'AGENT_REFERRAL'
      LIMIT 1
    ) THEN
      PERFORM trigger_caas_recalculation_http(
        (SELECT referrer_id FROM referrals
         WHERE referred_user_id = NEW.tutor_id
         AND referral_type = 'AGENT_REFERRAL'
         LIMIT 1)
      );
    END IF;

    RETURN NEW;
  ELSIF TG_TABLE_NAME = 'referrals' THEN
    -- Recalculate for both referrer and referred user
    PERFORM trigger_caas_recalculation_http(NEW.referrer_id);
    IF NEW.referred_user_id IS NOT NULL THEN
      PERFORM trigger_caas_recalculation_http(NEW.referred_user_id);
    END IF;
    RETURN NEW;
  ELSIF TG_TABLE_NAME = 'reviews' THEN
    v_profile_id := NEW.tutor_id;
  ELSIF TG_TABLE_NAME = 'profile_graph' THEN
    -- Recalculate for both profiles in the connection
    PERFORM trigger_caas_recalculation_http(NEW.profile_id);
    PERFORM trigger_caas_recalculation_http(NEW.connected_profile_id);
    RETURN NEW;
  ELSIF TG_TABLE_NAME = 'integration_links' THEN
    v_profile_id := NEW.profile_id;
  ELSE
    -- Unknown table, try to find profile_id column
    v_profile_id := NEW.profile_id;
  END IF;

  -- Trigger the calculation
  IF v_profile_id IS NOT NULL THEN
    PERFORM trigger_caas_recalculation_http(v_profile_id);
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION trigger_recalculate_caas_immediate() IS 'Fixed to use profile_id for listings table instead of tutor_id';

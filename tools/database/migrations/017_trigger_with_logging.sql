-- Migration 017: Add explicit logging to debug trigger
-- Purpose: Figure out why trigger isn't creating profiles

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_id TEXT;
BEGIN
  -- Log that trigger is firing
  RAISE NOTICE 'handle_new_user triggered for user %', NEW.id;

  BEGIN
    -- Generate referral_id
    v_referral_id := 'ref-' || substring(replace(NEW.id::text, '-', ''), 1, 10);

    RAISE NOTICE 'Attempting to create profile with referral_id: %', v_referral_id;

    -- Insert minimal profile
    INSERT INTO public.profiles (id, referral_id, email)
    VALUES (
      NEW.id,
      v_referral_id,
      NEW.email
    );

    RAISE NOTICE 'Profile created successfully for user %', NEW.id;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Log the exact error
    RAISE WARNING 'ERROR in handle_new_user for user %: % (SQLSTATE: %) DETAIL: %',
                  NEW.id, SQLERRM, SQLSTATE, SQLERRD;

    RETURN NEW; -- Still return NEW so user creation succeeds
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Creates profile on signup with detailed logging for debugging.';

-- Migration 021: Add default 'seeker' role to new user profiles
-- Purpose: Ensure all new users get the 'seeker' role by default so roles is never null

-- Update the trigger to set default role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_avatar_url TEXT;
  v_referral_id TEXT;
BEGIN
  BEGIN
    -- Generate referral_id
    v_referral_id := 'ref-' || substring(replace(NEW.id::text, '-', ''), 1, 10);

    -- Extract data from raw_user_meta_data
    -- Priority: first_name/last_name (our standard), fallback to given_name/family_name (OAuth)
    v_first_name := COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'given_name'
    );
    v_last_name := COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'family_name'
    );
    v_full_name := NEW.raw_user_meta_data->>'full_name';
    v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

    -- Parse full_name into first/last if needed
    IF v_full_name IS NOT NULL AND (v_first_name IS NULL OR v_last_name IS NULL) THEN
      v_first_name := COALESCE(v_first_name, split_part(v_full_name, ' ', 1));
      v_last_name := COALESCE(v_last_name, TRIM(substring(v_full_name from position(' ' in v_full_name || ' '))));
      IF v_last_name = '' THEN
        v_last_name := NULL;
      END IF;
    END IF;

    -- Construct full_name if we have first/last but not full
    IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL AND v_full_name IS NULL THEN
      v_full_name := v_first_name || ' ' || v_last_name;
    ELSIF v_first_name IS NOT NULL AND v_last_name IS NULL AND v_full_name IS NULL THEN
      v_full_name := v_first_name;
    END IF;

    -- Insert profile with all data including default 'seeker' role
    INSERT INTO public.profiles (
      id,
      referral_id,
      email,
      full_name,
      first_name,
      last_name,
      avatar_url,
      roles,
      active_role
    )
    VALUES (
      NEW.id,
      v_referral_id,
      NEW.email,
      v_full_name,
      v_first_name,
      v_last_name,
      v_avatar_url,
      ARRAY['seeker']::text[],  -- Default role for all new users
      'seeker'                   -- Default active role
    );

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for %: % (%)', NEW.id, SQLERRM, SQLSTATE;

    -- Fallback: try minimal profile with default role
    BEGIN
      INSERT INTO public.profiles (id, referral_id, email, roles, active_role)
      VALUES (NEW.id, v_referral_id, NEW.email, ARRAY['seeker']::text[], 'seeker');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Fallback also failed for %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Creates profile on signup with default seeker role. Uses first_name/last_name as standard, supports given_name/family_name for OAuth. Has robust error handling.';

-- Update existing profile with null roles to have default 'seeker' role
UPDATE public.profiles
SET
  roles = ARRAY['seeker']::text[],
  active_role = 'seeker'
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

-- Migration 016: Final handle_new_user with name extraction and robust error handling
-- Purpose: Extract names from metadata while ensuring signup never fails

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
    -- Generate referral_id from user ID (format: ref-{first 10 chars of uuid})
    v_referral_id := 'ref-' || substring(replace(NEW.id::text, '-', ''), 1, 10);

    -- Extract data from raw_user_meta_data (works for both email/password signup and OAuth)
    v_full_name := NEW.raw_user_meta_data->>'full_name';
    v_first_name := NEW.raw_user_meta_data->>'given_name'; -- Google OAuth provides this
    v_last_name := NEW.raw_user_meta_data->>'family_name'; -- Google OAuth provides this
    v_avatar_url := NEW.raw_user_meta_data->>'avatar_url'; -- Google OAuth provides this

    -- If we don't have first_name/last_name but we have full_name, parse it
    -- Simple logic: first word is first name, rest is last name
    IF v_full_name IS NOT NULL AND (v_first_name IS NULL OR v_last_name IS NULL) THEN
      v_first_name := COALESCE(v_first_name, split_part(v_full_name, ' ', 1));
      v_last_name := COALESCE(v_last_name, TRIM(substring(v_full_name from position(' ' in v_full_name || ' '))));
      -- Handle case where there's only one name (no space)
      IF v_last_name = '' THEN
        v_last_name := NULL;
      END IF;
    END IF;

    -- If we have first_name and last_name but not full_name, construct it
    IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL AND v_full_name IS NULL THEN
      v_full_name := v_first_name || ' ' || v_last_name;
    ELSIF v_first_name IS NOT NULL AND v_last_name IS NULL AND v_full_name IS NULL THEN
      v_full_name := v_first_name;
    END IF;

    -- Insert profile with all available data
    INSERT INTO profiles (
      id,
      referral_id,
      email,
      full_name,
      first_name,
      last_name,
      avatar_url
    )
    VALUES (
      NEW.id,
      v_referral_id,
      NEW.email,
      v_full_name,
      v_first_name,
      v_last_name,
      v_avatar_url
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;

    -- Try to create minimal profile as fallback
    BEGIN
      INSERT INTO profiles (id, referral_id, email)
      VALUES (NEW.id, v_referral_id, NEW.email)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Even fallback failed, just log and continue
      RAISE WARNING 'Fallback profile creation also failed for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW; -- Always return NEW so user creation succeeds
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Creates profile on user signup. Extracts name data from auth metadata (email/password or OAuth). Has robust error handling to never fail user creation.';

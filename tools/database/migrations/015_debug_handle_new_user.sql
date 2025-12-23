-- Migration 015: Add debugging and error handling to handle_new_user
-- Purpose: Figure out what's causing the signup failure

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_id TEXT;
BEGIN
  BEGIN
    -- Generate referral_id from user ID (format: ref-{first 10 chars of uuid})
    v_referral_id := 'ref-' || substring(replace(NEW.id::text, '-', ''), 1, 10);

    -- Insert minimal profile data
    INSERT INTO profiles (id, referral_id, email)
    VALUES (
      NEW.id,
      v_referral_id,
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW; -- Still return NEW so user creation succeeds
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Creates minimal profile on user signup with error handling.';

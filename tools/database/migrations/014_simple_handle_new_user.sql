-- Migration 014: Simplify handle_new_user to match working minimal version
-- Purpose: Strip down to essentials that we know work

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_id TEXT;
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Creates minimal profile on user signup. Name extraction will be added after we confirm this works.';

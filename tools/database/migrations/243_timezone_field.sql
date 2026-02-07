/**
 * Filename: tools/database/migrations/243_timezone_field.sql
 * Purpose: Add timezone preference field to profiles table
 * Created: 2026-02-07
 *
 * Enables per-user timezone preferences for accurate scheduling across regions.
 * Defaults to platform timezone (Europe/London).
 */

-- ===================================================================
-- 1. Add timezone field to profiles table
-- ===================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/London';

-- ===================================================================
-- 2. Add index for querying by timezone
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_timezone
  ON profiles(timezone);

-- ===================================================================
-- 3. Add comments for documentation
-- ===================================================================
COMMENT ON COLUMN profiles.timezone IS 'User timezone preference (IANA timezone name, e.g., Europe/London, America/New_York). Defaults to platform timezone.';

-- ===================================================================
-- 4. Update existing profiles to have platform timezone
-- ===================================================================
UPDATE profiles
SET timezone = 'Europe/London'
WHERE timezone IS NULL;

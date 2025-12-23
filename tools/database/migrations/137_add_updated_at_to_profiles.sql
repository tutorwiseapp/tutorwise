/*
 * Migration: 137_add_updated_at_to_profiles.sql
 * Purpose: Add updated_at column to profiles table with automatic trigger
 * Created: 2025-12-23
 *
 * This migration:
 * 1. Adds updated_at column to profiles table
 * 2. Creates a reusable trigger function to auto-update timestamps
 * 3. Applies the trigger to profiles table
 *
 * IMPORTANT: This migration is idempotent - safe to run multiple times
 */

-- ============================================
-- 1. Add updated_at column to profiles
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMENT ON COLUMN profiles.updated_at IS 'Timestamp of last profile update (automatically maintained by trigger)';

-- ============================================
-- 2. Create reusable trigger function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamp on row changes';

-- ============================================
-- 3. Apply trigger to profiles table
-- ============================================

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Create trigger for profiles table
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 137_add_updated_at_to_profiles.sql completed successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added updated_at column to profiles table';
  RAISE NOTICE 'Created update_updated_at_column() trigger function';
  RAISE NOTICE 'Applied automatic timestamp trigger to profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'The updated_at field will now automatically update on any profile change';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END$$;

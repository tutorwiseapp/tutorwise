-- Migration 019: Backfill missing first_name, last_name, full_name from user metadata
-- Purpose: Fix all existing profiles that don't have names populated

-- Update profiles that are missing names by extracting from auth.users metadata
UPDATE profiles p
SET
  first_name = COALESCE(
    p.first_name,
    u.raw_user_meta_data->>'given_name',
    split_part(u.raw_user_meta_data->>'full_name', ' ', 1)
  ),
  last_name = COALESCE(
    p.last_name,
    u.raw_user_meta_data->>'family_name',
    NULLIF(TRIM(substring(u.raw_user_meta_data->>'full_name' from position(' ' in (u.raw_user_meta_data->>'full_name') || ' '))), '')
  ),
  full_name = COALESCE(
    p.full_name,
    u.raw_user_meta_data->>'full_name',
    CASE
      WHEN u.raw_user_meta_data->>'given_name' IS NOT NULL AND u.raw_user_meta_data->>'family_name' IS NOT NULL
      THEN (u.raw_user_meta_data->>'given_name') || ' ' || (u.raw_user_meta_data->>'family_name')
      ELSE NULL
    END
  )
FROM auth.users u
WHERE p.id = u.id
AND (
  p.first_name IS NULL
  OR p.last_name IS NULL
  OR p.full_name IS NULL
);

-- Report on what was updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.first_name IS NOT NULL OR p.last_name IS NOT NULL OR p.full_name IS NOT NULL;

  RAISE NOTICE 'Backfill complete. Total profiles with names: %', updated_count;
END $$;

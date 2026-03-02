-- Migration 332: Fix is_admin() RLS function
-- The original function checked `role = 'admin'` but the profiles table has no `role` column.
-- The correct column is `is_admin` (boolean).
-- This was applied directly to the database on 2026-03-02 via psql — this migration captures it for deployment consistency.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

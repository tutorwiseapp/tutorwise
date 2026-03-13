/**
 * Migration 403: Generalize student_integration_links table
 * Purpose: Fix column mismatch with CaaS RPC (get_digital_stats), allow tutors, add token expiry tracking
 * Created: 2026-03-13
 *
 * Changes:
 * 1. Rename student_profile_id → profile_id (matches CaaS RPC expectation)
 * 2. Add integration_type column (CaaS RPC queries this)
 * 3. Add is_active column (CaaS RPC queries this)
 * 4. Add token_expires_at column (Google tokens expire in 3600s)
 * 5. Add external_email column (display in UI)
 * 6. Update RLS policies to allow both students and tutors
 * 7. Recreate get_digital_stats() with correct column references
 */

-- 1. Rename column to match CaaS RPC function (get_digital_stats)
ALTER TABLE public.student_integration_links
  RENAME COLUMN student_profile_id TO profile_id;

-- 2. Add columns the CaaS RPC already queries
ALTER TABLE public.student_integration_links
  ADD COLUMN IF NOT EXISTS integration_type TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. Token expiry tracking (Google tokens expire in 3600s)
ALTER TABLE public.student_integration_links
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- 4. Display email for UI
ALTER TABLE public.student_integration_links
  ADD COLUMN IF NOT EXISTS external_email TEXT;

-- 5. Backfill integration_type from platform_name
UPDATE public.student_integration_links
  SET integration_type = UPPER(REPLACE(platform_name, '_', '_'))
  WHERE integration_type IS NULL;

-- 6. Update unique constraint (column renamed)
ALTER TABLE public.student_integration_links
  DROP CONSTRAINT IF EXISTS "unique_student_platform_link";
ALTER TABLE public.student_integration_links
  ADD CONSTRAINT "unique_profile_platform_link" UNIQUE (profile_id, platform_name);

-- 7. Update indexes (column renamed)
DROP INDEX IF EXISTS "idx_integration_links_student_id";
CREATE INDEX IF NOT EXISTS "idx_integration_links_profile_id"
  ON public.student_integration_links(profile_id);

-- 8. Update RLS: allow both students AND tutors to manage their own integrations
DROP POLICY IF EXISTS "Students can manage their own integration links" ON public.student_integration_links;
CREATE POLICY "Users can manage their own integration links"
  ON public.student_integration_links
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 9. Keep guardian view policy but update column reference
DROP POLICY IF EXISTS "Guardians can view their students integration links" ON public.student_integration_links;
CREATE POLICY "Guardians can view student integration links"
  ON public.student_integration_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_graph
      WHERE source_profile_id = auth.uid()
        AND target_profile_id = student_integration_links.profile_id
        AND relationship_type = 'GUARDIAN'
        AND status = 'ACTIVE'
    )
  );

-- 10. Recreate get_digital_stats() with correct column references
-- (The original in migration 077 referenced profile_id, integration_type, is_active
--  which did not exist until this migration)
CREATE OR REPLACE FUNCTION public.get_digital_stats(user_id UUID)
RETURNS TABLE (
  google_calendar_synced BOOLEAN,
  google_classroom_synced BOOLEAN,
  lessonspace_usage_rate NUMERIC
) AS $$
DECLARE
  v_google_calendar_synced BOOLEAN;
  v_google_classroom_synced BOOLEAN;
  v_lessonspace_usage_rate NUMERIC;
  v_lessonspace_sessions INTEGER;
  v_total_sessions INTEGER;
BEGIN
  -- 1. Check Google Calendar integration
  SELECT EXISTS (
    SELECT 1 FROM public.student_integration_links
    WHERE profile_id = user_id
    AND integration_type = 'GOOGLE_CALENDAR'
    AND is_active = true
  ) INTO v_google_calendar_synced;

  -- 2. Check Google Classroom integration
  SELECT EXISTS (
    SELECT 1 FROM public.student_integration_links
    WHERE profile_id = user_id
    AND integration_type = 'GOOGLE_CLASSROOM'
    AND is_active = true
  ) INTO v_google_classroom_synced;

  -- 3. Calculate Lessonspace usage rate
  -- Definition: "Percentage of completed sessions that used Lessonspace (have recording_url)"
  SELECT COUNT(*) INTO v_total_sessions
  FROM public.bookings
  WHERE tutor_id = user_id
  AND status = 'completed'
  AND created_at >= NOW() - INTERVAL '90 days';

  IF v_total_sessions > 0 THEN
    SELECT COUNT(*) INTO v_lessonspace_sessions
    FROM public.bookings
    WHERE tutor_id = user_id
    AND status = 'completed'
    AND created_at >= NOW() - INTERVAL '90 days'
    AND recording_url IS NOT NULL;

    v_lessonspace_usage_rate := v_lessonspace_sessions::NUMERIC / v_total_sessions;
  ELSE
    v_lessonspace_usage_rate := 0;
  END IF;

  -- Return all stats as a single row
  RETURN QUERY SELECT v_google_calendar_synced, v_google_classroom_synced, v_lessonspace_usage_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_digital_stats(UUID) IS
'v5.5: Aggregates tutor digital professionalism metrics for CaaS scoring (Bucket 5: Digital).
Returns google_calendar_synced (boolean), google_classroom_synced (boolean), lessonspace_usage_rate (0-1).
Fixed in migration 403 to use correct column names (profile_id, integration_type, is_active).
Called by TutorCaaSStrategy.calcDigital().';

-- Update table comment
COMMENT ON TABLE public.student_integration_links IS
'v5.0+: Stores OAuth tokens for linking user accounts (students AND tutors) to external platforms (Google Classroom, Google Calendar, etc.).
Generalized in migration 403 from student-only to all roles.';

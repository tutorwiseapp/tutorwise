/**
 * Migration 049 Rollback: Drop student_integration_links table
 * Purpose: Rollback script for v5.0 integration links table
 * Created: 2025-11-13
 */

-- Drop RLS policies
DROP POLICY IF EXISTS "Guardians can view their students integration links" ON public.student_integration_links;
DROP POLICY IF EXISTS "Students can manage their own integration links" ON public.student_integration_links;

-- Drop indexes
DROP INDEX IF EXISTS "idx_integration_links_platform";
DROP INDEX IF EXISTS "idx_integration_links_student_id";

-- Drop table
DROP TABLE IF EXISTS public.student_integration_links;

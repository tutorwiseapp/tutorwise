-- Migration 371: Update Supabase DB webhook triggers to /api/webhooks/workflow
--
-- Phase 0 renamed the internal namespace from process-studio → workflow.
-- The DB triggers created in migration 343 still point at /api/webhooks/process-studio.
-- This migration drops those triggers and recreates them pointing at /api/webhooks/workflow.
-- The new Next.js route /api/webhooks/workflow/route.ts was added alongside this migration.
--
-- Trigger names are also renamed from process_studio_* to workflow_* for consistency.
-- The webhook secret (x-webhook-secret header) and its value are unchanged.

-- ---------------------------------------------------------------------------
-- Drop old process-studio triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS process_studio_booking_insert ON public.bookings;
DROP TRIGGER IF EXISTS process_studio_profile_under_review ON public.profiles;

-- ---------------------------------------------------------------------------
-- Recreate: bookings INSERT → Booking Lifecycle workflows
-- ---------------------------------------------------------------------------

CREATE TRIGGER workflow_booking_insert
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://tutorwise.vercel.app/api/webhooks/workflow',
  'POST',
  '{"Content-Type": "application/json", "x-webhook-secret": "3506aa56aa49dd85df399abfe3128488e824b8a9aa1ab76ff3027145ea4375ae"}',
  '{}',
  '5000'
);

-- ---------------------------------------------------------------------------
-- Recreate: profiles UPDATE (status → under_review) → Tutor Approval workflow
-- ---------------------------------------------------------------------------

CREATE TRIGGER workflow_profile_under_review
AFTER UPDATE OF status ON public.profiles
FOR EACH ROW
WHEN (NEW.status = 'under_review' AND OLD.status IS DISTINCT FROM 'under_review')
EXECUTE FUNCTION supabase_functions.http_request(
  'https://tutorwise.vercel.app/api/webhooks/workflow',
  'POST',
  '{"Content-Type": "application/json", "x-webhook-secret": "3506aa56aa49dd85df399abfe3128488e824b8a9aa1ab76ff3027145ea4375ae"}',
  '{}',
  '5000'
);

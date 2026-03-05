-- Migration 343: Add profiles.status + Process Studio webhook triggers
--
-- 1. Adds `status` column to profiles (pending | under_review | active | rejected | suspended)
--    This is the approval-state column used by the Tutor Approval workflow.
-- 2. Backfills active tutors (has listings or completed bookings) → 'active'
-- 3. Creates two http_request webhook triggers pointing at /api/webhooks/process-studio:
--      a. bookings INSERT  → Booking Lifecycle (Human or AI Tutor) workflow
--      b. profiles UPDATE  → Tutor Approval workflow when status transitions to 'under_review'

-- ---------------------------------------------------------------------------
-- 1. Add status column to profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT
    DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'active', 'rejected', 'suspended'));

-- Index for fast lookup by status (Tutor Approval workflow queries this)
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- ---------------------------------------------------------------------------
-- 2. Backfill: profiles with active listings or completed bookings → 'active'
--    All others remain 'pending' (they can be moved to under_review via admin)
-- ---------------------------------------------------------------------------

UPDATE public.profiles p
SET status = 'active'
WHERE EXISTS (
  SELECT 1 FROM public.listings l
  WHERE l.profile_id = p.id AND l.status = 'published'
)
AND p.status = 'pending';

-- ---------------------------------------------------------------------------
-- 3a. Bookings INSERT — trigger Booking Lifecycle workflows
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS process_studio_booking_insert ON public.bookings;

CREATE TRIGGER process_studio_booking_insert
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://tutorwise.vercel.app/api/webhooks/process-studio',
  'POST',
  '{"Content-Type": "application/json", "x-webhook-secret": "3506aa56aa49dd85df399abfe3128488e824b8a9aa1ab76ff3027145ea4375ae"}',
  '{}',
  '5000'
);

-- ---------------------------------------------------------------------------
-- 3b. Profiles UPDATE — trigger Tutor Approval when status → under_review
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS process_studio_profile_under_review ON public.profiles;

CREATE TRIGGER process_studio_profile_under_review
AFTER UPDATE OF status ON public.profiles
FOR EACH ROW
WHEN (NEW.status = 'under_review' AND OLD.status IS DISTINCT FROM 'under_review')
EXECUTE FUNCTION supabase_functions.http_request(
  'https://tutorwise.vercel.app/api/webhooks/process-studio',
  'POST',
  '{"Content-Type": "application/json", "x-webhook-secret": "3506aa56aa49dd85df399abfe3128488e824b8a9aa1ab76ff3027145ea4375ae"}',
  '{}',
  '5000'
);

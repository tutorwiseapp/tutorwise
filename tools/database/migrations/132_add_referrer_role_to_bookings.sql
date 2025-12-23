-- Migration 132: Add referrer_role to bookings for analytics
-- Purpose: Denormalize referrer's role for performance and clarity
-- Rationale:
--   - agent_id can store ANY profile type (client, tutor, agent)
--   - Adding referrer_role eliminates need for joins in analytics queries
--   - Makes role-specific commission logic easier in future
--   - Non-breaking change (keeps existing agent_id field)
-- Author: Senior Architect + Claude AI
-- Date: 2025-12-19
-- Related: migration 051 (agent_id)

BEGIN;

-- ============================================================
-- 1. ADD REFERRER_ROLE FIELD
-- ============================================================

-- Add referrer_role column (denormalized from profiles.active_role)
ALTER TABLE public.bookings
ADD COLUMN referrer_role TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN public.bookings.referrer_role IS
  'Role of the referrer at booking time (client, tutor, agent). Denormalized from profiles.active_role for analytics performance. NULL if no referrer (agent_id is NULL).';

-- Backfill referrer_role from profiles.active_role
UPDATE public.bookings b
SET referrer_role = p.active_role
FROM public.profiles p
WHERE b.agent_id = p.id;

-- Add index for role-based analytics queries
CREATE INDEX idx_bookings_referrer_role
  ON public.bookings(referrer_role)
  WHERE referrer_role IS NOT NULL;

COMMENT ON INDEX idx_bookings_referrer_role IS
  'Supports analytics queries filtering by referrer role (e.g., commission reports by agent vs tutor referrers)';

-- ============================================================
-- 2. AUDIT LOG
-- ============================================================

INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'schema.add_referrer_role',
  'Bookings',
  jsonb_build_object(
    'migration', '132',
    'changes', ARRAY[
      'Added referrer_role TEXT field to bookings table',
      'Backfilled from profiles.active_role',
      'Added index for analytics queries'
    ],
    'rationale', 'Denormalize referrer role for analytics performance. Makes it clear that agent_id can store any profile type.',
    'timestamp', NOW()
  )
);

COMMIT;

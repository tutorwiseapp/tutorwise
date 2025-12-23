-- Migration 052: Rename referrer_profile_id to agent_id in referrals table
-- Purpose: Complete the agent naming consistency (migration 051 only covered bookings)
-- Author: Claude AI
-- Date: 2025-11-10
-- Related: migration 051

BEGIN;

-- ============================================================
-- 1. RENAME REFERRER_PROFILE_ID TO AGENT_ID IN REFERRALS
-- ============================================================

-- Step 1a: Rename the column
ALTER TABLE public.referrals
RENAME COLUMN referrer_profile_id TO agent_id;

-- Step 1b: Rename the foreign key constraint
ALTER TABLE public.referrals
DROP CONSTRAINT IF EXISTS referrals_referrer_profile_id_fkey;

ALTER TABLE public.referrals
ADD CONSTRAINT referrals_agent_id_fkey
  FOREIGN KEY (agent_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Step 1c: Rename the index
DROP INDEX IF EXISTS idx_referrals_referrer_id;

CREATE INDEX idx_referrals_agent_id
  ON public.referrals(agent_id);

-- ============================================================
-- 2. AUDIT LOG
-- ============================================================

INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'schema.renamed_referrer_to_agent_referrals',
  'Referrals',
  jsonb_build_object(
    'migration', '052',
    'changes', ARRAY[
      'Renamed referrer_profile_id to agent_id in referrals table',
      'Updated foreign key constraint',
      'Updated index'
    ],
    'timestamp', NOW()
  )
);

COMMIT;

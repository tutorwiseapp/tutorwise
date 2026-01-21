-- Fix Agent ID Migration
-- Purpose: Rename agent_profile_id → agent_id in both bookings and referrals tables
-- This corrects the schema to match migration files 051 and 052

BEGIN;

-- ============================================================
-- 1. RENAME AGENT_PROFILE_ID TO AGENT_ID IN BOOKINGS TABLE
-- ============================================================

-- Drop existing index
DROP INDEX IF EXISTS public.idx_bookings_agent_profile_id;

-- Rename the column
ALTER TABLE public.bookings
RENAME COLUMN agent_profile_id TO agent_id;

-- Drop existing foreign key constraint
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_agent_profile_id_fkey;

-- Add new foreign key constraint with correct name
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_agent_id_fkey
  FOREIGN KEY (agent_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Create new index
CREATE INDEX idx_bookings_agent_id
  ON public.bookings(agent_id);

-- ============================================================
-- 2. RENAME AGENT_PROFILE_ID TO AGENT_ID IN REFERRALS TABLE
-- ============================================================

-- Drop existing index
DROP INDEX IF EXISTS public.idx_referrals_agent_id;

-- Rename the column
ALTER TABLE public.referrals
RENAME COLUMN agent_profile_id TO agent_id;

-- Drop existing foreign key constraint
ALTER TABLE public.referrals
DROP CONSTRAINT IF EXISTS referrals_agent_profile_id_fkey;

-- Add new foreign key constraint with correct name
ALTER TABLE public.referrals
ADD CONSTRAINT referrals_agent_id_fkey
  FOREIGN KEY (agent_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Create new index with correct name
CREATE INDEX idx_referrals_agent_id
  ON public.referrals(agent_id);

COMMIT;

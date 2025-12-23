-- Migration 094: Add Agency Fee Structure
-- Purpose: Enable Professional Agencies to manage member commission rates, verification status, and internal notes
-- Created: 2025-11-26

-- Add new columns to group_members table for agency management
ALTER TABLE public.group_members
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) CHECK (commission_rate >= 0 AND commission_rate <= 100),
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN public.group_members.commission_rate IS 'Individual commission rate override (percentage). If NULL, uses the organisation default_commission_rate from connection_groups.settings';
COMMENT ON COLUMN public.group_members.internal_notes IS 'Private notes for agency owner. Never visible to the member.';
COMMENT ON COLUMN public.group_members.is_verified IS 'Internal verification flag. Agency owner can mark member as verified.';

-- Create index for is_verified for faster filtering (if agencies want to view only verified members)
CREATE INDEX IF NOT EXISTS idx_group_members_is_verified ON public.group_members(group_id, is_verified);

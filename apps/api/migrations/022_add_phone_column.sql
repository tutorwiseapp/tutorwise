-- Migration 022: Add phone column to profiles table
-- Purpose: Store user phone numbers for contact purposes

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.profiles.phone IS 'User phone number for contact purposes';

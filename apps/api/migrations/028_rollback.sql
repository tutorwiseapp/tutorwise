-- Migration: Rollback Script for 028_create_hubs_v3_6_schema.sql
-- Version: 028_rollback
-- Created: 2025-11-02
-- Description: This script reverses the changes made by migration 028
-- WARNING: This will delete ALL data in bookings, transactions, and referrals tables

-- =====================================================================
-- IMPORTANT: Run this script ONLY if you need to rollback migration 028
-- This will permanently delete data. Ensure you have backups.
-- =====================================================================

BEGIN;

-- ==================================
-- STEP 1: Drop the new tables (in reverse order of creation)
-- ==================================
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;

-- ========================================
-- STEP 2: Drop the new columns from 'profiles'
-- ========================================
DROP INDEX IF EXISTS idx_profiles_referred_by;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS referred_by_profile_id,
DROP COLUMN IF EXISTS referral_code;

-- ====================================
-- STEP 3: Drop the ENUM types (in reverse order of creation)
-- ====================================
DROP TYPE IF EXISTS referral_status_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS transaction_status_enum CASCADE;
DROP TYPE IF EXISTS booking_status_enum CASCADE;

-- =====================================
-- STEP 4: Remove the system profile
-- =====================================
DELETE FROM public.profiles
WHERE id = '00000000-0000-0000-0000-000000000000';

COMMIT;

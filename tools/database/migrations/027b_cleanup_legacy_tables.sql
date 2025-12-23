-- Migration: Cleanup legacy tables before Hubs v3.6
-- Version: 027b
-- Created: 2025-11-02
-- Description: Drops old transactions and referrals tables that use incompatible schema
-- This is a prerequisite for migration 028

-- =====================================================================
-- IMPORTANT: The old tables use bigint IDs and agent_id/referral_id references
-- The new v3.6 schema uses UUID and profile_id references for clean architecture
-- Since both tables are empty (verified), we can safely drop them
-- =====================================================================

BEGIN;

-- Drop old tables (both are empty and use incompatible schema)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;

-- Drop old ENUM types that will be replaced by new ones
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS referral_status CASCADE;

COMMIT;

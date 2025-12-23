-- =====================================================================
-- Rollback Migration: Remove Comprehensive User Onboarding System
-- Version: 139_rollback
-- Created: 2025-09-29 (Migrated to apps/api/migrations: 2025-12-23)
-- Description: Safely removes comprehensive onboarding system tables and columns
-- Note: This rollback script corresponds to migration 139
-- =====================================================================

-- WARNING: This will permanently delete all onboarding data!
-- Only run this if you need to completely remove the onboarding system.

-- Drop views first
DROP VIEW IF EXISTS onboarding_status_view;

-- Drop functions
DROP FUNCTION IF EXISTS get_onboarding_progress(UUID, TEXT);
DROP FUNCTION IF EXISTS start_onboarding_session(UUID, TEXT);
DROP FUNCTION IF EXISTS complete_onboarding(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS cleanup_abandoned_onboarding_sessions();
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_last_active_column() CASCADE;

-- Drop tables (CASCADE will remove dependent objects)
DROP TABLE IF EXISTS onboarding_sessions CASCADE;
DROP TABLE IF EXISTS role_details CASCADE;

-- Remove columns from profiles table
-- Note: Be very careful with these - only run if you're sure you want to remove the data
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed;
ALTER TABLE profiles DROP COLUMN IF EXISTS preferences;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_progress;

-- Note: This rollback script does not restore any existing data
-- Make sure you have backups before running this!
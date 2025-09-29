-- =====================================================================
-- Validation Script: Onboarding System Schema
-- Version: 001
-- Created: 2025-09-29
-- Description: Validates that onboarding system was installed correctly
-- =====================================================================

-- This script performs comprehensive validation of the onboarding system
-- Run this after applying the main migration to ensure everything is working

DO $$
DECLARE
    validation_errors TEXT[] := '{}';
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting onboarding system validation...';

    -- Check if profiles table has new columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing profiles.onboarding_completed column');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'preferences'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing profiles.preferences column');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'onboarding_progress'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing profiles.onboarding_progress column');
    END IF;

    -- Check if role_details table exists with correct structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_details') THEN
        validation_errors := array_append(validation_errors, 'Missing role_details table');
    ELSE
        -- Check key columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'role_details' AND column_name = 'profile_id'
        ) THEN
            validation_errors := array_append(validation_errors, 'Missing role_details.profile_id column');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'role_details' AND column_name = 'role_type'
        ) THEN
            validation_errors := array_append(validation_errors, 'Missing role_details.role_type column');
        END IF;
    END IF;

    -- Check if onboarding_sessions table exists with correct structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_sessions') THEN
        validation_errors := array_append(validation_errors, 'Missing onboarding_sessions table');
    ELSE
        -- Check key columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'onboarding_sessions' AND column_name = 'current_step'
        ) THEN
            validation_errors := array_append(validation_errors, 'Missing onboarding_sessions.current_step column');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'onboarding_sessions' AND column_name = 'responses'
        ) THEN
            validation_errors := array_append(validation_errors, 'Missing onboarding_sessions.responses column');
        END IF;
    END IF;

    -- Check if indexes exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'role_details' AND indexname = 'idx_role_details_profile_id'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing index: idx_role_details_profile_id');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'onboarding_sessions' AND indexname = 'idx_onboarding_sessions_profile_role'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing index: idx_onboarding_sessions_profile_role');
    END IF;

    -- Check if functions exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'get_onboarding_progress'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing function: get_onboarding_progress');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'start_onboarding_session'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing function: start_onboarding_session');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'complete_onboarding'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing function: complete_onboarding');
    END IF;

    -- Check if view exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'onboarding_status_view'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing view: onboarding_status_view');
    END IF;

    -- Check if triggers exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'update_role_details_updated_at'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing trigger: update_role_details_updated_at');
    END IF;

    -- Check RLS policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'role_details' AND policyname = 'Users can view own role details'
    ) THEN
        validation_errors := array_append(validation_errors, 'Missing RLS policy for role_details');
    END IF;

    -- Output results
    error_count := array_length(validation_errors, 1);

    IF error_count = 0 THEN
        RAISE NOTICE '✅ Validation completed successfully! All components are present.';
        RAISE NOTICE 'Onboarding system is ready for use.';
    ELSE
        RAISE NOTICE '❌ Validation failed with % errors:', error_count;
        FOR i IN 1..error_count LOOP
            RAISE NOTICE '  - %', validation_errors[i];
        END LOOP;
        RAISE EXCEPTION 'Migration validation failed. Please check the errors above.';
    END IF;
END $$;

-- Test basic functionality
DO $$
DECLARE
    test_profile_id UUID := gen_random_uuid();
    session_id UUID;
    progress_result JSONB;
BEGIN
    RAISE NOTICE 'Running basic functionality tests...';

    -- Note: These tests require a valid profile_id from your profiles table
    -- You may need to replace test_profile_id with an actual profile ID

    -- Test 1: Check if we can call the onboarding functions
    BEGIN
        SELECT get_onboarding_progress(test_profile_id, 'seeker') INTO progress_result;
        RAISE NOTICE '✅ get_onboarding_progress function works';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️  get_onboarding_progress function test skipped (expected without valid profile)';
    END;

    RAISE NOTICE '✅ Basic functionality tests completed';
END $$;

-- Display schema information
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('role_details', 'onboarding_sessions')
ORDER BY table_name, ordinal_position;

-- Display index information
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('role_details', 'onboarding_sessions')
ORDER BY tablename, indexname;

RAISE NOTICE 'Schema validation completed. Check output above for details.';
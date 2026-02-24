-- ============================================================================
-- Migration 269: Create System User for Curriculum Content
-- ============================================================================
-- Purpose: Create a special "system" user to own curriculum content
--          This allows curriculum documents to be inserted without a real user
--
-- Changes:
--   1. Insert system user into auth.users (if not exists)
--   2. Create corresponding profile for system user
--
-- System User ID: 00000000-0000-0000-0000-000000000000
-- ============================================================================

BEGIN;

-- =====================================================================
-- STEP 1: Create system user in auth.users
-- =====================================================================

-- Note: We use ON CONFLICT DO NOTHING to make this migration idempotent
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'system@tutorwise.app',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA', -- Dummy hash (account cannot be logged into)
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "system", "providers": []}'::jsonb,
    '{"full_name": "TutorWise System", "display_name": "System"}'::jsonb,
    false
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- STEP 2: Create system profile
-- =====================================================================

INSERT INTO profiles (
    id,
    email,
    full_name,
    bio,
    roles,
    referral_code,
    profile_completed,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'system@tutorwise.app',
    'TutorWise System',
    'System account for curriculum content and automated processes',
    ARRAY[]::text[],
    'SYSTEM000',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- STEP 3: Grant RLS exceptions for system user
-- =====================================================================

-- Allow system user to bypass RLS for sage_uploads
DROP POLICY IF EXISTS "System user full access to uploads" ON sage_uploads;
CREATE POLICY "System user full access to uploads" ON sage_uploads
    FOR ALL USING (
        owner_id = '00000000-0000-0000-0000-000000000000'::uuid
    );

-- Allow system user to bypass RLS for sage_knowledge_chunks
-- (inherits from existing "Service role full access" policy)

-- =====================================================================
-- STEP 4: Migration summary
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 269 Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Created system user for curriculum content';
    RAISE NOTICE '  User ID: 00000000-0000-0000-0000-000000000000';
    RAISE NOTICE '  Email: system@tutorwise.app';
    RAISE NOTICE '  Purpose: Own curriculum documents and system content';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

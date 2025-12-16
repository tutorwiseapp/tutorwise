-- ===================================================================
-- Migration: 125_add_platform_api_scopes.sql
-- Purpose: Add new API scopes for platform data access (CaaS, Profiles, Bookings)
-- Created: 2025-12-16
-- Author: Platform API Expansion
-- Prerequisites: Migration 124 (API Keys Infrastructure)
-- ===================================================================
-- This migration extends the API key infrastructure to support general
-- platform data access beyond referrals, enabling external apps and
-- AI agents to access CaaS scores, profiles, and bookings.
-- ===================================================================

-- ===================================================================
-- SECTION 1: UPDATE GENERATE_API_KEY FUNCTION
-- ===================================================================
-- Update default scopes to include new platform API scopes

CREATE OR REPLACE FUNCTION public.generate_api_key(
  p_profile_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_scopes TEXT[] DEFAULT '{"referrals:read", "referrals:write", "tutors:search", "caas:read", "profiles:read", "bookings:read"}',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_api_key TEXT;
  v_key_prefix TEXT;
  v_key_hash TEXT;
  v_key_id UUID;
BEGIN
  -- Generate random API key: tutorwise_sk_<64 random hex chars>
  v_api_key := 'tutorwise_sk_' || encode(gen_random_bytes(32), 'hex');

  -- Extract prefix (first 16 chars for display)
  v_key_prefix := substring(v_api_key from 1 for 16);

  -- Hash the full key with SHA-256 (PostgreSQL uses digest() from pgcrypto)
  v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');

  -- Insert into api_keys table
  INSERT INTO public.api_keys (
    profile_id,
    key_prefix,
    key_hash,
    name,
    description,
    scopes,
    expires_at
  ) VALUES (
    p_profile_id,
    v_key_prefix,
    v_key_hash,
    p_name,
    p_description,
    p_scopes,
    p_expires_at
  ) RETURNING id INTO v_key_id;

  -- Return the API key (ONLY TIME IT'S RETURNED!)
  RETURN jsonb_build_object(
    'success', true,
    'api_key', v_api_key,
    'key_id', v_key_id,
    'key_prefix', v_key_prefix,
    'scopes', p_scopes,
    'message', 'API key generated successfully. Save this key - it will not be shown again!',
    'warning', 'Store this key securely. It cannot be retrieved later.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_api_key IS
'v2.0: Generates a new API key with platform scopes. Returns the plaintext key ONCE. Updated to include caas:read, profiles:read, bookings:read by default.';

-- ===================================================================
-- SECTION 2: ADD DOCUMENTATION FOR NEW SCOPES
-- ===================================================================

COMMENT ON TABLE public.api_keys IS
'v2.0: API keys for programmatic access to TutorWise Platform API.
Supports scopes:
  - referrals:read, referrals:write (Migration 124)
  - tutors:search (Migration 124)
  - caas:read, profiles:read, bookings:read (Migration 125)
Keys are SHA-256 hashed and never stored in plaintext.';

-- ===================================================================
-- SECTION 3: CREATE SCOPE VALIDATION FUNCTION
-- ===================================================================

CREATE OR REPLACE FUNCTION public.validate_api_scope(
  p_required_scope TEXT,
  p_available_scopes TEXT[]
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_required_scope = ANY(p_available_scopes);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.validate_api_scope IS
'Helper function to check if an API key has a required scope. Used by middleware for permission checks.';

-- ===================================================================
-- SECTION 4: CREATE HELPER VIEW FOR API KEY PERMISSIONS
-- ===================================================================

CREATE OR REPLACE VIEW public.api_key_permissions AS
SELECT
  id as key_id,
  profile_id,
  key_prefix,
  name,
  scopes,
  -- Check individual scope permissions
  'referrals:read' = ANY(scopes) as can_read_referrals,
  'referrals:write' = ANY(scopes) as can_write_referrals,
  'tutors:search' = ANY(scopes) as can_search_tutors,
  'caas:read' = ANY(scopes) as can_read_caas,
  'profiles:read' = ANY(scopes) as can_read_profiles,
  'bookings:read' = ANY(scopes) as can_read_bookings,
  is_active,
  expires_at,
  last_used_at,
  total_requests,
  created_at
FROM public.api_keys;

COMMENT ON VIEW public.api_key_permissions IS
'v2.0: Readable view of API key permissions for dashboard display and debugging.';

-- Grant access to authenticated users (for their own keys)
GRANT SELECT ON public.api_key_permissions TO authenticated;

-- ===================================================================
-- SECTION 5: UPDATE EXISTING API KEYS (OPTIONAL BACKFILL)
-- ===================================================================

-- Uncomment to automatically grant new scopes to existing API keys
-- This is OPTIONAL - you may want to require users to regenerate keys

-- UPDATE public.api_keys
-- SET scopes = array_cat(
--   scopes,
--   ARRAY['caas:read', 'profiles:read', 'bookings:read']
-- )
-- WHERE NOT (scopes @> ARRAY['caas:read']);

-- ===================================================================
-- SECTION 6: CREATE SCOPE METADATA TABLE (DOCUMENTATION)
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.api_scopes_metadata (
  scope TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  endpoint_examples TEXT[] NOT NULL,
  added_in_migration TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_special_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.api_scopes_metadata IS
'Documentation table describing available API scopes, their purposes, and requirements.';

-- Insert scope metadata
INSERT INTO public.api_scopes_metadata (scope, description, endpoint_examples, added_in_migration) VALUES
  ('referrals:read', 'Read referral statistics and performance data', ARRAY['GET /api/v1/referrals/stats'], '124'),
  ('referrals:write', 'Create referrals and send invitations', ARRAY['POST /api/v1/referrals/create'], '124'),
  ('tutors:search', 'Search tutors with automatic referral attribution', ARRAY['POST /api/v1/tutors/search'], '124'),
  ('caas:read', 'Read CaaS (Credibility as a Service) scores and breakdowns', ARRAY['GET /api/v1/caas/:profile_id'], '125'),
  ('profiles:read', 'Read public profile data including listings', ARRAY['GET /api/v1/profiles/:id'], '125'),
  ('bookings:read', 'Read authenticated user''s booking history', ARRAY['GET /api/v1/bookings'], '125')
ON CONFLICT (scope) DO UPDATE SET
  description = EXCLUDED.description,
  endpoint_examples = EXCLUDED.endpoint_examples;

-- ===================================================================
-- SECTION 7: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_view_exists BOOLEAN;
  v_metadata_count INTEGER;
BEGIN
  -- Check if updated function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'generate_api_key'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_exists;

  IF NOT v_function_exists THEN
    RAISE EXCEPTION 'generate_api_key function not found';
  END IF;

  -- Check if permissions view exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'api_key_permissions'
  ) INTO v_view_exists;

  IF NOT v_view_exists THEN
    RAISE EXCEPTION 'api_key_permissions view not created';
  END IF;

  -- Count scope metadata entries
  SELECT COUNT(*) INTO v_metadata_count
  FROM public.api_scopes_metadata;

  IF v_metadata_count < 6 THEN
    RAISE EXCEPTION 'Expected 6 scope metadata entries, found %', v_metadata_count;
  END IF;

  RAISE NOTICE 'Migration 125 completed successfully';
  RAISE NOTICE 'Platform API scopes added:';
  RAISE NOTICE '  - caas:read (Read CaaS scores)';
  RAISE NOTICE '  - profiles:read (Read profile data)';
  RAISE NOTICE '  - bookings:read (Read user bookings)';
  RAISE NOTICE 'Updated generate_api_key() with new default scopes';
  RAISE NOTICE 'Created api_key_permissions view';
  RAISE NOTICE 'Created api_scopes_metadata documentation table';
  RAISE NOTICE 'Total scopes documented: %', v_metadata_count;
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================

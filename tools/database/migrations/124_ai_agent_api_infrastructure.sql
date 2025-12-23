/**
 * Migration 124: AI Agent API Infrastructure
 * Created: 2025-12-16
 * Purpose: Enable programmatic access for AI agents (ChatGPT, Claude, custom bots)
 * Deployment Time: ~3 minutes
 *
 * BUSINESS CONTEXT:
 * ================
 * This migration enables AI-native referral workflows where AI agents can:
 * - Create referrals on behalf of users
 * - Search tutors with automatic referral attribution
 * - Track referral performance programmatically
 * - Enable voice assistants, chatbots, and automation tools
 *
 * USE CASES:
 * - ChatGPT: "Refer my friend jane@example.com as a tutor and give me the link"
 * - Claude: "Find me a biology tutor and make sure I get referral credit"
 * - Custom bots: Bulk referral invitations from CRM systems
 * - Voice assistants: "Alexa, send a TutorWise referral to my contact list"
 *
 * SECURITY MODEL:
 * ==============
 * API keys are scoped to user accounts with the following security features:
 * - SHA-256 hashed keys (only hash stored in DB)
 * - Prefix system for key identification (tutorwise_sk_xxx)
 * - Rate limiting per key (configurable)
 * - Expiration dates
 * - Revocation support
 * - Usage tracking and audit logs
 */

BEGIN;

-- ============================================================================
-- Table: api_keys
-- ============================================================================
-- Stores API keys for programmatic access to TutorWise platform

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Key identification (visible to user)
  key_prefix TEXT NOT NULL,
  -- Format: "tutorwise_sk_" (first 16 chars of key)
  -- Allows users to identify keys without exposing full secret

  -- Key security (never show to user after creation)
  key_hash TEXT NOT NULL UNIQUE,
  -- SHA-256 hash of full API key
  -- Never store plaintext key

  -- Key metadata
  name TEXT NOT NULL,
  -- User-friendly name: "ChatGPT Integration", "Production Bot", etc.

  description TEXT,
  -- Optional: Purpose, use case, integration details

  -- Permissions (future: granular scopes)
  scopes TEXT[] DEFAULT '{"referrals:read", "referrals:write", "tutors:search"}',
  -- Current scopes:
  -- - referrals:read: Get referral stats
  -- - referrals:write: Create referrals
  -- - tutors:search: Search tutors with attribution
  -- Future scopes: bookings:write, profiles:read, etc.

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  -- Max requests per minute (default: 60)

  rate_limit_per_day INTEGER DEFAULT 10000,
  -- Max requests per day (default: 10k)

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- Can be toggled off without deletion

  -- Expiration
  expires_at TIMESTAMPTZ,
  -- Optional expiration date (NULL = never expires)

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  -- Updated on each request

  total_requests INTEGER DEFAULT 0,
  -- Lifetime request count

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id)
);

-- Indexes for performance
CREATE INDEX idx_api_keys_profile ON api_keys(profile_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE api_keys IS
'API keys for programmatic access by AI agents, automation tools, and third-party integrations';

COMMENT ON COLUMN api_keys.key_prefix IS
'First 16 characters of API key (tutorwise_sk_xxx) for user identification';

COMMENT ON COLUMN api_keys.key_hash IS
'SHA-256 hash of full API key. Plaintext key only shown once during creation.';

COMMENT ON COLUMN api_keys.scopes IS
'Permissions granted to this key. Format: ["referrals:read", "tutors:search"]';

-- ============================================================================
-- Table: api_key_usage_logs
-- ============================================================================
-- Tracks API usage for analytics, debugging, and rate limiting

CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Request details
  endpoint TEXT NOT NULL,
  -- e.g., "/api/v1/referrals/create"

  method TEXT NOT NULL,
  -- GET, POST, PUT, DELETE

  status_code INTEGER NOT NULL,
  -- HTTP status: 200, 400, 401, 500, etc.

  -- Performance
  response_time_ms INTEGER,
  -- Latency in milliseconds

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Payload size
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,

  -- Error tracking
  error_message TEXT,
  -- Populated if status_code >= 400

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_api_usage_key ON api_key_usage_logs(api_key_id);
CREATE INDEX idx_api_usage_created ON api_key_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_endpoint ON api_key_usage_logs(endpoint);
CREATE INDEX idx_api_usage_status ON api_key_usage_logs(status_code);

COMMENT ON TABLE api_key_usage_logs IS
'Audit log of all API requests for analytics, debugging, and rate limiting';

-- ============================================================================
-- Function: generate_api_key
-- ============================================================================
-- Generates a new API key for a user
-- Returns the plaintext key (ONLY TIME IT'S VISIBLE)

CREATE OR REPLACE FUNCTION generate_api_key(
  p_profile_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_scopes TEXT[] DEFAULT '{"referrals:read", "referrals:write", "tutors:search"}',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_api_key TEXT;
  v_key_prefix TEXT;
  v_key_hash TEXT;
  v_key_id UUID;
BEGIN
  -- Generate random API key (32 bytes = 64 hex chars)
  -- Format: tutorwise_sk_<64 hex chars>
  v_api_key := 'tutorwise_sk_' || encode(gen_random_bytes(32), 'hex');

  -- Extract prefix (first 16 chars for user identification)
  v_key_prefix := substring(v_api_key from 1 for 16);

  -- Hash the full key for storage (SHA-256)
  v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');

  -- Insert into database
  INSERT INTO api_keys (
    profile_id,
    key_prefix,
    key_hash,
    name,
    description,
    scopes,
    expires_at
  )
  VALUES (
    p_profile_id,
    v_key_prefix,
    v_key_hash,
    p_name,
    p_description,
    p_scopes,
    p_expires_at
  )
  RETURNING id INTO v_key_id;

  -- Return API key (ONLY TIME IT'S VISIBLE)
  RETURN jsonb_build_object(
    'api_key', v_api_key,
    'key_id', v_key_id,
    'key_prefix', v_key_prefix,
    'name', p_name,
    'scopes', p_scopes,
    'expires_at', p_expires_at,
    'warning', 'This is the only time you will see this key. Store it securely.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_api_key IS
'Generates a new API key for programmatic access. Returns plaintext key ONCE.';

-- ============================================================================
-- Function: validate_api_key
-- ============================================================================
-- Validates an API key and returns the associated profile_id
-- Used by API authentication middleware

CREATE OR REPLACE FUNCTION validate_api_key(p_api_key TEXT)
RETURNS JSONB AS $$
DECLARE
  v_key_hash TEXT;
  v_result JSONB;
BEGIN
  -- Hash the provided key
  v_key_hash := encode(digest(p_api_key, 'sha256'), 'hex');

  -- Find matching key
  SELECT jsonb_build_object(
    'valid', TRUE,
    'profile_id', ak.profile_id,
    'key_id', ak.id,
    'scopes', ak.scopes,
    'rate_limit_per_minute', ak.rate_limit_per_minute,
    'rate_limit_per_day', ak.rate_limit_per_day
  )
  INTO v_result
  FROM api_keys ak
  WHERE ak.key_hash = v_key_hash
    AND ak.is_active = TRUE
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW());

  IF v_result IS NULL THEN
    -- Invalid or expired key
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Invalid or expired API key'
    );
  END IF;

  -- Update last_used_at and increment counter
  UPDATE api_keys
  SET
    last_used_at = NOW(),
    total_requests = total_requests + 1
  WHERE key_hash = v_key_hash;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_api_key IS
'Validates API key and returns profile context. Updates usage stats.';

-- ============================================================================
-- Function: revoke_api_key
-- ============================================================================
-- Revokes an API key (soft delete)

CREATE OR REPLACE FUNCTION revoke_api_key(
  p_key_id UUID,
  p_revoked_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Check ownership
  SELECT profile_id INTO v_profile_id
  FROM api_keys
  WHERE id = p_key_id;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'API key not found'
    );
  END IF;

  IF v_profile_id != p_revoked_by THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: You do not own this API key'
    );
  END IF;

  -- Revoke key
  UPDATE api_keys
  SET
    is_active = FALSE,
    revoked_at = NOW(),
    revoked_by = p_revoked_by
  WHERE id = p_key_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'API key revoked successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_api_key IS
'Revokes an API key. Only key owner can revoke.';

-- ============================================================================
-- Function: get_api_key_usage_stats
-- ============================================================================
-- Returns usage statistics for an API key

CREATE OR REPLACE FUNCTION get_api_key_usage_stats(
  p_key_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'successful_requests', COUNT(*) FILTER (WHERE status_code < 400),
    'failed_requests', COUNT(*) FILTER (WHERE status_code >= 400),
    'avg_response_time_ms', ROUND(AVG(response_time_ms)),
    'endpoints', jsonb_object_agg(
      endpoint,
      COUNT(*)
    ),
    'status_codes', jsonb_object_agg(
      status_code::TEXT,
      COUNT(*)
    ),
    'requests_by_day', (
      SELECT jsonb_object_agg(
        date::TEXT,
        count
      )
      FROM (
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM api_key_usage_logs
        WHERE api_key_id = p_key_id
          AND created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      ) daily
    )
  )
  INTO v_stats
  FROM api_key_usage_logs
  WHERE api_key_id = p_key_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;

  RETURN COALESCE(v_stats, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_api_key_usage_stats IS
'Returns usage analytics for an API key over last N days';

-- ============================================================================
-- RPC: list_api_keys (for authenticated users)
-- ============================================================================

CREATE OR REPLACE FUNCTION list_api_keys(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  key_prefix TEXT,
  name TEXT,
  description TEXT,
  scopes TEXT[],
  is_active BOOLEAN,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  total_requests INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.id,
    ak.key_prefix,
    ak.name,
    ak.description,
    ak.scopes,
    ak.is_active,
    ak.expires_at,
    ak.last_used_at,
    ak.total_requests,
    ak.created_at
  FROM api_keys ak
  WHERE ak.profile_id = p_profile_id
    AND ak.revoked_at IS NULL
  ORDER BY ak.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION generate_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION validate_api_key TO authenticated, anon;
GRANT EXECUTE ON FUNCTION revoke_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_key_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION list_api_keys TO authenticated;

-- Grant table access
GRANT SELECT, INSERT ON api_keys TO authenticated;
GRANT SELECT, INSERT ON api_key_usage_logs TO authenticated;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================
/*
-- Generate an API key for testing
SELECT generate_api_key(
  'your-profile-uuid',
  'Test ChatGPT Integration',
  'API key for testing ChatGPT referral workflow',
  '{"referrals:read", "referrals:write", "tutors:search"}'::TEXT[],
  NOW() + INTERVAL '30 days'
);

-- Validate an API key
SELECT validate_api_key('tutorwise_sk_xxx...');

-- List user's API keys
SELECT * FROM list_api_keys('your-profile-uuid');

-- Get usage stats
SELECT get_api_key_usage_stats('key-uuid', 7);

-- Revoke an API key
SELECT revoke_api_key('key-uuid', 'profile-uuid');
*/

-- ============================================================================
-- Deployment Notes
-- ============================================================================
/*
DEPLOYMENT CHECKLIST:
1. Run this migration in Supabase SQL editor
2. Create API endpoint: POST /api/v1/auth/keys (for key generation)
3. Create middleware: apps/web/src/middleware/api-auth.ts
4. Add environment variable: API_RATE_LIMIT_ENABLED=true
5. Test with curl:
   curl -H "Authorization: Bearer tutorwise_sk_xxx" \
        https://tutorwise.com/api/v1/referrals/stats

SECURITY CONSIDERATIONS:
- API keys are SHA-256 hashed (never stored in plaintext)
- Rate limiting enforced per key
- Scopes limit what each key can access
- Keys can expire automatically
- Usage logs retained for audit trail
- Only key owner can revoke

RATE LIMITING STRATEGY:
- Default: 60 req/min, 10k req/day per key
- Configurable per key for premium users
- Implement in middleware using Redis or in-memory cache
- Return 429 Too Many Requests when exceeded

FUTURE ENHANCEMENTS:
- IP whitelisting
- Webhook signing keys
- OAuth 2.0 client credentials flow
- Granular permissions (read-only, admin, etc.)
- Team API keys (shared across organization)
*/

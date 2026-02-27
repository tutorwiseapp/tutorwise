--
-- AI Agents Unified Architecture Migration
--
-- Purpose: Migrate ai_tutors table → ai_agents table
-- Supports multiple agent types: tutor, coursework, study_buddy, research_assistant, exam_prep
-- Maintains backward compatibility with existing AI Tutors
--
-- Created: 2026-02-27
-- Phase: 2 of Unified AI Architecture
--

-- =============================================================================
-- PART 1: Create ai_agents table (unified structure)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES connection_groups(id) ON DELETE SET NULL,

  -- Identity
  name TEXT NOT NULL UNIQUE,                    -- Unique slug (e.g., "sage-tutor-maths")
  display_name TEXT NOT NULL,                   -- Public display name
  description TEXT,
  avatar_url TEXT,

  -- Classification
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'tutor',              -- General tutoring
    'coursework',         -- Coursework assistance
    'study_buddy',        -- Study companion
    'research_assistant', -- Research and writing
    'exam_prep'           -- Exam preparation
  )),
  agent_context TEXT NOT NULL CHECK (agent_context IN (
    'platform',           -- Sage (free, platform-owned)
    'marketplace'         -- AI Tutors (paid, user-created)
  )),
  subject TEXT NOT NULL,
  level TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',              -- Being created
    'published',          -- Live and discoverable
    'unpublished',        -- Temporarily hidden
    'archived',           -- Soft deleted
    'suspended'           -- Administratively disabled
  )),
  is_platform_owned BOOLEAN NOT NULL DEFAULT false,
  created_as_role TEXT DEFAULT 'tutor',

  -- Marketplace-specific (NULL for platform agents)
  price_per_hour NUMERIC(10, 2),
  currency TEXT DEFAULT 'GBP',
  subscription_status TEXT CHECK (subscription_status IN (
    'active', 'inactive', 'past_due', 'canceled'
  )),

  -- Storage
  storage_used_mb INTEGER NOT NULL DEFAULT 0,
  storage_limit_mb INTEGER NOT NULL DEFAULT 500,

  -- Features
  is_featured BOOLEAN NOT NULL DEFAULT false,
  priority_rank INTEGER NOT NULL DEFAULT 0,

  -- Metrics
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3, 2),
  total_reviews INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_session_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT ai_agents_name_key UNIQUE (name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_owner_id ON ai_agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_organisation_id ON ai_agents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_agent_type ON ai_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_agent_context ON ai_agents(agent_context);
CREATE INDEX IF NOT EXISTS idx_ai_agents_subject ON ai_agents(subject);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_platform_owned ON ai_agents(is_platform_owned);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_featured ON ai_agents(is_featured);
CREATE INDEX IF NOT EXISTS idx_ai_agents_priority_rank ON ai_agents(priority_rank);

-- =============================================================================
-- PART 2: Migrate existing ai_tutors data to ai_agents
-- =============================================================================

-- Insert all existing AI Tutors as marketplace tutor agents
INSERT INTO ai_agents (
  id,
  owner_id,
  organisation_id,
  name,
  display_name,
  description,
  avatar_url,
  agent_type,
  agent_context,
  subject,
  price_per_hour,
  currency,
  status,
  subscription_status,
  storage_used_mb,
  storage_limit_mb,
  is_platform_owned,
  is_featured,
  priority_rank,
  total_sessions,
  total_revenue,
  avg_rating,
  total_reviews,
  created_at,
  updated_at,
  published_at,
  last_session_at,
  created_as_role
)
SELECT
  id,
  owner_id,
  organisation_id,
  name,
  display_name,
  description,
  avatar_url,
  'tutor' as agent_type,                        -- All existing are tutors
  'marketplace' as agent_context,               -- All existing are marketplace
  subject,
  price_per_hour,
  currency,
  status,
  subscription_status,
  storage_used_mb,
  storage_limit_mb,
  is_platform_owned,
  is_featured,
  priority_rank,
  total_sessions,
  total_revenue,
  avg_rating,
  total_reviews,
  created_at,
  updated_at,
  published_at,
  last_session_at,
  created_as_role
FROM ai_tutors
ON CONFLICT (id) DO NOTHING;

-- Verify migration
DO $$
DECLARE
  ai_tutors_count INTEGER;
  ai_agents_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO ai_tutors_count FROM ai_tutors;
  SELECT COUNT(*) INTO ai_agents_count FROM ai_agents WHERE agent_context = 'marketplace';

  IF ai_tutors_count != ai_agents_count THEN
    RAISE EXCEPTION 'Migration verification failed: ai_tutors has % rows but ai_agents has % marketplace rows',
      ai_tutors_count, ai_agents_count;
  END IF;

  RAISE NOTICE 'Migration successful: % AI Tutors migrated to ai_agents table', ai_tutors_count;
END $$;

-- =============================================================================
-- PART 3: Update related tables to reference ai_agents
-- =============================================================================

-- Update ai_tutor_sessions to use agent_id (add new column, keep old for compatibility)
ALTER TABLE ai_tutor_sessions
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE;

-- Populate agent_id from ai_tutor_id
UPDATE ai_tutor_sessions
SET agent_id = ai_tutor_id
WHERE agent_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_agent_id ON ai_tutor_sessions(agent_id);

-- Update ai_tutor_messages (already references sessions, so no change needed)

-- Update ai_tutor_materials to use agent_id
ALTER TABLE ai_tutor_materials
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE;

UPDATE ai_tutor_materials
SET agent_id = ai_tutor_id
WHERE agent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tutor_materials_agent_id ON ai_tutor_materials(agent_id);

-- Update ai_tutor_links to use agent_id
ALTER TABLE ai_tutor_links
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE;

UPDATE ai_tutor_links
SET agent_id = ai_tutor_id
WHERE agent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tutor_links_agent_id ON ai_tutor_links(agent_id);

-- Update ai_tutor_skills to use agent_id
ALTER TABLE ai_tutor_skills
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE;

UPDATE ai_tutor_skills
SET agent_id = ai_tutor_id
WHERE agent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tutor_skills_agent_id ON ai_tutor_skills(agent_id);

-- Update ai_tutor_reviews to use agent_id
ALTER TABLE ai_tutor_reviews
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE;

UPDATE ai_tutor_reviews
SET agent_id = ai_tutor_id
WHERE agent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tutor_reviews_agent_id ON ai_tutor_reviews(agent_id);

-- Update ai_tutor_subscriptions to use agent_id
ALTER TABLE ai_tutor_subscriptions
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE;

UPDATE ai_tutor_subscriptions
SET agent_id = ai_tutor_id
WHERE agent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tutor_subscriptions_agent_id ON ai_tutor_subscriptions(agent_id);

-- =============================================================================
-- PART 4: Create backward-compatible view (ai_tutors as view)
-- =============================================================================

-- Create view that makes ai_agents look like ai_tutors for backward compatibility
CREATE OR REPLACE VIEW ai_tutors_view AS
SELECT
  id,
  owner_id,
  organisation_id,
  name,
  display_name,
  description,
  avatar_url,
  subject,
  price_per_hour,
  currency,
  status,
  subscription_status,
  storage_used_mb,
  storage_limit_mb,
  is_platform_owned,
  is_featured,
  priority_rank,
  total_sessions,
  total_revenue,
  avg_rating,
  total_reviews,
  created_at,
  updated_at,
  published_at,
  last_session_at,
  created_as_role
FROM ai_agents
WHERE agent_context = 'marketplace' AND agent_type = 'tutor';

COMMENT ON VIEW ai_tutors_view IS 'Backward-compatible view of ai_agents table filtered to marketplace tutors';

-- =============================================================================
-- PART 5: RLS Policies for ai_agents
-- =============================================================================

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

-- Public read access for published agents
CREATE POLICY "ai_agents_public_read" ON ai_agents
  FOR SELECT
  USING (status = 'published');

-- Owners can view their own agents (any status)
CREATE POLICY "ai_agents_owner_read" ON ai_agents
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Owners can create agents
CREATE POLICY "ai_agents_owner_create" ON ai_agents
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own agents
CREATE POLICY "ai_agents_owner_update" ON ai_agents
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Owners can delete their own agents
CREATE POLICY "ai_agents_owner_delete" ON ai_agents
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Admins have full access
CREATE POLICY "ai_agents_admin_all" ON ai_agents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'admin' = ANY(profiles.roles)
    )
  );

-- =============================================================================
-- PART 6: Triggers for ai_agents
-- =============================================================================

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_ai_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_agents_updated_at();

-- =============================================================================
-- PART 7: Create platform agents (Sage defaults)
-- =============================================================================

-- Insert default Sage platform agents (if not exist)
INSERT INTO ai_agents (
  id,
  owner_id,
  name,
  display_name,
  description,
  agent_type,
  agent_context,
  subject,
  status,
  is_platform_owned,
  is_featured,
  priority_rank,
  storage_limit_mb
) VALUES
  -- Sage Tutors (General)
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE 'admin' = ANY(roles) LIMIT 1),
    'sage-tutor-general',
    'Sage - General Tutor',
    'Platform AI tutor for general learning across all subjects',
    'tutor',
    'platform',
    'general',
    'published',
    true,
    true,
    0,
    0
  ),
  -- Sage Tutors (Subject-specific)
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE 'admin' = ANY(roles) LIMIT 1),
    'sage-tutor-maths',
    'Sage - Maths Tutor',
    'Platform AI tutor specializing in mathematics',
    'tutor',
    'platform',
    'maths',
    'published',
    true,
    true,
    1,
    0
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE 'admin' = ANY(roles) LIMIT 1),
    'sage-tutor-english',
    'Sage - English Tutor',
    'Platform AI tutor specializing in English language and literature',
    'tutor',
    'platform',
    'english',
    'published',
    true,
    true,
    2,
    0
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE 'admin' = ANY(roles) LIMIT 1),
    'sage-tutor-science',
    'Sage - Science Tutor',
    'Platform AI tutor specializing in science',
    'tutor',
    'platform',
    'science',
    'published',
    true,
    true,
    3,
    0
  ),
  -- Sage Study Buddy
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE 'admin' = ANY(roles) LIMIT 1),
    'sage-study-buddy-general',
    'Sage - Study Buddy',
    'Platform AI study companion for revision and practice',
    'study_buddy',
    'platform',
    'general',
    'published',
    true,
    true,
    10,
    0
  ),
  -- Sage Coursework Assistant
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE 'admin' = ANY(roles) LIMIT 1),
    'sage-coursework-english',
    'Sage - Coursework Helper',
    'Platform AI assistant for coursework and essays',
    'coursework',
    'platform',
    'english',
    'published',
    true,
    true,
    20,
    0
  ),
  -- Sage Research Assistant
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE 'admin' = ANY(roles) LIMIT 1),
    'sage-research-general',
    'Sage - Research Assistant',
    'Platform AI assistant for academic research',
    'research_assistant',
    'platform',
    'general',
    'published',
    true,
    true,
    30,
    0
  ),
  -- Sage Exam Prep
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE 'admin' = ANY(roles) LIMIT 1),
    'sage-exam-prep-general',
    'Sage - Exam Prep Coach',
    'Platform AI coach for exam preparation',
    'exam_prep',
    'platform',
    'general',
    'published',
    true,
    true,
    40,
    0
  )
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- PART 8: Functions for backward compatibility
-- =============================================================================

-- Function to check AI tutor limit (now checks ai_agents)
CREATE OR REPLACE FUNCTION check_ai_tutor_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_caas_score INTEGER;
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  -- Get CaaS score
  SELECT caas_score INTO v_caas_score
  FROM profiles
  WHERE id = p_user_id;

  v_caas_score := COALESCE(v_caas_score, 0);

  -- Calculate limit: 1-50 based on score
  v_limit := GREATEST(1, LEAST(50, FLOOR(v_caas_score / 20) + 1));

  -- Count active AI agents (marketplace context only)
  SELECT COUNT(*) INTO v_current
  FROM ai_agents
  WHERE owner_id = p_user_id
    AND agent_context = 'marketplace'
    AND status != 'suspended';

  RETURN v_current < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 9: Comments and documentation
-- =============================================================================

COMMENT ON TABLE ai_agents IS 'Unified AI agents table supporting platform (Sage) and marketplace (AI Tutors) agents with multiple types';
COMMENT ON COLUMN ai_agents.agent_type IS 'Type of agent: tutor, coursework, study_buddy, research_assistant, exam_prep';
COMMENT ON COLUMN ai_agents.agent_context IS 'Context: platform (Sage, free) or marketplace (AI Tutors, paid)';
COMMENT ON COLUMN ai_agents.is_platform_owned IS 'True for Sage platform agents, false for user-created marketplace agents';

-- =============================================================================
-- SUMMARY
-- =============================================================================

DO $$
DECLARE
  platform_count INTEGER;
  marketplace_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO platform_count FROM ai_agents WHERE agent_context = 'platform';
  SELECT COUNT(*) INTO marketplace_count FROM ai_agents WHERE agent_context = 'marketplace';
  total_count := platform_count + marketplace_count;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'AI Agents Unified Architecture Migration';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total agents: %', total_count;
  RAISE NOTICE 'Platform agents (Sage): %', platform_count;
  RAISE NOTICE 'Marketplace agents (AI Tutors): %', marketplace_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Agent types breakdown:';
  RAISE NOTICE '- Tutors: %', (SELECT COUNT(*) FROM ai_agents WHERE agent_type = 'tutor');
  RAISE NOTICE '- Coursework: %', (SELECT COUNT(*) FROM ai_agents WHERE agent_type = 'coursework');
  RAISE NOTICE '- Study Buddy: %', (SELECT COUNT(*) FROM ai_agents WHERE agent_type = 'study_buddy');
  RAISE NOTICE '- Research Assistant: %', (SELECT COUNT(*) FROM ai_agents WHERE agent_type = 'research_assistant');
  RAISE NOTICE '- Exam Prep: %', (SELECT COUNT(*) FROM ai_agents WHERE agent_type = 'exam_prep');
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE '========================================';
END $$;

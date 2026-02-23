-- ===================================================================
-- Migration: 301_create_ai_tutors_tables.sql
-- Purpose: Create AI Tutor Studio database tables
-- Version: v1.0
-- Date: 2026-02-23
-- ===================================================================
-- This migration creates 7 tables for AI Tutor Studio feature:
-- - ai_tutors: Main AI tutor records
-- - ai_tutor_skills: Skills and specializations
-- - ai_tutor_materials: Uploaded files (PDF/DOCX/PPTX)
-- - ai_tutor_material_chunks: RAG chunks with embeddings
-- - ai_tutor_links: URL links (Phase 1)
-- - ai_tutor_sessions: Chat sessions with payments and reviews
-- - ai_tutor_subscriptions: £10/month Stripe subscriptions
--
-- Features:
-- - £10/month subscription per AI tutor
-- - Material upload (1GB storage limit)
-- - RAG with pgvector HNSW indexing
-- - Graduated limits (1-50 AI tutors based on CaaS score)
-- - URL links with priority system
-- - Session tracking with Sage fallback analytics
-- ===================================================================

-- ===================================================================
-- SECTION 1: CREATE AI_TUTORS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.ai_tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.connection_groups(id) ON DELETE SET NULL,

  -- Identity
  name VARCHAR(100) NOT NULL UNIQUE, -- URL slug (e.g., "physics-pro")
  display_name VARCHAR(100) NOT NULL, -- Display name (e.g., "Physics Pro")
  description TEXT,
  avatar_url TEXT,

  -- Classification
  subject VARCHAR(50) NOT NULL CHECK (subject IN (
    'maths',
    'english',
    'science',
    'biology',
    'chemistry',
    'physics',
    'computing',
    'history',
    'geography',
    'languages',
    'business',
    'economics',
    'psychology',
    'other'
  )),

  -- Pricing
  price_per_hour DECIMAL(10, 2) NOT NULL CHECK (price_per_hour >= 5.00 AND price_per_hour <= 100.00),
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'published',
    'unpublished',
    'suspended'
  )),
  subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN (
    'active',
    'inactive',
    'past_due',
    'canceled'
  )),

  -- Storage limits
  storage_used_mb INTEGER DEFAULT 0,
  storage_limit_mb INTEGER DEFAULT 1024, -- 1GB

  -- Denormalized stats (updated via triggers)
  total_sessions INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0.00,
  avg_rating DECIMAL(3, 2) DEFAULT NULL,
  total_reviews INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_session_at TIMESTAMPTZ
);

-- Add table comment
COMMENT ON TABLE public.ai_tutors IS 'v1.0: AI tutors created by tutors, trained on custom materials';

-- Add column comments
COMMENT ON COLUMN public.ai_tutors.name IS 'URL-safe slug (unique, used in routes)';
COMMENT ON COLUMN public.ai_tutors.display_name IS 'Human-readable display name';
COMMENT ON COLUMN public.ai_tutors.subscription_status IS 'Stripe subscription status (active required to publish)';
COMMENT ON COLUMN public.ai_tutors.storage_used_mb IS 'Total storage used by uploaded materials (MB)';
COMMENT ON COLUMN public.ai_tutors.storage_limit_mb IS 'Storage quota (default 1GB)';
COMMENT ON COLUMN public.ai_tutors.total_sessions IS 'Denormalized session count (updated via trigger)';
COMMENT ON COLUMN public.ai_tutors.total_revenue IS 'Denormalized total revenue (updated via trigger)';
COMMENT ON COLUMN public.ai_tutors.avg_rating IS 'Denormalized average rating (updated via trigger)';

-- ===================================================================
-- SECTION 2: CREATE AI_TUTOR_SKILLS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.ai_tutor_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES public.ai_tutors(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  is_custom BOOLEAN DEFAULT FALSE, -- User-defined vs template skill
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_ai_tutor_skill UNIQUE(ai_tutor_id, skill_name)
);

-- Add table comment
COMMENT ON TABLE public.ai_tutor_skills IS 'v1.0: Skills and specializations for AI tutors';

-- Add column comments
COMMENT ON COLUMN public.ai_tutor_skills.is_primary IS 'Whether this is a primary/featured skill';
COMMENT ON COLUMN public.ai_tutor_skills.is_custom IS 'User-defined (true) vs template skill (false)';

-- ===================================================================
-- SECTION 3: CREATE AI_TUTOR_MATERIALS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.ai_tutor_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES public.ai_tutors(id) ON DELETE CASCADE,

  -- File details
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'pdf', 'docx', 'pptx'
  file_size_mb DECIMAL(10, 2) NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage path

  -- Processing
  status VARCHAR(20) DEFAULT 'uploaded' CHECK (status IN (
    'uploaded',
    'processing',
    'ready',
    'failed'
  )),
  error_message TEXT,

  -- Metadata
  page_count INTEGER,
  word_count INTEGER,
  chunk_count INTEGER DEFAULT 0,

  -- Timestamps
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Add table comment
COMMENT ON TABLE public.ai_tutor_materials IS 'v1.0: Uploaded files (PDF/DOCX/PPTX) for AI tutor training';

-- Add column comments
COMMENT ON COLUMN public.ai_tutor_materials.file_type IS 'File type: pdf, docx, pptx';
COMMENT ON COLUMN public.ai_tutor_materials.status IS 'Processing status: uploaded, processing, ready, failed';
COMMENT ON COLUMN public.ai_tutor_materials.chunk_count IS 'Number of RAG chunks created from this material';

-- ===================================================================
-- SECTION 4: CREATE AI_TUTOR_MATERIAL_CHUNKS TABLE
-- ===================================================================

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ai_tutor_material_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.ai_tutor_materials(id) ON DELETE CASCADE,
  ai_tutor_id UUID NOT NULL REFERENCES public.ai_tutors(id) ON DELETE CASCADE,

  -- Chunk content
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Position within material
  page_number INTEGER,

  -- Embedding (Gemini: 768 dimensions)
  embedding vector(768) NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.ai_tutor_material_chunks IS 'v1.0: RAG chunks with embeddings for vector search';

-- Add column comments
COMMENT ON COLUMN public.ai_tutor_material_chunks.embedding IS 'Gemini embedding (768-dim vector)';
COMMENT ON COLUMN public.ai_tutor_material_chunks.chunk_index IS 'Position within source material (0-indexed)';

-- ===================================================================
-- SECTION 5: CREATE AI_TUTOR_LINKS TABLE (Phase 1)
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.ai_tutor_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES public.ai_tutors(id) ON DELETE CASCADE,

  -- URL details
  url TEXT NOT NULL CHECK (url ~* '^https?://.*'),
  title VARCHAR(255),
  description TEXT,

  -- Classification
  link_type VARCHAR(50), -- 'article', 'video', 'documentation', 'other'
  skills JSONB DEFAULT '[]'::jsonb, -- Array of skill names this link covers

  -- Priority (1 = high, 2 = medium, 3 = low)
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active',
    'broken',
    'removed'
  )),

  -- Timestamps
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

-- Add table comment
COMMENT ON TABLE public.ai_tutor_links IS 'v1.0: URL links for AI tutor reference (Phase 1)';

-- Add column comments
COMMENT ON COLUMN public.ai_tutor_links.priority IS 'Priority: 1 (high) → 2 (medium) → 3 (low)';
COMMENT ON COLUMN public.ai_tutor_links.skills IS 'JSONB array of skill names this link covers';
COMMENT ON COLUMN public.ai_tutor_links.link_type IS 'Link type: article, video, documentation, other';

-- ===================================================================
-- SECTION 6: CREATE AI_TUTOR_SESSIONS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.ai_tutor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES public.ai_tutors(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Pricing
  price_paid DECIMAL(10, 2) NOT NULL, -- Total paid by client
  platform_fee DECIMAL(10, 2) NOT NULL, -- 10% commission
  owner_earnings DECIMAL(10, 2) NOT NULL, -- 90% to owner

  -- Transcript
  messages JSONB DEFAULT '[]'::jsonb, -- Array of {role, content, timestamp, sources[]}

  -- Quality metrics
  fallback_to_sage_count INTEGER DEFAULT 0, -- Times Sage fallback was used
  thumbs_up_count INTEGER DEFAULT 0,
  thumbs_down_count INTEGER DEFAULT 0,

  -- Review
  reviewed BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active',
    'completed',
    'disputed',
    'refunded'
  ))
);

-- Add table comment
COMMENT ON TABLE public.ai_tutor_sessions IS 'v1.0: Chat sessions with AI tutors (includes transcript, payments, reviews)';

-- Add column comments
COMMENT ON COLUMN public.ai_tutor_sessions.fallback_to_sage_count IS 'Number of times Sage general knowledge was used';
COMMENT ON COLUMN public.ai_tutor_sessions.messages IS 'JSONB array of chat messages with sources';
COMMENT ON COLUMN public.ai_tutor_sessions.platform_fee IS '10% commission to platform';
COMMENT ON COLUMN public.ai_tutor_sessions.owner_earnings IS '90% earnings to AI tutor owner';

-- ===================================================================
-- SECTION 7: CREATE AI_TUTOR_SUBSCRIPTIONS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.ai_tutor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL UNIQUE REFERENCES public.ai_tutors(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,

  -- Subscription status
  status VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN (
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired'
  )),

  -- Pricing
  price_per_month DECIMAL(10, 2) DEFAULT 10.00,

  -- Billing cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Cancellation
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.ai_tutor_subscriptions IS 'v1.0: £10/month Stripe subscriptions for AI tutors';

-- Add column comments
COMMENT ON COLUMN public.ai_tutor_subscriptions.ai_tutor_id IS 'One subscription per AI tutor (unique constraint)';
COMMENT ON COLUMN public.ai_tutor_subscriptions.price_per_month IS 'Monthly price (default £10.00)';

-- ===================================================================
-- SECTION 8: CREATE INDEXES
-- ===================================================================

-- Indexes for ai_tutors
CREATE INDEX idx_ai_tutors_owner ON public.ai_tutors(owner_id);
CREATE INDEX idx_ai_tutors_status ON public.ai_tutors(status);
CREATE INDEX idx_ai_tutors_subject ON public.ai_tutors(subject);
CREATE INDEX idx_ai_tutors_published ON public.ai_tutors(published_at) WHERE status = 'published';
CREATE INDEX idx_ai_tutors_organisation ON public.ai_tutors(organisation_id) WHERE organisation_id IS NOT NULL;

-- Indexes for ai_tutor_skills
CREATE INDEX idx_ai_tutor_skills_tutor ON public.ai_tutor_skills(ai_tutor_id);
CREATE INDEX idx_ai_tutor_skills_name ON public.ai_tutor_skills(skill_name);

-- Indexes for ai_tutor_materials
CREATE INDEX idx_ai_tutor_materials_tutor ON public.ai_tutor_materials(ai_tutor_id);
CREATE INDEX idx_ai_tutor_materials_status ON public.ai_tutor_materials(status);

-- CRITICAL: HNSW index for vector similarity search
CREATE INDEX idx_ai_tutor_chunks_embedding ON public.ai_tutor_material_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_ai_tutor_chunks_tutor ON public.ai_tutor_material_chunks(ai_tutor_id);
CREATE INDEX idx_ai_tutor_chunks_material ON public.ai_tutor_material_chunks(material_id);

-- Indexes for ai_tutor_links
CREATE INDEX idx_ai_tutor_links_tutor ON public.ai_tutor_links(ai_tutor_id);
CREATE INDEX idx_ai_tutor_links_status ON public.ai_tutor_links(status);

-- Indexes for ai_tutor_sessions
CREATE INDEX idx_ai_tutor_sessions_tutor ON public.ai_tutor_sessions(ai_tutor_id);
CREATE INDEX idx_ai_tutor_sessions_client ON public.ai_tutor_sessions(client_id);
CREATE INDEX idx_ai_tutor_sessions_started ON public.ai_tutor_sessions(started_at);
CREATE INDEX idx_ai_tutor_sessions_reviewed ON public.ai_tutor_sessions(reviewed, rating) WHERE reviewed = TRUE;

-- Indexes for ai_tutor_subscriptions
CREATE INDEX idx_ai_tutor_subscriptions_owner ON public.ai_tutor_subscriptions(owner_id);
CREATE INDEX idx_ai_tutor_subscriptions_stripe ON public.ai_tutor_subscriptions(stripe_subscription_id);
CREATE INDEX idx_ai_tutor_subscriptions_status ON public.ai_tutor_subscriptions(status);

-- ===================================================================
-- SECTION 9: ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS for all tables
ALTER TABLE public.ai_tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_material_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_subscriptions ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- RLS Policies: ai_tutors
-- ===================================================================

-- Policy: Users can view own AI tutors OR published AI tutors
CREATE POLICY "Users can view own or published AI tutors"
  ON public.ai_tutors FOR SELECT
  USING (owner_id = auth.uid() OR status = 'published');

-- Policy: Users can insert own AI tutors
CREATE POLICY "Users can insert own AI tutors"
  ON public.ai_tutors FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy: Users can update own AI tutors
CREATE POLICY "Users can update own AI tutors"
  ON public.ai_tutors FOR UPDATE
  USING (owner_id = auth.uid());

-- Policy: Users can delete own AI tutors
CREATE POLICY "Users can delete own AI tutors"
  ON public.ai_tutors FOR DELETE
  USING (owner_id = auth.uid());

-- ===================================================================
-- RLS Policies: ai_tutor_skills
-- ===================================================================

-- Policy: Users can view skills for accessible AI tutors
CREATE POLICY "Users can view skills for accessible AI tutors"
  ON public.ai_tutor_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_skills.ai_tutor_id
        AND (owner_id = auth.uid() OR status = 'published')
    )
  );

-- Policy: Users can insert skills for own AI tutors
CREATE POLICY "Users can insert skills for own AI tutors"
  ON public.ai_tutor_skills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_skills.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- Policy: Users can update skills for own AI tutors
CREATE POLICY "Users can update skills for own AI tutors"
  ON public.ai_tutor_skills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_skills.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- Policy: Users can delete skills for own AI tutors
CREATE POLICY "Users can delete skills for own AI tutors"
  ON public.ai_tutor_skills FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_skills.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- ===================================================================
-- RLS Policies: ai_tutor_materials
-- ===================================================================

-- Policy: Users can view materials for own AI tutors
CREATE POLICY "Users can view materials for own AI tutors"
  ON public.ai_tutor_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_materials.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- Policy: Users can insert materials for own AI tutors
CREATE POLICY "Users can insert materials for own AI tutors"
  ON public.ai_tutor_materials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_materials.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- Policy: Users can update materials for own AI tutors
CREATE POLICY "Users can update materials for own AI tutors"
  ON public.ai_tutor_materials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_materials.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- Policy: Users can delete materials for own AI tutors
CREATE POLICY "Users can delete materials for own AI tutors"
  ON public.ai_tutor_materials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_materials.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- ===================================================================
-- RLS Policies: ai_tutor_material_chunks
-- ===================================================================

-- Policy: Users can view chunks for own AI tutors
CREATE POLICY "Users can view chunks for own AI tutors"
  ON public.ai_tutor_material_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_material_chunks.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- Policy: Service role can manage chunks (for background processing)
CREATE POLICY "Service role can manage chunks"
  ON public.ai_tutor_material_chunks FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ===================================================================
-- RLS Policies: ai_tutor_links
-- ===================================================================

-- Policy: Users can view links for accessible AI tutors
CREATE POLICY "Users can view links for accessible AI tutors"
  ON public.ai_tutor_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_links.ai_tutor_id
        AND (owner_id = auth.uid() OR status = 'published')
    )
  );

-- Policy: Users can insert links for own AI tutors
CREATE POLICY "Users can insert links for own AI tutors"
  ON public.ai_tutor_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_links.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- Policy: Users can update links for own AI tutors
CREATE POLICY "Users can update links for own AI tutors"
  ON public.ai_tutor_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_links.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- Policy: Users can delete links for own AI tutors
CREATE POLICY "Users can delete links for own AI tutors"
  ON public.ai_tutor_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_links.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- ===================================================================
-- RLS Policies: ai_tutor_sessions
-- ===================================================================

-- Policy: Users can view own sessions (as client or owner)
CREATE POLICY "Users can view own sessions"
  ON public.ai_tutor_sessions FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_sessions.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- Policy: Service role can insert sessions (via booking API)
CREATE POLICY "Service role can insert sessions"
  ON public.ai_tutor_sessions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Users can update own sessions (for feedback)
CREATE POLICY "Users can update own sessions"
  ON public.ai_tutor_sessions FOR UPDATE
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ai_tutors
      WHERE id = ai_tutor_sessions.ai_tutor_id
        AND owner_id = auth.uid()
    )
  );

-- ===================================================================
-- RLS Policies: ai_tutor_subscriptions
-- ===================================================================

-- Policy: Users can view own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.ai_tutor_subscriptions FOR SELECT
  USING (owner_id = auth.uid());

-- Policy: Service role can manage subscriptions (via webhook)
CREATE POLICY "Service role can manage subscriptions"
  ON public.ai_tutor_subscriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Users can insert own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON public.ai_tutor_subscriptions FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy: Users can update own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON public.ai_tutor_subscriptions FOR UPDATE
  USING (owner_id = auth.uid());

-- ===================================================================
-- SECTION 10: TRIGGERS
-- ===================================================================

-- Trigger to automatically update updated_at timestamp on ai_tutors
CREATE TRIGGER update_ai_tutors_updated_at
  BEFORE UPDATE ON public.ai_tutors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to automatically update updated_at timestamp on ai_tutor_subscriptions
CREATE TRIGGER update_ai_tutor_subscriptions_updated_at
  BEFORE UPDATE ON public.ai_tutor_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================================
-- SECTION 11: VALIDATION
-- ===================================================================

-- Verify tables were created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_tutors'
  ) THEN
    RAISE EXCEPTION 'Table ai_tutors was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_tutor_skills'
  ) THEN
    RAISE EXCEPTION 'Table ai_tutor_skills was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_tutor_materials'
  ) THEN
    RAISE EXCEPTION 'Table ai_tutor_materials was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_tutor_material_chunks'
  ) THEN
    RAISE EXCEPTION 'Table ai_tutor_material_chunks was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_tutor_links'
  ) THEN
    RAISE EXCEPTION 'Table ai_tutor_links was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_tutor_sessions'
  ) THEN
    RAISE EXCEPTION 'Table ai_tutor_sessions was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_tutor_subscriptions'
  ) THEN
    RAISE EXCEPTION 'Table ai_tutor_subscriptions was not created successfully';
  END IF;

  RAISE NOTICE 'Migration 301_create_ai_tutors_tables completed successfully';
  RAISE NOTICE '✓ Created ai_tutors table';
  RAISE NOTICE '✓ Created ai_tutor_skills table';
  RAISE NOTICE '✓ Created ai_tutor_materials table';
  RAISE NOTICE '✓ Created ai_tutor_material_chunks table with vector(768) embeddings';
  RAISE NOTICE '✓ Created ai_tutor_links table (Phase 1)';
  RAISE NOTICE '✓ Created ai_tutor_sessions table';
  RAISE NOTICE '✓ Created ai_tutor_subscriptions table';
  RAISE NOTICE '✓ Created indexes including HNSW vector index';
  RAISE NOTICE '✓ Created RLS policies';
  RAISE NOTICE '✓ Created triggers';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================

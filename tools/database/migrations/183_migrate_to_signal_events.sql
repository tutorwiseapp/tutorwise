-- Migration: blog_attribution_events → signal_events
-- Strategy: Zero-downtime migration using views for backward compatibility
-- Week 1: Database Layer
-- Estimated Duration: 30 minutes (off-peak)

-- ============================================================================
-- STEP 1: Create new signal_events table with signal_id
-- ============================================================================

CREATE TABLE signal_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- NEW: Signal ID for journey tracking (like Datadog's trace_id)
  signal_id UUID,  -- Links all events in a user journey across sessions

  -- Source Context (generic, not blog-specific)
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article' CHECK (content_type IN (
    'article',      -- Blog articles (current)
    'podcast',      -- Future: Podcast episodes
    'video',        -- Future: Video content
    'webinar'       -- Future: Webinar recordings
  )),

  -- User Identity
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,

  -- Event Target
  target_type TEXT NOT NULL CHECK (target_type IN (
    'article',           -- Blog article view
    'tutor',            -- Tutor profile click
    'listing',          -- Listing view
    'booking',          -- Booking conversion
    'referral',         -- Referral link click
    'wiselist_item'     -- Save to wiselist
  )),
  target_id UUID NOT NULL,

  -- Event Classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression',   -- Content viewed
    'click',        -- Link/CTA clicked
    'save',         -- Content saved
    'refer',        -- Referral shared
    'convert'       -- Booking completed
  )),

  -- Interaction Surface
  source_component TEXT NOT NULL CHECK (source_component IN (
    'listing_grid',      -- Embedded listing grid
    'tutor_embed',       -- Single tutor card
    'tutor_carousel',    -- Multi-tutor carousel
    'cta_button',        -- CTA button click
    'inline_link',       -- Inline text link
    'floating_save',     -- Floating save button
    'article_header',    -- Article header CTA
    'distribution'       -- From LinkedIn/social distribution
  )),

  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

-- Journey tracking: Find all events for a signal_id
CREATE INDEX idx_signal_events_signal_id
ON signal_events(signal_id)
WHERE signal_id IS NOT NULL;

-- Content performance: Find all events for a piece of content
CREATE INDEX idx_signal_events_content
ON signal_events(content_id, content_type, created_at DESC);

-- User journey: Find all events for a user
CREATE INDEX idx_signal_events_user
ON signal_events(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Session tracking: Find events in a session
CREATE INDEX idx_signal_events_session
ON signal_events(session_id, created_at DESC)
WHERE session_id IS NOT NULL;

-- Target tracking: Find events for a specific target (e.g., listing views)
CREATE INDEX idx_signal_events_target
ON signal_events(target_type, target_id, created_at DESC);

-- Event type analytics: Count impressions, clicks, conversions by content
CREATE INDEX idx_signal_events_event_type
ON signal_events(event_type, content_id, created_at DESC);

-- Time-series queries: Efficient date range filtering
CREATE INDEX idx_signal_events_created_at
ON signal_events(created_at DESC);

-- Composite index for common dashboard queries
CREATE INDEX idx_signal_events_dashboard
ON signal_events(content_type, created_at DESC, event_type)
WHERE content_type = 'article';

-- ============================================================================
-- STEP 3: Copy existing data from blog_attribution_events
-- ============================================================================

INSERT INTO signal_events (
  id,
  signal_id,           -- NULL for existing events (no journey tracking yet)
  content_id,
  content_type,
  user_id,
  session_id,
  target_type,
  target_id,
  event_type,
  source_component,
  metadata,
  created_at
)
SELECT
  id,
  NULL AS signal_id,  -- Will be populated when signal tracking is enabled
  blog_article_id AS content_id,
  'article' AS content_type,  -- All existing events are blog articles
  user_id,
  session_id,
  target_type,
  target_id,
  event_type,
  source_component,
  metadata,
  created_at
FROM blog_attribution_events;

-- ============================================================================
-- STEP 4: Rename old table to backup
-- ============================================================================

ALTER TABLE blog_attribution_events
RENAME TO blog_attribution_events_backup;

-- ============================================================================
-- STEP 5: Create view for backward compatibility
-- ============================================================================

-- This view allows existing code to continue reading from "blog_attribution_events"
-- while actually reading from "signal_events"
CREATE VIEW blog_attribution_events AS
SELECT
  id,
  content_id AS blog_article_id,  -- Map back to old column name
  user_id,
  session_id,
  target_type,
  target_id,
  event_type,
  source_component,
  metadata,
  created_at
FROM signal_events
WHERE content_type = 'article';  -- Filter to blog articles only

-- ============================================================================
-- STEP 6: Create trigger for backward-compatible writes
-- ============================================================================

-- Allow INSERT INTO blog_attribution_events to write to signal_events
CREATE FUNCTION fn_blog_attribution_events_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO signal_events (
    id,
    content_id,
    content_type,
    user_id,
    session_id,
    target_type,
    target_id,
    event_type,
    source_component,
    metadata,
    created_at
  ) VALUES (
    COALESCE(NEW.id, uuid_generate_v4()),
    NEW.blog_article_id,
    'article',
    NEW.user_id,
    NEW.session_id,
    NEW.target_type,
    NEW.target_id,
    NEW.event_type,
    NEW.source_component,
    NEW.metadata,
    COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_attribution_events_insert
INSTEAD OF INSERT ON blog_attribution_events
FOR EACH ROW
EXECUTE FUNCTION fn_blog_attribution_events_insert();

-- ============================================================================
-- STEP 7: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE signal_events ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert events (for tracking)
CREATE POLICY "Anyone can insert signal events"
ON signal_events
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Policy: Users can read their own events
CREATE POLICY "Users can read their own signal events"
ON signal_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Admins can read all events
CREATE POLICY "Admins can read all signal events"
ON signal_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.roles ? 'admin'
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify success:

-- 1. Check row counts match
-- SELECT
--   (SELECT COUNT(*) FROM signal_events WHERE content_type = 'article') as signal_events_count,
--   (SELECT COUNT(*) FROM blog_attribution_events_backup) as backup_count;

-- 2. Verify view returns same data
-- SELECT COUNT(*) FROM blog_attribution_events;

-- 3. Test INSERT through view
-- INSERT INTO blog_attribution_events (
--   blog_article_id, user_id, session_id, target_type, target_id,
--   event_type, source_component
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   NULL, 'test_session', 'tutor', '00000000-0000-0000-0000-000000000000'::uuid,
--   'click', 'tutor_embed'
-- );
-- SELECT * FROM signal_events WHERE session_id = 'test_session';
-- DELETE FROM signal_events WHERE session_id = 'test_session';

-- 4. Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'signal_events';

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- If migration fails, run:
-- DROP VIEW IF EXISTS blog_attribution_events CASCADE;
-- DROP TRIGGER IF EXISTS trg_blog_attribution_events_insert ON blog_attribution_events;
-- DROP FUNCTION IF EXISTS fn_blog_attribution_events_insert();
-- ALTER TABLE blog_attribution_events_backup RENAME TO blog_attribution_events;
-- DROP TABLE IF EXISTS signal_events;

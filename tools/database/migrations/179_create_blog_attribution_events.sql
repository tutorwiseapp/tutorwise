/**
 * Filename: tools/database/migrations/179_create_blog_attribution_events.sql
 * Purpose: Create event-based attribution tracking table (source of truth)
 * Created: 2026-01-16
 *
 * This migration creates the canonical event stream for blog-to-marketplace attribution.
 * Events are immutable and represent evidence, not conclusions.
 * Attribution models (first-touch, last-touch, etc.) are derived at query time.
 */

-- ============================================================================
-- 1. CREATE blog_attribution_events TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_attribution_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source Context
  blog_article_id UUID NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,

  -- User Identity (nullable for anonymous users)
  user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT NULL,

  -- Event Target
  target_type TEXT NOT NULL CHECK (target_type IN (
    'article',
    'tutor',
    'listing',
    'booking',
    'referral',
    'wiselist_item'
  )),
  target_id UUID NOT NULL,

  -- Event Classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression',  -- Component loaded/visible
    'click',       -- User clicked embed/link
    'save',        -- User saved to wiselist
    'refer',       -- User shared with referral code
    'convert'      -- User created booking/referral
  )),

  -- Interaction Surface
  source_component TEXT NOT NULL CHECK (source_component IN (
    'listing_grid',      -- <ListingGrid /> MDX component
    'tutor_embed',       -- <TutorEmbed /> MDX component
    'tutor_carousel',    -- <TutorCarousel /> MDX component
    'cta_button',        -- Call-to-action button in article
    'inline_link',       -- Text link within article content
    'floating_save',     -- Floating save button
    'article_header'     -- Save button in article header
  )),

  -- Additional Context
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp (immutable)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Primary query patterns for attribution analysis

-- Find all events for a specific article (most common)
CREATE INDEX idx_events_article_time ON blog_attribution_events(blog_article_id, created_at DESC);

-- Find all events for a logged-in user
CREATE INDEX idx_events_user_time ON blog_attribution_events(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Find all events in a session (anonymous tracking)
CREATE INDEX idx_events_session_time ON blog_attribution_events(session_id, created_at DESC)
WHERE session_id IS NOT NULL;

-- Find events by target (e.g., "which articles influenced this booking?")
CREATE INDEX idx_events_target ON blog_attribution_events(target_type, target_id, created_at DESC);

-- Find events by type (e.g., "all conversion events")
CREATE INDEX idx_events_type ON blog_attribution_events(event_type, created_at DESC);

-- Composite for dashboard queries
CREATE INDEX idx_events_article_type ON blog_attribution_events(blog_article_id, event_type, created_at DESC);

-- ============================================================================
-- 3. ADD CLARIFYING COMMENTS TO EXISTING CACHE COLUMNS
-- ============================================================================

-- Update semantic meaning of cache fields in existing tables
COMMENT ON COLUMN bookings.source_blog_article_id IS
  'Last-touch attribution cache (denormalized from blog_attribution_events for performance).
   Use blog_attribution_events table for multi-touch attribution and full influence history.';

COMMENT ON COLUMN referrals.source_blog_article_id IS
  'Last-touch attribution cache (denormalized from blog_attribution_events for performance).
   Use blog_attribution_events table for multi-touch attribution and full influence history.';

COMMENT ON COLUMN wiselist_items.source_blog_article_id IS
  'Last-touch attribution cache (denormalized from blog_attribution_events for performance).
   Use blog_attribution_events table for multi-touch attribution and full influence history.';

-- ============================================================================
-- 4. ADD TABLE AND COLUMN COMMENTS
-- ============================================================================

COMMENT ON TABLE blog_attribution_events IS
  'Immutable event stream capturing all blog-to-marketplace interactions.
   This is the source of truth for attribution analysis.
   Cache columns in other tables are denormalized last-touch optimizations.';

COMMENT ON COLUMN blog_attribution_events.user_id IS
  'References authenticated user. NULL for anonymous users (use session_id for tracking).';

COMMENT ON COLUMN blog_attribution_events.session_id IS
  'Client-generated UUID stored in cookie. Bridges anonymous → logged-in user journeys.';

COMMENT ON COLUMN blog_attribution_events.metadata IS
  'Additional context stored as JSONB. Common keys:
   - embed_instance_id: Stable ID for comparing embed performance
   - position: Position of component in article (0-indexed)
   - context: Component-specific context (e.g., "recommended", "author")
   - wiselist_id: Target wiselist for save events
   - referral_code: Referral code for refer events';

COMMENT ON COLUMN blog_attribution_events.created_at IS
  'Event timestamp (immutable). Used for attribution window calculations (e.g., 7-day lookback).';

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE blog_attribution_events ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for anonymous users)
CREATE POLICY "Anyone can insert attribution events"
  ON blog_attribution_events
  FOR INSERT
  WITH CHECK (true);

-- Users can read their own events (by user_id or session_id)
CREATE POLICY "Users can read own attribution events"
  ON blog_attribution_events
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR session_id = current_setting('app.session_id', true)
  );

-- Admins can read all events (for dashboard)
CREATE POLICY "Admins can read all attribution events"
  ON blog_attribution_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND 'admin' = ANY(roles)
    )
  );

-- No updates or deletes (immutable event stream)
-- Events are append-only

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for service role and authenticated users
GRANT SELECT, INSERT ON blog_attribution_events TO authenticated;
GRANT SELECT, INSERT ON blog_attribution_events TO anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test event taxonomy constraints
-- INSERT INTO blog_attribution_events (blog_article_id, target_type, target_id, event_type, source_component)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'listing', '00000000-0000-0000-0000-000000000000', 'click', 'listing_grid');

-- Query event stream for an article
-- SELECT * FROM blog_attribution_events WHERE blog_article_id = 'xxx' ORDER BY created_at DESC;

-- Query events for a conversion target
-- SELECT * FROM blog_attribution_events WHERE target_type = 'booking' AND target_id = 'xxx' ORDER BY created_at ASC;

-- Query conversion funnel
-- SELECT event_type, COUNT(*) FROM blog_attribution_events WHERE blog_article_id = 'xxx' GROUP BY event_type;

/*
 * Migration: 374_create_platform_knowledge_chunks.sql
 * Purpose: Platform-wide knowledge base for Conductor agents (Phase 4A)
 * Created: 2026-03-10
 *
 * Covers all Phase 3 intelligence domains + original workflow categories.
 * Embedding: 768-dim (Gemini gemini-embedding-001)
 */

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Table ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_knowledge_chunks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  embedding   vector(768),
  -- Original workflow categories + all Phase 3 intelligence domains
  category    TEXT        NOT NULL CHECK (category IN (
    'workflow_process', 'handler_doc', 'policy', 'help_article',
    -- Phase 3 intelligence domains:
    'intel_caas', 'intel_resources', 'intel_seo', 'intel_marketplace',
    'intel_listings', 'intel_bookings', 'intel_financials',
    'intel_virtualspace', 'intel_referral', 'intel_retention',
    'intel_ai_adoption', 'intel_org_conversion', 'intel_ai_studio',
    'intel_network'
  )),
  source_ref  TEXT,       -- process ID, handler filename, intelligence table name, etc.
  tags        TEXT[]      DEFAULT '{}',
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pkc_category
  ON platform_knowledge_chunks(category);

CREATE INDEX IF NOT EXISTS idx_pkc_tags
  ON platform_knowledge_chunks USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_pkc_embedding
  ON platform_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── Updated-at trigger ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_pkc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pkc_updated_at
  BEFORE UPDATE ON platform_knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION update_pkc_updated_at();

-- ── Semantic search RPC ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_platform_knowledge_chunks(
  query_embedding   vector(768),
  match_category    TEXT    DEFAULT NULL,
  match_count       INT     DEFAULT 5,
  match_threshold   FLOAT   DEFAULT 0.5
)
RETURNS TABLE (
  id          UUID,
  title       TEXT,
  content     TEXT,
  category    TEXT,
  source_ref  TEXT,
  tags        TEXT[],
  similarity  FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    pkc.id,
    pkc.title,
    pkc.content,
    pkc.category,
    pkc.source_ref,
    pkc.tags,
    1 - (pkc.embedding <=> query_embedding) AS similarity
  FROM platform_knowledge_chunks pkc
  WHERE
    (match_category IS NULL OR pkc.category = match_category)
    AND pkc.embedding IS NOT NULL
    AND 1 - (pkc.embedding <=> query_embedding) > match_threshold
  ORDER BY pkc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE platform_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admin full access to platform_knowledge_chunks"
  ON platform_knowledge_chunks
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Authenticated users (agents) can read
CREATE POLICY "Authenticated users can read platform_knowledge_chunks"
  ON platform_knowledge_chunks
  FOR SELECT
  TO authenticated
  USING (true);

-- ── Seed: initial intelligence domain explainer chunks ────────────────────────
-- These are seeded without embeddings (admin must generate via Knowledge UI)
INSERT INTO platform_knowledge_chunks (title, content, category, source_ref, tags) VALUES
  (
    'CaaS Score Overview',
    'The Credibility and Achievement Score (CaaS) measures tutor credibility on a 0-100 scale. Score < 70 means a tutor is not featured in search results. Key signals: profile completeness, verified qualifications, review count, booking history, response rate. Tutors below 70 should be nudged to complete their profiles and collect reviews. Threshold for "featured" tier: 70. High-performing tutors (85+) appear prominently in search.',
    'intel_caas',
    'caas_platform_metrics_daily',
    ARRAY['caas', 'score', 'credibility', 'featured']
  ),
  (
    'Marketplace Supply/Demand Intelligence',
    'The marketplace tool query_supply_demand_gap analyses subject/level combinations to surface supply shortages. High demand + low supply = monetisation opportunity for recruitment. marketplace_search_events logs every search for gap analysis. Key metrics: search volume, listing count, conversion rate, avg time-to-booking.',
    'intel_marketplace',
    'marketplace_platform_metrics_daily',
    ARRAY['marketplace', 'supply', 'demand', 'search']
  ),
  (
    'Referral Network Intelligence',
    'referral_network_stats (materialized view) captures avg_depth, max_depth, hub_count, ghost_rate_pct, delegation_adoption_pct. A ghost signup is a referred user who never completes a booking. Network depth > 2 hops indicates strong viral growth. K-coefficient > 1 means viral. Referral commission is always 10% regardless of referrer role.',
    'intel_referral',
    'referral_metrics_daily',
    ARRAY['referral', 'network', 'k-coefficient', 'viral']
  ),
  (
    'Retention and Churn Intelligence',
    'retention_platform_metrics_daily (daily 09:30 UTC) tracks cohort retention, churn signals, and at-risk users. A user is "at-risk" if: no booking in 30d + caas_score declining + listing not viewed in 14d. Retention Monitor agent runs daily at 08:00 UTC to identify at-risk tutors for proactive nudging.',
    'intel_retention',
    'retention_platform_metrics_daily',
    ARRAY['retention', 'churn', 'at-risk', 'cohort']
  ),
  (
    'Bookings Health Intelligence',
    'bookings_platform_metrics_daily (daily 06:30 UTC) aggregates booking counts, cancellation rates, avg lead time, peak hour patterns. High cancellation rate (>15%) for a tutor is a quality signal. Next booking date is a key urgency signal for proactive outreach. query_booking_health tool surfaces at-risk bookings.',
    'intel_bookings',
    'bookings_platform_metrics_daily',
    ARRAY['bookings', 'cancellation', 'health', 'lead-time']
  ),
  (
    'Listing Quality and Completeness',
    'listings_platform_metrics_daily (daily 07:00 UTC) tracks listing completeness scores, view counts, conversion rates. compute_listing_completeness_score() returns 0-100. Listings below 70 completeness rarely convert. Key missing fields: bio, photo, qualifications, subject tags, hourly rate, availability. AI agent (AI tutor) listings need active status.',
    'intel_listings',
    'listings_platform_metrics_daily',
    ARRAY['listing', 'completeness', 'quality', 'conversion']
  ),
  (
    'Financial Health Intelligence',
    'financials_platform_metrics_daily (daily 07:30 UTC) tracks GMV, platform take-rate, pending payouts, stripe issues. Commission splits: direct booking = 90/10 tutor/platform; referred = 80/10/10 tutor/platform/referrer. Payout is triggered by commission-payout workflow on Friday mornings. Stripe issues flag tutors who need reconnection.',
    'intel_financials',
    'financials_platform_metrics_daily',
    ARRAY['financials', 'commission', 'payout', 'stripe']
  ),
  (
    'Tutor Approval Workflow',
    'Workflow: tutor-approval. Trigger: profiles.status changes to under_review (DB webhook). Steps: AI review node → CaaS calculation → human approval (if borderline) → notification. Decision signals: profile completeness, qualifications verified, CaaS score > 50. Currently in live mode. Shadow divergence tracked in workflow_executions.shadow_divergence.',
    'workflow_process',
    'tutor-approval',
    ARRAY['tutor', 'approval', 'workflow', 'process']
  ),
  (
    'Commission Payout Workflow',
    'Workflow: commission-payout. Trigger: pg_cron at 10:00 Fridays. Steps: query pending commissions → batch Stripe transfers → mark paid → notify tutors. Uses handle_successful_payment RPC for splitting. Cron guard: skips if commission-payout process is already running. Currently in live mode.',
    'workflow_process',
    'commission-payout',
    ARRAY['commission', 'payout', 'workflow', 'stripe']
  );

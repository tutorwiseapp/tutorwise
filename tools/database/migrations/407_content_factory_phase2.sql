/*
 * Migration: 407_content_factory_phase2.sql
 * Purpose: Content Factory Phase 2 — Feedback Loop
 * Created: 2026-03-15
 *
 * 1. Register query_content_pipeline tool in analyst_tools
 * 2. Update content-strategist config to include query_content_pipeline tool
 * 3. Add 'content_strategy' category to platform_knowledge_chunks CHECK constraint
 * 4. Seed series plan knowledge chunks (no embeddings — matched by category)
 * 5. Create weekly scheduled_item for content-team (Monday 06:00 UTC)
 */

-- ── 1. Register query_content_pipeline tool ─────────────────────────────────────
INSERT INTO analyst_tools (slug, name, description, input_schema, status)
VALUES (
  'query_content_pipeline',
  'Query Content Pipeline',
  'Returns the content pipeline status: series plan, published articles, article performance scores, and recommendations for the next article to write.',
  '{
    "type": "object",
    "properties": {
      "series": {
        "type": "string",
        "description": "Filter to a specific series (s1 or s2). Omit for all series."
      },
      "include_scores": {
        "type": "boolean",
        "description": "Include intelligence scores for published articles. Default true."
      }
    }
  }'::jsonb,
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Update content-strategist config to include query_content_pipeline ────────
UPDATE specialist_agents
SET config = jsonb_set(
  config,
  '{tools}',
  (config->'tools') || '["query_content_pipeline"]'::jsonb
),
updated_at = now()
WHERE slug = 'content-strategist'
  AND NOT (config->'tools') ? 'query_content_pipeline';

-- ── 3. Add content_strategy category to platform_knowledge_chunks ───────────────
ALTER TABLE platform_knowledge_chunks
  DROP CONSTRAINT IF EXISTS platform_knowledge_chunks_category_check;

ALTER TABLE platform_knowledge_chunks
  ADD CONSTRAINT platform_knowledge_chunks_category_check
  CHECK (category IN (
    'workflow_process', 'handler_doc', 'policy', 'help_article',
    'intel_caas', 'intel_resources', 'intel_seo', 'intel_marketplace',
    'intel_listings', 'intel_bookings', 'intel_financials',
    'intel_virtualspace', 'intel_referral', 'intel_retention',
    'intel_ai_adoption', 'intel_org_conversion', 'intel_ai_studio',
    'intel_network',
    'content_strategy'
  ));

-- ── 4. Seed series plan knowledge chunks ────────────────────────────────────────
-- These are matched by category, not semantic search (no embeddings needed).
-- The content-strategist agent is mapped to 'content_strategy' in AGENT_KNOWLEDGE_CATEGORY.

INSERT INTO platform_knowledge_chunks (title, content, category, source_ref, tags)
VALUES (
  'Content Series Plan — S1: From DevOps to Agents',
  E'Series 1: From DevOps to Agents\n'
  E'Theme: How container engineering patterns (Docker, Kubernetes, Swarm) map directly to AI agent orchestration.\n'
  E'Target audience: CTOs, Heads of Engineering, Platform Architects, senior developers.\n'
  E'Tone: Technical thought-leadership. Authoritative, precise, not salesy.\n'
  E'Category: thought-leadership\n\n'
  E'Articles (ordered):\n'
  E'1. The Agent Marketplace is Docker Hub''s Moment — Status: PUBLISHED\n'
  E'   Angle: The registry/marketplace model that made Docker dominant is now emerging for AI agents.\n'
  E'2. Registry, Not Framework — Status: PUBLISHED\n'
  E'   Angle: Why agent registries matter more than agent frameworks for enterprise adoption.\n'
  E'3. HITL is Architecture, Not a Feature — Status: PUBLISHED\n'
  E'   Angle: Human-in-the-loop must be designed into the orchestration layer, not bolted on.\n'
  E'4. Supervisor, Pipeline, or Swarm — Status: NOT WRITTEN\n'
  E'   Angle: The three multi-agent coordination patterns, when to use each, real production tradeoffs.\n'
  E'5. The AI Adoption Curve Inside Your Company — Status: NOT WRITTEN\n'
  E'   Angle: Shadow → live promotion model. How enterprises safely move AI from experiment to production.\n\n'
  E'Series cross-references: Technical White Paper (conductor/publish/01-technical-white-paper.md)',
  'content_strategy',
  'publications/strategy/s1-devops-to-agents',
  ARRAY['series-plan', 's1', 'devops', 'agents', 'thought-leadership']
)
ON CONFLICT DO NOTHING;

INSERT INTO platform_knowledge_chunks (title, content, category, source_ref, tags)
VALUES (
  'Content Series Plan — S2: From Agents to Education',
  E'Series 2: From Agents to Education\n'
  E'Theme: How AI agent infrastructure applies specifically to the education/tutoring vertical.\n'
  E'Target audience: EdTech leaders, education policy makers, tutoring agency founders, investors.\n'
  E'Tone: Industry insight with technical credibility. Bridge between tech and education.\n'
  E'Category: thought-leadership\n\n'
  E'Articles (ordered):\n'
  E'1. Why Education is the Perfect First Vertical — Status: NOT WRITTEN\n'
  E'   Angle: High-touch, trust-critical, regulation-heavy — exactly where AI orchestration shines.\n'
  E'2. The AI Tutor is Not a Chatbot — Status: NOT WRITTEN\n'
  E'   Angle: Why LLM wrappers fail at education and what a proper AI tutor architecture looks like.\n'
  E'3. Marketplace Economics When Supply is AI — Status: NOT WRITTEN\n'
  E'   Angle: How marketplace dynamics change when AI agents are suppliers alongside human tutors.\n'
  E'4. How 18 Specialist Agents Run a UK EdTech — Status: NOT WRITTEN\n'
  E'   Angle: Case study of Tutorwise''s agent fleet: what each does, how they coordinate.\n'
  E'5. UK Tutoring Needs Infrastructure, Not Another App — Status: NOT WRITTEN\n'
  E'   Angle: The UK tutoring market is fragmented. Infrastructure wins over yet another marketplace.\n\n'
  E'Series cross-references: Investor Thesis (conductor/publish/02-investor-thesis.md)',
  'content_strategy',
  'publications/strategy/s2-agents-to-education',
  ARRAY['series-plan', 's2', 'education', 'tutoring', 'thought-leadership']
)
ON CONFLICT DO NOTHING;

INSERT INTO platform_knowledge_chunks (title, content, category, source_ref, tags)
VALUES (
  'Content Pipeline Guidelines',
  E'Content Pipeline Operating Guidelines\n\n'
  E'1. ARTICLE SELECTION PRIORITY:\n'
  E'   - Complete Series 1 before starting Series 2 (S1 has 3/5 published, S2 has 0/5).\n'
  E'   - Within a series, write articles in order (each builds on previous).\n'
  E'   - Check article_intelligence_scores for the most recent published article to inform the next one.\n\n'
  E'2. PERFORMANCE FEEDBACK:\n'
  E'   - Use query_content_pipeline tool to check published article performance.\n'
  E'   - Articles with high conversion_score but low readability_score → next article should be more accessible.\n'
  E'   - Articles with high readability but low seo_score → next article needs stronger keyword placement.\n'
  E'   - Use query_editorial_opportunities to find content gaps in the broader resource library.\n\n'
  E'3. BRIEF FORMAT:\n'
  E'   Your output must be a structured brief with: title, angle, target_audience, keywords (5-8), category, outline (3-5 sections).\n'
  E'   The content-writer agent will use this brief to write the full article.\n\n'
  E'4. QUALITY SIGNALS:\n'
  E'   - Target SEO readiness ≥ 70 (content-reviewer will validate).\n'
  E'   - Target read_time: 8-12 minutes for thought-leadership.\n'
  E'   - Always include internal links to existing published resources.\n'
  E'   - Meta description must be ≤ 160 chars and include primary keyword.',
  'content_strategy',
  'content-pipeline-guidelines',
  ARRAY['guidelines', 'content-pipeline', 'quality']
)
ON CONFLICT DO NOTHING;

-- ── 5. Weekly scheduled_item for content-team ───────────────────────────────────
-- Monday 06:00 UTC, recurring weekly. Scheduler service dispatches to team run API.
INSERT INTO scheduled_items (
  title,
  type,
  scheduled_at,
  status,
  recurrence,
  cron_expression,
  metadata,
  tags,
  color
)
VALUES (
  'Content Team — Weekly Article Generation',
  'team_run',
  -- Next Monday 06:00 UTC (find next Monday from now)
  (date_trunc('week', now() + interval '7 days') + interval '6 hours')::timestamptz,
  'scheduled',
  'weekly',
  '0 6 * * 1',
  jsonb_build_object(
    'team_slug', 'content-team',
    'task', 'Write the next article in the series plan. Use query_content_pipeline to check what has been published and what comes next. Follow the content pipeline guidelines. Output a complete article brief for the content-writer.'
  ),
  ARRAY['content-factory', 'automated', 'weekly'],
  '#f59e0b'
)
ON CONFLICT DO NOTHING;

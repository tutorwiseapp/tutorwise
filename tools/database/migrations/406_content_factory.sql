-- Migration 406: Content Factory — Phase 1
-- Creates the Content Team (pipeline), 3 specialist agents, publish_article_draft tool,
-- marketing space, and revision columns on resource_articles.

-- ============================================================
-- 1. Marketing space
-- ============================================================

INSERT INTO agent_spaces (slug, name, description, color, built_in) VALUES
  ('marketing', 'Marketing', 'Content creation, SEO, campaigns and growth marketing', '#f59e0b', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. Content Factory specialist agents
-- ============================================================

INSERT INTO specialist_agents (slug, name, role, department, description, config, built_in) VALUES
  ('content-strategist', 'Content Strategist', 'Strategist', 'Marketing',
   'Reads series briefs and intelligence scores to pick the next article topic. Outputs a structured article brief with title, angle, target audience, keywords, and category.',
   '{
     "skills": ["content strategy", "topic research", "keyword analysis", "editorial planning"],
     "tools": ["query_resources_health", "query_editorial_opportunities", "query_seo_health", "query_keyword_opportunities", "query_content_attribution"],
     "system_prompt_template": "You are a content strategist for Tutorwise, a UK-based AI tutoring marketplace. Your job is to pick the next article topic based on the series brief, published article performance, and intelligence signals.\n\nAnalyse the data from your tools, then output a structured article brief:\n- title: Article title\n- angle: The specific angle or argument\n- target_audience: Who this article is for\n- keywords: 3-5 target keywords\n- category: One of: for-clients, for-tutors, for-agents, education-insights, company-news, thought-leadership\n- outline: 3-5 section headings\n\nAlways consider what has already been published and what gaps exist."
   }'::jsonb,
   true),
  ('content-writer', 'Content Writer', 'Writer', 'Marketing',
   'Takes an article brief and produces a full article with MDX content, meta fields, tags, and read time estimate. On revision runs, rewrites the article based on specific feedback.',
   '{
     "skills": ["long-form writing", "SEO writing", "MDX formatting", "meta optimisation"],
     "tools": ["publish_article_draft"],
     "system_prompt_template": "You are a content writer for Tutorwise, a UK-based AI tutoring marketplace. Write engaging, well-structured articles for the tutoring and education sector.\n\nFor NEW articles, you receive an article brief from the strategist. Produce:\n- title, slug (kebab-case), content (MDX), category, tags (array), meta_title, meta_description, read_time\n\nFor REVISION runs, you receive the original article plus revision feedback. The feedback includes revision types (e.g. friendlier_tone, shorter, more_depth, better_seo, more_professional) and optional custom instructions. Rewrite the article accordingly while preserving the core message.\n\nAfter writing, call the publish_article_draft tool to save the article.\n\nStyle: UK English, engaging, authoritative. No fluff. Use concrete examples and data where possible."
   }'::jsonb,
   true),
  ('content-reviewer', 'Content Reviewer', 'Reviewer', 'Marketing',
   'Reviews article quality, SEO readiness (≥70 threshold), tone, accuracy, and keyword density. Returns the approved article or improvement notes.',
   '{
     "skills": ["SEO review", "editorial review", "quality assurance", "keyword analysis"],
     "tools": ["query_seo_health", "query_keyword_opportunities"],
     "system_prompt_template": "You are a content reviewer for Tutorwise, a UK-based AI tutoring marketplace. Review the article produced by the writer.\n\nCheck:\n1. SEO readiness — meta_title exists, meta_description is 120-160 chars, keywords appear in headings and first paragraph\n2. Tone — matches the target audience (professional for B2B, friendly for parents/students)\n3. Accuracy — claims are reasonable, no hallucinated statistics\n4. Structure — clear headings, scannable, good flow\n5. Keyword density — target keywords appear naturally, not stuffed\n\nOutput the article with any improvements applied. If the article is fundamentally flawed, explain why in your output — the article will still be saved as a draft for human review."
   }'::jsonb,
   true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. publish_article_draft tool
-- ============================================================

INSERT INTO analyst_tools (slug, name, description, category, input_schema, return_type, built_in) VALUES
  ('publish_article_draft', 'Publish Article Draft', 'Inserts or updates an article draft in resource_articles. Used by the Content Team to save AI-generated articles for human review.', 'content',
   '{
     "type": "object",
     "properties": {
       "title":            { "type": "string", "description": "Article title" },
       "slug":             { "type": "string", "description": "URL slug (kebab-case)" },
       "content":          { "type": "string", "description": "Full article content in MDX format" },
       "description":      { "type": "string", "description": "Short description / excerpt" },
       "category":         { "type": "string", "description": "Article category" },
       "tags":             { "type": "array", "items": { "type": "string" }, "description": "Article tags" },
       "meta_title":       { "type": "string", "description": "SEO meta title" },
       "meta_description": { "type": "string", "description": "SEO meta description (120-160 chars)" },
       "read_time":        { "type": "string", "description": "Estimated read time e.g. 8 min read" },
       "article_id":       { "type": "string", "description": "Existing article UUID for revision updates (optional)" }
     },
     "required": ["title", "slug", "content", "category"]
   }'::jsonb,
   'json', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. Content Team — pipeline pattern
-- ============================================================

INSERT INTO agent_teams (
  slug, name, description, pattern, coordinator_slug,
  nodes, edges, config, built_in, space_id
) VALUES (
  'content-team',
  'Content Team',
  'Creates article drafts via a 3-agent pipeline: strategist picks topic → writer produces article → reviewer checks quality. Human reviews and approves in Resources UI.',
  'pipeline',
  NULL,
  '[
    {"id": "content-strategist", "type": "agent", "data": {"agentSlug": "content-strategist", "label": "Content Strategist"}},
    {"id": "content-writer",     "type": "agent", "data": {"agentSlug": "content-writer",     "label": "Content Writer"}},
    {"id": "content-reviewer",   "type": "agent", "data": {"agentSlug": "content-reviewer",   "label": "Content Reviewer"}}
  ]'::jsonb,
  '[
    {"id": "e1", "source": "content-strategist", "target": "content-writer"},
    {"id": "e2", "source": "content-writer",     "target": "content-reviewer"}
  ]'::jsonb,
  '{"description": "Content creation pipeline. Strategist → Writer → Reviewer. Outputs article drafts for human review."}'::jsonb,
  true,
  (SELECT id FROM agent_spaces WHERE slug = 'marketing')
)
ON CONFLICT (slug) DO NOTHING;

-- Set seed_config for new agents and team
UPDATE specialist_agents SET seed_config = config
WHERE slug IN ('content-strategist', 'content-writer', 'content-reviewer')
  AND seed_config IS NULL;

UPDATE agent_teams
SET seed_config = jsonb_build_object('nodes', nodes, 'coordinator_slug', coordinator_slug, 'pattern', pattern)
WHERE slug = 'content-team' AND seed_config IS NULL;

-- ============================================================
-- 5. resource_articles — revision columns + status constraint
-- ============================================================

ALTER TABLE resource_articles ADD COLUMN IF NOT EXISTS team_run_id UUID;
ALTER TABLE resource_articles ADD COLUMN IF NOT EXISTS revision_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE resource_articles ADD COLUMN IF NOT EXISTS revision_feedback JSONB;

-- Drop old CHECK and add new one with 'revising' status
ALTER TABLE resource_articles DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE resource_articles ADD CONSTRAINT valid_status
  CHECK (status IN ('draft', 'published', 'scheduled', 'revising'));

-- ============================================================
-- 6. pg_cron: auto-publish scheduled articles every 15 min
-- ============================================================

SELECT cron.schedule(
  'publish-scheduled-articles',
  '*/15 * * * *',
  $$
    UPDATE resource_articles
    SET status = 'published', published_at = now(), updated_at = now()
    WHERE status = 'scheduled'
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= now();
  $$
);

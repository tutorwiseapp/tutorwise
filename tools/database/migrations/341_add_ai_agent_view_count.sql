-- Migration 341: Add view_count to ai_agents for public profile view tracking
-- Created: 2026-03-03

ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0 NOT NULL;

-- RPC to atomically increment view count
CREATE OR REPLACE FUNCTION increment_ai_agent_views(p_agent_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE ai_agents SET view_count = view_count + 1 WHERE id = p_agent_id;
$$;

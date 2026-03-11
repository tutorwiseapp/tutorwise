-- Migration 386: Agent Episodic Memory
-- Supabase-native Graphiti alternative: two tables + pgvector for temporal agent memory.
--
-- memory_episodes — one row per agent run, embeds task+outcome for similarity retrieval
-- memory_facts    — extracted key learnings (subject, relation, object) with validity window
--
-- Usage: before each run, SpecialistAgentRunner queries match_memory_episodes() to inject
-- relevant past experience into the system prompt. After each run, a new episode + facts
-- are recorded. Over time agents learn from their own history without external infrastructure.

-- ─── 1. memory_episodes ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS memory_episodes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug       TEXT        NOT NULL,
  run_id           UUID        REFERENCES agent_run_outputs(id) ON DELETE SET NULL,
  task_summary     TEXT        NOT NULL,      -- compact input (max 500 chars)
  outcome_summary  TEXT        NOT NULL,      -- what was concluded/recommended (max 1000 chars)
  entities         TEXT[]      NOT NULL DEFAULT '{}',  -- key entities (tool slugs, platform terms)
  outcome_type     TEXT        NOT NULL DEFAULT 'analysis'
    CHECK (outcome_type IN ('analysis', 'recommendation', 'escalation', 'synthesis', 'alert')),
  was_acted_on     BOOLEAN,                   -- feedback: did the recommendation get implemented?
  embedding        vector(768) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_me_agent_slug
  ON memory_episodes(agent_slug);

CREATE INDEX IF NOT EXISTS idx_me_embedding
  ON memory_episodes USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_me_created_at
  ON memory_episodes(created_at DESC);

ALTER TABLE memory_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY me_admin_all ON memory_episodes FOR ALL USING (is_admin());

-- ─── 2. memory_facts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS memory_facts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug     TEXT        NOT NULL,
  subject        TEXT        NOT NULL,     -- e.g. 'platform', 'devops-team', 'pgBouncer'
  relation       TEXT        NOT NULL,     -- e.g. 'had_incident', 'resolved', 'caused'
  object         TEXT        NOT NULL,     -- e.g. 'webhook_failure', 'P1_alert'
  context        TEXT,                     -- natural language: why this fact matters
  valid_from     TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until    TIMESTAMPTZ,              -- NULL = still true today
  confidence     REAL        NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0 AND confidence <= 1),
  source_run_id  UUID        REFERENCES agent_run_outputs(id) ON DELETE SET NULL,
  embedding      vector(768) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mf_agent_slug
  ON memory_facts(agent_slug);

CREATE INDEX IF NOT EXISTS idx_mf_embedding
  ON memory_facts USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_mf_active
  ON memory_facts(agent_slug, valid_from DESC)
  WHERE valid_until IS NULL;

ALTER TABLE memory_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY mf_admin_all ON memory_facts FOR ALL USING (is_admin());

-- ─── 3. match_memory_episodes — vector similarity RPC ─────────────────────────

CREATE OR REPLACE FUNCTION match_memory_episodes(
  query_embedding  vector(768),
  p_agent_slug     TEXT    DEFAULT NULL,
  match_threshold  FLOAT   DEFAULT 0.72,
  match_count      INT     DEFAULT 5
)
RETURNS TABLE (
  id              UUID,
  agent_slug      TEXT,
  task_summary    TEXT,
  outcome_summary TEXT,
  entities        TEXT[],
  outcome_type    TEXT,
  was_acted_on    BOOLEAN,
  created_at      TIMESTAMPTZ,
  similarity      FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    me.id,
    me.agent_slug,
    me.task_summary,
    me.outcome_summary,
    me.entities,
    me.outcome_type,
    me.was_acted_on,
    me.created_at,
    1 - (me.embedding <=> query_embedding) AS similarity
  FROM memory_episodes me
  WHERE
    (p_agent_slug IS NULL OR me.agent_slug = p_agent_slug)
    AND 1 - (me.embedding <=> query_embedding) >= match_threshold
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─── 4. match_memory_facts — active facts similarity RPC ──────────────────────

CREATE OR REPLACE FUNCTION match_memory_facts(
  query_embedding  vector(768),
  p_agent_slug     TEXT    DEFAULT NULL,
  match_count      INT     DEFAULT 5
)
RETURNS TABLE (
  id         UUID,
  agent_slug TEXT,
  subject    TEXT,
  relation   TEXT,
  object     TEXT,
  context    TEXT,
  valid_from TIMESTAMPTZ,
  confidence REAL,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    mf.id,
    mf.agent_slug,
    mf.subject,
    mf.relation,
    mf.object,
    mf.context,
    mf.valid_from,
    mf.confidence,
    1 - (mf.embedding <=> query_embedding) AS similarity
  FROM memory_facts mf
  WHERE
    (p_agent_slug IS NULL OR mf.agent_slug = p_agent_slug)
    AND mf.valid_until IS NULL   -- only currently-true facts
  ORDER BY mf.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Migration 389: workflow_exceptions — unified exception queue for Admin Operations
-- Sources: workflow failures, agent errors, conformance deviations, webhook failures, shadow divergences
-- NOTE: Migration 346 created an earlier version of this table. Drop + recreate with new schema.

DROP TABLE IF EXISTS workflow_exceptions CASCADE;

CREATE TABLE workflow_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN (
    'workflow_failure',
    'agent_error',
    'conformance_deviation',
    'webhook_failure',
    'shadow_divergence',
    'hitl_timeout',
    'team_error'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'resolved', 'dismissed')),

  -- Reference to source entity
  source_entity_type TEXT,           -- e.g. 'workflow_execution', 'agent_run', 'team_run', 'webhook'
  source_entity_id UUID,             -- FK to the originating row

  -- Human-readable summary
  title TEXT NOT NULL,
  description TEXT,
  context JSONB DEFAULT '{}',        -- structured data: error message, stack trace, divergence details

  -- Assignment
  claimed_by UUID REFERENCES profiles(id),
  claimed_at TIMESTAMPTZ,

  -- Resolution
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,                   -- free-text explanation of how it was resolved
  resolution_type TEXT CHECK (resolution_type IN ('fixed', 'dismissed', 'escalated', 'auto_resolved')),

  -- Escalation
  escalated_at TIMESTAMPTZ,
  escalation_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_workflow_exceptions_status ON workflow_exceptions(status) WHERE status IN ('open', 'claimed');
CREATE INDEX idx_workflow_exceptions_severity ON workflow_exceptions(severity, status);
CREATE INDEX idx_workflow_exceptions_source ON workflow_exceptions(source);
CREATE INDEX idx_workflow_exceptions_created ON workflow_exceptions(created_at DESC);
CREATE INDEX idx_workflow_exceptions_claimed_by ON workflow_exceptions(claimed_by) WHERE claimed_by IS NOT NULL;

-- RLS
ALTER TABLE workflow_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access only" ON workflow_exceptions
  FOR ALL USING (is_admin());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_workflow_exceptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workflow_exceptions_updated_at
  BEFORE UPDATE ON workflow_exceptions
  FOR EACH ROW EXECUTE FUNCTION update_workflow_exceptions_updated_at();

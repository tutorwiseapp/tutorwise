-- Migration: 334_create_workflow_discovery.sql
-- Description: Create tables for Process Discovery Engine
-- Date: 2026-03-02

-- =============================================================================
-- Table: workflow_discovery_results
-- Stores discovered workflows from codebase scanning
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_discovery_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL,
  source_identifier TEXT NOT NULL,
  source_file_paths TEXT[],

  -- Business categorisation
  category TEXT,

  -- Workflow graph data (same format as workflow_processes)
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_steps TEXT[],

  -- Pass 1 metadata (always present)
  step_count INTEGER NOT NULL DEFAULT 0,
  step_names TEXT[],
  raw_content TEXT,

  -- Quality (populated after analysis or direct mapping)
  confidence TEXT DEFAULT 'medium',
  confidence_reason TEXT,

  -- Analysis state (two-pass)
  analysis_state TEXT NOT NULL DEFAULT 'preview',

  -- Lifecycle state
  status TEXT NOT NULL DEFAULT 'discovered',
  imported_process_id UUID REFERENCES workflow_processes(id),

  -- Template overlap detection
  matched_template_id UUID REFERENCES workflow_process_templates(id),
  template_match_state TEXT,
  template_match_score REAL,

  -- Scan metadata
  scan_id UUID,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  scan_duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_discovery_source_type ON workflow_discovery_results(source_type);
CREATE INDEX idx_discovery_category ON workflow_discovery_results(category);
CREATE INDEX idx_discovery_status ON workflow_discovery_results(status);
CREATE INDEX idx_discovery_confidence ON workflow_discovery_results(confidence);
CREATE INDEX idx_discovery_analysis_state ON workflow_discovery_results(analysis_state);
CREATE INDEX idx_discovery_scan_id ON workflow_discovery_results(scan_id);

-- Unique constraint: one result per source identifier per source type
-- (re-scans UPDATE existing rows rather than creating duplicates)
CREATE UNIQUE INDEX idx_discovery_unique_source
  ON workflow_discovery_results(source_type, source_identifier)
  WHERE status != 'dismissed';

-- RLS
ALTER TABLE workflow_discovery_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discovery results"
  ON workflow_discovery_results
  FOR ALL USING (public.is_admin());

-- updated_at trigger
CREATE TRIGGER set_discovery_results_updated_at
  BEFORE UPDATE ON workflow_discovery_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Table: workflow_discovery_scans (Scan History)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_discovery_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by UUID REFERENCES auth.users(id),
  source_types TEXT[],
  status TEXT NOT NULL DEFAULT 'running',
  results_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE workflow_discovery_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discovery scans"
  ON workflow_discovery_scans
  FOR ALL USING (public.is_admin());

-- Phase 4: Enable Supabase Realtime
-- ALTER PUBLICATION supabase_realtime ADD TABLE workflow_discovery_results;

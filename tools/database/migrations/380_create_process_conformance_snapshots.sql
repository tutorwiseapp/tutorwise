-- Migration 380: process_conformance_snapshots
-- Created: 2026-03-10
-- Phase 5: Conductor Process Mining — conformance rate time-series per process
--
-- Populated hourly by the shadow-reconcile cron after each batch conformance check.
-- Queried by the Shadow and Promote APIs to read the most recent conformance rate.

CREATE TABLE IF NOT EXISTS process_conformance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES workflow_processes(id) ON DELETE CASCADE,
  conformance_rate FLOAT NOT NULL,   -- 0–100 percentage
  total INT NOT NULL DEFAULT 0,      -- executions checked
  conformant_count INT NOT NULL DEFAULT 0,
  deviated_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for most-recent-snapshot lookup (used by shadow + promote APIs)
CREATE INDEX idx_pcs_process_created
  ON process_conformance_snapshots(process_id, created_at DESC);

-- RLS: admin read, service role write
ALTER TABLE process_conformance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcs_admin_read"
  ON process_conformance_snapshots FOR SELECT
  USING (is_admin());

CREATE POLICY "pcs_service_all"
  ON process_conformance_snapshots FOR ALL
  TO service_role USING (true) WITH CHECK (true);

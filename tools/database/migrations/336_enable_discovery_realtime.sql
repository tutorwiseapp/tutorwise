-- Migration 336: Enable Supabase Realtime for workflow_discovery_results
-- Phase 4: Real-Time Discovery — push-based updates as per-source scans complete.

ALTER PUBLICATION supabase_realtime ADD TABLE workflow_discovery_results;

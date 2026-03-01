-- ============================================================================
-- Migration: 325 - Create CAS Approval Requests Table
-- ============================================================================
-- Purpose: Human-in-the-loop approval gate for CAS workflow deployments.
--          Workflow pauses after Security scan for human sign-off before deploy.
-- Created: 2026-02-28
--
-- Used by: PlanningGraph.ts approvalGateNode
-- Admin UI: /admin/cas?tab=approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR(255) NOT NULL,
  feature_name VARCHAR(500) NOT NULL,
  approval_type VARCHAR(50) DEFAULT 'deployment',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  requester_agent VARCHAR(50) DEFAULT 'security',
  context JSONB DEFAULT '{}',
  approved_by UUID REFERENCES auth.users(id),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- RLS
ALTER TABLE cas_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage approval requests"
  ON cas_approval_requests
  FOR ALL
  USING (public.is_admin());

-- Index for pending lookups
CREATE INDEX idx_cas_approval_requests_pending
  ON cas_approval_requests(status)
  WHERE status = 'pending';

-- Index for workflow lookups
CREATE INDEX idx_cas_approval_requests_workflow
  ON cas_approval_requests(workflow_id);

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT * FROM cas_approval_requests LIMIT 5;
-- SELECT count(*) FROM cas_approval_requests WHERE status = 'pending';
-- ============================================================================

-- Migration 338: Create workflow execution engine tables
-- Process Execution Engine Phase 1 — Tutor Approval + Commission Payout
-- Design doc: fuchsia/process-execution-solution-design.md (v3.2)

-- ============================================================
-- 1. workflow_executions — high-level run of a process
-- ============================================================

CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES workflow_processes(id),
  langgraph_thread_id TEXT UNIQUE,         -- links to LangGraph Checkpointer state
  target_entity_id UUID,                   -- e.g. profile_id for Tutor Approval
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled')),
  is_shadow BOOLEAN NOT NULL DEFAULT false,            -- true when execution_mode = 'shadow'
  shadow_divergence JSONB DEFAULT NULL,                -- populated if engine intent != actual DB state
  execution_context JSONB DEFAULT '{}'::jsonb,         -- business state passed between nodes
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY we_admin_all ON workflow_executions FOR ALL USING (is_admin());

CREATE INDEX idx_we_status ON workflow_executions(status);
CREATE INDEX idx_we_process_id ON workflow_executions(process_id);
CREATE INDEX idx_we_thread_id ON workflow_executions(langgraph_thread_id);
CREATE INDEX idx_we_is_shadow ON workflow_executions(is_shadow) WHERE is_shadow = true;

-- ============================================================
-- 2. workflow_tasks — individual node executions within a run
-- ============================================================
-- node_id maps directly to ReactFlow node IDs in the canvas.
-- This enables the Execution Tab (Phase 2) to colour nodes by status.

CREATE TABLE workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,                   -- ReactFlow node id (e.g. "a1", "c1")
  name TEXT NOT NULL,
  type TEXT NOT NULL,                      -- matches ProcessStepType
  handler TEXT,                            -- e.g. "stripe.connect_payout"
  completion_mode TEXT NOT NULL DEFAULT 'sync'
    CHECK (completion_mode IN ('sync', 'webhook', 'hitl', 'ai_session')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'skipped')),
  assigned_role TEXT,
  assigned_user_id UUID REFERENCES auth.users(id),
  idempotency_key TEXT,                    -- enforced for all stripe.* handlers
  attempt_count INTEGER NOT NULL DEFAULT 0,
  result_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY wt_admin_all ON workflow_tasks FOR ALL USING (is_admin());

CREATE INDEX idx_wt_execution_id ON workflow_tasks(execution_id);
CREATE INDEX idx_wt_node_id ON workflow_tasks(node_id);
CREATE INDEX idx_wt_status ON workflow_tasks(status);

-- ============================================================
-- 3. Add execution_mode to workflow_processes (existing table)
-- ============================================================
-- design  = engine does nothing; process is a visual map only
-- shadow  = engine runs but does NOT call handlers; divergence is logged
-- live    = engine owns the workflow; handlers are called; existing code disabled

ALTER TABLE workflow_processes
  ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'design'
    CHECK (execution_mode IN ('design', 'shadow', 'live'));

CREATE INDEX idx_wp_execution_mode ON workflow_processes(execution_mode);

-- ============================================================
-- 4. Seed: Tutor Approval process (execution_mode = 'live')
-- ============================================================
-- Matches design doc Section 2.1
-- Trigger: profiles.status changes to 'under_review' via Supabase DB Webhook

INSERT INTO workflow_processes (name, description, category, execution_mode, nodes, edges)
VALUES (
  'Tutor Approval',
  'Automated tutor application review: CaaS scoring → condition gate → admin HITL → activate profile',
  'approval',
  'live',
  '[
    {
      "id": "t1",
      "type": "processStep",
      "position": {"x": 300, "y": 50},
      "data": {
        "label": "Application Received",
        "type": "trigger",
        "description": "Tutor profile status changes to under_review",
        "editable": false,
        "completion_mode": "sync"
      }
    },
    {
      "id": "a1",
      "type": "processStep",
      "position": {"x": 300, "y": 180},
      "data": {
        "label": "Run CaaS Score",
        "type": "action",
        "description": "Calculate CaaS score for tutor profile",
        "editable": true,
        "handler": "caas.score",
        "completion_mode": "sync"
      }
    },
    {
      "id": "c1",
      "type": "processStep",
      "position": {"x": 300, "y": 310},
      "data": {
        "label": "Check Minimum Score",
        "type": "condition",
        "description": "CaaS score >= 70 auto-approves; below routes to admin review",
        "editable": true,
        "handler": "rules.evaluate",
        "completion_mode": "sync",
        "handler_config": {"field": "caas_score", "threshold": 70}
      }
    },
    {
      "id": "ap1",
      "type": "processStep",
      "position": {"x": 100, "y": 440},
      "data": {
        "label": "Admin Review",
        "type": "approval",
        "description": "Admin reviews borderline application with full CaaS context",
        "editable": true,
        "completion_mode": "hitl",
        "assigned_role": "admin"
      }
    },
    {
      "id": "a2",
      "type": "processStep",
      "position": {"x": 300, "y": 570},
      "data": {
        "label": "Approve and Go Live",
        "type": "action",
        "description": "Activate tutor profile — sets status to active",
        "editable": true,
        "handler": "profile.activate",
        "completion_mode": "sync"
      }
    },
    {
      "id": "n1",
      "type": "processStep",
      "position": {"x": 300, "y": 700},
      "data": {
        "label": "Notify Tutor — Approved",
        "type": "action",
        "description": "Send approval confirmation email to tutor",
        "editable": true,
        "handler": "notification.send",
        "completion_mode": "sync",
        "handler_config": {"template": "tutor_approved"}
      }
    },
    {
      "id": "n2",
      "type": "processStep",
      "position": {"x": 100, "y": 570},
      "data": {
        "label": "Notify Tutor — Rejected",
        "type": "action",
        "description": "Send rejection email to tutor",
        "editable": true,
        "handler": "notification.send",
        "completion_mode": "sync",
        "handler_config": {"template": "tutor_rejected"}
      }
    },
    {
      "id": "e1",
      "type": "processStep",
      "position": {"x": 300, "y": 830},
      "data": {
        "label": "Complete",
        "type": "end",
        "description": "Application fully processed",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1",  "source": "t1",  "target": "a1"},
    {"id": "e-a1-c1",  "source": "a1",  "target": "c1"},
    {"id": "e-c1-ap1", "source": "c1",  "target": "ap1", "sourceHandle": "no"},
    {"id": "e-c1-a2",  "source": "c1",  "target": "a2",  "sourceHandle": "yes"},
    {"id": "e-ap1-a2", "source": "ap1", "target": "a2",  "sourceHandle": "approve"},
    {"id": "e-ap1-n2", "source": "ap1", "target": "n2",  "sourceHandle": "reject"},
    {"id": "e-a2-n1",  "source": "a2",  "target": "n1"},
    {"id": "e-n1-e1",  "source": "n1",  "target": "e1"},
    {"id": "e-n2-e1",  "source": "n2",  "target": "e1"}
  ]'::jsonb
);

-- ============================================================
-- 5. Seed: Commission Payout process (execution_mode = 'live')
-- ============================================================
-- Matches design doc Section 2.2
-- Trigger: called by the existing process-batch-payouts cron route (which delegates to engine)
-- The Commission Payout workflow iterates over creators internally via the commission.query_available handler

INSERT INTO workflow_processes (name, description, category, execution_mode, nodes, edges)
VALUES (
  'Commission Payout',
  'Weekly batch payout to creators with available commission balances via Stripe Connect',
  'finance',
  'live',
  '[
    {
      "id": "t1",
      "type": "processStep",
      "position": {"x": 300, "y": 50},
      "data": {
        "label": "Payout Triggered",
        "type": "trigger",
        "description": "Weekly scheduled cron — Fridays 10:00 AM UTC",
        "editable": false,
        "completion_mode": "sync"
      }
    },
    {
      "id": "a1",
      "type": "processStep",
      "position": {"x": 300, "y": 180},
      "data": {
        "label": "Find Available Commissions",
        "type": "action",
        "description": "Query transactions with status=available grouped by profile_id",
        "editable": true,
        "handler": "commission.query_available",
        "completion_mode": "sync"
      }
    },
    {
      "id": "c1",
      "type": "processStep",
      "position": {"x": 300, "y": 310},
      "data": {
        "label": "Check Minimum Balance",
        "type": "condition",
        "description": "Any creator must have >= £25 available to trigger payouts",
        "editable": true,
        "handler": "rules.evaluate",
        "completion_mode": "sync",
        "handler_config": {"field": "payout_count", "threshold": 1}
      }
    },
    {
      "id": "a2",
      "type": "processStep",
      "position": {"x": 300, "y": 440},
      "data": {
        "label": "Process All Payouts",
        "type": "action",
        "description": "Validate accounts and transfer funds for all eligible creators",
        "editable": true,
        "handler": "stripe.connect_payout",
        "completion_mode": "sync"
      }
    },
    {
      "id": "n1",
      "type": "processStep",
      "position": {"x": 300, "y": 570},
      "data": {
        "label": "Notify Creators",
        "type": "action",
        "description": "Send payout confirmation emails to all processed creators",
        "editable": true,
        "handler": "notification.send",
        "completion_mode": "sync",
        "handler_config": {"template": "payout_processed"}
      }
    },
    {
      "id": "e1",
      "type": "processStep",
      "position": {"x": 300, "y": 700},
      "data": {
        "label": "Complete",
        "type": "end",
        "description": "Payout cycle complete",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1", "source": "t1", "target": "a1"},
    {"id": "e-a1-c1", "source": "a1", "target": "c1"},
    {"id": "e-c1-a2", "source": "c1", "target": "a2", "sourceHandle": "yes"},
    {"id": "e-c1-e1", "source": "c1", "target": "e1", "sourceHandle": "no"},
    {"id": "e-a2-n1", "source": "a2", "target": "n1"},
    {"id": "e-n1-e1", "source": "n1", "target": "e1"}
  ]'::jsonb
);

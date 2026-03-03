-- Migration 339: Seed Booking Lifecycle workflow process templates
--
-- Seeds three process templates for Phase 3 (Booking Lifecycle in Shadow Mode):
--   1. Booking Lifecycle — Human Tutor  (execution_mode: 'shadow')
--   2. Booking Lifecycle — AI Tutor     (execution_mode: 'shadow')
--   3. Referral Attribution             (execution_mode: 'shadow' — subprocess)
--
-- These run in shadow mode initially (engine records intent, no handler calls).
-- Admin switches to 'live' via the Execution tab once 50+ shadow runs show 0 divergences.
-- Requires migration 338 (workflow_executions + execution_mode column).

-- ---------------------------------------------------------------------------
-- 1. Booking Lifecycle — Human Tutor
-- Trigger: INSERT INTO bookings (non-AI tutor)
-- Covers: payment → referral check → scheduling → session → review → commission
-- ---------------------------------------------------------------------------

INSERT INTO workflow_processes (name, description, category, execution_mode, nodes, edges, created_by)
VALUES (
  'Booking Lifecycle — Human Tutor',
  'Full lifecycle for human tutor bookings: payment collection, scheduling negotiation, session completion, review, and commission recording',
  'booking',
  'shadow',
  '[
    {
      "id": "t1",
      "type": "processStep",
      "position": {"x": 300, "y": 50},
      "data": {
        "label": "Booking Created",
        "type": "trigger",
        "description": "New booking inserted for a human tutor",
        "editable": false,
        "completion_mode": "sync"
      }
    },
    {
      "id": "a1",
      "type": "processStep",
      "position": {"x": 300, "y": 180},
      "data": {
        "label": "Collect Payment",
        "type": "action",
        "description": "Create Stripe Checkout Session for the booking amount",
        "editable": true,
        "handler": "stripe.charge",
        "completion_mode": "webhook"
      }
    },
    {
      "id": "c1",
      "type": "processStep",
      "position": {"x": 300, "y": 310},
      "data": {
        "label": "Was booking referred?",
        "type": "condition",
        "description": "Check if booking has an agent_id (referral attribution)",
        "editable": true,
        "handler": "rules.evaluate",
        "completion_mode": "sync",
        "handler_config": {"check": "exists", "field": "agent_id"}
      }
    },
    {
      "id": "sub1",
      "type": "processStep",
      "position": {"x": 150, "y": 440},
      "data": {
        "label": "Referral Attribution",
        "type": "subprocess",
        "description": "Attribute booking to referral and update referral status",
        "editable": false,
        "completion_mode": "sync",
        "stepCount": 4,
        "templateName": "Referral Attribution"
      }
    },
    {
      "id": "a2",
      "type": "processStep",
      "position": {"x": 300, "y": 570},
      "data": {
        "label": "Negotiate Schedule",
        "type": "action",
        "description": "Notify tutor to propose a session time; suspends until client confirms",
        "editable": true,
        "handler": "scheduling.negotiate",
        "completion_mode": "hitl",
        "assigned_role": "tutor"
      }
    },
    {
      "id": "a3",
      "type": "processStep",
      "position": {"x": 300, "y": 700},
      "data": {
        "label": "Create Session",
        "type": "action",
        "description": "Create VirtualSpace session for the scheduled booking",
        "editable": true,
        "handler": "session.create",
        "completion_mode": "sync"
      }
    },
    {
      "id": "a4",
      "type": "processStep",
      "position": {"x": 300, "y": 830},
      "data": {
        "label": "Session Active",
        "type": "action",
        "description": "Wait for tutor to mark session complete",
        "editable": true,
        "handler": "session.wait",
        "completion_mode": "hitl",
        "assigned_role": "tutor"
      }
    },
    {
      "id": "a5",
      "type": "processStep",
      "position": {"x": 300, "y": 960},
      "data": {
        "label": "Request Review",
        "type": "action",
        "description": "Mark booking Completed and trigger review session creation",
        "editable": true,
        "handler": "review.request",
        "completion_mode": "sync"
      }
    },
    {
      "id": "a6",
      "type": "processStep",
      "position": {"x": 300, "y": 1090},
      "data": {
        "label": "Record Commission",
        "type": "action",
        "description": "Call handle_successful_payment RPC to create clearing transactions",
        "editable": true,
        "handler": "commission.create",
        "completion_mode": "sync"
      }
    },
    {
      "id": "e1",
      "type": "processStep",
      "position": {"x": 300, "y": 1220},
      "data": {
        "label": "Complete",
        "type": "end",
        "description": "Booking lifecycle complete",
        "editable": false
      }
    },
    {
      "id": "a7",
      "type": "processStep",
      "position": {"x": 500, "y": 310},
      "data": {
        "label": "Refund Payment",
        "type": "action",
        "description": "Issue full Stripe refund for cancelled booking",
        "editable": true,
        "handler": "stripe.refund",
        "completion_mode": "sync"
      }
    },
    {
      "id": "a8",
      "type": "processStep",
      "position": {"x": 500, "y": 440},
      "data": {
        "label": "Void Commission",
        "type": "action",
        "description": "Void all clearing transactions for this booking",
        "editable": true,
        "handler": "commission.void",
        "completion_mode": "sync"
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1", "source": "t1", "target": "a1"},
    {"id": "e-a1-c1", "source": "a1", "target": "c1"},
    {"id": "e-c1-sub1", "source": "c1", "target": "sub1", "sourceHandle": "yes"},
    {"id": "e-c1-a2", "source": "c1", "target": "a2", "sourceHandle": "no"},
    {"id": "e-sub1-a2", "source": "sub1", "target": "a2"},
    {"id": "e-a2-a3", "source": "a2", "target": "a3"},
    {"id": "e-a3-a4", "source": "a3", "target": "a4"},
    {"id": "e-a4-a5", "source": "a4", "target": "a5"},
    {"id": "e-a5-a6", "source": "a5", "target": "a6"},
    {"id": "e-a6-e1", "source": "a6", "target": "e1"},
    {"id": "e-a1-a7", "source": "a1", "target": "a7", "sourceHandle": "cancelled"},
    {"id": "e-a7-a8", "source": "a7", "target": "a8"},
    {"id": "e-a8-e1", "source": "a8", "target": "e1"}
  ]'::jsonb,
  NULL
);

-- ---------------------------------------------------------------------------
-- 2. Booking Lifecycle — AI Tutor
-- Trigger: INSERT INTO bookings (AI agent tutor, is_ai_agent = true on profile)
-- Covers: payment → referral check → AI session → review → commission
-- No scheduling negotiation — AI session starts immediately on booking confirmation.
-- ---------------------------------------------------------------------------

INSERT INTO workflow_processes (name, description, category, execution_mode, nodes, edges, created_by)
VALUES (
  'Booking Lifecycle — AI Tutor',
  'Full lifecycle for AI tutor agent bookings: payment, immediate AI session, review, and commission',
  'booking',
  'shadow',
  '[
    {
      "id": "t1",
      "type": "processStep",
      "position": {"x": 300, "y": 50},
      "data": {
        "label": "Booking Created",
        "type": "trigger",
        "description": "New booking inserted for an AI tutor agent",
        "editable": false,
        "completion_mode": "sync"
      }
    },
    {
      "id": "a1",
      "type": "processStep",
      "position": {"x": 300, "y": 180},
      "data": {
        "label": "Collect Payment",
        "type": "action",
        "description": "Create Stripe Checkout Session for the booking amount",
        "editable": true,
        "handler": "stripe.charge",
        "completion_mode": "webhook"
      }
    },
    {
      "id": "c1",
      "type": "processStep",
      "position": {"x": 300, "y": 310},
      "data": {
        "label": "Was booking referred?",
        "type": "condition",
        "description": "Check if booking has an agent_id (referral attribution)",
        "editable": true,
        "handler": "rules.evaluate",
        "completion_mode": "sync",
        "handler_config": {"check": "exists", "field": "agent_id"}
      }
    },
    {
      "id": "sub1",
      "type": "processStep",
      "position": {"x": 150, "y": 440},
      "data": {
        "label": "Referral Attribution",
        "type": "subprocess",
        "description": "Attribute booking to referral and update referral status",
        "editable": false,
        "completion_mode": "sync",
        "stepCount": 4,
        "templateName": "Referral Attribution"
      }
    },
    {
      "id": "a2",
      "type": "processStep",
      "position": {"x": 300, "y": 570},
      "data": {
        "label": "Start AI Session",
        "type": "action",
        "description": "Hand off to AI Tutor agent; suspend until session ends",
        "editable": true,
        "handler": "ai_agent.invoke",
        "completion_mode": "ai_session"
      }
    },
    {
      "id": "a3",
      "type": "processStep",
      "position": {"x": 300, "y": 700},
      "data": {
        "label": "Request Review",
        "type": "action",
        "description": "Mark booking Completed and trigger review session creation",
        "editable": true,
        "handler": "review.request",
        "completion_mode": "sync"
      }
    },
    {
      "id": "a4",
      "type": "processStep",
      "position": {"x": 300, "y": 830},
      "data": {
        "label": "Record Commission",
        "type": "action",
        "description": "Call handle_successful_payment RPC to create clearing transactions",
        "editable": true,
        "handler": "commission.create",
        "completion_mode": "sync"
      }
    },
    {
      "id": "e1",
      "type": "processStep",
      "position": {"x": 300, "y": 960},
      "data": {
        "label": "Complete",
        "type": "end",
        "description": "AI booking lifecycle complete",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1", "source": "t1", "target": "a1"},
    {"id": "e-a1-c1", "source": "a1", "target": "c1"},
    {"id": "e-c1-sub1", "source": "c1", "target": "sub1", "sourceHandle": "yes"},
    {"id": "e-c1-a2", "source": "c1", "target": "a2", "sourceHandle": "no"},
    {"id": "e-sub1-a2", "source": "sub1", "target": "a2"},
    {"id": "e-a2-a3", "source": "a2", "target": "a3"},
    {"id": "e-a3-a4", "source": "a3", "target": "a4"},
    {"id": "e-a4-e1", "source": "a4", "target": "e1"}
  ]'::jsonb,
  NULL
);

-- ---------------------------------------------------------------------------
-- 3. Referral Attribution (subprocess — invoked from Booking Lifecycle templates)
-- Not a standalone top-level workflow. Referenced by templateName in subprocess nodes.
-- Runs inline when the "Was booking referred?" condition returns yes.
-- ---------------------------------------------------------------------------

INSERT INTO workflow_processes (name, description, category, execution_mode, nodes, edges, created_by)
VALUES (
  'Referral Attribution',
  'Subprocess: attribute a booking to a referral and update referral status to Converted',
  'referral',
  'shadow',
  '[
    {
      "id": "t1",
      "type": "processStep",
      "position": {"x": 300, "y": 50},
      "data": {
        "label": "Attribution Started",
        "type": "trigger",
        "description": "Invoked from parent Booking Lifecycle; receives booking_id in context",
        "editable": false,
        "completion_mode": "sync"
      }
    },
    {
      "id": "a1",
      "type": "processStep",
      "position": {"x": 300, "y": 180},
      "data": {
        "label": "Attribute Booking",
        "type": "action",
        "description": "Create referrals record with status Signed Up",
        "editable": true,
        "handler": "referral.attribute",
        "completion_mode": "sync"
      }
    },
    {
      "id": "a2",
      "type": "processStep",
      "position": {"x": 300, "y": 310},
      "data": {
        "label": "Update Referral Status",
        "type": "action",
        "description": "Update referrals.status to Converted on booking completion",
        "editable": true,
        "handler": "referral.update_status",
        "completion_mode": "sync"
      }
    },
    {
      "id": "n1",
      "type": "processStep",
      "position": {"x": 300, "y": 440},
      "data": {
        "label": "Notify Referrer",
        "type": "action",
        "description": "Send referral conversion notification to the referring agent",
        "editable": true,
        "handler": "notification.send",
        "completion_mode": "sync",
        "handler_config": {"template": "referral_converted"}
      }
    },
    {
      "id": "e1",
      "type": "processStep",
      "position": {"x": 300, "y": 570},
      "data": {
        "label": "Complete",
        "type": "end",
        "description": "Returns to parent execution",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1", "source": "t1", "target": "a1"},
    {"id": "e-a1-a2", "source": "a1", "target": "a2"},
    {"id": "e-a2-n1", "source": "a2", "target": "n1"},
    {"id": "e-n1-e1", "source": "n1", "target": "e1"}
  ]'::jsonb,
  NULL
);

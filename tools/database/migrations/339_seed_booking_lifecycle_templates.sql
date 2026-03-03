-- Migration 339: Seed 3 remaining execution engine workflow process templates
-- Design doc: fuchsia/process-execution-solution-design.md (v3.2) Sections 2.3 – 2.5
--
-- These were planned for migration 338 but seeded separately here.
-- All three are in shadow / design mode — no live execution risk.
--
-- Processes added:
--   1. Booking Lifecycle — Human Tutor  (execution_mode = 'shadow')
--   2. Booking Lifecycle — AI Tutor     (execution_mode = 'shadow')
--   3. Referral Attribution             (execution_mode = 'design', subprocess only)

-- ============================================================
-- 1. Booking Lifecycle — Human Tutor (Shadow Mode)
-- ============================================================
-- Trigger: INSERT INTO bookings where booking_type = 'human' (Supabase DB Webhook)
-- Shadow first: runs alongside existing Stripe webhook + handle_successful_payment RPC.
-- Admin switches to Live via Execution tab "Go Live" after divergence review.

INSERT INTO workflow_processes (name, description, category, execution_mode, nodes, edges)
VALUES (
  'Booking Lifecycle — Human Tutor',
  'End-to-end human tutor booking: payment collection, referral attribution, scheduling negotiation, session completion, review, and commission recording.',
  'bookings',
  'shadow',
  '[
    {
      "id": "t1",
      "type": "processStep",
      "position": {"x": 300, "y": 50},
      "data": {
        "label": "Booking Created",
        "type": "trigger",
        "description": "Student creates a booking for a human tutor session",
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
        "description": "Charge student via Stripe — holds funds until session complete",
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
        "label": "Was Booking Referred?",
        "type": "condition",
        "description": "Check if this booking originated from a referral link",
        "editable": true,
        "handler": "rules.evaluate",
        "completion_mode": "sync",
        "handler_config": {"check": "referral_attributed", "field": "booking_id"}
      }
    },
    {
      "id": "sp1",
      "type": "processStep",
      "position": {"x": 100, "y": 440},
      "data": {
        "label": "Referral Attribution",
        "type": "subprocess",
        "description": "Attribute booking to referrer — fires only when booking was referred",
        "editable": true,
        "completion_mode": "sync",
        "templateName": "Referral Attribution",
        "stepCount": 3
      }
    },
    {
      "id": "a2",
      "type": "processStep",
      "position": {"x": 300, "y": 570},
      "data": {
        "label": "Negotiate Schedule",
        "type": "action",
        "description": "Tutor proposes session time; client confirms — suspends until both parties agree",
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
        "description": "Create virtualspace session with join URL and session ID",
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
        "description": "Wait for tutor to mark session complete or cron auto-complete",
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
        "description": "Send review request to student after session completes",
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
        "description": "Create clearing commission transaction via handle_successful_payment RPC",
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
        "description": "Booking lifecycle complete — session delivered and commission recorded",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1",   "source": "t1",  "target": "a1"},
    {"id": "e-a1-c1",   "source": "a1",  "target": "c1"},
    {"id": "e-c1-sp1",  "source": "c1",  "target": "sp1", "sourceHandle": "yes"},
    {"id": "e-c1-a2",   "source": "c1",  "target": "a2",  "sourceHandle": "no"},
    {"id": "e-sp1-a2",  "source": "sp1", "target": "a2"},
    {"id": "e-a2-a3",   "source": "a2",  "target": "a3"},
    {"id": "e-a3-a4",   "source": "a3",  "target": "a4"},
    {"id": "e-a4-a5",   "source": "a4",  "target": "a5"},
    {"id": "e-a5-a6",   "source": "a5",  "target": "a6"},
    {"id": "e-a6-e1",   "source": "a6",  "target": "e1"}
  ]'::jsonb
);

-- ============================================================
-- 2. Booking Lifecycle — AI Tutor (Shadow Mode)
-- ============================================================
-- Trigger: INSERT INTO bookings where booking_type = 'ai_agent' (Supabase DB Webhook)
-- Shadow first: same payment/RPC chain as Human Tutor but simpler — no scheduling.
-- No session.wait needed — AI session ends autonomously.

INSERT INTO workflow_processes (name, description, category, execution_mode, nodes, edges)
VALUES (
  'Booking Lifecycle — AI Tutor',
  'End-to-end AI tutor booking: payment collection, referral attribution, AI session handoff (autonomous), review request, and commission recording.',
  'bookings',
  'shadow',
  '[
    {
      "id": "t1",
      "type": "processStep",
      "position": {"x": 300, "y": 50},
      "data": {
        "label": "Booking Created",
        "type": "trigger",
        "description": "Student creates a booking for an AI tutor session",
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
        "description": "Charge student via Stripe — holds funds until session complete",
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
        "label": "Was Booking Referred?",
        "type": "condition",
        "description": "Check if this booking originated from a referral link",
        "editable": true,
        "handler": "rules.evaluate",
        "completion_mode": "sync",
        "handler_config": {"check": "referral_attributed", "field": "booking_id"}
      }
    },
    {
      "id": "sp1",
      "type": "processStep",
      "position": {"x": 100, "y": 440},
      "data": {
        "label": "Referral Attribution",
        "type": "subprocess",
        "description": "Attribute booking to referrer — fires only when booking was referred",
        "editable": true,
        "completion_mode": "sync",
        "templateName": "Referral Attribution",
        "stepCount": 3
      }
    },
    {
      "id": "a2",
      "type": "processStep",
      "position": {"x": 300, "y": 570},
      "data": {
        "label": "Start AI Session",
        "type": "action",
        "description": "Create virtualspace session and hand off to AI Tutor — suspends until session ends autonomously",
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
        "description": "Send review request to student after AI session completes",
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
        "description": "Create clearing commission transaction via handle_successful_payment RPC",
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
        "description": "Booking lifecycle complete — AI session delivered and commission recorded",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1",   "source": "t1",  "target": "a1"},
    {"id": "e-a1-c1",   "source": "a1",  "target": "c1"},
    {"id": "e-c1-sp1",  "source": "c1",  "target": "sp1", "sourceHandle": "yes"},
    {"id": "e-c1-a2",   "source": "c1",  "target": "a2",  "sourceHandle": "no"},
    {"id": "e-sp1-a2",  "source": "sp1", "target": "a2"},
    {"id": "e-a2-a3",   "source": "a2",  "target": "a3"},
    {"id": "e-a3-a4",   "source": "a3",  "target": "a4"},
    {"id": "e-a4-e1",   "source": "a4",  "target": "e1"}
  ]'::jsonb
);

-- ============================================================
-- 3. Referral Attribution (Subprocess — design mode only)
-- ============================================================
-- Not a standalone workflow. Invoked from subprocess nodes in Booking Lifecycle templates.
-- execution_mode = 'design' — engine never triggers this directly; it runs only when
-- invoked from a parent execution that is in 'live' or 'shadow' mode.

INSERT INTO workflow_processes (name, description, category, execution_mode, nodes, edges)
VALUES (
  'Referral Attribution',
  'Subprocess: attributes a completed booking to a referrer, updates referral status to Converted, and notifies the referrer. Invoked from Booking Lifecycle templates.',
  'finance',
  'design',
  '[
    {
      "id": "t1",
      "type": "processStep",
      "position": {"x": 300, "y": 50},
      "data": {
        "label": "Attribution Started",
        "type": "trigger",
        "description": "Invoked as subprocess from parent Booking Lifecycle execution — receives booking_id in context",
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
        "description": "Create referral row linking booking to referrer with status Signed Up",
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
      "id": "a3",
      "type": "processStep",
      "position": {"x": 300, "y": 440},
      "data": {
        "label": "Notify Referrer",
        "type": "action",
        "description": "Send referral conversion confirmation email to referrer",
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
        "description": "Attribution complete — returns to parent execution",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1", "source": "t1", "target": "a1"},
    {"id": "e-a1-a2", "source": "a1", "target": "a2"},
    {"id": "e-a2-a3", "source": "a2", "target": "a3"},
    {"id": "e-a3-e1", "source": "a3", "target": "e1"}
  ]'::jsonb
);

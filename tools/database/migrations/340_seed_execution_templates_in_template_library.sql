-- Migration 340: Add execution engine workflow templates to the design template library
-- These make the Booking Lifecycle (Human + AI) and Referral Attribution templates
-- visible in the Process Templates modal in the canvas UI.
--
-- Nodes include execution metadata (handler, completion_mode, assigned_role, handler_config)
-- so when loaded into the canvas they are execution-ready.

-- ============================================================
-- 1. Booking Lifecycle — Human Tutor
-- ============================================================
INSERT INTO workflow_process_templates (name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES (
  'Booking Lifecycle — Human Tutor',
  'End-to-end human tutor booking: Stripe payment, optional referral attribution, scheduling negotiation, session completion, review request, and commission recording.',
  'bookings',
  'advanced',
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
        "description": "Booking lifecycle complete",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1",  "source": "t1",  "target": "a1"},
    {"id": "e-a1-c1",  "source": "a1",  "target": "c1"},
    {"id": "e-c1-sp1", "source": "c1",  "target": "sp1", "sourceHandle": "yes"},
    {"id": "e-c1-a2",  "source": "c1",  "target": "a2",  "sourceHandle": "no"},
    {"id": "e-sp1-a2", "source": "sp1", "target": "a2"},
    {"id": "e-a2-a3",  "source": "a2",  "target": "a3"},
    {"id": "e-a3-a4",  "source": "a3",  "target": "a4"},
    {"id": "e-a4-a5",  "source": "a4",  "target": "a5"},
    {"id": "e-a5-a6",  "source": "a5",  "target": "a6"},
    {"id": "e-a6-e1",  "source": "a6",  "target": "e1"}
  ]'::jsonb,
  ARRAY['Booking Created', 'Collect Payment', 'Negotiate Schedule', 'Session Active', 'Request Review', 'Record Commission'],
  ARRAY['booking', 'payment', 'stripe', 'scheduling', 'commission', 'human-tutor', 'hitl'],
  true
);

-- ============================================================
-- 2. Booking Lifecycle — AI Tutor
-- ============================================================
INSERT INTO workflow_process_templates (name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES (
  'Booking Lifecycle — AI Tutor',
  'End-to-end AI tutor booking: Stripe payment, optional referral attribution, AI session handoff (autonomous end), review request, and commission recording.',
  'bookings',
  'advanced',
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
        "description": "Booking lifecycle complete",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e-t1-a1",  "source": "t1",  "target": "a1"},
    {"id": "e-a1-c1",  "source": "a1",  "target": "c1"},
    {"id": "e-c1-sp1", "source": "c1",  "target": "sp1", "sourceHandle": "yes"},
    {"id": "e-c1-a2",  "source": "c1",  "target": "a2",  "sourceHandle": "no"},
    {"id": "e-sp1-a2", "source": "sp1", "target": "a2"},
    {"id": "e-a2-a3",  "source": "a2",  "target": "a3"},
    {"id": "e-a3-a4",  "source": "a3",  "target": "a4"},
    {"id": "e-a4-e1",  "source": "a4",  "target": "e1"}
  ]'::jsonb,
  ARRAY['Booking Created', 'Collect Payment', 'Start AI Session', 'Request Review', 'Record Commission'],
  ARRAY['booking', 'payment', 'stripe', 'ai-tutor', 'ai-session', 'commission'],
  true
);

-- ============================================================
-- 3. Referral Attribution (subprocess template)
-- ============================================================
INSERT INTO workflow_process_templates (name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES (
  'Referral Attribution',
  'Subprocess: attributes a completed booking to a referrer, updates referral status to Converted, and notifies the referrer. Used as a subprocess node within Booking Lifecycle templates.',
  'referrals',
  'medium',
  '[
    {
      "id": "t1",
      "type": "processStep",
      "position": {"x": 300, "y": 50},
      "data": {
        "label": "Attribution Started",
        "type": "trigger",
        "description": "Invoked as subprocess from parent Booking Lifecycle execution",
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
  ]'::jsonb,
  ARRAY['Attribution Started', 'Attribute Booking', 'Update Referral Status', 'Notify Referrer'],
  ARRAY['referral', 'attribution', 'subprocess', 'notification'],
  true
);

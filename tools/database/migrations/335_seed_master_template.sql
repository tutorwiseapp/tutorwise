-- Migration 335: Seed master platform template — "Tutorwise User Dashboard Processes"
-- Depends on: 330_create_workflow_processes.sql
-- Adds one system template that maps the complete TutorWise user journey end-to-end
-- using the new 'subprocess' node type for each major platform phase.

INSERT INTO workflow_process_templates (id, name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES
(
  gen_random_uuid(),
  'Tutorwise User Dashboard Processes',
  'Complete end-to-end user journey for the Tutorwise platform — from registration through onboarding, marketplace discovery, booking, session delivery, payment, and reviews.',
  'platform',
  'advanced',
  '[
    {
      "id": "trigger-1",
      "type": "processStep",
      "position": {"x": 360, "y": 50},
      "data": {
        "label": "User Registers",
        "type": "trigger",
        "description": "New user signs up via email or OAuth provider",
        "editable": false
      }
    },
    {
      "id": "action-1",
      "type": "processStep",
      "position": {"x": 360, "y": 180},
      "data": {
        "label": "Email Verification",
        "type": "action",
        "description": "System sends verification email; user confirms account",
        "assignee": "System",
        "estimatedDuration": "5 minutes",
        "editable": true
      }
    },
    {
      "id": "condition-1",
      "type": "processStep",
      "position": {"x": 360, "y": 310},
      "data": {
        "label": "Role Selection",
        "type": "condition",
        "description": "User selects their role: Tutor, Student, or Client",
        "editable": true
      }
    },
    {
      "id": "subprocess-1",
      "type": "processStep",
      "position": {"x": 360, "y": 440},
      "data": {
        "label": "Onboarding",
        "type": "subprocess",
        "description": "Role-specific onboarding: profile setup, DBS check (tutors), subject/level preferences, and first session readiness",
        "stepCount": 8,
        "templateName": "Tutor & Student Onboarding",
        "editable": true
      }
    },
    {
      "id": "subprocess-2",
      "type": "processStep",
      "position": {"x": 360, "y": 590},
      "data": {
        "label": "Marketplace & Discovery",
        "type": "subprocess",
        "description": "User browses listings, tutor profiles, and subject offerings. Filters by subject, level, location, and price.",
        "stepCount": 5,
        "templateName": "Marketplace Discovery",
        "editable": true
      }
    },
    {
      "id": "action-2",
      "type": "processStep",
      "position": {"x": 360, "y": 740},
      "data": {
        "label": "Booking Request",
        "type": "action",
        "description": "Student or client submits a booking request for a tutor session",
        "assignee": "Student / Client",
        "estimatedDuration": "5 minutes",
        "editable": true
      }
    },
    {
      "id": "subprocess-3",
      "type": "processStep",
      "position": {"x": 360, "y": 870},
      "data": {
        "label": "Booking Lifecycle",
        "type": "subprocess",
        "description": "Full booking flow: tutor accepts/declines, scheduling, confirmations, reminders, and cancellation handling",
        "stepCount": 6,
        "templateName": "Booking Lifecycle",
        "editable": true
      }
    },
    {
      "id": "subprocess-4",
      "type": "processStep",
      "position": {"x": 360, "y": 1010},
      "data": {
        "label": "Session Delivery",
        "type": "subprocess",
        "description": "Live or recorded tutoring session: virtual room setup, attendance tracking, session notes, and material sharing",
        "stepCount": 4,
        "templateName": "Session Delivery",
        "editable": true
      }
    },
    {
      "id": "subprocess-5",
      "type": "processStep",
      "position": {"x": 360, "y": 1150},
      "data": {
        "label": "Payment Processing",
        "type": "subprocess",
        "description": "Stripe payment capture, platform fee deduction, tutor payout scheduling, and invoice generation",
        "stepCount": 5,
        "templateName": "Payment Processing",
        "editable": true
      }
    },
    {
      "id": "subprocess-6",
      "type": "processStep",
      "position": {"x": 360, "y": 1290},
      "data": {
        "label": "Reviews & Credibility",
        "type": "subprocess",
        "description": "Post-session review request, star rating submission, tutor credibility score update, and badge award",
        "stepCount": 4,
        "templateName": "Reviews & Credibility",
        "editable": true
      }
    },
    {
      "id": "end-1",
      "type": "processStep",
      "position": {"x": 360, "y": 1430},
      "data": {
        "label": "Platform Active",
        "type": "end",
        "description": "User is fully onboarded and active on the Tutorwise platform",
        "editable": false
      }
    }
  ]'::jsonb,
  '[
    {"id": "e1", "source": "trigger-1", "target": "action-1", "animated": true},
    {"id": "e2", "source": "action-1", "target": "condition-1", "animated": true},
    {"id": "e3-yes", "source": "condition-1", "target": "subprocess-1", "sourceHandle": "yes", "animated": true},
    {"id": "e3-no",  "source": "condition-1", "target": "subprocess-1", "sourceHandle": "no",  "animated": true},
    {"id": "e4", "source": "subprocess-1", "target": "subprocess-2", "animated": true},
    {"id": "e5", "source": "subprocess-2", "target": "action-2",     "animated": true},
    {"id": "e6", "source": "action-2",     "target": "subprocess-3", "animated": true},
    {"id": "e7", "source": "subprocess-3", "target": "subprocess-4", "animated": true},
    {"id": "e8", "source": "subprocess-4", "target": "subprocess-5", "animated": true},
    {"id": "e9", "source": "subprocess-5", "target": "subprocess-6", "animated": true},
    {"id":"e10", "source": "subprocess-6", "target": "end-1",        "animated": true}
  ]'::jsonb,
  ARRAY['Onboarding', 'Marketplace', 'Booking Lifecycle', 'Session Delivery', 'Payment Processing'],
  ARRAY['platform', 'master', 'user-journey', 'subprocess', 'end-to-end'],
  true
);

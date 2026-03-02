-- Migration 333: Add 4 onboarding templates + fix Booking Lifecycle accuracy
-- Depends on: 331_seed_process_studio_templates.sql

-- Fix Booking Lifecycle: remove inaccurate "Match Tutor" step, add "Propose Time" and "Process Payment"
-- The actual flow is: Request → Propose → Confirm → Payment → Session → Complete → Review
UPDATE workflow_process_templates
SET
  nodes = '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Booking Requested","type":"trigger","description":"Client creates a new booking request","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":160},"data":{"label":"Propose Time","type":"action","description":"Client or tutor proposes a session date, time, and delivery mode","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":270},"data":{"label":"Confirm Schedule","type":"approval","description":"Other party confirms the proposed time slot","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":380},"data":{"label":"Process Payment","type":"action","description":"Process payment via Stripe (free sessions skip this step)","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":490},"data":{"label":"Deliver Session","type":"action","description":"Conduct the tutoring session via VirtualSpace","editable":true}},
    {"id":"action-5","type":"processStep","position":{"x":300,"y":600},"data":{"label":"Auto-Complete","type":"action","description":"Cron job marks session complete after scheduled end time","editable":true}},
    {"id":"action-6","type":"processStep","position":{"x":300,"y":710},"data":{"label":"Collect Review","type":"action","description":"Request quick-rate and detailed feedback from both parties","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":820},"data":{"label":"Complete","type":"end","description":"Booking lifecycle complete","editable":false}}
  ]'::jsonb,
  edges = '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"action-5","animated":true},
    {"id":"e6","source":"action-5","target":"action-6","animated":true},
    {"id":"e7","source":"action-6","target":"end-1","animated":true}
  ]'::jsonb,
  preview_steps = ARRAY['Request', 'Propose', 'Confirm', 'Pay', 'Session', 'Complete', 'Review'],
  description = 'Complete booking flow from request through scheduling negotiation, payment, session delivery, and review collection.'
WHERE name = 'Booking Lifecycle' AND is_system = true;

-- 11. Client Onboarding
INSERT INTO workflow_process_templates (id, name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES
(
  gen_random_uuid(),
  'Client Onboarding',
  'Onboard new clients (learners/parents) through personal info, learning preferences, verification, and availability setup.',
  'onboarding',
  'medium',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Client Registers","type":"trigger","description":"New client signs up and selects the client role","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":170},"data":{"label":"Personal Information","type":"action","description":"Collect first name, last name, gender, date of birth, email, and phone","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":290},"data":{"label":"Learning Preferences","type":"action","description":"Set learning goals, preferred qualifications, subjects, session types, delivery mode, and budget","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":410},"data":{"label":"Trust & Verification","type":"action","description":"Optional: upload proof of address, government ID, or DBS certificate","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":530},"data":{"label":"Set Availability","type":"action","description":"Configure general availability (days and time-of-day) and optional detailed schedule","editable":true}},
    {"id":"action-5","type":"processStep","position":{"x":300,"y":650},"data":{"label":"Welcome & Explore","type":"notification","description":"Send welcome notification and guide client to marketplace","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":770},"data":{"label":"Onboarded","type":"end","description":"Client onboarding complete","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"action-5","animated":true},
    {"id":"e6","source":"action-5","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Register', 'Personal Info', 'Preferences', 'Verify', 'Availability', 'Welcome'],
  ARRAY['onboarding', 'client', 'learner'],
  true
),

-- 12. Tutor Onboarding
(
  gen_random_uuid(),
  'Tutor Onboarding',
  'Onboard new tutors through personal info, professional details, qualifications, verification, and availability setup.',
  'onboarding',
  'medium',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Tutor Registers","type":"trigger","description":"New tutor signs up and selects the tutor role","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":170},"data":{"label":"Personal Information","type":"action","description":"Collect first name, last name, gender, date of birth, email, and phone","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":290},"data":{"label":"Professional Details","type":"action","description":"Set bio, intro video, status, qualifications, experience, subjects, rates, and delivery mode","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":410},"data":{"label":"Trust & Verification","type":"action","description":"Optional: upload proof of address, government ID, DBS certificate, or teaching credentials","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":530},"data":{"label":"Set Availability","type":"action","description":"Configure general availability (days and time-of-day) and optional detailed schedule","editable":true}},
    {"id":"action-5","type":"processStep","position":{"x":300,"y":650},"data":{"label":"Profile Review","type":"approval","description":"Auto CaaS scoring and optional admin review of tutor profile quality","editable":true}},
    {"id":"action-6","type":"processStep","position":{"x":300,"y":770},"data":{"label":"Welcome & Go Live","type":"notification","description":"Send welcome notification and make tutor discoverable in marketplace","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":890},"data":{"label":"Onboarded","type":"end","description":"Tutor onboarding complete","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"action-5","animated":true},
    {"id":"e6","source":"action-5","target":"action-6","animated":true},
    {"id":"e7","source":"action-6","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Register', 'Personal Info', 'Professional', 'Verify', 'Availability', 'Review', 'Go Live'],
  ARRAY['onboarding', 'tutor', 'professional'],
  true
),

-- 13. Agent Onboarding
(
  gen_random_uuid(),
  'Agent Onboarding',
  'Onboard new agents (tutoring agencies) through personal info, professional details, verification, and availability setup.',
  'onboarding',
  'medium',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Agent Registers","type":"trigger","description":"New agent signs up and selects the agent role","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":170},"data":{"label":"Personal Information","type":"action","description":"Collect first name, last name, gender, date of birth, email, and phone","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":290},"data":{"label":"Professional Details","type":"action","description":"Set agency bio, qualifications, subjects, experience, rates, and delivery mode","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":410},"data":{"label":"Trust & Verification","type":"action","description":"Optional: upload proof of address, government ID, DBS certificate, or business credentials","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":530},"data":{"label":"Set Availability","type":"action","description":"Configure general availability (days and time-of-day) and optional detailed schedule","editable":true}},
    {"id":"action-5","type":"processStep","position":{"x":300,"y":650},"data":{"label":"Profile Review","type":"approval","description":"Auto CaaS scoring and optional admin review of agent profile","editable":true}},
    {"id":"action-6","type":"processStep","position":{"x":300,"y":770},"data":{"label":"Welcome & Go Live","type":"notification","description":"Send welcome notification and make agent discoverable in marketplace","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":890},"data":{"label":"Onboarded","type":"end","description":"Agent onboarding complete","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"action-5","animated":true},
    {"id":"e6","source":"action-5","target":"action-6","animated":true},
    {"id":"e7","source":"action-6","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Register', 'Personal Info', 'Professional', 'Verify', 'Availability', 'Review', 'Go Live'],
  ARRAY['onboarding', 'agent', 'agency'],
  true
),

-- 14. User Onboarding (Combined)
(
  gen_random_uuid(),
  'User Onboarding',
  'Combined onboarding flow for all user types — clients, tutors, and agents — with role selection and shared steps.',
  'onboarding',
  'advanced',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"User Registers","type":"trigger","description":"New user signs up on the platform","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":160},"data":{"label":"Select Role(s)","type":"action","description":"User chooses one or more roles: Client, Tutor, or Agent","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":270},"data":{"label":"Personal Information","type":"action","description":"Collect name, gender, date of birth, email, and phone (shared across all roles)","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":380},"data":{"label":"Role-Specific Details","type":"action","description":"Collect role-specific info: learning preferences (client), professional details (tutor/agent)","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":490},"data":{"label":"Trust & Verification","type":"action","description":"Optional document uploads: proof of address, government ID, DBS, credentials","editable":true}},
    {"id":"action-5","type":"processStep","position":{"x":300,"y":600},"data":{"label":"Set Availability","type":"action","description":"Configure general and detailed availability schedule","editable":true}},
    {"id":"condition-1","type":"processStep","position":{"x":300,"y":710},"data":{"label":"Additional Roles?","type":"condition","description":"Does the user want to complete onboarding for another role?","editable":true}},
    {"id":"action-6","type":"processStep","position":{"x":300,"y":820},"data":{"label":"Welcome & Activate","type":"notification","description":"Send welcome notification and activate all completed role profiles","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":930},"data":{"label":"Onboarded","type":"end","description":"User fully onboarded for all selected roles","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"action-5","animated":true},
    {"id":"e6","source":"action-5","target":"condition-1","animated":true},
    {"id":"e7","source":"condition-1","target":"action-1","animated":true,"label":"Yes — next role"},
    {"id":"e8","source":"condition-1","target":"action-6","animated":true,"label":"No — done"},
    {"id":"e9","source":"action-6","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Register', 'Select Role', 'Personal Info', 'Details', 'Verify', 'Availability', 'Welcome'],
  ARRAY['onboarding', 'user', 'multi-role', 'client', 'tutor', 'agent'],
  true
)

ON CONFLICT DO NOTHING;

-- Migration 337: Seed missing subprocess templates referenced by the master template
-- Adds: Student Management ("My Students"), Marketplace Discovery
-- These enable drill-down from the master template for those subprocess nodes.

INSERT INTO workflow_process_templates (id, name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES

-- Student Management ("My Students" — tutor-facing)
(
  gen_random_uuid(),
  'Student Management',
  'Tutor-facing student roster management: view all active students, track individual progress and session history, set learning goals, share resources, send reports to clients/parents.',
  'bookings',
  'medium',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Session Completed","type":"trigger","description":"A booking is marked complete and the student appears in My Students roster","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":180},"data":{"label":"View Student Profile","type":"action","description":"Tutor reviews student''s learning goals, subject preferences, level, and previous session notes","estimatedDuration":"5 minutes","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":310},"data":{"label":"Add Session Notes","type":"action","description":"Tutor records session topics covered, homework set, student strengths and areas for improvement","assignee":"Tutor","estimatedDuration":"10 minutes","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":440},"data":{"label":"Set Learning Goals","type":"action","description":"Tutor and student agree on next session objectives, target grades, and milestones","assignee":"Tutor","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":570},"data":{"label":"Share Resources","type":"action","description":"Tutor uploads or links educational materials, worksheets, and practice papers to the student''s learning hub","assignee":"Tutor","editable":true}},
    {"id":"action-5","type":"processStep","position":{"x":300,"y":700},"data":{"label":"Send Progress Report","type":"notification","description":"Automated or manual progress report sent to client/parent with session summary, grades achieved, and next steps","assignee":"System/Tutor","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":830},"data":{"label":"Student Updated","type":"end","description":"Student profile updated with latest progress data","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"action-5","animated":true},
    {"id":"e6","source":"action-5","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['View Profile', 'Session Notes', 'Learning Goals', 'Resources', 'Progress Report'],
  ARRAY['students', 'progress', 'tutor', 'management', 'reports'],
  true
),

-- Marketplace Discovery (client-facing search and discovery)
(
  gen_random_uuid(),
  'Marketplace Discovery',
  'Client-facing marketplace journey: search and filter tutor listings, review profiles and qualifications, save favourites to wishlists, compare options, and select a tutor to request.',
  'listings',
  'simple',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Enter Marketplace","type":"trigger","description":"Client navigates to the marketplace or search page","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":180},"data":{"label":"Search & Filter","type":"action","description":"Client searches by subject, level (GCSE/A-Level/University), location, delivery mode (online/in-person), and price range","estimatedDuration":"5 minutes","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":310},"data":{"label":"Review Profiles","type":"action","description":"Client reads tutor bio, qualifications, reviews, star rating, CaaS score, and intro video","editable":true}},
    {"id":"condition-1","type":"processStep","position":{"x":300,"y":440},"data":{"label":"Save or Request?","type":"condition","description":"Client decides to save the tutor to a wishlist for later, or proceed with a booking request now","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":570},"data":{"label":"Save to Wishlist","type":"action","description":"Client saves tutor listing to a personal wishlist for future reference","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":700},"data":{"label":"Tutor Selected","type":"end","description":"Client has selected a tutor and proceeds to send a booking request","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"condition-1","animated":true},
    {"id":"e4-yes","source":"condition-1","target":"action-3","sourceHandle":"yes","animated":true},
    {"id":"e4-no","source":"condition-1","target":"end-1","sourceHandle":"no","animated":true},
    {"id":"e5","source":"action-3","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Search', 'Filter', 'Review Profiles', 'Save/Request', 'Select Tutor'],
  ARRAY['marketplace', 'discovery', 'search', 'wishlists', 'client'],
  true
)

ON CONFLICT DO NOTHING;

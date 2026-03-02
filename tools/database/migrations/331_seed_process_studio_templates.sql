-- Migration 331: Seed additional workflow process templates (7 more, total 10)
-- Depends on: 330_create_workflow_processes.sql

INSERT INTO workflow_process_templates (id, name, description, category, complexity, nodes, edges, preview_steps, tags, is_system)
VALUES

-- 4. Listing Publication
(
  gen_random_uuid(),
  'Listing Publication',
  'End-to-end listing creation and publication pipeline with review and approval stages.',
  'listings',
  'medium',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Create Listing","type":"trigger","description":"Tutor or admin creates a new listing","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":180},"data":{"label":"Review Content","type":"action","description":"Review listing details, pricing, and media","editable":true}},
    {"id":"condition-1","type":"processStep","position":{"x":300,"y":310},"data":{"label":"Meets Standards?","type":"condition","description":"Check listing meets quality and compliance standards","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":440},"data":{"label":"Approve & Publish","type":"approval","description":"Approve listing and make it live on the platform","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":570},"data":{"label":"Notify Tutor","type":"notification","description":"Send confirmation notification to the tutor","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":700},"data":{"label":"Published","type":"end","description":"Listing is live","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"condition-1","animated":true},
    {"id":"e3","source":"condition-1","target":"action-2","animated":true},
    {"id":"e4","source":"action-2","target":"action-3","animated":true},
    {"id":"e5","source":"action-3","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Create', 'Review', 'Approve', 'Publish', 'Notify'],
  ARRAY['listings', 'publishing', 'review'],
  true
),

-- 5. Booking Lifecycle
(
  gen_random_uuid(),
  'Booking Lifecycle',
  'Complete booking flow from request through session delivery to review and completion.',
  'bookings',
  'advanced',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Booking Requested","type":"trigger","description":"Client requests a booking","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":160},"data":{"label":"Match Tutor","type":"action","description":"Match with available tutor based on preferences","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":270},"data":{"label":"Schedule Session","type":"action","description":"Confirm date, time, and delivery mode","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":380},"data":{"label":"Confirm Booking","type":"approval","description":"Both parties confirm the booking details","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":490},"data":{"label":"Deliver Session","type":"action","description":"Conduct the tutoring session","editable":true}},
    {"id":"action-5","type":"processStep","position":{"x":300,"y":600},"data":{"label":"Collect Review","type":"action","description":"Request feedback from client","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":710},"data":{"label":"Complete","type":"end","description":"Booking lifecycle complete","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"action-5","animated":true},
    {"id":"e6","source":"action-5","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Request', 'Match', 'Schedule', 'Confirm', 'Session', 'Review', 'Complete'],
  ARRAY['bookings', 'sessions', 'lifecycle'],
  true
),

-- 6. Referral Processing
(
  gen_random_uuid(),
  'Referral Processing',
  'Track referrals from creation through validation, conversion, and reward distribution.',
  'referrals',
  'medium',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Referral Created","type":"trigger","description":"A new referral link is generated or shared","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":180},"data":{"label":"Validate Referral","type":"action","description":"Check referral is valid and not a duplicate","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":310},"data":{"label":"Track Progress","type":"action","description":"Monitor referral signup and activity","editable":true}},
    {"id":"condition-1","type":"processStep","position":{"x":300,"y":440},"data":{"label":"Converted?","type":"condition","description":"Has the referred user completed a qualifying action?","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":570},"data":{"label":"Distribute Reward","type":"action","description":"Issue reward to referrer and referee","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":700},"data":{"label":"Complete","type":"end","description":"Referral processed","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"condition-1","animated":true},
    {"id":"e4","source":"condition-1","target":"action-3","animated":true},
    {"id":"e5","source":"action-3","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Create', 'Validate', 'Track', 'Convert', 'Reward'],
  ARRAY['referrals', 'rewards', 'growth'],
  true
),

-- 7. Review Moderation
(
  gen_random_uuid(),
  'Review Moderation',
  'Moderate user reviews from submission through automated and manual checks to publication.',
  'reviews',
  'simple',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Review Submitted","type":"trigger","description":"User submits a review","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":180},"data":{"label":"Auto-Check","type":"action","description":"Run automated content moderation checks","editable":true}},
    {"id":"condition-1","type":"processStep","position":{"x":300,"y":310},"data":{"label":"Passes Check?","type":"condition","description":"Does the review pass automated moderation?","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":440},"data":{"label":"Publish Review","type":"action","description":"Approve and publish the review","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":570},"data":{"label":"Done","type":"end","description":"Review moderation complete","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"condition-1","animated":true},
    {"id":"e3","source":"condition-1","target":"action-2","animated":true},
    {"id":"e4","source":"action-2","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Submit', 'Check', 'Approve/Flag', 'Publish'],
  ARRAY['reviews', 'moderation', 'content'],
  true
),

-- 8. Financial Transaction
(
  gen_random_uuid(),
  'Financial Transaction',
  'Process financial transactions with validation, reconciliation, and notification stages.',
  'financials',
  'advanced',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Initiate Transaction","type":"trigger","description":"A payment or transfer is initiated","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":160},"data":{"label":"Validate Details","type":"action","description":"Verify payment amount, method, and recipient","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":270},"data":{"label":"Process Payment","type":"action","description":"Execute the payment via payment provider","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":380},"data":{"label":"Reconcile","type":"action","description":"Match transaction with invoices and records","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":490},"data":{"label":"Notify Parties","type":"notification","description":"Send receipt and confirmation to all parties","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":600},"data":{"label":"Complete","type":"end","description":"Transaction complete","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Initiate', 'Validate', 'Process', 'Reconcile', 'Notify', 'Complete'],
  ARRAY['financials', 'payments', 'accounting'],
  true
),

-- 9. AI Agent Setup
(
  gen_random_uuid(),
  'AI Agent Setup',
  'Configure and deploy an AI agent through creation, testing, review, and publication.',
  'ai-agents',
  'medium',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Create Agent","type":"trigger","description":"Create a new AI agent configuration","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":180},"data":{"label":"Configure Agent","type":"action","description":"Set prompts, tools, and behaviour parameters","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":310},"data":{"label":"Test Agent","type":"action","description":"Run test conversations and validate responses","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":440},"data":{"label":"Review & Approve","type":"approval","description":"Review test results and approve for deployment","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":570},"data":{"label":"Deploy Agent","type":"action","description":"Publish the agent to production","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":700},"data":{"label":"Live","type":"end","description":"Agent is live and serving users","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Create', 'Configure', 'Test', 'Review', 'Deploy'],
  ARRAY['ai-agents', 'deployment', 'automation'],
  true
),

-- 10. Content Publishing
(
  gen_random_uuid(),
  'Content Publishing',
  'End-to-end content publishing pipeline from draft through SEO optimisation to tracking.',
  'resources',
  'medium',
  '[
    {"id":"trigger-1","type":"processStep","position":{"x":300,"y":50},"data":{"label":"Draft Content","type":"trigger","description":"Create initial content draft","editable":false}},
    {"id":"action-1","type":"processStep","position":{"x":300,"y":170},"data":{"label":"Editorial Review","type":"action","description":"Review content for quality, accuracy, and tone","editable":true}},
    {"id":"action-2","type":"processStep","position":{"x":300,"y":290},"data":{"label":"SEO Optimisation","type":"action","description":"Optimise title, meta, keywords, and structure","editable":true}},
    {"id":"action-3","type":"processStep","position":{"x":300,"y":410},"data":{"label":"Approve","type":"approval","description":"Final approval before publication","editable":true}},
    {"id":"action-4","type":"processStep","position":{"x":300,"y":530},"data":{"label":"Publish","type":"action","description":"Publish content to the platform","editable":true}},
    {"id":"action-5","type":"processStep","position":{"x":300,"y":650},"data":{"label":"Track Performance","type":"action","description":"Monitor views, engagement, and conversions","editable":true}},
    {"id":"end-1","type":"processStep","position":{"x":300,"y":770},"data":{"label":"Complete","type":"end","description":"Content lifecycle complete","editable":false}}
  ]'::jsonb,
  '[
    {"id":"e1","source":"trigger-1","target":"action-1","animated":true},
    {"id":"e2","source":"action-1","target":"action-2","animated":true},
    {"id":"e3","source":"action-2","target":"action-3","animated":true},
    {"id":"e4","source":"action-3","target":"action-4","animated":true},
    {"id":"e5","source":"action-4","target":"action-5","animated":true},
    {"id":"e6","source":"action-5","target":"end-1","animated":true}
  ]'::jsonb,
  ARRAY['Draft', 'Review', 'SEO Check', 'Approve', 'Publish', 'Track'],
  ARRAY['resources', 'content', 'publishing', 'seo'],
  true
)

ON CONFLICT DO NOTHING;

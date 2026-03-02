-- Migration 336: Fully comprehensive master template — all platform processes
-- Covers: Registration, Onboarding, Listings, Marketplace, Bookings, My Students,
--         Session Delivery, Financials, Reviews, Referrals, Content, AI Agents.

UPDATE workflow_process_templates
SET
  description = 'Complete end-to-end map of every process on the Tutorwise platform — registration, onboarding, listing publication, marketplace discovery, booking lifecycle, student management, financial transactions, review moderation, referral processing, content publishing, and AI agent operations.',
  complexity  = 'advanced',
  nodes = '[
    {
      "id": "trigger-1",
      "type": "processStep",
      "position": {"x": 360, "y": 50},
      "data": {
        "label": "User Registers",
        "type": "trigger",
        "description": "New user signs up via email or OAuth (Google, Facebook)",
        "editable": false
      }
    },
    {
      "id": "action-1",
      "type": "processStep",
      "position": {"x": 360, "y": 190},
      "data": {
        "label": "Email Verification",
        "type": "action",
        "description": "System sends a verification email; user confirms to activate their account",
        "assignee": "System",
        "estimatedDuration": "5 minutes",
        "editable": true
      }
    },
    {
      "id": "condition-1",
      "type": "processStep",
      "position": {"x": 360, "y": 330},
      "data": {
        "label": "Role Selection",
        "type": "condition",
        "description": "User selects their role(s): Tutor, Client (Student/Parent), or Agent. Users can hold multiple roles.",
        "editable": true
      }
    },
    {
      "id": "subprocess-1",
      "type": "processStep",
      "position": {"x": 360, "y": 475},
      "data": {
        "label": "User Onboarding",
        "type": "subprocess",
        "description": "Role-specific onboarding: personal info, professional details (tutors/agents), learning preferences (clients), verification documents, availability setup, and welcome activation",
        "stepCount": 9,
        "templateName": "User Onboarding",
        "editable": true
      }
    },
    {
      "id": "subprocess-2",
      "type": "processStep",
      "position": {"x": 360, "y": 635},
      "data": {
        "label": "Listing Publication",
        "type": "subprocess",
        "description": "Tutors and agents create subject listings with pricing, qualifications, delivery mode, and media. Listings pass automated quality checks and admin review before going live on the marketplace.",
        "stepCount": 6,
        "templateName": "Listing Publication",
        "editable": true
      }
    },
    {
      "id": "subprocess-3",
      "type": "processStep",
      "position": {"x": 360, "y": 795},
      "data": {
        "label": "Marketplace & Discovery",
        "type": "subprocess",
        "description": "Clients search and filter tutor listings by subject, level, location, price, delivery mode, and rating. Save favourites to wishlists, compare profiles, and select a tutor to request.",
        "stepCount": 5,
        "templateName": "Marketplace Discovery",
        "editable": true
      }
    },
    {
      "id": "action-2",
      "type": "processStep",
      "position": {"x": 360, "y": 955},
      "data": {
        "label": "Booking Request",
        "type": "action",
        "description": "Client submits a session booking request to a specific tutor/agent, specifying subject, level, preferred delivery mode, and availability",
        "assignee": "Client",
        "estimatedDuration": "5 minutes",
        "editable": true
      }
    },
    {
      "id": "subprocess-4",
      "type": "processStep",
      "position": {"x": 360, "y": 1095},
      "data": {
        "label": "Booking Lifecycle",
        "type": "subprocess",
        "description": "Full booking flow: propose time → confirm schedule (both parties) → process payment → deliver session via VirtualSpace → auto-complete by cron → collect reviews from both parties",
        "stepCount": 7,
        "templateName": "Booking Lifecycle",
        "editable": true
      }
    },
    {
      "id": "subprocess-5",
      "type": "processStep",
      "position": {"x": 360, "y": 1255},
      "data": {
        "label": "My Students",
        "type": "subprocess",
        "description": "Tutors manage their active student roster: view individual progress, session history and notes, set learning goals, share resources, send session reports to clients/parents, and track attendance.",
        "stepCount": 6,
        "templateName": "Student Management",
        "editable": true
      }
    },
    {
      "id": "subprocess-6",
      "type": "processStep",
      "position": {"x": 360, "y": 1415},
      "data": {
        "label": "Financial Transaction",
        "type": "subprocess",
        "description": "Stripe payment capture, platform fee deduction, VAT calculation, tutor/agent payout scheduling, invoice generation, reconciliation, and financial reporting",
        "stepCount": 5,
        "templateName": "Financial Transaction",
        "editable": true
      }
    },
    {
      "id": "subprocess-7",
      "type": "processStep",
      "position": {"x": 360, "y": 1575},
      "data": {
        "label": "Reviews & Moderation",
        "type": "subprocess",
        "description": "Post-session reviews submitted by students and tutors go through automated content moderation. Approved reviews update tutor star ratings, review count, and public profile credibility.",
        "stepCount": 4,
        "templateName": "Review Moderation",
        "editable": true
      }
    },
    {
      "id": "subprocess-8",
      "type": "processStep",
      "position": {"x": 360, "y": 1735},
      "data": {
        "label": "Referral Processing",
        "type": "subprocess",
        "description": "Referral link generation, sharing tracking, new user attribution, qualifying action validation, and automated reward credit distribution to both referrer and referee",
        "stepCount": 5,
        "templateName": "Referral Processing",
        "editable": true
      }
    },
    {
      "id": "action-3",
      "type": "processStep",
      "position": {"x": 360, "y": 1895},
      "data": {
        "label": "CaaS Score Update",
        "type": "action",
        "description": "Automated credibility-as-a-service scoring: update tutor/agent score based on completed sessions, star ratings, response rate, profile completeness, and DBS status",
        "assignee": "CAS Agent",
        "estimatedDuration": "Automatic",
        "editable": true
      }
    },
    {
      "id": "subprocess-9",
      "type": "processStep",
      "position": {"x": 360, "y": 2035},
      "data": {
        "label": "Content Publishing",
        "type": "subprocess",
        "description": "Educational resources and blog articles go through editorial review, SEO optimisation, admin approval, and publication with ongoing performance and engagement tracking",
        "stepCount": 7,
        "templateName": "Content Publishing",
        "editable": true
      }
    },
    {
      "id": "subprocess-10",
      "type": "processStep",
      "position": {"x": 360, "y": 2195},
      "data": {
        "label": "AI Agent Operations",
        "type": "subprocess",
        "description": "CAS agents (marketer, analyst, planner, developer, QA, security) are configured, tested, reviewed, and deployed to automate platform operations. Runtime switches between custom and LangGraph.",
        "stepCount": 6,
        "templateName": "AI Agent Setup",
        "editable": true
      }
    },
    {
      "id": "end-1",
      "type": "processStep",
      "position": {"x": 360, "y": 2355},
      "data": {
        "label": "Platform Active",
        "type": "end",
        "description": "All platform processes running — users active, listings live, bookings flowing, payments processing, students learning, AI agents operating autonomously",
        "editable": false
      }
    }
  ]'::jsonb,
  edges = '[
    {"id": "e1",     "source": "trigger-1",    "target": "action-1",     "animated": true},
    {"id": "e2",     "source": "action-1",     "target": "condition-1",  "animated": true},
    {"id": "e3-yes", "source": "condition-1",  "target": "subprocess-1", "sourceHandle": "yes", "animated": true},
    {"id": "e3-no",  "source": "condition-1",  "target": "subprocess-1", "sourceHandle": "no",  "animated": true},
    {"id": "e4",     "source": "subprocess-1", "target": "subprocess-2", "animated": true},
    {"id": "e5",     "source": "subprocess-2", "target": "subprocess-3", "animated": true},
    {"id": "e6",     "source": "subprocess-3", "target": "action-2",     "animated": true},
    {"id": "e7",     "source": "action-2",     "target": "subprocess-4", "animated": true},
    {"id": "e8",     "source": "subprocess-4", "target": "subprocess-5", "animated": true},
    {"id": "e9",     "source": "subprocess-5", "target": "subprocess-6", "animated": true},
    {"id": "e10",    "source": "subprocess-6", "target": "subprocess-7", "animated": true},
    {"id": "e11",    "source": "subprocess-7", "target": "subprocess-8", "animated": true},
    {"id": "e12",    "source": "subprocess-8", "target": "action-3",     "animated": true},
    {"id": "e13",    "source": "action-3",     "target": "subprocess-9", "animated": true},
    {"id": "e14",    "source": "subprocess-9", "target": "subprocess-10","animated": true},
    {"id": "e15",    "source": "subprocess-10","target": "end-1",        "animated": true}
  ]'::jsonb,
  preview_steps = ARRAY['User Onboarding', 'Listing Publication', 'Booking Lifecycle', 'My Students', 'Financial Transaction', 'Reviews & Moderation', 'Referral Processing'],
  tags = ARRAY['platform', 'master', 'user-journey', 'subprocess', 'end-to-end', 'listings', 'financials', 'referrals', 'reviews', 'my-students', 'bookings', 'onboarding']
WHERE name = 'Tutorwise User Dashboard Processes' AND is_system = true;

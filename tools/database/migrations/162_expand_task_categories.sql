-- Migration 162: Expand Task Categories to Cover All Platform Features
-- Created: 2026-01-04
-- Description: Updates task categories to include all platform features

BEGIN;

-- Drop existing category constraint
ALTER TABLE org_tasks DROP CONSTRAINT IF EXISTS check_task_category;

-- Add comprehensive category constraint covering all platform features
ALTER TABLE org_tasks ADD CONSTRAINT check_task_category CHECK (
  category IN (
    -- User & Profile Management
    'client_issue',           -- Parent/client complaints, requests, issues
    'tutor_issue',            -- Tutor problems, performance, concerns
    'agent_issue',            -- Agent-related tasks and issues
    'account',                -- Account management, settings, verification
    'profile',                -- Profile updates, completeness, moderation
    'public_profile',         -- Public profile pages, visibility, SEO

    -- Organisation Management
    'organisation',           -- Organisation setup, settings, team management
    'public_organisation',    -- Public organisation pages, visibility, SEO

    -- Listings & Marketplace
    'listing',                -- Listing creation, updates, moderation
    'public_listing',         -- Public listing pages, visibility, SEO
    'marketplace',            -- General marketplace operations

    -- Bookings & Scheduling
    'booking_issue',          -- Scheduling conflicts, cancellations

    -- Financial
    'payment_issue',          -- Payment disputes, refunds, billing
    'financial',              -- General financial tasks
    'transactions',           -- Transaction issues, failures
    'payouts',                -- Payout processing, delays
    'disputes',               -- Payment disputes, chargebacks

    -- Referrals & Network
    'referral',               -- Referral tracking, commission disputes
    'network',                -- Connections, network graph, relationships

    -- Communication
    'messages',               -- Chat issues, messaging problems

    -- Reviews & Moderation
    'reviews',                -- Review moderation, disputes, flagged content

    -- Discovery & Lists
    'wiselist',               -- Wiselist management, spam, moderation

    -- Support & Help
    'help_centre',            -- Help centre content, FAQs, guides

    -- Development & Technical
    'developer',              -- API issues, integrations, technical tasks

    -- Safety & Compliance
    'safeguarding',           -- DBS checks, safety concerns, child protection

    -- General
    'admin',                  -- General administrative work
    'other'                   -- Miscellaneous tasks
  )
);

COMMENT ON CONSTRAINT check_task_category ON org_tasks IS 'Comprehensive task categories covering all platform features';

-- Add comment explaining the categories
COMMENT ON COLUMN org_tasks.category IS 'Task category options: client_issue, tutor_issue, agent_issue, account, profile, public_profile, organisation, public_organisation, listing, public_listing, marketplace, booking_issue, payment_issue, financial, transactions, payouts, disputes, referral, network, messages, reviews, wiselist, help_centre, developer, safeguarding, admin, other';

COMMIT;

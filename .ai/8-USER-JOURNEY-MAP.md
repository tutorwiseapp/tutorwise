# TutorWise User Journey Map

**Last Updated:** 2026-03-11
**Status:** Production

---

## Overview

Complete journey maps for developers, end-users (Tutors, Students/Clients, Agents), admins, and AI-assisted services on the platform.

**Key Platform Features:**
- Universal CaaS v6.0 scoring (0-100 credibility score)
- Three-sided marketplace (Tutors, Clients, Agents)
- Real-time collaboration (WiseSpace)
- Free Help Now (immediate tutoring)
- Organisation management (Premium subscriptions)
- Hierarchical referral system
- Process Studio (visual workflow design for admins)
- Conductor (admin control plane — agents, teams, spaces, intelligence, process mining)
- Growth Agent (AI-powered revenue and business advisor for all roles)
- 6-tier AI fallback chain: xAI Grok 4 Fast, Gemini Flash, DeepSeek R1, Claude Sonnet 4.6, GPT-4o, rules-based

---

## Developer Journey

### New Developer Onboarding

```
1. INITIAL SETUP (5 minutes)
   └─> Read .ai/QUICK-START.md
       ├─ Clone repository
       ├─ Run ./tools/scripts/setup/setup-dev-env.sh
       ├─ Configure minimum .env.local variables
       └─> npm run dev → http://localhost:3000

2. COMPLETE SETUP (2 hours)
   └─> Read .ai/DEVELOPER-SETUP.md
       ├─ Install development tools (VSCode, Claude Code, CLIs)
       ├─ Configure databases (Supabase, Redis)
       ├─ Set up cloud services (Stripe, Resend, Ably)
       └─> Authenticate AI tools

3. UNDERSTAND CODEBASE (1 hour)
   └─> Read core documentation
       ├─ .ai/3-SYSTEM-NAVIGATION.md - Find everything
       ├─ .ai/2-PLATFORM-SPECIFICATION.md - Architecture
       ├─ .ai/4-PATTERNS.md - Coding patterns
       ├─ .ai/8-USER-JOURNEY-MAP.md - This file
       └─> .ai/1-ROADMAP.md - Product roadmap

4. DAILY DEVELOPMENT WORKFLOW
   └─> Morning routine
       ├─ git pull origin main
       ├─ npm install (if package.json changed)
       ├─ npm run workflow:check
       └─> npm run dev

   └─> Making changes
       ├─ Create feature branch
       ├─ Make changes and test
       ├─ npm run workflow:full (before commit)
       └─> Commit and push
```

### Developer Resources

| Stage | Time | Resources |
|-------|------|-----------|
| **Getting Running** | 5 min | .ai/QUICK-START.md |
| **Complete Setup** | 2 hours | .ai/DEVELOPER-SETUP.md |
| **Find Code** | As needed | .ai/3-SYSTEM-NAVIGATION.md |
| **Understand Architecture** | As needed | .ai/2-PLATFORM-SPECIFICATION.md |
| **Learn Patterns** | As needed | .ai/4-PATTERNS.md |
| **User Journeys** | As needed | .ai/8-USER-JOURNEY-MAP.md |
| **See Roadmap** | As needed | .ai/1-ROADMAP.md |

---

## Tutor Journey

### 1. Signup & Onboarding

```
SIGNUP → /signup
├─ Create account with email/password
├─ Email verification
└─> Auto-redirect to onboarding

ONBOARDING → /onboarding/tutor
├─ Role Selection (select "Tutor")
├─ Subjects & Levels (teaching areas)
├─ Experience & Qualifications
├─ Teaching Methods & Specializations
├─ Availability (weekly schedule)
└─> Complete → Dashboard

CAAS SCORE INITIALIZED
├─ Provisional score calculated (v6.0 Universal Model)
├─ Score visible immediately: ~15/100 (70% multiplier)
└─> Breakdown shows 6 buckets with improvement tips
```

### 2. Dashboard (First Visit)

```
DASHBOARD → /dashboard
├─ Welcome banner: "Onboarding Complete!"
├─ CaaS Score Card: 15/100 Provisional
│   ├─ "Verify identity for +20% boost"
│   └─> Click → /settings/verification
├─ Quick Actions:
│   ├─ Create Listing (primary CTA)
│   ├─ Verify Identity
│   └─ Complete Profile
└─> Navigation sidebar
    ├─ Dashboard
    ├─ Listings
    ├─ Bookings
    ├─ Free Help Now
    ├─ WiseSpace
    ├─ Profile
    └─ Settings
```

### 3. Create First Listing

```
CREATE LISTING → /listings/create
├─ Basic Info
│   ├─ Title (auto-generated from subjects)
│   └─ Description
├─ Teaching Details
│   ├─ Subjects & levels
│   ├─ Languages
│   └─ Teaching methods
├─ Pricing
│   ├─ Hourly rate
│   ├─ Package pricing (optional)
│   └─ Free trial offer
├─ Location & Availability
│   ├─ Online/In-person
│   ├─ Weekly schedule
│   └─ Time zone
├─ Media (optional)
│   ├─ Profile photo
│   ├─ Bio video
│   └─ Credentials
└─> Publish

AFTER PUBLISHING
├─ Database trigger fires (migration 200)
├─ CaaS recalculation Score updates immediately
└─> Listing visible on marketplace
```

### 4. Manage Listings

```
LISTINGS → /listings
├─ All Listings tab
│   ├─ Published (green badge)
│   ├─ Draft (gray badge)
│   └─ Paused (yellow badge)
├─ Performance Metrics
│   ├─ Views
│   ├─ Inquiries
│   └─ Bookings
├─ Quick Actions
│   ├─ Edit
│   ├─ Pause/Resume
│   ├─ Duplicate
│   └─ Delete
└─> Create New Listing button
```

### 5. Receive Bookings

```
BOOKING REQUEST → /bookings
├─ Notification: "New booking request!"
├─ View booking details
│   ├─ Client info
│   ├─ Subject & level
│   ├─ Date & time
│   ├─ Duration
│   └─ Price
├─ Actions
│   ├─ Accept
│   ├─ Decline (with reason)
│   └─ Propose alternative time
└─> Accept → WiseSpace session created

AFTER BOOKING COMPLETION
├─ Database trigger fires (migration 201)
├─ CaaS recalculation queued (tutor + client)
├─ Payment processed (Stripe)
├─ Score updates: Delivery bucket increases
└─> Request review from client
```

### 6. Free Help Now

```
FREE HELP NOW → /free-help
├─ Toggle availability: "Available for free help"
├─ Real-time presence (Redis)
├─ Client can request instant help
├─ Accept request → WiseSpace session
└─> Complete session

AFTER FREE HELP SESSION
├─ Database trigger fires (migration 088)
├─ CaaS recalculation queued (high priority)
├─ Score updates: Impact bucket increases
└─> Build reputation + help new tutors
```

### 7. WiseSpace (Real-time Teaching)

```
WISESPACE → /wisespace/[sessionId]
├─ Video call (Ably WebRTC)
├─ Code editor (collaborative)
├─ Whiteboard (shared canvas)
├─ Chat (real-time messaging)
├─ File sharing
└─> Recording (Lessonspace)

AFTER SESSION WITH RECORDING
├─ Database trigger fires (migration 078)
├─ CaaS recalculation queued
├─ Score updates: Digital bucket increases
└─> Recording URL saved to booking
```

### 8. Verification & Score Growth

```
VERIFICATION JOURNEY
├─ Provisional (0.70 multiplier): 15/100
│   └─> Complete onboarding
├─ Identity Verified (0.85 multiplier): 32/100 (+17, +113%)
│   └─> Upload ID + selfie
└─> Fully Verified (1.00 multiplier): 38/100 (+6, +19%)
    └─> Email + Phone + Background check

SCORE GROWTH PATH (Example)
├─ Week 1: 15/100 (provisional, 0 sessions)
├─ Week 2: 32/100 (identity verified, 5 sessions)
├─ Week 4: 48/100 (10 sessions, 2 reviews, 1 recording)
├─ Week 8: 65/100 (25 sessions, 5 reviews, Google Calendar sync)
└─> Month 6: 84/100 (100 sessions, 4.8 rating, fully verified)
```

---

## Client (Student) Journey

### 1. Signup & Onboarding

```
SIGNUP → /signup
├─ Create account
├─ Email verification
└─> Auto-redirect to onboarding

ONBOARDING → /onboarding/client
├─ Role Selection (select "Client/Student")
├─ Subject Interests
├─ Learning Goals
├─ Preferred Learning Style
├─ Budget & Availability
└─> Complete → Dashboard

CAAS SCORE INITIALIZED
├─ Provisional score: ~21/100 (70% multiplier)
├─ No more hard gate (fixed in v6.0)
└─> Can use platform immediately
```

### 2. Dashboard (First Visit)

```
DASHBOARD → /dashboard
├─ Welcome message: "Find the perfect tutor!"
├─ CaaS Score Card: 21/100 Provisional
├─ Quick Actions:
│   ├─ Find Tutors (primary CTA)
│   ├─ Free Help Now (instant tutoring)
│   └─ Verify Identity
└─> Navigation sidebar
```

### 3. Browse Marketplace

```
MARKETPLACE → /marketplace
├─ Search bar (subjects, tutors)
├─ Filters
│   ├─ Subject
│   ├─ Level
│   ├─ Delivery mode (online/in-person)
│   ├─ Price range
│   ├─ Rating
│   └─ Availability
├─ Sort by
│   ├─ CaaS Score (highest first)
│   ├─ Price (low to high)
│   ├─ Rating (highest first)
│   └─ Newest
└─> Listing cards
    ├─ Tutor photo + CaaS badge
    ├─ Subjects & levels
    ├─ Hourly rate
    ├─ Rating
    └─> Click → Listing detail

MARKETPLACE SEARCH EVENTS
├─ Each search logs a fire-and-forget event to marketplace_search_events
└─> Used by Conductor intelligence for supply/demand gap analysis
```

### 4. View Tutor Profile

```
LISTING DETAIL → /marketplace/[listingId]
├─ Tutor Overview
│   ├─ CaaS Score: 84/100 Fully Verified
│   ├─ Rating: 4.8 (23 reviews)
│   └─ Hourly rate: £45
├─ About Section
│   ├─ Bio
│   ├─ Teaching philosophy
│   └─ Bio video (if uploaded)
├─ Teaching Details
│   ├─ Subjects & levels
│   ├─ Languages
│   ├─ Specializations
│   └─ Methods
├─ Qualifications
│   ├─ Degrees (verified badges)
│   ├─ Certifications
│   └─ Years of experience
├─ Availability
│   ├─ Weekly schedule
│   └─> Book specific time slot
├─ Reviews
│   ├─ Star ratings
│   ├─ Written feedback
│   └─> See all reviews
└─> CTAs
    ├─ Book a Lesson (primary)
    ├─ Send Message
    └─ Save to Favorites
```

### 5. Book a Session

```
BOOKING FLOW → /bookings/create/[listingId]
├─ Select date & time
├─ Select duration (1-3 hours)
├─ Select subject/topic
├─ Add special requests (optional)
├─ Pricing summary
│   ├─ Hourly rate x duration
│   ├─ Platform fee (10%)
│   └─ Total
├─> Checkout (Stripe)
└─> Booking confirmed

AFTER BOOKING
├─ Email confirmation sent
├─ Calendar invite sent (if integrated)
├─ WiseSpace session created
└─> Tutor receives notification
```

### 6. Attend Session (WiseSpace)

```
WISESPACE SESSION → /wisespace/[sessionId]
├─ Join video call
├─ Use collaborative tools
├─ Real-time learning
└─> Session completes

AFTER SESSION COMPLETION
├─ Database trigger fires (migration 201)
├─ CaaS recalculation queued (client + tutor)
├─ Client score updates: Delivery bucket increases
├─> Leave review (optional)
```

### 7. Free Help Now (Taking Help)

```
FREE HELP NOW → /free-help
├─ Browse available tutors (real-time)
├─ Select subject
├─> Request instant help
└─> Connect with tutor → WiseSpace

AFTER FREE HELP SESSION
├─ Database trigger fires
├─ CaaS recalculation queued
├─ Score updates: Impact bucket increases
│   └─> "Helping new tutors improve"
└─> Build credibility through participation
```

### 8. Score Growth (Client)

```
SCORE GROWTH PATH (Example)
├─ Week 1: 21/100 (provisional, onboarding complete)
├─ Week 2: 38/100 (identity verified, profile complete)
├─ Week 4: 52/100 (5 bookings completed, 2 reviews given)
├─ Week 8: 58/100 (15 bookings, 90% completion rate)
└─> Month 6: 66/100 (50 bookings, fully verified, active participant)
```

---

## Agent Journey

### 1. Signup & Onboarding

```
SIGNUP → /signup
└─> Create account

ONBOARDING → /onboarding/agent
├─ Role Selection (select "Agent")
├─ Teaching Subjects (agents ARE tutors)
├─ Experience & Qualifications
├─ Recruitment Focus
├─ Commission Structure (10% of referred bookings)
└─> Complete → Dashboard

CAAS SCORE INITIALIZED
├─ Provisional score: ~15/100 (same as tutor)
├─ Agent = Tutor who also recruits
└─> Can teach AND refer
```

### 2. Dashboard (Agent View)

```
DASHBOARD → /dashboard
├─ CaaS Score Card: 15/100 Provisional
├─ Referral Stats
│   ├─ Referrals made: 0
│   ├─ Conversions: 0
│   └─ Commission earned: £0
├─> Quick Actions
    ├─ Create Listing (tutor activity)
    ├─ Refer a Tutor
    ├─ View Referrals
    └─> Track Earnings
```

### 3. Refer Tutors

```
REFERRALS → /referrals
├─ Generate referral link
│   └─> /signup?ref=[agentId]
├─ Send invitations
│   ├─ Email invites
│   ├─ Copy referral link
│   └─> Share on social media
└─> Track referrals
    ├─ Referred (status: pending)
    ├─ Converted (status: active tutor)
    └─> Earnings per referral

REFERRAL TRIGGERS (Automatic)
├─ Referral created → Migration 202 trigger fires
│   └─> Agent CaaS +7 pts (Network bucket)
├─ Referral converts → Migration 202 trigger fires
│   ├─> Agent CaaS +7 pts (Network bucket)
│   └─> Referred tutor gets initial CaaS score
└─> Commission tracking starts
```

### 4. Teach Sessions (Agent as Tutor)

```
AGENT TEACHING ACTIVITY
├─ Same as tutor journey:
│   ├─ Create listings
│   ├─ Receive bookings
│   ├─ Teach in WiseSpace
│   └─> Deliver free help
└─> CaaS score calculated with tutor metrics
    ├─ Delivery: Teaching sessions
    ├─ Credentials: Degrees & experience
    └─> Network: Referrals made (BONUS)
```

### 5. Score Growth (Agent)

```
SCORE GROWTH PATH (Example)
├─ Week 1: 15/100 (provisional, 0 sessions, 0 referrals)
├─ Week 2: 35/100 (identity verified, 5 sessions, 2 referrals made)
├─ Week 4: 58/100 (10 sessions, 5 referrals, 1 conversion)
├─ Week 8: 72/100 (25 sessions, 10 referrals, 3 conversions)
└─> Month 6: 80/100 (50 sessions, 10 converted referrals, fully verified)

NETWORK BUCKET ADVANTAGE
├─ Tutor with 3 referrals received: +21 pts
├─ Agent with 10 referrals made: +70 pts (capped at +35)
└─> Agents naturally score higher in Network bucket
```

---

## Organisation Journey

### 1. Create Organisation

```
ORGANISATION SETUP → /organisations/create
├─ Organisation name
├─ Description
├─ Logo upload
├─ Contact details
└─> Create

SUBSCRIPTION REQUIRED
├─ Free trial: 14 days
├─ After trial: £50/month
└─> Stripe subscription
```

### 2. Invite Tutors

```
ORGANISATION MANAGEMENT → /organisations/[orgId]
├─ Overview
│   ├─ Member count
│   ├─ Total bookings
│   └─> Organisation CaaS Score (aggregate)
├─ Members tab
│   ├─ Invite tutors (email)
│   ├─ View member list
│   ├─ Member CaaS scores
│   └─> Remove members
└─> Settings
    ├─ Billing
    ├─ Commission structure
    └─ Branding
```

### 3. Organisation CaaS Score

```
ORGANISATION SCORING
├─ Aggregate of member CaaS scores
├─ Formula: Weighted average
│   └─> Higher performing tutors contribute more
├─> Displayed on public organisation profile
└─> Updates automatically when members' scores change
```

---

## Growth Agent Journey (All Roles)

### Overview

The Growth Agent is an AI-powered revenue and business advisor available to all user roles (tutor, client, agent, organisation). It provides personalised guidance on pricing, referrals, income streams, business setup, and compliance. Powered by the 6-tier AI fallback chain.

### 1. Discover

```
DISCOVERY (Multiple Entry Points)
├─ Dashboard card: "Grow your income with AI advice"
├─ Free Revenue Audit available without subscription
│   └─> GET /api/growth-agent/audit
├─ Audit shows: pricing benchmarks, listing quality, referral gaps
└─> CTA: "Unlock full Growth Agent for £10/month"
```

### 2. Subscribe

```
SUBSCRIPTION → £10/month
├─ Stripe checkout flow
├─ growth_pro_subscriptions table tracks status
└─> Immediate access to full Growth Agent chat
```

### 3. Chat & Receive Advice

```
GROWTH AGENT CHAT → /growth-agent
├─ Conversational AI advisor (streaming responses)
├─ Role-adaptive system prompt (tutor/client/agent/organisation)
├─ 5 skill domains:
│   ├─ Profile & Listing Audit — pricing benchmarks, listing quality
│   ├─ Referral Strategy — channels, outreach templates, seasonal calendar
│   ├─ Revenue Intelligence — income patterns, seasonal demand, tax guidance
│   ├─ Income Stream Discovery — 4 income streams, unlock sequencing
│   └─ Business Setup & Compliance — registration, T&Cs, UK regulations
├─ 8 tools available to the agent for data retrieval
│   ├─ Fetches real user metrics (bookings, referrals, listings, AI agents)
│   └─> Hydrates context from Supabase in parallel
└─> Responses grounded in actual platform data, not generic advice

AI FALLBACK CHAIN (shared across Sage, Lexi, Growth Agent)
├─ Tier 1: xAI Grok 4 Fast (primary)
├─ Tier 2: Google Gemini Flash
├─ Tier 3: DeepSeek R1
├─ Tier 4: Anthropic Claude Sonnet 4.6
├─ Tier 5: OpenAI GPT-4o
└─> Tier 6: Rules-based fallback (always available)
```

### 4. Act on Recommendations

```
ACTIONABLE OUTCOMES
├─ Tutor: Optimise pricing, improve listing SEO, plan referral outreach
├─ Client: Find better value tutors, optimise booking patterns
├─ Agent: Maximise commission, recruit strategically, seasonal planning
├─ Organisation: Scale operations, improve member retention
└─> Each recommendation links to platform actions the user can take
```

---

## Sage (AI Tutor) Journey

### Overview

Sage is the AI tutoring assistant available to all users. It provides subject-matter help, explains concepts, and assists with learning. Powered by the 6-tier AI fallback chain (xAI Grok 4 Fast → Gemini Flash → DeepSeek R1 → Claude Sonnet 4.6 → GPT-4o → rules-based).

```
SAGE → /sage
├─ Subject-aware AI tutor chat
├─ Context-enriched with PlatformUserContext (growth scores, referrals, signals)
├─ Streaming responses via 6-tier AI fallback chain
├─ Cross-agent handoff to Lexi (help) or Growth Agent (business) when appropriate
└─> Session history persisted
```

---

## Lexi (Help Bot) Journey

### Overview

Lexi is the platform help bot that assists users with navigating the platform, understanding features, and resolving issues. Powered by the 6-tier AI fallback chain.

```
LEXI → /help
├─ Help Centre knowledge base search
├─ Contextual help based on current page
├─ Streaming responses via 6-tier AI fallback chain
├─ Context-enriched with PlatformUserContext
├─ Cross-agent handoff to Sage (learning) or Growth Agent (business) when appropriate
└─> Escalation to human support when needed
```

---

## CaaS Score Journey (All Roles)

### Understanding Your Score

```
CAAS SCORE BREAKDOWN
├─ Total: 75/100
├─ Verification Status: Identity Verified (0.85 multiplier)
└─> 6 Buckets:
    ├─ Delivery (40%): 85/100 → 34 weighted pts
    ├─ Credentials (20%): 90/100 → 18 weighted pts
    ├─ Network (15%): 36/100 → 5.4 weighted pts
    ├─ Trust (10%): 70/100 → 7 weighted pts
    ├─ Digital (10%): 80/100 → 8 weighted pts
    └─ Impact (5%): 50/100 → 2.5 weighted pts
    = 74.9 weighted x 0.85 multiplier = 64/100 final
```

### Score Improvement Tips

```
IMPROVE YOUR SCORE
├─ Verify Identity: +20% boost (0.70 → 0.85)
├─ Complete All Verifications: +18% boost (0.85 → 1.00)
├─ Deliver More Sessions: Delivery bucket increases
├─ Get Good Reviews: Delivery bucket increases
├─ Add Qualifications: Credentials bucket increases
├─ Make Connections: Network bucket increases
├─ Make/Receive Referrals: Network bucket increases
├─ Sync Google Calendar: Digital bucket increases
├─ Use Lessonspace Recordings: Digital bucket increases
└─> Deliver Free Help: Impact bucket increases
```

### CaaS Benefits

```
HIGH CAAS SCORE BENEFITS
├─ Higher in marketplace search results
├─ Trust badge on profile (80+ score)
├─ More booking inquiries
├─ Premium positioning (90+ score)
└─> Platform rewards and features
```

---

## Admin Journey

### 1. Admin Dashboard

```
ADMIN DASHBOARD → /admin
├─ Overview: Platform stats, KPIs, recent activity
├─ Admin Hubs:
│   ├─ Users          ├─ Bookings
│   ├─ Listings       ├─ Reviews
│   ├─ Organisations  ├─ Referrals
│   ├─ CaaS           ├─ Payments
│   ├─ Help Centre    ├─ Resources
│   ├─ Analytics      ├─ Network Intelligence
│   ├─ Conductor      ├─ Operations
│   └─> Process Studio
└─> RBAC: superadmin, admin, systemadmin, viewer
    └─> is_admin() function used for all RLS policies
```

### 2. Process Studio — Visual Workflow Design

```
PROCESS STUDIO → /admin/process-studio
├─ HubPageLayout wrapper (header, tabs, content)
├─ Tabs:
│   ├─ Design (3-column workspace)
│   └─ Templates (template library)
└─> RBAC: Requires 'process-studio:view' permission

DESIGN TAB (3-column workspace)
┌──────────────────────────────────────────────────────────┐
│ Toolbar: Save | Export PDF | Import | Clear | Undo | Redo│
│ [Process Name]                   3 steps · 2 connections │
├────────────┬──────────────────────────┬──────────────────┤
│ ChatPanel  │ ProcessStudioCanvas      │ PropertiesDrawer │
│ (320px)    │ (ReactFlow)              │ (400px)          │
│            │                          │                  │
│ AI chat    │ Visual node/edge editing │ Selected node    │
│ for NL     │ with drag, connect,      │ detail editing   │
│ editing    │ auto-layout              │                  │
└────────────┴──────────────────────────┴──────────────────┘
```

### 3. Process Studio — Create New Workflow

```
CREATE WORKFLOW (5 input methods)

METHOD 1: AI Auto-Visualize (R1)
├─ Describe process in natural language
│   └─> "Create an onboarding process for software engineers"
├─ AI parses text into nodes + edges (via 6-tier AI fallback chain)
├─ Supabase Realtime streams nodes to canvas progressively
├─ Auto-layout via Dagre arranges in top-to-bottom flow
└─> Canvas renders complete workflow

METHOD 2: Template Selection
├─ Open template selector modal
├─ Browse templates by category:
│   ├─ Booking Workflow
│   ├─ Listing Workflow
│   ├─ Referral Workflow
│   ├─ User Onboarding
│   └─ Tutor Onboarding
├─ Preview step count, complexity
└─> Load → Canvas renders template

METHOD 3: Manual Canvas Building (R3)
├─ Add nodes from toolbar (7 types):
│   ├─ Trigger (start)
│   ├─ Action (task step)
│   ├─ Condition (decision/branch)
│   ├─ Approval (human gate)
│   ├─ Notification (email/push)
│   ├─ Subprocess (nested process reference)
│   └─ End (completion)
├─ Drag to position, connect with edges
├─ Click node → PropertiesDrawer opens
│   ├─ Label, Type, Description
│   ├─ Objective, Completion Criteria
│   ├─ Expected Outputs
│   ├─ Assignee, Estimated Duration
│   └─> Auto-saves on field blur
└─> Build workflow step by step

METHOD 4: Chat-Based Editing (R2)
├─ Type natural language in ChatPanel
│   └─> "Add an IT setup step after orientation"
├─ AI interprets intent (add/remove/modify/reorder/connect)
├─ AI returns updated nodes + edges
├─ Canvas updates in real-time via Supabase Realtime
├─ Mutation stored for undo support
└─> Suggestion chips for common actions

METHOD 5: JSON Import
├─ Click Import in toolbar
├─ Upload .json file with nodes + edges
└─> Canvas renders imported workflow
```

### 4. Process Studio — Edit & Iterate

```
EDITING WORKFLOW
├─ Visual editing: Drag nodes, reconnect edges
├─ Chat editing: "Move IT setup before paperwork"
├─ Properties editing: Click node → edit in drawer
├─ Undo/Redo: Ctrl+Z / Ctrl+Shift+Z (50-step history)
└─> All edits tracked with snapshots for undo

SAVE & PERSISTENCE
├─ Auto-save to localStorage (1000ms debounce)
├─ Manual save to Supabase (Ctrl+S)
├─ Save status indicator: Saved / Unsaved / Saving...
└─> RLS: Users own their workflows, admins see all
```

### 5. Process Studio — Export & Share

```
PDF EXPORT
├─ Click Export PDF in toolbar
├─ Page 1: Title page
│   ├─ Process name, description
│   ├─ Created/modified dates
│   ├─ Step count, author
│   └─ Full canvas screenshot
├─ Page 2+: Step details
│   ├─ Each step with full metadata
│   ├─ Description, objective
│   ├─ Completion criteria, outputs
│   └─ Assignee, duration
└─> Download as formatted PDF

JSON EXPORT
├─ Export raw nodes + edges as .json
└─> Importable into another Process Studio instance
```

### 6. Process Execution Engine

```
PROCESS EXECUTION (Live and Shadow modes)
├─ Execution modes: design | shadow | live
├─ Live processes:
│   ├─ Tutor Approval (triggered by profile status → under_review)
│   └─ Commission Payout (weekly Friday 10:00 UTC via pg_cron)
├─ Shadow processes:
│   ├─ Booking Lifecycle — Human Tutor
│   └─ Booking Lifecycle — AI Tutor
├─ Webhook triggers: DB webhooks on profiles UPDATE and bookings INSERT
├─ Stripe integration: webhook resumes engine when execution_id in session metadata
└─> Admin toggle: PATCH /api/admin/process-studio/processes/[id]/execution-mode

EXECUTION API
├─ POST /api/admin/process-studio/execute/start
├─ GET/DELETE /api/admin/process-studio/execute/[executionId]
├─ POST /api/admin/process-studio/execute/[executionId]/resume
└─> POST /api/admin/process-studio/execute/task/[taskId]/complete
```

---

## Admin — Conductor Journey

The Conductor is the admin control plane at `/admin/conductor`. It provides a 4-stage workflow for managing the platform's AI digital workforce, process intelligence, and operational automation. The Conductor canvas uses 11 tabs organised into 4 stages.

### Stage 1: Design — Define Processes & Discover Patterns

```
DESIGN STAGE → /admin/conductor (workflows + discovery tabs)

WORKFLOWS TAB
├─ Browse all workflow processes
├─ Create/edit workflow definitions
├─ View execution mode status (design/shadow/live)
└─> Link to Process Studio for visual editing

DISCOVERY TAB
├─ Run discovery scans against platform data
├─ Identify undocumented processes and patterns
├─ View discovery results (workflow_discovery_results table)
└─> Convert discovered patterns into formal workflow definitions
```

### Stage 2: Build — Configure Agents, Teams, Spaces & Knowledge

```
BUILD STAGE → /admin/conductor (agents + teams + spaces + knowledge tabs)

AGENTS TAB → /admin/conductor (agents tab)
├─ View 8+ built-in specialist agents:
│   ├─ developer, tester, qa, engineer, security
│   ├─ marketer, analyst, planner
│   ├─ market-intelligence, retention-monitor, operations-monitor
│   └─> autonomy-calibrator (weekly)
├─ Configure agent system prompts and parameters
├─ View agent run history and outputs
├─ Agent episodic memory (memory_episodes + memory_facts)
│   ├─ Agents recall past experiences via vector similarity
│   └─> Facts extracted as subject/relation/object triples
├─ Chat with individual agents → /admin/conductor/agents/[slug]
└─> Manage analyst tools registry → /admin/conductor/agents/tools
    └─> 24+ analyst tools for data retrieval across 14 domains

TEAMS TAB → /admin/conductor (teams tab)
├─ Compose multi-agent teams from specialist agents
├─ 3 team patterns:
│   ├─ Supervisor — parallel execution + synthesis
│   ├─ Pipeline — topological sort, sequential handoff
│   └─ Swarm — dynamic NEXT_AGENT routing
├─ TeamRuntime v2: LangGraph StateGraph + PostgresSaver
├─ HITL (Human-in-the-Loop):
│   ├─ teamRuntime.run(slug, task, trigger, { hitl: true })
│   ├─ Pauses after specialists, status='awaiting_approval'
│   └─> Resume via POST /api/admin/teams/{id}/runs/{runId}/resume
├─ Built-in teams include DevOps Team (engineering space)
└─> Decision outcome stubs written post-run (7d + 30d lag)

SPACES TAB → /admin/conductor (spaces tab)
├─ Programme/domain containers for teams
├─ 4 built-in spaces:
│   ├─ go-to-market
│   ├─ engineering
│   ├─ operations
│   └─> analytics
├─ Multi-tenant ready (RLS + created_by)
└─> Space > Team > Agent hierarchy

KNOWLEDGE TAB → /admin/conductor (knowledge tab)
├─ Curate platform knowledge base (platform_knowledge_chunks)
├─ 18 knowledge categories covering all intelligence domains
├─ CRUD operations on knowledge chunks
├─ RAG preview: test retrieval against queries
├─ Knowledge injected into SpecialistAgentRunner via AGENT_KNOWLEDGE_CATEGORY map
└─> Vector search via match_platform_knowledge_chunks() RPC
```

### Stage 3: Execute — Run Processes & Handle Approvals

```
EXECUTE STAGE → /admin/conductor (execution tab)

EXECUTION PANEL
├─ Start workflow executions manually or via triggers
├─ Monitor active executions in real-time
│   ├─ Execution status: running, completed, failed, awaiting_approval
│   ├─ Task-level progress tracking
│   └─> Decision rationale (JSONB) recorded per execution
├─ Handle HITL approvals for paused executions
├─ View execution history and outputs
├─ ExecutionCommandBar: natural language routing via IntentDetector
│   └─> Classifies intent → routes to agent/workflow/tab
└─> GoLiveReadiness component: progress toward 50 clean shadow runs

SCHEDULED EXECUTION (Cron + Scheduler)
├─ pg_cron jobs for recurring processes:
│   ├─ Intelligence pipeline: daily metrics across 14 domains
│   ├─ Shadow reconciliation: batch conformance checks
│   ├─ Nudge scheduler: 4 conditions, 7d cooldown
│   └─> Commission payouts, session completion
├─ Platform scheduler implemented to replace pg_cron when ready
└─> All cron routes use x-cron-secret authentication
```

### Stage 4: Observe — Intelligence, Conformance & Mining

```
OBSERVE STAGE → /admin/conductor (monitoring + intelligence + mining tabs)

MONITORING TAB
├─ Platform-wide operational monitoring
├─ Agent run outputs and team run outputs
└─> Platform notifications (platform_notifications table)

INTELLIGENCE TAB (14 domains)
├─ IntelligencePanel with domain sub-tabs:
│   ├─ CaaS Health            ├─ Resources Health
│   ├─ SEO Health             ├─ Marketplace Health
│   ├─ Booking Health         ├─ Listing Health
│   ├─ Financial Health       ├─ VirtualSpace Health
│   ├─ Referral Funnel        ├─ Supply/Demand Gap
│   ├─ Keyword Opportunities  ├─ Content Attribution
│   ├─ Pricing Intelligence   ├─ Editorial Opportunities
│   └─> Process Mining (compact multi-process analytics)
├─ Daily metrics pipeline (pg_cron, staggered 04:30–11:00 UTC)
├─ Auto-fetches on first activation per sub-tab
├─ Autonomy sub-tab: TierCalibrationPanel for agent autonomy levels
│   ├─ process_autonomy_config per workflow
│   └─> autonomy-calibrator agent runs weekly
└─> 10 intelligence API routes under /api/admin/

MINING TAB (MiningPanel)
├─ Analytics sub-tab:
│   ├─ Execution path analysis per workflow
│   ├─ Cycle time per node (bottleneck detection)
│   └─> AI-generated pattern insights
├─ Conformance sub-tab:
│   ├─ Conformance rate (% of executions matching expected path)
│   ├─ Deviation list: skipped / unexpected_path / stuck
│   ├─ Mark deviations as expected (PATCH)
│   └─> conformance_deviations + process_patterns tables
├─ Shadow sub-tab:
│   ├─ Live vs shadow execution comparison dashboard
│   ├─ Go-live checklist (5 items, all must pass)
│   └─> Promote button → flips execution_mode to 'live'
└─> Shadow reconciliation cron checks completed executions automatically

NETWORK INTELLIGENCE → /admin/network
├─ 3 tabs for network analysis
├─ /api/admin/network/intelligence endpoint
└─> Linked from AdminSidebar
```

---

## Navigation Structure

### Global Sidebar (All Roles)

```
SIDEBAR MENU
├─ Dashboard
├─ Bookings
├─ Messages
├─> Role-specific:
    ├─ Tutors/Agents:
    │   ├─ Listings
    │   ├─ Free Help Now
    │   └─ WiseSpace
    ├─ Clients:
    │   ├─ Find Tutors (Marketplace)
    │   └─ Free Help Now
    └─> All:
        ├─ Profile
        ├─ Growth Agent
        ├─ Settings
        ├─ Help Centre
        └─ Log Out
```

### Admin Sidebar

```
ADMIN MENU → /admin
├─ Dashboard (Overview)
├─ Users
├─ Listings
├─ Bookings
├─ Reviews
├─ Organisations
├─ Referrals
├─ CaaS
├─ Payments
├─ Help Centre
├─ Resources
├─ Analytics
├─ Network Intelligence
├─ Conductor (Agents, Teams, Spaces, Intelligence, Mining)
├─ Operations
├─ Process Studio
└─ Settings
```

### Organisation Sidebar (Premium)

```
ORGANISATION MENU (if member/owner)
├─ Switch to: [Organisation Name]
├─> Organisation Dashboard
    ├─ Overview
    ├─ Members
    ├─ Bookings
    ├─ Earnings
    ├─ Settings
    └─ Billing
```

---

## Automatic Triggers & Events

### CaaS Recalculation Triggers

```
AUTOMATIC CAAS UPDATES (10-minute batches)
├─ Listing published → +queue tutor
├─ Booking completed + paid → +queue tutor, client, agent
├─ Referral created → +queue agent
├─ Referral converted → +queue agent, referred tutor
├─ Review received → +queue tutor
├─ Recording URL added → +queue tutor
├─ Free help completed → +queue tutor (high priority)
├─ Profile updated → +queue user
├─ Profile graph changed → +queue both users
└─> Integration linked → +queue user
```

### Process Execution Triggers

```
AUTOMATED PROCESS TRIGGERS
├─ Profile status → under_review: Tutor Approval workflow starts
├─ Booking INSERT: Booking Lifecycle workflow starts (if live)
├─ Stripe webhook: resumes paused execution when execution_id in metadata
├─ Weekly Friday 10:00 UTC: Commission Payout batch
└─> Nudge scheduler: checks 4 conditions, sends platform_notifications (7d cooldown)
```

### Conductor Intelligence Pipeline

```
DAILY INTELLIGENCE PIPELINE (pg_cron, staggered)
├─ 04:30 UTC: Resources metrics
├─ 04:45 UTC: Article intelligence scores
├─ 05:00 UTC: SEO metrics
├─ 05:30 UTC: CaaS metrics
├─ 06:00 UTC: Marketplace metrics
├─ 06:30 UTC: Bookings metrics
├─ 07:00 UTC: Listings metrics
├─ 07:30 UTC: Financials metrics
├─ 08:00 UTC: VirtualSpace metrics
├─ 09:00 UTC: Referral metrics + network stats materialized view
├─ 09:30 UTC: Retention + growth scores
├─ 10:00 UTC: AI adoption metrics
├─ 10:30 UTC: Org conversion metrics
└─> 11:00 UTC: AI Studio metrics
```

### Email Notifications

```
AUTOMATED EMAILS (Resend)
├─ Booking confirmed
├─ Booking reminder (24h before)
├─ Booking completed (request review)
├─ Payment received
├─ Referral converted
├─ Organisation invitation
└─> Subscription renewal reminder
```

---

## Testing Checklist

### Manual Test Flows

**Tutor Journey:**
1. Sign up → Complete onboarding → See provisional score
2. Verify identity → Score increases by ~20%
3. Create listing → Listing published → Score updates (10 min)
4. Receive booking → Complete session → Score updates
5. Add recording URL → Score updates (Digital bucket)
6. Deliver free help → Score updates (Impact bucket, high priority)

**Client Journey:**
1. Sign up → Complete onboarding → See provisional score (not 0!)
2. Browse marketplace → View tutor profiles with CaaS scores
3. Book session → Complete booking → Score updates
4. Leave review → Tutor score updates
5. Take free help → Score updates (Impact bucket)

**Agent Journey:**
1. Sign up → Complete onboarding → See provisional score
2. Create listing (agent as tutor) → Listing published
3. Refer tutors → Score updates (Network bucket)
4. Referral converts → Score updates (Network bucket)
5. Teach sessions → Score updates (Delivery bucket)

**Organisation Journey:**
1. Create organisation → Free trial starts
2. Invite tutors → Members join
3. View organisation CaaS score (aggregate)
4. Subscribe (Stripe) → Access premium features

**Growth Agent Journey:**
1. View free Revenue Audit on dashboard
2. Subscribe to Growth Agent (£10/month)
3. Open chat → Ask about pricing strategy → Receive data-grounded advice
4. Ask about referral channels → Get seasonal calendar and outreach templates
5. Ask about income streams → Receive unlock sequencing recommendations

**Conductor Journey (Admin):**
1. Navigate to /admin/conductor → 4-stage tab layout loads
2. Design stage: Create workflow, run discovery scan
3. Build stage: View agents, configure team, assign to space, add knowledge
4. Execute stage: Start process, monitor execution, handle HITL approval
5. Observe stage: View intelligence (14 domains), check conformance, review mining
6. Promote shadow process to live after checklist passes

---

## Related Documentation

- **Architecture:** `.ai/2-PLATFORM-SPECIFICATION.md`
- **Code Navigation:** `.ai/3-SYSTEM-NAVIGATION.md`
- **Coding Patterns:** `.ai/4-PATTERNS.md`
- **CaaS Model:** `docs/feature/caas/caas-model.md`
- **CaaS Triggers:** `docs/feature/caas/CAAS_TRIGGER_OPTIMIZATION_2026.md`
- **CaaS Summary:** `docs/feature/caas/IMPLEMENTATION_SUMMARY.md`
- **Quick Reference:** `.ai/CAAS-V6-UPDATE.md`
- **Process Studio:** `ipom/process-studio-solution-design.md`
- **Conductor Solution Design:** `conductor/conductor-solution-design.md`
- **AI Digital Workforce Papers:** `conductor/publish/00-publishing-plan.md`

---

**Document Version:** 4.0
**Last Updated:** 2026-03-11
**Status:** Production - Reflects Current Implementation

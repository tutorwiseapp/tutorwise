# TutorWise User Journey Map

**Last Updated:** 2026-01-22
**Status:** Production

---

## Overview

Complete journey maps for developers and end-users (Tutors, Students/Clients, Agents) using the platform.

**Key Platform Features:**
- Universal CaaS v6.0 scoring (0-100 credibility score)
- Three-sided marketplace (Tutors, Clients, Agents)
- Real-time collaboration (WiseSpace)
- Free Help Now (immediate tutoring)
- Organisation management (Premium subscriptions)
- Hierarchical referral system

---

## 👨‍💻 Developer Journey

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

## 🎓 Tutor Journey

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
├─ 🎉 Welcome banner: "Onboarding Complete!"
├─ CaaS Score Card: 15/100 🟡 Provisional
│   ├─ "Verify identity for +20% boost"
│   └─> Click → /settings/verification
├─ Quick Actions:
│   ├─ ⭐ Create Listing (primary CTA)
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
└─> Month 6: 84/100 (100 sessions, 4.8★ rating, fully verified)
```

---

## 📚 Client (Student) Journey

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
├─ CaaS Score Card: 21/100 🟡 Provisional
├─ Quick Actions:
│   ├─ ⭐ Find Tutors (primary CTA)
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
│   ├─ Location type (online/in-person)
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
```

### 4. View Tutor Profile

```
LISTING DETAIL → /marketplace/[listingId]
├─ Tutor Overview
│   ├─ CaaS Score: 84/100 ✅ Fully Verified
│   ├─ Rating: 4.8★ (23 reviews)
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
│   ├─ Hourly rate × duration
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

## 🏢 Agent Journey

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
├─ CaaS Score Card: 15/100 🟡 Provisional
├─ Referral Stats
│   ├─ Referrals made: 0
│   ├─ Conversions: 0
│   └─ Commission earned: £0
├─> Quick Actions
    ├─ ⭐ Create Listing (tutor activity)
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

## 🏢 Organisation Journey

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

## 🎯 CaaS Score Journey (All Roles)

### Understanding Your Score

```
CAAS SCORE BREAKDOWN
├─ Total: 75/100
├─ Verification Status: 🟢 Identity Verified (0.85 multiplier)
└─> 6 Buckets:
    ├─ Delivery (40%): 85/100 → 34 weighted pts
    ├─ Credentials (20%): 90/100 → 18 weighted pts
    ├─ Network (15%): 36/100 → 5.4 weighted pts
    ├─ Trust (10%): 70/100 → 7 weighted pts
    ├─ Digital (10%): 80/100 → 8 weighted pts
    └─ Impact (5%): 50/100 → 2.5 weighted pts
    = 74.9 weighted × 0.85 multiplier = 64/100 final
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

## 📱 Navigation Structure

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
        ├─ Settings
        ├─ Help Centre
        └─ Log Out
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

## 🔄 Automatic Triggers & Events

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

## 🔍 Testing Checklist

### Manual Test Flows

**Tutor Journey:**
1. ✅ Sign up → Complete onboarding → See provisional score
2. ✅ Verify identity → Score increases by ~20%
3. ✅ Create listing → Listing published → Score updates (10 min)
4. ✅ Receive booking → Complete session → Score updates
5. ✅ Add recording URL → Score updates (Digital bucket)
6. ✅ Deliver free help → Score updates (Impact bucket, high priority)

**Client Journey:**
1. ✅ Sign up → Complete onboarding → See provisional score (not 0!)
2. ✅ Browse marketplace → View tutor profiles with CaaS scores
3. ✅ Book session → Complete booking → Score updates
4. ✅ Leave review → Tutor score updates
5. ✅ Take free help → Score updates (Impact bucket)

**Agent Journey:**
1. ✅ Sign up → Complete onboarding → See provisional score
2. ✅ Create listing (agent as tutor) → Listing published
3. ✅ Refer tutors → Score updates (Network bucket)
4. ✅ Referral converts → Score updates (Network bucket)
5. ✅ Teach sessions → Score updates (Delivery bucket)

**Organisation Journey:**
1. ✅ Create organisation → Free trial starts
2. ✅ Invite tutors → Members join
3. ✅ View organisation CaaS score (aggregate)
4. ✅ Subscribe (Stripe) → Access premium features

---

## 📚 Related Documentation

- **Architecture:** `.ai/2-PLATFORM-SPECIFICATION.md`
- **Code Navigation:** `.ai/3-SYSTEM-NAVIGATION.md`
- **Coding Patterns:** `.ai/4-PATTERNS.md`
- **CaaS Model:** `docs/feature/caas/caas-model.md`
- **CaaS Triggers:** `docs/feature/caas/CAAS_TRIGGER_OPTIMIZATION_2026.md`
- **CaaS Summary:** `docs/feature/caas/IMPLEMENTATION_SUMMARY.md`
- **Quick Reference:** `.ai/CAAS-V6-UPDATE.md`

---

**Document Version:** 2.0
**Last Updated:** 2026-01-22
**Status:** Production - Reflects Current Implementation

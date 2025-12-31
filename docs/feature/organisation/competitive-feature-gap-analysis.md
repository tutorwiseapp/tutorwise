# COMPETITIVE FEATURE GAP ANALYSIS

## 2\. COMPETITIVE FEATURE GAP ANALYSIS

### TutorCruncher vs TutorWise

| Feature | TutorCruncher | TutorWise | Priority |
| --- | --- | --- | --- |
| **Pricing** | $12/mo + 0.8% revenue | £50/mo flat | ✅ **WIN** |
| Team Management | ✅   | ✅ (v7.0) | ✅   |
| Performance Analytics | ✅   | ✅ (v7.0 - 5 dashboards) | ✅   |
| Scheduling | ✅   | ✅ (existing) | ✅   |
| Payment Processing | ✅   | ✅ (existing) | ✅   |
| **CRM/Sales Pipeline** | ✅ Lead tracking | ❌ **GAP #1** | 🔴 **CRITICAL** |
| **Automated Matching** | ✅ Tutor-student matching | ❌ **GAP #2** | 🟡 **HIGH** |
| **Client Portal** | ✅ Branded portals | ❌ **GAP #3** | 🟡 **HIGH** |
| **Automated Comms** | ✅ Email/SMS reminders | ⚠️ Partial (booking reminders only) | 🟡 **HIGH** |
| **Payroll Management** | ✅   | ❌ **GAP #4** | 🟢 **LOW** |
| **Referral System** | ❌   | ✅ Two-sided (tutor + client) | ✅ **UNIQUE WIN** |
| **White Label** | ✅   | 🚧 Roadmap v9.0 | 🟡 **HIGH** |

### Tutorful (Marketplace - Not Direct Competitor)

- 20% commission model
- Individual tutors only (not agency management)
- TutorWise beats this with £50 flat fee for agencies

* * *

## 3\. CRITICAL FEATURES TO BUILD

**Update Todos**

```
 Analyze naming conventions and provide recommendations
 Research competitor features (TutorCruncher vs Tutorful)
 Create competitive feature roadmap recommendations
 Designing referral-organisation integration
```

### 🔴 **Priority 1: CRM/Sales Pipeline** (2-3 weeks)

**What TutorCruncher has:**

- Lead capture forms
- Pipeline stages: "Inquiry → Trial → Converted → Lost"
- Email follow-ups and task reminders
- Conversion tracking

**What we need:**

```
Organisation Hub → New "Leads" Tab
├── Lead capture: contact_name, email, subject, student_age, notes
├── Status: New → Contacted → Trial Booked → Converted → Lost
├── Assigned to: Team member (auto-match based on subject expertise)
├── Follow-up reminders: "Contact lead in 24h"
└── Conversion funnel: Leads → Trials → Bookings

```

**Database:**

```
CREATE TABLE organisation_leads (
  id UUID PRIMARY KEY,
  organisation_id UUID REFERENCES connection_groups(id),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  student_name TEXT,
  student_age INT,
  subject TEXT[],
  preferred_schedule JSONB,
  status TEXT, -- 'new', 'contacted', 'trial_booked', 'converted', 'lost'
  assigned_member_id UUID REFERENCES profiles(id),
  source TEXT, -- 'website', 'referral', 'social', 'embed'
  notes TEXT,
  created_at TIMESTAMP,
  contacted_at TIMESTAMP,
  converted_at TIMESTAMP
);

```

**Why critical:** Agencies live and die by lead conversion. Without this, they can't track ROI on marketing.

* * *

### 🟡 **Priority 2: Automated Tutor-Student Matching** (1-2 weeks)

**What TutorCruncher has:**

- Algorithm matches students to tutors based on:
  - Subject expertise
  - Availability overlap
  - Location/timezone
  - Student preferences (learning style, goals)

**What we need:**

```
When new lead arrives → Auto-suggest best team member
├── Match criteria:
│   ├── subjects_taught (from profile metadata)
│   ├── availability (from calendar)
│   ├── rating_avg (prefer high-rated tutors)
│   ├── active_students_count (load balance)
│   └── past_success_rate (subject-specific conversion)
└── Suggest top 3 matches with confidence score

```

**Implementation:**

```
-- Add to organisation performance
CREATE FUNCTION match_tutor_to_lead(
  p_organisation_id UUID,
  p_subject TEXT,
  p_preferred_times JSONB
) RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  match_score NUMERIC,
  availability_slots JSONB
);

```

**Why high priority:** Reduces manual assignment work. Increases conversion by matching best-fit tutor.

* * *

### 🟡 **Priority 3: Organisation-Branded Client Portal** (2 weeks)

**What TutorCruncher has:**

- Clients log into agency-branded portal
- See their bookings, invoices, tutor messages
- Request new sessions
- White-labeled experience

**What we need:**

```
Public route: /org/[slug]/portal
├── Client login (via existing auth)
├── Shows only bookings with THIS organisation's tutors
├── Organisation branding (logo, colors from org settings)
├── Book new session with available team members
└── Messages with assigned tutor

```

**Why high priority:** Professional agencies need branded client experience. Currently clients see "TutorWise" branding, not agency branding.

* * *

## 4\. REFERRAL INTEGRATION STRATEGY 🚀

### This is Your SECRET WEAPON

**Current state:**

- Referrals exist at **individual level** (agent refers → gets commission)
- **No connection to organisations**
- Huge missed opportunity!

### **Phase 1: Organisation Referral Attribution** (Week 1)

**Database changes:**

```
-- Link referrals to organisations
ALTER TABLE referrals 
ADD COLUMN organisation_id UUID REFERENCES connection_groups(id),
ADD COLUMN referral_context TEXT; -- 'personal' | 'organisation' | 'team_member'

-- Track organisation-level referral performance
CREATE FUNCTION get_organisation_referral_stats(p_org_id UUID)
RETURNS TABLE (
  total_referrals INT,
  tutor_referrals INT,
  client_referrals INT,
  converted_tutors INT,
  converted_clients INT,
  total_commission NUMERIC,
  avg_conversion_time INTERVAL,
  top_referrer_member_id UUID
);

```

**UI changes:**

```
Organisation Hub → Performance Tab → New "Referrals" Sub-tab
├── Referral Pipeline (org-level view)
│   ├── Referred Tutors: [Pipeline stages]
│   ├── Referred Clients: [Pipeline stages]
│   └── Conversion rates vs platform average
├── Team Member Leaderboard
│   ├── Top referrers (by member)
│   └── Commission earned per member
└── Referral Sources Breakdown
    └── Direct Link | QR Code | Embed | Social Share

```

* * *

### **Phase 2: Team Member Referral Delegation** (Week 2)

**The Innovation:** Let team members refer on behalf of the organisation with commission split.

**New referral flow:**

```
1. Team member gets unique org-branded referral link:
   tutorwise.com/join?ref=MEMBER_CODE&org=my-agency

2. Referred user sees:
   "Join [Agency Name] - Referred by Sarah (Team Member)"
   
3. Commission split (configurable):
   Standard: 10% to individual referrer
   Organisation split: 5% to member + 5% to org owner
   
4. Both member AND org owner track the referral

```

**Database:**

```
-- Track who initiated referral within org context
ALTER TABLE referrals
ADD COLUMN initiating_member_id UUID REFERENCES profiles(id),
ADD COLUMN commission_split JSONB; -- {"member": 5, "org_owner": 5}

-- Organisation referral settings
CREATE TABLE organisation_referral_settings (
  organisation_id UUID PRIMARY KEY,
  enable_team_referrals BOOLEAN DEFAULT true,
  member_commission_rate NUMERIC DEFAULT 5.0, -- % for member
  owner_commission_rate NUMERIC DEFAULT 5.0,  -- % for owner
  require_approval BOOLEAN DEFAULT false -- Owner approves team referrals?
);

```

**Why powerful:**

- Incentivizes team members to grow the agency
- Org owner gets passive referral income from team activity
- Creates viral growth loop within organisations

* * *

### **Phase 3: Organisation Referral Landing Page** (Week 3)

**Public route:** `/org/[slug]/join`

**Features:**

```
Organisation-branded referral page:
├── Hero: "[Agency Name] is growing! Join our team"
├── Organisation stats (if public):
│   ├── "20 expert tutors"
│   ├── "500+ students taught"
│   └── "4.9★ average rating"
├── Benefits of joining:
│   ├── "Get consistent bookings through our client base"
│   ├── "10% commission on all referrals you bring"
│   └── "Professional development & team support"
├── Testimonials from existing team members
└── CTA: "Join [Agency] as a Tutor" or "Book a Session"

```

**Two-way referral:**

- **For tutors:** "Join our teaching team"
- **For clients:** "Book with our expert tutors"

**Tracking:**

```
-- Track landing page performance
CREATE TABLE organisation_referral_page_views (
  id UUID PRIMARY KEY,
  organisation_id UUID,
  referral_source TEXT, -- QR code, direct link, social share
  visitor_location JSONB, -- IP geolocation
  converted BOOLEAN,
  converted_as TEXT, -- 'tutor' | 'client'
  created_at TIMESTAMP
);

```

* * *

### **Phase 4: Gamification & Incentives** (Week 4)

**Organisation Referral Challenges:**

```
Create org-level referral campaigns:
├── "Refer 5 Tutors This Month → Unlock Premium Feature"
├── "Team Referral Race" → Leaderboard with prizes
├── "Client Acquisition Goal" → 50 new clients = bonus payout
└── Achievement badges for top referrers

```

**Database:**

```
CREATE TABLE organisation_referral_campaigns (
  id UUID PRIMARY KEY,
  organisation_id UUID,
  campaign_name TEXT, -- "Summer Growth Challenge"
  campaign_type TEXT, -- 'tutor_referral' | 'client_referral' | 'revenue'
  target_metric NUMERIC, -- e.g., 10 tutors
  reward_type TEXT, -- 'cash_bonus' | 'feature_unlock' | 'badge'
  reward_value JSONB,
  start_date DATE,
  end_date DATE,
  active BOOLEAN
);

CREATE TABLE organisation_referral_achievements (
  id UUID PRIMARY KEY,
  organisation_id UUID,
  member_id UUID,
  achievement_type TEXT, -- 'first_referral', '10_referrals', 'top_referrer_month'
  earned_at TIMESTAMP,
  metadata JSONB
);

```

**Why this matters:**

- Gamification drives behavior (proven by Dropbox, Uber, Airbnb referral success)
- Agencies can run growth campaigns with their team
- Creates competitive team culture

* * *

## 5\. REFERRAL-POWERED COMPETITIVE ADVANTAGES

### **What No Competitor Has:**

| Feature | TutorCruncher | TutorWise (with referral integration) |
| --- | --- | --- |
| Team member referral tracking | ❌   | ✅ Per-member referral stats |
| Commission sharing | ❌   | ✅ Configurable member/owner split |
| Organisation referral landing page | ❌   | ✅ Branded public referral page |
| Client referral monetization | ❌   | ✅ 5% commission on client referrals |
| Referral campaign management | ❌   | ✅ Gamification & challenges |
| Two-sided referral marketplace | ❌   | ✅ Tutor + Client referrals |

### **Your Pitch to Agencies:**

> ***"TutorCruncher charges 0.8% of all revenue. We charge £50/month AND help you grow revenue through our built-in referral engine."***
> 
> ***Example:***
> 
> - *Agency revenue: £50,000/month*
> - *TutorCruncher cost: £12 + £400 (0.8%) = **£412/month***
> - *TutorWise cost: **£50/month***
> - ***Savings: £362/month = £4,344/year***
> 
> ***PLUS with referral system:***
> 
> - *Each team member refers 2 tutors/year → 40 new tutors (20-person team)*
> - *Organisation owner earns 5% commission on all their bookings*
> - *Client referrals: Each tutor refers 1 client → 60 new clients/year*
> - ***Estimated referral revenue: £15,000+/year***
> 
> ***Net benefit: £19,344/year vs TutorCruncher** 🚀*

* * *

## 6\. IMPLEMENTATION ROADMAP

**Update Todos**

```
 Analyze naming conventions and provide recommendations
 Research competitor features (TutorCruncher vs Tutorful)
 Create competitive feature roadmap recommendations
 Design referral-organisation integration strategy
```

### **8-Week Sprint to Beat TutorCruncher**

**Weeks 1-2: Referral-Organisation Integration (Foundation)**

```
✓ Add organisation_id to referrals table
✓ Create get_organisation_referral_stats() RPC
✓ Add "Referrals" tab to Organisation Performance
✓ Team member referral leaderboard
✓ Commission split configuration

```

**Weeks 3-4: CRM/Sales Pipeline (Critical Gap)**

```
✓ Create organisation_leads table
✓ Lead capture form (embeddable widget for agency websites)
✓ Pipeline stages UI (Kanban board)
✓ Auto-assignment to team members
✓ Follow-up task reminders

```

**Weeks 5-6: Organisation Referral Landing Page (Viral Growth)**

```
✓ Public /org/[slug]/join route
✓ Organisation stats showcase
✓ Two-way referral (tutor + client CTAs)
✓ QR code generation for offline promotion
✓ Social share buttons with pre-filled text

```

**Weeks 7-8: Automated Matching + Client Portal**

```
✓ Tutor-student matching algorithm
✓ Organisation-branded client portal (/org/[slug]/portal)
✓ Client login & booking history
✓ Direct messaging with assigned tutor

```

**Week 9+: Polish & Gamification**

```
✓ Referral campaigns & challenges
✓ Achievement badges
✓ Email automation for lead nurturing
✓ White-label domain support (v9.0 prep)

```

* * *

## 7\. DECISION POINTS

### **Should we start with referral integration or CRM first?**

**My recommendation: Referral integration first (Weeks 1-2)**

**Why:**

1. **Unique differentiator** - CRM is table stakes, referral integration is your moat
2. **Faster to build** - Leverage existing referral infrastructure
3. **Immediate value** - Agencies can start growing their team with referrals DAY 1
4. **Network effects** - More agencies → more referrals → more growth
5. **Marketing story** - "Only tutoring platform with built-in referral engine for agencies"

**Then CRM (Weeks 3-4)** to close the table-stakes gap.

* * *

## 8\. QUICK WINS (Next 3 Days)

Want me to start building? Here's what I can ship immediately:

**Day 1: Database Foundation**

- Add `organisation_id`, `referral_context`, `initiating_member_id` to `referrals` table
- Create `organisation_referral_settings` table
- Create `get_organisation_referral_stats()` RPC function

**Day 2: Performance Tab Update**

- Add "Referrals" sub-tab to Organisation Performance page
- Display org-level referral pipeline (using existing referral data, filtered by org)
- Team member referral leaderboard

**Day 3: Commission Split Logic**

- Update referral commission calculation to support member/owner split
- Add settings UI to configure commission rates
- Test with existing referral data

**Result:** Agencies can immediately see which team members are referring, track org-level referral performance, and configure commission sharing. 🚀

* * *

## SUMMARY

✅ **Naming:** Keep "Team Members" - it's correct

🔴 **Critical Gap:** CRM/Sales Pipeline (TutorCruncher has it, we don't)

🟡 **High Priority:** Automated matching, Client portal, White-label (v9.0)

🚀 **Secret Weapon:** Referral-Organisation Integration

- No competitor has this
- Turns every team member into a growth driver
- Creates viral loop: Agencies → Referrals → More tutors → More agencies

💰 **Value Prop:**

- **£362/month savings** vs TutorCruncher
- **+£15,000/year referral revenue** from built-in engine
- **\= £19,344/year net benefit**

* * *

**Want me to start building the referral-organisation integration now?** I can have the database foundation + basic UI ready in 3 days.

* * *

**Sources:**

- [TutorCruncher Features](https://tutorcruncher.com/)
- [TutorCruncher Pricing on Capterra](https://www.capterra.com/p/145838/TutorCruncher/)
- [Tutorful Overview](https://tutorful.co.uk/)
- [Top CRMs for Tutoring Businesses 2025](https://www.wise.live/blog/top-crms-for-tutoring-businesses/)
- [Best Tutor Management Software 2025](https://www.wise.live/blog/tutor-management-software-for-large-businesses/)
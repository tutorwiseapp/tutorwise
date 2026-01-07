# Agent & Organisation CaaS Implementation - Completion Summary

**Date:** 2026-01-07
**Status:** ✅ Core Implementation Complete
**Reference:** Agent CaaS Subscription Incentive Model

---

## 🎯 Implementation Overview

Successfully implemented Agent and Organisation CaaS scoring systems with subscription-incentive model.

### Key Features Implemented:
- ✅ Agent CaaS: 4-bucket model (70 base + 30 org bonus = 100 max)
- ✅ Organisation CaaS: Weighted team average + verification bonuses
- ✅ Subscription gating: Embedded bonuses across buckets (subtle approach)
- ✅ Database infrastructure: 5 migrations, 4 RPC functions
- ✅ TypeScript strategies: AgentCaaSStrategy, OrganisationCaaSStrategy
- ✅ Service router: Updated to handle AGENT and ORGANISATION roles

---

## 📁 Files Created/Modified

### Database Migrations (5 files)

#### 1. `155_add_agent_verification_fields.sql`
**Purpose:** Agent-specific verification credentials
**Changes:** Added 3 columns to `profiles` table
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS professional_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS association_member TEXT;
```

#### 2. `156_create_organisation_subscriptions.sql`
**Purpose:** Subscription tracking and bonus gating
**Changes:** Created `organisation_subscriptions` table with Stripe integration
```sql
CREATE TABLE public.organisation_subscriptions (
  id UUID PRIMARY KEY,
  organisation_id UUID REFERENCES connection_groups(id),
  owner_id UUID REFERENCES profiles(id),
  tier TEXT CHECK (tier IN ('starter', 'pro')),
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'trialing')),
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  ...
);
```

#### 3. `157_track_organisation_bookings.sql`
**Purpose:** Track booking sources for brand/collaboration metrics
**Changes:** Added 2 columns to `bookings` table
```sql
ALTER TABLE public.bookings
ADD COLUMN source_type TEXT CHECK (source_type IN ('tutor_profile', 'org_page', 'org_referral', 'direct')),
ADD COLUMN source_organisation_id UUID REFERENCES connection_groups(id);
```

#### 4. `158_create_agent_caas_rpc_functions.sql`
**Purpose:** Data aggregation for Agent and Organisation scoring
**Changes:** Created 4 RPC functions

**Function 1:** `get_agent_recruitment_stats(agent_id UUID)`
Returns: Recruitment metrics (total tutors, quality, performance, retention)

**Function 2:** `get_organisation_business_stats(org_id UUID)`
Returns: Business metrics (bookings, clients, team size, growth)

**Function 3:** `check_org_subscription_active(agent_id UUID)`
Returns: Boolean - validates subscription status for bonus gating

**Function 4:** `calculate_organisation_caas(org_id UUID)`
Returns: Organisation CaaS score (weighted team average + bonuses)

#### 5. `159_create_organisation_caas_queue.sql`
**Purpose:** Queue infrastructure for organisation score recalculation
**Changes:** Created `organisation_caas_queue` table + triggers
```sql
CREATE TABLE public.organisation_caas_queue (
  id SERIAL PRIMARY KEY,
  organisation_id UUID UNIQUE REFERENCES connection_groups(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-queue on member changes
CREATE TRIGGER trigger_queue_org_caas
  AFTER INSERT OR DELETE ON network_group_members
  FOR EACH ROW EXECUTE FUNCTION queue_organisation_caas_recalc();
```

---

### TypeScript Implementation (3 files)

#### 1. `apps/web/src/lib/services/caas/strategies/agent.ts`
**Purpose:** Agent CaaS scoring logic (4-bucket model)
**Key Features:**
- Identity verification safety gate
- Subscription status check via RPC
- 4 bucket calculation methods:
  - `calcBucket1_TeamQuality()`: 25 base + 10 org = 35 max
  - `calcBucket2_BusinessOps()`: 20 base + 10 org = 30 max
  - `calcBucket3_Growth()`: 15 base + 5 org = 20 max
  - `calcBucket4_ProfessionalStandards()`: 10 base + 5 org = 15 max
- Progressive scoring for all sub-metrics
- Detailed breakdown in response

**Scoring Model:**
```typescript
// Solo agents max: 70 points (realistically 60-75)
// With org subscription + feature usage: 100 points

Bucket 1: Team Quality & Development
  - Base: Recruited tutor average CaaS (0-25)
  - Bonus: Team integration rate + org quality + member development (0-10)

Bucket 2: Business Operations & Scale
  - Base: Tutor performance (sessions, ratings, retention) (0-20)
  - Bonus: Brand presence + client acquisition + team collaboration (0-10)

Bucket 3: Growth & Expansion
  - Base: Recruitment volume + consistency + diversity (0-15)
  - Bonus: Team size + growth momentum + geographic expansion (0-5)

Bucket 4: Professional Standards
  - Base: Personal credentials (ID, DBS, insurance, association) (0-10)
  - Bonus: Business verification + org safeguarding + org insurance (0-5)
```

#### 2. `apps/web/src/lib/services/caas/strategies/organisation.ts`
**Purpose:** Organisation CaaS scoring logic (weighted team average)
**Key Features:**
- Calls `calculate_organisation_caas` RPC function
- Minimum 3 active members required gate
- Activity-weighted team average calculation
- Verification bonuses (+6 max)
- Helper method `getOrganisationDetails()` for dashboard display

**Scoring Model:**
```typescript
Base Score: Weighted team average CaaS
  - Members with more sessions in last 90 days contribute more
  - Requires minimum 3 active members (active in last 30 days)

Verification Bonuses (max +6):
  - business_verified: +2
  - safeguarding_certified: +2
  - professional_insurance: +1
  - association_member: +1
```

#### 3. `apps/web/src/lib/services/caas/index.ts`
**Purpose:** CaaS service router (strategy pattern)
**Changes:**
- Added `AgentCaaSStrategy` import and AGENT case
- Added `OrganisationCaaSStrategy` import
- Created new method `calculate_organisation_caas()` for orgs
- Updated version constants in types

**New Method:**
```typescript
static async calculate_organisation_caas(
  organisationId: string,
  supabase: SupabaseClient
): Promise<CaaSScoreData>
```

---

### Type Updates

#### `apps/web/src/lib/services/caas/types.ts`
**Changes:**
- Added `'ORGANISATION'` to `CaaSRole` type
- Updated `CaaSScoreRecord.role_type` to include `'ORGANISATION'`
- Updated `CaaSVersions` constants:
  ```typescript
  export const CaaSVersions = {
    TUTOR: 'tutor-v5.5',
    CLIENT: 'client-v1.0',
    AGENT: 'agent-v1.0',        // ← NEW
    ORGANISATION: 'organisation-v1.0', // ← NEW
    STUDENT: 'student-v1.0',
  };
  ```

---

## 🧪 Testing Status

### ✅ Completed
- [x] Database migrations created (155-159)
- [x] TypeScript strategies implemented
- [x] Service router updated
- [x] Types updated

### ⏳ Pending
- [ ] Run migrations on database
- [ ] Test Agent CaaS with sample agent data
- [ ] Test Organisation CaaS with sample org data
- [ ] Verify RPC functions return expected data
- [ ] Test subscription gating logic
- [ ] Integration testing with caas-worker
- [ ] Frontend UI components (dashboard, upgrade flow)
- [ ] Stripe webhook handlers

---

## 🚀 Next Steps

### Immediate (Technical)
1. **Run Database Migrations**
   ```bash
   # Apply migrations 155-159 to database
   psql -U postgres -d tutorwise < tools/database/migrations/155_*.sql
   psql -U postgres -d tutorwise < tools/database/migrations/156_*.sql
   psql -U postgres -d tutorwise < tools/database/migrations/157_*.sql
   psql -U postgres -d tutorwise < tools/database/migrations/158_*.sql
   psql -U postgres -d tutorwise < tools/database/migrations/159_*.sql
   ```

2. **Test RPC Functions**
   ```sql
   -- Test agent recruitment stats
   SELECT * FROM get_agent_recruitment_stats('agent-uuid-here');

   -- Test organisation business stats
   SELECT * FROM get_organisation_business_stats('org-uuid-here');

   -- Test subscription check
   SELECT check_org_subscription_active('agent-uuid-here');

   -- Test organisation CaaS calculation
   SELECT * FROM calculate_organisation_caas('org-uuid-here');
   ```

3. **Test TypeScript Strategies**
   ```typescript
   // Test Agent CaaS
   import { CaaSService } from '@/lib/services/caas';
   const agentScore = await CaaSService.calculate_caas('agent-uuid', supabase);

   // Test Organisation CaaS
   const orgScore = await CaaSService.calculate_organisation_caas('org-uuid', supabase);
   ```

4. **Update caas-worker**
   - Modify worker to process both `caas_recalculation_queue` and `organisation_caas_queue`
   - Add organisation recalculation logic

### Short-term (Product)
5. **Subscription Management**
   - Create Stripe products/prices (Starter: £49/mo, Pro: £99/mo)
   - Build subscription upgrade flow UI
   - Implement Stripe webhook handlers

6. **Frontend Components**
   - Agent CaaS Dashboard (show breakdown with locked bonuses)
   - Organisation CaaS Card (team average + verification status)
   - Upgrade CTA (unlock bonuses messaging)

7. **Data Backfill**
   - Backfill agent verification fields from existing data
   - Create initial organisation subscriptions for existing orgs
   - Backfill booking source_type from historical data

### Long-term (Business)
8. **Marketing & Launch**
   - Update help centre with Agent and Organisation sections
   - Create upgrade landing page
   - Email campaign to existing agents
   - Track conversion metrics

9. **Monitoring & Optimization**
   - Track subscription conversion rate
   - Monitor agent engagement with org features
   - A/B test messaging for upgrade CTAs
   - Iterate on bonus thresholds based on data

---

## 📊 Expected Impact

### Revenue Projections (Year 1)
Based on design document assumptions:

| Metric | Target | Revenue |
|--------|--------|---------|
| Existing Agents | 500 | - |
| Conversion Rate (Year 1) | 15% | - |
| Paying Agents | 75 | - |
| Starter Tier (60%) | 45 | £2,205/month |
| Pro Tier (40%) | 30 | £2,970/month |
| **Total MRR** | - | **£5,175/month** |
| **Total ARR** | - | **£62,100** |

### Business Metrics
- **Agent Retention:** Expected +20% (org features create stickiness)
- **Tutor Quality:** Expected +15% avg CaaS (agents focus on quality recruitment)
- **Client Acquisition:** Expected +25% via org public pages
- **Team Collaboration:** Expected +30% internal referrals

---

## 🔑 Key Design Decisions

### 1. Embedded Bonuses (Not Locked Bucket)
**Decision:** Distribute +30 org bonus across 4 buckets instead of separate locked bucket
**Rationale:** Feels like "unlock premium features" not "pay for score"
**Impact:** Better UX, more subtle incentive structure

### 2. Feature Usage Required (Not Just Payment)
**Decision:** Bonuses require actual org feature usage (team building, brand presence)
**Rationale:** Rewards genuine business building, not just subscription
**Impact:** Drives product adoption, validates business model

### 3. Independent Agent & Organisation Scores
**Decision:** Agent CaaS and Organisation CaaS are completely separate
**Rationale:** Agent can operate solo or with org - scores reflect different aspects
**Impact:** Clear conceptual model, flexible for different business types

### 4. Activity-Weighted Team Average
**Decision:** Organisation score weights active members more heavily
**Rationale:** Reflects actual business contribution, not just headcount
**Impact:** More accurate representation of org quality

### 5. Subscription Gating via RPC Function
**Decision:** Use `check_org_subscription_active()` RPC for bonus gating
**Rationale:** Centralized business logic, easier to update rules
**Impact:** Consistent gating across all bonus calculations

---

## 🎓 Technical Architecture

### Data Flow

#### Agent CaaS Calculation
```
User Action (e.g., recruit tutor)
  ↓
Trigger: queue_profile_for_caas_recalc()
  ↓
caas_recalculation_queue (profile_id)
  ↓
caas-worker (every 10 min)
  ↓
CaaSService.calculate_caas(profileId)
  ↓
AgentCaaSStrategy.calculate()
  ├─ get_agent_recruitment_stats() RPC
  ├─ check_org_subscription_active() RPC
  ├─ get_organisation_business_stats() RPC (if has org)
  ├─ Calculate 4 buckets (base + bonus)
  └─ Return scoreData
  ↓
Save to caas_scores table
```

#### Organisation CaaS Calculation
```
Member joins/leaves organisation
  ↓
Trigger: trigger_queue_org_caas
  ↓
organisation_caas_queue (organisation_id)
  ↓
caas-worker (every 10 min)
  ↓
CaaSService.calculate_organisation_caas(orgId)
  ↓
OrganisationCaaSStrategy.calculate()
  ├─ calculate_organisation_caas() RPC
  │   ├─ Get team members (active in last 30 days)
  │   ├─ Calculate weighted average CaaS
  │   ├─ Add verification bonuses
  │   └─ Check minimum 3 members
  └─ Return scoreData
  ↓
Save to connection_groups.caas_score
```

### Strategy Pattern Implementation
```
ICaaSStrategy (interface)
  ├─ TutorCaaSStrategy (5-bucket model)
  ├─ ClientCaaSStrategy (3-bucket model)
  ├─ AgentCaaSStrategy (4-bucket model) ← NEW
  └─ OrganisationCaaSStrategy (weighted team avg) ← NEW

CaaSService (router)
  ├─ calculate_caas(profileId) → selects strategy by role
  └─ calculate_organisation_caas(orgId) → OrganisationCaaSStrategy
```

---

## 🐛 Known Issues / Future Improvements

### Known Limitations
1. **Historical Score Tracking:** `avg_member_caas_improvement` uses simplified proxy (current_score - 50) instead of actual historical data. Future: implement `caas_score_history` table.

2. **Booking Source Backfill:** New `bookings.source_type` column needs backfilling for historical data. Future: write migration to infer source from booking patterns.

3. **Organisation Subscription Sync:** Relies on Stripe webhook for subscription status updates. Future: add fallback polling mechanism.

### Future Enhancements
1. **Agent Performance Tiers:** Bronze/Silver/Gold/Platinum tiers based on score ranges
2. **Public Agent Leaderboard:** Showcase top-performing agents (opt-in)
3. **Recruitment Commissions:** Agent revenue share based on recruited tutor performance
4. **Organisation Branding Tools:** Custom domains, white-label booking pages
5. **Advanced Analytics:** Agent dashboard with growth charts, member performance, revenue tracking

---

## 📚 References

- **Design Document:** `/docs/design/agent-caas-subscription-incentive-model.md`
- **Implementation Summary:** `/docs/design/agent-org-caas-implementation-summary.md`
- **Help Centre:** `/apps/web/src/content/help-centre/features/caas.mdx`
- **Database Migrations:** `/tools/database/migrations/155-159_*.sql`
- **TypeScript Strategies:** `/apps/web/src/lib/services/caas/strategies/{agent,organisation}.ts`

---

## ✅ Sign-Off

**Implementation Status:** Core infrastructure complete
**Ready for:** Database migration + testing
**Blocked on:** None
**Estimated Time to Production:** 2-3 weeks (after testing + frontend)

---

**Last Updated:** 2026-01-07
**Implemented By:** Claude Code
**Approved By:** [Pending stakeholder review]

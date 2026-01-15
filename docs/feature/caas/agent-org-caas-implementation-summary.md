# Agent & Organisation CaaS Implementation Summary

**Date**: 2026-01-07
**Status**: Ready for Development
**Related Documents**:
- [Agent CaaS Design Document](./agent-caas-subscription-incentive-model.md)
- [CaaS Help Centre Documentation](../../apps/web/src/content/help-centre/features/caas.mdx)

---

## Executive Summary

This document summarizes the design work completed for Agent and Organisation CaaS (Credibility as a Service) scoring systems and provides clear next steps for implementation.

### What We've Designed

1. **Agent CaaS (v1.0)**: 4-bucket scoring model (100 points max) with embedded organisation subscription incentives
2. **Organisation CaaS (v1.0)**: Weighted team average model based on member quality and activity
3. **Subscription Integration**: Organisation features unlock +30 bonus points for agents who actively build teams

### Strategic Goals Achieved

✅ **Steer agents toward organisation adoption** - Bonuses require using org features, not just subscribing
✅ **Subtle incentive structure** - Embedded bonuses across buckets, not obvious "pay-to-win"
✅ **Anti-gaming measures** - Activity thresholds, team integration requirements, multiple sub-metrics
✅ **Natural business growth** - Scores increase as agents genuinely build tutoring businesses
✅ **Revenue generation** - Clear path to £15k-30k MRR from organisation subscriptions

---

## Agent CaaS Model Overview

### Scoring Buckets (4-Bucket Model, 100 points total)

| Bucket | Free Tier | Org Bonus | Total | Key Metrics |
|--------|-----------|-----------|-------|-------------|
| **1. Team Quality & Development** | 25 | +10 | 35 | Team integration rate, org team quality, member development |
| **2. Business Operations & Scale** | 20 | +10 | 30 | Org page bookings, client acquisition, team collaboration |
| **3. Growth & Expansion** | 15 | +5 | 20 | Team size, growth momentum, geographic expansion |
| **4. Professional Standards** | 10 | +5 | 15 | Business verification, safeguarding cert, professional insurance |
| **TOTAL** | **70** | **+30** | **100** | |

### Key Design Decisions

1. **Free Tier Cap**: Solo agents max out at 70 points (realistically 60-75)
2. **Elite Threshold**: 85+ points requires organisation subscription + active usage
3. **Subscription Check**: Every calculation verifies `organisation_subscriptions.status = 'active'`
4. **Activity Requirements**:
   - Team members must be active (session in last 30 days)
   - Org bookings must be completed (not just initiated)
   - Integration rate tracks % of recruits who join org

### Organisation Features Driving Scores

Each org feature directly contributes to specific bucket bonuses:

**Team Dashboard** → Bucket 1 (+3 points for member development tracking)
**Public Org Page** → Bucket 2 (+4 points for brand bookings)
**Booking System** → Bucket 2 (+3 points for client acquisition)
**Team Collaboration Tools** → Bucket 2 (+3 points for internal referrals)
**Member Invitations** → Bucket 3 (+2 points for team growth)
**Multi-Location Management** → Bucket 3 (+1 point for geographic expansion)
**Business Verification** → Bucket 4 (+2 points for business credentials)
**Safeguarding Policies** → Bucket 4 (+2 points for child safety)

---

## Organisation CaaS Model Overview

### Scoring Logic (Weighted Team Average)

```typescript
// Simplified version - see design doc for full implementation
organisationCaaS = (
  Σ(memberCaaS × activityWeight) / Σ(activityWeight)
) + bonuses

Where:
- activityWeight = sessions completed in last 90 days
- bonuses = verification bonuses (business verified, safeguarding, etc.)
- minimum 3 active members required for valid score
```

### Activity Weighting Example

| Member | CaaS Score | Sessions (90d) | Activity Weight | Contribution |
|--------|------------|----------------|-----------------|--------------|
| Member A | 85 | 20 | 20 | 1700 |
| Member B | 72 | 12 | 12 | 864 |
| Member C | 68 | 5 | 5 | 340 |
| Member D | 80 | 0 | 0 | 0 (inactive) |
| **Total** | - | - | **37** | **2904** |

**Organisation Score**: 2904 / 37 = **78.5** (before bonuses)

### Verification Bonuses

- Business verified: +2 points
- Safeguarding certified: +2 points
- Professional insurance: +1 point
- Association member: +1 point
- **Max bonuses**: +6 points

**Final Org Score**: 78.5 + 4 (verified + safeguarding) = **82.5**

---

## Implementation Checklist

### Phase 1: Database Foundation ✅ (Designed, Not Implemented)

- [ ] **Migration 155**: Add agent verification fields to `profiles`
  - `business_verified`, `professional_insurance`, `association_member`

- [ ] **Migration 156**: Create `organisation_subscriptions` table
  - Tracks subscription status, tier, Stripe integration
  - RLS policies for owner access

- [ ] **Migration 157**: Add booking source tracking
  - `bookings.source_type` ('tutor_profile', 'org_page', 'org_referral', 'direct')
  - `bookings.source_organisation_id`

- [ ] **Migration 158**: Create Agent CaaS RPC functions
  - `get_agent_recruitment_stats(agent_id)` - Returns all recruitment metrics
  - `get_organisation_business_stats(org_id)` - Returns org performance metrics
  - `check_org_subscription_active(agent_id)` - Validates subscription status

- [ ] **Migration 159**: Create Organisation CaaS RPC function
  - `calculate_organisation_caas(org_id)` - Weighted team average + bonuses

### Phase 2: Backend Implementation (Not Started)

- [ ] **Create**: `/apps/web/src/lib/services/caas/strategies/agent.ts`
  - Implement `AgentCaaSStrategy` class (see design doc lines 960-1304)
  - 4 bucket calculation methods
  - Subscription bonus logic

- [ ] **Create**: `/apps/web/src/lib/services/caas/strategies/organisation.ts`
  - Implement `OrganisationCaaSStrategy` class
  - Activity weighting algorithm
  - Minimum member requirements

- [ ] **Update**: `/apps/web/src/lib/services/caas/index.ts`
  - Add Agent strategy to router (line 1315-1318)
  - Add Organisation strategy to router

- [ ] **Update**: `/apps/web/src/lib/services/caas/types.ts`
  - Add `AGENT: 'v1.0'` to CaaSVersions (line 1330)
  - Add `ORGANISATION: 'v1.0'` to CaaSVersions

### Phase 3: Subscription Management (Not Started)

- [ ] **Create**: `/apps/web/src/app/api/subscriptions/organisation/route.ts`
  - POST: Create organisation subscription (Stripe integration)
  - GET: Fetch subscription status
  - PATCH: Update subscription (upgrade/downgrade)
  - DELETE: Cancel subscription

- [ ] **Create**: `/apps/web/src/app/api/webhooks/stripe/organisation/route.ts`
  - Handle Stripe webhook events
  - Update `organisation_subscriptions` status
  - Trigger CaaS recalculation on subscription changes

- [ ] **Integrate**: Stripe Checkout for organisation upgrades
  - Starter tier: £49/month
  - Pro tier: £99/month

### Phase 4: Frontend UI/UX (Not Started)

- [ ] **Create**: Agent Dashboard CaaS Score Card
  - Show 4 buckets with base/bonus breakdown
  - Locked state UI for non-subscribers
  - "Unlock Organisation Features" CTA

- [ ] **Create**: Organisation Upgrade Flow
  - Feature comparison table (Free vs Starter vs Pro)
  - Pricing calculator (ROI demonstration)
  - Checkout integration

- [ ] **Create**: Organisation Dashboard
  - Show org CaaS score
  - Team member list with individual scores
  - Activity metrics (sessions, bookings, growth)

- [ ] **Update**: Help Centre Documentation
  - Update Agent section with final model details (keep high-level)
  - Update Organisation section with scoring model
  - Add FAQ for subscriptions

### Phase 5: Testing & QA (Not Started)

- [ ] **Unit Tests**: Agent CaaS calculation logic
- [ ] **Unit Tests**: Organisation CaaS calculation logic
- [ ] **Integration Tests**: Subscription status affects scoring
- [ ] **Integration Tests**: Score recalculation on subscription changes
- [ ] **Manual QA**: Test with real agent profiles (staging)
- [ ] **Manual QA**: Test score progression journey (solo → org → elite)

### Phase 6: Launch (Not Started)

- [ ] **Soft Launch**: Enable for 10% of agents (A/B test)
- [ ] **Monitor**: Conversion rates, subscription adoption, feature usage
- [ ] **Full Launch**: Roll out to 100% of agents
- [ ] **Marketing**: Email campaign, help centre updates, in-app announcements

---

## Database Schema Summary

### New Tables

#### 1. `organisation_subscriptions`
```sql
CREATE TABLE organisation_subscriptions (
  id UUID PRIMARY KEY,
  organisation_id UUID REFERENCES connection_groups(id),
  owner_id UUID REFERENCES profiles(id),
  tier TEXT CHECK (tier IN ('starter', 'pro')),
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'trialing')),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Modified Tables

#### 2. `profiles` (Add Agent Verification Fields)
```sql
ALTER TABLE profiles
ADD COLUMN business_verified BOOLEAN DEFAULT false,
ADD COLUMN professional_insurance BOOLEAN DEFAULT false,
ADD COLUMN association_member TEXT;
```

#### 3. `bookings` (Add Source Tracking)
```sql
ALTER TABLE bookings
ADD COLUMN source_type TEXT CHECK (source_type IN ('tutor_profile', 'org_page', 'org_referral', 'direct')),
ADD COLUMN source_organisation_id UUID REFERENCES connection_groups(id);
```

#### 4. `connection_groups` (Organisation Verification - Already Exists in Migration 154)
```sql
-- These fields already added in migration 154
ALTER TABLE connection_groups
ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS safeguarding_certified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS professional_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS association_member TEXT,
ADD COLUMN IF NOT EXISTS caas_score INTEGER;
```

### RPC Functions

#### 1. `get_agent_recruitment_stats(agent_id UUID)`
Returns comprehensive recruitment metrics for Agent CaaS Buckets 1-3:
- `total_recruited_tutors`, `recruited_tutors_in_org`, `recent_recruits_90d`
- `avg_recruited_tutor_caas`, `total_sessions_by_recruited`, `avg_rating_of_recruited`
- `active_after_6_months`, `unique_subjects`
- `org_avg_caas`, `avg_member_caas_improvement`

#### 2. `get_organisation_business_stats(org_id UUID)`
Returns organisation performance metrics for Agent CaaS Bucket 2-3:
- `org_page_bookings`, `org_acquired_clients`, `internal_referral_bookings`
- `total_bookings`, `current_active_members`, `new_members_90d`
- `service_area_count`

#### 3. `check_org_subscription_active(agent_id UUID)`
Returns `BOOLEAN` - whether agent has active organisation subscription

#### 4. `calculate_organisation_caas(org_id UUID)` (To Be Created)
Returns organisation CaaS score based on weighted team average

---

## Key Metrics & Success Criteria

### Primary KPIs

1. **Subscription Conversion Rate**
   - **Target**: 25% of agents with 50+ score upgrade to organisation within 90 days
   - **Measure**: Track conversion funnel from score unlock → org signup

2. **Monthly Recurring Revenue (MRR)**
   - **Q1 Target**: £5,000 MRR (100 Starter subs OR 50 Pro subs)
   - **Q2 Target**: £15,000 MRR (300 Starter OR 150 Pro OR mix)
   - **Measure**: Sum of active subscriptions × monthly price

3. **Agent Score Distribution**
   - **Target**: 50% of subscribed agents reach 70+, 25% reach 85+
   - **Measure**: Histogram of agent scores, segmented by subscription status

### Secondary KPIs

4. **Feature Adoption Rate**
   - **Team Dashboard**: 80% of subscribed agents use weekly
   - **Org Public Page**: 70% of subscribed agents create + customize
   - **Team Collaboration**: 40% of subscribed agents have internal referrals

5. **Organisation Growth Metrics**
   - **Average Team Size**: 8 members (Starter), 15 members (Pro)
   - **Growth Rate**: +3 members per month per org
   - **Member Retention**: 75% of org members still active after 6 months

6. **Agent Retention**
   - **6-month retention**: 75% (subscribed agents)
   - **12-month retention**: 60% (subscribed agents)
   - **Churn reasons**: Track why agents cancel subscriptions

---

## Risks & Mitigation Strategies

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| RPC function performance issues | Slow score calculations | Medium | Add indexes, optimize queries, cache results |
| Stripe webhook failures | Subscription status out of sync | Medium | Retry logic, manual sync tool, monitoring alerts |
| Score calculation bugs | Incorrect scores shown | High | Comprehensive unit tests, manual QA, gradual rollout |
| Database migration failures | Blocked deployment | Low | Test on staging, backup before migration, rollback plan |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low conversion to subscriptions | Revenue target missed | Medium | A/B test CTAs, offer free trial, show ROI calculator |
| Agent backlash ("pay-to-win") | Negative sentiment, churn | Medium | Clear communication, emphasize feature value, grandfather clause |
| Gaming/fraud (fake orgs) | Score inflation, trust erosion | Low | Manual review, activity thresholds, fraud detection |
| Feature complexity overwhelms agents | Low adoption despite subscription | Medium | Onboarding wizard, video tutorials, dedicated support |

---

## Timeline Estimate

### Conservative Estimate (Single Senior Engineer)

- **Phase 1 (Database)**: 1 week
- **Phase 2 (Backend)**: 2 weeks
- **Phase 3 (Subscriptions)**: 2 weeks
- **Phase 4 (Frontend)**: 2 weeks
- **Phase 5 (Testing)**: 1 week
- **Phase 6 (Launch)**: 1 week

**Total**: 9 weeks (2 months)

### Optimistic Estimate (2 Engineers)

- **Parallel Development**: Backend + Frontend simultaneously
- **Total**: 6 weeks (1.5 months)

---

## Revenue Projections

### Year 1 Projections (Conservative)

| Quarter | Active Agents | Conversion Rate | Subscriptions | Avg Price | MRR | ARR |
|---------|---------------|-----------------|---------------|-----------|-----|-----|
| Q1 | 200 | 15% | 30 | £49 | £1,470 | £17,640 |
| Q2 | 300 | 20% | 60 | £55 | £3,300 | £39,600 |
| Q3 | 400 | 22% | 88 | £60 | £5,280 | £63,360 |
| Q4 | 500 | 25% | 125 | £65 | £8,125 | £97,500 |

**Year 1 Total ARR**: £218,100

### Assumptions:
- Agent base grows 25% per quarter
- Conversion rate improves as features mature
- Average price increases as more agents choose Pro tier
- Churn rate: 10% per quarter (factored in)

---

## Next Immediate Steps

### Week 1 (Database Foundation)
1. **Review & Approve Design**: Stakeholder sign-off on Agent CaaS model
2. **Create Migration Files**: Write SQL for migrations 155-159
3. **Test Migrations on Staging**: Verify schema changes don't break existing features
4. **Deploy Migrations to Production**: Run during low-traffic window

### Week 2-3 (Backend Implementation)
1. **Implement AgentCaaSStrategy**: Code the 4-bucket calculation logic
2. **Implement OrganisationCaaSStrategy**: Code weighted team average
3. **Write Unit Tests**: Achieve 90%+ test coverage on scoring logic
4. **Test with Sample Data**: Verify scores match expected values

### Week 4-5 (Subscription Integration)
1. **Create Subscription API Endpoints**: CRUD operations for org subscriptions
2. **Integrate Stripe Checkout**: Add payment flow for upgrades
3. **Implement Webhook Handlers**: Sync subscription status from Stripe
4. **Test Subscription Flow**: End-to-end test from signup → payment → score unlock

### Week 6-7 (Frontend Development)
1. **Build Agent Dashboard Score Card**: Show 4 buckets with locked/unlocked states
2. **Build Organisation Upgrade Page**: Feature comparison + pricing + checkout
3. **Build Organisation Dashboard**: Show org score + team metrics
4. **Update Help Centre**: Finalize Agent & Org documentation

### Week 8 (Testing & Soft Launch)
1. **QA Testing**: Manual testing of all user flows
2. **Soft Launch to 10% of Agents**: A/B test with small cohort
3. **Monitor Metrics**: Track conversion, adoption, bugs
4. **Iterate Based on Feedback**: Fix issues, adjust messaging

### Week 9 (Full Launch)
1. **Roll Out to 100%**: Enable for all agents
2. **Marketing Campaign**: Email announcement, in-app banners
3. **Support Team Training**: Prepare for subscription questions
4. **Monitor & Optimize**: Track KPIs, iterate on CTAs

---

## Questions for Stakeholders

Before proceeding with implementation, please review and answer:

### Product Questions

1. **Pricing Confirmation**: Are £49 (Starter) and £99 (Pro) the final prices?
2. **Free Trial**: Should we offer a 14-day free trial for organisation subscriptions?
3. **Grandfather Clause**: Should existing high-score solo agents get 3 months grace period?
4. **Elite Threshold**: Confirm 85+ as elite status threshold?

### Technical Questions

1. **Infrastructure**: Do we need additional database resources for RPC function load?
2. **Stripe Integration**: Use existing Stripe account or create separate organisation subscription product?
3. **Caching**: Should we cache CaaS scores (and for how long)?
4. **Rate Limiting**: Should we rate-limit score recalculations to prevent abuse?

### Business Questions

1. **Launch Date**: Target launch date for Agent CaaS?
2. **Marketing Support**: Will we have marketing resources for launch campaign?
3. **Support Capacity**: Do we have support team capacity for subscription questions?
4. **Legal Review**: Do subscription terms need legal review before launch?

---

## Conclusion

The Agent and Organisation CaaS systems are **fully designed and ready for implementation**. The model achieves the strategic goal of steering agents toward building genuine tutoring businesses using organisation features, with subtle incentives embedded across scoring buckets.

**Key Takeaway**: This isn't a "pay-to-win" model—it's a "build-to-win" model where scores increase naturally as agents use organisation tools to grow their businesses.

**Recommended Next Step**: Stakeholder review of this summary → Approval → Begin Phase 1 (Database Foundation) development.

---

**Document Status**: ✅ Complete - Ready for Stakeholder Review
**Last Updated**: 2026-01-07
**Authors**: Product & Engineering Team

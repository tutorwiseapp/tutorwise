# Agent CaaS: Organisation-as-Growth-Engine Model

**Design Document**
**Author**: Product & Engineering Team
**Date**: 2026-01-07
**Status**: Final Proposal for Implementation
**Version**: 2.0 (Organisation-Centric)

---

## Executive Summary

This document proposes an Agent CaaS scoring model designed to **steer agents toward building scalable tutoring businesses using organisation features**. The model embeds subscription incentives across four scoring buckets, rewarding agents who use organisation tools to develop teams, build brand presence, scale operations, and establish professional credentials.

**Key Strategy**: Solo agents can reach 60-75 points through recruitment alone. Agents who subscribe to organisation features and actively use business-building tools can reach 85-100 points (elite status).

**Business Goals**:
1. Drive organisation subscription adoption (target: 25% of active agents)
2. Increase agent retention through feature lock-in
3. Build genuine tutoring businesses on the platform (not just referral networks)
4. Generate predictable MRR from agent subscriptions

---

## Design Philosophy

### Core Principle: "Organisation Tools Enable Business Growth"

**Without Organisation** (Free Tier):
- Agent = Individual recruiter
- Earns referral commissions on recruited tutors
- Limited scalability (max 60-75 points)
- No brand presence, team management, or business tools

**With Organisation** (Subscription):
- Agent = Business owner
- Unlocks team dashboard, public page, booking system, analytics
- Can build branded tutoring business with managed team
- Scalable operations (reach 85-100 points)

### Psychological Steering

The model uses **positive reinforcement** rather than punitive gating:
- ✅ "Upgrade to unlock business tools" (aspirational)
- ❌ NOT "Pay to increase your score" (coercive)

Agents should feel:
1. "I'm doing well as a solo recruiter" (55-65 points)
2. "I want to scale my business" (intrinsic motivation)
3. "Organisation tools help me grow" (discover features)
4. "My score increased because my business grew" (earned achievement)

---

## Agent CaaS Scoring Model (4-Bucket)

### Total: 100 points max
- **Free tier max**: 80 points (realistically 60-75 for most solo agents)
- **With organisation**: 100 points (requires active feature usage)

### Point Distribution

| Bucket | Free Tier Max | Org Bonus | Total Max |
|--------|---------------|-----------|-----------|
| 1. Team Quality & Development | 25 | +10 | 35 |
| 2. Business Operations & Scale | 20 | +10 | 30 |
| 3. Growth & Expansion | 15 | +5 | 20 |
| 4. Professional Standards | 10 | +5 | 15 |
| **TOTAL** | **70** | **+30** | **100** |

---

## Bucket 1: Team Quality & Development (35 max)

### Philosophy
- **Free tier**: "You recruit quality tutors"
- **With org**: "You build and develop high-performing teams"

### Free Tier Scoring (25 points max)

**Measures**: Quality of tutors recruited via agent's personal referral links

```typescript
// Base scoring available to all agents
async function calcBaseRecruitedTutorQuality(agentId: string): Promise<number> {
  // Get all tutors recruited via agent's AGENT_REFERRAL edges
  const recruitedTutors = await getTutorsRecruitedByAgent(agentId);

  if (recruitedTutors.length === 0) return 0;

  // Calculate average CaaS score of recruited tutors
  const avgTutorCaaS = recruitedTutors.reduce((sum, t) => sum + t.caas_score, 0) / recruitedTutors.length;

  // Progressive scoring based on quality
  if (avgTutorCaaS >= 85) return 25; // Elite recruiters
  if (avgTutorCaaS >= 80) return 23;
  if (avgTutorCaaS >= 75) return 21;
  if (avgTutorCaaS >= 70) return 19;
  if (avgTutorCaaS >= 65) return 16;
  if (avgTutorCaaS >= 60) return 13;
  if (avgTutorCaaS >= 55) return 10;
  if (avgTutorCaaS >= 50) return 7;
  return 5; // At least recruited some tutors
}
```

### Organisation Bonus (+10 points)

**Unlocks**: Team integration, team quality, team development metrics

```typescript
async function calcOrgTeamQualityBonus(agentId: string, supabase: SupabaseClient): Promise<number> {
  // Check if agent has active organisation subscription
  const hasActiveOrg = await checkOrgSubscription(agentId, supabase);
  if (!hasActiveOrg) return 0; // Bonus locked without subscription

  const org = await getAgentOrganisation(agentId);
  const recruitedTutors = await getTutorsRecruitedByAgent(agentId);

  let bonus = 0;

  // ============================================================
  // SUB-METRIC 1: Team Integration Rate (max +4 points)
  // ============================================================
  // Measures: % of recruited tutors who joined agent's organisation
  // Org Feature Used: Team member invitations, onboarding workflows

  const recruitedTutorsInOrg = await countRecruitedTutorsInOrg(agentId, org.id);
  const integrationRate = recruitedTutorsInOrg / recruitedTutors.length;

  if (integrationRate >= 0.80) bonus += 4;      // 80%+ joined org (exceptional)
  else if (integrationRate >= 0.60) bonus += 3; // 60-79% (strong)
  else if (integrationRate >= 0.40) bonus += 2; // 40-59% (good)
  else if (integrationRate >= 0.20) bonus += 1; // 20-39% (developing)

  // ============================================================
  // SUB-METRIC 2: Organisation Team Quality (max +3 points)
  // ============================================================
  // Measures: Average CaaS score of ALL org members (not just recruits)
  // Org Feature Used: Team dashboard, performance tracking

  const orgMembers = await getOrganisationMembers(org.id);
  const orgAvgCaaS = orgMembers.reduce((sum, m) => sum + m.caas_score, 0) / orgMembers.length;

  if (orgAvgCaaS >= 80) bonus += 3;      // Elite team
  else if (orgAvgCaaS >= 75) bonus += 2.5;
  else if (orgAvgCaaS >= 70) bonus += 2;
  else if (orgAvgCaaS >= 65) bonus += 1.5;
  else if (orgAvgCaaS >= 60) bonus += 1;

  // ============================================================
  // SUB-METRIC 3: Member Development Score (max +3 points)
  // ============================================================
  // Measures: Average CaaS score improvement of org members over 6 months
  // Org Feature Used: Team analytics, member development tracking
  // This rewards agents who actively develop their team's skills

  const memberImprovements = await calculateMemberCaaSImprovements(org.id, '6months');
  const avgImprovement = memberImprovements.reduce((sum, i) => sum + i, 0) / memberImprovements.length;

  if (avgImprovement >= 20) bonus += 3;      // Members improved 20+ points (exceptional coaching)
  else if (avgImprovement >= 15) bonus += 2.5;
  else if (avgImprovement >= 10) bonus += 2;
  else if (avgImprovement >= 7) bonus += 1.5;
  else if (avgImprovement >= 5) bonus += 1;

  return Math.min(bonus, 10);
}
```

### Organisation Features Driving This Bucket

| Feature | Impact | Steering Behavior |
|---------|--------|-------------------|
| Team Member Invitations | Team Integration (+4) | "Invite your recruits to join your org" |
| Team Dashboard | Team Quality (+3) | "View and manage your team's performance" |
| Member Analytics | Member Development (+3) | "Track tutor growth and provide coaching" |
| Onboarding Workflows | Integration Rate | "Streamline new member onboarding" |

### Agent Journey Example

**Month 1 (Solo)**: Recruited 10 tutors (avg CaaS 65) → **16/25 base points**

**Month 4 (Subscribed)**: Same 10 tutors, 6 joined org → **16 base + 2 integration + 1 team quality = 19/35**

**Month 8 (Active org user)**: 20 tutors recruited, 16 in org (80%), avg org CaaS 72, members improved +8 points avg → **19 base + 4 integration + 2 team quality + 1.5 development = 26.5/35**

**Month 12 (Elite)**: 40 tutors recruited, 35 in org (87%), avg org CaaS 82, members improved +15 points avg → **23 base + 4 integration + 3 team quality + 2.5 development = 32.5/35**

---

## Bucket 2: Business Operations & Scale (30 max)

### Philosophy
- **Free tier**: "Tutors you recruit perform well individually"
- **With org**: "You run a scalable tutoring business with brand presence"

### Free Tier Scoring (20 points max)

**Measures**: Performance of recruited tutors (sessions, ratings, retention)

```typescript
async function calcBaseTutorSuccess(agentId: string): Promise<number> {
  const recruitedTutors = await getTutorsRecruitedByAgent(agentId);
  const stats = await aggregateRecruitedTutorStats(recruitedTutors);

  let score = 0;

  // ============================================================
  // Total sessions completed by recruited tutors (max 10 points)
  // ============================================================
  if (stats.totalCompletedSessions >= 1000) score += 10;
  else if (stats.totalCompletedSessions >= 500) score += 8;
  else if (stats.totalCompletedSessions >= 250) score += 6;
  else if (stats.totalCompletedSessions >= 100) score += 4;
  else if (stats.totalCompletedSessions >= 50) score += 2;

  // ============================================================
  // Average rating across all recruited tutors (max 6 points)
  // ============================================================
  if (stats.avgRating >= 4.8) score += 6;
  else if (stats.avgRating >= 4.7) score += 5;
  else if (stats.avgRating >= 4.5) score += 4;
  else if (stats.avgRating >= 4.3) score += 3;
  else if (stats.avgRating >= 4.0) score += 2;
  else if (stats.avgRating >= 3.5) score += 1;

  // ============================================================
  // Tutor retention rate (% still active after 6 months) (max 4 points)
  // ============================================================
  const retention6m = stats.activeAfter6Months / recruitedTutors.length;

  if (retention6m >= 0.85) score += 4;
  else if (retention6m >= 0.75) score += 3;
  else if (retention6m >= 0.65) score += 2;
  else if (retention6m >= 0.50) score += 1;

  return score; // max 20 points
}
```

### Organisation Bonus (+10 points)

**Unlocks**: Brand & marketing metrics, client acquisition, team collaboration

```typescript
async function calcOrgBusinessOperationsBonus(agentId: string, supabase: SupabaseClient): Promise<number> {
  const hasActiveOrg = await checkOrgSubscription(agentId, supabase);
  if (!hasActiveOrg) return 0;

  const org = await getAgentOrganisation(agentId);
  const orgStats = await getOrganisationStats(org.id);

  let bonus = 0;

  // ============================================================
  // SUB-METRIC 1: Brand & Marketing Score (max +4 points)
  // ============================================================
  // Measures: Bookings made through organisation's public page
  // Org Feature Used: Public organisation page, SEO, brand presence
  // Shows agent is building recognizable brand, not just recruiting

  const orgPageBookings = orgStats.bookingsViaOrgPublicPage;

  if (orgPageBookings >= 200) bonus += 4;
  else if (orgPageBookings >= 100) bonus += 3;
  else if (orgPageBookings >= 50) bonus += 2;
  else if (orgPageBookings >= 20) bonus += 1;

  // ============================================================
  // SUB-METRIC 2: Client Acquisition Score (max +3 points)
  // ============================================================
  // Measures: Unique clients acquired through org channels
  // Org Feature Used: Organisation booking system, client management
  // Distinct from individual tutor bookings - shows org-level marketing

  const orgAcquiredClients = orgStats.uniqueClientsViaOrgChannels;

  if (orgAcquiredClients >= 100) bonus += 3;
  else if (orgAcquiredClients >= 50) bonus += 2.5;
  else if (orgAcquiredClients >= 25) bonus += 2;
  else if (orgAcquiredClients >= 10) bonus += 1;

  // ============================================================
  // SUB-METRIC 3: Team Collaboration Score (max +3 points)
  // ============================================================
  // Measures: Internal client referrals (team members sharing clients)
  // Org Feature Used: Team collaboration tools, shared client database
  // Shows cohesive team operation, not just collection of individuals

  const totalBookings = orgStats.totalBookings;
  const internalReferrals = orgStats.internalClientReferrals;
  const collaborationRate = totalBookings > 0 ? internalReferrals / totalBookings : 0;

  if (collaborationRate >= 0.30) bonus += 3;    // 30%+ of bookings involve team collaboration
  else if (collaborationRate >= 0.20) bonus += 2;
  else if (collaborationRate >= 0.10) bonus += 1;
  else if (collaborationRate >= 0.05) bonus += 0.5;

  return Math.min(bonus, 10);
}
```

### Organisation Features Driving This Bucket

| Feature | Impact | Steering Behavior |
|---------|--------|-------------------|
| Public Organisation Page | Brand & Marketing (+4) | "Build SEO presence and direct bookings" |
| Organisation Booking System | Client Acquisition (+3) | "Centralize client management" |
| Team Collaboration Tools | Team Collaboration (+3) | "Enable internal client referrals" |
| Client Database (Shared) | Collaboration Rate | "Share resources across team" |

### Agent Journey Example

**Solo Agent**: 150 sessions via recruits, 4.4 avg rating, 70% retention → **12/20**

**New Org User**: Same + 15 org page bookings, 8 org clients → **12 base + 1 brand + 1 client = 14/30**

**Growing Org**: Same + 80 org bookings, 35 clients, 12% internal referrals → **12 base + 2 brand + 2 client + 1 collab = 17/30**

**Elite Org**: 800 total sessions, 4.7 rating, 80% retention + 250 org bookings, 120 clients, 28% collab → **18 base + 4 brand + 3 client + 2.5 collab = 27.5/30**

---

## Bucket 3: Growth & Expansion (20 max)

### Philosophy
- **Free tier**: "You actively recruit tutors"
- **With org**: "You systematically grow your business"

### Free Tier Scoring (15 points max)

**Measures**: Recruitment volume, consistency, diversity

```typescript
async function calcBaseRecruitmentActivity(agentId: string): Promise<number> {
  const recruitmentStats = await getRecruitmentStats(agentId);

  let score = 0;

  // ============================================================
  // Total tutors recruited (max 8 points)
  // ============================================================
  if (recruitmentStats.totalRecruitedTutors >= 100) score += 8;
  else if (recruitmentStats.totalRecruitedTutors >= 50) score += 7;
  else if (recruitmentStats.totalRecruitedTutors >= 25) score += 6;
  else if (recruitmentStats.totalRecruitedTutors >= 15) score += 4;
  else if (recruitmentStats.totalRecruitedTutors >= 10) score += 3;
  else if (recruitmentStats.totalRecruitedTutors >= 5) score += 2;
  else if (recruitmentStats.totalRecruitedTutors >= 1) score += 1;

  // ============================================================
  // Recent recruitment activity (last 90 days) (max 4 points)
  // ============================================================
  if (recruitmentStats.recentRecruits90d >= 10) score += 4;
  else if (recruitmentStats.recentRecruits90d >= 5) score += 3;
  else if (recruitmentStats.recentRecruits90d >= 3) score += 2;
  else if (recruitmentStats.recentRecruits90d >= 1) score += 1;

  // ============================================================
  // Subject diversity (market breadth) (max 3 points)
  // ============================================================
  const uniqueSubjects = getUniqueSubjects(recruitmentStats.recruitedTutors);

  if (uniqueSubjects >= 15) score += 3;
  else if (uniqueSubjects >= 10) score += 2.5;
  else if (uniqueSubjects >= 7) score += 2;
  else if (uniqueSubjects >= 5) score += 1.5;
  else if (uniqueSubjects >= 3) score += 1;

  return score; // max 15 points
}
```

### Organisation Bonus (+5 points)

**Unlocks**: Team size growth, growth momentum, geographic expansion

```typescript
async function calcOrgGrowthBonus(agentId: string, supabase: SupabaseClient): Promise<number> {
  const hasActiveOrg = await checkOrgSubscription(agentId, supabase);
  if (!hasActiveOrg) return 0;

  const org = await getAgentOrganisation(agentId);
  const growthStats = await getOrganisationGrowthStats(org.id);

  let bonus = 0;

  // ============================================================
  // SUB-METRIC 1: Team Size Growth (max +2 points)
  // ============================================================
  // Measures: Current active team size
  // Org Feature Used: Member management, team invitations

  const activeMembers = growthStats.currentActiveMembers;

  if (activeMembers >= 50) bonus += 2;
  else if (activeMembers >= 30) bonus += 1.75;
  else if (activeMembers >= 20) bonus += 1.5;
  else if (activeMembers >= 15) bonus += 1.25;
  else if (activeMembers >= 10) bonus += 1;
  else if (activeMembers >= 5) bonus += 0.5;

  // ============================================================
  // SUB-METRIC 2: Growth Momentum (max +2 points)
  // ============================================================
  // Measures: New members joining org (not just agent's recruits)
  // Org Feature Used: Open org invitations, org discoverability
  // Shows org is attractive to existing tutors, not just new recruits

  const newMembers90d = growthStats.newMembersJoined90d;

  if (newMembers90d >= 15) bonus += 2;
  else if (newMembers90d >= 10) bonus += 1.75;
  else if (newMembers90d >= 7) bonus += 1.5;
  else if (newMembers90d >= 5) bonus += 1.25;
  else if (newMembers90d >= 3) bonus += 1;

  // ============================================================
  // SUB-METRIC 3: Geographic Expansion (max +1 point)
  // ============================================================
  // Measures: Number of service areas/cities covered
  // Org Feature Used: Multi-location management, service area settings
  // Shows business scale beyond single location

  const serviceAreas = org.service_area?.length || 0;

  if (serviceAreas >= 10) bonus += 1;
  else if (serviceAreas >= 7) bonus += 0.75;
  else if (serviceAreas >= 5) bonus += 0.5;
  else if (serviceAreas >= 3) bonus += 0.25;

  return Math.min(bonus, 5);
}
```

### Organisation Features Driving This Bucket

| Feature | Impact | Steering Behavior |
|---------|--------|-------------------|
| Team Member Invitations | Team Size (+2) | "Grow your team beyond personal recruits" |
| Organisation Discoverability | Growth Momentum (+2) | "Attract tutors to join your org" |
| Multi-Location Management | Geographic Expansion (+1) | "Scale across regions" |
| Service Area Settings | Market Coverage | "Define service territories" |

---

## Bucket 4: Professional Standards & Trust (15 max)

### Philosophy
- **Free tier**: "You're personally verified and credentialed"
- **With org**: "You operate as a verified, professional business"

### Free Tier Scoring (10 points max)

**Measures**: Individual agent credentials and verifications

```typescript
function calcBaseProfessionalStandards(profile: AgentProfile): number {
  // SAFETY GATE: Identity verification required
  if (!profile.identity_verified) return 0;

  let score = 3; // Base points for identity verification

  // ============================================================
  // Personal credentials (max 10 points total)
  // ============================================================

  // DBS check (Disclosure and Barring Service - UK background check)
  if (profile.dbs_verified) score += 3;

  // Professional insurance (personal liability coverage)
  if (profile.professional_insurance) score += 2;

  // Association membership (e.g., "Tutors' Association UK")
  if (profile.association_member) score += 2;

  return score; // max 10 points
}
```

### Organisation Bonus (+5 points)

**Unlocks**: Business-level verifications and credentials

```typescript
async function calcOrgProfessionalStandardsBonus(agentId: string, supabase: SupabaseClient): Promise<number> {
  const hasActiveOrg = await checkOrgSubscription(agentId, supabase);
  if (!hasActiveOrg) return 0;

  const org = await getAgentOrganisation(agentId);

  let bonus = 0;

  // ============================================================
  // SUB-METRIC 1: Business Verification (max +2 points)
  // ============================================================
  // Org Feature Used: Business verification system
  // Shows legitimate registered business, not just individual

  if (org.business_verified) bonus += 2;

  // ============================================================
  // SUB-METRIC 2: Safeguarding Certification (max +2 points)
  // ============================================================
  // Org Feature Used: Safeguarding policy management
  // Critical for client trust, especially for child safeguarding

  if (org.safeguarding_certified) bonus += 2;

  // ============================================================
  // SUB-METRIC 3: Business Operations (max +1 point)
  // ============================================================
  // Org Feature Used: Insurance, association memberships

  if (org.professional_insurance) bonus += 0.5; // Organisation-level insurance
  if (org.association_member) bonus += 0.5;     // Business association membership

  return Math.min(bonus, 5);
}
```

### Organisation Features Driving This Bucket

| Feature | Impact | Steering Behavior |
|---------|--------|-------------------|
| Business Verification System | Business Verification (+2) | "Verify your registered business" |
| Safeguarding Policy Manager | Safeguarding Cert (+2) | "Show commitment to child safety" |
| Organisation Insurance | Business Insurance (+0.5) | "Professional liability coverage" |
| Business Associations | Association Member (+0.5) | "Join professional bodies" |

---

## Score Progression Framework

### Agent Journey: Solo → Organisation Builder → Elite

#### Stage 1: New Solo Agent (Months 0-3)
**Profile**: Just started recruiting, no organisation

**Scores**:
- Bucket 1: 10/25 (recruited 5 tutors, avg CaaS 60)
- Bucket 2: 6/20 (30 sessions, 4.2 rating, 50% retention)
- Bucket 3: 5/15 (5 recruits, recent activity, 2 subjects)
- Bucket 4: 5/10 (ID verified, no DBS yet)
- **Total: 26/80**

**Agent Experience**:
- "I'm earning referral commissions, but progress feels slow"
- Dashboard shows locked organisation features with "+25 points available"
- Sees successful agents with 85+ scores have organisations

---

#### Stage 2: Organisation Subscriber (Month 4)
**Profile**: Subscribed to Organisation Starter (£49/month), just setting up

**Scores**:
- Bucket 1: 13/35 (10 recruits now, 4 joined org [40%], avg org CaaS 65)
  - 13 base + 2 integration + 1 team quality = 16 total
- Bucket 2: 9/30 (80 sessions, 4.3 rating, 60% retention, 12 org bookings)
  - 8 base + 1 brand = 9 total
- Bucket 3: 8/20 (10 recruits, consistent, 4 subjects, 5 org members)
  - 6 base + 0.5 team size + 1 momentum = 7.5 total
- Bucket 4: 7/15 (ID + DBS verified, business verified)
  - 6 base + 2 business = 8 total
- **Total: 40.5/100**

**Agent Experience**:
- "I gained 14 points just by subscribing and inviting my recruits to join!"
- "The team dashboard is useful - I can see who needs help"
- "I should get more recruits to join the org and build my public page"

---

#### Stage 3: Active Organisation Builder (Months 6-9)
**Profile**: Actively using org tools, building brand presence

**Scores**:
- Bucket 1: 22/35 (20 recruits, 15 in org [75%], avg org CaaS 72, +9 member improvement)
  - 16 base + 3 integration + 2 team quality + 1.5 development = 22.5
- Bucket 2: 19/30 (200 sessions, 4.5 rating, 70% retention, 65 org bookings, 28 org clients, 15% collab)
  - 12 base + 2 brand + 2 client + 1 collab = 17
- Bucket 3: 14/20 (20 recruits, active, 7 subjects, 12 org members, 5 new members, 3 service areas)
  - 11 base + 1 team size + 1.25 momentum + 0.25 geo = 13.5
- Bucket 4: 12/15 (all personal creds, business verified + safeguarding cert)
  - 8 base + 2 business + 2 safeguarding = 12
- **Total: 65/100**

**Agent Experience**:
- "My org page is getting direct bookings - this is working!"
- "Team collaboration is helping retention - tutors refer clients to each other"
- "I'm tracking member growth and coaching them to improve scores"
- "Getting close to 70 - elite status feels achievable"

---

#### Stage 4: Established Organisation (Months 10-15)
**Profile**: Successful org with strong brand, active team

**Scores**:
- Bucket 1: 30/35 (40 recruits, 32 in org [80%], avg org CaaS 78, +12 member improvement)
  - 21 base + 4 integration + 2.5 team quality + 2 development = 29.5
- Bucket 2: 26/30 (500 sessions, 4.7 rating, 80% retention, 150 org bookings, 65 org clients, 22% collab)
  - 18 base + 3 brand + 2.5 client + 2 collab = 25.5
- Bucket 3: 18/20 (40 recruits, very active, 12 subjects, 25 org members, 7 new members, 5 service areas)
  - 14 base + 1.5 team size + 1.5 momentum + 0.5 geo = 17.5
- Bucket 4: 15/15 (all verifications)
  - 10 base + 2 business + 2 safeguarding + 0.5 insurance + 0.5 association = 15
- **Total: 87.5/100** ✅ **ELITE STATUS**

**Agent Experience**:
- "Hit elite status! My credibility badge shows I run a professional business"
- "Org features are essential now - couldn't manage 25 tutors without the dashboard"
- "Direct org bookings are a major revenue stream - not just referral commissions"
- "Strong tutors want to join my org because of the brand and team support"

---

#### Stage 5: Premium Organisation (18+ months)
**Profile**: Large-scale tutoring business, market leader

**Scores**:
- Bucket 1: 35/35 (60 recruits, 52 in org [87%], avg org CaaS 83, +17 member improvement)
  - 23 base + 4 integration + 3 team quality + 2.5 development = 32.5 (capped at 35)
- Bucket 2: 30/30 (1000+ sessions, 4.8 rating, 85% retention, 300 org bookings, 140 org clients, 30% collab)
  - 20 base + 4 brand + 3 client + 3 collab = 30
- Bucket 3: 20/20 (60 recruits, highly active, 18 subjects, 40 org members, 12 new members, 8 service areas)
  - 15 base + 2 team size + 2 momentum + 1 geo = 20
- Bucket 4: 15/15 (all verifications)
  - 10 base + 5 org bonuses = 15
- **Total: 100/100** 🏆 **MAXIMUM SCORE**

**Agent Experience**:
- "Perfect score! Market leader status"
- "Org subscription pays for itself 10x over from direct bookings"
- "Recruiting is easy now - tutors seek us out because of our reputation"
- "Team of 40+ tutors, operating across 8 cities - couldn't do this without org tools"

---

## Implementation Requirements

### Database Schema Changes

#### 1. Add agent verification fields to `profiles` table
```sql
-- File: tools/database/migrations/155_add_agent_verification_fields.sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS professional_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS association_member TEXT;

COMMENT ON COLUMN profiles.business_verified IS
  'Whether agent has verified business credentials (Companies House, etc.)';

COMMENT ON COLUMN profiles.professional_insurance IS
  'Whether agent has professional indemnity insurance';

COMMENT ON COLUMN profiles.association_member IS
  'Professional association membership (e.g., Tutors Association UK)';
```

#### 2. Add organisation-level verification fields
```sql
-- Already exists in migration 154, but add missing fields:
ALTER TABLE public.connection_groups
ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS safeguarding_certified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS professional_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS association_member TEXT;
```

#### 3. Create `organisation_subscriptions` table
```sql
-- File: tools/database/migrations/156_create_organisation_subscriptions.sql
CREATE TABLE IF NOT EXISTS public.organisation_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Subscription details
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'trialing')),

  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Billing periods
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_org_subscriptions_org_id ON public.organisation_subscriptions(organisation_id);
CREATE INDEX idx_org_subscriptions_owner_id ON public.organisation_subscriptions(owner_id);
CREATE INDEX idx_org_subscriptions_status ON public.organisation_subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_org_subscriptions_stripe_sub ON public.organisation_subscriptions(stripe_subscription_id);

-- RLS Policies
ALTER TABLE public.organisation_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisation owners can view their subscriptions"
  ON public.organisation_subscriptions FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Service role can manage all subscriptions"
  ON public.organisation_subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

COMMENT ON TABLE public.organisation_subscriptions IS
  'Tracks organisation subscription status and billing via Stripe';
```

#### 4. Create tracking table for organisation bookings
```sql
-- File: tools/database/migrations/157_track_organisation_bookings.sql
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('tutor_profile', 'org_page', 'org_referral', 'direct')),
ADD COLUMN IF NOT EXISTS source_organisation_id UUID REFERENCES public.connection_groups(id);

CREATE INDEX idx_bookings_source_org ON public.bookings(source_organisation_id) WHERE source_organisation_id IS NOT NULL;

COMMENT ON COLUMN bookings.source_type IS
  'How the booking was initiated: tutor_profile (individual), org_page (org public page), org_referral (internal team referral), direct (client direct contact)';

COMMENT ON COLUMN bookings.source_organisation_id IS
  'Organisation ID if booking was sourced through organisation channels';
```

#### 5. Create RPC functions for Agent CaaS calculations

```sql
-- File: tools/database/migrations/158_create_agent_caas_rpc_functions.sql

-- ============================================================================
-- FUNCTION 1: Get Agent Recruitment Stats
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_agent_recruitment_stats(agent_id UUID)
RETURNS TABLE (
  total_recruited_tutors INTEGER,
  recruited_tutors_in_org INTEGER,
  recent_recruits_90d INTEGER,
  avg_recruited_tutor_caas NUMERIC,
  total_sessions_by_recruited BIGINT,
  avg_rating_of_recruited NUMERIC,
  active_after_6_months INTEGER,
  unique_subjects INTEGER,
  org_avg_caas NUMERIC,
  avg_member_caas_improvement NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH recruited_tutors AS (
    -- Get all tutors recruited by this agent via AGENT_REFERRAL edges
    SELECT
      pg.target_profile_id as tutor_id,
      pg.created_at as recruited_at,
      p.roles,
      cs.total_score as current_caas
    FROM public.profile_graph pg
    INNER JOIN public.profiles p ON pg.target_profile_id = p.id
    LEFT JOIN public.caas_scores cs ON p.id = cs.profile_id
    WHERE pg.source_profile_id = agent_id
      AND pg.edge_type = 'AGENT_REFERRAL'
      AND 'tutor' = ANY(p.roles)
  ),
  recruited_stats AS (
    SELECT
      COUNT(*) as total_recruited,
      COUNT(*) FILTER (WHERE recruited_at >= NOW() - INTERVAL '90 days') as recent_90d,
      COALESCE(AVG(current_caas), 0) as avg_caas
    FROM recruited_tutors
  ),
  org_membership AS (
    -- Check how many recruited tutors joined agent's organisation
    SELECT COUNT(DISTINCT ngm.profile_id) as in_org_count
    FROM recruited_tutors rt
    INNER JOIN public.network_group_members ngm ON rt.tutor_id = ngm.profile_id
    INNER JOIN public.connection_groups cg ON ngm.group_id = cg.id
    WHERE cg.profile_id = agent_id
      AND cg.type = 'organisation'
  ),
  performance_stats AS (
    -- Aggregate performance of recruited tutors
    SELECT
      COUNT(DISTINCT b.id) as total_sessions,
      COALESCE(AVG(pr.rating), 0) as avg_rating
    FROM recruited_tutors rt
    INNER JOIN public.listings l ON rt.tutor_id = l.profile_id
    INNER JOIN public.bookings b ON l.id = b.listing_id
    LEFT JOIN public.profile_reviews pr ON b.id = pr.booking_id
    WHERE b.status = 'Completed'
  ),
  retention_stats AS (
    -- Check retention (still active after 6 months)
    SELECT COUNT(*) as active_count
    FROM recruited_tutors rt
    INNER JOIN public.profiles p ON rt.tutor_id = p.id
    WHERE rt.recruited_at <= NOW() - INTERVAL '6 months'
      AND p.last_active_at >= NOW() - INTERVAL '30 days'
  ),
  subject_diversity AS (
    -- Count unique subjects across recruited tutors
    SELECT COUNT(DISTINCT subj) as unique_count
    FROM recruited_tutors rt
    INNER JOIN public.profiles p ON rt.tutor_id = p.id,
    LATERAL unnest(
      COALESCE((p.professional_details->>'subjects')::TEXT[], '{}'::TEXT[])
    ) as subj
  ),
  org_quality AS (
    -- Get org team average CaaS if agent has org
    SELECT
      COALESCE(AVG(cs.total_score), 0) as org_avg
    FROM public.connection_groups cg
    INNER JOIN public.network_group_members ngm ON cg.id = ngm.group_id
    INNER JOIN public.caas_scores cs ON ngm.profile_id = cs.profile_id
    WHERE cg.profile_id = agent_id
      AND cg.type = 'organisation'
  ),
  member_improvement AS (
    -- Calculate average CaaS improvement of org members over 6 months
    -- (This is a simplified version - in production, would track historical scores)
    SELECT COALESCE(AVG(cs.total_score - 50), 0) as avg_improvement
    FROM public.connection_groups cg
    INNER JOIN public.network_group_members ngm ON cg.id = ngm.group_id
    INNER JOIN public.caas_scores cs ON ngm.profile_id = cs.profile_id
    WHERE cg.profile_id = agent_id
      AND cg.type = 'organisation'
      AND ngm.created_at <= NOW() - INTERVAL '6 months'
  )
  SELECT
    rs.total_recruited::INTEGER,
    COALESCE(om.in_org_count, 0)::INTEGER,
    rs.recent_90d::INTEGER,
    rs.avg_caas,
    ps.total_sessions,
    ps.avg_rating,
    COALESCE(ret.active_count, 0)::INTEGER,
    COALESCE(sd.unique_count, 0)::INTEGER,
    oq.org_avg,
    mi.avg_improvement
  FROM recruited_stats rs
  CROSS JOIN org_membership om
  CROSS JOIN performance_stats ps
  CROSS JOIN retention_stats ret
  CROSS JOIN subject_diversity sd
  CROSS JOIN org_quality oq
  CROSS JOIN member_improvement mi;
END;
$$;

COMMENT ON FUNCTION public.get_agent_recruitment_stats(UUID) IS
  'Returns comprehensive recruitment statistics for Agent CaaS scoring (Bucket 1-3)';

-- ============================================================================
-- FUNCTION 2: Get Organisation Business Stats
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_organisation_business_stats(org_id UUID)
RETURNS TABLE (
  org_page_bookings BIGINT,
  org_acquired_clients BIGINT,
  internal_referral_bookings BIGINT,
  total_bookings BIGINT,
  current_active_members INTEGER,
  new_members_90d INTEGER,
  service_area_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Bookings via org public page
    COUNT(*) FILTER (WHERE b.source_type = 'org_page') as org_page_bookings,

    -- Unique clients acquired via org channels
    COUNT(DISTINCT b.client_id) FILTER (WHERE b.source_type IN ('org_page', 'org_referral')) as org_acquired_clients,

    -- Internal referral bookings (team collaboration)
    COUNT(*) FILTER (WHERE b.source_type = 'org_referral') as internal_referral_bookings,

    -- Total org bookings
    COUNT(*) as total_bookings,

    -- Current active members
    (SELECT COUNT(*) FROM public.network_group_members ngm
     INNER JOIN public.profiles p ON ngm.profile_id = p.id
     WHERE ngm.group_id = org_id
       AND p.last_active_at >= NOW() - INTERVAL '30 days')::INTEGER as current_active_members,

    -- New members in last 90 days
    (SELECT COUNT(*) FROM public.network_group_members ngm
     WHERE ngm.group_id = org_id
       AND ngm.created_at >= NOW() - INTERVAL '90 days')::INTEGER as new_members_90d,

    -- Service area count
    (SELECT COALESCE(array_length(service_area, 1), 0)
     FROM public.connection_groups
     WHERE id = org_id)::INTEGER as service_area_count

  FROM public.bookings b
  WHERE b.source_organisation_id = org_id
    AND b.status = 'Completed';
END;
$$;

COMMENT ON FUNCTION public.get_organisation_business_stats(UUID) IS
  'Returns organisation business metrics for Agent CaaS scoring (Bucket 2-3)';

-- ============================================================================
-- FUNCTION 3: Check Organisation Subscription Status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_org_subscription_active(agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  has_active_sub BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.connection_groups cg
    INNER JOIN public.organisation_subscriptions os ON cg.id = os.organisation_id
    WHERE cg.profile_id = agent_id
      AND cg.type = 'organisation'
      AND os.status = 'active'
      AND os.current_period_end > NOW()
  ) INTO has_active_sub;

  RETURN COALESCE(has_active_sub, false);
END;
$$;

COMMENT ON FUNCTION public.check_org_subscription_active(UUID) IS
  'Checks if agent has an active organisation subscription (required for org bonuses)';
```

### Code Implementation

#### 1. Create Agent CaaS Strategy

```typescript
// File: apps/web/src/lib/services/caas/strategies/agent.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CaaSScoreData, ICaaSStrategy, CaaSProfile } from '../types';

/**
 * AgentCaaSStrategy
 *
 * Implements Agent credibility scoring with embedded organisation subscription bonuses.
 *
 * Scoring Model (4 buckets, 100 points max):
 * - Bucket 1: Team Quality & Development (25 base + 10 org = 35 max)
 * - Bucket 2: Business Operations & Scale (20 base + 10 org = 30 max)
 * - Bucket 3: Growth & Expansion (15 base + 5 org = 20 max)
 * - Bucket 4: Professional Standards (10 base + 5 org = 15 max)
 *
 * Free tier max: 70 points (realistically 60-75 for most solo agents)
 * With organisation: 100 points (requires active subscription + feature usage)
 */
export class AgentCaaSStrategy implements ICaaSStrategy {
  async calculate(profileId: string, supabase: SupabaseClient): Promise<CaaSScoreData> {
    try {
      // ================================================================
      // STEP 1: FETCH AGENT PROFILE
      // ================================================================
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single<CaaSProfile>();

      if (profileError || !profile) {
        throw new Error(`Failed to fetch agent profile: ${profileError?.message}`);
      }

      // SAFETY GATE: Identity verification required
      if (!profile.identity_verified) {
        return {
          total: 0,
          breakdown: {
            gate: 'Identity verification required',
            message: 'Complete identity verification to unlock Agent CaaS scoring',
          },
        };
      }

      // ================================================================
      // STEP 2: CHECK ORGANISATION SUBSCRIPTION STATUS
      // ================================================================
      const { data: hasActiveOrg } = await supabase
        .rpc('check_org_subscription_active', { agent_id: profileId });

      const subscriptionActive = hasActiveOrg || false;

      // ================================================================
      // STEP 3: FETCH RECRUITMENT STATS (via RPC)
      // ================================================================
      const { data: recruitmentStats, error: statsError } = await supabase
        .rpc('get_agent_recruitment_stats', { agent_id: profileId })
        .single();

      if (statsError) {
        console.error('[Agent CaaS] Failed to fetch recruitment stats:', statsError);
        throw new Error(`Failed to fetch recruitment stats: ${statsError.message}`);
      }

      // ================================================================
      // STEP 4: FETCH ORGANISATION STATS (if has active subscription)
      // ================================================================
      let orgStats = null;
      if (subscriptionActive) {
        // Get agent's organisation
        const { data: org } = await supabase
          .from('connection_groups')
          .select('id')
          .eq('profile_id', profileId)
          .eq('type', 'organisation')
          .single();

        if (org) {
          const { data: stats } = await supabase
            .rpc('get_organisation_business_stats', { org_id: org.id })
            .single();
          orgStats = stats;
        }
      }

      // ================================================================
      // STEP 5: CALCULATE BUCKET SCORES
      // ================================================================
      const bucket1 = this.calcBucket1_TeamQuality(recruitmentStats, subscriptionActive);
      const bucket2 = this.calcBucket2_BusinessOps(recruitmentStats, orgStats, subscriptionActive);
      const bucket3 = this.calcBucket3_Growth(recruitmentStats, orgStats, subscriptionActive);
      const bucket4 = this.calcBucket4_ProfessionalStandards(profile, subscriptionActive);

      const total = bucket1.total + bucket2.total + bucket3.total + bucket4.total;

      return {
        total: Math.round(total),
        breakdown: {
          team_quality_development: bucket1.total,
          team_quality_base: bucket1.base,
          team_quality_bonus: bucket1.bonus,
          business_operations_scale: bucket2.total,
          business_ops_base: bucket2.base,
          business_ops_bonus: bucket2.bonus,
          growth_expansion: bucket3.total,
          growth_base: bucket3.base,
          growth_bonus: bucket3.bonus,
          professional_standards: bucket4.total,
          professional_standards_base: bucket4.base,
          professional_standards_bonus: bucket4.bonus,
          subscription_active: subscriptionActive,
          total_base_points: bucket1.base + bucket2.base + bucket3.base + bucket4.base,
          total_org_bonus_points: bucket1.bonus + bucket2.bonus + bucket3.bonus + bucket4.bonus,
        },
      };
    } catch (error) {
      console.error('[Agent CaaS] Error calculating score:', error);
      throw error;
    }
  }

  // ====================================================================
  // BUCKET 1: Team Quality & Development (25 base + 10 org = 35 max)
  // ====================================================================
  private calcBucket1_TeamQuality(
    stats: any,
    hasActiveOrg: boolean
  ): { total: number; base: number; bonus: number } {
    // BASE SCORING (25 max): Average CaaS of recruited tutors
    let base = 0;
    const avgTutorCaaS = stats.avg_recruited_tutor_caas || 0;

    if (avgTutorCaaS >= 85) base = 25;
    else if (avgTutorCaaS >= 80) base = 23;
    else if (avgTutorCaaS >= 75) base = 21;
    else if (avgTutorCaaS >= 70) base = 19;
    else if (avgTutorCaaS >= 65) base = 16;
    else if (avgTutorCaaS >= 60) base = 13;
    else if (avgTutorCaaS >= 55) base = 10;
    else if (avgTutorCaaS >= 50) base = 7;
    else if (stats.total_recruited_tutors > 0) base = 5;

    // ORGANISATION BONUS (10 max)
    let bonus = 0;
    if (hasActiveOrg && stats.total_recruited_tutors > 0) {
      // Sub-metric 1: Team integration rate (max +4)
      const integrationRate = stats.recruited_tutors_in_org / stats.total_recruited_tutors;
      if (integrationRate >= 0.8) bonus += 4;
      else if (integrationRate >= 0.6) bonus += 3;
      else if (integrationRate >= 0.4) bonus += 2;
      else if (integrationRate >= 0.2) bonus += 1;

      // Sub-metric 2: Org team quality (max +3)
      const orgAvgCaaS = stats.org_avg_caas || 0;
      if (orgAvgCaaS >= 80) bonus += 3;
      else if (orgAvgCaaS >= 75) bonus += 2.5;
      else if (orgAvgCaaS >= 70) bonus += 2;
      else if (orgAvgCaaS >= 65) bonus += 1.5;
      else if (orgAvgCaaS >= 60) bonus += 1;

      // Sub-metric 3: Member development (max +3)
      const avgImprovement = stats.avg_member_caas_improvement || 0;
      if (avgImprovement >= 20) bonus += 3;
      else if (avgImprovement >= 15) bonus += 2.5;
      else if (avgImprovement >= 10) bonus += 2;
      else if (avgImprovement >= 7) bonus += 1.5;
      else if (avgImprovement >= 5) bonus += 1;

      bonus = Math.min(bonus, 10);
    }

    return { total: base + bonus, base, bonus };
  }

  // ====================================================================
  // BUCKET 2: Business Operations & Scale (20 base + 10 org = 30 max)
  // ====================================================================
  private calcBucket2_BusinessOps(
    stats: any,
    orgStats: any,
    hasActiveOrg: boolean
  ): { total: number; base: number; bonus: number } {
    // BASE SCORING (20 max): Recruited tutor performance
    let base = 0;

    // Total sessions (max 10)
    const totalSessions = stats.total_sessions_by_recruited || 0;
    if (totalSessions >= 1000) base += 10;
    else if (totalSessions >= 500) base += 8;
    else if (totalSessions >= 250) base += 6;
    else if (totalSessions >= 100) base += 4;
    else if (totalSessions >= 50) base += 2;

    // Average rating (max 6)
    const avgRating = stats.avg_rating_of_recruited || 0;
    if (avgRating >= 4.8) base += 6;
    else if (avgRating >= 4.7) base += 5;
    else if (avgRating >= 4.5) base += 4;
    else if (avgRating >= 4.3) base += 3;
    else if (avgRating >= 4.0) base += 2;
    else if (avgRating >= 3.5) base += 1;

    // Retention rate (max 4)
    if (stats.total_recruited_tutors > 0) {
      const retention = stats.active_after_6_months / stats.total_recruited_tutors;
      if (retention >= 0.85) base += 4;
      else if (retention >= 0.75) base += 3;
      else if (retention >= 0.65) base += 2;
      else if (retention >= 0.5) base += 1;
    }

    // ORGANISATION BONUS (10 max)
    let bonus = 0;
    if (hasActiveOrg && orgStats) {
      // Sub-metric 1: Brand & marketing (max +4)
      const orgBookings = orgStats.org_page_bookings || 0;
      if (orgBookings >= 200) bonus += 4;
      else if (orgBookings >= 100) bonus += 3;
      else if (orgBookings >= 50) bonus += 2;
      else if (orgBookings >= 20) bonus += 1;

      // Sub-metric 2: Client acquisition (max +3)
      const orgClients = orgStats.org_acquired_clients || 0;
      if (orgClients >= 100) bonus += 3;
      else if (orgClients >= 50) bonus += 2.5;
      else if (orgClients >= 25) bonus += 2;
      else if (orgClients >= 10) bonus += 1;

      // Sub-metric 3: Team collaboration (max +3)
      const totalBookings = orgStats.total_bookings || 0;
      if (totalBookings > 0) {
        const collabRate = (orgStats.internal_referral_bookings || 0) / totalBookings;
        if (collabRate >= 0.3) bonus += 3;
        else if (collabRate >= 0.2) bonus += 2;
        else if (collabRate >= 0.1) bonus += 1;
        else if (collabRate >= 0.05) bonus += 0.5;
      }

      bonus = Math.min(bonus, 10);
    }

    return { total: base + bonus, base, bonus };
  }

  // ====================================================================
  // BUCKET 3: Growth & Expansion (15 base + 5 org = 20 max)
  // ====================================================================
  private calcBucket3_Growth(
    stats: any,
    orgStats: any,
    hasActiveOrg: boolean
  ): { total: number; base: number; bonus: number } {
    // BASE SCORING (15 max): Recruitment activity
    let base = 0;

    // Total recruited (max 8)
    const totalRecruited = stats.total_recruited_tutors || 0;
    if (totalRecruited >= 100) base += 8;
    else if (totalRecruited >= 50) base += 7;
    else if (totalRecruited >= 25) base += 6;
    else if (totalRecruited >= 15) base += 4;
    else if (totalRecruited >= 10) base += 3;
    else if (totalRecruited >= 5) base += 2;
    else if (totalRecruited >= 1) base += 1;

    // Recent activity (max 4)
    const recent90d = stats.recent_recruits_90d || 0;
    if (recent90d >= 10) base += 4;
    else if (recent90d >= 5) base += 3;
    else if (recent90d >= 3) base += 2;
    else if (recent90d >= 1) base += 1;

    // Subject diversity (max 3)
    const uniqueSubjects = stats.unique_subjects || 0;
    if (uniqueSubjects >= 15) base += 3;
    else if (uniqueSubjects >= 10) base += 2.5;
    else if (uniqueSubjects >= 7) base += 2;
    else if (uniqueSubjects >= 5) base += 1.5;
    else if (uniqueSubjects >= 3) base += 1;

    // ORGANISATION BONUS (5 max)
    let bonus = 0;
    if (hasActiveOrg && orgStats) {
      // Sub-metric 1: Team size (max +2)
      const activeMembers = orgStats.current_active_members || 0;
      if (activeMembers >= 50) bonus += 2;
      else if (activeMembers >= 30) bonus += 1.75;
      else if (activeMembers >= 20) bonus += 1.5;
      else if (activeMembers >= 15) bonus += 1.25;
      else if (activeMembers >= 10) bonus += 1;
      else if (activeMembers >= 5) bonus += 0.5;

      // Sub-metric 2: Growth momentum (max +2)
      const newMembers = orgStats.new_members_90d || 0;
      if (newMembers >= 15) bonus += 2;
      else if (newMembers >= 10) bonus += 1.75;
      else if (newMembers >= 7) bonus += 1.5;
      else if (newMembers >= 5) bonus += 1.25;
      else if (newMembers >= 3) bonus += 1;

      // Sub-metric 3: Geographic expansion (max +1)
      const serviceAreas = orgStats.service_area_count || 0;
      if (serviceAreas >= 10) bonus += 1;
      else if (serviceAreas >= 7) bonus += 0.75;
      else if (serviceAreas >= 5) bonus += 0.5;
      else if (serviceAreas >= 3) bonus += 0.25;

      bonus = Math.min(bonus, 5);
    }

    return { total: base + bonus, base, bonus };
  }

  // ====================================================================
  // BUCKET 4: Professional Standards (10 base + 5 org = 15 max)
  // ====================================================================
  private calcBucket4_ProfessionalStandards(
    profile: any,
    hasActiveOrg: boolean
  ): { total: number; base: number; bonus: number } {
    // BASE SCORING (10 max): Personal credentials
    let base = 3; // Base points for identity verification (already checked)

    if (profile.dbs_verified) base += 3;
    if (profile.professional_insurance) base += 2;
    if (profile.association_member) base += 2;

    // ORGANISATION BONUS (5 max)
    let bonus = 0;
    if (hasActiveOrg) {
      // Note: Would need to fetch org data here
      // For now, simplified - in production, pass org data to this function
      // Sub-metric 1: Business verification (+2)
      // Sub-metric 2: Safeguarding cert (+2)
      // Sub-metric 3: Org insurance/association (+1)

      // This bonus would be calculated based on org.business_verified, etc.
      // For now, placeholder that would be replaced with actual org checks
    }

    return { total: base + bonus, base, bonus };
  }
}
```

#### 2. Update CaaS Service Router

```typescript
// File: apps/web/src/lib/services/caas/index.ts
// Add import
import { AgentCaaSStrategy } from './strategies/agent';

// Update switch statement (around line 103-118)
case 'AGENT':
  const agentStrategy = new AgentCaaSStrategy();
  scoreData = await agentStrategy.calculate(profileId, supabase);
  break;
```

#### 3. Update CaaS Types

```typescript
// File: apps/web/src/lib/services/caas/types.ts

// Add Agent version
export const CaaSVersions = {
  TUTOR: 'v5.9',
  CLIENT: 'v1.0',
  AGENT: 'v1.0', // NEW
  STUDENT: 'v0.0',
};
```

---

## Dashboard UI/UX Implementation

### Agent Dashboard Score Display

```tsx
// File: apps/web/src/app/components/dashboard/AgentCaaSScoreCard.tsx

interface AgentCaaSBreakdown {
  team_quality_development: number;
  team_quality_base: number;
  team_quality_bonus: number;
  business_operations_scale: number;
  business_ops_base: number;
  business_ops_bonus: number;
  growth_expansion: number;
  growth_base: number;
  growth_bonus: number;
  professional_standards: number;
  professional_standards_base: number;
  professional_standards_bonus: number;
  subscription_active: boolean;
  total_base_points: number;
  total_org_bonus_points: number;
}

export function AgentCaaSScoreCard({ score, breakdown }: {
  score: number;
  breakdown: AgentCaaSBreakdown;
}) {
  const isSubscribed = breakdown.subscription_active;
  const maxPossibleScore = isSubscribed ? 100 : 80;

  return (
    <div className="caas-score-card">
      <div className="score-header">
        <h2>Agent Credibility Score</h2>
        <div className="score-display">
          <span className="score-value">{score}</span>
          <span className="score-max">/{maxPossibleScore}</span>
          {score >= 85 && <span className="elite-badge">🏆 Elite</span>}
        </div>
      </div>

      <div className="score-breakdown">
        {/* Bucket 1 */}
        <ScoreBucket
          title="Team Quality & Development"
          score={breakdown.team_quality_development}
          max={isSubscribed ? 35 : 25}
          base={breakdown.team_quality_base}
          bonus={breakdown.team_quality_bonus}
          locked={!isSubscribed && breakdown.team_quality_bonus === 0}
          lockMessage="Unlock team integration, quality tracking, and development metrics with Organisation"
        />

        {/* Bucket 2 */}
        <ScoreBucket
          title="Business Operations & Scale"
          score={breakdown.business_operations_scale}
          max={isSubscribed ? 30 : 20}
          base={breakdown.business_ops_base}
          bonus={breakdown.business_ops_bonus}
          locked={!isSubscribed && breakdown.business_ops_bonus === 0}
          lockMessage="Unlock brand presence, client acquisition, and team collaboration metrics with Organisation"
        />

        {/* Bucket 3 */}
        <ScoreBucket
          title="Growth & Expansion"
          score={breakdown.growth_expansion}
          max={isSubscribed ? 20 : 15}
          base={breakdown.growth_base}
          bonus={breakdown.growth_bonus}
          locked={!isSubscribed && breakdown.growth_bonus === 0}
          lockMessage="Unlock team growth, momentum, and geographic expansion metrics with Organisation"
        />

        {/* Bucket 4 */}
        <ScoreBucket
          title="Professional Standards"
          score={breakdown.professional_standards}
          max={isSubscribed ? 15 : 10}
          base={breakdown.professional_standards_base}
          bonus={breakdown.professional_standards_bonus}
          locked={!isSubscribed && breakdown.professional_standards_bonus === 0}
          lockMessage="Unlock business verification and safeguarding certification with Organisation"
        />
      </div>

      {!isSubscribed && (
        <div className="upgrade-cta">
          <h3>Unlock Advanced Business Tools</h3>
          <p>
            Organisation features help you scale from solo recruiter to business owner.
            Unlock up to +{breakdown.total_org_bonus_points} bonus points by using team management,
            brand building, and business growth tools.
          </p>
          <button className="btn-primary" onClick={() => router.push('/organisation/upgrade')}>
            Explore Organisation Features
          </button>
        </div>
      )}

      {isSubscribed && score < 85 && (
        <div className="improvement-tips">
          <h3>🎯 Reach Elite Status (85+)</h3>
          <ImprovementSuggestions breakdown={breakdown} />
        </div>
      )}
    </div>
  );
}
```

---

## Success Metrics & KPIs

### Primary Metrics

1. **Subscription Conversion Rate**
   - Target: 25% of agents with 50+ score upgrade to organisation
   - Measure: % of agents who subscribe within 90 days of reaching 50 points

2. **Monthly Recurring Revenue (MRR)**
   - Target: £5,000 MRR in Q1, £15,000 MRR in Q2
   - Measure: Starter (£49) + Pro (£99) subscriptions

3. **Agent Score Distribution**
   - Target: 50% of subscribed agents reach 70+, 25% reach 85+
   - Measure: Histogram of agent scores, segmented by subscription status

### Secondary Metrics

4. **Feature Adoption Rate**
   - Team dashboard usage: 80% of subscribed agents
   - Org public page creation: 70% of subscribed agents
   - Team collaboration (internal referrals): 40% of subscribed agents

5. **Organisation Team Size**
   - Average team size: 8 members (Starter), 15 members (Pro)
   - Growth rate: +3 members per month per org

6. **Agent Retention**
   - 6-month retention: 75% (subscribed agents)
   - 12-month retention: 60% (subscribed agents)

---

## Rollout Plan

### Phase 1: Foundation (Weeks 1-3)
- [ ] Database migrations (subscriptions, tracking tables, RPC functions)
- [ ] Backend: Implement `AgentCaaSStrategy` class
- [ ] Backend: Update CaaS service router
- [ ] Backend: Subscription management API endpoints

### Phase 2: Testing & Refinement (Weeks 4-5)
- [ ] Unit tests for scoring logic
- [ ] Integration tests with sample agent data
- [ ] Manual QA with real agent profiles (staging)
- [ ] Adjust scoring thresholds based on data distribution

### Phase 3: UI/UX Implementation (Weeks 6-7)
- [ ] Agent dashboard score card
- [ ] Score breakdown UI with locked/unlocked states
- [ ] Organisation upgrade flow
- [ ] Improvement suggestions component

### Phase 4: Soft Launch (Week 8)
- [ ] Enable for 10% of agents (A/B test)
- [ ] Monitor conversion rates and engagement
- [ ] Collect feedback via in-app surveys
- [ ] Iterate on messaging and UI

### Phase 5: Full Launch (Week 9-10)
- [ ] Roll out to 100% of agents
- [ ] Email campaign: "Introducing Agent Credibility Scores"
- [ ] Help centre documentation update
- [ ] Support team training

### Phase 6: Optimization (Ongoing)
- [ ] Monitor KPIs weekly
- [ ] A/B test upgrade CTAs
- [ ] Refine scoring thresholds based on data
- [ ] Add new org features to drive further engagement

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Low conversion** | Revenue target missed | A/B test CTAs, offer 14-day free trial, show ROI calculator |
| **Agent backlash** | Negative sentiment | Clear communication, grandfather existing high-score agents for 3 months |
| **Gaming/fraud** | Score inflation | Manual review for agents with rapid score increases, activity thresholds |
| **Technical delays** | Launch postponed | Phase rollout, launch base scoring first, add org bonuses later |
| **Feature complexity** | Low adoption | Onboarding wizard, video tutorials, dedicated support |

---

## Appendix: Pricing Justification

### Organisation Starter (£49/month)

**Value Delivered**:
- Public organisation page (SEO value: ~£20/month equivalent)
- Team management dashboard (SaaS value: ~£15/month)
- Booking system & analytics (SaaS value: ~£10/month)
- +25 CaaS bonus points potential (elite status unlock)

**ROI for Agent**:
- If org features help acquire just 2 additional direct clients/month
- At average booking value of £50, agent earns £100 extra revenue
- After 5% platform fee, net gain: £95/month
- Subscription cost: £49/month
- **Net profit: +£46/month**

### Organisation Pro (£99/month)

**Value Delivered**:
- All Starter features
- Unlimited team members
- Advanced analytics & reporting
- Custom domain for org page
- API access for integrations
- Priority support

**ROI for Agent**:
- For agencies with 15+ tutors
- Org features help optimize team utilization, reduce churn
- If features increase team revenue by just 2%, breakeven
- Example: Team generating £5,000/month → 2% = £100 → covers subscription

---

## Document Status

**Status**: ✅ Final Proposal - Ready for Implementation
**Next Steps**:
1. Review with product and engineering leadership
2. Finalize pricing tiers with business team
3. Create implementation tickets
4. Assign engineering resources
5. Begin Phase 1 development

**Contact**: Product team for questions or feedback

---

**End of Design Document**

# Universal CaaS Model - Comprehensive Specification

**Document Version:** 2.0
**Created:** 2026-01-22
**Author:** System Architect
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design Principles](#design-principles)
3. [Model Architecture](#model-architecture)
4. [Bucket Specifications](#bucket-specifications)
5. [Verification System](#verification-system)
6. [Scoring Examples](#scoring-examples)
7. [Implementation Guide](#implementation-guide)
8. [Migration Strategy](#migration-strategy)
9. [Testing Plan](#testing-plan)
10. [References](#references)

---

## Executive Summary

### What is CaaS?

**Credibility as a Service (CaaS)** is TutorWise's universal scoring system that quantifies user credibility across the platform. Every user—tutor, client, or agent—receives a score from 0-100 that reflects their platform engagement, qualifications, network, trustworthiness, digital integration, and community impact.

### Key Innovation: Universal 6-Bucket Model

This specification introduces a **universal 6-bucket architecture** that works for all user roles using the same framework but with role-specific metric implementations.

**Before (v5.9):**
- 3 separate strategies with different bucket counts
- Inconsistent gate logic (tutor has onboarding bridge, client/agent don't)
- Hard bucket ceilings preventing differentiation
- Client/Agent stuck at 0/100 after onboarding

**After (v6.0 - Universal Model):**
- 1 universal strategy with 6 buckets for all roles
- Consistent onboarding bridge for all roles
- No hard ceilings—high performers can differentiate
- Provisional scoring for everyone (no more 0/100)
- Verification multipliers incentivize identity verification

---

## Design Principles

### 1. Universal Architecture, Role-Specific Metrics

**Same buckets, different metrics:**
```
All roles use: Delivery + Credentials + Network + Trust + Digital + Impact

Tutor Delivery = Teaching sessions + ratings
Client Delivery = Booking completion + consistency
Agent Delivery = Same as tutor (agents ARE tutors)
```

### 2. No Hard Ceilings

**Old approach (capped):**
```typescript
const score = Math.min(bookings * 2, 25); // CAPPED at 25
// Problem: 50 bookings = 500 bookings = 25 points
```

**New approach (weighted normalization):**
```typescript
const rawScore = bookings * 2; // Unbounded
const normalized = Math.min((rawScore / maxExpected) * 100, 100);
const weighted = normalized * bucketWeight;
// Result: 50 bookings = 60 points, 500 bookings = 95 points
```

### 3. Provisional Scoring

All users get baseline points after onboarding, not 0/100:
- **Tutor:** 40 pts delivery + 15 pts credentials = ~38/100 (× 0.70 provisional multiplier)
- **Client:** 30 pts delivery = ~21/100 (× 0.70 provisional multiplier)
- **Agent:** Same as tutor

### 4. Verification Incentive

Progressive multipliers encourage verification:
- **Provisional (0.70):** After onboarding, before verification → 70% of score
- **Identity (0.85):** Identity verified → 85% of score
- **Full (1.00):** All verifications complete → 100% of score

### 5. Agents = Tutors Who Recruit

Agents are not a separate business entity. They are tutors with recruiting responsibilities:
- Same delivery metrics (teaching sessions)
- Same credentials (academic qualifications)
- Bonus network points for referrals made

---

## Model Architecture

### Bucket Weight Distribution

| Bucket | Weight | Rationale |
|--------|--------|-----------|
| **Delivery** | 40% | Core value delivery—most important signal |
| **Credentials** | 20% | Qualifications establish baseline authority |
| **Network** | 15% | Connections and referrals show reach |
| **Trust** | 10% | Verification builds platform safety |
| **Digital** | 10% | Integration shows commitment and professionalism |
| **Impact** | 5% | Community contribution (give back) |
| **TOTAL** | **100%** | Weighted sum of normalized bucket scores |

### Verification Multipliers

| Status | Conditions | Multiplier | Impact |
|--------|-----------|------------|--------|
| **Provisional** | `onboarding_completed = true`<br>AND `identity_verified = false` | 0.70 | 70% of weighted score |
| **Identity** | `identity_verified = true` | 0.85 | 85% of weighted score (+21% boost) |
| **Full** | `identity_verified = true`<br>AND `email_verified = true`<br>AND `phone_verified = true`<br>AND `background_check_completed = true` | 1.00 | 100% of weighted score (+18% boost) |

### Score Calculation Flow

```
1. Gate Check
   └─> Must have: onboarding_completed = true OR identity_verified = true
       └─> PASS: Continue to step 2
       └─> FAIL: Return 0/100 with gate message

2. Calculate Raw Bucket Scores (0-100 each)
   ├─> Delivery (role-specific implementation)
   ├─> Credentials (role-specific implementation)
   ├─> Network (universal implementation)
   ├─> Trust (universal implementation)
   ├─> Digital (role-specific implementation)
   └─> Impact (role-specific implementation)

3. Apply Bucket Weights
   └─> Weighted Score = Σ(bucket_score × bucket_weight)
       └─> Example: (85 × 0.40) + (100 × 0.20) + (36 × 0.15) + (100 × 0.10) + (100 × 0.10) + (50 × 0.05)
       └─> Result: 34 + 20 + 5.4 + 10 + 10 + 2.5 = 81.9

4. Apply Verification Multiplier
   └─> Final Score = Weighted Score × Verification Multiplier
       └─> Example: 81.9 × 0.85 (identity verified) = 69.6
       └─> Rounded: 70/100

5. Return Result
   └─> total: 70
   └─> breakdown: { buckets, weights, multiplier, final }
```

---

## Bucket Specifications

### BUCKET 1: DELIVERY (40%)

**Purpose:** Measures core value delivery on the platform

#### Tutor Delivery

**Metrics:**
- Completed teaching sessions (volume)
- Average rating (quality)

**Scoring Formula:**
```typescript
// Provisional baseline (if no sessions yet)
if (completedSessions === 0) return 40;

// Volume score (0-70 points, logarithmic curve)
// 100 sessions = 100% benchmark
const volumeScore = Math.min(
  (Math.log10(completedSessions + 1) / Math.log10(100)) * 70,
  70
);

// Rating score (0-30 points, linear)
const ratingScore = (averageRating / 5.0) * 30;

// Total (max 100)
return Math.min(volumeScore + ratingScore, 100);
```

**Examples:**
| Sessions | Avg Rating | Volume | Rating | Total |
|----------|-----------|--------|--------|-------|
| 0 | 0.0 | 0 | 0 | **40** (provisional) |
| 10 | 4.5 | 35 | 27 | **62** |
| 50 | 4.8 | 56 | 28.8 | **84.8** |
| 100 | 5.0 | 70 | 30 | **100** |
| 500 | 4.9 | 70 | 29.4 | **99.4** |

**Key Insight:** No ceiling on volume—500 sessions scores higher than 50 sessions.

#### Client Delivery

**Metrics:**
- Booking completion rate (quality)
- Total bookings completed (consistency)

**Scoring Formula:**
```typescript
// Provisional baseline (if no bookings yet)
if (totalBookings === 0) return 30;

// Completion rate score (0-60 points)
const completionRate = completedBookings / totalBookings;
const completionScore = completionRate * 60;

// Volume score (0-40 points, logarithmic curve)
// 50 bookings = 100% benchmark
const volumeScore = Math.min(
  (Math.log10(completedBookings + 1) / Math.log10(50)) * 40,
  40
);

// Total (max 100)
return Math.min(completionScore + volumeScore, 100);
```

**Examples:**
| Total | Completed | Rate | Rate Score | Volume | Total |
|-------|-----------|------|------------|--------|-------|
| 0 | 0 | 0% | 0 | 0 | **30** (provisional) |
| 10 | 9 | 90% | 54 | 23 | **77** |
| 30 | 27 | 90% | 54 | 32 | **86** |
| 50 | 48 | 96% | 57.6 | 40 | **97.6** |
| 100 | 95 | 95% | 57 | 40 | **97** |

**Key Insight:** Completion rate matters more than volume—better to complete 9/10 than 50/100.

#### Agent Delivery

**Implementation:**
```typescript
// Agents ARE tutors, so use same teaching delivery metrics
return this.calcTutorDelivery(profile, supabase);
```

**Rationale:** Agents deliver value through teaching, not business operations. The organisation entity (not the agent profile) is scored on business metrics.

---

### BUCKET 2: CREDENTIALS (20%)

**Purpose:** Establishes baseline authority and expertise

#### Tutor Credentials

**Metrics:**
- Academic qualifications (undergraduate, masters, PhD)
- Certifications
- Years of teaching experience

**Scoring Formula:**
```typescript
let score = 0;

// 1. Academic qualifications (0-40 points)
if (hasPhD) score += 40;
else if (hasMasters) score += 30;
else if (hasUndergrad) score += 20;
else {
  // Provisional: Check onboarding data
  if (onboardingEducation === 'phd') score += 15;
  else if (onboardingEducation === 'masters') score += 10;
  else if (onboardingEducation === 'undergraduate') score += 5;
}

// 2. Certifications (0-30 points, 10 pts each)
score += Math.min(certificationCount * 10, 30);

// 3. Teaching experience (0-30 points, 6 pts per year)
score += Math.min(yearsExperience * 6, 30);

return Math.min(score, 100);
```

**Examples:**
| Degree | Verified? | Certs | Years | Degree Pts | Cert Pts | Exp Pts | Total |
|--------|-----------|-------|-------|------------|----------|---------|-------|
| PhD | ❌ Onboarding | 0 | 2 | 15 | 0 | 12 | **27** |
| PhD | ✅ Verified | 2 | 5 | 40 | 20 | 30 | **90** |
| Masters | ✅ Verified | 1 | 3 | 30 | 10 | 18 | **58** |
| Undergrad | ✅ Verified | 3 | 10 | 20 | 30 | 30 | **80** |

**Key Insight:** Provisional points from onboarding data ensure new tutors don't start at 0.

#### Client Credentials

**Metrics:**
- Profile completeness (bio, avatar, location)
- Reviews given (engagement quality)

**Scoring Formula:**
```typescript
let score = 0;

// 1. Profile completeness (0-50 points)
if (bio && bio.length > 50) score += 20;
if (avatarUrl) score += 15;
if (location) score += 15;

// 2. Reviews given (0-50 points, 10 pts each)
score += Math.min(reviewsGivenCount * 10, 50);

return Math.min(score, 100);
```

**Examples:**
| Bio | Avatar | Location | Reviews | Profile | Reviews | Total |
|-----|--------|----------|---------|---------|---------|-------|
| ✅ | ✅ | ✅ | 0 | 50 | 0 | **50** |
| ✅ | ✅ | ✅ | 3 | 50 | 30 | **80** |
| ✅ | ❌ | ❌ | 5 | 20 | 50 | **70** |
| ✅ | ✅ | ✅ | 5+ | 50 | 50 | **100** |

**Key Insight:** Clients build credentials through profile quality and community participation (reviews).

#### Agent Credentials

**Implementation:**
```typescript
// Agents ARE tutors, so use same academic credentials
return this.calcTutorCredentials(profile, supabase);
```

**Rationale:** Agents have the same teaching qualifications as tutors.

---

### BUCKET 3: NETWORK (15%) - UNIVERSAL

**Purpose:** Measures connections, referrals, and platform reach

**Metrics (Same for All Roles):**
- Social connections (profile_graph relationships)
- Referrals made (agent_id in referrals table)
- Referrals received (referred_profile_id in referrals table)

**Scoring Formula:**
```typescript
let score = 0;

// 1. Social connections (0-30 points, 5 pts each)
score += Math.min(socialConnectionsCount * 5, 30);

// 2. Referrals MADE (0-35 points, 7 pts each)
score += Math.min(referralsMadeCount * 7, 35);

// 3. Referrals RECEIVED (0-35 points, 7 pts each)
score += Math.min(referralsReceivedCount * 7, 35);

return Math.min(score, 100);
```

**Examples:**
| Role | Social | Made | Received | Social Pts | Made Pts | Received Pts | Total |
|------|--------|------|----------|------------|----------|--------------|-------|
| Tutor | 3 | 0 | 2 | 15 | 0 | 14 | **29** |
| Client | 2 | 1 | 1 | 10 | 7 | 7 | **24** |
| Agent | 5 | 10 | 3 | 25 | 35 (capped) | 21 | **81** |
| Active Agent | 6+ | 15+ | 5+ | 30 (capped) | 35 (capped) | 35 (capped) | **100** |

**Key Insight:**
- Everyone can make and receive referrals
- Agents naturally score higher due to recruiting activity
- No role-specific logic—truly universal bucket

---

### BUCKET 4: TRUST (10%) - UNIVERSAL

**Purpose:** Establishes safety and verification status

**Metrics (Same for All Roles):**
- Onboarding completion
- Identity verification
- Email verification
- Phone verification
- Background check completion

**Scoring Formula:**
```typescript
let score = 0;

// Onboarding completion (0-30 points)
if (onboardingCompleted) score += 30;

// Identity verification (0-40 points)
if (identityVerified) score += 40;

// Additional verifications (0-30 points total)
if (emailVerified) score += 10;
if (phoneVerified) score += 10;
if (backgroundCheckCompleted) score += 10;

return Math.min(score, 100);
```

**Examples:**
| Status | Onboarding | Identity | Email | Phone | Background | Total |
|--------|-----------|----------|-------|-------|------------|-------|
| New user | ❌ | ❌ | ❌ | ❌ | ❌ | **0** (gate blocks) |
| Post-onboarding | ✅ | ❌ | ❌ | ❌ | ❌ | **30** |
| Identity verified | ✅ | ✅ | ❌ | ❌ | ❌ | **70** |
| Fully verified | ✅ | ✅ | ✅ | ✅ | ✅ | **100** |

**Key Insight:** Trust bucket directly feeds into verification multiplier calculation.

---

### BUCKET 5: DIGITAL (10%)

**Purpose:** Measures platform integration and technology adoption

#### Tutor Digital

**Metrics:**
- Integration links (Google Calendar, Google Classroom, etc.)
- Recording URLs (Lessonspace usage)

**Scoring Formula:**
```typescript
let score = 0;

// Integrations (0-60 points, 20 pts each)
score += Math.min(integrationLinksCount * 20, 60);

// Recording URLs (0-40 points, 10 pts each)
score += Math.min(recordingURLsCount * 10, 40);

return Math.min(score, 100);
```

**Examples:**
| Integrations | Recordings | Integration Pts | Recording Pts | Total |
|--------------|-----------|-----------------|---------------|-------|
| 0 | 0 | 0 | 0 | **0** |
| 2 | 5 | 40 | 40 (capped) | **80** |
| 3+ | 10+ | 60 (capped) | 40 (capped) | **100** |

#### Client Digital

**Metrics:**
- Integration links only (no recording URLs for clients)

**Scoring Formula:**
```typescript
let score = 0;

// Integrations (0-60 points, 20 pts each)
score += Math.min(integrationLinksCount * 20, 60);

return Math.min(score, 100);
```

**Examples:**
| Integrations | Integration Pts | Total |
|--------------|-----------------|-------|
| 0 | 0 | **0** |
| 1 | 20 | **20** |
| 2 | 40 | **40** |
| 3+ | 60 (capped) | **60** |

#### Agent Digital

**Implementation:**
```typescript
// Agents ARE tutors, same digital metrics
return this.calcTutorDigital(profile, supabase);
```

---

### BUCKET 6: IMPACT (5%)

**Purpose:** Rewards community contribution and giving back

#### Tutor Impact

**Metrics:**
- Free help sessions delivered

**Scoring Formula:**
```typescript
// 10 points per free help session delivered
const freeHelpGivenCount = /* count of type='free_help' bookings as tutor */;
return Math.min(freeHelpGivenCount * 10, 100);
```

**Examples:**
| Free Help Sessions | Points | Raw Score | Impact Contribution (× 0.05) |
|--------------------|--------|-----------|------------------------------|
| 0 | 0 | **0** | 0 |
| 2 | 20 | **20** | 1.0 |
| 5 | 50 | **50** | 2.5 |
| 10+ | 100 | **100** | 5.0 |

#### Client Impact

**Metrics:**
- Free help sessions taken (helps new tutors improve)

**Scoring Formula:**
```typescript
// 10 points per free help session taken
const freeHelpTakenCount = /* count of type='free_help' bookings as client */;
return Math.min(freeHelpTakenCount * 10, 100);
```

**Rationale:** Clients taking free help sessions help new tutors gain experience and improve their teaching skills. This is a valuable community contribution.

**Examples:**
| Free Help Sessions Taken | Points | Raw Score | Impact Contribution (× 0.05) |
|--------------------------|--------|-----------|------------------------------|
| 0 | 0 | **0** | 0 |
| 2 | 20 | **20** | 1.0 |
| 5 | 50 | **50** | 2.5 |
| 10+ | 100 | **100** | 5.0 |

#### Agent Impact

**Implementation:**
```typescript
// Agents ARE tutors, same impact metrics (free help delivered)
return this.calcTutorImpact(profile, supabase);
```

---

## Verification System

### Gate Logic

**Before calculating any score, check gate:**

```typescript
const hasCompletedOnboarding = profile.onboarding_progress?.onboarding_completed === true;
const isIdentityVerified = profile.identity_verified === true;

if (!isIdentityVerified && !hasCompletedOnboarding) {
  return {
    total: 0,
    breakdown: {
      gate: 'Complete onboarding or verify identity to unlock CaaS score',
    },
  };
}
```

**Gate Pass Conditions (OR logic):**
- `onboarding_completed = true` (onboarding bridge)
- `identity_verified = true` (bypass onboarding)

### Verification Multiplier Calculation

```typescript
function getVerificationMultiplier(profile: CaaSProfile): number {
  // Full verification check
  const isFullyVerified =
    profile.identity_verified &&
    profile.email_verified &&
    profile.phone_verified &&
    profile.background_check_completed;

  if (isFullyVerified) return 1.00; // Full multiplier

  // Identity verification check
  if (profile.identity_verified) return 0.85; // Identity multiplier

  // Provisional (passed gate via onboarding only)
  return 0.70; // Provisional multiplier
}
```

### Verification Status Labels

| Multiplier | Label | Display Badge |
|------------|-------|---------------|
| 0.70 | `provisional` | 🟡 Provisional Score |
| 0.85 | `identity` | 🟢 Identity Verified |
| 1.00 | `full` | ✅ Fully Verified |

### Incentive Structure

**Example: User with 50/100 weighted score**

| Status | Multiplier | Final Score | Boost from Previous |
|--------|------------|-------------|---------------------|
| Provisional | × 0.70 | **35/100** | — |
| Identity verified | × 0.85 | **42/100** | **+7 points** (+20%) |
| Fully verified | × 1.00 | **50/100** | **+8 points** (+19%) |

**Total boost from provisional to full:** +15 points (+43% increase)

---

## Scoring Examples

### Example 1: New Tutor (Just Completed Onboarding)

**Profile:**
- Role: Tutor
- Completed onboarding: ✅
- Identity verified: ❌
- Teaching sessions: 0
- Qualifications: PhD (from onboarding data, not verified)
- Connections: 0
- Integrations: 0

**Bucket Calculations:**

| Bucket | Raw Score Calculation | Raw Score | × Weight | Weighted |
|--------|----------------------|-----------|----------|----------|
| **Delivery** | Provisional baseline (0 sessions) | 40 | × 0.40 | **16.0** |
| **Credentials** | Provisional PhD (15) + 0 certs + 0 years | 15 | × 0.20 | **3.0** |
| **Network** | 0 connections + 0 made + 0 received | 0 | × 0.15 | **0.0** |
| **Trust** | Onboarding (30) only | 30 | × 0.10 | **3.0** |
| **Digital** | 0 integrations + 0 recordings | 0 | × 0.10 | **0.0** |
| **Impact** | 0 free help sessions | 0 | × 0.05 | **0.0** |
| **Weighted Total** | — | — | — | **22.0** |

**Final Score:**
```
Weighted Score: 22.0
Verification Multiplier: 0.70 (provisional)
Final Score: 22.0 × 0.70 = 15.4 → 15/100
```

**Status:** 🟡 Provisional Score (15/100)

---

### Example 2: Experienced Tutor (100 sessions, 4.8★, verified)

**Profile:**
- Role: Tutor
- Completed onboarding: ✅
- Identity verified: ✅
- Email/Phone/Background: ✅ ✅ ✅ (fully verified)
- Teaching sessions: 100 completed, 4.8★ average
- Qualifications: PhD (verified), 3 certifications, 5 years experience
- Network: 3 social connections, 2 referrals received
- Integrations: 2 (Google Calendar, Classroom)
- Recordings: 40 sessions with recordings
- Free help: 5 sessions delivered

**Bucket Calculations:**

| Bucket | Raw Score Calculation | Raw Score | × Weight | Weighted |
|--------|----------------------|-----------|----------|----------|
| **Delivery** | Volume: log₁₀(100) = 70<br>Rating: (4.8/5.0) × 30 = 28.8<br>Total: 98.8 | 98.8 | × 0.40 | **39.5** |
| **Credentials** | PhD (40) + 3 certs (30) + 5 years (30) = 100 | 100 | × 0.20 | **20.0** |
| **Network** | 3 social (15) + 0 made + 2 received (14) = 29 | 29 | × 0.15 | **4.35** |
| **Trust** | Onboarding (30) + Identity (40) + Email (10) + Phone (10) + Background (10) = 100 | 100 | × 0.10 | **10.0** |
| **Digital** | 2 integrations (40) + 40 recordings (40) = 80 | 80 | × 0.10 | **8.0** |
| **Impact** | 5 free help (50) | 50 | × 0.05 | **2.5** |
| **Weighted Total** | — | — | — | **84.35** |

**Final Score:**
```
Weighted Score: 84.35
Verification Multiplier: 1.00 (fully verified)
Final Score: 84.35 × 1.00 = 84.35 → 84/100
```

**Status:** ✅ Fully Verified (84/100)

---

### Example 3: Active Client (30 bookings, 90% completion, identity verified)

**Profile:**
- Role: Client
- Completed onboarding: ✅
- Identity verified: ✅
- Email/Phone: ✅ ✅
- Background: ❌
- Bookings: 30 total, 27 completed (90% completion rate)
- Profile: Complete bio, avatar, location
- Reviews given: 3
- Network: 2 social connections, 1 referral received
- Integrations: 2 (Google Calendar, Classroom)
- Free help: 2 sessions taken

**Bucket Calculations:**

| Bucket | Raw Score Calculation | Raw Score | × Weight | Weighted |
|--------|----------------------|-----------|----------|----------|
| **Delivery** | Completion: 0.90 × 60 = 54<br>Volume: log₁₀(27) → 30<br>Total: 84 | 84 | × 0.40 | **33.6** |
| **Credentials** | Bio (20) + Avatar (15) + Location (15) + 3 reviews (30) = 80 | 80 | × 0.20 | **16.0** |
| **Network** | 2 social (10) + 0 made + 1 received (7) = 17 | 17 | × 0.15 | **2.55** |
| **Trust** | Onboarding (30) + Identity (40) + Email (10) + Phone (10) = 90 | 90 | × 0.10 | **9.0** |
| **Digital** | 2 integrations (40) | 40 | × 0.10 | **4.0** |
| **Impact** | 2 free help taken (20) | 20 | × 0.05 | **1.0** |
| **Weighted Total** | — | — | — | **66.15** |

**Final Score:**
```
Weighted Score: 66.15
Verification Multiplier: 0.85 (identity verified, not fully verified)
Final Score: 66.15 × 0.85 = 56.23 → 56/100
```

**Status:** 🟢 Identity Verified (56/100)

**Potential Boost:** If client completes background check → 66/100 (+10 points, +18% boost)

---

### Example 4: Agent/Recruiter (50 sessions, 10 referrals made, fully verified)

**Profile:**
- Role: Agent
- Completed onboarding: ✅
- Fully verified: ✅ ✅ ✅ ✅
- Teaching sessions: 50 completed, 4.9★ average
- Qualifications: Masters (verified), 2 certifications, 4 years experience
- Network: 4 social connections, **10 referrals made**, 2 received
- Integrations: 3
- Recordings: 30 sessions
- Free help: 3 sessions delivered

**Bucket Calculations:**

| Bucket | Raw Score Calculation | Raw Score | × Weight | Weighted |
|--------|----------------------|-----------|----------|----------|
| **Delivery** | Volume: log₁₀(50) → 56<br>Rating: (4.9/5.0) × 30 = 29.4<br>Total: 85.4 | 85.4 | × 0.40 | **34.16** |
| **Credentials** | Masters (30) + 2 certs (20) + 4 years (24) = 74 | 74 | × 0.20 | **14.8** |
| **Network** | 4 social (20) + **10 made (35, capped)** + 2 received (14) = 69 | 69 | × 0.15 | **10.35** |
| **Trust** | Full verification (100) | 100 | × 0.10 | **10.0** |
| **Digital** | 3 integrations (60) + 30 recordings (30) = 90 | 90 | × 0.10 | **9.0** |
| **Impact** | 3 free help (30) | 30 | × 0.05 | **1.5** |
| **Weighted Total** | — | — | — | **79.81** |

**Final Score:**
```
Weighted Score: 79.81
Verification Multiplier: 1.00 (fully verified)
Final Score: 79.81 × 1.00 = 79.81 → 80/100
```

**Status:** ✅ Fully Verified (80/100)

**Key Insight:** Agent's 10 referrals made contribute 35 points to network bucket (capped). This is 10.35 weighted points—equivalent to 52 teaching sessions' worth of delivery points!

---

### Example 5: Comparison - Same Weighted Score, Different Verification

**Scenario:** Three users with identical platform activity, different verification levels

**Profile (All Identical):**
- 30 completed sessions, 4.5★ rating
- Masters degree, 1 cert, 3 years experience
- 2 social connections, 1 referral received
- 1 integration
- 0 free help sessions

**Bucket Calculations (Identical for All):**

| Bucket | Raw Score | × Weight | Weighted |
|--------|-----------|----------|----------|
| Delivery | 76 | × 0.40 | 30.4 |
| Credentials | 63 | × 0.20 | 12.6 |
| Network | 17 | × 0.15 | 2.55 |
| Trust | Variable | × 0.10 | Variable |
| Digital | 20 | × 0.10 | 2.0 |
| Impact | 0 | × 0.05 | 0.0 |

**Comparison:**

| User | Trust Score | Trust Weighted | Total Weighted | Multiplier | Final Score |
|------|------------|----------------|----------------|------------|-------------|
| **User A** (Provisional) | 30 | 3.0 | **50.55** | 0.70 | **35/100** |
| **User B** (Identity) | 70 | 7.0 | **54.55** | 0.85 | **46/100** |
| **User C** (Full) | 100 | 10.0 | **57.55** | 1.00 | **58/100** |

**Insights:**
- Same activity, but 23-point spread (35 → 58) due to verification
- User C scores 65% higher than User A
- Verification incentive works: +11 points (A→B), +12 points (B→C)

---

## Implementation Guide

### File Structure

```
apps/web/src/lib/services/caas/
├── index.ts                          # Main CaaS service (orchestrator)
├── types.ts                          # TypeScript interfaces
├── strategies/
│   ├── universal.ts                  # NEW: Universal strategy for all roles
│   ├── tutor.ts                      # DEPRECATED: Legacy tutor strategy
│   ├── client.ts                     # DEPRECATED: Legacy client strategy
│   └── agent.ts                      # DEPRECATED: Legacy agent strategy
└── utils/
    └── scoring.ts                    # Shared scoring utilities
```

### Core Type Definitions

```typescript
// types.ts

export interface CaaSProfile {
  id: string;
  role: 'tutor' | 'client' | 'agent';

  // Verification fields
  identity_verified: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  background_check_completed: boolean;

  // Onboarding data
  onboarding_progress?: {
    onboarding_completed: boolean;
    highest_education?: 'undergraduate' | 'masters' | 'phd';
    years_experience?: number;
  };

  // Profile fields
  bio?: string;
  avatar_url?: string;
  location?: string;
  average_rating?: number;

  // Qualifications
  qualifications?: Array<{
    type: 'undergraduate' | 'masters' | 'phd' | 'certification' | 'business_license';
    verified: boolean;
  }>;
}

export interface CaaSResult {
  total: number; // Final score 0-100
  breakdown: {
    gate?: string; // If gate fails
    role?: string;
    verification_status?: 'provisional' | 'identity' | 'full';
    multiplier?: number;
    raw_buckets?: Record<string, number>;
    weighted_buckets?: Record<string, number>;
    weighted_score?: number;
    final_score?: number;
  };
}

export interface CaaSStrategy {
  calculate(profile: CaaSProfile, supabase: SupabaseClient): Promise<CaaSResult>;
}
```

### Strategy Implementation

See [/Users/michaelquan/projects/tutorwise/apps/web/src/lib/services/caas/strategies/universal.ts](../../apps/web/src/lib/services/caas/strategies/universal.ts) for complete implementation.

**Key methods:**
- `calculate()` - Main entry point, orchestrates scoring
- `calcDelivery()` - Role-dispatched delivery metrics
- `calcCredentials()` - Role-dispatched credentials metrics
- `calcNetwork()` - Universal network metrics
- `calcTrust()` - Universal trust/verification metrics
- `calcDigital()` - Role-dispatched digital integration metrics
- `calcImpact()` - Role-dispatched community impact metrics
- `getVerificationMultiplier()` - Determines 0.70/0.85/1.00
- `getVerificationStatus()` - Returns 'provisional'/'identity'/'full'

### Service Integration

```typescript
// index.ts (simplified)

import { UniversalCaaSStrategy } from './strategies/universal';

export class CaaSService {
  private strategy: UniversalCaaSStrategy;

  constructor() {
    this.strategy = new UniversalCaaSStrategy();
  }

  async calculateScore(profileId: string, supabase: SupabaseClient): Promise<CaaSResult> {
    // 1. Fetch profile data
    const profile = await this.fetchProfile(profileId, supabase);

    // 2. Calculate using universal strategy
    const result = await this.strategy.calculate(profile, supabase);

    // 3. Store result in caas_scores table
    await this.storeScore(profileId, result, supabase);

    return result;
  }
}
```

### Database Schema

**Existing tables used by CaaS:**

```sql
-- Profiles (source of truth)
profiles (
  id UUID PRIMARY KEY,
  role TEXT, -- 'tutor', 'client', 'agent'
  identity_verified BOOLEAN,
  email_verified BOOLEAN,
  phone_verified BOOLEAN,
  background_check_completed BOOLEAN,
  onboarding_progress JSONB,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  average_rating NUMERIC
)

-- CaaS scores (cached results)
caas_scores (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id),
  score NUMERIC NOT NULL,
  breakdown JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
)

-- CaaS recalculation queue (event-driven updates)
caas_recalculation_queue (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID UNIQUE REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Supporting tables
bookings (id, client_id, tutor_id, agent_id, status, payment_status, type, recording_url)
listings (id, profile_id, status)
referrals (id, agent_id, referred_profile_id, status)
reviews (id, giver_id, receiver_id, rating)
profile_graph (id, source_id, target_id, relationship_type)
student_integration_links (id, profile_id, integration_type)
```

---

## Migration Strategy

### Phase 1: Parallel Deployment (Week 1)

**Goal:** Deploy UniversalCaaSStrategy alongside existing strategies for testing

**Steps:**
1. Deploy `universal.ts` strategy file
2. Update CaaS service to support strategy selection:
   ```typescript
   const strategy = useUniversal
     ? new UniversalCaaSStrategy()
     : this.getLegacyStrategy(role);
   ```
3. Add feature flag: `ENABLE_UNIVERSAL_CAAS_MODEL`
4. Test on staging with sample profiles

**Success Criteria:**
- ✅ UniversalCaaSStrategy calculates scores without errors
- ✅ Score breakdowns include all 6 buckets
- ✅ Verification multipliers apply correctly
- ✅ No performance regressions (< 500ms per calculation)

---

### Phase 2: Staged Rollout (Week 2)

**Goal:** Gradually enable universal model for users

**Rollout Plan:**

| Day | Cohort | % of Users | Flag |
|-----|--------|-----------|------|
| Mon | Internal team | ~10 users | `team_members = true` |
| Tue | New users (onboarding after today) | ~5% | `created_at > '2026-01-27'` |
| Wed | Low-activity users (<10 sessions) | ~20% | `session_count < 10` |
| Thu | Medium-activity users (10-50 sessions) | ~40% | `session_count BETWEEN 10 AND 50` |
| Fri | All users | 100% | `ENABLE_UNIVERSAL_CAAS_MODEL = true` |

**Monitoring:**
- Track score distribution changes (histogram)
- Monitor API response times
- Watch for user feedback/support tickets
- Compare old vs new scores for sample profiles

**Rollback Plan:**
```typescript
// Emergency rollback: disable feature flag
process.env.ENABLE_UNIVERSAL_CAAS_MODEL = 'false';

// All users revert to legacy strategies immediately
```

---

### Phase 3: Legacy Deprecation (Week 3)

**Goal:** Remove old strategies and clean up code

**Steps:**
1. **Day 1:** Remove strategy selection logic, hardcode UniversalCaaSStrategy
2. **Day 2:** Delete legacy strategy files (tutor.ts, client.ts, agent.ts)
3. **Day 3:** Update all references and imports
4. **Day 4:** Remove feature flag from codebase
5. **Day 5:** Update documentation and API specs

**Cleanup Checklist:**
- [ ] Remove `getLegacyStrategy()` method
- [ ] Delete `apps/web/src/lib/services/caas/strategies/tutor.ts`
- [ ] Delete `apps/web/src/lib/services/caas/strategies/client.ts`
- [ ] Delete `apps/web/src/lib/services/caas/strategies/agent.ts`
- [ ] Remove `ENABLE_UNIVERSAL_CAAS_MODEL` feature flag
- [ ] Update API documentation
- [ ] Update dashboard UI to show new bucket names
- [ ] Announce model v6.0 to users

---

### Data Migration

**No database migration required** because:
- CaaS scores are cached, not source of truth
- Recalculation queue will automatically update all scores
- New model uses same `caas_scores` table schema

**Trigger recalculation for all users:**

```sql
-- Queue all active users for recalculation
INSERT INTO caas_recalculation_queue (profile_id)
SELECT id FROM profiles
WHERE onboarding_progress->>'onboarding_completed' = 'true'
   OR identity_verified = true
ON CONFLICT (profile_id) DO NOTHING;

-- Expected: ~5,000 users queued
-- Processing time: ~8 hours (100 per batch, every 10 min)
```

**Alternative: Force immediate recalculation (faster but higher load):**

```typescript
// Run during off-peak hours (2 AM UTC)
const profiles = await supabase
  .from('profiles')
  .select('id')
  .or('onboarding_progress->>onboarding_completed.eq.true,identity_verified.eq.true');

for (const profile of profiles.data) {
  await caasService.calculateScore(profile.id, supabase);
}

// Expected: ~5,000 calculations
// Processing time: ~30 minutes (with parallel processing)
```

---

## Testing Plan

### Unit Tests

**Strategy Tests (`universal.test.ts`):**

```typescript
describe('UniversalCaaSStrategy', () => {
  describe('Gate Logic', () => {
    it('should return 0 if onboarding incomplete and not verified', async () => {
      const profile = createMockProfile({
        onboarding_completed: false,
        identity_verified: false
      });
      const result = await strategy.calculate(profile, supabase);
      expect(result.total).toBe(0);
      expect(result.breakdown.gate).toBeDefined();
    });

    it('should pass gate with onboarding completed', async () => {
      const profile = createMockProfile({
        onboarding_completed: true,
        identity_verified: false
      });
      const result = await strategy.calculate(profile, supabase);
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('Verification Multipliers', () => {
    it('should apply 0.70 multiplier for provisional', async () => {
      // Weighted score = 50, multiplier = 0.70
      // Expected final = 35
    });

    it('should apply 0.85 multiplier for identity verified', async () => {
      // Weighted score = 50, multiplier = 0.85
      // Expected final = 42
    });

    it('should apply 1.00 multiplier for fully verified', async () => {
      // Weighted score = 50, multiplier = 1.00
      // Expected final = 50
    });
  });

  describe('Bucket Calculations', () => {
    describe('Delivery', () => {
      it('tutor: should return 40 provisional with 0 sessions', async () => {});
      it('tutor: should increase with session count', async () => {});
      it('tutor: should not cap at high session counts', async () => {});
      it('client: should return 30 provisional with 0 bookings', async () => {});
      it('agent: should use same logic as tutor', async () => {});
    });

    describe('Network', () => {
      it('should count social connections for all roles', async () => {});
      it('should count referrals made for all roles', async () => {});
      it('should count referrals received for all roles', async () => {});
      it('should not exceed 100 points', async () => {});
    });

    describe('Impact', () => {
      it('tutor: should count free help delivered', async () => {});
      it('client: should count free help taken', async () => {});
      it('agent: should use same logic as tutor', async () => {});
    });
  });
});
```

---

### Integration Tests

**End-to-End Tests (`caas-service.integration.test.ts`):**

```typescript
describe('CaaS Service Integration', () => {
  it('should calculate score for new tutor after onboarding', async () => {
    // 1. Create test profile with onboarding complete
    const profile = await createTestProfile({
      role: 'tutor',
      onboarding_completed: true,
      onboarding_education: 'phd',
    });

    // 2. Calculate score
    const result = await caasService.calculateScore(profile.id, supabase);

    // 3. Verify provisional score
    expect(result.total).toBeGreaterThan(0);
    expect(result.breakdown.verification_status).toBe('provisional');
    expect(result.breakdown.multiplier).toBe(0.70);
  });

  it('should update score when user verifies identity', async () => {
    // 1. Create profile with provisional score
    const profile = await createTestProfile({
      role: 'tutor',
      onboarding_completed: true,
    });
    const initialScore = await caasService.calculateScore(profile.id, supabase);

    // 2. Verify identity
    await supabase.from('profiles').update({ identity_verified: true }).eq('id', profile.id);

    // 3. Recalculate
    const updatedScore = await caasService.calculateScore(profile.id, supabase);

    // 4. Verify score increased
    expect(updatedScore.total).toBeGreaterThan(initialScore.total);
    expect(updatedScore.breakdown.multiplier).toBe(0.85);
  });

  it('should queue recalculation when listing published', async () => {
    // See CAAS_TRIGGER_OPTIMIZATION_2026.md for trigger tests
  });
});
```

---

### Acceptance Tests

**User Journey Tests:**

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **New Tutor Onboarding** | 1. Complete onboarding<br>2. View dashboard | Score > 0 (not 0/100)<br>Badge: "🟡 Provisional" |
| **Identity Verification Incentive** | 1. See provisional score<br>2. Click "Verify Identity"<br>3. Complete verification | Score increases by ~20%<br>Badge: "🟢 Identity Verified" |
| **High Performer Differentiation** | 1. Tutor A: 50 sessions<br>2. Tutor B: 500 sessions<br>3. Compare scores | Tutor B score > Tutor A score<br>(No ceiling effect) |
| **Client Social Impact** | 1. Client takes 3 free help sessions<br>2. View CaaS breakdown | Impact bucket shows 30 points<br>Tooltip: "Helping new tutors improve" |
| **Agent Network Boost** | 1. Agent makes 10 referrals<br>2. View CaaS breakdown | Network bucket shows high score<br>Tooltip: "10 referrals made" |

---

### Performance Tests

**Load Test Scenarios:**

```typescript
describe('Performance', () => {
  it('should calculate score in < 500ms', async () => {
    const start = Date.now();
    await caasService.calculateScore(profileId, supabase);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should handle 100 concurrent calculations', async () => {
    const promises = Array(100).fill(null).map(() =>
      caasService.calculateScore(randomProfileId(), supabase)
    );
    await expect(Promise.all(promises)).resolves.not.toThrow();
  });

  it('should batch recalculate 5000 users in < 10 hours', async () => {
    // Use worker pattern (100 per batch, 10 min interval)
    // Expected: 5000 / 100 = 50 batches
    // Time: 50 batches × 10 min = 500 min = 8.3 hours ✅
  });
});
```

**Database Query Optimization:**

```sql
-- Ensure indexes exist for fast CaaS queries
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_status ON bookings(tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_status ON bookings(client_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(type, status);
CREATE INDEX IF NOT EXISTS idx_referrals_agent ON referrals(agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_graph_source ON profile_graph(source_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_reviews_giver ON reviews(giver_id);
```

---

## References

### Related Documentation

- [CAAS_TRIGGER_OPTIMIZATION_2026.md](./CAAS_TRIGGER_OPTIMIZATION_2026.md) - Database trigger architecture
- Migration 075: `tools/database/migrations/075_create_caas_event_queue.sql`
- Migration 078: `tools/database/migrations/078_create_caas_auto_queue_triggers.sql`
- Migration 088: `tools/database/migrations/088_update_booking_triggers_for_caas_v5_9.sql`
- Migration 200: `tools/database/migrations/200_add_listing_publish_caas_trigger.sql`
- Migration 201: `tools/database/migrations/201_enhance_booking_payment_caas_trigger.sql`
- Migration 202: `tools/database/migrations/202_add_referral_caas_triggers.sql`

### Key Files

- **Strategy:** `apps/web/src/lib/services/caas/strategies/universal.ts`
- **Service:** `apps/web/src/lib/services/caas/index.ts`
- **Types:** `apps/web/src/lib/services/caas/types.ts`
- **Worker:** `apps/web/src/app/api/caas-worker/route.ts`

### External Resources

- [Wikipedia: Logarithmic Scale](https://en.wikipedia.org/wiki/Logarithmic_scale) - Used in volume scoring
- [Credibility Theory](https://en.wikipedia.org/wiki/Credibility_theory) - Theoretical foundation
- [FICO Score Model](https://www.myfico.com/credit-education/whats-in-your-credit-score) - Inspiration for weighted buckets

---

## Appendices

### Appendix A: Bucket Weight Rationale

**Why 40% for Delivery?**
- Delivery is the most direct signal of value creation
- Users who deliver more value should score higher
- This is the primary differentiator for platform quality

**Why 20% for Credentials?**
- Establishes baseline authority
- Important but not as dynamic as delivery
- Prevents credential-less users from scoring too low

**Why 15% for Network?**
- Network effects are valuable but secondary
- Referrals show trust and reach
- Should not dominate score (quality > quantity)

**Why 10% for Trust?**
- Verification is important for safety
- Enforced via multiplier (0.70 → 1.00)
- Bucket weight is supplementary

**Why 10% for Digital?**
- Integration is nice-to-have, not critical
- Shows commitment but not core value
- Prevents tech-savvy users from unfair advantage

**Why 5% for Impact?**
- Community contribution is valuable but rare
- Should be rewarded but not required
- Free help is optional, not mandatory

---

### Appendix B: Formula Derivations

**Logarithmic Volume Scoring:**

```
Goal: Reward high volume without linear growth
Formula: score = (log₁₀(count + 1) / log₁₀(benchmark)) × maxPoints

Example: Tutor sessions (benchmark = 100, max = 70)
- 1 session:   (log₁₀(2) / log₁₀(100)) × 70 = 15 pts
- 10 sessions:  (log₁₀(11) / log₁₀(100)) × 70 = 36 pts
- 50 sessions:  (log₁₀(51) / log₁₀(100)) × 70 = 60 pts
- 100 sessions: (log₁₀(101) / log₁₀(100)) × 70 = 70 pts (100%)
- 500 sessions: (log₁₀(501) / log₁₀(100)) × 70 = 70 pts (capped, but still 100%)

Curve characteristics:
- Steep early growth (1 → 10 sessions = +21 pts)
- Diminishing returns (50 → 100 sessions = +10 pts)
- Natural ceiling at benchmark value
```

**Verification Multiplier Progression:**

```
Goal: Incentivize verification with meaningful but not punitive multipliers

Baseline (onboarding only): 0.70
- Allows new users to see non-zero score
- 30% penalty creates clear incentive

Identity verified: 0.85
- +15% boost (0.70 → 0.85 = 21% relative increase)
- Significant reward for core verification
- Still room to grow (not maxed out)

Fully verified: 1.00
- +15% boost (0.85 → 1.00 = 18% relative increase)
- Maximum score unlocked
- Total boost: 43% (0.70 → 1.00)

Example impact on 50/100 weighted score:
- Provisional: 50 × 0.70 = 35/100
- Identity: 50 × 0.85 = 42/100 (+7 pts, +20%)
- Full: 50 × 1.00 = 50/100 (+8 pts, +19%)
```

---

### Appendix C: Comparison with Legacy Models

**Legacy Tutor Model (v5.9):**
```
Buckets: Performance (30), Qualifications (30), Network (20), Safety (10), Digital (10), Social Impact (10)
Total: 110 points (normalized to /100)
Issues:
- Hard caps prevent differentiation
- Onboarding bridge only for tutors
- Verification doesn't increase score
```

**Legacy Client Model (v5.9):**
```
Buckets: Verification (40), Booking History (40), Profile Completeness (20)
Total: 100 points
Issues:
- Hard gate (0/100 if not verified)
- No onboarding bridge
- No incentive to verify (40 pts OR nothing)
- Only 3 buckets (not comprehensive)
```

**Legacy Agent Model (v5.9):**
```
Buckets: Team Quality (25+10), Business Ops (20+10), Growth (15+5), Professional (10+5)
Total: 100 points (with org bonuses)
Issues:
- Hard gate (0/100 if not verified)
- Treats agents as businesses (wrong abstraction)
- Org bonuses misplaced (should be on org, not agent)
```

**Universal Model (v6.0):**
```
Buckets: Delivery (40%), Credentials (20%), Network (15%), Trust (10%), Digital (10%), Impact (5%)
Total: 100 points (weighted sum with multiplier)
Improvements:
✅ No hard caps (weighted normalization)
✅ Onboarding bridge for all roles
✅ Verification multipliers (0.70 → 0.85 → 1.00)
✅ Same architecture for all roles
✅ Agents = Tutors who recruit
✅ Provisional scoring (no 0/100 after onboarding)
```

---

### Appendix D: Future Enhancements

**Planned for v6.1:**
1. **Organisation CaaS Score**
   - Aggregate of member CaaS scores
   - Weighted by member role and activity
   - Formula: `Org_Score = Σ(member_score × member_weight) / total_weight`

2. **Dynamic Bucket Weights**
   - Allow admins to adjust weights per role
   - A/B test different configurations
   - Example: Boost "Impact" to 10% for community-focused periods

3. **Score History Tracking**
   - Store score snapshots over time
   - Show trend line in dashboard (↗️ +5 this month)
   - Identify score decay (inactive users)

4. **Personalized Improvement Tips**
   - Analyze bucket scores to suggest actions
   - "Complete 3 more sessions to reach 70/100"
   - "Verify your identity for +8 point boost"

5. **Leaderboards**
   - Top tutors by CaaS score (opt-in)
   - Top agents by referrals made
   - Monthly "Rising Star" awards

**Planned for v7.0:**
1. **Time-Decay Model**
   - Recent activity weighted more than old activity
   - Prevents inactive users from keeping high scores
   - Formula: `score × e^(-decay_rate × months_since_activity)`

2. **Penalty System**
   - Negative events decrease score
   - Canceled bookings, poor reviews, policy violations
   - Separate "reliability" sub-score

3. **Industry Benchmarking**
   - Compare CaaS scores to industry peers
   - "You're in the top 10% of Math tutors"
   - Subject-specific scoring

---

**END OF DOCUMENT**

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-22 | System Architect | Initial draft |
| 2.0 | 2026-01-22 | System Architect | Added comprehensive tables, examples, and implementation guide |

---

## Approval Signatures

**Technical Lead:** __________________ Date: __________

**Product Manager:** __________________ Date: __________

**Senior Architect:** __________________ Date: __________

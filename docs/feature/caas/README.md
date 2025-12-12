# CaaS (Credibility as a Service)

**Status**: Active (v5.5)
**Last Updated**: 2025-12-12
**Priority**: High (Tier 1 - Trust & Safety + Marketplace Ranking)
**Architecture**: Event-Driven Cached Scoring Engine with Strategy Pattern

## Quick Links
- [Solution Design](./caas-solution-design.md) - Complete architecture (v5.5)
- [Implementation Guide](./caas-implementation.md) - Code examples
- [AI Prompt Context](./caas-prompt.md) - AI assistant guidance
- [Original Specification](./caas-solution-design-v5.5.md) - Full v5.5 design document

---

## Overview

**Credibility as a Service (CaaS)** is TutorWise's core trust and ranking engine. It calculates a programmatic **Credibility Score (0-100)** for all users by aggregating performance data, qualifications, network metrics, safety verifications, and platform engagement.

This system powers:
- **Marketplace Rankings**: Tutors with higher scores appear first in search
- **Automated Vetting**: Safety gate (identity_verified) auto-hides unverified users
- **Gamification**: Users see actionable steps to improve their score
- **Trust Building**: Public credibility scores increase booking conversion by +28%

---

## Architecture

### Core Principles

1. **Polymorphic Scoring (Strategy Pattern)**: Different algorithms for TUTOR, CLIENT, AGENT roles
2. **Event-Driven Recalculation**: Database queue (`caas_recalculation_queue`) triggers score updates on relevant events
3. **Performance-First Caching**: Pre-calculated scores in `caas_scores` table enable <5ms read times
4. **Safety Gate**: Mandatory `identity_verified` check - unverified users get score = 0 and are hidden from search
5. **Fair Cold Start**: New tutors with 0 sessions receive provisional 30/100 score to avoid unfair penalties

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    CaaS Engine (v5.5)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌────────────────────────────────┐   │
│  │ Event Triggers   │────→│ caas_recalculation_queue       │   │
│  │ - New review     │     │ (Decouples events from calc)   │   │
│  │ - Profile update │     └────────────────────────────────┘   │
│  │ - Booking done   │                     │                     │
│  └──────────────────┘                     ↓                     │
│                              ┌─────────────────────────────┐    │
│                              │ caas-worker (Cron Job)      │    │
│                              │ Runs every 10 minutes       │    │
│                              └─────────────────────────────┘    │
│                                          │                       │
│                                          ↓                       │
│                              ┌─────────────────────────────┐    │
│                              │ CaaSService (Router)        │    │
│                              │ - Fetches profile role      │    │
│                              │ - Selects strategy          │    │
│                              │ - Upserts to caas_scores    │    │
│                              └─────────────────────────────┘    │
│                                          │                       │
│                     ┌────────────────────┼──────────────────┐   │
│                     │                    │                  │   │
│                     ↓                    ↓                  ↓   │
│         ┌───────────────────┐ ┌───────────────┐  ┌───────────┐ │
│         │TutorCaaSStrategy  │ │ClientCaaS...  │  │AgentCaaS..│ │
│         │ (30/30/20/10/10)  │ │(Not impl yet) │  │(Future)   │ │
│         └───────────────────┘ └───────────────┘  └───────────┘ │
│                     │                                            │
│                     │ Calls 3 RPC functions                      │
│                     ↓                                            │
│         ┌────────────────────────────────────────┐              │
│         │ PostgreSQL RPC Functions               │              │
│         │ - get_performance_stats(user_id)       │              │
│         │ - get_network_stats(user_id)           │              │
│         │ - get_digital_stats(user_id)           │              │
│         └────────────────────────────────────────┘              │
│                                                                  │
│  Frontend reads from:  ┌──────────────────────────┐            │
│  GET /api/caas/[id] ──→│ caas_scores (cache)      │            │
│                         │ <5ms read performance    │            │
│                         └──────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tutor Scoring Model (v5.5)

### The "Balanced Scorecard" - 30/30/20/10/10

| Bucket | Weight | Max Pts | Rationale | Data Sources |
|--------|--------|---------|-----------|--------------|
| **1. Performance & Quality** | 30% | 30 | Most important - rewards proven results | `reviews`, `bookings` |
| **2. Qualifications & Authority** | 30% | 30 | Honors institutional credibility | `profiles.degree_level`, `qualifications`, `teaching_experience` |
| **3. Network & Referrals** | 20% | 20 | Drives viral growth, social proof | `profile_graph` (SOCIAL, AGENT_REFERRAL) |
| **4. Verification & Safety** | 10% | 10 | The "scored" safety component | `profiles.dbs_verified`, `dbs_expiry` |
| **5. Digital Professionalism** | 10% | 10 | Nudges platform tool usage | `student_integration_links`, `bookings.recording_url`, `bio_video_url` |

### The "Safety Gate" (Multiplier)

**Mandatory Requirement**: `profiles.identity_verified = true`

- **If FALSE**: Total score = 0, tutor hidden from public search
- **If TRUE**: Score calculated normally using the 5 buckets above
- **Rationale**: "Don't find a stranger" principle - all public tutors MUST be ID-verified

---

## Detailed Scoring Breakdown

### Bucket 1: Performance & Quality (30 points)

**Purpose**: Reward tutors with proven client satisfaction and retention

| Metric | Points | Formula | Notes |
|--------|--------|---------|-------|
| **Rating Score** | 0-15 | `(avg_rating / 5) * 15` | From `reviews` table, receiver_id = tutor |
| **Retention Score** | 0-15 | `retention_rate * 15` | % of clients who booked >1 time |
| **Provisional Score** | 30 | Automatic | If completed_sessions = 0 (cold start fix) |

**Retention Rate Formula**:
```
retention_rate = (clients_with_>1_booking) / (total_unique_clients)
```

### Bucket 2: Qualifications & Authority (30 points)

**Purpose**: Honor institutional credentials and teaching experience

| Credential | Points | Criteria |
|------------|--------|----------|
| **Degree** | 10 | `degree_level` IN ('BACHELORS', 'MASTERS', 'PHD') |
| **QTS** | 10 | 'QTS' IN `qualifications` array (UK teaching qualification) |
| **Veteran Experience** | 10 | `teaching_experience >= 10` years |

### Bucket 3: Network & Referrals (20 points)

**Purpose**: Reward social proof and agent-driven growth

| Metric | Points | Formula | Notes |
|--------|--------|---------|-------|
| **Referrals** | 0-12 | `MIN(referral_count * 4, 12)` | Outgoing AGENT_REFERRAL links (max 3) |
| **Network Bonus** | 0 or 8 | Binary | IF `connection_count > 10` OR `is_agent_referred` |

**Network Bonus Logic**:
- Well-networked: >10 SOCIAL connections in `profile_graph`
- Agent-referred: Has incoming AGENT_REFERRAL link (replaces deprecated `is_partner_verified`)

### Bucket 4: Verification & Safety (10 points)

**Purpose**: The "scored" safety component (identity_verified is the gate, not scored)

| Check | Points | Criteria |
|-------|--------|----------|
| **Identity Gate** | 5 | Automatic (if this function runs, gate passed) |
| **DBS Check** | 5 | `dbs_verified = true` AND `dbs_expiry > NOW()` |

**DBS**: Disclosure and Barring Service (UK background check for working with children)

### Bucket 5: Digital Professionalism (10 points)

**Purpose**: Incentivize platform tool usage and responsiveness

#### Part 1: Integrated Tools (5 points)

- **5 points** if `google_calendar_synced = true` OR `google_classroom_synced = true`
- Checks `student_integration_links` table for active integrations

#### Part 2: Engagement (5 points) - "The OR Rule"

Tutor gets 5 points if **EITHER**:

**Path A**: High session logging
- `virtual_classroom_usage_rate > 0.8` (80%+ of sessions use virtual classroom with recording_url)
- **OR** `manual_session_log_rate > 0.8` (80%+ of offline sessions manually confirmed)

**Path B**: "Credibility Clip"
- `bio_video_url` is not null (30-second intro video uploaded)

**Virtual Classroom Usage**:
The system tracks sessions with `recording_url` field on bookings. This applies to ANY virtual classroom service: Lessonspace, Pencil Spaces, Google Meet, Zoom, Microsoft Teams, etc. - not specific to one vendor.

**Formula**:
```
virtual_classroom_usage_rate = (sessions_with_recording_url) / (total_completed_sessions)
```

---

## Database Schema

### Table: `caas_scores` (Cache)

```sql
CREATE TABLE caas_scores (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  role_type TEXT NOT NULL, -- 'TUTOR', 'CLIENT', 'AGENT', 'STUDENT'
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_version TEXT NOT NULL, -- e.g., 'tutor-v5.5'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_caas_ranking ON caas_scores(role_type, total_score DESC);
```

**Example Record**:
```json
{
  "profile_id": "uuid-here",
  "total_score": 85,
  "score_breakdown": {
    "performance": 28,
    "qualifications": 30,
    "network": 12,
    "safety": 10,
    "digital": 5
  },
  "role_type": "TUTOR",
  "calculated_at": "2025-12-12T10:00:00Z",
  "calculation_version": "tutor-v5.5"
}
```

### Table: `caas_recalculation_queue` (Event Queue)

```sql
CREATE TABLE caas_recalculation_queue (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)  -- Prevents duplicate queue entries
);
```

**Purpose**: Decouples score recalculation from user actions. When a review is posted or profile updated, add profile_id to queue. Worker processes queue every 10 minutes.

---

## Future Enhancements

### Proposed: Free Help Integration (v5.6)
**Add to Bucket 3 (Network) or create new Bucket 6 (Social Impact)**:

```typescript
// Add 5 points if tutor offers free help
if (profile.available_free_help) score += 5;

// Add up to 5 points for free sessions delivered
// (Requires new field: free_sessions_completed)
score += Math.min(5, profile.free_sessions_completed);
```

This would reward tutors who contribute to TutorWise's social mission of providing free tutoring to underprivileged students.

---

**Last Updated**: 2025-12-12
**Version**: v5.5
**Maintainer**: Trust & Safety Team + Marketplace Team

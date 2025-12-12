# CaaS - AI Assistant Prompt

**Feature**: Credibility as a Service (CaaS)
**Version**: v5.5 (30/30/20/10/10 Model)
**Last Updated**: 2025-12-12
**Target Audience**: AI Assistants working on CaaS features

---

## Feature Overview

**Credibility as a Service (CaaS)** is TutorWise's core trust and ranking engine. It calculates programmatic credibility scores (0-100) for all users by aggregating performance, qualifications, network, safety, and engagement data.

**Core Purpose**:
- **Marketplace Rankings**: Higher scores = higher search placement
- **Trust Building**: Public credibility badges increase booking conversion by +28%
- **Gamification**: Users see actionable steps to improve their score
- **Safety Gate**: Unverified users (identity_verified=false) are auto-hidden from search

**Architecture Style**: Event-Driven Cached Scoring Engine with Strategy Pattern

---

## System Context

### Core Principles

1. **Polymorphic Scoring (Strategy Pattern)**: Different algorithms for TUTOR, CLIENT, AGENT roles
2. **Event-Driven Recalculation**: Database queue (`caas_recalculation_queue`) triggers score updates
3. **Performance-First Caching**: Pre-calculated scores in `caas_scores` enable <5ms reads
4. **Safety Gate**: Mandatory `identity_verified` check - unverified users get score=0
5. **Fair Cold Start**: New tutors with 0 sessions receive provisional 30/100 score

### Technology Stack

- **Backend**: Next.js 14+ App Router, TypeScript 5+
- **Database**: PostgreSQL 14+ (Supabase)
- **Patterns**: Strategy Pattern, Event-Driven Architecture
- **Worker**: Vercel Cron (POST /api/caas-worker every 10 minutes)
- **RPC Functions**: 3 PostgreSQL stored procedures for data aggregation

---

## Tutor Scoring Model (v5.5)

### The "Balanced Scorecard" - 30/30/20/10/10

| Bucket | Weight | Max Pts | Data Sources |
|--------|--------|---------|--------------|
| **1. Performance & Quality** | 30% | 30 | `reviews`, `bookings` |
| **2. Qualifications & Authority** | 30% | 30 | `profiles.degree_level`, `qualifications`, `teaching_experience` |
| **3. Network & Referrals** | 20% | 20 | `profile_graph` (SOCIAL, AGENT_REFERRAL) |
| **4. Verification & Safety** | 10% | 10 | `profiles.dbs_verified`, `dbs_expiry` |
| **5. Digital Professionalism** | 10% | 10 | `student_integration_links`, `bookings.recording_url`, `bio_video_url` |

### The Safety Gate (Multiplier)

**Mandatory**: `profiles.identity_verified = true`

- **If FALSE**: Total score = 0, tutor hidden from public search
- **If TRUE**: Score calculated normally using 5 buckets above
- **Rationale**: "Don't find a stranger" principle

---

## Database Schema

### Table: caas_scores (Cache)

```sql
CREATE TABLE caas_scores (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  role_type TEXT NOT NULL CHECK (role_type IN ('TUTOR', 'CLIENT', 'AGENT', 'STUDENT')),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_version TEXT NOT NULL, -- e.g., 'tutor-v5.5'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_caas_ranking ON caas_scores(role_type, total_score DESC);
CREATE INDEX idx_caas_profile_id ON caas_scores(profile_id);
```

**Example Record**:
```json
{
  "profile_id": "uuid-here",
  "total_score": 87,
  "score_breakdown": {
    "performance": 28,
    "qualifications": 30,
    "network": 12,
    "safety": 10,
    "digital": 7
  },
  "role_type": "TUTOR",
  "calculation_version": "tutor-v5.5"
}
```

### Table: caas_recalculation_queue (Event Queue)

```sql
CREATE TABLE caas_recalculation_queue (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id) -- Prevents duplicates
);
```

**Purpose**: Decouples score recalculation from user actions. Processed by caas-worker every 10 minutes.

---

## Key Functions

### Function 1: CaaSService.calculate_caas() (TypeScript)

**Location**: `apps/web/src/lib/services/caas/index.ts`

**Purpose**: Strategy Pattern router - selects appropriate scoring algorithm based on user role

**Code Reference**:
```typescript
// Main entry point for all CaaS calculations
static async calculate_caas(profileId: string, supabase: SupabaseClient): Promise<CaaSScoreData> {
  // 1. Fetch profile and determine role (TUTOR > CLIENT > AGENT > STUDENT)
  const { data: profile } = await supabase.from('profiles').select('id, roles').eq('id', profileId).single();

  // 2. Select strategy based on role
  let primaryRole: CaaSRole;
  if (profile.roles.includes('TUTOR')) {
    primaryRole = 'TUTOR';
    const tutorStrategy = new TutorCaaSStrategy();
    scoreData = await tutorStrategy.calculate(profileId, supabase);
  }
  // ... other roles

  // 3. Upsert to caas_scores table
  await supabase.from('caas_scores').upsert({
    profile_id: profileId,
    role_type: primaryRole,
    total_score: scoreData.total,
    score_breakdown: scoreData.breakdown,
    calculation_version: CaaSVersions.TUTOR, // 'tutor-v5.5'
    calculated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id' });

  return scoreData;
}
```

### Function 2: TutorCaaSStrategy.calculate() (TypeScript)

**Location**: `apps/web/src/lib/services/caas/strategies/tutor.ts`

**Purpose**: Implements the v5.5 30/30/20/10/10 scoring model for tutors

**Code Reference**:
```typescript
async calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData> {
  // STEP 1: THE SAFETY GATE
  const { data: profile } = await supabase.from('profiles')
    .select('id, identity_verified, dbs_verified, dbs_expiry, qualifications, teaching_experience, degree_level, bio_video_url')
    .eq('id', userId).single();

  if (!profile.identity_verified) {
    return { total: 0, breakdown: { gate: 'Identity not verified' } };
  }

  // STEP 2: FETCH ALL METRICS (using RPC functions)
  const [networkResult, performanceResult, digitalResult] = await Promise.allSettled([
    supabase.rpc('get_network_stats', { user_id: userId }),
    supabase.rpc('get_performance_stats', { user_id: userId }),
    supabase.rpc('get_digital_stats', { user_id: userId }),
  ]);

  // Extract data with graceful degradation
  const network = networkResult.status === 'fulfilled' ? networkResult.value.data : defaultNetworkStats;
  const performance = performanceResult.status === 'fulfilled' ? performanceResult.value.data : defaultPerformanceStats;
  const digital = digitalResult.status === 'fulfilled' ? digitalResult.value.data : defaultDigitalStats;

  // STEP 3: CALCULATE THE 5 BUCKETS
  const b_performance = this.calcPerformance(performance); // 30 pts
  const b_qualifications = this.calcQualifications(profile); // 30 pts
  const b_network = this.calcNetwork(network); // 20 pts
  const b_safety = this.calcSafety(profile); // 10 pts
  const b_digital = this.calcDigital(digital, performance, profile); // 10 pts

  const total = Math.round(b_performance + b_qualifications + b_network + b_safety + b_digital);

  return { total, breakdown: { performance: b_performance, qualifications: b_qualifications, network: b_network, safety: b_safety, digital: b_digital } };
}
```

**Bucket Calculation Methods** (tutor.ts:138-259):
```typescript
// BUCKET 1: PERFORMANCE (30 pts)
private calcPerformance(stats: PerformanceStats): number {
  if (stats.completed_sessions === 0) return 30; // Provisional Score for new tutors

  const ratingScore = (stats.avg_rating / 5) * 15;
  const retentionScore = stats.retention_rate * 15;
  return Math.round(ratingScore + retentionScore);
}

// BUCKET 2: QUALIFICATIONS (30 pts)
private calcQualifications(profile: CaaSProfile): number {
  let score = 0;
  if (profile.degree_level && ['BACHELORS', 'MASTERS', 'PHD'].includes(profile.degree_level)) score += 10;
  if (profile.qualifications && profile.qualifications.includes('QTS')) score += 10;
  if (profile.teaching_experience && profile.teaching_experience >= 10) score += 10;
  return score;
}

// BUCKET 3: NETWORK (20 pts)
private calcNetwork(stats: NetworkStats): number {
  let score = 0;
  score += Math.min(stats.referral_count * 4, 12); // Max 3 referrals * 4 pts = 12
  if (stats.connection_count > 10 || stats.is_agent_referred) score += 8;
  return score;
}

// BUCKET 4: SAFETY (10 pts)
private calcSafety(profile: CaaSProfile): number {
  let score = 5; // Identity gate passed (automatic)
  if (profile.dbs_verified && profile.dbs_expiry) {
    if (new Date(profile.dbs_expiry) > new Date()) score += 5;
  }
  return score;
}

// BUCKET 5: DIGITAL (10 pts) - "The OR Rule"
private calcDigital(digital: DigitalStats, perf: PerformanceStats, profile: CaaSProfile): number {
  let score = 0;

  // Part 1: Integrations (5 pts)
  if (digital.google_calendar_synced || digital.google_classroom_synced) score += 5;

  // Part 2: Engagement (5 pts) - "The OR Rule"
  const hasHighSessionLogging = digital.lessonspace_usage_rate > 0.8 || perf.manual_session_log_rate > 0.8;
  const hasCredibilityClip = profile.bio_video_url && profile.bio_video_url !== '';

  if (hasHighSessionLogging || hasCredibilityClip) score += 5;

  return score;
}
```

### Function 3: RPC Functions (PostgreSQL)

**Location**: `apps/api/migrations/077_create_caas_rpc_functions.sql`

**Three Critical Functions**:

1. **get_performance_stats(user_id UUID)**
   - Returns: avg_rating, completed_sessions, retention_rate, manual_session_log_rate
   - Used by: Bucket 1 (Performance)
   - Performance: ~50ms

2. **get_network_stats(user_id UUID)**
   - Returns: referral_count, connection_count, is_agent_referred
   - Used by: Bucket 3 (Network)
   - Performance: ~30ms

3. **get_digital_stats(user_id UUID)**
   - Returns: google_calendar_synced, google_classroom_synced, lessonspace_usage_rate
   - Used by: Bucket 5 (Digital)
   - Performance: ~40ms
   - **Important Note**: `lessonspace_usage_rate` tracks ANY virtual classroom service (Lessonspace, Pencil Spaces, Google Meet, Zoom, Microsoft Teams, etc.) via `recording_url` field

---

## Integration Points

### 1. Dashboard Widget

**Component**: `CaaSGuidanceWidget.tsx`
**Location**: Tutor dashboard (hub)
**Purpose**: Display score with actionable improvement tips

**Implementation**:
```typescript
export function CaaSGuidanceWidget({ profileId, profile }: Props) {
  const [scoreData, setScoreData] = useState(null);

  useEffect(() => {
    fetch(`/api/caas/${profileId}`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data.role_type === 'TUTOR') {
          setScoreData(result.data);
        }
      });
  }, [profileId]);

  if (!scoreData) return null;

  return (
    <Card>
      <h3>Credibility Score</h3>
      <div className="score">{scoreData.total_score}/100</div>
      <div className="breakdown">
        <span>Performance: {scoreData.score_breakdown.performance}/30</span>
        <span>Qualifications: {scoreData.score_breakdown.qualifications}/30</span>
        <span>Network: {scoreData.score_breakdown.network}/20</span>
        <span>Safety: {scoreData.score_breakdown.safety}/10</span>
        <span>Digital: {scoreData.score_breakdown.digital}/10</span>
      </div>
      {/* Action items for missing credentials */}
    </Card>
  );
}
```

### 2. Public Profile Badge

**Location**: `/listings/[id]` (tutor public profile)
**Purpose**: Display trust badge on tutor profiles

**Implementation**:
```typescript
const { data: score } = await supabase
  .from('caas_scores')
  .select('total_score')
  .eq('profile_id', tutorId)
  .single();

if (score && score.total_score >= 85) {
  return <Badge variant="verified">Verified Pro ({score.total_score}/100)</Badge>;
} else if (score && score.total_score >= 70) {
  return <Badge variant="trusted">Trusted Tutor ({score.total_score}/100)</Badge>;
}
```

### 3. Marketplace Ranking

**Location**: Marketplace search algorithm
**Purpose**: Boost high-credibility tutors in search results

**Implementation**:
```sql
-- Join caas_scores in marketplace query
SELECT
  p.id,
  p.full_name,
  l.title,
  COALESCE(cs.total_score, 0) as credibility_score
FROM profiles p
INNER JOIN listings l ON l.profile_id = p.id
LEFT JOIN caas_scores cs ON cs.profile_id = p.id
WHERE p.identity_verified = true -- Safety gate (hide unverified)
ORDER BY credibility_score DESC, l.created_at DESC
LIMIT 20;
```

### 4. Event-Driven Queue System

**6 Database Triggers** (078_create_caas_auto_queue_triggers.sql):

1. **trigger_queue_on_profile_update** (profiles)
   - Fires when: identity_verified, dbs_verified, qualifications, teaching_experience, degree_level, bio_video_url updated
   - Affects: Buckets 2, 4, 5

2. **trigger_queue_on_new_review** (reviews)
   - Fires when: New review inserted
   - Affects: Bucket 1 (avg_rating)

3. **trigger_queue_on_booking_completion** (bookings)
   - Fires when: status changes to 'completed'
   - Affects: Bucket 1 (completed_sessions, retention_rate)

4. **trigger_queue_on_recording_url_update** (bookings)
   - Fires when: recording_url added
   - Affects: Bucket 5 (virtual classroom usage rate)

5. **trigger_queue_on_profile_graph_change** (profile_graph)
   - Fires when: SOCIAL or AGENT_REFERRAL relationship created/updated
   - Affects: Bucket 3 (network metrics)

6. **trigger_queue_on_integration_link_change** (student_integration_links)
   - Fires when: Google Calendar/Classroom activated
   - Affects: Bucket 5 (integration bonus)

---

## Common Tasks

### Task 1: Manually Calculate Score

```typescript
import { CaaSService } from '@/lib/services/caas';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const scoreData = await CaaSService.calculate_caas('profile_uuid', supabase);
console.log(`Score: ${scoreData.total}/100`, scoreData.breakdown);
```

### Task 2: Fetch Cached Score

```typescript
// Client-side (respects RLS)
const response = await fetch(`/api/caas/${profileId}`);
const result = await response.json();

if (result.success) {
  console.log('Total Score:', result.data.total_score);
  console.log('Breakdown:', result.data.score_breakdown);
  console.log('Last Calculated:', result.data.calculated_at);
}
```

### Task 3: Queue Profile for Recalculation

```typescript
import { CaaSService } from '@/lib/services/caas';

// Manually queue (usually handled by triggers)
await CaaSService.queueRecalculation(profileId, supabase);

// Worker will process within 10 minutes
```

### Task 4: Process Worker Queue (Cron Job)

```bash
# Vercel Cron calls this endpoint every 10 minutes
curl -X POST https://your-app.vercel.app/api/caas-worker \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Worker Logic** (caas-worker/route.ts):
```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate CRON_SECRET
  // 2. Fetch 50 oldest profiles from queue
  // 3. Calculate scores in parallel with Promise.allSettled
  // 4. Delete processed profiles from queue
  // 5. Return summary { processed: 47, successful: 46, failed: 1 }
}
```

### Task 5: Display Action Items on Dashboard

```typescript
// Analyze score_breakdown to show improvement tips
const missingPoints = [];

if (scoreData.score_breakdown.safety < 10) {
  if (!profile.dbs_verified) {
    missingPoints.push({
      title: 'Complete DBS Check',
      points: 5,
      link: '/account/verification'
    });
  }
}

if (scoreData.score_breakdown.digital < 10) {
  if (!profile.bio_video_url) {
    missingPoints.push({
      title: 'Add 30-Second Intro Video',
      points: 5,
      link: '/account/professional'
    });
  }
}

// Render action items with "Complete" buttons
```

---

## Testing Checklist

### Unit Tests (tutor.test.ts)
- [ ] Safety Gate: Unverified tutor returns score=0
- [ ] Provisional Score: New tutor with 0 sessions gets 30/100
- [ ] Performance: Correctly calculates rating + retention scores
- [ ] Qualifications: Awards points for degree, QTS, 10+ yrs exp
- [ ] Network: Calculates referral bonus + network bonus
- [ ] Safety: Awards DBS points only if not expired
- [ ] Digital: "OR Rule" works for both logging and video paths

### Integration Tests (integration.test.ts)
- [ ] End-to-end score calculation saves to caas_scores
- [ ] Score cache retrieval via CaaSService.getScore()
- [ ] Queue system adds profiles to caas_recalculation_queue
- [ ] RPC functions return expected data structure
- [ ] Worker processes queue and removes entries

### Manual Tests
- [ ] Dashboard widget displays score with 5-bucket breakdown
- [ ] Public profile shows credibility badge for score ≥70
- [ ] Marketplace ranks tutors by credibility_score DESC
- [ ] Database triggers auto-queue profiles on data changes
- [ ] Worker runs successfully via POST /api/caas-worker
- [ ] Unverified tutors (identity_verified=false) hidden from search

---

## Security Considerations

1. **RLS Policies**: Tutor scores are public; client/agent scores are private
2. **Service Role Usage**: Only use `SUPABASE_SERVICE_ROLE_KEY` in server-side routes (Pattern 2)
3. **Worker Authentication**: Protect POST /api/caas-worker with CRON_SECRET header
4. **UUID Validation**: Always validate profile_id format before querying
5. **SECURITY DEFINER**: RPC functions run with elevated privileges - audit carefully

**RLS Policies** (074_create_caas_scores_table.sql:66-84):
```sql
-- Users can view their own score
CREATE POLICY "Users can view own score" ON caas_scores
USING (profile_id = auth.uid());

-- Public can view TUTOR scores (for marketplace)
CREATE POLICY "Public can view tutor scores" ON caas_scores
USING (role_type = 'TUTOR');

-- Only service_role can write scores
CREATE POLICY "Service role can manage all scores" ON caas_scores
USING (auth.jwt()->>'role' = 'service_role');
```

---

## Performance Optimization

1. **Cache Reads**: <5ms via indexed profile_id lookups
2. **RPC Performance**: ~150ms total (3 functions * ~50ms each)
3. **Batch Processing**: Worker processes 50 profiles per run (300/hour)
4. **Graceful Degradation**: Promise.allSettled ensures partial failures don't block scoring
5. **Queue Idempotency**: UNIQUE constraint on profile_id prevents duplicate entries

**Performance Benchmarks**:
- Read from cache: <5ms
- Full score calculation: ~150ms (3 RPC calls + 5 bucket calculations)
- Worker batch: ~7.5 seconds for 50 profiles
- Queue throughput: 300 profiles/hour

---

## Important Notes for AI Assistants

### Virtual Classroom Clarification
**CRITICAL**: When you see `lessonspace_usage_rate` in the code, understand that this variable name is **historical**. The system actually tracks **ANY virtual classroom service** that stores a `recording_url` on the booking record:
- ✅ Lessonspace
- ✅ Pencil Spaces
- ✅ Google Meet
- ✅ Zoom
- ✅ Microsoft Teams
- ✅ Any service that generates a recording URL

**DO NOT** suggest renaming this variable - it would break existing database functions and trigger backwards compatibility issues. Instead, add clarifying comments when working with this code.

### Provisional Score Logic
**CRITICAL**: New tutors with 0 completed sessions receive a **provisional score of 30/100** for Bucket 1 (Performance). This is intentional to prevent unfair penalization of new tutors who haven't had a chance to build their track record yet. Once they complete their first session, the score switches to the formula-based calculation.

**Code Location**: tutor.ts:142-144
```typescript
if (stats.completed_sessions === 0) {
  return 30; // Provisional score - NEVER remove this logic
}
```

### The "OR Rule" in Bucket 5
**CRITICAL**: Digital Professionalism (Bucket 5) uses an "OR Rule" for Part 2 (Engagement). Tutors can earn 5 points via **EITHER**:
- **Path A**: High session logging (virtual_classroom_usage_rate > 0.8 OR manual_session_log_rate > 0.8)
- **Path B**: Credibility Clip uploaded (bio_video_url exists)

This is intentional flexibility - not all tutors use virtual classrooms, and not all have video. The OR logic ensures both paths are valid.

**Code Location**: tutor.ts:249-255

---

**Last Updated**: 2025-12-12
**Version**: v5.5 (30/30/20/10/10 model)
**Maintainer**: Trust & Safety Team + Marketplace Team

# caas-solution-design-v5.5

Here is the updated `caas-solution-design-v5.5`.

This document has been revised to be the single source of truth for the entire Credibility Engine. It formally integrates the "Credibility Clip" (v5.6) logic and clarifies its deep dependencies on our new foundational APIs and data models.

* * *

### **Solution Design Document: Credibility as a Service (CaaS) Engine (v5.5)**

**Document Information**

- **Version:** 5.5 (Consolidated, Revised)
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisites (Data Sources):**
  - `profile-graph-solution-design-v4.6` (Provides `profile_graph` data)
  - `student-onboarding-solution-design-v5.0` (Provides `student_id` on bookings and `integration_links`)
- **Prerequisites (API & Video):**
  - `api-solution-design-v5.1` (Provides the API patterns this feature uses)
  - `lessonspace-solution-design-v5.2` (Provides `recording_url` and `duration` data)

* * *

### 1\. Executive Summary

This document defines the architecture for the **Credibility as a Service (CaaS) Engine**, a core strategic asset. This system moves Tutorwise from a simple directory to an automated, high-trust marketplace.

It will programmatically calculate a **Credibility Score (0-100)** for all user roles (Tutor, Client, Agent) by aggregating performance, qualifications, network data, and safety verifications. This score will power marketplace search rankings, automate user vetting, and provide a "gamified" framework for users to improve their standing on the platform.

This design is:

1. **Polymorphic:** Uses a **Strategy Pattern** to apply different scoring models for Tutors, Clients, and Agents.
2. **Performant:** Caches all scores in a dedicated `caas_scores` table for fast search.
3. **Event-Driven:** Uses a database queue (`caas_recalculation_queue`) to trigger recalculations on relevant events (e.g., new review, profile update), ensuring scores are always up-to-date.
4. **Fair & Balanced:** Incorporates a **"Safety Gate"** (mandatory ID check) and a **"Provisional Score"** to solve the "Cold Start" problem for new, high-quality tutors.

* * *

### 2\. CaaS Tutor Score: The "Balanced Scorecard" (v5.5)

This is the finalized 100-point scoring model for the Tutor role.

#### 2.1 The "Safety Gate" (Multiplier)

This is a mandatory check.

- **Metric:** Identity Verified
- **Logic:** If `profiles.identity_verified = false`, the tutor's final score is **0**, and they are hidden from all public search results. This is the "Don't find a stranger" principle.

#### 2.2 The 5 Scoring Buckets

If the Safety Gate is passed, the 100-point score is calculated from these five buckets:

|     |     |     |
| --- | --- | --- |
| **Bucket** | **Weight** | **Rationale & (Data Sources)** |
| 1. **Performance & Quality** | 30% | The most important metric. Rewards proven results and client satisfaction.<br><br>*(Source:* `review_sessions`*,* `bookings.student_id`*)* |
| 2. **Qualifications & Authority** | 30% | Honors institutional credibility and veteran experience.<br><br>*(Source:* `profiles` *table data)* |
| 3. **Network & Referrals** | 20% | Drives viral growth and rewards social proof.<br><br>*(Source:* `profile_graph` *'SOCIAL' & 'AGENT\_REFERRAL' links)* |
| 4. **Verification & Safety** | 10% | The "Scored" component of safety, including the non-mandatory DBS bonus.<br><br>*(Source:* `profiles` *table data)* |
| 5. **Digital Professionalism** | 10% | A "nudge" to incentivize using platform tools and being responsive.<br><br>*(Source:* `integration_links`*,* `bookings.recording_url`*,* `profiles.bio_video_url`*)* |

* * *

### 3\. Database Implementation

This engine requires three database modifications.

#### 3.1 New Table: `caas_scores` (The Cache)

This table stores the calculated score for all users.

Migration: apps/api/migrations/065\_create\_caas\_scores\_table.sql

```
SQL
```

```
CREATE TABLE public.caas_scores (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- The "Headline" Score (Universal 0-100)
  total_score INTEGER NOT NULL DEFAULT 0,
  
  -- The score breakdown (Flexible JSONB)
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- The role this score was calculated for (TUTOR, CLIENT, AGENT)
  role_type TEXT NOT NULL,
  
  -- Metadata for debugging and versioning
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_version TEXT NOT NULL
);

-- Critical index for fast, role-based search ranking
CREATE INDEX idx_caas_ranking
ON public.caas_scores(role_type, total_score DESC);

COMMENT ON TABLE public.caas_scores IS 'Polymorphic cache table for all user CaaS scores.';

```

#### 3.2 New Table: `caas_recalculation_queue` (The Trigger)

This table logs requests to update a score, decoupling the calculation from the user's action.

Migration: apps/api/migrations/066\_create\_caas\_event\_queue.sql

```
SQL
```

```
CREATE TABLE public.caas_recalculation_queue (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensures we don't queue the same user 100x in one minute
  UNIQUE(profile_id)
);

COMMENT ON TABLE public.caas_recalculation_queue IS 'Queue for CaaS score recalculations.';

```

#### 3.3 New Table Column: `bio_video_url` (The "Credibility Clip")

This field is required for the "Digital Professionalism" bucket.

Migration: apps/api/migrations/069\_add\_bio\_video\_url.sql

```
SQL
```

```
-- Adds a field to store a link to an externally hosted video
ALTER TABLE public.profiles
ADD COLUMN bio_video_url TEXT;

COMMENT ON COLUMN public.profiles.bio_video_url
IS 'A link to a 30s unlisted YouTube/Loom/Vimeo video for the CaaS "Credibility Clip"';

```

* * *

### 4\. Backend Implementation

The backend consists of the CaaS Service (logic), RPC functions (data), and a Worker (trigger).

#### 4.1 API Architectural Pattern

This feature implements two patterns from `api-solution-design-v5.1`:

1. **Pattern 1 (User-Facing):** The frontend will fetch scores from a simple API route (e.g., `GET /api/caas/[profile_id]`) that reads directly from the `caas_scores` cache.
2. **Pattern 2 (Internal Worker):** The `caas-worker` (`/api/caas-worker`) is a secure endpoint triggered by a cron job, which processes the `caas_recalculation_queue`.

#### 4.2 `CaaSService` (The Router)

This service selects the correct scoring logic (Strategy Pattern).

Location: apps/web/src/lib/services/caas/index.ts

```
TypeScript
```

```
import { TutorCaaSStrategy } from './strategies/tutor';
import { ClientCaaSStrategy } from './strategies/client';

export class CaaSService {
  static async calculate_caas(profileId: string, supabase: SupabaseClient) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', profileId).single();
    if (!profile) throw new Error('Profile not found');

    let strategy;
    let version: string;

    switch (profile.role) {
      case 'TUTOR':
        strategy = new TutorCaaSStrategy();
        version = 'tutor-v5.5'; // The finalized model
        break;
      case 'CLIENT':
        strategy = new ClientCaaSStrategy();
        version = 'client-v1.0';
        break;
      default:
        return { total: 0, breakdown: {} };
    }

    const scoreData = await strategy.calculate(profileId, supabase);

    await supabase.from('caas_scores').upsert({
      profile_id: profileId,
      role_type: profile.role,
      total_score: scoreData.total,
      score_breakdown: scoreData.breakdown,
      calculation_version: version,
      calculated_at: new Date().toISOString()
    });

    return scoreData;
  }
}

```

#### 4.3 `TutorCaaSStrategy` (The Logic)

This implements the 30/30/20/10/10 model with the Safety Gate and "Credibility Clip" logic.

Location: apps/web/src/lib/services/caas/strategies/tutor.ts

```
TypeScript
```

```
export class TutorCaaSStrategy {
  async calculate(userId: string, supabase: SupabaseClient) {
    // 1. THE SAFETY GATE
    const { data: profile } = await supabase
      .from('profiles')
      .select('identity_verified, dbs_verified, dbs_expiry, qualifications, teaching_experience, degree_level, created_at, bio_video_url')
      .eq('id', userId)
      .single<Profile>();

    if (!profile || !profile.identity_verified) {
      return { total: 0, breakdown: { gate: 'Identity not verified' } };
    }

    // 2. FETCH ALL METRICS (using RPC functions)
    const [network, performance, digital] = await Promise.all([
      supabase.rpc('get_network_stats', { user_id: userId }).then(r => r.data as NetworkStats),
      supabase.rpc('get_performance_stats', { user_id: userId }).then(r => r.data as PerformanceStats),
      supabase.rpc('get_digital_stats', { user_id: userId }).then(r => r.data as DigitalStats)
    ]);

    // 3. CALCULATE BUCKETS
    const b_performance = this.calcPerformance(performance); // 30 pts
    const b_qualifications = this.calcQualifications(profile); // 30 pts
    const b_network = this.calcNetwork(network); // 20 pts
    const b_safety = this.calcSafety(profile); // 10 pts
    const b_digital = this.calcDigital(digital, performance, profile); // 10 pts

    const total = Math.round(b_performance + b_qualifications + b_network + b_safety + b_digital);
    
    return {
      total,
      breakdown: {
        performance: b_performance,
        qualifications: b_qualifications,
        network: b_network,
        safety: b_safety,
        digital: b_digital,
      }
    };
  }

  // BUCKET 1: PERFORMANCE (30)
  private calcPerformance(stats: PerformanceStats): number {
    if (stats.completed_sessions === 0) return 30; // Provisional Score
    const ratingScore = (stats.avg_rating / 5) * 15;
    const retentionScore = stats.retention_rate * 15;
    return Math.round(ratingScore + retentionScore);
  }

  // BUCKET 2: QUALIFICATIONS (30)
  private calcQualifications(profile: Profile): number {
    let score = 0;
    if (['BACHELORS', 'MASTERS', 'PHD'].includes(profile.degree_level)) score += 10;
    if (profile.qualifications?.includes('QTS')) score += 10;
    if (profile.teaching_experience >= 10) score += 10;
    return score;
  }

  // BUCKET 3: NETWORK (20)
  private calcNetwork(stats: NetworkStats): number {
    let score = 0;
    score += Math.min(stats.referral_count * 4, 12); // Max 12 pts
    if (stats.connection_count > 10 || stats.is_partner_verified) score += 8;
    return score;
  }

  // BUCKET 4: SAFETY (10)
  private calcSafety(profile: Profile): number {
    let score = 5; // 5 pts for passing the Identity Gate
    if (profile.dbs_verified && new Date(profile.dbs_expiry) > new Date()) score += 5;
    return score;
  }

  // BUCKET 5: DIGITAL (10)
  private calcDigital(digital: DigitalStats, perf: PerformanceStats, profile: Profile): number {
    let score = 0;
    // 1. Integrated Tools (5 pts)
    if (digital.google_calendar_synced || digital.google_classroom_synced) {
      score += 5;
    }
    // 2. Engagement (5 pts) "The OR Rule"
    if (
      // Path A: They diligently log their session data
      (digital.lessonspace_usage_rate > 0.8 || perf.manual_session_log_rate > 0.8) ||
      
      // Path B: They have uploaded a Credibility Clip
      (profile.bio_video_url && profile.bio_video_url !== "")
    ) {
      // Tutor gets 5 points if they log sessions OR if they have a video intro
      score += 5;
    }
    return score;
  }
}

```

#### 4.4 New RPC Functions (Data Aggregation)

The `TutorCaaSStrategy` depends on efficient data aggregation. These Postgres functions must be created to pre-calculate stats.

- `get_performance_stats(user_id UUID)`:
  - `SELECT COUNT(*), AVG(rating)` from `review_sessions` -> `reviews`.
  - `SELECT COUNT(*)` from `bookings` where `tutor_id = user_id` and `student_id IS NOT NULL`.
- `get_network_stats(user_id UUID)`:
  - `SELECT COUNT(*)` from `profile_graph` where `target_profile_id = user_id` and `relationship_type = 'AGENT_REFERRAL'`.
  - `SELECT COUNT(*)` from `profile_graph` where `(source_profile_id = user_id OR target_profile_id = user_id)` and `relationship_type = 'SOCIAL'`.
- `get_digital_stats(user_id UUID)`:
  - `SELECT COUNT(*)` from `student_integration_links` (for Google Classroom).
  - `SELECT COUNT(*)` from `bookings` where `tutor_id = user_id` and `recording_url IS NOT NULL` (for Lessonspace usage).

#### 4.5 The Event Worker (Queue Processor)

This is the Pattern 2 (Internal Worker) endpoint from api-solution-design-v5.1.

Location: apps/web/src/app/api/caas-worker/route.ts

```
TypeScript
```

```
// This endpoint is secured by a Cron Secret
export async function POST(request: Request) {
  // 1. Verify Cron Secret
  
  const supabase = createClient(process.env.SUPABASE_SERVICE_KEY);
  
  // 2. Get jobs from the queue
  const { data: jobs } = await supabase
    .from('caas_recalculation_queue')
    .select('profile_id')
    .limit(50);
  
  if (!jobs || jobs.length === 0) {
    return Response.json({ success: true, message: 'Queue empty' });
  }

  // 3. Process all jobs in parallel
  await Promise.all(jobs.map(job =>
    CaaSService.calculate_caas(job.profile_id, supabase)
  ));

  // 4. Clear processed jobs from the queue
  await supabase
    .from('caas_recalculation_queue')
    .delete()
    .in('profile_id', jobs.map(j => j.profile_id));

  return Response.json({ success: true, processed: jobs.length });
}

```

* * *

### 5\. Frontend Implementation

- **Marketplace Search (**`api/marketplace/search/route.ts`**):**
  - The search query **must** be updated to `JOIN caas_scores ON profiles.id = caas_scores.profile_id` and `ORDER BY caas_scores.total_score DESC`.
- **Public Profile (**`/public-profile/[id]/...`**):**/\[\[...slug\]\]/page.tsx\]
  - A **new component** `CredibilityScoreCard.tsx` will be **added** to the layout.
  - The existing `TutorVerificationCard.tsx`/\[\[...slug\]\]/components/TutorVerificationCard.tsx\] will **remain** as it displays the specific verification checkmarks (ID, DBS) that act as the "Safety Gate."
  - The `ProfileHeroSection.tsx` will be updated to include the "Watch 30s Intro" button, which opens a modal with a `react-player`.
- **Tutor Dashboard (**`/dashboard`**):**
  - The new `CaaSGuidanceWidget.tsx` will be added. This widget shows the tutor their own score and a checklist of "Next Best Actions" (e.g., "Add your 30s Bio Clip (+5 pts)").
- **Tutor Profile Settings (**`/account/professional`**):**
  - The `TutorProfessionalInfo.tsx` component will be updated with a new `Input` field for `bio_video_url`.

* * *

### 6\. Rollout & Migration Plan

1. **Phase 1 (DB):** Deploy Migrations `065`, `066`, and `069`. Create the RPC functions (e.g., `get_network_stats`).
2. **Phase 2 (Backend):** Deploy the `CaaSService` and all related strategies (`tutor.ts`, `client.ts`).
3. **Phase 3 (Automation):** Deploy the `caas-worker` Edge Function and configure its cron schedule (**every 60 minutes**).
4. **Phase 4 (Backfill):** Run a one-time script to call `CaaSService.calculate_caas()` for all existing TUTOR and CLIENT profiles.
5. **Phase 5 (Frontend):** Deploy the new `CredibilityScoreCard.tsx` (public) and `CaaSGuidanceWidget.tsx` (dashboard).
6. **Phase 6 (Activation):** Update the `api/marketplace/search/route.ts` to sort by `total_score`. This "turns on" the engine for the public.
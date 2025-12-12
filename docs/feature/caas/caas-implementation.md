# CaaS - Implementation Guide

**Version**: v5.5 (Credibility as a Service)
**Last Updated**: 2025-12-12
**Target Audience**: Developers implementing or maintaining CaaS features
**Prerequisites**: Node.js 18+, TypeScript 5+, Next.js 14+, PostgreSQL 14+, Supabase

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Setup Instructions](#setup-instructions)
3. [Common Tasks](#common-tasks)
4. [API Reference](#api-reference)
5. [Database Reference](#database-reference)
6. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ lib/services/caas/
│   ├─ index.ts                         # CaaSService (Strategy Pattern router)
│   ├─ types.ts                         # TypeScript interfaces for v5.5
│   └─ strategies/
│       ├─ tutor.ts                     # TutorCaaSStrategy (30/30/20/10/10 model)
│       └─ client.ts                    # ClientCaaSStrategy (future)
│
├─ app/api/caas/
│   ├─ [profile_id]/route.ts            # GET /api/caas/[profile_id] (Pattern 1)
│   └─ caas-worker/route.ts             # POST /api/caas-worker (Pattern 2)
│
└─ app/components/feature/caas/
    ├─ CaaSGuidanceWidget.tsx           # Dashboard widget
    └─ CaaSGuidanceWidget.module.css

apps/api/migrations/
├─ 074_create_caas_scores_table.sql     # Cache table (caas_scores)
├─ 075_create_caas_event_queue.sql      # Queue table (caas_recalculation_queue)
├─ 077_create_caas_rpc_functions.sql    # 3 RPC functions for data aggregation
└─ 078_create_caas_auto_queue_triggers.sql # 6 database triggers for auto-queuing
```

**Total Lines of Code**:
- TypeScript: ~700 lines (CaaSService + TutorCaaSStrategy + API routes)
- SQL: ~600 lines (tables + RPC functions + triggers)
- React Components: ~300 lines (dashboard widget + marketplace integration)

---

## Setup Instructions

### Prerequisites

Ensure your development environment has:
- Node.js 18+ and npm 9+
- PostgreSQL 14+ (via Supabase or local)
- Supabase CLI installed (`npm install -g supabase`)
- Next.js 14+ with App Router

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for caas-worker

# Optional: Cron job authentication
CRON_SECRET=your_random_secret_key  # For POST /api/caas-worker
```

**Security Note**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row-Level Security (RLS) and should NEVER be exposed to the client. Only use it in server-side routes (API routes marked with Pattern 2).

### Database Setup

Run the CaaS migrations in order:

```bash
# Navigate to API directory
cd apps/api

# Run migrations (using Supabase CLI or psql)
psql $DATABASE_URL -f migrations/074_create_caas_scores_table.sql
psql $DATABASE_URL -f migrations/075_create_caas_event_queue.sql
psql $DATABASE_URL -f migrations/077_create_caas_rpc_functions.sql
psql $DATABASE_URL -f migrations/078_create_caas_auto_queue_triggers.sql

# Verify tables exist
psql $DATABASE_URL -c "\d caas_scores"
psql $DATABASE_URL -c "\d caas_recalculation_queue"
```

**Expected Output**:
- `caas_scores` table with 8 columns (profile_id, total_score, score_breakdown, role_type, etc.)
- `caas_recalculation_queue` table with 3 columns (id, profile_id, created_at)
- 3 RPC functions: `get_performance_stats()`, `get_network_stats()`, `get_digital_stats()`
- 6 database triggers on profiles, reviews, bookings, profile_graph, student_integration_links

### Development Workflow

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Test CaaS API endpoint (in another terminal)
# Replace PROFILE_ID with a valid UUID from your profiles table
curl http://localhost:3000/api/caas/PROFILE_ID

# 5. Manually trigger score calculation (via psql)
psql $DATABASE_URL -c "
  INSERT INTO caas_recalculation_queue (profile_id)
  VALUES ('PROFILE_ID');
"
```

---

## Common Tasks

### Task 1: Calculate CaaS Score for a Profile

**Use Case**: Manually trigger score calculation for testing or backfill

**Code Location**: `apps/web/src/lib/services/caas/index.ts`

```typescript
import { CaaSService } from '@/lib/services/caas';
import { createClient } from '@supabase/supabase-js';

// Create service_role client (bypasses RLS for RPC calls)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Calculate score for a specific profile
const scoreData = await CaaSService.calculate_caas(
  'profile_uuid_here',
  supabase
);

console.log(`Score calculated: ${scoreData.total}/100`);
console.log('Breakdown:', scoreData.breakdown);

// Result is automatically saved to caas_scores table
```

**What Happens Internally** (from `index.ts:43-154`):
1. Fetches profile from `profiles` table to determine role (TUTOR, CLIENT, etc.)
2. Selects appropriate strategy (e.g., `TutorCaaSStrategy` for role='TUTOR')
3. Strategy calls 3 RPC functions to aggregate data:
   - `get_performance_stats(user_id)` → avg_rating, completed_sessions, retention_rate, manual_session_log_rate
   - `get_network_stats(user_id)` → referral_count, connection_count, is_agent_referred
   - `get_digital_stats(user_id)` → google_calendar_synced, google_classroom_synced, lessonspace_usage_rate
4. Strategy calculates 5 buckets (30/30/20/10/10) and returns total score
5. CaaSService upserts result to `caas_scores` table

**Example Output**:
```typescript
{
  total: 87,
  breakdown: {
    performance: 28,    // Bucket 1: (4.8/5)*15 + 0.87*15 = 14.4 + 13.05 ≈ 28
    qualifications: 30, // Bucket 2: degree(10) + QTS(10) + 10yrs exp(10) = 30
    network: 12,        // Bucket 3: 3 referrals * 4 = 12
    safety: 10,         // Bucket 4: identity(5) + DBS(5) = 10
    digital: 7          // Bucket 5: integrations(5) + video(2) = 7
  }
}
```

### Task 2: Fetch Cached Score from API

**Use Case**: Display credibility score on public tutor profile or marketplace

**Code Location**: `apps/web/src/app/api/caas/[profile_id]/route.ts`

```typescript
// Frontend React component (apps/web/src/app/components/feature/caas/CaaSGuidanceWidget.tsx)

import { useEffect, useState } from 'react';

interface CaaSScore {
  total_score: number;
  score_breakdown: {
    performance?: number;
    qualifications?: number;
    network?: number;
    safety?: number;
    digital?: number;
  };
  role_type: string;
  calculated_at: string;
}

export function TutorProfileCard({ profileId }: { profileId: string }) {
  const [score, setScore] = useState<CaaSScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScore() {
      try {
        const response = await fetch(`/api/caas/${profileId}`);

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setScore(result.data);
          }
        } else if (response.status === 404) {
          console.log('Score not yet calculated for this tutor');
        }
      } catch (error) {
        console.error('Error fetching CaaS score:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchScore();
  }, [profileId]);

  if (loading || !score) return null;

  return (
    <div className="credibility-badge">
      <h3>Credibility Score</h3>
      <div className="score">{score.total_score}/100</div>
      <div className="breakdown">
        <span>Performance: {score.score_breakdown.performance}</span>
        <span>Qualifications: {score.score_breakdown.qualifications}</span>
        <span>Network: {score.score_breakdown.network}</span>
        <span>Safety: {score.score_breakdown.safety}</span>
        <span>Digital: {score.score_breakdown.digital}</span>
      </div>
      <p className="last-updated">
        Updated: {new Date(score.calculated_at).toLocaleDateString()}
      </p>
    </div>
  );
}
```

**API Response** (from `route.ts:79-89`):
```json
{
  "success": true,
  "data": {
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
    "calculated_at": "2025-12-12T14:30:00Z",
    "calculation_version": "tutor-v5.5"
  }
}
```

**Performance**: <5ms read from cached `caas_scores` table (no heavy calculations)

### Task 3: Queue Profile for Recalculation

**Use Case**: Manually trigger score update after data changes (e.g., after admin verifies DBS check)

**Code Location**: `apps/web/src/lib/services/caas/index.ts:208-225`

```typescript
import { CaaSService } from '@/lib/services/caas';
import { createClient } from '@/utils/supabase/server';

// In an API route or Server Action
const supabase = await createClient();

await CaaSService.queueRecalculation('profile_uuid_here', supabase);

console.log('Profile queued for recalculation. Score will update within 10 minutes.');
```

**What Happens**:
1. Adds profile_id to `caas_recalculation_queue` table
2. If profile is already queued, does nothing (UNIQUE constraint prevents duplicates)
3. Worker processes queue every 10 minutes, calculating score and updating `caas_scores`

**Automatic Queuing**: In most cases, you don't need to manually queue profiles. Database triggers automatically queue profiles when relevant data changes:
- Profile updates: `identity_verified`, `dbs_verified`, `qualifications`, `teaching_experience`, `degree_level`, `bio_video_url`
- New reviews: INSERT on `reviews` table
- Booking completion: `status` changes to 'completed'
- Recording URL added: `recording_url` field updated
- Network changes: INSERT/UPDATE on `profile_graph` (SOCIAL or AGENT_REFERRAL)
- Integration links: Google Calendar/Classroom activated

### Task 4: Implement the CaaS Worker (Cron Job)

**Use Case**: Process the recalculation queue every 10 minutes

**Code Location**: `apps/web/src/app/api/caas-worker/route.ts` (Pattern 2 - Internal Worker)

```typescript
/**
 * POST /api/caas-worker
 * Processes the caas_recalculation_queue and calculates scores
 * Called by Vercel Cron every 10 minutes
 * Authentication: CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CaaSService } from '@/lib/services/caas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // ================================================================
    // STEP 1: AUTHENTICATE CRON REQUEST
    // ================================================================
    const authHeader = request.headers.get('authorization');
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ================================================================
    // STEP 2: CREATE SERVICE ROLE SUPABASE CLIENT
    // ================================================================
    // Service role bypasses RLS for RPC calls and caas_scores writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ================================================================
    // STEP 3: FETCH PROFILES FROM QUEUE (FIFO, LIMIT 50)
    // ================================================================
    const { data: queueItems, error: queueError } = await supabase
      .from('caas_recalculation_queue')
      .select('id, profile_id')
      .order('created_at', { ascending: true })
      .limit(50);

    if (queueError) {
      console.error('[caas-worker] Failed to fetch queue:', queueError);
      return NextResponse.json({ error: 'Queue fetch failed' }, { status: 500 });
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({
        message: 'Queue is empty',
        processed: 0
      });
    }

    console.log(`[caas-worker] Processing ${queueItems.length} profiles from queue`);

    // ================================================================
    // STEP 4: CALCULATE SCORES (Parallel with error handling)
    // ================================================================
    const results = await Promise.allSettled(
      queueItems.map(async (item) => {
        try {
          const score = await CaaSService.calculate_caas(item.profile_id, supabase);

          // Delete from queue after successful calculation
          await supabase
            .from('caas_recalculation_queue')
            .delete()
            .eq('id', item.id);

          return { profile_id: item.profile_id, score: score.total, success: true };
        } catch (error) {
          console.error(`[caas-worker] Failed to calculate score for ${item.profile_id}:`, error);
          return { profile_id: item.profile_id, success: false, error };
        }
      })
    );

    // ================================================================
    // STEP 5: RETURN SUMMARY
    // ================================================================
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' ||
      (r.status === 'fulfilled' && !r.value.success)).length;

    console.log(`[caas-worker] Processed ${successful} successfully, ${failed} failed`);

    return NextResponse.json({
      message: 'Queue processed',
      processed: queueItems.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error('[caas-worker] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Vercel Cron Configuration** (add to `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/caas-worker",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

**Performance Benchmarks**:
- 50 profiles processed per batch
- ~150ms per score calculation (3 RPC calls + 5 bucket calculations)
- Total batch time: ~7.5 seconds for 50 profiles
- Queue throughput: 300 profiles/hour

### Task 5: Display CaaS Guidance Widget on Dashboard

**Use Case**: Show tutor their score with actionable improvement tips

**Code Location**: `apps/web/src/app/components/feature/caas/CaaSGuidanceWidget.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Card, Button } from '@/components/ui';
import styles from './CaaSGuidanceWidget.module.css';

interface CaaSGuidanceWidgetProps {
  profileId: string;
  profile: {
    bio_video_url: string | null;
    dbs_verified: boolean;
    teaching_experience: number | null;
    degree_level: string | null;
  };
}

export function CaaSGuidanceWidget({ profileId, profile }: CaaSGuidanceWidgetProps) {
  const [scoreData, setScoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScore() {
      try {
        const response = await fetch(`/api/caas/${profileId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setScoreData(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching CaaS score:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchScore();
  }, [profileId]);

  if (loading || !scoreData || scoreData.role_type !== 'TUTOR') {
    return null; // Only show for tutors with calculated scores
  }

  const { total_score, score_breakdown } = scoreData;

  // Calculate potential points from missing items
  const missingPoints = [];

  if (!profile.bio_video_url) {
    missingPoints.push({
      title: 'Add 30-Second Intro Video',
      points: 5,
      category: 'Digital Professionalism',
      link: '/account/professional',
      description: 'Upload a short "Credibility Clip" introducing yourself to potential clients.'
    });
  }

  if (!profile.dbs_verified) {
    missingPoints.push({
      title: 'Complete DBS Check',
      points: 5,
      category: 'Safety',
      link: '/account/verification',
      description: 'Get a Disclosure and Barring Service check to increase trust.'
    });
  }

  if (!profile.degree_level || profile.degree_level === 'NONE') {
    missingPoints.push({
      title: 'Add Your Degree',
      points: 10,
      category: 'Qualifications',
      link: '/account/professional',
      description: 'List your Bachelor's, Master's, or PhD degree.'
    });
  }

  if ((profile.teaching_experience || 0) < 10) {
    const yearsNeeded = 10 - (profile.teaching_experience || 0);
    missingPoints.push({
      title: `Add Teaching Experience (${yearsNeeded} more years for bonus)`,
      points: 10,
      category: 'Qualifications',
      link: '/account/professional',
      description: 'Update your teaching experience to unlock veteran bonus at 10+ years.'
    });
  }

  return (
    <Card className={styles.caasWidget}>
      <div className={styles.header}>
        <h3>Your Credibility Score</h3>
        <div className={styles.scoreBadge}>
          <span className={styles.score}>{total_score}</span>
          <span className={styles.maxScore}>/100</span>
        </div>
      </div>

      <div className={styles.breakdown}>
        <h4>Score Breakdown</h4>
        <div className={styles.buckets}>
          <div className={styles.bucket}>
            <span>Performance & Quality</span>
            <span>{score_breakdown.performance || 0}/30</span>
          </div>
          <div className={styles.bucket}>
            <span>Qualifications & Authority</span>
            <span>{score_breakdown.qualifications || 0}/30</span>
          </div>
          <div className={styles.bucket}>
            <span>Network & Referrals</span>
            <span>{score_breakdown.network || 0}/20</span>
          </div>
          <div className={styles.bucket}>
            <span>Verification & Safety</span>
            <span>{score_breakdown.safety || 0}/10</span>
          </div>
          <div className={styles.bucket}>
            <span>Digital Professionalism</span>
            <span>{score_breakdown.digital || 0}/10</span>
          </div>
        </div>
      </div>

      {missingPoints.length > 0 && (
        <div className={styles.actions}>
          <h4>Improve Your Score (+{missingPoints.reduce((sum, item) => sum + item.points, 0)} potential points)</h4>
          {missingPoints.map((item, index) => (
            <div key={index} className={styles.actionItem}>
              <div className={styles.actionInfo}>
                <h5>{item.title}</h5>
                <p>{item.description}</p>
                <span className={styles.category}>{item.category} • +{item.points} pts</span>
              </div>
              <Button href={item.link}>Complete</Button>
            </div>
          ))}
        </div>
      )}

      <p className={styles.note}>
        Higher scores rank higher in marketplace search and increase booking conversion by an average of 28%.
      </p>
    </Card>
  );
}
```

**Example Dashboard Output**:
```
╔════════════════════════════════════════╗
║  Your Credibility Score         87/100 ║
╠════════════════════════════════════════╣
║  Score Breakdown                       ║
║  • Performance & Quality       28/30   ║
║  • Qualifications & Authority  30/30   ║
║  • Network & Referrals         12/20   ║
║  • Verification & Safety        10/10  ║
║  • Digital Professionalism       7/10  ║
╠════════════════════════════════════════╣
║  Improve Your Score (+3 potential pts) ║
║                                         ║
║  [Complete] Add 30-Second Intro Video  ║
║             Digital Professionalism    ║
║             +3 points                  ║
╚════════════════════════════════════════╝
```

---

## API Reference

### GET /api/caas/[profile_id]

Fetch cached CaaS score for a profile.

**Authentication**: Optional (RLS controls access)
**Pattern**: Pattern 1 (User-Facing API)
**Rate Limit**: None (reads from cache)
**Performance**: <5ms (indexed read from caas_scores)

**Parameters**:
- `profile_id` (path, required) - UUID of the profile

**Response (200 - Success)**:
```json
{
  "success": true,
  "data": {
    "profile_id": "uuid",
    "total_score": 87,
    "score_breakdown": {
      "performance": 28,
      "qualifications": 30,
      "network": 12,
      "safety": 10,
      "digital": 7
    },
    "role_type": "TUTOR",
    "calculated_at": "2025-12-12T14:30:00Z",
    "calculation_version": "tutor-v5.5"
  }
}
```

**Response (404 - Score Not Calculated)**:
```json
{
  "error": "Score not found",
  "message": "CaaS score has not been calculated for this profile yet"
}
```

**Response (400 - Invalid UUID)**:
```json
{
  "error": "Invalid profile_id format"
}
```

**Response (403 - RLS Policy Violation)**:
```json
{
  "error": "Failed to fetch score",
  "details": "new row violates row-level security policy"
}
```

**RLS Policies** (from `074_create_caas_scores_table.sql:66-84`):
- Public can view TUTOR scores (for marketplace)
- Public can view CLIENT scores (for tutor vetting)
- Users can view their own score (for dashboard)
- Only service_role can write scores

### POST /api/caas-worker

Process the caas_recalculation_queue and calculate scores.

**Authentication**: Required (CRON_SECRET header)
**Pattern**: Pattern 2 (Internal Worker)
**Rate Limit**: None (internal use only)
**Trigger**: Vercel Cron (every 10 minutes)

**Headers**:
```
Authorization: Bearer <CRON_SECRET>
```

**Response (200 - Success)**:
```json
{
  "message": "Queue processed",
  "processed": 47,
  "successful": 46,
  "failed": 1
}
```

**Response (401 - Unauthorized)**:
```json
{
  "error": "Unauthorized"
}
```

**Implementation Note**: This endpoint should NOT be exposed to the public internet. Use Vercel Cron's automatic authentication or implement IP whitelisting.

---

## Database Reference

### Table: caas_scores

**Purpose**: Cache table for pre-calculated credibility scores
**Performance**: <5ms reads via indexed profile_id lookups
**Updated By**: POST /api/caas-worker (Pattern 2)

**Schema** (from `074_create_caas_scores_table.sql:17-40`):
```sql
CREATE TABLE public.caas_scores (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  role_type TEXT NOT NULL CHECK (role_type IN ('TUTOR', 'CLIENT', 'AGENT', 'STUDENT')),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculation_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_caas_ranking ON caas_scores(role_type, total_score DESC);
CREATE INDEX idx_caas_profile_id ON caas_scores(profile_id);
CREATE INDEX idx_caas_calculated_at ON caas_scores(calculated_at DESC);
```

**Example Row**:
```sql
profile_id: '123e4567-e89b-12d3-a456-426614174000'
total_score: 87
score_breakdown: {
  "performance": 28,
  "qualifications": 30,
  "network": 12,
  "safety": 10,
  "digital": 7
}
role_type: 'TUTOR'
calculated_at: '2025-12-12 14:30:00+00'
calculation_version: 'tutor-v5.5'
```

### Table: caas_recalculation_queue

**Purpose**: Event queue for score recalculation requests
**Populated By**: Database triggers + manual queueing
**Consumed By**: POST /api/caas-worker (every 10 minutes)

**Schema** (from `075_create_caas_event_queue.sql:17-30`):
```sql
CREATE TABLE public.caas_recalculation_queue (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)  -- Prevents duplicate queue entries
);

-- Indexes for worker
CREATE INDEX idx_caas_queue_created_at ON caas_recalculation_queue(created_at ASC);
CREATE INDEX idx_caas_queue_profile_id ON caas_recalculation_queue(profile_id);
```

**Idempotency**: The UNIQUE constraint on `profile_id` ensures that a profile is only queued once, even if multiple events occur before the worker processes it.

### RPC Function: get_performance_stats()

**Purpose**: Aggregate tutor performance metrics for Bucket 1 (Performance & Quality)
**Called By**: `TutorCaaSStrategy.calculate()` (tutor.ts:76)
**Performance**: ~50ms (joins bookings, reviews, listings tables)

**SQL Implementation** (from `077_create_caas_rpc_functions.sql:20-112`):
```sql
CREATE OR REPLACE FUNCTION public.get_performance_stats(user_id UUID)
RETURNS TABLE (
  avg_rating NUMERIC,
  completed_sessions INTEGER,
  retention_rate NUMERIC,
  manual_session_log_rate NUMERIC
) AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_completed_sessions INTEGER;
  v_retention_rate NUMERIC;
  v_manual_session_log_rate NUMERIC;
  v_unique_repeat_clients INTEGER;
  v_total_unique_clients INTEGER;
BEGIN
  -- 1. Calculate average rating from reviews
  SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
  FROM public.reviews WHERE receiver_id = user_id;

  -- 2. Calculate completed sessions
  SELECT COUNT(*) INTO v_completed_sessions
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id AND b.status = 'completed';

  -- 3. Calculate retention rate (% of clients who booked >1 time)
  WITH client_booking_counts AS (
    SELECT b.client_id, COUNT(*) as booking_count
    FROM public.bookings b
    INNER JOIN public.listings l ON b.listing_id = l.id
    WHERE l.profile_id = user_id AND b.status = 'completed'
    GROUP BY b.client_id
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE booking_count > 1), 0),
    COALESCE(COUNT(*), 0)
  INTO v_unique_repeat_clients, v_total_unique_clients
  FROM client_booking_counts;

  IF v_total_unique_clients > 0 THEN
    v_retention_rate := v_unique_repeat_clients::NUMERIC / v_total_unique_clients::NUMERIC;
  ELSE
    v_retention_rate := 0;
  END IF;

  -- 4. Calculate manual session log rate (for digital professionalism)
  -- [omitted for brevity - see migration file]

  RETURN QUERY SELECT v_avg_rating, v_completed_sessions, v_retention_rate, v_manual_session_log_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Usage in TypeScript**:
```typescript
const { data, error } = await supabase.rpc('get_performance_stats', {
  user_id: 'profile_uuid'
});

// data = { avg_rating: 4.8, completed_sessions: 45, retention_rate: 0.67, manual_session_log_rate: 0.82 }
```

### RPC Function: get_network_stats()

**Purpose**: Aggregate tutor network metrics for Bucket 3 (Network & Referrals)
**Called By**: `TutorCaaSStrategy.calculate()` (tutor.ts:75)
**Performance**: ~30ms (reads profile_graph table)

**SQL Implementation** (from `077_create_caas_rpc_functions.sql:126-168`):
```sql
CREATE OR REPLACE FUNCTION public.get_network_stats(user_id UUID)
RETURNS TABLE (
  referral_count INTEGER,
  connection_count INTEGER,
  is_agent_referred BOOLEAN
) AS $$
BEGIN
  -- 1. Count outgoing AGENT_REFERRAL links (how many people this tutor referred)
  SELECT COUNT(*) INTO v_referral_count
  FROM public.profile_graph
  WHERE source_profile_id = user_id
    AND relationship_type = 'AGENT_REFERRAL'
    AND status = 'ACTIVE';

  -- 2. Count SOCIAL connections (bidirectional)
  SELECT COUNT(*) INTO v_connection_count
  FROM public.profile_graph
  WHERE (source_profile_id = user_id OR target_profile_id = user_id)
    AND relationship_type = 'SOCIAL'
    AND status = 'ACTIVE';

  -- 3. Check if this user was referred by an Agent (incoming AGENT_REFERRAL)
  SELECT EXISTS (
    SELECT 1 FROM public.profile_graph
    WHERE target_profile_id = user_id
      AND relationship_type = 'AGENT_REFERRAL'
      AND status = 'ACTIVE'
  ) INTO v_is_agent_referred;

  RETURN QUERY SELECT v_referral_count, v_connection_count, v_is_agent_referred;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### RPC Function: get_digital_stats()

**Purpose**: Aggregate tutor digital professionalism metrics for Bucket 5
**Called By**: `TutorCaaSStrategy.calculate()` (tutor.ts:77)
**Performance**: ~40ms (reads student_integration_links, bookings with recording_url)

**SQL Implementation** (from `077_create_caas_rpc_functions.sql:182-246`):
```sql
CREATE OR REPLACE FUNCTION public.get_digital_stats(user_id UUID)
RETURNS TABLE (
  google_calendar_synced BOOLEAN,
  google_classroom_synced BOOLEAN,
  lessonspace_usage_rate NUMERIC
) AS $$
BEGIN
  -- 1. Check if Google Calendar is synced
  SELECT EXISTS (
    SELECT 1 FROM public.student_integration_links
    WHERE profile_id = user_id
      AND integration_type = 'GOOGLE_CALENDAR'
      AND is_active = true
  ) INTO v_google_calendar_synced;

  -- 2. Check if Google Classroom is synced
  SELECT EXISTS (
    SELECT 1 FROM public.student_integration_links
    WHERE profile_id = user_id
      AND integration_type = 'GOOGLE_CLASSROOM'
      AND is_active = true
  ) INTO v_google_classroom_synced;

  -- 3. Calculate virtual classroom usage rate
  -- NOTE: "lessonspace_usage_rate" is a historical variable name.
  -- The system actually tracks ANY virtual classroom service via recording_url field:
  -- Lessonspace, Pencil Spaces, Google Meet, Zoom, Microsoft Teams, etc.

  SELECT COUNT(*) INTO v_virtual_classroom_sessions
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id
    AND b.status = 'completed'
    AND b.recording_url IS NOT NULL;  -- Any service that generates a recording

  SELECT COUNT(*) INTO v_total_sessions
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id
    AND b.status = 'completed';

  IF v_total_sessions > 0 THEN
    v_lessonspace_usage_rate := v_virtual_classroom_sessions::NUMERIC / v_total_sessions::NUMERIC;
  ELSE
    v_lessonspace_usage_rate := 0;
  END IF;

  RETURN QUERY SELECT v_google_calendar_synced, v_google_classroom_synced, v_lessonspace_usage_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Important Note**: Despite the variable name `lessonspace_usage_rate`, this metric tracks **any virtual classroom service** that stores a `recording_url` on the booking record, including Lessonspace, Pencil Spaces, Google Meet, Zoom, Microsoft Teams, etc.

### Database Triggers

**Purpose**: Automatically queue profiles for score recalculation when relevant data changes

**Trigger List** (from `078_create_caas_auto_queue_triggers.sql`):

1. **trigger_queue_on_profile_update** (profiles table)
   - **Fires On**: UPDATE of identity_verified, dbs_verified, dbs_expiry, qualifications, teaching_experience, degree_level, bio_video_url
   - **Affects**: Buckets 2 (Qualifications), 4 (Safety), 5 (Digital)
   - **Function**: `queue_caas_recalculation()` (lines 20-31)

2. **trigger_queue_on_new_review** (reviews table)
   - **Fires On**: INSERT
   - **Affects**: Bucket 1 (Performance - avg_rating)
   - **Function**: `queue_caas_for_tutor()` (lines 44-68)

3. **trigger_queue_on_booking_completion** (bookings table)
   - **Fires On**: UPDATE of status (when status changes to 'completed')
   - **Affects**: Bucket 1 (Performance - completed_sessions, retention_rate)
   - **Function**: `queue_caas_for_tutor()`

4. **trigger_queue_on_recording_url_update** (bookings table)
   - **Fires On**: UPDATE of recording_url (when recording_url added)
   - **Affects**: Bucket 5 (Digital - virtual classroom usage rate)
   - **Function**: `queue_caas_for_tutor()`

5. **trigger_queue_on_profile_graph_change** (profile_graph table)
   - **Fires On**: INSERT or UPDATE of status (for SOCIAL or AGENT_REFERRAL relationships)
   - **Affects**: Bucket 3 (Network - referral_count, connection_count, is_agent_referred)
   - **Function**: `queue_caas_for_both_profiles()` (lines 82-92) - queues both source and target

6. **trigger_queue_on_integration_link_change** (student_integration_links table)
   - **Fires On**: INSERT or UPDATE of is_active (for GOOGLE_CALENDAR or GOOGLE_CLASSROOM)
   - **Affects**: Bucket 5 (Digital - integration bonus)
   - **Function**: `queue_caas_recalculation()`

**Example Trigger Flow**:
```
1. Tutor uploads DBS certificate → Admin verifies → UPDATE profiles SET dbs_verified = true
2. Trigger fires → INSERT INTO caas_recalculation_queue (profile_id) VALUES (tutor_id)
3. Worker runs (10 mins later) → Fetches profile from queue
4. CaaSService calculates new score (old: 82, new: 87 with DBS bonus)
5. UPSERT INTO caas_scores → DELETE FROM queue
6. Frontend displays updated score on dashboard
```

---

## Testing

### Unit Tests

**Test File**: `apps/web/src/lib/services/caas/__tests__/tutor.test.ts`

```typescript
import { TutorCaaSStrategy } from '../strategies/tutor';
import { createClient } from '@supabase/supabase-js';

describe('TutorCaaSStrategy', () => {
  let supabase: any;
  let strategy: TutorCaaSStrategy;

  beforeEach(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    strategy = new TutorCaaSStrategy();
  });

  test('returns 0 score for unverified tutor (safety gate)', async () => {
    // Mock profile with identity_verified = false
    supabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'test-id', identity_verified: false },
            error: null
          })
        })
      })
    });

    const result = await strategy.calculate('test-id', supabase);

    expect(result.total).toBe(0);
    expect(result.breakdown.gate).toBe('Identity not verified');
  });

  test('calculates provisional score (30 pts) for new tutor with 0 sessions', async () => {
    const performance = {
      avg_rating: 0,
      completed_sessions: 0,
      retention_rate: 0,
      manual_session_log_rate: 0
    };

    // Use private method via type casting for testing
    const score = (strategy as any).calcPerformance(performance);

    expect(score).toBe(30); // Provisional score logic (tutor.ts:142)
  });

  test('calculates performance score correctly for experienced tutor', async () => {
    const performance = {
      avg_rating: 4.8,
      completed_sessions: 50,
      retention_rate: 0.7,
      manual_session_log_rate: 0.85
    };

    const score = (strategy as any).calcPerformance(performance);

    // (4.8 / 5) * 15 = 14.4
    // 0.7 * 15 = 10.5
    // Total = 24.9 → rounds to 25
    expect(score).toBe(25);
  });

  test('calculates qualifications score correctly', async () => {
    const profile = {
      degree_level: 'MASTERS',
      qualifications: ['QTS', 'PGCE'],
      teaching_experience: 12
    };

    const score = (strategy as any).calcQualifications(profile);

    // degree(10) + QTS(10) + 10+ yrs exp(10) = 30
    expect(score).toBe(30);
  });

  test('calculates network score with referral bonus', async () => {
    const network = {
      referral_count: 3,
      connection_count: 15,
      is_agent_referred: false
    };

    const score = (strategy as any).calcNetwork(network);

    // 3 referrals * 4 pts = 12
    // connection_count > 10 → +8 bonus
    // Total = 20
    expect(score).toBe(20);
  });

  test('calculates safety score with valid DBS', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const profile = {
      identity_verified: true,
      dbs_verified: true,
      dbs_expiry: futureDate.toISOString()
    };

    const score = (strategy as any).calcSafety(profile);

    // identity_verified gate passed (5) + DBS valid (5) = 10
    expect(score).toBe(10);
  });

  test('does not award DBS bonus if expired', async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    const profile = {
      identity_verified: true,
      dbs_verified: true,
      dbs_expiry: pastDate.toISOString()
    };

    const score = (strategy as any).calcSafety(profile);

    // identity_verified gate passed (5) + DBS expired (0) = 5
    expect(score).toBe(5);
  });

  test('calculates digital score with OR rule (video path)', async () => {
    const digital = {
      google_calendar_synced: false,
      google_classroom_synced: false,
      lessonspace_usage_rate: 0.3
    };

    const performance = {
      manual_session_log_rate: 0.5
    };

    const profile = {
      bio_video_url: 'https://example.com/video.mp4'
    };

    const score = (strategy as any).calcDigital(digital, performance, profile);

    // integrations (0) + video exists (5) = 5
    expect(score).toBe(5);
  });

  test('calculates digital score with OR rule (high logging path)', async () => {
    const digital = {
      google_calendar_synced: true,
      google_classroom_synced: false,
      lessonspace_usage_rate: 0.85
    };

    const performance = {
      manual_session_log_rate: 0.2
    };

    const profile = {
      bio_video_url: null
    };

    const score = (strategy as any).calcDigital(digital, performance, profile);

    // integrations (5) + high virtual classroom usage (5) = 10
    expect(score).toBe(10);
  });
});
```

### Integration Tests

**Test File**: `apps/web/src/lib/services/caas/__tests__/integration.test.ts`

```typescript
import { CaaSService } from '../index';
import { createClient } from '@supabase/supabase-js';

describe('CaaS Integration Tests', () => {
  let supabase: any;
  let testProfileId: string;

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test tutor profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        roles: ['TUTOR'],
        identity_verified: true,
        dbs_verified: true,
        dbs_expiry: '2026-12-31',
        degree_level: 'MASTERS',
        qualifications: ['QTS'],
        teaching_experience: 12,
        bio_video_url: 'https://example.com/test.mp4'
      })
      .select()
      .single();

    testProfileId = data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('profiles').delete().eq('id', testProfileId);
  });

  test('end-to-end score calculation for tutor', async () => {
    const result = await CaaSService.calculate_caas(testProfileId, supabase);

    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.breakdown.performance).toBeDefined();
    expect(result.breakdown.qualifications).toBeDefined();
    expect(result.breakdown.network).toBeDefined();
    expect(result.breakdown.safety).toBeDefined();
    expect(result.breakdown.digital).toBeDefined();
  });

  test('score is cached in caas_scores table', async () => {
    await CaaSService.calculate_caas(testProfileId, supabase);

    const { data, error } = await supabase
      .from('caas_scores')
      .select('*')
      .eq('profile_id', testProfileId)
      .single();

    expect(error).toBeNull();
    expect(data.total_score).toBeGreaterThan(0);
    expect(data.role_type).toBe('TUTOR');
    expect(data.calculation_version).toBe('tutor-v5.5');
  });

  test('queueRecalculation adds profile to queue', async () => {
    await CaaSService.queueRecalculation(testProfileId, supabase);

    const { data, error } = await supabase
      .from('caas_recalculation_queue')
      .select('*')
      .eq('profile_id', testProfileId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  test('getScore retrieves cached score', async () => {
    // First calculate a score
    await CaaSService.calculate_caas(testProfileId, supabase);

    // Then retrieve it
    const score = await CaaSService.getScore(testProfileId, supabase);

    expect(score).not.toBeNull();
    expect(score!.total).toBeGreaterThan(0);
  });
});
```

### Manual Testing Checklist

Use this checklist to manually verify CaaS functionality:

#### Setup Verification
- [ ] Run all 4 CaaS migrations (074, 075, 077, 078)
- [ ] Verify `caas_scores` table exists with 3 indexes
- [ ] Verify `caas_recalculation_queue` table exists with UNIQUE constraint
- [ ] Verify 3 RPC functions exist: `get_performance_stats()`, `get_network_stats()`, `get_digital_stats()`
- [ ] Verify 6 database triggers exist on profiles, reviews, bookings, profile_graph, student_integration_links

#### Score Calculation (Manual)
- [ ] Call `CaaSService.calculate_caas()` for a test tutor
- [ ] Verify score is between 0-100
- [ ] Verify score_breakdown has 5 buckets: performance, qualifications, network, safety, digital
- [ ] Verify score is saved to `caas_scores` table

#### Safety Gate
- [ ] Create tutor with `identity_verified = false`
- [ ] Calculate score → Verify result is 0 with `breakdown.gate = 'Identity not verified'`
- [ ] Set `identity_verified = true` and recalculate
- [ ] Verify score is now >0

#### Provisional Score (Cold Start)
- [ ] Create new tutor with 0 completed sessions
- [ ] Calculate score → Verify `breakdown.performance = 30` (provisional score)
- [ ] Add a completed booking
- [ ] Recalculate → Verify performance score changes to formula-based calculation

#### API Endpoint
- [ ] GET `/api/caas/[valid_tutor_id]` → Verify 200 response with score data
- [ ] GET `/api/caas/[invalid_uuid]` → Verify 400 response
- [ ] GET `/api/caas/[profile_with_no_score]` → Verify 404 response

#### Event-Driven Queue
- [ ] Update a tutor's `dbs_verified` field → Verify profile added to queue
- [ ] Insert a new review for tutor → Verify tutor added to queue
- [ ] Complete a booking → Verify tutor added to queue
- [ ] Add `recording_url` to booking → Verify tutor added to queue
- [ ] Create SOCIAL relationship in profile_graph → Verify both profiles added to queue
- [ ] Activate Google Calendar integration → Verify profile added to queue

#### Worker Processing
- [ ] Manually call POST `/api/caas-worker` with CRON_SECRET
- [ ] Verify queue is processed (check response JSON)
- [ ] Verify profiles are removed from queue after processing
- [ ] Verify `caas_scores` table is updated with new scores

#### Dashboard Widget
- [ ] Navigate to tutor dashboard
- [ ] Verify CaaSGuidanceWidget displays current score
- [ ] Verify score breakdown shows all 5 buckets
- [ ] Verify action items appear for missing credentials (e.g., "Add DBS Check")
- [ ] Click action item link → Verify it navigates to correct page

#### Marketplace Integration
- [ ] Search for tutors in marketplace
- [ ] Verify tutors are sorted by `total_score DESC`
- [ ] Verify unverified tutors (score=0) are hidden from search
- [ ] Verify credibility badge displays on tutor cards

---

## Troubleshooting

### Issue: Score shows 0 for verified tutor

**Symptoms**:
- Tutor has `identity_verified = true`
- Dashboard shows "Your Credibility Score: 0/100"
- No score_breakdown displayed

**Diagnosis**:
```sql
-- Check if score exists in cache
SELECT * FROM caas_scores WHERE profile_id = 'tutor_uuid';

-- Check if profile is in recalculation queue
SELECT * FROM caas_recalculation_queue WHERE profile_id = 'tutor_uuid';
```

**Solution**:
1. If no score in cache: Manually queue for calculation
   ```sql
   INSERT INTO caas_recalculation_queue (profile_id) VALUES ('tutor_uuid');
   ```
2. Wait 10 minutes for worker to process, OR manually trigger worker:
   ```bash
   curl -X POST http://localhost:3000/api/caas-worker \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

### Issue: Score not updating after profile changes

**Symptoms**:
- Tutor updates their degree_level or qualifications
- Score remains unchanged after 15+ minutes

**Diagnosis**:
```sql
-- Check if trigger fired (profile should be in queue)
SELECT * FROM caas_recalculation_queue WHERE profile_id = 'tutor_uuid';

-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_queue_on_profile_update';
```

**Solution**:
1. If profile not in queue: Trigger may be disabled or broken
   ```sql
   -- Manually queue
   INSERT INTO caas_recalculation_queue (profile_id) VALUES ('tutor_uuid');
   ```
2. If trigger missing: Re-run migration 078
   ```bash
   psql $DATABASE_URL -f migrations/078_create_caas_auto_queue_triggers.sql
   ```

### Issue: Worker failing with RPC errors

**Symptoms**:
- Worker logs show: `Failed to calculate score: function get_performance_stats(uuid) does not exist`
- Queue items are not being processed

**Diagnosis**:
```sql
-- Check if RPC functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('get_performance_stats', 'get_network_stats', 'get_digital_stats');
```

**Solution**:
1. Re-run RPC function migration:
   ```bash
   psql $DATABASE_URL -f migrations/077_create_caas_rpc_functions.sql
   ```
2. Verify service_role has EXECUTE permissions:
   ```sql
   GRANT EXECUTE ON FUNCTION get_performance_stats(UUID) TO service_role;
   GRANT EXECUTE ON FUNCTION get_network_stats(UUID) TO service_role;
   GRANT EXECUTE ON FUNCTION get_digital_stats(UUID) TO service_role;
   ```

### Issue: Stale scores (calculated_at is old)

**Symptoms**:
- Score was last calculated >1 week ago
- Recent data changes not reflected in score

**Diagnosis**:
```sql
-- Find stale scores
SELECT profile_id, total_score, calculated_at
FROM caas_scores
WHERE calculated_at < NOW() - INTERVAL '7 days'
ORDER BY calculated_at ASC
LIMIT 10;
```

**Solution**:
1. Queue all stale profiles for recalculation:
   ```sql
   INSERT INTO caas_recalculation_queue (profile_id)
   SELECT profile_id FROM caas_scores
   WHERE calculated_at < NOW() - INTERVAL '7 days'
   ON CONFLICT (profile_id) DO NOTHING;
   ```
2. Wait for worker to process, or manually trigger worker

---

**Last Updated**: 2025-12-12
**Version**: v5.5 (30/30/20/10/10 model)
**Maintainer**: Trust & Safety Team + Marketplace Team

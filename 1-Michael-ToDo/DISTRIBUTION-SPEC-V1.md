# Blog Distribution Specification v1 (FROZEN)

**Purpose**: Publish TutorWise resource articles to TutorWise LinkedIn Page
**Measurement**: Downstream marketplace outcomes (bookings, revenue), NOT social engagement
**Scope**: LinkedIn Page only, organic posts only
**Status**: Specification frozen - implement as-is unless LinkedIn forces a change

**Last Updated**: 2026-01-17
**Version**: 1.0 (Locked)

---

## Table of Contents

1. [Product Decision (Locked)](#1-product-decision-locked)
2. [UI Mapping](#2-ui-mapping-clean-separation)
3. [LinkedIn API Integration](#3-linkedin-api-integration-exact-scope)
4. [Core Publishing API](#4-core-publishing-api-the-only-call-you-need)
5. [Distribution Worker](#5-distribution-worker-background-job)
6. [Attribution](#6-attribution-already-correct)
7. [What We Do NOT Build](#7-what-you-explicitly-do-not-build-locked)
8. [Failure Handling](#8-failure-handling-enough-not-fancy)
9. [End-to-End Architecture](#9-end-to-end-architecture-final)
10. [Implementation Checklist](#10-implementation-checklist)
11. [Comparison: My Analysis vs Approved Spec](#11-comparison-analysis-vs-approved-spec)

---

## 1. Product Decision (Locked)

### What This IS:
**Distribution Engine** - Publish blog content to LinkedIn Page for marketplace demand generation

### What This IS NOT:
- ❌ Social media management tool
- ❌ Engagement analytics platform
- ❌ Multi-channel scheduler
- ❌ Content calendar system

### Core Metrics:
- ✅ Blog views from LinkedIn
- ✅ Marketplace clicks from blog
- ✅ Bookings attributed to distributed posts
- ✅ Revenue per distributed article
- ❌ Likes, comments, shares (not primary metrics)

### Strategic Differentiation:
**Buffer/Hootsuite**: Stop at engagement metrics
**TutorWise**: Go from LinkedIn post → booking revenue

This is **growth instrumentation**, not social scheduling.

---

## 2. UI Mapping (Clean Separation)

### 2.1 Admin UI: Distribution Operations (Tab-Driven)

**Location**: `/admin/blog/distribution`
**Pattern**: Hub layout (matching existing Orchestrator dashboard)
**Entity**: `blog_distributions` table

#### Tabs (Lifecycle States):

```
┌────────────────────────────────────────────────────────────────┐
│ Distribution Hub                                                │
├────────────────────────────────────────────────────────────────┤
│ Tabs: [Draft] [Scheduled] [Published] [Failed]                │
└────────────────────────────────────────────────────────────────┘
```

**NOT Kanban. NOT drag/drop. This is operations, not planning.**

#### Columns (Minimum Viable Set):

| Column | Type | Notes |
|--------|------|-------|
| **Article** | Link | Navigate to article |
| **Channel** | Badge | "LinkedIn" (read-only for v1) |
| **Status** | Badge | Draft/Scheduled/Published/Failed |
| **Scheduled At** | DateTime | When to publish |
| **Published At** | DateTime | Actual publish time (nullable) |
| **Error** | Text | If failed, show error message |
| **Distribution ID** | UUID | Read-only, for debugging |

#### Actions (Context-Aware):

| Action | Available When | Behavior |
|--------|---------------|----------|
| **Schedule** | Draft only | Set scheduled_at, status → 'scheduled' |
| **Cancel** | Scheduled only | status → 'draft' |
| **Retry** | Failed only | status → 'scheduled' (retry same time or new) |
| **View Article** | Always | Open resource article in new tab |
| **View Results** | Published only | Deep-link to Phase 3 Orchestrator with distribution filter |

#### Toolbar Actions:
- **New Distribution** - Opens modal to select article + schedule time
- **Bulk Schedule** - Select multiple articles, schedule to same time
- **Refresh** - Reload table data

**No advanced features**:
- No optimal time suggestions
- No auto-posting
- No templating
- No A/B testing

This is **manual scheduling with attribution tracking**.

---

## 3. LinkedIn API Integration (Exact Scope)

### 3.1 App Permissions (Request ONLY These)

**Required Scopes**:
```
w_organization_social    - Write posts to company page
r_organization_social    - Read company page data
r_organization_admin     - Verify admin access
```

**NOTHING ELSE.**

❌ No member permissions
❌ No analytics scopes (r_basicprofile, r_liteprofile, r_ads, etc.)
❌ No messaging scopes

### 3.2 LinkedIn App Setup

**Step 1**: Create LinkedIn App at [linkedin.com/developers](https://www.linkedin.com/developers/)

**Step 2**: Request permissions
- When LinkedIn asks "Why do you need these permissions?"
- Answer EXACTLY: **"The app publishes our company's resource articles to our own LinkedIn Page."**
- **STOP THERE.**

**Do NOT mention**:
- Scheduling systems
- Automation
- Analytics
- Attribution
- Dashboards

**Reason**: These words trigger manual review delays. Keep it simple.

**Step 3**: Associate app with TutorWise LinkedIn Page
- App Settings → Associated Pages → Add TutorWise

### 3.3 Organization URN (v1 Decision)

**Fetch Once** after OAuth completes:
```typescript
GET https://api.linkedin.com/v2/organizationAcls?q=roleAssignee
&role=ADMINISTRATOR
&state=APPROVED

Response:
{
  "elements": [{
    "organization": "urn:li:organization:12345678",
    "role": "ADMINISTRATOR"
  }]
}
```

**Store Internally**:
```sql
-- In blog_social_accounts or app config
platform_account_id = '12345678'
organization_urn = 'urn:li:organization:12345678'
```

**Hardcode per Environment**:
```typescript
// config/linkedin.ts
export const LINKEDIN_ORG_URN = process.env.NODE_ENV === 'production'
  ? 'urn:li:organization:12345678'  // Production TutorWise page
  : 'urn:li:organization:87654321'; // Staging test page
```

**No org chooser UI. No multi-page support.**

If you need multiple pages later, that's v2.

---

## 4. Core Publishing API (The Only Call You Need)

### 4.1 Create Post (UGC Posts API)

**Endpoint**:
```
POST https://api.linkedin.com/v2/ugcPosts
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

**Payload** (FINAL for v1):
```json
{
  "author": "urn:li:organization:12345678",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "How to find the perfect GCSE Maths tutor 👇"
      },
      "shareMediaCategory": "ARTICLE",
      "media": [
        {
          "status": "READY",
          "originalUrl": "https://tutorwise.io/blog/how-to-find-gcse-maths-tutor?utm_source=linkedin&utm_medium=organic_social&utm_campaign=distribution&utm_content=dist_UUID"
        }
      ]
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

**Response** (Success):
```json
{
  "id": "urn:li:share:123456789",
  "activity": "urn:li:activity:987654321"
}
```

**This is the publishing engine.**

**v1 Restrictions**:
- ❌ No image uploads (LinkedIn pulls from og:image)
- ❌ No video posts
- ❌ No carousels
- ❌ No threading
- ❌ No comments
- ❌ No polls
- ❌ No mentions

Just: **Text + Link**. That's it.

### 4.2 UTM Parameters (Critical for Attribution)

**Standard Format**:
```
?utm_source=linkedin
&utm_medium=organic_social
&utm_campaign=distribution
&utm_content=dist_{DISTRIBUTION_ID}
```

**Why `utm_content=dist_UUID`**:
- Enables filtering Phase 3 Orchestrator by specific distribution
- Answers: "Did distribution X drive any bookings?"
- Required for economic outcome tracking

**Alternative** (if UTMs clutter):
```
?d={DISTRIBUTION_ID}
```

Then expand in middleware to full UTM set + track in `blog_attribution_events`.

---

## 5. Distribution Worker (Background Job)

### 5.1 Execution Model

**Pattern**: Vercel Cron (serverless function)
**Schedule**: Every 1-5 minutes
**Characteristics**:
- Stateless (no shared memory between runs)
- Idempotent (safe to run multiple times on same row)
- Fast (process 10 rows max per run)

**Location**: `app/api/cron/distribution/route.ts`

### 5.2 Worker Query

```sql
SELECT *
FROM blog_distributions
WHERE status = 'scheduled'
  AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC
LIMIT 10;
```

**Why LIMIT 10**:
- Prevents timeout on large backlogs
- Next cron run picks up remainder
- LinkedIn API has rate limits (100 posts/day)

### 5.3 Processing Rules

**For Each Row**:

**Success Path**:
```typescript
try {
  // 1. Call LinkedIn API
  const response = await postToLinkedIn(distribution);

  // 2. Update database
  await supabase
    .from('blog_distributions')
    .update({
      status: 'published',
      published_at: new Date(),
      external_post_id: response.id, // Optional: store LinkedIn post ID
      error_code: null,
      error_message: null
    })
    .eq('id', distribution.id);

} catch (error) {
  // Handle failure (see section 8)
}
```

**Failure Path**:
```typescript
catch (error) {
  await supabase
    .from('blog_distributions')
    .update({
      status: 'failed',
      failed_at: new Date(),
      error_code: error.code,        // 'TOKEN_EXPIRED', 'RATE_LIMIT', etc.
      error_message: error.message,   // Human-readable
      retry_count: distribution.retry_count + 1
    })
    .eq('id', distribution.id);
}
```

**No Auto-Retry.**

Retries are **manual via UI**.

**Why**:
- Prevents infinite loops
- Avoids rate-limit spirals
- No ghost posts (double-posting same content)
- Admin explicitly decides whether to retry

### 5.4 Cron Configuration

**Vercel `vercel.json`**:
```json
{
  "crons": [
    {
      "path": "/api/cron/distribution",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Auth Protection** (Critical):
```typescript
// Verify cron secret
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Process distributions...
}
```

Without this, anyone can trigger the cron endpoint.

---

## 6. Attribution (Already Correct)

**You already have** (Phase 1-3 complete):
- ✅ `distribution_id` in URLs
- ✅ Session tracking (30-day cookies)
- ✅ `blog_attribution_events` table
- ✅ Phase 3 Orchestrator dashboard
- ✅ Multi-touch attribution infrastructure

**Distribution automatically inherits this**:

```
LinkedIn Post (with distribution_id)
        ↓
User clicks → Resource article loaded
        ↓
Session cookie set → distribution_id captured
        ↓
User clicks TutorEmbed
        ↓
blog_attribution_events: event='click', source='distribution:{ID}'
        ↓
User books tutor
        ↓
blog_attribution_events: event='convert', source='distribution:{ID}'
        ↓
Phase 3 Dashboard shows:
  - Distribution {ID} → 1 booking → £60 revenue
```

**No new attribution code needed.**

Just ensure:
1. Distribution URLs include `?d={ID}` or `?utm_content=dist_{ID}`
2. Middleware parses param → stores in session
3. Events reference `source_component: 'distribution'` or `metadata.distribution_id`

### 6.1 Orchestrator Dashboard Enhancement

**Add Distribution Filter** to existing dashboard:

**New Filter Dropdown**:
```
Filter by: [All Sources ▼]
  - All Sources
  - Organic Search (SEO)
  - Distribution (LinkedIn)  ← NEW
  - Direct Traffic
  - Referral
```

**When "Distribution" selected**:
- Filter `blog_attribution_events` WHERE `metadata->>'distribution_id' IS NOT NULL`
- Show: Which distributions drove views/clicks/bookings
- Display: Revenue per distribution

**New Metric Card** (Overview tab):
```
┌──────────────────────────────┐
│ LinkedIn Distribution        │
│ 12 posts sent this month     │
│ 450 clicks → 3 bookings      │
│ £180 revenue                 │
│ ROI: 12x (vs organic 3x)     │
└──────────────────────────────┘
```

**Differentiation**:
- Buffer shows: 450 clicks, 3% CTR ✅ (stops here)
- TutorWise shows: 450 clicks → 3 bookings → £180 revenue ✅✅✅ (keeps going)

This is your moat.

---

## 7. What You Explicitly Do NOT Build (Locked)

### ❌ LinkedIn Analytics API
**Why**: You measure economic outcomes (bookings), not engagement (likes)
**Instead**: Use Phase 3 attribution to track blog → marketplace conversion

### ❌ Like / Comment / Share Counts
**Why**: Vanity metrics that don't correlate with bookings
**Instead**: Track clicks → views → marketplace interactions

### ❌ "Best Time to Post" Logic
**Why**: Over-engineering, tiny ROI
**Instead**: Admin schedules based on their judgment (maybe Tuesday 2pm works best - they decide)

### ❌ Hashtag Suggestions
**Why**: LinkedIn's algorithm is opaque, #tutoring might work or not
**Instead**: Let admin type hashtags manually in post text

### ❌ Multi-Channel Publishing
**Why**: Twitter/Facebook have different dynamics, different ROI
**Instead**: v1 = LinkedIn only. Expand to Twitter in v2 IF LinkedIn proves valuable

### ❌ Personal Account Posting
**Why**: Account suspension risk, not scalable
**Instead**: Company page only (safer, professional)

### ❌ OAuth Account Switcher
**Why**: One company = one LinkedIn page
**Instead**: Hardcode organization URN per environment

### ❌ Post Previews Beyond Text Box
**Why**: LinkedIn's preview is deterministic (pulls og:image, og:title)
**Instead**: Show text box + article link, trust LinkedIn's preview

### ❌ Image Uploads
**Why**: Adds complexity (image hosting, resize, CDN)
**Instead**: LinkedIn pulls `og:image` from article automatically

### ❌ Video Posts
**Why**: Video hosting/encoding is expensive
**Instead**: Stick to text + link (article is the content)

### ❌ Carousels / Polls / Mentions
**Why**: Marginal engagement gains, high implementation cost
**Instead**: Simple text + link is proven to work

### ❌ Comment Auto-Replies
**Why**: Requires engagement monitoring, spam risk
**Instead**: Admins respond manually if needed

### ❌ Slack Alerts / Email Notifications
**Why**: Adds operational overhead
**Instead**: Admins check Distribution tab manually (tab shows red badges for failures)

**If it doesn't move sign-ups, listings, or bookings → it's out.**

---

## 8. Failure Handling (Enough, Not Fancy)

### 8.1 Failure Types to Store

```typescript
type ErrorCode =
  | 'TOKEN_EXPIRED'       // OAuth token invalid
  | 'PERMISSION_REVOKED'  // Admin removed app access
  | 'RATE_LIMITED'        // Hit 100 posts/day limit
  | 'INVALID_URL'         // Resource article URL malformed
  | 'NETWORK_ERROR'       // Timeout, connection failed
  | 'UNKNOWN';            // Catch-all

interface Distribution {
  // ... other fields
  error_code: ErrorCode | null;
  error_message: string | null;  // Human-readable for admin
  retry_count: number;
  max_retries: number;  // Default: 3
}
```

### 8.2 UI Behavior

**Failed Tab**:
```
┌────────────────────────────────────────────────────────────────┐
│ Article               │ Error               │ Actions          │
├───────────────────────┼─────────────────────┼──────────────────┤
│ GCSE Maths Tips       │ 🔴 Token Expired    │ [Retry] [Delete] │
│ A-Level Guide         │ 🔴 Rate Limited     │ [Retry] [Delete] │
│ Tutor Pricing         │ 🔴 Invalid URL      │ [Edit] [Delete]  │
└────────────────────────────────────────────────────────────────┘
```

**Error Tooltip** (on hover):
```
❌ Token Expired
Your LinkedIn access token has expired.
Click "Reconnect" in Settings to reauthorize.

Last attempt: 2026-01-17 14:32
Retry count: 2/3
```

**Actions**:
- **Retry**: Reset status to 'scheduled', admin can choose new time
- **Edit**: Fix article URL or post text
- **Delete**: Remove from queue entirely

### 8.3 No Alerting

**No**:
- Email notifications
- Slack messages
- SMS alerts
- Push notifications

**Why**:
- Failures are low-urgency (not payment failures or security breaches)
- Admins check Distribution tab regularly
- Red badge on "Failed" tab (count: 2) is sufficient visual cue

**If critical** (e.g., 10 failures in a row):
- Consider adding email alert in v2
- For v1, manual monitoring is acceptable

---

## 9. End-to-End Architecture (Final)

```
┌─────────────────────────────────────────────────────────────────┐
│                     FULL DISTRIBUTION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. ADMIN UI (Distribution Tab)
   Admin schedules article for LinkedIn distribution
        ↓
   Creates row in blog_distributions
   status: 'scheduled'
   scheduled_at: '2026-01-18 14:00:00'

2. DATABASE (blog_distributions)
   Row awaits cron worker processing

3. BACKGROUND WORKER (Vercel Cron - runs every 5 min)
   Fetches rows WHERE scheduled_at <= NOW()
   Calls LinkedIn API for each row
        ↓
   Success: status → 'published'
   Failure: status → 'failed', stores error

4. LINKEDIN PAGE API
   POST /v2/ugcPosts
   {
     author: "urn:li:organization:12345678",
     text: "How to find the perfect GCSE Maths tutor 👇",
     link: "https://tutorwise.io/blog/article?d=UUID"
   }
        ↓
   LinkedIn publishes post to TutorWise company page

5. TRACKED BLOG LINK (UTMs + distribution_id)
   User sees post on LinkedIn feed
   Clicks link → Lands on resource article
   Middleware captures: distribution_id from ?d=UUID param
   Sets session cookie with attribution data

6. MARKETPLACE ATTRIBUTION EVENTS
   User reads article → clicks TutorEmbed
   blog_attribution_events INSERT:
     event_type: 'click'
     source_component: 'distribution'
     metadata: { distribution_id: UUID }

   User books tutor
   blog_attribution_events INSERT:
     event_type: 'convert'
     target_type: 'booking'
     metadata: { distribution_id: UUID, revenue: 60 }

7. PHASE 3 ORCHESTRATOR DASHBOARD
   Admin filters by "Distribution source"
   Sees:
     - Distribution UUID
     - Article: "How to find GCSE Maths tutor"
     - Clicks: 45
     - Bookings: 2
     - Revenue: £120
     - ROI: (£120 - £0 cost) = ∞

8. ECONOMIC OUTCOME MEASURED
   Buffer stops at: "45 clicks, 3.6% CTR"
   TutorWise shows: "45 clicks → 2 bookings → £120 revenue"

   This is the differentiation.
```

**Clean. Bounded. Defensible.**

---

## 10. Implementation Checklist

### Phase 1: Database Schema (1 day)

```sql
-- blog_distributions table
CREATE TABLE blog_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,

  -- Distribution details
  platform TEXT NOT NULL DEFAULT 'linkedin' CHECK (platform = 'linkedin'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Post content
  post_text TEXT NOT NULL,  -- Admin can customize
  post_url TEXT NOT NULL,   -- Resource article URL with UTMs

  -- LinkedIn response
  external_post_id TEXT,    -- urn:li:share:123456789
  external_response JSONB,

  -- Error handling
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX idx_distributions_status ON blog_distributions(status);
CREATE INDEX idx_distributions_scheduled ON blog_distributions(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_distributions_article ON blog_distributions(article_id);

-- RLS
ALTER TABLE blog_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage distributions"
  ON blog_distributions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_role IS NOT NULL
    )
  );
```

```sql
-- blog_social_accounts (for OAuth tokens)
CREATE TABLE blog_social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  platform TEXT NOT NULL DEFAULT 'linkedin',
  account_type TEXT NOT NULL DEFAULT 'company',

  -- OAuth
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- LinkedIn org
  organization_urn TEXT,  -- urn:li:organization:12345678
  organization_id TEXT,   -- 12345678

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_auth_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE blog_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage social accounts"
  ON blog_social_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_role IS NOT NULL
    )
  );
```

### Phase 2: LinkedIn OAuth (2 days)

**API Routes**:
```
POST   /api/admin/blog/distribution/oauth/linkedin/authorize
GET    /api/admin/blog/distribution/oauth/linkedin/callback
DELETE /api/admin/blog/distribution/oauth/linkedin/disconnect
GET    /api/admin/blog/distribution/oauth/linkedin/status
```

**Flow**:
1. Admin clicks "Connect LinkedIn" in Distribution Settings
2. Redirects to LinkedIn OAuth
3. User approves scopes
4. Callback stores access_token + organization_urn
5. Status API shows "✓ Connected"

### Phase 3: Distribution UI (3 days)

**Pages**:
```
/admin/blog/distribution/page.tsx          - Main hub (tabs)
/admin/blog/distribution/components/
  - DistributionTable.tsx                  - HubDataTable
  - NewDistributionModal.tsx               - Schedule modal
  - DistributionSettingsWidget.tsx         - LinkedIn connection status
```

**Features**:
- Tab navigation (Draft/Scheduled/Published/Failed)
- New Distribution button → Modal
- Retry/Cancel/Delete actions
- Connection status sidebar widget

### Phase 4: Background Worker (2 days)

**File**: `app/api/cron/distribution/route.ts`

**Logic**:
```typescript
export async function GET(request: Request) {
  // 1. Verify cron secret
  // 2. Fetch pending distributions
  // 3. For each: call LinkedIn API
  // 4. Update status (published/failed)
  // 5. Return summary
}
```

**LinkedIn Posting Function**:
```typescript
async function postToLinkedIn(distribution: Distribution) {
  const account = await getLinkedInAccount();

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${account.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      author: account.organization_urn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: distribution.post_text },
          shareMediaCategory: 'ARTICLE',
          media: [{ status: 'READY', originalUrl: distribution.post_url }]
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    })
  });

  if (!response.ok) throw new Error(await response.text());

  return response.json();
}
```

### Phase 5: Attribution Integration (1 day)

**Middleware Enhancement**:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const distributionId = url.searchParams.get('d');

  if (distributionId) {
    const response = NextResponse.next();
    response.cookies.set('tw_distribution_id', distributionId, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true
    });
    return response;
  }

  return NextResponse.next();
}
```

**Event Tracking**:
```typescript
// When user clicks tutor embed
await fetch('/api/blog/attribution/events', {
  method: 'POST',
  body: JSON.stringify({
    event_type: 'click',
    source_component: 'distribution',
    metadata: {
      distribution_id: getCookie('tw_distribution_id')
    }
  })
});
```

### Phase 6: Orchestrator Dashboard Update (1 day)

**Add Distribution Filter**:
```typescript
// /admin/blog/orchestrator/page.tsx
const [sourceFilter, setSourceFilter] = useState<'all' | 'distribution' | 'organic'>('all');

// Filter RPC calls
const { data } = useQuery({
  queryKey: ['orchestrator-stats', days, attributionWindow, sourceFilter],
  queryFn: async () => {
    const res = await fetch(`/api/admin/blog/orchestrator/stats?days=${days}&source=${sourceFilter}`);
    return res.json();
  }
});
```

**New KPI Card**:
```typescript
<HubKPICard
  label="LinkedIn Distribution"
  value={distributionStats.posts_sent}
  sublabel={`${distributionStats.clicks} clicks → ${distributionStats.bookings} bookings`}
  icon={LinkedInIcon}
  trend={distributionStats.trend}
/>
```

### Phase 7: Testing & Launch (2 days)

**Test Scenarios**:
1. ✅ Admin connects LinkedIn account
2. ✅ Admin schedules distribution
3. ✅ Cron worker publishes at scheduled time
4. ✅ LinkedIn post appears on company page
5. ✅ User clicks post → lands on blog
6. ✅ Distribution ID captured in session
7. ✅ User books tutor → attribution event created
8. ✅ Orchestrator shows distribution → booking
9. ✅ Failed distribution shows error in UI
10. ✅ Retry works correctly

**Total Effort**: ~12 days (2.5 weeks)

---

## 11. Comparison: Analysis vs Approved Spec

### My Original Proposal (DISTRIBUTION-GAP-ANALYSIS.md)

| Aspect | My Proposal | Your Approved Spec | Winner |
|--------|-------------|-------------------|--------|
| **Scope** | Multi-platform (LinkedIn, Twitter, Facebook) | LinkedIn only | ✅ **Approved** (focus) |
| **Account Type** | Hybrid (Company + Personal) | Company page only | ✅ **Approved** (simpler, safer) |
| **UI Pattern** | Hub with Queue/Scheduled/Posted/Analytics tabs | Hub with Draft/Scheduled/Published/Failed tabs | ✅ **Approved** (cleaner lifecycle) |
| **Features** | Hashtag suggestions, optimal timing, A/B testing | None - manual scheduling only | ✅ **Approved** (no over-engineering) |
| **Analytics** | Pull LinkedIn engagement metrics | None - track economic outcomes only | ✅ **Approved** (strategic focus) |
| **Worker Pattern** | Vercel Cron (same) | Vercel Cron (same) | ✅ **Match** |
| **Attribution** | UTM params + distribution_id | UTM params or `?d=UUID` | ✅ **Match** (slightly simpler) |
| **Failure Handling** | Auto-retry with exponential backoff | Manual retry only | ✅ **Approved** (safer) |
| **Image Uploads** | Support custom image uploads | No uploads, rely on og:image | ✅ **Approved** (simpler) |
| **Post Previews** | Rich preview in admin UI | Trust LinkedIn's preview | ✅ **Approved** (less code) |
| **Notifications** | Email alerts for failures | No alerts, check UI manually | ✅ **Approved** (less operational overhead) |

### Key Differences (Why Approved Spec is Better)

#### 1. **Scope Reduction = Faster Launch**
**My Proposal**: Twitter, Facebook, LinkedIn, personal accounts, multi-channel
**Approved**: LinkedIn company page only

**Impact**:
- 3 OAuth integrations → 1 OAuth integration
- 3 API implementations → 1 API implementation
- Development time: 6 weeks → 2.5 weeks
- **Winner**: Approved spec (get to market faster, validate ROI before expanding)

#### 2. **No Vanity Metrics = Strategic Focus**
**My Proposal**: Pull likes, comments, shares from LinkedIn Analytics API
**Approved**: Ignore engagement, measure bookings only

**Impact**:
- Avoids request for `r_analytics_lite` scope (simplifies LinkedIn approval)
- Dashboard shows what matters: revenue, not likes
- **Winner**: Approved spec (aligns with strategic differentiation)

#### 3. **Manual Retry = No Ghost Posts**
**My Proposal**: Auto-retry with exponential backoff
**Approved**: Manual retry only

**Impact**:
- No risk of double-posting same content
- No infinite retry loops
- Admin explicitly decides whether to retry or cancel
- **Winner**: Approved spec (safer, more predictable)

#### 4. **Tab Lifecycle = Operations Clarity**
**My Proposal**: Queue/Scheduled/Posted/Analytics tabs
**Approved**: Draft/Scheduled/Published/Failed tabs

**Impact**:
- Matches natural workflow: Draft → Schedule → Publish
- Failed is separate from Published (easier to spot errors)
- No "Analytics" tab (analytics live in Orchestrator, not here)
- **Winner**: Approved spec (cleaner separation of concerns)

#### 5. **No Feature Creep = Maintainability**
**My Proposal**: Optimal posting times, hashtag suggestions, A/B testing
**Approved**: None of that - manual scheduling only

**Impact**:
- Less code to maintain
- No ML models to train/update
- Admin retains full control
- Can add these in v2 IF data shows they're valuable
- **Winner**: Approved spec (YAGNI principle - You Aren't Gonna Need It)

### Where My Analysis Added Value

Despite the spec being leaner, my analysis contributed:

1. ✅ **LinkedIn API Research** - Exact endpoints, scopes, rate limits documented
2. ✅ **OAuth Flow** - Step-by-step authentication process
3. ✅ **Database Schema** - `blog_distributions` and `blog_social_accounts` tables match approved spec
4. ✅ **Error Taxonomy** - TOKEN_EXPIRED, RATE_LIMITED, etc. - reused in approved spec
5. ✅ **Attribution Integration** - How distribution_id flows through existing Phase 3 infrastructure
6. ✅ **Implementation Checklist** - Phased rollout plan (approved spec uses similar structure)
7. ✅ **Risk Assessment** - Account suspension, API changes, token expiry - approved spec incorporates mitigations

**My analysis was comprehensive but over-scoped. Your spec trimmed the fat.**

---

## Final Recommendation

### ✅ Implement the Approved Spec (v1) As-Is

**Why**:
1. **Faster to market** - 2.5 weeks vs 6 weeks
2. **Lower risk** - Fewer moving parts, simpler OAuth
3. **Strategic focus** - Measures outcomes (bookings), not vanity metrics (likes)
4. **Maintainable** - No feature creep, no premature optimization
5. **Extensible** - Can add Twitter/Facebook in v2 if LinkedIn proves valuable

**What to Carry Forward from My Analysis**:
- LinkedIn API technical specs (endpoints, payloads, rate limits)
- Database schema (blog_distributions, blog_social_accounts)
- Error handling taxonomy (TOKEN_EXPIRED, RATE_LIMITED, etc.)
- Attribution integration patterns (distribution_id → session → events)
- Implementation checklist (phased rollout)

**What to Leave Out** (for now):
- Twitter/Facebook integrations → v2
- Personal account posting → v2
- LinkedIn Analytics API → never (strategic choice)
- Auto-retry logic → never (manual is safer)
- Hashtag suggestions → never (over-engineering)
- Optimal posting times → maybe v3 (if data shows value)
- Image uploads → maybe v2 (if og:image insufficient)

### Success Metrics (30 Days Post-Launch)

**Must Achieve**:
- ✅ 20+ distributions sent (LinkedIn posts published)
- ✅ 200+ clicks from LinkedIn to blog
- ✅ 2+ bookings attributed to distributions
- ✅ £100+ revenue from distributed posts

**If Achieved**:
- → Validate: Distribution is worth scaling
- → Next: Consider adding Twitter (Phase 5)
- → Optional: Add optimal timing suggestions (v2)

**If NOT Achieved**:
- → Investigate: Are posts reaching audience?
- → Adjust: Post frequency, timing, content
- → Decision: Continue or pivot to other growth channels

**Either way, you'll have data. That's the point.**

---

## Appendix: Why This Beats Buffer/Hootsuite

| Feature | Buffer/Hootsuite | TutorWise Distribution | Impact |
|---------|-----------------|----------------------|--------|
| **Post Scheduling** | ✓ Yes | ✓ Yes | Parity |
| **Multi-Platform** | ✓ LinkedIn, Twitter, Facebook, Instagram | LinkedIn only (v1) | Buffer wins on breadth |
| **Analytics** | ✓ Likes, comments, shares, impressions | ❌ Ignores these metrics | Different strategy |
| **Click Tracking** | ✓ UTM params, clicks | ✓ UTM params, clicks | Parity |
| **Conversion Tracking** | ❌ Stops at clicks | ✅ Tracks bookings, revenue | **TutorWise wins** |
| **Attribution** | ❌ Multi-touch unsupported | ✅ Full attribution path | **TutorWise wins** |
| **Economic Outcomes** | ❌ No revenue tracking | ✅ Revenue per distribution | **TutorWise wins** |
| **ROI Calculation** | ❌ Can't compute true ROI | ✅ Revenue / Cost = ROI | **TutorWise wins** |

**Buffer/Hootsuite Dashboard**:
```
Distribution 1:
- 450 impressions
- 45 clicks
- 3.6% CTR
- 5 likes
- 2 comments
```

**TutorWise Dashboard**:
```
Distribution 1:
- 450 impressions (from LinkedIn, if we pulled it)
- 45 clicks → Blog
- 12 marketplace interactions
- 2 bookings
- £120 revenue
- ROI: ∞ (£120 revenue, £0 cost)
- Attribution path visible: LinkedIn → Blog → Tutor → Booking
```

**This is your moat.**

Buffer can't see bookings.
You can.

---

## Status: FROZEN ❄️

This spec is locked for v1 implementation.

**Do NOT add**:
- Twitter integration
- Facebook integration
- LinkedIn Analytics API
- Auto-retry logic
- Hashtag suggestions
- Optimal timing
- Image uploads
- Video posts
- Carousels
- Polls

**Unless LinkedIn forces a change** (API deprecation, breaking change), implement exactly as specified.

Focus on execution, not iteration.

Ship it. ✅

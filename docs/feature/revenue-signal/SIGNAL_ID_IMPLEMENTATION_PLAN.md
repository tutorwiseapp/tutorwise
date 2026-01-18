# Signal ID Implementation Plan

**Purpose**: Add journey tracking to Revenue Signal using `signal_id` (Datadog-inspired trace_id pattern)
**Timeline**: Week 2 of Migration (5 days)
**Status**: Ready for implementation (after Migration 183 applied)
**Last Updated**: 2026-01-17

---

## Overview

**What is signal_id?**
- Unique identifier that links all events in a user journey across sessions
- Similar to Datadog's `trace_id` for APM
- Enables multi-touch attribution analysis

**Example Journey**:
```
User sees LinkedIn post (dist_abc123) → Clicks → Reads article →
Views listing → Saves to wiselist → Returns 2 days later →
Books tutor (all linked by signal_id: "dist_abc123")
```

---

## Generation Logic

### Cookie-Based Signal ID

**File**: `apps/web/src/lib/utils/signalTracking.ts` (NEW - refactor from sessionTracking.ts)

```typescript
import { v4 as uuidv4 } from 'uuid';

const SIGNAL_ID_COOKIE = 'tw_signal_id';
const DISTRIBUTION_WINDOW_DAYS = 7;  // LinkedIn attribution window
const ORGANIC_WINDOW_DAYS = 30;       // Organic session window

/**
 * Get or create signal_id for journey tracking
 *
 * Priority:
 * 1. Distribution-specific signal (from ?d= param)
 * 2. Existing session signal (from cookie)
 * 3. New session signal (generate UUID)
 */
export function getOrCreateSignalId(distributionId?: string): string {
  // Priority 1: Distribution-specific signal
  if (distributionId) {
    const signalId = `dist_${distributionId}`;
    setSignalCookie(signalId, DISTRIBUTION_WINDOW_DAYS);
    return signalId;
  }

  // Priority 2: Existing session signal
  let signalId = getSignalCookie();
  if (signalId) {
    return signalId;
  }

  // Priority 3: New session signal
  signalId = `session_${uuidv4()}`;
  setSignalCookie(signalId, ORGANIC_WINDOW_DAYS);
  return signalId;
}

/**
 * Get signal_id from cookie
 */
function getSignalCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const signalCookie = cookies.find(c => c.startsWith(`${SIGNAL_ID_COOKIE}=`));

  if (!signalCookie) return null;

  return signalCookie.split('=')[1];
}

/**
 * Set signal_id cookie with expiration
 */
function setSignalCookie(signalId: string, days: number): void {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  document.cookie = `${SIGNAL_ID_COOKIE}=${signalId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

/**
 * Clear signal_id cookie (for testing/debugging)
 */
export function clearSignalId(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SIGNAL_ID_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Get current signal_id without creating new one
 */
export function getCurrentSignalId(): string | null {
  return getSignalCookie();
}
```

---

## Distribution Middleware Integration

### Middleware: Extract ?d= parameter and set signal_id

**File**: `apps/web/src/middleware.ts` (UPDATE - add distribution handling)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Extract distribution ID from ?d= parameter
  const distributionId = request.nextUrl.searchParams.get('d');

  if (distributionId) {
    // Set signal_id cookie with distribution context
    const signalId = `dist_${distributionId}`;
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7-day attribution window

    response.cookies.set('tw_signal_id', signalId, {
      path: '/',
      expires,
      sameSite: 'lax',
      httpOnly: false, // Allow client-side JavaScript access
    });

    // Track distribution impression event
    // Note: This fires server-side, before page load
    // Client-side tracking will duplicate with signal_id
    response.cookies.set('tw_distribution_id', distributionId, {
      path: '/',
      expires,
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/blog/:path*',           // All blog routes
    '/tutor/:path*',          // Tutor profile views
    '/listings/:path*',       // Listing views
  ],
};
```

---

## Component Updates

### 1. Update useBlogAttribution → useSignalTracking

**File**: `apps/web/src/app/components/blog/embeds/useSignalTracking.ts` (RENAME from useBlogAttribution.ts)

```typescript
import { useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getOrCreateSignalId } from '@/lib/utils/signalTracking';
import { getSessionId } from '@/lib/utils/sessionTracking';

export interface SignalEventData {
  contentId: string;
  contentType?: 'article' | 'podcast' | 'video' | 'webinar';
  eventType: 'impression' | 'click' | 'save' | 'refer' | 'convert';
  targetType: 'article' | 'tutor' | 'listing' | 'booking' | 'referral' | 'wiselist_item';
  targetId: string;
  sourceComponent: string;
  metadata?: Record<string, any>;
}

export function useSignalTracking() {
  const supabase = createClient();

  const trackEvent = useCallback(async (eventData: SignalEventData) => {
    try {
      // Get distribution ID from cookie (if set by middleware)
      const distributionId = document.cookie
        .split('; ')
        .find(c => c.startsWith('tw_distribution_id='))
        ?.split('=')[1];

      // Get or create signal_id
      const signalId = getOrCreateSignalId(distributionId);
      const sessionId = getSessionId();

      // Get current user (if authenticated)
      const { data: { user } } = await supabase.auth.getUser();

      // Write to signal_events
      const { error } = await supabase.from('signal_events').insert({
        signal_id: signalId,
        content_id: eventData.contentId,
        content_type: eventData.contentType || 'article',
        user_id: user?.id || null,
        session_id: sessionId,
        event_type: eventData.eventType,
        target_type: eventData.targetType,
        target_id: eventData.targetId,
        source_component: eventData.sourceComponent,
        metadata: {
          ...eventData.metadata,
          distribution_id: distributionId || undefined, // Preserve distribution context
        },
      });

      if (error) {
        console.error('[Signal Tracking] Failed to track event:', error);
      }
    } catch (err) {
      console.error('[Signal Tracking] Error:', err);
    }
  }, [supabase]);

  return { trackEvent };
}
```

### 2. Update TutorEmbed Component

**File**: `apps/web/src/app/components/blog/embeds/TutorEmbed.tsx`

**Changes**:
```typescript
// OLD IMPORT
import { useBlogAttribution } from './useBlogAttribution';

// NEW IMPORT
import { useSignalTracking } from './useSignalTracking';

// Inside component
export default function TutorEmbed({ ... }) {
  // OLD
  const { trackEvent } = useBlogAttribution();

  // NEW
  const { trackEvent } = useSignalTracking();

  // Rest of component stays the same
  // trackEvent() signature hasn't changed
}
```

### 3. Update ListingGrid Component

**File**: `apps/web/src/app/components/blog/embeds/ListingGrid.tsx`

**Changes**: Same as TutorEmbed (import rename only)

### 4. Update TutorCarousel Component

**File**: `apps/web/src/app/components/blog/embeds/TutorCarousel.tsx`

**Changes**: Same as TutorEmbed (import rename only)

### 5. Update SaveArticleButton Component

**File**: `apps/web/src/app/components/blog/SaveArticleButton.tsx`

**Changes**:
```typescript
import { useSignalTracking } from './embeds/useSignalTracking';

export default function SaveArticleButton({ articleId }: { articleId: string }) {
  const { trackEvent } = useSignalTracking();

  const handleSave = async () => {
    // ... existing save logic ...

    // Track save event with signal_id
    await trackEvent({
      contentId: articleId,
      contentType: 'article',
      eventType: 'save',
      targetType: 'wiselist_item',
      targetId: wiselistItemId,
      sourceComponent: 'floating_save',
    });
  };

  // ... rest of component
}
```

---

## API Route Updates

### 1. Update Attribution API

**File**: `apps/web/src/app/api/blog/attribution/route.ts`

**Changes**: Update table references from `blog_attribution_events` → `signal_events`

```typescript
// OLD
const { error } = await supabase.from('blog_attribution_events').insert({
  blog_article_id: req.blog_article_id,
  // ...
});

// NEW
const { error } = await supabase.from('signal_events').insert({
  signal_id: req.signal_id,        // NEW
  content_id: req.content_id,      // Renamed from blog_article_id
  content_type: 'article',         // NEW
  // ...
});
```

### 2. Update Saves API

**File**: `apps/web/src/app/api/blog/saves/route.ts`

**Changes**: Update table references from `blog_article_saves` → `signal_content_saves`

```typescript
// OLD
const { data } = await supabase
  .from('blog_article_saves')
  .select('*')
  .eq('blog_article_id', articleId);

// NEW
const { data } = await supabase
  .from('signal_content_saves')
  .select('*')
  .eq('content_id', articleId)
  .eq('content_type', 'article');
```

### 3. Update Listing Links API

**File**: `apps/web/src/app/api/blog/listing-links/route.ts`

**Changes**: Update table references from `blog_listing_links` → `signal_content_embeds`

---

## Testing Plan

### Unit Tests

**File**: `apps/web/src/lib/utils/__tests__/signalTracking.test.ts` (NEW)

```typescript
import { getOrCreateSignalId, clearSignalId, getCurrentSignalId } from '../signalTracking';

describe('signalTracking', () => {
  beforeEach(() => {
    clearSignalId();
  });

  it('should create new session signal if none exists', () => {
    const signalId = getOrCreateSignalId();
    expect(signalId).toMatch(/^session_/);
  });

  it('should reuse existing session signal', () => {
    const signalId1 = getOrCreateSignalId();
    const signalId2 = getOrCreateSignalId();
    expect(signalId1).toBe(signalId2);
  });

  it('should prioritize distribution signal over session signal', () => {
    const sessionSignalId = getOrCreateSignalId();
    const distSignalId = getOrCreateSignalId('abc123');
    expect(distSignalId).toBe('dist_abc123');
    expect(distSignalId).not.toBe(sessionSignalId);
  });

  it('should persist distribution signal in cookie', () => {
    getOrCreateSignalId('abc123');
    const currentSignalId = getCurrentSignalId();
    expect(currentSignalId).toBe('dist_abc123');
  });
});
```

### Integration Tests

**Manual Testing Checklist**:

1. **Organic Traffic (Session Signal)**:
   - [ ] Visit `/blog/article-slug` directly
   - [ ] Check cookie: `tw_signal_id` should be `session_<uuid>`
   - [ ] Click embedded listing → Check `signal_events` has matching `signal_id`
   - [ ] Save article → Check `signal_events` has same `signal_id`

2. **Distribution Traffic (Distribution Signal)**:
   - [ ] Visit `/blog/article-slug?d=dist123`
   - [ ] Check cookie: `tw_signal_id` should be `dist_dist123`
   - [ ] Click embedded listing → Check `signal_events` has `signal_id = 'dist_dist123'`
   - [ ] Check `metadata` column has `distribution_id: 'dist123'`

3. **Signal Persistence (30-day window)**:
   - [ ] Visit article, get `signal_id`
   - [ ] Return 5 days later → Check `signal_id` is same (cookie persisted)
   - [ ] Wait 31 days → Check new `signal_id` generated (cookie expired)

4. **Distribution Override (7-day window)**:
   - [ ] Visit article organically → Get `session_abc`
   - [ ] Visit same article with `?d=dist123` → Should override to `dist_dist123`
   - [ ] Check events: Old events have `session_abc`, new events have `dist_dist123`

---

## Migration Verification

### Week 2 Verification Queries

After deploying Week 2 changes, run these queries to verify signal_id is being tracked:

```sql
-- 1. Check signal_id is being populated
SELECT
  signal_id,
  content_id,
  content_type,
  event_type,
  created_at
FROM signal_events
WHERE signal_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 2. Count events by signal_id prefix (distribution vs session)
SELECT
  CASE
    WHEN signal_id LIKE 'dist_%' THEN 'distribution'
    WHEN signal_id LIKE 'session_%' THEN 'session'
    ELSE 'other'
  END AS signal_source,
  COUNT(*) as event_count,
  COUNT(DISTINCT signal_id) as unique_signals
FROM signal_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY 1;

-- 3. Sample signal journey (all events for one signal_id)
SELECT
  signal_id,
  event_type,
  target_type,
  source_component,
  created_at
FROM signal_events
WHERE signal_id = 'dist_abc123'  -- Replace with actual signal_id
ORDER BY created_at;

-- 4. Check distribution metadata is preserved
SELECT
  signal_id,
  metadata->>'distribution_id' as distribution_id,
  event_type,
  created_at
FROM signal_events
WHERE signal_id LIKE 'dist_%'
LIMIT 10;
```

---

## Rollback Plan

If signal_id implementation causes issues:

### Week 2 Rollback

1. **Revert component imports**:
   ```bash
   git revert <commit-hash>  # Revert useSignalTracking rename
   ```

2. **signal_id column is nullable**:
   - Existing code continues to work without signal_id
   - Events will be inserted with `signal_id = NULL`
   - No data loss, just missing journey tracking

3. **Middleware rollback**:
   - Remove distribution middleware
   - Distribution links still work (just no signal_id context)

### Zero Risk

- Migration 183 already applied (signal_id column exists)
- Column is nullable (backward compatible)
- Views allow old code to continue working
- No schema changes in Week 2 (only application code)

---

## Implementation Timeline

### Day 1: Core Utilities
- [ ] Create `signalTracking.ts` with cookie logic
- [ ] Write unit tests for signal ID generation
- [ ] Test cookie persistence in browser

### Day 2: Middleware & API Routes
- [ ] Update middleware to extract `?d=` parameter
- [ ] Update `/api/blog/attribution/route.ts`
- [ ] Update `/api/blog/saves/route.ts`
- [ ] Test distribution parameter detection

### Day 3: Component Updates
- [ ] Rename `useBlogAttribution.ts` → `useSignalTracking.ts`
- [ ] Update TutorEmbed, ListingGrid, TutorCarousel imports
- [ ] Update SaveArticleButton to use signal tracking
- [ ] Test event tracking in browser console

### Day 4: Integration Testing
- [ ] Test organic traffic signal creation
- [ ] Test distribution traffic signal override
- [ ] Test signal persistence across sessions
- [ ] Verify database has signal_id populated

### Day 5: Monitoring & Verification
- [ ] Run verification queries in production
- [ ] Check signal_id distribution (session vs dist)
- [ ] Monitor error logs for tracking failures
- [ ] Document any edge cases discovered

---

## Success Criteria

✅ **Week 2 Complete When**:
1. All components use `useSignalTracking` hook
2. `signal_id` column is populated for all new events
3. Distribution links (`?d=dist123`) create `dist_*` signal IDs
4. Organic traffic creates `session_*` signal IDs
5. Signal IDs persist in cookies for 30 days (organic) or 7 days (distribution)
6. No errors in event tracking (check Supabase logs)
7. Verification queries show signal_id data

✅ **Ready for Week 3 When**:
- Signal Path Viewer can be built (have signal_id data to query)
- Multi-touch attribution queries return results
- Distribution attribution works (LinkedIn posts tracked to bookings)

---

## Next Steps (Week 3)

After signal_id implementation is complete:

1. **Update RPCs** (Migration 182):
   - Add signal_id filtering to `get_article_performance_summary`
   - Add signal journey queries to dashboard

2. **Signal Path Viewer** (new dashboard component):
   - Visualize user journey for a given signal_id
   - Show timeline: impression → click → save → convert

3. **Multi-Touch Attribution**:
   - "First touch" attribution (first event in signal)
   - "Last touch" attribution (last event before booking)
   - "Linear" attribution (equal weight to all touchpoints)

See Week 3 in [SIGNAL-MIGRATION-PLAN.md](./SIGNAL-MIGRATION-PLAN.md) for details.

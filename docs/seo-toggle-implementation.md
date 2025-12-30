# SEO External Services Toggle Implementation

**Date:** 2025-12-29
**Purpose:** Granular control of external integrations (GSC, SerpApi, Ahrefs)
**Goal:** Support both WITH and WITHOUT external services for testing and production

---

## Overview

The SEO system supports **dual-mode operation**:
- **WITH external services:** Full-featured tracking using GSC, SerpApi, Ahrefs
- **WITHOUT external services:** Fallback methods using GSC estimation or manual entry

Each service can be toggled **independently** via the SEO Settings admin page.

---

## Database Schema

### 1. Toggle Controls in `seo_settings`

```sql
-- Individual service toggles
ALTER TABLE seo_settings ADD COLUMN gsc_enabled BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN gsc_auto_sync BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN gsc_api_key_set BOOLEAN DEFAULT false;

ALTER TABLE seo_settings ADD COLUMN serpapi_enabled BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN serpapi_auto_track BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN serpapi_api_key_set BOOLEAN DEFAULT false;

ALTER TABLE seo_settings ADD COLUMN ahrefs_enabled BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN ahrefs_auto_sync BOOLEAN DEFAULT false;
ALTER TABLE seo_settings ADD COLUMN ahrefs_api_key_set BOOLEAN DEFAULT false;

-- Fallback mode
ALTER TABLE seo_settings ADD COLUMN use_fallback_tracking BOOLEAN DEFAULT true;
ALTER TABLE seo_settings ADD COLUMN fallback_tracking_method VARCHAR(50) DEFAULT 'manual'
  CHECK (fallback_tracking_method IN ('manual', 'gsc_only', 'disabled'));

-- JSON configuration with error tracking
ALTER TABLE seo_settings ADD COLUMN external_services_config JSONB DEFAULT '{
  "google_search_console": {
    "enabled": false,
    "auto_sync": false,
    "sync_frequency_hours": 24
  },
  "serpapi": {
    "enabled": false,
    "auto_track": false,
    "track_frequency_hours": 24
  },
  "ahrefs": {
    "enabled": false,
    "auto_sync": false,
    "sync_frequency_hours": 168
  }
}';
```

### 2. Service Health Monitoring

```sql
CREATE TABLE seo_service_health (
    id UUID PRIMARY KEY,
    service_name VARCHAR(50) CHECK (service_name IN ('gsc', 'serpapi', 'ahrefs')),
    status VARCHAR(20) CHECK (status IN ('healthy', 'degraded', 'down', 'disabled')),

    -- Health metrics
    last_successful_call TIMESTAMP,
    last_failed_call TIMESTAMP,
    consecutive_failures INTEGER DEFAULT 0,
    error_message TEXT,

    -- Rate limiting
    api_calls_today INTEGER DEFAULT 0,
    api_limit_daily INTEGER,
    rate_limited_until TIMESTAMP,

    UNIQUE(service_name)
);
```

### 3. Data Source Tracking in Keywords

```sql
ALTER TABLE seo_keywords ADD COLUMN position_source VARCHAR(20) DEFAULT 'manual'
  CHECK (position_source IN ('manual', 'gsc', 'serpapi', 'calculated'));

ALTER TABLE seo_keywords ADD COLUMN position_confidence NUMERIC(3,2) DEFAULT 0.5
  CHECK (position_confidence BETWEEN 0 AND 1);

ALTER TABLE seo_keywords ADD COLUMN last_external_check_at TIMESTAMP;
ALTER TABLE seo_keywords ADD COLUMN external_check_status VARCHAR(20) DEFAULT 'pending'
  CHECK (external_check_status IN ('pending', 'success', 'failed', 'skipped'));
```

**Confidence Scores:**
- `manual` = 0.5 (medium confidence)
- `gsc` = 0.7 (fairly reliable)
- `calculated` = 0.5 (estimated from CTR)
- `serpapi` = 1.0 (100% accurate)

---

## Service Implementation

### Google Search Console Integration

**File:** `/services/seo/gsc-sync.ts`

#### Key Functions:

```typescript
// Check if GSC is enabled
async function isGSCEnabled(): Promise<boolean> {
  const { data: settings } = await supabase
    .from('seo_settings')
    .select('gsc_enabled, gsc_api_key_set')
    .single();

  return settings?.gsc_enabled === true && settings?.gsc_api_key_set === true;
}

// Sync GSC data (respects toggle)
export async function syncGSCPerformance(days: number = 30) {
  const enabled = await isGSCEnabled();
  if (!enabled) {
    return { synced: 0, errors: 0, skipped: true, reason: 'GSC disabled in settings' };
  }

  // ... proceed with sync
}
```

#### Toggle Behavior:

| GSC Enabled | GSC API Key Set | Result |
|-------------|-----------------|--------|
| ✅ Yes      | ✅ Yes          | Sync runs normally |
| ✅ Yes      | ❌ No           | Skip sync (API key missing) |
| ❌ No       | ✅ Yes          | Skip sync (user disabled) |
| ❌ No       | ❌ No           | Skip sync |

---

### Rank Tracking (SerpApi + Fallback)

**File:** `/services/seo/rank-tracking.ts`

#### Dual-Mode Operation:

```typescript
export async function trackKeywordRank(keyword: string): Promise<RankCheckResult> {
  const serpApiEnabled = await isSerpApiEnabled();

  if (serpApiEnabled) {
    // PRIMARY: Use SerpApi (most accurate)
    try {
      return await trackRankWithSerpApi(keyword);
    } catch (error) {
      // FALLBACK: If SerpApi fails, try GSC estimation
      if (settings?.use_fallback_tracking && settings?.fallback_tracking_method !== 'disabled') {
        return await trackRankWithGSC(keyword);
      }
      throw error;
    }
  } else if (settings?.fallback_tracking_method === 'gsc_only') {
    // FALLBACK: Use GSC estimation only
    return await trackRankWithGSC(keyword);
  } else {
    // MANUAL: No automatic tracking
    return { keyword, position: null, source: 'manual', confidence: 0 };
  }
}
```

#### Fallback Methods:

1. **`gsc_only`** - Estimate position from GSC CTR data
   - Uses CTR benchmarks: Top 1 = ~30% CTR, Top 5 = ~8% CTR, Top 10 = ~3% CTR
   - Implemented via database function `calculate_position_from_gsc()`

2. **`manual`** - Require manual position entry
   - No automatic updates
   - User must manually enter positions

3. **`disabled`** - No tracking when external services unavailable
   - Keywords show `position: null`

---

## Position Estimation Logic

**Database Function:** `calculate_position_from_gsc()`

```sql
CREATE OR REPLACE FUNCTION calculate_position_from_gsc(
    p_impressions INTEGER,
    p_clicks INTEGER,
    p_ctr NUMERIC
) RETURNS INTEGER AS $$
BEGIN
    -- CTR Benchmarks for position estimation
    IF p_ctr >= 25 THEN RETURN 1;      -- Top 1: ~30% CTR
    ELSIF p_ctr >= 15 THEN RETURN 2;   -- Top 2: ~15% CTR
    ELSIF p_ctr >= 10 THEN RETURN 3;   -- Top 3: ~10% CTR
    ELSIF p_ctr >= 7 THEN RETURN 5;    -- Top 5: ~8% CTR
    ELSIF p_ctr >= 4 THEN RETURN 7;    -- Top 7: ~5% CTR
    ELSIF p_ctr >= 2 THEN RETURN 10;   -- Top 10: ~3% CTR
    ELSIF p_ctr >= 1 THEN RETURN 15;   -- Page 2
    ELSIF p_impressions > 0 THEN RETURN 25; -- Has impressions but very low CTR
    ELSE RETURN NULL;                   -- No data
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Confidence Levels:**
- SerpApi position: **1.0** (100% accurate)
- GSC exact position: **0.7** (70% confidence)
- Calculated from CTR: **0.5** (50% confidence)
- Manual entry: **0.5** (50% confidence)

---

## SEO Settings Admin Page

**File:** `/app/(admin)/admin/seo/settings/page.tsx`

### Features:

1. **Service Cards** - One for each external service (GSC, SerpApi, Ahrefs)
   - API Key Status indicator
   - Enable/Disable toggle
   - Auto-sync toggle
   - Health metrics (last success, failures, API usage)

2. **Fallback Options**
   - Enable/disable fallback tracking
   - Select fallback method (GSC only, Manual, Disabled)

3. **Testing Guidance**
   - Step-by-step recommendations for testing
   - Start with GSC → Test fallback → Add SerpApi → Add Ahrefs

4. **Real-time Status**
   - Service health badges (Healthy, Degraded, Down, Disabled)
   - Error messages from failed API calls
   - Consecutive failure counts

---

## Testing Strategy

### Phase 1: GSC Only (FREE)
```typescript
// Settings
gsc_enabled: true
gsc_auto_sync: true
serpapi_enabled: false
use_fallback_tracking: true
fallback_tracking_method: 'gsc_only'
```

**Expected Behavior:**
- GSC syncs daily
- Positions estimated from CTR
- Confidence score: 0.5-0.7
- No SerpApi costs

### Phase 2: Add SerpApi (PAID - $50/month)
```typescript
// Settings
gsc_enabled: true
serpapi_enabled: true
serpapi_auto_track: true
use_fallback_tracking: true  // Falls back to GSC if SerpApi fails
fallback_tracking_method: 'gsc_only'
```

**Expected Behavior:**
- SerpApi checks positions daily
- Confidence score: 1.0
- Falls back to GSC estimation if SerpApi rate limited
- Higher accuracy

### Phase 3: Full Stack (PAID - $149/month)
```typescript
// Settings
gsc_enabled: true
serpapi_enabled: true
ahrefs_enabled: true
use_fallback_tracking: true
```

**Expected Behavior:**
- All services running
- Full rank tracking, backlinks, competitor analysis
- Maximum accuracy and insights

---

## Service Health Monitoring

### Automatic Health Checks

Each service call updates health status:

```typescript
// Success
await updateServiceHealth('gsc', 'healthy');
// → consecutive_failures reset to 0
// → last_successful_call updated

// Failure
await updateServiceHealth('serpapi', 'down', error.message);
// → consecutive_failures incremented
// → last_failed_call updated
// → error_message stored
```

### Auto-Disable Logic

Services auto-disable after N consecutive failures:

```typescript
if (health.consecutive_failures >= 3) {
  // Auto-disable service
  await supabase
    .from('seo_settings')
    .update({ serpapi_enabled: false })
    .eq('id', 1);

  // Update health status
  await supabase
    .from('seo_service_health')
    .update({ status: 'disabled' })
    .eq('service_name', 'serpapi');
}
```

---

## Environment Variables

### Required for Each Service:

**Google Search Console:**
```bash
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_client_id
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret
GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=your_refresh_token
```

**SerpApi:**
```bash
SERPAPI_API_KEY=your_api_key
```

**Ahrefs:**
```bash
AHREFS_API_TOKEN=your_api_token
```

### API Key Detection

The system automatically detects if API keys are set:

```typescript
const gscApiKeySet = !!(
  process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID &&
  process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET &&
  process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN
);

await supabase
  .from('seo_settings')
  .update({ gsc_api_key_set: gscApiKeySet })
  .eq('id', 1);
```

---

## Migration Path

### From No Services → Full Services

1. **Start:** All services disabled
   ```typescript
   gsc_enabled: false
   serpapi_enabled: false
   ahrefs_enabled: false
   use_fallback_tracking: true
   fallback_tracking_method: 'manual'
   ```

2. **Enable GSC** (FREE)
   - Set environment variables
   - Enable `gsc_enabled = true`
   - Enable `gsc_auto_sync = true`
   - Change `fallback_tracking_method = 'gsc_only'`
   - Test sync: Run cron job or manual sync
   - Verify positions appear in Keywords page

3. **Add SerpApi** (PAID)
   - Set `SERPAPI_API_KEY`
   - Enable `serpapi_enabled = true`
   - Enable `serpapi_auto_track = true`
   - Test tracking: Check keyword positions
   - Compare SerpApi vs GSC estimates

4. **Add Ahrefs** (PAID)
   - Set `AHREFS_API_TOKEN`
   - Enable `ahrefs_enabled = true`
   - Enable `ahrefs_auto_sync = true`
   - Test backlink sync

---

## API Endpoints

### Toggle Service
```typescript
// POST /api/admin/seo/settings
{
  "gsc_enabled": true,
  "serpapi_enabled": false
}
```

### Manual Sync
```typescript
// POST /api/admin/seo/sync-gsc
{} // Respects gsc_enabled toggle
```

### Manual Rank Check
```typescript
// POST /api/admin/seo/check-ranks
{
  "keyword_ids": ["uuid1", "uuid2"]
} // Uses best available method (SerpApi → GSC fallback)
```

---

## Cost Optimization

### Without External Services: $0/month
- Use GSC estimation only
- Manual position updates
- Free GSC data for impressions/clicks

### With GSC Only: $0/month
- Automatic GSC sync
- CTR-based position estimation
- ~70% accuracy

### With SerpApi: $50/month
- Accurate daily rank tracking
- Falls back to GSC on failure
- ~100% accuracy

### Full Stack: $149/month
- GSC: Free
- SerpApi: $50/month
- Ahrefs Lite: $99/month
- Complete SEO intelligence

---

## Key Takeaways

✅ **Dual-mode operation:** Works with or without external services
✅ **Granular toggles:** Each service independently controlled
✅ **Fallback support:** Automatic degradation to free methods
✅ **Cost flexibility:** Start free, scale up as needed
✅ **Health monitoring:** Track service availability and errors
✅ **Confidence scoring:** Know reliability of each data source
✅ **Testing-friendly:** Easy to test incrementally

# Profile Views Tracking System

**Migration**: 097_create_profile_views_table.sql
**Created**: 2025-12-08
**Status**: ✅ Ready for deployment

## Overview

This system tracks profile page views with deduplication, analytics, and automatic refresh via Supabase pg_cron.

---

## 🚀 Deployment Steps

### 1. Run the Migration

```bash
# In Supabase SQL Editor or via CLI:
psql -h your-project.supabase.co -U postgres -d postgres -f apps/api/migrations/097_create_profile_views_table.sql
```

Or copy/paste the SQL into Supabase Dashboard → SQL Editor → Run.

### 2. Enable pg_cron Extension

The migration will attempt to enable pg_cron automatically. If it fails:

1. Go to **Supabase Dashboard** → **Database** → **Extensions**
2. Search for `pg_cron`
3. Click **Enable**

### 3. Verify Cron Job is Scheduled

Run this query in SQL Editor:

```sql
SELECT * FROM cron.job WHERE jobname = 'refresh-profile-view-counts';
```

Expected output:
```
jobname: refresh-profile-view-counts
schedule: 0 * * * *
active: true
```

### 4. Manually Test Refresh

```sql
-- Manually trigger the refresh
SELECT refresh_profile_view_counts();

-- Check last refresh time
SELECT matviewname, last_refresh FROM pg_matviews WHERE matviewname = 'profile_view_counts';
```

---

## 📊 How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User visits profile                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  ProfileViewTracker (Client Component)                       │
│  - Generates/retrieves session_id from sessionStorage        │
│  - Sends POST to /api/profiles/[id]/track-view              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  API: /api/profiles/[id]/track-view                         │
│  - Checks deduplication (24-hour window per session)         │
│  - Inserts to profile_views table                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  profile_views table                                         │
│  - Stores all view events with metadata                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ (Every hour via pg_cron)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  profile_view_counts (Materialized View)                    │
│  - Aggregated counts for fast lookups                       │
│  - Used by public profile page                              │
└─────────────────────────────────────────────────────────────┘
```

### Deduplication Logic

- **Session-based**: Same session viewing same profile within 24 hours = ignored
- **Session ID**: Stored in browser sessionStorage (persists until tab closes)
- **Why 24 hours?**: Prevents spam while allowing daily returning visitors

### Performance

- **Reads**: Fast (materialized view lookup)
- **Writes**: Async (doesn't block page render)
- **Refresh**: Hourly via pg_cron (low overhead)

---

## 📈 Monitoring

Use the monitoring file for common queries:

```bash
# View monitoring queries
cat apps/api/migrations/097_monitor_profile_views.sql
```

### Key Queries:

**Check cron job status:**
```sql
SELECT * FROM cron.job WHERE jobname = 'refresh-profile-view-counts';
```

**View recent runs:**
```sql
SELECT start_time, status, return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-profile-view-counts')
ORDER BY start_time DESC LIMIT 10;
```

**Top viewed profiles:**
```sql
SELECT p.full_name, pvc.total_views, pvc.unique_viewers
FROM profile_view_counts pvc
JOIN profiles p ON p.id = pvc.profile_id
ORDER BY pvc.total_views DESC LIMIT 10;
```

**Recent views (last 24 hours):**
```sql
SELECT COUNT(*) as views_last_24h
FROM profile_views
WHERE viewed_at > NOW() - INTERVAL '24 hours';
```

---

## 🔧 Troubleshooting

### Cron job not running

**Check if pg_cron is enabled:**
```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_cron';
```

**Check for errors:**
```sql
SELECT status, return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-profile-view-counts')
  AND status != 'succeeded'
ORDER BY start_time DESC;
```

**Manually trigger:**
```sql
SELECT cron.schedule_immediately('refresh-profile-view-counts');
```

### View counts not updating

**Check materialized view freshness:**
```sql
SELECT matviewname, last_refresh, NOW() - last_refresh as age
FROM pg_matviews WHERE matviewname = 'profile_view_counts';
```

**Manually refresh:**
```sql
SELECT refresh_profile_view_counts();
```

**Verify counts match:**
```sql
SELECT
    (SELECT COUNT(*) FROM profile_views) as raw_count,
    (SELECT SUM(total_views) FROM profile_view_counts) as mat_view_count;
```

### Deduplication not working

**Check session storage in browser:**
```javascript
// In browser console:
sessionStorage.getItem('viewer_session_id')
```

**Check recent duplicate views:**
```sql
SELECT profile_id, session_id, COUNT(*)
FROM profile_views
WHERE viewed_at > NOW() - INTERVAL '24 hours'
GROUP BY profile_id, session_id
HAVING COUNT(*) > 1;
```

---

## 🗄️ Database Schema

### `profile_views` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `profile_id` | UUID | Profile being viewed |
| `viewer_id` | UUID (nullable) | Viewer (null = anonymous) |
| `viewed_at` | TIMESTAMPTZ | When viewed |
| `session_id` | TEXT | Browser session ID |
| `referrer_source` | TEXT | Where view came from |
| `user_agent` | TEXT | Browser/device info |
| `ip_address` | INET | IP address |

**Indexes:**
- `idx_profile_views_profile_id` on `profile_id`
- `idx_profile_views_viewer_id` on `viewer_id`
- `idx_profile_views_viewed_at` on `viewed_at DESC`
- `idx_profile_views_session_id` on `session_id`
- `idx_profile_views_dedup` on `(profile_id, session_id, viewed_at DESC)`

### `profile_view_counts` Materialized View

| Column | Type | Description |
|--------|------|-------------|
| `profile_id` | UUID | Profile ID |
| `total_views` | INT | Total view count |
| `unique_viewers` | INT | Unique authenticated viewers |
| `unique_sessions` | INT | Unique sessions |
| `last_viewed_at` | TIMESTAMPTZ | Most recent view |

**Refresh Schedule:** Every hour at :00 (via pg_cron)

---

## 🔐 Security & Privacy

### Row Level Security (RLS)

- ✅ **SELECT**: Anyone can view (for analytics)
- ✅ **INSERT**: Authenticated or anonymous users (own views only)
- ❌ **UPDATE**: Disabled (views are immutable)
- ❌ **DELETE**: Disabled (views are permanent)

### Privacy Considerations

**What's tracked:**
- ✅ Profile being viewed
- ✅ Viewer (if logged in)
- ✅ Session ID (browser-generated)
- ✅ Referrer source
- ✅ User agent string
- ✅ IP address

**Privacy protections:**
- Session ID is browser-local (not cross-device)
- IP addresses hashed or truncated (optional, not implemented yet)
- Anonymous views don't link to specific users
- No PII stored beyond what users provide

**GDPR Compliance:**
- Users can request view data deletion
- Views older than 90 days can be auto-deleted (optional)
- IP addresses can be anonymized

---

## 📝 API Reference

### Track View

**Endpoint:** `POST /api/profiles/[id]/track-view`

**Request Body:**
```json
{
  "session_id": "session_abc123",
  "referrer_source": "search"
}
```

**Response (success):**
```json
{
  "tracked": true,
  "message": "Profile view tracked successfully"
}
```

**Response (duplicate within 24h):**
```json
{
  "tracked": false,
  "reason": "Already tracked within 24 hours"
}
```

**Error Codes:**
- `400`: Missing session_id
- `404`: Profile not found
- `500`: Server error

---

## 🧹 Maintenance

### Cleanup Old Views (Optional)

To save storage, delete views older than 90 days:

```sql
DELETE FROM profile_views
WHERE viewed_at < NOW() - INTERVAL '90 days';

-- Then refresh materialized view
SELECT refresh_profile_view_counts();
```

**Recommendation:** Set up monthly cleanup via pg_cron:

```sql
SELECT cron.schedule(
    'cleanup-old-profile-views',
    '0 0 1 * *',  -- First day of month at midnight
    $$DELETE FROM profile_views WHERE viewed_at < NOW() - INTERVAL '90 days';$$
);
```

### Backup Important Analytics

Before cleanup, export analytics:

```sql
-- Export to CSV (via Supabase Dashboard or psql)
\copy (SELECT * FROM profile_view_counts) TO 'profile_views_backup.csv' CSV HEADER;
```

---

## 📊 Analytics Queries

See `097_monitor_profile_views.sql` for comprehensive analytics queries including:

- Top viewed profiles
- Views by referrer source
- Anonymous vs authenticated breakdown
- Daily/weekly trends
- Geographic distribution (if IP geocoding added)
- Conversion tracking (views → bookings)

---

## 🚀 Future Enhancements

1. **Real-time dashboard**: Build admin dashboard for live analytics
2. **Geographic insights**: Add IP geocoding for location-based analytics
3. **Conversion tracking**: Link views to bookings/messages
4. **Heatmaps**: Track which sections of profile are viewed most
5. **A/B testing**: Track which profile layouts get more engagement
6. **Notification**: Alert profiles when they get viewed
7. **Privacy mode**: Allow profiles to hide their view count

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review monitoring queries in `097_monitor_profile_views.sql`
3. Check Supabase logs for errors
4. Review pg_cron documentation: https://supabase.com/docs/guides/database/extensions/pg_cron

---

**Last Updated**: 2025-12-08
**Migration Version**: 097
**Maintained By**: Development Team

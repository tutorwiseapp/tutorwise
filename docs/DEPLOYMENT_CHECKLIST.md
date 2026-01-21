# Signal Migration Deployment Checklist

**Status:** Ready for Production Deployment
**Created:** 2026-01-17

This checklist guides the deployment of the Signal Migration (Weeks 3 & 4) and Blog Orchestrator Dashboard.

---

## Pre-Deployment Checklist

### ✅ Week 1 & 2 (Already Deployed)
- [x] Migration 183: signal_events table deployed
- [x] Migration 184: signal_metrics table deployed
- [x] Migration 185: signal_content_embeds table deployed
- [x] Migration 186: signal_content_saves table deployed
- [x] Week 2 application code deployed (signal tracking hooks)
- [x] Middleware updated for ?d= parameter detection
- [x] All embed components using useSignalTracking

### 📋 Week 3 Deployment (Ready)
- [ ] **Migration 187** ready to apply
  - Updates 4 existing RPCs to use signal_events
  - Adds 2 new RPCs (get_signal_journey, get_attribution_comparison)
  - All RPCs support signal_id tracking

### 📋 Dashboard Deployment (Ready)
- [ ] Blog Orchestrator Dashboard code deployed
  - 6 tabs total (Overview, Articles, Funnel, Listings, Journeys, Attribution)
  - 3 API routes (stats, journey, attribution)
  - Signal Journey Viewer component
  - Attribution Models comparison

---

## Step 1: Apply Migration 187 (Week 3)

### Pre-Migration Checks

```bash
# 1. Connect to production database
psql $DATABASE_URL

# 2. Verify Week 1 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('signal_events', 'signal_metrics', 'signal_content_embeds', 'signal_content_saves');
-- Should return 4 rows

# 3. Verify existing RPCs exist (from Migration 182)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_article_performance_summary',
  'get_conversion_funnel', 
  'get_blog_assisted_listings',
  'get_time_to_conversion_distribution'
);
-- Should return 4 rows

# 4. Check for active signal events
SELECT COUNT(*) FROM signal_events;
-- Should have events if Week 2 is working
```

### Apply Migration

```bash
# Apply Migration 187
psql $DATABASE_URL < tools/database/migrations/187_update_rpcs_for_signal_events.sql

# Expected output:
# CREATE OR REPLACE FUNCTION (4 times - updated RPCs)
# CREATE FUNCTION (2 times - new RPCs)
# NOTICE: All 6 RPCs created/updated successfully
```

### Post-Migration Verification

```bash
# 1. Verify all 6 RPCs exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_article_performance_summary',
  'get_conversion_funnel',
  'get_blog_assisted_listings', 
  'get_time_to_conversion_distribution',
  'get_signal_journey',
  'get_attribution_comparison'
)
ORDER BY routine_name;
-- Should return 6 rows

# 2. Test get_signal_journey RPC
SELECT * FROM get_signal_journey('session_550e8400-e29b-41d4-a716-446655440000');
-- Should return events for that signal_id (or empty if none exist)

# 3. Test get_attribution_comparison RPC
SELECT * FROM get_attribution_comparison(30);
-- Should return 3 rows (first_touch, last_touch, linear)

# 4. Test updated get_article_performance_summary
SELECT article_id, signal_count 
FROM get_article_performance_summary(30, 7) 
LIMIT 5;
-- Should include signal_count column (NEW from Migration 187)
```

---

## Step 2: Test Dashboard

### Access Dashboard

```
https://app.tutorwise.com/admin/blog/orchestrator
```

### Test Checklist

#### Overview Tab
- [ ] KPI cards display correctly
  - Total Articles
  - Blog-Assisted Bookings
  - Revenue Generated
  - Conversion Rate
- [ ] Funnel preview shows stages
- [ ] Date range selector works (30/60/90 days)
- [ ] Attribution window selector works (7/14/30 days)

#### Top Articles Tab
- [ ] Article table loads
- [ ] Columns display: Title, Category, Views, Interactions, Saves, Bookings, Revenue, Conv. Rate
- [ ] Article links work (click to view article)
- [ ] Sorting works (if implemented)

#### Conversion Funnel Tab
- [ ] Funnel stages display
- [ ] Stage counts show correctly
- [ ] Conversion rates calculate properly
- [ ] Visual flow makes sense (decreasing counts)

#### Listing Visibility Tab
- [ ] Listing table loads
- [ ] Visibility multiplier calculates correctly
- [ ] Blog views/bookings display
- [ ] Category averages show

#### Signal Journeys Tab (NEW)
- [ ] Search input accepts signal_id
- [ ] Search button enabled when input has value
- [ ] Journey metadata displays:
  - Signal ID
  - Total Events
  - Journey Duration
  - Source (Distribution vs Organic)
- [ ] Timeline visualization shows events in order
- [ ] Event markers numbered correctly
- [ ] Event details show target names
- [ ] Distribution ID displays (if applicable)
- [ ] Error handling works (invalid signal_id)

#### Attribution Models Tab (NEW)
- [ ] Summary insights display:
  - Total Bookings (same across all models)
  - First-Touch Articles count
  - Last-Touch Articles count
  - Linear Articles count
- [ ] Model breakdown table shows 3 rows
- [ ] Model descriptions display correctly
- [ ] Revenue formatted as GBP
- [ ] Educational content ("How to Choose a Model") visible

### Test with Real Data

```bash
# Get a real signal_id from production
psql $DATABASE_URL -c "
SELECT signal_id, COUNT(*) as event_count 
FROM signal_events 
WHERE signal_id IS NOT NULL 
GROUP BY signal_id 
ORDER BY event_count DESC 
LIMIT 5;
"

# Use one of these signal_ids to test Signal Journey Viewer
```

### API Testing

```bash
# Test stats API
curl -H "Cookie: $AUTH_COOKIE" \
  "https://app.tutorwise.com/api/admin/blog/orchestrator/stats?days=30&attributionWindow=7"

# Test journey API (replace SIGNAL_ID)
curl -H "Cookie: $AUTH_COOKIE" \
  "https://app.tutorwise.com/api/admin/blog/orchestrator/journey?signal_id=SIGNAL_ID"

# Test attribution API
curl -H "Cookie: $AUTH_COOKIE" \
  "https://app.tutorwise.com/api/admin/blog/orchestrator/attribution?days=30"
```

---

## Step 3: Monitor Production

### Key Metrics to Watch

```bash
# 1. Signal events being tracked
SELECT 
  DATE(created_at) as date,
  COUNT(*) as events,
  COUNT(DISTINCT signal_id) as unique_journeys,
  COUNT(DISTINCT CASE WHEN signal_id LIKE 'dist_%' THEN signal_id END) as distribution_journeys
FROM signal_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

# 2. RPC performance (check logs)
# Look for slow queries in Supabase dashboard
# Target: RPCs complete in < 1 second

# 3. Dashboard errors
# Check browser console for JavaScript errors
# Check server logs for API errors

# 4. Attribution model differences
SELECT * FROM get_attribution_comparison(30);
# Verify models distribute credit differently
```

### Expected Behavior

**Signal Journeys:**
- Distribution signals (dist_*) should have 7-day cookie expiration
- Organic signals (session_*) should have 30-day cookie expiration
- Journeys can span multiple articles and sessions
- Events should show chronological order

**Attribution Models:**
- First-Touch: Credits entry article (awareness)
- Last-Touch: Credits final article before booking (conversion)
- Linear: Splits credit equally across all articles in journey
- Total bookings should be SAME across all models
- Article counts should be DIFFERENT (redistribution of credit)

---

## Step 4: Week 4 Cutover (After 30 Days)

**IMPORTANT:** Do NOT run Migration 188 immediately. Wait 30 days for backup safety.

### Wait Period Requirements

Before applying Migration 188:
- [ ] 30 days have passed since Migration 187
- [ ] Week 3 RPCs are stable (no errors)
- [ ] Dashboard is being used regularly
- [ ] No rollback requests from team
- [ ] Backup tables still exist (verification)

### When Ready (After 30 Days)

```bash
# Apply Migration 188
psql $DATABASE_URL < tools/database/migrations/188_week4_cutover_drop_views.sql

# Expected output:
# DROP VIEW (4 views dropped)
# DROP FUNCTION (9 trigger functions dropped)
# NOTICE: All backward-compatible views dropped successfully
# NOTICE: Backup tables still present (kept for rollback safety)
```

### Post-Cutover Verification

```bash
# 1. Verify views are gone
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('blog_attribution_events', 'blog_article_metrics', 'blog_listing_links', 'blog_article_saves');
-- Should return 0 rows

# 2. Verify signal_* tables still work
SELECT COUNT(*) FROM signal_events;
SELECT COUNT(*) FROM signal_metrics;
SELECT COUNT(*) FROM signal_content_embeds;
SELECT COUNT(*) FROM signal_content_saves;
-- All should return counts

# 3. Verify backup tables exist (for rollback safety)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%_backup';
-- Should return 4 backup tables
```

---

## Rollback Procedures

### If Migration 187 Fails

```bash
# Migration 187 is non-destructive (only CREATE OR REPLACE)
# To rollback, restore old RPC definitions from Migration 182

psql $DATABASE_URL < tools/database/migrations/182_create_blog_orchestrator_rpcs.sql
```

### If Week 4 Cutover Causes Issues

See Migration 188 comments for detailed rollback procedures:
1. Recreate views from signal_* tables
2. Recreate trigger functions
3. Restore from backup tables (if needed)

---

## Success Criteria

### Week 3 Deployment
- ✅ All 6 RPCs operational
- ✅ Dashboard loads all 6 tabs
- ✅ Signal Journey Viewer works with real data
- ✅ Attribution Models show different credit distribution
- ✅ No performance degradation (< 1s query time)
- ✅ No errors in production logs

### Week 4 Cutover (After 30 Days)
- ✅ Views dropped successfully
- ✅ No code references old table names
- ✅ Application functions normally
- ✅ Backup tables retained for safety
- ✅ Rollback plan tested and documented

---

## Troubleshooting

### Dashboard Shows No Data

**Check:**
```bash
# Are events being tracked?
SELECT COUNT(*) FROM signal_events WHERE created_at > NOW() - INTERVAL '7 days';

# Are signal_ids being set?
SELECT COUNT(*) FROM signal_events WHERE signal_id IS NOT NULL;

# Are there any bookings?
SELECT COUNT(*) FROM bookings WHERE created_at > NOW() - INTERVAL '30 days';
```

### RPC Errors

**Common Issues:**
- Table not found: Run Migrations 183-186 first
- Column not found: Check signal_events has signal_id column
- Performance slow: Add indexes (check Migration 183)

### Signal Journey Not Found

**Check:**
- Signal ID format correct (dist_* or session_*)
- Events exist for that signal_id
- User has events within time window
- Case sensitivity (PostgreSQL is case-sensitive)

---

## Post-Deployment Tasks

### Week 3
- [ ] Update REVENUE-SIGNAL.md with deployment date
- [ ] Document any issues encountered
- [ ] Share dashboard with team for feedback
- [ ] Monitor for 7 days before Week 4

### Week 4 (After 30 Days)
- [ ] Schedule backup table cleanup (Migration 188 uncomment)
- [ ] Archive old migration documentation
- [ ] Update team on final cutover
- [ ] Celebrate successful migration! 🎉

---

## Support

**Issues?** Create a GitHub issue with:
- Migration step that failed
- Error message (full stack trace)
- Database state (table/view/function existence)
- Browser console errors (if dashboard issue)

**Questions?** Check documentation:
- WEEK_3_4_IMPLEMENTATION_SUMMARY.md
- REVENUE-SIGNAL.md (Implementation Status section)
- Migration file comments (detailed inline docs)

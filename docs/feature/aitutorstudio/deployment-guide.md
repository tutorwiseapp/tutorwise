# AI Tutor Studio - Deployment Guide
**Date:** 2026-02-25
**Status:** ✅ Ready for Deployment

---

## Overview

This guide covers deploying the AI Tutor Studio admin feature with RBAC permissions and historical metrics collection.

---

## ✅ Code Changes Complete

All code changes have been implemented and are ready for deployment:

### 1. RBAC Permissions
- ✅ Added `'ai_tutors'` to `AdminResource` type
- ✅ Enabled permission checks in AI Tutors admin page
- ✅ Added authorization guard

### 2. Historical Metrics
- ✅ Enabled metric hooks (`useAdminMetric`, `useAdminTrendData`)
- ✅ Updated KPI cards to show trend indicators
- ✅ Replaced placeholder with real HubTrendChart components

### 3. Metrics Collection System
- ✅ Created cron endpoint: `/api/cron/collect-statistics`
- ✅ Configured daily schedule in `vercel.json`

---

## 📋 Deployment Steps

### Step 1: Deploy Code Changes

```bash
# Commit changes
git add .
git commit -m "feat: AI Tutor Studio RBAC and metrics integration"

# Push to repository
git push origin main

# Deploy to Vercel (or trigger deployment)
```

### Step 2: Set Environment Variable

Add `CRON_SECRET` to your Vercel environment variables:

**Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add new variable:
   - **Name:** `CRON_SECRET`
   - **Value:** `<generate-random-secret>`
   - **Environments:** Production, Preview, Development

**Generate secret:**
```bash
# On macOS/Linux:
openssl rand -base64 32

# Or use online generator:
# https://www.random.org/passwords/
```

### Step 3: Run Database Migration

Execute the SQL migration in Supabase SQL Editor:

**File:** `docs/database/migrations/add-ai-tutors-permissions.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of migration file
3. Click "Run" to execute
4. Verify output shows 11 rows inserted

**Expected Result:**
```
role          | resource   | action
--------------|------------|--------
superadmin    | ai_tutors  | view
superadmin    | ai_tutors  | create
superadmin    | ai_tutors  | update
superadmin    | ai_tutors  | delete
superadmin    | ai_tutors  | manage
admin         | ai_tutors  | view
admin         | ai_tutors  | create
admin         | ai_tutors  | update
admin         | ai_tutors  | manage
systemadmin   | ai_tutors  | view
supportadmin  | ai_tutors  | view
```

### Step 4: Verify Cron Job Deployment

After deployment, verify the cron job is registered:

**Vercel Dashboard:**
1. Go to Project → Deployments → Latest Deployment
2. Click "Functions" tab
3. Look for `/api/cron/collect-statistics`
4. Verify schedule: `0 0 * * *` (daily at midnight UTC)

**Manual Test (Optional):**
```bash
# Test the endpoint manually:
curl -X GET "https://your-domain.vercel.app/api/cron/collect-statistics" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Expected response:
# {
#   "success": true,
#   "date": "2026-02-25",
#   "collected": [
#     "ai_tutors_total",
#     "ai_tutors_active",
#     "ai_tutors_platform",
#     "ai_tutors_user",
#     "ai_tutor_sessions_total"
#   ],
#   "errors": [],
#   "summary": {
#     "total_metrics": 5,
#     "failed_metrics": 0
#   }
# }
```

### Step 5: Verify Permissions

Test that permissions are working:

1. **As Superadmin:**
   - Navigate to `/admin/ai-tutors`
   - Should see full page with all tabs

2. **As Non-Admin User:**
   - Navigate to `/admin/ai-tutors`
   - Should see "Unauthorized Access" message

3. **Grant Permission to Test Admin:**
   ```sql
   -- In Supabase SQL Editor:
   UPDATE profiles
   SET
     is_admin = true,
     admin_role = 'admin'
   WHERE email = 'test-admin@example.com';
   ```
   - Should now see AI Tutors page

---

## 📊 Metrics Collection Timeline

| Day | Status | What to Expect |
|-----|--------|----------------|
| Day 0 (Today) | Deploy | Cron job scheduled, no data yet |
| Day 1 | First Collection | First data point collected at midnight UTC |
| Day 2-6 | Building Trends | Data accumulating, partial trend lines |
| Day 7+ | Full Trends | Complete 7-day trend charts visible |

**During Days 1-6:**
- KPI cards will show current values with trends (if comparing to previous data exists)
- Charts may show partial trend lines (whatever data is available)
- This is normal behavior

**After Day 7:**
- Full 7-day trend charts will display
- Historical comparisons (vs last month) will work if data exists

---

## 🧪 Testing Checklist

### After Deployment:

- [ ] Code deployed successfully to production
- [ ] `CRON_SECRET` environment variable set
- [ ] Database migration executed (11 permissions added)
- [ ] Cron job shows in Vercel Functions
- [ ] Navigate to `/admin/ai-tutors` as superadmin → page loads
- [ ] Navigate to `/admin/ai-tutors` as non-admin → unauthorized message
- [ ] KPI cards display current values (no trends yet - normal)
- [ ] Ownership Breakdown chart displays
- [ ] Trend charts show "No data" or loading state (normal on Day 0)

### After First Cron Run (Day 1):

- [ ] Check cron logs in Vercel
- [ ] Verify data in `platform_statistics_daily` table:
   ```sql
   SELECT * FROM platform_statistics_daily
   WHERE metric LIKE 'ai_tutor%'
   ORDER BY date DESC;
   ```
- [ ] Refresh `/admin/ai-tutors` → KPI cards may show trend indicators
- [ ] Charts may show first data point

### After 7 Days:

- [ ] Full 7-day trend lines visible in charts
- [ ] Historical comparisons working (e.g., "+5 vs last month")

---

## 🔧 Troubleshooting

### Cron Job Not Running

**Problem:** No data appearing after 24 hours

**Check:**
1. Vercel cron logs for errors
2. `CRON_SECRET` matches in code and requests
3. Cron schedule is correct: `0 0 * * *`

**Fix:**
```bash
# Manually trigger to test:
curl -X GET "https://your-domain.vercel.app/api/cron/collect-statistics" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Permissions Not Working

**Problem:** Still see "Unauthorized" as admin

**Check:**
1. Database migration ran successfully
2. User's `admin_role` is set correctly in profiles table
3. `has_admin_permission` RPC function exists

**Fix:**
```sql
-- Check user's admin status:
SELECT id, email, is_admin, admin_role
FROM profiles
WHERE email = 'your-email@example.com';

-- If null, grant admin:
UPDATE profiles
SET is_admin = true, admin_role = 'superadmin'
WHERE email = 'your-email@example.com';
```

### Charts Showing "No Data"

**Problem:** Charts still empty after several days

**Check:**
1. Cron job running successfully (check logs)
2. Data exists in `platform_statistics_daily`:
   ```sql
   SELECT COUNT(*)
   FROM platform_statistics_daily
   WHERE metric LIKE 'ai_tutor%';
   ```

**Expected:** After Day 1, should see ~5 rows per day

**If 0 rows:**
- Cron job not running or failing
- Check cron logs for errors
- Verify `ai_tutors` and `ai_tutor_sessions` tables exist

---

## 📂 Files Changed

### New Files Created:
```
apps/web/src/app/api/cron/collect-statistics/route.ts
docs/database/migrations/add-ai-tutors-permissions.sql
docs/feature/aitutorstudio/deployment-guide.md
docs/feature/aitutorstudio/implementation-rbac-metrics.md
```

### Modified Files:
```
apps/web/src/lib/rbac/types.ts
apps/web/src/app/(admin)/admin/ai-tutors/page.tsx
apps/web/src/app/(admin)/admin/ai-tutors/page.module.css
apps/web/vercel.json
```

---

## 🎯 Success Criteria

### Immediate (After Deployment):
- ✅ Page loads for superadmin
- ✅ Unauthorized message for non-admins
- ✅ No console errors
- ✅ Cron job registered in Vercel

### Within 24 Hours:
- ✅ First metrics collected
- ✅ Data visible in database
- ✅ KPI cards show values

### Within 7 Days:
- ✅ Full trend charts displaying
- ✅ Historical comparisons working
- ✅ All metrics updating daily

---

## 📞 Support

If you encounter issues during deployment:

1. **Check Vercel Logs:** Deployment → Runtime Logs
2. **Check Cron Logs:** Functions → `/api/cron/collect-statistics`
3. **Check Database:** Supabase → Table Editor → `platform_statistics_daily`
4. **Review Error Messages:** Browser Console and Network tab

**Common Issues:**
- `CRON_SECRET` mismatch → 401 Unauthorized
- Missing `ai_tutors` table → 500 Internal Server Error
- Permission denied → Database migration not run

---

## ✅ Deployment Complete!

Once all steps are completed, AI Tutor Studio will be:
- ✅ **Secure:** Protected by RBAC permissions
- ✅ **Insightful:** Showing historical trends and analytics
- ✅ **Automated:** Daily metrics collection
- ✅ **Production-Ready:** Fully compliant with hub standards

**Estimated Deployment Time:** 15-20 minutes
**Full Feature Availability:** 7 days (for complete trend data)

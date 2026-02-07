# Booking/Scheduling Enhancements - Setup Guide

## ✅ Completed
- [x] All database migrations applied (237-243)
- [x] All backend utilities implemented
- [x] All API endpoints created
- [x] TypeScript compilation verified
- [x] Integration testing complete

## 🔧 Required Setup Steps

### 1. Configure Supabase pg_cron Jobs

Run these SQL commands in your Supabase SQL Editor to set up automated cron jobs:

```sql
-- Enable pg_cron and http extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- 1. Session Reminders - 24h (runs hourly)
SELECT cron.schedule(
  'session-reminders-24h',
  '0 * * * *',  -- Every hour
  $$
  SELECT net.http_get(
    url := 'https://your-production-domain.com/api/cron/session-reminders?type=24h',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
  );
  $$
);

-- 2. Session Reminders - 1h (runs every 15 minutes)
SELECT cron.schedule(
  'session-reminders-1h',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_get(
    url := 'https://your-production-domain.com/api/cron/session-reminders?type=1h',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
  );
  $$
);

-- 3. Session Reminders - 15min (runs every 5 minutes)
SELECT cron.schedule(
  'session-reminders-15min',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_get(
    url := 'https://your-production-domain.com/api/cron/session-reminders?type=15min',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
  );
  $$
);

-- 4. No-Show Detection (runs every 15 minutes)
SELECT cron.schedule(
  'no-show-detection',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_get(
    url := 'https://your-production-domain.com/api/cron/no-show-detection',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
  );
  $$
);

-- Set the cron secret (replace with your actual CRON_SECRET from .env)
ALTER DATABASE postgres SET app.cron_secret = 'your-actual-cron-secret-here';
```

### 2. Verify Cron Jobs Are Running

```sql
-- List all scheduled jobs
SELECT * FROM cron.job;

-- Check job execution history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### 3. Environment Variables

Ensure these are set in your production environment:

```bash
# Already in .env.local
CRON_SECRET=your-secure-random-string
CALENDAR_ENCRYPTION_KEY=your-32-byte-hex-key

# Verify Stripe keys (for refund processing)
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Supabase (should already be configured)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. Test Cron Endpoints Manually

Test each endpoint to ensure they work:

```bash
# Test 24h reminders
curl -X GET "https://your-domain.com/api/cron/session-reminders?type=24h" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test 1h reminders
curl -X GET "https://your-domain.com/api/cron/session-reminders?type=1h" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test 15min reminders
curl -X GET "https://your-domain.com/api/cron/session-reminders?type=15min" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test no-show detection
curl -X GET "https://your-domain.com/api/cron/no-show-detection" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response for each:
```json
{
  "success": true,
  "processed": 0,
  "message": "No reminders to send"
}
```

## 🎨 Optional UI Enhancements

These are **optional** and can be implemented as needed:

### 1. Recurring Bookings UI
- Create booking form with recurrence pattern selector
- Display preview of generated instances
- Manage series (pause/resume/cancel)

**Location:** `apps/web/src/app/components/feature/bookings/RecurringBookingForm.tsx`

### 2. Availability Exceptions Manager
- Calendar view for managing exception dates
- Quick add UK bank holidays button
- Time range picker for partial blocks

**Location:** `apps/web/src/app/components/feature/availability/ExceptionDatesManager.tsx`

### 3. Cancellation Warning Modal
- Shows refund calculation preview
- Displays late cancellation warnings
- Repeat offender alerts

**Location:** `apps/web/src/app/components/feature/bookings/CancellationWarningModal.tsx`

### 4. Quick Rating Prompt
- 5-star picker after session completion
- "Skip for now" option
- Link to full review form

**Location:** `apps/web/src/app/components/feature/bookings/QuickRatingPrompt.tsx`

## 📊 Monitoring & Maintenance

### Check Reminder Delivery
```sql
-- Check reminder statistics
SELECT
  reminder_type,
  status,
  COUNT(*) as count
FROM booking_reminders
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY reminder_type, status
ORDER BY reminder_type, status;
```

### Check No-Show Reports
```sql
-- Recent no-show reports
SELECT
  status,
  COUNT(*) as count
FROM no_show_reports
WHERE reported_at >= NOW() - INTERVAL '30 days'
GROUP BY status;
```

### Check Cancellation Penalties
```sql
-- Repeat offenders in last 30 days
SELECT
  user_id,
  COUNT(*) as late_cancellations
FROM cancellation_penalties
WHERE penalty_type = 'late_cancel'
  AND applied_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
HAVING COUNT(*) >= 3
ORDER BY late_cancellations DESC;
```

## 🚨 Troubleshooting

### Cron Jobs Not Running
1. Check pg_cron is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Check job schedule: `SELECT * FROM cron.job;`
3. Check recent runs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
4. Verify `app.cron_secret` is set: `SHOW app.cron_secret;`

### Reminders Not Sending
1. Check booking has status = 'Confirmed'
2. Verify reminder records exist: `SELECT * FROM booking_reminders WHERE booking_id = 'xxx';`
3. Check cron job execution logs
4. Test endpoint manually with curl

### Conflicts Not Detected
1. Verify tutor_availability_exceptions table populated
2. Check conflict detection is called in booking creation
3. Test with overlapping time ranges
4. Check session_start_time is in correct timezone

## ✅ Post-Setup Verification Checklist

- [ ] All 4 cron jobs scheduled in Supabase
- [ ] Cron jobs showing successful runs in `cron.job_run_details`
- [ ] Test booking creates 3 reminder records
- [ ] Test conflict detection prevents double-booking
- [ ] Test exception dates filter from availability calendar
- [ ] Test late cancellation shows penalty warning
- [ ] Test quick rating can be submitted
- [ ] Test recurring series creates multiple bookings

## 📞 Support

If you encounter issues:
1. Check the logs in Supabase Dashboard → Database → Logs
2. Review `cron.job_run_details` for failed cron jobs
3. Test endpoints manually with curl
4. Verify environment variables are set correctly

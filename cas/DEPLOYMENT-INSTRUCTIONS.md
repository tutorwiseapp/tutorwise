# CAS Agent Activation - Deployment Instructions

## Overview

This guide activates the CAS Marketer and Security agents by:
1. Creating database tables for insights and scan results
2. Deploying Supabase Edge Functions for automated execution
3. Setting up cron jobs for daily/weekly runs

---

## Step 1: Create Database Tables

### Option A: Via Supabase SQL Editor (Recommended)

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir/sql)

2. **Execute Migration 271** - CAS Marketer Insights Table:
   - Copy contents of `tools/database/migrations/271_create_cas_marketer_insights.sql`
   - Paste into SQL Editor
   - Click "Run"

3. **Execute Migration 272** - CAS Security Scans Table:
   - Copy contents of `tools/database/migrations/272_create_cas_security_scans.sql`
   - Paste into SQL Editor
   - Click "Run"

### Option B: Via psql Command Line

```bash
# Set connection details
export PGHOST="db.lvsmtgmpoysjygdwcrir.supabase.co"
export PGPORT="6543"  # Pooler port for transactions
export PGDATABASE="postgres"
export PGUSER="postgres.lvsmtgmpoysjygdwcrir"
export PGPASSWORD="8goRkJd6cPkPGyIY"

# Run migrations
psql -f tools/database/migrations/271_create_cas_marketer_insights.sql
psql -f tools/database/migrations/272_create_cas_security_scans.sql
```

### Verify Tables Created

Run in SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('cas_marketer_insights', 'cas_security_scans');
```

Expected output: 2 rows

---

## Step 2: Deploy Supabase Edge Functions

### Deploy CAS Marketer Analytics Function

```bash
# Login to Supabase (if needed)
supabase login

# Link to project
supabase link --project-ref lvsmtgmpoysjygdwcrir

# Deploy Marketer function
supabase functions deploy cas-marketer-analytics --no-verify-jwt

# Set secrets
supabase secrets set CRON_SECRET=tutorwise-cron-2024-cas-marketer
```

### Deploy CAS Security Scan Function

```bash
# Deploy Security function
supabase functions deploy cas-security-scan --no-verify-jwt

# Set secrets
supabase secrets set CRON_SECRET=tutorwise-cron-2024-cas-security
```

---

## Step 3: Set Up Cron Jobs

### Create Cron Jobs via Supabase SQL Editor

Execute this SQL to create the cron schedules:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- CAS Marketer: Run daily at 02:00 UTC
SELECT cron.schedule(
  'cas-marketer-daily-analytics',
  '0 2 * * *',  -- Daily at 2 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://lvsmtgmpoysjygdwcrir.supabase.co/functions/v1/cas-marketer-analytics',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer tutorwise-cron-2024-cas-marketer"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);

-- CAS Security: Run weekly on Sundays at 03:00 UTC
SELECT cron.schedule(
  'cas-security-weekly-scan',
  '0 3 * * 0',  -- Weekly on Sunday at 3 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://lvsmtgmpoysjygdwcrir.supabase.co/functions/v1/cas-security-scan',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer tutorwise-cron-2024-cas-security"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);
```

### Verify Cron Jobs Created

```sql
SELECT jobid, schedule, command
FROM cron.job
WHERE jobname IN ('cas-marketer-daily-analytics', 'cas-security-weekly-scan');
```

---

## Step 4: Manual Test Run

### Test Marketer Analytics Collection

```bash
curl -X POST \
  'https://lvsmtgmpoysjygdwcrir.supabase.co/functions/v1/cas-marketer-analytics' \
  -H 'Authorization: Bearer tutorwise-cron-2024-cas-marketer' \
  -H 'Content-Type: application/json'
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2026-02-21T...",
  "metrics": {
    "sage": { ... },
    "lexi": { ... }
  },
  "insights": {
    "total": 3,
    "critical": 0,
    "high": 1,
    "items": [...]
  }
}
```

### Test Security Scan

```bash
curl -X POST \
  'https://lvsmtgmpoysjygdwcrir.supabase.co/functions/v1/cas-security-scan' \
  -H 'Authorization: Bearer tutorwise-cron-2024-cas-security' \
  -H 'Content-Type: application/json'
```

---

## Step 5: Verify Activation

### Check Marketer Insights

```sql
SELECT type, priority, message, created_at
FROM cas_marketer_insights
ORDER BY created_at DESC
LIMIT 10;
```

### Check Security Scans

```sql
SELECT scan_type, passed, critical_count, high_count, created_at
FROM cas_security_scans
ORDER BY created_at DESC
LIMIT 5;
```

---

## Monitoring & Logs

### View Edge Function Logs

1. Go to [Supabase Edge Functions](https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir/functions)
2. Click on function name (cas-marketer-analytics or cas-security-scan)
3. View "Logs" tab

### View Cron Job Execution History

```sql
SELECT jobid, jobname, runid, job_pid, database, username,
       command, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobname IN ('cas-marketer-daily-analytics', 'cas-security-weekly-scan')
ORDER BY start_time DESC
LIMIT 20;
```

---

## Troubleshooting

### Issue: "Unauthorized" error

- Check CRON_SECRET is set correctly in Supabase secrets
- Verify Authorization header matches CRON_SECRET

### Issue: Edge Function not found

- Redeploy function: `supabase functions deploy <function-name>`
- Check function appears in Supabase dashboard

### Issue: Cron job not running

- Check pg_cron extension is enabled
- Verify cron schedule syntax
- Check cron.job_run_details for errors

### Issue: No insights created

- Verify Sage/Lexi have sessions/feedback in database
- Check minimum thresholds (e.g., 10+ feedback needed)
- Review Edge Function logs for errors

---

## Next Steps

After activation:

1. ✅ **Monitor first 24h** - Check Marketer insights appear
2. ✅ **Review first week** - Check Security scan results
3. ✅ **Update CAS README** - Mark agents as "✅ Active"
4. ✅ **Update Roadmap** - Move Marketer/Security to "Completed"
5. ✅ **Test feedback loop** - Verify insights reach CAS Planner

---

## Rollback Instructions

### Disable Cron Jobs

```sql
SELECT cron.unschedule('cas-marketer-daily-analytics');
SELECT cron.unschedule('cas-security-weekly-scan');
```

### Drop Tables

```sql
DROP TABLE IF EXISTS cas_marketer_insights CASCADE;
DROP TABLE IF EXISTS cas_security_scans CASCADE;
```

### Remove Edge Functions

```bash
supabase functions delete cas-marketer-analytics
supabase functions delete cas-security-scan
```

---

**Status:** Ready for deployment
**Last Updated:** 2026-02-21
**Version:** 1.0

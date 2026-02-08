# Supabase Admin Manual Tasks

## Guardian Invitations - Auto-Expiration Cron Job

**Status:** ⚠️ **ACTION REQUIRED**

### What Was Done Automatically
✅ Migration 250 created `guardian_invitations` table with secure UUID tokens
✅ Function `expire_old_guardian_invitations()` created
✅ RLS policies configured
✅ Indexes created for performance

### What You Need to Do Manually

#### 1. Schedule Cron Job for Invitation Expiration

The `expire_old_guardian_invitations()` function needs to run daily to mark expired invitations.

**Option A: Using Supabase Dashboard SQL Editor**

```sql
-- Enable extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily expiration job (runs every day at 3am UTC)
SELECT cron.schedule(
  'expire-guardian-invitations',
  '0 3 * * *',
  $$
  SELECT expire_old_guardian_invitations();
  $$
);

-- Verify the job was scheduled
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'expire-guardian-invitations';
```

**Option B: Using API Endpoint (Recommended)**

Create a new cron API endpoint and use the existing CRON_SECRET pattern:

1. Create `/apps/web/src/app/api/cron/expire-invitations/route.ts`
2. Add pg_cron job that calls the endpoint with Bearer token
3. Consistent with existing cron job pattern

**Example endpoint:**
```typescript
// apps/web/src/app/api/cron/expire-invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    // Call the expiration function
    const { data, error } = await supabase.rpc('expire_old_guardian_invitations');

    if (error) throw error;

    console.log(`[Expire Invitations] Expired ${data} invitations`);

    return NextResponse.json({
      success: true,
      expired_count: data,
    });
  } catch (error) {
    console.error('[Expire Invitations] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Then add the pg_cron job:**
```sql
-- Schedule daily expiration job (runs every day at 3am UTC)
SELECT cron.schedule(
  'expire-guardian-invitations',
  '0 3 * * *',
  $$
  SELECT net.http_get(
      url := 'https://www.tutorwise.io/api/cron/expire-invitations',
      headers := jsonb_build_object(
          'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
      )
  );
  $$
);
```

#### 2. Monitor Invitation Metrics (Optional)

**Useful queries for monitoring:**

```sql
-- Check pending invitations
SELECT
  COUNT(*) as pending_count,
  COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_but_not_marked
FROM guardian_invitations
WHERE status = 'pending';

-- Recent invitation activity
SELECT
  status,
  COUNT(*) as count,
  MAX(created_at) as most_recent
FROM guardian_invitations
GROUP BY status;

-- Top guardian inviters (potential spam detection)
SELECT
  g.guardian_id,
  p.full_name,
  p.email,
  COUNT(*) as invitation_count,
  COUNT(CASE WHEN g.status = 'accepted' THEN 1 END) as accepted_count
FROM guardian_invitations g
JOIN profiles p ON p.id = g.guardian_id
WHERE g.created_at > NOW() - INTERVAL '30 days'
GROUP BY g.guardian_id, p.full_name, p.email
ORDER BY invitation_count DESC
LIMIT 20;
```

#### 3. Verify Cron Job Execution (After Setup)

```sql
-- Check if job is scheduled and active
SELECT jobid, jobname, schedule, active, command
FROM cron.job
WHERE jobname = 'expire-guardian-invitations';

-- View recent execution history
SELECT
  jobid,
  runid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = 'expire-guardian-invitations'
ORDER BY start_time DESC
LIMIT 10;
```

#### 4. Manual Expiration (If Needed)

If you need to manually expire old invitations before the cron job runs:

```sql
-- Manually expire old invitations
SELECT expire_old_guardian_invitations();

-- Or run the UPDATE directly
UPDATE guardian_invitations
SET status = 'expired'
WHERE status = 'pending'
  AND expires_at < NOW();
```

---

## Other Pending Admin Tasks

### Referral System Cron Jobs
✅ Already configured in Migration 232:
- `process-pending-commissions` - Hourly at :15
- `process-batch-payouts` - Fridays at 10am UTC

### Session Reminders
✅ Already configured in Migration 215:
- `send-session-reminders` - Hourly

### SEO Sync Jobs
✅ Already configured in Migration 151:
- `seo-sync-hourly` - Hourly
- `seo-weekly-summary` - Weekly
- `seo-monthly-archive` - Monthly

### Weekly Reports
✅ Already configured in Migration 216:
- `send-weekly-reports` - Mondays at 8am UTC

---

## Security Notes

### CRON_SECRET Rotation
If you need to rotate the CRON_SECRET:

1. Generate new secret: `openssl rand -base64 32`
2. Update in Supabase Dashboard → Project Settings → Edge Functions → Secrets
3. Update in Vercel → Project Settings → Environment Variables
4. Update all pg_cron jobs with new Bearer token:
   - Migration 214: `process-referral-email-queue`, `process-admin-notifications`
   - Migration 215: `send-session-reminders`
   - Migration 216: `send-weekly-reports`
   - Migration 232: `process-pending-commissions`, `process-batch-payouts`
   - New: `expire-guardian-invitations`
5. Update `.env.local` for local development

### RLS Policy Verification

Verify guardian_invitations RLS policies are active:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'guardian_invitations';

-- View policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'guardian_invitations';
```

Expected policies:
1. ✅ Guardians can view their invitations (SELECT)
2. ✅ Guardians can create invitations (INSERT)
3. ✅ Guardians can update their invitations (UPDATE - for revoking)
4. ✅ Admins can view all invitations (SELECT)

---

## Monitoring & Alerts

### Recommended Metrics to Track

1. **Invitation Conversion Rate**: accepted / total sent
2. **Expiration Rate**: expired / total sent
3. **Average Time to Acceptance**: accepted_at - created_at
4. **Spam Detection**: Invitations per guardian per day

### Supabase Dashboard Queries

Add these to your Supabase dashboard for quick monitoring:

```sql
-- Invitation Stats (Last 30 Days)
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
  COUNT(*) FILTER (WHERE status = 'expired') as expired,
  COUNT(*) FILTER (WHERE status = 'revoked') as revoked,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'accepted') / NULLIF(COUNT(*), 0), 2) as acceptance_rate
FROM guardian_invitations
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## Rollback Instructions (If Needed)

If you need to rollback the guardian_invitations table:

```sql
-- WARNING: This will delete all invitation tokens
DROP TABLE IF EXISTS guardian_invitations CASCADE;
DROP FUNCTION IF EXISTS expire_old_guardian_invitations();
DROP FUNCTION IF EXISTS update_guardian_invitations_updated_at();
SELECT cron.unschedule('expire-guardian-invitations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-guardian-invitations');
```

**Note**: Guardians will need to re-send invitations after rollback.

---

## Next Steps

- [ ] Choose Option A or B for cron job setup
- [ ] Run the SQL to schedule the cron job
- [ ] Verify job appears in `cron.job` table
- [ ] Test manual execution: `SELECT expire_old_guardian_invitations();`
- [ ] Wait 24-48 hours and check `cron.job_run_details` for execution history
- [ ] Add monitoring queries to Supabase dashboard (optional)

**Estimated Time**: 10-15 minutes

---

Last Updated: 2026-02-08
Migration: 250_create_guardian_invitations_table.sql
Commit: 85f3c12b

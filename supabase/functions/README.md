# Supabase Edge Functions

Automated cron jobs for TutorWise feedback loops and analytics.

## Functions

### 1. sage-feedback-processor

**Purpose:** Daily processing of Sage feedback to identify curriculum gaps

**Schedule:** Daily at 2am UTC (`0 2 * * *`)

**What it does:**
- Analyzes last 30 days of Sage feedback
- Identifies topics with low positive rates (<60%)
- Classifies gaps by severity (critical/high/medium/low)
- Returns actionable gaps for curriculum improvement

**Trigger:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/sage-feedback-processor \
  -H "Authorization: Bearer tutorwise-cron-2024-sage-feedback"
```

---

### 2. marketer-analytics

**Purpose:** Daily collection of usage analytics from Sage and Lexi

**Schedule:** Daily at 3am UTC (`0 3 * * *`)

**What it does:**
- Collects last 24h usage metrics (sessions, messages, users)
- Calculates feedback satisfaction rates
- Generates growth insights (opportunities, risks, milestones)
- Alerts when action needed (e.g., low satisfaction, drop-off)

**Trigger:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/marketer-analytics \
  -H "Authorization: Bearer tutorwise-cron-2024-marketer"
```

---

## Deployment

### 1. Install Supabase CLI

```bash
brew install supabase/tap/supabase  # macOS
# or
npm install -g supabase
```

### 2. Deploy Functions

```bash
# Deploy Sage feedback processor
supabase functions deploy sage-feedback-processor

# Deploy Marketer analytics
supabase functions deploy marketer-analytics
```

### 3. Set Environment Secrets

```bash
# Set CRON_SECRET for sage-feedback-processor
supabase secrets set CRON_SECRET=tutorwise-cron-2024-sage-feedback --project-ref YOUR_PROJECT_REF

# Set CRON_SECRET for marketer-analytics
supabase secrets set CRON_SECRET=tutorwise-cron-2024-marketer --project-ref YOUR_PROJECT_REF
```

**Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

### 4. Set Up Cron Schedule (via pg_cron)

Connect to your Supabase database and run:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule sage-feedback-processor (daily at 2am UTC)
SELECT cron.schedule(
  'sage-feedback-processor-daily',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/sage-feedback-processor',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer tutorwise-cron-2024-sage-feedback"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule marketer-analytics (daily at 3am UTC)
SELECT cron.schedule(
  'marketer-analytics-daily',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/marketer-analytics',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer tutorwise-cron-2024-marketer"}'::jsonb
    ) as request_id;
  $$
);
```

### 5. Verify Cron Jobs

```sql
-- List all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## Testing Locally

### 1. Start Supabase Functions locally

```bash
supabase functions serve sage-feedback-processor --env-file ./supabase/.env.local
```

### 2. Test with curl

```bash
curl -X POST http://localhost:54321/functions/v1/sage-feedback-processor \
  -H "Authorization: Bearer tutorwise-cron-2024-sage-feedback"
```

---

## Environment Variables

Both functions automatically receive:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for bypassing RLS)

Custom secrets (set via `supabase secrets set`):
- `CRON_SECRET` - Authentication secret for cron triggers

---

## Monitoring

### View Function Logs

```bash
# Sage feedback processor logs
supabase functions logs sage-feedback-processor

# Marketer analytics logs
supabase functions logs marketer-analytics

# Follow logs in real-time
supabase functions logs marketer-analytics --follow
```

### Check Function Status

Go to Supabase Dashboard → Edge Functions → View logs and metrics

---

## Troubleshooting

### Function returns 401 Unauthorized
- Check that `CRON_SECRET` matches in both the function code and cron job
- Verify `Authorization` header format: `Bearer <secret>`

### Function times out
- Edge Functions have 60s timeout by default
- If processing takes longer, consider batching or using background jobs

### Cron job not running
- Check `cron.job_run_details` for error messages
- Verify `net.http_post` has correct URL and headers
- Ensure pg_cron extension is enabled

---

## Security Notes

- ✅ CRON_SECRET is hardcoded in functions (not in .env files)
- ✅ Functions use service_role key for database access
- ✅ All database operations are logged
- ⚠️ Never expose CRON_SECRET in client-side code
- ⚠️ Rotate CRON_SECRET if compromised

---

## Next Steps

1. Deploy both functions to production
2. Set up pg_cron schedules
3. Monitor logs for first 7 days
4. Integrate with CAS message bus for automated task creation
5. Add Slack/email notifications for critical insights

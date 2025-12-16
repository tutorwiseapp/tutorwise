# Referral System - Deployment Guide
## Migration 091: Hierarchical Attribution

**Date**: 2025-12-16
**Deployment Time**: 30 minutes
**Status**: ✅ Ready for Production

---

## Pre-Deployment Checklist

Before starting, ensure you have:

- [ ] Access to Vercel dashboard (deployment permissions)
- [ ] Access to Supabase dashboard (database admin)
- [ ] Terminal access for generating secrets
- [ ] This deployment guide open

---

## 30-Minute Deployment Plan

### Phase 1: Generate Secret (Minutes 0-5)

**Step 1.1: Generate REFERRAL_COOKIE_SECRET**

```bash
# Generate a strong 32-byte secret
openssl rand -hex 32

# Output will be 64 characters, example:
# 8f3a2b1c9d7e6f4a2b1c9d7e6f4a2b1c8f3a2b1c9d7e6f4a2b1c9d7e6f4a2b1c
```

**Step 1.2: Store Secret Securely**

```bash
# Copy to clipboard (macOS)
openssl rand -hex 32 | pbcopy

# Copy to clipboard (Linux)
openssl rand -hex 32 | xclip -selection clipboard

# Copy to clipboard (Windows)
openssl rand -hex 32 | clip
```

**IMPORTANT**: Save this secret in your password manager (1Password, LastPass, etc.) with label:
```
Name: TutorWise Referral Cookie Secret (Production)
Username: REFERRAL_COOKIE_SECRET
Password: [your generated secret]
Notes: Generated 2025-12-16, Rotate every 6 months
```

---

### Phase 2: Configure Environment (Minutes 5-10)

**Step 2.1: Add to Vercel (Production)**

```bash
# In terminal, navigate to project root
cd /Users/michaelquan/projects/tutorwise

# Login to Vercel (if not already)
vercel login

# Add production secret
vercel env add REFERRAL_COOKIE_SECRET production

# When prompted, paste your generated secret (64 characters)
# Press Enter

# Verify it was added
vercel env ls
```

Expected output:
```
Environment Variables
production
  REFERRAL_COOKIE_SECRET  (Encrypted)  ••••••••
```

**Step 2.2: Add to Vercel (Preview/Staging) - OPTIONAL**

```bash
# Add preview/staging secret (use different secret!)
vercel env add REFERRAL_COOKIE_SECRET preview

# Paste a DIFFERENT secret for staging
```

**Step 2.3: Add to Local Development**

```bash
# Edit .env.local
nano .env.local

# Add this line (use DIFFERENT secret for dev)
REFERRAL_COOKIE_SECRET=your_dev_secret_here

# Save and exit (Ctrl+X, Y, Enter)
```

---

### Phase 3: Database Migration (Minutes 10-15)

**Step 3.1: Open Supabase SQL Editor**

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your **production** project: `tutorwise`
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

**Step 3.2: Run Migration 091**

Copy the entire migration file content:

```bash
# In terminal, copy migration to clipboard
cat apps/api/migrations/091_hierarchical_attribution_enhancement.sql | pbcopy
```

Then in Supabase SQL Editor:
1. Paste the migration SQL
2. Click **Run** (bottom right)
3. Wait for success message: "Success. No rows returned"

**Step 3.3: Verify Migration**

Run these verification queries in SQL Editor:

```sql
-- 1. Check attribution_method column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'referrals'
  AND column_name = 'attribution_method';

-- Expected: 1 row returned (attribution_method, text)

-- 2. Check referral_source column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'referral_source';

-- Expected: 1 row returned (referral_source, text)

-- 3. Check HMAC validation function exists
SELECT proname FROM pg_proc
WHERE proname = 'validate_referral_cookie_signature';

-- Expected: 1 row returned (validate_referral_cookie_signature)

-- 4. Check handle_new_user version
SELECT obj_description((SELECT oid FROM pg_proc WHERE proname = 'handle_new_user'));

-- Expected: Contains "v6.0 - Hierarchical Attribution"
```

✅ **All checks passed?** Proceed to Phase 4.
❌ **Any check failed?** Review migration output for errors.

---

### Phase 4: Deploy Code (Minutes 15-25)

**Step 4.1: Commit Code Changes**

```bash
# Check git status
git status

# You should see:
# - apps/web/src/app/a/[referral_id]/route.ts (modified)
# - apps/web/src/utils/referral/context.ts (new)
# - apps/api/migrations/091_hierarchical_attribution_enhancement.sql (new)
# - tests/e2e/referrals/hierarchical-attribution.test.ts (new)

# Stage changes
git add apps/web/src/app/a/[referral_id]/route.ts
git add apps/web/src/utils/referral/context.ts
git add apps/api/migrations/091_hierarchical_attribution_enhancement.sql
git add tests/e2e/referrals/hierarchical-attribution.test.ts

# Commit
git commit -m "feat(referrals): Implement hierarchical attribution with HMAC (Migration 091)

- Add URL → Cookie → Manual priority chain
- Implement HMAC-SHA256 cookie signing for tamper detection
- Update handle_new_user() trigger with full attribution resolution
- Add attribution_method tracking to referrals table
- Add referral context utility for signup metadata
- Add comprehensive E2E test suite (11 tests)

Patent Reference: Section 3 (Hierarchical Attribution), Dependent Claim 2
Migration: 091_hierarchical_attribution_enhancement.sql"
```

**Step 4.2: Deploy to Production**

```bash
# Deploy to Vercel production
vercel --prod

# Wait for deployment to complete
# Expected output:
# ✅ Production: https://tutorwise.co.uk [1m 23s]
```

**Step 4.3: Verify Deployment**

```bash
# Check deployment status
vercel inspect https://tutorwise.co.uk

# Verify environment variables are set
vercel env pull .env.production
grep REFERRAL_COOKIE_SECRET .env.production

# Expected: REFERRAL_COOKIE_SECRET="••••••••" (encrypted)
```

---

### Phase 5: Smoke Tests (Minutes 25-30)

**Step 5.1: Test Referral Link (Manual)**

1. **Create Test Agent**:
   - Sign up: [https://tutorwise.co.uk/signup](https://tutorwise.co.uk/signup)
   - Email: `agent-test-$(date +%s)@example.com`
   - Complete profile

2. **Get Referral Code**:
   - Go to Account → Referrals
   - Copy referral link: `https://tutorwise.co.uk/a/[YOUR_CODE]`

3. **Test Cookie Signing**:
   - Open incognito window
   - Click referral link
   - Open DevTools → Application → Cookies
   - Find `tutorwise_referral_id`
   - **Verify**: Cookie value contains a dot (`.`)
     ```
     Expected: a1b2c3d4-e5f6-7890-abcd-ef1234567890.8f3a2b1c9d7e6f4a...
                                                      ^ Dot separator
     ```
   - ✅ Cookie is signed correctly

4. **Test Attribution**:
   - In same incognito window, sign up:
     - Email: `referred-user-test@example.com`
     - Complete signup
   - Go to Supabase → Table Editor → profiles
   - Find your test user
   - **Verify**: `referral_source = 'cookie'`
   - **Verify**: `referred_by_profile_id = [agent_uuid]`
   - ✅ Attribution working

**Step 5.2: Run Automated Tests**

```bash
# Run E2E test suite
cd apps/web
npm run test:e2e tests/e2e/referrals/hierarchical-attribution.test.ts

# Expected output:
# ✓ Priority 1: URL parameter attribution (2 tests)
# ✓ Priority 2: Cookie fallback attribution (4 tests)
# ✓ Priority 3: Manual code entry attribution (2 tests)
# ✓ Organic signups (1 test)
# ✓ Case sensitivity (1 test)
#
# Test Suites: 1 passed, 1 total
# Tests:       11 passed, 11 total
```

**Step 5.3: Monitor Production Logs**

```bash
# Open Vercel logs
vercel logs https://tutorwise.co.uk --follow

# Look for log entries:
# [Referral] Valid code: kRz7Bq2, Agent: <uuid>
# [Referral] Set HMAC-signed cookie: { hasSigned: true }
# [Referral] Redirecting to: /
```

In Supabase Dashboard → Logs → Postgres:
```
Look for NOTICE messages from trigger:
"Attribution: Cookie (referral_id: ...)"
or
"Attribution: Manual entry (referral_code: ...)"
```

---

## Post-Deployment Verification

### Check 1: Attribution Method Distribution

```sql
-- In Supabase SQL Editor
SELECT
  attribution_method,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM referrals
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND status = 'Signed Up'
GROUP BY attribution_method
ORDER BY count DESC;
```

Expected output (after some signups):
```
 attribution_method | count | percentage
--------------------+-------+------------
 cookie             |   3   |   60.00
 manual_entry       |   2   |   40.00
 url_parameter      |   0   |    0.00
```

### Check 2: Cookie Signature Validation

```sql
-- Check for any tampered cookie attempts
SELECT
  created_at,
  profile_id,
  error_message
FROM referral_attribution_audit
WHERE success = FALSE
  AND error_message LIKE '%signature invalid%'
ORDER BY created_at DESC
LIMIT 10;
```

Expected: 0 rows (no tampering attempts yet)

### Check 3: Performance Metrics

```sql
-- Check attribution resolution performance
EXPLAIN ANALYZE
SELECT
  referred_by_profile_id,
  referral_source
FROM profiles
WHERE email = 'test@example.com';

-- Expected: < 5ms execution time
```

---

## Rollback Plan (If Issues Occur)

### If Cookie Signing Breaks

```bash
# 1. Temporarily disable HMAC validation
vercel env rm REFERRAL_COOKIE_SECRET production

# 2. Redeploy
vercel --prod

# 3. System will fall back to unsigned cookies (legacy mode)
# 4. Debug issue, fix, re-add secret
```

### If Migration Fails

```sql
-- Rollback migration 091
BEGIN;

-- 1. Drop new columns
ALTER TABLE referrals DROP COLUMN IF EXISTS attribution_method;
ALTER TABLE profiles DROP COLUMN IF EXISTS referral_source;

-- 2. Drop new function
DROP FUNCTION IF EXISTS validate_referral_cookie_signature;

-- 3. Restore old handle_new_user() trigger
-- (Run migration 090 again)

-- 4. Drop audit table
DROP TABLE IF EXISTS referral_attribution_audit;

COMMIT;
```

### If Tests Fail

```bash
# 1. Check environment variables
vercel env ls

# 2. Verify REFERRAL_COOKIE_SECRET is set
vercel env pull .env.production
grep REFERRAL_COOKIE_SECRET .env.production

# 3. Re-run tests with debug logging
NEXT_PUBLIC_DEBUG_REFERRALS=true npm run test:e2e

# 4. Check Supabase logs for errors
# Dashboard → Logs → Postgres
```

---

## Success Criteria

Deployment is successful when ALL of these are true:

- ✅ Migration 091 ran without errors
- ✅ `REFERRAL_COOKIE_SECRET` set in Vercel production
- ✅ Code deployed to production (https://tutorwise.co.uk)
- ✅ Cookies are signed (contain `.` separator)
- ✅ Attribution works (new signups have `referral_source` set)
- ✅ E2E tests pass (11/11 tests green)
- ✅ No errors in production logs
- ✅ No tampered cookie attempts detected

---

## Monitoring (First 24 Hours)

### Metrics to Watch

1. **Attribution Rate**
   ```sql
   -- Check daily attribution rate
   SELECT
     DATE(created_at) AS date,
     COUNT(*) FILTER (WHERE referred_by_profile_id IS NOT NULL) AS attributed,
     COUNT(*) AS total,
     ROUND(COUNT(*) FILTER (WHERE referred_by_profile_id IS NOT NULL)::NUMERIC / COUNT(*) * 100, 2) AS rate_percent
   FROM profiles
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY DATE(created_at);
   ```

2. **Cookie Signature Success Rate**
   ```sql
   -- Check for validation failures
   SELECT
     COUNT(*) FILTER (WHERE success = TRUE) AS successful,
     COUNT(*) FILTER (WHERE success = FALSE) AS failed,
     ROUND(COUNT(*) FILTER (WHERE success = TRUE)::NUMERIC / COUNT(*) * 100, 2) AS success_rate
   FROM referral_attribution_audit
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Attribution Method Mix**
   ```sql
   -- Monitor which methods are used
   SELECT
     attribution_method,
     COUNT(*) AS signups
   FROM referrals
   WHERE created_at > NOW() - INTERVAL '24 hours'
     AND status = 'Signed Up'
   GROUP BY attribution_method;
   ```

### Alert Thresholds

- ⚠️ **WARNING**: Signature validation failure rate > 5%
- 🚨 **CRITICAL**: Signature validation failure rate > 20%
- ⚠️ **WARNING**: Attribution rate drops below historical average by 10%
- 🚨 **CRITICAL**: No attributions in last hour (system broken)

---

## Support Contacts

**Deployment Issues**:
- DevOps Team: [your-devops-email]
- On-call Engineer: [on-call-number]

**Database Issues**:
- Database Admin: [dba-email]
- Supabase Support: [supabase-support-link]

**Security Issues**:
- Security Team: [security-email]
- Incident Response: [incident-email]

---

## Next Steps After Deployment

1. **Week 1**: Monitor metrics daily
2. **Week 2**: Review attribution distribution
3. **Month 1**: Plan secret rotation (6 months from now)
4. **Quarter 1**: Implement QR code support (Phase 2)

---

**Deployment Completed**: [DATE/TIME]
**Deployed By**: [YOUR NAME]
**Status**: ✅ SUCCESS / ❌ ROLLED BACK
**Notes**: [Any issues encountered]

---

**Document Version**: 1.0
**Last Updated**: 2025-12-16
**Owner**: DevOps Team

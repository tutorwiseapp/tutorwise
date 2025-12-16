# Referral System - Environment Setup Guide

**Date**: 2025-12-16
**Status**: Required for Production Deployment

---

## Required Environment Variables

### 1. REFERRAL_COOKIE_SECRET

**Purpose**: Secret key for HMAC signing of referral cookies (tamper detection)

**Security Level**: 🔴 CRITICAL - Must be kept secret

**Required For**:
- Cookie signing in referral link handler
- Cookie validation in `handle_new_user()` trigger
- Prevents attribution fraud/tampering

**How to Generate**:

```bash
# Method 1: Using OpenSSL (recommended)
openssl rand -hex 32
# Output: 64-character hexadecimal string
# Example: 8f3a2b1c9d7e6f4a2b1c9d7e6f4a2b1c8f3a2b1c9d7e6f4a2b1c9d7e6f4a2b1c

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Configuration**:

```bash
# .env.local (local development)
REFERRAL_COOKIE_SECRET=your_64_character_hex_string_here

# Vercel (production)
vercel env add REFERRAL_COOKIE_SECRET production
# Paste the generated secret when prompted

# Supabase (for database trigger access)
# Add to project settings → Database → Secrets
```

**Important Notes**:
- ⚠️ **NEVER** commit this to Git
- ⚠️ Use different secrets for dev/staging/production
- ⚠️ Rotate every 6 months minimum
- ⚠️ If leaked, rotate immediately and invalidate all existing cookies

---

## Environment Files

### Development (.env.local)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Referral System (Migration 091)
REFERRAL_COOKIE_SECRET=your_dev_secret_here

# Optional: Debug logging
NEXT_PUBLIC_DEBUG_REFERRALS=true
```

### Staging (.env.staging)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_staging_service_role_key

# Referral System (DIFFERENT secret from production!)
REFERRAL_COOKIE_SECRET=your_staging_secret_here

# Optional: Debug logging (enabled in staging)
NEXT_PUBLIC_DEBUG_REFERRALS=true
```

### Production (.env.production)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Referral System (STRONG secret, rotated every 6 months)
REFERRAL_COOKIE_SECRET=your_production_secret_here

# Debug logging (DISABLED in production)
# NEXT_PUBLIC_DEBUG_REFERRALS=false
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Generate unique secrets for each environment
- [ ] Add `REFERRAL_COOKIE_SECRET` to Vercel environment variables
- [ ] Add `REFERRAL_COOKIE_SECRET` to Supabase secrets (for trigger access)
- [ ] Verify secrets are NOT committed to Git
- [ ] Document secret storage location (password manager/vault)

### Vercel Deployment

```bash
# Add production secret
vercel env add REFERRAL_COOKIE_SECRET production
# Paste: your_production_secret_here

# Add staging secret
vercel env add REFERRAL_COOKIE_SECRET preview
# Paste: your_staging_secret_here

# Verify secrets are set
vercel env ls
```

### Supabase Configuration

**Method 1: Dashboard (Recommended)**
1. Go to Supabase Dashboard → Project Settings → Database
2. Scroll to "Database Secrets" section
3. Add new secret:
   - Name: `referral_cookie_secret`
   - Value: `your_production_secret_here`
4. Click "Add Secret"

**Method 2: SQL (Advanced)**
```sql
-- Store secret in Vault (Supabase Pro required)
SELECT vault.create_secret('your_production_secret_here', 'referral_cookie_secret');

-- Access in trigger
-- v_cookie_secret := vault.read_secret('referral_cookie_secret');
```

---

## Verification Steps

### 1. Verify Secret is Set (Local)

```bash
# Check environment variable
echo $REFERRAL_COOKIE_SECRET

# Test in Node.js
node -e "console.log('Secret length:', process.env.REFERRAL_COOKIE_SECRET?.length)"
# Expected output: Secret length: 64
```

### 2. Verify Cookie Signing Works

```bash
# Run dev server
npm run dev

# Open browser DevTools → Network
# Click referral link: http://localhost:3000/a/kRz7Bq2
# Check Set-Cookie header in response

# Cookie value should contain a dot (signature separator)
tutorwise_referral_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890.8f3a2b1c9d7e6f4a...
                      └─────────────── UUID ──────────────┘ └──── Signature ────┘
```

### 3. Verify Attribution Works

```sql
-- Sign up a test user after clicking referral link

-- Check profiles table
SELECT
  id,
  email,
  referred_by_profile_id,
  referral_source
FROM profiles
WHERE email = 'test@example.com';

-- Expected output:
-- referral_source = 'cookie' (if used cookie)
-- referred_by_profile_id = <agent_uuid> (not NULL)

-- Check referrals table
SELECT
  agent_id,
  referred_profile_id,
  status,
  attribution_method
FROM referrals
WHERE referred_profile_id = <user_id>;

-- Expected output:
-- attribution_method = 'cookie'
-- status = 'Signed Up'
```

---

## Troubleshooting

### Issue: Cookie not signed (no dot in value)

**Symptom**:
```
Cookie: tutorwise_referral_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890
Expected: tutorwise_referral_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890.8f3a2b...
```

**Cause**: `REFERRAL_COOKIE_SECRET` not set or not loaded

**Fix**:
```bash
# 1. Check if secret is set
echo $REFERRAL_COOKIE_SECRET

# 2. If empty, add to .env.local
REFERRAL_COOKIE_SECRET=$(openssl rand -hex 32)

# 3. Restart dev server
npm run dev

# 4. Clear cookies and test again
```

### Issue: Cookie validation fails on signup

**Symptom**:
```
Error in logs: "Cookie signature invalid - tampering detected"
```

**Possible Causes**:
1. Secret mismatch between route handler and trigger
2. Secret changed after cookie was created
3. Cookie manually edited by user

**Fix**:
```bash
# 1. Verify same secret in all environments
# Route handler reads: process.env.REFERRAL_COOKIE_SECRET
# Trigger reads: new.raw_user_meta_data->>'referral_cookie_secret'

# 2. Ensure secret is passed to signup
const metadata = await buildSignupMetadata({
  full_name: 'Test User',
  // Secret must be included!
});

# 3. Clear all cookies and test with fresh referral link
```

### Issue: Attribution not working

**Symptom**:
```sql
-- profiles.referred_by_profile_id is NULL
-- referrals.attribution_method is NULL
```

**Debug Steps**:

```typescript
// 1. Check metadata passed to signup
console.log('Signup metadata:', {
  referral_cookie_id: metadata.referral_cookie_id,
  referral_cookie_secret: metadata.referral_cookie_secret ? '***SET***' : 'MISSING',
});

// 2. Check Supabase logs (Dashboard → Logs → Postgres)
// Look for NOTICE messages from trigger:
// "Attribution: Cookie (referral_id: ...)"
// or
// "WARNING: Cookie validation failed: ..."

// 3. Check referrals table
const { data } = await supabase
  .from('referrals')
  .select('*')
  .eq('agent_id', agentId)
  .order('created_at', { ascending: false });

console.log('Recent referrals:', data);
```

---

## Secret Rotation

### Why Rotate Secrets?

- **Security best practice**: Limit damage if secret is compromised
- **Compliance**: Some regulations require periodic rotation (e.g., PCI-DSS)
- **Proactive defense**: Invalidate any potentially leaked secrets

### Rotation Procedure

**Step 1: Generate New Secret**
```bash
NEW_SECRET=$(openssl rand -hex 32)
echo "New secret: $NEW_SECRET"
```

**Step 2: Graceful Migration (Support Both Secrets)**

Update referral link handler to sign with new secret but validate both:

```typescript
function createSignedCookieValue(referralId: string): string {
  const secret = process.env.REFERRAL_COOKIE_SECRET_NEW || process.env.REFERRAL_COOKIE_SECRET;
  // Sign with new secret
  const signature = crypto.createHmac('sha256', secret).update(referralId).digest('hex');
  return `${referralId}.${signature}`;
}
```

Update trigger to accept both secrets:

```sql
-- Try new secret first, fall back to old
BEGIN
  v_cookie_referral_id := validate_referral_cookie_signature(
    v_cookie_value,
    v_new_secret  -- Try new secret
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fall back to old secret (during migration)
    v_cookie_referral_id := validate_referral_cookie_signature(
      v_cookie_value,
      v_old_secret
    );
END;
```

**Step 3: Deploy New Secret**
```bash
# Add new secret to environment
vercel env add REFERRAL_COOKIE_SECRET_NEW production
# Paste: $NEW_SECRET

# Deploy application
vercel --prod
```

**Step 4: Wait for Cookie Expiry (30 days)**
```bash
# Monitor logs for old secret usage
# After 30 days, all cookies should be using new secret
```

**Step 5: Finalize Rotation**
```bash
# Promote new secret to primary
vercel env rm REFERRAL_COOKIE_SECRET production
vercel env add REFERRAL_COOKIE_SECRET production
# Paste: $NEW_SECRET

# Remove old secret
vercel env rm REFERRAL_COOKIE_SECRET_OLD production

# Deploy
vercel --prod
```

---

## Security Checklist

### Before Production

- [ ] Generate strong random secrets (32+ bytes)
- [ ] Store secrets in secure vault (1Password, AWS Secrets Manager, etc.)
- [ ] Never commit secrets to Git (.gitignore includes .env*)
- [ ] Use different secrets for dev/staging/production
- [ ] Document secret rotation schedule (every 6 months)
- [ ] Set up secret rotation reminders (calendar/alerts)
- [ ] Configure secret expiry monitoring
- [ ] Test cookie signing and validation end-to-end
- [ ] Verify HMAC validation rejects tampered cookies

### Production Monitoring

- [ ] Monitor for "signature invalid" errors (potential tampering)
- [ ] Track attribution method distribution (URL/Cookie/Manual)
- [ ] Alert on unusual attribution patterns
- [ ] Log secret rotation events
- [ ] Audit secret access (who/when)

---

## Reference

- **Migration**: `091_hierarchical_attribution_enhancement.sql`
- **Implementation Guide**: `HIERARCHICAL-ATTRIBUTION-IMPLEMENTATION.md`
- **Solution Design**: `referrals-solution-design-v2.md` (Section 13.1)
- **Patent Reference**: Section 2.2 (Cookie Security)

---

**Last Updated**: 2025-12-16
**Owner**: DevOps Team + Security Team
**Review Schedule**: Before each deployment + Every 6 months

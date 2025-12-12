# Referrals Feature - AI Prompt

**Version**: v4.3 (Delegation + Agent API)
**Date**: 2025-12-12
**Purpose**: Guide AI assistants when working on the referrals feature
**Patent**: UK Provisional Application Filed (Persistent Multi-Role Attribution)

---

## Feature Overview

The referrals feature is Tutorwise's **persistent identity-level attribution system** that enables lifetime commission tracking for agents who recruit tutors or clients. Built on a patent-protected architecture, the system survives device changes, browser clearing, and deferred signups through profile-level binding.

**Key Responsibilities**:
- Lifetime referral attribution (`profiles.referred_by_profile_id`)
- Multi-role support (tutors refer clients, clients refer tutors)
- Commission delegation to partner stores
- HMAC-signed cookie tracking (30-day TTL)
- Fraud prevention (self-referral blocking, velocity checks)
- Referral pipeline analytics (Clicked → Signed Up → Converted)
- QR code + link + manual code attribution

---

## System Context

### Core Architecture

The referrals system is built on these principles:

1. **Identity-First Attribution**: Referral stored on `profiles.referred_by_profile_id` (PERMANENT)
2. **Multi-Role Model**: Single user can be client, tutor, AND agent simultaneously
3. **Cookie Safety**: First-party HMAC-signed cookies (`TW_REF`), 30-day expiry, SameSite=Lax
4. **Delegation Override**: Tutors delegate commission to partner stores (overrides default agent)
5. **Lifetime Commission**: Agents earn on ALL future bookings from referred users (no expiry)
6. **Fraud Protection**: Self-referral blocking, velocity checks, payout holds

### Database Tables

**Primary**:
- `profiles` - Referral attribution fields (`referred_by_profile_id`, `referral_code`)

**Related**:
- `referral_attempts` - Click tracking, attribution pipeline
- `bookings` - Commission calculation source (`agent_profile_id`)
- `transactions` - Commission payment records
- `listings` - Delegation field (`delegate_commission_to_profile_id`)

**Key Fields**:
```sql
profiles {
  id UUID,
  referral_code VARCHAR(7) UNIQUE,           -- User's own code (for when they become agent)
  referred_by_profile_id UUID,               -- LIFETIME ATTRIBUTION (never changes)
  referral_code_used VARCHAR(7),             -- Code they used during signup
  referral_source TEXT,                      -- 'cookie', 'url', 'manual', 'direct'
  referred_at TIMESTAMPTZ                    -- When attribution happened
}

referral_attempts {
  id UUID,
  agent_profile_id UUID,                     -- Who shared the link
  referral_code TEXT,
  user_id UUID,                              -- NULL until attributed
  state TEXT,                                -- 'clicked', 'attributed', 'converted'
  source TEXT,                               -- 'link', 'qr', 'manual'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  attributed_at TIMESTAMPTZ
}
```

---

## Integration Points

### Critical Dependencies

1. **Auth** (CRITICAL - Profile Creation):
   - `handle_new_user()` trigger binds referral during signup
   - Reads TW_REF cookie, URL param, or manual input
   - Sets `profiles.referred_by_profile_id` PERMANENTLY
   - Attribution hierarchy: URL param > Cookie > Manual input

2. **Bookings**:
   - Copies `tutor.referred_by_profile_id` to `bookings.agent_profile_id`
   - First completed booking triggers pipeline: Signed Up → Converted
   - All bookings generate commission for agent

3. **Financials** (Commission Payments):
   - `process_booking_payment()` RPC calculates commission (10% of tutor earnings)
   - Creates transaction record for agent
   - Applies delegation rules if `listing.delegate_commission_to_profile_id` set
   - 14-day payout hold for fraud protection

4. **Listings** (Commission Delegation):
   - Tutors set `delegate_commission_to_profile_id` to partner store
   - Overrides default agent commission recipient
   - Enables store partnerships

5. **Payments** (Stripe Connect):
   - Commission paid via Stripe transfers
   - Agents must complete Stripe Connect onboarding

---

## Key Functions & Mechanisms

### 1. Referral Code Generation

**Purpose**: Generate unique 7-character alphanumeric code for each user

**Location**: `apps/api/handle_new_user.sql`

```sql
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing 0/O, 1/I
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  -- Check uniqueness (recursive retry if collision)
  IF EXISTS (SELECT 1 FROM profiles WHERE referral_code = result) THEN
    RETURN generate_referral_code();
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### 2. Cookie Setter (/a/[referral_code])

**Purpose**: Set HMAC-signed cookie when user clicks referral link

**Location**: `apps/web/src/app/a/[referral_code]/route.ts`

**Logic**:
1. Validate referral code exists
2. Create cookie payload: `{ agent, dest, ts, exp }`
3. Sign with HMAC-SHA256
4. Set TW_REF cookie (30-day expiry, httpOnly, SameSite=Lax)
5. Log referral attempt (state='clicked')
6. Redirect to destination

**Cookie Format**:
```typescript
interface TW_REF_Cookie {
  agent: string;      // Referral code
  dest: string;       // Original destination URL
  ts: number;         // Timestamp
  exp: number;        // Expiry (30 days)
  sig: string;        // HMAC signature
}
```

### 3. Attribution Resolution (handle_new_user)

**Purpose**: Bind referral to new user during signup

**Location**: `apps/api/handle_new_user.sql` (Supabase Auth trigger)

**Logic**:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_profile_id UUID;
  v_referral_code_used TEXT;
  v_referral_source TEXT := 'direct';
BEGIN
  -- ATTRIBUTION HIERARCHY (priority order)

  -- 1. URL param (?a={code} or signup form param)
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    v_referral_code_used := NEW.raw_user_meta_data->>'referral_code';
    v_referral_source := 'url';

  -- 2. Cookie (TW_REF - parsed from request context)
  ELSIF NEW.raw_user_meta_data->>'cookie_referral_code' IS NOT NULL THEN
    v_referral_code_used := NEW.raw_user_meta_data->>'cookie_referral_code';
    v_referral_source := 'cookie';

  -- 3. Manual input (signup form "Referral code" field)
  ELSIF NEW.raw_user_meta_data->>'manual_referral_code' IS NOT NULL THEN
    v_referral_code_used := NEW.raw_user_meta_data->>'manual_referral_code';
    v_referral_source := 'manual';
  END IF;

  -- Lookup agent by code (with fraud checks)
  IF v_referral_code_used IS NOT NULL THEN
    SELECT id INTO v_agent_profile_id
    FROM profiles
    WHERE referral_code = v_referral_code_used
      AND id != NEW.id          -- Prevent self-referral
      AND email != NEW.email;   -- Extra check
  END IF;

  -- PERMANENT BINDING
  INSERT INTO profiles (
    id,
    email,
    referral_code,              -- Generate user's own code
    referred_by_profile_id,     -- ← LIFETIME ATTRIBUTION
    referral_code_used,
    referral_source,
    referred_at,
    roles,
    active_role
  ) VALUES (
    NEW.id,
    NEW.email,
    generate_referral_code(),
    v_agent_profile_id,         -- ← NULL if no referrer
    v_referral_code_used,
    v_referral_source,
    CASE WHEN v_agent_profile_id IS NOT NULL THEN NOW() ELSE NULL END,
    ARRAY['client']::TEXT[],
    'client'
  );

  -- Update referral attempt
  IF v_agent_profile_id IS NOT NULL THEN
    UPDATE referral_attempts
    SET state = 'attributed', attributed_at = NOW(), user_id = NEW.id
    WHERE agent_profile_id = v_agent_profile_id
      AND state = 'clicked'
      AND user_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Commission Calculation (process_booking_payment)

**Purpose**: Calculate and create agent commission transaction

**Location**: `apps/api/migrations/060_update_payment_webhook_rpc_v4_9.sql`

**Logic** (inside process_booking_payment RPC):
```sql
-- 1. Fetch booking with agent attribution
SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

-- 2. Get tutor's referrer
SELECT referred_by_profile_id INTO v_agent_profile_id
FROM profiles WHERE id = v_booking.tutor_id;

-- 3. Check for delegation override
IF v_booking.listing_id IS NOT NULL THEN
  SELECT delegate_commission_to_profile_id INTO v_delegate_profile_id
  FROM listings WHERE id = v_booking.listing_id;

  -- If listing has delegate AND agent is listing owner's referrer, override
  IF v_delegate_profile_id IS NOT NULL AND v_agent_profile_id = v_booking.tutor_id THEN
    v_agent_profile_id := v_delegate_profile_id;
  END IF;
END IF;

-- 4. Calculate commission (10% of tutor's 80% share = 8% of total)
v_tutor_share := p_payment_amount * 0.80;  -- Tutor gets 80%
v_agent_commission := v_tutor_share * 0.10; -- Agent gets 10% of tutor share

IF v_agent_profile_id IS NOT NULL THEN
  -- 5. Create commission transaction
  INSERT INTO transactions (
    profile_id,
    booking_id,
    type,
    description,
    status,
    amount,
    stripe_payment_intent_id
  ) VALUES (
    v_agent_profile_id,
    p_booking_id,
    'Commission',
    'Referral commission for booking ' || p_booking_id::TEXT,
    'clearing',  -- 14-day hold before 'available'
    v_agent_commission,
    p_payment_intent_id
  );

  -- 6. Update referral pipeline (if first conversion)
  UPDATE referral_attempts
  SET state = 'converted'
  WHERE agent_profile_id = v_agent_profile_id
    AND user_id = v_booking.tutor_id
    AND state = 'attributed';
END IF;
```

---

## Common Tasks & Patterns

### Task 1: Generate Referral Link with QR Code

**Example**: Agent wants to share referral link

```typescript
// 1. Get user's referral code
const { data: profile } = await supabase
  .from('profiles')
  .select('referral_code')
  .eq('id', userId)
  .single();

// 2. Generate link
const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
const referralLink = `${baseUrl}/a/${profile.referral_code}`;

// 3. Optional: Add destination redirect
const linkWithDestination = `${referralLink}?redirect=/listings/123`;

// 4. Generate QR code
const qrCodeUrl = `/api/referrals/qr-code?code=${profile.referral_code}&format=svg`;
```

### Task 2: Track Referral Click

**Requirement**: User clicks referral link, set cookie and log attempt

```typescript
// app/a/[referral_code]/route.ts
export async function GET(request, { params }) {
  const { referral_code } = params;

  // 1. Validate code
  const { data: agent } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referral_code)
    .single();

  if (!agent) {
    return NextResponse.redirect('/');
  }

  // 2. Create HMAC-signed cookie
  const cookieValue = {
    agent: referral_code,
    ts: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  const signature = createHmac('sha256', process.env.REFERRAL_COOKIE_SECRET)
    .update(JSON.stringify(cookieValue))
    .digest('hex');

  // 3. Log referral attempt
  await supabase.from('referral_attempts').insert({
    agent_profile_id: agent.id,
    referral_code,
    source: 'link',
    state: 'clicked',
    ip_address: request.ip,
    user_agent: request.headers.get('user-agent')
  });

  // 4. Set cookie and redirect
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set('TW_REF', `${Buffer.from(JSON.stringify(cookieValue)).toString('base64')}.${signature}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60
  });

  return response;
}
```

### Task 3: Commission Delegation to Store

**Requirement**: Tutor delegates commission to partner store for client acquisition

```typescript
// Update listing to delegate
await supabase
  .from('listings')
  .update({
    delegate_commission_to_profile_id: storeProfileId
  })
  .eq('id', listingId);

// When booking processed:
// 1. Client books tutor's listing
// 2. Tutor has referred_by_profile_id = agentA
// 3. Listing has delegate_commission_to_profile_id = storeB
// 4. Commission goes to storeB (delegate) instead of agentA
```

### Task 4: Fraud Prevention - Velocity Check

**Requirement**: Prevent mass fake signups from same IP

```sql
-- Check signup rate from IP
CREATE OR REPLACE FUNCTION check_referral_velocity(
  p_ip_address TEXT,
  p_time_window_minutes INTEGER DEFAULT 60,
  p_max_attempts INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
  v_attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_attempt_count
  FROM referral_attempts
  WHERE ip_address = p_ip_address
    AND created_at > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;

  RETURN v_attempt_count < p_max_attempts;
END;
$$ LANGUAGE plpgsql;

-- Use in cookie setter
IF NOT check_referral_velocity(request.ip) THEN
  RAISE EXCEPTION 'Too many referral attempts from this IP';
END IF;
```

### Task 5: Referral Analytics Dashboard

**Requirement**: Agent views referral performance

```typescript
// GET /api/referrals
const { data: stats } = await supabase.rpc('get_referral_stats', {
  p_agent_profile_id: userId
});

// Returns:
// {
//   clicks: 127,
//   signups: 43,
//   conversions: 12,
//   conversion_rate: 9.4
// }

// Get referred users
const { data: referredUsers } = await supabase
  .from('profiles')
  .select('id, full_name, referred_at, roles')
  .eq('referred_by_profile_id', userId);

// Get commission earnings
const { data: commissions } = await supabase
  .from('transactions')
  .select('amount, status, created_at')
  .eq('profile_id', userId)
  .eq('type', 'Commission');
```

---

## Testing Checklist

When modifying the referrals feature, test:

- [ ] Referral link generation (correct code, unique)
- [ ] Cookie setting (HMAC signature, 30-day expiry)
- [ ] Attribution resolution (URL > Cookie > Manual priority)
- [ ] Self-referral prevention (user cannot refer themselves)
- [ ] Commission calculation (10% of tutor earnings)
- [ ] Delegation override (store receives commission)
- [ ] QR code generation (valid SVG/PNG)
- [ ] Referral pipeline tracking (Clicked → Attributed → Converted)
- [ ] Fraud checks (velocity limits, duplicate detection)
- [ ] Lifetime attribution (referred_by_profile_id never changes)

---

## Security Considerations

1. **HMAC Signature**: All cookies signed with 32-char secret, prevents tampering
2. **Self-Referral Blocking**: `WHERE id != NEW.id AND email != NEW.email`
3. **Velocity Checks**: Max 10 attempts per IP per hour
4. **Payout Holds**: 14-day hold on commissions (refund protection)
5. **Cookie Safety**: httpOnly, secure (HTTPS), SameSite=Lax
6. **KYC Thresholds**: Require identity verification above £1,000 earnings

---

## Performance Optimization

1. **Indexes**:
   - `idx_profiles_referral_code` - Fast code lookup
   - `idx_profiles_referred_by` - Commission queries
   - `idx_referral_attempts_agent` - Stats aggregation

2. **Caching**:
   - Cache referral stats (5-minute stale time)
   - QR code generation cached (immutable)

---

## Migration Guidelines

When creating new migrations for referrals:

1. **Never Modify `referred_by_profile_id`**: This field is immutable for lifetime attribution
2. **Add Fraud Checks**: Any new attribution method must include self-referral prevention
3. **Test Cookie Parsing**: Ensure HMAC verification works across environments
4. **Commission Rules**: Document any changes to 80/10/10 split model
5. **Update Delegation Logic**: If adding new override rules, update process_booking_payment()

---

## Related Documentation

- [Referrals Solution Design](./referrals-solution-design.md) - Complete architecture (58KB)
- [Referrals README](./README.md) - Quick reference
- [Auth Solution Design](../auth/auth-solution-design.md) - handle_new_user trigger
- [Financials Solution Design](../financials/financials-solution-design.md) - Commission payments
- [Bookings Solution Design](../bookings/bookings-solution-design.md) - Agent attribution

---

**Last Updated**: 2025-12-12
**Maintainer**: Growth Team
**Patent Status**: UK Provisional Application Filed
**For Questions**: See referrals-solution-design.md or ask team lead

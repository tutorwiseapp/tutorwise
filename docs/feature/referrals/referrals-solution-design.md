# Referrals Solution Design

**Version**: v4.3 (Delegation + Agent API)
**Date**: 2025-12-12
**Status**: Active (Specification Complete)
**Owner**: Growth Team
**Patent**: UK Provisional Application Filed (Persistent Multi-Role Attribution)

---

## Executive Summary

This document details the comprehensive referral attribution and commission system for Tutorwise. The system implements **persistent identity-level attribution** that survives device changes, browser clearing, and deferred signups. It supports **dual-agent acquisition** (supply-side tutor referrals and demand-side client referrals), **multi-role cross-referrals** (tutors can refer clients, clients can refer tutors), **hybrid offline-online tracking** (QR codes, links, cookies, manual codes), and **lifetime commission attribution**.

The referral engine integrates with **13 major platform features** and serves as the foundation for viral growth, marketplace network effects, and commission-based partner incentives.

### Novel Architecture (Patent-Protected)

1. **Persistent Attribution**: Referral binding at profile identity level (not cookie/session level)
2. **Multi-Role Support**: Single user can be client, tutor, AND agent simultaneously
3. **Dual-Agent Model**: Supply-side agents (recruit tutors) and demand-side agents (recruit clients)
4. **Delegation Override**: Tutors can delegate commission to partner stores for client acquisition
5. **Hybrid Capture**: QR codes → cookies → manual codes → device fingerprints (fallback chain)
6. **Lifetime Revenue**: Referrers earn on ALL future transactions (configurable limits)

---

## Key Design Principles

1. **Identity-First Attribution**: Referral stored on `profiles.referred_by_profile_id` (permanent)
2. **Cookie Safety**: First-party cookies with HMAC signature, 30-day TTL, SameSite=Lax
3. **Fraud Protection**: Velocity checks, self-referral blocking, payout holds, KYC thresholds
4. **GDPR Compliance**: Minimal data, explicit consent banners, user rights (export/delete)
5. **Financial Safety**: Platform controls money flow, commissions paid from tutor share
6. **Agent API**: Programmatic referral creation for AI agents and automation
7. **Store Partnerships**: Physical locations earn commission via delegation mechanism
8. **Single Payee Rule**: Only ONE referrer receives commission per booking (deterministic)

---

## System Architecture

### High-Level Referral Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    REFERRAL ATTRIBUTION PIPELINE                  │
└──────────────────────────────────────────────────────────────────┘

┌────────────────┐
│ Agent Creates  │
│ Referral Link  │
│ (or QR/API)    │
└────────┬───────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ Referral Generation                             │
│ - Generate 7-char alphanumeric code             │
│ - Create link: /a/{agent_code}?redirect=/path   │
│ - Generate QR code (SVG/PNG)                    │
│ - Store in referrals table with metadata        │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ User Clicks Link / Scans QR                     │
│ → /a/[referral_id]/route.ts                     │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Cookie Setting + Database Tracking                          │
│ 1. Set TW_REF cookie (HMAC-signed, 30-day)                 │
│ 2. Create referral_attempts record (pending)               │
│ 3. Log: IP, user-agent, timestamp, source                  │
│ 4. Redirect to destination (/listings/123)                 │
└────────┬────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ User Browses Platform                           │
│ (Cookie persists 30 days)                       │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│ User Signs Up                                               │
│ → apps/api/auth/callback or signup endpoint                │
└────────┬────────────────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────────────┐
│ Supabase Auth Trigger: handle_new_user()                        │
│                                                                  │
│ ATTRIBUTION RESOLUTION (Hierarchical):                          │
│ 1. Read TW_REF cookie → verify HMAC → extract agent_code       │
│ 2. Check URL param ?a={code}                                   │
│ 3. Check manual code input from signup form                    │
│ 4. Lookup agent_profile_id from code                           │
│ 5. PERMANENT BINDING:                                          │
│    profiles.referred_by_profile_id = agent_profile_id          │
│    profiles.referral_code_used = agent_code                    │
│    profiles.referral_source = 'cookie' | 'url' | 'manual'      │
│    profiles.referred_at = NOW()                                │
│ 6. Update referral_attempts → state = 'attributed'             │
└────────┬─────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ User Completes Onboarding                       │
│ (Pipeline: Referred → Signed Up)                │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ User Makes First Booking (as Tutor or Client)                  │
│ → bookings table created                                        │
└────────┬────────────────────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────────────┐
│ Payment Processed: handle_successful_payment()                  │
│                                                                  │
│ COMMISSION CALCULATION:                                         │
│ 1. Check bookings.tutor_id → profiles.referred_by_profile_id   │
│ 2. Apply delegation rules:                                     │
│    IF listing.delegate_commission_to_profile_id IS NOT NULL    │
│       AND referrer = listing_owner                             │
│       → Pay delegate (store) instead                           │
│ 3. Calculate commission (10% of tutor earnings)                │
│ 4. Create transactions record:                                 │
│    - type: 'referral_commission'                               │
│    - from_profile_id: tutor_id                                 │
│    - to_profile_id: final_commission_recipient                 │
│    - amount: £X.XX                                             │
│    - status: 'pending' (14-day hold)                           │
│ 5. Update referral pipeline: Signed Up → Converted             │
└────────┬─────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ Payout Hold Window (14 days)                   │
│ → Protect against refunds/chargebacks          │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ Commission Released                             │
│ transactions.status → 'available'               │
└────────┬────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ Stripe Connect Payout                           │
│ → Agent/Store receives funds                    │
└─────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│               LIFETIME ATTRIBUTION (All Future Bookings)        │
└────────────────────────────────────────────────────────────────┘

Every subsequent booking by referred tutor:
  → Check profiles.referred_by_profile_id
  → Calculate commission
  → Pay agent (unless delegation overrides)
  → NO EXPIRY (configurable via business rules)
```

---

## System Integrations

The referrals system integrates with **13 major platform features**:

### 1. Auth Integration (CRITICAL - Profile Creation)

**Purpose**: Permanent referral binding at signup

**Key Files**:
- `apps/api/handle_new_user.sql` - Database trigger
- `apps/web/src/app/a/[referral_id]/route.ts` - Cookie setter
- `apps/web/src/app/signup/page.tsx` - Manual code input

**Mechanism**:

```sql
-- handle_new_user() trigger (executed on auth.users INSERT)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_slug TEXT;
  v_agent_profile_id UUID;
  v_referral_code_used TEXT;
BEGIN
  -- Generate user's own referral code (for when THEY become agent)
  v_referral_code := generate_referral_code(); -- 7 characters
  v_slug := generate_slug(NEW.raw_user_meta_data->>'full_name');

  -- ATTRIBUTION RESOLUTION
  -- Priority: 1) Cookie, 2) URL param, 3) Manual input
  v_referral_code_used := get_referral_code_from_request(); -- helper function

  IF v_referral_code_used IS NOT NULL THEN
    -- Lookup agent by code
    SELECT id INTO v_agent_profile_id
    FROM profiles
    WHERE referral_code = v_referral_code_used
      AND id != NEW.id; -- Prevent self-referral
  END IF;

  -- PERMANENT BINDING
  INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    referral_code,
    slug,
    referred_by_profile_id,  -- ← LIFETIME ATTRIBUTION
    referral_code_used,
    referral_source,
    referred_at,
    roles,
    active_role
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    v_referral_code,
    v_slug,
    v_agent_profile_id,      -- ← NULL if no referrer
    v_referral_code_used,
    COALESCE(NEW.raw_user_meta_data->>'referral_source', 'direct'),
    CASE WHEN v_agent_profile_id IS NOT NULL THEN NOW() ELSE NULL END,
    ARRAY['client']::TEXT[],
    'client'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Integration Points**:
- Signup forms pass `?a={code}` or manual input
- Cookie `TW_REF` read during profile creation
- `profiles.referred_by_profile_id` NEVER changes (lifetime)

**Dependencies**:
- `generate_referral_code()` - 7-char alphanumeric generator
- `generate_slug()` - SEO-friendly identifier
- Cookie parser for `TW_REF`

---

### 2. Bookings Integration (First Conversion Tracking)

**Purpose**: Detect when referred user generates first revenue

**Key Files**:
- `apps/web/src/app/api/bookings/route.ts`
- `bookings` table schema

**Mechanism**:

```typescript
// Booking creation copies referrer for analytics
const booking = await supabase.from('bookings').insert({
  client_id: clientProfile.id,
  tutor_id: listing.profile_id,
  agent_profile_id: tutorProfile.referred_by_profile_id, // ← Copy from profile
  // ... other fields
});

// Check if this is first conversion
const { data: previousBookings } = await supabase
  .from('bookings')
  .select('id')
  .eq('tutor_id', listing.profile_id)
  .eq('status', 'completed');

if (!previousBookings || previousBookings.length === 0) {
  // Update referral pipeline: Signed Up → Converted
  await updateReferralPipeline(
    tutorProfile.referred_by_profile_id,
    tutorProfile.id,
    'converted'
  );
}
```

**Data Flow**:
- Bookings inherit `agent_profile_id` from tutor's profile
- First completed booking triggers pipeline update
- All bookings tracked for commission calculation

**Analytics**:
- Conversion rate (signups → first booking)
- Time-to-convert
- Conversion by source (QR vs link vs manual)

---

### 3. Payments Integration (CRITICAL - Commission Distribution)

**Purpose**: Calculate and distribute referral commissions

**Key Files**:
- `apps/api/payments/handle_successful_payment.sql`
- `transactions` table

**Mechanism**:

```sql
-- handle_successful_payment(booking_id UUID, payment_amount DECIMAL)
CREATE OR REPLACE FUNCTION handle_successful_payment(
  p_booking_id UUID,
  p_amount DECIMAL
) RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_tutor_profile RECORD;
  v_listing RECORD;
  v_final_commission_recipient_id UUID;
  v_commission_amount DECIMAL;
  v_platform_fee DECIMAL := p_amount * 0.10; -- 10%
  v_remaining_amount DECIMAL := p_amount - v_platform_fee;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  -- Get tutor's referrer
  SELECT * INTO v_tutor_profile FROM profiles WHERE id = v_booking.tutor_id;

  -- Get listing delegation settings
  SELECT * INTO v_listing FROM listings WHERE id = v_booking.listing_id;

  -- DELEGATION LOGIC (v4.3)
  -- Default: Pay tutor's original referrer
  v_final_commission_recipient_id := v_tutor_profile.referred_by_profile_id;

  -- Override: If tutor is the direct referrer (QR code) AND delegation is set
  IF v_listing.delegate_commission_to_profile_id IS NOT NULL
     AND v_booking.agent_profile_id = v_booking.tutor_id THEN
    v_final_commission_recipient_id := v_listing.delegate_commission_to_profile_id;
  END IF;

  -- Calculate commission (10% of tutor earnings, not platform fee)
  IF v_final_commission_recipient_id IS NOT NULL THEN
    v_commission_amount := v_remaining_amount * 0.10; -- 10% of £90 = £9
    v_remaining_amount := v_remaining_amount - v_commission_amount;

    -- Create commission transaction (PENDING, 14-day hold)
    INSERT INTO transactions (
      booking_id,
      from_profile_id,
      to_profile_id,
      amount,
      type,
      status,
      release_date,
      metadata
    ) VALUES (
      p_booking_id,
      v_booking.tutor_id,
      v_final_commission_recipient_id,
      v_commission_amount,
      'referral_commission',
      'pending',
      NOW() + INTERVAL '14 days',
      jsonb_build_object(
        'commission_rate', 0.10,
        'delegation_applied', v_listing.delegate_commission_to_profile_id IS NOT NULL,
        'original_referrer', v_tutor_profile.referred_by_profile_id
      )
    );
  END IF;

  -- Pay tutor (remaining amount)
  INSERT INTO transactions (
    booking_id,
    to_profile_id,
    amount,
    type,
    status,
    release_date
  ) VALUES (
    p_booking_id,
    v_booking.tutor_id,
    v_remaining_amount,
    'tutor_payout',
    'pending',
    NOW() + INTERVAL '14 days'
  );

  RETURN jsonb_build_object(
    'platform_fee', v_platform_fee,
    'commission', v_commission_amount,
    'tutor_net', v_remaining_amount,
    'commission_recipient', v_final_commission_recipient_id
  );
END;
$$ LANGUAGE plpgsql;
```

**Payment Splits** (£100 booking example):

**Scenario A: No Referrer**
- Platform: £10 (10%)
- Tutor: £90 (90%)

**Scenario B: Agent Referred Tutor**
- Platform: £10 (10%)
- Agent: £9 (10% of tutor share)
- Tutor: £81 (90%)

**Scenario C: Tutor QR + Store Delegation**
- Platform: £10 (10%)
- Store: £9 (delegation override)
- Tutor: £81 (90%)

**Safety Rules**:
- Commission NEVER paid from platform fee (always from tutor share)
- Only ONE commission recipient per booking (deterministic)
- 14-day hold period before payout
- Fraud checks before release

---

### 4. Listings Integration (Delegation Mechanism)

**Purpose**: Enable tutors to delegate commission to partner stores

**Key Files**:
- `listings` table schema
- `apps/web/src/app/listings/create/page.tsx`

**New Column** (v4.3):

```sql
ALTER TABLE listings
ADD COLUMN delegate_commission_to_profile_id UUID REFERENCES profiles(id);
```

**UI Component**:

```typescript
// Create Listing Form - Referral Partner (Optional)
<FormSection title="Referral Partner (Optional)">
  <p>If you're promoting this listing through a partner (store, agent),
     they will receive the referral commission instead of your original referrer.</p>

  <Select
    value={delegateProfileId}
    onChange={setDelegateProfileId}
  >
    <option value="">No delegation (default)</option>
    {connectedAgents.map(agent => (
      <option key={agent.id} value={agent.id}>
        {agent.first_name} {agent.last_name} - {agent.business_name}
      </option>
    ))}
  </Select>
</FormSection>
```

**Use Cases**:
- **Coffee Shop Partnership**: Tutor prints flyers, shop displays them, shop earns commission
- **School Partnership**: Tutor runs workshops, school gets commission on bookings
- **B2B Agent**: Agency promotes tutor, agency earns commission

**Business Logic**:
- Delegation ONLY applies when tutor is the direct referrer (QR/link)
- Does NOT override third-party referrers (e.g., if client clicked Agent A's link)
- Per-listing setting (tutor can delegate some listings, not others)

---

### 5. Dashboard Integration (Analytics & Reporting)

**Purpose**: Show agents their referral performance and earnings

**Key Files**:
- `apps/web/src/app/hub/financials/page.tsx`
- `apps/web/src/app/hub/referrals/page.tsx` (new)

**Metrics Displayed**:

```typescript
interface ReferralDashboard {
  // Pipeline Tracking
  pipeline: {
    clicked: number;        // Referral link clicks
    signed_up: number;      // Users who created accounts
    converted: number;      // Users who made first booking
    expired: number;        // Cookie expired without conversion
  };

  // Conversion Rates
  click_to_signup: number;      // 10%
  signup_to_booking: number;    // 30%
  click_to_booking: number;     // 3%

  // Earnings
  earnings: {
    pending: number;        // Commission in hold period
    available: number;      // Ready for payout
    paid_out: number;       // Historical total
  };

  // Top Performers
  top_referrals: {
    profile_id: string;
    name: string;
    total_bookings: number;
    total_commission: number;
  }[];

  // Sources
  by_source: {
    qr_code: { signups: number, conversions: number };
    direct_link: { signups: number, conversions: number };
    manual_code: { signups: number, conversions: number };
  };
}
```

**Queries**:

```sql
-- Agent's referral pipeline
SELECT
  COUNT(*) FILTER (WHERE referred_at IS NOT NULL) AS signed_up,
  COUNT(*) FILTER (WHERE first_booking_at IS NOT NULL) AS converted
FROM profiles
WHERE referred_by_profile_id = :agent_id;

-- Agent's commission earnings
SELECT
  SUM(amount) FILTER (WHERE status = 'pending') AS pending,
  SUM(amount) FILTER (WHERE status = 'available') AS available,
  SUM(amount) FILTER (WHERE status = 'paid_out') AS paid_out
FROM transactions
WHERE to_profile_id = :agent_id
  AND type = 'referral_commission';
```

---

### 6. Network Integration (Connection Validation)

**Purpose**: Ensure agents can only refer users they're connected to (optional safety layer)

**Key Files**:
- `profile_graph` table

**Validation** (optional, not enforced by default):

```typescript
// Check if agent can refer this user
const canRefer = await supabase
  .from('profile_graph')
  .select('id')
  .eq('source_profile_id', agentId)
  .eq('target_profile_id', userId)
  .eq('relationship_type', 'REFERRAL')
  .maybeSingle();

if (!canRefer) {
  throw new Error('No referral permission');
}
```

**Current Implementation**: Open referral (anyone can share link)
**Future Enhancement**: Restrict to connected users only

---

### 7. Onboarding Integration (Referral Code Collection)

**Purpose**: Capture manual referral codes during signup

**Key Files**:
- `apps/web/src/app/onboarding/page.tsx`

**UI Component**:

```typescript
// Step 1: Account Details
<FormSection>
  <Input
    label="Referral Code (Optional)"
    placeholder="e.g., kRz7Bq"
    value={referralCode}
    onChange={setReferralCode}
    hint="Have a referral code from a friend or partner?"
  />
</FormSection>
```

**Fallback Logic**:
1. Cookie `TW_REF` (highest priority)
2. URL param `?a={code}`
3. Manual input (shown above)
4. No referrer (organic signup)

---

### 8. Agent API Integration (Programmatic Referrals)

**Purpose**: Enable AI agents and automation to create referrals

**Endpoint**: `POST /api/agent/referrals`

**Authentication**:

```typescript
// JWT with agent claims
const agentJWT = sign(
  {
    agent_id: 'AG_12345',
    exp: Date.now() + 86400000, // 24 hours
    allowed_actions: ['create_referral', 'view_analytics']
  },
  AGENT_SECRET
);
```

**Request**:

```typescript
POST /api/agent/referrals
Authorization: Bearer <AGENT_JWT>
X-Agent-Id: AG_12345
X-Signature: HMAC_SHA256(payload, AGENT_SECRET)

{
  "agent_id": "AG_12345",
  "destination": "https://tutorwise.com/listings/1234",
  "campaign_id": "camp_oct_25",
  "metadata": {
    "source": "shop-kiosk",
    "store_id": "STORE_987",
    "qr_id": "QR_009"
  },
  "ttl_days": 30
}
```

**Response**:

```typescript
{
  "status": "ok",
  "referral_link": "https://tutorwise.com/a/AG_12345?redirect=/listings/1234&c=camp_oct_25",
  "short_code": "kRz7Bq",
  "qr_svg": "<svg>...</svg>",
  "expires_at": "2025-02-11T12:00:00Z"
}
```

**Backend Logic**:

```typescript
// apps/web/src/app/api/agent/referrals/route.ts
export async function POST(req: NextRequest) {
  // 1. Verify JWT + HMAC signature
  const agentJWT = req.headers.get('Authorization')?.replace('Bearer ', '');
  const payload = await req.json();
  const signature = req.headers.get('X-Signature');

  verifyAgentAuth(agentJWT, payload, signature);

  // 2. Rate limit (100 referrals per agent per day)
  await checkRateLimit(payload.agent_id);

  // 3. Create referral record
  const { data: referral } = await supabase
    .from('referrals')
    .insert({
      agent_profile_id: payload.agent_id,
      short_code: generateReferralCode(),
      destination: payload.destination,
      type: 'agent_api',
      campaign_id: payload.campaign_id,
      metadata: payload.metadata,
      expires_at: new Date(Date.now() + payload.ttl_days * 86400000)
    })
    .select()
    .single();

  // 4. Generate QR code
  const qrSvg = await generateQR(referral.link);

  return NextResponse.json({
    status: 'ok',
    referral_link: referral.link,
    short_code: referral.short_code,
    qr_svg: qrSvg,
    expires_at: referral.expires_at
  });
}
```

**Security**:
- JWT expiry (24 hours)
- HMAC signature verification
- Rate limiting (100/day per agent)
- Audit log for all API-generated referrals

---

### 9. QR Code Integration (Offline Attribution)

**Purpose**: Bridge offline marketing (flyers, posters) to online attribution

**Key Files**:
- `apps/web/src/lib/qr.ts`
- `apps/web/src/app/a/[referral_id]/route.ts`

**Generation**:

```typescript
import QRCode from 'qrcode';

export async function generateReferralQR(
  agentCode: string,
  destination: string = '/listings'
): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_URL}/a/${agentCode}?redirect=${destination}`;

  const qrSvg = await QRCode.toString(url, {
    type: 'svg',
    width: 300,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  return qrSvg;
}
```

**Scanning Flow**:

```
1. User scans QR code with phone camera
   → Opens https://tutorwise.com/a/kRz7Bq?redirect=/listings/123

2. Route handler processes:
   → /app/a/[referral_id]/route.ts

3. Set cookie + redirect:
   → TW_REF = {agent: kRz7Bq, ts: 169XXX, exp: 30d, sig: HMAC}
   → Redirect to /listings/123

4. User browses, signs up within 30 days
   → Cookie read by handle_new_user()
   → profiles.referred_by_profile_id set permanently
```

**Use Cases**:
- Coffee shop window posters
- University notice boards
- Event flyers
- Business cards
- Store counters

---

### 10. Cookie Management Integration

**Purpose**: Secure, GDPR-compliant first-party cookie for attribution

**Cookie Schema**:

```typescript
interface TW_REF_Cookie {
  agent: string;      // 7-char referral code
  dest: string;       // Original destination URL
  ts: number;         // Timestamp (epoch)
  exp: number;        // Expiry (seconds from ts)
  sig: string;        // HMAC-SHA256 signature
}
```

**Cookie Setting** (`/app/a/[referral_id]/route.ts`):

```typescript
import { createHmac } from 'crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: { referral_id: string } }
) {
  const { referral_id } = params;
  const redirect = req.nextUrl.searchParams.get('redirect') || '/';

  // Verify referral code exists
  const { data: agent } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referral_id)
    .single();

  if (!agent) {
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  // Create cookie payload
  const ts = Math.floor(Date.now() / 1000);
  const exp = 30 * 24 * 60 * 60; // 30 days
  const payload = { agent: referral_id, dest: redirect, ts, exp };

  // Sign with HMAC
  const hmac = createHmac('sha256', process.env.REF_COOKIE_SECRET!);
  hmac.update(JSON.stringify(payload));
  const sig = hmac.digest('hex');

  const cookieValue = Buffer.from(
    JSON.stringify({ ...payload, sig })
  ).toString('base64');

  // Set cookie (first-party, secure, SameSite=Lax)
  const response = NextResponse.redirect(new URL(redirect, req.url));
  response.cookies.set('TW_REF', cookieValue, {
    httpOnly: false,       // Allow client-side reads
    secure: true,
    sameSite: 'lax',       // CSRF protection
    domain: '.tutorwise.com',
    maxAge: exp,
    path: '/'
  });

  // Track click in database
  await supabase.from('referral_attempts').insert({
    referral_code: referral_id,
    agent_profile_id: agent.id,
    landing_ts: new Date(),
    client_ip: req.headers.get('x-forwarded-for'),
    user_agent: req.headers.get('user-agent'),
    state: 'pending'
  });

  return response;
}
```

**Cookie Reading** (during signup):

```typescript
// In handle_new_user() trigger or signup API
function getAgentFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  const cookies = parse(cookieHeader || '');
  const twRef = cookies.TW_REF;

  if (!twRef) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(twRef, 'base64').toString('utf8')
    );

    // Verify HMAC signature
    const { agent, dest, ts, exp, sig } = payload;
    const hmac = createHmac('sha256', process.env.REF_COOKIE_SECRET!);
    hmac.update(JSON.stringify({ agent, dest, ts, exp }));
    const expectedSig = hmac.digest('hex');

    if (sig !== expectedSig) {
      console.warn('Invalid TW_REF signature');
      return null;
    }

    // Check expiry
    if (Date.now() / 1000 > ts + exp) {
      console.warn('TW_REF cookie expired');
      return null;
    }

    return agent;
  } catch (err) {
    console.error('Failed to parse TW_REF cookie', err);
    return null;
  }
}
```

**Security Features**:
- HMAC signature prevents tampering
- Expiry check (30 days)
- First-party cookie (no cross-site tracking)
- SameSite=Lax (CSRF protection)
- Secure flag (HTTPS only)

---

### 11. Fraud Detection Integration

**Purpose**: Block referral abuse and gaming

**Key Files**:
- `apps/api/fraud/referral-checks.ts`

**Checks Implemented**:

```typescript
// 1. Self-referral prevention
async function checkSelfReferral(
  userId: string,
  referrerId: string
): Promise<boolean> {
  return userId === referrerId; // Block if same
}

// 2. Duplicate email/payment instrument
async function checkDuplicateIdentity(
  email: string,
  paymentHash: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .or(`email.eq.${email},payment_hash.eq.${paymentHash}`);

  return data && data.length > 1; // Flag if multiple accounts
}

// 3. Velocity check (too many signups from same IP)
async function checkVelocity(
  ip: string,
  timeWindow: number = 3600 // 1 hour
): Promise<boolean> {
  const { count } = await supabase
    .from('referral_attempts')
    .select('id', { count: 'exact' })
    .eq('client_ip', ip)
    .gte('landing_ts', new Date(Date.now() - timeWindow * 1000));

  return count > 10; // Flag if >10 signups from same IP in 1 hour
}

// 4. Behavioral check (instant conversion = suspicious)
async function checkInstantConversion(
  signupTs: Date,
  bookingTs: Date
): Promise<boolean> {
  const diff = bookingTs.getTime() - signupTs.getTime();
  return diff < 60000; // Flag if booking within 1 minute of signup
}

// 5. Manual claim verification
async function verifyManualClaim(
  userId: string,
  agentCode: string
): Promise<boolean> {
  // Send email verification
  await sendEmail({
    to: user.email,
    subject: 'Verify Referral Claim',
    body: `Click to verify: ${verifyUrl}?token=${token}`
  });

  // Require user to click link before attribution finalized
  return false; // Wait for verification
}
```

**Fraud Response**:
- Quarantine suspicious commissions (status = 'under_review')
- Manual ops review within 48 hours
- Automated alerts for threshold breaches
- Payout freeze for flagged agents

---

### 12. GDPR Compliance Integration

**Purpose**: Data protection and user rights

**Key Files**:
- Privacy policy disclosure
- Cookie consent banner
- Data export/deletion endpoints

**Compliance Requirements**:

```typescript
// 1. Cookie consent banner (on all /a/ routes)
<CookieBanner>
  We use cookies to track referrals and improve your experience.
  <Link href="/privacy">Learn more</Link>
  <Button onClick={acceptCookies}>Accept</Button>
</CookieBanner>

// 2. Data minimization (referral_attempts table)
// Store ONLY:
- Hashed email (not plaintext)
- Hashed device token (not full fingerprint)
- IP address (for fraud only)
- User agent (for analytics only)

// 3. Retention limits
- referral_attempts (pending) → 30 days auto-delete
- manual claim evidence → 180 days auto-delete
- financial ledger → 7 years (legal requirement)

// 4. User rights endpoints
POST /api/gdpr/export-referral-data
  → Returns CSV of all referral activity

POST /api/gdpr/delete-referral-attribution
  → Removes referred_by_profile_id (opt-out)
  → Does NOT reverse past commissions (financial records retained)

POST /api/gdpr/request-data-portability
  → JSON export of referral history
```

**Privacy Policy Clauses**:
- Purpose: "We track referrals to compensate partners who introduce new users"
- Data stored: "Referral codes, click timestamps, IP addresses (fraud prevention)"
- Retention: "30 days pending, 7 years financial records"
- Rights: "Export, delete attribution, opt-out"

---

### 13. Stripe Connect Integration (Payouts)

**Purpose**: Distribute commissions to agents and stores

**Key Files**:
- `apps/api/payments/payout.ts`
- Stripe Connect onboarding flow

**Payout Flow**:

```typescript
// 1. Release commission after hold period
async function releaseCommission(transactionId: string) {
  const { data: tx } = await supabase
    .from('transactions')
    .select('*, to_profile:profiles!to_profile_id(*)')
    .eq('id', transactionId)
    .single();

  if (new Date() < new Date(tx.release_date)) {
    throw new Error('Hold period not expired');
  }

  // 2. Update transaction status
  await supabase
    .from('transactions')
    .update({ status: 'available' })
    .eq('id', transactionId);

  // 3. Create Stripe Transfer
  const transfer = await stripe.transfers.create({
    amount: Math.round(tx.amount * 100), // Convert to cents
    currency: 'gbp',
    destination: tx.to_profile.stripe_account_id,
    description: `Referral commission for booking ${tx.booking_id}`,
    metadata: {
      transaction_id: tx.id,
      agent_id: tx.to_profile_id,
      booking_id: tx.booking_id
    }
  });

  // 4. Update transaction with payout details
  await supabase
    .from('transactions')
    .update({
      status: 'paid_out',
      stripe_transfer_id: transfer.id,
      paid_out_at: new Date()
    })
    .eq('id', transactionId);
}
```

**Stripe Connect Onboarding**:

```typescript
// When agent first earns commission, trigger onboarding
if (!agent.stripe_account_id) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    email: agent.email,
    capabilities: {
      transfers: { requested: true }
    }
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${baseUrl}/hub/financials?refresh=true`,
    return_url: `${baseUrl}/hub/financials?success=true`,
    type: 'account_onboarding'
  });

  // Save account ID and redirect user
  await supabase
    .from('profiles')
    .update({ stripe_account_id: account.id })
    .eq('id', agent.id);

  return NextResponse.redirect(accountLink.url);
}
```

**Payout Schedule**:
- Pending: 14 days (hold window)
- Available: Weekly batch payouts (Fridays)
- Minimum payout: £10 (accumulate if below)

---

## Database Schema

### Core Tables

```sql
-- 1. profiles (enhanced with referral fields)
ALTER TABLE profiles
ADD COLUMN referral_code TEXT UNIQUE NOT NULL,           -- User's own code (7 chars)
ADD COLUMN referred_by_profile_id UUID REFERENCES profiles(id), -- LIFETIME attribution
ADD COLUMN referral_code_used TEXT,                     -- Code they entered at signup
ADD COLUMN referral_source TEXT,                        -- 'cookie' | 'url' | 'manual' | 'direct'
ADD COLUMN referred_at TIMESTAMPTZ,                     -- Timestamp of attribution
ADD COLUMN first_booking_at TIMESTAMPTZ;                -- First conversion timestamp

CREATE INDEX idx_profiles_referred_by ON profiles(referred_by_profile_id);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);

-- 2. referrals (agent-created referral links)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  short_code TEXT UNIQUE NOT NULL,                      -- 7-char code
  destination TEXT NOT NULL,                            -- /listings/123
  type TEXT NOT NULL,                                   -- 'link' | 'qr' | 'embed' | 'agent_api'
  campaign_id TEXT,                                     -- Optional campaign tracking
  metadata JSONB,                                       -- {source, store_id, qr_id}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active'                          -- 'active' | 'expired' | 'disabled'
);

CREATE INDEX idx_referrals_short_code ON referrals(short_code);
CREATE INDEX idx_referrals_agent ON referrals(agent_profile_id);

-- 3. referral_attempts (click tracking)
CREATE TABLE referral_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,                          -- Denormalized for performance
  agent_profile_id UUID NOT NULL REFERENCES profiles(id),
  signup_profile_id UUID REFERENCES profiles(id),       -- NULL until signup
  client_ip INET,
  user_agent TEXT,
  landing_ts TIMESTAMPTZ DEFAULT NOW(),
  signup_ts TIMESTAMPTZ,
  first_booking_ts TIMESTAMPTZ,
  state TEXT DEFAULT 'pending',                         -- 'pending' | 'attributed' | 'converted' | 'expired'
  audit JSONB                                           -- Fraud checks, attribution logic
);

CREATE INDEX idx_referral_attempts_code ON referral_attempts(referral_code);
CREATE INDEX idx_referral_attempts_agent ON referral_attempts(agent_profile_id);
CREATE INDEX idx_referral_attempts_state ON referral_attempts(state);

-- 4. transactions (enhanced with referral commissions)
ALTER TABLE transactions
ADD COLUMN type TEXT NOT NULL,                          -- 'referral_commission' | 'tutor_payout' | ...
ADD COLUMN release_date TIMESTAMPTZ,                    -- When commission becomes available
ADD COLUMN stripe_transfer_id TEXT;                     -- Stripe payout reference

CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_release_date ON transactions(release_date);

-- 5. listings (delegation field)
ALTER TABLE listings
ADD COLUMN delegate_commission_to_profile_id UUID REFERENCES profiles(id);

CREATE INDEX idx_listings_delegate ON listings(delegate_commission_to_profile_id);

-- 6. bookings (referral tracking)
ALTER TABLE bookings
ADD COLUMN agent_profile_id UUID REFERENCES profiles(id); -- Copy from tutor's referred_by_profile_id

CREATE INDEX idx_bookings_agent ON bookings(agent_profile_id);
```

### Helper Functions

```sql
-- Generate 7-character alphanumeric referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  -- Ensure uniqueness
  IF EXISTS (SELECT 1 FROM profiles WHERE referral_code = result) THEN
    RETURN generate_referral_code(); -- Recursive retry
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## Security & Compliance

### 1. Cookie Security

```typescript
// HMAC signature prevents tampering
const payload = { agent: 'kRz7Bq', ts: 1699123456, exp: 2592000 };
const sig = HMAC_SHA256(JSON.stringify(payload), REF_COOKIE_SECRET);
const cookie = base64({ ...payload, sig });

// Verification
const received = JSON.parse(base64Decode(cookie));
const expectedSig = HMAC_SHA256(
  JSON.stringify({ agent: received.agent, ts: received.ts, exp: received.exp }),
  REF_COOKIE_SECRET
);

if (received.sig !== expectedSig) {
  throw new Error('Cookie tampering detected');
}
```

### 2. Self-Referral Prevention

```sql
-- In handle_new_user() trigger
IF v_agent_profile_id = NEW.id THEN
  -- User cannot refer themselves
  v_agent_profile_id := NULL;
END IF;
```

### 3. KYC Thresholds

```typescript
// Require ID verification for high earners
if (agentEarnings > 1000) { // £1,000/month
  if (!agent.kyc_verified) {
    await requireKYC(agent.id);
    await freezePayouts(agent.id);
  }
}
```

### 4. Payout Hold Window

```sql
-- 14-day hold before commission release
INSERT INTO transactions (
  ...
  status: 'pending',
  release_date: NOW() + INTERVAL '14 days'
);

-- Protects against refunds/chargebacks
```

### 5. Audit Trail

```sql
-- Immutable referral decision log
INSERT INTO referral_attempts (
  ...
  audit: {
    "cookie_found": true,
    "cookie_valid": true,
    "agent_resolved": "kRz7Bq",
    "attribution_method": "cookie",
    "timestamp": "2025-12-12T10:30:00Z"
  }
);
```

---

## Testing Strategy

### 1. Manual Test Scenarios

**Scenario A: QR Code → Delayed Signup**
```
1. Agent generates QR code
2. User scans QR → lands on /listings/123
3. Cookie TW_REF set (30 days)
4. User browses for 2 weeks
5. User signs up
6. Verify: profiles.referred_by_profile_id = agent.id ✓
```

**Scenario B: Cookie Cleared → Manual Code**
```
1. User clicks referral link → cookie set
2. User clears browser data
3. User signs up with manual code input
4. Verify: Manual code takes precedence ✓
```

**Scenario C: Self-Referral Blocked**
```
1. Tutor tries to use own referral code
2. System detects user_id === agent_id
3. Verify: profiles.referred_by_profile_id = NULL ✓
```

**Scenario D: Store Delegation**
```
1. Agent A refers Tutor T (lifetime attribution set)
2. Tutor T creates listing with delegate = Store S
3. Client clicks Tutor T's QR → books
4. Verify: Commission paid to Store S (not Agent A) ✓
```

**Scenario E: Third-Party Referrer (No Delegation)**
```
1. Agent A refers Tutor T
2. Tutor T creates listing with delegate = Store S
3. Client clicks Agent B's referral link → books with Tutor T
4. Verify: Commission paid to Agent A (delegation ignored) ✓
```

### 2. Automated Tests

```typescript
// Unit tests
describe('Referral Attribution', () => {
  it('should resolve cookie attribution', async () => {
    const cookie = createSignedCookie('kRz7Bq');
    const agent = await resolveAttribution({ cookie });
    expect(agent).toBe('kRz7Bq');
  });

  it('should block self-referral', async () => {
    const result = await createUser({
      userId: 'user123',
      referrerId: 'user123' // Same ID
    });
    expect(result.referred_by_profile_id).toBeNull();
  });

  it('should apply delegation override', async () => {
    const recipient = await calculateCommissionRecipient({
      tutorReferrer: 'agentA',
      listingDelegate: 'storeS',
      directReferrer: 'tutor' // QR code
    });
    expect(recipient).toBe('storeS');
  });
});

// Integration tests
describe('End-to-End Referral Flow', () => {
  it('should track QR → signup → booking → payout', async () => {
    // 1. Generate QR
    const qr = await generateReferralQR('agentA');

    // 2. Simulate scan
    const res = await fetch(`/a/agentA?redirect=/listings/1`);
    const cookie = res.headers.get('set-cookie');

    // 3. Signup with cookie
    const user = await signup({ cookie });
    expect(user.referred_by_profile_id).toBe('agentA');

    // 4. Make booking
    const booking = await createBooking(user.id, 'listing1');

    // 5. Process payment
    await processPayment(booking.id, 100);

    // 6. Verify commission
    const tx = await getTransaction({
      booking_id: booking.id,
      type: 'referral_commission'
    });
    expect(tx.to_profile_id).toBe('agentA');
    expect(tx.amount).toBe(9); // 10% of £90 tutor share
    expect(tx.status).toBe('pending');
  });
});
```

---

## Implementation Status: Current vs Future State

### ✅ IMPLEMENTED (Current State - v4.3)

**Core Attribution System**:
- ✅ Secure 7-character referral codes (migration 035: `generate_secure_referral_code()`)
- ✅ Profile-level lifetime attribution (`profiles.referred_by_profile_id`)
- ✅ Referral link handler (`/app/a/[referral_id]/route.ts`)
- ✅ Cookie-based tracking (`tutorwise_referral_id` cookie, 30-day)
- ✅ Signup trigger attribution (`handle_new_user()` function)
- ✅ Contextual referral links (`?redirect=/listings/123`)

**Dashboard & UI**:
- ✅ Referrals hub page (`/referrals`)
- ✅ Pipeline tracking (Referred → Signed Up → Converted)
- ✅ Referral stats widget (total referred, signups, conversions, earnings)
- ✅ Social sharing (WhatsApp, Facebook, LinkedIn)
- ✅ CSV export functionality
- ✅ Filtering by status (All, Referred, Signed Up, Converted, Expired)
- ✅ Search and sort functionality

**Database Schema**:
```sql
-- ✅ IMPLEMENTED
profiles.referral_code              -- User's own 7-char code
profiles.referred_by_profile_id     -- Lifetime attribution
profiles.slug                       -- Public profile URLs
referrals (table)                   -- Lead tracking
  - agent_profile_id                -- Agent who created referral
  - referred_profile_id             -- User who signed up (NULL for anonymous)
  - status                          -- 'Referred' | 'Signed Up' | 'Converted' | 'Expired'
listings.delegate_commission_to_profile_id  -- Store delegation (v4.3)
```

**Commission System**:
- ✅ Commission delegation logic (migration 038)
- ✅ Store partnership model (tutors delegate to shops)
- ✅ 80/10/10 payment split (tutor/agent/platform)
- ✅ Delegation override rule (when tutor IS the referrer)

**Files Implemented**:
- ✅ `/app/a/[referral_id]/route.ts` - Referral link handler
- ✅ `/app/(authenticated)/referrals/page.tsx` - Referrals hub
- ✅ `apps/api/migrations/035-038` - Core referral migrations
- ✅ `apps/api/migrations/090` - Fixed handle_new_user trigger

---

### 🚧 PARTIALLY IMPLEMENTED (Needs Enhancement)

**Cookie Security** (Currently: Basic cookie, no HMAC):
- ⚠️ Cookie set but NOT HMAC-signed
- ⚠️ No signature verification
- ⚠️ Cookie name: `tutorwise_referral_id` (stores referral record UUID)
- 🎯 **Need**: Implement TW_REF cookie with HMAC-SHA256 signature

**Attribution Resolution** (Currently: Manual code input missing):
- ✅ Cookie-based attribution works
- ⚠️ Manual code entry UI exists in signup form
- ⚠️ No email verification for manual claims
- 🎯 **Need**: Add email verification flow for manual claims

**Commission Tracking** (Currently: Basic, no hold period):
- ✅ Commission calculation in `process_booking_payment()`
- ⚠️ No 14-day hold period implemented
- ⚠️ No payout status tracking (pending → available → paid_out)
- 🎯 **Need**: Add `transactions.release_date` and hold logic

---

### ❌ NOT IMPLEMENTED (Future State)

**Phase 1: Security & Fraud Protection (0-30 Days)**

```sql
-- Missing Tables
CREATE TABLE referral_attempts (
  id UUID PRIMARY KEY,
  referral_code TEXT NOT NULL,
  agent_profile_id UUID NOT NULL,
  signup_profile_id UUID,  -- NULL until signup
  client_ip INET,
  user_agent TEXT,
  landing_ts TIMESTAMPTZ DEFAULT NOW(),
  signup_ts TIMESTAMPTZ,
  first_booking_ts TIMESTAMPTZ,
  state TEXT DEFAULT 'pending',  -- 'pending' | 'attributed' | 'converted' | 'expired'
  audit JSONB  -- Fraud checks, attribution decision log
);
```

**Missing Features**:
- ❌ HMAC-signed cookies (TW_REF with signature)
- ❌ Fraud checks (self-referral blocking, velocity limits)
- ❌ Email verification for manual claims
- ❌ 14-day payout hold period
- ❌ Audit logging (immutable attribution decisions)

**Phase 2: Agent API & Advanced Features (30-90 Days)**

- ❌ Agent API endpoint (`POST /api/agent/referrals`)
- ❌ JWT authentication for programmatic referrals
- ❌ QR code generation API
- ❌ Agent dashboard (pipeline, earnings, top referrals)
- ❌ Manual claim appeal workflow
- ❌ KYC thresholds (£1k/month verification)

**Phase 3: Enterprise & Compliance (90-180 Days)**

- ❌ Device fingerprinting (optional, legal review)
- ❌ Multi-currency payouts
- ❌ Reconciliation jobs & accounting exports
- ❌ Fraud ML scoring
- ❌ Reserve account modeling
- ❌ SOC/ISO compliance hardening

---

## Implementation Roadmap

### ✅ Phase 0: MVP (COMPLETED - Nov 2025)
- ✅ Secure referral code generation (7-char alphanumeric)
- ✅ Profile-level lifetime attribution
- ✅ Referral link handler (`/a/[code]`)
- ✅ Basic cookie tracking (30-day)
- ✅ Referrals dashboard hub
- ✅ Commission delegation (store partnerships)
- ✅ Pipeline tracking (Referred → Signed Up → Converted)

### 🚧 Phase 1: Security & Fraud (0-30 Days) - **IN PROGRESS**

**Priority 1: Cookie Security**
- [ ] Replace `tutorwise_referral_id` with `TW_REF` cookie
- [ ] Implement HMAC-SHA256 signature (`REF_COOKIE_SECRET`)
- [ ] Add signature verification in `handle_new_user()`
- [ ] Update `/app/a/[referral_id]/route.ts` cookie setter

**Priority 2: Fraud Protection**
- [ ] Create `referral_attempts` table
- [ ] Implement self-referral blocking (check `user_id !== agent_id`)
- [ ] Add velocity checks (max 10 signups per IP per hour)
- [ ] Add audit logging (immutable attribution decisions)

**Priority 3: Payout Safety**
- [ ] Add `transactions.release_date` column
- [ ] Implement 14-day hold period
- [ ] Add payout status tracking (`pending` → `available` → `paid_out`)
- [ ] Update `process_booking_payment()` function

**Priority 4: Manual Claims**
- [ ] Add email verification for manual code entry
- [ ] Create verification token system
- [ ] Add 90-day manual claim window (vs 30-day cookie)

### 📋 Phase 2: Agent API & Scale (30-90 Days)

**Priority 1: Agent API**
- [ ] Implement `POST /api/agent/referrals` endpoint
- [ ] Add JWT authentication (agent claims)
- [ ] Add HMAC signature verification
- [ ] Implement rate limiting (100 referrals/day)

**Priority 2: QR Code System**
- [ ] Create QR code generation API
- [ ] Add QR download (SVG/PNG formats)
- [ ] Track QR scans separately in analytics

**Priority 3: Advanced Dashboard**
- [ ] Add earnings breakdown widget
- [ ] Add top performers leaderboard
- [ ] Add conversion funnel visualization
- [ ] Add source analytics (QR vs Link vs Manual)

**Priority 4: KYC & Compliance**
- [ ] Implement KYC threshold (£1k/month)
- [ ] Add identity verification flow
- [ ] Freeze payouts for unverified high earners
- [ ] Add appeals workflow for rejected claims

### 🔮 Phase 3: Enterprise & Mature (90-180 Days)

**Priority 1: Advanced Fraud**
- [ ] Add device fingerprinting (with legal review)
- [ ] Implement behavioral fraud scoring
- [ ] Add instant conversion detection
- [ ] Build fraud ML model

**Priority 2: Financial Operations**
- [ ] Multi-currency payout support
- [ ] Reserve account modeling
- [ ] Daily reconciliation jobs
- [ ] Accounting ledger exports (CSV/JSON)

**Priority 3: Compliance & Audit**
- [ ] SOC 2 compliance checklist
- [ ] GDPR data export automation
- [ ] Audit trail dashboard
- [ ] Compliance reporting tools

---

## Gap Analysis: What's Missing?

### Critical Gaps (Must Fix Before Scale)

1. **Cookie Security** ❗
   - Current: Unverified UUID cookie
   - Risk: Cookie tampering possible
   - Fix: HMAC-signed TW_REF cookie

2. **Payout Hold Period** ❗
   - Current: Instant commission release
   - Risk: Losses from refunds/chargebacks
   - Fix: 14-day hold window + release_date tracking

3. **Fraud Protection** ❗
   - Current: No self-referral checks
   - Risk: Abuse via fake signups
   - Fix: Velocity limits + behavioral checks

4. **Audit Logging** ❗
   - Current: No attribution decision log
   - Risk: Unable to resolve disputes
   - Fix: Immutable referral_attempts table

### Medium Priority Gaps

5. **Manual Claim Verification**
   - Current: No email verification
   - Risk: Manual code abuse
   - Fix: Email verification flow

6. **Agent API**
   - Current: No programmatic access
   - Limitation: Can't integrate with external systems
   - Fix: JWT-authenticated API

7. **KYC Thresholds**
   - Current: No identity verification
   - Risk: High-value payouts to unverified users
   - Fix: £1k/month KYC trigger

### Low Priority Gaps

8. **Device Fingerprinting**
   - Current: IP tracking only
   - Limitation: Can't detect same-device abuse
   - Fix: Browser fingerprinting (post-legal review)

9. **Multi-Currency**
   - Current: GBP only
   - Limitation: Can't expand internationally
   - Fix: Stripe multi-currency support

10. **Reserve Account**
    - Current: No financial buffer
    - Risk: Can't cover unexpected reversals
    - Fix: 5-10% reserve model

---

## Performance Considerations

### Database Optimization

```sql
-- High-traffic queries need indexes
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_referral_attempts_code ON referral_attempts(referral_code);
CREATE INDEX idx_transactions_release_date ON transactions(release_date)
  WHERE status = 'pending'; -- Partial index for scheduled releases

-- Denormalize for performance
ALTER TABLE bookings
ADD COLUMN agent_profile_id UUID; -- Copy from tutor's profile (avoid JOIN)
```

### Cookie Read Performance

```typescript
// Cache parsed cookies in request context
const cookieCache = new Map<string, ParsedCookie>();

function getCookie(req: Request): ParsedCookie | null {
  const cookieHeader = req.headers.get('cookie');
  if (cookieCache.has(cookieHeader)) {
    return cookieCache.get(cookieHeader)!;
  }

  const parsed = parseCookie(cookieHeader);
  cookieCache.set(cookieHeader, parsed);
  return parsed;
}
```

### Analytics Query Optimization

```sql
-- Materialized view for agent dashboard
CREATE MATERIALIZED VIEW agent_referral_stats AS
SELECT
  referred_by_profile_id AS agent_id,
  COUNT(*) AS total_signups,
  COUNT(*) FILTER (WHERE first_booking_at IS NOT NULL) AS total_conversions,
  SUM(CASE WHEN first_booking_at IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS conversion_rate
FROM profiles
WHERE referred_by_profile_id IS NOT NULL
GROUP BY referred_by_profile_id;

-- Refresh daily
REFRESH MATERIALIZED VIEW agent_referral_stats;
```

---

## Monitoring & Alerts

### Key Metrics

```typescript
// Dashboard metrics (updated hourly)
{
  "referral_clicks": 1543,
  "signups_attributed": 312,
  "conversions": 94,
  "click_to_signup_rate": 0.20,    // 20%
  "signup_to_booking_rate": 0.30,  // 30%
  "avg_time_to_convert_days": 7.5,
  "pending_commissions_gbp": 12453,
  "fraud_flags": 3,
  "manual_claims_pending": 8
}
```

### Automated Alerts

```typescript
// Alert conditions
if (agentEarnings > 5000) {
  alert('Agent exceeded monthly cap - manual review required');
}

if (refundRate > 0.05) { // >5% refunds
  alert('High refund rate on referred bookings - fraud check');
}

if (instantConversions > 10) {
  alert('Suspicious instant conversions detected');
}

if (reserveRatio < 0.20) { // <20% reserve coverage
  alert('Payout reserve below safe threshold');
}
```

---

## Troubleshooting

### Issue 1: Cookie Not Set

**Symptoms**: User clicks referral link but signup shows no referrer

**Debugging**:
```bash
# Check cookie in browser DevTools → Application → Cookies
# Should see: TW_REF = <base64-encoded-value>

# Server-side check
const cookie = req.headers.get('cookie');
console.log('Cookies:', cookie);
```

**Fixes**:
- Ensure `domain: '.tutorwise.com'` (leading dot for subdomains)
- Check `secure: true` (requires HTTPS)
- Verify `SameSite=Lax` (not `Strict`)

### Issue 2: Commission Not Calculated

**Symptoms**: Booking completed but no transaction created

**Debugging**:
```sql
-- Check if tutor has referrer
SELECT referred_by_profile_id FROM profiles WHERE id = <tutor_id>;

-- Check if booking has agent_profile_id
SELECT agent_profile_id FROM bookings WHERE id = <booking_id>;

-- Check transaction logs
SELECT * FROM transactions WHERE booking_id = <booking_id>;
```

**Fixes**:
- Verify `handle_successful_payment()` called after payment
- Check delegation logic (may override referrer)
- Ensure agent has Stripe Connect account

### Issue 3: Manual Claim Rejected

**Symptoms**: User enters referral code but attribution fails

**Debugging**:
```sql
-- Check if code exists
SELECT * FROM profiles WHERE referral_code = 'kRz7Bq';

-- Check if code expired (30-day window)
SELECT * FROM referral_attempts
WHERE referral_code = 'kRz7Bq'
  AND landing_ts < NOW() - INTERVAL '30 days';

-- Check fraud flags
SELECT * FROM referral_attempts
WHERE referral_code = 'kRz7Bq'
  AND audit->'fraud_flags' IS NOT NULL;
```

**Fixes**:
- Extend manual claim window to 90 days (configurable)
- Require email verification for manual claims
- Add appeal process for rejected claims

---

## Glossary

| Term | Definition |
|------|------------|
| **RAID** | Referral Agent Identifier (7-char code) |
| **TW_REF** | TutorWise Referral cookie name |
| **Lifetime Attribution** | Permanent binding of referrer to user profile |
| **Supply-Side Agent** | Recruits tutors to platform |
| **Demand-Side Agent** | Recruits clients to platform |
| **Delegation** | Tutor assigns commission to partner (store) |
| **Pipeline** | Referral stages: Clicked → Signed Up → Converted |
| **First Conversion** | First completed booking by referred user |
| **Hold Period** | 14-day delay before commission payout |
| **Attribution Resolution** | Hierarchical logic to determine referrer |
| **Manual Claim** | User enters referral code after cookie expired |

---

## Related Documentation

- [Auth Solution Design](../auth/auth-solution-design.md) - Profile creation trigger
- [Payments Solution Design](../payments/payments-solution-design.md) - Commission calculation
- [Bookings Solution Design](../bookings/bookings-solution-design.md) - First conversion tracking
- [Account Solution Design](../account/account-solution-design.md) - Multi-role support
- [Dashboard Analytics](../dashboard/dashboard-solution-design.md) - Referral metrics

---

**Last Updated**: 2025-12-12
**Version**: v4.3 (Delegation + Agent API)
**Status**: Specification Complete (Implementation 70% Complete)
**Patent**: UK Provisional Filed

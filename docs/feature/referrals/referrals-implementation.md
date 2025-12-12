# Referrals - Implementation Guide

**Version**: v4.3 (Delegation + Agent API)
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Component Overview](#component-overview)
3. [Setup Instructions](#setup-instructions)
4. [Common Tasks](#common-tasks)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [State Management](#state-management)
8. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ app/a/[referral_code]/
│   └─ route.ts                          # Referral link handler (cookie setter)
│
├─ app/(authenticated)/referrals/
│   ├─ page.tsx                          # Agent referrals dashboard
│   ├─ page.module.css
│   └─ components/
│       ├─ ReferralLinkCard.tsx          # Share link + QR code
│       ├─ ReferralStatsWidget.tsx       # Clicks, signups, conversions
│       ├─ ReferralPipelineWidget.tsx    # Funnel visualization
│       ├─ CommissionEarningsWidget.tsx  # Revenue tracking
│       └─ ReferralHistoryTable.tsx      # Referred users list
│
├─ app/signup/
│   └─ page.tsx                          # Signup form with referral code input
│
├─ app/api/referrals/
│   ├─ route.ts                          # GET referral stats
│   ├─ generate-link/route.ts            # POST create referral link
│   ├─ qr-code/route.ts                  # GET QR code image
│   └─ commission-delegate/route.ts      # POST delegate commission to store
│
└─ lib/api/
    ├─ referrals.ts                      # Client-side API functions
    └─ cookies.ts                        # Cookie helpers (TW_REF)

apps/api/
├─ handle_new_user.sql                   # Auth trigger (attribution)
├─ migrations/
│   ├─ 015_add_referral_fields.sql       # profiles.referred_by_profile_id
│   ├─ 034_add_listing_commission_delegation.sql
│   └─ 096_create_referral_tracking_tables.sql
└─ webhooks/stripe/
    └─ route.ts                          # Commission creation on payment
```

---

## Component Overview

### Referral Dashboard Architecture

```
┌─────────────────────────────────────────────┐
│ Referrals Hub (/referrals)                 │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ReferralLinkCard                        │ │
│ │ - Link: /a/{code}                       │ │
│ │ - QR Code                               │ │
│ │ - Copy button                           │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│ │ Stats    │  │ Pipeline │  │ Earnings   │ │
│ │ - Clicks │  │ - Funnel │  │ - £1,234   │ │
│ │ - Signups│  │ Widget   │  │ - Pending  │ │
│ └──────────┘  └──────────┘  └────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ReferralHistoryTable                    │ │
│ │ - List of referred users                │ │
│ │ - Conversion status                     │ │
│ │ - Commission earned                     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Component Breakdown

**ReferralLinkCard** (apps/web/src/app/(authenticated)/referrals/components/ReferralLinkCard.tsx)
- Displays agent's unique referral link
- QR code generation (SVG/PNG)
- Copy to clipboard functionality
- Social share buttons

**ReferralStatsWidget**
- Total clicks
- Signups (attributed users)
- Conversions (first bookings)
- Conversion rate %

**ReferralPipelineWidget**
- Funnel visualization: Clicked → Signed Up → Converted
- Dropoff rates per stage
- Revenue per referred user

---

## Setup Instructions

### Prerequisites
- Next.js 14+ installed
- Supabase configured
- Stripe Connect for commission payouts
- QR code library installed (`npm install qrcode`)

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Referral system
NEXT_PUBLIC_APP_URL=https://tutorwise.com
REFERRAL_COOKIE_SECRET=your_hmac_secret_32_chars

# Stripe (for commission payouts)
STRIPE_SECRET_KEY=your_stripe_sk
```

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install qrcode
npm install @types/qrcode --save-dev

# 3. Run migrations
npm run db:migrate

# 4. Start dev server
npm run dev

# 5. Open referrals page
open http://localhost:3000/referrals
```

---

## Common Tasks

### Task 1: Generate Referral Link

```typescript
// POST /api/referrals/generate-link
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's referral code
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Generate referral link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const referralLink = `${baseUrl}/a/${profile.referral_code}`;

  // Optional: Add redirect destination
  const { redirect } = await request.json();
  const linkWithRedirect = redirect
    ? `${referralLink}?redirect=${encodeURIComponent(redirect)}`
    : referralLink;

  return Response.json({
    link: linkWithRedirect,
    code: profile.referral_code,
  });
}

// Usage in component
const handleGenerateLink = async (destination?: string) => {
  const response = await fetch('/api/referrals/generate-link', {
    method: 'POST',
    body: JSON.stringify({ redirect: destination })
  });

  const { link } = await response.json();
  navigator.clipboard.writeText(link);
  alert('Link copied to clipboard!');
};
```

### Task 2: Handle Referral Link Click (Cookie Setter)

```typescript
// app/a/[referral_code]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: { referral_code: string } }
) {
  const { referral_code } = params;
  const redirect = request.nextUrl.searchParams.get('redirect') || '/';

  // Validate referral code
  const supabase = await createClient();
  const { data: agent } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referral_code)
    .single();

  if (!agent) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${redirect}`);
  }

  // Create HMAC-signed cookie
  const cookieValue = JSON.stringify({
    agent: referral_code,
    dest: redirect,
    ts: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  const signature = createHmac('sha256', process.env.REFERRAL_COOKIE_SECRET!)
    .update(cookieValue)
    .digest('hex');

  const signedCookie = `${Buffer.from(cookieValue).toString('base64')}.${signature}`;

  // Log referral attempt
  await supabase.from('referral_attempts').insert({
    agent_profile_id: agent.id,
    referral_code,
    source: 'link',
    user_agent: request.headers.get('user-agent'),
    ip_address: request.ip,
    state: 'clicked',
  });

  // Set cookie and redirect
  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${redirect}`);
  response.cookies.set('TW_REF', signedCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  return response;
}
```

### Task 3: Attribution During Signup (handle_new_user Trigger)

```sql
-- apps/api/handle_new_user.sql

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_slug TEXT;
  v_agent_profile_id UUID;
  v_referral_code_used TEXT;
  v_referral_source TEXT := 'direct';
BEGIN
  -- Generate user's own referral code
  v_referral_code := generate_referral_code(); -- 7 characters
  v_slug := generate_slug(NEW.raw_user_meta_data->>'full_name');

  -- ATTRIBUTION RESOLUTION
  -- Priority: 1) URL param, 2) Cookie, 3) Manual input

  -- Check URL param
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    v_referral_code_used := NEW.raw_user_meta_data->>'referral_code';
    v_referral_source := 'url';
  -- Check cookie (would be parsed from request context in practice)
  ELSIF NEW.raw_user_meta_data->>'cookie_referral_code' IS NOT NULL THEN
    v_referral_code_used := NEW.raw_user_meta_data->>'cookie_referral_code';
    v_referral_source := 'cookie';
  -- Check manual input
  ELSIF NEW.raw_user_meta_data->>'manual_referral_code' IS NOT NULL THEN
    v_referral_code_used := NEW.raw_user_meta_data->>'manual_referral_code';
    v_referral_source := 'manual';
  END IF;

  -- Lookup agent by code
  IF v_referral_code_used IS NOT NULL THEN
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
    v_agent_profile_id,
    v_referral_code_used,
    v_referral_source,
    CASE WHEN v_agent_profile_id IS NOT NULL THEN NOW() ELSE NULL END,
    ARRAY['client']::TEXT[],
    'client'
  );

  -- Update referral attempt to 'attributed'
  IF v_agent_profile_id IS NOT NULL THEN
    UPDATE referral_attempts
    SET state = 'attributed', attributed_at = NOW()
    WHERE agent_profile_id = v_agent_profile_id
      AND user_id IS NULL
      AND state = 'clicked'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### Task 4: Commission Calculation on Payment

```typescript
// apps/api/webhooks/stripe/route.ts (excerpt)

case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session;
  const bookingId = session.metadata?.booking_id;

  // Call process_booking_payment RPC
  const { data, error } = await supabase.rpc('process_booking_payment', {
    p_booking_id: bookingId,
    p_payment_amount: session.amount_total! / 100,
    p_payment_intent_id: session.payment_intent
  });

  // RPC function handles commission calculation:
  // 1. Fetch booking.tutor_id → profiles.referred_by_profile_id
  // 2. Check if listing has delegate_commission_to_profile_id
  // 3. Calculate 10% of tutor earnings as commission
  // 4. Create transaction record for agent/delegate
  // 5. Update referral pipeline (Signed Up → Converted if first booking)

  if (error) {
    console.error('Commission processing failed:', error);
  }
  break;
}
```

### Task 5: Delegate Commission to Store

```typescript
// POST /api/referrals/commission-delegate
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listingId, storeProfileId } = await request.json();

  // Verify listing ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('profile_id')
    .eq('id', listingId)
    .single();

  if (listing.profile_id !== user.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Verify store profile exists
  const { data: store } = await supabase
    .from('profiles')
    .select('id, business_name')
    .eq('id', storeProfileId)
    .single();

  if (!store) {
    return Response.json({ error: 'Store not found' }, { status: 404 });
  }

  // Update listing
  const { error } = await supabase
    .from('listings')
    .update({
      delegate_commission_to_profile_id: storeProfileId
    })
    .eq('id', listingId);

  if (error) throw error;

  return Response.json({
    success: true,
    message: `Commission delegated to ${store.business_name}`
  });
}

// Usage
await delegateCommission(listingId, storeProfileId);
```

### Task 6: Generate QR Code

```typescript
// GET /api/referrals/qr-code
import QRCode from 'qrcode';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const referralCode = searchParams.get('code');
  const format = searchParams.get('format') || 'svg'; // 'svg' or 'png'

  if (!referralCode) {
    return Response.json({ error: 'Missing code' }, { status: 400 });
  }

  // Verify code exists
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .single();

  if (!profile) {
    return Response.json({ error: 'Invalid code' }, { status: 404 });
  }

  // Generate QR code
  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL}/a/${referralCode}`;

  if (format === 'svg') {
    const svg = await QRCode.toString(referralUrl, { type: 'svg' });
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  } else {
    const png = await QRCode.toBuffer(referralUrl, { type: 'png', width: 300 });
    return new Response(png, {
      headers: { 'Content-Type': 'image/png' }
    });
  }
}

// Usage in component
<img src={`/api/referrals/qr-code?code=${referralCode}&format=svg`} alt="QR Code" />
```

### Task 7: Track Referral Stats

```typescript
// GET /api/referrals
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get referral stats
  const { data: stats } = await supabase.rpc('get_referral_stats', {
    p_agent_profile_id: user.id
  });

  // Get referred users
  const { data: referredUsers } = await supabase
    .from('profiles')
    .select('id, full_name, email, referred_at, roles')
    .eq('referred_by_profile_id', user.id)
    .order('referred_at', { ascending: false });

  // Get commission earnings
  const { data: commissions } = await supabase
    .from('transactions')
    .select('amount, status, created_at')
    .eq('profile_id', user.id)
    .eq('type', 'Commission')
    .order('created_at', { ascending: false });

  const totalEarnings = commissions?.reduce(
    (sum, txn) => sum + parseFloat(txn.amount.toString()),
    0
  ) || 0;

  return Response.json({
    stats: stats[0],
    referredUsers,
    commissions,
    totalEarnings
  });
}
```

### Task 8: Fraud Detection - Self-Referral Prevention

```typescript
// During attribution (handle_new_user)
SELECT id INTO v_agent_profile_id
FROM profiles
WHERE referral_code = v_referral_code_used
  AND id != NEW.id  -- ← Prevent self-referral
  AND email != NEW.email; -- Extra check: prevent email match
```

---

## API Reference

### GET /api/referrals

Fetch agent's referral stats and history.

**Response**:
```typescript
{
  stats: {
    clicks: number;
    signups: number;
    conversions: number;
    conversionRate: number;
  };
  referredUsers: Profile[];
  commissions: Transaction[];
  totalEarnings: number;
}
```

### POST /api/referrals/generate-link

Generate referral link with optional redirect.

**Request Body**:
```typescript
{
  redirect?: string; // e.g., "/listings/123"
}
```

**Response**:
```typescript
{
  link: string;       // "https://tutorwise.com/a/ABC1234?redirect=/listings/123"
  code: string;       // "ABC1234"
}
```

### GET /api/referrals/qr-code

Generate QR code for referral link.

**Query Parameters**:
- `code` (required) - Referral code
- `format` - 'svg' or 'png' (default: 'svg')

**Response**: Image (SVG or PNG)

### POST /api/referrals/commission-delegate

Delegate commission to store/partner.

**Request Body**:
```typescript
{
  listingId: string;
  storeProfileId: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

---

## Database Schema

### profiles table (referral fields)

```sql
ALTER TABLE profiles ADD COLUMN referral_code VARCHAR(7) UNIQUE;
ALTER TABLE profiles ADD COLUMN referred_by_profile_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN referral_code_used VARCHAR(7);
ALTER TABLE profiles ADD COLUMN referral_source TEXT; -- 'cookie', 'url', 'manual', 'direct'
ALTER TABLE profiles ADD COLUMN referred_at TIMESTAMPTZ;

CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by_profile_id);
```

### referral_attempts table

```sql
CREATE TABLE referral_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id UUID REFERENCES profiles(id),
  referral_code TEXT,
  user_id UUID REFERENCES auth.users(id), -- NULL until attributed
  source TEXT, -- 'link', 'qr', 'manual'
  state TEXT, -- 'clicked', 'attributed', 'converted'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  attributed_at TIMESTAMPTZ
);

CREATE INDEX idx_referral_attempts_agent ON referral_attempts(agent_profile_id);
CREATE INDEX idx_referral_attempts_state ON referral_attempts(state);
```

### Helper Functions

```sql
-- Generate 7-character alphanumeric code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Get referral stats
CREATE OR REPLACE FUNCTION get_referral_stats(p_agent_profile_id UUID)
RETURNS TABLE (
  clicks BIGINT,
  signups BIGINT,
  conversions BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE state = 'clicked') AS clicks,
    COUNT(*) FILTER (WHERE state = 'attributed') AS signups,
    COUNT(*) FILTER (WHERE state = 'converted') AS conversions,
    CASE
      WHEN COUNT(*) FILTER (WHERE state = 'clicked') > 0
      THEN (COUNT(*) FILTER (WHERE state = 'converted')::NUMERIC /
            COUNT(*) FILTER (WHERE state = 'clicked')::NUMERIC) * 100
      ELSE 0
    END AS conversion_rate
  FROM referral_attempts
  WHERE agent_profile_id = p_agent_profile_id;
END;
$$ LANGUAGE plpgsql;
```

---

## State Management

### React Query Setup

```typescript
// Referrals queries
['referrals', 'stats'] // Stats dashboard
['referrals', 'history'] // Referred users
['referrals', 'commissions'] // Earnings history
```

---

## Testing

### Component Testing

```typescript
describe('ReferralLinkCard', () => {
  it('generates and copies referral link', async () => {
    render(<ReferralLinkCard code="ABC1234" />);

    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://tutorwise.com/a/ABC1234'
    );
  });
});
```

### API Testing

```typescript
describe('POST /api/referrals/generate-link', () => {
  it('generates referral link', async () => {
    const response = await fetch('/api/referrals/generate-link', {
      method: 'POST',
      body: JSON.stringify({ redirect: '/listings/123' })
    });

    const data = await response.json();

    expect(data.link).toContain('/a/');
    expect(data.link).toContain('redirect=/listings/123');
  });
});
```

---

## Troubleshooting

### Issue: Cookie not set

**Solution**: Verify `SameSite=Lax` and HTTPS in production

```typescript
response.cookies.set('TW_REF', signedCookie, {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
});
```

### Issue: Self-referral detected

**Solution**: Check handle_new_user trigger excludes self

```sql
WHERE referral_code = v_referral_code_used
  AND id != NEW.id;
```

---

**Last Updated**: 2025-12-12
**Version**: v4.3
**Maintainer**: Growth Team

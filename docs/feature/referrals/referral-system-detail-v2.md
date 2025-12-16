# Referral System - Detailed Technical Specification v2.0

**Status**: Engineering Reference (NOT for Patent Filing)
**Purpose**: Comprehensive implementation guide with full technical details
**Date**: 2025-12-16
**Version**: 2.0 (Includes Commission Delegation)
**Patent Reference**: UK Provisional Application (Amendments v2.0)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Schema (Complete)](#2-database-schema-complete)
3. [Referral Identifier Generation](#3-referral-identifier-generation)
4. [Metadata Capture Mechanisms](#4-metadata-capture-mechanisms)
5. [Attribution Resolution Algorithm](#5-attribution-resolution-algorithm)
6. [Identity-Level Binding Implementation](#6-identity-level-binding-implementation)
7. [Multi-Role Architecture](#7-multi-role-architecture)
8. [Commission Delegation Mechanism](#8-commission-delegation-mechanism)
9. [Commission Calculation Engine](#9-commission-calculation-engine)
10. [Referral Ledger & Transactions](#10-referral-ledger--transactions)
11. [API Endpoints](#11-api-endpoints)
12. [Testing Strategy](#12-testing-strategy)
13. [Performance & Scalability](#13-performance--scalability)
14. [Security Considerations](#14-security-considerations)
15. [Analytics & Reporting](#15-analytics--reporting)

---

## 1. System Overview

### 1.1 Architecture Diagram

```
REFERRAL ATTRIBUTION SYSTEM
===========================

INPUT SOURCES                ATTRIBUTION             IDENTITY BINDING
-------------                -----------             ----------------
URL Parameter
(/a/[code])      ------>     Attribution     -----> profiles.referred_by_profile_id
                             Resolution              (IMMUTABLE)
Cookie                       Module
(30-day TTL)     ------>
                             Priority:
Manual Entry                 1. URL
(Signup)         ------>     2. Cookie
                             3. Manual
                                 |
                                 v
                         +--------------+
                         | Multi-Role   |
                         | Architecture |
                         |              |
                         | - Tutor      |
                         | - Client     |
                         | - Agent      |
                         +--------------+
                                 |
                 +---------------+---------------+
                 |                               |
                 v                               v
         +---------------+               +---------------+
         | Commission    |               | Delegation    |
         | Calculation   |<--------------| Override      |
         |               |               |               |
         | Default Split |               | listings.     |
         | 80/10/10      |               | delegate_     |
         | (Tutor/Agent/ |               | commission_   |
         |  Platform)    |               | to_profile_id |
         +---------------+               +---------------+
                 |
                 v
         +---------------+
         | Transactions  |
         | (Commission   |
         |  Ledger)      |
         +---------------+
```

### 1.2 Core Components

1. **Referral Code Generation**: 7-character alphanumeric codes (62^7 = 3.5 trillion combinations)
2. **Attribution Capture**: URL parameters, first-party cookies, manual entry
3. **Hierarchical Resolution**: Priority-based attribution assignment
4. **Identity Binding**: Permanent `referred_by_profile_id` stamp at signup
5. **Multi-Role Support**: Users can simultaneously be tutor, client, and agent
6. **Commission Delegation**: Service providers can redirect commissions to partners
7. **Transaction Ledger**: Immutable audit trail of all commission payments

### 1.3 Key Patent Elements

| Element | Database Column | Status | Patent Reference |
|---------|-----------------|--------|------------------|
| Identity-Level Binding | `profiles.referred_by_profile_id` |  Implemented | Section 4, Claim 1(d) |
| Multi-Role Architecture | `profiles.roles[]` |  Implemented | Section 6, Claim 1(e) |
| Commission Delegation | `listings.delegate_commission_to_profile_id` |  Implemented | Section 7, Dep. Claim 9 |
| Referral Code | `profiles.referral_code` |  Implemented | Section 2.1, Claim 1(a) |
| Commission Ledger | `transactions` table |  Implemented | Section 8, Claim 1(g) |
| Hierarchical Attribution | `handle_new_user()` trigger | =� Partial | Section 3, Dep. Claim 2 |

---

## 2. Database Schema (Complete)

### 2.1 Profiles Table (Identity & Attribution)

```sql
-- Migration 035: Add referral_code column
-- Migration 042: Add referred_by_profile_id column
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,

  -- Multi-Role Architecture (Patent Section 6)
  roles TEXT[] DEFAULT '{}', -- ['tutor', 'client', 'agent']

  -- Referral System (Patent Section 2.1, 4)
  referral_code TEXT UNIQUE NOT NULL, -- 7-char alphanumeric (e.g., 'kRz7Bq2')
  referred_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- IMMUTABLE after creation

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by_profile_id);

-- Immutability constraint (Patent Section 4.3)
CREATE OR REPLACE FUNCTION enforce_referred_by_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.referred_by_profile_id IS NOT NULL AND NEW.referred_by_profile_id != OLD.referred_by_profile_id THEN
    RAISE EXCEPTION 'referred_by_profile_id cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_referred_by_immutable
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION enforce_referred_by_immutability();

-- Referral code generation (Migration 035)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * 62 + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**Key Constraints:**
- `referral_code`: UNIQUE, NOT NULL, 7 characters
- `referred_by_profile_id`: IMMUTABLE after first set (enforced by trigger)
- `roles`: Array supports multiple roles simultaneously

### 2.2 Referrals Table (Tracking & Analytics)

```sql
-- Migration 050: Create referrals table
-- Migration 051: Rename referrer_profile_id to agent_id
CREATE TYPE referral_status_enum AS ENUM (
  'Referred',    -- URL clicked / cookie set
  'Signed Up',   -- Account created
  'Converted',   -- First booking completed
  'Inactive'     -- Marked inactive (e.g., user deleted account)
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution (Patent Section 8.1)
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Referrer
  referred_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Referred user (NULL = anonymous)

  -- Status tracking
  status referral_status_enum NOT NULL DEFAULT 'Referred',

  -- Metadata (for analytics)
  referral_source TEXT, -- 'url', 'cookie', 'manual', 'qr' (future)
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ -- When status changed to 'Converted'
);

-- Indexes
CREATE INDEX idx_referrals_agent ON referrals(agent_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_profile_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_created_at ON referrals(created_at DESC);

-- Prevent duplicate active referrals (business rule)
CREATE UNIQUE INDEX idx_referrals_unique_active
ON referrals(agent_id, referred_profile_id)
WHERE status != 'Inactive';
```

**Status Lifecycle:**
1. `Referred`: Referral link clicked (record created)
2. `Signed Up`: User completed registration (`handle_new_user()` trigger)
3. `Converted`: User made first booking (updated by booking system)
4. `Inactive`: User account deleted or referral invalidated

### 2.3 Listings Table (Delegation Configuration)

```sql
-- Migration 034: Add delegate_commission_to_profile_id
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Service provider (tutor)
  service_provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Listing details
  title TEXT NOT NULL,
  description TEXT,
  hourly_rate_gbp NUMERIC(10,2) NOT NULL,

  -- Commission Delegation (Patent Section 7, Dependent Claim 9)
  delegate_commission_to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_listings_provider ON listings(service_provider_id);
CREATE INDEX idx_listings_delegation ON listings(delegate_commission_to_profile_id)
WHERE delegate_commission_to_profile_id IS NOT NULL;

-- Prevent self-delegation (business rule)
CREATE OR REPLACE FUNCTION prevent_self_delegation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delegate_commission_to_profile_id IS NOT NULL
     AND NEW.delegate_commission_to_profile_id = NEW.service_provider_id THEN
    RAISE EXCEPTION 'Cannot delegate commission to self';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_self_delegation
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION prevent_self_delegation();
```

**Delegation Logic (Patent Section 7.4):**
- **NULL**: Default behavior - commission goes to tutor's referrer
- **UUID**: Override - commission goes to specified profile IF tutor is direct referrer of client

### 2.4 Bookings Table (Transaction Attribution)

```sql
-- Existing bookings table with referral context
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction parties
  client_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  tutor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,

  -- Financial details
  total_amount_gbp NUMERIC(10,2) NOT NULL,
  platform_fee_gbp NUMERIC(10,2) NOT NULL,
  tutor_payout_gbp NUMERIC(10,2) NOT NULL,

  -- Commission attribution (calculated at booking time)
  commission_recipient_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  commission_amount_gbp NUMERIC(10,2),
  delegation_applied BOOLEAN DEFAULT FALSE, -- TRUE if delegation override was used

  -- Status
  status TEXT NOT NULL, -- 'pending', 'confirmed', 'completed', 'cancelled'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_bookings_client ON bookings(client_profile_id);
CREATE INDEX idx_bookings_tutor ON bookings(tutor_profile_id);
CREATE INDEX idx_bookings_commission_recipient ON bookings(commission_recipient_profile_id);
CREATE INDEX idx_bookings_status ON bookings(status);
```

### 2.5 Transactions Table (Commission Ledger)

```sql
-- Financials system - transactions table
CREATE TYPE transaction_type_enum AS ENUM (
  'booking_payment',
  'tutor_payout',
  'agent_commission',
  'platform_fee',
  'refund',
  'withdrawal'
);

CREATE TYPE transaction_status_enum AS ENUM (
  'pending',      -- Transaction created
  'available',    -- Funds available (after hold period)
  'scheduled',    -- Queued for payout
  'paid_out',     -- Successfully paid
  'failed',       -- Payment failed
  'cancelled'     -- Transaction cancelled
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Transaction details
  type transaction_type_enum NOT NULL,
  status transaction_status_enum NOT NULL DEFAULT 'pending',
  amount_gbp NUMERIC(10,2) NOT NULL,

  -- Metadata
  description TEXT,
  stripe_transaction_id TEXT,

  -- Referral context (for agent_commission types)
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  delegation_applied BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  available_at TIMESTAMPTZ, -- When funds become available
  scheduled_at TIMESTAMPTZ, -- When payout is scheduled
  paid_out_at TIMESTAMPTZ,  -- When payout completed

  -- Audit
  created_by_rpc TEXT -- Name of RPC function that created transaction
);

-- Indexes
CREATE INDEX idx_transactions_profile ON transactions(profile_id);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_referral ON transactions(referral_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

---

## 3. Referral Identifier Generation

### 3.1 Algorithm Specification

**Requirements:**
- 7 characters long
- Alphanumeric only (A-Z, a-z, 0-9)
- Case-sensitive
- Globally unique
- Collision-resistant

**Character Set:**
- Total characters: 62 (26 uppercase + 26 lowercase + 10 digits)
- Total combinations: 62^7 = 3,521,614,606,208 (3.5 trillion)

**Collision Probability:**
- With 1 million users: ~0.00003% chance of collision
- With 10 million users: ~0.003% chance of collision

### 3.2 PostgreSQL Implementation

```sql
-- Migration 035: Referral code generation function
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT;
  max_attempts INT := 10;
  attempt INT := 0;
BEGIN
  LOOP
    result := '';

    -- Generate 7-character code
    FOR i IN 1..7 LOOP
      result := result || substr(chars, floor(random() * 62 + 1)::int, 1);
    END LOOP;

    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = result) THEN
      RETURN result;
    END IF;

    -- Collision detected - retry
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger to auto-generate code on profile creation
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_referral_code
BEFORE INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION set_referral_code();
```

### 3.3 Example Codes

```
kRz7Bq2  � Case-sensitive (k != K)
Xx3pL9m
A1b2C3d
TutWise  � Valid but not randomly generated
```

---

## 4. Metadata Capture Mechanisms

### 4.1 URL Parameter Capture (Priority 1)

**Implementation:** `/apps/web/src/app/a/[referral_id]/route.ts`

**Flow:**
1. User clicks referral link: `https://tutorwise.co.uk/a/kRz7Bq2`
2. Route handler validates referral code
3. Creates `referrals` record with `status = 'Referred'`
4. If user not logged in: Sets secure cookie
5. Redirects to homepage or specified destination

**Code:**
```typescript
// route.ts (Simplified)
export async function GET(
  request: NextRequest,
  { params }: { params: { referral_id: string } }
) {
  const { referral_id } = params;
  const supabase = await createClient();

  // 1. Validate referral code
  const { data: referrerProfile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referral_id) // Case-sensitive
    .single();

  if (error || !referrerProfile) {
    return NextResponse.redirect(new URL('/?error=invalid_referral', request.url));
  }

  const agent_id = referrerProfile.id;

  // 2. Check authentication
  const { data: { user } } = await supabase.auth.getUser();

  // 3. Create referral record
  if (user) {
    // LOGGED IN: Create with referred_profile_id
    await supabase.from('referrals').insert({
      agent_id,
      referred_profile_id: user.id,
      status: 'Referred'
    });
  } else {
    // ANONYMOUS: Create without referred_profile_id, set cookie
    const { data: referralRecord } = await supabase
      .from('referrals')
      .insert({
        agent_id,
        referred_profile_id: null,
        status: 'Referred'
      })
      .select('id')
      .single();

    if (referralRecord) {
      const cookieStore = cookies();
      cookieStore.set('tutorwise_referral_id', referralRecord.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }
  }

  // 4. Redirect
  const redirectPath = request.nextUrl.searchParams.get('redirect');
  const redirectUrl = redirectPath
    ? new URL(redirectPath, request.url)
    : new URL('/', request.url);

  return NextResponse.redirect(redirectUrl);
}
```

**Supported URL Formats:**
- Format 1: `/a/kRz7Bq2` � redirects to homepage
- Format 2: `/a/kRz7Bq2?redirect=/listings/abc123` � redirects to specific listing

### 4.2 Cookie Fallback (Priority 2)

**Cookie Name:** `tutorwise_referral_id`

**Cookie Attributes:**
```javascript
{
  httpOnly: true,         // Not accessible via JavaScript (XSS protection)
  secure: true,           // HTTPS only (production)
  sameSite: 'lax',        // CSRF protection
  maxAge: 2592000,        // 30 days in seconds
  path: '/',              // Available site-wide
}
```

**Cookie Value:** UUID of `referrals.id` record (NOT the referral_code)

**Security Enhancement (Future - HMAC Signature):**
```javascript
// PLANNED: Add HMAC signature to prevent cookie tampering
const signature = crypto
  .createHmac('sha256', process.env.REFERRAL_COOKIE_SECRET)
  .update(referralId)
  .digest('hex');

const cookieValue = `${referralId}.${signature}`;

// Validation:
const [id, sig] = cookieValue.split('.');
const expectedSig = crypto
  .createHmac('sha256', process.env.REFERRAL_COOKIE_SECRET)
  .update(id)
  .digest('hex');

if (sig !== expectedSig) {
  throw new Error('Invalid cookie signature');
}
```

### 4.3 Manual Entry (Priority 3)

**Implementation:** Signup form with optional referral code field

**UI Component:**
```typescript
// SignupForm.tsx
<FormField>
  <Label htmlFor="referralCode">
    Referral Code (Optional)
  </Label>
  <Input
    id="referralCode"
    name="referralCode"
    placeholder="e.g., kRz7Bq2"
    maxLength={7}
    pattern="[A-Za-z0-9]{7}"
  />
  <FormDescription>
    Have a referral code? Enter it here to credit your referrer.
  </FormDescription>
</FormField>
```

**Server-Side Validation:**
```typescript
// Signup API route
const { referralCode } = formData;

if (referralCode) {
  const { data: referrerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .single();

  if (referrerProfile) {
    // Store in session metadata for handle_new_user() trigger
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          referral_code_manual: referralCode,
        },
      },
    });
  }
}
```

---

## 5. Attribution Resolution Algorithm

### 5.1 Hierarchical Priority (Patent Section 3)

**Priority Order:**
1. URL Parameter (highest priority)
2. First-Party Cookie
3. Manual Code Entry (lowest priority)

**Decision Tree:**
```
User signs up

    Check URL parameter (?ref=kRz7Bq2)
      If present � Use this agent_id
    
    Check cookie (tutorwise_referral_id)
      If valid � Lookup agent_id from referrals.id
    
    Check manual entry (auth.users.raw_user_meta_data.referral_code_manual)
      If present � Lookup agent_id from profiles.referral_code
```

### 5.2 Implementation: handle_new_user() Trigger

**File:** `/apps/api/migrations/090_fix_handle_new_user_remove_referral_id.sql`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_code TEXT;
BEGIN
  -- Step 1: Extract referral code from user metadata (manual entry)
  v_referral_code := NULLIF(TRIM(new.raw_user_meta_data->>'referral_code_manual'), '');

  -- Step 2: Lookup referrer profile ID
  IF v_referral_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_referral_code;
  END IF;

  -- Step 3: Create profile with attribution
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    referred_by_profile_id  -- Identity-level binding (Patent Section 4)
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    v_referrer_id  -- NULL if no referrer
  );

  -- Step 4: Update existing "Referred" record to "Signed Up"
  IF v_referrer_id IS NOT NULL THEN
    UPDATE public.referrals
    SET
      referred_profile_id = new.id,
      status = 'Signed Up'
    WHERE id = (
      SELECT id FROM public.referrals
      WHERE agent_id = v_referrer_id
        AND referred_profile_id IS NULL
        AND status = 'Referred'
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  RETURN new;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Current Limitations (Partial Implementation):**
-  Manual entry: WORKING
- L Cookie fallback: NOT IMPLEMENTED in trigger (planned Q1 2026)
- L URL parameter: NOT IMPLEMENTED (planned Q1 2026)

**Planned Enhancement (Q1 2026):**
```sql
-- PLANNED: Enhanced attribution resolution
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_code TEXT;
  v_cookie_referral_id UUID;
  v_attribution_method TEXT;
BEGIN
  -- Priority 1: URL parameter (stored in session)
  v_referral_code := new.raw_user_meta_data->>'referral_code_url';
  IF v_referral_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = v_referral_code;
    IF v_referrer_id IS NOT NULL THEN
      v_attribution_method := 'url_parameter';
    END IF;
  END IF;

  -- Priority 2: Cookie (if URL not found)
  IF v_referrer_id IS NULL THEN
    v_cookie_referral_id := new.raw_user_meta_data->>'referral_cookie_id';
    IF v_cookie_referral_id IS NOT NULL THEN
      SELECT agent_id INTO v_referrer_id FROM referrals WHERE id = v_cookie_referral_id;
      IF v_referrer_id IS NOT NULL THEN
        v_attribution_method := 'cookie';
      END IF;
    END IF;
  END IF;

  -- Priority 3: Manual entry (if cookie not found)
  IF v_referrer_id IS NULL THEN
    v_referral_code := new.raw_user_meta_data->>'referral_code_manual';
    IF v_referral_code IS NOT NULL THEN
      SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = v_referral_code;
      IF v_referrer_id IS NOT NULL THEN
        v_attribution_method := 'manual_entry';
      END IF;
    END IF;
  END IF;

  -- Create profile with attribution
  INSERT INTO profiles (id, email, full_name, referred_by_profile_id)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''), v_referrer_id);

  -- Update referral record with attribution method
  IF v_referrer_id IS NOT NULL THEN
    UPDATE referrals
    SET
      referred_profile_id = new.id,
      status = 'Signed Up',
      referral_source = v_attribution_method
    WHERE id = (
      SELECT id FROM referrals
      WHERE agent_id = v_referrer_id
        AND referred_profile_id IS NULL
        AND status = 'Referred'
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Identity-Level Binding Implementation

### 6.1 Core Patent Element (Section 4, Claim 1d)

**Concept:** Once a user signs up, their `referred_by_profile_id` is **permanently** bound to their profile. This survives:
- Role changes (client � tutor)
- Multiple bookings
- Account modifications
- Years of platform usage

**Why This Matters:**
- Traditional systems: Attribution expires after 30-90 days
- TutorWise system: Lifetime attribution (no expiry)
- Revenue Impact: Agent earns commission forever on referred user's activity

### 6.2 Immutability Enforcement

**Database Constraint:**
```sql
-- Trigger prevents modification
CREATE OR REPLACE FUNCTION enforce_referred_by_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.referred_by_profile_id IS NOT NULL
     AND NEW.referred_by_profile_id != OLD.referred_by_profile_id THEN
    RAISE EXCEPTION 'referred_by_profile_id cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_referred_by_immutable
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION enforce_referred_by_immutability();
```

**Test Case:**
```sql
-- Setup: Create agent and referred user
INSERT INTO profiles (id, email, full_name, referral_code)
VALUES
  ('agent-uuid', 'agent@example.com', 'Agent Smith', 'kRz7Bq2'),
  ('user-uuid', 'user@example.com', 'John Doe', 'Xx3pL9m');

UPDATE profiles
SET referred_by_profile_id = 'agent-uuid'
WHERE id = 'user-uuid';
--  Succeeds (first assignment)

UPDATE profiles
SET referred_by_profile_id = 'different-uuid'
WHERE id = 'user-uuid';
-- L Fails: "referred_by_profile_id cannot be changed once set"
```

### 6.3 Audit Trail

**Tracking Attribution Changes (for debugging only):**
```sql
-- Optional: Audit log for attribution attempts
CREATE TABLE referral_attribution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  attempted_referrer_id UUID,
  current_referrer_id UUID,
  attribution_method TEXT,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example usage in handle_new_user()
INSERT INTO referral_attribution_audit (
  profile_id,
  attempted_referrer_id,
  current_referrer_id,
  attribution_method,
  success
) VALUES (
  new.id,
  v_referrer_id,
  v_referrer_id,
  v_attribution_method,
  TRUE
);
```

---

## 7. Multi-Role Architecture

### 7.1 Concept (Patent Section 6, Claim 1e)

**Traditional Systems:**
- User is EITHER tutor OR client (mutually exclusive)
- Separate databases/accounts for different roles

**TutorWise System:**
- User can be tutor AND client AND agent simultaneously
- Single profile, multiple roles
- Enables supply-side agent acquisition (tutors can refer tutors)

### 7.2 Role Array Implementation

```sql
-- profiles.roles column (TEXT array)
roles TEXT[] DEFAULT '{}'

-- Example profiles:
-- User A: ['tutor'] - Only provides services
-- User B: ['client'] - Only books services
-- User C: ['tutor', 'client'] - Provides AND books services
-- User D: ['tutor', 'agent'] - Tutor who actively refers others
```

**Role Check Functions:**
```sql
-- Check if user has specific role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
      AND role_name = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT has_role('user-uuid', 'tutor'); -- TRUE/FALSE
```

### 7.3 Use Cases

**Use Case 1: Tutor Refers Another Tutor (Supply-Side Agent Acquisition)**
```
Timeline:
1. Tutor A (referral_code: kRz7Bq2) shares link with Tutor B
2. Tutor B signs up via /a/kRz7Bq2
3. Tutor B's profile: referred_by_profile_id = Tutor A's ID
4. Tutor B creates listing and gets bookings
5. Tutor A earns 10% commission on ALL Tutor B's future earnings
```

**Use Case 2: Client Becomes Tutor (Role Evolution)**
```
Timeline:
1. User starts as client (roles = ['client'])
2. User gets referred by Agent A
3. User completes profile, adds tutor role (roles = ['client', 'tutor'])
4. User creates listing
5. Agent A earns commission when User (now tutor) receives bookings
```

**Use Case 3: Agent-Only Profile (Pure Referrer)**
```
Timeline:
1. User signs up, doesn't select tutor or client
2. User shares referral link (referral_code: Xx3pL9m)
3. Multiple users sign up and become tutors
4. Agent earns commission from all referred tutors' bookings
5. Agent never provides or books services
```

---

## 8. Commission Delegation Mechanism

### 8.1 Overview (Patent Section 7, Dependent Claim 9)

**Problem:**
- Tutor wants to partner with coffee shop to display physical flyers
- Traditional solution: Coffee shop creates agent account, shares link
- **Issue:** If tutor has their own agent, coffee shop doesn't get credit

**TutorWise Solution:**
- Tutor configures `listings.delegate_commission_to_profile_id = coffee_shop_id`
- **Conditional delegation:** Commission only goes to coffee shop when tutor is the DIRECT referrer
- **Protection:** If third-party agent brings client, original agent gets paid

### 8.2 Database Schema

```sql
-- listings table (Migration 034)
ALTER TABLE listings
ADD COLUMN delegate_commission_to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN listings.delegate_commission_to_profile_id IS
'[Patent Section 7] Conditional commission delegation: When set, commissions for bookings
on this listing are redirected to the specified profile_id IF AND ONLY IF the service
provider (tutor) is the direct referrer of the client. If a third-party agent referred
the client, the commission goes to that agent instead, protecting agent attribution rights.';
```

### 8.3 Delegation Algorithm (Patent Section 7.4)

**Pseudocode:**
```
FUNCTION determine_commission_recipient(booking):
  listing = lookup_listing(booking.listing_id)
  tutor = lookup_profile(listing.service_provider_id)
  client = lookup_profile(booking.client_profile_id)

  // No delegation configured - default behavior
  IF listing.delegate_commission_to_profile_id IS NULL:
    RETURN tutor.referred_by_profile_id  // Tutor's agent

  // Delegation configured - check conditions
  delegation_target = listing.delegate_commission_to_profile_id

  // Condition: Is tutor the DIRECT referrer of client?
  IF client.referred_by_profile_id == tutor.id:
    // YES: Delegation applies - pay partner
    RETURN delegation_target
  ELSE:
    // NO: Third-party agent brought client - pay original agent
    RETURN client.referred_by_profile_id

END FUNCTION
```

**SQL Implementation (in process_booking_payment RPC):**
```sql
CREATE OR REPLACE FUNCTION process_booking_payment(
  p_booking_id UUID,
  p_total_amount_gbp NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_listing_id UUID;
  v_tutor_id UUID;
  v_client_id UUID;
  v_tutor_payout NUMERIC;
  v_commission NUMERIC;
  v_platform_fee NUMERIC;
  v_commission_recipient_id UUID;
  v_delegation_target_id UUID;
  v_delegation_applied BOOLEAN := FALSE;
BEGIN
  -- Fetch booking details
  SELECT listing_id, tutor_profile_id, client_profile_id
  INTO v_listing_id, v_tutor_id, v_client_id
  FROM bookings
  WHERE id = p_booking_id;

  -- Calculate splits (80/10/10)
  v_platform_fee := p_total_amount_gbp * 0.10;
  v_tutor_payout := p_total_amount_gbp * 0.80;
  v_commission := p_total_amount_gbp * 0.10;

  -- Fetch delegation configuration
  SELECT delegate_commission_to_profile_id
  INTO v_delegation_target_id
  FROM listings
  WHERE id = v_listing_id;

  -- Determine commission recipient (CORE DELEGATION LOGIC)
  IF v_delegation_target_id IS NULL THEN
    -- No delegation: Pay tutor's agent
    SELECT referred_by_profile_id INTO v_commission_recipient_id
    FROM profiles WHERE id = v_tutor_id;
  ELSE
    -- Delegation configured: Check conditions
    DECLARE
      v_client_referrer_id UUID;
    BEGIN
      SELECT referred_by_profile_id INTO v_client_referrer_id
      FROM profiles WHERE id = v_client_id;

      IF v_client_referrer_id = v_tutor_id THEN
        -- Tutor IS direct referrer: Apply delegation
        v_commission_recipient_id := v_delegation_target_id;
        v_delegation_applied := TRUE;
      ELSE
        -- Tutor is NOT direct referrer: Pay third-party agent
        v_commission_recipient_id := v_client_referrer_id;
        v_delegation_applied := FALSE;
      END IF;
    END;
  END IF;

  -- Create transactions
  -- 1. Platform fee
  INSERT INTO transactions (profile_id, booking_id, type, status, amount_gbp, created_by_rpc)
  VALUES (NULL, p_booking_id, 'platform_fee', 'available', v_platform_fee, 'process_booking_payment');

  -- 2. Tutor payout
  INSERT INTO transactions (profile_id, booking_id, type, status, amount_gbp, created_by_rpc)
  VALUES (v_tutor_id, p_booking_id, 'tutor_payout', 'scheduled', v_tutor_payout, 'process_booking_payment');

  -- 3. Agent commission (if recipient exists)
  IF v_commission_recipient_id IS NOT NULL THEN
    INSERT INTO transactions (
      profile_id, booking_id, type, status, amount_gbp,
      delegation_applied, created_by_rpc
    )
    VALUES (
      v_commission_recipient_id, p_booking_id, 'agent_commission', 'scheduled',
      v_commission, v_delegation_applied, 'process_booking_payment'
    );
  END IF;

  -- Update booking record
  UPDATE bookings
  SET
    commission_recipient_profile_id = v_commission_recipient_id,
    commission_amount_gbp = v_commission,
    delegation_applied = v_delegation_applied
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', TRUE,
    'commission_recipient_id', v_commission_recipient_id,
    'delegation_applied', v_delegation_applied,
    'commission_amount_gbp', v_commission
  );
END;
$$ LANGUAGE plpgsql;
```

### 8.4 Worked Examples (Patent Section 7.5)

**Setup:**
- Platform: TutorWise
- Commission split: 80% tutor, 10% agent, 10% platform
- Booking amount: �100

**Example 1: Coffee Shop Partnership (Delegation Applies)**
```
Parties:
- Tutor T (referral_code: tutT123)
- Client C (signs up via Tutor T's link)
- Coffee Shop Partner P (delegation target)

Configuration:
- T.referred_by_profile_id = NULL (organic tutor)
- C.referred_by_profile_id = T.id (tutor referred client)
- listing.delegate_commission_to_profile_id = P.id

Booking: �100
- Platform fee (10%): �10
- Tutor payout (80%): �80
- Commission (10%): �10

Commission Decision Tree:
  1. Delegation target configured? YES (P.id)
  2. Is T direct referrer of C? YES (C.referred_by_profile_id == T.id)
  3. APPLY DELEGATION � Pay P

Final Distribution:
- Platform: �10
- Tutor T: �80
- Coffee Shop P: �10  (delegation applied)
- (No other agent involved)
```

**Example 2: Third-Party Agent Protection (Delegation Ignored)**
```
Parties:
- Agent A (referral_code: agentA99) - Original tutor recruiter
- Tutor T (signed up via Agent A)
- Client C (signed up via external marketing, not referred)
- Coffee Shop Partner P (delegation target)

Configuration:
- A.referred_by_profile_id = NULL (organic agent)
- T.referred_by_profile_id = A.id (Agent A recruited tutor)
- C.referred_by_profile_id = A.id (Agent A also recruited client)
- listing.delegate_commission_to_profile_id = P.id

Booking: �100
- Platform fee (10%): �10
- Tutor payout (80%): �80
- Commission (10%): �10

Commission Decision Tree:
  1. Delegation target configured? YES (P.id)
  2. Is T direct referrer of C? NO (C.referred_by_profile_id == A.id, not T.id)
  3. IGNORE DELEGATION � Pay original agent A

Final Distribution:
- Platform: �10
- Tutor T: �80
- Agent A: �10 (delegation BLOCKED, agent protected)
- Coffee Shop P: �0 (delegation did not apply)
```

**Example 3: Organic Discovery (No Delegation)**
```
Parties:
- Tutor T (no referrer)
- Client C (no referrer, found via Google)
- Coffee Shop Partner P (delegation target)

Configuration:
- T.referred_by_profile_id = NULL
- C.referred_by_profile_id = NULL
- listing.delegate_commission_to_profile_id = P.id

Booking: �100
- Platform fee (10%): �10
- Tutor payout (90%): �90
- Commission (10%): �0 (no agent to pay)

Commission Decision Tree:
  1. Client has referrer? NO (C.referred_by_profile_id = NULL)
  2. No commission owed

Final Distribution:
- Platform: �10
- Tutor T: �90 (gets full 90% since no commission owed)
- Coffee Shop P: �0 (no commission to delegate)
```

### 8.5 Fraud Prevention

**Attack Vector 1: Self-Delegation Loop**
```
Attacker attempts:
- Creates listing
- Sets delegate_commission_to_profile_id = own_id
- Books own service to claim commission

Prevention:
- Database constraint prevents self-delegation
- Additional RLS policies prevent self-booking
```

**Attack Vector 2: Collusion**
```
Attacker attempts:
- Tutor T and Fake Partner F collude
- T sets delegation to F
- T refers clients to inflate F's commissions
- T and F split profits

Prevention:
- Not prevented (legitimate business model)
- Platform monitors unusual patterns (high delegation rates)
- Partner approval process (manual review)
```

**Attack Vector 3: Delegation Hijacking**
```
Attacker attempts:
- Gains access to tutor account
- Changes delegation target to attacker's profile
- Steals future commissions

Prevention:
- Two-factor authentication required for delegation changes
- Email notification on delegation modification
- Delegation change cooldown period (7 days)
```

---

## 9. Commission Calculation Engine

### 9.1 Standard Split (80/10/10)

**Default Configuration:**
- Tutor: 80%
- Agent: 10% (if referrer exists)
- Platform: 10%

**Example: �100 Booking**
```
Total: �100.00
Platform fee: �10.00 (10%)
Tutor payout: �80.00 (80%)
Agent commission: �10.00 (10%)
```

**Edge Case: No Agent**
```
Total: �100.00
Platform fee: �10.00 (10%)
Tutor payout: �90.00 (90%) � Tutor gets extra 10%
```

### 9.2 RPC Function: process_booking_payment

```sql
CREATE OR REPLACE FUNCTION process_booking_payment(
  p_booking_id UUID,
  p_stripe_payment_intent_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_total_amount NUMERIC;
  v_platform_fee NUMERIC;
  v_tutor_payout NUMERIC;
  v_commission NUMERIC;
  v_commission_recipient_id UUID;
  v_delegation_applied BOOLEAN := FALSE;
BEGIN
  -- Fetch booking with all related data
  SELECT
    b.id,
    b.total_amount_gbp,
    b.client_profile_id,
    b.tutor_profile_id,
    b.listing_id,
    l.delegate_commission_to_profile_id,
    p_tutor.referred_by_profile_id AS tutor_agent_id,
    p_client.referred_by_profile_id AS client_agent_id
  INTO v_booking
  FROM bookings b
  JOIN listings l ON b.listing_id = l.id
  JOIN profiles p_tutor ON b.tutor_profile_id = p_tutor.id
  JOIN profiles p_client ON b.client_profile_id = p_client.id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Booking not found');
  END IF;

  v_total_amount := v_booking.total_amount_gbp;

  -- Calculate standard splits
  v_platform_fee := v_total_amount * 0.10;
  v_commission := v_total_amount * 0.10;
  v_tutor_payout := v_total_amount * 0.80;

  -- Apply delegation logic (Section 8.3)
  IF v_booking.delegate_commission_to_profile_id IS NOT NULL THEN
    -- Delegation configured
    IF v_booking.client_agent_id = v_booking.tutor_profile_id THEN
      -- Tutor is direct referrer: Apply delegation
      v_commission_recipient_id := v_booking.delegate_commission_to_profile_id;
      v_delegation_applied := TRUE;
    ELSE
      -- Third-party agent: Ignore delegation
      v_commission_recipient_id := v_booking.client_agent_id;
      v_delegation_applied := FALSE;
    END IF;
  ELSE
    -- No delegation: Default to tutor's agent
    v_commission_recipient_id := v_booking.tutor_agent_id;
  END IF;

  -- If no agent exists, tutor gets extra 10%
  IF v_commission_recipient_id IS NULL THEN
    v_tutor_payout := v_tutor_payout + v_commission;
    v_commission := 0;
  END IF;

  -- Create transaction records
  -- 1. Platform fee (immediate)
  INSERT INTO transactions (
    profile_id, booking_id, type, status, amount_gbp,
    stripe_transaction_id, created_by_rpc, created_at, available_at
  )
  VALUES (
    NULL, -- Platform account
    p_booking_id,
    'platform_fee',
    'available',
    v_platform_fee,
    p_stripe_payment_intent_id,
    'process_booking_payment',
    NOW(),
    NOW()
  );

  -- 2. Tutor payout (scheduled after booking completion)
  INSERT INTO transactions (
    profile_id, booking_id, type, status, amount_gbp,
    stripe_transaction_id, created_by_rpc, created_at
  )
  VALUES (
    v_booking.tutor_profile_id,
    p_booking_id,
    'tutor_payout',
    'pending', -- Becomes 'available' after booking completed
    v_tutor_payout,
    p_stripe_payment_intent_id,
    'process_booking_payment',
    NOW()
  );

  -- 3. Agent commission (if applicable)
  IF v_commission > 0 AND v_commission_recipient_id IS NOT NULL THEN
    INSERT INTO transactions (
      profile_id, booking_id, type, status, amount_gbp,
      delegation_applied, created_by_rpc, created_at
    )
    VALUES (
      v_commission_recipient_id,
      p_booking_id,
      'agent_commission',
      'pending',
      v_commission,
      v_delegation_applied,
      'process_booking_payment',
      NOW()
    );
  END IF;

  -- Update booking with commission details
  UPDATE bookings
  SET
    commission_recipient_profile_id = v_commission_recipient_id,
    commission_amount_gbp = v_commission,
    delegation_applied = v_delegation_applied,
    status = 'payment_processed'
  WHERE id = p_booking_id;

  -- Update referral conversion status
  IF v_commission_recipient_id IS NOT NULL THEN
    UPDATE referrals
    SET
      status = 'Converted',
      converted_at = NOW()
    WHERE agent_id = v_commission_recipient_id
      AND referred_profile_id IN (v_booking.tutor_profile_id, v_booking.client_profile_id)
      AND status != 'Converted';
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'booking_id', p_booking_id,
    'total_amount_gbp', v_total_amount,
    'platform_fee_gbp', v_platform_fee,
    'tutor_payout_gbp', v_tutor_payout,
    'commission_gbp', v_commission,
    'commission_recipient_id', v_commission_recipient_id,
    'delegation_applied', v_delegation_applied
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 9.3 Transaction State Machine

**Status Lifecycle:**
```
pending � available � scheduled � paid_out
   �          �
cancelled  failed
```

**State Definitions:**
- `pending`: Transaction created, awaiting booking completion
- `available`: Funds available for payout (after hold period)
- `scheduled`: Queued for next payout batch
- `paid_out`: Successfully paid to recipient
- `failed`: Payout attempt failed
- `cancelled`: Transaction cancelled (e.g., booking refunded)

**Automated Transitions:**
```sql
-- Cron job: Make payouts available after booking completion + hold period
UPDATE transactions
SET
  status = 'available',
  available_at = NOW()
WHERE status = 'pending'
  AND type IN ('tutor_payout', 'agent_commission')
  AND booking_id IN (
    SELECT id FROM bookings
    WHERE status = 'completed'
      AND completed_at < NOW() - INTERVAL '7 days'
  );

-- Cron job: Schedule weekly payouts
UPDATE transactions
SET
  status = 'scheduled',
  scheduled_at = NOW()
WHERE status = 'available'
  AND type IN ('tutor_payout', 'agent_commission')
  AND available_at < NOW();
```

---

## 10. Referral Ledger & Transactions

### 10.1 Transaction Types

```sql
CREATE TYPE transaction_type_enum AS ENUM (
  'booking_payment',    -- Client pays for booking
  'tutor_payout',       -- Tutor receives earnings
  'agent_commission',   -- Agent receives commission
  'platform_fee',       -- Platform takes fee
  'refund',             -- Booking refunded
  'withdrawal'          -- User withdraws balance
);
```

### 10.2 Query Examples

**Get Agent's Total Earnings:**
```sql
SELECT
  profile_id,
  SUM(amount_gbp) FILTER (WHERE status = 'paid_out') AS total_paid_out,
  SUM(amount_gbp) FILTER (WHERE status = 'available') AS available_balance,
  SUM(amount_gbp) FILTER (WHERE status = 'scheduled') AS pending_payout,
  COUNT(*) AS total_transactions
FROM transactions
WHERE type = 'agent_commission'
  AND profile_id = 'agent-uuid'
GROUP BY profile_id;
```

**Get Booking Commission Details:**
```sql
SELECT
  b.id AS booking_id,
  b.total_amount_gbp,
  t_platform.amount_gbp AS platform_fee,
  t_tutor.amount_gbp AS tutor_payout,
  t_commission.amount_gbp AS commission,
  t_commission.profile_id AS commission_recipient_id,
  b.delegation_applied,
  p.full_name AS commission_recipient_name
FROM bookings b
LEFT JOIN transactions t_platform ON b.id = t_platform.booking_id
  AND t_platform.type = 'platform_fee'
LEFT JOIN transactions t_tutor ON b.id = t_tutor.booking_id
  AND t_tutor.type = 'tutor_payout'
LEFT JOIN transactions t_commission ON b.id = t_commission.booking_id
  AND t_commission.type = 'agent_commission'
LEFT JOIN profiles p ON t_commission.profile_id = p.id
WHERE b.id = 'booking-uuid';
```

**Delegation Performance Analytics:**
```sql
SELECT
  l.id AS listing_id,
  l.title,
  p_delegate.full_name AS delegation_partner,
  COUNT(*) AS total_bookings,
  SUM(CASE WHEN b.delegation_applied THEN 1 ELSE 0 END) AS delegated_bookings,
  SUM(b.commission_amount_gbp) FILTER (WHERE b.delegation_applied) AS partner_earnings,
  ROUND(
    SUM(CASE WHEN b.delegation_applied THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100,
    2
  ) AS delegation_rate_percent
FROM listings l
LEFT JOIN profiles p_delegate ON l.delegate_commission_to_profile_id = p_delegate.id
LEFT JOIN bookings b ON l.id = b.listing_id
WHERE l.delegate_commission_to_profile_id IS NOT NULL
  AND b.status = 'completed'
GROUP BY l.id, l.title, p_delegate.full_name
ORDER BY delegation_rate_percent DESC;
```

### 10.3 Audit Trail

**Immutability:** Transactions are never deleted, only cancelled

**Audit Query:**
```sql
SELECT
  t.id,
  t.type,
  t.status,
  t.amount_gbp,
  t.created_at,
  t.created_by_rpc,
  p.full_name AS recipient,
  b.id AS booking_id
FROM transactions t
LEFT JOIN profiles p ON t.profile_id = p.id
LEFT JOIN bookings b ON t.booking_id = b.id
WHERE t.profile_id = 'user-uuid'
ORDER BY t.created_at DESC;
```

---

## 11. API Endpoints

### 11.1 Referral Link Handler

**Route:** `/app/a/[referral_id]/route.ts`

**Method:** GET

**URL:** `https://tutorwise.co.uk/a/kRz7Bq2` or `https://tutorwise.co.uk/a/kRz7Bq2?redirect=/listings/abc123`

**See Section 4.1 for full implementation.**

### 11.2 Profile API (Referral Code Lookup)

**Route:** `/app/api/profile/referral-info/route.ts`

**Method:** GET

**Query Params:** `?code=kRz7Bq2`

```typescript
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, referral_code')
    .eq('referral_code', code)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  return NextResponse.json({
    referrer: {
      name: profile.full_name,
      avatar: profile.avatar_url,
    },
  });
}
```

**Response Example:**
```json
{
  "referrer": {
    "name": "Agent Smith",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

### 11.3 Referral Stats API (Agent Dashboard)

**Route:** `/app/api/referrals/stats/route.ts`

**Method:** GET

**Authentication:** Required (returns stats for authenticated user)

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get referral pipeline stats
  const { data: referrals } = await supabase
    .from('referrals')
    .select('status')
    .eq('agent_id', user.id);

  const stats = {
    clicked: referrals?.filter(r => r.status === 'Referred').length || 0,
    signed_up: referrals?.filter(r => r.status === 'Signed Up').length || 0,
    converted: referrals?.filter(r => r.status === 'Converted').length || 0,
  };

  // Get earnings
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount_gbp, status')
    .eq('profile_id', user.id)
    .eq('type', 'agent_commission');

  const earnings = {
    total_earned: transactions
      ?.filter(t => t.status === 'paid_out')
      .reduce((sum, t) => sum + parseFloat(t.amount_gbp), 0) || 0,
    pending: transactions
      ?.filter(t => t.status === 'available' || t.status === 'scheduled')
      .reduce((sum, t) => sum + parseFloat(t.amount_gbp), 0) || 0,
  };

  return NextResponse.json({
    referrals: stats,
    earnings,
  });
}
```

**Response Example:**
```json
{
  "referrals": {
    "clicked": 45,
    "signed_up": 23,
    "converted": 8
  },
  "earnings": {
    "total_earned": 450.00,
    "pending": 120.00
  }
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests (Database Functions)

**Test: Referral Code Generation**
```sql
-- Test uniqueness
DO $$
DECLARE
  codes TEXT[];
  code TEXT;
BEGIN
  FOR i IN 1..1000 LOOP
    code := generate_referral_code();
    IF code = ANY(codes) THEN
      RAISE EXCEPTION 'Duplicate code generated: %', code;
    END IF;
    codes := array_append(codes, code);
  END LOOP;

  RAISE NOTICE 'Generated 1000 unique codes successfully';
END $$;

-- Test format (7 alphanumeric characters)
DO $$
DECLARE
  code TEXT;
BEGIN
  FOR i IN 1..100 LOOP
    code := generate_referral_code();
    IF LENGTH(code) != 7 THEN
      RAISE EXCEPTION 'Invalid code length: %', code;
    END IF;
    IF code !~ '^[A-Za-z0-9]{7}$' THEN
      RAISE EXCEPTION 'Invalid code format: %', code;
    END IF;
  END LOOP;

  RAISE NOTICE 'All codes match format [A-Za-z0-9]{7}';
END $$;
```

**Test: Immutability Enforcement**
```sql
-- Setup
INSERT INTO profiles (id, email, full_name, referral_code)
VALUES
  ('test-agent', 'agent@test.com', 'Test Agent', 'testAg1'),
  ('test-user', 'user@test.com', 'Test User', 'testUs1');

-- First assignment (should succeed)
UPDATE profiles
SET referred_by_profile_id = 'test-agent'
WHERE id = 'test-user';

-- Attempt to change (should fail)
DO $$
BEGIN
  UPDATE profiles
  SET referred_by_profile_id = 'different-uuid'
  WHERE id = 'test-user';

  RAISE EXCEPTION 'Immutability constraint failed - update should have been blocked';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%referred_by_profile_id cannot be changed%' THEN
      RAISE NOTICE 'Immutability test PASSED';
    ELSE
      RAISE;
    END IF;
END $$;

-- Cleanup
DELETE FROM profiles WHERE id IN ('test-agent', 'test-user');
```

### 12.2 Integration Tests (API Routes)

**Test: Referral Link Click (Anonymous User)**
```typescript
// tests/referrals/link-handler.test.ts
import { describe, it, expect } from 'vitest';

describe('Referral Link Handler', () => {
  it('should create referral record and set cookie for anonymous user', async () => {
    // Setup: Create agent profile
    const agent = await createTestProfile({ referral_code: 'testAg1' });

    // Act: Click referral link
    const response = await fetch('http://localhost:3000/a/testAg1', {
      redirect: 'manual',
    });

    // Assert: Redirect with cookie
    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get('location')).toBe('/');

    const cookies = response.headers.get('set-cookie');
    expect(cookies).toContain('tutorwise_referral_id=');
    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('SameSite=Lax');

    // Verify referral record created
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('status', 'Referred')
      .is('referred_profile_id', null);

    expect(referrals).toHaveLength(1);
  });

  it('should create referral record with profile_id for logged-in user', async () => {
    // Setup: Create agent and user
    const agent = await createTestProfile({ referral_code: 'testAg1' });
    const user = await createTestProfile({});
    const session = await createTestSession(user);

    // Act: Click referral link while logged in
    const response = await fetch('http://localhost:3000/a/testAg1', {
      redirect: 'manual',
      headers: {
        'Cookie': `sb-access-token=${session.access_token}`,
      },
    });

    // Assert: Referral record with profile_id
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('referred_profile_id', user.id)
      .eq('status', 'Referred');

    expect(referrals).toHaveLength(1);
  });
});
```

### 12.3 E2E Tests (Commission Delegation)

**Test: Delegation Applied (Coffee Shop Partnership)**
```typescript
describe('Commission Delegation', () => {
  it('should pay delegated partner when tutor is direct referrer', async () => {
    // Setup
    const partner = await createTestProfile({ full_name: 'Coffee Shop' });
    const tutor = await createTestProfile({
      full_name: 'Tutor',
      roles: ['tutor'],
    });
    const client = await createTestProfile({
      full_name: 'Client',
      referred_by_profile_id: tutor.id, // Tutor referred client
    });

    const listing = await createTestListing({
      service_provider_id: tutor.id,
      delegate_commission_to_profile_id: partner.id, // Delegation configured
      hourly_rate_gbp: 100,
    });

    // Act: Create booking
    const booking = await createTestBooking({
      listing_id: listing.id,
      client_profile_id: client.id,
      tutor_profile_id: tutor.id,
      total_amount_gbp: 100,
    });

    // Process payment
    const result = await supabase.rpc('process_booking_payment', {
      p_booking_id: booking.id,
      p_stripe_payment_intent_id: 'test_pi_123',
    });

    // Assert: Partner received commission
    expect(result.data.delegation_applied).toBe(true);
    expect(result.data.commission_recipient_id).toBe(partner.id);
    expect(result.data.commission_gbp).toBe(10);

    // Verify transaction created
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('type', 'agent_commission');

    expect(transactions).toHaveLength(1);
    expect(transactions[0].profile_id).toBe(partner.id);
    expect(transactions[0].amount_gbp).toBe('10.00');
    expect(transactions[0].delegation_applied).toBe(true);
  });

  it('should pay original agent when third party referred client', async () => {
    // Setup
    const agent = await createTestProfile({ full_name: 'Agent' });
    const partner = await createTestProfile({ full_name: 'Coffee Shop' });
    const tutor = await createTestProfile({
      full_name: 'Tutor',
      roles: ['tutor'],
      referred_by_profile_id: agent.id, // Agent recruited tutor
    });
    const client = await createTestProfile({
      full_name: 'Client',
      referred_by_profile_id: agent.id, // Agent also recruited client
    });

    const listing = await createTestListing({
      service_provider_id: tutor.id,
      delegate_commission_to_profile_id: partner.id, // Delegation configured
      hourly_rate_gbp: 100,
    });

    // Act: Create booking
    const booking = await createTestBooking({
      listing_id: listing.id,
      client_profile_id: client.id,
      tutor_profile_id: tutor.id,
      total_amount_gbp: 100,
    });

    const result = await supabase.rpc('process_booking_payment', {
      p_booking_id: booking.id,
      p_stripe_payment_intent_id: 'test_pi_123',
    });

    // Assert: Original agent received commission (delegation blocked)
    expect(result.data.delegation_applied).toBe(false);
    expect(result.data.commission_recipient_id).toBe(agent.id);
    expect(result.data.commission_gbp).toBe(10);

    // Verify partner did NOT receive commission
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('profile_id', partner.id);

    expect(transactions).toHaveLength(0);
  });
});
```

---

## 13. Performance & Scalability

### 13.1 Database Indexes

**Critical Indexes:**
```sql
-- Referral lookups (hot path)
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code); --  Exists
CREATE INDEX idx_referrals_agent ON referrals(agent_id); --  Exists

-- Commission queries
CREATE INDEX idx_transactions_profile_type ON transactions(profile_id, type); -- TODO
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status IN ('available', 'scheduled'); -- TODO

-- Delegation performance
CREATE INDEX idx_listings_delegation ON listings(delegate_commission_to_profile_id)
WHERE delegate_commission_to_profile_id IS NOT NULL; --  Exists
```

### 13.2 Query Optimization

**Slow Query Example:**
```sql
-- SLOW: Scans all referrals
SELECT COUNT(*) FROM referrals
WHERE agent_id = 'user-uuid'
  AND status = 'Converted';
```

**Optimized:**
```sql
-- FAST: Uses composite index
CREATE INDEX idx_referrals_agent_status ON referrals(agent_id, status);

SELECT COUNT(*) FROM referrals
WHERE agent_id = 'user-uuid'
  AND status = 'Converted';
```

### 13.3 Caching Strategy

**Referral Code Validation (Redis):**
```typescript
// Cache valid referral codes for 1 hour
async function validateReferralCode(code: string): Promise<boolean> {
  const cacheKey = `referral:${code}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return cached === '1';
  }

  // Query database
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', code)
    .single();

  const isValid = !!data;

  // Cache result (1 hour TTL)
  await redis.setex(cacheKey, 3600, isValid ? '1' : '0');

  return isValid;
}
```

**Agent Stats (Computed Cache):**
```sql
-- Materialized view for agent dashboard (refreshed daily)
CREATE MATERIALIZED VIEW agent_stats AS
SELECT
  r.agent_id,
  COUNT(*) FILTER (WHERE r.status = 'Referred') AS clicks,
  COUNT(*) FILTER (WHERE r.status = 'Signed Up') AS signups,
  COUNT(*) FILTER (WHERE r.status = 'Converted') AS conversions,
  COALESCE(SUM(t.amount_gbp) FILTER (WHERE t.status = 'paid_out'), 0) AS total_earned,
  COALESCE(SUM(t.amount_gbp) FILTER (WHERE t.status IN ('available', 'scheduled')), 0) AS pending_balance
FROM referrals r
LEFT JOIN transactions t ON r.agent_id = t.profile_id AND t.type = 'agent_commission'
GROUP BY r.agent_id;

CREATE UNIQUE INDEX ON agent_stats(agent_id);

-- Refresh nightly (cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY agent_stats;
```

### 13.4 Scalability Limits

**Current Architecture:**
- Single PostgreSQL database
- Synchronous commission calculation
- No sharding

**Scale Estimates:**
- **100K users**:  No issues
- **1M users**: � Need materialized views for analytics
- **10M users**: � Need read replicas, async commission processing
- **100M users**: L Need sharding, event sourcing, separate analytics DB

**Future Enhancements:**
1. **Async Commission Processing** (Q2 2026):
   - Move process_booking_payment to background job queue
   - Use message broker (e.g., AWS SQS, RabbitMQ)

2. **Event Sourcing** (Q3 2026):
   - Append-only event log for all referral actions
   - CQRS pattern for read/write separation

3. **Analytics Warehouse** (Q4 2026):
   - Separate ClickHouse/BigQuery for reporting
   - ETL pipeline from production DB

---

## 14. Security Considerations

### 14.1 Cookie Security

**Current Implementation:**
```javascript
cookieStore.set('tutorwise_referral_id', referralId, {
  httpOnly: true,         //  XSS protection
  secure: true,           //  HTTPS only
  sameSite: 'lax',        //  CSRF protection
  maxAge: 2592000,        //  30-day expiry
});
```

**Missing (Future Enhancement):**
```javascript
// PLANNED: HMAC signature
const signature = crypto
  .createHmac('sha256', process.env.REFERRAL_COOKIE_SECRET)
  .update(referralId)
  .digest('hex');

const signedValue = `${referralId}.${signature}`;

cookieStore.set('tutorwise_referral_id', signedValue, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 2592000,
});
```

### 14.2 SQL Injection Prevention

** All queries use parameterized statements:**
```typescript
// SAFE: Uses Supabase query builder (parameterized)
await supabase
  .from('profiles')
  .select('id')
  .eq('referral_code', userInput); //  Parameterized

// UNSAFE: String concatenation (NEVER DO THIS)
await supabase.rpc('raw_sql', {
  query: `SELECT * FROM profiles WHERE referral_code = '${userInput}'` // L SQL injection risk
});
```

### 14.3 Row-Level Security (RLS)

**Profiles Table:**
```sql
-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile (except referred_by_profile_id)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    -- Block changes to referred_by_profile_id
    referred_by_profile_id = OLD.referred_by_profile_id
    OR OLD.referred_by_profile_id IS NULL
  )
);
```

**Referrals Table:**
```sql
-- Agents can view their own referrals
CREATE POLICY "Agents can view own referrals"
ON referrals FOR SELECT
USING (auth.uid() = agent_id);

-- Service role can insert (API route handler)
CREATE POLICY "Service role can insert referrals"
ON referrals FOR INSERT
WITH CHECK (auth.jwt()->>'role' = 'service_role');
```

**Transactions Table:**
```sql
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = profile_id);

-- Only RPC functions can insert/update
CREATE POLICY "RPC functions can manage transactions"
ON transactions FOR ALL
USING (auth.jwt()->>'role' = 'service_role');
```

### 14.4 GDPR Compliance

**Data Retention:**
```sql
-- Anonymize deleted user referrals (soft delete)
CREATE OR REPLACE FUNCTION anonymize_user_referrals()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep referral records for analytics, but remove PII
  UPDATE referrals
  SET
    ip_address = NULL,
    user_agent = NULL,
    status = 'Inactive'
  WHERE referred_profile_id = OLD.id;

  -- Keep transaction records (required for accounting)
  -- But profile_id becomes orphaned (ON DELETE RESTRICT prevents deletion)

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_anonymize_referrals
BEFORE DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION anonymize_user_referrals();
```

**Data Export (GDPR Right to Access):**
```sql
CREATE OR REPLACE FUNCTION export_user_referral_data(user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'profile', (
      SELECT json_build_object(
        'referral_code', referral_code,
        'referred_by_profile_id', referred_by_profile_id,
        'created_at', created_at
      ) FROM profiles WHERE id = user_id
    ),
    'referrals_made', (
      SELECT json_agg(json_build_object(
        'referred_profile_id', referred_profile_id,
        'status', status,
        'created_at', created_at
      ))
      FROM referrals WHERE agent_id = user_id
    ),
    'transactions', (
      SELECT json_agg(json_build_object(
        'type', type,
        'amount_gbp', amount_gbp,
        'status', status,
        'created_at', created_at
      ))
      FROM transactions WHERE profile_id = user_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 15. Analytics & Reporting

### 15.1 Referral Funnel Metrics

**Conversion Funnel:**
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'Referred') AS clicked,
  COUNT(*) FILTER (WHERE status = 'Signed Up') AS signed_up,
  COUNT(*) FILTER (WHERE status = 'Converted') AS converted,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'Signed Up')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE status = 'Referred'), 0) * 100,
    2
  ) AS signup_rate_percent,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'Converted')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE status = 'Signed Up'), 0) * 100,
    2
  ) AS conversion_rate_percent
FROM referrals
WHERE agent_id = 'user-uuid'
  AND created_at >= NOW() - INTERVAL '30 days';
```

**Output Example:**
```
clicked | signed_up | converted | signup_rate | conversion_rate
--------|-----------|-----------|-------------|----------------
  100   |    25     |     8     |   25.00%    |     32.00%
```

### 15.2 Commission Performance

**Top Agents by Earnings:**
```sql
SELECT
  p.id,
  p.full_name,
  p.referral_code,
  COUNT(DISTINCT r.id) AS total_referrals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'Converted') AS converted_referrals,
  COALESCE(SUM(t.amount_gbp), 0) AS total_earned_gbp,
  COALESCE(SUM(t.amount_gbp) FILTER (WHERE t.status = 'paid_out'), 0) AS paid_out_gbp,
  COALESCE(SUM(t.amount_gbp) FILTER (WHERE t.status IN ('available', 'scheduled')), 0) AS pending_gbp
FROM profiles p
LEFT JOIN referrals r ON p.id = r.agent_id
LEFT JOIN transactions t ON p.id = t.profile_id AND t.type = 'agent_commission'
WHERE 'agent' = ANY(p.roles) OR EXISTS (SELECT 1 FROM referrals WHERE agent_id = p.id)
GROUP BY p.id, p.full_name, p.referral_code
HAVING COUNT(DISTINCT r.id) > 0
ORDER BY total_earned_gbp DESC
LIMIT 50;
```

### 15.3 Delegation Analytics

**Delegation Effectiveness:**
```sql
SELECT
  l.id AS listing_id,
  l.title AS listing_title,
  p_tutor.full_name AS tutor_name,
  p_delegate.full_name AS delegation_partner,
  COUNT(*) AS total_bookings,
  COUNT(*) FILTER (WHERE b.delegation_applied = TRUE) AS delegated_bookings,
  COUNT(*) FILTER (WHERE b.delegation_applied = FALSE AND b.commission_recipient_profile_id IS NOT NULL) AS agent_protected_bookings,
  COUNT(*) FILTER (WHERE b.commission_recipient_profile_id IS NULL) AS organic_bookings,
  COALESCE(SUM(b.commission_amount_gbp) FILTER (WHERE b.delegation_applied = TRUE), 0) AS partner_earnings_gbp,
  COALESCE(SUM(b.commission_amount_gbp) FILTER (WHERE b.delegation_applied = FALSE), 0) AS agent_earnings_gbp
FROM listings l
JOIN profiles p_tutor ON l.service_provider_id = p_tutor.id
LEFT JOIN profiles p_delegate ON l.delegate_commission_to_profile_id = p_delegate.id
LEFT JOIN bookings b ON l.id = b.listing_id
WHERE l.delegate_commission_to_profile_id IS NOT NULL
  AND b.status = 'completed'
GROUP BY l.id, l.title, p_tutor.full_name, p_delegate.full_name
ORDER BY total_bookings DESC;
```

### 15.4 Time-Series Analysis

**Monthly Referral Growth:**
```sql
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) FILTER (WHERE status = 'Referred') AS clicks,
  COUNT(*) FILTER (WHERE status = 'Signed Up') AS signups,
  COUNT(*) FILTER (WHERE status = 'Converted') AS conversions,
  COALESCE(SUM(
    SELECT SUM(amount_gbp) FROM transactions t
    WHERE t.type = 'agent_commission'
      AND t.booking_id IN (
        SELECT id FROM bookings
        WHERE commission_recipient_profile_id = r.agent_id
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', r.created_at)
      )
  ), 0) AS commission_earned_gbp
FROM referrals r
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

### 15.5 Cohort Analysis

**Referral Cohort Retention:**
```sql
WITH cohorts AS (
  SELECT
    agent_id,
    DATE_TRUNC('month', created_at) AS cohort_month,
    referred_profile_id
  FROM referrals
  WHERE status = 'Signed Up'
),
bookings_by_cohort AS (
  SELECT
    c.agent_id,
    c.cohort_month,
    DATE_TRUNC('month', b.created_at) AS booking_month,
    COUNT(DISTINCT b.client_profile_id) AS active_users,
    SUM(b.commission_amount_gbp) AS commission_gbp
  FROM cohorts c
  JOIN bookings b ON c.referred_profile_id = b.client_profile_id
  GROUP BY c.agent_id, c.cohort_month, DATE_TRUNC('month', b.created_at)
)
SELECT
  cohort_month,
  COUNT(DISTINCT referred_profile_id) AS cohort_size,
  MAX(CASE WHEN booking_month = cohort_month THEN active_users END) AS month_0,
  MAX(CASE WHEN booking_month = cohort_month + INTERVAL '1 month' THEN active_users END) AS month_1,
  MAX(CASE WHEN booking_month = cohort_month + INTERVAL '2 months' THEN active_users END) AS month_2,
  MAX(CASE WHEN booking_month = cohort_month + INTERVAL '3 months' THEN active_users END) AS month_3
FROM cohorts
LEFT JOIN bookings_by_cohort USING (agent_id, cohort_month)
GROUP BY cohort_month
ORDER BY cohort_month DESC;
```

---

## Appendix A: Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 035 | 2025-10-09 | Add referral_code column + generation function |
| 042 | 2025-10-15 | Add referred_by_profile_id column (identity-level binding) |
| 050 | 2025-10-20 | Create referrals table with status enum |
| 051 | 2025-10-25 | Rename referrer_profile_id � agent_id in referrals table |
| 034 | 2025-11-28 | Add delegate_commission_to_profile_id to listings (commission delegation) |
| 090 | 2025-12-05 | Fix handle_new_user trigger (remove legacy referral_id logic) |

---

## Appendix B: Glossary

| Term | Definition | Database Column |
|------|------------|-----------------|
| **Agent** | User who refers others to the platform | N/A (role in profiles.roles) |
| **Referrer** | Synonym for agent | N/A |
| **Referred User** | User who signed up via referral link | profiles.referred_by_profile_id |
| **Referral Code** | 7-character alphanumeric identifier | profiles.referral_code |
| **Identity-Level Binding** | Permanent attribution at profile creation | profiles.referred_by_profile_id |
| **Commission Delegation** | Redirecting commission to partner | listings.delegate_commission_to_profile_id |
| **Delegation Target** | Profile receiving delegated commission | UUID in delegate_commission_to_profile_id |
| **Multi-Role Architecture** | Single user can be tutor/client/agent | profiles.roles[] |
| **Supply-Side Agent** | Agent who refers tutors (service providers) | N/A (business concept) |
| **Demand-Side Agent** | Agent who refers clients (future feature) | N/A (business concept) |
| **Hierarchical Attribution** | Priority-based referral source resolution | handle_new_user() logic |

---

## Appendix C: Future Roadmap

### Q1 2026: Attribution Enhancements
- [ ] Implement hierarchical fallback (URL � Cookie � Manual)
- [ ] Add HMAC cookie signature
- [ ] Add attribution_method tracking to referrals table
- [ ] Audit logging for attribution resolution

### Q2 2026: QR Code Generation
- [ ] QR code generation API endpoint
- [ ] Dynamic QR codes with tracking parameters
- [ ] Offline-to-online attribution bridge

### Q3 2026: Demand-Side Monetization
- [ ] Enable commission for client referrals
- [ ] Separate commission rates for tutors vs clients
- [ ] A/B testing framework for commission splits

### Q4 2026: Advanced Analytics
- [ ] Real-time dashboard with WebSocket updates
- [ ] Cohort analysis automation
- [ ] Predictive LTV modeling for referrals

---

**Document Version**: 2.0
**Last Updated**: 2025-12-16
**Total Word Count**: ~15,000 words
**Maintenance**: Review quarterly after patent amendments
**Owner**: Growth Team
**Status**: COMPLETE - Engineering Reference Document

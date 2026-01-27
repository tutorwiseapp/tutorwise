# Authentication Solution Design

**Version**: v2.1 (Supabase Auth + token_hash Email Confirmation)
**Date**: 2026-01-27 (Updated for email confirmation flow)
**Status**: Active
**Owner**: Backend Team
**Migration**: VIN-AUTH-MIG-04, VIN-AUTH-MIG-05 (Kinde → Supabase, Sept 2025)

---

## Executive Summary

This document details the authentication and authorization system for Tutorwise, reverse-engineered from the working codebase. The system uses **Supabase Auth** for identity management with email/password and Google OAuth support, **HTTP-only cookie sessions** via @supabase/ssr, **database triggers** for automatic profile creation, **middleware-based route protection**, and **lifetime referral attribution** for commission tracking.

The system integrates with **12 major features** across the platform, serving as the foundational layer for user identity, access control, and growth attribution.

---

## Key Design Principles

1. **Server-First Authentication**: All auth validation happens server-side via middleware
2. **Automatic Profile Creation**: Database triggers eliminate manual profile setup
3. **Lifetime Attribution**: Referrers permanently stamped on user profiles for commission tracking
4. **Multi-Role Support**: Users can have multiple roles and switch between them
5. **Onboarding Enforcement**: Incomplete users cannot access protected features
6. **Cookie-Based Sessions**: HTTP-only cookies prevent XSS token theft
7. **SEO-Friendly Identifiers**: Auto-generated slugs for public profile URLs

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ User Signup  │
│ (Email/OAuth)│
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│ Supabase Auth        │
│ Creates auth.users   │
│ (email, metadata)    │
└──────┬───────────────┘
       │
       ↓  [DATABASE TRIGGER]
┌─────────────────────────────────────────────────────┐
│ handle_new_user() Function                          │
│ 1. Extract email, first_name, last_name from meta   │
│ 2. Generate unique referral_code (7 chars)          │
│ 3. Generate unique slug from full_name              │
│ 4. Lookup referrer by referral_code                 │
│ 5. Set referred_by_profile_id (lifetime)            │
│ 6. Create profiles record                           │
└──────┬──────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────┐
│ Set Session Cookie   │
│ (HTTP-only, Secure)  │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Redirect to          │
│ /onboarding          │
└──────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE PROTECTION                       │
└─────────────────────────────────────────────────────────────────┘

Request to /dashboard
       │
       ↓
┌──────────────────────┐
│ Middleware Intercept │
└──────┬───────────────┘
       │
       ↓
  ┌─────────────┐
  │ Get Session │───No Session───→ Redirect to /login?redirect=/dashboard
  └─────┬───────┘
        │ Session Valid
        ↓
  ┌──────────────────┐
  │ Check Onboarding │───Incomplete───→ Redirect to /onboarding?step={step}
  └─────┬────────────┘
        │ Complete
        ↓
  ┌──────────────┐
  │ Allow Access │
  └──────────────┘
```

---

## System Integrations

This section documents how authentication integrates with other platform features, discovered through codebase analysis.

### 1. ONBOARDING INTEGRATION

**Type**: Middleware Redirect + State Tracking

**Files**:
- `apps/web/src/middleware.ts` (lines 174-209)
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/app/onboarding/page.tsx`

**How It Works**:
- **After Signup**: All signup flows redirect to `/onboarding`
- **Middleware Enforcement**: Every protected route checks `profiles.onboarding_progress.onboarding_completed`
- **Auto-Resume**: If incomplete, redirects to `/onboarding?step={current_step}` to resume where user left off
- **State Storage**: JSONB column `onboarding_progress` tracks:
  - `onboarding_completed`: boolean
  - `current_step`: string (e.g., 'role_selection', 'profile_details')
  - `completed_steps`: array
  - `started_at`, `completed_at`: timestamps

**Onboarding Flow**:
```
Signup → /onboarding → Select Role → Profile Details → Verification → Complete
         ↑____________ Middleware forces here if incomplete ____________|
```

---

### 2. REFERRALS INTEGRATION (Lifetime Attribution)

**Type**: Cookie Tracking + Database Trigger + Commission System

**Files**:
- `apps/web/src/app/signup/page.tsx` (lines 41-48, 66)
- `apps/web/src/app/a/[referral_id]/route.ts`
- `apps/api/migrations/090_fix_handle_new_user_remove_referral_id.sql`
- `apps/api/migrations/028_create_hubs_v3_6_schema.sql` (referrals table)

**How It Works**:

**Pre-Signup (Referral Link Click)**:
1. User clicks `/a/{referral_code}`
2. Route handler:
   - Sets `tutorwise_referral_id` cookie (30 days expiry)
   - Redirects to intended page (e.g., `/marketplace`)

**Signup Form**:
3. Referral code field auto-populated from cookie
4. User can override or confirm

**Database Trigger (handle_new_user)**:
5. Looks up agent profile by `referral_code`
6. Stamps `referred_by_profile_id` on new user's profile
7. Creates/updates `referrals` table record:
   - Status: Referred → **Signed Up**
   - Links `referred_profile_id` to new user

**Lifetime Commission**:
8. **Every booking** created by this user forever:
   - Payment webhook reads `client.referred_by_profile_id`
   - Calculates 10% referral commission
   - Creates transaction for referring agent

**Database Schema**:
```sql
-- profiles table
referred_by_profile_id UUID  -- Permanent stamp of who referred this user
referral_code TEXT UNIQUE    -- This user's code for referring others

-- referrals table
agent_profile_id UUID        -- Who made the referral
referred_profile_id UUID     -- Who was referred
status referral_status       -- Referred | Signed Up | Converted
booking_id UUID             -- First conversion booking
transaction_id UUID         -- First commission transaction
```

---

### 3. PAYMENTS INTEGRATION (Commission Attribution)

**Type**: Webhook RPC reads auth data

**Files**:
- `apps/api/migrations/060_update_payment_webhook_rpc_v4_9.sql`
- `apps/api/migrations/109_update_payment_rpc_with_context.sql`
- `apps/web/src/app/api/webhooks/stripe/route.ts`

**How It Works**:

When a booking payment succeeds, the `handle_successful_payment()` RPC:

1. **Reads client's referrer**: `SELECT referred_by_profile_id FROM profiles WHERE id = client_id`
2. **Calculates commission split**:
   ```
   4-Way Split (Referred + Agent-Led):
   ├─ Tutor: 60%
   ├─ Agent: 20% (if agent_profile_id present)
   ├─ Referrer: 10% (if referred_by_profile_id present)
   └─ Platform: 10%

   3-Way Split (Referred Only):
   ├─ Tutor: 80%
   ├─ Referrer: 10%
   └─ Platform: 10%

   Direct (No Referrer):
   ├─ Tutor: 90%
   └─ Platform: 10%
   ```

3. **Creates transactions** for each party
4. **Updates referral status**: First booking sets `referrals.status = 'Converted'`

**Integration Point**: Auth provides the `referred_by_profile_id` that drives commission calculation for **every booking**, forever.

---

### 4. PROFILE/ACCOUNT INTEGRATION

**Type**: React Context + Database Sync

**Files**:
- `apps/web/src/app/contexts/UserProfileContext.tsx`
- `apps/api/migrations/004_add_onboarding_progress_to_profiles.sql`

**How It Works**:

**UserProfileContext** serves as the global auth state provider:

**Provides to entire app**:
```typescript
{
  user: User | null,              // Supabase auth user
  profile: Profile | null,        // Full profile data
  activeRole: Role,               // Current active role
  availableRoles: Role[],         // All roles user has
  needsOnboarding: boolean,       // Onboarding incomplete?
  isLoading: boolean,             // Loading state
  switchRole: (role) => Promise,  // Switch active role
  refreshProfile: () => Promise   // Manually refresh
}
```

**Integration Flow**:
1. **Auth State Change**: Subscribes to `supabase.auth.onAuthStateChange()`
2. **Profile Fetch**: Auto-fetches profile when session detected
3. **Role Switching**: `switchRole()` updates both database and localStorage
4. **Persistence**: Syncs `active_role` across sessions

**Role Management**:
```sql
-- profiles table
roles TEXT[]           -- ['client', 'tutor', 'agent']
active_role TEXT       -- 'tutor'
```

**Usage Across App**:
- Dashboard layout adapts to `activeRole`
- Navigation menu shows role-specific links
- Features check roles for access (e.g., "Offer Free Help" tutor-only)

---

### 5. MIDDLEWARE PROTECTION

**Type**: Server-Side Route Guard

**Files**:
- `apps/web/src/middleware.ts` (lines 64-209)

**How It Works**:

**Protected Routes**:
```typescript
const protectedRoutes = [
  '/dashboard',
  '/messages',
  '/account',
  '/payments',
  '/referral-activities',
  '/transaction-history',
  '/bookings',
  '/listings',
  '/reviews',
  '/network'
];
```

**Public Routes** (bypass):
```typescript
const publicRoutes = [
  '/', '/login', '/signup', '/forgot-password',
  '/auth/callback', '/contact', '/privacy-policy',
  '/marketplace', '/public-profile/*', '/w/*',
  '/api/*', '/_next/*', '/static/*'
];
```

**Validation Logic**:
```typescript
// 1. Check if route is protected
if (isProtectedRoute(pathname)) {

  // 2. Verify session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // No session → redirect to login
    return NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, request.url)
    );
  }

  // 3. Check onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_progress')
    .eq('id', user.id)
    .single();

  if (!profile.onboarding_progress.onboarding_completed) {
    // Incomplete → redirect to onboarding
    const step = profile.onboarding_progress.current_step;
    return NextResponse.redirect(
      new URL(`/onboarding?step=${step}`, request.url)
    );
  }
}

// 4. Allow access
return NextResponse.next();
```

---

### 6. WISELIST INTEGRATION (In-Network Sales Attribution)

**Type**: Cookie + Booking Attribution

**Files**:
- `apps/web/src/middleware.ts` (lines 19-62)
- `apps/web/src/app/api/stripe/create-booking-checkout/route.ts`
- `apps/api/migrations/084_add_booking_referrer_id.sql`

**How It Works**:

**Middleware Detection**:
1. User visits `/w/{wiselist_slug}`
2. Middleware detects pattern
3. Looks up wiselist owner's `profile_id`
4. Sets `wiselist_referrer_id` cookie (30 days)

**Booking Attribution**:
5. User books a session
6. Checkout API reads `wiselist_referrer_id` cookie
7. Stores in `bookings.booking_referrer_id`
8. Payment webhook uses this for in-network sales commission

**Why Separate from referred_by_profile_id**:
- `referred_by_profile_id`: **Signup attribution** (lifetime)
- `booking_referrer_id`: **Per-booking attribution** (one-time, from Wiselist share)

---

### 7. NETWORK INTEGRATION

**Type**: Manual Connection System (No Auto-Connect)

**Files**:
- `apps/api/migrations/061_add_profile_graph_v4_6.sql`
- `apps/api/migrations/033_create_connections_table.sql`

**How It Works**:

**Connection Types**:
```sql
CREATE TYPE connection_type AS ENUM (
  'SOCIAL',            -- Mutual friends
  'GUARDIAN',          -- Parent-student
  'BOOKING',           -- Post-session (client-tutor)
  'AGENT_DELEGATION',  -- Tutor-agent (commission sharing)
  'AGENT_REFERRAL'     -- Agent-referred client
);
```

**No Auto-Connect on Signup**:
- Auth does NOT automatically create connections
- Connections created manually:
  - User sends request → status: PENDING
  - Receiver accepts → status: ACTIVE

**Integration with Auth**:
- `profile_graph` table references `profiles.id`
- Used for:
  - Guardian-student relationship management
  - Agent-tutor delegation
  - Social network building

---

### 8. SESSION MANAGEMENT

**Type**: HTTP-Only Cookies + JWT Tokens

**Files**:
- `apps/web/src/utils/supabase/server.ts`
- `apps/web/src/utils/supabase/client.ts`
- `apps/web/src/middleware.ts`

**How It Works**:

**Cookie Storage** (via @supabase/ssr):
```
Cookie Name: sb-<project-ref>-auth-token
Attributes: HttpOnly, Secure, SameSite=Lax
Expiry: 1 hour (auto-refreshed)
```

**Server-Side Client** (for Server Components, API routes, middleware):
```typescript
// apps/web/src/utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr';

export async function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); }
      }
    }
  );
}
```

**Client-Side Client** (for Client Components):
```typescript
// apps/web/src/utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Token Refresh**:
- Automatic via @supabase/ssr
- Refreshes before 1-hour expiry
- Transparent to user

**Global Sign-Out**:
```typescript
await supabase.auth.signOut({ scope: 'global' });
// Clears: Supabase session + Google OAuth session + all cookies
```

---

### 9. GOOGLE OAUTH INTEGRATION

**Type**: OAuth 2.0 Flow via Supabase

**Files**:
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/app/auth/callback/route.ts`

**How It Works**:

**Initiation**:
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: {
      prompt: 'select_account'  // Forces account selection
    }
  }
});
```

**Why `prompt: 'select_account'`**:
- Forces Google account picker to show
- Prevents wrong account auto-login
- Better UX for multi-account users

**Callback Flow**:
```
1. Google redirects to /auth/callback?code={code}
2. Callback handler:
   const code = searchParams.get('code');
   await supabase.auth.exchangeCodeForSession(code);
3. Session established
4. Redirect to /onboarding or /dashboard
```

**Profile Creation**:
- Same `handle_new_user()` trigger fires
- Extracts `full_name` from Google metadata
- No password needed (managed by Google)

---

### 10. EMAIL CONFIRMATION FLOW (token_hash)

**Type**: Client-Side OTP Verification

**Files**:
- `apps/web/src/app/(public)/confirm-email/page.tsx`
- `apps/web/src/app/(public)/auth/callback/route.ts`
- `apps/web/src/app/(public)/signup/page.tsx`

**Why token_hash Instead of PKCE?**

Supabase's default PKCE flow has a critical limitation:
- `code_verifier` is stored in localStorage during signup
- When user clicks email link in different browser/device, `code_verifier` is missing
- Results in error: "both auth code and code verifier should be non-empty"

The **token_hash flow** solves this:
- Self-contained verification (no localStorage dependency)
- Works across any browser/device
- More reliable for email confirmation scenarios

**Email Template Configuration (Supabase Dashboard)**:

All Supabase email templates must use this format:

```html
<!-- Confirm signup -->
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=signup">
  Confirm your email
</a>

<!-- Magic link -->
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=magiclink">
  Log in to Tutorwise
</a>

<!-- Invite user -->
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=invite">
  Accept invitation
</a>

<!-- Reset password -->
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=recovery">
  Reset your password
</a>

<!-- Change email address -->
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=email_change">
  Confirm email change
</a>
```

**Client-Side Verification Flow**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL CONFIRMATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

User clicks email link
       │
       ↓
┌──────────────────────────────────────┐
│ /confirm-email?token_hash=...&type=signup │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ useEffect() extracts params:         │
│ - token_hash                         │
│ - type (signup|recovery|invite|etc.) │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ supabase.auth.verifyOtp({            │
│   token_hash,                        │
│   type                               │
│ })                                   │
└──────┬───────────────────────────────┘
       │
       ├── Success ──→ Session created ──→ Redirect to /onboarding
       │
       └── Error ──→ Display error message with recovery options
```

**Code Implementation**:

```typescript
// apps/web/src/app/(public)/confirm-email/page.tsx
useEffect(() => {
  const handleConfirmation = async () => {
    const token_hash = searchParams?.get('token_hash');
    const type = searchParams?.get('type');

    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
      });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
        return;
      }

      setStatus('success');
      router.push('/onboarding');
    }
  };

  handleConfirmation();
}, [searchParams]);
```

**Fallback: Server-Side Callback**:

The `/auth/callback` route also handles token_hash as a fallback:

```typescript
// apps/web/src/app/(public)/auth/callback/route.ts
if (token_hash && type) {
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
  });
  // ... handle error or redirect
}
```

**Error Handling**:

Common error scenarios:
- "Email link is invalid or has expired" → Link expired (24 hours)
- "Token has already been used" → User already confirmed
- Missing params → Invalid URL

Recovery options displayed to user:
- Go to Login (if already confirmed)
- Sign Up Again (if link expired)

---

### 11. DATABASE SCHEMA INTEGRATION

**Type**: PostgreSQL Tables + Triggers + Row Level Security

**Key Tables**:

**auth.users** (Supabase Managed):
```sql
id UUID PRIMARY KEY
email TEXT UNIQUE
email_confirmed_at TIMESTAMPTZ
raw_user_meta_data JSONB  -- { first_name, last_name, full_name, referral_code }
created_at TIMESTAMPTZ
```

**profiles** (Custom):
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
email TEXT
first_name TEXT
last_name TEXT
full_name TEXT
roles TEXT[] DEFAULT '{client}'
active_role TEXT DEFAULT 'client'
referral_code TEXT UNIQUE  -- For referring others
referred_by_profile_id UUID REFERENCES profiles(id)  -- Who referred this user
slug TEXT UNIQUE  -- SEO-friendly URL (e.g., 'john-smith')
onboarding_progress JSONB
avatar_url TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**referrals**:
```sql
id UUID PRIMARY KEY
agent_profile_id UUID REFERENCES profiles(id)
referred_profile_id UUID REFERENCES profiles(id)
status referral_status  -- Referred | Signed Up | Converted
booking_id UUID  -- First conversion
transaction_id UUID  -- First commission
created_at TIMESTAMPTZ
```

**Database Triggers**:

**on_auth_user_created**:
```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
```

**handle_new_user() Function**:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_referring_profile_id UUID;
  v_slug TEXT;
BEGIN
  -- Extract metadata
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';

  -- Generate unique referral code (7 chars)
  LOOP
    v_new_code := generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = v_new_code);
  END LOOP;

  -- Generate unique slug
  v_slug_base := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug_base;
  v_count := 1;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = v_slug) LOOP
    v_count := v_count + 1;
    v_slug := v_slug_base || '-' || v_count::TEXT;
  END LOOP;

  -- Lookup referrer
  IF v_referral_code IS NOT NULL THEN
    SELECT id INTO v_referring_profile_id
    FROM profiles
    WHERE referral_code = v_referral_code;
  END IF;

  -- Create profile
  INSERT INTO profiles (
    id, email, first_name, last_name, full_name,
    referral_code, referred_by_profile_id, slug
  ) VALUES (
    NEW.id, NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    v_full_name,
    v_new_code,
    v_referring_profile_id,
    v_slug
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Row Level Security (RLS)**:
```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Everyone can view public profile info
CREATE POLICY "Public profiles viewable"
ON profiles FOR SELECT
USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

---

### 12. BOOKINGS INTEGRATION

**Type**: User ID References + Agent Attribution

**Files**:
- `apps/api/migrations/028_create_hubs_v3_6_schema.sql` (bookings table)
- `apps/web/src/app/api/bookings/route.ts`

**How Auth Data Is Used**:

**Booking Creation**:
```sql
-- bookings table
client_id UUID REFERENCES profiles(id)       -- From auth session
tutor_id UUID REFERENCES profiles(id)        -- From listing
agent_profile_id UUID REFERENCES profiles(id) -- From client.referred_by_profile_id
```

**Role-Based Filtering**:
```typescript
// GET /api/bookings
const { activeRole } = useUserProfile();

if (activeRole === 'client') {
  query.eq('client_id', user.id);
} else if (activeRole === 'tutor') {
  query.eq('tutor_id', user.id);
} else if (activeRole === 'agent') {
  query.or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_profile_id.eq.${user.id}`);
}
```

**Authorization**:
```typescript
// Only booking owner can cancel
const { data: booking } = await supabase
  .from('bookings')
  .select('client_id')
  .eq('id', bookingId)
  .single();

if (booking.client_id !== user.id) {
  throw new Error('Unauthorized');
}
```

---

## Data Flow Diagrams

### Signup Flow (Email/Password)

```
┌──────────────┐
│ User fills   │
│ signup form  │
└──────┬───────┘
       │
       ↓
┌─────────────────────────────────────┐
│ POST /signup                        │
│ {                                   │
│   email, password,                  │
│   first_name, last_name,            │
│   referral_code (optional)          │
│ }                                   │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ supabase.auth.signUp({              │
│   email, password,                  │
│   options: {                        │
│     data: { first_name, last_name,  │
│             referral_code }         │
│   }                                 │
│ })                                  │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ auth.users record created           │
│ raw_user_meta_data = { ... }        │
└──────┬──────────────────────────────┘
       │
       ↓  [TRIGGER]
┌─────────────────────────────────────┐
│ handle_new_user() fires             │
│ 1. Generate referral_code           │
│ 2. Generate slug                    │
│ 3. Lookup referrer                  │
│ 4. Create profiles record           │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ profiles record created:            │
│ {                                   │
│   id: user.id,                      │
│   email, full_name,                 │
│   referral_code: "kRz7Bq2",         │
│   referred_by_profile_id: UUID,     │
│   slug: "john-smith"                │
│ }                                   │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Session cookie set                  │
│ (HTTP-only, Secure)                 │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Redirect to /onboarding             │
└─────────────────────────────────────┘
```

### Referral Attribution Flow

```
┌─────────────────┐
│ User A shares   │
│ /a/ABC123       │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ User B clicks link                  │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ /a/[referral_id]/route.ts           │
│ 1. Set cookie: tutorwise_referral_id│
│ 2. Redirect to destination          │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ User B navigates to /signup         │
│ Referral code pre-filled: ABC123    │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ User B submits signup               │
│ referral_code in metadata           │
└────────┬────────────────────────────┘
         │
         ↓  [TRIGGER]
┌─────────────────────────────────────┐
│ handle_new_user()                   │
│ 1. Look up User A by code: ABC123   │
│ 2. Set User B's:                    │
│    referred_by_profile_id = User A  │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ User B creates booking (any time)   │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│ Payment webhook fires               │
│ handle_successful_payment()         │
│ 1. Read User B's                    │
│    referred_by_profile_id           │
│ 2. Calculate 10% commission         │
│ 3. Create transaction for User A    │
└─────────────────────────────────────┘
         │
         ↓  (LIFETIME - EVERY BOOKING)
┌─────────────────────────────────────┐
│ User A earns commission forever     │
└─────────────────────────────────────┘
```

---

## ASCII Diagrams

### Role Switching Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     ROLE SWITCHING WORKFLOW                       │
└──────────────────────────────────────────────────────────────────┘

Current State:
  profiles.roles = ['client', 'tutor']
  profiles.active_role = 'client'
  Dashboard shows CLIENT view

User clicks: "Switch to Tutor"
       │
       ↓
┌──────────────────────────────────────┐
│ switchRole('tutor') called           │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Validate user has 'tutor' in roles[] │
└──────┬───────────────────────────────┘
       │ ✓ Valid
       ↓
┌──────────────────────────────────────┐
│ UPDATE profiles                      │
│ SET active_role = 'tutor'            │
│ WHERE id = user.id                   │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ localStorage.setItem(                │
│   'activeRole', 'tutor'              │
│ )                                    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ UserProfileContext.refreshProfile()  │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Dashboard re-renders                 │
│ Shows TUTOR view                     │
│ Nav menu shows tutor-specific links  │
└──────────────────────────────────────┘
```

### Onboarding Enforcement Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   ONBOARDING ENFORCEMENT FLOW                     │
└──────────────────────────────────────────────────────────────────┘

User: Just signed up (onboarding incomplete)
Tries to access: /messages

       ↓
┌──────────────────────────────────────┐
│ Middleware intercepts request        │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Check session                        │
│ supabase.auth.getUser()              │
└──────┬───────────────────────────────┘
       │ ✓ Valid session
       ↓
┌──────────────────────────────────────┐
│ Fetch profile                        │
│ SELECT onboarding_progress           │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ onboarding_progress = {              │
│   onboarding_completed: false,       │
│   current_step: 'role_selection',    │
│   completed_steps: []                │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Redirect to:                         │
│ /onboarding?step=role_selection      │
│ (Auto-resumes where user left off)   │
└──────────────────────────────────────┘

Later, after onboarding complete:

       ↓
┌──────────────────────────────────────┐
│ User tries /messages again           │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Middleware checks:                   │
│ onboarding_completed: true ✓         │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│ Access granted                       │
│ /messages page loads                 │
└──────────────────────────────────────┘
```

---

## Security Considerations

### Session Security
- **HTTP-Only Cookies**: Prevents JavaScript access (XSS protection)
- **Secure Flag**: HTTPS only in production
- **SameSite=Lax**: CSRF protection
- **Server-Side Validation**: Middleware verifies every request
- **Auto-Refresh**: Tokens refreshed before expiration

### Profile Creation Security
- **Database Trigger**: Runs with SECURITY DEFINER (elevated privileges)
- **Atomic Operation**: Profile creation cannot be bypassed
- **Unique Constraints**: Prevents duplicate referral codes and slugs
- **Row Level Security**: Users can only update own profiles

### Referral Attribution Security
- **Cookie Validation**: Referral codes validated against database
- **Manual Override**: Users can change or remove referral code
- **Immutable Attribution**: Once set, referred_by_profile_id cannot be changed
- **Commission Tracking**: All transactions auditable via database

---

## Testing Strategy

### Unit Tests
- [ ] Referral code generation (uniqueness, format)
- [ ] Slug generation (uniqueness, collision handling)
- [ ] Role validation (switchRole permissions)
- [ ] Session cookie parsing

### Integration Tests
- [ ] Signup flow (email/password)
- [ ] Signup flow (Google OAuth)
- [ ] Login flow (email/password)
- [ ] Login flow (Google OAuth)
- [ ] Referral attribution (cookie → profile)
- [ ] Profile creation trigger
- [ ] Onboarding enforcement
- [ ] Role switching
- [ ] Global sign-out

### End-to-End Tests
- [ ] Complete signup → onboarding → dashboard flow
- [ ] Referral link → signup → commission on first booking
- [ ] Protected route access (authenticated)
- [ ] Protected route redirect (unauthenticated)
- [ ] Multi-role user switching

---

## Performance Considerations

- **Middleware Overhead**: ~50ms per request (session validation)
- **Profile Fetch**: ~100ms (cached in UserProfileContext)
- **Trigger Execution**: ~200ms (profile creation)
- **Cookie Size**: ~2KB (JWT token)
- **Database Queries**: Indexed on id, email, referral_code, slug

---

## Migration Notes (Kinde → Supabase, Sept 2025)

**Requirements**: VIN-AUTH-MIG-04, VIN-AUTH-MIG-05

**Changes**:
- Auth provider: Kinde → Supabase Auth
- Session storage: Kinde cookies → Supabase cookies via @supabase/ssr
- Profile creation: Kinde webhook → Database trigger
- OAuth: Kinde OAuth → Supabase OAuth
- User metadata: Kinde claims → raw_user_meta_data JSONB

**Data Migration**: All existing users migrated with referral_code and slug generation

---

## Future Enhancements

1. ~~**Email Verification Enforcement**: Require confirmed email before access~~ ✅ Done (Jan 2026)
2. ~~**Password Reset Flow**: Complete forgot password implementation~~ ✅ Done (Jan 2026 - uses token_hash)
3. **Multi-Factor Authentication (MFA)**: TOTP-based 2FA
4. ~~**Magic Link Login**: Passwordless email authentication~~ ✅ Done (Jan 2026 - uses token_hash)
5. **Session Management UI**: View and revoke active sessions
6. **Additional OAuth Providers**: Facebook, GitHub, Apple
7. **Audit Logging**: Track all auth events for security

---

**Last Updated**: 2026-01-27
**Status**: Active (Production)
**For Prompt**: See `auth-prompt.md`
**For Implementation**: See `auth-implementation.md`

---

## Change Log

### v2.1 (2026-01-27)
- Added Email Confirmation Flow section (token_hash verification)
- Documented Supabase email template configuration
- Updated section numbering (10 → 11 for Database Schema, 11 → 12 for Bookings)
- Marked email verification, password reset, and magic link as completed

### v2.0 (2025-12-12)
- Initial Supabase Auth documentation
- Reverse-engineered from codebase

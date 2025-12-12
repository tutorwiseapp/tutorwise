# Authentication - Implementation Guide

**Version**: v2.0
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## File Structure

```
apps/web/src/
├── app/
│   ├── login/
│   │   └── page.tsx                     # Login page
│   ├── signup/
│   │   └── page.tsx                     # Signup page
│   ├── forgot-password/
│   │   └── page.tsx                     # Password reset (incomplete)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts                 # OAuth callback handler
│   ├── components/feature/auth/
│   │   └── ProtectedRoute.tsx           # Route protection component
│   ├── contexts/
│   │   └── UserProfileContext.tsx       # Auth state management
│   ├── hooks/
│   │   └── useRoleGuard.tsx             # Role-based access control
│   └── (authenticated)/
│       └── layout.tsx                   # Protected layout wrapper
│
├── utils/supabase/
│   ├── client.ts                        # Browser client
│   └── server.ts                        # Server client
│
├── middleware.ts                        # Route protection middleware
│
└── styles/
    └── auth.module.css                  # Shared auth styles

apps/api/migrations/
├── 000_create_profiles_table.sql        # Initial profiles table
├── 090_fix_handle_new_user_remove_referral_id.sql  # Profile creation trigger
└── 091_add_error_handling_to_trigger.sql           # Error handling
```

---

## Common Tasks

### Task 1: Protect a New Route

**Add to middleware.ts**:
```typescript
// File: apps/web/src/middleware.ts

const protectedRoutes = [
  '/dashboard',
  '/messages',
  '/your-new-route',  // Add here
];
```

**Or use ProtectedRoute component**:
```typescript
// File: apps/web/src/app/your-new-route/page.tsx

import ProtectedRoute from '@/app/components/feature/auth/ProtectedRoute';

export default function YourPage() {
  return (
    <ProtectedRoute requireOnboarding={true}>
      <div>Your protected content</div>
    </ProtectedRoute>
  );
}
```

---

### Task 2: Restrict Access by Role

```typescript
// File: apps/web/src/app/tutor-only-page/page.tsx

'use client';

import { useRoleGuard } from '@/app/hooks/useRoleGuard';

export default function TutorOnlyPage() {
  const { isAllowed, isLoading } = useRoleGuard(['tutor']);

  if (isLoading) return <div>Loading...</div>;
  if (!isAllowed) return null; // Auto-redirects

  return <div>Tutor-only content</div>;
}
```

---

### Task 3: Get Current User in Component

**Client Component**:
```typescript
'use client';

import { useUserProfile } from '@/app/contexts/UserProfileContext';

export default function MyComponent() {
  const { user, profile, activeRole, isLoading } = useUserProfile();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return <div>Hello, {profile?.full_name}!</div>;
}
```

**Server Component**:
```typescript
import { createClient } from '@/utils/supabase/server';

export default async function MyServerComponent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Not authenticated</div>;

  return <div>Hello, {user.email}!</div>;
}
```

---

### Task 4: Implement Sign Out

```typescript
'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    window.location.href = '/'; // Hard redirect to clear state
  };

  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

---

### Task 5: Complete Password Reset Flow

**Currently incomplete - here's how to implement**:

```typescript
// File: apps/web/src/app/forgot-password/page.tsx

const handlePasswordReset = async (e: React.FormEvent) => {
  e.preventDefault();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    setError(error.message);
  } else {
    setSuccess('Check your email for reset link');
  }
};
```

**Create reset password page**:
```typescript
// File: apps/web/src/app/reset-password/page.tsx

'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (!error) {
      // Redirect to login
    }
  };

  return (
    <form onSubmit={handleUpdate}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
      />
      <button type="submit">Update Password</button>
    </form>
  );
}
```

---

### Task 6: Add Another OAuth Provider

```typescript
// File: apps/web/src/app/login/page.tsx

const handleGitHubSignIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    setError(error.message);
  }
};
```

**Enable in Supabase Dashboard**:
1. Go to Authentication > Providers
2. Enable GitHub
3. Add OAuth credentials

---

### Task 7: Handle Referral Attribution

**Referral Link Route** (`apps/web/src/app/a/[referral_id]/route.ts`):
```typescript
export async function GET(
  request: Request,
  { params }: { params: { referral_id: string } }
) {
  const { referral_id } = params;
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') || '/';

  // Set referral cookie (30 days)
  const response = NextResponse.redirect(new URL(redirect, request.url));
  response.cookies.set('tutorwise_referral_id', referral_id, {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    httpOnly: false, // Needs to be read by client
    sameSite: 'lax',
  });

  return response;
}
```

**Signup Form** (pre-fill referral code from cookie):
```typescript
// apps/web/src/app/signup/page.tsx

useEffect(() => {
  // Read referral code from cookie
  const cookies = document.cookie.split(';');
  const referralCookie = cookies.find(c => c.trim().startsWith('tutorwise_referral_id='));
  if (referralCookie) {
    const code = referralCookie.split('=')[1];
    setReferralCode(code);
  }
}, []);
```

**Database Trigger** handles the rest automatically in `handle_new_user()`.

---

## Key Interfaces

### UserProfileContext

```typescript
interface UserProfileContextType {
  profile: Profile | null;
  user: User | null;
  activeRole: string | null;
  availableRoles: string[];
  switchRole: (role: string) => Promise<void>;
  setActiveRole: (role: string) => void;
  isLoading: boolean;
  needsOnboarding: boolean;
  updateOnboardingProgress: (progress: any) => void;
  refreshProfile: () => Promise<void>;
}
```

### ProtectedRoute Props

```typescript
interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;     // Default: true
  redirectTo?: string;              // Default: '/onboarding'
  loadingMessage?: string;          // Default: 'Loading...'
}
```

---

## Database Schema

### profiles table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  roles TEXT[] DEFAULT '{client}'::TEXT[],
  active_role TEXT DEFAULT 'client',
  referral_code TEXT UNIQUE NOT NULL,
  referred_by_profile_id UUID REFERENCES profiles(id),
  slug TEXT UNIQUE,
  onboarding_progress JSONB DEFAULT '{}'::JSONB,
  avatar_url TEXT,
  bio TEXT,
  headline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### handle_new_user() Trigger

Automatically creates profile when user signs up:
1. Generates secure 7-character referral code
2. Extracts name from `auth.users.raw_user_meta_data`
3. Generates unique slug from full_name
4. Handles slug collisions (john-smith, john-smith-2, etc.)
5. Handles referral attribution (looks up referrer by code)
6. Creates profile record

**Key Logic**:
```sql
-- Generate unique referral code
LOOP
  v_referral_code := generate_referral_code(); -- 7 chars
  EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = v_referral_code);
END LOOP;

-- Generate unique slug
v_slug_base := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]+', '-', 'g'));
v_slug := v_slug_base;
v_count := 1;
WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = v_slug) LOOP
  v_count := v_count + 1;
  v_slug := v_slug_base || '-' || v_count::TEXT;
END LOOP;

-- Look up referrer (if referral_code provided)
IF v_referral_code_from_form IS NOT NULL THEN
  SELECT id INTO v_referring_profile_id
  FROM profiles
  WHERE referral_code = v_referral_code_from_form;
END IF;
```

---

## System Integrations

The authentication system integrates with 11 platform features. Key integration patterns:

### 1. Onboarding Enforcement (Middleware)
```typescript
// middleware.ts checks onboarding_progress
if (user && !profile.onboarding_progress.onboarding_completed) {
  return NextResponse.redirect(
    new URL(`/onboarding?step=${currentStep}`, request.url)
  );
}
```

### 2. Referral Attribution (Lifetime Commissions)
```typescript
// referred_by_profile_id stamped on signup
// Used by payment webhook for commission calculation
const { data: client } = await supabase
  .from('profiles')
  .select('referred_by_profile_id')
  .eq('id', booking.client_id)
  .single();

// If referred, create 10% commission transaction
if (client.referred_by_profile_id) {
  createTransaction({
    profile_id: client.referred_by_profile_id,
    type: 'Referral Commission',
    amount: booking.total_cost * 0.10
  });
}
```

### 3. Role-Based Features
```typescript
// Different features based on active_role
if (activeRole === 'tutor') {
  // Show "Offer Free Help" toggle
  // Show earnings dashboard
} else if (activeRole === 'client') {
  // Show booking requests
  // Show spending history
}
```

See [auth-solution-design.md](./auth-solution-design.md) for complete integration documentation.

---

## Authentication Flow Diagrams

### Sign Up Flow

```
User                Browser             Supabase Auth      Database
 |                     |                      |                |
 |---(1) Fill form---->|                      |                |
 |                     |                      |                |
 |                     |---(2) signUp()------>|                |
 |                     |                      |                |
 |                     |                      |---(3) Create-->|
 |                     |                      |    auth.users  |
 |                     |                      |                |
 |                     |                      |<---(4) Trigger |
 |                     |                      |    creates     |
 |                     |                      |    profile     |
 |                     |                      |                |
 |                     |<---(5) Session-------|                |
 |                     |                      |                |
 |<---(6) Redirect-----|                      |                |
 |    to /onboarding   |                      |                |
```

### Sign In Flow

```
User                Browser             Supabase Auth      Middleware
 |                     |                      |                |
 |---(1) Enter creds)->|                      |                |
 |                     |                      |                |
 |                     |---(2) signIn()------>|                |
 |                     |                      |                |
 |                     |<---(3) Session-------|                |
 |                     |    (set cookie)      |                |
 |                     |                      |                |
 |<---(4) Redirect-----|                      |                |
 |    to /dashboard    |                      |                |
 |                     |                      |                |
 |---(5) Visit page--->|                      |                |
 |                     |                      |                |
 |                     |----(6) Validate----->|                |
 |                     |        session       |                |
 |                     |                      |                |
 |<---(7) Page---------|                      |                |
```

---

## Environment Variables

```bash
# .env.local

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Testing Checklist

- [ ] Sign up with email/password
- [ ] Sign up with Google OAuth
- [ ] Sign in with email/password
- [ ] Sign in with Google OAuth
- [ ] Session persists on page reload
- [ ] Protected routes redirect to /login when not authenticated
- [ ] Middleware blocks access to protected routes
- [ ] ProtectedRoute component works
- [ ] Role guard blocks unauthorized roles
- [ ] Sign out clears session
- [ ] Referral code attribution works (cookie → signup → profile)
- [ ] Profile auto-created on signup
- [ ] Onboarding redirect works
- [ ] Role switching works
- [ ] Slug generation handles collisions
- [ ] Referrer gets commission on first booking

---

## Troubleshooting

### Issue: User signed in but redirected to login

**Solution**: Check if profile exists in database. The `handle_new_user()` trigger may have failed.

```sql
SELECT * FROM profiles WHERE id = 'user-id';
```

If profile missing, check trigger logs:
```sql
SELECT * FROM auth.users WHERE id = 'user-id';
-- Check raw_user_meta_data has required fields
```

### Issue: OAuth redirect not working

**Solution**: Check redirect URL in Supabase dashboard matches your app URL:
- Local: `http://localhost:3000/auth/callback`
- Production: `https://yourdomain.com/auth/callback`

### Issue: Session not persisting

**Solution**: Ensure cookies are enabled and `@supabase/ssr` is configured correctly in server.ts and client.ts.

Check cookie settings in browser DevTools:
- Name: `sb-<project-ref>-auth-token`
- HttpOnly: true
- Secure: true (production)
- SameSite: Lax

### Issue: Referral attribution not working

**Solution**: Check the full flow:
1. Cookie set when clicking referral link? (Check DevTools > Application > Cookies)
2. Signup form pre-fills referral code? (Check form state)
3. Referral code passed to Supabase metadata? (Check `auth.users.raw_user_meta_data`)
4. `handle_new_user()` trigger executed? (Check `profiles.referred_by_profile_id`)

```sql
-- Check if referrer lookup worked
SELECT
  id,
  email,
  referral_code,
  referred_by_profile_id
FROM profiles
WHERE email = 'new-user@example.com';
```

### Issue: Slug collision error

**Solution**: The `handle_new_user()` trigger should handle collisions automatically. If error persists, check:
```sql
-- Find conflicting slugs
SELECT slug, COUNT(*)
FROM profiles
GROUP BY slug
HAVING COUNT(*) > 1;
```

### Issue: Google OAuth forces wrong account

**Ensure `prompt: 'select_account'` is set**:
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    queryParams: {
      prompt: 'select_account'  // This is critical!
    }
  }
});
```

---

## Performance Considerations

- **Middleware overhead**: ~50ms per request
- **Profile fetch**: ~100ms (cached in UserProfileContext)
- **Trigger execution**: ~200ms (profile creation on signup)
- **Session validation**: <50ms (server-side)
- **Cookie size**: ~2KB (JWT token)

**Optimization Tips**:
- UserProfileContext caches profile data to reduce database calls
- Middleware only validates on protected routes
- Session tokens auto-refresh before expiration
- Use server components for initial page loads (faster than client-side fetch)

---

## References

### Related Documentation
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [auth-solution-design.md](./auth-solution-design.md) - Complete system integration docs

### Code Files
- Login: [apps/web/src/app/login/page.tsx](../../../apps/web/src/app/login/page.tsx)
- Signup: [apps/web/src/app/signup/page.tsx](../../../apps/web/src/app/signup/page.tsx)
- Callback: [apps/web/src/app/auth/callback/route.ts](../../../apps/web/src/app/auth/callback/route.ts)
- ProtectedRoute: [apps/web/src/app/components/feature/auth/ProtectedRoute.tsx](../../../apps/web/src/app/components/feature/auth/ProtectedRoute.tsx)
- Context: [apps/web/src/app/contexts/UserProfileContext.tsx](../../../apps/web/src/app/contexts/UserProfileContext.tsx)
- Middleware: [apps/web/src/middleware.ts](../../../apps/web/src/middleware.ts)

### Database Migrations
- `000_create_profiles_table.sql` - Initial profiles table
- `090_fix_handle_new_user_remove_referral_id.sql` - handle_new_user() trigger
- `091_add_error_handling_to_trigger.sql` - Error handling

---

**Last Updated**: 2025-12-12
**Version**: v2.0 (Supabase Auth)

# Authentication Feature - Prompt

**Version**: v2.0 (Supabase Auth)
**Date**: 2025-09-25 (Supabase Migration)
**Status**: Active
**Owner**: Backend Team
**Migration**: VIN-AUTH-MIG-04, VIN-AUTH-MIG-05

---

## Prompt

Implement a secure authentication system using Supabase Auth that supports email/password and Google OAuth authentication. The system must handle user signup with automatic profile creation, referral code attribution, session management with HTTP-only cookies, and role-based access control. Integrate with onboarding flow and ensure all protected routes are secured via middleware. Ask me any questions.

---

## Problem Statement

The platform needs a robust authentication system that:

1. **Lacks Referral Attribution**: No way to track who referred new signups for commission calculation
2. **No Profile Auto-Creation**: Manual profile creation after signup is error-prone
3. **Weak Session Security**: Client-side token storage is vulnerable
4. **No Role Management**: Users can't switch between client/tutor/agent roles
5. **Inconsistent Route Protection**: Some pages accessible without authentication
6. **Poor OAuth Experience**: OAuth doesn't force account selection, allowing wrong account logins
7. **No Onboarding Enforcement**: Users can skip onboarding and access incomplete features

---

## Goals

### Must Have
1. **Email/Password Authentication**: Standard signup and login with Supabase
2. **Google OAuth**: One-click signup/login with account selection prompt
3. **Automatic Profile Creation**: Database trigger creates profile on signup
4. **Referral Code Attribution**: Track and store referrer for lifetime commissions
5. **HTTP-Only Cookie Sessions**: Secure session storage via @supabase/ssr
6. **Middleware Route Protection**: Server-side validation of all protected routes
7. **Role-Based Access Control**: Multi-role support with role switching
8. **Onboarding Enforcement**: Redirect incomplete users to onboarding
9. **SEO-Friendly Profile Slugs**: Auto-generate unique slugs from user names
10. **OAuth Callback Handler**: Process OAuth redirects securely

### Should Have
1. **Password Reset Flow**: Complete forgot password implementation
2. **Email Verification**: Enforce email confirmation before access
3. **Session Refresh**: Auto-refresh tokens before expiration
4. **Global Sign-Out**: Clear all sessions across devices

### Nice to Have
1. **Multi-Factor Authentication (MFA)**: TOTP-based 2FA
2. **Social Login (Facebook, GitHub)**: Additional OAuth providers
3. **Magic Link Login**: Passwordless email authentication
4. **Session Management UI**: View and revoke active sessions

---

## Non-Goals

1. **Custom Auth System**: Use Supabase Auth exclusively
2. **JWT Token Storage in LocalStorage**: Only HTTP-only cookies
3. **Client-Side Password Hashing**: Handled by Supabase
4. **Custom OAuth Implementation**: Use Supabase OAuth flow
5. **Multi-Tenant Auth**: Single-tenant architecture only

---

## User Stories

### As a New User
- I want to sign up with email/password so I can create an account
- I want to sign up with Google so I can skip filling forms
- I want my referral code to be tracked so my referrer gets credit
- I want to be redirected to onboarding so I can complete my profile

### As a Returning User
- I want to log in with email/password so I can access my account
- I want to log in with Google so I can authenticate quickly
- I want my session to persist so I don't have to log in repeatedly
- I want to reset my password if I forget it

### As a Multi-Role User
- I want to switch between client/tutor/agent roles without re-authenticating
- I want my active role to persist across sessions
- I want role-specific navigation and features

### As a Referred User
- I want to click a referral link and have the code auto-filled
- I want to override the referral code if needed
- I want my referrer to get commission on my bookings forever

### As a Platform Owner
- I want all protected routes secured by middleware
- I want sessions stored securely in HTTP-only cookies
- I want automatic profile creation to prevent orphaned auth records
- I want onboarding completion enforced before feature access
- I want referral attribution to be reliable across devices

---

## Use Cases

### UC1: Email/Password Signup
1. User navigates to `/signup`
2. Fills form: email, password, first name, last name
3. Optionally enters referral code (auto-filled from cookie if available)
4. Clicks "Sign Up"
5. Supabase creates auth.users record
6. Database trigger `handle_new_user()` fires:
   - Creates profiles record with email, full_name
   - Generates unique 7-character referral_code
   - Generates SEO slug from full_name (handles collisions)
   - Looks up referrer by referral_code
   - Sets referred_by_profile_id for lifetime attribution
7. Session cookie set via @supabase/ssr
8. Redirect to `/onboarding`

### UC2: Google OAuth Signup
1. User clicks "Sign in with Google" on `/signup`
2. OAuth flow initiated: `signInWithOAuth({ provider: 'google', queryParams: { prompt: 'select_account' } })`
3. Redirects to Google account selection (forces account choice)
4. User approves
5. Google redirects to `/auth/callback` with code
6. Callback handler exchanges code for session
7. Same `handle_new_user()` trigger fires
8. Extracts full_name from Google metadata
9. Session cookie set
10. Redirect to `/onboarding`

### UC3: Email/Password Login
1. User navigates to `/login`
2. Enters email and password
3. Clicks "Sign In"
4. Supabase validates credentials via `signInWithPassword()`
5. Session cookie set
6. Middleware checks onboarding status
7. If incomplete → redirect to `/onboarding?step={current_step}`
8. If complete → redirect to `/dashboard`

### UC4: Referral Link Click & Signup
1. User A shares link: `/a/{referral_code}?redirect=/marketplace`
2. User B clicks link
3. Route handler `/a/[referral_id]/route.ts`:
   - Sets `tutorwise_referral_id` cookie (30 days)
   - Redirects to `/marketplace`
4. User B browses, then clicks "Sign Up"
5. Signup form pre-fills referral code from cookie
6. User B can override or confirm
7. Submits form
8. `handle_new_user()` trigger:
   - Looks up User A by referral_code
   - Sets `referred_by_profile_id = User A's ID` on User B's profile
9. Lifetime attribution established

### UC5: Protected Route Access (Middleware)
1. Unauthenticated user navigates to `/dashboard`
2. Middleware intercepts request
3. Calls `supabase.auth.getUser()` to check session
4. No valid session found
5. Redirect to `/login?redirect=/dashboard`
6. User logs in
7. Redirects back to `/dashboard`

### UC6: Onboarding Enforcement
1. User signs up (onboarding_progress.onboarding_completed = false)
2. User tries to access `/messages`
3. Middleware checks:
   - Session valid? YES
   - Onboarding complete? NO
4. Reads `onboarding_progress.current_step = 'role_selection'`
5. Redirects to `/onboarding?step=role_selection` (auto-resume)

### UC7: Role Switching
1. User completed onboarding as both client and tutor
2. `profiles.roles = ['client', 'tutor']`
3. `profiles.active_role = 'client'` (currently viewing as client)
4. User clicks "Switch to Tutor" in nav menu
5. Calls `switchRole('tutor')`
6. Updates `profiles.active_role = 'tutor'` in database
7. Stores in localStorage for persistence
8. UserProfileContext refreshes
9. Dashboard layout changes to tutor view

### UC8: Global Sign-Out
1. User clicks "Sign Out"
2. Calls `supabase.auth.signOut({ scope: 'global' })`
3. Clears Supabase session
4. Clears Google OAuth session (if OAuth user)
5. Deletes all session cookies
6. Hard redirect to `/` (homepage)

---

## Acceptance Criteria

### AC1: Email/Password Signup
- [ ] Signup form has fields: email, password, first_name, last_name, referral_code (optional)
- [ ] Supabase creates auth.users record
- [ ] auth.users.raw_user_meta_data stores first_name, last_name, full_name, referral_code
- [ ] handle_new_user() trigger creates profiles record
- [ ] Profile has: email, full_name, unique referral_code, unique slug
- [ ] If referral_code provided, referred_by_profile_id is set
- [ ] Session cookie set via @supabase/ssr
- [ ] Redirects to `/onboarding`

### AC2: Google OAuth Signup
- [ ] "Sign in with Google" button exists on signup/login pages
- [ ] OAuth flow uses `prompt: 'select_account'` to force account selection
- [ ] Redirects to `/auth/callback` after approval
- [ ] Callback exchanges code for session
- [ ] Same handle_new_user() trigger fires
- [ ] Extracts full_name from Google metadata
- [ ] Session cookie set
- [ ] Redirects to `/onboarding`

### AC3: Email/Password Login
- [ ] Login form has email and password fields
- [ ] Calls `signInWithPassword()`
- [ ] Success: Sets session cookie, redirects to dashboard
- [ ] Failure: Shows error message
- [ ] Incomplete onboarding: Redirects to `/onboarding?step={step}`

### AC4: Referral Attribution
- [ ] Referral link route: `/a/[referral_id]/route.ts`
- [ ] Sets `tutorwise_referral_id` cookie (30 days)
- [ ] Signup form pre-fills code from cookie
- [ ] User can override or confirm
- [ ] handle_new_user() looks up referrer by code
- [ ] Sets referred_by_profile_id correctly
- [ ] Lifetime attribution: All future bookings tagged with referrer

### AC5: Middleware Protection
- [ ] Protected routes defined: /dashboard, /messages, /account, /payments, etc.
- [ ] Public routes bypass: /, /login, /signup, /marketplace, /listings, /public-profile
- [ ] Middleware calls getUser() for protected routes
- [ ] No session → redirect to /login?redirect={original_path}
- [ ] Valid session + incomplete onboarding → redirect to /onboarding
- [ ] Valid session + complete onboarding → allow access

### AC6: Profile Creation Trigger
- [ ] Trigger: on_auth_user_created fires AFTER INSERT on auth.users
- [ ] Function: handle_new_user() creates profiles record
- [ ] Generates unique 7-character referral_code (e.g., "kRz7Bq2")
- [ ] Generates unique slug from full_name (e.g., "john-smith")
- [ ] Handles collisions: "john-smith-2", "john-smith-3"
- [ ] Extracts email, first_name, last_name from metadata
- [ ] Looks up referrer if referral_code provided

### AC7: Session Management
- [ ] Sessions stored in HTTP-only cookies via @supabase/ssr
- [ ] Server-side: Uses createClient() from utils/supabase/server.ts
- [ ] Client-side: Uses createClient() from utils/supabase/client.ts
- [ ] Auto-refresh before token expiration
- [ ] Global sign-out clears all cookies

### AC8: UserProfileContext
- [ ] Context provides: user, profile, activeRole, availableRoles, needsOnboarding
- [ ] Subscribes to onAuthStateChange
- [ ] Auto-fetches profile when session changes
- [ ] Provides switchRole() function
- [ ] Syncs active_role with database and localStorage

### AC9: Role Management
- [ ] profiles.roles[] array stores all roles
- [ ] profiles.active_role stores current role
- [ ] switchRole() validates user has access to role
- [ ] Updates database and localStorage
- [ ] Dashboard layout adapts to active role

### AC10: OAuth Callback Handler
- [ ] Route: /auth/callback/route.ts
- [ ] Exchanges code for session via exchangeCodeForSession()
- [ ] Handles errors gracefully
- [ ] Redirects to /onboarding for new users
- [ ] Redirects to /dashboard for existing users

---

## Test Cases

### TC1: Email/Password Signup Flow
1. Navigate to /signup
2. Fill form: email=test@example.com, password=Test123!, first_name=John, last_name=Smith
3. Submit
4. Verify auth.users created
5. Verify profiles created with:
   - email: test@example.com
   - full_name: John Smith
   - referral_code: 7 characters (e.g., "kRz7Bq2")
   - slug: john-smith
6. Verify session cookie set
7. Verify redirects to /onboarding

### TC2: Referral Attribution
1. User A (referral_code: "ABC123") shares link: /a/ABC123
2. User B clicks link
3. Verify tutorwise_referral_id cookie set
4. User B navigates to /signup
5. Verify referral_code field pre-filled with "ABC123"
6. User B submits form
7. Verify User B's referred_by_profile_id = User A's ID
8. Create booking for User B
9. Verify User A gets 10% commission

### TC3: Google OAuth Flow
1. Click "Sign in with Google" on /login
2. Verify redirects to Google with prompt=select_account
3. Select account and approve
4. Verify redirects to /auth/callback
5. Verify session created
6. Verify redirects to /onboarding (new user) or /dashboard (existing)

### TC4: Middleware Protection
1. Navigate to /dashboard (unauthenticated)
2. Verify redirects to /login?redirect=/dashboard
3. Log in
4. Verify redirects to /dashboard

### TC5: Onboarding Enforcement
1. Sign up (onboarding incomplete)
2. Try accessing /messages
3. Verify redirects to /onboarding?step={current_step}
4. Complete onboarding
5. Try accessing /messages again
6. Verify access granted

### TC6: Role Switching
1. User has roles: ['client', 'tutor']
2. active_role = 'client'
3. Call switchRole('tutor')
4. Verify database updated: active_role = 'tutor'
5. Verify localStorage updated
6. Verify dashboard shows tutor view

### TC7: Session Persistence
1. Log in
2. Close browser
3. Reopen browser
4. Navigate to /dashboard
5. Verify still authenticated (session persists)

### TC8: Global Sign-Out
1. Log in via Google OAuth
2. Click "Sign Out"
3. Verify session cleared
4. Verify redirects to /
5. Try accessing /dashboard
6. Verify redirects to /login

---

## Success Metrics

1. **Signup Conversion**: 80% of users complete signup without errors
2. **Referral Attribution**: 95%+ of referred signups correctly attributed
3. **OAuth Success Rate**: 90%+ of OAuth flows complete successfully
4. **Profile Creation**: 100% of signups auto-create profiles (no orphaned auth records)
5. **Session Security**: 0 client-side token exposures
6. **Route Protection**: 100% of protected routes secured
7. **Onboarding Completion**: 70%+ complete onboarding within 7 days

---

## Integration Points

### Onboarding Feature
- Signup redirects to /onboarding
- Middleware enforces onboarding completion
- onboarding_progress JSONB tracks state

### Referrals Feature
- Referral codes stored in profiles.referral_code
- Lifetime attribution via referred_by_profile_id
- Referrals table tracks pipeline (Referred → Signed Up → Converted)

### Payments Feature
- Payment webhook reads referred_by_profile_id for commission calculation
- 3-way/4-way splits based on referrer and agent

### Profile/Account Feature
- UserProfileContext provides global auth state
- Role switching updates active_role
- Profile data synced with auth metadata

### Network Feature
- Manual connection requests (no auto-connect on signup)
- Guardian-student relationships (GUARDIAN type)

### Middleware
- Protects all authenticated routes
- Enforces onboarding completion
- Validates sessions server-side

### Wiselist Feature
- Wiselist referrer attribution via cookies
- Stored in bookings.booking_referrer_id

---

## Dependencies

### External Services
- Supabase Auth (authentication provider)
- Google OAuth (identity provider)
- @supabase/ssr (SSR cookie management)

### Database
- Tables: auth.users (Supabase managed), profiles, referrals
- Triggers: on_auth_user_created, profiles_update_timestamp
- Functions: handle_new_user(), generate_referral_code(), generate_slug()

### Frontend
- Next.js 14+ App Router
- Server Components (utils/supabase/server.ts)
- Client Components (utils/supabase/client.ts)
- React Context (UserProfileContext)

---

## Technical Notes

### Referral Code Generation
```sql
-- Generate 7-character alphanumeric code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Slug Generation with Collision Handling
```sql
-- In handle_new_user() trigger
v_slug_base := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]+', '-', 'g'));
v_slug := v_slug_base;
v_slug_count := 1;

-- Loop to find unique slug
WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = v_slug) LOOP
  v_slug_count := v_slug_count + 1;
  v_slug := v_slug_base || '-' || v_slug_count::TEXT;
END LOOP;
```

### Middleware Session Validation
```typescript
// In middleware.ts
const { data: { user } } = await supabase.auth.getUser();

if (!user && isProtectedRoute) {
  return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url));
}

if (user && !onboardingComplete) {
  return NextResponse.redirect(new URL(`/onboarding?step=${currentStep}`, request.url));
}
```

### OAuth Account Selection
```typescript
// Force Google account selection
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: {
      prompt: 'select_account',  // Forces account picker
    },
  },
});
```

---

**Last Updated**: 2025-12-12
**For Implementation**: See `auth-solution-design.md`
**Migration Notes**: Migrated from Kinde to Supabase Auth (Sept 2025)

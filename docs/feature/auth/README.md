# Authentication Feature

**Status**: Active
**Last Code Update**: 2026-01-27 (Email confirmation token_hash flow)
**Last Doc Update**: 2026-01-27
**Priority**: High (Tier 1 - Critical)
**Version**: v2.0 (Supabase Auth)

---

## Quick Links
- [AI Prompt](./auth-prompt.md)
- [Solution Design](./auth-solution-design.md)
- [Implementation Guide](./auth-implementation.md)

---

## Overview

The Authentication feature provides secure user authentication and authorization for Tutorwise using **Supabase Auth**. The system supports email/password authentication, Google OAuth, and comprehensive session management with role-based access control.

**Migration Note**: This system was migrated from Kinde to Supabase Auth in September 2025 (Requirement ID: VIN-AUTH-MIG-04).

---

## Key Features

### Authentication Methods
- Email/password authentication
- Google OAuth (account selection prompt)
- Password reset (UI exists, not fully connected)
- MFA (planned)

### Session Management
- HTTP-only cookie storage via `@supabase/ssr`
- Automatic session refresh
- Server-side and client-side validation
- Global sign-out (clears both Supabase and Google sessions)

### Access Control
- Route protection via middleware
- Client-side route guards (`ProtectedRoute` component)
- Role-based access control (client, tutor, agent, student)
- Onboarding requirement enforcement

### User Profile Integration
- Automatic profile creation via database trigger
- Referral code generation (7-character alphanumeric)
- SEO-friendly slug generation (e.g., "john-smith")
- Role management with role switching
- Onboarding progress tracking

---

## Current Status

### Implementation Status
- Login page with email/password and Google OAuth
- Signup page with metadata collection
- OAuth callback handler
- Protected route component
- Session middleware
- UserProfileContext for global state
- Role guard hook
- Forgot password page (UI only, needs Supabase integration)

### Components (1 total)
1. **ProtectedRoute** - Client-side route protection wrapper

### Pages (4 auth pages)
1. **Login** (`/login`) - Sign in page
2. **Signup** (`/signup`) - Registration page
3. **Confirm Email** (`/confirm-email`) - Email verification via token_hash
4. **Forgot Password** (`/forgot-password`) - Password reset request

### Routes

**Public Routes**:
- `/login` - Sign in
- `/signup` - Registration
- `/confirm-email` - Email confirmation (handles token_hash verification)
- `/forgot-password` - Password reset request
- `/auth/callback` - OAuth callback handler and token_hash fallback

**Protected Routes** (via middleware):
- All routes under `/(authenticated)/` group
- Customizable via middleware configuration

---

## Architecture

### Server vs Client Components

**Server Components**:
- Use `createClient()` from `utils/supabase/server.ts`
- Access user via `await supabase.auth.getUser()`
- Ideal for data fetching

**Client Components**:
- Use `createClient()` from `utils/supabase/client.ts`
- Access user via `useUserProfile()` hook
- Ideal for interactive UI

### Session Storage

Sessions are stored in HTTP-only cookies via `@supabase/ssr`:
- Cookie name: `sb-<project-ref>-auth-token`
- Secure, HttpOnly, SameSite=Lax
- Auto-refreshes before expiration

---

## User Journey

### Sign Up Flow

```
1. User visits /signup
2. Fills form (email, password, name, referral code)
3. Clicks "Sign Up"
4. Supabase creates auth.users record
5. Database trigger creates profiles record
6. If email confirmation disabled: Session created, redirect to /onboarding
7. If email confirmation enabled: User receives email with confirmation link
```

### Email Confirmation Flow (token_hash)

```
1. User clicks confirmation link in email
2. Link format: /confirm-email?token_hash={hash}&type=signup
3. /confirm-email page verifies token_hash via supabase.auth.verifyOtp()
4. On success: Session created, redirect to /onboarding
5. On error: Display error with options to login or signup again
```

**Why token_hash instead of PKCE?**
- PKCE stores `code_verifier` in localStorage during signup
- If user opens email link in different browser/device, code_verifier is missing
- token_hash verification works across any browser/device
- More reliable for email confirmation flows

### Sign In Flow

```
1. User visits /login
2. Enters email/password OR clicks "Sign in with Google"
3. Supabase validates credentials
4. Session cookie set
5. Redirect to /dashboard (or intended page)
```

### OAuth Flow

```
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent screen
3. User approves
4. Google redirects to /auth/callback
5. Callback handler exchanges code for session
6. Session cookie set
7. Redirect to /dashboard
```

---

## Role-Based Access Control

### Roles
- **client** - Default role for new users
- **tutor** - Provides tutoring services
- **agent** - Manages tutors and clients
- **student** - (Legacy, being phased out)

### Role Switching

Users can have multiple roles and switch between them:

```typescript
const { activeRole, switchRole } = useUserProfile();

await switchRole('tutor'); // Switch to tutor role
```

### Role Protection

```typescript
// Page-level protection
const { isAllowed } = useRoleGuard(['tutor', 'agent']);

if (!isAllowed) return null; // Auto-redirects
```

---

## Database Integration

### auth.users (Supabase Managed)
- `id` (UUID)
- `email`
- `email_confirmed_at`
- `raw_user_meta_data` (JSON with first_name, last_name, referral_code)

### profiles (Custom Table)
- `id` (UUID, FK to auth.users.id)
- `email`, `first_name`, `last_name`, `full_name`
- `roles` (TEXT[] - array of roles)
- `active_role` (TEXT - current role)
- `referral_code` (TEXT UNIQUE - for referrals)
- `referred_by_profile_id` (UUID - referral attribution)
- `slug` (TEXT UNIQUE - SEO-friendly URL)
- `onboarding_progress` (JSONB)

### handle_new_user() Trigger

Automatically runs on user signup:
1. Generates unique 7-character referral code
2. Extracts metadata from `raw_user_meta_data`
3. Creates profile record
4. Handles referral attribution (lifetime commission)
5. Generates unique slug from full_name
6. Handles slug collisions (john-smith-2, john-smith-3, etc.)

---

## System Integrations

The authentication system integrates with **12 major platform features**:

1. **Onboarding** - Middleware enforces completion before feature access
2. **Referrals** - Lifetime attribution via `referred_by_profile_id`
3. **Payments** - Commission calculation based on referrer
4. **Profile/Account** - UserProfileContext provides global auth state
5. **Network** - Manual connection system (no auto-connect)
6. **Middleware** - Server-side route protection
7. **Wiselist** - In-network sales attribution via cookies
8. **Session Management** - HTTP-only cookies, auto-refresh
9. **Google OAuth** - Forced account selection
10. **Email Confirmation** - token_hash verification (works across browsers/devices)
11. **Database Triggers** - Automatic profile creation
12. **Bookings** - User ID references, role-based filtering

See [auth-solution-design.md](./auth-solution-design.md) for detailed integration documentation.

---

## Common Use Cases

### Protect a Route

```typescript
// Middleware approach (server-side)
// File: apps/web/src/middleware.ts
const protectedRoutes = ['/dashboard', '/messages'];

// Component approach (client-side)
import ProtectedRoute from '@/app/components/feature/auth/ProtectedRoute';

export default function MyPage() {
  return (
    <ProtectedRoute>
      <div>Protected content</div>
    </ProtectedRoute>
  );
}
```

### Get Current User

```typescript
// Client component
const { user, profile } = useUserProfile();

// Server component
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### Sign Out

```typescript
const supabase = createClient();
await supabase.auth.signOut({ scope: 'global' });
window.location.href = '/'; // Hard redirect
```

---

## Recent Updates (2025)

### September 2025 - Supabase Migration
- Migrated from Kinde to Supabase Auth
- Rebuilt all auth pages with Supabase client
- Updated database triggers for profile creation
- Implemented OAuth callback handler

### Known Issues
- MFA not implemented

### Recently Fixed (January 2026)
- Email confirmation flow now uses token_hash (works across browsers/devices)
- Password reset flow uses token_hash verification
- All Supabase email templates updated with token_hash URLs

---

## Performance Metrics

### Current Performance
- **Login Time**: ~500ms (email/password)
- **OAuth Flow**: ~2-3s (including Google redirect)
- **Session Validation**: <50ms (server-side)
- **Profile Fetch**: ~100ms
- **Middleware Overhead**: ~50ms per request

---

## Security Features

### Authentication
- Password hashing via Supabase Auth
- Secure session tokens
- HTTP-only cookies
- CSRF protection via Supabase

### Authorization
- Row Level Security (RLS) on profiles table
- Server-side session validation
- Role-based access control
- Middleware route protection

---

## Related Features

### Dependencies
- **onboarding** - Post-signup flow
- **account** - Profile management
- **roles** - Role switching
- **referrals** - Referral code tracking and lifetime attribution
- **network** - User connections
- **payments** - Commission calculation
- **wiselist** - In-network sales tracking

---

## Quick Reference

```
Authentication Quick Reference

Login Page:       /login
Signup Page:      /signup
Forgot Password:  /forgot-password
OAuth Callback:   /auth/callback

Component:        ProtectedRoute.tsx
Context:          UserProfileContext.tsx
Hook:             useRoleGuard.tsx
Middleware:       middleware.ts

Database:         auth.users, profiles
Trigger:          handle_new_user()
Functions:        generate_referral_code(), generate_slug()

Auth Provider:    Supabase Auth
OAuth Provider:   Google

Version:          v2.0 (Supabase)
Last Updated:     2025-12-12
```

---

**Owner**: Backend Team
**Contributors**: Multiple
**Support**: #backend-support
**Migration Requirement**: VIN-AUTH-MIG-04

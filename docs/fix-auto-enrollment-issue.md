# Fix Auto-Enrollment Issue

## Problem

Users are automatically enrolled as "client/seeker" immediately upon signup, before they see the role selection page. This happens even though the onboarding page correctly displays role selection.

## Root Cause

**Migration 021** (`apps/api/migrations/021_add_default_seeker_role.sql`) automatically assigns the 'seeker' role to all new users in the database trigger:

```sql
-- Line 67-68 in migration 021
roles = ARRAY['seeker']::text[],  -- Default role for all new users
active_role = 'seeker'            -- Default active role
```

This happens immediately when the user signs up, BEFORE they reach the onboarding page to select their role.

## User Flow (Current - BROKEN)

1. User signs up at `/signup`
2. **Database trigger auto-assigns 'seeker' role** ❌
3. User redirected to `/onboarding` (role selection page)
4. Role selection page shows "Client" card as disabled (because they already have seeker role)
5. User is confused - they expected to select a role first

## User Flow (Fixed - CORRECT)

1. User signs up at `/signup`
2. **Database trigger creates profile with empty roles array** ✅
3. User redirected to `/onboarding` (role selection page)
4. User sees all 3 roles available: Client, Tutor, Agent
5. User selects their role (e.g., "Tutor")
6. User goes through role-specific onboarding (e.g., `/onboarding/tutor`)
7. **Role is added when onboarding completes** (ClientOnboardingWizard or TutorOnboardingWizard)

## Solution

Created **Migration 024** (`apps/api/migrations/024_remove_default_seeker_role.sql`) that:

1. Updates `handle_new_user()` trigger to set `roles = ARRAY[]::text[]` (empty array)
2. Updates `handle_new_user()` trigger to set `active_role = NULL`
3. Removes all default role assignment logic

### Key Changes in Migration 024

```sql
-- NEW: No default role assigned
INSERT INTO public.profiles (
  id,
  referral_id,
  email,
  full_name,
  first_name,
  last_name,
  avatar_url,
  roles,
  active_role
)
VALUES (
  NEW.id,
  v_referral_id,
  NEW.email,
  v_full_name,
  v_first_name,
  v_last_name,
  v_avatar_url,
  ARRAY[]::text[],  -- Empty array - no default role
  NULL              -- No active role until user selects one
);
```

## Where Roles Get Added

Roles are correctly added when users complete role-specific onboarding:

### Client Role
- **File:** `apps/web/src/app/components/onboarding/client/ClientOnboardingWizard.tsx`
- **Line:** 211-217
- **Code:**
```typescript
if (!currentRoles.includes('seeker')) {
  const updatedRoles = [...currentRoles, 'seeker'];
  await supabase
    .from('profiles')
    .update({ roles: updatedRoles })
    .eq('id', user?.id);
}
```

### Tutor Role
- **File:** `apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx`
- **Line:** 291-303
- **Code:**
```typescript
if (profile && !profile.roles.includes('provider')) {
  const updatedRoles = [...(profile.roles || []), 'provider'];
  await supabase
    .from('profiles')
    .update({
      roles: updatedRoles,
      active_role: 'provider'
    })
    .eq('id', user!.id);
}
```

## Deployment Instructions

### 1. Apply Migration 024 to Production

**IMPORTANT:** This must be applied manually via Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Open `apps/api/migrations/024_remove_default_seeker_role.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor
5. Run the migration
6. Verify success

### 2. Test the Flow

1. Sign up as a new user
2. Verify you see the role selection page with all 3 roles available
3. Select "Tutor" role
4. Complete tutor onboarding
5. Verify the 'provider' role is added to your profile
6. Check database: `SELECT id, email, roles, active_role FROM profiles WHERE email = 'your-email';`

### 3. Expected Database State

**Before Migration 024:**
```sql
SELECT id, email, roles, active_role FROM profiles;
-- New user immediately has:
-- roles: {seeker}
-- active_role: seeker
```

**After Migration 024:**
```sql
SELECT id, email, roles, active_role FROM profiles;
-- New user starts with:
-- roles: {}  (empty array)
-- active_role: NULL

-- After completing tutor onboarding:
-- roles: {provider}
-- active_role: provider
```

## Files Changed

1. **apps/api/migrations/024_remove_default_seeker_role.sql** (NEW)
   - Removes default seeker role assignment from `handle_new_user()` trigger

## Testing Checklist

- [ ] Apply migration 024 to production database
- [ ] Sign up as new user
- [ ] Verify role selection page shows all 3 roles available (not disabled)
- [ ] Select "Client" role
- [ ] Complete client onboarding
- [ ] Verify 'seeker' role is added to profile
- [ ] Sign up as another new user
- [ ] Select "Tutor" role
- [ ] Complete tutor onboarding
- [ ] Verify 'provider' role is added to profile
- [ ] Verify listing templates are generated for tutors

## Related Files

- `apps/web/src/app/onboarding/page.tsx` - Role selection page
- `apps/web/src/app/onboarding/client/page.tsx` - Client onboarding entry
- `apps/web/src/app/onboarding/tutor/page.tsx` - Tutor onboarding entry
- `apps/web/src/app/auth/callback/route.ts` - Redirects to `/onboarding` after signup
- `apps/api/migrations/021_add_default_seeker_role.sql` - Original migration (now superseded)

---

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>

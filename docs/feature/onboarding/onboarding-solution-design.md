# Onboarding Feature - Solution Design

**Version**: v2.0
**Date**: 2025-12-12

## Overview

Multi-step wizard system that guides new users through role-specific setup (client/tutor/agent) with progress persistence, skip functionality, and dashboard gating.

## Core Architecture

1. **Role Selection Landing**: `/onboarding` shows 3 role cards
2. **Role-Specific Wizards**: Separate flows for client (5 steps), tutor (8 steps), agent (6 steps)
3. **Progress Persistence**: JSONB `onboarding_progress` column stores step completion
4. **Dashboard Gating**: `needsOnboarding` flag redirects incomplete users
5. **Auto-Resume**: URL param `?step=3` resumes at specific step
6. **Completion**: Sets `onboarding_completed = true`, adds role to `roles` array

## Database Schema

```sql
-- profiles table
ALTER TABLE profiles ADD COLUMN onboarding_progress JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN roles TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN active_role TEXT;

-- onboarding_progress structure
{
  "onboarding_completed": false,
  "last_updated": "2025-12-12T10:00:00Z",
  "tutor": {
    "step_completed": 3,
    "subjects": ["Mathematics", "Physics"],
    "hourly_rate": 35,
    "dbs_uploaded": false
  },
  "client": {
    "step_completed": 2,
    "goals": ["GCSE preparation"],
    "budget": 30
  },
  "agent": {
    "step_completed": 1,
    "agency_name": "ABC Tutoring"
  }
}
```

## Key Workflows

### Complete Onboarding Flow
```
1. User signs up → handle_new_user trigger
2. Redirect to /onboarding (role selection)
3. User clicks "Tutor" → /onboarding/tutor
4. TutorOnboardingWizard renders step 1
5. User completes step 1 → updateOnboardingProgress({ tutor: { step_completed: 1, ...data } })
6. Wizard advances to step 2
7. Repeat steps 5-6 until step 8
8. On completion:
   - Set onboarding_completed = true
   - Add 'tutor' to roles array
   - Set active_role = 'tutor'
   - Redirect to /dashboard
```

### Dashboard Gating
```typescript
// UserProfileContext.tsx
const needsOnboarding = useMemo(() => {
  if (!profile) return false;
  if (profile.onboarding_progress?.onboarding_completed) return false;
  return (profile.roles || []).length === 0;
}, [profile]);

// Dashboard page.tsx
if (needsOnboarding) {
  router.push('/onboarding');
  return null;
}
```

## Integration with Dashboard

**Updated dashboard-prompt.md Integration Points section**:
```markdown
1. **UserProfileContext** (CRITICAL - Auth State):
   - Provides `profile`, `activeRole`, `isLoading`, `needsOnboarding`
   - Dashboard redirects to `/login` if not authenticated
   - Dashboard redirects to `/onboarding` if `needsOnboarding === true`
```

Dashboard now has onboarding gate that redirects users who haven't completed at least one role's onboarding flow.

---

**Last Updated**: 2025-12-12

# Onboarding Feature - AI Prompt

**Version**: v2.0
**Date**: 2025-12-12

## Feature Overview

Multi-step wizard guiding users through role-specific setup with progress tracking and dashboard gating.

**Key Responsibilities**:
- Role selection landing page
- 3 role-specific wizards (client/tutor/agent)
- Progress persistence (JSONB)
- Dashboard gating
- Auto-resume functionality

## System Context

### Database Tables

- `profiles.onboarding_progress` (JSONB) - Step completion tracking
- `profiles.roles` (TEXT[]) - Array of enrolled roles
- `profiles.active_role` (TEXT) - Currently selected role

### Key Functions

**UserProfileContext**:
```typescript
const needsOnboarding = useMemo(() => {
  if (!profile) return false;
  if (profile.onboarding_progress?.onboarding_completed) return false;
  return (profile.roles || []).length === 0;
}, [profile]);

const updateOnboardingProgress = async (progress: Partial<OnboardingProgress>) => {
  const updatedProgress = {
    ...profile.onboarding_progress,
    ...progress,
    last_updated: new Date().toISOString(),
  };
  
  await supabase
    .from('profiles')
    .update({ onboarding_progress: updatedProgress })
    .eq('id', user.id);
};
```

## Onboarding Flows

**Tutor (8 steps)**: Subjects, Qualifications, Experience, Rate, Photo, DBS, Review, Complete
**Client (5 steps)**: Goals, Subjects, Education, Budget, Complete
**Agent (6 steps)**: Agency Info, Services, Coverage, Commission, Review, Complete

## Integration with Dashboard

Dashboard now checks `needsOnboarding` and redirects to `/onboarding` if true. This ensures users complete at least one role's onboarding before accessing the dashboard.

---

**Last Updated**: 2025-12-12

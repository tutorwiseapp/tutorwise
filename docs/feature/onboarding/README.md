# Onboarding

**Status**: Active
**Last Code Update**: 2025-12-12
**Last Doc Update**: 2025-12-12
**Priority**: Critical (Tier 0 - User Acquisition)
**Architecture**: Multi-Step Wizard with Role-Specific Flows

## Quick Links
- [Solution Design](./onboarding-solution-design.md)
- [Implementation Guide](./onboarding-implementation.md)
- [AI Prompt Context](./onboarding-prompt.md)

## Overview

The Onboarding feature guides new users through role-specific setup flows (client, tutor, agent) to ensure profile completeness before accessing the dashboard. Built as a multi-step wizard with progress tracking, skip functionality, and deep integration with UserProfileContext and Dashboard gating.

## Key Features

- **Role Selection Landing**: Choose between client, tutor, or agent
- **Multi-Step Wizards**: 3-8 steps per role with progress indicator
- **Progress Persistence**: JSONB storage for resume functionality
- **Skip Capability**: Users can skip and complete later
- **Dashboard Gating**: Redirects incomplete users from dashboard
- **Role Verification**: Prevents duplicate role enrollment
- **Auto-Resume**: URL param `?step=3` resumes at specific step
- **Profile Enrichment**: Collects professional_details JSONB data
- **Onboarding Completion Flag**: Sets `onboarding_completed = true`

## Component Architecture

### Main Pages
- [onboarding/page.tsx](../../../apps/web/src/app/onboarding/page.tsx) - Role selection landing
- [onboarding/tutor/page.tsx](../../../apps/web/src/app/onboarding/tutor/page.tsx) - Tutor wizard wrapper
- [onboarding/client/page.tsx](../../../apps/web/src/app/onboarding/client/page.tsx) - Client wizard wrapper
- [onboarding/agent/page.tsx](../../../apps/web/src/app/onboarding/agent/page.tsx) - Agent wizard wrapper

### Wizard Components
- `TutorOnboardingWizard` - 8-step tutor flow
- `ClientOnboardingWizard` - 5-step client flow
- `AgentOnboardingWizard` - 6-step agent flow

### Integration
- `UserProfileContext` - Profile state, onboarding_progress management
- `Dashboard` - Onboarding gate, redirects if `needsOnboarding === true`

## Routes

### Main Routes
- `/onboarding` - Role selection (landing page)
- `/onboarding/tutor?step=3` - Tutor wizard (resume at step 3)
- `/onboarding/client` - Client wizard
- `/onboarding/agent` - Agent wizard

### Redirects
- Dashboard → `/onboarding` if `needsOnboarding === true`
- `/onboarding` → `/dashboard` if `onboarding_completed === true` and all roles enrolled

## Database Schema

### onboarding_progress (JSONB column in profiles)

```typescript
{
  onboarding_completed: boolean,
  last_updated: string,
  client?: {
    step_completed: number,
    goals: string[],
    subjects: string[],
    budget: number,
    completed_at?: string
  },
  tutor?: {
    step_completed: number,
    subjects: string[],
    qualifications: string[],
    hourly_rate: number,
    dbs_uploaded: boolean,
    completed_at?: string
  },
  agent?: {
    step_completed: number,
    agency_name: string,
    services: string[],
    completed_at?: string
  }
}
```

## Key Workflows

### New User Sign-up Flow
```
1. User signs up → handle_new_user trigger creates profile
2. Redirect to /onboarding (role selection)
3. User selects role (e.g., tutor)
4. Redirect to /onboarding/tutor
5. Complete 8-step wizard
6. Set onboarding_completed = true
7. Add 'tutor' to roles array
8. Redirect to /dashboard
```

### Dashboard Gating Flow
```
1. User navigates to /dashboard
2. UserProfileContext calculates needsOnboarding
3. If needsOnboarding === true:
   - Redirect to /onboarding
4. Else:
   - Render dashboard
```

### Resume Progress Flow
```
1. User completes steps 1-3 of tutor onboarding
2. onboarding_progress.tutor.step_completed = 3
3. User closes browser
4. User returns to /onboarding/tutor
5. Wizard auto-resumes at step 4
```

## Integration Points

- **UserProfileContext**: `needsOnboarding`, `updateOnboardingProgress()`, `refreshProfile()`
- **Dashboard**: Onboarding gate redirects incomplete users
- **Signup**: Auto-redirects new users to `/onboarding`
- **Roles Array**: Updates `profile.roles` with new role on completion
- **Active Role**: Sets `active_role` to newly enrolled role
- **Professional Details**: Updates `professional_details` JSONB with role-specific data

## Onboarding Steps by Role

### Tutor (8 Steps)
1. Welcome & Intro
2. Subjects & Expertise
3. Qualifications
4. Teaching Experience
5. Hourly Rate & Availability
6. Profile Photo & Bio
7. DBS & Verification Documents
8. Review & Complete

### Client (5 Steps)
1. Welcome & Learning Goals
2. Subjects of Interest
3. Education Level & Preferences
4. Budget & Session Frequency
5. Review & Complete

### Agent (6 Steps)
1. Welcome & Agency Info
2. Agency Name & Size
3. Services Offered
4. Service Areas & Coverage
5. Commission Structure
6. Review & Complete

## needsOnboarding Logic

```typescript
const needsOnboarding = useMemo(() => {
  if (!profile) return false;
  
  // If onboarding_completed flag is true, don't require onboarding
  if (profile.onboarding_progress?.onboarding_completed) return false;
  
  // Check if user has any roles
  const hasRoles = (profile.roles || []).length > 0;
  
  // If no roles, need onboarding
  return !hasRoles;
}, [profile]);
```

## Status

- [x] Role selection landing page
- [x] Tutor 8-step wizard
- [x] Client 5-step wizard
- [x] Agent 6-step wizard
- [x] Progress persistence (JSONB)
- [x] Auto-resume functionality
- [x] Dashboard gating
- [x] Skip capability
- [x] Role verification (prevent duplicates)
- [x] UserProfileContext integration
- [x] Active role setting on completion

---

**Last Updated**: 2025-12-12
**Version**: v2.0 (Simplified Flow)
**Architecture**: Multi-Step Wizard with JSONB Progress Tracking
**For Questions**: See [onboarding-implementation.md](./onboarding-implementation.md)

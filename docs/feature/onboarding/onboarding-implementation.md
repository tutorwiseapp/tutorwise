# Onboarding Feature - Implementation Guide

**Version**: v2.0
**Date**: 2025-12-12

## File Structure

```
apps/web/src/app/
  onboarding/
    page.tsx                                    # Role selection
    tutor/page.tsx                              # Tutor wrapper
    client/page.tsx                             # Client wrapper
    agent/page.tsx                              # Agent wrapper
  
  components/feature/onboarding/
    tutor/TutorOnboardingWizard.tsx            # 8-step wizard
    client/ClientOnboardingWizard.tsx          # 5-step wizard
    agent/AgentOnboardingWizard.tsx            # 6-step wizard
  
  contexts/
    UserProfileContext.tsx                      # needsOnboarding, updateOnboardingProgress
```

## Common Tasks

### Task 1: Add New Step to Tutor Wizard

```typescript
// TutorOnboardingWizard.tsx

const TOTAL_STEPS = 9; // Was 8, now 9

// Add step 9 component
const Step9VideoIntro = () => (
  <div className={styles.step}>
    <h2>Record a 30-second intro video</h2>
    <VideoUploader onUpload={handleVideoUpload} />
    <button onClick={() => handleNext(9)}>Next</button>
  </div>
);

// Add to wizard steps array
const steps = [
  Step1Welcome,
  Step2Subjects,
  Step3Qualifications,
  Step4Experience,
  Step5RateAvailability,
  Step6PhotoBio,
  Step7DBSVerification,
  Step8Review,
  Step9VideoIntro, // NEW
];
```

### Task 2: Modify needsOnboarding Logic

```typescript
// UserProfileContext.tsx

const needsOnboarding = useMemo(() => {
  if (!profile) return false;
  
  // NEW: Allow partial completion (if user has at least one role)
  const hasRoles = (profile.roles || []).length > 0;
  if (hasRoles) return false;
  
  // OLD: Strict completion check
  // if (profile.onboarding_progress?.onboarding_completed) return false;
  
  return true;
}, [profile]);
```

### Task 3: Enable Auto-Resume

```typescript
// tutor/page.tsx

const searchParams = useSearchParams();
const resumeStep = searchParams?.get('step');

<TutorOnboardingWizard
  initialStep={resumeStep || undefined}
  onComplete={handleOnboardingComplete}
/>
```

---

**Last Updated**: 2025-12-12

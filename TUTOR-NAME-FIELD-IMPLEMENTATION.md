# Tutor Name Field "Loading..." Bug Fix

## Problem
The Full Name field in the listing creation wizard showed "Loading..." instead of pre-populating with the user's name from their profile.

## Root Cause
The CreateListingWizard component had a timing issue where:
1. The component rendered before profile data was available
2. The `formData` state was initialized without the `tutor_name` field
3. The auto-populate useEffect ran after initial render, but Step1BasicInfo had already rendered with empty data
4. Step1BasicInfo displayed "Loading..." as a fallback when `formData.tutor_name` was undefined

## Solution Attempts

### Option 1 (Failed): Parent-level Loading Guard
Initially attempted to add a loading guard in CreateListingWizard and pre-populate during state initialization. This didn't fully resolve the timing issue because the profile might load after the wizard component initializes but before Step1BasicInfo renders.

### Option 2 (Implemented): Context-Aware Step Component
Made Step1BasicInfo directly aware of the UserProfileContext to handle profile loading reactively:

**Step1BasicInfo.tsx Changes:**
```typescript
import { useUserProfile } from '@/app/contexts/UserProfileContext';

export default function Step1BasicInfo({ formData, onNext, onBack }: Step1Props) {
  const { profile, isLoading: isProfileLoading } = useUserProfile();

  // Initialize tutorName state - start potentially empty
  const [tutorName, setTutorName] = useState(formData.tutor_name || '');
  const [isWaitingForProfile, setIsWaitingForProfile] = useState(!formData.tutor_name);

  useEffect(() => {
    // Priority 1: If formData prop changes *after* initial render (e.g., loading a draft), update local state
    if (formData.tutor_name && formData.tutor_name !== tutorName) {
      console.log('[Step1BasicInfo] Syncing tutor name from formData prop change:', formData.tutor_name);
      setTutorName(formData.tutor_name);
      setIsWaitingForProfile(false);
    }
    // Priority 2: If profile has loaded AND local state is still empty AND formData didn't provide it initially
    else if (!isProfileLoading && profile?.full_name && !tutorName && isWaitingForProfile) {
      console.log('[Step1BasicInfo] Initializing tutor name from loaded profile context:', profile.full_name);
      setTutorName(profile.full_name);
      setIsWaitingForProfile(false);
    }
    // Optional: If profile loads but has no full_name, stop waiting
    else if (!isProfileLoading && !profile?.full_name && isWaitingForProfile) {
      console.log('[Step1BasicInfo] Profile loaded but no full_name found.');
      setIsWaitingForProfile(false);
    }
  }, [profile, isProfileLoading, formData.tutor_name, tutorName, isWaitingForProfile]);

  // Input field now shows loading state correctly
  <input
    value={tutorName || (isProfileLoading ? 'Loading...' : '')}
    readOnly
    disabled
  />
}
```

**Key Benefits:**
- Step1BasicInfo can reactively respond to profile loading state changes
- Handles both scenarios: profile loads before rendering AND profile loads after rendering
- Prioritizes formData (draft) over profile data
- Only shows "Loading..." when actually waiting for profile

## Files Modified
- `apps/web/src/app/components/listings/CreateListingWizard.tsx` (Option 1 - kept for additional safety)
- `apps/web/src/app/components/listings/wizard-steps/Step1BasicInfo.tsx` (Option 2 - primary fix)

## Testing
- Build passed: ✅
- Tutor name should now populate correctly regardless of profile loading timing
- Debug logging added to track initialization path

## Future Consideration: Option 3
Create 3 default listing templates (Maths, English, Science) at the same time the user profile is created. This would eliminate timing/race conditions entirely by ensuring both full_name and tutor_name exist together from the start.

## Related Issues
This is the same issue that was previously fixed in the dashboard (see dashboard/page.tsx:88 for reference pattern).

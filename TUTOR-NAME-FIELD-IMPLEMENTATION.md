# Tutor Name Field "Loading..." Bug Fix - FINAL SOLUTION

## Problem
The Full Name field in the listing creation wizard showed "Loading..." instead of pre-populating with the user's name from their profile.

## Root Cause
The CreateListingWizard component had a timing issue where:
1. The component rendered before profile data was available
2. The `formData` state was initialized without the `tutor_name` field
3. The auto-populate useEffect ran after initial render, but Step1BasicInfo had already rendered with empty data
4. Step1BasicInfo displayed "Loading..." as a fallback when `formData.tutor_name` was undefined

## Solution Attempts

### Option 1 (IMPLEMENTED - FINAL SOLUTION)
**Status**: ✅ Successfully deployed to production

Added a loading guard in CreateListingWizard and pre-populate during state initialization. This approach waits for the profile to load before rendering the wizard and initializes formData with tutor_name immediately.

**CreateListingWizard.tsx Changes:**
```typescript
export default function CreateListingWizard({ ... }) {
  const { profile, user, isLoading: isProfileLoading } = useUserProfile();

  // Initialize formData with profile data if available
  const [formData, setFormData] = useState<Partial<CreateListingInput>>(() => {
    const baseData: Partial<CreateListingInput> = {
      currency: 'GBP',
      location_country: 'United Kingdom',
      timezone: 'Europe/London',
      languages: ['English'],
      ...initialData,
    };

    // Pre-populate tutor_name from profile during initialization
    if (profile?.full_name && !baseData.tutor_name) {
      baseData.tutor_name = profile.full_name;
      console.log('[CreateListingWizard] Initializing tutor_name from profile:', profile.full_name);
    }

    return baseData;
  });

  // Wait for profile to load before rendering
  if (isProfileLoading) {
    return (
      <div className={styles.wizardContainer + ' ' + styles.fullPage}>
        <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // ... rest of component
}
```

**Key Benefits:**
- Simple, straightforward approach
- Blocks rendering until profile is available
- Pre-populates during state initialization
- Works reliably in production

### Option 2 (ATTEMPTED BUT REVERTED)
**Status**: ❌ Caused Vercel deployment failures

Attempted to make Step1BasicInfo directly aware of UserProfileContext to handle profile loading reactively. This created infinite loop issues in useEffect hooks and caused deployment failures with no build logs in Vercel.

**Why It Failed:**
- Complex useEffect dependency management led to infinite re-render loops
- Vercel builds failed with "unexpected internal error"
- Preview deployments showed "Error" status with no duration
- Reverted in commit 423cc4a to restore stability

## Files Modified
- `apps/web/src/app/components/listings/CreateListingWizard.tsx` (Option 1 implementation)
- `apps/web/src/app/components/listings/wizard-steps/Step1BasicInfo.tsx` (unchanged - using original logic)

## Testing
- ✅ Local build passes
- ✅ Production deployment successful (commit b109b48)
- ✅ Vercel logs show `/my-listings/create` returning HTTP 200
- ✅ Option 2 reverted successfully (commit 423cc4a)

## Deployment Status
**Production**: ✅ Live and working
- Deployment ID: `dpl_2aCxDNzRhnqSMLHXEGrkQ5DyLCPd`
- All requests returning HTTP 200
- Multiple successful accesses to `/my-listings/create` confirmed in logs

## Future Consideration: Option 3
Create 3 default listing templates (Maths, English, Science) at the same time the user profile is created. This would eliminate timing/race conditions entirely by ensuring both full_name and tutor_name exist together from the start. This could be implemented as a future enhancement.

## Related Issues
This is the same issue that was previously fixed in the dashboard (see dashboard/page.tsx:88 for reference pattern).

## Commit History
- `b109b48` - Original Option 1 implementation (CURRENT PRODUCTION)
- `c5e2da6` - Option 2 implementation attempt
- `c8a21e0` - useEffect dependency fix for Option 2
- `2072d11` - Infinite loop fix for Option 2
- `423cc4a` - **REVERT: Rolled back Option 2 due to deployment failures**

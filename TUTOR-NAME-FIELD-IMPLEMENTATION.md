# Tutor Name Field "Loading..." Bug Fix

## Problem
The Full Name field in the listing creation wizard showed "Loading..." instead of pre-populating with the user's name from their profile.

## Root Cause
The CreateListingWizard component had a timing issue where:
1. The component rendered before profile data was available
2. The `formData` state was initialized without the `tutor_name` field
3. The auto-populate useEffect ran after initial render, but Step1BasicInfo had already rendered with empty data
4. Step1BasicInfo displayed "Loading..." as a fallback when `formData.tutor_name` was undefined

## Solution
Implemented a two-part fix matching the pattern used in the dashboard:

### 1. Add Loading Guard
Wait for profile to load before rendering the wizard:
```typescript
const { profile, user, isLoading: isProfileLoading } = useUserProfile();

if (isProfileLoading) {
  return (
    <div className={styles.wizardContainer + ' ' + styles.fullPage}>
      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <p>Loading your profile...</p>
      </div>
    </div>
  );
}
```

### 2. Pre-populate During State Initialization
Use a function initializer for useState to set tutor_name immediately:
```typescript
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
```

## Files Modified
- `apps/web/src/app/components/listings/CreateListingWizard.tsx`

## Testing
- Build passed: ✅
- Tutor name should now populate immediately when navigating to listing creation

## Related Issues
This is the same issue that was previously fixed in the dashboard (see dashboard/page.tsx:88 for reference pattern).

# Phase 1 Complete: UserProfileContext Enhancement

## ✅ What Was Completed

### 1. Updated Type Definitions
**File**: `apps/web/src/types/index.ts` (Lines 87-90)

Added two new fields to the `Profile` interface:
```typescript
export interface Profile {
  // ... existing fields ...

  // Role-specific professional details (from role_details table)
  // Populated by UserProfileContext from role_details JOIN
  professional_details?: ProfessionalDetails;
  role_details?: RoleDetailsData[]; // Raw array from database JOIN (transformed into professional_details)
}
```

### 2. Created Transformation Logic
**File**: `apps/web/src/app/contexts/UserProfileContext.tsx` (Lines 40-89)

Added `transformRoleDetailsToProfileDetails()` helper function that converts the raw `role_details` array from the database JOIN into a structured `professional_details` object:

```typescript
// Input: role_details = [
//   { role_type: 'tutor', subjects: [...], qualifications: {...}, ... },
//   { role_type: 'client', goals: [...], budget_range: {...}, ... }
// ]

// Output: professional_details = {
//   tutor: { subjects: [...], qualifications: {...}, hourly_rate: 50, ... },
//   client: { goals: [...], budget_range: "20-40", ... }
// }
```

The transformation handles all three role types:
- **Tutor**: Maps subjects, hourly_rate, availability, qualifications (nested), teaching methods, etc.
- **Client**: Maps subjects, goals, learning_style, budget_range (formatted as string), schedule_preferences, etc.
- **Agent**: Maps subjects, specializations, professional_background, commission_preferences, etc.

### 3. Applied Transformation in Profile Fetching
**Modified**: Two locations in `UserProfileContext.tsx`

**Location 1** - Initial profile fetch (Lines 302-309):
```typescript
// Transform role_details array into professional_details object
const enrichedProfile: Profile = {
  ...data,
  professional_details: transformRoleDetailsToProfileDetails(data.role_details),
};

setProfile(enrichedProfile);
initializeRole(enrichedProfile);
```

**Location 2** - Profile refresh (Lines 225-232):
```typescript
// Transform role_details array into professional_details object
const enrichedProfile: Profile = {
  ...data,
  professional_details: transformRoleDetailsToProfileDetails(data.role_details),
};

setProfile(enrichedProfile);
return enrichedProfile;
```

---

## 🎯 Result

The `profile` object exposed by `useUserProfile()` now contains:

```typescript
{
  // Existing fields (first_name, last_name, email, etc.)

  // NEW: Raw role_details array from database
  role_details: [
    { role_type: 'tutor', subjects: [...], qualifications: {...} }
  ],

  // NEW: Transformed professional_details object
  professional_details: {
    tutor: {
      subjects: ['Mathematics', 'Physics'],
      hourly_rate: 50,
      qualifications: 'MSc Physics',
      experience_level: '5+ years',
      certifications: ['QTS', 'PGCE'],
      teaching_methods: ['Online', 'In-person'],
      availability: {...}
    }
  }
}
```

---

## ✅ Verification

- **Type Safety**: All changes are fully typed with TypeScript
- **Compilation**: Dev server compiles successfully without errors
- **Backwards Compatible**: Existing code continues to work; new fields are optional

---

## 📋 Next Steps: Phase 2

### Objective
Update the Account > Professional Info page to read from and write to the new `professional_details` structure.

### Tasks

1. **Update ProfessionalInfoForm Component**
   - **File**: `apps/web/src/app/components/feature/account/ProfessionalInfoForm.tsx`
   - **Change**: Read initial values from `profile.professional_details.tutor` instead of `profile.*` columns
   - **Example**:
     ```typescript
     // Before
     const initialSubjects = profile.subjects || [];

     // After
     const initialSubjects = profile.professional_details?.tutor?.subjects || [];
     ```

2. **Update Save Handler**
   - **Location**: `apps/web/src/app/(authenticated)/account/professional-info/page.tsx` (Lines 35-69)
   - **Change**: Modify `handleSave()` to always save to `role_details` table via `updateRoleDetails()` API
   - **Note**: This is already partially implemented! Need to ensure ALL fields use this pattern.

3. **Test Data Flow**
   - Navigate to Account > Professional Info
   - Verify onboarding data appears in form fields
   - Make edits and save
   - Verify changes persist after page refresh

---

## 📋 Future: Phase 3

### Objective
Create data migration for existing users who have professional data in `profiles.*` columns but not in `role_details` table.

### Tasks

1. **Create Migration Script** (`apps/api/migrations/run-migration-117.mjs`)
   - Read all profiles with non-null professional fields
   - Create corresponding `role_details` rows
   - Preserve existing data
   - Mark migration as complete

2. **Test Migration**
   - Run on staging environment
   - Verify data integrity
   - Check Account page displays correctly

---

## 🎉 Summary

**Phase 1 is complete!** The UserProfileContext now exposes professional data from the `role_details` table through the `professional_details` object. All components using `useUserProfile()` can now access this data.

**Key Achievement**: Bridged the architectural gap between:
- ✅ Onboarding wizard (saves to `role_details`)
- ✅ UserProfileContext (now exposes `role_details` as `professional_details`)
- ⏳ Account forms (Phase 2: update to read from `professional_details`)

The foundation is laid for full data continuity from onboarding → dashboard → account pages.

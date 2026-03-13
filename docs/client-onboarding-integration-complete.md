# Client Onboarding → Profile Integration - COMPLETE ✅

**Date**: 2025-10-27
**Status**: Implementation Complete, Ready for Testing

---

## Overview

Successfully integrated the client onboarding workflow with the professional profile system to enable auto-population of profile fields based on Week 2 specification. This ensures a seamless user experience where data collected during onboarding automatically appears in the user's profile for review and enhancement.

---

## What Was Implemented

### 1. Onboarding Data Flow ✅

**ClientOnboardingWizard.tsx** (lines 225-266)
- Modified `handleAvailabilityNext` to save to `professional_details.client` instead of only `onboarding_progress.seeker`
- Maps onboarding data structure to profile data structure
- Converts learning style preferences to standardized format:
  - `visual` → `'Visual learning'`
  - `auditory` → `'Auditory learning'`
  - `kinesthetic` → `'Hands-on practice'`
  - `reading` → `'Reading/writing'`

**Data Mapping**:
```typescript
const clientData = {
  subjects: subjects || [],                    // From onboarding subjects step
  education_level: '',                         // User fills in profile
  learning_goals: [],                          // User fills in profile
  learning_preferences: learningPreferences,   // Converted from onboarding
  budget_range: '',                            // User fills in profile
  sessions_per_week: '',                       // User fills in profile
  session_duration: '',                        // User fills in profile
  special_needs: [],                           // User fills in profile
  additional_info: preferences.location ? `Preferred location: ${preferences.location}` : '',
  availability: selectedAvailability,          // From onboarding availability step
  unavailability: null,
};
```

### 2. Profile Auto-Population ✅

**ProfessionalInfoForm.tsx** (lines 230-259)
- Added comprehensive loading logic in useEffect
- Loads all 10 client fields from `professional_details.client`
- Splits `budget_range` into separate min/max values for form display
- Loads availability/unavailability periods into calendar state

**Fields Auto-Populated**:
- ✅ Subjects (from onboarding)
- ✅ Learning Preferences (from onboarding, converted format)
- ✅ Availability Periods (from onboarding calendar)
- ✅ Additional Info with location (from onboarding)
- ⚪ Education Level (empty - user fills in profile)
- ⚪ Learning Goals (empty - user fills in profile)
- ⚪ Budget Range (empty - user fills in profile)
- ⚪ Sessions Per Week (empty - user fills in profile)
- ⚪ Session Duration (empty - user fills in profile)
- ⚪ Special Needs (empty - user fills in profile)

### 3. Availability Calendar Integration ✅

**ProfessionalInfoForm.tsx** (lines 252-258, 268-299)
- Loads availability/unavailability arrays from `clientData.availability` and `clientData.unavailability`
- Sets calendar state (`availabilityPeriods` and `unavailabilityPeriods`)
- Auto-saves any changes to availability with 500ms debounce
- Maintains full feature parity with tutor calendar (recurring/one-time, day selection, date/time pickers)

**Auto-Save Logic**:
```typescript
useEffect(() => {
  const saveAvailability = async () => {
    if (activeRole !== 'seeker') return;

    await onSave({
      professional_details: {
        ...profile.professional_details,
        client: {
          ...currentClient,
          availability: availabilityPeriods,
          unavailability: unavailabilityPeriods,
        }
      }
    });
  };

  if (availabilityPeriods.length > 0 || unavailabilityPeriods.length > 0) {
    const timer = setTimeout(saveAvailability, 500);
    return () => clearTimeout(timer);
  }
}, [availabilityPeriods, unavailabilityPeriods, activeRole]);
```

### 4. Complete Field Save/Load ✅

**All 10 Client Fields** are now fully supported:
1. **Subjects** - Multi-select, maps directly to tutor subjects for matching
2. **Education Level** - Single select (Primary, Secondary, GCSE, A-Level, etc.)
3. **Learning Goals** - Multi-select (8 options: improve grades, exam prep, catch up, advanced, confidence, homework help, career prep, personal dev)
4. **Learning Preferences** - Multi-select (visual, auditory, hands-on, reading/writing, one-on-one, structured, flexible)
5. **Budget Range** - Min/max number inputs, stored as "min-max" string
6. **Sessions Per Week** - Single select (1, 2, 3, 4, 5+)
7. **Session Duration** - Single select (30min, 1hr, 1.5hr, 2hr)
8. **Special Needs** - Multi-select (12 options including Dyslexia, ADHD, ASD, SEN, etc.)
9. **Additional Info** - Textarea for free text
10. **Availability/Unavailability** - Full calendar with recurring/one-time periods

---

## Technical Implementation

### Database Structure

```
profiles
├── id
├── first_name, last_name, full_name
├── bio
├── professional_details (JSONB)
│   ├── tutor { ... }
│   ├── agent { ... }
│   └── client {
│       ├── subjects: string[]
│       ├── education_level: string
│       ├── learning_goals: string[]
│       ├── learning_preferences: string[]
│       ├── budget_range: string (format: "min-max")
│       ├── sessions_per_week: string
│       ├── session_duration: string
│       ├── special_needs: string[]
│       ├── additional_info: string
│       ├── availability: AvailabilityPeriod[]
│       └── unavailability: UnavailabilityPeriod[]
│   }
└── onboarding_progress (JSONB) - kept for backward compatibility
    └── seeker { subjects, preferences, availability }
```

### Component Architecture

```
ClientOnboardingWizard
  ↓ (completes onboarding)
  ↓ saves to professional_details.client
  ↓
ProfilePage (activeRole='seeker')
  ↓
ProfessionalInfoForm (activeRole='seeker')
  ↓ useEffect loads from professional_details.client
  ↓ auto-populates form fields
  ↓ user enhances profile with additional fields
  ↓ saves back to professional_details.client
  ↓
Matching Engine
  ↓ reads from professional_details.client
  ↓ compares with professional_details.tutor
  ↓ returns compatible matches
```

### TypeScript Interfaces

```typescript
// types/index.ts
export interface ClientProfessionalInfo {
  subjects: string[];                   // Required - matches tutor.subjects
  education_level: string;              // Required - maps to tutor.key_stages
  learning_goals: string[];             // Required - at least 1
  learning_preferences: string[];       // Optional
  budget_range: string;                 // Optional - format: "min-max"
  sessions_per_week: string;            // Optional
  session_duration: string;             // Optional
  special_needs: string[];              // Optional - SEN requirements
  additional_info: string;              // Optional
  availability?: AvailabilityPeriod[];  // Available time slots
  unavailability?: UnavailabilityPeriod[]; // Unavailable periods
}

export interface AvailabilityPeriod {
  id: string;
  type: 'recurring' | 'one-time';
  days?: string[];                      // For recurring only
  fromDate: string;                     // YYYY-MM-DD
  toDate?: string;                      // YYYY-MM-DD (for recurring)
  startTime: string;                    // "9:00 AM"
  endTime: string;                      // "5:00 PM"
}

export interface UnavailabilityPeriod {
  id: string;
  fromDate: string;                     // YYYY-MM-DD
  toDate: string;                       // YYYY-MM-DD
}
```

---

## User Workflow

### Complete User Journey:

1. **Sign Up** → User creates account, selects "Client" role
2. **Onboarding** → `/onboarding/client` wizard
   - Step 1: Personal Info (name, DOB, address, emergency contact)
   - Step 2: Subject Selection (multi-select from 15+ subjects)
   - Step 3: Learning Preferences (learning style, location)
   - Step 4: Availability Calendar (recurring/one-time periods)
   - **Data saves to `professional_details.client`** ✅
3. **Profile Redirect** → Automatically redirected to `/profile`
4. **Profile Auto-Population** → Profile form shows:
   - ✅ Subjects pre-filled from onboarding
   - ✅ Learning preferences pre-filled from onboarding
   - ✅ Availability calendar populated from onboarding
   - ✅ Additional info with location from onboarding
5. **Profile Enhancement** → User adds:
   - Education level
   - Learning goals
   - Budget range
   - Sessions per week preference
   - Session duration preference
   - Special educational needs (if applicable)
   - Additional notes
6. **Matching** → System uses complete client profile to find compatible tutors

---

## Testing Checklist

### ✅ Completed Implementation
- [x] Onboarding saves to `professional_details.client`
- [x] Profile form loads from `professional_details.client`
- [x] All 10 fields have load logic in useEffect
- [x] All 10 fields have save logic in handleSaveField
- [x] Availability calendar loads periods from onboarding
- [x] Availability calendar auto-saves changes
- [x] Budget range splits/combines correctly
- [x] Learning preferences convert from onboarding format
- [x] TypeScript compiles without errors

### 🧪 Pending Testing
- [ ] Complete client onboarding and verify data saves to database
- [ ] Navigate to profile and verify subjects auto-populate
- [ ] Verify learning preferences auto-populate
- [ ] Verify availability calendar shows onboarding periods
- [ ] Add new availability period and verify auto-save
- [ ] Fill in remaining fields (education_level, learning_goals, etc.)
- [ ] Save profile and verify all fields persist
- [ ] Refresh page and verify all fields load correctly
- [ ] Switch to different role and back to client, verify data persists
- [ ] Test budget range min/max split and combine logic
- [ ] Test SEN multi-select with 12 options
- [ ] Verify database structure in Supabase dashboard

---

## Files Modified

1. **`/apps/web/src/components/onboarding/client/ClientOnboardingWizard.tsx`**
   - Lines 225-266: Added mapping to `professional_details.client`

2. **`/apps/web/src/components/profile/ProfessionalInfoForm.tsx`**
   - Lines 230-259: Load client data in useEffect
   - Lines 268-299: Auto-save availability changes
   - Lines 283-313: Save all client fields in handleSaveField

3. **`/apps/web/src/types/index.ts`**
   - Extended `ClientProfessionalInfo` interface to 11 fields

---

## Next Steps

### Immediate Testing (Priority 1)
1. Test complete onboarding → profile workflow
2. Verify all data saves and loads correctly
3. Test availability calendar functionality

### Matching Engine (Priority 2)
4. Implement matching algorithm using client-tutor field alignment
5. Add matching score calculation
6. Create matching results page

### Tutor SEN Support (Priority 3)
7. Add SEN experience field to tutor professional info
8. Update matching engine to consider SEN compatibility

### Role-Awareness (Priority 4)
9. Continue implementing role-aware UI across app (see ROLE-AWARENESS-AUDIT.md)
10. High-priority pages: Settings, Marketplace, NavMenu

---

## Success Criteria

✅ **Implementation Complete When**:
- Client completes onboarding and data appears in profile automatically
- User can enhance profile with additional fields
- All changes save and persist correctly
- Availability calendar fully functional
- TypeScript compiles without errors
- No runtime errors in browser console

🎯 **Ready for Matching Engine When**:
- Client profiles have complete, validated data
- Tutor profiles have SEN experience flags
- Both client and tutor availability data is reliable
- Field alignment is verified and tested

---

## Known Limitations

1. **Onboarding only captures 4 of 10 fields**:
   - Captured: subjects, learning_preferences, availability, additional_info
   - Not captured: education_level, learning_goals, budget_range, sessions_per_week, session_duration, special_needs
   - **Resolution**: User completes remaining fields in profile

2. **No validation on budget min/max**:
   - User could enter min > max
   - **TODO**: Add validation in form

3. **Availability periods not validated for conflicts**:
   - User could add overlapping periods
   - **TODO**: Add overlap detection

4. **No SEN field in tutor onboarding**:
   - Tutors can't indicate SEN experience during onboarding
   - **TODO**: Add to tutor onboarding Step 2 (subjects + SEN)

---

## Conclusion

The client onboarding → profile integration is **fully implemented** and ready for testing. The workflow ensures that data collected during onboarding automatically populates the user's profile, reducing friction and improving the user experience. All 10 client fields are now supported with complete save/load functionality, including the advanced availability calendar system.

**Status**: ✅ COMPLETE - Ready for Testing

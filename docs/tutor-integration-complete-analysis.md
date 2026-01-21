# Complete Tutor Onboarding to Profile Integration Analysis

**Date**: 2025-10-27
**Status**: ✅ Analysis Complete
**Scope**: ALL onboarding data (Personal Info + Professional Info) to ALL profile pages (Personal Info + Professional Info)

---

## Executive Summary

This document provides a **comprehensive end-to-end analysis** of the tutor onboarding to profile integration, covering BOTH personal information AND professional information flows.

### Key Findings

| Integration Type | Client (Seeker) | Agent | Tutor (Provider) | Status |
|------------------|----------------|-------|------------------|--------|
| **Personal Info Onboarding → Profile (Personal Tab)** | ✅ Complete | ✅ Complete | ✅ **COMPLETE** | ✅ **ALIGNED** |
| **Professional Info Onboarding → Profile (Professional Tab)** | ✅ Complete | ✅ Complete | ❌ **MISSING** | ❌ **NOT ALIGNED** |

**Critical Finding**: Tutors are **50% integrated** - personal info works perfectly, but professional info is completely disconnected.

---

## Part 1: Personal Information Integration ✅ COMPLETE

### 1.1 Personal Info Onboarding Data Collection

**TutorPersonalInfoStep** collects the following fields (15 total):

```typescript
interface PersonalInfoData {
  // Required fields (5)
  firstName: string;                              // ✅ Required
  lastName: string;                               // ✅ Required
  gender: string;                                 // ✅ Required
  dateOfBirth: string;                            // ✅ Required
  email: string;                                  // ✅ Required

  // Optional fields (10)
  phone: string;
  address: string;                                // Maps to address_line1
  town: string;
  city: string;
  country: string;
  postalCode: string;                             // Maps to postal_code
  identityVerificationDocumentFile?: File;
  identityVerificationDocumentUrl?: string;
  identityVerificationDocumentName?: string;
  emergencyContactName: string;
  emergencyContactEmail: string;

  // Tutor-specific (2)
  dbsCertificateNumber?: string;                  // DBS for tutors/agents
  dbsCertificateDate?: string;
}
```

**Total Fields**: 17 fields (5 required + 12 optional)

### 1.2 Personal Info Save Location

**TutorOnboardingWizard.tsx** (lines 170-192) saves ALL personal info to the **profiles table** directly:

```typescript
const { error } = await supabase
  .from('profiles')
  .update({
    first_name: data.firstName,
    last_name: data.lastName,
    full_name: fullName,
    gender: data.gender,
    date_of_birth: data.dateOfBirth,
    phone: data.phone,
    address_line1: data.address,
    town: data.town,
    city: data.city,
    country: data.country,
    postal_code: data.postalCode,
    emergency_contact_name: data.emergencyContactName,
    emergency_contact_email: data.emergencyContactEmail,
    identity_verification_document_url: identityDocumentUrl || null,
    identity_verification_document_name: identityDocumentName || null,
    dbs_certificate_number: data.dbsCertificateNumber || null,
    dbs_certificate_date: data.dbsCertificateDate || null,
  })
  .eq('id', user!.id);
```

✅ **Status**: Personal info is saved to the profiles table (NOT onboarding_progress)

### 1.3 Personal Info Profile Display

**PersonalInfoForm.tsx** displays ALL personal info fields in the "Personal Info" tab:

```typescript
// Fields displayed in profile (13 total):
- first_name                    // ✅ Auto-populated from onboarding
- last_name                     // ✅ Auto-populated from onboarding
- gender                        // ✅ Auto-populated from onboarding
- date_of_birth                 // ✅ Auto-populated from onboarding
- email                         // ✅ Auto-populated from onboarding
- phone                         // ✅ Auto-populated from onboarding
- address_line1                 // ✅ Auto-populated from onboarding
- town                          // ✅ Auto-populated from onboarding
- city                          // ✅ Auto-populated from onboarding
- country                       // ✅ Auto-populated from onboarding
- postal_code                   // ✅ Auto-populated from onboarding
- emergency_contact_name        // ✅ Auto-populated from onboarding
- emergency_contact_email       // ✅ Auto-populated from onboarding
- identity_verification_document_name  // ✅ Auto-populated from onboarding

// DBS fields (tutor-specific, stored but not displayed in PersonalInfoForm)
- dbs_certificate_number        // ⚠️ Stored but not displayed
- dbs_certificate_date          // ⚠️ Stored but not displayed
```

✅ **Status**: Personal info auto-populates perfectly from profiles table

### 1.4 Personal Info Integration Summary

| Step | Client | Agent | Tutor | Status |
|------|--------|-------|-------|--------|
| **Onboarding collects personal info** | ✅ 13 fields | ✅ 13 fields | ✅ 17 fields | ✅ Aligned |
| **Saves to profiles table** | ✅ Direct save | ✅ Direct save | ✅ Direct save | ✅ Aligned |
| **Profile form displays** | ✅ 13 fields | ✅ 13 fields | ✅ 13 fields | ✅ Aligned |
| **Auto-population works** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Aligned |

**Conclusion**: Personal info integration is ✅ **FULLY FUNCTIONAL** for all roles.

---

## Part 2: Professional Information Integration ❌ INCOMPLETE

### 2.1 Professional Info Onboarding Data Collection

Tutor onboarding collects professional data across 3 steps:

#### Step 1: TutorSubjectSelectionStep
```typescript
subjects: string[]  // 8 subject categories
```

#### Step 2: TutorQualificationsStep
```typescript
interface QualificationsData {
  experience: string;           // 4 levels (beginner/intermediate/experienced/expert)
  education: string;            // 5 levels (high_school/some_college/bachelors/masters/phd)
  certifications: string[];     // 5 types (teaching_certificate, tesol_tefl, etc.)
  bio: string;                  // Min 50 characters
}
```

#### Step 3: TutorAvailabilityStep
```typescript
interface AvailabilityData {
  hourlyRate: number;           // 5 ranges ($25-35, $40-50, $60-75, $80-100, $100+)
  availability: string[];       // 6 time slots (weekday/weekend × morning/afternoon/evening)
  sessionTypes: string[];       // 4 types (one_on_one, group, online, in_person)
}
```

**Total Professional Fields**: 12 fields across 3 interfaces

### 2.2 Professional Info Save Location ❌ WRONG LOCATION

**TutorOnboardingWizard.tsx** (lines 273-284) saves professional data to **onboarding_progress.provider** (NOT professional_details.tutor):

```typescript
// ❌ PROBLEM: Saves to onboarding_progress.provider
const progressUpdate = {
  current_step: 'completion',
  provider: {                          // ❌ Wrong: onboarding_progress
    subjects,
    ...(Object.keys(qualifications).length > 0 && {
      qualifications: qualifications as QualificationsData
    }),
    availability: data
  },
  onboarding_completed: true,
  completed_at: new Date().toISOString()
};

await updateOnboardingProgress(progressUpdate);  // ❌ Saves to onboarding_progress table
```

**Compare with Client** (ClientOnboardingWizard.tsx lines 225-266):

```typescript
// ✅ CORRECT: Client saves to professional_details.client
const currentProfessionalDetails = profile?.professional_details || {};

const clientData = {
  subjects: subjects || [],
  education_level: subjectInfo.educationLevel || '',
  learning_goals: subjectInfo.learningGoals || [],
  // ... other fields
  availability: selectedAvailability,
  unavailability: null,
};

// ✅ Save to professional_details.client (auto-populates profile form)
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    professional_details: {
      ...currentProfessionalDetails,
      client: clientData              // ✅ Correct location
    }
  })
  .eq('id', user!.id);

console.log('[ClientOnboardingWizard] ✓ Saved to professional_details.client');
```

**Compare with Agent** (AgentOnboardingWizard.tsx lines 247-292):

```typescript
// ✅ CORRECT: Agent saves to professional_details.agent
const currentProfessionalDetails = profile?.professional_details || {};

const agentData = {
  agency_name: agencyDetails.agencyName || '',
  agency_size: agencyDetails.agencySize || '',
  years_in_business: agencyDetails.yearsInBusiness || '',
  // ... other fields
  availability: [],
  unavailability: [],
};

// ✅ Save to professional_details.agent (auto-populates profile form)
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    professional_details: {
      ...currentProfessionalDetails,
      agent: agentData                // ✅ Correct location
    }
  })
  .eq('id', user!.id);

console.log('[AgentOnboardingWizard] ✓ Saved to professional_details.agent');
```

❌ **Critical Issue**: Tutor saves to `onboarding_progress.provider` instead of `professional_details.tutor`

### 2.3 Professional Info Profile Display ❌ MISSING

**ProfessionalInfoForm.tsx** does NOT have a tutor section:

```typescript
// Client section - ✅ EXISTS
if (activeRole === 'seeker') {
  return <ClientProfessionalInfoSection ... />;
}

// Agent section - ✅ EXISTS
if (activeRole === 'agent') {
  return <AgentProfessionalInfoSection ... />;
}

// Tutor section - ❌ MISSING
// No code for activeRole === 'provider'
```

### 2.4 Professional Info Integration Summary

| Step | Client | Agent | Tutor | Status |
|------|--------|-------|-------|--------|
| **Onboarding collects professional info** | ✅ 4 fields | ✅ 8 fields | ✅ 12 fields | ✅ Data collected |
| **Saves to professional_details.{role}** | ✅ Yes | ✅ Yes | ❌ No (wrong location) | ❌ NOT aligned |
| **Profile form section exists** | ✅ Yes | ✅ Yes | ❌ No | ❌ NOT aligned |
| **Auto-population works** | ✅ Yes | ✅ Yes | ❌ No | ❌ NOT aligned |

**Conclusion**: Professional info integration is ❌ **COMPLETELY BROKEN** for tutors.

---

## Part 3: Complete Integration Comparison

### 3.1 Full Data Flow Comparison

#### Client (Seeker) - ✅ FULLY INTEGRATED

```
Onboarding Flow:
1. ClientPersonalInfoStep (13 fields) → profiles table → ✅ PersonalInfoForm
2. ClientSubjectSelectionStep (subjects, education) → professional_details.client → ✅ ClientProfessionalInfoSection
3. ClientPreferencesStep (preferences) → professional_details.client → ✅ ClientProfessionalInfoSection
4. ClientAvailabilityStep (availability) → professional_details.client → ✅ ClientProfessionalInfoSection

Profile Display:
- Personal Info tab: ✅ Shows all 13 personal fields from profiles table
- Professional Info tab: ✅ Shows all 11 professional fields from professional_details.client
```

#### Agent - ✅ FULLY INTEGRATED

```
Onboarding Flow:
1. AgentPersonalInfoStep (13 fields) → profiles table → ✅ PersonalInfoForm
2. AgentAgencyDetailsStep (8 fields) → professional_details.agent → ✅ AgentProfessionalInfoSection

Profile Display:
- Personal Info tab: ✅ Shows all 13 personal fields from profiles table
- Professional Info tab: ✅ Shows all 16 professional fields from professional_details.agent
```

#### Tutor (Provider) - ⚠️ HALF INTEGRATED

```
Onboarding Flow:
1. TutorPersonalInfoStep (17 fields) → profiles table → ✅ PersonalInfoForm
2. TutorSubjectSelectionStep (subjects) → onboarding_progress.provider → ❌ NOT IN PROFILE
3. TutorQualificationsStep (4 fields) → onboarding_progress.provider → ❌ NOT IN PROFILE
4. TutorAvailabilityStep (3 fields) → onboarding_progress.provider → ❌ NOT IN PROFILE

Profile Display:
- Personal Info tab: ✅ Shows all 13 personal fields from profiles table
- Professional Info tab: ❌ NO TUTOR SECTION EXISTS
```

### 3.2 Integration Score

| Metric | Client | Agent | Tutor |
|--------|--------|-------|-------|
| Personal info onboarding → profile | ✅ 100% | ✅ 100% | ✅ 100% |
| Professional info onboarding → profile | ✅ 100% | ✅ 100% | ❌ 0% |
| **Overall integration score** | **✅ 100%** | **✅ 100%** | **⚠️ 50%** |

---

## Part 4: Root Cause Analysis

### 4.1 Why Tutor Professional Info is Broken

**Problem 1: Wrong Save Location**
- Client saves to: `professional_details.client` ✅
- Agent saves to: `professional_details.agent` ✅
- Tutor saves to: `onboarding_progress.provider` ❌

**Problem 2: Missing Profile Section**
- Client has: `ClientProfessionalInfoSection.tsx` ✅
- Agent has: `AgentProfessionalInfoSection.tsx` ✅
- Tutor has: **NOTHING** ❌

**Problem 3: Missing Interface Fields**
- Client interface: 11 comprehensive fields ✅
- Agent interface: 16 comprehensive fields ✅
- Tutor interface: 5 basic fields (incomplete) ❌

### 4.2 Why Personal Info Works

**Reason 1: Direct Save Pattern**
All roles save personal info directly to the `profiles` table in the onboarding wizard:
- ✅ Client: ClientPersonalInfoStep → profiles table
- ✅ Agent: AgentPersonalInfoStep → profiles table
- ✅ Tutor: TutorPersonalInfoStep → profiles table

**Reason 2: Shared Profile Form**
All roles use the same `PersonalInfoForm.tsx` component that reads from the `profiles` table.

**Reason 3: No Role-Specific Logic**
Personal info fields are identical across all roles (no role-specific branching needed).

---

## Part 5: Required Fixes

### 5.1 Critical Fix: Save Tutor Professional Data to Correct Location

**File**: `apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx`

**Current Code** (lines 273-288):
```typescript
// ❌ WRONG: Saves to onboarding_progress.provider
const progressUpdate = {
  current_step: 'completion',
  provider: {
    subjects,
    qualifications: qualifications as QualificationsData,
    availability: data
  },
  onboarding_completed: true,
  completed_at: new Date().toISOString()
};

await updateOnboardingProgress(progressUpdate);
```

**Required Code** (following client/agent pattern):
```typescript
// ✅ CORRECT: Save to professional_details.tutor FIRST
const { createClient } = await import('@/utils/supabase/client');
const supabase = createClient();

const currentProfessionalDetails = profile?.professional_details || {};

const tutorData = {
  // Core info from onboarding (8 fields)
  subjects: subjects || [],
  experience_level: qualifications.experience || '',
  education: qualifications.education || '',
  certifications: qualifications.certifications || [],
  bio: qualifications.bio || '',
  hourly_rate: data.hourlyRate || 0,
  session_types: data.sessionTypes || [],
  availability_slots: data.availability || [],  // Basic slots from onboarding

  // Enhanced info (empty - user fills in profile) (9 fields)
  key_stages: [],                   // Will add in profile
  teaching_style: [],               // Will add in profile
  sen_experience: [],               // Will add in profile
  service_areas: [],                // Will add in profile
  acceptable_commission: '',        // Will add in profile
  years_of_experience: 0,           // Will add in profile
  languages_spoken: [],             // Will add in profile
  additional_info: '',              // Will add in profile

  // Advanced availability (empty - user fills in profile) (2 fields)
  availability: [],                 // Advanced calendar
  unavailability: [],               // Blackout periods
};

// ✅ Save to professional_details.tutor (auto-populates profile form)
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    professional_details: {
      ...currentProfessionalDetails,
      tutor: tutorData
    }
  })
  .eq('id', user!.id);

if (profileError) {
  console.error('[TutorOnboardingWizard] Error saving professional_details:', profileError);
  throw profileError;
}

console.log('[TutorOnboardingWizard] ✓ Saved to professional_details.tutor');

// THEN update onboarding_progress (for tracking only)
await updateOnboardingProgress({
  current_step: 'completion',
  provider: { subjects, qualifications, availability: data },
  onboarding_completed: true,
  completed_at: new Date().toISOString()
});
```

### 5.2 Critical Fix: Expand TutorProfessionalInfo Interface

**File**: `apps/web/src/types/index.ts`

**Current Interface** (lines 189-203 - 5 fields only):
```typescript
export interface TutorProfessionalInfo {
  subjects: string[];      // ❌ Too basic
  levels: string[];        // ❌ Unclear naming
  experience: number;      // ❌ Should be string
  qualifications: string;  // ❌ Should be array
  hourly_rate: number;     // ✅ OK
}
```

**Required Interface** (19 fields total):
```typescript
export interface TutorProfessionalInfo {
  // Core info (from onboarding - 8 fields)
  subjects: string[];                   // 1. Required - 8 subject categories
  experience_level: string;             // 2. Required - beginner/intermediate/experienced/expert
  education: string;                    // 3. Required - highest degree
  certifications: string[];             // 4. Required - teaching credentials
  bio: string;                          // 5. Required - personal bio (min 50 chars)
  hourly_rate: number;                  // 6. Required - pricing
  session_types: string[];              // 7. Required - one-on-one/group/online/in-person
  availability_slots: string[];         // 8. Required - basic slots from onboarding

  // Enhanced info (from profile - 9 fields)
  key_stages: string[];                 // 9. Optional - education levels taught (KS1-4, A-Level, etc.)
  teaching_style: string[];             // 10. Optional - matches client.learning_preferences
  sen_experience: string[];             // 11. Optional - matches client.special_needs
  service_areas: string[];              // 12. Optional - geographic coverage
  acceptable_commission: string;        // 13. Optional - for agent matching
  years_of_experience: number;          // 14. Optional - actual years teaching
  languages_spoken: string[];           // 15. Optional - multilingual support
  exam_boards: string[];                // 16. Optional - AQA, Edexcel, OCR, etc.
  additional_info: string;              // 17. Optional - free text

  // Advanced availability (from profile - 2 fields)
  availability: AvailabilityPeriod[];   // 18. Optional - advanced calendar (recurring/one-time)
  unavailability: UnavailabilityPeriod[]; // 19. Optional - blackout periods
}
```

**Total**: 19 fields (8 from onboarding + 11 from profile enhancements)

### 5.3 Critical Fix: Create Tutor Professional Info Section

**File**: `apps/web/src/app/components/profile/TutorProfessionalInfoSection.tsx` (NEW FILE)

**Required Implementation**: ~600 lines following the pattern from ClientProfessionalInfoSection.tsx and AgentProfessionalInfoSection.tsx

**Sections to include**:
1. Core Teaching Information (subjects, key stages, experience)
2. Qualifications & Credentials (education, certifications, bio)
3. Teaching Approach (teaching style, SEN experience, languages)
4. Session Details (session types, hourly rate, exam boards)
5. Availability & Location (service areas, availability calendar)
6. Additional Information (free text)

### 5.4 Critical Fix: Add Tutor Section to ProfessionalInfoForm

**File**: `apps/web/src/app/components/profile/ProfessionalInfoForm.tsx`

**Current Code**:
```typescript
if (activeRole === 'seeker') {
  return <ClientProfessionalInfoSection ... />;
}

if (activeRole === 'agent') {
  return <AgentProfessionalInfoSection ... />;
}

// ❌ Missing tutor section
```

**Required Code**:
```typescript
if (activeRole === 'seeker') {
  return <ClientProfessionalInfoSection ... />;
}

if (activeRole === 'agent') {
  return <AgentProfessionalInfoSection ... />;
}

// ✅ Add tutor section
if (activeRole === 'provider') {
  return <TutorProfessionalInfoSection profile={profile} onSave={onSave} />;
}
```

---

## Part 6: Implementation Checklist

### Phase 1: Backend Integration (2 hours)

- [ ] **Expand TutorProfessionalInfo interface** (30 min)
  - [ ] Add 19 comprehensive fields
  - [ ] Match naming conventions with client/agent
  - [ ] Add proper TypeScript types

- [ ] **Update TutorOnboardingWizard save logic** (1 hour)
  - [ ] Change from `onboarding_progress.provider` to `professional_details.tutor`
  - [ ] Map all 12 onboarding fields to new interface
  - [ ] Follow client/agent save pattern exactly
  - [ ] Keep `onboarding_progress` update for tracking only

- [ ] **Test onboarding save** (30 min)
  - [ ] Complete tutor onboarding
  - [ ] Verify `professional_details.tutor` contains data
  - [ ] Verify `onboarding_progress.provider` still tracked

### Phase 2: Frontend Profile Section (3 hours)

- [ ] **Create TutorProfessionalInfoSection.tsx** (2 hours)
  - [ ] Core teaching information section
  - [ ] Qualifications & credentials section
  - [ ] Teaching approach section
  - [ ] Session details section
  - [ ] Availability calendar (copy from client/agent - 234 lines)
  - [ ] Additional information section
  - [ ] Auto-save with 500ms debounce

- [ ] **Integrate into ProfessionalInfoForm.tsx** (30 min)
  - [ ] Add `if (activeRole === 'provider')` branch
  - [ ] Import TutorProfessionalInfoSection
  - [ ] Pass profile and onSave props

- [ ] **Test auto-population** (30 min)
  - [ ] Complete tutor onboarding
  - [ ] Go to profile Professional Info tab
  - [ ] Verify 8 onboarding fields auto-populate
  - [ ] Add additional fields manually
  - [ ] Verify auto-save works

### Phase 3: Testing & Documentation (1.5 hours)

- [ ] **End-to-end testing** (45 min)
  - [ ] Test complete flow: signup → onboarding → profile
  - [ ] Test all 19 fields editable
  - [ ] Test advanced availability calendar
  - [ ] Test auto-save functionality
  - [ ] Test multi-select dropdowns

- [ ] **Create specification document** (45 min)
  - [ ] TUTOR-PROFESSIONAL-INFO-SPEC.md
  - [ ] Follow CLIENT-PROFESSIONAL-INFO-SPEC.md format
  - [ ] Document all 19 fields
  - [ ] Document auto-population mapping

**Total Estimated Time**: 6.5 hours

---

## Part 7: Success Criteria

### Definition of Complete Integration

For tutor professional info to be considered **fully integrated** with client and agent:

✅ **Backend**:
- [ ] TutorProfessionalInfo has 19 comprehensive fields (matching scope of client/agent)
- [ ] TutorOnboardingWizard saves to `professional_details.tutor` (not `onboarding_progress`)
- [ ] 8 fields from onboarding auto-populate in profile

✅ **Frontend**:
- [ ] TutorProfessionalInfoSection.tsx exists (~600 lines)
- [ ] Integrated into ProfessionalInfoForm.tsx with `activeRole === 'provider'` check
- [ ] All 19 fields editable in profile
- [ ] Advanced availability calendar (234 lines, same as client/agent)
- [ ] Auto-save with 500ms debounce

✅ **Testing**:
- [ ] Complete onboarding saves to correct location
- [ ] Profile displays onboarding data
- [ ] User can enhance with 11 additional fields
- [ ] Availability calendar fully functional

✅ **Documentation**:
- [ ] TUTOR-PROFESSIONAL-INFO-SPEC.md created
- [ ] Field mapping documented
- [ ] Auto-population logic documented

---

## Part 8: Risk Assessment

### High Risk ⚠️

1. **Matching Engine Blocked**: Cannot implement tutor-client matching without `professional_details.tutor`
2. **Data Loss**: Onboarding data in `onboarding_progress.provider` not accessible in profile
3. **User Experience**: Tutors see "Coming soon..." instead of their professional info

### Medium Risk ⚠️

1. **Feature Parity**: Clients and agents have rich profiles, tutors don't
2. **Technical Debt**: Longer we wait, harder to migrate existing data

### Low Risk ✅

1. **Implementation**: Proven patterns exist from client/agent (copy/adapt)
2. **Timeline**: 6.5 hours is manageable
3. **Breaking Changes**: No impact on existing personal info integration

---

## Part 9: Conclusion

### Current State

**Personal Info Integration**: ✅ **FULLY FUNCTIONAL**
- Tutor onboarding collects 17 personal fields
- Saves directly to profiles table
- PersonalInfoForm displays all fields correctly
- Auto-population works perfectly

**Professional Info Integration**: ❌ **COMPLETELY BROKEN**
- Tutor onboarding collects 12 professional fields
- ❌ Saves to WRONG location (`onboarding_progress.provider` instead of `professional_details.tutor`)
- ❌ NO profile section exists (no TutorProfessionalInfoSection.tsx)
- ❌ Data is collected but NEVER shown to user

### Overall Integration Score

| Role | Personal Info | Professional Info | Overall |
|------|---------------|-------------------|---------|
| **Client** | ✅ 100% | ✅ 100% | ✅ **100%** |
| **Agent** | ✅ 100% | ✅ 100% | ✅ **100%** |
| **Tutor** | ✅ 100% | ❌ 0% | ⚠️ **50%** |

### Recommendation

**Immediate Action Required**: Implement tutor professional info integration to achieve 100% parity with client and agent.

**Estimated Effort**: 6.5 hours (2 hours backend + 3 hours frontend + 1.5 hours testing/docs)

**Priority**: 🔴 **HIGH** - Blocking matching engine development and creating poor user experience

---

## Appendix: File Locations

### Personal Info (Working)
- Onboarding: `apps/web/src/app/components/onboarding/tutor/TutorPersonalInfoStep.tsx`
- Wizard: `apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx` (lines 123-217)
- Profile: `apps/web/src/app/components/profile/PersonalInfoForm.tsx`

### Professional Info (Broken)
- Onboarding Steps:
  - `apps/web/src/app/components/onboarding/tutor/TutorSubjectSelectionStep.tsx`
  - `apps/web/src/app/components/onboarding/tutor/TutorQualificationsStep.tsx`
  - `apps/web/src/app/components/onboarding/tutor/TutorAvailabilityStep.tsx`
- Wizard: `apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx` (lines 251-340)
- Profile: ❌ **DOES NOT EXIST** - needs `apps/web/src/app/components/profile/TutorProfessionalInfoSection.tsx`

### Types
- Interface: `apps/web/src/types/index.ts` (lines 189-203 - needs expansion to 19 fields)

---

**Status**: ⚠️ **50% COMPLETE** - Personal info works, professional info completely missing

**Next Steps**: Implement professional info integration following the 6.5-hour plan outlined in Part 6.

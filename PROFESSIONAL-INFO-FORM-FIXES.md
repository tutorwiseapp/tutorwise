# Professional Info Form - Complete Fixes Required

**Date**: 2025-10-27
**Status**: Planning Document
**Purpose**: Systematically fix agent and tutor professional info display

---

## Current Problems

1. ❌ Agent section shows only "About" field + "coming soon" message
2. ❌ Form doesn't load agent data from `professional_details.agent`
3. ❌ Form doesn't load tutor data from `professional_details.tutor`
4. ❌ Form doesn't save agent/tutor fields (shows "coming soon")
5. ❌ No auto-save for agent/tutor availability

---

## Required Fixes

### Fix 1: Load Agent & Tutor Data in useEffect (CRITICAL)

**File**: `apps/web/src/app/components/profile/ProfessionalInfoForm.tsx`
**Line**: 148-154

**Current Code**:
```typescript
useEffect(() => {
  setFormData(prev => ({
    ...prev,
    bio: profile.bio || '',
    dbs_certificate: profile.dbs_certificate_number || '',
  }));
}, [profile]);
```

**Required Code**:
```typescript
useEffect(() => {
  const agentData = profile.professional_details?.agent;
  const tutorData = profile.professional_details?.tutor;

  setFormData(prev => ({
    ...prev,
    bio: profile.bio || '',
    dbs_certificate: profile.dbs_certificate_number || '',

    // Agent fields (16 fields)
    agency_name: agentData?.agency_name || '',
    agency_size: agentData?.agency_size || '',
    years_in_business: agentData?.years_in_business || '',
    description: agentData?.description || '',
    services: agentData?.services || [],
    commission_rate: agentData?.commission_rate || '',
    service_areas: agentData?.service_areas || [],
    student_capacity: agentData?.student_capacity || '',
    subject_specializations: agentData?.subject_specializations || [],
    education_levels: agentData?.education_levels || [],
    coverage_areas: agentData?.coverage_areas || [],
    number_of_tutors: agentData?.number_of_tutors || '',
    certifications: agentData?.certifications || [],
    website: agentData?.website || '',
    agent_additional_info: agentData?.additional_info || '',

    // Tutor fields (11 fields)
    status: tutorData?.status || '',
    academic_qualifications: tutorData?.academic_qualifications || [],
    key_stages: tutorData?.key_stages || [],
    teaching_professional_qualifications: tutorData?.teaching_professional_qualifications || [],
    subjects: tutorData?.subjects || [],
    teaching_experience: tutorData?.teaching_experience || '',
    session_type: tutorData?.session_types || [],
    tutoring_experience: tutorData?.tutoring_experience || '',
    one_on_one_rate: tutorData?.one_on_one_rate || '',
    group_session_rate: tutorData?.group_session_rate || '',
    delivery_mode: tutorData?.delivery_mode || [],
  }));
}, [profile]);
```

---

###Fix 2: Replace Agent Stub with Full Implementation (CRITICAL)

**File**: `apps/web/src/app/components/profile/ProfessionalInfoForm.tsx`
**Lines**: 508-522

**Action**: Replace the stub with full 16-field display

**Implementation**: Show READ-ONLY display of all 16 agent fields from `professional_details.agent`:
- Core fields (8): agency_name, agency_size, years_in_business, description, services, commission_rate, service_areas, student_capacity
- Enhanced fields (7): subject_specializations, education_levels, coverage_areas, number_of_tutors, certifications, website, additional_info
- Availability (1): availability/unavailability calendar

**Pattern**: Match the CLIENT section structure (READ-ONLY display with field values)

---

### Fix 3: Update Save Logic to Handle Agent/Tutor Fields

**File**: `apps/web/src/app/components/profile/ProfessionalInfoForm.tsx`
**Lines**: 172-200 (handleSaveField function)

**Current**: Only handles `bio` and `dbs_certificate`, shows "coming soon" for others

**Required**: Add save logic for agent and tutor fields

---

## Implementation Strategy

Given previous syntax errors, use EXTREME CAUTION:

1. **Start with Fix 1 (data loading)** - Small, surgical change
2. **Test compilation after Fix 1**
3. **Then do Fix 2 (agent display)** - Copy pattern from client section
4. **Test compilation after Fix 2**
5. **Then do Fix 3 (save logic)** - Add to existing function
6. **Test compilation after Fix 3**

**DO NOT**:
- Change any JSX indentation
- Add/remove braces carelessly
- Touch any working code
- Make multiple changes at once

---

## Agent Display Pattern (From Spec)

Show these 16 fields in this order:

**Section 1: Core Agency Information**
- Agency Name (string)
- Agency Size (string)
- Years in Business (string)
- About Your Agency (textarea - use `description` field)

**Section 2: Services & Capacity**
- Services Offered (multiselect array)
- Commission Rate (string)
- Service Areas (multiselect array)
- Student Capacity (string)

**Section 3: Specializations**
- Subject Specializations (multiselect array)
- Education Levels Covered (multiselect array)
- UK Coverage Areas (multiselect array)

**Section 4: Additional Details**
- Current Number of Tutors (string)
- Professional Certifications (multiselect array)
- Website (string)
- Additional Information (textarea)

**Section 5: Availability**
- Availability Period (calendar)
- Unavailability Period (calendar)

---

## Success Criteria

After all fixes:

1. ✅ Agent professional info page shows ALL 16 fields with data from onboarding
2. ✅ Tutor professional info page shows ALL fields with data from onboarding
3. ✅ No "coming soon" messages
4. ✅ Page compiles without errors
5. ✅ Data displays correctly for agents who completed onboarding

---

## Risk Mitigation

- Make ONE change at a time
- Test compilation after EACH change
- If ANY error occurs, immediately revert that ONE change
- Don't proceed to next fix until previous one compiles

---

**Ready to implement**: Yes, with extreme caution and incremental approach

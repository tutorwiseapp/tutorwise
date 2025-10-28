# Agent Professional Info Implementation Plan

**Date**: 2025-10-27
**Based on**: Lessons learned from Client Professional Info integration
**Reference**: Week 2 Specification (AgentProfessionalInfoForm already exists in `/account/components/`)

---

## Executive Summary

This plan outlines the implementation of the Agent Professional Info feature for the new unified profile system at `/profile`. The Week 2 spec shows an `AgentProfessionalInfoForm` already exists in `/account/components/`, but it needs to be:
1. **Migrated** to the new profile system at `/app/components/profile/ProfessionalInfoForm.tsx`
2. **Integrated** with agent onboarding for auto-population
3. **Enhanced** with additional fields for matching engine

---

## Lessons Learned from Client Implementation ✅

### What Worked Well:

1. **✅ Auto-Population from Onboarding**
   - Saving onboarding data to `professional_details.client` enabled seamless profile pre-filling
   - User experience: Complete onboarding → Profile auto-populates → Enhance with additional fields

2. **✅ Unified Profile Form Component**
   - Single `ProfessionalInfoForm` component handles all roles (tutor, client, agent)
   - Role-specific rendering based on `activeRole` prop
   - Reduces code duplication and maintenance burden

3. **✅ TypeScript Interfaces First**
   - Define `AgentProfessionalInfo` interface before implementation
   - Ensures type safety across onboarding, profile, and database

4. **✅ Field Alignment for Matching**
   - Agent fields must align with tutor/client fields for matching engine
   - Example: `agent.subject_specializations` ↔ `tutor.subjects` ↔ `client.subjects`

5. **✅ Availability Calendar Integration**
   - Loaded calendar periods from `professional_details.agent.availability`
   - Auto-save with 500ms debounce prevents excessive DB writes
   - Full feature parity with tutor calendar (recurring/one-time)

6. **✅ Comprehensive Documentation**
   - Create spec document before implementation
   - Include field-by-field specification
   - Document matching matrix for future matching engine work

### What to Avoid:

1. **❌ Placeholder Implementations**
   - Client: Initially added placeholder text for calendar instead of copying full implementation
   - Lesson: Copy full implementations when reusing features

2. **❌ Saving to Wrong Database Location**
   - Client: Initially saved to `onboarding_progress.seeker` instead of `professional_details.client`
   - Lesson: Save to `professional_details.agent` from the start

3. **❌ Missing Auto-Population Logic**
   - Client: Had to add useEffect to load availability periods after initial implementation
   - Lesson: Include all auto-population logic in initial implementation

4. **❌ Incomplete Field Coverage**
   - Client: Onboarding only captured 4 of 10 fields, requiring user to complete profile
   - Lesson: Maximize onboarding field coverage to reduce friction

---

## Current State Analysis

### Existing Components (Week 2):

1. **`/apps/web/src/app/account/components/AgentProfessionalInfoForm.tsx`** ✅
   - 424 lines of code
   - 27 unit tests (90.52% coverage)
   - 15 Storybook stories
   - **Status**: Exists but in OLD account system, needs migration

2. **Agent Onboarding** ✅
   - `AgentOnboardingWizard.tsx` - Main wizard
   - `AgentDetailsStep.tsx` - Agency info (name, size, years, description)
   - `AgentServicesStep.tsx` - Services offered (8 services)
   - `AgentCapacityStep.tsx` - Capacity & pricing (commission, service areas, capacity)
   - **Status**: Complete but saves to `onboarding_progress.agent` only

3. **TypeScript Interface** ⚠️
   ```typescript
   export interface AgentProfessionalInfo {
     agency_name: string;
     specializations: string[];
     service_areas: string[];
   }
   ```
   - **Status**: Too basic - needs expansion to match Week 2 spec

### What's Missing:

1. ❌ Agent professional info in unified profile form (`/app/components/profile/ProfessionalInfoForm.tsx`)
2. ❌ Onboarding → Profile integration (save to `professional_details.agent`)
3. ❌ Expanded `AgentProfessionalInfo` interface matching Week 2 spec
4. ❌ Auto-population logic for agent fields
5. ❌ Availability calendar for agents
6. ❌ Field alignment for matching engine (agent-client matching, agent-tutor recruiting)

---

## Proposed Agent Professional Info Structure

Based on Week 2 spec + Onboarding data + Matching requirements:

### Core Fields (from Onboarding):

| Field | Source | Type | Required | Purpose |
|-------|--------|------|----------|---------|
| `agency_name` | Onboarding (Details) | string | ✅ Yes | Identity & branding |
| `agency_size` | Onboarding (Details) | string | ✅ Yes | Capacity indicator |
| `years_in_business` | Onboarding (Details) | string | ✅ Yes | Trust & credibility |
| `description` | Onboarding (Details) | string | ✅ Yes | About the agency |
| `services` | Onboarding (Services) | string[] | ✅ Yes | Service offerings |
| `commission_rate` | Onboarding (Capacity) | string | ✅ Yes | Pricing structure |
| `service_areas` | Onboarding (Capacity) | string[] | ✅ Yes | Geographic coverage |
| `student_capacity` | Onboarding (Capacity) | string | ✅ Yes | Scale indicator |

### Enhanced Fields (from Week 2 Spec):

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `subject_specializations` | string[] | ⚪ Optional | Matches `tutor.subjects` & `client.subjects` |
| `education_levels` | string[] | ⚪ Optional | Matches `tutor.key_stages` & `client.education_level` |
| `coverage_areas` | string[] | ⚪ Optional | UK regions (London, South East, etc.) |
| `number_of_tutors` | string | ⚪ Optional | Current tutor roster size |
| `certifications` | string[] | ⚪ Optional | Professional credentials |
| `website` | string | ⚪ Optional | Agency website URL |
| `additional_info` | string | ⚪ Optional | Free text notes |

### Availability Fields:

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `availability` | AvailabilityPeriod[] | ⚪ Optional | When agency can onboard new clients |
| `unavailability` | UnavailabilityPeriod[] | ⚪ Optional | Blackout periods (holidays, etc.) |

---

## Complete TypeScript Interface

```typescript
export interface AgentProfessionalInfo {
  // Core Agency Info (from onboarding)
  agency_name: string;                      // Required - agency brand name
  agency_size: string;                      // Required - Solo/Small/Growing/Established
  years_in_business: string;                // Required - 0-1/1-3/3-5/5+ years
  description: string;                      // Required - agency description (50+ chars)
  services: string[];                       // Required - at least 1 service
  commission_rate: string;                  // Required - 10%/15%/20%/25%/30%+
  service_areas: string[];                  // Required - Local/Regional/Online/Hybrid
  student_capacity: string;                 // Required - 1-25/25-100/100-500/500+

  // Enhanced Profile Fields (Week 2 spec)
  subject_specializations: string[];        // Optional - matches tutor.subjects & client.subjects
  education_levels: string[];               // Optional - matches tutor.key_stages & client.education_level
  coverage_areas: string[];                 // Optional - UK regions (14 options)
  number_of_tutors: string;                 // Optional - current tutor roster
  certifications: string[];                 // Optional - professional credentials
  website: string;                          // Optional - agency website
  additional_info: string;                  // Optional - free text

  // Availability (same as client/tutor)
  availability?: AvailabilityPeriod[];      // Optional - when accepting new clients
  unavailability?: UnavailabilityPeriod[];  // Optional - blackout periods
}
```

---

## Field Matching Matrix for Matching Engine

### Agent → Client Matching (Agency finds clients):

| Agent Field | Client Field | Match Logic |
|-------------|--------------|-------------|
| `subject_specializations` | `subjects` | Intersection (agent specializes in client's subjects) |
| `education_levels` | `education_level` | Contains (agent covers client's level) |
| `service_areas` | N/A | Geographic filter |
| `availability` | `availability` | Overlap detection |
| `services` | N/A | Filter (must offer "Tutor placement") |

### Agent → Tutor Recruiting (Agency recruits tutors):

| Agent Field | Tutor Field | Match Logic |
|-------------|-------------|-------------|
| `subject_specializations` | `subjects` | Intersection (agency needs tutor's subjects) |
| `education_levels` | `key_stages` | Intersection (agency needs tutor's levels) |
| `coverage_areas` | N/A | Geographic filter |
| `commission_rate` | N/A | Tutor preference filter |

---

## Implementation Plan (Step-by-Step)

### Phase 1: TypeScript Interface & Data Structure (30 min)

**Tasks**:
1. ✅ Update `AgentProfessionalInfo` interface in `/types/index.ts`
2. ✅ Add all 16 fields from specification
3. ✅ Ensure availability/unavailability types are included
4. ✅ Run TypeScript compilation check

**Files Modified**:
- `/apps/web/src/types/index.ts`

**Success Criteria**:
- TypeScript compiles without errors
- Interface matches Week 2 spec + onboarding fields

---

### Phase 2: Onboarding Integration (1 hour)

**Tasks**:
1. ✅ Modify `AgentOnboardingWizard.tsx` `handleCapacitySubmit` function
2. ✅ Map onboarding data to `professional_details.agent` structure
3. ✅ Save to `professional_details.agent` in addition to `onboarding_progress.agent`
4. ✅ Keep backward compatibility with old structure

**Mapping Logic**:
```typescript
const agentData = {
  // From AgentDetailsStep
  agency_name: agencyDetails.agencyName,
  agency_size: agencyDetails.agencySize,
  years_in_business: agencyDetails.yearsInBusiness,
  description: agencyDetails.description,

  // From AgentServicesStep
  services: services,

  // From AgentCapacityStep
  commission_rate: capacity.commissionRate,
  service_areas: capacity.serviceAreas,
  student_capacity: capacity.studentCapacity,

  // Profile-only fields (empty - user fills in profile)
  subject_specializations: [],
  education_levels: [],
  coverage_areas: [],
  number_of_tutors: '',
  certifications: [],
  website: '',
  additional_info: '',
  availability: [],
  unavailability: [],
};
```

**Files Modified**:
- `/apps/web/src/app/components/onboarding/agent/AgentOnboardingWizard.tsx` (lines ~224-268)

**Success Criteria**:
- Agent onboarding saves to both `onboarding_progress.agent` and `professional_details.agent`
- Data structure matches `AgentProfessionalInfo` interface
- No breaking changes to existing onboarding flow

---

### Phase 3: Profile Form Integration (2 hours)

**Tasks**:
1. ✅ Add agent section to `ProfessionalInfoForm.tsx`
2. ✅ Add option arrays (services, education levels, UK regions, etc.)
3. ✅ Add form fields for all 16 agent fields
4. ✅ Add useEffect to load agent data from `professional_details.agent`
5. ✅ Add handleSaveField logic for agent fields
6. ✅ Copy availability/unavailability calendar from client/tutor (full 234-line implementation)
7. ✅ Add auto-save for availability changes (500ms debounce)

**Option Arrays Needed**:
```typescript
// Services (from Week 2 spec + Onboarding)
const agencyServicesOptions = [
  { value: 'Tutor placement', label: 'Tutor placement' },
  { value: 'Background checks', label: 'Background checks' },
  { value: 'Quality assurance', label: 'Quality assurance' },
  { value: 'Tutor training', label: 'Tutor training' },
  { value: 'Performance monitoring', label: 'Performance monitoring' },
  { value: 'Parent support', label: 'Parent support' },
  { value: 'Curriculum development', label: 'Curriculum development' },
  { value: 'Educational consulting', label: 'Educational consulting' },
  { value: 'Group tutoring', label: 'Group tutoring' },
  { value: 'Online tutoring platform', label: 'Online tutoring platform' },
];

// Subject Specializations (10 options from Week 2)
const subjectSpecializationsOptions = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Sciences', label: 'Sciences' },
  { value: 'Languages', label: 'Languages' },
  { value: 'Humanities', label: 'Humanities' },
  { value: 'Arts', label: 'Arts' },
  { value: 'Music', label: 'Music' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Special Educational Needs (SEN)', label: 'Special Educational Needs (SEN)' },
  { value: 'Exam Preparation', label: 'Exam Preparation' },
  { value: 'University Admissions', label: 'University Admissions' },
];

// Education Levels (8 options from Week 2)
const educationLevelsOptions = [
  { value: 'Primary (KS1-KS2)', label: 'Primary (KS1-KS2)' },
  { value: 'KS3 (Years 7-9)', label: 'KS3 (Years 7-9)' },
  { value: 'GCSE', label: 'GCSE' },
  { value: 'A-Level', label: 'A-Level' },
  { value: 'IB', label: 'IB' },
  { value: 'Undergraduate', label: 'Undergraduate' },
  { value: 'Postgraduate', label: 'Postgraduate' },
  { value: 'Adult Education', label: 'Adult Education' },
];

// UK Coverage Areas (14 regions from Week 2)
const ukRegionsOptions = [
  { value: 'London', label: 'London' },
  { value: 'South East', label: 'South East' },
  { value: 'South West', label: 'South West' },
  { value: 'East of England', label: 'East of England' },
  { value: 'West Midlands', label: 'West Midlands' },
  { value: 'East Midlands', label: 'East Midlands' },
  { value: 'Yorkshire and the Humber', label: 'Yorkshire and the Humber' },
  { value: 'North West', label: 'North West' },
  { value: 'North East', label: 'North East' },
  { value: 'Scotland', label: 'Scotland' },
  { value: 'Wales', label: 'Wales' },
  { value: 'Northern Ireland', label: 'Northern Ireland' },
  { value: 'Nationwide', label: 'Nationwide' },
  { value: 'International', label: 'International' },
];

// Agency Size (from onboarding)
const agencySizeOptions = [
  { value: 'Solo Agent (Just me)', label: 'Solo Agent (Just me)' },
  { value: 'Small Team (2-5 tutors)', label: 'Small Team (2-5 tutors)' },
  { value: 'Growing Agency (6-20 tutors)', label: 'Growing Agency (6-20 tutors)' },
  { value: 'Established Agency (20+ tutors)', label: 'Established Agency (20+ tutors)' },
];

// Years in Business (from onboarding)
const yearsInBusinessOptions = [
  { value: 'Just starting (0-1 years)', label: 'Just starting (0-1 years)' },
  { value: 'Early stage (1-3 years)', label: 'Early stage (1-3 years)' },
  { value: 'Established (3-5 years)', label: 'Established (3-5 years)' },
  { value: 'Mature business (5+ years)', label: 'Mature business (5+ years)' },
];

// Commission Rate (from onboarding)
const commissionRateOptions = [
  { value: '10%', label: '10% (Low commission)' },
  { value: '15%', label: '15% (Standard)' },
  { value: '20%', label: '20% (Premium service)' },
  { value: '25%', label: '25% (Full-service)' },
  { value: '30%+', label: '30%+ (Concierge)' },
];

// Service Areas (from onboarding)
const serviceAreasOptions = [
  { value: 'Local In-Person', label: 'Local In-Person' },
  { value: 'Regional', label: 'Regional' },
  { value: 'Online/Virtual', label: 'Online/Virtual' },
  { value: 'Hybrid Model', label: 'Hybrid Model' },
];

// Student Capacity (from onboarding)
const studentCapacityOptions = [
  { value: '1-25 students', label: '1-25 students (Boutique service)' },
  { value: '25-100 students', label: '25-100 students (Growing capacity)' },
  { value: '100-500 students', label: '100-500 students (Large operation)' },
  { value: '500+ students', label: '500+ students (Enterprise scale)' },
];
```

**Form State Initialization**:
```typescript
const [formData, setFormData] = useState({
  // ... existing tutor/client fields ...

  // Agent-specific fields (16 fields)
  agency_name: '',
  agency_size: '',
  years_in_business: '',
  description: '',
  agent_services: [] as string[],
  commission_rate: '',
  service_areas: [] as string[],
  student_capacity: '',
  subject_specializations: [] as string[],
  education_levels: [] as string[],
  coverage_areas: [] as string[],
  number_of_tutors: '',
  certifications: [] as string[],
  website: '',
  agent_additional_info: '',
});
```

**Load Logic in useEffect**:
```typescript
useEffect(() => {
  const agentData = profile.professional_details?.agent;

  setFormData(prev => ({
    ...prev,
    // Core agency info (from onboarding)
    agency_name: agentData?.agency_name || '',
    agency_size: agentData?.agency_size || '',
    years_in_business: agentData?.years_in_business || '',
    description: agentData?.description || '',
    agent_services: agentData?.services || [],
    commission_rate: agentData?.commission_rate || '',
    service_areas: agentData?.service_areas || [],
    student_capacity: agentData?.student_capacity || '',
    // Enhanced fields (user fills in profile)
    subject_specializations: agentData?.subject_specializations || [],
    education_levels: agentData?.education_levels || [],
    coverage_areas: agentData?.coverage_areas || [],
    number_of_tutors: agentData?.number_of_tutors || '',
    certifications: agentData?.certifications || [],
    website: agentData?.website || '',
    agent_additional_info: agentData?.additional_info || '',
  }));

  // Load availability/unavailability periods
  if (agentData?.availability && Array.isArray(agentData.availability)) {
    setAvailabilityPeriods(agentData.availability);
  }
  if (agentData?.unavailability && Array.isArray(agentData.unavailability)) {
    setUnavailabilityPeriods(agentData.unavailability);
  }
}, [profile]);
```

**Save Logic in handleSaveField**:
```typescript
else if (['agency_name', 'agency_size', 'years_in_business', 'description',
           'agent_services', 'commission_rate', 'service_areas', 'student_capacity',
           'subject_specializations', 'education_levels', 'coverage_areas',
           'number_of_tutors', 'certifications', 'website', 'agent_additional_info'].includes(field)) {
  const currentAgent = profile.professional_details?.agent || {};

  updateData = {
    professional_details: {
      ...profile.professional_details,
      agent: {
        ...currentAgent,
        agency_name: field === 'agency_name' ? formData.agency_name : (currentAgent.agency_name || ''),
        agency_size: field === 'agency_size' ? formData.agency_size : (currentAgent.agency_size || ''),
        years_in_business: field === 'years_in_business' ? formData.years_in_business : (currentAgent.years_in_business || ''),
        description: field === 'description' ? formData.description : (currentAgent.description || ''),
        services: field === 'agent_services' ? formData.agent_services : (currentAgent.services || []),
        commission_rate: field === 'commission_rate' ? formData.commission_rate : (currentAgent.commission_rate || ''),
        service_areas: field === 'service_areas' ? formData.service_areas : (currentAgent.service_areas || []),
        student_capacity: field === 'student_capacity' ? formData.student_capacity : (currentAgent.student_capacity || ''),
        subject_specializations: field === 'subject_specializations' ? formData.subject_specializations : (currentAgent.subject_specializations || []),
        education_levels: field === 'education_levels' ? formData.education_levels : (currentAgent.education_levels || []),
        coverage_areas: field === 'coverage_areas' ? formData.coverage_areas : (currentAgent.coverage_areas || []),
        number_of_tutors: field === 'number_of_tutors' ? formData.number_of_tutors : (currentAgent.number_of_tutors || ''),
        certifications: field === 'certifications' ? formData.certifications : (currentAgent.certifications || []),
        website: field === 'website' ? formData.website : (currentAgent.website || ''),
        additional_info: field === 'agent_additional_info' ? formData.agent_additional_info : (currentAgent.additional_info || ''),
      }
    }
  };
}
```

**UI Layout** (similar to client form):
```typescript
{activeRole === 'agent' && (
  <>
    <h2>Agency Information</h2>

    {/* Agency Name */}
    <FormField label="Agency Name" value={formData.agency_name} />

    {/* Agency Size */}
    <FormField label="Agency Size" value={formData.agency_size} />

    {/* Years in Business */}
    <FormField label="Years in Business" value={formData.years_in_business} />

    {/* Description */}
    <FormField label="About Your Agency" value={formData.description} />

    {/* Services */}
    <MultiSelectField label="Services Offered" values={formData.agent_services} options={agencyServicesOptions} />

    {/* Commission Rate */}
    <FormField label="Commission Rate" value={formData.commission_rate} />

    {/* Service Areas */}
    <MultiSelectField label="Service Areas" values={formData.service_areas} options={serviceAreasOptions} />

    {/* Student Capacity */}
    <FormField label="Student Capacity" value={formData.student_capacity} />

    <h3>Specializations</h3>

    {/* Subject Specializations */}
    <MultiSelectField label="Subject Specializations" values={formData.subject_specializations} options={subjectSpecializationsOptions} />

    {/* Education Levels */}
    <MultiSelectField label="Education Levels Covered" values={formData.education_levels} options={educationLevelsOptions} />

    {/* Coverage Areas */}
    <MultiSelectField label="UK Coverage Areas" values={formData.coverage_areas} options={ukRegionsOptions} />

    <h3>Additional Details</h3>

    {/* Number of Tutors */}
    <FormField label="Current Number of Tutors" value={formData.number_of_tutors} />

    {/* Certifications */}
    <MultiSelectField label="Professional Certifications" values={formData.certifications} />

    {/* Website */}
    <FormField label="Website" value={formData.website} type="url" />

    {/* Additional Info */}
    <FormField label="Additional Information" value={formData.agent_additional_info} />

    {/* Availability/Unavailability Calendar - COPY FROM CLIENT/TUTOR */}
    <h3>Availability</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
      {/* Left: Availability */}
      {/* Right: Unavailability */}
    </div>
  </>
)}
```

**Files Modified**:
- `/apps/web/src/app/components/profile/ProfessionalInfoForm.tsx`

**Success Criteria**:
- All 16 agent fields render when `activeRole === 'agent'`
- Fields pre-populate from onboarding data
- Fields save correctly to `professional_details.agent`
- Availability calendar fully functional
- TypeScript compiles without errors

---

### Phase 4: Auto-Save Availability (15 min)

**Tasks**:
1. ✅ Extend existing availability auto-save useEffect to include agent role
2. ✅ Update condition from `activeRole === 'seeker'` to `activeRole === 'seeker' || activeRole === 'agent'`
3. ✅ Ensure agent availability saves to `professional_details.agent.availability`

**Modified useEffect**:
```typescript
useEffect(() => {
  const saveAvailability = async () => {
    if (activeRole === 'seeker') {
      // Client save logic (existing)
    } else if (activeRole === 'agent') {
      // Agent save logic (NEW)
      const currentAgent = profile.professional_details?.agent;
      if (!currentAgent) return;

      try {
        await onSave({
          professional_details: {
            ...profile.professional_details,
            agent: {
              ...currentAgent,
              availability: availabilityPeriods,
              unavailability: unavailabilityPeriods,
            }
          }
        });
        console.log('[ProfessionalInfoForm] Auto-saved agent availability');
      } catch (error) {
        console.error('[ProfessionalInfoForm] Failed to auto-save agent availability:', error);
      }
    }
  };

  const hasData = availabilityPeriods.length > 0 || unavailabilityPeriods.length > 0;
  if (hasData) {
    const timer = setTimeout(saveAvailability, 500);
    return () => clearTimeout(timer);
  }
}, [availabilityPeriods, unavailabilityPeriods, activeRole, profile.professional_details, onSave]);
```

**Files Modified**:
- `/apps/web/src/app/components/profile/ProfessionalInfoForm.tsx`

**Success Criteria**:
- Availability changes auto-save for agent role
- No duplicate saves or infinite loops
- Database updates correctly

---

### Phase 5: Testing & Validation (1 hour)

**Tasks**:
1. ✅ Test complete agent onboarding flow
2. ✅ Verify data saves to `professional_details.agent`
3. ✅ Navigate to profile and verify auto-population
4. ✅ Test all 16 fields save/load correctly
5. ✅ Test availability calendar functionality
6. ✅ Test role switching (agent ↔ client ↔ tutor)
7. ✅ Verify TypeScript compilation
8. ✅ Check browser console for errors

**Testing Checklist**:
- [ ] Agent onboarding completes successfully
- [ ] Onboarding data appears in profile form
- [ ] Can edit and save each field
- [ ] Multi-select fields work (services, specializations, levels, areas, certifications)
- [ ] Availability calendar adds/removes periods
- [ ] Availability periods save automatically
- [ ] Data persists after page refresh
- [ ] Role switching works correctly
- [ ] No TypeScript errors
- [ ] No console errors

**Success Criteria**:
- All tests pass
- No errors in console
- User experience is smooth

---

### Phase 6: Documentation (30 min)

**Tasks**:
1. ✅ Create `AGENT-PROFESSIONAL-INFO-SPEC.md` with field specification
2. ✅ Document field-by-field details
3. ✅ Create matching matrix (agent-client, agent-tutor)
4. ✅ Document testing checklist
5. ✅ Update this plan with completion status

**Documentation Files**:
- `AGENT-PROFESSIONAL-INFO-SPEC.md` (NEW)
- `AGENT-PROFESSIONAL-INFO-IMPLEMENTATION-PLAN.md` (this file)

**Success Criteria**:
- Complete documentation exists
- Future developers can understand the system
- Matching engine requirements are clear

---

## Files to Modify

### 1. TypeScript Types
- **File**: `/apps/web/src/types/index.ts`
- **Changes**: Expand `AgentProfessionalInfo` interface from 3 fields to 16 fields

### 2. Agent Onboarding
- **File**: `/apps/web/src/app/components/onboarding/agent/AgentOnboardingWizard.tsx`
- **Function**: `handleCapacitySubmit` (lines ~224-268)
- **Changes**: Add mapping to `professional_details.agent`

### 3. Profile Form
- **File**: `/apps/web/src/app/components/profile/ProfessionalInfoForm.tsx`
- **Changes**:
  - Add 8 option arrays (services, specializations, levels, regions, etc.)
  - Add agent form state (16 fields)
  - Add useEffect to load agent data
  - Add handleSaveField logic for agent fields
  - Add agent UI section with all fields
  - Copy availability calendar (234 lines)
  - Extend availability auto-save useEffect

---

## Estimated Timeline

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| Phase 1 | TypeScript Interface | 30 min | ⏳ Pending |
| Phase 2 | Onboarding Integration | 1 hour | ⏳ Pending |
| Phase 3 | Profile Form Integration | 2 hours | ⏳ Pending |
| Phase 4 | Auto-Save Availability | 15 min | ⏳ Pending |
| Phase 5 | Testing & Validation | 1 hour | ⏳ Pending |
| Phase 6 | Documentation | 30 min | ⏳ Pending |
| **TOTAL** | **All Phases** | **~5.25 hours** | **⏳ Pending** |

---

## Success Criteria

### Implementation Complete When:
✅ TypeScript compiles without errors
✅ All 16 agent fields defined in interface
✅ Agent onboarding saves to `professional_details.agent`
✅ Profile form loads agent data from onboarding
✅ All fields can be edited and saved
✅ Availability calendar fully functional
✅ Auto-save works with 500ms debounce
✅ No runtime errors in browser console
✅ Data persists after page refresh
✅ Role switching works correctly

### Ready for Matching Engine When:
✅ Agent profiles have complete, validated data
✅ Field alignment verified (agent ↔ client, agent ↔ tutor)
✅ Availability data is reliable
✅ Documentation complete

---

## Risk Assessment

### Low Risk:
- TypeScript interface expansion (simple addition)
- Onboarding integration (proven pattern from client)
- Form field addition (repetitive work)
- Documentation (straightforward)

### Medium Risk:
- Availability calendar integration (complex but proven)
- Auto-save logic (needs careful testing to avoid infinite loops)

### High Risk:
- None identified (all patterns proven from client implementation)

---

## Rollback Plan

If issues arise:
1. **Phase 1-2**: Simple revert of TypeScript/onboarding changes
2. **Phase 3-4**: Agent form can be hidden with `if (activeRole === 'agent') return null;`
3. **Phase 5-6**: Testing/docs don't affect production

**Mitigation**: Implement behind feature flag if desired.

---

## Open Questions

1. **Q**: Should agents have a "tutor roster" field showing linked tutors?
   - **A**: Phase 2 - add in matching engine implementation

2. **Q**: Should commission rate be a range (min-max) or single value?
   - **A**: Single value for simplicity (matches onboarding)

3. **Q**: Should availability be for "onboarding new clients" or "general availability"?
   - **A**: General availability (when agency is accepting new clients/tutors)

4. **Q**: Do we need "tutor recruiting" vs "client matching" as separate features?
   - **A**: Phase 2 - implement both in matching engine

---

## Next Steps After Implementation

1. **Implement Matching Engine**:
   - Agent → Client matching (find clients for agency)
   - Agent → Tutor recruiting (find tutors for agency roster)
   - Use field alignment matrix from this doc

2. **Tutor Roster Management**:
   - Add tutor roster page for agents
   - Show linked tutors
   - Tutor performance metrics

3. **Enhanced Analytics**:
   - Agency dashboard with metrics
   - Client acquisition cost
   - Tutor retention rate
   - Revenue tracking

4. **E2E Testing**:
   - Playwright tests for full agent workflow
   - Visual regression with Percy

---

## Conclusion

This plan provides a comprehensive roadmap for implementing Agent Professional Info based on proven patterns from the Client implementation. By following the lessons learned, we can avoid previous pitfalls and deliver a robust, maintainable feature in ~5 hours.

**Key Advantages**:
- ✅ Proven pattern from client implementation
- ✅ Complete onboarding → profile integration
- ✅ Field alignment for matching engine
- ✅ Comprehensive documentation
- ✅ Clear success criteria
- ✅ Low risk implementation

**Status**: Ready to implement!

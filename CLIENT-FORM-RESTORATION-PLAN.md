# Client Professional Info Form - Restoration Plan

**Date**: 2025-10-27
**Status**: Planning
**Issue**: Client professional info form only shows stub, should show complete 10-field implementation

---

## Problem

According to CLIENT-ONBOARDING-INTEGRATION-COMPLETE.md, the client professional info form was fully implemented with:
- All 10 client fields
- Full availability calendar (234 lines, same as tutor)
- Auto-save functionality
- Load logic in useEffect

**Current State**: Only shows stub with "Additional client-specific fields coming soon..."

**Required**: Restore complete implementation

---

## Implementation Requirements

### Fields to Add (10 fields)

1. **subjects** - Multi-select (from onboarding)
2. **education_level** - Single select
3. **learning_goals** - Multi-select (min 1)
4. **learning_preferences** - Multi-select (from onboarding)
5. **budget_range** - Min/max number inputs
6. **sessions_per_week** - Single select
7. **session_duration** - Single select
8. **special_needs** - Multi-select
9. **additional_info** - Textarea (from onboarding)
10. **availability/unavailability** - Full calendar (from onboarding)

### Field Options to Define

```typescript
const educationLevelOptions = [
  'Primary Education (KS1-KS2) - Age 5 to 11',
  'Secondary Education (KS3) - Age 11 to 14',
  'Secondary Education (KS4) - Age 14 to 16',
  'A-Levels - Age 16 to 18',
  'University/Undergraduate',
  'Postgraduate',
  'Adult Education'
];

const learningGoalsOptions = [
  'Improve grades',
  'Exam preparation',
  'Catch up on missed work',
  'Advanced learning',
  'Build confidence',
  'Homework help',
  'Career preparation',
  'Personal development'
];

const learningPreferencesOptions = [
  'Visual learning',
  'Auditory learning',
  'Hands-on practice',
  'Reading/writing',
  'One-on-one attention',
  'Structured lessons',
  'Flexible approach'
];

const specialNeedsOptions = [
  'Dyslexia',
  'Dyscalculia',
  'ADHD',
  'Autism Spectrum Disorder (ASD)',
  'Dyspraxia',
  'Visual Impairment',
  'Hearing Impairment',
  'Speech and Language Difficulties',
  'Physical Disabilities',
  'Emotional and Behavioural Difficulties',
  'Gifted and Talented',
  'English as Additional Language (EAL)'
];

const sessionsPerWeekOptions = ['1', '2', '3', '4', '5+'];
const sessionDurationOptions = ['30 minutes', '1 hour', '1.5 hours', '2 hours'];
```

### Form Data State to Add

Already added to initial state at lines 115-148, but need to add client-specific fields:

```typescript
// Client fields (add to existing formData)
subjects_client: [] as string[],        // Different from tutor subjects field
education_level: '',
learning_goals: [] as string[],
learning_preferences: [] as string[],
budget_min: '',
budget_max: '',
sessions_per_week: '',
session_duration: '',
special_needs: [] as string[],
additional_info_client: '',             // Different from generic additional_info
```

### useEffect Data Loading (Add to existing useEffect at lines 148-187)

```typescript
const clientData = profile.professional_details?.client;

// Client fields
subjects_client: clientData?.subjects || [],
education_level: clientData?.education_level || '',
learning_goals: clientData?.learning_goals || [],
learning_preferences: clientData?.learning_preferences || [],
budget_min: clientData?.budget_range ? clientData.budget_range.split('-')[0] : '',
budget_max: clientData?.budget_range ? clientData.budget_range.split('-')[1] : '',
sessions_per_week: clientData?.sessions_per_week || '',
session_duration: clientData?.session_duration || '',
special_needs: clientData?.special_needs || [],
additional_info_client: clientData?.additional_info || '',

// Load availability/unavailability
if (clientData?.availability) {
  setAvailabilityPeriods(clientData.availability);
}
if (clientData?.unavailability) {
  setUnavailabilityPeriods(clientData.unavailability);
}
```

### Auto-Save Availability (Add after useEffect)

```typescript
// Auto-save availability for clients
useEffect(() => {
  const saveAvailability = async () => {
    if (activeRole !== 'seeker') return;

    const currentClient = profile.professional_details?.client || {};

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
}, [availabilityPeriods, unavailabilityPeriods, activeRole, profile, onSave]);
```

### handleSaveField Updates (Add to existing function)

```typescript
// Client field saves
if (field === 'subjects_client' || field === 'education_level' || field === 'learning_goals' ||
    field === 'learning_preferences' || field === 'sessions_per_week' || field === 'session_duration' ||
    field === 'special_needs' || field === 'additional_info_client') {

  const currentClient = profile.professional_details?.client || {};

  let updates: any = { ...currentClient };

  // Handle budget_range special case
  if (field === 'budget_min' || field === 'budget_max') {
    const min = field === 'budget_min' ? value : formData.budget_min;
    const max = field === 'budget_max' ? value : formData.budget_max;
    updates.budget_range = `${min}-${max}`;
  } else {
    // Map field names
    const fieldMapping: Record<string, string> = {
      'subjects_client': 'subjects',
      'additional_info_client': 'additional_info'
    };
    const dbField = fieldMapping[field] || field;
    updates[dbField] = value;
  }

  await onSave({
    professional_details: {
      ...profile.professional_details,
      client: updates
    }
  });
  return;
}
```

### Client Section JSX (Replace stub at lines 544-558)

```tsx
// For clients (seekers), show complete client professional info
if (activeRole === 'seeker') {
  const clientData = profile.professional_details?.client;

  return (
    <div className={styles.personalInfoForm}>
      <div className={styles.formContent}>
        {/* Subjects - Full Width */}
        <div className={formLayoutStyles.fullWidth}>
          {renderField('subjects_client', 'Subjects: What subjects do you need help with?', 'multiselect', 'Select subjects', subjectsOptions)}
        </div>

        {/* Education Level and Learning Goals - 2 Column */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('education_level', 'Education Level', 'select', 'Select your current level', educationLevelOptions)}
          {renderField('learning_goals', 'Learning Goals', 'multiselect', 'Select your goals', learningGoalsOptions)}
        </div>

        {/* Learning Preferences - Full Width */}
        <div className={formLayoutStyles.fullWidth}>
          {renderField('learning_preferences', 'Learning Preferences', 'multiselect', 'Select preferences', learningPreferencesOptions)}
        </div>

        {/* Budget Range - 2 Column */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('budget_min', 'Minimum Budget (£/hour)', 'number', '£20')}
          {renderField('budget_max', 'Maximum Budget (£/hour)', 'number', '£50')}
        </div>

        {/* Sessions Per Week and Session Duration - 2 Column */}
        <div className={formLayoutStyles.twoColumnGrid}>
          {renderField('sessions_per_week', 'Sessions Per Week', 'select', 'Select frequency', sessionsPerWeekOptions)}
          {renderField('session_duration', 'Session Duration', 'select', 'Select duration', sessionDurationOptions)}
        </div>

        {/* Special Needs - Full Width */}
        <div className={formLayoutStyles.fullWidth}>
          {renderField('special_needs', 'Special Educational Needs (SEN)', 'multiselect', 'Select if applicable', specialNeedsOptions)}
        </div>

        {/* Additional Info - Full Width */}
        <div className={formLayoutStyles.fullWidth}>
          {renderField('additional_info_client', 'Additional Information', 'textarea', 'Any other information you\'d like tutors to know...')}
        </div>

        {/* Availability Calendar - Same as tutor implementation */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '32px' }}>
          {/* Availability Period */}
          <div>
            <h3 className={styles.subsectionTitle} style={{ marginBottom: '24px' }}>
              Availability Period
            </h3>
            {/* Copy entire availability section from tutor (lines 754-899) */}
          </div>

          {/* Unavailability Period */}
          <div>
            <h3 className={styles.subsectionTitle} style={{ marginBottom: '24px' }}>
              Unavailability Period
            </h3>
            {/* Copy entire unavailability section from tutor (lines 901-987) */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Implementation Strategy

### Phase 1: Add Field Options (SAFE)
1. Add all const arrays for field options at the top of the file
2. Test compilation

### Phase 2: Add Client Fields to formData State (SAFE)
1. Add client-specific fields to useState initialization
2. Test compilation

### Phase 3: Add Client Data Loading to useEffect (MODERATE)
1. Extract clientData from professional_details
2. Add client field loading logic
3. Test compilation

### Phase 4: Add Client Field Save Logic (MODERATE)
1. Add client field cases to handleSaveField
2. Test compilation

### Phase 5: Replace Client Section JSX (HIGH RISK)
1. Replace stub with complete 10-field display
2. Copy availability calendar from tutor section
3. Test compilation

### Phase 6: Add Auto-Save for Availability (SAFE)
1. Add useEffect for client availability auto-save
2. Test compilation

---

## Risk Mitigation

1. Make ONE change at a time
2. Test compilation after EACH phase
3. If ANY error, revert that phase immediately
4. Don't proceed to next phase until current one compiles

---

## Success Criteria

- ✅ Client professional info shows all 10 fields
- ✅ Data auto-populates from onboarding
- ✅ Availability calendar displays and saves
- ✅ All fields can be edited and saved
- ✅ Page compiles without errors
- ✅ No JSX syntax errors

---

**Ready to implement**: Yes, with extreme caution and phase-by-phase approach

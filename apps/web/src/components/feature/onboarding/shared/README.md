# Reusable Wizard Components

This directory contains battle-tested, reusable components for building wizard/onboarding flows.

## Purpose

These components solve common issues with wizard forms:
- ✅ Consistent button behavior across all steps
- ✅ Automatic event handling (no more preventDefault/stopPropagation issues)
- ✅ Built-in validation hooks
- ✅ Accessibility support (keyboard navigation, ARIA attributes)
- ✅ Debug logging for troubleshooting
- ✅ Type-safe props with TypeScript

## Components

### 1. WizardButton Components

Located in `WizardButton.tsx`

#### `WizardPrimaryButton`
Primary action button (Continue, Submit, Next)

```tsx
import { WizardPrimaryButton } from '../shared/WizardButton';

<WizardPrimaryButton
  onClick={() => handleContinue()}
  disabled={!isFormValid}
  isLoading={isSaving}
  debug={true}
>
  Continue →
</WizardPrimaryButton>
```

#### `WizardSecondaryButton`
Secondary action button (Back, Skip, Cancel)

```tsx
import { WizardSecondaryButton } from '../shared/WizardButton';

<WizardSecondaryButton
  onClick={() => handleBack()}
  disabled={isLoading}
>
  ← Back
</WizardSecondaryButton>
```

#### `WizardActionButtons`
Complete button group with automatic layout

```tsx
import { WizardActionButtons } from '../shared/WizardButton';

<WizardActionButtons
  onContinue={handleContinue}
  continueEnabled={isValid}
  onBack={handleBack}
  onSkip={handleSkip}
  isLoading={isLoading}
  continueLabel="Next Step →"
  debug={true}
/>
```

**Props:**
- `onContinue`: Continue button handler (required)
- `continueEnabled`: Enable/disable continue button (required)
- `onBack`: Back button handler (optional, button shows if provided)
- `onSkip`: Skip button handler (optional, button shows if provided)
- `isLoading`: Loading state (disables all buttons)
- `continueLabel`: Custom continue button text (default: "Continue →")
- `backLabel`: Custom back button text (default: "← Back")
- `skipLabel`: Custom skip button text (default: "Skip for now")
- `debug`: Enable console logging

### 2. SelectableCard Components

Located in `SelectableCard.tsx`

#### `SingleSelectCardGroup`
Radio button behavior - select one option from many

```tsx
import { SingleSelectCardGroup } from '../shared/SelectableCard';

const rateOptions = [
  { value: 25, label: '$25-35/hr', description: 'Entry level' },
  { value: 40, label: '$40-50/hr', description: 'Intermediate' },
];

<SingleSelectCardGroup
  options={rateOptions}
  selectedValue={hourlyRate}
  onChange={(value) => setHourlyRate(value)}
  debug={true}
/>
```

#### `MultiSelectCardGroup`
Checkbox behavior - select multiple options

```tsx
import { MultiSelectCardGroup } from '../shared/SelectableCard';

const availabilityOptions = [
  { value: 'morning', label: 'Morning', description: '6am - 12pm' },
  { value: 'afternoon', label: 'Afternoon', description: '12pm - 6pm' },
];

<MultiSelectCardGroup
  options={availabilityOptions}
  selectedValues={availability}
  onChange={(values) => setAvailability(values)}
  debug={true}
/>
```

#### `CompactCheckboxGroup`
Compact checkbox grid for smaller options

```tsx
import { CompactCheckboxGroup } from '../shared/SelectableCard';

const sessionTypes = [
  { value: 'online', label: 'Online', icon: '💻' },
  { value: 'in_person', label: 'In-Person', icon: '🏠' },
];

<CompactCheckboxGroup
  options={sessionTypes}
  selectedValues={selectedTypes}
  onChange={(values) => setSelectedTypes(values)}
  debug={true}
/>
```

### 3. Validation Hook

#### `useWizardValidation`
Reusable hook for form validation

```tsx
import { useWizardValidation } from '../shared/WizardButton';

const { isValid, validate } = useWizardValidation({
  fields: { name, email, age },
  validators: {
    name: (v) => v.length > 0,
    email: (v) => v.includes('@'),
    age: (v) => v >= 18,
  },
  debug: true,
});

// isValid updates automatically when fields change
```

## Complete Example

See `TutorAvailabilityStep.tsx` for a full example of using all these components together.

```tsx
'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import { WizardActionButtons, useWizardValidation } from '../shared/WizardButton';
import { SingleSelectCardGroup, MultiSelectCardGroup } from '../shared/SelectableCard';

const MyStep = ({ onNext, onBack, onSkip, isLoading }) => {
  const [rate, setRate] = useState(null);
  const [availability, setAvailability] = useState([]);

  const { isValid } = useWizardValidation({
    fields: { rate, availability },
    validators: {
      rate: (v) => v !== null,
      availability: (v) => v.length > 0,
    },
    debug: true,
  });

  const handleContinue = () => {
    if (isValid) {
      onNext({ rate, availability });
    }
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>Select Options</h2>
      </div>

      <div className={styles.stepBody}>
        <SingleSelectCardGroup
          options={rateOptions}
          selectedValue={rate}
          onChange={setRate}
        />

        <MultiSelectCardGroup
          options={availabilityOptions}
          selectedValues={availability}
          onChange={setAvailability}
        />
      </div>

      <WizardActionButtons
        onContinue={handleContinue}
        continueEnabled={isValid}
        onBack={onBack}
        onSkip={onSkip}
        isLoading={isLoading}
      />
    </div>
  );
};
```

## Features

### ✅ Automatic Event Handling
All buttons automatically call `preventDefault()` and `stopPropagation()` to prevent form submission issues.

### ✅ Keyboard Accessibility
Card components support:
- `Enter` key to select
- `Space` bar to select
- `Tab` navigation
- ARIA attributes (role, aria-checked, aria-label)

### ✅ Debug Logging
Enable `debug={true}` on any component to see console logs:
```
[SingleSelectCardGroup] Selected: 40
[WizardPrimaryButton] Clicked: { disabled: false, isLoading: false }
[useWizardValidation] { fields: {...}, results: {...}, isValid: true }
```

### ✅ Type Safety
All components are fully typed with TypeScript interfaces.

### ✅ Consistent Styling
Uses the shared `OnboardingWizard.module.css` for consistent look across all wizards.

## Migration Guide

### Before (Manual Implementation)
```tsx
// Old way - error prone
<button
  onClick={handleNext}
  disabled={!isValid || isLoading}
  className={styles.buttonPrimary}
>
  Continue
</button>
```

### After (Using Reusable Components)
```tsx
// New way - reliable and consistent
<WizardPrimaryButton
  onClick={handleNext}
  disabled={!isValid}
  isLoading={isLoading}
>
  Continue
</WizardPrimaryButton>
```

## Benefits

1. **No More Button Issues**: Automatic event handling prevents common click problems
2. **Consistency**: Same behavior across all wizard steps
3. **Less Code**: Reduce boilerplate in each step component
4. **Easier Debugging**: Built-in logging helps troubleshoot issues
5. **Accessibility**: ARIA attributes and keyboard support built-in
6. **Type Safety**: Catch errors at compile time, not runtime

## When to Use

✅ **Use these components for:**
- All onboarding wizard steps
- Multi-step form flows
- Guided setup processes
- Any sequential data collection

❌ **Don't use for:**
- Single-page forms (use regular buttons)
- Complex custom interactions (build custom components)
- Non-wizard workflows

## Support

If you encounter issues:
1. Enable `debug={true}` on the component
2. Check browser console for detailed logs
3. Verify props are correctly passed
4. Check that CSS modules are imported

## Future Enhancements

Potential additions:
- Progress indicator component
- Stepper/breadcrumb component
- Animation transitions between steps
- Form field validation helpers
- Auto-save draft functionality

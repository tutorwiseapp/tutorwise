/**
 * Filename: index.ts
 * Purpose: Barrel export for form components
 * Created: 2026-01-09
 * Updated: 2026-01-09 - Added usage guidance for FormGroup vs HubForm.Field
 */

// Unified dropdown components (standardized)
export { default as UnifiedSelect } from './UnifiedSelect';
export type { UnifiedSelectProps, SelectOption } from './UnifiedSelect';

export { default as UnifiedMultiSelect } from './UnifiedMultiSelect';
export type { UnifiedMultiSelectProps, MultiSelectOption } from './UnifiedMultiSelect';

// Form wrappers and components
// FormGroup: Use for standalone forms (login, signup, partnerships, contact)
// HubForm.Field: Use for hub pages (account, profile, settings) - import from @/app/components/hub/form/HubForm
export { default as FormGroup } from './FormGroup';

// Pickers and inputs
export { default as DatePicker } from './DatePicker';
export { default as TimePicker } from './TimePicker';
export { default as ToggleSwitch } from './ToggleSwitch';
export { default as Input } from './Input';

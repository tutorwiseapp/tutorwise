/**
 * Filename: index.ts
 * Purpose: Barrel export for form components
 * Created: 2026-01-09
 */

// Unified dropdown components (standardized, recommended)
export { default as UnifiedSelect } from './UnifiedSelect';
export type { UnifiedSelectProps, SelectOption } from './UnifiedSelect';

export { default as UnifiedMultiSelect } from './UnifiedMultiSelect';
export type { UnifiedMultiSelectProps, MultiSelectOption } from './UnifiedMultiSelect';

// Legacy components (deprecated, will be removed after migration)
export { default as Select } from './Select';
export { default as Dropdown } from './Dropdown';
export { default as MultiSelectDropdown } from './MultiSelectDropdown';

// Other form components
export { default as DatePicker } from './DatePicker';

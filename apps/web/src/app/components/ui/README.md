# UI Component Library

This directory contains reusable UI components for the TutorWise application. These components follow a consistent design system and provide the building blocks for all features.

## Directory Structure

```
ui/
├── forms/                    # Form-related components
│   ├── FormGroup.tsx         # Form field wrapper with label/error
│   ├── Input.tsx            # Text input component
│   ├── Textarea.tsx         # Multi-line text input
│   ├── UnifiedSelect.tsx    # ✨ NEW: Radix-based single select dropdown
│   ├── UnifiedMultiSelect.tsx # ✨ NEW: Radix-based multi-select dropdown
│   ├── Select.tsx           # ⚠️ DEPRECATED: Use UnifiedSelect instead
│   ├── TimePicker.tsx       # Time selection component
│   ├── ToggleSwitch.tsx     # Toggle switch component
│   ├── Checkbox.tsx         # Checkbox input (TODO)
│   └── Radio.tsx            # Radio button (TODO)
├── actions/
│   └── Button.tsx           # Button component
├── data-display/
│   ├── Chip.tsx            # Tag/chip component
│   ├── Card.tsx            # Content card
│   └── Badge.tsx           # Status badge (TODO)
├── feedback/
│   ├── Modal.tsx           # Dialog/modal (TODO)
│   └── Spinner.tsx         # Loading indicator (TODO)
└── README.md               # This file
```

## Available Components

### Button

Reusable button component with variants and sizes.

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- All standard button HTML attributes

**Example:**
```tsx
import Button from '@/app/components/ui/Button';

<Button variant="primary" size="md" onClick={handleClick}>
  Save Changes
</Button>
```

**Variants:**
- `primary` - Blue background, white text (main actions)
- `secondary` - Gray background, dark text (secondary actions)
- `danger` - Red background, white text (destructive actions)

---

### Chip

Tag/chip component for displaying selected items with optional remove functionality.

**Props:**
- `label`: string - The text to display
- `onRemove`: () => void - Optional callback when remove button clicked
- `variant`: 'default' | 'primary' | 'success' | 'warning' | 'error' (default: 'default')
- `size`: 'sm' | 'md' (default: 'md')

**Example:**
```tsx
import Chip from '@/app/components/ui/Chip';

<Chip 
  label="Mathematics" 
  variant="primary"
  onRemove={() => handleRemove('math')} 
/>
```

---

### Form Components

#### FormGroup

Wrapper component for form fields with label, error display, and required indicator.

**Props:**
- `label`: string - Field label
- `htmlFor`: string - ID of the input element
- `error`: string - Error message to display
- `required`: boolean - Show required asterisk
- `children`: ReactNode - The input component
- `className`: string - Additional CSS classes

**Example:**
```tsx
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';

<FormGroup 
  label="Email Address" 
  htmlFor="email" 
  error={errors.email}
  required
>
  <Input 
    id="email" 
    type="email" 
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</FormGroup>
```

---

#### Input

Styled text input component with error states.

**Props:**
- `error`: boolean - Apply error styling
- All standard input HTML attributes

**Example:**
```tsx
import Input from '@/app/components/ui/form/Input';

<Input
  type="text"
  placeholder="Enter your name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={!!errors.name}
/>
```

---

#### Textarea

Multi-line text input component with error states.

**Props:**
- `error`: boolean - Apply error styling
- All standard textarea HTML attributes

**Example:**
```tsx
import Textarea from '@/app/components/ui/form/Textarea';

<Textarea
  placeholder="Enter description"
  rows={4}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  error={!!errors.description}
/>
```

---

#### Select (DEPRECATED)

⚠️ **DEPRECATED:** This component uses native HTML `<select>` and should not be used in new code. Use `UnifiedSelect` instead for consistent styling and better UX.

**Migration Guide:** See UnifiedSelect section below.

---

#### UnifiedSelect ✨ RECOMMENDED

**Modern single-select dropdown component built on Radix UI with consistent chevron icons and styling.**

This is the **standard dropdown component** for all new development. It provides a consistent user experience across the application with proper keyboard navigation, accessibility, and visual design.

**Props:**
- `value`: string | number - Current selected value
- `onChange`: (value: string | number) => void - Callback when selection changes
- `options`: Array<{value: string | number, label: string}> - Options to display
- `placeholder`: string - Placeholder text when no value selected
- `disabled`: boolean - Disable the select (optional)
- `error`: boolean - Apply error styling (optional)
- `className`: string - Additional CSS classes (optional)

**Example - Basic Usage:**
```tsx
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';

// Simple string values
<UnifiedSelect
  value={sortBy}
  onChange={(value) => setSortBy(value as SortType)}
  options={[
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'price-low', label: 'Price: Low to High' }
  ]}
  placeholder="Sort by"
/>
```

**Example - With Type Casting:**
```tsx
type Status = 'active' | 'inactive' | 'pending';

const [status, setStatus] = useState<Status>('active');

<UnifiedSelect
  value={status}
  onChange={(value) => setStatus(value as Status)}
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' }
  ]}
  placeholder="Select status"
/>
```

**Example - Dynamic Options from API:**
```tsx
<UnifiedSelect
  value={selectedMemberId}
  onChange={(value) => setSelectedMemberId(String(value))}
  options={[
    { value: '', label: 'Select team member...' },
    ...teamMembers.map((member) => ({
      value: member.id,
      label: member.full_name
    }))
  ]}
  placeholder="Select team member"
  disabled={loading}
/>
```

**Example - With Error State:**
```tsx
<UnifiedSelect
  value={category}
  onChange={(value) => setCategory(String(value))}
  options={categoryOptions}
  placeholder="Select category"
  error={!!errors.category}
/>
{errors.category && <p className={styles.errorText}>{errors.category}</p>}
```

**Migration from Native Select:**
```tsx
// OLD - Native select
<select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value as SortType)}
  className={styles.select}
>
  <option value="newest">Newest First</option>
  <option value="oldest">Oldest First</option>
</select>

// NEW - UnifiedSelect
<UnifiedSelect
  value={sortBy}
  onChange={(value) => setSortBy(value as SortType)}
  options={[
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' }
  ]}
  placeholder="Sort by"
/>
```

**Key Benefits:**
- ✅ Consistent chevron icon (Radix ChevronDownIcon)
- ✅ Better keyboard navigation
- ✅ Cleaner onChange API (no event.target.value)
- ✅ Built-in accessibility features
- ✅ Unified styling across the application
- ✅ Type-safe options

---

#### UnifiedMultiSelect ✨ RECOMMENDED

**Modern multi-select dropdown component built on Radix UI with checkboxes and item count display.**

Use this component when users need to select multiple options from a list. It shows selected items as a count in the trigger button and provides checkboxes in the dropdown.

**Props:**
- `triggerLabel`: string - Base label for the trigger button
- `selectedValues`: string[] - Array of currently selected values
- `onSelectionChange`: (values: string[]) => void - Callback when selection changes
- `options`: Array<{value: string, label: string}> - Options to display
- `placeholder`: string - Placeholder text when nothing selected (optional)
- `disabled`: boolean - Disable the select (optional)
- `error`: boolean - Apply error styling (optional)
- `className`: string - Additional CSS classes (optional)

**Example - Basic Usage:**
```tsx
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';

const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

<UnifiedMultiSelect
  triggerLabel={formatMultiSelectLabel(selectedSubjects, 'Select subjects')}
  options={[
    { value: 'math', label: 'Mathematics' },
    { value: 'science', label: 'Science' },
    { value: 'english', label: 'English' },
    { value: 'history', label: 'History' }
  ]}
  selectedValues={selectedSubjects}
  onSelectionChange={setSelectedSubjects}
/>
```

**Example - With Custom Label Formatting:**
```tsx
// Using the formatMultiSelectLabel helper
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';

<UnifiedMultiSelect
  triggerLabel={formatMultiSelectLabel(
    selectedLevels,
    'Select levels',
    30  // truncate at 30 characters
  )}
  options={LEVEL_OPTIONS}
  selectedValues={selectedLevels}
  onSelectionChange={setSelectedLevels}
/>

// Display examples:
// - No selection: "Select levels"
// - 1 selected: "Primary School"
// - 2 selected: "Primary School, Secondary"
// - 3+ selected: "Primary School, Secondary, +2"
```

**Example - With Error State:**
```tsx
<div className={styles.formSection}>
  <label className={styles.label}>
    Subjects <span className={styles.required}>*</span>
  </label>
  <UnifiedMultiSelect
    triggerLabel={formatMultiSelectLabel(selectedSubjects, 'Select subjects')}
    options={SUBJECT_OPTIONS}
    selectedValues={selectedSubjects}
    onSelectionChange={setSelectedSubjects}
    error={!!errors.subjects}
  />
  {errors.subjects && <p className={styles.errorText}>{errors.subjects}</p>}
</div>
```

**Example - Dynamic Options:**
```tsx
<UnifiedMultiSelect
  triggerLabel={formatMultiSelectLabel(selectedFilters, 'All subjects')}
  options={commonSubjects.map((subject) => ({
    value: subject,
    label: subject
  }))}
  selectedValues={selectedFilters}
  onSelectionChange={(values) => {
    setSelectedFilters(values.length > 0 ? values : undefined);
  }}
/>
```

**Helper Function - formatMultiSelectLabel:**
```tsx
// Located in: apps/web/src/app/utils/formHelpers.ts
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';

/**
 * Formats multi-select trigger label showing selected items or count
 * @param selectedValues - Array of selected value strings
 * @param defaultLabel - Label to show when nothing selected
 * @param maxLength - Maximum character length before truncation (default: 30)
 * @returns Formatted label string
 *
 * Examples:
 * - [] => "Select items"
 * - ["Math"] => "Math"
 * - ["Math", "Science"] => "Math, Science"
 * - ["Math", "Science", "English", "History"] => "Math, Science, +2"
 */
formatMultiSelectLabel(selectedValues, defaultLabel, maxLength?)
```

**Key Benefits:**
- ✅ Shows item count when multiple items selected
- ✅ Individual item names when space allows
- ✅ Checkboxes for clear selection state
- ✅ "Clear All" button for bulk deselection
- ✅ Keyboard accessible
- ✅ Consistent with single-select styling

---

## Component Development Guidelines

### When to Create a Component

Create a new UI component when:
1. The element will be used in 3+ places
2. It needs consistent styling across the app
3. It has reusable logic (validation, formatting, etc.)
4. It represents a common UI pattern

### Component Template

```tsx
import React from 'react';

interface ComponentNameProps {
  // Define props here
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

/**
 * ComponentName
 * 
 * Brief description of what this component does.
 * 
 * @example
 * ```tsx
 * <ComponentName variant="primary" size="md">
 *   Content here
 * </ComponentName>
 * ```
 */
const ComponentName: React.FC<ComponentNameProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
  children,
}) => {
  // Component logic here
  
  return (
    <div className={`base-styles ${variant} ${size} ${className}`}>
      {children}
    </div>
  );
};

export default ComponentName;
```

### Styling Conventions

- Use Tailwind CSS utility classes
- Keep consistent spacing (px-3, py-2 for inputs)
- Use consistent colors (blue-600 for primary, gray-200 for secondary)
- Support error states with red variants
- Include focus states (focus:ring-2, focus:ring-blue-500)
- Make components responsive where appropriate

### Accessibility Guidelines

- Include proper ARIA labels
- Support keyboard navigation
- Maintain color contrast ratios (WCAG AA minimum)
- Provide meaningful alt text for icons
- Support screen readers with semantic HTML

## Adding a New Component

Follow these steps:

1. **Check if it exists**: Search the codebase first
   ```bash
   # Use Glob to find similar components
   Glob: apps/web/src/app/components/**/*ComponentName*.tsx
   ```

2. **Create the component file** in the appropriate directory:
   - Form elements → `ui/form/`
   - General UI → `ui/`

3. **Add comprehensive JSDoc comments** at the top

4. **Include examples** in the documentation

5. **Test the component**:
   ```bash
   cd apps/web
   npm run build
   npm run dev
   ```

6. **Update this README** with the new component documentation

7. **Create a story** (if using Storybook)

## Component Status

| Component | Status | Priority | Notes |
|-----------|--------|----------|-------|
| **Form Components** ||||
| UnifiedSelect | ✅ Complete | High | **USE THIS** - Radix UI based, consistent chevrons |
| UnifiedMultiSelect | ✅ Complete | High | **USE THIS** - Multi-select with checkboxes |
| Input | ✅ Complete | High | Text input component |
| Textarea | ✅ Complete | High | Multi-line text input |
| FormGroup | ✅ Complete | High | Form field wrapper |
| TimePicker | ✅ Complete | Medium | Time selection |
| ToggleSwitch | ✅ Complete | Medium | Toggle switch |
| Select | ⚠️ Deprecated | Low | **DO NOT USE** - Use UnifiedSelect instead |
| Checkbox | 📝 TODO | High | Needed for forms |
| Radio | 📝 TODO | High | Needed for forms |
| **Action Components** ||||
| Button | ✅ Complete | High | Primary button component |
| **Display Components** ||||
| Chip | ✅ Complete | High | Tag/chip component |
| Card | ✅ Complete | Medium | Content card component |
| Badge | 📝 TODO | Medium | For status indicators |
| **Feedback Components** ||||
| Toast | ✅ Using `sonner` | High | External library (react-hot-toast) |
| Modal | 📝 TODO | Medium | For dialogs |
| Spinner | 📝 TODO | Medium | For loading states |

## Dependencies

Current external UI dependencies:
- **@radix-ui/react-dropdown-menu** - Dropdown primitives for UnifiedSelect and UnifiedMultiSelect
- **@radix-ui/react-icons** - Icon components (ChevronDownIcon, CheckIcon)
- **react-hot-toast** - Toast notifications (used throughout the app)
- **Tailwind CSS** - Utility-first CSS framework
- **CSS Modules** - Component-scoped styling

## Related Documentation

- [DEVELOPMENT-WORKFLOW-IMPROVEMENTS.md](../../../../../DEVELOPMENT-WORKFLOW-IMPROVEMENTS.md) - Development guidelines
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

## Questions or Issues?

If you encounter issues with UI components or need a new component:
1. Check this README first
2. Search existing components in this directory
3. Review [DEVELOPMENT-WORKFLOW-IMPROVEMENTS.md](../../../../../DEVELOPMENT-WORKFLOW-IMPROVEMENTS.md)
4. Create the component following the template above
5. Update this documentation

---

## Quick Reference

**For New Dropdowns:**
- Single-select → Use `UnifiedSelect`
- Multi-select → Use `UnifiedMultiSelect` with `formatMultiSelectLabel`
- Native `<select>` → ⚠️ Don't use, migrate to UnifiedSelect

**Common Imports:**
```tsx
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import { formatMultiSelectLabel } from '@/app/utils/formHelpers';
```

---

**Last Updated:** 2026-01-10
**Maintained By:** Development Team
**Status:** Active

# UI Component Library

This directory contains reusable UI components for the TutorWise application. These components follow a consistent design system and provide the building blocks for all features.

## Directory Structure

```
ui/
├── form/              # Form-related components
│   ├── FormGroup.tsx  # Form field wrapper with label/error
│   ├── Input.tsx      # Text input component
│   ├── Textarea.tsx   # Multi-line text input
│   ├── Select.tsx     # Dropdown select
│   ├── Checkbox.tsx   # Checkbox input (TODO)
│   └── Radio.tsx      # Radio button (TODO)
├── Button.tsx         # Button component
├── Chip.tsx           # Tag/chip component
├── Badge.tsx          # Status badge (TODO)
├── Card.tsx           # Content card (TODO)
├── Modal.tsx          # Dialog/modal (TODO)
├── Spinner.tsx        # Loading indicator (TODO)
└── README.md          # This file
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

#### Select

Dropdown select component with options support.

**Props:**
- `options`: Array<{value: string, label: string}> - Select options
- `error`: boolean - Apply error styling
- `placeholder`: string - Placeholder option text
- All standard select HTML attributes

**Example:**
```tsx
import Select from '@/app/components/ui/form/Select';

<Select
  options={[
    { value: 'math', label: 'Mathematics' },
    { value: 'science', label: 'Science' },
    { value: 'english', label: 'English' }
  ]}
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
  placeholder="Select a subject"
/>
```

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
| Button | ✅ Complete | High | Basic functionality complete |
| Chip | ✅ Complete | High | Basic functionality complete |
| FormGroup | ✅ Complete | High | Basic functionality complete |
| Input | ✅ Complete | High | Basic functionality complete |
| Textarea | ✅ Complete | High | Basic functionality complete |
| Select | ✅ Complete | High | Basic functionality complete |
| Checkbox | 📝 TODO | High | Needed for forms |
| Radio | 📝 TODO | High | Needed for forms |
| Badge | 📝 TODO | Medium | For status indicators |
| Card | 📝 TODO | Medium | For content layout |
| Modal | 📝 TODO | Medium | For dialogs |
| Spinner | 📝 TODO | Medium | For loading states |
| Toast | ✅ Using `sonner` | High | External library |

## Dependencies

Current external UI dependencies:
- **sonner** - Toast notifications (used in listings, marketplace)
- **Tailwind CSS** - Utility-first CSS framework

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

**Last Updated:** 2025-10-09  
**Maintained By:** Development Team  
**Status:** Active

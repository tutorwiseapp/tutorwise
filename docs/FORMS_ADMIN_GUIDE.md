# Forms Admin UI - User Guide

## Overview

The Forms Admin UI allows administrators to manage dynamic form configurations without requiring code changes or deployments. You can update field labels, placeholders, help text, and dropdown options for all forms across the platform.

## Accessing the Forms Admin

1. Log in as an admin user
2. Navigate to the Admin Dashboard
3. Click on **"Forms"** in the left sidebar (located before Settings)

## Features

### 1. Context Selection

Use the tabs at the top to switch between different form contexts:

- **Tutor Onboarding** - Forms for tutors during onboarding
- **Agent Onboarding** - Forms for agents during onboarding
- **Client Onboarding** - Forms for clients during onboarding
- **Account Forms** - User account management forms
- **Organisation** - Organisation-related forms

### 2. Field Management

#### Viewing Fields

- The left panel shows all available fields for the selected context
- Use the search bar to filter fields by name
- Click on a field name to view and edit its configuration

#### Editing Field Metadata

For each field, you can edit:

- **Field Label** - The label displayed above the field
- **Placeholder** - Placeholder text shown in the input
- **Help Text** - Optional help text displayed below the field

After making changes, click **"Save Changes"** to apply them.

### 3. Managing Dropdown Options

For fields with dropdown options (select fields, multi-select fields):

#### Adding New Options

1. Click the **"+ Add Option"** button
2. Enter the **Option Value** (internal value stored in database)
3. Enter the **Option Label** (text displayed to users)
4. Click **"Add"**

#### Editing Options

1. Click the edit icon (✏️) next to an option
2. Modify the value and/or label
3. Click **"Save"**

#### Deactivating Options

1. Click the delete icon (🗑️) next to an option
2. Confirm the action

**Note:** Deactivating an option performs a "soft delete" - it won't appear in forms but existing data is preserved.

### 4. Statistics

The right sidebar shows:

- **Total Fields** - Number of fields in the current context
- **Active Options** - Number of active dropdown options

## How Changes Work

### Immediate Effect

All changes take effect **immediately** across the platform:

- No code deployment required
- No server restart needed
- Changes are visible to all users instantly

### Fallback System

The system has built-in fallbacks:

- If database configuration fails to load, hardcoded defaults are used
- This ensures forms continue working even if there are database issues
- The app never breaks due to form configuration changes

## Best Practices

### 1. Field Labels

- Keep labels concise and descriptive
- Use title case (e.g., "First Name", "Date of Birth")
- Be consistent across similar fields

### 2. Placeholders

- Use sentence case (e.g., "Enter your first name")
- Make them helpful and specific
- Don't repeat the label verbatim

### 3. Help Text

- Only add help text when additional context is needed
- Keep it brief (1-2 sentences)
- Explain what the field is for or how to fill it correctly

### 4. Dropdown Options

- Use consistent formatting across options
- Order options logically (alphabetically, by frequency, etc.)
- Consider adding an "Other" option for flexibility

### 5. Testing Changes

After making changes:

1. Navigate to the relevant form in the app
2. Verify the changes appear correctly
3. Test form submission to ensure functionality

## Common Use Cases

### Adding a New Subject

1. Go to the context (e.g., "Tutor Onboarding")
2. Select the "subjects" field
3. Click "+ Add Option"
4. Enter subject name for both value and label (e.g., "Physics")
5. Click "Add"

### Changing Field Label

1. Select the field
2. Update the "Field Label" input
3. Click "Save Changes"

### Deactivating Outdated Options

1. Select the field with the option
2. Find the option in the list
3. Click the delete icon (🗑️)
4. Confirm the action

## Database Schema

The form configurations are stored in the `form_config` table:

### Row Types

- **field_meta** - Stores field labels, placeholders, help text
- **option** - Stores individual dropdown options

### Key Fields

- `field_name` - The form field identifier
- `context` - The form context (e.g., "onboarding.tutor")
- `display_order` - Order of options in dropdown
- `is_active` - Whether the option is active

## Troubleshooting

### Changes Not Appearing

1. **Hard refresh** the page (Cmd+Shift+R or Ctrl+Shift+F5)
2. Check if you're in the correct context
3. Verify the field name matches the form field

### Fields Not Loading

1. Click the "Refresh" button in the top right
2. Check browser console for errors
3. Verify database connection is working

### Options Out of Order

Options are ordered by `display_order` in the database. Currently, the UI doesn't support drag-and-drop reordering, but you can use the database directly to update `display_order` values.

## Technical Details

### API Functions

Located in `/apps/web/src/lib/api/formConfig.ts`:

- `fetchAllFormConfigs()` - Get all configurations
- `fetchFieldConfig()` - Get config for specific field
- `updateFieldMeta()` - Update field metadata
- `addFieldOption()` - Add new dropdown option
- `updateFieldOption()` - Update existing option
- `deleteFieldOption()` - Soft delete option

### React Hook

Located in `/apps/web/src/hooks/useFormConfig.ts`:

- `useFormConfig()` - Fetch single field config
- `useFormConfigs()` - Fetch multiple field configs (batch)

### Components Using Dynamic Config

All onboarding and account form components use the `useFormConfig` hook to fetch their configurations dynamically.

## Future Enhancements

Potential features for future versions:

1. **Drag-and-drop reordering** for dropdown options
2. **Bulk import/export** of configurations
3. **Change history** and audit log
4. **Field validation rules** configuration
5. **Multi-language support** for labels and options
6. **A/B testing** for different field configurations

## Support

For issues or questions:

1. Check the Help widget in the right sidebar
2. Review this documentation
3. Contact the development team
4. File an issue in the project repository

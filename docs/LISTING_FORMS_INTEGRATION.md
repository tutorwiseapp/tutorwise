# Listing Forms Integration with Shared Fields

## Overview
This document describes the integration of Create Listing forms (Tutor/Agent/Client) with the shared fields configuration system, allowing admins to manage listing form options via `/admin/configurations`.

## Changes Made

### 1. Database Migration (172_add_listing_shared_fields.sql)

Created a new migration that adds:

#### New Shared Fields
- `sessionDuration` - Multiselect with 13 duration options (30 min to 9+ hours)
- `serviceType` - Multiselect with 4 service types (one-to-one, group-session, workshop, study-package)
- `category` - Select with 7 categories (Mathematics, English, Science, etc.)
- `packageType` - Select with 3 package types (PDF, Video, Bundle)
- `aiTools` - Multiselect with 9 AI tools (ChatGPT, Claude, etc.)
- `deliveryMode` - Select with 3 delivery modes (Online, In-Person, Hybrid)
- Text/Textarea fields: `title`, `description`, `hourlyRate`, `locationDetails`, `cancellationPolicy`, `speakerBio`, `eventAgenda`, `materialUrl`

#### New Form Contexts
1. **listing.tutor** - 16 fields for tutor listing creation
   - Required: serviceType, title, description, category, subjects, hourlyRate
   - Optional: keyStages, sessionDuration, deliveryMode, locationDetails, aiTools, cancellationPolicy, packageType, materialUrl, speakerBio, eventAgenda

2. **listing.agent** - 12 fields for agent listing creation
   - Required: serviceType, title, description, category, hourlyRate
   - Optional: subjects, keyStages, sessionDuration, deliveryMode, locationDetails, services, cancellationPolicy

3. **listing.client** - 8 fields for client request creation
   - Required: title, description, subjects, educationLevel
   - Optional: sessionDuration, deliveryMode, learningGoals, specialNeeds

### 2. CreateListings Component Updates

**File**: [apps/web/src/app/components/feature/listings/wizard-steps/CreateListings.tsx](apps/web/src/app/components/feature/listings/wizard-steps/CreateListings.tsx)

#### Key Changes:
1. **Added React Query integration**
   - Import `useQuery` from `@tanstack/react-query`
   - Import `fetchFieldsForContext` from sharedFields API

2. **Dynamic context selection**
   - Determines listing context based on active user role (listing.tutor, listing.agent, listing.client)
   - Fetches field configurations for the appropriate context

3. **Replaced hardcoded options arrays**
   - ❌ Removed: All hardcoded `SUBJECT_OPTIONS`, `LEVEL_OPTIONS`, `AI_TOOLS_OPTIONS`, etc.
   - ✅ Added: Dynamic fetching from shared_fields API using `getOptionsFromField()` helper

4. **Added loading states**
   - Shows "Loading form configuration..." while fetching field options
   - Prevents form rendering until minimum required options are loaded

5. **Helper function**
   ```typescript
   function getOptionsFromField(field: any): Array<{ value: string | number; label: string }> {
     if (!field?.shared_fields?.options) return [];
     return field.shared_fields.options.map((opt: any) => ({
       value: opt.value,
       label: opt.label,
     }));
   }
   ```

## How It Works

### Before Integration (Old Flow)
1. Tutor/Agent creates a listing
2. Form displays hardcoded dropdown options
3. Admin cannot modify options without code changes
4. Options are inconsistent across forms

### After Integration (New Flow)
1. Tutor/Agent creates a listing
2. Component determines user role → selects context (listing.tutor, listing.agent, listing.client)
3. Fetches field configurations from shared_fields API
4. Dynamically populates dropdowns with options from database
5. Admin can modify options via `/admin/configurations`
6. Changes apply immediately without code deployment

## Admin Configuration Flow

1. Admin navigates to `/admin/configurations`
2. Selects a field (e.g., "subjects", "sessionDuration", "serviceType")
3. Modifies options (add, edit, delete, reorder)
4. Changes are saved to `shared_fields` table
5. Create Listing forms automatically reflect changes on next page load (cached by React Query)

## Benefits

1. **Centralized Management**: All form options managed in one place
2. **Consistency**: Same options across onboarding, account, and listing forms
3. **Dynamic Updates**: No code deployment needed to update options
4. **Context-Aware**: Different contexts can have different field configurations
5. **Role-Based**: Tutor, Agent, and Client see appropriate fields for their role

## Next Steps

### 1. Run Migration
```bash
# Connect to Supabase SQL Editor and run:
/Users/michaelquan/projects/tutorwise/tools/database/migrations/172_add_listing_shared_fields.sql
```

### 2. Verify Data
```sql
-- Check listing fields created
SELECT COUNT(*) FROM shared_fields
WHERE field_name IN ('sessionDuration', 'serviceType', 'category', 'packageType', 'aiTools', 'deliveryMode');

-- Check form_context_fields for listing contexts
SELECT context, COUNT(*) as field_count
FROM form_context_fields
WHERE context LIKE 'listing.%'
GROUP BY context
ORDER BY context;

-- View all listing fields for tutor context
SELECT
  fcf.context,
  sf.field_name,
  sf.label,
  sf.field_type,
  fcf.is_required,
  fcf.is_enabled,
  fcf.display_order
FROM form_context_fields fcf
JOIN shared_fields sf ON fcf.shared_field_id = sf.id
WHERE fcf.context = 'listing.tutor'
ORDER BY fcf.display_order;
```

### 3. Test Create Listing Form
1. Navigate to `/create-listing` as a Tutor
2. Verify all dropdowns populate with options from database
3. Try selecting different service types
4. Verify form validation works
5. Submit a test listing

### 4. Test Admin Configuration
1. Navigate to `/admin/configurations`
2. Find "sessionDuration" field
3. Add a new duration option (e.g., "15 minutes")
4. Save changes
5. Refresh Create Listing page
6. Verify new option appears in Session Duration dropdown

## Potential Issues and Solutions

### Issue 1: Empty Dropdown Options
**Symptom**: Dropdowns show no options or "Select..." placeholder only

**Causes**:
- Migration 172 not yet run
- RLS policies blocking access
- User not authenticated

**Solution**:
```sql
-- Check if migration ran successfully
SELECT COUNT(*) FROM shared_fields WHERE field_name = 'sessionDuration';

-- Check RLS policies
SELECT * FROM profiles WHERE id = auth.uid();

-- Verify field_name matches exactly
SELECT field_name FROM shared_fields WHERE field_name LIKE '%session%';
```

### Issue 2: Options Not Updating
**Symptom**: Admin changes options but Create Listing form still shows old options

**Causes**:
- React Query cache not invalidated
- Browser cache

**Solution**:
- Hard refresh (Cmd+Shift+R)
- Clear browser cache
- Add cache invalidation after save

### Issue 3: Wrong Context Selected
**Symptom**: Tutor sees Agent fields or vice versa

**Causes**:
- `activeRole` not set correctly
- User has multiple roles

**Solution**:
```typescript
// Debug log to check active role
console.log('Active Role:', activeRole, 'Context:', listingContext);
```

## Related Files

- [Migration 172](tools/database/migrations/172_add_listing_shared_fields.sql)
- [CreateListings Component](apps/web/src/app/components/feature/listings/wizard-steps/CreateListings.tsx)
- [sharedFields API](apps/web/src/lib/api/sharedFields.ts)
- [Admin Configurations Page](apps/web/src/app/(admin)/admin/configurations/page.tsx)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Configurations                       │
│                  /admin/configurations                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Field Management UI                                 │    │
│  │  - Select field (subjects, sessionDuration, etc.)    │    │
│  │  - Edit options (add, remove, reorder)               │    │
│  │  - Save changes to database                          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Saves to
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Tables                             │
│                                                               │
│  ┌──────────────────────┐    ┌──────────────────────────┐   │
│  │  shared_fields       │    │  form_context_fields     │   │
│  ├──────────────────────┤    ├──────────────────────────┤   │
│  │  - field_name        │    │  - context               │   │
│  │  - field_type        │    │  - shared_field_id (FK)  │   │
│  │  - options (jsonb)   │    │  - is_required           │   │
│  │  - label             │    │  - is_enabled            │   │
│  │  - placeholder       │    │  - display_order         │   │
│  └──────────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Fetches from
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              sharedFields API (Client-side)                  │
│                                                               │
│  fetchFieldsForContext('listing.tutor')                      │
│  - Queries form_context_fields JOIN shared_fields            │
│  - Returns fields with options for specific context          │
│  - Cached by React Query                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Used by
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Create Listing Form                            │
│                  /create-listing                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  CreateListings Component                            │    │
│  │  - Detects user role → selects context              │    │
│  │  - Fetches field configs via useQuery                │    │
│  │  - Extracts options with getOptionsFromField()       │    │
│  │  - Populates dropdowns dynamically                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Summary

The Create Listing forms are now fully integrated with the shared fields configuration system. Admins can manage all listing form options via `/admin/configurations`, and changes apply across all user roles (Tutor, Agent, Client) according to their respective contexts. This provides a consistent, maintainable, and flexible form management system.

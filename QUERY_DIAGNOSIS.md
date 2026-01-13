# Configuration Query Issues Diagnosis

## Issues Identified

### 1. RLS Policy Restriction
**Location**: `tools/database/migrations/170_create_shared_fields_tables.sql:145`

```sql
CREATE POLICY "Allow authenticated users to read form context fields"
  ON form_context_fields
  FOR SELECT
  TO authenticated
  USING (is_enabled = true);
```

**Problem**: This policy restricts regular authenticated users to only see enabled fields (`is_enabled = true`). While there's a separate admin policy that should override this, the RLS system evaluates policies with OR logic - if ANY policy grants access, the row is visible.

**Impact**:
- When admins query `form_context_fields`, they should see ALL fields (enabled and disabled)
- The current `.eq('is_enabled', true)` filter has been removed from `fetchFieldsForContext`
- But the RLS policy still restricts non-admin users

**Fix Needed**: The RLS policy for regular users is correct (they should only see enabled fields). The admin policy should work correctly for admins. However, we need to verify the user making the request has admin_role set.

### 2. fetchFieldsForContext Query
**Location**: `apps/web/src/lib/api/sharedFields.ts:310-336`

**Current Query**:
```typescript
const { data, error } = await supabase
  .from('form_context_fields')
  .select(`
    id,
    custom_label,
    custom_placeholder,
    custom_help_text,
    is_required,
    is_enabled,
    display_order,
    shared_fields:shared_field_id (
      id,
      field_name,
      field_type,
      label,
      placeholder,
      help_text,
      options,
      validation_rules,
      is_active,
      created_at,
      updated_at
    )
  `)
  .eq('context', context)
  .order('display_order', { ascending: true });
```

**Issue**: The `.eq('is_enabled', true)` filter was recently removed. This is CORRECT for admins who need to manage all fields. However, the RLS policy should handle the filtering for non-admins.

**What's Working**:
- Query structure is correct
- JOIN with shared_fields is correct
- Options are included in the select

### 3. Context Names
**Location**: `apps/web/src/app/(admin)/admin/forms/fields/page.tsx:55-65`

Contexts defined:
- `onboarding.tutor`
- `onboarding.agent`
- `onboarding.client`
- `account.tutor`
- `account.agent`
- `account.client`
- `organisation.tutor`
- `organisation.agent`
- `organisation.client`

**Status**: ✅ Correct - matches migration data

### 4. Options Display Issue
**Observed**: In the screenshot, the Options section shows options correctly for the "status" field when viewing "All Fields"

**Potential Issues**:
1. When switching to a context-specific view, the `selectedField` state might not be properly updated with the new data structure
2. The `contextFields` data might be missing the `options` field due to the nested query structure
3. The RLS policy might be preventing the query from returning all necessary data

## Recommended Fixes

### Fix 1: Add Debug Logging
Add console logging to trace the actual data being fetched:

```typescript
const { data: contextFields = [] } = useQuery({
  queryKey: ['context-fields', selectedContext],
  queryFn: async () => {
    const result = await fetchFieldsForContext(selectedContext);
    console.log('Context fields fetched:', { selectedContext, count: result.length, sample: result[0] });
    return result;
  },
  enabled: selectedContext !== 'all',
});
```

### Fix 2: Verify Admin Role
Ensure the current user has an admin role:

```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('profiles')
  .select('admin_role')
  .eq('id', user.id)
  .single();

console.log('User admin role:', profile?.admin_role);
```

### Fix 3: Check RLS Policy Evaluation
The RLS policies should be evaluated as:
- If user has admin_role: Show ALL rows (both enabled and disabled)
- If user is regular authenticated: Show only enabled rows

This should work correctly because both policies use FOR SELECT and the OR logic should allow admins to see all rows.

### Fix 4: Verify Options are Present
When viewing a field in context-specific view, log the selectedField to verify options are present:

```typescript
useEffect(() => {
  if (selectedField && selectedContext !== 'all') {
    console.log('Selected field in context view:', {
      fieldName: selectedField.field_name,
      fieldType: selectedField.field_type,
      optionsCount: selectedField.options?.length,
      options: selectedField.options,
    });
  }
}, [selectedField, selectedContext]);
```

## Testing Steps

1. Check browser console for any Supabase errors
2. Verify the user's admin_role in the database
3. Test fetching fields for a specific context and inspect the returned data
4. Verify options array is present in the returned data
5. Check if the issue occurs only in context-specific view or also in "All Fields" view

## Expected Behavior

- **All Fields view**: Shows all shared_fields with their global options
- **Context-specific view**: Shows form_context_fields joined with shared_fields, including all global options
- **Admins**: Can see both enabled and disabled fields
- **Regular users**: Can only see enabled fields

## Next Steps

1. Add debug logging to `fetchFieldsForContext`
2. Check browser console for errors
3. Verify user has admin role in database
4. Test the query directly in Supabase SQL editor to isolate the issue

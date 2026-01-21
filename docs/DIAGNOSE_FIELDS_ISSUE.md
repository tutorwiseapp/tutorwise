# Diagnose Fields Issue - No Data Showing

## Problem
When selecting "All Fields", the UI shows:
- "No fields found"
- 0 Total Fields
- 0 Total Options

## Potential Causes

### 1. Migrations Not Applied
The shared_fields tables may not exist in the database.

**Check:**
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM shared_fields;
SELECT COUNT(*) FROM form_context_fields;
```

**Fix:**
Run migrations 170 and 171:
- `170_create_shared_fields_tables.sql`
- `171_migrate_form_config_to_shared_fields.sql`

### 2. RLS Policies Blocking Access
The RLS policy requires user to be authenticated and have admin_role.

**Check:**
```sql
-- Verify your user has admin role
SELECT id, email, admin_role
FROM profiles
WHERE id = auth.uid();
```

**Fix:**
If admin_role is NULL, update it:
```sql
UPDATE profiles
SET admin_role = 'superadmin'
WHERE id = auth.uid();
```

### 3. No Data in Table
Migration 171 pulls data from `form_config` table. If `form_config` is empty, shared_fields will be empty.

**Check:**
```sql
-- Check if form_config has data
SELECT COUNT(*) FROM form_config WHERE config_type = 'option';

-- Check if shared_fields has data
SELECT id, field_name, field_type, label FROM shared_fields;
```

**Fix:**
If form_config is empty, you need to seed it first, or manually insert shared_fields:
```sql
-- Example: Insert subjects field
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'subjects',
  'multiselect',
  'Subjects',
  'Select subjects',
  '[
    {"value": "english", "label": "English"},
    {"value": "maths", "label": "Maths"},
    {"value": "science", "label": "Science"}
  ]'::jsonb
);

-- Example: Insert status field
INSERT INTO shared_fields (field_name, field_type, label, placeholder, options)
VALUES (
  'status',
  'select',
  'Status',
  'Select status',
  '[
    {"value": "professional_tutor", "label": "Professional Tutor"},
    {"value": "part_time_tutor", "label": "Part-time Tutor"}
  ]'::jsonb
);
```

### 4. Network/API Error
Check browser console for API errors.

**Check:**
Open browser DevTools (F12) → Console tab
Look for:
- `[fetchSharedFields] Starting query...`
- Any red error messages
- Network tab → Check XHR/Fetch requests to Supabase

## Quick Diagnostic Steps

1. **Open browser console** (F12)
2. **Refresh the page**
3. **Look for console logs** starting with `[fetchSharedFields]`
4. **Check Network tab** for failed requests
5. **Go to Supabase SQL Editor** and run:
   ```sql
   -- Check if table exists
   SELECT COUNT(*) FROM shared_fields;

   -- Check your admin role
   SELECT admin_role FROM profiles WHERE id = auth.uid();
   ```

## Expected Console Output (Success)
```
[fetchSharedFields] Starting query...
[fetchSharedFields] Success: { count: 15, fields: [...] }
```

## Expected Console Output (Error)
```
[fetchSharedFields] Starting query...
[fetchSharedFields] Error: { code: '42P01', message: 'relation "shared_fields" does not exist' }
```
or
```
[fetchSharedFields] Starting query...
[fetchSharedFields] Success: { count: 0, fields: [] }
```

## Next Steps Based on Results

### If "relation does not exist"
→ Run migration 170 to create the tables

### If count = 0 but no error
→ Run migration 171 to populate data from form_config
→ OR manually insert test data using SQL above

### If RLS policy blocks it
→ Update your profile to add admin_role

### If other error
→ Share the exact error message for further diagnosis

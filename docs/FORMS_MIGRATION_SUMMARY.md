# Forms Configuration System - Migration Summary

## Date: 2026-01-12

## Migrations Applied ✅

All 4 migrations have been successfully applied to the production database:

### 1. Migration 164: Create form_config Table
**File:** `tools/database/migrations/164_create_form_config_table.sql`

**Created:**
- `form_config` table with columns for field metadata and options
- Indexes for efficient lookups (`idx_form_config_lookup`, `idx_form_config_order`)
- Automatic `updated_at` timestamp trigger
- Row Level Security (RLS) policies:
  - **Read policy**: All authenticated users can read active configs
  - **Admin policy**: Users with `admin_role` can INSERT/UPDATE/DELETE

**Key Structure:**
- `config_type`: `'field_meta'` or `'option'`
- `field_name`: Field identifier (e.g., `'subjects'`, `'gender'`)
- `context`: Form context (e.g., `'onboarding.tutor'`, `'account'`)
- `display_order`: Order of options in dropdowns
- `is_active`: Soft delete flag

### 2. Migration 165: Seed Professional Details
**File:** `tools/database/migrations/165_seed_form_config_professional_details.sql`

**Seeded:** Professional Details step for all 3 onboarding roles:
- Tutor: 13 fields including subjects, qualifications, key stages, etc.
- Agent: 13 fields (same structure as tutor)
- Client: 13 fields (learner-focused labels)

**Field count:** ~39 metadata rows + ~180 option rows

### 3. Migration 166: Seed All Onboarding Steps
**File:** `tools/database/migrations/166_seed_form_config_all_onboarding_steps.sql`

**Seeded:** Personal Info, Verification, and Availability steps for all 3 roles:
- Personal Info: `gender`, `firstName`, `lastName`, `dateOfBirth`, `email`, `phone`
- Verification: `proof_of_address_type` (Utility Bill, Bank Statement, etc.)
- Availability: `availabilityDays`, `availabilityTimes`

**Field count:** ~66 metadata rows + ~162 option rows

### 4. Migration 167: Seed Account Forms
**File:** `tools/database/migrations/167_seed_form_config_account_forms.sql`

**Seeded:** Account management form configurations:
- Common fields: `gender`, `firstName`, `lastName`, `dateOfBirth`, `email`, `phone`
- Professional fields: `status`, `subjects`, `keyStages`, `qualifications`, etc.
- Client-specific: `learnerFirstName`, `learnerLastName`, `learnerDateOfBirth`, `learnerGender`

**Field count:** 17 metadata rows + 85 option rows

## Database Statistics

After all migrations:

| Context            | Total Rows | Unique Fields | Metadata Rows | Option Rows |
|--------------------|------------|---------------|---------------|-------------|
| onboarding.tutor   | 76         | 22            | 22            | 54          |
| onboarding.agent   | 76         | 22            | 22            | 54          |
| onboarding.client  | 79         | 22            | 22            | 57          |
| account            | 102        | 17            | 17            | 85          |
| **TOTAL**          | **333**    | **83**        | **83**        | **250**     |

**Note:** `organisation.tutor` context is defined in migration 165 but not yet seeded with data.

## Sample Data Verification

Example: `subjects` field in `onboarding.tutor` context:

```
config_type | field_label | field_placeholder | option_value | option_label | display_order | is_active
------------|-------------|-------------------|--------------|--------------|---------------|----------
field_meta  | Subjects    | Select subjects   |              |              | 0             | true
option      |             |                   | Mathematics  | Mathematics  | 0             | true
option      |             |                   | English      | English      | 1             | true
option      |             |                   | Science      | Science      | 2             | true
option      |             |                   | Physics      | Physics      | 3             | true
option      |             |                   | Chemistry    | Chemistry    | 4             | true
... (and more subjects)
```

## Row Level Security (RLS)

### Policy 1: Read Access (All Authenticated Users)
```sql
CREATE POLICY "Allow authenticated users to read form config"
  ON form_config
  FOR SELECT
  TO authenticated
  USING (is_active = true);
```

**Purpose:** Allow all logged-in users to fetch form configurations for rendering forms.

### Policy 2: Admin Management (Admin Users Only)
```sql
CREATE POLICY "Allow admins to manage form config"
  ON form_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IS NOT NULL
    )
  );
```

**Purpose:** Only users with `admin_role` set (superadmin, admin, systemadmin, supportadmin) can INSERT/UPDATE/DELETE form configurations.

## Components Updated

The following components now use `useFormConfig` hook to fetch dynamic configurations:

### Onboarding Components (12 files)
1. `TutorPersonalInfoStep.tsx` - gender field
2. `TutorProfessionalDetailStep.tsx` - 13 fields
3. `TutorProfessionalVerificationStep.tsx` - proof_of_address_type
4. `TutorAvailabilityStep.tsx` - availabilityDays, availabilityTimes
5. `AgentPersonalInfoStep.tsx` - gender field
6. `AgentProfessionalDetailStep.tsx` - 13 fields
7. `AgentProfessionalVerificationStep.tsx` - proof_of_address_type
8. `AgentAvailabilityStep.tsx` - availabilityDays, availabilityTimes
9. `ClientPersonalInfoStep.tsx` - gender field
10. `ClientProfessionalDetailStep.tsx` - 13 fields
11. `ClientProfessionalVerificationStep.tsx` - proof_of_address_type
12. `ClientAvailabilityStep.tsx` - availabilityDays, availabilityTimes

### Account Components (2 files)
13. `PersonalInfoForm.tsx` - gender field
14. `ProfessionalInfoForm.tsx` - 16 fields (tutor + client sections)

## Admin UI Access

The Forms Admin UI is now accessible at:

**URL:** `/admin/forms`

**Navigation:** Admin Dashboard → Forms (in left sidebar, before Settings)

**Permissions:** Only users with `admin_role IS NOT NULL` in profiles table

## Testing Checklist

- [x] Database migrations applied successfully
- [x] Data seeded correctly (333 total rows)
- [x] RLS policies created and verified
- [ ] Admin UI loads at `/admin/forms`
- [ ] Can select fields and view configurations
- [ ] Can edit field metadata (label, placeholder, help text)
- [ ] Can add new dropdown options
- [ ] Can edit existing options
- [ ] Can deactivate options
- [ ] Changes reflect in onboarding forms
- [ ] Changes reflect in account forms

## Rollback Plan (If Needed)

If you need to rollback the migrations:

```sql
-- Drop RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read form config" ON form_config;
DROP POLICY IF EXISTS "Allow admins to manage form config" ON form_config;

-- Drop table (WARNING: This deletes all data)
DROP TABLE IF EXISTS form_config CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_modified_column() CASCADE;
```

**Note:** This will remove all form configurations. Components will fall back to hardcoded defaults.

## Next Steps

1. **Test the Admin UI** - Navigate to `/admin/forms` and verify all functionality
2. **Test Form Changes** - Make a change in admin UI and verify it appears in forms
3. **Add Organisation Context** - Seed data for `organisation.tutor` context if needed
4. **Monitor Performance** - Watch query performance with indexes
5. **Add Enhancements** - Consider drag-and-drop reordering, bulk import/export, etc.

## Support & Documentation

- **User Guide:** `docs/FORMS_ADMIN_GUIDE.md`
- **API Functions:** `apps/web/src/lib/api/formConfig.ts`
- **React Hook:** `apps/web/src/hooks/useFormConfig.ts`
- **Admin UI:** `apps/web/src/app/(admin)/admin/forms/page.tsx`

## Notes

- All changes are immediate (no deployment needed)
- Fallback system ensures forms work even if database fails
- Soft deletes preserve data integrity
- Display order can be manually adjusted in database if needed
- Consider adding audit log for tracking changes in future

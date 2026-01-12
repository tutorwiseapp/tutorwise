# Forms Configuration System - Migrations 168 & 169

## Date: 2026-01-12

## Overview

Added support for role-specific Organisation and Account contexts, expanding the Forms Admin UI from 5 contexts to 9 contexts.

## Migrations Applied

### Migration 168: Seed Organisation Forms
**File:** `tools/database/migrations/168_seed_form_config_organisation_forms.sql`

**Purpose:** Create organisation contexts for tutor, agent, and client with the same fields as onboarding contexts (since they haven't been customized yet).

**Contexts seeded:**
- `organisation.tutor` - 13 fields with ~54 options
- `organisation.agent` - 13 fields with ~54 options
- `organisation.client` - 13 fields with ~57 options

**Total rows added:** ~228 rows (78 metadata + 150 options)

### Migration 169: Seed Account Role-Specific Forms
**File:** `tools/database/migrations/169_seed_form_config_account_role_specific.sql`

**Purpose:** Split the generic `account` context into role-specific contexts (account.tutor, account.agent, account.client).

**Contexts seeded:**
- `account.tutor` - 13 tutor-specific fields
- `account.agent` - 13 agent-specific fields
- `account.client` - 9 client-specific fields (includes learningGoals, specialNeeds, etc.)

**Total rows added:** ~290 rows (35 metadata + 255 options)

## Forms Admin UI Updates

### File: `apps/web/src/app/(admin)/admin/forms/page.tsx`

**Changes:**
1. **Updated ContextFilter type** to include all 9 contexts:
   ```typescript
   type ContextFilter =
     | 'onboarding.tutor'
     | 'onboarding.agent'
     | 'onboarding.client'
     | 'account.tutor'
     | 'account.agent'
     | 'account.client'
     | 'organisation.tutor'
     | 'organisation.agent'
     | 'organisation.client';
   ```

2. **Updated context tabs** with clear naming:
   - Tutor Onboarding
   - Agent Onboarding
   - Client Onboarding
   - Tutor Account
   - Agent Account
   - Client Account
   - Tutor Organisation
   - Agent Organisation
   - Client Organisation

## Context Structure Summary

### Onboarding Contexts (existing, unchanged)
- `onboarding.tutor` - 22 fields
- `onboarding.agent` - 22 fields
- `onboarding.client` - 22 fields

### Account Contexts (new, role-specific)
- `account.tutor` - Professional tutor account fields
- `account.agent` - Professional agent account fields
- `account.client` - Client-specific learning preferences and needs

### Organisation Contexts (new, mirrors onboarding)
- `organisation.tutor` - Same fields as onboarding.tutor
- `organisation.agent` - Same fields as onboarding.agent
- `organisation.client` - Same fields as onboarding.client

## Total Database Statistics (After Migrations 168 & 169)

| Context Type | Contexts | Metadata Rows | Option Rows | Total Rows |
|--------------|----------|---------------|-------------|------------|
| Onboarding   | 3        | 66            | ~162        | ~228       |
| Account      | 4*       | 52            | ~340        | ~392       |
| Organisation | 3        | 39            | ~165        | ~204       |
| **TOTAL**    | **10**   | **157**       | **667**     | **824**    |

*Includes the old generic `account` context which can be deprecated in future

## Field Differences by Role

### Tutor & Agent (Similar Structure)
- Professional status
- Academic qualifications
- Teaching professional qualifications
- Teaching/tutoring experience
- Key stages
- Subjects
- Session types
- Delivery modes
- Rates (tutor/agent specific)

### Client (Different Structure)
- Learning goals
- Learning preferences
- Special educational needs
- Sessions per week
- Session duration
- Preferred tutor qualifications (optional)
- Education level
- Subjects needed

## Next Steps

1. **Apply migrations to production database**
   ```bash
   # Run migration 168
   psql $DATABASE_URL -f tools/database/migrations/168_seed_form_config_organisation_forms.sql

   # Run migration 169
   psql $DATABASE_URL -f tools/database/migrations/169_seed_form_config_account_role_specific.sql
   ```

2. **Update account form components** to use role-specific contexts:
   - `PersonalInfoForm.tsx` - Update context from `'account'` to `'account.tutor'`/`'account.agent'`/`'account.client'`
   - `ProfessionalInfoForm.tsx` - Same update needed

3. **Test all contexts** in Forms Admin UI:
   - Navigate to `/admin/forms`
   - Switch between all 9 tabs
   - Verify field counts and options load correctly

4. **Deprecate generic 'account' context** (optional, future work):
   - Once all components use role-specific contexts
   - Can soft-delete rows with `context = 'account'`

## Migration Verification

After applying migrations, verify with:

```sql
-- Count rows by context
SELECT context, COUNT(*) as total_rows
FROM form_config
WHERE is_active = true
GROUP BY context
ORDER BY context;

-- Verify all 9 contexts exist
SELECT DISTINCT context
FROM form_config
WHERE is_active = true
ORDER BY context;

-- Expected output:
-- account.agent
-- account.client
-- account.tutor
-- onboarding.agent
-- onboarding.client
-- onboarding.tutor
-- organisation.agent
-- organisation.client
-- organisation.tutor
```

## Rollback Plan

If needed, rollback migrations:

```sql
-- Rollback migration 169 (account role-specific)
DELETE FROM form_config WHERE context IN ('account.tutor', 'account.agent', 'account.client');

-- Rollback migration 168 (organisation)
DELETE FROM form_config WHERE context IN ('organisation.tutor', 'organisation.agent', 'organisation.client');
```

## Notes

- All new contexts use the same field structure as their onboarding counterparts
- Client contexts have additional fields specific to learning needs
- Organisation contexts are placeholders for future customization
- Forms Admin UI now supports 9 contexts with clear, role-specific naming
- No code deployment needed - changes are immediate in production after migration

## Files Modified

1. `tools/database/migrations/168_seed_form_config_organisation_forms.sql` (new)
2. `tools/database/migrations/169_seed_form_config_account_role_specific.sql` (new)
3. `apps/web/src/app/(admin)/admin/forms/page.tsx` (updated)
4. `docs/FORMS_MIGRATION_168_169_SUMMARY.md` (new, this file)

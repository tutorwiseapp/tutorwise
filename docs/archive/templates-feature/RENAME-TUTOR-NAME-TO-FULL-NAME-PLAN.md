# Rename tutor_name → full_name in Listings

## Problem Statement

We currently have TWO name fields:
- `profiles.full_name` - The person's full name
- `listings.tutor_name` - Also the person's full name (redundant naming)

This creates confusion and inconsistency. We should use `full_name` everywhere.

## Proposal

**Rename `listings.tutor_name` → `listings.full_name`**

## Benefits

1. ✅ **Consistency** - One naming convention across entire app
2. ✅ **Clarity** - Developers immediately understand what the field contains
3. ✅ **Simplicity** - No mental mapping between `tutor_name` and `full_name`
4. ✅ **Better Semantics** - It's literally the person's full name
5. ✅ **Easier Onboarding** - New developers don't need to learn two conventions

## Impact Analysis

### Files Affected (9 total):

**Database Migrations (4 files):**
1. `005_add_tutor_name_to_listings.sql` - Original column creation
2. `007_create_listing_templates_on_profile_creation.sql` - Template trigger
3. `008_backfill_listing_templates_for_existing_tutors.sql` - Template backfill
4. **NEW:** `009_rename_tutor_name_to_full_name.sql` - Rename migration

**TypeScript Types (2 files):**
5. `packages/shared-types/src/listing.ts` - Shared type definition
6. `apps/web/src/types/index.ts` - App-specific types

**React Components (2 files):**
7. `apps/web/src/app/components/listings/wizard-steps/Step1BasicInfo.tsx`
8. `apps/web/src/app/components/listings/CreateListingWizard.tsx`

**API & Services (1 file):**
9. `apps/web/src/lib/api/listings.ts`

**Display Components (1 file):**
10. `apps/web/src/app/components/marketplace/TutorCard.tsx`

## Migration Strategy

### Phase 1: Database Migration (Backward Compatible)

Create migration that:
1. Adds `full_name` column to `listings`
2. Copies data from `tutor_name` → `full_name`
3. Keeps `tutor_name` for backward compatibility (deprecated)
4. Updates index to use `full_name`

```sql
-- Migration 009: Rename tutor_name to full_name
ALTER TABLE listings ADD COLUMN IF NOT EXISTS full_name TEXT;
UPDATE listings SET full_name = tutor_name WHERE full_name IS NULL;
CREATE INDEX IF NOT EXISTS idx_listings_full_name ON listings(full_name);

-- Mark old column as deprecated (keep for now)
COMMENT ON COLUMN listings.tutor_name IS 'DEPRECATED: Use full_name instead. Will be removed in future version.';
COMMENT ON COLUMN listings.full_name IS 'Full name of the person providing the service';
```

### Phase 2: Update TypeScript Types

**Change in `shared-types`:**
```typescript
export interface CreateListingInput {
  // ... other fields
  full_name?: string;  // NEW
  tutor_name?: string; // DEPRECATED (for backward compatibility)
}
```

### Phase 3: Update React Components

**Priority order:**
1. `Step1BasicInfo.tsx` - User-facing form
2. `CreateListingWizard.tsx` - Wizard logic
3. `TutorCard.tsx` - Display component
4. `listings.ts` - API calls

**Pattern:**
```typescript
// Before:
formData.tutor_name

// After:
formData.full_name
```

### Phase 4: Update Database Triggers

Update the template creation triggers (007 & 008) to use `full_name` instead of `tutor_name`.

### Phase 5: Deprecation & Cleanup (Later)

After all code is updated:
```sql
-- Remove the old column
ALTER TABLE listings DROP COLUMN tutor_name;
```

## Alternative: Soft Transition

Instead of renaming, we could:
1. Add `full_name` column
2. Use database trigger to keep both synced
3. Gradually migrate code to use `full_name`
4. Eventually remove `tutor_name`

**Trigger to keep them synced:**
```sql
CREATE OR REPLACE FUNCTION sync_listing_names()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name IS NOT NULL THEN
    NEW.tutor_name := NEW.full_name;
  ELSIF NEW.tutor_name IS NOT NULL THEN
    NEW.full_name := NEW.tutor_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_sync_names
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_names();
```

## Recommended Approach

**Option 1: Full Rename (Clean, but requires coordination)**
- Single migration that renames column
- Update all code at once
- Deploy everything together
- Cleanest long-term solution

**Option 2: Gradual Migration (Safer, more complex)**
- Add `full_name` column alongside `tutor_name`
- Keep both synced with trigger
- Migrate code gradually
- Remove `tutor_name` in future release
- Better for production with active users

## Risk Assessment

### Low Risk:
- ✅ Not a user-facing breaking change (internal field name)
- ✅ Data migration is straightforward (just rename)
- ✅ Rollback is simple (just rename back)

### Medium Risk:
- ⚠️ Need to update 9 files (potential for mistakes)
- ⚠️ Need to coordinate database + code deployment

### Mitigation:
- Create comprehensive test suite
- Test on staging environment first
- Have rollback SQL ready
- Deploy during low-traffic window

## Implementation Checklist

### Database:
- [ ] Create migration 009 (add `full_name`, copy data)
- [ ] Update migration 007 (template trigger)
- [ ] Update migration 008 (template backfill)
- [ ] Test migrations on local database
- [ ] Test migrations on staging database

### Types:
- [ ] Update `packages/shared-types/src/listing.ts`
- [ ] Update `apps/web/src/types/index.ts`
- [ ] Run TypeScript compiler to catch errors

### Components:
- [ ] Update `Step1BasicInfo.tsx`
- [ ] Update `CreateListingWizard.tsx`
- [ ] Update `TutorCard.tsx`
- [ ] Update `listings.ts` API

### Testing:
- [ ] Test listing creation flow
- [ ] Test listing display (TutorCard)
- [ ] Test template creation for new tutors
- [ ] Test template backfill for existing tutors
- [ ] Verify no "Loading..." issues remain

### Deployment:
- [ ] Run migration on staging
- [ ] Deploy code to staging
- [ ] Test on staging
- [ ] Run migration on production
- [ ] Deploy code to production
- [ ] Monitor for issues

## Decision Required

**Which approach do you prefer?**

1. **Option 1: Full Rename** - Clean, requires careful coordination
2. **Option 2: Gradual Migration** - Safer, temporary duplication
3. **Option 3: Keep Current** - Just ensure consistency (always set from `profile.full_name`)

My recommendation: **Option 2 (Gradual Migration)** for production safety, or **Option 1 (Full Rename)** if you can coordinate a synchronized deployment.

---

**Ready to implement?** Let me know which option you prefer and I'll create the migration and update all files.

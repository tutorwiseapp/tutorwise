# Migration Numbering Cleanup Plan

**Created:** 2026-02-23
**Status:** 🔴 Action Required

## Issues Identified

### Critical: Duplicate Migration Numbers

Duplicate migration numbers can cause unpredictable behavior or skip migrations entirely.

#### Duplicate 269 (3 files)
```sql
269_create_lexi_knowledge_chunks.sql
269_create_system_user_for_curriculum.sql
269_sage_sessions_expires_at.sql
```

**Proposed Fix:**
```bash
# Keep the first one as 269
mv 269_create_system_user_for_curriculum.sql 278_create_system_user_for_curriculum.sql
mv 269_sage_sessions_expires_at.sql 279_sage_sessions_expires_at.sql
```

#### Duplicate 277 (2 files)
```sql
277_create_sage_pro_cron_jobs.sql
277_update_free_tier_storage_quota.sql
```

**Proposed Fix:**
```bash
# Keep the first one as 277
mv 277_update_free_tier_storage_quota.sql 280_update_free_tier_storage_quota.sql
```

#### Duplicate 302 (2 files)
```sql
302_add_ai_tutor_hybrid_search.sql
302_create_ai_tutor_functions.sql
```

**Proposed Fix:**
```bash
# Keep 302 for hybrid search, move functions to 303
mv 302_create_ai_tutor_functions.sql 303_create_ai_tutor_functions.sql
```

### Missing Migration Number

```sql
add-metrics-columns.sql  # No prefix!
```

**Proposed Fix:**
```bash
# Assign next available number
mv add-metrics-columns.sql 304_add_metrics_columns.sql
```

---

## Implementation Steps

### Step 1: Backup
```bash
cd tools/database/migrations
cp -r . ../migrations-backup-$(date +%Y%m%d)
```

### Step 2: Check Migration Status
```sql
-- Check which migrations have already run
SELECT * FROM supabase_migrations.schema_migrations
WHERE version IN ('269', '277', '302', 'add-metrics-columns')
ORDER BY version;
```

### Step 3: Rename Files (If Not Yet Applied)

If these migrations haven't run yet, rename them:

```bash
cd tools/database/migrations

# Fix duplicate 269
git mv 269_create_system_user_for_curriculum.sql 278_create_system_user_for_curriculum.sql
git mv 269_sage_sessions_expires_at.sql 279_sage_sessions_expires_at.sql

# Fix duplicate 277
git mv 277_update_free_tier_storage_quota.sql 280_update_free_tier_storage_quota.sql

# Fix duplicate 302
git mv 302_create_ai_tutor_functions.sql 303_create_ai_tutor_functions.sql

# Fix missing number
git mv add-metrics-columns.sql 304_add_metrics_columns.sql
```

### Step 4: Update Migration Tracker (If Already Applied)

If migrations have already run, update the tracker:

```sql
-- If the duplicate migrations already ran, record the new numbers
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
SELECT '278', statements, 'create_system_user_for_curriculum'
FROM supabase_migrations.schema_migrations
WHERE version = '269' AND name = 'create_system_user_for_curriculum';

-- Repeat for other duplicates...
```

### Step 5: Verify
```bash
# Check for any remaining issues
ls -1 *.sql | cut -d'_' -f1 | sort | uniq -d
# Should return nothing if all duplicates are fixed
```

---

## Gap 277→301 (Not an Issue)

The gap between 277 and 301 is **intentional**:
- **270-277:** Sage Pro & CAS features
- **278-300:** Reserved for future features (unused buffer)
- **301+:** AI Tutor Studio features

This is a common practice to group related migrations and leave room for patches.

---

## Priority

**High Priority** - Should be fixed before next deployment to avoid:
- ❌ Migrations running in wrong order
- ❌ Migrations being skipped
- ❌ Database schema inconsistencies

---

## Verification Checklist

After fixing:
- [ ] No duplicate migration numbers exist
- [ ] All SQL files have numeric prefixes
- [ ] Files renamed in git (preserving history)
- [ ] Migration tracker updated if needed
- [ ] Test migrations run successfully on dev database
- [ ] Document in changelog

---

## Related Files
- Migration directory: `tools/database/migrations/`
- Migration runner: `tools/database/run-migrations.mjs`
- Supabase config: `supabase/config.toml`

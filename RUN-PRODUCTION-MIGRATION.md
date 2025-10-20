# Running Production Migration - Step by Step

## Why You Don't See Templates Yet

The code is deployed to Vercel ✅, but the **database migrations haven't been run yet**.

The migrations create:
1. A database trigger to auto-generate templates for new tutors
2. 3 template listings for existing tutors

## 2-Step Process

### Step 1: Create Helper Function in Supabase (One-time)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir

2. **Click "SQL Editor"** in the left sidebar

3. **Paste this SQL** and click "Run":

```sql
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
```

4. **Verify it worked**: You should see "Success. No rows returned"

### Step 2: Run the Migration

Back in your terminal:

```bash
npm run migrate:listing-templates
```

**Expected Output:**
```
🚀 Starting Listing Templates Migration
═══════════════════════════════════════════════════════════

📄 Running migration: 007_create_listing_templates_on_profile_creation.sql
────────────────────────────────────────────────────────────
✅ Migration 007 completed successfully

📄 Running migration: 008_backfill_listing_templates_for_existing_tutors.sql
────────────────────────────────────────────────────────────
✅ Migration 008 completed successfully

═══════════════════════════════════════════════════════════
✅ All migrations completed successfully!

📋 What happened:
  1. ✅ Created database trigger for automatic template generation
  2. ✅ Backfilled templates for existing tutors

🎯 Impact:
  • New tutor profiles will automatically get 3 listing templates
  • Existing tutors now have templates ready to customize
  • Eliminates "Loading..." race condition in listing wizard
═══════════════════════════════════════════════════════════
```

## Step 3: Verify It Worked

1. **Refresh https://www.tutorwise.io/my-listings**
2. You should now see **3 draft listings**:
   - 📚 GCSE Mathematics Tutor
   - 📝 GCSE English Language & Literature Tutor
   - 🔬 GCSE Science Tutor

3. **Test the fix**: Click "Create Listing"
   - Full Name field should show **your name** (not "Loading...")

## Troubleshooting

### Error: "Could not find the function exec_sql"
**Solution**: You need to complete Step 1 first (create the helper function in Supabase SQL Editor)

### Error: "permission denied for function exec_sql"
**Solution**: Make sure you ran the GRANT statements in Step 1

### Still see "Loading..." after migration?
**Solution**:
1. Hard refresh the page (Cmd+Shift+R)
2. Check if templates were created: Go to Supabase → Table Editor → listings → Should see 3 draft listings
3. If no templates exist, check the migration logs for errors

### Templates created but "Loading..." still appears?
**Solution**: This shouldn't happen since templates have `tutor_name` populated, but if it does:
1. Check one of your draft listings in Supabase
2. Verify the `tutor_name` field is populated with your name
3. If empty, your profile might not have `full_name` set

## What These Migrations Do

### Migration 007: Create Trigger
Creates a PostgreSQL trigger that automatically runs when a new profile is inserted:
- Checks if `full_name` is set
- Checks if user is a tutor (`active_role = 'provider'`)
- Creates 3 draft listings with `tutor_name = full_name`

### Migration 008: Backfill Existing Tutors
One-time script that:
- Finds all existing tutors with `full_name` but no listings
- Creates 3 template listings for each
- Populates `tutor_name` from their `full_name`

## Quick Reference

**Supabase Dashboard**: https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir/editor

**Migration Command**: `npm run migrate:listing-templates`

**Verify Templates**:
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM listings WHERE status = 'draft';
-- Should return: 3 (or multiple of 3 if multiple tutors)
```

---

**Once complete**: The "Loading..." issue will be permanently resolved! 🎉

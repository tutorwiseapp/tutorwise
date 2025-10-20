# Quick Start: Testing Option 3 Locally

## Why You Don't See Templates Yet

The feature branch contains the **migration code** but the **migrations haven't been run** on your local database yet. You need to execute them.

## 2-Step Setup

### Step 1: Checkout Feature Branch & Run Migration

```bash
# Switch to the feature branch
git checkout feature/listing-templates-on-profile-creation

# Run the migration (creates trigger + backfills templates)
npm run migrate:listing-templates
```

**What this does:**
- Creates database trigger for auto-template creation
- Creates 3 draft templates for your existing tutor profile
- Templates will have your `full_name` as `tutor_name`

### Step 2: Refresh and Verify

1. **Refresh** http://localhost:3000/my-listings
2. You should now see **3 draft listings**:
   - GCSE Mathematics Tutor
   - GCSE English Language & Literature Tutor
   - GCSE Science Tutor

3. Click "Create Listing" and check the **Full Name field**:
   - Should show your name (no "Loading...")

## Expected Output from Migration

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

## Troubleshooting

### Error: "Missing environment variables"

**Fix**: Load your environment variables first:

```bash
# For bash/zsh
source .env.local

# OR set them manually
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"
```

### Error: "exec_sql function not found"

**Fix**: Your Supabase project needs the `exec_sql` function. Create it:

```sql
-- Run this in Supabase SQL Editor
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN json_build_object('success', true);
END;
$$;
```

### Still Don't See Templates After Migration?

**Check database directly:**

```bash
# Connect to your local Supabase
psql "your-connection-string"

# Count templates
SELECT COUNT(*) FROM listings WHERE status = 'draft';

# Should return: 3 (or multiple of 3 if multiple tutors)
```

## Alternative: Manual Setup Script

If you prefer an interactive script:

```bash
./setup-listing-templates.sh
```

This script will:
- ✅ Checkout the feature branch
- ✅ Verify environment variables
- ✅ Run migrations with confirmation
- ✅ Show next steps

## What Happens for New Tutors?

After running the migration, **any NEW tutor** who completes onboarding will automatically get 3 templates created. Test this by:

1. Creating a new user account
2. Completing tutor onboarding (must set full_name)
3. Navigating to `/my-listings`
4. **Result**: 3 templates already exist!

## Comparing Before/After

### Before Migration (Current State):
```
My Listings Page:
┌─────────────────────────────────┐
│  No listings yet                │
│  Create your first listing      │
└─────────────────────────────────┘

Create Listing Wizard:
Full Name: [Loading...]  ← Problem!
```

### After Migration (Option 3):
```
My Listings Page:
┌─────────────────────────────────┐
│  📚 GCSE Mathematics Tutor      │
│  📝 GCSE English Tutor          │
│  🔬 GCSE Science Tutor          │
│  (All drafts, ready to edit)    │
└─────────────────────────────────┘

Create Listing Wizard:
Full Name: [Your Name]  ← Fixed!
```

## Rolling Back (If Needed)

To remove templates and trigger:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS profiles_create_listing_templates ON profiles;

-- Drop function
DROP FUNCTION IF EXISTS create_default_listing_templates();

-- Delete template listings (careful!)
DELETE FROM listings
WHERE status = 'draft'
  AND title IN (
    'GCSE Mathematics Tutor - Experienced & Results-Focused',
    'GCSE English Language & Literature Tutor',
    'GCSE Science Tutor - Biology, Chemistry & Physics'
  );
```

---

**Ready to test?** Run the migration and refresh your browser! 🚀

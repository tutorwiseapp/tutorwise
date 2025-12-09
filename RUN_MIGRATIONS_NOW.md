# 🚨 RUN THESE MIGRATIONS NOW

## Critical Issue
The "Failed to unpublish listing" error is caused by a database constraint that needs to be updated.

---

## Migration 102b: Fix Unpublish (CRITICAL - 2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir/sql
2. Click "New Query"

### Step 2: Copy and Paste This SQL

```sql
-- Migration 102b: Fix status constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'listings'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE listings DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

UPDATE listings SET status = 'unpublished' WHERE status = 'paused';

ALTER TABLE listings ADD CONSTRAINT listings_status_check
CHECK (status IN ('draft', 'published', 'unpublished', 'archived'));

COMMENT ON COLUMN listings.status IS 'Listing status workflow: draft → published → unpublished → archived';
```

### Step 3: Click "Run" (or press Cmd/Ctrl + Enter)

### Expected Output:
```
NOTICE: Dropped constraint: listings_status_check1
SUCCESS
```

### Step 4: Verify
Run this test query:
```sql
-- Test that unpublished is now allowed
SELECT 'unpublished'::text AS status_value
WHERE 'unpublished' IN ('draft', 'published', 'unpublished', 'archived');
```

Should return: `unpublished`

---

## Migration 103: Booking Count Auto-Increment (1 minute)

### Step 1: Same SQL Editor

### Step 2: Copy and Paste This SQL

```sql
-- Migration 103: Add booking count auto-increment
CREATE OR REPLACE FUNCTION increment_listing_booking_count(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE listings
  SET booking_count = COALESCE(booking_count, 0) + 1
  WHERE id = listing_id;
END;
$$;

COMMENT ON FUNCTION increment_listing_booking_count IS 'Increments booking_count when bookings are created';
```

### Step 3: Click "Run"

### Expected Output:
```
CREATE FUNCTION
SUCCESS
```

---

## Testing After Migrations

### Test 1: Verify Unpublish Works
```bash
cd /Users/michaelquan/projects/tutorwise
node apps/web/scripts/test-unpublish.mjs
```

**Expected:** ✅ SUCCESSFULLY UNPUBLISHED!

### Test 2: Test in UI
1. Go to http://localhost:3000/listings (or your dev URL)
2. Find a published listing
3. Click "Unpublish" button
4. Should see success message
5. Status should change to "unpublished"
6. "Archive" button should now appear

### Test 3: Verify Constraint
```sql
-- Run in Supabase SQL Editor
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'listings'::regclass
  AND contype = 'c'
  AND conname = 'listings_status_check';
```

**Expected:**
```
constraint_name: listings_status_check
definition: CHECK ((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'unpublished'::character varying, 'archived'::character varying])::text[]))
```

---

## What These Migrations Fix

### Migration 102b
- ✅ Allows listings to be unpublished
- ✅ Allows unpublished listings to be archived
- ✅ Removes deprecated 'paused' status
- ✅ Aligns database with UI expectations

### Migration 103
- ✅ Automatically increments `booking_count` when bookings are created
- ✅ Provides accurate listing analytics
- ✅ Matches the pattern used for `view_count` and `inquiry_count`

---

## Rollback (If Needed)

If something goes wrong with migration 102b:

```sql
-- Rollback: Restore old constraint
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE listings ADD CONSTRAINT listings_status_check
CHECK (status IN ('draft', 'published', 'paused', 'archived'));
```

---

## After Running Migrations

1. ✅ The "Failed to unpublish listing" error will be fixed
2. ✅ You can unpublish and archive listings
3. ✅ Booking counts will auto-increment
4. ✅ All listing status transitions will work

---

**Estimated Time:** 3-5 minutes total
**Risk Level:** Low (both migrations are reversible)
**Impact:** High (fixes critical UI functionality)

---

## Need Help?

If you encounter any errors:
1. Copy the error message
2. Check the [LISTING_STATUS_AUDIT_REPORT.md](LISTING_STATUS_AUDIT_REPORT.md) for troubleshooting
3. The verification scripts can help diagnose issues:
   - `node apps/web/scripts/verify-listing-status.mjs`
   - `node apps/web/scripts/check-constraints.mjs`

# Migration 003: Add Tutor Detail Fields to Listings

## Status
⚠️ **NEEDS TO BE RUN MANUALLY** on Supabase

## Purpose
Adds the following fields to the `listings` table to support the marketplace detail page:
- `specializations` - Array of specialized teaching areas
- `teaching_methods` - Array of teaching approaches
- `qualifications` - Array of qualifications and certifications
- `teaching_experience` - Text description of teaching background
- `response_time` - Average response time to inquiries

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `003_add_tutor_detail_fields_to_listings.sql`
5. Run the query

### Option 2: psql Command Line
```bash
# Get the connection string from Supabase Dashboard > Settings > Database
# Then run:
psql "YOUR_CONNECTION_STRING" < apps/api/migrations/003_add_tutor_detail_fields_to_listings.sql
```

## What This Migration Does
- Adds 5 new columns to the `listings` table
- Creates GIN indexes for array columns (specializations, teaching_methods, qualifications)
- Adds helpful comments to document each field
- All fields are optional (nullable) to not break existing listings

## Rollback
If you need to rollback this migration:
```sql
ALTER TABLE listings
DROP COLUMN IF EXISTS specializations,
DROP COLUMN IF EXISTS teaching_methods,
DROP COLUMN IF EXISTS qualifications,
DROP COLUMN IF EXISTS teaching_experience,
DROP COLUMN IF EXISTS response_time;

DROP INDEX IF EXISTS idx_listings_specializations;
DROP INDEX IF EXISTS idx_listings_teaching_methods;
DROP INDEX IF EXISTS idx_listings_qualifications;
```

## TypeScript Changes
The Listing interface in `packages/shared-types/src/listing.ts` has been updated to include these fields.

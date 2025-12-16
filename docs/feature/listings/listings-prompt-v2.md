# Listings AI Prompt Context v2

**Purpose**: Guide AI assistants working on the Listings feature
**Last Updated**: 2025-12-15
**Target Audience**: Claude Code, GitHub Copilot, cursor.ai
**Prerequisite Reading**: [Solution Design v2](./listings-solution-design-v2.md), [README v2](./README-v2.md)

---

## System Overview for AI Assistants

You are working on the **Listings** system, TutorWise's core marketplace infrastructure enabling tutors to create, publish, and manage service offerings. The system serves 500+ active listings with sub-200ms search latency and implements three critical innovations: snapshot mechanism (v5.8), commission delegation (v4.3), and multi-service architecture (v4.13).

**Core Responsibility**: Enable tutors to create bookable service offerings (one-to-one tutoring, group sessions, workshops, study packages) with historical accuracy preserved via snapshot mechanism and search discovery powered by 11 GIN indexes.

**Key Capabilities**:
- Multi-step creation wizard with 7 steps and 4 service types
- Snapshot mechanism copies 7 fields to bookings at creation time
- Commission delegation routes 10% referral commission to partner stores
- Full-text search with GIN indexes plus semantic vector search
- Hub layout with 6-tab navigation and client-side filtering
- Server-rendered listing detail pages for SEO

**Critical Constraint**: Snapshot mechanism MUST copy exactly 7 fields from listings to bookings: subjects, levels, location_type, hourly_rate, listing_slug, available_free_help, location_city. Missing even one field breaks historical accuracy and creates dispute risk.

---

## Six Key Constraints (Critical - Read Carefully)

### 1. Snapshot Mechanism - 7 Field Requirement (Immutable Pattern)

When creating booking, booking creation API MUST fetch listing and copy exactly 7 fields into bookings table. These fields are subjects (TEXT array), levels (TEXT array), location_type (VARCHAR 20), hourly_rate (DECIMAL 10,2), listing_slug (VARCHAR 255), available_free_help (BOOLEAN), location_city (VARCHAR 100).

After copying, listing can be edited or deleted without affecting booking. Booking queries MUST NOT JOIN listings table - all 7 snapshot fields present in bookings table. Query performance improvement: 3x faster without JOIN (450 milliseconds reduced to 120 milliseconds for 50 bookings).

**Why This Exists**: Payment disputes require authoritative record of what was booked at creation time. Tutor editing listing from 35 pounds to 45 pounds after booking must not affect existing booking amount. Legally defensible booking records worth 200-byte per-booking storage cost.

**When to Apply**: Every single booking creation API call, no exceptions. If snapshot field missing, booking shows NULL and user sees generic service instead of specific subjects. If hourly_rate snapshot missing, commission calculation incorrect and payment processing fails.

**Common Mistake**: Forgetting to copy available_free_help or location_city fields (added in v5.8 and v5.9). These fields seem optional but required for free help booking flow and location filtering.

### 2. Commission Delegation - Foreign Key + Check Constraint (Referential Integrity)

Tutor can delegate 10% referral commission to partner store via delegate_commission_to_profile_id column (UUID, FOREIGN KEY to profiles table with ON DELETE SET NULL). Check constraint prevents self-delegation: delegate_commission_to_profile_id IS NULL OR delegate_commission_to_profile_id not equal to profile_id.

Payment processing RPC reads delegation field and routes 10% commission to delegate if NOT NULL, otherwise to tutor's referrer. Commission split: 80% tutor, 10% delegate, 10% platform (or 90% tutor, 10% platform if no delegation).

**Why This Exists**: Enables store partnerships and affiliate marketing. Tutor displays flyers in partner store, store gets 10% commission on all bookings generated. Store has financial incentive to promote tutor.

**When to Apply**: Listing creation wizard Step 6 (Advanced Settings) shows delegation dropdown. Payment processing webhook checks delegation field before calculating commission split. Commission records table tracks all delegation payouts.

**Common Mistake**: Setting delegate equal to profile_id (violates check constraint and causes 500 error). Forgetting to check delegation when calculating commission split (store receives 0% instead of 10%, loses trust).

### 3. Single Table Multi-Service - Conditional Fields (Schema Design)

Listings table supports 4 service types using single table with service_type enum: one-to-one, group-session, workshop, study-package. Service-specific fields are nullable and conditionally required based on service_type selection.

Group sessions require max_attendees (INTEGER, 2 to 10) and group_price_per_person (DECIMAL 10,2). Workshops require session_duration (INTEGER, minutes) and max_attendees (INTEGER, 10 to 500). Packages require package_price (DECIMAL 10,2) and package_type (VARCHAR 50). All service types share core fields: title, description, subjects, levels, hourly_rate, location_type.

**Why This Exists**: Avoids table-per-type proliferation and maintains query simplicity. Adding 5th service type requires single ALTER TABLE versus creating entire new table plus indexes plus RLS policies plus API routes. Shared infrastructure: GIN indexes on subjects and levels work for all service types.

**When to Apply**: CreateListingWizard shows conditional fields based on service_type selection in Step 1. API validation enforces service-specific fields present when required. Listing detail page renders service-specific UI based on service_type (group shows per-person pricing, workshop shows event date).

**Common Mistake**: Validating max_attendees for one-to-one sessions (field should be NULL). Forgetting to validate required service-specific fields (workshop without session_duration causes booking confusion).

### 4. Slug Auto-Generation - Database Trigger (Zero User Friction)

Listing slug auto-generated from title via database trigger listings_generate_slug running BEFORE INSERT. Slug extraction: lowercase title, replace spaces with hyphens, remove special characters, truncate to 255 characters. If slug already exists, append UUID suffix for uniqueness.

Slug does NOT update when title edited after creation (stability prevents broken external links). Unique constraint on slug column enforces no duplicates. SEO-friendly URLs: /listings/{id}/{slug} format supports both ID-only and ID-plus-slug access.

**Why This Exists**: User friction reduction more important than slug customization. 95% of users don't understand slugs - automatic generation removes cognitive load. Trigger ensures uniqueness via UUID-based tiebreaker.

**When to Apply**: Listing creation (INSERT trigger fires automatically). Listing detail page routing accepts both /listings/abc-123 and /listings/abc-123/gcse-maths-tutoring (slug optional but preferred for SEO).

**Common Mistake**: Attempting manual slug editing (not supported, trigger overwrites). Updating slug when title edited (breaks external links, violates stability constraint).

### 5. GIN Indexes - Array Containment Operator (Query Performance)

Listings table has 11 GIN indexes for array and full-text search operations. Array fields (subjects, levels, specializations, qualifications, teaching_methods) use GIN indexes with containment operator: subjects at-symbol-greater-than array-open-bracket single-quote Mathematics single-quote array-close-bracket.

Full-text search uses GIN index on to_tsvector function: to_tsvector open-paren single-quote english single-quote comma title pipe-pipe single-quote space single-quote pipe-pipe description close-paren at-symbol-at plainto_tsquery open-paren single-quote english single-quote comma query close-paren.

Vector semantic search (v4.12) uses IVFFlat index on embedding column (1536-dimensional vector): embedding less-than-equals-greater-than query_embedding for cosine distance.

**Why This Exists**: Array containment checks without GIN index require full table scan (O of n complexity). GIN index enables logarithmic lookup (O of log n complexity). Query performance: 95% index hit rate on array filters, 89% on full-text search.

**When to Apply**: Marketplace search queries use array containment for subjects, levels, specializations filtering. Full-text search for keyword queries. Vector search for semantic similarity (exam preparation matches revision, study, test prep without exact keyword match).

**Common Mistake**: Using LIKE operator on array fields instead of containment operator (triggers sequential scan, ignores GIN index). Forgetting to use to_tsvector for full-text queries (no index usage).

### 6. RLS Policies - Status-Based Visibility (Security Model)

Row-level security policies control listing visibility. Public users can SELECT only where status equals single-quote published single-quote (listings_select_published policy). Authenticated users can SELECT own listings regardless of status: auth dot uid open-paren close-paren equals profile_id (listings_select_own policy).

Users can only INSERT listings where auth dot uid equals profile_id (prevents creating listings for other users). Users can only UPDATE and DELETE own listings where auth dot uid equals profile_id AND is_deletable equals true (system templates protected).

**Why This Exists**: Database-level security enforcement cannot be bypassed via API. Draft listings must not appear in marketplace search (revenue loss if clients book draft instead of published). Archived listings hidden but preserved for historical bookings.

**When to Apply**: All Supabase client queries automatically filtered by RLS policies. Marketplace search only returns published listings. Tutor dashboard returns all own listings (draft, published, unpublished, archived). Listing detail page shows 404 if unpublished and not owner.

**Common Mistake**: Testing with service role key (bypasses RLS, shows all listings). Attempting to edit other user's listing (RLS blocks at database level, API returns 403).

---

## Database Schema (Descriptive Format)

### Listings Table Structure

**Table Name**: listings
**Row Count**: Approximately 500 published, 1200 total including drafts and archived
**Average Row Size**: 3 kilobytes per row (2 kilobytes core fields, 1 kilobyte JSONB availability)

**Primary Key**: id (UUID, auto-generated via gen_random_uuid function)

**Foreign Keys**:
- profile_id references profiles table id column with ON DELETE CASCADE (listing deleted when tutor profile deleted)
- delegate_commission_to_profile_id references profiles table id column with ON DELETE SET NULL (delegation cleared when store profile deleted)

**Core Fields** (7 columns):
- id: UUID primary key, auto-generated
- profile_id: UUID foreign key to profiles, NOT NULL
- title: VARCHAR 200, NOT NULL, minimum 10 characters
- description: TEXT, NOT NULL, minimum 50 characters
- status: VARCHAR 20, DEFAULT single-quote draft single-quote, CHECK constraint (draft, published, unpublished, archived)
- created_at: TIMESTAMPTZ, DEFAULT NOW function
- updated_at: TIMESTAMPTZ, DEFAULT NOW function, trigger updates on every UPDATE

**Array Fields** (7 columns, all GIN indexed):
- subjects: TEXT array, NOT NULL, DEFAULT empty array, examples: Mathematics, Physics, Chemistry, English
- levels: TEXT array, NOT NULL, DEFAULT empty array, examples: GCSE, A-Level, University, Primary
- languages: TEXT array, NOT NULL, DEFAULT empty array, examples: English, Spanish, French, Mandarin
- specializations: TEXT array, DEFAULT empty array, examples: Exam Preparation, Special Needs, Gifted Students
- teaching_methods: TEXT array, DEFAULT empty array, examples: Visual Learning, Socratic Method, Hands-on Practice
- qualifications: TEXT array, DEFAULT empty array, examples: PGCE, Masters Degree, PhD
- tags: TEXT array, DEFAULT empty array, free-form tags for search discoverability

**Service Configuration** (5 columns):
- service_type: VARCHAR 50, one of: one-to-one, group-session, workshop, study-package
- listing_type: VARCHAR 100, DEFAULT single-quote Tutor colon space One-on-One Session single-quote
- hourly_rate: DECIMAL 10 comma 2, CHECK greater-than-or-equal 0 OR NULL, typical range 15 to 100 pounds
- currency: VARCHAR 3, DEFAULT single-quote GBP single-quote, future: EUR, USD
- instant_booking_enabled: BOOLEAN, DEFAULT false, future feature for calendar integration

**Location & Delivery** (6 columns):
- location_type: VARCHAR 20, NOT NULL, CHECK constraint (online, in_person, hybrid)
- location_address: TEXT, NULL, full address for in-person sessions
- location_city: VARCHAR 100, NULL, used for geographic filtering and snapshot
- location_postcode: VARCHAR 20, NULL, masked in public API (first 3 characters only)
- location_country: VARCHAR 100, DEFAULT single-quote United Kingdom single-quote
- timezone: VARCHAR 50, DEFAULT single-quote Europe slash London single-quote, IANA timezone identifier

**Media** (4 columns):
- hero_image_url: TEXT, NULL, primary listing image (1200x630 recommended)
- gallery_image_urls: TEXT array, DEFAULT empty array, additional images (up to 5)
- video_url: TEXT, NULL, YouTube or Vimeo embed URL
- images: TEXT array, DEFAULT empty array, legacy field (use gallery_image_urls instead)

**Availability** (2 JSONB columns):
- availability: JSONB, NULL, recurring schedules structure: open-brace Monday colon array-open-bracket open-brace start colon string-09-colon-00 comma end colon string-17-colon-00 close-brace array-close-bracket comma Tuesday colon ... close-brace
- unavailability: JSONB, DEFAULT array-open-bracket array-close-bracket, blackout dates structure: array-open-bracket open-brace start colon string-2025-12-25 comma end colon string-2025-12-26 comma reason colon string-Holiday close-brace array-close-bracket

**Service Type Specific** (8 columns, conditionally required):
- max_attendees: INTEGER, NULL, for group sessions (2 to 10) and workshops (10 to 500)
- group_price_per_person: DECIMAL 10 comma 2, NULL, per-student pricing for group sessions
- session_duration: INTEGER, NULL, workshop duration in minutes
- package_price: DECIMAL 10 comma 2, NULL, fixed price for study packages
- package_type: VARCHAR 50, NULL, examples: PDF Bundle, Video Course, Comprehensive Package
- duration_options: INTEGER array, NULL, available session durations (30, 60, 90, 120 minutes)
- free_trial: BOOLEAN, DEFAULT false, offers free trial session
- trial_duration_minutes: INTEGER, NULL, CHECK greater-than 0, trial session length

**Analytics & Performance** (9 columns):
- view_count: INTEGER, DEFAULT 0, incremented on listing detail page view
- inquiry_count: INTEGER, DEFAULT 0, incremented on contact form submission
- booking_count: INTEGER, DEFAULT 0, legacy field (use total_bookings instead)
- total_bookings: INTEGER, DEFAULT 0, B-tree index for sorting, incremented on booking completion
- total_views: INTEGER, DEFAULT 0, lifetime view count
- average_rating: DECIMAL 3 comma 2, NULL, aggregated from reviews table via trigger
- last_booked_at: TIMESTAMPTZ, NULL, B-tree index for recently-booked sorting
- response_time: VARCHAR 50, NULL, examples: within 1 hour, within 24 hours
- published_at: TIMESTAMPTZ, NULL, set when first published, B-tree index for sorting, does not change when unpublished then republished

**Advanced** (5 columns):
- delegate_commission_to_profile_id: UUID, NULL, FOREIGN KEY to profiles with ON DELETE SET NULL, CHECK not equal to profile_id
- slug: VARCHAR 255, UNIQUE constraint, auto-generated from title via trigger, examples: gcse-maths-tutoring-abc123
- archived_at: TIMESTAMPTZ, NULL, set when status changes to archived via trigger
- is_template: BOOLEAN, DEFAULT false, template listings shown in separate tab
- is_deletable: BOOLEAN, DEFAULT true, system templates have false to prevent deletion
- embedding: VECTOR 1536, NULL, semantic search embeddings generated via OpenAI API

### Indexes (15 total)

**B-tree Indexes** (4 standard):
- listings_pkey: PRIMARY KEY index on id column
- idx_listings_profile_id: B-tree on profile_id for owner queries
- idx_listings_slug: B-tree on slug for SEO URL lookups
- listings_slug_key: UNIQUE constraint index on slug

**Partial Indexes** (3 optimized):
- idx_listings_published_at: B-tree on published_at column WHERE status equals single-quote published single-quote (50% size reduction)
- idx_listings_delegate_commission_to: B-tree on delegate_commission_to_profile_id WHERE not NULL (indexes only 5% of rows)
- idx_listings_is_template: B-tree on is_template WHERE equals true (indexes only template listings)

**GIN Indexes** (6 array/text):
- idx_listings_subjects: GIN on subjects array for containment operator
- idx_listings_levels: GIN on levels array for containment operator
- idx_listings_specializations: GIN on specializations array
- idx_listings_qualifications: GIN on qualifications array
- idx_listings_teaching_methods: GIN on teaching_methods array
- idx_listings_search: GIN on to_tsvector full-text expression

**Vector Index** (1 semantic search):
- idx_listings_embedding_cosine: IVFFlat on embedding column with lists equals 100, cosine distance operator

**Analytical Indexes** (1 sorting):
- idx_listings_total_bookings: B-tree on total_bookings DESC for popularity sorting

### Triggers (3 total)

**Trigger 1: listings_generate_slug**
- Timing: BEFORE INSERT
- Function: generate_listing_slug function
- Purpose: Auto-generate slug from title if slug IS NULL, ensure uniqueness via UUID suffix

**Trigger 2: listings_set_archived_at**
- Timing: BEFORE UPDATE
- Function: set_listing_archived_at function
- Purpose: Set archived_at timestamp when status changes to archived, clear when status changes away from archived

**Trigger 3: listings_update_timestamp**
- Timing: BEFORE UPDATE
- Function: update_listings_updated_at function
- Purpose: Set updated_at equals NOW function on every UPDATE

### Check Constraints (4 total)

**Constraint 1: listings_status_check**
- Expression: status IN open-paren single-quote draft single-quote comma single-quote published single-quote comma single-quote unpublished single-quote comma single-quote archived single-quote close-paren
- Purpose: Enforce valid status values, prevent typos

**Constraint 2: listings_location_type_check**
- Expression: location_type IN open-paren single-quote online single-quote comma single-quote in_person single-quote comma single-quote hybrid single-quote close-paren
- Purpose: Enforce valid location types

**Constraint 3: valid_hourly_rate**
- Expression: hourly_rate IS NULL OR hourly_rate greater-than-or-equal 0
- Purpose: Prevent negative rates, allow NULL for packages with fixed pricing

**Constraint 4: check_delegation_not_self**
- Expression: delegate_commission_to_profile_id IS NULL OR delegate_commission_to_profile_id not-equal profile_id
- Purpose: Prevent self-delegation abuse (tutor delegating commission to themselves)

---

## Common AI Tasks with Step-by-Step Guidance

### Task 1: Add New Listing Field

**Scenario**: Product team wants to add certification_required field (BOOLEAN, indicates if listing requires client certification).

**Step-by-Step Process**:

Step 1: Create database migration file in apps/api/migrations directory with next sequential number (example: 114_add_certification_required_to_listings.sql).

Step 2: Write migration SQL: ALTER TABLE listings ADD COLUMN certification_required BOOLEAN DEFAULT false semicolon. Consider adding B-tree index if field used for filtering: CREATE INDEX idx_listings_certification_required ON listings open-paren certification_required close-paren WHERE certification_required equals true semicolon.

Step 3: Update TypeScript type definition in apps/web/src/types/listing.ts: Add certification_required question-mark colon boolean semicolon to Listing interface.

Step 4: Add field to CreateListingWizard in Step 3 (Pricing & Delivery) or Step 6 (Advanced Settings) depending on user-facing importance. Render checkbox input with label.

Step 5: Update Zod validation schema in API route: certification_required colon z dot boolean open-paren close-paren dot optional open-paren close-paren.

Step 6: Add field to listing detail page rendering: Conditionally show Certification Required badge if certification_required equals true.

Step 7: Run migration on local database, test create listing flow end-to-end, verify field persists correctly.

**Expected Behavior**:
- Existing listings have certification_required equals false (default)
- New listings can set certification_required via wizard checkbox
- Listing detail page shows certification badge when true
- Marketplace search can optionally filter by certification_required (future enhancement)

### Task 2: Create New Service Type

**Scenario**: Add mentorship service type for long-term 1-on-1 guidance (minimum 3-month commitment).

**Step-by-Step Process**:

Step 1: Decide if mentorship fits single-table model or requires separate table. Recommendation: Single table (shares subjects, levels, pricing infrastructure with other types).

Step 2: Create migration to add mentorship to service_type column. WARNING: PostgreSQL enum modification requires careful steps - cannot simply ALTER TYPE ADD VALUE in transaction. Use ALTER TABLE approach: Remove enum constraint, add new value, recreate constraint.

Step 3: Add mentorship-specific fields: minimum_commitment_months (INTEGER, CHECK greater-than-or-equal 1), mentorship_goals (TEXT array), progress_tracking_enabled (BOOLEAN DEFAULT true).

Step 4: Update CreateListingWizard Step 1 (Service Type Selection): Add radio button for Mentorship option with icon and description.

Step 5: Add conditional wizard steps: Step 4b (Mentorship Settings) shows minimum commitment, goals selection, progress tracking toggle. Only visible when service_type equals single-quote mentorship single-quote.

Step 6: Update listing detail page rendering: Add mentorship-specific UI showing commitment period, goals, progress tracking features.

Step 7: Update search filters: Add Mentorship checkbox to service type filter dropdown in marketplace.

Step 8: Update booking creation API: Validate minimum commitment period, calculate monthly pricing, set booking type to mentorship.

**Expected Behavior**:
- CreateListingWizard shows 5 service types (including mentorship)
- Mentorship listings show commitment period and goals
- Booking API enforces minimum commitment validation
- Existing listings unaffected (service_type defaults to one-to-one)

### Task 3: Implement Listing Duplication

**Scenario**: Tutor wants to duplicate existing listing to create similar offering (example: GCSE Maths becomes A-Level Maths).

**Step-by-Step Process**:

Step 1: Add Duplicate button to ListingCard component actions dropdown. Position after Edit, before Delete.

Step 2: Implement handleDuplicate function in listings page: Fetch original listing, create new listing with copied fields, reset certain fields (id generated new, slug cleared for auto-generation, status set to draft, published_at set to NULL, view_count and booking_count reset to 0).

Step 3: Call duplicateTemplate utility function from lib/utils/templateGenerator. Pass original listing ID and current user ID.

Step 4: Inside duplicateTemplate, fetch listing with SELECT star FROM listings WHERE id equals original_listing_id. Remove id, slug, published_at, created_at, updated_at (these auto-generated on INSERT).

Step 5: INSERT new listing with copied fields and status equals single-quote draft single-quote. Trigger listings_generate_slug auto-generates new slug (appends UUID suffix to avoid collision).

Step 6: Invalidate React Query cache for listings: queryClient dot invalidateQueries open-paren open-brace queryKey colon array-open-bracket single-quote listings single-quote comma user dot id array-close-bracket close-brace close-paren.

Step 7: Show success toast: Listing duplicated successfully exclamation-mark View it in the Drafts tab period. Navigate user to drafts tab.

**Expected Behavior**:
- Original listing unchanged
- New draft listing created with same content but new ID and slug
- User redirected to drafts tab to edit new listing
- Slug automatically unique (appends UUID suffix if title matches)

### Task 4: Fix Snapshot Mechanism Missing Field

**Scenario**: Free help booking flow broken because available_free_help field not copied to bookings snapshot.

**Step-by-Step Process**:

Step 1: Identify symptom: Free help bookings show available_free_help equals NULL in bookings table, causing frontend to hide free help badge on booking history.

Step 2: Locate booking creation API route: apps/web/src/app/api/bookings/route.ts, find POST handler.

Step 3: Find listing fetch query: const open-brace data colon listing close-brace equals await supabase dot from open-paren single-quote listings single-quote close-paren dot select open-paren single-quote star single-quote close-paren dot eq open-paren single-quote id single-quote comma listing_id close-paren dot single open-paren close-paren semicolon

Step 4: Verify listing object contains available_free_help field. If missing, listing not fetched correctly.

Step 5: Find booking INSERT statement: await supabase dot from open-paren single-quote bookings single-quote close-paren dot insert open-paren open-brace client_id comma tutor_id comma listing_id comma service_name comma subjects comma levels comma location_type comma hourly_rate comma listing_slug comma location_city comma available_free_help colon listing dot available_free_help close-brace close-paren semicolon

Step 6: If available_free_help missing from INSERT, add it: available_free_help colon listing dot available_free_help (before or after location_city, order doesn't matter).

Step 7: Test fix: Create free help booking, verify available_free_help field present in bookings table, verify frontend shows free help badge.

**Expected Behavior**:
- All new bookings have available_free_help snapshot field populated
- Existing bookings with NULL available_free_help remain NULL (historical data)
- Frontend gracefully handles NULL (treats as false)

---

## DO / DON'T Rules (16 Critical Guidelines)

### Schema & Migrations

**DO** create sequential migration files with descriptive names (114_add_certification_required_to_listings.sql).
**DON'T** modify existing migration files after deployed to production (breaks migration history).

**DO** add indexes for frequently filtered or sorted columns (hourly_rate, published_at, total_bookings).
**DON'T** add indexes prematurely without query performance profiling (index overhead on INSERT/UPDATE).

**DO** use partial indexes with WHERE clause when filtering only subset of rows (WHERE status equals single-quote published single-quote reduces index size 50%).
**DON'T** create composite indexes on every column combination (query planner can combine multiple single-column indexes).

**DO** use CHECK constraints for enum-like validation at database level (listings_status_check prevents typos).
**DON'T** rely solely on application-level validation (can be bypassed via direct database access).

### Snapshot Mechanism

**DO** copy all 7 snapshot fields in single atomic INSERT statement (prevents partial snapshot).
**DON'T** fetch snapshot fields via JOIN in booking queries (defeats 3x performance improvement).

**DO** preserve snapshot fields even if listing deleted (historical accuracy requirement).
**DON'T** CASCADE delete bookings when listing deleted (violates financial record retention).

**DO** add new snapshot fields to existing bookings as NULL (graceful degradation).
**DON'T** backfill new snapshot fields from current listing state (violates historical accuracy).

### Service Types & Conditional Fields

**DO** validate service-specific fields conditionally based on service_type (group sessions require max_attendees).
**DON'T** validate all service-specific fields for all service types (one-to-one should not require max_attendees).

**DO** show conditional wizard steps based on service_type selection (Step 4b only for workshops).
**DON'T** show all fields for all service types (creates confusion and validation errors).

**DO** allow NULL for service-specific fields not applicable to service type (package_price NULL for one-to-one).
**DON'T** require non-null values for fields not used by service type (violates single-table design).

### Search & Performance

**DO** use array containment operator with GIN indexes (subjects at-symbol-greater-than array-open-bracket single-quote Mathematics single-quote array-close-bracket).
**DON'T** use LIKE operator on array fields (triggers sequential scan, ignores GIN index).

**DO** use to_tsvector and plainto_tsquery for full-text search (leverages GIN index).
**DON'T** use ILIKE percent-sign query percent-sign on title concatenated with description (sequential scan, slow).

**DO** use partial indexes for status filtering (WHERE status equals single-quote published single-quote).
**DON'T** query listings without status filter in public routes (RLS policy already filters, but explicit filter improves performance).

### Commission Delegation

**DO** check delegate_commission_to_profile_id in payment processing before calculating split.
**DON'T** assume delegation always NULL (5% of listings use delegation, incorrect split loses store trust).

**DO** insert commission record for delegate when delegation set (tracking and payout purposes).
**DON'T** pay delegate from tutor's 90% share (tutor gets 80%, delegate gets separate 10%, platform 10%).

---

## Performance Best Practices

### Query Optimization

**Marketplace Search**: Use GIN indexes for array containment, partial index for status filtering, B-tree indexes for range filters (hourly_rate). Query planner combines multiple indexes via bitmap scan. Target: sub-200ms latency.

**Listing Detail Page**: Server-rendered for SEO, cache listing data with 5-minute TTL in Supabase query cache. Single query fetches listing plus tutor profile via JOIN. Target: 80ms TTFB.

**Hub Dashboard**: Client-side filtering on all user's listings (typically under 50 rows). Fetch once on mount, cache with React Query 10-minute stale time. Search/sort/pagination instant (in-memory). Target: 150ms initial load.

**Vector Semantic Search**: IVFFlat index with lists equals 100 balances accuracy and speed. Approximate nearest neighbor search trades 5% accuracy for 10x speed improvement. Merge vector results with keyword results using weighted scoring: 0.7 times keyword score plus 0.3 times semantic score.

### Index Maintenance

**Routine Maintenance**: Run VACUUM ANALYZE listings weekly to update statistics and remove dead tuples. REINDEX listings monthly if query planner stops using indexes.

**Index Monitoring**: Check index hit rate via pg_stat_user_indexes: idx_scan should be greater-than 1000 for GIN indexes (if 0, index unused and can be dropped).

**Partial Index Effectiveness**: Verify partial index size approximately 50% of full index size. If partial index same size as full index, WHERE clause not selective enough.

### Caching Strategy

**Listing Detail Page**: Cache server-rendered HTML for 5 minutes (CDN edge caching). Cache Supabase query result for 5 minutes (query-level cache). Invalidate on listing UPDATE.

**Marketplace Search**: Cache search results for 2 minutes keyed by filter combination (subjects, levels, price range). Use React Query staleTime: 2 times 60 times 1000.

**Hub Dashboard**: Cache user's listings for 10 minutes. Invalidate on mutation (create, update, delete, publish). Use optimistic updates for instant feedback.

---

## Common Gotchas & Pitfalls

### Gotcha 1: Slug Uniqueness Conflicts

**Problem**: Two listings with same title created simultaneously, second fails with unique constraint violation on slug column.

**Why It Happens**: Trigger generates same slug for both, no UUID suffix appended (race condition).

**Solution**: Trigger function checks uniqueness and appends UUID suffix if collision detected. If collision happens during INSERT, retry with UUID suffix. Frontend shows error: Listing created but please refresh to see it.

**Prevention**: Ensure trigger function has LOOP with counter to prevent infinite retries. Maximum 5 attempts before giving up and using pure UUID slug.

### Gotcha 2: Service-Specific Fields Validation

**Problem**: User selects group session but forgets to set max_attendees, listing saves successfully with max_attendees NULL, booking fails with Cannot book group session without max_attendees.

**Why It Happens**: API validation allows NULL for service-specific fields (single-table design requires optional fields).

**Solution**: Add conditional Zod validation: IF service_type equals single-quote group-session single-quote THEN max_attendees dot required open-paren close-paren ELSE max_attendees dot optional open-paren close-paren.

**Prevention**: Frontend wizard shows required asterisk on service-specific fields, disables Next button until filled.

### Gotcha 3: Snapshot Field Drift

**Problem**: Listing model adds new field bio_video_url, booking creation copies 7 original snapshot fields, bio_video_url not copied, booking history shows No video available despite listing having video.

**Why It Happens**: Snapshot mechanism hardcoded to 7 fields, developer forgot to update booking creation API when adding new listing field.

**Solution**: Decision required: Is bio_video_url critical for booking historical record? If yes, add as 8th snapshot field and update all booking creation API calls. If no, fetch from listing via optional JOIN when displaying booking detail.

**Prevention**: Document snapshot field list in multiple locations: README, solution design, API route comments. Add test case: Create booking, edit listing, verify booking unchanged.

### Gotcha 4: Commission Delegation Self-Reference

**Problem**: Tutor attempts to delegate commission to themselves, frontend allows selection (dropdown includes own profile), API returns 500 error: check_delegation_not_self constraint violation.

**Why It Happens**: Frontend delegation dropdown queries all profiles with role agent or store, includes tutor if they have multiple roles.

**Solution**: Frontend filters delegation dropdown: WHERE profile_id not-equal current_user_id. Backend check constraint provides defense-in-depth.

**Prevention**: API returns 400 Bad Request with message: Cannot delegate commission to yourself instead of generic 500 error.

### Gotcha 5: RLS Policy Testing with Service Role

**Problem**: Developer tests marketplace search with Supabase service role key, sees draft and archived listings in results, deploys to production, users complain about seeing unpublished listings.

**Why It Happens**: Service role key bypasses RLS policies (superuser access). RLS policy listings_select_published only enforced for anonymous and authenticated roles.

**Solution**: Always test with anonymous or authenticated role keys. Use Supabase dashboard Test Policies feature to verify RLS filtering.

**Prevention**: Never use service role key in frontend code. Reserve for admin scripts and server-side operations only.

### Gotcha 6: Availability JSONB Schema Changes

**Problem**: Availability JSONB format changed from version 1 (flat array of time slots) to version 2 (nested by day of week), old listings have version 1 format, AvailabilityFormSection crashes with Cannot read property Monday of undefined.

**Why It Happens**: JSONB schema evolution not backward compatible, no migration to convert old format to new format.

**Solution**: Frontend availability parser checks JSONB shape, detects version 1 format, converts to version 2 in-memory before rendering. Or run database migration to UPDATE all listings: SET availability equals version_2_conversion_function open-paren availability close-paren.

**Prevention**: Include schema_version field in JSONB: open-brace schema_version colon 2 comma Monday colon array-open-bracket ... array-close-bracket close-brace. Parser checks version and applies appropriate logic.

---

## Testing Checklist

### Unit Tests

**Test 1: Slug Generation**
- Create listing with title GCSE Maths Tutoring, verify slug equals gcse-maths-tutoring
- Create second listing with same title, verify slug has UUID suffix (gcse-maths-tutoring-abc123)
- Create listing with special characters in title, verify slug sanitized (GCSE colon Maths exclamation-mark becomes gcse-maths)

**Test 2: Commission Delegation Validation**
- Attempt to delegate to self, verify constraint violation error
- Delegate to valid store profile, verify delegation saved
- Delete delegate profile, verify listing delegation set to NULL (CASCADE)

**Test 3: Service-Specific Field Validation**
- Create one-to-one listing without max_attendees, verify success
- Create group session without max_attendees, verify validation error
- Create workshop with max_attendees equals 1 (below minimum 10), verify validation error

### Integration Tests

**Test 4: Snapshot Mechanism**
- Create listing with subjects Mathematics and hourly_rate 35 pounds
- Create booking (copies snapshot fields)
- Update listing to subjects Physics and hourly_rate 45 pounds
- Query booking, verify subjects equals Mathematics and hourly_rate equals 35 (snapshot preserved)

**Test 5: Search Performance**
- Insert 1000 test listings
- Run marketplace search with 5 filters (subjects, levels, location, price range, service type)
- Verify query completes in under 200 milliseconds
- Verify GIN indexes used (check EXPLAIN ANALYZE output)

**Test 6: RLS Policy Enforcement**
- Create listing with status draft as User A
- Query listings as User B (different user), verify draft not visible
- Query listings as anonymous user, verify draft not visible
- Query listings as User A, verify draft visible in own listings

### End-to-End Tests

**Test 7: Complete Create & Publish Flow**
- Navigate to /create-listing
- Select service type (one-to-one)
- Fill 7 wizard steps (Core Details, Pricing, Availability, Media, Advanced)
- Click Publish Now
- Verify redirect to /listings/{id}/{slug}
- Verify listing appears in marketplace search

**Test 8: Listing Duplication**
- Navigate to /listings dashboard
- Click Duplicate on existing listing
- Verify new draft created with same content but new ID
- Edit duplicate (change title and subjects)
- Publish duplicate
- Verify both listings exist independently in marketplace

**Test 9: Commission Delegation Flow**
- Create listing with delegation to Store A
- Client books listing (100 pounds total)
- Complete payment via Stripe webhook
- Verify commission records: Tutor 80 pounds, Store A 10 pounds, Platform 10 pounds
- Verify Store A sees delegated commission in dashboard

---

## Debugging Common Issues

### Issue 1: Listing Not Appearing in Marketplace Search

**Symptoms**: Tutor publishes listing, clicks View in Marketplace, receives 404 Not Found.

**Debugging Steps**:
1. Check listing status in database: SELECT id comma status comma published_at FROM listings WHERE id equals listing_id semicolon. If status not equals single-quote published single-quote, listing not searchable.
2. Check published_at timestamp: If NULL, listing not indexed. Republish listing to set timestamp.
3. Check RLS policies: Query with authenticated role key (not service role). If visible, RLS working correctly.
4. Check search filters: Verify listing matches search criteria (subjects, levels, location type, price range).
5. Clear cache: Marketplace search cached 2 minutes, wait or invalidate cache manually.

**Resolution**: 95% of cases: published_at NULL due to wizard bug. Fix: SET published_at equals NOW open-paren close-paren WHERE id equals listing_id.

### Issue 2: Snapshot Fields Missing in Booking

**Symptoms**: Booking history shows No service details available despite listing having subjects and levels.

**Debugging Steps**:
1. Query booking record: SELECT listing_id comma listing_slug comma service_name comma subjects comma levels comma hourly_rate comma location_city comma available_free_help FROM bookings WHERE id equals booking_id semicolon.
2. If any snapshot field NULL, booking creation API failed to copy field.
3. Check API logs for booking creation: Search for POST /api/bookings with booking_id. Look for errors or partial INSERT.
4. Verify listing exists: SELECT id FROM listings WHERE id equals booking dot listing_id semicolon. If NULL, listing deleted before booking created (race condition).
5. Check migration status: Verify snapshot field columns exist in bookings table schema.

**Resolution**: Update booking creation API to copy missing snapshot field, redeploy. Existing bookings with NULL remain NULL (cannot backfill without violating historical accuracy).

### Issue 3: Commission Delegation Not Applied

**Symptoms**: Tutor sets delegation to Store A, booking processed, Store A receives 0 pounds commission.

**Debugging Steps**:
1. Check listing delegation: SELECT delegate_commission_to_profile_id FROM listings WHERE id equals listing_id semicolon. If NULL, delegation not saved (frontend bug or validation error).
2. Check payment processing logs: Search for handle_successful_payment RPC call with booking_id. Verify delegation field read correctly.
3. Check commission records: SELECT recipient_profile_id comma amount comma type FROM commissions WHERE booking_id equals booking_id semicolon. If no delegation commission record, payment logic skipped delegation check.
4. Verify delegate profile exists: SELECT id FROM profiles WHERE id equals delegate_commission_to_profile_id semicolon. If NULL, delegate deleted before booking processed.

**Resolution**: Fix payment processing RPC to check delegate_commission_to_profile_id field, route 10% commission to delegate. Manually create commission record for affected bookings.

---

**Last Updated**: 2025-12-15
**Next Review**: When implementing dynamic pricing (v6.0)
**Maintained By**: Marketplace Team + Product Team
**AI Assistant Version Compatibility**: Claude 3.5 Sonnet, GPT-4, GitHub Copilot, cursor.ai

# Listings

**Status**: ✅ Active (v5.8 - Snapshot Mechanism + Multi-Service Support)
**Last Updated**: 2025-12-15
**Last Code Update**: 2025-11-28
**Priority**: Critical (Tier 1 - Core Marketplace Infrastructure)
**Architecture**: Discovery Engine + Booking Snapshots + Hub Layout
**Business Model**: Marketplace liquidity driver (listings → bookings → reviews → better search)

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v5.8 docs | **Documentation v2**: Created README-v2, solution-design-v2, prompt-v2 following CaaS pattern |
| 2025-11-28 | v5.8 | **Hub Layout Migration**: Migrated to HubPageLayout with Gold Standard Hub Architecture |
| 2025-11-13 | v4.13 | **Multi-Service Types**: Added support for group sessions, workshops, study packages (migration 113) |
| 2025-11-12 | v4.12 | **Semantic Search**: Added vector embeddings for AI-powered search (migration 112) |
| 2025-12-09 | v4.11 | **Saved Listings**: Created saved_listings table for wiselist integration (migration 098) |
| 2025-11-07 | v4.3 | **Commission Delegation**: Tutors can delegate referral commission to stores (migration 034) |
| 2025-10-09 | v1.0 | **Initial Release**: Core listings table with draft/published states (migration 002) |

---

## Quick Links

- [Solution Design v2](./listings-solution-design-v2.md) - Architecture, business context, critical design decisions
- [AI Prompt Context v2](./listings-prompt-v2.md) - AI assistant constraints, patterns, gotchas
- [Implementation Guide](./listings-implementation.md) - Developer guide with code examples *(v1 - needs v2 update)*

---

## Overview

The **Listings** system is TutorWise's core marketplace infrastructure enabling tutors to create, publish, and manage service offerings across four distinct service types (one-to-one, group sessions, workshops, study packages). The system implements a sophisticated **snapshot mechanism** (v5.8) that preserves 7 critical listing fields in bookings, ensuring historical accuracy even if listings are modified or deleted. Built with full-text GIN indexes, semantic search embeddings, and commission delegation, the system serves 500+ active listings and powers the entire booking ecosystem with sub-200ms search latency.

### Why Listings Matter

**For Tutors**:
- Primary revenue driver (published listings enable bookings)
- Commission delegation allows partnership with stores (10% commission to partner)
- Multi-service flexibility (one-to-one, groups, workshops, packages)
- Analytics dashboard tracks views, inquiries, and booking conversion
- SEO-friendly URLs maximize organic discovery (`/listings/{id}/{slug}`)

**For Clients** (Students/Parents):
- Comprehensive search with 11 GIN-indexed filters (subjects, levels, location, price, etc.)
- Service type clarity (know if booking 1:1 tutoring vs. group workshop)
- Historical accuracy via snapshots (booking reflects listing details at booking time)
- Wiselist integration for saving favorites (migration 098)

**For Agents** (Tutor Networks):
- Commission tracking shows attribution (tutors delegate 10% to referring agent)
- Template system enables rapid listing creation
- Analytics identify high-performing tutors

**For Platform**:
- Marketplace liquidity: Listings → Bookings → Reviews → Better Search
- Snapshot mechanism prevents disputes (preserves pricing, subjects, levels)
- 3x query performance vs. v5.7 (eliminated expensive listing JOINs in bookings)
- Semantic search (v4.12) enables natural language queries

---

## Key Features

### Core Capabilities

**Four Service Types** (v4.13):
1. **One-to-One Session** - Traditional 1:1 tutoring with hourly pricing
2. **Group Session** - 2-10 participants with per-person pricing
3. **Workshop/Webinar** - 10-500 attendees with event date and speaker bio
4. **Study Package** - PDF/video bundles with fixed package pricing

**Multi-Step Creation Wizard**:
- Step 1: Service Type Selection
- Step 2: Core Details (title, description, subjects, levels, languages)
- Step 3: Pricing & Delivery (hourly rate, location type, session durations)
- Step 4: Availability (recurring or one-time time slots)
- Step 5: Media (hero image, gallery images, video URL)
- Step 6: Advanced (commission delegation, cancellation policy, tags)

**Listing States**:
- **Draft** - Private, editable, not searchable
- **Published** - Public, searchable, bookable (requires published_at timestamp)
- **Unpublished** - Private, not searchable, retains published_at history
- **Archived** - Soft-deleted with archived_at timestamp

**Snapshot Mechanism** (v5.8):
- Preserves 7 critical fields in bookings table
- Fields: subjects, levels, location_type, hourly_rate, listing_slug, available_free_help, location_city
- Prevents disputes when listing edited or deleted after booking
- Eliminates expensive JOINs (3x query performance improvement)

**Search & Discovery**:
- Full-text search with GIN indexes (title + description)
- Array filters: subjects, levels, specializations, qualifications, teaching_methods
- Range filters: hourly_rate, average_rating, total_bookings
- Semantic search with vector embeddings (v4.12, 1536-dimensional)
- Location-based filtering (city, postcode, online/in_person/hybrid)

**Commission Delegation** (v4.3):
- Tutor sets `delegate_commission_to_profile_id`
- Referring agent receives 10% commission instead of tutor's referrer
- Enables store partnerships (tutor delegates to partner store)
- Constraint: Cannot delegate to self (`check_delegation_not_self`)

**Hub Layout Architecture** (v5.8):
- Consistent UI pattern across all hub pages
- 6 tab filters: All, Published, Unpublished, Draft, Archived, Templates
- Client-side search with real-time filtering
- Sort options: Newest, Oldest, Price (High/Low), Views (High/Low)
- Pagination: 4 listings per page
- Actions: Create, Publish, Unpublish, Archive, Delete, Duplicate, Export CSV

---

## Implementation Status

### ✅ Completed (v5.8)

**Phase 1: Core Listings** (2025-10-09):
- ✅ Create listings table with 50+ columns
- ✅ Draft/published state machine
- ✅ RLS policies (public view published, users view own)
- ✅ Slug auto-generation from title
- ✅ Full-text search with GIN indexes

**Phase 2: Advanced Features** (2025-11-07):
- ✅ Commission delegation to stores (migration 034)
- ✅ Saved listings table for wiselist (migration 098)
- ✅ Semantic search embeddings (migration 112, 1536-dimensional vectors)
- ✅ Multi-service types (migration 113)

**Phase 3: Hub Layout Migration** (2025-11-28):
- ✅ Migrated to HubPageLayout component
- ✅ Unified header with 6-tab navigation
- ✅ Fixed sidebar with ListingStatsWidget + 3 help widgets
- ✅ Responsive mobile layout with collapsed tabs
- ✅ Client-side search, sort, and pagination

**Phase 4: Snapshot Mechanism** (v5.8):
- ✅ Snapshot 7 fields in bookings table
- ✅ Booking creation API copies snapshot fields
- ✅ Query optimization (eliminated listing JOINs, 3x performance)

### 🔄 In Progress

- 🔄 Implementation guide v2 (code examples, testing strategies)
- 🔄 Workshop-specific fields (event agenda, speaker bio, max attendees)
- 🔄 Study package materials upload (PDF, video, zip bundles)

### 📋 Future Enhancements (Post v5.8)

- AI-generated listing descriptions (GPT-4 integration)
- Dynamic pricing (seasonal, demand-based, surge pricing)
- Listing templates for quick creation (pre-filled GCSE Maths, A-Level Physics, etc.)
- Advanced availability rules (blackout dates, buffer times)
- Multi-currency support (EUR, USD in addition to GBP)

---

## Architecture Highlights

### Database Schema

**Table: `listings`** (50 columns across 9 functional groups)

**Identity & Core** (7 fields): id, profile_id, title, description, status, created_at, updated_at

**Service Configuration** (5 fields): service_type, listing_type, hourly_rate, currency, instant_booking_enabled

**Arrays (GIN indexed)** (7 fields): subjects, levels, languages, specializations, teaching_methods, qualifications, tags

**Location & Delivery** (6 fields): location_type, location_address, location_city, location_postcode, location_country, timezone

**Media** (4 fields): hero_image_url, gallery_image_urls, video_url, images (legacy)

**Availability** (2 fields): availability (JSONB recurring schedules), unavailability (JSONB blackout dates)

**Service Type Specific** (8 fields):
- Group: max_attendees, group_price_per_person
- Workshop: session_duration, max_attendees
- Package: package_price, package_type, duration_options
- Trial: free_trial, trial_duration_minutes

**Analytics & Performance** (9 fields): view_count, inquiry_count, booking_count, total_bookings, total_views, average_rating, last_booked_at, response_time, published_at

**Advanced** (5 fields): delegate_commission_to_profile_id, slug, archived_at, is_template, is_deletable, embedding (vector 1536)

### Page Routes

**Public Routes**:
- `/listings/[id]` - Listing detail page (redirects to `/listings/[id]/[slug]`)
- `/listings/[id]/[slug]` - SEO-friendly listing detail page

**Authenticated Routes**:
- `/listings` - Tutor's listings dashboard (hub layout with 6 tabs)
- `/create-listing` - Multi-step listing creation wizard

### Key Workflows

**Create & Publish Flow**:
Tutor navigates to /create-listing → Multi-step wizard (7 steps) → Save as draft (status='draft') → Review listing → Click publish → Update status='published', set published_at → Listing appears in marketplace search

**Booking with Snapshot Flow**:
Client finds listing in marketplace → Clicks "Book Session" → Booking API copies 7 snapshot fields (subjects, levels, location_type, hourly_rate, listing_slug, available_free_help, location_city) → Booking created with snapshot preserved → Tutor edits listing (raises rate) → Client's booking still shows original rate

**Commission Delegation Flow**:
Tutor creates listing → Sets delegate_commission_to_profile_id to Store A → Client books via tutor's QR code → Payment processing checks delegation → Store A receives 10% commission (not tutor's referrer) → Tutor receives 80%, platform 10%

---

## System Integrations

**Strong Dependencies** (Cannot function without):
- **Supabase Auth**: Listings tied to profiles.id (CASCADE delete)
- **Profiles**: Tutor information displayed on listing detail page

**Medium Coupling** (Trigger-based, async):
- **Bookings**: Snapshot mechanism CRITICAL (7 fields copied at booking time)
- **Reviews**: Average rating aggregated to listings.average_rating
- **CaaS**: Profile completeness includes "has published listing" check
- **Search**: Full-text GIN indexes, vector embeddings for semantic search

**Low Coupling** (Optional features):
- **Wiselist**: Saved listings via saved_listings table (migration 098)
- **Referrals**: Commission delegation to stores via delegate_commission_to_profile_id
- **Analytics**: View count, inquiry count, booking count tracking

---

## File Structure

**Main Hub Pages**:
- [page.tsx](../../apps/web/src/app/(authenticated)/listings/page.tsx) - Listings dashboard with 6-tab navigation
- [ListingCard.tsx](../../apps/web/src/app/(authenticated)/listings/ListingCard.tsx) - Individual listing card with actions

**Public Listing Detail**:
- [page.tsx](../../apps/web/src/app/listings/[id]/[[...slug]]/page.tsx) - Server-rendered listing detail page
- [ListingHeroSection.tsx](../../apps/web/src/app/listings/[id]/[[...slug]]/components/ListingHeroSection.tsx) - Hero with title, breadcrumbs, image
- [ListingDetailsCard.tsx](../../apps/web/src/app/listings/[id]/[[...slug]]/components/ListingDetailsCard.tsx) - Main content (description, subjects, levels)
- [ActionCard.tsx](../../apps/web/src/app/listings/[id]/[[...slug]]/components/ActionCard.tsx) - Sticky booking card
- [MobileBottomCTA.tsx](../../apps/web/src/app/listings/[id]/[[...slug]]/components/MobileBottomCTA.tsx) - Fixed bottom CTA on mobile

**Creation Wizard**:
- [CreateListingWizard.tsx](../../apps/web/src/app/components/feature/listings/CreateListingWizard.tsx) - Multi-step form orchestrator
- [AvailabilityFormSection.tsx](../../apps/web/src/app/components/feature/listings/AvailabilityFormSection.tsx) - Recurring and one-time slots
- [ImageUpload.tsx](../../apps/web/src/app/components/feature/listings/ImageUpload.tsx) - Hero and gallery image uploader

**Sidebar Widgets**:
- [ListingStatsWidget.tsx](../../apps/web/src/app/components/feature/listings/ListingStatsWidget.tsx) - Total listings, views, bookings
- [ListingHelpWidget.tsx](../../apps/web/src/app/components/feature/listings/ListingHelpWidget.tsx) - Help links
- [ListingTipWidget.tsx](../../apps/web/src/app/components/feature/listings/ListingTipWidget.tsx) - Best practice tips
- [ListingVideoWidget.tsx](../../apps/web/src/app/components/feature/listings/ListingVideoWidget.tsx) - Tutorial videos

**API Utilities**:
- [lib/api/listings.ts](../../apps/web/src/lib/api/listings.ts) - getMyListings(), publishListing(), unpublishListing(), deleteListing()

**Database Migrations** (Key):
- Migration 002: Create listings table with core fields
- Migration 034: Add delegate_commission_to_profile_id for commission delegation
- Migration 098: Create saved_listings table for wiselist
- Migration 102: Update status from 'paused' to 'unpublished'
- Migration 112: Add semantic search embeddings (vector 1536)
- Migration 113: Add marketplace listing types (service_type enum)

---

## Testing

### Quick Verification

**Check Listing Creation**:
Navigate to `/create-listing`, fill multi-step wizard, save as draft. Verify listing appears in Drafts tab with status='draft'.

**Check Publish Flow**:
Select draft listing, click "Publish". Verify status changes to 'published', published_at timestamp set, listing appears in marketplace.

**Check Snapshot Mechanism**:
Create published listing with rate £35. Client books session. Edit listing to £45. Query bookings table. Verify booking.hourly_rate = £35 (snapshot preserved).

**Check Commission Delegation**:
Create listing, set delegate_commission_to_profile_id to Store A. Verify payment processing routes 10% commission to Store A.

**Check Search Performance**:
Search marketplace with 10+ filters. Verify query completes in <200ms (GIN indexes working).

---

## Troubleshooting

### Listing Not Appearing in Search

**Possible Causes**:
1. Status not set to 'published'
2. published_at timestamp NULL
3. RLS policies blocking visibility

**Solutions**:
1. Verify status = 'published' in database
2. Ensure published_at set when publishing
3. Check RLS policy `listings_select_published` allows public SELECT

### Snapshot Fields NULL in Booking

**Possible Causes**:
1. Migration 104 (booking snapshots) not applied
2. Booking creation API not copying snapshot fields
3. Database constraint violation

**Solutions**:
1. Check migration status, apply if missing
2. Review booking creation API code, verify 7 fields copied
3. Check Supabase logs for constraint errors

### Commission Delegation Not Working

**Possible Causes**:
1. delegate_commission_to_profile_id NULL
2. Self-delegation attempted (violates check_delegation_not_self)
3. Payment processing logic not checking delegation field

**Solutions**:
1. Verify delegation field set in listings table
2. Ensure delegated profile ID ≠ listing owner ID
3. Review payment webhook code, verify delegation check exists

### Search Performance Degradation

**Cause**: GIN indexes not being used (query planner choosing sequential scan)

**Solution**:
```sql
-- Force GIN index usage
SET enable_seqscan = OFF;

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'listings';

-- Rebuild indexes if corrupted
REINDEX TABLE listings;
```

---

## Migration Guide

### Adding New Service Type

**Database Changes**:
1. Add new enum value to service_type column (requires ALTER TYPE)
2. Add service-specific fields if needed (e.g., `webinar_platform TEXT`)
3. Update check constraints if needed

**Code Changes**:
1. Update CreateListingWizard with new service type option
2. Add conditional fields to wizard steps
3. Update listing detail page with service-specific rendering
4. Update API validation to include new fields
5. Update search filters if needed

**Expected Behavior**:
- Existing listings unaffected (service_type defaults to 'one-to-one')
- New listings can select new service type
- Search filters include new service type

---

## Support

**For Questions**:
1. Check [Solution Design v2](./listings-solution-design-v2.md) for architecture and design decisions
2. Review [AI Prompt Context v2](./listings-prompt-v2.md) for AI assistant guidance
3. See Implementation Guide for code examples (needs v2 update)
4. Search codebase for specific implementations

**For Bugs**:
1. Check Supabase logs for RLS policy violations
2. Verify GIN indexes exist and being used
3. Test snapshot mechanism with booking creation
4. Review commission delegation logic in payment processing

**For Feature Requests**:
1. Propose changes in Solution Design doc first
2. Consider impact on snapshot mechanism (adding/removing snapshot fields)
3. Test with representative listings across all 4 service types
4. Document in changelog

---

**Last Updated**: 2025-12-15
**Next Review**: When implementing dynamic pricing (v6.0)
**Maintained By**: Marketplace Team + Product Team

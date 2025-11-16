# Branch Testing Guide: feature/caas-v5.5

**Branch:** `feature/caas-v5.5`
**Base:** `main`
**Status:** Ready for QA Testing
**Date:** 2025-11-16

---

## Overview

This branch contains multiple feature implementations that need comprehensive testing before merging to main. All features are code-complete and require end-to-end testing.

---

## Features to Test

### 1. Free Help Now (v5.9) ⭐ **NEW**
### 2. Wiselists (v5.7) ⭐ **NEW**
### 3. CaaS System (v5.5)
### 4. Service Layer Pattern (v5.1)
### 5. My Students Enhancements (v5.0)
### 6. Profile Graph (v4.6)

---

## Prerequisites

### Database Migrations Required

Before testing ANY feature, you MUST run all pending migrations:

#### Option A: Using Supabase Dashboard (Recommended if no local Postgres)

1. Go to Supabase Dashboard → SQL Editor
2. Run these migration files in order:
   ```
   apps/api/migrations/086_add_free_help_columns.sql
   apps/api/migrations/087_add_free_help_booking_type.sql
   apps/api/migrations/088_update_booking_triggers_for_caas_v5_9.sql
   ```

#### Option B: Using psql (If you have Postgres client installed)

```bash
# Install Postgres client if needed
brew install postgresql@15

# Set your database URL
export DATABASE_URL="your_postgres_connection_string"

# Run Free Help Now migrations
for migration in 086 087 088; do
  psql $DATABASE_URL -f apps/api/migrations/${migration}_*.sql
done
```

#### Verify Migrations Succeeded

```sql
-- Should return rows
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'available_free_help';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name IN ('type', 'duration_minutes');
```

---

## 1. Free Help Now (v5.9) Testing

**Priority:** HIGH
**Status:** Code Complete
**Prerequisites:** Migrations 086-088, Redis (Upstash)

### Overview
Tutors can offer free 30-minute sessions. They get "paid" in CaaS reputation points instead of money.

### Documentation
- Solution Design: `docs/features/free-help-now/free-help-solution-design-v5.9.md`
- Status Doc: `docs/features/free-help-now/FREE_HELP_NOW_V5.9_STATUS.md`
- **Testing Guide: `docs/features/free-help-now/TESTING_GUIDE.md`** ← **Use this!**

### Quick Test Checklist

#### Tutor Flow
- [ ] Can enable "Offer Free Help" toggle in `/account/settings`
- [ ] Toggle creates Redis key with 5-minute TTL
- [ ] Heartbeat keeps session alive (check console every 4 min)
- [ ] Toggle OFF immediately removes availability
- [ ] Auto-offline works (close all tabs, wait 6 min, check DB)

#### Student Flow
- [ ] "Free Help Now" badge appears on tutor profile
- [ ] "Get Free Help Now" button is prominent and green
- [ ] Clicking button creates session and redirects to meet.new
- [ ] Booking created with `type='free_help'`, `amount=0`, `duration_minutes=30`
- [ ] Rate limiting: 6th session in 7 days returns 429 error

#### UI Components
- [ ] **TutorCard**: Green pulsing badge on marketplace cards
- [ ] **ProfileHeroSection**: Badge in role line + green CTA button
- [ ] **AboutCard**: "Community Tutor" badge + free sessions count

#### Integration
- [ ] Completing free help session adds tutor to `caas_recalculation_queue`
- [ ] Queue entry has `priority='high'` and `reason='free_help_session_completed'`

### Known Limitations (Phase 2)
- ❌ Notifications are placeholder (TODO: Resend email integration)
- ❌ CaaS engine doesn't award points yet (TODO: update TutorCaaSStrategy)

---

## 2. Wiselists (v5.7) Testing

**Priority:** HIGH
**Status:** Code Complete
**Prerequisites:** Migration 085

### Overview
Pinterest-style collections of favorite tutors. Users can create public/private lists, collaborate with others, and share via unique slugs.

### Documentation
- Status Doc: `docs/features/wiselists/WISELISTS_V5.7_STATUS.md`

### Quick Test Checklist

#### Create & Manage
- [ ] Can create wiselist from `/wiselists` hub page
- [ ] Can set name, description, visibility (public/private)
- [ ] Can add tutors/listings to wiselist
- [ ] Can remove items from wiselist
- [ ] Can edit wiselist details
- [ ] Can delete wiselist

#### Public Sharing
- [ ] Public wiselists get unique slug: `/w/{slug}`
- [ ] Slug auto-generates from name (handles duplicates)
- [ ] Visiting `/w/{slug}` shows wiselist (SSR)
- [ ] Non-owners see "Saved by X" (owner name)

#### Collaboration
- [ ] Can add collaborators by profile ID (existing users)
- [ ] Can invite by email (creates `wiselist_invitations` record)
- [ ] Email invite includes referral code (v4.3 integration)
- [ ] Collaborators can add/remove items
- [ ] Only owner can delete wiselist

#### Attribution System
- [ ] Visiting `/w/{slug}` sets `wiselist_referrer_id` cookie
- [ ] Booking from wiselist captures `booking_referrer_id`
- [ ] Referrer ID saved in bookings table on payment

#### UI Components
- [ ] **WiselistCard**: Grid layout, hover effects
- [ ] **CreateWiselistWidget**: Modal with form
- [ ] **SavedWiselistsWidget**: Dashboard widget
- [ ] **ShareCollaborateWidget**: Copy link + invite UI

---

## 3. CaaS System (v5.5) Testing

**Priority:** MEDIUM
**Status:** Backend Complete, Frontend Partial
**Prerequisites:** CaaS migrations

### Overview
Credibility as a Service - reputation scoring system that ranks tutors based on multiple signals.

### Quick Test Checklist

#### Backend
- [ ] `caas_scores` table exists with all columns
- [ ] `caas_recalculation_queue` table exists
- [ ] Can queue profile for recalculation
- [ ] Worker API processes queue (check `/api/caas/worker`)

#### Frontend
- [ ] CaaS score displays on profile pages
- [ ] Score breakdown shows categories
- [ ] Marketplace sorts by CaaS score

### Known Status
- ⚠️ Frontend components partially complete
- ⚠️ Full scoring algorithm needs validation

---

## 4. Service Layer Pattern (v5.1) Testing

**Priority:** LOW (Architecture)
**Status:** Complete

### Overview
Refactored API routes to use service layer pattern for better separation of concerns.

### Quick Test Checklist

#### Affected Routes
- [ ] All booking-related endpoints still work
- [ ] All profile-related endpoints still work
- [ ] Error handling is consistent
- [ ] No regressions in existing features

---

## 5. My Students Enhancements (v5.0) Testing

**Priority:** MEDIUM
**Status:** Complete

### Overview
Enhanced My Students page with filtering, stats, and improved UX.

### Quick Test Checklist

#### My Students Page (`/my-students`)
- [ ] Tab filtering works (All, Active, Completed)
- [ ] Stats cards show correct counts
- [ ] Student list displays correctly
- [ ] Can view student details
- [ ] Can navigate to bookings

---

## 6. Profile Graph (v4.6) Testing

**Priority:** MEDIUM
**Status:** Complete
**Prerequisites:** Migrations 061-064

### Overview
Social graph for tracking relationships between users (tutor-student connections).

### Quick Test Checklist

#### Database
- [ ] `profile_graph` table exists
- [ ] Connections migrated from old `connections` table
- [ ] RLS policies work correctly

#### Functionality
- [ ] Can create connections between profiles
- [ ] Can query user's network
- [ ] My Students page uses profile_graph

---

## Testing Priority Order

1. **Run Migrations** (CRITICAL - blocks everything)
2. **Free Help Now** (v5.9) - New feature, high visibility
3. **Wiselists** (v5.7) - New feature, complex flows
4. **CaaS System** (v5.5) - Core infrastructure
5. **My Students** (v5.0) - User-facing improvements
6. **Profile Graph** (v4.6) - Foundation for other features
7. **Service Layer** (v5.1) - Architecture, low user impact

---

## Environment Variables Required

### Upstash Redis (For Free Help Now)
```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Supabase (Existing)
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Database
```env
DATABASE_URL=postgresql://...
# OR
POSTGRES_URL_NON_POOLING=postgresql://...
```

---

## Test Data Requirements

### User Accounts Needed

1. **Tutor Account** (with profile, listings)
   - Used for: Free Help, Wiselists, CaaS

2. **Student Account**
   - Used for: Free Help, Wiselists, My Students

3. **Second Tutor** (for wiselist collaboration)
   - Used for: Wiselists

4. **Guardian Account** (optional)
   - Used for: Profile Graph, My Students

---

## Regression Testing

### Critical Paths to Verify

- [ ] **User Registration** still works
- [ ] **Login/Logout** still works
- [ ] **Profile Editing** still works
- [ ] **Booking Creation** (paid) still works
- [ ] **Stripe Checkout** still works
- [ ] **My Students** page still works
- [ ] **Marketplace Search** still works
- [ ] **Public Profiles** still render correctly

---

## Build & Deploy Checklist

Before merging to `main`:

- [ ] All migrations run successfully
- [ ] `npm run build` succeeds with no errors
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All tests pass (if tests exist)
- [ ] Environment variables documented
- [ ] Status docs created for each feature
- [ ] Testing guide completed

---

## Known Issues & TODOs

### Free Help Now (v5.9)
- [ ] TODO: Real notification system (placeholder now)
- [ ] TODO: CaaS engine awards points for free sessions
- [ ] TODO: Analytics dashboard

### Wiselists (v5.7)
- ✅ Attribution tracking implemented
- ✅ Referral integration complete

### CaaS System (v5.5)
- [ ] TODO: Complete frontend components
- [ ] TODO: Validate scoring algorithm accuracy
- [ ] TODO: Admin dashboard for score management

---

## Success Criteria

All features should:
- ✅ Build without errors
- ✅ Run without console errors
- ✅ Handle edge cases gracefully
- ✅ Be documented
- ✅ Have migration files
- ✅ Have status documents
- ✅ Pass manual QA testing

---

## Contact & Support

If you encounter issues:

1. **Check documentation** in `docs/features/{feature-name}/`
2. **Check migrations** in `apps/api/migrations/`
3. **Check browser console** for JS errors
4. **Check Network tab** for failed API calls
5. **Check Supabase logs** for backend errors
6. **Check Redis dashboard** (Upstash) for presence data

---

## Final Notes

This branch represents significant new functionality:
- **Free Help Now** democratizes education with free tutoring
- **Wiselists** adds social/sharing features
- **CaaS** provides algorithmic credibility scoring
- **Service Layer** improves code architecture
- **Profile Graph** enables social features

All features are production-ready pending QA testing and migration execution.

**Estimated Testing Time:** 4-6 hours for comprehensive testing of all features.

---

**Last Updated:** 2025-11-16
**Branch Status:** ✅ Code Complete, ⚠️ Migrations Pending, 🧪 QA Testing Needed

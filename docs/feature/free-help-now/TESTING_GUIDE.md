# Free Help Now v5.9 - Testing Guide

## Prerequisites

Before testing, you need to run the database migrations. Since `psql` and `pg` aren't installed locally, you have two options:

### Option 1: Install PostgreSQL Client (Recommended)

```bash
# macOS (Homebrew)
brew install postgresql@15

# Then run migrations
export DATABASE_URL="your_postgres_connection_string"
for migration in 086 087 088; do
  psql $DATABASE_URL -f apps/api/migrations/${migration}_*.sql
done
```

### Option 2: Use Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file contents:
   - `apps/api/migrations/086_add_free_help_columns.sql`
   - `apps/api/migrations/087_add_free_help_booking_type.sql`
   - `apps/api/migrations/088_update_booking_triggers_for_caas_v5_9.sql`
4. Run each migration in order

### Option 3: Use Database Connection Tool

If you have a database GUI (TablePlus, Postico, DBeaver, etc.):
1. Connect to your Postgres database
2. Open and execute each migration file in order

---

## Test Plan

### Phase 1: Backend Verification

#### 1.1 Verify Migrations Ran Successfully

```sql
-- Check profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'available_free_help';

-- Check caas_scores table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'caas_scores' AND column_name = 'available_free_help';

-- Check bookings table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name IN ('type', 'duration_minutes');

-- Check trigger exists
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_queue_caas_for_free_help';
```

Expected results:
- ✅ `profiles.available_free_help` exists (BOOLEAN)
- ✅ `caas_scores.available_free_help` exists (BOOLEAN)
- ✅ `bookings.type` exists (TEXT)
- ✅ `bookings.duration_minutes` exists (INTEGER)
- ✅ Trigger exists and is enabled

#### 1.2 Verify Redis Connection

```bash
# Run the dev server
npm run dev

# In browser console on any authenticated page:
fetch('/api/presence/free-help/online', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

Expected result:
- ✅ Should return error if not a tutor: `{"error": "Only tutors can offer free help"}`
- ✅ Or success if you're a tutor: `{"success": true, "status": "online"}`

---

### Phase 2: Tutor Flow

#### 2.1 Enable "Offer Free Help" Toggle

**Steps:**
1. Log in as a tutor account
2. Navigate to `/account/settings`
3. Look for "Offer Free Help" toggle
4. Toggle it ON

**Expected Results:**
- ✅ Toggle switches to ON state
- ✅ No errors in console
- ✅ Profile updates in database

**Verify in Database:**
```sql
SELECT id, full_name, available_free_help
FROM profiles
WHERE id = 'YOUR_TUTOR_ID';
```
- ✅ `available_free_help` should be `true`

**Verify in Redis:**
Check Redis CLI or Upstash dashboard:
```
EXISTS presence:free-help:YOUR_TUTOR_ID
TTL presence:free-help:YOUR_TUTOR_ID
```
- ✅ Key exists
- ✅ TTL is around 300 seconds (5 minutes)

#### 2.2 Test Heartbeat System

**Steps:**
1. Keep browser tab open with toggle ON
2. Wait 4 minutes
3. Check browser console for heartbeat logs

**Expected Results:**
- ✅ Console shows: `[Free Help Heartbeat] Success` every 4 minutes
- ✅ Redis TTL resets to 300 seconds after each heartbeat

#### 2.3 Test Auto-Offline (TTL Expiry)

**Steps:**
1. Toggle ON
2. Close all browser tabs/windows
3. Wait 6 minutes
4. Check database

**Expected Results:**
- ✅ `profiles.available_free_help` should be `false`
- ✅ Redis key should be deleted
- ✅ No errors in logs

#### 2.4 Test Manual Offline

**Steps:**
1. Toggle ON
2. Toggle OFF

**Expected Results:**
- ✅ Toggle switches to OFF
- ✅ Database updates immediately
- ✅ Redis key deleted immediately

---

### Phase 3: Student Flow

#### 3.1 View Tutor with Free Help Available

**Steps:**
1. Log in as a student
2. Have a tutor enable "Offer Free Help"
3. Navigate to that tutor's public profile

**Expected Results:**
- ✅ Green "Free Help Now" badge appears next to role
- ✅ "Get Free Help Now" button shows prominently (green, with sparkles icon)
- ✅ Button text: "Get Free Help Now"

#### 3.2 Create Free Help Session

**Steps:**
1. As student, click "Get Free Help Now" button
2. Wait for response

**Expected Results:**
- ✅ Button shows "Connecting..." (disabled state)
- ✅ Toast notification: "Connecting you now! The tutor has been notified."
- ✅ Browser redirects to `meet.new` Google Meet link
- ✅ New booking created in database

**Verify in Database:**
```sql
SELECT id, student_id, tutor_id, type, amount, duration_minutes, status, meet_link
FROM bookings
WHERE type = 'free_help'
ORDER BY created_at DESC
LIMIT 1;
```
- ✅ `type` = 'free_help'
- ✅ `amount` = 0
- ✅ `duration_minutes` = 30
- ✅ `status` = 'Confirmed'
- ✅ `meet_link` starts with 'https://meet.new'

#### 3.3 Test Rate Limiting

**Steps:**
1. Create 5 free help sessions as the same student
2. Attempt to create a 6th session

**Expected Results:**
- ✅ First 5 sessions succeed
- ✅ 6th session shows error: "You have reached the limit of 5 free sessions per 7 days"
- ✅ HTTP 429 status code

---

### Phase 4: UI Components

#### 4.1 Marketplace Card (TutorCard)

**Test Location:** Marketplace or anywhere TutorCard is rendered

**Steps:**
1. Have a tutor enable free help
2. View marketplace

**Expected Results:**
- ✅ "Free Help Now" badge appears on tutor's profile image (top left)
- ✅ Badge is green gradient with lightbulb icon
- ✅ Badge has pulsing animation
- ✅ Badge replaces "Free Trial" badge if both would show

#### 4.2 AboutCard (Community Tutor Badge)

**Test Location:** Public profile page

**Steps:**
1. Have a tutor complete 1+ free help sessions
2. View their public profile

**Expected Results:**
- ✅ "Community Tutor" badge appears in About card header
- ✅ Green gradient badge with heart icon
- ✅ Free sessions stat shows at bottom: "X free sessions given to the community"
- ✅ If tutor has 0 completed sessions, badge doesn't show

---

### Phase 5: CaaS Integration

#### 5.1 Test CaaS Queue Trigger

**Steps:**
1. Create a free help session
2. Manually mark it as completed in database:
```sql
UPDATE bookings
SET status = 'Completed'
WHERE id = 'BOOKING_ID' AND type = 'free_help';
```

**Expected Results:**
- ✅ Tutor is added to `caas_recalculation_queue` table
- ✅ Priority is 'high'
- ✅ Reason is 'free_help_session_completed'

**Verify:**
```sql
SELECT profile_id, priority, reason, created_at
FROM caas_recalculation_queue
WHERE reason = 'free_help_session_completed'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Phase 6: Error Handling

#### 6.1 Tutor Goes Offline Mid-Session

**Steps:**
1. Student views profile with free help available
2. Tutor disables toggle
3. Student clicks "Get Free Help Now"

**Expected Results:**
- ✅ Error: "This tutor is no longer offering free help"
- ✅ HTTP 410 status code

#### 6.2 Non-Tutor Tries to Toggle

**Steps:**
1. Log in as student
2. Navigate to `/account/settings`

**Expected Results:**
- ✅ "Offer Free Help" toggle doesn't appear (tutor-only)

#### 6.3 Unauthenticated User

**Steps:**
1. Log out
2. Try to call `/api/presence/free-help/online`

**Expected Results:**
- ✅ 401 Unauthorized error

---

## Success Criteria

All tests should pass:

### Database
- [x] All 3 migrations executed without errors
- [x] All columns exist
- [x] Trigger is installed and enabled

### Tutor Flow
- [x] Can toggle free help ON
- [x] Can toggle free help OFF
- [x] Heartbeat works correctly (4-minute interval)
- [x] Auto-offline works (5-minute TTL expiry)
- [x] Redis keys are created/deleted correctly

### Student Flow
- [x] Can see "Free Help Now" badge
- [x] Can click "Get Free Help Now" button
- [x] Gets redirected to Google Meet
- [x] Booking is created with correct data
- [x] Rate limiting works (5 sessions per 7 days)

### UI Components
- [x] TutorCard badge displays correctly
- [x] AboutCard "Community Tutor" badge displays
- [x] Free sessions count displays
- [x] ProfileHeroSection badge and button display

### CaaS Integration
- [x] Completed free help sessions trigger queue insertion
- [x] Priority and reason are correct

### Error Handling
- [x] Proper errors when tutor goes offline
- [x] Proper errors for non-tutors
- [x] Proper errors for unauthenticated users

---

## Known Issues / TODOs

### Phase 2 (Future Enhancements)
- [ ] **Notifications**: Replace placeholder with real Resend email + push notifications
- [ ] **CaaS Scoring**: Update TutorCaaSStrategy to award points for free_help sessions
- [ ] **Analytics**: Build admin dashboard for free help metrics
- [ ] **Post-Session Rating**: Add feedback system for free help sessions

---

## Troubleshooting

### Issue: Toggle doesn't work
- Check browser console for errors
- Verify Upstash Redis credentials in Vercel environment variables
- Check network tab for failed API calls

### Issue: "Get Free Help Now" button doesn't show
- Verify tutor has `available_free_help = true` in database
- Check Redis key exists: `presence:free-help:{tutorId}`
- Verify you're viewing as a different user (not own profile)

### Issue: Heartbeat fails
- Check console for 410 errors
- Verify Redis TTL hasn't expired
- Check if tutor manually toggled offline on another device

### Issue: Migrations fail
- Check Postgres version (should be 13+)
- Verify database connection string is correct
- Check if columns already exist (migrations are idempotent)

---

## Contact

If you encounter any issues not covered in this guide, please check:
1. Browser console for JavaScript errors
2. Network tab for failed API requests
3. Supabase logs for backend errors
4. Redis dashboard (Upstash) for presence data

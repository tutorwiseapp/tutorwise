# Tutorwise Comprehensive Test Cases

**Version:** 1.0
**Date:** 2026-02-02
**Total Test Cases:** 250+
**Priority Levels:** P0 (Critical), P1 (High), P2 (Medium), P3 (Low)

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [User Signup](#2-user-signup)
3. [Client Onboarding](#3-client-onboarding)
4. [Tutor Onboarding](#4-tutor-onboarding)
5. [Agent Onboarding](#5-agent-onboarding)
6. [Profile Management](#6-profile-management)
7. [Listing Management](#7-listing-management)
8. [Marketplace Search](#8-marketplace-search)
9. [Booking Creation](#9-booking-creation)
10. [Booking Management](#10-booking-management)
11. [Payment Processing](#11-payment-processing)
12. [Stripe Webhooks](#12-stripe-webhooks)
13. [Commission & Transactions](#13-commission--transactions)
14. [Withdrawals & Payouts](#14-withdrawals--payouts)
15. [Referral System](#15-referral-system)
16. [Wiselists](#16-wiselists)
17. [Free Help Now](#17-free-help-now)
18. [Reviews & Ratings](#18-reviews--ratings)
19. [Dashboard & Analytics](#19-dashboard--analytics)
20. [Security & Authorization](#20-security--authorization)
21. [Edge Cases & Error Handling](#21-edge-cases--error-handling)

---

## 1. Authentication & Authorization

### TC-AUTH-001: Email/Password Signup Success
**Priority:** P0
**Type:** E2E
**Precondition:** User not registered

**Test Steps:**
1. Navigate to signup page
2. Enter valid email: `newuser@example.com`
3. Enter strong password: `Test@123456`
4. Click "Sign Up"
5. Check email inbox for verification email

**Expected Result:**
- User account created in `auth.users`
- Profile created in `profiles` table with default role
- Email verification sent
- Redirect to email verification page
- Success message displayed

**Test Data:**
- Email: `tc-auth-001@tutorwise.test`
- Password: `SecurePass123!`

---

### TC-AUTH-002: Email/Password Login Success
**Priority:** P0
**Type:** E2E
**Precondition:** User registered and verified

**Test Steps:**
1. Navigate to login page
2. Enter registered email
3. Enter correct password
4. Click "Login"

**Expected Result:**
- User redirected to dashboard
- Session cookie set (HTTP-only)
- `active_role` loaded from profile
- Welcome message displayed

---

### TC-AUTH-003: Login with Invalid Credentials
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Navigate to login page
2. Enter valid email
3. Enter wrong password
4. Click "Login"

**Expected Result:**
- Login fails
- Error message: "Invalid email or password"
- User remains on login page
- No session created

---

### TC-AUTH-004: Google OAuth Login Success
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Click "Continue with Google"
2. Authorize app in Google OAuth consent screen
3. Return to app

**Expected Result:**
- User authenticated
- Profile created if new user
- Redirect to dashboard or onboarding
- Session cookie set

---

### TC-AUTH-005: Password Reset Request
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Navigate to login page
2. Click "Forgot Password?"
3. Enter registered email
4. Click "Send Reset Link"

**Expected Result:**
- Password reset email sent
- Success message: "Check your email for reset link"
- Email contains unique reset token
- Token expires in 1 hour

---

### TC-AUTH-006: Password Reset Completion
**Priority:** P1
**Type:** E2E
**Precondition:** Password reset email received

**Test Steps:**
1. Click reset link in email
2. Enter new password
3. Confirm new password
4. Click "Reset Password"

**Expected Result:**
- Password updated in database
- User redirected to login page
- Success message displayed
- Old password no longer works
- New password works for login

---

### TC-AUTH-007: Global Logout (All Devices)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login from Device A (Browser 1)
2. Login from Device B (Browser 2)
3. From Device A, call `POST /api/auth/logout`
4. Attempt to access protected page on Device B

**Expected Result:**
- All sessions invalidated
- Device B redirected to login
- Supabase auth session cleared
- OAuth tokens revoked

---

### TC-AUTH-008: Session Expiry
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Login successfully
2. Wait for session timeout (or mock expiry)
3. Attempt to access protected route

**Expected Result:**
- User redirected to login page
- Error message: "Session expired, please login again"
- Session cookie cleared

---

### TC-AUTH-009: Signup with Existing Email
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Navigate to signup page
2. Enter email of existing user
3. Enter password
4. Click "Sign Up"

**Expected Result:**
- Signup fails
- Error message: "Email already registered"
- No duplicate account created

---

### TC-AUTH-010: Weak Password Rejection
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Navigate to signup page
2. Enter email
3. Enter weak password: `123`
4. Click "Sign Up"

**Expected Result:**
- Validation error displayed
- Error message: "Password must be at least 8 characters with uppercase, lowercase, and number"
- Account not created

---

## 2. User Signup

### TC-SIGNUP-001: Signup with Email Verification
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Complete signup flow
2. Check email for verification link
3. Click verification link
4. Redirect to app

**Expected Result:**
- Email contains verification link with token
- Clicking link verifies `email_confirmed_at` in auth.users
- User can now login
- Unverified users cannot access protected routes

---

### TC-SIGNUP-002: Resend Verification Email
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Signup but don't verify
2. Attempt login
3. See "Email not verified" message
4. Click "Resend Verification Email"

**Expected Result:**
- New verification email sent
- Link contains fresh token
- Old token invalidated

---

### TC-SIGNUP-003: Signup with Invalid Email Format
**Priority:** P2
**Type:** Unit

**Test Steps:**
1. Enter invalid email: `notanemail`
2. Attempt signup

**Expected Result:**
- Validation error: "Invalid email format"
- Signup prevented

**Test Data:**
- Invalid emails: `test`, `test@`, `@example.com`, `test @example.com`

---

### TC-SIGNUP-004: Signup with Special Characters in Name
**Priority:** P3
**Type:** Integration

**Test Steps:**
1. Signup with name: `O'Brien-Smith`
2. Complete signup

**Expected Result:**
- Name stored correctly with apostrophe and hyphen
- No SQL injection or escaping issues
- Name displays correctly in UI

---

### TC-SIGNUP-005: Concurrent Signups with Same Email
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Initiate signup from 2 browsers simultaneously
2. Use same email
3. Submit both forms at same time

**Expected Result:**
- Only 1 account created
- Second signup fails with "Email already registered"
- Database constraint prevents duplicate

---

## 3. Client Onboarding

### TC-CLIENT-001: Complete Client Onboarding (Happy Path)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Login as new client
2. Select "Client" role
3. **Step 1 - Welcome:**
   - Click "Get Started"
4. **Step 2 - Subjects & Preferences:**
   - Select subjects: Mathematics, Physics
   - Select levels: GCSE, A-Level
   - Enter budget: £30-£50/hour
   - Select preferences: Online, In-Person
   - Click "Next"
5. **Step 3 - Completion:**
   - Click "Complete Onboarding"

**Expected Result:**
- Progress saved at each step in `onboarding_progress` JSONB
- Profile updated with role `client` in `roles[]`
- `active_role` set to `client`
- Redirect to client dashboard
- Onboarding marked complete

---

### TC-CLIENT-002: Save and Resume Client Onboarding
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Start client onboarding
2. Complete step 1
3. Navigate away (close browser)
4. Login again
5. Check if onboarding resumes

**Expected Result:**
- `GET /api/onboarding/progress/client` returns saved progress
- User sees "Resume Onboarding" prompt
- Clicking prompt takes to Step 2 (where they left off)
- Previous selections pre-filled

---

### TC-CLIENT-003: Skip Optional Onboarding Steps
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Start client onboarding
2. Click "Skip" on optional steps
3. Complete required steps only

**Expected Result:**
- Onboarding completes successfully
- Optional fields empty in profile
- No validation errors

---

### TC-CLIENT-004: Clear Client Onboarding Progress
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Complete 2 steps of onboarding
2. Call `DELETE /api/onboarding/progress/client`
3. Restart onboarding

**Expected Result:**
- Onboarding progress deleted from database
- User starts from Step 1
- No pre-filled data

---

### TC-CLIENT-005: Client Onboarding with Multiple Subjects
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Select 10+ subjects during onboarding
2. Complete onboarding

**Expected Result:**
- All subjects stored in array
- No truncation or limit errors
- Subjects displayed correctly in profile

---

## 4. Tutor Onboarding

### TC-TUTOR-001: Complete Tutor Onboarding (Happy Path)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Login as new user
2. Select "Tutor" role
3. **Step 1 - Personal Info:**
   - Enter full name: John Doe
   - Enter phone: +44 7700 900000
   - Enter address: 123 Main St, London, SW1A 1AA
   - Click "Next"
4. **Step 2 - Professional Details:**
   - Enter qualifications: BSc Mathematics
   - Enter teaching experience: 5 years
   - Select subjects: Mathematics
   - Select levels: GCSE, A-Level
   - Enter hourly rate: £40
   - Click "Next"
5. **Step 3 - Verification:**
   - Upload identity document (passport photo)
   - Enter document number: AB123456
   - Upload DBS certificate
   - Enter DBS number: 001234567890
   - Click "Next"
6. **Step 4 - Availability:**
   - Set recurring availability: Mon-Fri 16:00-20:00
   - Set timezone: Europe/London
   - Click "Next"
7. **Step 5 - Completion:**
   - Review details
   - Click "Complete Onboarding"

**Expected Result:**
- All data saved to profile and `role_details` table
- Documents uploaded to Vercel Blob
- Verification status: `identity_verified: false` (pending admin review)
- Availability saved as JSONB array
- Redirect to tutor dashboard
- Onboarding marked complete

---

### TC-TUTOR-002: Tutor Verification Document Upload
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. During onboarding Step 3
2. Click "Upload Identity Document"
3. Select file: `passport.jpg` (2MB, JPG)
4. Wait for upload

**Expected Result:**
- File uploaded to Vercel Blob
- `identity_verification_document_url` stored in profile
- Thumbnail displayed in UI
- File accessible via URL

---

### TC-TUTOR-003: Invalid Verification Document Format
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Attempt to upload `.exe` file as identity document
2. Check validation

**Expected Result:**
- Upload rejected
- Error: "Invalid file format. Please upload JPG, PNG, or PDF"
- No file stored

---

### TC-TUTOR-004: Oversized Verification Document
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Attempt to upload 20MB file
2. Check validation

**Expected Result:**
- Upload rejected
- Error: "File size exceeds 10MB limit"
- No file stored

---

### TC-TUTOR-005: Tutor Availability Configuration (Recurring)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. During onboarding Step 4
2. Add recurring availability:
   - Type: Recurring
   - Days: Monday, Wednesday, Friday
   - Time: 14:00 - 18:00
3. Save availability

**Expected Result:**
- Availability stored as:
```json
{
  "type": "recurring",
  "days": ["Monday", "Wednesday", "Friday"],
  "startTime": "14:00",
  "endTime": "18:00"
}
```
- Availability displayed in calendar view
- Used for booking validation

---

### TC-TUTOR-006: Tutor Availability Configuration (One-Time)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Add one-time availability:
   - Type: One-Time
   - Date: 2026-02-15
   - Time: 10:00 - 12:00
2. Save availability

**Expected Result:**
- Availability stored with `fromDate` and `toDate`
- Only shows for specified date
- Expires after date passes

---

### TC-TUTOR-007: Tutor with Multiple Qualifications
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Enter multiple qualifications:
   - BSc Mathematics - University of Cambridge
   - PGCE - UCL Institute of Education
   - QTS
2. Complete onboarding

**Expected Result:**
- All qualifications stored as array
- Displayed as bullet list in profile
- Searchable in marketplace

---

### TC-TUTOR-008: Tutor Onboarding Without DBS (Optional)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Complete tutor onboarding
2. Skip DBS certificate upload
3. Complete onboarding

**Expected Result:**
- Onboarding completes successfully
- `dbs_verified: false`
- Profile shows "DBS: Not Verified"
- Can still create listings (optional verification)

---

## 5. Agent Onboarding

### TC-AGENT-001: Complete Agent Onboarding (Happy Path)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Login as new user
2. Select "Agent" role
3. **Step 1 - Welcome:**
   - Click "Get Started"
4. **Step 2 - Agency Details:**
   - Enter agency name: Elite Tutors Ltd
   - Enter commission rate: 15%
   - Click "Next"
5. **Step 3 - Services:**
   - Select service areas: GCSE, A-Level
   - Select subjects: Mathematics, Physics, Chemistry
   - Click "Next"
6. **Step 4 - Capacity:**
   - Enter tutor capacity: 50
   - Enter current tutors: 10
   - Click "Next"
7. **Step 5 - Completion:**
   - Click "Complete Onboarding"

**Expected Result:**
- Data saved to `role_details` with `role: 'agent'`
- Redirect to agent dashboard
- Can generate referral links
- Can view referral analytics

---

### TC-AGENT-002: Agent Referral Code Generation
**Priority:** P1
**Type:** Integration
**Precondition:** Agent onboarding complete

**Test Steps:**
1. Navigate to agent dashboard
2. Click "Generate Referral Link"
3. Copy referral link

**Expected Result:**
- Referral link format: `https://tutorwise.app/signup?ref=ABC123`
- `referral_code` stored in profile
- Code unique per agent
- Referral tracking enabled

---

### TC-AGENT-003: Agent with Custom Commission Rate
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. During onboarding, enter commission rate: 20%
2. Complete onboarding
3. Refer a client who books

**Expected Result:**
- Commission rate stored in `role_details`
- Agent receives 20% of booking (instead of default 10%)
- Transaction reflects custom rate

**Note:** Confirm business logic allows custom rates

---

## 6. Profile Management

### TC-PROFILE-001: View Own Profile
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login as user
2. Navigate to `/profile/[userId]`
3. View profile page

**Expected Result:**
- Profile displays:
  - Full name
  - Bio and headline
  - Avatar
  - Roles (badges)
  - Stats (sessions completed, rating)
  - Qualifications (if tutor)
  - Contact info (private, only to user)

---

### TC-PROFILE-002: View Other User's Profile (Public)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login as Client A
2. Navigate to Tutor B's profile
3. View profile page

**Expected Result:**
- Public profile displayed:
  - Name, avatar, bio
  - Tutor stats (rating, reviews)
  - Qualifications
  - Listings (if any)
- Private info hidden:
  - Email, phone
  - Address
  - Document numbers

---

### TC-PROFILE-003: Edit Profile Information
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Navigate to profile settings
2. Click "Edit Profile"
3. Update bio: "Experienced mathematics tutor"
4. Update headline: "GCSE & A-Level Expert"
5. Click "Save"

**Expected Result:**
- `PATCH /api/profiles/[id]` called
- Profile updated in database
- Success message: "Profile updated"
- Changes reflected immediately

---

### TC-PROFILE-004: Upload Avatar
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Navigate to profile settings
2. Click "Change Avatar"
3. Select image: `avatar.jpg` (500KB)
4. Crop/adjust image
5. Click "Upload"

**Expected Result:**
- Image uploaded to Vercel Blob
- `avatar_url` updated in profile
- Avatar displayed in navigation bar
- Old avatar removed from storage (cleanup)

---

### TC-PROFILE-005: Upload Cover Photo
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Navigate to profile settings
2. Click "Change Cover Photo"
3. Select image: `cover.jpg` (1MB)
4. Click "Upload"

**Expected Result:**
- Image uploaded to Vercel Blob
- `cover_photo_url` updated
- Cover photo displayed on profile page

---

### TC-PROFILE-006: Upload Bio Video (CaaS v5.5)
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Navigate to profile settings → CaaS section
2. Click "Upload Bio Video"
3. Select video: `intro.mp4` (30 seconds, 10MB)
4. Click "Upload"

**Expected Result:**
- Video uploaded to Vercel Blob
- `bio_video_url` updated
- Video player embedded in profile
- CaaS score updated (credibility boost)

---

### TC-PROFILE-007: Invalid Video Format
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Attempt to upload `.avi` video
2. Check validation

**Expected Result:**
- Upload rejected
- Error: "Invalid format. Please upload MP4, MOV, or WebM"
- No file stored

---

### TC-PROFILE-008: Update Qualifications (Tutor)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Login as tutor
2. Navigate to profile settings
3. Add qualification: "MSc Physics - Imperial College London"
4. Save

**Expected Result:**
- Qualification added to `qualifications` array
- Displayed in profile and listings
- CaaS score updated

---

### TC-PROFILE-009: Identity Verification Status
**Priority:** P1
**Type:** Integration
**Precondition:** Tutor uploaded identity document

**Test Steps:**
1. Admin reviews document
2. Admin marks as verified
3. Tutor views profile

**Expected Result:**
- `identity_verified: true`
- Green "Verified" badge displayed
- Listing shows "Identity Verified"
- Higher ranking in search

---

### TC-PROFILE-010: CaaS Score Calculation
**Priority:** P2
**Type:** Unit

**Test Steps:**
1. Profile with:
   - Bio video: +10 points
   - 5 qualifications: +20 points
   - 50 sessions completed: +30 points
   - Average rating 4.8: +25 points
   - Identity verified: +15 points
2. Calculate CaaS score

**Expected Result:**
- CaaS score: 100/100
- Score displayed as badge
- Higher scores rank higher in search

---

## 7. Listing Management

### TC-LISTING-001: Create Session Listing (Published)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Login as tutor
2. Navigate to "My Listings"
3. Click "Create New Listing"
4. Fill form:
   - **Listing Type:** Session
   - **Title:** GCSE Mathematics Tutoring
   - **Description:** Comprehensive GCSE maths support...
   - **Subjects:** Mathematics
   - **Levels:** GCSE
   - **Hourly Rate:** £35
   - **Delivery Mode:** Online, In-Person
   - **Location:** London
   - **Availability:** Mon-Fri 16:00-20:00
   - **Free Trial:** Yes, 30 minutes
5. Click "Publish"

**Expected Result:**
- `POST /api/listings` creates listing
- `status: 'published'`
- `listing_category: 'session'`
- Listing visible in marketplace immediately
- Searchable by subjects, levels, location
- Shows in "My Listings"

---

### TC-LISTING-002: Create Course Listing
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Create new listing
2. Select **Listing Type:** Course
3. Fill course-specific fields:
   - **Course Start Date:** 2026-03-01
   - **Course End Date:** 2026-05-31
   - **Duration:** 12 weeks
   - **Max Students:** 15
   - **Curriculum:**
     - Module 1: Algebra
     - Module 2: Geometry
     - Module 3: Statistics
   - **Total Hours:** 36
   - **Certificate:** Yes
4. Publish

**Expected Result:**
- `listing_category: 'course'`
- Course-specific fields populated
- Curriculum stored as JSONB
- Listing shows "Course" badge
- Start/end dates displayed

---

### TC-LISTING-003: Create Job Listing (Client Seeking Tutor)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Login as client (or agent)
2. Create listing
3. Select **Listing Type:** Job
4. Fill job-specific fields:
   - **Job Title:** Mathematics Tutor Needed for Year 11 Student
   - **Job Type:** Part-Time
   - **Job Deadline:** 2026-02-28
   - **Requirements:**
     - Min experience: 3 years
     - Qualifications: QTS, Degree
   - **Budget Range:** £30-£40/hour
   - **Employment Type:** Contract
   - **Contract Length:** 6 months
   - **Application Deadline:** 2026-02-15
5. Publish

**Expected Result:**
- `listing_category: 'job'`
- `created_as_role: 'client'` or `'agent'`
- Job-specific fields (20+) populated
- Tutors can view and apply
- Application deadline enforced

---

### TC-LISTING-004: Save Listing as Draft
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Start creating listing
2. Fill partial information
3. Click "Save as Draft"

**Expected Result:**
- `status: 'draft'`
- Listing saved but not published
- Not visible in marketplace
- Editable from "My Listings"
- Can publish later

---

### TC-LISTING-005: Edit Published Listing
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Login as tutor
2. Navigate to "My Listings"
3. Select published listing
4. Click "Edit"
5. Update hourly rate: £35 → £40
6. Click "Save"

**Expected Result:**
- `PATCH /api/listings/[id]`
- Listing updated in database
- Changes reflected in marketplace
- Existing bookings unaffected (snapshot fields)

---

### TC-LISTING-006: Unpublish Listing
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. From listing detail
2. Click "Unpublish"
3. Confirm action

**Expected Result:**
- `status: 'unpublished'`
- Listing removed from marketplace search
- Existing bookings still valid
- Listing visible in "My Listings" with "Unpublished" badge
- Can republish later

---

### TC-LISTING-007: Archive Listing
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Select listing
2. Click "Archive"
3. Confirm

**Expected Result:**
- `status: 'archived'`
- `archived_at` timestamp set
- Removed from marketplace
- Moved to "Archived" section in dashboard
- Cannot be republished (soft delete)

---

### TC-LISTING-008: Delete Listing (Is Deletable)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Select listing with `is_deletable: true`
2. Click "Delete"
3. Confirm deletion

**Expected Result:**
- Listing deleted from database (hard delete)
- Associated data cleaned up
- Cannot be recovered

---

### TC-LISTING-009: Cannot Delete Template Listing
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Select listing with `is_template: true`
2. Attempt to delete

**Expected Result:**
- Delete button disabled
- Error: "Template listings cannot be deleted"
- Listing remains in database

---

### TC-LISTING-010: Upload Listing Images
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. During listing creation
2. Click "Upload Images"
3. Select 5 images (total 5MB)
4. Click "Upload"

**Expected Result:**
- All images uploaded to Vercel Blob
- URLs stored in `images[]` array
- Images displayed as gallery in listing detail
- First image used as thumbnail

---

### TC-LISTING-011: Listing with Video
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. During listing creation
2. Enter YouTube video URL: `https://youtube.com/watch?v=ABC123`
3. Save listing

**Expected Result:**
- `video_url` stored
- Video embedded in listing detail (YouTube player)
- Thumbnail extracted and displayed in search results

---

### TC-LISTING-012: Add Pricing Packages
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. During listing creation
2. Add pricing package:
   - Name: "10-Session Bundle"
   - Price: £320 (10% discount)
   - Sessions: 10
   - Validity: 3 months
3. Add another package:
   - Name: "20-Session Bundle"
   - Price: £600 (15% discount)
   - Sessions: 20
   - Validity: 6 months
4. Save listing

**Expected Result:**
- Packages stored in `pricing_packages` JSONB array
- Displayed as options in booking flow
- Discounted prices calculated correctly
- Client can select package during booking

---

### TC-LISTING-013: Listing View Count Tracking
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. View listing detail page
2. Check `GET /api/listings/[id]/track-view`
3. View again from different session

**Expected Result:**
- `view_count` incremented by 1
- Duplicate views from same session not counted (24-hour cookie)
- View count displayed in listing stats
- Used for "Most Viewed" sorting

---

### TC-LISTING-014: Listing Inquiry Count
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Send inquiry to tutor via listing
2. Check listing stats

**Expected Result:**
- `inquiry_count` incremented
- Displayed in tutor's analytics
- Used for engagement metrics

---

### TC-LISTING-015: Free Trial Configuration
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. During listing creation
2. Enable "Free Trial"
3. Set duration: 30 minutes
4. Save listing

**Expected Result:**
- `free_trial: true`
- `trial_duration_minutes: 30`
- Listing shows "Free 30-min Trial" badge
- Clients can book trial session
- No payment required for trial

---

## 8. Marketplace Search

### TC-SEARCH-001: Search by Subject (Filter)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Navigate to marketplace
2. Select subject filter: "Mathematics"
3. Click "Search"

**Expected Result:**
- `GET /api/marketplace/search?subjects=Mathematics`
- Results contain only listings with Mathematics
- Result count displayed
- Pagination if > 20 results

---

### TC-SEARCH-002: Search by Multiple Filters
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Apply filters:
   - Subjects: Mathematics
   - Levels: GCSE
   - Delivery Mode: Online
   - Price Range: £20-£40
2. Search

**Expected Result:**
- Results match ALL filters (AND logic)
- Empty state if no matches
- Filter tags displayed above results
- Can remove individual filters

---

### TC-SEARCH-003: Search by Location (City)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Enter location: "London"
2. Search

**Expected Result:**
- Results filtered by `location_city = 'London'`
- Includes tutors with "In-Person" delivery mode in London
- Online tutors may also appear (location-agnostic)

---

### TC-SEARCH-004: Sort by Hourly Rate (Low to High)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Search for Mathematics tutors
2. Sort by: "Price: Low to High"

**Expected Result:**
- Results sorted ascending by `hourly_rate`
- Lowest price first
- Sorting persists across pagination

---

### TC-SEARCH-005: Sort by Rating (High to Low)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Search
2. Sort by: "Rating"

**Expected Result:**
- Results sorted descending by `average_rating`
- 5-star tutors first
- Tutors with no rating shown last

---

### TC-SEARCH-006: Semantic Search (AI-Powered)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Enter natural language query: "I need help with calculus for my university exam"
2. Click "Search"

**Expected Result:**
- `POST /api/marketplace/search` with semantic mode
- Query converted to embedding
- Cosine similarity calculated against listing embeddings
- Results ranked by relevance (not exact keyword match)
- Shows A-Level/University Mathematics tutors

---

### TC-SEARCH-007: Free Trial Only Filter
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Enable filter: "Free Trial Only"
2. Search

**Expected Result:**
- Results contain only listings with `free_trial: true`
- Badge displayed on results

---

### TC-SEARCH-008: Search Pagination
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Search returns 45 results
2. Page 1 shows 20 results
3. Click "Next" → Page 2

**Expected Result:**
- `limit=20&offset=20`
- Page 2 shows results 21-40
- Page 3 shows results 41-45
- "Previous" button enabled on Page 2+

---

### TC-SEARCH-009: No Results Found
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Search for non-existent subject: "Underwater Basket Weaving"
2. Submit

**Expected Result:**
- Empty state displayed
- Message: "No tutors found matching your criteria"
- Suggestions: "Try removing some filters" or "Search for different subjects"

---

### TC-SEARCH-010: Search Autocomplete
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Start typing in search box: "Math"
2. View autocomplete suggestions

**Expected Result:**
- `POST /api/marketplace/autocomplete?query=Math`
- Suggestions displayed:
  - Mathematics
  - Mathematics (GCSE)
  - Mathematics (A-Level)
- Clicking suggestion populates search
- Can arrow-key navigate suggestions

---

### TC-SEARCH-011: Save Search
**Priority:** P2
**Type:** Integration
**Precondition:** User logged in

**Test Steps:**
1. Perform search with filters
2. Click "Save This Search"
3. Name search: "GCSE Maths London"
4. Save

**Expected Result:**
- `POST /api/marketplace/saved-searches`
- Search parameters saved (subjects, levels, location, price)
- Appears in "Saved Searches" dashboard
- Can execute saved search later
- Notification emails for new matching listings (optional)

---

## 9. Booking Creation

### TC-BOOKING-001: Create Booking from Listing (Happy Path)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Login as client
2. Search for listing
3. View listing detail
4. Select available time slot: Monday 14:00
5. Select duration: 60 minutes
6. Click "Book Now"
7. Confirm booking details
8. Redirect to payment

**Expected Result:**
- `POST /api/bookings` creates booking
- Booking data:
```json
{
  "client_id": "<client_profile_id>",
  "tutor_id": "<tutor_profile_id>",
  "listing_id": "<listing_id>",
  "service_name": "GCSE Mathematics Tutoring",
  "session_start_time": "2026-02-10T14:00:00Z",
  "session_duration": 60,
  "amount": 35,
  "status": "Pending",
  "payment_status": "Pending",
  "booking_source": "listing"
}
```
- Snapshot fields copied from listing (subjects, levels, hourly_rate)
- Booking ID returned
- Redirect to Stripe checkout with booking_id in metadata

---

### TC-BOOKING-002: Create Booking from Profile (No Listing)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Login as client
2. View tutor's profile (not via listing)
3. Click "Book This Tutor"
4. Enter booking details:
   - Service: Custom lesson
   - Date/time: 2026-02-12 15:00
   - Duration: 90 minutes
5. Enter agreed price: £50
6. Submit

**Expected Result:**
- Booking created with `listing_id: null`
- `booking_source: 'profile'`
- Service name entered manually
- All other fields same as TC-BOOKING-001

---

### TC-BOOKING-003: Booking with Agent Referral
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Agent generates referral link
2. Client signs up via referral link → `referred_by_profile_id` set
3. Client books tutor
4. Complete payment

**Expected Result:**
- Booking created with `agent_id: <referrer_profile_id>`
- `booking_type: 'referred'`
- Payment webhook splits commission:
  - Tutor: 80% (£28)
  - Agent: 10% (£3.50)
  - Platform: 10% (£3.50)
- Agent sees commission in financials

---

### TC-BOOKING-004: Booking with Wiselist Referrer (v5.7)
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. User A creates wiselist with Tutor B
2. User A shares wiselist link with User C
3. User C clicks link → Browses wiselist
4. User C books Tutor B from wiselist

**Expected Result:**
- Booking metadata includes `wiselist_referrer_id: <User A's profile_id>`
- User A receives small referral bonus (if configured)
- Attribution tracked for analytics

---

### TC-BOOKING-005: Booking with Pricing Package
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Listing offers "10-Session Bundle" (£320)
2. Client selects package during booking
3. Submit booking

**Expected Result:**
- Booking `amount: 320`
- Metadata includes package details
- Client charged £320 once
- 10 sessions allocated
- Each session booking references parent package

**Note:** Verify if packages create 10 individual bookings or 1 parent + 10 child sessions

---

### TC-BOOKING-006: Free Trial Booking
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Client books listing with `free_trial: true`
2. Select trial session
3. Submit booking

**Expected Result:**
- Booking `amount: 0`
- `free_trial: true` in metadata
- No payment required
- Booking status: `Confirmed` immediately
- Email notification sent
- Trial limit enforced (1 per client-tutor pair)

---

### TC-BOOKING-007: Availability Validation (Slot Available)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Tutor has availability: Mon 14:00-16:00
2. Client books: Mon 14:00-15:00 (60 min)
3. Submit

**Expected Result:**
- Booking succeeds
- Availability validated against `availability[]` in listing
- Time slot within available period

---

### TC-BOOKING-008: Availability Validation (Slot Unavailable)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Client books: Mon 13:00-14:00
2. Tutor unavailable at 13:00

**Expected Result:**
- Booking fails
- Error: "Selected time slot is not available"
- Booking not created
- Client redirected to reschedule

---

### TC-BOOKING-009: Double-Booking Prevention (Same Time Slot)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Client A books Tutor X: Mon 14:00-15:00
2. Client B attempts to book Tutor X: Mon 14:00-15:00 (simultaneously)

**Expected Result:**
- First booking succeeds
- Second booking fails
- Error: "This time slot has been taken"
- Database constraint prevents duplicate
- Availability updated after first booking

---

### TC-BOOKING-010: Overlapping Booking Prevention
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Tutor has booking: Mon 14:00-15:00
2. Client attempts booking: Mon 14:30-15:30 (overlaps)

**Expected Result:**
- Booking fails
- Error: "Tutor has a conflicting booking"
- No overlap allowed

---

### TC-BOOKING-011: Past Date Booking Validation
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Client selects date: 2026-01-01 (past)
2. Submit booking

**Expected Result:**
- Validation error: "Cannot book sessions in the past"
- Booking not created

---

### TC-BOOKING-012: Far Future Booking
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Client selects date: 2027-12-31 (>1 year ahead)
2. Submit

**Expected Result:**
- Booking succeeds (if tutor allows)
- OR validation error if max booking window enforced (e.g., 6 months)

**Note:** Confirm business rule for max advance booking

---

### TC-BOOKING-013: Booking with Invalid Duration
**Priority:** P2
**Type:** Unit

**Test Steps:**
1. Enter duration: 0 minutes
2. Submit

**Expected Result:**
- Validation error: "Duration must be at least 15 minutes"
- Booking not created

**Test Data:**
- Invalid durations: 0, -10, 1441 (>24 hours)

---

### TC-BOOKING-014: Snapshot Fields Accuracy
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Listing has:
   - Subjects: [Mathematics]
   - Levels: [GCSE]
   - Hourly Rate: £35
   - Location Type: Online
2. Client creates booking
3. Tutor edits listing → Changes hourly rate to £40
4. Check booking data

**Expected Result:**
- Booking snapshot fields unchanged:
  - `subjects: [Mathematics]`
  - `levels: [GCSE]`
  - `hourly_rate: 35`
  - `location_type: online`
- Booking amount remains £35
- Future bookings use new rate (£40)

---

### TC-BOOKING-015: Booking Confirmation Email
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Create booking (Pending)
2. Complete payment (webhook triggers)
3. Check client's email inbox

**Expected Result:**
- Email received with:
  - Subject: "Booking Confirmed - GCSE Mathematics with John Doe"
  - Booking details (date, time, duration, tutor name)
  - Tutor contact info (revealed after payment)
  - Calendar invite attachment (.ics)
  - Links: View Booking, Contact Tutor, Cancel Booking

---

### TC-BOOKING-016: Tutor Booking Notification Email
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Client completes booking + payment
2. Check tutor's email inbox

**Expected Result:**
- Email received with:
  - Subject: "New Booking - GCSE Mathematics on Feb 10"
  - Client name and session details
  - Links: View Booking, Accept, Decline

---

## 10. Booking Management

### TC-BOOKING-MGT-001: View Bookings (Client Dashboard)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Login as client
2. Navigate to dashboard
3. View "My Bookings" section

**Expected Result:**
- `GET /api/bookings` filtered by `client_id`
- Displays bookings made by client
- Shows: tutor name, subject, date/time, status, amount
- Can filter by status: Pending, Confirmed, Completed, Cancelled
- Sorted by session date (upcoming first)

---

### TC-BOOKING-MGT-002: View Bookings (Tutor Dashboard)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Login as tutor
2. Navigate to dashboard
3. View "My Bookings" section

**Expected Result:**
- `GET /api/bookings` filtered by `tutor_id`
- Displays bookings received
- Shows: client name, subject, date/time, status, amount
- Can accept/decline pending bookings

---

### TC-BOOKING-MGT-003: Update Booking Status (Tutor Accepts)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Tutor views Pending booking
2. Clicks "Accept"

**Expected Result:**
- `PATCH /api/bookings/[id]/status` with `{ status: 'Confirmed' }`
- Booking status updated
- Client notified via email
- Calendar event sent to both parties

---

### TC-BOOKING-MGT-004: Update Booking Status (Tutor Declines)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Tutor views Pending booking
2. Clicks "Decline"
3. Provides reason (optional)

**Expected Result:**
- `status: 'Cancelled'`
- Payment refunded to client (if already paid)
- Client notified with reason
- Availability slot reopened

---

### TC-BOOKING-MGT-005: Cancel Booking (Client Before Payment)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Client creates booking (Pending)
2. Before paying, clicks "Cancel Booking"
3. Confirm cancellation

**Expected Result:**
- `status: 'Cancelled'`
- No refund needed (not paid yet)
- Tutor notified
- Availability slot reopened

---

### TC-BOOKING-MGT-006: Cancel Booking (Client After Payment)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Client completes booking + payment (Confirmed)
2. Clicks "Cancel Booking"
3. Confirm cancellation

**Expected Result:**
- `status: 'Cancelled'`
- Refund processed via Stripe
- `payment_status: 'Refunded'`
- Cancellation fee applied if < 24 hours notice (per business rule)
- Transaction created: T-TYPE-REFUND
- Tutor compensated for late cancellation (if applicable)

---

### TC-BOOKING-MGT-007: Complete Booking (Mark as Completed)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Session date passes
2. Tutor or system marks booking as Completed

**Expected Result:**
- `status: 'Completed'`
- Triggers payout clearing period (funds move to clearing)
- Client prompted to leave review
- Session counts increment for both client and tutor

---

### TC-BOOKING-MGT-008: Reschedule Booking
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Client views Confirmed booking
2. Clicks "Reschedule"
3. Selects new time slot
4. Tutor approves reschedule

**Expected Result:**
- `session_start_time` updated
- Both parties notified
- No refund/repayment needed
- Updated calendar invites sent

**Note:** Verify if reschedule feature exists or planned

---

### TC-BOOKING-MGT-009: Dispute Booking
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Client claims session didn't happen
2. Opens dispute
3. Provides evidence

**Expected Result:**
- `payment_status: 'Disputed'`
- Admin notified for review
- Funds held in escrow
- Both parties can submit evidence
- Resolution: Refund to client OR release to tutor

---

### TC-BOOKING-MGT-010: No-Show Handling (Client)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Booking Confirmed
2. Client doesn't attend
3. Tutor reports no-show

**Expected Result:**
- Tutor receives full payment (no refund)
- Client penalized (warning/fee)
- Booking marked Completed with "No-Show" flag

---

### TC-BOOKING-MGT-011: No-Show Handling (Tutor)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Booking Confirmed
2. Tutor doesn't attend
3. Client reports no-show

**Expected Result:**
- Full refund to client
- Tutor penalized (warning/suspension)
- Admin review triggered

---

## 11. Payment Processing

### TC-PAYMENT-001: Successful Payment (Happy Path)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Client creates booking (£35)
2. Redirect to Stripe checkout
3. Enter test card: `4242424242424242`
4. Enter expiry: 12/28, CVC: 123
5. Complete payment

**Expected Result:**
- `POST /api/stripe/checkout` creates checkout session
- Metadata: `{ booking_id, client_id, tutor_id, amount }`
- Stripe processes payment
- Webhook `checkout.session.completed` fired
- `POST /api/webhooks/stripe` receives event
- RPC `handle_successful_payment(booking_id, stripe_checkout_id)` called
- Booking updated: `payment_status: 'Paid'`, `status: 'Confirmed'`
- Transactions created (see TC-COMMISSION-001)
- Emails sent to client and tutor
- Redirect to confirmation page

---

### TC-PAYMENT-002: Payment Declined (Insufficient Funds)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Client creates booking
2. Enter test card: `4000000000009995` (insufficient funds)
3. Attempt payment

**Expected Result:**
- Stripe declines payment
- Error page displayed: "Your card has insufficient funds"
- Client can retry with different card
- Booking remains `status: 'Pending'`
- No transaction created
- No email sent

---

### TC-PAYMENT-003: Payment Declined (Invalid Card)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Enter test card: `4000000000000002` (generic decline)
2. Attempt payment

**Expected Result:**
- Stripe declines payment
- Error: "Your card was declined"
- Client can retry
- Booking remains Pending

---

### TC-PAYMENT-004: Payment with 3D Secure (SCA)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Enter test card: `4000002500003155` (requires authentication)
2. Complete Stripe 3D Secure modal
3. Authenticate and confirm

**Expected Result:**
- Payment succeeds after authentication
- Webhook fired
- Booking confirmed
- Complies with SCA requirements

---

### TC-PAYMENT-005: Payment Timeout
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Client creates booking
2. Redirected to Stripe checkout
3. Leave page open for 30 minutes (session expires)
4. Attempt to complete payment

**Expected Result:**
- Checkout session expired
- Error: "Session expired, please try again"
- Client returns to booking page
- Can create new checkout session

---

### TC-PAYMENT-006: Multiple Payment Attempts (Idempotency)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Client completes payment
2. Webhook fired → Booking confirmed
3. Stripe retries webhook (due to timeout)
4. Webhook received again with same `stripe_checkout_id`

**Expected Result:**
- Idempotency check detects duplicate
- Transaction query finds existing transaction with `stripe_checkout_id`
- No duplicate transaction created
- Webhook returns 200 OK (acknowledges receipt)
- Booking remains Confirmed (not duplicated)

---

### TC-PAYMENT-007: Payment Refund (Full)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Booking completed and paid
2. Client cancels booking
3. Admin initiates full refund via Stripe

**Expected Result:**
- Stripe refund processed
- `payment_status: 'Refunded'`
- Transaction created: T-TYPE-REFUND (£35)
- Client receives refund in 5-10 business days
- Email notification sent
- Tutor payout transaction reversed (if not yet paid out)

---

### TC-PAYMENT-008: Payment Refund (Partial)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Booking cancelled with 12 hours notice
2. Cancellation policy: 50% refund
3. Process refund

**Expected Result:**
- Partial refund: £17.50 (50%)
- Client receives £17.50
- Tutor receives £17.50 as cancellation fee
- Transaction split updated

---

### TC-PAYMENT-009: Payment with Saved Card
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Client has saved card from previous booking
2. Create new booking
3. Select "Use saved card ending in 4242"
4. Complete payment

**Expected Result:**
- `GET /api/stripe/get-cards-by-customer` retrieves saved cards
- Stripe charges saved payment method
- Faster checkout (no card entry)
- Webhook processes normally

---

### TC-PAYMENT-010: Set Default Payment Method
**Priority:** P3
**Type:** Integration

**Test Steps:**
1. Client has 2 saved cards
2. Navigate to payment settings
3. Set card ending in 1234 as default
4. `POST /api/stripe/set-default-card`

**Expected Result:**
- Default payment method updated in Stripe
- Future bookings pre-select default card

---

### TC-PAYMENT-011: Remove Saved Card
**Priority:** P3
**Type:** Integration

**Test Steps:**
1. Navigate to payment settings
2. Select card ending in 4242
3. Click "Remove Card"
4. `POST /api/stripe/remove-card`

**Expected Result:**
- Card detached from customer in Stripe
- No longer appears in saved cards list
- Cannot be used for future payments

---

### TC-PAYMENT-012: Payment Receipt Email
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Complete payment
2. Check email inbox

**Expected Result:**
- Email received with:
  - Subject: "Payment Receipt - £35.00"
  - Booking details
  - Amount charged
  - Payment method (last 4 digits)
  - PDF receipt attachment
  - Link to view full invoice

---

## 12. Stripe Webhooks

### TC-WEBHOOK-001: checkout.session.completed (Success)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Simulate webhook event:
```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_123",
      "payment_status": "paid",
      "metadata": {
        "booking_id": "abc-123"
      }
    }
  }
}
```
2. Send to `POST /api/webhooks/stripe`

**Expected Result:**
- Signature verified
- RPC `handle_successful_payment` called
- Booking updated to Confirmed
- Transactions created
- Emails sent
- Returns 200 OK

---

### TC-WEBHOOK-002: checkout.session.completed (Already Processed)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Process webhook (TC-WEBHOOK-001)
2. Send same webhook again (Stripe retry)

**Expected Result:**
- Idempotency check finds existing transaction
- No duplicate processing
- Returns 200 OK
- No error logged (expected behavior)

---

### TC-WEBHOOK-003: checkout.session.expired
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Simulate webhook:
```json
{
  "type": "checkout.session.expired",
  "data": {
    "object": {
      "metadata": { "booking_id": "abc-123" }
    }
  }
}
```

**Expected Result:**
- Booking remains Pending
- Optionally: Booking auto-cancelled after expiry
- Client can create new checkout session

---

### TC-WEBHOOK-004: payment_intent.payment_failed
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Simulate payment failure webhook

**Expected Result:**
- Booking remains Pending
- `payment_status: 'Failed'`
- Email sent to client: "Payment failed, please try again"
- Client can retry payment

---

### TC-WEBHOOK-005: payout.paid (Tutor Withdrawal)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Tutor initiates withdrawal (£100)
2. Stripe processes payout
3. Simulate webhook:
```json
{
  "type": "payout.paid",
  "data": {
    "object": {
      "id": "po_test_123",
      "amount": 10000,
      "status": "paid"
    }
  }
}
```

**Expected Result:**
- Find transaction with `stripe_payout_id: 'po_test_123'`
- Update `status: 'paid_out'`
- Email sent to tutor: "Withdrawal completed - £100"
- Balance updated in dashboard

---

### TC-WEBHOOK-006: payout.failed
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Simulate failed payout webhook

**Expected Result:**
- Transaction `status: 'failed'`
- Reversal transaction created (funds returned to available balance)
- Email sent to tutor: "Payout failed - Please update bank details"
- Admin alerted

---

### TC-WEBHOOK-007: customer.subscription.created (Organisation)
**Priority:** P1
**Type:** Integration
**Precondition:** Organisation premium subscription

**Test Steps:**
1. Organisation signs up for premium
2. Simulate webhook:
```json
{
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_123",
      "customer": "cus_123",
      "status": "active"
    }
  }
}
```

**Expected Result:**
- Record created in `organisation_subscriptions`
- `status: 'active'`
- Premium features unlocked
- Email sent to organization admin

---

### TC-WEBHOOK-008: invoice.payment_succeeded (Subscription)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Simulate recurring payment webhook

**Expected Result:**
- Subscription renewed
- `current_period_end` updated
- Invoice created
- Email sent with invoice

---

### TC-WEBHOOK-009: invoice.payment_failed (Subscription)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Simulate failed subscription payment

**Expected Result:**
- Subscription `status: 'past_due'`
- Grace period started
- Email sent: "Payment failed - Please update payment method"
- Premium features remain active during grace period

---

### TC-WEBHOOK-010: Webhook Signature Verification Failure
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Send webhook with invalid signature
2. `POST /api/webhooks/stripe` with wrong `Stripe-Signature` header

**Expected Result:**
- Signature verification fails
- Returns 400 Bad Request
- Error: "Invalid signature"
- No processing occurs
- Security log created

---

### TC-WEBHOOK-011: Webhook Processing Timeout
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Mock database delay (>10 seconds)
2. Send webhook

**Expected Result:**
- Processing times out
- Webhook handler returns 500
- Event logged to DLQ (`failed_webhooks` table)
- Stripe retries webhook
- Admin alerted for manual processing

---

### TC-WEBHOOK-012: Failed Webhook Dead-Letter Queue (DLQ)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Webhook processing fails (exception thrown)
2. Check `failed_webhooks` table

**Expected Result:**
- Record created:
```json
{
  "event_type": "checkout.session.completed",
  "event_id": "evt_123",
  "payload": {...},
  "error": "Database connection timeout",
  "created_at": "2026-02-02T12:00:00Z"
}
```
- Admin dashboard shows failed webhook alert
- Manual retry option available
- Returns 200 to Stripe (prevents infinite retries)

---

## 13. Commission & Transactions

### TC-COMMISSION-001: Direct Booking Commission Split (90/10)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Client (not referred) books tutor
2. Booking amount: £100
3. Payment succeeds

**Expected Result:**
- Transactions created:

| Type | Profile | Amount | Status | Description |
|------|---------|--------|--------|-------------|
| T-TYPE-1 | Client | -£100 | Paid | Booking Payment |
| T-TYPE-2 | Tutor | +£90 | clearing | Tutoring Payout (90%) |
| T-TYPE-5 | Platform | +£10 | Paid | Platform Fee (10%) |

- Commission split: 90% tutor, 10% platform
- Total: £100 (balanced)

---

### TC-COMMISSION-002: Referred Booking Commission Split (80/10/10)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Agent refers client (client has `referred_by_profile_id: agent_id`)
2. Client books tutor
3. Booking amount: £100
4. Payment succeeds

**Expected Result:**
- Transactions created:

| Type | Profile | Amount | Status | Description |
|------|---------|--------|--------|-------------|
| T-TYPE-1 | Client | -£100 | Paid | Booking Payment |
| T-TYPE-2 | Tutor | +£80 | clearing | Tutoring Payout (80%) |
| T-TYPE-3 | Agent | +£10 | clearing | Referral Commission (10%) |
| T-TYPE-5 | Platform | +£10 | Paid | Platform Fee (10%) |

- Commission split: 80% tutor, 10% agent, 10% platform
- Booking has `agent_id` populated
- Total: £100 (balanced)

---

### TC-COMMISSION-003: Agent Custom Commission Rate
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Agent with custom rate: 15% (stored in `role_details`)
2. Agent refers client who books (£100)
3. Payment succeeds

**Expected Result:**
- Transactions:
  - Tutor: £75 (75%)
  - Agent: £15 (15%)
  - Platform: £10 (10%)
- Total: £100

**Note:** Confirm if custom rates supported

---

### TC-COMMISSION-004: Transaction Status Lifecycle
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Payment succeeds → Transaction created
2. Wait for clearing period (7 days)
3. Clearing period ends
4. Tutor initiates withdrawal

**Expected Result:**
- **Day 0:** Transaction `status: 'clearing'`, `available_at: Day 7`
- **Day 7:** Automated job updates `status: 'available'`
- **Day 8:** Tutor withdraws → Transaction `status: 'paid_out'`

---

### TC-COMMISSION-005: Transaction Context Fields
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Create booking with:
   - Service: "GCSE Mathematics"
   - Subjects: [Mathematics]
   - Session Date: 2026-02-10
   - Tutor: John Doe
   - Client: Jane Smith
2. Payment succeeds
3. Check transaction record

**Expected Result:**
- Transaction includes context fields (migrations 107-111):
```json
{
  "service_name": "GCSE Mathematics",
  "subjects": ["Mathematics"],
  "session_date": "2026-02-10",
  "tutor_name": "John Doe",
  "client_name": "Jane Smith"
}
```
- Used for display in financials dashboard
- Helps identify transactions without JOINs

---

### TC-COMMISSION-006: Refund Transaction
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Booking paid (£100) → Transactions created (90/10 split)
2. Client cancels → Full refund
3. Check transactions

**Expected Result:**
- New refund transaction created:
  - T-TYPE-REFUND: Client +£100, Paid
- Original T-TYPE-2 (Tutor payout) status: 'reversed'
- Original T-TYPE-3 (Agent commission) status: 'reversed'
- Net balance for all parties: £0

---

### TC-COMMISSION-007: Partial Refund Transaction
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Booking paid (£100)
2. Partial refund: £50 (50%)
3. Check transactions

**Expected Result:**
- Refund transaction: Client +£50
- Tutor payout reduced: £90 → £45
- Agent commission reduced: £10 → £5
- Platform fee reduced: £10 → £5
- Net: £50 to client, £50 distributed

---

### TC-COMMISSION-008: Transaction Audit Trail
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Create booking → Payment → Refund
2. Query all transactions for booking_id

**Expected Result:**
- Full audit trail:
  - Initial payment (4 transactions)
  - Refund (1+ transactions)
  - All transactions have timestamps
  - Immutable records (no UPDATEs to amounts, only statuses)

---

## 14. Withdrawals & Payouts

### TC-WITHDRAWAL-001: Initiate Withdrawal (Available Balance)
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. Login as tutor
2. Navigate to Financials
3. View "Available Balance: £200"
4. Click "Withdraw Funds"
5. Enter amount: £200
6. Confirm

**Expected Result:**
- `POST /api/financials/withdraw` called
- Stripe payout created: `stripe.payouts.create({ amount: 20000 })`
- Transaction created:
  - Type: T-TYPE-6 (Withdrawal)
  - Amount: -£200
  - Status: pending
  - `stripe_payout_id: 'po_test_123'`
- Available balance reduced to £0
- Email sent: "Withdrawal initiated - Funds arriving in 2-3 days"

---

### TC-WITHDRAWAL-002: Withdrawal Exceeds Available Balance
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Available balance: £100
2. Attempt withdrawal: £150

**Expected Result:**
- Validation error: "Insufficient funds"
- Withdrawal not processed
- Balance unchanged

---

### TC-WITHDRAWAL-003: Withdrawal with Clearing Balance
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Balances:
   - Available: £50
   - Clearing: £100 (not yet available)
2. Attempt withdrawal: £100

**Expected Result:**
- Error: "Only £50 available for withdrawal. £100 clearing (available on Feb 15)"
- Can withdraw max £50
- Clearing funds not accessible

---

### TC-WITHDRAWAL-004: Minimum Withdrawal Amount
**Priority:** P2
**Type:** Unit

**Test Steps:**
1. Attempt withdrawal: £1

**Expected Result:**
- Validation error: "Minimum withdrawal: £10"
- Withdrawal not processed

**Note:** Confirm minimum threshold (Stripe minimum is £1/$1)

---

### TC-WITHDRAWAL-005: Withdrawal without Stripe Connect Account
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Tutor has earnings but no Stripe Connect account
2. Attempt withdrawal

**Expected Result:**
- Error: "Please connect your bank account first"
- Redirect to Stripe Connect onboarding
- Withdrawal not processed

---

### TC-WITHDRAWAL-006: Stripe Payout Completion (Webhook)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Tutor initiates withdrawal
2. Stripe processes payout (2-3 days)
3. Webhook `payout.paid` received

**Expected Result:**
- Transaction `status: 'pending'` → `'paid_out'`
- Email sent: "Withdrawal completed - £200 deposited"
- Transaction history shows "Paid Out"

---

### TC-WITHDRAWAL-007: Stripe Payout Failure (Webhook)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Withdrawal initiated
2. Stripe payout fails (invalid bank details)
3. Webhook `payout.failed` received

**Expected Result:**
- Transaction `status: 'failed'`
- Reversal transaction: +£200 back to available balance
- Email sent: "Withdrawal failed - Please update bank details"
- Admin alerted

---

### TC-WITHDRAWAL-008: Multiple Concurrent Withdrawals
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Available balance: £100
2. Submit withdrawal: £100 (Request A)
3. Immediately submit withdrawal: £100 (Request B)

**Expected Result:**
- Request A succeeds
- Request B fails: "Insufficient funds"
- No overdraft
- Database transaction lock prevents race condition

---

### TC-WITHDRAWAL-009: Withdrawal History
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Navigate to Financials → Withdrawal History
2. View past withdrawals

**Expected Result:**
- Table displays:
  - Date
  - Amount
  - Status (Pending, Paid Out, Failed)
  - Stripe Payout ID
  - Arrival date
- Can filter by status
- Can export as CSV

---

### TC-WITHDRAWAL-010: Clearing Period Automation
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Booking completed (£100 payout to tutor)
2. Transaction created with `available_at: 7 days from now`
3. Wait 7 days (or mock date)
4. Automated job runs

**Expected Result:**
- Cron job: `POST /api/cron/update-clearing-transactions`
- Transaction `status: 'clearing'` → `'available'`
- Available balance increases by £100
- Tutor can now withdraw

---

## 15. Referral System

### TC-REFERRAL-001: Generate Referral Code
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login as user (any role)
2. Navigate to Referrals section
3. Click "Generate Referral Code"

**Expected Result:**
- `referral_code` generated (6-8 chars, unique, alphanumeric)
- Stored in `profiles.referral_code`
- Referral link displayed: `https://tutorwise.app/signup?ref=ABC123`
- Can copy link to clipboard

---

### TC-REFERRAL-002: Signup via Referral Link
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. User A shares referral link: `?ref=ABC123`
2. User B clicks link → Redirected to signup
3. User B completes signup

**Expected Result:**
- User B's profile created with:
  - `referred_by_profile_id: <User A's profile_id>`
  - `referral_id: 'ABC123'` (optional tracking field)
- Lifetime attribution established
- User A sees User B in "Referred Users" list

---

### TC-REFERRAL-003: Referred User Makes First Booking
**Priority:** P0
**Type:** E2E

**Test Steps:**
1. User B (referred by User A) books tutor
2. Booking amount: £100
3. Payment succeeds

**Expected Result:**
- Booking created with `agent_id: <User A's profile_id>`
- Commission split: 80/10/10
- User A receives £10 commission (T-TYPE-3)
- User A sees commission in Financials dashboard

---

### TC-REFERRAL-004: Multi-Level Referral (2 Levels)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. User A refers User B
2. User B refers User C
3. User C books tutor (£100)

**Expected Result:**
- User B receives commission for direct referral (£10)
- User A receives 2nd-level commission (if implemented, e.g., £5)
- Total commission: £15
- Remaining: Tutor £75, Platform £10

**Note:** Confirm if multi-level referrals supported

---

### TC-REFERRAL-005: Invalid Referral Code
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. User clicks link: `?ref=INVALID`
2. Completes signup

**Expected Result:**
- Signup succeeds
- `referred_by_profile_id: NULL` (no referrer)
- Warning logged: "Invalid referral code"
- User not attributed to anyone

---

### TC-REFERRAL-006: Self-Referral Prevention
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. User A generates referral code
2. User A attempts to sign up with own referral link (new email)

**Expected Result:**
- Validation detects same user (via IP, device fingerprint, etc.)
- `referred_by_profile_id: NULL`
- No commission awarded
- OR: Business rule allows self-referral (confirm)

---

### TC-REFERRAL-007: Referral Dashboard (Agent)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Login as agent
2. Navigate to Referrals dashboard
3. View referral analytics

**Expected Result:**
- Total referrals: 50
- Active referrals: 30
- Total commission earned: £500
- Breakdown by month
- List of referred users with:
  - Name
  - Signup date
  - Bookings made
  - Commission earned

---

### TC-REFERRAL-008: Referral Notification Email
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. User B (referred by User A) makes first booking
2. Check User A's email

**Expected Result:**
- Email sent to User A:
  - Subject: "You earned £10 in referral commission!"
  - Details: User B booked tutor X
  - Total referral earnings to date

---

### TC-REFERRAL-009: Referral Attribution Expiry
**Priority:** P3
**Type:** Integration

**Test Steps:**
1. User B signs up via User A's link
2. User B doesn't book for 12 months
3. After 12 months, User B books

**Expected Result:**
- If attribution expires: User A receives no commission
- If lifetime attribution: User A receives commission (current implementation)

**Note:** Confirm business rule for attribution window

---

### ~~TC-REFERRAL-010: Wiselist Referrer Attribution (v5.7)~~ ❌ DEPRECATED
**Priority:** ~~P2~~ N/A
**Type:** ~~Integration~~ REMOVED
**Status:** ⚠️ **DEPRECATED (2026-02-08)** - Wiselist attribution tracking has been removed

**Original Test Steps:**
1. User A creates wiselist with Tutor X
2. User A shares wiselist link with User B
3. User B books Tutor X via wiselist

**~~Expected Result~~:**
- ~~Booking metadata includes `wiselist_referrer_id: <User A>`~~
- ~~User A receives small bonus (e.g., £2) for wiselist referral~~
- ~~Separate from agent commission~~
- ~~Tracked in `wiselist_referrals` analytics~~

**ACTUAL RESULT (Current):**
- No wiselist attribution tracking
- No referral bonuses from wiselist bookings
- Wiselists are organizational tools only

---

## 16. Wiselists

### TC-WISELIST-001: Create Wiselist
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Login as user
2. Navigate to Wiselists
3. Click "Create New Wiselist"
4. Enter name: "Best GCSE Maths Tutors"
5. Select visibility: Public
6. Save

**Expected Result:**
- `POST /api/wiselists`
- Wiselist created:
```json
{
  "id": "uuid",
  "owner_id": "<user_profile_id>",
  "name": "Best GCSE Maths Tutors",
  "visibility": "public",
  "created_at": "2026-02-02T12:00:00Z"
}
```
- Shows in user's Wiselists dashboard

---

### TC-WISELIST-002: Add Item to Wiselist (Listing)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. View listing detail page
2. Click "Add to Wiselist" (heart icon)
3. Select wiselist: "Best GCSE Maths Tutors"
4. Confirm

**Expected Result:**
- `POST /api/wiselists/[id]/items`
- Item created:
```json
{
  "wiselist_id": "uuid",
  "item_type": "listing",
  "item_id": "<listing_id>",
  "cached_title": "GCSE Mathematics Tutoring",
  "cached_tutor_name": "John Doe",
  "cached_hourly_rate": 35
}
```
- Cached fields stored for performance (migration 106)
- Item appears in wiselist

---

### TC-WISELIST-003: Add Item to Wiselist (Profile)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. View tutor profile
2. Click "Add to Wiselist"
3. Select wiselist

**Expected Result:**
- Item created with `item_type: 'profile'`
- Cached fields: name, avatar, bio

---

### TC-WISELIST-004: Remove Item from Wiselist
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. View wiselist with items
2. Click "Remove" on an item
3. Confirm

**Expected Result:**
- `DELETE /api/wiselists/[id]/items`
- Item removed from wiselist
- Item still exists (listing/profile not deleted)

---

### TC-WISELIST-005: Share Wiselist (Public Link)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. View wiselist with `visibility: 'public'`
2. Click "Share"
3. Copy public link

**Expected Result:**
- Link format: `https://tutorwise.app/wiselists/[id]`
- Anyone can view (no auth required)
- Shows all items in wiselist
- Referrer ID embedded in link for attribution

---

### TC-WISELIST-006: View Shared Wiselist (Unauthenticated)
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. User B (not logged in) clicks wiselist link from User A
2. View wiselist page

**Expected Result:**
- Wiselist displayed with:
  - Title
  - Items (listings/profiles)
  - Owner name
- Can click items to view details
- Prompted to sign up if booking

---

### TC-WISELIST-007: Add Collaborator (Editor)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Wiselist owner clicks "Add Collaborator"
2. Enter email: `collaborator@example.com`
3. Set role: Editor
4. Send invite

**Expected Result:**
- `POST /api/wiselists/[id]/collaborators`
- Collaborator record created:
```json
{
  "wiselist_id": "uuid",
  "profile_id": "<collaborator_profile_id>",
  "role": "EDITOR"
}
```
- Email sent to collaborator with link
- Editor can add/remove items (not delete wiselist)

---

### TC-WISELIST-008: Add Collaborator (Viewer)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Add collaborator with role: Viewer

**Expected Result:**
- Viewer can view wiselist (even if private)
- Cannot add/remove items
- Cannot invite other collaborators

---

### TC-WISELIST-009: Remove Collaborator
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Owner clicks "Remove" on collaborator
2. Confirm

**Expected Result:**
- `DELETE /api/wiselists/[id]/collaborators`
- Collaborator no longer has access
- Private wiselists hidden from collaborator

---

### TC-WISELIST-010: Private Wiselist Access Control
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. User A creates private wiselist
2. User B attempts to access via direct URL

**Expected Result:**
- Access denied
- 403 Forbidden
- Error: "You don't have permission to view this wiselist"
- Only owner and collaborators can view

---

### TC-WISELIST-011: Wiselist Referrer Tracking
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. User A shares wiselist link
2. User B books listing from wiselist
3. Check booking metadata

**Expected Result:**
- Booking has `wiselist_referrer_id: <User A>`
- User A credited for referral
- Analytics track wiselist performance

---

## 17. Free Help Now

### TC-FREEHELP-001: Enable Free Help Availability
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Login as tutor
2. Navigate to availability settings
3. Toggle "Free Help Now" to ON
4. `POST /api/presence/free-help/enable`

**Expected Result:**
- Tutor profile updated: `available_free_help: true`
- Tutor appears in "Free Help Now" section
- Badge displayed: "Available for Free Help"
- Presence status set to "Available"

---

### TC-FREEHELP-002: Disable Free Help Availability
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Tutor toggles "Free Help Now" to OFF
2. `POST /api/presence/free-help/disable`

**Expected Result:**
- `available_free_help: false`
- Removed from "Free Help Now" section
- Badge removed

---

### TC-FREEHELP-003: Browse Free Help Tutors
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Client navigates to "Free Help Now" page
2. View available tutors

**Expected Result:**
- `GET /api/marketplace/search?available_free_help=true`
- Results show only tutors with availability enabled
- Displays: subject, online status, response time
- Can filter by subject

---

### TC-FREEHELP-004: Request Free Help Session
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Client views available tutor
2. Click "Request Free Help"
3. Enter question: "Need help with quadratic equations"
4. Submit

**Expected Result:**
- `POST /api/sessions/create-free-help-session`
- Session request created
- Tutor notified via real-time alert (Ably)
- Client sees "Request sent" confirmation

---

### TC-FREEHELP-005: Tutor Accepts Free Help Request
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Tutor receives notification
2. Clicks "Accept"
3. Chat/video session initiated

**Expected Result:**
- Session status: Accepted
- Client notified
- Both redirected to chat/video interface
- Free help session counted in tutor stats

---

### TC-FREEHELP-006: Tutor Declines Free Help Request
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Tutor clicks "Decline"
2. Provide reason (optional)

**Expected Result:**
- Session status: Declined
- Client notified: "Tutor is unavailable, try another tutor"
- Reason displayed if provided

---

### TC-FREEHELP-007: Free Help Session Limit
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Client requests 10th free help session this month

**Expected Result:**
- Validation error: "Free help limit reached (10/month)"
- Cannot create session
- Prompted to book paid session

**Note:** Confirm if limit enforced

---

### TC-FREEHELP-008: Free Help Session Statistics
**Priority:** P3
**Type:** Integration

**Test Steps:**
1. Navigate to tutor dashboard
2. View "Free Help Stats"

**Expected Result:**
- Total free sessions given: 25
- Average session duration: 15 minutes
- Top subjects: Mathematics (10), Physics (8)
- Used for CaaS score calculation

---

## 18. Reviews & Ratings

### TC-REVIEW-001: Submit Review After Completed Booking
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Booking status: Completed
2. Client receives email: "Leave a review"
3. Click "Leave Review"
4. Fill review form:
   - Rating: 5 stars
   - Comment: "Excellent tutor, very patient"
5. Submit

**Expected Result:**
- `POST /api/reviews/submit`
- Review created:
```json
{
  "booking_id": "abc-123",
  "reviewer_id": "<client_profile_id>",
  "reviewee_id": "<tutor_profile_id>",
  "rating": 5,
  "comment": "Excellent tutor, very patient",
  "created_at": "2026-02-02T12:00:00Z"
}
```
- Tutor's `average_rating` recalculated
- `review_count` incremented
- Review displayed on tutor profile

---

### TC-REVIEW-002: Submit Review Without Comment
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Submit review with rating only (no comment)

**Expected Result:**
- Review created successfully
- Comment field empty
- Rating counted in average

---

### TC-REVIEW-003: Review Validation (Rating Range)
**Priority:** P2
**Type:** Unit

**Test Steps:**
1. Attempt to submit review with rating: 6 stars

**Expected Result:**
- Validation error: "Rating must be between 1 and 5"
- Review not created

---

### TC-REVIEW-004: Duplicate Review Prevention
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Client submits review for booking
2. Attempt to submit another review for same booking

**Expected Result:**
- Error: "You have already reviewed this session"
- Duplicate review not created

---

### TC-REVIEW-005: View Reviews Given (Client)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Login as client
2. Navigate to "Reviews" section
3. View "Reviews I've Given"

**Expected Result:**
- `GET /api/reviews/given`
- Displays all reviews submitted by client
- Shows: tutor name, rating, comment, date

---

### TC-REVIEW-006: View Reviews Received (Tutor)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Login as tutor
2. Navigate to "Reviews" section
3. View "Reviews I've Received"

**Expected Result:**
- `GET /api/reviews/received`
- Displays all reviews for tutor
- Shows: client name (or anonymous), rating, comment, date
- Can respond to reviews (if feature exists)

---

### TC-REVIEW-007: Average Rating Calculation
**Priority:** P0
**Type:** Unit

**Test Steps:**
1. Tutor has reviews:
   - 5 stars (3 reviews)
   - 4 stars (2 reviews)
   - 3 stars (1 review)
2. Calculate average

**Expected Result:**
- Total: (5*3 + 4*2 + 3*1) = 26
- Average: 26 / 6 = 4.33
- Displayed as "4.3 stars" (rounded to 1 decimal)

---

### TC-REVIEW-008: Display Reviews on Profile
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. View tutor profile with reviews
2. Scroll to "Reviews" section

**Expected Result:**
- Average rating displayed prominently (e.g., "4.8 stars")
- Total review count: "Based on 25 reviews"
- Recent reviews displayed (latest 5)
- Option to "See All Reviews"
- Can filter by rating (5-star, 4-star, etc.)

---

### TC-REVIEW-009: Review Spam/Abuse Detection
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Client submits review with inappropriate content
2. System scans review

**Expected Result:**
- Review flagged for moderation
- Admin notified
- Review hidden until approved
- OR: Validation error if obvious spam

---

### TC-REVIEW-010: Pending Review Notifications
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Booking completed 2 days ago
2. Client hasn't left review
3. Check notifications

**Expected Result:**
- `GET /api/reviews/pending-tasks`
- Notification displayed: "You have 3 pending reviews"
- Email reminder sent after 7 days (optional)

---

## 19. Dashboard & Analytics

### TC-DASHBOARD-001: Client Dashboard Overview
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Login as client
2. View dashboard

**Expected Result:**
- Displays:
  - Upcoming bookings (next 7 days)
  - Past bookings
  - Total sessions: 12
  - Total spent: £420
  - Saved tutors (wiselists)
  - Pending reviews
  - Recommended tutors

---

### TC-DASHBOARD-002: Tutor Dashboard Overview
**Priority:** P1
**Type:** E2E

**Test Steps:**
1. Login as tutor
2. View dashboard

**Expected Result:**
- `GET /api/dashboard/summary`
- Displays:
  - Upcoming sessions (calendar view)
  - Total earnings: £2,500
  - Available balance: £200
  - Clearing balance: £300 (available Feb 15)
  - Sessions completed: 75
  - Average rating: 4.8 stars (from 50 reviews)
  - Profile views: 1,234
  - Listing performance (views, bookings per listing)

---

### TC-DASHBOARD-003: Earnings Trend Chart
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Navigate to Financials → Earnings
2. View earnings trend chart (last 6 months)

**Expected Result:**
- `GET /api/dashboard/earnings-trend`
- Line chart displays monthly earnings
- Data points for each month
- Tooltip shows exact amount
- Can toggle: Gross earnings vs. Net (after fees)

---

### TC-DASHBOARD-004: Profile Views Trend
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Navigate to Analytics → Profile Views
2. View trend chart

**Expected Result:**
- `GET /api/dashboard/profile-views-trend`
- Line chart shows daily/weekly views
- Spike detection (e.g., after promotion)
- Can compare: Profile views vs. Listing views

---

### TC-DASHBOARD-005: Booking Heatmap (Calendar)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Navigate to Analytics → Booking Heatmap

**Expected Result:**
- `GET /api/dashboard/booking-heatmap`
- Calendar view with color-coded days:
  - Dark green: 5+ bookings
  - Light green: 1-4 bookings
  - Gray: No bookings
- Helps identify busy/slow periods

---

### TC-DASHBOARD-006: Referral Sources Breakdown
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Navigate to Analytics → Referrals
2. View referral sources

**Expected Result:**
- `GET /api/dashboard/referrer-sources`
- Pie chart shows:
  - Direct (50%)
  - Google Search (30%)
  - Agent Referrals (15%)
  - Wiselist Shares (5%)
- Can drill down into each source

---

### TC-DASHBOARD-007: KPIs Summary (Admin)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Login as admin
2. View dashboard

**Expected Result:**
- `GET /api/dashboard/kpis`
- Displays platform-wide metrics:
  - Total users: 5,000
  - Active tutors: 1,200
  - Total bookings: 10,000
  - GMV (Gross Merchandise Value): £350,000
  - Platform revenue: £35,000
  - Average booking value: £35
  - Conversion rate: 8%

---

### TC-DASHBOARD-008: Student Breakdown (Agent)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Login as agent
2. Navigate to dashboard

**Expected Result:**
- `GET /api/dashboard/student-breakdown`
- Displays referred clients:
  - Total referred: 50
  - Active (booked recently): 30
  - Inactive: 20
- Earnings per client
- Top clients by bookings

---

## 20. Security & Authorization

### TC-SECURITY-001: Role-Based Access Control (Client)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login as client
2. Attempt to access tutor-only endpoint: `GET /api/listings` (my listings)

**Expected Result:**
- Access denied
- 403 Forbidden
- Error: "You don't have permission to access this resource"
- RLS policy blocks query

---

### TC-SECURITY-002: Role-Based Access Control (Tutor)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login as tutor
2. Attempt to access admin endpoint: `GET /api/admin/accounts`

**Expected Result:**
- Access denied
- 403 Forbidden
- Admin endpoints restricted

---

### TC-SECURITY-003: Profile Privacy (Email/Phone)
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login as Client A
2. View Tutor B's profile via API: `GET /api/profiles/[tutor_b_id]`

**Expected Result:**
- Public fields visible: name, bio, avatar, qualifications
- Private fields hidden: email, phone, address, document numbers
- RLS policy enforces privacy

---

### TC-SECURITY-004: Booking Access Control
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login as Client A
2. Attempt to access Client B's booking: `GET /api/bookings/[client_b_booking_id]`

**Expected Result:**
- Access denied
- 403 Forbidden
- RLS: Users can only view their own bookings

---

### TC-SECURITY-005: Transaction Access Control
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login as Tutor A
2. Attempt to view Tutor B's transactions

**Expected Result:**
- Access denied
- Transactions filtered by `profile_id`
- Cannot view other users' financial data

---

### TC-SECURITY-006: Listing Edit Authorization
**Priority:** P0
**Type:** Integration

**Test Steps:**
1. Login as Tutor A
2. Attempt to edit Tutor B's listing: `PATCH /api/listings/[tutor_b_listing_id]`

**Expected Result:**
- Access denied
- 403 Forbidden
- RLS: Only listing owner can update

---

### TC-SECURITY-007: SQL Injection Prevention
**Priority:** P0
**Type:** Security

**Test Steps:**
1. Attempt malicious search query: `'; DROP TABLE profiles;--`
2. Submit search

**Expected Result:**
- Parameterized queries prevent injection
- No database modification
- Search returns no results (or sanitized query)

---

### TC-SECURITY-008: XSS Prevention
**Priority:** P0
**Type:** Security

**Test Steps:**
1. Submit listing description with script tag: `<script>alert('XSS')</script>`
2. View listing

**Expected Result:**
- Script tag sanitized/escaped
- Displays as plain text: `<script>alert('XSS')</script>`
- No JavaScript executed
- React's default escaping protects

---

### TC-SECURITY-009: CSRF Protection
**Priority:** P1
**Type:** Security

**Test Steps:**
1. Submit POST request to `POST /api/bookings` without CSRF token
2. From external site (cross-origin)

**Expected Result:**
- Request blocked
- 403 Forbidden
- CSRF token required for state-changing operations

---

### TC-SECURITY-010: Rate Limiting (API Endpoints)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Make 100 requests to `POST /api/bookings` in 10 seconds

**Expected Result:**
- First 50 requests succeed
- Subsequent requests throttled
- 429 Too Many Requests
- Error: "Rate limit exceeded. Try again in 60 seconds"
- Redis/Upstash tracks request count

---

### TC-SECURITY-011: Sensitive Data in Logs
**Priority:** P1
**Type:** Security

**Test Steps:**
1. Trigger error during payment processing
2. Check application logs

**Expected Result:**
- No credit card numbers logged
- No full email addresses in plaintext
- PII redacted: `user_email: "u***@example.com"`
- Stripe IDs logged (safe): `stripe_checkout_id: cs_test_123`

---

### TC-SECURITY-012: Admin Privilege Escalation Prevention
**Priority:** P0
**Type:** Security

**Test Steps:**
1. Login as regular user
2. Attempt to modify own profile: `{ "roles": ["admin"] }`
3. `PATCH /api/profiles/[id]`

**Expected Result:**
- Role change rejected
- Only admins can modify roles (via separate endpoint)
- RLS policy blocks unauthorized role updates

---

## 21. Edge Cases & Error Handling

### TC-EDGE-001: Booking with Zero Amount
**Priority:** P1
**Type:** Unit

**Test Steps:**
1. Attempt to create booking with `amount: 0`

**Expected Result:**
- Validation error: "Amount must be greater than £0"
- OR: Allowed for free trial sessions only

---

### TC-EDGE-002: Booking with Negative Amount
**Priority:** P1
**Type:** Unit

**Test Steps:**
1. Attempt booking with `amount: -10`

**Expected Result:**
- Validation error: "Amount must be positive"
- Booking not created

---

### TC-EDGE-003: Listing with Empty Availability
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Create listing with `availability: []` (empty array)
2. Attempt to publish

**Expected Result:**
- Validation error: "Please set at least one availability period"
- Listing cannot be published
- OR: Listing published but shows "No availability" (clients cannot book)

---

### TC-EDGE-004: Very Long Bio Text (10,000 chars)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Enter 10,000 character bio
2. Save profile

**Expected Result:**
- Validation error: "Bio must be less than 5,000 characters"
- OR: Text truncated at limit
- Database column limit enforced

---

### TC-EDGE-005: Special Characters in Names
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Create profile with name: `José O'Brien-Müller`
2. Save

**Expected Result:**
- Name stored correctly (UTF-8 encoding)
- Accents, apostrophes, hyphens preserved
- Displays correctly in UI
- Search handles special characters

---

### TC-EDGE-006: Concurrent Profile Updates
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Open profile in 2 browser tabs
2. Tab A: Update bio to "Text A"
3. Tab B: Update bio to "Text B"
4. Submit both simultaneously

**Expected Result:**
- Last write wins (typically Tab B)
- No data corruption
- Optimistic locking or version control (if implemented)
- Warning: "Profile was updated by another session"

---

### TC-EDGE-007: Database Connection Timeout
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Mock database connection failure
2. Attempt to fetch bookings

**Expected Result:**
- Error page displayed: "Service temporarily unavailable"
- User-friendly message (not raw error)
- Retry button available
- Error logged to Sentry
- Returns 503 Service Unavailable

---

### TC-EDGE-008: Stripe API Timeout
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Mock Stripe API timeout (>10 seconds)
2. Create checkout session

**Expected Result:**
- Request times out
- Error: "Payment processor unavailable. Please try again."
- Booking remains Pending
- User can retry

---

### TC-EDGE-009: Invalid File Upload (Empty File)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Upload 0 KB file as avatar

**Expected Result:**
- Validation error: "File is empty"
- Upload rejected

---

### TC-EDGE-010: Orphaned Bookings (Deleted Listing)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Create booking from listing
2. Tutor deletes listing
3. View booking

**Expected Result:**
- Booking remains valid (snapshot fields)
- Listing shows as "Deleted" or "Unavailable"
- Booking still viewable and completable
- No broken references

---

### TC-EDGE-011: Timezone Handling (UTC vs. Local)
**Priority:** P1
**Type:** Integration

**Test Steps:**
1. Tutor (UK, GMT) sets availability: Mon 14:00 GMT
2. Client (New York, EST) books Mon 09:00 EST
3. Check booking times

**Expected Result:**
- All times stored as UTC in database
- Displayed in user's local timezone
- Booking time matches: Mon 14:00 GMT = Mon 09:00 EST
- No off-by-one-hour errors

---

### TC-EDGE-012: Leap Year Date Handling
**Priority:** P3
**Type:** Unit

**Test Steps:**
1. Book session on Feb 29, 2028 (leap year)
2. Check date validation

**Expected Result:**
- Date accepted
- Stored correctly
- Displays correctly

---

### TC-EDGE-013: Session Duration Edge (24 Hours)
**Priority:** P2
**Type:** Unit

**Test Steps:**
1. Create booking with `session_duration: 1440` (24 hours)

**Expected Result:**
- Validation error: "Maximum session duration: 8 hours"
- OR: Accepted if business allows multi-day sessions

---

### TC-EDGE-014: Pagination Edge (Offset > Total)
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Search returns 50 results
2. Request page 10 (offset 200)

**Expected Result:**
- Empty results returned
- No error
- Message: "No more results"

---

### TC-EDGE-015: Emoji in Content
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Enter bio: "I love teaching! 📚🎓✨"
2. Save profile

**Expected Result:**
- Emojis stored correctly (UTF-8)
- Displays correctly in UI
- No encoding issues

---

### TC-EDGE-016: Network Interruption During Booking
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Create booking
2. During submission, disconnect network
3. Reconnect after 10 seconds

**Expected Result:**
- Request times out
- User sees error: "Network error, please try again"
- Booking not created (or Pending status)
- No duplicate bookings if user retries

---

### TC-EDGE-017: Browser Back Button During Checkout
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Redirect to Stripe checkout
2. Click browser back button
3. Click "Book Now" again

**Expected Result:**
- New checkout session created
- Old session expires
- No double-charge

---

### TC-EDGE-018: Session Expiry During Form Fill
**Priority:** P2
**Type:** E2E

**Test Steps:**
1. Login
2. Fill out booking form for 20 minutes
3. Submit booking

**Expected Result:**
- Session expired
- Error: "Session expired, please login again"
- Form data preserved (local storage)
- After re-login, can resume

---

### TC-EDGE-019: Invalid UUID in URL
**Priority:** P2
**Type:** Integration

**Test Steps:**
1. Navigate to `/bookings/not-a-uuid`

**Expected Result:**
- 400 Bad Request OR 404 Not Found
- Error: "Invalid booking ID"
- No server crash

---

### TC-EDGE-020: Mass Booking Creation (10,000 Bookings)
**Priority:** P3
**Type:** Load

**Test Steps:**
1. Simulate 10,000 concurrent booking requests

**Expected Result:**
- System handles load gracefully
- Database connection pooling works
- Response time: <2 seconds per request
- No deadlocks
- Rate limiting may throttle requests

**Note:** Requires load testing tools (k6, JMeter)

---

## Summary

**Total Test Cases:** 250+

### Breakdown by Priority
- **P0 (Critical):** 60 test cases (Payment, Booking, Auth, Security)
- **P1 (High):** 80 test cases (Core features, Integrations)
- **P2 (Medium):** 90 test cases (Advanced features, Edge cases)
- **P3 (Low):** 20 test cases (Nice-to-have, Analytics)

### Breakdown by Type
- **E2E (Playwright):** 80 test cases
- **Integration (Jest):** 120 test cases
- **Unit (Jest):** 40 test cases
- **Security:** 10 test cases

### Next Steps
1. Implement test automation for P0 and P1 test cases
2. Set up CI/CD pipeline to run tests on every commit
3. Create test data seeding scripts
4. Configure Playwright for parallel execution
5. Integrate Stripe test mode for payment tests
6. Set up test reporting dashboard
7. Schedule weekly regression test runs
8. Plan load testing phase for performance validation

---

**Document Owner:** QA Team
**Review Cycle:** Bi-weekly
**Last Updated:** 2026-02-02

# Reviews Implementation Guide

**Status:** Beta
**Owner:** Dev Team
**Last Updated:** December 2024

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [File Structure](#file-structure)
3. [Common Development Tasks](#common-development-tasks)
4. [API Reference](#api-reference)
5. [Component Guide](#component-guide)
6. [Database Operations](#database-operations)
7. [Testing Approach](#testing-approach)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Understanding the Review Flow

Reviews work through an automated trigger-based system. When you're developing features that touch reviews, understand this critical path:

**Trigger Point:** Booking completion with confirmed payment
**Session Creation:** Automatic via database trigger
**User Interaction:** Submission through reviews hub or modal
**Publication:** Either immediate (all submitted) or scheduled (seven-day deadline)
**Profile Update:** Automatic rating recalculation on publication

Most bugs in the review system come from misunderstanding this automated flow. The application layer handles user interface and submission validation, but the database handles all lifecycle orchestration.

### Developer Setup

The reviews feature requires no special setup beyond the standard Tutorwise development environment. All migrations should already be applied to your local database. Verify review functionality works by:

**Step One:** Complete a test booking through payment confirmation
**Step Two:** Check that a review session appears in the booking_review_sessions table
**Step Three:** Access the reviews hub and verify the pending review appears
**Step Four:** Submit a review and confirm it saves to profile_reviews table

If any step fails, check migration status and database trigger existence before investigating application code.

### Key Constraints to Remember

**Immutability:** Reviews cannot be edited after submission during pending state
**Completeness:** Users must review all session participants, cannot skip individuals
**Authorization:** Only session participants can submit reviews for that session
**Snapshot Timing:** Service context captured at submission time, not session creation
**Publication Atomic:** Session publication and rating updates happen in single transaction

---

## File Structure

### API Routes
Location: `/apps/web/src/app/api/reviews/`

**pending-tasks/route.ts**
Returns active review assignments for authenticated user
Query filters: status equals pending, user in participants, user not in submitted
Response includes reviewee count and days remaining calculation

**received/route.ts**
Returns published reviews where user is the reviewee
Calculates aggregate statistics: total, average, rating distribution
Supports pagination with limit and offset query parameters

**given/route.ts**
Returns reviews written by authenticated user
Separates into pending and published categories
Optional status filter query parameter

**session/[session_id]/route.ts**
Returns specific session details with authorization check
Filters review visibility based on session status
Calculates submission progress and deadline proximity

**submit/route.ts**
Processes multi-participant review submission
Validates all reviewees are session participants
Populates snapshot fields from booking data
Triggers early publication check after successful insert

### React Components
Location: `/apps/web/src/app/components/feature/reviews/`

**PendingReviewCard.tsx**
Displays review task in hub card format
Status variants based on urgency: Due Today, Due Soon, Pending
Opens ReviewSubmissionModal on click

**ProfileReviewCard.tsx**
Shows individual review in received or given context
Displays rating, comment, service context from snapshots
Status indicates pending approval or verified booking

**ReviewSubmissionModal.tsx**
Multi-step modal: form for input, junction for post-submission
Handles multi-participant reviews in single interface
Viral growth CTAs after submission (Book Again, Refer & Earn)

**ReviewStatsWidget.tsx and ReputationWidget.tsx**
Sidebar statistics cards showing aggregate metrics
Displays average rating, pending count, received count, given count

**ReviewsSkeleton.tsx, ReviewsError.tsx, ReviewHelpWidget.tsx**
Loading states, error handling, contextual help content

### Main Reviews Page
Location: `/apps/web/src/app/(authenticated)/reviews/page.tsx`

Three-tab interface: Pending, Received, Given
React Query integration for data fetching with cache
Filtering by rating and date range
Pagination with configurable page size
Empty states and loading skeletons

### Type Definitions
Location: `/apps/web/src/types/reviews.ts`

Defines interfaces for BookingReviewSession, ProfileReview, PendingReviewTask, ReviewStats
Enums for booking review status and location type
Shared types ensuring consistency between API and components

### Utility Functions
Location: `/apps/web/src/lib/api/reviews.ts`

Client-side API wrapper functions for all review endpoints
Standardized error handling and response typing
Used by React Query hooks in components

Location: `/apps/web/src/lib/review-notifications.ts`

Ably notification dispatch for session creation and publication
Channel scoping and message formatting
Non-blocking error handling (notifications are nice-to-have, not critical)

---

## Common Development Tasks

### Task One: Adding a New Review Field

**Scenario:** Product wants to add a "would recommend" boolean to reviews

**Database Changes:**
Add column to profile_reviews table through migration
Example: `would_recommend BOOLEAN DEFAULT NULL`
Update any relevant indexes if field will be filtered

**Type Definition Updates:**
Add field to ProfileReview interface in types file
Make field optional to support existing reviews without data

**Submission API Changes:**
Update submit route validation to accept new field
Add field to insert statement when creating review records
No changes needed for snapshot field logic unless field comes from booking

**Component Updates:**
Add toggle or checkbox to ReviewSubmissionModal form
Display new field in ProfileReviewCard if present
Update review statistics to potentially aggregate new metric

**Testing Checklist:**
Submit review with new field populated
Submit review with new field omitted (optional field handling)
Verify existing reviews still display without error
Check aggregate statistics include new field correctly

### Task Two: Modifying Publication Deadline

**Scenario:** Change from seven days to five days for faster feedback cycles

**Database Trigger Change:**
Locate create_review_session_on_booking_complete function
Find publish_at calculation (currently NOW() + INTERVAL '7 days')
Update to NOW() + INTERVAL '5 days'
Test trigger execution on staging database first

**Frontend Display Updates:**
Update any hardcoded references to seven-day period in component text
Verify countdown timer calculations remain accurate with new duration
Check notification text mentions correct deadline

**Notification Updates:**
Update session creation notification text if it mentions seven days
Plan for transition period where existing sessions still have seven-day deadlines

**Testing Approach:**
Create test booking and verify new session has five-day deadline
Monitor pending sessions during transition to ensure both deadlines coexist properly
Confirm deadline-based publication still triggers at correct time

### Task Three: Adding Email Notifications

**Current State:** Reviews only send real-time Ably notifications

**Integration Requirements:**
Email service already exists in platform (check existing booking emails for patterns)
Need templates for session creation, session publication, deadline reminders

**Implementation Steps:**

**Email Template Creation:**
Design session_created template with participant list and deadline
Design session_published template with review visibility announcement
Design deadline_reminder template for three-day and one-day warnings

**Notification Function Updates:**
Update notifySessionCreated in review-notifications.ts
Call email service after Ably dispatch
Include unsubscribe links and notification preferences

**Deadline Reminder Job:**
Create scheduled job querying sessions where publish_at is three days or one day away
Track which reminders already sent to avoid duplicates
Send email to participants who haven't submitted yet

**User Preference Handling:**
Check user notification preferences before sending
Allow users to disable review email notifications while keeping Ably
Respect Do Not Disturb hours for email delivery

**Testing Strategy:**
Test email delivery in development with email capture service
Verify all template variables populate correctly
Check unsubscribe links function properly
Monitor email bounce and complaint rates after launch

### Task Four: Implementing Review Flagging

**Scenario:** Users need to report inappropriate review content

**Database Schema:**
Create review_flags table with fields: id, review_id, flagger_id, reason, description, status, created_at
Add status enum: pending, reviewed, upheld, dismissed
Index on review_id and status for moderation queue queries

**API Endpoints:**
POST /api/reviews/flag - Submit flag with review ID and reason
GET /api/admin/review-flags - Moderation queue for administrators
PATCH /api/admin/review-flags/[id] - Update flag status with resolution

**Component Changes:**
Add flag button to ProfileReviewCard component
Create FlagReviewModal for reason selection and description
Display "Flagged for review" badge on flagged reviews

**Admin Interface:**
Build moderation dashboard showing pending flags
Display flagged review alongside flag reason and description
Provide actions: dismiss flag, hide review, remove review, ban user

**Notification Flow:**
Notify original reviewer if review is hidden or removed
Notify flagger when flag is reviewed with outcome
Respect moderation decision appeals process if applicable

**Privacy Considerations:**
Flag submissions are anonymous to reviewee
Flagger identity visible only to administrators
Moderation decisions logged in audit trail

### Task Five: Adding Review Response Feature

**Scenario:** Allow reviewees to respond to reviews they receive

**Database Design:**
Create review_responses table: id, review_id, author_id, response_text, created_at
Unique constraint on review_id (one response per review)
Foreign key to profile_reviews ensuring response links to valid review

**Authorization Logic:**
Only reviewee can respond to reviews about them
Responses only allowed for published reviews
No editing after submission (consider allowing within timeframe)

**API Implementation:**
POST /api/reviews/respond - Submit response with review ID and text
Validate requestor is the reviewee from original review
Return response data for immediate display

**Component Updates:**
Add respond button to ProfileReviewCard for reviews about current user
Create ReviewResponseModal for composing response
Display existing responses below original review text

**Notification System:**
Notify original reviewer when reviewee responds
Include response text in notification for quick viewing
Link directly to review with response

**UI Considerations:**
Distinguish response visually from original review
Show response timestamp relative to original review date
Limit response length to prevent abuse (suggest 500 characters)

### Task Six: Building Review Analytics Dashboard

**Scenario:** Tutors want insights about their review trends over time

**Data Aggregation:**
Query profile_reviews filtered by reviewee_id
Group by time period (week, month, quarter) for trends
Calculate metrics: average rating, review count, rating distribution

**Visualization Components:**
Rating trend line chart over time
Rating distribution bar chart (five-star to one-star counts)
Most common praise themes (requires content analysis)
Subject area breakdown if reviews tagged with subjects

**API Endpoints:**
GET /api/reviews/analytics - Returns aggregated statistics
Query parameters: timeframe, granularity, reviewee_id
Response includes trend data and comparative metrics

**Component Structure:**
ReviewAnalyticsDashboard page component
Individual chart components: TrendChart, DistributionChart, ThemesCloud
Filter controls for timeframe selection
Export functionality for data download

**Performance Optimization:**
Cache analytics calculations with React Query
Pre-aggregate common queries in materialized database views
Lazy load chart libraries to reduce initial bundle size

**Future Enhancements:**
Benchmark against platform averages
Predictive analytics for rating trajectory
Alert tutors to declining ratings for intervention opportunity

### Task Seven: Snapshot Field Maintenance

**Understanding Snapshot Fields:**
Service context data copied from booking at review submission time
Protects review meaning if booking is later modified or deleted
Fields include: service_name, subjects, levels, session_date, location_type

**When to Add New Snapshot Fields:**

**Criteria:** Field value may change in source booking after review submission
**Criteria:** Field essential for understanding review context
**Criteria:** Field used in review filtering or display

**Implementation Process:**

**Migration Creation:**
Add new column to profile_reviews table
Make column nullable for backward compatibility
Add index if field will be filtered frequently

**Submission Logic Update:**
Locate submit route's booking data query
Extract new field from booking result
Include field in review insert statement

**Display Integration:**
Update ProfileReviewCard to show new field
Add field to filtering options if applicable
Include in review export functionality

**Backfill Consideration:**
Existing reviews lack new snapshot field
Decide: leave null, or backfill from historical booking data
If backfilling, write migration to populate from bookings table where still available

**Example Scenario - Adding Teaching Style:**
Booking table adds teaching_style field (interactive, lecture, mixed)
Reviews should preserve which style was used for that session
Add teaching_style TEXT column to profile_reviews
Extract from booking.teaching_style during submission
Display teaching style badge on review cards
Filter reviews by teaching style on tutor profiles

### Task Eight: Implementing Dispute Resolution

**Current Gap:** Users cannot formally dispute reviews they believe are inaccurate

**Workflow Design:**

**Step One - Dispute Initiation:**
User sees review on their profile they disagree with
Clicks "Dispute this review" button
Selects reason: factually inaccurate, inappropriate content, violates guidelines

**Step Two - Evidence Collection:**
User provides explanation of why review is disputed
Option to attach supporting evidence (booking messages, screenshots)
Submission creates dispute record in disputes table

**Step Three - Administrator Review:**
Dispute appears in moderation queue
Admin sees original review, dispute reason, supporting evidence
Admin can view full booking history and participant messages

**Step Four - Resolution:**
Admin decides: uphold review, add context note, hide review, remove review
Disputant receives notification of decision
Option for appeal if policy allows

**Database Schema:**
review_disputes table: id, review_id, disputant_id, reason, evidence, status, resolution
Status enum: pending, under_review, resolved, appealed
Resolution tracks admin decision and notes

**Administrative Interface:**
Dispute queue sorted by age and severity
Dispute details view with all context
Action buttons for resolution options
Audit log of all dispute actions

**Communication Flow:**
Notify disputant when review is under review
Notify original reviewer if review status changes
Both parties informed of final resolution

**Policy Considerations:**
Define what constitutes valid dispute grounds
Establish timeline for dispute resolution
Determine when reviews can be permanently removed
Appeal process for disputed resolutions

---

## API Reference

### GET /api/reviews/pending-tasks

**Purpose:** Fetch active review assignments for authenticated user

**Authentication:** Required - uses session token

**Query Parameters:** None

**Response Structure:**
```
{
  tasks: Array<PendingReviewTask>
}

Where PendingReviewTask includes:
- session_id: string
- booking_id: string
- status: "pending"
- publish_at: timestamp
- participant_ids: string[]
- submitted_ids: string[]
- reviewees_count: number (participants minus self)
- days_remaining: number (calculated from publish_at)
```

**Filtering Logic:**
Only returns sessions where status equals pending, current user appears in participant_ids, and current user NOT in submitted_ids

**Performance:** Indexed query on status and participant_ids, typically sub-50ms

**Common Errors:**
401 Unauthorized - session token invalid or expired
500 Server Error - database connection issue

### GET /api/reviews/received

**Purpose:** Fetch reviews written about authenticated user

**Authentication:** Required

**Query Parameters:**
- limit (optional, default 20) - records per page
- offset (optional, default 0) - pagination offset
- rating (optional) - filter by specific rating value
- date_range (optional) - filter by time period

**Response Structure:**
```
{
  reviews: Array<ProfileReview>,
  stats: {
    total: number,
    average: number (decimal),
    distribution: {
      5: count, 4: count, 3: count, 2: count, 1: count
    }
  },
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

**Visibility Rules:**
Only includes reviews from published sessions
User sees all reviews where they are the reviewee
Includes snapshot fields for service context

**Performance:** Indexed on reviewee_id and created_at, typical response under 200ms for hundreds of reviews

### GET /api/reviews/given

**Purpose:** Fetch reviews written by authenticated user

**Authentication:** Required

**Query Parameters:**
- status (optional) - filter by session status: pending or published
- limit, offset - pagination controls

**Response Structure:**
```
{
  reviews: Array<ProfileReview>,
  stats: {
    pending: number,
    published: number,
    total: number
  },
  pagination: { /* same structure as received */ }
}
```

**Grouping:** Reviews grouped by session status for different tab displays

### GET /api/reviews/session/[session_id]

**Purpose:** Fetch specific session details with reviews

**Authentication:** Required

**Authorization:** User must be participant in the session

**Path Parameters:**
- session_id - UUID of review session

**Response Structure:**
```
{
  session: BookingReviewSession,
  reviews: Array<ProfileReview>,
  computed: {
    days_remaining: number,
    user_has_submitted: boolean,
    reviewees_needed: number
  }
}
```

**Visibility Logic:**
If session pending: user only sees reviews about themselves
If session published: user sees all reviews in session
Non-participants receive 403 Forbidden error

### POST /api/reviews/submit

**Purpose:** Submit reviews for all session participants

**Authentication:** Required

**Request Body:**
```
{
  session_id: string (UUID),
  reviews: Array<{
    reviewee_id: string (UUID),
    rating: number (1-5 inclusive),
    comment: string (optional, nullable)
  }>
}
```

**Validation Rules:**
- Session must exist and have pending status
- User must be participant who hasn't already submitted
- All reviewees must be valid session participants
- User cannot review themselves (checked automatically)
- Ratings must be integers between 1 and 5
- Must include reviews for all participants except self

**Snapshot Population:**
API reads booking data to populate service_name, subjects, levels, session_date, location_type
If booking data unavailable, returns validation error

**Success Response:**
```
{
  success: true,
  session_id: string,
  auto_published: boolean,
  reviews_created: number
}
```

**Error Responses:**
400 Bad Request - validation failure (missing required fields, invalid data)
403 Forbidden - user not authorized for this session
404 Not Found - session does not exist
409 Conflict - user already submitted for this session
500 Server Error - database operation failed

**Side Effects:**
Adds reviewer to session's submitted_ids array
Checks for early publication eligibility
If all submitted, triggers publication and notifications
Records audit log entry with auto_published flag

**Performance:** Typical response time 100-300ms including snapshot queries and trigger execution

---

## Component Guide

### PendingReviewCard

**Purpose:** Display actionable review task in hub interface

**Props:**
```
{
  session: PendingReviewTask (includes computed days_remaining),
  onSubmit: (sessionId: string) => void
}
```

**Behavior:**
Shows reviewee count, service context, deadline with urgency color
Status badge changes: "Due Today" (red, 1 day), "Due Soon" (orange, 2-3 days), "Pending" (blue, 4+ days)
Click handler opens ReviewSubmissionModal

**Styling:** Uses HubDetailCard wrapper for consistent layout with other features

**Accessibility:** Keyboard navigable, screen reader announces urgency level

### ProfileReviewCard

**Purpose:** Display individual review in received or given context

**Props:**
```
{
  review: ProfileReview (includes snapshots),
  variant: "received" | "given",
  showContext: boolean (default true)
}
```

**Display Logic:**
Variant "received" shows reviewer profile and "From" label
Variant "given" shows reviewee profile and "To" label
Service context displays from snapshot fields: subject, level, session date
Rating renders as star icons with numeric fallback

**Status Indicators:**
"Pending Approval" badge for reviews in unpublished sessions
"Verified Booking" badge for published reviews
Displays session date in relative format (3 days ago, 2 weeks ago)

**Responsive Behavior:**
Stacks vertically on mobile, horizontal on desktop
Comment truncates with "Show more" link for long text

### ReviewSubmissionModal

**Purpose:** Multi-participant review collection interface

**Props:**
```
{
  session: BookingReviewSession,
  onSubmit: (reviews: ReviewSubmission[]) => Promise<void>,
  onClose: () => void,
  isOpen: boolean
}
```

**State Management:**
Tracks reviews object keyed by reviewee_id
Validates completeness before enabling submit button
Handles loading state during submission
Transitions to junction view on success

**Form State:**
Each participant has independent rating and comment
Star rating picker with hover preview
Optional comment textarea with character counter (suggested 100-500 characters)

**Junction View (Viral Growth):**
Displayed after successful submission
Shows publication timing: immediate if early, or deadline date
Two CTAs: "Book Again" (navigates to bookings), "Refer & Earn" (navigates to referrals)
Analytics tracking on CTA clicks

**Validation:**
Requires rating for all participants
Comment optional but encouraged
Prevents submission if any participant missing rating

**Error Handling:**
Displays API error messages in toast notification
Allows retry on failure without losing form data
Closes modal on successful submission

### ReviewStatsWidget

**Purpose:** Sidebar statistics display for review metrics

**Props:**
```
{
  stats: {
    averageRating: number,
    pendingCount: number,
    receivedCount: number,
    givenCount: number
  }
}
```

**Layout:**
Average rating displayed prominently with star visualization
Three metric rows: Pending, Received, Given
Each metric clickable, navigating to relevant reviews tab

**Styling:** Uses HubStatsCard for consistent sidebar appearance

**Loading State:** Skeleton animation while fetching data

**Empty State:** Shows encouraging message when no reviews yet

### Reviews Hub Page

**Structure:** Three-tab interface with shared filtering controls

**Pending Tab:**
Lists PendingReviewCard components sorted by deadline (soonest first)
Empty state encourages completing bookings to receive review opportunities
Refreshes when reviews submitted elsewhere

**Received Tab:**
Lists ProfileReviewCard components in "received" variant
Filters: rating (all, 5-star, 4-star, etc.), date range (7d, 30d, 3m, 6m, 1y)
Shows aggregate statistics above review list
Pagination with "Load more" button

**Given Tab:**
Lists ProfileReviewCard components in "given" variant
Groups pending versus published reviews
Same filtering as received tab
Indicates which reviews awaiting publication

**Data Fetching:**
React Query hooks with stale-while-revalidate caching
Five-minute stale time for review data
Invalidates all queries on review submission
Optimistic updates for better perceived performance

**Search Functionality:**
Filters reviews by reviewer/reviewee name
Searches comment content for keywords
Case-insensitive matching

**Responsive Design:**
Desktop: Three-column layout (stats sidebar, main content, help widgets)
Tablet: Two-column (main content, collapsed sidebar)
Mobile: Single column with sticky tab navigation

---

## Database Operations

### Direct Database Queries (Read-Only)

**Fetch Session with Reviews:**
```sql
SELECT
  brs.*,
  array_agg(
    json_build_object(
      'id', pr.id,
      'reviewer_id', pr.reviewer_id,
      'reviewee_id', pr.reviewee_id,
      'rating', pr.rating,
      'comment', pr.comment,
      'service_name', pr.service_name,
      'subjects', pr.subjects
    )
  ) as reviews
FROM booking_review_sessions brs
LEFT JOIN profile_reviews pr ON pr.session_id = brs.id
WHERE brs.id = $1
GROUP BY brs.id;
```

**Calculate Average Rating for Profile:**
```sql
SELECT
  COUNT(*) as review_count,
  AVG(pr.rating) as average_rating
FROM profile_reviews pr
JOIN booking_review_sessions brs ON brs.id = pr.session_id
WHERE pr.reviewee_id = $1
  AND brs.status = 'published';
```

**Find Pending Reviews for User:**
```sql
SELECT *
FROM booking_review_sessions
WHERE status = 'pending'
  AND $1 = ANY(participant_ids)
  AND NOT ($1 = ANY(submitted_ids))
ORDER BY publish_at ASC;
```

### Trigger Functions

**Session Creation Trigger:**
Located in migration 045
Fires on booking status change to 'Completed'
Creates session, populates participants, sets deadline
No application intervention required

**Early Publication Trigger:**
Located in migration 046
Fires after profile_reviews insert
Checks submitted_ids array completeness
Publishes session if all participants submitted

**Rating Update Trigger:**
Located in migration 047
Fires on session status change to 'published'
Recalculates average_rating and review_count for all reviewees
Updates happen atomically with publication

### RLS Policies

**Sessions Visibility:**
Users see sessions where their profile ID in participant_ids array
Service role has unrestricted access

**Reviews Visibility:**
Users see published reviews from their sessions
Users always see reviews where they are reviewee
Users see own pending reviews

**Reviews Mutation:**
Users can insert reviews during session pending state
Users can update own reviews during pending state
Updates blocked after publication

---

## Testing Approach

### Unit Testing Strategy

**API Route Tests:**
Mock database calls, test validation logic
Verify authorization checks with different user roles
Test error handling for malformed requests
Confirm snapshot field population logic

**Component Tests:**
Render components with test data
Verify state changes on user interaction
Test form validation and submission flows
Check conditional rendering based on props

**Utility Function Tests:**
Test notification dispatch with mocked Ably client
Verify date calculations for deadline and urgency
Test filtering and sorting logic

### Integration Testing

**Full Submission Flow:**
Create test booking programmatically
Trigger completion and payment confirmation
Verify session creation in database
Submit reviews through API
Confirm early publication triggers
Check profile rating updates

**Deadline Publication:**
Create session with publish_at in past
Run scheduled publication job
Verify status changes to published
Confirm reviews become visible

**Multi-Participant Scenarios:**
Test two-party review (direct booking)
Test six-party review (referred booking)
Verify all relationships created correctly
Check submission completeness validation

### Testing Tools

**Database:** Use test database with migrations applied, reset between tests
**Authentication:** Mock session tokens for different user contexts
**Time:** Mock current time for deadline calculations
**Notifications:** Mock Ably client to verify messages sent
**React Testing:** Use React Testing Library for component tests
**API Testing:** Use Supertest or similar for endpoint testing

### Manual Testing Checklist

**Before Release:**
- Create and complete test booking
- Submit review as each participant type
- Verify notifications arrive in real-time
- Check reviews appear on profiles after publication
- Test filtering and pagination in reviews hub
- Confirm aggregate statistics calculate correctly
- Verify RLS prevents unauthorized access
- Test review submission with invalid data
- Check mobile responsive layouts

**Edge Cases:**
- Submit review with maximum comment length
- Attempt duplicate submission for same session
- Try to review session user isn't part of
- Modify booking after review submitted
- Delete booking that has published reviews

---

## Troubleshooting

### Issue: Review Session Not Creating After Booking Completion

**Symptoms:** Booking shows completed status, payment confirmed, but no session appears in booking_review_sessions table

**Diagnosis Steps:**
Check booking table: status should be 'Completed', payment_status should be 'Confirmed'
Query audit_log for booking_id to see if completion event recorded
Check database trigger existence: on_booking_completed_create_review should exist on bookings table
Look for errors in database logs around booking completion time

**Common Causes:**
Trigger disabled or missing (check migration 045 applied)
Booking participants invalid (client_id or tutor_id null)
Database permissions issue preventing trigger execution
Trigger code has error preventing execution

**Resolution:**
Reapply migration 045 if trigger missing
Fix booking participant data if null values found
Check database user permissions for trigger functions
Review trigger code for logic errors or missing data

### Issue: Reviews Not Publishing After All Participants Submit

**Symptoms:** All participants submitted reviews, but session remains pending instead of publishing

**Diagnosis:**
Query session: COUNT(submitted_ids) should equal COUNT(participant_ids)
Check trigger existence: on_review_submitted_check_publish should be on profile_reviews
Check session status: ensure still 'pending' not already 'published'
Review audit_log for any early publication events

**Common Causes:**
Submitted_ids array not updating correctly
Early publication trigger disabled or missing
Session status already changed to published but appears pending in UI
Race condition in concurrent submissions

**Resolution:**
Verify trigger function handle_review_submission exists and is correct
Check array_append operations in trigger updating submitted_ids
Refresh UI cache if session actually published
Review concurrent submission handling in trigger code

### Issue: Profile Average Rating Not Updating

**Symptoms:** Reviews published, visible on profile, but average_rating field stays same

**Diagnosis:**
Check profile table: average_rating and review_count values
Query all published reviews for profile manually calculate expected average
Check trigger existence: on_session_published_update_ratings should exist
Look for errors in audit_log for rating update events

**Common Causes:**
Rating update trigger missing or disabled (migration 047)
Trigger executing but failing silently (check database logs)
Calculation logic error in update_profile_ratings_on_publish function
RLS preventing trigger from updating profiles table

**Resolution:**
Reapply migration 047 if trigger missing
Grant service_role permissions to update profiles table
Fix calculation logic if mathematically incorrect
Manually invoke trigger function for affected profiles to backfill

### Issue: Unauthorized Access Errors

**Symptoms:** Users seeing 403 errors when accessing reviews they should be able to see

**Diagnosis:**
Check session participant_ids: user profile ID should be in array
Verify RLS policies enabled on booking_review_sessions and profile_reviews
Check authentication token validity and user ID mapping
Review API authorization logic in route handlers

**Common Causes:**
Participant_ids not populated correctly at session creation
User trying to access session they're not part of
RLS policy too restrictive (missing ANY operator for arrays)
Mismatched user ID between authentication and database

**Resolution:**
Fix session creation to include all participants
Verify user accessing correct session ID
Review and update RLS policies if too restrictive
Check authentication service returning correct user profile ID

### Issue: Snapshot Fields Empty or Incorrect

**Symptoms:** Reviews display without service context, snapshot fields are null

**Diagnosis:**
Check profile_reviews table: snapshot fields should have data
Look at booking data at time of review submission
Check API submission logic: should query booking and populate snapshots
Review error logs for booking query failures

**Common Causes:**
Booking deleted before review submission
Snapshot field extraction logic missing or incorrect
Booking data format doesn't match expected structure
Database transaction rolled back before snapshot saved

**Resolution:**
Add validation preventing submission if booking unavailable
Fix snapshot extraction logic to handle all booking formats
Ensure booking data query happens before review insert
Check transaction handling doesn't rollback prematurely

### Issue: Notifications Not Sending

**Symptoms:** Reviews submitted/published but users don't receive notifications

**Diagnosis:**
Check Ably credentials configured correctly
Review notification function call sites in API code
Look for errors in server logs when notifications should send
Verify Ably channels user is subscribed to

**Common Causes:**
Ably API key missing or invalid in environment variables
Notification code wrapped in try-catch hiding errors
Wrong channel name format or user ID mapping
Ably service degraded or unavailable

**Resolution:**
Verify ABLY_API_KEY environment variable set correctly
Remove try-catch temporarily to surface notification errors
Check channel name matches subscription pattern
Test with Ably debug mode enabled for detailed logging

### Issue: Deadline Publication Not Triggering

**Symptoms:** Seven days passed, session still pending instead of publishing

**Diagnosis:**
Check publish_at timestamp: should be in past
Verify scheduled job running (check cron configuration)
Look for job execution logs around expected publication time
Query sessions where publish_at < NOW() AND status = 'pending'

**Common Causes:**
Scheduled publication job not configured or running
Job failing silently without logging errors
Database locks preventing publication update
Timezone mismatch between publish_at and job execution

**Resolution:**
Configure scheduled job if missing (every 5 minutes recommended)
Add error logging to publication job for debugging
Check database for long-running transactions blocking updates
Normalize all timestamps to UTC to avoid timezone issues

---

## Best Practices

### Code Quality

**Always Validate at API Boundary:**
Don't trust client-side validation alone
Check all inputs server-side before database operations
Return specific error messages for debugging

**Preserve Backward Compatibility:**
Make new fields nullable when adding to existing tables
Support old and new data formats during transitions
Version API responses if making breaking changes

**Handle Errors Gracefully:**
Non-critical operations (notifications) should not fail requests
Critical operations (review submission) should rollback on any error
Log errors with enough context for debugging

**Test Database Triggers:**
Triggers execute outside application code, test them separately
Use database test fixtures that trigger execution
Verify trigger side effects match expectations

### Performance Optimization

**Index Strategically:**
Add indexes for frequently filtered fields
Use GIN indexes for array membership checks (participant_ids)
Avoid over-indexing rarely queried fields

**Cache Intelligently:**
Use React Query for client-side caching with appropriate stale times
Consider server-side caching for expensive aggregations
Invalidate caches immediately after mutations

**Paginate Appropriately:**
Default to reasonable page sizes (20-50 items)
Provide cursor-based pagination for large datasets
Use limit/offset for simpler use cases

**Optimize Queries:**
Select only needed fields, avoid SELECT *
Join tables efficiently, consider denormalization for read-heavy patterns
Use EXPLAIN ANALYZE to identify slow queries

### Security Considerations

**Enforce Authorization:**
Check user permissions in API routes before database queries
Rely on RLS as defense-in-depth, not sole authorization
Never trust client-side authorization checks

**Sanitize Inputs:**
Escape user-provided content before rendering
Validate data types and formats
Limit input lengths to prevent abuse

**Audit Sensitive Operations:**
Log all review submissions with full context
Track authorization failures for security monitoring
Maintain immutable audit records

**Protect Personal Information:**
Don't expose user email addresses or contact info in review responses
Anonymize data in analytics aggregations
Follow GDPR requirements for data deletion

---

**Document Version:** 1.0
**Last Updated:** December 2024
**Next Review:** March 2025

# Reviews Feature - AI Assistant Context

**Purpose:** This document provides context for AI assistants helping developers modify the reviews feature.
**Status:** Beta
**Owner:** Dev Team
**Last Updated:** December 2024

---

## Quick Overview

The reviews system is a mutual, blind feedback mechanism for completed tutoring sessions. Reviews collect through an automated trigger-based workflow that creates sessions when bookings complete, manages a seven-day escrow period, and publishes reviews either immediately (when all participants submit) or on deadline.

Key architectural principle: Database triggers orchestrate the entire lifecycle. Application code handles user interface and submission validation, but publication, rating updates, and state transitions happen automatically through database logic.

### Current Status: Beta

The reviews feature is in Beta status under active development and rollout:
- Deployed to production with feature flag control
- Gradually rolling out to user segments (currently 10-25% of users)
- Actively collecting feedback and iteration signals
- Trust & Safety team monitoring for quality and compliance
- CaaS integration live but review weighting still being tuned

When modifying the feature:
- Test changes thoroughly in staging before production deployment
- Consider Beta users may encounter bugs or edge cases
- Document breaking changes clearly for user communication
- Monitor error rates and user feedback closely after deployments
- Coordinate with Dev Team owner before major architectural changes

---

## Key Files and Locations

### Database
- **Migrations 043-048, 105:** Review schema, triggers, and snapshot fields
- **Tables:** booking_review_sessions, profile_reviews
- **Triggers:** Session creation, early publication, rating updates

### API Routes
- `/apps/web/src/app/api/reviews/pending-tasks/route.ts` - Active review assignments
- `/apps/web/src/app/api/reviews/received/route.ts` - Reviews about user
- `/apps/web/src/app/api/reviews/given/route.ts` - Reviews by user
- `/apps/web/src/app/api/reviews/session/[session_id]/route.ts` - Session details
- `/apps/web/src/app/api/reviews/submit/route.ts` - Review submission

### Components
- `/apps/web/src/app/components/feature/reviews/PendingReviewCard.tsx` - Review task display
- `/apps/web/src/app/components/feature/reviews/ProfileReviewCard.tsx` - Review display
- `/apps/web/src/app/components/feature/reviews/ReviewSubmissionModal.tsx` - Submission interface
- `/apps/web/src/app/components/feature/reviews/ReviewStatsWidget.tsx` - Statistics sidebar
- `/apps/web/src/app/(authenticated)/reviews/page.tsx` - Main reviews hub

### Utilities
- `/apps/web/src/types/reviews.ts` - Type definitions
- `/apps/web/src/lib/api/reviews.ts` - API client functions
- `/apps/web/src/lib/review-notifications.ts` - Ably notifications

---

## Common Modification Prompts

### Prompt One: "Add a new field to reviews"

**Example:** Add a "teaching pace" rating (too slow, just right, too fast) to reviews

**Steps to accomplish:**

**Database migration:**
Create new migration adding teaching_pace column to profile_reviews table
Column type: TEXT with check constraint for valid values
Make nullable for backward compatibility
Add index if field will be filtered

**Type definition:**
Update ProfileReview interface in types file
Add teaching_pace as optional field (nullable)

**Submission API:**
Modify submit route validation to accept teaching_pace in request
Add field to review insert statement
Do not add to snapshot fields unless value comes from booking

**Submission modal:**
Add teaching pace selector to ReviewSubmissionModal
Provide radio buttons or dropdown for three options
Include field in form state and submission payload

**Display components:**
Update ProfileReviewCard to show teaching pace if present
Design appropriate visual indicator (icon, badge, or text)

**Important notes:**
Existing reviews will have null teaching_pace, handle gracefully in display
Consider whether field should aggregate into statistics
Decide if field affects profile credibility scoring

### Prompt Two: "Change the review deadline from seven days to five days"

**Example:** Product wants faster feedback cycles, reduce escrow to five days

**Steps to accomplish:**

**Database trigger update:**
Locate migration 045 containing create_review_session_on_booking_complete function
Find publish_at calculation: `NEW.created_at + INTERVAL '7 days'`
Change to `NEW.created_at + INTERVAL '5 days'`
Create new migration to alter function definition

**Frontend text updates:**
Search codebase for hardcoded "7 days" or "seven days" references
Update notification text templates
Update modal explanatory text about publication timing
Update FAQ or help documentation

**Notification updates:**
Review session creation notification text
Update deadline reminder logic if implemented

**Testing checklist:**
Create test booking and verify new sessions have five-day deadline
Confirm existing seven-day sessions not affected
Monitor transition period with mixed deadlines
Verify scheduled publication triggers correctly after five days

**Considerations:**
Inform users of policy change through platform announcements
Monitor submission rates to see if shorter deadline impacts completion
Consider A/B testing before permanent change

### Prompt Three: "Add email notifications for reviews"

**Example:** Send email when review session created, when published, and deadline reminders

**Current state:** Only Ably real-time notifications exist

**Steps to accomplish:**

**Email template creation:**
Design session_created email with participant list and deadline
Design session_published email announcing review visibility
Design deadline_reminder emails for three-day and one-day warnings
Include unsubscribe links and notification preference links

**Session creation notification:**
Update notifySessionCreated function in review-notifications.ts
After Ably dispatch, call email service
Pass recipient email, template ID, and substitution variables
Handle email service errors gracefully (don't fail session creation)

**Publication notification:**
Update session publication trigger or API code
Call email service after session status changes to published
Send to all participants with personalized content

**Deadline reminder implementation:**
Create scheduled job querying sessions near deadline
Check publish_at - current_time for three-day and one-day thresholds
Track reminder_sent flags to avoid duplicate emails
Send only to participants who haven't submitted yet

**User preference handling:**
Check user notification settings before sending
Respect Do Not Disturb hours for email delivery
Allow users to disable review emails while keeping Ably notifications

**Testing approach:**
Test emails in development with email capture service
Verify template variable substitution works correctly
Check unsubscribe links function properly
Monitor bounce and complaint rates after rollout

### Prompt Four: "Implement review flagging for inappropriate content"

**Example:** Users need way to report reviews containing harassment or false information

**Steps to accomplish:**

**Database schema:**
Create review_flags table with columns:
  - id (UUID primary key)
  - review_id (foreign key to profile_reviews)
  - flagger_id (foreign key to profiles)
  - reason (enum: inappropriate, false_info, harassment, spam, other)
  - description (text, additional context)
  - status (enum: pending, reviewed, upheld, dismissed)
  - created_at, updated_at timestamps
  - resolved_by (nullable, admin profile ID)
  - resolution_notes (nullable, admin explanation)

**Flagging API endpoint:**
Create POST /api/reviews/flag route
Validate: user authenticated, review exists, user hasn't already flagged this review
Accept: review_id, reason, description
Create flag record with pending status
Notify moderation team

**Review card update:**
Add "Report review" button to ProfileReviewCard
Button opens FlagReviewModal with reason selection
Modal validates description required for certain reasons
Success toast confirms flag submitted

**Admin moderation interface:**
Create /admin/reviews/flags page showing pending flags
Display flagged review content alongside flag details
Show flagger information (anonymous to reviewee, visible to admin)
Provide action buttons: dismiss flag, hide review, remove review, ban user
Record all moderation actions in audit log

**Notification flow:**
Notify reviewee if review hidden or removed (include reason)
Notify flagger when flag reviewed with outcome
Support appeal process if applicable

**Privacy and safety:**
Flag submissions anonymous to reviewee
Flagger identity visible only to administrators
Flagged reviews marked with "Under review" badge during moderation
Removed reviews show "This review was removed for violating guidelines"

### Prompt Five: "Allow reviewees to respond to reviews"

**Example:** Tutors want ability to respond to reviews they receive for context or explanation

**Steps to accomplish:**

**Database design:**
Create review_responses table with columns:
  - id (UUID primary key)
  - review_id (foreign key to profile_reviews, unique constraint)
  - author_id (foreign key to profiles, must match review reviewee)
  - response_text (text, limited length)
  - created_at, updated_at timestamps
Unique constraint ensures one response per review

**Authorization logic:**
Only reviewee can respond to reviews about them
Responses only allowed for published reviews (no responding during escrow)
No editing after submission (or allow within short timeframe like one hour)

**Response API:**
Create POST /api/reviews/respond route
Validate: user is reviewee, review published, no existing response
Accept: review_id, response_text (max 500 characters)
Create response record
Notify original reviewer

**Component updates:**
Add "Respond" button to ProfileReviewCard for reviews about current user
Create ReviewResponseModal for composing response
Display existing responses below original review with distinct styling
Show response timestamp

**Display considerations:**
Visually distinguish response from original review (indented, different background)
Label response clearly: "Tutor's response" or "Student's response"
Include timestamp relative to original review

**Notification system:**
Notify original reviewer when reviewee responds
Include response text in notification
Link directly to review with response

**Moderation:**
Responses subject to same flagging as original reviews
Admin can hide or remove inappropriate responses
Consider approval queue for responses to maintain quality

### Prompt Six: "Build review analytics dashboard for tutors"

**Example:** Tutors want insights about rating trends, common themes, and improvement areas

**Steps to accomplish:**

**Data aggregation API:**
Create GET /api/reviews/analytics route
Accept query params: timeframe (week, month, quarter, year), reviewee_id
Calculate metrics:
  - Average rating over time (grouped by period)
  - Review count over time
  - Rating distribution (five-star to one-star percentages)
  - Subject area breakdown if reviews tagged
Return structured data for charting

**Analytics page component:**
Create /tutor/analytics or add analytics tab to reviews hub
Layout: header with timeframe selector, grid of visualization components
Use chart library (Recharts recommended for React)

**Visualization components:**
TrendChart - line chart showing rating average over time
DistributionChart - bar chart with five-star to one-star counts
SubjectBreakdown - pie or bar chart if subject data available
KeyMetrics - cards showing current average, total reviews, trend direction

**Performance optimization:**
Cache analytics calculations with React Query (longer stale time okay)
Consider materialized database views for common aggregations
Lazy load chart library to reduce initial bundle size
Implement pagination or date range limits for large datasets

**Future enhancements:**
Extract common praise themes from review text (NLP)
Benchmark ratings against platform average for subject/level
Predictive analytics for rating trajectory
Alert tutors to declining ratings for intervention

### Prompt Seven: "Add gamification for review participation"

**Example:** Reward users for writing thoughtful reviews with badges, streaks, and platform perks

**Steps to accomplish:**

**Achievement system:**
Define achievements:
  - First Review (write first review)
  - Review Streak (reviews submitted within one day of session completion for five consecutive sessions)
  - Thoughtful Reviewer (average comment length over 100 words)
  - Complete Participant (submitted all pending reviews within deadline)
Create achievements table tracking user progress

**Badge display:**
Design badge icons and naming
Add badges to user profiles
Show badge collection in settings or achievements page
Display relevant badges next to reviews (e.g., "Thoughtful Reviewer" badge)

**Streak tracking:**
Track consecutive on-time submissions
Reset streak if user misses deadline
Display current streak in reviews hub
Celebrate milestone streaks (10, 25, 50 reviews)

**Incentive implementation:**
Define rewards: platform credits, priority support, featured reviewer status
Automate reward grants when achievements unlock
Notify users of achievement unlocks
Create leaderboard (optional) for community engagement

**Analytics integration:**
Track achievement unlock rates
Monitor correlation between gamification and review quality/quantity
A/B test impact on submission rates

**Considerations:**
Avoid gaming by quality-checking reviews (minimum length, reject spam)
Balance intrinsic motivation with extrinsic rewards
Ensure gamification doesn't pressure negative reviews into positive

### Prompt Eight: "Preserve new booking field in review snapshots"

**Example:** Bookings now track "teaching style" (interactive, lecture, mixed), preserve in reviews

**Steps to accomplish:**

**Understand why snapshot:**
Booking field may change after review submitted
Field essential for review context (helps users find compatible tutors)
Field will be used in review filtering or analytics

**Database migration:**
Create migration adding teaching_style column to profile_reviews
Column type: TEXT with check constraint matching booking values
Make nullable for backward compatibility
Add index if field will be filtered (likely yes)

**Submission API update:**
Locate submit route booking data query
Add teaching_style to selected fields from bookings
Include teaching_style in review insert statement
Handle case where booking lacks teaching_style (older bookings)

**Display integration:**
Update ProfileReviewCard to show teaching style badge
Add teaching style to review filtering options
Include in review export functionality if exists

**Backfill decision:**
New snapshot only applies to future reviews
Existing reviews have null teaching_style
Options:
  - Leave null, indicate "Not specified" in display
  - Backfill from bookings table where data still exists
  - Accept data gap for historical reviews

**Testing checklist:**
Submit review for booking with teaching style
Verify teaching_style saved correctly
Confirm display shows teaching style
Test filtering by teaching style
Check handling of null teaching_style in old reviews

---

## Important Constraints

### Must Do

**Maintain Trigger Integrity:**
Always test database trigger modifications on staging before production
Triggers execute outside application transactions, handle errors carefully
Never disable triggers without coordinated migration plan

**Preserve Backward Compatibility:**
New fields must be nullable for existing reviews without data
Support reading old and new data formats during transitions
Version APIs if making breaking changes

**Enforce Authorization:**
Always verify user is session participant before showing session details
Check reviewee match before allowing responses to reviews
Rely on RLS policies as defense-in-depth, not sole authorization

**Protect User Privacy:**
Never expose participant contact information in review data
Anonymize data in aggregate analytics
Follow GDPR requirements: users under 18 cannot leave public reviews
Support data export and deletion requests

**Maintain Data Integrity:**
Review submission must be atomic (all participants or none)
Profile rating updates must happen atomically with publication
Snapshot fields must populate before review record commits

### Must Not Do

**Break Escrow Period:**
Do not allow reviews to be visible before publication time
Do not let users modify reviews after submission during pending state
Do not expose review content through API during escrow

**Compromise Immutability:**
Once reviews publish, content must not change (except moderation removal)
Published review records should not allow updates
Historical review data must remain accurate for credibility

**Allow Self-Reviews:**
Prevent users from reviewing themselves in any configuration
Check constraint reviewer_id ≠ reviewee_id enforced at database level
Validate all reviewees are session participants excluding reviewer

**Skip Snapshot Preservation:**
Always populate snapshot fields at submission time
Never delay snapshot capture until publication
Reject submission if booking data unavailable for snapshots

**Ignore Notification Failures:**
Notification errors should log but not fail core review operations
Implement retry logic for transient notification failures
Monitor notification delivery success rates

**Trust Client Validation:**
Always validate review data server-side before database operations
Check rating in valid range (1-5)
Verify all required participants have reviews
Confirm session exists and is eligible for submission

---

## Key Workflows

### Workflow: Complete Review Submission

**User Action:**
User navigates to reviews hub, sees pending review card, clicks "Write Review"

**System Response:**
ReviewSubmissionModal opens with session details
Modal fetches session via GET /api/reviews/session/[id]
Displays all participants user needs to review (participants minus self)

**User Input:**
For each participant: select star rating (1-5), optionally write comment
Modal validates form completeness (all ratings provided)
User clicks "Submit Reviews"

**Submission Process:**
API validates user authorization and session eligibility
Query booking data to populate snapshot fields
Insert all review records in single transaction
Add user to session submitted_ids array
Trigger checks if all participants now submitted

**Early Publication (If All Submitted):**
Trigger changes session status to published
Trigger updates all reviewees' average_rating and review_count
Notifications sent to all participants
Audit log records early publication event

**Post-Submission:**
Modal transitions to junction view
Shows publication timing and viral growth CTAs
User can click "Book Again" or "Refer & Earn"
Pending review card removed from list

### Workflow: Deadline-Based Publication

**Scheduled Job Execution:**
Every five minutes, job queries sessions where publish_at < current time AND status = 'pending'

**For Each Expired Session:**
Update session status from pending to published
Set published_at timestamp to current time
Trigger profile rating updates for all reviewees
Generate publication notifications

**Partial Submission Handling:**
Sessions publish even if not all participants submitted
Available reviews become visible
Users who didn't submit miss opportunity to provide feedback
No penalty for non-submission, just lost visibility

**Notification Delivery:**
Send to all participants: "Reviews for [service] are now published"
Include link to reviews page for viewing feedback
Email notification if implemented

**User Discovery:**
Participants navigate to reviews hub, see newly published reviews
Reviews appear on public profiles with verified booking badges
Profile ratings reflect new feedback

### Workflow: Review Flagging and Moderation

**Flag Submission:**
User sees inappropriate review, clicks "Report review"
FlagReviewModal opens with reason selection
User selects reason and provides description
Flag submits to POST /api/reviews/flag

**Flag Creation:**
System creates review_flags record with pending status
Links flag to review and flagger profile
Notifies moderation team of new flag

**Moderator Review:**
Admin accesses /admin/reviews/flags page
Sees pending flags sorted by age
Clicks flag to view details: flagged review content, flag reason, flagger context

**Moderation Decision:**
Admin reads review and evaluates against community guidelines
Options:
  - Dismiss flag (review acceptable)
  - Hide review (temporarily while investigating)
  - Remove review (violates guidelines)
  - Ban user (severe or repeat violations)

**Action Execution:**
Admin selects action and provides resolution notes
System updates flag status to reviewed
Updates review status if hidden or removed
Records moderation action in audit log

**Notification:**
Reviewee notified if review hidden or removed (includes reason)
Flagger notified of outcome
Original reviewer notified if review removed

**Appeal Process:**
User may appeal moderation decision within timeframe
Appeal creates new case for senior moderator review
Final decision recorded and communicated

---

## Common Gotchas

### Gotcha One: Snapshot Fields Missing

**Problem:** Reviews display without service context, snapshot fields are null

**Why it happens:**
Booking deleted before review submission
Snapshot population skipped due to error
Transaction rolled back before snapshot saved

**How to avoid:**
Always validate booking exists before accepting submission
Populate snapshots synchronously during submission transaction
Reject submission with clear error if booking unavailable
Test deletion scenarios: booking removed after session creation but before submission

### Gotcha Two: Rating Not Updating After Publication

**Problem:** Reviews publish successfully but profile average_rating stays unchanged

**Why it happens:**
Rating update trigger missing or disabled
Trigger executing but failing silently
RLS policy preventing service_role from updating profiles
Calculation logic error

**How to avoid:**
Verify migration 047 applied correctly in all environments
Grant appropriate permissions to service_role for profiles table
Add logging to trigger for debugging
Test rating calculation manually: query reviews and compute average

### Gotcha Three: Early Publication Not Triggering

**Problem:** All participants submitted but session remains pending

**Why it happens:**
submitted_ids array not updating correctly
Early publication trigger disabled
Race condition in concurrent submissions
Session status already changed but UI cache stale

**How to avoid:**
Verify trigger handle_review_submission exists and executes
Use array_append correctly to add to submitted_ids
Handle concurrent submissions with advisory locks if needed
Invalidate UI cache on successful submission

### Gotcha Four: Unauthorized Access to Reviews

**Problem:** Users seeing reviews from sessions they're not part of

**Why it happens:**
RLS policies too permissive or missing
Authorization check missing in API route
User ID mismatch between authentication and database

**How to avoid:**
Implement authorization checks in API routes before database queries
Rely on RLS as defense-in-depth
Test with different user accounts to verify isolation
Audit RLS policies regularly for correctness

### Gotcha Five: Duplicate Submissions

**Problem:** User submits reviews twice for same session

**Why it happens:**
No uniqueness check before allowing submission
Client-side prevents resubmit but API doesn't enforce
User circumvents UI restrictions

**How to avoid:**
Check user not in submitted_ids array before accepting submission
Return 409 Conflict error if already submitted
UI disables submission after success, but API enforces as well
Unique constraint considerations (currently not enforced at database level for idempotency)

### Gotcha Six: Notification Delivery Failures

**Problem:** Reviews submitted but users don't receive notifications

**Why it happens:**
Ably credentials invalid or missing
Wrong channel name or user ID mapping
Notification code wrapped in try-catch hiding errors
Ably service degraded

**How to avoid:**
Validate Ably configuration on application startup
Use correct channel naming pattern: `notifications:reviews:{userId}`
Log notification attempts and failures for monitoring
Implement retry logic for transient failures
Test notifications in development with Ably debug mode

### Gotcha Seven: Deadline Timezone Issues

**Problem:** Deadline publications happening at wrong times or not at all

**Why it happens:**
publish_at timestamp in wrong timezone
Scheduled job running in different timezone
Comparison logic doesn't account for timezone

**How to avoid:**
Normalize all timestamps to UTC in database
Store timestamps with timezone information (TIMESTAMPTZ)
Scheduled job compares UTC to UTC
Test with different server and user timezones

### Gotcha Eight: Review Content Escaping Issues

**Problem:** Special characters in review comments breaking display or causing XSS

**Why it happens:**
Comments not escaped before rendering
Markdown or HTML interpreted as code
User inputs malicious script tags

**How to avoid:**
Escape all user-generated content before rendering
Use React's built-in XSS protection (JSX automatically escapes)
Consider markdown support with sanitization library
Validate and sanitize inputs on submission (defense-in-depth)

---

## Testing Checklist

### Before Deploying Review Changes

**Database Changes:**
- [ ] All migrations tested on staging environment
- [ ] Triggers execute correctly with test data
- [ ] RLS policies enforced for all user types
- [ ] Rollback plan prepared if migration fails
- [ ] Indexes created for new filterable fields

**API Changes:**
- [ ] All endpoints return correct status codes
- [ ] Authorization checks prevent unauthorized access
- [ ] Validation rejects malformed requests
- [ ] Error messages helpful for debugging
- [ ] Snapshot fields populate correctly

**Component Changes:**
- [ ] UI renders correctly on desktop and mobile
- [ ] Forms validate required fields
- [ ] Loading states display during async operations
- [ ] Error states show helpful messages
- [ ] Accessibility: keyboard navigation, screen readers

**Integration Testing:**
- [ ] Complete submission flow: booking → session → submission → publication
- [ ] Early publication triggers when all submit
- [ ] Deadline publication triggers after seven days
- [ ] Profile ratings update correctly
- [ ] Notifications deliver in real-time

**Edge Cases:**
- [ ] Submit with maximum comment length
- [ ] Attempt duplicate submission (should fail)
- [ ] Try to review non-participant session (should fail)
- [ ] Delete booking after review submitted (reviews persist)
- [ ] Multiple participants submit concurrently (no race conditions)

**Performance:**
- [ ] API responses under target latency (200ms for most endpoints)
- [ ] Database queries use appropriate indexes
- [ ] Client-side caching reduces redundant requests
- [ ] Pagination prevents large result sets

**Security:**
- [ ] RLS prevents cross-user data access
- [ ] API authorization checks enforced
- [ ] User inputs sanitized and escaped
- [ ] Audit logs record sensitive operations

---

## File Paths Quick Reference

### Core Implementation
```
/apps/web/src/app/api/reviews/
  ├── pending-tasks/route.ts
  ├── received/route.ts
  ├── given/route.ts
  ├── session/[session_id]/route.ts
  └── submit/route.ts

/apps/web/src/app/components/feature/reviews/
  ├── PendingReviewCard.tsx
  ├── ProfileReviewCard.tsx
  ├── ReviewSubmissionModal.tsx
  ├── ReviewStatsWidget.tsx
  ├── ReputationWidget.tsx
  ├── ReviewsSkeleton.tsx
  └── ReviewsError.tsx

/apps/web/src/app/(authenticated)/reviews/
  └── page.tsx

/apps/web/src/types/reviews.ts
/apps/web/src/lib/api/reviews.ts
/apps/web/src/lib/review-notifications.ts
```

### Database Migrations
```
/apps/api/migrations/
  ├── 043_deprecate_listing_reviews.sql
  ├── 044_create_mutual_review_schema.sql
  ├── 045_review_session_creation_trigger.sql
  ├── 046_early_publication_trigger.sql
  ├── 047_profile_rating_update_trigger.sql
  ├── 048_payment_webhook_review_trigger.sql
  └── 105_add_review_snapshot_fields.sql
```

### Related Features
```
/apps/web/src/app/api/bookings/ (triggers review sessions)
/apps/web/src/app/components/feature/bookings/ (booking completion flow)
/tools/caas/ (consumes review metrics for credibility scores)
```

---

## Related Documentation

- [Solution Design](./reviews-solution-design.md) - Architecture and design decisions
- [Implementation Guide](./reviews-implementation.md) - Detailed developer guide
- [Bookings Feature](../bookings/bookings-solution-design.md) - Upstream integration
- [CaaS Documentation](../caas/caas-solution-design.md) - Credibility scoring integration

---

**Document Version:** 1.0
**Last Updated:** December 2024
**Maintained By:** Dev Team

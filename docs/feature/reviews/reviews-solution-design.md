# Reviews System - Solution Design

**Status:** Beta
**Version:** 2.0 (with Snapshot Fields)
**Owner:** Dev Team
**Last Updated:** December 2024
**Key Stakeholders:** Product Team, Trust & Safety, Dev Team
**Related Systems:** Bookings, Payments, CaaS, Notifications

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals and Success Metrics](#goals-and-success-metrics)
4. [System Architecture](#system-architecture)
5. [User Journey Flows](#user-journey-flows)
6. [Data Model](#data-model)
7. [Integration Points](#integration-points)
8. [Business Logic and Rules](#business-logic-and-rules)
9. [Security and Privacy](#security-and-privacy)
10. [Performance Considerations](#performance-considerations)
11. [Future Enhancements](#future-enhancements)

---

## Executive Summary

The Reviews system implements a mutual, blind feedback mechanism that collects honest assessments from all participants in completed tutoring sessions. The core innovation is a seven-day escrow period during which reviews remain hidden from other participants, eliminating reciprocity bias and retaliation fears that plague traditional review platforms.

The system automatically creates review opportunities when bookings complete with confirmed payment, manages the collection and publication lifecycle through database triggers, and maintains profile-level reputation scores that influence marketplace dynamics. Reviews preserve service context at submission time, ensuring feedback remains meaningful even as booking data changes or gets deleted.

Key architectural decisions include trigger-based automation for reliability, snapshot-based context preservation for data integrity, and early publication rewards for prompt engagement.

---

## Problem Statement

### Business Challenges

**Trust Deficit in Two-Sided Marketplaces**
Traditional review systems create power imbalances where fear of retaliation suppresses honest feedback. Students worry that negative tutor reviews will result in account restrictions. Tutors fear that honest student assessments will damage their relationships and future booking potential.

**Incomplete Feedback Loops**
Single-direction review systems capture only the service provider's quality, missing critical information about customer engagement, preparedness, and fit. This asymmetry prevents optimal matching and hides red flags about problematic participants on both sides of transactions.

**Review Gaming and Manipulation**
Public, immediate review visibility enables strategic behavior - participants withhold reviews as leverage, coordinate positive review exchanges, or submit retaliatory feedback in response to negative assessments they receive.

**Context Loss Over Time**
Reviews tied loosely to booking records become meaningless when bookings are modified, services are updated, or data is archived. A review stating "great math tutor" loses value if the system cannot verify what math subjects or levels were actually taught.

### User Pain Points

**Students Experience:**
- Anxiety about honest feedback harming relationships with tutors they may want to book again
- Inability to assess tutor responsiveness and professional conduct through current reviews
- Difficulty finding tutors who work well with their specific learning style or needs
- Uncertainty about whether existing reviews reflect current service quality

**Tutors Experience:**
- Fear that honest student assessments will damage business relationships
- Inability to signal which students are ideal matches for their teaching style
- Missing feedback about student preparedness affecting lesson planning
- Review volume gaps making new tutors less discoverable in the marketplace

**Platform Challenges:**
- Low review completion rates due to reciprocity fears
- Biased positive reviews that don't reflect service quality accurately
- Missing data about problematic participants on both sides
- Difficulty differentiating between high-quality and mediocre service providers

---

## Goals and Success Metrics

### Primary Goals

**Increase Honest Feedback Submission**
Target: Achieve seventy-five percent review submission rate within six months of launch
Measure: Percentage of completed bookings that generate at least one review submission

**Enable Mutual Assessment**
Target: Maintain balanced review submission rates between students and tutors
Measure: Ratio of student-submitted to tutor-submitted reviews remains between zero-point-eight and one-point-two

**Build Marketplace Trust**
Target: Published reviews influence booking conversion by fifteen percent
Measure: Correlation between tutor average rating and booking completion rate

**Preserve Review Context**
Target: One hundred percent of reviews maintain meaningful service context even after booking modifications
Measure: Percentage of reviews displaying accurate subject, level, and service information

### Secondary Goals

**Reduce Review Turnaround Time**
Optimize: Thirty percent of sessions achieve early publication through complete submission
Measure: Percentage of sessions publishing before seven-day deadline

**Maintain Review Quality**
Optimize: Average review word count exceeds fifty words
Measure: Median character count in review comments and distribution analysis

**Support Discovery and Matching**
Optimize: Review data improves match quality by ten percent
Measure: Second booking rate for student-tutor pairs with mutual positive reviews

### Success Metrics Dashboard

**Participation Metrics:**
- Review session creation rate (target: one hundred percent of completed bookings)
- Overall submission rate (target: seventy-five percent)
- Complete session submission rate (all participants submit)
- Time-to-submission distribution

**Quality Metrics:**
- Average review comment length
- Rating distribution (avoid excessive five-star clustering)
- Verified booking badge display rate
- Service context preservation rate

**Business Impact Metrics:**
- Correlation between reviews and booking conversion
- Tutor discoverability improvement with review volume
- Student retention rate difference between reviewed and non-reviewed sessions
- Dispute rate for sessions with published reviews versus without

**System Health Metrics:**
- Review publication latency
- Profile rating calculation accuracy
- Notification delivery success rate
- Audit log completeness

---

## System Architecture

### High-Level Overview

The reviews system operates as an event-driven workflow triggered by booking completion. Database triggers orchestrate the entire lifecycle, ensuring consistency and eliminating dependency on application-layer coordination.

```
Booking Completes → Review Session Creates → Participants Submit →
Reviews Publish → Profile Scores Update → Notifications Send
```

Each stage transitions automatically based on database state changes, making the system resilient to application restarts, deployment interruptions, or temporary service outages.

### Lifecycle States

**Session Creation Phase**
When payment confirmation marks a booking as completed, a database trigger immediately creates a review session. The session receives a unique identifier, captures all participant identities from the booking, and calculates a publication deadline seven days in the future. The system sends initial notifications to all participants with submission links.

**Collection Phase**
Participants access submission interfaces through the reviews hub or notification links. As each person submits their reviews, the system adds them to the session's submitted participants list. A trigger checks whether all participants have now completed submission. If yes, the system immediately transitions to publication. If no, the session remains in collection phase.

**Publication Phase**
Sessions publish through two paths - early publication when all participants submit before the deadline, or scheduled publication when the seven-day timer expires. Publication makes all reviews visible to all session participants, triggers profile rating recalculation for all reviewees, generates publication notifications, and records audit events.

**Post-Publication State**
Published sessions enter a stable state where reviews display on public profiles, contribute to aggregate scores, and influence marketplace discovery. The system maintains this state indefinitely, though future enhancements may add response or dispute mechanisms.

### Component Interaction Flow

**Database Triggers** (Primary Orchestration)
- Monitor booking status transitions and payment confirmations
- Create review sessions automatically on booking completion
- Track submission progress and evaluate early publication eligibility
- Publish sessions on deadline expiration
- Update profile ratings when sessions publish
- Generate audit trail entries for all state transitions

**API Layer** (User Interface)
- Provide pending review task discovery endpoints
- Handle review submission requests with validation
- Serve review display data filtered by visibility rules
- Manage session detail queries with authorization checks
- Coordinate notification dispatch on state changes

**React Components** (User Experience)
- Display pending review cards with urgency indicators
- Present multi-participant submission modal
- Show received and given review cards with context
- Render reputation widgets and statistics
- Handle loading states, errors, and empty states gracefully

**Notification System** (User Engagement)
- Send real-time alerts on session creation
- Notify participants when sessions publish
- Deliver deadline reminder notifications (future enhancement)
- Support both push notifications and email channels

**Snapshot Mechanism** (Data Integrity)
- Capture service context at review submission time
- Preserve booking details before they can change
- Store subject areas, education levels, session timing
- Enable context display independent of booking table state

### Data Flow Diagram

```
┌─────────────────┐
│  Booking Table  │
│  status =       │
│  'Completed'    │
└────────┬────────┘
         │ Trigger: on_booking_completed_create_review
         ▼
┌──────────────────────────┐
│ booking_review_sessions  │
│ status = 'pending'       │
│ publish_at = now + 7d    │
│ participant_ids = [...]  │
└────────┬─────────────────┘
         │ User submits via API
         ▼
┌──────────────────────┐
│  profile_reviews     │
│  + snapshot fields   │
└────────┬─────────────┘
         │ Trigger: on_review_submitted_check_publish
         ▼
    ┌────────────────┐
    │ All submitted? │
    └───┬───────┬────┘
   Yes  │       │ No
        │       └──> Wait for deadline
        ▼
┌────────────────────────┐
│ session.status =       │
│ 'published'            │
└────────┬───────────────┘
         │ Trigger: on_session_published_update_ratings
         ▼
┌─────────────────────┐
│ profiles table      │
│ average_rating ↑    │
│ review_count ↑      │
└─────────────────────┘
```

---

## User Journey Flows

### Design Principles and User Experience

**Transparency and Communication:**
The system prioritizes clear communication about the escrow mechanism and review lifecycle. Users receive explicit explanations about:
- Why reviews remain hidden during the seven-day period
- How early publication works and what triggers it
- What happens if not all participants submit
- When and how published reviews become visible

**Progressive Disclosure:**
Complex multi-participant review sessions present information incrementally:
- Initial notification shows only urgent action required ("Review your session")
- Modal displays participant list and context only when user engages
- Submission confirmation explains publication timing after action completes
- Published reviews reveal all feedback simultaneously to prevent partial information anxiety

**Urgency and Motivation:**
The interface uses status indicators to encourage timely submission without creating excessive pressure:
- "Due Today" for sessions expiring within 24 hours (red accent)
- "Due Soon" for sessions expiring within 48 hours (amber accent)
- "Pending" for sessions with 3+ days remaining (neutral gray)
- Countdown timers show days remaining for time awareness

**Accessibility Considerations:**
- Star rating controls support keyboard navigation and screen readers
- Color-based status indicators include text labels for color-blind users
- Modal dialogs trap focus and support escape key dismissal
- ARIA labels describe participant relationships and review requirements
- Loading states provide screen reader announcements for async operations

### Student Journey: From Booking to Review Publication

**Session Completion**
Sarah books a mathematics tutoring session with James for GCSE preparation. After the session, Sarah's parent processes payment through the platform. Within seconds of payment confirmation, the system creates a review session and sends notifications to both Sarah and James.

**Discovery Phase**
Sarah logs into Tutorwise and sees a pending review notification badge. She navigates to the reviews hub where a card displays James's profile picture, the mathematics subject, session date, and a countdown showing six days remaining. The card status indicates "Due Soon" with a subtle urgency color.

**Submission Experience**
Sarah clicks "Write Review" and sees a modal presenting James's information with the service context ("GCSE Mathematics - 18 December 2024"). She selects four stars and writes a comment: "James explained algebra concepts clearly and was patient with my questions. Would book again for exam prep."

**Waiting Period**
The modal confirms her submission and explains that reviews will publish when both participants submit or after the seven-day period. Sarah sees two call-to-action buttons: "Book Again" linking to bookings and "Refer & Earn" linking to the referral program. She closes the modal and the pending review card disappears from her list.

**Early Publication**
James submits his review three days later. The moment his submission completes, both participants receive publication notifications. Sarah opens the app and sees James's review of her engagement and preparedness. Her profile now shows an updated average rating and review count reflecting the new feedback.

### Tutor Journey: Managing Multiple Reviews

**Review Dashboard Access**
James is a tutor with fifteen pending reviews from recent session completions. He accesses the reviews hub and sees all pending tasks sorted by urgency. Three show "Due Today" status, five show "Due Soon", and seven show "Pending" for sessions completed more recently.

**Batch Submission Strategy**
James prioritizes the most urgent reviews first. For each session, he recalls the specific student and service details thanks to the preserved context showing subject, level, and session date. He provides honest assessments of student preparedness, engagement level, and learning progress.

**Mixed Submission Outcomes**
Some of James's reviews publish early when students have already submitted. Others remain pending as he waits for student participation. After seven days, sessions with only his submission auto-publish, and his thoughtful feedback becomes visible even though some students never completed their reviews.

**Profile Impact**
As reviews accumulate, James's average rating and review count increase. His marketplace profile shows a verified track record with specific feedback about his GCSE mathematics teaching. New students browsing tutors see his strong reputation in relevant subject areas, increasing his booking inquiry rate.

### Referred Booking: Multi-Party Review

**Complex Participant Network**
Emma refers her friend David to tutor Lisa for physics lessons. The booking creates a three-party relationship requiring six total reviews: Emma about David, Emma about Lisa, David about Emma, David about Lisa, Lisa about Emma, and Lisa about David.

**Submission Interface Adaptation**
When David accesses the review session, the modal presents two review forms - one for Emma (the referring agent) and one for Lisa (the tutor). The interface clearly labels each reviewee's role and provides contextual prompts appropriate to their relationship.

**Incremental Publication**
Emma submits first, then Lisa three days later. The system waits for David's submission. On day five, David completes his reviews, triggering immediate publication of all six reviews simultaneously. All three participants receive notifications and can see the complete feedback network.

**Reputation Benefits**
Emma's agent profile builds credibility through successful referral reviews. Lisa gains verified student feedback. David's student profile shows engagement metrics that help future tutors assess fit. The complete feedback loop strengthens trust across the network.

---

## Data Model

### Table: booking_review_sessions

**Purpose:** Orchestrates the review collection and publication lifecycle for completed bookings.

**Key Fields:**

`id` - Unique session identifier (UUID format)
Primary key allowing direct session reference in API queries and review submissions.

`booking_id` - Reference to originating booking (UUID, unique constraint)
Establishes one-to-one relationship with bookings table. Each completed booking generates exactly one review session, preventing duplicate review opportunities for the same service delivery.

`status` - Current lifecycle state (enum: pending, published, expired)
Drives visibility rules and triggers automated actions. Pending sessions hide reviews from non-target participants. Published sessions display all reviews to all participants. Expired sessions indicate deadline passed without complete submission.

`publish_at` - Scheduled publication timestamp
Set to seven days after session creation. Automated jobs monitor this field to trigger deadline-based publication. Users see countdown timers calculated from this timestamp.

`published_at` - Actual publication timestamp (nullable)
Records when session transitioned to published state, enabling early publication tracking and publication latency analysis. Null for unpublished sessions.

`participant_ids` - Array of participating profile identifiers
Extracted from booking relationships (client, tutor, optional agent). Drives authorization checks - users must be in this array to access the session. Determines complete submission evaluation.

`submitted_ids` - Array of profiles who completed submission
Grows as participants submit reviews. When this array length equals participant_ids array length, early publication triggers. Empty initially, populated incrementally during collection phase.

**Indexes:**
- Primary key on id for session lookups
- Unique constraint on booking_id preventing duplicate sessions
- Index on status for filtering pending versus published reviews
- Index on publish_at for deadline monitoring queries
- GIN index on participant_ids for authorization checks

**Row-Level Security:**
Users can see sessions where their profile ID appears in participant_ids array. Service role (backend processes) has unrestricted access for automation.

### Table: profile_reviews

**Purpose:** Stores individual review records with ratings, comments, and preserved service context.

**Core Fields:**

`id` - Review record identifier (UUID)
Unique primary key for individual review entries.

`session_id` - Parent session reference
Links to booking_review_sessions, enabling session-level operations like publication and visibility control.

`reviewer_id` - Profile who wrote the review
Foreign key to profiles table. Combined with session_id enables "reviews I gave" queries.

`reviewee_id` - Profile being reviewed
Foreign key to profiles table. Combined with session_id enables "reviews I received" queries. Check constraint prevents self-reviews (reviewer_id ≠ reviewee_id).

`rating` - Star rating (integer 1-5)
Quantitative assessment driving aggregate score calculations. Index on this field supports rating distribution queries and filtering.

`comment` - Written feedback (text, nullable)
Optional qualitative assessment providing context beyond the numeric rating. Nullable to allow rating-only reviews for users who prefer quick submission.

`metadata` - Extensible JSON field
Future-proofing for additional review attributes like helpfulness votes, response threading, or structured feedback categories. Currently unused but enables enhancement without schema migrations.

**Snapshot Fields (Migration 105):**

`service_name` - Preserved booking service description
Copied from booking at review creation time. Displays service context even if original booking is deleted or modified. Example: "60-Minute Online Tutoring Session"

`subjects` - Array of subject areas taught
Extracted from booking subjects field at submission. Enables filtering reviews by subject without joining to bookings table. Example: ["Mathematics", "Physics"]

`levels` - Array of education levels covered
Extracted from booking levels field at submission. Supports level-specific review filtering. Example: ["GCSE", "A-Level"]

`session_date` - When session occurred (timestamp)
Copied from booking session_start_time. Provides temporal context for reviews and enables recency filtering. Preserved even if booking scheduling data changes.

`location_type` - Delivery method (enum: online, in_person, hybrid)
Captured from booking at submission. Allows users to filter reviews by delivery preference, identifying tutors strong in specific teaching formats.

`booking_id` - Original booking reference (nullable for future flexibility)
Maintains linkage to source booking for administrative queries and potential future features like review dispute resolution requiring booking context verification.

**Unique Constraints:**
- Composite unique key on (session_id, reviewer_id, reviewee_id) prevents duplicate reviews within sessions
- Check constraint reviewer_id ≠ reviewee_id prevents self-reviews

**Indexes:**
- Primary key on id
- Index on session_id for session-based queries
- Index on reviewer_id for "reviews I gave" queries
- Index on reviewee_id for "reviews I received" queries
- Index on rating for distribution analytics
- Index on created_at for recency sorting
- GIN indexes on subjects and levels arrays for filtering

**Row-Level Security:**
- Users can view their own reviews (reviewer_id match)
- Users can view published reviews from sessions they participated in
- Users can view reviews about themselves regardless of publication status
- Users can insert/update own reviews only during session pending state

### Table: profiles (Extensions)

**Review-Related Fields:**

`average_rating` - Aggregate rating score (decimal)
Calculated from all published reviews where profile is reviewee. Updated automatically by trigger on session publication. Displayed prominently on profiles and used in marketplace discovery ranking.

`review_count` - Total published reviews (integer)
Count of published reviews where profile is reviewee. Displayed alongside average rating to provide confidence context (thirty reviews at four-point-eight stars signals more reliability than three reviews at five stars).

**Calculation Trigger:**
Function `update_profile_ratings_on_publish()` recalculates both fields when review sessions publish. Queries all published reviews for the profile, computes average rating, counts total reviews, and updates profile record atomically.

### Enum Types

**booking_review_status:**
- `pending` - Session collecting reviews, not yet published
- `published` - Reviews visible to all participants
- `expired` - Deadline passed, session published with partial submission

Used exclusively by booking_review_sessions.status field.

**location_type:**
- `online` - Virtual sessions via video platform
- `in_person` - Physical meeting location
- `hybrid` - Combination of online and in-person delivery

Shared with bookings table, preserved in review snapshots.

---

## Integration Points

### Integration One: Bookings System (Critical)

**Dependency Type:** Trigger-based automation
**Direction:** Bookings → Reviews (one-way initiation)

**Integration Flow:**

When bookings reach completed status with confirmed payment, the review creation trigger fires automatically. The trigger extracts participant identities from booking relationships, determines session type (direct, referred, agent job), and creates the appropriate review session configuration.

The booking provides all participant context - client profile ID, tutor profile ID, optional agent profile ID from referrals. The trigger populates participant_ids array based on booking type, ensuring correct review network topology.

**Snapshot Fields Integration:**

At review submission time, the API reads booking data to populate snapshot fields. This happens synchronously during submission to ensure atomic capture before booking modifications. Fields extracted include service_name, subjects array, levels array, session_start_time, and location_type.

**Data Dependencies:**

Reviews require booking data integrity at two points - session creation (participant identification) and review submission (snapshot population). After submission, reviews become independent of booking state, enabling booking deletion or modification without review impact.

**Failure Scenarios:**

If booking data is missing or corrupted at session creation, the trigger logs an error and skips session creation rather than creating invalid review opportunities. If booking data is missing at submission time, the API rejects submission with validation error, preventing incomplete snapshot preservation.

### Integration Two: Payment Processing (Critical)

**Dependency Type:** State transition trigger
**Direction:** Payments → Bookings → Reviews

**Integration Flow:**

Payment confirmation updates booking payment_status to confirmed and booking status to completed. The updated_at timestamp change triggers booking table monitoring, which then fires the review session creation logic. This three-stage cascade ensures reviews only generate for financially validated transactions.

The payment integration prevents review spam by gating review creation on payment completion. Free or unpaid sessions never generate review opportunities, maintaining review integrity and verified booking status.

**Webhook Handling:**

Payment webhooks from Stripe call the handle_successful_payment database function. This function atomically updates booking status and payment status in a single transaction, ensuring trigger execution consistency.

**Refund Scenarios:**

Payment refunds do not automatically remove published reviews. This design decision preserves honest feedback about service delivery even when financial disputes arise. Future enhancements may add dispute flags or context notes for refunded sessions.

### Integration Three: Profile Management (Bidirectional)

**Dependency Type:** Aggregate calculation automation
**Direction:** Reviews → Profiles (automated updates)

**Integration Flow:**

When review sessions publish, the profile rating update trigger fires for each reviewee in the session. The trigger queries all published reviews for that profile, calculates average rating, counts total reviews, and updates the profile record.

This real-time calculation approach maintains accuracy without batch processing delays. Users see rating changes immediately upon review publication, improving trust in the system's responsiveness.

**Display Integration:**

Profile pages read average_rating and review_count directly from the profiles table rather than aggregating on-the-fly. This denormalization trades storage redundancy for query performance, critical for marketplace browsing where hundreds of profiles may render simultaneously.

**Consistency Guarantees:**

The trigger-based approach ensures profile ratings never drift from actual review data. Every publication updates ratings atomically within the same transaction that publishes the session, preventing race conditions or partial update scenarios.

### Integration Four: Real-Time Notifications (Non-Critical)

**Dependency Type:** Event-driven messaging
**Direction:** Reviews → Ably (one-way notifications)

**Integration Flow:**

Review submission API endpoints call notification functions after successful database commits. These functions publish messages to Ably channels scoped to user IDs, enabling real-time delivery to connected clients.

Notification types include session creation (initial review opportunity), session publication (reviews now visible), and optionally deadline reminders (future enhancement). Each notification includes action URLs linking to relevant pages.

**Failure Handling and Retry Logic:**

Notification failures do not rollback review operations. The notification layer wraps all Ably calls in try-catch blocks, logging errors without throwing exceptions. This ensures review state changes succeed even if notification infrastructure is unavailable.

When notification delivery fails due to network issues or Ably service interruptions, the system implements exponential backoff retry logic:
- First retry: 2 seconds after initial failure
- Second retry: 5 seconds after first failure
- Third retry: 15 seconds after second failure
- Final retry: 60 seconds after third failure

After four failed attempts, the system logs a critical error but does not block the review operation. Users will still see notifications when they next visit the platform through the persistent notification badge system, ensuring no review opportunities are missed despite delivery failures.

**Multi-Channel Delivery:**

Users receive notifications through multiple channels with graceful fallback:
- **Real-time Ably messages** for connected clients (primary channel)
- **Persistent notification badges** in application interface (always available)
- **Email notifications** for offline users (future enhancement)

The persistent badge system queries pending review tasks on page load, providing a reliable fallback even when real-time notifications fail or users have disabled push notifications.

**Channel Naming and Security:**

Notification channels follow the pattern `notifications:reviews:{userId}`. This scoping ensures users only receive notifications relevant to their sessions while preventing unauthorized access to other users' notification streams.

Ably channel permissions enforce that users can only subscribe to their own notification channel. Attempts to subscribe to other users' channels result in authentication errors, preventing notification eavesdropping.

### Integration Five: Credibility Scoring (One-Way Read)

**Dependency Type:** Data consumption
**Direction:** Reviews → CaaS (one-way data flow)

**Integration Flow:**

The Credibility as a Service system reads profile average_rating and review_count fields as input factors for overall credibility score calculation. Higher ratings and larger review volumes increase credibility scores, improving marketplace ranking and trust indicators.

CaaS processes run as batch jobs that query profile data periodically. Reviews do not trigger immediate credibility recalculation; instead, the nightly scoring job picks up rating changes and incorporates them into the next scoring cycle.

**Weighting and Influence:**

Review metrics contribute significantly to credibility scores but do not solely determine them. CaaS combines reviews with profile completeness, response times, booking completion rates, and platform engagement metrics for holistic assessment.

The average_rating field influences marketplace ranking through a normalized score. A tutor with 4.8 average rating receives higher visibility than one with 4.2. The review_count provides confidence weighting - tutors with more reviews gain credibility faster than those with few reviews at similar average ratings.

**CaaS Scoring Impact Examples:**

- Tutor with 50 reviews at 4.8 average: High credibility, prominent marketplace placement
- Tutor with 5 reviews at 5.0 average: Moderate credibility, small sample size reduces confidence
- Tutor with 200 reviews at 4.3 average: High confidence but lower quality signal, mixed marketplace impact
- New tutor with 0 reviews: Relies entirely on profile completeness and other CaaS factors

The credibility system prevents gaming by requiring verified booking completion before reviews count. Fake reviews from non-booking relationships never generate review sessions, maintaining integrity.

**Data Flow Timing:**

Profile rating updates occur immediately upon review publication through database triggers. However, CaaS credibility score recalculation happens asynchronously during the next batch job execution (typically nightly). This creates a small lag between review publication and marketplace ranking updates.

For critical tutor ranking queries, the system may read average_rating directly for real-time sorting while displaying cached credibility scores for supplementary trust signals.

**Future Enhancements:**

Potential integration improvements include review recency weighting (recent reviews weighted higher than old reviews), review quality assessment (detailed comments weighted higher than rating-only), and reviewer credibility (reviews from high-credibility reviewers weighted higher). See CaaS documentation for detailed weighting formulas and scoring algorithms.

### Integration Six: Audit Logging (Comprehensive)

**Dependency Type:** Event recording
**Direction:** Reviews → Audit Log (one-way tracking)

**Integration Flow:**

All review lifecycle events generate audit log entries with detailed context. Events tracked include review session creation, individual review submission, early publication triggers, scheduled publication execution, and profile rating updates.

Audit entries capture actor (user or system), action, timestamp, and relevant entity identifiers. For review submissions, logs include session ID, reviewer ID, and whether submission triggered early publication.

**Compliance and Investigation:**

Audit logs support dispute resolution, quality monitoring, and compliance requirements. Platform administrators can trace complete review history for any session, identifying submission timing, publication triggers, and rating calculation provenance.

**Retention and Access:**

Audit logs persist indefinitely with access restricted to platform administrators and authorized support staff. Log queries support filtering by actor, event type, and time range for investigation and analysis.

---

## Business Logic and Rules

### Rule One: Automatic Session Creation

**Trigger Condition:** Booking status transitions to completed AND payment status equals confirmed

**Execution Logic:**
The system creates one review session per eligible booking. Participant identification depends on booking type:
- Direct bookings include client and tutor
- Referred bookings include client, tutor, and referring agent
- Agent job bookings include participants based on job configuration

**Publication Deadline Calculation:**
Session publish_at timestamp equals session creation timestamp plus seven days. This fixed duration applies regardless of booking characteristics, providing consistent user expectations.

**Notification Dispatch:**
After session creation commits, the system sends real-time notifications to all participants with links to the reviews hub. Notifications include service context and deadline information.

### Rule Two: Early Publication Eligibility

**Evaluation Trigger:** After any participant submits reviews

**Eligibility Criteria:**
The system counts submitted_ids array length and compares to participant_ids array length. When counts match (all participants submitted), early publication triggers immediately.

**Publication Process:**
Early publication changes session status from pending to published, sets published_at timestamp, generates publication notifications, and triggers profile rating recalculation for all reviewees.

**Audit Trail:**
Early publication events record in audit logs with `review_session.published_early` event type, enabling analysis of submission promptness and user engagement patterns.

### Rule Three: Deadline-Based Publication

**Monitoring Process:** Background jobs query sessions where publish_at timestamp has passed and status remains pending

**Automatic Publication:**
When deadline passes, the system publishes sessions regardless of submission completeness. Partial review sets (only some participants submitted) still publish, making available feedback visible.

**Status Assignment:**
Deadline publication may set status to either published or expired based on business rules. Currently, both use published status, but expired enum value exists for future differentiation of partial versus complete sessions.

### Rule Four: Visibility Control

**Pending Session Rules:**
- Participants cannot see reviews other participants wrote about third parties
- Participants CAN see reviews written about themselves (selective visibility)
- Non-participants cannot see any reviews from pending sessions
- Platform administrators have unrestricted visibility for moderation

**Published Session Rules:**
- All participants can see all reviews in the session
- Published reviews appear on public profile pages with verified badges
- Non-participants can see published reviews on profile pages they visit
- Review context displays using snapshot fields, independent of booking state

**Privacy Protection:**
The system never exposes pending reviews to unintended recipients. Database row-level security enforces visibility rules at the query layer, preventing application-layer authorization bypass.

### Rule Five: Submission Validation

**Participant Verification:**
Submissions must come from profiles in the session participant_ids array. Users cannot submit reviews for sessions they weren't part of. The API validates the authenticated user's profile ID against the session's participant list before processing any submission.

**Reviewee Validation:**
All reviewee_id values in submission must exist in session participant_ids array. Users cannot review arbitrary platform members, only session participants. This prevents review injection attacks where malicious users attempt to submit reviews about profiles not involved in the session.

**Completeness Requirement:**
Submissions must include reviews for all other session participants. A student in a two-party session must review the tutor; they cannot skip participants. This ensures mutual assessment completeness and prevents selective review submission.

**Submission Examples by Participant Type:**

*Two-Party Direct Booking (Student and Tutor):*
- Student must submit one review about the tutor
- Tutor must submit one review about the student
- Total: 2 reviews for session completion

*Three-Party Referred Booking (Student, Tutor, and Agent):*
- Student must submit two reviews: one about tutor, one about agent
- Tutor must submit two reviews: one about student, one about agent
- Agent must submit two reviews: one about student, one about tutor
- Total: 6 reviews for session completion

*Agent Job Booking (Variable Configuration):*
- Each participant must submit reviews about every other participant
- System calculates required review count based on participant array length
- Formula: Each participant submits (participant_count - 1) reviews
- Example: 4-party session requires 12 total reviews (4 participants × 3 reviews each)

**Rating Constraints:**
Star ratings must fall between one and five inclusive. The API rejects submissions with out-of-range values.

**Comment Length:**
Comments are optional but encouraged. The system accepts rating-only reviews (null comment) or ratings with written feedback. No minimum comment length enforced, but user interface prompts encourage detailed feedback.

**Immutability After Submission:**
Once submitted during pending state, reviews cannot be edited. This immutability prevents gaming where users submit positive reviews to trigger early publication, then modify them to negative feedback later.

**Exception:** During pending state (before session publication), users may update their own reviews if they notice errors or want to revise feedback. Once the session publishes (status changes to 'published'), all reviews become permanently immutable. This provides a reasonable revision window while preventing post-publication manipulation.

**Edge Cases and Error Scenarios:**

*Deleted Profile During Pending Period:*
If a participant deletes their profile before submitting reviews, the session continues with remaining participants. The system treats deleted profiles as non-submitting participants. When the deadline expires, the session publishes with available reviews. Future enhancement may notify remaining participants about deleted participant status.

*Booking Deletion After Session Creation:*
Review sessions persist independently of booking records. If a booking is deleted after session creation (administrative correction or dispute resolution), the review session continues its lifecycle. Snapshot fields preserve context, ensuring reviews remain meaningful despite missing booking data.

*Payment Refund After Review Publication:*
Refunded bookings do not automatically unpublish reviews. Published reviews remain visible with "Verified Booking" badges, as the service delivery occurred regardless of financial dispute outcome. Future enhancement may add "Refunded" context notes to published reviews.

*Duplicate Submission Attempts:*
API validates that reviewer_id has not already submitted for the session. Duplicate submission attempts return 409 Conflict error with message "You have already submitted reviews for this session." This prevents accidental double-submission from UI bugs or network retries.

*Partial Network Failures:*
If review submission writes to database successfully but notification delivery fails, the review still counts as submitted. Users see updated pending review list on next page load, ensuring consistency despite notification gaps.

*Concurrent Submission Racing:*
Multiple participants submitting simultaneously may trigger early publication check concurrently. Database transaction isolation prevents race conditions - exactly one submission triggers publication, others see already-published session state.

### Rule Six: Snapshot Preservation

**Timing Requirement:**
Snapshot fields populate at review submission time, not at session creation. This approach captures the most accurate state of booking details when feedback is actually written.

**Field Selection Criteria:**
Snapshot fields include information users need to understand review context but exclude personally identifying information beyond profile references. Service descriptions, subject areas, education levels, and delivery methods preserve context. Student names, addresses, and payment details are not snapshotted.

**Fallback Handling:**
If booking data is unavailable at submission time (deleted booking edge case), the API rejects submission rather than creating reviews with incomplete context. This strict validation maintains review utility.

**Independence Guarantee:**
After submission with complete snapshots, reviews display correctly even if:
- Original booking is deleted from the database
- Tutor changes their service offerings or listed subjects
- Booking details are modified for accounting or administrative purposes
- Platform restructures subject taxonomies or education level definitions

### Rule Seven: Profile Rating Calculation

**Calculation Timing:**
Profile ratings recalculate when sessions publish, not when individual reviews submit. This approach ensures ratings only include publicly visible feedback.

**Inclusion Criteria:**
Only reviews from published sessions contribute to profile ratings. Pending reviews, even if submitted, do not affect averages until publication occurs.

**Precision Requirements:**
Average ratings store as decimal values with two decimal places, providing granularity for marketplace differentiation. A tutor with four-point-eight average stands noticeably above four-point-five competitors.

**Minimum Review Threshold:**
Profiles display ratings regardless of review count. Single-review profiles show one-star-average accurately, though user interface may add context warnings about small sample sizes.

**Calculation Atomicity:**
Rating updates occur within the same database transaction that publishes the session. This prevents race conditions where reviews become visible before ratings update or vice versa.

---

## Security and Privacy

### Row-Level Security Policies

**booking_review_sessions Table:**

Policy Name: sessions_visible_to_participants
Rule: Users can SELECT sessions where their profile ID appears in participant_ids array
Purpose: Ensures users only see sessions they're involved in, preventing data leakage about other platform sessions

Policy Name: sessions_service_role_full_access
Rule: Backend processes with service_role can perform all operations
Purpose: Enables automated triggers and background jobs to manage session lifecycle without hitting RLS restrictions

**profile_reviews Table:**

Policy Name: reviews_visible_to_participants
Rule: Users can SELECT reviews from sessions they participated in AND session status equals published
Purpose: Enforces blind escrow - users don't see session reviews until publication

Policy Name: reviews_about_self_always_visible
Rule: Users can SELECT reviews where reviewee_id matches their profile ID regardless of session status
Purpose: Allows users to see pending feedback about themselves, supporting informed decision-making about submission urgency

Policy Name: reviews_insert_own_only
Rule: Users can INSERT reviews where reviewer_id matches their profile AND session status equals pending
Purpose: Prevents submission after publication and ensures users only submit under their own identity

Policy Name: reviews_update_own_pending_only
Rule: Users can UPDATE reviews where reviewer_id matches their profile AND session status equals pending
Purpose: Allows corrections or improvements to feedback before publication, locks changes after publication

### Data Privacy Considerations

**Personally Identifiable Information:**

Review records reference profile IDs but do not duplicate personal information like names, email addresses, or phone numbers. Profile references enable appropriate display without embedding sensitive data in review records.

Snapshot fields preserve service context but exclude client-specific information. A review might snapshot "GCSE Mathematics" but not student names or addresses.

**Right to Be Forgotten (GDPR Compliance):**

When users request account deletion under GDPR or similar privacy regulations, the system must handle reviews carefully:
- Published reviews may remain with anonymized profile references to preserve marketplace integrity
- Pending reviews for the deleted profile are removed completely
- Reviews written by the deleted profile may remain with "Former User" attribution
- Profile rating calculations recalculate after review removal
- Data export requests include all reviews (received and given) with full metadata

**Current Implementation Gap:** System does not fully support automated GDPR deletion workflows. Future enhancement needed for compliant data removal processes.

**Age Restrictions and Minor Protection:**

Platform enforces age-based restrictions on public review visibility:
- Users under 18 years old cannot leave publicly visible reviews
- Reviews from minors remain in private escrow permanently
- Tutors can see private feedback from minor students for quality improvement
- Guardian accounts may submit reviews on behalf of minor students
- All reviews about minors are subject to enhanced moderation

**Implementation Status:** Age verification integrated with profile creation. Review submission validates reviewer age before accepting public reviews.

**Review Content Moderation:**

The system includes Trust & Safety integration for monitoring and moderating review content. The moderation workflow operates in two phases:

**Phase One: Automated Filtering**
- All review submissions pass through automated content analysis before acceptance
- Prohibited content detection includes profanity, personal contact information (emails, phone numbers, addresses), hate speech patterns, and suspicious URL patterns
- When prohibited content is detected, the API rejects the submission with a specific error message explaining the violation
- Users must revise their review to remove flagged content before resubmission

**Phase Two: Manual Moderation Queue**
- Flagged reviews enter a moderation queue visible to Trust & Safety team administrators
- Platform administrators can review flagged content, approve with context notes, request revision from reviewer, or reject entirely
- Participants can report published reviews through a "Report Review" button, sending them to the moderation queue
- Moderation decisions record in audit logs with moderator identity, decision rationale, and timestamps

**Reportable Issues:**
- Defamatory statements about participants
- Personally identifying information disclosure beyond platform profiles
- Inappropriate language or harassment
- Coordinated review manipulation or quid-pro-quo arrangements
- False factual claims about sessions that never occurred
- Content that violates platform community guidelines

**Current Implementation Status:**
- Automated filtering: Implemented with basic pattern matching
- Manual moderation queue: Implemented with admin dashboard access
- Participant reporting: Implemented through report button on published reviews
- Advanced content analysis (AI-powered sentiment and context): Future enhancement

**Moderation Enforcement Actions:**
- **Content Removal:** Review hidden from public display, replaced with "This review was removed for violating community guidelines"
- **Content Edit:** Moderator removes specific violating portions while preserving compliant feedback
- **Account Warning:** Reviewer receives notification about guideline violation with strike count
- **Account Suspension:** Repeated violations result in temporary or permanent review submission restrictions
- **Session Investigation:** Suspicious patterns trigger broader investigation of booking and payment legitimacy

### Authentication and Authorization

**Session Access Control:**

API endpoints verify that requesting user appears in session participant_ids array before returning session details. This prevents enumeration attacks where malicious actors probe session IDs to discover platform activity.

**Submission Authorization:**

Review submission requests validate:
1. User is authenticated (valid session token)
2. User appears in session participant_ids (authorized participant)
3. User has not already submitted (prevents duplicate submission)
4. Session remains in pending status (prevents post-publication modification)

**Profile Rating Integrity:**

Profile rating calculations run as database triggers with service_role permissions. Application code cannot directly modify average_rating or review_count fields, preventing manipulation attacks.

The trigger-based approach ensures ratings always reflect actual published reviews, even if attackers compromise application servers or API authentication.

### Audit Trail for Compliance

**Event Logging Coverage:**

All review operations generate audit events:
- Session creation (booking_id, participant_ids, deadline)
- Review submission (session_id, reviewer_id, timestamp, auto_published flag)
- Session publication (session_id, publication_type early/scheduled, reviewee_ids)
- Rating updates (profile_id, old_rating, new_rating, review_count)

**Audit Data Retention:**

Audit logs persist indefinitely with database backups ensuring recovery after incidents. Log entries are immutable - no UPDATE or DELETE operations allowed on audit records.

**Access Controls:**

Only platform administrators and authorized support staff can query audit logs. Log access generates its own audit entries, creating accountability for privileged access.

**Investigation Support:**

Audit trails enable investigation of disputes (who submitted what when), quality issues (unusual rating patterns), and security incidents (unauthorized access attempts or data modification).

---

## Testing Strategy and Quality Assurance

### Automated Testing Coverage

**Database Trigger Tests:**
Critical trigger functions require comprehensive test coverage:
- Session creation on booking completion with various participant configurations
- Early publication evaluation after each submission
- Profile rating recalculation with edge cases (first review, single review, large review counts)
- Deadline-based publication for expired sessions
- Audit log entry generation for all lifecycle events

Test approach: Database-level testing using transaction rollback to isolate test data, validating trigger execution timing, correctness, and error handling.

**API Integration Tests:**
Review submission endpoints require thorough validation:
- Successful submission with valid participant relationships
- Rejection of invalid reviewee_id values
- Duplicate submission prevention
- Authorization enforcement (only session participants can submit)
- Snapshot field population accuracy
- Notification delivery tracking

Test approach: End-to-end API tests with mock Supabase client, validating request/response contracts and database state changes.

**User Interface Tests:**
React components need functional and visual testing:
- Pending review card display with various urgency states
- Multi-participant submission modal with 2, 3, and 4+ reviewees
- Star rating interaction and keyboard accessibility
- Modal keyboard navigation and focus trapping
- Loading states and error message display
- Empty state handling (no pending reviews, no received reviews)

Test approach: React Testing Library for component behavior, Storybook for visual regression, Cypress for end-to-end user flows.

**Notification Delivery Tests:**
Real-time notification system requires reliability validation:
- Successful delivery to connected clients
- Retry logic triggering on Ably failures
- Graceful degradation when notification infrastructure unavailable
- Channel security preventing cross-user notification access

Test approach: Mock Ably client with simulated network failures, validate retry attempts and error logging.

### Manual Testing Scenarios

**End-to-End User Flows:**
QA team validates complete review lifecycle:
1. Complete booking and trigger review session creation
2. Submit reviews from all participants and verify early publication
3. Submit reviews from partial participants and verify deadline publication
4. Verify published reviews display on all participant profiles
5. Confirm profile ratings update correctly after publication

**Edge Case Validation:**
- Booking deletion after session creation (reviews persist with snapshots)
- Profile deletion during pending period (session continues with remaining participants)
- Payment refund after publication (reviews remain visible)
- Concurrent submissions from multiple participants (race condition handling)
- Network interruption during submission (idempotency and retry)

**Cross-Browser and Device Testing:**
- Desktop browsers: Chrome, Firefox, Safari, Edge
- Mobile browsers: iOS Safari, Android Chrome
- Responsive design validation at breakpoints: 320px, 768px, 1024px, 1440px
- Touch interaction testing for star ratings on mobile devices
- Screen reader testing with VoiceOver (iOS) and TalkBack (Android)

**Performance Testing:**
- Page load time with 100+ pending reviews
- Submission response time under normal and peak load
- Database query performance with 10,000+ reviews per profile
- Notification delivery latency with 1,000 concurrent users

### Quality Metrics and Monitoring

**Success Metrics:**
- Review submission rate: Target 75% of completed bookings
- Early publication rate: Target 30% of sessions
- API error rate: Target < 0.1% for submission endpoints
- Notification delivery success: Target > 99.5%
- Profile rating calculation accuracy: 100% (verified by audit trails)

**Error Monitoring:**
- Real-time alerting for API 5xx errors on review endpoints
- Notification delivery failure tracking with retry attempt counts
- Database trigger execution failure logging
- Performance degradation alerts (response time > 2s threshold)

**User Feedback Collection:**
- In-app feedback widget on reviews hub page
- Post-submission satisfaction survey (optional)
- Support ticket tracking for review-related issues
- User testing sessions for new feature validation

---

## Performance Considerations

### Query Optimization Strategies

**Pending Review Tasks Endpoint:**

This endpoint filters sessions by status, participant_ids array membership, and deadline. Performance optimization uses:
- Compound index on (status, publish_at) for deadline-filtered queries
- GIN index on participant_ids for array membership checks
- Query planner can use index-only scans for count queries

Expected performance: Sub-100ms response for users with hundreds of pending reviews

**Profile Reviews Query:**

Reviews received queries filter by reviewee_id and published status, then join to profiles for reviewer display names. Optimization approach:
- Index on reviewee_id enables efficient filtering
- Index on created_at supports recency sorting
- Denormalized reviewer profile data in API responses reduces join count

Expected performance: Sub-200ms for profiles with thousands of reviews

**Aggregate Rating Calculation:**

Profile rating updates query all published reviews for a reviewee and calculate average. This operation runs synchronously during session publication. Optimization strategies:
- Index on (reviewee_id, session_id) enables fast review set retrieval
- Database aggregation functions (AVG, COUNT) execute efficiently in native code
- Transaction batching when multiple reviewees in session share rating update logic

Expected performance: Sub-50ms per reviewee rating calculation

### Caching Strategy

**Client-Side Caching:**

React Query caches review data with five-minute staleness thresholds. Users browsing reviews see cached data for rapid navigation, with background refetches ensuring freshness.

Cache invalidation triggers on review submission - after successful submission, all review-related queries invalidate and refetch. This ensures users see updated pending review counts and published review immediately.

**Server-Side Caching:**

Currently no server-side caching layer. All queries execute against primary database. Future enhancement: Redis caching for profile review lists and aggregate statistics.

**Denormalization Benefits:**

Average rating and review count storage on profiles table provides implicit caching. Marketplace queries read these fields directly without aggregating reviews, enabling fast profile list rendering.

### Scalability Projections

**Current Platform Scale:**

Assuming one thousand completed bookings per month generating review sessions:
- Sessions table: Twelve thousand rows per year
- Reviews table: Twenty-four thousand rows per year (assuming two-party sessions average)
- Profile ratings: Updated for two thousand profiles per year

At this scale, standard database indexes provide adequate performance without sharding or specialized optimization.

**Growth Scenario (10x):**

Ten thousand completed bookings per month:
- Sessions table: One hundred twenty thousand rows per year
- Reviews table: Two hundred forty thousand rows per year
- Profile rating updates: Twenty thousand per year

Database query performance remains acceptable with proper indexing. Consider partitioning reviews table by created_at for archival after five years.

**High-Scale Scenario (100x):**

One hundred thousand completed bookings per month:
- Sessions table: One point two million rows per year
- Reviews table: Two point four million rows per year
- Profile rating updates: Two hundred thousand per year

At this scale, consider:
- Read replicas for review display queries
- Materialized views for aggregate statistics
- Background queue for rating recalculation (async triggers)
- CDN caching for published review data

### Background Job Performance

**Deadline Publication Job:**

Scheduled task queries sessions where publish_at < current_timestamp AND status = 'pending'. Expected query selectivity: Very high (few sessions meet criteria at any moment).

Job execution frequency: Every five minutes provides acceptable latency between deadline crossing and publication.

**Notification Delivery:**

Ably message publishing executes asynchronously to review submission. Failed deliveries retry with exponential backoff. Notification lag tolerance: Up to one minute acceptable.

**Audit Log Writes:**

Audit entries write synchronously during transactions but do not block user-facing responses. Database commit latency impact: Negligible (sub-millisecond per entry).

---

## Deployment and Rollout Strategy

### Beta Launch Considerations

**Feature Flag Control:**
Reviews feature operates behind a feature flag enabling controlled rollout:
- Initial beta limited to 10% of platform users
- Gradual expansion to 25%, 50%, 75% based on success metrics
- Ability to disable feature quickly if critical issues emerge
- Per-user flag override for QA testing and early access programs

**Phased Rollout Plan:**

*Phase One: Internal Testing (Week 1-2)*
- Enable for dev team and QA staff accounts only
- Validate trigger execution, notification delivery, UI rendering
- Test edge cases with production data snapshots
- Collect internal feedback on user experience

*Phase Two: Trusted Beta Users (Week 3-4)*
- Invite 50 high-engagement tutors and students
- Monitor submission rates, publication timing, rating calculations
- Gather qualitative feedback through surveys and interviews
- Iterate on UI/UX based on real user behavior

*Phase Three: Limited Public Beta (Week 5-8)*
- Expand to 10% of active users selected randomly
- Track key metrics: submission rate, early publication rate, error rates
- Monitor support ticket volume for review-related issues
- Validate database performance at moderate scale

*Phase Four: General Availability (Week 9+)*
- Roll out to all users after beta success validation
- Continue monitoring metrics and user feedback
- Plan post-launch enhancements based on usage patterns

**Rollback Strategy:**

If critical issues emerge during rollout, the system supports graceful degradation:
- Feature flag disable stops new review session creation
- Existing pending sessions continue lifecycle normally
- Published reviews remain visible on profiles
- Users see "Reviews feature temporarily unavailable" messaging
- Background jobs continue processing existing sessions

**Migration and Data Integrity:**

Reviews feature required database migrations for new tables and triggers:
- Migration 043: Deprecated old listing-centric reviews table
- Migration 044: Created new mutual review schema (booking_review_sessions, profile_reviews)
- Migration 045-048: Implemented automated triggers
- Migration 105: Added snapshot fields

All migrations include rollback scripts tested in staging environment before production deployment. Zero-downtime deployment achieved through:
1. Deploy new API endpoints and UI components (feature flagged off)
2. Run database migrations during low-traffic window
3. Enable feature flag for internal testing
4. Gradually expand to public users

**Monitoring and Alerting:**

Enhanced monitoring during rollout period:
- Real-time dashboards tracking submission rates and publication timing
- Error rate alerts with 5-minute granularity (threshold: 0.5%)
- Performance degradation alerts (response time > 1s)
- Database connection pool monitoring (reviews queries isolated)
- Notification delivery success rate tracking

**Communication Plan:**

User education critical for feature adoption:
- In-app onboarding modal explaining escrow mechanism on first visit to reviews hub
- Blog post announcement detailing benefits and usage instructions
- Email campaign to active users highlighting new review opportunities
- FAQ documentation addressing common questions
- Tutorial video demonstrating review submission process

**Success Criteria for General Availability:**

Feature must meet these thresholds before expanding to all users:
- Review submission rate > 60% for beta users
- API error rate < 0.5% over 7-day period
- Notification delivery success > 99%
- Support ticket volume < 2% of review sessions
- Average user satisfaction rating > 4.0/5.0 in post-submission survey

---

## Future Enhancements

### Near-Term Improvements (Next Quarter)

**Review Response Capability:**
Allow reviewees to respond to published reviews with explanations or context. Responses appear beneath original reviews, visible to all participants. This feature addresses fairness concerns while preserving original feedback integrity.

**Email Notification Integration:**
Supplement real-time Ably notifications with email delivery for offline users. Deadline reminder emails sent at seven days, three days, and one day before publication. Improves submission rates by catching users who don't regularly check the platform.

**Improved Moderation Tools:**
Add flagging mechanism for inappropriate reviews, manual moderation queue for platform administrators, and automated content filtering for prohibited terms. Essential for compliance and community health.

**Review Quality Metrics:**
Track helpful votes, verified helpfulness indicators, and comment quality scores. Surface most helpful reviews in profile displays and marketplace discovery.

### Medium-Term Roadmap (Next Two Quarters)

**Advanced Analytics Dashboard:**
Provide tutors with review trend analysis, rating distribution over time, common praise themes, and improvement opportunity identification. Help tutors understand performance and make data-driven service improvements. This addresses the need for actionable insights from review data.

**Gamification System:**
Implement achievement badges, review submission streaks, and quality rewards to encourage thoughtful participation. Examples: "Thoughtful Reviewer" badge for detailed comments, "Prompt Responder" for submissions within 24 hours, "Complete Participant" for perfect submission record. Balances intrinsic motivation with extrinsic rewards while maintaining review quality.

**Dispute Resolution Workflow:**
Enable formal dispute processes for contested reviews. Participants can request review of feedback they believe is inaccurate or unfair. Platform administrators mediate, potentially adding context notes or removing proven false statements. Critical for handling edge cases where reviews may violate guidelines or contain factual errors.

### Long-Term Vision (Next Year)

**AI-Powered Insights:**
Automatically extract themes from review comments, identify tutor strengths and improvement areas, generate personalized teaching tips based on feedback patterns. Leverage natural language processing for actionable intelligence.

**Review-Based Matching:**
Use review data to improve tutor-student matching algorithms. Identify compatibility patterns - which tutor teaching styles work best for which student learning preferences. Optimize marketplace conversion through better fits.

**Gamification and Incentives:**
Reward users for thoughtful, detailed reviews with platform perks. Review streak bonuses, helpfulness badges, featured reviewer status. Increase participation and quality through positive reinforcement.

**Integration with Professional Development:**
Connect review feedback to tutor certification programs, continuing education recommendations, and professional growth tracking. Transform reviews from evaluation into development tool.

---

## References

### Related Documentation
- [Bookings Feature Design](../bookings/bookings-solution-design.md) - Upstream trigger for review creation
- [Payment Integration](../payments/payments-solution-design.md) - Payment confirmation flow
- [Profile Management](../profiles/profiles-solution-design.md) - Reputation display
- [Credibility as a Service](../caas/caas-solution-design.md) - Review metric consumption

### Database Migrations
- Migration 043: Deprecate listing-centric reviews table
- Migration 044: Create mutual review schema (sessions and profile_reviews tables)
- Migration 045: Add review session creation trigger on booking completion
- Migration 046: Implement early publication trigger on complete submission
- Migration 047: Add profile rating update trigger on session publication
- Migration 048: Update payment webhook to trigger review session creation
- Migration 105: Add snapshot fields for service context preservation

### Code Locations
- API Routes: `/apps/web/src/app/api/reviews/`
- React Components: `/apps/web/src/app/components/feature/reviews/`
- Type Definitions: `/apps/web/src/types/reviews.ts`
- Notification System: `/apps/web/src/lib/review-notifications.ts`
- Reviews Hub Page: `/apps/web/src/app/(authenticated)/reviews/page.tsx`

### External Dependencies
- Ably Real-Time Messaging: Notification delivery
- React Query: Client-side caching and state management
- Supabase Row-Level Security: Authorization enforcement

### Performance Metrics
- Target review submission rate: 75% of completed bookings
- Target early publication rate: 30% of sessions
- API response time target: Sub-200ms for review queries
- Profile rating update latency: Sub-50ms per reviewee

---

**Document Version:** 2.0
**Last Review Date:** December 2024
**Next Review Due:** March 2025

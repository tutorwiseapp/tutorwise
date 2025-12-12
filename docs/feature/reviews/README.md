# Reviews Feature

## Quick Links
- [Solution Design](./reviews-solution-design.md) - Architecture, integrations, and design decisions
- [Implementation Guide](./reviews-implementation.md) - Developer how-to and code patterns
- [AI Prompt Context](./reviews-prompt.md) - Common modifications and constraints

## Feature Overview

The Reviews system enables mutual, blind feedback collection after completed tutoring sessions. Unlike traditional one-sided review platforms, Tutorwise implements a sophisticated escrow mechanism that encourages honest, simultaneous feedback from all session participants.

### Core Innovation: Blind Escrow Period

Reviews remain hidden from all participants for seven days after session completion. This creates psychological safety for honest feedback - tutors and students write reviews knowing the other party cannot see their feedback until both have submitted. If all participants submit early, reviews publish immediately. Otherwise, they auto-publish after the deadline.

This approach solves the reciprocity problem common in two-sided marketplaces where fear of retaliation suppresses honest feedback.

## System Components

The reviews feature consists of nine main components:

1. **Review Session Manager** - Coordinates the lifecycle from creation to publication
2. **Pending Review Cards** - Surfaces actionable review tasks to users
3. **Review Submission Modal** - Multi-participant review collection interface
4. **Review Display Cards** - Shows received and given reviews
5. **Review Stats Widgets** - Aggregated reputation metrics
6. **Notification System** - Real-time alerts for session events
7. **Rating Calculator** - Maintains profile-level aggregate scores
8. **Snapshot Preservation** - Protects review context from data changes
9. **Audit Trail** - Compliance and quality monitoring

## Key Routes

### Web Pages
- `/reviews` - Main reviews hub with three tabs (Pending, Received, Given)

### API Endpoints
- `GET /api/reviews/pending-tasks` - Active review assignments
- `GET /api/reviews/received` - Reviews about the user
- `GET /api/reviews/given` - Reviews written by the user
- `GET /api/reviews/session/[id]` - Specific session details
- `POST /api/reviews/submit` - Submit reviews for session participants

## Database Architecture

The system uses two primary tables with automated triggers:

### booking_review_sessions
Orchestrates the escrow and publication lifecycle. Each session represents one completed booking and tracks which participants have submitted reviews. Sessions transition through three states: pending (collecting reviews), published (visible to all), or expired (deadline passed).

### profile_reviews
Stores individual review records with ratings, comments, and preserved context. Each review captures not just the feedback but also a snapshot of what was being reviewed - the service name, subjects taught, education levels, session timing, and delivery method. This preservation ensures reviews remain meaningful even if the original booking is modified or deleted.

### Automated Calculations
Profile-level aggregate scores (average rating and review count) update automatically when sessions publish. The system maintains these denormalized metrics for performance while keeping the source of truth in individual review records.

## Key Workflows

### Workflow One: Session Creation
When a booking reaches completed status with confirmed payment, the system automatically creates a review session. All participants (student, tutor, and potentially an agent in referred bookings) receive notifications with a seven-day deadline to submit feedback.

### Workflow Two: Review Submission
Users access pending reviews through the reviews hub or notification links. The submission interface presents all session participants who need reviews. Users provide star ratings and optional written feedback. The system preserves service context at submission time to protect against future data changes.

### Workflow Three: Early Publication
As each participant submits their reviews, the system checks whether all participants have completed the process. If everyone submits before the deadline, reviews publish immediately rather than waiting the full seven days. This rewards prompt engagement and reduces waiting time for users who want to see their feedback.

### Workflow Four: Scheduled Publication
Sessions that don't receive all submissions by the deadline auto-publish with whatever reviews were submitted. Partial review sets still provide value, and the escrow period prevents strategic withholding of feedback as leverage.

## Review Participation Patterns

The system adapts to different booking configurations:

**Direct Bookings** (Student ↔ Tutor)
Two participants exchange reviews - student reviews tutor, tutor reviews student. Creates a balanced two-way feedback loop.

**Referred Bookings** (Student ↔ Tutor ↔ Agent)
Six reviews total in a triangular pattern. Students review both tutor and referring agent. Tutors review student and agent. Agents review both student and tutor. This comprehensive feedback captures service quality across all relationships.

**Agent Job Bookings**
Variable participation based on job configuration. Minimum two participants, maximum six in complex multi-party arrangements.

## Integration Points

### With Bookings System
Reviews trigger automatically when bookings complete with confirmed payment. The booking record provides participant identities and service context details that get preserved in review snapshots.

### With Profile Management
Published reviews update aggregate reputation scores on tutor and student profiles. These scores influence marketplace visibility and trust indicators throughout the platform.

### With Payment Processing
Payment confirmation serves as the definitive trigger for review eligibility. Only sessions with completed financial transactions generate review opportunities, preventing spam and ensuring reviews reflect actual service delivery.

### With Real-time Notifications
The Ably notification system alerts participants when sessions create, when reviews publish, and when deadlines approach. These timely prompts improve submission rates and user engagement.

### With Credibility Scoring (CaaS)
Review metrics feed into the broader credibility assessment system. Average rating and review volume contribute to tutor discovery ranking and trust signals shown to potential students.

### With Audit Logging
All review lifecycle events record to the audit trail for quality monitoring and compliance. Session creation, individual submissions, publication events, and rating calculations all generate audit records.

## User Roles

### Students (Reviewers & Reviewees)
Students write reviews about their tutoring experience and receive feedback about their engagement and learning approach. Both perspectives help students make better future booking decisions and help tutors identify ideal student matches.

### Tutors (Reviewers & Reviewees)
Tutors provide feedback on student preparedness and engagement while receiving critical quality assessments of their teaching. Review volume and ratings directly impact marketplace visibility and booking conversion rates.

### Referring Agents (Reviewers & Reviewees)
In referred bookings, agents receive feedback on match quality and referral appropriateness. They also review both parties to ensure successful matches and identify issues requiring intervention.

### Platform Facilitators
System administrators monitor review quality, investigate disputes, handle inappropriate content reports, and ensure the escrow mechanism maintains integrity across the platform.

## Review States and Visibility

### Pending State
Reviews exist but remain hidden from other participants. Users can see reviews written about them but not reviews about other session participants. This selective visibility prevents collusion while allowing users to understand feedback they'll receive.

### Published State
All reviews in the session become visible to all participants. Published reviews display on public profiles with verified booking badges, contributing to marketplace trust and reputation.

### Expired State
Sessions that reach the seven-day deadline without complete participation auto-publish available reviews. This prevents indefinite pending states and ensures feedback reaches visibility even with incomplete participation.

## Quality and Trust Mechanisms

### Verified Booking Badge
All reviews display verified booking status, distinguishing them from unverified external reviews or promotional content. This verification comes from the payment confirmation linkage.

### Mutual Submission Incentive
The escrow period and early publication reward both parties for prompt, honest engagement. Users who want to see their received feedback must also provide feedback to others.

### Service Context Preservation
Review snapshots capture what was reviewed - specific subjects, education levels, session details. This context remains accurate even if tutors later change their service offerings or bookings get modified.

### Aggregate Score Integrity
Profile ratings calculate exclusively from published review sessions with verified bookings. The automated trigger-based updates prevent manual manipulation and maintain calculation consistency.

## Beta Status and Rollout

### Current Phase: Limited Public Beta

The reviews feature is actively deployed in production with controlled rollout to ensure quality and reliability:

**Rollout Progress:**
- Phase One: Internal testing (Complete)
- Phase Two: Trusted beta users (Complete)
- Phase Three: Limited public beta (Current - 10-25% of active users)
- Phase Four: General availability (Planned after success validation)

**What Beta Means:**
- Feature operates behind a feature flag enabling gradual expansion
- Trust & Safety team monitoring review content and user behavior
- CaaS integration live with review metrics feeding credibility scores
- User feedback actively collected through surveys and support channels
- Minor bugs or edge cases may surface during expanded rollout

**Success Metrics Being Tracked:**
- Review submission rate: Target >60%, currently monitoring
- Early publication rate: Target >30% of sessions
- API error rate: Target <0.5%, monitored in real-time
- User satisfaction: Target >4.0/5.0 in post-submission surveys

### User Communication Strategy

Beta users receive:
- In-app onboarding modal explaining the escrow mechanism
- Email announcements highlighting review opportunities
- FAQ documentation addressing common questions
- Tutorial videos demonstrating the submission process
- Support channel access for feedback and issue reporting

## Recent Enhancements

### Snapshot Field Addition (Migration 105)
Enhanced reviews with preserved service context including subject areas, education levels, session timing, and delivery methods. This improvement ensures reviews remain meaningful and searchable independently of booking table integrity.

### Early Publication Optimization
Improved participant tracking to enable immediate publication when all parties submit before the deadline. Reduces waiting time and increases user satisfaction with the review process.

### Profile Rating Automation
Implemented database triggers for real-time aggregate score updates. Eliminates batch calculation delays and ensures profile ratings reflect latest feedback immediately upon publication.

---

**Last Updated:** December 2024
**Feature Status:** Beta
**Primary Owner:** Dev Team

# Students Feature - Solution Design
**Version:** v5.0 (Guardian Link System)
**Last Updated:** 2026-02-08
**Status:** Production (with known limitations)
**Architecture Pattern:** Service Layer + Profile Graph

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Concepts](#core-concepts)
3. [Architecture Diagram](#architecture-diagram)
4. [Data Model](#data-model)
5. [User Flows](#user-flows)
6. [API Design](#api-design)
7. [Security Model](#security-model)
8. [Performance Considerations](#performance-considerations)

---

## System Overview

The Students feature implements a **Guardian Link System** enabling parents, tutors, and agents to manage students through a unified relationship graph. The system separates the concept of **who pays** (client) from **who attends** (student), allowing flexible booking arrangements.

### Key Features
- ✅ Guardian-student relationship management via `profile_graph`
- ✅ Student invitation system (email invitations)
- ✅ Assign specific students to bookings
- ✅ Track student attendance separately from payment
- ✅ Support for external platform integrations (Google Classroom, Khan Academy)
- ⚠️ Audit logging (TODO)
- ⚠️ Rate limiting (TODO - critical security issue)

### Supported Use Cases

| Use Case | Client | Student | Guardian Link Required |
|----------|--------|---------|------------------------|
| Adult learner | Alice | Alice (same) | No |
| Parent books for child | Parent Bob | Child Charlie | Yes |
| Tutor manages student | Tutor Dave | Student Emma | Yes |
| Agent books for client's child | Agent Frank | Child Grace | Yes (via agent) |

---

## Core Concepts

### 1. Guardian Link
A `profile_graph` relationship connecting a **guardian** (source) to a **student** (target):

```typescript
interface GuardianLink {
  id: string;                    // profile_graph.id
  source_profile_id: string;     // Guardian (parent/tutor/agent)
  target_profile_id: string;     // Student
  relationship_type: 'GUARDIAN'; // Fixed value
  status: 'ACTIVE';              // Guardian links are immediate
  metadata: {
    invited_at?: string;
    created_via?: 'direct_link' | 'invitation';
  };
}
```

### 2. Student Assignment
Bookings distinguish between payer and attendee:

```typescript
interface Booking {
  id: string;
  client_id: string;   // Who PAID for the booking (guardian)
  student_id?: string; // Who ATTENDS the session (can differ)
  tutor_id: string;
  // ... other fields
}
```

**Examples:**
```typescript
// Adult learner
{
  client_id: "alice-uuid",
  student_id: "alice-uuid"  // Same person
}

// Parent books for child
{
  client_id: "parent-bob-uuid",   // Parent pays
  student_id: "child-charlie-uuid" // Child attends
}
```

### 3. Invitation Flow
When inviting a new student who doesn't have an account:

1. Generate secure UUID token
2. Store in `guardian_invitations` table (TODO: currently only console.log)
3. Send email with signup link
4. Student signs up using token
5. Auto-create guardian link on signup completion

---

## Architecture Diagram

### Guardian Link Creation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      GUARDIAN (Client/Tutor)                         │
│                                                                       │
│  Roles: 'client' or 'tutor'                                         │
│  Can manage students, create bookings, assign attendees              │
└───────────────────────┬───────────────────────────────────────────┘
                        │
                        │ 1. Add Student
                        │    POST /api/links/client-student
                        │    {student_email, is_13_plus: true}
                        │
                        ├──────────────────┬────────────────────┐
                        │                  │                    │
                        ▼                  ▼                    ▼
            ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
            │ Student Exists?  │  │  Generate    │  │  Validate Age    │
            │                  │  │  Invitation  │  │  Confirm 13+     │
            │ Check profiles   │  │  Token       │  │  (COPPA)         │
            │ by email         │  │  (UUID)      │  │                  │
            └────────┬─────────┘  └──────┬───────┘  └──────────────────┘
                     │                   │
                     │ Yes               │ No (new student)
                     ▼                   ▼
          ┌──────────────────┐  ┌────────────────────┐
          │ Create ACTIVE    │  │ Store Invitation   │
          │ Guardian Link    │  │ TODO: Send Email   │
          │                  │  │ (Not Implemented)  │
          │ profile_graph:   │  └────────────────────┘
          │  source = guard  │
          │  target = student│
          │  type = GUARDIAN │
          │  status = ACTIVE │
          └────────┬─────────┘
                   │
                   │ profile_graph row created
                   │ Unique constraint enforced:
                   │ (source, target, type)
                   │
                   ▼
        ┌──────────────────────────┐
        │  Guardian's Student List │
        │                          │
        │  GET /api/links/         │
        │      client-student      │
        │                          │
        │  Features:               │
        │  - Search/filter         │
        │  - Sort options          │
        │  - Pagination (4/page)   │
        │  - CSV export            │
        └──────────────────────────┘
```

### Student Assignment to Booking Flow

```
        Guardian has:
        - ACTIVE guardian link to student
        - Confirmed booking (client_id = guardian.id)
                   │
                   │ 2. Create Booking
                   │    POST /api/bookings
                   │    client_id = guardian.id
                   │
                   ▼
        ┌──────────────────────────┐
        │   Booking Created        │
        │                          │
        │   bookings table:        │
        │    id: uuid              │
        │    client_id: guardian   │
        │    tutor_id: tutor       │
        │    student_id: NULL      │ ◄── Not assigned yet
        │    status: pending       │
        └──────────┬───────────────┘
                   │
                   │ 3. Assign Student to Booking
                   │    POST /api/bookings/assign
                   │    {booking_id, student_id}
                   │
                   ▼
        ┌──────────────────────────────────────────┐
        │   BookingService.assignStudent()         │
        │                                          │
        │   Validation Steps:                      │
        │   ✓ Booking exists                       │
        │   ✓ User is client (guardian)            │
        │   ✓ Guardian-student link is ACTIVE      │
        │     (via ProfileGraphService.            │
        │      validateLink)                       │
        └──────────┬───────────────────────────────┘
                   │
                   │ UPDATE bookings
                   │ SET student_id = ?
                   │
                   ▼
        ┌──────────────────────────┐
        │  Student Assigned        │
        │                          │
        │  bookings table:         │
        │   client_id: guardian    │ ◄── Payer
        │   student_id: student    │ ◄── Attendee
        │   status: confirmed      │
        └──────────────────────────┘
```

### Removing a Student (Critical Issue)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     REMOVING A STUDENT                               │
│                     ⚠️  DATA INTEGRITY ISSUE                         │
└─────────────────────────────────────────────────────────────────────┘

        Guardian clicks "Remove" on student
                   │
                   │ DELETE /api/links/client-student/[id]
                   │
                   ▼
        ┌──────────────────────────┐
        │  Validate Ownership      │
        │                          │
        │  ✓ Link exists           │
        │  ✓ User is source        │
        │  ✓ Type is GUARDIAN      │
        │                          │
        │  ⚠️  NO CHECK for active  │
        │     bookings (BUG!)      │
        └──────────┬───────────────┘
                   │
                   │ DELETE FROM profile_graph
                   │ WHERE id = link_id
                   │
                   ▼
        ┌──────────────────────────┐
        │  Guardian Link Removed   │
        │                          │
        │  ⚠️  ORPHANED DATA:       │
        │                          │
        │  bookings.student_id     │
        │  still references        │
        │  deleted student         │
        │                          │
        │  Guardian loses access   │
        │  but bookings remain     │
        └──────────────────────────┘
```

**Critical Issue:** No validation that student has active bookings before unlinking. This creates orphaned `bookings.student_id` references.

**Fix Required:** Check for active bookings before allowing deletion (see [students-improvements.md](./students-improvements.md#2-fix-orphaned-student-assignments) for implementation).

---

## Data Model

### Database Schema

#### 1. profile_graph (Unified Relationships)

**Purpose:** Stores all user-to-user relationships including guardian-student links.

```sql
CREATE TABLE profile_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'GUARDIAN', 'SOCIAL', 'BOOKING'
  status TEXT NOT NULL,            -- 'PENDING', 'ACTIVE', 'BLOCKED'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_links CHECK (source_profile_id <> target_profile_id),
  CONSTRAINT unique_relationship_path UNIQUE (
    source_profile_id,
    target_profile_id,
    relationship_type
  )
);

-- Indexes for performance
CREATE INDEX idx_profile_graph_source_id
  ON profile_graph(source_profile_id);

CREATE INDEX idx_profile_graph_target_id
  ON profile_graph(target_profile_id);

CREATE INDEX idx_profile_graph_composite
  ON profile_graph(source_profile_id, relationship_type, status);
```

**Query Examples:**

```sql
-- Get all students for a guardian
SELECT
  pg.id,
  pg.target_profile_id,
  p.full_name,
  p.email,
  p.avatar_url,
  p.date_of_birth
FROM profile_graph pg
JOIN profiles p ON pg.target_profile_id = p.id
WHERE pg.source_profile_id = 'guardian-uuid'
  AND pg.relationship_type = 'GUARDIAN'
  AND pg.status = 'ACTIVE'
ORDER BY pg.created_at DESC;

-- Validate guardian-student link exists
SELECT id FROM profile_graph
WHERE source_profile_id = 'guardian-uuid'
  AND target_profile_id = 'student-uuid'
  AND relationship_type = 'GUARDIAN'
  AND status = 'ACTIVE';
```

#### 2. bookings (Student Assignment)

**Purpose:** Track who paid vs who attends sessions.

```sql
-- v5.0 Enhancement (Migration 063)
ALTER TABLE bookings
ADD COLUMN student_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Backfill existing bookings (adult learner use case)
UPDATE bookings
SET student_id = client_id
WHERE student_id IS NULL;
```

**Key Fields:**
- `client_id` - Who **paid** for the booking (guardian)
- `student_id` - Who **attends** the session (can be different)
- `tutor_id` - Who teaches the session

**Constraint:** No database constraint enforcing `student_id` must have GUARDIAN relationship to `client_id` (validation done in application layer).

#### 3. student_integration_links (External Platforms)

**Purpose:** OAuth tokens for syncing with external learning platforms.

```sql
CREATE TABLE student_integration_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL, -- 'google_classroom', 'khan_academy'
  external_user_id TEXT NOT NULL,
  auth_token TEXT,            -- OAuth access token
  refresh_token TEXT,         -- OAuth refresh token
  scopes TEXT[],              -- Granted permissions
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,

  CONSTRAINT unique_student_platform UNIQUE (student_profile_id, platform_name)
);

CREATE INDEX idx_integration_links_student_id
  ON student_integration_links(student_profile_id);
```

**Status:** Table exists, UI exists, but sync cron jobs not implemented.

#### 4. guardian_invitations (TODO - Not Implemented)

**Purpose:** Track invitation tokens for new students.

**Current Status:** ❌ **Not implemented** - invitations only logged to console

**Required Schema:**
```sql
CREATE TABLE guardian_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  token UUID NOT NULL UNIQUE,  -- Cryptographically secure
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),

  CONSTRAINT unique_pending_invitation
    UNIQUE (guardian_id, student_email, status)
    WHERE status = 'pending'
);
```

---

## User Flows

### Flow 1: Guardian Adds Existing Student

```
1. User navigates to /my-students
2. Clicks "Add Student" button
3. StudentInviteModal opens
4. User enters:
   - student_email: "student@example.com"
   - Confirms student is 13+ years old
5. Frontend: POST /api/links/client-student
6. Backend:
   a. Validates user is client/tutor
   b. Checks if student profile exists
   c. Checks for existing guardian link
   d. Creates guardian link in profile_graph
7. Frontend: Refetches student list
8. Success toast: "Student linked successfully"
```

**API Call:**
```typescript
POST /api/links/client-student
{
  "student_email": "student@example.com",
  "is_13_plus": true
}

// Response (200 OK)
{
  "success": true,
  "message": "Student linked successfully",
  "link_id": "link-uuid",
  "student_existed": true
}
```

### Flow 2: Guardian Invites New Student

```
1. User navigates to /my-students
2. Clicks "Add Student" button
3. User enters email of non-existent student
4. Frontend: POST /api/links/client-student
5. Backend:
   a. Student not found in profiles
   b. Generates UUID invitation token
   c. TODO: Stores in guardian_invitations table
   d. TODO: Sends email with signup link
   e. Currently: Only console.log
6. Frontend: Success message (misleading - email not sent)
```

**Current Issue:** ❌ Email never actually sent, feature non-functional

**API Call:**
```typescript
POST /api/links/client-student
{
  "student_email": "new-student@example.com",
  "is_13_plus": true
}

// Response (200 OK) - but email not sent!
{
  "success": true,
  "message": "Invitation sent successfully",
  "invitation_sent": true,
  "student_email": "new-student@example.com"
}
```

### Flow 3: Assign Student to Booking

```
1. Guardian creates booking (client_id = guardian.id)
2. Booking confirmed, student_id = NULL
3. Guardian navigates to booking details
4. Clicks "Assign Student" dropdown
5. Selects student from list of linked students
6. Frontend: POST /api/bookings/assign
7. Backend (BookingService):
   a. Verifies booking exists
   b. Verifies user is client
   c. Validates guardian-student link via ProfileGraphService
   d. Updates bookings.student_id
8. Frontend: Shows success, refreshes booking details
```

**API Call:**
```typescript
POST /api/bookings/assign
{
  "booking_id": "booking-uuid",
  "student_id": "student-uuid"
}

// Response (200 OK)
{
  "success": true,
  "message": "Student assigned to booking successfully",
  "booking_id": "booking-uuid",
  "student_id": "student-uuid"
}
```

### Flow 4: Remove Student (with Bug)

```
1. Guardian navigates to /my-students
2. Clicks "Remove" on StudentCard
3. Confirmation modal appears
4. User confirms removal
5. Frontend: DELETE /api/links/client-student/{link_id}
6. Backend:
   a. Validates link ownership
   b. ⚠️  NO CHECK for active bookings (BUG!)
   c. Deletes from profile_graph
7. Frontend: Removes from list, shows success
8. ⚠️  bookings.student_id now orphaned!
```

**Critical Issue:** No validation before deletion leads to orphaned data.

---

## API Design

### Endpoint: POST /api/links/client-student
**Purpose:** Invite or link a student

**Request:**
```typescript
{
  student_email: string,  // Email format
  is_13_plus: boolean     // Must be true (COPPA)
}
```

**Response (Existing Student):**
```typescript
{
  success: true,
  message: "Student linked successfully",
  link_id: string,
  student_existed: true
}
```

**Response (New Student):**
```typescript
{
  success: true,
  message: "Invitation sent successfully",
  invitation_sent: true,
  student_email: string
}
```

**Errors:**
- `400` - Invalid email, age not confirmed, already linked
- `401` - Not authenticated
- `403` - User is not client/tutor

**Security Issues:**
- ❌ No rate limiting (can spam invitations)
- ❌ No maximum student limit (can create unlimited)
- ❌ No self-link prevention (can add themselves)

---

### Endpoint: GET /api/links/client-student
**Purpose:** Get all linked students

**Query Parameters:** None (should add pagination)

**Response:**
```typescript
{
  success: true,
  students: [
    {
      id: string,              // Link ID
      guardian_id: string,
      student_id: string,
      status: "active",
      created_at: string,
      student: {
        id: string,
        full_name: string,
        email: string,
        avatar_url: string | null,
        date_of_birth: string | null
      }
    }
  ]
}
```

**Performance Issue:** Returns ALL students without pagination

---

### Endpoint: DELETE /api/links/client-student/[id]
**Purpose:** Remove a guardian-student link

**Response:**
```typescript
{
  success: true,
  message: "Student unlinked successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `404` - Link not found or unauthorized

**Critical Bug:** No check for active bookings before deletion

---

### Endpoint: POST /api/bookings/assign
**Purpose:** Assign student to booking

**Request:**
```typescript
{
  booking_id: string,  // UUID
  student_id: string   // UUID
}
```

**Response:**
```typescript
{
  success: true,
  message: "Student assigned to booking successfully",
  booking_id: string,
  student_id: string
}
```

**Validation:**
1. Booking exists
2. User is booking client
3. Guardian-student link is ACTIVE
4. ⚠️ No validation that student has 'student' role

---

## Security Model

### Row Level Security (RLS)

**profile_graph policies:**

```sql
-- Users can view relationships they're part of
CREATE POLICY "Users can view their relationships"
  ON profile_graph FOR SELECT
  USING (
    auth.uid() = source_profile_id  -- Guardian
    OR
    auth.uid() = target_profile_id  -- Student
  );

-- Users can create relationships where they are source
CREATE POLICY "Users can create relationships"
  ON profile_graph FOR INSERT
  WITH CHECK (auth.uid() = source_profile_id);

-- Both parties can update (for status changes)
CREATE POLICY "Users can update their relationships"
  ON profile_graph FOR UPDATE
  USING (
    auth.uid() = source_profile_id
    OR
    auth.uid() = target_profile_id
  );

-- Only source can delete
CREATE POLICY "Users can delete relationships they created"
  ON profile_graph FOR DELETE
  USING (auth.uid() = source_profile_id);
```

**Missing Policies:**
- ❌ No admin SELECT policy for support/moderation
- ❌ No audit logging for policy enforcements

### Authorization Checks

**Application Layer:**

```typescript
// Only clients and tutors can add students
if (!profile.roles.includes('client') &&
    !profile.roles.includes('tutor')) {
  throw new Error('Only clients and tutors can invite students');
}

// Only booking owner can assign students
if (booking.client_id !== user.id) {
  throw new Error('Unauthorized');
}

// Guardian-student link must be ACTIVE
const isValid = await ProfileGraphService.validateLink(
  guardianId,
  studentId
);
if (!isValid) {
  throw new Error('Invalid guardian-student link');
}
```

### Security Gaps

1. **No Rate Limiting:** ❌ All endpoints unprotected
2. **No CSRF Protection:** ⚠️ Not explicitly mentioned
3. **No Audit Logging:** ❌ No compliance trail
4. **Insecure Tokens:** ❌ Predictable invitation format
5. **No Input Sanitization:** ⚠️ Email not sanitized for header injection

---

## Performance Considerations

### Database Indexes

**Existing (Good):**
```sql
CREATE INDEX idx_profile_graph_source_id
  ON profile_graph(source_profile_id);

CREATE INDEX idx_profile_graph_composite
  ON profile_graph(source_profile_id, relationship_type, status);
```

**Query Performance:**
- Guardian student list: ~5-10ms
- Link validation: ~2-5ms
- Booking assignment: ~15-20ms

### Optimization Opportunities

1. **Pagination:** Add to GET endpoint (currently returns all)
2. **Materialized Views:** Cache student statistics
3. **Optimistic Updates:** React Query for instant UI
4. **Connection Pooling:** Reduce database connections

**Example Materialized View:**
```sql
CREATE MATERIALIZED VIEW student_stats AS
SELECT
  source_profile_id AS guardian_id,
  COUNT(*) AS total_students,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS recent
FROM profile_graph
WHERE relationship_type = 'GUARDIAN' AND status = 'ACTIVE'
GROUP BY source_profile_id;
```

### Caching Strategy

**React Query Configuration:**
```typescript
useQuery({
  queryKey: ['students', userId],
  queryFn: getMyStudents,
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 10 * 60 * 1000,    // 10 minutes
  refetchOnMount: 'always',
  refetchOnWindowFocus: true
});
```

---

## Known Limitations

### Critical Issues (P0)

1. **No Rate Limiting** - Security vulnerability
2. **Orphaned Data** - Data integrity violation
3. **Self-Link Prevention Missing** - Data corruption
4. **Insecure Tokens** - Authentication bypass
5. **No Audit Logging** - Compliance failure

### High Priority Issues (P1)

6. **Emails Not Sent** - Feature non-functional
7. **No Student Limit** - Resource abuse
8. **Missing Role Validation** - Data corruption
9. **No Pagination** - Performance degradation

### Medium Priority Issues (P2)

10. **Inconsistent Errors** - Poor UX
11. **No Token Expiration** - Security hygiene
12. **Input Sanitization** - XSS risk

See [students-improvements.md](./students-improvements.md) for detailed fix plans.

---

## Service Layer Architecture

### ProfileGraphService

**Location:** `apps/web/src/lib/services/ProfileGraphService.ts`

**Key Methods:**

```typescript
class ProfileGraphService {
  // Get all students for guardian
  static async getLinkedStudents(guardianId: string): Promise<GuardianLinkData[]>

  // Validate ACTIVE guardian-student link
  static async validateLink(guardianId: string, studentId: string): Promise<boolean>

  // Create invitation (TODO: incomplete)
  static async createGuardianInvite({...}): Promise<GuardianLinkData>
}
```

**Usage Example:**
```typescript
// Validate link before assigning student
const isValid = await ProfileGraphService.validateLink(
  'guardian-uuid',
  'student-uuid'
);

if (!isValid) {
  throw new Error('Invalid guardian-student link');
}
```

### BookingService

**Location:** `apps/web/src/lib/services/BookingService.ts`

**Student Assignment Method:**

```typescript
class BookingService {
  static async assignStudent({
    bookingId,
    clientId,
    studentId
  }: {
    bookingId: string;
    clientId: string;
    studentId: string;
  }): Promise<BookingData> {
    // 1. Verify booking ownership
    const booking = await this.getBooking(bookingId);
    if (booking.client_id !== clientId) {
      throw new Error('Unauthorized');
    }

    // 2. Validate guardian-student link
    const isValid = await ProfileGraphService.validateLink(
      clientId,
      studentId
    );
    if (!isValid) {
      throw new Error('Invalid guardian-student link');
    }

    // 3. Update booking
    const { data } = await supabase
      .from('bookings')
      .update({ student_id: studentId })
      .eq('id', bookingId)
      .select()
      .single();

    return data;
  }
}
```

---

## Future Enhancements

### Planned Features

1. **Student Groups/Cohorts** - Group students by class, subject
2. **Progress Tracking** - Monitor learning goals and milestones
3. **Integration Syncing** - Auto-sync Google Classroom assignments
4. **Bulk Operations** - CSV import, bulk assignment
5. **Admin Oversight** - Support team access to guardian links

### Architecture Evolution

**From:** Simple tutor-student booking lookup
**To:** Comprehensive guardian link system with profile_graph
**Next:** Full student lifecycle management with integrations

---

## References

- [Technical Architecture](./students-architecture.md) - Detailed implementation
- [Improvement Plan](./students-improvements.md) - Fix roadmap with code examples
- [Audit Report](../../STUDENTS_AUDIT_REPORT.md) - Security audit findings

---

**Last Updated:** 2026-02-08
**Version:** v5.0 (Guardian Link System)
**Audit Score:** 68/100 (Target: 90/100 after fixes)
**Status:** Production (with known critical issues - see improvement plan)

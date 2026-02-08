# Students Feature - Technical Architecture
**Last Updated:** 2026-02-08
**Version:** v5.0 (Guardian Link System)
**Status:** Production (with known limitations)

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Database Schema](#database-schema)
4. [Data Flow](#data-flow)
5. [API Endpoints](#api-endpoints)
6. [Service Layer](#service-layer)
7. [Security Model](#security-model)
8. [Known Limitations](#known-limitations)

---

## System Overview

The Students feature implements a **Guardian Link System** that allows parents, tutors, and agents to manage students through bidirectional relationships stored in the unified `profile_graph` table.

### Key Concepts

**Guardian Link**: A `profile_graph` relationship with `relationship_type='GUARDIAN'` connecting:
- **Source (Guardian)**: Parent, tutor, or agent managing the student
- **Target (Student)**: The student being managed

**Student Assignment**: Bookings distinguish between:
- `client_id` - Who **paid** for the booking (the guardian)
- `student_id` - Who **attends** the session (the student)

This separation enables:
- Parents booking lessons for children
- Tutors tracking which specific student attended
- Proper attendance and progress tracking
- Adult learner use case (client_id = student_id)

---

## Architecture Diagram

### Data Flow Diagram

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
        └──────────┬───────────────┘
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


┌─────────────────────────────────────────────────────────────────────┐
│                     REMOVING A STUDENT                               │
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

---

## Database Schema

### 1. profile_graph (Unified Relationships)

**Purpose:** Stores all user-to-user relationships including guardian-student links.

```sql
CREATE TABLE profile_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'GUARDIAN', 'SOCIAL', 'BOOKING', etc.
  status TEXT NOT NULL,            -- 'PENDING', 'ACTIVE', 'BLOCKED', 'COMPLETED'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT "no_self_links" CHECK (source_profile_id <> target_profile_id),
  CONSTRAINT "unique_relationship_path" UNIQUE (source_profile_id, target_profile_id, relationship_type)
);

-- Indexes for performance
CREATE INDEX idx_profile_graph_source_id ON profile_graph(source_profile_id);
CREATE INDEX idx_profile_graph_target_id ON profile_graph(target_profile_id);
CREATE INDEX idx_profile_graph_type ON profile_graph(relationship_type);
CREATE INDEX idx_profile_graph_composite ON profile_graph(source_profile_id, relationship_type, status);
```

**Guardian Link Example:**
```sql
INSERT INTO profile_graph (
  source_profile_id,  -- Parent/Tutor UUID
  target_profile_id,  -- Student UUID
  relationship_type,  -- 'GUARDIAN'
  status,             -- 'ACTIVE'
  metadata            -- {invited_at, invited_by_email}
) VALUES (
  'guardian-uuid',
  'student-uuid',
  'GUARDIAN',
  'ACTIVE',
  '{"invited_at": "2026-02-08T10:00:00Z"}'::jsonb
);
```

### 2. bookings (Student Assignment)

**Purpose:** Track who paid vs who attends sessions.

```sql
-- v5.0 Enhancement (Migration 063)
ALTER TABLE bookings
ADD COLUMN student_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Backfill existing bookings (adult learner use case)
UPDATE bookings SET student_id = client_id WHERE student_id IS NULL;
```

**Structure:**
- `client_id` (UUID) - Who **paid** for the booking (guardian)
- `student_id` (UUID) - Who **attends** the session (can be different)
- `tutor_id` (UUID) - Who teaches the session

**Use Cases:**
| Scenario | client_id | student_id | Relationship |
|----------|-----------|------------|--------------|
| Adult learner | Alice | Alice | Same person |
| Parent booking for child | Parent Bob | Child Charlie | Guardian link required |
| Tutor managing student | Tutor Dave | Student Emma | Guardian link required |

### 3. student_integration_links (External Platforms)

**Purpose:** OAuth tokens for syncing with external learning platforms.

```sql
CREATE TABLE student_integration_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL, -- 'google_classroom', 'khan_academy'
  external_user_id TEXT NOT NULL,
  auth_token TEXT,            -- OAuth access token (encrypted in prod)
  refresh_token TEXT,         -- OAuth refresh token
  scopes TEXT[],              -- Granted permissions
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,

  CONSTRAINT unique_student_platform UNIQUE (student_profile_id, platform_name)
);

CREATE INDEX idx_integration_links_student_id ON student_integration_links(student_profile_id);
```

**Status:** Table exists, UI exists, but sync cron jobs not implemented.

---

## Data Flow

### Flow 1: Adding a Student (Existing User)

```
1. Guardian navigates to /my-students
2. Clicks "Add Student" → StudentInviteModal opens
3. Enters:
   - student_email: "student@example.com"
   - is_13_plus: true (required by COPPA)
4. Frontend: POST /api/links/client-student
5. Backend validates:
   ├─ User is authenticated
   ├─ User has 'client' or 'tutor' role
   ├─ Email format is valid
   └─ Age confirmation is true
6. Check if student exists:
   SELECT id FROM profiles WHERE email = 'student@example.com'
7. Student found → Check for existing link:
   SELECT id FROM profile_graph
   WHERE source_profile_id = guardian.id
     AND target_profile_id = student.id
     AND relationship_type = 'GUARDIAN'
8. No existing link → Create guardian link:
   INSERT INTO profile_graph (...)
   VALUES (guardian.id, student.id, 'GUARDIAN', 'ACTIVE', ...)
9. Return success:
   {success: true, link_id: "uuid", student_existed: true}
10. Frontend: Refetch student list, show success toast
```

### Flow 2: Adding a Student (New User - Invitation)

```
1-5. Same as Flow 1
6. Check if student exists:
   SELECT id FROM profiles WHERE email = 'new-student@example.com'
7. Student NOT found → Generate invitation:
   const invitationToken = randomUUID() // Should be UUID, currently timestamp+random
8. Store invitation metadata:
   TODO: Create guardian_invitations table
   Currently: Only console.log()
9. Send invitation email:
   TODO: Implement sendStudentInvitationEmail()
   Currently: Only console.log the URL
10. Return success:
    {success: true, message: "Invitation sent", invitation_sent: true}
11. Student receives email (TODO) with signup link:
    https://tutorwise.com/signup/invite?token={uuid}
12. Student signs up, token validated, profile created
13. Auto-create guardian link on signup completion
```

**Current Issue:** Steps 8-11 are not implemented - only logs to console.

### Flow 3: Assigning Student to Booking

```
1. Guardian has:
   - ACTIVE guardian link to student
   - Confirmed booking with client_id = guardian.id
2. Guardian navigates to booking detail
3. Clicks "Assign Student" dropdown
4. Selects student from list (fetched from guardian links)
5. Frontend: POST /api/bookings/assign
   {booking_id: "uuid", student_id: "student-uuid"}
6. Backend (BookingService.assignStudent):
   a. Fetch booking by ID
   b. Verify booking.client_id === authenticated user
   c. Validate guardian-student link:
      SELECT id FROM profile_graph
      WHERE source_profile_id = guardian.id
        AND target_profile_id = student.id
        AND relationship_type = 'GUARDIAN'
        AND status = 'ACTIVE'
   d. If link not found → Error 403: "Invalid guardian-student link"
   e. Update booking:
      UPDATE bookings
      SET student_id = 'student-uuid'
      WHERE id = 'booking-uuid'
        AND client_id = 'guardian-uuid'
7. Return success with updated booking object
8. Frontend: Show success toast, refresh booking details
```

### Flow 4: Removing a Student

```
1. Guardian navigates to /my-students
2. Clicks "Remove" on StudentCard
3. Confirmation modal: "Are you sure?"
4. User confirms
5. Frontend: DELETE /api/links/client-student/{link_id}
6. Backend validates:
   a. Fetch link by ID
   b. Verify link.source_profile_id === authenticated user
   c. Verify link.relationship_type === 'GUARDIAN'
7. ⚠️  NO CHECK for active bookings (BUG!)
8. Delete guardian link:
   DELETE FROM profile_graph WHERE id = link_id
9. ⚠️  bookings.student_id becomes orphaned!
10. Return success
11. Frontend: Remove student from list, show success toast
```

**Critical Bug:** No validation that student has active bookings before unlinking.

---

## API Endpoints

### POST /api/links/client-student
**Purpose:** Invite or link a student to guardian account

**Access:** Authenticated users with 'client' or 'tutor' role

**Request:**
```typescript
{
  student_email: string,  // Email format validated
  is_13_plus: boolean     // Must be true (COPPA compliance)
}
```

**Response (Student Exists):**
```typescript
{
  success: true,
  message: "Student linked successfully",
  link_id: "uuid",
  student_existed: true
}
```

**Response (Student Doesn't Exist):**
```typescript
{
  success: true,
  message: "Invitation sent successfully",
  invitation_sent: true,
  student_email: "new@example.com"
}
```

**Errors:**
- `400` - Invalid request (email format, age not confirmed)
- `400` - Student already linked
- `401` - Not authenticated
- `403` - User is not client/tutor
- `404` - Guardian profile not found

**Rate Limiting:** ❌ None (should be 50/day)

---

### GET /api/links/client-student
**Purpose:** Get all students linked to authenticated guardian

**Access:** Authenticated users

**Query Parameters:** None (should add pagination)

**Response:**
```typescript
{
  success: true,
  students: [
    {
      id: "link-uuid",
      guardian_id: "guardian-uuid",
      student_id: "student-uuid",
      status: "active",
      created_at: "2026-02-08T10:00:00Z",
      student: {
        id: "student-uuid",
        full_name: "John Doe",
        email: "john@example.com",
        avatar_url: "https://...",
        date_of_birth: "2010-05-15"
      }
    }
  ]
}
```

**Errors:**
- `401` - Not authenticated
- `500` - Database error

**Performance Issue:** No pagination - returns ALL students

---

### DELETE /api/links/client-student/[id]
**Purpose:** Remove a guardian-student link

**Access:** Link owner (guardian)

**Path Parameter:** `id` (link UUID)

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
- `500` - Database error

**Critical Bug:** No check for active bookings before deletion

**Rate Limiting:** ❌ None (should be 100/day)

---

### POST /api/bookings/assign
**Purpose:** Assign which student attends a booking

**Access:** Booking owner (client)

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
  booking_id: "uuid",
  student_id: "uuid"
}
```

**Errors:**
- `400` - Invalid request
- `401` - Not authenticated
- `403` - Unauthorized or invalid guardian-student link
- `404` - Booking not found
- `500` - Internal server error

**Rate Limiting:** ❌ None (should be 100/day)

---

## Service Layer

### ProfileGraphService

**Location:** `apps/web/src/lib/services/ProfileGraphService.ts`

**Methods:**

```typescript
class ProfileGraphService {
  /**
   * Get all students for a guardian
   * Filters by relationship_type='GUARDIAN' and source_profile_id
   */
  static async getLinkedStudents(guardianId: string): Promise<GuardianLinkData[]>

  /**
   * Validate that an ACTIVE guardian-student link exists
   * Used by BookingService before assigning student to booking
   *
   * Returns: boolean (true if ACTIVE link found)
   */
  static async validateLink(guardianId: string, studentId: string): Promise<boolean>

  /**
   * Create guardian invitation with token
   * TODO: Implement email sending
   * TODO: Create guardian_invitations table
   */
  static async createGuardianInvite({
    guardianId: string,
    studentEmail: string,
    inviteToken: string,
    expiresAt: Date
  }): Promise<GuardianLinkData>
}
```

**Implementation Example:**
```typescript
// validateLink implementation
static async validateLink(guardianId: string, studentId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profile_graph')
    .select('id, status')
    .eq('relationship_type', 'GUARDIAN')
    .eq('source_profile_id', guardianId)
    .eq('target_profile_id', studentId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) throw error;

  return !!data; // Returns true if active link found
}
```

---

### BookingService

**Location:** `apps/web/src/lib/services/BookingService.ts`

**Student-Related Methods:**

```typescript
class BookingService {
  /**
   * Assign a student (attendee) to a booking
   * Validates:
   * 1. Booking exists and user is client
   * 2. Guardian-student link is ACTIVE (via ProfileGraphService)
   * 3. Updates bookings.student_id
   *
   * Throws:
   * - "Booking not found"
   * - "Unauthorized: You can only assign students to your own bookings"
   * - "Invalid guardian-student link. Please add the student first."
   */
  static async assignStudent({
    bookingId: string,
    clientId: string,
    studentId: string
  }): Promise<BookingData> {
    // 1. Verify booking exists and user is client
    const booking = await this.getBooking(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.client_id !== clientId) {
      throw new Error('Unauthorized: You can only assign students to your own bookings');
    }

    // 2. Validate guardian-student link (v4.6: profile_graph)
    const isValidLink = await ProfileGraphService.validateLink(clientId, studentId);
    if (!isValidLink) {
      throw new Error('Invalid guardian-student link. Please add the student to your account first.');
    }

    // 3. Assign student to booking
    const { data, error } = await supabase
      .from('bookings')
      .update({ student_id: studentId })
      .eq('id', bookingId)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) throw error;
    return data as BookingData;
  }
}
```

**Missing Validation:**
- No check if `studentId` profile has 'student' role
- No check if `clientId === studentId` (adult learner case) - should skip link validation

---

## Security Model

### Row Level Security (RLS) Policies

**profile_graph table:**

```sql
-- Enable RLS
ALTER TABLE profile_graph ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view relationships they're part of
CREATE POLICY "Users can view their relationships"
  ON profile_graph FOR SELECT
  USING (
    auth.uid() = source_profile_id  -- Guardian viewing their students
    OR
    auth.uid() = target_profile_id  -- Student viewing their guardians
  );

-- Policy 2: Users can create relationships where they are the source
CREATE POLICY "Users can create relationships"
  ON profile_graph FOR INSERT
  WITH CHECK (auth.uid() = source_profile_id);

-- Policy 3: Both parties can update status
-- (Allows target to accept/reject guardian requests if implemented)
CREATE POLICY "Users can update their relationships"
  ON profile_graph FOR UPDATE
  USING (
    auth.uid() = source_profile_id
    OR
    auth.uid() = target_profile_id
  );

-- Policy 4: Only source can delete
CREATE POLICY "Users can delete relationships they created"
  ON profile_graph FOR DELETE
  USING (auth.uid() = source_profile_id);
```

**Missing Policies:**
- ❌ No admin SELECT policy for support/moderation
- ❌ No audit logging for RLS bypasses

**student_integration_links table:**

```sql
-- Enable RLS
ALTER TABLE student_integration_links ENABLE ROW LEVEL SECURITY;

-- Students can manage their own integrations
CREATE POLICY "Students manage own integrations"
  ON student_integration_links
  FOR ALL
  USING (auth.uid() = student_profile_id);

-- Guardians can view student integrations via guardian link
CREATE POLICY "Guardians can view student integrations"
  ON student_integration_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile_graph
      WHERE profile_graph.source_profile_id = auth.uid()
        AND profile_graph.target_profile_id = student_integration_links.student_profile_id
        AND profile_graph.relationship_type = 'GUARDIAN'
        AND profile_graph.status = 'ACTIVE'
    )
  );
```

### Authorization Checks

**API Layer:**
```typescript
// POST /api/links/client-student
// Verify guardian is client or tutor
if (!guardianProfile.roles.includes('client') &&
    !guardianProfile.roles.includes('tutor')) {
  return NextResponse.json(
    { error: 'Only clients and tutors can invite students' },
    { status: 403 }
  );
}
```

**Service Layer:**
```typescript
// BookingService.assignStudent
// Verify booking ownership
if (booking.client_id !== clientId) {
  throw new Error('Unauthorized: You can only assign students to your own bookings');
}
```

### Missing Security Controls

1. **Rate Limiting:** ❌ None on any student endpoint
2. **CSRF Protection:** ⚠️ Not explicitly mentioned (may be Next.js default)
3. **Audit Logging:** ❌ No audit trail for student operations
4. **Self-Link Prevention:** ❌ Guardian can add themselves as student
5. **Maximum Student Limit:** ❌ Can create unlimited students
6. **Input Sanitization:** ⚠️ Email validated but not sanitized for header injection

---

## Known Limitations

### Critical Issues (P0)

1. **No Rate Limiting**
   - **Risk:** Spam attacks, resource exhaustion
   - **Impact:** High - Production security vulnerability
   - **Fix:** Add `checkRateLimit(user.id, 'student:invite')` to all endpoints

2. **Self-Link Prevention Missing**
   - **Risk:** Data corruption, circular relationships
   - **Impact:** High - Breaks business logic assumptions
   - **Fix:** Add `if (existingStudent.id === user.id) return error`

3. **Orphaned Student Assignments**
   - **Risk:** Data integrity violation, access control bypass
   - **Impact:** High - Bookings reference deleted students
   - **Fix:** Check active bookings before allowing unlink

4. **Insecure Invitation Tokens**
   - **Risk:** Authentication bypass via brute force
   - **Impact:** Critical - Unauthorized account access
   - **Fix:** Use `crypto.randomUUID()` instead of timestamp+random

5. **No Audit Logging**
   - **Risk:** GDPR/COPPA compliance failure
   - **Impact:** Critical - Legal liability for child data
   - **Fix:** Implement audit logging for all student operations

### High Priority Issues (P1)

6. **Email Invitations Not Sent**
   - **Risk:** Feature non-functional for new students
   - **Impact:** High - Core feature broken
   - **Status:** TODO comments, only console.log

7. **No Maximum Student Limit**
   - **Risk:** Resource abuse, data scraping
   - **Impact:** Medium - Can create unlimited students
   - **Recommendation:** Limit to 50 students per guardian

8. **Missing Student Role Validation**
   - **Risk:** Non-students assigned as attendees
   - **Impact:** Medium - Analytics corruption
   - **Fix:** Verify `studentProfile.roles.includes('student')`

### Medium Priority Issues (P2)

9. **No Pagination on GET Endpoint**
   - **Risk:** Performance degradation with many students
   - **Impact:** Medium - Slow API responses
   - **Fix:** Add `page` and `limit` query parameters

10. **Inconsistent Error Messages**
    - **Risk:** Poor developer experience
    - **Impact:** Low - Harder to debug
    - **Fix:** Standardize error response format

11. **No Invitation Expiration**
    - **Risk:** Old invitation links valid forever
    - **Impact:** Low - Security hygiene
    - **Fix:** Add 7-day expiration to tokens

---

## Performance Considerations

### Database Indexes

**Current (Good):**
```sql
-- Efficient guardian student lookup
CREATE INDEX idx_profile_graph_composite
ON profile_graph(source_profile_id, relationship_type, status);

-- Efficient student guardian lookup
CREATE INDEX idx_profile_graph_target_id
ON profile_graph(target_profile_id);
```

**Query Performance:**
- Guardian student list: ~5-10ms (with index)
- Student validation: ~2-5ms (indexed lookup)
- Booking assignment: ~15-20ms (two queries + update)

### N+1 Query Risk

**UI Component:**
```typescript
// my-students/page.tsx
const { data: students } = useQuery({
  queryKey: ['students', userId],
  queryFn: getMyStudents, // Single query with JOIN
});

// ✅ Good: Uses JOIN to fetch student profiles in one query
// ❌ Bad alternative would be:
//   for (const link of links) {
//     const student = await fetchStudent(link.student_id); // N+1!
//   }
```

**Current Implementation:** ✅ Uses Supabase joins to avoid N+1

---

## Future Enhancements

1. **Invitation Email System**
   - Create `guardian_invitations` table
   - Implement `sendStudentInvitationEmail()`
   - Add token expiration (7 days)
   - Track invitation status (pending/accepted/expired)

2. **Bulk Student Import**
   - CSV upload feature
   - Validate emails in batch
   - Generate multiple invitations
   - Progress tracking UI

3. **Student Groups/Cohorts**
   - Create `student_groups` table
   - Group students by class, subject, age
   - Bulk assign bookings to groups
   - Group-level progress tracking

4. **Integration Sync Jobs**
   - Cron job to sync Google Classroom data
   - Import assignments and grades
   - Update student progress automatically
   - OAuth token refresh logic

5. **Admin Oversight**
   - Add admin SELECT policy on profile_graph
   - Guardian link management interface
   - Bulk operations for support team
   - Audit log viewer

---

**Last Updated:** 2026-02-08
**Audit Score:** 68/100
**Status:** Production (with known limitations)
**Next Review:** After P0 fixes implemented

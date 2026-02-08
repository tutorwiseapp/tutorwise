# Students Feature Audit Report
**Date:** 2026-02-08
**Auditor:** Claude Sonnet 4.5
**Scope:** My Students / Guardian Link System (v5.0)

---

## Executive Summary

The Students feature implements a Guardian Link system allowing clients and tutors to manage student profiles through the `profile_graph` table. The feature is **functional but has critical security and data integrity gaps**.

**Overall Score: 68/100** ⚠️

### Risk Level: MEDIUM-HIGH
- **Critical Issues:** 5
- **High Priority Issues:** 4
- **Medium Priority Issues:** 6
- **Low Priority Issues:** 3

---

## Critical Issues (Must Fix Immediately)

### 1. ❌ CRITICAL: No Rate Limiting on Student Endpoints
**Severity:** CRITICAL
**Files:**
- `apps/web/src/app/api/links/client-student/route.ts` (POST)
- `apps/web/src/app/api/links/client-student/[id]/route.ts` (DELETE)

**Issue:**
The student invitation and unlinking endpoints have **zero rate limiting**, allowing malicious users to:
- Spam thousands of invitation emails
- Create thousands of guardian links
- Abuse the system resources
- Perform DOS attacks via database writes

**Evidence:**
```bash
$ grep -r "checkRateLimit" apps/web/src/app/api/links/client-student/
# No results - no rate limiting exists
```

**Comparison:** Network endpoints have 200/day limit (`network:action` key)

**Fix Required:**
```typescript
// Add to POST /api/links/client-student
const rateLimit = await checkRateLimit(user.id, 'student:invite');
if (!rateLimit.allowed) {
  return NextResponse.json(
    rateLimitError(rateLimit),
    { status: 429, headers: rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt) }
  );
}
```

**Recommended Limits:**
- `student:invite` - 50 per day (invitation creation)
- `student:action` - 100 per day (link/unlink operations)

---

### 2. ❌ CRITICAL: Self-Link Prevention Missing
**Severity:** CRITICAL
**File:** `apps/web/src/app/api/links/client-student/route.ts:76-120`

**Issue:**
A guardian can link **themselves** as their own student by providing their own email. This creates nonsensical relationships and could break business logic assumptions.

**Evidence:**
```typescript
// Current code at line 70-75
const { data: existingStudent } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', student_email)
  .maybeSingle();

if (existingStudent) {
  // No check if existingStudent.id === user.id!
  const { data: newLink } = await supabase
    .from('profile_graph')
    .insert({
      source_profile_id: user.id,
      target_profile_id: existingStudent.id, // Could be same as user.id
```

**Impact:**
- User becomes their own guardian and student
- Circular logic in booking assignments
- Data analytics corruption (count themselves as student)

**Fix Required:**
```typescript
if (existingStudent) {
  // Prevent self-linking
  if (existingStudent.id === user.id) {
    return NextResponse.json(
      { error: 'You cannot add yourself as a student' },
      { status: 400 }
    );
  }
  // ... rest of logic
}
```

---

### 3. ❌ CRITICAL: Insecure Invitation Token Generation
**Severity:** CRITICAL
**File:** `apps/web/src/app/api/links/client-student/route.ts:127`

**Issue:**
The invitation token is generated using **predictable timestamp + weak randomness**:

```typescript
const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
```

**Attack Vector:**
- Token format: `inv_1738944000000_abc1234` (timestamp + 7-char base36)
- Attacker can enumerate timestamps and brute-force 7-char suffix
- Base36^7 = ~78 billion combinations (computationally feasible)
- Tokens never stored in database (can't be revoked)
- No expiration checking

**Fix Required:**
```typescript
import { randomUUID } from 'crypto';

// Use cryptographically secure UUID
const invitationToken = randomUUID(); // Generates v4 UUID (128-bit random)

// Store in database for validation
await supabase.from('guardian_invitations').insert({
  token: invitationToken,
  guardian_id: user.id,
  student_email,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  status: 'pending',
});
```

---

### 4. ❌ CRITICAL: No Audit Logging
**Severity:** CRITICAL
**Files:** All student endpoints

**Issue:**
Critical student operations have **zero audit trail**:
- Student invitations sent (no record of who invited whom)
- Guardian links created (no record of when/how)
- Guardian links deleted (no record of who unlinked)
- Student assignments to bookings (no history)

**Evidence:**
```typescript
// apps/web/src/app/api/links/client-student/[id]/route.ts:62-67
// TODO: Add audit log entry
// await logToAudit({
//   action: 'guardian_link_removed',
//   user_id: user.id,
//   metadata: { link_id: linkId, student_id: link.target_profile_id },
// });
```

**Compliance Risk:**
GDPR/COPPA requires audit trails for child data access.

**Fix Required:**
Implement audit logging in all student endpoints:
- POST /api/links/client-student → Log invitations
- DELETE /api/links/client-student/[id] → Log unlinks
- POST /api/bookings/assign → Log student assignments

---

### 5. ❌ CRITICAL: Orphaned Student Assignments
**Severity:** CRITICAL
**File:** `apps/web/src/app/api/links/client-student/[id]/route.ts`

**Issue:**
When a guardian link is deleted, `bookings.student_id` becomes an **orphaned reference**. The student ID still exists in active/future bookings but the guardian relationship is gone.

**Attack Scenario:**
1. Guardian links Student A
2. Guardian creates 10 bookings with Student A assigned
3. Guardian unlinks Student A
4. Bookings still have `student_id = A` but guardian has no relationship
5. Student A can still view booking details via target profile policies

**Data Integrity Impact:**
```sql
-- Orphaned bookings query
SELECT COUNT(*) FROM bookings b
WHERE b.student_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profile_graph pg
    WHERE pg.source_profile_id = b.client_id
      AND pg.target_profile_id = b.student_id
      AND pg.relationship_type = 'GUARDIAN'
      AND pg.status = 'ACTIVE'
  );
```

**Fix Required:**
```typescript
// Before deleting guardian link, check for active bookings
const { data: activeBookings } = await supabase
  .from('bookings')
  .select('id')
  .eq('client_id', user.id)
  .eq('student_id', link.target_profile_id)
  .in('status', ['confirmed', 'pending', 'in_progress']);

if (activeBookings && activeBookings.length > 0) {
  return NextResponse.json(
    {
      error: `Cannot unlink student with ${activeBookings.length} active booking(s). Please cancel or complete bookings first.`,
      active_booking_count: activeBookings.length
    },
    { status: 400 }
  );
}
```

---

## High Priority Issues

### 6. ⚠️ HIGH: No Email Invitations Sent
**Severity:** HIGH
**File:** `apps/web/src/app/api/links/client-student/route.ts:123-147`

**Issue:**
Invitation emails are **only logged to console**, never actually sent. This is a **showstopper for production use**.

**Evidence:**
```typescript
// Line 130-132
console.log('[client-student] Sending invitation email to:', student_email);
console.log('[client-student] Guardian:', guardianProfile.full_name);
console.log('[client-student] Invitation URL:', `${process.env.NEXT_PUBLIC_SITE_URL}/signup/invite?token=${invitationToken}`);

// Line 134-140 - Email sending is commented out
// TODO: Send actual email using sendStudentInvitationEmail()
// await sendStudentInvitationEmail({ ... });
```

**Impact:**
Feature is **non-functional** for new students - they never receive the invitation.

**Fix Required:**
Implement email sending using existing email infrastructure.

---

### 7. ⚠️ HIGH: No Maximum Student Limit
**Severity:** HIGH
**File:** `apps/web/src/app/api/links/client-student/route.ts`

**Issue:**
Guardians can link **unlimited students**, enabling:
- Resource exhaustion attacks
- Data export abuse (scrape thousands of students)
- Database bloat

**Fix Required:**
```typescript
// Check current student count before allowing new link
const { count: studentCount } = await supabase
  .from('profile_graph')
  .select('id', { count: 'exact', head: true })
  .eq('source_profile_id', user.id)
  .eq('relationship_type', 'GUARDIAN')
  .eq('status', 'ACTIVE');

const MAX_STUDENTS = 50; // Reasonable limit for tutors/parents

if (studentCount && studentCount >= MAX_STUDENTS) {
  return NextResponse.json(
    { error: `Maximum student limit (${MAX_STUDENTS}) reached` },
    { status: 400 }
  );
}
```

---

### 8. ⚠️ HIGH: Missing Student Role Validation
**Severity:** HIGH
**File:** `apps/web/src/lib/services/BookingService.ts:186-190`

**Issue:**
`assignStudent()` doesn't verify that the target profile **has the 'student' role**. A guardian could assign a tutor, admin, or any other user as the "student" attendee.

**Evidence:**
```typescript
// Line 187 - only validates link exists, not student role
const isValidLink = await ProfileGraphService.validateLink(clientId, studentId);
if (!isValidLink) {
  throw new Error('Invalid guardian-student link...');
}
// No role check!
```

**Impact:**
- Business logic violation (booking analytics count non-students)
- UI confusion (non-student profiles appearing as attendees)
- Potential security issue (assign admin as student to gain access?)

**Fix Required:**
```typescript
// After validateLink
const { data: studentProfile } = await supabase
  .from('profiles')
  .select('roles')
  .eq('id', studentId)
  .single();

if (!studentProfile?.roles?.includes('student')) {
  throw new Error('Target profile must have student role');
}
```

---

### 9. ⚠️ HIGH: No CSRF Protection Mentioned
**Severity:** HIGH
**Files:** All POST/DELETE endpoints

**Issue:**
No evidence of CSRF token validation in API endpoints. Vulnerable to cross-site request forgery attacks where malicious sites can:
- Invite students on behalf of authenticated user
- Unlink students
- Assign students to bookings

**Fix Required:**
Implement CSRF protection at middleware level or verify Next.js built-in protection is enabled.

---

## Medium Priority Issues

### 10. ⚠️ MEDIUM: Duplicate Link Check Incomplete
**Severity:** MEDIUM
**File:** `apps/web/src/app/api/links/client-student/route.ts:77-91`

**Issue:**
Only checks for existing guardian→student link, doesn't check for **reverse** student→guardian link (which shouldn't exist for GUARDIAN type but could if data is corrupted).

**Fix Required:**
```typescript
// Check both directions for safety
const { data: existingLinks } = await supabase
  .from('profile_graph')
  .select('id, source_profile_id, target_profile_id')
  .eq('relationship_type', 'GUARDIAN')
  .or(`and(source_profile_id.eq.${user.id},target_profile_id.eq.${existingStudent.id}),and(source_profile_id.eq.${existingStudent.id},target_profile_id.eq.${user.id})`);

if (existingLinks && existingLinks.length > 0) {
  // Handle accordingly
}
```

---

### 11. ⚠️ MEDIUM: assignStudent Allows Self-Assignment
**Severity:** MEDIUM
**File:** `apps/web/src/lib/services/BookingService.ts:166-204`

**Issue:**
A client can assign themselves as the student without needing a guardian link (adult learner case), but there's no explicit handling or validation for this:

```typescript
// Line 187 - This will fail if client tries to assign themselves
const isValidLink = await ProfileGraphService.validateLink(clientId, studentId);
```

**Expected Behavior:**
If `clientId === studentId`, skip the guardian link validation (adult learner).

**Fix Required:**
```typescript
// Allow self-assignment for adult learners
if (clientId !== studentId) {
  const isValidLink = await ProfileGraphService.validateLink(clientId, studentId);
  if (!isValidLink) {
    throw new Error('Invalid guardian-student link...');
  }
}
```

---

### 12. ⚠️ MEDIUM: Inconsistent Error Messages
**Severity:** MEDIUM
**Files:** Multiple

**Issue:**
Error messages are inconsistent in format and detail:
- Some: `"Guardian link not found or unauthorized"` (line 45)
- Some: `"Unauthorized: You can only accept requests sent to you"` (ProfileGraphService.ts:231)
- Some: `"Invalid guardian-student link. Please add the student to your account first."` (BookingService.ts:189)

**Impact:** Poor developer experience, harder to debug client-side.

**Fix Required:** Standardize error message format.

---

### 13. ⚠️ MEDIUM: No Invitation Expiration
**Severity:** MEDIUM
**File:** `apps/web/src/app/api/links/client-student/route.ts:127`

**Issue:**
Invitation tokens have **no expiration** - they remain valid forever.

**Security Risk:**
Old invitation links could be used years later if leaked.

**Fix Required:**
Store tokens with expiration dates in database, validate on signup.

---

### 14. ⚠️ MEDIUM: Missing Input Sanitization
**Severity:** MEDIUM
**File:** `apps/web/src/app/api/links/client-student/route.ts:45`

**Issue:**
`student_email` is validated for format but not sanitized for:
- SQL injection (mitigated by parameterized queries)
- Email header injection (`\r\n` in email field)
- XSS (if displayed without escaping)

**Fix Required:**
```typescript
import { z } from 'zod';

const InviteSchema = z.object({
  student_email: z.string()
    .email()
    .trim()
    .toLowerCase()
    .transform(email => email.replace(/[\r\n]/g, '')), // Remove newlines
  is_13_plus: z.boolean().refine(val => val === true),
});
```

---

### 15. ⚠️ MEDIUM: No Pagination on GET Endpoint
**Severity:** MEDIUM
**File:** `apps/web/src/app/api/links/client-student/route.ts:162-215`

**Issue:**
`GET /api/links/client-student` returns **all students** without pagination. If a guardian has 1000 students (see issue #7), this will:
- Slow down API response
- Increase bandwidth usage
- Cause UI performance issues

**Fix Required:**
Add pagination support:
```typescript
const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
const offset = (page - 1) * limit;

const { data, count } = await supabase
  .from('profile_graph')
  // ... existing query
  .range(offset, offset + limit - 1);

return NextResponse.json({
  success: true,
  students: mappedData,
  pagination: {
    page,
    limit,
    total: count,
    pages: Math.ceil((count || 0) / limit),
  },
});
```

---

## Low Priority Issues

### 16. ℹ️ LOW: Missing JSDoc Comments
**Severity:** LOW
**Files:** Service layer methods

**Issue:**
Service methods lack JSDoc documentation making IDE autocomplete less useful.

**Example:**
```typescript
// Missing JSDoc
static async validateLink(guardianId: string, studentId: string): Promise<boolean>

// Should have:
/**
 * Validates that an active GUARDIAN relationship exists between guardian and student
 * @param guardianId - UUID of the guardian profile
 * @param studentId - UUID of the student profile
 * @returns true if ACTIVE guardian link exists, false otherwise
 * @throws Error if database query fails
 */
static async validateLink(guardianId: string, studentId: string): Promise<boolean>
```

---

### 17. ℹ️ LOW: TODOs in Production Code
**Severity:** LOW
**Files:** Multiple

**Count:** 7 TODO comments found:
- Invitation email sending (route.ts:134)
- Audit logging (route.ts:62, assign/route.ts:58)
- Student integration sync jobs
- Invitation token system (commented out code)

**Recommendation:** Track TODOs in issue tracker, not code comments.

---

### 18. ℹ️ LOW: No TypeScript Strict Mode
**Severity:** LOW
**Files:** All TypeScript files

**Issue:**
No evidence of strict TypeScript compilation. Code uses `any` types in some places:

```typescript
// apps/web/src/lib/services/ProfileGraphService.ts:106
return (data || []).map((item: any) => ({
  ...item,
  source: Array.isArray(item.source) ? item.source[0] : item.source,
  target: Array.isArray(item.target) ? item.target[0] : item.target,
})) as ConnectionData[];
```

**Recommendation:** Enable `strict: true` in tsconfig.json.

---

## Security Analysis Summary

### Authentication & Authorization: ⚠️ 70/100
- ✅ Uses Supabase auth correctly
- ✅ RLS policies enforce ownership
- ❌ No rate limiting
- ❌ No CSRF protection mentioned
- ❌ No audit logging

### Data Validation: ⚠️ 65/100
- ✅ Zod schema validation on inputs
- ✅ Email format validation
- ❌ No self-link prevention
- ❌ No student role validation
- ❌ No maximum student limit

### Data Integrity: ⚠️ 60/100
- ✅ Foreign key constraints in database
- ✅ Unique constraints on guardian links
- ❌ Orphaned student assignments possible
- ❌ No cascading cleanup on unlink
- ❌ No transaction safety

### Encryption & Privacy: ⚠️ 75/100
- ✅ HTTPS enforced (Next.js default)
- ✅ RLS policies protect data
- ✅ Password/auth handled by Supabase
- ❌ No audit trail for GDPR/COPPA
- ❌ Invitation tokens insecure

---

## Performance Analysis

### Database Queries: ⚠️ 75/100
- ✅ Proper indexes on profile_graph
- ✅ Efficient foreign key lookups
- ✅ Single-query student fetch with joins
- ❌ No pagination on GET endpoint
- ❌ N+1 query risk in student list rendering

### Caching: ✅ 85/100
- ✅ React Query used in UI with 5-min stale time
- ✅ Optimistic updates implemented
- ✅ Auto-refetch on mount/window focus

---

## Code Quality Analysis

### Service Layer Pattern: ✅ 90/100
- ✅ Clean separation: API → Service → Database
- ✅ Reusable business logic (ProfileGraphService)
- ✅ Type-safe interfaces
- ❌ Missing JSDoc comments
- ❌ Some TODO comments in production code

### Error Handling: ⚠️ 70/100
- ✅ Try-catch blocks in API routes
- ✅ Specific error messages
- ❌ Inconsistent error format
- ❌ No error categorization (user vs system errors)

### Testing: ❌ 0/100
- ❌ No unit tests found for student endpoints
- ❌ No integration tests for guardian link flow
- ❌ No E2E tests for student assignment

---

## Comparison with Network Feature

| Aspect | Network Feature | Students Feature | Status |
|--------|----------------|------------------|--------|
| Rate Limiting | ✅ 200/day | ❌ None | Students BEHIND |
| Audit Logging | ❌ Missing | ❌ Missing | Both need fix |
| Duplicate Prevention | ✅ Bidirectional check | ⚠️ Partial | Students needs improvement |
| Self-link Prevention | ❌ Not applicable | ❌ Missing | Students needs fix |
| Admin Policies | ✅ Added | ❌ Not checked | Students needs check |
| Orphaned Data | ✅ None | ❌ bookings.student_id | Students needs fix |
| Email Notifications | ✅ Implemented | ❌ TODO only | Students BEHIND |

---

## Recommendations Priority Matrix

### Must Fix Before Production (P0):
1. Add rate limiting to all student endpoints
2. Implement self-link prevention
3. Fix orphaned student assignment issue
4. Implement audit logging for compliance
5. Use secure UUID tokens for invitations

### Should Fix Soon (P1):
6. Send actual invitation emails
7. Add maximum student limit (50)
8. Validate student role on assignment
9. Implement CSRF protection
10. Add pagination to GET endpoint

### Nice to Have (P2):
11. Standardize error messages
12. Add token expiration (7 days)
13. Improve input sanitization
14. Add JSDoc comments
15. Write unit/integration tests

---

## Estimated Fix Effort

| Priority | Issues | Estimated Time | Risk if Not Fixed |
|----------|--------|----------------|-------------------|
| P0 (Critical) | 5 | 8-12 hours | High - Security breach, data corruption |
| P1 (High) | 4 | 6-8 hours | Medium - Feature unusable, poor UX |
| P2 (Medium) | 6 | 8-10 hours | Low - Code quality, maintainability |
| P3 (Low) | 3 | 2-4 hours | Very Low - Developer experience |

**Total:** 24-34 hours for complete remediation

---

## Final Verdict

**Overall Score: 68/100**

### Strengths:
✅ Clean service layer architecture
✅ Proper database schema with foreign keys and unique constraints
✅ RLS policies protect data access
✅ React Query integration for caching
✅ Type-safe TypeScript interfaces

### Critical Weaknesses:
❌ No rate limiting - **security risk**
❌ Self-link prevention missing - **data integrity risk**
❌ Orphaned bookings on unlink - **data corruption risk**
❌ Insecure invitation tokens - **authentication bypass risk**
❌ No audit logging - **compliance risk (GDPR/COPPA)**

### Recommendation:
**DO NOT deploy to production** until P0 issues are resolved. The feature is functional for development/testing but has critical security and data integrity gaps that must be addressed.

---

## Appendix: Files Audited

### API Endpoints (4 files)
- `apps/web/src/app/api/links/client-student/route.ts`
- `apps/web/src/app/api/links/client-student/[id]/route.ts`
- `apps/web/src/app/api/bookings/assign/route.ts`
- `apps/web/src/app/api/dashboard/student-breakdown/route.ts`

### Services (2 files)
- `apps/web/src/lib/services/ProfileGraphService.ts`
- `apps/web/src/lib/services/BookingService.ts`

### Database Migrations (3 files)
- `tools/database/migrations/061_add_profile_graph_v4_6.sql`
- `tools/database/migrations/063_add_student_role_and_bookings_link.sql`
- `tools/database/migrations/064_create_integration_links_table.sql`

### UI Components (8 files)
- `apps/web/src/app/(authenticated)/my-students/page.tsx`
- `apps/web/src/app/components/feature/students/StudentCard.tsx`
- `apps/web/src/app/components/feature/students/StudentDetailModal.tsx`
- `apps/web/src/app/components/feature/students/StudentInviteModal.tsx`
- `apps/web/src/app/components/feature/students/StudentStatsWidget.tsx`
- `apps/web/src/app/components/feature/students/MyStudentHelpWidget.tsx`
- `apps/web/src/app/components/feature/students/IntegrationLinksCard.tsx`
- `apps/web/src/lib/api/students.ts`

**Total Files Reviewed:** 17
**Lines of Code Analyzed:** ~3,500

---

*End of Audit Report*

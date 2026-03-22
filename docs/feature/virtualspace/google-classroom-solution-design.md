# Google Classroom Integration — Solution Design
**Feature:** Two-way sync between Tutorwise VirtualSpace and Google Classroom
**Version:** 1.0
**Created:** 2026-03-22
**Status:** Partially implemented — gaps documented below

---

## 1. What Is Already Built

As of 2026-03-22 the following is implemented:

| Component | Status | File |
|---|---|---|
| Google OAuth connect flow | ✅ | `/api/integrations/google-classroom/connect/route.ts` |
| OAuth callback + token storage | ✅ | `/api/integrations/google-classroom/callback/route.ts` |
| List courses + assignments | ✅ | `/api/integrations/google-classroom/assignments/route.ts` |
| Post homework as assignment | ✅ | `/api/integrations/google-classroom/post-homework/route.ts` |
| HomeworkDialog "post to Classroom" checkbox | ✅ | `HomeworkDialog.tsx` |
| `tutor_integrations` table (tokens) | ✅ | Migration 425 |

---

## 2. What Is Missing

| Gap | Priority | Description |
|---|---|---|
| Settings page "Connect Google Classroom" button | High | No UI entry point for tutors to connect their account |
| Session sidebar: student's active assignments | High | Planned but not built — tutor can't see what the student has active |
| Post session report to Classroom | Medium | After report generated, post as private comment to relevant course |
| Course roster sync | Low | Import student name/email from Classroom to pre-fill invite |

---

## 3. Gap 1 — Settings Page Connect Button

### Location

`/settings` or `/account` page — a new "Integrations" tab or section.

### UI

```
┌─────────────────────────────────────────────────────┐
│  Integrations                                        │
│                                                      │
│  Google Classroom                                    │
│  Post homework and session reports directly to       │
│  your students' Google Classroom streams.            │
│                                                      │
│  [Connect Google Classroom]   ← if not connected    │
│  ✅ Connected as tutor@school.edu  [Disconnect]      │
│     ← if already connected                          │
└─────────────────────────────────────────────────────┘
```

### Implementation

**Route:** `GET /api/integrations/google-classroom/status` — returns `{ connected: boolean, email?: string }`

```typescript
// Reads tutor_integrations WHERE tutor_id = auth.uid() AND provider = 'google_classroom'
// Returns connected=true if row exists and expires_at > now() (or refresh token present)
```

**Connect button** → `GET /api/integrations/google-classroom/connect` (already built — initiates OAuth)

**Disconnect button** → `DELETE /api/integrations/google-classroom/disconnect` (new)

```typescript
// Deletes row from tutor_integrations WHERE tutor_id = auth.uid() AND provider = 'google_classroom'
```

**Page location:** Extend existing account/settings page with an "Integrations" section. If no settings page exists, create `/settings/integrations/page.tsx`.

---

## 4. Gap 2 — Session Sidebar: Student's Active Assignments

### Context

During a session, the tutor should be able to see what assignments the student currently has active in Google Classroom. This allows the tutor to align the lesson with school curriculum without leaving the session.

### UI Surface

Add a new tab in the Sage/session sidebar (alongside the existing Sage chat, canvas notes, etc.):

```
┌─────────────────────────┐
│  📚 Assignments          │
│                          │
│  Maths — Mr Smith        │
│  ├─ Quadratic equations  │ Due: 25 Mar
│  └─ Trigonometry review  │ Due: 28 Mar
│                          │
│  Chemistry — Mrs Jones   │
│  └─ Atomic structure     │ Due: 30 Mar
│                          │
│  [Refresh]               │
└─────────────────────────┘
```

### Implementation

This requires **student** Google Classroom access, not just the tutor's. Two approaches:

**Option A (Tutor reads student's assignments — requires student OAuth):**
- Student also connects their Google account via `tutor_integrations` (same table, `provider = 'google_classroom_student'`)
- Tutor's session sidebar calls student's token to list assignments
- More powerful but requires student to consent + connect

**Option B (Tutor uses their own teacher view — simpler):**
- If tutor is a Google Classroom teacher on the same course as the student, they can call the Classroom API with their own token to list coursework for the student
- Works without student OAuth
- Requires tutor to be a teacher on the student's Classroom course

**Recommendation: Option B first, Option A as enhancement.**

**API route:** `GET /api/integrations/google-classroom/student-assignments?studentEmail=x`

```typescript
// Uses tutor's access token
// Calls: GET https://classroom.googleapis.com/v1/courses (tutor's courses)
// For each course where studentEmail is enrolled: GET /courses/{id}/courseWork
// Filter: state = 'PUBLISHED', dueDate in future
// Returns: [{ courseTitle, title, dueDate, alternateLink }]
```

**Session integration:** Add assignments tab to `SagePanel` or session sidebar in `VirtualSpaceClient.tsx`. Fetch only if tutor is connected to Google Classroom (`/api/integrations/google-classroom/status`).

---

## 5. Gap 3 — Post Session Report to Google Classroom

### When

Triggered when `POST /api/virtualspace/[sessionId]/report` completes successfully and the tutor has a Google Classroom connection.

### What gets posted

A private comment on the relevant Google Classroom course (if identifiable), or a Guardian summary if the Google Classroom course has guardians enabled.

**Format:**
```
📋 Tutorwise Session Report — [date]

Topics covered: [topic1, topic2]
Homework set: [homework text or "None"]
Recommended next steps: [step1, step2]

Full report: [link to /virtualspace/sessionId/report]
```

### Implementation

In `report/route.ts`, after storing the report, fire-and-forget:

```typescript
// Check if tutor has Classroom connection
const { data: integration } = await supabase
  .from('tutor_integrations')
  .select('access_token, refresh_token, expires_at, metadata')
  .eq('tutor_id', tutorId)
  .eq('provider', 'google_classroom')
  .single();

if (integration && bookingId) {
  // Find matching course (stored in tutor_integrations.metadata.lastCourseId, or prompt tutor to select)
  // POST https://classroom.googleapis.com/v1/courses/{courseId}/announcements
  // { text: reportSummary, assigneeMode: 'INDIVIDUAL_STUDENTS', individualStudentsOptions: { studentIds: [studentGoogleId] } }
}
```

**Limitation:** Requires knowing the Google Classroom `courseId` and student's Google `userId`. These can be stored when the tutor selects a course in the HomeworkDialog (store `lastCourseId` in `tutor_integrations.metadata`).

**New field in `tutor_integrations.metadata`:**
```json
{
  "email": "tutor@school.edu",
  "lastCourseId": "123456",
  "lastStudentGoogleId": "789"
}
```

---

## 6. Gap 4 — Course Roster Sync (Low Priority)

Import student name and email from Google Classroom to pre-fill the VirtualSpace invite when creating a new session.

**API route:** `GET /api/integrations/google-classroom/roster?courseId=x`

```typescript
// GET https://classroom.googleapis.com/v1/courses/{courseId}/students
// Returns: [{ profile: { name: { fullName }, emailAddress } }]
```

**UI:** On "Create new session" → "Import from Google Classroom" → select course → student list pre-filled.

---

## 7. Token Refresh

The existing callback stores `access_token`, `refresh_token`, and `expires_at`. The assignments route already handles token refresh. Ensure all new routes use the same refresh helper:

```typescript
// lib/integrations/google-classroom.ts (shared helper)
async function getValidToken(tutorId: string): Promise<string> {
  const row = await getIntegration(tutorId, 'google_classroom');
  if (new Date(row.expires_at) > new Date()) return row.access_token;
  // Refresh via https://oauth2.googleapis.com/token
  const refreshed = await refreshGoogleToken(row.refresh_token);
  await updateIntegration(tutorId, 'google_classroom', refreshed);
  return refreshed.access_token;
}
```

Extract this into `apps/web/src/lib/integrations/google-classroom.ts` so all routes share it.

---

## 8. Required Google OAuth Scopes

All scopes requested at OAuth connect time:

```
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.coursework.students
https://www.googleapis.com/auth/classroom.coursework.me
https://www.googleapis.com/auth/classroom.rosters.readonly
https://www.googleapis.com/auth/classroom.announcements
https://www.googleapis.com/auth/userinfo.email
```

Scopes already requested in `connect/route.ts` — verify all of the above are included.

---

## 9. Implementation Checklist

### Gap 1 — Settings page
- [ ] `GET /api/integrations/google-classroom/status`
- [ ] `DELETE /api/integrations/google-classroom/disconnect`
- [ ] `/settings/integrations/page.tsx` with connect/disconnect UI

### Gap 2 — Session sidebar assignments
- [ ] `GET /api/integrations/google-classroom/student-assignments`
- [ ] Assignments tab in session sidebar (VirtualSpaceClient or SagePanel)

### Gap 3 — Post report to Classroom
- [ ] Extract shared token helper to `lib/integrations/google-classroom.ts`
- [ ] Update `report/route.ts` to post announcement after report generation
- [ ] Store `lastCourseId` + `lastStudentGoogleId` in `tutor_integrations.metadata` when tutor uses HomeworkDialog

### Gap 4 — Roster sync (low priority)
- [ ] `GET /api/integrations/google-classroom/roster`
- [ ] "Import from Classroom" option on new session creation

---

## 10. Env Vars Required

```
GOOGLE_CLASSROOM_CLIENT_ID=...
GOOGLE_CLASSROOM_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=https://app.tutorwise.co.uk   # used for OAuth redirect URI
```

Redirect URI registered in Google Cloud Console:
`{NEXT_PUBLIC_APP_URL}/api/integrations/google-classroom/callback`

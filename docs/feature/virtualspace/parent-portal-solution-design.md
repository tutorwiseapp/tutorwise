# Parent Portal — Solution Design
**Feature:** Parent login, student progress view, and automated post-session reporting
**Version:** 1.0
**Created:** 2026-03-22
**Status:** Planned — implementation pending

---

## 1. Problem Statement

Neither LessonSpace nor PencilSpaces has a parent-facing portal or automated parent communication (confirmed March 2026). Parents of GCSE/A-Level students — Tutorwise's primary market — have no visibility into what their child is covering, what homework has been set, or whether the tutor is addressing their child's weak areas.

Currently Tutorwise sends a one-off post-session report email when a session is marked complete. This is a good start but is insufficient:

- Parents have no login — they cannot review past sessions, view progress over time, or check homework status
- There is no recurring weekly summary
- There is no opt-in mechanism — the email goes to whoever is on the booking record

---

## 2. Goals

1. **Parent login** — a parent can create an account linked to a student (their child)
2. **Parent dashboard** — view session history, topics covered, homework set/completed, next session
3. **Student progress view** — topics over time, homework streak, Sage interactions
4. **Automated weekly email** — Sunday 18:00 digest: sessions this week, topics covered, homework status, next session
5. **Post-session report delivery** — already partially built (email on session end); ensure it reaches the correct parent and is also visible in the portal

---

## 3. User Roles & Access Model

### New role: `parent`

Added to `profiles.role` enum alongside `tutor`, `client`, `agent`, `organisation`.

A parent account:
- Is linked to one or more `client` (student) profiles via a new `parent_student_links` table
- Can only see data for their linked students
- Cannot book sessions, message tutors, or access marketplace
- Has a read-only view of sessions, homework, and reports where their linked student is the `client_id`

### Link creation flow

1. Tutor or student invites parent by email from the booking detail page
2. Parent receives invite email with magic link → signs up / signs in
3. On first login, parent is prompted to confirm which student they are linked to
4. Link is stored in `parent_student_links`

Alternatively: parent self-registers, enters student's email, student (or tutor) approves the link.

---

## 4. Database Schema

### Migration 429: `parent_student_links`

```sql
CREATE TABLE parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ,         -- null = pending student/tutor approval
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT
    CHECK (role IN ('tutor','client','agent','organisation','parent','admin'));

-- RLS: parent can read their own links; student can read links where student_id = auth.uid()
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent sees own links"
  ON parent_student_links FOR SELECT
  USING (parent_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "parent inserts own links"
  ON parent_student_links FOR INSERT
  WITH CHECK (parent_id = auth.uid());
```

### Migration 430: `parent_weekly_digest_prefs`

```sql
CREATE TABLE parent_weekly_digest_prefs (
  parent_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  opted_in BOOLEAN DEFAULT TRUE,
  send_day SMALLINT DEFAULT 0,    -- 0=Sunday
  send_hour SMALLINT DEFAULT 18,  -- 18:00 UTC
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Pages & Routes

### `/parent` — Parent dashboard (authenticated, role=parent)

Tabs:
- **Overview** — this week's sessions, upcoming session, homework due, quick stats
- **Sessions** — paginated session history with report links
- **Progress** — topics covered over time (bar chart by week), homework completion streak
- **Homework** — all homework set for linked student(s), filterable by status

### `/parent/sessions/[sessionId]` — Session detail

Shows the AI post-session report for that session. Same data as the tutor-facing `/virtualspace/[sessionId]/report` but styled for a parent audience (plain English, no technical details).

### `/parent/invite` — Accept invite

Magic-link landing page. Shows student name + confirms link. Redirects to `/parent` after confirmation.

### API routes

| Route | Method | Description |
|---|---|---|
| `/api/parent/students` | GET | List linked students (confirmed links) |
| `/api/parent/sessions` | GET | Sessions for linked students |
| `/api/parent/homework` | GET | Homework for linked students |
| `/api/parent/progress` | GET | Topics + homework stats over time |
| `/api/parent/invite` | POST | Create pending link (tutor/student sends invite) |
| `/api/parent/invite/[token]` | GET | Validate + confirm link via magic link token |
| `/api/cron/parent-weekly-digest` | POST | Weekly digest cron (Sunday 18:00 UTC) |

---

## 6. Weekly Digest Email

**Trigger:** pg_cron `0 18 * * 0` (Sunday 18:00 UTC) → `POST /api/cron/parent-weekly-digest`

**Auth:** `x-cron-secret` header (same pattern as other cron routes)

**Logic per parent:**
1. Find all confirmed `parent_student_links` for parents with `opted_in = true`
2. For each linked student, fetch:
   - Sessions in past 7 days (count, total duration)
   - Topics covered (from `session_report.topicsCovered`)
   - Homework set this week (count, completion status)
   - Next upcoming session (from `bookings` where `start_time > now()`)
3. Render HTML email and send via Resend

**Email structure:**
```
Subject: [Student name]'s tutoring update — week of [date]

This week:
  • [N] sessions completed ([total mins] minutes)
  • Topics covered: [topic1, topic2, ...]
  • Homework: [N] set, [N] completed

Homework due:
  • [homework text] — due [date] [status badge]

Next session: [date/time] with [tutor name]

[View full progress →] (links to /parent/progress)
```

---

## 7. Post-Session Report Delivery

The existing `POST /api/virtualspace/[sessionId]/report` already emails `parentEmail` from the booking record. Two enhancements needed:

1. **Portal visibility:** Report stored in `virtualspace_sessions.session_report` is already there — the parent portal just reads it via `/api/parent/sessions`
2. **Correct recipient:** Currently uses `booking.client.email` which is the student's email. Need to check `parent_student_links` for a confirmed parent and email them instead (or in addition)

Update `report/route.ts`:
```typescript
// After generating report, find confirmed parent for this student
const { data: parentLinks } = await supabase
  .from('parent_student_links')
  .select('parent:profiles!parent_student_links_parent_id_fkey(email, full_name)')
  .eq('student_id', studentId)
  .not('confirmed_at', 'is', null);

const parentEmails = parentLinks?.map(l => (l.parent as any).email).filter(Boolean) || [];
// Send to parentEmails (in addition to existing logic)
```

---

## 8. Navigation & Auth Guard

- Add `ParentSidebar` or reuse the authenticated layout with a `parent`-role check
- Middleware: if `role === 'parent'`, redirect `/` → `/parent`
- Parent cannot access `/virtualspace`, `/bookings`, `/marketplace` etc. — show a friendly "this area is for tutors and students" message if they land there

---

## 9. Invite Flow Detail

### Tutor-initiated (most common)

1. Tutor opens booking detail → "Invite parent" button
2. Modal: enter parent email, optional name
3. `POST /api/parent/invite` → inserts `parent_student_links` (confirmed_at = null) + sends invite email with signed token
4. Parent clicks link → `/parent/invite?token=...` → confirms → `confirmed_at` set → redirected to `/parent`

### Self-registration

1. Parent visits `/auth/signup`, selects role "Parent"
2. After signup → prompted: "Enter your child's email to link your account"
3. `POST /api/parent/invite` with `parent_id = auth.uid()`, `student_email = input`
4. Student receives confirmation email → approves → link confirmed

---

## 10. Implementation Checklist

- [ ] Migration 429: `parent_student_links` + `role` enum update
- [ ] Migration 430: `parent_weekly_digest_prefs`
- [ ] `POST /api/parent/invite` + magic link token generation
- [ ] `GET /api/parent/invite/[token]` — confirm link
- [ ] `GET /api/parent/students`, `sessions`, `homework`, `progress`
- [ ] `/parent` dashboard page (Overview + Sessions + Progress + Homework tabs)
- [ ] `/parent/sessions/[sessionId]` report page
- [ ] `/parent/invite` magic link landing page
- [ ] Weekly digest cron route + email template
- [ ] Update `report/route.ts` to email confirmed parents
- [ ] Auth middleware: redirect parent role to `/parent`
- [ ] Invite button on booking detail page (tutor-facing)
- [ ] pg_cron: `0 18 * * 0` Sunday digest job

---

## 11. Open Questions

| Question | Decision |
|---|---|
| Can a parent be linked to multiple students? | Yes — e.g. two siblings with the same tutor |
| Can a student have multiple parents linked? | Yes — e.g. two parents both want updates |
| Does parent need to be a Tutorwise user? | Yes — Supabase Auth account required for portal access; email-only for digest |
| Should parent see live session? | No — read-only post-session view only |
| GDPR: can parent see student's Sage chat? | No — Sage conversation is private to student + tutor |

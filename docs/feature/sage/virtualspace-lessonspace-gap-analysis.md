# VirtualSpace — Gap Analysis, Competitive Research & Implementation Plan

**Date:** 2026-03-21 (updated 2026-03-21)
**Status:** Living document — updated after each major implementation sprint
**Author:** Research via Claude Code + live market research (2025–2026 sources)

---

## 1. Context

This document has two purposes:
1. **Parity audit** — compare current Sage VirtualSpace against LessonSpace (the market leader) feature-by-feature
2. **Strategic analysis** — identify where LessonSpace and PencilSpaces are failing their users in 2025–2026, and where Tutorwise can build a genuine moat

Sources: Capterra reviews (2025–2026), Trustpilot, Software Advice, GetApp, Tutorbase blog, PencilSpaces changelog, LessonSpace knowledge base and roadmap (verified March 2026).

---

## 2. Feature Comparison

### 2.1 Whiteboard & Drawing

| Feature | Sage VirtualSpace | LessonSpace |
|---|---|---|
| Infinite canvas | ✅ tldraw v4 | ✅ |
| Freehand drawing | ✅ | ✅ |
| Shapes, text, arrows | ✅ tldraw native | ✅ |
| Sticky notes | ✅ tldraw native | ✅ |
| Images on canvas | ✅ tldraw native | ✅ |
| Laser pointer | ✅ built + wired | ✅ |
| Undo / redo | ✅ tldraw native | ✅ |
| Colour palette + opacity | ✅ collapsible style panel | ✅ |
| Multiple pages / boards | ✅ tldraw pages | ✅ |
| Eraser | ✅ tldraw native | ✅ |
| Grid / background toggle | ✅ built | ✅ |
| Highlighter pen | ✅ tldraw native | ✅ |
| Export PNG / PDF | ✅ tldraw menu | ✅ |
| Student draw lock | ✅ built + Ably-broadcast | ✅ |
| Cursor presence (remote) | ✅ built + Ably-broadcast | ✅ |

### 2.2 Subject-Specific Educational Tools (custom tldraw ShapeUtils)

Tutorwise's primary competitive differentiator. No other tutoring platform has anything close to this library on-canvas.

| Tool | Sage VirtualSpace | LessonSpace |
|---|---|---|
| **Interactive scientific calculator** | ✅ DEG/RAD, trig, log, √, ^, full expression parser | ❌ |
| **Interactive fraction calculator** | ✅ +−×÷, auto-simplify, decimal output | ❌ |
| **Bidirectional unit converter** | ✅ 6 categories, 40+ units | ❌ |
| LaTeX math equation renderer | ✅ KaTeX | ❌ |
| Function plotter (y = f(x)) | ✅ | ❌ |
| Graph axes / coordinate plane | ✅ | ✅ basic |
| Number line | ✅ | ❌ |
| Fraction bar | ✅ | ❌ |
| Unit circle | ✅ | ❌ |
| Protractor | ✅ | ✅ |
| Ruler | ✅ | ✅ |
| Compass | ✅ | ✅ |
| Angle measurer | ✅ | ❌ |
| Trigonometry triangle | ✅ Pythagoras + trig ratios | ❌ |
| Pythagorean theorem visualiser | ✅ | ❌ |
| Probability tree | ✅ | ❌ |
| Venn diagram | ✅ | ❌ |
| Pie chart | ✅ | ❌ |
| Bar chart | ✅ | ❌ |
| Timeline | ✅ | ❌ |
| Flowchart builder | ✅ | ❌ |
| Bohr atom model | ✅ | ❌ |
| Chemical equation builder | ✅ | ❌ |
| Wave diagram | ✅ | ❌ |
| Forces diagram | ✅ | ❌ |
| Circuit diagram | ✅ | ❌ |
| Story mountain | ✅ | ❌ |
| Annotation shape | ✅ | ❌ |
| Web / resource embed (Desmos, GeoGebra, YouTube) | ✅ iframe + YouTube normalisation | ✅ basic |

**Tutorwise: 29 subject tools. LessonSpace: ~4.**

### 2.3 Session & Communication

| Feature | Sage VirtualSpace | LessonSpace |
|---|---|---|
| Video calling (in-app, embedded) | ❌ **GAP** — external popup only | ✅ WebRTC built-in |
| Screen sharing (in-app) | ❌ **GAP** | ✅ |
| Session recording | ❌ **GAP** | ✅ (expires 90 days, no download) |
| Breakout rooms | ❌ **GAP** | ✅ (capped at 10 video publishers) |
| In-session chat | ✅ built — Ably session channel | ✅ |
| Raise hand | ✅ built — Ably session channel | ✅ |
| Participant list with roles | ✅ built — draggable panel | ✅ |
| Real-time cursor presence | ✅ built — 20fps, page coords, auto-expire | ✅ |
| Session invite / join by link | ✅ | ✅ |
| Session history list | ✅ | ✅ |
| Tutor private notes | ✅ built — localStorage, not broadcast | ❌ |
| Homework setting (in-session) | ✅ built — Ably broadcast to student | ❌ |

### 2.4 AI Integration

| Feature | Sage VirtualSpace | LessonSpace | PencilSpaces |
|---|---|---|---|
| AI tutor embedded in session | ✅ Sage AI on canvas | ❌ | ❌ |
| AI-generated explanations | ✅ via Sage | ❌ | ❌ |
| Adaptive hints | ✅ via Sage | ❌ | ❌ |
| Session intelligence / metrics | ✅ daily pipeline | ❌ | ❌ |
| AI post-session summary | ❌ **GAP** | ✅ (tutor-only, requires recording) | ✅ (enterprise add-on only) |
| AI summary sent to parents | ❌ **GAP** | ❌ | ❌ |
| Between-session AI practice | ❌ **GAP** | ❌ | ❌ |
| AI session quality coaching | ❌ | ❌ | ✅ enterprise (Oct 2025) |
| Real-time student understanding score | ❌ | ❌ | ✅ (Feb 2026) |

### 2.5 File & Resource Handling

| Feature | Sage VirtualSpace | LessonSpace |
|---|---|---|
| PDF viewer + annotation in canvas | ❌ **GAP** | ✅ |
| Image upload to canvas | ✅ tldraw native | ✅ |
| Auto-save (continuous) | ✅ built — 90s interval | ✅ |
| Resume on rejoin (snapshot restore) | ✅ built — loads from artifacts URL | ✅ |
| Shared resource library | ❌ **GAP** | ✅ |
| Google Docs/Slides embed | ❌ **GAP** | ✅ |
| Google Classroom integration | ❌ **GAP** (new strategic target) | ❌ |

### 2.6 Reporting & Parent Communication

| Feature | Sage VirtualSpace | LessonSpace | PencilSpaces |
|---|---|---|---|
| Parent portal / parent login | ❌ **GAP** | ❌ | ❌ |
| Post-session report to parent | ❌ **GAP** | ❌ | ❌ |
| Student progress over time | ❌ **GAP** | ❌ | ❌ |
| Tutor performance dashboard | ❌ | ❌ | ❌ |
| Session metrics (admin) | ✅ pg_cron daily pipeline | ✅ basic | ✅ basic |

### 2.7 Platform Integration

| Feature | Sage VirtualSpace | LessonSpace |
|---|---|---|
| Linked to booking (auto-created) | ✅ | ✅ |
| Marketplace / tutor discovery | ✅ Tutorwise native | ❌ |
| Payment / commission tracking | ✅ Tutorwise native | ❌ |
| Referral attribution | ✅ Tutorwise native | ❌ |
| LMS integrations (Canvas, Moodle) | ❌ (out of scope) | ✅ |
| Google Classroom | ❌ **GAP** (strategic target) | ❌ |

---

## 3. 2025–2026 Market Research: What Competitors Are Still Failing At

> Source: Capterra (2025–2026), Trustpilot (Feb 2026), LessonSpace knowledge base & roadmap (verified March 2026), PencilSpaces changelog (Oct 2025 – Feb 2026), Tutorbase 2026 analysis.

These are **confirmed unresolved** as of March 2026.

### 3.1 No Parent Portal or Automated Post-Session Reporting (Highest Demand)

**What competitors shipped in 2025 (and why it's still not enough):**
- LessonSpace added AI summaries — but they're tutor/admin-only, require recording to be pre-enabled before the session, can't be edited in-platform, and cannot be forwarded to parents from within LessonSpace.
- PencilSpaces added AI summaries — but only on Cloud Recording add-on plans (enterprise tier), and tutors must manually copy-paste and forward them. No parent login exists.

**The actual gap:** Neither platform has a parent login, a parent-facing report, or any automated post-session communication to families. Tutorbase's 2026 ranking of the "best tutoring software with parent portals" does not include either platform.

**Why this is a Tutorwise moat:** Sage already knows exactly what was covered — topics, questions asked, student struggle points, shapes stamped on the canvas, chat messages. The other platforms have to infer this from a recording transcript with ~60 min delay. Tutorwise can generate a structured, accurate post-session report the moment a session ends, with zero extra tutor effort, and push it directly to a parent.

### 3.2 No Between-Session Practice Loop (High Demand, Zero Solutions)

**What exists:** Both platforms let students log back in and view past boards. That is the entirety of the between-session experience. No homework workflow, no structured practice, no due dates, no completion tracking, no nudge to review recording.

**Market evidence:** An entire adjacent product category (Revision Village, exam-mate, Dr. Frost Maths, Tassomai) exists specifically because whiteboard platforms never filled this gap. Tutors use 3–5 separate tools to manage what should be one workflow.

**Why this is a Tutorwise moat:** Sage generated worked examples and problems during the session. The HomeworkDialog is already built (Ably broadcast). The next logical step is a structured between-session assignment — problems generated by Sage from the session's content — that the student completes asynchronously inside the platform, with completion tracked, before the next session.

### 3.3 iPad & Multi-Device Instability Still Unresolved (March 2026)

**LessonSpace:** No native app. iOS only works on Safari. Screen sharing on tablets is a documented permanent hardware limitation — not being fixed. Mobile interface described as "almost unusable" in 2025 reviews. Peak-hour lag (4–6pm) still present.

**PencilSpaces:** A tutoring company with 165 students reported iPad mid-session crashes, audio/video desync, and students stuck in waiting rooms — from August through December 2025 — that were never resolved. The company migrated to Zoom.

**Additional finding:** PencilSpaces had a **student data privacy leak** — students could see other students' names and folder data. Reported on day one, unresolved for 5 months. This is a GDPR-relevant exposure that makes PencilSpaces unsuitable for any multi-tutor operation at scale.

---

## 4. Gap Closure Plan

### Gap 1 — In-App Video Calling (Priority: Critical)

**Status:** External popup only (Jitsi new-window, Google Meet link)

**Why it matters:** Video is the core tutoring medium. The current Jitsi popup opens a separate window, breaking the unified session experience. Students have to alt-tab between the whiteboard and video. This is the single biggest functional gap.

**Technology recommendation: LiveKit (replacing Daily.co from previous draft)**

After evaluating all options:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **LiveKit Cloud** | Native React SDK, built-in recording (Egress), screen sharing, sub-$0.10/min, embeds inline | Monthly cost for recording storage | ✅ **Recommended** |
| Jitsi Meet iframe | Free, open source | Full-page UX, hard to embed side-by-side, no recording without self-hosting, Safari/iOS issues | ❌ Popup only |
| Daily.co | Mature, well-documented | Second vendor, $0.004/participant/min video + $0.004 recording, less React-native | Acceptable fallback |
| Ably Spaces (WebRTC) | Single vendor | Video API is newer and not production-ready | ❌ Not yet |
| Whereby embed | Simple iframe | Limited customisation, no recording | Niche only |

**Why LiveKit over Daily.co:**
- `@livekit/components-react` gives React hooks (`useLocalParticipant`, `useRemoteParticipants`, `useRoomContext`) — no iframe required, full control over the video UI
- Built-in noise cancellation, background blur
- LiveKit Egress handles cloud recording → webhook → store recording URL in Supabase (same pattern as our existing webhooks)
- Self-hostable if we ever need to cut costs at scale (open-source SFU)
- Jitsi is best as a free fallback for non-recorded sessions or overages

**Implementation scope:**
- `POST /api/virtualspace/[sessionId]/livekit-token` — creates a LiveKit access token (server-side, per-participant)
- New component: `VideoPanel.tsx` — embedded LiveKit room using `@livekit/components-react`
- Collapsible panel right-side of canvas (mirrors LessonSpace layout)
- Camera / mic / screen share toggles in session toolbar
- Add `livekit_room_name` column to `virtualspace_sessions`
- Migration: `ALTER TABLE virtualspace_sessions ADD COLUMN livekit_room_name text`
- Keep Jitsi "Join Video Room" button as fallback for users who prefer it

**Phase:** 1 (Critical path)

---

### Gap 2 — Session Recording (Priority: High, linked to Gap 1)

**Status:** Not present

**Approach:** LiveKit Egress triggers recording when a session starts. On completion, a webhook fires to `POST /api/webhooks/livekit/recording-complete` which stores the recording URL against the session. Recording is then surfaced in session history and (critically) fed into the post-session AI report.

**Scope:**
- LiveKit Egress configured per room
- Webhook route: `POST /api/webhooks/livekit/recording-complete`
- Store `recording_url` + `recording_duration_secs` in `virtualspace_sessions`
- Session history page: recording badge + playback link
- Access control: only tutor + student(s) on the booking
- Feed recording URL into AI summary generation (Gap 5)

---

### Gap 3 — PDF Viewer & Annotation (Priority: High)

**Status:** Not present — most common tutoring workflow

**Approach:** `PdfViewerShapeUtil` — a tldraw shape that renders a PDF via `pdfjs-dist`. The tutor uploads a PDF; each page renders as a canvas layer that both participants can annotate over with native tldraw drawing tools. The shape is a real tldraw record so it syncs via the existing Ably draw channel.

**Scope:**
- New npm dep: `pdfjs-dist`
- New shape util: `PdfViewerShapeUtil.tsx`
  - Props: `{ pdfUrl: string; page: number; totalPages: number; w: number; h: number }`
  - Renders PDF page as `<canvas>` element inside HTMLContainer
  - Previous/Next page controls inside the shape
- File upload: extend existing upload flow to accept `.pdf`, store in `virtualspace-artifacts` bucket
- Add "Upload PDF" button to SubjectToolsPanel
- PDF URL syncs to all participants via tldraw store (existing Ably draw channel — no new infra)

---

### Gap 4 — AI Post-Session Report (Priority: High — Strategic Moat)

**Status:** Not present. Neither competitor delivers this to parents automatically (confirmed March 2026).

**Why this is the biggest strategic opportunity:** LessonSpace's AI summary requires recording pre-enabled, delivers only to tutors, after 1 hour delay, with no parent delivery. PencilSpaces' summary is an enterprise add-on. Tutorwise can deliver a richer, more accurate report the moment the session ends — because Sage witnessed the entire session, not just a transcript.

**What the report contains:**
1. Topics covered (extracted from Sage session messages + canvas shapes stamped)
2. Student question patterns (from session chat + Sage conversation)
3. Struggles detected (from Sage's stuck-detector and copilot signals)
4. Homework set (from HomeworkDialog if used)
5. Recommended next steps (Sage-generated, based on session content)
6. Canvas snapshot image (existing)

**Approach:**
- `POST /api/virtualspace/[sessionId]/report` — triggered on "Mark as Complete" or 5 min after last activity
- Assembles: Sage chat history, session chat messages, canvas shapes snapshot, homework text, stuck-level signals
- Calls AI to generate structured report (JSON: topics, struggles, homework, next steps, summary paragraph)
- Stores in `virtualspace_sessions.session_report` (JSONB)
- Emails report to parent (via existing email infrastructure) if parent email on booking
- Makes report available in session history for tutor + student

**Migration:** `ALTER TABLE virtualspace_sessions ADD COLUMN session_report jsonb`

---

### Gap 5 — Google Classroom Integration (Priority: High — Unique Differentiator)

**Status:** Neither LessonSpace nor PencilSpaces has this (verified March 2026). LessonSpace has Google Docs/Slides embed (single documents only) but not Classroom. This is a genuine gap in the market.

**Strategic analysis:**
Google Classroom is the dominant LMS in UK secondary education — the exact GCSE/A-Level market Tutorwise serves. For a tutor whose student already uses Google Classroom at school, Tutorwise integration means:
- Zero friction to import assignments and mark schemes
- Post homework directly to the student's Classroom stream
- Post session reports to the parent (via Classroom guardian summaries)
- Tutor can see the student's existing assignments to align the session

Neither competitor has built this. It would be the first tutoring whiteboard platform with native Google Classroom integration.

**Integration scope:**
1. **OAuth 2.0:** `GET /api/integrations/google-classroom/connect` — standard Google OAuth flow, store tokens in `tutor_integrations` table
2. **Import assignments:** `GET /api/integrations/google-classroom/assignments?courseId=X` — list student's active assignments to surface in the session context sidebar
3. **Post homework:** When tutor sets homework via HomeworkDialog → option to also post as a Google Classroom assignment (title, description, due date, max points optional)
4. **Post session report:** When session report is generated → post summary to Google Classroom as a private comment or announcement
5. **Course roster sync:** Import student name/email from Google Classroom to pre-fill VirtualSpace invite

**New table:** `tutor_integrations (id, tutor_id, provider, access_token, refresh_token, expires_at, metadata jsonb)`

**UI surface:**
- Settings page: "Connect Google Classroom" button
- HomeworkDialog: "Also post to Google Classroom" checkbox (if connected)
- Post-session: "Share report to Google Classroom" one-click button
- Session sidebar: "Student's active assignments" imported from Classroom

---

### Gap 6 — Between-Session Practice & Homework Tracking (Priority: High — Strategic Moat)

**Status:** HomeworkDialog (Ably broadcast, notification to student) is built. Full tracking loop is not.

**What needs to be built:**
1. **Homework persistence:** Store homework in DB when tutor sends it (currently only Ably broadcast, no persistence)
2. **Student homework view:** `/virtualspace/homework` page — student sees all assigned homework with due dates
3. **Sage-generated practice problems:** After session, Sage generates 3–5 practice questions based on session topics. Student can attempt them in a mini-whiteboard (single-page tldraw instance) inside the homework view
4. **Completion tracking:** Student marks homework as done; tutor sees completion status before next session
5. **Reminder nudges:** Email/notification 24h before due date if not completed

**New table:** `virtualspace_homework (id, session_id, booking_id, student_id, tutor_id, text, due_date, practice_questions jsonb, completed_at, created_at)`

---

### Gap 7 — Reporting & Metrics Dashboard (Priority: Medium)

**Status:** Admin-level virtualspace_platform_metrics_daily exists. No tutor-facing or parent-facing reporting.

**What to build:**

**Tutor dashboard** (`/virtualspace/analytics`):
- Sessions this month / week
- Average session duration
- Students by engagement (sessions, last seen)
- Topics covered across all sessions (frequency map)
- Homework completion rate

**Parent view** (email-delivered, no login required):
- Weekly summary email: sessions attended, topics covered, homework set/completed, next session
- Triggered by existing cron job (Sunday 18:00)
- Opt-in via booking confirmation email

**Student progress view** (inside the platform):
- Topics covered over time (bar chart by session)
- Streak of completed homework
- Sage interaction history (questions asked, concepts explained)

**Session-level metrics** (already partly built):
- Duration, shapes added, Sage interactions, stuck-level signals, reactions, chat messages
- Surface these in session detail view

---

### Gap 8 — PDF Worksheet Generation (Priority: Medium — Strategic Moat)

**Status:** Not present anywhere in the market.

**What this means:** Sage has just taught a topic on the whiteboard. At the end of the session, the tutor clicks "Generate Worksheet" → Sage creates a PDF of 5–10 practice questions on that topic, formatted as an A4 worksheet (GCSE/A-Level style), downloadable and also postable as homework. No other tutoring platform generates custom worksheets from session content.

**Approach:** Sage AI generates structured question JSON → rendered to PDF via a server-side `@react-pdf/renderer` route → stored in Supabase Storage → linked to homework record.

---

### Gap 9 — Screen Sharing in Canvas (Priority: Medium)

**Status:** Button exists (MediaDevices.getDisplayMedia), but recipient doesn't see it — the stream is captured locally only.

**Approach:** With LiveKit in place (Gap 1), screen share is a standard LiveKit track. The shared screen appears as a participant feed in the VideoPanel. A "Pin screen" button promotes the screen share feed to full-width, pushing the whiteboard to a side panel — the same layout LessonSpace uses.

---

### Gap 10 — Breakout Rooms (Priority: Low)

Treat as a separate project. Requires `virtualspace_sessions.parent_session_id` FK, LiveKit room-per-breakout, Ably sub-channels, and new UI flows for host assignment and recall.

---

## 5. Implementation Roadmap

| Phase | Gap | Technology | Effort | Impact |
|---|---|---|---|---|
| **Phase 1** | LiveKit in-app video + screen share | LiveKit Cloud + `@livekit/components-react` | M (3–5 days) | Critical |
| **Phase 1** | Session recording | LiveKit Egress + webhook | S (1 day) | High |
| **Phase 2** | PDF viewer + annotation | `pdfjs-dist` + new ShapeUtil | M (3–4 days) | High |
| **Phase 2** | AI post-session report | Sage AI + email + JSONB store | M (2–3 days) | High (moat) |
| **Phase 3** | Google Classroom integration | Google OAuth + Classroom API | M (3–4 days) | High (moat) |
| **Phase 3** | Between-session homework tracking | New table + student view + Sage practice Qs | M (3–4 days) | High (moat) |
| **Phase 4** | Reporting dashboard (tutor + parent email) | React charts + cron email | M (2–3 days) | Medium |
| **Phase 4** | PDF worksheet generation | Sage + `@react-pdf/renderer` | S (1–2 days) | Medium (moat) |
| **Phase 5** | Breakout rooms | LiveKit rooms + schema changes | L (1–2 weeks) | Low-Medium |

---

## 6. Competitive Summary

### Where Tutorwise leads (March 2026)

- **Deepest educational tool library** of any tutoring platform: 29 custom on-canvas shapes; LessonSpace has ~4
- **Three fully interactive tools** (scientific calculator, fraction calculator, unit converter) — no modal, no context switch
- **Native AI tutor (Sage)** embedded in every session — neither LessonSpace nor PencilSpaces has this
- **Full platform integration** — bookings, payments, commissions, marketplace, referrals in one product
- **Student draw lock, tutor private notes, homework dialog, cursor presence, laser pointer, grid toggle** — all built and wired
- **Auto-save + resume on rejoin** — 90s interval, snapshot stored in Supabase, loaded on editor mount

### Where competitors still fail (confirmed March 2026)

- **No parent portal** — neither LessonSpace nor PencilSpaces has parent login or automated parent reporting
- **No between-session practice** — both are purely synchronous, no homework loop
- **iPad instability** — LessonSpace screen share permanently impossible on mobile; PencilSpaces had 5-month unresolved crash for a 165-student company
- **PencilSpaces student data leak** — students could see other students' names and folders; unresolved for months
- **LessonSpace support** — AI chatbot only, no phone, days to respond during live sessions

### Where Tutorwise still needs to close (Priority order)

1. In-app video (LiveKit) — the core functional gap
2. Session recording — foundational for AI report + parent trust
3. PDF viewer — most common tutoring workflow
4. AI post-session report → parent email — biggest strategic opportunity
5. Google Classroom — genuine market gap, neither competitor has it

---

## 7. Unique Differentiators to Protect & Amplify

These features are unique to Tutorwise. No competitor has them. They should be the centrepiece of product marketing:

| Differentiator | Status | Next action |
|---|---|---|
| On-canvas AI tutor (Sage) — live during session | ✅ Live | Amplify in marketing; add "What Sage explained" to post-session report |
| 29 subject-specific interactive tools | ✅ Live | Add 5 more per term (see backlog below) |
| AI post-session report → parent | ❌ Not built | Phase 2 — highest strategic priority |
| Google Classroom integration | ❌ Not built | Phase 3 — genuine market gap |
| Between-session Sage practice problems | ❌ Not built | Phase 3 — unique in the market |
| Full marketplace + booking + payment (end-to-end) | ✅ Live | Highlight in tutor acquisition |

---

## 8. Next Interactive Tools to Build (Backlog)

To continue widening the educational tool gap:

| Tool | Subject | Priority |
|---|---|---|
| Periodic table (interactive, clickable elements) | Chemistry | High |
| Matrix calculator (2×2, 3×3, det, inverse) | Maths / A-Level | High |
| Long division visualiser (step-by-step) | Primary Maths | High |
| Grid / multiplication table (interactive) | Primary Maths | Medium |
| Grammar parser / sentence diagram | English | Medium |
| Quadratic formula visualiser (discriminant) | Maths GCSE | Medium |
| Map / geography overlay (blank UK, world) | Geography | Medium |
| Piano keyboard (note identification) | Music | Low |
| French/Spanish verb conjugator | MFL | Low |
| Titration curve (pH vs volume) | A-Level Chemistry | Low |

---

## 9. Document History

| Date | Change |
|---|---|
| 2026-03-21 (initial) | Created — LessonSpace parity audit |
| 2026-03-21 (this update) | Added 2025–2026 market research; marked completed features; replaced Daily.co with LiveKit; added Google Classroom, reporting, PDF worksheet, between-session practice gaps; full roadmap update |

---

*Update this document whenever a gap is closed or new research surfaces.*

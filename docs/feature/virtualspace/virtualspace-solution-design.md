# Sage × VirtualSpace Solution Design
**AI Tutor Intelligence Layer for the Collaborative Whiteboard**
**Version:** 2.0
**Created:** 2026-03-19
**Updated:** 2026-03-19 — v1.1: 12 design review issues addressed
           2026-03-19 — v1.2: competitor research integrated — post-session recap (§8.6),
           guest access / magic link (§19), PNG canvas snapshot fix (§14),
           [CANVAS] parser validation spec (Phase 2), session recording strategic gap (§20),
           Desmos/GeoGebra / gamification / quota pooling in Future Roadmap (§20)
           2026-03-19 — v2.0: comprehensive implementation audit — all sections updated to
           reflect Phase 8 complete codebase. Exact constants, thresholds, API signatures,
           DB columns, type definitions, and file paths added throughout.
**Status:** Implemented — Phase 8 Complete

---

## Table of Contents

1. [Vision](#1-vision)
2. [Design Principles](#2-design-principles)
3. [Sage as a Session Participant](#3-sage-as-a-session-participant)
4. [Behaviour Profiles](#4-behaviour-profiles)
5. [Situational Awareness Loop](#5-situational-awareness-loop)
6. [Stuck Detection Engine](#6-stuck-detection-engine)
7. [Canvas Intelligence](#7-canvas-intelligence)
8. [Session Drive — Adaptive Lesson Plan](#8-session-drive--adaptive-lesson-plan)
9. [Lesson Plan Builder](#9-lesson-plan-builder)
10. [Quota & Subscription Model](#10-quota--subscription-model)
11. [Multi-Student Sessions](#11-multi-student-sessions)
12. [Tutor Co-pilot Channel](#12-tutor-co-pilot-channel)
13. [UI Design](#13-ui-design)
14. [API Specification](#14-api-specification)
15. [Database Schema](#15-database-schema)
16. [Implementation Phases](#16-implementation-phases)
17. [Success Metrics](#17-success-metrics)
18. [Related Documentation](#18-related-documentation)
19. [Future Roadmap](#19-future-roadmap)
20. [Known Gaps & Open Issues](#20-known-gaps--open-issues)

---

## 1. Vision

Sage in VirtualSpace is not a feature bolted onto the whiteboard. **Sage is a participant** — an intelligent presence that joins the session, reads the canvas, reads the room, and acts like the best tutor in the world who happens to never get tired, never miss a signal, and never run out of patience.

The student experience: press one button → Sage joins. Everything else is automatic.

The tutor experience: Sage is a co-pilot — silent when you're teaching, present when you need it, never undermining you in front of your student.

**Sage in VirtualSpace extends the same Sage the student knows from chat.** The canvas is a surface, not a separate product. The same student model, mastery scores, misconception tracking, and SM-2 spaced repetition follow the student from chat to whiteboard and back. One Sage. One subscription. One student model.

---

## 2. Design Principles

1. **Zero configuration** — Sage reads session context (participants, booking type, canvas content, student model) and configures itself. No setup modal.
2. **One entry point** — A single "Sage" button in the session header. No tabs, no mode selectors.
3. **Adaptive** — Sage shifts behaviour fluidly based on what is happening in the session. Behaviour profiles are internal implementation details, not user-facing controls.
4. **Proactive, not reactive** — Sage does not wait to be asked. It notices when a student is stuck and intervenes at the right moment — not too early (patronising), not too late (student gives up).
5. **Canvas-first explanations** — When Sage generates an explanation, it automatically decides what to stamp on the canvas alongside the text. Shapes appear as part of the natural response flow, not as a separate tool call.
6. **Invisible until needed** — No permanent UI clutter. Sage surfaces at the right moment.
7. **Vision over JSON** — Canvas observation uses PNG export sent to a vision model. JSON store snapshot tells you what tool-stamped shapes exist. It tells you nothing about freehand working — the most educationally valuable signal.
8. **Respect the human tutor** — In sessions with an active human tutor, Sage is a whisper in their ear, not a voice in the room. The human tutor remains the tutor.
9. **Never overwrite student work** — Sage uses spatial intelligence to find whitespace. It never accidentally covers a student's working.
10. **Protect peer learning** — When Sage detects one student explaining to another, it steps back. Organic peer learning is more valuable than AI intervention.

---

## 3. Sage as a Session Participant

Sage joins the session as a named participant in the Ably channel. It:

- Appears in the participant count
- Has its own context in the session (activating user's Sage session ID)
- Is visible in the participants list with a clear AI badge
- Attributes its canvas stamps to itself (visually distinct — dashed border, Sage teal colour)
- Can be removed from the session by the session owner at any time (deactivate button)

When Sage stamps a shape, other participants see it attributed to Sage — the same way they see shapes from other human participants. This establishes trust and transparency. Students know Sage is there and what it contributes.

### Ably Channels

| Channel | Format | Purpose |
|---------|--------|---------|
| Draw channel | `context.channelName` (e.g. `virtualspace:abc123`) | Main draw channel — all participants including Sage; presence tracked for tutor/student detection |
| Session channel | `session:${channelName}` | Session events (chat, reactions, timer, follow-mode) |
| Co-pilot private channel | `sage:copilot:${sessionId}:${tutorId}` | Private whisper channel — Sage → human tutor only; also used for disconnect recovery |

### Implementation Files

| Concern | File |
|---------|------|
| Main orchestration hook | `hooks/useSageVirtualSpace.ts` |
| Stuck detection | `hooks/useSageStuckDetector.ts` |
| Lesson plan management | `hooks/useLessonPlan.ts` |
| Multi-student intelligence | `hooks/useMultiStudentIntelligence.ts` |
| Co-pilot whisper channel | `hooks/useCopilotWhispers.ts` |
| Canvas writer (stamps shapes) | `canvas/SageCanvasWriter.tsx` |
| Canvas block parser | `canvas/canvasBlockParser.ts` |
| Sage panel UI | `SagePanel.tsx` |
| Co-pilot whisper overlay | `CopilotWhisperOverlay.tsx` |
| Lesson plan drawer | `LessonPlanDrawer.tsx` |

All component files are under `apps/web/src/components/feature/virtualspace/`.

---

## 4. Behaviour Profiles

Sage automatically selects and shifts between four behaviour profiles based on session signals. These are internal — the user never sees or selects them.

### 4.1 Tutor Profile
**When:** No human tutor present, OR tutor has been idle for more than 3 minutes.

Sage is the tutor. It drives the session — explains concepts, stamps worked examples, asks probing questions, waits for student response, observes their working, gives feedback, and advances through a lesson plan. It uses the student's model (mastery scores, known misconceptions, SM-2 due topics) to pick the right topic and difficulty.

### 4.2 Co-pilot Profile
**When:** Human tutor has been active within the last 90 seconds (canvas draw activity or presence).

Sage whispers suggestions to the tutor via the private co-pilot channel. It does not address the student directly unless asked by the tutor. Suggestions are brief and actionable: *"Student's error is on step 3 — wrong sign. Suggest annotating directly."* The tutor can accept (one tap → Sage stamps, attributed to tutor) or dismiss.

### 4.3 Wingman Profile
**When:** Human tutor is present but idle between 90 seconds and 3 minutes.

The human tutor is in the room but not actively teaching — perhaps the student is working independently. Sage quietly supports the student: answers questions, offers hints on request, but does not take over. It defers if the tutor re-engages.

### 4.4 Observer Profile
**When:** Student is actively working — student idle time is below 25 seconds — while Sage is in Tutor or Wingman profile.

Sage watches silently. It is present and ready but does not intervene. This is the default state immediately after a student starts working. Sage builds up its picture of what the student is doing before acting.

### Profile Transition Logic

```
Session start
  → Any human tutor present and active (draw activity < 90s)?
      Yes → Co-pilot profile
      No  → Tutor profile (Observer sub-state — Sage builds context first)

During session (10s awareness loop):
  Tutor active < 90s since last draw     → Co-pilot
  Tutor idle 90s–3min                    → Wingman
  Tutor idle > 3min OR absent            → Tutor
  Student idle < 25s (active working)   → Observer (within Tutor/Wingman)
  Stuck signal threshold reached         → Active intervention
```

### Exact Thresholds (implemented)

```typescript
const TUTOR_ACTIVE_THRESHOLD_MS  = 90 * 1000;      // 90 seconds → Co-pilot
const TUTOR_WINGMAN_THRESHOLD_MS = 3 * 60 * 1000;  // 3 minutes → Wingman / Tutor boundary
const STUDENT_ACTIVE_THRESHOLD_MS = 25_000;        // 25 seconds → Observer substate
```

### Profile Colours

| Profile | Background | Display label |
|---------|-----------|---------------|
| Tutor | `#006c67` (teal) | Tutor |
| Co-pilot | `#7c3aed` (purple) | Co-pilot |
| Wingman | `#d97706` (amber) | Wingman |
| Observer | `#64748b` (slate) | Observer |

Badge colours (in `SagePanel.tsx`):

| Profile | Label colour | Badge background |
|---------|-------------|-----------------|
| Tutor | `#006c67` | `#e6f7f6` |
| Co-pilot | `#7c3aed` | `#f3e8ff` |
| Wingman | `#d97706` | `#fef3c7` |
| Observer | `#64748b` | `#f1f5f9` |

---

## 5. Situational Awareness Loop

Sage maintains a continuous awareness loop, reading signals and deciding how to respond. The loop runs on a **10-second tick** while the session is active.

### Loop Behaviour

- **Interval:** 10,000ms (`setInterval(tick, 10_000)`)
- **Paused when:** `document.hidden === true` (tab not visible)
- **Paused when:** profile is `observer` (no intervention needed; student actively working)
- **Per-tick actions:** recompute profile, check co-pilot whisper conditions, check stuck signal

### Signal Sources

| Source | Signal | How read |
|--------|--------|----------|
| Session metadata | `session_type`, `booking_type`, `subject`, `level` | Resolved at activation from `virtualspace_sessions` + `bookings` |
| Participant presence | Who is present, tutor active/idle | Ably presence events on draw channel |
| Tutor activity | Last draw timestamp | Draw channel message events — `tutorLastActiveRef.current` |
| Student activity | Last draw timestamp | Draw channel message events — `studentLastActiveRef.current` |
| Stuck level | Idle time + erase pattern | `useSageStuckDetector` hook output |
| Erase pattern | Count of erasures in region | Store change events counted in `VirtualSpaceClient` |
| Peer teaching | Student explaining to another | `useMultiStudentIntelligence` heuristic |
| Session drive phase | Current lesson phase | `drivePhase` state in `useSageVirtualSpace` |
| Student model | Mastery scores, SM-2 due topics, misconceptions | `sage_student_profiles` loaded at activation |

**Known gap:** Misconceptions are included in the student model loaded at activation but are not explicitly re-extracted and logged during the session. `SessionRecap.misconceptionsLogged` is defined but not populated by the deactivate route.

### Subject and Topic Inference

Sage does not ask the student what subject they are studying. It infers from:

1. **Booking data** — if the session is linked to a booking, the booking's `service_name` and subject tags are the primary signal
2. **Canvas content** — math equation shapes → maths; circuit shapes → physics; fraction bars → KS1–KS3 maths
3. **Chat language** — "solve for x", "photosynthesis", "World War 2" → subject detection via existing Sage curriculum resolver
4. **Student model** — the student's active curriculum subjects from `sage_student_profiles`
5. **Session title** — fallback

Once inferred, Sage uses the full curriculum resolver to load the correct topic context, exam board alignment, and difficulty calibration.

---

## 6. Stuck Detection Engine

Sage detects when a student is stuck and intervenes at the right moment. Signals are weighted and combined. Intervention triggers at defined thresholds.

### Implemented Constants

```typescript
// useSageStuckDetector.ts
const THRESHOLDS = {
  low:    25,   // > 25 seconds idle
  medium: 60,   // > 60 seconds idle
  high:   120,  // > 120 seconds idle
};

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'pointerdown', 'wheel', 'touchstart'];
// Polled every 5 seconds; window-level listeners

// Erase pattern (SageCanvasWriter.tsx)
const ERASE_CLUSTER_RADIUS    = 200;           // px — deletions within this radius count as same region
const ERASE_WINDOW_MS         = 2 * 60 * 1000; // 2-minute rolling window
const ERASE_CLUSTER_THRESHOLD = 2;             // ≥2 deletions in region → pattern detected
```

### Signal Weights

| Signal | Effect | Notes |
|--------|--------|-------|
| Idle > 25s with incomplete work visible | → Low level | Could just be thinking |
| Idle > 60s | → Medium level | |
| Idle > 120s | → High level | |
| ≥2 erasures in same region (200px) within 2 min | Boost by one tier | Active struggle |
| Student types "?" in chat | → Medium (at minimum) | Implicit question |
| Student types "I don't understand" / "idk" / "help" | → High (at minimum) | Explicit |

### Intervention Levels

| Stuck Level | Sage Response |
|-------------|--------------|
| `none` | Silent — student is actively working |
| `low` | No automatic action; button may pulse (UI enhancement planned) |
| `medium` | Sage asks one open probing question in the chat panel |
| `high` | Auto-observe fires: `observe('stuck')` — Sage reads canvas and responds with scaffold or partial worked example |

### Auto-observe at High

When `stuckLevel === 'high'`, `VirtualSpaceClient` automatically calls `sage.observe('stuck')`. This sends the current canvas PNG snapshot to the observe API route which streams back a pedagogical response using the vision model.

---

## 7. Canvas Intelligence

### 7.1 Canvas Observation — Vision Model

Canvas observation uses tldraw's `editor.toImage()` PNG export at 0.5× scale, not raw SVG. PNG at half resolution is typically 60–150 KB, well within the 512 KB limit.

**Size guard:**
```typescript
const MAX_SNAPSHOT_BYTES = 512 * 1024;          // 512 KB
const MAX_B64_CHARS = Math.ceil(512_000 * 4/3); // base64 character limit
// Returns HTTP 413 if exceeded
```

**Vision model:** `gemini-2.0-flash`
**Generation config:** `temperature: 0.5`, `maxOutputTokens: 512`

The PNG is sent to the observe route with an observation prompt:

```
You are an expert tutor reviewing a student's whiteboard work.
Here is a screenshot of their current canvas.
Subject context: {subject} — {topic} — {level}
Student mastery: {mastery_summary}

1. What has the student done? Describe their approach.
2. Where have they gone wrong, if anywhere? Be specific.
3. What do they need next — a hint, a correction, or a new challenge?
4. If you need to stamp a shape on the canvas to help, include a [CANVAS] block.

Be encouraging. Address the student directly.
```

Observation is triggered:
- **Manually** — "Review my work" button in the Sage panel
- **Automatically** — when stuck level reaches `high`
- **By session drive** — after each practice problem phase (planned)

### 7.2 Canvas Write — Smart Stamping

When Sage generates a response that includes visual content, it embeds structured canvas blocks in its output:

```
[CANVAS]
{"type":"math-equation","props":{"latex":"x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}","displayMode":true}}
[/CANVAS]

The quadratic formula gives us both solutions at once...
```

The `SageCanvasWriter` component (rendered inside tldraw's `InFrontOfTheCanvas` slot, giving it `useEditor()` access) strips canvas blocks from the stream and executes them. The text renders in the Sage panel. The shapes stamp on the canvas. One response, two outputs, perfectly synchronised.

**[CANVAS] block format:**
```typescript
interface SageCanvasShapeSpec {
  type: string;                      // shape type key (see table below)
  props: Record<string, unknown>;    // shape-specific props (merged with defaults)
}
```

**Parser functions (`canvasBlockParser.ts`):**
```typescript
// For complete responses:
parseCanvasBlocks(content: string): { displayText: string; shapes: SageCanvasShapeSpec[] }

// For streaming (called per SSE chunk):
parseStreamingBuffer(rawBuffer: string): {
  displayText: string;
  shapes: SageCanvasShapeSpec[];
  remainingBuffer: string;  // partial [CANVAS] block held for next chunk
}
```

**Known validation gap:** The parser has not been formally tested against 20+ real LLM responses for 3 edge-case failure modes: wrong field names, `[CANVAS]` blocks wrapped inside markdown code fences, and multiple blocks where the second is silently dropped. Unit tests should be added before Phase 2 is considered fully hardened.

**Supported shape types and defaults:**

| Type | Default size | Key props |
|------|-------------|-----------|
| `math-equation` | 280×80 | `latex`, `displayMode`, `fontSize` |
| `annotation` | 240×80 | `text`, `annotationType`, `highlightColor` |
| `number-line` | 320×80 | `min`, `max`, `step`, `markers`, `showFractions` |
| `fraction-bar` | 200×60 | `numerator`, `denominator`, `color`, `bgColor`, `showEquivalent` |
| `venn-diagram` | 380×260 | `leftLabel`, `rightLabel`, `leftContent`, `centerContent`, `rightContent` |
| `graph-axes` | 320×320 | `xMin`, `xMax`, `yMin`, `yMax`, `showGrid`, `showLabels` |
| `pie-chart` | 280×280 | `segments` (JSON string), `title`, `showPercentages` |
| `bar-chart` | 320×280 | `bars` (JSON string), `title`, `xLabel`, `yLabel` |
| `timeline` | 400×200 | `events` (JSON string), `title`, `lineColor` |
| `pythagoras` | 280×280 | `sideA`, `sideB`, `showWorking`, `showAngles` |
| `protractor` | 200×120 | `angle`, `showDegrees` |
| `unit-circle` | 320×320 | `showAngles`, `showCoordinates`, `highlightAngle` |
| `text-block` | 260×80 | `text`, `fontSize`, `color`, `bold` |

**Note:** `pie-chart`, `bar-chart`, `timeline`, and `venn-diagram` use JSON-stringified arrays for their collection fields. The parser coerces these automatically.

### 7.3 Spatial Intelligence — No Hard Zone

Sage does not use a fixed zone. It reads the live canvas layout before every stamp:

1. Query the tldraw store for all existing shape bounding boxes, filtering out shapes with `meta.sageAttributed === true`
2. Identify the student's working cluster (all shapes not attributed to Sage)
3. Find the nearest whitespace that does not overlap any existing shape
4. Place the new shape with **24px clearance** from the nearest edge

**Position finding strategy (`findStampPosition` in `SageCanvasWriter.tsx`):**

```typescript
const GAP = 24;     // clearance from nearest shape edge
const CASCADE = 24; // offset applied to each subsequent shape in a batch
const PAD = 4;      // padding around attribution frame

// Strategy:
// 1. Try to the right of the rightmost shape (with GAP clearance)
// 2. Try below the lowest shape
// 3. Fall back to viewport centre-right
```

When annotating student work directly (e.g. circling an error), Sage uses a visually distinct style:
- Dashed border
- Sage teal colour (`green` in tldraw colour token, maps to `#006c67`)
- `meta.sageAnnotation: true` — allows filtering Sage content separately

If the canvas is nearly full, Sage pans the viewport to find whitespace to the right of all existing content before stamping.

### 7.4 Canvas Attribution Styling

Every Sage-stamped shape is accompanied by an attribution frame rendered as additional tldraw shapes:

```typescript
// Main shape: opacity 0.85, meta.sageAttributed = true
// Dashed frame: geo shape, dash='dashed', color='green', fill='none', size='s', opacity 0.6
//               meta.sageFrame = true
// Label: text shape "↗ Sage", color='green', size='xs', font='sans', opacity 0.7
//        meta.sageLabel = true
```

In co-pilot mode when the tutor accepts a Sage suggestion, the shape is stamped with `meta._tutorAttributed: true` — the attribution frame and label are omitted. The student sees the tutor's content, not Sage's.

---

## 8. Session Drive — Adaptive Lesson Plan

When Sage is in Tutor profile with a fresh session (empty canvas, no prior interaction), it initiates a structured lesson rather than waiting to be asked.

### 8.1 Lesson Plan Structure

```
Phase 1 — Calibration
  Auto-fires 3s after activation (tutor profile only, message count = 0)
  Sage checks what the student wants to work on today.
  If booking → topic from booking context
  If standalone → infer from student model (SM-2 due topics)
  If uncertain → one direct question: "What are you working on?"

Phase 2 — Activation
  Triggered when student sends first message.
  Sage stamps an opening question or prompt on canvas.
  "Have a go — show your working."
  Sage enters Observer sub-state.

Phase 3 — Observation & Feedback loop
  Triggered when ≥3 assistant messages exist (greeting + calibration + first substantive).
  Student works → Sage observes (vision) → Correct / Partially correct / Incorrect / Stuck

Phase 4 — Consolidation
  Triggered when ≥8 assistant messages (H2 — planned refinement).
  After 3 consecutive correct responses at target difficulty:
  Sage summarises what was learned.
  Updates student model (mastery score, SM-2 interval).
  Offers: go deeper, try a related topic, or finish.

Phase 5 — Wrap-up
  Triggered when ≥11 assistant messages (H2 — planned refinement).
  Sage stamps a summary "takeaway" box on canvas.
  Saves session to sage_sessions with surface: 'virtualspace'.
  Writes mastery update to sage_student_profiles.
```

**Phase transition thresholds** are message-count based in the current implementation. The exact counts (3/8/11) are flagged as H2 items — future work will replace them with quality signals (consecutive correct responses, explicit topic completion).

### 8.2 Adaptive Difficulty

At each cycle, Sage recalibrates difficulty based on:
- Student's current mastery score for this topic
- Number of consecutive correct/incorrect responses this session
- Time taken per problem (fast + correct → harder; slow + correct → same level)
- Student's explicit request ("make it harder" / "too hard")

### 8.3 Session Drive Phase in useSageVirtualSpace

```typescript
export type DrivePhase = 'calibration' | 'activation' | 'loop' | 'consolidation' | 'wrap-up';
```

Phase state is included in the system prompt context block sent to the message API route, so Sage's response style adapts to the current phase without any explicit instructions in the user message.

### 8.4 Post-Session Recap

On deactivation, the `/api/sage/virtualspace/deactivate` route generates a structured recap:

```typescript
export interface SessionRecap {
  topicsCovered: string[];
  misconceptionsLogged: string[];   // currently not populated — known gap
  masteryDelta: number;             // estimated mastery improvement
  timeSpent: number;                // minutes
  strongMoments: string[];          // positive highlights from the session
  suggestedNextSteps: string[];     // recommended follow-on topics
  lessonPlanPrompt?: string;        // optional: prompt for generating a follow-up lesson plan
}
```

Recap is generated via LLM with a 5-second timeout. It is persisted to `sage_sessions.recap_json` and returned in the deactivate response. The `SagePanel` renders a recap card after deactivation with a dismiss action.

---

## 9. Lesson Plan Builder

Sage can create and design structured lesson plans — for tutors to use in their sessions, for students to follow independently, and as the foundation for the Session Drive loop. Lesson plans are first-class objects: saved, editable, reusable, and shareable.

### 9.1 Who Creates Lesson Plans

| Who | How | For whom |
|-----|-----|---------|
| Tutor | Via Sage chat: *"Create a 45-minute GCSE maths lesson on quadratic equations for a grade 5 student"* | Their students or for use in a booking session |
| Student | Via Sage chat: *"Build me a study plan for my chemistry mock next Thursday"* | Themselves |
| Sage autonomously | During Session Drive — Sage constructs and executes a plan in real time | The current session |
| Admin | Via the Sage admin panel | Platform-level template plans |

### 9.2 Type Definitions

```typescript
// useLessonPlan.ts
export interface LessonPhase {
  id: string;
  name: string;
  type: 'intro' | 'worked-example' | 'guided-practice' | 'independent-practice'
      | 'check' | 'consolidation' | 'extension' | 'recap';
  duration: number;              // minutes
  instruction: string;           // what Sage says/does in this phase
  canvasAssets?: CanvasAsset[];  // shapes to stamp at phase start
  successCriteria: string;       // what "done" looks like
  adaptations?: {
    ifCorrect: string;
    ifStruggling: string;
    scaffold?: CanvasAsset[];
  };
}

export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  level: string;
  topic: string;
  examBoard?: string;
  targetDuration: number;    // minutes
  difficulty: string;
  isTemplate: boolean;
  status: 'draft' | 'active' | 'archived';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  phases?: LessonPhase[];
}

interface CanvasAsset {
  type: string;
  data: Record<string, unknown>;
  label?: string;
}
```

### 9.3 Lesson Plan Generation

When a tutor or student asks Sage to create a lesson plan, the `/api/sage/lesson-plans/generate` route:

1. **Infers parameters** from the natural language prompt — subject, level, topic, duration, student context
2. **Loads student model** (if a specific student is named)
3. **Generates structured JSON** with phases, timing, canvas assets, and adaptive branches
4. **Returns** the plan for review before saving, with a plain-language summary and estimated mastery delta

The plan is not auto-saved — the user reviews and saves explicitly via `POST /api/sage/lesson-plans`.

### 9.4 Lesson Plan → VirtualSpace

**Via Lesson Plan Drawer** (`LessonPlanDrawer.tsx`, 380px fixed right panel):
- Tutor opens the drawer from the session header "Load Plan" button
- Selects a plan from their library (searchable, filterable)
- Sage activates in Session Drive mode, executing the plan's phase sequence
- Tutor can override any phase — Sage adapts in real time
- Active phase visible in the drawer header

**Execution tracking:**
- `useLessonPlan.loadPlan(planId)` calls `POST /api/sage/lesson-plans/[id]/load`
- Creates a `sage_lesson_plan_executions` record
- Returns `executionId` and the full `phases` array
- `useLessonPlan.advancePhase()` calls `PATCH /api/sage/lesson-plans/[id]/executions/[executionId]`

**Plan execution is adaptive** — phase sequencing follows the drive loop but can be skipped or repeated based on student performance.

### 9.5 Lesson Plan Library

| Surface | Access |
|---------|--------|
| VirtualSpace session header | "Load Plan" button → `LessonPlanDrawer` |
| Sage chat | *"Show my lesson plans"* → Sage lists and describes them |
| Tutor account page | Lesson Plans section (planned) |
| Student account page | Study Plans section (planned) |
| Admin Sage panel | Platform-level templates (planned) |

### 9.6 Sharing & Templates

- Tutors mark a plan `isTemplate: true` — reusable across multiple students
- Plans with `status: 'archived'` are hidden from the library
- `status: 'active'` indicates the plan is currently executing in a session

### 9.7 Lesson Plan → Student Progress

Every lesson plan execution writes back to the student model via the deactivate recap:
- `phases_completed` incremented on `advancePhase()`
- `phases_struggled` incremented when the struggling adaptation branch fires
- `mastery_delta` written to `sage_lesson_plan_executions` on deactivate

---

## 10. Quota & Subscription Model

### One Sage. One Quota. All Surfaces.

Sage in VirtualSpace uses the same quota as Sage chat. The canvas is a surface, not a separate product. A student with 6 free interactions remaining in chat has 6 remaining on the whiteboard — the same counter, the same table.

**Free tier:** 10 Sage interactions (shared across chat and VirtualSpace)
**Sage Pro:** £10/month — unlimited interactions on all surfaces

### Quota by Scenario

| Scenario | Charged to |
|----------|-----------|
| Student activates Sage solo (standalone or free help) | Student's quota |
| Student in a tutor's Sage-enabled booking session | Tutor's quota (student exempt) |
| Tutor uses Sage co-pilot tools | Tutor's quota |
| Student in a booking asks Sage a question directly | Student's quota |

**Rationale for tutor-activated exemption:** When a tutor enables Sage as a co-pilot in their booked session, they are offering Sage-enhanced tutoring as part of their service. They have paid for Sage Pro. The student benefits as an included part of the session — not from their own personal Sage allowance.

### Quota Check

`/api/sage/virtualspace/activate` calls `checkAIAgentRateLimit()`. Returns `HTTP 429` if quota is exhausted. Response body includes `{ quota_exhausted: true }`.

### Paywall Behaviour

**On activation at 0 quota:**
- Sage button shows an upgrade prompt instead of activating

**Mid-session quota exhaustion:**
- `useSageVirtualSpace` catches HTTP 429 or `quota_exhausted: true` in the response body
- Sets `quotaExhausted = true`
- `SagePanel` renders a paywall card: *"You've used your free Sage sessions. Subscribe to Sage Pro — £10/mo"*
- The canvas remains fully functional; only Sage's AI responses are gated

**Quota warning (< 5 remaining):**
- `SagePanel` footer shows `{quotaRemaining} free sessions remaining — Upgrade to Pro`
- Not shown when student has Pro or is in a tutor's Sage-enabled session

---

## 11. Multi-Student Sessions

### Implementation

`useMultiStudentIntelligence.ts` is marked as R&D — heuristics are experimental and not yet validated in live tutoring data.

### Type Definitions

```typescript
export interface StudentSignal {
  userId: string;
  displayName: string;
  idleMs: number;
  stuckLevel: 'none' | 'low' | 'medium' | 'high';
  isPeerTeaching: boolean;
}

export interface MultiStudentContext {
  signals: Record<string, StudentSignal>;
  peerTeachingDetected: boolean;
  buildContextBlock: () => string;
  recordActivity: (userId: string, displayName: string) => void;
}
```

### Per-Student Stuck Thresholds

```typescript
const STUCK_LOW_MS    = 60_000;   // 1 minute
const STUCK_MEDIUM_MS = 120_000;  // 2 minutes
const STUCK_HIGH_MS   = 180_000;  // 3 minutes
// (Intentionally more lenient than single-student thresholds — peer context changes interpretation)
```

### Peer Learning Detection

```typescript
// Detected when ALL of:
// 1. One student's average recent message length > 80 chars (explanatory/teaching language)
// 2. Another student's idle time > PEER_TEACH_LEARNER_IDLE_MS (30s) (listening state)
const PEER_TEACH_LEARNER_IDLE_MS = 30_000;
```

When peer teaching is detected:
- `peerTeachingDetected = true` propagates to Sage's awareness loop
- Sage suppresses proactive interventions
- The system prompt context block includes: *"Do not broadcast to the group. Address students by name."*

### Addressing Individuals

Sage always addresses students by their display name when in a multi-student session:

> *"Hey [Name], I can see you tried the substitution approach here — let's look at step 2 together."*

Not a broadcast to the room.

---

## 12. Tutor Co-pilot Channel

### Private Whisper Channel

In Co-pilot profile, Sage communicates with the human tutor via a private Ably sub-channel: `sage:copilot:{sessionId}:{tutorId}`. The student never sees this channel.

### Whisper Type

```typescript
export interface CopilotWhisper {
  id: string;
  urgency: 'low' | 'medium' | 'high';
  message: string;
  action: {
    type: 'stamp';
    shape: { type: string; props?: Record<string, unknown> };
  } | null;
}
```

### Urgency Colours (`CopilotWhisperOverlay.tsx`)

| Urgency | Text | Background | Border |
|---------|------|-----------|--------|
| `low` | `#64748b` | `#f8fafc` | `#e2e8f0` |
| `medium` | `#d97706` | `#fffbeb` | `#fde68a` |
| `high` | `#dc2626` | `#fef2f2` | `#fecaca` |

### Generation Schedule

```typescript
const COPILOT_INTERVAL_MS = 30_000; // at most one whisper generated per 30s
```

**Quiet period guards** (server-side in `/api/sage/virtualspace/copilot`):
```typescript
if (tutorLastActiveMs < 30_000) return 204;  // tutor actively teaching
if (dismissedCount >= 3)        return 204;  // recalibrate after 3 dismissals
if (stuckSignal === 'none')     return 204;  // student actively working
```

### Overlay Display (`CopilotWhisperOverlay.tsx`)

- Position: `bottom: 80px, right: 12px` (above `SessionControlsPanel`)
- Dimensions: `width: 300px`
- Max visible: 2 whispers
- Auto-dismiss: 60 seconds
- `z-index: 9997`

### Tutor Actions

- **Accept** → calls `useCopilotWhispers.acceptWhisper(id)` → `POST /api/sage/virtualspace/copilot/accept` → shape returned → stamped with `meta._tutorAttributed: true` (no Sage branding on canvas)
- **Dismiss** → calls `dismissWhisper(id)` → increments `dismissedCountRef` → shape not stamped

### Disconnect Recovery

Whispers are also logged to `sage_canvas_events` (event_type: `copilot_suggestion`) and the private Ably channel persists recent messages. On reconnect, `GET /api/sage/virtualspace/copilot/pending` fetches any missed whispers from the last 5 minutes.

### When Sage Goes Quiet

Sage suppresses co-pilot whispers when:
- The tutor has been actively drawing in the last 30 seconds (mid-demonstration)
- The tutor has dismissed the last 3 suggestions (Sage recalibrates its suggestion threshold)
- The student has no stuck signal (student actively working, no intervention needed)

---

## 13. UI Design

### 13.1 Session Header — Sage Button

A single `Brain` icon button in the VirtualSpace header.

| State | Background | Border | Text/icon |
|-------|-----------|--------|-----------|
| Inactive | white | `#d1d5db` | `#374151` "Sage" |
| Activating | white | `#d1d5db` | opacity 0.7 "Starting..." |
| Active — Tutor | `#006c67` | `#006c67` | white "Sage" |
| Active — Co-pilot | `#7c3aed` | `#7c3aed` | white "Sage" |
| Active — Wingman | `#d97706` | `#d97706` | white "Sage" |
| Active — Observer | `#64748b` | `#64748b` | white "Sage" |

Button dimensions: `height: 36px, padding: 0 14px, font-size: 0.8125rem, font-weight: 600, border-radius: 6px`

### 13.2 Sage Panel

Slides in from the right when activated. No tabs — single scrolling message stream.

```
┌──────────────────────────────┐
│  🧠 Sage  [Tutor]       [×]  │  ← header: profile badge, close
│  ──────────────────────────  │
│                              │
│  [Sage message stream        │
│   with inline canvas         │
│   shape previews]            │
│                              │
│  ──────────────────────────  │
│  👁 Review my work           │  ← manual observe trigger
│  ──────────────────────────  │
│  [student input field]   [↑] │
└──────────────────────────────┘
```

**Dimensions:**
- `width: 320px`
- `position: fixed; top: 56px; right: 0; bottom: 0`
- `z-index: 9998`
- `box-shadow: -4px 0 20px rgba(0,0,0,0.15)`

**Quota warning footer** (when `quotaRemaining < 5`):
```
│  {n} free sessions remaining — Upgrade to Pro  │
```

**Paywall card** (when `quotaExhausted = true`):
```
│  You've used your free Sage sessions.          │
│  [Upgrade to Sage Pro — £10/mo]                │
```

**Recap card** (after deactivation):
- Renders `SessionRecap` fields: topics covered, strong moments, suggested next steps
- Dismiss button to clear the card

### 13.3 Co-pilot Whisper Overlay

```
Position: fixed, bottom: 80px, right: 12px
Width: 300px
Max 2 whispers visible simultaneously
Gap: 8px between whispers
z-index: 9997
Auto-dismiss after 60s
```

### 13.4 Lesson Plan Drawer

```
Position: fixed, top: 0, right: 0, bottom: 0
Width: 380px
z-index: 9991
box-shadow: -4px 0 24px rgba(0,0,0,0.15)
```

Contains: plan library list, active plan phase tracker, advance/pause controls.

### 13.5 Canvas Attribution

Sage-stamped shapes:
- **Main shape:** `opacity: 0.85`, `meta.sageAttributed: true`
- **Dashed frame:** geo, `dash: 'dashed'`, `color: 'green'`, `fill: 'none'`, `opacity: 0.6`, `meta.sageFrame: true`
- **Label:** text "↗ Sage", `color: 'green'`, `size: 'xs'`, `opacity: 0.7`, `meta.sageLabel: true`

In co-pilot mode when tutor accepts: no frame or label. Shape has `meta._tutorAttributed: true` only.

### 13.6 Quota Display

Remaining free interactions shown subtly in the Sage panel footer when below 5. Not shown when student has Pro or is in a tutor's Sage-enabled session.

---

## 14. API Specification

All routes require authentication. All routes guard against cross-user access (`sage_sessions.user_id` must match the authenticated user, or admin override).

### Activation & Deactivation

#### `POST /api/sage/virtualspace/activate`
Activates Sage for a VirtualSpace session. Checks quota, infers subject/topic, selects behaviour profile, creates Sage session record.

**Request:**
```json
{ "sessionId": "uuid" }
```
**Response:**
```json
{
  "sageSessionId": "uuid",
  "profile": "tutor" | "copilot" | "wingman" | "observer",
  "subject": "maths",
  "level": "GCSE",
  "topic": "quadratic-equations",
  "quotaRemaining": 6,
  "chargedTo": "student" | "tutor"
}
```
**Status codes:** `200` | `401` | `404` | `429` (quota exhausted)

**Known gap:** Profile inference currently always returns `'tutor'`. Context-aware initial profile selection (checking booking context, participant count) is planned.

#### `POST /api/sage/virtualspace/deactivate`
Deactivates Sage for the session. Generates recap, writes mastery updates, closes session record.

**Request:**
```json
{ "sageSessionId": "uuid", "sessionId": "uuid", "timeSpentMinutes": 42 }
```
**Response:**
```json
{ "success": true, "recap": { ...SessionRecap } }
```
**Status codes:** `200` | `401` | `403` | `404`

Recap generation has a 5-second timeout. If it fails, deactivation still succeeds (recap is `null`).

### Messaging & Observation

#### `POST /api/sage/virtualspace/message`
Send a message to Sage in a VirtualSpace session. Streams response.

**Request:**
```json
{
  "sageSessionId": "uuid",
  "message": "I don't understand step 2",
  "conversationHistory": [...]
}
```
**Response:** Server-sent event stream
```
event: chunk
data: {"content":"Let's look at step 2 together..."}

event: chunk
data: {"canvas":{"type":"math-equation","props":{...}}}

event: done
data: {}
```
**Status codes:** `200` (stream) | `400` | `401` | `403` | `404` | `410` (session expired)

#### `POST /api/sage/virtualspace/observe`
Submit a canvas snapshot for Sage to observe and give feedback.

**Request:**
```json
{
  "sageSessionId": "uuid",
  "canvasSnapshot": "base64-png-string (optional)",
  "trigger": "manual" | "stuck"
}
```
**Response:** SSE stream (same format as `/message`)
**Status codes:** `200` (stream) | `400` | `401` | `403` | `404` | `413` (snapshot too large)

### Canvas Event Logging

#### `POST /api/sage/virtualspace/canvas-event`
Logs a canvas intelligence event. Fire-and-forget — always returns `200` unless auth fails.

**Request:**
```json
{
  "sageSessionId": "uuid",
  "virtualspaceSessionId": "uuid",
  "eventType": "stamp" | "observe" | "annotation" | "copilot_suggestion" | "copilot_accepted" | "copilot_dismissed" | "profile_transition",
  "shapeType": "math-equation",
  "shapeData": { ... },
  "observationTrigger": "manual" | "stuck",
  "observationFeedback": "...",
  "fromProfile": "tutor",
  "toProfile": "copilot"
}
```

### Co-pilot Whispers

#### `POST /api/sage/virtualspace/copilot`
Generate a co-pilot whisper for the tutor. Returns `204` during quiet periods.

**Request:**
```json
{
  "sageSessionId": "uuid",
  "sessionId": "uuid",
  "stuckSignal": "none" | "low" | "medium" | "high",
  "conversationHistory": [...],
  "tutorLastActiveMs": 45000,
  "dismissedCount": 1
}
```
**Response:** `{ "whisper": CopilotWhisper }` or `null`
**Status codes:** `200` | `204` (quiet period) | `400` | `401` | `403` | `410` | `500`

#### `GET /api/sage/virtualspace/copilot/pending?sessionId=...&sageSessionId=...`
Fetch pending whispers (used for disconnect recovery).

**Response:** `{ "whispers": CopilotWhisper[] }`

#### `POST /api/sage/virtualspace/copilot/accept`
Tutor accepts a co-pilot whisper. Returns the shape to stamp.

**Request:**
```json
{
  "sageSessionId": "uuid",
  "sessionId": "uuid",
  "whisperId": "uuid",
  "shape": { "type": "unit-circle", "props": {} }
}
```
**Response:** `{ "ok": true, "shape": { ... } }`

### Lesson Plans

#### `GET /api/sage/lesson-plans`
List lesson plans for the current user.

**Response:** `{ "plans": LessonPlan[] }`

#### `POST /api/sage/lesson-plans`
Save a lesson plan.

**Request:** `{ "plan": LessonPlan, "createdFor"?: "uuid" }`
**Response:** `{ "id": "uuid" }`
**Status:** `201`

#### `POST /api/sage/lesson-plans/generate`
Generate a lesson plan from a natural language prompt.

**Request:**
```json
{
  "prompt": "45-minute GCSE maths lesson on quadratic equations for a grade 5 student",
  "studentId": "uuid (optional)",
  "subject": "maths (optional — inferred if absent)",
  "level": "GCSE (optional — inferred if absent)"
}
```
**Response:**
```json
{
  "plan": { ...LessonPlan },
  "summary": "Plain language description",
  "estimatedMasteryDelta": 0.18
}
```

#### `POST /api/sage/lesson-plans/[id]/load`
Load a lesson plan into a VirtualSpace session.

**Request:** `{ "virtualspaceSessionId": "uuid", "sageSessionId": "uuid", "studentId"?: "uuid" }`
**Response:** `{ "executionId": "uuid", "phases": LessonPhase[] }`

#### `PATCH /api/sage/lesson-plans/[id]/executions/[executionId]`
Update execution state.

**Request:**
```json
{
  "current_phase_index": 2,
  "status": "in_progress" | "completed" | "abandoned",
  "mastery_delta": 0.12,
  "phases_completed": 3,
  "phases_struggled": 1
}
```
**Response:** `{ "ok": true }`

---

## 15. Database Schema

### Column Additions (migration 418)

#### `virtualspace_sessions`
```sql
ADD COLUMN sage_config JSONB DEFAULT NULL;

-- sage_config shape:
-- {
--   "enabled": true,
--   "activatedAt": "2026-03-19T10:00:00Z",
--   "activatedBy": "uuid",
--   "profile": "tutor",
--   "subject": "maths",
--   "level": "GCSE",
--   "topic": "quadratic-equations",
--   "chargedTo": "student" | "tutor",
--   "quotaOwnerId": "uuid"
-- }
```

#### `sage_sessions`
```sql
ADD COLUMN surface TEXT DEFAULT 'chat'
  CHECK (surface IN ('chat', 'virtualspace', 'growth', 'ai_agent')),
ADD COLUMN virtualspace_session_id UUID REFERENCES virtualspace_sessions(id),
ADD COLUMN recap_json JSONB DEFAULT NULL;
```

**Note:** The `surface` check constraint includes `'growth'` and `'ai_agent'` proactively to avoid future `ALTER TABLE` migrations.

### New Table — `sage_canvas_events` (migration 420)

```sql
CREATE TABLE sage_canvas_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sage_session_id         UUID NOT NULL REFERENCES sage_sessions(id),
  virtualspace_session_id UUID NOT NULL REFERENCES virtualspace_sessions(id),
  event_type              TEXT NOT NULL CHECK (event_type IN (
                            'stamp', 'observe', 'annotation',
                            'copilot_suggestion', 'copilot_accepted', 'copilot_dismissed',
                            'profile_transition'
                          )),
  shape_type              TEXT,
  shape_data              JSONB,
  observation_trigger     TEXT,
  observation_feedback    TEXT,
  from_profile            TEXT,
  to_profile              TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (migration 421 audit fix): session owner OR admin
CREATE POLICY "sage_canvas_events_owner" ON sage_canvas_events
  FOR ALL USING (
    sage_session_id IN (
      SELECT id FROM sage_sessions WHERE user_id = auth.uid()
    ) OR (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );
```

### New Table — `sage_lesson_plans` (migration 420)

```sql
CREATE TABLE sage_lesson_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  subject          TEXT NOT NULL,
  level            TEXT NOT NULL,
  topic            TEXT NOT NULL,
  exam_board       TEXT,
  target_duration  INTEGER NOT NULL,  -- minutes
  difficulty       TEXT NOT NULL,
  created_by       UUID NOT NULL REFERENCES profiles(id),
  created_for      UUID REFERENCES profiles(id),
  phases           JSONB NOT NULL DEFAULT '[]',
  tags             TEXT[] DEFAULT '{}',
  is_template      BOOLEAN DEFAULT FALSE,
  organisation_id  UUID REFERENCES connection_groups(id),
  status           TEXT DEFAULT 'draft'
                   CHECK (status IN ('draft', 'active', 'ready', 'archived')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sage_lesson_plans_created_by  ON sage_lesson_plans(created_by);
CREATE INDEX idx_sage_lesson_plans_created_for ON sage_lesson_plans(created_for);
CREATE INDEX idx_sage_lesson_plans_template    ON sage_lesson_plans(is_template) WHERE is_template = TRUE;

-- RLS: creator OR assignee OR admin
```

### New Table — `sage_lesson_plan_executions` (migration 420 + 421)

```sql
CREATE TABLE sage_lesson_plan_executions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id            UUID NOT NULL REFERENCES sage_lesson_plans(id),
  sage_session_id           UUID NOT NULL REFERENCES sage_sessions(id),
  virtualspace_session_id   UUID NOT NULL REFERENCES virtualspace_sessions(id),
  student_id                UUID NOT NULL REFERENCES profiles(id),
  current_phase_index       INTEGER DEFAULT 0,
  phases                    JSONB,          -- snapshot of phases at load time
  status                    TEXT DEFAULT 'in_progress'
                            CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  mastery_delta             NUMERIC(4,3),
  phases_completed          INTEGER DEFAULT 0,
  phases_struggled          INTEGER DEFAULT 0,
  started_at                TIMESTAMPTZ DEFAULT NOW(),
  completed_at              TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ DEFAULT NOW()  -- migration 421 audit fix
);

-- RLS: student OR session owner OR admin
```

### Migration Sequence

| Migration | Content |
|-----------|---------|
| 418 | `sage_sessions.surface`, `sage_sessions.virtualspace_session_id`, `sage_sessions.recap_json`, `virtualspace_sessions.sage_config` |
| 420 | `sage_canvas_events`, `sage_lesson_plans`, `sage_lesson_plan_executions` + indexes + RLS |
| 421 | Audit fixes: RLS on `sage_canvas_events` (session owner), `'active'` added to lesson plan status, `updated_at` on executions, auto-update triggers |

---

## 16. Implementation Phases

### Phase 1 — Foundation (Sage Panel + Basic Chat) ✅ COMPLETE
- Sage button in VirtualSpace header
- Sage panel slides in with chat interface
- Quota check on activation (`checkAIAgentRateLimit`)
- Sage session record created (`surface: 'virtualspace'`)
- Student model loaded on activation
- Text-only responses (no canvas write yet)
- Manual deactivation with session recap
- DB migrations: `sage_sessions.surface`, `virtualspace_sessions.sage_config`

### Phase 2 — Canvas Write ✅ COMPLETE (validation gap outstanding)
- `SageCanvasWriter` component inside `InFrontOfTheCanvas`
- `[CANVAS]` block parsing in streaming response (`canvasBlockParser.ts`)
- Spatial intelligence — bounding box query before stamp, 24px clearance, cascade
- Shape attribution styling (dashed teal border, "↗ Sage" label)
- 13 supported shape types
- `/api/sage/virtualspace/message` with canvas block streaming
- **Outstanding:** Unit tests for 3 parser edge cases not yet written

### Phase 3 — Canvas Observe ✅ COMPLETE
- PNG export trigger (manual "Review my work" button)
- `/api/sage/virtualspace/observe` with vision model (`gemini-2.0-flash`)
- Stuck detection engine (`useSageStuckDetector` — idle timer + erase pattern signals)
- Automatic observe on High stuck level
- 512 KB snapshot size guard (HTTP 413)
- Canvas event audit log (`sage_canvas_events`)

### Phase 4 — Behaviour Profiles + Awareness Loop ✅ COMPLETE
- Participant presence monitoring (Ably presence events on draw channel)
- Profile selection logic: Tutor / Co-pilot / Wingman / Observer
- 10-second awareness loop (paused when tab hidden or profile is Observer)
- Profile transition logging to `sage_canvas_events`
- Profile colour indicator on Sage button and panel badge
- **Known gap:** Initial profile at activation always returns `'tutor'` — context-aware inference not yet wired

### Phase 5 — Session Drive ✅ COMPLETE
- Auto-calibration greeting (fires 3s after activation, tutor profile only)
- Phase sequencing: calibration → activation → loop → consolidation → wrap-up
- Message-count based phase transitions (thresholds: 3/8/11 — marked H2 for future quality-signal replacement)
- Session recap generation on deactivate

### Phase 6 — Tutor Co-pilot ✅ COMPLETE
- `sage:copilot:{sessionId}:{tutorId}` private Ably channel
- `CopilotWhisperOverlay` UI (whisper queue, max 2 visible, 60s auto-dismiss)
- Accept / dismiss actions with `dismissedCountRef` tracking
- Shape stamped as tutor attribution on accept (no Sage branding)
- Quiet-period guards (server-side): tutor active < 30s, dismissed ≥ 3, student not stuck
- Disconnect recovery via `GET /copilot/pending`

### Phase 7 — Lesson Plan Builder ✅ COMPLETE
- `POST /api/sage/lesson-plans/generate` — LLM plan generation
- `sage_lesson_plans` + `sage_lesson_plan_executions` DB tables
- `LessonPlanDrawer` — load, browse, advance phases
- `useLessonPlan` hook — `loadPlan`, `advancePhase`, execution tracking
- Plan types: intro, worked-example, guided-practice, independent-practice, check, consolidation, extension, recap

### Phase 8 — Multi-Student Intelligence ✅ COMPLETE (R&D / experimental)
- `useMultiStudentIntelligence` — per-student idle tracking
- Peer-learning detection heuristic (message length > 80 chars + other student idle > 30s)
- Individual student addressing in Sage system prompt
- Suppressed interventions during peer teaching
- **Status:** Heuristics not yet validated with live tutoring data — telemetry collection needed

---

## 17. Success Metrics

| Metric | Target |
|--------|--------|
| Sage activation rate in VirtualSpace sessions | > 40% of solo sessions |
| Student mastery improvement per VirtualSpace session | > 0.15 average delta |
| Stuck detection precision (correct interventions) | > 70% |
| Sage Pro conversion from VirtualSpace paywall | > 15% |
| Canvas write shapes stamped per session (Tutor profile) | 3–8 |
| Co-pilot suggestion acceptance rate by tutors | > 50% |
| Session drive completion rate (all 5 phases) | > 60% |
| Student model sync rate (whiteboard → sage_student_profiles) | 100% |
| Lesson plans generated per tutor per month | > 4 |
| Lesson plan execution completion rate | > 60% |
| Mastery improvement in plan-driven vs ad-hoc sessions | > 20% higher |
| Plan template reuse rate | > 30% |
| Peer teaching detection false positive rate | < 20% (to validate in Phase 8) |
| Co-pilot quiet-period false positive rate | < 15% (tutor wrongly silenced) |

---

## 18. Related Documentation

- [`sage-solution-design.md`](./sage-solution-design.md) — Core Sage architecture, student model, SM-2, subscription model
- [`sage-roadmap.md`](./sage-roadmap.md) — Sage feature roadmap
- VirtualSpace implementation: `apps/web/src/components/feature/virtualspace/`
- Sage VirtualSpace API routes: `apps/web/src/app/api/sage/virtualspace/`
- Lesson plan API routes: `apps/web/src/app/api/sage/lesson-plans/`
- DB migrations: `tools/database/migrations/418`, `420`, `421`

---

## 19. Future Roadmap

### Session Recording
Strategic gap — no competitor ships this in a tutoring context. Recording the full session (canvas state + Sage interactions) for async replay and review is high-value but requires significant storage architecture. Deferred to a dedicated design document.

### Embedded Subject Tools (Desmos / GeoGebra)
Live interactive tools (Desmos graphing calculator, GeoGebra geometry) draggable onto the canvas as embedded iframes. More powerful than static rendered shapes for GCSE/A-level maths. Requires iframe sandboxing and snapshot capture strategy.

### Guest / Magic Link Access
For `free_help` mode sessions: a magic link that drops the student directly into the whiteboard with no Tutorwise account required. Reduces the 30–60 second signup friction at the moment of highest student intent.

### Gamification on Whiteboard
XP and badge awards surfaced during VirtualSpace sessions — e.g. awarding a "First Correct Solution" badge directly in the session. Deferred; would dilute the tutoring focus in v1.

### Quota Pooling for Teams
Organisations pooling Sage quota across their tutors. Complex billing logic — deferred.

---

## 20. Known Gaps & Open Issues

| Ref | Severity | Description | Resolution |
|-----|----------|-------------|------------|
| G1 | High | `[CANVAS]` parser has no unit tests for 3 edge cases: wrong field names, markdown code-fence wrapping, multiple blocks with second dropped | Add Jest tests in `canvasBlockParser.test.ts` before marking Phase 2 fully hardened |
| G2 | Medium | Profile inference at activation always returns `'tutor'` regardless of booking context or participant presence | Wire context-aware `inferProfile()` logic using booking data and Ably presence snapshot at activation time |
| G3 | Medium | `SessionRecap.misconceptionsLogged` is always empty — no extraction logic in deactivate route | Add LLM-based misconception extraction to the recap generation prompt |
| G4 | Low | Stuck detector thresholds (25/60/120s) differ from original design (30/75/150s) — intentional calibration or unreviewed drift? | Confirm with product owner; update design or code to match |
| G5 | Low | Multi-student peer-teaching heuristics not validated with live tutoring data | Collect telemetry (log `peerTeachingDetected` events) and validate precision/recall before Phase 8 is considered production-ready |
| G6 | Low | Phase transition thresholds (3/8/11 assistant messages) are message-count based — planned replacement with quality signals | H2: replace with consecutive-correct-response counter and explicit topic completion signals |

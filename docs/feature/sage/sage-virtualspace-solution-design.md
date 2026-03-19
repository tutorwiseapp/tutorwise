# Sage × VirtualSpace Solution Design
**AI Tutor Intelligence Layer for the Collaborative Whiteboard**
**Version:** 1.2
**Created:** 2026-03-19
**Updated:** 2026-03-19 — v1.1: 12 design review issues addressed
           2026-03-19 — v1.2: competitor research integrated — post-session recap (§8.6),
           guest access / magic link (§19), PNG canvas snapshot fix (§14),
           [CANVAS] parser validation spec (Phase 2), session recording strategic gap (§20),
           Desmos/GeoGebra / gamification / quota pooling in Future Roadmap (§20)
**Status:** Design — Approved for Implementation
**Owner:** Michael Quan

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
14. [API Specification](#14-api-specification) — includes `useSageVirtualSpace` hook contract
15. [Database Schema](#15-database-schema)
16. [Implementation Phases](#16-implementation-phases)
17. [Success Metrics](#17-success-metrics)
18. [Related Documentation](#18-related-documentation)
19. [Guest Access — No-Login Student Join](#19-guest-access--no-login-student-join)
20. [Future Roadmap](#20-future-roadmap)

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
7. **Vision over JSON** — Canvas observation uses SVG export sent to a vision model. JSON store snapshot tells you what tool-stamped shapes exist. It tells you nothing about freehand working — the most educationally valuable signal.
8. **Respect the human tutor** — In sessions with an active human tutor, Sage is a whisper in their ear, not a voice in the room. The human tutor remains the tutor.
9. **Never overwrite student work** — Sage uses spatial intelligence to find whitespace. It never accidentally covers a student's working.
10. **Protect peer learning** — When Sage detects one student explaining to another, it steps back. Organic peer learning is more valuable than AI intervention.

---

## 3. Sage as a Session Participant

Sage joins the session as a named participant in the Ably channel. It:

- Appears in the participant count
- Has its own `userId` (`sage-ai`) in the session
- Is visible in the participants list with a clear AI badge
- Attributes its canvas stamps to itself (visually distinct — dashed border, Sage teal colour)
- Can be removed from the session by the session owner at any time

When Sage stamps a shape, other participants see it attributed to Sage — the same way they see shapes from other human participants. This establishes trust and transparency. Students know Sage is there and what it contributes.

### Ably Channels

| Channel | Purpose |
|---------|---------|
| `virtualspace:{sessionId}` | Main draw channel — all participants including Sage |
| `session:virtualspace:{sessionId}` | Session events (chat, reactions, timer) |
| `sage:copilot:{sessionId}:{tutorId}` | Private whisper channel — Sage → human tutor only |

---

## 4. Behaviour Profiles

Sage automatically selects and shifts between four behaviour profiles based on session signals. These are internal — the user never sees or selects them.

### 4.1 Tutor Profile
**When:** Solo student session, no human tutor present.

Sage is the tutor. It drives the session — explains concepts, stamps worked examples, asks probing questions, waits for student response, observes their working, gives feedback, and advances through a lesson plan. It uses the student's model (mastery scores, known misconceptions, SM-2 due topics) to pick the right topic and difficulty.

### 4.2 Co-pilot Profile
**When:** Human tutor is actively present and interacting (recent canvas activity or chat messages from tutor within last 90 seconds).

Sage whispers suggestions to the tutor via the private co-pilot channel. It does not address the student directly unless asked by the tutor. Suggestions are brief and actionable: *"Student's error is on step 3 — wrong sign. Suggest annotating directly."* The tutor can accept (one tap → Sage stamps, attributed to tutor) or dismiss.

### 4.3 Wingman Profile
**When:** Human tutor is present in the session but has been idle for 3+ minutes (no canvas or chat activity).

The human tutor is in the room but not actively teaching — perhaps the student is working independently. Sage quietly supports the student: answers questions, offers hints on request, but does not take over. It defers if the tutor re-engages.

### 4.4 Observer Profile
**When:** Student is actively working — recent canvas marks, recent chat, short idle time.

Sage watches silently. It is present and ready but does not intervene. This is the default state immediately after a student starts working. Sage builds up its picture of what the student is doing before acting.

### Profile Transition Logic

```
Session start
  → Any human tutor present and active?
      Yes → Co-pilot profile
      No  → Tutor profile (Observer sub-state — Sage builds context first)

During session:
  Human tutor active (< 90s since last action) → Co-pilot
  Human tutor idle  (90s–3min)                 → Wingman
  Human tutor idle  (> 3min) OR absent         → Tutor
  Student actively working (< 25s idle)        → Observer (within Tutor/Wingman)
  Stuck signal threshold reached               → Active intervention
```

---

## 5. Situational Awareness Loop

Sage maintains a continuous awareness loop, reading signals and deciding how to respond. The loop runs on a 10-second tick while the session is active.

#### Loop Pause Conditions

The awareness loop is **paused** (tick suspended) when:

| Condition | Why |
|-----------|-----|
| Browser tab is hidden (`document.visibilityState === 'hidden'`) | User is not watching; polling wastes battery and may conflict with Ably on mobile |
| Sage is in Observer profile and no stuck signals are accumulating | No action possible — save the tick |
| Sage panel is closed (user has dismissed it) | Panel-close is an explicit signal to step back |

The loop **resumes immediately** on `visibilitychange` to `visible` or on any new canvas activity from the student. The idle timer accumulator is **not reset** on tab hide — the seconds since last student action continue counting so stuck detection remains accurate when the user returns.

### Signal Sources

| Source | Signal | How read |
|--------|--------|----------|
| Session metadata | `session_type`, `booking_type`, `subject`, `level` | Resolved at activation |
| Participant state | Who is present, tutor active/idle | Ably presence events |
| Canvas state | What shapes exist, student's recent marks | tldraw store subscription |
| Chat history | Questions asked, topics covered, who said what | Session channel messages |
| Student model | Mastery scores, SM-2 due topics, misconceptions | `sage_student_profiles` |
| Idle timer | Seconds since last student canvas or chat action | Client-side timer |
| Erase patterns | Repeated erase + redraw of same region | Store change events |
| Freehand velocity | Pen stroke speed and confidence | Canvas snapshot analysis |
| Vision analysis | What the student actually drew | SVG export → vision model |

### Subject and Topic Inference

Sage does not ask the student what subject they are studying. It infers from:

1. **Booking data** — if the session is linked to a booking, the booking's `service_name` and subject tags are the primary signal
2. **Canvas content** — math equation shapes → maths; circuit shapes → physics; fraction bars → KS1-KS3 maths
3. **Chat language** — "solve for x", "photosynthesis", "World War 2" → subject detection via existing Sage curriculum resolver
4. **Student model** — the student's active curriculum subjects from `sage_student_profiles`
5. **Session title** — fallback

Once inferred, Sage uses the full curriculum resolver to load the correct topic context, exam board alignment, and difficulty calibration.

---

## 6. Stuck Detection Engine

Sage detects when a student is stuck and intervenes at the right moment. Signals are weighted and combined into a stuck score. Intervention triggers at defined thresholds.

### Signal Weights

| Signal | Weight | Notes |
|--------|--------|-------|
| Idle > 25s with incomplete work visible | Low | Could just be thinking |
| Idle > 60s | Medium | |
| Idle > 120s | High | |
| Repeated erase + redraw of same area (≥2 times) | Medium | Active struggle |
| Same wrong answer stamped twice | High | Pattern of error |
| Student types "?" in chat | Medium | Implicit question |
| Student types "I don't understand" / "idk" / "help" | Immediate | Explicit |
| Freehand strokes slowing and shortening (hesitation) | Low | |
| Vision model: incomplete or incorrect working detected | High | On observe trigger |

### Intervention Levels

| Stuck Score | Sage Response |
|-------------|--------------|
| Low | Pulse the Sage button gently — "need a hint?" indicator |
| Medium | Sage asks one open probing question in the chat panel: *"What have you tried so far?"* |
| High | Sage stamps a scaffold or partial worked example in the Sage zone, adjacent to the student's attempt |
| Immediate | Sage responds directly and fully in chat, with canvas support if needed |

Sage never interrupts a student who is actively making progress. The observer sub-state suppresses interventions while the idle timer is below 25 seconds.

---

## 7. Canvas Intelligence

### 7.1 Canvas Observation — Vision Model

Canvas observation uses tldraw's image export, not JSON store snapshot. It captures everything: freehand pen strokes, tool-stamped shapes, text — the full visual truth of what is on the board including all handwritten working.

#### Export Strategy — Bounded PNG, Not Raw SVG

Raw SVG exports of a dense whiteboard can be 500 KB–2 MB, which creates three problems: request body size limits, latency on mobile connections, and vision model token cost (billed on image dimensions). The export pipeline instead uses:

1. **Crop to viewport** — `editor.toImage({ bounds: editor.getViewportPageBounds(), format: 'png' })` exports only the visible area, not the full infinite canvas
2. **Resolution cap** — max 1280 × 720 px equivalent (scale factor adjusted to fit); for a typical 1920px-wide canvas zoomed to 100%, this is roughly half-resolution
3. **PNG not SVG** — PNG is smaller for dense freehand content and is universally supported by vision model APIs; SVG is only preferred for pure vector diagrams with no freehand strokes

Resulting size: typically 80–200 KB for a full but not pathologically dense session. Sent as a base64 data URI in the request body; the route validates size ≤ 512 KB and rejects otherwise with a `canvas_too_large` error (client falls back to text-only mode).

The observation prompt is:

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
- **Manually** — "Ask Sage to review my work" button in the Sage panel
- **Automatically** — when the stuck score reaches Medium or above
- **By session drive** — after each practice problem phase

### 7.2 Canvas Write — Smart Stamping

When Sage generates a response that includes visual content, it embeds structured canvas blocks in its output:

```
[CANVAS]
{
  "type": "math-equation",
  "latex": "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}",
  "label": "Quadratic Formula",
  "zone": "sage"
}
[/CANVAS]

The quadratic formula gives us both solutions at once. Notice the ± — that's what gives us two answers...
```

The `SageCanvasWriter` component (rendered inside tldraw's `InFrontOfTheCanvas` slot, giving it `useEditor()` access) strips canvas blocks from the stream and executes them. The text renders in the Sage panel. The shapes stamp on the canvas. One response, two outputs, perfectly synchronised.

#### Stream Split — Handoff Between Panel and Writer

The stream passes through `SagePanel` first. `SagePanel` holds the SSE reader and passes shape commands down via a shared React context (`SageVirtualSpaceContext`):

```typescript
interface SageVirtualSpaceContext {
  pendingShapes: CanvasCommand[];        // commands queued for SageCanvasWriter
  dispatchShape: (cmd: CanvasCommand) => void;
}
```

`SagePanel` maintains a `canvasBuffer` string alongside the text buffer. As SSE chunks arrive:

1. Append chunk to both `textBuffer` and `canvasBuffer`
2. Scan `canvasBuffer` for a complete `[CANVAS]...[/CANVAS]` block
3. If a **complete block** is found: strip it from the displayed text, parse the JSON, call `dispatchShape()`
4. If a **partial block** is found (opening `[CANVAS]` without closing): hold the partial block in a `pendingBlock` ref — do not render it as text
5. The partial is never shown to the user — it only resolves once `[/CANVAS]` arrives in a future chunk

`SageCanvasWriter` subscribes to `pendingShapes` via the context and executes each command with `useEditor()` as they arrive. This gives smooth progressive stamping — shapes appear while the text is still streaming.

**Supported shape types Sage can stamp:**
- `math-equation` — LaTeX equation
- `graph-axes` — plotted graph with labelled axes and curve
- `number-line` — number line with marked values
- `fraction-bar` — fraction bar representation
- `annotation` — annotation arrow pointing to a specific canvas coordinate
- `protractor` — angle measurement tool
- `unit-circle` — unit circle with labelled angles
- `venn-diagram` — Venn diagram with labelled sets
- `timeline` — historical or process timeline
- `text-block` — plain text box (for definitions, notes, worked steps)

### 7.3 Spatial Intelligence — No Hard Zone

Sage does not use a fixed zone. It reads the live canvas layout before every stamp:

1. Get the current viewport bounds from `editor.getViewportPageBounds()` — **shapes outside the viewport are ignored even if they exist in the store**
2. Query the tldraw store for all shapes whose bounding boxes intersect the viewport
3. Identify the student's working cluster (shapes with `meta.createdBy !== 'sage-ai'`)
4. Find the nearest whitespace within the viewport that does not overlap any existing shape
5. Place the new shape there with 24px clearance from the nearest edge

Constraining the search to viewport bounds prevents Sage from placing shapes in off-screen whitespace that is invisible to the student at the time of stamping. If no whitespace is found within the current viewport, Sage pans right (see below).

When annotating student work directly (e.g. circling an error), Sage uses a visually distinct style:
- Dashed border
- Sage teal colour (`#006c67`)
- `meta.sageAnnotation: true` — allows filtering Sage content separately

If the canvas is nearly full, Sage pans the viewport to find whitespace to the right of all existing content before stamping.

---

## 8. Session Drive — Adaptive Lesson Plan

When Sage is in Tutor profile with a fresh session (empty canvas, no prior interaction), it initiates a structured lesson rather than waiting to be asked.

### Lesson Plan Structure

```
Phase 1 — Calibration (1 exchange)
  Sage: Checks what the student wants to work on today.
  If booking → topic from booking context
  If standalone → infer from student model (SM-2 due topics)
  If uncertain → one direct question: "What are you working on?"

Phase 2 — Activation (1–2 exchanges)
  Sage stamps an opening question or prompt on canvas.
  "Have a go — show your working."
  Sage enters Observer sub-state.

Phase 3 — Observation & Feedback loop (n cycles)
  Student works → Sage observes (vision)
  → Correct: encouragement + next harder problem
  → Partially correct: targeted hint, stamp scaffold
  → Incorrect: identify specific error, stamp correction
  → Stuck: increment stuck score, trigger intervention

Phase 4 — Consolidation
  After 3 consecutive correct responses at target difficulty:
  Sage summarises what was learned.
  Updates student model (mastery score, SM-2 interval).
  Offers: go deeper, try a related topic, or finish.

Phase 5 — Wrap-up
  Sage stamps a summary "takeaway" box on canvas.
  Saves session to sage_sessions with surface: 'virtualspace'.
  Writes mastery update to sage_student_profiles.
```

### Adaptive Difficulty

At each cycle, Sage recalibrates difficulty based on:
- Student's current mastery score for this topic
- Number of consecutive correct/incorrect responses this session
- Time taken per problem (fast + correct → harder; slow + correct → same level)
- Student's explicit request ("make it harder" / "too hard")

### Post-Session Recap

When Sage deactivates (either by the student closing the panel or the session ending), it generates an async post-session recap. The recap is returned immediately in the deactivate response — the client does not wait for generation.

**Recap contents:**

```typescript
interface SessionRecap {
  topicsCovered: string[];
  misconceptionsLogged: string[];       // Specific errors Sage observed
  masteryDelta: number;                 // Net mastery change this session
  timeSpent: number;                    // Minutes
  strongMoments: string[];              // What the student did well (1–3 items)
  suggestedNextSteps: string[];         // What to work on next
  lessonPlanPrompt?: string;            // Pre-filled prompt for lesson plan upsell
}
```

The `lessonPlanPrompt` field is the entry point for the lesson plan system. If meaningful topics were covered, Sage pre-fills a natural language prompt: *"Create a follow-up lesson on quadratic equations, building on today's work — student has mastered factorising but needs more practice on the discriminant."* The student or tutor can accept this in one tap to generate and save a lesson plan.

**Delivery:** The recap appears in the Sage panel on session close. It is also saved to `sage_sessions.recap_json` (a new nullable JSONB column). Tutors can view past session recaps from the VirtualSpace session history page.

**Implementation note:** Recap generation is fire-and-forget — the `POST /api/sage/virtualspace/deactivate` route returns 200 immediately, then spawns the async LLM call. The client polls `GET /api/sage/virtualspace/recap/:sageSessionId` or receives a push via the session Ably channel once the recap is ready (typically 3–8 seconds).

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

### 9.2 Lesson Plan Structure

A lesson plan is a structured document with phases, activities, and optional canvas assets.

```typescript
interface LessonPlan {
  id: string;
  title: string;
  subject: CurriculumSubject;
  level: SageLevel;
  topic: string;
  examBoard?: ExamBoard;
  targetDuration: number;        // minutes
  targetMasteryDelta: number;    // expected mastery improvement
  difficulty: DifficultyLevel;
  createdBy: string;             // userId or 'sage-ai'
  createdFor?: string;           // studentId (optional)
  phases: LessonPhase[];
  tags: string[];
  isTemplate: boolean;           // reusable template vs single-use
  createdAt: string;
  updatedAt: string;
}

interface LessonPhase {
  id: string;
  name: string;
  type: 'intro' | 'worked-example' | 'guided-practice' | 'independent-practice'
      | 'check' | 'consolidation' | 'extension' | 'recap';
  duration: number;              // minutes
  instruction: string;           // what Sage says/does in this phase
  canvasAssets?: CanvasAsset[];  // shapes to stamp at phase start
  successCriteria: string;       // what "done" looks like
  adaptations?: {
    ifCorrect: string;           // advance instruction
    ifStruggling: string;        // fallback instruction
    scaffold?: CanvasAsset[];    // extra shapes to stamp if struggling
  };
}

interface CanvasAsset {
  type: string;                  // shape type
  data: Record<string, unknown>; // shape props
  label?: string;
}
```

### 9.3 Sage Generates a Lesson Plan

When a tutor or student asks Sage to create a lesson plan, Sage:

1. **Infers parameters** from the request — subject, level, topic, duration, student context
2. **Loads student model** (if a specific student is named) — mastery scores, known misconceptions, SM-2 due topics
3. **Queries the curriculum resolver** — loads all relevant topics, learning objectives, exam board requirements
4. **Generates the plan** — structured JSON with phases, timing, canvas assets, and adaptive branches
5. **Presents it conversationally** — Sage describes the plan in plain language first, then shows the structured detail
6. **Allows editing** — the tutor or student can say *"make the worked example longer"* or *"add a recap at the start"* and Sage revises

### 9.4 Sage Lesson Plan Chat Interface

The interaction is natural language. Sage handles the structure internally.

> *Tutor:* "Create a 45-minute lesson on the cosine rule for my year 11 student who's struggling with trigonometry"
>
> *Sage:* "Here's a lesson plan for the cosine rule, pitched at grade 4–5 level with extra scaffolding for trig concepts:
>
> **Cosine Rule — 45 min lesson**
> 1. Recap (5 min) — Quick review of Pythagoras and SOHCAHTOA to activate prior knowledge
> 2. Introduction (8 min) — When do we need the cosine rule? Non-right triangles. Stamp: labelled triangle diagram
> 3. Worked Example (12 min) — Full worked example finding a missing side. Stamp: step-by-step equation sequence
> 4. Guided Practice (10 min) — Student attempts a similar problem with scaffolding available
> 5. Independent Practice (8 min) — Two unsupported problems at grade 5 difficulty
> 6. Check & Consolidation (2 min) — Sage reviews student's working, summary stamp
>
> Want me to adjust the timing, add another worked example, or change the difficulty?"

### 9.5 Lesson Plan → VirtualSpace

A saved lesson plan can be loaded into a VirtualSpace session in two ways:

**Tutor loads a plan into a booking session:**
- Tutor selects the plan from their lesson plan library before or during the session
- Sage activates in Session Drive mode, executing the plan's phases
- Tutor can override any phase — Sage adapts in real time

**Student loads a plan for solo study:**
- Student selects a plan from their study plans
- Sage activates in Tutor profile, executing the plan
- Student works through the phases at their own pace

**Plan execution is adaptive** — Sage does not follow the plan rigidly. If a student masters the content faster than expected, Sage skips ahead. If they struggle, Sage inserts additional scaffolding phases from the plan's `adaptations` branches.

### 9.6 Lesson Plan Library

Lesson plans are stored and accessible from multiple surfaces:

| Surface | Access |
|---------|--------|
| Sage chat | *"Show my lesson plans"* → Sage lists and describes them |
| VirtualSpace session header | "Load Plan" button → plan picker drawer |
| Tutor's account page | Lesson Plans section — full management UI |
| Student's account page | Study Plans section — plans created for or by the student |
| Admin | Platform-level templates visible to all tutors |

### 9.7 Sharing & Templates

- Tutors can mark a lesson plan as a **template** — reusable across multiple students
- Templates can be shared with other tutors in the same organisation
- Platform-level templates (created by admin) appear in all tutors' libraries
- A plan created for a specific student is private to that tutor-student pair by default

### 9.8 Lesson Plan → Student Progress

Every lesson plan execution writes back to the student model:
- Which phases were completed
- Time spent per phase
- Mastery delta per topic
- Any phases that triggered the struggling adaptation branch
- SM-2 interval updates for topics covered

This makes the lesson plan system a closed feedback loop: Sage creates plans informed by the student model, executes them, then updates the student model with the results — making future plans more accurate.

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

**Rationale for tutor-activated exemption:** When a tutor enables Sage as a co-pilot in their booked session, they are offering Sage-enhanced tutoring as part of their service. They have paid for Sage Pro. The student benefits as an included part of the session — not from their own personal Sage allowance. This creates a meaningful differentiator for tutors: *"Book with me — AI-assisted sessions included."*

### Paywall Behaviour

**Quota is checked and decremented atomically.** The activation route calls `checkAIAgentRateLimit()` which uses the same Redis-backed atomic counter as the Sage chat route. If two sessions activate simultaneously (user's last remaining interaction), the atomic decrement ensures only one succeeds — the second receives a `quota_exhausted` response. This is the same race-condition protection already in place on the chat surface.

Sage checks quota before activating. If the student is at 0:
- Sage button shows an upgrade prompt instead of activating
- The prompt is contextual: *"You've used your 10 free sessions. Subscribe to Sage Pro to continue — your whiteboard and progress are saved."*

If a student hits 0 **mid-session**:
- Sage completes its current response (never cuts off mid-explanation)
- After completing, Sage says: *"That's your 10 free sessions — you've made great progress today. Subscribe to Sage Pro to keep going."*
- The canvas remains fully functional; only Sage's AI responses are gated

---

## 11. Multi-Student Sessions

### Per-Student Tracking

tldraw records shape authorship — every shape and stroke has creator metadata. Sage uses this to build a per-student model within the session:

- Which shapes and freehand strokes belong to which user
- Per-user idle timer and stuck signals (independent)
- Per-user conversation thread (Sage addresses individuals, not the group)
- Per-user mastery updates at session end

### Social Dynamic Detection

Sage detects organic peer learning — when one student is explaining to another — and steps back. This is the most valuable learning happening in the session and AI interruption would be harmful.

**Peer learning detected when:**
- Student A's chat messages are longer and more explanatory (teaching language)
- Student B's error rate on canvas is decreasing
- Student B's idle time between marks is decreasing (active engagement)

When peer teaching breaks down (Student A gives an incorrect explanation), Sage reframes rather than corrects: *"That's a good approach — let me add one thing..."* This preserves Student A's confidence while correcting the misconception.

### Addressing Individuals

Sage always addresses students by their display name when in a multi-student session:

> *"Hey [Name], I can see you tried the substitution approach here — let's look at step 2 together."*

Not a broadcast to the room.

---

## 12. Tutor Co-pilot Channel

### Private Whisper Channel

In Co-pilot profile, Sage communicates with the human tutor via a private Ably sub-channel: `sage:copilot:{sessionId}:{tutorId}`. The student never sees this channel.

### Whisper Format

Whispers are brief and actionable. Sage does not write essays to the tutor mid-session.

```
{
  "type": "suggestion",
  "urgency": "low" | "medium" | "high",
  "message": "Student confusing sine/cosine — unit circle diagram would help",
  "action": {
    "type": "stamp",
    "shape": { "type": "unit-circle", "label": "Unit Circle" }
  }
}
```

### Tutor Actions

The tutor sees a subtle whisper overlay at the bottom of their screen (outside the main canvas area). For each whisper:

- **Accept** (one tap) → Sage stamps the suggested shape, attributed to the tutor on the canvas
- **Dismiss** (swipe away) → Sage notes the dismissal and adjusts future suggestion frequency
- **Ask Sage** (text field in the whisper overlay) → tutor can ask Sage a direct question privately

### Whisper Persistence — Disconnect Recovery

Whispers sent to the private Ably channel are **also written to `sage_canvas_events`** (event_type: `copilot_suggestion`) at the moment of dispatch. This is a write-ahead pattern: if the tutor's Ably client disconnects mid-session (mobile network drop, tab refresh), whispers are not lost.

On reconnect, the tutor's client:
1. Fetches unactioned whispers from `GET /api/sage/virtualspace/copilot/pending?sessionId=...`
2. The route returns all `copilot_suggestion` events for this session that have no corresponding `copilot_accepted` or `copilot_dismissed` event in the last 5 minutes
3. The UI replays them in the whisper overlay

Whispers older than 5 minutes are silently discarded on replay — they are no longer contextually relevant to the live session.

### When Sage Goes Quiet

Sage suppresses co-pilot whispers when:
- The tutor has been actively typing in chat in the last 30 seconds (mid-explanation)
- The tutor has been actively stamping shapes in the last 30 seconds (mid-demonstration)
- The tutor has dismissed the last 3 suggestions (Sage recalibrates its suggestion threshold)

---

## 13. UI Design

### 13.1 Session Header — Sage Button

A single `Brain` icon button added to the VirtualSpace header, matching the style of the existing secondary buttons.

| State | Appearance |
|-------|-----------|
| Off | Grey, inactive |
| Activating | Pulsing blue ring (Sage is reading context, ~2s) |
| Active — Tutor | Solid teal (`#006c67`) |
| Active — Co-pilot | Solid purple (`#7c3aed`) |
| Active — Wingman | Solid amber (`#d97706`) |
| Active — Observer | Solid grey (`#64748b`) |
| Quota exhausted | Teal with lock icon |

The button label changes with state: "Sage" → "Sage (Tutor)" etc. on wider viewports.

### 13.2 Sage Panel

Slides in from the right when activated. Width: 320px. **The canvas does not resize — the Sage panel overlays.**

On a 13" laptop, 320px of canvas real estate is covered while Sage is active. Students who need the right side of the canvas (common for maths working) can **collapse the panel to a narrow strip** without deactivating Sage:

| State | Width | What shows |
|-------|-------|-----------|
| Expanded | 320px | Full chat + input |
| Collapsed | 44px | Brain icon + unread badge only |

The collapse toggle is a `‹` chevron in the panel header. Collapsed state persists across messages — new Sage messages trigger a subtle pulse on the strip, but the panel does not auto-expand. The student expands when ready.

Sage **remains active** in both states — the awareness loop, stuck detection, and canvas write continue regardless of panel width. The strip is a view preference, not a behavioural state change.

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

**No tabs.** Sage shows the most relevant content at any moment:
- During session drive: current lesson phase and progress
- During explanation: streaming response with embedded shape previews
- After observation: feedback on student's working
- During co-pilot: [hidden from student]

### 13.3 Canvas Attribution

Sage-stamped shapes are visually distinct:
- Dashed border (2px dashed `#006c67`)
- Small "Sage" label in the top-left corner of the shape
- Lower opacity than student shapes (0.85) until student interacts with them

When in co-pilot mode and the tutor accepts a Sage suggestion, the resulting shape uses the tutor's attribution style — no Sage branding. The student sees the tutor's content, not Sage's.

### 13.4 Quota Display

Remaining free interactions shown subtly in the Sage panel footer when below 5:

```
│  3 free sessions remaining — Upgrade to Pro  │
```

Not shown when student has Pro or is in a tutor's Sage-enabled session.

---

## 14. API Specification

### Client Hook — `useSageVirtualSpace`

`useSageVirtualSpace` is the primary client-side bridge between `VirtualSpaceClient`, the API routes, and the UI components. It lives at `apps/web/src/components/feature/virtualspace/hooks/useSageVirtualSpace.ts`.

```typescript
interface UseSageVirtualSpaceOptions {
  sessionId: string;        // VirtualSpace session UUID
  currentUserId: string;    // Supabase auth user ID
}

interface UseSageVirtualSpaceReturn {
  // State
  isActive: boolean;                       // Sage is activated and ready
  isActivating: boolean;                   // Activation in-flight
  profile: SageVirtualSpaceProfile | null; // 'tutor'|'copilot'|'wingman'|'observer'
  quotaRemaining: number | null;           // null = unlimited (Pro)
  quotaExhausted: boolean;
  messages: SageMessage[];                 // Full conversation thread
  isStreaming: boolean;                    // AI response currently streaming
  sageSessionId: string | null;            // sage_sessions.id for this surface session
  error: string | null;

  // Actions
  activate: () => Promise<void>;           // POST /activate, sets sageSessionId
  deactivate: () => void;                  // Clears local state, calls /deactivate
  sendMessage: (text: string) => Promise<void>;  // POST /message, streams response
  clearError: () => void;
}
```

`SagePanel` receives the full `UseSageVirtualSpaceReturn` object as a single `sage` prop. `VirtualSpaceClient` instantiates the hook and owns the lifecycle. `SageCanvasWriter` receives `pendingShapes` via the shared `SageVirtualSpaceContext` (not via the hook directly).

---

### New Routes

#### `POST /api/sage/virtualspace/activate`
Activates Sage for a VirtualSpace session. Checks quota, infers subject/topic, selects behaviour profile, creates or resumes Sage session record.

**Request:**
```json
{
  "sessionId": "uuid",
  "userId": "uuid"
}
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

#### `POST /api/sage/virtualspace/message`
Send a message to Sage in a VirtualSpace session. Streams response with optional canvas blocks.

**Request:**
```json
{
  "sageSessionId": "uuid",
  "message": "I don't understand step 2",
  "canvasSnapshot": "base64-png-string (optional — PNG exported via editor.toImage({ format: 'png', maxWidth: 1280 }))"
}
```
**Response:** Server-sent event stream
```
data: {"type":"text","content":"Let's look at step 2 together..."}
data: {"type":"canvas","shape":{"type":"math-equation","latex":"..."}}
data: {"type":"text","content":"Notice that when we expand the brackets..."}
data: {"type":"done","masteryDelta":0.1}
```

#### `POST /api/sage/virtualspace/observe`
Submit a canvas snapshot for Sage to observe and give feedback. Used by manual observe trigger and session drive loop.

**Request:**
```json
{
  "sageSessionId": "uuid",
  "canvasSnapshot": "base64-png-string",
  "trigger": "manual" | "stuck" | "session-drive"
}
```
**Response:** Streaming observation response (same format as `/message`)

#### `POST /api/sage/virtualspace/copilot`
Send a whisper to the tutor's co-pilot channel. Called by Sage's awareness loop, not by the client directly.

#### `POST /api/sage/virtualspace/copilot/accept`
Tutor accepts a Sage suggestion. Returns the shape spec to stamp.

#### `POST /api/sage/virtualspace/deactivate`
Deactivate Sage for the session. Writes final mastery updates, closes Sage session record.

#### `POST /api/sage/lesson-plans/generate`
Generate a lesson plan from a natural language request. Returns the structured plan for review before saving.

**Request:**
```json
{
  "prompt": "45-minute GCSE maths lesson on quadratic equations for a grade 5 student",
  "studentId": "uuid (optional — loads student model for personalisation)",
  "subject": "maths (optional — inferred if absent)",
  "level": "GCSE (optional — inferred if absent)"
}
```
**Response:**
```json
{
  "plan": { ...LessonPlan },
  "summary": "Plain language description of the plan",
  "estimatedMasteryDelta": 0.18
}
```

#### `POST /api/sage/lesson-plans`
Save a generated or manually created lesson plan.

#### `GET /api/sage/lesson-plans`
List lesson plans for the current user (created_by or created_for).

#### `PATCH /api/sage/lesson-plans/:id`
Update a lesson plan (title, phases, tags, status).

#### `POST /api/sage/lesson-plans/:id/load`
Load a lesson plan into a VirtualSpace session. Creates a `sage_lesson_plan_executions` record and activates Sage in Session Drive mode with the plan's phase sequence.

#### `PATCH /api/sage/lesson-plans/:id/executions/:executionId`
Update execution state. Supports mid-drive editing — tutor can pause execution, edit remaining phases, and resume.

**Request:**
```json
{
  "current_phase_index": 2,
  "status": "in_progress",
  "remaining_phases": [ ...updated LessonPhase[] from this index onward ]
}
```

When `remaining_phases` is provided, the server replaces phases from `current_phase_index` onward in the execution's `phases` column (the original plan is not mutated). Sage's drive loop reads the execution record, not the source plan, so the change takes effect on the next phase transition without restarting the session.

This is the mechanism for:
- Tutor pausing the drive mid-session ("hold on this phase")
- Tutor editing a later phase mid-execution ("make the next worked example harder")
- Sage adapting the plan in real time based on student performance (Sage calls this endpoint autonomously)

---

## 15. Database Schema

### New Column — `virtualspace_sessions`

```sql
ALTER TABLE virtualspace_sessions
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

### New Column — `sage_sessions`

```sql
ALTER TABLE sage_sessions
  ADD COLUMN surface TEXT DEFAULT 'chat'
    CHECK (surface IN ('chat', 'virtualspace', 'growth', 'ai_agent')),
  ADD COLUMN virtualspace_session_id UUID REFERENCES virtualspace_sessions(id);
```

> **Note:** The constraint includes `'growth'` and `'ai_agent'` now to avoid a future `ALTER TABLE` when the Growth Agent and AI Agent Studio surfaces are logged. The `virtualspace_session_id` FK is only populated when `surface = 'virtualspace'`; it is null for all other surfaces.

These schema changes also require a TypeScript update to `apps/web/src/lib/virtualspace/index.ts` (or wherever `VirtualSpaceSession` is typed). The `virtualspace_sessions` row type needs `sage_config: SageConfig | null` added. Phase 1 implementation steps must include this type update — the migration alone is not sufficient.

All existing Sage tables (`sage_sessions`, `sage_student_profiles`, `sage_usage`) work as-is. The whiteboard is just another surface feeding the same records.

### New Table — `sage_lesson_plans`

```sql
CREATE TABLE sage_lesson_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  subject           TEXT NOT NULL,
  level             TEXT NOT NULL,
  topic             TEXT NOT NULL,
  exam_board        TEXT,
  target_duration   INTEGER NOT NULL,             -- minutes
  difficulty        TEXT NOT NULL,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  created_for       UUID REFERENCES profiles(id), -- specific student (nullable = template)
  phases            JSONB NOT NULL DEFAULT '[]',
  tags              TEXT[] DEFAULT '{}',
  is_template       BOOLEAN DEFAULT FALSE,
  organisation_id   UUID REFERENCES connection_groups(id), -- for org-level sharing
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tutor's plan library
CREATE INDEX idx_sage_lesson_plans_created_by ON sage_lesson_plans(created_by);
-- Index for student's assigned plans
CREATE INDEX idx_sage_lesson_plans_created_for ON sage_lesson_plans(created_for);
-- Index for template discovery
CREATE INDEX idx_sage_lesson_plans_template ON sage_lesson_plans(is_template) WHERE is_template = TRUE;
```

### New Table — `sage_lesson_plan_executions`

Links a lesson plan to its execution in a VirtualSpace session.

```sql
CREATE TABLE sage_lesson_plan_executions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id            UUID NOT NULL REFERENCES sage_lesson_plans(id),
  sage_session_id           UUID NOT NULL REFERENCES sage_sessions(id),
  virtualspace_session_id   UUID NOT NULL REFERENCES virtualspace_sessions(id),
  student_id                UUID NOT NULL REFERENCES profiles(id),
  current_phase_index       INTEGER DEFAULT 0,
  status                    TEXT DEFAULT 'in_progress' CHECK (status IN (
                              'in_progress', 'completed', 'abandoned'
                            )),
  mastery_delta             NUMERIC(4,3),          -- actual mastery improvement
  phases_completed          INTEGER DEFAULT 0,
  phases_struggled          INTEGER DEFAULT 0,     -- phases that triggered struggling branch
  started_at                TIMESTAMPTZ DEFAULT NOW(),
  completed_at              TIMESTAMPTZ
);
```

### New Table — `sage_canvas_events`

Audit log of Sage's canvas actions. Used for analytics and session replay.

```sql
CREATE TABLE sage_canvas_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sage_session_id       UUID NOT NULL REFERENCES sage_sessions(id),
  virtualspace_session_id UUID NOT NULL REFERENCES virtualspace_sessions(id),
  event_type            TEXT NOT NULL CHECK (event_type IN (
                          'stamp', 'observe', 'annotation', 'copilot_suggestion',
                          'copilot_accepted', 'copilot_dismissed'
                        )),
  shape_type            TEXT,
  shape_data            JSONB,
  observation_trigger   TEXT,
  observation_feedback  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 16. Implementation Phases

### Phase 1 — Foundation (Sage Panel + Basic Chat)
- Sage button in VirtualSpace header
- Sage panel slides in with chat interface
- Quota check on activation
- Sage session record created (surface: 'virtualspace')
- Student model loaded on activation
- Text-only responses (no canvas write yet)
- Manual deactivation
- DB migrations: `sage_sessions.surface`, `virtualspace_sessions.sage_config`

### Phase 2 — Canvas Write
- `SageCanvasWriter` component inside `InFrontOfTheCanvas`
- `[CANVAS]` block parsing in streaming response
- Spatial intelligence — bounding box query before stamp
- Shape attribution styling (dashed teal border, "Sage" label)
- All 10 supported shape types
- `/api/sage/virtualspace/message` with canvas block streaming

**[CANVAS] Parser Validation — required before full build:**
> Prototype the `[CANVAS]` block extraction against ≥20 real streaming responses from xAI Grok and Gemini before writing the production `SageCanvasWriter`. Three confirmed failure modes to guard against:
> 1. **Wrong field names** — LLM emits valid JSON but uses `shape_type` instead of `type`, or `text_content` instead of `text`. Parser must validate required fields and emit a warning (not throw) on unknown keys.
> 2. **[CANVAS] inside a code fence** — LLM wraps the entire block in ` ```json ... ``` ` when explaining a concept. Parser must detect and skip `[CANVAS]` blocks that appear inside markdown code fences.
> 3. **Multiple blocks, second dropped** — Stream split logic buffers until `[/CANVAS]` is found; if the response contains two blocks, the `pendingBlock` ref must be reset after the first block is dispatched or the second block is silently lost. Covered by a unit test.

### Phase 3 — Canvas Observe
- SVG export trigger (manual "Review my work" button)
- `/api/sage/virtualspace/observe` route with vision model
- Stuck detection engine (idle timer + erase pattern signals)
- Automatic observe on stuck score threshold
- Observation feedback rendered in Sage panel

### Phase 4 — Behaviour Profiles + Awareness Loop
- Participant presence monitoring (Ably presence events)
- Profile selection logic (Tutor / Co-pilot / Wingman / Observer)
- Profile state indicator on Sage button
- Awareness loop (10s tick)
- Profile transition triggers
- `sage_canvas_events` table and logging

### Phase 5 — Session Drive
- Adaptive lesson plan runner
- Subject/topic inference from canvas + booking + student model
- Phase sequencing (Calibration → Activation → Loop → Consolidation → Wrap-up)
- Mastery update on session completion
- SM-2 scheduling integration

### Phase 6 — Tutor Co-pilot
- `sage:copilot:{sessionId}:{tutorId}` private Ably channel
- Whisper overlay UI (tutor-only)
- Accept / dismiss actions
- Shape stamped as tutor attribution on accept
- Sage quiet-period logic (suppress whispers mid-explanation)

### Phase 7 — Lesson Plan Builder
- `POST /api/sage/lesson-plans/generate` — LLM-powered plan generation from natural language
- `sage_lesson_plans` + `sage_lesson_plan_executions` DB tables
- Lesson plan save, edit, library management
- "Load Plan" button in VirtualSpace session header
- Tutor lesson plan library in account page
- Student study plan view in account page
- Organisation template sharing
- Execution tracking and mastery delta writebacks
- `PATCH /executions/:id` for mid-drive pause and phase editing

### Phase 8 — Multi-Student Intelligence *(R&D — exploratory)*
> **Note:** Peer learning detection is experimental. Social dynamic inference from canvas authorship and message language patterns has not been validated in a live tutoring context. This phase should be treated as an R&D sprint with defined success criteria before committing to full implementation — not a standard feature sprint.

- Per-student canvas attribution from tldraw store
- Per-student stuck signals (independent timers per userId)
- Peer learning detection (teaching language + improving error rate)
- Individual addressing in Sage responses
- Peer-teach correction framing (reframe, not correct)

---

## 17. Success Metrics

> **Note on Phase 1 metrics:** Activation rate and mastery delta targets are directional — the actual baselines are unknown until Phase 1 ships and produces data. The targets below should be reviewed and updated after 4 weeks of live Phase 1 data before being used as success gates for Phase 2+.

| Metric | Target |
|--------|--------|
| Sage activation rate in VirtualSpace sessions | Baseline in Phase 1; target > 40% by Phase 3 |
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
| Plan template reuse rate (tutor reuses a saved plan) | > 30% |

---

## 18. Related Documentation

- [`sage-solution-design.md`](./sage-solution-design.md) — Core Sage architecture, student model, SM-2, subscription model
- [`sage-roadmap.md`](./sage-roadmap.md) — Sage feature roadmap
- VirtualSpace implementation: `apps/web/src/components/feature/virtualspace/`
- Sage implementation: `apps/web/src/lib/sage/` (pending Phase 1 Sage Curriculum Expansion)
- Conductor integration: `conductor/conductor-solution-design.md` — PlatformUserContext feeds Sage session initialisation

---

## 19. Guest Access — No-Login Student Join

**Goal:** Remove the authentication barrier for students trying VirtualSpace for the first time. A student who receives a magic link should be able to join a session, experience Sage in VirtualSpace, and convert to a registered account — without being forced to create an account before they've seen the product.

This is a **product marketing and conversion feature**, not a free-help feature. The frame is: "try the product before you commit" — same as any modern SaaS trial flow.

### How It Works

1. **Tutor generates a magic link** from the VirtualSpace session header — a time-limited, session-scoped join token (e.g. `tutorwise.com/join/vs/{token}`).
2. **Student clicks the link** — lands on a branded join page with session context (subject, tutor name, session title). No account required.
3. **Guest session is created** — a temporary guest identity (`guest_{uuid}`) is scoped to the session. Ably receives the guest as a named participant. tldraw shapes are attributed to the guest name (e.g. "Alex (guest)").
4. **Sage is available** — Sage joins with Wingman profile (student-only session). The guest student experiences the full Sage chat and canvas write. Quota is drawn from the tutor's allowance, not the guest's (guest has no account).
5. **Convert prompt on exit** — when the session ends or the guest tries to save their work, a conversion prompt appears: "Create a free account to save your progress and continue with Sage." Pre-fills email if provided at join.

### Constraints

- **Token expiry:** 24 hours from generation, or on session end — whichever is first.
- **Single use per student:** One token per invited student email address. Regenerable by the tutor.
- **Supabase RLS:** Guest sessions use a service-role-scoped server action for writes. Guest identity cannot read other users' data.
- **Ably auth:** Guest receives a short-lived Ably token capability scoped to the single channel. No access to co-pilot channel.
- **No persistent student model:** Guest session creates a transient `sage_sessions` record with `guest_id` populated but no `student_id`. Mastery delta is not persisted. On conversion, tutor can manually link the session to the new student account.
- **Conversion tracking:** `guest_conversions` event logged to `platform_events` on account creation from a guest join flow. Attribution to the originating session is preserved.

### Why Not Anonymous Access

Full anonymous access (no token) creates abuse vectors (quota drain, spam canvas). Magic link scopes the invite to a specific session, protects the tutor's quota, and preserves the conversion tracking chain.

### Implementation Notes

- New DB columns: `virtualspace_sessions.guest_join_token TEXT`, `virtualspace_sessions.guest_join_expires_at TIMESTAMPTZ`
- New API routes: `POST /api/virtualspace/[sessionId]/invite` (generate token), `GET /api/join/vs/[token]` (validate + create guest session)
- Sage activation route: accept `guestId` as alternative to authenticated `userId`; draw quota from session owner
- Phase: implement in Phase 3 (alongside Canvas Observe) — by then VirtualSpace + Sage are stable enough to demo to guests

---

## 20. Future Roadmap

Items identified during design review and competitor research that are **not in the current phase plan** — either because they require independent R&D spikes, carry significant complexity, or are lower priority relative to the core experience.

### Desmos / GeoGebra Embeds

**Status:** Roadmap — spike required before scheduling.

Interactive graphing (Desmos) and dynamic geometry (GeoGebra) are high-value for GCSE/A-Level maths and science. Pencil Spaces has spent years integrating these natively. The core challenge is not the embed itself — it is the two-way state sync: Sage needs to be able to write to the graph (plot a function, highlight a root) and read from it (observe what the student has drawn). This is a non-trivial iframe integration with postMessage-based graph state serialisation.

**Spike criteria:** Can Sage read a Desmos graph state as JSON, modify it, and write it back within a VirtualSpace canvas frame? Spike estimate: 3–5 days. Proceed to design if spike succeeds.

### Session Recording + AI Transcript

**Status:** Strategic gap — not currently planned.

Competitors including Bramble offer session recording with post-session AI-generated transcripts (key moments, misconceptions, revision suggestions). This is a material differentiator for parents who want to review sessions and for tutors who want to improve their teaching.

The gap is strategic: TutorWise currently has no session recording infrastructure (video/audio recording, storage, transcription pipeline). The post-session recap (§8.6) addresses the text-based intelligence gap but does not cover screen + audio recording.

**Path to close the gap:** Session recording is a separate infrastructure project (WebRTC recording, storage policy, transcription via Whisper or Google Speech). Sage's post-session recap can be a lightweight interim — once recording infrastructure exists, Sage can enhance its recap with transcript-grounded evidence (e.g. "At 14:32, the student said 'I don't get why you flip the sign'").

### Anti-Patterns — Explicitly Not Adopted

The following patterns were observed in competitors and explicitly rejected:

1. **Gamification in Sage VirtualSpace** — Points, badges, streaks, and leaderboards are appropriate in a standalone practice app (Duolingo, Quizlet). They are out of place in a live tutoring session where the relationship between student, tutor, and AI co-pilot should feel professional and focused. Gamification in VirtualSpace risks trivialising the session and distracting from learning. The mastery heatmap and SM-2 scheduling provide progression feedback without the psychological manipulation mechanics of gamification.

2. **Quota pooling across students** — Some platforms allow organisations to pool AI credits across students. This creates complex accounting, fairness disputes, and incentivises gaming (tutors hoarding quota, parents complaining about allocation). TutorWise's model is per-student subscription, which is simpler, fairer, and aligns incentives correctly.

3. **AI explanation as primary response** — Platforms like Numerade default to a full AI-generated explanation when a student asks a question. Sage's design principle is "guide, don't tell" for student personas. Giving the answer directly undermines the tutoring relationship and reduces learning retention. Sage should always scaffold, hint, and question — not lecture.

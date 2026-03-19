# Sage × VirtualSpace Solution Design
**AI Tutor Intelligence Layer for the Collaborative Whiteboard**
**Version:** 1.0
**Created:** 2026-03-19
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
14. [API Specification](#14-api-specification)
15. [Database Schema](#15-database-schema)
16. [Implementation Phases](#16-implementation-phases)
17. [Success Metrics](#17-success-metrics)
18. [Related Documentation](#18-related-documentation)

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

Canvas observation uses tldraw's SVG export, not JSON store snapshot. SVG captures everything: freehand pen strokes, tool-stamped shapes, text — the full visual truth of what is on the board including all handwritten working.

The SVG is sent to the vision-capable model in the AI provider chain (Grok 4 / Gemini) with an observation prompt:

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

1. Query the tldraw store for all existing shape bounding boxes
2. Identify the student's working cluster (shapes with `meta.createdBy !== 'sage-ai'`)
3. Find the nearest whitespace that does not overlap any existing shape
4. Place the new shape there with 24px clearance from the nearest edge

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

### When Sage Goes Quiet

Sage suppresses co-pilot whispers when:
- The tutor has been actively typing in chat in the last 30 seconds (mid-explanation)
- The tutor has been actively stamping shapes in the last 30 seconds (mid-demonstration)
- The tutor has dismissed the last 3 suggestions (Sage recalibrates its suggestion threshold)

---

## 13. UI Design

### 12.1 Session Header — Sage Button

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

### 12.2 Sage Panel

Slides in from the right when activated. Width: 320px. Sits alongside the canvas (canvas does not resize — Sage panel overlays).

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

### 12.3 Canvas Attribution

Sage-stamped shapes are visually distinct:
- Dashed border (2px dashed `#006c67`)
- Small "Sage" label in the top-left corner of the shape
- Lower opacity than student shapes (0.85) until student interacts with them

When in co-pilot mode and the tutor accepts a Sage suggestion, the resulting shape uses the tutor's attribution style — no Sage branding. The student sees the tutor's content, not Sage's.

### 12.4 Quota Display

Remaining free interactions shown subtly in the Sage panel footer when below 5:

```
│  3 free sessions remaining — Upgrade to Pro  │
```

Not shown when student has Pro or is in a tutor's Sage-enabled session.

---

## 14. API Specification

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
  "canvasSnapshot": "base64-svg-string (optional)"
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
  "canvasSnapshot": "base64-svg-string",
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
Update execution state (current phase, mastery delta, status).

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
  ADD COLUMN surface TEXT DEFAULT 'chat' CHECK (surface IN ('chat', 'virtualspace')),
  ADD COLUMN virtualspace_session_id UUID REFERENCES virtualspace_sessions(id);
```

This is the only schema change needed. All existing Sage tables (`sage_sessions`, `sage_student_profiles`, `sage_usage`) work as-is. The whiteboard is just another surface feeding the same records.

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

### Phase 8 — Lesson Plan Builder
- `POST /api/sage/lesson-plans/generate` — LLM-powered plan generation from natural language
- `sage_lesson_plans` + `sage_lesson_plan_executions` DB tables
- Lesson plan save, edit, library management
- "Load Plan" button in VirtualSpace session header
- Tutor lesson plan library in account page
- Student study plan view in account page
- Organisation template sharing
- Execution tracking and mastery delta writebacks

### Phase 7 — Multi-Student Intelligence
- Per-student canvas attribution from tldraw store
- Per-student stuck signals
- Peer learning detection
- Individual addressing in Sage responses

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
| Plan template reuse rate (tutor reuses a saved plan) | > 30% |

---

## 18. Related Documentation

- [`sage-solution-design.md`](./sage-solution-design.md) — Core Sage architecture, student model, SM-2, subscription model
- [`sage-roadmap.md`](./sage-roadmap.md) — Sage feature roadmap
- VirtualSpace implementation: `apps/web/src/components/feature/virtualspace/`
- Sage implementation: `apps/web/src/lib/sage/` (pending Phase 1 Sage Curriculum Expansion)
- Conductor integration: `conductor/conductor-solution-design.md` — PlatformUserContext feeds Sage session initialisation

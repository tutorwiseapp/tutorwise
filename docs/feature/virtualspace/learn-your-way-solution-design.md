# Learn Your Way — Workflow Selector & Execution Framework
**Feature:** Guided, framework-driven session workflows for Sage VirtualSpace
**Version:** 1.0
**Created:** 2026-03-22
**Status:** Planned — implementation pending
**Author:** Principal Product & Engineering Architecture

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Market Gap & Strategic Opportunity](#2-market-gap--strategic-opportunity)
3. [Vision & Slogan](#3-vision--slogan)
4. [Goals & Success Metrics](#4-goals--success-metrics)
5. [User Stories](#5-user-stories)
6. [Architecture Overview](#6-architecture-overview)
7. [Data Model](#7-data-model)
8. [Workflow Schema Specification](#8-workflow-schema-specification)
9. [Example Workflow Definitions](#9-example-workflow-definitions)
10. [User Selection Experience](#10-user-selection-experience)
11. [Runtime Behaviour](#11-runtime-behaviour)
12. [Sage AI Mode Integration](#12-sage-ai-mode-integration)
13. [Canvas Action System](#13-canvas-action-system)
14. [Conductor Integration](#14-conductor-integration)
15. [Parent Portal & Google Classroom Triggers](#15-parent-portal--google-classroom-triggers)
16. [SEN & Accessibility](#16-sen--accessibility)
17. [Tutor Controls & Override System](#17-tutor-controls--override-system)
18. [Component Specification](#18-component-specification)
19. [API Specification](#19-api-specification)
20. [Database Migrations](#20-database-migrations)
21. [Seed Data — Built-In Workflows](#21-seed-data--built-in-workflows)
22. [Implementation Roadmap](#22-implementation-roadmap)
23. [Open Questions](#23-open-questions)

---

## 1. Problem Statement

Every competitor virtual tutoring space — LessonSpace, LearnCube, PencilSpaces, LearnCube — is an **open canvas with a video call attached**. The session structure lives entirely in the tutor's head. There is no:

- Pre-defined session arc (warm-up → teach → practice → assess → recap)
- Learner agency over *how* the session runs, not just *what* it covers
- AI that changes its behaviour, tone, and scaffolding level phase-by-phase
- Themed or narrative wrapper that makes abstract maths concrete and motivating for a 13-year-old
- Automated transition from session → homework → parent report → next session preparation

The result: every session is a blank page. Quality depends entirely on tutor expertise and energy. There is no consistency, no progression framework, no between-session intelligence. Students disengage. Parents don't know what happened. Tutors reinvent the wheel every lesson.

---

## 2. Market Gap & Strategic Opportunity

### What competitors do (March 2026)

| Platform | Session Structure | AI Involvement | Learner Agency |
|---|---|---|---|
| LessonSpace | Open canvas, tutor-led | None in session | None |
| PencilSpaces | Open canvas, tutor-led | Enterprise add-on, no phase awareness | None |
| LearnCube | Open canvas, tutor-led | None | None |
| Khanmigo (standalone) | Fixed AI chat, no whiteboard | Script-following | Goal selection only |
| Tutorwise (current) | Open canvas, Sage available | Sage always-on, no phase structure | None |

**No platform in the market offers structured, workflow-driven sessions with phase-aware AI that the learner has agency over.**

### Why Tutorwise can build this now

The entire stack was built in exactly the right way:

| Requirement | Existing Component | Status |
|---|---|---|
| Phase state machine | Conductor `PlatformWorkflowRuntime` + LangGraph | ✅ Live |
| Per-phase AI behaviour | Sage `SageOrchestrator` with behaviour profiles | ✅ Live |
| Canvas actions per phase | tldraw + 29 custom ShapeUtils | ✅ Live |
| Session transition triggers | Conductor HITL + node handlers | ✅ Live |
| Post-session report + parent email | `session_report` JSONB + Resend | ✅ Live |
| Google Classroom push | `post-homework` API + token store | ✅ Live |
| Knowledge base per workflow | `platform_knowledge_chunks` RAG | ✅ Live |
| Analytics & mining | Conductor Phase 5 (conformance, patterns) | ✅ Live |

The missing layer is focused: **a VirtualSpace-specific workflow schema, a selection UI, and a phase bar.**

---

## 3. Vision & Slogan

**"Learn Your Way"**

Learners have maximum agency over every dimension of how they learn:

| Dimension | What the learner chooses |
|---|---|
| **Goal** | Diagnostic, topic mastery, exam simulation, quick revision, confidence building |
| **Style / Adventure** | Pirate map ratios, alien quadratic invasion, spy codebreaker, relaxed garden walk, casino probability heist |
| **AI involvement** | Sage leads teaching, Sage hints-only, Sage silent (human-only), hybrid co-teach |
| **Support depth** | Heavy scaffolding + visuals (SEN), standard guided, high-challenge minimal hints |
| **Pace** | Relaxed (SEN / exam anxiety), standard, sprint (exam crunch mode) |
| **Session length** | 20 min quick focus, 45 min standard, 60 min full paper simulation |

The experience should feel **magical, motivating, and personal** — the opposite of a blank canvas and a nervous tutor improvising.

---

## 4. Goals & Success Metrics

### Primary goals

1. **Reduce tutor preparation time** — tutor selects a workflow in 30 seconds instead of planning a lesson from scratch
2. **Improve learning outcomes** — structured phases with Sage reinforcement produce better retention than unstructured sessions
3. **Increase student engagement** — themed/narrative sessions increase time-on-task and reduce disengagement
4. **Create platform stickiness** — workflow library becomes a reason tutors and students choose and stay on Tutorwise
5. **Enable parent visibility** — automated phase-by-phase recap gives parents richer reporting than any competitor

### Success metrics

| Metric | Target (6 months post-launch) |
|---|---|
| % of sessions using a workflow | ≥ 40% of new sessions |
| Average session completion rate (all phases done) | ≥ 65% |
| Tutor NPS on "session preparation time" | +20 vs baseline |
| Student engagement score (Sage interactions per session) | +30% vs open sessions |
| Parent email open rate on workflow recap | ≥ 55% |
| Workflow library size | ≥ 25 built-in workflows at launch |

---

## 5. User Stories

### Student

> *As a Year 11 student preparing for GCSE Maths, I want to choose a themed session that makes quadratics feel like a game, so I can stay focused and not dread the topic.*

> *As a student with dyslexia, I want a session that goes slowly, uses lots of diagrams, and doesn't overwhelm me with text, so I can actually understand — not just copy.*

> *As a student doing last-minute GCSE revision, I want a 20-minute diagnostic sprint that finds my gaps and gives me a worksheet, so I know exactly what to practise before my exam.*

### Tutor

> *As a tutor with back-to-back sessions, I want to pick a ready-made workflow for ratio revision and start the session immediately, so I don't spend an hour planning the night before.*

> *As a tutor mid-session, I want to skip the warm-up phase because the student already understands it, so I don't waste time on content they've mastered.*

> *As a tutor who co-teaches with Sage, I want to set Sage to "hints-only" mode so I lead the teaching but Sage steps in when the student is stuck.*

### Parent

> *As a parent, I want to receive a summary after each session that tells me what my child covered, what they found difficult, and what homework was set — without having to ask the tutor.*

> *As a parent, I want to see the session's workflow theme in the report so I understand how my child was taught, not just what topics were covered.*

---

## 6. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEARN YOUR WAY FRAMEWORK                      │
│                                                                   │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐│
│  │ Workflow Library │    │         VirtualSpace Session         ││
│  │                 │    │                                      ││
│  │ session_        │    │  ┌─────────────────────────────────┐ ││
│  │ workflows table │    │  │     SessionPhaseBar             │ ││
│  │                 │    │  │  [Warm-Up]→[Teach]→[Practice]   │ ││
│  │ 25+ built-in    │    │  │  ⏱ 8:32  Phase 2 of 5  [Skip▶] │ ││
│  │ workflows       │    │  └─────────────────────────────────┘ ││
│  │                 │    │                                      ││
│  │ + tutor custom  │    │  ┌──────────────┐ ┌───────────────┐ ││
│  └────────┬────────┘    │  │  tldraw      │ │  Sage AI      │ ││
│           │             │  │  Canvas      │ │  Panel        │ ││
│           │             │  │              │ │               │ ││
│  ┌────────▼────────┐    │  │  [Canvas     │ │  Mode: TEACH  │ ││
│  │ WorkflowSelector│    │  │   actions    │ │               │ ││
│  │                 │    │  │   execute    │ │  "Let's split │ ││
│  │ Card grid       │    │  │   on phase   │ │  the treasure │ ││
│  │ Filters         │    │  │   start]     │ │  into 3..."   │ ││
│  │ Preview         │    │  └──────────────┘ └───────────────┘ ││
│  │ "Learn This Way"│    │                                      ││
│  └────────┬────────┘    └──────────────────────────────────────┘│
│           │                                                       │
│  ┌────────▼──────────────────────────────────────────────────┐  │
│  │              VirtualSpace Workflow Runtime                  │  │
│  │                                                             │  │
│  │  loadWorkflow() → initPhase() → evaluateTransition()       │  │
│  │  → advancePhase() → completeSession()                      │  │
│  │                                                             │  │
│  │  Fires Conductor events for observability + analytics       │  │
│  │  Injects Sage prompt templates per phase                    │  │
│  │  Executes canvas actions (stamp shapes, load templates)     │  │
│  │  Triggers: Google Classroom push, Parent Portal update      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Conductor (existing)                                        │ │
│  │  Receives workflow execution events for analytics/mining     │ │
│  │  Fires post-session: parent email, Classroom push, report   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key design decisions

1. **New lightweight `VirtualSpaceWorkflowRuntime`** — separate from `PlatformWorkflowRuntime`. Conductor workflows are admin-defined multi-day business processes. VirtualSpace workflows are tutor/student-selectable, session-length, template-rich. Conductor is used for observability and post-session triggers only.

2. **Workflow state lives in `virtualspace_sessions.workflow_state`** (JSONB) — current phase, timestamps, transitions. Synced via existing Ably session channel so both participants see the same phase.

3. **Sage mode injected per phase** — the `SageOrchestrator` system prompt is extended with the workflow's `sagePromptTemplate` for the current phase. No new Sage infrastructure needed.

4. **Canvas actions use the existing tldraw editor API** — `editor.createShape()`, `editor.stamp()`. New `executeCanvasAction()` helper wraps this.

---

## 7. Data Model

### `session_workflows` table

```sql
CREATE TABLE session_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,             -- shown on card (max 80 chars)
  theme JSONB NOT NULL,               -- { icon, colour, backgroundStyle, narrative }
  tags TEXT[] DEFAULT '{}',           -- ['gcse', 'maths', 'ratio', 'foundation', 'sen']
  exam_board TEXT DEFAULT 'any',      -- 'AQA' | 'Edexcel' | 'OCR' | 'any'
  subject TEXT DEFAULT 'maths',       -- 'maths' | 'science' | 'english' | 'any'
  level TEXT NOT NULL,                -- 'foundation' | 'higher' | 'SEN' | '11+' | 'primary'
  duration_mins INT NOT NULL,
  ai_involvement TEXT NOT NULL,       -- 'full' | 'hints' | 'silent' | 'co-teach'
  sen_focus BOOLEAN DEFAULT FALSE,
  phases JSONB NOT NULL,              -- array — see schema below
  learn_your_way JSONB DEFAULT '{}',  -- { freedoms, agencyPoints, bestFor }
  built_in BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_workflows_tags ON session_workflows USING GIN(tags);
CREATE INDEX idx_session_workflows_level ON session_workflows(level);
CREATE INDEX idx_session_workflows_subject ON session_workflows(subject);
```

### Columns added to `virtualspace_sessions`

```sql
ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES session_workflows(id),
  ADD COLUMN IF NOT EXISTS workflow_state JSONB;
  -- workflow_state: {
  --   currentPhaseIndex: number,
  --   phaseStartedAt: ISO string,
  --   phasesCompleted: string[],  -- phase ids
  --   transitions: [{ from, to, at, trigger }],
  --   sageMode: 'full' | 'hints' | 'silent' | 'co-teach',
  --   customisations: {}          -- tutor overrides applied
  -- }
```

---

## 8. Workflow Schema Specification

### Full phase object

```typescript
interface WorkflowPhase {
  id: string;                          // 'warm-up' | 'instruction' | 'practice' | etc.
  name: string;                        // "Warm-Up"
  icon: string;                        // emoji or lucide icon name
  durationMins: number;                // estimated (tutor can override)
  sageMode: 'full' | 'hints' | 'silent' | 'co-teach';
  sagePromptTemplate: string;          // injected into Sage system prompt for this phase
  sagePersona?: string;                // e.g. "You are Captain Sage, a wise pirate navigator..."
  canvasActions: CanvasAction[];       // executed on phase entry
  exitConditions: {
    minMasteryScore?: number;          // 0–100 from Sage assessment
    timeExpiredMins?: number;          // auto-advance after N mins
    tutorOverride: boolean;            // always true — tutor can always advance
    sageSuggestsReady?: boolean;       // Sage signals student is ready
  };
  narrative: string;                   // shown in phase bar tooltip / student view
  resources?: string[];               // knowledge chunk tags to load into Sage RAG
  homeworkEnabled?: boolean;           // can homework be set from this phase
}

interface CanvasAction {
  type: 'stamp_shape' | 'load_template' | 'clear_canvas' | 'add_text' | 'set_background';
  shape?: string;                      // shape type (for stamp_shape)
  templateId?: string;                 // pre-built tldraw template ID
  position?: 'center' | 'top-left' | 'top-right';
  props?: Record<string, unknown>;
}

interface WorkflowTheme {
  icon: string;                        // emoji e.g. '🏴‍☠️'
  colour: string;                      // hex — used for phase bar + card accent
  backgroundStyle: 'default' | 'dark' | 'grid' | 'dotted';
  narrative: string;                   // opening story paragraph
  cardImage?: string;                  // URL to illustration (Supabase Storage)
}

interface LearnYourWayMeta {
  freedoms: Array<'goal' | 'style' | 'support' | 'pace' | 'ai_involvement'>;
  agencyPoints: string[];              // e.g. ["Choose how fast Sage explains"]
  bestFor: string;                     // e.g. "Students who love storytelling + hands-on maths"
}
```

---

## 9. Example Workflow Definitions

### 9.1 Treasure Map Ratio Raid

```json
{
  "slug": "treasure-map-ratio-raid",
  "name": "Treasure Map Ratio Raid",
  "short_description": "Divide the treasure — master ratio & proportion with Captain Sage",
  "theme": {
    "icon": "🏴‍☠️",
    "colour": "#c2860a",
    "backgroundStyle": "dotted",
    "narrative": "Captain Sage has discovered a legendary treasure chest. But the crew can't agree on how to split the gold fairly. Only a student who masters ratio and proportion can save the voyage — and claim the biggest share."
  },
  "tags": ["maths", "ratio", "proportion", "11+", "gcse", "foundation", "year-7", "year-8"],
  "exam_board": "any",
  "subject": "maths",
  "level": "foundation",
  "duration_mins": 45,
  "ai_involvement": "full",
  "sen_focus": false,
  "phases": [
    {
      "id": "warm-up",
      "name": "Treasure Hunt Warm-Up",
      "icon": "🗺️",
      "durationMins": 5,
      "sageMode": "full",
      "sagePersona": "You are Captain Sage, a wise and encouraging pirate navigator. You speak with warmth and adventure. Every maths concept is a new sea to navigate. Keep explanations short, vivid, and tied to the treasure story.",
      "sagePromptTemplate": "Start with 3 quick mental maths questions framed as dividing gold coins: 'If 12 coins are shared between 3 pirates, how many each?' Scale up to ratio notation. Praise every answer. If wrong, say 'The sea is tricky — let me show you the map.'",
      "canvasActions": [
        { "type": "set_background", "backgroundStyle": "dotted" },
        { "type": "stamp_shape", "shape": "number-line", "position": "center" }
      ],
      "exitConditions": {
        "timeExpiredMins": 5,
        "tutorOverride": true
      },
      "narrative": "A quick warm-up to get your maths brain ready. Divide the first haul of coins!"
    },
    {
      "id": "instruction",
      "name": "The Ratio Map",
      "icon": "📜",
      "durationMins": 12,
      "sageMode": "full",
      "sagePersona": "You are Captain Sage. You are now teaching the student to read the treasure map — which is really a ratio problem. Use the fraction bar tool on the canvas to show splitting.",
      "sagePromptTemplate": "Teach ratio notation (a:b), simplifying ratios, and dividing quantities in a given ratio. Use the fraction bar shape on the canvas. Tie every example to dividing treasure, crew shares, map scales. Check for understanding after each concept before moving on.",
      "canvasActions": [
        { "type": "clear_canvas" },
        { "type": "stamp_shape", "shape": "fraction-bar", "position": "center" },
        { "type": "add_text", "props": { "text": "Ratio = fair shares 🏴‍☠️", "position": "top-left" } }
      ],
      "exitConditions": {
        "timeExpiredMins": 15,
        "tutorOverride": true,
        "sageSuggestsReady": true
      },
      "narrative": "Captain Sage reveals the secrets of the ratio map. Pay attention — the treasure depends on it!"
    },
    {
      "id": "practice",
      "name": "Claim Your Share",
      "icon": "⚔️",
      "durationMins": 15,
      "sageMode": "hints",
      "sagePromptTemplate": "Give the student 4 ratio problems of increasing difficulty. Do NOT solve them. Give one-sentence hints only if the student asks or is stuck for >60 seconds. Celebrate each correct answer with a pirate reference. After each question, briefly explain the method.",
      "canvasActions": [
        { "type": "clear_canvas" },
        { "type": "stamp_shape", "shape": "fraction-bar", "position": "top-left" }
      ],
      "exitConditions": {
        "minMasteryScore": 60,
        "timeExpiredMins": 18,
        "tutorOverride": true
      },
      "narrative": "Time to claim your share! Solve the ratio challenges and prove you're a true pirate mathematician."
    },
    {
      "id": "assessment",
      "name": "The Final Chest",
      "icon": "🪙",
      "durationMins": 8,
      "sageMode": "silent",
      "sagePromptTemplate": "Present 2 exam-style ratio questions. Do NOT help at all. When complete, reveal correct answers and mark each step. Give a mastery score out of 100. Identify one strength and one area to practise.",
      "canvasActions": [
        { "type": "clear_canvas" },
        { "type": "add_text", "props": { "text": "Final Challenge 🪙 — no hints this time!", "position": "top-left" } }
      ],
      "exitConditions": {
        "timeExpiredMins": 10,
        "tutorOverride": true
      },
      "narrative": "The final chest is locked. Only your own knowledge can open it — no hints!",
      "homeworkEnabled": true
    },
    {
      "id": "recap",
      "name": "Voyage Complete",
      "icon": "🏆",
      "durationMins": 5,
      "sageMode": "full",
      "sagePromptTemplate": "Summarise what was covered: ratio notation, simplifying, dividing quantities. Highlight 1–2 things the student did well and 1–2 things to practise. Suggest a homework task. Frame it as: 'You've navigated these seas well, sailor — here's your next voyage.'",
      "canvasActions": [],
      "exitConditions": {
        "tutorOverride": true,
        "timeExpiredMins": 5
      },
      "narrative": "Voyage complete! Captain Sage summarises your journey and prepares you for the next adventure."
    }
  ],
  "learn_your_way": {
    "freedoms": ["style", "ai_involvement", "support"],
    "agencyPoints": [
      "Choose how much Sage hints during practice",
      "Skip the warm-up if you already know your basics",
      "Tutor can pause Sage and take over at any point"
    ],
    "bestFor": "Students who love storytelling and want maths to feel like an adventure"
  }
}
```

---

### 9.2 Quadratics — Alien Invasion Exam Mode

```json
{
  "slug": "quadratics-alien-invasion",
  "name": "Quadratics — Alien Invasion",
  "short_description": "Defeat the alien fleet using quadratic equations and graphs — GCSE Higher",
  "theme": {
    "icon": "👾",
    "colour": "#6366f1",
    "backgroundStyle": "dark",
    "narrative": "An alien fleet has locked onto Earth's coordinates. The only weapon that can stop them? Quadratic equations. Each solved problem destroys a ship. Sage is your tactical AI — but you have to fire the equations yourself."
  },
  "tags": ["maths", "quadratics", "algebra", "graphs", "gcse", "higher", "year-10", "year-11", "exam-technique"],
  "exam_board": "any",
  "subject": "maths",
  "level": "higher",
  "duration_mins": 50,
  "ai_involvement": "hints",
  "sen_focus": false,
  "phases": [
    {
      "id": "mission-brief",
      "name": "Mission Brief",
      "icon": "📡",
      "durationMins": 3,
      "sageMode": "full",
      "sagePersona": "You are Tactical AI Sage, a calm and precise military intelligence system. Use precise language. Every quadratic concept is a targeting system component.",
      "sagePromptTemplate": "Quickly recap: factorising, completing the square, quadratic formula, and graph sketching. One sentence each. Ask the student which feels weakest — that's where we focus.",
      "canvasActions": [
        { "type": "set_background", "backgroundStyle": "dark" },
        { "type": "add_text", "props": { "text": "👾 ALIEN INVASION — TARGETING SYSTEMS ONLINE", "position": "top-left" } }
      ],
      "exitConditions": { "timeExpiredMins": 4, "tutorOverride": true },
      "narrative": "Tactical briefing — know your weapons before the fleet arrives."
    },
    {
      "id": "factorising",
      "name": "Destroy Fleet Alpha — Factorising",
      "icon": "🚀",
      "durationMins": 12,
      "sageMode": "hints",
      "sagePromptTemplate": "Give 3 factorising questions (simple → difference of squares → harder trinomials). Hint only: 'What two numbers multiply to give c and add to give b?' Show method on canvas after each answer. Exam tip: always check by expanding.",
      "canvasActions": [
        { "type": "clear_canvas" },
        { "type": "stamp_shape", "shape": "latex-equation", "position": "center" }
      ],
      "exitConditions": { "minMasteryScore": 70, "timeExpiredMins": 15, "tutorOverride": true },
      "narrative": "Fleet Alpha uses factorised quadratics as a shield. Break through it."
    },
    {
      "id": "graphs",
      "name": "Map the Fleet — Quadratic Graphs",
      "icon": "📈",
      "durationMins": 12,
      "sageMode": "hints",
      "sagePromptTemplate": "Sketch y = x² - 5x + 6 on the function plotter. Ask student to identify roots, vertex, y-intercept. Then give one transformation (y = (x-2)² + 1). Hint only if stuck >90s.",
      "canvasActions": [
        { "type": "clear_canvas" },
        { "type": "stamp_shape", "shape": "function-plotter", "position": "center" }
      ],
      "exitConditions": { "minMasteryScore": 65, "timeExpiredMins": 15, "tutorOverride": true },
      "narrative": "Plot the trajectory of the alien ships — they follow quadratic paths."
    },
    {
      "id": "exam-practice",
      "name": "Final Strike — Exam Questions",
      "icon": "💥",
      "durationMins": 18,
      "sageMode": "silent",
      "sagePromptTemplate": "Present 2 full GCSE Higher exam questions on quadratics (one algebraic, one graphical). Timed. No help. After both done, mark each step — identify method marks vs accuracy marks. Give exam technique tip.",
      "canvasActions": [
        { "type": "clear_canvas" },
        { "type": "add_text", "props": { "text": "FINAL STRIKE — exam conditions. No hints. 18 minutes.", "position": "top-left" } }
      ],
      "exitConditions": { "timeExpiredMins": 20, "tutorOverride": true },
      "narrative": "Exam conditions. One shot to destroy the command ship.",
      "homeworkEnabled": true
    },
    {
      "id": "debrief",
      "name": "Mission Debrief",
      "icon": "🏅",
      "durationMins": 5,
      "sageMode": "full",
      "sagePromptTemplate": "Give mastery score. Identify strongest and weakest method. Recommend one specific homework: 'Practise completing the square on 3 questions before next session.' Frame as mission debrief.",
      "canvasActions": [],
      "exitConditions": { "timeExpiredMins": 5, "tutorOverride": true },
      "narrative": "Mission debrief — what worked, what to sharpen before the next invasion."
    }
  ],
  "learn_your_way": {
    "freedoms": ["goal", "ai_involvement", "pace"],
    "agencyPoints": [
      "Choose exam board version of questions",
      "Tutor can extend exam practice phase for more drilling",
      "Sage silent during exam phase — full exam conditions"
    ],
    "bestFor": "Year 10/11 students preparing for GCSE Higher who want exam technique + engagement"
  }
}
```

---

### 9.3 SEN Visual-First Relaxed Mastery

```json
{
  "slug": "sen-visual-first-mastery",
  "name": "Visual-First Relaxed Mastery",
  "short_description": "Step-by-step visual learning at your own pace — no pressure, just understanding",
  "theme": {
    "icon": "🌱",
    "colour": "#10b981",
    "backgroundStyle": "grid",
    "narrative": "Every learner finds their own path through the forest. We'll use pictures, diagrams, and as much time as you need. There's no race — just growth."
  },
  "tags": ["sen", "visual", "relaxed", "any-topic", "scaffolded", "dyslexia", "anxiety", "any-level"],
  "exam_board": "any",
  "subject": "any",
  "level": "SEN",
  "duration_mins": 40,
  "ai_involvement": "full",
  "sen_focus": true,
  "phases": [
    {
      "id": "check-in",
      "name": "How Are You Feeling?",
      "icon": "😊",
      "durationMins": 3,
      "sageMode": "full",
      "sagePersona": "You are Sage, a calm and patient tutor. Never rush. Use short sentences. Never use more than 3 lines of text at once. Always ask 'Does that make sense so far?' before moving on.",
      "sagePromptTemplate": "Start with a gentle check-in: 'On a scale of 1-5, how confident do you feel about [topic] today?' Based on their answer, adjust your pace and scaffolding. If they say 1-2, begin at the very beginning with a visual analogy.",
      "canvasActions": [
        { "type": "set_background", "backgroundStyle": "grid" }
      ],
      "exitConditions": { "timeExpiredMins": 5, "tutorOverride": true },
      "narrative": "We always start by checking how you feel. Your comfort matters most."
    },
    {
      "id": "visual-intro",
      "name": "The Picture First",
      "icon": "🖼️",
      "durationMins": 10,
      "sageMode": "full",
      "sagePromptTemplate": "Introduce the concept using ONLY visual analogies and diagrams. Use the fraction bar, number line, or Venn diagram shape on the canvas. No algebraic notation until student shows they understand the visual. Ask after each step: 'Does this picture make sense?'",
      "canvasActions": [
        { "type": "clear_canvas" },
        { "type": "stamp_shape", "shape": "fraction-bar", "position": "center" }
      ],
      "exitConditions": { "sageSuggestsReady": true, "timeExpiredMins": 15, "tutorOverride": true },
      "narrative": "Pictures before numbers. Always."
    },
    {
      "id": "guided-practice",
      "name": "Try Together",
      "icon": "🤝",
      "durationMins": 15,
      "sageMode": "co-teach",
      "sagePromptTemplate": "Work through 2-3 problems TOGETHER with the student. Do the first one fully with them, narrating each step. Ask them to do step 1 of the second, then you do step 2, then they do step 3. Always praise attempt, never the result alone. Never say 'wrong' — say 'almost, let's look at this part together'.",
      "canvasActions": [
        { "type": "clear_canvas" }
      ],
      "exitConditions": { "minMasteryScore": 50, "timeExpiredMins": 18, "tutorOverride": true },
      "narrative": "We work through problems side by side — you're never alone on this."
    },
    {
      "id": "independent",
      "name": "Your Turn",
      "icon": "⭐",
      "durationMins": 8,
      "sageMode": "hints",
      "sagePromptTemplate": "Give ONE question the student can attempt alone. Provide a written hint card on the canvas listing the steps. Check in after 2 minutes: 'How's it going? Want a smaller hint?' Never let them feel stuck for more than 90 seconds without support.",
      "canvasActions": [
        { "type": "clear_canvas" },
        { "type": "add_text", "props": { "text": "Step hint card:\n1. Read the question\n2. Draw a picture first\n3. Try one step at a time", "position": "top-right" } }
      ],
      "exitConditions": { "tutorOverride": true, "timeExpiredMins": 10 },
      "narrative": "One question — all yours. The hint card is always there if you need it.",
      "homeworkEnabled": true
    },
    {
      "id": "celebration",
      "name": "Look How Far You've Come",
      "icon": "🌟",
      "durationMins": 4,
      "sageMode": "full",
      "sagePromptTemplate": "Celebrate what the student achieved today — be specific and genuine. Never compare to others. Mention one thing they understood that they didn't at the start. Set a very small, achievable homework that feels like a continuation not a chore.",
      "canvasActions": [],
      "exitConditions": { "tutorOverride": true, "timeExpiredMins": 5 },
      "narrative": "Every step forward matters. Let's celebrate what you did today."
    }
  ],
  "learn_your_way": {
    "freedoms": ["support", "pace", "ai_involvement"],
    "agencyPoints": [
      "Sage always checks in before moving on — you control the pace",
      "Visual-first: no algebra until you're ready",
      "Co-teach mode means you're never working alone"
    ],
    "bestFor": "Students with dyslexia, dyscalculia, exam anxiety, or anyone who learns best through pictures and encouragement"
  }
}
```

---

### 9.4 Quiet Diagnostic + Gap Fill Sprint

```json
{
  "slug": "quiet-diagnostic-gap-sprint",
  "name": "Quiet Diagnostic + Gap Fill Sprint",
  "short_description": "Find the gaps, fix them fast — minimal AI, maximum efficiency",
  "theme": {
    "icon": "🔍",
    "colour": "#64748b",
    "backgroundStyle": "default",
    "narrative": "No story, no theme — just sharp, targeted diagnosis. Find exactly what needs fixing, then fix it."
  },
  "tags": ["diagnostic", "any-topic", "gcse", "a-level", "11+", "revision", "exam-prep", "efficient"],
  "exam_board": "any",
  "subject": "any",
  "level": "foundation",
  "duration_mins": 30,
  "ai_involvement": "silent",
  "sen_focus": false,
  "phases": [
    {
      "id": "diagnostic",
      "name": "Diagnostic",
      "icon": "🔍",
      "durationMins": 12,
      "sageMode": "silent",
      "sagePromptTemplate": "Give 8 rapid-fire questions across the topic, each worth 1 mark. Vary difficulty (4 easy, 3 medium, 1 hard). Record correct/incorrect. Do NOT give feedback during this phase. Calculate a skill map after all 8.",
      "canvasActions": [
        { "type": "clear_canvas" }
      ],
      "exitConditions": { "timeExpiredMins": 15, "tutorOverride": true },
      "narrative": "8 quick questions. No hints, no feedback — just honest answers."
    },
    {
      "id": "gap-analysis",
      "name": "Gap Analysis",
      "icon": "📊",
      "durationMins": 5,
      "sageMode": "full",
      "sagePromptTemplate": "Display a simple skill map on the canvas: which questions were correct, which wrong. Identify the 1-2 biggest gaps. Say: 'You have 15 minutes — we're going to fix the most important gap right now.'",
      "canvasActions": [
        { "type": "clear_canvas" },
        { "type": "add_text", "props": { "text": "Your skill map 📊", "position": "top-left" } }
      ],
      "exitConditions": { "timeExpiredMins": 5, "tutorOverride": true },
      "narrative": "See exactly where the gaps are — no guessing."
    },
    {
      "id": "targeted-fix",
      "name": "Targeted Fix",
      "icon": "🎯",
      "durationMins": 10,
      "sageMode": "co-teach",
      "sagePromptTemplate": "Focus exclusively on the top 1-2 gaps identified. Teach the method concisely. Give 2 practice questions. Check understanding. No diversions.",
      "canvasActions": [
        { "type": "clear_canvas" }
      ],
      "exitConditions": { "minMasteryScore": 70, "timeExpiredMins": 12, "tutorOverride": true },
      "narrative": "15 minutes on the one thing that matters most.",
      "homeworkEnabled": true
    },
    {
      "id": "worksheet-gen",
      "name": "Generate Worksheet",
      "icon": "📄",
      "durationMins": 3,
      "sageMode": "full",
      "sagePromptTemplate": "Generate 5 practice questions focused on the gaps identified. These become the homework worksheet. Confirm with tutor before sending.",
      "canvasActions": [],
      "exitConditions": { "tutorOverride": true, "timeExpiredMins": 3 },
      "narrative": "A targeted worksheet generated from YOUR specific gaps — not a generic sheet."
    }
  ],
  "learn_your_way": {
    "freedoms": ["goal", "pace"],
    "agencyPoints": [
      "Completely tutor-led — Sage only speaks when useful",
      "Worksheet auto-generated from your specific gaps",
      "Fast — designed for 30-minute sessions"
    ],
    "bestFor": "Exam-crunch revision or students who prefer a quiet, efficient session over a themed adventure"
  }
}
```

---

## 10. User Selection Experience

### Entry points

1. **Session start screen** — when tutor or student opens a new VirtualSpace session, before the canvas loads, a workflow selector is shown (can be skipped for an open/unstructured session)
2. **VirtualSpace hub** — the `/virtualspace` page shows "Start a workflow session" alongside recent sessions
3. **Mid-session switch** — tutor can switch workflows via the phase bar overflow menu

### WorkflowSelector component

```
┌──────────────────────────────────────────────────────────────────┐
│  🧭 How do you want to learn today?           [Skip — Open Canvas]│
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search workflows...                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Filters:  [Subject ▾]  [Level ▾]  [Duration ▾]  [AI Level ▾]   │
│            [Exam Board ▾]  [SEN Focus ☑]  [Adventure Style ▾]    │
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ 🏴‍☠️          │  │ 👾          │  │ 🌱          │              │
│  │ Treasure Map │  │ Alien       │  │ Visual-First │              │
│  │ Ratio Raid   │  │ Invasion    │  │ Mastery      │              │
│  │             │  │ Quadratics  │  │             │              │
│  │ 45 min      │  │ 50 min      │  │ 40 min      │              │
│  │ Foundation  │  │ Higher      │  │ SEN         │              │
│  │ AI: Full    │  │ AI: Hints   │  │ AI: Full    │              │
│  │             │  │             │  │             │              │
│  │ [Preview]   │  │ [Preview]   │  │ [Preview]   │              │
│  │ [Learn This │  │ [Learn This │  │ [Learn This │              │
│  │  Way →]     │  │  Way →]     │  │  Way →]     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

### WorkflowPreviewModal

When "Preview" is clicked:

```
┌─────────────────────────────────────────────────────┐
│ 🏴‍☠️  Treasure Map Ratio Raid                    [×]  │
│                                                       │
│ "Captain Sage has discovered a legendary treasure..." │
│                                                       │
│ ──── Session Arc ────────────────────────────────── │
│                                                       │
│ 🗺️ Warm-Up      📜 Instruction    ⚔️ Practice         │
│    5 min  →        12 min    →      15 min            │
│    Sage: Full      Sage: Full      Sage: Hints        │
│                                                       │
│ 🪙 Assessment   🏆 Recap                              │
│    8 min   →       5 min                              │
│    Sage: Silent    Sage: Full                         │
│                                                       │
│ ── Best for ─────────────────────────────────────── │
│ Students who love storytelling + hands-on maths      │
│                                                       │
│ ── You can ──────────────────────────────────────── │
│ ✓ Skip warm-up if student already knows the basics   │
│ ✓ Reduce Sage hints during practice                  │
│ ✓ Tutor can pause Sage and take over at any time     │
│                                                       │
│           [Start Session →]  [Choose Different]      │
└─────────────────────────────────────────────────────┘
```

---

## 11. Runtime Behaviour

### `VirtualSpaceWorkflowRuntime`

**File:** `apps/web/src/lib/virtualspace/workflow-runtime/VirtualSpaceWorkflowRuntime.ts`

```typescript
class VirtualSpaceWorkflowRuntime {
  constructor(
    private sessionId: string,
    private workflow: SessionWorkflow,
    private editor: Editor,              // tldraw editor instance
    private ablyChannel: RealtimeChannel // for syncing state to both participants
  ) {}

  // Called once on session start
  async init(): Promise<void>

  // Called by SessionPhaseBar "Next Phase" or exit condition met
  async advancePhase(trigger: 'time' | 'mastery' | 'tutor' | 'sage'): Promise<void>

  // Called by tutor override controls
  async skipToPhase(phaseId: string): Promise<void>

  // Evaluates exit conditions continuously (called every 30s)
  evaluateTransitions(): PhaseTransitionResult

  // Returns current state (synced from virtualspace_sessions.workflow_state)
  getState(): WorkflowState

  // Called on session end
  async completeSession(): Promise<SessionSummary>
}
```

### State sync via Ably

Phase transitions are broadcast on the existing session Ably channel:

```typescript
// Published by runtime on phase advance
{
  type: 'workflow:phase-changed',
  data: {
    workflowId: string,
    previousPhase: string,
    currentPhase: string,
    currentPhaseIndex: number,
    totalPhases: number,
    phaseStartedAt: string,
    sageMode: string,
  }
}
```

Both tutor and student `SessionPhaseBar` components subscribe to this event.

### Exit condition evaluation

Every 30 seconds and on every Sage message received:

```
1. Time expired?    → advancePhase('time')
2. Mastery score ≥ threshold?  → advancePhase('mastery')
   (Sage writes mastery score to session_report.phaseScores via API)
3. Sage signals ready?  → suggest advance (non-blocking — tutor confirms)
4. All phases complete?  → completeSession()
```

---

## 12. Sage AI Mode Integration

### How Sage mode is injected per phase

The existing `SageOrchestrator` receives a system prompt built in `buildSystemPrompt()`. The workflow runtime adds a phase-specific section:

```typescript
// In the Sage stream API route, after loading workflow state:
const workflowContext = workflowState ? `

=== CURRENT WORKFLOW PHASE ===
Workflow: ${workflow.name}
Phase: ${currentPhase.name}
Sage Mode: ${currentPhase.sageMode}
Persona: ${currentPhase.sagePersona || 'Default Sage'}

Phase Instructions:
${currentPhase.sagePromptTemplate}

Phase Narrative (for student context):
${currentPhase.narrative}
=== END WORKFLOW PHASE ===
` : '';
```

### Sage Mode behaviours

| Mode | Sage behaviour |
|---|---|
| `full` | Sage leads — explains, teaches, checks understanding, adapts pace |
| `hints` | Sage waits — only responds if student asks or is stuck >N seconds |
| `silent` | Sage does not respond in chat — exam/assessment mode |
| `co-teach` | Sage and tutor share teaching — Sage does steps 1,3; tutor does 2,4 |

`silent` mode: Sage API still receives messages but returns an empty response to the client. The tutor's co-pilot channel remains active.

---

## 13. Canvas Action System

### `executeCanvasAction()`

**File:** `apps/web/src/lib/virtualspace/workflow-runtime/canvasActions.ts`

```typescript
async function executeCanvasAction(
  editor: Editor,
  action: CanvasAction
): Promise<void> {
  switch (action.type) {
    case 'stamp_shape':
      editor.createShape({
        type: action.shape,
        x: getPositionX(editor, action.position),
        y: getPositionY(editor, action.position),
        props: action.props || {},
      });
      break;

    case 'load_template':
      // Fetches a pre-built tldraw snapshot from Supabase Storage
      const template = await loadTemplate(action.templateId);
      editor.store.mergeRemoteChanges(() => {
        editor.store.put(template.records);
      });
      break;

    case 'clear_canvas':
      // Removes all shapes except locked ones
      const shapesToDelete = editor.getCurrentPageShapes()
        .filter(s => !s.isLocked)
        .map(s => s.id);
      editor.deleteShapes(shapesToDelete);
      break;

    case 'add_text':
      editor.createShape({
        type: 'text',
        x: getPositionX(editor, action.position),
        y: 20,
        props: { text: action.props.text, size: 'm', color: 'black' },
      });
      break;

    case 'set_background':
      editor.updateDocumentSettings({
        background: action.backgroundStyle === 'dark' ? 'dark' : 'light',
      });
      break;
  }
}
```

### Canvas actions are synced automatically

Because canvas actions use `editor.createShape()` / `editor.deleteShapes()`, they go through the existing tldraw store → Ably draw channel sync. Both participants see the phase setup simultaneously with no extra work.

---

## 14. Conductor Integration

VirtualSpace workflows fire events into Conductor for observability, analytics, and post-session triggers — but do not use `PlatformWorkflowRuntime` for execution.

### Events fired to Conductor

```typescript
// On session start with workflow
POST /api/admin/workflow/processes/[workflowProcessId]/execute/start
// with metadata: { type: 'virtualspace_session', sessionId, workflowSlug }

// On phase completion
POST /api/admin/workflow/processes/[id]/execute/[executionId]/phase-complete
// with: { phaseId, duration, masteryScore, exitTrigger }

// On session complete
POST /api/admin/workflow/processes/[id]/execute/[executionId]/complete
// with: { sessionSummary, phasesCompleted, totalDurationMins }
```

This allows Conductor's **Phase 5 Mining** panel to show:
- Which phases are most often skipped
- Which phases take longest (bottlenecks)
- Which workflows have highest completion rates
- Which Sage modes produce the best mastery scores

### Workflow processes seeded in Conductor

Migration 432 seeds a `workflow_processes` record for `virtualspace-session-workflow` with `execution_mode = 'shadow'`, so all session workflow executions appear in the Conductor Observe panel for analytics without affecting session flow.

---

## 15. Parent Portal & Google Classroom Triggers

### On session complete

`VirtualSpaceWorkflowRuntime.completeSession()` fires:

1. **Generate session report** — `POST /api/virtualspace/[sessionId]/report` (already built). Report includes `workflow.name`, `phases completed`, and `phaseScores` from Sage.

2. **Parent email** — existing report route emails parent with enriched content:
   - Workflow theme + session arc shown
   - Per-phase summary (what was covered in each phase)
   - Mastery scores per phase if available

3. **Google Classroom push** — if tutor has Classroom connected and `homeworkEnabled` phase completed:
   - `POST /api/integrations/google-classroom/post-homework` (already built)
   - Assignment title: `[Workflow name] — Practice Questions`

4. **Worksheet generation** — if `worksheet-gen` phase in workflow (e.g. Diagnostic Sprint):
   - `POST /api/virtualspace/[sessionId]/worksheet` (already built)

---

## 16. SEN & Accessibility

### SEN-specific workflow behaviour

When `sen_focus: true` on a workflow:

1. **Sage receives additional SEN system prompt extension:**
   ```
   This session uses SEN-adapted teaching. Always:
   - Use short sentences (max 15 words)
   - Offer a visual alternative for every text explanation
   - Never say "wrong" — say "let's look at this together"
   - Check understanding every 2–3 exchanges
   - Honour the student's pace — never rush a transition
   ```

2. **Phase bar** shows a simplified view — no timers, no progress % — just the current phase name and a gentle "Ready for the next step?" prompt rather than auto-advance.

3. **Canvas actions** default to visual shapes (fraction bar, number line, Venn diagram) over algebraic notation shapes.

4. **Exit conditions** disable `timeExpiredMins` auto-advance — only `tutorOverride: true` and `sageSuggestsReady` apply.

### Accessibility standards

- All workflow cards have proper ARIA labels and keyboard navigation
- Phase bar uses sufficient colour contrast (≥ 4.5:1) against canvas background
- Screen reader announces phase transitions
- Font sizes in canvas text actions use tldraw's `xl` size by default for SEN workflows

---

## 17. Tutor Controls & Override System

The tutor always has full override capability. This is non-negotiable — the workflow guides but never imprisons.

### Override controls in SessionPhaseBar

```
[← Back Phase]  [Phase 2/5: The Ratio Map 📜]  [⏭ Skip Phase]
                  ⏱ 8:32 / 12:00
                  Sage: Hints ▾              [⚙ Workflow Menu]
```

**[← Back Phase]** — return to previous phase (re-executes canvas actions)
**[⏭ Skip Phase]** — advance immediately, logs `exitTrigger: 'tutor'`
**Sage mode dropdown** — override Sage mode for current phase only
**[⚙ Workflow Menu]:**
- "Switch workflow" → opens WorkflowSelector mid-session
- "Stop workflow (open canvas)" → detaches workflow, keeps canvas state
- "Extend this phase (+5 min)" → increases time limit
- "Replay phase canvas setup" → re-runs canvas actions

### Tutor copilot panel

The existing tutor co-pilot channel (private to tutor) receives an additional phase context section showing:
- What Sage is supposed to be doing in this phase
- Suggested questions the tutor can ask
- Flag if student mastery is below threshold

---

## 18. Component Specification

### `WorkflowSelector`
**File:** `apps/web/src/components/feature/virtualspace/workflow/WorkflowSelector.tsx`
- Fetches from `GET /api/virtualspace/workflows`
- Filter state: subject, level, duration, aiInvolvement, examBoard, senFocus, search query
- Card grid (3 cols desktop, 2 tablet, 1 mobile)
- Each card: theme icon + colour accent, name, short description, duration badge, level badge, AI mode badge
- "Preview" → `WorkflowPreviewModal`
- "Learn This Way" → calls `onSelect(workflow)` prop
- "Skip — Open Canvas" link at top

### `WorkflowPreviewModal`
**File:** `apps/web/src/components/feature/virtualspace/workflow/WorkflowPreviewModal.tsx`
- Phase arc timeline (horizontal, scrollable)
- Per-phase: icon, name, duration, Sage mode badge
- "Best for" section
- "You can" (agency points) section
- "Start Session" → `onConfirm(workflow)`

### `SessionPhaseBar`
**File:** `apps/web/src/components/feature/virtualspace/workflow/SessionPhaseBar.tsx`
- Sticky bar at top of VirtualSpace canvas area (below main toolbar)
- Shows: workflow name + theme icon, phase progress dots, current phase name + icon, elapsed/total time, Sage mode badge, skip/back buttons, overflow menu
- Subscribes to `workflow:phase-changed` Ably events
- Handles: `onSkipPhase`, `onBackPhase`, `onSageModeOverride`, `onSwitchWorkflow`, `onStopWorkflow`
- SEN mode: simplified (no timer, no % progress)

### `WorkflowCard`
**File:** `apps/web/src/components/feature/virtualspace/workflow/WorkflowCard.tsx`
- Props: `workflow: SessionWorkflow`, `onPreview`, `onSelect`
- Left accent border in `theme.colour`
- Theme icon (large), name, short_description
- Badge row: duration, level, AI mode, SEN tag if applicable

---

## 19. API Specification

### `GET /api/virtualspace/workflows`
Returns published workflows, filterable.

**Query params:** `subject`, `level`, `aiInvolvement`, `senFocus`, `examBoard`, `durationMax`, `search`, `tags`

**Response:** `{ workflows: SessionWorkflow[] }`

**File:** `apps/web/src/app/api/virtualspace/workflows/route.ts`

---

### `GET /api/virtualspace/workflows/[slug]`
Returns a single workflow by slug.

**Response:** `{ workflow: SessionWorkflow }`

---

### `POST /api/virtualspace/[sessionId]/workflow/start`
Attaches a workflow to a session and initialises state.

**Request:** `{ workflowId: string }`

**Logic:**
1. Loads workflow from `session_workflows`
2. Sets `virtualspace_sessions.workflow_id` + `workflow_state` (phase 0, timestamps)
3. Returns initial state
4. Broadcast `workflow:started` on Ably session channel

---

### `POST /api/virtualspace/[sessionId]/workflow/advance`
Advances to next phase.

**Request:** `{ trigger: 'tutor' | 'time' | 'mastery' | 'sage', masteryScore?: number }`

**Logic:**
1. Validates transition is allowed
2. Updates `workflow_state.currentPhaseIndex`, adds to `transitions[]`
3. Broadcasts `workflow:phase-changed` on Ably
4. Returns new state

---

### `PATCH /api/virtualspace/[sessionId]/workflow/state`
Updates workflow state (Sage mode override, extensions).

**Request:** `{ sageModeOverride?: string, extendPhaseMins?: number }`

---

### `DELETE /api/virtualspace/[sessionId]/workflow`
Detaches workflow from session (stop workflow, open canvas).

---

## 20. Database Migrations

### Migration 431 — `session_workflows` + session columns

```sql
-- session_workflows table
CREATE TABLE session_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  theme JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  exam_board TEXT DEFAULT 'any',
  subject TEXT DEFAULT 'maths',
  level TEXT NOT NULL CHECK (level IN ('primary','foundation','higher','SEN','11+','a-level','any')),
  duration_mins INT NOT NULL,
  ai_involvement TEXT NOT NULL CHECK (ai_involvement IN ('full','hints','silent','co-teach')),
  sen_focus BOOLEAN DEFAULT FALSE,
  phases JSONB NOT NULL DEFAULT '[]',
  learn_your_way JSONB DEFAULT '{}',
  built_in BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_workflows_tags ON session_workflows USING GIN(tags);
CREATE INDEX idx_session_workflows_level ON session_workflows(level);
CREATE INDEX idx_session_workflows_subject ON session_workflows(subject);
CREATE INDEX idx_session_workflows_sen ON session_workflows(sen_focus);

ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES session_workflows(id),
  ADD COLUMN IF NOT EXISTS workflow_state JSONB;

-- RLS
ALTER TABLE session_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published workflows readable by all authenticated"
  ON session_workflows FOR SELECT
  TO authenticated
  USING (published = TRUE);
CREATE POLICY "tutors manage own workflows"
  ON session_workflows FOR ALL
  TO authenticated
  USING (created_by = auth.uid());
```

### Migration 432 — Conductor shadow process seed

```sql
-- Seeds a Conductor workflow process for VirtualSpace session analytics
INSERT INTO workflow_processes (slug, name, description, execution_mode, definition)
VALUES (
  'virtualspace-session-workflow',
  'VirtualSpace Session Workflow Analytics',
  'Shadow process that records all Learn Your Way session executions for Conductor analytics and process mining.',
  'shadow',
  '{"nodes": [], "edges": []}'
);
```

---

## 21. Seed Data — Built-In Workflows

Migration 431 seeds the following built-in workflows (abbreviated here — full JSON in §9 above):

| Slug | Name | Level | AI Mode | Duration |
|---|---|---|---|---|
| `treasure-map-ratio-raid` | Treasure Map Ratio Raid | Foundation | Full | 45 min |
| `quadratics-alien-invasion` | Quadratics — Alien Invasion | Higher | Hints | 50 min |
| `sen-visual-first-mastery` | Visual-First Relaxed Mastery | SEN | Full | 40 min |
| `quiet-diagnostic-gap-sprint` | Quiet Diagnostic + Gap Fill Sprint | Any | Silent | 30 min |
| `gcse-full-paper-simulation` | GCSE Full Paper Simulation | Higher | Silent | 65 min |

`built_in = TRUE` on all seeded rows. Tutors cannot edit built-in workflows — they can duplicate and customise.

---

## 22. Implementation Roadmap

| Phase | Component | Effort | Notes |
|---|---|---|---|
| **A** | Migration 431 + seed 5 workflows | S | Schema + seed data |
| **A** | `GET /api/virtualspace/workflows` | S | Simple select + filter |
| **A** | `WorkflowSelector` + `WorkflowCard` | M | Card grid + filters |
| **A** | `WorkflowPreviewModal` | S | Phase arc display |
| **B** | `POST /api/virtualspace/[sessionId]/workflow/start` | S | Attach workflow to session |
| **B** | `POST /api/virtualspace/[sessionId]/workflow/advance` | S | Phase transition + Ably broadcast |
| **B** | `SessionPhaseBar` component | M | Phase bar + override controls |
| **B** | Sage mode injection per phase | S | Extend system prompt in stream route |
| **C** | `executeCanvasAction()` system | M | stamp_shape, clear, add_text, etc. |
| **C** | Ably `workflow:phase-changed` subscription | S | Both participants sync phase |
| **C** | SEN mode: disable timers, simplified bar | S | Flag-based rendering |
| **D** | Tutor workflow override controls | M | Skip, back, mode override, switch |
| **D** | Post-session report enrichment with workflow data | S | Extend report route |
| **D** | Conductor event firing (shadow analytics) | S | Fire-and-forget |
| **E** | Tutor custom workflow builder (basic) | L | CRUD + phase editor UI |
| **E** | 20 additional built-in workflows | M | Expand library to 25+ |

**Recommended start:** Phase A + B in one sprint (core selection + runtime). Phase C + D in second sprint (canvas actions + overrides). Phase E after initial user feedback.

---

## 23. Open Questions

| Question | Options | Recommended |
|---|---|---|
| Can students select the workflow, or only tutors? | Tutor-only / Student proposes, tutor confirms / Both | Tutor selects, but student sees a "suggest a style" option |
| Should workflow selection be required or optional? | Always shown / Opt-in / Default to last used | Show on session start, "Skip — Open Canvas" always available |
| Where does the phase bar sit? | Top of canvas / Side panel / Floating | Top of canvas — mirrors LessonSpace's clean top-bar layout |
| Should mastery scores be shown to students? | Yes / No / Phase summary only | Phase summary after each phase, not live score |
| Can tutors build custom workflows? | No / Full editor / Duplicate + edit only | Duplicate + edit in Phase E |
| How many built-in workflows at launch? | 5 / 10 / 25 | 5 at launch, expand quarterly |
| Should workflow theme change canvas background? | Yes, auto / Optional / No | Optional — tutor can disable per-session |

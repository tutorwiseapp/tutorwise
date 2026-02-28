# Intent-Based Development: TutorWise CAS + Sage

## Overview

TutorWise implements **intent-based development** — a paradigm where humans define goals and constraints, autonomous agents determine how to achieve them, the system self-executes and iterates, and humans approve critical outputs.

This is not aspirational. It is implemented in production code across two complementary systems:

- **CAS** (Contextual Autonomous Systems) — Platform development autonomy. 9 LangGraph agents orchestrate feature delivery from strategic decision to deployment.
- **Sage** — Student-facing teaching autonomy. AI agents autonomously select teaching strategies, retrieve knowledge, and adapt to student performance.

---

## The 4-Layer Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: HUMANS SET THE GOAL                                   │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │ CAS: Org vision,     │  │ Sage: Learning goal, subject,   │ │
│  │ roadmap, feature req  │  │ level, session intent           │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: AGENTS FIGURE OUT HOW                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │ CAS: 9-agent workflow │  │ Sage: Teaching mode, RAG tier,  │ │
│  │ Director→...→Marketer │  │ difficulty, DSPy prompts        │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: SYSTEM SELF-EXECUTES AND ITERATES                     │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │ CAS: Circuit breaker, │  │ Sage: Feedback gaps, DSPy       │ │
│  │ retry, checkpointing  │  │ optimization, adaptive practice │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: ADMIN AND USER APPROVE                                │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │ CAS: Director GO/     │  │ Sage: Subscription gate,        │ │
│  │ NO-GO, Security gate  │  │ quality scores, user reviews    │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Humans Set the Goal

### CAS — Strategic Intent

The Director agent reads human-authored files that define organizational intent:

| File | Purpose |
|------|---------|
| `.ai/0-tutorwise.md` | Vision, mission, core values, strategic goals |
| `.ai/1-roadmap.md` | Project status, milestones, beta release date |
| `cas_agent_config` table | Versioned per-agent configuration (human-authored) |

The Director evaluates every feature request against these files before allowing execution.

**Source:** `cas/agents/director/src/index.ts` — `makeStrategicDecision()` reads vision and roadmap, returns `PROCEED` / `ITERATE` / `DEFER`.

### Sage — Learning Intent

Users express learning goals through structured inputs:

| Input | Type | Example |
|-------|------|---------|
| Subject | `SageSubject` | `maths`, `english`, `science` |
| Level | `SageLevel` | `GCSE`, `A-Level`, `University` |
| Session Goal | `SessionGoal` | `exam_prep`, `homework_help`, `concept_review` |
| Intent | `SageIntentCategory` | `explain`, `solve`, `practice`, `diagnose` |

Users define **what** they want to learn. They never specify **how** the agent should teach.

**Source:** `sage/types/index.ts` — `LearningContext` interface captures subject, level, sessionGoal, priorKnowledge, errorPatterns, strengths.

### AI Agent Studio — Creator Intent

Agent creators define the "what" via the builder form:

- Name, subject, description (the agent's purpose)
- Skills (what it should know)
- Price (business decision)

The system handles everything else: prompt engineering, RAG setup, teaching strategy, quality tracking.

**Source:** `apps/web/src/app/components/feature/ai-agents/builder/AIAgentBuilderForm.tsx`

---

## Layer 2: Agents Figure Out How

### CAS — 9-Agent LangGraph Workflow

```
START → Director → Planner → Analyst → Developer → Tester → QA → Security → Engineer → Marketer → END
```

Each agent has a distinct role in the "how":

| Agent | Role | Decides |
|-------|------|---------|
| **Director** | Strategic alignment | PROCEED / ITERATE / DEFER |
| **Planner** | Sprint planning | Task breakdown, dependencies, critical path |
| **Analyst** | Requirements | Feature briefs, Three Amigos analysis |
| **Developer** | Implementation | Code architecture, patterns, implementation |
| **Tester** | Test strategy | Test cases, coverage, edge cases |
| **QA** | Quality assurance | Quality standards, acceptance criteria |
| **Security** | Security review | Vulnerability scanning, APPROVE / BLOCK |
| **Engineer** | Deployment | Infrastructure, deployment strategy |
| **Marketer** | Go-to-market | User communication, documentation |

Agents route conditionally — Director can DEFER (ending workflow), Security can BLOCK (preventing deployment).

**Source:** `cas/packages/core/src/workflows/PlanningGraph.ts` — `routeFromDirector()`, `routeFromSecurity()` conditional routing.

### Sage — Autonomous Teaching Decisions

Sage makes 4 autonomous decisions per interaction:

**1. Teaching Mode Selection** — `sage/teaching/modes.ts`
- `socratic` — Guide with questions (student capable, not too stuck)
- `direct` — Explain clearly (student stuck or requesting explanation)
- `adaptive` — Mix approaches (default for complex topics)
- `supportive` — Encouragement-focused (low confidence students)

Selection based on: intent category, struggle level, question count — no human intervention.

**2. Knowledge Retrieval Strategy** — `sage/agents/MarketplaceAIAgent.ts`
- Tier 1: Agent's uploaded materials (vector search, threshold 0.65)
- Tier 2: Agent's reference links (keyword-filtered, priority-ordered)
- Tier 3: Sage global knowledge (vector fallback, threshold 0.6)

Agent autonomously falls through tiers until sufficient context is found.

**3. Difficulty Adaptation** — `sage/teaching/adaptive-practice.ts`
- Accuracy < 0.4 → easier problems
- Accuracy > 0.8 + mastery > 0.7 → harder problems
- Declining trend → prerequisite review recommended

**4. Prompt Enhancement** — `cas/optimization/prompt-loader.ts`
- Loads DSPy-optimized few-shot examples when available
- Maps subject to signature type (maths → `MathsProblemSolver`, etc.)
- Falls back silently if no optimization available

---

## Layer 3: System Self-Executes and Iterates

### CAS — Self-Healing Infrastructure

**Circuit Breaker** — `cas/packages/core/src/runtime/CircuitBreaker.ts`
- 3 states: CLOSED (healthy) → OPEN (failing) → HALF_OPEN (testing recovery)
- Opens after 5 consecutive failures
- Auto-tests recovery after configurable timeout
- Per-agent isolation — one agent's failure doesn't affect others
- State persisted to Supabase for observability

**Retry with Backoff** — `cas/packages/core/src/runtime/RetryUtility.ts`
- 3 attempts with exponential backoff (1s → 2s → 4s)
- Error classification: rate_limit, network, auth, validation, server
- Jitter (±30%) prevents thundering herd
- Only retries on retryable errors (skips auth, validation)

**Workflow Checkpointing** — `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- State saved to Supabase after every agent step
- `resumeWorkflow()` — continue from latest checkpoint
- `rollbackWorkflow()` — revert to specific version
- `getWorkflowHistory()` — full execution audit trail

### Sage — Continuous Improvement Loops

**Feedback → Gap Detection** — `sage/services/feedback-service.ts`
- Collects thumbs up/down per topic
- `identifyCurriculumGaps()` — finds topics with positive rate < 60%
- Severity classification: critical (< 30%), high (< 40%), medium (< 50%)
- Auto-recommends actions: "Regenerate content", "Add worked examples", "Review accuracy"

**DSPy Optimization Pipeline** — `cas/optimization/`
- Offline Python pipeline optimizes Sage/Lexi prompts
- Tracks before/after metrics with improvement percentages
- Outputs optimized few-shot examples loaded at runtime
- Weekly schedule recommended for continuous improvement

**Quality Scoring** — `sage/knowledge/enhanced-rag.ts`
- Multi-factor ranking: relevance (40%), authority (30%), topic alignment (20%), recency (10%)
- Source authority hierarchy: curriculum (1.0) > textbook (0.9) > practice (0.85) > user-notes (0.7)
- Ensures highest-quality sources surface first

**Fallback Tracking** — `ai_agent_sessions.fallback_to_sage_count`
- Tracks when agent's custom materials are insufficient
- Signals to agent owner: "your materials don't cover topic X"
- Data-driven improvement signal

**Improvement Cycle:**
```
User Interaction → Feedback Collection → Gap Detection →
Severity Classification → Recommended Actions →
DSPy Prompt Optimization → Better Few-Shot Examples →
Higher Quality Responses → Production Metrics →
Director Review (CONTINUE/ITERATE/DEPRECATE)
```

---

## Layer 4: Admin and User Approve

### 5 Approval Gates

| # | Gate | Who | Where | What Happens |
|---|------|-----|-------|--------------|
| 1 | **Director Strategic Decision** | CAS Director Agent | `PlanningGraph.ts` | `DEFER` → workflow ends, no implementation |
| 2 | **Security Deployment Gate** | CAS Security Agent | `PlanningGraph.ts` | Critical vulns → deployment blocked |
| 3 | **Subscription Gate** | Agent Owner (payment) | `adapter.ts` | No active subscription → cannot publish |
| 4 | **CaaS Score Limit** | System (earned trust) | `adapter.ts` | `score/20 + 1` agents allowed (max 50) |
| 5 | **User Reviews** | End Users | `reviews/route.ts` | Ratings affect quality score and visibility |

### Agent Lifecycle States

```
draft → published (requires subscription approval)
      → unpublished (owner pauses)
      → suspended (admin action)
      → archived (soft delete)
```

RLS policies enforce: only `published` agents are publicly discoverable.

### Admin Dashboard

**Location:** `/admin/cas` — `apps/web/src/app/(admin)/admin/cas/page.tsx`

Admins can:
- Monitor all 9 agents in real-time (status, uptime, execution counts)
- View workflow execution step-by-step (fullscreen visualizer)
- Track feedback satisfaction rates
- Pause/stop individual agents
- Review metrics timeseries

### Human Escalation

When AI agents cannot handle a request:
- `handoff-to-human` route — transfers session to human tutor
- `escalate` route — quality escalation for review

---

## Evidence Map

| Pattern | Evidence | File |
|---------|----------|------|
| Strategic intent files | `.ai/0-tutorwise.md`, `.ai/1-roadmap.md` | Read by Director agent |
| Director decisions | `makeStrategicDecision()` → PROCEED/ITERATE/DEFER | `cas/agents/director/src/index.ts` |
| 9-agent workflow | `StateGraph` with conditional routing | `cas/packages/core/src/workflows/PlanningGraph.ts` |
| Teaching mode autonomy | `recommendMode()` — 4 modes based on context | `sage/teaching/modes.ts` |
| 3-tier RAG | materials → links → Sage fallback | `sage/agents/MarketplaceAIAgent.ts` |
| Adaptive difficulty | Performance-based difficulty adjustment | `sage/teaching/adaptive-practice.ts` |
| Circuit breaker | 3-state self-healing per agent | `cas/packages/core/src/runtime/CircuitBreaker.ts` |
| Retry backoff | Exponential + jitter + error classification | `cas/packages/core/src/runtime/RetryUtility.ts` |
| Workflow checkpoints | Save/resume/rollback to Supabase | `cas/packages/core/src/runtime/LangGraphRuntime.ts` |
| Feedback gaps | Gap detection + severity + recommendations | `sage/services/feedback-service.ts` |
| DSPy optimization | Offline prompt optimization pipeline | `cas/optimization/run_dspy.py` |
| Quality scoring | Multi-factor RAG ranking | `sage/knowledge/enhanced-rag.ts` |
| Subscription gate | Active subscription required to publish | `apps/web/src/lib/ai-agents/adapter.ts` |
| CaaS score limits | Graduated agent creation limits | `apps/web/src/lib/ai-agents/adapter.ts` |
| User reviews | Post-session ratings | `apps/web/src/app/api/ai-agents/[id]/reviews/route.ts` |
| Admin dashboard | Real-time agent monitoring | `apps/web/src/app/(admin)/admin/cas/page.tsx` |
| Human escalation | Session handoff to human tutor | `apps/web/src/app/api/ai-agents/sessions/[sessionId]/handoff-to-human/route.ts` |

---

## Why This Matters

Intent-based development inverts the traditional software model:

| Traditional | Intent-Based (TutorWise) |
|-------------|-------------------------|
| Humans write code | Humans write goals |
| Humans decide implementation | Agents decide implementation |
| Manual testing | Autonomous quality assurance |
| Manual deployment | Gated autonomous deployment |
| Reactive bug fixes | Proactive gap detection |
| Static prompts | Self-optimizing prompts (DSPy) |

The system continuously improves without human code changes — feedback drives DSPy optimization, which drives better prompts, which drives better student outcomes, which the Director monitors via production metrics.

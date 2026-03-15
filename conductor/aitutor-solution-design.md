# AI Tutor & Agent Studio Solution Design

**Version:** 1.0
**Date:** 2026-03-15
**Status:** Draft — Design Review
**Depends on:** [conductor-solution-design.md](conductor-solution-design.md) (platform architecture), [digital-workforce-solution-design.md](digital-workforce-solution-design.md) (workforce context)

---

## 1. Purpose

This document defines the requirements, design, and implementation plan to elevate **Sage AI Tutor** and **AI Agent Studio** to best-in-class education AI products. The goal: match or exceed the pedagogical quality of Khanmigo, the adaptive learning of Carnegie Learning, and the safety standards of Oak Aila — while retaining Tutorwise's unique marketplace model where tutors create and sell AI agents.

### Research Basis

| Benchmark Product | Key Strength | Scale | Relevance to Tutorwise |
|---|---|---|---|
| **Khan Academy Khanmigo** | Socratic method, never reveals answers, classroom integration | 700K students, 15K teachers | Direct competitor to Sage — pedagogical guardrails are table stakes |
| **Carnegie Learning MATHia** | Adaptive student model, 2x test score gains (RAND study) | 500K+ students, US market | Gold standard for outcome measurement and persistent student modelling |
| **Oak National Aila** | UK DfE safety-certified, curriculum-aligned lesson builder | UK state schools, free | Safety compliance benchmark — Sage must meet same DfE 5-area framework |
| **Century Tech** | Neuroscience-based adaptive learning, 1M+ students | UK + international | Adaptive difficulty and learning path personalisation |
| **Duolingo Max** | Gamified AI roleplay, streak-based retention | 100M+ MAU | Engagement and retention mechanics |
| **ServiceNow AI Agent Studio** | Template-first builder, guardrail configuration, tool framework | Enterprise standard | Agent Studio UX benchmark — templates, custom prompts, actions |
| **Salesforce Agentforce** | Pre-built agent templates, Atlas reasoning engine | Enterprise standard | Template and tool registry pattern |

### Design Principles

1. **Safety first** — No school or parent will trust an AI tutor without verifiable safety. DfE 5-area compliance is non-negotiable.
2. **Remember every student** — Persistent student models that carry across sessions and weeks. The AI should know you better every time.
3. **Guide, don't answer** — Socratic method is the default. Direct answers only when explicitly appropriate.
4. **Creators need control** — Agent Studio must let tutors define personality, boundaries, and behaviour without touching code.
5. **Prove outcomes** — If we can't measure learning gains, we're just a chatbot. Pre/post assessment, mastery tracking, and outcome reporting are core features.
6. **Marketplace is the moat** — Khanmigo is one agent. Tutorwise has thousands of tutor-created specialist agents. Quality + quantity wins.

---

## 2. Current State Assessment

### 2.1 Sage AI Tutor — What Exists

| Component | Status | Implementation |
|---|---|---|
| Socratic method | Implemented | 4 teaching modes (Socratic, Direct, Adaptive, Supportive) in `sage/teaching/modes.ts` |
| 6-tier model fallback | Implemented | Grok 4 Fast → Gemini Flash → DeepSeek R1 → Claude Sonnet → GPT-4o → Rules-based |
| RAG knowledge retrieval | Implemented | Hybrid vector + keyword search via `sage/knowledge/enhanced-retriever.ts` |
| Curriculum alignment | Partial | Maths detailed (GCSE + A-Level); English/Science skeleton only |
| Math accuracy | Implemented | Hybrid solver (mathjs + nerdamer) in `sage/math/hybrid-solver.ts` |
| Adaptive practice | Partial | SM-2 algorithm exists but uses mock templates, no real problem bank |
| Multi-modal input | Implemented | Voice transcription + OCR (handwriting/math detection) |
| Progress tracking | Basic | Per-topic accuracy, streak, session count — no mastery decay or misconception graph |
| Session persistence | In-memory only | Lost on server restart; no cross-session continuity |
| Safety guardrails | Minimal | Relies on LLM default behaviour; no input sanitisation or output validation |
| Role-aware prompts | Implemented | 4 personas (student, tutor, client, agent) with tailored system prompts |
| Billing | Implemented | Free tier (10 questions/day) + Pro (£10/month unlimited) via Stripe |

**Key files:**
- Orchestrator: `sage/core/orchestrator.ts`
- Teaching modes: `sage/teaching/modes.ts`
- Adaptive practice: `sage/teaching/adaptive-practice.ts`
- Curriculum resolver: `sage/curriculum/resolver.ts`
- Progress service: `sage/services/progress.ts`
- Math solver: `sage/math/hybrid-solver.ts`
- Knowledge retrieval: `sage/knowledge/enhanced-retriever.ts`
- Provider chain: `sage/providers/` (6 provider files)

### 2.2 AI Agent Studio — What Exists

| Component | Status | Implementation |
|---|---|---|
| Agent creation | Implemented | Form-based builder with name, subject, skills, pricing, avatar |
| RAG knowledge | Implemented | 3-tier: uploaded materials → URL links → Sage fallback |
| Marketplace listing | Implemented | Public profiles at `/marketplace/ai-agents/[name]` with reviews, stats |
| Session streaming | Implemented | SSE via `POST /api/ai-agents/sessions/[sessionId]/stream` |
| Quality scoring | Implemented | Composite 0-100 score (completion rate, ratings, sessions, materials) |
| CaaS-gated limits | Implemented | 0-50 agents depending on CaaS score tier |
| Bundle system | Implemented | AI + human session bundles with expiry |
| Subscription billing | Implemented | £10/month per agent via Stripe |
| Featured/priority | Implemented | Admin-managed featuring and priority ranking |
| View tracking | Implemented | Atomic view count increment |
| Agent templates | Not built | Users start from scratch every time |
| Custom system prompt | Not built | Agent personality/behaviour is hardcoded |
| Tool framework | Not built | Agents can only retrieve knowledge, not take actions |
| Per-student adaptation | Not built | Same response regardless of learner level or history |
| Per-agent safety config | Not built | No content policies, topic restrictions, or age-gating per agent |
| Creator analytics | Basic | Quality score only; no revenue, retention, or learning outcome metrics |

**Key files:**
- Agent CRUD: `apps/web/src/app/api/ai-agents/` (routes)
- Agent pages: `apps/web/src/app/(main)/ai-agents/` (UI)
- Marketplace profile: `apps/web/src/app/(main)/marketplace/ai-agents/[name]/`
- Session streaming: `apps/web/src/app/api/ai-agents/sessions/[sessionId]/stream/`
- Materials/links: `apps/web/src/app/api/ai-agents/[id]/materials/`, `[id]/links/`

---

## 3. Gap Analysis

### 3.1 Sage vs Market Leaders

| # | Capability | Khanmigo / Carnegie / Oak Aila | Sage Today | Gap Severity |
|---|---|---|---|---|
| G1 | Pedagogical guardrails | Never reveals answers under prompt injection; DfE-certified safety | Socratic mode exists but no input sanitisation or output validation | **Critical** |
| G2 | Persistent student model | Cross-session profile, misconception graph, mastery decay | In-memory sessions lost on restart; basic accuracy tracking | **Critical** |
| G3 | Safety compliance | UK DfE 5-area framework, age-gating, emotional wellbeing detection | No content filtering, no age-appropriate adjustment | **Critical** |
| G4 | Curriculum depth | Full national curriculum with prerequisite graphs, exam board variants | Maths detailed; English/Science skeleton | **High** |
| G5 | Formative assessment | Auto-generated quizzes, real problem banks, spaced repetition | Mock templates only, no real problems | **High** |
| G6 | Outcome measurement | A/B tested; Carnegie shows 2x test score gains | No outcome measurement | **High** |
| G7 | Learning analytics | Weekly progress reports, mastery heatmaps, parent/tutor dashboards | Basic stats (sessions, messages, streak) | **Medium** |
| G8 | Visual/interactive output | Diagrams, interactive graphs, step-by-step visual walkthroughs | Text-only output; OCR/voice input only | **Medium** |

### 3.2 Agent Studio vs Agent Builder Platforms

| # | Capability | ServiceNow / Salesforce | Agent Studio Today | Gap Severity |
|---|---|---|---|---|
| G9 | Agent templates | Pre-built templates for common use cases | No templates — blank canvas only | **High** |
| G10 | Custom system prompt | Users define persona, tone, boundaries, escalation rules | Hardcoded behaviour — no creator control | **Critical** |
| G11 | Tool/action framework | Agents call APIs, query databases, trigger workflows | RAG-only — retrieval bots, not agents | **High** |
| G12 | Per-student adaptation | User context injection, conversation memory | No per-student adaptation | **High** |
| G13 | Per-agent safety config | Content policies, PII detection, topic restrictions per agent | No per-agent safety configuration | **High** |
| G14 | Creator analytics | Cost per resolution, CSAT, deflection rate, time-to-resolution | Basic quality score only | **Medium** |
| G15 | Multi-agent handoff | Agent-to-agent routing, escalation chains | Isolated agents, no handoff | **Medium** |

---

## 4. Requirements

### 4.1 Sage Requirements

#### R-S1: Safety & Guardrails (Critical — Gaps G1, G3)

**R-S1.1 Input Sanitisation**
- All student messages MUST pass through a safety classifier before reaching the LLM
- Detect and block: prompt injection attempts, profanity, off-topic requests (violence, drugs, self-harm)
- Classifier MUST run in <50ms to avoid perceptible latency
- Implementation: rules-based keyword/regex layer first, LLM classifier as secondary check for ambiguous cases
- Location: new middleware in `SageOrchestrator.processMessage()` before provider call

**R-S1.2 Output Validation**
- All LLM responses MUST pass through output validation before delivery to student
- Block responses that: reveal direct homework answers in Socratic mode, contain inappropriate content, leak PII, contain hallucinated facts about exam dates/grades
- Socratic enforcement: if teaching mode is Socratic and response contains a direct numerical/textual answer to the student's question, rewrite as a guiding question
- Location: new post-processing step in provider response pipeline

**R-S1.3 Age-Appropriate Language**
- Detect user age from `profiles` table (DOB field or explicit age bracket)
- Adjust vocabulary complexity: primary (<11) uses simple words; secondary (11-16) uses curriculum vocabulary; adult (16+) uses full academic language
- Never use slang, sarcasm, or culturally ambiguous references with under-16s

**R-S1.4 Emotional Wellbeing Detection**
- Detect distress signals: self-harm keywords, expressions of extreme frustration/hopelessness, bullying references
- On detection: pause tutoring, display a supportive message with Childline/Samaritans contact info, log incident for safeguarding review
- MUST NOT attempt to counsel — redirect to qualified humans
- Configurable sensitivity threshold per deployment context (school vs independent)

**R-S1.5 DfE 5-Area Compliance**
- Document compliance against all 5 areas:
  1. **Filtering & monitoring** — input/output safety layers
  2. **Accuracy** — deterministic math solver, fact-checking pipeline
  3. **Data protection (GDPR)** — no PII in prompts sent to LLM providers, session data retention policy
  4. **Governance** — audit trail of all AI interactions, human review mechanism
  5. **Emotional influence** — no manipulative engagement tactics, wellbeing detection
- Produce compliance checklist document for school procurement teams

#### R-S2: Persistent Student Model (Critical — Gap G2)

**R-S2.1 Student Profile Table**
- New `sage_student_profiles` table storing per-student learning state:
  - `user_id` (FK to profiles)
  - `mastery_map` (JSONB — topic → {mastery_score, last_practised, attempt_count, accuracy})
  - `misconceptions` (JSONB array — [{topic, misconception, detected_at, resolved}])
  - `learning_style` (enum: visual, auditory, reading_writing, kinesthetic — detected over time)
  - `struggle_history` (JSONB array — [{topic, struggle_level, timestamp}])
  - `total_study_minutes`, `current_streak_days`, `longest_streak_days`
  - `last_session_summary` (text — AI-generated 1-line summary of last session for continuity)

**R-S2.2 Cross-Session Memory**
- Integrate Sage with `AgentMemoryService` (Phase 7 infrastructure):
  - `memory_episodes` — record each Sage session as an episode (topic, outcome, duration, key exchanges)
  - `memory_facts` — extract student-specific facts: misconceptions, strengths, preferences
  - On session start: fetch last 5 episodes + active facts → inject as `PAST EXPERIENCE` block in system prompt
- When student returns, Sage MUST reference prior sessions naturally: "Last time we worked on quadratics — shall we continue or try something new?"

**R-S2.3 Mastery Decay**
- Implement Ebbinghaus forgetting curve on topics not practised in 7+ days
- Decay formula: `effective_mastery = stored_mastery × retention_factor(days_since_practice)`
- Retention factor: `e^(-days/stability)` where stability increases with each successful review
- Auto-suggest review of decaying topics at session start

**R-S2.4 Misconception Graph**
- Extract misconceptions from wrong answers using pattern matching and LLM analysis
- Store as `memory_facts`: `subject=student_id, relation=misconception, object="adds_denominators_in_fractions"`
- Track resolution: when student demonstrates correct understanding, mark misconception as resolved with timestamp
- Feed unresolved misconceptions into system prompt so Sage proactively addresses them

#### R-S3: Formative Assessment & Problem Banks (High — Gap G5)

**R-S3.1 Problem Bank Table**
- New `sage_problem_bank` table:
  - `id`, `subject`, `topic`, `exam_board` (nullable — AQA, Edexcel, OCR, WJEC)
  - `difficulty` (1-5 scale mapped to grade boundaries)
  - `question_text`, `question_latex` (for math expressions)
  - `answer_text`, `answer_latex`, `mark_scheme` (JSONB — marking criteria)
  - `common_errors` (JSONB array — [{error, explanation, frequency}])
  - `hints` (JSONB array — ordered hints from subtle to explicit)
  - `source` (original, licensed, ai_generated)
  - `verified` (boolean — human-reviewed)
  - Seed with minimum 200 questions per GCSE subject at launch

**R-S3.2 Quiz Generation**
- After teaching a concept, Sage auto-generates 3-5 formative questions
- Questions pulled from problem bank (matching topic + appropriate difficulty based on student mastery)
- If no matching problems exist, generate using LLM with deterministic solver verification for maths
- Track per-question: student answer, correctness, time taken, hints used

**R-S3.3 Spaced Repetition Scheduling**
- Wire existing SM-2 algorithm in `adaptive-practice.ts` to real problem bank
- Schedule reviews: 1 day → 6 days → interval × ease factor (1.3-2.5)
- Surface due reviews at session start: "You have 3 topics due for review today"
- Store schedule in `sage_student_profiles.review_schedule` (JSONB)

**R-S3.4 Answer Evaluation**
- Maths: deterministic solver checks numerical/algebraic correctness
- Open-ended (English/Science): LLM evaluates against mark scheme rubric, returns structured feedback:
  - `correct` (boolean)
  - `score` (out of available marks)
  - `feedback` (what was good, what to improve)
  - `model_answer` (only shown after student attempt)

#### R-S4: Curriculum Completion (High — Gap G4)

**R-S4.1 Full National Curriculum Mapping**
- Complete curriculum data for all GCSE subjects:
  - **English Language**: Reading (inference, comparison, evaluation), Writing (narrative, descriptive, argumentative, transactional), Spoken Language
  - **English Literature**: Poetry anthology, prose texts (set texts per board), Shakespeare, unseen poetry
  - **Combined Science**: Biology (cells, organisation, infection, bioenergetics, homeostasis, inheritance, ecology), Chemistry (atomic structure, bonding, quantitative, chemical changes, energy, rates, organic, analysis, atmosphere), Physics (energy, electricity, particle model, atomic structure, forces, waves, magnetism, space)
  - **Triple Science**: Extended content per discipline
- Each topic includes: learning objectives, prerequisites (graph edges), vocabulary, common misconceptions, estimated teaching time

**R-S4.2 Exam Board Variants**
- Map topic ordering and emphasis differences between AQA, Edexcel, OCR, WJEC
- Store as `sage_curriculum_boards` table: `subject`, `board`, `topic_id`, `paper` (1/2/3), `weighting_percent`
- Student selects exam board at onboarding → all content filtered accordingly

**R-S4.3 Prerequisite Graph**
- Directed acyclic graph of topic dependencies per subject
- Used by adaptive practice to: prevent teaching advanced topics before prerequisites are mastered, suggest remediation paths
- Stored in `sage_curriculum_prerequisites`: `topic_id`, `prerequisite_topic_id`, `strength` (hard/soft dependency)

#### R-S5: Learning Analytics & Outcomes (High — Gaps G6, G7)

**R-S5.1 Weekly Progress Digest**
- Automated weekly email/notification to student (and parent if linked, and tutor if assigned):
  - Topics covered this week
  - Mastery changes (improved/declined/new)
  - Time studied (total minutes)
  - Streak status
  - Recommended focus areas for next week
- Generated by scheduled job (Sunday evening)

**R-S5.2 Mastery Heatmap**
- Visual grid on Progress tab showing all curriculum topics colour-coded:
  - Green (≥80% mastery), Amber (50-79%), Red (<50%), Grey (not attempted)
- Clickable to drill into topic detail (attempts, accuracy trend, last practised)

**R-S5.3 Tutor Dashboard Integration**
- Human tutors linked to students see Sage activity on their student management page:
  - What topics the student studied with Sage
  - Where the student struggled (flagged misconceptions)
  - Session transcripts (opt-in, student consent required)
  - Recommended areas for human tutor to focus on

**R-S5.4 Diagnostic Assessments**
- Optional pre-assessment at start of term: 20 questions spanning curriculum, 30 minutes
- Post-assessment at end of term: same format, different questions
- Growth measurement: mastery delta per topic, overall score change
- Display as "Your Growth" report with before/after comparison

**R-S5.5 Outcome Metrics Table**
- New `sage_learning_outcomes` table:
  - `student_id`, `subject`, `assessment_type` (pre/post/formative)
  - `score`, `max_score`, `topics_tested` (JSONB)
  - `assessed_at`
- Aggregated at platform level for marketing: "Students using Sage improved X% on average"

#### R-S6: Visual & Interactive Output (Medium — Gap G8)

**R-S6.1 Diagram Generation**
- Generate Mermaid diagrams for: science processes (photosynthesis, digestion), maths graphs (quadratic curves, linear equations), flowcharts (decision trees, algorithms)
- Render in chat using existing Mermaid renderer (or add one)
- Triggered when explanation benefits from visual aid (LLM decides or student requests)

**R-S6.2 Step-by-Step Reveal**
- For worked solutions: show one step at a time with "Show next step" button
- Student attempts each step before reveal (formative, not passive)
- Track: which steps student completed independently vs needed reveal

**R-S6.3 LaTeX Rendering**
- All mathematical expressions rendered as LaTeX in chat (KaTeX or MathJax)
- Input: detect LaTeX in LLM output and student messages
- Already partially supported via math solver — extend to all chat messages

---

### 4.2 Agent Studio Requirements

#### R-A1: Agent Templates (High — Gap G9)

**R-A1.1 Template Library**
- New `ai_agent_templates` table:
  - `id`, `name`, `slug`, `description`, `subject`, `agent_type`
  - `default_system_prompt` (text — the pre-written prompt)
  - `default_skills` (JSONB array)
  - `default_guardrails` (JSONB — safety configuration)
  - `suggested_materials` (JSONB — description of what to upload)
  - `suggested_pricing` (JSONB — {min, max, recommended})
  - `icon`, `category`, `is_active`

**R-A1.2 Starter Templates (6 at launch)**
1. **GCSE Maths Tutor** — Socratic method, step-by-step problem solving, exam technique tips. Skills: algebra, geometry, statistics, number. Guardrails: never give direct answers, always show working.
2. **GCSE English Tutor** — Essay structure guidance, quote analysis, creative writing coaching. Skills: reading comprehension, essay writing, literature analysis. Guardrails: Socratic for analysis, direct for grammar rules.
3. **GCSE Science Tutor** — Concept explanation with diagrams, practical guidance, exam question practice. Skills: biology, chemistry, physics. Guardrails: flag safety for practical experiments.
4. **Exam Prep Coach** — Revision planning, past paper practice, exam technique, time management. Skills: study planning, exam strategy, stress management. Guardrails: redirect anxiety to human support.
5. **Homework Helper** — Guide through homework problems without giving answers. Skills: problem decomposition, hint provision, checking work. Guardrails: strict Socratic — never complete homework for student.
6. **Study Buddy** — Casual, encouraging study companion. Skills: flashcard creation, topic summaries, quiz generation. Guardrails: keep on-topic, age-appropriate language.

**R-A1.3 "Create from Template" Flow**
- "Create from template" button on `/ai-agents/create` page alongside existing blank creation
- Template selection grid with preview of system prompt and skills
- Pre-populates form; creator can modify everything before saving
- Track `template_id` on `ai_agents` for analytics (which templates are most used)

#### R-A2: Custom System Prompt Editor (Critical — Gap G10)

**R-A2.1 System Prompt Field**
- New `system_prompt` column (text, max 3000 chars) on `ai_agents` table
- Editor UI: full-width textarea on agent detail page (new "Behaviour" tab)
- Live preview panel: shows example student message → agent response using the custom prompt
- Character count indicator with warning at 2500+

**R-A2.2 Persona Builder (Guided Mode)**
- For creators who don't want to write raw prompts, offer guided form:
  - **Personality**: encouraging / strict / playful / neutral (dropdown)
  - **Teaching style**: Socratic (guide with questions) / Direct (explain clearly) / Adaptive (mix) (dropdown)
  - **Explanation level**: simple (primary) / intermediate (GCSE) / advanced (A-Level+) (dropdown)
  - **Special instructions**: free text for additional context (500 chars)
- Form compiles into system prompt automatically; creator can switch to raw editor to refine
- Stored in `persona_config` (JSONB) on `ai_agents` alongside compiled `system_prompt`

**R-A2.3 Guardrail Toggles**
- New `guardrail_config` (JSONB) on `ai_agents` table:
  - `allow_direct_answers` (boolean, default false) — whether agent can give homework answers directly
  - `socratic_mode` (boolean, default true) — enforce Socratic questioning
  - `age_restriction` (enum: primary / secondary / adult / unrestricted, default secondary)
  - `allowed_topics` (string array, nullable) — restrict to specific curriculum areas
  - `blocked_topics` (string array, nullable) — explicitly forbidden discussion areas
  - `escalation_message` (text) — custom message shown when agent detects need for human help
- Guardrails enforced at runtime: injected into system prompt + validated in output layer

#### R-A3: Tool Framework (High — Gap G11)

**R-A3.1 Curated Tool Registry**
- New `ai_agent_tools` table (distinct from Conductor's `analyst_tools`):
  - `id`, `name`, `slug`, `description`, `category` (learning, assessment, communication, planning)
  - `parameters_schema` (JSONB — JSON Schema for tool inputs)
  - `handler_type` (builtin / custom)
  - `handler_config` (JSONB — implementation details)
  - `is_active`, `requires_approval` (boolean — some tools need platform review)

**R-A3.2 Built-in Tools (8 at launch)**
1. **generate_quiz** — Create a quiz from current topic (params: topic, difficulty, question_count). Returns formatted questions.
2. **create_flashcards** — Generate flashcard set (params: topic, count). Returns Q&A pairs stored in student's flashcard deck.
3. **schedule_revision** — Create a revision reminder (params: topic, date, time). Sends notification to student.
4. **send_progress_summary** — Send session summary to linked parent/tutor (params: none — auto-generates from session).
5. **create_study_plan** — Generate a multi-week study plan (params: subject, exam_date, topics_to_cover). Returns structured plan.
6. **check_answer** — Verify a mathematical answer using deterministic solver (params: expression, expected_answer). Returns correct/incorrect + working.
7. **lookup_curriculum** — Search curriculum database for topic info (params: topic, exam_board). Returns objectives, prerequisites, key vocabulary.
8. **search_materials** — Search the agent's uploaded materials (params: query). Returns relevant excerpts with source attribution.

**R-A3.3 Tool Execution Runtime**
- Extend session streaming handler to support ReAct loop (same pattern as `SpecialistAgentRunner`):
  - LLM generates `TOOL_CALL: tool_name(params)` in response
  - Runtime intercepts, executes tool, injects result back into conversation
  - Max 3 tool calls per message to prevent infinite loops
- Built-in tools execute server-side with no external API calls
- All tool calls logged in `ai_agent_tool_calls` table for analytics and safety audit

**R-A3.4 Custom Tool Builder (Phase 2)**
- Advanced creators can define custom tools:
  - Name, description, parameter schema (JSON Schema editor)
  - Webhook URL (tool calls POST to creator's endpoint)
  - Response schema (expected return format)
- Sandboxed execution: 5s timeout, response size limit (10KB), no PII forwarding
- Requires platform approval before activation (`requires_approval = true`)

#### R-A4: Per-Student Adaptation (High — Gap G12)

**R-A4.1 Student Context Injection**
- When a client starts a session with a marketplace agent:
  - Fetch client's `sage_student_profiles` record (if exists)
  - Inject into system prompt: learning level, mastery scores for agent's subject, known misconceptions, learning style
  - Format as `STUDENT CONTEXT` block (similar to Conductor's PlatformUserContext pattern)

**R-A4.2 Agent-Student Memory**
- Per agent-student pair memory using `memory_episodes` table:
  - `agent_slug` = `ai-agent-{agent_id}` (namespace marketplace agents separately from Conductor agents)
  - Record each session as episode: topics discussed, student performance, session outcome
  - On session start: fetch last 3 episodes with this student → inject as context
- Agent should naturally reference past sessions: "Good to see you again — last time we covered photosynthesis"

**R-A4.3 Adaptive Difficulty**
- Agent adjusts explanation complexity based on demonstrated understanding:
  - If student answers correctly on first attempt → increase difficulty
  - If student needs 3+ hints → simplify language, break into smaller steps
  - Track `session_difficulty_level` (1-5) that drifts during session
- Use guardrail_config `age_restriction` as floor (never go below age-appropriate level)

#### R-A5: Creator Analytics Dashboard (Medium — Gap G14)

**R-A5.1 Revenue Analytics**
- Per-agent: total revenue, revenue this month, revenue trend (sparkline)
- Per-agent: sessions this month, average session duration, returning students (%)
- Aggregate: total revenue across all agents, best-performing agent, revenue per subject

**R-A5.2 Learning Outcome Analytics**
- Per-agent: average rating, rating trend, NPS score (from reviews)
- Per-agent: session completion rate, escalation rate, average messages per session
- Student engagement: unique students, sessions per student, retention (returned within 7 days)

**R-A5.3 Cost & ROI**
- Per-agent: AI cost per session (tokens × price), platform fee, net margin
- Suggestion engine: "Your agent costs £0.08/session in AI — consider adding more materials to reduce token usage"

#### R-A6: Safety & Content Policies (High — Gap G13)

**R-A6.1 Per-Agent Content Policy**
- Creator configures via guardrail_config (R-A2.3)
- Runtime enforces: blocked topics trigger refusal response, age restriction adjusts vocabulary
- Platform-level override: platform safety layer runs AFTER agent-level policies

**R-A6.2 Platform Safety Layer**
- ALL agent responses (marketplace and platform-owned) pass through safety classifier before delivery
- Block: harmful content, PII exposure, prompt injection artifacts, off-topic for agent's subject
- Same classifier as Sage (R-S1) — shared infrastructure

**R-A6.3 Age-Gating**
- Agents specify target age range via `guardrail_config.age_restriction`
- Platform enforces: if student profile age < agent minimum, session creation blocked with clear message
- Default: secondary (11-16) — most common tutoring demographic

**R-A6.4 Reporting & Moderation**
- Students can flag concerning agent responses (new `ai_agent_reports` table)
- Platform reviews flagged content; can: warn creator, suspend agent, ban creator
- Auto-suspend: if agent receives 3+ flags in 7 days, auto-unpublish pending review
- Creator notification on flag with ability to respond

#### R-A7: Multi-Agent Handoff (Medium — Gap G15)

**R-A7.1 Escalation to Human Tutor**
- Already partially implemented (session escalation)
- Enhance: pass conversation context to human tutor so they can continue where AI left off
- Notification to agent owner with session transcript

**R-A7.2 Agent-to-Agent Referral**
- Agent can suggest another marketplace agent: "For chemistry help, you might also try [Agent Name]"
- Track referrals in `ai_agent_referrals` table: `source_agent_id`, `target_agent_id`, `student_id`, `converted` (boolean)
- Revenue share: referring agent gets 5% of referred session revenue (incentivises collaboration)

---

## 5. Database Schema Changes

### 5.1 New Tables

```sql
-- Sage: Persistent student model
CREATE TABLE sage_student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mastery_map JSONB NOT NULL DEFAULT '{}',
    misconceptions JSONB NOT NULL DEFAULT '[]',
    learning_style VARCHAR(20),  -- visual, auditory, reading_writing, kinesthetic
    struggle_history JSONB NOT NULL DEFAULT '[]',
    review_schedule JSONB NOT NULL DEFAULT '{}',
    total_study_minutes INTEGER NOT NULL DEFAULT 0,
    current_streak_days INTEGER NOT NULL DEFAULT 0,
    longest_streak_days INTEGER NOT NULL DEFAULT 0,
    last_session_summary TEXT,
    last_session_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Sage: Problem bank
CREATE TABLE sage_problem_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(200) NOT NULL,
    exam_board VARCHAR(20),  -- AQA, Edexcel, OCR, WJEC, null=universal
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    question_text TEXT NOT NULL,
    question_latex TEXT,
    answer_text TEXT NOT NULL,
    answer_latex TEXT,
    mark_scheme JSONB NOT NULL DEFAULT '{}',
    common_errors JSONB NOT NULL DEFAULT '[]',
    hints JSONB NOT NULL DEFAULT '[]',
    source VARCHAR(20) NOT NULL DEFAULT 'ai_generated',  -- original, licensed, ai_generated
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sage: Curriculum structure
CREATE TABLE sage_curriculum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(50) NOT NULL,
    topic_name VARCHAR(200) NOT NULL,
    topic_slug VARCHAR(200) NOT NULL,
    parent_topic_id UUID REFERENCES sage_curriculum_topics(id),
    level VARCHAR(20) NOT NULL,  -- gcse_foundation, gcse_higher, a_level
    learning_objectives JSONB NOT NULL DEFAULT '[]',
    vocabulary JSONB NOT NULL DEFAULT '[]',
    common_misconceptions JSONB NOT NULL DEFAULT '[]',
    estimated_hours NUMERIC(4,1),
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(subject, topic_slug, level)
);

-- Sage: Curriculum prerequisites (DAG edges)
CREATE TABLE sage_curriculum_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES sage_curriculum_topics(id) ON DELETE CASCADE,
    prerequisite_topic_id UUID NOT NULL REFERENCES sage_curriculum_topics(id) ON DELETE CASCADE,
    strength VARCHAR(10) NOT NULL DEFAULT 'hard',  -- hard (must know), soft (helps to know)
    UNIQUE(topic_id, prerequisite_topic_id)
);

-- Sage: Exam board topic mapping
CREATE TABLE sage_curriculum_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(50) NOT NULL,
    exam_board VARCHAR(20) NOT NULL,
    topic_id UUID NOT NULL REFERENCES sage_curriculum_topics(id) ON DELETE CASCADE,
    paper INTEGER,  -- 1, 2, 3
    weighting_percent NUMERIC(4,1),
    UNIQUE(subject, exam_board, topic_id)
);

-- Sage: Learning outcomes (pre/post assessment)
CREATE TABLE sage_learning_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,
    assessment_type VARCHAR(20) NOT NULL,  -- pre, post, formative
    score NUMERIC(5,1) NOT NULL,
    max_score NUMERIC(5,1) NOT NULL,
    topics_tested JSONB NOT NULL DEFAULT '[]',
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent Studio: Templates
CREATE TABLE ai_agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    subject VARCHAR(50),
    agent_type VARCHAR(50),
    default_system_prompt TEXT NOT NULL,
    default_skills JSONB NOT NULL DEFAULT '[]',
    default_guardrails JSONB NOT NULL DEFAULT '{}',
    suggested_materials JSONB NOT NULL DEFAULT '[]',
    suggested_pricing JSONB NOT NULL DEFAULT '{}',
    icon VARCHAR(50),
    category VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent Studio: Tool registry
CREATE TABLE ai_agent_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,  -- learning, assessment, communication, planning
    parameters_schema JSONB NOT NULL DEFAULT '{}',
    handler_type VARCHAR(20) NOT NULL DEFAULT 'builtin',  -- builtin, custom
    handler_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent Studio: Tool call log
CREATE TABLE ai_agent_tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES ai_agent_sessions(id) ON DELETE CASCADE,
    tool_slug VARCHAR(200) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success',  -- success, error, timeout
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent Studio: Reports (moderation)
CREATE TABLE ai_agent_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    session_id UUID REFERENCES ai_agent_sessions(id),
    reporter_id UUID NOT NULL REFERENCES profiles(id),
    reason VARCHAR(50) NOT NULL,  -- harmful_content, inappropriate, off_topic, privacy, other
    description TEXT,
    message_content TEXT,  -- the specific message being reported
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, reviewed, dismissed, actioned
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    action_taken VARCHAR(50),  -- warning, suspension, ban, dismissed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent Studio: Agent-to-agent referrals
CREATE TABLE ai_agent_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    target_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    converted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.2 Column Additions to Existing Tables

```sql
-- ai_agents: custom prompt + guardrails + template tracking
ALTER TABLE ai_agents ADD COLUMN system_prompt TEXT;
ALTER TABLE ai_agents ADD COLUMN persona_config JSONB;
ALTER TABLE ai_agents ADD COLUMN guardrail_config JSONB NOT NULL DEFAULT '{"allow_direct_answers": false, "socratic_mode": true, "age_restriction": "secondary", "allowed_topics": null, "blocked_topics": null, "escalation_message": null}';
ALTER TABLE ai_agents ADD COLUMN template_id UUID REFERENCES ai_agent_templates(id);
```

---

## 6. Architecture

### 6.1 Sage Safety Pipeline

```
Student Message
       │
       ▼
┌──────────────┐    Block + log
│ Input Safety  │───────────────→ [Safeguarding Alert]
│  Classifier   │
└──────┬───────┘
       │ pass
       ▼
┌──────────────┐
│ Student Model │ ← fetch mastery, misconceptions, memory episodes
│   Injection   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  LLM Provider │ ← system prompt + RAG + curriculum + student context
│    Chain      │
└──────┬───────┘
       │
       ▼
┌──────────────┐    Rewrite if Socratic violation
│ Output Safety │───────────────→ [Rewrite as guiding question]
│  Validator    │
└──────┬───────┘
       │ pass
       ▼
┌──────────────┐
│   Response    │ → Stream to student
│   Delivery    │
└──────┬───────┘
       │ (async, fire-and-forget)
       ▼
┌──────────────┐
│  Post-Session │ → Update student model, record episode, extract facts
│   Processing  │
└──────────────┘
```

### 6.2 Agent Studio Tool Execution

```
Student Message
       │
       ▼
┌──────────────┐
│ System Prompt │ ← creator's custom prompt + guardrails + student context
│  Assembly     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│           ReAct Loop (max 3)          │
│                                       │
│  LLM Response ──→ TOOL_CALL detected? │
│       │                    │          │
│       │ no                 │ yes      │
│       ▼                    ▼          │
│  [Final Response]   Execute Tool      │
│                        │              │
│                        ▼              │
│                  Inject Result        │
│                     into LLM ────────→│
└──────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│ Safety Layer  │ ← platform + agent-level guardrails
└──────┬───────┘
       │
       ▼
  Stream to Student
```

### 6.3 Student Model Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Sage Chat   │────→│  Student     │────→│  memory_episodes  │
│  Session     │     │  Profile     │     │  memory_facts     │
└─────────────┘     │  Service     │     └──────────────────┘
                     └──────┬──────┘
┌─────────────┐            │          ┌──────────────────┐
│ Agent Studio │────────────┘         │ sage_student_     │
│  Session     │                      │ profiles          │
└─────────────┘                       └──────────────────┘
       │                                       │
       │            ┌──────────────┐           │
       └───────────→│  Analytics   │←──────────┘
                    │  & Digests   │
                    └──────────────┘
```

---

## 7. Implementation Roadmap

### Phase Overview

| Phase | Name | Duration | Gaps Addressed | Priority |
|---|---|---|---|---|
| **S1** | Safety & Guardrails | 2 weeks | G1, G3 | Critical |
| **A2** | Custom System Prompt | 1 week | G10 | Critical |
| **S2** | Persistent Student Model | 2 weeks | G2 | Critical |
| **A1** | Agent Templates | 1 week | G9 | High |
| **S3** | Problem Banks & Assessment | 2 weeks | G5 | High |
| **A3** | Tool Framework | 2 weeks | G11 | High |
| **A6** | Safety & Content Policies | 1 week | G13 | High |
| **S4** | Curriculum Completion | 2 weeks | G4 | High |
| **A4** | Per-Student Adaptation | 1 week | G12 | High |
| **S5** | Learning Analytics & Outcomes | 2 weeks | G6, G7 | High |
| **A5** | Creator Analytics | 1 week | G14 | Medium |
| **S6** | Visual & Interactive Output | 2 weeks | G8 | Medium |
| **A7** | Multi-Agent Handoff | 1 week | G15 | Medium |

### Phase S1: Safety & Guardrails (Weeks 1-2)

**Week 1: Input Safety + Output Validation**

| Step | Task | Detail |
|---|---|---|
| 1 | Create `sage/safety/input-classifier.ts` | Rules-based classifier: regex patterns for prompt injection (e.g., "ignore previous instructions"), profanity wordlist, self-harm keywords (NCMEC/IWF reference lists). Returns `{safe: boolean, category: string, confidence: number}` |
| 2 | Create `sage/safety/output-validator.ts` | Check LLM output for: direct answers in Socratic mode (detect patterns like "The answer is X"), PII (regex for emails, phone numbers, postcodes), inappropriate content (reuse input classifier patterns). Returns `{valid: boolean, violations: string[], rewritten?: string}` |
| 3 | Create `sage/safety/wellbeing-detector.ts` | Keyword + phrase matching for distress signals. Severity levels: low (frustration), medium (distress), high (self-harm). High → immediate supportive message + Childline/Samaritans info + log to `sage_safeguarding_events` table |
| 4 | Wire into `SageOrchestrator.processMessage()` | Insert input classifier before provider call. Insert output validator after provider response. Insert wellbeing detector on every student message. All async, all fire-and-forget logging |
| 5 | Create `sage_safeguarding_events` table | Migration: id, user_id, session_id, event_type, severity, details, created_at. RLS: admin-only read |

**Week 2: Age-Appropriate + DfE Compliance**

| Step | Task | Detail |
|---|---|---|
| 6 | Add age detection to `SageOrchestrator` | Fetch DOB from `profiles` table at session start. Compute age bracket: primary (<11), secondary (11-16), adult (16+). Store on session object |
| 7 | Create `sage/safety/age-adapter.ts` | Given age bracket, return: vocabulary level (simple/intermediate/advanced), forbidden topic list, tone guidelines. Inject into system prompt |
| 8 | Create DfE compliance checklist | Document: `conductor/sage-dfe-compliance.md`. Map each of the 5 DfE areas to specific implementation in Sage. Identify any remaining gaps |
| 9 | Add safety headers to all Sage API responses | `X-Safety-Checked: true`, `X-Content-Rating: secondary`. Useful for audit trail |
| 10 | Integration tests | Test: prompt injection blocked, Socratic enforcement works, wellbeing detection fires, age-appropriate responses generated |

### Phase A2: Custom System Prompt (Week 3)

| Step | Task | Detail |
|---|---|---|
| 1 | Migration: add columns to `ai_agents` | `system_prompt TEXT`, `persona_config JSONB`, `guardrail_config JSONB DEFAULT '{...}'`, `template_id UUID` |
| 2 | Create "Behaviour" tab on agent detail page | Textarea for `system_prompt` (3000 char limit), character counter. Side panel: live preview (enter sample question → see response with custom prompt) |
| 3 | Build persona builder component | Guided form: personality dropdown, teaching style dropdown, explanation level dropdown, special instructions text. Auto-compiles to system prompt |
| 4 | Build guardrail toggle panel | Toggle switches for: allow_direct_answers, socratic_mode. Dropdown for age_restriction. Tag inputs for allowed_topics, blocked_topics. Textarea for escalation_message |
| 5 | Wire into session streaming | In `POST /api/ai-agents/sessions/[sessionId]/stream`: read agent's `system_prompt` + `guardrail_config`. Inject into LLM system prompt. Enforce guardrails in output validation |
| 6 | Tests | Verify: custom prompt used in session, guardrails block direct answers when configured, age restriction enforced |

### Phase S2: Persistent Student Model (Weeks 3-4)

| Step | Task | Detail |
|---|---|---|
| 1 | Migration: create `sage_student_profiles` | Schema per Section 5.1. Add RLS: users can read/update own profile only. Index on `user_id` |
| 2 | Create `sage/services/student-model.ts` | Service: `getOrCreateProfile(userId)`, `updateMastery(userId, topic, result)`, `addMisconception(userId, topic, misconception)`, `resolveMisconception(userId, misconceptionId)`, `updateStudyTime(userId, minutes)`, `getDecayedMastery(userId)` |
| 3 | Implement mastery decay | In `getDecayedMastery()`: apply `e^(-days/stability)` to each topic's stored mastery. Stability starts at 14 days, increases by 1.5x per successful review |
| 4 | Wire into `SageOrchestrator` | At session start: fetch student profile + memory episodes + memory facts. Inject as `STUDENT CONTEXT` block in system prompt. At session end: update mastery, record episode, extract facts |
| 5 | Integrate with `AgentMemoryService` | In `SageOrchestrator`: call `memoryService.fetchMemoryBlock('sage', userId)` at start. Call `memoryService.recordEpisode()` at end. Call `memoryService.extractAndStoreFacts()` for outputs >200 chars |
| 6 | Add review suggestions | At session start: check `review_schedule` for due topics. If any, suggest: "You have 3 topics due for review — shall we start with [topic]?" |
| 7 | Add continuity prompting | In system prompt: include `last_session_summary`. Instruct LLM: "Reference the student's previous session naturally if relevant" |
| 8 | Tests | Verify: profile persists across sessions, mastery updates correctly, decay formula works, memory integration functional |

### Phase A1: Agent Templates (Week 4)

| Step | Task | Detail |
|---|---|---|
| 1 | Migration: create `ai_agent_templates` | Schema per Section 5.1. Seed 6 templates with system prompts, skills, guardrails |
| 2 | Create template selection UI | Grid of 6 template cards on `/ai-agents/create`. Each shows: icon, name, description, subject, preview of system prompt (truncated) |
| 3 | Wire "Create from template" flow | On template select: pre-populate `AIAgentBuilderForm` with template's defaults. Set `template_id` on created agent |
| 4 | Add `GET /api/ai-agents/templates` route | Returns active templates. No auth required (public) |
| 5 | Track template usage in analytics | Query: which templates → most agent creations, which templates → highest quality scores |

### Phase S3: Problem Banks & Assessment (Weeks 5-6)

| Step | Task | Detail |
|---|---|---|
| 1 | Migration: create `sage_problem_bank` + `sage_learning_outcomes` | Schema per Section 5.1. Indexes on (subject, topic, difficulty) and (student_id, subject) |
| 2 | Seed initial problem bank | AI-generate 200 questions per subject (Maths, English, Science) using LLM + verify maths answers with deterministic solver. Mark as `source='ai_generated', verified=false` |
| 3 | Create `sage/assessment/quiz-generator.ts` | Given topic + difficulty + count: pull from problem bank. If insufficient problems, generate on-the-fly with LLM. Return formatted quiz |
| 4 | Create `sage/assessment/answer-evaluator.ts` | Maths: check via hybrid solver. Open-ended: LLM evaluates against mark scheme, returns {correct, score, feedback, model_answer} |
| 5 | Wire quiz into conversation flow | After teaching a concept (detected by topic coverage tracker): "Let's check your understanding — here are 3 quick questions". Present one at a time, evaluate answers, update mastery |
| 6 | Implement diagnostic assessment | Endpoint: `POST /api/sage/assessment/diagnostic`. 20 questions spanning curriculum. Timed (30 min). Stores results in `sage_learning_outcomes`. Available as pre/post assessment |
| 7 | Wire spaced repetition | Connect SM-2 in `adaptive-practice.ts` to real problem bank. Schedule stored in `sage_student_profiles.review_schedule`. Surface due reviews at session start |
| 8 | Tests | Verify: quiz generation works, answer evaluation correct for maths, mastery updates from quiz results, spaced repetition scheduling |

### Phase A3: Tool Framework (Weeks 5-6)

| Step | Task | Detail |
|---|---|---|
| 1 | Migration: create `ai_agent_tools` + `ai_agent_tool_calls` | Schema per Section 5.1. Seed 8 built-in tools |
| 2 | Create `apps/web/src/lib/ai-agents/tools/registry.ts` | Tool registry: load tools from DB, validate parameters against schema, route to handler |
| 3 | Create `apps/web/src/lib/ai-agents/tools/handlers/` | One handler per built-in tool: generate-quiz.ts, create-flashcards.ts, schedule-revision.ts, send-progress-summary.ts, create-study-plan.ts, check-answer.ts, lookup-curriculum.ts, search-materials.ts |
| 4 | Create `apps/web/src/lib/ai-agents/tools/executor.ts` | ReAct loop executor: detect TOOL_CALL in LLM output, parse tool name + params, execute via registry, inject result, continue loop. Max 3 iterations |
| 5 | Wire into session streaming handler | In `POST /api/ai-agents/sessions/[sessionId]/stream`: if agent has tools enabled, use ReAct executor instead of direct LLM call. Log all tool calls |
| 6 | Add tools UI to agent detail page | New "Tools" tab: toggle which tools this agent can use. Checkbox list of available tools |
| 7 | Tests | Verify: tool calls detected and executed, max 3 iterations enforced, tool call logging works, error handling for failed tools |

### Phase A6: Agent Safety & Content Policies (Week 7)

| Step | Task | Detail |
|---|---|---|
| 1 | Migration: create `ai_agent_reports` | Schema per Section 5.1 |
| 2 | Wire platform safety layer | Reuse Sage's `output-validator.ts` in agent session streaming. All agent responses pass through safety check before delivery |
| 3 | Enforce guardrail_config at runtime | In session streaming: read agent's `guardrail_config`. Block topics in `blocked_topics`. Enforce Socratic if enabled. Check age restriction against student profile |
| 4 | Build report UI | "Report this response" button on each agent message in session chat. Modal: select reason, describe issue, submit |
| 5 | Build admin moderation queue | `/admin/ai-agents/reports` page: list pending reports, review action buttons (dismiss, warn, suspend, ban) |
| 6 | Auto-suspend logic | Trigger: 3+ pending reports in 7 days → auto-unpublish agent, notify creator |

### Phase S4: Curriculum Completion (Weeks 7-8)

| Step | Task | Detail |
|---|---|---|
| 1 | Migration: create `sage_curriculum_topics` + `sage_curriculum_prerequisites` + `sage_curriculum_boards` | Schema per Section 5.1 |
| 2 | Seed English curriculum | GCSE English Language: 15 topics (reading inference, comparison, evaluation, narrative writing, etc.). GCSE English Literature: 20 topics (poetry, prose set texts by board, Shakespeare, unseen poetry) |
| 3 | Seed Science curriculum | Combined Science: 23 Biology + 20 Chemistry + 21 Physics topics. Triple: extended topics per discipline |
| 4 | Seed prerequisite graph | For each subject: define hard/soft dependencies between topics. E.g., "simultaneous equations" requires "linear equations" (hard) and "substitution" (soft) |
| 5 | Seed exam board mappings | Map all topics to AQA, Edexcel, OCR for Maths, English, Science. Include paper number and weighting |
| 6 | Update `sage/curriculum/resolver.ts` | Replace hardcoded curriculum data with DB queries. Support exam board filtering. Use prerequisite graph for learning path suggestions |
| 7 | Add exam board selection | Student onboarding: select exam board per subject. Store on `sage_student_profiles`. Filter all curriculum content accordingly |

### Phase A4: Per-Student Adaptation (Week 8)

| Step | Task | Detail |
|---|---|---|
| 1 | Student context injection | In session streaming: fetch client's `sage_student_profiles` record. Inject mastery map, misconceptions, learning style as `STUDENT CONTEXT` block |
| 2 | Agent-student memory | Namespace marketplace agent memory as `ai-agent-{agent_id}`. Record sessions as episodes. Fetch last 3 on session start |
| 3 | Adaptive difficulty tracking | Track `session_difficulty_level` (1-5). Increase on correct first-attempt answers, decrease on 3+ hints needed. Inject current level into system prompt |

### Phase S5: Learning Analytics & Outcomes (Weeks 9-10)

| Step | Task | Detail |
|---|---|---|
| 1 | Build mastery heatmap component | Visual grid on Progress tab. Topics from curriculum DB. Colour: green (≥80), amber (50-79), red (<50), grey (untouched). Click to drill into topic |
| 2 | Build weekly digest generator | Scheduled job (Sunday 18:00 UTC): for each active student, generate digest from past week's sessions. Email via existing notification system |
| 3 | Build tutor dashboard integration | On tutor's student management page: show Sage activity (topics, struggles, session count). Requires student consent flag |
| 4 | Build diagnostic assessment UI | `/sage/assessment` page: start pre/post assessment. Timer, progress bar, question-by-question navigation. Results page with score + topic breakdown |
| 5 | Build growth report | "Your Growth" page: pre vs post assessment scores, mastery changes over time, study time trend. Exportable as PDF for school reports |
| 6 | Platform aggregate metrics | Admin dashboard: total students, average mastery improvement, subject breakdown, cost per student |

### Phase A5: Creator Analytics (Week 10)

| Step | Task | Detail |
|---|---|---|
| 1 | Build revenue analytics component | Per-agent revenue, sessions, returning students. Aggregate across all creator's agents |
| 2 | Build learning outcome component | Ratings trend, completion rate, escalation rate, engagement metrics |
| 3 | Build cost/ROI panel | AI cost per session, margin analysis, optimisation suggestions |
| 4 | Replace existing basic Analytics tab | Swap current simple analytics on agent detail page with new comprehensive dashboard |

### Phase S6: Visual & Interactive Output (Weeks 11-12)

| Step | Task | Detail |
|---|---|---|
| 1 | Add Mermaid rendering | Detect Mermaid code blocks in LLM output. Render as SVG in chat. Support: flowcharts, sequence diagrams, graphs |
| 2 | Add KaTeX rendering | Detect LaTeX expressions (`$...$` and `$$...$$`) in chat messages. Render inline and display math |
| 3 | Build step-by-step reveal component | For worked solutions: parse steps, show one at a time with "Show next step" / "Try this step first" buttons. Track independent vs revealed steps |
| 4 | Add diagram generation prompting | In system prompt: instruct LLM to generate Mermaid diagrams when visual explanation helps. Provide examples of good diagram prompts |

### Phase A7: Multi-Agent Handoff (Week 12)

| Step | Task | Detail |
|---|---|---|
| 1 | Migration: create `ai_agent_referrals` | Schema per Section 5.1 |
| 2 | Enhance escalation flow | On escalation: pass full conversation context to human tutor. Include student model data and session summary |
| 3 | Build agent referral system | Agent can suggest related agents. Track referrals and conversions. 5% revenue share on converted referrals |
| 4 | Wire referral into session UI | "Suggested agents" section after session ends based on topics discussed but outside current agent's expertise |

---

## 8. Success Metrics

### 8.1 Sage Metrics

| Metric | Current Baseline | Target (6 months) | Measurement |
|---|---|---|---|
| Safety incidents | Unknown (no tracking) | 0 undetected | `sage_safeguarding_events` table |
| Session persistence | 0% (in-memory) | 100% | `sage_student_profiles` record count |
| Cross-session continuity | 0% | >80% of returning students get contextual greeting | Sample audit |
| Mastery tracking coverage | Maths only | Maths + English + Science | `sage_curriculum_topics` count |
| Problem bank size | 0 verified problems | 1000+ (200/subject minimum) | `sage_problem_bank` WHERE verified=true |
| Student return rate | Unknown | >40% within 7 days | Session analytics |
| Learning outcome measurement | None | Pre/post scores for >20% of active students | `sage_learning_outcomes` count |
| Average mastery improvement | Unmeasured | >15% over 8 weeks | Pre/post delta |
| DfE compliance | Not assessed | Full 5-area compliance | Checklist document |

### 8.2 Agent Studio Metrics

| Metric | Current Baseline | Target (6 months) | Measurement |
|---|---|---|---|
| Template usage | N/A (no templates) | >60% of new agents use template | `ai_agents.template_id IS NOT NULL` |
| Agents with custom prompt | 0% | >70% of published agents | `ai_agents.system_prompt IS NOT NULL` |
| Tool-enabled agents | 0% | >30% of published agents | Join ai_agents ↔ ai_agent_tools |
| Average quality score | Unknown | >65 (good tier) | `ai_agents.quality_score` avg |
| Creator retention (30-day) | Unknown | >50% | Creator login within 30 days of creation |
| Student returning to same agent | Unknown | >35% | Session analytics (unique student per agent) |
| Reports per 1000 sessions | Unknown | <5 | `ai_agent_reports` / session count |
| Revenue per creator per month | Unknown | >£50 average | Session revenue aggregation |

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Safety incident in school setting | Medium | Critical | Phase S1 is first priority. Never skip safety for features. External audit before school sales |
| Problem bank quality too low at launch | Medium | High | Use AI-generated questions with human verification pass. Partner with exam board content providers |
| Creators don't adopt custom prompts | Medium | Medium | Persona builder (guided mode) lowers barrier. Templates pre-populate good defaults |
| Student model adds latency | Low | Medium | Async fetches in parallel. Cache student profile in session. Profile fetch <100ms with index |
| Tool framework abuse (custom tools) | Low | High | Require platform approval for custom tools. Sandbox execution with timeouts. Rate limits |
| Curriculum data errors | Medium | Medium | Community flagging mechanism. Admin review queue. Start with verified exam board specs |
| Memory/fact extraction hallucination | Low | Medium | Only extract facts from outputs >200 chars. Max 4 facts per run. Human-reviewable via admin UI |
| Multi-agent referral spam | Low | Low | Rate limit referrals per agent per day. Require minimum quality score to participate |

---

## 10. Dependencies

| Dependency | Status | Required By |
|---|---|---|
| `AgentMemoryService` (Phase 7) | Live | Phase S2 (student model memory) |
| `memory_episodes` + `memory_facts` tables | Live (migration 386) | Phase S2, Phase A4 |
| `profiles` table (DOB/age field) | Exists | Phase S1 (age-appropriate language) |
| Stripe billing integration | Live | No new dependency — already handles Sage Pro + Agent subscriptions |
| `sage_knowledge_chunks` table | Live | Phase A3 (lookup_curriculum tool fallback) |
| `platform_notifications` table | Live (migration 353) | Phase A3 (schedule_revision tool) |
| Supabase email/notification service | Live | Phase S5 (weekly digest) |
| `SageOrchestrator` | Live | All Sage phases modify this |
| Agent session streaming route | Live | All Agent Studio phases modify this |

---

## 11. Competitive Positioning

After full implementation, Tutorwise's position relative to market leaders:

| Capability | Khanmigo | Carnegie | Oak Aila | Century Tech | **Tutorwise (Post-Implementation)** |
|---|---|---|---|---|---|
| Socratic method | Yes | No (adaptive drill) | Yes | No | **Yes** (enforced with output validation) |
| Persistent student model | Basic | Advanced | No | Advanced | **Advanced** (mastery + misconceptions + memory) |
| Safety (DfE compliant) | US-focused | US-focused | Yes (UK DfE) | Partial | **Yes** (UK DfE 5-area) |
| Multi-subject | All subjects | Maths only | All subjects | All subjects | **Maths + English + Science** (expandable) |
| Problem bank | Crowdsourced | Proprietary (50K+) | Exam board aligned | Proprietary | **AI-generated + verified** (1000+ at launch) |
| Marketplace model | No | No | No | No | **Yes — unique differentiator** |
| Custom agent creation | No | No | No | No | **Yes — templates + tools + custom prompts** |
| Multi-modal input | Text only | Text only | Text only | Text only | **Text + voice + image/OCR** |
| Learning analytics | Basic | Advanced | Teacher-facing | Advanced | **Advanced** (heatmaps + digests + diagnostics) |
| Pricing | $44/year (school) | Site license | Free | Site license | **£10/month Pro + marketplace agents** |

**Tutorwise's unique edge:** The only platform where tutors create, customise, and sell AI agents with real pedagogical tools — not just chatbots. Combine marketplace supply with platform safety and outcome measurement.

---

## Appendix A: Research References

| Source | Key Finding | URL/Citation |
|---|---|---|
| Khan Academy | Khanmigo: 700K students, Socratic AI tutor, classroom mode | khanacademy.org/khan-labs |
| Carnegie Learning | MATHia: 2x test score gains (RAND Corporation study), adaptive student model | carnegielearning.com |
| Oak National Academy | Aila: DfE-certified AI lesson assistant, UK curriculum aligned | thenational.academy/aila |
| Century Tech | Neuroscience-based adaptive learning, 1M+ students, UK + international | century.tech |
| Duolingo | Max: GPT-4 roleplay, 100M+ MAU, gamified retention mechanics | duolingo.com |
| UK DfE | Generative AI in Education Safety Framework (Jan 2026): 5 areas | gov.uk/government/publications |
| LangChain | State of AI Agents (Dec 2025): 57% orgs have agents in production | langchain.com/stateofaiagents |
| McKinsey | Agents at Scale: "20% technology, 80% workflow" | mckinsey.com |
| Composio | "Why AI Agent Pilots Fail": 85% per-step → 20% on 10-step chains | composio.dev |
| ServiceNow | AI Agent Studio: template-first builder, guardrail config, Now Assist | servicenow.com/ai-agents |
| Salesforce | Agentforce: pre-built templates, Atlas reasoning engine, 1B+ agents | salesforce.com/agentforce |
| HubSpot | AI agents resolve 35% of support tickets | hubspot.com |
| Anthropic | Prompt caching: 90% input cost reduction | anthropic.com |
| Education Endowment Foundation | Meta-analyses on effective tutoring interventions | educationendowmentfoundation.org.uk |

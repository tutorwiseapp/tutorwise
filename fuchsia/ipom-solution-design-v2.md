# Tutorwise iPOM — Intelligent Platform Operations Management

**Product**: Tutorwise iPOM (Product 3)
**Status**: Architecture v2.0 — Ready for Phased Implementation
**Date**: 2026-03-05
**Owner**: Product Team
**Version**: 2.0 — Supersedes v1.0
**Changes from v1.0**: Holistic architecture additions (learning loop + cross-agent context), `platform_events` dedicated table, async knowledge pipelines, cross-workflow coordination, AI tier routing, cost attribution, in-app notification UI design, Growth Score definition (D12), 10 new design decisions (D12–D21), corrected hour estimates, resolved open questions.

---

## 1. Product Vision

### 1.1 What Is iPOM?

Tutorwise iPOM is the intelligent operating system for the Tutorwise marketplace. It is the engine that makes Products 1 and 2 sustainable and scalable — not by adding features users see, but by making the platform run itself.

iPOM turns Tutorwise from a managed marketplace (humans operating every workflow) into an **autonomous, self-improving marketplace**: the platform handles routine operations, learns whether its decisions were correct, and presents humans only with genuine judgment calls. It connects every system Tutorwise has built — CAS, Sage, Lexi, Growth, Process Studio, AI Agent Studio — into a coherent, self-aware platform with a single operational interface.

### 1.2 One-Line Pitch

> "iPOM makes Tutorwise run itself — automating routine operations, improving its own accuracy over time, and surfacing only what genuinely requires human judgment."

### 1.3 The Three-Product Model

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCT 1 — TUTORWISE MARKETPLACE                              │
│  The network: tutors, clients, agents, organisations            │
│  Listings, bookings, payments, referrals, reviews               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PRODUCT 2 — TUTORWISE AI                                       │
│  The intelligence: Sage (tutoring), Growth (advisor),           │
│  Lexi (help), AI Agent Studio (marketplace agents)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PRODUCT 3 — TUTORWISE iPOM                                     │
│  The engine room: autonomous operations, self-improving         │
│  intelligence, coherent user experience, exception management   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 The Strategic Problem

The Tutorwise platform has evolved iteratively into powerful but disconnected capabilities:

| System | What it does | What it lacks |
|--------|-------------|---------------|
| Process Studio | Automates workflows with HITL | No agent integration, no cross-system visibility |
| CAS | Builds and deploys AI agents | Focused on dev pipeline, not operational intelligence |
| Sage | Delivers AI tutoring | Events isolated, feedback not cross-system |
| Lexi | Answers platform questions | Knowledge goes stale, no write actions, starts from zero each session |
| Growth | Advises tutors on growth | Read-only Phase 1; actions not wired to platform |
| Admin pages | Show operational data | Reactive, manual, no AI intelligence layer |

The strategic problem is not that any individual system is broken. It is that they form **seven silos that happen to share a database**. No system knows what another is doing. No admin view shows the whole picture. Every new agent duplicates subscription logic, API routes, and UI.

```
BEFORE iPOM — Seven Silos

  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
  │  Sage  │  │  Lexi  │  │ Growth │  │  CAS   │  │Process │  │AI Agent│  │ Admin  │
  │runtime │  │runtime │  │runtime │  │pipeline│  │ Studio │  │ Studio │  │ pages  │
  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
      │            │            │            │            │            │            │
      │ own sub    │ no sub     │ own sub    │ own jobs   │ own HITL   │ own reg    │ no AI
      │ table      │ rate limit │ table      │            │            │            │
      │            │            │            │            │            │            │
      └────────────┴────────────┴────────────┴────────────┴────────────┴────────────┘
                                             │
                                    Supabase Database
                                  (the only shared layer)

  Adding a new agent = copy subscription table + copy API routes + copy UI + copy rate limiter
  Admin health = navigate 7 dashboards. Lexi goes stale every deploy. No cross-system events.
  Users re-explain context switching between Sage, Growth, and Lexi.
```

```
AFTER iPOM — Integrated, Self-Improving Platform

  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
  │  Sage  │  │  Lexi  │  │ Growth │  │  CAS   │  │Process │  │AI Agent│
  │runtime │  │runtime │  │runtime │  │pipeline│  │ Studio │  │ Studio │
  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
      └────────────┴────────────┴────────────┴────────────┴────────────┘
                              │  PlatformUserContext (shared)
                              │
                ┌─────────────▼──────────────┐
                │    NEXUS — Platform Bus     │
                │  platform_events (unified)  │
                └──────┬──────────┬───────────┘
                       │          │
         ┌─────────────┘          └──────────────┐
         │                                        │
┌────────▼────────┐  ┌──────────────┐  ┌────────▼──────────┐
│  Intelligence   │  │  Automation  │  │   Operations       │
│  Hub            │  │  Runtime     │  │   Interface        │
│  (CAS + Admin   │  │  (Process    │  │   (Admin Command   │
│   Intel Agent)  │  │   Studio)    │  │    Center)         │
└────────┬────────┘  └──────────────┘  └───────────────────┘
         │
         ▼
┌─────────────────┐
│  LEARNING LAYER │
│  decision_outcomes│
│  accuracy tracking│
│  dynamic tiers  │
└─────────────────┘

  Adding a new agent = register orchestrator + 1 Stripe price ID. Cost: ~10-15h.
```

### 1.5 What iPOM Is Not

- **Not a user-facing product** — users never see "iPOM" directly
- **Not a replacement** for any existing system — Process Studio, CAS, AI Agent Studio remain as-is
- **Not glue code** — iPOM is a strategic product investment with its own roadmap, metrics, and value proposition
- **Not a new monolith** — iPOM is a protocol, tooling, and interface layer, not a new central service

---

## 2. The Autonomous Operations Model

### 2.1 The Core Idea

The current admin is organised around **domains** — bookings, listings, accounts, referrals, organisations. iPOM changes the model. The admin is reorganised around **autonomy levels**. The platform handles everything it can handle on its own, learns whether it handled it correctly, and escalates what it cannot.

```
DECISION ROUTING FLOW

  Platform Event
  (tutor applies, booking cancelled, referral signed up, dispute raised...)
         │
         ▼
  ┌─────────────────────────────────────────────────────┐
  │   Admin Intelligence Agent                          │
  │   Assesses: risk score, confidence, value, history  │
  └─────────────────────┬───────────────────────────────┘
                        │
         ┌──────────────┼──────────────┬──────────────┐
         │              │              │              │
         ▼              ▼              ▼              ▼
   AUTONOMOUS      SUPERVISED    EXCEPTION       STRATEGIC
   Confidence      AI acts,      Human must      Human
   high +          admin can     decide          designs
   low risk        override      (AI recommends) the rules
         │              │              │              │
         ▼              ▼              ▼              ▼
  Process Studio   Approval        Exception       Config
  executes         queue item      queue card      page /
  automatically    (approve /      + AI brief      Process
  No human         override)       + confidence    Studio
  needed                           + recommendation Design
         │              │              │
         └──────────────┴──────────────┘
                        │
                 Full audit trail in
                 workflow_executions
                 + platform_events
                        │
                        ▼
              ┌────────────────────┐
              │   LEARNING LAYER   │
              │  30/60/90d outcome │
              │  accuracy tracking │
              │  tier calibration  │
              └────────────────────┘
```

### 2.2 Four Levels of Autonomy

```
┌────────────────────────────────────────────────────────────────┐
│  AUTONOMOUS — Platform runs without human intervention          │
│                                                                 │
│  Routine tutor approvals (CaaS > threshold, complete profile)  │
│  Commission calculations and payouts (Process Studio)          │
│  Session completion workflows (Process Studio)                 │
│  Referral attribution (Process Studio subprocess)              │
│  Knowledge chunk updates (iPOM pipelines)                      │
│  SEO page generation (existing)                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  SUPERVISED — AI acts, admin can override before or after       │
│                                                                 │
│  Listing quality interventions (Growth flags → nudge sequence) │
│  Org dormancy re-engagement (30/60/90 day sequences)           │
│  Stuck referral signups → onboarding nudge                     │
│  Pricing anomaly notifications                                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  EXCEPTION QUEUE — AI escalates, human must decide              │
│                                                                 │
│  Borderline tutor applications (AI scored, human decides)      │
│  Payment disputes (AI recommends, human approves)              │
│  Fraud signals                                                 │
│  High-value org churn risk                                     │
│  Content policy violations                                     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  STRATEGIC — Human only                                         │
│                                                                 │
│  Platform configuration (shared fields, settings)              │
│  New workflow design (Process Studio)                          │
│  Agent knowledge and persona updates                           │
│  Pricing policy                                                │
│  New agent creation (AI Agent Studio)                          │
└────────────────────────────────────────────────────────────────┘
```

### 2.3 Self-Improving Autonomy (v2.0 Addition)

Autonomy tiers in v1.0 are static — calibrated at build time and never adjusted. v2.0 adds dynamic calibration based on observed accuracy:

```
AUTONOMY TIER CALIBRATION

  process_autonomy_config table:
  ┌─────────────────────────────────────────────────────────────┐
  │  process_id  │  current_tier  │  accuracy_30d  │  threshold │
  │  tutor-approv│  autonomous    │  97.2%         │  90%       │
  │  commission  │  autonomous    │  99.8%         │  95%       │
  │  nudge-stuck │  supervised    │  34% convert.  │  15%       │
  └─────────────────────────────────────────────────────────────┘

  Admin Intelligence Agent reads weekly:
  ├── accuracy_30d > threshold + 10% for 30 days?
  │       → Propose widening scope (lower CaaS threshold by 5pts)
  │       → Admin approves, config updates, scope expands
  │
  ├── accuracy_30d < threshold for 14 days?
  │       → Auto-escalate to Supervised tier immediately
  │       → Alert admin with accuracy trend
  │
  └── nudge conversion_rate < 5% for 4 weeks?
          → Flag sequence for redesign
          → Suppress sequence pending review
```

Every autonomous process has an explicitly defined `rollback_procedure` in its workflow definition. Processes marked `undoable: false` require Supervised minimum — never fully Autonomous.

### 2.4 The Admin Command Center

```
/admin/

  ┌─────────────────────────────────────────────────────────────┐
  │  Good morning. Platform brief — Thursday 5 March            │
  │                                                             │
  │  3 exceptions need your decision                           │
  │  2 supervised sequences awaiting approval                   │
  │  Platform running normally — all processes nominal          │
  │                                                             │
  │  AI confidence: high (8 signals, 2 domains)                │
  └─────────────────────────────────────────────────────────────┘

  Ask anything...  [conversational query bar — Lexi admin mode]

  ┌──────────────────────────────────────────────────────────────┐
  │  EXCEPTION QUEUE                                             │
  │  ─────────────────────────────────────────────────────────  │
  │  Tutor application — borderline score (54/100)              │
  │  Profile: 78% complete | Unverified | 2 listings            │
  │  AI confidence: 71% approve   Evidence: 12 signals          │
  │  [Approve] [Reject] [Request more info]                     │
  │  ● Claimed by you — 15 min remaining                       │
  │                                                             │
  │  Dispute — £120, James vs client re: cancellation           │
  │  AI recommendation: partial refund £60 (balanced evidence)  │
  │  AI confidence: 62%   Evidence: 8 signals                   │
  │  [Accept recommendation] [Override] [Escalate]             │
  │  ○ Unclaimed                                               │
  │                                                             │
  │  Oakwood Learning — 90 days dormant, high-value org         │
  │  12 members, £4,200 lifetime GMV. Auto-outreach failed.     │
  │  [Contact org admin] [Mark inactive] [Assign to Growth]     │
  │  ○ Unclaimed (48h — email alert sent)                      │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │  AUTONOMOUS OPERATIONS (last 7 days)                        │
  │  31 tutor applications approved      £6,200 payouts sent    │
  │  204 referral nudges sent            12 orgs re-engaged     │
  │  156 knowledge chunks updated        8 workflows completed  │
  │  [Override any decision]  [View full audit log]             │
  └──────────────────────────────────────────────────────────────┘
```

**Exception queue ownership**: When an admin opens an exception it becomes `claimed` (15-minute soft lock). Other admins see it as claimed but can override-claim. Exceptions unclaimed for 48h trigger an email alert to the admin team. `workflow_exceptions` table: `claimed_by uuid`, `claimed_at timestamptz`, `escalated_at timestamptz`.

### 2.5 Navigation Reframe

```
ADMIN SIDEBAR — Before vs After

  BEFORE (domain-first)          AFTER iPOM (autonomy-first)
  ─────────────────────          ───────────────────────────
  Dashboard                      Dashboard (command center)
  ── Bookings                      [AI brief]  [Query bar]
  ── Listings                      [Exception queue]
  ── Accounts                      [Autonomous ops summary]
  ── Financials
  ── Referrals                   OPERATIONS
  ── Organisations               ── Exception Queue
  ── Reviews                     ── HITL Approvals
                                 ── Autonomous Activity Log
  AI SYSTEMS
  ── Sage                        INTELLIGENCE
  ── Lexi                        ── Signal (content → GMV)
  ── Growth                      ── Network (referral graph)
  ── CAS                         ── Platform Health
  ── Process Studio
  ── AI Agents                   MANAGEMENT
                                 ── Bookings
                                 ── Listings
                                 ── Accounts
                                 ── Financials
                                 ── Referrals
                                 ── Organisations
                                 ── Reviews
                                 ── AI Systems (all agents)

                                 CONFIGURATION
                                 ── Shared Fields
                                 ── Settings
                                 ── Workflows
                                 ── Agents
```

---

## 3. Core Capabilities

iPOM has five integrated capabilities:

```
┌────────────────────────────────────────────────────────────────────────┐
│                       TUTORWISE iPOM v2.0                               │
├──────────────┬─────────────────┬────────────────┬──────────────────────┤
│  AUTOMATION  │  INTELLIGENCE   │  OPERATIONS    │  NEXUS               │
│  RUNTIME     │  HUB            │  INTERFACE     │  (technical)         │
│              │                 │                │                      │
│  Process     │  CAS Analyst    │  Admin Command │  Platform event bus  │
│  Studio:     │  +              │  Center:       │  Knowledge pipelines │
│  Discovery,  │  Admin Intel    │  Exception     │  Bridge files        │
│  Design,     │  Agent          │  queue         │  PlatformUserContext │
│  Execution   │                 │  HITL approvals│  Cross-workflow      │
│              │  Generates:     │  Autonomous    │  coordination        │
│  Autonomous  │  Daily brief    │  ops summary   │  Operational health  │
│  workflows   │  Anomaly alerts │  Conversational│                      │
│  HITL pauses │  Signals for    │  query (Lexi   │                      │
│  Audit trail │  exception queue│  admin mode)   │                      │
├──────────────┴─────────────────┴────────────────┴──────────────────────┤
│                       LEARNING LAYER (v2.0)                             │
│  decision_outcomes │ accuracy tracking │ dynamic tier calibration       │
│  nudge effectiveness scoring │ admin brief with accuracy trends         │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Automation Runtime — Process Studio

Already built (Phase 1 complete). iPOM expands scope:

```
PROCESS STUDIO WORKFLOW INVENTORY

  LIVE (running in production)
  ┌─────────────────────────────────────────────────────────────────┐
  │  Tutor Approval          │  Commission Payout                    │
  │  Webhook: profile UPDATE │  Cron: Fri 10am                       │
  │  HITL: admin approves    │  Steps: eligible? → stripe.payout    │
  └─────────────────────────────────────────────────────────────────┘

  SHADOW (running parallel, not acting)
  ┌─────────────────────────────────────────────────────────────────┐
  │  Booking Lifecycle (Human Tutor)   Booking Lifecycle (AI)        │
  └─────────────────────────────────────────────────────────────────┘

  SUBPROCESS
  ┌─────────────────────────────────────────────────────────────────┐
  │  Referral Attribution    (no standalone trigger)                 │
  └─────────────────────────────────────────────────────────────────┘

  iPOM ADDS
  ┌─────────────────────────────────────────────────────────────────┐
  │  Organisation Onboarding │  Stuck Referral Recovery              │
  │  Listing Quality          │  Org Dormancy Re-engagement          │
  └─────────────────────────────────────────────────────────────────┘

  ALL AGENTS delegate write actions through Process Studio
  (Growth, Lexi, future agents) → POST /api/process-studio/execute/start
  Full audit trail + idempotency + rollback support
```

**Operational health requirement**: Every workflow must declare in its definition:
- `undoable: boolean` — if false, tier minimum is Supervised
- `rollback_procedure` — explicit SQL or API call to reverse the action
- `idempotency_key_template` — format for dedup keys

### 3.2 Intelligence Hub

**CAS Analyst** (existing, extended): operational data tools added to analyse marketplace patterns.

**Admin Intelligence Agent** (new, `cas:admin-intelligence`): Runs on three triggers:
- Daily 8am — generates admin briefing (uses Gemini Flash — no frontier model needed)
- Event-driven — anomaly detection per domain (rules-based first, AI only for complex cases)
- On-demand — conversational queries from the Command Center query bar

Event batching: max 1 analysis per domain per 15-minute window. Excess triggers queued. Max 10 total runs per hour. Prevents cost spikes during event storms.

### 3.3 Operations Interface — Admin Command Center

Redesigned admin homepage. Primary interface is the exception queue with AI confidence scores, evidence counts, and ownership status. Secondary interface is existing domain pages (Management section).

### 3.4 Nexus — Technical Integration Layer

Detailed in §5. The connective tissue: platform event bus, knowledge pipelines, PlatformUserContext, cross-workflow coordination, and operational health mechanisms.

### 3.5 Learning Layer (v2.0)

The fifth capability, absent from v1.0. Connects autonomous decisions to their observed outcomes. Makes the system self-improving over time. Detailed in §8.

---

## 4. Systems in Scope

### 4.1 Platform Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AI AGENT STUDIO                                │
│           Agent Registry + Factory (ai_agents table)               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ spawns runtime agents
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PLATFORM EVENT BUS  (Nexus core)                  │
│         platform_events table — all systems publish here             │
│         (dedicated table, not cas_agent_events — see D13)           │
└──┬───────────┬──────────────┬─────────────────┬────────────────┬────┘
   │           │              │                 │                │
 Sage        Lexi          Growth         Process Studio        CAS
(runtime)  (runtime)     (runtime)       Discovery/Execution  (dev pipeline)
   │           │              │                 │                │
   └───────────┴──────────────┴─────────────────┴────────────────┘
                               │
              ┌────────────────▼────────────────┐
              │      iPOM ADMIN COMMAND CENTER   │
              │      /admin/ (Operations first)  │
              └──────────────────────────────────┘
```

### 4.2 System Roles in iPOM

| System | Role | Participates As |
|--------|------|----------------|
| **Process Studio** | Automation Runtime — executes all workflows and HITL approvals | Primary action executor for all agents |
| **CAS** | Intelligence Hub backbone — hosts event store, admin intelligence agent | `cas:admin-intelligence` + existing agents |
| **Sage** | AI tutor runtime | Full bridge — session, feedback, progress events |
| **Lexi** | Help bot + admin conversational interface | Full bridge + admin mode with operational tools |
| **Growth** | Advisory agent + platform-wide signal source | Full bridge — audit, session, action events |
| **AI Agent Studio** | Agent Registry + Factory | Lifecycle events (`agent.created`, `agent.published`) |
| **Admin Command Center** | Human interface for the autonomous platform | Exception queue consumer + HITL approval interface |

---

## 5. Nexus — Technical Integration Layer

### 5.1 Platform Event Bus

**Problem**: Systems cannot observe each other.

**Solution (v2.0 — changed from v1.0)**: A dedicated `platform_events` table, not an extension of `cas_agent_events`. `cas_agent_events` is a CAS-internal table with schema, RLS, and retention assumptions designed for CAS agent lifecycle events (many fine-grained events per agent turn). Platform events are coarser (one per workflow completion, one per session) and have different GDPR retention requirements. Mixing them creates querying complexity, RLS conflicts, and index pollution.

```sql
-- platform_events: dedicated cross-system event store
CREATE TABLE platform_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system text NOT NULL,    -- 'sage' | 'lexi' | 'growth' | 'process-studio' | 'cas' | 'ai-agent-studio'
  event_type text NOT NULL,       -- see extended MessageTypes below
  entity_id uuid,                 -- user_id, execution_id, session_id (context-dependent)
  entity_type text,               -- 'user' | 'execution' | 'session' | 'organisation'
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_platform_events_source ON platform_events(source_system);
CREATE INDEX idx_platform_events_type ON platform_events(event_type);
CREATE INDEX idx_platform_events_entity ON platform_events(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_platform_events_created ON platform_events(created_at DESC);
```

`cas_agent_events` remains unchanged — CAS internals only. `source_system = 'cas'` events in `platform_events` are high-level CAS lifecycle events (deployment, optimization) not agent-turn events.

**Extended MessageTypes**:
```typescript
// Workflow lifecycle
| 'workflow.started'
| 'workflow.completed'
| 'workflow.paused'                 // HITL awaiting approval
| 'workflow.resumed'
| 'workflow.failed'
| 'workflow.shadow_divergence'      // Shadow mode: real ≠ expected
| 'workflow.trigger_deduplicated'   // Duplicate trigger suppressed

// Discovery
| 'discovery.scan_started'
| 'discovery.scan_completed'

// Growth events
| 'growth.audit_completed'
| 'growth.action_taken'
| 'growth.score_updated'

// Agent lifecycle (AI Agent Studio)
| 'agent.created'
| 'agent.published'
| 'agent.disabled'

// Admin intelligence
| 'admin.exception_raised'
| 'admin.exception_resolved'
| 'admin.exception_claimed'
| 'admin.exception_escalated'       // Unclaimed > 48h
| 'admin.briefing_generated'

// Learning layer
| 'learning.outcome_recorded'
| 'learning.tier_proposed'          // AI proposes tier change
| 'learning.tier_adjusted'          // Admin approves tier change
```

### 5.2 Knowledge Pipelines (Async)

**v2.0 change**: Both pipelines are async (fire-and-forget from caller's perspective), not synchronous hooks. A failing embedding API must not block an admin configuration update or a discovery scan completion. Both pipelines go through a `pipeline_jobs` queue processed by pg_cron.

```sql
CREATE TABLE pipeline_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_type text NOT NULL,  -- 'discovery-knowledge' | 'configurations-knowledge'
  payload jsonb,
  status text DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
  attempts integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);
```

pg_cron job `process-pipeline-jobs` runs every 2 minutes, picks up pending jobs, processes with retry (max 5 attempts, exponential backoff). Platform Console shows pipeline job status and last successful sync time per pipeline.

**Pipeline 1 — Discovery → Agent Knowledge** (unchanged logic, now async)

```
Process Discovery scan completes
        │
        ▼
INSERT INTO pipeline_jobs (pipeline_type='discovery-knowledge', payload={scan_id})
        │  (caller returns immediately — async)
        ▼
pg_cron: process-pipeline-jobs (every 2 min)
        │
        ▼
discovery-knowledge-pipeline.ts
  For each workflow_discovery_results row:
  1. Format: name + description + steps + source_type
  2. Hash content → compare with stored hash
     ├── Hash matches? → SKIP
     ├── Hash differs? → UPDATE chunk + re-embed
     └── New row?      → INSERT chunk + embed
  3. Deleted row?      → DELETE chunk
  4. Similarity check: cosine(new_embedding, existing) > 0.95?
     └── If yes → skip insert (semantic near-duplicate)
  5. Batch embed: all pending embeddings in one API call (not one per chunk)
        │
        ├──────────────────────────────────────────┐
        ▼                                          ▼
lexi_knowledge_chunks                  growth_knowledge_chunks
category='processes'                   (process-relevant subset)
```

**Semantic deduplication**: Before inserting a new chunk, check cosine similarity against existing chunks in the same category. If similarity > 0.95, skip — this is a near-duplicate that would waste RAG context window. Keeps the knowledge base lean as the platform evolves.

**Batched embedding**: Buffer all chunks needing embedding within a pipeline run, then call `gemini-embedding-001` once with the full array. Reduces API calls by 10–50x vs one call per chunk.

**Pipeline 2 — Configurations → Agent Knowledge** (unchanged logic, now async)

```
Admin edits shared_fields in /admin/configurations/
        │
        ▼
updateSharedField() API call completes
INSERT INTO pipeline_jobs (pipeline_type='configurations-knowledge', payload={field_id, change_type})
        │  (admin UI is never blocked)
        ▼
pg_cron processes within 2 minutes
        │
        ▼
configurations-knowledge-pipeline.ts
  Format: field_name + contexts + all current options
  Embed → Upsert into lexi_knowledge_chunks (category='platform-config')

  Lexi + Growth know about new subjects/options within ~2 minutes of admin save
```

### 5.3 HITL Action Gateway

Process Studio is the single action runtime for all conversational agents. Full sequence unchanged from v1.0 (design is correct).

**Security boundary** (two distinct endpoints, same engine):
- `/api/process-studio/execute/start` — user-facing (Growth, Lexi user mode). Auth: user session, scoped to `profile_id`. Cannot escalate privileges.
- `/api/admin/process-studio/execute/start` — admin only. Auth: admin RBAC (`requiresAdmin()`). Full execution context.

Both call the same `PlatformWorkflowRuntime` internally.

Every workflow definition must declare `rollback_procedure` and `undoable` flag (see §3.1). Processes with `undoable: false` cannot be in the Autonomous tier.

### 5.4 Bridge Files

Following the existing `sage-bridge.ts` / `lexi-bridge.ts` pattern, publishing to `platform_events` (not `cas_agent_events`):

```
cas/integration/
├── sage-bridge.ts          (existing — update to publish to platform_events)
├── lexi-bridge.ts          (existing — update to publish to platform_events)
├── growth-bridge.ts        (NEW)
│     handleAuditCompleted()  → growth.audit_completed
│     handleSessionEvent()    → session.started / session.ended
│     handleActionTaken()     → growth.action_taken
│     handleScoreUpdated()    → growth.score_updated
│
└── process-studio-bridge.ts (NEW)
      handleWorkflowStarted()    → workflow.started
      handleWorkflowCompleted()  → workflow.completed
                                    + write to decision_outcomes stub
      handleWorkflowPaused()     → workflow.paused + raise exception
      handleWorkflowFailed()     → workflow.failed + raise exception
      handleShadowDivergence()   → workflow.shadow_divergence
      handleScanCompleted()      → discovery.scan_completed
                                    + enqueue Pipeline 1 job
      handleTriggerDeduped()     → workflow.trigger_deduplicated
```

### 5.5 Shared Agent Tools

```
apps/web/src/lib/process-studio/agent-tools/
  get-executions.ts        ← live execution state for a user (Lexi + Growth)
  trigger-workflow.ts      ← HITL action gateway (all user-facing agents)
                              includes: entity cooldown check before trigger
  list-approvals.ts        ← pending HITL tasks (admin mode)
  approve-task.ts          ← approve/reject HITL task (admin mode)
  get-divergences.ts       ← shadow mode divergence report (admin mode)
```

### 5.6 PlatformUserContext — Shared Cross-Agent Context (v2.0)

**Problem**: Users re-explain their situation when switching between Lexi, Sage, and Growth. Each agent starts from zero. The platform feels like three separate tools.

**Solution**: A platform-level user context snapshot, fetched once per session start, shared across all conversational agents.

```typescript
interface PlatformUserContext {
  // Core identity
  profile: {
    role: 'tutor' | 'client' | 'agent' | 'organisation'
    caas_score: number
    listing_count: number
    active_since: string
    verified: boolean
    profile_completeness: number   // 0-100
  }

  // Financials
  earnings: {
    today: number
    this_week: number
    this_month: number
    pending_payout: number
    stripe_connected: boolean
    stripe_issues: boolean
  }

  // Bookings
  bookings: {
    upcoming_count: number
    past_30_days: number
    cancellation_rate: number
    next_booking: { date: string; student: string } | null
  }

  // AI agent activity
  sage: {
    has_pro: boolean
    sessions_this_month: number
    last_session_subject: string | null
    last_session_topic: string | null
  }

  growth: {
    has_pro: boolean
    sessions_this_month: number
    last_topic_discussed: string | null
    growth_score: number | null
  }

  lexi: {
    last_query: string | null
    open_issues: string[]
  }

  // Platform processes
  processes: {
    pending_approvals: Array<{ id: string; type: string; waiting_hours: number }>
    recent_executions: Array<{ process_name: string; status: string; completed_at: string }>
  }

  // Platform signals (surface proactively)
  signals: {
    listing_last_view_days_ago: number | null
    unread_messages: number
    incomplete_profile_fields: string[]
    last_review_days_ago: number | null
    caas_below_threshold: boolean   // < 70
  }
}
```

**How it works**:
1. Fetched server-side at session start for any conversational agent (Lexi, Sage, Growth)
2. Injected as a structured block in the system prompt: each agent can reference current platform state without making tool calls
3. Published to `platform_events` as `session.context_loaded` (enables cross-agent awareness)
4. Cached per user for 5 minutes (Supabase Redis) — not fetched on every message

**Cross-agent handoff with context**: When Lexi hands off to Growth or Sage, it encodes the last 3 conversation turns into `sessionStorage` alongside the `PlatformUserContext`. The receiving agent picks up and opens with "I can see from Lexi that you're trying to [topic] — let's continue from there."

### 5.7 Cross-Workflow Coordination (v2.0)

**Problem**: Two workflows can simultaneously target the same user. A "Stuck Referral Recovery" email and an "Org Dormancy Re-engagement" email can land on the same day.

**Solution**: Entity-level active workflow check + cooldown before starting any new workflow targeting an entity.

```sql
-- Deduplication constraint: only one active execution per process per entity
CREATE UNIQUE INDEX idx_workflow_executions_active_entity
ON workflow_executions (process_id, target_entity_id)
WHERE status IN ('running', 'pending');

-- Entity-level cooldown tracking
CREATE TABLE workflow_entity_cooldowns (
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  last_workflow_at timestamptz NOT NULL,
  last_workflow_type text,
  cooldown_until timestamptz,
  PRIMARY KEY (entity_id, entity_type)
);
```

`trigger-workflow.ts` checks `workflow_entity_cooldowns` before every new workflow start:
- If entity has any active workflow: queue or skip (configurable per workflow)
- If entity received a communication workflow in the last 48h: apply cooldown for nudge-type workflows
- Log suppressed triggers to `platform_events` as `workflow.trigger_deduplicated`

### 5.8 Operational Health (v2.0)

**Webhook reliability**: The Supabase DB webhook (Tutor Approval trigger) can drop silently if the server is unavailable. The existing `failed_webhooks` DLQ table (migration 058) has `retry_count` and `last_retry_at` columns that are unused.

Two fixes:
1. **DLQ retry scheduler**: new pg_cron job `process-failed-webhooks` (every 15 minutes) — reads `failed_webhooks WHERE retry_count < 5 AND status='failed'`, retries with exponential backoff (2^retry_count minutes delay).
2. **Polling fallback**: new pg_cron job `workflow-trigger-fallback` (every 5 minutes) — checks for profiles that meet Tutor Approval trigger conditions (`status = 'under_review'`) but have no associated `workflow_executions` row created in the last 60 minutes. Starts executions for gaps.

**Platform health monitoring** visible in Platform Console:
- Pipeline job queue depth and last successful run per pipeline type
- Webhook DLQ depth and retry success rate
- Workflow execution success/failure rate per process
- Admin Intelligence Agent run history and cost

### 5.9 Database Changes

```sql
-- Platform event bus (dedicated table, replaces cas_agent_events extension)
CREATE TABLE platform_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system text NOT NULL,
  event_type text NOT NULL,
  entity_id uuid,
  entity_type text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_platform_events_source ON platform_events(source_system);
CREATE INDEX idx_platform_events_type ON platform_events(event_type);
CREATE INDEX idx_platform_events_created ON platform_events(created_at DESC);

-- Knowledge pipeline job queue (async pipelines)
CREATE TABLE pipeline_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_type text NOT NULL,
  payload jsonb,
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Growth Agent knowledge (for Growth RAG — populated by Pipeline 1, consumed by Phase 2 RAG)
CREATE TABLE growth_knowledge_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  embedding vector(768),
  category text,
  source_type text,
  metadata jsonb,
  content_hash text,           -- for delta-sync dedup
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exception queue ownership
CREATE TABLE workflow_exceptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id uuid REFERENCES workflow_executions(id),
  severity text NOT NULL,      -- 'high' | 'medium' | 'low'
  domain text NOT NULL,        -- 'bookings' | 'referrals' | 'financials' | 'listings' | 'orgs'
  root_cause text,
  ai_recommendation text,
  confidence_score integer,    -- 0-100
  evidence_count integer,
  claimed_by uuid REFERENCES auth.users,
  claimed_at timestamptz,
  escalated_at timestamptz,    -- set when unclaimed > 48h
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users,
  resolution text,
  created_at timestamptz DEFAULT now()
);

-- Cross-workflow coordination
CREATE UNIQUE INDEX idx_workflow_executions_active_entity
ON workflow_executions (process_id, target_entity_id)
WHERE status IN ('running', 'pending');

CREATE TABLE workflow_entity_cooldowns (
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  last_workflow_at timestamptz NOT NULL,
  last_workflow_type text,
  cooldown_until timestamptz,
  PRIMARY KEY (entity_id, entity_type)
);

-- Learning layer
CREATE TABLE decision_outcomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id uuid REFERENCES workflow_executions(id),
  process_id uuid,
  decision_type text NOT NULL,  -- 'autonomous' | 'supervised' | 'exception'
  outcome_metric text NOT NULL, -- 'dispute_raised' | 'booking_made' | 'referral_converted' | 'nudge_opened'
  outcome_value numeric,        -- e.g. 1 (yes) or 0 (no), or a numeric amount
  measured_at timestamptz NOT NULL,
  lag_days integer,             -- 30 | 60 | 90
  created_at timestamptz DEFAULT now()
);

CREATE TABLE process_autonomy_config (
  process_id uuid PRIMARY KEY,
  current_tier text NOT NULL,        -- 'autonomous' | 'supervised' | 'exception'
  accuracy_threshold numeric,        -- minimum accuracy to stay in tier
  accuracy_30d numeric,              -- rolling 30-day accuracy
  scope_parameters jsonb,            -- e.g. { caas_threshold: 70 }
  last_calibrated_at timestamptz,
  proposed_tier text,                -- admin-pending proposal from AI
  proposed_by text DEFAULT 'admin-intelligence',
  updated_at timestamptz DEFAULT now()
);

-- AI cost attribution
CREATE TABLE platform_ai_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system text NOT NULL,        -- 'admin-intelligence' | 'pipeline-1' | 'pipeline-2' | 'growth' | 'sage' | 'lexi'
  operation_type text NOT NULL,       -- 'briefing' | 'anomaly' | 'embedding' | 'query' | 'stream'
  model text NOT NULL,                -- 'grok-4-fast' | 'gemini-flash' | 'claude-sonnet-4-6' | etc.
  tokens_in integer,
  tokens_out integer,
  estimated_cost_gbp numeric(10, 6),
  execution_id uuid,                  -- link to workflow if applicable
  created_at timestamptz DEFAULT now()
);

-- Growth Score cache
CREATE TABLE growth_scores (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  profile_completeness integer,       -- 0-25 sub-score
  listing_performance integer,        -- 0-25 sub-score
  earnings_trajectory integer,        -- 0-25 sub-score
  platform_engagement integer,        -- 0-25 sub-score
  computed_at timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Unified agent subscriptions (replaces sage_pro_subscriptions)
CREATE TABLE agent_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  agent_type text NOT NULL,           -- 'sage' | 'growth' | future agents
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_price_id text,
  status text NOT NULL,               -- 'active' | 'cancelled' | 'past_due'
  price_per_month integer,            -- pence
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, agent_type)
);
```

---

## 6. Intelligence Layer

### 6.1 Admin Intelligence Agent

A new CAS agent (`cas:admin-intelligence`) with read-only tools across all operational tables.

**AI tier routing for this agent** (see §6.5):
- Threshold checks (booking drop > 25%) → rules engine only, 0 AI cost
- Signal summarisation → Gemini Flash
- Nuanced exception recommendation → Claude Sonnet
- Complex multi-domain brief → Grok 4 Fast (once per day maximum)

**Triggers**: Daily 8am (briefing) + event-driven (anomaly) + on-demand (admin query). Event batching: max 1 analysis per domain per 15-minute window. Max 10 runs/hour via rate limit config in the shared rate limiter.

**Daily briefing includes** (v2.0 addition): accuracy trend from `process_autonomy_config` — if any process has declining accuracy, it appears in the briefing with a proposed tier change.

### 6.2 Domain Intelligence

**Bookings**: Cancellation rate spike (+25% vs 7-day avg), revenue forecast, booking velocity anomaly.

**Listings**: Quality score distribution, SEO gaps (high-demand subjects + low-quality listings), pricing anomaly (>30% below market with high CaaS).

**Referrals — Pipeline Bottleneck Analysis**:
```
Full pipeline:
Referral link clicked
       │ click-through rate
       ▼
Signed Up          1,240 clicks → 186 signups (15%)
       │                         ↑ 85% bounced here
       ▼
Profile Complete   186 signups → 74 complete (40%)
       │                         ↑ 60% ghost signups
       ▼
First Booking      74 complete → 22 booked (30%)
       │                         ↑ 70% biggest leak
       ▼
Converted          22 (12% of signups)

Admin Intelligence surfaces: bottleneck position, volume at each stage,
recommended action with AI confidence score.
```

**Organisations**: Org health index, dormancy detection (60d → supervised sequence), delegation opportunity, B2B pipeline value.

**Financials**: Payout anomaly (3σ), dispute pattern analysis, commission reconciliation gaps.

### 6.3 Network Intelligence

`/admin/network/` (new page — see §9 Phase 4):

```
Network Intelligence tabs:
├── Network Health: referral graph depth, velocity, ghost signup rate, delegation adoption
├── Organisation: org health ranking, dormancy status, org vs solo conversion advantage
└── Attribution: top referrers by LTV (not volume)
```

### 6.4 Lexi Admin Mode

Lexi operates in two modes: User Mode (current) and Admin Mode (new, activated by `is_admin()`).

Admin Mode tools include: `read_bookings_aggregate()`, `read_referral_pipeline()`, `read_org_health()`, `get_hitl_queue()`, `approve_task()`, `list_approvals()`, `get_divergences()`, `read_financial_signals()`.

Entry point: Admin Command Center query bar.

### 6.5 AI Tier Routing (v2.0)

**Problem**: All Admin Intelligence Agent operations default to the most expensive AI tier. Threshold-based anomaly detection does not need a frontier model.

**Solution**: Task classification before model selection.

```typescript
// apps/web/src/lib/admin-intelligence/tier-router.ts

type TaskClass = 'rules' | 'cheap' | 'medium' | 'frontier'

function classifyAdminTask(task: AdminTask): TaskClass {
  // Pure threshold check — no AI needed
  if (task.type === 'threshold_check') return 'rules'

  // Signal summarisation, common queries — Gemini Flash
  if (task.type === 'signal_summary' || task.type === 'cached_query') return 'cheap'

  // Dispute recommendation, nuanced exception — Claude Sonnet
  if (task.type === 'exception_recommendation') return 'medium'

  // Complex multi-domain daily briefing — frontier only once per day
  if (task.type === 'daily_brief') return 'frontier'

  return 'medium'  // default
}

const TIER_MODEL_MAP: Record<TaskClass, string> = {
  rules:    'rules-based',      // 0 AI cost
  cheap:    'gemini-flash',     // ~$0.0001/1k tokens
  medium:   'claude-sonnet-4-6',// ~$0.003/1k tokens
  frontier: 'grok-4-fast',      // ~$0.01/1k tokens
}
```

**Estimated cost impact**: Without routing, 100 daily admin events all use frontier tier. With routing, ~70% are rules/cheap, ~20% are medium, ~10% are frontier. Estimated 5–10x reduction in Admin Intelligence Agent costs at scale.

### 6.6 AI Cost Attribution (v2.0)

Every AI call from any iPOM component writes to `platform_ai_costs`. Provider prices are constants:

```typescript
const COST_PER_1K_TOKENS_GBP = {
  'grok-4-fast':       { in: 0.008, out: 0.024 },
  'gemini-flash':      { in: 0.00006, out: 0.00024 },
  'claude-sonnet-4-6': { in: 0.0024, out: 0.012 },
  'deepseek-r1':       { in: 0.0004, out: 0.0016 },
  'gpt-4o':            { in: 0.004, out: 0.016 },
  'rules-based':       { in: 0, out: 0 },
}
```

Platform Console shows:
- Monthly AI spend by source_system (Admin Intelligence vs Pipelines vs Growth vs Sage vs Lexi)
- Cost per workflow execution
- Cost per autonomous decision made
- Provider comparison (actual spend per provider vs share of requests)

### 6.7 Admin Query Caching (v2.0)

Common admin queries ("referral conversion rate this week", "how many ghost signups", "which orgs are dormant") run identical Supabase aggregations on every call. With multiple admins, the same query may run dozens of times.

Use the existing Redis infrastructure (already deployed for rate limiting):

```typescript
// Cache key: intent hash + date bucket (YYYY-MM-DD)
// TTL: 1 hour for aggregate queries, 5 minutes for exception queue

async function cachedAdminQuery(intent: string, queryFn: () => Promise<any>) {
  const cacheKey = `admin:query:${hash(intent)}:${dateBucket()}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const result = await queryFn()
  await redis.setex(cacheKey, 3600, JSON.stringify(result))
  return result
}
```

---

## 7. Platform Agent Infrastructure

### 7.1 Unified Agent Subscription Table

Replace `sage_pro_subscriptions` with `agent_subscriptions` (schema in §5.9). Migration path: zero-downtime shadow write period (both tables written simultaneously for 24h), then cutover.

**Zero-downtime migration sequence**:
1. Create `agent_subscriptions` table with triggers that mirror writes from `sage_pro_subscriptions`
2. Backfill existing Sage subscriptions: `INSERT INTO agent_subscriptions SELECT ..., 'sage' FROM sage_pro_subscriptions`
3. Verify read parity for 24h in production (both tables return identical results for Sage)
4. Switch all reads to `agent_subscriptions`
5. Drop `sage_pro_subscriptions` and mirror triggers

This prevents billing gaps or double-charging during migration.

### 7.2 Parameterised Agent API Routes

```
apps/web/src/app/api/agents/[agentType]/
  stream/route.ts       ← replaces /api/sage/stream, /api/growth/stream
  session/route.ts      ← replaces per-agent session routes
  subscription/route.ts ← replaces per-agent subscription routes
```

`[agentType]` resolves to the correct orchestrator, rate limit config, and subscription check. Adding a new agent = one orchestrator registration. No new routes.

### 7.3 Shared Agent UI Component

```typescript
<AgentChatUI
  agentType="growth"        // or "sage", future agents
  sessionId={sessionId}
  userId={userId}
  platformContext={platformUserContext}   // v2.0: injected at parent level
/>
```

### 7.4 Shared Agent Base Classes (Sequencing — v2.0 change)

**v1.0 plan**: Extract concurrent with Platform Extraction + Nexus Foundation.
**v2.0 plan**: Extract as an isolated, pre-foundation task completed before Nexus bridges are wired.

**Sequence**:
1. PR: Extract `BaseAgent`, `PlatformAIAgent`, `MarketplaceAIAgent` into `packages/agents-core/`
2. PR: Update Sage to import from `@tutorwise/agents-core` — full build + Sage E2E verification
3. PR: Update Growth to import from `@tutorwise/agents-core` — full build + Growth E2E verification
4. ✅ Verified — only then start Nexus Foundation

Revised estimate: 8–12h (not 4h). Extraction + tsconfig path aliases + resolving circular dependencies + build verification for both live agents.

### 7.5 Shared Rate Limiter

```typescript
const AGENT_RATE_LIMITS: Record<string, AgentRateLimit> = {
  sage:                { free: 10, pro: 5000, window: '24h', burst: 100 },
  growth:              { free: 10, pro: 5000, window: '24h', burst: 100 },
  'admin-intelligence':{ free: null, pro: null, window: '1h', burst: 10 }, // internal agent cap
}
```

---

## 8. Holistic Architecture — The Two Missing Properties

A holistic autonomous operations architecture requires six properties. iPOM v1.0 delivered four. v2.0 completes all six.

| Property | Description | v1.0 | v2.0 |
|----------|------------|------|------|
| **Integrated** | Every part knows what every other is doing | ✅ Nexus event bus | ✅ `platform_events` |
| **Autonomous** | Routine decisions need no human | ✅ Four-tier model | ✅ Same + validated |
| **Intelligent** | Anomalies surface before humans notice | ✅ Admin Intel Agent | ✅ + AI tier routing |
| **Self-maintaining** | Knowledge stays current without manual effort | ✅ Pipelines 1+2 | ✅ Async + deduped |
| **Self-improving** | Decisions get better from observed outcomes | ❌ Not designed | ✅ Learning layer |
| **Coherent** | Users experience one platform, not 7 tools | ❌ Not designed | ✅ PlatformUserContext |

### 8.1 Self-Improving — The Learning Loop

```
LEARNING LOOP ARCHITECTURE

  Autonomous Decision Made
  (tutor approved, commission paid, nudge sent)
          │
          ▼
  workflow_executions.decision_rationale (jsonb)
  Records: signals used, confidence score, tier at time of decision
          │
          ▼                     (30/60/90 day lag via pg_cron)
  decision_outcomes
  ┌──────────────────────────────────────────────────────────┐
  │  execution_id │ outcome_metric      │ outcome_value │lag │
  │  uuid         │ 'dispute_raised'    │ 0 (none)      │ 30 │
  │  uuid         │ 'booking_made'      │ 1 (yes)       │ 30 │
  │  uuid         │ 'nudge_converted'   │ 0.34 (rate)   │ 14 │
  └──────────────────────────────────────────────────────────┘
          │
          ▼
  Admin Intelligence Agent reads weekly:
  ┌──────────────────────────────────────────────────────────┐
  │  process_autonomy_config (accuracy rolling window)        │
  │                                                          │
  │  tutor-approval: 97.2% (threshold 90%) — EXPAND scope   │
  │  commission-payout: 99.8% (threshold 95%) — HOLD         │
  │  stuck-referral-nudge: 8% conversion (threshold 15%)     │
  │                        → FLAG for message redesign       │
  └──────────────────────────────────────────────────────────┘
          │
          ├── Accuracy > threshold + 10% for 30d?
          │       → Propose expanding scope to admin
          │       → Admin approves → update scope_parameters
          │
          ├── Accuracy < threshold for 14d?
          │       → Auto-escalate to Supervised immediately
          │       → Alert admin with trend chart
          │
          └── Conversion < 5% for 4 weeks?
                  → Suppress sequence, flag for redesign
                  → Include in weekly briefing
```

**Outcome measurement pg_cron jobs** (new):
```
measure-tutor-approval-outcomes   — every Monday: check tutor approved 30d ago, count disputes
measure-payout-outcomes           — every Friday: check payout sent 7d ago, verify correct
measure-nudge-outcomes            — every 3 days: check nudge sent 14d ago, converted?
```

**Decision rationale**: `workflow_executions` gains a `decision_rationale jsonb` column capturing the specific signals that triggered the autonomous decision. This is the audit trail that makes learning possible — and the explainability surface for admins reviewing past decisions.

### 8.2 Coherent — Cross-Agent User Experience

**Problem**: Users navigating between Lexi, Sage, and Growth re-explain context every time. The platform feels disjointed.

**Solution**: `PlatformUserContext` (defined in §5.6) makes every agent context-aware from session start. Cross-agent handoffs carry conversation context.

```
CROSS-AGENT EXPERIENCE WITH v2.0

  WITHOUT v2.0:                        WITH v2.0:
  ─────────────────                    ────────────────────────────────
  User opens Lexi                      User opens Lexi
  Lexi starts fresh                    Lexi loads PlatformUserContext:
                                         caas_score: 62 (below 70 threshold)
                                         unread_messages: 3
                                         listing_last_view_days_ago: 18
                                         last_growth_topic: 'listing optimisation'

  User: "Why no bookings?"             User: "Why no bookings?"

  Lexi: "Here are some general         Lexi: "I can see a few things right now:
  tips for getting more bookings..."     - Your listing hasn't been seen in 18 days
                                         - CaaS score 62 (below 70 featured threshold)
                                         - 3 unread messages from potential clients
                                         Your Growth session last week covered listing
                                         optimisation — shall I hand you to Growth
                                         to act on that advice?"

  User clicks Growth                   User clicks Growth
  Growth starts fresh                  Growth receives handoff:
  "Hello! How can I help?"               context: { topic: 'listing optimisation',
                                           from: 'lexi', caas_score: 62 }
                                        Growth: "Continuing from where we left off —
                                          let's look at your listing. I can see your
                                          CaaS score is 62 and you've had no views
                                          in 18 days. Here's what to change first..."
```

**Implementation**: `sessionStorage` handoff (pattern already partially exists for Sage handoffs from Lexi). Extended to all agent pairs. Context encoded by the handing-off agent before redirect. Receiving agent reads on mount and pre-populates its system prompt context block.

---

## 9. Build Phases

```
iPOM BUILD SEQUENCE v2.0

  ✅ DONE               ✅ DONE           PRE-FOUNDATION         Phase 1
  Phase 0               Growth Agent      (agents-core           Nexus Foundation
  ─────────             ────────────      isolated first)        ────────────────
  Cleanup               Chat UI       ──▶ agents-core pkg    ──▶ platform_events
  Dead code             API routes        sage imports fixed      table
  Skeleton              Billing           growth imports fixed     growth-bridge
  Build verify          Admin page        Build verified          process-studio-bridge
                        Stripe            ↓                       Pipeline 1+2 (async)
                        Sidebar link      Only then:              pipeline_jobs queue
                                          Nexus Foundation        PlatformUserContext
                                                                  Platform Console
                                                                  Cost tracking table

  Phase 2                    Phase 3                  Phase 4
  (Actions + HITL)           (Admin Intelligence)     (Network + Automation)
  ────────────────           ────────────────────     ───────────────────────
  User-facing execute        Admin Intelligence        /admin/network/
  endpoint                   Agent                    Org workflows
  Growth action modal        Command Center           LinkedIn OAuth (if approved)
  Write action tools         redesign                 Scheduled campaigns
  Lexi HITL actions          Lexi admin mode          Learning loop pg_cron
  Proactive nudges           AI tier routing          Accuracy calibration UI
  In-app notification UI     Exception queue +        Dynamic tier proposals
  Cross-workflow coord       ownership model
  DLQ retry scheduler        Admin query caching
  Fallback polling cron      AI cost dashboard
  Learning layer DB          Exception escalation
  growth_scores table        (48h email)
```

### Phase 0 — Complete (2–3h actual)

| Task | Status |
|------|--------|
| Remove dead code | ✅ Done |
| Clean skeleton files | ✅ Done |
| Build verified | ✅ Done |

### Pre-Foundation — agents-core Extraction (8–12h) ← NEW

Must complete and verify before Nexus Foundation starts.

| Task | Hours |
|------|-------|
| Extract `BaseAgent`, `PlatformAIAgent`, `MarketplaceAIAgent` into `packages/agents-core/` | 4 |
| Update Sage imports + full build + E2E verification | 3 |
| Update Growth imports + full build + E2E verification | 3 |
| Resolve unexpected circular dependencies + tsconfig | 2 |
| **Total** | **8–12h** |

### Growth Agent Core — Complete (~35h actual)

| Task | Status |
|------|--------|
| `growth/` module: agents, personas, skills, tools, orchestrator | ✅ Done |
| Growth API routes, billing, admin page, Stripe | ✅ Done |
| Growth chat UI + sidebar navigation | ✅ Done |
| Growth Score SQL + hourly cache | TBD — verify (§10) |
| Growth metrics attribution schema | TBD — verify |

### Phase 1 — Nexus Foundation + Platform Extraction (35–45h)

| Task | Hours |
|------|-------|
| `platform_events` table + indexes (migration) | 2 |
| Update bridge files to publish to `platform_events` (sage, lexi) | 2 |
| `growth-bridge.ts` | 2 |
| `process-studio-bridge.ts` | 3 |
| `pipeline_jobs` table + pg_cron job `process-pipeline-jobs` | 3 |
| Pipeline 1: `discovery-knowledge-pipeline.ts` (async, delta-sync, batch embed, semantic dedup) | 7 |
| Pipeline 2: `configurations-knowledge-pipeline.ts` (async) | 4 |
| `PlatformUserContext` interface + server-side fetch + Redis cache | 5 |
| Cross-agent handoff encoding (sessionStorage pattern, all agent pairs) | 3 |
| Unified `agent_subscriptions` table + zero-downtime migration from `sage_pro_subscriptions` | 5 |
| Parameterised `/api/agents/[agentType]/` routes | 6 |
| Shared `<AgentChatUI agentType="..." platformContext={...} />` | 4 |
| Shared rate limiter config including `admin-intelligence` cap | 1 |
| `platform:view` RBAC permission | 1 |
| `/admin/platform/` Platform Console (health grid, pipeline status, event stream, cost summary) | 7 |
| `platform_ai_costs` table + write on every iPOM AI call | 3 |
| Workflow trigger deduplication constraint (migration) | 1 |
| `workflow_entity_cooldowns` table + check in `trigger-workflow.ts` | 3 |
| DLQ retry scheduler pg_cron job | 2 |
| Workflow fallback polling pg_cron job | 2 |
| `growth_scores` table + Growth Score SQL (see §10) + hourly pg_cron | 4 |
| **Total** | **70–80h** |

**Outcome**: Unified agent infrastructure. Lexi always current via async pipelines. Users experience coherent cross-agent context. Platform Console showing cross-system events and AI costs. All production reliability gaps closed.

### Phase 2 — Actions + HITL Gateway (35–45h)

| Task | Hours |
|------|-------|
| User-facing `/api/process-studio/execute/start` (security boundary) | 5 |
| Growth action confirmation modal (in-chat confirmed action UX) | 3 |
| `send_message`, `create_task` action tools | 5 |
| `update_listing`, `update_profile_bio` action tools | 5 |
| `trigger-workflow.ts` HITL gateway shared tool | 3 |
| Lexi HITL actions via gateway (cancel_booking, send_message) | 5 |
| Growth RAG retrieval step (reads `growth_knowledge_chunks`) | 4 |
| Proactive nudge scheduler (pg_cron every 4h, signal generation) | 6 |
| In-app notification UI: bell component + feed + Supabase Realtime | 6 |
| `decision_outcomes` table + workflow bridge writes outcome stubs | 3 |
| `decision_rationale` column on `workflow_executions` | 1 |
| `workflow_exceptions` table + exception queue UI | 4 |
| Exception queue ownership: `claimed_by`/`claimed_at` + soft-lock UX | 3 |
| **Total** | **53–63h** |

**Outcome**: Growth Agent takes actions (user approval required). Lexi executes write actions via Process Studio. In-app notifications live. Exception queue with AI confidence scores and ownership model ready for Phase 3.

### Phase 3 — Campaigns + Admin Intelligence (35–45h)

| Task | Hours |
|------|-------|
| Admin Intelligence Agent (`cas:admin-intelligence`) | 14–16 |
| AI tier router (`classifyAdminTask` + model selection) | 3 |
| Admin query caching (Redis, 1h TTL on aggregate queries) | 3 |
| Admin Intelligence rate limiting (in shared rate limiter) | 1 |
| Admin Intelligence event batching (15-min domain windows) | 3 |
| Admin Command Center homepage redesign | 8 |
| Exception escalation: 48h unclaimed → email admin | 2 |
| Lexi admin mode (admin-scoped tools, admin system prompt) | 5 |
| Admin query bar on command center | 3 |
| AI cost dashboard in Platform Console | 3 |
| Learning layer pg_cron jobs (outcome measurement) | 4 |
| `process_autonomy_config` table + accuracy tracking | 3 |
| Admin Intelligence: weekly tier calibration proposals | 4 |
| Baseline measurement (current admin decision volume — §12 metric) | 2 |
| Growth campaigns: 30-day referral sprint planner | 5 |
| Growth campaigns: delegation setup wizard | 4 |
| **Total** | **67–79h** |

**Outcome**: Admin Command Center live. Daily briefing with accuracy trends. Exception queue with AI confidence and ownership. Lexi answers admin questions. Learning loop active. AI cost visible and controlled.

### Phase 4 — Network Intelligence + Automation (30–40h)

| Task | Hours |
|------|-------|
| `/admin/network/` — network intelligence page | 9 |
| Organisation Onboarding workflow (Process Studio) | 5 |
| Stuck Referral Recovery workflow (Process Studio) | 4 |
| Org Dormancy Re-engagement workflow (Process Studio) | 4 |
| Dynamic autonomy tier calibration UI (admin approves AI proposals) | 5 |
| LinkedIn OAuth (if Marketing Developer Platform approved — start now) | 8 |
| Scheduled Growth campaign process (Process Studio) | 5 |
| **Total** | **40–48h** |

**Outcome**: Network intelligence visible. Key supervised sequences running. Growth Agent Phase 4 tools live. Self-improving autonomy loop closed with admin-facing tier calibration UI.

### Grand Total

| Phase | Scope | Hours | Status |
|-------|-------|-------|--------|
| Phase 0 | Cleanup | 2–3 | ✅ Done |
| Growth Agent core | Chat, API, billing, admin, Stripe | ~35 | ✅ Done |
| Pre-Foundation | agents-core extraction, isolated | 8–12 | **First** |
| Phase 1 | Nexus + platform extraction | 70–80 | Next |
| Phase 2 | Actions + HITL Gateway + in-app notifications | 53–63 | Pending |
| Phase 3 | Admin Intelligence + Learning loop | 67–79 | Pending |
| Phase 4 | Network Intelligence + Automation | 40–48 | Pending |
| **Remaining** | | **~238–282h** | |

> **On estimates**: The v1.0 estimate of 120–160h was feature-level only. v2.0 adds holistic architecture components (learning loop, cross-agent context, operational health), corrects the agents-core sequencing error (4h → 8–12h), and adds a 20% integration-testing buffer. The v2.0 range is the honest estimate for delivering a production-grade, self-improving platform operations layer.

---

## 10. Growth Score — Definition (v2.0, was TBD in v1.0)

The Growth Score is a composite 0–100 signal measuring a tutor's platform health across four dimensions, computed hourly and cached in `growth_scores`. It is not a user-facing score — it is an internal signal used by the Admin Intelligence Agent, proactive nudge triggers, and org health benchmarking.

```
GROWTH SCORE FORMULA (tutors)

  Growth Score = profile_completeness + listing_performance
               + earnings_trajectory + platform_engagement

  profile_completeness  (0–25):
    profile_photo:      0 or 6
    bio_length >= 200:  0 or 5
    subjects_count >= 2:0 or 5
    qualifications:     0 or 5
    response_time_set:  0 or 4

  listing_performance   (0–25):
    views_last_14d >= 10:   0 or 8
    views_last_14d >= 50:   +4 (stacked)
    booking_conversion > 5%:0 or 8
    booking_conversion > 15%:+5 (stacked)

  earnings_trajectory   (0–25):
    bookings_last_30d > 0:     0 or 5
    bookings_30d >= bookings_prev_30d:  0 or 10
    bookings_30d > bookings_prev_30d * 1.1: +5 (stacked)
    active_stripe:             0 or 5

  platform_engagement   (0–25):
    response_rate >= 80%:  0 or 8
    review_rate >= 60%:    0 or 7
    referral_sent_14d:     0 or 5
    lesson_rebooked_rate > 50%: 0 or 5

Thresholds:
  < 40:  Growth Agent flags listing for intervention
  < 70:  Below CaaS featured threshold (separate signal)
  Drop > 5pts in 7d: triggers proactive nudge
  Org avg < 50:  org health concern
```

For non-tutor roles (client, agent, organisation), Growth Score is adapted:
- **Clients**: weighted toward referral activity + booking frequency
- **Agents**: weighted toward active tutor count + referral conversion rate
- **Organisations**: aggregate of member Growth Scores + org-level booking volume

Growth Score SQL is a single CTE query joining `profiles`, `listings`, `bookings`, `referrals`. Cached hourly via pg_cron `compute-growth-scores`.

---

## 11. Design Decisions

### D1: Product name
**Resolved**: Tutorwise iPOM (Intelligent Platform Operations Management). Internal engineering name: Nexus. Users never see either.

### D2: Rebuild or evolve admin
**Resolved**: Evolve, not rebuild. HubPageLayout stays. Domain pages move to Management section. Work is intelligence layer and navigation reframe.

### D3: Per-agent subscription tables vs unified
**Resolved**: Single `agent_subscriptions` table with `agent_type`. Zero-downtime migration from `sage_pro_subscriptions`.

### D4: Agent base class location
**Resolved**: `packages/agents-core/` workspace package. Sequenced as isolated pre-foundation task — not concurrent with Nexus build.

### D5: HITL gateway security boundary
**Resolved**: Two endpoints (`/api/process-studio/execute/start` user-scoped, `/api/admin/...` admin-scoped), same execution engine. Every workflow declares `undoable` and `rollback_procedure`.

### D6: Knowledge pipelines — two, not one
**Resolved**: Pipeline 1 (Discovery → agent knowledge) + Pipeline 2 (Configurations → agent knowledge). Both async via `pipeline_jobs` queue.

### D7: Admin Intelligence — new agent or extend CAS Analyst
**Resolved**: New `cas:admin-intelligence` agent. CAS Analyst = dev pipeline. Admin Intelligence = marketplace operations. Same infrastructure, separate agents.

### D8: Organisation data scope for Growth Agent
**Resolved**: Individual scope (profile_id) for tutor/client/agent personas. Organisation scope (org_id) for org admin persona, gated by `user_is_org_admin()` RLS. Agent cannot cross scopes.

### D9: Proactive nudge trigger mechanism
**Resolved**: pg_cron every 4 hours, checks Growth Score conditions and engagement signals. Delivery: in-app notification (Supabase Realtime on `notifications` table, bell UI built in Phase 2) + email (Resend, existing). User delivery preferences respected.

### D10: Network Intelligence — new page or extend Signal
**Resolved**: New `/admin/network/` page (Phase 4). Signal = content attribution. Network = growth attribution. Different data, different audiences.

### D11: Process Studio workflow editor
**Resolved**: Definitions as code (version-controlled). Config-driven parameters (thresholds, fees) editable by admin without deploy. Full visual editor deferred.

### D12: Growth Score formula (v2.0 — was TBD)
**Resolved**: 4-component composite score (0–100): profile_completeness + listing_performance + earnings_trajectory + platform_engagement, each 0–25. Computed hourly, cached in `growth_scores`. Thresholds: <40 intervention flag, drop >5pts triggers nudge. See §10 for full formula.

### D13: platform_events vs cas_agent_events (v2.0)
**Resolved**: Dedicated `platform_events` table, not an extension of `cas_agent_events`. `cas_agent_events` remains CAS-internal (schema, RLS, retention designed for fine-grained agent turn events). `platform_events` is cross-system (coarser, different retention, different RLS).

### D14: agents-core extraction sequencing (v2.0)
**Resolved**: Isolated pre-foundation task. Done before Nexus Foundation starts. PRs: extract → Sage verified → Growth verified → ✅ proceed. Revised estimate: 8–12h (not 4h).

### D15: Knowledge pipeline async vs synchronous (v2.0)
**Resolved**: Both pipelines async via `pipeline_jobs` queue. Caller (admin mutation, discovery scan) enqueues a job and returns immediately. pg_cron processes every 2 minutes with retry (max 5 attempts, exponential backoff). Platform Console shows queue depth and last successful run.

### D16: Exception queue ownership model (v2.0)
**Resolved**: `claimed_by uuid` + `claimed_at timestamptz` on `workflow_exceptions`. 15-minute soft lock: other admins see claimed status but can override-claim. Unclaimed >48h triggers email escalation to admin team. This is a go-live requirement for Phase 3, not a future concern.

### D17: LinkedIn OAuth timeline (v2.0)
**Resolved**: LinkedIn Marketing Developer Platform application must start immediately — external approval takes 4–6 weeks. If not approved before Phase 4 implementation begins, `post_to_social` becomes Phase 5. Phase 4 includes a manual copy-paste placeholder workflow as fallback.

### D18: PlatformUserContext as a platform-level construct (v2.0)
**Resolved**: `PlatformUserContext` is a platform-level interface (not Lexi-specific). Fetched server-side at session start for any conversational agent. Injected into agent system prompt. Redis-cached per user for 5 minutes. Enables cross-agent awareness and context-carrying handoffs.

### D19: Learning loop architecture (v2.0)
**Resolved**: `decision_outcomes` table + `process_autonomy_config` + weekly Admin Intelligence Agent review. Autonomous decisions tracked with `decision_rationale` jsonb. Outcomes measured at 14/30/60/90 day lags via pg_cron. Tier expansion proposals require admin approval. Tier contraction (accuracy drops) is automatic and immediate.

### D20: AI tier routing for Admin Intelligence Agent (v2.0)
**Resolved**: Task classification before model selection. Rules-only for threshold checks (0 cost). Gemini Flash for summarisation. Claude Sonnet for exception recommendations. Grok 4 Fast for daily brief only. Estimated 5–10x cost reduction vs flat frontier model use.

### D21: Organisation Growth Agent billing (v2.0)
**Resolved**: Org admin accessing Growth Agent in org scope uses their personal subscription. A separate org-tier subscription (`agent_type='growth-org'`) is a Phase 4+ addition. Org scope is currently gated by `user_is_org_admin()` and personal `growth` subscription — org admin must have Growth Pro active. If not, org scope falls back to individual scope.

---

## 12. Success Metrics

| Metric | Target | Baseline Required | Measured By |
|--------|--------|------------------|-------------|
| Admin exception queue usage | ≥80% of admin decisions via queue | Measure before Phase 3 launch | `admin_activity_log` — queue vs direct page |
| Autonomous operation rate | ≥70% of routine decisions without human intervention | Measure before Phase 3 launch | `workflow_executions WHERE triggered_by='autonomous'` |
| Autonomous decision accuracy | ≥90% per process (varies by process) | Day 1 of Phase 3 | `decision_outcomes` — rolling 30d |
| Lexi knowledge staleness | <4h after config change or feature ship | N/A (pipeline-driven) | `pipeline_jobs.processed_at` — last successful run |
| Cross-system event coverage | 100% of lifecycle events captured | N/A | `platform_events` coverage per `source_system` |
| Agent write action audit completeness | 100% of write actions via HITL gateway | N/A | `workflow_executions.triggered_by` not null |
| New agent build cost | <15h per new agent (down from ~50h) | 50h baseline (current) | Actual build time |
| Admin daily brief | Available by 8am every day | N/A | pg_cron job completion rate |
| AI cost per autonomous decision | <£0.001 per routine decision | Measure at Phase 1 | `platform_ai_costs` |
| Cross-agent context load time | <500ms PlatformUserContext fetch | N/A | Server-side timing |
| Nudge effectiveness | >15% conversion rate on proactive nudges | Measure at Phase 2 | `decision_outcomes.outcome_metric='nudge_converted'` |

**Baseline measurements required before Phase 3**: Current admin decision volume (manual vs queue-based) and current autonomous operation rate must be established at Phase 2 completion so the Phase 3 targets have a meaningful denominator.

---

## 13. Open Questions — Resolved and Remaining

### Resolved in v2.0

| Question | Resolution |
|----------|-----------|
| Discovery scan frequency for Pipeline 1 | On CAS deploy + daily cron. Admin can trigger manually. |
| Admin Intelligence Agent cost | AI tier routing (D20) — most operations use rules or cheap tier. Daily brief is the only frontier call. |
| Exception escalation policy | 48h unclaimed → email admin team. Field `escalated_at` set. |
| Multi-admin queue ownership | `claimed_by` + `claimed_at` + 15-min soft lock (D16). Override-claim available. |
| `cas_agent_events` as event bus | Dedicated `platform_events` table (D13). |
| Growth Score formula | Defined (D12, §10). |
| Org Growth Agent billing | Personal subscription required; org-tier a Phase 4+ addition (D21). |
| `agents-core` extraction risk | Isolated pre-foundation task with sequenced PR strategy (D14). |
| Pipeline failure modes | Async via `pipeline_jobs` queue with retry (D15). |
| LinkedIn OAuth timeline | Application starts now; Phase 4 placeholder if not approved (D17). |

### Remaining Open Questions

**Q1: Audit log retention policy (GDPR)**
`platform_events` and `workflow_executions` accumulate user-linked data. Under UK GDPR, automated decision-making records (tutor approval, commission calculation) have specific subject access request (SAR) implications. Recommend: 12-month rolling retention, archive to cold storage (Supabase pg_dump to S3). Must be designed before Phase 3 autonomous operations scale.

**Q2: `decision_outcomes` outcome metric definitions**
The learning loop requires agreed definitions for what constitutes a "good" vs "bad" autonomous decision outcome. E.g., for Tutor Approval: is a "good" outcome zero disputes in 90 days, or positive reviews received? Product and ops must define outcome metrics per process before Phase 3 pg_cron jobs are written.

**Q3: Admin Intelligence Agent — second admin role**
If Tutorwise grows to 3+ admins with different functions (finance, content, growth), should the exception queue route by domain? Finance disputes → finance admin, content violations → content admin. Currently the exception queue is flat (all admins see all exceptions). Role-based routing is a Phase 3+ design decision.

**Q4: Growth Score for non-tutor roles — validation**
The Growth Score formula in §10 is defined for tutors. Client, agent, and organisation variants are sketched but not validated. These must be agreed with product before the `compute-growth-scores` pg_cron job is built for non-tutor profiles.

---

## 14. Related Documents

- [Growth Agent Solution Design v2.0](./growth-agent-solution-design.md)
- [Process Execution Solution Design v3.2](./process-execution-solution-design.md)
- [CAS Solution Design](../cas/docs/CAS-SOLUTION-DESIGN.md)
- [Lexi Enhancement Proposal v1.0](./lexi-enhancement-proposal.md)
- [iPOM Architecture Audit v1.0](./ipom-architecture-audit.md) — audit that informed this version

---

*Version 2.0 — Consolidated from v1.0 + Architecture Audit recommendations + Holistic Architecture additions.*
*Supersedes: ipom-solution-design.md v1.0*

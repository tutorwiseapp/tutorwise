# Tutorwise iPOM — Intelligent Platform Operations Management

**Product**: Tutorwise iPOM (Product 3)
**Status**: Approved Architecture — Ready for Phased Implementation
**Date**: 2026-03-05
**Owner**: Product Team
**Version**: 1.0 — Consolidated from Nexus design + strategic admin vision

---

## 1. Product Vision

### 1.1 What Is iPOM?

Tutorwise iPOM is the intelligent operating system for the Tutorwise marketplace. It is the engine that makes Products 1 and 2 sustainable and scalable — not by adding features users see, but by making the platform run itself.

iPOM turns Tutorwise from a managed marketplace (humans operating every workflow) into an autonomous marketplace (the platform handles routine operations, humans handle exceptions). It connects every system Tutorwise has built — CAS, Sage, Lexi, Growth, Process Studio, AI Agent Studio — into a coherent, self-aware platform with a single operational interface.

### 1.2 One-Line Pitch

> "iPOM makes Tutorwise run itself — automating routine operations, surfacing what needs human judgment, and making every AI agent more intelligent over time."

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
│  The engine room: autonomous operations, intelligence hub,      │
│  exception management, cross-system observability               │
└─────────────────────────────────────────────────────────────────┘
```

Products 1 and 2 generate the activity. iPOM manages it.

### 1.4 The Strategic Problem

The Tutorwise platform has evolved iteratively into a set of powerful but disconnected capabilities:

| System | What it does | What it lacks |
|--------|-------------|---------------|
| Process Studio | Automates workflows with HITL | No agent integration, no cross-system visibility |
| CAS | Builds and deploys AI agents | Focused on dev pipeline, not operational intelligence |
| Sage | Delivers AI tutoring | Events isolated, feedback not cross-system |
| Lexi | Answers platform questions | Knowledge goes stale, no write actions |
| Growth | Advises tutors on growth | Built (read-only, Phase 1 tools); actions + campaigns not yet wired to platform |
| Admin pages | Show operational data | Reactive, manual, no AI intelligence layer |

The strategic problem is not that any individual system is broken. It is that they form **seven silos that happen to share a database**. No system knows what another is doing. No admin view shows the whole picture. Every new agent duplicates subscription logic, API routes, and UI. The cost of adding capability grows linearly instead of compounding.

```
BEFORE iPOM — Seven Silos

  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
  │  Sage  │  │  Lexi  │  │ Growth │  │  CAS   │  │Process │  │AI Agent│  │ Admin  │
  │runtime │  │runtime │  │runtime │  │pipeline│  │ Studio │  │ Studio │  │ pages  │
  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
      │            │            │            │            │            │            │
      │ own sub    │ no sub     │ own sub    │ own jobs   │ own HITL   │ own reg    │ no AI
      │ table      │ rate limit │ table TBD  │            │            │            │
      │            │            │            │            │            │            │
      └────────────┴────────────┴────────────┴────────────┴────────────┴────────────┘
                                             │
                                    Supabase Database
                                  (the only shared layer)

  Adding a new agent = copy subscription table + copy API routes + copy UI + copy rate limiter
  Admin health = navigate 7 dashboards. Lexi goes stale every deploy. No cross-system events.
  Cost per new agent: ~50h. Cost compounds linearly, not as a platform.
```

```
AFTER iPOM — Integrated Platform

  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
  │  Sage  │  │  Lexi  │  │ Growth │  │  CAS   │  │Process │  │AI Agent│
  │runtime │  │runtime │  │runtime │  │pipeline│  │ Studio │  │ Studio │
  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
      └────────────┴────────────┴────────────┴────────────┴────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │     NEXUS — Platform Bus     │
                              │   cas_agent_events (unified) │
                              └──────┬───────────┬───────────┘
                                     │           │
                  ┌──────────────────┘           └──────────────────┐
                  │                                                  │
         ┌────────▼────────┐   ┌──────────────────┐   ┌────────────▼────────┐
         │  Intelligence   │   │   Automation     │   │   Operations        │
         │  Hub            │   │   Runtime        │   │   Interface         │
         │  (CAS + Admin   │   │   (Process       │   │   (Admin Command    │
         │   Intel Agent)  │   │    Studio)       │   │    Center)          │
         └─────────────────┘   └──────────────────┘   └─────────────────────┘
                  │                     │                        │
                  └─────────────────────┴────────────────────────┘
                                        │
                               Shared Infrastructure
                  agent_subscriptions │ /api/agents/[type]/ │ AgentChatUI
                  rate-limiter config │ agents-core package  │ knowledge pipelines

  Adding a new agent = register orchestrator + 1 Stripe price ID. Cost: ~15h.
```

iPOM solves this at the architectural level, not the feature level.

### 1.5 What iPOM Is Not

- **Not a user-facing product** — users never see "iPOM" directly
- **Not a replacement** for any existing system — Process Studio, CAS, AI Agent Studio remain as-is
- **Not glue code** — iPOM is a strategic product investment with its own roadmap, metrics, and value proposition
- **Not a new monolith** — iPOM is a protocol, tooling, and interface layer, not a new central service

---

## 2. The Autonomous Operations Model

### 2.1 The Core Idea

The current admin is organised around **domains** — bookings, listings, accounts, referrals, organisations. Admins navigate to a domain, see data, decide manually. This is a reporting tool.

iPOM changes the model. The admin is reorganised around **autonomy levels**. The platform handles everything it can handle on its own. It escalates what it cannot. Admins handle exceptions, not operations.

```
DECISION ROUTING FLOW — How every platform event is handled

  Platform Event
  (tutor applies, booking cancelled, referral signed up, org goes dormant, dispute raised...)
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
  No human         override)       + recommendation Studio
  needed                                           Design
         │              │              │
         └──────────────┴──────────────┘
                        │
                 Full audit trail in
                 workflow_executions
                 + cas_agent_events
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

### 2.3 The Admin Command Center

The admin homepage stops being a dashboard of statistics. It becomes the command centre for the autonomous platform:

```
/admin/

  ┌─────────────────────────────────────────────────────────────┐
  │  Good morning. Platform brief — Thursday 5 March            │
  │                                                             │
  │  🔴 3 exceptions need your decision                        │
  │  🟡 2 supervised sequences awaiting approval                │
  │  🟢 Platform running normally — all processes nominal       │
  └─────────────────────────────────────────────────────────────┘

  Ask anything...  [conversational query bar — Lexi admin mode]

  ┌──────────────────────────────────────────────────────────────┐
  │  EXCEPTION QUEUE                                             │
  │  ─────────────────────────────────────────────────────────  │
  │  Tutor application — borderline score (54/100)              │
  │  Profile: 78% complete | Unverified | 2 listings            │
  │  [Approve] [Reject] [Request more info]                     │
  │                                                             │
  │  Dispute — £120, James vs client re: cancellation           │
  │  AI recommendation: partial refund £60 (balanced evidence)  │
  │  [Accept recommendation] [Override] [Escalate]             │
  │                                                             │
  │  Oakwood Learning — 90 days dormant, high-value org         │
  │  12 members, £4,200 lifetime GMV. Auto-outreach failed.     │
  │  [Contact org admin] [Mark inactive] [Assign to Growth]     │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │  AUTONOMOUS OPERATIONS (last 7 days)                        │
  │  31 tutor applications approved      £6,200 payouts sent    │
  │  204 referral nudges sent            12 orgs re-engaged     │
  │  156 knowledge chunks updated        8 workflows completed  │
  │  [Override any decision]  [View full audit log]             │
  └──────────────────────────────────────────────────────────────┘
```

### 2.4 Navigation Reframe

**Current structure** (domain-first — what you navigate to):
```
Bookings | Listings | Accounts | Financials | Referrals | Organisations | ...
```

**iPOM structure** (autonomy-first — how you work):
```
Operations   Exception queue, HITL approvals, autonomous activity log
Intelligence Signal analytics, network intelligence, AI system health
Management   Browse interfaces: bookings, listings, accounts, financials,
             referrals, organisations (unchanged content, secondary role)
Configuration Shared fields, settings, process workflows, agent management
```

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
  ── Organisations               ── Exception Queue        ← primary
  ── Reviews                     ── HITL Approvals
                                 ── Autonomous Activity Log
  AI SYSTEMS
  ── Sage                        INTELLIGENCE
  ── Lexi                        ── Signal (content → GMV)
  ── Growth                      ── Network (referral graph)
  ── CAS                         ── Platform Health
  ── Process Studio
  ── AI Agents                   MANAGEMENT               ← secondary
                                 ── Bookings
  PLATFORM                       ── Listings
  ── (no unified view)           ── Accounts
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

The existing domain pages do not disappear. They move from primary navigation to the Management section — audit and browse interfaces when you need to drill into a specific domain.

---

## 3. Core Capabilities

iPOM has four integrated capabilities that together deliver autonomous platform operations:

```
┌────────────────────────────────────────────────────────────────────┐
│                       TUTORWISE iPOM                               │
├──────────────┬─────────────────┬────────────────┬──────────────────┤
│  AUTOMATION  │  INTELLIGENCE   │  OPERATIONS    │  NEXUS           │
│  RUNTIME     │  HUB            │  INTERFACE     │  (technical)     │
│              │                 │                │                  │
│  Process     │  CAS Analyst    │  Admin Command │  Event bus       │
│  Studio:     │  +              │  Center:       │  Knowledge       │
│  Discovery,  │  Admin Intel    │  Exception     │  pipelines       │
│  Design,     │  Agent          │  queue         │  Bridge files    │
│  Execution   │                 │  HITL approvals│  Message types   │
│              │  Generates:     │  Autonomous    │                  │
│  Autonomous  │  Daily brief    │  ops summary   │  Connects all    │
│  workflows   │  Anomaly alerts │  Conversational│  systems to the  │
│  HITL pauses │  Signals for    │  query (Lexi   │  event store     │
│  Audit trail │  exception queue│  admin mode)   │                  │
└──────────────┴─────────────────┴────────────────┴──────────────────┘
```

### 3.1 Automation Runtime — Process Studio

The execution engine for all automated operations. Already built (Phase 1 complete). iPOM's role is to expand its scope:

```
PROCESS STUDIO WORKFLOW INVENTORY

  LIVE (running in production)
  ┌───────────────────────────────────────────────────────────────┐
  │  Tutor Approval          │  Commission Payout                  │
  │  Webhook: profile UPDATE │  Cron: Fri 10am                     │
  │  HITL: admin approves    │  Steps: eligible? → stripe.payout  │
  └───────────────────────────────────────────────────────────────┘

  SHADOW (running parallel, not acting)
  ┌───────────────────────────────────────────────────────────────┐
  │  Booking Lifecycle (Human Tutor)   Booking Lifecycle (AI)     │
  │  Monitors real flow vs expected    Same — AI tutor variant     │
  └───────────────────────────────────────────────────────────────┘

  SUBPROCESS (called by other workflows)
  ┌───────────────────────────────────────────────────────────────┐
  │  Referral Attribution    │  (no standalone trigger)           │
  └───────────────────────────────────────────────────────────────┘

  iPOM ADDS (new workflows)
  ┌───────────────────────────────────────────────────────────────┐
  │  Organisation Onboarding │  Stuck Referral Recovery           │
  │  Trigger: org created    │  Trigger: signup >14d, no booking  │
  │  Steps: welcome → brief  │  Steps: detect → nudge sequence    │
  │  → delegation setup CTA  │  → Growth Agent flag if persists   │
  ├───────────────────────────┼───────────────────────────────────┤
  │  Listing Quality          │  Org Dormancy Re-engagement        │
  │  Intervention             │  Trigger: 0 bookings in 60 days   │
  │  Trigger: Growth flags   │  Steps: 30d warn → 60d outreach   │
  │  listing score < 40      │  → 90d HITL escalation            │
  └───────────────────────────────────────────────────────────────┘

  ALL AGENTS delegate write actions through Process Studio
  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
  │   Growth    │   │    Lexi     │   │  Future     │
  │   Agent     │   │  (admin)    │   │  agents     │
  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
         └─────────────────┴─────────────────┘
                           │
              POST /api/process-studio/execute/start
                           │
                           ▼
                  Process Studio Engine
                  (single action runtime)
                  Full audit trail + idempotency
```

Process Studio is the single action runtime for ALL conversational agents. Growth Agent, Lexi, and any future agent delegate write actions through Process Studio — not duplicating action logic per agent.

### 3.2 Intelligence Hub — CAS + Admin Intelligence Agent

Two intelligence layers:

**CAS Analyst** (existing, extended): already analyses CAS build pipeline patterns. iPOM extends it with operational data tools so it can analyse marketplace patterns across bookings, referrals, organisations, and listings.

**Admin Intelligence Agent** (new, within CAS): a dedicated `cas:admin-intelligence` agent that:
- Runs daily at 8am — generates the admin briefing
- Runs continuously — anomaly detection across all operational domains
- Responds to conversational queries from the admin command center (via Lexi admin mode)
- Generates the exception queue signals that feed the admin homepage

The Admin Intelligence Agent has read-only tools across all operational tables. It does not take autonomous actions — it generates signals that feed the Autonomous, Supervised, and Exception layers.

### 3.3 Operations Interface — Admin Command Center

The redesigned admin. The primary interface is the exception queue and autonomous operations summary. The secondary interface is the existing domain pages (Management section). Detailed design in §6.

### 3.4 Nexus — Technical Integration Layer

The connective tissue inside iPOM. Detailed in §5. Nexus is the internal/engineering name for this layer — not the product name.

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
│         Extended cas/messages/ — all systems publish here            │
│         Persisted to cas_agent_events (source_system column)        │
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
| **Growth** | Advisory agent + platform-wide signal source | New bridge — audit, session, action events |
| **AI Agent Studio** | Agent Registry + Factory | Lifecycle events (`agent.created`, `agent.published`) |
| **Admin Command Center** | Human interface for the autonomous platform | Exception queue consumer + HITL approval interface |

---

## 5. Nexus — Technical Integration Layer

### 5.1 Platform Event Bus

**Problem**: Systems cannot observe each other.

**Solution**: Extend `cas/messages/` to cover all platform systems. Every agent publishes structured events on key lifecycle moments. All events persist to `cas_agent_events` with a `source_system` column.

**Extended AgentIdentifiers** (additions to `cas/messages/types.ts`):
```typescript
| 'growth'                         // Growth Agent sessions and audits
| 'process-studio'                 // Workflow execution lifecycle
| 'process-studio:discovery'       // Discovery scan events
| 'process-studio:execution'       // Execution engine events
| 'ai-agent-studio'                // Agent creation/publication
| 'cas:admin-intelligence'         // Admin Intelligence Agent
```

**Extended MessageTypes**:
```typescript
// Workflow lifecycle
| 'workflow.started'
| 'workflow.completed'
| 'workflow.paused'                 // HITL awaiting approval
| 'workflow.resumed'
| 'workflow.failed'
| 'workflow.shadow_divergence'      // Shadow mode: real ≠ expected

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
| 'admin.briefing_generated'
```

### 5.2 Knowledge Pipelines

Two pipelines feed all conversational agents with current platform knowledge:

**Pipeline 1 — Discovery → Agent Knowledge**

Triggered after every Process Discovery scan completes:

```
PIPELINE 1: Discovery → Agent Knowledge

  Process Discovery scan completes
  (triggered by: CAS deploy OR daily cron OR manual)
         │
         ▼
  workflow_discovery_results (DB table)
  ┌────────────────────────────────────────┐
  │ id │ name           │ description │... │
  │ 1  │ Tutor Approval │ Handles...  │    │
  │ 2  │ Commission...  │ Runs every  │    │
  └────────────────────────────────────────┘
         │
         ▼
  discovery-knowledge-pipeline.ts
  ┌────────────────────────────────────────────────────────────┐
  │  For each workflow_discovery_results row:                   │
  │                                                            │
  │  1. Format: name + description + steps + source_type       │
  │  2. Hash content → compare with stored hash                │
  │     ├── Hash matches? → SKIP (unchanged)                   │
  │     ├── Hash differs? → UPDATE chunk + re-embed            │
  │     └── New row?      → INSERT chunk + embed               │
  │  3. Deleted row?      → DELETE chunk                       │
  │  4. Embed via gemini-embedding-001 (768d)                  │
  └────────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────────────────┐
         ▼                                      ▼
  lexi_knowledge_chunks                growth_knowledge_chunks
  category='processes'                 (process-relevant subset)

  Lexi can now answer:                 Growth can now answer:
  "How does tutor approval work?"      "When will my commission arrive?"
  "What triggers a payout?"            "What happens after I get approved?"
```

Delta-sync strategy: hash the formatted content of each discovery result. On re-scan, compare hashes — update changed chunks, skip unchanged, delete removed. Prevents duplicate chunk accumulation.

**Pipeline 2 — Configurations → Agent Knowledge**

Triggered whenever a `shared_fields` option is created, updated, or deleted:

```
PIPELINE 2: Configurations → Agent Knowledge

  Admin edits shared_fields in /admin/configurations/
  (adds "IB Diploma" subject, updates delivery mode options, etc.)
         │
         ▼
  updateSharedField() API call
  configurations-knowledge-pipeline.ts (hook on mutation)
         │
         ▼
  ┌────────────────────────────────────────────────────────────┐
  │  For each changed field:                                   │
  │                                                            │
  │  Format: field_name + contexts it appears in + all options │
  │  e.g. "subjects: GCSE Maths, A-Level Physics, IB Diploma, │
  │        Further Maths, ... (used in: listing.tutor,         │
  │        onboarding.tutor, account.tutor)"                   │
  │                                                            │
  │  Embed → Upsert into lexi_knowledge_chunks                 │
  │  category='platform-config'                                │
  └────────────────────────────────────────────────────────────┘
         │
         ▼
  Lexi + Growth know about new subjects/options within minutes

  EXAMPLE — Without Pipeline 2:
  User: "Do you offer IB Diploma tutoring?"
  Lexi: "I don't have information about IB Diploma on our platform"  ← WRONG

  EXAMPLE — With Pipeline 2:
  Admin adds "IB Diploma" to subjects at 2pm
  Pipeline runs at 2:00:14pm
  User asks at 2:05pm:
  Lexi: "Yes! We have tutors offering IB Diploma tuition. Here's how to find them..." ← CORRECT
```

This solves one of the highest-frequency knowledge staleness problems. When admin adds "IB Diploma" as a subject, Growth Agent and Lexi know within minutes — not on the next manual knowledge update.

### 5.3 HITL Action Gateway

**Problem**: Conversational agents (Lexi, Growth) need to take write actions but building per-agent action tools duplicates logic, loses audit trails, and has no idempotency.

**Solution**: Process Studio is the single action runtime for ALL agents. When any agent needs to execute a write action, it delegates through the HITL gateway.

```
HITL ACTION GATEWAY — Full Sequence

  USER                    AGENT                  PROCESS STUDIO
  (tutor)                (Growth/Lexi)            (execution engine)
    │                       │                          │
    │ "Update my bio"        │                          │
    ├──────────────────────▶│                          │
    │                       │ build suggestion          │
    │                       │ render in chat            │
    │◀──────────────────────┤                          │
    │                       │                          │
    │ [Approve change]       │                          │
    ├──────────────────────▶│                          │
    │                       │ POST /api/process-studio/execute/start
    │                       │ { processId: 'profile-update',          │
    │                       │   contextData: { bio: '...' },          │
    │                       │   triggeredBy: 'growth',                │
    │                       │   profileId: user.profile_id }          │
    │                       ├─────────────────────────▶│
    │                       │                          │
    │                       │                          │ auth check:
    │                       │                          │ user-facing endpoint
    │                       │                          │ scoped to profile_id
    │                       │                          │ (NOT admin RBAC)
    │                       │                          │
    │                       │ { executionId, status }  │ run to HITL node
    │                       │◀─────────────────────────┤ → pause
    │                       │                          │
    │ "Confirming... ✓"      │                          │
    │◀──────────────────────┤                          │
    │                       │                          │
    │ [Final confirm]        │                          │
    ├──────────────────────▶│                          │
    │                       │ POST /execute/[id]/resume│
    │                       │ { decision: "approve" }  │
    │                       ├─────────────────────────▶│
    │                       │                          │ execute:
    │                       │                          │ UPDATE listings
    │                       │                          │ notify search index
    │                       │                          │ log to audit trail
    │                       │ { status: "completed" }  │
    │                       │◀─────────────────────────┤
    │                       │                          │
    │ "Done. Bio updated."   │                          │
    │◀──────────────────────┤                          │

  SECURITY BOUNDARY — Two distinct endpoints, same engine:

  /api/process-studio/execute/start   ← user-facing (Growth, Lexi user mode)
    Auth: user session, scoped to profile_id
    Cannot escalate privileges

  /api/admin/process-studio/execute/start  ← admin only (HITL queue, CAS)
    Auth: admin RBAC (requiresAdmin())
    Full execution context

  Both call the same PlatformWorkflowRuntime internally.
```

**Security boundary** (resolved Gap G2): A separate user-facing `/api/process-studio/execute/start` endpoint, authenticated as the requesting user's session (scoped to their `profile_id`), distinct from `/api/admin/process-studio/execute/start` which requires admin RBAC. Both call the same execution engine internally — different auth layers.

### 5.4 Bridge Files

Following the existing `sage-bridge.ts` / `lexi-bridge.ts` pattern:

```
BRIDGE FILE WIRING — All systems publishing to the event bus

  cas/integration/
  ├── sage-bridge.ts          (existing)
  │     handleFeedback()     → feedback.submitted
  │     handleSessionEvent() → session.started / session.ended
  │     handleProgress()     → (progress events)
  │
  ├── lexi-bridge.ts          (existing)
  │     handleSessionEvent() → session.started / session.ended
  │     handleEscalation()   → (escalation events)
  │
  ├── growth-bridge.ts        (NEW)
  │     handleAuditCompleted()  → growth.audit_completed
  │     handleSessionEvent()    → session.started / session.ended
  │     handleActionTaken()     → growth.action_taken
  │     handleScoreUpdated()    → growth.score_updated
  │
  └── process-studio-bridge.ts (NEW)
        handleWorkflowStarted()    → workflow.started
        handleWorkflowCompleted()  → workflow.completed
        handleWorkflowPaused()     → workflow.paused
                                      + raise exception signal → admin queue
        handleWorkflowFailed()     → workflow.failed
                                      + raise exception signal → admin queue
        handleShadowDivergence()   → workflow.shadow_divergence
        handleScanCompleted()      → discovery.scan_completed
                                      + trigger Pipeline 1

  All bridges publish to:
  cas_agent_events (source_system column identifies origin)
         │
         ▼
  Platform Console   Admin Command Center   Lexi admin mode
  (event stream)     (alerts tab)           (operational queries)
```

**`cas/integration/growth-bridge.ts`**
- `handleAuditCompleted(event)` → publish `growth.audit_completed`
- `handleSessionEvent(event)` → publish `session.started` / `session.ended`
- `handleActionTaken(event)` → publish `growth.action_taken`
- `handleScoreUpdated(event)` → publish `growth.score_updated`

**`cas/integration/process-studio-bridge.ts`**
- `handleWorkflowStarted(event)` → publish `workflow.started`
- `handleWorkflowCompleted(event)` → publish `workflow.completed`
- `handleWorkflowPaused(event)` → publish `workflow.paused` + raise exception signal
- `handleWorkflowFailed(event)` → publish `workflow.failed` + raise exception signal
- `handleShadowDivergence(event)` → publish `workflow.shadow_divergence`
- `handleScanCompleted(event)` → publish `discovery.scan_completed` + trigger Pipeline 1

### 5.5 Shared Agent Tools

Tools consumed by any conversational agent — not Lexi-specific or Growth-specific:

```
apps/web/src/lib/process-studio/agent-tools/
  get-executions.ts        ← live execution state for a user (Lexi + Growth)
  trigger-workflow.ts      ← HITL action gateway (all user-facing agents)
  list-approvals.ts        ← pending HITL tasks (admin mode)
  approve-task.ts          ← approve/reject HITL task (admin mode)
  get-divergences.ts       ← shadow mode divergence report (admin mode)
```

### 5.6 Database Changes

```sql
-- Extend event store for cross-system observability
ALTER TABLE cas_agent_events
  ADD COLUMN source_system text DEFAULT 'cas';

CREATE INDEX idx_cas_agent_events_source ON cas_agent_events(source_system);

-- New knowledge table for Growth Agent
CREATE TABLE growth_knowledge_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  embedding vector(768),
  category text,            -- 'processes' | 'platform-config' | 'growth-strategy'
  source_type text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- New iPOM process workflows (added to workflow_processes)
-- Organisation Onboarding
-- Stuck Referral Recovery
-- Listing Quality Intervention
-- Org Dormancy Re-engagement
```

---

## 6. Intelligence Layer

### 6.1 Admin Intelligence Agent

A new CAS agent (`cas:admin-intelligence`) with read-only tools across all operational tables. Runs on two triggers:

```
ADMIN INTELLIGENCE AGENT — Architecture

  ┌──────────────────────────────────────────────────────────┐
  │               cas:admin-intelligence                     │
  │                                                          │
  │  READ-ONLY TOOLS (all operational tables)               │
  │  ┌──────────────────┐  ┌──────────────────┐            │
  │  │read_booking_      │  │read_listing_      │            │
  │  │signals()         │  │signals()         │            │
  │  │  cancellation    │  │  quality dist.   │            │
  │  │  velocity drops  │  │  SEO gaps        │            │
  │  │  revenue forecast│  │  pricing anomaly │            │
  │  └──────────────────┘  └──────────────────┘            │
  │  ┌──────────────────┐  ┌──────────────────┐            │
  │  │read_referral_    │  │read_org_signals() │            │
  │  │signals()         │  │  dormancy        │            │
  │  │  ghost signups   │  │  health index    │            │
  │  │  bottleneck pos. │  │  delegation rate │            │
  │  │  top referrers   │  │  churn risk      │            │
  │  └──────────────────┘  └──────────────────┘            │
  │  ┌──────────────────┐  ┌──────────────────┐            │
  │  │read_financial_   │  │get_hitl_queue()  │            │
  │  │signals()         │  │  all pending     │            │
  │  │  payout anomaly  │  │  HITL approvals  │            │
  │  │  dispute pattern │  │  across all      │            │
  │  └──────────────────┘  │  workflows       │            │
  │                         └──────────────────┘            │
  └──────────────────────────────────┬───────────────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
  TRIGGER 1: Daily 8am   TRIGGER 2: Event-driven   TRIGGER 3: Query
               │         (booking drop, org         (admin asks via
               ▼         dormancy, dispute, etc.)   Lexi admin mode)
  ┌────────────────────┐       │                         │
  │ Admin Briefing     │       ▼                         ▼
  │ ─────────────────  │  ┌──────────────────┐   ┌─────────────┐
  │ Exceptions: 3      │  │ Exception Signal │   │ Conversational│
  │ Supervised: 2      │  │ severity: high   │   │ Response    │
  │ Auto ops summary   │  │ domain: referrals│   │             │
  │ System health      │  │ root_cause: ...  │   │ "23 ghost   │
  └─────────┬──────────┘  │ recommendation:  │   │ signups in  │
            │             │ "trigger recovery│   │ Sept cohort"│
            ▼             │  workflow"       │   └─────────────┘
  admin.briefing_         └──────┬───────────┘
  generated event                │
            │               admin.exception_raised event
            │                    │
            └────────────────────┘
                        │
                        ▼
            Admin Command Center
            Exception Queue + Autonomous Ops Summary
```

**Scheduled (daily at 8am)**: Generates the admin briefing
- Scans all exception signals from the last 24h
- Summarises autonomous operations activity
- Identifies any supervised sequences requiring approval
- Publishes `admin.briefing_generated` to the event bus

**Continuous (event-driven)**: Anomaly detection
- Listens to operational events (booking drops, referral conversion changes, org dormancy crossing thresholds)
- Publishes `admin.exception_raised` with severity, domain, root cause, and recommended action
- These feed directly into the exception queue on the admin command center

### 6.2 Domain Intelligence

**Bookings**
- Cancellation rate spike detection (threshold: +25% vs 7-day average)
- Revenue forecast (7-day projection with confidence interval)
- Booking velocity anomaly (new bookings dropping, new clients not booking)

**Listings**
- Quality score distribution (Growth Agent flags surfaced at platform level)
- SEO gaps (high-demand subjects with low-quality or missing listings)
- Pricing anomaly (tutors priced >30% below market with high CaaS scores)

**Referrals**

```
REFERRAL PIPELINE BOTTLENECK ANALYSIS

  Full pipeline:
  Referral link clicked
         │ click-through rate
         ▼
  Signed Up          1,240 clicks → 186 signups (15%)
         │ profile completion rate        ↑
         ▼                         85% bounced here
  Profile Complete   186 signups → 74 complete (40%)
         │ first booking rate             ↑
         ▼                         60% ghost signups
  First Booking      74 complete → 22 booked (30%)
         │                                ↑
         ▼                         70% drop here — biggest leak
  Converted          22 converted (12% of signups)

  Admin Intelligence Agent surfaces:
  "61 ghost signups (>14 days, no profile). Top leak: profile
   completion step. Rec: trigger Stuck Referral Recovery workflow
   for these 61. [Approve sequence] [Preview message]"

  "22 profiles complete but never booked. Avg time stuck: 9 days.
   Rec: trigger 'first booking nudge' with discount code.
   [Approve] [Override message]"
```

- Pipeline bottleneck analysis (where signups get stuck: click → signup → converted)
- Ghost signup detection (signed up via referral > 14 days ago, no profile completion)
- Top referrer identification (by conversion quality, not volume)
- Referral velocity (is the referral graph growing, stable, or contracting?)

**Organisations**
- Org health index (collective booking volume, member Growth Scores, delegation adoption)
- Dormancy detection (0 new member bookings in 60 days → supervised sequence)
- Delegation opportunity (orgs with low referral code adoption among members)
- B2B pipeline value (new org brings X tutors, estimated GMV impact)

**Financials**
- Payout anomaly detection (amounts outside 3σ of historical distribution)
- Dispute pattern analysis (predict high-risk bookings before they dispute)
- Commission reconciliation gaps

### 6.3 Network Intelligence

The Signal page covers **content attribution** (blog → booking conversion). A new `/admin/network/` page covers **growth attribution** — how the referral network is growing and compounding.

```
NETWORK INTELLIGENCE — Referral Graph Concept

  Platform referral network (simplified view):

           [Platform]
               │ referral code
         ┌─────┼─────┐
         │     │     │
       [T1]  [T2]  [T3]    ← Tutors (top referrers)
         │           │
      ┌──┼──┐     ┌──┼──┐
      │  │  │     │  │  │
     [C1][C2][C3][C4][C5][C6]  ← Converted clients
                  │
               ┌──┼──┐
               │     │
            [T4]   [T5]       ← New tutors referred by client

  Network metrics that matter:
  ├── Depth: T1 → C3 → T4 → new client = chain of 3. High depth = strong virality.
  ├── Velocity: how fast is the graph adding new nodes week-on-week?
  ├── Conversion quality: T1's referrals convert at 22%, T2's at 8%. Why?
  ├── Ghost nodes: signed up via referral, stuck (no booking, no profile).
  └── Delegation leverage: T3 set up delegation at a library → 8 passive conversions.

/admin/network/
  ┌────────────────────────────────────────────────────────────┐
  │  Network Health tab                                        │
  │  Referral graph depth distribution                         │
  │  [histogram: depth 1: 84% | depth 2: 12% | depth 3+: 4%] │
  │  Network velocity: +14 nodes/week ↑ (vs +9 last week)     │
  │  Ghost signup rate: 61 ghosts (>14 days, no booking)       │
  │  Delegation adoption: 12% of eligible tutors (24/200)      │
  ├────────────────────────────────────────────────────────────┤
  │  Organisation tab                                          │
  │  Org health ranking:                                       │
  │  1. Oxford Scholars (score: 81) — 18 members, active       │
  │  2. London Tutors Ltd (score: 72) — 12 members, growing    │
  │  3. Oakwood Learning (score: 23) — 12 members, DORMANT 90d │
  │  Org referral vs solo: 2.1x conversion rate advantage      │
  ├────────────────────────────────────────────────────────────┤
  │  Attribution tab                                           │
  │  Top referrers by LTV (not volume):                        │
  │  Sarah M. — 6 referrals, avg LTV £840/year per convert     │
  │  James P.  — 14 referrals, avg LTV £320/year per convert   │
  │  (Sarah's smaller network is worth 2x James's in revenue)  │
  └────────────────────────────────────────────────────────────┘
```

### 6.4 Lexi Admin Mode

Lexi operates in two modes:

```
LEXI — Two Operating Modes

  USER MODE (current)              ADMIN MODE (new)
  ─────────────────────            ─────────────────────────────────
  Audience: tutors, clients,       Audience: admin team
            students
                                   System prompt: operational language,
  System prompt: helpful,          platform-wide context, no user-facing
  friendly, platform guide         content restrictions

  Tools:                           Tools:
  ┌─────────────────────┐          ┌─────────────────────────────────┐
  │ search_knowledge()  │          │ read_bookings_aggregate()        │
  │ get_my_executions() │          │ read_referral_pipeline()         │
  │ trigger_workflow()  │          │ read_org_health()                │
  │ get_platform_info() │          │ get_hitl_queue()                 │
  └─────────────────────┘          │ approve_task()                   │
                                   │ list_approvals()                 │
  Access: user's own data          │ get_divergences()                │
          + platform knowledge     │ read_financial_signals()         │
                                   └─────────────────────────────────┘

                                   Access: aggregate platform data
                                           + all HITL approvals
                                           + operational signals

  Entry point: chat widget         Entry point: admin command center
               on user pages                    query bar
```

Admin mode queries:
```
"Show me all orgs that haven't had a new member booking in 60 days"
"What's the referral conversion rate this week vs last month?"
"Which tutors have a Growth Score below 40 and active listings?"
"How many HITL approvals are pending across all workflows?"
"Summarise this week's autonomous operations"
"Which referral signups are stuck in the pipeline?"
```

---

## 7. Platform Agent Infrastructure

```
SHARED PLATFORM AGENT INFRASTRUCTURE — Before vs After

  BEFORE (per-agent, duplicated)        AFTER iPOM (shared, parameterised)

  sage_pro_subscriptions                agent_subscriptions
  growth_pro_subscriptions  ──────────▶  (agent_type column)
  future_pro_subscriptions               One table, all agents

  /api/sage/stream                      /api/agents/[agentType]/stream
  /api/growth/stream        ──────────▶  One route, resolves orchestrator
  /api/future/stream                     by agentType param

  <SageChatUI />                        <AgentChatUI agentType="sage" />
  <GrowthChatUI />          ──────────▶  One component, agent config
  <FutureChatUI />                       drives branding + tools

  sage rate limit config                rate limiter config map:
  growth rate limit config  ──────────▶  { sage: {...}, growth: {...} }
  future rate limit config               One line per new agent

  sage/agents/BaseAgent.ts              packages/agents-core/
  (imported by growth)      ──────────▶  BaseAgent.ts
  circular dependency risk               PlatformAIAgent.ts
                                         MarketplaceAIAgent.ts

  Adding a new agent:                   Adding a new agent:
  ~50h (copy everything)    ──────────▶  ~15h (register + extend)
```

### 7.1 Unified Agent Subscription Table

Replace per-agent subscription tables (`sage_pro_subscriptions`, future `growth_pro_subscriptions`) with a single unified table:

```sql
agent_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  agent_type text NOT NULL,              -- 'sage' | 'growth' | future agents
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_price_id text,
  status text NOT NULL,                  -- 'active' | 'cancelled' | 'past_due'
  price_per_month integer,               -- pence
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, agent_type)
)
```

**Migration**: existing `sage_pro_subscriptions` data migrates into `agent_subscriptions` with `agent_type='sage'`. Adding a new agent (Growth, future) requires one Stripe Price ID and one row — no new table.

### 7.2 Parameterised Agent API Routes

Replace per-agent API routes with parameterised routes:

```
apps/web/src/app/api/agents/[agentType]/
  stream/route.ts       ← replaces /api/sage/stream, /api/growth/stream
  session/route.ts      ← replaces per-agent session routes
  subscription/route.ts ← replaces per-agent subscription routes
```

The `[agentType]` parameter resolves to the correct orchestrator, rate limit config, and subscription check. Adding a new agent = registering its orchestrator in the agent registry map. No new routes.

### 7.3 Shared Agent UI Component

```typescript
<AgentChatUI
  agentType="growth"        // or "sage", future agents
  sessionId={sessionId}
  userId={userId}
/>
```

One component, all agents. Agent-specific branding (name, colour, icon) comes from agent config. Adding a new agent = one config entry.

### 7.4 Shared Agent Base Classes

Extract from `sage/` into a shared `@tutorwise/agents-core` workspace package:

```
packages/agents-core/
  src/
    BaseAgent.ts              ← abstract base
    PlatformAIAgent.ts        ← platform-owned agents (Sage, Growth)
    MarketplaceAIAgent.ts     ← user-created marketplace agents
    types.ts
    index.ts
```

`sage/`, `growth/`, and future agents import from `@tutorwise/agents-core`. No circular dependencies. Adding a new agent = extend the appropriate base class.

### 7.5 Shared Rate Limiter

```typescript
// apps/web/src/lib/rate-limiter.ts
const AGENT_RATE_LIMITS: Record<string, AgentRateLimit> = {
  sage:   { free: 10, pro: 5000, window: '24h' },
  growth: { free: 10, pro: 5000, window: '24h' },
  // future agents: one line each
};
```

Adding a new agent = one line in the rate limit config.

---

## 8. Build Phases

```
iPOM BUILD SEQUENCE — Phase Dependencies (updated 2026-03-05)

  ✅ DONE              ✅ DONE            NOW                  Phase 2
  Phase 0              Growth Agent       Platform Extraction   (Actions + HITL)
  ─────────            ────────────       + Nexus Foundation    ────────────────
  Remove dead          chat UI       ──▶  agent_subscriptions   Action tools
  code                 API routes         agents-core pkg        HITL gateway
  Clean skeleton       billing            AgentChatUI            Proactive nudges
  Verify build         admin page         Param routes
                       Stripe             Rate limiter
                       sidebar link       Nexus bridges
                            │             Pipelines 1+2
                            │             Platform Console
                            │ concurrent
                            ▼
  Phase 3              Phase 4
  (Campaigns +         (Network + Automation)
   Admin Intel)
  ──────────────       ─────────────────────
  Referral sprint      /admin/network/
  Delegation wizard    Org workflows
  Admin Intel Agent    LinkedIn OAuth
  Command Center       Scheduled campaigns
  Lexi admin mode


  TIMELINE (revised — Growth already built)
  ────────────────────────────────────────────────────────────────────────
  ✅ Done      Phase 0: Cleanup (2-3h actual)
  ✅ Done      Growth Agent core (built separately, ~35h)
  Now          Platform Extraction + Nexus Foundation (30-40h)
  Next         Phase 2: Actions + HITL Gateway (30-40h)
  After        Phase 3: Campaigns + Admin Intelligence (30-40h)
  After        Phase 4: Network Intelligence + Automation (30-40h)
  ────────────────────────────────────────────────────────────────────────
  Remaining: ~120-160 AI-assisted developer hours (was 169-218h)
  Saved: ~40-50h — Growth Agent already shipped
```

### Phase 0 — Cleanup `2–3h`

Before any build starts:

| Task | Hours |
|------|-------|
| Remove Sage `createTrialCheckoutSession()` dead code | 0.5 |
| Clean `apps/web/src/lib/growth-agent/` skeleton files | 1 |
| Verify pre-commit hooks pass after cleanup | 0.5 |

---

### Platform Extraction — Concurrent with Phase 1 `15–20h`

Foundational platform work done while building Growth. Makes every future agent 60% cheaper to build.

| Task | Hours |
|------|-------|
| Unified `agent_subscriptions` table + migration from `sage_pro_subscriptions` | 4 |
| `packages/agents-core/` — extract `BaseAgent`, `PlatformAIAgent`, `MarketplaceAIAgent` | 4 |
| Parameterised `/api/agents/[agentType]/` routes | 4 |
| Shared `<AgentChatUI agentType="..." />` component | 4 |
| Shared rate limiter config by `agentType` | 1 |
| New `platform:view` RBAC permission | 1 |

**Outcome**: Next agent after Growth costs ~15h instead of ~50h.

---

### Phase 1 — Nexus Foundation + Platform Extraction `30–40h` *(Growth already built)*

**Growth Agent core** *(Growth is already built — items below track remaining gaps):*

| Task | Hours | Status |
|------|-------|--------|
| `growth/` module: agents, personas, knowledge files, tools, orchestrator | 10–12 | ✅ Done |
| `@growth/*` tsconfig path alias | 0.5 | ✅ Done |
| `apps/web/src/lib/growth/` adapter layer | 4 | ✅ Done |
| Growth API routes (`/api/growth/stream`, `/api/growth/session`, `/api/growth/audit`) | 3 | ✅ Done |
| Growth Score SQL + hourly cache | 3 | TBD — verify |
| Growth chat UI + Growth Score widget | 6–8 | ✅ Done |
| Sidebar navigation link | 0.5 | ✅ Done |
| Admin Growth page `/admin/growth/` | 3 | ✅ Done |
| Stripe Growth Pro: price ID, checkout, webhook handler | 3 | ✅ Done |
| Growth metrics attribution schema (`growth_agent_session_id` columns) | 2 | TBD — verify |

**Nexus Foundation (built alongside Growth):**

| Task | Hours |
|------|-------|
| `cas/messages/types.ts` — extend AgentIdentifiers + MessageTypes | 1 |
| `source_system` column migration on `cas_agent_events` | 1 |
| `growth_knowledge_chunks` table migration | 1 |
| `growth-bridge.ts` | 2 |
| `process-studio-bridge.ts` | 3 |
| Pipeline 1: `discovery-knowledge-pipeline.ts` (with delta-sync) | 5 |
| Pipeline 2: `configurations-knowledge-pipeline.ts` | 4 |
| `get-executions.ts` shared agent tool | 2 |
| `/admin/platform/` — Platform Console (health grid, event stream) | 6–8 |

**Outcome**: Unified agent infrastructure in place. Lexi always up to date via Pipeline 1+2. Platform Console showing cross-system events. Growth Agent wired into Nexus (no longer an island). Cost of next new agent drops from ~50h to ~15h.

---

### Phase 2 — Actions + HITL Gateway `30–40h`

| Task | Hours |
|------|-------|
| User-facing `/api/process-studio/execute/start` endpoint (security boundary) | 4–6 |
| Growth action confirmation modal | 2–3 |
| `send_message`, `create_task` action tools + executor | 5–6 |
| `update_listing`, `update_profile_bio` action tools | 4–5 |
| `trigger-workflow.ts` HITL gateway shared tool | 3 |
| Lexi HITL actions via gateway (booking cancel, message send) | 4–5 |
| Proactive nudge trigger infrastructure (scheduler + delivery) | 6–8 |

**Outcome**: Growth Agent can take actions (with user approval). Lexi can execute write actions via Process Studio. Proactive nudges live.

---

### Phase 3 — Campaigns + Admin Intelligence `30–40h`

**Growth campaigns:**

| Task | Hours |
|------|-------|
| 30-day referral sprint planner | 5–6 |
| Delegation setup wizard | 4–5 |
| Network outreach templates engine | 3–4 |
| Revenue forecasting model | 4–5 |

**Admin Intelligence + Command Center:**

| Task | Hours |
|------|-------|
| Admin Intelligence Agent (`cas:admin-intelligence`) — briefing + anomaly detection | 10–12 |
| Admin command center homepage redesign (exception queue, autonomous ops summary) | 6–8 |
| Lexi admin mode (admin-scoped tools, admin system prompt) | 5–6 |
| Admin query bar on command center | 2–3 |
| Admin Dashboard Alerts tab → Nexus event feed | 2–3 |

**Outcome**: Admin command center live. Daily briefing. Exception queue replacing manual monitoring. Lexi answers admin questions.

---

### Phase 4 — Network Intelligence + Automation `30–40h`

| Task | Hours |
|------|-------|
| `/admin/network/` — network intelligence page (referral graph, org health, delegation) | 8–10 |
| Organisation Onboarding workflow (Process Studio) | 4–5 |
| Stuck Referral Recovery workflow (Process Studio) | 3–4 |
| Org Dormancy Re-engagement workflow (Process Studio) | 3–4 |
| LinkedIn OAuth + `post_to_social` Growth tool | 8–10 |
| Scheduled Growth campaign process (Process Studio) | 4–5 |

**Outcome**: Network intelligence visible to admin. Key supervised sequences running autonomously. Growth Agent Phase 4 tools live.

---

### Grand Total Estimates

| Phase | Scope | Hours | Status |
|-------|-------|-------|--------|
| Phase 0 | Cleanup | 2–3 | ✅ Done |
| Growth Agent core | Chat, API routes, billing, admin, Stripe | ~35 | ✅ Done (built separately) |
| Platform Extraction + Nexus Foundation | agent_subscriptions, agents-core, bridges, pipelines, Platform Console | 30–40 | **Now** |
| Phase 2 | Actions + HITL Gateway | 30–40 | Pending |
| Phase 3 | Campaigns + Admin Intelligence | 30–40 | Pending |
| Phase 4 | Network Intelligence + Automation | 30–40 | Pending |
| **Remaining total** | | **~120–160h** | |
| ~~Original estimate~~ | ~~Including Growth build~~ | ~~169–218h~~ | ~~Superseded~~ |

---

## 9. Design Decisions

### D1: Product name
**Resolved**: The product is **Tutorwise iPOM** (Intelligent Platform Operations Management). Internal/engineering name for the integration infrastructure layer is **Nexus**. Users never see either name.

### D2: Rebuild or evolve admin
**Resolved**: Evolve, not rebuild. The hub pattern (HubPageLayout, HubTabs, HubSidebar) stays. The admin homepage is redesigned as the command center. Existing domain pages remain as browse/audit interfaces under the Management section. The work is the intelligence layer and navigation reframe, not the UI framework.

### D3: Per-agent subscription tables vs unified
**Resolved**: Single `agent_subscriptions` table with `agent_type` column. Existing `sage_pro_subscriptions` data migrates in. No per-agent tables for Growth or future agents.

### D4: Agent base class location
**Resolved**: Extract `BaseAgent`, `PlatformAIAgent`, `MarketplaceAIAgent` into `packages/agents-core/` workspace package. Growth imports from `@tutorwise/agents-core`, not from `sage/`. Eliminates cross-module dependency.

### D5: HITL gateway security boundary
**Resolved**: Two distinct endpoints — `/api/admin/process-studio/execute/start` (admin RBAC) and `/api/process-studio/execute/start` (user auth, scoped to `profile_id`). Both call the same execution engine. Different auth layers for different callers.

### D6: Knowledge pipelines — two, not one
**Resolved**: Pipeline 1 (Discovery → agent knowledge) + Pipeline 2 (Configurations → agent knowledge). Both use the same embed-and-upsert mechanism. Pipeline 2 fills the gap where agents give wrong answers about available subjects, delivery modes, and levels.

### D7: Admin Intelligence — new agent or extend CAS Analyst
**Resolved**: New `cas:admin-intelligence` agent. The CAS Analyst is focused on the dev pipeline (code quality, test results, deployment patterns). Admin Intelligence focuses on marketplace operations. Separate agents, same CAS infrastructure.

### D8: Organisation data scope for Growth Agent
**Resolved**: Platform Growth Agent has two data access modes — individual scope (`profile_id`) for tutor/client/agent personas, and organisation scope (`org_id`) for organisation persona. Organisation scope reads aggregate data across all org member profiles. Gated by `user_is_org_admin()` RLS policy.

```
GROWTH AGENT DATA ACCESS — Individual vs Organisation Scope

  Individual scope (tutor/client/agent persona):
  ┌────────────────────────────────────────────────────────┐
  │  Scoped to: profile_id = auth.user.profile_id          │
  │                                                        │
  │  read_my_profile()      → profiles WHERE id=profile_id │
  │  read_my_bookings()     → bookings WHERE tutor_id=...  │
  │  read_my_revenue()      → transactions WHERE user_id=..│
  │  read_my_referrals()    → referrals WHERE referrer_id=.│
  │  read_my_network()      → connections WHERE user_id=.. │
  └────────────────────────────────────────────────────────┘

  Organisation scope (org admin persona):
  ┌────────────────────────────────────────────────────────┐
  │  Requires: user_is_org_admin(org_id) = true            │
  │                                                        │
  │  read_org_roster()      → profiles WHERE org_id=...    │
  │  read_org_revenue()     → aggregate across all members │
  │  read_org_referrals()   → org referral code + members' │
  │  read_org_growth_score()→ avg Growth Score, members    │
  │  benchmark_vs_platform()→ org vs solo tutor averages   │
  └────────────────────────────────────────────────────────┘

  Agent cannot cross scopes — individual user cannot read
  another user's private data. Org admin can only read
  their own org's aggregate data.
```

### D9: Proactive nudge trigger mechanism
**Resolved**: pg_cron scheduled function checking nudge conditions every 4 hours. Conditions: Growth Score drop > 5pts, bookings down > 15% week-on-week, referral link not shared in > 14 days, rebooking window open (client with completed session, no future booking). Delivery: in-app notification + email (user preference).

### D10: Network Intelligence — new page or extend Signal
**Resolved**: New `/admin/network/` page. Signal covers content attribution (blog → booking). Network covers growth attribution (referral graph, org health, delegation). Different data, different analytical model, different audience (Signal = content team, Network = growth team).

### D11: Process Studio workflow editor
**Resolved**: Process Studio workflow definitions stay as code (safe, version-controlled, code-reviewed). Config-driven node parameters (business rules as DB config rows — thresholds, fee percentages, timing windows) can be edited by admin without a code deploy. Full visual workflow builder is deferred to a future Product 3 version.

---

## 10. Success Metrics

| Metric | Target | Measured By |
|--------|--------|-------------|
| Admin exception queue usage | ≥80% of admin decisions via queue (not domain browsing) | `admin_activity_log` — queue vs direct page |
| Autonomous operation rate | ≥70% of routine decisions handled without human intervention | `workflow_executions` where `triggered_by='autonomous'` |
| Lexi knowledge staleness | < 4h after a feature ships or config changes | Pipeline job completion time |
| Cross-system event coverage | 100% of lifecycle events captured | `cas_agent_events` coverage per `source_system` |
| Agent action audit completeness | 100% of write actions via HITL gateway | `workflow_executions.triggered_by` not null |
| New agent build cost | < 20h per new agent (down from ~50h) | Actual build time tracking |
| Admin daily brief generation | Available by 8am every day | Scheduled job completion rate |
| Referral pipeline visibility | Ghost signup recovery rate visible in Network Intelligence | `/admin/network/` data availability |

---

## 11. Open Questions

1. **Discovery scan frequency**: How often does Process Discovery run to keep Pipeline 1 current? Recommendation: trigger on every CAS deploy + daily scheduled scan. Admin can also run manually.

2. **Admin Intelligence Agent cost**: Daily briefings + continuous anomaly detection involve multiple AI calls. At what platform scale does this become a meaningful cost line? Recommend using the cheaper tier of the 6-tier fallback chain for admin intelligence (Gemini Flash or DeepSeek R1 — no need for Grok 4 Fast for operational analysis).

3. **Exception queue escalation policy**: If an exception is not resolved within X hours, who gets notified? Email to admin? Push notification? Currently not designed.

4. **Multi-admin support**: If the team grows to 3+ admins, how does the exception queue assign ownership? First-come-first-served, or role-based routing (finance disputes → finance admin, content violations → content admin)?

5. **Audit log retention**: `workflow_executions` and `cas_agent_events` will grow significantly as autonomous operations scale. What is the retention and archiving policy?

6. **Organisation Growth Agent billing**: If an org admin uses Growth Agent, who pays? The org admin's subscription, the org account, or a separate org-tier pricing? Not designed.

---

## 12. Related Documents

- [Growth Agent Solution Design v2.0](./growth-agent-solution-design.md) — Growth Agent detailed spec
- [Process Execution Solution Design v3.2](./process-execution-solution-design.md) — Process Studio execution engine
- [CAS Solution Design](../cas/docs/CAS-SOLUTION-DESIGN.md) — CAS agent pipeline architecture

---

*Version 1.0 — Consolidated from platform-nexus-solution-design.md + strategic admin vision.*
*Supersedes: platform-nexus-solution-design.md (see that file for Nexus-only technical reference)*

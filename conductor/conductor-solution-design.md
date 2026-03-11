# Tutorwise Conductor — Intelligent Operations Platform
**Version**: 5.1 — Phases 0–9 complete; migrations 348–389 applied
**Date**: 2026-03-11
**Status**: Active platform — Phases 0–9 complete (TeamRuntime v2, DevOps Team, Agent Episodic Memory, MCP Integration Framework, Admin Operations); cas_* hard DELETE eligible 2026-06-11

> **Document Index — Conductor folder**
>
> | Document | Purpose |
> |---|---|
> | **This file** `conductor-solution-design.md` | Engineering implementation reference — all phases, API routes, DB schema, migrations |
> | [`AI-Digital-Workforce-Blueprint.md`](./AI-Digital-Workforce-Blueprint.md) | Internal architecture reference — iPOM/DevOps isomorphism, vocabulary (Agent Registry, Digital Workforce, Digital Force, Conductor, Build Canvas) |
> | [`publish/01-technical-white-paper.md`](./publish/01-technical-white-paper.md) | Enterprise-facing technical white paper (clean, no internal implementation details) |
> | [`publish/02-investor-thesis.md`](./publish/02-investor-thesis.md) | Investor narrative — market timing, moat, flywheel, founder thesis |
> | [`publish/00-publishing-plan.md`](./publish/00-publishing-plan.md) | Publishing plan — venues, remaining work checklist, messaging anchors |
> | [`conductor-professional-assessment.md`](./conductor-professional-assessment.md) | Market comparison — Temporal, LangGraph, Camunda, n8n, CrewAI, Copilot Studio |
> | [`conductor-gdpr-retention-policy.md`](./conductor-gdpr-retention-policy.md) | GDPR retention policy for Conductor data tables |
> | [`conductor-growth-score-all-roles.md`](./conductor-growth-score-all-roles.md) | Growth Score formula for all 4 user roles |
> | [`gtm-intelligence-spec.md`](./gtm-intelligence-spec.md) | GTM Lifecycle capstone spec — links all 6 stages + referral |
> | 14 intelligence specs | Feature-level agent tools, metrics tables, pg_cron, admin panels — see [specs index](#feature-intelligence-specs-index) |
> | [`process-execution-solution-design.md`](./process-execution-solution-design.md) | Workflow execution engine design (PlatformWorkflowRuntime, LangGraph, shadow/HITL) |
> | [`process-discovery-solution-design.md`](./process-discovery-solution-design.md) | Process discovery design (4-phase scanner) |

---

## Table of Contents

- [1. Product Vision](#1-product-vision)
- [Fuschia Comparison — Full Picture](#fuschia-comparison--full-picture-github-latest-verified)
- [What to REMOVE / REDESIGN](#what-to-remove--redesign)
- [Architecture After Phase 8 — Unified Platform](#architecture-after-phase-8--unified-platform)
- [Current State — What's Built](#current-state--whats-built)
- [Conductor Use Cases — Six Lifecycles](#conductor-use-cases--six-lifecycles)
- [Feature Intelligence Specs Index](#feature-intelligence-specs-index)
- **Implementation Phases**
  - [Phase 1 — Consolidation & Designer Completion](#phase-1--consolidation--designer-completion)
  - [Phase 2 — Conductor: Agents + Teams](#phase-2--conductor-agents--teams)
  - [Phase 3 — Analytics & Monitoring + Feature Intelligence Layer](#phase-3--analytics--monitoring--feature-intelligence-layer)
  - [Phase 4 — Knowledge & Intent](#phase-4--knowledge--intent)
  - [Phase 5 — Process Mining Enhancement](#phase-5--process-mining-enhancement)
  - [Phase 5B — Build Canvas (Build Tab + Agent Registry)](#phase-5b--build-canvas-build-tab--agent-registry)
  - [Phase 6 — Unified Execution Substrate (TeamRuntime v2 + CAS Decommission)](#phase-6--unified-execution-substrate-teamruntime-v2--cas-decommission)
  - [Phase 7 — Agent Episodic Memory](#phase-7--agent-episodic-memory)
  - [Phase 8 — MCP Integration Framework](#phase-8--mcp-integration-framework)
  - [Phase 9 — Admin Operations](#phase-9--admin-operations)
- [Roadmap (Future — Not Phased)](#roadmap-future--not-phased)
- **Reference**
  - [Testing Strategy](#testing-strategy)
  - [Complete Database Schema](#complete-database-schema)
  - [Current Migration Sequence](#current-migration-sequence)
  - [Agent Catalog](#agent-catalog)
  - [API Surface Reference](#api-surface-reference)
  - [Risk Register](#risk-register)
  - [Operational Runbooks](#operational-runbooks)
  - [Build Sequence](#build-sequence)
  - [Total Estimates](#total-estimates)
  - [What Gets Removed vs Built](#what-gets-removed-vs-built)
  - [Growth Score — Worked Examples](#growth-score--worked-examples)
  - [Phase Dependency Map](#phase-dependency-map)
  - [GDPR Compliance](#gdpr-compliance)
  - [Design Decisions](#design-decisions)
  - [Success Metrics](#success-metrics)
  - [Related Documents](#related-documents)

---

## 1. Product Vision

### The Three-Product Model

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCT 1 — TUTORWISE MARKETPLACE                              │
│  The network: tutors, clients, agents, organisations            │
│  Listings, bookings, payments, referrals, reviews               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PRODUCT 2 — TUTORWISE AI                                       │
│  The intelligence: Sage (tutoring), Growth (advisor),           │
│  Lexi (help), AI marketplace agents                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PRODUCT 3 — TUTORWISE CONDUCTOR                                     │
│  The engine room: autonomous operations, agent management,      │
│  self-improving intelligence, exception handling                │
└─────────────────────────────────────────────────────────────────┘
```

### What Conductor Actually Is

Conductor is the **operating system for Tutorwise** — it lets the platform run itself and lets non-technical admins spin up specialist AI agents to replace human analysts when needed.

Three capabilities — all managed from **one unified admin canvas (Conductor)**:
1. **Workflows** — automated business processes (tutor approval, commission payout, booking lifecycle)
2. **Agents** — single-agent AI specialists with episodic memory: create, configure, monitor, remove from UI (Market Intelligence, Financial Analyst, Operations Monitor, Retention Monitor, Custom)
3. **Teams** — multi-agent systems where multiple Agents collaborate toward one result:
   - **DevOps Team** (Supervisor pattern, 9 agents: Director, Analyst, Developer, Tester, QA, Security, Engineer, Planner, Marketer) — formerly CAS Team, renamed in migration 383
   - **Custom teams** — admin builds new teams on the canvas (Supervisor / Pipeline / Swarm)

An admin can add a new Agent or Team, configure prompts/tools/schedule, monitor runs, and remove it — all without writing code.

### What Conductor Is Not

- **Not a user-facing product** — users never see "Conductor" directly
- **Not a replacement** for Sage or Lexi — those runtimes stay as-is; Conductor manages and connects them (CAS runtime has been retired — its capabilities now live in TeamRuntime v2)
- **Not glue code** — Conductor is a strategic product investment with its own roadmap and value
- **Not a new monolith** — Conductor is a protocol, interface, and management layer, not a new central service

### The Problem It Solves

```
BEFORE CONDUCTOR — Seven Silos

  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
  │  Sage  │  │  Lexi  │  │ Growth │  │  CAS   │  │Process │  │AI Agent│  │ Admin  │
  │runtime │  │runtime │  │runtime │  │pipeline│  │ Studio │  │ Studio │  │ pages  │
  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
      │            │            │            │            │            │            │
      │ own sub    │ no sub     │ own sub    │ own jobs   │ own HITL   │ own reg    │ no AI
      └────────────┴────────────┴────────────┴────────────┴────────────┴────────────┘
                                             │
                                    Supabase Database
                                  (the only shared layer)

  Adding a new agent = copy subscription table + copy API routes + copy UI + copy rate limiter
  Admin health = navigate 7 dashboards. No cross-system events. Agents start from zero each session.
```

```
AFTER CONDUCTOR — Integrated Platform, One Admin Canvas (Conductor)

  ┌────────┐  ┌────────┐  ┌────────┐  ┌─────────┐  ┌──────────────────────────────────┐
  │  Sage  │  │  Lexi  │  │ Growth │  │ DevOps  │  │  CONDUCTOR                     │
  │runtime │  │runtime │  │runtime │  │  Team   │  │  Workflows + Agents + Teams      │
  └───┬────┘  └───┬────┘  └───┬────┘  └───┬─────┘  │  + MCP Integrations             │
      └────────────┴────────────┴───────────┴────────┴──────┬───────────┬──────────────┘
                              │  PlatformUserContext (shared) │ configures│ designs
                              │                              │           │
                ┌─────────────▼──────────────┐              │           │
                │    platform_events bus      │◀─────────────┘           │
                │  (unified event stream)     │                          │
                └──────┬──────────┬──────────┬───────────────────────────┘
                       │          │           │
         ┌─────────────┘          │           └──────────────────┐
         │                        │                               │
┌────────▼────────┐  ┌────────────▼──────────┐  ┌───────────────▼──────────────┐
│  Intelligence   │  │  Workflow Runtime      │  │  Operations Interface         │
│  Hub            │  │  (Conductor canvas + │  │  (Exception Queue,            │
│  (Specialist +  │  │   PlatformWorkflow     │  │   Agent Registry,             │
│   Analyst       │  │   Runtime + TeamRuntime│  │   Monitoring + MCP)           │
│   Agents)       │  │   v2)                  │  │                               │
└────────┬────────┘  └───────────────────────┘  └──────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  LEARNING LAYER │  (Phase 4+)
│  decision_outcomes│
│  accuracy tracking│
│  autonomy tiers │
└─────────────────┘

  Adding a new Agent or Team = fill form in Conductor. Cost: minutes, no code.
```

### Autonomy Levels

```
┌────────────────────────────────────────────────────────────────┐
│  AUTONOMOUS — Platform acts without human intervention          │
│  Routine tutor approvals · Commission payouts · Referral attr. │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  SUPERVISED — AI acts, admin can override                       │
│  Listing quality nudges · Org re-engagement · Pricing anomaly  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  EXCEPTION QUEUE — AI recommends, human decides                 │
│  Borderline tutor applications · Disputes · Unusual payouts    │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  STRATEGIC — Human designs the rules                            │
│  Platform policy · Pricing tiers · Analyst agent configuration │
└────────────────────────────────────────────────────────────────┘
```

### Decision Routing Flow

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
  Workflows   Approval        Exception       Config
  executes         queue item      queue card      page /
  automatically    (approve /      + AI brief      Conductor
  No human         override)       + confidence    Workflows
  needed                           + recommendation design
         │              │              │
         └──────────────┴──────────────┘
                        │
                 Full audit trail in
                 workflow_executions
                 + platform_events
                        │
                        ▼
              ┌────────────────────┐
              │   LEARNING LAYER   │  (Phase 4+)
              │  30/60/90d outcome │
              │  accuracy tracking │
              │  tier calibration  │
              └────────────────────┘
```

### Self-Improving Autonomy

Autonomy tiers are not static — the system learns whether its decisions were correct and recalibrates:

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

Every autonomous process declares in its workflow definition:
- `undoable: boolean` — if false, tier minimum is Supervised (cannot be fully Autonomous)
- `rollback_procedure` — explicit SQL or API call to reverse the action
- `idempotency_key_template` — format for deduplication keys

---

## Fuschia Comparison — Full Picture (GitHub Latest Verified)

Fuschia has **8 distinct modules**. Tutorwise's position against each:

| Fuschia Module | Tutorwise Status | Verdict |
|---------------|-----------------|---------|
| **Workflow Designer** (ReactFlow canvas, node palette, templates) | ✅ **Complete** — 7 node types, drag-to-canvas palette, WorkflowCanvas, TemplateSelector, ChatPanel, auto-layout | Ahead — shadow/live promotion model exceeds Fuschia |
| **Workflow Execution** (LangGraph, pause/resume, HITL) | ✅ **AHEAD** — PostgreSQL checkpointing, shadow mode, 11 typed handlers, HITL ApprovalDrawer, conformance checking | Fuschia uses flat YAML; Conductor LangGraph approach is more powerful |
| **Agent Designer** (visual canvas to design agent org, assign tools) | ✅ **Complete** — AgentManagementPanel, agent chat, BuildCanvas/BuildPropertiesDrawer | Build Canvas surpasses Fuschia — 3-level hierarchy (Space→Team→Agent) |
| **Agent Teams** (multi-agent Supervisor/Pipeline/Swarm patterns) | ✅ **AHEAD** — TeamRuntime v2 (LangGraph StateGraph + PostgresSaver + CircuitBreaker), 3 patterns, DB-configurable topology, TeamCanvas, HITL interrupt()/resume() | **Tutorwise surpasses Fuschia** — Phase 6 complete: correct LangGraph + PostgresSaver + HITL + governance |
| **Agent Registry** (Agent Registry = Agents + Teams + Spaces) | ✅ **UNIQUE** — No Fuschia equivalent. iPOM hierarchy (Space→Team→Agent), 5 built-in spaces, 11 agents | Tutorwise-original architecture — see AI-Digital-Workforce-Blueprint.md |
| **Build Canvas** (visual drag-and-drop org composer) | ✅ **UNIQUE** — BuildCanvas, BuildPalette (3-level drill), BuildPropertiesDrawer, build-store | No Fuschia equivalent. Inspired by Helm/Docker Compose for agent topologies |
| **Tool Registry** (register/assign tools to agents from UI) | ✅ **Complete** — 24 tools in executor.ts, Tools tab at `/admin/conductor/agents/tools` | Live |
| **Knowledge Module** (knowledge graph, data import) | ✅ **Complete** — KnowledgePanel, `platform_knowledge_chunks` (768-dim), 18 categories, RAG injection | Phase 4 complete |
| **Analytics Module** (workflow analytics, agent performance) | ✅ **Complete** — IntelligencePanel (17 sub-tabs), 14 daily metrics tables, all pg_cron jobs live | Phase 3 complete |
| **Monitoring Module** (real-time agent status, live monitoring) | ✅ **Complete** — MiningPanel, shadow vs live analytics, GoLiveReadiness, conformance deviations | Phase 5 complete |
| **Process Mining** (conformance checking, pattern detection) | ✅ **AHEAD** — ConformanceChecker, `conformance_deviations` table, shadow-reconcile cron, promote workflow | Phase 5 complete |
| **Intent Agent** (natural language → workflow/agent trigger) | ✅ **Complete** — IntentDetector (`lib/conductor/IntentDetector.ts`), ExecutionCommandBar routing | Phase 4 complete |
| **Value Streams** (end-to-end value delivery mapping) | Roadmap | Covered partially by GTM Lifecycle (6-stage funnel) |
| **Agent Episodic Memory** (temporal episodic memory for agents) | ✅ **Complete** — `memory_episodes` (vector search, HNSW), `memory_facts` (subject/relation/object triples), AgentMemoryService, injected as PAST EXPERIENCE in SpecialistAgentRunner | Phase 7 complete — pgvector-based (not Graphiti/Neo4j), zero infrastructure cost |
| **MCP Integration** (Model Context Protocol tool bridge) | ✅ **Complete** — MCPClientManager singleton, `mcp_connections` + `mcp_tool_catalog` + `mcp_tool_executions` tables, MCPPanel admin UI, credential resolver, colon-namespaced tool routing | Phase 8 complete — Google Classroom + Jira/Confluence use cases |

---

## What to REMOVE / REDESIGN

> **Note (v5.0)**: Most items below have been completed. Retained for historical context.

### Remove — Status
| What | Status |
|------|--------|
| `ExecutionCanvas.tsx` as a separate tab | ✅ Done — execution overlay merged into design canvas |
| `ShadowDivergencePanel.tsx` (skeleton) | ✅ Done — rebuilt properly in Phase 5 MiningPanel (conformance + shadow + promote) |
| Growth Advisor standalone code | Deferred — Growth Agent still runs independently (`apps/web/src/lib/growth-agent/`); unified agent routes not yet implemented |
| CAS "build pipeline" narrative | ✅ Done — CAS runtime retired (Phase 6); 9 agents redeployed as built-in Specialists in DevOps Team (`built_in = true`) |

### Redesign — Status
| What | Status |
|------|--------|
| Conductor toolbar node buttons → drag-from-palette | ✅ Done — NodePalette (Workflows) + BuildPalette (Build Canvas) |
| Handler config → form-based fields | Partial — PropertiesDrawer still uses JSON for some handlers |
| CAS admin dashboard (`/admin/cas`) → Conductor | ✅ Done — Phase 6D; `/admin/cas` redirects to `/admin/conductor` |
| `packages/agents-core` extraction | ✅ Not needed — CAS patterns (CircuitBreaker, RetryUtility) extracted directly into `lib/workflow/team-runtime/` |

---

## Architecture After Phase 8 — Unified Platform

```
┌───────────────────────────────────────────────────────────────────────────┐
│  CONDUCTOR  (/admin/conductor)  ← the single admin canvas                 │
│                                                                           │
│  ┌─────────────┐   ┌──────────────────────────────────────────┐          │
│  │ Node Palette│   │  CANVAS (ReactFlow)                      │          │
│  │─────────────│   │  ─ Workflows (7 node types)               │          │
│  │ WORKFLOWS   │   │  ─ Agent nodes (8th type) with config     │          │
│  │  trigger    │   │  ─ Team nodes (9th type) with topology    │          │
│  │  action     │   │  ─ DevOps Team visualiser (tab/overlay)   │          │
│  │  condition  │   │  ─ Execution overlay (live status)        │          │
│  │  approval   │   └──────────────────────────────────────────┘          │
│  │  ...        │   ┌──────────────────────────────────────────┐          │
│  │─────────────│   │  BUILD CANVAS (3-level drill-down)       │          │
│  │ AGENTS      │   │  All Spaces → Space → Team → Agents      │          │
│  │  Agent      │   │  Drag-to-canvas · Edit properties        │          │
│  │  Custom     │   └──────────────────────────────────────────┘          │
│  │─────────────│   ┌──────────────────────────────────────────┐          │
│  │ TEAMS       │   │  MCP INTEGRATIONS                        │          │
│  │  DevOps     │   │  Connections · Tool Catalog · Exec Log   │          │
│  │  Custom     │   └──────────────────────────────────────────┘          │
│  └─────────────┘                                                          │
└──────────────────────┬────────────────────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────────────────┐
         ▼                                        ▼
┌─────────────────────┐              ┌──────────────────────────────────┐
│  WORKFLOW RUNTIME   │              │  AGENT / TEAM RUNTIME            │
│  PlatformWorkflow-  │              │  SpecialistAgentRunner (ReAct)   │
│  Runtime            │              │  + AgentMemoryService (episodic) │
│  LangGraph + PG     │              │  + MCP tool routing (colon ns)   │
│  Shadow/HITL/cron   │              │  Teams: TeamRuntime v2 (LangGraph│
└─────────────────────┘              │   StateGraph + PostgresSaver +   │
                                     │   CircuitBreaker + HITL)         │
                                     └──────────────────────────────────┘
```

**One admin entry point. Two underlying runtimes. All Agents and Teams managed from the same place.**

- **Agents** (Market Intelligence, Financial, Operations, Retention Monitor) run on SpecialistAgentRunner — standalone, schedule + chat driven, with episodic memory (PAST EXPERIENCE injection) and MCP tool access
- **DevOps Team** (Director, Developer, Tester etc.) runs on TeamRuntime v2 via Supervisor pattern with LangGraph StateGraph + PostgresSaver checkpointing + HITL interrupt()/resume()
- **Custom Teams** — admin builds topology on canvas; TeamRuntime v2 compiles LangGraph StateGraph from DB definition at execution time
- **Workflows** can invoke any registered Agent or Team via the `cas_agent` action node type
- **MCP Tools** — external tools (Google Classroom, Jira/Confluence) auto-discovered via MCP protocol, namespaced as `connection:tool_name`, routed transparently alongside built-in tools

### Core Capabilities

```
┌────────────────────────────────────────────────────────────────────────┐
│                       TUTORWISE CONDUCTOR v5.0                               │
├──────────────┬─────────────────┬────────────────┬──────────────────────┤
│  AUTOMATION  │  INTELLIGENCE   │  OPERATIONS    │  INTEGRATION         │
│  RUNTIME     │  HUB            │  INTERFACE     │  LAYER               │
│              │                 │                │                      │
│  Workflows:  │  Admin Intel    │  Workflows:    │  platform_events bus │
│  Discovery   │  Agent          │  Exception     │  Knowledge pipelines │
│  Design      │  +              │  queue         │  Bridge files        │
│  Execution   │  Analyst Agents │  HITL approvals│  PlatformUserContext │
│              │  (all types)    │  Monitoring    │  Cross-workflow      │
│              │                 │  Monitoring    │  coordination        │
│  Autonomous  │  Generates:     │  Agent Registry│  Operational health  │
│  workflows   │  Daily brief    │  One canvas    │                      │
│  HITL pauses │  Anomaly alerts │                │                      │
│  Audit trail │  Exception recs │                │                      │
├──────────────┴─────────────────┴────────────────┴──────────────────────┤
│                       LEARNING LAYER  (Phase 4+)                        │
│  decision_outcomes │ accuracy tracking │ dynamic tier calibration       │
│  process_autonomy_config │ weekly AI review │ admin-approved expansions  │
└────────────────────────────────────────────────────────────────────────┘
```

### Six Architecture Properties

| Property | Description | Status |
|----------|------------|--------|
| **Integrated** | Every part knows what every other is doing | ✅ `platform_events` bus |
| **Autonomous** | Routine decisions need no human | ✅ Four-tier model + Conductor execution engine |
| **Intelligent** | Anomalies surface before humans notice | ✅ Admin Intelligence Agent (Phase 3) |
| **Self-maintaining** | Knowledge stays current without manual effort | ✅ Async pipelines (Phase 3) |
| **Self-improving** | Decisions get better from observed outcomes | ✅ Phase 4 — Learning Layer (decision_outcomes + tier calibration) |
| **Coherent** | Users experience one platform, not 7 tools | ✅ Phase 4 — PlatformUserContext + cross-agent handoff |

---

## Current State — What's Built

### Workflow Inventory

```
CONDUCTOR — WORKFLOW INVENTORY

  Architecture principle:
    Specialist Agents DETECT conditions → Workflows ACT on them.
    Workflows map 1:1 to platform features. Every write action goes through
    the execution engine (audit trail + idempotency + rollback).

  LIVE (running in production)
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Tutor Approval                 │  Commission Payout                 │
  │  Feature: User Profile          │  Feature: Financials / Referrals   │
  │  Trigger: profile UPDATE →      │  Trigger: Cron Fri 10am            │
  │    under_review (webhook)       │  Steps: eligible? → stripe.payout  │
  │  HITL: admin approves/rejects   │  Detector: Retention Monitor       │
  └──────────────────────────────────────────────────────────────────────┘

  SHADOW (running parallel, not acting — 30-day minimum shadow period)
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Booking Lifecycle (Human Tutor)    Booking Lifecycle (AI Tutor)     │
  │  Feature: Bookings                  Feature: Bookings (AI)           │
  │  Trigger: bookings INSERT           Trigger: ai_agent session INSERT │
  └──────────────────────────────────────────────────────────────────────┘

  SUBPROCESS (no standalone trigger — called by parent workflow)
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Referral Attribution   (called from Booking Lifecycle)              │
  │  Feature: Referrals — sets bookings.agent_id for K coefficient       │
  └──────────────────────────────────────────────────────────────────────┘

  CONDUCTOR ADDS — Phase 2 (triggered by agent flags or platform events)
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Organisation Onboarding      │  Stuck Referral Recovery             │
  │  Feature: Network             │  Feature: Referrals                  │
  │  Trigger: org created         │  Trigger: referral stale 7d          │
  │  Detector: —                  │  Detector: Retention Monitor         │
  ├───────────────────────────────┼──────────────────────────────────────┤
  │  Listing Quality Nudge        │  Org Dormancy Re-engagement          │
  │  Feature: Marketplace/Listing │  Feature: Network                    │
  │  Trigger: quality_low alert   │  Trigger: org dormant 60d            │
  │  Detector: Market Intelligence│  Detector: Retention Monitor         │
  ├───────────────────────────────┼──────────────────────────────────────┤
  │  Dormant Referrer Re-engage   │  CaaS Stale Score Recovery           │
  │  Feature: Referrals           │  Feature: CaaS                       │
  │  Trigger: hub referrer        │  Trigger: stale scores > 5% active   │
  │    inactive 30d               │    users                             │
  │  Detector: Retention Monitor  │  Detector: Operations Monitor        │
  └──────────────────────────────────────────────────────────────────────┘

  CONDUCTOR ADDS — Phase 3 (from Intelligence Specs — all HITL-gated)
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Content Lifecycle            │  Article Boost                       │
  │  Feature: Resources→SEO→Signal│  Feature: Signal / Resources         │
  │  Trigger: article pending_    │  Trigger: article_intelligence       │
  │    review (DB webhook)        │    score declining (Signal spec)      │
  │  Gate: SEO Readiness ≥ 70     │  Detector: Market Intelligence       │
  │  Detector: Market Intelligence│                                      │
  ├───────────────────────────────┼──────────────────────────────────────┤
  │  Content Decay Recovery       │  Supply Gap → Recruitment            │
  │  Feature: SEO / Resources     │  Feature: Marketplace                │
  │  Trigger: rank_drop_critical  │  Trigger: supply_demand_gap (0       │
  │    or impressions_declining   │    supply, >20 searches)             │
  │  Detector: Market Intelligence│  Detector: Market Intelligence       │
  ├───────────────────────────────┼──────────────────────────────────────┤
  │  Pricing Intelligence Alert   │  Scheduling Stall Intervention       │
  │  Feature: Listings            │  Feature: Bookings                   │
  │  Trigger: pricing_outliers_   │  Trigger: booking Confirmed +        │
  │    high > 15 listings         │    unscheduled > 48h                 │
  │  Detector: Market Intelligence│  Detector: Retention Monitor         │
  ├───────────────────────────────┼──────────────────────────────────────┤
  │  High Cancelling Tutor        │  GMV Decline → Revenue Recovery      │
  │  Feature: Bookings            │  Feature: Bookings / Financials      │
  │  Trigger: cancel_rate > 30%   │  Trigger: GMV < 80% of 4-week avg   │
  │    AND count ≥ 3 in 30d       │                                      │
  │  Detector: Retention Monitor  │  Detector: Retention Monitor         │
  ├───────────────────────────────┼──────────────────────────────────────┤
  │  Pre-Payout Health Check      │  Unreversed Commission Auto-Fix      │
  │  Feature: Financials          │  Feature: Financials                 │
  │  Trigger: Thu 09:00 UTC       │  Trigger: unreversed_refunds > 0     │
  │    (before Friday payout)     │    (financial integrity)             │
  │  Detector: Retention Monitor  │  Detector: Retention Monitor         │
  ├───────────────────────────────┼──────────────────────────────────────┤
  │  Dispute Escalation           │  [future: VirtualSpace Dropout]      │
  │  Feature: Financials          │  Feature: VirtualSpace               │
  │  Trigger: open disputes +3    │  Trigger: session < 10 min           │
  │    in 7 days                  │    (Booking Lifecycle node)          │
  │  Detector: Retention Monitor  │  Detector: Market Intelligence       │
  └──────────────────────────────────────────────────────────────────────┘

  KEY:
    Detector = which Specialist Agent flags the condition that fires this workflow
    HITL     = Human-In-The-Loop gate (admin must approve before action executes)
    Subprocess = no direct trigger; parent workflow calls it mid-execution
    Gate     = automated check that must pass before workflow proceeds
```

### System Roles in Conductor

| System | Role in Conductor | Participates As |
|--------|-------------|----------------|
| **Conductor** | Admin Canvas + Automation Runtime — executes all Workflows, Agents, Teams, HITL approvals, MCP integrations | Primary action executor for all Agents and Teams |
| **CAS** *(retired)* | Intelligence Hub backbone — former host for admin intelligence agent, event store. **Runtime retired in Phase 6**; CircuitBreaker + RetryUtility extracted to `lib/workflow/team-runtime/`; agents migrated to `specialist_agents` table; `/admin/cas` redirects to Conductor | `cas_*` tables soft-deprecated (migration 385), hard delete 2026-06-11 |
| **Sage** | AI tutor runtime | Event bridge — session, feedback, progress events |
| **Lexi** | Help bot + admin conversational interface | Bridge + admin mode with operational tools |
| **Growth** | Advisory agent + platform-wide signal source | Bridge — audit, session, action, score events |
| **AI Agent Studio** | Marketplace AI agents (student/client-facing) | Lifecycle events (`agent.created`, `agent.published`) |
| **Admin Operations** (`/admin/operations`) | Human interface for the autonomous platform — daily AI brief, platform health, exception queue, agent status, command bar | Exception queue consumer + HITL approval + operational monitoring |

### What's Built — All Phases Complete (v5.0)

| Item | Location | Phase | Status |
|------|----------|-------|--------|
| Conductor designer (ReactFlow) | `components/feature/workflow/` | 0 | ✅ Live |
| 7 node types + 11 handlers | `workflow/handlers/` | 0 | ✅ Live |
| PlatformWorkflowRuntime (LangGraph) | `lib/workflow/runtime/` | 1 | ✅ Live |
| LangGraph PostgreSQL checkpointing | `cas-checkpointer.ts` | 1 | ✅ Live |
| HITL ApprovalDrawer | `workflow/components/` | 1 | ✅ Live |
| Shadow mode (design/shadow/live) | `workflow_processes.execution_mode` | 1 | ✅ Live |
| Process Discovery (4 phases) | `workflow/discovery/` | 1 | ✅ Live |
| 5 seeded workflow processes | migrations 338–339 | 1 | ✅ Live |
| ChatPanel (AI mutations on canvas) | Workflows canvas | 1 | ✅ Live |
| SpecialistAgentRunner (ReAct loop + memory + MCP) | `lib/agent-studio/SpecialistAgentRunner.ts` | 2+7+8 | ✅ Live |
| 24 analyst tools + MCP tool routing | `lib/agent-studio/tools/executor.ts` | 2–3+8 | ✅ Live |
| AgentManagementPanel + AgentChatPanel | `components/feature/conductor/` | 2 | ✅ Live |
| **TeamRuntime v2** (LangGraph StateGraph + PostgresSaver + CircuitBreaker + HITL) | `lib/workflow/team-runtime/TeamRuntime.ts` | 6A | ✅ Live |
| CircuitBreaker (extracted from CAS) | `lib/workflow/team-runtime/CircuitBreaker.ts` | 6A | ✅ Live |
| RetryUtility (extracted from CAS) | `lib/workflow/team-runtime/RetryUtility.ts` | 6A | ✅ Live |
| TeamCanvas (ReactFlow, 3 patterns) | `components/feature/conductor/TeamCanvas.tsx` | 2 | ✅ Live |
| SpacesPanel (drag-and-drop) | `components/feature/conductor/SpacesPanel.tsx` | 2 | ✅ Live |
| 11 built-in specialist agents | `specialist_agents` table, migrations 348+374+382 | 2–3 | ✅ Live |
| 5 built-in agent spaces (incl. Marketing) | `agent_spaces` table, migrations 373+382 | 2 | ✅ Live |
| Platform Intelligence (14 specs, 17 sub-tabs) | `components/feature/conductor/IntelligencePanel.tsx` | 3 | ✅ Live |
| 14 daily metrics tables + pg_cron | migrations 355–369 | 3 | ✅ Live |
| Platform Knowledge Base | `components/feature/conductor/KnowledgePanel.tsx` | 4 | ✅ Live |
| IntentDetector | `lib/conductor/IntentDetector.ts` | 4 | ✅ Live |
| PlatformUserContext + Redis cache | `lib/platform/user-context.ts` | 4 | ✅ Live |
| Network Intelligence page | `/admin/network/` | 4 | ✅ Live |
| Learning Loop (decision_outcomes) | migrations 377–378 | 4 | ✅ Live |
| TierCalibrationPanel | `components/feature/conductor/TierCalibrationPanel.tsx` | 4 | ✅ Live |
| ConformanceChecker | `lib/process-studio/conformance/ConformanceChecker.ts` | 5 | ✅ Live |
| MiningPanel (conformance + shadow + promote) | `components/feature/conductor/MiningPanel.tsx` | 5 | ✅ Live |
| **Build Canvas** (unified org canvas) | `components/feature/conductor/BuildCanvas.tsx` | 5B | ✅ Live |
| **BuildPalette** (drag-to-canvas agent palette) | `components/feature/conductor/BuildPalette.tsx` | 5B | ✅ Live |
| **BuildPropertiesDrawer** (right-side edit form) | `components/feature/conductor/BuildPropertiesDrawer.tsx` | 5B | ✅ Live |
| **build-store** (Zustand nav — 3 levels) | `components/feature/conductor/build-store.ts` | 5B | ✅ Live |
| **DevOps Team** (CAS → DevOps rename + enriched configs) | migration 383 (rename) + 384 (configs) | 6B | ✅ Live |
| **HITL in Teams** (interrupt/resume in supervisor pattern) | `TeamRuntime.ts` + `/api/admin/teams/[id]/runs/[runId]/resume` | 6C | ✅ Live |
| **CAS soft-deprecation** (redirect + stub routes + table deprecation) | `/admin/cas` redirect + migration 385 | 6D | ✅ Live |
| **Governance stubs** (decision_outcomes on team completion) | `TeamRuntime._writeTeamRunDecisionStubs()` | 6E | ✅ Live |
| **Agent Episodic Memory** (memory_episodes + memory_facts) | `lib/agent-studio/AgentMemoryService.ts` + migration 386 | 7 | ✅ Live |
| **MCP Integration Framework** (connections + catalog + executions) | `lib/mcp/MCPClientManager.ts` + migrations 387–388 | 8 | ✅ Live |
| **MCPPanel** (admin UI — connections, catalog, exec log) | `components/feature/conductor/MCPPanel.tsx` | 8 | ✅ Live |
| **SimulationPanel** (scenario runner) | `components/feature/conductor/SimulationPanel.tsx` | — | ✅ Live |
| **EvalPanel** (agent evaluation) | `components/feature/conductor/EvalPanel.tsx` | — | ✅ Live |
| **Admin Operations** (daily brief, health, exceptions, command bar) | `/admin/operations/` + `/api/admin/operations/*` | 9 | ✅ Live |
| **workflow_exceptions** table (unified exception queue) | migration 389 | 9 | ✅ Live |

---

## Conductor Use Cases — Six Lifecycles

Conductor operates on six lifecycle use cases. The first two (GTM and Referral) are acquisition-focused. The remaining four cover post-acquisition retention, AI product adoption, organisation conversion, and the AI creator economy.

| # | Use Case | Nature | Spec |
|---|----------|--------|------|
| 1 | **GTM Lifecycle** | Sequential 6-stage funnel — content to revenue | [`gtm-intelligence-spec.md`](./gtm-intelligence-spec.md) (capstone) |
| 2 | **Referral Lifecycle** | Parallel acquisition track — injects users at any GTM stage | [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) |
| 3 | **Retention / LTV Lifecycle** | Post-acquisition cohort health — all 4 user roles | [`retention-intelligence-spec.md`](./retention-intelligence-spec.md) |
| 4 | **AI Product Adoption** | Sage Pro + Growth Agent subscriptions + AI marketplace | [`ai-adoption-intelligence-spec.md`](./ai-adoption-intelligence-spec.md) |
| 5 | **Organisation Conversion** | Solo operator → org founder conversion funnel | [`org-conversion-intelligence-spec.md`](./org-conversion-intelligence-spec.md) |
| 6 | **AI Studio Creator Lifecycle** | AI agent creator journey — draft to active income | [`ai-studio-intelligence-spec.md`](./ai-studio-intelligence-spec.md) |

```
ACQUISITION                    RETENTION & GROWTH
──────────────────────────     ──────────────────────────────────────────────────

GTM Lifecycle:                 Retention / LTV (Use Case 3):
Resources → SEO →              Onboarding → Activated → Retained →
Marketplace → Listings →         Re-engagement → Win-back
Bookings → Financials          (all 4 roles: tutor, client, agent, org)

Referral (Use Case 2):         Org Conversion (Use Case 5):
Injects at any GTM stage       Solo operator → Org candidate →
10% lifetime commission          Org founder → Scaling org

                               AI Product Adoption (Use Case 4):
                               Sage Pro + Growth Agent subscriptions
                               + AI marketplace demand metrics

                               AI Studio Creator (Use Case 6):
                               AI agent: Draft → Configure → Publish →
                                 First booking → Quality → Scale
```

### GTM Lifecycle — Standard Path

```
┌──────────────── SIGNAL (cross-cutting attribution, not a stage) ─────────────────┐
│  Article → search → marketplace → listing → booking → payment                   │
│  Segments by booking_type ('human' | 'ai_agent')                                │
│  Article Intelligence Score: Conv(40%) + Revenue(30%) + Traffic(20%) + Fresh(10%)│
└──────────────────────────────────────────────────────────────────────────────────┘
        ↑ reads from all stages                  ↓ feeds intelligence back

Resources ──► SEO ──► Marketplace ──► Listings ──► Bookings ──► Financials
  [1]          [2]        [3]            [4]           [5]           [6]

CaaS (trust quality foundation — precondition for Marketplace, Listings, Bookings, and Referral propensity)
```

### VirtualSpace — Alternative Conversion Path

VirtualSpace Free Help (`session_type='free_help'`) is an **instant booking** that bypasses Listings:

```
Marketplace ──► [Free Help] ──────────────────────────────► Bookings
                (instant session,                              ↑
                 14-day booking window)                        │
Marketplace ──► Listings ──────────────────────────────────►──┘
                (standard path)
```

VirtualSpace also provides the session execution layer within Bookings (booking sessions, `session_type='booking'`). Spec: [`virtualspace-intelligence-spec.md`](./virtualspace-intelligence-spec.md) | Migration 363

### Stage Intelligence Summary

```
  1. RESOURCES (create)
     Gate: SEO Readiness Score ≥ 70 before publish
     Agent: Market Intelligence | query_resources_health, query_editorial_opportunities
     Spec: resources-intelligence-spec.md | Migration 356

  2. SEO (optimise + acquire)
     Monitor: rank velocity, content decay, backlink health, keyword gaps
     Agent: Market Intelligence | query_seo_health, query_keyword_opportunities
     Spec: seo-intelligence-spec.md | Migration 357

  SIGNAL (cross-cutting attribution — reads + writes to all 6 stages)
     Article Intelligence Score computed per article, segmented by booking_type
     Agent: Market Intelligence | query_content_attribution
     Spec: signal-intelligence-spec.md | Migration 358

  3. MARKETPLACE (discover)
     Supply/demand gaps → recruitment; search funnel; AI agent adoption
     Agent: Market Intelligence | query_marketplace_health, query_supply_demand_gap
     Spec: marketplace-intelligence-spec.md | Migration 359

  4. LISTINGS (commit)
     Listing quality, pricing benchmarks, completeness score
     Agent: Market Intelligence | query_listing_health, query_pricing_intelligence
     Spec: listings-intelligence-spec.md | Migration 361

  5. BOOKINGS (convert + retain)
     Cancellation, no-show, scheduling stall, repeat booking rate, GMV
     Agent: Retention Monitor | query_booking_health
     Spec: bookings-intelligence-spec.md | Migration 360

  6. FINANCIALS (settle)
     Clearing pipeline, payout health, disputes, unreversed commissions
     Agent: Retention Monitor | query_financial_health
     Spec: financials-intelligence-spec.md | Migration 362

  REFERRAL (parallel track — injects users at any stage)
     K-coefficient (I × C1 × C2), funnel, ghost rate, hub node identification
     Commission: 10% lifetime, all referrer types, all referred user types
     Agent: Retention Monitor | query_referral_funnel
     Spec: referral-intelligence-spec.md | Migrations 364–365

  CaaS (trust foundation — underpins all stages + referral propensity)
     Score distribution, stale detection, CaaS–revenue correlation
     Agent: Operations Monitor | query_caas_health
     Spec: caas-intelligence-spec.md | Migration 355
```

### Cross-Stage Feedback Loops

```
Content Intelligence:   Signal → Article band → Content Decay Recovery / Article Boost
Supply/Demand:          Signal demand ↑ → Marketplace gap → Supply Gap → Recruitment
Payout Flywheel:        Financials payouts → tutor trust → Referral K ↑ → more Bookings
CaaS Compounding:       Bookings + Referrals + Free Help → CaaS ↑ → Marketplace ranking ↑
Free Help Conversion:   Marketplace → Free Help → 14d window → Booking → Signal attribution
```

---

## Feature Intelligence Specs Index

Fourteen intelligence specs (2026-03-08/09) across six Conductor use cases + one capstone meta-spec. Each spec defines:
- Specialist Agent tool(s) and SQL implementation
- Alert triggers + severity + admin action
- Daily platform metrics table (pg_cron)
- Admin UI panel extension
- Conductor workflow integration
- Growth Advisor coaching layer

**Capstone meta-spec** (links GTM + Referral specs into two acquisition use cases):
[`gtm-intelligence-spec.md`](./gtm-intelligence-spec.md) — GTM Lifecycle + Referral Lifecycle architecture, stage gates, agent coverage map, cross-stage feedback loops, Conductor template definition.

### GTM Lifecycle + Cross-Cutting Layers (Use Cases 1 & 2)

| Spec | Use Case | Agent Owner | Key Tools | Migration | Phase 3 est. |
|------|----------|-------------|-----------|-----------|-------------|
| [caas-intelligence-spec.md](./caas-intelligence-spec.md) | GTM foundation | Operations Monitor | `query_caas_health` | 355 | 30h |
| [resources-intelligence-spec.md](./resources-intelligence-spec.md) | GTM stage 1 | Market Intelligence | `query_resources_health`, `query_editorial_opportunities` | 356 | 18h |
| [seo-intelligence-spec.md](./seo-intelligence-spec.md) | GTM stage 2 | Market Intelligence | `query_seo_health`, `query_keyword_opportunities` | 357 | 20h |
| [signal-intelligence-spec.md](./signal-intelligence-spec.md) | GTM cross-cutting | Market Intelligence | `query_content_attribution` | 358 | 27h |
| [marketplace-intelligence-spec.md](./marketplace-intelligence-spec.md) | GTM stage 3 | Market Intelligence | `query_marketplace_health`, `query_supply_demand_gap` | 359 | 24h |
| [bookings-intelligence-spec.md](./bookings-intelligence-spec.md) | GTM stage 5 | Retention Monitor | `query_booking_health` | 360 | 22h |
| [listings-intelligence-spec.md](./listings-intelligence-spec.md) | GTM stage 4 | Market Intelligence | `query_listing_health`, `query_pricing_intelligence` | 361 | 20h |
| [financials-intelligence-spec.md](./financials-intelligence-spec.md) | GTM stage 6 | Retention Monitor | `query_financial_health` | 362 | 20h |
| [virtualspace-intelligence-spec.md](./virtualspace-intelligence-spec.md) | GTM shortcut + execution | Market Intelligence | `query_virtualspace_health` | 363 | 14h |
| [referral-intelligence-spec.md](./referral-intelligence-spec.md) | Referral lifecycle | Retention Monitor | `query_referral_funnel`, K coefficient SQL | 364–365 | 24h |

**GTM + Referral subtotal: ~219h Phase 3** (+ 34h Phase 4 = ~253h)

### Post-Acquisition Use Cases (Use Cases 3–6)

| Spec | Use Case | Agent Owner | Key Tool | Migration | Phase 3 est. |
|------|----------|-------------|----------|-----------|-------------|
| [retention-intelligence-spec.md](./retention-intelligence-spec.md) | Retention / LTV | Retention Monitor | `query_retention_health` | 366 | 22h |
| [ai-adoption-intelligence-spec.md](./ai-adoption-intelligence-spec.md) | AI Product Adoption | Market Intelligence | `query_ai_adoption_health` | 367 | 18h |
| [org-conversion-intelligence-spec.md](./org-conversion-intelligence-spec.md) | Org Conversion | Operations Monitor | `query_org_conversion_health` | 368 | 18h |
| [ai-studio-intelligence-spec.md](./ai-studio-intelligence-spec.md) | AI Studio Creator | Market Intelligence | `query_ai_studio_health` | 369 | 20h |

**Post-acquisition subtotal: ~78h Phase 3** (+ ~16h Phase 4 = ~94h)

**Total across all 14 specs: ~297h Phase 3 + ~50h Phase 4 = ~347h**

### pg_cron Schedule — All Intelligence Metrics (UTC)

| Time | Job | Migration |
|------|-----|-----------|
| 04:30 | Resources platform metrics | 356 |
| 05:00 | SEO platform metrics | 357 |
| 05:30 | CaaS platform metrics | 355 |
| 06:00 | Marketplace platform metrics | 359 |
| 06:30 | Bookings platform metrics | 360 |
| 07:00 | Listings platform metrics | 361 |
| 07:30 | Financials platform metrics | 362 |
| 08:00 | VirtualSpace platform metrics | 363 |
| 08:30 | Signal (Article Intelligence Scores) | 358 |
| 09:00 | Referral metrics daily | 364 |
| 09:30 | Retention platform metrics | 366 |
| 10:00 | AI Adoption platform metrics | 367 |
| 10:30 | Org Conversion platform metrics | 368 |
| 11:00 | AI Studio platform metrics | 369 |

> **Professional Assessment**: See [`conductor-professional-assessment.md`](./conductor-professional-assessment.md) for full market comparison (Temporal, LangGraph, Camunda, n8n, CrewAI, Microsoft Copilot Studio), honest weaknesses, lab research comparison, and solo-founder + Claude execution model analysis.

---

## Phase 1 — Consolidation & Designer Completion
**Goal**: Clean up what exists. Complete the visual designer. One admin interface.
**Estimate**: 80–90h
**Dependency**: None — start immediately

### Phase 0 — Code Rename: `process-studio` → `workflow`

Before Phase 1 work begins, rename the internal code namespace to match the new product naming.

| Task | Scope |
|------|-------|
| Rename API routes: `/api/admin/process-studio/` → `/api/admin/workflow/` | All route files under `apps/web/src/app/api/admin/process-studio/` |
| Rename component directory: `components/feature/process-studio/` → `components/feature/workflow/` | All files inside |
| Rename store: `useProcessStudioStore` → `useWorkflowStore` | `store.ts` + all imports |
| Rename component: `ChatPanel` label "Process Assistant" → "Workflow Assistant" | `ChatPanel.tsx` line 200 |
| Update nav URL: `/admin/studio` → `/admin/conductor` | `apps/web/src/app/admin/` route structure |
| Update all imports referencing old paths | Global find-and-replace |
| Rename DB table: `analyst_agents` → `specialist_agents`; add `built_in` + `role` columns; seed 8 CAS built-in rows (Migration 348) | `tools/database/migrations/348_...` + all code references to `analyst_agents` |
| Remove `/admin/cas` standalone route; CAS agent data surfaces in `/admin/conductor` Agents tab | `apps/web/src/app/admin/cas/` route deletion + nav link removal |

> **Non-negotiable**: These are label/path renames only — no logic changes. Estimated 2–3h. Phase 1 does not start until Phase 0 is complete. Shipping Phase 1 on top of old names creates compounding technical debt across every file touched.

---

### 1A — Conductor Designer Completion (40–48h)

**What to build:**

| Task | Hours | Notes |
|------|-------|-------|
| Node palette sidebar with drag-to-canvas | 10h | Left panel, grouped by category: **Triggers / Actions / Decisions / Human / Flow / Agents**. Dragging onto canvas creates node at drop position. |
| Merge ExecutionCanvas → design canvas overlay | 8h | Remove `ExecutionCanvas.tsx`. Add `showLiveOverlay` toggle on design canvas. Node border colour reflects `workflow_tasks.status` via Supabase Realtime. |
| **CAS WorkflowVisualizer → Conductor** | 6h | Move `cas/packages/core/src/admin/WorkflowVisualizer.tsx` into Conductor as a canvas tab/mode. CAS Team (9 agents as ReactFlow nodes with routing edges, live execution overlay) becomes a switchable view within the same canvas. `/admin/cas/workflow-fullscreen` removed — opens from Conductor instead. |
| Conditional edge labels (Yes / No / If / Else) | 4h | Extend ProcessEdgeData with `label?`. Render badge at edge midpoint. Condition node properties panel gains "Yes branch label" / "No branch label" fields. |
| Handler schema registry + form-based config UI | 8h | Replace free-form JSON in PropertiesDrawer Tab 2. Registry maps handler name → required config fields. Dynamic form rendered from schema. |
| Process versioning (migration 347) | 6h | `workflow_process_versions` table. Snapshot on every publish. Rollback from version list. Auto-save every 5 min writes to `workflow_processes.draft_nodes/draft_edges` (NOT a version row). Publish creates a versioned snapshot in `workflow_process_versions`. |
| Workflow validation (pre-publish checks) | 4h | Errors: no trigger, no end, orphan nodes, condition with single edge, action missing handler. Warnings: no description, approval with no assignee. Block publish if errors exist. |
| **Subtotal** | **46h** | |

**Handler Schema Registry — all 11 handlers with config schemas:**

| Handler | Config fields | What it does |
|---------|--------------|--------------|
| `tutor_approval_score` | `caas_threshold (int)`, `auto_approve_above (int)` | Scores tutor profile. Auto-approves if above threshold. HITL if borderline. |
| `stripe_payout` | `min_payout_gbp (int)`, `stripe_account_field (str)` | Triggers Stripe Connect payout for eligible commissions. |
| `send_email` | `template_id (str)`, `to_field (str)`, `subject (str)` | Sends templated email via Resend. Variables from execution context. |
| `send_notification` | `title (str)`, `body (str)`, `profile_id_field (str)` | In-app notification via Supabase INSERT + Realtime. |
| `stripe_webhook_verify` | `event_type (str)`, `secret_env_var (str)` | Validates Stripe webhook signature. Passes event to context. |
| `supabase_update` | `table (str)`, `id_field (str)`, `updates (obj)` | Updates a Supabase table row. Rollback: reverse update. |
| `growth_score_compute` | `profile_id_field (str)`, `role_type (str)` | Computes + caches Growth Score for one profile. |
| `referral_attribute` | `booking_id_field (str)` | Looks up agent_id on booking. Calculates commission split. |
| `cas_agent` | `agent_slug (str)` or `team_slug (str)`, `prompt_template (str)`, `output_field (str)` | Invokes a registered Specialist Agent or Team by slug. Output stored in context. |
| `http_request` | `url (str)`, `method (str)`, `body_template (obj)`, `auth_env_var (str)` | External HTTP call. Response stored in context. |
| `condition_eval` | `expression (str)`, `context_fields (arr)` | Evaluates a JS expression against execution context. Routes yes/no branches. |

**What to keep unchanged:**
- All 7 node types (trigger, action, condition, approval, notification, end, subprocess) — already ahead of Fuschia
- PropertiesDrawer Tab 1 (Basic) — solid
- TemplateSelector (load from DB) — solid
- ChatPanel (AI mutations) — solid
- Undo/Redo — solid
- Auto-layout — solid
- PDF export / JSON import/export — solid
- All 11 handler implementations — solid, keep
- All 5 seeded workflow processes — keep

**What to remove:**
- `ExecutionCanvas.tsx` — replaced by overlay above
- `ShadowDivergencePanel.tsx` — rebuild properly (see 1C) or cut entirely
- `/admin/cas/workflow-fullscreen` route — absorbed into Conductor canvas

### 1B — Live Production Fixes + Cross-Workflow Coordination (10h)

#### 1B-i — Migration 346 Production Fixes (4h)

Both are live gaps affecting current production workflows:

```sql
-- Migration 346 (part A): Workflow trigger deduplication
-- Prevents double-firing of Tutor Approval when profile updates twice
CREATE UNIQUE INDEX idx_workflow_executions_active_entity
ON workflow_executions (process_id, target_entity_id)
WHERE status IN ('running', 'pending');

-- Migration 346 (part B): DLQ retry scheduler
-- failed_webhooks table (migration 058) exists but has NO retry job
SELECT cron.schedule(
  'process-failed-webhooks',
  '*/15 * * * *',
  $$
    UPDATE failed_webhooks SET retry_count = retry_count + 1,
      last_retry_at = now(), status = 'retrying'
    WHERE status = 'failed'
      AND retry_count < 5
      AND COALESCE(last_retry_at, created_at)
          + (INTERVAL '1 minute' * power(2, retry_count)) < now()
  $$
);

-- Migration 346 (part C): Workflow fallback polling
-- Profiles in 'under_review' with no execution in last 60 min = missed webhook
SELECT cron.schedule(
  'workflow-trigger-fallback',
  '*/5 * * * *',
  $$
    INSERT INTO workflow_execution_queue (process_id, target_entity_id)
    SELECT 'tutor-approval-process-id', p.id
    FROM profiles p
    WHERE p.status = 'under_review'
      AND NOT EXISTS (
        SELECT 1 FROM workflow_executions we
        WHERE we.target_entity_id = p.id
          AND we.created_at > now() - INTERVAL '60 minutes'
      )
    ON CONFLICT DO NOTHING
  $$
);
```

#### 1B-ii — Cross-Workflow Coordination (6h)

**Problem**: Two workflows can simultaneously target the same user. A "Stuck Referral Recovery" email and an "Org Dormancy Re-engagement" email can land on the same day, creating a bad admin/user experience.

**Solution**: Entity-level active workflow check + cooldown before starting any new workflow targeting an entity.

```sql
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
- If entity has any active workflow: queue or skip (configurable per workflow definition)
- If entity received a communication workflow in the last 48h: apply cooldown for nudge-type workflows
- Log suppressed triggers to `platform_events` as `workflow.trigger_deduplicated`

#### 1B-iii — Bridge Files (new files needed)

Following the existing `sage-bridge.ts` / `lexi-bridge.ts` pattern, publishing to `platform_events`:

```
cas/integration/
├── sage-bridge.ts          (existing — update to publish to platform_events)
├── lexi-bridge.ts          (existing — update to publish to platform_events)
├── growth-bridge.ts        (NEW)
│     handleAuditCompleted()  → growth.audit_completed
│     handleSessionEvent()    → session.started / session.ended
│     handleScoreUpdated()    → growth.score_updated
│
└── workflow-bridge.ts (NEW)
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

**Shared Agent Tools** (`apps/web/src/lib/workflow/agent-tools/`):

```
  get-executions.ts        ← live execution state for a user (Lexi + Growth)
  trigger-workflow.ts      ← HITL action gateway (all user-facing agents)
                              includes: entity cooldown check before trigger
  list-approvals.ts        ← pending HITL tasks (admin mode)
  approve-task.ts          ← approve/reject HITL task (admin mode)
  get-divergences.ts       ← shadow mode divergence report (admin mode)
```

### 1C — Unified Admin Monitoring (10–12h)

Replace three separate dashboards (`/admin/cas`, `/admin/process-studio`, `/admin/process-studio/fullscreen`) with one unified view at `/admin/conductor`:

```
┌──────────────────────────────────────────────────────────┐
│  /admin/conductor                                           │
│  [Canvas] [Agents] [Teams] [Monitoring] [Discovery]     │
│  [Analytics]                                             │
├──────────────────────────────────────────────────────────┤
│  MONITORING TAB                                          │
│                                                          │
│  Exception Queue          Active Workflows               │
│  ┌──────────────────┐    ┌──────────────────────┐        │
│  │ 3 pending tasks  │    │ Tutor Approval ●     │        │
│  │ [Claim] [Resolve]│    │ Commission Payout ●  │        │
│  └──────────────────┘    └──────────────────────┘        │
│                                                          │
│  Agent / Team Status      Platform Health                │
│  ┌──────────────────┐    ┌──────────────────────┐        │
│  │ Mkt Intel  ● run │    │ DLQ backlog:  2      │        │
│  │ Financial  ● idle│    │ Webhook fail: 0      │        │
│  │ DevOps Tm  ● idle│    │ Shadow diff:  1      │        │
│  └──────────────────┘    └──────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

| Section | What it shows |
|---------|--------------|
| **Exception Queue** | Pending HITL approval tasks across all live workflows. Claimed_by soft lock. |
| **Active Workflows** | Live executions with status, current node, started_at. Click → opens canvas with overlay. |
| **Agent Status** | Specialist agents + DevOps Team — status, last activity, task counts. |
| **Platform Health** | DLQ backlog count, webhook failures, shadow mode divergences (rebuilt from ShadowDivergencePanel). |
| **Operational Briefing** | AI-generated daily summary (uses existing `getAIService().generate()`). |

**Remove**: `/admin/cas` standalone dashboard — data migrated to unified Conductor Monitoring tab.

**Navigation reframe** — the admin sidebar is reorganised from domain-first to autonomy-first:

```
ADMIN SIDEBAR — Before vs After

  BEFORE (domain-first)          AFTER CONDUCTOR (autonomy-first)
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
  ── Workflows
  ── AI Agents                   MANAGEMENT
                                 ── Bookings / Listings
                                 ── Accounts / Financials
                                 ── Referrals / Organisations
                                 ── AI Systems (Sage, Lexi, Growth)

                                 CONDUCTOR  (/admin/conductor)
                                 ── Workflows  (/admin/conductor/workflows)
                                 ── Agents     (/admin/conductor/agents)
                                 ── Teams      (/admin/conductor/teams)
                                 ── Discovery  (/admin/conductor/discovery)
                                 ── Settings / Shared Fields
```

**Admin Operations** — dedicated operations page (separate from existing admin dashboard):

```
/admin/operations/  — Admin Operations

  ┌─────────────────────────────────────────────────────────────┐
  │  Good morning. Platform brief — Thursday 5 March            │
  │                                                             │
  │  3 exceptions need your decision                           │
  │  2 supervised sequences awaiting approval                   │
  │  Platform running normally — all processes nominal          │
  │                                                             │
  │  AI confidence: high (8 signals, 2 domains)                │
  └─────────────────────────────────────────────────────────────┘

  Ask anything...  [Lexi admin mode — query bar]

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
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │  AUTONOMOUS OPERATIONS (last 7 days)                        │
  │  31 tutor applications approved      £6,200 payouts sent    │
  │  204 referral nudges sent            12 orgs re-engaged     │
  │  8 workflows completed               156 knowledge chunks   │
  │  [Override any decision]  [View full audit log]             │
  └──────────────────────────────────────────────────────────────┘
```

**Exception queue ownership**: When an admin opens an exception it becomes `claimed` (15-minute soft lock). Other admins see it as claimed but can override-claim. Exceptions unclaimed for 48h trigger an email alert to the admin team.

```sql
-- Migration 346 (partial): workflow_exceptions table
CREATE TABLE workflow_exceptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id uuid REFERENCES workflow_executions(id),
  severity text NOT NULL,      -- 'high' | 'medium' | 'low'
  domain text NOT NULL,        -- 'bookings' | 'referrals' | 'financials' | 'listings' | 'orgs'
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
```

### 1D — Template CRUD from UI (6h)

Extends existing TemplateSelector:
- **Save as template**: current canvas → `workflow_process_templates` with name, description, category, complexity, tags
- **Clone template**: copies to new process in 'design' mode
- **Edit template metadata**: name, description, tags (not nodes/edges — load into canvas to change those)
- **Delete template**: system templates protected

---

## Phase 2 — Conductor: Agents + Teams
**Goal**: Non-technical admins can spin up specialist AI Agents (single) and multi-agent Teams from the canvas.
**Estimate**: 130–140h
**Dependency**: Phase 1 complete

This is the user's primary goal. Build from Fuschia's Agents module, adapted for Tutorwise. Three new capabilities: standalone Agents, multi-agent Teams (Supervisor/Pipeline/Swarm patterns), and Growth Advisor migration.

### 2A — Agent Node Type + Registry (25h)

**Not a separate canvas** — the Agent designer is built INTO Conductor. Two additions to the existing canvas:

**Addition 1: `agent` node type (8th node type in Conductor)**

Added to the node palette under the "Agents" group. When dragged onto the canvas:
- Can be used inline in a Workflow (action invokes an Agent, output passes to next node)
- Or used standalone on the canvas to visualise and configure a standalone Agent

What you can do from the canvas:
1. Drag an Agent tile from the "Agents" palette onto the canvas
2. Configure via the property panel (right drawer) — full config including prompt, skills, tools, strategy
3. Save → Agent registered in `specialist_agents` table, status: `active`
4. Load from Agent templates (pre-built configurations)

**Addition 2: Registry Panel (`/admin/conductor` — three tabs)**

Dedicated list view alongside the canvas — shows ALL Workflows, Agents, and Teams:

```
┌─────────────────────────────────────────────────────────────┐
│  CONDUCTOR                [Workflows] [Agents] [Teams]    │
├─────────────────────────────────────────────────────────────┤
│  AGENTS TAB                                   [+ New Agent] │
├─────────────────────────────────────────────────────────────┤
│  ● Market Intelligence    active   last run: 2h ago  [Chat] │
│  ● Financial Analyst      active   last run: 6h ago  [Chat] │
│  ● Operations Monitor     active   last run: 1h ago  [Chat] │
│  ● Retention Monitor      active   last run: 3h ago  [Chat] │
│  (none custom — drag from palette to create)                │
├─────────────────────────────────────────────────────────────┤
│  TEAMS TAB                                    [+ New Team]  │
├─────────────────────────────────────────────────────────────┤
│  ◆ DevOps Team             active   Supervisor · 9 agents   │
│    [View in Canvas]                 [Monitor runs]          │
│  (none custom — build from canvas)                          │
└─────────────────────────────────────────────────────────────┘
```

Admin actions on any Agent: **Configure · Monitor runs · Chat · Remove**
Admin actions on any Team: **View Canvas · Monitor runs · Remove**

**Conductor canvas with Agent and Team nodes:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Conductor  [Workflows ▼]  [Agents]  [Teams]  [Discovery]   [Publish] │
├──────┬───────────────────────────────────────────────────────────────────┤
│      │                                                                    │
│ WORKFLOWS   ┌─────────┐    ┌──────────────┐    ┌───────────┐            │
│  trigger ──▶│ Action  │──▶│ Agent node   │──▶│  Approval │            │
│  action     │(handler)│    │[Mkt Intel]   │    │  (HITL)   │            │
│  condition  └─────────┘    └──────────────┘    └───────────┘            │
│  approval        ↑ inline Agent use inside Workflow                      │
│  ...                                                                     │
│             ──────────────────────────────────────────────               │
│ AGENTS      ┌──────────────┐    ┌──────────────┐                        │
│  Standard ──▶│ Mkt Intel   │    │ Financial    │  ← standalone Agent     │
│  Custom     │  [config]    │    │  Analyst     │    canvas               │
│             └──────────────┘    └──────────────┘                        │
│             ──────────────────────────────────────────────               │
│ TEAMS       ┌────────────────────────────────────────────┐              │
│  DevOps   ──▶│ Director ──▶ Dev ──▶ Tester ──▶ QA → ... │ ← Team canvas │
│  Custom     └────────────────────────────────────────────┘              │
│                                                                          │
└──────┴───────────────────────────────────────────────────────────────────┘
```

**Agent node configuration (AgentPropertyForm equivalent):**
```typescript
interface SpecialistAgentConfig {
  id: string;
  name: string;                             // e.g. "Market Intelligence Agent"
  role: 'coordinator' | 'specialist' | 'executor';
  department: string;                       // e.g. "Operations", "Finance", "Marketing"
  description: string;                      // What this agent does
  systemPrompt: string;                     // The agent's expertise framing
  skills: string[];                         // e.g. ["booking trend analysis", "tutor performance scoring"]
  tools: string[];                          // Tool IDs from Tool Registry (§2B)
  strategy: 'simple' | 'chain_of_thought' | 'react' | 'hybrid';
  maxConcurrentTasks: number;
  requiresHumanApproval: boolean;           // HITL gate on this agent's outputs
  escalateTo?: string;                      // Agent ID to hand off to when out of scope
  schedules?: AgentSchedule[];             // Cron-triggered runs
}

interface AgentSchedule {
  cron: string;                             // e.g. "0 9 * * 1" (Monday 9am)
  task: string;                             // What to run: e.g. "Weekly market brief"
  outputTo: 'exception_queue' | 'email' | 'slack_webhook';
}
```

**Tutorwise-specific agent roles palette:**

| Role | What it analyses | Tools | Schedule |
|------|----------------|-------|---------|
| **Market Intelligence** | Booking trends, subject demand, tutor supply gaps | `query_booking_trends`, `query_listing_gaps`, `query_subject_demand` | Weekly Monday 09:00 |
| **Financial Analyst** | Commission calculations, revenue trends, payout anomalies | `query_commissions`, `query_stripe_payouts`, `query_revenue_trends` | Weekly Friday 08:00 |
| **Operations Monitor** | At-risk tutors, platform health, anomalies | `query_platform_health`, `query_tutor_churn_risk`, `query_session_completion` | Daily 07:00 |
| **Platform Health** | Error rates, webhook failures, execution failures | `query_execution_failures`, `query_dlq_backlog`, `query_agent_errors` | Every 4 hours |
| **Retention Monitor** | Cohort retention, referral funnel conversion, supply/demand gaps, org renewal health | `query_cohort_retention`, `query_referral_funnel`, `query_supply_demand_gap`, `query_org_health` | Daily 08:00 |
| **Custom** | Define your own | Any registered tools | Custom |

**Note**: Retention Monitor is the admin-facing platform analytics specialist. It is distinct from the user-facing **Growth Advisor** product (`/growth`, £10/month subscription) — see D17.

### 2B — Tool Registry (15h)

Database-backed registry of tools available to agents. Admin can register new tools without code changes.

**Tool Registry UI:**

```
/admin/conductor/agents/tools

  ┌─────────────────────────────────────────────────────────────┐
  │  TOOL REGISTRY                              [+ Register Tool] │
  ├─────────────────────────────────────────────────────────────┤
  │  🔵 query_booking_trends      data_query    active  [Test]   │
  │  🔵 query_tutor_performance   data_query    active  [Test]   │
  │  🔵 query_platform_health     data_query    active  [Test]   │
  │  🔵 query_commissions         data_query    active  [Test]   │
  │  🔵 query_at_risk_tutors      data_query    active  [Test]   │
  │  🟠 flag_for_review          platform_action active  [Test]  │
  │  🟠 send_notification        platform_action active  [Test]  │
  │  ⚪ custom_webhook           external_api   inactive [Test]  │
  └─────────────────────────────────────────────────────────────┘

  [Test] → opens test panel: input params → run → see output
  [+ Register Tool] → form: name, description, category, input schema, TypeScript function
```

**Tool registration and validation:**

```typescript
// Tool is a registered TypeScript function in apps/web/src/lib/agent-studio/tools/
// Each tool exports:
export interface ToolDefinition {
  id: string                          // e.g. 'query_booking_trends'
  name: string                        // Display name
  description: string                 // What it returns — used in agent system prompt
  category: 'data_query' | 'platform_action' | 'external_api' | 'calculation'
  inputSchema: Record<string, ToolParam>  // JSON Schema for agent to follow
  execute: (input: Record<string, unknown>, context: AgentContext) => Promise<unknown>
}

// Validation:
// 1. Function must be deterministic for same inputs (no side effects for data_query)
// 2. platform_action tools require entity_id in input (audit trail)
// 3. All tools respect RLS — use service_role only if explicitly required + logged
// 4. Tool execution writes to agent_run_outputs.tools_called jsonb
```

```typescript
interface AnalystTool {
  id: string;
  name: string;                     // e.g. "query_booking_trends"
  description: string;              // What it returns, for the agent to understand
  category: 'data_query' | 'platform_action' | 'external_api' | 'calculation';
  inputSchema: Record<string, ToolParam>;  // Parameters the agent must supply
  returnType: string;               // Description of what it returns
  status: 'active' | 'inactive';
}
```

**Seed tools (built-in, not editable):**

| Tool | Description | Returns |
|------|-------------|---------|
| `query_booking_trends` | Booking volumes by subject/tutor/period | Trend data: bookings by week, subject breakdown |
| `query_tutor_performance` | Tutor metrics: session completion, reviews, response rate | Performance metrics per tutor |
| `query_platform_health` | Error rates, DLQ backlog, execution failures | Health summary object |
| `query_commissions` | Available and paid commissions by tutor/period | Commission ledger |
| `query_growth_scores` | Growth scores by role and user | Score distribution |
| `query_referral_pipeline` | Referral channel performance, conversion rates | Referral funnel data |
| `query_at_risk_tutors` | Tutors showing churn signals | List of profile_ids + risk score |
| `query_stripe_payouts` | Stripe Connect payout history + anomaly flags | Payout records |
| `flag_for_review` | Adds item to admin exception queue | Confirmation |
| `send_notification` | Send in-app or email notification to user | Delivery receipt |

**UI:** `/admin/conductor/agents/tools` — list tools, register new, enable/disable, test with sample input.

**Execution**: Tools are Tutorwise PostgreSQL queries + Supabase RPC calls. No external API calls yet. Each tool is a registered TypeScript function in `apps/web/src/lib/agent-studio/tools/`.

### 2C — Agent Deployment & Chat Interface (10h)

Once an agent is saved from the designer:

1. **Deployed**: Agent is registered in `specialist_agents` table with its config, tools, and schedules. Status: `active`.
2. **Chat interface** at `/admin/conductor/agents/[agent-slug]`: Admin can chat directly with the deployed Agent. Agent uses its tools to answer. Stream responses via `getAIService().stream()`.
3. **Scheduled runs**: pg_cron fires at the configured schedule, invokes the agent with its scheduled task prompt, writes output to `agent_run_outputs` table, optionally posts to exception queue or sends email.
4. **Status monitoring**: Agent card in unified monitoring dashboard shows last_run_at, last_run_status, task count, error count.

```sql
-- Migration 348
CREATE TABLE specialist_agents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  role text,                       -- e.g. 'DevOps Engineer', 'Delivery Manager', 'Growth Marketing Specialist'
  config jsonb NOT NULL,           -- SpecialistAgentConfig
  status text NOT NULL DEFAULT 'active',
  built_in boolean DEFAULT false,  -- true = CAS pre-shipped built-in; false = admin-created custom
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE agent_run_outputs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES specialist_agents(id),
  trigger_type text NOT NULL,      -- 'scheduled' | 'manual' | 'workflow'
  input_prompt text NOT NULL,
  output_text text,
  tools_called jsonb,              -- [{tool, input, output, duration_ms}]
  status text NOT NULL,            -- 'completed' | 'failed'
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Seed 8 CAS built-in specialists (built_in = true, survives table renames and Phase 0 migration)
INSERT INTO specialist_agents (slug, name, role, config, built_in) VALUES
  ('developer',  'Developer',          'Software Developer',          '{}', true),
  ('tester',     'Tester',             'Test Engineer',               '{}', true),
  ('qa',         'QA',                 'Quality Assurance',           '{}', true),
  ('engineer',   'DevOps Engineer',    'DevOps Engineer',             '{}', true),
  ('security',   'Security Engineer',  'Security Engineer',           '{}', true),
  ('marketer',   'Marketer',           'Growth Marketing Specialist', '{}', true),
  ('analyst',    'Analyst',            'Business / Data Analyst',     '{}', true),
  ('planner',    'Planner',            'Delivery Manager',            '{}', true);
```

### 2D — Agent Templates (5h)

Pre-built agent organization configurations stored in `agent_templates` table. Same pattern as `workflow_process_templates`.

| Template | Agents included | Use case |
|---------|----------------|---------|
| **Platform Engineering** | Developer + Tester + QA + DevOps Engineer + Security Engineer | Platform build, test, deploy, and secure |
| **Operations Intelligence** | Analyst + Planner + Operations Monitor | Analytics, monitoring, delivery management |
| **Growth Marketing** | Marketer + Market Intelligence | User acquisition, campaigns, growth strategy |
| **Full Stack** | All 8 built-in specialists + coordinator | Enterprise — full platform coverage |

### 2E — Agent + Team → Workflow Integration (5h)

Existing `cas_agent` action node type in Conductor Workflows already exists. Extend it:
- Handler dropdown now shows deployed specialist agents (from `specialist_agents` table) not just CAS hardcoded agents
- Handler config: `{ agent_slug, prompt_template, output_field }` — agent runs with prompt, output stored in execution context for next node

### 2F — HITL Action Gateway — Security Boundary

Conductor execution engine is the single action runtime for all conversational Agents. Every Agent write action goes through it — full audit trail, idempotency, rollback.

**Two distinct endpoints, same execution engine:**

```
HITL GATEWAY SECURITY BOUNDARY

  User-facing agents (Lexi, Growth, Sage):
  POST /api/workflow/execute/start
    Auth: user session + profile_id scope
    Permissions: scoped to requesting user's own data only
    Cannot: read or modify other users, escalate privileges
    Can: cancel own booking, update own listing, send own message

  Admin-facing agents (Admin Intelligence, specialist agents):
  POST /api/admin/workflow/execute/start
    Auth: admin RBAC (requiresAdmin())
    Permissions: full execution context
    Can: approve/reject any entity, run any workflow
    Audited: all actions logged with admin user_id

  Both call the same PlatformWorkflowRuntime internally.
  Every workflow definition must declare:
    undoable: boolean       — if false, minimum tier = Supervised
    rollback_procedure      — SQL or API call to reverse
    idempotency_key_template — format for dedup keys
```

### 2F-ii — Proactive Nudge Scheduler

```
PROACTIVE NUDGE FLOW

  pg_cron: every 4 hours
         │
         ▼
  nudge-scheduler.ts
  For each active tutor profile:
  ├── Growth Score < 40 AND listing_last_view > 14d?
  │       → Generate AI quality brief
  │       → Check workflow_entity_cooldowns (7d cooldown per listing)
  │       → Not in cooldown? → INSERT notification + send email
  │
  ├── Growth Score drop > 5pts in 7d?
  │       → Generate "your score dropped" alert
  │       → Delivery: in-app (Supabase Realtime) + email
  │
  ├── Unread messages > 3 AND last_login > 3d?
  │       → Generate "you have pending messages" alert
  │       → Delivery: email only (user offline)
  │
  └── No bookings in 30d AND has active listings?
          → Generate "booking tips" brief
          → Delivery: in-app notification

  cooldown_until set on workflow_entity_cooldowns to prevent:
  - Same nudge firing multiple times in 24h
  - Multiple campaigns targeting same user simultaneously
```

**In-app notification UI:**

```
NOTIFICATION BELL (header)
  ● 3 new notifications

  ┌────────────────────────────────────────────┐
  │  📊 Your Growth Score dropped 8 points     │
  │  Your listing hasn't been viewed in 18 days│
  │  [View recommendations]    5 minutes ago   │
  │                                            │
  │  📬 3 messages from potential clients      │
  │  [View messages]           2 hours ago     │
  │                                            │
  │  ✅ Your application has been approved!    │
  │  Welcome to Tutorwise.      Yesterday      │
  └────────────────────────────────────────────┘
```

### 2G — Agent Deployment Flow (diagram)

```
AGENT LIFECYCLE

  Admin opens Conductor
         │
         ▼
  [Agents tab] → clicks "+ New Agent"
         │
         ▼
  Drag agent template from palette onto canvas
         │
         ▼
  Property panel opens (right drawer):
  ┌─────────────────────────────────────────┐
  │  Name:         Market Intelligence      │
  │  Role:         specialist               │
  │  Department:   Operations               │
  │  System Prompt: [free-form textarea]    │
  │  Skills:       [tag input]              │
  │  Tools:        [multi-select registry]  │
  │  Strategy:     react                    │
  │  HITL gate:    ☐ requires approval      │
  │  Schedule:     Mon 09:00 → exception_q  │
  └─────────────────────────────────────────┘
         │
         ▼ [Save]
  INSERT INTO specialist_agents (slug, name, config, status='active')
         │
         ▼
  Agent appears in Agent Registry:
  ● Market Intelligence   active   [Chat] [Configure] [Remove]
         │
         ├── Ad-hoc: Admin clicks [Chat] → direct chat UI
         │     getAIService().stream() with agent config + tools
         │
         └── Scheduled: pg_cron fires → agent runs task
               → writes to agent_run_outputs
               → posts result to exception_queue OR email
```

### 2H — Unified Agent Infrastructure (10h)

**Replace `sage_pro_subscriptions` with unified `agent_subscriptions`** (zero-downtime migration):

```sql
-- Migration 349: unified agent subscriptions (separate zero-downtime migration)
CREATE TABLE agent_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  agent_type text NOT NULL,           -- 'sage' | 'growth' | future specialist agents
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

Zero-downtime migration sequence:
1. Create `agent_subscriptions` with triggers that mirror writes from `sage_pro_subscriptions`
2. Backfill: `INSERT INTO agent_subscriptions SELECT ..., 'sage' FROM sage_pro_subscriptions`
3. Verify read parity for 24h in production (both tables return identical results)
4. Switch all reads to `agent_subscriptions`
5. Drop `sage_pro_subscriptions` and mirror triggers

**Parameterised agent API routes** — adding a new agent requires no new routes:

```
apps/web/src/app/api/agents/[agentType]/
  stream/route.ts       ← replaces /api/sage/stream, /api/growth/stream
  session/route.ts      ← replaces per-agent session routes
  subscription/route.ts ← replaces per-agent subscription routes
```

`[agentType]` resolves to the correct orchestrator, rate limit config, and subscription check. Adding specialist agents = one registration entry, no new routes.

**Shared rate limits:**

```typescript
const AGENT_RATE_LIMITS: Record<string, AgentRateLimit> = {
  sage:                 { free: 10, pro: 5000, window: '24h', burst: 100 },
  growth:               { free: 10, pro: 5000, window: '24h', burst: 100 },
  'admin-intelligence': { free: null, pro: null, window: '1h', burst: 10 },
  'growth-admin':       { free: null, pro: null, window: '1h', burst: 20 },
}
```

### 2I — Agent Teams (35–40h)

Multi-agent Teams extend Conductor beyond single-agent coordination. Where an Agent answers one question independently, a Team assigns subtasks to multiple Agents and synthesises a combined result.

#### Three Team Patterns

| Pattern | How it works | When to use | Canvas |
|---------|-------------|-------------|--------|
| **Supervisor** | One coordinator Agent routes tasks to specialist Agents and synthesises the final result. Covers 80% of use cases. Matches CAS Team architecture. | When tasks need expert decomposition + coordination | Coordinator node at top, specialists below with routed edges |
| **Pipeline** | Sequential directed acyclic graph (DAG). Each Agent receives the previous Agent's output via `AgentTeamState.context`. Branches allowed. | When tasks have a defined processing chain | Linear nodes left-to-right, branching edges |
| **Swarm** | Peer-to-peer handoffs. Any Agent can transfer to any other. No central coordinator. Agent decides mid-task whether to hand off. | When the right specialist depends on runtime data | Fully connected graph, handoff edges in any direction |

#### AgentTeamState — Generic Shared State

All three patterns pass a single generic state object between Agents. Each Agent reads from and writes to this object. The `output_key` pattern (from Google ADK) ensures Agent outputs are namespaced and downstream Agents read the correct key:

```typescript
interface AgentTeamState {
  // The top-level task given to the team
  task: string

  // Full message history across all agents
  messages: Array<{ role: string; content: string; agent_slug: string; timestamp: string }>

  // Shared context: each agent writes its output under its own output_key
  // e.g. { analyst: "demand up 15%", financial: "revenue risk: £2.3k" }
  context: Record<string, unknown>

  // Structured outputs keyed by agent_slug
  outputs: Record<string, string>

  // Which agent is currently executing
  current_agent: string

  // Full handoff trail for audit + debugging
  handoff_history: Array<{
    from: string
    to: string
    reason: string
    timestamp: string
  }>

  // Final synthesised result (set by supervisor or last pipeline agent)
  team_result: string | null
}
```

#### TeamRuntime v2 — LangGraph StateGraph + PostgresSaver

> **Implementation history**: Phase 2 shipped with native async/await (shortcut). **Phase 6A (2026-03-11) rewrote TeamRuntime as a proper LangGraph StateGraph** with PostgresSaver checkpointing, CircuitBreaker protection, and HITL interrupt()/resume() support. The code below shows the original Phase 2 spec which is now the actual implementation (Phase 6A corrected the shortcut).

TeamRuntime v2 sits alongside `PlatformWorkflowRuntime`. At execution time it reads the Team's `nodes` + `edges` from `agent_teams` table and compiles a LangGraph StateGraph — no code change needed to add, remove, or rewire Agents in a Team. All runs are checkpointed via PostgresSaver and visible in Conductor Monitoring.

```typescript
// apps/web/src/lib/ipom-studio/team-runtime/
class TeamRuntime {
  async run(teamId: string, task: string): Promise<AgentTeamState> {
    // 1. Load team topology from DB
    const team = await db.agent_teams.findOne(teamId)

    // 2. Compile LangGraph StateGraph from topology
    const graph = new StateGraph<AgentTeamState>(AgentTeamStateSchema)

    for (const node of team.nodes) {
      graph.addNode(node.agent_slug, this.buildAgentNode(node))
    }
    for (const edge of team.edges) {
      if (edge.condition) {
        graph.addConditionalEdges(edge.from_slug, edge.condition, edge.targets)
      } else {
        graph.addEdge(edge.from_slug, edge.to_slug)
      }
    }

    graph.setEntryPoint(team.coordinator_slug ?? team.nodes[0].agent_slug)

    // 3. Execute with checkpointing (same PostgresSaver as workflows)
    const compiled = graph.compile({ checkpointer: this.checkpointer })
    return compiled.invoke({ task, messages: [], context: {}, outputs: {},
      current_agent: '', handoff_history: [], team_result: null })
  }

  private buildAgentNode(node: TeamNode) {
    return async (state: AgentTeamState) => {
      const agent = await db.specialist_agents.findOne({ slug: node.agent_slug })
      const result = await getAIService().generate({
        systemPrompt: agent.config.systemPrompt,
        userPrompt: JSON.stringify({ task: state.task, context: state.context }),
        tools: agent.config.tools.map(t => toolRegistry.get(t))
      })
      return {
        ...state,
        context: { ...state.context, [node.output_key]: result },
        outputs: { ...state.outputs, [node.agent_slug]: result },
        current_agent: node.agent_slug,
        handoff_history: [...state.handoff_history, {
          from: state.current_agent, to: node.agent_slug,
          reason: 'topology', timestamp: new Date().toISOString()
        }]
      }
    }
  }
}
```

#### Team Canvas (in Conductor)

When admin clicks **+ New Team** or opens an existing Team:

```
TEAM CANVAS — Supervisor Example

  ┌─────────────────────────────────────────────────────────────┐
  │  Team: "Market Intelligence Team"   Pattern: Supervisor     │
  │                                                             │
  │         ┌─────────────────────┐                            │
  │         │  Coordinator        │                            │
  │         │  Market Analyst     │                            │
  │         │  output_key: brief  │                            │
  │         └──────┬──────────────┘                            │
  │                │ routes tasks to:                          │
  │       ┌────────┼─────────────────┐                        │
  │       ▼        ▼                 ▼                        │
  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐               │
  │  │ Demand  │ │ Pricing  │ │  Competitor  │               │
  │  │ Analyst │ │ Analyst  │ │  Monitor     │               │
  │  │ output_ │ │ output_  │ │  output_key: │               │
  │  │ key:    │ │ key:     │ │  competitive │               │
  │  │ demand  │ │ pricing  │ └──────────────┘               │
  │  └────┬────┘ └────┬─────┘        │                       │
  │       └───────────┴──────────────┘                       │
  │                   │ all outputs → coordinator synthesises │
  │         ┌─────────▼───────────┐                          │
  │         │  team_result        │                          │
  │         └─────────────────────┘                          │
  └─────────────────────────────────────────────────────────────┘

  Node properties panel (right drawer):
  ┌─────────────────────────────────────┐
  │  Agent:        [select from registry│
  │                or create new]       │
  │  output_key:   demand               │
  │  Role:         specialist           │
  │  Condition:    (for conditional edge│
  │                from supervisor)     │
  └─────────────────────────────────────┘
```

#### Teams Invocable from Workflows

Workflows invoke Teams the same way they invoke standalone Agents — via the `cas_agent` action handler, extended to accept a `team_slug`:

```typescript
// Extended cas_agent handler config:
interface CasAgentHandlerConfig {
  agent_slug?: string    // invoke standalone Agent
  team_slug?: string     // invoke multi-agent Team
  prompt_template: string
  output_field: string   // where to store result in workflow execution context
}
// TeamRuntime.run() returns team_result → stored in output_field
```

#### Detailed Phase 2 Teams Task Table

| Task | Hours | Notes |
|------|-------|-------|
| `team` node type (9th) in Conductor + Team canvas mode | 8 | New node in palette. Canvas renders topology (nodes + edges from DB). Team property panel. |
| Teams tab in Conductor Registry | 4 | List teams. Status, last run, pattern badge. CAS Team visible read-only. |
| `AgentTeamState` TypeScript interface + schema | 2 | Shared state. Typed. Used by all three patterns. |
| `TeamRuntime` — dynamic LangGraph StateGraph compilation | 10 | Reads topology from DB. Compiles StateGraph. Checkpointed (same PostgresSaver). |
| Supervisor pattern executor | 4 | Coordinator node reads all specialist outputs and calls synthesis prompt. |
| Pipeline pattern executor | 3 | Sequential edges. Each node receives previous `context`. |
| Swarm pattern executor | 3 | Conditional edges keyed on runtime handoff decision. |
| Inline + pre-registered Agent creation in Team canvas | 3 | Drag from registry OR create new Agent inline from Team canvas property panel. |
| Teams invocable from Workflow action node (extend `cas_agent` handler) | 3 | Handler accepts `team_slug`. Delegates to TeamRuntime. Stores `team_result`. |
| `agent_team_run_outputs` table + API routes | 3 | Persist team runs. `/api/admin/teams/[id]/runs`. |
| CAS Team exposed as read-only Supervisor Team in registry | 2 | Virtual team definition seeded. Topology derived from `cas/agents/`. |
| Phase 2 Teams testing (unit + integration + manual) | 3 | TeamRuntime unit tests. End-to-end: create team, run, verify AgentTeamState. |
| **Subtotal** | **48h** | |

---

## Phase 3 — Analytics & Monitoring + Feature Intelligence Layer
**Goal**: Full visibility across Workflows, Agents, and Teams. Real-time monitoring. Platform-wide feature intelligence (10 features × daily metrics + Conductor workflows).
**Estimate**: 90–110h (existing plan) + ~219h (Feature Intelligence Layer) = ~310–330h total
**Dependency**: Phase 2

> **Feature Intelligence Layer**: 10 specialist specs define the platform metrics tables (migrations 353–363), pg_cron jobs, agent tools, admin UI panels, and Conductor workflows for every major feature. See the [Feature Intelligence Specs Index](#feature-intelligence-specs-index) and individual spec files in `conductor/`. Phase 3 intelligence should be sequenced: Resources (356) → SEO (357) → Signal (358) → Marketplace (359) → Bookings (360), then Listings/Financials/VirtualSpace/Referral/CaaS in parallel.

### 3A — Analytics Dashboard (15h)

At `/admin/conductor/analytics` — three tabs matching Fuschia's AnalyticsModule:

**Workflows tab:**
- Execution volume by process (last 7d, 30d)
- Handler success rates (which handlers fail most)
- Average execution duration by process
- Shadow mode divergence rate (% of shadow executions that differed from expected)
- Most common HITL escalation triggers

**Agents tab:**
- Agent run count, success rate, avg duration per agent
- Tool usage frequency (which tools are called most)
- Cost per agent (tokens × model cost)
- Agent workload (runs per day, queue depth)

**Platform tab:**
- Tutor approval funnel (applied → scored → auto-approved → HITL → approved/rejected)
- Commission payout trends (weekly totals, failed payouts)
- Platform health index (composite of error rates, DLQ, execution health)

### 3A-ii — Domain Intelligence Detail

**Referral Pipeline Bottleneck Analysis** (built into Admin Intelligence briefing):

```
REFERRAL PIPELINE ANALYSIS

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
  recommended action (nudge sequence, email, manual review) with confidence.
```

**Analytics Dashboard Mockup** (`/admin/conductor/analytics`):

```
┌──────────────────────────────────────────────────────────────────┐
│  /admin/conductor  [Canvas] [Agents] [Teams] [Monitoring] [Analytics]│
├──────────────────────────────────────────────────────────────────┤
│  ANALYTICS                                                        │
│  [Workflows] [Agents] [Platform]                                 │
│                                                                  │
│  WORKFLOWS TAB                                                   │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Executions this week │  │ Handler success rates            │  │
│  │ Tutor Approval:  12  │  │ tutor_approval_score: 98%        │  │
│  │ Commission:       8  │  │ stripe_payout: 99%               │  │
│  │ Booking (shadow): 34 │  │ send_notification: 95%           │  │
│  └──────────────────────┘  └──────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Tutor Approval Funnel                                    │    │
│  │ applied(48) → under_review(31) → auto-approved(18)       │    │
│  │               → HITL(13) → approved(11) / rejected(2)    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  AGENTS TAB                                                      │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Mkt Intel: 7 runs    │  │ Tool usage (this week)           │  │
│  │ avg 12s, 100% ok     │  │ query_booking_trends:  28 calls  │  │
│  │ Financial: 5 runs    │  │ query_at_risk_tutors:  14 calls  │  │
│  │ avg 8s, 100% ok      │  │ flag_for_review:        3 calls  │  │
│  └──────────────────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 3B — Real-Time Monitoring (15h)

WebSocket-based live monitoring at `/admin/conductor/monitoring`:

- **Active workflow executions**: Live node-by-node progress for all running workflows
- **Agent live status**: Active / Idle / Running (which tool) / Error for each deployed agent
- **Agent thoughts stream**: When an agent is running, stream its intermediate reasoning steps (from `getAIService().stream()` internal steps)
- **Exception queue live feed**: New HITL tasks appear in real-time without page refresh

### 3C — Platform Events Bus + Knowledge Pipelines (20h)

#### Platform Events Table

Foundation for cross-system analytics. **Uses a dedicated table, NOT an extension of `cas_agent_events`** (Design Decision D13 — `cas_agent_events` has schema, RLS, and retention designed for fine-grained CAS agent turn events; `platform_events` is coarser, cross-system, different retention requirements).

```sql
-- Migration 344: platform_events — dedicated cross-system event store
CREATE TABLE platform_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system text NOT NULL,    -- 'sage' | 'lexi' | 'growth' | 'workflow' | 'cas'
  event_type text NOT NULL,
  entity_id uuid,
  entity_type text,               -- 'user' | 'execution' | 'session' | 'organisation'
  payload jsonb,
  created_at timestamptz DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_platform_events_source ON platform_events(source_system);
CREATE INDEX idx_platform_events_type ON platform_events(event_type);
CREATE INDEX idx_platform_events_entity ON platform_events(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_platform_events_created ON platform_events(created_at DESC);
```

**Extended MessageTypes** (all systems emit these):

```typescript
// Workflow lifecycle
'workflow.started' | 'workflow.completed' | 'workflow.paused'
'workflow.resumed' | 'workflow.failed' | 'workflow.shadow_divergence'
'workflow.trigger_deduplicated'

// Growth / knowledge
'growth.audit_completed' | 'growth.action_taken' | 'growth.score_updated'
'discovery.scan_started' | 'discovery.scan_completed'

// Agent lifecycle
'agent.created' | 'agent.published' | 'agent.disabled'

// Admin intelligence
'admin.exception_raised' | 'admin.exception_resolved'
'admin.exception_claimed' | 'admin.exception_escalated'  // unclaimed > 48h
'admin.briefing_generated'

// Learning layer
'learning.outcome_recorded' | 'learning.tier_proposed' | 'learning.tier_adjusted'
```

#### Knowledge Pipelines (Async)

Both pipelines are **async** (fire-and-forget) — a failing embedding API must not block an admin config update. Both go through a `pipeline_jobs` queue processed by pg_cron:

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

pg_cron job `process-pipeline-jobs` runs every 2 minutes, picks up pending jobs, processes with retry (max 5 attempts, exponential backoff).

**Pipeline 1 — Discovery → Agent Knowledge:**

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
  4. Similarity check: cosine(new_embedding, existing) > 0.95? → SKIP
  5. Batch embed: all pending embeddings in one API call (not one per chunk)
        │
        ├──────────────────────────────────────────┐
        ▼                                          ▼
lexi_knowledge_chunks                  growth_knowledge_chunks
category='processes'                   (process-relevant subset)
```

**Pipeline 2 — Configurations → Agent Knowledge:**

```
Admin edits shared_fields in /admin/configurations/
        │
        ▼
updateSharedField() API call completes
INSERT INTO pipeline_jobs (pipeline_type='configurations-knowledge', ...)
        │  (admin UI is never blocked)
        ▼
pg_cron processes within 2 minutes
        │
        ▼
configurations-knowledge-pipeline.ts
  Format: field_name + contexts + all current options
  Embed → Upsert into lexi_knowledge_chunks (category='platform-config')

  Lexi + Growth know about new subjects/options within ~2 min of admin save
```

**Batched embedding** (both pipelines): Buffer all chunks needing embedding within a pipeline run, then call `gemini-embedding-001` once with the full array. Reduces API calls by 10–50x vs one call per chunk.

### 3C-ii — Platform Console Mockup

```
/admin/conductor  [Canvas] [Agents] [Teams] [Monitoring] [Analytics] [Console]

CONSOLE TAB — Platform Health
┌─────────────────────────────────────────────────────────────────────┐
│  PIPELINE STATUS                                                    │
│  Pipeline 1 (Discovery → Knowledge): last run 14 min ago  ✅ OK    │
│  Pipeline 2 (Config → Knowledge):    last run  2 min ago  ✅ OK    │
│  Jobs queued: 0   Jobs failed: 0                                    │
├─────────────────────────────────────────────────────────────────────┤
│  WEBHOOK & DLQ                                                      │
│  DLQ backlog: 0   Last retry: 2h ago (success)                      │
│  Webhook failures today: 0                                          │
├─────────────────────────────────────────────────────────────────────┤
│  AI COSTS (this month)                                              │
│  Admin Intelligence: £1.24                                          │
│  Sage sessions:     £8.40                                           │
│  Growth sessions:   £3.12                                           │
│  Knowledge pipelines: £0.18                                         │
│  Total: £12.94   [View breakdown]                                   │
├─────────────────────────────────────────────────────────────────────┤
│  EVENT STREAM (last 10 platform_events)                             │
│  13:45  workflow.completed  Tutor Approval [Harriet O.]             │
│  13:42  growth.score_updated  profile_id: xxx (72→74)               │
│  13:38  workflow.paused  Tutor Approval [pending HITL]              │
│  13:30  discovery.scan_completed  DevOps deploy scan (12 processes)  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3D — Admin Intelligence Agent (15h)

A specialist agent (`admin-intelligence`) with read-only tools across all operational tables.

**AI tier routing** — task classification before model selection (5–10x cost reduction vs flat frontier):

```typescript
// apps/web/src/lib/admin-intelligence/tier-router.ts
type TaskClass = 'rules' | 'cheap' | 'medium' | 'frontier'

function classifyAdminTask(task: AdminTask): TaskClass {
  if (task.type === 'threshold_check')       return 'rules'    // 0 AI cost
  if (task.type === 'signal_summary')        return 'cheap'    // Gemini Flash
  if (task.type === 'exception_recommendation') return 'medium' // Claude Sonnet
  if (task.type === 'daily_brief')           return 'frontier' // Grok 4 Fast (once/day max)
  return 'medium'
}
```

**Triggers**: Daily 8am (briefing) + event-driven (anomaly) + on-demand (admin query bar).
**Event batching**: max 1 analysis per domain per 15-minute window. Max 10 runs/hour cap.

**Daily briefing includes**: accuracy trend from `process_autonomy_config` — if any process has declining accuracy, it appears in the briefing with a proposed tier change.

**Domain Intelligence** — what the agent monitors:

| Domain | Anomaly signals | Action |
|--------|----------------|--------|
| Bookings | Cancellation rate +25% vs 7d avg, revenue forecast, velocity | Raise exception |
| Listings | Quality score distribution, pricing anomaly (>30% below market) | Flag for intervention |
| Referrals | Pipeline bottleneck position (signup → complete → booked) | Supervised sequence |
| Organisations | Dormancy (60d), B2B pipeline value, high-LTV churn risk | HITL escalation |
| Financials | Payout anomaly (3σ), dispute patterns, commission gaps | Exception |

**Daily briefing format** (generated at 8am by Admin Intelligence Agent):

```
ADMIN DAILY BRIEF — Thursday 5 March 2026

  Platform Status: NORMAL
  ─────────────────────────────────────────────────────

  EXCEPTIONS (3 pending)
  • Borderline tutor application (CaaS: 54/100) — awaiting 2h
  • Commission reconciliation gap (£23) — awaiting 4h
  • Org churn risk: Oakwood Learning (90d dormant) — unclaimed

  AUTONOMOUS ACTIVITY (last 24h)
  • 8 tutor applications auto-approved (CaaS > 70) — 100% accuracy 30d
  • 3 commission payouts processed (£1,240 total)
  • 47 proactive nudges sent (22% avg engagement rate)

  DOMAIN SIGNALS
  Bookings: +8% vs 7d avg  ✅ Normal
  Referrals: ghost signup rate 68% → nudge pipeline active
  Organisations: Alpha Tutors score dropped 15pts → re-engagement queued
  Financials: all payouts nominal — 0 anomalies

  AUTONOMY CALIBRATION
  • tutor-approval: 97.2% accuracy — above 90% threshold (✅ scope stable)
  • stuck-referral-nudge: 8.1% conversion — below 15% threshold
    → Recommended: redesign message. [View 14-day trend]

  AI COST TODAY: £0.42  (forecast month: £12.50)
```

**Lexi admin mode**: Lexi operates in two modes — User Mode (current) and Admin Mode (new, activated by `is_admin()`). Admin Mode tools: `read_bookings_aggregate()`, `read_referral_pipeline()`, `read_org_health()`, `get_hitl_queue()`, `approve_task()`, `list_approvals()`, `get_divergences()`.

**AI Cost Attribution** — every AI call writes to `platform_ai_costs`:

```sql
CREATE TABLE platform_ai_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system text NOT NULL,        -- 'admin-intelligence' | 'pipeline-1' | 'growth' | 'sage'
  operation_type text NOT NULL,       -- 'briefing' | 'anomaly' | 'embedding' | 'query'
  model text NOT NULL,
  tokens_in integer,
  tokens_out integer,
  estimated_cost_gbp numeric(10, 6),
  execution_id uuid,
  created_at timestamptz DEFAULT now()
);
```

Platform Console shows: monthly AI spend by source, cost per workflow execution, cost per autonomous decision, provider comparison.

**AI cost model** (provider prices as constants in `platform_ai_costs`):

```typescript
const COST_PER_1K_TOKENS_GBP = {
  'grok-4-fast':        { in: 0.008,   out: 0.024  },   // frontier — daily brief only
  'gemini-2.0-flash':   { in: 0.00006, out: 0.00024 },   // cheap — summaries, embeddings
  'claude-sonnet-4-6':  { in: 0.0024,  out: 0.012  },   // medium — exception recommendations
  'deepseek-r1':        { in: 0.0004,  out: 0.0016  },   // cheap alternative
  'gpt-4o':             { in: 0.004,   out: 0.016   },
  'rules-based':        { in: 0,       out: 0        },   // threshold checks — 0 cost
}

// Estimated cost per operation at scale:
// Admin daily brief (frontier, 1/day):       ~£0.08/day
// Exception recommendation (medium, 5/day):  ~£0.06/day
// Knowledge pipeline embeddings (cheap):     ~£0.02/day
// Threshold checks (rules):                  £0.00
// Total estimated: ~£0.20–0.40/day = £6–12/month
```

**Growth campaigns** (Phase 3 addition to Conductor-managed workflows):

```
CONDUCTOR GROWTH CAMPAIGNS (Supervised tier)

  30-DAY REFERRAL SPRINT
  Trigger: Admin starts campaign for a tutor segment (e.g. tutors with score > 70)
  Steps:
    Week 1: "Referral programme" in-app notification + email with personal link
    Week 2: "You've had X clicks" progress notification
    Week 3: "Your referral network" map (if any signups)
    Week 4: "Wrap up" — results summary + next campaign suggestion
  All sends supervised: admin sees preview, approves/edits, campaign fires.

  DELEGATION SETUP WIZARD (for active agents)
  Trigger: Agent with > 5 active tutors + no delegation configured
  Steps:
    In-app prompt "Set up delegation for your team"
    Guided wizard: select tutors → configure payout split → confirm
    Workflows executes delegation setup via Supabase update
```

### 3E — Growth Scores (migration 345) (10h)

Growth Score (0–100) for all 4 roles computed daily by pg_cron. Formula (tutors):

```
GROWTH SCORE FORMULA (tutors)

  Growth Score = profile_completeness + listing_performance
               + earnings_trajectory + platform_engagement

  profile_completeness  (0–25):
    profile_photo: 0 or 6  │  bio_length >= 200: 0 or 5
    subjects >= 2: 0 or 5  │  qualifications: 0 or 5
    response_time_set: 0 or 4

  listing_performance   (0–25):
    views_last_14d >= 10: 0 or 8  (>= 50: +4 stacked)
    booking_conversion > 5%: 0 or 8  (> 15%: +5 stacked)

  earnings_trajectory   (0–25):
    bookings_last_30d > 0: 0 or 5
    bookings_30d >= bookings_prev_30d: 0 or 10  (+5 if >10% growth)
    active_stripe: 0 or 5

  platform_engagement   (0–25):
    response_rate >= 80%: 0 or 8  │  review_rate >= 60%: 0 or 7
    referral_sent_14d: 0 or 5     │  lesson_rebooked > 50%: 0 or 5

Thresholds:
  < 40:  Growth Advisor flags for intervention
  < 70:  Below CaaS featured threshold
  Drop > 5pts in 7d: triggers proactive nudge
```

Non-tutor roles (migration 345 `role_type` column):
- **Client**: weighted toward referral activity + booking frequency
- **Agent**: weighted toward active tutor count + referral conversion rate
- **Organisation**: aggregate of member Growth Scores + org-level booking volume

Shadow mode for 30 days before Growth Advisor acts on non-tutor scores.

Growth Score (0–100) for all 4 roles computed daily by pg_cron. Component scores stored in `component_scores jsonb`. Displayed in admin analytics and user dashboards.

### 3F — Feature Intelligence Layer (migrations 355–365, ~253h)

One platform metrics table + one pg_cron compute function per feature. Each feeds three outputs: Specialist Agent tool, Admin UI panel, Conductor workflow trigger.

Two Conductor use cases: **GTM Lifecycle** (stages 1–6 + Signal + CaaS + VirtualSpace) and **Referral Lifecycle** (parallel track). See [`gtm-intelligence-spec.md`](./gtm-intelligence-spec.md) for the full architecture.

**Implementation sequence** (GTM pipeline order):

| Step | Feature | Spec | Migration | pg_cron | Agent Tool | Admin Panel |
|------|---------|------|-----------|---------|-----------|-------------|
| 1 | Resources | [spec](./resources-intelligence-spec.md) | 356 | 04:30 | `query_resources_health` | `/admin/resources` intelligence panel |
| 2 | SEO | [spec](./seo-intelligence-spec.md) | 357 | 05:00 | `query_seo_health` | `/admin/seo` signal tab |
| 3 | Signal | [spec](./signal-intelligence-spec.md) | 358 | — | `query_content_attribution` | `/admin/signal` enhancements |
| 4 | Marketplace | [spec](./marketplace-intelligence-spec.md) | 359 | 06:00 | `query_marketplace_health` | `/admin/signal` Marketplace tab |
| 5 | Bookings | [spec](./bookings-intelligence-spec.md) | 360 | 06:30 | `query_booking_health` | `/admin/bookings` intelligence panel |
| 6 | Listings | [spec](./listings-intelligence-spec.md) | 361 | 07:00 | `query_listing_health` | `/admin/listings` intelligence panel |
| 7 | Financials | [spec](./financials-intelligence-spec.md) | 362 | 07:30 | `query_financial_health` | `/admin/financials` intelligence panel |
| 8 | VirtualSpace | [spec](./virtualspace-intelligence-spec.md) | 363 | 08:00 | `query_virtualspace_health` | `/admin/virtualspace` panel |
| 9 | CaaS | [spec](./caas-intelligence-spec.md) | 355 | 05:30 | `query_caas_health` | `/admin/signal` CaaS tab |
| 10 | Referral | [spec](./referral-intelligence-spec.md) | 364–365 | 09:00 | `query_referral_funnel` | `/admin/signal` Referral tab + `/admin/network/` |

**Shared architectural pattern** (applies to all 10):

```
1. Migration creates `{feature}_platform_metrics_daily` table
2. pg_cron runs `compute_{feature}_platform_metrics()` daily
3. Specialist Agent tool reads live DB + daily table (trend data)
4. Alert triggers fire when thresholds exceeded → flag_exception()
5. Admin UI panel at existing admin route extended with Intelligence section
6. Conductor workflow triggered (if severity=critical) with HITL gate
```

**Total per-feature budget**:
- Resources: 18h · SEO: 20h · Signal: 27h · Marketplace: 24h · Bookings: 22h
- Listings: 20h · Financials: 20h · VirtualSpace: 14h · Referral: 24h · CaaS: 30h
- **Total: 219h across 10 features**

### Detailed Phase 3 Task Table

| Task | Hours | Notes |
|------|-------|-------|
| Redis infrastructure setup (Upstash — serverless Redis) | 2 | Required for PlatformUserContext (5-min cache) and admin query caching (1h TTL). Add `REDIS_URL` to `.env.local`. Upstash free tier sufficient for Phase 3 volumes. |
| `platform_events` table + partitioning + indexes (migration 344) | 3 | Dedicated table. NOT cas_agent_events. Partition by month. Initial partitions created in migration DDL. |
| Update sage-bridge.ts + lexi-bridge.ts → platform_events | 2 | Existing bridges updated to new table. |
| `pipeline_jobs` table + pg_cron `process-pipeline-jobs` (every 2 min) | 3 | Retry up to 5 attempts, exponential backoff. |
| Pipeline 1: `discovery-knowledge-pipeline.ts` | 8 | Async. Delta-sync (hash). Batch embed. Semantic dedup (cosine > 0.95 → skip). Lexi + Growth chunks. |
| Pipeline 2: `configurations-knowledge-pipeline.ts` | 4 | Async. Config change → Lexi chunks updated within 2 min. |
| `growth_knowledge_chunks` table + Growth Advisor RAG retrieval | 3 | Same schema as `lexi_knowledge_chunks`. Growth Advisor RAG reads it. |
| Admin Intelligence Agent (`admin-intelligence`) | 15 | Specialist agent. Briefing + anomaly + on-demand. Reads all operational tables. |
| AI tier router (`classifyAdminTask`) | 3 | Rules / cheap / medium / frontier. 5–10x cost reduction. |
| Admin Intelligence rate limiting + event batching | 3 | Max 1 analysis/domain/15 min. Max 10 runs/hour. |
| `platform_ai_costs` table + write on every Conductor AI call | 3 | Cost tracking per source_system. |
| Admin Intelligence: weekly tier calibration proposals | 4 | Reads `process_autonomy_config`. Proposes tier changes. Admin approves. |
| Exception escalation: 48h unclaimed → email admin | 2 | Resend email. `escalated_at` set. |
| Lexi admin mode | 5 | `is_admin()` check. Admin-scoped tools + system prompt. |
| Admin query bar on Operations | 3 | Entry point → Lexi admin mode. |
| Admin query caching (Redis, 1h TTL) | 3 | Common queries cached. Key: intent hash + date bucket. |
| Real-time monitoring WebSocket | 8 | Live node-by-node progress. Agent status stream. Exception queue live feed. |
| Analytics dashboard (3 tabs: Workflows / Agents / Platform) | 10 | Charts, funnels, tool usage, cost per agent. |
| Platform Console (pipeline status, DLQ, AI cost, event stream) | 7 | Health grid. Last sync times. Cost dashboard. |
| In-app notification UI (bell + feed + Supabase Realtime) | 6 | `notifications` table. Realtime subscription. Nudge delivery. |
| Growth Score migration 345 + daily pg_cron | 5 | `growth_scores` table with `role_type` + `component_scores`. |
| **Total** | **102h** | |

---

## Phase 4 — Knowledge & Intent
**Goal**: Agents know the platform and can be triggered by natural language.
**Estimate**: 60–70h
**Dependency**: Phase 3

### 4A — Platform Knowledge Base (15h)

Replaces hardcoded agent prompts with a queryable knowledge base:
- `platform_knowledge_chunks` table (pgvector, same pattern as `sage_knowledge_chunks`)
- Knowledge sourced from: workflow process definitions, handler documentation, platform policy docs
- Agents query knowledge base at runtime to augment their system prompt
- Admin can add/update knowledge chunks from UI

### 4B — Intent Detection (15h)

Natural language → the right agent or workflow. Admin types "show me at-risk tutors this week" → routes to Operations Monitor agent. Types "run commission payout now" → triggers Commission Payout workflow.

Equivalent to Fuschia's `intent_agent.py` (DSPy-based), built using `getAIService().generateJSON()`:

```typescript
interface IntentResult {
  intent: 'query_agent' | 'trigger_workflow' | 'view_analytics' | 'general';
  target_agent_slug?: string;
  target_process_id?: string;
  prompt?: string;
  confidence: number;
}
```

**Intent Detection Flow:**

```
INTENT DETECTION FLOW

  Admin types in Operations query bar:
  "show me at-risk tutors this week"
          │
          ▼
  IntentDetector.classify(input)
  ┌─────────────────────────────────────────────┐
  │  Input → getAIService().generateJSON()      │
  │  System: "Classify this admin query into    │
  │  one of: query_agent / trigger_workflow /   │
  │  view_analytics / general"                  │
  │  Returns: IntentResult with target + conf.  │
  └─────────────────────────────────────────────┘
          │
          ├── intent='query_agent', target='operations-monitor'
          │       → Open agent chat, inject prompt
          │       → getAIService().stream() with agent config
          │
          ├── intent='trigger_workflow', target='commission-payout'
          │       → Show confirmation: "Run Commission Payout now?"
          │       → Admin confirms → POST execute/start
          │
          ├── intent='view_analytics'
          │       → Navigate to /admin/workflow/analytics
          │       → Pre-filter to relevant tab
          │
          └── intent='general', confidence < 0.7
                  → Route to Lexi admin mode
                  → Lexi answers with operational tools
```

Intent routing is integrated into the Operations query bar (Phase 3). Phase 4 upgrades the classifier from simple keyword → `getAIService().generateJSON()` for semantic intent detection with confidence scoring.

Chat input on the unified `/admin/workflow` dashboard routes through intent detection first.

### 4C — PlatformUserContext (10h)

Shared context snapshot across all agents — so agents always know a user's current platform state without being re-briefed:

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

  // Platform signals (surfaced proactively)
  signals: {
    listing_last_view_days_ago: number | null
    unread_messages: number
    incomplete_profile_fields: string[]
    last_review_days_ago: number | null
    caas_below_threshold: boolean   // < 70
  }
}
// GET /api/platform/user-context/[profile_id]
// 5-minute Redis cache
// Injected as a structured block in the system prompt of every conversational agent
```

**How it works**:
1. Fetched server-side at session start for any conversational agent (Lexi, Sage, Growth)
2. Injected as a structured block in the system prompt — agent can reference platform state without tool calls
3. Published to `platform_events` as `session.context_loaded`
4. Redis-cached per user for 5 minutes

**Cross-agent handoff**:

```
CROSS-AGENT EXPERIENCE WITH PlatformUserContext

  WITHOUT:                        WITH:
  ─────────────────               ──────────────────────────────────
  User opens Lexi                 User opens Lexi
  Lexi starts fresh               Lexi loads PlatformUserContext:
                                    caas_score: 62 (below 70 threshold)
                                    unread_messages: 3
                                    listing_last_view_days_ago: 18
                                    last_growth_topic: 'listing optimisation'

  User: "Why no bookings?"        User: "Why no bookings?"

  Lexi: "Here are some general    Lexi: "I can see a few things right now:
  tips for getting bookings..."     - Listing not seen in 18 days
                                    - CaaS score 62 (below 70 featured threshold)
                                    - 3 unread messages from potential clients
                                    Your Growth session last week covered listing
                                    optimisation — shall I hand you to Growth?"

  User clicks Growth              User clicks Growth
  Growth starts fresh             Growth receives handoff context:
  "Hello! How can I help?"          { topic: 'listing optimisation',
                                      from: 'lexi', caas_score: 62 }
                                  "Continuing from where we left off —
                                    let's look at your listing. CaaS score 62
                                    and no views in 18 days. Here's what to
                                    change first..."
```

**Implementation**: `sessionStorage` handoff (pattern partially exists for Sage→Lexi). Extended to all agent pairs. Context encoded by the handing-off agent before redirect. Receiving agent reads on mount.

### 4C-ii — Network Intelligence Page (Phase 4)

```
/admin/network/  — Network Intelligence

  ┌──────────────────────────────────────────────────────────────────┐
  │  Network Health          [Last 30 days]                          │
  │  ─────────────────────────────────────────────────────────────   │
  │  Referral graph depth: avg 1.8 hops                              │
  │  Referral velocity: +12% this month vs last                      │
  │  Ghost signup rate: 68% (national 65% benchmark)                 │
  │  Delegation adoption: 23% of orgs have delegated                 │
  └──────────────────────────────────────────────────────────────────┘

  [Network Health] [Organisation] [Attribution]

  ORGANISATION TAB
  ┌─────────────────────────────────────────────────────────────────┐
  │  Org Health Ranking (top 10)                                    │
  │  1. Oakwood Learning   Score: 82  Active: 12 tutors  ✅ Healthy │
  │  2. Bright Futures     Score: 74  Active:  8 tutors  ✅ Healthy │
  │  3. Alpha Tutors       Score: 41  Active:  3 tutors  ⚠ At-risk  │
  │  ...                                                            │
  │                                                                 │
  │  Dormancy Pipeline: 3 orgs entering 60d dormancy this week      │
  │  [Start Re-engagement Workflow] for each                        │
  └─────────────────────────────────────────────────────────────────┘

  ATTRIBUTION TAB
  ┌─────────────────────────────────────────────────────────────────┐
  │  Top Referrers by Lifetime Value (not volume)                   │
  │  1. Jessica M. (agent)  £14,200 attributed LTV   52 referrals   │
  │  2. David K. (tutor)    £8,400 attributed LTV    31 referrals   │
  │  3. Oakwood Learning    £6,100 attributed LTV    18 org members │
  │  [Export CSV]                                                   │
  └─────────────────────────────────────────────────────────────────┘
```

### 4D — Learning Loop Architecture (10h)

```
LEARNING LOOP

  Autonomous Decision Made
  (tutor approved, commission paid, nudge sent)
          │
          ▼
  workflow_executions.decision_rationale (jsonb)
  Records: signals used, confidence score, tier at time of decision
          │
          ▼                     (14/30/60/90 day lag via pg_cron)
  decision_outcomes
  ┌──────────────────────────────────────────────────────────┐
  │  execution_id │ outcome_metric      │ outcome_value │lag │
  │  uuid         │ 'dispute_raised'    │ 0 (none)      │ 30 │
  │  uuid         │ 'booking_made'      │ 1 (yes)       │ 30 │
  │  uuid         │ 'nudge_converted'   │ 0.34 (rate)   │ 14 │
  └──────────────────────────────────────────────────────────┘
          │
          ▼
  Admin Intelligence Agent reads weekly → updates process_autonomy_config:
  ┌──────────────────────────────────────────────────────────┐
  │  tutor-approval: 97.2% (threshold 90%) → propose expand │
  │  commission-payout: 99.8% (threshold 95%) → hold        │
  │  stuck-referral-nudge: 8% conversion → flag for redesign│
  └──────────────────────────────────────────────────────────┘
          │
          ├── Accuracy > threshold + 10% for 30d?
          │       → Propose expanding scope (admin approves)
          │
          ├── Accuracy < threshold for 14d?
          │       → Auto-escalate to Supervised immediately
          │       → Alert admin with trend chart
          │
          └── Conversion < 5% for 4 weeks?
                  → Suppress sequence, flag for redesign
```

**Outcome measurement pg_cron jobs** (new):
```
measure-tutor-approval-outcomes   — every Monday: check tutor approved 30d ago, count disputes
measure-payout-outcomes           — every Friday: check payout sent 7d ago, verify correct
measure-nudge-outcomes            — every 3 days: check nudge sent 14d ago, converted?
```

**Decision rationale**: `workflow_executions` gains a `decision_rationale jsonb` column capturing the specific signals that triggered the autonomous decision — the audit trail that makes learning possible and enables admins to review past decisions.

### Detailed Phase 4 Task Table

| Task | Hours | Notes |
|------|-------|-------|
| `platform_knowledge_chunks` table (pgvector, migration 351) | 2 | Same schema as `sage_knowledge_chunks`. category: workflow_process, handler_doc, policy. |
| Knowledge base admin UI | 5 | Add/edit/delete knowledge chunks. Preview RAG retrieval. Source tagging. |
| Agents query knowledge base at runtime | 5 | Agents use `getAIService()` with context from platform_knowledge_chunks to augment system prompt. |
| Intent Detection (`IntentDetector.classify()`) | 8 | `getAIService().generateJSON<IntentResult>()`. Confidence-based routing: agent / workflow / analytics / general. |
| Intent routing in Operations query bar | 5 | Routes to agent chat, workflow trigger, analytics nav, or Lexi fallback based on intent result. |
| `PlatformUserContext` API + server-side fetch | 6 | `GET /api/platform/user-context/[profile_id]`. 5-min Redis cache. Full schema with financials, bookings, agent state, signals. |
| PlatformUserContext injected into all conversational agents | 4 | Sage, Lexi, Growth receive context at session start. No tool calls needed for basic platform state. |
| Cross-agent handoff (sessionStorage encoding) | 3 | Handing-off agent encodes context. Receiving agent reads on mount and pre-populates system prompt. |
| `decision_outcomes` table + workflow bridge writes stubs | 3 | Every workflow completion writes an outcome stub. pg_cron fills values at lag intervals. |
| `process_autonomy_config` table + accuracy tracking | 3 | Per-process tier config. Rolling accuracy. Threshold. |
| Outcome measurement pg_cron jobs (3 jobs) | 4 | `measure-tutor-approval-outcomes`, `measure-payout-outcomes`, `measure-nudge-outcomes`. |
| Admin Intelligence: weekly tier calibration proposals | 4 | Reads accuracy trends. Proposes scope expansions (admin approves) or auto-downgrades. |
| Tier calibration UI (admin approves AI proposals) | 4 | Admin sees: "tutor-approval is 97.2% accurate — expand scope?" with approve/reject. |
| Network Intelligence page (`/admin/network/`) | 9 | Referral graph depth, velocity, ghost signup rate. Org health ranking. Top referrers by LTV. |
| `decision_rationale jsonb` column on `workflow_executions` | 2 | Captures signals + confidence at decision time. Audit trail + learning foundation. |
| **Total** | **67h** | |

---

## Phase 5 — Process Mining Enhancement
**Goal**: Discover and analyse processes systematically, not just reactively.
**Estimate**: 25–35h
**Dependency**: Phase 3

**Keep what Tutorwise already has** (ahead of Fuschia):
- 4-phase discovery scanner (6 source types, AI analysis, streaming, canvas import)
- Confidence scoring
- Source-type-aware prompts

**Add what Fuschia proposes and we don't have:**
- **Conformance checking**: Compare actual `workflow_executions` against the defined process graph. Flag deviations (nodes skipped, unexpected paths).
- **Process mining analytics**: Which paths are most common? Where do failures cluster? What's the avg cycle time per node?
- **Pattern detection**: Identify recurring exception patterns (e.g. "65% of tutor rejections happen when CaaS score is between 60-70 and account is < 7 days old").
- **Value Stream Designer**: Map end-to-end value delivery with bottleneck identification. Canvas showing which steps consume the most time.
- **Shadow monitoring dashboard**: Side-by-side comparison of shadow vs live execution for Booking Lifecycle processes. Divergence rate, deviation types, go-live readiness checklist.

### Conformance Checking Flow

```
CONFORMANCE CHECKING

  Defined process graph (Workflows):
  trigger → action → condition → [yes] approval → end
                              → [no]  end

  Actual execution paths (workflow_executions + workflow_tasks):
  ┌─────────────────────────────────────────────────────────┐
  │  Execution A: trigger → action → condition → approval → end  ✅ Conformant │
  │  Execution B: trigger → action → end                         ❌ Skipped condition │
  │  Execution C: trigger → action → condition → approval        ⏸ Stuck (no end) │
  └─────────────────────────────────────────────────────────┘

  Report shows:
  - Conformance rate: 94% (47/50 executions fully conformant)
  - Most common deviation: "condition node skipped" (3 cases)
  - Root cause: webhook fired with incomplete payload → handler returned early
```

### Detailed Phase 5 Task Table

| Task | Hours | Notes |
|------|-------|-------|
| Conformance checking engine | 6 | Compare `workflow_tasks` path against process graph nodes/edges. Flag deviations per execution. |
| Conformance report UI | 4 | Per-process conformance rate. Deviation list with root cause AI analysis. |
| Process mining analytics | 6 | Most common paths (Sankey or flow diagram), avg cycle time per node, failure cluster detection. |
| Pattern detection (AI-powered) | 5 | AI analyses exception queue + decision_outcomes to surface recurring patterns. "65% of rejections..." |
| Shadow monitoring dashboard | 6 | Side-by-side: shadow vs live for Booking Lifecycle. Divergence rate. Go-live readiness checklist. |
| Value Stream tab in Workflows | 5 | Simple canvas: drag value steps, system auto-calculates avg cycle time from workflow_tasks. Bottleneck highlight. |
| Process mining analytics embedding into Admin Intelligence briefing | 3 | Weekly pattern summary included in Admin Intelligence daily brief. |
| **Total** | **35h** | |

### Process Mining Analytics Dashboard

```
PROCESS MINING — ANALYTICS TAB (Phase 5)
/admin/conductor/workflows/[id]/analytics

┌─────────────────────────────────────────────────────────────────────────────┐
│  Tutor Approval — Process Analytics                         Last 90 days    │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ SUMMARY       │  EXECUTION PATHS (Sankey)                                   │
│               │                                                             │
│ 234 runs      │  trigger ──(234)──► validate ──(228)──► review ──(201)──► approve │
│ 94% complete  │                                │              └──(27)───► reject │
│ 6% abandoned  │                              (6)                                  │
│               │                            abandon                                │
│ Avg cycle:    │                                                             │
│ 3.2 days      │  Most frequent path: validate→review→approve (86%)         │
│               │  Second path: validate→review→reject (12%)                 │
│ Fastest:      │  Abandoned path: validate→abandon (3%)                     │
│ 18 hours      │                                                             │
│ Slowest:      ├─────────────────────────────────────────────────────────────┤
│ 11 days       │  CYCLE TIME PER NODE                                        │
│               │                                                             │
├───────────────┤  trigger    ████ 0.1h avg                                   │
│ PATTERNS      │  validate   ███████████ 2.8h avg                            │
│               │  review     █████████████████████████ 62h avg (bottleneck)  │
│ ⚠ 65% of      │  approve    ██ 0.5h avg                                     │
│ rejections    │  reject     ██ 0.5h avg                                     │
│ when CaaS     │                                                             │
│ 60-70 AND     ├─────────────────────────────────────────────────────────────┤
│ age < 7 days  │  CONFORMANCE                                                │
│               │                                                             │
│ Pattern found │  ✅ Conformant:     220/234 (94%)                            │
│ by AI agent   │  ❌ Deviated:        11/234 (5%)                             │
│ 2026-03-01    │  ⏸ Stuck (>7d):      3/234 (1%)                             │
│               │                                                             │
│ [View Detail] │  Most common deviation: "review node skipped" (8 cases)     │
│               │  [View all deviations →]                                    │
└───────────────┴─────────────────────────────────────────────────────────────┘
```

### Shadow vs Live Monitoring Dashboard

```
SHADOW MONITORING — BOOKING LIFECYCLE (Human Tutor)
/admin/conductor/workflows/[id]/shadow

┌─────────────────────────────────────────────────────────────────────────────┐
│  Shadow vs Live — Last 30 days               Go-live Readiness: 78%  ⚠️    │
├─────────────────────────────────┬───────────────────────────────────────────┤
│  LIVE EXECUTIONS (prod path)    │  SHADOW EXECUTIONS (parallel)             │
│                                 │                                           │
│  47 runs                        │  47 runs (same triggers)                  │
│  42 completed (89%)             │  45 completed (96%)                       │
│  5 human-intervened (11%)       │  2 would-have-intervened (4%)             │
│                                 │                                           │
│  Avg duration: 4.1 days         │  Avg duration: 3.8 days (faster)         │
│                                 │                                           │
├─────────────────────────────────┴───────────────────────────────────────────┤
│  DIVERGENCE ANALYSIS                                        Rate: 6%        │
│                                                                             │
│  3 divergent executions found:                                              │
│  ├─ Execution #B7F2: Live → human-approve, Shadow → auto-approve            │
│  │   Reason: Live admin has lower confidence threshold (70%) than           │
│  │           shadow config (85%). Signal: CaaS 78, booking value £450.      │
│  ├─ Execution #C1A3: Live → rejected, Shadow → approved with condition      │
│  │   Reason: New identity verification rule not yet in live config          │
│  └─ Execution #D9E4: Both → approved, different path (extra validation)     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  GO-LIVE CHECKLIST                                                          │
│                                                                             │
│  ✅ Divergence rate < 10% (currently 6%)                                    │
│  ✅ 30 days shadow running (38 days)                                        │
│  ⚠️  All divergences reviewed and approved by admin (1 pending review)      │
│  ❌ Admin Intelligence weekly calibration approved (not yet run)             │
│  ✅ Rollback procedure documented                                            │
│                                                                             │
│  [Promote to Live →]  (disabled until all checklist items green)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 5B — Build Canvas (Build Tab + Agent Registry)
**Goal**: A unified editable organisational canvas where admins can visually compose the Digital Workforce — seeing all Spaces, drilling into Teams, placing Agents, and editing properties in a right-side form — without writing code.
**Status**: ✅ Complete (2026-03-11)
**Dependency**: Phase 2 (Agents + Teams + Spaces live)

> **Architecture context**: See [`AI-Digital-Workforce-Blueprint.md`](./AI-Digital-Workforce-Blueprint.md) for the full iPOM/DevOps conceptual framework that this feature implements. The Build Canvas is the Helm/Docker Compose equivalent — a declarative visual editor for agent topologies.

### iPOM Vocabulary (formalised in v4.0)

| Term | Definition |
|---|---|
| **Agent Registry** | The trio of Agents + Teams + Spaces — the authoritative catalogue of what agents exist, how they are grouped, and what domain owns them. Equivalent to a container registry (ECR/Docker Registry). |
| **Digital Workforce** | The collective noun for all AI agents operating on the platform. Defined in the Registry, composed in the Build Canvas, scheduled by Conductor, delivered to users via Sage/Marketplace. |
| **Digital Force** | External/brand-facing term for the same concept — the deployable force of AI workers offered to enterprises. |
| **Space** | Department/domain boundary (K8s namespace equivalent). Built-in: go-to-market, engineering, operations, analytics, marketing. |
| **Team** | Co-located group of agents with a shared coordination pattern (Pod equivalent). Patterns: Supervisor / Pipeline / Swarm. |
| **Agent** | Atomic unit of capability (container image equivalent). Defined once, instantiated many times across runs. |
| **Build Canvas** | Visual drag-and-drop editor for composing agent topologies (Helm/Compose equivalent). 3-level drill-down: All Spaces → Space → Team. |

### Three-Level Hierarchy

```
Level 0  — All Spaces   (space nodes on canvas, click to drill in)
Level 1  — Space        (team nodes within a space, click to drill in)
Level 2  — Team         (agent nodes within a team, drag from left palette)

Breadcrumb: [All Spaces] > [Engineering] > [DevOps Team]
```

### New Files

| File | Purpose |
|---|---|
| `components/feature/conductor/BuildCanvas.tsx` | Main 3-panel canvas — left palette + ReactFlow center + right properties drawer. Toolbar with breadcrumb, save, fit-view. Level-appropriate nodes + drag-to-canvas. |
| `components/feature/conductor/BuildPalette.tsx` | Left panel — agents grouped by department (dynamic from `agent.department`). Drag handle. `DEPARTMENT_COLORS` map (16 departments). `KNOWN_DEPARTMENTS` exported for dropdowns. New Agent inline form. |
| `components/feature/conductor/BuildPropertiesDrawer.tsx` | Right panel — edit form for selected node (space/team/agent). Saves via existing PATCH/PUT APIs. No new routes. |
| `components/feature/conductor/build-store.ts` | Zustand store — `level` (0/1/2), `spaceId/spaceName`, `teamId/teamName`, `selectedNodeId/Type`, `isDirty`. Actions: `drillToSpace`, `drillToTeam`, `drillUp`, `selectNode`, `setDirty`. |
| `components/feature/conductor/BuildCanvas.module.css` | Layout: `.wrapper`, `.leftPanel`, `.canvasArea`, `.rightPanel`, `.toolbar`, `.breadcrumb`, `.backButton` (matches WorkflowCanvas teal style), `.palette`, `.paletteGroup`, `.paletteAgent`. |

### Modified Files

- `discovery-store.ts` — `DiscoveryTab` type extended with `'build'`
- `conductor/page.tsx` — `'build'` tab added to TABS + Stage 2 Build; dynamic import for BuildCanvas

### Conductor Tab Structure (v5.0 — 14 tabs, 4 stages)

```
Stage 1 — Design:   [Workflows]  [Discovery]
Stage 2 — Build:    [Build]  [Agents]  [Teams]  [Spaces]  [Knowledge]  [Integrations]
Stage 3 — Execute:  [Execution]  [Simulation]  [Eval]
Stage 4 — Observe:  [Monitoring]  [Intelligence]  [Mining]
```

**New in v5.0:**
- `Integrations` tab — MCPPanel (MCP server connections, tool catalog, execution audit log) — Phase 8
- `Simulation` tab — SimulationPanel (scenario runner for team/agent testing)
- `Eval` tab — EvalPanel (agent evaluation and benchmarking)

### APIs Used (all existing — no new routes for Build Canvas)

| Action | Route |
|---|---|
| List spaces | `GET /api/admin/spaces` |
| Update space | `PATCH /api/admin/spaces/{id}` |
| List teams | `GET /api/admin/teams` |
| Update team topology | `PUT /api/admin/teams/{id}` |
| List agents | `GET /api/admin/agents` |
| Update agent | `PUT /api/admin/agents/{id}` |

### Migration 382 — Activate Scheduled Agents + Marketing Space

```sql
-- INSERT (not UPDATE) because agents were not in DB despite migration 350 spec
INSERT INTO specialist_agents (slug, name, role, department, description, status, built_in, config)
VALUES
  ('market-intelligence', 'Market Intelligence', ..., 'Marketing', ..., 'active', true, '{...}'),
  ('retention-monitor',   'Retention Monitor',   ..., 'Analytics', ..., 'active', true, '{...}'),
  ('operations-monitor',  'Operations Monitor',  ..., 'Operations', ..., 'active', true, '{...}')
ON CONFLICT (slug) DO UPDATE SET status = 'active';

INSERT INTO agent_spaces (slug, name, description, color, built_in)
VALUES ('marketing', 'Marketing', 'Brand, content, SEO, campaigns', '#ec4899', true)
ON CONFLICT (slug) DO NOTHING;
```

### Key Implementation Notes

- **Empty state panels rendered INSIDE ReactFlow** — `<Panel>` components only render when ReactFlow has non-zero dimensions. Empty states as external divs with `height:100%` collapsed ReactFlow to zero. Fixed by using `<Panel position="top-center">` overlays.
- **Back button CSS** — must use `--color-primary` (#006C67 teal) border/text, hover inverts. Pattern inherited from WorkflowCanvas.module.css.
- **Department groupings are dynamic** — `BuildPalette` groups agents by `agent.department` via `reduce()`. Only the `DEPARTMENT_COLORS` map is predefined (16 departments). Adding a new department field on an agent automatically creates a new group.
- **TeamRuntime v2 (Phase 6A — COMPLETE)** — Rewritten as a proper LangGraph StateGraph with PostgresSaver checkpointing, CircuitBreaker protection, and HITL interrupt()/resume() support. All team runs are now checkpointed, visible in Conductor Monitoring, and participate in the autonomy governance system via `decision_outcomes` stubs.

---

## Phase 6 — Unified Execution Substrate (TeamRuntime v2 + CAS Decommission)
**Goal**: Unify all three parallel execution engines under a single LangGraph + PostgresSaver substrate. Migrate the DevOps Team to a correct implementation of the original spec. Retire the CAS runtime and `/admin/cas` dashboard.
**Status**: ✅ **COMPLETE** (2026-03-11) — All 5 sub-phases delivered. Migrations 383–385 applied.
**Estimate**: ~58h across 5 sub-phases
**Dependency**: Phase 5 complete (conformance + monitoring live)

---

### Why Phase 6 — The Architectural Problem (Resolved)

> **This section describes the problem that existed before Phase 6. All issues are now resolved.**

The platform previously had **three parallel execution engines**, built at different times:

| Engine | Location | Pattern | Checkpointing | CircuitBreaker | Status (v5.0) |
|--------|----------|---------|---------------|---------------|---------------|
| `PlatformWorkflowRuntime` | `lib/process-studio/runtime/` | LangGraph + PostgresSaver | ✅ Full | ❌ None | ✅ Unchanged — still live |
| `CAS LangGraphRuntime` | `cas/packages/core/src/runtime/` | LangGraph + LangGraphSupabaseAdapter | ✅ Partial | ✅ Full | ❌ **Retired** — CircuitBreaker + RetryUtility extracted |
| `TeamRuntime` (v1) | `lib/workflow/team-runtime/TeamRuntime.ts` | Native async/await | ❌ None | ❌ None | ❌ **Replaced** by TeamRuntime v2 |
| `TeamRuntime` (v2) | `lib/workflow/team-runtime/TeamRuntime.ts` | LangGraph StateGraph + PostgresSaver | ✅ Full | ✅ Full | ✅ **Live** — Phase 6A |

Phase 6 fixed all gaps: TeamRuntime v2 uses LangGraph StateGraph with PostgresSaver checkpointing, CircuitBreaker protection, HITL interrupt()/resume(), and decision_outcomes governance stubs.

---

### Architectural Decision — Option B (TeamRuntime v2)

Two options were evaluated:

**Option A — Adapt CAS LangGraphRuntime for TeamRuntime**
- Migrate `LangGraphSupabaseAdapter` to work with `AgentTeamState` schema
- Impedance mismatch: CAS checkpointing assumes CAS message format; AgentTeamState has `handoff_history`, `agent_results`, `coordinator_output` — different shape
- Result: two slightly-different LangGraph adaptors maintained in parallel

**Option B — Build TeamRuntime v2 (extract CAS patterns)** ✅ **Chosen**
- Extract `CircuitBreaker` + `RetryUtility` from `cas/packages/core/src/runtime/`
- Use `PostgresSaver` directly (same as `PlatformWorkflowRuntime` — one operational model)
- Build correct `AgentTeamState` as a LangGraph `StateGraph` (what the spec always intended)
- CAS `LangGraphRuntime` is then redundant → retire it

Option B wins because:
1. **Unified operational model** — all execution visible through one lens (Conductor Monitoring)
2. **Correct AgentTeamState schema** — no adapter, no translation layer
3. **One PostgresSaver instance** — same connection pool, same DB, same monitoring
4. **Clean retirement path** — CAS runtime has no reason to exist once Option B is live

---

### Reliability Analysis

Before Phase 6 is built, two engineering items are non-negotiable in TeamRuntime v2:

**1. CircuitBreaker (from CAS — required)**
The CAS `CircuitBreaker` (`cas/packages/core/src/runtime/`) opens after 5 AI call failures in 60 seconds, staying open for 30 seconds before half-open retry. Without it, a provider outage causes runaway concurrent AI calls that exhaust the connection pool and inflate costs. TeamRuntime v2 must import this pattern — not reinvent it.

**2. Build-time topology validation**
TeamRuntime v2 must validate the team topology (nodes, edges, coordinator_slug) at `run()` time, before any LangGraph StateGraph is compiled. Invalid topologies (missing coordinator, orphan nodes, cycle in pipeline) should throw a clear error, not a cryptic LangGraph runtime error.

**Two acceptable-risk items** (mitigate post-launch):
- **AgentTeamState message trimming**: Long-running teams accumulate messages in state; add `MAX_MESSAGES_PER_AGENT = 50` trim in the state reducer before Phase 6C goes live
- **PlatformWorkflowRuntime CircuitBreaker**: The Workflow execution engine has no CircuitBreaker either — acceptable at current scale; add in Phase 6A alongside TeamRuntime v2

---

### Scalability Ladder

PostgresSaver uses the non-pooling port 5432 (session mode). Current ceiling and upgrade path:

| Stage | Concurrent team runs | What changes |
|-------|---------------------|-------------|
| **Current** | ~50 | `PostgresSaver` + aws-1-eu-west-2 port 5432 — adequate for Phase 6 launch |
| **~100 concurrent** | pgBouncer transaction mode | Configure Supabase connection pooler for LangGraph (requires advisory lock compatibility check) |
| **~1,000 concurrent** | Redis checkpoint layer | Replace `PostgresSaver` with `RedisSaver` (Upstash serverless, ~£30/month); PostgreSQL retains the audit log only |
| **~10,000+ concurrent** | Temporal | Dedicated workflow orchestration platform; Conductor becomes a Temporal worker manager |

At current Tutorwise scale (<5 concurrent team runs), PostgresSaver is the right choice with no tuning required.

---

### Sub-Phases

#### Phase 6A — TeamRuntime v2: LangGraph StateGraph Implementation (~20h)
**What**: Rewrite `TeamRuntime` as a proper LangGraph `StateGraph` using `PostgresSaver`.

| Task | Hours | File |
|------|-------|------|
| Extract `CircuitBreaker` + `RetryUtility` from `cas/packages/core/src/runtime/` into `lib/workflow/team-runtime/` | 3h | new: `team-runtime/CircuitBreaker.ts` |
| Define `AgentTeamState` as LangGraph `Annotation.Root` (handoff_history, agent_results, coordinator_output, messages) | 2h | `team-runtime/AgentTeamState.ts` (rewrite) |
| Implement `SupervisorGraph`: parallel agent nodes → synthesis node; coordinator decides which agents to invoke | 4h | `team-runtime/patterns/SupervisorGraph.ts` |
| Implement `PipelineGraph`: topological sort of nodes → sequential execution; `NEXT_AGENT` output determines route | 3h | `team-runtime/patterns/PipelineGraph.ts` |
| Implement `SwarmGraph`: dynamic NEXT_AGENT routing; agents can hand off to any other agent | 3h | `team-runtime/patterns/SwarmGraph.ts` |
| Wire `TeamRuntime.run()` to select correct graph pattern + compile + invoke with `PostgresSaver` thread | 3h | `team-runtime/TeamRuntime.ts` (rewrite) |
| Write `workflow_executions` row for each team run (same table as PlatformWorkflowRuntime) | 2h | `team-runtime/TeamRuntime.ts` |

**Deliverable**: `TeamRuntime.run()` produces a LangGraph StateGraph execution, checkpointed to `workflow_executions`, with CircuitBreaker protection.

**Callers that change**:
- `POST /api/admin/teams/[id]/run` — no interface change; internal execution improves
- `cas-agent.ts` handler (`team_slug` path) — no interface change; now checkpointed

#### Phase 6B — DevOps Team Agent Config Population (~8h)
**What**: Populate production-quality system prompts and tool assignments for all 9 DevOps Team agents. Currently agents have skeletal configs from Phase 2 seeds.

| Task | Hours | Notes |
|------|-------|-------|
| Director system prompt — strategic decomposition, objective routing to Planner | 1.5h | Write + test in agent chat `/admin/conductor/agents/director` |
| Planner system prompt — task breakdown, specialist allocation, dependency ordering | 1.5h | |
| Developer + Engineer system prompts — code generation, PR descriptions, architecture | 1h | |
| Tester + QA system prompts — test coverage analysis, quality gate descriptions | 1h | |
| Security system prompt — threat modelling, dependency audit, OWASP check | 1h | |
| Marketer system prompt — campaign drafts, copy, A/B variants | 1h | |
| Analyst system prompt — data summaries, metrics interpretation, platform health | 1h | |

**Deliverable**: All 9 DevOps Team agents have production-quality prompts; team can complete a `task: "Audit security posture of auth flow"` request end-to-end.

#### Phase 6C — DevOps Team Migration to TeamRuntime v2 (~12h)
**What**: Validate that the DevOps Team topology works correctly under the new TeamRuntime v2 (Phase 6A must be complete first). Fix any topology or state issues.

| Task | Hours | Notes |
|------|-------|-------|
| End-to-end test: run DevOps Team via `/api/admin/teams/devops-team/run` under TeamRuntime v2 | 2h | Verify checkpoint written, all 9 agents invoked, `team_result` correct |
| HITL integration: add `human_review` conditional edge in SupervisorGraph (Director can pause for admin approval) | 4h | Uses same ApprovalDrawer as PlatformWorkflowRuntime |
| Monitoring integration: DevOps Team runs visible in MiningPanel + Execution tab | 2h | Already works if `workflow_executions` row is written in Phase 6A |
| `cas-agent.ts` handler smoke test with `team_slug: 'devops-team'` inside a live workflow | 2h | |
| AgentTeamState message trimming: `MAX_MESSAGES_PER_AGENT = 50` trim in state reducer | 2h | Prevents state bloat in long-running Swarm patterns |

**Deliverable**: DevOps Team is the first team running on TeamRuntime v2. Production-ready, monitored, HITL-capable.

#### Phase 6D — CAS Admin Dashboard → Conductor Monitoring Merge (~10h)
**What**: Redirect `/admin/cas` → `/admin/conductor`. Migrate the CAS run log view and agent status panel into Conductor's existing Monitoring/Execution tabs.

| Task | Hours | Notes |
|------|-------|-------|
| Add "DevOps Team" section to Conductor Monitoring tab (team run history, per-agent status) | 4h | Query `agent_team_run_outputs` + `workflow_executions` |
| Redirect `/admin/cas` → `/admin/conductor?tab=monitoring` with 301 | 1h | `apps/web/src/app/(admin)/admin/cas/` route change |
| Stop writing to `cas_agent_status` from new TeamRuntime v2 (v2 uses `agent_team_run_outputs` only) | 2h | Remove `cas_agent_status` upsert from TeamRuntime v2 |
| Migration 384: deprecate `cas_agent_status`, `cas_agent_events`, `cas_agent_logs` (add `deprecated_at` column, don't DROP yet) | 2h | Safe — data preserved for 90-day retention window |
| Admin sidebar: remove CAS link, update to point to Conductor > Monitoring | 1h | `AdminSidebar.tsx` |

**Deliverable**: `/admin/cas` is gone. All DevOps Team monitoring lives in Conductor. CAS tables soft-deprecated (not dropped).

#### Phase 6E — Governance Integration (~8h)
**What**: TeamRuntime v2 participates in the autonomy governance system (same as PlatformWorkflowRuntime).

| Task | Hours | Notes |
|------|-------|-------|
| `process_autonomy_config` lookup in TeamRuntime v2: check if team has an autonomy config before run | 2h | Falls back to 'supervised' if no config exists |
| Write `decision_rationale` jsonb to `workflow_executions` for each team run | 2h | Records which agents were invoked, what tools were called |
| `decision_outcomes` stubs: write outcome stub at run completion (pending admin validation) | 2h | Same pattern as `writeDecisionOutcomeStubs()` in PlatformWorkflowRuntime |
| TierCalibrationPanel: expose team runs in the autonomy calibration view | 2h | Filter `workflow_executions WHERE process_type = 'team'` in the panel query |

**Deliverable**: Team runs participate in the learning loop. Accuracy is tracked. Autonomy tiers apply to teams, not just workflows.

---

### Dependency Graph

```
Phase 6A (TeamRuntime v2)
    │
    ├──▶ Phase 6C (DevOps Team migration)
    │         │
    │         └──▶ Phase 6E (governance integration)
    │
    └──▶ Phase 6D (CAS dashboard merge) [can start in parallel with 6C]

Phase 6B (agent configs) ── independent, can run in parallel with 6A
```

**Critical path**: 6A → 6C → 6E (40h)
**Can parallelise**: 6B alongside 6A, 6D alongside 6C

---

### What Gets Retired — Status (All Complete)

| Component | Location | Retirement Step | Status |
|-----------|----------|----------------|--------|
| `LangGraphRuntime.ts` | `cas/packages/core/src/runtime/` | Phase 6A — CircuitBreaker extracted | ✅ Done |
| `LangGraphSupabaseAdapter.ts` | `cas/packages/core/src/runtime/` | Phase 6A — replaced by `PostgresSaver` | ✅ Done |
| `RuntimeFactory.ts` | `cas/packages/core/src/runtime/` | Phase 6A — returns `TeamRuntime v2` | ✅ Done |
| `AgentRuntimeFactory.create()` calls | any caller in `cas/` | Phase 6A — callers use `TeamRuntime.run()` | ✅ Done |
| `/admin/cas` dashboard | `apps/web/src/app/(admin)/admin/cas/` | Phase 6D — redirects to `/admin/conductor` | ✅ Done |
| `/admin/cas/workflow-fullscreen` | `apps/web/src/app/(admin)/admin/cas/workflow-fullscreen/` | Phase 6D — redirects to `/admin/conductor` | ✅ Done |
| Legacy CAS API routes | `apps/web/src/app/api/admin/cas/` | Phase 6D — stubbed out, return minimal responses | ✅ Done |
| `cas_agent_status` table | DB | Phase 6D — soft-deprecated (migration 385); hard DELETE eligible **2026-06-11** | ✅ Soft-deprecated |
| `cas_agent_events` table | DB | Phase 6D — soft-deprecated (migration 385); hard DELETE eligible **2026-06-11** | ✅ Soft-deprecated |
| `cas_agent_logs` table | DB | Phase 6D — soft-deprecated (migration 385); hard DELETE eligible **2026-06-11** | ✅ Soft-deprecated |
| `cas_metrics_timeseries` table | DB | Phase 6D — soft-deprecated (migration 385); hard DELETE eligible **2026-06-11** | ✅ Soft-deprecated |
| `cas_agent_config` table | DB | Phase 6D — soft-deprecated (migration 385); hard DELETE eligible **2026-06-11** | ✅ Soft-deprecated |

> **Note**: The `cas_*` tables are soft-deprecated with a `deprecated_at` column (migration 385, 2026-03-11). A 90-day window allows downstream queries to be identified and updated. Hard DELETE eligible **2026-06-11**.

---

### Platform After Phase 6

```
BEFORE PHASE 6 — Three parallel engines
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ PlatformWorkflow     │  │ CAS LangGraph        │  │ TeamRuntime          │
│ Runtime              │  │ Runtime              │  │ (async/await)        │
│ LangGraph +          │  │ LangGraph +          │  │ No checkpointing     │
│ PostgresSaver        │  │ LangGraphSupabase    │  │ No CircuitBreaker    │
│ No CircuitBreaker    │  │ Adapter +            │  │ No governance        │
│                      │  │ CircuitBreaker       │  │                      │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘

AFTER PHASE 6 — One unified substrate
┌─────────────────────────────────────────────────────────────────────────┐
│ Unified Execution Substrate                                             │
│                                                                         │
│  LangGraph StateGraph + PostgresSaver + CircuitBreaker                  │
│                                                                         │
│  PlatformWorkflowRuntime    TeamRuntime v2         SpecialistAgent      │
│  (Workflows)                (Teams)                Runner               │
│       │                          │                 (Agents)             │
│       └──────────────────────────┴─────────────────────┘               │
│                    All runs → workflow_executions                       │
│                    All monitored in Conductor Monitoring                │
│                    All participate in autonomy governance               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 6 Testing

| Test Type | Scope | Tool |
|-----------|-------|------|
| Unit tests | `SupervisorGraph`, `PipelineGraph`, `SwarmGraph` — known topology → correct StateGraph nodes + edges | Jest |
| Unit tests | `CircuitBreaker` — 5 failures in 60s → OPEN; 30s → HALF_OPEN; success → CLOSED | Jest |
| Integration test | TeamRuntime v2 full run (DevOps Team): `TeamRuntime.run('devops-team', task)` → checkpoint written, `team_result` populated | Jest + test DB |
| Integration test | `cas-agent.ts` handler with `team_slug` inside a live workflow — verify team run is checkpointed | Jest |
| Manual | HITL inside team: Director pauses → ApprovalDrawer appears → admin approves → execution continues | QA checklist |
| Manual | `/admin/cas` redirects to `/admin/conductor?tab=monitoring` | QA checklist |
| Manual | DevOps Team run visible in Conductor Execution + Monitoring tabs | QA checklist |
| Regression | All existing Workflows still execute correctly (PlatformWorkflowRuntime unchanged) | Jest |
| Regression | All existing Teams (non-DevOps) still execute via TeamRuntime v2 (no behaviour change) | Jest |

---

### Phase 6 Success Criteria — All Verified ✅

| Criterion | How to verify | Status |
|-----------|--------------|--------|
| Zero `async/await` TeamRuntime code in production | `grep -r "TeamRuntime" --include="*.ts"` — all paths lead to LangGraph | ✅ Verified |
| DevOps Team run produces a `workflow_executions` checkpoint row | Query `workflow_executions WHERE metadata->>'team_slug' = 'devops-team'` | ✅ Verified |
| CircuitBreaker trips correctly under simulated outage | Jest unit test — 5 failures → OPEN state confirmed (12 tests pass) | ✅ Verified |
| `/admin/cas` redirects to `/admin/conductor` | Route renders redirect page | ✅ Verified |
| CAS tables have `deprecated_at` set | Migration 385 applied — `deprecated_at = '2026-03-11'` on 5 tables | ✅ Verified |
| HITL interrupt()/resume() in supervisor pattern | `POST /api/admin/teams/[id]/runs/[runId]/resume` live | ✅ Verified |
| Decision outcome stubs written after team completion | `_writeTeamRunDecisionStubs()` — 7d + 30d lag entries | ✅ Verified |

---

## Phase 7 — Agent Episodic Memory
**Goal**: Give specialist agents temporal memory so they learn from past runs — what worked, what failed, what patterns recur — without requiring external infrastructure (Neo4j/Graphiti).
**Status**: ✅ **COMPLETE** (2026-03-11) — Migration 386 applied.
**Estimate**: ~12h
**Dependency**: Phase 6 complete

### Architecture

pgvector-based episodic memory using two tables:
- **`memory_episodes`** — one row per agent run; stores task, outcome summary, outcome_type (success/partial/failure/insight), entities involved, and a 768-dim embedding for semantic retrieval (HNSW index)
- **`memory_facts`** — extracted knowledge as (subject, relation, object) triples with temporal validity (`valid_from`, `valid_until`); allows agents to know "Tutor X had high cancellation rate" without re-querying

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AgentMemoryService` | `lib/agent-studio/AgentMemoryService.ts` | `fetchMemoryBlock()`, `recordEpisode()`, `extractAndStoreFacts()`, `invalidateFact()` |
| `match_memory_episodes` RPC | migration 386 | Semantic search: `query_embedding`, `p_agent_slug`, threshold=0.72, count=5 |
| `match_memory_facts` RPC | migration 386 | Semantic search: `query_embedding`, `p_agent_slug`, count=5 |
| `SpecialistAgentRunner` integration | `lib/agent-studio/SpecialistAgentRunner.ts` | Fetches memory in parallel with knowledge block; injects as `PAST EXPERIENCE` section in system prompt |

### How It Works

```
Agent Run Starts
      │
      ▼
SpecialistAgentRunner.run()
  ├── fetchMemoryBlock(agentSlug, task)     ← parallel with knowledge fetch
  │     ├── embed task → match_memory_episodes (top 3, threshold 0.72)
  │     └── match_memory_facts (top 4 active facts)
  │     → Returns formatted "PAST EXPERIENCE" block
  │
  ├── System prompt injection:
  │     PLATFORM KNOWLEDGE: [from KnowledgePanel]
  │     PAST EXPERIENCE: [from AgentMemoryService]    ← Phase 7
  │     Available Tools: [built-in + MCP tools]
  │
  ├── ReAct loop executes (up to 5 tool rounds)
  │
  └── Post-run (fire-and-forget, fail-silently):
        ├── recordEpisode(agentSlug, task, output, toolsCalled)
        │     → Embeds summary → INSERT memory_episodes
        └── extractAndStoreFacts(agentSlug, output)
              → ai.generateJSON<ExtractedFact[]>() (only if output > 200 chars)
              → Max 4 facts per run → UPSERT memory_facts
```

### Memory API Route

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/agents/[id]/memory` | Admin | List memory episodes + facts for an agent |

---

## Phase 8 — MCP Integration Framework
**Goal**: Connect Conductor to external tools via Model Context Protocol (MCP). Auto-discover tools from MCP servers, make them available to specialist agents alongside built-in tools, with full audit logging.
**Status**: ✅ **COMPLETE** (2026-03-11) — Migrations 387–388 applied.
**Estimate**: ~20h
**Dependency**: Phase 2 (Tool Registry live)
**Design doc**: [`mcp-solution-design.md`](./mcp-solution-design.md)

### Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  CONDUCTOR                                                            │
│                                                                      │
│  SpecialistAgentRunner                                               │
│    └── executeTool(slug)                                             │
│          ├── slug has ':'  → MCPClientManager.callTool()             │
│          └── plain slug    → TOOL_EXECUTORS[slug]()  (built-in)     │
│                                                                      │
│  MCPClientManager (singleton)                                        │
│    ├── getClient(connectionSlug) — lazy connect, 5-min idle timeout  │
│    ├── syncTools(slug) — listTools() → upsert mcp_tool_catalog      │
│    ├── callTool(connSlug, toolName, input, context) — execute + log  │
│    ├── healthCheck(slug) — heartbeat + status update                 │
│    └── disconnect(slug) — close transport                            │
│                                                                      │
│  CredentialResolver                                                  │
│    ├── api_key → Basic Auth (Atlassian) or Bearer token              │
│    ├── oauth_delegated → per-user lookup from student_integration_links│
│    └── none → no auth headers                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `mcp_connections` | 387 | Server registrations: slug, name, server_url, transport, credential_type, credentials (JSONB), status, last_heartbeat, tool_count |
| `mcp_tool_catalog` | 387 | Discovered tools: connection_id (FK CASCADE), tool_name, qualified_slug (UNIQUE), description, input_schema, enabled |
| `mcp_tool_executions` | 388 | Audit log: connection_id, tool_name, agent_slug, run_id, input, output, status, duration_ms, context_profile_id |

### Tool Namespacing

MCP tools use colon-namespaced qualified slugs: `{connection_slug}:{tool_name}` (e.g., `jira:jira_listIssues`, `classroom:classroom_listCourses`). The executor routes based on presence of `:` in the slug:

```typescript
export async function executeTool(slug, input, context?) {
  if (slug.includes(':')) {
    // Route to MCP
    const [connectionSlug, ...toolParts] = slug.split(':');
    return getMCPClientManager().callTool(connectionSlug, toolParts.join(':'), input, context);
  }
  // Route to built-in
  return TOOL_EXECUTORS[slug](input);
}
```

### Admin UI — MCPPanel

Three sub-tabs in Conductor Integrations tab:
1. **Connections** — Add/delete MCP servers, view status/heartbeat, trigger tool sync
2. **Tool Catalog** — Browse discovered tools, enable/disable per-tool, see source badge
3. **Execution Log** — Audit trail of all MCP tool calls with input/output/duration/status

### API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET/POST` | `/api/admin/mcp/connections` | Admin | List/create MCP connections |
| `PATCH/DELETE` | `/api/admin/mcp/connections/[id]` | Admin | Update/delete a connection |
| `POST` | `/api/admin/mcp/connections/[id]/sync` | Admin | Discover tools from MCP server |
| `GET` | `/api/admin/mcp/tools` | Admin | List all MCP tools (optionally by connection) |
| `PATCH` | `/api/admin/mcp/tools/[id]` | Admin | Enable/disable a tool |
| `GET` | `/api/admin/mcp/executions` | Admin | Recent MCP tool executions (audit log) |
| `POST` | `/api/cron/mcp-health-check` | Cron secret | Heartbeat check for all active connections |

### Use Cases (Phase 8)

| Connection | Credential Type | Example Tools |
|-----------|----------------|---------------|
| **Google Classroom** | `oauth_delegated` (per-user) | `classroom_listCourses`, `classroom_getStudents`, `classroom_getAssignments` |
| **Jira/Confluence** | `api_key` (org-wide Basic Auth) | `jira_listIssues`, `jira_createIssue`, `confluence_searchPages` |

## Phase 9 — Admin Operations

**Goal**: Provide the admin team with a dedicated operational hub — daily AI brief, platform health dashboard, unified exception queue, and command bar with intent routing. Replaces the specced "Admin Command Center" with a cleaner additive approach.

**Status**: ✅ COMPLETE (2026-03-11)

### Architecture

```
/admin/operations/          ← NEW page (3 tabs: Overview, Exceptions, Agents)
/admin/                     ← existing dashboard (UNCHANGED)
/admin/conductor/           ← existing (UNCHANGED)

API routes:
  GET  /api/admin/operations/brief           — AI daily brief (cached, ?refresh=true)
  GET  /api/admin/operations/health           — platform health (workflows, agents, HITL, exceptions)
  GET  /api/admin/operations/exceptions       — exception queue (filterable)
  GET  /api/admin/operations/exceptions/[id]  — exception detail
  PATCH /api/admin/operations/exceptions/[id] — claim / resolve / dismiss
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Operations page | `app/(admin)/admin/operations/page.tsx` | 3-tab layout: Overview, Exceptions, Agents |
| AI Brief API | `app/api/admin/operations/brief/route.ts` | Queries all 12 daily metrics tables + operational status, synthesises via `getAIService().generate()` |
| Health API | `app/api/admin/operations/health/route.ts` | Running workflows, failed 24h, pending HITL, open exceptions, agent status |
| Exceptions API | `app/api/admin/operations/exceptions/` | CRUD for `workflow_exceptions` table |
| `workflow_exceptions` table | migration 389 | Unified queue — 7 source types, 4 severities, claim/resolve lifecycle |
| `ExecutionCommandBar` | Reused from `components/feature/workflow/` | Intent routing via `IntentDetector` — routes to agents, workflows, or analytics |

### Exception Sources

| Source | Trigger |
|--------|---------|
| `workflow_failure` | Workflow execution fails |
| `agent_error` | Specialist agent run error |
| `team_error` | Team run failure |
| `conformance_deviation` | Conformance checker flags deviation above threshold |
| `webhook_failure` | Webhook delivery failure |
| `shadow_divergence` | Shadow execution diverges from expected path |
| `hitl_timeout` | HITL task unclaimed for >48h |

---

## Roadmap (Future — Not Phased)

Items below are **not yet built**. Ordered by expected value:

| Capability | Source | Why Later | Trigger |
|-----------|--------|----------|---------|
| **cas_* Hard DELETE** | Migration 385 | 90-day deprecation window. Tables soft-deprecated 2026-03-11. | Eligible **2026-06-11** — create migration to DROP tables |
| **Graphiti Memory Upgrade** | Phase 7 pgvector base | Current pgvector episodic memory works well for <500 runs/agent. Graphiti (Neo4j) adds temporal graph traversal for complex inter-agent reasoning. | When any agent has >500 `memory_episodes` rows AND recurring false positives are observed |
| **Custom MCP Servers** | Phase 8 framework | Tutorwise as an MCP server — expose platform data/actions to enterprise client LLMs. Bidirectional MCP. | When first enterprise client wants to query Tutorwise from their own LLM tools |
| **MCP Marketplace** | Phase 8 framework | Community-contributed MCP connections with one-click install. Template library for common integrations. | When >5 MCP connections are configured |
| **DSPy Evaluation Panel** | `DSPyEvaluationPanel.tsx` | Per-node AI prompt testing. Add when Workflows uses complex AI decision nodes requiring prompt iteration. | When admins change AI node prompts >2x/month/process |
| **MLflow Observability** | `intent_agent.py` | AI cost and quality tracking at model level. | When AI cost becomes material (>£500/month) |
| **Value Streams Designer** | `ValueStreamsModule.tsx` | End-to-end value stream mapping with bottleneck identification. | When process mining data is rich enough (>1,000 execution paths) |
| **PlatformWorkflowRuntime CircuitBreaker** | Phase 6A pattern | Workflow execution engine has no CircuitBreaker — acceptable at current scale. Extract from TeamRuntime v2 pattern. | When concurrent workflow executions exceed ~50 |
| **Multi-tenant MCP** | Phase 8 extension | Per-org MCP connections with tenant isolation. Currently single-tenant (admin-only). | When org clients need their own tool integrations |
| **Agent-to-Agent Communication** | TeamRuntime v2 | Direct message passing between agents in different teams (cross-team collaboration). | When platform has >3 active teams needing coordination |
| **Growth Agent → Unified Routes** | Phase 2 design | Growth Agent still runs standalone (`lib/growth-agent/`). Migrate to unified agent routes (`/api/agents/[type]/`). | When second user-facing agent needs same pattern |

### Graphiti Memory Upgrade — Implementation Sketch

> **Note**: Phase 7 delivered pgvector-based episodic memory (zero infrastructure cost). This roadmap item is the upgrade path to Graphiti for temporal graph traversal.

Current Phase 7 memory gives agents "what happened in similar past runs" via vector similarity. Graphiti adds temporal graph structure — "what changed between run N and run N+1", "which facts are decaying", "which agent's recommendations correlate with positive outcomes over time".

**When to add**: After 6 months of live specialist agent runs, when `memory_episodes` table has >500 rows per agent and the flat vector approach produces too many irrelevant matches.

**Infrastructure**: Graphiti runs as a separate service. Data lives in Neo4j (cloud or self-hosted). Adds ~£30–50/month. Migration path: export `memory_episodes` + `memory_facts` → Graphiti nodes/edges.

### cas_* Hard DELETE — Implementation Sketch

Migration 385 soft-deprecated 5 CAS tables on 2026-03-11 with a 90-day window. On **2026-06-11**, create migration:

```sql
-- Migration 389+ (eligible 2026-06-11): Hard DELETE cas_* tables
DROP TABLE IF EXISTS cas_agent_status CASCADE;
DROP TABLE IF EXISTS cas_agent_events CASCADE;
DROP TABLE IF EXISTS cas_agent_logs CASCADE;
DROP TABLE IF EXISTS cas_metrics_timeseries CASCADE;
DROP TABLE IF EXISTS cas_agent_config CASCADE;
```

Pre-flight check: `SELECT COUNT(*) FROM cas_agent_status WHERE created_at > '2026-03-11'` — should be 0 (no new writes since deprecation).

---

## Testing Strategy

Each phase has specific testing requirements before deployment.

### Phase 1 Testing

| Test Type | Scope | Tool |
|-----------|-------|------|
| Unit tests | Handler functions (all 11 handlers) | Jest — `apps/web/src/lib/workflow/handlers/**.test.ts` |
| Integration tests | PlatformWorkflowRuntime full run (Tutor Approval happy path + rejection path) | Jest + Supabase test DB |
| E2E test | Workflows canvas: drag node, connect edge, publish | Playwright |
| E2E test | HITL: submit approval task, approve via ApprovalDrawer, verify execution continues | Playwright |
| Manual | CAS WorkflowVisualizer renders inside Workflows canvas tab | QA checklist |
| Manual | Exception queue: create, claim, resolve, verify audit log | QA checklist |
| Regression | All 5 existing workflows (Tutor Approval, Commission Payout, Booking Lifecycle x2, Referral) | Jest |

**Pre-commit gate**: `npm run lint && npm run build && npm run test` — enforced by pre-commit hook.

### Phase 2 Testing

| Test Type | Scope | Tool |
|-----------|-------|------|
| Unit tests | Agent tool executors (mock Supabase responses) | Jest |
| Integration tests | Agent registry CRUD (create, activate, deactivate, run) | Jest + test DB |
| Integration tests | Tool registry validation (JSON schema validation, TypeScript type check) | Jest |
| Unit tests | `TeamRuntime`: known topology → verify correct StateGraph nodes + edges compiled | Jest |
| Unit tests | `AgentTeamState` transitions: Supervisor, Pipeline, Swarm (all three patterns) | Jest |
| Integration tests | Team run end-to-end: create team in DB → TeamRuntime.run() → verify team_result + handoff_history | Jest + test DB |
| Integration tests | Team invoked from Workflow (via extended `cas_agent` handler with `team_slug`) | Jest |
| Manual | Market Intelligence Agent: run on staging, verify output JSON structure | QA checklist |
| Manual | Agent node in Conductor: drag, configure, connect to Workflow, execute | QA checklist |
| Manual | Team canvas: create Supervisor team (3 agents), run, verify team_result synthesised | QA checklist |
| Load test | 4 Agents + 1 Team running concurrently (cron alignment stress test) | k6: simulate simultaneous pg_cron triggers |

### Phase 3 Testing

| Test Type | Scope | Tool |
|-----------|-------|------|
| Unit tests | Growth Score formula (all 4 role types, edge cases) | Jest |
| Integration tests | platform_events publish + subscribe (source-to-consumer round trip) | Jest |
| Integration tests | pipeline_jobs queue: enqueue, process, retry after failure, DLQ | Jest |
| Performance test | Admin Intelligence daily brief generation under 30 seconds | Timing assertions in Jest |
| Manual | Platform Console real-time WebSocket: simulate booking event, verify console updates | QA checklist |

### Phase 4 Testing

| Test Type | Scope | Tool |
|-----------|-------|------|
| Unit tests | Intent detection: 20 query examples, verify routing accuracy >90% | Jest |
| Integration tests | PlatformUserContext: fetch, cache, invalidation, cross-agent injection | Jest + Redis test instance |
| Integration tests | decision_outcomes: stub writes, pg_cron lag measurement, accuracy calculation | Jest |
| Manual | Full cross-agent handoff: Lexi → Sage (carry booking context) | QA checklist |

### Phase 5 Testing

| Test Type | Scope | Tool |
|-----------|-------|------|
| Unit tests | Conformance engine: known-conformant path, known-deviant path, stuck execution | Jest |
| Integration tests | Analytics API: correct path frequencies, cycle time averages | Jest |
| Manual | Shadow vs Live dashboard: inject divergent execution, verify it appears in divergence list | QA checklist |
| Manual | Go-live checklist: block promote when checklist items incomplete | QA checklist |

---

## Complete Database Schema

All new tables across all phases. Existing tables (workflow_executions, workflow_tasks, workflow_processes, etc.) unchanged.

**RLS policy requirement** (must be written in each migration, not shown below for brevity):

| Table | Who can read | Who can write |
|-------|-------------|---------------|
| `platform_events` | `is_admin()` | `service_role` only |
| `workflow_exceptions` | `is_admin()` | `service_role` + `is_admin()` for resolve/claim |
| `growth_scores` | owner (`profile_id = auth.uid()`) + `is_admin()` | `service_role` only |
| `specialist_agents` | `is_admin()` | `is_admin()` |
| `analyst_tools` | `is_admin()` | `is_admin()` (activate requires `activated_by`) |
| `agent_templates` | `is_admin()` | `is_admin()` (system templates read-only) |
| `agent_subscriptions` | owner (`user_id = auth.uid()`) + `is_admin()` | `service_role` only |
| `agent_teams` | `is_admin()` | `is_admin()` |
| `decision_outcomes` | `is_admin()` | `service_role` only |
| `process_autonomy_config` | `is_admin()` | `is_admin()` (tier contraction auto; expansion requires admin) |

```sql
-- ═══════════════════════════════════════════════════════════════════
-- Migration 344 (Phase 1): GDPR compliance + platform_events bus
-- Aligned with ipom-gdpr-retention-policy.md v1.1
-- ═══════════════════════════════════════════════════════════════════

-- GDPR retention columns on workflow_executions
ALTER TABLE workflow_executions
  ADD COLUMN decision_rationale jsonb,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN pseudonymised_at timestamptz,
  ADD COLUMN deletion_scheduled_at timestamptz
    GENERATED ALWAYS AS (created_at + INTERVAL '3 years') STORED,
  ADD COLUMN legal_hold boolean DEFAULT false;

-- Legal hold on profiles (prevents erasure during fraud/legal investigations)
ALTER TABLE profiles ADD COLUMN legal_hold boolean DEFAULT false;
CREATE INDEX idx_profiles_legal_hold ON profiles(legal_hold) WHERE legal_hold = true;

-- SAR request log — deletion-safe (survives account deletion)
CREATE TABLE sar_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id_hash text,    -- sha256(profile_id || salt) — survives deletion
  profile_id_raw uuid,     -- SET NULL after account deletion/pseudonymisation
  requested_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  response_method text,    -- 'email' | 'portal' | 'manual'
  data_exported_at timestamptz,
  notes text
);

-- Platform events bus (partitioned cross-system event store)
CREATE TABLE platform_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system text NOT NULL,    -- 'sage' | 'lexi' | 'growth' | 'workflow' | 'cas'
  event_type text NOT NULL,
  entity_id uuid,
  entity_type text,               -- 'user' | 'execution' | 'session' | 'organisation'
  payload jsonb,
  created_at timestamptz DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Initial monthly partitions (table will reject inserts without at least one partition)
CREATE TABLE platform_events_2026_03 PARTITION OF platform_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE platform_events_2026_04 PARTITION OF platform_events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE platform_events_2026_05 PARTITION OF platform_events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE platform_events_2026_06 PARTITION OF platform_events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE INDEX idx_platform_events_source ON platform_events(source_system);
CREATE INDEX idx_platform_events_type ON platform_events(event_type);
CREATE INDEX idx_platform_events_entity ON platform_events(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_platform_events_created ON platform_events(created_at DESC);

-- Monthly partition creation (runs 25th of each month, creates following month)
SELECT cron.schedule(
  'create-platform-events-partition',
  '0 0 25 * *',
  $$
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS platform_events_%s PARTITION OF platform_events FOR VALUES FROM (%L) TO (%L)',
      to_char(date_trunc(''month'', now()) + INTERVAL ''1 month'', ''YYYY_MM''),
      date_trunc(''month'', now()) + INTERVAL ''1 month'',
      date_trunc(''month'', now()) + INTERVAL ''2 months''
    );
  $$
);

-- Prune partitions older than 12 months (GDPR retention: 12 months, not 6)
-- Runs 1st of each month. Drops partition from 13 months ago.
SELECT cron.schedule(
  'prune-platform-events-partitions',
  '0 2 1 * *',
  $$
    EXECUTE format(
      'DROP TABLE IF EXISTS platform_events_%s',
      to_char(date_trunc(''month'', now()) - INTERVAL ''13 months'', ''YYYY_MM'')
    );
  $$
);


-- ═══════════════════════════════════════════════════════════════════
-- Migration 345 (Phase 3): Growth Scores — all 4 role types
-- Aligned with ipom-growth-score-all-roles.md v1.1
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE growth_scores (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id),
  role_type text NOT NULL,            -- 'tutor' | 'client' | 'agent' | 'organisation'
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  component_scores jsonb,             -- {profile_completeness, listing_performance, ...}
  computed_at timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════
-- Migration 346 (Phase 1): Production fixes + cross-system tables
-- ═══════════════════════════════════════════════════════════════════

-- Workflow trigger deduplication (prevents double-firing on profile update)
CREATE UNIQUE INDEX idx_workflow_executions_active_entity
ON workflow_executions (process_id, target_entity_id)
WHERE status IN ('running', 'pending');

-- DLQ retry scheduler (failed_webhooks exists but has no retry job)
SELECT cron.schedule(
  'process-failed-webhooks', '*/15 * * * *',
  $$
    UPDATE failed_webhooks SET retry_count = retry_count + 1,
      last_retry_at = now(), status = 'retrying'
    WHERE status = 'failed' AND retry_count < 5
      AND COALESCE(last_retry_at, created_at)
          + (INTERVAL '1 minute' * power(2, retry_count)) < now()
  $$
);

-- Workflow fallback polling (under_review + no execution in 60 min = missed webhook)
SELECT cron.schedule(
  'workflow-trigger-fallback', '*/5 * * * *',
  $$
    INSERT INTO workflow_execution_queue (process_id, target_entity_id)
    SELECT 'tutor-approval-process-id', p.id FROM profiles p
    WHERE p.status = 'under_review'
      AND NOT EXISTS (
        SELECT 1 FROM workflow_executions we
        WHERE we.target_entity_id = p.id
          AND we.created_at > now() - INTERVAL '60 minutes'
      )
    ON CONFLICT DO NOTHING
  $$
);

-- Entity-level workflow cooldown tracking
CREATE TABLE workflow_entity_cooldowns (
  entity_id uuid NOT NULL, entity_type text NOT NULL,
  last_workflow_at timestamptz NOT NULL, last_workflow_type text,
  cooldown_until timestamptz,
  PRIMARY KEY (entity_id, entity_type)
);

-- Pipeline jobs queue (async knowledge pipelines)
CREATE TABLE pipeline_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_type text NOT NULL, payload jsonb,
  status text DEFAULT 'pending', attempts integer DEFAULT 0,
  last_error text, created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Exception queue (HITL escalation + admin resolution with 15-min claim lock)
CREATE TABLE workflow_exceptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id uuid REFERENCES workflow_executions(id),
  severity text NOT NULL, domain text NOT NULL,
  ai_recommendation text, confidence_score integer,
  evidence_count integer, claimed_by uuid REFERENCES auth.users,
  claimed_at timestamptz,
  claimed_expires_at timestamptz GENERATED ALWAYS AS (claimed_at + INTERVAL '15 minutes') STORED,
  escalated_at timestamptz,
  resolved_at timestamptz, resolved_by uuid REFERENCES auth.users,
  resolution text, created_at timestamptz DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════
-- Migration 347 (Phase 1): Process versioning
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE workflow_process_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id uuid NOT NULL REFERENCES workflow_processes(id),
  version_number integer NOT NULL,
  nodes jsonb NOT NULL, edges jsonb NOT NULL,
  version_notes text, published_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workflow_processes ADD COLUMN version integer DEFAULT 1;
ALTER TABLE workflow_processes ADD COLUMN published_at timestamptz;
-- Auto-save draft columns: auto-save writes here every 5 min; publish snapshots to workflow_process_versions
ALTER TABLE workflow_processes ADD COLUMN draft_nodes jsonb;
ALTER TABLE workflow_processes ADD COLUMN draft_edges jsonb;
ALTER TABLE workflow_processes ADD COLUMN draft_updated_at timestamptz;


-- ═══════════════════════════════════════════════════════════════════
-- Migration 348 (Phase 2): Analyst agents + agent templates + tool registry
-- ═══════════════════════════════════════════════════════════════════

-- Tool Registry: admin-registered tools available to specialist agents
CREATE TABLE analyst_tools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,          -- 'data_query' | 'platform_action' | 'calculation'
  input_schema jsonb NOT NULL,     -- JSON Schema for tool inputs (validated before activation)
  output_schema jsonb,             -- JSON Schema for expected output
  function_path text NOT NULL,     -- e.g. 'apps/web/src/lib/agent-studio/tools/query-bookings.ts'
  requires_entity_id boolean DEFAULT false,  -- platform_action tools must include entity_id (audit trail)
  is_deterministic boolean DEFAULT true,     -- data_query tools must be deterministic
  status text NOT NULL DEFAULT 'draft',      -- 'draft' | 'active' | 'inactive'
  created_by uuid REFERENCES auth.users,
  activated_by uuid REFERENCES auth.users,   -- code review required before activation
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE specialist_agents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE, name text NOT NULL,
  role text,                           -- e.g. 'DevOps Engineer', 'Delivery Manager'
  config jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft',  -- 'draft' | 'active' | 'inactive'
  built_in boolean DEFAULT false,        -- true = CAS pre-shipped; false = admin-created
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE agent_run_outputs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES specialist_agents(id),
  trigger_type text NOT NULL, input_prompt text NOT NULL,
  output_text text, tools_called jsonb, status text NOT NULL,
  duration_ms integer, created_at timestamptz DEFAULT now()
);

CREATE TABLE agent_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE, name text NOT NULL,
  description text, category text,         -- 'operations' | 'finance' | 'growth' | 'full-stack'
  agents_config jsonb NOT NULL,            -- Array of SpecialistAgentConfig
  tags text[],
  is_system boolean DEFAULT false,         -- system templates protected from deletion
  created_at timestamptz DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════
-- Migration 349 (Phase 2): Unified agent subscriptions
-- Zero-downtime — deploy, verify read parity 24h, then drop sage_pro_subscriptions
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE agent_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  agent_type text NOT NULL,           -- 'sage' | 'growth' | future specialist agents
  stripe_subscription_id text, stripe_customer_id text,
  stripe_price_id text, status text NOT NULL,
  price_per_month integer,
  current_period_start timestamptz, current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, agent_type)
);


-- ═══════════════════════════════════════════════════════════════════
-- Migration 350 (Phase 3): Intelligence layer
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE growth_knowledge_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL, embedding vector(768),
  category text, source_type text, metadata jsonb,
  content_hash text, last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE platform_ai_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system text NOT NULL, operation_type text NOT NULL,
  model text NOT NULL, tokens_in integer, tokens_out integer,
  estimated_cost_gbp numeric(10, 6), execution_id uuid,
  created_at timestamptz DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════
-- Migration 352 (Phase 2): Agent Teams + team run outputs
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE agent_teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  pattern text NOT NULL CHECK (pattern IN ('supervisor', 'pipeline', 'swarm')),
  coordinator_slug text,      -- for supervisor pattern: the coordinator agent slug
  nodes jsonb NOT NULL,       -- [{agent_slug, output_key, role, position_x, position_y}]
  edges jsonb NOT NULL,       -- [{from_slug, to_slug, condition?, label?}]
  config jsonb,               -- additional team-level config (e.g. max_rounds, timeout_ms)
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  is_system boolean DEFAULT false,  -- true for CAS Team (protected from deletion)
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE agent_team_run_outputs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES agent_teams(id),
  trigger_type text NOT NULL,   -- 'scheduled' | 'manual' | 'workflow'
  input_task text NOT NULL,
  team_result text,             -- final synthesised output
  agent_outputs jsonb,          -- {agent_slug: output_text, ...}
  handoff_history jsonb,        -- [{from, to, reason, timestamp}, ...]
  context_snapshot jsonb,       -- final AgentTeamState.context at completion
  status text NOT NULL CHECK (status IN ('completed', 'failed', 'running')),
  duration_ms integer,
  workflow_execution_id uuid,   -- set when invoked from a Workflow action node
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_team_run_outputs_team ON agent_team_run_outputs(team_id);
CREATE INDEX idx_agent_team_run_outputs_created ON agent_team_run_outputs(created_at DESC);


-- ═══════════════════════════════════════════════════════════════════
-- Migration 351 (Phase 4): Learning layer + knowledge base
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE decision_outcomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id uuid REFERENCES workflow_executions(id),
  process_id uuid, decision_type text NOT NULL,
  outcome_metric text NOT NULL, outcome_value numeric,
  measured_at timestamptz NOT NULL, lag_days integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE process_autonomy_config (
  process_id uuid PRIMARY KEY,
  current_tier text NOT NULL, accuracy_threshold numeric,
  accuracy_30d numeric, scope_parameters jsonb,
  last_calibrated_at timestamptz, proposed_tier text,
  proposed_by text DEFAULT 'admin-intelligence',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE platform_knowledge_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL, embedding vector(768),
  category text, source_type text, metadata jsonb,
  content_hash text, last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

---

## Current Migration Sequence

Latest applied: **389**. Next available: **390**.

```
Phase 1 — Consolidation
  344 — GDPR: workflow_executions GDPR columns + profiles.legal_hold + sar_requests (hash-based) + platform_events (partitioned)
  345 — Growth Scores: growth_scores table with role_type + component_scores
  346 — Phase 1 production fixes: dedup index + DLQ retry cron + fallback polling + workflow_entity_cooldowns + pipeline_jobs + workflow_exceptions
  347 — Phase 1 versioning: workflow_process_versions + workflow_processes.version/published_at

Phase 2 — Agents + Teams
  348 — Phase 2 agents: specialist_agents + agent_run_outputs + agent_templates
  349 — Phase 2 subscriptions: agent_subscriptions (zero-downtime, separate deployment)
  350 — Phase 3 intelligence: growth_knowledge_chunks + platform_ai_costs
  351 — Phase 4 learning: decision_outcomes + process_autonomy_config + platform_knowledge_chunks
  352 — Phase 2 teams: agent_teams + agent_team_run_outputs (+ indexes)

Phase 3 — Feature Intelligence Layer (platform metrics + daily pg_cron jobs)
  353 — Referral: referral_metrics_daily (K coefficient + funnel + cohort)
  354 — Referral: referral_network_stats materialized view (hub nodes, chain depth)
  355 — CaaS: caas_platform_metrics_daily + compute_caas_platform_metrics() pg_cron 05:30
  356 — Resources: resources_platform_metrics_daily + compute_resources_platform_metrics() pg_cron 04:30
  357 — SEO: seo_platform_metrics_daily + compute_seo_platform_metrics() pg_cron 05:00
  358 — Signal: article_intelligence_scores (composite 0-100, 5 bands)
  359 — Marketplace: marketplace_platform_metrics_daily + marketplace_search_events + pg_cron 06:00
  360 — Bookings: bookings_platform_metrics_daily + compute_bookings_platform_metrics() pg_cron 06:30
  361 — Listings: listings_platform_metrics_daily + compute_listings_platform_metrics() pg_cron 07:00
  362 — Financials: financials_platform_metrics_daily + compute_financials_platform_metrics() pg_cron 07:30
  363 — VirtualSpace: virtualspace_platform_metrics_daily + compute_virtualspace_platform_metrics() pg_cron 08:00

pg_cron schedule (Phase 3 intelligence jobs, all UTC):
  04:30 Resources  05:00 SEO  05:30 CaaS  06:00 Marketplace  06:30 Bookings
  07:00 Listings   07:30 Financials       08:00 VirtualSpace  08:30 Referral

Phase 4 — Knowledge, Intent, Context & Learning
  373 — Agent Spaces: agent_spaces table + space_id FK on agent_teams
  376 — Platform Knowledge: platform_knowledge_chunks (768-dim vector, 18 categories, match_platform_knowledge_chunks RPC)
  377 — Decision Rationale: decision_rationale JSONB on workflow_executions, decision_outcomes, process_autonomy_config + 3 pg_cron jobs
  378 — Autonomy Calibrator: autonomy-calibrator agent (weekly Mon 10:00 UTC) + query_network_intelligence + query_autonomy_calibration tools

Phase 5 — Process Mining Enhancement
  379 — Conformance: conformance_deviations + process_patterns tables + perf indexes + query_process_patterns tool
  380 — Growth Pro Subscriptions (renumbered from duplicate 343)
  381 — Growth Scores pg_cron: compute_growth_scores() every 30min; fix compute_ai_adoption_platform_metrics()
  382 — Activate Scheduled Agents: market-intelligence, retention-monitor, operations-monitor; Marketing space

Phase 6 — Unified Execution Substrate (CAS → DevOps Team)
  383 — CAS → DevOps rename: cas-team slug → devops-team, assigned to engineering space
  384 — DevOps Team agent configs: 9 agents with production system prompts
  385 — Soft-deprecate cas_* tables: deprecated_at column on 5 tables (hard DELETE eligible 2026-06-11)

Phase 7 — Agent Episodic Memory
  386 — Memory tables: memory_episodes (vector(768) HNSW) + memory_facts (subject/relation/object) + match RPCs

Phase 8 — MCP Integration Framework
  387 — MCP core: mcp_connections + mcp_tool_catalog (with CASCADE) + mcp-health-check pg_cron (every 5 min)
  388 — MCP audit: mcp_tool_executions table
  389 — workflow_exceptions: unified exception queue (source, severity, claimed_by, resolution lifecycle)
```

---

## Agent Catalog

All Agents registered in the Conductor Registry. Seeded in migration 348.

### Specialist Agents (Phase 2)

Eight specialist agents pre-seeded (8 CAS built-ins with `built_in = true`, plus any admin-created custom agents). Each config drives the system prompt, tool set, and schedule.

#### Market Intelligence Agent

```json
{
  "slug": "market-intelligence",
  "name": "Market Intelligence Agent",
  "description": "Analyses booking trends, subject demand signals, price benchmarks, and competitive positioning. Runs daily. Surfaces top-3 actionable insights in Admin Intelligence daily brief.",
  "schedule": "0 6 * * *",
  "tools": [
    "query_booking_volume_by_subject", "query_price_distribution",
    "query_listing_conversion_rates", "query_search_query_log",
    "query_marketplace_health", "query_supply_demand_gap",
    "query_listing_health", "query_pricing_intelligence",
    "query_seo_health", "query_keyword_opportunities",
    "query_content_attribution", "query_resources_health",
    "query_editorial_opportunities", "query_virtualspace_health",
    "flag_exception"
  ],
  "system_prompt_template": "You are a market intelligence analyst for Tutorwise, a UK tutoring marketplace. Your role is to identify demand-supply imbalances, emerging subjects, pricing anomalies, and conversion bottlenecks. You also monitor the content marketing pipeline (Resources → SEO → Signal → Marketplace → Bookings). Provide specific, actionable insights. When you flag an exception, include confidence score and supporting evidence count.",
  "output_format": "structured_json",
  "autonomy_level": "supervised",
  "alert_threshold": { "confidence": 75, "evidence_count": 3 }
}
```

**Tools it calls** (Phase 3 intelligence layer — see individual specs):
- `query_marketplace_health` — supply/demand balance, search funnel, AI adoption
- `query_supply_demand_gap` — subjects with high demand and low supply
- `query_listing_health` — listing quality distribution, stale/dead listings
- `query_pricing_intelligence` — P25/median/P75 pricing by subject+level
- `query_seo_health` — keyword rankings, content decay, backlink health
- `query_keyword_opportunities` — high-value uncaptured keyword targets
- `query_content_attribution` — article→listing→booking flywheel health, Article Intelligence Score
- `query_resources_health` — content pipeline velocity, SEO readiness, hub coverage gaps
- `query_editorial_opportunities` — hub keyword gaps, uncovered spoke topics
- `query_virtualspace_health` — session adoption, completion rates, free-help conversion
- `query_booking_volume_by_subject` — last 30d vs prior 30d, grouped by subject
- `query_price_distribution` — p25/p50/p75 prices per subject, vs agent baseline
- `query_search_query_log` — unanswered search queries (zero results returned)
- `flag_exception` — writes to `workflow_exceptions` with AI recommendation

#### Financial Analyst Agent

```json
{
  "slug": "financial-analyst",
  "name": "Financial Analyst Agent",
  "description": "Reviews commission calculations, payout anomalies, and revenue splits. Runs weekly (Friday 09:00). Verifies handle_successful_payment output against expected referral splits.",
  "schedule": "0 9 * * 5",
  "tools": ["query_payout_transactions", "query_commission_splits", "query_stripe_reconciliation", "flag_exception"],
  "system_prompt_template": "You are a financial analyst for Tutorwise. Your job is to detect payout anomalies, verify commission splits, and surface revenue risks. A correct referral split is 80% tutor / 10% platform / 10% referrer. Direct bookings are 90% tutor / 10% platform. Any deviation is an exception.",
  "output_format": "structured_json",
  "autonomy_level": "supervised",
  "alert_threshold": { "confidence": 90, "evidence_count": 1 }
}
```

**Alert examples it surfaces**:
- Payout amount deviates >2% from expected split
- Tutor has pending commission >14 days unpaid
- Stripe reconciliation gap: `stripe_amount != sum(commissions)` for payout batch

#### Operations Monitor Agent

```json
{
  "slug": "operations-monitor",
  "name": "Operations Monitor Agent",
  "description": "Monitors platform health: at-risk tutors (inactivity, low ratings), session completion rates, support queue depth. Runs every 6 hours.",
  "schedule": "0 */6 * * *",
  "tools": ["query_tutor_activity", "query_session_completion_rates", "query_support_queue", "query_rating_trends", "query_caas_health", "flag_exception"],
  "system_prompt_template": "You are a platform operations monitor for Tutorwise. Identify tutors at risk of churning (no sessions in 30 days, declining ratings, incomplete profiles). Identify operational anomalies: session completion rates <85%, support queue >50 open tickets, rating average dropping >0.5 in 14 days.",
  "output_format": "structured_json",
  "autonomy_level": "supervised",
  "alert_threshold": { "confidence": 70, "evidence_count": 2 }
}
```

**At-risk tutor criteria**:
- No session in last 30 days AND had session in prior 60 days
- Rating dropped from >4.5 to <4.0 in last 14 days
- Profile completeness <60% AND has an active listing
- Growth Score dropped >20 points in 30 days

#### Retention Monitor Agent

```json
{
  "slug": "retention-monitor",
  "name": "Retention Monitor Agent",
  "description": "Platform-level retention and funnel analytics for admins. Analyses cohort retention, referral funnel conversion, tutor supply vs demand gaps, and org partnership health. Not related to the user-facing Growth Advisor product.",
  "schedule": "0 8 * * *",
  "tools": [
    "query_cohort_retention", "query_referral_funnel",
    "query_supply_demand_gap", "query_org_health",
    "query_booking_health", "query_financial_health",
    "flag_exception"
  ],
  "system_prompt_template": "You are a retention and funnel analyst for Tutorwise admin. You monitor platform-level health signals. Key metrics: weekly cohort retention (target >60% at week 4), referral funnel K coefficient (target K > 0.15), booking cancellation rate (target <10%), financial clearing health (no stalls >14 days), subject supply gaps (demand >2x supply), org renewal rate (target >80%).",
  "output_format": "structured_json",
  "autonomy_level": "supervised",
  "alert_threshold": { "confidence": 75, "evidence_count": 3 }
}
```

### DevOps Team (Conductor — Teams Registry)

> **Renamed from CAS Team** in migration 383 (2026-03-11). Slug: `devops-team`. Assigned to `engineering` space.

The DevOps Team is a pre-configured Supervisor Team (9 agents) running on **TeamRuntime v2** (LangGraph StateGraph + PostgresSaver). It surfaces in the Teams tab of Conductor Registry. Team topology is DB-editable from the Team canvas. All 9 agents have production-quality system prompts (migration 384). HITL support: supervisor can pause for admin approval via `interrupt()`.

| Agent in DevOps Team | Slug | Role | Trigger | Autonomy |
|-------|------|------|---------|----------|
| Director | `director` | Supervisor — orchestrates the team; routes tasks to specialists | On new task submission | Autonomous |
| Analyst | `analyst` | Analyses requirements; produces structured spec | Director assigns | Autonomous |
| Planner | `planner` | Plans implementation steps; creates task breakdown | Analyst produces spec | Autonomous |
| Developer | `developer` | Writes code changes; produces PR diff | Planner creates plan | Autonomous |
| Tester | `tester` | Writes unit + integration tests | Developer produces code | Autonomous |
| QA | `qa` | Reviews code quality; produces QA report | Tester produces tests | Supervised |
| Security | `security` | Runs security scan (OWASP, injection, auth) | QA report | Supervised |
| Engineer | `engineer` | Applies code changes to codebase | Security clears | **Exception Queue** |
| Marketer | `marketer` | Produces changelog + release notes | Engineer applies | Autonomous |

**Pattern**: Supervisor (Director coordinates). `engineer` is Exception Queue because any apply-to-prod action requires explicit admin approval.
**Runtime**: TeamRuntime v2 — LangGraph StateGraph + PostgresSaver checkpointing + CircuitBreaker + HITL interrupt()/resume().
**Episodic Memory**: Each agent has access to `memory_episodes` and `memory_facts` via AgentMemoryService (Phase 7).

---

## API Surface Reference

Complete list of HTTP routes introduced or modified by Conductor across all phases.

### Phase 1 — Conductor Consolidation

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/workflow/processes` | Admin | List all workflow processes with execution modes |
| `POST` | `/api/admin/workflow/processes` | Admin | Create new workflow process (from template) |
| `PATCH` | `/api/admin/workflow/processes/[id]/execution-mode` | Admin | Toggle shadow/live/design mode |
| `GET` | `/api/admin/workflow/processes/[id]/versions` | Admin | List process version history |
| `POST` | `/api/admin/workflow/processes/[id]/publish` | Admin | Publish current canvas as new version |
| `POST` | `/api/admin/workflow/execute/start` | Admin | Start workflow execution |
| `GET` | `/api/admin/workflow/execute/[executionId]` | Admin | Get execution status + task list |
| `DELETE` | `/api/admin/workflow/execute/[executionId]` | Admin | Cancel running execution |
| `POST` | `/api/admin/workflow/execute/[executionId]/resume` | Admin | Resume paused execution |
| `POST` | `/api/admin/workflow/execute/task/[taskId]/complete` | Admin | Complete HITL task (approve/reject) |
| `GET` | `/api/admin/workflow/exceptions` | Admin | List exception queue (filterable by domain/severity) |
| `POST` | `/api/admin/workflow/exceptions/[id]/claim` | Admin | Claim exception for review |
| `POST` | `/api/admin/workflow/exceptions/[id]/resolve` | Admin | Resolve exception with resolution text |
| `POST` | `/api/webhooks/workflow` | Webhook secret | Supabase DB webhook receiver |

### Phase 2 — Agents + Teams

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/agents` | Admin | List all Agents in registry |
| `POST` | `/api/admin/agents` | Admin | Register new Agent |
| `PUT` | `/api/admin/agents/[id]` | Admin | Update Agent config |
| `DELETE` | `/api/admin/agents/[id]` | Admin | Deactivate Agent |
| `POST` | `/api/admin/agents/[id]/run` | Admin | Trigger on-demand Agent run |
| `GET` | `/api/admin/agents/[id]/runs` | Admin | List recent Agent runs with outputs |
| `GET` | `/api/admin/teams` | Admin | List all Teams in registry |
| `POST` | `/api/admin/teams` | Admin | Create new Team (save topology from canvas) |
| `PUT` | `/api/admin/teams/[id]` | Admin | Update Team topology / config |
| `DELETE` | `/api/admin/teams/[id]` | Admin | Deactivate Team (system Teams protected) |
| `POST` | `/api/admin/teams/[id]/run` | Admin | Trigger on-demand Team run |
| `GET` | `/api/admin/teams/[id]/runs` | Admin | List recent Team runs with `agent_team_run_outputs` |
| `GET` | `/api/admin/tools` | Admin | List registered tools in tool registry |
| `POST` | `/api/admin/tools` | Admin | Register new tool with schema validation |
| `DELETE` | `/api/admin/tools/[id]` | Admin | Deactivate tool |
| `GET` | `/api/agents/[type]/session` | User | Start conversational agent session |
| `POST` | `/api/agents/[type]/stream` | User | Stream agent response |
| `GET` | `/api/agents/[type]/subscription` | User | Check subscription status for agent |
| `POST` | `/api/workflow/execute/start` | User | User-scoped HITL workflow trigger |

### Phase 3 — Intelligence Layer

> **Note:** The original spec planned centralised `/api/admin/intelligence/*` and `/api/admin/analytics/*` routes.
> The actual implementation uses **14 domain-specific intelligence endpoints** at `/api/admin/{domain}/intelligence`.
> Platform events bus and platform console were deferred — their functionality is covered by Admin Operations (Phase 9).

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/caas/intelligence` | Admin | CaaS health metrics (via `query_caas_health` tool) |
| `GET` | `/api/admin/resources/intelligence` | Admin | Resources health (articles, readiness scores) |
| `GET` | `/api/admin/seo/intelligence` | Admin | SEO health (rankings, traffic, keywords) |
| `GET` | `/api/admin/signal/intelligence` | Admin | Signal intelligence (platform analytics) |
| `GET` | `/api/admin/bookings/intelligence` | Admin | Booking pipeline health |
| `GET` | `/api/admin/listings/intelligence` | Admin | Listing health (completeness, conversions) |
| `GET` | `/api/admin/financials/intelligence` | Admin | Financial health (revenue, payouts, disputes) |
| `GET` | `/api/admin/virtualspace/intelligence` | Admin | VirtualSpace session metrics |
| `GET` | `/api/admin/referrals/intelligence` | Admin | Referral funnel metrics |
| `GET` | `/api/admin/retention/intelligence` | Admin | Retention cohort metrics |
| `GET` | `/api/admin/ai/intelligence` | Admin | AI adoption metrics |
| `GET` | `/api/admin/organisations/intelligence` | Admin | Org conversion metrics |
| `GET` | `/api/admin/network/intelligence` | Admin | Network intelligence (referral depth, velocity) |
| `GET` | `/api/admin/marketplace/intelligence` | Admin | Marketplace supply/demand gap |

### Phase 4 — Knowledge + Learning

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/platform/user-context/[profileId]` | Auth | PlatformUserContext fetch (Redis-cached 5 min) |
| `POST` | `/api/platform/intent` | Auth | Intent classification for Operations query |
| `GET` | `/api/admin/conductor/knowledge` | Admin | List platform knowledge chunks |
| `POST` | `/api/admin/conductor/knowledge` | Admin | Add knowledge chunk |
| `DELETE` | `/api/admin/conductor/knowledge/[id]` | Admin | Remove knowledge chunk |
| `GET` | `/api/admin/autonomy` | Admin | Per-process autonomy config + accuracy |
| `PATCH` | `/api/admin/autonomy/[processId]` | Admin | Approve/reject tier calibration proposal |
| `GET` | `/api/admin/network` | Admin | Network intelligence (referral depth, velocity) |

### Phase 5 — Process Mining

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/conductor/workflows/[id]/analytics` | Admin | Process analytics (paths, cycle times, conformance) |
| `GET` | `/api/admin/conductor/workflows/[id]/conformance` | Admin | Conformance report with deviation list |
| `GET` | `/api/admin/conductor/workflows/[id]/shadow` | Admin | Shadow vs live comparison + go-live checklist |
| `POST` | `/api/admin/conductor/workflows/[id]/promote` | Admin | Promote shadow process to live mode |

### Phase 6 — TeamRuntime v2 + HITL

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/admin/teams/[id]/runs/[runId]/resume` | Admin | Resume HITL-paused team run (approve/reject) |
| `GET` | `/api/admin/teams/runs` | Admin | List all team runs across teams (with status filtering) |
| `GET` | `/api/admin/cas/agents/status` | Admin | Agent status check (legacy — redirects internally) |
| `POST` | `/api/admin/cas/resume-workflow` | Admin | Resume CAS workflow (legacy — delegates to TeamRuntime) |

### Phase 7 — Agent Episodic Memory

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/agents/[id]/memory` | Admin | Fetch agent's episodic memory (episodes + facts) |

### Phase 8 — MCP Integration Framework

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/mcp/connections` | Admin | List all MCP server connections |
| `POST` | `/api/admin/mcp/connections` | Admin | Register new MCP server connection |
| `GET` | `/api/admin/mcp/connections/[id]` | Admin | Get MCP connection details |
| `PUT` | `/api/admin/mcp/connections/[id]` | Admin | Update MCP connection config |
| `DELETE` | `/api/admin/mcp/connections/[id]` | Admin | Remove MCP connection |
| `POST` | `/api/admin/mcp/connections/[id]/sync` | Admin | Sync tool catalog from MCP server |
| `GET` | `/api/admin/mcp/tools` | Admin | List all MCP tools (across connections) |
| `PUT` | `/api/admin/mcp/tools/[id]` | Admin | Enable/disable MCP tool |
| `GET` | `/api/admin/mcp/executions` | Admin | List MCP tool execution history |

### Phase 9 — Admin Operations

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/operations/brief` | Admin | AI-generated daily operations brief (cached, ?refresh=true to regenerate) |
| `GET` | `/api/admin/operations/health` | Admin | Platform health stats (workflows, agents, exceptions, HITL) |
| `GET` | `/api/admin/operations/exceptions` | Admin | List exceptions (filterable by status, severity, source) |
| `GET` | `/api/admin/operations/exceptions/[id]` | Admin | Get exception detail |
| `PATCH` | `/api/admin/operations/exceptions/[id]` | Admin | Claim, resolve, or dismiss exception |

---

## Risk Register

Risks that could derail the build. Mitigations are mandatory before phase sign-off.

| Risk | Probability | Impact | Phase | Mitigation |
|------|-------------|--------|-------|------------|
| LangGraph checkpointer connection pool exhaustion | Medium | High | Phase 1 | Use `POSTGRES_URL_NON_POOLING` (port 5432, session mode). Add connection_limit guard. Monitor pg_stat_activity. |
| ~~CAS WorkflowVisualizer ReactFlow props incompatible~~ | ~~Medium~~ | ~~Medium~~ | ~~Phase 1~~ | **Resolved** — CAS runtime retired in Phase 6D. No merge needed; CAS canvas decommissioned. |
| Analyst agent tool queries return stale data | Low | Medium | Phase 2 | All tools query Supabase directly. No caching. Add `query_freshness_check` to agent system prompt context. |
| Agent run cost spike (frontier model called unexpectedly) | Medium | Medium | Phase 2 | AI tier routing enforced in orchestrator. No direct frontier model call without task classification step. |
| platform_events table grows unbounded | High | Medium | Phase 3 | Partition by month from day 1 (migration 344). pg_cron prune job drops partitions >12 months old (aligned with GDPR retention). Initial 4 monthly partitions created in migration DDL. |
| pipeline_jobs DLQ fills up silently | Medium | High | Phase 3 | Platform Console shows queue depth in real-time. Alert if >100 jobs in `failed` status. |
| Growth Score formula disagrees with tutor intuition | Low | High | Phase 3 | Run Growth Score in shadow for 30 days before showing to tutors. Admin validation gate before user rollout. |
| PlatformUserContext Redis cache staleness (5 min) | Low | Low | Phase 4 | Acceptable for conversational context. Booking/payment data re-fetched on tool call, not from cache. |
| Learning loop proposes wrong tier expansion | Low | High | Phase 4 | Tier expansions always require admin approval. Auto-downgrades are instant and reversible. 14-day observation window before any proposal. |
| Shadow Booking Lifecycle divergence >10% at go-live | Medium | High | Phase 5 | Go-live checklist gate (enforced in UI). All divergences reviewed. 30-day minimum shadow period. |
| Conformance engine marks valid paths as deviant | Medium | Medium | Phase 5 | Allow-list patterns per process. Admin can mark deviation as "expected path" to update the baseline. |
| GDPR Article 22 non-compliance (automated decisions) | Low | Critical | Phase 1 | `decision_rationale jsonb` + human override for all `autonomous` tier decisions. Article 22 notice in `/legal/automated-decisions`. SAR endpoint live. |
| Redis not provisioned (required for Phase 3+ caching) | High | Medium | Phase 3 | Upstash serverless Redis. Free tier sufficient for Phase 3 volumes. Add `REDIS_URL` to env before Phase 3 begins. Mitigation: admin query caching is optional — fall back to no-cache if Redis unavailable. |
| TeamRuntime dynamic StateGraph compilation fails on invalid topology | Medium | High | Phase 2 | Validate `agent_teams.nodes` + `edges` on save (no orphan nodes, no cycles in Pipeline, coordinator_slug present for Supervisor). Return validation errors in save API before persisting. |
| Multi-agent Team cost spike (chained frontier model calls) | Medium | High | Phase 2 | Teams inherit Agent-level AI tier routing. Supervisor coordinator uses `medium` tier (Claude Sonnet). Specialists default to `cheap` tier unless overridden. Max rounds cap (configurable per team, default 10). |

---

## Operational Runbooks

Short playbooks for the most common admin operations after Conductor is live.

### Runbook 1: Deploying a New Agent

1. Navigate to `/admin/conductor` → **Agents** tab.
2. Click **+ New Agent** — opens Agent Config form.
3. Fill slug (kebab-case), name, description, schedule (cron syntax), system prompt.
4. Add tools from Tool Registry dropdown. Each tool shows its schema.
5. Set autonomy level: `supervised` for new agents (production validation first).
6. Click **Save as Draft** — agent is created in `specialist_agents` with `status='draft'`.
7. Click **Run Now** — triggers one manual run. Review output in Run History tab.
8. If output is correct: click **Activate** — sets `status='active'`, enables cron.
9. After 7 days, review run history. If all correct: promote autonomy to `autonomous`.
10. Agent appears in Admin Intelligence daily brief after first successful cron run.

### Runbook 2: Promoting a Shadow Process to Live

Pre-conditions (enforced by UI go-live checklist):
- Divergence rate < 10% for last 30 days
- Shadow mode running ≥ 30 days
- All divergences marked reviewed
- Admin Intelligence tier calibration approved
- Rollback procedure documented in process metadata

Steps:
1. `/admin/conductor/workflows/[id]/shadow` — review go-live checklist.
2. Review all divergent executions. For each: mark "expected" or "fix required".
3. If fix required: edit process canvas, republish version, run in shadow for 7 more days.
4. When checklist is green: click **Promote to Live**.
5. Execution mode changes from `shadow` to `live` (PATCH `/api/admin/conductor/workflows/[id]/execution-mode`).
6. First live execution triggers within 24h (next webhook or cron event).
7. Monitor Platform Console for anomalies for 48h post-promotion.

### Runbook 3: Handling an Exception Queue Item

1. `/admin/conductor` → **Exception Queue** tab.
2. Filter by severity (Critical first). Items unclaimed for >48h are highlighted red.
3. Click **Claim** — soft-locks the item for 15 minutes.
4. Review: AI recommendation + confidence score + evidence count + execution context.
5. Options:
   - **Approve AI recommendation**: click Approve — workflow resumes with AI-suggested path.
   - **Override**: choose different action manually — requires reason text.
   - **Escalate**: route to another admin. Adds note to exception log.
6. Resolution is logged in `workflow_exceptions.resolution`.
7. If same pattern recurs >3x: flag for process design review (add route to process canvas).

### Runbook 5: Creating a New Multi-Agent Team

1. Navigate to `/admin/conductor` → **Teams** tab.
2. Click **+ New Team** — canvas opens in Team mode.
3. Select pattern: **Supervisor** (recommended for most cases), **Pipeline**, or **Swarm**.
4. Drag Agent tiles from the palette onto the Team canvas:
   - Use existing Agents from the registry, OR
   - Create a new Agent inline from the node property panel (saves to `specialist_agents` + adds to team)
5. Set `output_key` for each Agent in the property panel (e.g. `demand`, `pricing`, `competitive`).
6. For **Supervisor**: designate the coordinator Agent. Connect specialists to it with routing edges.
7. For **Pipeline**: connect Agents left-to-right. Add conditional branch edges if needed.
8. For **Swarm**: connect any Agent to any other with handoff edges. No coordinator needed.
9. Click **Save as Draft** → topology saved to `agent_teams` table. Validation runs (orphan nodes, missing coordinator, cycles in Pipeline).
10. Click **Run Now** — TeamRuntime compiles the StateGraph from DB and executes. Review `team_result` in Run History.
11. If output is correct: click **Activate** — Team is ready for scheduled or on-demand runs.
12. To use in a Workflow: drag an `action` node, select handler `cas_agent`, set `team_slug` instead of `agent_slug`.

### Runbook 4: Responding to an Autonomy Tier Downgrade

Trigger: Admin Intelligence auto-downgrades a process tier from `autonomous` → `supervised` because rolling 30-day accuracy dropped below threshold.

1. Email/notification arrives: "Tutor Approval accuracy dropped to 82% (threshold: 90%). Process downgraded to Supervised."
2. Navigate to `/admin/conductor/autonomy` — see the process and its recent decision_outcomes.
3. Drill into failed decisions: what was the AI recommendation vs actual admin decision?
4. Common causes:
   - Edge case in training data (e.g. new tutor type the model hasn't seen)
   - Policy change not reflected in process config
   - Data quality issue (null values in CaaS score)
5. Fix root cause (update process config, refresh knowledge chunks, or fix data pipeline).
6. Monitor in Supervised mode for 14 days. If accuracy recovers, Admin Intelligence will propose re-expansion.
7. Admin approves re-expansion via `/admin/conductor/autonomy` — tier returns to `autonomous`.

---

## Build Sequence

```
CONDUCTOR BUILD SEQUENCE v3.4

  ✅ DONE                           Phase 1 (Now)
  ─────────────────────             ─────────────────────────────────────
  Conductor designer (ReactFlow)  Node palette sidebar
  PlatformWorkflowRuntime           Merge ExecutionCanvas → overlay
  5 live/shadow workflows           CAS WorkflowVisualizer → Studio canvas
  CAS Team (9 agents, code)         Handler schema registry + form UI
  HITL ApprovalDrawer               Workflow versioning (migration 347)
  Shadow mode                       Workflow validation
  Process Discovery                 Admin Operations redesign
  LangGraph checkpointing           Migration 346 production fixes
                                    Cross-workflow coordination
                                    Bridge files (growth, workflow)
                                    Template CRUD from UI

  Phase 2 (After Phase 1)           Phase 3 (After Phase 2)
  ─────────────────────────         ─────────────────────────────────────
  AGENTS:                           platform_events table + bus
    Agent node type (8th)           Knowledge Pipeline 1 (async)
    Registry panel (Agents tab)     Knowledge Pipeline 2 (async)
    Tool Registry (DB-backed)       pipeline_jobs queue + pg_cron
    Agent templates + seeding       Admin Intelligence Agent
    Agent deployment + chat UI      AI tier routing
    Growth Advisor migration          Admin Operations redesign
    Unified agent_subscriptions     Lexi admin mode
    Parameterised /api/agents/[type]AI cost attribution table
    Agent → Workflow integration    Real-time monitoring WebSocket
  TEAMS:                            Analytics dashboard (3 tabs)
    Team node type (9th)
    Teams tab in Registry
    AgentTeamState interface
    TeamRuntime (dynamic StateGraph)
    Supervisor / Pipeline / Swarm
    Inline Agent creation in canvas
    Teams invocable from Workflows
    CAS Team read-only exposure
    agent_teams + agent_team_run_outputs (migration 352)

  Phase 4 (After Phase 3)           Phase 5 (After Phase 4)
  ─────────────────────────         ─────────────────────────────────────
  Platform Knowledge Base           Conformance checking
  Intent Detection                  Process mining analytics
  PlatformUserContext API           Pattern detection
  Cross-agent handoffs              Value Stream Designer
  Learning loop (decision_outcomes) Shadow mode monitoring
  process_autonomy_config           Go-live checklist
  Tier calibration UI               Divergence detection dashboard
  Network Intelligence page
  Growth scores (migration 345)
```

## Total Estimates

| Phase | What | Hours | Priority |
|-------|------|-------|---------|
| **Phase 1** | Consolidation: fix designer, merge monitoring, cross-workflow coordination, bridge files | 80–90h | **Now** |
| **Phase 2** | Conductor — Agents + Teams: agent node, registry, tool registry, deployment, templates, Growth Advisor migration, TeamRuntime, three patterns | 130–140h | **Next** (primary goal) |
| **Phase 3** | Intelligence: platform events, knowledge pipelines, admin AI, analytics, monitoring | 90–110h | After Phase 2 |
| **Phase 4** | Knowledge base, intent detection, PlatformUserContext, learning loop | 60–70h | After Phase 3 |
| **Phase 5** | Process mining enhancement, conformance checking, go-live monitoring | 25–35h | After Phase 4 |
| **Phase 5B** | Build Canvas — Agent Registry visual editor (Spaces → Teams → Agents), BuildPalette, BuildPropertiesDrawer | 30–40h | After Phase 2 |
| **Phase 6** | TeamRuntime v2 (LangGraph StateGraph), CAS decommission, DevOps Team migration, governance integration | ~58h | After Phase 5B |
| **Total** | | **473–543h** | |

### Detailed Phase 1 Task Table

| Task | Hours | Notes |
|------|-------|-------|
| Node palette sidebar with drag-to-canvas | 10 | Left panel groups: Triggers / Actions / Decisions / Human / Flow / Agents |
| Merge ExecutionCanvas → design canvas overlay | 8 | Remove `ExecutionCanvas.tsx`. `showLiveOverlay` toggle. Node border colour via Supabase Realtime. |
| CAS WorkflowVisualizer → Conductor canvas tab | 6 | Move from `cas/packages/core/src/admin/`. `/admin/cas/workflow-fullscreen` removed. |
| Conditional edge labels (Yes / No / If / Else) | 4 | Extend ProcessEdgeData with `label?`. Badge at edge midpoint. |
| Handler schema registry + form-based config UI | 8 | Replace free-form JSON. Registry maps handler → required fields. Dynamic form. |
| Process versioning (migration 347) | 6 | `workflow_process_versions` table. Snapshot on publish. Rollback. Auto-save 5 min → `draft_nodes/draft_edges` columns (not a version row). |
| Workflow validation (pre-publish checks) | 4 | Block publish if: no trigger, no end, orphan nodes, condition single edge. Warn if: no description. |
| Admin Operations redesign | 8 | AI brief widget, exception queue (claimed_by), autonomous ops summary, Lexi query bar |
| Navigation reframe (admin sidebar) | 4 | Autonomy-first structure. Domain pages move to Management section. |
| Template CRUD from UI | 6 | Save as template, clone, edit metadata, delete (system templates protected) |
| Migration 346 production fixes | 4 | Dedup index, DLQ retry pg_cron, fallback polling pg_cron |
| Cross-workflow coordination | 6 | `workflow_entity_cooldowns` table. Check in `trigger-workflow.ts`. Cooldown for nudge-type workflows. |
| Bridge files (growth-bridge.ts, workflow-bridge.ts) | 5 | Publish to platform_events. Enqueue pipeline jobs on scan completed. |
| Shared agent tools (`agent-tools/`) | 3 | `get-executions`, `trigger-workflow`, `list-approvals`, `approve-task`, `get-divergences` |
| Remove dead code (ExecutionCanvas, ShadowDivergencePanel) | 2 | Delete files. Verify build. |
| **Total** | **84h** | |

### Detailed Phase 2 Task Table

| Task | Hours | Notes |
|------|-------|-------|
| `agent` node type (8th) in Conductor | 8 | New node in palette. Property panel: full SpecialistAgentConfig. Renders as agent card on canvas. |
| Agent Registry panel (`/admin/conductor/agents`) | 8 | List all Agents. Add/Configure/Monitor/Remove actions. |
| Tool Registry backend (`analyst_tools` DB + TypeScript functions) | 10 | DB-backed registry. Register/validate/test tools. Category: data_query/platform_action/calculation. |
| Tool Registry UI | 5 | List tools, register new, enable/disable, test with sample input. |
| Seed specialist agent templates (4 standard + custom) | 6 | Market Intelligence, Financial Analyst, Operations Monitor, Retention Monitor. `agent_templates` table. |
| Agent deployment (save to `specialist_agents` + pg_cron schedule) | 8 | Save from canvas → DB. pg_cron fires → agent runs → agent_run_outputs. |
| Agent chat interface (`/admin/conductor/agents/[slug]`) | 6 | Direct chat with deployed Agent. `getAIService().stream()` with agent config + tools. |
| Agent Template Gallery (load pre-built team configs) | 5 | Load from `agent_templates`. Preview before deploy. |
| Agent → workflow integration (extend `cas_agent` handler) | 5 | Handler dropdown shows `specialist_agents` (all, including built-ins). Config: `{agent_slug, prompt_template, output_field}`. |
| `specialist_agents` + `agent_run_outputs` + `agent_templates` tables (migration 348) | 3 | DB schema. Indexes. |
| `agent_subscriptions` unified table + zero-downtime migration (migration 349) | 8 | Replace `sage_pro_subscriptions`. Deploy separately. Shadow write period 24h. Cutover. |
| Parameterised `/api/agents/[agentType]/` routes | 6 | Replace per-agent routes. All agents via single parameterised handler. |
| Shared `<AgentChatUI agentType="..." platformContext={...} />` | 4 | Single reusable chat component for all agent types. |
| Conductor new workflows: Org Onboarding + Stuck Referral Recovery | 8 | Conductor Workflow definitions. Trigger: org created / referral stale 7d. |
| Conductor new workflows: Listing Quality Nudge + Org Dormancy | 6 | Conductor Workflow definitions. Trigger: Growth Score < 40 / org dormant 60d. |
| Growth Advisor migration (skill files → agent knowledge, route deprecation) | 6 | Convert 5 skill files to Growth Advisor `agent_templates` config. Add deprecation redirects on `/api/growth-agent/*` → `/api/agents/growth/*`. Delete `apps/web/src/lib/growth-agent/` after 30-day deprecation period. |
| **Subtotal — Agents** | **102h** | |
| **(+ Teams — see §2I task table)** | **+38h** | Subtotal from §2I Teams tasks. |
| **Phase 2 Total** | **~140h** | |

### Conductor New Workflows (Phase 2)

```
CONDUCTOR ADDS — 4 NEW SUPERVISED WORKFLOWS

  ORGANISATION ONBOARDING
  Trigger: organisation created + admin accepted
  Steps:
    welcome email → profile completion check
      ├── Complete? → auto-approve + setup guide
      └── Incomplete? → HITL review → conditional approve

  STUCK REFERRAL RECOVERY
  Trigger: referral signed up 7 days ago, profile < 50% complete
  Steps:
    Growth Score check → nudge sequence (email day 1, in-app day 3)
      ├── Profile completes? → referral.converted event
      └── 14d no action? → flag to admin as ghost signup

  LISTING QUALITY NUDGE
  Trigger: pg_cron every 4h, Growth Score < 40 AND listing_last_view > 14d
  Steps:
    AI quality brief generated → in-app notification
    Cooldown: same listing not nudged again for 7d

  ORG DORMANCY RE-ENGAGEMENT
  Trigger: pg_cron daily, org with no bookings for 60 days + >£1000 LTV
  Steps:
    AI engagement brief → supervised email draft (admin approves)
      ├── Admin approves → send
      └── 90d no bookings? → mark inactive
```

---

## What Gets Removed vs Built

### Remove (do this in Phase 1 before building anything new)

| Item | Action |
|------|--------|
| `ExecutionCanvas.tsx` | Delete. Replace with execution overlay on design canvas. |
| `ShadowDivergencePanel.tsx` | Delete skeleton. Rebuild properly in Phase 1C monitoring. |
| `/admin/cas` route and dashboard | Delete. Agent/runtime data moves to unified `/admin/conductor`. |
| Growth Advisor standalone code (`apps/web/src/lib/growth-agent/`) | Migrate then remove. Convert 5 skill files to Growth Advisor agent knowledge. Deprecate `/api/growth-agent/*` routes → redirect to `/api/agents/growth/*`. Delete after unified routes verified. |
| "agents-core shared package" extraction plan from v2 | Cancel. CAS `AgentRuntimeInterface` already provides this abstraction. No duplication needed. |

### What Changes Role

| Item | Current role | New role |
|------|-------------|---------|
| CAS 9 agents (Director, Developer, etc.) | Described as "build pipeline" dev tools | Exposed as the **CAS Team** (Supervisor pattern) in Conductor Teams registry — configurable, monitorable from UI |
| CAS WorkflowVisualizer | `/admin/cas/workflow-fullscreen` standalone page | Canvas tab within Conductor — same ReactFlow nodes, merged into one admin |
| `/admin/cas` dashboard | Separate CAS product dashboard | Data surfaces in Conductor Monitoring tab |
| `cas_agent` action handler | Invokes hardcoded CAS agents | Invokes any registered **Agent** or **Team** by slug |
| CAS LangGraph runtime | CAS-specific | Shared backbone for all Agents and Teams (via TeamRuntime + existing AgentRuntimeInterface) |
| Market Intelligence, Financial Analyst, Operations Monitor, Retention Monitor | Never built (standalone architecture) | **Agent** templates seeded in `specialist_agents` — run from Conductor, no separate UI needed |

### What Stays Unchanged

| Item | Reason |
|------|--------|
| `PlatformWorkflowRuntime` | Ahead of Fuschia. Production-ready. Keep. |
| All 11 handlers | Solid. Extend registry. |
| HITL ApprovalDrawer | Ahead of Fuschia. Keep. |
| Shadow mode (design/shadow/live) | Unique to Tutorwise. Keep. |
| Process Discovery (4 phases) | Ahead of Fuschia. Keep and enhance in Phase 5. |
| 5 seeded workflow processes | Keep. |
| ChatPanel (AI mutations) | Keep. |
| LangGraph checkpointing | Ahead of Fuschia. Keep. |

---

## Growth Score — Worked Examples

Concrete calculations for all 4 role types, to validate the formula against real data before going live.

### Example: Tutor — High Performer (target: 85+)

Sarah. Maths tutor. London.

```
profile_completeness  (0–25):
  profile_photo       ✅ → 6
  bio_length >= 200   ✅ (340 chars) → 5
  subjects >= 2       ✅ (Maths, Further Maths) → 5
  qualifications      ✅ (BSc Mathematics, PGCE) → 5
  response_time_set   ✅ (replies within 2h) → 4
                        = 25 / 25

listing_performance   (0–25):
  views_last_14d = 78  ✅ >= 10 → 8, >= 50 → +4 = 12
  booking_conversion = 18%  ✅ > 5% → 8, > 15% → +5 = 13
                        = 25 / 25  (capped at 25)

earnings_trajectory   (0–25):
  bookings_last_30d = 14  ✅ > 0 → 5
  30d (14) >= prev_30d (11)  ✅ → 10, > 10% growth → +5 = 15
  active_stripe       ✅ → 5
                        = 25 / 25  (capped at 25)

platform_engagement   (0–25):
  response_rate = 92%  ✅ >= 80% → 8
  review_rate = 70%    ✅ >= 60% → 7
  referral_sent_14d    ✅ (referred colleague last week) → 5
  lesson_rebooked 62%  ✅ > 50% → 5
                        = 25 / 25

Growth Score: 100 — Elite performer. No intervention.
```

### Example: Tutor — At Risk (target: identify <40)

James. Physics tutor. Inactive.

```
profile_completeness:  photo ✅ 6, bio ❌ 0, subjects ✅ 5, quals ✅ 5, response ❌ 0 = 16
listing_performance:   views_14d = 3 ❌ 0, booking_conv = 0% ❌ 0 = 0
earnings_trajectory:   0 bookings ❌ 0, no growth ❌ 0, stripe inactive ❌ 0 = 0
platform_engagement:   response_rate 45% ❌ 0, review_rate 0% ❌ 0, no referral ❌ 0, rebook 0% ❌ 0 = 0

Growth Score: 16 — Operations Monitor flags for intervention. Growth Advisor (user product) sends nudge.
```

### Example: Client (weighted toward referrals + bookings)

```
CLIENT GROWTH SCORE (0–100):
  referral_activity  (0–40):  referrals_sent >= 1 → 15, converted >= 1 → 25
  booking_frequency  (0–35):  bookings_6m >= 3 → 15, >= 8 → +10, same_tutor_rebooked → +10
  profile_quality    (0–25):  email_verified → 10, full_name → 5, preferences_set → 10

Example: client with 2 referrals (1 converted), 5 bookings, 60% rebooking:
  referral_activity: 15 + 0 = 15  (no conversion yet)
  booking_frequency: 15 + 0 + 10 = 25
  profile_quality: 10 + 5 + 10 = 25
  Growth Score: 65 — Active client. No intervention.
```

### Example: Organisation

```
ORG GROWTH SCORE (0–100):
  member_health     (0–40):  avg(member_growth_scores) / 100 * 40
  booking_volume    (0–35):  org_bookings_30d >= 5 → 15, >= 20 → +10, >= 50 → +10
  retention         (0–25):  renewal_rate >= 70% → 15, >= 85% → +10

Example: 12-member org, avg member score 72, 35 bookings in 30d, 80% renewal:
  member_health: 72/100 * 40 = 28.8 → 29
  booking_volume: 15 + 10 = 25  (35 >= 20)
  retention: 15 + 0 = 15  (80% >= 70% but < 85%)
  Growth Score: 69 — Healthy org. Growth Advisor shows upsell opportunities.
```

---

## Phase Dependency Map

```
PHASE DEPENDENCY GRAPH

  ✅ DONE (foundation)
  ───────────────────────────────────────────────────────────
  PlatformWorkflowRuntime → 5 live/shadow workflows
  CAS 9 agents (code) → LangGraph checkpointing
  Process Discovery (4-phase scanner)
  HITL ApprovalDrawer → Shadow mode
                │
                ▼
  PHASE 1 (~84h) ─── runs in parallel with Phase 2 start
  ───────────────────────────────────────────────────────────
  Node palette + handler schema forms
  CAS WorkflowVisualizer → Workflows canvas
  Process versioning (migration 347)
  Cross-workflow coordination + bridge files
  Admin Operations redesign
  Migration 346 production fixes
                │
                ▼
  PHASE 2 (~140h) ─── requires Phase 1 COMPLETE
  ───────────────────────────────────────────────────────────
  AGENTS: Agent node (8th) + Registry Panel + Tool Registry
          4 agent templates + seeding + chat UI + subscriptions
          Growth Advisor migration + Conductor new workflows (4 types)
  TEAMS:  Team node (9th) + TeamRuntime + AgentTeamState
          Supervisor / Pipeline / Swarm patterns
          CAS Team exposed + agent_teams schema (migration 352)
                │
                ├──────────────────────────────────────────────
                │                                             │
                ▼                                             ▼
  PHASE 3 (~100h) ─── requires Phase 2              PHASE 5 (~35h) ─── requires Phase 3
  ────────────────────────────────────               ──────────────────────────────────
  platform_events table + bus                        Conformance checking engine
  Knowledge Pipelines 1 + 2                          Process mining analytics
  Admin Intelligence Agent                           Pattern detection (AI)
  AI tier routing                                    Shadow monitoring dashboard
  Growth Scores (migration 345)                      Value Stream tab
  Platform Console                                   Go-live readiness checklist
  Proactive Nudge Scheduler
                │
                ▼
  PHASE 4 (~67h) ─── requires Phase 3
  ───────────────────────────────────────────────────────────
  Platform Knowledge Base (pgvector)
  Intent Detection + Operations routing
  PlatformUserContext (Redis-cached)
  Cross-agent handoff (Sage/Lexi/Growth)
  Learning Loop (decision_outcomes)
  Autonomy tier calibration (Admin Intelligence)
  Network Intelligence page
```

**Critical path**: Phase 1 → Phase 2 → Phase 3 → Phase 4. Phase 5 can begin in parallel with Phase 4 once Phase 3 is complete. No phase can be skipped — each provides infrastructure for the next.

---

## GDPR Compliance

Conductor creates autonomous decisions subject to UK GDPR Article 22 (automated individual decision-making). This creates compliance obligations.

| Table | Retention | Reason |
|-------|-----------|--------|
| `workflow_executions` + `decision_outcomes` | 3 years | Article 22, UK Limitation Act |
| `platform_events` | 12 months | Operational only |
| `pipeline_jobs` | 30 days | Internal queue |
| `growth_scores` | 6 months | Derived cache |
| `cas_agent_events` | 90 days | Fine-tuning/debug |

**Archival process**: rows marked `archived_at` at 12 months, exported to Supabase Storage, hard-deleted at retention limit. `legal_hold = true` exempts a row from deletion (disputes, audits).

**Erasure**: pseudonymisation on account deletion — hash `profile_id` with deletion salt in `workflow_executions`, `decision_outcomes`, `platform_events`.

**Subject Access Rights** (Phase 3):
- `GET /api/account/automated-decisions` — list all autonomous decisions affecting the user
- `POST /api/account/automated-decisions/[id]/contest` — right to contest an automated decision

**Privacy policy** must be updated before Phase 3 goes live to disclose Article 22 automated decisions.

Detailed policy: [`ipom-gdpr-retention-policy.md`](./ipom-gdpr-retention-policy.md)

---

## Design Decisions

### D1: Product name
**Resolved**: Tutorwise Conductor (Intelligent Platform Operations Management). Internal engineering name: Nexus. Users never see either.

### D2: Rebuild or evolve admin
**Resolved**: Evolve, not rebuild. `HubPageLayout` stays. Domain pages move to Management section. Work is intelligence layer, navigation reframe, and Conductor as the one admin canvas.

### D3: Per-agent subscription tables vs unified
**Resolved**: Single `agent_subscriptions` table with `agent_type`. Zero-downtime migration from `sage_pro_subscriptions`. Adding a new agent = one row, no new routes.

### D4: Agent base class location
**Resolved**: CAS `AgentRuntimeInterface` in `cas/packages/core/` already provides this abstraction. Separate `packages/agents-core/` extraction is NOT needed — it would duplicate what already exists.

### D5: HITL gateway security boundary
**Resolved**: Two endpoints (user-scoped `/api/workflow/execute/start`, admin-scoped `/api/admin/workflow/execute/start`), same `PlatformWorkflowRuntime`. Every workflow declares `undoable` and `rollback_procedure`.

### D6: Knowledge pipelines — two, not one
**Resolved**: Pipeline 1 (Discovery → agent knowledge) + Pipeline 2 (Configurations → agent knowledge). Both async via `pipeline_jobs` queue. Caller never blocked.

### D7: Admin Intelligence — new agent or extend CAS Analyst
**Resolved**: New `cas:admin-intelligence` agent. CAS Analyst = dev pipeline. Admin Intelligence = marketplace operations. Same infrastructure, separate agents.

### D8: Organisation data scope for Growth Advisor
**Resolved**: Individual scope (`profile_id`) for tutor/client/agent personas. Organisation scope (`org_id`) for org admin persona, gated by `user_is_org_admin()` RLS. Agent cannot cross scopes.

### D9: Proactive nudge trigger mechanism
**Resolved**: pg_cron every 4 hours, checks Growth Score conditions and engagement signals. Delivery: in-app notification (Supabase Realtime, bell UI) + email (Resend). User delivery preferences respected.

### D10: Network Intelligence — new page or extend Signal
**Resolved**: New `/admin/network/` page (Phase 4). Signal = content attribution. Network = growth attribution. Different data, different audiences.

### D11: Agent Designer — separate canvas or extend Conductor
**Resolved**: Extend Conductor. NOT a separate canvas. Agent node (8th type) + Team node (9th type) added to Conductor palette. CAS WorkflowVisualizer merged as a canvas tab. One admin entry point for all Workflows, Agents, and Teams.

### D12: Growth Score formula
**Resolved**: 4-component composite score (0–100). Components: `profile_completeness + listing_performance + earnings_trajectory + platform_engagement`, each 0–25. Computed daily, cached in `growth_scores`. See §Phase 3 for full formula.

### D13: platform_events vs cas_agent_events
**Resolved**: Dedicated `platform_events` table. `cas_agent_events` remains CAS-internal (schema, RLS, retention designed for fine-grained agent turn events). `platform_events` is cross-system (coarser, different retention, different RLS).

### D14: CAS agents in Conductor
**Resolved**: CAS 9 agents remain in their existing `cas/agents/` location. They are **exposed** as the **CAS Team** in Conductor Teams registry (visible, monitorable from UI) but NOT rewritten. The WorkflowVisualizer is moved into Conductor; the agents themselves stay in CAS. Phase 3+: CAS Team topology becomes DB-editable.

### D15: Knowledge pipeline async vs synchronous
**Resolved**: Both pipelines async via `pipeline_jobs` queue. Caller returns immediately. pg_cron processes every 2 minutes with retry (max 5 attempts, exponential backoff). Platform Console shows queue depth and last successful run.

### D16: Exception queue ownership model
**Resolved**: `claimed_by uuid` + `claimed_at timestamptz` on `workflow_exceptions`. 15-minute soft lock: other admins see claimed status but can override-claim. Unclaimed >48h triggers email escalation to admin team.

### D17: Growth Advisor vs Retention Monitor — two separate agents

**Resolved**: These are two distinct agents with different ownership, audiences, and runtime contexts. No shared orchestrator, no `mode` flag.

| | Growth Advisor | Retention Monitor |
|---|---|---|
| **Audience** | Individual users (tutor, client, agent, org) | Admins only |
| **Entry point** | `/growth` (user-facing product) | `/admin/conductor/agents/retention-monitor` |
| **Subscription** | £10/month — Product 2 | Conductor built-in — no user subscription |
| **Runtime** | `GrowthAgentOrchestrator` (conversational, on-demand) | Conductor Agent Runtime (scheduled daily 08:00 + on-demand chat) |
| **Data scope** | User's own metrics, history, recommendations | Platform-wide cohorts and aggregate signals |
| **Tools** | `query_user_metrics`, `query_referral_links`, income stream tools | `query_cohort_retention`, `query_referral_funnel`, `query_supply_demand_gap`, `query_org_health` |
| **Phase** | Phase 2 (Growth Advisor product) | Phase 3 (Conductor Agents) |

The previous single-orchestrator model with `mode: 'user' \| 'admin'` is retired. "Growth Agent" as a term is retired — use **Growth Advisor** (user product) or **Retention Monitor** (admin specialist) explicitly.

### D18: PlatformUserContext as platform-level construct
**Resolved**: Fetched server-side at session start for any conversational agent. Injected into agent system prompt. Redis-cached per user for 5 minutes. Enables cross-agent awareness and context-carrying handoffs. Not Lexi-specific.

### D19: Learning loop architecture
**Resolved**: `decision_outcomes` + `process_autonomy_config` + weekly Admin Intelligence Agent review. Decisions tracked with `decision_rationale jsonb`. Outcomes measured at 14/30/60/90 day lags via pg_cron. Tier expansion proposals require admin approval. Tier contraction (accuracy drops) is automatic and immediate.

### D20: AI tier routing for Admin Intelligence Agent
**Resolved**: Task classification before model selection. Rules-only for threshold checks (0 cost). Gemini Flash for summarisation. Claude Sonnet for exception recommendations. Grok 4 Fast for daily brief only. Estimated 5–10x cost reduction vs flat frontier model.

### D21: Specialist agents vs CAS pipeline agents — different runtime?
**Resolved**: Both use CAS `AgentRuntimeInterface`. Specialist agents (Market Intelligence, Financial Analyst etc.) are simpler — they run analysis and flag exceptions; they do NOT need the full 9-agent LangGraph CI/CD pipeline. CAS pipeline agents run the full two-loop workflow. The registry holds both types, but they execute via different paths on the same interface.

### D22: Growth Score for non-tutor roles
**Resolved**: See [`conductor-growth-score-all-roles.md`](./conductor-growth-score-all-roles.md). Client score weighted toward referral + booking frequency. Agent score toward active tutor count + referral conversion. Organisation score = aggregate member scores + org-level booking volume. Shadow mode for 30 days before Growth Advisor acts on non-tutor scores.

### D23: Agent Teams — multi-agent design
**Resolved**: Conductor introduces a first-class **Team** concept (distinct from standalone **Agent** and **Workflow**). Three patterns supported in Phase 2:

1. **Supervisor** — coordinator Agent routes tasks to specialists and synthesises result. Covers 80% of cases. CAS Team uses this pattern.
2. **Pipeline** — sequential DAG; each Agent receives previous Agent's output via `AgentTeamState.context[output_key]`. Branches allowed.
3. **Swarm** — peer-to-peer handoffs; any Agent can transfer to any other; no central coordinator. Best for dynamic task routing.

Generic **`AgentTeamState`** flows through all patterns. Each Agent declares an `output_key` (Google ADK pattern) — makes topology DB-configurable without code change. **`TeamRuntime`** dynamically compiles a LangGraph `StateGraph` from `agent_teams.nodes` + `agent_teams.edges` at execution time — adding/rewiring Agents in a Team requires no code deployment.

**CAS Team** surfaces as a read-only Supervisor Team in Conductor Registry (Phase 2). Future phase: CAS Team topology becomes DB-editable from the Team canvas, same as custom Teams.

**Inline creation**: Admin can create a new Agent directly from the Team canvas property panel (without pre-registering it). Agent is saved to `specialist_agents` table and immediately added to the team topology.

**Teams invocable from Workflows**: The existing `cas_agent` action handler is extended to accept a `team_slug`. TeamRuntime executes the full team; `team_result` is stored in the workflow execution context for downstream nodes.

### D24: Specialist Agents — CAS refit, naming, and built-in registry
**Resolved**: Four decisions consolidated into a single architectural change.

**1. `analyst_agents` → `specialist_agents` (table rename)**
The term "analyst" was too narrow — agents include DevOps Engineer, Marketer, Delivery Manager, and Security Engineer, none of which are analysts. `specialist_agents` correctly names any individual domain-expert AI agent. DB table renamed accordingly. `agent_teams` is unchanged — "team of agents" is grammatically correct as a compound noun.

Naming collision context (three distinct "agent" concepts in the codebase):
- `profiles.role_type = 'agent'` = human referral/recruitment agent (existing, unchanged)
- `ai_agents` table = AI Tutor marketplace agents (existing, unchanged)
- `specialist_agents` = Conductor operational specialists (this table)

**2. `built_in` column added to `specialist_agents`**
`built_in boolean DEFAULT false` distinguishes CAS pre-shipped specialists from admin-created custom specialists. Admin sees ONE unified Specialist Registry — no "CAS agents" vs "custom agents" split in the UI. The `built_in` flag prevents accidental deletion of core specialists and is an implementation detail invisible to the admin experience.

**3. CAS 8 built-in agents seeded as Specialists**
CAS was built before Conductor. Its 8 agents are refit as Conductor's standard/built-in Specialists, seeded with `built_in = true` in Migration 348. The CAS runtime remains the internal execution engine for ALL Specialists and Teams — name stays "CAS" in code, invisible to admin UI.

| CAS slug | Display name | Role |
|----------|-------------|------|
| `developer` | Developer | Software Developer |
| `tester` | Tester | Test Engineer |
| `qa` | QA | Quality Assurance |
| `engineer` | DevOps Engineer | DevOps Engineer |
| `security` | Security Engineer | Security Engineer |
| `marketer` | Marketer | Growth Marketing Specialist |
| `analyst` | Analyst | Business / Data Analyst |
| `planner` | Planner | Delivery Manager / Project Manager |

**4. `/admin/cas` merged into `/admin/conductor` Agents tab**
CAS stops being a standalone admin section. Its functionality is absorbed into Conductor's unified Agents tab. The `/admin/cas` route is removed in Phase 0 (same sweep as process-studio route removal). Admin experience: one canvas, one Specialist Registry, one Team Registry.

**§2D Agent Templates renamed** to reflect the actual specialist groups:
- **Platform Engineering** — Developer + Tester + QA + DevOps Engineer + Security Engineer
- **Operations Intelligence** — Analyst + Planner + Operations Monitor
- **Growth Marketing** — Marketer + Market Intelligence
- **Full Stack** — All 8 built-in specialists + coordinator

**Phase 0 additional tasks**: (a) Rename DB table `analyst_agents` → `specialist_agents`, add `built_in` + `role` columns, seed 8 built-in rows (Migration 348 DDL). (b) Remove `/admin/cas` route; surface CAS data in `/admin/conductor`. These are data/path changes only — no logic changes.

---

## Success Metrics

| Metric | Target | Measured By |
|--------|--------|-------------|
| Admin exception queue usage | ≥80% of admin decisions via queue | `admin_activity_log` — queue vs direct page |
| Autonomous operation rate | ≥70% of routine decisions without human | `workflow_executions WHERE triggered_by='autonomous'` |
| Autonomous decision accuracy | ≥90% per process | `decision_outcomes` — rolling 30d |
| Lexi knowledge staleness | <4h after config change | `pipeline_jobs.processed_at` — last successful run |
| Cross-system event coverage | 100% of lifecycle events captured | `platform_events` coverage per `source_system` |
| New agent build cost | <15h per new agent (down from ~50h) | Actual build time |
| Admin daily brief | Available by 8am every day | pg_cron job completion rate |
| AI cost per autonomous decision | <£0.001 per routine decision | `platform_ai_costs` |
| Cross-agent context load time | <500ms PlatformUserContext fetch | Server-side timing |
| Nudge effectiveness | >15% conversion rate | `decision_outcomes.outcome_metric='nudge_converted'` |
| Shadow mode divergence | <5% of shadow executions differ | `platform_events.workflow.shadow_divergence` |
| Agent registry coverage | 100% of platform agents in registry | `specialist_agents` count (built-in + custom) |

**Baseline measurements required before Phase 3**: Current admin decision volume (manual vs queue-based) and current autonomous operation rate must be established at Phase 2 completion.

---

## Related Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [`conductor-solution-design.md`](./conductor-solution-design.md) | **This document — master reference** | Active |
| [`conductor-gdpr-retention-policy.md`](./conductor-gdpr-retention-policy.md) | GDPR retention policy, Article 22 obligations | Active |
| [`conductor-growth-score-all-roles.md`](./conductor-growth-score-all-roles.md) | Growth Score formula for all 4 roles | Active |
| [`conductor-v3-audit.md`](./conductor-v3-audit.md) | Architecture audit, critical gaps, scoring | Active |
| [`workflow-solution-design.md`](./workflow-solution-design.md) | Workflows builder implementation detail | Active |
| [`process-discovery-solution-design.md`](./process-discovery-solution-design.md) | Process Discovery (4 phases) detail | Active |
| [`process-execution-solution-design.md`](./process-execution-solution-design.md) | Execution engine (PlatformWorkflowRuntime) | Active |
| [`lexi-enhancement-proposal.md`](./lexi-enhancement-proposal.md) | Lexi enhancements (separate backlog) | Active |
| [`cas/docs/CAS-SOLUTION-DESIGN.md`](../cas/docs/CAS-SOLUTION-DESIGN.md) | CAS platform architecture | Active |
| [`cas/docs/CAS-ROADMAP.md`](../cas/docs/CAS-ROADMAP.md) | CAS roadmap (Q2 2026+) | Active |

### Documents Deleted (superseded by v3)

The following documents were deleted when the folder was renamed from `ipom/` to `conductor/`:

| Document | Why |
|----------|-----|
| `ipom-solution-design-v2.md` | All content absorbed into v3 |
| `ipom-solution-design.md` (v1) | Superseded by v2, then v3 |
| `platform-nexus-solution-design.md` | Already marked superseded; Nexus = §3C of v3 |
| `ipom-v2-audit-vs-fuschia.md` | Fuschia comparison is Table 1 of v3 |
| `ipom-architecture-audit.md` | Audit that informed v2; superseded |
| `growth-agent-solution-design.md` | Growth Advisor = one agent template in v3 Phase 2 |

---

*Version 3.6 — D24: Specialist Agents, CAS refit, `analyst_agents` → `specialist_agents`, built-in registry (`built_in = true`), §2D templates renamed (Platform Engineering / Operations Intelligence / Growth Marketing / Full Stack), `/admin/cas` merged into Conductor.*
*Supersedes: conductor-solution-design-v2.md, conductor-solution-design.md, platform-nexus-solution-design.md*

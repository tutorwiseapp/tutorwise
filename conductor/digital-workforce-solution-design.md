# Digital Workforce Solution Design

**Version:** 1.0
**Date:** 2026-03-15
**Status:** Draft — Design Review
**Depends on:** [conductor-solution-design.md](conductor-solution-design.md) (platform architecture), [content-factory-solution-design.md](content-factory-solution-design.md) (content pipeline)

---

## 1. Overview

This document defines the **production digital workforce** that operates Tutorwise's user-facing services and internal operations. The Conductor platform (v4.2) provides the substrate — agents, teams, spaces, workflows, memory, intelligence. This document defines **what to deploy on that substrate** to run the business.

### Research Basis

This design is informed by research across leading AI labs, enterprise deployments, and education-sector adoption:

| Finding | Source | Design Implication |
|---------|--------|-------------------|
| 57% of orgs have agents in production; 67% of large enterprises | LangChain State of AI Agents (Dec 2025, n=1,340) | Market validated — ship, don't prototype |
| GenAI is 20% technology, 80% workflow | McKinsey Agents-at-Scale | Wire existing workflows, don't build new tech |
| 85% per-step accuracy → 20% success on 10-step chains | Composio "Why AI Agent Pilots Fail" | Max 3 agents per pipeline. Short chains, fast escalation |
| Prompt caching gives ~90% input cost reduction | Anthropic, OpenAI | Cache all repeated system prompts and user context |
| 73% of deployments have prompt injection vulnerabilities | Authority Partners | Defense-in-depth: input sanitisation → guardrails → output validation → audit |
| HubSpot AI agents resolve 35% of support tickets | HubSpot IR (2025) | Realistic Lexi automation target |
| Khan Academy Khanmigo: 700K students, Socratic method | Khan Academy | Sage must guide, not answer — pedagogical guardrail |
| AI in education: $6.9B → $41B by 2030 (CAGR 42.8%) | Market research | Massive TAM for AI-first tutoring |
| MCP + A2A is the converging protocol stack | Linux Foundation AAIF | MCP implemented (Phase 8). A2A when cross-platform needed |
| 70% of regulated enterprises rebuild agent stack every 3 months | Cleanlab | Stay on LangGraph 1.0 (stable, used by Uber/LinkedIn/Klarna) |

### Design Principles

1. **Wire existing systems** — Conductor, Scheduler, Resources, Workflow Engine, Intelligence pipeline already exist. Connect them.
2. **Short chains, fast escalation** — 3 agents per pipeline max. Escalate to exception queue on uncertainty.
3. **Shadow before live** — Every new operation starts in shadow mode. Promote after conformance checking passes.
4. **Cost-aware by default** — Model routing, prompt caching, dynamic turn limits. Target: <$0.15/user-facing interaction.
5. **Autonomy is earned** — Operations start supervised. Promote through measured accuracy via the learning loop (Phase 4D).

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       TUTORWISE DIGITAL WORKFORCE                       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                  USER-FACING SERVICE LAYER                        │ │
│  │                                                                   │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │ │
│  │  │   Sage   │  │   Lexi   │  │  Growth   │  │  Marketplace   │  │ │
│  │  │ AI Tutor │  │ Help Bot │  │  Advisor  │  │  AI Agents     │  │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │ │
│  └───────┼──────────────┼──────────────┼───────────────┼────────────┘ │
│          │              │              │               │               │
│  ┌───────▼──────────────▼──────────────▼───────────────▼────────────┐ │
│  │               PLATFORM CONTEXT LAYER                              │ │
│  │  PlatformUserContext │ AgentMemory │ Knowledge │ MCP Tools       │ │
│  └───────┬──────────────┬──────────────┬───────────────┬────────────┘ │
│          │              │              │               │               │
│  ┌───────▼──────────────▼──────────────▼───────────────▼────────────┐ │
│  │                  OPERATIONS LAYER (Teams)                         │ │
│  │                                                                   │ │
│  │  marketing         operations        analytics                   │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │ │
│  │  │Content Team │  │DevOps Team   │  │Intelligence Agents  │    │ │
│  │  │SEO Team     │  │Support Team  │  │Autonomy Calibrator  │    │ │
│  │  │Campaign Team│  │Onboard Team  │  │Mining Agents        │    │ │
│  │  └─────────────┘  └──────────────┘  └─────────────────────┘    │ │
│  │                                                                   │ │
│  │  ┌────────────────────────────────────────────────────────────┐  │ │
│  │  │            WORKFLOW ENGINE (LangGraph)                      │  │ │
│  │  │  Tutor Approval │ Booking Lifecycle │ Commission Payout    │  │ │
│  │  │  Content Publish │ Support Triage │ User Onboarding       │  │ │
│  │  └────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                  INTELLIGENCE & FEEDBACK                          │ │
│  │  14 Daily Metrics │ Conformance │ Decision Outcomes │ Exceptions │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. User-Facing Services

### 3.1 Sage — AI Tutor

**Current:** Standalone runtime at `/api/sage/*`, PlatformUserContext injection, event bridge.

| Capability | Agent | Pattern | Priority |
|-----------|-------|---------|----------|
| Safeguarding detection | `safeguarding-monitor` | Real-time per-message (rules + classifier) | P0 |
| Session quality monitoring | `quality-monitor` | Async post-session (fire-and-forget) | P1 |
| Session summarisation & parent reports | `session-summariser` | Async post-session | P2 |
| Learning path recommendation | `learning-advisor` | On-demand tool call from Sage | P3 |

**Pedagogical guardrail:** Sage uses the Socratic method — guides learners to find answers, never gives direct answers. Enforced in the system prompt. Khan Academy proved this at 700K+ students.

**Architecture:**
```
Student message
  → Safeguarding check (< 50ms, rules-based + classifier)
  → Sage runtime (stateless, per-session)
  → PlatformUserContext enrichment (cached, < 300ms)
  → Response
  → Fire-and-forget: quality-monitor scores turn
  → Fire-and-forget: event bridge logs
```

**Cost target:** < $0.08/session turn. Prompt caching on system prompt + user context gives ~90% savings on repeated tokens.

### 3.2 Lexi — Help Bot

**Current:** Help bot with admin mode, operational tools. Separate runtime.

| Capability | Target |
|-----------|--------|
| FAQ resolution via RAG | < 2s response, 18 knowledge categories |
| Account & billing queries | Read-only tool calls (no mutations without HITL) |
| Booking modifications | Workflow trigger → Booking Lifecycle process |
| Auto-resolve rate | > 35% (HubSpot benchmark) |
| Escalation to human | Exception queue → `/admin/operations/exceptions` |

**Key decision:** Lexi remains a thin, fast chat interface. When confidence < 0.7, it hands off to the Support Triage Team (Section 4.3). This keeps p99 latency under 2s.

### 3.3 Growth Agent — AI Business Advisor

**Current:** Standalone at `apps/web/src/lib/growth-agent/`. 5 skill files, 8 tools. Not integrated with Conductor.

| Phase | Change |
|-------|--------|
| Register as specialist agent | Add `growth-advisor` to `specialist_agents`, map tools to `analyst_tools` |
| Wire to memory | `AgentMemoryService.fetchMemoryBlock()` for user-specific advice continuity |
| Create Growth Team | Pipeline: `revenue-auditor` → `referral-strategist` → `growth-planner` |
| Scheduled proactive insights | Weekly cron: scan metrics, push nudges via `platform_notifications` |
| Retire standalone orchestrator | Route `/api/growth-agent/stream` through `SpecialistAgentRunner` |

Free tier (Revenue Audit) stays free — it's the acquisition funnel. Paid (£10/month) unlocks Growth Team pipeline + proactive nudges.

### 3.4 Marketplace AI Agents

User-owned agents in the AI Agent Studio. The workforce's role is quality and governance only:

- **Quality gate** — `qa` agent reviews published agents for safety and policy
- **Performance monitoring** — Intelligence pipeline tracks agent effectiveness
- **Discovery optimisation** — `marketplace-intelligence` tool feeds ranking signals

---

## 4. Operations Layer — Teams

### 4.1 Space & Team Registry

| Space | Teams | Purpose |
|-------|-------|---------|
| **marketing** | Content Team, SEO Team, Campaign Team | Content creation, SEO, retention campaigns |
| **operations** | DevOps Team (existing), Support Triage Team, Onboarding Team | Platform ops, support, user onboarding |
| **analytics** | Intelligence Agents (3 existing), Autonomy Calibrator | 14-domain intelligence, process mining |
| **engineering** | (DevOps Team cross-assigned) | Software dev, testing, security |

### 4.2 Content Team (Designed — see [content-factory-solution-design.md](content-factory-solution-design.md))

```
content-strategist ──▶ content-writer ──▶ content-reviewer
```

| Field | Value |
|-------|-------|
| Slug | `content-team` |
| Pattern | Pipeline |
| Space | `marketing` |
| Trigger | Scheduled weekly or manual |
| Output | Article draft → `resource_articles` → Scheduler → auto-publish |
| Feedback | `article_intelligence_scores` (daily 04:45 UTC) → next article topic |

Full design: [content-factory-solution-design.md](content-factory-solution-design.md). Wires Conductor → Resources → Scheduler with no new UIs or tables.

### 4.3 Support Triage Team (New)

```
intent-classifier ──▶ knowledge-resolver ──▶ response-reviewer
```

| Field | Value |
|-------|-------|
| Slug | `support-triage-team` |
| Pattern | Pipeline |
| Space | `operations` |
| Trigger | Lexi escalation (confidence < 0.7) |

| Agent | Responsibility | Tools |
|-------|---------------|-------|
| `intent-classifier` | Classify intent (billing, booking, technical, safeguarding, general), extract entities | — (prompt-only) |
| `knowledge-resolver` | RAG lookup against 18 knowledge categories, account-specific data retrieval | `match_platform_knowledge_chunks`, `query_booking_health`, `query_financial_health` |
| `response-reviewer` | Check tone, accuracy, completeness. Flag escalation if needed | `flag_for_review` |

**Escalation:** If reviewer marks `escalation_needed=true` → `workflow_exceptions` → admin operations queue.
**Shadow period:** 4 weeks, 200+ clean runs before live promotion.

### 4.4 Onboarding Team (New)

```
profile-assessor ──▶ onboard-planner ──▶ nudge-composer
```

| Field | Value |
|-------|-------|
| Slug | `onboarding-team` |
| Pattern | Pipeline |
| Space | `operations` |
| Trigger | `profiles` INSERT (new user signup) via webhook |

| Agent | Responsibility | Tools |
|-------|---------------|-------|
| `profile-assessor` | Score profile completeness, identify gaps by role (tutor/client/agent/org) | `query_platform_health` |
| `onboard-planner` | Create 7-day onboarding plan (role-adaptive) | — (prompt-only, uses assessor output) |
| `nudge-composer` | Write personalised nudge messages for each onboarding step | `send_notification` |

**Output:** Scheduled nudge sequence via `platform_notifications` + nudge scheduler (7d cooldown per entity, already built).
**Goal metrics:** 7-day activation rate, profile completeness at day 7, first-booking rate.

### 4.5 Campaign Team (Future)

```
audience-builder ──▶ message-composer ──▶ campaign-reviewer
```

| Field | Value |
|-------|-------|
| Slug | `campaign-team` |
| Pattern | Pipeline |
| Space | `marketing` |
| Trigger | `retention-monitor` alert (at-risk users detected) or manual |

| Agent | Responsibility |
|-------|---------------|
| `audience-builder` | Segment users by behaviour, risk scores, lifecycle stage |
| `message-composer` | Write email/push copy, A/B variants |
| `campaign-reviewer` | Check tone, CAN-SPAM/GDPR compliance, brand guidelines |

**HITL:** Campaign outputs **always** go to exception queue for human approval before send. Campaigns are never auto-sent.

**Not the Content Team.** Content Team outputs articles (long-form, SEO, public). Campaign Team outputs messages (targeted, segmented, private). Same space, different teams, different triggers.

### 4.6 SEO Team (Future)

```
keyword-scout ──▶ seo-optimizer
```

| Field | Value |
|-------|-------|
| Slug | `seo-team` |
| Pattern | Pipeline |
| Space | `marketing` |
| Trigger | Weekly cron (after `seo_platform_metrics_daily` at 05:00 UTC) |

| Agent | Tools |
|-------|-------|
| `keyword-scout` | `query_seo_health`, `query_keyword_opportunities` |
| `seo-optimizer` | `query_editorial_opportunities`, `query_content_attribution` |

**Output:** SEO recommendations → `agent_run_outputs` → Intelligence Panel.

### 4.7 DevOps Team (Existing — Phase 6)

Already built. Supervisor pattern, 9 agents (8 specialists + planner coordinator), LangGraph StateGraph + PostgresSaver, HITL interrupt()/resume(). See [conductor-solution-design.md](conductor-solution-design.md) Phase 6.

---

## 5. Workflow Processes

### 5.1 Existing (Phases 1–4)

| Process | Mode | Workforce Role |
|---------|------|---------------|
| Tutor Approval | **Live** | Automated. Profile → under_review → approval/rejection |
| Commission Payout | **Live** | Cron (Fri 10am). Clears pending commissions via Stripe |
| Booking Lifecycle (Human) | **Shadow** | Monitoring. Target: promote after 50 clean runs |
| Booking Lifecycle (AI) | **Shadow** | Same, for AI tutor sessions |
| Referral Attribution | **Design** | Subprocess for K coefficient |

### 5.2 New Processes

| Process | Trigger | Initial Mode | Team | Priority |
|---------|---------|-------------|------|----------|
| Support Escalation | Lexi confidence < 0.7 | Shadow | Support Triage Team | P1 |
| Content Publication | Content Team output | Shadow | Content Team | P2 |
| New User Onboarding | profiles INSERT | Shadow | Onboarding Team | P2 |
| At-Risk Retention | retention-monitor alert | Shadow | Campaign Team | P3 |
| Agent Quality Review | ai_agents.status = 'published' | Shadow | QA agent (solo) | P3 |
| Dispute Resolution | bookings.status = 'disputed' | Design | Human-only initially | P4 |

### 5.3 Autonomy Progression

Every process follows the same promotion path:

```
Design ──▶ Shadow ──▶ Supervised ──▶ Autonomous
              │           │              │
              │           │              └─ No human review. Audit trail only.
              │           └─ AI acts, human can override within 24h
              └─ Parallel execution. No mutations. Conformance checked.
```

Calibrated by `autonomy-calibrator` agent (weekly, Phase 4D). Admin approves via TierCalibrationPanel.

---

## 6. Safety & Guardrails

### 6.1 Defense-in-Depth

Research: 73% of production AI deployments have prompt injection vulnerabilities. 50% of enterprises with multi-agent systems have had Sev-1 incidents.

| Layer | What | Latency |
|-------|------|---------|
| **Input sanitisation** | Strip injection patterns, entity extraction. No user input reaches system prompts directly | < 5ms |
| **Agent guardrails** | Tool whitelist per agent, max 5 tool rounds, read-only by default, circuit breaker | Built-in |
| **Output validation** | Sage: reject direct answers. Lexi: brand tone. All: PII detection, confidence scoring | < 50ms |
| **Audit trail** | Every run → `agent_run_outputs`. Every team → `agent_team_run_outputs`. Every execution → `workflow_executions` | Always |

### 6.2 Safeguarding (P0 — Education-Specific)

Tutorwise serves minors. Non-negotiable.

| Signal | Action | Latency |
|--------|--------|---------|
| Self-harm keywords | Display crisis resources. Log. Alert admin. | < 100ms (rules-based) |
| Abuse disclosure | Acknowledge, do NOT probe. Log. Alert safeguarding lead. | < 100ms |
| Inappropriate content from user | Block message. Log. Flag account. | < 200ms |
| Age-inappropriate AI response | Block response. Re-generate with stricter prompt. Log. | < 500ms |

Implemented as synchronous middleware BEFORE model calls — not an agent.

---

## 7. Cost Architecture

### 7.1 Model Routing

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| User-facing chat (Sage, Lexi) | Grok 4 Fast → Gemini Flash | Speed + cost |
| Agent reasoning (tool selection) | DeepSeek R1 → Claude Sonnet 4.6 | Reasoning quality |
| Synthesis (team coordinator) | Claude Sonnet 4.6 → GPT-4o | Multi-agent synthesis quality |
| Fact extraction, classification | Gemini Flash / Grok 4 Fast | Simple structured tasks |
| Embeddings | Gemini embedding-001 (768-dim) | Standardised |

### 7.2 Cost Targets

| Service | Per interaction | Monthly (est. 10K MAU) |
|---------|----------------|------------------------|
| Sage session turn | $0.08 | $4,000 (50K turns) |
| Lexi query | $0.03 | $600 (20K queries) |
| Growth session | $0.12 | $360 (3K sessions) |
| Internal agent run | $0.25 | $500 (2K runs) |
| Team run (multi-agent) | $0.80 | $400 (500 runs) |
| Intelligence pipeline (daily) | $2.50/day | $75 |
| **Total** | | **~$5,935/month** |

### 7.3 Optimisation Levers

| Lever | Savings | Status |
|-------|---------|--------|
| Prompt caching (system prompts, user context) | ~90% on repeated tokens | To implement |
| Dynamic turn limits (max 5 rounds) | ~24% vs uncapped | Already enforced |
| Category-scoped RAG | ~60% fewer irrelevant chunks | Already implemented |
| Fire-and-forget async (memory, events) | Zero latency on hot path | Already implemented |
| Circuit breaker per team | Prevents runaway cost | Already implemented |
| 6-tier model fallback chain | Auto-downgrades on rate limits | Already implemented |

---

## 8. Observability

### 8.1 Agent-Level Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Task completion rate | `agent_run_outputs.status` | < 80% over 24h |
| Average tool rounds | `agent_run_outputs.metadata` | > 4.0 (approaching 5 limit) |
| Escalation rate | `workflow_exceptions` | > 20% of runs |
| Latency p95 | `agent_run_outputs.duration_ms` | > 30s |

### 8.2 User-Facing Metrics

| Metric | Target | Source |
|--------|--------|--------|
| Sage session satisfaction | > 4.2/5 | Post-session rating |
| Lexi auto-resolve rate | > 35% | Tickets closed without human |
| Onboarding 7-day activation | > 60% | Profile completeness + first action |
| Content output | 4 articles/week | Content Team runs |
| Exception queue resolution | < 4h (p50) | `workflow_exceptions` timestamps |

---

## 9. Workforce Census (Target State)

### Specialist Agents (30)

| Agent | Space | Status | Phase |
|-------|-------|--------|-------|
| developer | engineering | Built | 2 |
| tester | engineering | Built | 2 |
| qa | engineering | Built | 2 |
| engineer | engineering | Built | 2 |
| security | engineering | Built | 2 |
| marketer | marketing | Built | 2 |
| analyst | analytics | Built | 2 |
| planner | operations | Built | 2 |
| market-intelligence | analytics | Built | 3 |
| retention-monitor | analytics | Built | 3 |
| operations-monitor | operations | Built | 3 |
| autonomy-calibrator | analytics | Built | 4 |
| content-strategist | marketing | Designed | CF |
| content-writer | marketing | Designed | CF |
| content-reviewer | marketing | Designed | CF |
| intent-classifier | operations | New | 10 |
| knowledge-resolver | operations | New | 10 |
| response-reviewer | operations | New | 10 |
| profile-assessor | operations | New | 11 |
| onboard-planner | operations | New | 11 |
| nudge-composer | operations | New | 11 |
| growth-advisor | marketing | New | 12 |
| revenue-auditor | marketing | New | 12 |
| referral-strategist | marketing | New | 12 |
| growth-planner | marketing | New | 12 |
| quality-monitor | analytics | New | 13 |
| safeguarding-monitor | operations | New | 13 |
| session-summariser | analytics | New | 13 |
| keyword-scout | marketing | New | 15 |
| seo-optimizer | marketing | New | 15 |
| audience-builder | marketing | New | 14 |
| message-composer | marketing | New | 14 |
| campaign-reviewer | marketing | New | 14 |

### Teams (8)

| Team | Pattern | Space | Agents | Status |
|------|---------|-------|--------|--------|
| DevOps Team | Supervisor | operations | 9 | Built (Phase 6) |
| Content Team | Pipeline | marketing | 3 | Designed ([CF](content-factory-solution-design.md)) |
| Support Triage Team | Pipeline | operations | 3 | Phase 10 |
| Onboarding Team | Pipeline | operations | 3 | Phase 11 |
| Growth Team | Pipeline | marketing | 3 | Phase 12 |
| Campaign Team | Pipeline | marketing | 3 | Phase 14 |
| SEO Team | Pipeline | marketing | 2 | Phase 15 |

### Workflow Processes (11)

| Process | Mode | Trigger |
|---------|------|---------|
| Tutor Approval | Live | profiles UPDATE → under_review |
| Commission Payout | Live | Cron (Fri 10am) |
| Booking Lifecycle (Human) | Shadow | bookings INSERT |
| Booking Lifecycle (AI) | Shadow | ai_agent session INSERT |
| Referral Attribution | Design | Subprocess |
| Content Publication | Shadow | Content Team output |
| Support Escalation | Shadow | Lexi confidence < 0.7 |
| New User Onboarding | Shadow | profiles INSERT |
| At-Risk Retention | Shadow | retention-monitor alert |
| Agent Quality Review | Shadow | ai_agents publish |
| Dispute Resolution | Design | bookings disputed |

---

## 10. Implementation Roadmap

### Phase 10: Support Automation (P1 — 2 weeks)

**How it works:** Lexi already handles simple queries. When it can't resolve (confidence < 0.7), instead of just saying "contact support", it triggers a Conductor team run.

| Step | Task | Detail |
|------|------|--------|
| 10.1 | Seed 3 specialist agents | `intent-classifier`, `knowledge-resolver`, `response-reviewer` — each gets a focused system prompt + specific tool access |
| 10.2 | Seed `support-triage-team` | Pipeline pattern, operations space, 3 nodes |
| 10.3 | Wire Lexi escalation | Add confidence threshold in Lexi response handler — if logprobs or follow-up classifier scores < 0.7, fire async team run |
| 10.4 | Add `support-escalation` workflow process | Shadow mode. Pipeline: intent-classifier extracts what user needs → knowledge-resolver does RAG against 18 `platform_knowledge_chunks` categories + account-specific lookups → response-reviewer validates draft |
| 10.5 | Output routing | If reviewer approves → response sent back to Lexi chat. If `escalation_needed=true` → `workflow_exception` created → `/admin/operations/exceptions` |
| 10.6 | Shadow monitoring | 4 weeks, 200+ clean runs. Admin reviews outputs in Conductor monitoring. After passing conformance, promote to live |

**Tools wired to agents:**

| Agent | Tools | Why |
|-------|-------|-----|
| `intent-classifier` | — (prompt-only) | Classification doesn't need data lookups — model identifies billing/booking/technical/safeguarding/general from the message |
| `knowledge-resolver` | `match_platform_knowledge_chunks`, `query_booking_health`, `query_financial_health`, `query_platform_health` | RAG for general questions, account-specific data for billing/booking queries |
| `response-reviewer` | `flag_for_review` | Escalation path when response quality is insufficient or topic requires human judgement |

### Phase 11: Onboarding Automation (P2 — 2 weeks)

**How it works:** New user signs up → webhook fires → Onboarding Team creates a personalised 7-day activation plan → nudges delivered via existing notification infrastructure.

| Step | Task | Detail |
|------|------|--------|
| 11.1 | Seed 3 specialist agents | `profile-assessor`, `onboard-planner`, `nudge-composer` |
| 11.2 | Seed `onboarding-team` | Pipeline pattern, operations space |
| 11.3 | DB webhook trigger | On `profiles` INSERT (like existing Tutor Approval webhook) → triggers workflow process |
| 11.4 | Profile assessment | `profile-assessor` reads new profile, checks completeness by role. Tutor needs: subjects, availability, pricing, bio, photo. Client needs: child age, subjects, location preferences. Outputs gap analysis |
| 11.5 | Plan generation | `onboard-planner` takes gap analysis + role → 7-day plan. Day 1: complete profile. Day 2: add listing / search tutors. Day 3: first booking attempt. Role-adaptive (tutor plan differs from client plan) |
| 11.6 | Nudge composition | `nudge-composer` writes personalised notification messages for each step — actionable and specific (e.g., "Add your GCSE Maths availability to get found by 23 parents searching in your area") |
| 11.7 | Wire to notifications | Output → `platform_notifications` rows with `scheduled_for` dates. Existing nudge scheduler (7d cooldown, already built) handles delivery. No new notification infrastructure |
| 11.8 | Shadow monitoring | Track 7-day activation rate, profile completeness at day 7, first-booking rate. Tune prompts, promote |

### Phase 12: Growth Agent Integration (P2 — 1 week)

**How it works:** Move the standalone Growth Agent (`apps/web/src/lib/growth-agent/`) into the Conductor's specialist agent framework for unified memory, monitoring, and orchestration. User experience doesn't change.

| Step | Task | Detail |
|------|------|--------|
| 12.1 | Register tools | The 8 existing Growth Agent tools (`hydrate_user_metrics`, `query_booking_trends`, etc.) get rows in `analyst_tools` table |
| 12.2 | Seed `growth-advisor` agent | In `specialist_agents` with the existing system prompt from `apps/web/src/lib/growth-agent/index.ts` |
| 12.3 | Seed Growth Team | `growth-team` (pipeline): `revenue-auditor` → `referral-strategist` → `growth-planner`. Each maps to an existing skill file (revenue-intelligence.ts, referral-strategy.ts, etc.) |
| 12.4 | Route swap | `/api/growth-agent/stream` stops using `GrowthAgentOrchestrator` → calls `SpecialistAgentRunner.run('growth-advisor', ...)` or `teamRuntime.run('growth-team', ...)` for full pipeline. User-facing API contract unchanged |
| 12.5 | Memory integration | Growth-advisor now gets episodic memory for free (`AgentMemoryService` already wired into `SpecialistAgentRunner`). User-specific advice persists across sessions — agent remembers past recommendations and whether user acted on them |
| 12.6 | Scheduled proactive insights | Weekly cron for paid subscribers: scan user metrics, push actionable nudges via `platform_notifications` |

**Revenue model preserved:** Free tier (Revenue Audit) stays free — acquisition funnel. Paid (£10/month) unlocks Growth Team pipeline + proactive nudges.

### Phase 13: Sage Quality & Safeguarding (P0/P1 — 2 weeks)

**How it works:** Two separate concerns wired into the Sage message flow. Safeguarding is synchronous (blocks unsafe messages). Quality is asynchronous (scores after response).

| Step | Task | Detail |
|------|------|--------|
| 13.1 | Safeguarding middleware (P0) | New middleware function that runs BEFORE every Sage model call. First pass: keyword/regex matching against curated list (self-harm, abuse indicators, < 5ms). Second pass: fast classifier (Grok 4 Fast, < 50ms). If triggered: block normal response, return age-appropriate crisis resources, log event, alert designated safeguarding lead via `platform_notifications`. This is NOT an agent — it's a lightweight function in the request pipeline |
| 13.2 | Seed `quality-monitor` agent | Async post-turn scoring. After Sage generates a response, fire-and-forget `SpecialistAgentRunner.run('quality-monitor', ...)`. Agent scores: did Sage guide or give answers (pedagogical)? Was the response engaging? Appropriate for age? |
| 13.3 | Seed `safeguarding-monitor` agent | For deeper analysis when the middleware flags borderline cases (score between 0.3–0.7). Reviews full session context, determines severity, recommends action |
| 13.4 | Wire quality monitoring | Sage session turns → quality-monitor (fire-and-forget). Scores stored in `agent_run_outputs`. Aggregated daily in Intelligence Panel |
| 13.5 | Session summaries | New `session_summaries` table + `session-summariser` agent. On session end: reads full transcript, extracts topics covered, student strengths/struggles, recommended next focus areas. Surfaced in parent/tutor learning progress dashboard |

**Safeguarding flow:**
```
Student message
  → Safeguarding middleware (sync, < 50ms)
     ├─ CLEAR → proceed to Sage runtime
     ├─ BLOCKED → crisis resources + log + alert
     └─ BORDERLINE → proceed but flag for safeguarding-monitor (async)
  → Sage response
  → quality-monitor (async, fire-and-forget)
```

### Phase 14: Campaign & Retention (P3 — 2 weeks)

**How it works:** The `retention-monitor` agent (already running daily at 08:00 UTC) detects at-risk users. Instead of just logging alerts, it triggers the Campaign Team to compose targeted re-engagement messages — but a human always approves before send.

| Step | Task | Detail |
|------|------|--------|
| 14.1 | Seed 3 specialist agents | `audience-builder`, `message-composer`, `campaign-reviewer` |
| 14.2 | Seed `campaign-team` | Pipeline pattern, marketing space |
| 14.3 | Wire retention-monitor | When it flags at-risk users (via `flag_for_review` tool), also create team run trigger for `campaign-team` with flagged user segments as input |
| 14.4 | Audience segmentation | `audience-builder` takes at-risk signals (declining bookings, stale profile, low engagement) → segments into cohorts with specific re-engagement strategies |
| 14.5 | Message composition | `message-composer` writes targeted messages per cohort — email subject + body, push notification text, with A/B variants |
| 14.6 | Compliance review | `campaign-reviewer` checks GDPR compliance (unsubscribe link, data references), CAN-SPAM, brand tone, flags anything questionable |
| 14.7 | HITL gate | Team output **always** goes to `workflow_exceptions` for human review. Admin sees proposed campaign in `/admin/operations/exceptions`, approves or edits, then triggers send. **No auto-send, ever.** Hard rule |
| 14.8 | Shadow monitoring | Measure re-engagement rates (opened, clicked, re-activated within 7d) to calibrate future campaigns |

**Not the Content Team.** Content Team outputs articles (long-form, SEO, public). Campaign Team outputs messages (targeted, segmented, private). Same space, different teams, different triggers, different outputs.

### Phase 15: SEO Automation (P3 — 1 week)

**How it works:** Weekly intelligence cycle — read SEO metrics, find opportunities, generate actionable recommendations.

| Step | Task | Detail |
|------|------|--------|
| 15.1 | Seed 2 specialist agents | `keyword-scout`, `seo-optimizer` |
| 15.2 | Seed `seo-team` | Pipeline pattern, marketing space |
| 15.3 | Weekly cron trigger | Fires after `seo_platform_metrics_daily` refreshes (05:00 UTC). `keyword-scout` calls `query_seo_health` + `query_keyword_opportunities` → finds positions 6–20 (almost top-5), declining keywords, competitor gaps |
| 15.4 | Optimisation recommendations | `seo-optimizer` takes opportunities → generates specific recommendations: meta title/description rewrites, internal linking suggestions, content refresh priorities |
| 15.5 | Output routing | Results → `agent_run_outputs` → surfaced in Intelligence Panel SEO sub-tab. Admin reviews and applies manually, or creates Content Team tasks for content-driven SEO fixes |

### Phase 16: Cost Optimisation (P1 — 1 week)

**How it works:** Infrastructure changes to the AI service layer — no new agents.

| Step | Task | Detail |
|------|------|--------|
| 16.1 | Prompt caching | Enable Anthropic `cache_control` headers on system prompts that repeat across every call (~2K tokens of agent instructions + platform context). Same for OpenAI's prompt caching. ~90% input cost savings on repeated tokens |
| 16.2 | Model routing | Extend `getAIService()` with task-type parameter: `generate({ taskType: 'classification' })` → Grok 4 Fast. `generate({ taskType: 'reasoning' })` → DeepSeek R1. `generate({ taskType: 'synthesis' })` → Claude Sonnet 4.6 |
| 16.3 | Token tracking | Add `input_tokens`, `output_tokens`, `model_used` columns to `agent_run_outputs`. Calculate cost per run using model pricing table. Already have `duration_ms`; add cost alongside |
| 16.4 | Cost dashboard | New section in Operations Brief (`/admin/operations/brief`): daily spend, spend by team/agent, trend vs budget, alerts when approaching limits |
| 16.5 | Budget alerts | Circuit breaker enhancement: if daily spend exceeds 2x target, pause non-critical team runs (SEO, campaign) while keeping critical services (Sage, Lexi, safeguarding) running |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Compound failure in long chains | High | Max 3-agent pipelines, 5 tool rounds, fast escalation |
| Cost overrun | High | Budget alerts, circuit breakers, model routing, turn limits |
| Hallucinated actions affecting users | Critical | Shadow-first, HITL on mutations, audit trail, exception queue |
| Safeguarding incident (minor) | Critical | Pre-message classifier (P0), rules-based, zero-tolerance |
| Prompt injection via user input | High | Input sanitisation, agents never see raw user input in system prompt |
| MCP tool poisoning | Medium | Whitelist servers, review tool descriptions before enabling |

---

## 12. References

- Anthropic, "Building Effective AI Agents" (2025) — simple composable patterns
- Anthropic, "Effective Harnesses for Long-Running Agents" (2025) — multi-context window workflows
- OpenAI, "Agents SDK" (March 2025) — agents, handoffs, guardrails
- LangChain, "State of AI Agents" (Dec 2025, n=1,340) — 57% production adoption
- Salesforce Agentforce 360 (Dreamforce 2025) — enterprise agent platform
- HubSpot Breeze Agents — 35% ticket auto-resolution
- McKinsey Agents-at-Scale — "20% technology, 80% workflow"
- Deloitte State of AI 2026 — $3B investment, scaling challenges
- Accenture — 3,000+ reusable agents across 1,300 clients
- PwC — "Hourglass Workforce" model
- Khan Academy Khanmigo — 700K students, Socratic method
- Composio, "Why AI Agent Pilots Fail" — compound failure analysis
- Authority Partners, "AI Agent Guardrails" — 73% prompt injection rate
- Cleanlab, "AI Agents in Production 2025" — deployment velocity
- Redis, "AI Agent Memory: Types & Architecture" — memory systems
- ICLR 2026 MemAgents Workshop — episodic → semantic consolidation
- Linux Foundation AAIF — MCP (97M+ monthly downloads) + A2A (100+ supporters)

---

## Appendix A: Industry Research — Production Agent Adoption

### A.1 Adoption Numbers

**LangChain "State of AI Agents" (Dec 2025, n=1,340 respondents):**
- **57%** of orgs have agents in production (up from 51% prior year)
- **67%** of large enterprises (10K+ employees) have production agents
- **89%** have observability; **62%** have step-level tracing
- **75%+** use multiple models in production
- Top use cases: Customer service (26.5%), Research/data analysis (24.4%), Internal workflow automation (18%)
- Hybrid evaluation: human review (59.8%) + LLM-as-judge (53.3%)

**LangGraph framework adoption:**
- 26,500 GitHub stars, used by 36,700 projects
- Named production customers: **Klarna, Replit, Elastic, Uber, LinkedIn**
- Free tier: up to 1M nodes executed (self-hosted lite)
- 482 releases, MIT license

**Cleanlab "AI Agents in Production 2025":**
- Share of orgs with deployed agents nearly **doubled** in 4 months: 7.2% (Aug 2025) → 13.2% (Dec 2025)
- **70%** of regulated enterprises rebuild their agent stack every 3 months or faster

**Gartner predictions:**
- **40%** of enterprise apps will feature task-specific AI agents by 2026 (up from <5% in 2025)
- **33%** of enterprise software will include agentic AI by 2028
- **Over 40%** of agentic AI projects will be canceled by end of 2027 due to escalating costs, unclear business value, or inadequate risk controls
- **80%+** of enterprises will use generative AI APIs or applications by 2026

**Other market data:**
- **93%** of IT leaders plan to deploy autonomous agents within two years (Salesforce survey)
- **64%** of organisations have altered entry-level hiring due to AI agents
- **44%** of leaders expect AI agents to manage specific projects alongside humans within 2-3 years
- Telecommunications leads adoption at 48%, followed by retail/CPG at 47%

### A.2 Consulting Firm Recommendations

| Firm | Position | Key Data |
|------|----------|----------|
| **Accenture** | Deployed 3,000+ reusable AI agents across 1,300+ clients. Acquired Faculty (UK AI consultancy, Jan 2026). Multi-year partnership with Anthropic. | Scale leader |
| **Deloitte** | $3B committed through 2030. "State of AI in Enterprise 2026": 66% report productivity gains, scaling held back by data issues, weak governance, infrastructure gaps. | Investment leader |
| **McKinsey** | "Agents-at-Scale" suite. Key finding: GenAI is a **20% technology problem and 80% workflow problem**. | Strategy advisor |
| **PwC** | "Agent OS" platform. **"Hourglass Workforce" model**: senior leaders focus on strategy, junior AI-native staff oversee agent orchestration, significantly shrinking mid-management. | Workforce model |
| **KPMG** | Workbench platform. Positioned 2025 as setting the stage for "agent-driven enterprise reinvention" in 2026. | Platform builder |

---

## Appendix B: Enterprise Agent Platforms

### B.1 Salesforce Agentforce

- **Launched:** Dreamforce 2024 (proof-of-concept) → Agentforce 360 (Dreamforce 2025, production)
- **Metrics:** 30% service case deflection rate, 88% faster resolution times
- **Customers:** 8,000+ as of Jan 2026; ARR up **330% YoY**. ~200 deals in first full quarter (Q3 FY2025)
- **Pricing:** Flex Credits at **$0.10/action** (replaced $2/conversation model, May 2025)
- **Named customers:** OpenTable, SharkNinja, Indeed, 1800 Accountant, Heathrow Airport, Equinox, Fujitsu, Finnair, Prudential, Engine, Good360, Bionic
- **Architecture:** Command center for testing and observability. Data 360 for grounding on structured/unstructured data from external systems

### B.2 ServiceNow AI Agent Studio

- **Launched:** March 2025 (Yokohama release of Now Platform)
- **Three products:**
  - **AI Agent Studio** — no-code builder using natural language prompts. Build custom agents, set guardrails, define execution plans, triggers, and test outcomes before deployment
  - **AI Agent Orchestrator** — coordinates multiple agents to work together on complex goals. Plans, reasons, and calls deployed agents in concert
  - **AI Control Tower** — governance, analytics, version control. Role masking, access testing, version control for LLM instructions, automated evaluations, analytics dashboards
- **Pre-built agents:** Thousands across IT, HR, Customer Service, and Field Service Management
- **Metrics (internal deployment):**
  - **80%** of customer support inquiries handled autonomously
  - **52% reduction** in complex case resolution time
  - **$325M** annualized value from enhanced AI productivity
  - **99% faster** answer delivery vs request tickets
  - **20% productivity increase** across HR and IT support
- **Recognition:** Ranked **#1 for AI Agents** in 2025 Gartner Critical Capabilities
- **Revenue:** $3.6B Q4 2025 (21% YoY growth); forecast $15.5B subscription revenue for 2026
- **Pricing:** Bundled into Pro Plus / Enterprise Plus tiers (~$70-100/user/month, ~60% uplift over Pro). AI Agent Studio, Orchestrator, and Control Tower included at no additional charge in these tiers
- **Named customers:** Eaton (power management), Siemens, Toyota, Unilever (via Moveworks acquisition)
- **Acquisitions:** **Moveworks** ($2.85B) — AI assistant technology integrated into platform
- **Key differentiator vs Salesforce:** ServiceNow focuses on internal workflows (ITSM, HR, FSM); Salesforce focuses on customer-facing CRM workflows. ServiceNow agents get native access to "billions of data points and millions of automations from day one"

### B.3 HubSpot Breeze Agents

- AI agents resolve **35%** of support tickets in HubSpot's own organisation
- Launched HubSpot Credits consumption model for agent actions
- 200+ AI-powered features across platform

### B.4 Microsoft Copilot Studio

- **Pricing:** $18/user/month (annual) or $25.20/user/month (monthly), up to 300 users
- Agent consumption priced on metered basis
- **Capabilities:** Researcher + Analyst deep reasoning agents; custom agent builder; requires Azure subscription
- **Named customers:** Amgen, Newman's Own, Holland America Line, Vodafone, T-Mobile, Estee Lauder
- Copilot Chat included free for all Microsoft Entra users with eligible M365 subscriptions
- Integrated with GitHub Copilot SDK (January 2026)

### B.5 AWS Bedrock Agents

- Multi-agent collaboration with supervisor agent coordination
- RAG, orchestration, memory retention, code interpretation
- Built-in Guardrails for security
- **Amazon Bedrock AgentCore:** new agentic platform supporting any open-source framework
- No specific pricing or customer numbers published

### B.6 OpenAI

- **Agents SDK** (March 2025): replaced experimental Swarm framework. Core primitives: Agents, Handoffs, Guardrails
- **AgentKit** (DevDay October 2025): visual development tools + enterprise features layered on Agents SDK
- **OpenAI Frontier** (February 2026): AI agent platform targeting enterprise software, positioning as potential threat to Salesforce/Workday SaaS models

### B.7 Platform Comparison

| Platform | Focus | Pricing Model | Agent Count | Key Metric |
|----------|-------|--------------|-------------|------------|
| Salesforce Agentforce | Customer-facing CRM | $0.10/action (Flex Credits) | 8,000+ customers | 30% deflection, 88% faster |
| ServiceNow AI Agents | Internal workflows (IT/HR/FSM) | Bundled in Pro Plus (~$70-100/user/month) | Thousands pre-built | 80% autonomous, 52% faster |
| HubSpot Breeze | Marketing/Sales/Support | Credits consumption | 200+ features | 35% ticket auto-resolve |
| Microsoft Copilot Studio | Cross-platform (M365/Azure) | $18-25/user/month + metered | Custom | Researcher + Analyst agents |
| AWS Bedrock Agents | Infrastructure (any framework) | Pay-per-use | Custom | Multi-agent supervisor |
| OpenAI Agents SDK | Developer platform | Token-based | Custom | Agents + Handoffs + Guardrails |

---

## Appendix C: Agent Infrastructure — Docker

Docker is positioning as **"the Agentic AI Platform"** — the infrastructure layer for building, running, and deploying AI agents.

### C.1 Docker Model Runner

- **What:** Run LLMs locally inside Docker Desktop with no extra setup
- **Beta:** March 31, 2025 (Docker Desktop 4.40)
- **GA:** December 2025, extended beyond Desktop to any platform supporting Docker Engine
- **Feb 2026:** Added vLLM 0.5.2 with Metal GPU acceleration on Apple Silicon
- Exposes an **OpenAI-compatible API** — agents call local models the same way they call cloud APIs
- Enables offline development, faster iteration, and cost-free experimentation

### C.2 Docker MCP Catalog & Toolkit

- **MCP Catalog:** Curated collection of **300+ verified MCP servers** packaged as Docker images on Docker Hub
- **Partners:** Stripe, Elastic, New Relic, Grafana
- One-click launch from Docker Desktop; organisations can build custom private MCP catalogs
- **MCP Toolkit:** Centralised management layer with three concepts:
  - **Catalogs** — curated server collections
  - **Profiles** — named server groupings per project
  - **Clients** — connected AI tools (Claude, Cursor, VS Code, Windsurf, Goose)
- **MCP Gateway:** Open-source proxy between MCP clients and servers for credential, configuration, and access control management

### C.3 Docker AI Agent "Gordon"

- **Status:** Beta (Docker Desktop 4.61)
- Shell + Docker CLI + filesystem access
- Deep Docker best-practices knowledge
- Can containerise applications in JS/TS, Python, C#, and more via natural language prompt
- Exposes its own capabilities as MCP Servers

### C.4 Agentic Compose

Docker extended **Docker Compose** to define full agentic architectures in YAML:
- A single `docker compose up` spins up open models, agents, and MCP tools
- Integrated with **LangGraph, Vercel AI SDK, Spring AI, CrewAI, and Google ADK**
- `gcloud run compose up` for serverless deployment on Google Cloud
- Azure Container Apps integration

### C.5 Docker Offload

- **Status:** Beta
- Transparently runs specific containers on **cloud GPUs** (Google Cloud, Microsoft Azure) directly from local Docker environment
- Developers can test agents with heavyweight models without learning cloud APIs

### C.6 Foundation Membership

Docker joined the **Agentic AI Foundation** as a Gold member alongside Anthropic, Block, OpenAI, Amazon, Google, Microsoft, Cloudflare, and Bloomberg.

### C.7 Relevance to Tutorwise

Docker's agentic stack is relevant for:
- **Local development:** Model Runner enables offline agent testing against local LLMs
- **MCP server packaging:** Our MCP integrations (Phase 8) could be containerised for reproducible deployment
- **Agentic Compose:** Future consideration for packaging the full Conductor agent stack as a composable deployment unit
- **Not immediate priority** — our agents run within Next.js API routes on Vercel/Node.js, not in containers. Docker becomes relevant if we move to self-hosted infrastructure or need GPU workloads

---

## Appendix D: Education AI — Specific Deployments & Efficacy

### D.1 Khan Academy Khanmigo

- **Scale:** 40,000 → **700,000 students** (2024-25 school year); projections >1M for 2025-26
- **Technology:** Powered by GPT-4 / GPT-4o
- **Availability:** 180+ countries
- **Pricing:** ~$4/month individuals, $60/year districts
- **Funding:** Microsoft partnership provides Azure cloud + funding; Google funded free access for US teachers (May 2024)
- **Pedagogical approach:** Socratic method — guides learners to find answers themselves, never gives direct answers
- **Teacher adoption:** Growing rapidly with school district partnerships

### D.2 Carnegie Learning MATHia

- **Study:** RAND Corporation (gold standard randomised controlled trial)
- **Scale:** 18,000+ students across 147 middle and high schools in 7 states
- **Finding:** **Nearly doubled growth** in standardised test performance in its second year of implementation
- **Equity impact:** Positive results particularly with underperforming students
- **Funded by:** US Department of Education
- **Additional validation:** EMERALDS Study (2021, Student Achievement Partners) — positive growth
- **Recognition:** "Best Use of AI in Education" (2019 EdTech Breakthrough Awards)
- **Coverage:** Grades 6-12 (middle and high school)

### D.3 Oak National Academy Aila (UK-Specific)

- **What:** AI lesson assistant for UK teachers (built on the national curriculum)
- **Adoption:** **10,000+ users** in first 2 months; ~25,000 lesson plans initiated
- **Quality:** **85%** rated lesson plan structure/content as "fairly high" or "very high"
- **Workload:** **2/3 of teachers** reported decreased workload
- **Time savings:** 30 min → 5-10 min per lesson plan (one teacher reported)
- **Behaviour change:** Over 50% said Aila changed their lesson planning approach
- **Coverage:** All national curriculum subjects KS1-4
- **Safety:** Meets and exceeds UK DfE Generative AI safety standards (published January 2026)
- **DfE 5 safety areas:** Filtering/monitoring, accuracy/professional judgment, data protection/GDPR, governance/accountability, emotional influence prevention
- **Study sample:** 72 surveyed teachers + 8 interviewed teachers

### D.4 Georgia State University Chatbot

- **Enrollment increase:** ~3-4% (Pounce chatbot)
- **Summer melt reduction:** **22%** (21.4% in original study)
- **Impact:** Automated administrative support for enrollment management

### D.5 Duolingo Max

- Premium tier powered by GPT-4 with "Explain My Answer" and "Roleplay" features
- AI-driven adaptive learning paths
- Represents the premium-tier model for AI-enhanced language learning

### D.6 Market Size

- AI in education: **$6.9B (2025) → $41B (2030)**, CAGR **42.8%**
- Agentic AI identified as fastest-growing skill area for 2026 (Coursera)

### D.7 What Services Can Be Automated (Maturity Assessment)

| Service | Automation Maturity | Evidence |
|---------|-------------------|----------|
| **Grading & assessment** | High | Cuts grading time by 30%+ |
| **Scheduling** | High | Resolves conflicts, coordinates availability |
| **Enrollment management** | High | Georgia State: 3.3% increase, 22% melt reduction |
| **Personalised tutoring** | Medium-High | Carnegie Learning: nearly 2x test score growth |
| **Progress tracking & reporting** | High | Automated alerts for at-risk students |
| **Administrative workflows** | Medium | Approval chains, document validation |
| **Content generation** | Medium | Lesson plans (Oak Aila: 10K+ users), practice problems |
| **Teacher workload reduction** | Medium-High | Oak Aila: 2/3 reported decreased workload |

### D.8 Relevance to Tutorwise

| Research Finding | Tutorwise Application |
|-----------------|----------------------|
| Khanmigo Socratic method at 700K students | Sage must guide, not answer — enforced in system prompt |
| Carnegie Learning 2x test score growth | Validates AI tutoring efficacy; Sage should track learning outcomes |
| Oak Aila meets UK DfE safety standards | Sage safeguarding middleware (Phase 13) must meet same 5 DfE areas |
| Georgia State 22% melt reduction via chatbot | Onboarding Team (Phase 11) targets similar activation improvement |
| 85% teacher satisfaction with AI lesson plans | Content Team quality benchmark for resource articles |

---

## Appendix E: Agent Cost Economics

### E.1 Model Pricing (Verified, March 2026)

| Model | Input / M tokens | Cached input / M | Output / M tokens | Cache savings |
|-------|-----------------|-------------------|-------------------|---------------|
| **Grok 4 Fast** (xAI) | $0.20 | $0.05 | $0.50 | 75% |
| **Grok 4** (xAI) | $3.00 | $0.75 | $15.00 | 75% |
| **Grok 3 Mini** (xAI) | $0.30 | $0.07 | $0.50 | 77% |
| **Gemini 2.5 Flash** (Google) | $0.30 | ~$0.03 | $2.50 | ~90% |
| **Gemini 2.5 Flash-Lite** (Google) | $0.10 | — | $0.40 | — |
| **Gemini 2.5 Pro** (Google) | $1.25 (≤200K) | ~$0.13 | $10.00 (≤200K) | ~90% |
| **Gemini 3.1 Pro Preview** | $2.00 | — | $12.00 | — |
| **Gemini 3 Flash Preview** | $0.50 | — | $3.00 | — |
| **DeepSeek V3.2** (chat) | $0.28 | $0.028 | $0.42 | 90% |
| **DeepSeek V3.2** (reasoner) | $0.28 | $0.028 | $0.42 | 90% |
| **Claude Haiku 4.5** (Anthropic) | $1.00 | $0.10 | $5.00 | 90% |
| **Claude Sonnet 4.6** (Anthropic) | $3.00 | $0.30 | $15.00 | 90% |
| **Claude Opus 4.6** (Anthropic) | $5.00 | $0.50 | $25.00 | 90% |

### E.2 Anthropic Prompt Caching Details

- **Default TTL:** 5 minutes
- **Extended TTL:** 1 hour (cache write costs 2x base input price)
- **Cache write (5 min):** 1.25x base input price
- **Cache write (1 hour):** 2x base input price
- **Cache read:** 0.1x base input price (**90% cost reduction**)
- Up to **4 explicit cache breakpoints** per request
- Minimum cacheable content: 1,024–4,096 tokens depending on model

### E.3 Klarna AI Agent Case Study

The most cited production agent deployment in the industry (reported figures):
- **2.3 million conversations** in first month of deployment
- Equivalent to **700 full-time employees**
- Resolution time: **<2 minutes** vs 11 minutes previously
- Customer satisfaction: **on par** with human agents
- **25% reduction** in repeat inquiries
- Projected **$40M annual savings**
- Built on LangGraph (confirmed production user)

### E.4 Cost Benchmarks from Research

| Metric | Value | Source |
|--------|-------|--------|
| Typical customer service interaction | $0.015–$0.12 (500–2,000 tokens) | Stevens Institute |
| Unconstrained agent per task | $5–8 | Stevens Institute |
| Monthly operational spend (post-launch) | $3,200–$13,000 | Stevens Institute |
| Dynamic turn limits | 24% cost reduction while maintaining solve rates | Industry benchmarks |
| Memory layer retrieval (cached) | ~300ms latency | Industry benchmarks |
| Memory layer retrieval (uncached) | ~30s latency | Industry benchmarks |
| Quadratic cost trap: 10-cycle reflexion loop | ~50x tokens of single linear pass | Stevens Institute |

### E.5 Tutorwise Cost Model

Based on verified pricing with our 6-tier fallback chain (Grok 4 Fast → Gemini Flash → DeepSeek R1 → Claude Sonnet 4.6 → GPT-4o → Rules-based):

| Service | Primary Model | Est. tokens/interaction | Est. cost/interaction | Monthly (10K MAU) |
|---------|--------------|------------------------|----------------------|-------------------|
| Sage turn | Grok 4 Fast (cached) | ~2K in + 500 out | ~$0.0004 + $0.00025 ≈ **$0.001** (cached) to **$0.08** (uncached, fallback) | $50–$4,000 |
| Lexi query | Grok 4 Fast (cached) | ~1.5K in + 300 out | ~**$0.001** (cached) to **$0.03** (uncached) | $20–$600 |
| Agent run (internal) | DeepSeek V3.2 | ~3K in + 1K out | ~**$0.001** (cached) to **$0.25** (multi-round) | $2–$500 |
| Team run (3 agents) | Mixed routing | ~10K in + 3K out total | ~**$0.05** (cached) to **$0.80** | $25–$400 |
| Intelligence daily | Gemini Flash | ~5K in + 2K out × 14 domains | ~**$2.50/day** | ~$75 |

**Key insight:** With prompt caching enabled on system prompts (which repeat on every call), the cached scenario is **10-100x cheaper** than uncached. Phase 16 (Cost Optimisation) is high priority.

---

## Appendix F: Agent Safety & Security

### F.1 OWASP Top 10 for LLM Applications (v1.1, April 2024)

| # | Vulnerability | Relevance to Tutorwise |
|---|--------------|----------------------|
| LLM01 | **Prompt Injection** | #1 risk. User input in Sage/Lexi could manipulate agent behaviour. Mitigated by input sanitisation layer (Section 6.1) |
| LLM02 | **Insecure Output Handling** | Agent outputs rendered in UI could contain XSS. Mitigated by output validation |
| LLM03 | Training Data Poisoning | Lower risk — we use commercial models, not fine-tuned |
| LLM04 | Model Denial of Service | Mitigated by circuit breakers and rate limits |
| LLM05 | Supply Chain Vulnerabilities | MCP servers are attack surface. Mitigated by whitelist + Docker verified images |
| LLM06 | **Sensitive Information Disclosure** | Agents access user data via tools. Mitigated by tool whitelists, read-only defaults |
| LLM07 | **Insecure Plugin Design** | Direct parallel to our MCP tool integration. Mitigated by MCP Gateway credential management |
| LLM08 | **Excessive Agency** | Most relevant to workforce. Agents must NOT take actions beyond their scope. Mitigated by max 5 tool rounds, HITL on mutations, shadow mode |
| LLM09 | Overreliance | Users may over-trust Sage answers. Mitigated by pedagogical guardrail (guide, don't answer) |
| LLM10 | Model Theft | Lower risk — we use API-based models, not self-hosted weights |

### F.2 Prompt Injection Research

- **73%** of production AI deployments assessed have prompt injection vulnerabilities (Authority Partners)
- **5 crafted documents** can manipulate AI responses 90% of the time via RAG poisoning (research)
- With only **5 training samples** (0.3% of test data), gradient-based attacks achieve superior performance (arXiv 2403.04957)
- Existing security evaluations **understate** actual vulnerability levels
- OpenAI acknowledges prompt injections in browser agents "may never be fully solved"

### F.3 Production Incidents

| Incident | Severity | Lesson |
|----------|----------|--------|
| GitHub Copilot CVE-2025-53773 | CVSS 9.6 RCE | Even code-generation agents can be weaponised |
| Supabase Cursor agent | Token exfiltration | Privileged service-role access processed user input as commands |
| 50% of multi-agent enterprises had Sev-1 | Industry-wide | Hallucinated data or unauthorised autonomous behaviour |
| MCP tool poisoning | Emerging | Attacker modifies tool descriptions to lure agents into unsafe actions |

### F.4 UK DfE Generative AI Safety Standards (January 2026)

Five core areas applicable to Tutorwise (serving UK students):

| Area | Requirement | Tutorwise Implementation |
|------|-------------|-------------------------|
| **Filtering & monitoring** | Content filtered before reaching students; monitoring of all interactions | Safeguarding middleware (Phase 13), quality-monitor agent |
| **Accuracy & professional judgment** | AI does not replace professional educator judgment | Sage guides only; Content Team outputs require human review |
| **Data protection & GDPR** | Compliant data handling, no training on user data | Supabase RLS, no data sent to model training, PII detection |
| **Governance & accountability** | Clear accountability chain for AI decisions | Audit trail (agent_run_outputs), decision_outcomes, exception queue |
| **Emotional influence prevention** | AI must not manipulate student emotions | Sage system prompt constraints, quality-monitor scoring |

### F.5 Gartner Risk Prediction

> "Over 40% of agentic AI projects will be canceled by end of 2027 due to escalating costs, unclear business value, or inadequate risk controls."

Our mitigations: shadow-before-live (proves value before committing), cost targets per service (budget control), autonomy calibration (risk management), and the learning loop (measurable accuracy).

---

## Appendix G: Agent Memory — State of the Art

### G.1 Memory Taxonomy

Three core types mapped from human cognition (Redis, IBM):

| Type | Purpose | Storage Pattern | Retrieval |
|------|---------|----------------|-----------|
| **Episodic** | Past experiences with temporal context | Vector DB + event logs | Similarity search with time decay |
| **Semantic** | Factual knowledge independent of experience | Structured DB + vector embeddings | Entity/relation lookup |
| **Procedural** | How to perform tasks | Workflow DB + vector DB | Skill/sequence matching |

### G.2 Mem0

- **GitHub:** 49,900 stars, used by ~4,700 projects. v1.0.5 (March 2026)
- **Benchmarks:** 26% higher accuracy vs OpenAI Memory on LOCOMO benchmark; 91% faster response times vs full-context; 90% reduction in token usage vs full-context
- **Architecture:** Multi-level memory (User, Session, Agent state); default LLM: gpt-4.1-nano
- **Integrations:** ChatGPT plugin, browser extension, LangGraph, CrewAI
- Self-hosted or managed (app.mem0.ai)

### G.3 Zep (Graphiti)

- **GitHub:** 4,200 stars. Temporal knowledge graph with `valid_at`/`invalid_at` timestamps
- **Architecture:** Automatic entity extraction and fact invalidation (Graph RAG)
- **Performance:** <200ms P95 latency; 80.32% accuracy on LoCoMo benchmark in single retrieval call
- **Compliance:** SOC 2 Type II + HIPAA
- **Named customers:** WebMD, Swiggy, AWS, Praktika.ai, Thrive AI Health, Athena, College Journey
- SDKs: Python, TypeScript, Go

### G.4 Emerging Research (ICLR 2026)

- **MemRL** (Jan 2026): Self-evolving agents via runtime RL on episodic memory
- **MemEvolve** (Dec 2025): Meta-evolution of agent memory systems
- **Consolidation pathways:** Episodic → semantic memory migration (inspired by human sleep consolidation)
- **MemAgents Workshop:** Comprehensive survey of memory architectures for LLM-based agentic systems

### G.5 Tutorwise Memory Architecture Comparison

| Feature | Tutorwise (Phase 7) | Mem0 | Zep |
|---------|---------------------|------|-----|
| Episodic memory | `memory_episodes` (pgvector HNSW) | Multi-level (User, Session, Agent) | Temporal graph nodes |
| Fact storage | `memory_facts` (subject/relation/object triples) | Extracted via LLM | Graph edges with `valid_at`/`invalid_at` |
| Temporal validity | `valid_from`/`valid_until` on facts | Session-scoped | `valid_at`/`invalid_at` timestamps |
| Retrieval | `match_memory_episodes()` + `match_memory_facts()` RPCs | Mem0 API | Graph RAG queries |
| Embedding model | Gemini embedding-001 (768-dim) | gpt-4.1-nano | Configurable |
| Latency | Sub-second (pgvector HNSW) | 91% faster than full-context | <200ms P95 |
| Fact extraction | `ai.generateJSON<ExtractedFact[]>()`, max 4/run | Automatic via LLM | Automatic entity extraction |

**Key finding:** Our `memory_facts` with `valid_from`/`valid_until` and subject/relation/object triples independently mirrors Zep's temporal knowledge graph pattern. Our architecture is validated by industry state-of-the-art.

---

## Appendix H: Protocols — MCP + A2A

### H.1 Model Context Protocol (MCP)

- **Created by:** Anthropic (2024)
- **Donated to:** Linux Foundation Agentic AI Foundation (AAIF), December 2025
- **Adoption:** 97M+ monthly SDK downloads (Python + TypeScript)
- **Supported by:** Claude, ChatGPT (OpenAI), VS Code (Copilot), Cursor, and "many others"
- **November 2025 spec update:** Async operations, statelessness, server identity, community registry
- **Capabilities:** Data sources (files, databases), tools (search, calculators), workflows (prompts)
- **Docker MCP Catalog:** 300+ verified servers packaged as Docker images

### H.2 Agent-to-Agent Protocol (A2A)

- **Created by:** Google Cloud + IBM Research (April 2025)
- **Donated to:** Linux Foundation (June 2025)
- **v1.0.0 released:** March 12, 2026
- **GitHub:** 22,500 stars, 2,300 forks, 539 commits
- **Supporters:** 100+ enterprise organisations
- **Communication:** JSON-RPC 2.0 over HTTPS
- **Discovery:** Agent Cards detailing capabilities, skills, and interaction modalities
- **Interaction modes:** Synchronous request/response, streaming (SSE), async push notifications
- **Data support:** Text, files, structured JSON
- **SDKs:** Python, Go, JavaScript, Java, .NET
- **Key design:** Agents collaborate WITHOUT exposing internal state, memory, or tools
- **Governance:** Linux Foundation, Apache License 2.0

### H.3 Three-Layer Protocol Stack

The industry is converging on a three-layer architecture:

| Layer | Protocol | Purpose | Tutorwise Status |
|-------|----------|---------|-----------------|
| **Tools** | MCP | Agent ↔ tool/data communication | **Implemented** (Phase 8) — MCPClientManager, tool catalog, execution logging |
| **Agents** | A2A | Agent ↔ agent coordination across platforms | **Not yet** — add when cross-platform communication needed (e.g., school scheduling agents, parent AI assistants) |
| **Infrastructure** | Docker Compose | Package and deploy agent stacks | **Not yet** — agents run in Next.js API routes. Relevant if moving to self-hosted |

### H.4 When Tutorwise Should Add A2A

A2A becomes relevant when:
- A school's scheduling system has its own agents that need to coordinate with Tutorwise booking agents
- A parent's AI assistant needs to discover and interact with Sage for their child
- Third-party assessment platforms need to exchange learning progress data with Sage agents
- **Estimated timeline:** 2027, based on current A2A maturity and education sector adoption pace

---

## Appendix I: Multi-Agent Architecture — What Works in Production

### I.1 Orchestration Patterns (Production-Validated)

| Pattern | How it works | Best for | Production examples |
|---------|-------------|----------|-------------------|
| **Supervisor** | Central coordinator delegates to specialists, monitors, synthesises | Parallel independent tasks | DevOps Team (Tutorwise), Salesforce Agentforce |
| **Pipeline** | Sequential stages, each depends on prior output | Linear workflows with clear dependencies | Content Team (Tutorwise), support triage |
| **Swarm** | Dynamic agent-to-agent routing | Exploratory tasks, variable paths | Research agents, debugging |
| **Hierarchical** | Domain supervisors → top-level coordinator | Enterprise scale (50+ agents) | IBM research, ServiceNow Orchestrator |
| **Hybrid** | Combine patterns per subsystem | Real-world complexity | Most production systems |

**Production consensus (IBM research):** Most production systems use **hybrid patterns** — hierarchical at the top with leaf-level teams using different patterns internally.

### I.2 Companies Running Multi-Agent Systems in Production

| Company | Framework | Use Case | Published Results |
|---------|-----------|----------|------------------|
| **Klarna** | LangGraph | Customer service | 2.3M conversations, 700 FTE equivalent, $40M savings |
| **Replit** | LangGraph | Code generation agents | Confirmed production user |
| **Elastic** | LangGraph | Search/observability agents | Confirmed production user |
| **HubSpot** | Custom | Support ticket resolution | 35% auto-resolve rate |
| **ServiceNow** | Custom (Now Platform) | IT/HR/FSM agents | 80% autonomous handling |
| **Salesforce** | Custom (Einstein) | CRM agents | 30% deflection, 8K+ customers |

### I.3 Compound Failure — The #1 Production Killer

**The math:** If each agent step achieves 85% accuracy, a multi-step workflow succeeds at:
- 3 steps: 61% (acceptable with HITL)
- 5 steps: 44% (marginal)
- 10 steps: 20% (unusable)

**Mitigations validated by research:**
1. **Short chains** — max 3 agents per pipeline (our design principle)
2. **Fast escalation** — uncertain → exception queue immediately
3. **Shadow mode** — prove reliability before going live
4. **Turn limits** — max 5 tool rounds per agent (already enforced)
5. **Circuit breakers** — prevent cascading failures (already implemented)

### I.4 Research Papers

| Paper | Key Finding |
|-------|------------|
| "More Agents Is All You Need" (TMLR, arXiv 2402.05120) | LLM performance scales with number of agent instances via sampling-and-voting. Improvement correlates with task difficulty |
| "AI Agents That Matter" (arXiv 2407.01502) | Current agent benchmarks conflate model developer needs with downstream developer needs. Proposes joint optimisation of accuracy and cost |
| BAIR Berkeley — Compound AI Systems | Hallucination compounding, security vulnerabilities from component interactions, data freshness problems, performance variability across input types |

---

## Appendix J: AI Lab Agent Frameworks

### J.1 Anthropic

- **Claude Agent SDK:** Same runtime that powers Claude Code, available for custom agents
- **Key insight from production:** Most successful implementations use simple, composable patterns — not complex frameworks. "Start with simple prompts, optimise with evaluation, add multi-step agentic systems only when simpler solutions fall short"
- **MCP:** Created the protocol, 97M+ monthly downloads, donated to Linux Foundation
- **Production patterns:** Multi-context window workflows, agentic search as context engineering, end-to-end browser testing

### J.2 OpenAI

- **Agents SDK** (March 2025): Production replacement for Swarm. Primitives: Agents, Handoffs, Guardrails
- **AgentKit** (DevDay October 2025): Visual development + enterprise features
- **Frontier** (February 2026): Enterprise agent platform

### J.3 Google DeepMind

- **Project Mariner:** Browser-automation agent (Gemini 2.0). Wider rollout at Google I/O 2025, handling nearly a dozen tasks concurrently
- **Jules:** AI code agent integrated into GitHub workflows
- **A2A Protocol:** Agent-to-agent communication standard, v1.0.0 released March 2026
- **Vertex AI Agent Builder:** Enterprise agent platform on Google Cloud

### J.4 Microsoft

- **Microsoft Agent Framework:** Unified open-source framework merging Semantic Kernel + AutoGen (both now in maintenance mode)
- Multi-provider support (Azure OpenAI, Anthropic, AWS Bedrock, Ollama)
- Interoperability: A2A, AG-UI, and MCP
- Graph-based workflows, declarative YAML
- **GA target:** End of Q1 2026
- Integrated with GitHub Copilot SDK (January 2026)

### J.5 Framework Comparison

| Framework | Approach | Production Evidence | Tutorwise Alignment |
|-----------|---------|-------------------|-------------------|
| **LangGraph** (LangChain) | Graph-based state machines, durable persistence | Klarna, Replit, Elastic, Uber, LinkedIn | **Already using** — TeamRuntime v2 + PlatformWorkflowRuntime |
| **CrewAI** | High-level role-based agents | 12M+ executions/day, 44K+ GitHub stars | Not using — LangGraph gives more control |
| **Anthropic Agent SDK** | Simple composable patterns | Powers Claude Code | Compatible — could augment if needed |
| **OpenAI Agents SDK** | Agents + Handoffs + Guardrails | New (March 2025) | Not using — model-locked to OpenAI |
| **Microsoft Agent Framework** | Merged SK + AutoGen | Pre-GA (Q1 2026) | Not using — too early |

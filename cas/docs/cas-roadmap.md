# CAS Roadmap 2026-2030

**Last Updated:** March 1, 2026
**Owner:** Michael Quan
**Current Phase:** Phase 5 (Workflow Intelligence + Optimization)

---

## Vision

Transform CAS from a TutorWise internal development tool into an AI-powered autonomous development environment that eliminates manual DevOps overhead, enabling developers to focus on building products while CAS handles orchestration, monitoring, and self-healing.

**CAS** = Contextual intelligence + Autonomous execution + System-wide integration

---

## Current Status (March 2026)

### What's Built

- **9 AI-native agents** with multi-role assignments modelled on a product team
- **Two-loop LangGraph workflow** — outer loop (strategy), inner loop (CI/CD)
- **Three Amigos methodology** — Analyst facilitates, Developer + Tester perspectives, LLM synthesis
- **Kanban continuous delivery** — WIP limits (max 3), backlog prioritisation, bottleneck detection
- **CAS AI Client** (`cas-ai.ts`) — shared Gemini-powered LLM for all agents
- **Event Persistence** (`cas-events.ts`) — audit trail at every workflow node
- **Real test execution** — Jest via `npx jest --json --coverage --forceExit`
- **Real build verification** — `npm run build` with LLM-powered failure analysis
- **Structured QA verdicts** — APPROVE/REWORK/BLOCK with semantic criteria validation
- **QA rework loop** — QA REWORK routes back to Developer for re-planning
- **Expanded security scanning** — 10+ vulnerability patterns with LLM false positive filtering
- **Real metrics** — Marketer queries `cas_metrics_timeseries` for production data
- **Feedback loop** — Marketer generates backlog items → `cas_planner_tasks` → next workflow
- **Admin dashboard** at `/admin/cas` with 5 tabs (Overview, Agents, Feedback, Runtime, Metrics)
- **LangGraph runtime** with circuit breaker and retry with backoff
- **Workflow visualizer** with fullscreen demo execution
- **Integration bridges** for Sage and Lexi feedback
- **Message bus** with JSON envelope format
- **Event sourcing** via `cas_agent_events`
- **5 core database tables + 4 specialized agent tables**
- **DSPy optimization pipeline** (implemented, not yet executed)
- **Reflection node** — self-critique loop after Tester (quality scoring, max 2 rounds, rework to Developer)
- **Human approval gate** — `cas_approval_requests` table + approval node before deployment
- **Admin approval UI** — `/admin/cas?tab=approvals` with approve/reject, comments, Supabase Realtime
- **DSPy pg_cron scheduling** — weekly optimization via `pg_cron → API route → schedule_weekly.sh`
- **RBAC permissions** — CAS integrated into admin RBAC with `cas:view`, `cas:approve`, `cas:manage` per role
- **LangGraph checkpointing** — true workflow pause/resume via `@langchain/langgraph-checkpoint-postgres`
- **Vercel preview deployments** — Engineer triggers real preview deploys via Vercel REST API

### Agent Maturity

| Level | Agents | Status |
|-------|--------|--------|
| **High** | All 9 agents | AI-native with LLM reasoning, real execution, graceful degradation |

All agents upgraded from previous maturity levels:
- Director: keyword matching → LLM semantic alignment scoring
- Analyst: string concatenation → LLM-powered brief generation + Three Amigos synthesis
- Planner: broken Jira import → Kanban board management via Supabase
- Developer: hardcoded task list → LLM-powered implementation plans
- Tester: simulated results → real Jest execution + build verification
- QA: threshold-only → structured APPROVE/REWORK/BLOCK with LLM criteria validation
- Security: 100-file limit → unlimited scanning + LLM false positive filtering
- Engineer: simulated deploy → real build execution + Vercel preview deploys + LLM failure analysis
- Marketer: hardcoded metrics → real `cas_metrics_timeseries` queries + backlog generation

### What's Not Built

- CAS API service (runtime used directly)
- DSPy first optimization run with seeded training data
- Missing DSPy signatures (practice, review, homework_help for Sage; help article, troubleshoot for Lexi)

---

## Improvement Priorities

### P1: Workflow Intelligence (High Impact) — COMPLETED

#### Reflection Node (Completed)

Self-critique loop after Tester, before QA. Uses `casGenerateStructured()` to evaluate Developer plan + test results against acceptance criteria. Quality score (0-1): ≥ 0.7 proceeds to QA, < 0.7 loops back to Developer with critique feedback. Max 2 rounds.

**Files:** `PlanningGraph.ts` — `reflectionNode`, `routeFromReflection`

#### Human Approval Gate (Completed)

Pause between Security and Engineer Deploy for human sign-off. Creates record in `cas_approval_requests` with workflow context. Currently auto-approves (true pause requires LangGraph checkpointing — future work).

**Files:** `PlanningGraph.ts` — `approvalGateNode`, `routeFromApprovalGate`
**Migration:** `325_create_cas_approval_requests.sql`

### P2: Optimization & Scheduling (Medium Impact) — COMPLETED

#### DSPy pg_cron Scheduling (Completed)

Weekly DSPy optimization via Supabase pg_cron → API route → `schedule_weekly.sh`. Runs every Sunday at 2am UTC.

**Files:**
- API route: `apps/web/src/app/api/cron/cas-dspy-optimize/route.ts`
- Migration: `326_create_cas_dspy_cron_job.sql`
- Script: `cas/optimization/schedule_weekly.sh` (updated comments)

**Remaining gaps:**
- `output/` is empty — no optimization has ever been run
- Only 3 of 6 Sage session goal signatures exist (missing: practice, review, homework_help)
- No Lexi signatures
- Seed `ai_feedback` table with minimum 10 examples per signature

#### Admin Approval UI (Completed)

Approve/reject deployment requests from the CAS dashboard at `/admin/cas?tab=approvals`. Includes pending approvals with context display, approve/reject with comments, approval history, and Supabase Realtime subscription for live updates.

**Files:** `apps/web/src/app/(admin)/admin/cas/page.tsx`, `page.module.css`

### P3: RBAC, CI/CD, Checkpointing — COMPLETED

#### RBAC Permission System (Completed)

CAS integrated into TutorWise's admin RBAC (`apps/web/src/lib/rbac/`). Fixed broken RLS policies (referenced non-existent `admin_users` table) and seeded CAS-specific permissions.

**Migrations:** `327_fix_cas_rls_policies.sql`, `328_add_cas_rbac_permissions.sql`
**Files:** `apps/web/src/lib/rbac/types.ts` (added `'cas'` to `AdminResource`), `apps/web/src/app/(admin)/admin/cas/page.tsx` (permission checks)

#### Engineer — Vercel Preview Deployments (Completed)

Engineer agent triggers real Vercel preview deployments via REST API when `VERCEL_TOKEN` is configured. Falls back to simulated deploy without it.

**Files:** `cas/packages/core/src/services/cas-vercel.ts`, `cas/agents/engineer/src/index.ts`

#### LangGraph Checkpointing (Completed)

True workflow pause/resume at approval gate using native LangGraph `interruptBefore` + `@langchain/langgraph-checkpoint-postgres`. Workflow genuinely pauses, admin approves via API, workflow resumes from checkpoint.

**Files:** `cas/packages/core/src/services/cas-checkpointer.ts`, `cas/packages/core/src/workflows/PlanningGraph.ts`
**API:** `apps/web/src/app/api/admin/cas/resume-workflow/route.ts`
**Migration:** `329_create_cas_workflow_checkpoints.sql`

### P4: Remaining Items (Lower Priority)

#### Missing DSPy Signatures

Create `PracticeModule`, `ReviewModule`, `HomeworkHelpModule` for Sage and `HelpArticleModule`, `TroubleshootModule` for Lexi.

---

## Priority Summary

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P1** | ~~Reflection node (Developer + Tester)~~ | Medium | High — COMPLETED |
| **P1** | ~~Human approval gate + DB migration~~ | Medium | High — COMPLETED |
| **P2** | ~~Admin approval UI~~ | Medium | Medium — COMPLETED |
| **P2** | ~~DSPy pg_cron scheduling~~ | Low | Medium — COMPLETED |
| **P3** | ~~RBAC permission system for CAS~~ | Medium | High — COMPLETED |
| **P3** | ~~Engineer: Vercel preview deployments~~ | Medium | Medium — COMPLETED |
| **P3** | ~~LangGraph checkpointing (true pause/resume)~~ | High | High — COMPLETED |
| **P4** | DSPy: Missing signatures | Medium | Low — needs training data first |

---

## Cross-Agent Coordination

### Current Data Flow (Two-Loop)

```
OUTER LOOP:
Director → reads .ai/ docs + cas_planner_tasks → PROCEED/ITERATE/DEFER
    ↓
Three Amigos → Analyst facilitates, Developer + Tester perspectives → structured report
    ↓
Planner → creates Kanban task, checks WIP → work plan

INNER LOOP:
Developer → brief + criteria → implementation plan (LLM-powered)
    ↓
Engineer Build → npm run build → build result (REAL)
    ↓
Tester → npx jest → test results (REAL)
    ↓
Reflection → quality assessment (0-1 score) → proceed or rework to Developer (max 2 rounds)
    ↓
QA → criteria + test results → APPROVE/REWORK/BLOCK (LLM-powered)
    ↓ (REWORK loops to Developer)
Security → code scan + npm audit → vulnerability report (REAL + LLM filtering)
    ↓
Approval Gate → human sign-off via cas_approval_requests → approved or rejected
    ↓
Engineer Deploy → pre-deployment checklist → deploy status
    ↓
Marketer → real metrics + LLM analysis → production report + backlog items → cas_planner_tasks
```

### Feedback Loop

| From | To | Data | Mechanism |
|------|-----|------|-----------|
| Marketer | Planner/Director | Backlog items from production insights | `cas_planner_tasks` table |
| QA | Developer | Rework directive with criteria gaps | Workflow loop-back |
| Analyst | Developer + Tester | Three Amigos report | PlanningState fields |
| Developer | Tester | Implementation plan context | PlanningState fields |
| Reflection | Developer | Critique feedback (quality < 0.7) | Workflow loop-back (max 2 rounds) |
| Security | Approval Gate | Pre-deployment gate result | `cas_approval_requests` record |
| Approval Gate | Engineer | Human approval decision | Conditional routing |

---

## Quarterly Roadmap

### Q1 2026 — Completed

- [x] 9 agents active with LangGraph workflow
- [x] Admin dashboard with 5 tabs
- [x] Runtime abstraction (LangGraph only)
- [x] Circuit breaker and retry with backoff
- [x] Workflow visualizer with fullscreen mode
- [x] Integration bridges (Sage + Lexi)
- [x] Message bus with JSON envelope
- [x] Event sourcing database schema
- [x] DSPy pipeline implemented (not yet executed)
- [x] **AI-Native upgrade — all 9 agents upgraded to High maturity**
- [x] **Two-loop workflow architecture (outer + inner loop)**
- [x] **Three Amigos methodology with LLM synthesis**
- [x] **Kanban continuous delivery (Planner + cas_planner_tasks)**
- [x] **CAS AI Client (cas-ai.ts) — shared Gemini LLM for all agents**
- [x] **Event persistence at every workflow node (cas-events.ts)**
- [x] **Real test execution (Jest) and build verification**
- [x] **Structured QA verdicts (APPROVE/REWORK/BLOCK) with rework loop**
- [x] **Expanded security scanning with LLM false positive filtering**
- [x] **Marketer feedback loop (backlog item generation)**
- [ ] Git commit auto-plan updater
- [ ] DSPy first optimization run

### Q2 2026 — Phase 5: Workflow Intelligence

**Target:** Self-improving agents + human-in-the-loop

- [x] **Reflection node** — self-critique after Tester (quality scoring, max 2 rounds)
- [x] **Human approval gate** — `cas_approval_requests` table + approval node
- [x] **Admin approval UI** — `/admin/cas?tab=approvals` with Realtime
- [x] **DSPy pg_cron scheduling** — weekly optimization via Supabase cron
- [x] **RBAC permissions** — CAS integrated into admin RBAC (migrations 327-328)
- [x] **LangGraph checkpointing** — true workflow pause/resume via PostgresSaver
- [x] **Vercel preview deployments** — Engineer triggers real preview deploys
- [ ] DSPy first optimization run with seeded data
- [ ] Expanded Marketer analytics (referral/conversion tracking)
- [ ] Role-based Sage/Lexi metrics

### Q3-Q4 2026 — Phase 6: Full Autonomy

**Target Autonomy:** 90%

- [ ] Missing DSPy signatures (practice, review, homework_help) (P4)
- [ ] Predictive failure prevention using historical data
- [ ] Self-healing workflows (auto-fix recurring patterns)
- [ ] Near-zero human orchestration (agents self-assign and execute)

### 2027 — Phase 7: AI-Powered Platform

**Target Autonomy:** 95%

- [ ] Natural language interface: "CAS, optimise my API for traffic spike"
- [ ] Automatic performance tuning (cache strategies, query optimisation)
- [ ] Security vulnerability auto-patching
- [ ] Multi-environment orchestration (dev/staging/prod)
- [ ] Configuration drift detection
- [ ] Reinforcement learning for optimal strategies
- [ ] CAS API service (Express + TypeScript) if needed

### 2028+ — Phase 8: Platform Evolution

**Target Autonomy:** 99%

If CAS proves valuable beyond TutorWise:
- **Option A:** Open-source CAS Agent (community tool)
- **Option B:** CAS Cloud Dashboard (SaaS offering)
- **Option C:** Plugin marketplace with revenue sharing

Features if pursued: multi-tenant architecture, REST/GraphQL APIs, SSO/SAML, multi-cloud orchestration.

---

## Technical Stack

### Current (2026)

| Layer | Technology |
|-------|------------|
| Language | TypeScript (primary), Python (DSPy) |
| Database | Supabase (PostgreSQL) |
| Vectors | pgvector |
| Real-time | Supabase Realtime |
| AI | Gemini API (CAS default), Claude API, DeepSeek |
| CAS AI Model | `gemini-2.0-flash` (temperature 0.3) |
| Workflow | LangGraph (StateGraph, two-loop) |
| Resilience | CircuitBreaker, RetryUtility |
| Monitoring | Admin dashboard, event sourcing, cas-events.ts |

### Target (2027)

| Layer | Technology |
|-------|------------|
| Metrics | InfluxDB or Prometheus (time-series) |
| Observability | LangSmith (already integrated) |
| Optimization | DSPy pipelines (weekly automated) |
| CI/CD | Vercel API + GitHub Actions |

---

## Key Performance Indicators

### Technical KPIs

| Metric | Previous | Current | Q2 2026 | Q4 2026 | 2027 |
|--------|----------|---------|---------|---------|------|
| Autonomy Level | 55% | 80% | 85% | 90% | 95% |
| Agent uptime | 95% | 99% | 99% | 99.5% | 99.9% |
| Agent maturity (High) | 5/9 | 9/9 | 9/9 | 9/9 | 9/9 |
| Manual interventions/week | 5 | 2 | 1 | 0.5 | 0.1 |
| Feedback → task conversion | 60% | 80% | 85% | 90% | 95% |

### Agent Performance KPIs

| Metric | Previous | Current | Target |
|--------|----------|---------|--------|
| Plan accuracy | 70% | 85% | 95% |
| Task completion rate | 80% | 90% | 98% |
| Self-healing success | 30% | 50% | 90% |
| Cross-agent coordination | Partial | Full (two-loop) | Autonomous |
| Real test execution | 0% (simulated) | 100% (Jest) | 100% |
| Real build verification | 0% (simulated) | 100% (npm build) | 100% |
| QA criteria validation | Threshold-only | Semantic (LLM) | Semantic |

---

## Related Documents

- [CAS Architecture](CAS-SOLUTION-DESIGN.md) — Current architecture reference
- [Competitive Analysis](competitive-analysis.md) — TutorWise vs Fuschia comparison
- [Intent-Based Development](intent-based-development.md) — How CAS implements autonomous development
- [LangGraph Migration Plan](LANGGRAPH_MIGRATION_PLAN.md) — Migration details (completed)

---

**END OF DOCUMENT**

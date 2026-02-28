# CAS Roadmap 2026-2030

**Last Updated:** February 28, 2026
**Owner:** Michael Quan
**Current Phase:** Phase 3 (Reliability & Visibility)

---

## Vision

Transform CAS from a TutorWise internal development tool into an AI-powered autonomous development environment that eliminates manual DevOps overhead, enabling developers to focus on building products while CAS handles orchestration, monitoring, and self-healing.

**CAS** = Contextual intelligence + Autonomous execution + System-wide integration

---

## Current Status (February 2026)

### What's Built

- 9 autonomous agents with LangGraph StateGraph workflow
- Admin dashboard at `/admin/cas` with 5 tabs (Overview, Agents, Feedback, Runtime, Metrics)
- LangGraph runtime with circuit breaker and retry with backoff
- Workflow visualizer with fullscreen demo execution
- Integration bridges for Sage and Lexi feedback
- Message bus with JSON envelope format
- Event sourcing via `cas_agent_events`
- 5 core database tables + 4 specialized agent tables
- DSPy optimization pipeline (implemented, not yet executed)

### Agent Maturity

| Level | Agents | Status |
|-------|--------|--------|
| **High** | Director, Planner, Analyst, Security, Marketer | Real data integration, production-ready |
| **Medium** | Developer | Functional with some hardcoded outputs |
| **Low** | Tester, QA, Engineer | Simulated/hardcoded results |

### What's Not Built

- CAS API service (runtime used directly)
- Human approval gate + `cas_approval_requests` table
- Reflection node (self-critique loop)
- Real test execution (Tester returns simulated results)
- Real CI/CD integration (Engineer returns simulated deploys)
- DSPy scheduled execution
- RBAC permission system for CAS

---

## Improvement Priorities

### P1: Agent Hardening (High Impact)

#### Tester Agent — Real Test Execution

**Current:** Returns simulated results (`totalTests: 12, passedTests: 12, coverage: 95`)
**Target:** Execute actual Jest/Vitest tests programmatically

**Files:** `cas/agents/tester/src/tester-agent.ts`
**Dependencies:** Jest (already in devDeps)

```typescript
async runTests(featureName: string, options?: { testPath?: string }): Promise<TestResults> {
  const testPath = options?.testPath || `apps/web/src/**/*.test.{ts,tsx}`;
  const { stdout, exitCode } = await execAsync(
    `npx jest ${testPath} --coverage --coverageReporters=json-summary --json --forceExit`,
    { cwd: this.projectRoot, timeout: 120_000 }
  );
  const jestResult = JSON.parse(stdout);
  return {
    passed: jestResult.success,
    totalTests: jestResult.numTotalTests,
    passedTests: jestResult.numPassedTests,
    failedTests: jestResult.numFailedTests,
    coverage: coverageSummary.total.lines.pct,
    failures: jestResult.testResults.filter(r => r.status === 'failed'),
  };
}
```

#### QA Agent — Acceptance Criteria Validation

**Current:** Threshold-based report (coverage >= 90 => approved)
**Target:** Validate against acceptance criteria from Analyst's feature brief + regression detection

**Files:** `cas/agents/qa/src/qa-agent.ts`
**Dependencies:** `cas_agent_events` table for historical test data

```typescript
async performQAReview(featureName: string, testResults: TestResults, acceptanceCriteria?: string[]): Promise<QAReport> {
  const previousRun = await this.getPreviousTestRun(featureName);
  const regressions = this.detectRegressions(testResults, previousRun);
  const criteriaGaps = this.validateAcceptanceCriteria(testResults, acceptanceCriteria);
  return {
    decision: regressions.length === 0 && criteriaGaps.length === 0 ? 'APPROVED' : 'REJECTED',
    regressions, criteriaGaps, coverageReport: { ... },
  };
}
```

### P2: Workflow Intelligence (High Impact)

#### Reflection Node

**Purpose:** Post-agent self-critique loop. After Developer, Tester, or QA executes, evaluate output quality and optionally trigger re-execution.

**Flow:**
```
Developer → reflectionNode → (quality < 0.7 && retries < 2) → Developer (retry)
                            → (quality >= 0.7) → Tester
```

**Files:** New `cas/packages/core/src/workflows/reflection.ts`, update `PlanningGraph.ts`

#### Human Approval Gate

**Purpose:** Pause workflow between Security and Engineer for human approval.

**Flow:**
```
Security → humanApprovalGate → (approved) → Engineer
                              → (rejected/timeout) → END
```

**Requires:**
- New `cas_approval_requests` table (migration)
- Admin UI at `/admin/cas/approvals/` (approve/reject buttons)
- Supabase Realtime subscription for live updates
- Notification system (Slack webhook or email)

**Files:** New `cas/packages/core/src/workflows/approval-gate.ts`, migration, update `PlanningGraph.ts`

#### Engineer Agent — Build Verification

**Current:** Simulated deploy with `setTimeout`
**Target:** At minimum verify `npm run build` succeeds before "deploying"

**Files:** `cas/agents/engineer/src/engineer-agent.ts`

### P3: Intelligence & Optimization (Medium Impact)

#### Developer Agent — LLM-Powered Planning

**Current:** String-matching feasibility review, hardcoded task list
**Target:** Use Gemini to generate implementation plans from feature briefs

**Files:** `cas/agents/developer/src/index.ts`, update PlanningGraph `developerTool`
**Dependencies:** `GOOGLE_AI_API_KEY` (already available)

#### Admin Approval UI

**Purpose:** Allow admins to approve/reject deployment requests from the CAS dashboard.

**Location:** `apps/web/src/app/(admin)/admin/cas/approvals/`
**Components:** ApprovalRequestCard, ApprovalRequestList, ApprovalHistory

#### DSPy Scheduling

**Current gaps:**
- `output/` is empty — no optimization has ever been run
- Only 3 of 6 Sage session goal signatures exist (missing: practice, review, homework_help)
- No Lexi signatures
- No automated scheduling

**Action items:**
1. Create GitHub Actions workflow for weekly DSPy runs
2. Seed `ai_feedback` table with minimum 10 examples per signature
3. Create missing DSPy signatures in `cas/optimization/signatures/`
4. Run initial optimization: `python cas/optimization/run_dspy.py --agent sage --all --dry-run`

### P4: Full Automation (Lower Priority)

#### Engineer — Full CI/CD Integration

Trigger actual Vercel deployments or GitHub Actions workflows instead of simulated deploys.

**Dependencies:** `VERCEL_TOKEN` or GitHub Actions API token

#### Missing DSPy Signatures

Create `PracticeModule`, `ReviewModule`, `HomeworkHelpModule` for Sage and `HelpArticleModule`, `TroubleshootModule` for Lexi.

---

## Priority Summary

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P1** | Tester: Real test execution | Medium | High — stops fake results flowing through pipeline |
| **P1** | QA: Acceptance criteria validation | Medium | High — real quality gates |
| **P2** | Engineer: Build verification | Low | Medium — at least verify builds |
| **P2** | Reflection node (Developer + Tester) | Medium | High — self-improving output quality |
| **P2** | Human approval gate + DB migration | Medium | High — production safety |
| **P3** | Admin approval UI | Medium | Medium — needed for human gate |
| **P3** | Developer: LLM-powered planning | Medium | Medium — better plans |
| **P3** | DSPy GitHub Actions scheduling | Low | Medium — automated optimization |
| **P4** | Engineer: Full Vercel/GH Actions integration | High | Medium — deployment automation |
| **P4** | DSPy: Missing signatures | Medium | Low — needs training data first |

---

## Cross-Agent Coordination

### Current Data Flow

```
Director → reads .ai/ docs → PROCEED/ITERATE/DEFER
    ↓
Planner → Director decision → sprint plan
    ↓
Analyst → feature brief → brief + Three Amigos
    ↓
Developer → brief → feasibility + plan
    ↓
Tester → feature name → test results (SIMULATED)
    ↓
QA → test results → quality report (BASIC)
    ↓
Security → independent scan → vulnerability report (REAL)
    ↓
Engineer → security approval → deploy status (SIMULATED)
    ↓
Marketer → feature name → production report (PARTIALLY REAL)
```

### Planned Coordination Improvements

| From | To | Data to Share | Purpose |
|------|-----|---------------|---------|
| Analyst | Tester | Acceptance criteria | Generate test cases from criteria |
| Developer | Tester | File paths, changed components | Focus test scope |
| Marketer | Director | Production metrics, feedback | Director reviews for CONTINUE/ITERATE/DEPRECATE |
| Director | Planner | Strategic decision | Planner adjusts sprint from Director feedback |

---

## Quarterly Roadmap

### Q1 2026 — Completed

- [x] 9 agents active with LangGraph workflow
- [x] Admin dashboard with 5 tabs
- [x] Runtime abstraction (LangGraph only, CustomRuntime removed)
- [x] Circuit breaker and retry with backoff
- [x] Workflow visualizer with fullscreen mode
- [x] Integration bridges (Sage + Lexi)
- [x] Message bus with JSON envelope
- [x] Event sourcing database schema
- [x] DSPy pipeline implemented (not yet executed)
- [ ] Git commit auto-plan updater
- [ ] DSPy first optimization run

### Q2 2026 — Phase 3: Reliability & Visibility

**Target:** Agent hardening + real test/QA pipeline

- [ ] Tester: Real Jest/Vitest execution (P1)
- [ ] QA: Acceptance criteria validation + regression detection (P1)
- [ ] Engineer: Build verification (P2)
- [ ] Reflection node for Developer + Tester (P2)
- [ ] Human approval gate with `cas_approval_requests` table (P2)
- [ ] Admin approval UI at `/admin/cas/approvals/` (P3)
- [ ] DSPy first optimization run with seeded data (P3)
- [ ] Expanded Marketer analytics (referral/conversion tracking)
- [ ] Role-based Sage/Lexi metrics

### Q3-Q4 2026 — Phase 4: Full Autonomy

**Target Autonomy:** 85%

- [ ] Developer: LLM-powered planning with Gemini (P3)
- [ ] DSPy GitHub Actions weekly scheduling (P3)
- [ ] Missing DSPy signatures (practice, review, homework_help) (P4)
- [ ] Engineer: Full Vercel/GitHub Actions CI/CD (P4)
- [ ] Predictive failure prevention using historical data
- [ ] Self-healing workflows (auto-fix recurring patterns)
- [ ] Intelligent retry with exponential backoff (circuit breaker exists, expand coverage)
- [ ] Near-zero human orchestration (agents self-assign and execute)

### 2027 — Phase 5: AI-Powered Platform

**Target Autonomy:** 95%

- [ ] Natural language interface: "CAS, optimise my API for traffic spike"
- [ ] Automatic performance tuning (cache strategies, query optimisation)
- [ ] Security vulnerability auto-patching
- [ ] Multi-environment orchestration (dev/staging/prod)
- [ ] Configuration drift detection
- [ ] Reinforcement learning for optimal strategies
- [ ] RBAC permission system (`cas.view`, `cas.control`, `cas.configure`, `cas.admin`)
- [ ] CAS API service (Express + TypeScript) if needed

### 2028+ — Phase 6: Platform Evolution

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
| AI | Gemini API, Claude API, DeepSeek |
| Workflow | LangGraph (StateGraph) |
| Resilience | CircuitBreaker, RetryUtility |
| Monitoring | Admin dashboard, event sourcing |

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

| Metric | Current | Q2 2026 | Q4 2026 | 2027 |
|--------|---------|---------|---------|------|
| Autonomy Level | 55% | 70% | 85% | 95% |
| Agent uptime | 95% | 99% | 99.5% | 99.9% |
| Manual interventions/week | 5 | 2 | 1 | 0.1 |
| Feedback → task conversion | 60% | 80% | 90% | 95% |

### Agent Performance KPIs

| Metric | Current | Target |
|--------|---------|--------|
| Plan accuracy | 70% | 95% |
| Task completion rate | 80% | 98% |
| Self-healing success | 30% | 90% |
| Cross-agent coordination | Partial | Autonomous |
| Real test execution | 0% (simulated) | 100% |

---

## Related Documents

- [CAS Architecture](cas-solution-design.md) — Current architecture reference
- [Intent-Based Development](intent-based-development.md) — How CAS implements autonomous development
- [LangGraph Migration Plan](LANGGRAPH_MIGRATION_PLAN.md) — Migration details (completed)

---

**END OF DOCUMENT**

# CAS Platform Architecture

**Version:** 7.0
**Last Updated:** March 1, 2026
**Status:** Production (AI-Native)

---

## 1. Overview

CAS (Contextual Autonomous System) is TutorWise's AI-native development platform. It orchestrates 9 autonomous agents through a two-loop LangGraph workflow modelled on a high-performance product team. Agents operate using Three Amigos methodology with Kanban continuous delivery — not sprints.

### How It Works

```
User Feedback (Sage/Lexi)
         |
    Integration Bridges (sage-bridge.ts, lexi-bridge.ts)
         |
    CAS Message Bus (messages/)
         |
    LangGraph PlanningGraph (Two-Loop Workflow)
         |
  OUTER LOOP: Director → Three Amigos → Planner
  INNER LOOP: Developer → Engineer (build) → Tester → Reflection → QA → Security → Approval Gate → Engineer (deploy) → Marketer
         |
    Outputs: Feature briefs, implementation plans, test results,
             security reports, deployment decisions, production analytics
         |
    FEEDBACK LOOP: Marketer → cas_planner_tasks → next workflow → Director
```

### Key Capabilities

- **9 AI-native agents** with multi-role assignments modelled on a real product team
- **Two-loop architecture** — outer loop for strategy/refinement, inner loop for CI/CD
- **Three Amigos methodology** — Analyst facilitates, Developer + Tester provide perspectives, LLM synthesises
- **Kanban continuous delivery** — WIP limits, cycle time tracking, backlog prioritisation
- **AI-native principle** — LLM for reasoning, tools for execution, rules for validation
- **Graceful degradation** — every LLM call falls back to rules-based logic
- **Real execution** — Jest tests, npm builds, security scans (not simulated)
- **Circuit breaker** and **retry with backoff** for resilience
- **Admin dashboard** at `/admin/cas` with real-time monitoring
- **Workflow visualizer** with fullscreen demo execution
- **Event sourcing** via `cas_agent_events` for full audit trail
- **Reflection loop** — self-critique after Tester with quality scoring (max 2 rounds)
- **Human approval gate** — deployment pause for human sign-off via `cas_approval_requests`
- **Admin approval UI** at `/admin/cas?tab=approvals` with Supabase Realtime
- **DSPy optimization** pipeline with pg_cron weekly scheduling
- **Integration bridges** connecting Sage and Lexi feedback loops
- **RBAC permissions** — CAS integrated into TutorWise admin RBAC (`cas:view`, `cas:approve`, `cas:manage`)
- **LangGraph checkpointing** — true workflow pause/resume at approval gate via `@langchain/langgraph-checkpoint-postgres`
- **Vercel preview deployments** — Engineer agent triggers real Vercel preview deploys via REST API

---

## 2. AI-Native Design Principle

Every agent follows the AI-native principle:

| Category | Method | Agents | Example |
|----------|--------|--------|---------|
| **Reason with AI** | LLM for judgements, synthesis, analysis | Director, Analyst, Developer, Planner, QA, Marketer | Strategic alignment scoring, feasibility review, acceptance criteria validation |
| **Execute with tools** | Deterministic for build, test, scan | Tester, Engineer, Security | `npx jest --json`, `npm run build`, regex scanning |
| **Validate with rules** | Thresholds and gates | QA, Security, Planner | Coverage >= 80%, WIP limit 3, severity thresholds |

### Graceful Degradation

Every `casGenerate()` / `casGenerateStructured()` call returns `null` on failure. All callers fall back to rules-based logic. The system works without an API key.

```typescript
// Example pattern used across all agents
const llmResult = await casGenerate({ systemPrompt, userPrompt });
if (llmResult) {
  // AI-powered reasoning
  return llmResult;
}
// Fallback: rules-based logic
return rulesBasedFallback();
```

---

## 3. Agent Architecture

### 3.1 Multi-Role Assignments

Each agent serves multiple roles modelled on a high-performance product development team:

| Agent | Roles | AI Method |
|-------|-------|-----------|
| **Director** | Product Manager + Strategist + CTO + Cofounder | Reason with AI |
| **Analyst** | BA + Three Amigos Facilitator + Requirements Owner | Reason with AI |
| **Planner** | Scrum Master + Delivery Manager + Flow Manager | Reason with AI + Rules |
| **Developer** | Tech Lead + Architect + Implementer | Reason with AI |
| **Tester** | QA Engineer + Test Automation Engineer | Execute with tools |
| **QA** | Release Manager + Quality Gate Owner | Reason with AI + Rules |
| **Security** | Security Engineer + Compliance Officer | Execute with tools + AI filtering |
| **Engineer** | DevOps + SRE + Build Engineer | Execute with tools + AI analysis |
| **Marketer** | Product Analytics + Growth Analyst + Feedback Analyst | Reason with AI |

### 3.2 Agent Inventory

| Agent | File | Maturity | Key Capabilities |
|-------|------|----------|------------------|
| **Director** | `cas/agents/director/src/index.ts` | High | Dynamic `.ai/` doc parsing, LLM-powered semantic alignment scoring, PROCEED/ITERATE/DEFER decisions, production metrics review |
| **Analyst** | `cas/agents/analyst/src/index.ts` | High | LLM-powered feature briefs, Three Amigos facilitation (synthesises Business/Technical/Quality perspectives), codebase pattern extraction with AI |
| **Planner** | `cas/agents/planner/src/index.ts` | High | Kanban board management via `cas_planner_tasks`, WIP limit enforcement (max 3), LLM-powered backlog prioritisation, bottleneck detection |
| **Developer** | `cas/agents/developer/src/index.ts` | High | LLM-powered feasibility review, structured implementation plans (`DevelopmentPlan`), architecture decisions, FeaturePlanUpdater |
| **Tester** | `cas/agents/tester/src/index.ts` | High | Real Jest execution (`npx jest --json --coverage`), real build verification (`npm run build`), LLM-powered testability review |
| **QA** | `cas/agents/qa/src/index.ts` | High | Structured `QAVerdict` (APPROVE/REWORK/BLOCK), LLM-powered semantic criteria validation, regression detection via `cas_agent_events` |
| **Security** | `cas/agents/security/src/index.ts` | High | npm audit, expanded regex scanning (10+ patterns), LLM-powered false positive filtering, persistence to `cas_security_scans` |
| **Engineer** | `cas/agents/engineer/src/index.ts` | High | Real build execution, LLM-powered build failure analysis, pre-deployment checklist verification, permission system, event persistence |
| **Marketer** | `cas/agents/marketer/src/index.ts` | High | Real metrics from `cas_metrics_timeseries`, LLM-powered feedback analysis, backlog item generation (closes feedback loop), cross-agent coordination |

### 3.3 Agent Registry

`cas/agents/agent-registry.ts` — Central registry for all agents.
`cas/agents/index.ts` — Exports and initialization.

---

## 4. CAS AI Client

**File:** `cas/packages/core/src/services/cas-ai.ts`

Shared LLM client for all CAS agents. Wraps `@google/generative-ai` SDK. Separate from the web app's `ai.ts` to avoid circular imports.

```typescript
// Key exports:
casGenerate(options: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;    // default: 0.3
  maxOutputTokens?: number; // default: 2048
}): Promise<string | null>

casGenerateStructured<T>(options & {
  jsonSchema: string;       // JSON schema for structured output
}): Promise<T | null>
```

- **Model:** `gemini-2.0-flash` (fast, cost-effective for agent reasoning)
- **API Key:** `process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY`
- **Temperature:** 0.3 (deterministic reasoning, not creative generation)
- **Returns `null` on failure** — callers fall back to rules-based logic
- **Lazy initialization** — SDK client created on first use

---

## 5. Event Persistence

**File:** `cas/packages/core/src/services/cas-events.ts`

Shared event persistence for audit trail and observability across all agents and workflow nodes.

```typescript
// Key exports:
persistEvent(agentId: string, eventType: string, eventData: object): Promise<void>
persistMetric(agentId: string, metricName: string, value: number, labels?: Record<string, string>): Promise<void>
queryRecentEvents(agentId: string, eventType: string, limit?: number): Promise<any[]>
```

- Writes to existing `cas_agent_events` and `cas_metrics_timeseries` tables
- Uses Supabase client with `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`
- **Graceful:** logs warning if no credentials, never throws
- Called at every workflow node via `withEventPersistence()` wrapper in PlanningGraph

---

## 6. Workflow Engine

### 6.1 Two-Loop Architecture

**File:** `cas/packages/core/src/workflows/PlanningGraph.ts`

The core orchestration engine. A LangGraph `StateGraph` implementing a two-loop model:

```
OUTER LOOP (Strategy & Refinement):
  ┌─────────┐    ┌──────────────┐    ┌─────────┐
  │ Director │───▶│ Three Amigos │───▶│ Planner │
  └────┬────┘    └──────────────┘    └────┬────┘
       │ DEFER/ITERATE → END              │
       │                                  ▼
INNER LOOP (CI/CD Pipeline):
  ┌───────────┐    ┌───────────────┐    ┌────────┐    ┌────────────┐    ┌────┐
  │ Developer │───▶│ Engineer Build │───▶│ Tester │───▶│ Reflection │───▶│ QA │
  └───────────┘    └───────────────┘    └────────┘    └─────┬──────┘    └──┬─┘
       ▲                                   REWORK (quality < 0.7) │  REWORK │
       ├──────────────────────────────────────────────────────────┘        │
       └──────────────────────────────────────────────────────────────────┘
                                                                   APPROVE ▼
  ┌──────────┐    ┌───────────────┐    ┌────────────────┐    ┌──────────┐
  │ Security │───▶│ Approval Gate │───▶│ Engineer Deploy │───▶│ Marketer │──▶ END
  └──────────┘    └───────────────┘    └────────────────┘    └──────────┘
       │ CRITICAL → END   │ REJECTED → END
```

### 6.2 Workflow Nodes

| Node | Agent | Input | Output |
|------|-------|-------|--------|
| `director` | Director | Feature query | Strategic decision (PROCEED/ITERATE/DEFER) |
| `threeAmigos` | Analyst | Feature brief | Three Amigos report (acceptance criteria, constraints, edge cases, test strategy) |
| `planner` | Planner | Director decision + Three Amigos report | Kanban task + work plan (WIP check) |
| `developer` | Developer | Feature brief + criteria | Implementation plan (files, architecture, steps) |
| `engineerBuild` | Engineer | Implementation plan | Build result (success/fail, output, duration) |
| `tester` | Tester | Feature name | Test results (real Jest execution) |
| `reflection` | Reflection | Developer plan + test results | Quality assessment (0-1 score), proceed or rework |
| `qa` | QA | Test results + acceptance criteria | QA verdict (APPROVE/REWORK/BLOCK) |
| `security` | Security | Codebase | Security scan results (with false positive filtering) |
| `approvalGate` | Approval Gate | Security report + all results | Approval record in `cas_approval_requests` (pending/approved/rejected) |
| `engineerDeploy` | Engineer | All upstream approvals | Deployment status |
| `marketer` | Marketer | Feature name + all results | Production report + backlog items |

### 6.3 Conditional Routing

| Router | Conditions | Routes |
|--------|------------|--------|
| `routeFromDirector` | `PROCEED` → threeAmigos, `DEFER`/`ITERATE` → END | Strategic gate |
| `routeFromThreeAmigos` | Always → planner | Passthrough |
| `routeFromEngineerBuild` | Build success → tester, Build fail → END | Build gate |
| `routeFromTester` | Always → reflection | Passthrough |
| `routeFromReflection` | Quality ≥ 0.7 or round ≥ 2 → qa, Quality < 0.7 → developer (rework) | Reflection gate (max 2 rounds) |
| `routeFromQA` | `APPROVE` → security, `REWORK` → developer (loop), `BLOCK` → END | Quality gate |
| `routeFromSecurity` | OK/WARNINGS → approvalGate, `CRITICAL` → END | Security gate |
| `routeFromApprovalGate` | Approved → engineerDeploy, Rejected → END | Human approval gate |
| `routeFromEngineerDeploy` | Always → marketer | Passthrough |

### 6.4 QA Rework Loop

When QA returns `REWORK`, the workflow loops back to Developer:

```
Developer → Engineer Build → Tester → QA
     ▲                                │
     └────────── REWORK ──────────────┘
```

The Developer re-generates an implementation plan with QA feedback. This loop can repeat until QA approves or blocks.

### 6.5 Reflection Loop (Self-Critique)

After Tester runs and before QA reviews, the Reflection node evaluates the quality of Developer's plan and test results. Uses `casGenerateStructured()` to produce a quality score (0-1) with feedback.

```
Tester → Reflection → (quality ≥ 0.7 OR round ≥ 2) → QA
              │
              └── (quality < 0.7 AND round < 2) → Developer (rework with critique feedback)
```

- **Max 2 rounds** to prevent infinite loops
- Falls back to rules-based check (test pass/fail) if LLM is unavailable
- Persists event via `cas-events.ts` for audit trail

### 6.6 Human Approval Gate

After Security passes and before Engineer deploys, the Approval Gate pauses for human sign-off. Creates a record in `cas_approval_requests` with workflow context (security report, QA verdict, build result, feature name).

```
Security → Approval Gate → (approved) → Engineer Deploy
                         → (rejected) → END
```

- **Database:** `cas_approval_requests` table with RLS (`is_admin()` policy)
- **Admin UI:** `/admin/cas?tab=approvals` — approve/reject with comments, Supabase Realtime for live updates
- **LangGraph checkpointing:** Workflow genuinely pauses via `interruptBefore: ['approvalGate']` using `@langchain/langgraph-checkpoint-postgres`. Admin approval resumes the workflow via `/api/admin/cas/resume-workflow`
- **RBAC gating:** Approve/reject buttons require `cas:approve` permission
- **Graceful degradation:** Falls back to auto-approve if checkpointing is unavailable (no `POSTGRES_URL_NON_POOLING`)
- **Expiry:** 24-hour default on pending approvals

### 6.7 Feedback Loop (Cross-Workflow)

Marketer writes feedback items to `cas_planner_tasks` and ends the current workflow. The next workflow run picks them up via Director → Planner. This prevents infinite loops within a single execution.

```
Workflow N:  ... → Marketer → writes to cas_planner_tasks → END
Workflow N+1: Director → reads cas_planner_tasks → Three Amigos → ...
```

### 6.8 PlanningState

Extended state carried through the workflow:

```typescript
PlanningState {
  // Core fields
  featureName, featureQuery, featureType
  directorDecision, analystBrief, developerPlan
  testerResults, qaReport, securityReport
  engineerStatus, marketerReport, workflowStatus

  // Three Amigos output
  acceptanceCriteria: string[] | null
  technicalConstraints: string[] | null
  edgeCases: string[] | null
  testStrategy: string | null

  // Kanban integration
  kanbanTaskId: string | null

  // CI/CD pipeline
  buildResult: { success: boolean; output: string; duration: number } | null
  qaDecision: 'APPROVE' | 'REWORK' | 'BLOCK' | null

  // Reflection loop
  reflectionRound: number          // Current reflection iteration (max 2)
  reflectionFeedback: string | null // Critique feedback for Developer rework

  // Human approval gate
  approvalId: string | null        // UUID from cas_approval_requests
  approvalStatus: 'pending' | 'approved' | 'rejected' | null

  // Feedback loop
  feedbackItems: Array<{ title: string; priority: string }> | null
}
```

### 6.9 Runtime Layer

**Directory:** `cas/packages/core/src/runtime/`

| File | Purpose |
|------|---------|
| `AgentRuntimeInterface.ts` | Interface definition (lifecycle, execution, state, observability) |
| `RuntimeFactory.ts` | Creates runtime instances. Currently LangGraph-only |
| `LangGraphRuntime.ts` | Full production runtime with circuit breaker, retry logic, 3 pre-built workflows |
| `CircuitBreaker.ts` | CLOSED/OPEN/HALF_OPEN state machine with configurable thresholds |
| `RetryUtility.ts` | Exponential backoff with jitter, error classification, retry-after parsing |

**Pre-built workflows in LangGraphRuntime:**
1. `content-strategy` — Content planning workflow
2. `feature-development` — Full 9-agent development workflow (two-loop)
3. `security-audit` — Security-focused audit workflow

### 6.10 LangGraph Checkpointing

**Package:** `@langchain/langgraph-checkpoint-postgres`
**File:** `cas/packages/core/src/services/cas-checkpointer.ts`

The workflow uses native LangGraph checkpointing to genuinely pause and resume at the approval gate.

**How it works:**
1. `executePlanningWorkflow()` compiles the graph with `checkpointer` + `interruptBefore: ['approvalGate']`
2. Workflow runs through outer loop + inner loop until it reaches the approval gate
3. LangGraph persists the full graph state to PostgreSQL (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes` tables)
4. Workflow returns `status: 'awaiting_approval'` with the `workflowId` (thread ID)
5. Admin approves/rejects via `/api/admin/cas/resume-workflow`
6. `resumePlanningWorkflow()` reloads the checkpoint, updates approval state, and continues execution

**Graceful degradation:** If `POSTGRES_URL_NON_POOLING` is not set, the workflow falls back to in-memory execution with auto-approve (no pause).

**Database:** PostgresSaver auto-manages its schema via `.setup()`. RLS policies added in migration 329.

```typescript
// Start — runs until approval gate
const result = await executePlanningWorkflow('feature-name', 'feature query');
// result.status === 'awaiting_approval', result.workflowId === thread ID

// Resume — after admin approval
const final = await resumePlanningWorkflow({ workflowId, decision: 'approved' });
// final.status === 'completed'
```

### 6.11 CI/CD Integration (Vercel Preview Deploys)

**File:** `cas/packages/core/src/services/cas-vercel.ts`

The Engineer agent triggers real Vercel preview deployments via the Vercel REST API.

**How it works:**
1. Engineer's `deploy()` method checks if `VERCEL_TOKEN` is configured
2. If available: triggers `POST /v13/deployments` with `target: null` (preview, not production)
3. Polls `GET /v13/deployments/{id}` every 10s until READY or ERROR (max 5 minutes)
4. Returns real deployment URL, status, and any errors
5. If `VERCEL_TOKEN` not set: falls back to simulated deploy (graceful degradation)

**Production deploys** remain via GitHub Actions on push to `main` — CAS only handles preview.

**API functions:**
- `createPreviewDeployment(ref?)` — Trigger a preview deployment
- `getDeploymentStatus(deploymentId)` — Check deployment status
- `waitForDeployment(deploymentId)` — Poll until complete
- `getLatestDeployment()` — Get most recent deployment
- `isVercelConfigured()` — Check if `VERCEL_TOKEN` is set

### 6.12 Workflow Visualizer

**Locations:**
- `apps/web/src/app/(fullscreen)/workflow-fullscreen/page.tsx` — Standalone fullscreen view
- `apps/web/src/app/(admin)/admin/cas/workflow-fullscreen/page.tsx` — Admin-embedded view

Uses `WorkflowVisualizer` component from `cas/packages/core/src/admin/` which reads structure from `getWorkflowStructure()`.

---

## 7. Kanban Continuous Delivery

CAS uses Kanban (not sprints) managed by the Planner agent.

### Principles

- **Limit WIP** — Maximum 3 tasks in progress at any time
- **Optimise flow** — Cycle time tracking, bottleneck detection
- **Prioritise by impact** — LLM-powered backlog ranking
- **Continuous delivery** — No sprint boundaries, work flows continuously

### Kanban Board (`cas_planner_tasks`)

| Column | Statuses |
|--------|----------|
| Backlog | `pending`, `approved` |
| In Progress | `in_progress` (max 3) |
| Done | `completed`, `dismissed` |

### Planner Methods

```typescript
planWork(directorDecision, threeAmigosReport, featureName) → PlannerWorkPlan
createTask(task) → taskId
getBoard() → { pending, in_progress, completed }
moveTask(taskId, newStatus) → boolean
checkWIPLimits() → { count, limit, atCapacity }
detectBottlenecks() → string (LLM analysis)
prioritizeBacklog() → string[] (LLM ranking)
```

---

## 8. Three Amigos Methodology

The Three Amigos session is a single LLM synthesis call that holds three perspectives:

| Perspective | Agent | Contribution |
|-------------|-------|--------------|
| **Business** | Analyst | Acceptance criteria, user stories, success metrics |
| **Technical** | Developer | Feasibility assessment, architecture constraints |
| **Quality** | Tester | Testability assessment, test scenarios, edge cases |

### Process

1. Analyst generates feature brief from query + codebase context
2. Developer `reviewFeatureBrief()` provides technical perspective
3. Tester `reviewFeatureBrief()` provides quality perspective
4. Analyst synthesises all three into structured `ThreeAmigosReport`:

```typescript
ThreeAmigosReport {
  acceptanceCriteria: string[]
  technicalConstraints: string[]
  edgeCases: string[]
  testStrategy: string
  definitionOfDone: string[]
  feasibilityNotes: string
  testabilityNotes: string
}
```

This mirrors a real Three Amigos meeting — one conversation, three viewpoints, one synthesised outcome.

---

## 9. Admin Dashboard

**Location:** `apps/web/src/app/(admin)/admin/cas/page.tsx`

### Tabs

| Tab | Content |
|-----|---------|
| **Overview** | KPI cards (active agents, tasks, insights, executions), trend charts |
| **Agents** | Agent status grid with health indicators |
| **Feedback** | Sage + Lexi feedback processing status |
| **Runtime** | 3 sub-tabs: Live Status, Migration Progress, Planning Workflows |
| **Metrics & Costs** | Performance metrics, cost tracking, security scan results |

### Data Sources

The dashboard queries these Supabase tables:
- `cas_agent_status` — Agent health and status
- `cas_agent_events` — Event sourcing log
- `cas_metrics_timeseries` — Time-series metrics
- `cas_marketer_insights` — Analytics data
- `cas_planner_tasks` — Kanban board
- `cas_security_scans` — Security scan results
- `cas_analyst_reports` — Analysis reports

---

## 10. Database Schema

### 10.1 Core CAS Tables

**Migration:** `tools/database/migrations/315_cas_platform_schema.sql`

```sql
-- Agent status tracking (8 initialized agents)
cas_agent_status (id, agent_id, status, uptime_seconds, last_activity_at, error_message, metadata)

-- Event sourcing (immutable audit trail)
cas_agent_events (id, agent_id, event_type, event_data, user_id, created_at)

-- Structured logging with full-text search
cas_agent_logs (id, agent_id, level, message, context, timestamp)

-- Time-series metrics
cas_metrics_timeseries (id, agent_id, metric_name, metric_value, labels, timestamp)

-- Versioned agent configuration
cas_agent_config (id, agent_id, config, version, created_by, created_at, is_active)
```

### 10.2 Specialized Agent Tables

```sql
-- Migration 271
cas_marketer_insights (id, insight_type, data, ...)

-- Migration 272
cas_security_scans (id, scan_type, results, ...)

-- Migration 273
cas_planner_tasks (id, title, description, task_type, priority, source, status, assigned_to, estimated_impact, ...)

-- Migration 274
cas_analyst_reports (id, report_type, content, ...)
```

### 10.3 Real-Time Strategy

Supabase Realtime (Postgres CDC) for live dashboard updates:

```typescript
supabase
  .channel('cas-agent-status')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'cas_agent_status'
  }, (payload) => updateAgentStatus(payload.new))
  .subscribe();
```

---

## 11. Integration Layer

### 11.1 Integration Bridges

| Bridge | File | Purpose |
|--------|------|---------|
| Sage Bridge | `cas/integration/sage-bridge.ts` | Connects Sage AI tutor feedback to CAS. Dispatches to Analyst for pattern analysis |
| Lexi Bridge | `cas/integration/lexi-bridge.ts` | Connects Lexi help bot feedback to CAS. Negative feedback alerts |

### 11.2 Message Bus

**Directory:** `cas/messages/`

| File | Purpose |
|------|---------|
| `envelope.ts` | Message envelope creation |
| `publisher.ts` | Message publishing |
| `types.ts` | Message type definitions |
| `validator.ts` | Message validation |
| `index.ts` | Exports |

Standardized JSON envelope format with version/protocol fields for A2A/MCP compatibility.

### 11.3 Dashboard Metrics

**Directory:** `cas/dashboard/`

| File | Purpose |
|------|---------|
| `index.ts` | `getDashboardState()`, `getCombinedFeedback()` |
| `types.ts` | Metric type definitions |
| `metrics-collector.ts` | Supabase-backed metrics collection |

---

## 12. DSPy Optimization

**Directory:** `cas/optimization/`

| Component | File | Status |
|-----------|------|--------|
| Optimization runner | `run_dspy.py` | Implemented — CLI for running optimization |
| Prompt loader | `prompt-loader.ts` | Implemented — TypeScript loader for optimized prompts |
| Signatures | `signatures/` | 3 signatures (maths, explain, diagnose) |
| Metrics | `metrics/` | Composite tutoring metric |
| Data loader | `data/` | Feedback loader (needs `ai_feedback` data) |
| Output | `output/` | Empty — no optimization has been run yet |
| Scheduling | `schedule_weekly.sh` | Shell script exists, no cron/CI configured |

---

## 13. Security & Access Control

### Admin Authorization

Uses `is_admin()` PostgreSQL function for RLS policies on all CAS tables (migration 327 fixed broken references to non-existent `admin_users` table).

### RBAC Permissions

CAS is integrated into TutorWise's admin RBAC system (`apps/web/src/lib/rbac/`). Permissions seeded in migration 328:

| Role | Resource | Action | Grants |
|------|----------|--------|--------|
| superadmin | cas | * | Full CAS access |
| admin | cas | view, approve, manage | View dashboard, approve/reject workflows, manage agents |
| systemadmin | cas | view | Read-only CAS monitoring |

**UI enforcement:** `usePermission('cas', 'approve')` gates approve/reject buttons in the admin approvals tab. `usePermission('cas', 'manage')` gates workflow trigger actions.

**API enforcement:** `/api/admin/cas/resume-workflow` checks `has_admin_permission(user_id, 'cas', 'approve')` RPC before allowing workflow resume.

### Audit Trail

All operations logged to `cas_agent_events` with user attribution via `persistEvent()`:

```typescript
await persistEvent('developer', 'implementation_plan_created', {
  featureName: 'user-avatar-upload',
  complexity: 'medium',
  stepsCount: 5
});
```

### Security Scanning

The Security agent scans for 10+ vulnerability patterns:
- SQL injection, XSS, eval/Function, hardcoded secrets
- process.env in client code, path traversal, SSRF
- Unsafe deserialization, insecure random, prototype pollution

LLM-powered false positive filtering reduces noise for high-severity findings.

---

## 14. File Structure

```
cas/
├── agents/                         # 9 autonomous agents
│   ├── director/src/
│   │   ├── index.ts                # Product Manager + Strategist + CTO + Cofounder
│   │   └── modules/
│   │       ├── strategic-decision-maker.ts  # LLM-powered alignment scoring
│   │       └── strategic-reader.ts          # Dynamic .ai/ doc parsing
│   ├── analyst/src/
│   │   ├── index.ts                # BA + Three Amigos Facilitator
│   │   └── modules/
│   │       ├── code-scanner.ts     # Codebase analysis
│   │       └── pattern-extractor.ts # AI-powered pattern extraction
│   ├── planner/src/index.ts        # Scrum Master + Flow Manager (Kanban)
│   ├── developer/src/
│   │   ├── index.ts                # Tech Lead + Architect + Implementer
│   │   └── FeaturePlanUpdater.ts   # Feature plan file management
│   ├── tester/src/index.ts         # QA Engineer + Test Automation (real Jest)
│   ├── qa/src/index.ts             # Release Manager + Quality Gate Owner
│   ├── security/src/index.ts       # Security Engineer + Compliance Officer
│   ├── engineer/src/index.ts       # DevOps + SRE + Build Engineer (real builds + Vercel preview deploys)
│   ├── marketer/src/index.ts       # Product Analytics + Growth Analyst
│   ├── agent-registry.ts           # Central agent registry
│   └── index.ts                    # Agent exports
│
├── packages/core/src/
│   ├── services/
│   │   ├── cas-ai.ts               # Shared LLM client (Gemini)
│   │   ├── cas-events.ts           # Event persistence helper
│   │   ├── cas-checkpointer.ts     # PostgresSaver singleton for LangGraph checkpointing
│   │   └── cas-vercel.ts           # Vercel REST API client for preview deployments
│   ├── runtime/
│   │   ├── AgentRuntimeInterface.ts  # Runtime interface
│   │   ├── RuntimeFactory.ts         # Factory (LangGraph only)
│   │   ├── LangGraphRuntime.ts       # Production runtime
│   │   ├── CircuitBreaker.ts         # Resilience
│   │   └── RetryUtility.ts           # Retry with backoff
│   ├── workflows/
│   │   └── PlanningGraph.ts          # Two-loop LangGraph workflow
│   └── admin/                        # WorkflowVisualizer component
│
├── integration/
│   ├── sage-bridge.ts                # Sage ↔ CAS bridge
│   └── lexi-bridge.ts               # Lexi ↔ CAS bridge
│
├── messages/                         # Message bus
│   ├── envelope.ts
│   ├── publisher.ts
│   ├── types.ts
│   └── validator.ts
│
├── dashboard/                        # Metrics collection
│   ├── index.ts
│   ├── types.ts
│   └── metrics-collector.ts
│
├── optimization/                     # DSPy prompt optimization
│   ├── run_dspy.py
│   ├── prompt-loader.ts
│   ├── signatures/
│   ├── metrics/
│   ├── data/
│   └── output/
│
└── docs/                             # Documentation
    ├── CAS-SOLUTION-DESIGN.md        # This document
    ├── CAS-ROADMAP.md                # Roadmap & future plans
    └── competitive-analysis.md       # Competitive analysis
```

---

## 15. Success Metrics

### Technical

| Metric | Target |
|--------|--------|
| Agent uptime | > 99.5% |
| Workflow execution time | < 60s per full pipeline |
| Real-time dashboard latency | < 1s |
| Circuit breaker recovery | < 30s |
| LLM fallback rate | < 5% (graceful degradation) |

### Operational

| Metric | Target |
|--------|--------|
| Feedback → task conversion | > 80% |
| Security scan coverage | 100% of deployments |
| Audit trail completeness | 100% of operations |
| Test execution | 100% real (no simulated results) |
| QA acceptance criteria validation | Semantic matching via LLM |

---

**END OF DOCUMENT**

# CAS Platform Architecture

**Version:** 4.0
**Last Updated:** February 28, 2026
**Status:** Production

---

## 1. Overview

CAS (Contextual Autonomous System) is TutorWise's AI-powered development platform. It orchestrates 9 autonomous agents through a LangGraph-based workflow to deliver continuous software improvement driven by user feedback from Sage (AI tutor) and Lexi (help bot).

### How It Works

```
User Feedback (Sage/Lexi)
         |
    Integration Bridges (sage-bridge.ts, lexi-bridge.ts)
         |
    CAS Message Bus (messages/)
         |
    LangGraph PlanningGraph (9-agent workflow)
         |
  Director → Planner → Analyst → Developer → Tester → QA → Security → Engineer → Marketer
         |
    Outputs: Feature briefs, development plans, test results,
             security reports, deployment decisions, production analytics
```

### Key Capabilities

- **9 autonomous agents** with a LangGraph StateGraph workflow
- **Circuit breaker** and **retry with backoff** for resilience
- **Admin dashboard** at `/admin/cas` with real-time monitoring
- **Workflow visualizer** with fullscreen demo execution
- **Event sourcing** via `cas_agent_events` for full audit trail
- **DSPy optimization** pipeline for prompt improvement
- **Integration bridges** connecting Sage and Lexi feedback loops

---

## 2. Agent Architecture

### 2.1 Agent Inventory

| Agent | File | Maturity | Key Capabilities |
|-------|------|----------|------------------|
| **Director** | `cas/agents/director/src/index.ts` | High | Reads `.ai/` vision/roadmap docs, PROCEED/ITERATE/DEFER decisions, alignment scoring, production metrics review |
| **Planner** | `cas/agents/planner/src/index.ts` | High | Sprint planning, resource allocation, roadmap alignment, feedback processing |
| **Analyst** | `cas/agents/analyst/src/index.ts` | High | Feature briefs, Three Amigos kickoff, codebase pattern extraction |
| **Developer** | `cas/agents/developer/src/index.ts` | Medium | Feasibility review, FeaturePlanUpdater, production metrics review. PlanningGraph tool returns hardcoded task list |
| **Tester** | `cas/agents/tester/src/` | Low | Basic testability review (string matching). `tester-agent.ts` has simulated `runTests()` |
| **QA** | `cas/agents/qa/src/` | Low | Threshold-based coverage/pass-rate report. `qa-agent.ts` has basic checks. `index.ts` is a stub |
| **Security** | `cas/agents/security/src/index.ts` | High | npm audit, regex code scanning (XSS/secrets/eval), pre-deployment gate, feature brief review |
| **Engineer** | `cas/agents/engineer/src/` | Low | `engineer-agent.ts` has simulated deploy/rollback. `index.ts` has permission system scaffold |
| **Marketer** | `cas/agents/marketer/src/index.ts` | High | Supabase-connected feedback analysis, production reports, cross-agent coordination |

### 2.2 Agent Maturity Levels

- **High** (Director, Planner, Analyst, Security, Marketer): Functional implementations with real data integration
- **Medium** (Developer): Has real capabilities but some hardcoded outputs
- **Low** (Tester, QA, Engineer): Return simulated/hardcoded results; need real tool integration

### 2.3 Agent Registry

`cas/agents/agent-registry.ts` — Central registry for all agents.
`cas/agents/index.ts` — Exports and initialization.

---

## 3. Workflow Engine

### 3.1 PlanningGraph

**File:** `cas/packages/core/src/workflows/PlanningGraph.ts` (1,113 lines)

The core orchestration engine. A LangGraph `StateGraph` wiring all 9 agents with conditional routing.

**Workflow flow:**

```
START → Director
  ├── DEFER → END
  └── PROCEED/ITERATE → Planner → Analyst → Developer → Tester
                                                           ├── FAILED → END
                                                           └── PASSED → QA → Security
                                                                              ├── CRITICAL → END
                                                                              └── OK/WARNINGS → Engineer → Marketer → END
```

**Key features:**
- `AGENT_METADATA` — Single source of truth for agent display names, descriptions, icons (used by WorkflowVisualizer)
- `executePlanningWorkflow(featureQuery)` — Entry point for workflow execution
- `getWorkflowStructure()` — Returns graph structure for visualization
- Conditional routing: `routeFromDirector()`, `routeFromSecurity()`, `routeFromTester()`
- DynamicStructuredTool wrappers for each agent
- Supabase checkpointing for state persistence
- LangSmith tracing support

### 3.2 Runtime Layer

**Directory:** `cas/packages/core/src/runtime/`

| File | Purpose |
|------|---------|
| `AgentRuntimeInterface.ts` | Interface definition (lifecycle, execution, state, observability) |
| `RuntimeFactory.ts` | Creates runtime instances. Currently LangGraph-only (CustomRuntime removed Phase 8) |
| `LangGraphRuntime.ts` (1,565 lines) | Full production runtime with circuit breaker, retry logic, 3 pre-built workflows |
| `CircuitBreaker.ts` (225 lines) | CLOSED/OPEN/HALF_OPEN state machine with configurable thresholds |
| `RetryUtility.ts` (251 lines) | Exponential backoff with jitter, error classification, retry-after parsing |

**Environment:** `CAS_RUNTIME=langgraph` (only supported runtime)

**Pre-built workflows in LangGraphRuntime:**
1. `content-strategy` — Content planning workflow
2. `feature-development` — Full 9-agent development workflow
3. `security-audit` — Security-focused audit workflow

### 3.3 Workflow Visualizer

**Locations:**
- `apps/web/src/app/(fullscreen)/workflow-fullscreen/page.tsx` — Standalone fullscreen view
- `apps/web/src/app/(admin)/admin/cas/workflow-fullscreen/page.tsx` — Admin-embedded view

Uses `WorkflowVisualizer` component from `cas/packages/core/src/admin/` which reads structure from `getWorkflowStructure()`.

---

## 4. Admin Dashboard

**Location:** `apps/web/src/app/(admin)/admin/cas/page.tsx` (859 lines)

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
- `cas_planner_tasks` — Task backlog
- `cas_security_scans` — Security scan results
- `cas_analyst_reports` — Analysis reports

---

## 5. Database Schema

### 5.1 Core CAS Tables

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

### 5.2 Specialized Agent Tables

```sql
-- Migration 271
cas_marketer_insights (id, insight_type, data, ...)

-- Migration 272
cas_security_scans (id, scan_type, results, ...)

-- Migration 273
cas_planner_tasks (id, task_type, priority, ...)

-- Migration 274
cas_analyst_reports (id, report_type, content, ...)
```

### 5.3 Real-Time Strategy

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

## 6. Integration Layer

### 6.1 Integration Bridges

| Bridge | File | Purpose |
|--------|------|---------|
| Sage Bridge | `cas/integration/sage-bridge.ts` (318 lines) | Connects Sage AI tutor feedback to CAS. Dispatches to Analyst for pattern analysis, curriculum review flagging |
| Lexi Bridge | `cas/integration/lexi-bridge.ts` (242 lines) | Connects Lexi help bot feedback to CAS. Negative feedback alerts, Analyst dispatch |

### 6.2 Message Bus

**Directory:** `cas/messages/`

| File | Purpose |
|------|---------|
| `envelope.ts` | Message envelope creation |
| `publisher.ts` | Message publishing |
| `types.ts` | Message type definitions |
| `validator.ts` | Message validation |
| `index.ts` | Exports |

Standardized JSON envelope format with version/protocol fields for A2A/MCP compatibility.

### 6.3 Dashboard Metrics

**Directory:** `cas/dashboard/`

| File | Purpose |
|------|---------|
| `index.ts` | `getDashboardState()`, `getCombinedFeedback()` |
| `types.ts` | Metric type definitions |
| `metrics-collector.ts` | Supabase-backed metrics collection |

---

## 7. DSPy Optimization

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

**Usage:**
```bash
python cas/optimization/run_dspy.py --agent sage --all --dry-run
```

---

## 8. Security & Access Control

### Admin Authorization

Uses `is_admin()` PostgreSQL function for RLS policies on all CAS tables.

### Audit Trail

All operations logged to `cas_agent_events` with user attribution:

```typescript
await supabase.from('cas_agent_events').insert({
  agent_id: 'developer',
  event_type: 'agent_stopped',
  event_data: { reason: 'manual_stop' },
  user_id: currentUser.id
});
```

---

## 9. File Structure

```
cas/
├── agents/                         # 9 autonomous agents
│   ├── director/src/index.ts       # Strategic alignment
│   ├── planner/src/index.ts        # Sprint planning
│   ├── analyst/src/index.ts        # Requirements analysis
│   ├── developer/src/index.ts      # Development planning
│   ├── tester/src/                 # Test execution (index.ts + tester-agent.ts)
│   ├── qa/src/                     # Quality assurance (index.ts + qa-agent.ts)
│   ├── security/src/index.ts       # Security scanning
│   ├── engineer/src/               # Deployment (index.ts + engineer-agent.ts)
│   ├── marketer/src/index.ts       # Analytics & feedback
│   ├── agent-registry.ts           # Central agent registry
│   └── index.ts                    # Agent exports
│
├── packages/core/src/
│   ├── runtime/
│   │   ├── AgentRuntimeInterface.ts  # Runtime interface
│   │   ├── RuntimeFactory.ts         # Factory (LangGraph only)
│   │   ├── LangGraphRuntime.ts       # Production runtime (1,565 lines)
│   │   ├── CircuitBreaker.ts         # Resilience (225 lines)
│   │   └── RetryUtility.ts           # Retry with backoff (251 lines)
│   ├── workflows/
│   │   └── PlanningGraph.ts          # 9-agent LangGraph workflow (1,113 lines)
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
    ├── cas-solution-design.md        # This document
    └── cas-roadmap.md                # Roadmap & future plans
```

---

## 10. Success Metrics

### Technical

| Metric | Target |
|--------|--------|
| Agent uptime | > 99.5% |
| Workflow execution time | < 60s per full pipeline |
| Real-time dashboard latency | < 1s |
| Circuit breaker recovery | < 30s |

### Operational

| Metric | Target |
|--------|--------|
| Feedback → task conversion | > 80% |
| Security scan coverage | 100% of deployments |
| Audit trail completeness | 100% of operations |

---

**END OF DOCUMENT**

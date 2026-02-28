# CAS Platform Solution Design

**Version:** 3.0
**Created:** 2026-02-26
**Status:** Active Development
**Implementation Strategy:** Option 2 - Admin UI + Abstraction in Parallel

---

## Executive Summary

This document outlines the strategic architecture for the **CAS (Contextual Autonomous System) Platform** - a production AI agent management system that orchestrates 8 autonomous agents delivering 400% faster software development cycles.

### Implementation Approach

**Template Reuse:** Copy `/admin/sage` dashboard as starting point for `/admin/cas` to ensure:
- ✅ **Consistency** - Same UX patterns across AI agent dashboards
- ✅ **Speed** - Reuse proven Hub architecture components
- ✅ **Reliability** - Tested patterns from Sage/Lexi dashboards

### Goals

1. **Immediate Visibility** - Admin dashboard for monitoring CAS operations
2. **Strategic Scalability** - Architecture grows from 8 to 50+ agents
3. **Future-Proof Design** - Runtime abstraction layer enabling LangGraph migration
4. **Production-Grade** - Real-time monitoring, observability, and control
5. **Risk Mitigation** - Gradual migration path, zero-downtime deployments

### Key Decisions

- ✅ **Copy Sage Template** - Start with proven `/admin/sage` page
- ✅ **Two-UI Strategy:** Admin Quick View + Standalone Console (future)
- ✅ **Runtime Abstraction:** Custom → LangGraph migration path
- ✅ **Phased Approach:** Build UI + Abstraction in parallel (Option 2)
- ✅ **API-First:** Backend service layer decoupled from frontends
- ✅ **Event Sourcing:** Complete audit trail for agent operations

---

## Quick Start for Implementation

### Step 1: Copy Sage Template

```bash
# Copy Sage admin page as CAS template
cp -r apps/web/src/app/(admin)/admin/sage apps/web/src/app/(admin)/admin/cas

# Update imports and rename components for CAS
```

### Step 2: Customize for CAS

Replace Sage-specific content with CAS metrics:

| Sage Metric | CAS Equivalent |
|-------------|----------------|
| `sage_sessions_total` | `cas_tasks_total` |
| `sage_questions_total` | `cas_agent_executions` |
| `sage_unique_users` | `cas_agents_active` |
| `sage_pro_subscriptions` | `cas_feedback_processed` |

### Step 3: Data Sources

CAS will query these tables:
- `cas_agent_status` - Agent health and status
- `cas_agent_events` - Event sourcing log
- `cas_marketer_insights` - Existing analytics data
- `cas_planner_tasks` - Task backlog
- `cas_security_scans` - Security scan results

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Strategic Architecture](#2-strategic-architecture)
3. [Frontend Strategy](#3-frontend-strategy)
4. [Backend API Architecture](#4-backend-api-architecture)
5. [Database Design](#5-database-design)
6. [Runtime Abstraction Layer](#6-runtime-abstraction-layer)
7. [Migration to LangGraph](#7-migration-to-langgraph)
8. [Security & Access Control](#8-security--access-control)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Success Metrics](#10-success-metrics)

---

## 1. Current State Analysis

### Production Infrastructure

**8 Active AI Agents** (Running 24/7 via Supabase Edge Functions + pg_cron):

| Agent | Role | Status | Current Deployment |
|-------|------|--------|-------------------|
| Planner | Project Manager | ✅ Active | Feedback processor (hourly) |
| Analyst | Business Analyst | ✅ Active | Feedback processor (hourly) |
| Developer | Software Developer | ✅ Active | Framework mode |
| Tester | QA Tester | ✅ Active | Framework mode |
| QA | QA Engineer | ✅ Active | Framework mode |
| Security | Security Engineer | ✅ Active | Weekly scan (pg_cron #49) |
| Engineer | System Engineer | ✅ Active | Framework mode |
| Marketer | Growth Manager | ✅ Active | Daily analytics (pg_cron #48) |

### Data Flow Architecture

```
Sage/Lexi User Feedback
         ↓
Integration Bridges (sage-bridge.ts, lexi-bridge.ts)
         ↓
CAS Message Bus (messages/)
         ↓
Agent Orchestration
    ↓       ↓       ↓
Marketer  Analyst  Security
    ↓       ↓       ↓
Analytics Tasks   Scans
    ↓       ↓       ↓
Supabase Tables (cas_marketer_insights, cas_planner_tasks, cas_security_scans)
```

### Existing Components

**Production Assets:**
- ✅ `cas/agents/` - 8 AI agents with planning documents
- ✅ `cas/packages/` - Core libraries (@cas/core, @cas/agent, @cas/sadd, @cas/user-api)
- ✅ `cas/integration/` - Sage & Lexi bridges
- ✅ `cas/dashboard/` - Metrics collectors
- ✅ `cas/messages/` - Message bus system
- ✅ `cas/tools/` - Automation utilities
- ✅ Database tables with production data

**What's Missing:**
- ❌ UI for monitoring/controlling agents
- ❌ Real-time visibility into agent operations
- ❌ API layer for agent management
- ❌ Event sourcing for audit trails
- ❌ Runtime abstraction for framework flexibility

---

## 2. Strategic Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────┐    ┌──────────────────────────┐   │
│  │  Admin Quick View      │    │  CAS Console             │   │
│  │  /admin/cas            │    │  (Future: Standalone)    │   │
│  │  (Copy from /admin/sage)│   │                          │   │
│  │                        │    │  - Full Agent Control    │   │
│  │  - KPI Overview        │    │  - Real-time Monitoring  │   │
│  │  - Agent Status Grid   │    │  - Configuration UI      │   │
│  │  - Recent Activity     │    │  - Debug Tools           │   │
│  │  - Hub Architecture    │    │  - Analytics Dashboard   │   │
│  └────────────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       API/SERVICE LAYER                          │
│  CAS API Service (cas/apps/api - NEW)                           │
│  - AgentService, MetricsService, MessageBusService              │
│  - WebSocket for real-time updates                              │
│  - RBAC middleware                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      RUNTIME ABSTRACTION                         │
│              ┌─────────────────────────────┐                    │
│              │  AgentRuntimeInterface      │                    │
│              └─────────────────────────────┘                    │
│                ↓                          ↓                      │
│         CustomRuntime              LangGraphRuntime             │
│         (Phase 1-2)                (Phase 3-4)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA/AGENT LAYER                           │
│  Supabase (PostgreSQL + Edge Functions + Realtime)              │
│  - Agent tables: cas_agent_status, cas_agent_events, etc.       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Strategy

### Admin Quick View (`/admin/cas`)

**Starting Point:** Copy `/admin/sage/page.tsx` and customize

**Location:** `apps/web/src/app/(admin)/admin/cas/page.tsx`

**Why Copy Sage?**
- ✅ Already uses Hub architecture (HubPageLayout, HubTabs, HubKPIGrid)
- ✅ Has tab-based navigation (overview, usage, quota, etc.)
- ✅ Uses React Query for real-time updates
- ✅ Proven KPI metric patterns with useAdminMetric hook
- ✅ Consistent with admin UX

**Tabs for CAS Dashboard:**

```typescript
type TabFilter = 'overview' | 'agents' | 'tasks' | 'security' | 'metrics';
```

| Tab | Sage Equivalent | CAS Content |
|-----|----------------|-------------|
| **Overview** | Overview | KPIs: Active Agents, Tasks Generated, Insights Created, Security Scans |
| **Agents** | Usage | 8 Agent Status Grid with health indicators |
| **Tasks** | Quota | Planner task backlog from feedback processing |
| **Security** | Subjects | Security scan results and vulnerability trends |
| **Metrics** | Subscriptions | Analytics from Marketer agent |

**KPI Metrics to Display:**

```typescript
// CAS KPIs (replace Sage metrics)
const agentsActiveMetric = useAdminMetric({ metric: 'cas_agents_active', compareWith: 'last_month' });
const tasksGeneratedMetric = useAdminMetric({ metric: 'cas_tasks_generated', compareWith: 'last_month' });
const insightsCreatedMetric = useAdminMetric({ metric: 'cas_insights_created', compareWith: 'last_month' });
const vulnerabilitiesMetric = useAdminMetric({ metric: 'cas_vulnerabilities_found', compareWith: 'last_month' });
const agentUptimeMetric = useAdminMetric({ metric: 'cas_agent_uptime_avg', compareWith: 'last_month' });
```

**Data Sources:**

```typescript
// Query CAS tables (similar to Sage querying sage_sessions)
const { data: casStats } = useQuery({
  queryKey: ['admin-cas-stats'],
  queryFn: async () => {
    const [agentsRes, tasksRes, insightsRes, scansRes] = await Promise.all([
      supabase.from('cas_agent_status').select('*'),
      supabase.from('cas_planner_tasks').select('id', { count: 'exact', head: true }),
      supabase.from('cas_marketer_insights').select('id', { count: 'exact', head: true }),
      supabase.from('cas_security_scans').select('id', { count: 'exact', head: true }),
    ]);

    const activeAgents = agentsRes.data?.filter(a => a.status === 'running').length || 0;

    return {
      activeAgents,
      totalTasks: tasksRes.count || 0,
      totalInsights: insightsRes.count || 0,
      totalScans: scansRes.count || 0,
    };
  },
  staleTime: 30000,
  refetchOnMount: 'always',
});
```

**Component Structure:**

```
apps/web/src/app/(admin)/admin/cas/
├── page.tsx                          (Main dashboard - copied from Sage)
├── page.module.css                   (Styles - copied from Sage)
└── components/
    ├── AgentStatusGrid.tsx           (8 agents with health indicators)
    ├── TasksTable.tsx                (Planner tasks backlog)
    ├── SecurityScansTable.tsx        (Security scan results)
    └── MetricsOverview.tsx           (Marketer analytics)
```

---

## 4. Backend API Architecture

### CAS API Service

**Location:** `cas/apps/api/` (NEW - to be created)

**Framework:** Express.js with TypeScript

**Key Services:**

```typescript
// AgentService - Manage agent lifecycle
export class AgentService {
  constructor(private runtime: AgentRuntimeInterface) {}

  async getAgents(): Promise<Agent[]>
  async getAgentStatus(agentId: string): Promise<AgentStatus>
  async startAgent(agentId: string): Promise<void>
  async stopAgent(agentId: string): Promise<void>
  async restartAgent(agentId: string): Promise<void>
}

// MetricsService - Aggregate metrics
export class MetricsService {
  async getOverview(): Promise<OverviewMetrics>
  async getAgentMetrics(agentId: string): Promise<AgentMetrics>
  async getTimeseries(metric: string): Promise<TimeseriesData[]>
}
```

**API Endpoints:**

```
GET    /api/v1/agents                    # List all agents
GET    /api/v1/agents/:id                # Get agent details
POST   /api/v1/agents/:id/start          # Start agent
POST   /api/v1/agents/:id/stop           # Stop agent
GET    /api/v1/agents/:id/logs           # Get agent logs
GET    /api/v1/metrics/overview          # Overview KPIs
GET    /api/v1/analytics/marketer        # Marketer insights
GET    /api/v1/analytics/security        # Security scans
WS     /api/v1/realtime                  # WebSocket for live updates
```

---

## 5. Database Design

### New Tables (Event Sourcing)

```sql
-- Agent status tracking
CREATE TABLE cas_agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'paused', 'stopped', 'error')),
  uptime_seconds INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event sourcing (complete audit trail)
CREATE TABLE cas_agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Structured logging
CREATE TABLE cas_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL,
  level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Time-series metrics
CREATE TABLE cas_metrics_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  labels JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Agent configuration (versioned)
CREATE TABLE cas_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

### Real-Time Strategy

Use **Supabase Realtime** (Postgres CDC):

```typescript
// Frontend: Subscribe to agent status changes
supabase
  .channel('cas-agent-status')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'cas_agent_status'
  }, (payload) => {
    updateAgentStatus(payload.new);
  })
  .subscribe();
```

---

## 6. Runtime Abstraction Layer

### Interface Definition

```typescript
// cas/packages/core/src/runtime/AgentRuntimeInterface.ts

export interface AgentRuntimeInterface {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Agent management
  registerAgent(agentId: string, config: AgentConfig): Promise<void>;
  unregisterAgent(agentId: string): Promise<void>;

  // Execution
  executeTask(task: AgentTask): Promise<AgentResult>;
  streamTask(task: AgentTask): AsyncGenerator<AgentResult>;

  // State management
  getAgentState(agentId: string): Promise<any>;
  updateAgentState(agentId: string, state: any): Promise<void>;

  // Observability
  getMetrics(agentId: string): Promise<AgentMetrics>;
  getLogs(agentId: string, filter?: LogFilter): Promise<AgentLog[]>;
}
```

### Runtime Factory

```typescript
// cas/packages/core/src/runtime/RuntimeFactory.ts

export enum RuntimeType {
  CUSTOM = 'custom',
  LANGGRAPH = 'langgraph'
}

export class AgentRuntimeFactory {
  static create(type?: RuntimeType): AgentRuntimeInterface {
    const runtimeType = type || process.env.CAS_RUNTIME || RuntimeType.CUSTOM;

    switch (runtimeType) {
      case RuntimeType.CUSTOM:
        return new CustomAgentRuntime();
      case RuntimeType.LANGGRAPH:
        return new LangGraphAgentRuntime();
    }
  }
}
```

**Usage:**

```bash
# .env
CAS_RUNTIME=custom    # Phase 1-2
# CAS_RUNTIME=langgraph  # Phase 3+
```

---

## 7. Migration to LangGraph

### Why LangGraph?

| Feature | Custom | LangGraph |
|---------|--------|-----------|
| State Management | Manual JSONB | Built-in StateGraph |
| Orchestration | Custom bus | Graph-based |
| Observability | Custom logs | **LangSmith** |
| Error Handling | Manual | Built-in retries |
| Production Ready | DIY | **Battle-tested** |

### Migration Roadmap

#### Phase 1: Abstraction (Week 1-2)
- [ ] Define `AgentRuntimeInterface`
- [ ] Wrap current agents in `CustomAgentRuntime`
- [ ] Add environment-based runtime switching

#### Phase 2: LangGraph POC (Week 3-4)
- [ ] Install LangGraph dependencies
- [ ] Implement `LangGraphAgentRuntime`
- [ ] Migrate **Marketer agent only**
- [ ] Compare: Custom vs LangGraph

#### Phase 3: Gradual Migration (Week 5-8)
- [ ] Week 5: Analyst + Security → LangGraph
- [ ] Week 6: Planner + Developer → LangGraph
- [ ] Week 7: Tester + QA → LangGraph
- [ ] Week 8: Engineer → LangGraph

#### Phase 4: Advanced Features (Week 9-12)
- [ ] Multi-agent workflows as graphs
- [ ] Human-in-the-loop approvals
- [ ] Streaming responses to UI

---

## 8. Security & Access Control

### RBAC Permissions

```sql
CREATE TYPE cas_permission AS ENUM (
  'cas.view',           -- View-only (all admins)
  'cas.control',        -- Start/stop agents (senior admins)
  'cas.configure',      -- Change config (engineering)
  'cas.admin'           -- Full control (platform admins)
);
```

### Audit Logging

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

## 9. Implementation Roadmap

### **Option 2: Admin UI + Abstraction in Parallel** (4 weeks)

#### Week 1: Foundation
**Backend:**
- [ ] Create database schema (cas_agent_status, cas_agent_events, etc.)
- [ ] Define `AgentRuntimeInterface`
- [ ] Implement `CustomAgentRuntime`

**Frontend:**
- [ ] **Copy `/admin/sage` to `/admin/cas`**
- [ ] Replace Sage metrics with CAS metrics
- [ ] Update tab structure (overview, agents, tasks, security, metrics)
- [ ] Connect to existing `cas_marketer_insights` data

**Deliverable:** Admin dashboard with read-only monitoring

---

#### Week 2: API Layer
**Backend:**
- [ ] Scaffold CAS API service (Express + TypeScript)
- [ ] Implement Agent endpoints (GET /agents, GET /agents/:id)
- [ ] Implement Metrics endpoints
- [ ] Add WebSocket server

**Frontend:**
- [ ] Connect admin UI to CAS API
- [ ] Add real-time updates via Supabase Realtime
- [ ] Implement charts (trend charts for agent activity)

**Deliverable:** Live data from API in admin dashboard

---

#### Week 3: Control & Configuration
**Backend:**
- [ ] Agent control endpoints (start/stop/restart)
- [ ] Configuration endpoints
- [ ] Log retrieval

**Frontend:**
- [ ] Add agent control buttons (start/stop/restart)
- [ ] Build AgentStatusGrid component (8 agents)
- [ ] Build TasksTable component (Planner backlog)
- [ ] Build SecurityScansTable component

**Deliverable:** Full admin dashboard with controls

---

#### Week 4: LangGraph POC & Polish
**LangGraph:**
- [ ] Install LangGraph deps
- [ ] Implement `LangGraphAgentRuntime`
- [ ] Migrate Marketer agent
- [ ] Set up LangSmith

**Polish:**
- [ ] Error handling and loading states
- [ ] Permission checks
- [ ] Documentation
- [ ] Production deployment

**Deliverable:** Production-ready CAS platform

---

## 10. Success Metrics

### Technical
- Agent uptime > 99.5%
- API response time < 200ms (p95)
- Real-time latency < 1s

### Business
- Task generation from feedback > 80%
- Developer velocity improvement tracked
- Security vulnerability detection rate

### Migration
- LangGraph migration completion %
- Incident rate during migration < 1%

---

## Appendix A: Copy Sage Template Commands

### Step 1: Copy Sage Directory

```bash
cd apps/web/src/app/(admin)/admin
cp -r sage cas
```

### Step 2: Update Files

```bash
cd cas

# Update page.tsx
# Replace: Sage → CAS
# Replace: sage_ → cas_
# Replace: SageAnalyticsPage → CASAnalyticsPage

# Update imports in components
find . -type f -name "*.tsx" -exec sed -i '' 's/sage/cas/g' {} \;
find . -type f -name "*.tsx" -exec sed -i '' 's/Sage/CAS/g' {} \;
```

### Step 3: Update Tab Structure

```typescript
// Change from:
type TabFilter = 'overview' | 'usage' | 'quota' | 'subjects' | 'subscriptions';

// To:
type TabFilter = 'overview' | 'agents' | 'tasks' | 'security' | 'metrics';
```

### Step 4: Update Metrics

Replace Sage metrics with CAS equivalents in the KPI cards.

---

## Appendix B: File Structure

```
tutorwise/
├── apps/web/
│   └── src/app/(admin)/admin/
│       ├── sage/                         ✅ Template source
│       └── cas/                          👈 NEW (copy from sage)
│           ├── page.tsx
│           ├── page.module.css
│           └── components/
│               ├── AgentStatusGrid.tsx
│               ├── TasksTable.tsx
│               ├── SecurityScansTable.tsx
│               └── MetricsOverview.tsx
│
└── cas/
    ├── packages/core/
    │   └── src/runtime/
    │       ├── AgentRuntimeInterface.ts
    │       ├── RuntimeFactory.ts
    │       ├── CustomRuntime.ts
    │       └── LangGraphRuntime.ts
    │
    ├── apps/
    │   └── api/                          👈 NEW (to be created)
    │       └── src/
    │           ├── index.ts
    │           ├── routes/
    │           ├── controllers/
    │           └── services/
    │
    └── docs/feature/
        └── cas-solution-design.md        👈 This document
```

---

## 11. Agent Improvement Roadmap

**Added:** 2026-02-28
**Status:** Planned

### Current Agent Maturity Assessment

| Agent | Maturity | Key Capabilities | Primary Gaps |
|-------|----------|-------------------|--------------|
| **Director** | High | Vision/roadmap reading, PROCEED/ITERATE/DEFER decisions, alignment scoring, production metrics review | No LLM integration (rule-based keyword matching for alignment) |
| **Planner** | High | Sprint planning, resource allocation, roadmap alignment, feedback processing | No dependency graph resolution |
| **Analyst** | High | Feature briefs, Three Amigos kickoff, codebase pattern extraction, contextual analysis | Hardcoded patterns rather than dynamic discovery |
| **Developer** | Medium | Feasibility review, FeaturePlanUpdater, production metrics review | PlanningGraph tool returns hardcoded task list; no real code generation |
| **Tester** | Low | Basic testability review (string matching), simulated `runTests()` | Always returns passing results; no real Jest/Vitest execution |
| **QA** | Low | Threshold-based coverage/pass-rate report from test results | No acceptance criteria validation, no regression analysis |
| **Security** | High | npm audit, code pattern scanning (XSS/secrets/eval), pre-deployment gate, feature brief review | Regex-based only; no SAST tool integration |
| **Engineer** | Low | Simulated deploy/rollback with setTimeout, permission system scaffold | No real CI/CD integration (Vercel/GitHub Actions) |
| **Marketer** | High | Supabase-connected feedback analysis, production reports, cross-agent review coordination | Some metrics still simulated (trends, user feedback) |

### Phase 5: Agent Hardening (Priority Improvements)

#### 5a. Tester Agent — Real Test Execution

**Current:** Returns simulated results (`totalTests: 12, passedTests: 12, coverage: 95`)
**Target:** Execute actual Jest/Vitest tests programmatically

**Implementation:**

```typescript
// cas/agents/tester/src/tester-agent.ts
import { execAsync } from '../../../packages/core/src/utils/exec';

async runTests(featureName: string, options?: { testPath?: string }): Promise<TestResults> {
  const testPath = options?.testPath || `apps/web/src/**/*.test.{ts,tsx}`;
  const coverageFlag = '--coverage --coverageReporters=json-summary';

  const { stdout, stderr, exitCode } = await execAsync(
    `npx jest ${testPath} ${coverageFlag} --json --forceExit`,
    { cwd: this.projectRoot, timeout: 120_000 }
  );

  const jestResult = JSON.parse(stdout);
  const coverageSummary = JSON.parse(
    fs.readFileSync('coverage/coverage-summary.json', 'utf-8')
  );

  return {
    passed: jestResult.success,
    totalTests: jestResult.numTotalTests,
    passedTests: jestResult.numPassedTests,
    failedTests: jestResult.numFailedTests,
    coverage: coverageSummary.total.lines.pct,
    duration: Date.now() - startTime,
    failures: jestResult.testResults
      .filter((r: any) => r.status === 'failed')
      .map((r: any) => ({ test: r.name, error: r.message })),
  };
}
```

**Files:** `cas/agents/tester/src/tester-agent.ts`
**Dependencies:** Jest installed (already in devDeps), `coverage/` directory

#### 5b. QA Agent — Acceptance Criteria Validation

**Current:** Threshold-based report (coverage >= 90 => approved)
**Target:** Validate against acceptance criteria from Analyst's feature brief, add regression detection

**Implementation:**

```typescript
// cas/agents/qa/src/qa-agent.ts
async performQAReview(
  featureName: string,
  testResults: TestResults,
  acceptanceCriteria?: string[]
): Promise<QAReport> {
  // 1. Existing threshold checks (coverage, pass rate)
  // 2. NEW: Cross-reference test names against acceptance criteria
  // 3. NEW: Check for regression (compare with previous test run from DB)
  // 4. NEW: Return structured APPROVED/REJECTED with specific blockers

  const previousRun = await this.getPreviousTestRun(featureName);
  const regressions = this.detectRegressions(testResults, previousRun);
  const criteriaGaps = this.validateAcceptanceCriteria(testResults, acceptanceCriteria);

  return {
    decision: regressions.length === 0 && criteriaGaps.length === 0 ? 'APPROVED' : 'REJECTED',
    regressions,
    criteriaGaps,
    coverageReport: { ... },
    recommendations: [ ... ],
  };
}
```

**Files:** `cas/agents/qa/src/qa-agent.ts`
**Dependencies:** `cas_agent_events` table for historical test data

#### 5c. Engineer Agent — Real CI/CD Integration

**Current:** Simulated deploy with `setTimeout(resolve, 300)`
**Target:** Trigger actual Vercel deployments or GitHub Actions workflows

**Implementation:**

```typescript
// cas/agents/engineer/src/engineer-agent.ts
async deploy(featureName: string, options: DeployOptions): Promise<DeployResult> {
  // 1. Pre-deployment: run build check (npx next build)
  // 2. Trigger deployment via Vercel API or gh workflow dispatch
  // 3. Poll for deployment status
  // 4. Run smoke tests against preview URL
  // 5. Promote to production if smoke tests pass

  if (!options.securityApproved) {
    return { status: 'blocked', reason: 'Security approval required' };
  }

  // Build verification
  const buildResult = await execAsync('npm run build', { cwd: this.projectRoot });
  if (buildResult.exitCode !== 0) {
    return { status: 'failed', error: 'Build failed', details: buildResult.stderr };
  }

  // Deploy via Vercel API
  const deployment = await this.triggerVercelDeploy(featureName, options.environment);
  return {
    status: 'deployed',
    environment: options.environment,
    url: deployment.url,
    timestamp: new Date().toISOString(),
  };
}
```

**Files:** `cas/agents/engineer/src/engineer-agent.ts`
**Dependencies:** `VERCEL_TOKEN` env var, or GitHub Actions API token

#### 5d. Developer Agent — LLM-Powered Planning

**Current:** String-matching feasibility review, hardcoded task list in PlanningGraph tool
**Target:** Use Gemini to generate implementation plans from feature briefs

**Implementation:**

```typescript
// cas/agents/developer/src/index.ts
async createDevelopmentPlan(featureBrief: string): Promise<DevelopmentPlan> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: `Given this feature brief, create a development plan with:
        1. Task breakdown with file paths
        2. Dependency order
        3. Estimated complexity (S/M/L)
        4. Risk assessment

        Feature Brief:
        ${featureBrief}` }]
    }],
  });

  return this.parsePlan(result.response.text());
}
```

**Files:** `cas/agents/developer/src/index.ts`, update PlanningGraph `developerTool`
**Dependencies:** `GOOGLE_AI_API_KEY` (already available)

### Phase 6: Workflow Intelligence

#### 6a. Reflection Node

**Purpose:** Post-agent self-critique loop. After each agent executes, a reflection step evaluates output quality and can trigger re-execution.

**Where in workflow:** Inserted as a subgraph after Developer, Tester, and QA nodes.

```
Developer → reflectionNode → (if quality < threshold) → Developer (retry)
                            → (if quality >= threshold) → Tester
```

**Implementation pattern:**

```typescript
// cas/packages/core/src/workflows/reflection.ts
async function reflectionNode(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  const lastAgent = state.completedSteps[state.completedSteps.length - 1];
  const lastOutput = state.context[`${lastAgent}Output`];

  // Use LLM to critique the output
  const critique = await evaluateOutput(lastAgent, lastOutput, state.featureQuery);

  if (critique.score < 0.7 && (state.context.retryCount || 0) < 2) {
    // Retry with feedback
    return {
      currentStep: `${lastAgent}_retry`,
      context: {
        ...state.context,
        retryCount: (state.context.retryCount || 0) + 1,
        reflectionFeedback: critique.feedback,
      },
    };
  }

  return {
    currentStep: `${lastAgent}_reflection_passed`,
    context: {
      ...state.context,
      reflectionScores: {
        ...(state.context.reflectionScores || {}),
        [lastAgent]: critique.score,
      },
    },
  };
}
```

**Files:** `cas/packages/core/src/workflows/reflection.ts`, update `PlanningGraph.ts`
**Impact:** Adds self-healing capability — agents improve their own output before passing to next stage

#### 6b. Human Approval Gate

**Purpose:** Pause workflow at critical points (pre-deployment, post-security) and wait for human approval via the admin UI.

**Where in workflow:** Between Security and Engineer nodes.

```
Security → humanApprovalGate → (approved) → Engineer
                              → (rejected) → END
                              → (timeout)  → END with notification
```

**Implementation pattern:**

```typescript
// cas/packages/core/src/workflows/approval-gate.ts
async function humanApprovalGate(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  // 1. Save approval request to database
  const { data: request } = await supabase
    .from('cas_approval_requests')
    .insert({
      workflow_id: state.metadata.workflowId,
      feature_name: state.featureName,
      gate_type: 'pre_deployment',
      security_report: state.securityReport,
      qa_report: state.qaReport,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  // 2. Notify admin (Slack webhook / email)
  await notifyAdmin({
    type: 'approval_required',
    feature: state.featureName,
    requestId: request.id,
    dashboardUrl: `/admin/cas/approvals/${request.id}`,
  });

  // 3. Poll for decision (or use LangGraph interrupt)
  const decision = await waitForApproval(request.id, { timeoutMs: 86_400_000 });

  return {
    currentStep: decision === 'approved' ? 'approval_granted' : 'approval_denied',
    context: {
      ...state.context,
      approvalDecision: decision,
      approvedBy: request.approved_by,
    },
  };
}
```

**Database migration needed:**

```sql
CREATE TABLE cas_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  gate_type VARCHAR(50) NOT NULL,
  security_report JSONB,
  qa_report TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by UUID REFERENCES auth.users(id),
  decision_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);
```

**Admin UI:** Add `/admin/cas/approvals` page with approve/reject buttons (see Phase 7 below).

**Files:** `cas/packages/core/src/workflows/approval-gate.ts`, migration, update `PlanningGraph.ts`

### Phase 7: Admin Approval UI

**Purpose:** Allow admins to approve/reject deployment requests from the CAS dashboard.

**Location:** `apps/web/src/app/(admin)/admin/cas/approvals/`

**Components:**
- `ApprovalRequestCard` — Shows feature name, security report summary, QA status, approve/reject buttons
- `ApprovalRequestList` — Lists all pending approvals with filtering
- `ApprovalHistory` — Audit trail of past decisions

**Integration:** Subscribe to `cas_approval_requests` table via Supabase Realtime for live updates.

### Phase 8: DSPy Scheduling & Gaps

#### Current DSPy State

| Component | Status | Gap |
|-----------|--------|-----|
| `run_dspy.py` | Implemented | No scheduling (manual runs only) |
| `prompt-loader.ts` | Implemented | File watching works, but no optimized output files exist yet |
| `signatures/` | 3 signatures (maths, explain, diagnose) | Missing: `practice`, `review`, `homework_help` |
| `metrics/` | Composite tutoring metric | Missing: per-subject metrics |
| `data/loader.py` | Feedback loader | Needs `ai_feedback` table data to function |
| `output/` | Empty (`.gitkeep` only) | No optimization has been run yet |

#### DSPy Gaps to Close

1. **No cron scheduling** — `run_dspy.py` needs to be scheduled weekly
   - Option A: GitHub Actions workflow (`.github/workflows/dspy-optimization.yml`)
   - Option B: pg_cron + Edge Function that calls the Python script
   - Recommended: GitHub Actions (Python environment already configured)

2. **No training data** — `output/` is empty because no optimization has been run
   - Need: Sufficient feedback in `ai_feedback` table (minimum 10 examples per signature)
   - Action: Run `python cas/optimization/run_dspy.py --agent sage --all --dry-run` to test

3. **Missing signatures** — Only 3 of 6 Sage session goals have DSPy signatures
   - Need: `PracticeModule`, `ReviewModule`, `HomeworkHelpModule`
   - Location: `cas/optimization/signatures/`

4. **No Lexi signatures** — Lexi help bot has no DSPy optimization signatures
   - Need: `HelpArticleModule`, `TroubleshootModule`

### Agent Synchronization & Integration Patterns

#### Current Integration Points

```
Director → reads .ai/ docs → outputs PROCEED/ITERATE/DEFER
    ↓
Planner → takes Director decision → outputs sprint plan
    ↓
Analyst → independent feature brief → outputs brief + Three Amigos
    ↓
Developer → takes brief → outputs feasibility + plan (+ FeaturePlanUpdater)
    ↓
Tester → takes feature name → outputs test results (SIMULATED)
    ↓
QA → takes test results → outputs quality report (BASIC)
    ↓
Security → independent scan → outputs vulnerability report (REAL)
    ↓
Engineer → takes security approval → outputs deploy status (SIMULATED)
    ↓
Marketer → takes feature name → outputs production report (PARTIALLY REAL)
```

#### Proposed Cross-Agent Coordination

| From | To | Data Shared | Purpose |
|------|-----|-------------|---------|
| Analyst | Developer | Acceptance criteria, proven patterns | Developer uses for plan generation |
| Analyst | Tester | Acceptance criteria | Tester generates test cases from criteria |
| Developer | Tester | File paths, changed components | Tester knows what to test |
| Tester | QA | Test results + coverage | QA validates against quality gates |
| QA | Security | Quality-approved flag | Security only runs on quality-approved code |
| Security | Engineer | Approval status + vuln report | Engineer gates on security approval |
| Engineer | Marketer | Deployment URL, timestamp | Marketer tracks post-deploy metrics |
| Marketer | Director | Production metrics, feedback | Director reviews for CONTINUE/ITERATE/DEPRECATE |
| Director | Planner | Strategic decision | Planner adjusts sprint based on Director feedback |

#### Missing Coordination (to implement)

1. **Analyst → Tester pipeline:** Acceptance criteria should flow to Tester for test case generation
2. **Developer → Tester pipeline:** Changed file paths should focus test scope
3. **Feedback loop:** Marketer → Director → Planner should trigger re-planning automatically
4. **Reflection loop:** Any agent's output can trigger reflection and retry

### Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P1 | Tester: Real test execution | Medium | High — stops fake results flowing through pipeline |
| P1 | QA: Acceptance criteria validation | Medium | High — real quality gates |
| P2 | Engineer: Build verification (not full CI/CD) | Low | Medium — at least verify builds |
| P2 | Reflection node (Developer + Tester) | Medium | High — self-improving output quality |
| P2 | Human approval gate + DB migration | Medium | High — production safety |
| P3 | Admin approval UI | Medium | Medium — needed for human gate |
| P3 | Developer: LLM-powered planning | Medium | Medium — better plans |
| P3 | DSPy GitHub Actions scheduling | Low | Medium — automated optimization |
| P4 | Engineer: Full Vercel/GH Actions integration | High | Medium — deployment automation |
| P4 | DSPy: Missing signatures (practice, review, etc.) | Medium | Low — needs training data first |

---

**END OF DOCUMENT**

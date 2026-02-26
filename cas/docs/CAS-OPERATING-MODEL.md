# CAS Operating Model
## Continuous Autonomous Systems for AI-Native Development

**Version:** 1.0
**Date:** 2026-02-26
**Status:** Active Development

---

## 🎯 Executive Summary

**CAS (Continuous Autonomous Systems)** is a platform operating model for AI-native software development where autonomous agents continuously deliver value through self-organizing, event-driven workflows.

In the AI-native world, development is no longer periodic and manual—it's **continuous** (always running), **autonomous** (self-directing), and **system-oriented** (emergent behavior from coordinated agents).

---

## 📖 Table of Contents

1. [Core Principles](#-core-principles)
2. [Architecture](#-architecture)
3. [Operating Model](#-operating-model)
4. [Agent Orchestration](#-agent-orchestration)
5. [Runtime Comparison](#-runtime-comparison)
6. [Migration Framework](#-migration-framework)
7. [Dashboard & Observability](#-dashboard--observability)
8. [**Reusable Patterns**](#-reusable-patterns) ⭐ **NEW**
9. [Platform Vision](#-platform-vision)
10. [Implementation Guide](#-implementation-guide)
11. [Future Roadmap](#-future-roadmap)

---

## 🌟 Core Principles

### 1. **Continuous Operation**
- Agents run 24/7, not on-demand
- Event-driven triggers replace manual invocations
- Feedback loops drive continuous improvement
- Real-time adaptation to changing conditions

### 2. **Autonomous Execution**
- Agents make decisions without human intervention
- Self-healing through circuit breakers and retries
- Dynamic resource allocation and scaling
- Emergent behavior through agent collaboration

### 3. **System-Oriented Design**
- Multi-agent orchestration, not single-agent tasks
- Workflow graphs with state management
- Observable system-level metrics
- Distributed execution with message passing

### 4. **AI-Native Development**
- AI agents as first-class developers
- Natural language requirements → working code
- Continuous code generation and refinement
- AI-driven testing, security, and quality assurance

---

## 🏗️ Architecture

### **Three-Layer Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     ORCHESTRATION LAYER                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │ CustomRuntime  │  │ LangGraphRuntime│  │ Future Runtimes││
│  │ (Production)   │  │ (Advanced)      │  │ (Extensible)   ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                        AGENT LAYER                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Market││Analyst││Planner││Develop││Tester││Security│    │
│  │ er   ││       ││ (PDM) ││ er    ││      ││        │    │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │
│  ┌──────┐ ┌──────┐                                          │
│  │  QA  ││Engineer│                                         │
│  └──────┘ └──────┘                                          │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Supabase  │  │ Message Bus│  │Circuit     │            │
│  │  (State)   │  │ (Events)   │  │Breaker     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### **Component Breakdown**

#### **Orchestration Layer**
- **CustomAgentRuntime**: Production-ready with message bus, circuit breakers, retry logic
- **LangGraphRuntime**: Advanced workflow orchestration with StateGraph, checkpointing
- **Future Runtimes**: Extensible runtime interface for experimentation

#### **Agent Layer** (8 Autonomous Agents)
1. **MarketerAgent**: Market trends, growth opportunities, content strategy
2. **AnalystAgent**: Data analysis, metrics, reports
3. **PlannerAgent**: PDM (Product Manager, Delivery Manager, Lead Architect, Co-founder)
   - Product roadmap, OKRs, strategic decisions
   - Kanban flow management (NOT Scrum)
   - Architectural Decision Records (ADRs)
4. **DeveloperAgent**: Feature implementation, code generation
5. **TesterAgent**: Test generation, automated testing
6. **QAAgent**: Quality audits, regression detection
7. **EngineerAgent**: Infrastructure, DevOps, deployment
8. **SecurityAgent**: Vulnerability scanning, OWASP compliance

#### **Infrastructure Layer**
- **Supabase**: PostgreSQL + pgvector for state persistence, event logging, metrics
- **Message Bus**: Redis/InMemory for distributed agent communication
- **Circuit Breaker**: Per-agent AI API failure protection
- **Retry Logic**: Exponential backoff for transient errors

---

## 🔄 Operating Model

### **Continuous Delivery Pipeline**

```
┌───────────────────────────────────────────────────────────────┐
│                     CONTINUOUS FEEDBACK LOOP                   │
└───────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│ User Feedback   │ ← Sage/Lexi AI tutors collect feedback
│ (Sage/Lexi)     │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Event Trigger   │ ← Feedback events published to message bus
│ (Message Bus)   │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Analyst Agent   │ ← Analyzes feedback patterns, metrics
└────────┬────────┘
         ↓
┌─────────────────┐
│ Planner Agent   │ ← Creates tasks, prioritizes backlog
│ (PDM/Kanban)    │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│           MULTI-AGENT WORKFLOW EXECUTION                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Developer │→ │  Tester  │→ │    QA    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│       ↓             ↓             ↓                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Engineer │  │ Security │  │   ...    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│ Code Deployed   │ ← Continuous deployment to production
└────────┬────────┘
         ↓
┌─────────────────┐
│ Metrics/Events  │ ← Observability feeds back to analysts
└────────┬────────┘
         ↓
    (Loop back to feedback)
```

### **Key Characteristics**

1. **Event-Driven**: Feedback triggers workflows automatically
2. **Self-Organizing**: Agents coordinate without central control
3. **Observable**: Every step logged to Supabase for audit trail
4. **Resilient**: Circuit breakers prevent cascading failures
5. **Continuous**: No manual intervention required

---

## 🤖 Agent Orchestration

### **Workflow Patterns**

#### **1. Sequential Workflow**
```typescript
// Example: Security Audit
Security Agent → Engineer Agent → Deploy
     ↓               ↓              ↓
  Scan code      Fix issues    Production
```

#### **2. Parallel Workflow**
```typescript
// Example: Feature Development
Planner Agent
     ↓
     ├─→ Developer Agent ─┐
     ├─→ Designer Agent  ─┼─→ Integration
     └─→ Tester Agent   ─┘
```

#### **3. Conditional Routing**
```typescript
// Example: Content Strategy
Analyst Agent
     ↓
   [Data?]
     ├─ Yes → Marketer Agent → Content
     └─ No  → Data Collection → (retry)
```

#### **4. Feedback Loop**
```typescript
// Example: Continuous Improvement
Developer → Tester → QA
              ↓       ↓
            [Pass?] [Quality?]
              ↓       ↓
            Deploy   Fix → (loop back)
```

### **State Management**

**Workflow State Interface:**
```typescript
interface WorkflowState {
  currentStep: string;
  input: any;
  agentResults: Record<string, any>; // Results from each agent
  context: Record<string, any>; // Shared context
  metadata: {
    workflowId: string;
    startedAt: Date;
    completedSteps: string[];
    errors: Array<{ step: string; error: string }>;
  };
}
```

**State Persistence:**
- Every workflow step saved to Supabase (`cas_workflow_states`)
- Versioned checkpoints (v1, v2, v3...)
- Resume from any checkpoint on failure
- Full audit trail for debugging

---

## ⚖️ Runtime Comparison

### **CustomAgentRuntime vs LangGraphRuntime**

| Feature | CustomRuntime | LangGraphRuntime | Priority |
|---------|--------------|------------------|----------|
| **Infrastructure** |
| Supabase Integration | ✅ Available | ✅ Available | CRITICAL |
| Message Bus | ✅ Available | ❌ Unavailable | CRITICAL |
| Circuit Breaker | ✅ Available | ❌ Unavailable | CRITICAL |
| Retry Logic | ✅ Available | ❌ Unavailable | CRITICAL |
| **Task Execution** |
| Single Task | ✅ Available | 🟡 Partial | IMPORTANT |
| Task Streaming | ✅ Available | ❌ Unavailable | IMPORTANT |
| Task Cancellation | ✅ Available | ❌ Unavailable | IMPORTANT |
| Task Queuing | ✅ Available | ❌ Unavailable | NICE-TO-HAVE |
| **Workflow Orchestration** |
| Sequential Flow | ✅ Available | ✅ Available | - |
| Parallel Execution | ✅ Available | ✅ Available | - |
| Conditional Routing | 🟡 Partial | ✅ Available | IMPORTANT |
| Workflow Visualization | ❌ Unavailable | ✅ Available | NICE-TO-HAVE |
| **State Management** |
| State Persistence | ✅ Available | ✅ Available | CRITICAL |
| State Versioning | ✅ Available | ❌ Unavailable | IMPORTANT |
| State Rollback | ✅ Available | ❌ Unavailable | NICE-TO-HAVE |
| **Observability** |
| Event Logging | ✅ Available | ✅ Available | CRITICAL |
| Metrics Collection | ✅ Available | ✅ Available | IMPORTANT |
| Log Persistence | ✅ Available | ✅ Available | IMPORTANT |
| Health Checks | ✅ Available | 🟡 Partial | IMPORTANT |
| **Agent Management** |
| Agent Registry | ✅ Available | ✅ Available | - |
| Dynamic Registration | ✅ Available | ❌ Unavailable | NICE-TO-HAVE |
| Agent Health Monitoring | ✅ Available | ❌ Unavailable | IMPORTANT |

**Current Status:**
- CustomRuntime: **19/24 features** (79% complete)
- LangGraphRuntime: **5/24 features** (21% complete)

**Recommendation:** Hybrid approach
- Use CustomRuntime for production (Phase 1-2)
- Migrate to LangGraphRuntime for advanced workflows (Phase 3-4)

---

## 🔄 Migration Framework

### **Migration Strategy: Like-for-Like Enhancement**

**Goal:** Enhance LangGraphRuntime to achieve feature parity with CustomAgentRuntime

**Approach:** Incremental migration, not big-bang replacement

### **5-Phase Migration Plan**

#### **Phase 1: Core Infrastructure** (10h)
**Status:** 40% complete (1/5 features)

| Feature | Status | Hours | Completed |
|---------|--------|-------|-----------|
| Supabase Integration | ✅ | 3h (3h) | 2026-02-26 |
| Circuit Breaker | ❌ | 2h | - |
| Workflow State Persistence | ❌ | 2h | - |
| Message Bus Integration | ❌ | 2h | - |
| Retry Logic | ❌ | 1h | - |

#### **Phase 2: Task Management** (5h)
**Status:** 0% complete (0/4 features)

| Feature | Status | Hours |
|---------|--------|-------|
| Single Task Execution | 🟡 | 1h |
| Task Streaming | ❌ | 2h |
| Task Cancellation | ❌ | 1h |
| Task Queuing | ❌ | 1h |

#### **Phase 3: State Management** (3h)
**Status:** 0% complete (0/3 features)

| Feature | Status | Hours |
|---------|--------|-------|
| State Versioning | ❌ | 1h |
| State Rollback | ❌ | 1h |
| State History Query | ❌ | 1h |

#### **Phase 4: Observability** (4h)
**Status:** 0% complete (0/4 features)

| Feature | Status | Hours |
|---------|--------|-------|
| Event Logging | ❌ | 2h |
| Metrics Collection | ❌ | 1h |
| Log Persistence | ❌ | 1h |
| Event History | ❌ | 1h |

#### **Phase 5: Agent Management** (2h)
**Status:** 33% complete (1/3 features)

| Feature | Status | Hours |
|---------|--------|-------|
| Agent Registry | ✅ | 0h |
| Dynamic Agent Registration | ❌ | 1h |
| Agent Health Monitoring | ❌ | 1h |

**Total Effort:** 24h (3h completed, 21h remaining)

### **Migration Metrics**

```typescript
{
  "overallProgress": 21,
  "featuresImplemented": 5,
  "featuresRemaining": 19,
  "hoursCompleted": 3,
  "hoursRemaining": 21,
  "velocity": 1.0 // features/hour
}
```

---

## 📊 Dashboard & Observability

### **Unified Admin Dashboard**

**Location:** `Admin → CAS AI Agents → Runtime Tab`

#### **Tab 1: 🔴 Live Status**
- Active runtime (Custom vs LangGraph)
- Runtime health checks
- Feature comparison table (24 features)
- Greyed-out unavailable features (opacity 30%)
- Real-time refresh every 30s

#### **Tab 2: 📊 Migration Progress**
- Overall progress (21% complete)
- Phase-by-phase breakdown (5 phases)
- Feature checklist with status
- Actual vs planned hours tracking
- Dependencies visualization
- Next steps recommendations

### **Visual Indicators**

#### **Status Icons**
- ✅ **Available**: Feature fully implemented and tested
- 🟡 **Partial**: Feature partially implemented
- ⬜ **Unavailable**: Feature not implemented (greyed out)
- ❌ **Not Started**: Feature planned but not started

#### **Time Tracking**
- `10h (3h)` = 10h planned, 3h actual
- 🟢 Green: On time or under budget
- 🟠 Orange: Over budget

#### **Priority Badges**
- 🔴 **CRITICAL**: Blocks other features
- 🟠 **IMPORTANT**: High value
- 🔵 **NICE-TO-HAVE**: Low priority

### **Metrics Collected**

**Workflow Metrics:**
- Execution time per workflow
- Success/failure rates
- Step completion times
- Error frequency by agent

**Agent Metrics:**
- Executions per agent
- Average response time
- Success rate
- AI token usage
- Cost per execution

**System Metrics:**
- Circuit breaker states
- Retry attempts
- Database query performance
- Message bus throughput

---

## 🎨 Dashboard Implementation

### **Architecture Overview**

The CAS dashboards are built as React components that integrate into the existing admin UI, providing real-time visibility into runtime status and migration progress.

```
┌─────────────────────────────────────────────────────────┐
│           apps/web/src/app/(admin)/admin/cas            │
│                      page.tsx                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Runtime Tab (with sub-tabs)               │ │
│  │  ┌─────────────────┬──────────────────────────┐  │ │
│  │  │ 🔴 Live Status │ 📊 Migration Progress    │  │ │
│  │  └─────────────────┴──────────────────────────┘  │ │
│  │         ↓                    ↓                    │ │
│  │  ┌─────────────────┐  ┌──────────────────────┐  │ │
│  │  │CASRuntimeDashboard│ │MigrationStatusDashboard│  │
│  │  └─────────────────┘  └──────────────────────┘  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│        cas/packages/core/src/admin/                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ CASRuntimeDashboard.tsx                           │  │
│  │ - Live runtime health testing                     │  │
│  │ - Feature comparison (24 features)                │  │
│  │ - Greyed-out unavailable features                 │  │
│  │ - Static status (no Node.js dependencies)         │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ MigrationStatusDashboard.tsx                      │  │
│  │ - Overall progress tracking                       │  │
│  │ - Phase breakdown (5 phases)                      │  │
│  │ - Feature checklist                               │  │
│  │ - Actual vs planned hours                         │  │
│  │ - Completion dates                                │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ CASUnifiedDashboard.tsx (Optional)                │  │
│  │ - Combines both dashboards                        │  │
│  │ - Standalone page view                            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### **Component Structure**

#### **1. Runtime Tab Integration** (`apps/web/src/app/(admin)/admin/cas/page.tsx`)

```typescript
function RuntimeTab({ runtimeBreakdownData }: RuntimeTabProps) {
  const [runtimeSubTab, setRuntimeSubTab] = useState<'status' | 'migration'>('status');

  return (
    <div className={styles.chartsSection}>
      {/* Sub-Tab Navigation */}
      <div style={{ borderBottom: '2px solid #e5e7eb' }}>
        <button onClick={() => setRuntimeSubTab('status')}>
          🔴 Live Status
        </button>
        <button onClick={() => setRuntimeSubTab('migration')}>
          📊 Migration Progress
        </button>
      </div>

      {/* Live Status Sub-Tab */}
      {runtimeSubTab === 'status' && (
        <>
          {/* Active Provider Cards */}
          <ActiveProviderSection currentRuntime={currentRuntime} />

          {/* Runtime Distribution Chart */}
          <RuntimeDistributionChart data={runtimeBreakdownData} />

          {/* Detailed Feature Comparison - NEW */}
          <CASRuntimeDashboard />
        </>
      )}

      {/* Migration Progress Sub-Tab */}
      {runtimeSubTab === 'migration' && (
        <MigrationStatusDashboard />
      )}
    </div>
  );
}
```

**Key Features:**
- ✅ Tabbed interface within Runtime tab
- ✅ State management with React hooks
- ✅ Existing provider cards preserved
- ✅ New detailed dashboards integrated seamlessly

#### **2. CASRuntimeDashboard** (`cas/packages/core/src/admin/CASRuntimeDashboard.tsx`)

**Purpose:** Display feature-by-feature comparison with visual indicators

**Data Structure:**
```typescript
export interface FeatureStatus {
  name: string;
  category: string;
  customRuntime: 'available' | 'unavailable' | 'partial';
  langGraphRuntime: 'available' | 'unavailable' | 'partial';
  description: string;
}

const FEATURE_TESTS: FeatureStatus[] = [
  {
    name: 'Supabase Integration',
    category: 'Infrastructure',
    customRuntime: 'available',
    langGraphRuntime: 'available', // ✅ Updated when feature completed
    description: 'Database persistence and queries - ✅ COMPLETED 2026-02-26'
  },
  {
    name: 'Circuit Breaker',
    category: 'Infrastructure',
    customRuntime: 'available',
    langGraphRuntime: 'unavailable', // ⬜ Greyed out until implemented
    description: 'Per-agent circuit breaker for AI API protection'
  },
  // ... 22 more features
];
```

**Visual Treatment:**
```typescript
const getStatusIcon = (status: 'available' | 'unavailable' | 'partial') => {
  switch (status) {
    case 'available': return '✅'; // Green check
    case 'partial': return '🟡';   // Orange dot
    case 'unavailable': return '⬜'; // Grey box - triggers greyed-out style
  }
};

// Greyed-out styling for unavailable features
const greyedOutStyle = {
  opacity: 0.3,
  filter: 'grayscale(100%)',
  background: '#f9fafb',
  cursor: 'not-allowed'
};
```

**Runtime Health Calculation:**
```typescript
function getStaticRuntimeHealth(runtime: 'custom' | 'langgraph'): RuntimeHealth {
  const key = runtime === 'custom' ? 'customRuntime' : 'langGraphRuntime';

  const available = FEATURE_TESTS.filter(f => f[key] === 'available').length;
  const partial = FEATURE_TESTS.filter(f => f[key] === 'partial').length;
  const unavailable = FEATURE_TESTS.filter(f => f[key] === 'unavailable').length;

  return {
    runtime,
    healthy: available > 0,
    initialized: true,
    features: { available, unavailable, partial }
  };
}
```

**Important:** Uses **static data** (no Node.js dependencies) to avoid browser compatibility issues. Originally tried to instantiate runtimes directly but caused build errors due to LangGraph's `node:async_hooks` dependency.

#### **3. MigrationStatusDashboard** (`cas/packages/core/src/admin/MigrationStatusDashboard.tsx`)

**Purpose:** Track migration progress with actual vs planned hours

**Data Structure:**
```typescript
export interface Feature {
  id: string;
  name: string;
  description: string;
  customRuntime: boolean;
  langGraphRuntime: FeatureStatus;
  priority: 'critical' | 'important' | 'nice_to_have';
  phase: 1 | 2 | 3 | 4 | 5;
  estimatedHours: number;
  actualHours?: number;      // NEW: Track actual time spent
  completedDate?: string;    // NEW: Track completion date
  dependencies?: string[];
  notes?: string;
}

export interface MigrationPhase {
  phase: number;
  name: string;
  description: string;
  features: Feature[];
  totalHours: number;
  actualHours: number;       // NEW: Sum of actual hours
  completed: number;
  inProgress: number;
  notStarted: number;
}
```

**Phase Calculation:**
```typescript
function calculatePhases(features: Feature[]): MigrationPhase[] {
  const phases: MigrationPhase[] = [];

  for (let phaseNum = 1; phaseNum <= 5; phaseNum++) {
    const phaseFeatures = features.filter(f => f.phase === phaseNum);

    const completed = phaseFeatures.filter(f => f.langGraphRuntime === 'implemented').length;
    const totalHours = phaseFeatures.reduce((sum, f) => sum + f.estimatedHours, 0);
    const actualHours = phaseFeatures.reduce((sum, f) => sum + (f.actualHours || 0), 0);

    phases.push({
      phase: phaseNum,
      name: getPhaseNameByNumber(phaseNum),
      description: getPhaseDescriptionByNumber(phaseNum),
      features: phaseFeatures,
      totalHours,
      actualHours,   // ← Calculated from feature.actualHours
      completed,
      inProgress,
      notStarted
    });
  }

  return phases;
}
```

**Visual Rendering:**
```typescript
// Phase Hours Display: "10h (3h)" format
<div style={{ fontSize: '12px', color: '#666' }}>
  {phase.totalHours}h {phase.actualHours > 0 && `(${phase.actualHours}h)`}
                                                        ↑
                                              actual hours in parentheses
</div>

// Feature Hours Display with Color Coding
<div>
  {feature.estimatedHours}h
  {feature.actualHours !== undefined && (
    <span style={{
      color: feature.actualHours <= feature.estimatedHours
        ? '#10b981'  // Green if on time
        : '#f59e0b'  // Orange if over budget
    }}>
      {' '}({feature.actualHours}h)
    </span>
  )}
</div>

// Completion Date Display
{feature.completedDate && (
  <span style={{ fontSize: '11px', color: '#10b981' }}>
    ✓ {feature.completedDate}
  </span>
)}
```

### **Visual Design Patterns**

#### **1. Greyed-Out Treatment**

**Problem:** Need to visually indicate unavailable features
**Solution:** Multi-layered greyed-out effect

```css
/* Unavailable Feature Styling */
.feature-unavailable {
  opacity: 0.3;                    /* Fade entire feature */
  filter: grayscale(100%);         /* Remove color */
  background: #f9fafb;             /* Light grey background */
  cursor: not-allowed;             /* Visual feedback */
  border: 1px solid #e5e7eb;       /* Subtle border */
}

.feature-unavailable .icon {
  content: '⬜';                   /* Grey box icon */
  color: #6b7280;                  /* Grey text */
}
```

**Before/After:**
```
Before (Available):
┌──────────────────┐
│       ✅        │  ← Green check, full color, bold
│    AVAILABLE    │
└──────────────────┘

After (Unavailable - Greyed Out):
┌──────────────────┐
│       ⬜        │  ← Grey box, faded (30% opacity), grayscale
│   UNAVAILABLE   │
└──────────────────┘
```

#### **2. Time Tracking Color Coding**

**Logic:**
- Green `(3h)`: `actualHours <= estimatedHours` (on time or under)
- Orange `(5h)`: `actualHours > estimatedHours` (over budget)

**Example:**
```
Estimated: 3h, Actual: 3h  → 3h (3h) in green   ← Perfect!
Estimated: 3h, Actual: 2h  → 3h (2h) in green   ← Under budget
Estimated: 3h, Actual: 5h  → 3h (5h) in orange  ← Over budget
```

#### **3. Progress Bar Gradients**

```css
/* Overall Progress Bar */
.progress-bar {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  height: 24px;
  border-radius: 12px;
  transition: width 0.3s ease;
}

/* Phase Progress Bar */
.phase-bar {
  background: #10b981;
  height: 8px;
  border-radius: 4px;
}
```

### **Update Workflow**

**When a feature is completed, update 3 files:**

#### **Step 1: Update MigrationStatusDashboard.tsx**
```typescript
{
  id: 'circuit-breaker',
  name: 'Circuit Breaker',
  description: 'Per-agent circuit breaker - COMPLETED',
  customRuntime: true,
  langGraphRuntime: 'implemented',  // ← Change from 'not_started'
  priority: 'critical',
  phase: 1,
  estimatedHours: 2,
  actualHours: 2.5,                 // ← Add actual time
  completedDate: '2026-02-26',      // ← Add completion date
  notes: 'Reused existing CircuitBreaker.ts implementation'
}
```

#### **Step 2: Update CASRuntimeDashboard.tsx**
```typescript
{
  name: 'Circuit Breaker',
  category: 'Infrastructure',
  customRuntime: 'available',
  langGraphRuntime: 'available',    // ← Change from 'unavailable'
  description: 'Per-agent circuit breaker - COMPLETED 2026-02-26'
}
```

#### **Step 3: Update migration-status.json**
```json
{
  "migration": {
    "overallProgress": 25  // ← Update percentage
  },
  "phases": [
    {
      "phase": 1,
      "progress": 60,  // ← Update phase progress
      "features": {
        "implemented": ["...", "circuit-breaker"],  // ← Add here
        "not_started": [...]  // ← Remove from here
      }
    }
  ]
}
```

### **Dashboard Refresh Cycle**

```
┌─────────────────────────────────────────────────────┐
│                  UPDATE CYCLE                        │
└─────────────────────────────────────────────────────┘
         ↓
1. Feature completed in code
         ↓
2. Update 3 files (dashboards + JSON)
         ↓
3. Dashboard auto-calculates:
   - Overall progress percentage
   - Phase completion rates
   - Hours spent vs remaining
   - Next feature recommendations
         ↓
4. Visual updates:
   - Feature status icon (❌ → ✅)
   - Progress bars increment
   - Greyed-out → Full color
   - Completion date added
         ↓
5. User sees in real-time:
   - Admin → CAS → Runtime → Migration Progress
   - Updated percentages
   - Visual progress bars
   - Time tracking
```

### **Integration Points**

#### **1. Admin Navigation**
```typescript
// apps/web/src/app/(admin)/admin/layout.tsx
<Link href="/admin/cas?tab=runtime">
  CAS AI Agents
</Link>
```

#### **2. Tab Navigation**
```typescript
// page.tsx
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'agents', label: 'Agents' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'runtime', label: 'Runtime' },        // ← Dashboard here
  { id: 'metrics', label: 'Metrics & Costs' },
];
```

#### **3. Sub-Tab State Management**
```typescript
// Runtime tab state
const [runtimeSubTab, setRuntimeSubTab] = useState<'status' | 'migration'>('status');

// URL sync (optional)
const searchParams = useSearchParams();
const tab = searchParams.get('subtab') || 'status';
```

### **Key Design Decisions**

#### **1. Static Data vs Live Testing**
**Decision:** Use static feature definitions, not live runtime testing
**Reason:** Avoid Node.js dependency issues in browser (LangGraph requires `node:async_hooks`)
**Trade-off:** Manual updates required but more reliable

#### **2. Integration vs Standalone**
**Decision:** Integrate into existing Runtime tab with sub-tabs
**Reason:** Keeps all runtime info in one place
**Alternative:** Could be standalone page at `/admin/cas/migration`

#### **3. Actual Hours Tracking**
**Decision:** Manual tracking via `actualHours` field
**Reason:** Simple, explicit, no complex time-tracking infrastructure needed
**Future:** Could integrate with time-tracking tools

#### **4. Greyed-Out Features**
**Decision:** Visual opacity + grayscale filter + grey icon
**Reason:** Clear visual feedback without removing information
**Alternative:** Could hide unavailable features entirely

---

## 🎨 Reusable Patterns

### **Why Patterns Matter**

> "This is a pattern that we will use in the future for how we build and deliver features because claude code is missing them."
> — Project Lead, 2026-02-26

The CAS operating model has been **extracted into reusable patterns** that any team can apply to their own projects. These patterns fill gaps in existing AI development tools by providing:

1. **Structured approaches** to feature delivery and system migrations
2. **Visual progress tracking** with dashboards and time tracking
3. **Proven workflows** from real implementations
4. **Copy-paste templates** to get started quickly

### **Available Patterns**

#### **1. CAS Feature Delivery Pattern** 🚀

**Use when:** Building any feature (large or small) with progress visibility

**Provides:**
- Feature breakdown structure (1-3h chunks)
- Progress dashboard with time tracking
- Visual indicators (greyed-out, color-coded time)
- Update workflow (3-file update pattern)
- Real example: Supabase Integration (3h, completed on time)

**Template includes:**
```typescript
// Ready-to-use dashboard component
<FeatureDeliveryDashboard
  features={myFeatures}
  projectName="My Feature"
/>
```

**Documentation:** [CAS-FEATURE-DELIVERY-PATTERN.md](./CAS-FEATURE-DELIVERY-PATTERN.md)

---

#### **2. CAS Migration Pattern** 🔄

**Use when:** Migrating from one system/framework to another

**Provides:**
- System audit methodology
- Multi-phase migration planning (5-7 phases)
- Feature parity tracking (old vs new)
- Dependency management
- Dual-dashboard architecture (comparison + progress)
- Real example: CustomRuntime → LangGraphRuntime (24 features, 5 phases)

**Template includes:**
```typescript
// Two-dashboard pattern
<RuntimeComparisonDashboard />  // Feature parity
<MigrationProgressDashboard />  // Phase tracking
```

**Documentation:** [CAS-MIGRATION-PATTERN.md](./CAS-MIGRATION-PATTERN.md)

---

### **When to Use Each Pattern**

| Pattern | Use Case | Example | Complexity |
|---------|----------|---------|------------|
| **Feature Delivery** | Building new functionality | AI chat feature, User dashboard, API integration | Low-Medium |
| **Migration** | Replacing existing systems | Framework migration, Runtime upgrade, Legacy system modernization | Medium-High |

### **Pattern Adoption Workflow**

```
1. Choose Pattern
   ↓
   ├─ Building new feature? → Use Feature Delivery Pattern
   └─ Migrating systems? → Use Migration Pattern

2. Copy Template
   ↓
   - Download pattern markdown
   - Copy code templates
   - Customize for your project

3. Implement Dashboard
   ↓
   - Create feature/phase definitions
   - Build dashboard components
   - Integrate into admin UI

4. Execute & Track
   ↓
   - Work on features/phases
   - Update dashboards as you go
   - See real-time progress

5. Learn & Improve
   ↓
   - Review actual vs planned time
   - Adjust estimates for next project
   - Share learnings with team
```

### **Common Elements Across Patterns**

Both patterns share these core concepts:

1. **Granular Breakdown**: Features split into 1-3 hour chunks
2. **Visual Progress**: Real-time dashboards with progress bars
3. **Time Awareness**: Actual vs planned hours tracking
4. **Greyed-Out Treatment**: Visual de-emphasis of incomplete items
5. **Color Coding**: Green (on time) vs Orange (over budget)
6. **Dependency Tracking**: Show blockers and critical path
7. **Three-File Update**: Consistent update workflow

### **Success Stories**

**Feature Delivery Pattern:**
- ✅ Supabase Integration: 3h estimated, 3h actual (100% accuracy)
- ✅ Dashboard completed on time with full feature set
- ✅ Real-time progress visibility for stakeholders

**Migration Pattern:**
- ✅ LangGraph Migration: 24 features planned across 5 phases
- ✅ 21% complete (5 features migrated)
- ✅ Clear roadmap with dependency visualization
- ✅ Predictable timeline based on velocity

---

## 🌐 Platform Vision

### **CAS as a Platform Feature**

**Vision:** Turn the CAS operating model into a **self-service platform capability** where any team can deploy their own continuous autonomous systems.

### **Platform Capabilities**

#### **1. CAS Studio** (Visual Workflow Builder)
```
┌────────────────────────────────────────────────────────┐
│                      CAS STUDIO                         │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│  │  Agent   │ → │ Workflow │ → │  Deploy  │          │
│  │  Library │   │ Designer │   │          │          │
│  └──────────┘   └──────────┘   └──────────┘          │
│                                                         │
│  Drag-and-drop workflow creation                       │
│  Pre-built agent templates                             │
│  Real-time testing and validation                      │
└────────────────────────────────────────────────────────┘
```

**Features:**
- Visual workflow graph editor
- Agent palette (drag-and-drop)
- Conditional routing builder
- State management configuration
- Deploy to production with one click

#### **2. Agent Marketplace**
```
┌────────────────────────────────────────────────────────┐
│                   AGENT MARKETPLACE                     │
│                                                         │
│  🤖 Certified Agents      🛠️ Custom Agents            │
│  ├─ MarketerAgent         ├─ Create New Agent         │
│  ├─ AnalystAgent          ├─ Import from GitHub       │
│  ├─ PlannerAgent          └─ AI-Generate Agent        │
│  ├─ DeveloperAgent                                     │
│  └─ 50+ more...                                        │
│                                                         │
│  📦 Workflow Templates                                 │
│  ├─ Content Strategy Workflow                          │
│  ├─ Feature Development Workflow                       │
│  ├─ Security Audit Workflow                            │
│  └─ 100+ templates...                                  │
└────────────────────────────────────────────────────────┘
```

**Features:**
- Pre-built agent library
- Community-contributed agents
- Workflow templates
- Version control and updates
- Usage analytics per agent

#### **3. CAS Runtime Manager**
```
┌────────────────────────────────────────────────────────┐
│                 RUNTIME MANAGER                         │
│                                                         │
│  Active Runtimes: 3                                    │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Production Runtime (Custom)          ✅ HEALTHY  │ │
│  │ 1,247 workflows/day  |  99.8% uptime           │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Staging Runtime (LangGraph)          ✅ HEALTHY  │ │
│  │ 89 workflows/day  |  99.2% uptime              │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Development Runtime (Custom)         ✅ HEALTHY  │ │
│  │ 23 workflows/day  |  100% uptime               │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

**Features:**
- Multi-runtime support
- Environment isolation (dev/staging/prod)
- Health monitoring dashboard
- Auto-scaling configuration
- Cost optimization recommendations

#### **4. Observability Suite**
```
┌────────────────────────────────────────────────────────┐
│                  OBSERVABILITY SUITE                    │
│                                                         │
│  📈 Real-Time Metrics      📝 Event Logs              │
│  ├─ Workflow success rate  ├─ Workflow started        │
│  ├─ Agent execution time   ├─ Agent executed          │
│  ├─ Error rates            ├─ Task completed          │
│  └─ Cost per workflow      └─ Error occurred          │
│                                                         │
│  🔍 Distributed Tracing    🚨 Alerting                │
│  ├─ Workflow timeline      ├─ Error threshold         │
│  ├─ Agent call graph       ├─ Cost alerts             │
│  └─ State transitions      └─ Performance degradation │
└────────────────────────────────────────────────────────┘
```

**Features:**
- Real-time dashboards
- Distributed tracing (Jaeger-style)
- Alert configuration
- Cost tracking per workflow
- Performance profiling

#### **5. Governance & Compliance**
```
┌────────────────────────────────────────────────────────┐
│              GOVERNANCE & COMPLIANCE                    │
│                                                         │
│  🔒 Access Control         📋 Audit Trail             │
│  ├─ Role-based permissions ├─ All workflow executions │
│  ├─ Agent authorization    ├─ State changes           │
│  └─ Resource quotas        └─ Configuration changes   │
│                                                         │
│  ✅ Compliance              💰 Cost Management        │
│  ├─ GDPR data handling     ├─ Budget limits           │
│  ├─ SOC2 audit logs        ├─ Usage quotas            │
│  └─ ISO 27001 compliance   └─ Cost allocation tags    │
└────────────────────────────────────────────────────────┘
```

**Features:**
- RBAC (Role-Based Access Control)
- Audit logs for compliance
- Data retention policies
- Cost allocation by team/project
- Budget alerts and limits

---

## 📚 Implementation Guide

### **Step 1: Define Your System**

**Identify:**
1. What continuous process needs automation?
2. What agents are needed?
3. What triggers workflows?
4. What state needs persistence?

**Example: Continuous Content Strategy**
```yaml
system_name: "Content Strategy CAS"
purpose: "Continuously generate and optimize content based on market trends"

agents:
  - AnalystAgent: "Analyze engagement metrics"
  - MarketerAgent: "Generate content ideas"
  - DeveloperAgent: "Implement content management features"

triggers:
  - event: "new_engagement_data"
    frequency: "hourly"
  - event: "content_performance_threshold"
    condition: "engagement < 5%"

state:
  - content_strategy: "Current content plan"
  - engagement_metrics: "Historical performance data"
  - content_queue: "Pending content items"
```

### **Step 2: Design Workflows**

**Use Workflow Patterns:**
```typescript
// Sequential: Analyst → Marketer → Deploy
const contentWorkflow = new StateGraph<WorkflowState>({
  channels: {
    currentStep: null,
    input: null,
    agentResults: null,
    context: null,
    metadata: null
  }
});

contentWorkflow.addNode('analyst', analyzeEngagement);
contentWorkflow.addNode('marketer', generateContent);
contentWorkflow.addNode('deploy', publishContent);

contentWorkflow.addEdge(START, 'analyst');
contentWorkflow.addEdge('analyst', 'marketer');
contentWorkflow.addEdge('marketer', 'deploy');
contentWorkflow.addEdge('deploy', END);
```

### **Step 3: Configure Infrastructure**

**Set up Supabase tables:**
```sql
-- Workflow states
CREATE TABLE cas_workflow_states (
  id UUID PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE cas_tasks (
  id TEXT PRIMARY KEY,
  workflow_id TEXT,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE cas_workflow_events (
  id UUID PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Configure circuit breakers:**
```typescript
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes
  timeout: 60000, // Wait 1 minute before retry
  monitoringPeriod: 120000 // 2-minute window
});
```

### **Step 4: Deploy and Monitor**

**Deploy workflow:**
```typescript
const runtime = new LangGraphRuntime();
await runtime.initialize();

// Deploy workflow
const result = await runtime.executeWorkflow('content-strategy', {
  topic: 'AI in Education'
});
```

**Monitor via dashboard:**
```
Admin → CAS → Runtime → Live Status
- View workflow health
- Check agent performance
- Monitor circuit breaker states
- Track costs and token usage
```

### **Step 5: Iterate and Improve**

**Continuous improvement:**
1. Review workflow execution metrics
2. Identify bottlenecks (slow agents)
3. Optimize agent prompts
4. Adjust circuit breaker thresholds
5. Scale infrastructure as needed

---

## 🚀 Future Roadmap

### **Q1 2026: Foundation** ✅
- [x] CustomAgentRuntime production deployment
- [x] 8 agents operational
- [x] Supabase persistence
- [x] Admin dashboard (live status + migration)

### **Q2 2026: LangGraph Migration**
- [ ] Complete LangGraph feature parity (19 features)
- [ ] Hybrid runtime support
- [ ] Advanced workflow patterns
- [ ] Performance optimization

### **Q3 2026: Platform Features**
- [ ] CAS Studio (visual workflow builder)
- [ ] Agent Marketplace (pre-built agents)
- [ ] Runtime Manager (multi-environment)
- [ ] Observability Suite (tracing, alerts)

### **Q4 2026: Enterprise Ready**
- [ ] Multi-tenancy support
- [ ] Advanced RBAC
- [ ] Compliance tooling (GDPR, SOC2)
- [ ] Cost optimization engine
- [ ] SLA monitoring and enforcement

### **2027: CAS Platform Launch**
- [ ] Public API for CAS creation
- [ ] Community agent contributions
- [ ] Workflow template marketplace
- [ ] AI-native IDE integration
- [ ] Self-service CAS deployment

---

## 🎯 Success Metrics

### **System-Level Metrics**
- **Workflow Success Rate**: > 95%
- **Agent Uptime**: > 99.5%
- **Mean Time to Recovery**: < 5 minutes
- **Cost per Workflow**: < $0.10
- **Execution Time**: < 30 seconds (p95)

### **Business Metrics**
- **Features Deployed/Week**: > 10 (autonomous)
- **Bug Fix Time**: < 1 hour (autonomous)
- **Security Scans/Day**: > 100 (autonomous)
- **User Feedback → Action**: < 24 hours

### **Platform Metrics**
- **Active CAS Instances**: 100+ (by EOY 2026)
- **Agent Marketplace**: 200+ agents
- **Workflow Templates**: 500+ templates
- **Community Contributors**: 1,000+ developers

---

## 📖 Glossary

**CAS**: Continuous Autonomous Systems - Operating model for AI-native development

**Agent**: Autonomous AI entity with specific capabilities (e.g., MarketerAgent, SecurityAgent)

**Runtime**: Orchestration layer that manages agent execution (CustomRuntime, LangGraphRuntime)

**Workflow**: Directed graph of agent executions with state management

**State**: Persistent data structure that flows through workflow steps

**Checkpoint**: Versioned snapshot of workflow state

**Circuit Breaker**: Reliability pattern that prevents cascading failures

**Message Bus**: Event-driven communication channel between agents

**PDM**: Product Delivery Manager (PlannerAgent role: Product Manager + Delivery Manager + Lead Architect)

**Kanban**: Continuous flow delivery method (used by PlannerAgent, NOT Scrum)

---

## 📝 References

### **CAS Patterns** (Reusable Templates)
- [CAS-FEATURE-DELIVERY-PATTERN.md](./CAS-FEATURE-DELIVERY-PATTERN.md) - **How to deliver any feature** with progress tracking
- [CAS-MIGRATION-PATTERN.md](./CAS-MIGRATION-PATTERN.md) - **How to migrate any system** with phase tracking

### **Internal Documentation**
- [LANGGRAPH_MIGRATION_PLAN.md](./LANGGRAPH_MIGRATION_PLAN.md) - Full migration plan
- [RUNTIME_COMPARISON.md](../RUNTIME_COMPARISON.md) - Runtime feature comparison
- [PHASE_1_1_COMPLETE.md](../PHASE_1_1_COMPLETE.md) - Supabase integration details
- [DASHBOARD_IMPROVEMENTS.md](src/admin/DASHBOARD_IMPROVEMENTS.md) - Dashboard enhancements

### **Code References**
- [LangGraphRuntime.ts](../packages/core/src/runtime/LangGraphRuntime.ts)
- [CustomRuntime.ts](../packages/core/src/runtime/CustomRuntime.ts)
- [LangGraphSupabaseAdapter.ts](../packages/core/src/runtime/supabase/LangGraphSupabaseAdapter.ts)
- [MigrationStatusDashboard.tsx](../packages/core/src/admin/MigrationStatusDashboard.tsx)

### **External Resources**
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Supabase Documentation](https://supabase.com/docs)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Kanban Guide](https://www.atlassian.com/agile/kanban)

---

## 🤝 Contributing

### **How to Contribute to CAS**

1. **Create New Agents**: Extend AgentExecutorInterface
2. **Build Workflows**: Use StateGraph patterns
3. **Add Runtime Features**: Enhance LangGraphRuntime
4. **Improve Observability**: Add metrics and dashboards
5. **Share Templates**: Contribute workflow templates

### **Development Guidelines**

**Agent Development:**
- Follow single responsibility principle
- Use AI APIs with circuit breakers
- Log all executions to Supabase
- Include comprehensive tests

**Workflow Design:**
- Minimize state complexity
- Use idempotent operations
- Handle errors gracefully
- Document state transitions

**Infrastructure:**
- Monitor resource usage
- Set appropriate circuit breaker thresholds
- Optimize database queries
- Use connection pooling

---

## 📞 Support

**Questions?**
- GitHub Issues: [tutorwise/cas](https://github.com/tutorwise/cas/issues)
- Documentation: [docs.tutorwise.com/cas](https://docs.tutorwise.com/cas)
- Community: [Discord #cas-platform](https://discord.gg/tutorwise)

---

**CAS Operating Model - Continuous Autonomous Systems for AI-Native Development**

*Version 1.0 | Last Updated: 2026-02-26*

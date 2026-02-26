# CAS Migration Pattern
## Continuous Autonomous Systems for System Migrations

**Version:** 1.0
**Date:** 2026-02-26
**Pattern Type:** System Migration
**Status:** Production Ready

---

## 🎯 Purpose

This pattern shows how to migrate **any system to another** using CAS (Continuous Autonomous Systems) principles with multi-phase planning, feature parity tracking, and visual progress dashboards.

**Use this pattern when:**
- Migrating from one runtime/framework to another
- Replacing legacy systems with modern alternatives
- Achieving feature parity between old and new systems
- Need visibility into migration progress and dependencies

**Why this pattern exists:**
> "This is a pattern that we will use in the future for how we build and deliver features because claude code is missing them."
> — Project Lead, 2026-02-26

**Proven with:**
- CustomAgentRuntime → LangGraphRuntime migration
- 24 features across 5 phases
- 21% complete (Phase 1.1 done: Supabase Integration)

---

## 📖 Table of Contents

1. [Pattern Overview](#-pattern-overview)
2. [Migration Planning](#-migration-planning)
3. [Phase Structure](#-phase-structure)
4. [Feature Parity Tracking](#-feature-parity-tracking)
5. [Dashboard Architecture](#-dashboard-architecture)
6. [Dependency Management](#-dependency-management)
7. [Example: LangGraph Migration](#-example-langgraph-migration)
8. [Implementation Checklist](#-implementation-checklist)

---

## 🌟 Pattern Overview

### **The CAS Migration Cycle**

```
┌───────────────────────────────────────────────────────────┐
│              CONTINUOUS MIGRATION DELIVERY                 │
└───────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│ 1. Audit        │ ← Compare old vs new systems
│    Systems      │    Identify feature gaps
└────────┬────────┘    Map dependencies
         ↓
┌─────────────────┐
│ 2. Define       │ ← Break into phases (5-7 phases)
│    Phases       │    Group by logical themes
└────────┬────────┘    Prioritize by criticality
         ↓
┌─────────────────┐
│ 3. Create       │ ← Build comparison dashboard
│    Dashboards   │    Track feature parity
└────────┬────────┘    Visualize dependencies
         ↓
┌─────────────────┐
│ 4. Migrate      │ ← Work phase by phase
│    Features     │    Update dashboards
└────────┬────────┘    Track actual vs planned
         ↓
┌─────────────────┐
│ 5. Validate     │ ← Test feature parity
│    Parity       │    Compare metrics
└────────┬────────┘    Gradual cutover
         ↓
    (Continuous iteration until 100%)
```

### **Core Principles**

1. **Incremental Migration**: Phase-by-phase, not big-bang
2. **Feature Parity First**: Match existing functionality before adding new
3. **Dependency Awareness**: Implement blockers before dependents
4. **Visual Progress**: Real-time dashboards show status
5. **Dual Runtime**: Run both systems in parallel during migration

---

## 📋 Migration Planning

### **Step 1: System Audit**

**Create comparison matrix:**

| Feature Category | Old System | New System | Gap? | Priority |
|-----------------|------------|------------|------|----------|
| Infrastructure | | | | |
| - Database | ✅ Supabase | ❌ Missing | YES | CRITICAL |
| - Message Bus | ✅ Redis | ❌ Missing | YES | CRITICAL |
| - Circuit Breaker | ✅ Custom | ❌ Missing | YES | CRITICAL |
| Task Management | | | | |
| - Single Task | ✅ Available | 🟡 Partial | PARTIAL | IMPORTANT |
| - Task Streaming | ✅ Available | ❌ Missing | YES | IMPORTANT |
| - Cancellation | ✅ Available | ❌ Missing | YES | IMPORTANT |

**Output:**
- Total features in old system: **24**
- Features available in new system: **5** (21%)
- Feature gap: **19 features** (79%)

### **Step 2: Group into Phases**

**Criteria for grouping:**
- **Logical cohesion**: Related features together
- **Dependency order**: Blockers in earlier phases
- **Complexity**: Mix quick wins with complex features
- **Value delivery**: Each phase delivers usable functionality

**Example Phase Structure:**

```
Phase 1: Core Infrastructure (10h)
├─ Supabase Integration (3h) ✅ CRITICAL BLOCKER
├─ Circuit Breaker (2h) ❌ CRITICAL
├─ Workflow State Persistence (2h) ❌ CRITICAL
├─ Message Bus Integration (2h) ❌ IMPORTANT
└─ Retry Logic (1h) ❌ IMPORTANT

Phase 2: Task Management (5h)
├─ Single Task Execution (1h) 🟡 Partial
├─ Task Streaming (2h) ❌ IMPORTANT
├─ Task Cancellation (1h) ❌ IMPORTANT
└─ Task Queuing (1h) ❌ NICE-TO-HAVE

Phase 3: State Management (3h)
├─ State Versioning (1h) ❌ IMPORTANT
├─ State Rollback (1h) ❌ NICE-TO-HAVE
└─ State History Query (1h) ❌ NICE-TO-HAVE

Phase 4: Observability (4h)
├─ Event Logging (2h) ❌ CRITICAL
├─ Metrics Collection (1h) ❌ IMPORTANT
├─ Log Persistence (1h) ❌ IMPORTANT
└─ Event History (1h) ❌ NICE-TO-HAVE

Phase 5: Agent Management (2h)
├─ Agent Registry (0h) ✅ Already done
├─ Dynamic Agent Registration (1h) ❌ NICE-TO-HAVE
└─ Agent Health Monitoring (1h) ❌ IMPORTANT
```

**Total Effort:** 24 hours across 5 phases

---

## 🏗️ Phase Structure

### **Phase Definition Template**

```typescript
export interface MigrationPhase {
  phase: number;              // Phase number (1-based)
  name: string;               // Phase name
  description: string;        // What this phase delivers
  features: Feature[];        // Features in this phase
  totalHours: number;         // Sum of estimated hours
  actualHours: number;        // Sum of actual hours spent
  status: PhaseStatus;        // Overall phase status
  completed: number;          // Count of implemented features
  inProgress: number;         // Count of in-progress features
  notStarted: number;         // Count of not-started features
}

type PhaseStatus =
  | 'not_started'   // No features started
  | 'in_progress'   // At least one feature started
  | 'completed';    // All features implemented

export interface Feature {
  id: string;
  name: string;
  description: string;
  oldSystem: boolean;         // Available in old system?
  newSystem: FeatureStatus;   // Status in new system
  priority: 'critical' | 'important' | 'nice_to_have';
  phase: number;              // Which phase it belongs to
  estimatedHours: number;
  actualHours?: number;
  completedDate?: string;
  dependencies?: string[];    // IDs of blocking features
  notes?: string;
}

type FeatureStatus =
  | 'not_started'
  | 'in_progress'
  | 'implemented';
```

### **Calculate Phase Metrics**

```typescript
function calculatePhases(features: Feature[]): MigrationPhase[] {
  const phases: MigrationPhase[] = [];

  for (let phaseNum = 1; phaseNum <= 5; phaseNum++) {
    const phaseFeatures = features.filter(f => f.phase === phaseNum);

    const completed = phaseFeatures.filter(
      f => f.newSystem === 'implemented'
    ).length;

    const inProgress = phaseFeatures.filter(
      f => f.newSystem === 'in_progress'
    ).length;

    const notStarted = phaseFeatures.filter(
      f => f.newSystem === 'not_started'
    ).length;

    const totalHours = phaseFeatures.reduce(
      (sum, f) => sum + f.estimatedHours, 0
    );

    const actualHours = phaseFeatures.reduce(
      (sum, f) => sum + (f.actualHours || 0), 0
    );

    const status: PhaseStatus =
      completed === phaseFeatures.length ? 'completed' :
      completed + inProgress > 0 ? 'in_progress' :
      'not_started';

    phases.push({
      phase: phaseNum,
      name: getPhaseNameByNumber(phaseNum),
      description: getPhaseDescriptionByNumber(phaseNum),
      features: phaseFeatures,
      totalHours,
      actualHours,
      status,
      completed,
      inProgress,
      notStarted
    });
  }

  return phases;
}
```

---

## 📊 Feature Parity Tracking

### **Comparison Dashboard**

**Purpose:** Show feature-by-feature comparison between old and new systems

```typescript
export interface FeatureComparison {
  name: string;
  category: string;           // Infrastructure, Task Management, etc.
  oldSystem: 'available' | 'unavailable' | 'partial';
  newSystem: 'available' | 'unavailable' | 'partial';
  description: string;
}

const FEATURE_COMPARISON: FeatureComparison[] = [
  {
    name: 'Supabase Integration',
    category: 'Infrastructure',
    oldSystem: 'available',
    newSystem: 'available',   // ✅ Updated when migrated
    description: 'Database persistence - ✅ COMPLETED 2026-02-26'
  },
  {
    name: 'Circuit Breaker',
    category: 'Infrastructure',
    oldSystem: 'available',
    newSystem: 'unavailable', // ⬜ Greyed out until migrated
    description: 'Per-agent circuit breaker for AI API protection'
  },
  // ... more features
];
```

### **Visual Indicators**

| Old System | New System | Meaning | Visual Treatment |
|-----------|-----------|---------|------------------|
| ✅ Available | ✅ Available | **Parity Achieved** | Full color, green |
| ✅ Available | 🟡 Partial | **Partial Migration** | Orange, normal opacity |
| ✅ Available | ⬜ Unavailable | **Gap** | Greyed out (30% opacity) |
| ⬜ Unavailable | ⬜ Unavailable | **Not Needed** | Both greyed out |

### **Parity Calculation**

```typescript
function calculateParity(features: FeatureComparison[]): number {
  // Only count features that exist in old system
  const oldSystemFeatures = features.filter(f => f.oldSystem === 'available');

  // Count how many are also available in new system
  const migratedFeatures = oldSystemFeatures.filter(
    f => f.newSystem === 'available'
  );

  return Math.round((migratedFeatures.length / oldSystemFeatures.length) * 100);
}

// Example: 19 features in old system, 5 migrated = 26% parity
```

---

## 📊 Dashboard Architecture

### **Two Dashboard Pattern**

**Dashboard 1: Runtime Comparison** (Feature Parity)
- Old vs New system comparison table
- Greyed-out unavailable features
- Runtime health indicators
- Real-time feature availability

**Dashboard 2: Migration Progress** (Phase Tracking)
- Overall migration progress
- Phase breakdown with progress bars
- Feature checklist by phase
- Actual vs planned hours
- Dependency visualization

### **Component Structure**

```
┌─────────────────────────────────────────────────────────┐
│           Admin Page (e.g., admin/migration)            │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Tab Navigation                             │ │
│  │  ┌─────────────────┬──────────────────────────┐  │ │
│  │  │ 🔴 Live Status │ 📊 Migration Progress    │  │ │
│  │  └─────────────────┴──────────────────────────┘  │ │
│  │         ↓                    ↓                    │ │
│  │  ┌─────────────────┐  ┌──────────────────────┐  │ │
│  │  │RuntimeComparison│  │MigrationProgress     │  │ │
│  │  │Dashboard        │  │Dashboard             │  │ │
│  │  │                 │  │                      │  │ │
│  │  │- Feature table  │  │- Overall progress   │  │ │
│  │  │- Old vs New     │  │- Phase breakdown    │  │ │
│  │  │- Greyed-out     │  │- Time tracking      │  │ │
│  │  └─────────────────┘  └──────────────────────┘  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **Migration Progress Dashboard Template**

```typescript
// MigrationProgressDashboard.tsx
export function MigrationProgressDashboard({
  features
}: { features: Feature[] }) {
  const phases = calculatePhases(features);

  const totalFeatures = features.length;
  const implemented = features.filter(f => f.newSystem === 'implemented').length;
  const progress = Math.round((implemented / totalFeatures) * 100);

  const totalEstimated = features.reduce((sum, f) => sum + f.estimatedHours, 0);
  const totalActual = features.reduce((sum, f) => sum + (f.actualHours || 0), 0);
  const remaining = totalEstimated - totalActual;

  return (
    <div style={{ padding: '24px' }}>
      {/* Overall Progress */}
      <div style={{ marginBottom: '32px' }}>
        <h2>Migration Progress</h2>
        <h3>{progress}% Complete</h3>

        <div style={{
          width: '100%',
          background: '#e5e7eb',
          borderRadius: '12px',
          height: '24px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
            height: '100%',
            borderRadius: '12px',
            transition: 'width 0.3s ease'
          }} />
        </div>

        <div style={{ fontSize: '14px', color: '#666' }}>
          {remaining}h remaining
          {totalActual > 0 && (
            <span style={{ color: '#10b981', marginLeft: '8px' }}>
              ({totalActual}h spent)
            </span>
          )}
        </div>
      </div>

      {/* Feature Counts */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '24px' }}>✅</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#10b981' }}>
            {implemented}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Implemented</div>
        </div>
        <div>
          <div style={{ fontSize: '24px' }}>❌</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#ef4444' }}>
            {totalFeatures - implemented}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Remaining</div>
        </div>
        <div>
          <div style={{ fontSize: '24px' }}>📊</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#3b82f6' }}>
            {totalFeatures}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
        </div>
      </div>

      {/* Migration Phases */}
      <h3>Migration Phases</h3>
      {phases.map(phase => (
        <PhaseCard key={phase.phase} phase={phase} />
      ))}
    </div>
  );
}

function PhaseCard({ phase }: { phase: MigrationPhase }) {
  const phaseProgress = Math.round(
    (phase.completed / phase.features.length) * 100
  );

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      {/* Phase Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h4>Phase {phase.phase}: {phase.name}</h4>
          <p style={{ color: '#666', fontSize: '14px' }}>{phase.description}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 600' }}>{phaseProgress}%</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {phase.totalHours}h
            {phase.actualHours > 0 && ` (${phase.actualHours}h)`}
          </div>
        </div>
      </div>

      {/* Phase Progress Bar */}
      <div style={{
        width: '100%',
        background: '#e5e7eb',
        borderRadius: '4px',
        height: '8px',
        marginTop: '12px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: `${phaseProgress}%`,
          background: '#10b981',
          height: '100%',
          borderRadius: '4px'
        }} />
      </div>

      {/* Feature Counts */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
        <div>✅ {phase.completed}</div>
        <div>🟡 {phase.inProgress}</div>
        <div>❌ {phase.notStarted}</div>
      </div>

      {/* Feature List */}
      <div style={{ marginTop: '16px' }}>
        {phase.features.map(feature => (
          <FeatureRow key={feature.id} feature={feature} />
        ))}
      </div>
    </div>
  );
}
```

---

## 🔗 Dependency Management

### **Dependency Tracking**

```typescript
interface Feature {
  // ...
  dependencies?: string[]; // IDs of blocking features
}

// Example: Circuit Breaker depends on Supabase Integration
{
  id: 'circuit-breaker',
  name: 'Circuit Breaker',
  dependencies: ['supabase-integration'], // Must be done first
  // ...
}
```

### **Visual Dependency Indicators**

```typescript
function FeatureRow({ feature }: { feature: Feature }) {
  const hasUnmetDependencies = feature.dependencies?.some(depId => {
    const dep = allFeatures.find(f => f.id === depId);
    return dep?.newSystem !== 'implemented';
  });

  return (
    <div style={{
      opacity: hasUnmetDependencies ? 0.5 : 1,
      borderLeft: hasUnmetDependencies ? '3px solid #f59e0b' : 'none'
    }}>
      {/* Feature content */}

      {feature.dependencies && feature.dependencies.length > 0 && (
        <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px' }}>
          ⚠️ Depends on: {feature.dependencies.map(depId => {
            const dep = allFeatures.find(f => f.id === depId);
            const isDone = dep?.newSystem === 'implemented';
            return (
              <span key={depId} style={{
                color: isDone ? '#10b981' : '#f59e0b',
                marginRight: '8px'
              }}>
                {isDone ? '✅' : '❌'} {dep?.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### **Critical Path Calculation**

```typescript
function calculateCriticalPath(features: Feature[]): Feature[] {
  // 1. Find features with no dependencies (can start immediately)
  const noDeps = features.filter(f => !f.dependencies || f.dependencies.length === 0);

  // 2. Find features that are blocking others (critical)
  const criticalFeatures = features.filter(f => {
    const isBlocker = features.some(other =>
      other.dependencies?.includes(f.id)
    );
    return isBlocker && f.newSystem !== 'implemented';
  });

  // 3. Sort by: critical blockers first, then by estimated hours (quick wins)
  return [...criticalFeatures, ...noDeps].sort((a, b) => {
    if (a.priority === 'critical' && b.priority !== 'critical') return -1;
    if (a.priority !== 'critical' && b.priority === 'critical') return 1;
    return a.estimatedHours - b.estimatedHours;
  });
}

// Show "Next Steps" section in dashboard
const nextSteps = calculateCriticalPath(features).slice(0, 3);
```

---

## 📝 Example: LangGraph Migration

### **Real-World Migration**

**Project:** CustomAgentRuntime → LangGraphRuntime
**Features:** 24 total
**Phases:** 5
**Estimated Effort:** 24 hours
**Current Progress:** 21% (5 features implemented)

#### **Phase 1: Core Infrastructure** (40% complete)

```typescript
// Phase 1 Features
const phase1Features = [
  {
    id: 'supabase-integration',
    name: 'Supabase Integration',
    oldSystem: true,
    newSystem: 'implemented',    // ✅ DONE
    priority: 'critical',
    estimatedHours: 3,
    actualHours: 3,              // Exactly on time!
    completedDate: '2026-02-26',
    dependencies: [],            // Critical blocker - no deps
    notes: 'Full adapter with checkpointing, events, metrics'
  },
  {
    id: 'circuit-breaker',
    name: 'Circuit Breaker',
    oldSystem: true,
    newSystem: 'not_started',    // ❌ Next to implement
    priority: 'critical',
    estimatedHours: 2,
    dependencies: ['supabase-integration'], // Needs DB for state
    notes: 'Can reuse existing CircuitBreaker.ts'
  },
  // ... 3 more features
];
```

#### **Dashboard Display**

**Overall Progress:**
```
21% Complete                    22h remaining (3h spent)
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

✅ 5  🟡 0  ❌ 19  📊 24 Total Features
```

**Phase 1 Card:**
```
Phase 1: Core Infrastructure                44%
Database, message bus, circuit breaker      10h (3h)
████████████░░░░░░░░░░░░░░░░░░

✅ 1  🟡 0  ❌ 4

Feature Checklist:

✅ Supabase Integration ✓ 2026-02-26
   Database client, connection pooling - COMPLETED
   3h (3h)
   [CRITICAL]
   💡 Full adapter with checkpointing, events, metrics, logs

❌ Circuit Breaker
   Per-agent circuit breaker for AI API protection
   2h
   [CRITICAL]
   ⚠️ Depends on: ✅ Supabase Integration
   💡 Can reuse existing CircuitBreaker.ts
```

#### **Next Steps Section**

```
🎯 Next Steps

1. NOW - Phase 1.2: Implement Circuit Breaker
   - Critical for production reliability
   - Estimated: 2 hours
   - Dependencies: ✅ Supabase Integration (DONE)
   - Reuse existing CircuitBreaker.ts implementation

2. THEN - Phase 1.3: Workflow State Persistence
   - Enhance checkpointing for resume
   - Estimated: 2 hours
   - Dependencies: ✅ Supabase Integration (DONE)

3. THEN - Phase 1.4: Message Bus Integration
   - Integrate existing MessageBus
   - Estimated: 2 hours
   - Dependencies: ✅ Supabase Integration (DONE)
```

---

## 🔄 Update Workflow

### **When a Feature is Migrated**

**Update 3 Files:**

#### **1. Runtime Comparison Dashboard**
```typescript
// In RuntimeComparisonDashboard.tsx or similar
{
  name: 'Circuit Breaker',
  category: 'Infrastructure',
  oldSystem: 'available',
  newSystem: 'available',        // ← Change from 'unavailable'
  description: 'Per-agent circuit breaker - COMPLETED 2026-02-26'
}
```

#### **2. Migration Progress Dashboard**
```typescript
// In MigrationProgressDashboard.tsx or data file
{
  id: 'circuit-breaker',
  name: 'Circuit Breaker',
  oldSystem: true,
  newSystem: 'implemented',      // ← Change from 'not_started'
  priority: 'critical',
  phase: 1,
  estimatedHours: 2,
  actualHours: 2.5,              // ← Add actual time
  completedDate: '2026-02-26',   // ← Add completion date
  notes: 'Reused existing CircuitBreaker.ts implementation'
}
```

#### **3. Migration Status JSON**
```json
{
  "migration": {
    "name": "CustomRuntime → LangGraphRuntime",
    "overallProgress": 25  // ← Update from 21%
  },
  "phases": [
    {
      "phase": 1,
      "progress": 60,  // ← Update from 40%
      "features": {
        "implemented": ["supabase-integration", "circuit-breaker"],
        "not_started": ["workflow-state-persistence", "message-bus", "retry-logic"]
      }
    }
  ]
}
```

### **Automatic Recalculation**

After updating, dashboard auto-calculates:
- Overall progress: 21% → 25%
- Phase 1 progress: 40% → 60%
- Hours remaining: 22h → 20h
- Next critical feature (from dependency graph)

---

## ✅ Implementation Checklist

### **Phase 1: System Audit (2-4h)**

- [ ] Document all features in old system
- [ ] Test new system to identify available features
- [ ] Create comparison matrix (old vs new)
- [ ] Calculate feature gap percentage
- [ ] Identify critical blockers (features blocking others)

### **Phase 2: Migration Planning (2-3h)**

- [ ] Group features into 5-7 logical phases
- [ ] Assign priorities (critical/important/nice-to-have)
- [ ] Map dependencies between features
- [ ] Estimate hours for each feature (1-3h chunks)
- [ ] Calculate total effort and timeline
- [ ] Define success metrics (e.g., 100% parity)

### **Phase 3: Dashboard Setup (3-4h)**

- [ ] Create Runtime Comparison Dashboard
  - [ ] Feature comparison table
  - [ ] Old vs New columns
  - [ ] Greyed-out styling for unavailable
  - [ ] Real-time health indicators
- [ ] Create Migration Progress Dashboard
  - [ ] Overall progress section
  - [ ] Phase breakdown cards
  - [ ] Feature checklist by phase
  - [ ] Time tracking (actual vs planned)
  - [ ] Dependency visualization
- [ ] Integrate into admin navigation
- [ ] Add tab/sub-tab navigation
- [ ] Test with mock data

### **Phase 4: Execute Migration (Ongoing)**

- [ ] Start with Phase 1 (critical infrastructure)
- [ ] For each feature:
  - [ ] Check dependencies are met
  - [ ] Implement feature
  - [ ] Track actual time spent
  - [ ] Test for parity with old system
  - [ ] Update 3 files (dashboards + JSON)
  - [ ] Refresh dashboard to see progress
- [ ] Complete entire phase before moving to next
- [ ] Validate phase completion criteria

### **Phase 5: Parity Validation (Ongoing)**

- [ ] Run parallel tests (old vs new system)
- [ ] Compare metrics (performance, accuracy, cost)
- [ ] Identify any regressions
- [ ] Fix parity gaps before proceeding
- [ ] Document migration decisions

### **Phase 6: Cutover Planning (Final Phase)**

- [ ] Define cutover criteria (e.g., 95% parity)
- [ ] Create rollback plan
- [ ] Test dual-runtime mode
- [ ] Gradual traffic shift (10% → 50% → 100%)
- [ ] Monitor metrics during cutover
- [ ] Decommission old system only after validation

---

## 🎯 Success Metrics

### **Migration Health Indicators**

1. **Feature Parity**
   - Target: 100% of critical features
   - Measurement: (Migrated features / Total old system features) × 100
   - Dashboard: Runtime Comparison shows all green

2. **Time Accuracy**
   - Target: 80% of features within estimate
   - Measurement: Count of green time indicators
   - Dashboard: More green (3h) than orange (5h)

3. **Velocity Consistency**
   - Target: ±20% variance week-over-week
   - Measurement: Features per hour (velocity)
   - Dashboard: Predictable remaining hours

4. **Dependency Blocking**
   - Target: <20% of time blocked waiting on dependencies
   - Measurement: Features blocked / Total time
   - Dashboard: Few orange "Depends on" warnings

5. **Phase Completion**
   - Target: 100% phase completion before next phase
   - Measurement: All features in phase implemented
   - Dashboard: Phase progress bar at 100%

---

## 🚀 Quick Start Template

**Use this to start your migration:**

```typescript
// migration-plan.ts

// 1. Define your features
export const migrationFeatures: Feature[] = [
  // Phase 1: Core
  {
    id: 'core-feature-1',
    name: 'Core Feature 1',
    description: 'Critical infrastructure feature',
    oldSystem: true,
    newSystem: 'not_started',
    priority: 'critical',
    phase: 1,
    estimatedHours: 3,
    dependencies: []
  },
  // Add more features...
];

// 2. Create dashboards
import { RuntimeComparisonDashboard } from './RuntimeComparisonDashboard';
import { MigrationProgressDashboard } from './MigrationProgressDashboard';

export default function MigrationPage() {
  return (
    <div>
      <Tabs>
        <Tab label="🔴 Feature Parity">
          <RuntimeComparisonDashboard features={migrationFeatures} />
        </Tab>
        <Tab label="📊 Migration Progress">
          <MigrationProgressDashboard features={migrationFeatures} />
        </Tab>
      </Tabs>
    </div>
  );
}

// 3. Start migrating!
// - Work on Phase 1 features
// - Update status when complete
// - Watch dashboards update
```

---

## 🎯 Key Takeaways

1. **Incremental Over Big-Bang**: Migrate phase-by-phase for safety
2. **Dependencies First**: Implement blockers before dependents
3. **Visual Progress**: Dashboards keep stakeholders informed
4. **Dual Runtime**: Run both systems in parallel during migration
5. **Feature Parity**: Match old system before adding new features
6. **Time Tracking**: Learn from actual vs planned for future estimates
7. **Critical Path**: Identify and prioritize blocking features

---

## 📞 Support

**Questions about this pattern?**
- See full CAS docs: [CAS-OPERATING-MODEL.md](./CAS-OPERATING-MODEL.md)
- Feature delivery: [CAS-FEATURE-DELIVERY-PATTERN.md](./CAS-FEATURE-DELIVERY-PATTERN.md)
- Real example: [LANGGRAPH_MIGRATION_PLAN.md](../LANGGRAPH_MIGRATION_PLAN.md)

---

**CAS Migration Pattern - Migrate Any System with Confidence**

*Version 1.0 | Last Updated: 2026-02-26*

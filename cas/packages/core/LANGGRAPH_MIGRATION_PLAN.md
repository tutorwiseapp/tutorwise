# LangGraph Runtime Migration Plan

**Goal:** Enhance LangGraphRuntime to achieve feature parity with CustomAgentRuntime

**Status:** 21% Complete (5/24 features implemented)
**Estimated Effort:** 22 hours remaining
**Decision:** Option B - Enhance LangGraphRuntime (not replace CustomRuntime)

---

## 📊 Progress Summary

- ✅ **Implemented:** 4 features
- 🟡 **In Progress:** 0 features
- ❌ **Not Started:** 20 features
- **Critical Path:** Supabase Integration → Circuit Breaker → State Persistence → Event Logging

---

## 🎯 Implementation Phases

### **Phase 1: Core Infrastructure** (3h estimated)

**Goal:** Database persistence and reliability patterns

#### 1.1 Supabase Integration ✅ **COMPLETE**
- **Status:** ✅ Implemented
- **Effort:** 3h (completed)
- **Priority:** CRITICAL
- **Completed:** 2026-02-26
- **Files modified:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts` - Added Supabase adapter integration
  - Created: `cas/packages/core/src/runtime/supabase/LangGraphSupabaseAdapter.ts` - Full adapter implementation
  - Created: `cas/packages/core/src/runtime/supabase/migrations/001_langgraph_tables.sql` - Database schema
- **Implementation:**
  1. ✅ Added Supabase client initialization in LangGraphRuntime constructor
  2. ✅ Created full adapter with checkpointing, task logging, agent results
  3. ✅ Implemented state persistence to `cas_workflow_states` table with versioning
  4. ✅ Added task logging to `cas_tasks` table
  5. ✅ Added agent results to `cas_agent_results` table
  6. ✅ Added workflow events to `cas_workflow_events` table
  7. ✅ Added metrics collection to `cas_metrics_timeseries` table
  8. ✅ Added log persistence to `cas_agent_logs` table
  9. ✅ Enhanced healthCheck() to verify Supabase connection
- **Testing:** Ready for testing after running SQL migration

#### 1.2 Circuit Breaker
- **Status:** ❌ Not Started
- **Effort:** 2h
- **Priority:** CRITICAL
- **Depends on:** Supabase Integration
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
  - Use: `cas/packages/core/src/runtime/CircuitBreaker.ts` (already exists)
- **Tasks:**
  1. Import CircuitBreaker from existing implementation
  2. Create circuit breaker per agent (8 agents)
  3. Wrap agent.execute() calls with circuit breaker
  4. Store circuit breaker state in Supabase
  5. Add recovery logic for HALF_OPEN state
  6. Test: Simulate AI API failures, verify circuit opens

#### 1.3 Workflow State Persistence
- **Status:** ❌ Not Started
- **Effort:** 2h
- **Priority:** CRITICAL
- **Depends on:** Supabase Integration
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
  - `cas/packages/core/src/runtime/supabase/LangGraphSupabaseAdapter.ts`
- **Tasks:**
  1. Implement LangGraph checkpointer for Supabase
  2. Save workflow state after each node execution
  3. Add state versioning (v1, v2, etc.)
  4. Implement state resume from checkpoint
  5. Test: Stop workflow mid-execution, resume from checkpoint

#### 1.4 Message Bus Integration
- **Status:** ❌ Not Started
- **Effort:** 2h
- **Priority:** IMPORTANT
- **Depends on:** Supabase Integration
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
  - Use: `cas/packages/core/src/messaging/MessageBus.ts` (already exists)
- **Tasks:**
  1. Import MessageBus from existing implementation
  2. Publish workflow events to message bus
  3. Subscribe to external events for workflow triggers
  4. Add event-driven workflow initiation
  5. Test: Trigger workflow via message bus event

#### 1.5 Retry Logic with Exponential Backoff
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** IMPORTANT
- **Depends on:** Circuit Breaker
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
  - Use: `cas/packages/core/src/runtime/RetryUtility.ts` (already exists)
- **Tasks:**
  1. Import RetryUtility from existing implementation
  2. Wrap agent executions with retry logic
  3. Configure: 3 retries, exponential backoff (1s, 2s, 4s)
  4. Add retry attempt tracking
  5. Test: Force failures, verify retries with backoff

---

### **Phase 2: Task Management** (2-3h estimated)

**Goal:** Single task execution with streaming and cancellation

#### 2.1 Single Task Execution
- **Status:** 🟡 Partial (basic workflow execution exists)
- **Effort:** 1h
- **Priority:** IMPORTANT
- **Depends on:** Supabase Integration
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Add `executeTask(task: AgentTask)` method
  2. Map task to workflow graph node
  3. Execute single node with context
  4. Return AgentResult
  5. Test: Execute single MarketerAgent task

#### 2.2 Task Streaming
- **Status:** ❌ Not Started
- **Effort:** 2h
- **Priority:** IMPORTANT
- **Depends on:** Single Task Execution
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Implement AsyncIterator for workflow events
  2. Stream node execution updates
  3. Stream agent output chunks
  4. Add progress percentage calculation
  5. Test: Execute workflow, stream progress to client

#### 2.3 Task Cancellation
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** IMPORTANT
- **Depends on:** Single Task Execution
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Add AbortController to workflow execution
  2. Implement `cancelTask(taskId: string)` method
  3. Clean up aborted workflow state
  4. Update task status to 'cancelled' in DB
  5. Test: Start long workflow, cancel mid-execution

#### 2.4 Task Queuing
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** NICE-TO-HAVE
- **Depends on:** Single Task Execution
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Add in-memory task queue (FIFO)
  2. Process queue with concurrency limit (5 concurrent)
  3. Add queue status endpoint
  4. Persist queue to Supabase for recovery
  5. Test: Submit 10 tasks, verify queue processing

---

### **Phase 3: State Management** (2-3h estimated)

**Goal:** Persistent state with checkpointing and versioning

#### 3.1 State Versioning
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** IMPORTANT
- **Depends on:** Workflow State Persistence
- **Files to modify:**
  - `cas/packages/core/src/runtime/supabase/LangGraphSupabaseAdapter.ts`
- **Tasks:**
  1. Add version field to workflow state
  2. Increment version on each state update
  3. Store version history in Supabase
  4. Add state diff calculation
  5. Test: Run workflow, verify version increments

#### 3.2 State Rollback
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** NICE-TO-HAVE
- **Depends on:** State Versioning
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
  - `cas/packages/core/src/runtime/supabase/LangGraphSupabaseAdapter.ts`
- **Tasks:**
  1. Implement `rollbackToVersion(version: number)` method
  2. Load previous state from Supabase
  3. Resume workflow from rolled-back state
  4. Update current version pointer
  5. Test: Run workflow, rollback to v2, resume

#### 3.3 State History Query
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** NICE-TO-HAVE
- **Depends on:** State Versioning
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
  - `cas/packages/core/src/runtime/supabase/LangGraphSupabaseAdapter.ts`
- **Tasks:**
  1. Add `getStateHistory(workflowId: string)` method
  2. Query all versions from Supabase
  3. Return timeline of state changes
  4. Add filtering by date/version range
  5. Test: Run workflow, query history

---

### **Phase 4: Observability** (3-4h estimated)

**Goal:** Events, metrics, and logs to Supabase

#### 4.1 Event Logging
- **Status:** ❌ Not Started
- **Effort:** 2h
- **Priority:** CRITICAL
- **Depends on:** Supabase Integration
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Log workflow events to `cas_workflow_events` table
  2. Log agent events to `cas_agent_events` table
  3. Add event types: started, completed, failed, cancelled
  4. Include timestamp, duration, metadata
  5. Test: Run workflow, verify events in DB

#### 4.2 Metrics Collection
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** IMPORTANT
- **Depends on:** Event Logging
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Collect metrics: execution time, success rate, token usage
  2. Write to `cas_metrics_timeseries` table
  3. Add per-agent metrics aggregation
  4. Calculate averages and percentiles
  5. Test: Run 10 workflows, verify metrics

#### 4.3 Log Persistence
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** IMPORTANT
- **Depends on:** Event Logging
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Save agent logs to `cas_agent_logs` table
  2. Include log level (debug, info, warn, error)
  3. Add structured logging with context
  4. Implement log rotation (delete old logs)
  5. Test: Run workflow, verify logs in DB

#### 4.4 Event History
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** NICE-TO-HAVE
- **Depends on:** Event Logging
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Add `getEventHistory(workflowId: string)` method
  2. Query events from Supabase with filtering
  3. Support pagination
  4. Add timeline visualization data
  5. Test: Run workflow, query event history

#### 4.5 Health Checks
- **Status:** 🟡 Partial (basic healthCheck exists)
- **Effort:** 1h
- **Priority:** IMPORTANT
- **Depends on:** Supabase Integration
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Enhance healthCheck() to check Supabase connection
  2. Check circuit breaker states
  3. Check agent initialization status
  4. Return detailed health report
  5. Test: Call healthCheck(), verify all checks

---

### **Phase 5: Agent Management** (1-2h estimated)

**Goal:** Dynamic agent registration and health monitoring

#### 5.1 Agent Registry
- **Status:** ✅ Implemented (8 agents hardcoded)
- **Effort:** 0h
- **Priority:** COMPLETE
- **Notes:** Already working with 8 agents

#### 5.2 Dynamic Agent Registration
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** NICE-TO-HAVE
- **Depends on:** Supabase Integration
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Add `registerAgent(agent: Agent)` method
  2. Store agent metadata in Supabase
  3. Add agent discovery from database
  4. Support hot-reload of agents
  5. Test: Register new agent at runtime

#### 5.3 Agent Health Monitoring
- **Status:** ❌ Not Started
- **Effort:** 1h
- **Priority:** NICE-TO-HAVE
- **Depends on:** Dynamic Agent Registration
- **Files to modify:**
  - `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Tasks:**
  1. Monitor agent execution success/failure rates
  2. Track agent response times
  3. Detect unhealthy agents (circuit breaker state)
  4. Auto-disable failing agents
  5. Test: Simulate agent failures, verify auto-disable

---

## 🔄 Critical Path (Must Do First)

1. **Supabase Integration** (3h) - Blocks everything else
2. **Circuit Breaker** (2h) - Critical for reliability
3. **Workflow State Persistence** (2h) - Enables checkpointing
4. **Event Logging** (2h) - Enables observability

**Total Critical Path:** 9 hours

---

## 📋 Feature Status Tracker

Update this as features are completed:

| Phase | Feature | Status | Hours | Completed Date |
|-------|---------|--------|-------|----------------|
| 1 | Supabase Integration | ✅ | 3h | 2026-02-26 |
| 1 | Circuit Breaker | ❌ | 2h | - |
| 1 | Workflow State Persistence | ❌ | 2h | - |
| 1 | Message Bus Integration | ❌ | 2h | - |
| 1 | Retry Logic | ❌ | 1h | - |
| 2 | Single Task Execution | 🟡 | 1h | - |
| 2 | Task Streaming | ❌ | 2h | - |
| 2 | Task Cancellation | ❌ | 1h | - |
| 2 | Task Queuing | ❌ | 1h | - |
| 3 | State Versioning | ❌ | 1h | - |
| 3 | State Rollback | ❌ | 1h | - |
| 3 | State History Query | ❌ | 1h | - |
| 4 | Event Logging | ❌ | 2h | - |
| 4 | Metrics Collection | ❌ | 1h | - |
| 4 | Log Persistence | ❌ | 1h | - |
| 4 | Event History | ❌ | 1h | - |
| 4 | Health Checks | 🟡 | 1h | - |
| 5 | Agent Registry | ✅ | 0h | 2026-02-26 |
| 5 | Dynamic Agent Registration | ❌ | 1h | - |
| 5 | Agent Health Monitoring | ❌ | 1h | - |

---

## 🎯 Next Steps

1. **✅ DONE - Phase 1.1:** Supabase Integration
   - Completed: 2026-02-26
   - Created adapter with full persistence layer
   - Run SQL migration: `cas/packages/core/src/runtime/supabase/migrations/001_langgraph_tables.sql`

2. **NOW - Phase 1.2:** Implement Circuit Breaker
   - Critical for production reliability
   - Estimated: 2 hours
   - Reuse existing `CircuitBreaker.ts`
   - Wrap agent executions with circuit breaker logic

3. **After Circuit Breaker - Phase 1.3:** Implement Workflow State Persistence (already partially done)
   - Enhance checkpointing to support resume from any version
   - Add state resume functionality
   - Estimated: 1 hour remaining

4. **Track Progress:** Update this document and `migration-status.json` as you complete features

---

## 📚 Reference Files

- **Runtime Comparison:** `cas/packages/core/RUNTIME_COMPARISON.md`
- **Migration Status JSON:** `cas/packages/core/src/admin/migration-status.json`
- **Dashboard:** `apps/web/src/app/(admin)/admin/cas/page.tsx` (Runtime tab)
- **LangGraph Runtime:** `cas/packages/core/src/runtime/LangGraphRuntime.ts`
- **Custom Runtime (reference):** `cas/packages/core/src/runtime/CustomRuntime.ts`

---

## ✅ How to Update This Plan

When you complete a feature:

1. Change status from ❌ to ✅ in the table above
2. Add completion date
3. Update `migration-status.json`
4. Update `FEATURE_TESTS` array in `CASRuntimeDashboard.tsx`
5. Refresh the dashboard to see progress

---

**Last Updated:** 2026-02-26
**Next Review:** After completing Phase 1

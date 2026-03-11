# Process Studio — Execution Engine Solution Design

**Version:** 3.2
**Date:** March 3, 2026
**Owner:** Michael Quan
**Status:** Pending Approval

### Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-01 | Initial draft |
| 2.1 | 2026-03-02 | LangGraph & CAS integration concepts |
| 3.0 | 2026-03-03 | Full rewrite: grounded in Booking Flow, Node Handler Registry, async completion patterns, idempotency, corrected architecture (separate PlatformWorkflowRuntime, /execute/ API path, Execution as third tab (label: "Execution"), no tenant_id) |
| 3.1 | 2026-03-03 | Renamed Deploy → Execution throughout; tab label confirmed as "Execution"; file renamed to process-execution-solution-design.md; closed IWorkflowRuntime gap |
| 3.2 | 2026-03-03 | Major revision: corrected priority ordering (Tutor Approval first, Booking Lifecycle in shadow); removed EduPay from all handler definitions; renamed commission.payout → commission.create; split Booking Lifecycle into Human Tutor + AI Tutor templates; added Referral Attribution as subprocess; added Shadow Mode section; added operator abstraction notes |

**Parent Document:** `conductor/conductor-solution-design.md` *(supersedes `fuchsia/process-studio-solution-design.md`, deleted)*

---

## 1. Executive Summary

The **Execution** tab is the third and final pillar of the Process Studio — the three pillars are: *Discovery* (reverse-engineers workflows from code), *Design* (lets admins edit them visually), and *Execution* (makes them run for real).

```
Design  |  Discovery  |  Execution
```

### 1.1 What the Execution Engine Actually Does

Tutorwise has two distinct products:

1. **AI Tutor Agents** — built and listed on the marketplace to generate revenue
2. **The Execution Engine** — automates the platform's backend operations, routes tasks between humans and AI agents, and scales the business without needing a large operations or engineering team

The Execution Engine is not an internal dev tool. It is the operational backbone. Consider the **Booking Flow**:

```
[Student Clicks Book]
        ↓
[Execution Engine charges Stripe]          ← action node, handler: stripe.charge
        ↓
[Execution Engine creates Session ID]      ← action node, handler: session.create
        ↓
[AI Tutor takes over the Chat]          ← action node, handler: ai_agent.invoke  (async — suspends until session ends)
        ↓
[Execution Engine requests a Review]       ← action node, handler: review.request
        ↓
[Execution Engine records commission]      ← action node, handler: commission.create
        ↓
[Complete]
```

Every step after the student clicks "Book" is automated by the Execution Engine. No human is involved. No code needs to change when the commission rate changes from 10% to 12% — an admin updates the node's `handler_config` on the canvas.

### 1.2 Why This Changes Everything

| Without Execution Engine | With Execution Engine |
|-----------------------|--------------------|
| Developer writes code for every new workflow step | Admin drags a node onto the canvas |
| Commission rate change = code deploy | Commission rate change = config update |
| Payment failure requires manual intervention | Engine retries, self-heals, or routes to HITL |
| AI Tutor session lifecycle is hardcoded | AI Tutor handoff is a node type in any workflow |
| Operations team grows with user volume | Engine scales, team stays lean |

---

## 2. Primary Business Workflows

Four workflow templates are targeted for the Execution Engine. Priority ordering is based on risk, not business importance — low-risk workflows go live first to prove the engine before it touches payment.

**Execution modes:**
- **Live** — engine owns the workflow immediately; no existing code conflict
- **Shadow → Live** — engine runs alongside existing code first (see Section 2.5); admin manually switches when confident

### 2.1 Tutor Application & Approval (Priority 1 — Live)

**Why first:** Template already exists in `workflow_process_templates`. HITL gate proves the ApprovalDrawer end-to-end. Zero payment risk. Admin-controlled, not student-facing.

**Trigger:** Tutor completes onboarding; profile reaches `Profile Review` status.
**Template:** `Tutor Approval` (existing in `workflow_process_templates`)
**Execution mode:** Live from day one — no shadow mode needed.

| Step | Node Type | Handler | Completion Mode | Notes |
|------|-----------|---------|-----------------|-------|
| Application Received | `trigger` | — | `sync` | Trigger: tutor profile status → `under_review` via Supabase Webhook |
| Run CaaS Score | `action` | `caas.score` | `sync` | `/api/caas/calculate`; result stored in context |
| Check Minimum Score | `condition` | `rules.evaluate` | `sync` | `handler_config: { field: "caas_score", threshold: 70 }` |
| Admin Review (if borderline) | `approval` | — | `hitl` | `assigned_role: "admin"`; opens ApprovalDrawer with CaaS context |
| Approve & Go Live | `action` | `profile.activate` | `sync` | Updates `profiles.status` → active |
| Notify Tutor | `action` | `notification.send` | `sync` | `handler_config: { template: "tutor_approved" }` |
| Complete | `end` | — | `sync` | — |

*Reject path from Admin Review:* `notification.send` (template: `tutor_rejected`) → `end`.

---

### 2.2 Commission Payout (Priority 2 — Live)

**Why second:** Replaces the `process-batch-payouts` cron job (Fridays 10am). Pure batch — no real-time user impact. Payout threshold and schedule become no-code configurable in `handler_config` instead of hardcoded constants. Zero student-facing risk.

**Trigger:** Scheduled cron — Fridays 10:00 AM UTC.
**Template:** `Commission Payout` (new — seeded in migration 338 alongside engine tables)
**Execution mode:** Live from day one — the existing cron job is disabled when this template goes live.

| Step | Node Type | Handler | Completion Mode | Notes |
|------|-----------|---------|-----------------|-------|
| Payout Triggered | `trigger` | — | `sync` | Scheduled trigger: cron expression `0 10 * * 5` |
| Find Available Commissions | `action` | `commission.query_available` | `sync` | Queries `transactions` where `status='available'` and `type='Referral Commission'`; groups by `profile_id` |
| Check Minimum Balance | `condition` | `rules.evaluate` | `sync` | `handler_config: { field: "balance", min: 25 }` — operator changes £25 here, no code deploy |
| Validate Creator Account | `action` | `stripe.validate_connect_account` | `sync` | Calls `canReceivePayouts(stripe_account_id)` from `lib/stripe/payouts.ts` |
| Transfer Funds | `action` | `stripe.connect_payout` | `webhook` | Calls `createConnectPayout()`; idempotency key: `{execution_id}:{node_id}:{profile_id}`; suspends until Stripe payout webhook |
| Notify Creator | `action` | `notification.send` | `sync` | `handler_config: { template: "payout_processed" }` |
| Complete | `end` | — | `sync` | — |

*Note:* This workflow loops over multiple creators. The `commission.query_available` handler returns a list; the runtime iterates the Transfer + Notify steps per creator within a single execution, using `handler_config` loop semantics (see Section 3.3).

---

### 2.3 Booking Lifecycle — Human Tutor (Priority 3 — Shadow, then Live)

**Why shadow first:** This workflow touches Stripe payment. The existing `handle_successful_payment` RPC + Stripe webhook combination is battle-tested. Shadow mode runs the engine alongside the existing code for validation before any handover.

**Trigger:** A booking is created (`INSERT INTO bookings`) via Supabase Database Webhook.
**Template:** `Booking Lifecycle — Human Tutor` (new — seeded in migration 338)
**Execution mode:** Shadow first. Admin switches to Live manually via "Go Live" button in Execution tab.

| Step | Node Type | Handler | Completion Mode | Notes |
|------|-----------|---------|-----------------|-------|
| Booking Created | `trigger` | — | `sync` | Supabase DB Webhook: `INSERT INTO bookings` where `booking_type = 'human'` |
| Collect Payment | `action` | `stripe.charge` | `webhook` | Idempotency key required (see Section 4.4) |
| Was booking referred? | `condition` | `rules.evaluate` | `sync` | `handler_config: { check: "referral_attributed", field: "booking_id" }` |
| Referral Attribution | `subprocess` | — | `sync` | Fires if condition = yes. `templateId` → `Referral Attribution` template |
| Negotiate Schedule | `action` | `scheduling.negotiate` | `hitl` | Pauses until tutor proposes time AND client confirms. `assigned_role: "tutor"` initially |
| Create Session | `action` | `session.create` | `sync` | `/api/virtualspace/session`; `{ session_id, join_url }` stored in context |
| Session Active | `action` | `session.wait` | `hitl` | Pauses until tutor marks complete or cron auto-completes. `assigned_role: "tutor"` |
| Request Review | `action` | `review.request` | `sync` | `/api/reviews/pending-tasks` |
| Record Commission | `action` | `commission.create` | `sync` | Calls `handle_successful_payment` RPC — creates clearing transaction. NOT a payout; payout is a separate scheduled workflow (Section 2.2). |
| Complete | `end` | — | `sync` | Updates `bookings.status` → `Completed` |

*Cancellation path:* Condition node after Collect Payment — if booking cancelled before session, `stripe.refund` → `commission.void` → `end`.

---

### 2.4 Booking Lifecycle — AI Tutor (Priority 4 — Shadow, then Live)

**Why after human tutor:** Same payment flow as 2.3 but simpler — no scheduling negotiation. Shadow mode runs in parallel with 2.3 shadow executions.

**Trigger:** A booking is created (`INSERT INTO bookings`) where `booking_type = 'ai_agent'`.
**Template:** `Booking Lifecycle — AI Tutor` (new — seeded in migration 338)
**Execution mode:** Shadow first; goes live alongside or shortly after 2.3.

| Step | Node Type | Handler | Completion Mode | Notes |
|------|-----------|---------|-----------------|-------|
| Booking Created | `trigger` | — | `sync` | Supabase DB Webhook: `INSERT INTO bookings` where `booking_type = 'ai_agent'` |
| Collect Payment | `action` | `stripe.charge` | `webhook` | Idempotency key required |
| Was booking referred? | `condition` | `rules.evaluate` | `sync` | Same as 2.3 |
| Referral Attribution | `subprocess` | — | `sync` | Fires if condition = yes. Same `Referral Attribution` subprocess template |
| Start AI Session | `action` | `ai_agent.invoke` | `ai_session` | Creates virtualspace session + hands off to AI Tutor; suspends until session-end event |
| Request Review | `action` | `review.request` | `sync` | `/api/reviews/pending-tasks` |
| Record Commission | `action` | `commission.create` | `sync` | Same as 2.3 — creates clearing transaction |
| Complete | `end` | — | `sync` | — |

*Key difference from 2.3:* No `scheduling.negotiate` or `session.wait` nodes — the AI session starts immediately on booking confirmation and ends autonomously.

---

### 2.5 Referral Attribution (Subprocess — referenced by 2.3 and 2.4)

This is not a standalone top-level workflow. It is a **subprocess node** within the Booking Lifecycle templates, triggered by the "Was booking referred?" condition node. It uses the existing `subprocess` node type (teal, `Layers` icon) already in production in Process Studio.

**Trigger:** Invoked as a subprocess from parent Booking Lifecycle execution. Context inherits `booking_id` from parent.
**Template:** `Referral Attribution` (new — seeded in migration 338)

| Step | Node Type | Handler | Completion Mode | Notes |
|------|-----------|---------|-----------------|-------|
| Attribution Started | `trigger` | — | `sync` | Invoked from parent; receives `booking_id` in context |
| Attribute Booking | `action` | `referral.attribute` | `sync` | `POST /api/referrals/attribute`; creates `referrals` row with `status: 'Signed Up'` |
| Update Referral Status | `action` | `referral.update_status` | `sync` | Updates `referrals.status` → `Converted` on booking completion |
| Notify Referrer | `action` | `notification.send` | `sync` | `handler_config: { template: "referral_converted" }` |
| Complete | `end` | — | `sync` | Returns to parent execution |

---

## 3. Shadow Mode — Transition Strategy

Shadow mode is the mechanism by which the Execution Engine takes over workflows that are currently handled by hardcoded code (Stripe webhooks, `handle_successful_payment` RPC, cron jobs, DB triggers). It ensures zero production risk during the transition.

### 3.1 How Shadow Mode Works

Each `workflow_process` record has an `execution_mode` field with three states:

| Mode | Engine behaviour | Existing code |
|------|-----------------|---------------|
| `design` | Engine does nothing — process is a visual map only | Continues to run unaffected |
| `shadow` | Engine receives triggers, records intended actions, but **does not call handlers** | Continues to run — handles everything in production |
| `live` | Engine owns the workflow — handlers are called | **Disabled** for this workflow; engine is sole executor |

In `shadow` mode, each trigger creates a `workflow_executions` row with `is_shadow: true`. At each node, the engine records what it *would* do in `workflow_tasks` with `status: 'shadow_would_run'` — without actually calling `stripe.charge`, `commission.create`, etc. The engine then compares its intended state against the actual DB state after the existing code runs, logging any divergence in `shadow_divergence JSONB`.

### 3.2 The Switch-Over Mechanism

**Switching to live is a manual admin decision.** There is no automatic trigger condition. The admin uses the Execution tab:

1. Navigate to Execution tab → select a shadow-mode workflow
2. View shadow execution history: "47 shadow executions ran. 47 matched expected state. 0 divergences."
3. If satisfied, click **"Go Live"** — this requires an explicit confirmation modal: *"Switch 'Booking Lifecycle — Human Tutor' to live mode? The engine will handle all new bookings. Existing webhook handling will be bypassed."*
4. `workflow_processes.execution_mode` updates to `'live'`

The Execution tab also surfaces a **divergence alert** if any shadow execution produced a state mismatch — e.g., the engine expected `stripe.charge` to produce a `payment_intent_id` but the existing webhook completed the payment via a different Stripe session. Divergences are a signal to review the template before going live.

### 3.3 Which Workflows Need Shadow Mode

| Workflow | Shadow Mode | Reason |
|----------|------------|--------|
| Tutor Application & Approval | No | No existing automated code to conflict with |
| Commission Payout | No | Replaces a cron job cleanly; cron is disabled at the same time engine goes live |
| Booking Lifecycle — Human Tutor | **Yes** | Existing code: Stripe webhook + `handle_successful_payment` RPC + cron auto-complete. Cannot run both. |
| Booking Lifecycle — AI Tutor | **Yes** | Same Stripe/RPC/cron chain as Human Tutor |
| Referral Attribution | No | Subprocess — runs only when invoked from parent. Existing `/api/referrals/attribute` call is replaced when parent goes live. |

### 3.4 Shadow Mode Database Fields

Added to existing tables in migration 338:

```sql
-- On workflow_processes (controls whether engine runs, shadows, or stays design-only)
ALTER TABLE workflow_processes
  ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'design'
    CHECK (execution_mode IN ('design', 'shadow', 'live'));

-- On workflow_executions (marks individual runs as shadow)
ALTER TABLE workflow_executions
  ADD COLUMN is_shadow BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN shadow_divergence JSONB DEFAULT NULL; -- populated when engine state != actual DB state
```

---

## 4. Architecture: PlatformWorkflowRuntime

### 4.1 Separate Runtime — Do Not Touch LangGraphRuntime.ts

The CAS `LangGraphRuntime` (`cas/packages/core/src/runtime/LangGraphRuntime.ts`) is production-critical. It is tightly coupled to CAS's `PlanningState` and `AgentRegistry` (Director, Analyst, Developer, etc.). **It must not be modified or abstracted.**

The Execution Engine uses a **separate** `PlatformWorkflowRuntime`, built from scratch in the web app:

```
apps/web/src/lib/process-studio/runtime/
  IWorkflowRuntime.ts          ← new, narrow 4-method contract for the execution engine
  PlatformWorkflowRuntime.ts   ← new, implements IWorkflowRuntime
  WorkflowCompiler.ts          ← compiles ProcessNode[] → LangGraph StateGraph
  NodeHandlerRegistry.ts       ← maps handler strings to integration functions
  handlers/
    stripe.ts
    session.ts
    ai-agent.ts
    commission.ts
    notification.ts
    review.ts
    rules.ts
```

`PlatformWorkflowRuntime` implements `IWorkflowRuntime` — a narrow 4-method interface defined in the web app. It does **not** implement `AgentRuntimeInterface`. The full `AgentRuntimeInterface` is a 22-method contract built around CAS agent concepts (`agentId`, `registerAgent`, `listAgents`, `getAgentStatus`) — none of which apply to workflow execution. Implementing it would require stub implementations for ~15 methods that will never be called and would create a misleading contract.

```typescript
// apps/web/src/lib/process-studio/runtime/IWorkflowRuntime.ts

type ExecutionStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

interface IWorkflowRuntime {
  /** Start a new execution from a workflow_process record. Returns the execution ID. */
  start(processId: string, context: Record<string, unknown>): Promise<string>;

  /** Resume a paused checkpoint (HITL approval, webhook callback, AI session end). */
  resume(threadId: string, decision: string, resultData: Record<string, unknown>): Promise<void>;

  /** Cancel a running or paused execution. */
  cancel(executionId: string): Promise<void>;

  /** Get current status and active node for an execution. */
  getStatus(executionId: string): Promise<{ status: ExecutionStatus; currentNodeId: string | null }>;
}
```

The two runtimes are fully independent — each implements its own interface:

```
IWorkflowRuntime (4-method workflow contract — web app)
└── PlatformWorkflowRuntime  ← dynamic topology, business context, NodeHandlerRegistry

AgentRuntimeInterface (22-method CAS contract — cas/packages/core)
└── CAS LangGraphRuntime     ← fixed topology, PlanningState, AgentRegistry
```

Phase 3 observability integration is via **direct writes** to `cas_metrics_timeseries` — not through a shared class hierarchy. Both runtimes emit to the same monitoring tables without coupling their implementations.

### 4.2 WorkflowCompiler

Compiles `ProcessNode[]` + `ProcessEdge[]` from a `workflow_process` record into a LangGraph `StateGraph<BusinessWorkflowState>` at runtime.

```typescript
// Business execution state — completely separate from CAS PlanningState
interface BusinessWorkflowState {
  executionId: string;
  processId: string;
  context: Record<string, unknown>;  // e.g. { booking_id, stripe_session_id, user_id }
  currentNodeId: string;
  completedNodes: string[];
  errors: Array<{ nodeId: string; error: string; attemptCount: number }>;
}
```

The compiler walks the `ProcessEdge[]` array to build the graph topology dynamically. Each node becomes a LangGraph node that calls `NodeHandlerRegistry.execute(node.data.handler, state.context)`.

### 4.3 Node Handler Registry

The registry maps the `handler` string on a node to a real integration function. This is the layer that makes action nodes actually *do* something.

**`ProcessStepData` extension** (addition to existing type in `apps/web/src/components/feature/workflow/types.ts`):

```typescript
interface ProcessStepData {
  // existing fields
  label: string;
  type: ProcessStepType;
  description: string;
  editable: boolean;

  // NEW: execution metadata (ignored at design time, used at execute time)
  handler?: string;           // e.g. "stripe.charge", "ai_agent.invoke"
  handler_config?: Record<string, unknown>; // e.g. { threshold: 70, min: 25 }
  completion_mode?: 'sync' | 'webhook' | 'hitl' | 'ai_session';
  assigned_role?: string;     // "admin" | "org_admin" | "tutor" | "client" | "automated"
  retry_limit?: number;       // defaults to 3
  timeout_minutes?: number;   // max time before auto-fail
}
```

**Registered handlers:**

| Handler | Integration | Result |
|---------|-------------|--------|
| `stripe.charge` | Stripe Checkout Session | `{ payment_intent_id, amount_charged }` |
| `stripe.refund` | Stripe API | `{ refund_id }` |
| `stripe.validate_connect_account` | `canReceivePayouts()` in `lib/stripe/payouts.ts` | `{ ready: boolean, reason? }` |
| `stripe.connect_payout` | `createConnectPayout()` in `lib/stripe/payouts.ts` | `{ payout_id, estimated_arrival }`; idempotency key required |
| `session.create` | `/api/virtualspace/session` | `{ session_id, join_url }` |
| `session.wait` | Waits for `virtualspace_sessions.status` → `completed` event | `{ session_duration, outcome }` |
| `ai_agent.invoke` | AI Agent virtualspace session | suspends; resumes on session-end Realtime event |
| `review.request` | `/api/reviews/pending-tasks` | `{ review_task_id }` |
| `commission.create` | `handle_successful_payment` RPC | Creates `clearing` transaction record; `{ transaction_id }` |
| `commission.query_available` | Query `transactions` where `status='available'` grouped by `profile_id` | `{ creators: Array<{ profile_id, balance, transaction_ids }> }` |
| `commission.void` | Updates transaction status to `void` | `{ voided: boolean }` |
| `scheduling.negotiate` | `/api/bookings/[id]/schedule/*`; suspends until propose+confirm cycle completes | `{ session_start_time, scheduling_status: 'scheduled' }` |
| `referral.attribute` | `POST /api/referrals/attribute` | `{ referral_id, status: 'Signed Up' }` |
| `referral.update_status` | Updates `referrals.status` | `{ status: 'Converted' }` |
| `caas.score` | `/api/caas/calculate` | `{ caas_score }` |
| `profile.activate` | `profiles` table update | `{ activated: true }` |
| `notification.send` | notification service; `handler_config.template` selects template | `{ notification_id }` |
| `rules.evaluate` | in-process rules engine; evaluates `handler_config` conditions | `{ passed: boolean, reason }` |

**Shadow mode behaviour:** When `execution_mode = 'shadow'`, `NodeHandlerRegistry.execute()` skips the actual integration call and returns a `{ shadowed: true, intended_handler: string }` result. The workflow graph advances as if the node succeeded, but no external systems are touched.

---

## 5. Async Completion Patterns & Idempotency

### 5.1 Four Completion Modes

Nodes do not all complete synchronously. The `completion_mode` field on each node determines how the runtime waits for completion.

| Mode | Who/What signals completion | Mechanism |
|------|-----------------------------|-----------|
| `sync` | Handler function returns | Inline — runtime continues immediately |
| `webhook` | External service (Stripe, Stripe Connect) | LangGraph Checkpoint pauses; webhook endpoint resumes |
| `hitl` | Human action (admin approval, tutor proposes schedule, client confirms) | LangGraph `interruptBefore`; `ApprovalDrawer` or task notification resumes |
| `ai_session` | AI Tutor session ends | LangGraph Checkpoint pauses; session completion Realtime event resumes |

**Key insight:** HITL gates, scheduling negotiation, human session completion, and AI Tutor handoffs all use the **same pause/resume mechanism** — LangGraph Checkpointing via `@langchain/langgraph-checkpoint-postgres`. The difference is only *who* triggers the resume: a human clicking a button, a tutor confirming a schedule, or a session-end event.

### 5.2 Webhook Async Flow

```
1. Runtime reaches a webhook-mode node (e.g. stripe.charge)
2. Handler calls Stripe, receives pending PaymentIntent
3. Runtime stores { payment_intent_id } in workflow_tasks.result_data
4. LangGraph Checkpoint persists state; execution suspends
5. Stripe fires POST /api/webhooks/stripe
6. Webhook handler looks up workflow_tasks by payment_intent_id
7. Calls POST /api/admin/workflow/execute/[threadId]/resume
8. Runtime reloads checkpoint and continues to next node
```

### 5.3 AI Tutor Handoff Flow

```
1. Runtime reaches ai_agent.invoke node
2. Handler creates virtualspace session (session_id stored in context)
3. LangGraph Checkpoint persists state; execution suspends
4. AI Tutor runs the session — student + AI interact
5. Session end fires Supabase Realtime event on workflow_tasks
6. Realtime handler calls POST /api/admin/workflow/execute/[threadId]/resume
7. Runtime reloads checkpoint, passes { session_duration, outcome } into context
8. Continues to review.request node
```

### 5.4 Idempotency — Payment Nodes

**This is non-negotiable.** If the runtime retries a `stripe.charge` node after a timeout without an idempotency key, the student is double-charged. There is no refactor for that — it is a production incident.

**Rule:** Any node with `handler: "stripe.*"` or `handler: "stripe.connect_*"` **must**:

1. Generate an idempotency key before the first attempt: `{execution_id}:{node_id}:{attempt}`
2. Store it in `workflow_tasks.idempotency_key` before calling the external API
3. Reuse the same key on all retries for the same `(execution_id, node_id)` pair

The `NodeHandlerRegistry` enforces this automatically for all payment handlers — it is not left to individual handler implementations.

---

## 6. Database Design

Migration numbers start from **338** (latest is 337).

### 6.1 `workflow_executions` (Migration 338)

Tracks the high-level run of a process. `langgraph_thread_id` ties the record to the LangGraph Checkpointer.

```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES workflow_processes(id),
  langgraph_thread_id TEXT UNIQUE,     -- links to LangGraph Checkpointer state
  target_entity_id UUID,               -- e.g. booking_id, user_id
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled')),
  is_shadow BOOLEAN NOT NULL DEFAULT false,         -- true when execution_mode = 'shadow'
  shadow_divergence JSONB DEFAULT NULL,             -- populated if engine state != actual DB state
  execution_context JSONB DEFAULT '{}'::jsonb,      -- business state passed between nodes
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY we_admin_all ON workflow_executions FOR ALL USING (is_admin());

CREATE INDEX idx_we_status ON workflow_executions(status);
CREATE INDEX idx_we_process_id ON workflow_executions(process_id);
CREATE INDEX idx_we_thread_id ON workflow_executions(langgraph_thread_id);
CREATE INDEX idx_we_is_shadow ON workflow_executions(is_shadow) WHERE is_shadow = true;
```

**`workflow_processes` shadow mode column** (existing table — also in migration 338):

```sql
-- Controls whether the engine runs in design-only, shadow, or live mode
ALTER TABLE workflow_processes
  ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'design'
    CHECK (execution_mode IN ('design', 'shadow', 'live'));

CREATE INDEX idx_wp_execution_mode ON workflow_processes(execution_mode);
```

### 6.2 `workflow_tasks` (Migration 338)

Tracks individual node executions within a run. `node_id` maps directly to ReactFlow node IDs in the canvas, enabling the live monitor to colour nodes by status.

```sql
CREATE TABLE workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,               -- ReactFlow node id (e.g. "action-2")
  name TEXT NOT NULL,
  type TEXT NOT NULL,                  -- matches ProcessStepType
  handler TEXT,                        -- e.g. "stripe.charge"
  completion_mode TEXT NOT NULL DEFAULT 'sync'
    CHECK (completion_mode IN ('sync', 'webhook', 'hitl', 'ai_session')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'skipped')),
  assigned_role TEXT,
  assigned_user_id UUID REFERENCES auth.users(id),
  idempotency_key TEXT,                -- for payment nodes
  attempt_count INTEGER NOT NULL DEFAULT 0,
  result_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY wt_admin_all ON workflow_tasks FOR ALL USING (is_admin());

CREATE INDEX idx_wt_execution_id ON workflow_tasks(execution_id);
CREATE INDEX idx_wt_node_id ON workflow_tasks(node_id);
CREATE INDEX idx_wt_status ON workflow_tasks(status);
```

### 6.3 `cas_knowledge_base` (Migration 339 — Phase 5)

Vector memory for the self-healing architecture. Uses `vector(768)` to match the platform's existing `gemini-embedding-001` pgvector setup.

```sql
CREATE TABLE cas_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_pattern TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  resolution_code TEXT NOT NULL,
  embedding vector(768),               -- gemini-embedding-001, 768-dim
  workflow_context TEXT,               -- which handler/node type this applies to
  success_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ckb_embedding ON cas_knowledge_base
  USING hnsw (embedding vector_cosine_ops);
```

---

## 7. API Routes

**Base path:** `/api/admin/workflow/execute/`

All routes require admin authentication (`is_admin()` enforced via RLS on underlying tables). Placed under `/api/admin/` to match the existing admin API namespace.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/start` | Compile a `workflow_process` into a `StateGraph`, create `workflow_executions` + initial `workflow_tasks` records, start execution. |
| `GET` | `/` | List active executions with status, process name, and current node. |
| `GET` | `/[executionId]` | Full execution detail including all task statuses. |
| `POST` | `/[threadId]/resume` | Resume a paused Checkpoint (HITL approval, webhook callback, or AI session end). Body contains `{ decision, result_data }`. |
| `POST` | `/task/[taskId]/complete` | Manually mark a task complete (for human-assigned tasks). |
| `DELETE` | `/[executionId]` | Cancel a running execution. |
| `PATCH` | `/[processId]/execution-mode` | Set `execution_mode` for a process. Body: `{ mode: 'design' \| 'shadow' \| 'live' }`. Requires confirmation modal on client for `'live'` transition. |
| `POST` | `/command` | NLI command bar — parse natural language intent and route to appropriate action. Uses `getAIService()`. |

---

## 8. Frontend: The Execution Tab

**Location:** Third tab within `/admin/conductor` — added to the existing `DiscoveryTab` union type:

```typescript
// discovery-store.ts
export type DiscoveryTab = 'design' | 'discovery' | 'execution';
```

The `HubTabs` component and page layout already support additional tabs with zero structural change.

### 8.1 Left Panel: Execution List

- Data table of active and recent executions, filterable by status
- Status filters: `Running` · `Paused (HITL)` · `Paused (AI Session)` · `Failed` · `Completed`
- Each row: process name, trigger entity, elapsed time, current node, quick actions

### 8.2 Right Panel: Live Canvas Monitor

`ProcessStudioCanvas` renders in read-only mode via a new `readOnly?: boolean` prop. Node colours update in real time via a `useExecutionRealtime` hook that subscribes to Supabase Realtime `postgres_changes` on `workflow_tasks`.

**Node status colours:**

| Status | Colour |
|--------|--------|
| `pending` | Grey |
| `running` | Blinking Blue |
| `paused` (HITL or AI session) | Amber |
| `completed` | Green |
| `failed` | Red |

### 8.3 ApprovalDrawer (HITL Modal)

When an execution pauses on an `approval` node, clicking the Amber node opens the `ApprovalDrawer`:
- Business context from `execution_context` (booking details, applicant info, etc.)
- AI-generated recommendation via `getAIService()`
- `[ Approve ]` and `[ Reject ]` buttons — both call `POST /execute/[threadId]/resume`

### 8.4 NLI Command Bar

A text input in the Execution tab header. Examples:
- *"Pause all active Booking Lifecycle runs"*
- *"Show me all executions waiting on Stripe confirmation"*

Calls `POST /execute/command` which uses `getAIService()` (the web app's 6-provider fallback chain — **not** a new standalone AI client).

---

## 9. Implementation Phases

Five phases. The first two go live immediately with zero payment risk. The Booking Lifecycle enters shadow mode in Phase 3 and only goes live in Phase 4 once shadow execution data proves the engine is correct.

---

### Phase 1 — Tutor Approval + Commission Payout (Live, No Shadow)

**Deliverable:** Two workflows go live immediately. No existing automated code conflicts. Proves HITL gates and the full CaaS → Approval → Notify flow in production before touching payment.

1. Migration 338: `workflow_executions` + `workflow_tasks` DDL + `workflow_processes.execution_mode` column
2. `PlatformWorkflowRuntime` + `IWorkflowRuntime` interface
3. `WorkflowCompiler` — `ProcessNode[]` → `StateGraph<BusinessWorkflowState>`
4. `NodeHandlerRegistry` with Phase 1 handlers: `caas.score`, `rules.evaluate`, `profile.activate`, `notification.send`, `commission.query_available`, `stripe.validate_connect_account`, `stripe.connect_payout`
5. Idempotency enforcement for `stripe.connect_payout`
6. API routes: `/start`, `/[threadId]/resume`, `/task/[taskId]/complete`, `/[executionId]` (DELETE), `PATCH /[processId]/execution-mode`
7. Supabase Webhook trigger: `profiles.status → 'under_review'` → `/execute/start` (Tutor Approval)
8. Cron trigger: seed `Tutor Approval` + `Commission Payout` templates in migration 338 — `execution_mode = 'live'`
9. Disable the existing `process-batch-payouts` cron job when Commission Payout template goes live

---

### Phase 2 — Execution Tab UI + HITL

**Deliverable:** Admins can watch live Phase 1 executions, approve/reject HITL gates, and toggle execution modes.

1. Add `'execution'` to `DiscoveryTab` in discovery-store
2. `readOnly` prop on `ProcessStudioCanvas`
3. `useExecutionRealtime` hook (mirrors `useDiscoveryRealtime` pattern) — subscribes to `workflow_tasks` changes
4. Execution list component + status filters (`Running`, `Paused (HITL)`, `Paused (AI Session)`, `Failed`, `Completed`)
5. Live canvas monitor with node status colours (grey / blue / amber / green / red)
6. `ApprovalDrawer` component + AI recommendation via `getAIService()`
7. Shadow mode toggle UI: execution mode badge on each process card + "Go Live" button with confirmation modal
8. Shadow divergence alert panel — shows mismatches between engine intent and actual DB state
9. API routes: `GET /` (list), `GET /[executionId]` (detail)
10. NLI command bar + `POST /execute/command`

---

### Phase 3 — Booking Lifecycle in Shadow Mode

**Deliverable:** Both Booking Lifecycle templates run silently alongside the existing Stripe webhook + `handle_successful_payment` RPC pipeline. No handler calls are made; every intended action is logged for divergence analysis.

1. Add remaining handlers to `NodeHandlerRegistry`: `stripe.charge`, `stripe.refund`, `session.create`, `session.wait`, `ai_agent.invoke`, `review.request`, `commission.create`, `commission.void`, `scheduling.negotiate`, `referral.attribute`, `referral.update_status`
2. Shadow mode path in `NodeHandlerRegistry.execute()` — returns `{ shadowed: true }` when `execution_mode = 'shadow'`
3. Seed `Booking Lifecycle — Human Tutor`, `Booking Lifecycle — AI Tutor`, `Referral Attribution` templates in migration 338 — `execution_mode = 'shadow'`
4. Supabase Database Webhook: `INSERT INTO bookings` where `booking_type = 'human'` → `/execute/start`
5. Supabase Database Webhook: `INSERT INTO bookings` where `booking_type = 'ai_agent'` → `/execute/start`
6. Monitor shadow executions in Execution tab — validate 0 divergences over a sufficient sample (target: 50+ bookings)

---

### Phase 4 — Booking Lifecycle Goes Live

**Deliverable:** Admin flips the "Go Live" switch. Engine owns booking payment, session orchestration, and referral attribution. Existing hardcoded handlers are decommissioned.

*Gate:* Shadow divergence rate must be 0% across ≥50 shadow executions before this phase begins. Admin decision.

1. `PATCH /[processId]/execution-mode` sets `execution_mode = 'live'` for both Booking Lifecycle templates
2. Stripe webhook extension: `checkout.session.completed` → `/execute/[threadId]/resume` instead of calling `handle_successful_payment` directly
3. Update `POST /api/virtualspace/[sessionId]/complete` to emit a Realtime event that resumes `session.wait` checkpoints
4. Disable: direct `handle_successful_payment` RPC call in `api/webhooks/stripe/route.ts` (replaced by engine)
5. Disable: `process-pending-commissions` cron job (replaced by `commission.create` handler in booking lifecycle)
6. Disable: `complete-sessions` cron job (replaced by `session.wait` completion event)
7. Full regression test: book a human tutor, book an AI tutor, trigger a referral — verify each lifecycle completes end-to-end via engine

---

### Phase 5 — Advanced Autonomy (CAS Integration)

**Deliverable:** Engine self-heals on known failures; telemetry feeds CAS agents and DSPy.

*Note: Phase 5 requires real execution data from Phases 1–4. Building vector memory before the engine has production failures to learn from is premature.*

1. Migration 339: `cas_knowledge_base` with `vector(768)` HNSW index
2. `RetryUtility` extension: on node failure, embed error → cosine search `cas_knowledge_base` → apply resolution if `similarity > 0.9` → retry
3. On novel failures (no match in knowledge base): route to `cas_planner_tasks` for Developer Agent fix → Engineer agent embeds resolution into `cas_knowledge_base`
4. `cas_metrics_timeseries` emission: execution duration, node success rates, commission totals → feeds CAS Marketer Agent dashboard
5. `ai_feedback` seeding: AI Tutor session outcomes (rating, duration, completion) → DSPy weekly optimization loop via `pg_cron`

---

## 10. Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| `PlatformWorkflowRuntime` is separate from `LangGraphRuntime` | CAS runtime is production-critical and CAS-specific. Sharing a base class would require refactoring working code for zero benefit. |
| `PlatformWorkflowRuntime` implements `IWorkflowRuntime`, not `AgentRuntimeInterface` | `AgentRuntimeInterface` is a 22-method contract built around CAS agent concepts (`agentId`, `registerAgent`, `listAgents`, `getAgentStatus`). None of those concepts apply to workflow execution. Implementing it would require ~15 stub methods that will never be called, creating a misleading contract. `IWorkflowRuntime` defines exactly the 4 methods the execution engine uses. Phase 5 observability integration uses direct writes to `cas_metrics_timeseries`, not a shared interface. |
| API base path: `/api/admin/workflow/execute/` | Matches admin API namespace. "Execute" is precise; "deploy" is already taken by Vercel deploys in the Engineer agent. |
| Execution is the third tab label, not a separate route | Consistent with Design/Discovery tab pattern. Zero new routing infrastructure. Tab value in store: `'execution'`. |
| No `tenant_id` | Platform is single-tenant. Adding `tenant_id NOT NULL` with no reference target is not future-proofing — it is a broken column. Add in a dedicated SaaS migration when a `tenants` table exists. |
| Idempotency keys enforced in `NodeHandlerRegistry` | Double-charging a student is a production incident. Idempotency cannot be left to individual handler implementations. |
| HITL and AI session handoffs use the same checkpoint mechanism | They are the same problem: suspend until an external party signals completion. Unified mechanism reduces implementation surface. |
| `completion_mode` on `workflow_tasks` (not derived) | Stored explicitly so the runtime does not need to re-inspect node configuration to determine how to wait for completion. |
| Priority ordering: Tutor Approval (P1) before Booking Lifecycle (P3–4) | Booking Lifecycle touches Stripe payment on day one. Tutor Approval has zero payment risk and proves the HITL gate, WorkflowCompiler, and NodeHandlerRegistry end-to-end before anything touches money. |
| Shadow mode switch-over is manual, not automatic | Automatic switch-over requires defining a success threshold (what is "enough" shadow runs?). That threshold is itself a business decision. The admin must own it — they have context on booking volume, error tolerance, and readiness that the engine does not. A confirmation modal makes the decision explicit and irreversible (requires deliberate action). |
| Referral Attribution is a subprocess node, not a standalone workflow | Referral attribution is causally dependent on a booking — it has no independent trigger and always runs in the context of a booking execution. Making it a standalone workflow would require passing `booking_id` as external state and coordinating two concurrent executions. The subprocess node pattern already exists in Process Studio (teal, `Layers` icon) and handles this correctly: parent execution passes context, subprocess completes, parent resumes. |
| `commission.create` (not `commission.payout`) in Booking Lifecycle | The booking lifecycle creates a *clearing transaction* — a 7-day held record in the `transactions` table via `handle_successful_payment` RPC. The actual payout to the creator's Stripe Connect account happens in the separate weekly Commission Payout workflow (Section 2.2). These are different operations on different schedules. Naming them both "commission.payout" would conflate clearing and settlement. |

---

## 11. AI Implementation Time Estimates

These are estimates for **AI-assisted implementation** (Claude Code) — not human developer time. AI writes fast and has full codebase context, but complex integrations (LangGraph, Stripe webhook chaining, async completion flows) require iteration cycles. Each task estimate includes time for writing, self-correction, build verification, and type checking.

### Phase 1 — Tutor Approval + Commission Payout (Live)

| Task | Files | Est. Hours |
|------|-------|-----------|
| Migration 338: `workflow_executions` + `workflow_tasks` DDL + `workflow_processes.execution_mode` column | `tools/database/migrations/338_create_workflow_executions.sql` | 0.75 |
| `IWorkflowRuntime` interface | `runtime/IWorkflowRuntime.ts` | 0.25 |
| `PlatformWorkflowRuntime` skeleton + LangGraph Checkpointer wiring | `runtime/PlatformWorkflowRuntime.ts` | 1.5 |
| `WorkflowCompiler` — `ProcessNode[]` → `StateGraph<BusinessWorkflowState>` | `runtime/WorkflowCompiler.ts` | 2.0 |
| `NodeHandlerRegistry` + Phase 1 handlers (`caas.score`, `rules.evaluate`, `profile.activate`, `notification.send`, `commission.query_available`, `stripe.validate_connect_account`, `stripe.connect_payout`) | `runtime/NodeHandlerRegistry.ts` + `handlers/*.ts` | 1.75 |
| Idempotency enforcement for `stripe.connect_payout` | `handlers/stripe.ts` | 0.25 |
| API routes: `/start`, `/[threadId]/resume`, `/task/[taskId]/complete`, `/[executionId]` (DELETE), `PATCH /[processId]/execution-mode` | `api/admin/conductor/execute/` | 1.5 |
| Supabase Webhook trigger: `profiles.status → 'under_review'` → `/execute/start` | Supabase dashboard config + route handler | 0.5 |
| Seed `Tutor Approval` + `Commission Payout` templates (`execution_mode = 'live'`) in migration 338 | migration SQL + seed data | 0.5 |
| Disable `process-batch-payouts` cron when Commission Payout template goes live | `app/api/cron/process-batch-payouts/route.ts` | 0.25 |
| **Phase 1 Total** | | **~9.25 h** |

### Phase 2 — Execution Tab UI + HITL

| Task | Files | Est. Hours |
|------|-------|-----------|
| Add `'execution'` to `DiscoveryTab` union type + page tab | `discovery-store.ts`, `page.tsx` | 0.25 |
| `readOnly` prop on `ProcessStudioCanvas` + node colour overrides | `ProcessStudioCanvas.tsx` | 0.75 |
| `useExecutionRealtime` hook (mirrors `useDiscoveryRealtime` pattern) | `hooks/useExecutionRealtime.ts` | 0.75 |
| Execution list component + status filters | `ExecutionList.tsx` | 1.25 |
| Live canvas monitor (node status colours from `workflow_tasks`) | `ExecutionMonitor.tsx` | 1.5 |
| `ApprovalDrawer` component + AI recommendation via `getAIService()` | `ApprovalDrawer.tsx` | 1.0 |
| Shadow mode toggle UI + divergence alert panel | `ExecutionModeToggle.tsx`, `ShadowDivergencePanel.tsx` | 1.0 |
| NLI command bar + `POST /execute/command` route | `ExecutionCommandBar.tsx` + API route | 1.0 |
| API routes: `GET /` (list), `GET /[executionId]` (detail) | `api/admin/conductor/execute/` | 0.5 |
| **Phase 2 Total** | | **~8.0 h** |

### Phase 3 — Booking Lifecycle in Shadow Mode

| Task | Files | Est. Hours |
|------|-------|-----------|
| Add remaining handlers to `NodeHandlerRegistry` (`stripe.charge`, `stripe.refund`, `session.create`, `session.wait`, `ai_agent.invoke`, `review.request`, `commission.create`, `commission.void`, `scheduling.negotiate`, `referral.attribute`, `referral.update_status`) | `handlers/*.ts` | 2.0 |
| Shadow mode path in `NodeHandlerRegistry.execute()` — `{ shadowed: true }` response | `runtime/NodeHandlerRegistry.ts` | 0.5 |
| Seed `Booking Lifecycle — Human Tutor`, `Booking Lifecycle — AI Tutor`, `Referral Attribution` templates (`execution_mode = 'shadow'`) in migration 338 | migration SQL + seed data | 1.0 |
| Supabase Database Webhooks: `INSERT INTO bookings` (human + ai_agent types) → `/execute/start` | Supabase dashboard config | 0.5 |
| **Phase 3 Total** | | **~4.0 h** |

### Phase 4 — Booking Lifecycle Goes Live

| Task | Files | Est. Hours |
|------|-------|-----------|
| Stripe webhook integration: `checkout.session.completed` → `/execute/[threadId]/resume` (replaces direct `handle_successful_payment` call) | `api/webhooks/stripe/route.ts` | 1.0 |
| `session.wait` completion event: update `/api/virtualspace/[sessionId]/complete` to emit Realtime event | `api/virtualspace/[sessionId]/complete/route.ts` | 0.5 |
| Disable direct `handle_successful_payment` call + `process-pending-commissions` + `complete-sessions` cron jobs | 3 route files | 0.5 |
| End-to-end regression test run: human tutor booking, AI tutor booking, referral attribution | manual + automated verification | 0.5 |
| **Phase 4 Total** | | **~2.5 h** |

### Phase 5 — Advanced Autonomy (CAS Integration)

| Task | Files | Est. Hours |
|------|-------|-----------|
| Migration 339: `cas_knowledge_base` with `vector(768)` HNSW index | `tools/database/migrations/339_create_cas_knowledge_base.sql` | 0.5 |
| `RetryUtility` extension: embed error → `cas_knowledge_base` vector lookup → auto-resolve | `runtime/RetryUtility.ts` | 2.0 |
| Novel failure routing → `cas_planner_tasks` | `runtime/PlatformWorkflowRuntime.ts` | 1.0 |
| `cas_metrics_timeseries` emission (execution duration, node success rates, commission totals) | `runtime/PlatformWorkflowRuntime.ts` | 1.0 |
| `ai_feedback` seeding from AI Tutor session outcomes | `handlers/ai-agent.ts` | 0.5 |
| **Phase 5 Total** | | **~5.0 h** |

### Summary

| Phase | Scope | Est. Hours |
|-------|-------|-----------|
| Phase 1 | Tutor Approval + Commission Payout — live from day one | ~9.25 |
| Phase 2 | Execution tab UI, live monitor, HITL, shadow toggle, NLI | ~8.0 |
| Phase 3 | Booking Lifecycle templates in shadow mode | ~4.0 |
| Phase 4 | Booking Lifecycle goes live — existing code decommissioned | ~2.5 |
| Phase 5 | Self-healing, CAS integration, DSPy feeding | ~5.0 |
| **Grand Total** | | **~28.75 h** |

**Key uncertainty factors:**

- `WorkflowCompiler` (LangGraph `StateGraph` dynamic construction) is the highest-risk task — the complexity of compiling arbitrary `ProcessNode[]` graphs into valid LangGraph topologies may surface edge cases that extend Phase 1 by 1–2 hours.
- Phase 4 Stripe webhook integration depends on clean separation between the existing `handle_successful_payment` RPC path and the new engine resume path — estimated 0.5h contingency if the webhook needs re-entrant handling.
- Phase 5 `RetryUtility` extension depends on how cleanly the existing `cas/packages/core/src/runtime/RetryUtility.ts` can be extended without touching CAS internals — could range from 1.5h to 3h.
- Phase 2 UI tasks are low-risk — they follow established Discovery Panel patterns exactly.
- Phases 3 and 4 are separated by a human gate (sufficient shadow executions). Actual calendar time between them is determined by booking volume, not implementation complexity.

# Platform Nexus — Technical Reference

**Status**: Superseded — See [ipom-solution-design.md](./ipom-solution-design.md)
**Date**: 2026-03-05
**Owner**: Product Team
**Version**: 1.0 — Reference only

> **This document has been superseded by [ipom-solution-design.md](./ipom-solution-design.md)**
> which incorporates the Nexus technical layer within the full iPOM (Intelligent Platform
> Operations Management) product design. The Nexus integration infrastructure (event bus,
> bridges, knowledge pipelines) is now §5 of the iPOM solution design.
> This file is retained as a technical reference for the Nexus layer specifically.

---

## 1. Product Vision

### 1.1 What Is Platform Nexus?

Platform Nexus is the connective tissue of Tutorwise. It is not a user-facing product — it is the integration and intelligence layer that binds together every system the platform has built: CAS, Sage, Lexi, Growth, Process Studio (Discovery, Design, Execution), and the AI Agent Studio.

Without Nexus, these are isolated subsystems that happen to share a database. With Nexus, they form a coherent platform where:
- Any agent can observe what every other system is doing
- Any conversational agent can delegate real-world actions safely through Process Studio
- Lexi and Growth automatically learn about new features the day they ship
- Every admin sees a single health view across all systems

### 1.2 One-Line Pitch

> "Nexus turns Tutorwise's isolated subsystems into a unified, self-aware platform."

### 1.3 What Nexus Is Not

- **Not a new user-facing feature** — users never see "Nexus" directly
- **Not a replacement** for any existing system (CAS, Process Studio, AI Agent Studio remain as-is)
- **Not a monolith** — Nexus is the protocol and tooling layer, not a new central service
- **Not an orchestration engine** — Process Studio already handles workflow orchestration; Nexus connects agents to it

### 1.4 The Problem It Solves

| Problem | Impact |
|---------|--------|
| Each system (Sage, Lexi, Growth, CAS, Process Studio) is a silo | No cross-system observability; bugs invisible at system boundaries |
| Lexi's knowledge base goes stale every time a new feature ships | Support quality degrades; users get wrong answers |
| Conversational agents (Lexi, Growth) have no safe way to take write actions | Actions duplicated per-agent with no audit trail or idempotency |
| No unified admin view across all AI systems | Admins navigate 6+ separate dashboards to understand platform health |
| CAS message bus was built for cross-agent communication but never fully wired | Infrastructure exists but Growth and Process Studio are not participants |

---

## 2. Systems in Scope

### 2.1 Platform Map

```
┌───────────────────────────────────────────────────────────────────────────┐
│                       AI AGENT STUDIO                                      │
│              Agent Registry + Factory (ai_agents table)                    │
│     Creates and publishes: Sage tutors, Growth agents, future agents       │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │ spawns runtime agents
                                 ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                       PLATFORM EVENT BUS  (Nexus core)                    │
│            Extended cas/messages/ — AgentIdentifier + MessageType          │
│            Backed by cas_agent_events with source_system column            │
└──┬──────────┬──────────────┬──────────────────┬──────────────┬────────────┘
   │          │              │                  │              │
 Sage       Lexi          Growth        Process Studio        CAS
(runtime)  (runtime)     (runtime)     Discovery/Execution  (dev pipeline)
   │          │              │                  │              │
   └──────────┴──────────────┴──────────────────┴──────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   UNIFIED PLATFORM      │
                    │   CONSOLE               │
                    │   /admin/platform/      │
                    └─────────────────────────┘
```

### 2.2 System Roles

| System | Role in Nexus | Participates As |
|--------|--------------|----------------|
| **AI Agent Studio** | Agent Registry + Factory | Lifecycle events only (agent.created, agent.published) |
| **Sage** | AI tutor runtime | Full bridge — session, feedback, progress events |
| **Lexi** | Help bot runtime | Full bridge — session, feedback + new platform-aware tools |
| **Growth** | Advisory agent runtime | New bridge — audit, session, action events |
| **Process Studio** | Workflow runtime + action execution engine | New bridge — workflow lifecycle events |
| **CAS** | Dev pipeline + platform backbone | Already on bus; hosts the event store |

---

## 3. The Four Integration Patterns

Nexus is built on four distinct integration patterns, each solving a different class of problem.

### Pattern 1: Platform Event Bus

**Problem**: Systems cannot observe each other.

**Solution**: Extend `cas/messages/` to cover all platform systems. Every agent/system publishes structured events on key lifecycle moments. All events persist to `cas_agent_events` with a `source_system` column so the unified console can query across them.

```
source_system: 'sage' | 'lexi' | 'growth' | 'process-studio' | 'cas' | 'ai-agent-studio'
```

**New AgentIdentifiers**:
```typescript
| 'growth'                        // Growth Agent sessions and audits
| 'process-studio'                // Workflow execution lifecycle
| 'process-studio:discovery'      // Discovery scan events
| 'process-studio:execution'      // Execution engine events
| 'ai-agent-studio'               // Agent creation/publication
```

**New MessageTypes**:
```typescript
| 'workflow.started'
| 'workflow.completed'
| 'workflow.paused'               // HITL awaiting approval
| 'workflow.resumed'
| 'workflow.failed'
| 'workflow.shadow_divergence'    // Shadow mode: real ≠ expected
| 'discovery.scan_started'
| 'discovery.scan_completed'
| 'growth.audit_completed'
| 'growth.action_taken'
| 'agent.created'                 // New agent in AI Agent Studio
| 'agent.published'
| 'agent.disabled'
```

### Pattern 2: Knowledge Pipeline

**Problem**: Lexi (and Growth) knowledge bases go stale. Every new feature requires manual MDX authoring.

**Solution**: Process Discovery already scans the entire codebase and produces structured `workflow_discovery_results` rows with name, description, and step breakdowns. A post-scan pipeline automatically formats these into knowledge chunks and upserts them into `lexi_knowledge_chunks` (and `growth_knowledge_chunks` where relevant).

```
Process Discovery scan completes
        ↓
pipeline/discovery-to-knowledge.ts runs
        ↓
For each workflow_discovery_results row:
  Format as knowledge chunk (name + description + steps + source_type)
  Embed via Gemini (gemini-embedding-001, 768 dimensions)
  Upsert into lexi_knowledge_chunks WHERE category = 'processes'
  Upsert into growth_knowledge_chunks WHERE relevant to tutor growth
        ↓
Lexi and Growth immediately know about the new workflow
```

This runs as a post-scan job triggered whenever Discovery completes a scan. Zero manual work.

### Pattern 3: HITL Action Gateway

**Problem**: Conversational agents (Lexi, Growth) need to take real-world write actions (cancel bookings, update listings, send messages) but building per-agent action tools duplicates logic, loses audit trails, and has no idempotency.

**Solution**: Process Studio's execution engine becomes the action runtime for ALL conversational agents. When any agent needs to execute a write action, it delegates through the HITL gateway:

```
Conversational Agent (Lexi / Growth)
        │
        │ POST /api/admin/process-studio/execute/start
        │ { processId, contextData, triggeredBy: 'lexi' | 'growth' }
        ↓
Process Studio execution engine
        │
        ├── Runs to HITL node
        │
        ↓
Agent renders confirmation in its own chat UI
        │
        │ User confirms → agent calls
        │ POST /execute/[id]/resume { decision: "approve" }
        ↓
Process Studio executes with:
  - Full audit trail
  - Idempotency
  - Existing handlers (stripe.refund, commission.create, notification.send, etc.)
  - Rollback on failure
```

The existing workflow handlers already work. Agents do not duplicate this logic — they orchestrate it.

**Example — Lexi handling booking cancellation**:
```
User: "Cancel my 3pm booking with James tomorrow"

Lexi: Found it — Booking #4821, James Wilson, Tuesday 3 March at 3:00pm.
  Cancelling within 24 hours may affect your cancellation rate.
  [Confirm Cancellation] [Keep Booking]

User: [Confirm Cancellation]
→ Lexi triggers: Booking Cancellation workflow
→ stripe.refund fires, notification.send fires, commission.void fires
Lexi: Done. James has been notified and your refund is processing.
```

**Example — Growth Agent updating a listing**:
```
User: [Approves listing bio update]
→ Growth triggers: Profile Update workflow
→ listings table updated, search index refreshed
Growth: Done. Your listing now reads: "GCSE Maths (AQA/Edexcel)..."
```

### Pattern 4: Unified Platform Console

**Problem**: Platform health requires navigating six separate admin dashboards.

**Solution**: A new `/admin/platform/` page aggregates health signals from all systems into one view. Not a replacement for individual admin pages — a summary layer that links to them.

```
/admin/platform/
  Overview tab:
    ├── System health grid (Sage / Lexi / Growth / Process Studio / CAS / AI Agent Studio)
    │     Each shows: status, active sessions/executions, last event, error count
    ├── Platform KPIs (active AI sessions, workflows running, agents published)
    └── Alert feed (critical events from any system in the last 24h)

  Event Stream tab:
    └── Live feed from cas_agent_events (all source_systems)
        Filterable by system, event type, time range

  Approvals tab (lift from /admin/process-studio?tab=approvals):
    └── HITL tasks awaiting approval across all workflows
        Approvable directly from this view
```

---

## 4. New Components to Build

### 4.1 Bridge Files

Two new bridge files following the existing `sage-bridge.ts` / `lexi-bridge.ts` pattern:

**`cas/integration/growth-bridge.ts`**
- `handleAuditCompleted(event)` → publish `growth.audit_completed`
- `handleSessionEvent(event)` → publish `session.started` / `session.ended`
- `handleActionTaken(event)` → publish `growth.action_taken`

**`cas/integration/process-studio-bridge.ts`**
- `handleWorkflowStarted(event)` → publish `workflow.started`
- `handleWorkflowCompleted(event)` → publish `workflow.completed`
- `handleWorkflowPaused(event)` → publish `workflow.paused`
- `handleWorkflowFailed(event)` → publish `workflow.failed`
- `handleShadowDivergence(event)` → publish `workflow.shadow_divergence`
- `handleScanCompleted(event)` → publish `discovery.scan_completed` + trigger knowledge pipeline

### 4.2 Shared Platform Tools

Shared tools consumed by any conversational agent — not Lexi-specific, not Growth-specific:

```
apps/web/src/lib/process-studio/agent-tools/
  get-executions.ts       ← get live execution state for a user (Lexi + Growth)
  trigger-workflow.ts     ← HITL action gateway (Lexi + Growth + future agents)
  list-approvals.ts       ← list pending HITL tasks (admin mode)
  approve-task.ts         ← approve/reject a HITL task (admin mode)
  get-divergences.ts      ← shadow mode divergence report (admin mode)
```

**`get-executions.ts`** (user-facing):
```sql
SELECT we.id, we.status, we.execution_context, wp.name, wt.name as current_task
FROM workflow_executions we
JOIN workflow_processes wp ON wp.id = we.process_id
LEFT JOIN workflow_tasks wt ON wt.execution_id = we.id
  AND wt.status IN ('running', 'paused')
WHERE we.target_entity_id = $profile_id
  AND we.status IN ('running', 'paused')
```

**`trigger-workflow.ts`** (HITL gateway):
```typescript
POST /api/admin/process-studio/execute/start
{
  processId: string,
  contextData: Record<string, unknown>,
  triggeredBy: 'lexi' | 'growth' | 'admin',
  triggeredBySessionId: string
}
```

### 4.3 Knowledge Pipeline

```
apps/web/src/lib/nexus/
  discovery-knowledge-pipeline.ts   ← formats + embeds + upserts discovery results
  index.ts
```

Triggered by `process-studio-bridge.ts` after every completed scan. Also runnable on-demand via admin action.

### 4.4 Database Changes

**Extend `cas_agent_events`** — add `source_system` column:
```sql
ALTER TABLE cas_agent_events
ADD COLUMN source_system text DEFAULT 'cas';

CREATE INDEX idx_cas_agent_events_source ON cas_agent_events(source_system);
```

**No new tables required** — Nexus uses existing tables: `cas_agent_events`, `workflow_executions`, `workflow_tasks`, `workflow_discovery_results`, `lexi_knowledge_chunks`.

### 4.5 Unified Platform Console

```
apps/web/src/app/(admin)/admin/platform/
  page.tsx                 ← Platform Console (Overview + Event Stream + Approvals)
  components/
    SystemHealthGrid.tsx   ← Status card per system
    PlatformEventStream.tsx ← Live event feed (Supabase Realtime)
    PlatformKPIRow.tsx     ← Cross-system KPIs
```

---

## 5. What Each System Gains

### Sage
- Events published on session start/end/feedback → visible in Platform Console event stream
- No new capabilities needed — sage-bridge.ts already exists

### Lexi
- **Always up to date** — Discovery pipeline keeps `lexi_knowledge_chunks` current
- **Execution-aware answers** — `get-executions` tool lets Lexi explain live workflow state to users
- **Safe write actions** — HITL gateway enables booking cancellation, message sending etc.
- **Admin approval interface** — `list-approvals` + `approve-task` let support staff approve HITL tasks via Lexi chat
- **Shadow divergence intelligence** — Lexi surfaces divergences to admins as proactive alerts

### Growth
- Events published on audit completion and action taken → visible in Platform Console
- **Execution-aware** — same `get-executions` tool explains commission/payout status to tutors
- **Safe actions (Phase 2)** — `update_listing`, `send_message` delegate through HITL gateway
- **Up-to-date knowledge** — Discovery pipeline feeds growth-relevant workflow changes

### Process Studio
- Events published on every workflow lifecycle transition → all agents can observe
- Post-scan knowledge pipeline runs automatically
- Admin approvals also surfaced in Platform Console

### CAS
- Already the backbone — event store, message bus host
- New bridge files extend its integration surface
- Platform Console is a new consumer of `cas_agent_events`

### AI Agent Studio
- Publishes `agent.created` / `agent.published` on agent lifecycle changes
- Agent counts and creation trends appear in Platform Console overview

---

## 6. Technical Architecture

### 6.1 Directory Changes

```
cas/
  messages/
    types.ts              ← ADD: growth, process-studio AgentIdentifiers + MessageTypes
  integration/
    sage-bridge.ts        existing
    lexi-bridge.ts        existing
    growth-bridge.ts      NEW
    process-studio-bridge.ts  NEW

apps/web/src/
  lib/
    nexus/
      discovery-knowledge-pipeline.ts  NEW
      index.ts                         NEW
    process-studio/
      agent-tools/                     NEW
        get-executions.ts
        trigger-workflow.ts
        list-approvals.ts
        approve-task.ts
        get-divergences.ts
  app/(admin)/admin/
    platform/                          NEW
      page.tsx
      components/
        SystemHealthGrid.tsx
        PlatformEventStream.tsx
        PlatformKPIRow.tsx
```

### 6.2 Data Flow

```
                    cas_agent_events (source_system column)
                           ↑
sage-bridge.ts  ───────────┤
lexi-bridge.ts  ───────────┤
growth-bridge.ts ──────────┤  (all bridges write here)
process-studio-bridge.ts ──┘
                           │
                           ▼
                  /admin/platform/          Supabase Realtime
                  PlatformEventStream.tsx ←─ subscription


workflow_discovery_results
         │
         ▼ (post-scan trigger)
discovery-knowledge-pipeline.ts
         │
         ├──▶ lexi_knowledge_chunks (category='processes')
         └──▶ growth_knowledge_chunks (process-relevant subset)


workflow_executions + workflow_tasks
         │
         ▼ (agent tool call)
get-executions.ts
         │
         ├──▶ Lexi: "Your approval is waiting at step 2"
         └──▶ Growth: "Your payout completed at 10:14 AM"
```

---

## 7. Build Sequence

### Phase 1 — Foundation (Build with Growth Agent)

```
1. Extend cas/messages/types.ts
     → Add growth, process-studio AgentIdentifiers
     → Add workflow.*, discovery.*, growth.*, agent.* MessageTypes

2. Add source_system column to cas_agent_events (migration)

3. Create cas/integration/growth-bridge.ts
     → Publish growth events to message bus

4. Create cas/integration/process-studio-bridge.ts
     → Publish workflow lifecycle events
     → Trigger knowledge pipeline on scan completion

5. Create apps/web/src/lib/nexus/discovery-knowledge-pipeline.ts
     → Post-scan: format → embed → upsert into lexi_knowledge_chunks
     → High priority: solves Lexi's "never up to date" problem immediately

6. Create shared agent tools (get-executions, trigger-workflow)
     → Used immediately by Growth Agent Phase 1 (execution awareness)
     → Used by Lexi in Phase 1

7. /admin/platform/ — Platform Console
     → SystemHealthGrid (status per system)
     → PlatformEventStream (live cas_agent_events feed)
     → Links to individual admin pages for drill-down
```

### Phase 2 — HITL Gateway (Build with Growth Agent Phase 2)

```
8. trigger-workflow.ts — HITL action gateway
     → Growth Agent Phase 2 action tools delegate through this
     → Lexi booking cancellation, message sending

9. list-approvals + approve-task tools (admin mode)
     → Lexi admin approval interface
     → Lift approvals tab into /admin/platform/

10. get-divergences tool
     → Lexi proactive shadow divergence alerts for admins
```

### Phase 3 — Intelligence (Future)

```
11. Persist message bus to platform_events table
     → Full durable event log across all systems
     → Enables replay, time-travel debugging

12. Cross-system anomaly detection
     → CAS Marketer agent reads cross-system patterns
     → Alerts on: feedback spike in Sage → related to recent deployment

13. Agent-to-agent communication
     → Growth publishes nudge events → Lexi can surface them in help chat
     → Sage session end → Growth can detect coaching opportunity
```

---

## 8. Design Decisions

### D1: Name — "Nexus"
**Resolved**: The product is called **Nexus**. Internal/technical name; users never see it. The admin page is `/admin/platform/` (descriptive, not branded). Nexus describes the role: the central connection point that binds all systems.

### D2: New system or extension of CAS?
**Resolved**: Extension of CAS. CAS already has the message bus (`cas/messages/`), event store (`cas_agent_events`), and integration bridges (sage-bridge, lexi-bridge). Nexus extends these rather than creating a parallel infrastructure. CAS is the backbone; Nexus is the full wiring.

### D3: Does Nexus need its own package?
**Resolved**: No. The shared platform tools live in `apps/web/src/lib/process-studio/agent-tools/` (close to the runtime they call). The knowledge pipeline lives in `apps/web/src/lib/nexus/`. Bridge files stay in `cas/integration/`. No new top-level package needed.

### D4: Should AI Agent Studio be a bus participant?
**Resolved**: Yes, minimally. It publishes `agent.created` and `agent.published` events for platform analytics (CAS Marketer tracks adoption; Platform Console shows agent inventory). It does not need a full bridge file — just event calls from the API routes that handle agent creation/publication.

### D5: Should the message bus be persistent?
**Resolved**: Not in Phase 1. The existing `cas_agent_events` table (with added `source_system` column) is sufficient for Phase 1 observability. Full durable message persistence is Phase 3 when the volume and replay requirements are clearer.

### D6: HITL gateway — Lexi and Growth call Process Studio API directly?
**Resolved**: Yes, via `trigger-workflow.ts` shared tool which wraps `POST /api/admin/process-studio/execute/start`. This keeps Process Studio as the single action runtime. Agents do not get their own write-action infrastructure.

### D7: Approval UX — Platform Console vs Process Studio vs Lexi chat?
**Resolved**: All three surfaces are valid. Process Studio ApprovalDrawer remains the primary UI for structured admin workflows. Lexi chat is the conversational interface for support staff. Platform Console aggregates the list. All three call the same API endpoint — no duplication.

---

## 9. Success Metrics

| Metric | Target | Measured By |
|--------|--------|-------------|
| Lexi knowledge staleness | < 24h after a feature ships | Discovery scan frequency + pipeline lag |
| Cross-system event visibility | 100% of lifecycle events captured | `cas_agent_events` coverage per system |
| Agent action audit completeness | 100% of write actions via HITL gateway | `workflow_executions` triggered_by field |
| Admin platform health visibility | Single page shows all system status | Platform Console uptime |
| Discovery → knowledge pipeline success rate | > 99% | Pipeline job error rate |

---

## 10. Open Questions

1. **Discovery scan frequency**: How often does Process Discovery run automatically? Continuous (on deploy via CAS), scheduled (daily/weekly), or manual only? This determines how fresh Lexi's knowledge stays.
2. **Knowledge chunk deduplication**: When Discovery re-scans a workflow that already has knowledge chunks, how do we detect and update changed chunks vs. delete unchanged ones? Delta-sync strategy needed.
3. **Growth knowledge feed**: Should Growth Agent get its own `growth_knowledge_chunks` table, or is it a subset filter on `lexi_knowledge_chunks`? Separate table gives cleaner scoping; shared table reduces duplication.
4. **Platform Console RBAC**: Should `/admin/platform/` require `cas:view` permission, or a new `platform:view` permission? Platform Console aggregates CAS, Process Studio, Sage, Growth — it's broader than just CAS.
5. **Message bus volume**: At scale (thousands of daily sessions), the event bus volume will be high. At what point do we need a proper queue (Redis Streams / Supabase Realtime channels) instead of direct DB writes?

---

*Version 1.0 — Initial design. Pending review.*

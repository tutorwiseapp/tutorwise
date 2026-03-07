# iPOM v3 — Architecture Audit

**Date**: 2026-03-07
**Document audited**: `ipom-solution-design-v3.md`

---

## Overall Assessment

Well-architected. The vision — one admin canvas for workflows, agents, and teams — is coherent and well-motivated. Design decisions D1–D23 are mutually reinforcing. Phase dependency chain is a clean DAG with no circular dependencies.

**Critical gaps** that must be resolved before Phase 1 begins:
1. RLS policies not specified for any new table
2. `platform_events` partition pruning (6 months) contradicts GDPR retention (12 months)
3. Tool Registry has no database schema
4. ASCII "After iPOM" diagram has Process Studio disconnected from everything

---

## Scores

| Category | Score | Key finding |
|----------|-------|-------------|
| Architecture clarity | 8/10 | Strong; pg_cron→runtime invocation and error paths not diagrammed |
| Design decisions (D1–D23) | 9/10 | All internally consistent; one partition/retention mismatch |
| Database schema | 7/10 | Core tables solid; Tool Registry schema missing; RLS not specified |
| Phase dependencies | 9/10 | Clean DAG; Phase 2 at ~140h has no sub-phase milestones |
| Contradictions | 7/10 | No logic contradictions; Growth Agent deprecation path well resolved |
| Integration points | 6/10 | pg_cron→runtime, webhook dedup, AI agent→exception queue underspecified |
| Security & auth | 4/10 | **Critical**: no RLS policies; tool validation/sandboxing undefined |
| Naming consistency | 7/10 | "Growth Agent" vs "Growth Advisor" inconsistent; otherwise fine |

---

## Critical Issues (blocking Phase 1)

### C1 — ASCII "After iPOM" diagram: Process Studio disconnected

The `platform_events` bus splits into only two downward arrows (Intelligence Hub, Operations Interface). Workflow Runtime (Process Studio) has no connection shown. Should receive events from the bus AND be managed by iPOM Studio.

**Fixed in v3**: Yes (see below).

### C2 — platform_events partition pruning vs GDPR retention mismatch

Risk Register says: "pg_cron prune job drops partitions >6 months old."
GDPR section says: `platform_events` retention = **12 months**.

These directly contradict. Pruning at 6 months deletes events that GDPR requires keeping for 12 months.

**Fix**: Change pruning job to drop partitions >12 months old, not >6 months.

### C3 — platform_events DDL creates no partitions

The DDL ends with `PARTITION BY RANGE (created_at)` but creates no partition. A partitioned table with no partitions rejects all inserts immediately on deployment with `ERROR: no partition of relation found for row`.

**Fix**: Add initial partition creation statements to Migration 344 DDL.

### C4 — Tool Registry has no database schema

§2B describes a DB-backed Tool Registry with `analyst_tools` table. The Agent Catalog references tools by slug (e.g. `query_booking_volume_by_subject`). The migration sequence (348) mentions agent tables but no tool registry table. Admin must be able to register tools from the UI — this requires a table.

**Fix**: Add `analyst_tools` table DDL to migration 348.

### C5 — RLS policies not specified for any new table

New tables (`workflow_exceptions`, `growth_scores`, `agent_subscriptions`, `analyst_agents`, `agent_teams`, `platform_events`) have no RLS policies shown. The document says "use `is_admin()` function" but doesn't write the policies.

**Minimum required before Phase 1**:
- `workflow_exceptions`: `is_admin()` for all operations
- `growth_scores`: user can read own row; admin can read all
- `analyst_agents`: admin only
- `platform_events`: service_role only for writes; admin for reads

**Fix**: Add RLS note per table in the schema block. Policies implemented in migrations.

---

## High Priority Issues

### H1 — pg_cron → runtime invocation not specified

Multiple pg_cron jobs fire against the Node.js runtimes (PlatformWorkflowRuntime, analyst agent runners). The mechanism is not described:
- Does cron call an internal HTTP endpoint (e.g. `/api/internal/cron/...`)?
- Is it authenticated? How?
- What happens on cron failure — is it retried? By what?

The existing `process-pending-commissions` and `complete-sessions` cron jobs presumably already have this pattern. New cron jobs should follow the same mechanism. Worth documenting explicitly.

### H2 — Webhook receiver deduplication not explicitly specified

Migration 346 adds a UNIQUE index on `(process_id, target_entity_id) WHERE status IN ('running', 'pending')`. The webhook receiver at `/api/webhooks/process-studio` must check this before starting an execution. If a duplicate webhook fires (Supabase fires webhooks at-least-once), the second would hit the constraint and fail. The document doesn't specify how that failure is handled (silently skip? log to DLQ?).

### H3 — Admin Intelligence Agent vs Lexi admin mode: role separation unclear

Both live in CAS infrastructure. Both respond to admin queries. The document's intent:
- **Lexi admin mode**: Conversational interface. Admin asks a question, Lexi responds with aggregated data using admin-scoped tools.
- **Admin Intelligence Agent** (`cas:admin-intelligence`): Programmatic, scheduled. Generates daily brief, raises exceptions, proposes tier changes. Not conversational.

This is consistent but never stated explicitly. Paragraph in §3D notes "Admin query bar → Lexi admin mode" but doesn't say Lexi does NOT invoke Admin Intelligence Agent internally. Clarifying this prevents confusion during Phase 3 implementation.

### H4 — Workflow versioning: auto-save semantics undefined

§1A says "auto-save every 5 min" alongside `workflow_process_versions` table that snapshots on publish. Are auto-saves draft rows in `workflow_process_versions`? Or just in-memory? The DDL for `workflow_process_versions` doesn't include a `is_draft` flag or similar. If auto-saves create version rows, the table will grow very quickly. If they don't, the term "auto-save" is misleading.

**Recommendation**: Auto-save = in-memory / unsaved state stored in `workflow_processes.nodes/edges` draft column. Publish = creates a versioned snapshot in `workflow_process_versions`. Add `draft_nodes jsonb` and `draft_edges jsonb` columns to `workflow_processes` for unsaved edits.

---

## Medium Priority Issues

### M1 — Lexi admin mode rate limiting: enforcement mechanism not specified

§3D defines limits: max 1 analysis per domain per 15 min, max 10 runs/hour. But enforcement is not specified:
- Database counter? Redis counter? Middleware?
- What happens when limit is hit — 429 response? Queue the request?

### M2 — Growth Agent naming inconsistency

The document uses three names for related concepts:
- "Growth Agent" — historical name for the user-facing standalone product (now deprecated)
- "Growth Advisor Agent" — the Phase 2 analyst agent template (admin + user modes)
- `growth-advisor-admin` — the slug for admin mode in Migration 348

Recommendation: standardise to **Growth Advisor** everywhere. Drop "Growth Agent" after deprecation.

### M3 — Tool Registry: sandboxing and validation policy missing

§2B says tools must be "deterministic for same inputs (no side effects for data_query)" and "platform_action tools require entity_id (audit trail)". But:
- Who validates a new tool before activation? Admin or code review?
- Is there a test harness ("test with sample input" UI exists per task table, but what constitutes passing)?
- Are tools sandboxed during execution?

Tools are the mechanism agents take actions. A malicious or buggy tool registered via UI could cause data corruption. This warrants a clear policy before Phase 2 ships.

### M4 — Cross-tenant isolation for org-scoped agents

If Organisation A creates an analyst agent (e.g. their own Operations Monitor), can Organisation B's admin see it? The document doesn't specify org-scoped agent visibility. `analyst_agents.created_by` is a user FK, not an org FK. RLS policy on `analyst_agents` should gate on `is_admin()` OR `created_by = auth.uid()` depending on whether org admins can create agents.

### M5 — Workflow → Team invocation context mapping

When a workflow invokes a Team via the `cas_agent` handler (extended to accept `team_slug`), how do workflow execution variables map to `AgentTeamState`? The document shows Agent invocation (`output_field` written to execution context). Team invocation is implied to work the same way but not explicitly shown.

---

## Naming Inconsistencies (low priority)

| Term used | Should be | Where |
|-----------|-----------|-------|
| "Growth Agent" | "Growth Advisor" (post-deprecation) | Product vision, §1 What to Remove |
| "Process" (standalone) | "Workflow Process" (canonical DB table name) | Throughout |
| "Analyst Agent" (sometimes) | "Analyst Agent" ← keep this as the type name | Phase 2 |
| "AI Agent Studio" | Not developed in iPOM — belongs to Product 2 description only | §1 intro |
| "Admin Studio" (once) | "iPOM Studio" | Phase 2 once |
| "Autonomy Levels" (§1) | "Autonomy Tiers" (§DB schema, consistent elsewhere) | §1 Product Vision |

---

## Diagram Gaps

The following are shown somewhere in prose but have no diagram:

| Missing diagram | Why it matters |
|----------------|----------------|
| pg_cron → runtime invocation flow | Developers need to know the trigger mechanism |
| Webhook receiver → dedup → execution start | Idempotency is critical for production webhooks |
| Redis invalidation strategy | Cache freshness is a reliability concern |
| DLQ retry flow (pipeline_jobs failed state) | Error handling for knowledge pipelines |
| Admin Intelligence Agent error mode | What happens if the daily brief agent crashes? |

---

## Architecture Strengths

- **Four-tier autonomy model** is the right abstraction. Autonomous/Supervised/Exception Queue/Strategic maps cleanly to risk × confidence axes.
- **Learning loop** (D19) is architecturally sound: outcomes measured at 14/30/60/90 day lags, expansion proposals require approval, contraction is automatic. Conservative and safe.
- **PlatformUserContext** (D18) elegantly solves the cross-agent context problem without requiring agents to make redundant tool calls at session start.
- **AI tier routing** (D20) is correct: rules → Gemini Flash → Claude Sonnet → Grok 4 Fast. Rules-based threshold checks at zero cost for the majority of operational decisions.
- **CAS Team as a first-class iPOM entity** (D14) is clean — exposes existing CAS agents without rewriting them, just surfaces them in the registry and makes them configurable from UI.
- **Bridge files pattern** (growth-bridge.ts, process-studio-bridge.ts) publishing to `platform_events` is the right decoupling mechanism — avoids direct cross-system calls.

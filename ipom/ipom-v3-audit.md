# iPOM v3.2 — Audit Report
**Audited**: `ipom/ipom-solution-design-v3.md`
**Fuschia reference**: https://github.com/fuschiaapp123/fuschia (verified component structure)
**Date**: 2026-03-06
**Auditor**: Claude Code
**Status**: For review before implementation begins

---

## Executive Summary

The v3 architecture is **strategically sound**. The consolidation vision — one unified Process Studio canvas for all workflows, agents, and monitoring — is correct and well-specified. The Fuschia comparison is accurate. The four-tier autonomy model, learning loop, and Phase dependency chain are all solid.

**However, there are 4 critical errors that will block implementation if not fixed before Phase 1 begins:**
1. Migration numbering is stale and collides with the companion GDPR and Growth Score docs
2. `sar_requests` FK design in the complete schema block regresses the G4 audit fix
3. Section 2G duplicated (numbering error)
4. The Growth Agent code is described as "0% built" when it's substantially built

**Phase 3 estimate in the section header is off by ~60h.** Everything else is medium or low priority.

---

## Critical Issues

### C1 — Migration numbering stale + conflicts with companion docs

**Where**: §"Current Migration Sequence" (line ~2258), schema block labels throughout, §1B-i, §Build Sequence

**Problem**: The v3 doc states "Latest applied: **342**. Next: 343..." This is stale. Migration 343 is **already applied** in the codebase (two files: `343_create_growth_pro_subscriptions.sql` and `343_create_process_studio_webhook_triggers.sql`).

This creates a cascade of conflicts:

| v3 assigns to 343 | Reality |
|-------------------|---------|
| Platform events, DLQ retry cron, dedup index, legal_hold | **Can't — 343 is taken** |

**Additional conflict with companion docs** (which were corrected to the right numbers):

| Migration | v3 assigns | Companion doc assigns |
|-----------|-----------|----------------------|
| 344 | growth_scores (role_type) | **GDPR retention columns + platform_events + legal_hold** (`ipom-gdpr-retention-policy.md` v1.1) |
| 345 | workflow_process_versions | **Growth Score role_type** (`ipom-growth-score-all-roles.md` v1.1) |
| 348 | sar_requests | Already covered in GDPR companion (migration 344) |

**Required fix** — renumber the v3 migration sequence to match the companion docs:

```
CORRECT sequence (companion docs already published):
344 — GDPR: platform_events (partitioned), legal_hold on profiles, sar_requests, archived_at columns
345 — Growth Score: role_type + component_scores on growth_scores table
346 — Phase 1 production fixes: dedup index, DLQ retry cron, workflow_entity_cooldowns, fallback polling
347 — Phase 1 versioning: workflow_process_versions, workflow_processes.version/published_at
348 — Phase 2 agents: analyst_agents, agent_run_outputs, agent_templates, agent_subscriptions
349 — Phase 3 intelligence: growth_knowledge_chunks, platform_ai_costs
350 — Phase 4 learning: platform_knowledge_chunks, decision_outcomes, process_autonomy_config
```

Update the "Latest applied" line to: **343. Next: 344.**

Update all labels in the complete schema block and the §Build Sequence diagram.

---

### C2 — `sar_requests` FK regression in complete schema block

**Where**: §"Complete Database Schema" → "Migration 348 (Phase 4): Learning layer + GDPR"

**Problem**: The schema block has:

```sql
CREATE TABLE sar_requests (
  ...
  profile_id uuid NOT NULL REFERENCES profiles(id),  -- ← BREAKS on account deletion
```

The G4 audit finding (which was fixed in v2.2 and the GDPR companion doc v1.1) requires a **deletion-safe design**:

```sql
CREATE TABLE sar_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id_hash text,    -- sha256(profile_id || salt) — survives deletion
  profile_id_raw uuid,     -- NULL after account deletion/pseudonymisation
  requested_at timestamptz DEFAULT NOW(),
  responded_at timestamptz,
  response_method text,
  data_exported_at timestamptz,
  notes text
);
```

GDPR compliance records must outlive the account. A hard FK breaks the SAR log when the account is deleted, making it impossible to audit that the SAR was fulfilled. This is a regulatory risk.

**Required fix**: Replace the sar_requests DDL in the complete schema block with the hash-based design from `ipom-gdpr-retention-policy.md` v1.1.

---

### C3 — Section 2G duplicated

**Where**: Phase 2, two distinct sections both labelled `### 2G`

- First `2G` (§1027): "Agent Deployment Flow (diagram)" — 5-step lifecycle diagram with pg_cron
- Second `2G` (§1069): "Unified Agent Infrastructure (10h)" — agent_subscriptions, parameterised routes

These are two different tasks. The second should be `### 2H`.

**Required fix**: Renumber the Unified Agent Infrastructure section to `### 2H`. Update the Phase 2 estimate total if needed (currently the 96h total is correct regardless of lettering).

---

### C4 — Growth Agent described as "0% built" — incorrect, code exists

**Where**: §"Fuschia Comparison" and §"What to REMOVE / REDESIGN → Remove" table

**Problem**: The doc states:

> "Standalone Growth Agent architecture (approved but 0% built) — Cancel"

This is **factually wrong**. The Growth Agent is substantially built:
- `apps/web/src/lib/growth-agent/` — full directory exists
- `GrowthAgentOrchestrator` with `buildSystemPrompt()`, `stream()`, `runRevenueAudit()`
- 5 skill files (profile-listing-audit, referral-strategy, revenue-intelligence, income-stream-discovery, business-setup-compliance)
- Tools layer (8 tools: definitions, executor, types)
- API routes live: `GET/POST /api/growth-agent/session`, `POST /api/growth-agent/stream`, `GET /api/growth-agent/audit`

Treating it as 0% built means the Phase 2 plan doesn't account for:
1. What gets **migrated** (skill files → Growth Advisor agent knowledge base)
2. What gets **deleted** (GrowthAgentOrchestrator, standalone API routes — after migration period)
3. The **migration period**: existing `/api/growth-agent/` routes need deprecation warnings before removal, not immediate deletion

**Required fix**: Update the "What to Remove" table:

| Item | Correction |
|------|------------|
| ~~"Standalone Growth Agent architecture (approved but 0% built)"~~ | **"Growth Agent standalone code (substantially built) — migrate then remove"** |

Add a Growth Agent migration task to Phase 2 task table (~6h):
- Convert 5 skill files into Growth Advisor agent knowledge chunks in `agent_templates`
- Deprecate `GET/POST /api/growth-agent/session` → redirect to `/api/agents/growth/session`
- Deprecate `POST /api/growth-agent/stream` → redirect to `/api/agents/growth/stream`
- Keep `/api/growth-agent/audit` working until audit endpoint is exposed under the new route pattern
- Delete `apps/web/src/lib/growth-agent/` after unified agent API routes are verified

---

## High Priority Issues

### H1 — Phase 3 estimate in section header is ~60h off

**Where**: Phase 3 section header: "**Estimate: 35–45h**"

**Problem**: The detailed Phase 3 task table totals **100h**. The Phase dependency map at the bottom of the doc also shows "Phase 3 (~100h)". The total estimates table shows "65–80h" for Phase 3. Three different numbers for the same phase.

| Source | Phase 3 estimate |
|--------|----------------|
| Section header | 35–45h ← wrong |
| Total estimates table | 65–80h |
| Detailed task table | 100h |
| Phase dependency map | ~100h |

The 35–45h was likely the estimate before the Admin Intelligence Agent (15h), Real-Time Monitoring WebSocket (8h), Analytics Dashboard (10h), and Platform Console (7h) were added.

**Required fix**: Update section header to match the detailed table. Recommend: **"Estimate: 90–110h"** (detailed table = 100h, with ±10h tolerance).

---

### H2 — `agent_templates` table DDL missing from schema block

**Where**: §2D "Agent Templates (5h)" and migration sequence note "346 — analyst_agents, agent_run_outputs, agent_templates tables"

**Problem**: §2D specifies `agent_templates` table ("Pre-built agent organization configurations stored in `agent_templates` table"). The migration sequence mentions it. But the complete schema block under migration 346 only creates:
- `analyst_agents`
- `agent_run_outputs`
- `agent_subscriptions`

`agent_templates` DDL is missing entirely.

**Required fix**: Add to the complete schema block under migration 348 (re-numbered):

```sql
CREATE TABLE agent_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text,            -- 'operations' | 'finance' | 'growth' | 'full-stack'
  agents_config jsonb NOT NULL,  -- Array of AnalystAgentConfig
  tags text[],
  is_system boolean DEFAULT false,  -- system templates are protected from deletion
  created_at timestamptz DEFAULT now()
);
```

---

### H3 — `profiles.legal_hold` missing from v3 schema block

**Where**: §"Complete Database Schema" → GDPR additions

**Problem**: The v3 schema block adds `legal_hold` only to `workflow_executions`:

```sql
ALTER TABLE workflow_executions
  ADD COLUMN decision_rationale jsonb,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN legal_hold boolean DEFAULT false;
```

But the GDPR companion doc (v1.1) adds `legal_hold` to `profiles`:

```sql
ALTER TABLE profiles ADD COLUMN legal_hold boolean DEFAULT false;
CREATE INDEX idx_profiles_legal_hold ON profiles(legal_hold) WHERE legal_hold = true;
```

The `profiles.legal_hold` column is the primary GDPR safeguard — it prevents the right-to-erasure flow from deleting a user under active fraud investigation. Without it, the erasure endpoint has no gate.

**Required fix**: Add to the v3 schema block (GDPR additions, migration 344):

```sql
ALTER TABLE profiles ADD COLUMN legal_hold boolean DEFAULT false;
CREATE INDEX idx_profiles_legal_hold ON profiles(legal_hold) WHERE legal_hold = true;
```

---

### H4 — D22 (Growth Agent mode separation) not explicitly listed in v3 design decisions

**Where**: Throughout Phase 2 agent infrastructure sections

**Problem**: D22 was added in v2.2 as a formal design decision:
> "Single GrowthAgentOrchestrator with mode: 'user' | 'admin' parameter. User mode: scoped to profile_id, rate-limited. Admin mode: service_role credentials, no rate cap, different system prompt, entry at /admin/intelligence/growth/"

v3 incorporates the spirit (Growth Advisor appears in Agent Registry, admin mode entry point implied) but doesn't have a numbered decision table. The `AGENT_RATE_LIMITS` in §2G mentions `'growth-admin'` which is consistent — but there's no explicit treatment of the existing user-facing Growth session API vs the new admin mode.

**Required fix**: The §2H (unified agent infrastructure, re-numbered from 2G) should note:
- User-facing Growth sessions continue via `/api/agents/growth/session` (parameterised route, mode='user')
- Admin mode Growth Advisor chat is at `/admin/process-studio/agents/growth-advisor-admin` (mode='admin')
- Same `GrowthAgentOrchestrator` with mode parameter — D22 is preserved, not abandoned

---

## Medium Priority Issues

### M1 — `platform_events` partitioning incomplete

**Where**: Complete schema block — `platform_events` DDL

**Problem**: The DDL creates the partitioned table but doesn't create any partitions:

```sql
CREATE TABLE platform_events (
  ...
) PARTITION BY RANGE (created_at);
-- ← No partition creation statements
```

A partitioned table with no partitions will **reject all inserts** with: `ERROR: no partition of relation "platform_events" found for row`. Inserts fail immediately on deployment.

**Required fix**: Add partition creation and pg_cron partition maintenance to migration 344:

```sql
-- Create initial monthly partitions
CREATE TABLE platform_events_2026_03 PARTITION OF platform_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE platform_events_2026_04 PARTITION OF platform_events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
-- etc. for next 3 months

-- pg_cron job to create next month's partition monthly
SELECT cron.schedule(
  'create-platform-events-partition',
  '0 0 25 * *',  -- 25th of each month, create next month's partition
  $$
    SELECT create_next_month_partition('platform_events');
  $$
);

-- pg_cron job to drop partitions older than 6 months
SELECT cron.schedule(
  'prune-platform-events-partitions',
  '0 2 1 * *',
  $$
    SELECT drop_old_partitions('platform_events', 6);
  $$
);
```

The helper functions `create_next_month_partition` and `drop_old_partitions` should be created in the same migration or a utility migration.

---

### M2 — Fuschia Agent Designer assessment should note CAS foundation

**Where**: Fuschia Comparison table

**Current**: "Agent Designer: **0%** — CAS is code-only, no visual designer"

**Fuschia actual components** (verified from GitHub):
- `frontend/src/components/agents/AgentDesigner.tsx` — main agent design interface (visual canvas for agent org design)
- `frontend/src/components/agents/AgentPropertyForm.tsx` — agent configuration form
- `frontend/src/components/agents/AgentTemplates.tsx` — template gallery
- `frontend/src/components/agents/ToolsSelector.tsx` — tool selection UI

Tutorwise has:
- `CAS WorkflowVisualizer` (ReactFlow-based agent pipeline visualization — already live)
- `cas/agents/` — 9 agents with full configuration
- `cas_agent_status`, `cas_agent_config` tables

The 0% assessment is correct for the **admin-facing UI to design arbitrary analyst agents** (no form, no palette, no AgentPropertyForm equivalent). But calling it 0% undersells the existing ReactFlow agent visualization and CAS infrastructure that Phase 2 builds on.

**Suggested update**:

| Fuschia Module | Tutorwise Status | Verdict |
|---|---|---|
| Agent Designer | **15%** — CAS WorkflowVisualizer provides ReactFlow agent visualization foundation; no general-purpose agent creation UI | Build Phase 2 on top of existing CAS canvas |

---

### M3 — Fuschia `DSPyEvaluationPanel` is inside `workflow/` (not a separate module)

**Where**: §Roadmap → "DSPy Evaluation Panel"

**Observation**: v3 correctly defers DSPy to the Roadmap. However, it's worth noting that Fuschia places `DSPyEvaluationPanel.tsx` inside `frontend/src/components/workflow/` — it's not a standalone module but embedded in the workflow designer itself. Similarly, `MCPToolNode.tsx` is in `workflow/`.

This means Fuschia's architecture treats DSPy evaluation as a per-node feature of the workflow designer, not a separate product. When Tutorwise eventually adds DSPy (Roadmap), the integration point should be the Process Studio canvas node context menu (right-click an AI decision node → "Evaluate prompt") — not a separate admin page.

No action required now, but note this for when DSPy is prioritised.

---

### M4 — Redis infrastructure dependency not declared

**Where**: §4C PlatformUserContext, §3D Admin Intelligence (admin query caching)

**Problem**: Multiple Phase 3/4 features require Redis:
- PlatformUserContext: 5-minute Redis cache per user
- Admin query caching: 1h TTL, key = intent hash + date bucket

The project currently uses Supabase only. There is no Redis instance. v3 doesn't note this as an infrastructure dependency.

**Required fix**: Add to Phase 3 task table (or Phase 1 if Redis is also needed for rate limiting):

| Task | Hours | Notes |
|------|-------|-------|
| Redis infrastructure setup (Upstash or Railway) | 2 | Upstash recommended — serverless Redis, no cold start, generous free tier. Add `REDIS_URL` to `.env.local`. |

Also add to Risk Register: "Redis not provisioned — all Phase 3+ caching features blocked. Mitigation: Upstash free tier sufficient for Phase 3 volumes."

---

### M5 — Phase 1 has two separate task tables with different items

**Where**: §1A sub-table (lines ~409–416) and §"Detailed Phase 1 Task Table" at bottom of doc

**Problem**: There are two Phase 1 task tables:
- The inline §1A table (46h subtotal for designer tasks only)
- The comprehensive bottom table (84h total for all Phase 1 tasks)

The bottom table is the authoritative one, but the inline §1A table subtotal (46h) is missing some tasks from the bottom table. This isn't a conflict but it's confusing — the inline table should either be removed or clearly labelled as "1A designer tasks only."

**Required fix**: Add label to inline §1A task table: **"Designer sub-tasks (1A only) — 46h"** to distinguish from the comprehensive Phase 1 total.

---

### M6 — `agent_subscriptions` should be a separate migration from `analyst_agents`

**Where**: §2G (2H after renumber) and complete schema block

**Problem**: The zero-downtime `agent_subscriptions` migration (replace `sage_pro_subscriptions`) requires:
1. Create `agent_subscriptions` with triggers mirroring `sage_pro_subscriptions` writes
2. Run in parallel for 24h
3. Verify parity
4. Switch reads
5. Drop `sage_pro_subscriptions`

This 5-step process requires multiple deployments. Combining it with `analyst_agents` creation in migration 348 means the migration runs in one atomic transaction but the cutover requires manual steps over 24h.

**Required fix**: Split into separate migrations:
- Migration 348: `analyst_agents`, `agent_run_outputs`, `agent_templates`
- Migration 349: `agent_subscriptions` + mirror triggers (deployed separately, with verification period)

---

## Low Priority / Cosmetic

### L1 — Phase 2 section header estimate inconsistency

Section header says "60–75h". Detailed task table totals 96h. Total estimates table says "70–90h". All three conflict.

**Fix**: Update section header to "85–100h" to align with the detailed table and give the total estimates table a defensible basis.

---

### L2 — Phase 4 section header estimate inconsistency

Section header says "50–60h". Detailed task table totals 67h. Total estimates table says "50–60h".

**Fix**: Update section header to "60–70h". The 67h detailed total is more reliable.

---

### L3 — Phase dependency map shows Phase 1 (~84h) but Phase 1 summary header not updated

The Phase dependency map correctly shows "Phase 1 (~84h)". The Phase 1 section header says "50–65h". The detailed task table totals 84h. The total estimates table says "55–70h".

**Fix**: Update Phase 1 section header to "80–90h".

---

### L4 — `workflow_exceptions` claimed_by lock wording vs implementation

§1C describes a 15-minute "soft lock" for exception claims but the `workflow_exceptions` table schema only has `claimed_by` and `claimed_at` — no `claimed_expires_at` column. The 15-minute window needs to be enforced either by:
- Adding `claimed_expires_at timestamptz` column, or
- Computing `claimed_at + INTERVAL '15 minutes'` in queries

**Fix**: Add `claimed_expires_at timestamptz GENERATED ALWAYS AS (claimed_at + INTERVAL '15 minutes') STORED` to the `workflow_exceptions` DDL.

---

## Fuschia Comparison Accuracy Assessment

Verified against actual Fuschia GitHub component structure:

| v3 Claim | Verified? | Notes |
|----------|-----------|-------|
| Workflow Designer 85% (missing node palette, edge labels, versioning) | ✅ Accurate | Fuschia WorkflowDesigner.tsx + NodePropertyForm.tsx + EdgePropertyForm.tsx + WorkflowTemplates.tsx confirm the feature set |
| Agent Designer 0% | ⚠️ Slightly undersells | See M2. 15% more accurate given CAS ReactFlow foundation |
| Process Mining 70% ahead | ✅ Accurate | Fuschia ProcessMining module is described as placeholder in their docs |
| DSPy deferral to Roadmap | ✅ Correct call | Fuschia DSPyEvaluationPanel is in workflow/ — implementation note useful (see M3) |
| MCP deferral to Roadmap | ✅ Correct call | Fuschia MCPToolNode.tsx in workflow/ dir; Fuschia mcp/ component dir exists |
| Graphiti deferral to Roadmap | ✅ Correct call | Neo4j + Redis in Fuschia docker-compose; significant infrastructure cost |
| Workflow Execution 95% ahead | ✅ Accurate | Fuschia uses flat YAML; Tutorwise has LangGraph + PostgreSQL checkpointing |

---

## Architectural Validation — Consolidation Purpose

The user's stated goal — **"consolidate the work we have done on the admin dashboard pages and the AI technology / agents into one operation management capability and one architecture"** — is well served by v3. Specific validations:

| Consolidation goal | v3 coverage | Status |
|---|---|---|
| All agents from one UI | Agent Registry Panel (analyst + CAS + custom) | ✅ Well specified |
| Workflow + agent design on one canvas | 8-node-type Process Studio canvas | ✅ Well specified |
| Kill 3 separate dashboards (/admin/cas + 2 process-studio views) | §1C Unified Monitoring — remove /admin/cas, merge tabs | ✅ Well specified |
| Parameterised agent routes (no new routes per agent) | `/api/agents/[agentType]/` replacing per-agent routes | ✅ Well specified |
| Unified subscriptions | `agent_subscriptions` replacing `sage_pro_subscriptions` | ✅ Well specified |
| Admin sidebar autonomy-first | Before/After nav reframe in §1C | ✅ Well specified |
| Growth Agent dissolved into Agent Studio | Growth Advisor as one analyst template | ✅ Direction correct but code migration not planned (see C4) |
| CAS WorkflowVisualizer merged into Process Studio | §1A — canvas tab merge | ✅ Well specified |

---

## Summary of Required Changes

### Must fix before Phase 1 begins

| ID | Fix | Effort |
|----|-----|--------|
| C1 | Update "Latest applied: 342" → 343. Renumber entire migration sequence to align with companion docs | 30 min |
| C2 | Replace `sar_requests` DDL in schema block with hash-based design | 15 min |
| C3 | Rename second `### 2G` to `### 2H` | 5 min |
| C4 | Update "Growth Agent 0% built" → "substantially built, migrate then remove". Add migration task to Phase 2 | 30 min |
| H1 | Update Phase 3 header estimate: 35–45h → 90–110h | 5 min |
| H2 | Add `agent_templates` DDL to schema block | 15 min |
| H3 | Add `profiles.legal_hold` to GDPR schema additions in v3 | 10 min |
| M1 | Add platform_events partition creation statements + pg_cron maintenance jobs | 20 min |

### Good to fix before Phase 2

| ID | Fix | Effort |
|----|-----|--------|
| H4 | Note D22 preservation in §2H unified infrastructure | 10 min |
| M4 | Add Redis infrastructure setup task to Phase 3 + Risk Register entry | 15 min |
| M6 | Split agent_subscriptions into separate migration | 10 min |
| L1-L3 | Align phase header estimates with detailed task totals | 15 min |
| L4 | Add `claimed_expires_at` to workflow_exceptions DDL | 5 min |

### Informational only

| ID | Note |
|----|------|
| M2 | Fuschia Agent Designer assessment: update to 15% |
| M3 | DSPy/MCP are workflow-embedded in Fuschia, not standalone modules |
| M5 | Label the inline §1A task table as sub-table only |

---

*Total time to apply all critical + high fixes: ~2h*

# iPOM v2.1 Audit + Fuschia Comparison
**Date**: 2026-03-06
**Scope**: (1) Internal audit of ipom-solution-design-v2.md + companion docs, (2) Architectural comparison with Fuschia intelligent automation platform

---

## Part 1 — iPOM v2.1 Internal Audit

### Overall Assessment

**v2.1 is a strong upgrade from v2.0.** The two companion documents (GDPR retention policy, Growth Score all roles) are well-researched, correct, and resolving two previously blocked open questions. The GDPR doc in particular is production-grade — it cites the right legislation (UK GDPR Article 22, DUAA 2025, CJEU Feb 2025 ruling on explainability), identifies which iPOM processes trigger Article 22, and provides a concrete SAR query design.

One factual error requires immediate correction before any migrations are written.

---

### Critical Error: Migration Number Conflicts

**Both companion documents use migration numbers that already exist in the codebase.**

Per `tools/database/migrations/` (confirmed by MEMORY.md): latest migration is **342**, next is **343**.

| Document | Migration Cited | Status |
|----------|----------------|--------|
| `ipom-gdpr-retention-policy.md` §8 | Migration **340** | ❌ Already exists |
| `ipom-growth-score-all-roles.md` §6.1 | Migration **341** | ❌ Already exists |

**Correct numbers**: GDPR retention columns → migration **343**. Growth Score `role_type` column → migration **344**.

These must be corrected in both documents before either migration is written — running migration 340 or 341 when those numbers are already taken will fail or silently corrupt the migration history.

---

### GDPR Retention Policy — Audit

**Strengths:**
- Article 22 applicability table is correctly reasoned. Tutor Approval and Commission Payout correctly identified as Article 22-applicable. Proactive nudges correctly excluded (informational, no binding effect).
- DUAA 2025 awareness is current and correct — the safeguards-based model replaces the near-blanket prohibition, but the practical obligations are the same.
- 3-year retention for `workflow_executions` is the right call (balances Article 22 obligations against data minimisation better than the full 6-year UK Limitation Act period).
- Pseudonymisation strategy on account deletion is correct (hash `profile_id || salt` — not erasure, which can't be applied to Article 22 records needed for audit).
- The CJEU Feb 2025 ruling citation on explainability requirements is correct and important.

**Gaps:**

**Gap G1: Growth Score Article 22 status is borderline but unresolved**
The document flags `growth_scores` as "BORDERLINE — if used to gate visibility/features → YES". But iPOM v2.1 §10 explicitly uses Growth Score to gate CaaS featured placement (score < 70 = below featured threshold). This crosses into Article 22 territory. The policy document should resolve this as YES for Growth Score gating decisions, not leave it as borderline. Required action: add Growth Score threshold decisions to the Article 22-applicable process list, with rationale logged in `workflow_executions.decision_rationale` when a gating decision is made.

**Gap G2: SAR endpoints are in Phase 3 but compliance obligation starts at Phase 1**
The Phase 1 checklist includes schema changes (`archived_at`, `pseudonymised_at` columns). But the SAR endpoint (`GET /api/account/automated-decisions`) is deferred to Phase 3. The Tutor Approval workflow goes live in Phase 1 with the autonomous tier. The moment an Article 22 decision is made, the right to obtain a human review and the right to contest must be exercisable. Deferring the SAR endpoint to Phase 3 means there is a Phase 1–2 window where Article 22 rights exist but the mechanism to exercise them does not.

**Minimum viable fix**: A simple support email link ("to request human review of this decision, contact support@tutorwise.com") added to the tutor approval notification in Phase 1. The full UI (Account Settings > Privacy > My Automated Decisions) can wait for Phase 3. But the right must be advertised from the moment the autonomous tier is live.

**Gap G3: Legal hold field not in the schema checklist**
§5.2 describes `legal_hold = true` on profiles to prevent erasure for fraud investigations. But this column isn't in the Migration 340 (now 343) checklist or the schema additions. Add `ALTER TABLE profiles ADD COLUMN legal_hold boolean DEFAULT false` to the migration.

**Gap G4: `sar_requests` table is a good addition but needs a foreign key**
The proposed `sar_requests` table has `profile_id uuid REFERENCES profiles(id)`. If the profile is deleted (account erasure), this FK will fail — or requires cascading behaviour. Since SAR records are compliance obligations that survive account deletion, the FK should either be nullable or reference a different anchor (the pseudonymised hash). This needs a design decision before migration 343 is written.

---

### Growth Score All Roles — Audit

**Strengths:**
- RFM weighting principle is correctly applied to all four roles.
- Organisation score using `AVG(member tutor scores) × 0.25` for `team_health` is elegant — it reuses computed values rather than re-running the tutor formula.
- Shadow mode for 30 days before acting on non-tutor scores is the right calibration approach.
- `component_scores jsonb` column enables the Growth Agent to explain which component is dragging the score down — excellent for personalised recommendations.
- Single pg_cron job with role-specific CTE branches is the right implementation pattern (one job, not four).

**Gaps:**

**Gap G5: Organisation score uses `connection_groups.owner_id` — what about multi-admin orgs?**
The Growth Score for organisations is computed against `cg.owner_id`. But if an organisation has multiple admins (a co-owner arrangement), only the primary owner gets a score. The Growth Agent reading org scores only sees the owner's record, missing orgs where the admin is not the owner. This should query `connection_groups` joined to org admin members, not just `owner_id`.

**Gap G6: Agent score assumes `network_size` = managed tutors with bookings in 30d**
The agent formula's `network_size` component counts "active tutors managed (booking in last 30d)". But a new agent who has 5 recruited tutors with no bookings yet scores 0 on this component — even though they've done significant platform work. The 30-day booking requirement penalises new agent networks disproportionately. Consider a two-track measurement: `tutors_linked` (all time) for baseline, `tutors_active_30d` for the higher-threshold stacked bonus.

**Gap G7: No monitoring of shadow mode outputs**
§7.3 says non-tutor scores run in shadow mode for 30 days before Growth Agent acts on them. But who reviews the shadow outputs? The Admin Intelligence Agent should include a "shadow score validation" task in its weekly briefing during Phase 2: "Client Growth Scores have been running for 14 days. Score distribution: 22% below 30 (churn risk), 45% between 30–55 (casual). Do thresholds look correct? [Approve to activate / Adjust thresholds]."

**Gap G8: Tutor score validation plan is incomplete**
§7.2 says "validate: do high-scoring tutors have more bookings? (expected: yes, strong correlation)." But the validation method is not specified — by whom, using what query, and what's the pass/fail criterion? Before Phase 1 ships, write the specific validation query and the acceptance threshold (e.g., "Pearson correlation between Growth Score and bookings_last_30d must be > 0.6").

---

## Part 2 — iPOM vs Fuschia Architectural Comparison

### What Is Fuschia?

Fuschia is a **general-purpose enterprise intelligent automation platform** — a horizontal product designed for any large organisation. It combines visual process design, Neo4j knowledge graphs, and multi-agent LangGraph orchestration to automate cross-functional business processes.

iPOM is a **domain-specific platform operations layer** — a vertical product built for Tutorwise's specific operational domain. This distinction matters throughout the comparison.

---

### Side-by-Side Architecture

| Dimension | Fuschia | iPOM v2.1 | Assessment |
|-----------|---------|-----------|-----------|
| **Workflow design** | Visual ReactFlow drag-and-drop canvas, template library, version control UI | Definitions as code (git), visual viewer only, no editor | ❌ iPOM gap |
| **Knowledge management** | Neo4j knowledge graph, entity relationships, graph traversal | pgvector embeddings + RAG, flat chunks | ⚠️ iPOM adequate for RAG; weak for graph queries |
| **Agent orchestration** | Multi-agent LangGraph, capability config, performance monitoring | LangGraph for workflow execution only; no general agent orchestration | ⚠️ Different scope |
| **Autonomy model** | Automates + escalates; no explicit tier framework | Four-level Autonomous/Supervised/Exception/Strategic | ✅ iPOM ahead |
| **Self-improving** | "Workflows that learn" (mentioned, not designed) | Concrete `decision_outcomes` → accuracy tracking → calibration loop | ✅ iPOM ahead |
| **Cross-agent context** | Integration connectors; no cross-agent session context | `PlatformUserContext` shared across all agents | ✅ iPOM ahead |
| **Exception queue** | Escalation mentioned; no AI confidence scoring or ownership model | Confidence score + evidence count + `claimed_by` ownership | ✅ iPOM ahead |
| **GDPR compliance** | Mentioned as a requirement; not designed | Full policy: Article 22, SAR handler, erasure protocol, ROPA | ✅ iPOM ahead |
| **Cost tracking** | Not mentioned | `platform_ai_costs` table, tier routing, cost dashboard | ✅ iPOM ahead |
| **Enterprise integrations** | ServiceNow, Salesforce, SAP, Workday connectors | Stripe, Supabase (Tutorwise-specific) | N/A — different target |
| **Real-time monitoring** | WebSocket, Prometheus, performance analytics | Supabase Realtime, Platform Console (to be built) | ⚠️ Comparable |
| **Deployment** | Docker/Docker Compose, containerized | Next.js + Supabase (managed) | N/A — different target |
| **Multi-tenancy** | Multi-tenant SaaS | Single-tenant (Tutorwise platform) | N/A |
| **Workflow version control** | Explicit version management + rollback UI | Git (implicit), no rollback UI | ⚠️ iPOM gap |
| **Template library** | Pre-built process templates | One master template, no library | ⚠️ iPOM gap |
| **Agent performance metrics** | Capability config, performance tracking, learning parameters | AI cost tracking only; no agent accuracy/latency metrics | ❌ iPOM gap |

---

### Where Fuschia Is Ahead — What iPOM Should Adopt

#### 1. Visual Workflow Designer

This is the largest gap between iPOM and Fuschia.

**Current iPOM state**: Process Studio shows a visual canvas for reading workflow definitions. Building or editing a workflow requires a code change, a PR, and a deployment. D11 deferred the visual editor to "a future Product 3 version."

**Fuschia's approach**: ReactFlow-based drag-and-drop canvas where non-technical admins can build workflows by connecting node types. Template library provides starting points. Version control tracks changes. No deployment required.

**Why this matters for iPOM specifically**: The four-level autonomy model's value is in its configurability. As the platform matures, admins will want to build new supervised sequences (new org dormancy variant, new referral nudge), adjust workflow thresholds, and add new node types. Requiring a code deployment for every workflow change defeats the operational autonomy goal.

**Recommendation**: Phase 5 addition — ReactFlow-based visual workflow editor for Process Studio. This is not trivial (4–6 weeks) but is the natural evolution of the autonomy model. The workflow `nodes`/`edges` data structure is already stored in JSON — it is already displayable in ReactFlow. Adding drag-to-create is the incremental step.

**Immediate action**: Add a `workflow_version` column to `workflow_processes` now (Phase 1), even before the editor exists. Incrementing this on every code-deployed update ensures the version history is tracked from day one.

#### 2. Graph Database for Network Intelligence

**Current iPOM state**: The Network Intelligence page (`/admin/network/`) plans to compute referral graph depth, viral coefficient, and network centrality using PostgreSQL CTEs.

**Fuschia's approach**: Neo4j natively stores data as nodes and relationships. Referral graph traversal, depth analysis, and centrality queries are native graph operations — fast and expressive at any depth.

**Why this matters**: The referral network queries iPOM needs are fundamentally graph problems:
```
-- What iPOM needs to answer:
"Which users are 3 hops from a top referrer?"
"What is the viral coefficient of the referral network?"
"Find the shortest path between two tutors in the network"
"Which nodes have the highest betweenness centrality?"
```

In PostgreSQL, recursive CTE depth queries (`WITH RECURSIVE referral_tree AS (...)`) work up to depth 3–4 with reasonable performance. Beyond that, they degrade rapidly. At scale (10,000+ referrals with 3–4 hops), the CTE approach becomes unmaintainable.

**Recommendation**: Do not replace the Supabase PostgreSQL database. Add a **dedicated Neo4j instance specifically for the network graph** — a dual-write pattern where `referrals` table writes also publish to Neo4j. The Network Intelligence page queries Neo4j directly. Everything else stays in Supabase.

This is a Phase 4 consideration (Network Intelligence is Phase 4). Phase 4 task estimate for Neo4j integration: 15–20h. Without it, the network intelligence page will require complex CTE optimisation that becomes a maintenance burden.

**Minimal alternative**: If Neo4j is out of scope, use PostgreSQL's `ltree` or `pgRouting` extension for graph queries. Not as powerful as Neo4j but significantly better than recursive CTEs.

#### 3. Agent Performance Metrics

**Current iPOM state**: `platform_ai_costs` tracks token usage and estimated cost. There is no per-agent accuracy, latency, tool call success rate, or knowledge retrieval precision tracking.

**Fuschia's approach**: Dedicated agent performance monitoring — capability tracking, learning parameter configuration, performance analytics dashboard.

**Why this matters**: iPOM's learning loop (`decision_outcomes` → accuracy calibration) tracks whether autonomous decisions were correct but doesn't track why. If the Admin Intelligence Agent's accuracy drops, is it because the model quality degraded, because the retrieval quality dropped, or because the signal data quality changed? Without per-agent metrics, the feedback loop has no diagnosis capability.

**What to add** (can slot into Phase 3 alongside Admin Intelligence Agent build):
```typescript
// New table: agent_performance_metrics
CREATE TABLE agent_performance_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_type text NOT NULL,          -- 'admin-intelligence' | 'lexi' | 'growth' | 'sage'
  operation_type text NOT NULL,      -- 'query' | 'anomaly' | 'recommendation' | 'stream'
  latency_ms integer,
  tool_calls_made integer,
  tool_calls_succeeded integer,
  knowledge_chunks_retrieved integer,
  knowledge_relevance_score numeric,  -- avg cosine similarity of retrieved chunks
  user_feedback integer,              -- +1 thumbs up / -1 thumbs down / 0 no feedback
  created_at timestamptz DEFAULT now()
);
```

Platform Console gains an "Agent Performance" tab showing accuracy trends, latency percentiles, and tool reliability per agent. This closes the loop: the learning layer knows *that* decisions are wrong; agent performance metrics reveal *why*.

#### 4. Workflow Template Library

**Fuschia's approach**: Pre-built templates that admins can clone and customise. Accelerates time-to-value for new process types.

**Current iPOM state**: A single master template is seeded. There is no library concept.

**What to add**: A `workflow_templates` table (separate from `workflow_processes`) containing platform-provided starting points that admins can fork into live processes. This is a Phase 3 addition (alongside the Command Center) — when admins start building new workflows, they need starting points.

Template candidates already described in the iPOM design: Organisation Onboarding, Stuck Referral Recovery, Org Dormancy Re-engagement, Listing Quality Intervention. These should be templates first, then activated as live processes when ready.

---

### Where iPOM Is Ahead — What Fuschia Should Learn From

These iPOM design decisions are superior to what Fuschia has described and represent genuine architectural advances:

#### 1. Learning loop with concrete mechanism
Fuschia says "workflows that learn and evolve" but has no concrete mechanism. iPOM's `decision_outcomes` table + accuracy tracking + dynamic tier calibration is a specific, implementable learning loop tied to measurable outcomes. This is what "learning" actually means in production.

#### 2. Explicit autonomy tiers with calibration
Fuschia automates and escalates but has no principled framework for deciding which automations need human oversight. iPOM's four-tier model (Autonomous/Supervised/Exception/Strategic) with accuracy-based tier expansion/contraction is architecturally more mature.

#### 3. Cross-agent user context
Fuschia's integrations are system-to-system (Salesforce, SAP). iPOM's `PlatformUserContext` is user-to-platform — the agent knows the user's current state across all platform modules before the first message. This is a more sophisticated form of contextual awareness than system integration.

#### 4. Exception queue design
Fuschia mentions escalation. iPOM's exception queue design — AI recommendation + confidence score + evidence count + `claimed_by` ownership + 48h escalation — is a production-grade operational tool, not just an escalation flag.

#### 5. GDPR as a design constraint
Fuschia lists GDPR compliance as a target feature. iPOM has designed it as a first-class architectural constraint with specific retention periods, archival strategy, pseudonymisation protocol, SAR handler, and privacy notice requirements. This is the difference between compliance as a checkbox and compliance as infrastructure.

---

### Architectural Gaps Remaining in iPOM v2.1 Post-Fuschia Comparison

After incorporating Fuschia insights, these gaps remain in iPOM v2.1:

| Gap | Severity | Phase |
|-----|----------|-------|
| No visual workflow designer (editor, not just viewer) | 🟠 High — limits admin self-service | Phase 5 |
| PostgreSQL relational model inadequate for deep graph queries (referral network) | 🟠 High — Network Intelligence page will degrade at scale | Phase 4 |
| No agent performance metrics (accuracy, latency, tool reliability, retrieval quality) | 🟠 High — learning loop has no diagnosis capability | Phase 3 |
| No workflow template library | 🟡 Medium — admin onboarding friction | Phase 3 |
| No explicit workflow version control column | 🟡 Medium — add now, UI later | Phase 1 |
| No `legal_hold` column in GDPR migration | 🔴 Compliance — must be in migration 343 | Phase 1 |
| Migration number conflicts (GDPR=340, GS=341 already exist; should be 343, 344) | 🔴 Will break migration history | Fix before any migration runs |
| Growth Score Article 22 for gating decisions left as "borderline" | 🟠 Compliance risk | Resolve before Phase 1 go-live |
| SAR endpoint deferred to Phase 3 but autonomous tier live in Phase 1 | 🟠 Compliance gap — minimum: email link in Phase 1 notification | Phase 1 minimum |

---

## Part 3 — Recommended v2.2 Updates

Based on both audits, the following changes should be made to the iPOM v2.1 document and companions:

### 1. Correct migration numbers (immediate — before any coding starts)
- `ipom-gdpr-retention-policy.md` §8: Migration 340 → **Migration 343**
- `ipom-growth-score-all-roles.md` §6.1: Migration 341 → **Migration 344**
- Update v2.1 → **v2.2** with these corrections noted in the header

### 2. Resolve Growth Score Article 22 status in GDPR document
Add to the Article 22 applicability table:
> `growth_scores` (gating decisions — e.g., score < threshold removes featured placement): **YES** — decision rationale must be stored in `workflow_executions` at time of gating.

### 3. Add `legal_hold` column to migration 343
```sql
ALTER TABLE profiles ADD COLUMN legal_hold boolean DEFAULT false;
CREATE INDEX idx_profiles_legal_hold ON profiles(legal_hold) WHERE legal_hold = true;
```

### 4. Add SAR minimum to Phase 1 scope
In the notification template sent to newly-approved/rejected tutors (Phase 1), include:
> "This decision was made automatically. To request human review, email support@tutorwise.com."
Full SAR UI remains Phase 3.

### 5. Add `workflow_version` column to Phase 1 database changes
```sql
ALTER TABLE workflow_processes ADD COLUMN workflow_version integer DEFAULT 1 NOT NULL;
ALTER TABLE workflow_processes ADD COLUMN version_notes text;
```
Incremented on every code-deployed workflow change. Provides version history before a visual editor ships.

### 6. Add Neo4j consideration to Phase 4 scope
Phase 4 task list gains:
> **Neo4j graph layer for Network Intelligence** (15–20h): dual-write referral events to Neo4j; Network Intelligence page queries Neo4j for depth traversal and centrality. Alternative if out of scope: PostgreSQL `ltree` extension for simpler hierarchy queries.

### 7. Add agent performance metrics table to Phase 3 scope
```sql
CREATE TABLE agent_performance_metrics (...) -- see Part 2 §3
```
Platform Console Agent Performance tab added to Phase 3 scope (alongside AI cost dashboard).

### 8. Add workflow template library to Phase 3 scope
```sql
CREATE TABLE workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_nodes jsonb NOT NULL,
  template_edges jsonb NOT NULL,
  category text,       -- 'onboarding' | 'engagement' | 'financial' | 'compliance'
  is_platform_provided boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```
Seed with: Organisation Onboarding, Stuck Referral Recovery, Org Dormancy Re-engagement, Listing Quality Intervention. Admin clones a template to create a new live process.

---

## Part 4 — Scalability Challenges

iPOM's architecture faces five distinct scalability pressure points as the platform grows. Each has a different failure mode and a different mitigation strategy.

---

### Scale Challenge 1: `platform_events` table growth

**The pressure**: Every bridge file publishes events for every lifecycle action across 6+ systems. At 10,000 active users with 5 events/user/day, `platform_events` accumulates 50,000 rows/day = 18M rows/year.

**The failure mode**: The Admin Intelligence Agent's anomaly detection queries scan recent events (`WHERE created_at > NOW() - INTERVAL '24h'`). At 18M rows/year without aggressive partitioning, these scans become slow within 12–18 months.

**Mitigation**:
1. Partition `platform_events` by `created_at` (monthly partitions). PostgreSQL declarative partitioning means queries hitting `WHERE created_at > NOW() - 24h` touch only the current month's partition.
2. The 12-month retention policy (§GDPR) means old partitions are simply dropped — no expensive DELETE operations.
3. Add this to migration 343: `PARTITION BY RANGE (created_at)` from day one. Retrofitting partitioning later is expensive.

```sql
-- In migration 343: partition platform_events from creation
CREATE TABLE platform_events (
  ...
  created_at timestamptz DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Monthly partitions (automate with pg_partman extension)
CREATE TABLE platform_events_2026_03 PARTITION OF platform_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

---

### Scale Challenge 2: Admin Intelligence Agent — event storm under load

**The pressure**: The 15-minute domain batching window (§6.1) prevents 50 individual AI calls. But on high-activity days (payout Friday, start of school term), the platform can generate hundreds of domain events per hour across bookings, referrals, and organisations simultaneously.

**The failure mode**: All domains hit their 15-minute window simultaneously. The Admin Intelligence Agent runs 6 domain analyses in parallel, each making AI calls. At Gemini Flash rates, this is cheap per run — but the concurrent database load (each analysis queries multiple operational tables) can degrade query performance for live users.

**Mitigation**:
1. Stagger domain analysis windows by 2–3 minutes offset: bookings at :00, referrals at :02, orgs at :04, financials at :06. Prevents simultaneous heavy queries.
2. Pre-aggregate operational signals into a `daily_platform_signals` materialised view refreshed every 15 minutes. Admin Intelligence Agent queries the materialised view, not raw operational tables. Decouples intelligence workload from live user queries.
3. Admin Intelligence Agent queries use `read committed` isolation and `statement_timeout = 10s`. If a domain query takes >10s (overloaded), it fails gracefully and retries next window rather than blocking.

---

### Scale Challenge 3: `workflow_executions` + LangGraph checkpointer at batch scale

**The pressure**: Commission Payout runs weekly for potentially hundreds of tutors. The LangGraph `PostgresSaver` checkpointer writes state to PostgreSQL at every graph node transition. For a 300-tutor batch, even with LangGraph `Send` fan-out, each tutor's execution generates 5–10 checkpoint writes = 1,500–3,000 writes in a short window.

**The failure mode**: Checkpoint write contention. The `LangGraph checkpointer` table (Supabase session-mode connection, port 5432) becomes a write bottleneck. Payout processing slows, some checkpoints timeout, partial executions accumulate.

**Mitigation**:
1. Use a **dedicated connection pool** for the LangGraph checkpointer, separate from the main Supabase pooler. The existing design already uses `POSTGRES_URL_NON_POOLING` (port 5432) — this is correct. But at batch scale, multiple concurrent threads fighting over the same connection will still bottleneck.
2. For batch-safe operations (commission calculation), consider a **write-ahead buffer**: accumulate all payout calculation results in memory, then write to the database in a single transaction at batch completion. This trades checkpoint granularity for throughput.
3. Run the payout batch at low-traffic hours (current: Friday 10am UTC — acceptable) and add a `max_concurrent_payouts` config (e.g., max 50 parallel tutor executions). Queue the rest. Prevents runaway parallelism.

---

### Scale Challenge 4: Knowledge pipeline embedding costs at scale

**The pressure**: Pipeline 1 re-embeds changed discovery results. At 500 workflow discovery results with 20% change rate per scan = 100 chunks re-embedded per scan. Daily scans = 100 × 365 = 36,500 embedding calls/year for just Pipeline 1. At Gemini embedding rates, this is low-cost today — but Pipeline 2 (configurations) can trigger on every admin config change, which has no rate-limiting cap.

**The failure mode**: A misconfigured admin making 100 rapid config changes (or a bug causing rapid mutations) triggers 100 immediate pipeline jobs, each calling the embedding API. Embedding API rate limits kick in, jobs fail and retry, queue depth grows.

**Mitigation**:
1. **Rate-limit pipeline job creation per source**: max 1 pipeline job per `(pipeline_type, source_id)` per 5-minute window. Additional triggers within the window are deduplicated — the job runs once covering all changes.
2. **Embedding batch size cap**: max 100 chunks per embedding API call (Gemini's limit). Large discovery scans split into batches of 100.
3. **Pipeline cost budget**: add `max_monthly_embedding_calls` config. If exceeded, pipeline jobs queue and run at reduced frequency. Admin notified in Platform Console.

---

### Scale Challenge 5: `growth_scores` computation at platform scale

**The pressure**: The `compute-growth-scores` pg_cron job runs every 30 minutes across all profiles. At 50,000 users, the CTE query joins `profiles`, `listings`, `bookings`, `referrals`, `growth_scores` for every user every 30 minutes. This is a full-table scan workload running continuously.

**The failure mode**: The pg_cron job takes longer than 30 minutes to complete as user count grows. Jobs overlap. The previous run is still in progress when the next one starts, causing lock contention on the `growth_scores` upsert.

**Mitigation**:
1. **Incremental computation**: don't recompute scores for users whose source data hasn't changed. Add a `last_activity_at` column to profiles (updated by triggers on bookings, referrals, listings). Only recompute Growth Scores for profiles where `last_activity_at > growth_scores.computed_at`.
2. **Batch the computation**: rather than one CTE covering all users, process in batches of 1,000 profiles per pg_cron invocation. Run every 5 minutes (not 30), each batch covering 1,000 users. At 50,000 users, full coverage in 50 × 5 minutes = 4.2 hours. For a cached score, this is acceptable.
3. **Event-driven recomputation for signal users**: users who just had a booking, sent a referral, or received a review get their score recomputed immediately (triggered by the booking/referral webhook). The bulk pg_cron batch covers everyone else. This ensures the most active users (most likely to interact with the Growth Agent) always have a fresh score.

---

### Scale Challenge 6: Supabase Realtime for in-app notifications at scale

**The pressure**: iPOM Phase 2 adds in-app notifications via Supabase Realtime subscription on the `notifications` table. Every active user holds an open WebSocket to Supabase Realtime. At 5,000 concurrent users, this is 5,000 open WebSocket connections. Supabase Realtime's concurrent connection limit on the Pro plan is 500 (increased on higher plans — but it's a hard billing constraint).

**The failure mode**: At moderate scale, Supabase Realtime connection limits are hit. Notifications stop delivering in real-time. Users miss proactive nudges and approval notifications.

**Mitigation**:
1. **Short-poll instead of WebSocket for notifications**: poll `GET /api/notifications/unread-count` every 60 seconds. Cheaper, scales to any user count, no WebSocket connection overhead. Real-time delivery degraded to 60-second latency — acceptable for non-critical notifications.
2. **Or**: use a dedicated notification service (Novu, Knock) that handles the WebSocket infrastructure at scale, integrates with Resend for email, and provides a notification centre UI. Higher cost but removes the scaling constraint entirely.
3. **Minimum viable approach**: short-poll for the bell count, full list loaded on demand. WebSocket only for the admin exception queue (low user count, high urgency).

---

### Scalability Summary

| Challenge | Scale threshold | Risk | Mitigation phase |
|-----------|----------------|------|-----------------|
| `platform_events` table growth | ~12–18 months | Query degradation | Partition in migration 343 **now** |
| Admin Intelligence event storms | High-activity days | DB query contention | Staggered domain windows + materialised view — Phase 3 |
| LangGraph checkpointer at batch scale | >100 concurrent payouts | Write bottleneck | `max_concurrent_payouts` config — Phase 2 |
| Knowledge pipeline embedding cost spikes | Config change bursts | Rate limit failures | Per-source dedup window — Phase 1 |
| Growth Score computation at scale | >20,000 users | pg_cron overlap + lock contention | Incremental compute + event-driven refresh — Phase 1 |
| Realtime notification connections | >500 concurrent users | Supabase Realtime limit | Short-poll fallback design — Phase 2 |

**The one that must be addressed before Phase 1 ships**: `platform_events` partitioning. This is a 30-minute migration addition that is extremely expensive to retrofit later. Every other challenge can be addressed reactively when the threshold is approached.

---

## Part 5 — Growth Agent: Shared User + Admin Mode

**Both the user-facing Growth Agent and the admin-facing Lexi admin mode share the same underlying AI service.** This is correct (single execution engine) but has design implications that neither the Fuschia comparison nor the v2.1 document fully addresses.

### The Shared Agent Problem

The Growth Agent currently serves one context: a user (tutor, client, agent, or organisation) asking about their own business growth. Under iPOM, the admin needs a growth intelligence view too — aggregate platform-wide Growth Scores, org health trends, nudge effectiveness — but asked in the same conversational interface.

However, using the same Growth Agent orchestrator for both creates a **context pollution risk**: the system prompt designed for a tutor ("Let's grow your tutoring income") is wrong for an admin running a platform-level growth analysis.

### Solution: Mode-Separated System Prompts, Shared Tool Layer

```
┌─────────────────────────────────────────────────────────────────┐
│              GROWTH AGENT — SHARED ARCHITECTURE                  │
│                                                                  │
│  USER MODE (current)              ADMIN MODE (new, Phase 3)     │
│  ───────────────────              ──────────────────────────     │
│  System prompt:                   System prompt:                 │
│  "You are the Growth Advisor       "You are the Platform Growth  │
│  for [name], a [role]."            Intelligence system. You have │
│                                    access to aggregate platform  │
│  PlatformUserContext:              signals across all users."    │
│  scoped to auth.user.id                                          │
│                                    PlatformAdminContext:         │
│  Tools:                            aggregate stats, all orgs,   │
│  read_my_growth_score()            network graph, nudge reports  │
│  read_my_bookings()                                              │
│  read_my_referrals()               Tools:                        │
│  trigger_workflow()                read_all_growth_scores()      │
│                                    read_org_health_aggregate()   │
│  Rate limit:                       read_nudge_effectiveness()    │
│  Free: 10/day                      read_network_signals()        │
│  Pro: 5,000/month                                                │
│                                    Rate limit: none (internal)   │
│                                    Auth: is_admin() required     │
└───────────────────────────────────────┬─────────────────────────┘
                                        │
                        Shared: GrowthAgentOrchestrator
                        Shared: AI service (6-tier fallback)
                        Shared: growth_knowledge_chunks RAG
                        Shared: streaming response pipeline
```

### What This Means for iPOM Design

1. **`GrowthAgentOrchestrator.buildSystemPrompt()` needs a `mode` parameter**: `'user' | 'admin'`. The `mode` selects a different system prompt template and a different tool set, but the same underlying model and streaming logic.

2. **Admin Growth tools are different from user Growth tools**: User tools are scoped to `auth.user.id`. Admin tools query aggregate views across all users. Both call the same underlying database but with different RLS contexts — admin tools require `service_role` or a dedicated admin schema.

3. **The Admin Command Center query bar already uses Lexi admin mode for platform operations questions.** Growth admin mode should be accessible from a separate Growth Analytics section within the admin interface — not the same query bar as Lexi. Two different agents serving two different admin workflows should not share one input field.

4. **The rate limiter must not apply to admin mode.** The admin asking "what's the aggregate Growth Score distribution across all orgs?" should not count against any rate limit. The shared rate limiter in `apps/web/src/lib/ai-agents/rate-limiter.ts` already has an `admin-intelligence` entry — Growth admin mode should be treated as a similar internal agent (no rate cap, but Admin Intelligence rate limit of max 10 runs/hour still applies to prevent runaway queries).

5. **Decision: where does admin Growth mode live in the UI?** Two options:
   - **Option A**: A new tab in `/admin/intelligence/` — "Growth Intelligence" — that opens a Growth Agent in admin mode. Consistent with the Intelligence section of the admin sidebar.
   - **Option B**: A Growth analytics panel embedded in the Admin Command Center's Intelligence section. Admin asks growth-related questions inline with other intelligence queries.
   - **Recommendation**: Option A (Phase 3). Admin Growth mode has a different workflow (data analysis, trend review) than the exception queue (decision-making). Separate pages serve different workflows better than one shared interface.

### Updated Design Decision D22

**D22: Growth Agent mode separation**
**Resolved**: Single `GrowthAgentOrchestrator` with `mode: 'user' | 'admin'` parameter. User mode scoped to `profile_id`, rate-limited per subscription tier. Admin mode uses `service_role` credentials, no rate limit, separate system prompt targeting aggregate platform intelligence. Admin mode entry point: `/admin/intelligence/growth/` (Phase 3). This prevents context pollution while maximising code reuse.

---

## Summary Scorecard

### iPOM v2.1 vs v1.0
| Dimension | v1.0 | v2.1 |
|-----------|------|------|
| Learning loop | ❌ | ✅ |
| Cross-agent context | ❌ | ✅ |
| Growth Score (all roles) | ❌ TBD | ✅ Fully defined |
| GDPR compliance | ❌ Open question | ✅ Full policy |
| Platform event bus | ⚠️ cas_agent_events (wrong) | ✅ platform_events (correct) |
| Knowledge pipelines | ⚠️ Synchronous | ✅ Async + retry |
| Exception ownership | ❌ Not designed | ✅ claimed_by + escalation |
| AI cost visibility | ❌ | ✅ platform_ai_costs |
| agents-core risk | 🔴 Concurrent extraction | ✅ Isolated pre-foundation |
| Migration numbers | — | 🔴 Conflict (fix required) |

### iPOM v2.1 vs Fuschia
| Dimension | iPOM | Fuschia |
|-----------|------|---------|
| Self-improving autonomy | ✅ Concrete mechanism | ⚠️ Stated but undesigned |
| Autonomy tier model | ✅ Four-level + calibration | ⚠️ Not explicit |
| Cross-agent context | ✅ PlatformUserContext | ❌ Not designed |
| GDPR compliance design | ✅ Production-grade | ⚠️ Requirement only |
| Exception queue quality | ✅ Confidence + ownership | ⚠️ Escalation only |
| Visual workflow designer | ❌ Deferred | ✅ Full ReactFlow canvas |
| Graph DB for network queries | ❌ PostgreSQL CTEs | ✅ Neo4j native |
| Agent performance metrics | ❌ Cost only | ✅ Full performance tracking |
| Workflow template library | ⚠️ Single template | ✅ Full library |
| Domain specificity | ✅ Deep (Tutorwise) | ⚠️ Generic (higher friction) |

**Overall verdict**: iPOM v2.1 is architecturally ahead of Fuschia in operational intelligence design (learning loop, autonomy model, cross-agent context, GDPR). Fuschia is ahead in platform tooling (visual designer, graph DB, agent metrics). The right path for iPOM is to adopt Fuschia's tooling strengths (graph layer for Phase 4, visual editor for Phase 5, agent metrics for Phase 3) while maintaining its domain-specific operational intelligence advantages.

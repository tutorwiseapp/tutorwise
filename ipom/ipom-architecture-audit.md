# iPOM Architecture Audit — Senior Architect Review
**Document audited**: `fuchsia/ipom-solution-design.md` v1.0
**Audit date**: 2026-03-05
**Auditor**: Architecture Review

---

## Overall Verdict

**Sound architecture with six critical gaps to address before build starts.**

The core iPOM model is correct. The strategic problem identification (seven silos sharing a database) is accurate. The solution — Nexus event bus, HITL gateway, knowledge pipelines, shared agent infrastructure — follows proven platform patterns and is appropriately scoped. The four-level autonomy model is the right mental model for a marketplace operations layer.

The design decisions (D1–D11) are largely well-reasoned. The most important decision in the document — Process Studio as the single action runtime for all agents (D5) — is architecturally excellent and should not change.

The critical gaps below are not blockers to starting. Most can be resolved with a paragraph-level addendum. Two (Growth Score formula, multi-admin queue ownership) must be resolved before those specific phases build.

---

## What Is Architecturally Correct

### 1. HITL Action Gateway (§5.3) — Best decision in the document

Using Process Studio as the single action runtime for all conversational agents is the right call. It avoids duplicating action logic per agent, gives every write action a built-in audit trail, and provides idempotency for free. The two-endpoint security boundary (user-scoped `/api/process-studio/execute/start` vs admin `/api/admin/process-studio/execute/start`, same execution engine) is the correct pattern. This is the highest-value architectural insight in the entire document.

### 2. Bridge file pattern (§5.4) — Low-risk, proven

Following the existing `sage-bridge.ts` / `lexi-bridge.ts` pattern for `growth-bridge.ts` and `process-studio-bridge.ts` is correct. This pattern is already proven in the codebase. Adding two new bridge files doesn't touch existing code — pure extension.

### 3. Delta-sync hashing in Pipeline 1 (§5.2) — Practical and necessary

Hash-compare on re-scan to skip unchanged chunks is the right approach. Without this, every Discovery scan would accumulate duplicate knowledge chunks. The implementation note about hash-before-upsert shows the design has thought through the practical concern.

### 4. Unified `agent_subscriptions` table (§7.1) — Clearly right

One table with an `agent_type` column instead of per-agent tables is correct. The migration path (existing `sage_pro_subscriptions` data moves in) is clean. This should not be debated.

### 5. Four-level autonomy model (§2.2) — Well-calibrated

The Autonomous / Supervised / Exception / Strategic tiers are correctly assigned. The document correctly puts tutor approval in Autonomous (CaaS score is a reliable confidence signal), disputes in Exception (requires judgement), and workflow design in Strategic. This is the right model for a marketplace at this scale.

### 6. Navigation reframe (§2.4) — Significant UX improvement

Moving from domain-first (Bookings | Listings | Accounts) to autonomy-first (Operations | Intelligence | Management | Configuration) is the correct design. Existing domain pages don't disappear — they become the Management section (secondary). This is evolutionary, not a rebuild. Decision D2 is correct.

### 7. `packages/agents-core/` extraction (§7.4) — Right outcome, risky path

Extracting `BaseAgent`, `PlatformAIAgent`, `MarketplaceAIAgent` into a shared workspace package is the correct long-term architecture. It eliminates the cross-dependency between `sage/` and `growth/`. The concern is timing and risk — addressed in Gaps below.

---

## Critical Gaps

### Gap 1: `cas_agent_events` is the wrong table for a platform event bus

**The problem**: The design extends `cas_agent_events` with a `source_system` column and uses it as the unified platform event bus. `cas_agent_events` is a CAS-internal table — its schema, indexes, RLS policies, and retention assumptions are designed for CAS agent lifecycle events (tool calls, reasoning steps, agent errors). Now it is being asked to handle events from 7 systems, each with different payload shapes, at much higher volume.

**The risk**:
- CAS events are typically fine-grained (many per agent turn). Platform events are coarser (one per workflow completion, one per session). Mixing them in one table makes querying either harder.
- If `cas_agent_events` RLS restricts reads by `user_id = auth.uid()`, admin queries that need cross-system event aggregation will require `service_role` credentials — a security policy decision that isn't captured in the design.
- GDPR retention for CAS events (user interaction data) and operational platform events (workflow completions) may differ.

**Recommendation**: Create a dedicated `platform_events` table for cross-system observability. Keep `cas_agent_events` for CAS internals. The schema cost is minimal (one migration), the clarity gain is significant. A separate table also allows different indexes (by `source_system`, `event_type`, `created_at`) without polluting CAS indexes.

```sql
-- Proposed: dedicated platform event store
CREATE TABLE platform_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system text NOT NULL,  -- 'sage' | 'lexi' | 'growth' | 'process-studio' | 'cas'
  event_type text NOT NULL,     -- workflow.started | growth.audit_completed | etc.
  entity_id uuid,               -- user_id, execution_id, session_id — context-dependent
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_platform_events_source ON platform_events(source_system);
CREATE INDEX idx_platform_events_type ON platform_events(event_type);
CREATE INDEX idx_platform_events_created ON platform_events(created_at DESC);
```

### Gap 2: Growth Score formula is never defined

**The problem**: The Growth Score is referenced throughout the document as a key signal:
- D9: "Growth Score drop > 5pts" triggers a proactive nudge
- §6.2: "listing flagged when Growth Score < 40"
- §6.3: "avg Growth Score across members" for org health

But nowhere in the document (or in the Growth Agent implementation) is the Growth Score formula specified. What does it measure? What is the scale (0–100?)? What inputs feed it?

**The risk**: Multiple phases build on top of the Growth Score. If the formula isn't defined before Phase 2 (proactive nudges) or Phase 3 (Admin Intelligence), those phases will either not ship or ship with a placeholder that becomes load-bearing and hard to change.

The Phase 1 tracking table shows: `Growth Score SQL + hourly cache (3h, TBD — verify)` — this TBD is the same gap.

**Recommendation**: Define the Growth Score before Platform Extraction begins. Suggested formula (to be validated):

```
Growth Score (0–100) =
  profile_completeness         (0–25)  listing photos, bio length, subjects
  + listing_performance         (0–25)  views last 14d, booking conversion rate
  + earnings_trajectory         (0–25)  bookings last 30d vs previous 30d
  + platform_engagement         (0–25)  response time, review rate, referral activity
```

The formula should be documented as a separate decision, agreed with product, and committed as a migration (score computed and cached hourly in a `growth_scores` table).

### Gap 3: `agents-core` extraction is high-risk if done concurrent with active development

**The problem**: The plan schedules `packages/agents-core/` extraction concurrent with the Platform Extraction + Nexus Foundation phase. This means refactoring the import graph of two live, recently-shipped features (Sage, Growth) while simultaneously building new features. If the extraction has errors, it can break Sage (a live product).

**The risk**: Circular dependency bugs, broken tsconfig path aliases, package resolution failures, and build cache issues are all realistic failure modes when extracting into a workspace package.

**Recommendation**: Schedule `agents-core` extraction as its own isolated PR, done before the Nexus bridges are wired. Specifically:
1. Extract into `packages/agents-core/` with full build verification
2. Update Sage to import from `@tutorwise/agents-core` — verify Sage still works
3. Update Growth to import from `@tutorwise/agents-core` — verify Growth still works
4. Only then proceed with Nexus foundation

This adds 0.5–1 day but eliminates the risk of breaking production features during a large concurrent build.

The 4h estimate for this task is also too low. Realistic: 8–12h (extraction + tsconfig wiring + resolving unexpected circular dependencies + build verification for both Sage and Growth).

### Gap 4: Knowledge Pipeline failure modes are unspecified

**The problem**: Both pipelines (§5.2) are described as synchronous hooks:
- Pipeline 1: triggered when `discovery.scan_completed` fires
- Pipeline 2: "hook on mutation" — called during `updateSharedField()` API call

But what happens when these pipelines fail? If Gemini Embedding API is unavailable:
- Does the `updateSharedField()` mutation fail? The admin can't update a configuration because an embedding pipeline failed.
- Does the Discovery scan completion silently skip updating Lexi's knowledge?
- Is there a retry mechanism?

**Recommendation**: Both pipelines should be async and fire-and-forget from the caller's perspective. The pattern should be:
1. Mutation/scan completes → publishes an event to a `pipeline_jobs` queue (or Supabase pg_cron job)
2. Pipeline processes asynchronously with retry on transient failure
3. Admin Platform Console shows pipeline job status and last successful sync time

The success metric "< 4h after a feature ships" (§10) requires async processing anyway — a synchronous hook blocked on embedding could slow admin UI interactions to unacceptable levels.

### Gap 5: Multi-admin exception queue ownership is a go-live blocker for Phase 3

**The problem**: Open Question 4 (§11) asks how the exception queue handles multiple admins — but frames it as a future concern ("if the team grows to 3+ admins"). This underestimates the risk.

**The scenario**: Two admins are both looking at the Command Center. Exception: "Dispute £120, James vs client". Admin A starts reading the AI brief. Admin B clicks [Accept recommendation]. The exception disappears from Admin A's queue mid-read. Or: both admins approve different outcomes for the same exception.

**This is a go-live blocker** because any concurrent admin usage will hit this. The fix is standard queue ownership: when an admin opens an exception, it becomes `claimed` (soft lock, 15-minute timeout). Other admins see it as in-progress but can still view and override-claim.

**Recommendation**: The exception queue data model needs a `claimed_by` and `claimed_at` column. The UI shows claimed items differently. This must be resolved in the Phase 3 design spec before Admin Command Center implementation begins.

### Gap 6: LinkedIn OAuth approval timeline is not accounted for

**The problem**: Phase 4 lists "LinkedIn OAuth + `post_to_social` Growth tool" as an 8–10h implementation task. This underestimates the dependency. LinkedIn's Marketing API (required for posting on behalf of users) requires Tutorwise to apply for LinkedIn's **Marketing Developer Platform** access. This is not a self-serve process — LinkedIn reviews applications, which typically takes 4–6 weeks and may require demonstrating a user base.

**The risk**: Phase 4 is blocked on an external approval process that must be started weeks before Phase 4 implementation begins.

**Recommendation**: Start the LinkedIn Developer Platform application now, independent of the Phase 4 timeline. If approval takes 6 weeks and Phase 4 starts in 8 weeks, it may still be the blocking path. If this cannot be resolved, consider `post_to_social` as a Phase 5 addition with a manual copy-paste workflow as the Phase 4 placeholder.

---

## Secondary Gaps (Lower Priority)

### Gap 7: `growth_knowledge_chunks` table needs a Growth-side RAG system

The design adds a `growth_knowledge_chunks` table (§5.6) but Growth Agent currently operates as a pure LLM with DSPy-style skill files — it has no RAG retrieval pipeline. Pipeline 1 will populate the table, but who reads from it? The Growth Agent orchestrator needs a RAG step added before this table provides value.

This is not a blocker for Pipeline 1 (it can populate the table even before Growth-side RAG is built), but it should be flagged as an incomplete loop until Phase 2 adds the Growth RAG retrieval.

### Gap 8: `growth_agent_session_id` attribution columns are still TBD

Phase 1 tracking shows `Growth metrics attribution schema (growth_agent_session_id columns) — TBD`. This matters for the Success Metrics in §10. If Growth Agent sessions can't be attributed to downstream actions (bookings, referral signups), the "Autonomous operation rate" metric cannot be measured for Growth. Define the schema before Growth Pro billing goes live.

### Gap 9: Exception queue escalation policy (Open Question 3) needs a minimum answer

Open Question 3 asks: if an exception isn't resolved within X hours, who gets notified? The document doesn't require a sophisticated escalation system at Phase 3 go-live, but a minimum answer is needed: email the admin team after 48h of no action. This prevents exceptions from silently expiring with no human ever seeing them.

### Gap 10: GDPR retention policy for operational event tables

`cas_agent_events` and `workflow_executions` will accumulate user-linked data. Under UK GDPR, automated decision-making records (tutor approval, commission calculation) have specific subject access request (SAR) implications. A retention policy (e.g., 12-month rolling, archive to cold storage) should be specified before autonomous operations scale. This is not a pre-launch blocker but should be in the Phase 3 or 4 design spec.

---

## Design Decisions Assessment

| Decision | Verdict | Notes |
|----------|---------|-------|
| D1: iPOM product name | ✅ Correct | Users never see it — internal clarity matters |
| D2: Evolve, not rebuild admin | ✅ Correct | HubPageLayout stays; domain pages move to secondary |
| D3: Single `agent_subscriptions` table | ✅ Correct | Best decision for reducing per-agent duplication |
| D4: `agents-core` workspace package | ✅ Correct outcome | ⚠️ Risky if done concurrent with live development — sequence carefully |
| D5: HITL gateway security boundary | ✅ Excellent | Two endpoints, same engine — correct pattern |
| D6: Two knowledge pipelines | ✅ Correct | Configurations pipeline solves the highest-frequency staleness problem |
| D7: New `cas:admin-intelligence` agent | ✅ Correct | Separate from CAS Analyst — different domain, different tools |
| D8: Growth Agent data scopes | ✅ Correct | Individual scope vs org scope, RLS-gated — right approach |
| D9: Proactive nudge via pg_cron | ⚠️ Partially resolved | Growth Score formula must be defined; notification infrastructure not yet built |
| D10: `/admin/network/` as a new page | ✅ Correct | Signal vs Network are different analytical models |
| D11: Workflow definitions as code | ✅ Correct | Code-reviewed workflows, config-driven parameters — right balance |

---

## Phase Sequencing Assessment

The phasing is broadly correct. Dependencies are sequenced properly:

```
Platform Extraction + Nexus Foundation → Actions + HITL Gateway → Admin Intelligence → Network
```

Each phase's output is a genuine prerequisite for the next. Shared agent infrastructure before new agents. HITL gateway before Growth Agent actions. Admin Intelligence Agent before Command Center.

**One resequencing recommendation**: Move `agents-core` extraction out of "concurrent with Growth" and make it a standalone, isolated task completed before Nexus Foundation builds begin. This is a 1-day change in sequencing that eliminates production regression risk.

**Hour estimate concerns**:
- `agents-core` extraction: 4h → realistically 8–12h (extraction + both consumers verified)
- Admin Intelligence Agent: 10–12h → likely 14–18h for a new CAS agent with 6 tools + briefing + anomaly detection + event publishing + query response
- Parameterised `/api/agents/[agentType]/` routes: 4h → verify this includes migrating existing Growth routes (not just building new ones); if so, budget 6h

**The 120–160h remaining estimate is plausible at the feature level but doesn't include integration testing, bug fixing, and the extra complexity of operating on a live production system.** A 20% buffer (144–192h effective) is more realistic.

---

## Success Metrics Assessment (§10)

The metrics are concrete and measurable — good. Two concerns:

**"Autonomous operation rate ≥70%"** — This is the right target but the baseline isn't known. How many routine decisions currently go through manual admin action? Without a baseline, 70% is aspirational. Recommend measuring the baseline before Phase 3 launches.

**"< 4h Lexi knowledge staleness"** — This target requires Pipeline 2 to be async (Gap 4). If Pipeline 2 is synchronous and blocking, a failing embedding call can cause the pipeline to never run. Measure staleness from the last successful pipeline completion, not wall-clock time.

---

## Open Questions Assessment (§11)

| Question | Assessment |
|----------|-----------|
| Q1: Discovery scan frequency | ✅ Recommendation given (on deploy + daily cron) is correct |
| Q2: Admin Intelligence Agent cost | ⚠️ "Use cheaper tier" is right but should be in the implementation spec, not an open question |
| Q3: Exception escalation policy | ⚠️ Minimum answer needed before Phase 3 go-live: 48h → email admin |
| Q4: Multi-admin queue ownership | 🔴 **Go-live blocker** — must be resolved before Phase 3 builds |
| Q5: Audit log retention | ⚠️ GDPR concern — needs policy before autonomous operations scale |
| Q6: Org Growth Agent billing | ⚠️ Must be resolved before org persona is accessible to Growth Agent |

---

## Summary: What To Do Before Building Starts

### Resolve before Platform Extraction + Nexus Foundation:
1. **Define Growth Score formula** — write it as a design decision (D12). Without it, D9 proactive nudges are unimplementable.
2. **Decision on `platform_events` vs `cas_agent_events`** — either accept the shared table with clear schema constraints, or create a dedicated table. Either is fine; the ambiguity is not.
3. **Schedule `agents-core` extraction as isolated, pre-foundation task** — done and verified before bridges are wired.

### Resolve before Phase 2 (Actions + HITL Gateway):
4. **Make Pipeline 1 + Pipeline 2 async** — fire-and-forget from caller, retry-on-failure, monitored via Platform Console.
5. **Define Growth RAG retrieval step** — or explicitly mark `growth_knowledge_chunks` as "populated but not yet consumed until Phase 2."
6. **Start LinkedIn Developer Platform application** — 6-week external timeline, should start now.

### Resolve before Phase 3 (Admin Intelligence):
7. **Exception queue ownership model** — `claimed_by` + `claimed_at`, 15-minute soft lock, override-claim for other admins.
8. **Exception escalation policy** — minimum: email after 48h of no action.

### Architectural non-negotiables to preserve throughout build:
- HITL gateway security boundary (D5) — two endpoints, same engine. Do not collapse this.
- Process Studio as the single action runtime — no agent should directly write to the database for user-facing actions.
- Delta-sync hashing in Pipeline 1 — do not skip, even for MVP. Without it, re-scans accumulate duplicates.

---

## Bottom Line

iPOM as designed is a coherent and well-considered platform operations architecture. The core insight — that the platform should operate autonomously on routine decisions and present humans only with genuine judgment calls — is correct and appropriately scoped for a marketplace at this stage.

The six critical gaps are all solvable with design work (not major re-architecture). None require changing the core model. The HITL gateway, knowledge pipelines, unified agent infrastructure, and autonomy-level model should proceed as designed.

The primary risk is not architectural — it is sequencing. The `agents-core` extraction touching two live products, the Growth Score formula being undefined while multiple features depend on it, and the multi-admin exception queue ownership gap are the three items most likely to cause a phase to stall mid-build.

Address those three before the first line of Nexus Foundation code is written.

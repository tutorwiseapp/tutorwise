# Process Discovery Engine — Solution Design

**Version:** 1.1
**Date:** March 2, 2026
**Owner:** Michael Quan
**Status:** Draft — Pending Review
**Parent Document:** `fuchsia/process-studio-solution-design.md`

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-02 | Michael Quan | Initial solution design for Process Discovery Engine |
| 1.1 | 2026-03-02 | Michael Quan | Added 6 optimisations: direct mapping, dedup, template overlap detection with staleness flagging, Vercel timeout handling, two-pass scanning, selective batch import |

---

## 1. Executive Summary

The Process Discovery Engine is an **additive enhancement** to the existing Process Studio. It automatically discovers business workflows embedded in the TutorWise codebase and database — status enums, API routes, cron jobs, onboarding flows, CAS multi-agent workflows, and database triggers — then surfaces them in the Process Studio UI for review and import to the canvas.

Today, TutorWise has **26+ status-based state machines, 300 API routes, 10 cron jobs, 3 role-based onboarding flows, 4 CAS multi-agent workflows, and 96+ database triggers** that implicitly define business processes. These workflows exist in code but are invisible to non-technical stakeholders. The Discovery Engine makes them visible, explorable, and editable.

**Key capabilities:**
- **Discover one or all** existing processes from 6 source categories
- **Visualise** discovered workflows on the Process Studio canvas (single or batch import)
- **Three sync modes**: real-time (Supabase Realtime push), near-real-time (on-demand scan), and manual refresh button
- **AI-powered analysis**: Gemini converts raw code patterns into structured ProcessNode[]/ProcessEdge[] graphs
- **Confidence scoring**: Each discovered workflow has a confidence score indicating how reliably the scanner extracted it

**Constraint:** This enhancement does **not modify** any existing Process Studio components. It adds new components, API routes, a database table, and a scanner service that integrate alongside the existing implementation.

---

## 2. Requirements

### 2.1 Functional Requirements

| # | Requirement | Description |
|---|-------------|-------------|
| DR1 | Automatic Discovery | The engine scans the TutorWise codebase and database to discover existing business workflows automatically |
| DR2 | Selective Visualisation | Users can import one discovered workflow or all discovered workflows onto the Process Studio canvas |
| DR3 | Three Sync Modes | Support real-time (push), near-real-time (on-demand), and manual refresh discovery |
| DR4 | Manual Refresh | A visible refresh button triggers an on-demand re-scan of all or specific source types |
| DR5 | Confidence Scoring | Each discovered workflow displays a confidence score (high/medium/low) indicating extraction reliability |
| DR6 | Source Categorisation | Discovered workflows are categorised by source type (status enum, API route, cron job, etc.) and business domain (bookings, listings, onboarding, etc.) |
| DR7 | Import to Canvas | Importing a discovered workflow loads its nodes and edges into the existing Process Studio canvas in ReactFlow format |
| DR8 | Batch Import | "Import All" creates multiple saved workflow processes from all discoveries |
| DR9 | Dismiss/Hide | Users can dismiss irrelevant discoveries so they don't reappear |

### 2.2 Non-Functional Requirements

| # | Requirement | Description |
|---|-------------|-------------|
| NR1 | Performance | Full codebase scan completes in < 30 seconds |
| NR2 | Incremental | Re-scans only process changed files when possible |
| NR3 | Non-blocking | Scanning runs server-side and does not block the UI |
| NR4 | Additive | No modifications to existing Process Studio components |
| NR5 | Consistent | Discovered workflows use the same ProcessNode/ProcessEdge types as manually created workflows |

### 2.3 What This Enables

| Capability | Before Discovery Engine | After Discovery Engine |
|------------|------------------------|----------------------|
| **Visibility** | Workflows exist only in code — invisible to non-developers | All workflows surfaced in Process Studio with visual diagrams |
| **Audit** | No single view of all platform processes | Complete process inventory with source tracing |
| **Onboarding** | New team members must read code to understand flows | Visual process maps auto-generated from codebase |
| **Governance** | No way to verify documented processes match code | Discovered processes can be compared to documented templates |
| **Iteration** | Changing a workflow requires reading multiple files | Import → edit visually → export updated process definition |

---

## 3. Key Decisions

### 3.1 Scanner Architecture — Server-Side

**Decision:** All scanning happens server-side in Next.js API routes, not client-side.

**Rationale:**
- Scanner needs filesystem access (glob patterns over `apps/web/src/`)
- Scanner needs database access (query `information_schema` for triggers/functions)
- Security — client should never have direct filesystem or raw DB access
- Gemini AI calls require server-side API keys

### 3.2 AI Provider — Gemini 2.0 Flash

**Decision:** Use `gemini-2.0-flash` for code-to-workflow conversion, same as Process Studio's parse/chat endpoints.

**Rationale:**
- Consistent with existing Process Studio AI integration
- Structured JSON output via `responseMimeType: 'application/json'`
- Fast and cost-effective (~$0.001 per scan call)
- Temperature 0.2 for deterministic structure extraction

### 3.3 Storage — Supabase Table with Realtime Publication

**Decision:** Store discovery results in a new `workflow_discovery_results` table, published to Supabase Realtime.

**Rationale:**
- Supabase Realtime enables push-based updates to the Discovery Panel
- Persistent storage allows comparing scans over time
- RLS policies restrict access to admins
- Same pattern as `workflow_processes` and `workflow_process_templates`

### 3.4 UI Location — Discovery Tab in Process Studio

**Decision:** Add a "Discovery" tab alongside the existing "Design" tab in Process Studio, not a separate page.

**Rationale:**
- Users stay in the same context when switching between discovery and design
- "Import to Canvas" seamlessly loads into the adjacent canvas
- Follows the existing `HubTabs` pattern (underline style tabs)
- No new route needed — same `/admin/process-studio` page

### 3.5 Implementation Approach — Phased

**Decision:** Implement in 4 phases, starting with the simplest scanners and manual refresh, progressing to real-time.

**Rationale:**
- Phase 1 delivers immediate value with 2 scanners + manual refresh
- Each phase is independently shippable
- Real-time (most complex) deferred to Phase 4
- Mirrors the phased approach used for Process Studio itself

### 3.6 Direct Mapping for Structured Sources — Skip AI Where Possible

**Decision:** CAS WorkflowDefinitions and explicit state transition maps (e.g., `VALID_TRANSITIONS`) are converted to ProcessNode[]/ProcessEdge[] via **direct programmatic mapping** — no Gemini AI call. AI is only used for unstructured sources (cron job code, API route handlers).

**Rationale:**
- CAS `WorkflowDefinition` objects already have typed `steps[]` and `tasks[]` — parsing them programmatically is deterministic and instant
- Explicit `VALID_TRANSITIONS` maps define exact state machines — direct conversion is 100% accurate
- Skipping AI for structured sources reduces scan time by ~60% and eliminates unnecessary API costs
- Produces **high confidence** results by definition (no AI hallucination risk)

**AI is used for:**
- Cron job handlers (unstructured imperative code)
- API route groupings (inferred business pipelines)
- Database trigger function bodies (SQL procedural logic)

**AI is NOT used for:**
- CAS WorkflowDefinition objects (direct mapping)
- Status enums with explicit transition maps (direct mapping)
- Onboarding directory structure (directory listing → step sequence)
- Status enums without transition maps (simple linear sequence from union type values)

### 3.7 Deduplication & Merging Strategy

**Decision:** Discovered workflows are grouped by **business domain** (bookings, onboarding, listings, etc.). When multiple scanners discover overlapping workflows for the same domain, they are presented as **related variants** under a domain group header, not merged automatically.

**Rationale:**
- Automatic merging risks producing incorrect combined workflows
- Different scanners capture different perspectives (status enum shows states, cron shows automation, API shows user interactions) — all perspectives are valuable
- Users can manually merge by importing one variant and editing it
- Domain grouping prevents the discovery list from feeling like a wall of duplicates

**Grouping logic:**
- Match `category` field (bookings, listings, onboarding, referrals, financials, reviews)
- Within a group, show count: "Booking workflows (3 discovered)" expandable to see all 3 variants
- Each variant shows its source badge (STATUS, CRON, API) so users understand the perspective

### 3.8 Template Overlap Detection & Staleness Flagging

**Decision:** Each discovered workflow is compared against existing `workflow_process_templates` to detect overlaps. When a match is found, the discovery card shows one of three states:

| State | Meaning | User Action |
|-------|---------|-------------|
| **Matches template** | Discovered workflow aligns with existing template | No action needed — "Up to date" badge |
| **Template outdated** | Discovered workflow has steps/transitions that differ from the template | Flag: "Template may be outdated" with [Update Template] and [Review Diff] buttons |
| **No template** | No matching template exists | Standard import flow |

**Staleness detection approach:**
1. Compare discovered step count vs template step count
2. Compare discovered step labels (fuzzy match) vs template preview_steps
3. If >30% of steps differ, flag as "Template may be outdated"

**Update actions:**
- **Manual update**: Opens the existing template in the Design tab for manual editing alongside the discovered workflow
- **Auto-update**: Replaces the template's nodes/edges with the discovered workflow's nodes/edges (with confirmation dialog: "Replace template 'Booking Lifecycle' with discovered workflow? This cannot be undone.")

**Rationale:**
- Keeps templates in sync with actual codebase — prevents documentation drift
- Auto-update saves time for clear-cut cases
- Manual review option for ambiguous cases
- Confirmation dialog prevents accidental overwrites

### 3.9 Vercel Timeout Handling — Per-Source Scanning

**Decision:** Instead of scanning all 6 sources in a single API call, each source type is scanned via a **separate API call**. The client orchestrates parallel per-source scans.

**Rationale:**
- Vercel Pro functions have a 60-second timeout; scanning all sources with AI calls could exceed this
- Per-source calls typically complete in 5-15 seconds each
- If one source scanner fails, others still succeed
- Client can show progressive results as each source completes
- Enables targeted re-scans: "Refresh only cron jobs"

**Implementation:**
```
Client triggers scan:
  POST /api/process-studio/discovery/scan { sourceTypes: ['status_enum'] }
  POST /api/process-studio/discovery/scan { sourceTypes: ['cas_workflow'] }
  POST /api/process-studio/discovery/scan { sourceTypes: ['cron_job'] }
  POST /api/process-studio/discovery/scan { sourceTypes: ['onboarding'] }
  POST /api/process-studio/discovery/scan { sourceTypes: ['api_route'] }
  POST /api/process-studio/discovery/scan { sourceTypes: ['db_trigger'] }

  → 6 parallel requests, each within Vercel timeout
  → Results appear progressively as each completes
  → UI shows "Scanning... (3/6 sources complete)"
```

### 3.10 Two-Pass Scanning — Fast Preview, AI on Demand

**Decision:** Scanning uses a **two-pass approach**:

- **Pass 1 (Fast scan, < 5 seconds):** Extract raw metadata without AI — source names, status values, step counts, file paths. Show lightweight preview cards immediately.
- **Pass 2 (AI analysis, on demand):** When the user clicks "Analyse" on a specific result, run Gemini to generate the full ProcessNode[]/ProcessEdge[] graph. Or "Analyse All" to batch-process.

**Rationale:**
- Initial scan is near-instant — users see results in < 5 seconds instead of 30
- AI costs are incurred only for workflows the user actually wants to visualise
- Reduces wasted Gemini calls on workflows the user may dismiss
- Structured sources (CAS, status enums with transitions) skip Pass 2 entirely — they get full graphs from Pass 1 via direct mapping

**Card states:**
| State | What's Shown | Actions |
|-------|-------------|---------|
| **Preview** (Pass 1) | Name, source, category, raw step names/count. No graph. | [Analyse] [Dismiss] |
| **Analysed** (Pass 2) | Full graph preview, confidence score, preview steps with arrows | [Import to Canvas] [Dismiss] |
| **Direct Mapped** | Full graph immediately (CAS, explicit transitions) | [Import to Canvas] [Dismiss] |

### 3.11 Selective Batch Import

**Decision:** "Import All" is replaced with **checkbox selection + "Import Selected"**. A "Select All" shortcut is available.

**Rationale:**
- Importing 20+ workflows at once creates clutter in saved processes
- Users typically want to import a curated subset
- Checkboxes provide fine-grained control
- "Select All" preserves the bulk-import capability for users who want it

**UI:**
- Each DiscoveryCard has a checkbox (left side)
- Bottom bar shows: "3 of 12 selected" + [Import Selected] button
- "Select All" / "Deselect All" toggle in toolbar

---

## 4. Architecture Overview

### 4.1 High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DISCOVERY SOURCES                            │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │  Status   │ │   API    │ │   Cron   │ │Onboarding│              │
│  │  Enums    │ │  Routes  │ │   Jobs   │ │  Flows   │              │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘              │
│       │             │            │             │                     │
│  ┌────┴─────┐ ┌────┴─────┐                                        │
│  │   CAS    │ │    DB    │                                         │
│  │Workflows │ │ Triggers │                                         │
│  └────┬─────┘ └────┬─────┘                                        │
│       │             │                                               │
└───────┴─────────────┴───────────────────────────────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────┐
        │    Scanner Service            │   Server-side (per-source API calls)
        │  ┌────────────────────────┐   │
        │  │ Pass 1: Fast Scan      │   │   Extract raw metadata
        │  │ (glob + regex + DB)    │   │   Names, step counts, file paths
        │  └───────────┬────────────┘   │   < 5 seconds per source
        │              │                │
        │     ┌────────┴────────┐       │
        │     │                 │       │
        │  ┌──▼──────────┐  ┌──▼────┐  │
        │  │ Structured? │  │  Raw  │  │
        │  │ (CAS, enums │  │ (cron,│  │
        │  │  w/ maps)   │  │  API, │  │
        │  └──┬──────────┘  │  SQL) │  │
        │     │              └──┬────┘  │
        │  ┌──▼──────────┐     │       │
        │  │Direct Mapper│     │       │   No AI needed
        │  │(programmatic│     │       │   100% confidence
        │  │ conversion) │     │       │
        │  └──┬──────────┘     │       │
        │     │                │       │
        │     │   ┌────────────▼────┐  │
        │     │   │Pass 2: AI       │  │   On demand (user clicks
        │     │   │(Gemini 2.0      │  │   "Analyse" or "Analyse All")
        │     │   │ Flash)          │  │
        │     │   └────────┬────────┘  │
        │     │            │           │
        │  ┌──▼────────────▼────────┐  │
        │  │ Validator + Overlap    │  │   Validate structure +
        │  │ Detector               │  │   compare vs templates
        │  └───────────┬────────────┘  │
        └──────────────┼───────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │  workflow_discovery_    │   Supabase (PostgreSQL)
        │  results                │   + Realtime publication
        └───────────┬─────────────┘
                    │
          ┌─────────┼──────────┐
          │         │          │
          ▼         ▼          ▼
     ┌────────┐ ┌───────┐ ┌──────────┐
     │Realtime│ │  API   │ │  Manual  │
     │  Push  │ │  Poll  │ │ Refresh  │
     │(Phase4)│ │(Phase1)│ │ (Phase1) │
     └───┬────┘ └───┬───┘ └────┬─────┘
         │          │           │
         └──────────┼───────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │    Discovery Panel      │   Client-side (React)
        │  ┌───────────────────┐  │
        │  │ DiscoveryCard(s)  │  │   List of discovered workflows
        │  │ with confidence,  │  │   with filters and actions
        │  │ source, preview   │  │
        │  └────────┬──────────┘  │
        │           │             │
        │  ┌────────▼──────────┐  │
        │  │ Import to Canvas  │  │   Load into ProcessStudioCanvas
        │  │ (single or batch) │  │   as ProcessNode[] / ProcessEdge[]
        │  └───────────────────┘  │
        └─────────────────────────┘
```

### 4.2 Component Architecture

```
ProcessStudio (existing)
├── HubTabs
│   ├── Design Tab (existing — unchanged)
│   │   ├── Toolbar
│   │   ├── ChatPanel
│   │   ├── ProcessStudioCanvas
│   │   └── PropertiesDrawer
│   │
│   └── Discovery Tab (NEW)
│       ├── DiscoveryToolbar              (refresh button, scan status, filters)
│       │   ├── RefreshButton             (manual scan trigger)
│       │   ├── ScanStatusIndicator       (scanning... / last scanned at)
│       │   └── SourceFilter              (dropdown: all / status enums / cron / etc.)
│       │
│       ├── DiscoveryPanel                (scrollable list of results)
│       │   ├── DomainGroup               (grouped by business domain)
│       │   │   ├── GroupHeader            ("Booking workflows (3 discovered)")
│       │   │   └── DiscoveryCard          (one per discovered workflow)
│       │   │       ├── Checkbox           (for selective batch import)
│       │   │       ├── WorkflowName
│       │   │       ├── SourceBadge        (STATUS / CRON / CAS / API / TRIGGER / ONBOARD)
│       │   │       ├── StateBadge         (Preview / Analysed / Direct Mapped)
│       │   │       ├── ConfidenceBadge    (high / medium / low — after analysis)
│       │   │       ├── TemplateBadge      (Up to date / Outdated / No template)
│       │   │       ├── PreviewSteps       (step names — after analysis or direct map)
│       │   │       ├── AnalyseButton      (Pass 2 trigger — for Preview state only)
│       │   │       ├── ImportButton       ("Import to Canvas" — for Analysed/Mapped)
│       │   │       ├── UpdateTemplateBtn  (if template flagged as outdated)
│       │   │       └── DismissButton      (hide this result)
│       │   └── ... more DomainGroups
│       │
│       ├── BatchActions                  (bottom bar)
│       │   ├── SelectAllToggle           ("Select All / Deselect All")
│       │   ├── AnalyseAllButton          ("Analyse All" — triggers Pass 2 for unanalysed)
│       │   ├── ImportSelectedButton      ("Import Selected (3)")
│       │   └── SelectionCount            ("3 of 12 selected")
│       │
│       └── EmptyState / LoadingState / ErrorState
│
└── DiscoveryStore (NEW — separate Zustand store)
    ├── discoveryResults: DiscoveryResult[]
    ├── isScanning: boolean
    ├── scanProgress: { completed: number; total: number }
    ├── lastScannedAt: Date | null
    ├── sourceFilter: SourceType | 'all'
    ├── confidenceFilter: ConfidenceLevel | 'all'
    ├── selectedIds: Set<string>
    ├── dismissedIds: Set<string>
    └── templateOverlaps: Map<string, TemplateOverlap>
```

### 4.3 Integration Points with Existing Process Studio

The Discovery Engine connects to the existing Process Studio at exactly **two points**:

1. **Tab system**: A new "Discovery" tab is added to the existing `HubTabs` component on the Process Studio page (`page.tsx`). This is a page-level change, not a component-level change.

2. **Canvas loading**: When the user clicks "Import to Canvas", the discovered `ProcessNode[]` and `ProcessEdge[]` are passed to the same `onSelect` callback pattern used by `TemplateSelector`. The existing canvas, toolbar, and properties drawer handle them identically to template-loaded workflows.

No existing components are modified — the integration happens at the page composition level.

---

## 5. Discoverable Workflow Sources

### 5.1 Source 1: Status Enums (State Machines)

**Location:** `apps/web/src/types/index.ts` and related type files

**What to scan:** TypeScript type aliases that define ordered status progressions.

**Discovered workflows:**

| Status Type | States | Business Process |
|-------------|--------|-----------------|
| `BookingStatus` | Pending → Confirmed → Completed / Cancelled | Booking lifecycle |
| `SchedulingStatus` | unscheduled → proposed → scheduled | Session scheduling negotiation |
| `PaymentStatus` | Pending → Paid / Failed / Refunded | Payment processing |
| `TransactionStatus` | Pending → Paid → clearing → available → paid_out / disputed / refunded | Financial transaction lifecycle (v4.9) |
| `RelationshipStatus` | PENDING → ACTIVE / BLOCKED / COMPLETED | Social connection lifecycle |
| `BookingReviewStatus` | pending → published / expired | Review collection |
| `ReferralStatus` | Referred → Signed Up → Converted / Expired | Referral funnel |
| `CalendarConnectionStatus` | active / error / disconnected | Calendar integration health |
| `CalendarEventSyncStatus` | pending → synced / error / deleted | Calendar sync workflow |
| `NoShowStatus` | pending_review → confirmed / disputed | No-show detection |
| `ReminderStatus` | pending → sent / failed | Reminder delivery |
| `SeriesStatus` | active / paused / cancelled | Recurring booking management |
| `SubscriptionStatus` | trialing → active / past_due / canceled / incomplete / incomplete_expired | Subscription lifecycle |
| `TruelayerPaymentStatus` | authorization_required → authorizing → authorized → executed → settled / failed | Open banking payment flow |

**Scanner approach:**
1. Glob for `*.ts` files in `apps/web/src/types/`
2. Regex extract `export type \w+Status = ` patterns
3. Parse union type values
4. Pass to Gemini to generate workflow graph with transitions

**Explicit state transitions found:**

```typescript
// apps/web/src/app/api/bookings/[id]/status/route.ts
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  'Pending': ['Confirmed', 'Cancelled', 'Declined'],
  'Confirmed': ['Completed', 'Cancelled'],
  'Completed': [],
  'Cancelled': [],
  'Declined': [],
};
```

Where explicit transition maps exist, the scanner uses them directly instead of AI inference, producing **high confidence** results.

### 5.2 Source 2: Cron Jobs (Scheduled Workflows)

**Location:** `apps/web/src/app/api/cron/`

**What to scan:** Each cron job `route.ts` file defines a complete automated workflow.

**Discovered workflows:**

| Cron Job | Schedule | Process |
|----------|----------|---------|
| `complete-sessions` | Hourly | Auto-complete bookings → trigger review emails |
| `no-show-detection` | Every 15min | Detect no-shows → create reports → send alerts |
| `session-reminders` | Multi-interval | Send 24h / 1h / 15min reminders before sessions |
| `weekly-reports` | Weekly Mon 8am | Generate tutor/agent performance reports |
| `expire-invitations` | Daily 3am | Expire old guardian invitation tokens |
| `edupay-clear-pending` | Scheduled | Clear pending EduPay conversion requests |
| `process-batch-payouts` | Scheduled | Handle batch payment processing |
| `process-pending-commissions` | Scheduled | Process referral commissions |
| `seo-sync` | Scheduled | Sync SEO data with Google Search Console |
| `cas-dspy-optimize` | Scheduled | CAS DSPy optimisation workflow |

**Scanner approach:**
1. Glob for `apps/web/src/app/api/cron/*/route.ts`
2. Read each file, extract function body
3. Pass to Gemini with prompt: "Extract the workflow steps from this cron job handler"
4. Generate sequential workflow graph

### 5.3 Source 3: Onboarding Flows (Multi-Step Wizards)

**Location:** `apps/web/src/app/(authenticated)/onboarding/`

**What to scan:** Directory structure defines the step sequence for each role.

**Discovered workflows:**

| Flow | Steps | Path |
|------|-------|------|
| Client Onboarding | personal-info → professional-details → verification → availability | `/onboarding/client/` |
| Tutor Onboarding | personal-info → professional-details → verification → availability | `/onboarding/tutor/` |
| Agent Onboarding | personal-info → professional-details → verification → availability | `/onboarding/agent/` |

**Scanner approach:**
1. Glob for `apps/web/src/app/(authenticated)/onboarding/*/`
2. List subdirectories as steps (ordered by convention)
3. Read step page components to extract descriptions
4. Generate wizard-style workflow graph

**Shared components also scanned:**
- `OnboardingProgressBar.tsx` — confirms step order
- `TutorOnboardingStep` type — explicit step enum

### 5.4 Source 4: CAS Workflows (Multi-Agent Orchestration)

**Location:** `cas/packages/core/src/workflows/TutorWiseWorkflows.ts`

**What to scan:** Structured `WorkflowDefinition` objects with typed steps and tasks.

**Discovered workflows:**

| Workflow | Agents | Steps | Duration |
|----------|--------|-------|----------|
| Content Strategy | Analyst → Marketer | 4 sequential | 5-10 min |
| Feature Development | Analyst → Planner → Developer → Tester → QA | 5 (seq + parallel) | 15-20 min |
| User Onboarding | Planner → Analyst → Marketer → Developer | 4 (seq + parallel) | 8-12 min |
| Platform Health Check | Analyst → Engineer → Security → QA | 3 (seq + parallel) | 10-15 min |

**Scanner approach:**
1. Read `TutorWiseWorkflows.ts` directly
2. Parse `WorkflowDefinition` objects (they're already structured)
3. Map `WorkflowStep` → ProcessNode, step connections → ProcessEdge
4. Parallel steps become branching condition nodes

This is the **highest confidence** source because the data is already structured as workflow definitions.

### 5.5 Source 5: API Routes (Request-Response Pipelines)

**Location:** `apps/web/src/app/api/`

**What to scan:** Route groupings that form logical business pipelines.

**Discovery approach:** Rather than scanning all 300 routes individually, the scanner groups routes by business domain:

| Domain | Route Pattern | Process |
|--------|--------------|---------|
| Bookings | `/api/bookings/[id]/*` | CRUD + status transitions + scheduling + cancellation |
| Listings | `/api/listings/*` | Create → publish → search indexing |
| Referrals | `/api/referrals/*` | Create → track → convert → reward |
| Reviews | `/api/reviews/*` | Submit → moderate → publish |
| Payments | `/api/payments/*` | Initiate → process → reconcile → notify |
| Calendar | `/api/calendar/*` | Connect → sync → manage events |

**Scanner approach:**
1. Glob for `apps/web/src/app/api/*/route.ts` (top-level domains)
2. Group routes by first path segment
3. Read route handlers to extract HTTP methods and business logic
4. Pass grouped routes to Gemini: "Infer the business workflow from these API endpoints"
5. Generate workflow graph per domain

### 5.6 Source 6: Database Triggers & Functions

**Location:** `tools/database/migrations/*.sql` and live database

**What to scan:** PostgreSQL triggers that fire on data changes, implementing event-driven workflows.

**Discovered workflows:**

| Trigger/Function | Event | Process |
|-----------------|-------|---------|
| `on_booking_completed_create_review` | Booking → Completed | Auto-create review session with 7-day deadline |
| `trigger_queue_on_profile_update` | Profile field changes | Queue CaaS score recalculation |
| `trigger_queue_on_new_review` | New review inserted | Recalculate tutor/agent CaaS score |
| `trigger_queue_on_booking_status` | Booking status change | Update CaaS metrics |
| `trigger_queue_on_recording_url` | Recording URL updated | Process session recording |
| `trigger_queue_on_profile_graph` | Connection changes | Recalculate social CaaS score |
| `trigger_queue_on_integration_link` | Calendar link changes | Update integration CaaS score |
| `update_referral_conversion_stage` | Referral stage change | Move through conversion funnel |

**Scanner approach:**
1. Query `information_schema.triggers` via Supabase to list all triggers
2. Read migration SQL files to get trigger function bodies
3. Pass to Gemini: "Extract the event-driven workflow from these database triggers"
4. Generate event-triggered workflow graphs

---

## 6. Database Design

### 6.1 New Table: `workflow_discovery_results`

```sql
CREATE TABLE workflow_discovery_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,                           -- e.g., "Booking Lifecycle"
  description TEXT,                             -- What this workflow does
  source_type TEXT NOT NULL,                    -- 'status_enum' | 'cron_job' | 'onboarding' | 'cas_workflow' | 'api_route' | 'db_trigger'
  source_identifier TEXT NOT NULL,              -- e.g., "BookingStatus" or "complete-sessions" or "tutor"
  source_file_paths TEXT[],                     -- Files this was discovered from

  -- Business categorisation
  category TEXT,                                -- 'bookings' | 'listings' | 'onboarding' | 'referrals' | 'financials' | 'reviews' | etc.

  -- Workflow graph data (same format as workflow_processes)
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,     -- ProcessNode[] in ReactFlow format
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,     -- ProcessEdge[] in ReactFlow format
  preview_steps TEXT[],                         -- First 4-5 step names for card preview

  -- Pass 1 metadata (always present)
  step_count INTEGER NOT NULL DEFAULT 0,
  step_names TEXT[],                            -- Raw step/status names for preview
  raw_content TEXT,                             -- Source code for Pass 2 AI analysis

  -- Quality (populated after analysis or direct mapping)
  confidence TEXT DEFAULT 'medium',             -- 'high' | 'medium' | 'low'
  confidence_reason TEXT,                       -- Why this confidence level

  -- Analysis state (two-pass)
  analysis_state TEXT NOT NULL DEFAULT 'preview',  -- 'preview' | 'analysed' | 'direct_mapped'

  -- Lifecycle state
  status TEXT NOT NULL DEFAULT 'discovered',    -- 'discovered' | 'imported' | 'dismissed'
  imported_process_id UUID REFERENCES workflow_processes(id),  -- If imported, link to the process

  -- Template overlap detection
  matched_template_id UUID REFERENCES workflow_process_templates(id),
  template_match_state TEXT,                    -- 'matches' | 'outdated' | null (no template)
  template_match_score REAL,                    -- 0-1 similarity score

  -- Scan metadata
  scan_id UUID,                                 -- Groups results from the same scan run
  scanned_at TIMESTAMPTZ DEFAULT now(),
  scan_duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_discovery_source_type ON workflow_discovery_results(source_type);
CREATE INDEX idx_discovery_category ON workflow_discovery_results(category);
CREATE INDEX idx_discovery_status ON workflow_discovery_results(status);
CREATE INDEX idx_discovery_confidence ON workflow_discovery_results(confidence);
CREATE INDEX idx_discovery_analysis_state ON workflow_discovery_results(analysis_state);
CREATE INDEX idx_discovery_scan_id ON workflow_discovery_results(scan_id);

-- Unique constraint: one result per source identifier per source type
-- (re-scans UPDATE existing rows rather than creating duplicates)
CREATE UNIQUE INDEX idx_discovery_unique_source
  ON workflow_discovery_results(source_type, source_identifier)
  WHERE status != 'dismissed';

-- RLS
ALTER TABLE workflow_discovery_results ENABLE ROW LEVEL SECURITY;

-- Admins only — discovery is an admin feature
CREATE POLICY "Admins can manage discovery results"
  ON workflow_discovery_results
  FOR ALL USING (public.is_admin());

-- Enable Supabase Realtime (Phase 4)
-- ALTER PUBLICATION supabase_realtime ADD TABLE workflow_discovery_results;
```

### 6.2 New Table: `workflow_discovery_scans` (Scan History)

```sql
CREATE TABLE workflow_discovery_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by UUID REFERENCES auth.users(id),
  source_types TEXT[],                           -- Which sources were scanned
  status TEXT NOT NULL DEFAULT 'running',        -- 'running' | 'completed' | 'failed'
  results_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE workflow_discovery_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discovery scans"
  ON workflow_discovery_scans
  FOR ALL USING (public.is_admin());
```

### 6.3 Migration

**File:** `tools/database/migrations/334_create_workflow_discovery.sql`

Contains both tables above.

---

## 7. Scanner Service

### 7.1 Architecture

The scanner service is a server-side module invoked by API routes. It orchestrates 6 source-specific scanners and a shared AI analysis step.

```
scanner/
├── index.ts                    # ScannerService orchestrator
├── sources/
│   ├── status-enum-scanner.ts  # Scans TypeScript status types
│   ├── cron-job-scanner.ts     # Scans cron job route handlers
│   ├── onboarding-scanner.ts   # Scans onboarding directory structure
│   ├── cas-workflow-scanner.ts # Parses CAS WorkflowDefinition objects
│   ├── api-route-scanner.ts    # Groups and analyses API route domains
│   └── db-trigger-scanner.ts   # Queries database triggers
├── ai-analyzer.ts              # Gemini AI code-to-workflow conversion
└── types.ts                    # Scanner-specific types
```

**Location:** `apps/web/src/lib/process-studio/scanner/`

### 7.2 Scanner Interface

Each source scanner implements a common interface with two-pass support:

```typescript
interface SourceScanner {
  sourceType: SourceType;

  /** Pass 1: Fast metadata extraction (no AI). Always called. */
  scan(): Promise<RawDiscovery[]>;

  /** Does this scanner produce fully-structured output (skip AI)? */
  isStructured: boolean;
}

interface RawDiscovery {
  name: string;
  description: string;
  sourceType: SourceType;
  sourceIdentifier: string;
  sourceFilePaths: string[];
  category: string;
  rawContent: string;           // Code/SQL content for AI analysis (Pass 2)
  confidence: ConfidenceLevel;
  confidenceReason: string;

  // Pass 1 metadata (always present)
  stepCount: number;
  stepNames: string[];           // Raw step/status names for preview

  // Direct-mapped graph (only for structured sources)
  nodes?: ProcessNode[];         // Present if isStructured = true
  edges?: ProcessEdge[];         // Present if isStructured = true
  previewSteps?: string[];       // Present if isStructured = true
}

type SourceType = 'status_enum' | 'cron_job' | 'onboarding' | 'cas_workflow' | 'api_route' | 'db_trigger';
type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Discovery result states */
type DiscoveryAnalysisState = 'preview' | 'analysed' | 'direct_mapped';
```

**Source → Analysis Path mapping:**

| Source | isStructured | Pass 1 Output | Pass 2 Needed? |
|--------|-------------|---------------|----------------|
| CAS Workflows | Yes | Full graph via direct mapping | No |
| Status Enums (with VALID_TRANSITIONS) | Yes | Full graph via direct mapping | No |
| Status Enums (without transitions) | Yes | Linear sequence from union values | No |
| Onboarding Flows | Yes | Step sequence from directory listing | No |
| Cron Jobs | No | Name + file path + raw handler code | Yes (AI) |
| API Routes | No | Grouped route list + HTTP methods | Yes (AI) |
| DB Triggers | No | Trigger name + function body | Yes (AI) |

### 7.3 AI Analyzer

The AI analyzer converts raw discoveries into ProcessNode[]/ProcessEdge[] graphs:

```typescript
// apps/web/src/lib/process-studio/scanner/ai-analyzer.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are a business process analyst. Given source code or configuration
that defines a workflow, extract it into a structured process graph.

For each step, provide:
- id: Unique identifier (trigger-1, action-1, condition-1, etc.)
- label: Short name (2-5 words)
- type: trigger | action | condition | approval | notification | end
- description: What happens in this step

Return a JSON object with:
- nodes: Array of { id, type: "processStep", position: { x, y }, data: { label, type, description, editable: true } }
- edges: Array of { id, source, target, animated: true, label? }
- preview_steps: Array of first 5 step label strings

Position nodes vertically: x=300, y starts at 50, increment by 120.
Ensure the graph starts with a trigger node and ends with an end node.`;

async function analyzeToWorkflow(rawContent: string, context: string): Promise<{
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  preview_steps: string[];
}> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent([
    { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nContext: ${context}\n\nSource:\n${rawContent}` }] },
  ]);

  const parsed = JSON.parse(result.response.text());
  // Validate using shared utilities from parse/route.ts
  return validateAndFormat(parsed);
}
```

**Shared utilities reused from `apps/web/src/app/api/process-studio/parse/route.ts`:**
- `validateWorkflow()` — validates node/edge structure
- `toReactFlowFormat()` — converts to ReactFlow format with positions
- `VALID_TYPES` set — validates node types

### 7.4 Confidence Scoring

| Confidence | Criteria | Examples |
|------------|----------|---------|
| **High** | Structured source with explicit steps/transitions | CAS WorkflowDefinition objects, explicit VALID_TRANSITIONS maps |
| **Medium** | Semi-structured source requiring AI interpretation | Cron job handlers, onboarding directory structure |
| **Low** | Unstructured source requiring significant AI inference | API route groupings, general database triggers |

### 7.5 Scanner Orchestrator

```typescript
// apps/web/src/lib/process-studio/scanner/index.ts

class ScannerService {
  private scanners: Map<SourceType, SourceScanner>;

  constructor() {
    this.scanners = new Map([
      ['status_enum', new StatusEnumScanner()],
      ['cron_job', new CronJobScanner()],
      ['onboarding', new OnboardingScanner()],
      ['cas_workflow', new CASWorkflowScanner()],
      ['api_route', new APIRouteScanner()],
      ['db_trigger', new DBTriggerScanner()],
    ]);
  }

  /**
   * Pass 1: Fast scan for a single source type.
   * Called per-source from separate API calls to avoid Vercel timeouts.
   * Structured sources get full graphs immediately (direct mapping).
   * Unstructured sources get preview metadata only.
   */
  async scanSource(sourceType: SourceType): Promise<DiscoveryResult[]> {
    const scanner = this.scanners.get(sourceType);
    if (!scanner) throw new Error(`Unknown source type: ${sourceType}`);

    const rawDiscoveries = await scanner.scan();

    return rawDiscoveries.map(raw => ({
      ...raw,
      analysisState: scanner.isStructured ? 'direct_mapped' : 'preview',
      // Structured sources already have nodes/edges from direct mapping
      // Unstructured sources have stepNames only — need Pass 2 for full graph
    }));
  }

  /**
   * Pass 2: AI analysis for a single discovery result.
   * Called on demand when user clicks "Analyse".
   */
  async analyzeOne(discoveryId: string, rawContent: string, context: string): Promise<{
    nodes: ProcessNode[];
    edges: ProcessEdge[];
    previewSteps: string[];
    confidence: ConfidenceLevel;
  }> {
    return analyzeToWorkflow(rawContent, context);
  }

  /**
   * Pass 2 batch: AI analysis for multiple discoveries.
   * Processes in batches of 3 to respect rate limits.
   */
  async analyzeBatch(discoveries: Array<{ id: string; rawContent: string; context: string }>): Promise<Map<string, AnalysisResult>> {
    const results = new Map<string, AnalysisResult>();

    for (let i = 0; i < discoveries.length; i += 3) {
      const batch = discoveries.slice(i, i + 3);
      const analyzed = await Promise.allSettled(
        batch.map(d => this.analyzeOne(d.id, d.rawContent, d.context))
      );

      batch.forEach((d, idx) => {
        const result = analyzed[idx];
        if (result.status === 'fulfilled') {
          results.set(d.id, result.value);
        }
      });
    }

    return results;
  }
}
```

### 7.6 Template Overlap Detector

```typescript
// apps/web/src/lib/process-studio/scanner/overlap-detector.ts

interface TemplateOverlap {
  templateId: string;
  templateName: string;
  matchScore: number;           // 0-1, where 1 = perfect match
  state: 'matches' | 'outdated' | 'no_template';
  differences?: string[];       // Human-readable list of differences
}

async function detectOverlap(
  discovery: DiscoveryResult,
  templates: WorkflowProcessTemplate[]
): Promise<TemplateOverlap> {
  // 1. Find template with matching category + similar name (fuzzy)
  const candidate = templates.find(t =>
    t.category === discovery.category &&
    fuzzyMatch(t.name, discovery.name) > 0.6
  );

  if (!candidate) return { state: 'no_template', matchScore: 0 };

  // 2. Compare step counts and labels
  const discoveredSteps = discovery.previewSteps || [];
  const templateSteps = candidate.preview_steps || [];

  const matchingSteps = discoveredSteps.filter(s =>
    templateSteps.some(ts => fuzzyMatch(s, ts) > 0.7)
  );

  const matchScore = matchingSteps.length / Math.max(discoveredSteps.length, templateSteps.length, 1);

  // 3. Determine state
  if (matchScore > 0.7) {
    return { templateId: candidate.id, templateName: candidate.name, matchScore, state: 'matches' };
  } else {
    const differences = computeDifferences(discoveredSteps, templateSteps);
    return { templateId: candidate.id, templateName: candidate.name, matchScore, state: 'outdated', differences };
  }
}
```

---

## 8. API Routes

### 8.1 Discovery Routes

**Base path:** `/api/process-studio/discovery/`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/process-studio/discovery` | List all discovery results (with filters) |
| `POST` | `/api/process-studio/discovery/scan` | Trigger Pass 1 scan (per source type) |
| `POST` | `/api/process-studio/discovery/[id]/analyse` | Trigger Pass 2 AI analysis for one result |
| `POST` | `/api/process-studio/discovery/analyse-batch` | Trigger Pass 2 AI analysis for multiple results |
| `GET` | `/api/process-studio/discovery/scans` | List scan history |
| `POST` | `/api/process-studio/discovery/[id]/import` | Import single result to canvas / saved process |
| `POST` | `/api/process-studio/discovery/import-batch` | Import selected results as saved processes |
| `POST` | `/api/process-studio/discovery/[id]/update-template` | Auto-update an outdated template from discovery |
| `PATCH` | `/api/process-studio/discovery/[id]` | Update result (e.g., dismiss) |
| `DELETE` | `/api/process-studio/discovery/[id]` | Delete a discovery result |

### 8.2 Scan Trigger Endpoint (Per-Source)

```typescript
// POST /api/process-studio/discovery/scan
// Called once per source type to stay within Vercel timeout limits.
// Client sends 6 parallel requests for a full scan.

interface ScanRequest {
  sourceTypes: SourceType[];   // Exactly one source type per call (recommended)
}

interface ScanResponse {
  success: boolean;
  data: {
    scanId: string;
    sourceType: SourceType;
    resultsCount: number;
    duration_ms: number;
    results: DiscoveryResult[];   // Pass 1 results (preview or direct-mapped)
  };
}
```

### 8.2b Analyse Endpoint (Pass 2 — AI On Demand)

```typescript
// POST /api/process-studio/discovery/[id]/analyse
// Triggers Gemini AI analysis for a single unanalysed discovery result.

interface AnalyseResponse {
  success: boolean;
  data: {
    discoveryId: string;
    nodes: ProcessNode[];
    edges: ProcessEdge[];
    previewSteps: string[];
    confidence: ConfidenceLevel;
    confidenceReason: string;
    templateOverlap: TemplateOverlap;  // Overlap detection result
  };
}
```

### 8.2c Update Template Endpoint

```typescript
// POST /api/process-studio/discovery/[id]/update-template
// Auto-updates an existing template with discovered workflow's nodes/edges.

interface UpdateTemplateResponse {
  success: boolean;
  data: {
    templateId: string;
    templateName: string;
    previousStepCount: number;
    newStepCount: number;
  };
}
```

### 8.3 Import Endpoint

```typescript
// POST /api/process-studio/discovery/[id]/import

interface ImportResponse {
  success: boolean;
  data: {
    processId: string;       // ID of the created workflow_process
    name: string;
    nodeCount: number;
    edgeCount: number;
  };
}
```

**Behaviour:** Creates a new `workflow_processes` row from the discovery result's nodes/edges, then updates the discovery result's `status` to `'imported'` and sets `imported_process_id`.

### 8.4 Batch Import Endpoint (Selective)

```typescript
// POST /api/process-studio/discovery/import-batch

interface BatchImportRequest {
  discoveryIds: string[];     // Selected IDs to import (from checkbox selection)
}

interface BatchImportResponse {
  success: boolean;
  data: {
    imported: number;
    skipped: number;          // Already imported or not yet analysed
    failed: number;
    processes: Array<{ discoveryId: string; processId: string; name: string }>;
  };
}
```

### 8.5 List Discovery Results Endpoint

```typescript
// GET /api/process-studio/discovery?source_type=cron_job&confidence=high&status=discovered

interface DiscoveryListResponse {
  success: boolean;
  data: DiscoveryResult[];
  meta: {
    total: number;
    bySource: Record<SourceType, number>;
    byConfidence: Record<ConfidenceLevel, number>;
  };
}
```

### 8.6 Authentication & Rate Limiting

All discovery routes require admin authentication via `is_admin()`.

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST .../scan` | 5 calls | per minute |
| `GET .../discovery` | 60 calls | per minute |
| `POST .../import` | 30 calls | per minute |

---

## 9. UI Components

### 9.1 File Structure

```
apps/web/src/components/feature/process-studio/
├── (existing files — unchanged)
├── DiscoveryPanel.tsx              # Main discovery panel
├── DiscoveryPanel.module.css       # Panel styles
├── DiscoveryCard.tsx               # Individual discovery result card
├── DiscoveryCard.module.css        # Card styles
├── DiscoveryToolbar.tsx            # Refresh button, filters, scan status
├── DiscoveryToolbar.module.css     # Toolbar styles
└── discovery-types.ts              # Discovery-specific types

apps/web/src/app/hooks/
├── (existing hooks — unchanged)
└── useDiscoveryRealtime.ts         # Supabase Realtime subscription (Phase 4)
```

### 9.2 DiscoveryPanel

```
┌──────────────────────────────────────────────────────────────────┐
│  Discovery Toolbar                                                │
│  [🔄 Refresh] [Scanning... 4/6 sources]  Last scan: 2 min ago   │
│  Source: [All ▾]  Confidence: [All ▾]  [Select All] [Analyse All]│
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ── Booking workflows (3 discovered) ──────────────────────────  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ☑ Booking Lifecycle              [HIGH] [STATUS] [MAPPED] │  │
│  │   Complete booking flow from request through payment...    │  │
│  │   Request → Propose → Confirm → Pay → Session → Review    │  │
│  │   ⚠ Template "Booking Lifecycle" may be outdated (5→7 steps)│ │
│  │                   [Import to Canvas] [Update Template] [×] │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ☐ Session Auto-Complete                   [CRON] [PREVIEW]│  │
│  │   Hourly cron: auto-completes bookings after session end   │  │
│  │   3 steps detected                                         │  │
│  │   Source: apps/web/src/app/api/cron/complete-sessions      │  │
│  │                                        [Analyse] [×]      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ☐ No-Show Detection                      [CRON] [PREVIEW] │  │
│  │   Detects no-shows for sessions started >30min ago         │  │
│  │   4 steps detected                                         │  │
│  │                                        [Analyse] [×]      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ── CAS workflows (4 discovered) ─────────────────────────────  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ☑ Content Strategy Workflow       [HIGH] [CAS] [MAPPED]   │  │
│  │   Multi-agent: Analyst → Marketer (4 steps)                │  │
│  │   Analyze → Identify → Create → Optimize                   │  │
│  │   ✓ No matching template                                   │  │
│  │                              [Import to Canvas] [×]        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ... more domain groups ...                                      │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  2 of 12 selected                         [Import Selected ▶]    │
└──────────────────────────────────────────────────────────────────┘
```

### 9.3 DiscoveryCard

Each card shows:
- **Checkbox** — Left side, for selective batch import
- **Name** — Discovered workflow name
- **Source badge** — STATUS, CRON, ONBOARD, CAS, API, TRIGGER
- **Analysis state badge** — PREVIEW (grey), ANALYSED (blue), MAPPED (green)
- **Confidence badge** — HIGH (green), MEDIUM (amber), LOW (red) — only after analysis/mapping
- **Template overlap badge** — "Up to date" (green check), "Template outdated" (amber warning), or "No template" (neutral)
- **Description** — 1-2 line summary
- **Preview steps** — Arrow-separated step names (after analysis) or "N steps detected" (preview)
- **Source path** — File path(s) the workflow was discovered from
- **Actions** (vary by state):
  - Preview state: [Analyse] [Dismiss]
  - Analysed/Mapped state: [Import to Canvas] [Dismiss]
  - Template outdated: [Import to Canvas] [Update Template] [Dismiss]

**Card styling follows the same pattern as `TemplateSelector.tsx`** — full-width cards with consistent header/body/footer layout.

### 9.4 DiscoveryToolbar

- **Refresh button**: Triggers `POST /api/process-studio/discovery/scan`
- **Scan status**: "Scanning..." with spinner during active scan, "Last scan: X min ago" when idle
- **Source filter**: Dropdown to filter by source type (All / Status Enums / Cron Jobs / Onboarding / CAS / API Routes / DB Triggers)
- **Confidence filter**: Dropdown to filter by confidence level (All / High / Medium / Low)

### 9.5 Import Behaviour

**Single import ("Import to Canvas"):**
1. Creates a new `workflow_processes` row with the discovered nodes/edges
2. Navigates to the Design tab
3. Loads the nodes/edges onto the canvas (same as template loading)
4. Marks the discovery result as `status: 'imported'`

**Selective batch import ("Import Selected"):**
1. Only imports checked items that are in `analysed` or `direct_mapped` state
2. Shows confirmation modal: "Import 3 workflows as saved processes?"
3. On confirm, creates `workflow_processes` rows for each selected discovery
4. Shows success summary with count and links to open each process
5. Skips any checked items still in `preview` state (not yet analysed)

**Update template:**
1. Shows confirmation dialog: "Replace template 'Booking Lifecycle' with discovered workflow? This updates the template for all users."
2. On confirm, replaces the template's `nodes`, `edges`, and `preview_steps` with the discovery's values
3. Updates the discovery's template overlap state to `matches`
4. Shows toast: "Template 'Booking Lifecycle' updated (5→7 steps)"

---

## 10. State Management

### 10.1 Discovery Store Extension

The discovery state is added as a **separate Zustand store** (not merged into the existing `useProcessStudioStore`) to maintain separation of concerns:

```typescript
// apps/web/src/components/feature/process-studio/discovery-store.ts

import { create } from 'zustand';
import type { DiscoveryResult, SourceType, ConfidenceLevel, TemplateOverlap } from './discovery-types';

interface DiscoveryStore {
  // Data
  results: DiscoveryResult[];
  scans: ScanHistory[];
  templateOverlaps: Map<string, TemplateOverlap>;  // discoveryId → overlap info

  // UI state
  isScanning: boolean;
  scanProgress: { completed: number; total: number };
  lastScannedAt: Date | null;
  sourceFilter: SourceType | 'all';
  confidenceFilter: ConfidenceLevel | 'all';
  selectedIds: Set<string>;     // Checkbox selection for batch import
  dismissedIds: Set<string>;

  // Computed (via selectors)
  filteredResults: () => DiscoveryResult[];
  groupedResults: () => Map<string, DiscoveryResult[]>;  // Grouped by category/domain
  selectedCount: () => number;
  importableSelectedCount: () => number;  // Selected items that are analysed/mapped

  // Actions — data
  setResults: (results: DiscoveryResult[]) => void;
  addResults: (results: DiscoveryResult[]) => void;  // Append from per-source scan
  updateResult: (id: string, update: Partial<DiscoveryResult>) => void;
  setTemplateOverlap: (discoveryId: string, overlap: TemplateOverlap) => void;

  // Actions — scanning
  setScanning: (scanning: boolean) => void;
  setScanProgress: (completed: number, total: number) => void;
  setLastScannedAt: (date: Date) => void;

  // Actions — filters
  setSourceFilter: (filter: SourceType | 'all') => void;
  setConfidenceFilter: (filter: ConfidenceLevel | 'all') => void;

  // Actions — selection
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Actions — lifecycle
  dismissResult: (id: string) => void;
  markImported: (id: string, processId: string) => void;
  markAnalysed: (id: string, nodes: ProcessNode[], edges: ProcessEdge[], confidence: ConfidenceLevel) => void;

  // Reset
  resetStore: () => void;
}
```

### 10.2 React Query Hooks

```typescript
// Server state — discovery operations
useDiscoveryListQuery()                    // GET /api/process-studio/discovery
useDiscoveryScanMutation()                 // POST /api/process-studio/discovery/scan
useDiscoveryImportMutation(id)             // POST /api/process-studio/discovery/[id]/import
useDiscoveryBatchImportMutation()          // POST /api/process-studio/discovery/import-batch
useDiscoveryDismissMutation(id)            // PATCH /api/process-studio/discovery/[id]
```

---

## 11. Supabase Realtime Integration (Phase 4)

### 11.1 useDiscoveryRealtime Hook

Follows the exact pattern from `useConnectionsRealtime.tsx`:

```typescript
// apps/web/src/app/hooks/useDiscoveryRealtime.ts

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseDiscoveryRealtimeOptions {
  onNewResult?: (result: DiscoveryResult) => void;
  onResultUpdated?: (result: DiscoveryResult) => void;
  onScanComplete?: () => void;
  enabled?: boolean;
}

export function useDiscoveryRealtime({
  onNewResult,
  onResultUpdated,
  onScanComplete,
  enabled = true,
}: UseDiscoveryRealtimeOptions) {
  const onNewResultRef = useRef(onNewResult);
  const onResultUpdatedRef = useRef(onResultUpdated);

  useEffect(() => {
    onNewResultRef.current = onNewResult;
    onResultUpdatedRef.current = onResultUpdated;
  }, [onNewResult, onResultUpdated]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    const setup = async () => {
      channel = supabase
        .channel('discovery-results')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_discovery_results',
        }, (payload) => {
          onNewResultRef.current?.(payload.new as DiscoveryResult);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_discovery_results',
        }, (payload) => {
          onResultUpdatedRef.current?.(payload.new as DiscoveryResult);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to discovery results');
          }
        });
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [enabled]);
}
```

### 11.2 Realtime Flow

```
Server (scan API):
  1. Scanner discovers workflow
  2. INSERT into workflow_discovery_results
  3. Supabase Realtime broadcasts INSERT event

Client (Discovery Panel):
  1. useDiscoveryRealtime receives INSERT event
  2. Appends new DiscoveryResult to store
  3. DiscoveryCard appears in panel immediately
  4. Scan status updates progressively
```

---

## 12. Integration with Process Studio

### 12.1 Page-Level Changes

The only existing file modified is the Process Studio **page** (`apps/web/src/app/(admin)/admin/process-studio/page.tsx`):

```typescript
// Existing tab structure
<HubTabs>
  <Tab id="design">Design</Tab>
  <Tab id="discovery">Discovery</Tab>    {/* NEW */}
</HubTabs>

// Tab content
{activeTab === 'design' && (
  <ProcessStudioWorkspace />  {/* Existing — unchanged */}
)}
{activeTab === 'discovery' && (
  <DiscoveryPanel              {/* NEW */}
    onImport={(nodes, edges, name, description) => {
      // Same callback as TemplateSelector.onSelect
      setActiveTab('design');
      loadToCanvas(nodes, edges, name, description);
    }}
  />
)}
```

### 12.2 What Is NOT Modified

| Existing Component | Status |
|-------------------|--------|
| `ProcessStudioCanvas` | Unchanged |
| `ProcessStepNode` | Unchanged |
| `ChatPanel` | Unchanged |
| `PropertiesDrawer` | Unchanged |
| `Toolbar` | Unchanged |
| `TemplateSelector` | Unchanged |
| `store.ts` (useProcessStudioStore) | Unchanged |
| `types.ts` | Unchanged — discovery types in separate file |
| All existing API routes | Unchanged |
| All existing hooks | Unchanged |

### 12.3 Shared Utilities

The following utilities from the existing parse route are extracted to a shared location for reuse:

| Utility | Current Location | Shared Location |
|---------|-----------------|----------------|
| `validateWorkflow()` | `parse/route.ts` | `lib/process-studio/validation.ts` |
| `toReactFlowFormat()` | `parse/route.ts` | `lib/process-studio/format.ts` |
| `VALID_TYPES` | `parse/route.ts` | `lib/process-studio/constants.ts` |

This extraction is a **refactor** that moves code without changing behaviour. The parse route imports from the shared location.

---

## 13. Implementation Plan

### Phase 1: Foundation — Two-Pass Scanning + Direct Mapping + 3 Structured Scanners

**Goal:** Discovery Panel with manual refresh, two-pass architecture, direct mapping for structured sources. Scans CAS workflows, status enums, and onboarding flows (all structured — no AI needed). Users can select and import individual or multiple discovered workflows. Template overlap detection.

| Task | Files | Effort |
|------|-------|--------|
| Create `workflow_discovery_results` + `workflow_discovery_scans` tables | `tools/database/migrations/334_create_workflow_discovery.sql` | Small |
| Extract shared validation utilities from parse route | `lib/process-studio/validation.ts`, `lib/process-studio/format.ts` | Small |
| Create scanner types and interface (two-pass, isStructured) | `lib/process-studio/scanner/types.ts` | Small |
| Create CAS workflow scanner (direct mapping) | `lib/process-studio/scanner/sources/cas-workflow-scanner.ts` | Medium |
| Create status enum scanner (direct mapping) | `lib/process-studio/scanner/sources/status-enum-scanner.ts` | Medium |
| Create onboarding scanner (direct mapping) | `lib/process-studio/scanner/sources/onboarding-scanner.ts` | Medium |
| Create template overlap detector | `lib/process-studio/scanner/overlap-detector.ts` | Medium |
| Create scanner service orchestrator (per-source) | `lib/process-studio/scanner/index.ts` | Medium |
| Create discovery API routes (list, scan, import, batch, dismiss, update-template) | `app/api/process-studio/discovery/` | Medium |
| Create DiscoveryCard component (with checkbox, state badges, template overlap) | `components/feature/process-studio/DiscoveryCard.tsx` | Medium |
| Create DiscoveryToolbar component (refresh, filters, select all, progress) | `components/feature/process-studio/DiscoveryToolbar.tsx` | Small |
| Create DiscoveryPanel component (domain grouping, batch bar) | `components/feature/process-studio/DiscoveryPanel.tsx` | Medium |
| Create discovery Zustand store (selection, progress, overlaps) | `components/feature/process-studio/discovery-store.ts` | Medium |
| Add Discovery tab to Process Studio page | `app/(admin)/admin/process-studio/page.tsx` | Small |

**Deliverable:** Users click "Refresh", see CAS workflows + status enums + onboarding flows discovered instantly (no AI wait), select checkboxes, and import selected to canvas. Outdated templates flagged with [Update Template] action.

### Phase 2: AI Scanners — Cron Jobs + API Routes

**Goal:** Add 2 unstructured scanners that use Pass 2 (Gemini AI) for analysis. Users see preview cards first, then click "Analyse" for full graph.

| Task | Files | Effort |
|------|-------|--------|
| Create AI analyzer (Gemini integration) | `lib/process-studio/scanner/ai-analyzer.ts` | Medium |
| Create cron job scanner (Pass 1 preview + Pass 2 AI) | `lib/process-studio/scanner/sources/cron-job-scanner.ts` | Medium |
| Create API route scanner (Pass 1 preview + Pass 2 AI) | `lib/process-studio/scanner/sources/api-route-scanner.ts` | Large |
| Create analyse API endpoint (Pass 2 trigger) | `app/api/process-studio/discovery/[id]/analyse/route.ts` | Small |
| Create analyse-batch API endpoint | `app/api/process-studio/discovery/analyse-batch/route.ts` | Small |
| Add "Analyse" and "Analyse All" buttons to UI | Update `DiscoveryCard.tsx`, `DiscoveryToolbar.tsx` | Small |
| Add source type and confidence filters | Update `DiscoveryToolbar.tsx` | Small |

**Deliverable:** Preview cards appear in < 5 seconds. Users click "Analyse" on interesting results. "Analyse All" batch-processes all unanalysed items.

### Phase 3: DB Triggers + Polish

**Goal:** Add database trigger scanner. Improve domain grouping, scan history, and confidence accuracy.

| Task | Files | Effort |
|------|-------|--------|
| Create DB trigger scanner | `lib/process-studio/scanner/sources/db-trigger-scanner.ts` | Medium |
| Add scan history UI | Update `DiscoveryPanel.tsx` | Small |
| Enhance AI prompts for better confidence scoring | Update `ai-analyzer.ts` | Medium |
| Add deduplication hints (cross-scanner relationship detection) | Update scanner service | Medium |

**Deliverable:** All 6 source types scanned. Scan history visible. Improved AI output quality.

### Phase 4: Real-Time Discovery

**Goal:** Push-based updates via Supabase Realtime. Progressive scan results stream in as each per-source scan completes.

| Task | Files | Effort |
|------|-------|--------|
| Enable Supabase Realtime on discovery table | Migration update | Small |
| Create `useDiscoveryRealtime` hook | `hooks/useDiscoveryRealtime.ts` | Medium |
| Integrate realtime hook into DiscoveryPanel | Update `DiscoveryPanel.tsx` | Small |
| Progressive scan status (results stream in per-source) | Update `DiscoveryToolbar.tsx` | Medium |
| Background scan on Process Studio page load | Update `page.tsx` | Small |

**Deliverable:** Discovery results stream in real-time as per-source scanners complete. Auto-scan on page load.

---

## 14. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Scanner** | Node.js `glob` + `fs/promises` + regex | File system scanning (server-side only) |
| **AI** | Gemini 2.0 Flash via `@google/generative-ai` | Code-to-workflow conversion |
| **Database** | Supabase (PostgreSQL) | `workflow_discovery_results` + `workflow_discovery_scans` |
| **Realtime** | Supabase Realtime (`postgres_changes`) | Phase 4 — push-based updates |
| **Server State** | React Query (TanStack Query) | Discovery list, scan trigger, import |
| **Client State** | Zustand (separate store) | Filters, scan status, dismissed IDs |
| **UI** | React + CSS Modules | Follows Process Studio conventions |

---

## 15. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **File system access** | Scanner runs server-side only; client never has filesystem access |
| **AI prompt injection** | Source code content is sanitised before inclusion in Gemini prompts; file content truncated to 10KB max per source |
| **Admin-only access** | All discovery routes and RLS policies gated by `is_admin()` |
| **Rate limiting** | Scan endpoint limited to 5 calls/min to prevent abuse |
| **Source code exposure** | Raw source code is processed server-side and never sent to the client — only the resulting ProcessNode[]/ProcessEdge[] graphs |
| **Database queries** | DB trigger scanner uses read-only queries against `information_schema` |
| **Scan duration** | 30-second timeout on scan operations to prevent runaway processes |

---

## 16. Testing Strategy

| Layer | Approach | Tools |
|-------|----------|-------|
| **Scanners** | Unit tests for each source scanner with fixture files | Jest |
| **AI Analyzer** | Integration tests with Gemini (mock for CI, real for local) | Jest + MSW |
| **API Routes** | Integration tests for all discovery endpoints | Jest |
| **UI Components** | Unit tests for DiscoveryCard, DiscoveryPanel, DiscoveryToolbar | Jest + React Testing Library |
| **Import Flow** | E2E test: scan → discover → import → verify canvas | Manual + Playwright |
| **Build** | Must pass `npm run build` with zero errors | Pre-commit hook |

---

## 17. Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard navigation** (2.1.1) | Discovery cards focusable via Tab; Import/Dismiss buttons keyboard-accessible |
| **Focus visible** (2.4.7) | Focus ring on all interactive elements via CSS Modules |
| **ARIA labels** (4.1.2) | DiscoveryPanel: `role="region"` with `aria-label="Discovered workflows"`. Cards: `aria-label="{name} - {confidence} confidence"` |
| **Screen reader** | Scan status announced via `aria-live="polite"`: "Scan complete. 12 workflows discovered." |
| **Color not sole** (1.4.1) | Confidence badges use text label + colour together |
| **Touch targets** (2.5.5) | Import/Dismiss buttons min 32x32px |

---

## 18. UX States

### 18.1 Empty States

| Context | Content |
|---------|---------|
| **No scan run yet** | Icon: radar. Title: "Discover your workflows". Description: "Scan your codebase to find existing business processes." CTA: [Start Discovery Scan] |
| **Scan complete, zero results** | Icon: check. Title: "No workflows found". Description: "The scanner didn't find any new workflows. Try scanning a different source type." |
| **All results dismissed** | Icon: filter. Title: "All results dismissed". Description: "Reset filters or run a new scan to see results." CTA: [Reset Filters] |

### 18.2 Loading States

| Context | Behaviour |
|---------|----------|
| **Scan in progress** | Toolbar shows "Scanning... (3/6 sources)" with spinner. Cards appear progressively per source. Structured sources complete instantly; AI sources show preview cards. |
| **Analysing (Pass 2)** | Card shows "Analysing..." spinner on the [Analyse] button. Other cards remain interactive. |
| **Analyse All in progress** | Toolbar shows "Analysing... (5/8 remaining)" with progress. |
| **Import in progress** | Import button shows "Importing..." with spinner. Disabled until complete. |
| **Batch import** | Modal shows progress: "Importing 3 of 5 workflows..." |
| **Initial load** | Skeleton cards while fetching existing discovery results |
| **Updating template** | Toast: "Updating template..." → "Template updated (5→7 steps)" |

### 18.3 Error States

| Context | Recovery |
|---------|----------|
| **Scan fails (network)** | Toast: "Scan failed. Check your connection." + [Retry] |
| **AI analysis fails for one source** | Other sources still show results. Failed source shows: "Could not analyse [source]. Try again later." |
| **Import fails** | Toast: "Failed to import workflow." + [Retry] |
| **Scan timeout** | Toast: "Scan timed out after 30 seconds. Try scanning specific sources." |

---

## 19. Monitoring & Observability

| What | How | Where |
|------|-----|-------|
| **Scan success/failure rates** | Structured logging per scan and per source | Scan API route |
| **Scan duration** | Log `duration_ms` per scan and per source scanner | Scanner service |
| **AI analysis quality** | Log token counts, response time, validation pass rate | AI analyzer |
| **Discovery result counts** | Log results by source type and confidence | Scanner service |
| **Import success/failure** | Log import operations | Import API route |
| **Realtime health** | Monitor channel subscription status | `useDiscoveryRealtime` hook |

---

## 20. Future Enhancements (Out of Scope)

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Git diff scanning** | Only re-scan files changed since last commit | P2 |
| **Process mining** | Discover workflows from actual event logs (booking events, etc.) | P3 |
| **Auto-update templates** | When source code changes, auto-update matching templates | P3 |
| **Cross-workflow graph** | Visualise dependencies between discovered workflows | P2 |
| **Webhook-triggered scans** | GitHub webhook triggers scan on push to main | P3 |
| **Diff view** | Compare discovered workflow with existing template | P2 |
| **BPMN export** | Export discovered workflows in standard BPMN format | P4 |
| **Custom scanner plugins** | Allow users to define custom source scanners | P4 |
| **Multi-tenant scanning** | Scan organisation-specific workflows | P4 |

---

## 21. Dependencies & Risks

### New Dependencies

| Package | Purpose | Size Impact |
|---------|---------|------------|
| `glob` | File pattern matching for scanners | Already in project (CAS uses it) |
| None new | All other deps already in project | Zero |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI generates poor workflow structure from code | Medium | Medium | Confidence scoring; manual review before import; users can edit after import |
| Scan takes too long for large codebases | Low | Medium | 30s timeout; per-source scanning; skip unchanged files |
| False positives (non-workflow code detected) | Medium | Low | Confidence scoring; dismiss capability; source-specific scanners reduce noise |
| Supabase Realtime connection issues | Low | Low | Graceful fallback to polling; manual refresh always available |
| Scanner breaks on codebase changes | Low | Medium | Defensive parsing; catch-per-scanner so one failure doesn't block others |

---

## 22. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Workflows discovered | 20+ distinct workflows from codebase | Count discovery results |
| High confidence results | 50%+ of discoveries rated high confidence | Confidence distribution |
| Scan time | < 30 seconds for full scan | Logged `duration_ms` |
| Import success rate | 95%+ imports produce valid canvas workflows | Import success/failure logs |
| User engagement | Users import at least 5 workflows in first week | Import operation logs |

---

## 23. References

| Document | Location | Relevance |
|----------|----------|-----------|
| Process Studio Solution Design | `fuchsia/process-studio-solution-design.md` | Parent document — architecture, types, conventions |
| Process Studio Types | `apps/web/src/components/feature/process-studio/types.ts` | ProcessNode, ProcessEdge, ProcessStepData |
| Process Studio Store | `apps/web/src/components/feature/process-studio/store.ts` | Existing Zustand store pattern |
| Connections Realtime Hook | `apps/web/src/app/hooks/useConnectionsRealtime.tsx` | Supabase Realtime subscription pattern |
| Parse Route | `apps/web/src/app/api/process-studio/parse/route.ts` | Gemini AI + validation utilities |
| CAS Code Scanner | `cas/agents/analyst/src/modules/code-scanner.ts` | Glob-based file scanning pattern |
| Status Types | `apps/web/src/types/index.ts` | Status enums to discover |
| CAS Workflows | `cas/packages/core/src/workflows/TutorWiseWorkflows.ts` | WorkflowDefinition objects |
| Cron Jobs | `apps/web/src/app/api/cron/` | Scheduled task handlers |
| Onboarding Routes | `apps/web/src/app/(authenticated)/onboarding/` | Multi-step wizard structure |
| DB Migrations | `tools/database/migrations/` | Trigger and function definitions |
| TutorWise Design System | `.ai/6-DESIGN-SYSTEM.md` | UI/UX standards, tokens, component patterns |
| TutorWise Patterns | `.ai/4-PATTERNS.md` | Code conventions, state management, naming |

---

**END OF DOCUMENT**

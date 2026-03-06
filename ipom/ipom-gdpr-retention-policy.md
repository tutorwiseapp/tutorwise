# iPOM — GDPR Data Retention & Automated Decision-Making Policy

**Status**: Approved v1.1 — Resolves Q1 from ipom-solution-design-v2.md; audit fixes applied (v2.2)
**Date**: 2026-03-06
**Jurisdiction**: UK GDPR + Data (Use and Access) Act 2025 (DUAA)
**Owner**: Product Team
**Applies to**: All iPOM Phase 1+ tables accumulating personal data

---

## 1. Legal Context

### 1.1 UK GDPR Obligations

Under UK GDPR Article 5(1)(e), personal data must be kept "no longer than is necessary". There is no single mandated retention period — organisations must define one based on:
- Purpose of processing
- UK Limitation Act 1980 (6 years for contract disputes; most commercial claims)
- Article 22 safeguard obligations
- ICO enforcement horizon (typically 2–3 years)

### 1.2 Article 22 — Automated Decision-Making

Article 22 applies when a decision is:
1. **Solely automated** (no meaningful human involvement), AND
2. **Produces legal or similarly significant effects** on the individual

For Tutorwise iPOM:

| Process | Article 22 Applies? | Reason |
|---------|-------------------|--------|
| Tutor Approval (autonomous tier) | **YES** | Determines whether tutor can operate on platform — significant effect |
| Commission Payout calculation | **YES** | Financial effect on earnings |
| Proactive nudges | **NO** | Informational only, no binding effect |
| Growth Score (advisory display only) | **NO** | Informational; user can ignore the score |
| Growth Score (gating decisions — e.g. score < 70 removes CaaS featured placement) | **YES** | Restricts platform visibility — significant effect on income potential. Score snapshot at gate time must be stored in `workflow_executions.decision_rationale`. |
| Admin Intelligence anomaly flags | **NO** | Human admin reviews all flagged items |
| Organisation Onboarding (shadow/supervised) | **NO** | Human approves all actions |

**When Article 22 applies**, users have the right to:
- Be informed that automated decisions are being made
- Obtain human review of the decision
- Express their point of view
- Contest the decision

### 1.3 Data (Use and Access) Act 2025 (DUAA)

The DUAA received Royal Assent in 2025. Key changes relevant to iPOM:
- Creates a **more permissive framework** for purely automated decisions — moves away from the near-blanket prohibition of original Article 22
- Replaces prohibition with a **safeguards-based model** (inform, explain, enable contest, enable human review)
- Secondary legislation and ICO AI/ADM Code of Practice expected **2026**
- **Action**: Design retention policy under current UK GDPR rules. When DUAA secondary legislation lands, review — but the safeguards and record-keeping obligations are directionally the same.

---

## 2. Data Classification

### 2.1 Sensitivity Tiers

| Tier | Definition | Tables |
|------|-----------|--------|
| **T1 — Automated Decision Records** | Article 22-applicable decisions with rationale | `workflow_executions`, `decision_outcomes` |
| **T2 — Operational Events** | Cross-system events, session loads, pipeline events | `platform_events`, `pipeline_jobs` |
| **T3 — Derived Scores** | Computed metrics, not raw personal data | `growth_scores` |
| **T4 — Agent Telemetry** | Fine-grained AI agent turn data | `cas_agent_events` |
| **T5 — Cost Attribution** | Operational cost records, minimal PII | `platform_ai_costs` |

### 2.2 Which Tables Contain Personal Data

| Table | Personal Data? | Identifier | Article 22? |
|-------|--------------|-----------|------------|
| `workflow_executions` | YES | `profile_id`, `user_id` | YES (approval/payout processes) |
| `decision_outcomes` | YES (via FK) | `execution_id → profile_id` | YES |
| `platform_events` | YES | `entity_id` (often `profile_id`) | NO (operational) |
| `pipeline_jobs` | NO | source IDs only | NO |
| `growth_scores` | YES | `user_id` | YES (when score gates platform features); NO (when advisory only) |
| `cas_agent_events` | YES | `user_id` (session context) | NO |
| `platform_ai_costs` | Minimal | `execution_id` (indirect) | NO |
| `workflow_exceptions` | YES | `execution_id → profile_id` | YES (contested decisions) |

---

## 3. Retention Schedule

### 3.1 Per-Table Retention Periods

| Table | Retention Period | Archival | Rationale |
|-------|-----------------|---------|-----------|
| `workflow_executions` | **3 years** | Archive to cold storage at 12 months | Article 22: supports SAR + right to contest + ICO investigation window. UK Limitation Act (6yr) not needed for automated decisions; 3yr balances compliance with data minimisation. |
| `decision_outcomes` | **3 years** | Archive with executions | Directly linked to Article 22 records — same retention. |
| `workflow_exceptions` | **3 years** | Archive at 12 months | Contains contested decision records — retain to demonstrate safeguards were in place. |
| `platform_events` | **12 months** | Aggregate + delete | Operational, not Article 22. 12 months covers seasonal analysis and incident investigation. |
| `pipeline_jobs` | **30 days** | Delete after processing | Internal queue mechanics, minimal PII, no compliance obligation. |
| `growth_scores` | **6 months** | Delete (historical snapshots) | Derived cache. But see note below on score-triggered decisions. |
| `cas_agent_events` | **90 days** | Export for fine-tuning if flagged, then delete | High-volume, fine-grained; short retention aligns with operational purpose (fine-tuning, debugging). |
| `platform_ai_costs` | **24 months** | Archive at 12 months | Cost attribution for financial reporting, no direct PII. |

> **Growth Score note**: If Growth Score gate thresholds are used to restrict platform access (e.g. score < 20 removes featured placement), the score snapshot at the time of that decision becomes part of the decision rationale and should be stored in `workflow_executions.decision_rationale` — not just in `growth_scores`. The `growth_scores` table itself remains a 6-month cache.

### 3.2 Archival Strategy

**Hot → Warm → Cold pipeline:**

```
Hot (Supabase PostgreSQL)          Warm (Supabase Storage)         Cold (S3 / Backblaze)
─────────────────────────          ────────────────────────        ─────────────────────
Active data (0–12 months)    ──▶   JSON export (12–36 months) ──▶  Encrypted archive
Live queries                        Accessible within hours          Legal hold only
Standard RLS enforced               Admin-only access               Immutable once archived
```

**Implementation (pg_cron, monthly):**

```sql
-- Example: archive workflow_executions older than 12 months
-- Step 1: Export to Supabase Storage via edge function
-- Step 2: Mark rows as archived
UPDATE workflow_executions
SET archived_at = NOW()
WHERE created_at < NOW() - INTERVAL '12 months'
  AND archived_at IS NULL;

-- Step 3: Hard delete rows older than 3 years
DELETE FROM workflow_executions
WHERE created_at < NOW() - INTERVAL '3 years';
```

**Required schema additions:**
```sql
-- Add to workflow_executions
ALTER TABLE workflow_executions ADD COLUMN archived_at timestamptz;
ALTER TABLE workflow_executions ADD COLUMN deletion_scheduled_at timestamptz
  GENERATED ALWAYS AS (created_at + INTERVAL '3 years') STORED;

-- Add to platform_events
ALTER TABLE platform_events ADD COLUMN archived_at timestamptz;
```

---

## 4. Subject Access Request (SAR) Handler

### 4.1 SAR Obligations for Automated Decisions

When a user submits a SAR (must respond within 1 month), for each Article 22-applicable decision we must provide:
- That the decision was made automatically
- What personal data was used
- The logic involved (must be a genuine explanation, not just "we used an algorithm" — CJEU Feb 2025 ruling)
- The significance and consequences of the decision
- The outcome

### 4.2 SAR Query Design

```typescript
// GET /api/admin/users/[profileId]/automated-decisions
// Also surfaced in user's Account Settings > Privacy > My Automated Decisions

async function getAutomatedDecisionsForSAR(profileId: string) {
  const { data } = await supabase
    .from('workflow_executions')
    .select(`
      id,
      process_name,
      status,
      decision_rationale,
      completed_at,
      created_at,
      decision_outcomes (
        outcome_metric,
        outcome_value,
        measured_at
      )
    `)
    .eq('profile_id', profileId)
    .in('process_name', ['tutor-approval', 'commission-payout'])  -- Article 22 processes
    .order('created_at', { ascending: false });

  // Format for human readability
  return data.map(execution => ({
    decision_type: execution.process_name,
    decision_date: execution.created_at,
    outcome: execution.status,
    what_data_was_used: execution.decision_rationale?.signals_used,
    confidence: execution.decision_rationale?.confidence_score,
    result: execution.decision_rationale?.result_summary,
    outcomes_measured: execution.decision_outcomes,
  }));
}
```

### 4.3 User-Facing Automated Decision Log

Add to Account Settings > Privacy (Phase 3):
```
My Automated Decisions
─────────────────────
Date          Process              Outcome
2026-02-15    Tutor Approval       Approved   [View details] [Request human review]
2026-01-10    Commission Payout    £245.00    [View details]
```

### 4.4 Right to Contest

For each Article 22 decision, users must be able to request human review:

```typescript
// POST /api/account/automated-decisions/[executionId]/contest
// Creates a support ticket routed to admin exception queue
async function contestAutomatedDecision(executionId: string, reason: string) {
  // 1. Verify execution belongs to requesting user
  // 2. Insert into workflow_exceptions with source='user_contest'
  // 3. Notify admin team
  // 4. Auto-respond to user within 1 working day (SLA)
}
```

---

## 5. Right to Erasure Protocol

### 5.1 When Users Delete Their Account

The right to erasure (Article 17) is NOT absolute — legitimate interests can override it. For Tutorwise:

| Table | On Account Deletion | Rationale |
|-------|-------------------|-----------|
| `workflow_executions` | **Pseudonymise** (replace `profile_id` with `sha256(profile_id || deletion_salt)`) | Fraud prevention + audit trail legitimate interest |
| `decision_outcomes` | **Pseudonymise** (via FK chain) | Same |
| `platform_events` | **Delete** rows where `entity_id = profile_id` | Operational only, no retention obligation |
| `growth_scores` | **Delete** | Derived cache, no retention obligation |
| `workflow_exceptions` | **Pseudonymise** if linked to user decisions | Audit trail |
| `cas_agent_events` | **Delete** | Short retention anyway |

**Pseudonymisation approach:**
```sql
-- On account deletion, replace profile_id with deterministic hash
UPDATE workflow_executions
SET
  profile_id = encode(sha256((profile_id::text || 'deletion_salt_v1')::bytea), 'hex')::uuid,
  pseudonymised_at = NOW()
WHERE profile_id = $1;
```

The salt ensures the hash is not reversible without the salt (stored separately, admin only).

### 5.2 Retention Override for Legal Holds

If a user account is under legal investigation or fraud review, add `legal_hold = true` to the profile. The erasure pg_cron job skips profiles with `legal_hold = true`.

---

## 6. Transparency Notice Requirements

### 6.1 Privacy Policy Updates Required (before Phase 3)

The privacy policy must be updated to include:

```
Automated Decision-Making
─────────────────────────
We use automated processes to make certain decisions that affect your use of Tutorwise:

Tutor Account Approval: When you apply to become a tutor, our automated system
reviews your profile completeness, verification status, and platform signals to
approve your account. This decision is made automatically but you have the right
to request human review.

Commission Payments: Payment amounts are calculated automatically based on your
completed sessions and our commission structure.

You can view all automated decisions made about your account in Settings > Privacy
> My Automated Decisions. To request human review of any automated decision,
contact support@tutorwise.com.

We retain records of automated decisions for 3 years. You may request a copy of
this data or deletion of your account via our privacy controls.
```

### 6.2 In-Product Notice (Phase 3)

When an automated decision affects a user (e.g. tutor approval notification), include:
> "This decision was made automatically. [View how this decision was made] [Request human review]"

---

## 7. ROPA (Record of Processing Activities)

Under UK GDPR Article 30, we must maintain a Record of Processing Activities. Add this entry:

| Field | Value |
|-------|-------|
| Processing activity | Automated decision-making for tutor approval and commission calculation |
| Controller | Tutorwise Ltd |
| Purpose | Platform integrity, fraud prevention, payment accuracy |
| Legal basis | Article 6(1)(b) — contract performance; Article 22(2)(a) — necessary for contract |
| Categories of data | Profile data, booking history, payment data, platform activity |
| Recipients | Stripe (payment processing), Supabase (storage) |
| Retention | 3 years for decision records; 12 months for operational events |
| Safeguards | Human review available on request; decision rationale recorded |

---

## 8. Implementation Checklist (Phase 1 Schema)

Before Phase 1 launches:

- [ ] Add `archived_at` + `deletion_scheduled_at` columns to `workflow_executions`
- [ ] Add `archived_at` to `platform_events`
- [ ] Add `pseudonymised_at` column to `workflow_executions`
- [ ] Add `legal_hold` column to `profiles` (prevents erasure during fraud/legal investigations)
- [ ] Create `sar_requests` table (log all SARs received and responded to)
- [ ] Partition `platform_events` by `created_at` (monthly; required from day one — expensive to retrofit)
- [ ] pg_cron job `archive-aged-records` (monthly, archives to Supabase Storage)
- [ ] pg_cron job `delete-expired-records` (monthly, hard-deletes after 3yr/12mo respectively)
- [ ] **Phase 1 minimum (SAR)**: Add "To request human review, email support@tutorwise.com" to tutor approval notification — the right to contest must be advertised from the moment the autonomous tier is live
- [ ] Update privacy policy (before Phase 3 autonomous operations go live)
- [ ] `/api/account/automated-decisions` endpoint (Phase 3)
- [ ] Account Settings > Privacy > My Automated Decisions UI (Phase 3)
- [ ] `/api/account/automated-decisions/[id]/contest` endpoint (Phase 3)

### Migration Number

Next migration: **344** (latest existing is 343; 344 is next available)

```sql
-- Migration 344: iPOM GDPR retention columns + legal_hold + platform_events partitioning

-- 1. workflow_executions retention columns
ALTER TABLE workflow_executions
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN pseudonymised_at timestamptz,
  ADD COLUMN deletion_scheduled_at timestamptz
    GENERATED ALWAYS AS (created_at + INTERVAL '3 years') STORED;

-- 2. platform_events partitioning (add archived_at + prep for partitioning)
--    NOTE: platform_events must be recreated as a partitioned table if it already exists.
--    If created fresh in this migration, use the partitioned form below.
--    If pre-existing: add archived_at column; partitioning requires a one-time migration
--    (create new partitioned table, copy data, rename) — schedule for a low-traffic window.
ALTER TABLE platform_events
  ADD COLUMN archived_at timestamptz;

-- Partitioned version (if creating platform_events fresh in migration 343):
-- CREATE TABLE platform_events (
--   id uuid DEFAULT gen_random_uuid(),
--   ...existing columns...,
--   archived_at timestamptz,
--   created_at timestamptz DEFAULT now()
-- ) PARTITION BY RANGE (created_at);
-- CREATE TABLE platform_events_2026_03 PARTITION OF platform_events
--   FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- -- Add subsequent months via pg_partman or manual monthly migration

-- 3. profiles: legal hold flag (prevents erasure during active fraud/legal investigations)
ALTER TABLE profiles
  ADD COLUMN legal_hold boolean DEFAULT false;
CREATE INDEX idx_profiles_legal_hold ON profiles(legal_hold) WHERE legal_hold = true;

-- 4. SAR request log
--    profile_id is nullable (not FK): SAR records are compliance obligations that survive
--    account deletion. Storing the hash of the pseudonymised profile_id instead of an FK
--    ensures the record is retained even after profile erasure.
CREATE TABLE IF NOT EXISTS sar_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id_hash text,                        -- sha256(profile_id || salt) — survives deletion
  profile_id_raw uuid,                         -- NULL after account deletion/pseudonymisation
  requested_at timestamptz DEFAULT NOW(),
  responded_at timestamptz,
  response_method text,                        -- 'email' | 'in-app'
  data_exported_at timestamptz,
  notes text
);
```

---

## 9. Monitoring & Review

| Action | Frequency | Owner |
|--------|-----------|-------|
| Review retention schedule against ICO/DUAA updates | 6-monthly | Tech Lead |
| Audit `archived_at` and `pseudonymised_at` coverage | Quarterly | Admin |
| Review privacy policy automated-decision section | Before each Phase (major) | Product |
| ICO DUAA secondary legislation — check for new ADM obligations | On publication (expected 2026) | Tech Lead |
| SAR response time audit (must be ≤ 1 month) | Monthly | Admin |

---

*Sources*: [ICO — Automated decision-making and profiling](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/automated-decision-making-and-profiling/) · [ICO — DUAA 2025](https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-what-does-it-mean-for-organisations/) · [Article 22 — Fieldfisher](https://ukgdpr.fieldfisher.com/chapter-3/article-22-gdpr/) · [DUAA 2025 changes — GOV.UK](https://www.gov.uk/guidance/data-use-and-access-act-2025-data-protection-and-privacy-changes)

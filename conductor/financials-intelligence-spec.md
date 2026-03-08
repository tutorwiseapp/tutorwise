# Financials Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

Related: [`bookings-intelligence-spec.md`](./bookings-intelligence-spec.md) · [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) · [`conductor-solution-design-v3.md`](./conductor-solution-design-v3.md)

> **Role in the platform**: Financials is the revenue engine. Every booking creates transactions. Commission Payout is the only live Conductor workflow today. Intelligence here protects platform revenue, detects clearing failures, and monitors payout health.

---

## 1. Purpose

The financial system handles the full money lifecycle: Stripe payment → clearing period → transaction ledger → payout disbursement → withdrawal. It covers tutoring payouts, referral commissions, platform fees, refunds, and reversals. Without Conductor intelligence, stalled payouts go unreported, clearing bottlenecks accumulate, refund rates creep up, and dispute resolution has no pattern detection.

**Three outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| Financial health monitoring (clearing, payouts, disputes) | Phase 3 | Retention Monitor Agent (Conductor) |
| Admin Financials intelligence panel | Phase 3 | `/admin/financials` (existing page extended) |
| Commission Payout workflow intelligence layer (existing workflow) | Phase 3 | Conductor Workflow |

---

## 2. Financials System Recap

### 2A. Transaction Types

```
transactions.type values:
  'Booking Payment'       — client pays for booking
  'Tutoring Payout'       — tutor's share (80% or 90%)
  'Platform Fee'          — platform's share (10%)
  'Referral Commission'   — referrer's share (10% of referred bookings)
  'Agent Commission'      — legacy alias for Referral Commission
  'Withdrawal'            — tutor withdraws available balance
  'Refund'                — booking refund to client
```

### 2B. Transaction Statuses (v4.9)

```
'pending'     — created, not yet cleared
'clearing'    — in 7-day clearing period
'available'   — cleared, available for withdrawal
'paid_out'    — payout initiated to Stripe Connect account
'disputed'    — under dispute/review
'refunded'    — reversed (booking cancelled/refunded)
'reversed'    — commission reversal applied
```

### 2C. Clearing Pipeline

```
Booking paid (Stripe) → Tutoring Payout: status='clearing'
                      → Referral Commission: status='clearing'
                      → Platform Fee: status='available' (immediate)
    ↓ 7 days later
process-pending-commissions cron (daily)
    ↓
status='available' (tutor can now withdraw)
    ↓
process-batch-payouts cron (Fri 10am UTC)
    ↓
Stripe Connect payout disbursed → status='paid_out'
```

### 2D. Existing Admin Pages

- `/admin/financials` — transaction ledger overview
- `/admin/financials/payouts` — payout management
- `/admin/financials/disputes` — dispute resolution queue

### 2E. Existing Conductor Workflow

**Commission Payout** (live) — triggered Fri 10am via cron:
- Queries tutors with available balance > £0
- Initiates Stripe Connect transfer
- Marks transactions as 'paid_out'
- Logs to process-studio execution engine

---

## 3. Retention Monitor Agent — Financials Tools

Financial health is a retention signal — stalled payouts frustrate tutors and cause churn. The **Retention Monitor** specialist agent monitors financial pipeline health alongside referral and booking tools.

### Tool: `query_financial_health`

```typescript
{
  "name": "query_financial_health",
  "description": "Returns clearing pipeline health, payout success rates, dispute patterns, revenue breakdown, and anomaly signals",
  "parameters": {
    "days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```typescript
interface FinancialHealthResponse {
  clearing: {
    total_in_clearing_pence: bigint;         // sum of clearing transactions
    transactions_in_clearing: number;
    stalled_over_14d: number;                // clearing > 14 days (should be ≤7d)
    avg_clearing_days: number;
    clearing_to_available_rate: number;      // % that successfully clear
  };
  payouts: {
    total_paid_out_30d_pence: bigint;
    payout_transactions_30d: number;
    payout_success_rate: number;             // paid_out / (paid_out + failed)
    tutors_paid_30d: number;
    avg_payout_pence: bigint;
    tutors_with_available_not_paid: number;  // have available balance, not yet paid
    max_available_not_paid_pence: bigint;    // largest outstanding available balance
  };
  revenue: {
    platform_fee_30d_pence: bigint;
    referral_commission_30d_pence: bigint;
    refunds_30d_pence: bigint;
    reversals_30d_pence: bigint;
    net_platform_revenue_30d_pence: bigint;  // platform_fee - refunds - reversals
    refund_rate: number;                     // refunds / gmv
  };
  disputes: {
    open_count: number;
    resolved_30d: number;
    avg_days_to_resolve: number;
    total_disputed_pence: bigint;
    dispute_rate: number;                    // disputed / (confirmed+completed bookings)
  };
  anomalies: {
    duplicate_payout_risk: number;           // transactions same booking_id + type appearing twice
    negative_balance_profiles: number;       // profiles where available < 0
    unreversed_refunds: number;              // booking refunded but commission not reversed
  };
  alerts: FinancialAlert[];
}

interface FinancialAlert {
  type: 'clearing_stall' | 'payout_failure_elevated' | 'dispute_spike'
      | 'refund_rate_high' | 'unreversed_commissions' | 'duplicate_payout_risk'
      | 'large_outstanding_balance' | 'net_revenue_declining';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  amount_pence?: bigint;
  action: string;
}
```

---

## 4. Key SQL

### 4A. Clearing Pipeline Health

```sql
SELECT
  COUNT(*) AS transactions_in_clearing,
  COALESCE(SUM(amount), 0) AS total_clearing_pence,
  COUNT(*) FILTER (WHERE created_at < now() - interval '14 days') AS stalled_over_14d,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (now() - created_at)) / 86400)
    FILTER (WHERE created_at >= now() - interval '30 days')
  , 1) AS avg_clearing_days
FROM transactions
WHERE status = 'clearing';
```

### 4B. Unreversed Commission Detection

```sql
-- Bookings that are refunded but still have non-reversed commission transactions
SELECT
  b.id AS booking_id,
  b.client_id,
  b.tutor_id,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type IN ('Referral Commission', 'Tutoring Payout')
    AND t.status NOT IN ('refunded', 'reversed')), 0) AS outstanding_commission_pence
FROM bookings b
JOIN transactions t ON t.booking_id = b.id
WHERE b.payment_status = 'Refunded'
  AND b.updated_at >= now() - interval '30 days'
GROUP BY b.id, b.client_id, b.tutor_id
HAVING SUM(t.amount) FILTER (WHERE t.type IN ('Referral Commission', 'Tutoring Payout')
  AND t.status NOT IN ('refunded', 'reversed')) > 0;
```

### 4C. Net Platform Revenue (30d)

```sql
SELECT
  COALESCE(SUM(amount) FILTER (WHERE type = 'Platform Fee'
    AND created_at >= now() - interval '30 days'), 0) AS platform_fee_pence,
  COALESCE(SUM(amount) FILTER (WHERE type = 'Referral Commission'
    AND created_at >= now() - interval '30 days'), 0) AS referral_commission_pence,
  COALESCE(ABS(SUM(amount)) FILTER (WHERE type = 'Refund'
    AND created_at >= now() - interval '30 days'), 0) AS refunds_pence,
  COALESCE(ABS(SUM(amount)) FILTER (WHERE status = 'reversed'
    AND created_at >= now() - interval '30 days'), 0) AS reversals_pence
FROM transactions;
-- net = platform_fee + referral_commission - refunds - reversals
```

### 4D. Payout Success Rate

```sql
WITH payout_attempts AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'paid_out') AS successful,
    COUNT(*) FILTER (WHERE status IN ('paid_out', 'failed', 'disputed')) AS total
  FROM transactions
  WHERE type = 'Tutoring Payout'
    AND created_at >= now() - interval '30 days'
)
SELECT
  successful,
  total,
  ROUND(successful::numeric / NULLIF(total, 0) * 100, 2) AS success_rate_pct
FROM payout_attempts;
```

### 4E. Tutors with Available Balance Not Yet Paid

```sql
-- Tutors who have available balance but haven't been paid this week
SELECT
  p.id AS profile_id,
  p.full_name,
  SUM(t.amount) FILTER (WHERE t.status = 'available'
    AND t.type IN ('Tutoring Payout', 'Referral Commission')) AS available_pence
FROM profiles p
JOIN transactions t ON t.profile_id = p.id
GROUP BY p.id, p.full_name
HAVING SUM(t.amount) FILTER (WHERE t.status = 'available'
  AND t.type IN ('Tutoring Payout', 'Referral Commission')) > 0
ORDER BY available_pence DESC;
```

---

## 5. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `clearing_stall` | `stalled_over_14d` > 0 | critical | Investigate — clearing should never exceed 7d |
| `payout_failure_elevated` | `payout_success_rate` < 95% in last 7 days | critical | Check Stripe Connect account status for affected tutors |
| `dispute_spike` | `open_count` increases by >3 in 7 days OR `dispute_rate` > 2% | warning | Admin review of dispute queue |
| `refund_rate_high` | `refund_rate` > 12% of GMV in 30d | warning | Cross-check with cancellation_spike in booking intel |
| `unreversed_commissions` | `unreversed_refunds` > 0 | critical | Immediate — financial integrity issue |
| `duplicate_payout_risk` | `duplicate_payout_risk` > 0 | critical | Halt payout cron pending admin review |
| `large_outstanding_balance` | Any tutor has available balance > £500 not yet paid | warning | Check next payout run + Stripe Connect status |
| `net_revenue_declining` | Net platform revenue this week < 70% of 4-week avg | critical | Cross-reference GMV decline + refund rate |

---

## 6. Database Table: `financials_platform_metrics_daily`

**Migration: 362**

```sql
CREATE TABLE financials_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Clearing
  total_in_clearing_pence bigint NOT NULL DEFAULT 0,
  transactions_in_clearing integer NOT NULL DEFAULT 0,
  stalled_over_14d integer NOT NULL DEFAULT 0,
  avg_clearing_days numeric(5,1),

  -- Payouts
  total_paid_out_30d_pence bigint NOT NULL DEFAULT 0,
  payout_transactions_30d integer NOT NULL DEFAULT 0,
  payout_success_rate_pct numeric(5,2),
  tutors_paid_30d integer NOT NULL DEFAULT 0,
  tutors_with_available_not_paid integer NOT NULL DEFAULT 0,

  -- Revenue
  platform_fee_30d_pence bigint NOT NULL DEFAULT 0,
  referral_commission_30d_pence bigint NOT NULL DEFAULT 0,
  refunds_30d_pence bigint NOT NULL DEFAULT 0,
  reversals_30d_pence bigint NOT NULL DEFAULT 0,
  net_platform_revenue_30d_pence bigint NOT NULL DEFAULT 0,
  refund_rate_pct numeric(5,2),

  -- Disputes
  open_disputes integer NOT NULL DEFAULT 0,
  resolved_disputes_30d integer NOT NULL DEFAULT 0,
  avg_days_to_resolve numeric(5,1),

  -- Anomalies
  unreversed_refunds integer NOT NULL DEFAULT 0,
  duplicate_payout_risk integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON financials_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 07:30 UTC (after listings at 07:00)
SELECT cron.schedule(
  'compute-financials-platform-metrics',
  '30 7 * * *',
  $$SELECT compute_financials_platform_metrics();$$
);
```

---

## 7. Admin Financials Intelligence Panel

New panel added to `/admin/financials` (above the transaction ledger).

```
┌──────────────────────────────────────────────────────────────────────┐
│  Financial Intelligence                        Last 30 days ▾        │
├──────────────────────────────────────────────────────────────────────┤
│  Clearing Pipeline         Payouts               Platform Revenue     │
│  In clearing: £12,340      Paid this week: £8,421  Net (30d): £4,782 │
│  Stalled >14d: 0   ✓      Success rate: 99.1% ✓  Refund rate: 2.6% ✓│
│  Avg clear time: 6.8d ✓   Tutors unpaid: 3  ⚠                       │
├──────────────────────────────────────────────────────────────────────┤
│  Disputes                                                             │
│  Open: 2   Resolved 30d: 7   Avg resolution: 2.3 days               │
├──────────────────────────────────────────────────────────────────────┤
│  ⚠ 3 tutors have available balance > £50 not yet paid (next Fri)    │
│  ✓ No unreversed commissions on refunded bookings                    │
│  ✓ No duplicate payout risk detected                                  │
├──────────────────────────────────────────────────────────────────────┤
│  Revenue Trend (90 days — weekly)                                     │
│  [sparkline: platform fee + referral commission − refunds]            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Conductor Workflow Integration

### Existing: Commission Payout (live)

The only live Conductor workflow. Enhancement: before each Friday payout run, the Retention Monitor runs `query_financial_health` and surfaces a pre-payout health check:

```
Pre-Payout Check (Thursday 09:00 UTC — 1h before payout window):
  Step 1: Run query_financial_health
  Step 2: Check for duplicate_payout_risk OR unreversed_commissions
    ↓ If either found → CRITICAL HITL: "Payout halted — anomaly detected"
      Admin must: [Investigate and clear] before payout proceeds
    ↓ If clean → log "Pre-payout check passed" + proceed to Friday cron
```

### New: Unreversed Commission Auto-Fix

```
Trigger: query_financial_health → unreversed_commissions > 0
Step 1: Identify affected booking_ids + transaction_ids
Step 2: HITL Task: "Commission reversal missing for [N] refunded bookings"
  Admin actions: [Run reversal now] [Review individually] [Dismiss]
Step 3 (if approved): Call reverseCommissions(bookingId) for each affected booking
Step 4: Re-run query_financial_health to confirm resolution
Step 5: Log to cas_agent_events
```

### New: Dispute Escalation Workflow

```
Trigger: open_disputes increases by >3 in 7 days
Step 1: Retrieve all open disputes from transactions WHERE status='disputed'
Step 2: Group by booking — identify common patterns (same tutor? same client?)
Step 3: HITL Task: "Dispute spike — [N] open disputes. Pattern: [summary]"
  Admin actions: [Process all in batch] [Review each] [Escalate to Stripe]
```

---

## 9. Growth Advisor — Financial Coaching

```
"Financial Summary" section (tutor context):
  - Available balance (ready to withdraw)
  - Clearing balance (incoming, days until available)
  - Referral commission earned (30d)
  - Avg payout per week (trend)
  - Next payout date (Friday)

Growth Advisor coaching:
  - If available_balance > £200: "You have £X ready to withdraw — here's how..."
  - If referral_commission > 0: "You earned £X in referral commissions — here's how to grow it..."
  - If no Stripe Connect connected: "Connect your bank account to receive payouts..."
```

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 20h)

| Task | Effort |
|------|--------|
| `financials_platform_metrics_daily` + migration 362 | 2h |
| `compute_financials_platform_metrics()` pg_cron | 2h |
| `query_financial_health` tool in Retention Monitor | 4h |
| Unreversed commission detection SQL | 2h |
| Pre-payout health check enhancement (Commission Payout workflow) | 2h |
| Admin Financials Intelligence panel UI | 4h |
| `/api/admin/financials/intelligence` API route | 2h |
| Unreversed Commission Auto-Fix workflow | 1h |
| Dispute Escalation workflow | 1h |

### Phase 4 — Growth Advisor (est. 5h)

| Task | Effort |
|------|--------|
| Financial coaching in Growth Advisor skills | 3h |
| Balance and payout metrics in Growth Advisor context hydration | 2h |

**Total: 25h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 362 | `financials_platform_metrics_daily` table + `compute_financials_platform_metrics()` function + pg_cron |

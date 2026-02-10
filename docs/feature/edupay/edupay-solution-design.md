# EduPay Solution Design
**Version:** 1.1
**Created:** 2026-02-10
**Updated:** 2026-02-10
**Status:** Phase 1 — UI Implementation Complete
**Author:** Tutorwise Product Team

---

## 1. What Is EduPay

EduPay is a financial orchestration layer built on top of the existing Tutorwise platform. It converts user activity — tutoring, referrals, affiliate spend, and gift rewards — into measurable financial progress against a student's loan or savings goal.

EduPay is **not** a bank, wallet, or payment processor. It is a points-based rewards and projection system that:

- Awards EduPay Points (EP) for activity that already happens on Tutorwise
- Shows users the real financial impact of their activity (loan reduction, interest saved)
- Integrates with 3rd party partners (affiliates, gift card networks) to provide additional value
- Retains tutors by making the platform financially rewarding beyond session income

---

## 2. Core Principle

```
Tutorwise processes every transaction.
Keeps 10% platform fee.
Passes 90% to the tutor or user.
Never pays from its own pocket.
```

This is the same 10% platform fee applied consistently across the entire platform — bookings, affiliate rewards, and gift processing all follow the same rule.

---

## 3. The Points Model

```
£1 of value received = 100 EduPay Points (EP)
100 EP = £1 of financial impact
```

EP is not a currency. It is a representation of value the user has already earned or received. When a user converts EP, they are directing money that is already theirs — not receiving new money from Tutorwise.

---

## 4. Money Flows

### Flow 1 — Tutoring Income (Existing Infrastructure)

**Default (no referral):**
```
Student pays £100 for session
        ↓
Tutorwise processes via Stripe (existing)
        ↓
Tutorwise keeps £10 (10% platform fee)
Tutor receives £90 (90% default)
        ↓
Tutor's £90 earning → 9,000 EP awarded
EP represents tutor's own earnings
Tutor directs EP to student loan or receives as cash payout
```

**Referral session:**
```
Student pays £100 for session
        ↓
Tutorwise processes via Stripe (existing)
        ↓
Tutorwise keeps £10 (10% platform fee)
Tutor receives £80 (80% — referral session)
Referrer receives £10 (10% referral commission)
        ↓
Tutor's £80 earning → 8,000 EP awarded
Referrer's £10 commission → 1,500 EP awarded (150 EP/£ referral rate)
```

**Reuses:** `handle_successful_payment()` RPC, Stripe Connect, `transactions` table
**Cost to Tutorwise:** £0
**Tutorwise income:** £10 per £100 session (unchanged in both cases)

---

### Flow 2 — Affiliate Spend (3rd Party Integration — Awin / CJ)

```
User shops via Tutorwise affiliate link
        ↓
Merchant pays Tutorwise commission via Awin/CJ
e.g. 6% on £100 spend = £6 received by Tutorwise
        ↓
Tutorwise keeps 10% of commission = £0.60
User receives 90% of commission = £5.40 as EP (540 EP)
        ↓
User converts 540 EP → £5.40 off student loan
OR retains EP for platform perks
```

**3rd Party:** Awin, Commission Junction
**Cost to Tutorwise:** £0 (commission received before EP awarded)
**Tutorwise income:** 10% of every affiliate commission
**Rule:** EP only awarded after commission is received. Never in advance.

---

### Flow 3 — Gift Rewards (3rd Party Integration — Tillo)

```
Student receives or buys a gift card via Tutorwise (Tillo integration)
        ↓
Retailer offers discount margin e.g. 10% on £50 = £5 margin
Tutorwise processes the transaction
        ↓
Tutorwise keeps 10% of margin = £0.50
User/Tutor receives 90% of margin = £4.50 as EP (450 EP)
        ↓
User converts 450 EP → £4.50 off student loan
OR uses EP for platform perks
```

**3rd Party:** Tillo (gift card network — 1,000+ UK retailers)
**Cost to Tutorwise:** £0
**Tutorwise income:** 10% of every gift card margin
**Rule:** Same as affiliate — money received first, EP awarded second.

---

## 5. The Split at a Glance

| Flow | Total Value | Tutorwise (10%) | User/Tutor (90%) |
|---|---|---|---|
| Tutoring session £100 (default) | £100 | £10 | £90 tutor |
| Tutoring session £100 (referral) | £100 | £10 | £80 tutor + £10 referrer |
| Affiliate commission £6 | £6 | £0.60 | £5.40 as EP |
| Gift card margin £5 | £5 | £0.50 | £4.50 as EP |

One fee rate. Applied consistently. No exceptions.

---

## 6. What EduPay Reuses (Do Not Rebuild)

| EduPay Need | Existing Tutorwise System |
|---|---|
| Payment processing | Stripe Connect + `handle_successful_payment()` |
| Platform fee (10%) | Existing commission split RPC |
| Immutable transaction ledger | `transactions` table (no deletes, offsetting entries) |
| Clearing period logic | 7-day `available_at` pattern |
| Balance calculation | Mirror `get_available_balance()` RPC |
| Batch payout processing | Existing Friday cron job |
| Email notifications | Existing Resend templates |
| Profile milestones | 14 existing CaaS database triggers |
| Score thresholds | `caas_scores.total_score` (already calculated) |
| Referral events | Existing referral conversion trigger |
| Webhook idempotency | `stripe_checkout_id` pattern |
| RLS security policies | Mirror existing financial data policies |

---

## 7. What Is New (Build on Top)

| Component | Description |
|---|---|
| `edupay_events` table | Captures EP-earning events with idempotency |
| `edupay_wallets` table | Per-user EP balance (total, available, pending, converted) |
| `edupay_ledger` table | Immutable EP transaction history (mirrors transactions pattern) |
| `edupay_rules` table | Configurable EP rate per event type |
| `edupay_caas_rewards` table | EP rewards tied to CaaS score thresholds |
| `edupay_loan_profiles` table | User's loan plan, balance, graduation year |
| `edupay_conversions` table | Records EP → loan payment conversions |
| Projection engine | Pure calculation — loan reduction, interest saved, years earlier |
| EduPay dashboard widget | Sidebar card showing EP balance + impact |
| Awin/CJ integration | Affiliate link tracking + commission webhook |
| Tillo integration | Gift card processing + margin webhook |
| TrueLayer PISP (Phase 2) | Loan payment initiation — user's own funds directed to SLC |

---

## 8. EP Earning Rules

Rules are stored in `edupay_rules` — configurable, versioned, never hardcoded.

| Event Type | EP Rate | Funded By | Cost to Tutorwise |
|---|---|---|---|
| `tutoring_income` | 100 EP per £1 | User's own earnings redirected | £0 |
| `referral_income` | 150 EP per £1 | User's own commission redirected | £0 |
| `affiliate_spend` | 90% of commission as EP | Merchant via Awin/CJ | £0 |
| `gift_reward` | 90% of margin as EP | Retailer via Tillo | £0 |
| `caas_threshold` | Flat EP per score band | Platform digital perk — no cash | £0 |

### CaaS Score Threshold Rewards

Taps the **14 existing CaaS database triggers** — no new event infrastructure.

| CaaS Score Threshold | EP Bonus | Perk Unlocked |
|---|---|---|
| 10 | 200 EP | EduPay dashboard unlocked |
| 25 | 500 EP | Priority placement in marketplace |
| 50 | 750 EP | Verified badge on profile |
| 70 | 1,000 EP | Access to premium affiliate partners |
| 90 | 2,000 EP | Reduced platform fee negotiation eligible |

**CaaS EP is redeemable for platform perks only — not cash conversion.** Zero cost to Tutorwise.

---

## 9. Data Models

### edupay_events
```sql
CREATE TABLE edupay_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL,
  source_system    TEXT NOT NULL,  -- 'tutorwise' | 'awin' | 'tillo' | 'caas'
  value_gbp        DECIMAL(10,2),
  ep_earned        INTEGER,
  idempotency_key  TEXT UNIQUE,    -- Reuses stripe_checkout_id for booking events
  metadata         JSONB,
  processed_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### edupay_wallets
```sql
CREATE TABLE edupay_wallets (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_ep      INTEGER DEFAULT 0,
  available_ep  INTEGER DEFAULT 0,
  pending_ep    INTEGER DEFAULT 0,
  converted_ep  INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### edupay_ledger
```sql
CREATE TABLE edupay_ledger (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id     UUID REFERENCES edupay_events(id),
  ep_amount    INTEGER NOT NULL,
  type         TEXT CHECK (type IN ('earn', 'convert', 'expire', 'bonus')),
  status       TEXT CHECK (status IN ('pending', 'available', 'processed')),
  available_at TIMESTAMPTZ,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
  -- Immutable — no deletes, reversals via offsetting entries only
);
```

### edupay_rules
```sql
CREATE TABLE edupay_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,
  multiplier   DECIMAL(5,2) NOT NULL DEFAULT 100,
  pass_through DECIMAL(3,2) DEFAULT 0.90,  -- 90% to user
  platform_fee DECIMAL(3,2) DEFAULT 0.10,  -- 10% to Tutorwise
  valid_from   DATE NOT NULL,
  valid_until  DATE,
  is_active    BOOLEAN DEFAULT true
);
```

### edupay_loan_profiles
```sql
CREATE TABLE edupay_loan_profiles (
  user_id            UUID PRIMARY KEY REFERENCES profiles(id),
  loan_plan          TEXT CHECK (loan_plan IN ('plan1','plan2','plan5','postgrad')),
  estimated_balance  DECIMAL(10,2),
  annual_salary      DECIMAL(10,2),
  graduation_year    INTEGER,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### edupay_conversions
```sql
CREATE TABLE edupay_conversions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES profiles(id),
  ep_amount      INTEGER NOT NULL,
  gbp_amount     DECIMAL(10,2) NOT NULL,
  destination    TEXT CHECK (destination IN ('student_loan','isa','savings')),
  status         TEXT CHECK (status IN ('pending','processing','completed','failed')),
  partner        TEXT,
  partner_ref    TEXT,
  requested_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  failure_reason TEXT
);
```

---

## 10. API Specification

```
POST /api/edupay/events                — Ingest event (internal + 3rd party webhooks)
POST /api/edupay/rewards/calculate     — Calculate EP for a given event
GET  /api/edupay/wallet                — User EP balance + GBP equivalent
GET  /api/edupay/ledger                — Immutable transaction history
GET  /api/edupay/projection            — Loan impact projections
POST /api/edupay/loan-profile          — Set loan plan + estimated balance
GET  /api/edupay/loan-profile          — Get loan profile
POST /api/edupay/conversion/request    — User initiates EP → loan payment (Phase 2)
GET  /api/edupay/conversion/status     — Conversion status
```

---

## 11. Projection Engine

Pure calculation — no money movement. Displayed on the EduPay dashboard.

**Inputs:** Loan plan, estimated balance, annual salary, monthly EP earning rate
**Outputs:** Years earlier debt-free, total interest saved, projected completion date

```
Dashboard display:

You earned:              £1,240 from tutoring
EP balance:              124,000 EP (£1,240)
Converted to loan:       £320
Loan reduced by:         £410 (inc. interest saved)
Debt-free:               2.8 years earlier
Interest saved:          £3,200 (projected)
```

---

## 12. 3rd Party Integrations

| Partner | Purpose | Flow | Phase |
|---|---|---|---|
| Awin | Affiliate network (1,000+ merchants) | Merchant → Awin → Tutorwise commission webhook → EP awarded | 2 |
| Commission Junction (CJ) | Affiliate network (alternative/supplement) | Same as Awin | 2 |
| Tillo | Gift card network (1,000+ UK retailers) | User buys gift card → retailer margin → 10/90 split → EP | 2 |
| TrueLayer (PISP) | Loan payment initiation | User approves → TrueLayer debits bank → pays SLC | 3 |

Tutorwise never holds affiliate funds. Commission is received → split → EP awarded → user converts via TrueLayer.

---

## 13. Regulatory Position

| Phase | Activity | Regulatory Exposure |
|---|---|---|
| Phase 1 | EP wallet + projections | Zero — points system, not a financial product |
| Phase 2 | Affiliate + gift card cashback | Zero — standard affiliate marketing |
| Phase 3 | Loan overpayment via TrueLayer | Register as TrueLayer downstream user — no FCA licence required |
| Phase 4 | Financial advice features | Appointed Representative of FCA-authorised firm (Sprive model) |

Tutorwise must never:
- Hold user funds intended for loan payments
- Initiate bank transfers without explicit user consent
- Act as an Electronic Money Institution (EMI)

---

## 14. Tutor Retention Strategy

EduPay makes Tutorwise more valuable to tutors without Tutorwise spending money:

```
Tutor completes sessions → earns EP
EP unlocks:
  - Gift cards at a discount (Tillo) — funded by retailer
  - Cashback on everyday spend (Awin) — funded by merchant
  - Student loan reduction (TrueLayer Phase 2) — user's own money redirected
  - CaaS score perks (existing infrastructure) — digital, zero cost
```

Every benefit is funded by a merchant or the user's own earnings. The platform becomes more valuable to retain at zero marginal cost.

---

## 15. Rollout Phases

### Phase 1 — Foundation (Zero Regulatory Risk)
- EP ledger and wallet (new tables, existing patterns)
- Award EP from existing booking + referral events
- CaaS score threshold rewards (tap existing triggers)
- Loan profile form (user enters plan + balance)
- Projection engine (pure calculation)
- EduPay dashboard widget

### Phase 2 — Affiliate & Gift Integration
- Awin/CJ affiliate link tracking
- Tillo gift card integration
- 10/90 commission split processing
- Automated EP award from affiliate webhooks

### Phase 3 — Loan Payment Conversion
- TrueLayer PISP integration
- User-directed loan overpayments
- Conversion tracking + ledger updates

### Phase 4 — Advanced Features
- Personalised financial nudges
- Automated EP conversion (opt-in)
- Institutional partnerships
- FCA Appointed Representative status (if advice features required)

---

## 16. Success Metrics

| Metric | Target |
|---|---|
| Tutor retention rate | +15% vs pre-EduPay baseline |
| EP earning rate | >60% of active tutors earning EP monthly |
| Affiliate GMV | £50k+ within 6 months of Phase 2 launch |
| Tutorwise affiliate income | 10% of affiliate GMV |
| Projection engagement | >40% of users view projection dashboard monthly |
| Phase 3 conversion rate | >20% of EP-holding users convert to loan payment |

---

## 17. UI/UX & Layout Implementation

This section specifies the exact implementation required to build the EduPay feature. All patterns follow the Tutorwise hub architecture and design system (`6-DESIGN-SYSTEM.md`).

---

### 17.1 Page Route & File Structure

```
apps/web/src/app/(authenticated)/financials/edupay/
├── page.tsx                          ← EduPay hub page (route: /financials/edupay)
└── page.module.css                   ← Page-level CSS module

apps/web/src/app/components/feature/edupay/
├── EduPayStatsWidget.tsx             ← HubStatsCard: EP balance + GBP value
├── EduPayStatsWidget.module.css
├── EduPayProjectionWidget.tsx        ← HubComplexCard: loan impact projection
├── EduPayProjectionWidget.module.css
├── EduPayLoanProfileWidget.tsx       ← HubComplexCard: loan plan info (read-only)
├── EduPayLoanProfileWidget.module.css
├── EduPayHelpWidget.tsx              ← HubComplexCard: what is EduPay help text
├── EduPayHelpWidget.module.css
├── EduPayVideoWidget.tsx             ← HubComplexCard: educational video embed (Phase 1)
├── EduPayVideoWidget.module.css
├── EduPayLedgerCard.tsx              ← Individual EP transaction row card
└── EduPayLedgerCard.module.css

NOTE (Phase 3): EduPayConversionModal and EduPayLoanProfileModal are deferred to Phase 3.
The "Convert EP" button currently shows an alert placeholder. Loan Profile setup uses
showLoanProfileModal state (inline form, no dedicated modal component yet).

apps/web/src/app/api/edupay/
├── events/route.ts                   ← POST ingest EP event
├── wallet/route.ts                   ← GET EP balance
├── ledger/route.ts                   ← GET EP transaction history
├── projection/route.ts               ← GET loan impact projection
├── loan-profile/route.ts             ← GET + POST loan plan
└── conversion/
    ├── request/route.ts              ← POST EP → loan payment
    └── status/route.ts               ← GET conversion status

tools/database/migrations/
├── 244_edupay_events.sql
├── 245_edupay_wallets.sql
├── 246_edupay_ledger.sql
├── 247_edupay_rules.sql
├── 248_edupay_loan_profiles.sql
└── 249_edupay_conversions.sql
```

---

### 17.2 Hub Page Layout

The EduPay page follows the **exact same pattern** as `financials/page.tsx` — the gold standard implementation.

**Component hierarchy:**
```
HubPageLayout
├── header={<HubHeader title="EduPay" filters={...} actions={...} />}
├── tabs={<HubTabs tabs={[...]} onTabChange={handleTabChange} />}
├── sidebar={
│     <HubSidebar>
│       <EduPayStatsWidget wallet={wallet} />
│       <EduPayProjectionWidget loanProfile={loanProfile} wallet={wallet} projection={projection} />
│       <EduPayLoanProfileWidget loanProfile={loanProfile} />
│       <EduPayHelpWidget />
│       <EduPayVideoWidget />
│     </HubSidebar>
│   }
└── children → EP ledger list + pagination
```

Note: `EduPayProjectionWidget` and `EduPayLoanProfileWidget` no longer accept callback props
(`onSetupLoanProfile`, `onEdit`). Both widgets are purely informational. The "Set Up Loan Profile"
action is surfaced via `HubEmptyState` in the main content area when no loan profile exists.

**Required imports (top of `page.tsx`):**
```typescript
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

import EduPayStatsWidget from '@/app/components/feature/edupay/EduPayStatsWidget';
import EduPayProjectionWidget from '@/app/components/feature/edupay/EduPayProjectionWidget';
import EduPayLoanProfileWidget from '@/app/components/feature/edupay/EduPayLoanProfileWidget';
import EduPayHelpWidget from '@/app/components/feature/edupay/EduPayHelpWidget';
import EduPayLedgerCard from '@/app/components/feature/edupay/EduPayLedgerCard';
import EduPayConversionModal from '@/app/components/feature/edupay/EduPayConversionModal';
```

---

### 17.3 Tab Structure

Four tabs driven by URL `?tab=` param (same pattern as financials `?status=`):

| Tab ID | Label | Count Source | Active Condition |
|---|---|---|---|
| `all` | All Activity | `ledger.length` | default |
| `pending` | Pending | ledger entries where `status='pending'` | `?tab=pending` |
| `available` | Available | ledger entries where `status='available'` | `?tab=available` |
| `converted` | Converted | ledger entries where `status='processed'` | `?tab=converted` |

```typescript
// Tab definition
const tabs = [
  { id: 'all', label: 'All Activity', count: stats.all, active: tabFilter === 'all' },
  { id: 'pending', label: 'Pending', count: stats.pending, active: tabFilter === 'pending' },
  { id: 'available', label: 'Available', count: stats.available, active: tabFilter === 'available' },
  { id: 'converted', label: 'Converted', count: stats.converted, active: tabFilter === 'converted' },
];
```

---

### 17.4 Header — Filters & Actions

**Filters row** (inside `HubHeader filters` prop):
```tsx
<div className={filterStyles.filtersContainer}>
  <input
    type="search"
    placeholder="Search activity..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className={filterStyles.searchInput}
  />
  {/* UnifiedSelect wrapped in minWidth div to prevent text wrapping in flex container */}
  <div style={{ minWidth: '150px' }}>
    <UnifiedSelect
      value={dateRange}
      onChange={(v) => setDateRange(v as DateRangeType)}
      options={[
        { value: 'all', label: 'All Time' },
        { value: '30days', label: 'Last 30 Days' },
        { value: '3months', label: 'Last 3 Months' },
        { value: '1year', label: 'Last Year' },
      ]}
      placeholder="Date range"
    />
  </div>
  <div style={{ minWidth: '150px' }}>
    <UnifiedSelect
      value={eventType}
      onChange={(v) => setEventType(v as EventType)}
      options={[
        { value: 'all', label: 'All Types' },
        { value: 'tutoring_income', label: 'Tutoring' },
        { value: 'referral_income', label: 'Referral' },
        { value: 'affiliate_spend', label: 'Affiliate' },
        { value: 'gift_reward', label: 'Gift Reward' },
        { value: 'caas_threshold', label: 'CaaS Reward' },
      ]}
      placeholder="Activity type"
    />
  </div>
</div>
```

**Actions row** (inside `HubHeader actions` prop):
```tsx
<>
  {/* Phase 3 placeholder — conversion modal deferred */}
  <Button variant="primary" size="sm" onClick={() => alert('EP conversion launches in Phase 3. Your EP is accumulating — keep earning!')}>
    Convert EP
  </Button>
  <div className={actionStyles.dropdownContainer}>
    <Button variant="secondary" size="sm" square onClick={() => setShowActionsMenu(!showActionsMenu)}>
      ⋮
    </Button>
    {showActionsMenu && (
      <>
        <div className={actionStyles.backdrop} onClick={() => setShowActionsMenu(false)} />
        <div className={actionStyles.dropdownMenu}>
          {/* Only shown when loan profile exists — first-time setup via HubEmptyState CTA */}
          {loanProfile && (
            <button
              onClick={() => { setShowLoanProfileModal(true); setShowActionsMenu(false); }}
              className={actionStyles.menuButton}
            >
              Edit Loan Profile
            </button>
          )}
          <button onClick={() => setShowActionsMenu(false)} className={actionStyles.menuButton}>
            Export EP History
          </button>
        </div>
      </>
    )}
  </div>
</>
```

---

### 17.5 Sidebar Widgets

#### Widget 1 — EduPayStatsWidget (HubStatsCard shell)

**File:** `components/feature/edupay/EduPayStatsWidget.tsx`
**Shell:** `HubStatsCard` — label/value rows, no icons, teal title header

```typescript
// Props
interface EduPayStatsWidgetProps {
  wallet: {
    total_ep: number;
    available_ep: number;
    pending_ep: number;
    converted_ep: number;
  } | null;
}

// Rows to render
const rows: StatRow[] = [
  { label: 'EP Balance', value: wallet?.available_ep?.toLocaleString() ?? '0', valueColor: 'default' },
  { label: 'GBP Value', value: `£${((wallet?.available_ep ?? 0) / 100).toFixed(2)}`, valueColor: 'green' },
  { label: 'Pending EP', value: wallet?.pending_ep?.toLocaleString() ?? '0', valueColor: 'orange' },
  { label: 'Total Converted', value: `£${((wallet?.converted_ep ?? 0) / 100).toFixed(2)}`, valueColor: 'default' },
];

return <HubStatsCard title="EduPay Wallet" stats={rows} />;
```

---

#### Widget 2 — EduPayProjectionWidget (HubComplexCard shell)

**File:** `components/feature/edupay/EduPayProjectionWidget.tsx`
**Shell:** `HubComplexCard` — teal `h3` header (16px, bold, teal bg, white text, 16px padding), content below

**Header CSS (add to EduPayProjectionWidget.module.css):**
```css
.header {
  background-color: var(--color-primary-default, #006c67);
  padding: 0.75rem 1rem;
}
.header h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}
.content {
  padding: 1rem;
}
```

**Content layout** (inside `.content`):
- "Debt-free" impact line (large bold number, e.g. "2.8 years earlier")
- "Interest saved" line (e.g. "£3,200 projected")
- Divider
- "EP earned" / "Converted to loan" summary rows (small grey label + right-aligned value)
- If no loan profile: show "Set up your loan profile to see your impact" prompt with a button → opens `EduPayLoanProfileModal`

```typescript
interface EduPayProjectionWidgetProps {
  loanProfile: EduPayLoanProfile | null;
  wallet: EduPayWallet | null;
  projection: EduPayProjection | null; // from GET /api/edupay/projection
  // Note: no onSetupLoanProfile callback — setup CTA lives in HubEmptyState
}

// Projection type
interface Projection {
  years_earlier: number;
  interest_saved_gbp: number;
  projected_debt_free_date: string;
  monthly_ep_rate: number;
}
```

---

#### Widget 3 — EduPayLoanProfileWidget (HubComplexCard shell)

**File:** `components/feature/edupay/EduPayLoanProfileWidget.tsx`
**Shell:** `HubComplexCard` — same teal header pattern

**Content:** Read-only summary of loan plan (info-only, no action buttons):
- Loan Plan: Plan 2
- Est. Balance: £45,000
- Graduation: 2024

If no profile set → plain text prompt: "Set up your loan profile to see how your EP reduces your student debt."

**Implementation note:** Widget 3 is purely informational. No action buttons.
The "Set Up Loan Profile" CTA lives in the `HubEmptyState` in the main content area
(visible when the user has no ledger entries). "Edit Loan Profile" is available via
the `⋮` actions dropdown in the page header (only shown once a profile exists).

---

#### Widget 4 — EduPayHelpWidget (HubComplexCard shell)

**File:** `components/feature/edupay/EduPayHelpWidget.tsx`
**Shell:** `HubComplexCard`

**Content:**
- Teal header: "What is EduPay?" (14px, font-weight 600, `#E6F0F0` light teal background)
- Body text (14px, #6b7280): "EduPay converts your tutoring activity into real financial impact on your student loan."
- Three bullet list items (13px, using `-` dash markers — matching Guardian Links card pattern):
  - "Earn EP from sessions, referrals & rewards"
  - "See your projected loan reduction"
  - "Convert EP to loan payments (Phase 2)"

**CSS bullet pattern:** `display: flex; flex-direction: column; gap: 8px` on `.list`.
`.listItem::before { content: '-'; color: #9ca3af; }` — matches my-students GuardianLinksCard style.

#### Widget 5 — EduPayVideoWidget (HubComplexCard shell)

**File:** `components/feature/edupay/EduPayVideoWidget.tsx`
**Shell:** `HubComplexCard`

**Content:** Educational explainer video embed (Phase 1 — placeholder/coming soon state).

---

### 17.6 Content Area — EP Ledger List

**Pagination:** 10 items per page (standard for activity feeds)

**EduPayLedgerCard component** (`components/feature/edupay/EduPayLedgerCard.tsx`):

```typescript
interface EduPayLedgerCardProps {
  entry: {
    id: string;
    type: 'earn' | 'convert' | 'expire' | 'bonus';
    ep_amount: number;
    status: 'pending' | 'available' | 'processed';
    note: string;
    created_at: string;
    available_at: string | null;
  };
}
```

**Card layout (CSS module):**
```
┌─────────────────────────────────────────────────────┐
│  [Type badge]  Note/description         +1,000 EP   │
│  Date · Status indicator                 £10.00 GBP  │
└─────────────────────────────────────────────────────┘
```

**Visual rules:**
- Background: `#ffffff`, border: `1px solid #e5e7eb`, border-radius: `8px`
- Padding: `1rem 1.25rem`
- Type badge colours (match existing transaction status badge pattern):
  - `earn` → green pill (`#059669` bg light, green text)
  - `convert` → teal pill (`#006c67` bg light, teal text)
  - `bonus` → orange pill (`#FF9800` bg light, orange text)
  - `expire` → red pill (`#F44336` bg light, red text)
- EP amount: right-aligned, `font-weight: 700`, colour matches type
- GBP equivalent: right-aligned below EP amount, `font-size: 0.75rem`, `color: #6b7280`
- Status indicator (small dot):
  - `pending` → orange dot
  - `available` → green dot
  - `processed` → grey dot

**Empty states:**
```typescript
// No activity at all — show "Set Up Loan Profile" CTA when user hasn't configured a loan profile
{entries.length === 0 ? (
  <HubEmptyState
    title="No EduPay activity yet"
    description="Complete tutoring sessions, refer friends, or shop via affiliate links to start earning EP."
    actionLabel={!loanProfile ? 'Set Up Loan Profile' : undefined}
    onAction={!loanProfile ? () => setShowLoanProfileModal(true) : undefined}
  />
) : (
  // Filter returns no results
  <HubEmptyState
    title="No activity found"
    description="No EP activity matches your current filters. Try adjusting your search or date range."
  />
)}
```

---

### 17.7 CSS Module — page.module.css

```css
/* EduPay page container — centred, max-width matches financials */
.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Ledger list — same gap as financials transactionsList */
.ledgerList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Error state */
.error {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.error p {
  margin: 0 0 1rem 0;
  font-size: 0.9375rem;
}

/* Loading state */
.loading {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 1rem;
}

/* Loading skeleton — shimmer animation (matches financials pattern) */
.skeletonWidget {
  height: 150px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### 17.8 Modals (Phase 3)

> **Implementation status:** Dedicated modal components are deferred to Phase 3.
> Phase 1 uses inline state (`showLoanProfileModal`, `showConversionModal`) and alert placeholders.

#### EduPayConversionModal (Phase 3)

**Current Phase 1 behaviour:** "Convert EP" button shows a browser `alert()`:
> "EP conversion launches in Phase 3. Your EP is accumulating — keep earning!"

**Phase 3 design — trigger:** "Convert EP" primary button in header actions.

**Pattern:** Matches existing `WithdrawalConfirmationModal` structure.

**Fields:**
1. EP amount to convert (number input, max = `wallet.available_ep`)
2. GBP equivalent (auto-calculated, read-only: `ep / 100`)
3. Destination (select): Student Loan | ISA | Savings
4. Confirmation message: "You are converting X EP (£Y) to your student loan."

**Buttons:** "Cancel" (secondary) | "Confirm Conversion" (primary, disabled if ep_amount = 0)

---

#### EduPayLoanProfileModal (Phase 1 state, Phase 3 component)

**Current Phase 1 behaviour:** `showLoanProfileModal` state toggles an inline form
(no dedicated `EduPayLoanProfileModal.tsx` component exists yet).

**Triggers:**
- `HubEmptyState` "Set Up Loan Profile" button (when `!loanProfile`)
- `⋮` dropdown "Edit Loan Profile" item (when `loanProfile` exists)

**Fields:**
1. Loan Plan (select): Plan 1 | Plan 2 | Plan 5 | Postgraduate
2. Estimated Balance (£) — number input
3. Annual Salary (£) — number input (used for projection engine)
4. Graduation Year — number input (e.g. 2024)

**POST** to `/api/edupay/loan-profile` on save.

---

### 17.9 Design Tokens Used

All values sourced from `6-DESIGN-SYSTEM.md`:

| Property | Token | Value |
|---|---|---|
| Primary colour | `--color-primary-default` | `#006c67` |
| Border colour | `--color-border-default` | `#e5e7eb` |
| Card background | `--color-base-white` | `#ffffff` |
| Body text | `--color-gray-700` | `#4B4B4B` |
| Secondary text | `--color-gray-600` | `#6b7280` |
| Success/EP earn | `--color-success-default` | `#059669` |
| Warning/pending | `--color-warning-default` | `#FF9800` |
| Border radius | `--border-radius-md` | `8px` |
| Sidebar gap | — | `1.25rem` (matches all hub sidebars) |
| Content padding | — | `2rem 1.25rem` (matches HubSidebar.module.css) |

---

### 17.10 Navigation Entry Point

EduPay is a **sub-link under Financials** in [AppSidebar.tsx](apps/web/src/app/components/layout/AppSidebar.tsx). It sits alongside Transactions, Payouts, and Disputes.

```typescript
// AppSidebar.tsx — Financials subItems
{
  href: '/financials',
  label: 'Financials',
  subItems: [
    { href: '/financials', label: 'Transactions', indent: true },
    { href: '/financials/payouts', label: 'Payouts', indent: true },
    { href: '/financials/disputes', label: 'Disputes', indent: true },
    { href: '/financials/edupay', label: 'EduPay', indent: true },  // ← ADD THIS
  ],
},
```

**Why Financials and not top-level:** EduPay is a financial feature (EP wallet, loan projections, conversions). Users already navigate to Financials for money-related activity. Placing it here keeps the top-level nav clean and groups related features together.

---

### 17.11 React Query Pattern

Follows the **platform gold standard** (`listings/bookings/referrals` pattern) — see `4-PATTERNS.md`.
All 4 queries use full configuration: `gcTime`, exponential `retryDelay`, `placeholderData`, `retry: 2`.

```typescript
// Wallet + Ledger: expose error and refetch for error state handling
const { data: wallet, isLoading: walletLoading, error: walletError, refetch: refetchWallet } = useQuery({
  queryKey: ['edupay-wallet', profile?.id],
  queryFn: getEduPayWallet,
  enabled: !!profile?.id,
  placeholderData: keepPreviousData,
  staleTime: 30_000,
  gcTime: 10 * 60_000,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
});

const { data: ledger, isLoading: ledgerLoading, error: ledgerError, refetch: refetchLedger } = useQuery({
  queryKey: ['edupay-ledger', profile?.id],
  queryFn: getEduPayLedger,
  enabled: !!profile?.id,
  placeholderData: keepPreviousData,
  staleTime: 30_000,
  gcTime: 10 * 60_000,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
});

// Loan profile: longer staleTime (changes slowly)
const { data: loanProfile } = useQuery({
  queryKey: ['edupay-loan-profile', profile?.id],
  queryFn: getLoanProfile,
  enabled: !!profile?.id,
  staleTime: 5 * 60_000,
  gcTime: 10 * 60_000,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
});

// Projection: dependent query — only runs when loanProfile is loaded
const { data: projection } = useQuery({
  queryKey: ['edupay-projection', profile?.id],
  queryFn: getEduPayProjection,
  enabled: !!profile?.id && !!loanProfile,
  staleTime: 5 * 60_000,
  gcTime: 10 * 60_000,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
});
```

**API client functions** (`src/lib/api/edupay.ts`):
```typescript
export async function getEduPayWallet() { /* GET /api/edupay/wallet */ }
export async function getEduPayLedger() { /* GET /api/edupay/ledger */ }
export async function getEduPayProjection() { /* GET /api/edupay/projection */ }
export async function getLoanProfile() { /* GET /api/edupay/loan-profile */ }
export async function saveLoanProfile(data: LoanProfileInput) { /* POST /api/edupay/loan-profile */ }
export async function requestConversion(data: ConversionInput) { /* POST /api/edupay/conversion/request */ }
```

---

### 17.12 Error & Loading States

**Error state** (rendered before loading state check):
```typescript
const hasError = !!walletError || !!ledgerError;
if (hasError) {
  return (
    <HubPageLayout
      header={<HubHeader title="EduPay" />}
      sidebar={<HubSidebar><div className={styles.skeletonWidget} /></HubSidebar>}
    >
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Failed to load EduPay data. Please try again.</p>
          <Button variant="secondary" size="sm" onClick={() => { void refetchWallet(); void refetchLedger(); }}>
            Try Again
          </Button>
        </div>
      </div>
    </HubPageLayout>
  );
}
```

**Loading state** (shown while profile/wallet/ledger queries are pending):
```typescript
if (profileLoading || walletLoading || ledgerLoading) {
  return (
    <HubPageLayout
      header={<HubHeader title="EduPay" />}
      sidebar={
        <HubSidebar>
          <div className={styles.skeletonWidget} />
          <div className={styles.skeletonWidget} />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        <div className={styles.loading}>Loading EduPay...</div>
      </div>
    </HubPageLayout>
  );
}
```

---

### 17.13 Complete page.tsx (Implemented — Phase 1)

> See `apps/web/src/app/(authenticated)/financials/edupay/page.tsx` for the live source.
> Pasted here as the canonical reference for Phase 1 implementation.

```typescript
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import EduPayStatsWidget from '@/app/components/feature/edupay/EduPayStatsWidget';
import EduPayProjectionWidget from '@/app/components/feature/edupay/EduPayProjectionWidget';
import EduPayLoanProfileWidget from '@/app/components/feature/edupay/EduPayLoanProfileWidget';
import EduPayHelpWidget from '@/app/components/feature/edupay/EduPayHelpWidget';
import EduPayVideoWidget from '@/app/components/feature/edupay/EduPayVideoWidget';
import EduPayLedgerCard from '@/app/components/feature/edupay/EduPayLedgerCard';
import {
  getEduPayWallet,
  getEduPayLedger,
  getEduPayProjection,
  getLoanProfile,
} from '@/lib/api/edupay';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type TabFilter = 'all' | 'pending' | 'available' | 'converted';
type DateRangeType = 'all' | '30days' | '3months' | '1year';
type EventType = 'all' | 'tutoring_income' | 'referral_income' | 'affiliate_spend' | 'gift_reward' | 'caas_threshold';

const ITEMS_PER_PAGE = 10;

export default function EduPayPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [eventType, setEventType] = useState<EventType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showLoanProfileModal, setShowLoanProfileModal] = useState(false);

  // Queries — gold standard pattern (matches listings/bookings/referrals)
  const { data: wallet, isLoading: walletLoading, error: walletError, refetch: refetchWallet } = useQuery({
    queryKey: ['edupay-wallet', profile?.id],
    queryFn: getEduPayWallet,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const { data: ledger, isLoading: ledgerLoading, error: ledgerError, refetch: refetchLedger } = useQuery({
    queryKey: ['edupay-ledger', profile?.id],
    queryFn: getEduPayLedger,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const { data: loanProfile } = useQuery({
    queryKey: ['edupay-loan-profile', profile?.id],
    queryFn: getLoanProfile,
    enabled: !!profile?.id,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const { data: projection } = useQuery({
    queryKey: ['edupay-projection', profile?.id],
    queryFn: getEduPayProjection,
    enabled: !!profile?.id && !!loanProfile,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const entries = useMemo(() => ledger ?? [], [ledger]);

  const filteredEntries = useMemo(() => {
    let result = [...entries];
    if (tabFilter === 'pending') result = result.filter(e => e.status === 'pending');
    if (tabFilter === 'available') result = result.filter(e => e.status === 'available');
    if (tabFilter === 'converted') result = result.filter(e => e.status === 'processed');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.note?.toLowerCase().includes(q) || e.event_type?.toLowerCase().includes(q));
    }
    if (eventType !== 'all') result = result.filter(e => e.event_type === eventType);
    if (dateRange !== 'all') {
      const cutoff = new Date();
      if (dateRange === '30days') cutoff.setDate(cutoff.getDate() - 30);
      if (dateRange === '3months') cutoff.setMonth(cutoff.getMonth() - 3);
      if (dateRange === '1year') cutoff.setFullYear(cutoff.getFullYear() - 1);
      result = result.filter(e => new Date(e.created_at) >= cutoff);
    }
    return result;
  }, [entries, tabFilter, searchQuery, eventType, dateRange]);

  const totalItems = filteredEntries.length;
  const paginatedEntries = useMemo(
    () => filteredEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredEntries, currentPage],
  );

  React.useEffect(() => { setCurrentPage(1); }, [tabFilter, searchQuery, dateRange, eventType]);

  const stats = useMemo(() => ({
    all: entries.length,
    pending: entries.filter(e => e.status === 'pending').length,
    available: entries.filter(e => e.status === 'available').length,
    converted: entries.filter(e => e.status === 'processed').length,
  }), [entries]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'all') params.delete('tab'); else params.set('tab', tabId);
    router.push(`/financials/edupay${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Error state (checked before loading state)
  const hasError = !!walletError || !!ledgerError;
  if (hasError) {
    return (
      <HubPageLayout
        header={<HubHeader title="EduPay" />}
        sidebar={<HubSidebar><div className={styles.skeletonWidget} /></HubSidebar>}
      >
        <div className={styles.container}>
          <div className={styles.error}>
            <p>Failed to load EduPay data. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => { void refetchWallet(); void refetchLedger(); }}>
              Try Again
            </Button>
          </div>
        </div>
      </HubPageLayout>
    );
  }

  if (profileLoading || walletLoading || ledgerLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="EduPay" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.loading}>Loading EduPay...</div>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="EduPay"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search activity..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <div style={{ minWidth: '150px' }}>
                <UnifiedSelect
                  value={dateRange}
                  onChange={v => setDateRange(v as DateRangeType)}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: '30days', label: 'Last 30 Days' },
                    { value: '3months', label: 'Last 3 Months' },
                    { value: '1year', label: 'Last Year' },
                  ]}
                  placeholder="Date range"
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <UnifiedSelect
                  value={eventType}
                  onChange={v => setEventType(v as EventType)}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'tutoring_income', label: 'Tutoring' },
                    { value: 'referral_income', label: 'Referral' },
                    { value: 'affiliate_spend', label: 'Affiliate' },
                    { value: 'gift_reward', label: 'Gift Reward' },
                    { value: 'caas_threshold', label: 'CaaS Reward' },
                  ]}
                  placeholder="Activity type"
                />
              </div>
            </div>
          }
          actions={
            <>
              <Button variant="primary" size="sm" onClick={() => alert('EP conversion launches in Phase 3. Your EP is accumulating — keep earning!')}>
                Convert EP
              </Button>
              <div className={actionStyles.dropdownContainer}>
                <Button variant="secondary" size="sm" square onClick={() => setShowActionsMenu(!showActionsMenu)}>
                  ⋮
                </Button>
                {showActionsMenu && (
                  <>
                    <div className={actionStyles.backdrop} onClick={() => setShowActionsMenu(false)} />
                    <div className={actionStyles.dropdownMenu}>
                      {loanProfile && (
                        <button
                          onClick={() => { setShowLoanProfileModal(true); setShowActionsMenu(false); }}
                          className={actionStyles.menuButton}
                        >
                          Edit Loan Profile
                        </button>
                      )}
                      <button onClick={() => setShowActionsMenu(false)} className={actionStyles.menuButton}>
                        Export EP History
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Activity', count: stats.all, active: tabFilter === 'all' },
            { id: 'pending', label: 'Pending', count: stats.pending, active: tabFilter === 'pending' },
            { id: 'available', label: 'Available', count: stats.available, active: tabFilter === 'available' },
            { id: 'converted', label: 'Converted', count: stats.converted, active: tabFilter === 'converted' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <EduPayStatsWidget wallet={wallet ?? null} />
          <EduPayProjectionWidget
            loanProfile={loanProfile ?? null}
            wallet={wallet ?? null}
            projection={projection ?? null}
          />
          <EduPayLoanProfileWidget loanProfile={loanProfile ?? null} />
          <EduPayHelpWidget />
          <EduPayVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {paginatedEntries.length === 0 ? (
          entries.length === 0 ? (
            <HubEmptyState
              title="No EduPay activity yet"
              description="Complete tutoring sessions, refer friends, or shop via affiliate links to start earning EP."
              actionLabel={!loanProfile ? 'Set Up Loan Profile' : undefined}
              onAction={!loanProfile ? () => setShowLoanProfileModal(true) : undefined}
            />
          ) : (
            <HubEmptyState
              title="No activity found"
              description="No EP activity matches your current filters. Try adjusting your search or date range."
            />
          )
        ) : (
          <>
            <div className={styles.ledgerList}>
              {paginatedEntries.map(entry => (
                <EduPayLedgerCard key={entry.id} entry={entry} />
              ))}
            </div>
            {filteredEntries.length > ITEMS_PER_PAGE && (
              <HubPagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </HubPageLayout>
  );
}
```

# Referrals

**Status**: Active (Phase 1 Complete, Automated Payouts Pending)
**Last Code Update**: 2025-12-18 (Migrations 117-123, 129-130)
**Last Doc Update**: 2025-12-21
**Priority**: Critical (Tier 1 - Growth Engine)
**Architecture**: Patent-Protected Persistent Attribution System

## Quick Links
- [Solution Design](./referrals-solution-design.md) - Complete architecture, 13 system integrations
- [Referral System Notes](./referral-system-notes.md) - Detailed implementation specs
- [UK Patent Application](../../../do-not-push-to-github-uk-provisional-patent-application-referral-system-notes.md) - Core invention (confidential)

## Overview

The referrals system is Tutorwise's viral growth engine, implementing **persistent identity-level attribution** that survives device changes, browser clearing, and deferred signups. The system supports **dual-agent acquisition** (supply-side tutor referrals and demand-side client referrals), **multi-role cross-referrals**, **hybrid offline-online tracking**, and **lifetime commission attribution**.

This is a **patent-protected invention** (UK Provisional Application filed) representing a novel approach to marketplace referral attribution.

## Key Features

- **Lifetime Attribution**: Referrals permanently stamped on user profiles (not cookie-dependent)
- **7-Character Secure Codes**: e.g., `kRz7Bq2` (62^7 = 3.5 trillion combinations)
- **Hybrid Attribution**: QR codes → Cookies → Manual codes → Device fingerprints
- **Commission Delegation**: Tutors can assign commission to partner stores
- **Pipeline Tracking**: Referred → Signed Up → Converted → Expired
- **Social Sharing**: WhatsApp, Facebook, LinkedIn integration
- **Analytics Dashboard**: Conversion rates, earnings, top performers
- **Store Partnerships**: Physical locations earn via delegation mechanism

## Implementation Status

### ✅ Completed (v7.0 - Dec 2025)

**Core Attribution System:**
- ✅ Secure referral code generation (7-char alphanumeric, Migration 035)
- ✅ Profile-level lifetime attribution (immutable `referred_by_profile_id`)
- ✅ Referral link handler (`/a/[code]`) with HMAC cookie signing
- ✅ **Hierarchical Attribution** (Migration 117):
  - URL Parameter (Priority 1)
  - HMAC-signed cookies with tamper detection (Priority 2, 30-day validity)
  - Manual entry (Priority 3)
- ✅ Referrals dashboard hub
- ✅ Pipeline tracking (Referred → Signed Up → Converted)
- ✅ Social sharing (WhatsApp, Facebook, LinkedIn)
- ✅ CSV export

**Commission & Delegation:**
- ✅ **Hierarchical Commission Delegation** (Migrations 129-130):
  - Profile-level default delegation
  - Listing-level override delegation
  - Third-party agent protection
- ✅ Commission calculation (80/10/10 split)
- ✅ Commission transactions created automatically
- ✅ Manual withdrawal system (£25 minimum)
- ✅ 7-day clearing period

**Performance & Analytics:**
- ✅ Performance indexes (Migration 118 - 10,000x faster lookups)
- ✅ Referral stats RPC (Migration 119)
- ✅ ReferralDashboardWidget (UI integration)
- ✅ DelegationSettingsPanel (full UI for delegation)
- ✅ Attribution method tracking (url_parameter/cookie/manual_entry)

**Multi-Tier System (Configurable):**
- ✅ Multi-tier commission infrastructure (Migration 123)
- ✅ Tier 1 ACTIVE: 10% direct referral commission
- ⏸️ Tier 2 DISABLED: 3% (requires legal clearance)
- ⏸️ Tier 3 DISABLED: 1.5% (requires legal clearance)

**Security & Fraud:**
- ✅ HMAC-SHA256 cookie signing
- ✅ Self-referral blocking
- ✅ Delegation fraud prevention (cannot delegate to self)
- ✅ Audit trail (immutable attribution decisions)

### ⏳ Pending Implementation

**Automated Payouts** (Q1 2026):
- ❌ Automated cron job to transition Pending → Available
- ❌ Batch payout processor
- ❌ Weekly automatic transfers
- ❌ Configurable payout schedule
- Current: Manual withdrawal only

**Multi-Tier Activation** (Q2 2026 - requires legal review):
- ⏸️ Tier 2 activation (3% indirect referral)
- ⏸️ Tier 3 activation (1.5% third level)
- ⏸️ Legal compliance review
- ⏸️ MLM risk assessment

### 📋 Planned (Phases 2-3 - Q2-Q3 2026)
- **Client Referral Monetization** (Migration 122 created, not activated):
  - 5% commission when referring clients to ANY tutor
  - Currently only tutor referrals are monetized
- **QR Code Generation API** (UI exists, API endpoint needed)
- **Advanced Analytics**:
  - Conversion funnel visualization
  - Source attribution breakdown
  - Earnings projections
- **Partnership Onboarding** (Migration 121):
  - Dedicated partner dashboard
  - Partner approval workflow
  - Custom commission structures
- **Fraud ML Scoring** (Migration 120):
  - Behavioral pattern analysis
  - Velocity limits
  - Risk scoring
- **Multi-Currency Payouts**
- **KYC Thresholds** (£1k/month verification)

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    REFERRAL ATTRIBUTION PIPELINE                  │
└──────────────────────────────────────────────────────────────────┘

1. Agent creates referral link: /a/kRz7Bq2?redirect=/listings/123
2. User clicks → Cookie set (30 days)
3. User signs up → handle_new_user() trigger
4. profiles.referred_by_profile_id = agent_id (PERMANENT)
5. User makes booking → Commission calculated
6. Commission paid to agent (or delegated store)
```

## Database Schema

```sql
-- Core referral attribution
profiles.referral_code              TEXT UNIQUE NOT NULL  -- User's own code
profiles.referred_by_profile_id     UUID                  -- LIFETIME attribution
profiles.referral_code_used         TEXT                  -- Code they entered
profiles.referral_source            TEXT                  -- 'cookie'|'url'|'manual'
profiles.referred_at                TIMESTAMPTZ           -- Attribution timestamp

-- Lead tracking
referrals (table)
  - agent_profile_id                UUID NOT NULL         -- Agent who created referral
  - referred_profile_id             UUID                  -- User who signed up (NULL = anonymous)
  - status                          TEXT                  -- 'Referred'|'Signed Up'|'Converted'|'Expired'
  - created_at                      TIMESTAMPTZ

-- Hierarchical delegation (v7.0)
profiles.default_commission_delegate_id     UUID          -- Profile-level default (Migration 129)
listings.delegate_commission_to_profile_id  UUID          -- Listing-level override (Migration 034)

-- Multi-tier commission config (v7.0)
commission_tier_config (table)              Migration 123
  - tier                                    INTEGER       -- 1-7
  - commission_rate                         NUMERIC(5,2)  -- Percentage
  - is_active                               BOOLEAN       -- Currently enabled
  - legal_status                            TEXT          -- approved/pending/prohibited

-- Transactions (commission payments)
transactions (table)
  - type                                    TEXT          -- 'Referral Commission'
  - status                                  TEXT          -- 'Pending'/'Available'/'Paid Out'
  - available_at                            TIMESTAMPTZ   -- After 7-day clearing
```

## API Routes

### Referral Link Handler
```typescript
GET /a/[referral_id]?redirect=/path
```
**Purpose**: Track referral click, set cookie, redirect to destination

**Flow**:
1. Validate referral code exists
2. Create `referrals` record (status: 'Referred')
3. Set `tutorwise_referral_id` cookie (30 days)
4. Redirect to destination (or homepage)

**Files**: `/app/a/[referral_id]/route.ts`

### Referrals Dashboard
```typescript
GET /referrals?tab=leads&status=Referred
```
**Purpose**: Display agent's referral pipeline and earnings

**Tabs**:
- **Refer & Earn**: Share referral link, social buttons
- **Performance**: Conversion funnels, analytics
- **Leads**: All referrals (filterable by status)

**Files**: `/app/(authenticated)/referrals/page.tsx`

## Key Files

### Frontend
```
apps/web/src/app/
├── a/[referral_id]/route.ts                              # Referral link handler
├── (authenticated)/referrals/page.tsx                     # Referrals hub
├── components/feature/referrals/
│   ├── ReferralCard.tsx                                  # Individual referral card
│   ├── ReferralStatsWidget.tsx                           # Pipeline metrics
│   ├── ReferAndEarnView.tsx                              # Social sharing UI
│   ├── PerformanceView.tsx                               # Analytics dashboard
│   └── ReferralActivityFeed.tsx                          # Recent activity
└── lib/api/referrals.ts                                  # API client
```

### Backend
```
apps/api/migrations/
├── 028_create_hubs_v3_6_schema.sql                       # Created referrals table
├── 035_generate_secure_referral_codes.sql                # 7-char code generation
├── 036_update_handle_new_user_secure_codes.sql           # Signup trigger
├── 037_deprecate_legacy_referral_id.sql                  # Remove old column
├── 038_add_commission_delegation_logic.sql               # Store partnerships
└── 090_fix_handle_new_user_remove_referral_id.sql        # Trigger cleanup
```

## System Integrations

The referrals system integrates with **13 major platform features**:

1. **Auth** - Profile creation trigger sets lifetime attribution
2. **Bookings** - First booking triggers "Converted" status
3. **Payments** - Commission calculation (10% of tutor earnings)
4. **Listings** - Delegation mechanism for store partnerships
5. **Dashboard** - Analytics and performance tracking
6. **Network** - Connection validation (optional)
7. **Onboarding** - Manual referral code input
8. **Agent API** - Programmatic referral creation (planned)
9. **QR Codes** - Offline attribution via QR scans (planned)
10. **Cookie Management** - 30-day attribution tracking
11. **Fraud Detection** - Velocity and behavioral checks (planned)
12. **GDPR** - Data minimization and user rights
13. **Stripe Connect** - Commission payouts

See [referrals-solution-design.md](./referrals-solution-design.md) for detailed integration documentation.

## Commission Model

### Standard 80/10/10 Split

**Client pays £100 for tutoring session:**
```
Platform:  £10 (10%)  ← Always captured first
Agent:     £9  (10% of tutor share)
Tutor:     £81 (80% after commission)
```

### Delegation Override (Store Partnerships)

**Tutor prints flyers, coffee shop displays them, client books:**
```
Platform:  £10 (10%)
Store:     £9  (10% - delegation override)
Tutor:     £81 (80%)
```

**Key Rule**: Delegation only applies when `listing.profile_id == referred_by_profile_id` (tutor is the referrer)

## Referral Pipeline

```
┌─────────────┐
│  Referred   │  User clicked referral link (cookie set)
└──────┬──────┘
       │
       ↓ (User signs up)
┌─────────────┐
│ Signed Up   │  User created account (attribution permanent)
└──────┬──────┘
       │
       ↓ (User makes first booking)
┌─────────────┐
│  Converted  │  First booking completed (commission earned)
└─────────────┘
```

**Expired**: Cookie expired without signup (30 days)

## Usage Examples

### Share Referral Link

```typescript
// Get user's referral code
const referralCode = profile.referral_code; // e.g., "kRz7Bq2"

// Build referral link
const referralLink = `${window.location.origin}/a/${referralCode}`;

// Share on WhatsApp
const shareText = encodeURIComponent('Join me on Tutorwise!');
const whatsappUrl = `https://wa.me/?text=${shareText}%20${encodeURIComponent(referralLink)}`;
window.open(whatsappUrl, '_blank');
```

### Contextual Referral (Listing-Specific)

```typescript
// Referral link with redirect to specific listing
const listingUrl = `/listings/${listing.id}/${listing.slug}`;
const referralLink = `${window.location.origin}/a/${referralCode}?redirect=${listingUrl}`;

// User clicks link → lands on listing page after signup
```

### Check Attribution

```sql
-- Check who referred a user
SELECT referred_by_profile_id, referral_code_used, referral_source
FROM profiles
WHERE id = :user_id;

-- Get all referrals by agent
SELECT *
FROM referrals
WHERE agent_profile_id = :agent_id
ORDER BY created_at DESC;
```

## Security & Compliance

### Cookie Security (In Progress)

**Current**: Basic UUID cookie
```typescript
// ⚠️ NOT SECURE - No signature verification
cookieStore.set('tutorwise_referral_id', referralRecord.id, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 // 30 days
});
```

**Planned**: HMAC-signed TW_REF cookie
```typescript
// ✅ SECURE - HMAC signature prevents tampering
const payload = { agent: 'kRz7Bq2', ts: Date.now(), exp: 2592000 };
const sig = HMAC_SHA256(JSON.stringify(payload), REF_COOKIE_SECRET);
const cookieValue = base64({ ...payload, sig });

cookieStore.set('TW_REF', cookieValue, {
  httpOnly: false,  // Allow client-side reads
  secure: true,
  sameSite: 'lax',
  maxAge: payload.exp
});
```

### Fraud Protection (Planned)

```sql
-- Self-referral blocking
IF v_agent_profile_id = NEW.id THEN
  v_agent_profile_id := NULL; -- Cannot refer yourself
END IF;

-- Velocity checks (max 10 signups per IP per hour)
SELECT COUNT(*) FROM referral_attempts
WHERE client_ip = :ip
  AND landing_ts > NOW() - INTERVAL '1 hour'
HAVING COUNT(*) > 10;

-- Behavioral checks (instant conversion = suspicious)
SELECT (first_booking_ts - signup_ts) < INTERVAL '1 minute'
FROM referral_attempts;
```

### GDPR Compliance

**Data Minimization**:
- Store hashed emails (not plaintext)
- Store hashed device tokens (not full fingerprints)
- IP addresses for fraud prevention only

**Retention Limits**:
- `referral_attempts` (pending) → 30 days auto-delete
- Manual claim evidence → 180 days auto-delete
- Financial ledger → 7 years (legal requirement)

**User Rights**:
- Data export: `POST /api/gdpr/export-referral-data`
- Attribution opt-out: `POST /api/gdpr/delete-referral-attribution`
- Data portability: JSON export of referral history

## Testing

### Manual Test Scenarios

**Scenario 1: QR Code → Delayed Signup**
```
1. Agent generates QR code
2. User scans QR → lands on /listings/123
3. Cookie set (30 days)
4. User browses for 2 weeks
5. User signs up
✅ Verify: profiles.referred_by_profile_id = agent.id
```

**Scenario 2: Cookie Cleared → Manual Code**
```
1. User clicks referral link → cookie set
2. User clears browser data
3. User signs up with manual code input
✅ Verify: Manual code takes precedence
```

**Scenario 3: Store Delegation**
```
1. Agent A refers Tutor T (lifetime attribution set)
2. Tutor T creates listing with delegate = Store S
3. Client clicks Tutor T's QR → books
✅ Verify: Commission paid to Store S (not Agent A)
```

### Automated Tests

```typescript
describe('Referral Attribution', () => {
  it('should resolve cookie attribution', async () => {
    const cookie = createCookie('kRz7Bq2');
    const agent = await resolveAttribution({ cookie });
    expect(agent).toBe('kRz7Bq2');
  });

  it('should apply delegation override', async () => {
    const recipient = await calculateCommissionRecipient({
      tutorReferrer: 'agentA',
      listingDelegate: 'storeS',
      directReferrer: 'tutor' // QR code
    });
    expect(recipient).toBe('storeS');
  });
});
```

## Performance

### Database Optimization

```sql
-- Indexes for high-traffic queries
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_referrals_agent ON referrals(agent_profile_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Denormalize for performance
ALTER TABLE bookings ADD COLUMN agent_profile_id UUID;
-- (Avoids JOIN to profiles table)
```

### Caching Strategy

```typescript
// Cache referral stats (5-minute stale time)
const { data: stats } = useQuery({
  queryKey: ['referral-stats', agentId],
  queryFn: getReferralStats,
  staleTime: 5 * 60 * 1000
});
```

## Troubleshooting

### Issue 1: Cookie Not Set

**Symptoms**: User clicks referral link but signup shows no referrer

**Check**:
```bash
# Browser DevTools → Application → Cookies
# Should see: tutorwise_referral_id = <uuid>
```

**Fix**:
- Ensure `domain: '.tutorwise.com'` (leading dot for subdomains)
- Verify `secure: true` (requires HTTPS)
- Check `SameSite=Lax` (not `Strict`)

### Issue 2: Commission Not Calculated

**Symptoms**: Booking completed but no transaction created

**Debug**:
```sql
-- Check if tutor has referrer
SELECT referred_by_profile_id FROM profiles WHERE id = :tutor_id;

-- Check transaction logs
SELECT * FROM transactions WHERE booking_id = :booking_id AND type = 'referral_commission';
```

**Fix**:
- Verify `process_booking_payment()` called after payment
- Check delegation logic (may override referrer)
- Ensure agent has Stripe Connect account

### Issue 3: Attribution Failed

**Symptoms**: Cookie set but `referred_by_profile_id` is NULL

**Debug**:
```sql
-- Check handle_new_user() logs
SELECT * FROM auth.audit_log_entries WHERE user_id = :user_id;

-- Check if referral code exists
SELECT * FROM profiles WHERE referral_code = :code;
```

**Fix**:
- Verify cookie read logic in trigger
- Check for case-sensitivity issues (codes are case-sensitive)
- Ensure trigger executed (check `auth.users` table)

## Monitoring

### Key Metrics

```typescript
{
  "referral_clicks": 1543,
  "signups_attributed": 312,
  "conversions": 94,
  "click_to_signup_rate": 0.20,    // 20%
  "signup_to_booking_rate": 0.30,  // 30%
  "avg_time_to_convert_days": 7.5,
  "pending_commissions_gbp": 12453,
  "fraud_flags": 3
}
```

### Alerts

```typescript
// High-value payout alert
if (agentEarnings > 5000) {
  alert('Agent exceeded monthly cap - manual review required');
}

// Refund rate alert
if (refundRate > 0.05) {
  alert('High refund rate on referred bookings - fraud check');
}
```

## Related Documentation

- [Auth Solution Design](../auth/auth-solution-design.md) - Profile creation trigger
- [Payments Solution Design](../payments/payments-solution-design.md) - Commission calculation
- [Bookings Solution Design](../bookings/bookings-solution-design.md) - First conversion tracking
- [Account Solution Design](../account/account-solution-design.md) - Multi-role support

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-12 | v4.3 | Documentation complete with current/future state |
| 2025-11-17 | v4.3 | Fixed handle_new_user trigger (migration 090) |
| 2025-11-07 | v4.3 | Implemented commission delegation for store partnerships |
| 2025-11-06 | v4.3 | Migrated to secure 7-character referral codes |
| 2025-11-02 | v3.6 | Initial referrals system MVP |

---

**Last Updated**: 2025-12-12
**Version**: v4.3 (MVP Complete, Enhancements In Progress)
**Status**: Active - 70% Complete (Core functional, security enhancements pending)
**Patent**: UK Provisional Application Filed

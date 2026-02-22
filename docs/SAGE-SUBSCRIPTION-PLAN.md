# Sage AI Tutor Pro Subscription Implementation Plan

**Date**: 2026-02-22
**Version**: 2.0 - Updated to "Pro" tier
**Based on**: Organisation Subscription Pattern

---

## Executive Summary

Implementation plan for Sage AI Tutor **Pro** subscription tier following the proven organisation subscription pattern.

**Note**: "Premium" tier reserved for future higher-tier offering.

**Pricing**: £10/month
**Question Limit**: 5,000 questions/month
**Storage Limit**: 1 GB
**Trial Period**: 14 days (configurable)
**Tier Naming**: Free → **Pro** → Premium (future)

---

## Storage Cost Analysis

### Current Pricing (2026)

| Provider | Storage Cost | Bandwidth Cost | Notes |
|----------|--------------|----------------|-------|
| Supabase Storage | $0.021/GB/month | $0.09/GB | Built-in, integrated with Supabase |
| AWS S3 Standard | $0.023/GB/month | $0.09/GB (first 10TB) | Industry standard |
| Cloudflare R2 | $0.015/GB/month | $0.00 | Zero egress fees |

### Usage Estimates

**Multimodal Input File Sizes**:
- OCR Images (JPEG/PNG): 1-5 MB per upload
- Audio Files (WebM/MP3): 1-10 MB per recording
- PDF Documents: 0.5-20 MB per file
- LaTeX rendered outputs: <1 MB

**Typical Pro User Monthly Usage**:
- 50 image uploads × 3 MB = 150 MB
- 20 audio recordings × 5 MB = 100 MB
- 10 PDF uploads × 5 MB = 50 MB
- **Total: ~300 MB/month average**

### Storage Limit Recommendations

| Tier | Storage | Monthly Cost (per user) | Notes |
|------|---------|------------------------|-------|
| Conservative: 250 MB | 250 MB | £0.005 | Minimal storage |
| **✅ Selected: 1 GB** | 1 GB | £0.02 | Professional tier |
| Generous: 5 GB | 5 GB | £0.10 | Heavy users/schools |
| Premium (future): 10 GB | 10 GB | £0.21 | Unlimited tier |

**✅ Selected: 1 GB (Sage Pro)**
- **Cost per user**: ~£0.02/month (0.2% of revenue)
- **Capacity**: ~200-1,000 images OR ~100-200 audio files OR ~50-200 PDFs
- **Professional positioning**: 1GB sounds more substantial than 500MB
- **Profit margin**: 99.8% on storage component
- **Future flexibility**: Can offer 10GB for Premium tier later

**Rationale**: Storage costs are negligible compared to £10/month revenue. 1GB provides professional-tier UX without meaningful cost impact.

---

## Sage Pro Features

### Included in Sage Pro (£10/month)

1. **Question Quota**
   - 5,000 questions per month
   - Rollover: No (resets monthly)
   - Overage: Soft limit (show warning, allow 10% overage, then hard block)

2. **Document Storage**
   - 1 GB total storage
   - Multimodal uploads: OCR images, audio recordings, PDFs
   - Files stored in Supabase Storage (CDN-backed)
   - Automatic cleanup of files older than 6 months (configurable)

3. **Advanced Features**
   - Priority response (lower latency)
   - Extended conversation history (100 messages vs 10 for free)
   - Download session transcripts as PDF
   - Custom study schedules
   - Progress tracking & analytics
   - Access to all 6 subjects (Maths, Biology, Chemistry, Physics, History, Geography)

4. **Curriculum Access**
   - Full access to 100+ curriculum topics
   - Science & Humanities content (Pro-only)
   - Assessment questions & practice tests
   - Worked examples with step-by-step solutions

### Free Tier Limits

- 10 questions per month
- No document storage
- Basic features only
- Maths-only (other subjects require Pro)
- 10 message conversation history

---

## Database Schema

### New Table: `sage_pro_subscriptions`

Following the `organisation_subscriptions` pattern (renamed to "Pro"):

```sql
CREATE TABLE IF NOT EXISTS public.sage_pro_subscriptions (
  -- Primary key is user_id (one subscription per user)
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Subscription status
  status TEXT NOT NULL CHECK (status IN (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'unpaid'
  )) DEFAULT 'trialing',

  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Billing cycle
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Cancellation tracking
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Sage Pro-specific: Usage tracking
  questions_used_this_month INTEGER DEFAULT 0,
  questions_quota INTEGER DEFAULT 5000,
  storage_used_bytes BIGINT DEFAULT 0,
  storage_quota_bytes BIGINT DEFAULT 1073741824, -- 1 GB in bytes

  -- Reset tracking
  last_quota_reset TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### New Table: `sage_usage_log`

Track question usage for billing and analytics:

```sql
CREATE TABLE IF NOT EXISTS public.sage_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,

  -- Usage details
  questions_count INTEGER DEFAULT 1,
  tokens_used INTEGER,
  model_used TEXT, -- 'gemini-1.5-flash', 'gemini-1.5-pro', etc.

  -- Cost tracking (for analytics)
  estimated_cost_usd DECIMAL(10, 6),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  INDEX idx_sage_usage_log_user_id (user_id),
  INDEX idx_sage_usage_log_created_at (created_at),
  INDEX idx_sage_usage_log_user_month (user_id, created_at)
);
```

### New Table: `sage_storage_files`

Track uploaded files for storage quota:

```sql
CREATE TABLE IF NOT EXISTS public.sage_storage_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File details
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'audio', 'pdf'
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path

  -- OCR/Transcription results (cached)
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed'

  -- Associated session
  session_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  INDEX idx_sage_storage_user_id (user_id),
  INDEX idx_sage_storage_created_at (created_at),
  INDEX idx_sage_storage_size (file_size_bytes)
);
```

---

## Implementation Approach

### Option 1: Copy Organisation Pattern (Recommended)

**Pros**:
- Proven, tested implementation
- Consistent UX across platform
- Faster development (1-2 days)
- Lower risk of bugs
- Easier maintenance

**Cons**:
- Less flexibility for Sage-specific features
- Some code duplication

**Effort**: 1-2 days

### Option 2: Shared Subscription Infrastructure

**Pros**:
- DRY (Don't Repeat Yourself)
- Single source of truth
- Easier to add new subscription types

**Cons**:
- More complex architecture
- Higher risk of breaking changes
- Longer development time
- Requires refactoring existing org subscriptions

**Effort**: 3-5 days

**Recommendation**: **Option 1 (Copy Pattern)** - Faster, safer, proven approach. Can refactor to shared infrastructure later if needed.

---

## Implementation Checklist

### Phase 1: Database & Backend (Day 1)

- [ ] Create database migration `276_create_sage_pro_subscriptions.sql`
- [ ] Create `sage_usage_log` table
- [ ] Create `sage_storage_files` table
- [ ] Add RLS policies for all tables
- [ ] Create helper functions (`sage_has_active_pro_subscription`, `sage_check_quota`, `sage_increment_usage`)
- [ ] Run migration on dev database

### Phase 2: Server-side Utilities (Day 1)

- [ ] Create `src/lib/stripe/sage-pro-subscription.ts` (copy from organisation-subscription.ts)
- [ ] Create `src/lib/stripe/sage-pro-subscription-utils.ts` (types, isPro helper)
- [ ] Add Stripe product & price in Stripe Dashboard (£10/month)
- [ ] Add `STRIPE_SAGE_PRO_PRICE_ID` to `.env.local`
- [ ] Create quota checking middleware

### Phase 3: API Endpoints (Day 1-2)

- [ ] `POST /api/stripe/sage/checkout/trial` - Start trial
- [ ] `POST /api/stripe/sage/billing-portal` - Manage subscription
- [ ] `POST /api/stripe/sage/cancel` - Cancel subscription
- [ ] `GET /api/sage/subscription` - Get subscription status
- [ ] `GET /api/sage/usage` - Get current usage stats
- [ ] Update Stripe webhook to handle Sage subscriptions

### Phase 4: User-facing Pages (Day 2)

- [ ] Create `/sage/billing` page (copy from organisations/settings/billing)
- [ ] Add subscription status banner to Sage chat
- [ ] Add quota indicator UI component
- [ ] Add upgrade prompts when quota exceeded
- [ ] Add storage usage indicator

### Phase 5: Admin Panel (Day 2)

- [ ] Create `/admin/sage` subscription management page
- [ ] Add user search & subscription status view
- [ ] Add manual subscription override (for support/refunds)
- [ ] Add usage analytics dashboard
- [ ] Add storage cleanup tools

### Phase 6: Quota Enforcement (Day 2)

- [ ] Add quota check to `POST /api/sage/message`
- [ ] Add quota check to `POST /api/sage/ocr`
- [ ] Add quota check to `POST /api/sage/transcribe`
- [ ] Add storage check to file upload endpoints
- [ ] Create cron job for monthly quota reset
- [ ] Create cron job for old file cleanup (6 months)

### Phase 7: Testing & Deployment (Day 3)

- [ ] Test trial signup flow
- [ ] Test payment & subscription activation
- [ ] Test quota enforcement (hit limit, see upgrade prompt)
- [ ] Test storage quota (upload until limit)
- [ ] Test subscription cancellation
- [ ] Test webhook handling (subscription updated, payment failed)
- [ ] Deploy to production

---

## File Structure

```
apps/web/src/
├── lib/
│   ├── stripe/
│   │   ├── sage-subscription.ts          # Server-side subscription logic
│   │   └── sage-subscription-utils.ts    # Client-safe types & helpers
│   └── api/
│       └── sage-subscription.ts          # Client-side API functions
├── app/
│   ├── (authenticated)/
│   │   └── sage/
│   │       └── billing/
│   │           └── page.tsx              # User billing page
│   └── (admin)/
│       └── admin/
│           └── sage/
│               └── page.tsx              # Admin subscription management
└── api/
    └── stripe/
        └── sage/
            ├── checkout/
            │   └── trial/
            │       └── route.ts          # Start trial endpoint
            └── billing-portal/
                └── route.ts              # Manage subscription endpoint

tools/database/migrations/
└── 276_create_sage_pro_subscriptions.sql     # Database migration

sage/
└── docs/
    └── SUBSCRIPTION.md                    # Sage Pro subscription documentation
```

---

## Stripe Configuration

### Products & Prices

**Product**: "Sage AI Tutor Pro"
- Name: `Sage Pro`
- Description: "5,000 questions/month, 1GB storage, all subjects"
- Price: £10.00/month (GBP)
- Billing: Monthly recurring
- Trial: 14 days

**Environment Variables**:
```env
# Add to .env.local
STRIPE_SAGE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
```

---

## Usage Quota Logic

### Monthly Reset

```typescript
// Cron job: Reset quotas on 1st of each month
async function resetMonthlyQuotas() {
  await supabase
    .from('sage_pro_subscriptions')
    .update({
      questions_used_this_month: 0,
      last_quota_reset: new Date().toISOString(),
    })
    .lt('last_quota_reset', startOfMonth(new Date()));
}
```

### Quota Check

```typescript
async function checkQuota(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const subscription = await getSageSubscription(userId);

  // Free tier: 10 questions/month
  const quota = subscription?.questions_quota || 10;
  const used = subscription?.questions_used_this_month || 0;

  return {
    allowed: used < quota || (used < quota * 1.1), // 10% overage grace
    remaining: Math.max(0, quota - used),
  };
}
```

---

## Migration Strategy

### Existing Sage Users

**Question**: What happens to existing Sage users?

**Options**:

1. **Grandfather Existing Users (Recommended)**
   - All existing users get 30 days free Pro
   - Graceful transition period
   - Positive UX

2. **Immediate Enforcement**
   - Existing users hit quota immediately
   - May frustrate early adopters

3. **Hybrid Approach**
   - Active users (used Sage in last 30 days): 30 days free
   - Inactive users: Standard free tier
   - Best balance

**Recommendation**: Option 3 (Hybrid) - Rewards active users while being fair to new users.

---

## Success Metrics

### Conversion Goals

- **Trial → Paid**: 15-25% (industry standard for SaaS)
- **Monthly churn**: <5%
- **Lifetime Value (LTV)**: £60+ (6 months average)

### Usage Metrics

- Average questions per Pro user: 1,000-2,000/month
- Storage usage per user: 200-400 MB
- Most popular feature: Multimodal input (OCR)

### Revenue Projections

| Users | Conversion | Revenue/Month | Revenue/Year |
|-------|------------|---------------|--------------|
| 1,000 | 20% | £2,000 | £24,000 |
| 5,000 | 20% | £10,000 | £120,000 |
| 10,000 | 20% | £20,000 | £240,000 |

---

## Next Steps

1. **Create Database Migration** (276_create_sage_pro_subscriptions.sql)
2. **Copy & Adapt Organisation Pattern** (sage-pro-subscription.ts)
3. **Test with Stripe Test Mode**
4. **Deploy to Production**

---

## Appendix: Comparison with Organisation Subscriptions

| Feature | Organisation | Sage |
|---------|-------------|------|
| Price | £50/month | £10/month |
| Trial | 14 days | 14 days |
| Entity | Organisation (multi-user) | User (single) |
| Limits | Team seats | Questions, storage |
| Primary Use | CRM, team features | AI tutoring, multimodal |
| Target Users | Agencies, schools | Students, parents, tutors |

---

**Document Version**: 1.0
**Last Updated**: 2026-02-22
**Status**: Ready for Implementation

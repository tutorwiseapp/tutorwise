# Referral System - Next Steps After Deployment

**Date**: 2025-12-16
**Current Status**: ✅ Code Complete, Ready for Deployment
**Git Commit**: `bec071c7`

---

## Immediate Actions Required

### 1. Deploy to Production (30 minutes)

Follow the step-by-step guide: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

**Quick Checklist**:
- [ ] Generate `REFERRAL_COOKIE_SECRET` using `openssl rand -hex 32`
- [ ] Add secret to Vercel: `vercel env add REFERRAL_COOKIE_SECRET production`
- [ ] Run Migration 091 in Supabase SQL Editor
- [ ] Run Migration 092 in Supabase SQL Editor
- [ ] Deploy code: `vercel --prod`
- [ ] Run smoke tests (manual + E2E)
- [ ] Monitor logs for first 24 hours

**Estimated Time**: 30 minutes
**Prerequisites**: Access to Vercel + Supabase dashboards

---

## Post-Deployment Tasks (Week 1)

### 2. Create RPC Function for Referral Stats

The `ReferralDashboardWidget` component calls `get_referral_stats` RPC function which doesn't exist yet.

**File to Create**: `apps/api/migrations/093_create_referral_stats_rpc.sql`

```sql
/**
 * Migration 093: Create get_referral_stats RPC Function
 * Purpose: Power the ReferralDashboardWidget with real-time KPI data
 */

CREATE OR REPLACE FUNCTION get_referral_stats(p_agent_id UUID)
RETURNS TABLE (
  total_clicks INTEGER,
  total_signups INTEGER,
  total_conversions INTEGER,
  total_commission_earned NUMERIC,
  conversion_rate NUMERIC,
  signup_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total clicks (referrals created)
    COUNT(*)::INTEGER AS total_clicks,

    -- Total signups (status = 'Signed Up' or 'Converted')
    COUNT(*) FILTER (WHERE r.status IN ('Signed Up', 'Converted'))::INTEGER AS total_signups,

    -- Total conversions (status = 'Converted')
    COUNT(*) FILTER (WHERE r.status = 'Converted')::INTEGER AS total_conversions,

    -- Total commission earned
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'commission_earned' AND t.status = 'completed'), 0) AS total_commission_earned,

    -- Conversion rate (conversions / signups * 100)
    CASE
      WHEN COUNT(*) FILTER (WHERE r.status IN ('Signed Up', 'Converted')) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE r.status = 'Converted')::NUMERIC /
         COUNT(*) FILTER (WHERE r.status IN ('Signed Up', 'Converted'))::NUMERIC) * 100,
        2
      )
      ELSE 0
    END AS conversion_rate,

    -- Signup rate (signups / clicks * 100)
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE r.status IN ('Signed Up', 'Converted'))::NUMERIC /
         COUNT(*)::NUMERIC) * 100,
        2
      )
      ELSE 0
    END AS signup_rate
  FROM referrals r
  LEFT JOIN transactions t ON t.profile_id = p_agent_id AND t.metadata->>'referral_id' = r.id::TEXT
  WHERE r.agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_referral_stats IS
  'Returns aggregated referral stats for the ReferralDashboardWidget';
```

**Priority**: High (required for dashboard widget to function)
**Estimated Time**: 5 minutes

---

### 3. Add ReferralDashboardWidget to Agent Dashboard

**File to Update**: `apps/web/src/app/(authenticated)/dashboard/page.tsx`

```typescript
import ReferralDashboardWidget from '@/app/components/feature/dashboard/widgets/ReferralDashboardWidget';

// Inside the dashboard page component:
<ReferralDashboardWidget
  agentId={user.id}
  referralCode={profile.referral_code}
/>
```

**Priority**: High (make widget visible to users)
**Estimated Time**: 10 minutes

---

### 4. Create Referral Settings Page

**File to Create**: `apps/web/src/app/(authenticated)/account/referrals/settings/page.tsx`

```typescript
import DelegationSettingsPanel from '@/app/components/feature/referrals/DelegationSettingsPanel';

export default async function ReferralSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Referral Settings</h1>
      <DelegationSettingsPanel tutorId={user.id} />
    </div>
  );
}
```

**Priority**: Medium (delegation settings accessible via link)
**Estimated Time**: 15 minutes

---

### 5. Update Signup Flow to Use Referral Context

**File to Update**: `apps/web/src/app/(auth)/signup/page.tsx` (or wherever signup form is)

```typescript
import { buildSignupMetadata } from '@/utils/referral/context';

// In signup handler:
const metadata = await buildSignupMetadata({
  full_name: formData.fullName,
  referral_code_manual: formData.referralCode, // Optional manual entry field
});

await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: { data: metadata }
});
```

**Priority**: High (enables hierarchical attribution)
**Estimated Time**: 20 minutes

---

## Phase 2: Enhancements (Q2 2026)

### 6. QR Code Generation API (Patent Claim 4)

**Endpoint**: `POST /api/referrals/qr-code`

**Features**:
- Generate QR code for agent's referral link
- Support different sizes (200x200, 400x400, 800x800)
- Add custom branding/logo in center
- Track QR code scans (separate from URL clicks)

**Migration Required**:
```sql
-- Add qr_code_scans column to referrals table
ALTER TABLE referrals ADD COLUMN qr_code_scans INTEGER DEFAULT 0;

-- Add qr_scan_count to get_referral_stats RPC
```

**Priority**: Medium (offline partnerships)
**Estimated Time**: 2 days

---

### 7. Attribution Fraud Detection

**Features**:
- ML-based anomaly detection for suspicious patterns
- Alert on same IP + multiple referral codes
- Alert on rapid signup velocity from single referrer
- Block self-referrals (referrer = referee)
- Audit log for all tampered cookie attempts

**Migration Required**:
```sql
-- Enable referral_attribution_audit table (optional in Migration 091)
-- Add fraud_score column to referrals table
ALTER TABLE referrals ADD COLUMN fraud_score NUMERIC DEFAULT 0;
```

**Priority**: Medium (prevent commission fraud)
**Estimated Time**: 1 week

---

### 8. Offline Partnership Onboarding Flow

**Features**:
- Create partnership agreement templates
- Generate branded QR code posters (PDF/PNG)
- Track offline location performance (coffee shop A vs B)
- Partner dashboard (view referrals from their location)

**New Tables Required**:
```sql
CREATE TABLE partnership_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES profiles(id),
  location_name TEXT NOT NULL,
  location_type TEXT, -- 'coffee_shop', 'school', 'community_center'
  address TEXT,
  qr_code_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Link referrals to locations
ALTER TABLE referrals ADD COLUMN partnership_location_id UUID REFERENCES partnership_locations(id);
```

**Priority**: Low (scaling offline partnerships)
**Estimated Time**: 2 weeks

---

## Phase 3: Advanced Features (Q3 2026)

### 9. Multi-Tier Commission Structures

**Features**:
- MLM-style depth rewards (Level 1: £10, Level 2: £5, Level 3: £2)
- Track referral chains (A → B → C)
- Calculate multi-level commission splits
- Prevent infinite loops

**Migration Required**:
```sql
-- Add referral_depth column to referrals table
ALTER TABLE referrals ADD COLUMN referral_depth INTEGER DEFAULT 1;

-- Add referral_chain JSONB column to store full chain
ALTER TABLE referrals ADD COLUMN referral_chain JSONB;

-- Update commission calculation RPC to support multi-tier
```

**Priority**: Low (advanced monetization)
**Estimated Time**: 3 weeks

---

### 10. Demand-Side Agent Monetization (Client Referrals)

**Features**:
- Enable referral tracking for client signups (not just tutors)
- Commission structure: £5 per referred client
- Client referral dashboard widget
- Separate attribution logic for client vs tutor referrals

**Migration Required**:
```sql
-- Add referral_type column to referrals table
ALTER TABLE referrals ADD COLUMN referral_type TEXT DEFAULT 'tutor'; -- 'tutor' or 'client'

-- Update handle_new_user() trigger to detect user type
-- Update commission calculation to use different rates
```

**Priority**: Low (expand referral program)
**Estimated Time**: 2 weeks

---

## Monitoring & Analytics

### Key Metrics to Track (Dashboard)

**Week 1**:
- Attribution rate: % of signups with `referred_by_profile_id` populated
- Cookie signature success rate: Monitor `referral_attribution_audit` table
- Attribution method distribution: URL vs Cookie vs Manual

**Month 1**:
- Referral conversion rate: % of referred users who convert
- Commission payout volume: Total £ paid to agents
- Agent retention: % of agents active after first commission

**Quarter 1 (Target)**:
- 30% of new tutors acquired through referrals
- £50K/month in referral commissions paid
- 15% conversion rate (clicked → signed up → converted)

### SQL Queries for Monitoring

See [HIERARCHICAL-ATTRIBUTION-IMPLEMENTATION.md](HIERARCHICAL-ATTRIBUTION-IMPLEMENTATION.md) → Monitoring & Analytics section.

---

## Testing Strategy

### E2E Test Enablement

The E2E test suite is currently skipped because it requires Supabase credentials:

**To Enable**:
1. Add Supabase credentials to test environment
2. Un-skip tests in `hierarchical-attribution.test.ts`
3. Run: `npm run test:e2e tests/e2e/referrals/hierarchical-attribution.test.ts`

**Expected Output**: 11/11 tests pass

---

## Documentation Updates

### User-Facing Documentation

**Create**:
1. **Help Center Article**: "How to Earn Commissions Through Referrals"
2. **Tutorial Video**: "Setting Up Commission Delegation for Partners"
3. **FAQ Page**: "Referral System Questions"

**Update**:
1. Agent onboarding flow to include referral link setup
2. Dashboard tour to highlight referral widget
3. Email templates for referral milestones (first click, first signup, first commission)

---

## Support & Troubleshooting

### Common Issues (Anticipated)

**Issue**: "My referral link doesn't work"
- **Cause**: Cookie not persisting (browser settings)
- **Solution**: Use URL parameter attribution (Priority 1)

**Issue**: "I didn't get commission for my referral"
- **Cause**: Delegation enabled on listing
- **Solution**: Check delegation settings, clear if needed

**Issue**: "Someone tampered with my referral cookie"
- **Cause**: HMAC signature validation failed
- **Solution**: Check `referral_attribution_audit` table for details

### Support Contacts

- **Technical Issues**: [Link to support email]
- **Commission Disputes**: [Link to disputes email]
- **Partnership Inquiries**: [Link to partnerships email]

---

## Success Criteria

### Deployment Success (Week 1)

- ✅ Migration 091 & 092 executed without errors
- ✅ `REFERRAL_COOKIE_SECRET` set in production
- ✅ Cookies HMAC-signed (contain `.` separator)
- ✅ Attribution working (new signups have `referral_source` populated)
- ✅ E2E tests pass (11/11 green)
- ✅ No errors in production logs
- ✅ All 9 indexes created successfully
- ✅ Referral code lookups < 5ms

### Business Success (Quarter 1)

- 🎯 30% of new tutors acquired through referrals
- 🎯 £50K/month in referral commissions paid
- 🎯 50+ active partnership locations with delegation enabled
- 🎯 15% conversion rate (clicked → signed up → converted)
- 🎯 < 1% attribution fraud rate

---

## Rollback Plan (If Needed)

See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) → Rollback Plan section.

---

## Resources

- **Implementation Guide**: [HIERARCHICAL-ATTRIBUTION-IMPLEMENTATION.md](HIERARCHICAL-ATTRIBUTION-IMPLEMENTATION.md)
- **Environment Setup**: [ENVIRONMENT-SETUP.md](ENVIRONMENT-SETUP.md)
- **Deployment Guide**: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
- **Solution Design**: [referrals-solution-design-v2.md](referrals-solution-design-v2.md)
- **Patent Document**: `do-not-push-to-github-uk-provisional-patent-application-referral-system-v2.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-12-16
**Owner**: Growth Team
**Next Review**: After Production Deployment

**Status**: ✅ Ready for Immediate Deployment

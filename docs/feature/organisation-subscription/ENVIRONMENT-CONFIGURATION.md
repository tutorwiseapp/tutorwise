# Organisation Premium Subscription - Environment Configuration

**Version**: v8.0
**Created**: 2025-12-17
**Last Updated**: 2025-12-17

## Overview

This document explains how to configure the Organisation Premium subscription feature using environment variables and feature flags.

---

## Environment Variables

### Required Variables

```bash
# Stripe Configuration (REQUIRED for subscriptions to work)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PREMIUM_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Optional Feature Flags

```bash
# Feature Toggle (Default: true)
# Set to 'false' to disable subscription paywall during development/testing
NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL=true

# Trial Period Configuration (Default: 14 days)
# Change to 30 for extended testing, or 7 for shortened trials
NEXT_PUBLIC_TRIAL_DAYS=14

# Pricing Configuration (Default: 50)
# Change the monthly subscription price
NEXT_PUBLIC_SUBSCRIPTION_PRICE=50

# Currency Configuration (Default: GBP)
# Supported: GBP, USD, EUR
NEXT_PUBLIC_SUBSCRIPTION_CURRENCY=GBP
```

---

## Configuration Examples

### Production Configuration

```bash
# .env.production
NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL=true
NEXT_PUBLIC_TRIAL_DAYS=14
NEXT_PUBLIC_SUBSCRIPTION_PRICE=50
NEXT_PUBLIC_SUBSCRIPTION_CURRENCY=GBP
```

**Result**: 14-day free trial, £50/month subscription

---

### Testing Configuration (Extended Trial)

```bash
# .env.local
NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL=true
NEXT_PUBLIC_TRIAL_DAYS=30
NEXT_PUBLIC_SUBSCRIPTION_PRICE=50
NEXT_PUBLIC_SUBSCRIPTION_CURRENCY=GBP
```

**Result**: 30-day free trial, £50/month subscription (easier to test full trial flow)

---

### Development Configuration (Paywall Disabled)

```bash
# .env.local
NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL=false
NEXT_PUBLIC_TRIAL_DAYS=14
NEXT_PUBLIC_SUBSCRIPTION_PRICE=50
NEXT_PUBLIC_SUBSCRIPTION_CURRENCY=GBP
```

**Result**: No subscription paywall, full access to Organisation features

---

### International Configuration (USD Pricing)

```bash
# .env.production
NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL=true
NEXT_PUBLIC_TRIAL_DAYS=14
NEXT_PUBLIC_SUBSCRIPTION_PRICE=60
NEXT_PUBLIC_SUBSCRIPTION_CURRENCY=USD
```

**Result**: 14-day free trial, $60/month subscription

---

## Smart Trial Reminder System

### Popup Timing Configuration

The reminder days are configured in [features.ts:26](../../../apps/web/src/config/features.ts#L26):

```typescript
reminderDays: [3, 2, 1, 0], // Show reminders at 3, 2, 1, 0 days remaining
```

### Default Behavior

| Trial Day | Days Remaining | Popup Behavior | Dismissible? |
|-----------|----------------|----------------|--------------|
| Days 1-10 | 14-4 | **No popup** (silent exploration) | N/A |
| Day 11 | 3 | Show once per day | ✅ Yes (X button) |
| Day 12 | 2 | Show once per day | ✅ Yes (X button) |
| Day 13 | 1 | Show once per day | ✅ Yes (X button) |
| Day 14+ | 0 (expired) | Show always | ❌ No |

### Dismissal Logic

- **Days 11-13**: User can dismiss with "X" button, popup won't show again until next day
- **Day 14+**: Non-dismissible, user must either subscribe or export data
- **localStorage key format**: `trial_reminder_dismissed_{org_id}_day{days_remaining}`

---

## CSV Export Functionality

### Current Export Capabilities

The Organisation page has a **CSV Export** feature in the secondary dropdown (3-dot menu).

#### Supported Tabs

1. **Team Tab** - Exports team members
   - Columns: Name, Email, Role, Joined
   - Example: `organisation-team-2025-12-17.csv`

2. **Clients Tab** - Exports aggregated clients
   - Columns: Name, Email, Tutor, Since
   - Example: `organisation-clients-2025-12-17.csv`

#### Performance Tab Export

**Status**: ❌ Not currently implemented

**Why**: Performance data is fetched via API calls and not stored in page state. To add Performance export, we would need to:

1. Fetch KPI data when "Export CSV" is clicked
2. Fetch team performance data
3. Combine into comprehensive export file

**Recommended Implementation**:

```typescript
// Performance export would include:
// 1. KPI Summary (revenue, students, sessions, ratings)
// 2. Team Performance (member-level metrics)
// 3. Revenue Trend (weekly breakdown)
// 4. Student Breakdown (subject-level data)
```

**File**: [page.tsx:287](../../../apps/web/src/app/(authenticated)/organisation/page.tsx#L287)

---

## Feature Flag Integration Points

### 1. Stripe Checkout Session

[subscription.ts:107](../../../apps/web/src/lib/stripe/subscription.ts#L107)
```typescript
// Trial days dynamically set from NEXT_PUBLIC_TRIAL_DAYS
const trialDays = FEATURES.SUBSCRIPTION_PAYWALL.trialDays;

await stripe.checkout.sessions.create({
  subscription_data: {
    trial_period_days: trialDays, // ✅ Configurable
  }
});
```

### 2. SubscriptionRequired Component

[SubscriptionRequired.tsx:59](../../../apps/web/src/app/components/feature/organisation/SubscriptionRequired.tsx#L59)
```typescript
// Title dynamically updates with trial days
title: `Start Your ${trialDays}-Day Free Trial`,

// Pricing dynamically updates with formatted price
<span className={styles.price}>{formattedPrice}</span> // £50, $60, €50
```

### 3. Trial Status Detection

[trial-status.ts:37](../../../apps/web/src/lib/stripe/trial-status.ts#L37)
```typescript
// Feature flag check before showing popup
if (!FEATURES.SUBSCRIPTION_PAYWALL.enabled) {
  return false;
}
```

---

## Testing Scenarios

### Scenario 1: Test 30-Day Trial

```bash
# .env.local
NEXT_PUBLIC_TRIAL_DAYS=30
NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL=true
```

**Expected Behavior**:
- Stripe creates 30-day trial subscription
- Reminders show at days 27, 28, 29, 30
- All UI text updates to "30-Day Free Trial"

### Scenario 2: Disable Paywall for Development

```bash
# .env.local
NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL=false
```

**Expected Behavior**:
- No subscription required popup
- Full access to Organisation features
- No trial reminders

### Scenario 3: Test USD Pricing

```bash
# .env.local
NEXT_PUBLIC_SUBSCRIPTION_PRICE=60
NEXT_PUBLIC_SUBSCRIPTION_CURRENCY=USD
```

**Expected Behavior**:
- Pricing display shows "$60/month"
- Stripe Checkout uses USD Price ID

---

## Troubleshooting

### Issue: Trial days not updating

**Solution**:
1. Check environment variable is set correctly
2. Restart Next.js dev server (environment variables require restart)
3. Clear browser localStorage if testing dismissal logic

### Issue: Paywall still showing when disabled

**Solution**:
1. Verify `NEXT_PUBLIC_ENABLE_SUBSCRIPTION_PAYWALL=false` is set
2. Check you're not setting it to `'false'` (string) instead of `false` (boolean) - the code checks `!== 'false'`
3. Restart dev server

### Issue: Dismissal not persisting

**Solution**:
1. Check browser localStorage is enabled
2. Clear localStorage: `localStorage.clear()` in console
3. Verify organisation ID is consistent

---

## Implementation Files

| File | Purpose |
|------|---------|
| [features.ts](../../../apps/web/src/config/features.ts) | Feature flag configuration system |
| [trial-status.ts](../../../apps/web/src/lib/stripe/trial-status.ts) | Trial status detection & smart popup logic |
| [subscription.ts](../../../apps/web/src/lib/stripe/subscription.ts) | Stripe integration with configurable trial days |
| [SubscriptionRequired.tsx](../../../apps/web/src/app/components/feature/organisation/SubscriptionRequired.tsx) | Updated modal with dismissal & export |

---

## Related Documentation

- [Trial Reminder Implementation Guide](./TRIAL-REMINDER-IMPLEMENTATION.md)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [Hierarchical Attribution Implementation](./HIERARCHICAL-ATTRIBUTION-IMPLEMENTATION.md)

---

## Questions & Support

For questions about configuration or implementation, contact the development team or refer to the implementation files listed above.

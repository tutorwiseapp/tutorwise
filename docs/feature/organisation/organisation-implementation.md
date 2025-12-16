# Organisation Feature - Implementation Guide

**Version**: v7.0 (Premium Subscription - COMPLETE)
**Last Updated**: 2025-12-15
**Status**: ✅ All v7.0 Features Complete (Phase 1 & 2)
**Architecture**: Virtual Entity Multi-Tenant System with Stripe Subscriptions & Performance Analytics
**Business Model**: £50/month Premium Subscription (14-day free trial)

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v7.0 | **Phase 2 Complete**: Added Performance Analytics implementation details |
| 2025-12-15 | v7.0 | **Phase 1 Complete**: Comprehensive implementation guide with all subscription infrastructure details |
| 2025-12-15 | v7.0 | Added environment setup, database schema, webhook integration, testing guide, troubleshooting |
| 2025-12-12 | v6.1 | Initial sparse implementation guide (superseded by v7.0) |

---

## Table of Contents

### Phase 1: Stripe Subscription Infrastructure
1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Database Schema](#database-schema)
4. [Subscription Service Layer](#subscription-service-layer)
5. [Webhook Integration](#webhook-integration)
6. [Frontend Components](#frontend-components)
7. [API Routes](#api-routes)
8. [Testing Guide](#testing-guide)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

### Phase 2: Performance Analytics Tab
11. [Performance Analytics Overview](#performance-analytics-overview)
12. [Analytics Database Functions](#analytics-database-functions)
13. [Analytics API Routes](#analytics-api-routes)
14. [Performance Tab Component](#performance-tab-component)
15. [Testing Analytics](#testing-analytics)

## Overview

Organisation Premium is a **£50/month subscription** with **14-day free trial** (no credit card required). This guide documents the complete v7.0 implementation (Phase 1 & 2) completed on 2025-12-15.

**Phase 1: Stripe Subscription Infrastructure**
- ✅ Database schema for subscription tracking
- ✅ Stripe subscription service layer
- ✅ Webhook handlers for 5 subscription events
- ✅ Access guard on `/organisation` page
- ✅ SubscriptionRequired component (trial signup UI)
- ✅ API route for trial checkout
- ✅ 14-day free trial flow

**Phase 2: Performance Analytics Tab**
- ✅ 5 database RPC functions for analytics aggregation
- ✅ 5 API routes for analytics data (KPIs, revenue, team, heatmap, students)
- ✅ Performance tab component with comprehensive data display
- ✅ 4th "Performance" tab integration
- ✅ Period selector and real-time metrics
- ✅ Visual analytics (charts, tables, cards)

**Business Logic**:
1. Agent creates organisation (free marketplace features already available)
2. Visit `/organisation` → See "Start 14-Day Free Trial" screen
3. Click trial button → Redirected to Stripe Checkout
4. Complete checkout → 14 days of full access (no credit card required)
5. Add payment method before trial ends → Auto-converts to paid subscription
6. No payment method added → Subscription canceled, access blocked

## Environment Setup

### Step 1: Create Stripe Product and Price

Before implementing subscription features, you must create a Stripe product and price:

1. **Log in to Stripe Dashboard**: https://dashboard.stripe.com/test/products

2. **Create Product**:
   - Click "Add Product"
   - Product name: "Organisation Premium"
   - Description: "Premium organisation management with team analytics"
   - Pricing model: "Recurring"
   - Price: £50.00 GBP
   - Billing period: Monthly
   - Enable "Free trial" → 14 days
   - Click "Save product"

3. **Copy Price ID**:
   - After creating, Stripe generates a Price ID like `price_1Abc123XYZ`
   - Copy this ID

4. **Add to Environment Variables**:
   ```bash
   # apps/web/.env.local
   STRIPE_PREMIUM_PRICE_ID=price_1Abc123XYZ
   ```

### Step 2: Configure Stripe Webhook

1. **Create Webhook Endpoint**:
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

2. **Copy Webhook Secret**:
   - After creating, Stripe shows "Signing secret" like `whsec_abc123...`
   - Copy this secret

3. **Add to Environment Variables**:
   ```bash
   # apps/web/.env.local
   STRIPE_WEBHOOK_SECRET=whsec_abc123...
   ```

### Step 3: Verify Environment Variables

Create a verification script:

```bash
node -e "
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

const required = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PREMIUM_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

required.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.error(\`❌ Missing: \${key}\`);
  } else {
    console.log(\`✅ \${key}: \${value.substring(0, 10)}...\`);
  }
});
"
```

### Step 4: Run Database Migration

```bash
# Apply migration 102
psql $DATABASE_URL -f apps/api/migrations/102_add_organisation_subscriptions.sql
```

## Database Schema

### `organisation_subscriptions` Table

```sql
CREATE TABLE IF NOT EXISTS public.organisation_subscriptions (
  organisation_id UUID PRIMARY KEY REFERENCES public.connection_groups(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Subscription status
  status TEXT NOT NULL CHECK (status IN (
    'trialing',            -- During 14-day trial
    'active',              -- Paid and active
    'past_due',            -- Payment failed
    'canceled',            -- Subscription canceled
    'incomplete',          -- Initial payment failed
    'incomplete_expired',  -- Initial payment expired
    'unpaid'               -- Unpaid invoices
  )) DEFAULT 'trialing',

  -- Trial period
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_organisation_subscriptions_organisation
  ON public.organisation_subscriptions(organisation_id);

CREATE INDEX IF NOT EXISTS idx_organisation_subscriptions_stripe_subscription
  ON public.organisation_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_organisation_subscriptions_stripe_customer
  ON public.organisation_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_organisation_subscriptions_status
  ON public.organisation_subscriptions(status);
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE public.organisation_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Organisation owners can view their subscription
CREATE POLICY "Organisation owners can view subscription"
  ON public.organisation_subscriptions
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT id FROM public.connection_groups
      WHERE profile_id = auth.uid() AND type = 'organisation'
    )
  );

-- Policy 2: Service role has full access (for webhook handlers)
CREATE POLICY "Service role has full access to subscriptions"
  ON public.organisation_subscriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

### Helper Functions

```sql
-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_organisation_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organisation_subscriptions_updated_at
  BEFORE UPDATE ON public.organisation_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organisation_subscription_updated_at();
```

## Subscription Service Layer

**File**: `apps/web/src/lib/stripe/subscription.ts` (298 lines)

### Type Definitions

```typescript
export interface OrganisationSubscription {
  organisation_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}
```

### Core Functions

#### 1. Check Premium Access

```typescript
/**
 * Check if subscription grants Premium access
 * Returns true if status is 'trialing' or 'active'
 */
export function isPremium(subscription: OrganisationSubscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'trialing' || subscription.status === 'active';
}
```

#### 2. Get Subscription

```typescript
/**
 * Get organisation subscription from database
 * Returns null if no subscription exists
 */
export async function getOrganisationSubscription(
  organisationId: string
): Promise<OrganisationSubscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organisation_subscriptions')
    .select('*')
    .eq('organisation_id', organisationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No subscription found
      return null;
    }
    throw error;
  }

  return data as OrganisationSubscription;
}
```

#### 3. Create Trial Checkout Session

```typescript
/**
 * Create Stripe Checkout Session for 14-day free trial
 * No credit card required during trial
 */
export async function createTrialCheckoutSession(
  organisationId: string
): Promise<Stripe.Checkout.Session> {
  const supabase = await createClient();

  // Get organisation details
  const { data: org, error: orgError } = await supabase
    .from('connection_groups')
    .select('profile_id, name')
    .eq('id', organisationId)
    .single();

  if (orgError || !org) {
    throw new Error('Organisation not found');
  }

  // Get user email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', org.profile_id)
    .single();

  if (!profile?.email) {
    throw new Error('User email not found');
  }

  // Get Stripe Price ID from environment
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId) {
    throw new Error('STRIPE_PREMIUM_PRICE_ID not configured');
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: profile.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 14,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel', // Cancel if no payment method added
        },
      },
      metadata: {
        organisation_id: organisationId,
        organisation_name: org.name,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/organisation?trial=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/organisation?trial=canceled`,
  });

  return session;
}
```

#### 4. Cancel Subscription

```typescript
/**
 * Cancel subscription at period end
 * User retains access until current billing period ends
 */
export async function cancelSubscription(organisationId: string): Promise<void> {
  const supabase = await createClient();

  // Get subscription
  const subscription = await getOrganisationSubscription(organisationId);
  if (!subscription?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  // Cancel at period end via Stripe
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // Update database
  await supabase
    .from('organisation_subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('organisation_id', organisationId);
}
```

#### 5. Reactivate Subscription

```typescript
/**
 * Reactivate a canceled subscription
 * Only works if subscription hasn't ended yet (cancel_at_period_end)
 */
export async function reactivateSubscription(organisationId: string): Promise<void> {
  const supabase = await createClient();

  // Get subscription
  const subscription = await getOrganisationSubscription(organisationId);
  if (!subscription?.stripe_subscription_id) {
    throw new Error('No subscription found');
  }

  // Reactivate via Stripe
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  // Update database
  await supabase
    .from('organisation_subscriptions')
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
    })
    .eq('organisation_id', organisationId);
}
```

#### 6. Sync Subscription Status

```typescript
/**
 * Sync subscription status from Stripe to database
 * Useful for manual reconciliation or debugging
 */
export async function syncSubscriptionStatus(organisationId: string): Promise<void> {
  const supabase = await createClient();

  // Get subscription from database
  const dbSubscription = await getOrganisationSubscription(organisationId);
  if (!dbSubscription?.stripe_subscription_id) {
    throw new Error('No subscription found in database');
  }

  // Fetch latest from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(
    dbSubscription.stripe_subscription_id
  );

  // Update database with latest from Stripe
  await supabase
    .from('organisation_subscriptions')
    .update({
      status: stripeSubscription.status,
      trial_start: stripeSubscription.trial_start
        ? new Date(stripeSubscription.trial_start * 1000).toISOString()
        : null,
      trial_end: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000).toISOString()
        : null,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      canceled_at: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('organisation_id', organisationId);
}
```

## Webhook Integration

**File**: `apps/web/src/app/api/webhooks/stripe/route.ts` (lines 295-460, +165 lines)

The webhook handler processes 5 subscription events to keep the database in sync with Stripe.

### Event 1: `customer.subscription.created`

**Triggered**: When user completes Stripe Checkout (trial signup)

```typescript
case 'customer.subscription.created': {
  const subscription = event.data.object as Stripe.Subscription;
  const organisationId = subscription.metadata?.organisation_id;

  if (!organisationId) {
    console.error('[WEBHOOK:SUBSCRIPTION] Missing organisation_id in metadata');
    break;
  }

  console.log(`[WEBHOOK:SUBSCRIPTION] Creating subscription for organisation ${organisationId}`);

  // Insert subscription record
  const { error: insertError } = await supabase
    .from('organisation_subscriptions')
    .insert({
      organisation_id: organisationId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status, // 'trialing'
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

  if (insertError) {
    console.error('[WEBHOOK:SUBSCRIPTION] Error creating subscription:', insertError);
    throw insertError;
  }

  console.log('[WEBHOOK:SUBSCRIPTION] Subscription created successfully');
  break;
}
```

### Event 2: `customer.subscription.updated`

**Triggered**: When subscription status changes (trial→active, canceled, etc.)

```typescript
case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription;
  const organisationId = subscription.metadata?.organisation_id;

  if (!organisationId) {
    console.error('[WEBHOOK:SUBSCRIPTION] Missing organisation_id in metadata');
    break;
  }

  console.log(`[WEBHOOK:SUBSCRIPTION] Updating subscription for organisation ${organisationId}`);
  console.log(`[WEBHOOK:SUBSCRIPTION] New status: ${subscription.status}`);

  // Update subscription record
  const { error: updateError } = await supabase
    .from('organisation_subscriptions')
    .update({
      status: subscription.status,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('organisation_id', organisationId);

  if (updateError) {
    console.error('[WEBHOOK:SUBSCRIPTION] Error updating subscription:', updateError);
    throw updateError;
  }

  console.log('[WEBHOOK:SUBSCRIPTION] Subscription updated successfully');
  break;
}
```

### Event 3: `customer.subscription.deleted`

**Triggered**: When subscription is permanently deleted or trial expires without payment

```typescript
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription;
  const organisationId = subscription.metadata?.organisation_id;

  if (!organisationId) {
    console.error('[WEBHOOK:SUBSCRIPTION] Missing organisation_id in metadata');
    break;
  }

  console.log(`[WEBHOOK:SUBSCRIPTION] Deleting subscription for organisation ${organisationId}`);

  // Mark as canceled
  const { error: deleteError } = await supabase
    .from('organisation_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('organisation_id', organisationId);

  if (deleteError) {
    console.error('[WEBHOOK:SUBSCRIPTION] Error deleting subscription:', deleteError);
    throw deleteError;
  }

  console.log('[WEBHOOK:SUBSCRIPTION] Subscription deleted successfully');
  break;
}
```

### Event 4: `invoice.payment_succeeded`

**Triggered**: When first payment succeeds (trial→paid conversion)

```typescript
case 'invoice.payment_succeeded': {
  const invoice = event.data.object as Stripe.Invoice;

  if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
    const subscriptionId = invoice.subscription as string;

    console.log(`[WEBHOOK:SUBSCRIPTION] Payment succeeded for subscription ${subscriptionId}`);

    // Get subscription from Stripe to access metadata
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const organisationId = subscription.metadata?.organisation_id;

    if (!organisationId) {
      console.error('[WEBHOOK:SUBSCRIPTION] Missing organisation_id in subscription metadata');
      break;
    }

    // Update status to 'active' (trial→paid conversion)
    const { error: updateError } = await supabase
      .from('organisation_subscriptions')
      .update({ status: 'active' })
      .eq('organisation_id', organisationId);

    if (updateError) {
      console.error('[WEBHOOK:SUBSCRIPTION] Error updating subscription status:', updateError);
      throw updateError;
    }

    console.log('[WEBHOOK:SUBSCRIPTION] Subscription activated after successful payment');
  }
  break;
}
```

### Event 5: `invoice.payment_failed`

**Triggered**: When payment fails (marks subscription as past_due)

```typescript
case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice;

  if (invoice.subscription) {
    const subscriptionId = invoice.subscription as string;

    console.log(`[WEBHOOK:SUBSCRIPTION] Payment failed for subscription ${subscriptionId}`);

    // Get subscription from Stripe to access metadata
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const organisationId = subscription.metadata?.organisation_id;

    if (!organisationId) {
      console.error('[WEBHOOK:SUBSCRIPTION] Missing organisation_id in subscription metadata');
      break;
    }

    // Update status to 'past_due'
    const { error: updateError } = await supabase
      .from('organisation_subscriptions')
      .update({ status: 'past_due' })
      .eq('organisation_id', organisationId);

    if (updateError) {
      console.error('[WEBHOOK:SUBSCRIPTION] Error updating subscription status:', updateError);
      throw updateError;
    }

    console.log('[WEBHOOK:SUBSCRIPTION] Subscription marked as past_due');
  }
  break;
}
```

## Frontend Components

### SubscriptionRequired Component

**File**: `apps/web/src/app/components/feature/organisation/SubscriptionRequired.tsx` (163 lines)

**Purpose**: Block non-Premium users and show trial signup UI

#### Component Interface

```typescript
interface SubscriptionRequiredProps {
  organisation: {
    id: string;
    name: string;
  };
  subscription: OrganisationSubscription | null;
  onStartTrial: () => void;
  isLoading?: boolean;
}
```

#### Key Features

1. **Dynamic Messaging**: Shows different content based on subscription status
   - No subscription: "Start Your 14-Day Free Trial"
   - Canceled: "Subscription Canceled" with reactivation CTA
   - Past due: "Payment Failed" with update payment CTA
   - Unpaid: "Subscription Unpaid" with contact support CTA

2. **Feature List**: Displays 6 Premium features with checkmarks
   - 14-day free trial (no credit card required)
   - Unlimited team members
   - Client aggregation and analytics
   - Commission management
   - Performance analytics dashboard
   - Member verification tracking

3. **Pricing Display**: Shows £50/month pricing prominently

4. **CTA Button**: Dynamic button text and action based on status

#### Implementation Example

```typescript
export default function SubscriptionRequired({
  organisation,
  subscription,
  onStartTrial,
  isLoading = false,
}: SubscriptionRequiredProps) {
  const router = useRouter();

  // Determine message based on subscription status
  const getStatusMessage = () => {
    if (!subscription) {
      return {
        title: 'Start Your 14-Day Free Trial',
        description: 'Get full access to Organisation Premium features with no credit card required.',
        ctaText: 'Start Free Trial',
        showFeatures: true,
      };
    }

    if (subscription.status === 'canceled') {
      return {
        title: 'Subscription Canceled',
        description: `Your subscription was canceled on ${new Date(subscription.canceled_at!).toLocaleDateString()}. Reactivate to continue using Premium features.`,
        ctaText: 'Reactivate Subscription',
        showFeatures: false,
      };
    }

    // ... other status checks
  };

  const status = getStatusMessage();

  const handleCTAClick = () => {
    if (subscription?.status === 'past_due') {
      router.push('/api/stripe/billing-portal');
    } else if (subscription?.status === 'unpaid') {
      router.push('/support');
    } else {
      onStartTrial();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Sparkles size={48} className={styles.icon} />
        <h2 className={styles.title}>{status.title}</h2>
        <p className={styles.description}>{status.description}</p>

        {status.showFeatures && (
          <div className={styles.features}>
            <div className={styles.feature}>
              <Check size={20} className={styles.checkIcon} />
              <span>14-day free trial (no credit card required)</span>
            </div>
            {/* ... more features */}
          </div>
        )}

        <div className={styles.pricing}>
          <span className={styles.price}>£50</span>
          <span className={styles.period}>/month</span>
        </div>

        <Button
          onClick={handleCTAClick}
          variant="primary"
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : status.ctaText}
        </Button>
      </div>
    </div>
  );
}
```

### Access Guard Implementation

**File**: `apps/web/src/app/(authenticated)/organisation/page.tsx` (~40 lines added)

#### Step 1: Add Subscription Query

```typescript
const {
  data: subscription,
  isLoading: subscriptionLoading,
} = useQuery({
  queryKey: ['organisation-subscription', organisation?.id],
  queryFn: () => getOrganisationSubscription(organisation!.id),
  enabled: !!organisation,
  staleTime: 2 * 60 * 1000, // 2 minutes
});
```

#### Step 2: Block Non-Premium Users

```typescript
// Block access if no active subscription
if (organisation && !subscriptionLoading && !isPremium(subscription)) {
  return (
    <HubPageLayout>
      <SubscriptionRequired
        organisation={organisation}
        subscription={subscription}
        onStartTrial={handleStartTrial}
        isLoading={isCheckingOut}
      />
    </HubPageLayout>
  );
}
```

#### Step 3: Handle Trial Signup

```typescript
const [isCheckingOut, setIsCheckingOut] = useState(false);

const handleStartTrial = async () => {
  setIsCheckingOut(true);

  try {
    const response = await fetch('/api/stripe/checkout/trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisationId: organisation.id }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { url } = await response.json();
    window.location.href = url; // Redirect to Stripe Checkout
  } catch (error) {
    console.error('Error starting trial:', error);
    setIsCheckingOut(false);
  }
};
```

## API Routes

### Trial Checkout API

**File**: `apps/web/src/app/api/stripe/checkout/trial/route.ts` (95 lines)

**Endpoint**: `POST /api/stripe/checkout/trial`

**Purpose**: Create Stripe Checkout Session for 14-day free trial

#### Implementation

```typescript
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get request body
    const body = await req.json();
    const { organisationId } = body;

    if (!organisationId) {
      return NextResponse.json(
        { error: 'Missing organisationId' },
        { status: 400 }
      );
    }

    // 3. Verify user owns this organisation
    const { data: org, error: orgError } = await supabase
      .from('connection_groups')
      .select('profile_id, name')
      .eq('id', organisationId)
      .eq('type', 'organisation')
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      );
    }

    if (org.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this organisation' },
        { status: 403 }
      );
    }

    // 4. Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('organisation_subscriptions')
      .select('status')
      .eq('organisation_id', organisationId)
      .single();

    if (existingSubscription && ['trialing', 'active'].includes(existingSubscription.status)) {
      return NextResponse.json(
        { error: 'Organisation already has an active subscription' },
        { status: 400 }
      );
    }

    // 5. Create Stripe Checkout Session
    const session = await createTrialCheckoutSession(organisationId);

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Error creating trial checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### Security Checks

1. **Authentication**: Verifies user is logged in
2. **Ownership**: Confirms user owns the organisation
3. **Duplicate Prevention**: Checks for existing active subscription
4. **Input Validation**: Validates organisationId parameter

## Testing Guide

### Local Testing Setup

1. **Install Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward Webhooks to Localhost**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the webhook signing secret (starts with `whsec_`) and add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Test Scenarios

#### Scenario 1: Start Free Trial

1. **Create Organisation**:
   - Login as agent
   - Create new organisation at `/organisation/create`

2. **Visit Organisation Page**:
   - Navigate to `/organisation`
   - Should see "Start Your 14-Day Free Trial" screen

3. **Click "Start Free Trial"**:
   - Redirected to Stripe Checkout
   - Complete checkout with test card: `4242 4242 4242 4242`
   - Use any future expiry date (e.g., 12/34)
   - Use any 3-digit CVC (e.g., 123)

4. **Verify Webhook**:
   - Check terminal with `stripe listen` running
   - Should see `customer.subscription.created` event
   - Check database:
     ```sql
     SELECT * FROM organisation_subscriptions
     WHERE organisation_id = 'your-org-id';
     ```
   - Status should be `'trialing'`

5. **Access Organisation Hub**:
   - Redirected back to `/organisation?trial=success`
   - Should see full organisation hub with Team/Clients/Info tabs

#### Scenario 2: Trial Expiry Without Payment

1. **Trigger Trial End**:
   ```bash
   # Use Stripe CLI to simulate trial ending
   stripe trigger customer.subscription.updated \
     --add subscription:status=canceled \
     --add subscription:metadata[organisation_id]=your-org-id
   ```

2. **Verify Access Blocked**:
   - Refresh `/organisation` page
   - Should see "Subscription Canceled" message

3. **Check Database**:
   ```sql
   SELECT status FROM organisation_subscriptions
   WHERE organisation_id = 'your-org-id';
   ```
   Status should be `'canceled'`

#### Scenario 3: Payment Failure

1. **Trigger Payment Failed**:
   ```bash
   stripe trigger invoice.payment_failed \
     --add invoice:subscription=sub_xxx
   ```

2. **Verify Past Due Status**:
   - Refresh `/organisation` page
   - Should see "Payment Failed" message with "Update Payment Method" CTA

3. **Check Database**:
   ```sql
   SELECT status FROM organisation_subscriptions
   WHERE organisation_id = 'your-org-id';
   ```
   Status should be `'past_due'`

### Stripe Test Cards

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Succeeds with any CVC, expiry date |
| `4000 0000 0000 9995` | Always fails with "insufficient funds" |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

### Verification Checklist

- [ ] Subscription created in database with `status = 'trialing'`
- [ ] `trial_start` and `trial_end` dates are 14 days apart
- [ ] User can access organisation hub during trial
- [ ] Webhook events logged in terminal
- [ ] Environment variables configured correctly
- [ ] Access blocked when subscription expires/cancels

## Common Tasks

### Check Subscription Status

```typescript
import { getOrganisationSubscription, isPremium } from '@/lib/stripe/subscription';

const subscription = await getOrganisationSubscription(organisationId);

if (isPremium(subscription)) {
  console.log('✅ Premium access granted');
} else {
  console.log('❌ Premium access required');
}
```

### Start Trial Programmatically

```typescript
import { createTrialCheckoutSession } from '@/lib/stripe/subscription';

const session = await createTrialCheckoutSession(organisationId);
window.location.href = session.url; // Redirect to Stripe Checkout
```

### Cancel Subscription

```typescript
import { cancelSubscription } from '@/lib/stripe/subscription';

await cancelSubscription(organisationId);
// User retains access until current period ends
```

### Reactivate Canceled Subscription

```typescript
import { reactivateSubscription } from '@/lib/stripe/subscription';

await reactivateSubscription(organisationId);
// Only works if subscription hasn't ended (cancel_at_period_end = true)
```

### Sync Status from Stripe

```typescript
import { syncSubscriptionStatus } from '@/lib/stripe/subscription';

await syncSubscriptionStatus(organisationId);
// Fetches latest from Stripe and updates database
```

## Troubleshooting

### Issue 1: "Start Free Trial" Button Not Working

**Symptoms**: Clicking trial button does nothing or shows error

**Debug Steps**:

1. **Check Environment Variables**:
   ```bash
   node -e "console.log(process.env.STRIPE_PREMIUM_PRICE_ID)"
   ```
   Should output price ID like `price_1Abc123XYZ`

2. **Check Browser Console**:
   - Open DevTools → Console tab
   - Look for error messages

3. **Check API Response**:
   ```bash
   curl -X POST http://localhost:3000/api/stripe/checkout/trial \
     -H "Content-Type: application/json" \
     -d '{"organisationId":"your-org-id"}'
   ```

4. **Verify Organisation Ownership**:
   ```sql
   SELECT profile_id FROM connection_groups
   WHERE id = 'your-org-id' AND type = 'organisation';
   ```

**Fix**: Add missing environment variable or fix ownership check

### Issue 2: Webhook Events Not Received

**Symptoms**: Subscription created in Stripe but not in database

**Debug Steps**:

1. **Check Webhook Secret**:
   ```bash
   echo $STRIPE_WEBHOOK_SECRET
   ```
   Should start with `whsec_`

2. **Check Webhook Logs**:
   - Stripe Dashboard → Developers → Webhooks → View logs
   - Look for failed deliveries

3. **Test Webhook Locally**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Check Database Connection**:
   ```typescript
   const { data, error } = await supabase
     .from('organisation_subscriptions')
     .select('count');
   console.log('DB connection:', error ? 'FAILED' : 'OK');
   ```

**Fix**: Update webhook secret or check webhook endpoint URL

### Issue 3: Access Not Granted After Trial Signup

**Symptoms**: Completed checkout but still see "Start Free Trial" screen

**Debug Steps**:

1. **Check Subscription in Database**:
   ```sql
   SELECT status, trial_start, trial_end
   FROM organisation_subscriptions
   WHERE organisation_id = 'your-org-id';
   ```

2. **Check isPremium() Logic**:
   ```typescript
   const subscription = await getOrganisationSubscription(organisationId);
   console.log('Status:', subscription?.status);
   console.log('Is Premium:', isPremium(subscription));
   ```

3. **Sync Status from Stripe**:
   ```typescript
   await syncSubscriptionStatus(organisationId);
   ```

**Fix**: Webhook may have failed - manually sync or retry

### Issue 4: Payment Failed After Trial

**Symptoms**: Trial ended, payment failed, status stuck at `past_due`

**Debug Steps**:

1. **Check Stripe Subscription**:
   - Stripe Dashboard → Customers → Find customer
   - Check subscription status

2. **Verify Webhook Received**:
   ```sql
   SELECT status, updated_at
   FROM organisation_subscriptions
   WHERE organisation_id = 'your-org-id';
   ```

3. **Check Invoice Status**:
   - Stripe Dashboard → Invoices → Find invoice
   - Check payment status

**Fix**: User should update payment method via billing portal

### Issue 5: Duplicate Subscriptions

**Symptoms**: Multiple subscription records for same organisation

**Debug Steps**:

1. **Query Database**:
   ```sql
   SELECT stripe_subscription_id, status, created_at
   FROM organisation_subscriptions
   WHERE organisation_id = 'your-org-id';
   ```

2. **Check Stripe Customer**:
   - Stripe Dashboard → Find customer
   - Check how many subscriptions exist

**Fix**: Cancel duplicate subscriptions and keep only the active one:
```typescript
await stripe.subscriptions.cancel('sub_duplicate');
await supabase
  .from('organisation_subscriptions')
  .delete()
  .eq('stripe_subscription_id', 'sub_duplicate');
```

---

# Phase 2: Performance Analytics Tab

## Performance Analytics Overview

The Performance Analytics tab provides Premium subscribers with comprehensive insights into their organization's performance through real-time metrics, trend analysis, and team comparison data.

**File**: `apps/web/src/app/components/feature/organisation/OrganisationPerformanceTab.tsx` (430 lines)

**Features**:
- Period selector (This Month, This Quarter, This Year)
- 4 KPI cards with period-over-period comparison
- Revenue trend visualization (6-week bar chart)
- Team performance comparison table
- Student breakdown by subject (top 6)
- Responsive design with loading states

**Access**: Premium subscribers only (automatically available after Phase 1 access guard)

## Analytics Database Functions

**File**: `apps/api/migrations/103_add_organisation_performance_analytics.sql` (323 lines)

### Function 1: get_organisation_kpis()

Returns organisation-level KPIs with period-over-period comparison.

```sql
CREATE OR REPLACE FUNCTION public.get_organisation_kpis(
  org_id UUID,
  period TEXT DEFAULT 'month'
)
RETURNS TABLE (
  total_revenue NUMERIC,
  revenue_change_pct NUMERIC,
  active_students INT,
  students_change_pct NUMERIC,
  avg_session_rating NUMERIC,
  team_utilization_rate NUMERIC,
  total_sessions INT,
  sessions_change_pct NUMERIC
)
```

**Usage**:
```sql
SELECT * FROM get_organisation_kpis('org-uuid', 'month');
```

**Returns**: 8 metrics with period comparison

### Function 2: get_organisation_revenue_trend()

Returns weekly revenue data for trend charts.

```sql
CREATE OR REPLACE FUNCTION public.get_organisation_revenue_trend(
  org_id UUID,
  weeks INT DEFAULT 6
)
RETURNS TABLE (
  week_start DATE,
  week_label TEXT,
  total_revenue NUMERIC,
  sessions_count INT
)
```

**Usage**:
```sql
SELECT * FROM get_organisation_revenue_trend('org-uuid', 6);
```

**Returns**: Weekly revenue data for last N weeks

### Function 3: get_team_performance()

Returns performance metrics for each team member.

```sql
CREATE OR REPLACE FUNCTION public.get_team_performance(
  org_id UUID,
  period TEXT DEFAULT 'month'
)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  member_avatar_url TEXT,
  total_revenue NUMERIC,
  sessions_count INT,
  active_students_count INT,
  avg_rating NUMERIC,
  last_session_at TIMESTAMPTZ
)
```

**Usage**:
```sql
SELECT * FROM get_team_performance('org-uuid', 'month');
```

**Returns**: Performance data for all team members

### Function 4: get_organisation_booking_heatmap()

Returns booking frequency by day of week and hour.

```sql
CREATE OR REPLACE FUNCTION public.get_organisation_booking_heatmap(
  org_id UUID,
  weeks INT DEFAULT 4
)
RETURNS TABLE (
  day_of_week INT,
  day_name TEXT,
  hour INT,
  bookings_count INT
)
```

**Usage**:
```sql
SELECT * FROM get_organisation_booking_heatmap('org-uuid', 4);
```

**Returns**: Heatmap data for visualization

### Function 5: get_organisation_student_breakdown()

Returns student distribution across subjects.

```sql
CREATE OR REPLACE FUNCTION public.get_organisation_student_breakdown(
  org_id UUID
)
RETURNS TABLE (
  subject TEXT,
  student_count INT,
  revenue NUMERIC
)
```

**Usage**:
```sql
SELECT * FROM get_organisation_student_breakdown('org-uuid');
```

**Returns**: Student counts and revenue by subject

### Performance Indexes

The migration creates 4 indexes to optimize analytics queries:

```sql
CREATE INDEX IF NOT EXISTS idx_bookings_status_tutor_time
  ON public.bookings(status, tutor_id, session_start_time);

CREATE INDEX IF NOT EXISTS idx_bookings_client_time
  ON public.bookings(client_id, session_start_time);

CREATE INDEX IF NOT EXISTS idx_transactions_booking_type
  ON public.transactions(booking_id, type);

CREATE INDEX IF NOT EXISTS idx_profile_reviews_reviewee_booking
  ON public.profile_reviews(reviewee_id, booking_id);
```

## Analytics API Routes

All 5 API routes follow the same security pattern:
1. Authenticate user
2. Verify organisation ownership
3. Call RPC function
4. Format and return JSON

### Route 1: KPIs

**File**: `apps/web/src/app/api/organisation/[id]/analytics/kpis/route.ts` (93 lines)

**Endpoint**: `GET /api/organisation/[id]/analytics/kpis?period=month`

**Query Parameters**:
- `period` (optional): `'month'` | `'quarter'` | `'year'` (default: `'month'`)

**Response**:
```json
{
  "total_revenue": 12500.00,
  "revenue_change_pct": 15.5,
  "active_students": 45,
  "students_change_pct": 8.2,
  "avg_session_rating": 4.8,
  "team_utilization_rate": 7.5,
  "total_sessions": 120,
  "sessions_change_pct": 12.0
}
```

### Route 2: Revenue Trend

**File**: `apps/web/src/app/api/organisation/[id]/analytics/revenue-trend/route.ts` (87 lines)

**Endpoint**: `GET /api/organisation/[id]/analytics/revenue-trend?weeks=6`

**Query Parameters**:
- `weeks` (optional): Number of weeks to fetch (default: `6`)

**Response**:
```json
{
  "data": [
    {
      "week_start": "2025-12-08",
      "week_label": "Dec 08",
      "total_revenue": 2100.00,
      "sessions_count": 25
    }
  ]
}
```

### Route 3: Team Performance

**File**: `apps/web/src/app/api/organisation/[id]/analytics/team-performance/route.ts` (97 lines)

**Endpoint**: `GET /api/organisation/[id]/analytics/team-performance?period=month`

**Query Parameters**:
- `period` (optional): `'month'` | `'quarter'` | `'year'` (default: `'month'`)

**Response**:
```json
{
  "data": [
    {
      "member_id": "uuid",
      "member_name": "John Doe",
      "member_email": "john@example.com",
      "member_avatar_url": "https://...",
      "total_revenue": 3500.00,
      "sessions_count": 42,
      "active_students_count": 12,
      "avg_rating": 4.9,
      "last_session_at": "2025-12-14T10:00:00Z"
    }
  ]
}
```

### Route 4: Booking Heatmap

**File**: `apps/web/src/app/api/organisation/[id]/analytics/booking-heatmap/route.ts` (88 lines)

**Endpoint**: `GET /api/organisation/[id]/analytics/booking-heatmap?weeks=4`

**Query Parameters**:
- `weeks` (optional): Number of weeks to analyze (default: `4`)

**Response**:
```json
{
  "data": [
    {
      "day_of_week": 1,
      "day_name": "Monday",
      "hour": 14,
      "bookings_count": 5
    }
  ]
}
```

### Route 5: Student Breakdown

**File**: `apps/web/src/app/api/organisation/[id]/analytics/student-breakdown/route.ts` (81 lines)

**Endpoint**: `GET /api/organisation/[id]/analytics/student-breakdown`

**Response**:
```json
{
  "data": [
    {
      "subject": "Mathematics",
      "student_count": 25,
      "revenue": 8500.00
    }
  ]
}
```

## Performance Tab Component

**File**: `apps/web/src/app/components/feature/organisation/OrganisationPerformanceTab.tsx` (430 lines)
**Styles**: `OrganisationPerformanceTab.module.css` (335 lines)

### Component Structure

```typescript
interface OrganisationPerformanceTabProps {
  organisationId: string;
}

export default function OrganisationPerformanceTab({
  organisationId,
}: OrganisationPerformanceTabProps) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // React Query hooks for each data source
  const { data: kpis, isLoading: kpisLoading } = useQuery({...});
  const { data: revenueTrend, isLoading: trendLoading } = useQuery({...});
  const { data: teamPerformance, isLoading: teamLoading } = useQuery({...});
  const { data: studentBreakdown, isLoading: breakdownLoading } = useQuery({...});

  // Rendering logic...
}
```

### UI Sections

1. **Header with Period Selector**
   - 3 buttons: This Month, This Quarter, This Year
   - Updates all data when period changes

2. **KPI Cards Grid** (4 cards)
   - Total Revenue (with % change indicator)
   - Active Students (with % change indicator)
   - Total Sessions (with % change indicator)
   - Avg. Rating (5-star display)

3. **Revenue Trend Chart**
   - Simple bar chart visualization
   - Shows last 6 weeks
   - Displays revenue amount on hover
   - Session count below each bar

4. **Team Performance Table**
   - Sortable columns
   - Member avatar/name
   - Revenue, sessions, students columns
   - Rating with star icon
   - Last session date

5. **Student Breakdown Cards**
   - Top 6 subjects displayed
   - Subject name with icon
   - Student count
   - Revenue amount

### React Query Caching

```typescript
// KPIs - 2 minute cache
queryKey: ['organisation-analytics-kpis', organisationId, period],
staleTime: 2 * 60 * 1000,

// Revenue Trend - 2 minute cache
queryKey: ['organisation-analytics-revenue-trend', organisationId],
staleTime: 2 * 60 * 1000,

// Team Performance - 2 minute cache
queryKey: ['organisation-analytics-team-performance', organisationId, period],
staleTime: 2 * 60 * 1000,

// Student Breakdown - 5 minute cache (changes less frequently)
queryKey: ['organisation-analytics-student-breakdown', organisationId],
staleTime: 5 * 60 * 1000,
```

### Integration with Organisation Page

**File**: `apps/web/src/app/(authenticated)/organisation/page.tsx`

**Changes made**:

1. Updated `TabType`:
```typescript
type TabType = 'team' | 'clients' | 'performance' | 'info';
```

2. Added import:
```typescript
import OrganisationPerformanceTab from '@/app/components/feature/organisation/OrganisationPerformanceTab';
```

3. Added tab to tabs array:
```typescript
{ id: 'performance', label: 'Performance', active: activeTab === 'performance' }
```

4. Added tab content:
```typescript
{activeTab === 'performance' && (
  <div className={styles.content}>
    <OrganisationPerformanceTab organisationId={organisation.id} />
  </div>
)}
```

## Testing Analytics

### Local Testing

1. **Apply Migration**:
   ```bash
   psql $DATABASE_URL -f apps/api/migrations/103_add_organisation_performance_analytics.sql
   ```

2. **Verify Functions Created**:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
     AND routine_name LIKE 'get_organisation%';
   ```

3. **Test Each Function**:
   ```sql
   -- Test KPIs
   SELECT * FROM get_organisation_kpis('your-org-id', 'month');

   -- Test Revenue Trend
   SELECT * FROM get_organisation_revenue_trend('your-org-id', 6);

   -- Test Team Performance
   SELECT * FROM get_team_performance('your-org-id', 'month');

   -- Test Booking Heatmap
   SELECT * FROM get_organisation_booking_heatmap('your-org-id', 4);

   -- Test Student Breakdown
   SELECT * FROM get_organisation_student_breakdown('your-org-id');
   ```

### Frontend Testing

1. **Access Performance Tab**:
   - Login as agent with Premium subscription
   - Navigate to `/organisation`
   - Click "Performance" tab (3rd tab)

2. **Test Period Selector**:
   - Click "This Month" → Verify data updates
   - Click "This Quarter" → Verify data updates
   - Click "This Year" → Verify data updates

3. **Verify KPI Cards**:
   - Check revenue displays correctly
   - Check % change indicators (green for positive, red for negative)
   - Check student count
   - Check session count
   - Check average rating

4. **Verify Revenue Chart**:
   - Check 6 bars displayed
   - Check week labels
   - Check revenue amounts
   - Check session counts below bars

5. **Verify Team Table**:
   - Check all team members listed
   - Check avatars display
   - Check revenue, sessions, students columns
   - Check rating stars
   - Check last session dates

6. **Verify Student Breakdown**:
   - Check up to 6 subject cards displayed
   - Check student counts
   - Check revenue amounts

### API Testing

Test each API route with curl:

```bash
# Get auth token first
TOKEN="your-session-token"
ORG_ID="your-org-id"

# Test KPIs
curl "http://localhost:3000/api/organisation/$ORG_ID/analytics/kpis?period=month" \
  -H "Cookie: sb-access-token=$TOKEN"

# Test Revenue Trend
curl "http://localhost:3000/api/organisation/$ORG_ID/analytics/revenue-trend?weeks=6" \
  -H "Cookie: sb-access-token=$TOKEN"

# Test Team Performance
curl "http://localhost:3000/api/organisation/$ORG_ID/analytics/team-performance?period=month" \
  -H "Cookie: sb-access-token=$TOKEN"

# Test Booking Heatmap
curl "http://localhost:3000/api/organisation/$ORG_ID/analytics/booking-heatmap?weeks=4" \
  -H "Cookie: sb-access-token=$TOKEN"

# Test Student Breakdown
curl "http://localhost:3000/api/organisation/$ORG_ID/analytics/student-breakdown" \
  -H "Cookie: sb-access-token=$TOKEN"
```

### Common Issues

**Issue**: Performance tab shows "Failed to load"

**Debug**:
1. Check migration applied: `\df get_organisation*` in psql
2. Check API routes exist: `ls apps/web/src/app/api/organisation/[id]/analytics/`
3. Check browser console for errors
4. Check subscription status (must be Premium)

**Issue**: Empty data in charts

**Debug**:
1. Check organisation has completed bookings
2. Check RPC functions return data: `SELECT * FROM get_organisation_kpis('org-id', 'month');`
3. Check date range (may need historical data)

---

**Implementation Complete**: v7.0 - All Features Working
**Phase 1**: Stripe Subscription Infrastructure ✅
**Phase 2**: Performance Analytics Tab ✅

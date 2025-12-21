# Automated Payouts Implementation Plan

**Status**: 📋 Planned (Q1 2026)
**Priority**: High (Critical for agent retention)
**Estimated Effort**: 2-3 weeks
**Dependencies**: Stripe Connect, Transaction System
**Owner**: Growth + Payments Teams

---

## Current State (Manual Withdrawals)

### What Works
- ✅ Commission transactions created automatically when bookings complete
- ✅ Transaction status: `Pending` → `Available` (manual transition)
- ✅ Manual withdrawal endpoint: `/api/financials/withdraw`
- ✅ Stripe Connect integration: `createConnectPayout()`
- ✅ 7-day clearing period concept exists

### Pain Points
❌ **Agents must manually request withdrawals**
- Poor user experience (requires active management)
- Friction in commission flow
- Reduces perceived value of referral program

❌ **No automated status transitions**
- Transactions stay in `Pending` indefinitely
- No cron job to move `Pending` → `Available` after clearing period
- Agents don't know when funds are ready

❌ **No batch processing**
- Each withdrawal requires manual action
- No economies of scale for Stripe fees
- No predictable payout schedule

---

## Desired State (Automated Payouts)

### User Experience
✅ **Agent refers tutor → Booking completes → 7 days later → Money in bank**

**Zero manual steps required**

### System Behavior
1. Booking completes → Commission transaction created (`status: Pending`)
2. **Automated Job #1**: After 7 days → Status changes to `Available`
3. **Automated Job #2**: Every Friday → Batch process all `Available` transactions
4. Stripe Connect payout initiated → Funds transfer to agent's bank
5. Transaction status → `Paid Out`
6. Email notification sent to agent

---

## Implementation Plan

### Phase 1: Automated Status Transitions (Week 1)

**Goal**: Automatically move transactions from `Pending` → `Available` after clearing period

#### 1.1 Create Cron Job

**File**: `apps/web/src/cron/process-pending-commissions.ts`

```typescript
/**
 * Cron Job: Process Pending Commissions
 * Frequency: Every hour
 * Purpose: Transition Pending → Available after 7-day clearing period
 */

import { createClient } from '@/utils/supabase/server';

export async function processPendingCommissions() {
  const supabase = createClient();

  // Find all Pending transactions past clearing period
  const { data: pendingTransactions, error } = await supabase
    .from('transactions')
    .select('id, profile_id, amount, booking_id, created_at')
    .eq('type', 'Referral Commission')
    .eq('status', 'Pending')
    .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !pendingTransactions) {
    console.error('[CRON] Failed to fetch pending commissions:', error);
    return;
  }

  console.log(`[CRON] Processing ${pendingTransactions.length} pending commissions`);

  for (const tx of pendingTransactions) {
    try {
      // Update status to Available
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'Available',
          available_at: new Date().toISOString(),
        })
        .eq('id', tx.id);

      if (updateError) {
        console.error(`[CRON] Failed to update transaction ${tx.id}:`, updateError);
        continue;
      }

      console.log(`[CRON] ✓ Transaction ${tx.id} → Available (£${tx.amount})`);

      // Send notification email
      await sendCommissionAvailableEmail(tx.profile_id, tx.amount);

    } catch (error) {
      console.error(`[CRON] Error processing transaction ${tx.id}:`, error);
    }
  }

  console.log('[CRON] Pending commission processing complete');
}
```

#### 1.2 Configure Vercel Cron

**File**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/process-pending-commissions",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Frequency**: Every hour (hourly at :00)

#### 1.3 Create API Route

**File**: `apps/web/src/app/api/cron/process-pending-commissions/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { processPendingCommissions } from '@/cron/process-pending-commissions';

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await processPendingCommissions();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CRON API] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

#### 1.4 Email Notification

**File**: `apps/web/src/lib/email/commission-available.ts`

```typescript
import { sendEmail } from './client';

export async function sendCommissionAvailableEmail(
  profileId: string,
  amount: number
) {
  // Fetch user email
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', profileId)
    .single();

  if (!profile) return;

  await sendEmail({
    to: profile.email,
    subject: `£${amount.toFixed(2)} Commission Available for Withdrawal`,
    html: `
      <h2>Your commission is ready!</h2>
      <p>Hi ${profile.full_name},</p>
      <p>Great news! Your referral commission of <strong>£${amount.toFixed(2)}</strong> has cleared the 7-day holding period and is now available for withdrawal.</p>
      <p><a href="https://tutorwise.com/financials/payouts">Withdraw Now</a></p>
      <p>Or wait for the next automatic payout on Friday.</p>
    `,
  });
}
```

---

### Phase 2: Batch Payout Processor (Week 2)

**Goal**: Automatically pay out all `Available` commissions weekly

#### 2.1 Create Batch Processor

**File**: `apps/web/src/cron/process-batch-payouts.ts`

```typescript
/**
 * Cron Job: Process Batch Payouts
 * Frequency: Weekly (Fridays at 10:00 AM)
 * Purpose: Automatically pay out all Available commissions
 */

import { createClient } from '@/utils/supabase/server';
import { createConnectPayout } from '@/lib/stripe/payouts';

const MIN_PAYOUT_AMOUNT = 25; // £25 minimum

export async function processBatchPayouts() {
  const supabase = createClient();

  // Group available transactions by profile
  const { data: availableCommissions, error } = await supabase
    .from('transactions')
    .select('profile_id, amount, id')
    .eq('type', 'Referral Commission')
    .eq('status', 'Available');

  if (error || !availableCommissions) {
    console.error('[BATCH PAYOUT] Failed to fetch available commissions:', error);
    return;
  }

  // Group by profile and calculate totals
  const profileBalances = new Map<string, { total: number; txIds: string[] }>();

  for (const tx of availableCommissions) {
    const existing = profileBalances.get(tx.profile_id) || { total: 0, txIds: [] };
    profileBalances.set(tx.profile_id, {
      total: existing.total + tx.amount,
      txIds: [...existing.txIds, tx.id],
    });
  }

  console.log(`[BATCH PAYOUT] Processing ${profileBalances.size} profiles`);

  // Process each profile
  for (const [profileId, { total, txIds }] of profileBalances.entries()) {
    // Skip if below minimum
    if (total < MIN_PAYOUT_AMOUNT) {
      console.log(`[BATCH PAYOUT] Profile ${profileId}: £${total} below minimum, skipping`);
      continue;
    }

    try {
      // Get profile's Stripe Connect account
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_connect_account_id, email, full_name')
        .eq('id', profileId)
        .single();

      if (!profile?.stripe_connect_account_id) {
        console.warn(`[BATCH PAYOUT] Profile ${profileId}: No Stripe account, skipping`);
        continue;
      }

      // Verify account can receive payouts
      const { canReceivePayouts } = await import('@/lib/stripe/payouts');
      const { ready, reason } = await canReceivePayouts(profile.stripe_connect_account_id);

      if (!ready) {
        console.warn(`[BATCH PAYOUT] Profile ${profileId}: Cannot receive payouts - ${reason}`);
        continue;
      }

      // Create payout
      const result = await createConnectPayout(
        profile.stripe_connect_account_id,
        total,
        `Weekly commission payout`,
        `payout_${Date.now()}_${profileId}` // Idempotency key
      );

      if (!result.success) {
        console.error(`[BATCH PAYOUT] Profile ${profileId}: Payout failed - ${result.error}`);

        // Mark transactions as failed
        await supabase
          .from('transactions')
          .update({
            status: 'Failed',
            payout_error: result.error
          })
          .in('id', txIds);

        continue;
      }

      // Success! Update all transactions
      await supabase
        .from('transactions')
        .update({
          status: 'Paid Out',
          paid_out_at: new Date().toISOString(),
          stripe_payout_id: result.payoutId,
        })
        .in('id', txIds);

      console.log(`[BATCH PAYOUT] ✓ Profile ${profileId}: £${total} paid (${result.payoutId})`);

      // Send confirmation email
      await sendPayoutConfirmationEmail(
        profile.email,
        profile.full_name,
        total,
        result.estimatedArrival
      );

    } catch (error) {
      console.error(`[BATCH PAYOUT] Error processing profile ${profileId}:`, error);
    }
  }

  console.log('[BATCH PAYOUT] Batch processing complete');
}
```

#### 2.2 Configure Weekly Cron

**File**: `vercel.json` (update)

```json
{
  "crons": [
    {
      "path": "/api/cron/process-pending-commissions",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/process-batch-payouts",
      "schedule": "0 10 * * 5"
    }
  ]
}
```

**Schedule**: Every Friday at 10:00 AM UTC

#### 2.3 Payout Confirmation Email

**File**: `apps/web/src/lib/email/payout-confirmation.ts`

```typescript
export async function sendPayoutConfirmationEmail(
  email: string,
  name: string,
  amount: number,
  estimatedArrival: Date
) {
  await sendEmail({
    to: email,
    subject: `£${amount.toFixed(2)} Commission Paid Out`,
    html: `
      <h2>Weekly Payout Processed</h2>
      <p>Hi ${name},</p>
      <p>Your weekly commission payout has been processed successfully!</p>
      <ul>
        <li><strong>Amount:</strong> £${amount.toFixed(2)}</li>
        <li><strong>Estimated Arrival:</strong> ${estimatedArrival.toLocaleDateString()}</li>
        <li><strong>Method:</strong> Bank transfer via Stripe</li>
      </ul>
      <p>The funds should appear in your bank account within 2-5 business days.</p>
      <p><a href="https://tutorwise.com/financials/payouts">View Transaction History</a></p>
    `,
  });
}
```

---

### Phase 3: User Preferences & Controls (Week 3)

**Goal**: Let agents customize their payout preferences

#### 3.1 Database Schema

**Migration**: `131_add_payout_preferences.sql`

```sql
-- Add payout preferences to profiles
ALTER TABLE profiles
ADD COLUMN payout_schedule TEXT DEFAULT 'weekly' CHECK (payout_schedule IN ('weekly', 'biweekly', 'monthly', 'manual'));

ADD COLUMN payout_min_amount NUMERIC(10,2) DEFAULT 25.00 CHECK (payout_min_amount >= 25);

ADD COLUMN payout_auto_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN profiles.payout_schedule IS
'Automated payout frequency: weekly (Fridays), biweekly (1st & 15th), monthly (1st), or manual (disabled)';

COMMENT ON COLUMN profiles.payout_min_amount IS
'Minimum balance required before auto-payout triggers. Default £25, max £1000.';

COMMENT ON COLUMN profiles.payout_auto_enabled IS
'Whether automated payouts are enabled. If false, user must withdraw manually.';
```

#### 3.2 Settings UI

**File**: `apps/web/src/app/(authenticated)/account/payouts/page.tsx`

```tsx
export default function PayoutSettingsPage() {
  const [schedule, setSchedule] = useState('weekly');
  const [minAmount, setMinAmount] = useState(25);
  const [autoEnabled, setAutoEnabled] = useState(true);

  return (
    <div>
      <h1>Payout Settings</h1>

      <Card>
        <h2>Automatic Payouts</h2>

        <Toggle
          enabled={autoEnabled}
          onChange={setAutoEnabled}
          label="Enable automatic payouts"
        />

        {autoEnabled && (
          <>
            <Select
              value={schedule}
              onChange={setSchedule}
              label="Payout Schedule"
              options={[
                { value: 'weekly', label: 'Weekly (Every Friday)' },
                { value: 'biweekly', label: 'Bi-weekly (1st & 15th)' },
                { value: 'monthly', label: 'Monthly (1st of month)' },
              ]}
            />

            <Input
              type="number"
              value={minAmount}
              onChange={setMinAmount}
              label="Minimum Payout Amount"
              min={25}
              max={1000}
              prefix="£"
              help="Only process payouts when balance reaches this amount"
            />
          </>
        )}

        <Button onClick={saveSettings}>Save Settings</Button>
      </Card>
    </div>
  );
}
```

#### 3.3 Update Batch Processor

Modify `processBatchPayouts()` to respect user preferences:

```typescript
// Check if auto-payouts enabled for this profile
if (!profile.payout_auto_enabled) {
  console.log(`[BATCH PAYOUT] Profile ${profileId}: Auto-payouts disabled, skipping`);
  continue;
}

// Check schedule matches
const today = new Date();
if (profile.payout_schedule === 'biweekly' && ![1, 15].includes(today.getDate())) {
  continue; // Only pay on 1st and 15th
}
if (profile.payout_schedule === 'monthly' && today.getDate() !== 1) {
  continue; // Only pay on 1st of month
}

// Check minimum amount
if (total < profile.payout_min_amount) {
  console.log(`[BATCH PAYOUT] Profile ${profileId}: £${total} below min ${profile.payout_min_amount}`);
  continue;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Automated Payouts', () => {
  describe('processPendingCommissions', () => {
    it('should transition Pending → Available after 7 days', async () => {
      // Create transaction 8 days ago
      const tx = await createTestTransaction({
        status: 'Pending',
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      });

      await processPendingCommissions();

      const updated = await getTransaction(tx.id);
      expect(updated.status).toBe('Available');
      expect(updated.available_at).toBeDefined();
    });

    it('should NOT transition if within 7 days', async () => {
      const tx = await createTestTransaction({
        status: 'Pending',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      });

      await processPendingCommissions();

      const updated = await getTransaction(tx.id);
      expect(updated.status).toBe('Pending');
    });
  });

  describe('processBatchPayouts', () => {
    it('should pay out when balance >= minimum', async () => {
      await createTestTransactions(profileId, [
        { amount: 15, status: 'Available' },
        { amount: 20, status: 'Available' },
      ]); // Total: £35

      const result = await processBatchPayouts();

      expect(result.payouts).toHaveLength(1);
      expect(result.payouts[0].amount).toBe(35);
    });

    it('should skip if balance < minimum', async () => {
      await createTestTransactions(profileId, [
        { amount: 10, status: 'Available' },
      ]);

      const result = await processBatchPayouts();

      expect(result.payouts).toHaveLength(0);
    });
  });
});
```

### Integration Tests

**Test Scenarios:**

1. **End-to-End Happy Path**:
   - Create booking → Commission created (Pending)
   - Run cron (+7 days) → Status becomes Available
   - Run batch payout → Stripe payout created
   - Verify email sent
   - Verify transaction status = Paid Out

2. **Failed Payout Retry**:
   - Batch payout fails (Stripe error)
   - Transaction marked as Failed
   - Next week, retry failed transactions
   - Success on retry

3. **User Preference Honored**:
   - User sets schedule = monthly
   - Balance = £100
   - Run weekly batch → Skipped
   - Run on 1st of month → Paid out

---

## Monitoring & Alerts

### CloudWatch Metrics

```typescript
// Track cron job performance
await cloudwatch.putMetric({
  namespace: 'Referrals',
  metricName: 'PendingCommissionsProcessed',
  value: processedCount,
  unit: 'Count',
});

await cloudwatch.putMetric({
  namespace: 'Referrals',
  metricName: 'BatchPayoutsSuccessful',
  value: successfulPayouts,
  unit: 'Count',
});

await cloudwatch.putMetric({
  namespace: 'Referrals',
  metricName: 'BatchPayoutsFailed',
  value: failedPayouts,
  unit: 'Count',
});
```

### Alert Thresholds

**Critical Alerts** (PagerDuty):
- Batch payout failure rate > 10%
- Cron job hasn't run in 2+ hours
- Stripe API errors > 5% of attempts

**Warning Alerts** (Slack):
- Individual payout failure
- Profile missing Stripe account
- Balance above £1000 not paid out

---

## Rollout Plan

### Week 1: Soft Launch (Internal Testing)
- Deploy to staging environment
- Test with 5 internal agent accounts
- Monitor for 1 week
- Fix any issues

### Week 2: Beta Launch (Selected Agents)
- Enable for top 20 agents (high-value partners)
- Announce via email: "You've been selected for early access"
- Collect feedback
- Monitor closely

### Week 3: Phased Rollout
- Enable for 25% of agents
- Monitor for issues
- Enable for 50% of agents
- Monitor for issues
- Enable for 100% of agents

### Communication Plan

**Email #1: Announcement (2 weeks before)**
```
Subject: Exciting News: Automatic Commission Payouts Coming Soon!

We're introducing automatic weekly payouts for your referral commissions.

What's changing:
- Commissions will be paid automatically every Friday
- No more manual withdrawal requests
- Funds in your bank within 7-10 days of booking

You'll still have full control and can opt-out if preferred.

Rolling out January 15th, 2026.
```

**Email #2: Launch Day**
```
Subject: Automatic Payouts Are Live!

Your first automatic payout will be processed this Friday.

What to expect:
- We'll email you when commissions are ready
- Payouts happen every Friday at 10 AM
- Minimum balance: £25

Customize your settings: [Link to settings page]
```

---

## Success Metrics

### KPIs

**Operational Excellence:**
- ✅ 99%+ cron job success rate
- ✅ <5% payout failure rate
- ✅ Average time to bank: <10 days

**User Satisfaction:**
- ✅ 80%+ agents keep auto-payouts enabled
- ✅ <5% customer support tickets about payouts
- ✅ NPS score improvement (+10 points)

**Business Impact:**
- ✅ 20% increase in referral activity
- ✅ Reduced manual support time (save 10 hours/week)
- ✅ Improved agent retention (+15%)

---

## Risks & Mitigation

### Risk 1: Stripe API Failures

**Impact**: Payouts don't process, angry agents

**Mitigation**:
- Implement retry logic (3 attempts with exponential backoff)
- Mark failed transactions for manual review
- Alert on-call engineer immediately
- Fallback to manual processing if needed

### Risk 2: Duplicate Payouts

**Impact**: Double payment, financial loss

**Mitigation**:
- Use idempotency keys for all Stripe calls
- Database constraints prevent double-processing
- Audit logs track all payout attempts
- Weekly reconciliation reports

### Risk 3: Regulatory Compliance

**Impact**: Legal issues with automated payouts

**Mitigation**:
- Consult legal team before launch
- Ensure compliance with UK payment regulations
- Provide opt-out for agents who prefer manual
- Document all automated processes

---

## Future Enhancements

### Q2 2026
- **Instant Payouts** (for premium agents):
  - Pay within 24 hours (Stripe Instant Payouts)
  - Premium feature for agents with >£500/month

- **Split Payouts**:
  - Pay to multiple bank accounts
  - Percentage-based splits

### Q3 2026
- **Cryptocurrency Payouts**:
  - Pay in USDC/USDT
  - Target international agents

- **Tax Withholding**:
  - Automatic tax withholding for high earners
  - Integration with HMRC APIs

---

## Estimated Costs

### Development
- Engineering time: 2-3 weeks (1 senior engineer)
- Cost: ~£8,000-12,000

### Operational
- Stripe payout fees: £0.25 per payout + 0.25%
- Email costs: Negligible (SendGrid)
- Cron job compute: ~£5/month (Vercel)

**Monthly at scale** (1,000 active agents):
- 4,000 payouts/month (1,000 agents × 4 weeks)
- Stripe fees: £1,000 + (0.25% of payout amounts)
- Total: ~£1,500/month

**Break-even**: Saves ~£2,000/month in support costs (10 hours/week × £50/hour)

---

## Conclusion

Automated payouts are critical for:
1. **Agent Retention**: Reduces friction, increases satisfaction
2. **Operational Efficiency**: Saves manual support time
3. **Competitive Advantage**: Most platforms don't offer this
4. **Scalability**: Essential as referral program grows

**Recommended Timeline**: Start development Q1 2026, launch Feb 2026

**Priority**: **HIGH** - This is a key blocker for referral program growth

---

**Document Version**: 1.0
**Created**: 2025-12-21
**Owner**: Growth Team
**Status**: 📋 Awaiting Approval

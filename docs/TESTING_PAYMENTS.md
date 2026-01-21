# Testing Stripe Payment Integration (v4.9 Financials)

This guide covers how to test the complete payment flow in your local development environment.

## Prerequisites

1. **Stripe Account**: You need a Stripe account with test mode enabled
2. **Environment Variables**: Ensure you have the following in your `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...  # Get this from Stripe CLI
   ```

## Installation & Setup

### 1. Install Stripe CLI

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**macOS (Manual):**
```bash
curl -L https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_darwin_arm64.tar.gz | tar xz
sudo mv stripe /usr/local/bin/
```

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

Verify installation:
```bash
stripe --version
```

### 2. Authenticate Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate with your Stripe account.

## Testing Workflow

### Step 1: Start Your Dev Server

```bash
npm run dev
```

Your Next.js app should be running on `http://localhost:3000`

### Step 2: Forward Webhooks to Local Server

In a **separate terminal**, run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Important:** Copy the webhook signing secret that appears (starts with `whsec_`):
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef... (^C to quit)
```

Add this to your `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

Restart your dev server after adding the secret.

### Step 3: Create a Test Stripe Connect Account

You need to create a test Connect account to receive payouts. You can do this in two ways:

#### Option A: Use Stripe Dashboard
1. Go to https://dashboard.stripe.com/test/connect/accounts
2. Create a new Express Connect account
3. Use test data (see below)

#### Option B: Use the App's Onboarding Flow
1. Log into your app at `http://localhost:3000`
2. Navigate to Settings > Payments
3. Click "Connect Bank Account"
4. Complete the onboarding flow with test data

**Test Connect Account Data:**
- Business type: Individual
- First name: Test
- Last name: User
- DOB: 01/01/1990
- Address: 123 Test St, London, SW1A 1AA, UK
- Bank account: Use test routing/account numbers from Stripe docs

### Step 4: Seed Test Transactions

You need some transactions in your account to test withdrawals. You can either:

#### Option A: Create transactions via SQL
```sql
-- Connect to your database and run:
INSERT INTO transactions (profile_id, type, description, amount, status, available_at, created_at)
VALUES
  ('YOUR_USER_ID', 'Booking Payment', 'Test booking payment', 100.00, 'available', NOW(), NOW()),
  ('YOUR_USER_ID', 'Booking Payment', 'Another test payment', 50.00, 'available', NOW(), NOW());
```

#### Option B: Complete a test booking payment
1. Create a booking through your app
2. Complete the payment using Stripe test cards
3. Wait for the clearing period to pass (or manually update the status)

### Step 5: Test the Withdrawal Flow

1. **Navigate to Financials page:**
   ```
   http://localhost:3000/financials
   ```

2. **Check your wallet balance:**
   - Available balance should show funds from your test transactions
   - Pending balance should show funds still clearing

3. **Initiate a withdrawal:**
   - Click "Withdraw Funds" button
   - Enter an amount (£10 minimum, £50,000 maximum)
   - Confirm the withdrawal

4. **Check the response:**
   - Success: You should see a success message
   - Error: Check the browser console and server logs for details

5. **Verify in Stripe Dashboard:**
   - Go to https://dashboard.stripe.com/test/connect/payouts
   - You should see the payout created
   - In test mode, payouts are marked as "paid" immediately

### Step 6: Test Webhook Events

#### Trigger Payout Success Event
```bash
stripe trigger payout.paid
```

#### Trigger Payout Failure Event
```bash
stripe trigger payout.failed
```

#### Trigger Payout Canceled Event
```bash
# Manual: Create a payout, then cancel it in Stripe Dashboard
# The webhook will fire automatically
```

#### Monitor Webhook Events
Watch the terminal where `stripe listen` is running. You should see:
```
2025-11-11 12:00:00   --> payout.paid [evt_1234...]
2025-11-11 12:00:01   <-- [200] POST http://localhost:3000/api/webhooks/stripe
```

### Step 7: Verify Database Updates

After each webhook event, check your database:

```sql
-- Check transactions table
SELECT id, type, description, amount, status, stripe_payout_id, created_at
FROM transactions
WHERE profile_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Check for reversal transactions (from failed payouts)
SELECT * FROM transactions
WHERE type = 'Refund'
ORDER BY created_at DESC;

-- Check failed webhooks (DLQ)
SELECT * FROM failed_webhooks
ORDER BY created_at DESC;
```

## Test Scenarios

### Scenario 1: Successful Withdrawal Flow
**Expected Behavior:**
1. User initiates withdrawal
2. Transaction created with status 'clearing'
3. Stripe payout created
4. Transaction updated to 'paid_out' with payout ID
5. Available balance decreases
6. Webhook `payout.paid` received
7. Transaction status confirmed as 'paid_out'

**Testing Steps:**
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Trigger payout success (after initiating withdrawal)
stripe trigger payout.paid
```

### Scenario 2: Failed Payout with Reversal
**Expected Behavior:**
1. User initiates withdrawal
2. Payout fails at Stripe
3. Webhook `payout.failed` received
4. Transaction marked as 'Failed'
5. Reversal transaction created
6. Funds returned to available balance

**Testing Steps:**
```bash
# After initiating a withdrawal, trigger failure
stripe trigger payout.failed
```

Verify:
- Original transaction has status 'Failed'
- New 'Refund' transaction exists
- Available balance restored

### Scenario 3: Insufficient Balance
**Expected Behavior:**
1. User attempts withdrawal exceeding available balance
2. API returns 400 error
3. No transaction created
4. User sees error message

**Testing Steps:**
1. Check available balance (e.g., £100)
2. Attempt to withdraw £150
3. Should see error: "Insufficient balance"

### Scenario 4: Invalid Withdrawal Amount
**Expected Behavior:**
- Below minimum (£10): Error message
- Above maximum (£50,000): Error message
- Invalid number: Error message

**Testing Steps:**
```bash
# Test via API directly
curl -X POST http://localhost:3000/api/financials/withdraw \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"amount": 5}'  # Below minimum
```

### Scenario 5: No Stripe Account Connected
**Expected Behavior:**
1. User without Stripe Connect account attempts withdrawal
2. API returns 400 error
3. User redirected to connect bank account

**Testing Steps:**
1. Create a new user account
2. Manually add available balance via SQL
3. Attempt withdrawal without connecting Stripe
4. Should see: "Please connect your bank account before withdrawing funds"

## Stripe Test Cards & Data

### Test Card Numbers
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
```

### Test Bank Accounts (UK)
```
Sort Code: 108800
Account Number: 00012345
```

### Test Connect Account Info
```
Business Type: Individual
First Name: Test
Last Name: User
DOB: 01/01/1990
Email: test@example.com
Phone: +44 7700 900000
Address: 123 Test Street
City: London
Postal Code: SW1A 1AA
Country: United Kingdom
```

## Debugging Tips

### Check Server Logs
```bash
# In your dev server terminal, look for:
[WITHDRAWAL:WD_xxx] Request received
[WITHDRAWAL:WD_xxx] User authenticated: user_id
[WITHDRAWAL:WD_xxx] Amount validated: £X.XX
[WITHDRAWAL:WD_xxx] Available balance: £X.XX
[PAYOUT] Initiating payout: {...}
[PAYOUT] Success: {...}
[WEBHOOK:PAYOUT] Payout paid: po_xxx
```

### Check Webhook Logs
```bash
# In your stripe listen terminal:
2025-11-11 12:00:00   --> payout.paid [evt_xxx]
2025-11-11 12:00:01   <-- [200] POST http://localhost:3000/api/webhooks/stripe
```

### Common Issues

**Issue: "Webhook signature verification failed"**
- **Solution:** Make sure `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the one from `stripe listen`

**Issue: "No Stripe account connected"**
- **Solution:** Complete Stripe Connect onboarding first

**Issue: "Insufficient balance"**
- **Solution:** Create test transactions or manually update available balance

**Issue: Webhooks not firing**
- **Solution:** Ensure `stripe listen` is running and forwarding to correct port

**Issue: "Invalid Stripe Connect account ID"**
- **Solution:** Check `profiles.stripe_account_id` in database matches format `acct_xxx`

## Production Testing Checklist

Before deploying to production:

- [ ] Test complete withdrawal flow
- [ ] Test all webhook events (paid, failed, canceled, updated)
- [ ] Test insufficient balance scenario
- [ ] Test invalid amounts (below min, above max)
- [ ] Test without Stripe Connect account
- [ ] Test concurrent withdrawal attempts
- [ ] Test reversal transaction creation
- [ ] Verify all logs are working
- [ ] Verify balance calculations are accurate
- [ ] Test DLQ (failed webhooks) logging
- [ ] Configure production webhook endpoint in Stripe Dashboard
- [ ] Update `STRIPE_WEBHOOK_SECRET` for production

## Monitoring in Production

### Key Metrics to Monitor
1. **Withdrawal Success Rate**: Should be >99%
2. **Webhook Processing Time**: Should be <2 seconds
3. **Failed Webhooks (DLQ)**: Should be near zero
4. **Balance Discrepancies**: Should be zero

### Stripe Dashboard Monitoring
- Monitor: https://dashboard.stripe.com/connect/payouts
- Webhooks: https://dashboard.stripe.com/webhooks
- Logs: https://dashboard.stripe.com/logs

### Database Queries for Monitoring
```sql
-- Check recent withdrawals
SELECT
  t.id,
  p.email,
  t.amount,
  t.status,
  t.stripe_payout_id,
  t.created_at
FROM transactions t
JOIN profiles p ON p.id = t.profile_id
WHERE t.type = 'Withdrawal'
AND t.created_at > NOW() - INTERVAL '24 hours'
ORDER BY t.created_at DESC;

-- Check failed payouts
SELECT * FROM transactions
WHERE status = 'Failed'
AND type = 'Withdrawal'
AND created_at > NOW() - INTERVAL '7 days';

-- Check DLQ
SELECT * FROM failed_webhooks
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Support

If you encounter issues:
1. Check the [Stripe API docs](https://stripe.com/docs/api)
2. Review [Stripe Connect docs](https://stripe.com/docs/connect)
3. Check [Stripe webhook docs](https://stripe.com/docs/webhooks)
4. Search existing issues in the project repository

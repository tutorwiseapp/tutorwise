# Stripe Authentication & Integration Guide

## Overview

This guide explains Stripe's API key system and how to properly configure payment integration for TutorWise, including test vs live modes, webhooks, and security best practices.

## API Key Types

Stripe uses different API keys for different environments and security contexts.

### 1. Publishable Keys (Public)

**What it is:**
- Client-side safe API key
- Used to initialize Stripe.js in the browser
- Can create tokens and payment methods
- Cannot complete charges or access sensitive data
- Prefixed with `pk_`

**Test vs Live:**
- **Test**: `pk_test_xxxxx` - For development/testing
- **Live**: `pk_live_xxxxx` - For production

**When to use:**
- ✅ Frontend applications (checkout forms, payment elements)
- ✅ Mobile apps (payment UI)
- ✅ Creating payment methods
- ✅ Client-side tokenization
- ✅ Stripe Elements/Checkout

**Where to find:**
- URL: https://dashboard.stripe.com/apikeys
- Path: Developers → API keys → Publishable key

**Security:**
- ✅ Safe to expose in frontend code
- ✅ Can be committed to git (public repos)
- ✅ Limited to safe operations only
- ⚠️ Still use environment variables for flexibility

**How to use:**
```bash
# .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxx

# In client code
import { loadStripe } from '@stripe/stripe-js'

const stripe = await loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
)
```

### 2. Secret Keys (Private)

**What it is:**
- Server-side only, secret API key
- Full access to Stripe API
- Can create charges, refunds, customers, etc.
- Prefixed with `sk_`

**Test vs Live:**
- **Test**: `sk_test_xxxxx` - For development/testing
- **Live**: `sk_live_xxxxx` - For production

**When to use:**
- ✅ Server-side API routes
- ✅ Backend services (FastAPI, Express, etc.)
- ✅ Creating charges/payment intents
- ✅ Managing customers and subscriptions
- ✅ Webhook processing
- ✅ Refunds and transfers

**When NOT to use:**
- ❌ **NEVER** use in client-side code
- ❌ **NEVER** expose in frontend
- ❌ **NEVER** commit to public repositories
- ❌ **NEVER** use in mobile apps

**Where to find:**
- URL: https://dashboard.stripe.com/apikeys
- Path: Developers → API keys → Secret key
- Click "Reveal" to see the key

**Security:**
- ❌ Must be kept SECRET at all times
- ✅ Only use server-side
- ✅ Store in `.env.local` (git-ignored)
- ✅ Use environment variables in production
- ⚠️ Full access to your Stripe account

**How to use:**
```bash
# .env.local (NEVER commit this!)
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxx

# In server code ONLY (API routes, backend)
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
})
```

### 3. Restricted Keys (Advanced)

**What it is:**
- Custom API keys with limited permissions
- Scoped to specific API resources/operations
- Used for third-party integrations
- Minimizes security risk

**When to use:**
- ✅ Third-party integrations
- ✅ Contractor/agency access
- ✅ Limited scope operations
- ✅ Microservices with specific needs
- ✅ Compliance requirements

**Where to create:**
- URL: https://dashboard.stripe.com/apikeys/create
- Path: Developers → API keys → Create restricted key

**How to create:**
1. Go to https://dashboard.stripe.com/apikeys/create
2. Click "Create restricted key"
3. Name the key (e.g., "Webhook Handler", "Subscription Service")
4. Select permissions:
   - **Read**: charges, customers, subscriptions, etc.
   - **Write**: Only what's needed
   - **None**: Everything else
5. Click "Create key"
6. Copy the key (starts with `rk_`)

**Example use cases:**
```bash
# Webhook handler (read/write charges, read customers)
STRIPE_WEBHOOK_KEY=rk_live_xxxxx

# Analytics service (read-only access)
STRIPE_ANALYTICS_KEY=rk_live_xxxxx

# Subscription service (customers + subscriptions only)
STRIPE_SUBSCRIPTION_KEY=rk_live_xxxxx
```

### 4. Webhook Signing Secrets

**What it is:**
- Secret used to verify webhook authenticity
- Ensures webhooks are from Stripe
- Different for each webhook endpoint
- Prefixed with `whsec_`

**When to use:**
- ✅ **ALWAYS** when processing webhooks
- ✅ Verifying webhook signatures
- ✅ Preventing webhook replay attacks
- ✅ Securing webhook endpoints

**Where to find:**
- URL: https://dashboard.stripe.com/webhooks
- Path: Developers → Webhooks → Select endpoint → Signing secret

**How to create:**
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint" or select existing
3. Enter endpoint URL (e.g., `https://yourapp.com/api/webhooks/stripe`)
4. Select events to listen to
5. Click "Add endpoint"
6. Click "Reveal" under "Signing secret"
7. Copy the secret (starts with `whsec_`)

**How to use:**
```bash
# .env.local
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxxxx

# In webhook handler
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Process the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Handle successful payment
      break
    case 'customer.subscription.created':
      // Handle new subscription
      break
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
```

## Test Mode vs Live Mode

Stripe has two completely separate environments:

### Test Mode
- **Purpose**: Development, testing, staging
- **Keys**: `pk_test_xxxxx`, `sk_test_xxxxx`
- **Data**: Fake transactions, test cards
- **Webhooks**: Test webhook endpoints
- **No real money**: All transactions are simulated

**Test Cards:**
```bash
# Successful payment
4242 4242 4242 4242    # Visa
5555 5555 5555 4444    # Mastercard
3782 822463 10005      # Amex

# Declined payment
4000 0000 0000 0002    # Generic decline
4000 0000 0000 9995    # Insufficient funds

# Requires authentication (3D Secure)
4000 0025 0000 3155    # Requires authentication

# Any future date for expiry (e.g., 12/34)
# Any 3 digits for CVC (e.g., 123)
# Any 5-digit ZIP (e.g., 12345)
```

### Live Mode
- **Purpose**: Production
- **Keys**: `pk_live_xxxxx`, `sk_live_xxxxx`
- **Data**: Real transactions, real money
- **Webhooks**: Production webhook endpoints
- **Activation required**: Must complete business verification

**Switching modes:**
```bash
# Use environment variables to switch
# Test environment
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY_TEST
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST

# Live environment (production)
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY_LIVE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE
```

## Required Environment Variables

### For Frontend (Next.js, React, Vue)

```bash
# .env.local
# Publishable keys (safe to expose)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxx

# Use appropriate key based on environment
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST
```

### For Backend (API Routes, FastAPI, Express)

```bash
# .env.local (git-ignored!)
# Secret keys (NEVER expose)
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxx

# Use appropriate key based on environment
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY_TEST

# Webhook secrets
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxxxx
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET_TEST
```

### For CI/CD Environments

```bash
# GitHub Secrets / Vercel Environment Variables
STRIPE_SECRET_KEY=sk_test_xxxxx  # Use test for preview, live for production
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

## Finding Your Credentials

### Method 1: From Stripe Dashboard

1. **API Keys:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Toggle between "Test mode" and "Live mode" (top right)
   - Copy:
     - **Publishable key**: For frontend
     - **Secret key**: Click "Reveal" then copy (for backend)

2. **Webhook Secrets:**
   - Go to: https://dashboard.stripe.com/webhooks
   - Select your endpoint
   - Click "Reveal" under "Signing secret"
   - Copy the secret

3. **Account ID** (for Connect/Advanced):
   - Go to: https://dashboard.stripe.com/settings/user
   - Copy "Account ID" (starts with `acct_`)

### Method 2: Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Get API keys (requires login)
stripe config --list

# Get webhook secret (after listening)
stripe listen --print-secret
```

## Common Issues & Solutions

### Issue 1: "Invalid API Key" or "No such key"

**Symptoms:**
```bash
Error: Invalid API Key provided: sk_test_***
Error: No such api_key: pk_live_***
```

**Causes:**
1. Using wrong API key (test vs live)
2. API key copied incorrectly
3. Key was deleted/rolled in dashboard
4. Using publishable key server-side or vice versa

**Solutions:**
1. **Verify the key type and mode:**
   ```bash
   # Check your .env.local
   cat .env.local | grep STRIPE

   # Ensure:
   # - pk_test_* for test publishable
   # - sk_test_* for test secret
   # - pk_live_* for live publishable (production)
   # - sk_live_* for live secret (production)
   ```

2. **Get fresh keys from dashboard:**
   - Go to https://dashboard.stripe.com/apikeys
   - Toggle to correct mode (Test/Live)
   - Copy the correct keys

3. **Ensure correct usage:**
   ```javascript
   // ✅ Correct
   // Frontend
   const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

   // Backend
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

   // ❌ Wrong
   // Don't use secret key in frontend
   // Don't use publishable key for charges
   ```

### Issue 2: "Webhook signature verification failed"

**Symptoms:**
```bash
Error: Webhook signature verification failed
Error: No signatures found matching the expected signature for payload
```

**Causes:**
1. Wrong webhook secret
2. Request body was modified/parsed
3. Using test secret with live webhooks
4. Webhook replay attack

**Solutions:**
1. **Verify webhook secret:**
   ```bash
   # Check webhook secret in dashboard
   # https://dashboard.stripe.com/webhooks
   # Compare with .env.local
   ```

2. **Don't parse body before verification:**
   ```javascript
   // ✅ Correct - Use raw body
   export async function POST(request: Request) {
     const body = await request.text()  // Raw text, not JSON
     const sig = request.headers.get('stripe-signature')

     const event = stripe.webhooks.constructEvent(
       body,  // Raw body
       sig,
       process.env.STRIPE_WEBHOOK_SECRET
     )
   }

   // ❌ Wrong - Don't parse first
   const body = await request.json()  // This breaks signature
   ```

3. **Use correct secret for environment:**
   ```bash
   # Test webhooks → use test secret
   STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET_TEST

   # Live webhooks → use live secret
   STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET_LIVE
   ```

4. **Test webhooks locally with Stripe CLI:**
   ```bash
   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/api/webhooks/stripe

   # Trigger test events
   stripe trigger payment_intent.succeeded
   ```

### Issue 3: "Payment requires authentication" (3D Secure)

**Symptoms:**
```bash
Error: This payment required authentication
Card requires authentication
```

**Causes:**
1. Card requires 3D Secure/SCA (Strong Customer Authentication)
2. Using test card that requires authentication
3. Not handling `requires_action` status

**Solutions:**
1. **Handle authentication in frontend:**
   ```javascript
   // Create payment intent on server
   const { clientSecret } = await fetch('/api/create-payment-intent', {
     method: 'POST',
     body: JSON.stringify({ amount: 1000 })
   }).then(r => r.json())

   // Confirm payment with authentication
   const { error, paymentIntent } = await stripe.confirmCardPayment(
     clientSecret,
     {
       payment_method: {
         card: cardElement,
         billing_details: { name: 'Customer Name' }
       }
     }
   )

   if (error) {
     // Handle error
   } else if (paymentIntent.status === 'succeeded') {
     // Payment successful
   }
   ```

2. **Use test cards appropriately:**
   ```bash
   # Always succeeds (no authentication)
   4242 4242 4242 4242

   # Requires authentication
   4000 0025 0000 3155

   # Test your auth flow with second card
   ```

### Issue 4: "Rate limit exceeded"

**Symptoms:**
```bash
Error: Rate limit exceeded
Too many requests
```

**Causes:**
1. Making too many API requests
2. Hitting Stripe's rate limits (100 req/sec test, 100 req/sec live)
3. Loops or inefficient code

**Solutions:**
1. **Implement retry logic with exponential backoff:**
   ```javascript
   import Stripe from 'stripe'

   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
     maxNetworkRetries: 3,  // Auto-retry
     timeout: 30000  // 30 second timeout
   })
   ```

2. **Cache/batch requests where possible:**
   ```javascript
   // ❌ Bad - Multiple requests
   for (const customerId of customerIds) {
     await stripe.customers.retrieve(customerId)
   }

   // ✅ Better - Use search/list with pagination
   const customers = await stripe.customers.list({
     limit: 100,
     // Use pagination
   })
   ```

3. **Check rate limit headers:**
   ```javascript
   try {
     const charge = await stripe.charges.create({...})
   } catch (error) {
     if (error.type === 'StripeRateLimitError') {
       // Wait and retry
       await new Promise(resolve => setTimeout(resolve, 1000))
       // Retry request
     }
   }
   ```

## Setup Guide

### Step-by-Step: Local Development Setup

1. **Create Stripe Account** (if not exists):
   - Go to https://dashboard.stripe.com/register
   - Complete registration
   - Verify email

2. **Get Your API Keys:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Ensure "Test mode" is ON (toggle in top right)
   - Copy:
     - **Publishable key**: `pk_test_xxxxx`
     - **Secret key**: Click "Reveal", then copy `sk_test_xxxxx`

3. **Add to Environment Variables:**
   ```bash
   # Edit .env.local
   cat >> .env.local << EOF

   # Stripe Configuration (Test Mode)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxx
   EOF
   ```

4. **Install Stripe SDKs:**
   ```bash
   # For Next.js/React
   npm install @stripe/stripe-js stripe

   # For React Native
   npm install @stripe/stripe-react-native

   # For Python (FastAPI)
   pip install stripe
   ```

5. **Initialize Stripe:**

   **Frontend (Next.js/React):**
   ```javascript
   // lib/stripe.js
   import { loadStripe } from '@stripe/stripe-js'

   export const stripePromise = loadStripe(
     process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   )
   ```

   **Backend (API Route):**
   ```javascript
   // lib/stripe-server.js
   import Stripe from 'stripe'

   export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
     apiVersion: '2023-10-16'
   })
   ```

6. **Create Test Payment Intent:**
   ```javascript
   // pages/api/create-payment-intent.js
   import { stripe } from '@/lib/stripe-server'

   export default async function handler(req, res) {
     if (req.method === 'POST') {
       try {
         const { amount } = req.body

         const paymentIntent = await stripe.paymentIntents.create({
           amount: amount * 100,  // Convert to cents
           currency: 'usd',
           automatic_payment_methods: { enabled: true }
         })

         res.status(200).json({ clientSecret: paymentIntent.client_secret })
       } catch (error) {
         res.status(500).json({ error: error.message })
       }
     }
   }
   ```

7. **Test with Test Cards:**
   ```bash
   # Use these test cards
   Card: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/34)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```

### Step-by-Step: Webhook Setup

1. **Create Webhook Endpoint:**
   ```javascript
   // pages/api/webhooks/stripe.js
   import { buffer } from 'micro'
   import { stripe } from '@/lib/stripe-server'

   export const config = {
     api: { bodyParser: false }  // Required for raw body
   }

   export default async function handler(req, res) {
     const buf = await buffer(req)
     const sig = req.headers['stripe-signature']

     let event
     try {
       event = stripe.webhooks.constructEvent(
         buf.toString(),
         sig,
         process.env.STRIPE_WEBHOOK_SECRET
       )
     } catch (err) {
       return res.status(400).send(`Webhook Error: ${err.message}`)
     }

     // Handle event
     switch (event.type) {
       case 'payment_intent.succeeded':
         const paymentIntent = event.data.object
         console.log('Payment succeeded:', paymentIntent.id)
         // Update database, send email, etc.
         break
       case 'customer.subscription.created':
         const subscription = event.data.object
         console.log('Subscription created:', subscription.id)
         break
       default:
         console.log(`Unhandled event type: ${event.type}`)
     }

     res.json({ received: true })
   }
   ```

2. **Test Webhooks Locally with Stripe CLI:**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login
   stripe login

   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/api/webhooks/stripe

   # Copy the webhook signing secret (starts with whsec_)
   # Add to .env.local:
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx

   # In another terminal, trigger test events
   stripe trigger payment_intent.succeeded
   stripe trigger customer.subscription.created
   ```

3. **Create Webhook in Dashboard (for production):**
   - Go to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Enter URL: `https://yourapp.com/api/webhooks/stripe`
   - Select events:
     - ✅ payment_intent.succeeded
     - ✅ payment_intent.payment_failed
     - ✅ customer.subscription.created
     - ✅ customer.subscription.updated
     - ✅ customer.subscription.deleted
     - ✅ invoice.paid
     - ✅ invoice.payment_failed
   - Click "Add endpoint"
   - Copy "Signing secret"
   - Add to production environment variables

4. **Test Webhook in Production:**
   ```bash
   # From Stripe dashboard
   # Go to: Developers → Webhooks → Select endpoint
   # Click "Send test webhook"
   # Select event type
   # Click "Send test webhook"
   ```

### Step-by-Step: Production Setup

1. **Activate Live Mode:**
   - Go to: https://dashboard.stripe.com/settings/account
   - Complete business verification
   - Add bank account for payouts
   - Enable live mode

2. **Get Live API Keys:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Toggle to "Live mode"
   - Copy:
     - **Live Publishable key**: `pk_live_xxxxx`
     - **Live Secret key**: `sk_live_xxxxx`

3. **Create Live Webhooks:**
   - Go to: https://dashboard.stripe.com/webhooks (Live mode)
   - Add endpoint: `https://yourapp.com/api/webhooks/stripe`
   - Copy signing secret: `whsec_xxxxx`

4. **Add to Production Environment:**

   **Vercel:**
   ```bash
   # Settings → Environment Variables → Production
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

   **Railway:**
   ```bash
   # Project → Variables
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

5. **Test Live Payment Flow:**
   - Use real card (will be charged!)
   - Or use Stripe test mode in production (if needed)
   - Monitor: https://dashboard.stripe.com/payments

## Security Best Practices

### ✅ Do's

- ✅ Always use HTTPS for payment forms
- ✅ Use Stripe.js/Elements for card collection (PCI compliance)
- ✅ Store only Stripe customer/payment IDs (never card details)
- ✅ Use webhook secrets to verify webhooks
- ✅ Implement idempotency for payments
- ✅ Use raw request body for webhook verification
- ✅ Keep secret keys in `.env.local` (git-ignored)
- ✅ Use test mode for development
- ✅ Set up fraud detection (Stripe Radar)
- ✅ Implement 3D Secure (SCA compliance)
- ✅ Log all payment events
- ✅ Use restricted keys when possible

### ❌ Don'ts

- ❌ **NEVER** store raw card numbers
- ❌ **NEVER** expose secret keys in frontend
- ❌ **NEVER** commit API keys to git
- ❌ Don't parse request body before webhook verification
- ❌ Don't use live keys in test environment
- ❌ Don't skip webhook signature verification
- ❌ Don't trust client-side payment data
- ❌ Don't create charges without authentication
- ❌ Don't ignore failed webhook events
- ❌ Don't use same keys across all environments
- ❌ Don't hardcode amount/currency

## Quick Reference

### API Key Prefix Guide

| Prefix | Type | Environment | Usage | Can Expose? |
|--------|------|-------------|-------|-------------|
| `pk_test_` | Publishable | Test | Frontend (dev/staging) | ✅ Yes |
| `pk_live_` | Publishable | Live | Frontend (production) | ✅ Yes |
| `sk_test_` | Secret | Test | Backend (dev/staging) | ❌ No |
| `sk_live_` | Secret | Live | Backend (production) | ❌ No |
| `rk_test_` | Restricted | Test | Limited backend | ❌ No |
| `rk_live_` | Restricted | Live | Limited backend | ❌ No |
| `whsec_` | Webhook Secret | Both | Webhook verification | ❌ No |

### Payment Flow Overview

```
1. Frontend: Collect card with Stripe Elements
   ↓ (uses publishable key)
2. Frontend: Get client secret from backend
   ↓ (POST to /api/create-payment-intent)
3. Backend: Create PaymentIntent
   ↓ (uses secret key)
4. Backend: Return client secret
   ↓
5. Frontend: Confirm payment with Stripe.js
   ↓ (handles 3D Secure if needed)
6. Stripe: Process payment
   ↓
7. Stripe: Send webhook to backend
   ↓
8. Backend: Verify webhook signature
   ↓ (uses webhook secret)
9. Backend: Update database, send confirmation
```

### Common Stripe API Calls

```javascript
// Create customer
const customer = await stripe.customers.create({
  email: 'customer@example.com',
  name: 'John Doe'
})

// Create payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000,  // $20.00
  currency: 'usd',
  customer: customer.id,
  metadata: { order_id: '12345' }
})

// Create subscription
const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: 'price_xxxxx' }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent']
})

// Create refund
const refund = await stripe.refunds.create({
  payment_intent: 'pi_xxxxx',
  amount: 1000  // Partial refund $10.00
})

// Retrieve charge
const charge = await stripe.charges.retrieve('ch_xxxxx')

// List customers
const customers = await stripe.customers.list({
  limit: 100
})
```

### Useful Stripe CLI Commands

```bash
# Authentication
stripe login                    # Login to Stripe
stripe logout                   # Logout

# Webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created

# Resources
stripe customers list           # List customers
stripe charges list --limit 10  # List recent charges
stripe subscriptions list       # List subscriptions

# Testing
stripe samples list             # List sample integrations
stripe samples create [name]    # Create sample project

# Logs
stripe logs tail                # Stream API logs
stripe logs tail --filter-account acct_xxx  # Filter by account
```

## Troubleshooting Checklist

When encountering Stripe issues:

- [ ] Verify using correct mode (test vs live)
- [ ] Check API key prefix matches environment (pk_test_ vs pk_live_)
- [ ] Ensure secret key is only used server-side
- [ ] Confirm webhook secret matches environment
- [ ] Use raw body for webhook verification (don't parse first)
- [ ] Test with proper test cards (4242 4242 4242 4242)
- [ ] Handle 3D Secure authentication in frontend
- [ ] Check Stripe dashboard logs for errors
- [ ] Verify webhook endpoint is publicly accessible
- [ ] Test webhooks locally with Stripe CLI
- [ ] Ensure HTTPS for production webhooks
- [ ] Check rate limits if seeing errors

## Related Documentation

- [Railway Auth Guide](./RAILWAY-AUTH-README.md)
- [Vercel Auth Guide](./VERCEL-AUTH-README.md)
- [Supabase Auth Guide](./SUPABASE-AUTH-README.md)
- [Stripe Official Docs](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

## Summary

**The Golden Rules:**

1. **Use Publishable Keys for Frontend** - Safe to expose, limited operations
2. **Use Secret Keys for Backend ONLY** - Full access, keep secret
3. **Always Verify Webhook Signatures** - Use webhook secrets, raw body
4. **Never Store Card Details** - Use Stripe.js/Elements, store IDs only
5. **Test Mode for Development** - Use test keys and test cards
6. **Live Mode for Production** - Requires activation and business verification

**Quick Setup:**
```bash
# 1. Get keys from: https://dashboard.stripe.com/apikeys
# 2. Add to .env.local (Test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# 3. Install SDK
npm install @stripe/stripe-js stripe

# 4. Test with card: 4242 4242 4242 4242
```

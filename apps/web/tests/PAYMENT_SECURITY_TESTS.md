# Payment Security Test Suite

Comprehensive automated testing for payment system security audit fixes (2026-02-07).

## Overview

This test suite validates all 5 critical/high priority fixes from the payments system security audit:

1. **Input Validation** - Prevents malicious amount/duration inputs
2. **Rate Limiting** - Protects payment endpoints from abuse
3. **Row Level Security** - Enforces data access controls
4. **Unified Payment Flow** - Ensures consistent commission handling
5. **DLQ Error Handling** - Prevents webhook event loss

## Test Files

### 1. Input Validation Tests
**File:** `tests/api/bookings-validation.test.ts`

**What it tests:**
- Rejects negative amounts
- Rejects zero amounts
- Rejects NaN/non-numeric amounts
- Rejects amounts exceeding £10,000
- Rejects negative durations
- Rejects durations exceeding 24 hours
- Accepts valid inputs

**Run:**
```bash
npm test -- tests/api/bookings-validation.test.ts
```

### 2. Rate Limiting Tests
**File:** `tests/api/payment-rate-limiting.test.ts`

**What it tests:**
- Booking creation: 20 requests/hour limit
- Checkout creation: 30 requests/hour limit
- Refund requests: 10 requests/hour limit
- Rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset)
- 429 status code on limit exceeded

**Run:**
```bash
npm test -- tests/api/payment-rate-limiting.test.ts
```

### 3. RLS Policy Tests
**File:** `tests/database/bookings-rls.test.ts`

**What it tests:**
- SELECT: Users can only view own bookings
- INSERT: Clients can create bookings (as client_id)
- UPDATE: Both parties can update their bookings
- DELETE: Prevented (soft delete only)
- Admin access to all bookings
- Unauthorized access is blocked

**Run:**
```bash
npm test -- tests/database/bookings-rls.test.ts
```

### 4. Unified Payment Flow Tests
**File:** `tests/api/unified-payment-flow.test.ts`

**What it tests:**
- Legacy flow includes transfer_data
- New flow includes transfer_data
- Both flows use 10% commission (application_fee_amount)
- Commission calculation consistency
- Stripe Connect destination matches tutor

**Run:**
```bash
npm test -- tests/api/unified-payment-flow.test.ts
```

### 5. Webhook DLQ Tests
**File:** `tests/api/webhook-dlq.test.ts`

**What it tests:**
- Failed webhooks logged to DLQ (returns 200)
- DLQ insert failure returns 500 (not 200)
- Error response structure
- Stripe retry trigger on 500 response

**Run:**
```bash
npm test -- tests/api/webhook-dlq.test.ts
```

## Running Tests Locally

### Prerequisites

1. **Database:**
   ```bash
   # Apply RLS migration
   psql $DATABASE_URL -f tools/database/migrations/247_add_bookings_rls_policies.sql
   ```

2. **Redis:**
   ```bash
   # Start Redis for rate limiting tests
   docker run -d -p 6379:6379 redis:7-alpine
   ```

3. **Environment Variables:**
   ```bash
   # .env.test
   NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_test_service_key
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_test_...
   UPSTASH_REDIS_REST_URL=redis://localhost:6379
   UPSTASH_REDIS_REST_TOKEN=test-token
   ```

### Run All Payment Security Tests

```bash
npm run test:payment-security
```

### Run Individual Test Suites

```bash
# Input validation only
npm test -- tests/api/bookings-validation.test.ts

# Rate limiting only
npm test -- tests/api/payment-rate-limiting.test.ts

# RLS policies only
npm test -- tests/database/bookings-rls.test.ts

# Unified payment flow only
npm test -- tests/api/unified-payment-flow.test.ts

# Webhook DLQ only
npm test -- tests/api/webhook-dlq.test.ts
```

### Run with Coverage

```bash
npm test -- --coverage --coveragePathIgnorePatterns=node_modules
```

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/payment-security-tests.yml`

**Triggers:**
- Every push to `main` or `develop`
- Every pull request to `main` or `develop`
- Changes to payment-related files

**What it does:**
1. Sets up test environment (PostgreSQL, Redis)
2. Runs all 5 test suites
3. Generates coverage report
4. Posts results to PR as comment
5. Fails CI if tests fail or coverage < 80%
6. Sends Slack notification on failure

**View Results:**
- GitHub Actions tab → Payment Security Tests workflow
- PR comments show test results and coverage

## Test Coverage Requirements

**Minimum Coverage:** 80%

**Critical Paths (100% coverage required):**
- Input validation logic
- Rate limiting checks
- RLS policy queries
- transfer_data payment intent creation
- DLQ error handling

## Troubleshooting

### Tests Failing Locally

1. **Database connection errors:**
   ```bash
   # Check Supabase is accessible
   curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/
   ```

2. **Redis connection errors:**
   ```bash
   # Check Redis is running
   redis-cli ping
   ```

3. **Stripe API errors:**
   ```bash
   # Verify Stripe key
   stripe verify
   ```

### CI/CD Failures

1. **Migration not applied:**
   - Check migration 247 is in the migrations folder
   - Verify migration runs in CI workflow

2. **Rate limit tests flaky:**
   - Redis might not be ready
   - Increase wait-on timeout in workflow

3. **Coverage below threshold:**
   - Add tests for uncovered code paths
   - Check coverage report: `coverage/lcov-report/index.html`

## Maintenance

### Adding New Tests

1. Create test file in appropriate directory:
   - `tests/api/` for API endpoint tests
   - `tests/database/` for database/RLS tests

2. Follow naming convention:
   - `{feature}-{aspect}.test.ts`
   - Example: `bookings-validation.test.ts`

3. Update workflow if needed:
   - Add new test file to CI/CD workflow
   - Update coverage thresholds

### Updating Existing Tests

When payment logic changes:
1. Update corresponding test file
2. Ensure coverage remains above threshold
3. Update this documentation

## Security Considerations

**Test Environment:**
- Use separate test Supabase project
- Use Stripe test mode keys only
- Never use production credentials

**Test Data:**
- All test users are automatically cleaned up
- Test bookings are deleted after tests
- Redis is flushed between test runs

**Sensitive Data:**
- No real credit card numbers
- No real customer data
- Stripe test cards only: `4242 4242 4242 4242`

## Support

**Issues with tests:**
- Check test logs in GitHub Actions
- Run locally with `--verbose` flag
- Contact: tech-team@tutorwise.com

**CI/CD pipeline issues:**
- Check workflow file syntax
- Verify secrets are set in GitHub
- Review workflow run logs

---

**Last Updated:** 2026-02-07
**Audit Reference:** Payment System Security Audit (2026-02-07)
**Test Coverage:** 5 critical/high priority fixes

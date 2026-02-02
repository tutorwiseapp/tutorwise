# Tutorwise Test Strategy Document

**Version:** 1.0
**Date:** 2026-02-02
**Application:** Tutorwise Marketplace Platform
**Testing Framework:** Playwright (E2E), Jest (Unit/Integration), MSW (API Mocking)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Test Scope](#test-scope)
3. [Test Objectives](#test-objectives)
4. [Test Types & Levels](#test-types--levels)
5. [Test Environment](#test-environment)
6. [Test Data Strategy](#test-data-strategy)
7. [Critical User Journeys](#critical-user-journeys)
8. [Risk Assessment](#risk-assessment)
9. [Test Execution Strategy](#test-execution-strategy)
10. [Defect Management](#defect-management)
11. [Success Criteria](#success-criteria)

---

## Executive Summary

This document outlines the comprehensive testing strategy for the Tutorwise platform, a multi-role marketplace connecting clients with tutors through bookings, listings, and payment processing. The platform handles financial transactions via Stripe, complex referral attribution, role-based access control, and multi-faceted user journeys.

Given the financial nature of the application, testing will prioritize:
- **Payment integrity** (100% accuracy)
- **Data consistency** (atomic transactions)
- **Security** (authorization, authentication, PII protection)
- **User experience** across all roles (Client, Tutor, Agent, Admin)

---

## Test Scope

### In Scope

#### Core Features
1. **Authentication & Authorization**
   - Email/password signup and login
   - Google OAuth integration
   - Password reset flows
   - Session management
   - Global logout (all devices)
   - Role-based access control

2. **User Onboarding**
   - Client onboarding (subjects, preferences)
   - Tutor onboarding (verification, qualifications)
   - Agent onboarding (agency details)
   - Progress saving and resumption
   - Profile completion tracking

3. **Listing Management**
   - Create listing (all types: session, course, job)
   - Edit/update listings
   - Publish/unpublish/archive workflows
   - Availability configuration (recurring & one-time)
   - Pricing packages
   - Media upload (images, video)
   - Template listings

4. **Marketplace & Search**
   - Traditional filter-based search
   - Semantic AI-powered search
   - Filtering (subjects, levels, location, price)
   - Sorting options
   - Pagination
   - Listing detail views
   - View count tracking

5. **Booking System**
   - Direct booking from listings
   - Profile booking (no listing)
   - Availability validation
   - Double-booking prevention
   - Booking status transitions (Pending → Confirmed → Completed)
   - Cancellation flows
   - Agent-referred bookings
   - Snapshot field accuracy

6. **Payment Processing**
   - Stripe checkout session creation
   - Payment success webhook handling
   - Commission distribution (80/10/10 split)
   - Transaction creation (all T-TYPEs)
   - Clearing period tracking
   - Withdrawal/payout initiation
   - Stripe Connect account management
   - Failed payment handling
   - Refund processing
   - Webhook DLQ (dead-letter queue)

7. **Referral System**
   - Referral code generation
   - Lifetime attribution (`referred_by_profile_id`)
   - Agent commission calculation
   - Multi-level referral chains
   - Wiselist referrer tracking

8. **Profile Management**
   - View/edit profile
   - Identity verification
   - DBS certificate upload
   - Avatar/cover photo upload
   - CaaS score calculation
   - Bio video upload
   - Role switching

9. **Wiselists (Save & Share)**
   - Create wiselist
   - Add/remove items
   - Collaborator management
   - Visibility settings (private/public)
   - Referrer attribution from wiselist shares

10. **Free Help Now (v5.9)**
    - Tutor availability toggle
    - Free session booking
    - Trial session management

11. **Reviews & Ratings**
    - Submit review after session
    - Rating calculation
    - Display on profiles/listings
    - Pending review notifications

12. **Dashboard & Analytics**
    - Earnings trends
    - Booking heatmaps
    - Profile views
    - KPI summaries
    - Referral sources

#### Integration Points
- Supabase (database, auth, storage)
- Stripe (payments, Connect, webhooks)
- Vercel Blob (file uploads)
- Resend/Nodemailer (emails)
- Google AI (semantic search)
- Ably (chat/messaging)
- Neo4j (social graph)

### Out of Scope
- Load/stress testing (future phase)
- Performance benchmarking (separate QA cycle)
- Accessibility (a11y) audits (separate initiative)
- Mobile app testing (web only)
- Internationalization (i18n) - UK market focus

---

## Test Objectives

### Primary Objectives
1. **Ensure payment accuracy**: Zero tolerance for incorrect commission splits or lost funds
2. **Validate booking integrity**: Prevent double-bookings, ensure atomic transactions
3. **Verify security**: RLS policies, role-based access, secure API endpoints
4. **Confirm user experience**: Smooth onboarding, intuitive workflows, error handling
5. **Test edge cases**: Concurrent operations, payment failures, webhook retries

### Secondary Objectives
1. Validate semantic search accuracy
2. Test referral attribution chains
3. Ensure email delivery and content accuracy
4. Verify real-time features (chat, presence)
5. Test organization/enterprise features

---

## Test Types & Levels

### 1. Unit Tests (Jest)
**Coverage Target:** 80% of business logic

**Focus Areas:**
- Utility functions (date formatting, currency conversion)
- React components (isolated rendering)
- API route handlers (mocked dependencies)
- Data transformations and calculations
- Form validation logic

**Example Tests:**
- Commission split calculator
- Booking conflict detector
- Search filter logic
- Profile completion percentage

### 2. Integration Tests (Jest + MSW)
**Coverage Target:** All critical API endpoints

**Focus Areas:**
- API routes with database interactions
- Webhook processing (mocked Stripe events)
- Email sending (mocked transport)
- File upload workflows
- Context providers with multiple components

**Example Tests:**
- Create booking → update transaction → send email
- Stripe webhook → handle payment → update booking
- Profile creation on signup
- Referral attribution on booking

### 3. End-to-End Tests (Playwright)
**Coverage Target:** All critical user journeys

**Focus Areas:**
- Complete user workflows (signup → onboarding → booking → payment)
- Cross-page navigation
- Form submissions with validation
- Real API interactions (staging environment)
- Multi-role scenarios

**Example Tests:**
- Client books tutor → payment → confirmation email
- Tutor creates listing → client searches → views listing
- Agent refers client → client books → commission split

### 4. Visual Regression Tests (Percy + Storybook)
**Coverage Target:** All UI components

**Focus Areas:**
- Component library (buttons, forms, cards)
- Responsive layouts (mobile, tablet, desktop)
- Theme consistency
- Accessibility indicators

### 5. Security Tests
**Manual + Automated**

**Focus Areas:**
- Authentication bypass attempts
- Authorization escalation
- SQL injection (RLS policies)
- XSS vulnerabilities
- CSRF protection
- API rate limiting
- PII exposure in logs/errors

### 6. API Contract Tests
**Pact or similar**

**Focus Areas:**
- Request/response schemas
- Error response formats
- Pagination consistency
- Backward compatibility

---

## Test Environment

### Environments

| Environment | Purpose | Database | Stripe Mode | URL |
|-------------|---------|----------|-------------|-----|
| **Local** | Development testing | Local Supabase | Test | localhost:3000 |
| **Staging** | Pre-production E2E | Staging Supabase | Test | staging.tutorwise.app |
| **Production** | Smoke tests only | Production Supabase | Live | tutorwise.app |

### Test Accounts

Create dedicated test accounts for each role:

```javascript
const TEST_ACCOUNTS = {
  client: {
    email: 'test-client@tutorwise.app',
    password: process.env.TEST_CLIENT_PASSWORD,
    role: 'client'
  },
  tutor: {
    email: 'test-tutor@tutorwise.app',
    password: process.env.TEST_TUTOR_PASSWORD,
    role: 'tutor',
    stripeConnected: true
  },
  agent: {
    email: 'test-agent@tutorwise.app',
    password: process.env.TEST_AGENT_PASSWORD,
    role: 'agent'
  },
  admin: {
    email: 'test-admin@tutorwise.app',
    password: process.env.TEST_ADMIN_PASSWORD,
    role: 'admin'
  },
  tutorwiseapp: {
    email: 'tutorwiseapp@tutorwise.app',
    password: process.env.TUTORWISEAPP_PASSWORD,
    roles: ['client', 'tutor', 'agent'], // Multi-role testing
    note: 'Primary test account'
  }
}
```

### Test Data Management

**Strategy:** Seed → Test → Cleanup

1. **Seed Phase**: Create test data before test suite
   - Test users with verified profiles
   - Sample listings (published & draft)
   - Historical bookings
   - Transaction records

2. **Test Phase**: Isolated test data
   - Unique identifiers per test (timestamps, UUIDs)
   - No shared state between tests
   - Parallel execution safe

3. **Cleanup Phase**: Remove test artifacts
   - Delete test bookings
   - Archive test listings
   - Clear test transactions (staging only)

**Database Reset Script:**
```sql
-- Run in staging only
DELETE FROM bookings WHERE client_id IN (SELECT id FROM profiles WHERE email LIKE '%@tutorwise.app');
DELETE FROM listings WHERE profile_id IN (SELECT id FROM profiles WHERE email LIKE '%@tutorwise.app');
DELETE FROM transactions WHERE profile_id IN (SELECT id FROM profiles WHERE email LIKE '%@tutorwise.app');
```

---

## Test Data Strategy

### Synthetic Data Generation

Use factory functions for consistent test data:

```typescript
// Test data factories
export const createTestListing = (overrides?: Partial<Listing>) => ({
  title: `Test Listing ${Date.now()}`,
  description: 'Comprehensive GCSE Mathematics tutoring',
  subjects: ['Mathematics'],
  levels: ['GCSE'],
  hourly_rate: 35,
  delivery_mode: ['online'],
  status: 'published',
  availability: [{
    type: 'recurring',
    days: ['Monday', 'Wednesday'],
    startTime: '14:00',
    endTime: '18:00'
  }],
  ...overrides
});

export const createTestBooking = (overrides?: Partial<Booking>) => ({
  service_name: 'GCSE Mathematics',
  session_start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  session_duration: 60,
  amount: 35,
  status: 'Pending',
  payment_status: 'Pending',
  ...overrides
});
```

### Boundary Values

Test with edge case data:
- **Dates**: Today, yesterday, far future (2050), past (2020)
- **Amounts**: £0, £0.01, £999.99, £10,000
- **Durations**: 15 min, 30 min, 60 min, 120 min, 1440 min (24 hours)
- **Strings**: Empty, 1 char, max length, Unicode, special characters
- **Arrays**: Empty [], 1 item, 100 items

### Test Stripe Data

Use Stripe test cards:
```javascript
const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  expiredCard: '4000000000000069',
  incorrectCVC: '4000000000000127',
  processingError: '4000000000000119',
  requiresAuthentication: '4000002500003155' // 3D Secure
};
```

---

## Critical User Journeys

### Journey 1: Client Books Tutor (Happy Path)

**Actors:** New Client, Existing Tutor
**Precondition:** Tutor has published listing with availability
**Goal:** Complete booking and payment

**Steps:**
1. Client visits homepage → Click "Find a Tutor"
2. Sign up with email/password
3. Verify email (check inbox)
4. Complete client onboarding (3 steps)
5. Search for "GCSE Mathematics"
6. Filter by "Online" and "£20-£50/hour"
7. Click listing → View details
8. Select available time slot
9. Click "Book Now"
10. Redirect to Stripe checkout
11. Enter test card `4242424242424242`
12. Complete payment
13. Redirect to confirmation page
14. Receive booking confirmation email

**Expected Results:**
- Booking created with `status: 'Pending'`
- Payment webhook triggers → Booking updated to `status: 'Confirmed'`
- Transactions created:
  - T-TYPE-1: Client payment (£35)
  - T-TYPE-2: Tutor payout (£31.50 = 90%)
  - T-TYPE-5: Platform fee (£3.50 = 10%)
- Email sent to client (booking confirmation)
- Email sent to tutor (new booking notification)
- Booking appears in client dashboard
- Booking appears in tutor dashboard

**Test Data:**
- Client: `test-client-journey1@tutorwise.app`
- Tutor: `test-tutor@tutorwise.app`
- Listing ID: (dynamically created)
- Booking amount: £35

---

### Journey 2: Tutor Creates Listing

**Actors:** New Tutor
**Precondition:** None
**Goal:** Published listing visible in marketplace

**Steps:**
1. Sign up as tutor
2. Complete tutor onboarding:
   - Personal info
   - Professional details (qualifications)
   - Identity verification (upload doc)
   - DBS certificate (upload)
   - Set availability
3. Navigate to "My Listings"
4. Click "Create New Listing"
5. Fill listing form:
   - Title: "A-Level Physics Tutoring"
   - Subjects: Physics
   - Levels: A-Level
   - Hourly rate: £45
   - Delivery mode: Online
   - Availability: Monday-Friday 16:00-20:00
6. Upload profile photo
7. Click "Publish"
8. Verify listing appears in marketplace

**Expected Results:**
- Listing created with `status: 'published'`
- Listing searchable in marketplace
- Availability correctly configured
- Tutor profile shows listing count
- Listing detail page accessible

---

### Journey 3: Agent Referral Commission

**Actors:** Agent, Client (referred), Tutor
**Precondition:** Agent has referral code, Tutor has listing
**Goal:** Agent receives 10% commission on booking

**Steps:**
1. Agent generates referral link with code
2. Client signs up via referral link
3. Client profile created with `referred_by_profile_id: agent_id`
4. Client completes onboarding
5. Client books tutor (£50 booking)
6. Client completes Stripe payment
7. Webhook processes payment

**Expected Results:**
- Booking created with `agent_id: agent_profile_id`
- Transactions created:
  - T-TYPE-1: Client payment (£50)
  - T-TYPE-2: Tutor payout (£40 = 80%)
  - T-TYPE-3: Agent commission (£5 = 10%)
  - T-TYPE-5: Platform fee (£5 = 10%)
- Agent sees commission in financials dashboard
- Agent can withdraw after clearing period

---

### Journey 4: Payment Failure & Retry

**Actors:** Client, Tutor
**Precondition:** Booking created
**Goal:** Handle declined card gracefully

**Steps:**
1. Client creates booking
2. Redirect to Stripe checkout
3. Enter declined card `4000000000000002`
4. Payment fails
5. Client sees error message
6. Client retries with valid card
7. Payment succeeds

**Expected Results:**
- Initial booking remains `status: 'Pending'`
- Failed payment logged but no transaction created
- Client can retry without creating duplicate booking
- Success webhook updates booking to `Confirmed`
- No duplicate transactions

---

### Journey 5: Tutor Withdrawal

**Actors:** Tutor
**Precondition:** Tutor has cleared funds (£100 available)
**Goal:** Withdraw earnings to bank account

**Steps:**
1. Tutor logs in
2. Navigate to Financials → "Available Balance: £100"
3. Click "Withdraw Funds"
4. Enter amount: £100
5. Confirm withdrawal
6. Stripe payout created

**Expected Results:**
- Transaction created: T-TYPE-6 (Withdrawal, £100)
- Transaction status: `pending` → `clearing` → `paid_out`
- Stripe payout event triggers webhook
- Transaction updated with `stripe_payout_id`
- Email sent confirming withdrawal
- Available balance reduced to £0

---

### Journey 6: Concurrent Booking Prevention

**Actors:** 2 Clients, 1 Tutor
**Precondition:** Tutor has 1 available slot (Monday 14:00)
**Goal:** Only 1 booking succeeds

**Steps:**
1. Client A selects Monday 14:00 → Creates booking
2. Client B selects Monday 14:00 simultaneously
3. Database checks availability
4. First booking succeeds
5. Second booking rejected with error

**Expected Results:**
- Client A booking: `status: 'Pending'`
- Client B booking: Error "Time slot no longer available"
- No double-booking in database
- Tutor availability updated after first booking
- Client B sees updated availability (slot removed)

---

### Journey 7: Multi-Role User Switching

**Actors:** User with Client + Tutor roles
**Precondition:** User has completed onboarding for both roles
**Goal:** Switch between roles seamlessly

**Steps:**
1. User logs in (default role: Client)
2. Dashboard shows client view (bookings made)
3. Click role switcher → Select "Tutor"
4. Dashboard updates to tutor view (bookings received)
5. Navigate to "My Listings"
6. Create new listing as tutor
7. Switch back to Client role
8. Listing not visible in "My Listings" (correct)

**Expected Results:**
- `active_role` updated in database on switch
- API responses filtered by `active_role`
- Dashboard content changes based on role
- Permissions enforced per role
- Navigation menu adapts to role

---

## Risk Assessment

### High Risk Areas

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|---------------------|
| **Payment processing failure** | Critical | Medium | Idempotency checks, DLQ for failed webhooks, comprehensive webhook tests |
| **Incorrect commission split** | Critical | Low | Unit tests for calculation, integration tests for RPC, audit logs |
| **Double-booking** | High | Medium | Database constraints, atomic transactions, concurrency tests |
| **Security breach (unauthorized access)** | Critical | Low | RLS policies, role-based tests, penetration testing |
| **Data loss (booking/payment)** | Critical | Low | Database backups, transaction atomicity, rollback tests |
| **Stripe webhook timeout** | High | Medium | Async processing, DLQ, retry mechanism, timeout tests |
| **Referral attribution error** | High | Low | Integration tests, audit trail, manual verification |
| **Email delivery failure** | Medium | Medium | Async queue, retry logic, monitoring |
| **File upload failure (verification docs)** | Medium | Medium | Error handling, retry UI, Vercel Blob status checks |
| **Search inaccuracy (semantic)** | Medium | Medium | Manual testing, feedback loop, embedding quality checks |

### Testing Priorities (MoSCoW)

**Must Have:**
- Payment processing (all scenarios)
- Booking creation and status updates
- Authentication and authorization
- Commission calculation and distribution
- Webhook handling (success, failure, retry)

**Should Have:**
- Onboarding flows (all roles)
- Listing CRUD operations
- Marketplace search (filters, pagination)
- Profile management
- Referral attribution

**Could Have:**
- Wiselists
- Free Help Now
- Reviews and ratings
- Dashboard analytics
- Email content validation

**Won't Have (This Phase):**
- Load testing
- Mobile responsiveness (manual only)
- Accessibility audit
- Internationalization

---

## Test Execution Strategy

### Test Execution Phases

#### Phase 1: Foundation (Week 1)
**Focus:** Core infrastructure and critical paths

- Set up test environments (staging, local)
- Create test accounts for all roles
- Configure Stripe test mode
- Seed test data (listings, profiles)
- Run existing tests (baseline)
- Fix critical test failures

**Deliverables:**
- Test environment documentation
- Test account credentials
- Baseline test report

#### Phase 2: Authentication & Onboarding (Week 2)
**Focus:** User entry points

- Test signup flows (email, OAuth)
- Test login flows (success, failure)
- Test password reset
- Test client onboarding (all steps)
- Test tutor onboarding (all steps)
- Test agent onboarding
- Test profile completion

**Deliverables:**
- 50+ test cases for auth/onboarding
- Playwright E2E tests
- Jest integration tests

#### Phase 3: Listings & Search (Week 2-3)
**Focus:** Marketplace functionality

- Test listing creation (all types)
- Test listing editing
- Test publish/unpublish workflows
- Test availability configuration
- Test marketplace search (filters, sorting)
- Test semantic search
- Test listing detail views

**Deliverables:**
- 40+ test cases for listings/search
- E2E marketplace journey tests
- Search accuracy validation

#### Phase 4: Bookings & Payments (Week 3-4)
**Focus:** Transaction integrity (CRITICAL)

- Test booking creation (all paths)
- Test availability validation
- Test concurrent booking prevention
- Test Stripe checkout integration
- Test payment success webhook
- Test payment failure scenarios
- Test commission calculation
- Test transaction creation
- Test clearing periods
- Test withdrawal flows
- Test refund processing
- Test webhook DLQ

**Deliverables:**
- 60+ test cases for bookings/payments
- Mock webhook tests
- Real Stripe test mode E2E tests
- Payment accuracy audit

#### Phase 5: Referrals & Advanced Features (Week 4)
**Focus:** Complex business logic

- Test referral code generation
- Test referral attribution
- Test agent commission
- Test multi-level referrals
- Test Wiselist creation
- Test Wiselist referrer tracking
- Test Free Help Now
- Test reviews and ratings

**Deliverables:**
- 30+ test cases for referrals/advanced
- Referral chain validation
- Commission audit report

#### Phase 6: Edge Cases & Security (Week 5)
**Focus:** Robustness and security

- Test boundary values
- Test error handling
- Test rate limiting
- Test authorization (role-based)
- Test RLS policies
- Test XSS/SQL injection attempts
- Test concurrent operations
- Test data validation

**Deliverables:**
- 40+ edge case tests
- Security test report
- Penetration test results

#### Phase 7: Regression & UAT (Week 6)
**Focus:** Full system validation

- Run full regression suite
- User acceptance testing (stakeholders)
- Performance smoke tests
- Visual regression checks
- Email delivery validation
- Cross-browser testing (Chrome, Firefox, Safari)

**Deliverables:**
- Regression test report
- UAT sign-off
- Go/No-Go recommendation

---

### Test Automation Strategy

**Automation Pyramid:**
```
        /\
       /E2E\ (20% - Critical paths, ~50 tests)
      /------\
     /  API  \ (30% - Endpoints, ~100 tests)
    /--------\
   /   UNIT   \ (50% - Logic, ~200 tests)
  /------------\
```

**CI/CD Integration:**
- Unit tests run on every commit (< 2 min)
- Integration tests run on PR (< 5 min)
- E2E tests run on merge to main (< 15 min)
- Full regression suite nightly (< 30 min)

**Parallel Execution:**
- Playwright tests: 4 workers
- Jest tests: Max workers (CPU cores)

**Flakiness Management:**
- Retry failed tests (max 2 retries)
- Screenshot on failure
- Video recording for E2E
- Trace logs for debugging

---

### Manual Testing

**When to Use Manual Testing:**
1. Exploratory testing (new features)
2. Usability testing (user experience)
3. Visual design validation
4. Cross-browser compatibility (spot checks)
5. Email content review
6. Error message clarity
7. Accessibility checks

**Manual Test Checklist:**
- [ ] Email formatting (HTML rendering)
- [ ] PDF generation (invoices, receipts)
- [ ] Avatar/image upload (all formats)
- [ ] Mobile responsive layouts
- [ ] Error message user-friendliness
- [ ] Loading states and spinners
- [ ] Toast notifications
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

---

## Defect Management

### Bug Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **Critical** | Blocks core functionality, affects payments | Immediate | Payment not processed, data loss, security breach |
| **High** | Major feature broken, workaround exists | 24 hours | Booking creation fails, search returns no results |
| **Medium** | Minor feature broken, cosmetic issue | 72 hours | Avatar not uploading, email formatting issue |
| **Low** | Enhancement, typo, minor UI issue | Next sprint | Button alignment, text copy improvement |

### Bug Report Template

```markdown
## Bug Report

**Title:** [Concise description]

**Severity:** [Critical/High/Medium/Low]

**Environment:** [Local/Staging/Production]

**User Role:** [Client/Tutor/Agent/Admin]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Screenshots/Video:**
[Attach evidence]

**Console Logs:**
[Paste errors]

**Test Account Used:**
- Email: test-client@tutorwise.app
- Booking ID: abc-123

**Additional Context:**
[Any other relevant info]
```

### Defect Workflow

```
New → Assigned → In Progress → Code Review → Testing → Verified → Closed
                                           ↓
                                      Reopened (if regression)
```

---

## Success Criteria

### Test Coverage Metrics

**Quantitative Goals:**
- Unit test coverage: ≥80% of business logic
- Integration test coverage: 100% of API routes
- E2E test coverage: 100% of critical user journeys
- Visual regression: 100% of UI components

### Quality Gates

**Definition of Done (DoD) for Testing:**
- [ ] All test cases executed
- [ ] 0 Critical/High severity bugs open
- [ ] Test coverage targets met
- [ ] Regression suite passing (>95%)
- [ ] Performance benchmarks met (page load <3s)
- [ ] Security scan passed (no vulnerabilities)
- [ ] UAT signed off by stakeholders

### Key Performance Indicators (KPIs)

**Testing Efficiency:**
- Test execution time: <30 min for full suite
- Test flakiness rate: <2%
- Bug detection rate: >90% found in QA (not production)
- Automation coverage: >70% of tests automated

**Product Quality:**
- Production bug rate: <5 bugs/month
- Payment accuracy: 100% (zero tolerance)
- Booking success rate: >98%
- Search relevance: >85% user satisfaction

---

## Appendices

### Appendix A: Test Case Template

See separate document: `TEST_CASES.md`

### Appendix B: Test Data

See separate document: `TEST_DATA.md`

### Appendix C: Environment Setup

See separate document: `TEST_ENVIRONMENT_SETUP.md`

### Appendix D: Glossary

- **RLS:** Row-Level Security (Supabase database policy)
- **DLQ:** Dead-Letter Queue (failed webhook storage)
- **CaaS:** Credibility as a Service (tutor scoring)
- **T-TYPE-1 to T-TYPE-6:** Transaction types (payment, payout, commission, etc.)
- **Wiselist:** Save & share feature (collections of listings/profiles)
- **Agent:** Recruiter/referrer role earning commissions

---

**Document Owner:** QA Team
**Review Cycle:** Quarterly
**Last Updated:** 2026-02-02

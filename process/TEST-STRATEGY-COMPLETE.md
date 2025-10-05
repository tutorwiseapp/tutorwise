# Complete Test Strategy for TutorWise

**Version:** 1.0.0
**Date:** October 5, 2025
**Owner:** Engineering Team
**Review Cycle:** Quarterly

---

## Executive Summary

This document defines the **complete test strategy** for TutorWise, covering all levels of testing from unit tests to visual regression. All features must pass through these test phases before production deployment.

---

## Test Pyramid Strategy

```
         /\
        /VR\        Visual Regression (Percy)
       /____\
      /  E2E  \     End-to-End (Playwright)
     /________\
    /Integration\   Integration Tests
   /____________\
  /  Unit Tests  \  Unit + Component Tests
 /________________\
```

**Philosophy:** Many fast unit tests, fewer slow E2E tests, strategic visual tests

---

## 1. Unit Testing Strategy

### Backend Unit Tests (Python/pytest)

**Tool:** pytest + pytest-mock + pytest-asyncio
**Location:** `apps/api/tests/unit/`
**Coverage Target:** ≥ 80%

**What to Test:**
- ✅ API endpoint functions (success + error cases)
- ✅ Business logic functions
- ✅ Data validation
- ✅ Error handling
- ✅ Edge cases

**Mocking Strategy:**
- Mock Supabase client
- Mock Redis client
- Mock Neo4j driver
- Mock external APIs

**Run Command:**
```bash
cd apps/api
python3 -m pytest tests/unit/ -v --cov=app --cov-report=html
```

**CI/CD Integration:**
- Run on every commit
- Block PR if tests fail
- Generate coverage reports

### Frontend Unit Tests (React/Jest)

**Tool:** Jest + React Testing Library
**Location:** `apps/web/tests/unit/` or `__tests__/`
**Coverage Target:** ≥ 70%

**What to Test:**
- ✅ Component rendering
- ✅ User interactions (clicks, inputs)
- ✅ State management
- ✅ Utility functions
- ✅ API client functions (mocked)

**Testing Patterns:**
```typescript
// Example: TutorProfessionalInfoForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import TutorProfessionalInfoForm from './TutorProfessionalInfoForm';

describe('TutorProfessionalInfoForm', () => {
  it('renders all form sections', () => {
    render(<TutorProfessionalInfoForm />);
    expect(screen.getByText('Subjects')).toBeInTheDocument();
    expect(screen.getByText('Education Levels')).toBeInTheDocument();
  });

  it('enables save button when required fields filled', () => {
    render(<TutorProfessionalInfoForm />);
    const saveButton = screen.getByText('Save Template');
    expect(saveButton).toBeDisabled();

    // Fill required fields
    // ... simulate user input

    expect(saveButton).toBeEnabled();
  });
});
```

**Run Command:**
```bash
npm run test -- --coverage
```

---

## 2. Integration Testing Strategy

### Backend Integration Tests

**Tool:** pytest + actual database
**Location:** `apps/api/tests/integration/`
**Test Database:** Separate Supabase test project

**What to Test:**
- ✅ Complete API request/response cycle
- ✅ Database CRUD operations
- ✅ Authentication flow
- ✅ Data persistence
- ✅ Transaction handling

**Setup Requirements:**
```bash
# .env.test
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test_key
```

**Run Command:**
```bash
cd apps/api
ENV=test python3 -m pytest tests/integration/ -v
```

### Frontend Integration Tests

**What to Test:**
- ✅ API client integration (with mocked backend)
- ✅ Form submission flows
- ✅ Data fetching and caching
- ✅ Error handling

---

## 3. End-to-End Testing Strategy

**Tool:** Playwright
**Location:** `tests/e2e/`
**Config:** `tools/playwright/playwright.config.ts`

### Test Scope

**Critical User Journeys:**
1. Authentication flow (login/signup)
2. Onboarding flow (all roles)
3. Template editing (Account > Professional Info)
4. Listing creation
5. Search and discovery
6. Booking flow (future)

### Test Structure

```
tests/e2e/
├── auth/
│   ├── login.spec.ts
│   └── signup.spec.ts
├── onboarding/
│   ├── tutor-onboarding.spec.ts
│   ├── client-onboarding.spec.ts
│   └── agent-onboarding.spec.ts
├── account/
│   ├── professional-info.spec.ts  ← New tests
│   └── personal-info.spec.ts
└── helpers/
    ├── auth-helper.ts
    └── test-data.ts
```

### Browser Coverage

- ✅ Desktop Chrome
- ✅ Desktop Firefox
- ✅ Desktop Safari (Webkit)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

### Run Commands

```bash
# All E2E tests
npx playwright test

# Specific test file
npx playwright test tests/e2e/account/professional-info.spec.ts

# Headed mode (see browser)
npx playwright test --headed

# UI mode (interactive)
npx playwright test --ui

# Generate report
npx playwright show-report
```

---

## 4. Visual Regression Testing Strategy

**Tool:** Playwright + Percy (or Playwright built-in screenshots)
**Purpose:** Detect unintended visual changes

### Visual Test Coverage

**Pages to Snapshot:**
1. Homepage (logged out)
2. Login/Signup pages
3. Dashboard (each role)
4. Account Settings pages:
   - Personal Info
   - **Professional Info** ← New
   - Settings
5. Onboarding steps (all roles)
6. Profile pages (public)

### Viewports to Test

- Desktop: 1920x1080
- Tablet: 768x1024
- Mobile: 375x667

### Implementation Options

#### Option A: Percy (Cloud-based)

```typescript
// Install Percy
npm install --save-dev @percy/playwright

// percy.spec.ts
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('Account Professional Info visual test', async ({ page }) => {
  await page.goto('/account/professional-info');
  await percySnapshot(page, 'Professional Info Page');
});
```

**Run:**
```bash
npx percy exec -- playwright test percy.spec.ts
```

#### Option B: Playwright Screenshots (Free)

```typescript
test('Account Professional Info screenshot', async ({ page }) => {
  await page.goto('/account/professional-info');
  await page.screenshot({
    path: `screenshots/professional-info-${Date.now()}.png`,
    fullPage: true
  });
});
```

### Visual Test Process

1. **Baseline Creation:**
   - Capture screenshots of correct/approved state
   - Store in `tests/visual/baselines/`

2. **Regression Detection:**
   - Run visual tests before deployment
   - Compare current screenshots with baseline
   - Flag differences for review

3. **Review & Approval:**
   - Engineer reviews visual changes
   - Approve legitimate changes (update baseline)
   - Fix unintended changes (bug)

---

## 5. Performance Testing Strategy

### Frontend Performance

**Tool:** Lighthouse CI
**Metrics:**
- Performance score ≥ 90
- First Contentful Paint < 1.8s
- Time to Interactive < 3.9s
- Cumulative Layout Shift < 0.1

**Run Command:**
```bash
npm run build
npx lighthouse http://localhost:3000/account/professional-info --view
```

### Backend Performance

**Tool:** Apache Bench (ab) or Artillery
**Metrics:**
- API response time p95 < 500ms
- Throughput ≥ 100 req/s
- Error rate < 1%

**Run Command:**
```bash
ab -n 1000 -c 10 http://localhost:8000/api/account/professional-info?role_type=provider
```

---

## 6. Accessibility Testing Strategy

**Tool:** axe-core + Playwright

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Professional Info page accessibility', async ({ page }) => {
  await page.goto('/account/professional-info');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

**Standards:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility

---

## 7. Security Testing Strategy

### Static Analysis

**Tool:** Bandit (Python) + ESLint security plugin (JavaScript)

```bash
# Backend
bandit -r apps/api/app/

# Frontend
npm run lint
```

### Dependency Scanning

**Tool:** npm audit + Safety (Python)

```bash
# Frontend
npm audit --audit-level=moderate

# Backend
pip install safety
safety check
```

### Manual Security Checks

- [ ] No credentials in code
- [ ] No sensitive data in logs
- [ ] Proper authentication on all endpoints
- [ ] Input validation and sanitization
- [ ] CSRF protection
- [ ] XSS prevention

---

## Test Execution Plan

### Pre-Commit (Local)

```bash
# Run automatically via Husky pre-commit hook
npm run lint          # Must pass
npm run test:unit     # Must pass
```

### Pre-Push (Local)

```bash
git push              # Triggers pre-push hook
# Runs: lint + unit tests + type checking
```

### Pull Request (CI/CD)

**GitHub Actions Workflow:**

```yaml
name: Test Pipeline

on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:unit -- --coverage
      - run: cd apps/api && pytest tests/unit/

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx playwright install
      - run: npm run dev & # Start dev server
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx percy exec -- playwright test visual.spec.ts
```

### Pre-Deployment (Staging)

1. ✅ All PR tests passed
2. ✅ Manual testing checklist completed
3. ✅ Visual regression review approved
4. ✅ Performance benchmarks met
5. ✅ Security scan passed

### Post-Deployment (Production)

1. Smoke tests (critical paths only)
2. Monitor error rates (24h)
3. Performance monitoring
4. User feedback collection

---

## Test Cases: Account > Professional Info Feature

### Unit Test Cases

| ID | Test Case | Status |
|----|-----------|--------|
| UT-1 | Verify token - missing header → 401 | ✅ PASS |
| UT-2 | Verify token - invalid format → 401 | ✅ PASS |
| UT-3 | GET professional info - success | ✅ PASS |
| UT-4 | GET professional info - not found → 404 | ✅ PASS |
| UT-5 | PATCH professional info - success | ✅ PASS |
| UT-6 | PATCH professional info - minimal data | ✅ PASS |
| UT-7 | PATCH professional info - DB error → 500 | ✅ PASS |

### Integration Test Cases

| ID | Test Case | Status |
|----|-----------|--------|
| IT-1 | Create professional info → Verify in DB | ⏳ TODO |
| IT-2 | Update existing info → Verify changes | ⏳ TODO |
| IT-3 | Get info with valid JWT → Success | ⏳ TODO |
| IT-4 | Get info with invalid JWT → 401 | ⏳ TODO |

### E2E Test Cases

| ID | Test Case | Status |
|----|-----------|--------|
| E2E-1 | Navigate to page when logged out → Redirect to login | ⏳ TODO |
| E2E-2 | Login → Navigate → See form | ⏳ TODO |
| E2E-3 | Load existing template → Form pre-fills | ⏳ TODO |
| E2E-4 | Edit subjects → Select chips → Verify selection | ⏳ TODO |
| E2E-5 | Fill all required fields → Save button enables | ⏳ TODO |
| E2E-6 | Submit form → See success message | ⏳ TODO |
| E2E-7 | Refresh page → Data persists | ⏳ TODO |
| E2E-8 | Test on mobile viewport → Form adapts | ⏳ TODO |

### Visual Test Cases

| ID | Test Case | Status |
|----|-----------|--------|
| VT-1 | Professional Info page desktop (1920x1080) | ⏳ TODO |
| VT-2 | Professional Info page tablet (768x1024) | ⏳ TODO |
| VT-3 | Professional Info page mobile (375x667) | ⏳ TODO |
| VT-4 | Form with data loaded | ⏳ TODO |
| VT-5 | Form with chips selected | ⏳ TODO |
| VT-6 | Success toast notification | ⏳ TODO |

---

## Test Data Management

### Test Users

Create in Supabase test project:

```sql
-- Test tutor
INSERT INTO profiles (id, email, display_name, roles)
VALUES (
  'test-tutor-id',
  'test-tutor@tutorwise.com',
  'Test Tutor',
  ARRAY['provider']
);

-- Test client
INSERT INTO profiles (id, email, display_name, roles)
VALUES (
  'test-client-id',
  'test-client@tutorwise.com',
  'Test Client',
  ARRAY['seeker']
);
```

### Test Data Fixtures

```typescript
// tests/fixtures/professional-info.ts
export const tutorTemplateData = {
  role_type: 'provider',
  subjects: ['Mathematics', 'Physics'],
  teaching_experience: '5-10 years',
  hourly_rate: 45,
  qualifications: ['BSc Mathematics - Oxford'],
  teaching_methods: ['Interactive', 'Exam-focused']
};
```

---

## Continuous Improvement

### Quarterly Reviews

- Review test coverage reports
- Identify untested areas
- Update test cases for new features
- Optimize slow tests
- Update this document

### Metrics to Track

- Test coverage % (trending up)
- Test execution time (optimize if too slow)
- Flaky test rate (< 1%)
- Bugs escaped to production (trending down)

---

## Tools Reference

| Tool | Purpose | Docs |
|------|---------|------|
| pytest | Backend unit tests | [docs.pytest.org](https://docs.pytest.org) |
| Jest | Frontend unit tests | [jestjs.io](https://jestjs.io) |
| React Testing Library | Component tests | [testing-library.com](https://testing-library.com) |
| Playwright | E2E + Visual tests | [playwright.dev](https://playwright.dev) |
| Percy | Visual regression | [percy.io](https://percy.io) |
| Lighthouse | Performance | [web.dev/lighthouse](https://web.dev/lighthouse) |
| axe-core | Accessibility | [deque.com/axe](https://www.deque.com/axe/) |

---

**Next Actions:**
1. ✅ Implement E2E tests for Professional Info feature
2. ✅ Set up visual regression tests
3. ✅ Configure CI/CD pipeline
4. ⏳ Add integration tests (requires test DB)


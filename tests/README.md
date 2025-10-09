# Tests Directory

This directory contains cross-application tests for the TutorWise monorepo following the **Monorepo Testing Pattern**.

## Overview

**Philosophy:** Unit tests live with their apps, E2E tests live centrally.

- **Unit Tests:** Located in each app's `tests/` directory (e.g., `apps/web/tests/unit/`)
- **Integration Tests:** Cross-app integration tests (auth, contexts, Stripe)
- **E2E Tests:** Full end-to-end user flows using Playwright
- **Helpers:** Shared test utilities and fixtures

## Structure

```
tests/
├── e2e/                          # E2E tests (Playwright)
│   ├── account/                  # Account management flows
│   ├── auth.spec.ts              # Authentication flows
│   ├── basic-navigation.spec.ts  # Navigation tests
│   ├── homepage.spec.ts          # Homepage tests
│   ├── onboarding-flow.spec.ts   # Onboarding flows
│   └── testassured.spec.ts       # Test infrastructure validation
│
├── integration/                  # Cross-app integration tests
│   ├── auth/                     # Auth integration tests
│   ├── contexts/                 # Context integration tests
│   └── stripe/                   # Stripe integration tests
│
├── helpers/                      # Shared test utilities
│   └── auth.ts                   # Authentication helpers
│
├── fixtures/                     # Test fixtures
│
└── README.md                     # This file

apps/web/tests/                   # Web app unit tests
├── unit/                         # Unit tests for components
│   ├── onboarding/               # Onboarding component tests
│   ├── AgentProfessionalInfoForm.test.tsx
│   ├── ClientProfessionalInfoForm.test.tsx
│   ├── ProfilePage.test.tsx
│   └── TutorProfessionalInfoForm.test.tsx
└── components/                   # Component-specific tests
    └── ui/Button.test.tsx
```

## Running Tests

### Unit Tests (Jest)
```bash
# Run all web unit tests
cd apps/web && npm test

# Run specific test file
cd apps/web && npm test ProfilePage.test.tsx

# Run with coverage
cd apps/web && npm test -- --coverage
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test tests/e2e/account/professional-info.spec.ts

# Run with UI mode
npx playwright test --ui

# Run with specific browser
npx playwright test --project=chromium
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm test tests/integration/auth/profile.test.ts
```

## Test Coverage Targets

- **Unit Tests:** >80% coverage per component
- **E2E Tests:** Critical user flows (auth, onboarding, profile, payments)
- **Integration Tests:** Cross-service interactions

## Week 2-3 Test Metrics

**Unit Tests:**
- 48 tests (21 Client + 27 Agent) - 100% passing ✅
- Average coverage: 89.71%
- Zero flaky tests

**E2E Tests:**
- 8 test files covering critical flows
- Cross-browser validation (Chromium, Firefox, WebKit, Mobile)

## Archived Test Infrastructure

Legacy GUARD test infrastructure has been archived to `docs/archive/guard-tests/` for historical reference.

## Configuration

- **Jest Config:** `apps/web/jest.config.js`
- **Playwright Config:** `tools/playwright/playwright.config.ts`
- **Test Setup:** `jest.setup.js` (root level)

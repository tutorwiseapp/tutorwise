# Testing & QA Process for TutorWise

**Version:** 1.1.0
**Last Updated:** October 5, 2025
**Purpose:** Define the complete testing and QA process that must be followed for all feature development

## Quick Links
- [E2E Testing Guide](../tests/e2e/README.md) - Complete guide for E2E tests with authentication
- [Test Strategy](./test-strategy-complete.md) - Comprehensive test strategy document
- [Figma Compliance](./figma-design-compliance.md) - Design system compliance verification

---

## Overview

**Testing and QA are mandatory parts of feature development**, not optional afterthoughts. Every feature must pass through all relevant test phases before deployment to production.

---

## Testing Pyramid

```
        /\
       /  \      E2E Tests (Few)
      /____\
     /      \    Integration Tests (Some)
    /________\
   /          \  Unit Tests (Many)
  /____________\
```

---

## Phase 1: Unit Tests ✅ MANDATORY

**Purpose:** Test individual functions/components in isolation

### Backend (FastAPI/Python)

**Location:** `apps/api/tests/unit/`

**Requirements:**
- Test all API endpoints
- Test all business logic functions
- Test error handling
- Test edge cases
- Mock external dependencies (Supabase, Redis, Neo4j)

**Run Command:**
```bash
cd apps/api
python3 -m pytest tests/unit/ -v
```

**Coverage Target:** ≥ 80% for new code

**Example:** `test_account.py`
- ✅ Test authentication/authorization
- ✅ Test GET endpoint success cases
- ✅ Test GET endpoint error cases (404, 500)
- ✅ Test PATCH endpoint success cases
- ✅ Test PATCH endpoint validation
- ✅ Test database errors

### Frontend (Next.js/React)

**Location:** `apps/web/tests/unit/` or `__tests__/` directories

**Requirements:**
- Test component rendering
- Test user interactions
- Test state management
- Test utility functions
- Mock API calls

**Run Command:**
```bash
cd apps/web
npm run test
```

**Tools:** Jest + React Testing Library

**Coverage Target:** ≥ 70% for new code

---

## Phase 2: Integration Tests ⚠️ REQUIRED FOR API CHANGES

**Purpose:** Test how components work together (API + Database, Frontend + API)

### Backend Integration Tests

**Location:** `apps/api/tests/integration/`

**Requirements:**
- Test actual database operations (use test database)
- Test API endpoints end-to-end
- Test authentication flow
- Test data persistence

**Run Command:**
```bash
cd apps/api
python3 -m pytest tests/integration/ -v
```

**Prerequisites:**
- Test database must be running
- Test environment variables configured

### Frontend Integration Tests

**Requirements:**
- Test API client functions
- Test data fetching/updating
- Test form submissions
- Mock backend responses

---

## Phase 3: Linting & Code Quality ✅ MANDATORY

**Purpose:** Ensure code follows style guidelines and best practices

### Frontend Linting

**Run Command:**
```bash
npm run lint
```

**Must Pass:** ✅ Zero ESLint errors
**Warnings:** Should be minimized

### Backend Linting

**Run Command:**
```bash
cd apps/api
ruff check .
```

**Must Pass:** ✅ Zero errors

---

## Phase 4: Build Test ✅ MANDATORY

**Purpose:** Ensure code compiles/builds for production

### Frontend Build

**Run Command:**
```bash
cd apps/web
npm run build
```

**Must Pass:** ✅ Build completes without errors

**Check For:**
- No TypeScript errors
- No missing dependencies
- No circular dependencies
- Reasonable bundle size

### Backend Build

**Run Command:**
```bash
cd apps/api
python3 -m compileall app/
```

**Must Pass:** ✅ No syntax errors

---

## Phase 5: Visual Regression Tests (Optional for UI Changes)

**Purpose:** Detect unintended visual changes

**Tools:** Playwright visual testing

**Run Command:**
```bash
cd apps/web
npm run test:e2e:visual
```

**Requirements:**
- Capture screenshots of key pages
- Compare with baseline
- Review and approve changes

---

## Phase 6: End-to-End Tests (For Critical Flows)

**Purpose:** Test complete user journeys

**Location:** `tests/e2e/` using Playwright

**Documentation:** 📖 [Complete E2E Testing Guide](../tests/e2e/README.md)

**Setup:**
1. Copy `.env.test.example` to `.env.test`
2. Create test users in Supabase test project
3. Configure test credentials in `.env.test`

**Run Command:**
```bash
npx playwright test --config=tools/playwright/playwright.config.ts
```

**Run Specific Test:**
```bash
npx playwright test tests/e2e/account/professional-info.spec.ts
```

**Run with UI (Interactive):**
```bash
npx playwright test --ui
```

**Authentication in E2E Tests:**

All E2E tests use the authentication helper from `tests/helpers/auth.ts`:

```typescript
import { loginAsTutor, loginAsClient, loginAsAgent } from '../../helpers/auth';

test('authenticated test', async ({ page }) => {
  await loginAsTutor(page);  // Login before accessing protected pages
  await page.goto('/account/professional-info');
  // ... test logic
});
```

**Critical Flows to Test:**
1. ✅ User authentication (login/signup with redirect)
2. ✅ Onboarding flow
3. ✅ Template editing (Account > Professional Info)
4. Listing creation (future)
5. Search and filters (future)
6. Booking flow (future)

**Test Users Required:**
- Test Tutor (provider role) - for tutor-specific features
- Test Client (seeker role) - for client-specific features
- Test Agent (agent role) - for agent-specific features

**Visual Regression Testing:**

Playwright includes built-in visual regression testing:

```bash
# Run visual regression tests
npx playwright test tests/e2e/ --grep "Visual Regression"

# Update visual baselines (after intentional UI changes)
npx playwright test --update-snapshots
```

---

## Testing Checklist for Feature Development

Use this checklist for every feature:

### Pre-Development
- [ ] Review feature requirements
- [ ] Identify testable scenarios
- [ ] Plan test cases

### During Development
- [ ] Write unit tests alongside code (TDD approach)
- [ ] Test locally as you code
- [ ] Fix issues immediately

### Before PR/Deployment
- [ ] ✅ All unit tests pass
- [ ] ✅ Integration tests pass (if applicable)
- [ ] ✅ Linting passes (zero errors)
- [ ] ✅ Build succeeds
- [ ] ✅ Manual testing completed
- [ ] Visual regression tests pass (if UI changes)
- [ ] E2E tests pass (if critical flow)
- [ ] Performance check (no major regressions)
- [ ] Security check (no credentials exposed)

---

## Test Automation

### CI/CD Integration

**GitHub Actions Workflow:** (To be created)

```yaml
name: Test Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Backend tests
      - name: Run Backend Unit Tests
        run: |
          cd apps/api
          python3 -m pytest tests/unit/ -v

      # Frontend tests
      - name: Run Frontend Lint
        run: npm run lint

      - name: Run Frontend Build
        run: npm run build

      # E2E tests
      - name: Run E2E Tests
        run: npm run test:e2e
```

### Pre-commit Hooks

**Recommended:** Use Husky for pre-commit hooks

```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

---

## Manual Testing Guidelines

### For Every Feature

1. **Happy Path Testing**
   - Test the intended user flow
   - Verify all success messages
   - Check data persistence

2. **Error Path Testing**
   - Test with invalid inputs
   - Test network errors
   - Test authentication failures
   - Verify error messages

3. **Edge Cases**
   - Empty states
   - Maximum limits
   - Boundary conditions
   - Concurrent operations

4. **Cross-Browser Testing**
   - Chrome (latest)
   - Safari (latest)
   - Firefox (latest)
   - Edge (latest)

5. **Device Testing**
   - Desktop (1920x1080+)
   - Tablet (768x1024)
   - Mobile (375x667)

6. **Performance Testing**
   - Page load time < 3s
   - API response time < 500ms
   - No memory leaks
   - Smooth animations

---

## Test Data Management

### Test Database

- **Never** test on production database
- Use dedicated test database
- Reset state between test runs
- Use fixtures/seed data

### Test Users

Create test users for each role:
- `test-client@tutorwise.com`
- `test-tutor@tutorwise.com`
- `test-agent@tutorwise.com`

**Password:** Use environment variables, never hardcode

---

## Bug Reporting

When a bug is found:

1. **Reproduce:** Verify bug is reproducible
2. **Document:** Write clear reproduction steps
3. **Categorize:** Severity (Critical/High/Medium/Low)
4. **Log:** Create issue in GitHub/Jira
5. **Test:** Add test case to prevent regression

---

## Deployment Checklist

Before deploying to production:

- [ ] ✅ All tests pass (unit + integration + E2E)
- [ ] ✅ Linting passes
- [ ] ✅ Build succeeds
- [ ] ✅ Manual testing completed
- [ ] ✅ Code review approved
- [ ] ✅ Documentation updated
- [ ] ✅ Database migrations tested
- [ ] ✅ Environment variables configured
- [ ] ✅ Rollback plan prepared
- [ ] ✅ Monitoring alerts configured

---

## Current Test Status (Account > Professional Info Feature)

### Completed ✅
1. **Backend Unit Tests** - 7/7 tests passed
   - Token verification
   - GET professional info (success + error)
   - PATCH professional info (success + error + edge cases)

2. **Frontend Linting** - ✅ Passed (zero errors)

3. **Code Quality** - ✅ All ESLint rules followed

### To Do (Not Blocking MVP)
1. **Frontend Unit Tests** - Create React component tests
2. **Integration Tests** - Test with live database
3. **E2E Tests** - Test complete template editing flow
4. **Visual Regression** - Capture baseline screenshots

### Manual Testing Checklist (In Progress)
- [ ] Login and navigate to `/account/professional-info`
- [ ] Load existing template data
- [ ] Edit all form fields
- [ ] Save template
- [ ] Verify success message
- [ ] Reload page and verify persistence
- [ ] Test on mobile device
- [ ] Test error handling (network failure)

---

## Tools & Libraries

### Backend Testing
- **pytest** - Test framework
- **pytest-mock** - Mocking
- **pytest-asyncio** - Async test support
- **pytest-cov** - Coverage reports

### Frontend Testing
- **Jest** - Test framework
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **@testing-library/user-event** - User interaction simulation

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
- **Ruff** - Python linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

---

## References

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev/)
- [pytest Documentation](https://docs.pytest.org/)

---

**Remember:** Tests are documentation, safety nets, and confidence builders. Write them!

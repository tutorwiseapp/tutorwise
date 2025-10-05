# E2E Testing Guide

Complete guide for running End-to-End tests for TutorWise using Playwright.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup](#setup)
3. [Running Tests](#running-tests)
4. [Authentication](#authentication)
5. [Writing Tests](#writing-tests)
6. [Visual Regression Testing](#visual-regression-testing)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** 18+ and npm
- **Playwright** (installed via npm)
- **Test Users** in Supabase test project

### Optional

- **Percy account** for visual regression testing
- **Browserstack** or similar for cross-browser testing

---

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install Playwright and all browsers automatically.

### 2. Install Playwright Browsers (if needed)

```bash
npx playwright install
```

### 3. Create Test Environment File

```bash
cp .env.test.example .env.test
```

### 4. Configure Test Credentials

Edit `.env.test` and add your test user credentials:

```env
TEST_TUTOR_EMAIL=test-tutor@tutorwise.com
TEST_TUTOR_PASSWORD=YourSecurePassword123!

TEST_CLIENT_EMAIL=test-client@tutorwise.com
TEST_CLIENT_PASSWORD=YourSecurePassword123!

TEST_AGENT_EMAIL=test-agent@tutorwise.com
TEST_AGENT_PASSWORD=YourSecurePassword123!

BASE_URL=http://localhost:3000
```

**IMPORTANT:** These must be real user accounts in your Supabase test project.

### 5. Create Test Users in Supabase

#### Option A: Manual Creation (Recommended for first-time setup)

1. Go to your Supabase test project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Create three users with the emails from your `.env.test` file
5. For each user:
   - Set a secure password
   - Confirm the email (auto-confirm in test project settings)
   - Add to `profiles` table
   - Add corresponding `role_details` entry

#### Option B: Automated Setup Script (TODO - Future Enhancement)

```bash
npm run test:setup-users
```

This will create all three test users with appropriate roles and profile data.

---

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/account/professional-info.spec.ts
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run in Debug Mode

```bash
npx playwright test --debug
```

### Run Specific Browser

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit only
npx playwright test --project=webkit
```

### Run with UI Mode (Interactive)

```bash
npx playwright test --ui
```

This opens a browser where you can:
- See all tests
- Run tests interactively
- See detailed traces
- Debug step-by-step

---

## Authentication

### How Authentication Works in Tests

All authenticated tests use the authentication helper located at `tests/helpers/auth.ts`.

### Usage in Tests

```typescript
import { loginAsTutor, loginAsClient, loginAsAgent } from '../../helpers/auth';

test('authenticated test', async ({ page }) => {
  // Login as tutor
  await loginAsTutor(page);

  // Now you can access protected pages
  await page.goto('/account/professional-info');

  // ... rest of test
});
```

### Available Helper Functions

#### `loginAsUser(page, userType, baseURL?)`

Generic login function. Accepts:
- `userType`: `'tutor'` | `'client'` | `'agent'`
- `baseURL`: Optional base URL (defaults to localhost:3000)

#### `loginAsTutor(page, baseURL?)`

Convenience wrapper for logging in as a tutor (provider role).

#### `loginAsClient(page, baseURL?)`

Convenience wrapper for logging in as a client (seeker role).

#### `loginAsAgent(page, baseURL?)`

Convenience wrapper for logging in as an agent.

#### `logout(page)`

Logs out the current user.

#### `isLoggedIn(page)`

Returns `true` if user is currently logged in.

### Testing Unauthenticated Flows

For tests that should NOT be authenticated, simply don't call the login helper:

```typescript
test('should redirect to login when not authenticated', async ({ page }) => {
  // No login call - test runs unauthenticated
  await page.goto('/account/professional-info');

  // Should redirect to login
  await expect(page).toHaveURL(/.*login/);
});
```

---

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTutor } from '../../helpers/auth';

test.describe('Feature Name', () => {
  // Setup authentication for all tests in this describe block
  test.beforeEach(async ({ page }) => {
    await loginAsTutor(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/your-page');

    // Assertions
    await expect(page.getByText('Expected Text')).toBeVisible();
  });

  test('should do something else', async ({ page }) => {
    // This test is also authenticated via beforeEach
    await page.goto('/another-page');
  });
});
```

### Best Practices

1. **Use Semantic Locators**
   ```typescript
   // ✅ Good - using role and accessible name
   await page.getByRole('button', { name: 'Save Template' }).click();

   // ❌ Bad - using CSS selectors
   await page.click('.btn-primary');
   ```

2. **Wait for Elements**
   ```typescript
   // ✅ Good - explicit wait with expect
   await expect(page.getByText('Success')).toBeVisible();

   // ❌ Bad - no wait, might fail intermittently
   const text = await page.textContent('.message');
   ```

3. **Use Test IDs for Complex Selectors**
   ```tsx
   // In component
   <div data-testid="user-profile">...</div>

   // In test
   await page.getByTestId('user-profile');
   ```

4. **Keep Tests Independent**
   - Each test should run independently
   - Don't rely on state from previous tests
   - Use `beforeEach` for setup

5. **Use Descriptive Test Names**
   ```typescript
   // ✅ Good
   test('should allow tutors to select multiple subjects via chips');

   // ❌ Bad
   test('chips work');
   ```

### Example: Testing Forms

```typescript
test('should submit form successfully', async ({ page }) => {
  await loginAsTutor(page);
  await page.goto('/account/professional-info');

  // Fill required fields
  await page.getByRole('button', { name: 'Mathematics' }).click();
  await page.getByRole('button', { name: 'GCSE' }).click();
  await page.getByRole('combobox').selectOption('5-10 years');

  // Submit form
  await page.getByRole('button', { name: /Save Template/ }).click();

  // Verify success
  await expect(page.getByText(/Template saved/)).toBeVisible({ timeout: 5000 });
});
```

---

## Visual Regression Testing

### Playwright Built-in Screenshots

Playwright has built-in screenshot comparison:

```typescript
test('should match visual snapshot', async ({ page }) => {
  await page.goto('/account/professional-info');

  // Wait for content
  await page.waitForSelector('.formSection');

  // Take screenshot and compare
  await expect(page).toHaveScreenshot('professional-info.png', {
    fullPage: true,
    animations: 'disabled'
  });
});
```

**First run:** Playwright saves the screenshot as baseline.
**Subsequent runs:** Playwright compares against baseline and fails if different.

### Updating Baselines

When you intentionally change UI:

```bash
npx playwright test --update-snapshots
```

### Percy Integration (Optional)

Percy provides cloud-based visual regression testing with:
- Cross-browser screenshot comparison
- Responsive testing
- Team collaboration
- Visual diffs

#### Setup Percy

1. Sign up at [percy.io](https://percy.io)
2. Install Percy Playwright SDK:
   ```bash
   npm install --save-dev @percy/cli @percy/playwright
   ```
3. Add Percy token to `.env.test`:
   ```env
   PERCY_TOKEN=your_percy_token
   ```

#### Use Percy in Tests

```typescript
import percySnapshot from '@percy/playwright';

test('should match Percy snapshot', async ({ page }) => {
  await page.goto('/account/professional-info');

  // Take Percy snapshot
  await percySnapshot(page, 'Professional Info Page');
});
```

#### Run with Percy

```bash
npx percy exec -- npx playwright test
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_TUTOR_EMAIL: ${{ secrets.TEST_TUTOR_EMAIL }}
          TEST_TUTOR_PASSWORD: ${{ secrets.TEST_TUTOR_PASSWORD }}
          TEST_CLIENT_EMAIL: ${{ secrets.TEST_CLIENT_EMAIL }}
          TEST_CLIENT_PASSWORD: ${{ secrets.TEST_CLIENT_PASSWORD }}
          TEST_AGENT_EMAIL: ${{ secrets.TEST_AGENT_EMAIL }}
          TEST_AGENT_PASSWORD: ${{ secrets.TEST_AGENT_PASSWORD }}
          BASE_URL: http://localhost:3000

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Add Secrets to GitHub

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `TEST_TUTOR_EMAIL`
   - `TEST_TUTOR_PASSWORD`
   - `TEST_CLIENT_EMAIL`
   - `TEST_CLIENT_PASSWORD`
   - `TEST_AGENT_EMAIL`
   - `TEST_AGENT_PASSWORD`

---

## Troubleshooting

### Tests Failing with "Cannot navigate to invalid URL"

**Problem:** Missing `baseURL` in Playwright config or wrong path.

**Solution:**
1. Check `tools/playwright/playwright.config.ts` has `baseURL` set
2. Make sure dev server is running (`npm run dev`)
3. Use relative paths in tests: `page.goto('/account/professional-info')` not `page.goto('account/professional-info')`

### Authentication Tests Failing

**Problem:** Test users don't exist or credentials are wrong.

**Solution:**
1. Verify `.env.test` file exists and has correct credentials
2. Verify test users exist in Supabase test project
3. Try manual login with the credentials
4. Check that users have required roles in `role_details` table

### Tests Timing Out

**Problem:** Page elements not loading fast enough.

**Solution:**
1. Increase timeout in specific test:
   ```typescript
   await expect(element).toBeVisible({ timeout: 10000 });
   ```
2. Wait for network idle:
   ```typescript
   await page.goto('/page', { waitUntil: 'networkidle' });
   ```
3. Check for console errors: `page.on('console', msg => console.log(msg))`

### Screenshots Don't Match

**Problem:** Visual regression tests failing.

**Solution:**
1. Check if UI intentionally changed - if yes, update snapshots:
   ```bash
   npx playwright test --update-snapshots
   ```
2. Platform differences - generate snapshots on CI platform
3. Animation differences - disable animations in tests:
   ```typescript
   await expect(page).toHaveScreenshot({ animations: 'disabled' });
   ```

### Flaky Tests

**Problem:** Tests pass sometimes, fail sometimes.

**Solution:**
1. Add proper waits with `expect().toBeVisible()` instead of `waitForTimeout`
2. Wait for network requests to complete
3. Disable animations
4. Use stable selectors (data-testid, roles)
5. Check for race conditions in component

### Headless vs Headed Differences

**Problem:** Test passes in headed mode, fails in headless.

**Solution:**
1. Add `viewport` setting in Playwright config
2. Check for animations that behave differently
3. Add explicit waits
4. Run with `--headed` flag to debug

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Percy Documentation](https://docs.percy.io)
- [TutorWise Testing Strategy](../../process/TEST-STRATEGY-COMPLETE.md)
- [Testing QA Process](../../process/TESTING-QA-PROCESS.md)

---

## Support

For questions or issues with E2E testing:
1. Check this README
2. Check [Playwright docs](https://playwright.dev)
3. Ask in team Slack #engineering-testing channel
4. Create an issue in the repo

---

**Last Updated:** October 5, 2025
**Maintainer:** Engineering Team

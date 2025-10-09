# Percy Visual Testing Guide

**Date:** October 8, 2025
**Status:** ✅ Integrated with Playwright E2E tests

---

## Overview

Percy provides visual regression testing by capturing screenshots during Playwright E2E tests and comparing them against approved baselines. This allows you to catch visual bugs automatically.

---

## Setup

### 1. Percy Project Configuration

Percy is already configured in [.percyrc](.percyrc):

```json
{
  "version": 2,
  "snapshot": {
    "widths": [375, 768, 1280],
    "min-height": 1024
  }
}
```

**Widths:** 375px (mobile), 768px (tablet), 1280px (desktop)

### 2. Environment Variables

Create `.env.percy` (already in `.gitignore`):

```bash
PERCY_TOKEN=your_percy_token_here
```

Get your Percy token from https://percy.io/

### 3. Package Installation

Percy Playwright package is already installed:

```bash
npm install @percy/playwright --save-dev
```

---

## Running Percy Tests

### Local Development (Without Percy)

Run Playwright tests normally without Percy snapshots:

```bash
npm run test:e2e
```

Percy snapshots will be **skipped automatically** when `PERCY_TOKEN` is not set.

### With Percy (Visual Regression)

Run tests with Percy to capture visual snapshots:

```bash
npx percy exec -- npx playwright test tests/e2e/account/professional-info.spec.ts --config=tools/playwright/playwright.config.ts
```

**What happens:**
1. Percy starts a local server
2. Playwright runs E2E tests
3. Percy captures snapshots at designated points
4. Snapshots are uploaded to Percy cloud
5. Percy compares against baseline images
6. Results available at percy.io dashboard

---

## Adding Percy Snapshots to Tests

### Basic Usage

```typescript
import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('visual regression test', async ({ page }) => {
  await page.goto('http://localhost:3000/your-page');
  await page.waitForSelector('.main-content');

  // Take Percy snapshot
  await percySnapshot(page, 'Page Name - Desktop');
});
```

### With Multiple Viewports

```typescript
test('responsive visual test', async ({ page }) => {
  await page.goto('http://localhost:3000/your-page');

  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await percySnapshot(page, 'Page Name - Desktop');

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await percySnapshot(page, 'Page Name - Tablet');

  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await percySnapshot(page, 'Page Name - Mobile');
});
```

### With Percy Options

```typescript
await percySnapshot(page, 'Page Name', {
  widths: [375, 768, 1280],           // Override config widths
  minHeight: 1024,                     // Minimum height
  percyCSS: '.dynamic-element { display: none; }',  // Hide dynamic content
  enableJavaScript: true               // Enable JS for snapshots
});
```

---

## Current Percy Integration

### Professional Info Form Tests

**File:** [tests/e2e/account/professional-info.spec.ts](../tests/e2e/account/professional-info.spec.ts)

**Snapshots Created:**
1. **Professional Info - Desktop** (1920x1080)
2. **Professional Info - Tablet** (768x1024)
3. **Professional Info - Mobile** (375x667)
4. **Professional Info - With Selections** (form with data filled)

**Test Command:**
```bash
npx percy exec -- npx playwright test tests/e2e/account/professional-info.spec.ts --config=tools/playwright/playwright.config.ts --grep="Visual Regression"
```

---

## Percy Workflow

### First Run (Creating Baselines)

1. Run Percy tests for the first time:
   ```bash
   npx percy exec -- npm run test:e2e
   ```

2. Percy captures all snapshots and marks them as "New"

3. Review snapshots at percy.io dashboard

4. **Approve baselines** - These become the reference images

### Subsequent Runs (Detecting Changes)

1. Make UI changes to your components

2. Run Percy tests:
   ```bash
   npx percy exec -- npm run test:e2e
   ```

3. Percy compares new snapshots against approved baselines

4. Visual changes are highlighted in percy.io dashboard:
   - **Green:** No changes detected ✅
   - **Yellow:** Changes detected, requires review ⚠️
   - **Red:** Snapshot failed to capture ❌

5. Review changes:
   - **Approve** if changes are intentional
   - **Reject** if changes are bugs

---

## Best Practices

### 1. Hide Dynamic Content

Use `percyCSS` to hide elements that change between test runs:

```typescript
await percySnapshot(page, 'Page Name', {
  percyCSS: `
    .timestamp { display: none; }
    .random-avatar { display: none; }
    .loading-spinner { display: none; }
  `
});
```

### 2. Wait for Content to Load

Always wait for async content before snapshotting:

```typescript
await page.waitForSelector('.formSection');
await page.waitForLoadState('networkidle');
await percySnapshot(page, 'Page Name');
```

### 3. Use Descriptive Names

Make snapshot names specific and descriptive:

```typescript
// ❌ Bad
await percySnapshot(page, 'Form');

// ✅ Good
await percySnapshot(page, 'Professional Info - Empty Form - Desktop');
```

### 4. Test Critical User Flows

Focus Percy snapshots on:
- Landing pages
- Critical forms
- Dashboard views
- Error states
- Mobile responsiveness

### 5. Avoid Snapshot Explosion

Don't snapshot every small UI change. Focus on:
- Full page layouts
- Complex components
- Different states (empty, filled, error)

---

## CI/CD Integration

### GitHub Actions

Add Percy to your CI workflow:

```yaml
name: Visual Regression Tests

on: [pull_request]

jobs:
  percy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Run Percy tests
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
        run: npx percy exec -- npm run test:e2e
```

**Add `PERCY_TOKEN` to GitHub Secrets:**
Settings → Secrets → Actions → New repository secret

---

## Percy Dashboard

### Viewing Results

1. Go to https://percy.io/
2. Select your project
3. View build results:
   - ✅ **Approved:** No changes detected
   - ⚠️ **Pending:** Changes require review
   - ❌ **Failed:** Snapshot errors

### Comparing Snapshots

Click on any snapshot to see:
- **Baseline:** Original approved image
- **New:** Current test image
- **Diff:** Highlighted differences (red/green overlay)

### Managing Baselines

- **Approve:** Set current snapshot as new baseline
- **Reject:** Mark snapshot as failed (doesn't update baseline)
- **Request changes:** Add comments for team review

---

## Troubleshooting

### Percy Snapshots Not Appearing

**Problem:** Tests run but no snapshots on percy.io

**Solutions:**
1. Verify `PERCY_TOKEN` is set:
   ```bash
   echo $PERCY_TOKEN
   ```

2. Ensure you're using `percy exec`:
   ```bash
   # ❌ Wrong
   npm run test:e2e

   # ✅ Correct
   npx percy exec -- npm run test:e2e
   ```

3. Check Percy CLI is running (logs should show "Percy has started"):
   ```
   [percy] Percy has started!
   [percy] Created build #123
   ```

### Snapshots Differ Every Run

**Problem:** Percy detects changes even when nothing changed

**Solutions:**
1. Hide dynamic content (timestamps, random data):
   ```typescript
   percyCSS: '.timestamp { visibility: hidden; }'
   ```

2. Wait for animations to complete:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. Disable animations in Percy config:
   ```json
   {
     "percy-css": "* { animation: none !important; transition: none !important; }"
   }
   ```

### Viewport Not Matching

**Problem:** Percy uses different viewport than test

**Solution:** Set viewport before snapshot:
```typescript
await page.setViewportSize({ width: 1280, height: 720 });
await percySnapshot(page, 'Page Name');
```

---

## Next Steps

### Expand Visual Coverage

1. **Profile Page:**
   ```typescript
   await percySnapshot(page, 'Profile - Empty State');
   await percySnapshot(page, 'Profile - With Avatar');
   ```

2. **Onboarding Wizard:**
   ```typescript
   await percySnapshot(page, 'Onboarding - Step 1');
   await percySnapshot(page, 'Onboarding - Step 2');
   await percySnapshot(page, 'Onboarding - Complete');
   ```

3. **Service Listings:**
   ```typescript
   await percySnapshot(page, 'Service Listing - Grid View');
   await percySnapshot(page, 'Service Listing - List View');
   await percySnapshot(page, 'Service Listing - Detail');
   ```

### Automate in CI

1. Add Percy to GitHub Actions workflow
2. Block merges if Percy detects unapproved changes
3. Require visual review for all PRs

---

## Resources

- **Percy Documentation:** https://docs.percy.io/docs/playwright
- **Percy Dashboard:** https://percy.io/
- **Percy Config:** [.percyrc](../.percyrc)
- **Test File:** [tests/e2e/account/professional-info.spec.ts](../tests/e2e/account/professional-info.spec.ts)

---

## Summary

✅ **Percy Installed:** `@percy/playwright` v1.x
✅ **Percy Configured:** `.percyrc` with responsive widths
✅ **Tests Integrated:** 4 visual regression tests added
✅ **Documentation Complete:** This guide

**Next:** Run `npx percy exec -- npm run test:e2e` to create your first visual baselines!

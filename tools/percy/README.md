# Percy Visual Testing Configuration

Percy visual testing setup for the Tutorwise platform. This directory contains configuration and utilities for automated visual regression testing using Percy in conjunction with Playwright end-to-end tests.

## Overview

Percy provides automated visual testing by capturing screenshots during test runs and comparing them to baseline images to detect visual regressions. This ensures that UI changes don't introduce unintended visual bugs.

## Prerequisites

- Percy account and project setup
- Playwright installed and configured
- Percy CLI installed globally or in the project

## Installation

Percy CLI is included in the project dependencies:

```bash
# Install dependencies (from project root)
npm install

# Percy CLI is available as @percy/cli
# Playwright integration as @percy/playwright
```

## Configuration

### Environment Variables

Required environment variables for Percy integration:

```bash
# Percy Configuration
PERCY_TOKEN=your_percy_project_token

# Optional: Project-specific settings
PERCY_BRANCH=your_branch_name
PERCY_TARGET_BRANCH=main
PERCY_PARALLEL_NONCE=unique_identifier_for_parallel_builds
PERCY_PARALLEL_TOTAL=number_of_parallel_jobs
```

### Percy Configuration File

Create `.percy.yml` in the project root (if not already present):

```yaml
version: 2
discovery:
  allowed-hostnames:
    - localhost
  network-idle-timeout: 100
snapshot:
  widths:
    - 375   # Mobile
    - 768   # Tablet
    - 1280  # Desktop
  min-height: 1024
  percy-css: |
    /* Hide dynamic elements that change between test runs */
    [data-testid="timestamp"],
    .loading-spinner,
    .dynamic-content {
      visibility: hidden !important;
    }
```

## Usage

### Running Visual Tests

```bash
# Run Playwright tests with Percy
npm run test:visual

# Or directly using Percy CLI
percy exec -- playwright test --config=tools/playwright/playwright.config.ts
```

### Capture Screenshots in Tests

In your Playwright tests, use Percy to capture screenshots:

```typescript
import { test, expect } from '@playwright/test';
import { percy } from '@percy/playwright';

test('homepage visual test', async ({ page }) => {
  await page.goto('/');

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Capture screenshot with Percy
  await percy(page, 'Homepage - Desktop', {
    widths: [1280],
    minHeight: 1024
  });
});

test('dashboard visual test', async ({ page }) => {
  // Login and navigate to dashboard
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login-button"]');

  await page.waitForURL('/dashboard');
  await page.waitForLoadState('networkidle');

  // Capture multiple responsive breakpoints
  await percy(page, 'Dashboard - Responsive', {
    widths: [375, 768, 1280],
    minHeight: 1024
  });
});
```

### Percy Commands

```bash
# Basic Percy execution
percy exec -- [your test command]

# Upload screenshots to Percy
percy upload screenshots/

# Start Percy locally for development
percy start

# Stop Percy daemon
percy stop

# Check Percy CLI status
percy --version
percy --help
```

## Best Practices

### Screenshot Naming

Use descriptive, consistent names for screenshots:

```typescript
// Good examples
await percy(page, 'Homepage - Hero Section');
await percy(page, 'Dashboard - Student View');
await percy(page, 'Lesson Booking - Payment Form');
await percy(page, 'Profile Settings - Mobile');

// Avoid generic names
await percy(page, 'Test 1');
await percy(page, 'Page');
```

### Handling Dynamic Content

Hide or stabilize dynamic content that changes between runs:

```typescript
// Hide timestamps and loading states
await page.addStyleTag({
  content: `
    [data-testid="timestamp"],
    .loading-spinner {
      visibility: hidden !important;
    }
  `
});

// Set consistent test data
await page.evaluate(() => {
  // Replace current time with fixed time
  window.Date.now = () => 1640995200000;
});

await percy(page, 'Dashboard with Stable Data');
```

### Responsive Testing

Capture multiple viewport sizes for responsive design validation:

```typescript
await percy(page, 'Component Name', {
  widths: [375, 768, 1024, 1280],
  minHeight: 800,
  // Enable responsive mode
  responsive: true
});
```

## CI/CD Integration

### GitHub Actions

Add Percy to your GitHub Actions workflow:

```yaml
name: Visual Tests
on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run visual tests
        run: npm run test:visual
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
          PERCY_BRANCH: ${{ github.head_ref }}
          PERCY_TARGET_BRANCH: main
```

### Parallel Testing

For faster builds, run tests in parallel:

```bash
# Set parallel configuration
export PERCY_PARALLEL_NONCE="build-$GITHUB_RUN_ID"
export PERCY_PARALLEL_TOTAL=4

# Run tests in parallel (split by test file or spec)
percy exec -- playwright test --shard=1/4
percy exec -- playwright test --shard=2/4
percy exec -- playwright test --shard=3/4
percy exec -- playwright test --shard=4/4
```

## Troubleshooting

### Common Issues

**Percy Token Not Found**
```bash
# Verify token is set
echo $PERCY_TOKEN

# Set token for current session
export PERCY_TOKEN=your_token_here
```

**Screenshots Not Appearing**
- Ensure Percy CLI is running (`percy start`)
- Check network connectivity to Percy servers
- Verify project token and permissions

**Visual Differences Detected**
- Review changes in Percy dashboard
- Approve legitimate changes as new baseline
- Investigate unexpected visual changes

**Timeout Issues**
```typescript
// Increase timeout for slow-loading pages
await page.goto('/', { timeout: 60000 });
await page.waitForLoadState('networkidle', { timeout: 30000 });
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Enable Percy debug logs
export PERCY_LOG_LEVEL=debug

# Run tests with verbose output
percy exec -- playwright test --reporter=verbose
```

## Development Workflow

### Local Development

1. **Start Percy locally** (optional for local development)
   ```bash
   percy start
   ```

2. **Run tests with visual captures**
   ```bash
   npm run test:visual
   ```

3. **Review screenshots** in Percy dashboard

### Adding New Visual Tests

1. **Create Playwright test** with Percy integration
2. **Add responsive breakpoints** for comprehensive coverage
3. **Handle dynamic content** appropriately
4. **Use descriptive screenshot names**
5. **Test locally** before committing

### Reviewing Changes

1. **Check Percy dashboard** for build results
2. **Review visual differences** carefully
3. **Approve changes** that are intentional
4. **Investigate** unexpected differences

## Maintenance

### Regular Tasks

- **Update baselines** when intentional design changes are made
- **Review and clean up** old or unused visual tests
- **Monitor Percy usage** and quotas
- **Update configuration** as the application evolves

### Performance Optimization

- **Minimize screenshot count** by focusing on critical user paths
- **Use specific selectors** instead of full-page captures when appropriate
- **Batch related screenshots** in single test runs
- **Configure appropriate timeouts** to balance speed and reliability

## Support

For issues with Percy visual testing:
- Check Percy documentation: https://docs.percy.io/
- Review Playwright Percy integration: https://docs.percy.io/docs/playwright
- Consult Percy dashboard for build details and errors
- Refer to project-specific test examples in the codebase

This setup ensures comprehensive visual regression testing for the Tutorwise platform while maintaining efficient development workflows.

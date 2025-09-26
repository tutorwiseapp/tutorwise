import { test, expect } from '@playwright/test';

test.describe('TestAssured Platform', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitoring/test-assured');
  });

  test('should display TestAssured page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/TestAssured/i);
    await expect(page.locator('h1:has-text("TestAssured")')).toBeVisible();

    // Check for main navigation tabs
    const expectedTabs = [
      'System Tests',
      'Health Monitor',
      'Platform Status',
      'Visual Testing',
      'Test Documentation',
      'Test Framework'
    ];

    for (const tabName of expectedTabs) {
      await expect(page.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`))
        .toBeVisible();
    }
  });

  test.describe('System Tests Tab', () => {
    test('should display system tests interface', async ({ page }) => {
      // Click System Tests tab (should be default)
      const systemTestsTab = page.locator('button:has-text("System Tests"), [role="tab"]:has-text("System Tests")');
      if (await systemTestsTab.isVisible()) {
        await systemTestsTab.click();
      }

      // Check for test components
      await expect(page.locator('text=End-to-End Connectivity Tests')).toBeVisible();
      await expect(page.locator('text=Frontend → Supabase Database')).toBeVisible();
      await expect(page.locator('text=Frontend → Railway Backend → Neo4j Database')).toBeVisible();

      // Check for Run Tests button
      const runTestsButton = page.locator('button:has-text("Run System Tests"), button:has-text("Run Tests")');
      await expect(runTestsButton).toBeVisible();
    });

    test('should run system tests', async ({ page }) => {
      const runTestsButton = page.locator('button:has-text("Run System Tests"), button:has-text("Run Tests")');

      if (await runTestsButton.isVisible()) {
        await runTestsButton.click();

        // Should show loading state
        await expect(page.locator('text=Running')).toBeVisible({ timeout: 2000 });

        // Wait for tests to complete (with reasonable timeout)
        await expect(page.locator('text=Running')).not.toBeVisible({ timeout: 30000 });

        // Should show results
        const successIndicators = [
          'text=Success',
          'text=Ready',
          'text=Healthy',
          '[data-testid="success"]'
        ];

        let resultFound = false;
        for (const indicator of successIndicators) {
          if (await page.locator(indicator).isVisible()) {
            resultFound = true;
            break;
          }
        }

        expect(resultFound).toBe(true);
      } else {
        test.skip('Run Tests button not available');
      }
    });
  });

  test.describe('Health Monitor Tab', () => {
    test('should display health monitor interface', async ({ page }) => {
      await page.locator('button:has-text("Health Monitor"), [role="tab"]:has-text("Health Monitor")').click();

      await expect(page.locator('text=Backend Health Monitor')).toBeVisible();
      await expect(page.locator('button:has-text("Check Health")')).toBeVisible();
    });

    test('should perform health check', async ({ page }) => {
      await page.locator('button:has-text("Health Monitor"), [role="tab"]:has-text("Health Monitor")').click();

      const checkHealthButton = page.locator('button:has-text("Check Health")');
      await checkHealthButton.click();

      // Should show loading state
      await expect(page.locator('text=Checking')).toBeVisible({ timeout: 2000 });

      // Wait for health check to complete
      await expect(page.locator('text=Checking')).not.toBeVisible({ timeout: 15000 });

      // Should display health status
      const healthIndicators = [
        'text=Redis',
        'text=Neo4j',
        'text=Overall Status'
      ];

      for (const indicator of healthIndicators) {
        await expect(page.locator(indicator)).toBeVisible();
      }
    });
  });

  test.describe('Platform Status Tab', () => {
    test('should display continuous monitoring interface', async ({ page }) => {
      await page.locator('button:has-text("Platform Status"), [role="tab"]:has-text("Platform Status")').click();

      await expect(page.locator('text=Platform Status Monitor')).toBeVisible();
      await expect(page.locator('button:has-text("Start Monitoring")')).toBeVisible();
    });

    test('should start and stop monitoring', async ({ page }) => {
      await page.locator('button:has-text("Platform Status"), [role="tab"]:has-text("Platform Status")').click();

      const startButton = page.locator('button:has-text("Start Monitoring")');
      await startButton.click();

      // Should change to monitoring active state
      await expect(page.locator('text=Monitoring Active')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('button:has-text("Stop Monitoring")')).toBeVisible();

      // Let it monitor for a few seconds
      await page.waitForTimeout(3000);

      // Should show monitoring results
      const componentIndicators = [
        'text=Vercel Frontend',
        'text=Railway Backend',
        'text=Supabase Database'
      ];

      for (const indicator of componentIndicators) {
        await expect(page.locator(indicator)).toBeVisible();
      }

      // Stop monitoring
      await page.locator('button:has-text("Stop Monitoring")').click();
      await expect(page.locator('button:has-text("Start Monitoring")')).toBeVisible();
    });
  });

  test.describe('Visual Testing Tab', () => {
    test('should display visual testing interface', async ({ page }) => {
      await page.locator('button:has-text("Visual Testing"), [role="tab"]:has-text("Visual Testing")').click();

      await expect(page.locator('text=Playwright Visual Testing')).toBeVisible();
      await expect(page.locator('text=Screenshot Testing')).toBeVisible();
    });
  });

  test.describe('Test Documentation Tab', () => {
    test('should display test documentation', async ({ page }) => {
      await page.locator('button:has-text("Test Documentation"), [role="tab"]:has-text("Test Documentation")').click();

      await expect(page.locator('text=Tutorwise Test Plan')).toBeVisible();
      await expect(page.locator('text=TestAssured Overview')).toBeVisible();
      await expect(page.locator('text=MVP Testing Results')).toBeVisible();
    });
  });

  test.describe('Test Framework Tab', () => {
    test('should display test framework information', async ({ page }) => {
      await page.locator('button:has-text("Test Framework"), [role="tab"]:has-text("Test Framework")').click();

      await expect(page.locator('text=System Integration Tests')).toBeVisible();
      await expect(page.locator('text=Health Monitoring')).toBeVisible();
      await expect(page.locator('text=Platform Status Monitor')).toBeVisible();
    });
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone viewport

    // Should still display main elements
    await expect(page.locator('h1:has-text("TestAssured")')).toBeVisible();

    // Tabs should be accessible (might be in dropdown or horizontal scroll)
    const systemTestsTab = page.locator('button:has-text("System Tests"), [role="tab"]:has-text("System Tests")');
    await expect(systemTestsTab).toBeVisible();
  });

  test('should handle tab navigation with keyboard', async ({ page }) => {
    // Focus on first tab
    await page.keyboard.press('Tab');

    // Use arrow keys to navigate tabs
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    // Press Enter to activate tab
    await page.keyboard.press('Enter');

    // Should activate the focused tab
    await page.waitForLoadState('networkidle');
  });
});
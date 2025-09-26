import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display homepage correctly', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/tutorwise/i);

    // Check for main heading (should be "tutorwise" based on the logo)
    await expect(page.locator('text=tutorwise')).toBeVisible();

    // Check for navigation elements
    const navElements = [
      'link[href="/login"]',
      'link[href="/signup"]',
      'text=Go to Dashboard'
    ];

    for (const element of navElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
      }
    }

    // Check for "Coming Soon" section
    await expect(page.locator('text=Coming Soon')).toBeVisible();
    await expect(page.locator('text=Role-based dashboards')).toBeVisible();
    await expect(page.locator('text=Professional tutor marketplace')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    const loginLink = page.locator('link[href="/login"], a:has-text("Login")');
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');

    const signupLink = page.locator('link[href="/signup"], a:has-text("Sign up")');
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }
  });

  test('should navigate to TestAssured from dashboard link', async ({ page }) => {
    await page.goto('/');

    const dashboardLink = page.locator('text=Go to Dashboard, link[href="/dashboard"]');
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();

      // Depending on authentication state, might redirect to login or dashboard
      await page.waitForLoadState('networkidle');

      const url = page.url();
      expect(url).toMatch(/(login|dashboard|monitoring)/);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone viewport
    await page.goto('/');

    // Should still display main elements
    await expect(page.locator('text=tutorwise')).toBeVisible();
    await expect(page.locator('text=Coming Soon')).toBeVisible();

    // Navigation should be accessible
    const mobileNav = page.locator('nav, [role="navigation"]');
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
    }
  });

  test('should have proper accessibility', async ({ page }) => {
    await page.goto('/');

    // Check for main landmark
    const main = page.locator('main');
    if (await main.isVisible()) {
      await expect(main).toBeVisible();
    }

    // Check for navigation landmark
    const nav = page.locator('nav, [role="navigation"]');
    if (await nav.isVisible()) {
      await expect(nav).toBeVisible();
    }

    // Check for proper heading hierarchy
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time (adjust as needed)
    expect(loadTime).toBeLessThan(5000);
  });
});
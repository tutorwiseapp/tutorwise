import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete full onboarding flow for new user', async ({ page }) => {
    // This test assumes we can create/login a test user
    // In a real scenario, you'd have test user management

    // Step 1: Navigate to signup/login and create new user
    await page.click('[data-testid="signup-button"]', { timeout: 5000 }).catch(() => {
      // If signup button doesn't exist, try login
      return page.click('[data-testid="login-button"]');
    });

    // For demo purposes, assuming onboarding appears after login
    // In reality, you'd complete actual authentication flow

    // Step 2: Onboarding welcome step should appear
    await expect(page.locator('[data-testid="onboarding-modal"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Welcome to Tutorwise')).toBeVisible();

    // Click "Let's get started"
    await page.click('text=Let\'s get started');

    // Step 3: Role selection step
    await expect(page.locator('text=How do you want to use Tutorwise?')).toBeVisible();

    // Select Student role
    await page.click('text=Student');
    await expect(page.locator('[class*="border-blue-500"]')).toBeVisible();

    // Select Tutor role as well (multi-role)
    await page.click('text=Tutor');

    // Continue to next step
    await page.click('text=Continue');

    // Step 4: Role details for Student
    await expect(page.locator('text=Student Profile Setup')).toBeVisible();

    // Select subjects
    await page.click('text=Mathematics');
    await page.click('text=Science');

    // Set skill levels (click rating buttons)
    await page.click('[data-subject="Mathematics"] [data-rating="3"]');
    await page.click('[data-subject="Science"] [data-rating="2"]');

    // Fill student-specific fields
    await page.fill('[data-testid="budget-range"]', '£20-35');
    await page.fill('[data-testid="availability-hours"]', '10');

    // Continue to next role
    await page.click('text=Next Role');

    // Step 5: Role details for Tutor
    await expect(page.locator('text=Tutor Profile Setup')).toBeVisible();

    // Select teaching subjects
    await page.click('text=Mathematics');
    await page.click('text=Programming');

    // Fill tutor-specific fields
    await page.fill('[data-testid="teaching-experience"]', '5');
    await page.fill('[data-testid="hourly-rate"]', '35.00');

    // Complete setup
    await page.click('text=Complete Setup');

    // Step 6: Completion screen
    await expect(page.locator('text=You\'re all set!')).toBeVisible();
    await expect(page.locator('text=Student')).toBeVisible();
    await expect(page.locator('text=Tutor')).toBeVisible();

    // Go to dashboard
    await page.click('text=Go to Dashboard');

    // Step 7: Verify we're on dashboard and onboarding is complete
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 5000 });

    // Verify role switcher is available
    await expect(page.locator('[data-testid="role-switcher"]')).toBeVisible();
  });

  test('should allow skipping onboarding', async ({ page }) => {
    // Navigate to onboarding (assuming test user setup)
    await page.goto('/onboarding'); // Direct navigation for test

    // Wait for onboarding modal
    await expect(page.locator('[data-testid="onboarding-modal"]')).toBeVisible();

    // Click skip on welcome step
    await page.click('text=Skip for now');

    // Should go to dashboard with default settings
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should persist progress and allow resuming onboarding', async ({ page }) => {
    // Start onboarding
    await page.goto('/onboarding');
    await expect(page.locator('[data-testid="onboarding-modal"]')).toBeVisible();

    // Complete welcome step
    await page.click('text=Let\'s get started');

    // Complete role selection
    await page.click('text=Student');
    await page.click('text=Continue');

    // Navigate away (simulate browser close/reopen)
    await page.goto('/dashboard');

    // Return to onboarding - should resume from role details step
    await page.goto('/onboarding');
    await expect(page.locator('text=Student Profile Setup')).toBeVisible();
  });

  test('should handle role switching after onboarding', async ({ page }) => {
    // Assume user has completed onboarding with multiple roles
    await page.goto('/dashboard');

    // Look for role switcher
    const roleSwitcher = page.locator('[data-testid="role-switcher"]');
    await expect(roleSwitcher).toBeVisible();

    // Current role should be displayed
    await expect(roleSwitcher.locator('text=Student')).toBeVisible();

    // Click to open role switcher dropdown
    await roleSwitcher.click();

    // Switch to Tutor role
    await page.click('text=Tutor');

    // Verify role switch
    await expect(roleSwitcher.locator('text=Tutor')).toBeVisible();

    // Dashboard should update for tutor view
    await expect(page.locator('[data-testid="tutor-dashboard"]')).toBeVisible();
  });

  test('should validate form inputs during onboarding', async ({ page }) => {
    await page.goto('/onboarding');

    // Go through to role details
    await page.click('text=Let\'s get started');
    await page.click('text=Tutor');
    await page.click('text=Continue');

    // Try to continue without filling required fields
    await page.click('text=Complete Setup');

    // Should show validation errors or prevent progression
    await expect(page.locator('text=Tutor Profile Setup')).toBeVisible(); // Still on same step

    // Fill valid data
    await page.click('text=Mathematics');
    await page.fill('[data-testid="teaching-experience"]', '3');
    await page.fill('[data-testid="hourly-rate"]', '25.00');

    // Now should be able to continue
    await page.click('text=Complete Setup');
    await expect(page.locator('text=You\'re all set!')).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/onboarding');

    // Onboarding should be responsive
    await expect(page.locator('[data-testid="onboarding-modal"]')).toBeVisible();

    // Check that content fits and is scrollable
    const modal = page.locator('[data-testid="onboarding-modal"]');
    await expect(modal).toHaveCSS('max-height', /90vh/);

    // Complete onboarding on mobile
    await page.click('text=Let\'s get started');
    await page.click('text=Student');
    await page.click('text=Continue');

    // Role selection should work on mobile
    await page.click('text=Mathematics');
    await page.click('text=Complete Setup');

    await expect(page.locator('text=You\'re all set!')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('/api/profile', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/onboarding');

    // Start onboarding
    await page.click('text=Let\'s get started');
    await page.click('text=Student');
    await page.click('text=Continue');
    await page.click('text=Mathematics');
    await page.click('text=Complete Setup');

    // Should show error message
    await expect(page.locator('text=Failed to save')).toBeVisible();

    // User should be able to retry
    await expect(page.locator('text=Complete Setup')).toBeEnabled();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/onboarding');

    // Tab through onboarding elements
    await page.keyboard.press('Tab'); // Skip button
    await page.keyboard.press('Tab'); // Let's get started button
    await page.keyboard.press('Enter'); // Activate button

    // Role selection with keyboard
    await expect(page.locator('text=How do you want to use Tutorwise?')).toBeVisible();

    await page.keyboard.press('Tab'); // First role card
    await page.keyboard.press('Space'); // Select role

    await page.keyboard.press('Tab'); // Continue button (multiple tabs may be needed)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Continue

    // Should progress to next step
    await expect(page.locator('text=Student Profile Setup')).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';
import { AuthHelper, testUsers } from './fixtures/auth';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start logged out
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/login/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display signup page', async ({ page }) => {
    await page.goto('/signup');

    await expect(page).toHaveTitle(/sign.*up|register/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle invalid login credentials', async ({ page }) => {
    const authHelper = new AuthHelper(page);

    await page.goto('/login');
    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message and stay on login page
    await expect(page.locator('text=invalid')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should navigate between login and signup', async ({ page }) => {
    await page.goto('/login');

    // Look for signup link
    const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Create account")');
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }

    // Look for login link from signup
    const loginLink = page.locator('a:has-text("Sign in"), a:has-text("Login"), a:has-text("Already have")');
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });

  test('should handle form validation', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors (check for common validation messages)
    const validationSelectors = [
      'text=required',
      'text=email',
      'text=password',
      '[aria-invalid="true"]',
      '.error',
      '.invalid'
    ];

    let validationFound = false;
    for (const selector of validationSelectors) {
      if (await page.locator(selector).isVisible()) {
        validationFound = true;
        break;
      }
    }

    expect(validationFound).toBe(true);
  });

  test('should maintain session across page reloads', async ({ page }) => {
    // Skip this test if we don't have test credentials
    test.skip(!process.env.TEST_EMAIL, 'No test credentials available');

    const authHelper = new AuthHelper(page);
    const testUser = testUsers.student;

    await authHelper.login(testUser);

    // Reload the page
    await page.reload();

    // Should still be logged in (not redirected to login)
    await page.waitForLoadState('networkidle');
    const isLoggedIn = await authHelper.isLoggedIn();
    expect(isLoggedIn).toBe(true);
  });

  test.describe('Password Reset Flow', () => {
    test('should display forgot password page', async ({ page }) => {
      await page.goto('/login');

      // Look for forgot password link
      const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Reset password")');

      if (await forgotLink.isVisible()) {
        await forgotLink.click();

        // Should navigate to password reset page
        await expect(page).toHaveURL(/reset|forgot/);
        await expect(page.locator('input[name="email"]')).toBeVisible();
      } else {
        test.skip('Forgot password functionality not available');
      }
    });
  });
});
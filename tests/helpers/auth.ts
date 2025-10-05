import { Page } from '@playwright/test';

/**
 * Authentication helper for Playwright E2E tests
 *
 * Provides utilities to authenticate test users with different roles
 * for testing role-specific features like Professional Info forms.
 */

export interface TestUser {
  email: string;
  password: string;
  role: 'provider' | 'seeker' | 'agent';
  name: string;
}

/**
 * Test user credentials
 *
 * IMPORTANT: These should be dedicated test accounts in Supabase test project
 * Do NOT use production accounts for testing
 */
export const TEST_USERS: Record<string, TestUser> = {
  tutor: {
    email: process.env.TEST_TUTOR_EMAIL || 'test-tutor@tutorwise.com',
    password: process.env.TEST_TUTOR_PASSWORD || 'TestPassword123!',
    role: 'provider',
    name: 'Test Tutor',
  },
  client: {
    email: process.env.TEST_CLIENT_EMAIL || 'test-client@tutorwise.com',
    password: process.env.TEST_CLIENT_PASSWORD || 'TestPassword123!',
    role: 'seeker',
    name: 'Test Client',
  },
  agent: {
    email: process.env.TEST_AGENT_EMAIL || 'test-agent@tutorwise.com',
    password: process.env.TEST_AGENT_PASSWORD || 'TestPassword123!',
    role: 'agent',
    name: 'Test Agent',
  },
};

/**
 * Login as a test user via the login page
 *
 * @param page - Playwright page object
 * @param userType - Type of user to login as ('tutor', 'client', 'agent')
 * @param baseURL - Base URL of the application (defaults to localhost:3000)
 * @returns Promise that resolves when login is complete
 *
 * @example
 * ```typescript
 * test('tutor can view professional info', async ({ page }) => {
 *   await loginAsUser(page, 'tutor');
 *   await page.goto('/account/professional-info');
 *   // ... test tutor-specific functionality
 * });
 * ```
 */
export async function loginAsUser(
  page: Page,
  userType: keyof typeof TEST_USERS,
  baseURL: string = 'http://localhost:3000'
): Promise<void> {
  const user = TEST_USERS[userType];

  // Navigate to login page
  await page.goto(`${baseURL}/login`);

  // Wait for login form to be visible
  await page.waitForSelector('input[name="email"], input[type="email"]', {
    timeout: 10000,
  });

  // Fill in credentials
  const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for navigation to complete (redirects to dashboard, home, or onboarding)
  await page.waitForURL(/.*(?:dashboard|home|onboarding|\/)/, {
    timeout: 15000,
    waitUntil: 'load',
  });

  // Wait a moment for page to fully load
  await page.waitForTimeout(1000);

  // Verify login was successful by checking for authenticated elements
  // This could be the user avatar, menu, or dashboard content
  try {
    await page.waitForSelector('img[alt*="avatar"], [data-testid="user-menu"], button:has-text("Log Out")', {
      timeout: 5000,
    });
  } catch {
    // If none of those elements are found, check if we're on an authenticated page
    const url = page.url();
    if (!url.includes('login') && !url.includes('signup')) {
      // We're logged in, just on a different page
      console.log(`Logged in successfully, redirected to: ${url}`);
    } else {
      throw new Error(`Login may have failed - still on login/signup page: ${url}`);
    }
  }
}

/**
 * Login as a tutor (provider role)
 * Convenience wrapper for loginAsUser
 */
export async function loginAsTutor(page: Page, baseURL?: string): Promise<void> {
  await loginAsUser(page, 'tutor', baseURL);
}

/**
 * Login as a client (seeker role)
 * Convenience wrapper for loginAsUser
 */
export async function loginAsClient(page: Page, baseURL?: string): Promise<void> {
  await loginAsUser(page, 'client', baseURL);
}

/**
 * Login as an agent
 * Convenience wrapper for loginAsUser
 */
export async function loginAsAgent(page: Page, baseURL?: string): Promise<void> {
  await loginAsUser(page, 'agent', baseURL);
}

/**
 * Logout the current user
 *
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button or link
  const logoutButton = page.locator('button:has-text("Log Out"), a:has-text("Log Out"), [data-testid="logout"]').first();

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/.*login/, { timeout: 5000 });
  } else {
    // If no logout button found, clear cookies and local storage
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  }
}

/**
 * Check if user is currently logged in
 *
 * @param page - Playwright page object
 * @returns Promise<boolean> - true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('button:has-text("Log Out"), [data-testid="user-menu"]', {
      timeout: 2000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Setup authentication state for tests
 * Can be used with Playwright's storage state feature
 *
 * @param page - Playwright page object
 * @param userType - Type of user to authenticate as
 * @returns Promise that resolves to storage state
 */
export async function setupAuthState(page: Page, userType: keyof typeof TEST_USERS) {
  await loginAsUser(page, userType);
  return await page.context().storageState();
}

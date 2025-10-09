import { test, expect } from '@playwright/test';
import { loginAsTutor } from '../helpers/auth'; // Assuming auth.ts is in tests/helpers

const BASE_URL = 'http://localhost:3000'; // Explicitly define BASE_URL

test('should navigate to the home page', async ({ page }) => { // Removed baseURL from parameters
  await page.goto(BASE_URL);
  await expect(page).toHaveURL(BASE_URL);
  await expect(page.locator('body')).toBeVisible();
});

test('should login as tutor and navigate to professional info', async ({ page }) => { // Removed baseURL from parameters
  await loginAsTutor(page, BASE_URL); // Pass BASE_URL explicitly
  await page.waitForLoadState('networkidle'); // Ensure page is fully loaded after login redirect
  await page.goto(`${BASE_URL}/account/professional-info`);
  await expect(page).toHaveURL(/.*account\/professional-info/);
  await expect(page.getByText('Professional Information')).toBeVisible(); // Check for an element on the page
});

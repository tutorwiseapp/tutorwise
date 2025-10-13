// tests/e2e/app.spec.ts
import { test, expect } from '@playwright/test';

test('homepage has a header with the correct title', async ({ page }) => {
  await page.goto('/');

  const header = page.locator('header');
  await expect(header).toBeVisible();

  const title = header.locator('h1');
  await expect(title).toHaveText('CAS Manager');
});

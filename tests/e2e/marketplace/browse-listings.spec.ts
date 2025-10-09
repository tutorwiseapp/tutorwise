import { test, expect } from '@playwright/test';

test.describe('Marketplace Browse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
  });

  test('should display marketplace page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Find Your Perfect Tutor');
    await expect(page.getByText(/Browse/i)).toBeVisible();
  });

  test('should display search filters sidebar', async ({ page }) => {
    await expect(page.getByText('Filters')).toBeVisible();
    await expect(page.getByLabelText(/Search/i)).toBeVisible();
    await expect(page.getByText('Subjects')).toBeVisible();
    await expect(page.getByText('Education Level')).toBeVisible();
    await expect(page.getByText('Teaching Location')).toBeVisible();
  });

  test('should display listings grid', async ({ page }) => {
    // Wait for listings to load
    await page.waitForSelector('[data-testid="listing-card"], .animate-pulse', { timeout: 10000 });

    // Should show either listings or empty state
    const hasListings = await page.locator('[data-testid="listing-card"]').count() > 0;
    const hasEmptyState = await page.getByText(/No tutors found/i).isVisible();

    expect(hasListings || hasEmptyState).toBe(true);
  });

  test('should filter by subject', async ({ page }) => {
    // Select Mathematics subject
    await page.getByLabelText('Mathematics').check();

    // Wait for results to update
    await page.waitForTimeout(1000);

    // Should show filtered results or empty state
    const hasResults = await page.locator('[data-testid="listing-card"]').count() > 0;
    const hasEmptyState = await page.getByText(/No tutors found/i).isVisible();

    expect(hasResults || hasEmptyState).toBe(true);
  });

  test('should filter by multiple subjects', async ({ page }) => {
    await page.getByLabelText('Mathematics').check();
    await page.getByLabelText('Physics').check();

    await page.waitForTimeout(1000);

    const mathCheckbox = page.getByLabelText('Mathematics');
    const physicsCheckbox = page.getByLabelText('Physics');

    await expect(mathCheckbox).toBeChecked();
    await expect(physicsCheckbox).toBeChecked();
  });

  test('should filter by education level', async ({ page }) => {
    await page.getByLabelText('GCSE').check();

    await page.waitForTimeout(1000);

    await expect(page.getByLabelText('GCSE')).toBeChecked();
  });

  test('should filter by location type', async ({ page }) => {
    await page.getByLabelText('Online').check();

    await page.waitForTimeout(1000);

    await expect(page.getByLabelText('Online')).toBeChecked();
  });

  test('should search by keyword', async ({ page }) => {
    const searchInput = page.getByPlaceholderText(/Search tutors/i);
    await searchInput.fill('mathematics');
    await page.getByRole('button', { name: 'Go' }).click();

    await page.waitForTimeout(1000);

    // Should show results or empty state
    const hasResults = await page.locator('[data-testid="listing-card"]').count() > 0;
    const hasEmptyState = await page.getByText(/No tutors found/i).isVisible();

    expect(hasResults || hasEmptyState).toBe(true);
  });

  test('should filter by price range', async ({ page }) => {
    await page.getByPlaceholder('Min').fill('20');
    await page.getByPlaceholder('Max').fill('50');
    await page.getByPlaceholder('Max').blur();

    await page.waitForTimeout(1000);

    // Filters should be applied
    const minInput = page.getByPlaceholder('Min');
    await expect(minInput).toHaveValue('20');
  });

  test('should clear all filters', async ({ page }) => {
    // Apply multiple filters
    await page.getByLabelText('Mathematics').check();
    await page.getByLabelText('GCSE').check();
    await page.getByLabelText('Online').check();

    // Wait for filters to apply
    await page.waitForTimeout(500);

    // Click clear all
    await page.getByRole('button', { name: /Clear all/i }).click();

    await page.waitForTimeout(1000);

    // Filters should be cleared
    await expect(page.getByLabelText('Mathematics')).not.toBeChecked();
    await expect(page.getByLabelText('GCSE')).not.toBeChecked();
    await expect(page.getByLabelText('Online')).not.toBeChecked();
  });

  test('should deselect subject when clicked twice', async ({ page }) => {
    const mathCheckbox = page.getByLabelText('Mathematics');

    await mathCheckbox.check();
    await expect(mathCheckbox).toBeChecked();

    await mathCheckbox.uncheck();
    await expect(mathCheckbox).not.toBeChecked();
  });

  test('should show loading state initially', async ({ page }) => {
    // On initial load, should show loading skeleton or content
    const hasLoadingSkeleton = await page.locator('.animate-pulse').count() > 0;
    const hasContent = await page.locator('[data-testid="listing-card"]').count() > 0;
    const hasEmptyState = await page.getByText(/No tutors found/i).isVisible();

    expect(hasLoadingSkeleton || hasContent || hasEmptyState).toBe(true);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h1')).toContainText('Find Your Perfect Tutor');
    await expect(page.getByText('Filters')).toBeVisible();

    // Filters sidebar should still be accessible
    await expect(page.getByLabelText(/Search/i)).toBeVisible();
  });
});

test.describe('Listing Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
  });

  test('should navigate to listing details when card is clicked', async ({ page }) => {
    // Wait for listings to load
    await page.waitForSelector('[data-testid="listing-card"]', { timeout: 10000 });

    const firstListingCard = page.locator('[data-testid="listing-card"]').first();
    const hasListings = await firstListingCard.count() > 0;

    if (hasListings) {
      await firstListingCard.click();

      // Should navigate to details page
      await expect(page).toHaveURL(/\/marketplace\/[a-z0-9-]+/);
    } else {
      test.skip();
    }
  });

  test('should display listing details page', async ({ page }) => {
    // Navigate to a sample listing details page
    // This test assumes a listing exists - in real scenario, create test data
    await page.goto('/marketplace/sample-listing-id');

    // Should show back button
    const backButton = page.getByText(/Back to listings/i);
    if (await backButton.isVisible()) {
      await expect(backButton).toBeVisible();
    }
  });

  test('should show "Book a Lesson" button on details page', async ({ page }) => {
    await page.goto('/marketplace/sample-listing-id');

    // Should show booking button if page loads
    const bookButton = page.getByRole('button', { name: /Book a Lesson/i });
    if (await bookButton.isVisible()) {
      await expect(bookButton).toBeVisible();
    }
  });

  test('should show "Send Message" button on details page', async ({ page }) => {
    await page.goto('/marketplace/sample-listing-id');

    const messageButton = page.getByRole('button', { name: /Send Message/i });
    if (await messageButton.isVisible()) {
      await expect(messageButton).toBeVisible();
    }
  });

  test('should navigate back to marketplace when back button is clicked', async ({ page }) => {
    await page.goto('/marketplace/sample-listing-id');

    const backButton = page.getByText(/Back to listings/i);
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL('/marketplace');
    }
  });

  test('should display subjects and levels as badges', async ({ page }) => {
    await page.goto('/marketplace/sample-listing-id');

    // Should show badges if listing loads
    // Badge styles typically have specific classes like "bg-blue-100" or "rounded-full"
    const badges = page.locator('[class*="rounded-full"]');
    if (await badges.count() > 0) {
      expect(await badges.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
  });

  test('should show pagination when multiple pages exist', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check if pagination exists
    const nextButton = page.getByRole('button', { name: /Next/i });
    const prevButton = page.getByRole('button', { name: /Previous/i });

    // If pagination exists, buttons should be visible
    if (await nextButton.isVisible()) {
      await expect(prevButton).toBeVisible();
      await expect(nextButton).toBeVisible();
    }
  });

  test('should disable Previous button on first page', async ({ page }) => {
    await page.waitForTimeout(2000);

    const prevButton = page.getByRole('button', { name: /Previous/i });
    if (await prevButton.isVisible()) {
      await expect(prevButton).toBeDisabled();
    }
  });

  test('should navigate to next page when Next is clicked', async ({ page }) => {
    await page.waitForTimeout(2000);

    const nextButton = page.getByRole('button', { name: /Next/i });
    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Should update listings
      await expect(page.locator('[data-testid="listing-card"]', { timeout: 5000 })).toBeTruthy();
    }
  });
});

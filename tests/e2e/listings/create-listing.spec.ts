import { test, expect } from '@playwright/test';

test.describe('Create Listing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Add authentication helper once test user is set up
    // await login(page, 'tutor@example.com', 'password');
    await page.goto('/listings/create');
  });

  test('should display create listing form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Create New Listing');
    await expect(page.getByText('Basic Information')).toBeVisible();
    await expect(page.getByText('What You Teach')).toBeVisible();
    await expect(page.getByText('Pricing')).toBeVisible();
    await expect(page.getByText('Location & Availability')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling required fields
    await page.click('text=Publish Listing');

    // Should show validation errors
    await expect(page.getByText(/Title must be at least 10 characters/i)).toBeVisible();
    await expect(page.getByText(/Description must be at least 50 characters/i)).toBeVisible();
    await expect(page.getByText(/Select at least one subject/i)).toBeVisible();
    await expect(page.getByText(/Select at least one level/i)).toBeVisible();
  });

  test('should create listing with valid data', async ({ page }) => {
    // Fill in basic info
    await page.fill('input[id="title"]', 'Experienced Mathematics Tutor - GCSE & A-Level Specialist');
    await page.fill('textarea[id="description"]', 'I am an experienced mathematics tutor with over 10 years of teaching experience. I specialize in helping students achieve top grades in GCSE and A-Level mathematics through personalized learning approaches.');

    // Select subjects
    await page.click('text=Mathematics');
    await page.click('text=Physics');

    // Select levels
    await page.click('text=GCSE');
    await page.click('text=A-Level');

    // Set pricing
    await page.fill('input[id="hourly_rate"]', '35');

    // Set location
    await page.selectOption('select[id="location_type"]', 'online');

    // Submit
    await page.click('text=Publish Listing');

    // Should redirect to edit page or listings page
    await expect(page).toHaveURL(/\/listings\/.+/);
  });

  test('should save as draft', async ({ page }) => {
    // Fill minimum required fields
    await page.fill('input[id="title"]', 'Draft Listing Title Goes Here');
    await page.fill('textarea[id="description"]', 'This is a draft description with enough characters to meet the minimum requirement for validation.');

    await page.click('text=Mathematics');
    await page.click('text=GCSE');

    // Save as draft
    await page.click('text=Save as Draft');

    // Should redirect and show success
    await expect(page).toHaveURL(/\/listings/);
  });

  test('should toggle free trial option', async ({ page }) => {
    // Free trial option should not be visible initially
    await expect(page.getByLabel(/Trial Duration/i)).not.toBeVisible();

    // Click free trial checkbox
    await page.click('input[id="free_trial"]');

    // Trial duration should now be visible
    await expect(page.getByLabel(/Trial Duration/i)).toBeVisible();
  });

  test('should show location fields for in-person teaching', async ({ page }) => {
    // City and postcode should not be visible for online
    await expect(page.getByLabel(/City/i)).not.toBeVisible();
    await expect(page.getByLabel(/Postcode/i)).not.toBeVisible();

    // Change to in-person
    await page.selectOption('select[id="location_type"]', 'in_person');

    // City and postcode should now be visible
    await expect(page.getByLabel(/City/i)).toBeVisible();
    await expect(page.getByLabel(/Postcode/i)).toBeVisible();
  });

  test('should show location fields for hybrid teaching', async ({ page }) => {
    // Change to hybrid
    await page.selectOption('select[id="location_type"]', 'hybrid');

    // City and postcode should be visible
    await expect(page.getByLabel(/City/i)).toBeVisible();
    await expect(page.getByLabel(/Postcode/i)).toBeVisible();
  });

  test('should update character counters', async ({ page }) => {
    await expect(page.getByText('0/200 characters')).toBeVisible();

    await page.fill('input[id="title"]', 'Test Title');

    await expect(page.getByText('10/200 characters')).toBeVisible();
  });

  test('should handle cancel action', async ({ page }) => {
    await page.click('text=Cancel');

    // Should redirect to listings page
    await expect(page).toHaveURL('/listings');
  });

  test('should select multiple subjects and levels', async ({ page }) => {
    // Select multiple subjects
    await page.click('text=Mathematics');
    await page.click('text=Physics');
    await page.click('text=Chemistry');

    // Select multiple levels
    await page.click('text=GCSE');
    await page.click('text=A-Level');
    await page.click('text=University');

    // All should be selected (have aria-pressed="true")
    await expect(page.locator('button:has-text("Mathematics")'))
      .toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('button:has-text("Physics")'))
      .toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('button:has-text("GCSE")'))
      .toHaveAttribute('aria-pressed', 'true');
  });

  test('should deselect subject when clicked twice', async ({ page }) => {
    await page.click('text=Mathematics');
    await expect(page.locator('button:has-text("Mathematics")'))
      .toHaveAttribute('aria-pressed', 'true');

    await page.click('text=Mathematics');
    await expect(page.locator('button:has-text("Mathematics")'))
      .toHaveAttribute('aria-pressed', 'false');
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h1')).toContainText('Create New Listing');
    await expect(page.getByText('Basic Information')).toBeVisible();

    // Form should still be usable
    await page.fill('input[id="title"]', 'Mobile Test Listing Title');
    await expect(page.locator('input[id="title"]')).toHaveValue('Mobile Test Listing Title');
  });
});

test.describe('Manage Listings Page', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Add authentication
    await page.goto('/listings');
  });

  test('should display listings page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('My Listings');
    await expect(page.getByRole('link', { name: /Create New Listing/i })).toBeVisible();
  });

  test('should show empty state when no listings', async ({ page }) => {
    // If user has no listings
    const noListingsText = page.getByText(/You haven't created any listings yet/i);
    if (await noListingsText.isVisible()) {
      await expect(noListingsText).toBeVisible();
      await expect(page.getByRole('button', { name: /Create Your First Listing/i })).toBeVisible();
    }
  });

  test('should navigate to create listing page', async ({ page }) => {
    await page.click('text=Create New Listing');
    await expect(page).toHaveURL('/listings/create');
  });
});

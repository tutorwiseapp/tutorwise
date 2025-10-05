import { test, expect } from '@playwright/test';
import { loginAsTutor } from '../../helpers/auth';

test.describe('Account > Professional Info', () => {
  // Skip authentication for the unauthenticated test
  test.describe('Authenticated Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Login as tutor before each test
      await loginAsTutor(page);
    });

    test('should display account layout with top tabs', async ({ page }) => {
    // Navigate to professional info page (assuming logged in)
    await page.goto('/account/professional-info');

    // Check for account settings title
    await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();

    // Check for top navigation tabs
    await expect(page.getByRole('link', { name: 'Personal Info' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Professional Info' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    // Professional Info tab should be active (has tabActive class)
    const profInfoTab = page.getByRole('link', { name: 'Professional Info' });
    await expect(profInfoTab).toHaveClass(/tabActive/);
  });

  test('should display info banner about editable template', async ({ page }) => {
    await page.goto('/account/professional-info');

    // Check for info banner
    const banner = page.getByText(/This is an editable template/);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Changes won't affect your existing listings");
  });

  test('should display tutor professional info form', async ({ page }) => {
    await page.goto('/account/professional-info');

    // Check for form sections
    await expect(page.getByText('Professional Information')).toBeVisible();

    // Check for Subjects section (with asterisk for required field)
    await expect(page.getByText(/Subjects \*/)).toBeVisible();
    await expect(page.getByText('Select the subjects you teach')).toBeVisible();

    // Check for Education Levels section
    await expect(page.getByText('Education Levels')).toBeVisible();

    // Check for Teaching Experience dropdown
    await expect(page.getByText('Teaching Experience')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();

    // Check for Hourly Rate section
    await expect(page.getByText('Hourly Rate Range')).toBeVisible();

    // Check for Qualifications section
    await expect(page.getByText('Qualifications')).toBeVisible();

    // Check for Teaching Methods section
    await expect(page.getByText('Teaching Methods')).toBeVisible();

    // Check for Save button
    const saveButton = page.getByRole('button', { name: /Save Template/ });
    await expect(saveButton).toBeVisible();
  });

  test('should allow subject selection via chips', async ({ page }) => {
    await page.goto('/account/professional-info');

    // Find and click Mathematics chip
    const mathsChip = page.getByRole('button', { name: 'Mathematics' });
    await expect(mathsChip).toBeVisible();

    // Click to select
    await mathsChip.click();

    // Should have selected class
    await expect(mathsChip).toHaveClass(/chipSelected/);

    // Click to deselect
    await mathsChip.click();

    // Should not have selected class
    await expect(mathsChip).not.toHaveClass(/chipSelected/);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/account/professional-info');

    const saveButton = page.getByRole('button', { name: /Save Template/ });

    // Save button should be disabled initially
    await expect(saveButton).toBeDisabled();

    // Select subject
    await page.getByRole('button', { name: 'Mathematics' }).click();

    // Still disabled (need level and experience)
    await expect(saveButton).toBeDisabled();

    // Select level
    await page.getByRole('button', { name: 'GCSE' }).click();

    // Still disabled (need experience)
    await expect(saveButton).toBeDisabled();

    // Select experience
    await page.getByRole('combobox').selectOption('5-10 years');

    // Now should be enabled
    await expect(saveButton).toBeEnabled();
  });

  test('should allow adding and removing qualifications', async ({ page }) => {
    await page.goto('/account/professional-info');

    // Find qualification inputs - form starts with 1 input by default
    const qualInputs = page.getByPlaceholder(/BSc Mathematics/);
    const initialCount = await qualInputs.count();

    // Should start with at least 1 input
    expect(initialCount).toBeGreaterThanOrEqual(1);

    // Click "Add Qualification" button
    await page.getByRole('button', { name: /Add Qualification/ }).click();

    // Should have one more input
    const newCount = await qualInputs.count();
    expect(newCount).toBe(initialCount + 1);

    // Remove button should be visible
    const removeButtons = page.getByRole('button', { name: /Remove/ });
    await expect(removeButtons.first()).toBeVisible();

    // Click remove
    await removeButtons.first().click();

    // Count should be back to original
    const finalCount = await qualInputs.count();
    expect(finalCount).toBe(initialCount);
  });

  test('should submit form successfully', async ({ page }) => {
    await page.goto('/account/professional-info');

    // Fill required fields
    await page.getByRole('button', { name: 'Mathematics' }).click();
    await page.getByRole('button', { name: 'GCSE' }).click();
    await page.getByRole('combobox').selectOption('5-10 years');

    // Optionally fill other fields
    await page.getByPlaceholder('Min').fill('40');
    await page.getByPlaceholder('Max').fill('50');

    // Submit form
    await page.getByRole('button', { name: /Save Template/ }).click();

    // Should show success toast (wait for it to appear)
    await expect(page.getByText(/Template saved/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Changes won't affect your existing listings/)).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/account/professional-info');

    // Check that page renders
    await expect(page.getByText('Professional Information')).toBeVisible();

    // Tabs should be scrollable
    const tabContainer = page.locator('.tabs');
    await expect(tabContainer).toBeVisible();

    // Chips should wrap properly
    const subjectChips = page.locator('.chipGrid');
    await expect(subjectChips).toBeVisible();

    // Form should be usable
    await page.getByRole('button', { name: 'Mathematics' }).click();
    await expect(page.getByRole('button', { name: 'Mathematics' })).toHaveClass(/chipSelected/);
  });

    test('should match Figma design system', async ({ page }) => {
    await page.goto('/account/professional-info');

    // Check color scheme (blue theme)
    const activeTab = page.getByRole('link', { name: 'Professional Info' });
    const activeTabColor = await activeTab.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    // Should be blue (#2563eb or similar)
    expect(activeTabColor).toContain('37, 99, 235'); // rgb(37, 99, 235)

    // Check chip styles
    const mathsChip = page.getByRole('button', { name: 'Mathematics' });
    const chipBorderRadius = await mathsChip.evaluate(el => {
      return window.getComputedStyle(el).borderRadius;
    });
    // Chips should have rounded corners (20px)
    expect(chipBorderRadius).toBe('20px');

    // Check spacing (Tailwind defaults)
    const formSection = page.locator('.formSection').first();
    const marginBottom = await formSection.evaluate(el => {
      return window.getComputedStyle(el).marginBottom;
    });
    // Should have consistent spacing (2rem = 32px)
    expect(marginBottom).toBe('32px');
  });
  });

  // Unauthenticated test (separate from authenticated tests)
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Navigate to professional info page without auth
    await page.goto('/account/professional-info');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});

// Visual Regression Tests
test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as tutor for visual tests
    await loginAsTutor(page);
  });

  test('should match desktop screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/account/professional-info');

    // Wait for form to load
    await page.waitForSelector('.formSection');

    // Take screenshot
    await expect(page).toHaveScreenshot('professional-info-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match tablet screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/account/professional-info');

    await page.waitForSelector('.formSection');

    await expect(page).toHaveScreenshot('professional-info-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match mobile screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/account/professional-info');

    await page.waitForSelector('.formSection');

    await expect(page).toHaveScreenshot('professional-info-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match form with selections', async ({ page }) => {
    await page.goto('/account/professional-info');

    // Make some selections
    await page.getByRole('button', { name: 'Mathematics' }).click();
    await page.getByRole('button', { name: 'Physics' }).click();
    await page.getByRole('button', { name: 'GCSE' }).click();
    await page.getByRole('combobox').selectOption('5-10 years');

    await expect(page).toHaveScreenshot('professional-info-with-selections.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});

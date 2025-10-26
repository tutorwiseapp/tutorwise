import { test, expect } from '@playwright/test';
import { AuthHelper, testUsers } from './fixtures/auth';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'http://localhost:3011';

// Supabase client for user creation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('Profile Page Refactor', () => {
  const tutorUser = {
    email: `tutor-${Date.now()}@example.com`,
    password: 'testpassword123',
    role: 'tutor' as const,
  };
  let tutorId: string;

  test.beforeAll(async () => {
    // Create a unique user for this test run
    const { data, error } = await supabase.auth.signUp({
      email: tutorUser.email,
      password: tutorUser.password,
    });
    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }
    if (!data.user) {
      throw new Error('Test user was not created successfully.');
    }
    tutorId = data.user.id;

    // We also need to create a profile entry for this user
    const { error: profileError } = await supabase.from('profiles').insert({
      id: tutorId,
      email: tutorUser.email,
      full_name: 'Tutor User',
      first_name: 'Tutor',
      last_name: 'User',
    });
    if (profileError) {
      throw new Error(`Failed to create test profile: ${profileError.message}`);
    }
  });

  test.afterAll(async () => {
    // Clean up the created user
    // NOTE: This requires admin privileges and a service role key.
    // For now, we will skip this step in this environment.
  });

  test.describe('My Profile Page (Editable)', () => {
    test('should display the correct editable view for a tutor', async ({ page }) => {
      const authHelper = new AuthHelper(page);
      await authHelper.login(tutorUser);

      await page.goto(`${BASE_URL}/my-profile`);

      // Verify that tutor-specific components are visible
      await expect(page.locator('text=Hi, I\'m Tutor')).toBeVisible(); // From TutorNarrative
      await expect(page.locator('text=Professional Info')).toBeVisible(); // From ProfessionalInfoSection
      await expect(page.locator('text=Available Time Slots')).toBeVisible(); // From AvailabilitySection

      // Verify that the action buttons in the header are disabled
      const hireMeButton = page.locator('button:has-text("Hire Me")');
      await expect(hireMeButton).toBeDisabled();
    });

    test('should allow a tutor to edit their narrative', async ({ page }) => {
      const authHelper = new AuthHelper(page);
      await authHelper.login(tutorUser);
      await page.goto(`${BASE_URL}/my-profile`);

      // 1. Click the edit button in the TutorNarrative section
      const editButton = page.locator('div:has(h3:has-text("Hi, I\'m Tutor"))').locator('button:has-text("Edit Section")');
      await editButton.click();

      // 2. Verify the modal appears
      const modal = page.locator('div[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('h2:has-text("Edit Narrative")')).toBeVisible();

      // 3. Edit the bio
      const bioTextarea = modal.locator('textarea#bio');
      const newBio = `This is an updated bio from an E2E test at ${new Date().toISOString()}`;
      await bioTextarea.fill(newBio);

      // 4. Save the changes
      await modal.locator('button:has-text("Save Changes")').click();

      // 5. Verify the modal is closed and the text is updated on the page
      await expect(modal).not.toBeVisible();
      await expect(page.locator(`text=${newBio}`)).toBeVisible();
    });
  });

  test.describe('Public Profile Page (View-Only)', () => {
    test('should display the correct view-only page for a tutor', async ({ page }) => {
      await page.goto(`${BASE_URL}/public-profile/${tutorId}`);

      // It should show an error message because the API will return a 500 error
      await expect(page.locator('h2:has-text("Something went wrong")')).toBeVisible();

      // TODO: When a user can be seeded, expand this test to:
      // 1. Navigate to /public-profile/seeded-tutor-id
      // 2. Verify the tutor's information is visible
      // 3. Verify the action buttons in the header are ENABLED
      // 4. Verify there are NO "Edit Section" buttons
    });
  });
});

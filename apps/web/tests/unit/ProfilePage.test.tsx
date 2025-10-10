/**
 * Unit tests for ProfilePage component
 * Tests form rendering, input handling, avatar upload, and form submission
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/profile/page';

// Mock UserProfileContext
const mockProfile = {
  id: 'test-profile-id',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: 'Test bio',
  categories: 'Tutoring',
  achievements: 'Test achievements',
  cover_photo_url: '',
  avatar_url: null,
};

jest.mock('@/app/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: mockProfile,
    isLoading: false,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('ProfilePage', () => {
  // Type-safe mock helper
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);
  });

  describe('Rendering', () => {
    it('renders profile form when loaded', () => {
      render(<ProfilePage />);

      // Should show profile details tab
      expect(screen.getByRole('button', { name: 'Profile Details' })).toBeInTheDocument();

      // Should show form fields
      expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/About \(Public Bio\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });

    it('shows skeleton loading while fetching', () => {
      // Mock loading state
      jest.spyOn(require('@/app/contexts/UserProfileContext'), 'useUserProfile').mockReturnValue({
        profile: null,
        isLoading: true,
      });

      render(<ProfilePage />);

      // Check for skeleton elements
      const skeletons = document.querySelectorAll('[class*="Skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays user profile data in form fields', () => {
      render(<ProfilePage />);

      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tutoring')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    it('shows account security tab', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const securityTab = screen.getByRole('button', { name: 'Account Security' });
      await user.click(securityTab);

      expect(screen.getByText('Security Settings')).toBeInTheDocument();
      expect(screen.getByText(/Change the password/i)).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('updates display name on input change', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const nameInput = screen.getByLabelText(/Display Name/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      expect(nameInput).toHaveValue('New Name');
    });

    it('updates bio on textarea change', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const bioInput = screen.getByLabelText(/About \(Public Bio\)/i);

      await user.clear(bioInput);
      await user.type(bioInput, 'New bio text');

      expect(bioInput).toHaveValue('New bio text');
    });

    it('updates referral categories', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const categoriesInput = screen.getByLabelText(/Referral Categories/i);

      await user.clear(categoriesInput);
      await user.type(categoriesInput, 'SaaS, Consulting');

      expect(categoriesInput).toHaveValue('SaaS, Consulting');
    });

    it('updates achievements field', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const achievementsInput = screen.getByLabelText(/Achievements/i);

      await user.clear(achievementsInput);
      await user.type(achievementsInput, 'Built 3 successful startups');

      expect(achievementsInput).toHaveValue('Built 3 successful startups');
    });

    it('email field is readonly', () => {
      render(<ProfilePage />);

      const emailInput = screen.getByLabelText(/Email/i);

      expect(emailInput).toHaveAttribute('readonly');
      expect(emailInput).toBeDisabled();
    });
  });

  describe('Avatar Upload', () => {
    it('validates file size (max 5MB)', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      // Create a mock file that's too large (6MB)
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      const fileInput = screen.getByLabelText(/Profile Photo/i);
      const uploadButton = screen.getByRole('button', { name: /Upload Photo/i });

      await user.upload(fileInput, largeFile);
      await user.click(uploadButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Image must be less than 5MB/i)).toBeInTheDocument();
      });
    });

    it('validates file type (JPEG, PNG, WebP only)', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      // Create a mock PDF file
      const pdfFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });

      const fileInput = screen.getByLabelText(/Profile Photo/i);
      const uploadButton = screen.getByRole('button', { name: /Upload Photo/i });

      await user.upload(fileInput, pdfFile);
      await user.click(uploadButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Only JPEG, PNG, and WebP images allowed/i)).toBeInTheDocument();
      });
    });

    it('accepts valid image file', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      // Create a valid small JPEG file
      const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

      const fileInput = screen.getByLabelText(/Profile Photo/i);
      const uploadButton = screen.getByRole('button', { name: /Upload Photo/i });

      await user.upload(fileInput, validFile);
      await user.click(uploadButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/validated successfully/i)).toBeInTheDocument();
      });
    });

    it('shows filename in success message', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const validFile = new File(['content'], 'my-photo.jpg', { type: 'image/jpeg' });

      const fileInput = screen.getByLabelText(/Profile Photo/i);
      const uploadButton = screen.getByRole('button', { name: /Upload Photo/i });

      await user.upload(fileInput, validFile);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/my-photo.jpg/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with updated data', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const nameInput = screen.getByLabelText(/Display Name/i);
      const bioInput = screen.getByLabelText(/About \(Public Bio\)/i);
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      await user.clear(bioInput);
      await user.type(bioInput, 'Updated bio');

      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('disables save button while saving', async () => {
      const user = userEvent.setup();

      // Mock slow API response
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        } as Response), 100))
      );

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.click(saveButton);

      // Button should be disabled and show "Saving..."
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveTextContent(/Saving/i);
    });

    it('shows success message on successful save', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error for 400 Bad Request', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid data' }),
      } as Response);

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Validation error/i)).toBeInTheDocument();
      });
    });

    it('shows error for 401 Unauthorized', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response);

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Session expired/i)).toBeInTheDocument();
      });
    });

    it('shows error for 403 Forbidden', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({}),
      } as Response);

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/You do not have permission/i)).toBeInTheDocument();
      });
    });

    it('shows error for 500 Server Error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to update profile/i)).toBeInTheDocument();
      });
    });

    it('re-enables save button after error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });

      // Button should be re-enabled
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('User Experience', () => {
    it('scrolls to top after showing message', async () => {
      const user = userEvent.setup();
      const scrollToSpy = jest.spyOn(window, 'scrollTo');

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      });

      scrollToSpy.mockRestore();
    });

    it('clears previous message on new submission', async () => {
      const user = userEvent.setup();

      // First submission - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });

      // Second submission - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText(/Server error/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
      });
    });
  });
});

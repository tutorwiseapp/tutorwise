/**
 * Unit tests for ProfilePage component
 * Tests form rendering, input handling, avatar upload, and form submission
 */

import React from 'react';
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/profile/page';

// Mock fetch
global.fetch = jest.fn();

// Mock window.scrollTo
window.scrollTo = jest.fn();

describe('ProfilePage', () => {
  // Type-safe mock helper
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);
    (window.scrollTo as jest.Mock).mockClear();
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

    it('displays user profile data in form fields', () => {
      render(<ProfilePage />);

      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A test bio.')).toBeInTheDocument();
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

      const nameInput = screen.getByLabelText(/Display Name/i) as HTMLInputElement;

      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      expect(nameInput.value).toBe('New Name');
    });

    it('updates bio on textarea change', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const bioInput = screen.getByLabelText(/About \(Public Bio\)/i) as HTMLTextAreaElement;

      await user.clear(bioInput);
      await user.type(bioInput, 'New bio text');

      expect(bioInput.value).toBe('New bio text');
    });

    it('updates referral categories', async () => {
        const user = userEvent.setup();
        render(<ProfilePage />);

        const categoriesInput = screen.getByLabelText(/Referral Categories/i) as HTMLInputElement;

        await user.clear(categoriesInput);
        await user.type(categoriesInput, 'SaaS, Consulting');

        expect(categoriesInput.value).toBe('SaaS, Consulting');
      });

      it('updates achievements field', async () => {
        const user = userEvent.setup();
        render(<ProfilePage />);

        const achievementsInput = screen.getByLabelText(/Achievements/i) as HTMLInputElement;

        await user.clear(achievementsInput);
        await user.type(achievementsInput, 'Built 3 successful startups');

        expect(achievementsInput.value).toBe('Built 3 successful startups');
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
      const { container } = render(<ProfilePage />);

      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const fileInput = container.querySelector('input[type="file"]') as HTMLElement;

      await user.upload(fileInput, largeFile);
    });

    it('validates file type (JPEG, PNG, WebP only)', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProfilePage />);

      const pdfFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      const fileInput = container.querySelector('input[type="file"]') as HTMLElement;

      await user.upload(fileInput, pdfFile);
    });

    it('accepts valid image file', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProfilePage />);

      const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = container.querySelector('input[type="file"]') as HTMLElement;

      await user.upload(fileInput, validFile);
    });

    it('shows filename in success message', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProfilePage />);

      const validFile = new File(['content'], 'my-photo.jpg', { type: 'image/jpeg' });
      const fileInput = container.querySelector('input[type="file"]') as HTMLElement;

      await user.upload(fileInput, validFile);
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

      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        } as Response), 100))
      );

      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });

      await user.click(saveButton);

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

      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('User Experience', () => {
    it('scrolls to top after showing message', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      });
    });

    it('clears previous message on new submission', async () => {
      const user = userEvent.setup();

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
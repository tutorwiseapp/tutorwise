/**
 * Unit tests for TutorProfessionalInfoForm component
 * Tests form rendering, interactions, validation, and API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorProfessionalInfoForm from '@/app/account/components/TutorProfessionalInfoForm';
import * as accountApi from '@/lib/api/account';

// Mock the API functions
jest.mock('@/lib/api/account', () => ({
  getProfessionalInfo: jest.fn(),
  updateProfessionalInfo: jest.fn(),
}));

// Mock UserProfileContext
jest.mock('@/app/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({
    user: { id: 'test-user-id' },
    profile: { id: 'test-profile-id', name: 'Test User' },
    activeRole: 'provider',
    isLoading: false,
  }),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import toast from 'react-hot-toast';

describe('TutorProfessionalInfoForm', () => {
  // Type-safe mock helpers
  const mockGetProfessionalInfo = accountApi.getProfessionalInfo as jest.MockedFunction<typeof accountApi.getProfessionalInfo>;
  const mockUpdateProfessionalInfo = accountApi.updateProfessionalInfo as jest.MockedFunction<typeof accountApi.updateProfessionalInfo>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Default mock implementation
    mockGetProfessionalInfo.mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('renders all form sections', async () => {
      render(<TutorProfessionalInfoForm />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for main sections (use regex for flexibility)
      expect(screen.getByText(/Subjects \*/i)).toBeInTheDocument();
      expect(screen.getByText(/Education Levels/i)).toBeInTheDocument();
      expect(screen.getByText(/Teaching Experience/i)).toBeInTheDocument();
      expect(screen.getByText(/Hourly Rate Range/i)).toBeInTheDocument();
      expect(screen.getByText(/Qualifications/i)).toBeInTheDocument();
      expect(screen.getByText(/Teaching Methods/i)).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      // Mock a delayed response
      mockGetProfessionalInfo.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(null), 1000))
      );

      render(<TutorProfessionalInfoForm />);
      expect(screen.getByText('Loading template...')).toBeInTheDocument();
    });

    it('renders subject chips', async () => {
      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for some subject chips
      expect(screen.getByRole('button', { name: 'Mathematics' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Physics' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Chemistry' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    });
  });

  describe('Subject Selection', () => {
    it('allows subject selection via chips', async () => {
      const user = userEvent.setup();
      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const mathsChip = screen.getByRole('button', { name: 'Mathematics' });

      // Initially not selected
      expect(mathsChip).not.toHaveClass('chipSelected');

      // Click to select
      await user.click(mathsChip);
      expect(mathsChip).toHaveClass('chipSelected');

      // Click again to deselect
      await user.click(mathsChip);
      expect(mathsChip).not.toHaveClass('chipSelected');
    });

    it('allows multiple subject selections', async () => {
      const user = userEvent.setup();
      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Select multiple subjects
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'Physics' }));
      await user.click(screen.getByRole('button', { name: 'Chemistry' }));

      // All should be selected
      expect(screen.getByRole('button', { name: 'Mathematics' })).toHaveClass('chipSelected');
      expect(screen.getByRole('button', { name: 'Physics' })).toHaveClass('chipSelected');
      expect(screen.getByRole('button', { name: 'Chemistry' })).toHaveClass('chipSelected');
    });
  });

  describe('Education Level Selection', () => {
    it('allows level selection via chips', async () => {
      const user = userEvent.setup();
      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const gcseChip = screen.getByRole('button', { name: 'GCSE' });

      // Click to select
      await user.click(gcseChip);
      expect(gcseChip).toHaveClass('chipSelected');
    });
  });

  describe('Qualifications', () => {
    it('starts with one qualification input', async () => {
      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const qualInputs = screen.getAllByPlaceholderText(/BSc Mathematics/i);
      expect(qualInputs).toHaveLength(1);
    });

    it('can add qualifications', async () => {
      const user = userEvent.setup();
      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Qualification/i });
      await user.click(addButton);

      const qualInputs = screen.getAllByPlaceholderText(/BSc Mathematics/i);
      expect(qualInputs).toHaveLength(2);
    });

    it('can remove qualifications', async () => {
      const user = userEvent.setup();
      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Add a second qualification first
      const addButton = screen.getByRole('button', { name: /Add Qualification/i });
      await user.click(addButton);

      // Now remove button should be visible
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      expect(removeButtons.length).toBeGreaterThan(0);

      await user.click(removeButtons[0]);

      const qualInputs = screen.getAllByPlaceholderText(/BSc Mathematics/i);
      expect(qualInputs).toHaveLength(1);
    });
  });

  describe('Form Validation', () => {
    it('disables save button when required fields are empty', async () => {
      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when required fields are filled', async () => {
      const user = userEvent.setup();
      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'GCSE' }));

      const experienceSelect = screen.getByRole('combobox');
      await user.selectOptions(experienceSelect, '5-10 years');

      // Save button should now be enabled
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });
    });
  });

  describe('API Integration', () => {
    it('loads existing template on mount', async () => {
      const mockTemplate = {
        subjects: ['Mathematics', 'Physics'],
        skill_levels: { GCSE: 'advanced', 'A-Level': 'intermediate' },
        teaching_experience: '5-10 years',
        hourly_rate: 45,
        qualifications: ['BSc Mathematics - Oxford'],
        teaching_methods: ['Interactive', 'Exam-focused'],
        specializations: ['GCSE', 'A-Level'],
      };

      mockGetProfessionalInfo.mockResolvedValue(mockTemplate);

      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(accountApi.getProfessionalInfo).toHaveBeenCalledWith('provider');
      });

      // Check that form is populated
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Mathematics' })).toHaveClass('chipSelected');
        expect(screen.getByRole('button', { name: 'Physics' })).toHaveClass('chipSelected');
      });
    });

    it('saves template successfully', async () => {
      const user = userEvent.setup();
      mockUpdateProfessionalInfo.mockResolvedValue({ success: true });

      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'GCSE' }));

      const experienceSelect = screen.getByRole('combobox');
      await user.selectOptions(experienceSelect, '5-10 years');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      // Check that API was called
      await waitFor(() => {
        expect(accountApi.updateProfessionalInfo).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("Template saved")
        );
      });
    });

    it('shows error toast on save failure', async () => {
      const user = userEvent.setup();
      mockUpdateProfessionalInfo.mockRejectedValue(
        new Error('Network error')
      );

      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'GCSE' }));

      const experienceSelect = screen.getByRole('combobox');
      await user.selectOptions(experienceSelect, '5-10 years');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      // Check that error toast was shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to save template')
        );
      });
    });

    it('filters empty qualifications on submit', async () => {
      const user = userEvent.setup();
      mockUpdateProfessionalInfo.mockResolvedValue({ success: true });

      render(<TutorProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'GCSE' }));

      const experienceSelect = screen.getByRole('combobox');
      await user.selectOptions(experienceSelect, '5-10 years');

      // Add qualification but leave it empty
      const addButton = screen.getByRole('button', { name: /Add Qualification/i });
      await user.click(addButton);

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      // Check that empty qualifications were filtered out
      await waitFor(() => {
        expect(accountApi.updateProfessionalInfo).toHaveBeenCalledWith(
          expect.objectContaining({
            qualifications: expect.arrayContaining([])
          })
        );
      });
    });
  });
});

/**
 * Unit tests for ClientProfessionalInfoForm component
 * Tests form rendering, interactions, validation, and API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientProfessionalInfoForm from '@/app/account/components/ClientProfessionalInfoForm';
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
    activeRole: 'seeker',
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

describe('ClientProfessionalInfoForm', () => {
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
      render(<ClientProfessionalInfoForm />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for main sections
      expect(screen.getByText(/Subjects of Interest \*/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Education Level/i)).toBeInTheDocument();
      expect(screen.getByText(/Learning Goals/i)).toBeInTheDocument();
      expect(screen.getByText(/Learning Preferences/i)).toBeInTheDocument();
      expect(screen.getByText(/Budget Range per Hour/i)).toBeInTheDocument();
      expect(screen.getByText(/Preferred Sessions Per Week/i)).toBeInTheDocument();
      expect(screen.getByText(/Preferred Session Duration/i)).toBeInTheDocument();
      expect(screen.getByText(/Additional Information/i)).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      // Mock a delayed response
      mockGetProfessionalInfo.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(null), 1000))
      );

      render(<ClientProfessionalInfoForm />);
      expect(screen.getByText('Loading template...')).toBeInTheDocument();
    });

    it('renders subject chips', async () => {
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for some subject chips
      expect(screen.getByRole('button', { name: 'Mathematics' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Physics' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Chemistry' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    });

    it('renders learning goal chips', async () => {
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for learning goal chips
      expect(screen.getByRole('button', { name: 'Exam preparation' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Homework help' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Improve grades' })).toBeInTheDocument();
    });

    it('renders learning preference chips', async () => {
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for learning preference chips
      expect(screen.getByRole('button', { name: 'Visual learning' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Hands-on practice' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Discussion-based' })).toBeInTheDocument();
    });
  });

  describe('Subject Selection', () => {
    it('allows subject selection via chips', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

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
      render(<ClientProfessionalInfoForm />);

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
    it('allows level selection via dropdown', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const levelSelect = screen.getByLabelText(/Current Education Level/i);
      await user.selectOptions(levelSelect, 'GCSE');

      expect(levelSelect).toHaveValue('GCSE');
    });
  });

  describe('Learning Goals Selection', () => {
    it('allows learning goal selection via chips', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const examPrepChip = screen.getByRole('button', { name: 'Exam preparation' });

      // Click to select
      await user.click(examPrepChip);
      expect(examPrepChip).toHaveClass('chipSelected');
    });

    it('allows multiple learning goal selections', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Select multiple goals
      await user.click(screen.getByRole('button', { name: 'Exam preparation' }));
      await user.click(screen.getByRole('button', { name: 'Homework help' }));
      await user.click(screen.getByRole('button', { name: 'Improve grades' }));

      // All should be selected
      expect(screen.getByRole('button', { name: 'Exam preparation' })).toHaveClass('chipSelected');
      expect(screen.getByRole('button', { name: 'Homework help' })).toHaveClass('chipSelected');
      expect(screen.getByRole('button', { name: 'Improve grades' })).toHaveClass('chipSelected');
    });
  });

  describe('Learning Preferences Selection', () => {
    it('allows learning preference selection via chips', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const visualChip = screen.getByRole('button', { name: 'Visual learning' });

      // Click to select
      await user.click(visualChip);
      expect(visualChip).toHaveClass('chipSelected');
    });
  });

  describe('Form Validation', () => {
    it('disables save button when required fields are empty', async () => {
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when required fields are filled', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));

      const levelSelect = screen.getByLabelText(/Current Education Level/i);
      await user.selectOptions(levelSelect, 'GCSE');

      await user.click(screen.getByRole('button', { name: 'Exam preparation' }));

      // Save button should now be enabled
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });
    });
  });

  describe('Budget Range', () => {
    it('allows entering budget min and max', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const budgetInputs = screen.getAllByPlaceholderText(/Min|Max/i);
      const minInput = budgetInputs.find(input => input.getAttribute('placeholder') === 'Min');
      const maxInput = budgetInputs.find(input => input.getAttribute('placeholder') === 'Max');

      if (minInput && maxInput) {
        await user.type(minInput, '20');
        await user.type(maxInput, '40');

        expect(minInput).toHaveValue(20);
        expect(maxInput).toHaveValue(40);
      }
    });
  });

  describe('Sessions and Duration', () => {
    it('allows selecting sessions per week', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const sessionsSelect = screen.getByLabelText(/Preferred Sessions Per Week/i);
      await user.selectOptions(sessionsSelect, '2');

      expect(sessionsSelect).toHaveValue('2');
    });

    it('allows selecting session duration', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const durationSelect = screen.getByLabelText(/Preferred Session Duration/i);
      await user.selectOptions(durationSelect, '1 hour');

      expect(durationSelect).toHaveValue('1 hour');
    });
  });

  describe('Additional Information', () => {
    it('allows entering additional information', async () => {
      const user = userEvent.setup();
      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByLabelText(/Additional Information/i);
      await user.type(textarea, 'Preparing for GCSE Maths exam');

      expect(textarea).toHaveValue('Preparing for GCSE Maths exam');
    });
  });

  describe('API Integration', () => {
    it('loads existing template on mount', async () => {
      const mockTemplate = {
        subjects: ['Mathematics', 'Physics'],
        education_level: 'GCSE',
        learning_goals: ['Exam preparation', 'Improve grades'],
        learning_preferences: ['Visual learning'],
        budget_range: '20-40',
        sessions_per_week: '2',
        session_duration: '1 hour',
        additional_info: 'Test info',
      };

      mockGetProfessionalInfo.mockResolvedValue(mockTemplate);

      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(accountApi.getProfessionalInfo).toHaveBeenCalledWith('seeker');
      });

      // Check that form is populated
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Mathematics' })).toHaveClass('chipSelected');
        expect(screen.getByRole('button', { name: 'Physics' })).toHaveClass('chipSelected');
        expect(screen.getByRole('button', { name: 'Exam preparation' })).toHaveClass('chipSelected');
      });
    });

    it('saves template successfully', async () => {
      const user = userEvent.setup();
      mockUpdateProfessionalInfo.mockResolvedValue({ success: true });

      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));

      const levelSelect = screen.getByLabelText(/Current Education Level/i);
      await user.selectOptions(levelSelect, 'GCSE');

      await user.click(screen.getByRole('button', { name: 'Exam preparation' }));

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      // Check that API was called
      await waitFor(() => {
        expect(accountApi.updateProfessionalInfo).toHaveBeenCalledWith(
          expect.objectContaining({
            role_type: 'seeker',
            subjects: ['Mathematics'],
            education_level: 'GCSE',
            learning_goals: ['Exam preparation'],
          })
        );
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Template saved')
        );
      });
    });

    it('shows error toast on save failure', async () => {
      const user = userEvent.setup();
      mockUpdateProfessionalInfo.mockRejectedValue(
        new Error('Network error')
      );

      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));

      const levelSelect = screen.getByLabelText(/Current Education Level/i);
      await user.selectOptions(levelSelect, 'GCSE');

      await user.click(screen.getByRole('button', { name: 'Exam preparation' }));

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

    it('formats budget range correctly on submit', async () => {
      const user = userEvent.setup();
      mockUpdateProfessionalInfo.mockResolvedValue({ success: true });

      render(<ClientProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));

      const levelSelect = screen.getByLabelText(/Current Education Level/i);
      await user.selectOptions(levelSelect, 'GCSE');

      await user.click(screen.getByRole('button', { name: 'Exam preparation' }));

      // Enter budget range
      const budgetInputs = screen.getAllByPlaceholderText(/Min|Max/i);
      const minInput = budgetInputs.find(input => input.getAttribute('placeholder') === 'Min');
      const maxInput = budgetInputs.find(input => input.getAttribute('placeholder') === 'Max');

      if (minInput && maxInput) {
        await user.type(minInput, '20');
        await user.type(maxInput, '40');
      }

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      // Check that budget range is formatted correctly
      await waitFor(() => {
        expect(accountApi.updateProfessionalInfo).toHaveBeenCalledWith(
          expect.objectContaining({
            budget_range: '20-40',
          })
        );
      });
    });
  });
});

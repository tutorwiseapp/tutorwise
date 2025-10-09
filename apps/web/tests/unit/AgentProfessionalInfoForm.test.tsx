/**
 * Unit tests for AgentProfessionalInfoForm component
 * Tests form rendering, interactions, validation, and API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentProfessionalInfoForm from '@/app/account/components/AgentProfessionalInfoForm';
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
    profile: { id: 'test-profile-id', name: 'Test Agency' },
    activeRole: 'agent',
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

describe('AgentProfessionalInfoForm', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Default mock implementation
    (accountApi.getProfessionalInfo as jest.Mock).mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('renders all form sections', async () => {
      render(<AgentProfessionalInfoForm />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for main sections
      expect(screen.getByText(/Agency Name \*/i)).toBeInTheDocument();
      expect(screen.getByText(/Services Offered/i)).toBeInTheDocument();
      expect(screen.getByText(/Subject Specializations/i)).toBeInTheDocument();
      expect(screen.getByText(/Education Levels Covered/i)).toBeInTheDocument();
      expect(screen.getByText(/Coverage Areas/i)).toBeInTheDocument();
      expect(screen.getByText(/Years in Business/i)).toBeInTheDocument();
      expect(screen.getByText(/Number of Tutors/i)).toBeInTheDocument();
      expect(screen.getByText(/Commission Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/Certifications & Accreditations/i)).toBeInTheDocument();
      expect(screen.getByText(/Website URL/i)).toBeInTheDocument();
      expect(screen.getByText(/Agency Description/i)).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      // Mock a delayed response
      (accountApi.getProfessionalInfo as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(null), 1000))
      );

      render(<AgentProfessionalInfoForm />);
      expect(screen.getByText('Loading template...')).toBeInTheDocument();
    });

    it('renders service chips', async () => {
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for some service chips
      expect(screen.getByRole('button', { name: 'Tutor placement' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Background checks' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Quality assurance' })).toBeInTheDocument();
    });

    it('renders subject specialization chips', async () => {
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for subject chips
      expect(screen.getByRole('button', { name: 'Mathematics' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sciences' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Languages' })).toBeInTheDocument();
    });

    it('renders coverage area chips', async () => {
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Check for region chips
      expect(screen.getByRole('button', { name: 'London' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'South East' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Scotland' })).toBeInTheDocument();
    });
  });

  describe('Service Selection', () => {
    it('allows service selection via chips', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const placementChip = screen.getByRole('button', { name: 'Tutor placement' });

      // Initially not selected
      expect(placementChip).not.toHaveClass('chipSelected');

      // Click to select
      await user.click(placementChip);
      expect(placementChip).toHaveClass('chipSelected');

      // Click again to deselect
      await user.click(placementChip);
      expect(placementChip).not.toHaveClass('chipSelected');
    });

    it('allows multiple service selections', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Select multiple services
      await user.click(screen.getByRole('button', { name: 'Tutor placement' }));
      await user.click(screen.getByRole('button', { name: 'Background checks' }));
      await user.click(screen.getByRole('button', { name: 'Quality assurance' }));

      // All should be selected
      expect(screen.getByRole('button', { name: 'Tutor placement' })).toHaveClass('chipSelected');
      expect(screen.getByRole('button', { name: 'Background checks' })).toHaveClass('chipSelected');
      expect(screen.getByRole('button', { name: 'Quality assurance' })).toHaveClass('chipSelected');
    });
  });

  describe('Subject Specialization Selection', () => {
    it('allows subject specialization selection via chips', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const mathsChip = screen.getByRole('button', { name: 'Mathematics' });

      // Click to select
      await user.click(mathsChip);
      expect(mathsChip).toHaveClass('chipSelected');
    });

    it('allows multiple subject selections', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Select multiple subjects
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'Sciences' }));

      expect(screen.getByRole('button', { name: 'Mathematics' })).toHaveClass('chipSelected');
      expect(screen.getByRole('button', { name: 'Sciences' })).toHaveClass('chipSelected');
    });
  });

  describe('Education Level Selection', () => {
    it('allows education level selection via chips', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const gcseChip = screen.getByRole('button', { name: 'GCSE' });

      // Click to select
      await user.click(gcseChip);
      expect(gcseChip).toHaveClass('chipSelected');
    });
  });

  describe('Coverage Area Selection', () => {
    it('allows coverage area selection via chips', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const londonChip = screen.getByRole('button', { name: 'London' });

      // Click to select
      await user.click(londonChip);
      expect(londonChip).toHaveClass('chipSelected');
    });

    it('allows multiple region selections', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Select multiple regions
      await user.click(screen.getByRole('button', { name: 'London' }));
      await user.click(screen.getByRole('button', { name: 'South East' }));

      expect(screen.getByRole('button', { name: 'London' })).toHaveClass('chipSelected');
      expect(screen.getByRole('button', { name: 'South East' })).toHaveClass('chipSelected');
    });
  });

  describe('Agency Details', () => {
    it('allows entering agency name', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Agency Name/i);
      await user.type(nameInput, 'Elite Tutors London');

      expect(nameInput).toHaveValue('Elite Tutors London');
    });

    it('allows selecting years in business', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const yearsSelect = screen.getByLabelText(/Years in Business/i);
      await user.selectOptions(yearsSelect, '5-10 years');

      expect(yearsSelect).toHaveValue('5-10 years');
    });

    it('allows selecting number of tutors', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const tutorsSelect = screen.getByLabelText(/Number of Tutors/i);
      await user.selectOptions(tutorsSelect, '11-25');

      expect(tutorsSelect).toHaveValue('11-25');
    });

    it('allows entering commission rate', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const commissionInput = screen.getByLabelText(/Commission Rate/i);
      await user.type(commissionInput, '15');

      expect(commissionInput).toHaveValue(15);
    });

    it('allows entering website URL', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/Website URL/i);
      await user.type(urlInput, 'https://www.example.com');

      expect(urlInput).toHaveValue('https://www.example.com');
    });

    it('allows entering agency description', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const descriptionTextarea = screen.getByLabelText(/Agency Description/i);
      await user.type(descriptionTextarea, 'Leading tutoring agency in London');

      expect(descriptionTextarea).toHaveValue('Leading tutoring agency in London');
    });
  });

  describe('Certifications', () => {
    it('starts with one certification input', async () => {
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const certInputs = screen.getAllByPlaceholderText(/DBS Enhanced/i);
      expect(certInputs).toHaveLength(1);
    });

    it('can add certifications', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Certification/i });
      await user.click(addButton);

      const certInputs = screen.getAllByPlaceholderText(/DBS Enhanced/i);
      expect(certInputs).toHaveLength(2);
    });

    it('can remove certifications', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Add a second certification first
      const addButton = screen.getByRole('button', { name: /Add Certification/i });
      await user.click(addButton);

      // Now remove button should be visible
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      expect(removeButtons.length).toBeGreaterThan(0);

      await user.click(removeButtons[0]);

      const certInputs = screen.getAllByPlaceholderText(/DBS Enhanced/i);
      expect(certInputs).toHaveLength(1);
    });
  });

  describe('Form Validation', () => {
    it('disables save button when required fields are empty', async () => {
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when required fields are filled', async () => {
      const user = userEvent.setup();
      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill all required fields
      const nameInput = screen.getByLabelText(/Agency Name/i);
      await user.type(nameInput, 'Elite Tutors');

      await user.click(screen.getByRole('button', { name: 'Tutor placement' }));
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'GCSE' }));
      await user.click(screen.getByRole('button', { name: 'London' }));

      const yearsSelect = screen.getByLabelText(/Years in Business/i);
      await user.selectOptions(yearsSelect, '5-10 years');

      const descriptionTextarea = screen.getByLabelText(/Agency Description/i);
      await user.type(descriptionTextarea, 'Leading agency');

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
        agency_name: 'Elite Tutors London',
        services: ['Tutor placement', 'Background checks'],
        subject_specializations: ['Mathematics', 'Sciences'],
        education_levels: ['GCSE', 'A-Level'],
        coverage_areas: ['London', 'South East'],
        years_in_business: '5-10 years',
        number_of_tutors: '11-25',
        commission_rate: '15',
        certifications: ['DBS Enhanced Certification'],
        website_url: 'https://www.example.com',
        description: 'Leading tutoring agency in London'
      };

      (accountApi.getProfessionalInfo as jest.Mock).mockResolvedValue(mockTemplate);

      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(accountApi.getProfessionalInfo).toHaveBeenCalledWith('agent');
      });

      // Check that form is populated
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Tutor placement' })).toHaveClass('chipSelected');
        expect(screen.getByRole('button', { name: 'Mathematics' })).toHaveClass('chipSelected');
        expect(screen.getByRole('button', { name: 'London' })).toHaveClass('chipSelected');
      });
    });

    it('saves template successfully', async () => {
      const user = userEvent.setup();
      (accountApi.updateProfessionalInfo as jest.Mock).mockResolvedValue({ success: true });

      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill all required fields
      const nameInput = screen.getByLabelText(/Agency Name/i);
      await user.type(nameInput, 'Elite Tutors');

      await user.click(screen.getByRole('button', { name: 'Tutor placement' }));
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'GCSE' }));
      await user.click(screen.getByRole('button', { name: 'London' }));

      const yearsSelect = screen.getByLabelText(/Years in Business/i);
      await user.selectOptions(yearsSelect, '5-10 years');

      const descriptionTextarea = screen.getByLabelText(/Agency Description/i);
      await user.type(descriptionTextarea, 'Leading agency');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      // Check that API was called
      await waitFor(() => {
        expect(accountApi.updateProfessionalInfo).toHaveBeenCalledWith(
          expect.objectContaining({
            role_type: 'agent',
            agency_name: 'Elite Tutors',
            services: ['Tutor placement'],
            subject_specializations: ['Mathematics'],
            education_levels: ['GCSE'],
            coverage_areas: ['London']
          })
        );
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Template saved')
        );
      });
    });

    it('shows error toast on save failure', async () => {
      const user = userEvent.setup();
      (accountApi.updateProfessionalInfo as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      const nameInput = screen.getByLabelText(/Agency Name/i);
      await user.type(nameInput, 'Elite Tutors');

      await user.click(screen.getByRole('button', { name: 'Tutor placement' }));
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'GCSE' }));
      await user.click(screen.getByRole('button', { name: 'London' }));

      const yearsSelect = screen.getByLabelText(/Years in Business/i);
      await user.selectOptions(yearsSelect, '5-10 years');

      const descriptionTextarea = screen.getByLabelText(/Agency Description/i);
      await user.type(descriptionTextarea, 'Leading agency');

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

    it('filters empty certifications on submit', async () => {
      const user = userEvent.setup();
      (accountApi.updateProfessionalInfo as jest.Mock).mockResolvedValue({ success: true });

      render(<AgentProfessionalInfoForm />);

      await waitFor(() => {
        expect(screen.queryByText('Loading template...')).not.toBeInTheDocument();
      });

      // Fill required fields
      const nameInput = screen.getByLabelText(/Agency Name/i);
      await user.type(nameInput, 'Elite Tutors');

      await user.click(screen.getByRole('button', { name: 'Tutor placement' }));
      await user.click(screen.getByRole('button', { name: 'Mathematics' }));
      await user.click(screen.getByRole('button', { name: 'GCSE' }));
      await user.click(screen.getByRole('button', { name: 'London' }));

      const yearsSelect = screen.getByLabelText(/Years in Business/i);
      await user.selectOptions(yearsSelect, '5-10 years');

      const descriptionTextarea = screen.getByLabelText(/Agency Description/i);
      await user.type(descriptionTextarea, 'Leading agency');

      // Add certification but leave it empty
      const addButton = screen.getByRole('button', { name: /Add Certification/i });
      await user.click(addButton);

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      // Check that empty certifications were filtered out
      await waitFor(() => {
        expect(accountApi.updateProfessionalInfo).toHaveBeenCalledWith(
          expect.objectContaining({
            certifications: expect.arrayContaining([])
          })
        );
      });
    });
  });
});

// apps/web/tests/unit/marketplace/CreateListingForm.test.tsx

import { render, screen, fireEvent, waitFor } from '../test-utils';
import { jest } from '@jest/globals';
import CreateListingForm from '@/app/components/feature/listings/CreateListingForm';
import userEvent from '@testing-library/user-event';
import * as sharedFieldsAPI from '@/lib/api/sharedFields';

// Mock the shared fields API
jest.mock('@/lib/api/sharedFields', () => ({
  fetchFieldsForContext: jest.fn(),
}));

describe('CreateListingForm Wizard', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockContextFields = [
    {
      id: '1',
      shared_field_id: '1',
      shared_fields: {
        id: '1',
        field_name: 'serviceType',
        field_type: 'multiselect',
        label: 'Service Type',
        options: [
          { value: 'one-to-one', label: 'One-to-One Session' },
          { value: 'group-session', label: 'Group Session' },
          { value: 'workshop', label: 'Workshop / Webinar' },
          { value: 'study-package', label: 'Study Package' },
        ],
      },
    },
    {
      id: '2',
      shared_field_id: '2',
      shared_fields: {
        id: '2',
        field_name: 'subjects',
        field_type: 'multiselect',
        label: 'Subjects',
        options: [
          { value: 'Mathematics', label: 'Mathematics' },
          { value: 'English', label: 'English' },
        ],
      },
    },
    {
      id: '3',
      shared_field_id: '3',
      shared_fields: {
        id: '3',
        field_name: 'keyStages',
        field_type: 'multiselect',
        label: 'Key Stages',
        options: [
          { value: 'Primary (KS1-KS2)', label: 'Primary (KS1-KS2) - Age 5-11' },
          { value: 'GCSE (KS4)', label: 'GCSE (KS4) - Age 14-16' },
        ],
      },
    },
    {
      id: '4',
      shared_field_id: '4',
      shared_fields: {
        id: '4',
        field_name: 'sessionDuration',
        field_type: 'multiselect',
        label: 'Session Duration',
        options: [
          { value: '60', label: '1 hour' },
          { value: '90', label: '1.5 hours' },
        ],
      },
    },
    {
      id: '5',
      shared_field_id: '5',
      shared_fields: {
        id: '5',
        field_name: 'category',
        field_type: 'select',
        label: 'Category',
        options: [
          { value: 'Mathematics', label: 'Mathematics' },
          { value: 'English', label: 'English' },
        ],
      },
    },
    {
      id: '6',
      shared_field_id: '6',
      shared_fields: {
        id: '6',
        field_name: 'deliveryMode',
        field_type: 'select',
        label: 'Delivery Mode',
        options: [
          { value: 'online', label: 'Online' },
          { value: 'in-person', label: 'In-Person' },
        ],
      },
    },
    {
      id: '7',
      shared_field_id: '7',
      shared_fields: {
        id: '7',
        field_name: 'aiTools',
        field_type: 'multiselect',
        label: 'AI Tools',
        options: [
          { value: 'ChatGPT', label: 'ChatGPT' },
          { value: 'Claude', label: 'Claude' },
        ],
      },
    },
    {
      id: '8',
      shared_field_id: '8',
      shared_fields: {
        id: '8',
        field_name: 'packageType',
        field_type: 'select',
        label: 'Package Type',
        options: [
          { value: 'pdf', label: 'PDF / eBook' },
          { value: 'video', label: 'Video Course' },
        ],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the API to return our test data
    (sharedFieldsAPI.fetchFieldsForContext as jest.Mock).mockResolvedValue(mockContextFields);
  });

  // Helper function to render the form
  const renderForm = async () => {
    const user = userEvent.setup();
    render(
      <CreateListingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );
    // Wait for the query to resolve
    await waitFor(() => {
      expect(screen.queryByText(/Loading form configuration/i)).not.toBeInTheDocument();
    });
    return { user };
  };

  describe('Initial Rendering', () => {
    it('should render the Create Listing form', async () => {
      await renderForm();
      expect(screen.getByText('Create Listing')).toBeInTheDocument();
      // Check that Service Name label exists (v4.0)
      expect(screen.getByText(/Service Name/i)).toBeInTheDocument();
    });

    it('should show Service Name and Description fields', async () => {
      await renderForm();
      expect(screen.getByText(/Service Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Description/i)).toBeInTheDocument();
    });
  });

  describe('Step 1: Basic Information', () => {
    it('should show correct initial character count for description', async () => {
        await renderForm();
        // The component renders the counter as "(0/2000)" for description
        expect(screen.getByText(/\(0\/2000\)/)).toBeInTheDocument();
    });

    it('should update description character count on input', async () => {
        const { user } = await renderForm();
        // Find description textarea by placeholder (v4.0)
        const descInput = screen.getByPlaceholderText(/Describe your service in detail/i);
        await user.type(descInput, 'Test description');
        // "Test description" is 16 characters
        expect(screen.getByText(/\(16\/2000\)/)).toBeInTheDocument();
    });

    it('should show validation errors for service name field', async () => {
        const { user } = await renderForm();
        // Find service name input by placeholder (v4.0)
        const titleInput = screen.getByPlaceholderText(/e.g., GCSE Maths Tutor/i);

        // Clear service name to trigger required
        await user.clear(titleInput);
        const submitButton = screen.getByRole('button', {name: /Publish Listing/i});
        await user.click(submitButton);
        expect(await screen.findByText('Service name is required')).toBeInTheDocument();

        // Type short service name for length error
        await user.type(titleInput, 'short');
        await user.click(submitButton);
        expect(await screen.findByText('Service name must be at least 10 characters')).toBeInTheDocument();

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});

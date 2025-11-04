// apps/web/tests/unit/marketplace/CreateListingForm.test.tsx

import { render, screen, fireEvent, waitFor } from '../test-utils';
import { jest } from '@jest/globals';
import CreateListingForm from '@/app/components/listings/CreateListingForm';
import userEvent from '@testing-library/user-event';

describe('CreateListingForm Wizard', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to render the form
  const renderForm = () => {
    const user = userEvent.setup();
    render(
      <CreateListingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );
    return { user };
  };

  describe('Initial Rendering', () => {
    it('should render the Create Listing form', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
      expect(screen.getByText('Create Listing')).toBeInTheDocument();
      // Check that Service Name label exists (v4.0)
      expect(screen.getByText(/Service Name/i)).toBeInTheDocument();
    });

    it('should show Service Name and Description fields', () => {
      renderForm();
      expect(screen.getByText(/Service Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Description/i)).toBeInTheDocument();
    });
  });

  describe('Step 1: Basic Information', () => {
    it('should show correct initial character count for description', () => {
        renderForm();
        // The component renders the counter as "(0/2000)" for description
        expect(screen.getByText(/\(0\/2000\)/)).toBeInTheDocument();
    });

    it('should update description character count on input', async () => {
        const { user } = renderForm();
        // Find description textarea by placeholder (v4.0)
        const descInput = screen.getByPlaceholderText(/Describe your service in detail/i);
        await user.type(descInput, 'Test description');
        // "Test description" is 16 characters
        expect(screen.getByText(/\(16\/2000\)/)).toBeInTheDocument();
    });

    it('should show validation errors for service name field', async () => {
        const { user } = renderForm();
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
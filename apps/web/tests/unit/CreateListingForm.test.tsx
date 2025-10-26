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
      // Check that Service Title label exists
      expect(screen.getByText(/Service Title/i)).toBeInTheDocument();
    });

    it('should show Service Title and Description fields', () => {
      renderForm();
      expect(screen.getByText(/Service Title/i)).toBeInTheDocument();
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
        // Find description textarea by placeholder
        const descInput = screen.getByPlaceholderText(/Describe your teaching approach/i);
        await user.type(descInput, 'Test description');
        // "Test description" is 16 characters
        expect(screen.getByText(/\(16\/2000\)/)).toBeInTheDocument();
    });

    it('should show validation errors for title field', async () => {
        const { user } = renderForm();
        // Find title input by placeholder
        const titleInput = screen.getByPlaceholderText(/e.g., GCSE Mathematics/i);

        // Clear title to trigger required
        await user.clear(titleInput);
        const submitButton = screen.getByRole('button', {name: /Publish Listing/i});
        await user.click(submitButton);
        expect(await screen.findByText('Service title is required')).toBeInTheDocument();

        // Type short title for length error
        await user.type(titleInput, 'short');
        await user.click(submitButton);
        expect(await screen.findByText('Title must be at least 10 characters')).toBeInTheDocument();

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
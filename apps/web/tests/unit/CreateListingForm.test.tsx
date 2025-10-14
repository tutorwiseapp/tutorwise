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

  // Helper function to start the wizard and get to the first form step
  const startWizard = async () => {
    const user = userEvent.setup();
    render(
      <CreateListingForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );
    // Click the button on the Welcome step to start the form
    const startButton = screen.getByRole('button', { name: /Let's create my listing/i });
    await user.click(startButton);
    return { user };
  };

  describe('Initial Rendering', () => {
    it('should first render the Welcome step', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
      expect(screen.getByText('Create Your Tutoring Service')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Let's create my listing/i })
      ).toBeInTheDocument();
    });

    it('should navigate to the Basic Information step after starting', async () => {
      await startWizard();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      // The label in the component is "Service Title"
      expect(screen.getByLabelText(/Service Title/i)).toBeInTheDocument();
    });
  });

  describe('Step 1: Basic Information', () => {
    it('should have a pre-filled title based on user profile', async () => {
      await startWizard();
      // The mock profile's display_name is "Test User"
      const titleInput = screen.getByLabelText(/Service Title/i);
      expect(titleInput).toHaveValue("Test User's Tutoring Service");
    });

    it('should show correct initial character count for description', async () => {
        await startWizard();
        // The component renders the counter as "0 / 2000"
        expect(screen.getByText(/0\s*\/\s*2000/)).toBeInTheDocument();
    });

    it('should update description character count on input', async () => {
        const { user } = await startWizard();
        const descInput = screen.getByLabelText(/Description/i);
        await user.type(descInput, 'Test description');
        // "Test description" is 16 characters
        expect(screen.getByText(/16\s*\/\s*2000/)).toBeInTheDocument();
    });

    it('should show validation errors for empty fields', async () => {
        const { user } = await startWizard();
        const titleInput = screen.getByLabelText(/Service Title/i);
        const descInput = screen.getByLabelText(/Description/i);

        // Clear title to trigger required
        await user.clear(titleInput);
        const nextButton = screen.getByRole('button', {name: 'Continue'});
        await user.click(nextButton);
        expect(await screen.findByText('Title is required')).toBeInTheDocument();

        // Type short title for length error
        await user.type(titleInput, 'short');
        await user.click(nextButton);
        expect(await screen.findByText('Title must be at least 10 characters')).toBeInTheDocument();

        // Set short non-empty description to trigger length (bypasses required)
        await user.type(descInput, 'short desc'); // 10 chars < 50
        await user.click(nextButton);
        expect(screen.getByText('Description must be at least 50 characters')).toBeInTheDocument();
        
        expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import CreateListingForm from '@/app/components/listings/CreateListingForm';
import type { CreateListingInput } from '@tutorwise/shared-types';

describe('CreateListingForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all form sections', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('What You Teach')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.getByText('Location & Availability')).toBeInTheDocument();
    });

    it('should render title and description inputs', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByLabelText(/Listing Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });

    it('should render subject chips', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Physics')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should render level chips', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByText('GCSE')).toBeInTheDocument();
      expect(screen.getByText('A-Level')).toBeInTheDocument();
      expect(screen.getByText('University')).toBeInTheDocument();
    });

    it('should render location type dropdown', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const locationSelect = screen.getByLabelText(/Teaching Location/i);
      expect(locationSelect).toBeInTheDocument();
      expect(locationSelect).toHaveValue('online');
    });

    it('should render action buttons', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByText('Save as Draft')).toBeInTheDocument();
      expect(screen.getByText('Publish Listing')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update title field', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const titleInput = screen.getByLabelText(/Listing Title/i) as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Experienced Maths Tutor' } });

      expect(titleInput.value).toBe('Experienced Maths Tutor');
    });

    it('should update description field', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
      fireEvent.change(descInput, {
        target: { value: 'I am an experienced mathematics tutor with 10 years of teaching.' }
      });

      expect(descInput.value).toContain('experienced mathematics tutor');
    });

    it('should toggle subject selection', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const mathsChip = screen.getByText('Mathematics');
      fireEvent.click(mathsChip);

      // Chip should have selected class or aria-pressed
      expect(mathsChip.closest('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('should toggle multiple subjects', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText('Mathematics'));
      fireEvent.click(screen.getByText('Physics'));
      fireEvent.click(screen.getByText('Chemistry'));

      expect(screen.getByText('Mathematics').closest('button')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Physics').closest('button')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Chemistry').closest('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('should deselect a subject when clicked again', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const mathsChip = screen.getByText('Mathematics');
      fireEvent.click(mathsChip);
      fireEvent.click(mathsChip);

      expect(mathsChip.closest('button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('should toggle level selection', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const gcseChip = screen.getByText('GCSE');
      fireEvent.click(gcseChip);

      expect(gcseChip.closest('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('should update hourly rate', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const rateInput = screen.getByLabelText(/Hourly Rate/i) as HTMLInputElement;
      fireEvent.change(rateInput, { target: { value: '35' } });

      expect(rateInput.value).toBe('35');
    });

    it('should toggle free trial checkbox', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const freeTrialCheckbox = screen.getByLabelText(/Offer a free trial lesson/i) as HTMLInputElement;
      fireEvent.click(freeTrialCheckbox);

      expect(freeTrialCheckbox.checked).toBe(true);
    });

    it('should show trial duration when free trial is enabled', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const freeTrialCheckbox = screen.getByLabelText(/Offer a free trial lesson/i);
      fireEvent.click(freeTrialCheckbox);

      expect(screen.getByLabelText(/Trial Duration/i)).toBeInTheDocument();
    });

    it('should change location type', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const locationSelect = screen.getByLabelText(/Teaching Location/i) as HTMLSelectElement;
      fireEvent.change(locationSelect, { target: { value: 'in_person' } });

      expect(locationSelect.value).toBe('in_person');
    });

    it('should show location fields when in-person is selected', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const locationSelect = screen.getByLabelText(/Teaching Location/i);
      fireEvent.change(locationSelect, { target: { value: 'in_person' } });

      expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Postcode/i)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error when title is too short', async () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const titleInput = screen.getByLabelText(/Listing Title/i);
      fireEvent.change(titleInput, { target: { value: 'Short' } });

      fireEvent.click(screen.getByText('Publish Listing'));

      await waitFor(() => {
        expect(screen.getByText(/Title must be at least 10 characters/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when description is too short', async () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: 'Too short description' } });

      fireEvent.click(screen.getByText('Publish Listing'));

      await waitFor(() => {
        expect(screen.getByText(/Description must be at least 50 characters/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when no subjects selected', async () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const titleInput = screen.getByLabelText(/Listing Title/i);
      fireEvent.change(titleInput, { target: { value: 'Valid Title Here For Testing' } });

      fireEvent.click(screen.getByText('Publish Listing'));

      await waitFor(() => {
        expect(screen.getByText(/Select at least one subject/i)).toBeInTheDocument();
      });
    });

    it('should show error when no levels selected', async () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const titleInput = screen.getByLabelText(/Listing Title/i);
      fireEvent.change(titleInput, { target: { value: 'Valid Title Here' } });

      fireEvent.click(screen.getByText('Mathematics'));

      fireEvent.click(screen.getByText('Publish Listing'));

      await waitFor(() => {
        expect(screen.getByText(/Select at least one level/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data when form is valid', async () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      // Fill in valid data
      fireEvent.change(screen.getByLabelText(/Listing Title/i), {
        target: { value: 'Experienced Mathematics Tutor - GCSE Specialist' }
      });

      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: {
          value: 'I am an experienced mathematics tutor with over 10 years of teaching experience. I specialize in GCSE and A-Level mathematics.'
        }
      });

      fireEvent.click(screen.getByText('Mathematics'));
      fireEvent.click(screen.getByText('GCSE'));

      fireEvent.click(screen.getByText('Publish Listing'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Experienced Mathematics Tutor - GCSE Specialist',
            subjects: ['Mathematics'],
            levels: ['GCSE'],
            location_type: 'online',
            status: 'published',
          })
        );
      });
    });

    it('should save as draft when Save as Draft button is clicked', async () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByLabelText(/Listing Title/i), {
        target: { value: 'Draft Listing Title Here' }
      });

      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: 'This is a draft description with enough characters to pass validation rules.' }
      });

      fireEvent.click(screen.getByText('Mathematics'));
      fireEvent.click(screen.getByText('GCSE'));

      fireEvent.click(screen.getByText('Save as Draft'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'draft',
          })
        );
      });
    });

    it('should call onCancel when Cancel button is clicked', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable buttons when isSaving is true', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSaving={true} />);

      expect(screen.getByText('Publishing...')).toBeInTheDocument();
      expect(screen.getByText('Save as Draft')).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('Character Counters', () => {
    it('should show character count for title', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByText('0/200 characters')).toBeInTheDocument();

      const titleInput = screen.getByLabelText(/Listing Title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });

      expect(screen.getByText('10/200 characters')).toBeInTheDocument();
    });

    it('should show character count for description', () => {
      render(<CreateListingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByText('0/2000 characters')).toBeInTheDocument();

      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      expect(screen.getByText('16/2000 characters')).toBeInTheDocument();
    });
  });
});

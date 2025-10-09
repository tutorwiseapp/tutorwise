import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import SearchFilters from '@/app/components/marketplace/SearchFilters';
import type { ListingFilters } from '@tutorwise/shared-types';

describe('SearchFilters', () => {
  const mockOnFilterChange = jest.fn();
  const defaultFilters: ListingFilters = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
      expect(screen.getByLabelText(/Search/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search tutors/i)).toBeInTheDocument();
    });

    it('should render subject checkboxes', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Physics')).toBeInTheDocument();
      expect(screen.getByText('Chemistry')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should render level checkboxes', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('GCSE')).toBeInTheDocument();
      expect(screen.getByText('A-Level')).toBeInTheDocument();
      expect(screen.getByText('University')).toBeInTheDocument();
    });

    it('should render location type radio buttons', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
      expect(screen.getByLabelText('Online')).toBeInTheDocument();
      expect(screen.getByLabelText('In Person')).toBeInTheDocument();
      expect(screen.getByLabelText('Hybrid')).toBeInTheDocument();
    });

    it('should render price range inputs', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
      const priceInputs = screen.getAllByPlaceholderText(/Min|Max/);
      expect(priceInputs).toHaveLength(2);
    });
  });

  describe('Subject Filtering', () => {
    it('should toggle subject selection', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);

      const mathCheckbox = screen.getByLabelText('Mathematics') as HTMLInputElement;
      fireEvent.click(mathCheckbox);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        subjects: ['Mathematics'],
      });
    });

    it('should allow multiple subject selections', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByLabelText('Mathematics'));
      fireEvent.click(screen.getByLabelText('Physics'));

      expect(mockOnFilterChange).toHaveBeenCalledTimes(2);
    });

    it('should display selected subjects as checked', () => {
      const filtersWithSubjects: ListingFilters = {
        subjects: ['Mathematics', 'Physics'],
      };

      render(<SearchFilters filters={filtersWithSubjects} onFilterChange={mockOnFilterChange} />);

      const mathCheckbox = screen.getByLabelText('Mathematics') as HTMLInputElement;
      const physicsCheckbox = screen.getByLabelText('Physics') as HTMLInputElement;

      expect(mathCheckbox.checked).toBe(true);
      expect(physicsCheckbox.checked).toBe(true);
    });

    it('should deselect a subject when clicked again', () => {
      const filtersWithSubjects: ListingFilters = {
        subjects: ['Mathematics'],
      };

      render(<SearchFilters filters={filtersWithSubjects} onFilterChange={mockOnFilterChange} />);

      const mathCheckbox = screen.getByLabelText('Mathematics');
      fireEvent.click(mathCheckbox);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        subjects: [],
      });
    });
  });

  describe('Level Filtering', () => {
    it('should toggle level selection', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);

      const gcseCheckbox = screen.getByLabelText('GCSE');
      fireEvent.click(gcseCheckbox);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        levels: ['GCSE'],
      });
    });

    it('should display selected levels as checked', () => {
      const filtersWithLevels: ListingFilters = {
        levels: ['GCSE', 'A-Level'],
      };

      render(<SearchFilters filters={filtersWithLevels} onFilterChange={mockOnFilterChange} />);

      const gcseCheckbox = screen.getByLabelText('GCSE') as HTMLInputElement;
      const alevelCheckbox = screen.getByLabelText('A-Level') as HTMLInputElement;

      expect(gcseCheckbox.checked).toBe(true);
      expect(alevelCheckbox.checked).toBe(true);
    });
  });

  describe('Location Type Filtering', () => {
    it('should select location type', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);

      const onlineRadio = screen.getByLabelText('Online');
      fireEvent.click(onlineRadio);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        location_type: 'online',
      });
    });

    it('should display selected location type as checked', () => {
      const filtersWithLocation: ListingFilters = {
        location_type: 'online',
      };

      render(<SearchFilters filters={filtersWithLocation} onFilterChange={mockOnFilterChange} />);

      const onlineRadio = screen.getByLabelText('Online') as HTMLInputElement;
      expect(onlineRadio.checked).toBe(true);
    });

    it('should toggle location type when clicked again', () => {
      const filtersWithLocation: ListingFilters = {
        location_type: 'online',
      };

      render(<SearchFilters filters={filtersWithLocation} onFilterChange={mockOnFilterChange} />);

      const onlineRadio = screen.getByLabelText('Online');
      fireEvent.click(onlineRadio);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        location_type: undefined,
      });
    });
  });

  describe('Search', () => {
    it('should update search term on input', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);

      const searchInput = screen.getByPlaceholderText(/Search tutors/i);
      fireEvent.change(searchInput, { target: { value: 'maths tutor' } });

      expect((searchInput as HTMLInputElement).value).toBe('maths tutor');
    });

    it('should call onFilterChange when search is submitted', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);

      const searchInput = screen.getByPlaceholderText(/Search tutors/i);
      fireEvent.change(searchInput, { target: { value: 'maths tutor' } });

      const form = searchInput.closest('form')!;
      fireEvent.submit(form);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        search: 'maths tutor',
      });
    });

    it('should display existing search term', () => {
      const filtersWithSearch: ListingFilters = {
        search: 'physics tutor',
      };

      render(<SearchFilters filters={filtersWithSearch} onFilterChange={mockOnFilterChange} />);

      const searchInput = screen.getByPlaceholderText(/Search tutors/i) as HTMLInputElement;
      expect(searchInput.value).toBe('physics tutor');
    });
  });

  describe('Price Range', () => {
    it('should update min price on input', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);

      const minPriceInput = screen.getByPlaceholderText('Min');
      fireEvent.change(minPriceInput, { target: { value: '20' } });

      expect((minPriceInput as HTMLInputElement).value).toBe('20');
    });

    it('should update max price on input', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);

      const maxPriceInput = screen.getByPlaceholderText('Max');
      fireEvent.change(maxPriceInput, { target: { value: '50' } });

      expect((maxPriceInput as HTMLInputElement).value).toBe('50');
    });

    it('should call onFilterChange when price input loses focus', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);

      const minPriceInput = screen.getByPlaceholderText('Min');
      fireEvent.change(minPriceInput, { target: { value: '20' } });
      fireEvent.blur(minPriceInput);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        min_price: 20,
      });
    });

    it('should display existing price range', () => {
      const filtersWithPrice: ListingFilters = {
        min_price: 25,
        max_price: 60,
      };

      render(<SearchFilters filters={filtersWithPrice} onFilterChange={mockOnFilterChange} />);

      const minPriceInput = screen.getByPlaceholderText('Min') as HTMLInputElement;
      const maxPriceInput = screen.getByPlaceholderText('Max') as HTMLInputElement;

      expect(minPriceInput.value).toBe('25');
      expect(maxPriceInput.value).toBe('60');
    });
  });
});

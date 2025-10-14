// apps/web/tests/unit/marketplace/SearchFilters.test.tsx

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

  describe('Location Type Filtering', () => {
    it('should select location type', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
      const onlineRadio = screen.getByLabelText('Online');
      fireEvent.click(onlineRadio);
      expect(mockOnFilterChange).toHaveBeenCalledWith({ location_type: 'online' });
    });

    it('should display selected location type as checked', () => {
      const filtersWithLocation: ListingFilters = { location_type: 'online' };
      render(<SearchFilters filters={filtersWithLocation} onFilterChange={mockOnFilterChange} />);
      const onlineRadio = screen.getByLabelText('Online') as HTMLInputElement;
      expect(onlineRadio.checked).toBe(true);
    });

    it('should not trigger change on re-click of selected radio (standard HTML behavior)', () => {
      const filtersWithLocation: ListingFilters = { location_type: 'online' };
      render(<SearchFilters filters={filtersWithLocation} onFilterChange={mockOnFilterChange} />);
      const onlineRadio = screen.getByLabelText('Online');

      // Re-click: no call since already selected
      fireEvent.click(onlineRadio);
      expect(mockOnFilterChange).not.toHaveBeenCalled();
    });
  });

  describe('Subject Filtering', () => {
    it('should deselect a subject when clicked again', () => {
      const filtersWithSubjects: ListingFilters = { subjects: ['Mathematics'] };
      render(<SearchFilters filters={filtersWithSubjects} onFilterChange={mockOnFilterChange} />);
      const mathCheckbox = screen.getByLabelText('Mathematics');
      fireEvent.click(mathCheckbox);

      expect(mockOnFilterChange).toHaveBeenCalledWith({ ...filtersWithSubjects, subjects: [] });
    });
  });
});
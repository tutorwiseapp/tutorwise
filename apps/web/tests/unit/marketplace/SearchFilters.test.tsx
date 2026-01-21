// apps/web/tests/unit/marketplace/SearchFilters.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import SearchFilters from '@/app/components/feature/marketplace/SearchFilters';
import type { ListingFilters } from '@tutorwise/shared-types';

describe('SearchFilters', () => {
  const mockOnFilterChange = jest.fn();
  const defaultFilters: ListingFilters = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Delivery Mode Filtering', () => {
    it('should select delivery mode', () => {
      render(<SearchFilters filters={defaultFilters} onFilterChange={mockOnFilterChange} />);
      const onlineCheckbox = screen.getByLabelText('Online');
      fireEvent.click(onlineCheckbox);
      expect(mockOnFilterChange).toHaveBeenCalledWith({ delivery_modes: ['online'] });
    });

    it('should display selected delivery mode as checked', () => {
      const filtersWithDeliveryMode: ListingFilters = { delivery_modes: ['online'] };
      render(<SearchFilters filters={filtersWithDeliveryMode} onFilterChange={mockOnFilterChange} />);
      const onlineCheckbox = screen.getByLabelText('Online') as HTMLInputElement;
      expect(onlineCheckbox.checked).toBe(true);
    });

    it('should deselect a delivery mode when clicked again', () => {
      const filtersWithDeliveryMode: ListingFilters = { delivery_modes: ['online'] };
      render(<SearchFilters filters={filtersWithDeliveryMode} onFilterChange={mockOnFilterChange} />);
      const onlineCheckbox = screen.getByLabelText('Online');

      // Click again to deselect
      fireEvent.click(onlineCheckbox);
      expect(mockOnFilterChange).toHaveBeenCalledWith({ ...filtersWithDeliveryMode, delivery_modes: [] });
    });

    it('should allow selecting multiple delivery modes', () => {
      const filtersWithOnline: ListingFilters = { delivery_modes: ['online'] };
      render(<SearchFilters filters={filtersWithOnline} onFilterChange={mockOnFilterChange} />);
      const inPersonCheckbox = screen.getByLabelText('In Person');

      // Select second delivery mode
      fireEvent.click(inPersonCheckbox);
      expect(mockOnFilterChange).toHaveBeenCalledWith({ ...filtersWithOnline, delivery_modes: ['online', 'in_person'] });
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
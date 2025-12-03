'use client';

import { useState } from 'react';
import type { ListingFilters } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/actions/Button';

interface SearchFiltersProps {
  filters: ListingFilters;
  onFilterChange: (filters: ListingFilters) => void;
}

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Languages',
  'Music',
  'Art',
];

const LEVELS = [
  'Primary',
  'KS3',
  'GCSE',
  'A-Level',
  'University',
  'Adult Learning',
];

const LOCATION_TYPES = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In Person' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function SearchFilters({ filters, onFilterChange }: SearchFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [minPrice, setMinPrice] = useState(filters.min_price?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(filters.max_price?.toString() || '');

  const toggleSubject = (subject: string) => {
    const currentSubjects = filters.subjects || [];
    const newSubjects = currentSubjects.includes(subject)
      ? currentSubjects.filter((s) => s !== subject)
      : [...currentSubjects, subject];
    onFilterChange({ ...filters, subjects: newSubjects });
  };

  const toggleLevel = (level: string) => {
    const currentLevels = filters.levels || [];
    const newLevels = currentLevels.includes(level)
      ? currentLevels.filter((l) => l !== level)
      : [...currentLevels, level];
    onFilterChange({ ...filters, levels: newLevels });
  };

  const toggleLocationType = (locationType: string) => {
    onFilterChange({
      ...filters,
      location_type: filters.location_type === locationType ? undefined : locationType as any,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchTerm || undefined });
  };

  const handlePriceChange = () => {
    onFilterChange({
      ...filters,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search tutors..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit">
            Go
          </Button>
        </form>
      </div>

      {/* Subjects */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {SUBJECTS.map((subject) => (
            <label key={subject} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.subjects?.includes(subject) || false}
                onChange={() => toggleSubject(subject)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{subject}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Levels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Education Level</label>
        <div className="space-y-2">
          {LEVELS.map((level) => (
            <label key={level} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.levels?.includes(level) || false}
                onChange={() => toggleLevel(level)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{level}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Location Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Teaching Location</label>
        <div className="space-y-2">
          {LOCATION_TYPES.map(({ value, label }) => (
            <label key={value} className="flex items-center">
              <input
                type="radio"
                name="location_type"
                checked={filters.location_type === value}
                onChange={() => toggleLocationType(value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (£)</label>
        <div className="space-y-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={handlePriceChange}
            placeholder="Min"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={handlePriceChange}
            placeholder="Max"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

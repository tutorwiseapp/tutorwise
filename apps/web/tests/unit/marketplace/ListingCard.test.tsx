// apps/web/tests/unit/marketplace/ListingCard.test.tsx

import { render, screen } from '@testing-library/react';
import ListingCard from '@/app/components/marketplace/ListingCard';
import type { Listing } from '@tutorwise/shared-types';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('ListingCard', () => {
  const mockListing: Listing = {
    id: 'listing-123',
    profile_id: 'profile-456',
    title: 'Experienced Mathematics Tutor - GCSE & A-Level',
    description: 'I am an experienced mathematics tutor with over 10 years of teaching experience.',
    status: 'published',
    subjects: ['Mathematics', 'Physics'],
    levels: ['GCSE', 'A-Level'],
    hourly_rate: 35,
    location_type: 'online',
    view_count: 150,
    booking_count: 12,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    // --- Added missing properties to satisfy the type ---
    languages: ['English'],
    currency: 'GBP',
    free_trial: false,
    location_country: 'United Kingdom',
    timezone: 'Europe/London',
    images: [],
    tags: [],
    inquiry_count: 0,
  };

  it('should render listing title', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByRole('heading', { name: /Experienced Mathematics Tutor/i })).toBeInTheDocument();
  });

  it('should render listing description', () => {
    render(<ListingCard listing={mockListing} />);
    // Use a function for a more specific match to avoid matching the title
    expect(screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'p' && content.startsWith('I am an experienced mathematics tutor');
    })).toBeInTheDocument();
  });

  it('should render subjects as badges', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('should render levels as badges', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('GCSE')).toBeInTheDocument();
    expect(screen.getByText('A-Level')).toBeInTheDocument();
  });
});
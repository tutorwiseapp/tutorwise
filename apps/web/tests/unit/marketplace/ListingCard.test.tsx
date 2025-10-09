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
  };

  describe('Rendering', () => {
    it('should render listing title', () => {
      render(<ListingCard listing={mockListing} />);
      expect(screen.getByText('Experienced Mathematics Tutor - GCSE & A-Level')).toBeInTheDocument();
    });

    it('should render listing description', () => {
      render(<ListingCard listing={mockListing} />);
      expect(screen.getByText(/experienced mathematics tutor/i)).toBeInTheDocument();
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

    it('should render hourly rate', () => {
      render(<ListingCard listing={mockListing} />);
      expect(screen.getByText('£35')).toBeInTheDocument();
      expect(screen.getByText('/hr')).toBeInTheDocument();
    });

    it('should render location type', () => {
      render(<ListingCard listing={mockListing} />);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should render view count', () => {
      render(<ListingCard listing={mockListing} />);
      expect(screen.getByText('150 views')).toBeInTheDocument();
    });

    it('should render booking count', () => {
      render(<ListingCard listing={mockListing} />);
      expect(screen.getByText('12 bookings')).toBeInTheDocument();
    });
  });

  describe('Location Display', () => {
    it('should display "In Person" for in_person location type', () => {
      const inPersonListing = { ...mockListing, location_type: 'in_person' as const };
      render(<ListingCard listing={inPersonListing} />);
      expect(screen.getByText('In Person')).toBeInTheDocument();
    });

    it('should display "Hybrid" for hybrid location type', () => {
      const hybridListing = { ...mockListing, location_type: 'hybrid' as const };
      render(<ListingCard listing={hybridListing} />);
      expect(screen.getByText('Hybrid')).toBeInTheDocument();
    });

    it('should display city when provided', () => {
      const listingWithCity = { ...mockListing, location_city: 'London' };
      render(<ListingCard listing={listingWithCity} />);
      expect(screen.getByText(/London/)).toBeInTheDocument();
    });
  });

  describe('Subject and Level Badges', () => {
    it('should show "+N more" badge when more than 3 subjects', () => {
      const listingWithManySubjects = {
        ...mockListing,
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'],
      };
      render(<ListingCard listing={listingWithManySubjects} />);
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('should show "+N more" badge when more than 3 levels', () => {
      const listingWithManyLevels = {
        ...mockListing,
        levels: ['Primary', 'KS3', 'GCSE', 'A-Level'],
      };
      render(<ListingCard listing={listingWithManyLevels} />);
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });
  });

  describe('Free Trial Badge', () => {
    it('should show free trial badge when free_trial is true', () => {
      const listingWithTrial = { ...mockListing, free_trial: true };
      render(<ListingCard listing={listingWithTrial} />);
      expect(screen.getByText(/Free Trial Available/i)).toBeInTheDocument();
    });

    it('should not show free trial badge when free_trial is false', () => {
      render(<ListingCard listing={mockListing} />);
      expect(screen.queryByText(/Free Trial Available/i)).not.toBeInTheDocument();
    });
  });

  describe('Optional Fields', () => {
    it('should not render hourly rate section when not provided', () => {
      const listingWithoutRate = { ...mockListing, hourly_rate: undefined };
      render(<ListingCard listing={listingWithoutRate} />);
      expect(screen.queryByText('£')).not.toBeInTheDocument();
    });

    it('should not render booking count when zero', () => {
      const listingWithoutBookings = { ...mockListing, booking_count: 0 };
      render(<ListingCard listing={listingWithoutBookings} />);
      expect(screen.queryByText(/bookings/i)).not.toBeInTheDocument();
    });
  });

  describe('Link', () => {
    it('should link to listing details page', () => {
      const { container } = render(<ListingCard listing={mockListing} />);
      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/marketplace/listing-123');
    });
  });
});

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Container from '@/app/components/layout/Container';
import NotFound from '@/app/components/layout/NotFound';
import Button from '@/app/components/ui/Button';
import { getListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import { toast } from 'sonner';
import HybridHeader from '@/app/components/profile/HybridHeader';
import ProfileTabs from '@/app/components/profile/ProfileTabs';
import TutorNarrative from '@/app/components/profile/TutorNarrative';
import ReviewsSection from '@/app/components/profile/ReviewsSection';
import AvailabilitySection from '@/app/components/profile/AvailabilitySection';
import ProfessionalInfoSection from '@/app/components/profile/ProfessionalInfoSection';
import ActivityFeed from '@/app/components/profile/ActivityFeed';
import styles from './page.module.css';

export default function ListingDetailsPage() {
  const params = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadListing = useCallback(async () => {
    if (!params?.id) {
      setNotFound(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getListing(params.id as string);
      if (!data) {
        setNotFound(true);
      } else {
        setListing(data);
      }
    } catch (err) {
      console.error('Failed to load listing:', err);
      setError("We couldn't load this tutor's profile. Please try again later.");
      toast.error('Failed to load listing');
    } finally {
      setIsLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (notFound) {
    return (
      <Container>
        <NotFound
          title="Tutor Profile Not Found"
          message="We couldn't find the tutor you're looking for. They may have moved or the link may be incorrect."
          linkText="Back to Marketplace"
          linkHref="/marketplace"
        />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <Button onClick={loadListing}>Try Again</Button>
          </div>
        </div>
      </Container>
    );
  }

  if (!listing) {
    // This should not be reached, but as a fallback
    return null;
  }

  return (
    <div className={styles.pageWrapper}>
      <Container variant="profile">
        <HybridHeader listing={listing} />
        <ProfileTabs />
        <div className={styles.mainContent}>
          <div className={styles.leftColumn}>
            <TutorNarrative listing={listing} />
            <ReviewsSection />
            <AvailabilitySection />
            <ProfessionalInfoSection listing={listing} />
          </div>
          <div className={styles.rightColumn}>
            <ActivityFeed />
          </div>
        </div>
      </Container>
    </div>
  );
}
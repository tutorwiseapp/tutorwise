'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import NotFound from '@/app/components/layout/NotFound';
import Button from '@/app/components/ui/actions/Button';
import { getListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import HybridHeader from '@/app/components/feature/profile/HybridHeader';
import ProfileTabs from '@/app/components/feature/profile/ProfileTabs';
import TutorNarrative from '@/app/components/feature/profile/TutorNarrative';
import ReviewsSection from '@/app/components/feature/profile/ReviewsSection';
import AvailabilitySection from '@/app/components/feature/profile/AvailabilitySection';
import ProfessionalInfoSection from '@/app/components/feature/profile/ProfessionalInfoSection';
import ActivityFeed from '@/app/components/feature/profile/ActivityFeed';
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
    if (params?.id) {
      loadListing();
    }
  }, [loadListing, params?.id]);

  if (isLoading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.contentWrapper}>
          <NotFound
            title="Tutor Profile Not Found"
            message="We couldn't find the tutor you're looking for. They may have moved or the link may be incorrect."
            linkText="Back to Marketplace"
            linkHref="/marketplace"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.contentWrapper}>
          <div className={styles.errorContainer}>
            <h2 className={styles.errorTitle}>Something went wrong</h2>
            <p className={styles.errorMessage}>{error}</p>
            <Button onClick={loadListing}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.contentWrapper}>
        <HybridHeader listing={listing} />
        <ProfileTabs />
        <div className={styles.mainContent}>
          <div className={styles.leftColumn}>
            {/* TODO: TutorNarrative needs profile prop, not listing */}
            <ReviewsSection />
            {/* TODO: AvailabilitySection needs profile prop */}
            {/* TODO: ProfessionalInfoSection needs profile prop, not listing */}
          </div>
          <div className={styles.rightColumn}>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}

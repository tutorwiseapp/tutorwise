'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '@/app/components/layout/Container';
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
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      loadListing();
    }
  }, [params?.id]);

  const loadListing = async () => {
    if (!params?.id) return;

    setIsLoading(true);
    try {
      const data = await getListing(params.id as string);
      setListing(data);
    } catch (error) {
      console.error('Failed to load listing:', error);
      toast.error('Failed to load listing');
      router.push('/marketplace');
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!listing) {
    return null;
  }

  return (
    <div className={styles.pageWrapper}>
      <Container variant="profile">
        <HybridHeader listing={listing} />
        <ProfileTabs />
        <div className={styles.mainContent}>
          <div className={styles.leftColumn}>
            {/* The content below would eventually be driven by the active tab */}
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
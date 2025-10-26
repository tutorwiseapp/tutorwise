'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import NotFound from '@/app/components/layout/NotFound';
import Button from '@/app/components/ui/Button';
import type { Profile } from '@/types';
import { toast } from 'sonner';
import HybridHeader from '@/app/components/profile/HybridHeader';
import ProfileTabs from '@/app/components/profile/ProfileTabs';
import TutorNarrative from '@/app/components/profile/TutorNarrative';
import ReviewsSection from '@/app/components/profile/ReviewsSection';
import AvailabilitySection from '@/app/components/profile/AvailabilitySection';
import ProfessionalInfoSection from '@/app/components/profile/ProfessionalInfoSection';
import ClientProfile from '@/app/components/profile/ClientProfile';
import AgentProfile from '@/app/components/profile/AgentProfile';
import ActivityFeed from '@/app/components/profile/ActivityFeed';
import styles from './page.module.css';

const TutorProfile = ({ profile }: { profile: Profile }) => (
  <div className={styles.mainContent}>
    <div className={styles.leftColumn}>
      <TutorNarrative profile={profile} />
      <ReviewsSection />
      <AvailabilitySection profile={profile} />
      <ProfessionalInfoSection profile={profile} />
    </div>
    <div className={styles.rightColumn}>
      <ActivityFeed />
    </div>
  </div>
);

export default function PublicProfilePage() {
  const params = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!params?.id) {
      setNotFound(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const response = await fetch(`/api/profiles/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
        } else {
          throw new Error('Failed to load profile');
        }
      } else {
        const data = await response.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError("We couldn't load this profile. Please try again later.");
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    if (params?.id) {
      loadProfile();
    }
  }, [loadProfile, params?.id]);

  const renderProfileContent = () => {
    if (!profile) return null;

    // Assuming the primary role is the first one in the array
    const primaryRole = profile.roles[0];

    switch (primaryRole) {
      case 'provider':
        return <TutorProfile profile={profile} />;
      case 'agent':
        return <AgentProfile profile={profile} />;
      case 'seeker':
        return <ClientProfile profile={profile} />;
      default:
        return <p>This user has an unknown role.</p>;
    }
  };

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
            title="Profile Not Found"
            message="We couldn't find the profile you're looking for. They may have moved or the link may be incorrect."
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
            <Button onClick={loadProfile}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.contentWrapper}>
        <HybridHeader profile={profile} />
        <ProfileTabs />
        {renderProfileContent()}
      </div>
    </div>
  );
}

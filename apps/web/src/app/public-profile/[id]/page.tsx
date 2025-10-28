'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import NotFound from '@/app/components/layout/NotFound';
import Button from '@/app/components/ui/Button';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';
import HybridHeader from '@/app/components/profile/HybridHeader';
import PublicProfileTabs from '@/app/components/profile/PublicProfileTabs';
import TutorNarrative from '@/app/components/profile/TutorNarrative';
import ClientNarrative from '@/app/components/profile/ClientNarrative';
import AgentNarrative from '@/app/components/profile/AgentNarrative';
import ReviewsSection from '@/app/components/profile/ReviewsSection';
import AvailabilitySection from '@/app/components/profile/AvailabilitySection';
import ProfessionalInfoSection from '@/app/components/profile/ProfessionalInfoSection';
import ClientProfessionalInfo from '@/app/components/profile/ClientProfessionalInfo';
import AgentProfessionalInfo from '@/app/components/profile/AgentProfessionalInfo';
import ActivityFeed from '@/app/components/profile/ActivityFeed';
import styles from './page.module.css';

// Overview content for each role
const TutorOverview = ({ profile }: { profile: Profile }) => (
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

const ClientOverview = ({ profile }: { profile: Profile }) => (
  <div className={styles.mainContent}>
    <div className={styles.leftColumn}>
      <ClientNarrative profile={profile} />
      <ReviewsSection />
      <AvailabilitySection profile={profile} />
      <ClientProfessionalInfo profile={profile} />
    </div>
    <div className={styles.rightColumn}>
      <ActivityFeed />
    </div>
  </div>
);

const AgentOverview = ({ profile }: { profile: Profile }) => (
  <div className={styles.mainContent}>
    <div className={styles.leftColumn}>
      <AgentNarrative profile={profile} />
      <ReviewsSection />
      <AvailabilitySection profile={profile} />
      <AgentProfessionalInfo profile={profile} />
    </div>
    <div className={styles.rightColumn}>
      <ActivityFeed />
    </div>
  </div>
);

// Tab content component
const ProfileTabContent = ({
  activeTab,
  profile,
  activeRole
}: {
  activeTab: string;
  profile: Profile;
  activeRole: string | null;
}) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        // Render Overview based on active role
        switch (activeRole) {
          case 'tutor':
            return <TutorOverview profile={profile} />;
          case 'agent':
            return <AgentOverview profile={profile} />;
          case 'client':
            return <ClientOverview profile={profile} />;
          default:
            return (
              <div className={styles.mainContent}>
                <div className={styles.emptyState}>
                  <p>This profile is still being set up.</p>
                </div>
              </div>
            );
        }

      case 'Reviews':
        return (
          <div className={styles.mainContent}>
            <div className={styles.leftColumn}>
              <ReviewsSection />
            </div>
          </div>
        );

      case 'Matching Tutors':
      case 'Matching Clients':
      case 'Matching Agents':
      case 'Matching Listings':
        return (
          <div className={styles.mainContent}>
            <div className={styles.leftColumn}>
              <p>{activeTab} - Coming soon...</p>
            </div>
          </div>
        );

      default:
        return (
          <div className={styles.mainContent}>
            <div className={styles.leftColumn}>
              <p>Coming soon...</p>
            </div>
          </div>
        );
    }
  };

  return renderTabContent();
};

export default function PublicProfilePage() {
  const params = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

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

  // Handle profiles with no roles or empty roles array
  if (!profile.roles || profile.roles.length === 0) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.contentWrapper}>
          <HybridHeader profile={profile} activeRole={profile.active_role} />
          <div className={styles.mainContent}>
            <div className={styles.emptyState}>
              <p>This profile is still being set up.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.contentWrapper}>
        <HybridHeader profile={profile} activeRole={profile.active_role} />
        <PublicProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeRole={profile.active_role ?? null}
        />
        <ProfileTabContent
          activeTab={activeTab}
          profile={profile}
          activeRole={profile.active_role ?? null}
        />
      </div>
    </div>
  );
}

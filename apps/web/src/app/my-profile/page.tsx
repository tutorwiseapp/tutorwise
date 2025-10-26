'use client';

import { useState } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { Profile } from '@/types';
import { toast } from 'sonner';
import HybridHeader from '@/app/components/profile/HybridHeader';
import ProfileTabs from '@/app/components/profile/ProfileTabs';
import ReviewsSection from '@/app/components/profile/ReviewsSection';
import PersonalInfoForm from '@/app/components/profile/PersonalInfoForm';
import ProfessionalInfoForm from '@/app/components/profile/ProfessionalInfoForm';
import ClientProfile from '@/app/components/profile/ClientProfile';
import AgentProfile from '@/app/components/profile/AgentProfile';
import ActivityFeed from '@/app/components/profile/ActivityFeed';
import styles from './page.module.css';
import Container from '@/app/components/layout/Container';
import Button from '@/app/components/ui/Button';

const TutorProfile = ({
  profile,
  onSave,
  activeTab
}: {
  profile: Profile;
  onSave: (updatedProfile: Partial<Profile>) => Promise<void>;
  activeTab: string;
}) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Personal Info':
        return (
          <div className={styles.personalInfoContent}>
            <PersonalInfoForm profile={profile} onSave={onSave} />
          </div>
        );
      case 'Professional Info':
        return (
          <div className={styles.personalInfoContent}>
            <ProfessionalInfoForm profile={profile} onSave={onSave} />
          </div>
        );
      case 'Reviews':
        return (
          <div className={styles.mainContent}>
            <div className={styles.leftColumn}>
              <ReviewsSection />
            </div>
            <div className={styles.rightColumn}>
              <ActivityFeed />
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

export default function MyProfilePage() {
  const { profile, isLoading, activeRole, refreshProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState('Personal Info');

  const handleSave = async (updatedProfile: Partial<Profile>) => {
    if (!profile) return;

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProfile),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      await response.json();
      await refreshProfile(); // Refresh profile from server
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to update profile.');
      throw err;
    }
  };

  const renderProfileContent = () => {
    if (!profile) return null;

    // Use activeRole from context, fall back to roles array
    const currentRole = activeRole || (profile.roles && profile.roles.length > 0 ? profile.roles[0] : null);

    switch (currentRole) {
      case 'provider':
        return <TutorProfile profile={profile} onSave={handleSave} activeTab={activeTab} />;
      case 'agent':
        return <AgentProfile profile={profile} isEditable={true} onSave={handleSave} />;
      case 'seeker':
        return <ClientProfile profile={profile} isEditable={true} onSave={handleSave} />;
      default:
        return <TutorProfile profile={profile} onSave={handleSave} activeTab={activeTab} />;
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

  if (!profile) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.contentWrapper}>
          <div className={styles.errorContainer}>
            <h2 className={styles.errorTitle}>Unable to load profile</h2>
            <p className={styles.errorMessage}>Could not load your profile. Please try logging in again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.contentWrapper}>
        <HybridHeader
          profile={profile}
          actionsDisabled={true}
          isEditable={true}
          onUpdate={handleSave}
        />
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {renderProfileContent()}
      </div>
    </div>
  );
}
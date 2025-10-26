'use client';

import { useState } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { Profile } from '@/types';
import { toast } from 'sonner';
import HybridHeader from '@/app/components/profile/HybridHeader';
import ProfileTabs from '@/app/components/profile/ProfileTabs';
import PersonalInfoForm from '@/app/components/profile/PersonalInfoForm';
import ProfessionalInfoForm from '@/app/components/profile/ProfessionalInfoForm';
import styles from './page.module.css';

const ProfileContent = ({
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
        return null;
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

export default function ProfilePage() {
  const { profile, isLoading, refreshProfile } = useUserProfile();
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
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to update profile.');
      throw err;
    }
  };

  const renderProfileContent = () => {
    if (!profile) return null;
    return <ProfileContent profile={profile} onSave={handleSave} activeTab={activeTab} />;
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
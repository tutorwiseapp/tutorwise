/**
 * Filename: apps/web/src/app/(authenticated)/account/personal-info/page.tsx
 * Purpose: Personal Information tab page (Account Hub v4.8 - aligned with hub UI)
 * Created: 2025-11-09
 * Updated: 2025-11-09 - Refactored to follow Dashboard hub pattern
 *
 * Pattern: Uses ContextualSidebar from authenticated layout, not custom layout
 */
'use client';

import React from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { updateProfile } from '@/lib/api/profiles';
import PersonalInfoForm from '@/app/components/profile/PersonalInfoForm';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import { AccountTabs } from '@/app/components/account/AccountTabs';
import AccountCard from '@/app/components/account/AccountCard';
import PageHeader from '@/app/components/ui/PageHeader';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';
import styles from './page.module.css';

export default function PersonalInfoPage() {
  const { profile, refreshProfile } = useUserProfile();

  const handleSave = async (updatedProfile: Partial<Profile>) => {
    try {
      await updateProfile(updatedProfile);
      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {/* Center Column - Account Content */}
      <div className={styles.container}>
        <PageHeader
          title="Account Settings"
          subtitle="Manage your personal information, professional details, and account settings"
        />
      </div>

      {/* Tabs - Outside container for full-width effect */}
      <AccountTabs />

      {/* Content container */}
      <div className={styles.container}>
        <div className={styles.content}>
          <PersonalInfoForm profile={profile} onSave={handleSave} />
        </div>
      </div>

      {/* Right Sidebar - Account Card */}
      <ContextualSidebar>
        <AccountCard />
      </ContextualSidebar>
    </>
  );
}

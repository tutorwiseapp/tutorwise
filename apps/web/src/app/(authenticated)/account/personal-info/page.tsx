/**
 * Filename: apps/web/src/app/(authenticated)/account/personal-info/page.tsx
 * Purpose: Personal Information tab page (Account Hub v4.7)
 * Created: 2025-11-09
 *
 * Phase 3: Uses existing PersonalInfoForm
 * Future: Will be refactored with hybrid save pattern
 */
'use client';

import React from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { updateProfile } from '@/lib/api/profiles';
import PersonalInfoForm from '@/app/components/profile/PersonalInfoForm';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';

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
    <div>
      <PersonalInfoForm profile={profile} onSave={handleSave} />
    </div>
  );
}

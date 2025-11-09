/**
 * Filename: apps/web/src/app/(authenticated)/account/professional/page.tsx
 * Purpose: Professional Information tab page (Account Hub v4.7)
 * Created: 2025-11-09
 *
 * Phase 4: Uses existing ProfessionalInfoForm
 * Future: Will be replaced with modal pattern (read-only cards + Edit modals)
 */
'use client';

import React from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { updateProfile } from '@/lib/api/profiles';
import ProfessionalInfoForm from '@/app/components/profile/ProfessionalInfoForm';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';

export default function ProfessionalPage() {
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
      <ProfessionalInfoForm profile={profile} onSave={handleSave} />
    </div>
  );
}

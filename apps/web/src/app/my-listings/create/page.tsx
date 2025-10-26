'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { createListing } from '@/lib/api/listings';
import type { CreateListingInput } from '@tutorwise/shared-types';
import { toast } from 'sonner';
import CreateListingForm from '@/app/components/listings/CreateListingForm';
import styles from './page.module.css';

export default function CreateListingPage() {
  const router = useRouter();
  const { user, activeRole, getRoleDetails, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['provider', 'agent', 'seeker']);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CreateListingInput>>({});

  // Pre-fill form from role_details if available - MUST be before conditional returns
  useEffect(() => {
    async function loadRoleDetails() {
      if (activeRole && (activeRole === 'provider' || activeRole === 'agent')) {
        const roleDetails = await getRoleDetails(activeRole);
        if (roleDetails) {
          const prefillData: Partial<CreateListingInput> = {};

          // Pre-fill from tutor role_details
          if (roleDetails.subjects) {
            prefillData.subjects = roleDetails.subjects as string[];
          }
          if (roleDetails.hourly_rate) {
            prefillData.hourly_rate_min = roleDetails.hourly_rate;
            prefillData.hourly_rate_max = roleDetails.hourly_rate;
          }
          if (roleDetails.certifications) {
            prefillData.academic_qualifications = roleDetails.certifications;
          }
          if (roleDetails.experience) {
            prefillData.years_of_experience = roleDetails.experience;
          }
          if (roleDetails.session_types) {
            prefillData.teaching_methods = roleDetails.session_types;
          }

          setInitialData(prefillData);
        }
      }
    }
    loadRoleDetails();
  }, [activeRole, getRoleDetails]);

  // Show loading while checking auth and role
  if (userLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not logged in
  if (!user) {
    router.push('/login?redirect=/listings/create');
    return null;
  }

  // Role guard handles redirect automatically
  if (!isAllowed) {
    return null;
  }

  const handleSubmit = async (data: CreateListingInput) => {
    setIsSaving(true);
    try {
      const listing = await createListing(data);
      toast.success('Listing published successfully!');

      // Clear draft from localStorage on successful creation
      localStorage.removeItem('listing_draft');

      // Redirect to My Listings page after successful publish
      router.push('/my-listings');
    } catch (error) {
      console.error('Failed to create listing:', error);
      toast.error('Failed to create listing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/listings');
  };

  return (
    <div className={styles.listingPage}>
      <CreateListingForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSaving={isSaving}
        initialData={initialData}
      />
    </div>
  );
}

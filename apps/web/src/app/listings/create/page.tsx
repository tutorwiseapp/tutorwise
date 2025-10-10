'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createListing } from '@/lib/api/listings';
import type { CreateListingInput } from '@tutorwise/shared-types';
import { toast } from 'sonner';
import CreateListingForm from '@/app/components/listings/CreateListingForm';
import styles from './page.module.css';

export default function CreateListingPage() {
  const router = useRouter();
  const { user, activeRole, getRoleDetails, isLoading } = useUserProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CreateListingInput>>({});

  // Pre-fill form from role_details if available
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
          if (roleDetails.qualifications) {
            prefillData.academic_qualifications = roleDetails.qualifications as string[];
          }
          if (roleDetails.teaching_experience) {
            prefillData.years_of_experience = roleDetails.teaching_experience;
          }
          if (roleDetails.teaching_methods) {
            prefillData.teaching_methods = roleDetails.teaching_methods as string[];
          }

          setInitialData(prefillData);
        }
      }
    }
    loadRoleDetails();
  }, [activeRole, getRoleDetails]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/listings/create');
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
      router.push('/listings');
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

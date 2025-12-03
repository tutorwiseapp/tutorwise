'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { createListing } from '@/lib/api/listings';
import type { CreateListingInput } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import CreateListingForm from '@/app/components/feature/listings/CreateListingForm';
import styles from './page.module.css';

export default function CreateListingPage() {
  const router = useRouter();
  const { user, activeRole, profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent', 'client']);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CreateListingInput>>({});

  // Pre-fill form from professional_details - MUST be before conditional returns
  useEffect(() => {
    if (!profile?.professional_details || !activeRole) return;

    const prefillData: Partial<CreateListingInput> = {};

    // Pre-fill from professional_details.tutor (for provider role)
    if (activeRole === 'tutor') {
      const tutorData = profile.professional_details.tutor;
      if (tutorData) {
        if (tutorData.subjects) {
          prefillData.subjects = tutorData.subjects as string[];
        }
        if (tutorData.hourly_rate && Array.isArray(tutorData.hourly_rate)) {
          prefillData.hourly_rate_min = tutorData.hourly_rate[0];
          prefillData.hourly_rate_max = tutorData.hourly_rate[1] || tutorData.hourly_rate[0];
        }
        if (tutorData.certifications) {
          prefillData.academic_qualifications = tutorData.certifications;
        }
        if (tutorData.experience_level) {
          prefillData.years_of_experience = tutorData.experience_level;
        }
        if (tutorData.teaching_style) {
          prefillData.teaching_methods = tutorData.teaching_style;
        }
      }
    }

    // Pre-fill from professional_details.agent (for agent role)
    if (activeRole === 'agent') {
      const agentData = profile.professional_details.agent;
      if (agentData) {
        if (agentData.subject_specializations) {
          prefillData.subjects = agentData.subject_specializations;
        }
        if (agentData.description) {
          prefillData.description = agentData.description;
        }
      }
    }

    // Pre-fill from professional_details.client (for client role)
    if (activeRole === 'client') {
      const clientData = profile.professional_details.client;
      if (clientData) {
        if (clientData.subjects) {
          prefillData.subjects = clientData.subjects;
        }
      }
    }

    setInitialData(prefillData);
  }, [profile, activeRole]);

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

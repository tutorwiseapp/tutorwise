'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { createListing } from '@/lib/api/listings';
import type { CreateListingInput } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import ClientRequestForm from '@/app/components/feature/listings/create/client/ClientRequestForm';
import styles from './page.module.css';

export default function CreateRequestPage() {
  const router = useRouter();
  const { user, activeRole, profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['client']);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CreateListingInput>>({});

  // Pre-fill form from professional_details.client
  useEffect(() => {
    if (!profile?.professional_details?.client || !activeRole) return;

    const clientData = profile.professional_details.client;
    const prefillData: Partial<CreateListingInput> = {};

    // Only prefill subjects if available
    if (clientData.subjects) {
      prefillData.subjects = clientData.subjects;
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
    router.push('/login?redirect=/listings/create/request');
    return null;
  }

  // Role guard handles redirect automatically (clients only)
  if (!isAllowed) {
    return null;
  }

  const handleSubmit = async (data: CreateListingInput) => {
    setIsSaving(true);
    try {
      const listing = await createListing(data);
      toast.success('Tutoring request published successfully!');

      // Clear draft from localStorage on successful creation
      localStorage.removeItem('client_request_draft');

      // Redirect to My Listings page after successful publish
      router.push('/listings');
    } catch (error) {
      console.error('Failed to create request:', error);
      toast.error('Failed to create request. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/listings');
  };

  return (
    <div className={styles.requestPage}>
      <ClientRequestForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSaving={isSaving}
        initialData={initialData}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { createListing, getListing, updateListing } from '@/lib/api/listings';
import type { CreateListingInput } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import TutorRequestForm from '@/app/components/feature/listings/create/client/TutorRequestForm';
import styles from './page.module.css';

export default function CreateRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');
  const isEditMode = !!editId;

  const { user, activeRole, profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['client']);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CreateListingInput>>({});
  const [isLoadingListing, setIsLoadingListing] = useState(isEditMode);

  // Load existing listing data if in edit mode
  useEffect(() => {
    async function loadListingData() {
      if (!editId) return;
      try {
        const listing = await getListing(editId);
        if (listing) {
          setInitialData(listing as unknown as Partial<CreateListingInput>);
        } else {
          toast.error('Listing not found');
          router.push('/listings');
        }
      } catch (error) {
        console.error('Failed to load listing:', error);
        toast.error('Failed to load listing');
        router.push('/listings');
      } finally {
        setIsLoadingListing(false);
      }
    }
    loadListingData();
  }, [editId, router]);

  // Pre-fill form from professional_details.client (only for create mode)
  useEffect(() => {
    if (isEditMode) return;
    if (!profile?.professional_details?.client || !activeRole) return;

    const clientData = profile.professional_details.client;
    const prefillData: Partial<CreateListingInput> = {};

    // Only prefill subjects if available
    if (clientData.subjects) {
      prefillData.subjects = clientData.subjects;
    }

    setInitialData(prefillData);
  }, [profile, activeRole, isEditMode]);

  // Show loading while checking auth and role
  if (userLoading || roleLoading || isLoadingListing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{isLoadingListing ? 'Loading request...' : 'Loading...'}</p>
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
      if (isEditMode && editId) {
        await updateListing({ ...data, id: editId });
        toast.success('Request updated successfully!');
      } else {
        await createListing(data);
        toast.success('Tutoring request published successfully!');
        // Clear draft from localStorage on successful creation
        localStorage.removeItem('client_request_draft');
      }

      // Redirect to My Listings page after successful publish
      router.push('/listings');
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} request:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} request. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/listings');
  };

  return (
    <div className={styles.requestPage}>
      <TutorRequestForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSaving={isSaving}
        initialData={initialData}
      />
    </div>
  );
}

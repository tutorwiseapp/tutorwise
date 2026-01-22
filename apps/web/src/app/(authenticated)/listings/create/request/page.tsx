/**
 * Filename: request/page.tsx
 * Purpose: Client tutoring request creation page
 * Updated: 2026-01-22 - Migrated to Hub Layout Architecture (copied from one-to-one)
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { createListing, getListing, updateListing } from '@/lib/api/listings';
import type { CreateListingInput } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import { HubPageLayout, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import ListingsHeader from '@/app/components/feature/listings/create/widgets/ListingsHeader';
import ListingsStatsWidget from '@/app/components/feature/listings/create/widgets/ListingsStatsWidget';
import ListingsHelpWidget from '@/app/components/feature/listings/create/widgets/ListingsHelpWidget';
import ListingsTipWidget from '@/app/components/feature/listings/create/widgets/ListingsTipWidget';
import ListingsVideoWidget from '@/app/components/feature/listings/create/widgets/ListingsVideoWidget';
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
          toast.error('Request not found');
          router.push('/listings');
        }
      } catch (error) {
        console.error('Failed to load request:', error);
        toast.error('Failed to load request');
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

    if (clientData.subjects) {
      prefillData.subjects = clientData.subjects;
    }

    setInitialData(prefillData);
  }, [profile, activeRole, isEditMode]);

  // Prepare tabs data - single tab for client requests
  const tabs: HubTab[] = [
    { id: 'request', label: 'Tutor Requests', active: true },
  ];

  if (userLoading || roleLoading || isLoadingListing) {
    return (
      <HubPageLayout
        header={<ListingsHeader title={isEditMode ? "Edit Request" : "Create Tutoring Request"} subtitle="Tell us what you're looking for and we'll help you find the perfect tutor" />}
        tabs={<HubTabs tabs={tabs} onTabChange={() => {}} />}
        sidebar={
          <HubSidebar>
            <ListingsStatsWidget />
            <ListingsHelpWidget />
            <ListingsTipWidget />
            <ListingsVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading...</div>
      </HubPageLayout>
    );
  }

  if (!user) {
    router.push('/login?redirect=/listings/create/request');
    return null;
  }

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
        localStorage.removeItem('client_request_draft');
      }
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
    <HubPageLayout
      header={
        <ListingsHeader
          title={isEditMode ? "Edit Request" : "Create Tutoring Request"}
          subtitle={isEditMode
            ? "Update your tutoring request details"
            : "Tell us what you're looking for and we'll help you find the perfect tutor"
          }
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={() => {}} />}
      sidebar={
        <HubSidebar>
          <ListingsStatsWidget />
          <ListingsHelpWidget />
          <ListingsTipWidget />
          <ListingsVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.content}>
        <TutorRequestForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSaving={isSaving}
          initialData={initialData}
        />
      </div>
    </HubPageLayout>
  );
}

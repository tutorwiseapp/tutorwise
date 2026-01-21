/**
 * Filename: group-session/page.tsx
 * Purpose: Group Session tutoring service listing creation page
 * Updated: 2026-01-19 - Migrated to Hub Layout Architecture
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import TutorGroupSessionForm from '@/app/components/feature/listings/create/tutor/GroupSessionForm';
import AgentGroupSessionForm from '@/app/components/feature/listings/create/agent/GroupSessionForm';
import styles from './page.module.css';

export default function CreateGroupSessionPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');
  const isEditMode = !!editId;

  const { user, activeRole, profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);
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

  // Pre-fill form from professional_details (only for create mode)
  useEffect(() => {
    if (isEditMode) return;
    if (!profile?.professional_details || !activeRole) return;

    const prefillData: Partial<CreateListingInput> = {};

    if (activeRole === 'tutor') {
      const tutorData = profile.professional_details.tutor;
      if (tutorData?.subjects) prefillData.subjects = tutorData.subjects as string[];
      if (tutorData?.hourly_rate && Array.isArray(tutorData.hourly_rate)) {
        prefillData.hourly_rate_min = tutorData.hourly_rate[0];
        prefillData.hourly_rate_max = tutorData.hourly_rate[1] || tutorData.hourly_rate[0];
      }
    }

    if (activeRole === 'agent') {
      const agentData = profile.professional_details.agent;
      if (agentData?.subject_specializations) {
        prefillData.subjects = agentData.subject_specializations;
      }
    }

    setInitialData(prefillData);
  }, [profile, activeRole, isEditMode]);

  // Prepare tabs data
  const baseTabs: HubTab[] = [
    { id: 'one-to-one', label: 'One-to-One', active: pathname === '/listings/create/one-to-one' },
    { id: 'group-session', label: 'Group Session', active: pathname === '/listings/create/group-session' },
    { id: 'workshop', label: 'Workshop', active: pathname === '/listings/create/workshop' },
    { id: 'study-package', label: 'Study Package', active: pathname === '/listings/create/study-package' },
  ];

  // Add Job Listing tab only for agents
  const tabs: HubTab[] = activeRole === 'agent'
    ? [...baseTabs, { id: 'job-listing', label: 'Job Listing', active: pathname === '/listings/create/job-listing' }]
    : baseTabs;

  const handleTabChange = (tabId: string) => {
    router.push(`/listings/create/${tabId}`);
  };

  if (userLoading || roleLoading || isLoadingListing) {
    return (
      <HubPageLayout
        header={<ListingsHeader title={isEditMode ? "Edit Listing" : "Create Listing"} subtitle="Set up your tutoring services" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
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
    router.push('/login?redirect=/listings/create/group-session');
    return null;
  }

  if (!isAllowed) return null;

  const handleSubmit = async (data: CreateListingInput) => {
    setIsSaving(true);
    try {
      if (isEditMode && editId) {
        await updateListing({ ...data, id: editId });
        toast.success('Listing updated successfully!');
      } else {
        await createListing(data);
        toast.success('Group session listing published successfully!');
        localStorage.removeItem('group_session_draft');
      }
      router.push('/listings');
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} listing:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} listing. Please try again.`);
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
          title={isEditMode ? "Edit Listing" : "Create Listing"}
          subtitle={isEditMode ? "Update your small group tutoring service (2-10 students)" : "Set up your small group tutoring service (2-10 students)"}
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
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
        {activeRole === 'agent' ? (
          <AgentGroupSessionForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSaving={isSaving}
            initialData={initialData}
          />
        ) : (
          <TutorGroupSessionForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSaving={isSaving}
            initialData={initialData}
          />
        )}
      </div>
    </HubPageLayout>
  );
}

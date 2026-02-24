/**
 * Filename: group-session/page.tsx
 * Purpose: Group Session tutoring service listing creation page
 * Updated: 2026-01-19 - Migrated to Hub Layout Architecture
 * Updated: 2026-02-24 - Upgraded to React Query gold standard
 */
'use client';

import { useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const editId = searchParams?.get('edit');
  const isEditMode = !!editId;

  const { user, activeRole, profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);

  // React Query: Load existing listing in edit mode
  const {
    data: existingListing,
    isLoading: isLoadingListing,
    error: loadError,
  } = useQuery({
    queryKey: ['listing', editId],
    queryFn: async () => {
      if (!editId) return null;
      const listing = await getListing(editId);
      if (!listing) {
        toast.error('Listing not found');
        router.push('/listings');
        return null;
      }
      return listing;
    },
    enabled: isEditMode && !!editId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  // Pre-fill form data from profile or existing listing
  const initialData = useMemo(() => {
    // Edit mode: use existing listing data
    if (isEditMode && existingListing) {
      return existingListing as unknown as Partial<CreateListingInput>;
    }

    // Create mode: prefill from profile
    if (!profile?.professional_details || !activeRole) return {};

    const prefillData: Partial<CreateListingInput> = {};

    if (activeRole === 'tutor') {
      const tutorData = profile.professional_details.tutor;
      if (tutorData) {
        if (tutorData.subjects) prefillData.subjects = tutorData.subjects as string[];
        // Pre-fill hourly rate from tutor's group_session_rate profile setting
        if (tutorData.group_session_rate) {
          (prefillData as any).hourly_rate = tutorData.group_session_rate;
        }
      }
    }

    if (activeRole === 'agent') {
      const agentData = profile.professional_details.agent;
      if (agentData) {
        if (agentData.subject_specializations) {
          prefillData.subjects = agentData.subject_specializations;
        }
        // Pre-fill hourly rate from agent's group_session_rate profile setting
        if (agentData.group_session_rate) {
          (prefillData as any).hourly_rate = agentData.group_session_rate;
        }
      }
    }

    return prefillData;
  }, [isEditMode, existingListing, profile, activeRole]);

  // React Query: Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: CreateListingInput) => {
      if (isEditMode && editId) {
        return updateListing({ ...data, id: editId });
      }
      return createListing(data);
    },
    onSuccess: () => {
      const successMessage = isEditMode
        ? 'Group session listing updated successfully!'
        : 'Group session listing published successfully!';
      toast.success(successMessage);

      // Clear draft from localStorage
      if (!isEditMode) {
        localStorage.removeItem('group_session_draft');
      }

      // Invalidate listings cache
      queryClient.invalidateQueries({ queryKey: ['listings'] });

      // Navigate back to listings page
      router.push('/listings');
    },
    onError: (error) => {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} listing:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} listing. Please try again.`);
    },
  });

  // Prepare tabs data
  const baseTabs: HubTab[] = [
    { id: 'one-to-one', label: 'One-to-One', active: pathname === '/listings/create/one-to-one' },
    { id: 'group-session', label: 'Group Session', active: pathname === '/listings/create/group-session' },
    { id: 'workshop', label: 'Workshop', active: pathname === '/listings/create/workshop' },
    { id: 'study-package', label: 'Study Package', active: pathname === '/listings/create/study-package' },
    { id: 'subscription', label: 'Subscription', active: pathname === '/listings/create/subscription' },
  ];

  // Add Job Listing tab only for agents
  const tabs: HubTab[] = activeRole === 'agent'
    ? [...baseTabs, { id: 'job-listing', label: 'Job Listing', active: pathname === '/listings/create/job-listing' }]
    : baseTabs;

  const handleTabChange = (tabId: string) => {
    router.push(`/listings/create/${tabId}`);
  };

  const handleSubmit = (data: CreateListingInput) => {
    mutation.mutate(data);
  };

  const handleCancel = () => {
    router.push('/listings');
  };

  // Loading states
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

  // Auth check
  if (!user) {
    router.push('/login?redirect=/listings/create/group-session');
    return null;
  }

  if (!isAllowed) return null;

  // Error state
  if (loadError) {
    return (
      <HubPageLayout
        header={<ListingsHeader title="Error" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <ListingsHelpWidget />
          </HubSidebar>
        }
      >
        <div className={styles.error}>
          <p>Failed to load listing. Please try again.</p>
        </div>
      </HubPageLayout>
    );
  }

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
            isSaving={mutation.isPending}
            initialData={initialData}
          />
        ) : (
          <TutorGroupSessionForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSaving={mutation.isPending}
            initialData={initialData}
          />
        )}
      </div>
    </HubPageLayout>
  );
}

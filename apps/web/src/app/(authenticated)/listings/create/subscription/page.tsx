/**
 * Filename: subscription/page.tsx
 * Purpose: Subscription tutoring service listing creation page
 * Created: 2026-02-24
 * Updated: 2026-02-24 - Upgraded to React Query gold standard
 * Architecture: Hub Layout Architecture with React Query patterns
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
import TutorSubscriptionForm from '@/app/components/feature/listings/create/tutor/SubscriptionForm';
import AgentSubscriptionForm from '@/app/components/feature/listings/create/agent/SubscriptionForm';
import styles from './page.module.css';

export default function CreateSubscriptionPage() {
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
      if (tutorData?.subjects) prefillData.subjects = tutorData.subjects as string[];
    }

    if (activeRole === 'agent') {
      const agentData = profile.professional_details.agent;
      if (agentData?.subject_specializations) {
        prefillData.subjects = agentData.subject_specializations;
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
        ? 'Subscription listing updated successfully!'
        : 'Subscription listing published successfully!';
      toast.success(successMessage);

      // Clear draft from localStorage
      if (!isEditMode) {
        localStorage.removeItem('subscription_draft');
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
        header={<ListingsHeader title={isEditMode ? "Edit Listing" : "Create Listing"} subtitle="Set up your subscription tutoring service" />}
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
    router.push('/login?redirect=/listings/create/subscription');
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
          subtitle={isEditMode
            ? "Update your subscription tutoring service (ongoing monthly commitment)"
            : "Set up your subscription tutoring service (ongoing monthly commitment)"}
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
          <AgentSubscriptionForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSaving={mutation.isPending}
            initialData={initialData}
          />
        ) : (
          <TutorSubscriptionForm
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

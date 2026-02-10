/**
 * Filename: job-listing/page.tsx
 * Purpose: Job listing creation page (agent recruiting tutors)
 * Created: 2026-01-20 - Agent job posting feature
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { createListing } from '@/lib/api/listings';
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
import JobListingForm from '@/app/components/feature/listings/create/agent/JobListingForm';
import styles from './page.module.css';

export default function CreateJobListingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');
  const isEditMode = !!editId;
  const { user, activeRole, profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['agent']);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CreateListingInput>>({});
  const [isLoadingListing, _setIsLoadingListing] = useState(isEditMode);

  // Pre-fill form from professional_details and organisation
  useEffect(() => {
    if (!profile?.professional_details || !activeRole) return;

    const prefillData: Partial<CreateListingInput> = {};

    if (activeRole === 'agent') {
      const agentData = profile.professional_details.agent;
      if (agentData) {
        if (agentData.subject_specializations) {
          prefillData.subjects = agentData.subject_specializations;
        }
      }
    }

    // TODO: Add organisation pre-fill when organisation context is available
    // if (profile.organisation) {
    //   prefillData.about_organisation = profile.organisation.description;
    //   prefillData.organisation_type = profile.organisation.type;
    // }

    setInitialData(prefillData);
  }, [profile, activeRole, isEditMode]);

  // Prepare tabs data (only agent role has Job Listing tab)
  const tabs: HubTab[] = [
    { id: 'one-to-one', label: 'One-to-One', active: pathname === '/listings/create/one-to-one' },
    { id: 'group-session', label: 'Group Session', active: pathname === '/listings/create/group-session' },
    { id: 'workshop', label: 'Workshop', active: pathname === '/listings/create/workshop' },
    { id: 'study-package', label: 'Study Package', active: pathname === '/listings/create/study-package' },
    { id: 'job-listing', label: 'Job Listing', active: pathname === '/listings/create/job-listing' },
  ];

  const handleTabChange = (tabId: string) => {
    router.push(`/listings/create/${tabId}`);
  };

  if (userLoading || roleLoading || isLoadingListing) {
    return (
      <HubPageLayout
        header={<ListingsHeader title={isEditMode ? "Edit Listing" : "Create Listing"} subtitle="Post job opportunities for tutors" />}
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
    router.push('/login?redirect=/listings/create/job-listing');
    return null;
  }

  if (!isAllowed) {
    return null;
  }

  const handleSubmit = async (data: CreateListingInput) => {
    setIsSaving(true);
    try {
      const _listing = await createListing(data);
      toast.success('Job listing published successfully!');
      localStorage.removeItem('job_listing_draft');
      router.push('/listings');
    } catch (error) {
      console.error('Failed to create job listing:', error);
      toast.error('Failed to create job listing. Please try again.');
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
          title="Create Listing"
          subtitle="Post a job opportunity to recruit tutors"
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
        <JobListingForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSaving={isSaving}
          initialData={initialData}
        />
      </div>
    </HubPageLayout>
  );
}

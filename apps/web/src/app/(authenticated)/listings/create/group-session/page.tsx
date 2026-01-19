/**
 * Filename: group-session/page.tsx
 * Purpose: Group Session tutoring service listing creation page
 * Updated: 2026-01-19 - Migrated to Hub Layout Architecture
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { createListing } from '@/lib/api/listings';
import type { CreateListingInput } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import { HubPageLayout, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import ListingsHeader from '@/app/components/feature/listings/create/ListingsHeader';
import ListingsStatsWidget from '@/app/components/feature/listings/create/ListingsStatsWidget';
import ListingsHelpWidget from '@/app/components/feature/listings/create/ListingsHelpWidget';
import ListingsTipWidget from '@/app/components/feature/listings/create/ListingsTipWidget';
import ListingsVideoWidget from '@/app/components/feature/listings/create/ListingsVideoWidget';
import GroupSessionForm from '@/app/components/feature/listings/create/tutor/GroupSessionForm';
import styles from './page.module.css';

export default function CreateGroupSessionPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, activeRole, profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);
  const [isSaving, setIsSaving] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CreateListingInput>>({});

  // Pre-fill form from professional_details
  useEffect(() => {
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
  }, [profile, activeRole]);

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'one-to-one', label: 'One-to-One', active: pathname === '/listings/create/one-to-one' },
    { id: 'group-session', label: 'Group Session', active: pathname === '/listings/create/group-session' },
    { id: 'workshop', label: 'Workshop', active: pathname === '/listings/create/workshop' },
    { id: 'study-package', label: 'Study Package', active: pathname === '/listings/create/study-package' },
  ];

  const handleTabChange = (tabId: string) => {
    router.push(`/listings/create/${tabId}`);
  };

  if (userLoading || roleLoading) {
    return (
      <HubPageLayout
        header={<ListingsHeader title="Create Listing" subtitle="Set up your tutoring services" />}
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
      await createListing(data);
      toast.success('Group session listing published successfully!');
      localStorage.removeItem('group_session_draft');
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
    <HubPageLayout
      header={
        <ListingsHeader
          title="Create Listing"
          subtitle="Set up your small group tutoring service (2-10 students)"
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
        <GroupSessionForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSaving={isSaving}
          initialData={initialData}
        />
      </div>
    </HubPageLayout>
  );
}

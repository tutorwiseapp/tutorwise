/**
 * Filename: useOrganisationSettings.ts
 * Purpose: Shared hook for Organisation Settings pages
 * Created: 2026-01-08
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyOrganisation } from '@/lib/api/organisation';
import type { HubTab } from '@/app/components/hub/layout';
import { ORGANISATION_SETTINGS_TABS, type OrganisationSettingsTabId } from '@/app/config/organisationSettingsConfig';

interface UseOrganisationSettingsOptions {
  currentTab: OrganisationSettingsTabId;
}

export function useOrganisationSettings({ currentTab }: UseOrganisationSettingsOptions) {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(currentTab);

  // Fetch organisation with shared React Query config
  const {
    data: organisation,
    isLoading: orgLoading,
    isFetching: orgFetching,
  } = useQuery({
    queryKey: ['organisation', profile?.id],
    queryFn: getMyOrganisation,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Generate tabs with active state
  const tabs: HubTab[] = ORGANISATION_SETTINGS_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    active: activeTab === tab.id,
  }));

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as OrganisationSettingsTabId);
    router.push(`/organisation/settings/${tabId}`);
  };

  // Authorization check
  const isLoading = profileLoading || orgLoading;
  const isOwner = organisation?.profile_id === profile?.id;

  // Redirect if not authorized
  useEffect(() => {
    if (!isLoading && organisation && !isOwner) {
      router.push('/organisation');
    }
  }, [isLoading, organisation, isOwner, router]);

  // Redirect if no organisation found
  useEffect(() => {
    if (!isLoading && !organisation) {
      router.push('/organisation');
    }
  }, [isLoading, organisation, router]);

  return {
    // Data
    organisation,
    profile,

    // Loading states
    isLoading,
    orgFetching,

    // Authorization
    isOwner,

    // Tabs
    tabs,
    activeTab,
    handleTabChange,
  };
}

/**
 * Filename: apps/web/src/app/(authenticated)/organisation/page.tsx
 * Purpose: Organisation Hub - Agency/School Management (v8.0)
 * Created: 2025-11-19
 * Updated: 2025-12-17 - Integrated Smart Trial Reminder System with dismissal logic
 * Reference: organisation-solution-design-v6.md
 * Change History:
 * C003 - 2025-12-17 : Integrated Smart Trial Reminder System (v8.0) with localStorage dismissal and CSV export
 * C002 - 2025-12-03 : Migrated Team and Clients tab empty states to HubEmptyState component
 * C001 - 2025-11-29 : Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs, HubPagination
 *
 * Features:
 * - Team management (tutors/teachers)
 * - Client aggregation (students)
 * - Organisation settings
 * - Smart trial reminder system with progressive disclosure (v8.0)
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import {
  getMyOrganisation,
  getOrganisationMembers,
  getOrganisationStats,
  getOrganisationClients,
  getOrganisationSubscription,
  getOrganisationRecruitments,
  createOrganisation,
  removeMember,
} from '@/lib/api/organisation';
import { isPremium } from '@/lib/stripe/subscription-utils';
import type { OrganisationSubscription } from '@/lib/stripe/subscription-utils';
import {
  getTrialStatus,
  shouldShowPopup,
  dismissReminderForToday,
  getReminderMessage,
} from '@/lib/stripe/organisation-trial-status';
import { FEATURES } from '@/config/organisation-features';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import OrganisationStatsWidget from '@/app/components/feature/organisations/sidebar/OrganisationStatsWidget';
import OrganisationHelpWidget from '@/app/components/feature/organisations/sidebar/OrganisationHelpWidget';
import OrganisationTipWidget from '@/app/components/feature/organisations/sidebar/OrganisationTipWidget';
import OrganisationVideoWidget from '@/app/components/feature/organisations/sidebar/OrganisationVideoWidget';
import OrganisationInviteMemberModal from '@/app/components/feature/organisations/content/OrganisationInviteMemberModal';
import OrganisationInfoTab from '@/app/components/feature/organisations/tabs/OrganisationInfoTab';
import ManageMemberModal from '@/app/components/feature/organisations/content/ManageMemberModal';
import MemberCard from '@/app/components/feature/organisations/content/MemberCard';
import OrganisationStudentCard from '@/app/components/feature/organisations/content/OrganisationStudentCard';
import OrganisationPerformanceTab from '@/app/components/feature/organisations/tabs/OrganisationPerformanceTab';
// OrganisationReferralsTab removed - now has dedicated page at /organisation/[id]/referrals
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import SubscriptionRequired from '@/app/components/feature/organisations/content/SubscriptionRequired';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import type { OrganisationMember } from '@/lib/api/organisation';

type TabType = 'team' | 'clients' | 'recruitments' | 'performance' | 'info';
type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 4;

export default function OrganisationPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read tab from URL params (default: 'team')
  const tabFromUrl = (searchParams?.get('tab') as TabType) || 'team';
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl);

  // Sync activeTab with URL params
  useEffect(() => {
    const tabParam = searchParams?.get('tab') as TabType;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managingMember, setManagingMember] = useState<OrganisationMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(true);

  // Fetch organisation
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: organisation,
    isLoading: orgLoading,
    isFetching: orgFetching,
    error: orgError,
    refetch: refetchOrg,
  } = useQuery({
    queryKey: ['organisation', profile?.id],
    queryFn: getMyOrganisation,
    enabled: !!profile?.id, // Wait for profile to load before fetching
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always', // Always refetch when component mounts (page is clicked)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2,
  });

  // Fetch subscription status (v7.0: Check Premium access)
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    isFetching: subscriptionFetching,
  } = useQuery({
    queryKey: ['organisation-subscription', organisation?.id],
    queryFn: () => getOrganisationSubscription(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  // Fetch members (only if organisation exists)
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: members = [],
    isLoading: membersLoading,
    isFetching: membersFetching,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['organisation-members', organisation?.id],
    queryFn: () => getOrganisationMembers(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  // Fetch stats
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ['organisation-stats', organisation?.id],
    queryFn: () => getOrganisationStats(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Fetch clients (always load like Team tab for instant display)
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: clients = [],
    isLoading: clientsLoading,
    isFetching: clientsFetching,
  } = useQuery({
    queryKey: ['organisation-clients', organisation?.id],
    queryFn: () => getOrganisationClients(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Fetch recruitments (always load like Team tab for instant display)
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: recruitments = [],
    isLoading: recruitmentsLoading,
    isFetching: recruitmentsFetching,
  } = useQuery({
    queryKey: ['organisation-recruitments', organisation?.id],
    queryFn: () => getOrganisationRecruitments(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ organisationId, connectionId }: { organisationId: string; connectionId: string }) =>
      removeMember(organisationId, connectionId),
    onSuccess: () => {
      toast.success('Member removed from organisation');
      queryClient.invalidateQueries({ queryKey: ['organisation-members', organisation?.id] });
      queryClient.invalidateQueries({ queryKey: ['organisation-stats', organisation?.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

  // Create organisation mutation
  const createOrgMutation = useMutation({
    mutationFn: createOrganisation,
    onSuccess: () => {
      toast.success('Organisation created successfully');
      setShowCreateModal(false);
      refetchOrg();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create organisation');
    },
  });

  // Filtered and sorted members
  const filteredMembers = useMemo(() => {
    if (!members) return [];

    let filtered = [...members];

    // Search filtering (comprehensive search across all relevant fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((member) => {
        const name = member.full_name?.toLowerCase() || '';
        const email = member.email?.toLowerCase() || '';
        const bio = member.bio?.toLowerCase() || '';
        const role = member.role?.toLowerCase() || '';
        const location = member.location?.toLowerCase() || '';

        return name.includes(query) ||
               email.includes(query) ||
               bio.includes(query) ||
               role.includes(query) ||
               location.includes(query);
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        case 'oldest':
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case 'name-asc':
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'name-desc':
          return (b.full_name || '').localeCompare(a.full_name || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [members, searchQuery, sortBy]);

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    if (!clients) return [];

    let filtered = [...clients];

    // Search filtering (comprehensive search across all relevant fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((client: any) => {
        const name = client.full_name?.toLowerCase() || '';
        const email = client.email?.toLowerCase() || '';

        return name.includes(query) ||
               email.includes(query);
      });
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.since).getTime() - new Date(a.since).getTime();
        case 'oldest':
          return new Date(a.since).getTime() - new Date(b.since).getTime();
        case 'name-asc':
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'name-desc':
          return (b.full_name || '').localeCompare(a.full_name || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [clients, searchQuery, sortBy]);

  // Filtered and sorted recruitments
  const filteredRecruitments = useMemo(() => {
    if (!recruitments) return [];

    let filtered = [...recruitments];

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((recruitment) => {
        const name = recruitment.applicant_name?.toLowerCase() || '';
        const email = recruitment.applicant_email?.toLowerCase() || '';
        const expertise = recruitment.expertise?.toLowerCase() || '';

        return name.includes(query) ||
               email.includes(query) ||
               expertise.includes(query);
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
        case 'oldest':
          return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
        case 'name-asc':
          return (a.applicant_name || '').localeCompare(b.applicant_name || '');
        case 'name-desc':
          return (b.applicant_name || '').localeCompare(a.applicant_name || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [recruitments, searchQuery, sortBy]);

  // Pagination for team
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredMembers.slice(startIndex, endIndex);
  }, [filteredMembers, currentPage]);

  // Pagination for clients
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredClients.slice(startIndex, endIndex);
  }, [filteredClients, currentPage]);

  // Pagination for recruitments
  const paginatedRecruitments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredRecruitments.slice(startIndex, endIndex);
  }, [filteredRecruitments, currentPage]);

  // Reset to page 1 when filters or tab change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortBy]);

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!organisation) return;

    if (confirm(`Remove ${memberName} from the organisation? They will no longer be part of the team.`)) {
      // Note: We need the connection_id, not the profile_id
      // This is a simplification - in production we'd need to map member to connection
      removeMemberMutation.mutate({
        organisationId: organisation.id,
        connectionId: memberId, // TODO: Map to actual connection_id
      });
    }
  };

  const handleMessageMember = (memberId: string) => {
    router.push(`/messages?userId=${memberId}`);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabType);
    // Update URL to reflect tab change
    router.push(`/organisation?tab=${tabId}`, { scroll: false });
  };

  const handleInviteMember = () => {
    setShowInviteModal(true);
    setShowActionsMenu(false);
  };

  const handleViewPublicProfile = () => {
    if (profile?.id) {
      router.push(`/public-profile/${profile.id}`);
      setShowActionsMenu(false);
    }
  };

  const handleExportCSV = () => {
    const dataToExport = activeTab === 'team' ? filteredMembers : filteredClients;

    if (!dataToExport.length) {
      toast.error('No data to export');
      return;
    }

    let headers: string[];
    let rows: string[][];

    if (activeTab === 'team') {
      headers = ['Name', 'Email', 'Role', 'Joined'];
      rows = filteredMembers.map(member => [
        member.full_name || '',
        member.email || '',
        member.role || 'member',
        new Date(member.added_at).toLocaleDateString('en-GB'),
      ]);
    } else {
      headers = ['Name', 'Email', 'Tutor', 'Since'];
      rows = filteredClients.map((client: any) => [
        client.full_name || '',
        client.email || '',
        client.tutor_name || '',
        new Date(client.since).toLocaleDateString('en-GB'),
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `organisation-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${activeTab === 'team' ? 'Team' : 'Clients'} exported successfully`);
    setShowActionsMenu(false);
  };

  const handleInviteByEmail = () => {
    setShowInviteModal(true);
    setShowActionsMenu(false);
  };

  const handleFindPeople = () => {
    toast('Find people functionality coming soon!', { icon: '🔍' });
    setShowActionsMenu(false);
  };

  const handleCreateGroup = () => {
    toast('Organisation groups coming soon!', { icon: '📁' });
    setShowActionsMenu(false);
  };

  const handleCreateOrganisation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const website = formData.get('website') as string;

    if (!name) {
      toast.error('Organisation name is required');
      return;
    }

    createOrgMutation.mutate({
      name,
      description: description || undefined,
      website: website || undefined,
    });
  };

  const handleStartTrial = async () => {
    if (!organisation) {
      toast.error('Organisation not found');
      return;
    }

    try {
      // Call API to create Stripe Checkout Session
      const response = await fetch('/api/stripe/checkout/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisationId: organisation.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error('Failed to start trial. Please try again.');
    }
  };

  // Handle dismissing the trial reminder popup
  const handleDismissReminder = () => {
    if (!organisation || !subscription) return;

    const trialStatus = getTrialStatus(subscription);
    if (!trialStatus) return;

    // Save dismissal to localStorage
    dismissReminderForToday(organisation.id, trialStatus.daysRemaining);

    // Hide the modal
    setShowSubscriptionModal(false);

    toast.success('Reminder dismissed. You can access your data anytime before trial expiry.');
  };

  // Handle exporting data during trial reminder
  const handleExportData = () => {
    const dataToExport = activeTab === 'team' ? filteredMembers : filteredClients;

    if (!dataToExport.length) {
      toast.error('No data to export');
      return;
    }

    handleExportCSV();
    toast.success('Your data has been exported successfully.');
  };

  // Handle Manage Subscription - Opens Stripe Customer Portal
  const handleManageSubscription = async () => {
    if (!organisation) {
      toast.error('Organisation not found');
      return;
    }

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisationId: organisation.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management. Please try again.');
    }
  };

  // Handle Update Payment Method - Opens Stripe Customer Portal (payment method page)
  const handleUpdatePayment = async () => {
    if (!organisation) {
      toast.error('Organisation not found');
      return;
    }

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId: organisation.id,
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening payment update:', error);
      toast.error('Failed to open payment method update. Please try again.');
    }
  };

  // Handle Cancel Subscription - Show confirmation dialog
  const handleCancelSubscription = () => {
    if (!organisation || !subscription) {
      toast.error('No active subscription to cancel');
      return;
    }

    const confirmed = confirm(
      'Are you sure you want to cancel your subscription?\n\n' +
      'Your subscription will remain active until the end of the current billing period, ' +
      'then you will lose access to premium features.'
    );

    if (confirmed) {
      handleManageSubscription(); // Redirect to Stripe portal where they can cancel
    }
  };

  // Loading state
  if (profileLoading || orgLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Organisation" />}
        sidebar={
          <HubSidebar>
            <OrganisationStatsWidget
              teamSize={0}
              totalClients={0}
              monthlyRevenue={0}
            />
            <OrganisationHelpWidget
              subscription={subscription || null}
              onManageSubscription={handleManageSubscription}
            />
            <OrganisationTipWidget />
            <OrganisationVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading...</div>
      </HubPageLayout>
    );
  }

  // Error state
  if (orgError) {
    return (
      <HubPageLayout
        header={<HubHeader title="Organisation" />}
        sidebar={
          <HubSidebar>
            <OrganisationStatsWidget
              teamSize={0}
              totalClients={0}
              monthlyRevenue={0}
            />
            <OrganisationHelpWidget
              subscription={subscription || null}
              onManageSubscription={handleManageSubscription}
            />
            <OrganisationTipWidget />
            <OrganisationVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.error}>
          <h2>Error Loading Organisation</h2>
          <p>Failed to load organisation data. Please try again.</p>
          <Button onClick={() => refetchOrg()}>Retry</Button>
        </div>
      </HubPageLayout>
    );
  }

  // v9.0: HARD PAYWALL - Block access if no active subscription
  // Always show subscription required screen when not premium (ignore dismissal)
  if (organisation && !subscriptionLoading && !isPremium(subscription || null)) {
    const trialStatus = getTrialStatus(subscription || null);

    // HARD PAYWALL: Always block access if feature flag enabled
    if (FEATURES.SUBSCRIPTION_PAYWALL.enabled) {
      return (
        <HubPageLayout
          header={<HubHeader title="Organisation" />}
          sidebar={
            <HubSidebar>
              <OrganisationStatsWidget
                teamSize={stats?.team_size || 0}
                totalClients={stats?.total_clients || 0}
                monthlyRevenue={stats?.monthly_revenue || 0}
              />
              <OrganisationHelpWidget
                subscription={subscription || null}
              />
              <OrganisationTipWidget />
              <OrganisationVideoWidget />
            </HubSidebar>
          }
        >
          <SubscriptionRequired
            organisation={organisation}
            subscription={subscription || null}
            onStartTrial={handleStartTrial}
            onDismiss={undefined} // No dismissal in hard paywall
            onExportData={handleExportData}
            canDismiss={false} // Cannot dismiss when expired
          />
        </HubPageLayout>
      );
    }
  }

  // Empty state - no organisation yet
  if (!organisation) {
    return (
      <HubPageLayout
        header={<HubHeader title="Organisation" />}
        tabs={
          <HubTabs
            tabs={[
              { id: 'team', label: 'Team', count: 0, active: activeTab === 'team' },
              { id: 'clients', label: 'Clients', count: 0, active: activeTab === 'clients' },
              { id: 'info', label: 'Organisation Info', active: activeTab === 'info' },
            ]}
            onTabChange={handleTabChange}
          />
        }
        sidebar={
          <HubSidebar>
            <OrganisationStatsWidget
              teamSize={0}
              totalClients={0}
              monthlyRevenue={0}
            />
            <OrganisationHelpWidget
              subscription={subscription || null}
              onManageSubscription={handleManageSubscription}
            />
            <OrganisationTipWidget />
            <OrganisationVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No Organisation Yet</h3>
            <p className={styles.emptyText}>
              Create an organisation to manage your team of tutors and track your clients.
            </p>

            {showCreateModal ? (
              <form onSubmit={handleCreateOrganisation} className={styles.createForm}>
                <input
                  type="text"
                  name="name"
                  placeholder="Organisation Name"
                  className={styles.input}
                  required
                />
                <textarea
                  name="description"
                  placeholder="Description (optional)"
                  className={styles.textarea}
                  rows={3}
                />
                <input
                  type="url"
                  name="website"
                  placeholder="Website (optional)"
                  className={styles.input}
                />
                <div className={styles.formActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createOrgMutation.isPending}
                  >
                    {createOrgMutation.isPending ? 'Creating...' : 'Create Organisation'}
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Create Organisation
              </Button>
            )}
        </div>
      </HubPageLayout>
    );
  }

  // Main organisation view
  return (
    <HubPageLayout
      header={
        <HubHeader
          title={organisation.name}
          filters={
            activeTab !== 'info' ? (
              <div className={filterStyles.filtersContainer}>
                {/* Search Input */}
                <input
                  type="search"
                  placeholder={`Search ${
                    activeTab === 'team' ? 'team members' :
                    activeTab === 'clients' ? 'clients' :
                    'applications'
                  }...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={filterStyles.searchInput}
                />

                {/* Sort Dropdown */}
                <UnifiedSelect
                value={sortBy}
                onChange={(value) => setSortBy(value as SortType)}
                options={[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'name-asc', label: 'Name (A-Z)' },
                  { value: 'name-desc', label: 'Name (Z-A)' }
                ]}
                placeholder="Sort by"
              />
              </div>
            ) : undefined
          }
          actions={
            <>
              {/* Primary Action Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleInviteMember}
              >
                Invite Member
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  square
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={handleInviteByEmail}
                        className={actionStyles.menuButton}
                      >
                        Invite by Email
                      </button>
                      <button
                        onClick={handleFindPeople}
                        className={actionStyles.menuButton}
                      >
                        Find People
                      </button>
                      <button
                        onClick={handleCreateGroup}
                        className={actionStyles.menuButton}
                      >
                        Create Group
                      </button>
                      <button
                        onClick={handleViewPublicProfile}
                        className={actionStyles.menuButton}
                      >
                        View Public Profile
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className={actionStyles.menuButton}
                        disabled={activeTab === 'info'}
                      >
                        Export CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'team', label: 'Team', count: members.length, active: activeTab === 'team' },
            { id: 'clients', label: 'Clients', count: clients.length, active: activeTab === 'clients' },
            { id: 'recruitments', label: 'Recruitments', count: recruitments.length, active: activeTab === 'recruitments' },
            { id: 'performance', label: 'Performance', active: activeTab === 'performance' },
            { id: 'info', label: 'Organisation Info', active: activeTab === 'info' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <OrganisationStatsWidget
            teamSize={stats?.team_size || 0}
            totalClients={stats?.total_clients || 0}
            monthlyRevenue={stats?.monthly_revenue || 0}
          />
          <OrganisationHelpWidget
            subscription={subscription || null}
          />
          <OrganisationTipWidget />
          <OrganisationVideoWidget />
        </HubSidebar>
      }
    >
      {/* Team Tab */}
      {activeTab === 'team' && (
        <>
          {membersLoading ? (
            <div className={styles.loading}>Loading team...</div>
          ) : paginatedMembers.length === 0 ? (
            members.length === 0 ? (
              <HubEmptyState
                title="No Team Members Yet"
                description="Use the invite widget to add members to your team."
              />
            ) : (
              <HubEmptyState
                title="No Members Found"
                description="No team members match your current search."
              />
            )
          ) : (
            <>
              <div className={styles.cardList}>
                {paginatedMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onMessage={handleMessageMember}
                    onRemove={handleRemoveMember}
                    onManage={setManagingMember}
                  />
                ))}
              </div>

              {/* Pagination */}
              {filteredMembers.length > ITEMS_PER_PAGE && (
                <HubPagination
                  currentPage={currentPage}
                  totalItems={filteredMembers.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <>
          {clientsLoading ? (
            <div className={styles.loading}>Loading clients...</div>
          ) : paginatedClients.length === 0 ? (
            clients.length === 0 ? (
              <HubEmptyState
                title="No Clients Yet"
                description="Clients will appear here when your team members connect with students."
              />
            ) : (
              <HubEmptyState
                title="No Clients Found"
                description="No clients match your current search."
              />
            )
          ) : (
            <>
              <div className={styles.cardList}>
                {paginatedClients.map((client: any) => (
                  <OrganisationStudentCard
                    key={client.id}
                    client={client}
                  />
                ))}
              </div>

              {/* Pagination */}
              {filteredClients.length > ITEMS_PER_PAGE && (
                <HubPagination
                  currentPage={currentPage}
                  totalItems={filteredClients.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Recruitments Tab */}
      {activeTab === 'recruitments' && (
        <>
          {recruitmentsLoading ? (
            <div className={styles.loading}>Loading applications...</div>
          ) : paginatedRecruitments.length === 0 ? (
            recruitments.length === 0 ? (
              <HubEmptyState
                title="No Applications Yet"
                description="Recruitment applications will appear here when people apply to join your team."
              />
            ) : (
              <HubEmptyState
                title="No Applications Found"
                description="No applications match your current search."
              />
            )
          ) : (
            <>
              <div className={styles.cardList}>
                {paginatedRecruitments.map((application) => {
                  // Get status badge variant
                  const getStatusVariant = (status: string) => {
                    switch (status) {
                      case 'PENDING':
                        return 'warning';
                      case 'ACTIVE':
                        return 'success';
                      case 'REJECTED':
                        return 'error';
                      default:
                        return 'neutral';
                    }
                  };

                  // Format status label
                  const getStatusLabel = (status: string) => {
                    switch (status) {
                      case 'PENDING':
                        return 'Pending Review';
                      case 'ACTIVE':
                        return 'Approved';
                      case 'REJECTED':
                        return 'Rejected';
                      default:
                        return status;
                    }
                  };

                  // Format date
                  const appliedDate = new Date(application.applied_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <HubDetailCard
                      key={application.id}
                      image={{
                        src: application.applicant_avatar_url,
                        alt: application.applicant_name,
                        fallbackChar: application.applicant_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2),
                      }}
                      title={application.applicant_name}
                      titleHref={`/public-profile/${application.applicant_id}`}
                      status={{
                        label: getStatusLabel(application.status),
                        variant: getStatusVariant(application.status) as 'success' | 'warning' | 'error' | 'neutral',
                      }}
                      description={`Applied ${appliedDate}`}
                      details={[
                        { label: 'Email', value: application.applicant_email },
                        { label: 'Subjects', value: application.subjects.join(', ') },
                        {
                          label: 'Expertise',
                          value: application.expertise,
                          fullWidth: true,
                        },
                        {
                          label: 'Why Join',
                          value: application.why_join,
                          fullWidth: true,
                        },
                        {
                          label: 'Availability',
                          value: application.availability.join(', '),
                          fullWidth: true,
                        },
                        {
                          label: 'Fee Expectation',
                          value: application.tuition_fee_expectation
                            ? `£${application.tuition_fee_expectation}/hr`
                            : 'Not specified',
                        },
                        {
                          label: 'Salary Expectation',
                          value: application.salary_expectation
                            ? `£${application.salary_expectation.toLocaleString()}/yr`
                            : 'Not specified',
                        },
                      ]}
                      actions={
                        application.status === 'PENDING' ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                toast('Approve functionality coming soon!', { icon: '✅' });
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                router.push(`/messages?userId=${application.applicant_id}`);
                              }}
                            >
                              Message
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                toast('Reject functionality coming soon!', { icon: '❌' });
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              router.push(`/messages?userId=${application.applicant_id}`);
                            }}
                          >
                            Message
                          </Button>
                        )
                      }
                    />
                  );
                })}
              </div>

              {/* Pagination */}
              {filteredRecruitments.length > ITEMS_PER_PAGE && (
                <HubPagination
                  currentPage={currentPage}
                  totalItems={filteredRecruitments.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <OrganisationPerformanceTab organisationId={organisation.id} />
      )}

      {/* Info Tab */}
      {activeTab === 'info' && (
        <OrganisationInfoTab organisation={organisation} />
      )}

      {/* Manage Member Modal */}
      {managingMember && (
        <ManageMemberModal
          isOpen={true}
          onClose={() => setManagingMember(null)}
          member={managingMember}
          organisationId={organisation.id}
          defaultCommissionRate={organisation.settings?.default_commission_rate ?? null}
        />
      )}

      {/* Invite Member Modal */}
      <OrganisationInviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          refetchMembers();
          queryClient.invalidateQueries({ queryKey: ['organisation-stats', organisation?.id] });
        }}
        organisationId={organisation.id}
      />
    </HubPageLayout>
  );
}

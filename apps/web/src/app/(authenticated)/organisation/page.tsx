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

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import {
  getMyOrganisation,
  getOrganisationMembers,
  getOrganisationStats,
  getOrganisationClients,
  getOrganisationSubscription,
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
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import OrganisationStatsWidget from '@/app/components/feature/organisation/sidebar/OrganisationStatsWidget';
import OrganisationHelpWidget from '@/app/components/feature/organisation/sidebar/OrganisationHelpWidget';
import OrganisationTipWidget from '@/app/components/feature/organisation/sidebar/OrganisationTipWidget';
import OrganisationVideoWidget from '@/app/components/feature/organisation/sidebar/OrganisationVideoWidget';
import OrganisationInviteMemberModal from '@/app/components/feature/organisation/content/OrganisationInviteMemberModal';
import OrganisationInfoTab from '@/app/components/feature/organisation/tabs/OrganisationInfoTab';
import ManageMemberModal from '@/app/components/feature/organisation/content/ManageMemberModal';
import MemberCard from '@/app/components/feature/organisation/content/MemberCard';
import OrganisationStudentCard from '@/app/components/feature/organisation/content/OrganisationStudentCard';
import OrganisationPerformanceTab from '@/app/components/feature/organisation/tabs/OrganisationPerformanceTab';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import SubscriptionRequired from '@/app/components/feature/organisation/content/SubscriptionRequired';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import type { OrganisationMember } from '@/lib/api/organisation';

type TabType = 'team' | 'clients' | 'performance' | 'info';
type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 4;

export default function OrganisationPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('team');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managingMember, setManagingMember] = useState<OrganisationMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(true);

  // Fetch organisation
  const {
    data: organisation,
    isLoading: orgLoading,
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
  });

  // Fetch subscription status (v7.0: Check Premium access)
  const {
    data: subscription,
    isLoading: subscriptionLoading,
  } = useQuery({
    queryKey: ['organisation-subscription', organisation?.id],
    queryFn: () => getOrganisationSubscription(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch members (only if organisation exists)
  const {
    data: members = [],
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['organisation-members', organisation?.id],
    queryFn: () => getOrganisationMembers(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['organisation-stats', organisation?.id],
    queryFn: () => getOrganisationStats(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch clients (only when Clients tab is active)
  const {
    data: clients = [],
    isLoading: clientsLoading,
  } = useQuery({
    queryKey: ['organisation-clients', organisation?.id],
    queryFn: () => getOrganisationClients(organisation!.id),
    enabled: !!organisation && activeTab === 'clients',
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
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

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((member) => {
        const name = member.full_name?.toLowerCase() || '';
        const email = member.email?.toLowerCase() || '';
        return name.includes(query) || email.includes(query);
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

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((client: any) => {
        const name = client.full_name?.toLowerCase() || '';
        const email = client.email?.toLowerCase() || '';
        return name.includes(query) || email.includes(query);
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
            <OrganisationHelpWidget onSubscribeClick={handleStartTrial} />
            <OrganisationTipWidget />
            <OrganisationVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
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
            <OrganisationHelpWidget onSubscribeClick={handleStartTrial} />
            <OrganisationTipWidget />
            <OrganisationVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Error Loading Organisation</h2>
            <p>Failed to load organisation data. Please try again.</p>
            <Button onClick={() => refetchOrg()}>Retry</Button>
          </div>
        </div>
      </HubPageLayout>
    );
  }

  // v7.0: Subscription check - Block access if no active subscription
  // v8.0: Smart Trial Reminder System - Show popup based on trial status
  if (organisation && !subscriptionLoading && !isPremium(subscription || null)) {
    // Check if we should show the popup based on trial status
    const shouldShow = shouldShowPopup(organisation.id, subscription || null);
    const trialStatus = getTrialStatus(subscription || null);

    // Only render if popup should be shown OR if modal state is true
    if (shouldShow && showSubscriptionModal) {
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
              <OrganisationHelpWidget onSubscribeClick={handleStartTrial} />
              <OrganisationTipWidget />
              <OrganisationVideoWidget />
            </HubSidebar>
          }
        >
          <SubscriptionRequired
            organisation={organisation}
            subscription={subscription || null}
            onStartTrial={handleStartTrial}
            onDismiss={trialStatus?.canDismiss ? handleDismissReminder : undefined}
            onExportData={handleExportData}
            canDismiss={trialStatus?.canDismiss || false}
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
            <OrganisationHelpWidget onSubscribeClick={handleStartTrial} />
            <OrganisationTipWidget />
            <OrganisationVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
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
                  placeholder={`Search ${activeTab === 'team' ? 'team members' : 'clients'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={filterStyles.searchInput}
                />

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className={filterStyles.filterSelect}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
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
          <OrganisationHelpWidget onSubscribeClick={handleStartTrial} />
          <OrganisationTipWidget />
          <OrganisationVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
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

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className={styles.content}>
            <OrganisationPerformanceTab organisationId={organisation.id} />
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className={styles.content}>
            <OrganisationInfoTab organisation={organisation} />
          </div>
        )}
      </div>

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

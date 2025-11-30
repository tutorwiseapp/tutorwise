/**
 * Filename: apps/web/src/app/(authenticated)/organisation/page.tsx
 * Purpose: Organisation Hub - Agency/School Management (v6.1)
 * Created: 2025-11-19
 * Updated: 2025-11-29 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs, HubPagination
 * Reference: organisation-solution-design-v6.md
 *
 * Features:
 * - Team management (tutors/teachers)
 * - Client aggregation (students)
 * - Organisation settings
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import {
  getMyOrganisation,
  getOrganisationMembers,
  getOrganisationStats,
  getOrganisationClients,
  createOrganisation,
  removeMember,
} from '@/lib/api/organisation';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import OrganisationStatsWidget from '@/app/components/organisation/OrganisationStatsWidget';
import OrganisationInviteMemberModal from '@/app/components/organisation/OrganisationInviteMemberModal';
import InfoTab from '@/app/components/organisation/tabs/InfoTab';
import ManageMemberModal from '@/app/components/organisation/ManageMemberModal';
import MemberCard from '@/app/components/organisation/MemberCard';
import HubRowCard from '@/app/components/ui/hub-row-card/HubRowCard';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/ui/hub-layout';
import type { HubTab } from '@/app/components/ui/hub-layout';
import Button from '@/app/components/ui/Button';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import filterStyles from '@/app/components/ui/hub-layout/hub-filters.module.css';
import actionStyles from '@/app/components/ui/hub-layout/hub-actions.module.css';
import type { OrganisationMember } from '@/lib/api/organisation';

type TabType = 'team' | 'clients' | 'info';
type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 5;

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

  // Fetch organisation
  const {
    data: organisation,
    isLoading: orgLoading,
    error: orgError,
    refetch: refetchOrg,
  } = useQuery({
    queryKey: ['organisation', profile?.id],
    queryFn: getMyOrganisation,
    enabled: !!profile && !profileLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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

  // Loading state
  if (profileLoading || orgLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Organisation" />}
        sidebar={
          <ContextualSidebar>
            <OrganisationStatsWidget
              teamSize={0}
              totalClients={0}
              monthlyRevenue={0}
            />
          </ContextualSidebar>
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
          <ContextualSidebar>
            <OrganisationStatsWidget
              teamSize={0}
              totalClients={0}
              monthlyRevenue={0}
            />
          </ContextualSidebar>
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
          <ContextualSidebar>
            <OrganisationStatsWidget
              teamSize={0}
              totalClients={0}
              monthlyRevenue={0}
            />
          </ContextualSidebar>
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
            { id: 'info', label: 'Organisation Info', active: activeTab === 'info' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <ContextualSidebar>
          <OrganisationStatsWidget
            teamSize={stats?.team_size || 0}
            totalClients={stats?.total_clients || 0}
            monthlyRevenue={stats?.monthly_revenue || 0}
          />
        </ContextualSidebar>
      }
    >
      <div className={styles.container}>
        {/* Team Tab */}
        {activeTab === 'team' && (
          <>
            {membersLoading ? (
              <div className={styles.loading}>Loading team...</div>
            ) : paginatedMembers.length === 0 ? (
              <div className={styles.emptyState}>
                {members.length === 0 ? (
                  <>
                    <h3 className={styles.emptyTitle}>No Team Members Yet</h3>
                    <p className={styles.emptyText}>
                      Use the invite widget to add members to your team.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className={styles.emptyTitle}>No Members Found</h3>
                    <p className={styles.emptyText}>
                      No team members match your current search.
                    </p>
                  </>
                )}
              </div>
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
              <div className={styles.emptyState}>
                {clients.length === 0 ? (
                  <>
                    <h3 className={styles.emptyTitle}>No Clients Yet</h3>
                    <p className={styles.emptyText}>
                      Clients will appear here when your team members connect with students.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className={styles.emptyTitle}>No Clients Found</h3>
                    <p className={styles.emptyText}>
                      No clients match your current search.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className={styles.cardList}>
                  {paginatedClients.map((client: any) => (
                    <HubRowCard
                      key={client.id}
                      image={{
                        src: client.avatar_url,
                        alt: client.full_name || 'Student',
                        fallbackChar: client.full_name?.substring(0, 2).toUpperCase() || 'ST',
                      }}
                      title={client.full_name || client.email}
                      meta={[
                        `Student of ${client.tutor_name}`,
                        `Since ${new Date(client.since).toLocaleDateString()}`,
                      ]}
                      actions={
                        <Button variant="primary" size="sm">
                          View Details
                        </Button>
                      }
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

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className={styles.content}>
            <InfoTab organisation={organisation} />
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

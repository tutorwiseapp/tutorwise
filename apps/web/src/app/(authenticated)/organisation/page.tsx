/**
 * Filename: apps/web/src/app/(authenticated)/organisation/page.tsx
 * Purpose: Organisation Hub - Agency/School Management (v6.1)
 * Created: 2025-11-19
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
import OrganisationInviteWidget from '@/app/components/organisation/OrganisationInviteWidget';
import InfoTab from '@/app/components/organisation/InfoTab';
import HubRowCard from '@/app/components/ui/hub/HubRowCard';
import Button from '@/app/components/ui/Button';
import toast from 'react-hot-toast';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './page.module.css';

type TabType = 'team' | 'clients' | 'info';

export default function OrganisationPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('team');
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      <>
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
        <ContextualSidebar>
          <OrganisationStatsWidget
            teamSize={0}
            totalClients={0}
            monthlyRevenue={0}
          />
        </ContextualSidebar>
      </>
    );
  }

  // Error state
  if (orgError) {
    return (
      <>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Error Loading Organisation</h2>
            <p>Failed to load organisation data. Please try again.</p>
            <Button onClick={() => refetchOrg()}>Retry</Button>
          </div>
        </div>
        <ContextualSidebar>
          <OrganisationStatsWidget
            teamSize={0}
            totalClients={0}
            monthlyRevenue={0}
          />
        </ContextualSidebar>
      </>
    );
  }

  // Empty state - no organisation yet
  if (!organisation) {
    return (
      <>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Organisation</h1>
            <p className={styles.subtitle}>Manage your team and clients</p>
          </div>

          {/* Tab bar - always visible */}
          <div className={styles.filterTabs}>
            <button
              onClick={() => setActiveTab('team')}
              className={`${styles.filterTab} ${activeTab === 'team' ? styles.filterTabActive : ''}`}
            >
              Team (0)
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`${styles.filterTab} ${activeTab === 'clients' ? styles.filterTabActive : ''}`}
            >
              Clients (0)
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`${styles.filterTab} ${activeTab === 'info' ? styles.filterTabActive : ''}`}
            >
              Info
            </button>
          </div>

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
        <ContextualSidebar>
          <OrganisationStatsWidget
            teamSize={0}
            totalClients={0}
            monthlyRevenue={0}
          />
        </ContextualSidebar>
      </>
    );
  }

  // Main organisation view
  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{organisation.name}</h1>
          <p className={styles.subtitle}>{organisation.description || 'Manage your team and clients'}</p>
        </div>

        <div className={styles.filterTabs}>
          <button
            onClick={() => setActiveTab('team')}
            className={`${styles.filterTab} ${activeTab === 'team' ? styles.filterTabActive : ''}`}
          >
            Team ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`${styles.filterTab} ${activeTab === 'clients' ? styles.filterTabActive : ''}`}
          >
            Clients ({clients.length})
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`${styles.filterTab} ${activeTab === 'info' ? styles.filterTabActive : ''}`}
          >
            Info
          </button>
        </div>

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className={styles.content}>
            {membersLoading ? (
              <div className={styles.loading}>Loading team...</div>
            ) : members.length === 0 ? (
              <div className={styles.emptyTabState}>
                <p>No team members yet. Use the invite widget to add members.</p>
              </div>
            ) : (
              <div className={styles.cardList}>
                {members.map((member) => (
                  <HubRowCard
                    key={member.id}
                    image={{
                      src: member.avatar_url,
                      alt: member.full_name || 'Team member',
                      fallbackChar: member.full_name?.substring(0, 2).toUpperCase() || '??',
                    }}
                    title={member.full_name || member.email}
                    description={member.bio || undefined}
                    meta={[
                      member.role || 'Member',
                      member.location || 'Location not set',
                    ].filter(Boolean)}
                    stats={
                      <span>Active Students: {member.active_students_count || 0}</span>
                    }
                    actions={
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, member.full_name || member.email)}
                        >
                          Remove
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleMessageMember(member.id)}
                        >
                          Message
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className={styles.content}>
            {clientsLoading ? (
              <div className={styles.loading}>Loading clients...</div>
            ) : clients.length === 0 ? (
              <div className={styles.emptyTabState}>
                <p>No clients yet. Clients will appear here when your team members connect with students.</p>
              </div>
            ) : (
              <div className={styles.cardList}>
                {clients.map((client: any) => (
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
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className={styles.content}>
            <InfoTab organisation={organisation} />
          </div>
        )}
      </div>

      <ContextualSidebar>
        <OrganisationStatsWidget
          teamSize={stats?.team_size || 0}
          totalClients={stats?.total_clients || 0}
          monthlyRevenue={stats?.monthly_revenue || 0}
        />
        {organisation && (
          <OrganisationInviteWidget
            organisationId={organisation.id}
            onInviteSent={() => {
              refetchMembers();
              queryClient.invalidateQueries({ queryKey: ['organisation-stats', organisation.id] });
            }}
          />
        )}
      </ContextualSidebar>
    </>
  );
}

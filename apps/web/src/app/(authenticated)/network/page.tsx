/**
 * Filename: apps/web/src/app/(authenticated)/network/page.tsx
 * Purpose: Network & Connections page - LinkedIn-lite for Tutorwise (SDD v4.5)
 * Created: 2025-11-07
 * Updated: 2025-11-29 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyConnections, acceptConnection, rejectConnection, removeConnection } from '@/lib/api/network';
import { Connection } from '@/app/components/feature/network/ConnectionCard';
import ConnectionCard from '@/app/components/feature/network/ConnectionCard';
import ConnectionRequestModal from '@/app/components/feature/network/ConnectionRequestModal';
import { useConnectionsRealtime } from '@/app/hooks/useConnectionsRealtime';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import NetworkStatsWidget from '@/app/components/feature/network/NetworkStatsWidget';
import NetworkHelpWidget from '@/app/components/feature/network/NetworkHelpWidget';
import NetworkTipWidget from '@/app/components/feature/network/NetworkTipWidget';
import NetworkVideoWidget from '@/app/components/feature/network/NetworkVideoWidget';
import NetworkSkeleton from '@/app/components/feature/network/NetworkSkeleton';
import NetworkError from '@/app/components/feature/network/NetworkError';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type TabType = 'all' | 'pending-received' | 'pending-sent';
type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 4;

export default function NetworkPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // React Query: Fetch connections with automatic retry, caching, and background refetch
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: connections = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['connections', profile?.id],
    queryFn: getMyConnections,
    enabled: !!profile?.id, // Wait for profile to load before fetching
    staleTime: 2 * 60 * 1000, // 2 minutes (connections change frequently with realtime)
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData, // Show cached data instantly while refetching
    refetchOnMount: 'always', // Always refetch when component mounts (page is clicked)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Set up real-time subscriptions that invalidate queries
  useConnectionsRealtime({
    userId: profile?.id || '',
    enabled: !!profile,
    onInsert: () => {
      toast.success('New connection request received!');
      queryClient.invalidateQueries({ queryKey: ['connections', profile?.id] });
    },
    onUpdate: (payload: { new: { status: string; target_profile_id: string }; old: { status: string } }) => {
      // Check if connection was accepted (v4.6: ACTIVE status instead of 'accepted')
      if (payload.new.status === 'ACTIVE' && payload.old.status === 'PENDING') {
        const isTarget = payload.new.target_profile_id === profile?.id;
        if (isTarget) {
          toast.success('Connection request accepted!');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['connections', profile?.id] });
    },
    onDelete: () => {
      toast('A connection was removed');
      queryClient.invalidateQueries({ queryKey: ['connections', profile?.id] });
    },
  });

  // Calculate stats from connections data
  const stats = useMemo(() => {
    if (!profile || !connections) {
      return { total: 0, pendingReceived: 0, pendingSent: 0 };
    }

    const accepted = connections.filter((c: Connection) => c.status === 'accepted').length;
    const pendingReceived = connections.filter(
      (c: Connection) => c.status === 'pending' && c.receiver_id === profile.id
    ).length;
    const pendingSent = connections.filter(
      (c: Connection) => c.status === 'pending' && c.requester_id === profile.id
    ).length;

    return {
      total: accepted,
      pendingReceived,
      pendingSent,
    };
  }, [connections, profile]);

  // Accept connection mutation
  const acceptMutation = useMutation({
    mutationFn: acceptConnection,
    onMutate: async (connectionId) => {
      await queryClient.cancelQueries({ queryKey: ['connections', profile?.id] });
      const previousConnections = queryClient.getQueryData(['connections', profile?.id]);

      queryClient.setQueryData(['connections', profile?.id], (old: Connection[] = []) =>
        old.map((c) => (c.id === connectionId ? { ...c, status: 'accepted' } : c))
      );

      return { previousConnections };
    },
    onError: (err, connectionId, context) => {
      queryClient.setQueryData(['connections', profile?.id], context?.previousConnections);
      toast.error('Failed to accept connection');
    },
    onSuccess: () => {
      toast.success('Connection accepted!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', profile?.id] });
    },
  });

  // Reject connection mutation
  const rejectMutation = useMutation({
    mutationFn: rejectConnection,
    onMutate: async (connectionId) => {
      await queryClient.cancelQueries({ queryKey: ['connections', profile?.id] });
      const previousConnections = queryClient.getQueryData(['connections', profile?.id]);

      queryClient.setQueryData(['connections', profile?.id], (old: Connection[] = []) =>
        old.map((c) => (c.id === connectionId ? { ...c, status: 'rejected' } : c))
      );

      return { previousConnections };
    },
    onError: (err, connectionId, context) => {
      queryClient.setQueryData(['connections', profile?.id], context?.previousConnections);
      toast.error('Failed to reject connection');
    },
    onSuccess: () => {
      toast.success('Connection rejected');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', profile?.id] });
    },
  });

  // Remove connection mutation
  const removeMutation = useMutation({
    mutationFn: removeConnection,
    onMutate: async (connectionId) => {
      await queryClient.cancelQueries({ queryKey: ['connections', profile?.id] });
      const previousConnections = queryClient.getQueryData(['connections', profile?.id]);

      queryClient.setQueryData(['connections', profile?.id], (old: Connection[] = []) =>
        old.filter((c) => c.id !== connectionId)
      );

      return { previousConnections };
    },
    onError: (err, connectionId, context) => {
      queryClient.setQueryData(['connections', profile?.id], context?.previousConnections);
      toast.error('Failed to remove connection');
    },
    onSuccess: () => {
      toast.success('Connection removed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', profile?.id] });
    },
  });

  const handleAccept = async (connectionId: string) => {
    acceptMutation.mutate(connectionId);
  };

  const handleReject = async (connectionId: string) => {
    rejectMutation.mutate(connectionId);
  };

  const handleRemove = async (connectionId: string) => {
    removeMutation.mutate(connectionId);
  };

  const handleMessage = () => {
    // Navigate to Messages page for Ably-powered real-time chat
    toast('Opening messages...', { icon: '💬' });
    window.location.href = '/messages';
  };

  const filteredConnections = useMemo(() => {
    if (!profile || !connections) return [];

    let filtered = connections.filter((connection: Connection) => {
      // Tab filtering
      switch (activeTab) {
        case 'all':
          return connection.status === 'accepted';
        case 'pending-received':
          return connection.status === 'pending' && connection.receiver_id === profile.id;
        case 'pending-sent':
          return connection.status === 'pending' && connection.requester_id === profile.id;
        default:
          return false;
      }
    });

    // Search filtering (comprehensive search across all relevant fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((connection: Connection) => {
        const otherProfile = connection.requester_id === profile.id ? connection.receiver : connection.requester;
        const name = otherProfile?.full_name?.toLowerCase() || '';
        const email = otherProfile?.email?.toLowerCase() || '';
        const bio = otherProfile?.bio?.toLowerCase() || '';

        return name.includes(query) ||
               email.includes(query) ||
               bio.includes(query);
      });
    }

    // Sorting
    filtered.sort((a: Connection, b: Connection) => {
      const aProfile = a.requester_id === profile.id ? a.receiver : a.requester;
      const bProfile = b.requester_id === profile.id ? b.receiver : b.requester;

      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc': {
          const aName = aProfile?.full_name || '';
          const bName = bProfile?.full_name || '';
          return aName.localeCompare(bName);
        }
        case 'name-desc': {
          const aName = aProfile?.full_name || '';
          const bName = bProfile?.full_name || '';
          return bName.localeCompare(aName);
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [connections, activeTab, profile, searchQuery, sortBy]);

  // Pagination logic
  const totalItems = filteredConnections.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedConnections = filteredConnections.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleConnectionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['connections', profile?.id] });
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabType);
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Status', 'Connected On'];
    const rows = filteredConnections.map(connection => {
      const otherProfile = connection.requester_id === profile?.id ? connection.receiver : connection.requester;
      return [
        otherProfile?.full_name || '',
        otherProfile?.email || '',
        connection.status || '',
        new Date(connection.created_at).toLocaleDateString('en-GB'),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `connections-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Connections exported successfully');
    setShowActionsMenu(false);
  };

  const handleViewPublicProfile = () => {
    if (profile?.id) {
      window.location.href = `/public-profile/${profile.id}`;
      setShowActionsMenu(false);
    }
  };

  const handleInviteByEmail = () => {
    toast('Invite by email coming soon!', { icon: '✉️' });
    setShowActionsMenu(false);
  };

  const handleFindPeople = () => {
    setIsModalOpen(true);
    setShowActionsMenu(false);
  };

  const handleCreateGroup = () => {
    toast('Connection groups coming soon!', { icon: '📁' });
    setShowActionsMenu(false);
  };

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Network" />}
        sidebar={
          <HubSidebar>
            <NetworkStatsWidget stats={{ total: 0, pendingReceived: 0, pendingSent: 0 }} connections={[]} />
            <NetworkHelpWidget />
            <NetworkTipWidget />
            <NetworkVideoWidget />
          </HubSidebar>
        }
      >
        <NetworkSkeleton />
      </HubPageLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Network" />}
        sidebar={
          <HubSidebar>
            <NetworkStatsWidget stats={{ total: 0, pendingReceived: 0, pendingSent: 0 }} connections={[]} />
            <NetworkHelpWidget />
            <NetworkTipWidget />
            <NetworkVideoWidget />
          </HubSidebar>
        }
      >
        <NetworkError error={error as Error} onRetry={() => refetch()} />
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Network"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search connections..."
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
          }
          actions={
            <>
              {/* Primary Action: Add Connection */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
              >
                Add Connection
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
                    <div className={actionStyles.dropdownMenu} style={{ display: 'block' }}>
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
            { id: 'all', label: 'All Connections', count: stats.total, active: activeTab === 'all' },
            { id: 'pending-received', label: 'Requests', count: stats.pendingReceived, active: activeTab === 'pending-received' },
            { id: 'pending-sent', label: 'Sent', count: stats.pendingSent, active: activeTab === 'pending-sent' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          {/* Network Stats - Single vertical card with label-value rows */}
          <NetworkStatsWidget
            stats={stats}
            connections={filteredConnections}
          />
          <NetworkHelpWidget />
          <NetworkTipWidget />
          <NetworkVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {/* Content */}
        {filteredConnections.length === 0 ? (
          <>
            {activeTab === 'all' && (
              <HubEmptyState
                title="No connections yet"
                description="Start building your network by connecting with tutors, agents, and clients."
                actionLabel="Find Connections"
                onAction={() => setIsModalOpen(true)}
              />
            )}
            {activeTab === 'pending-received' && (
              <HubEmptyState
                title="No pending requests"
                description="You'll see connection requests from others here."
              />
            )}
            {activeTab === 'pending-sent' && (
              <HubEmptyState
                title="No sent requests"
                description="Connection requests you send will appear here."
              />
            )}
          </>
        ) : (
          <>
            <div className={styles.connectionsList}>
              {paginatedConnections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  currentUserId={profile?.id || ''}
                  variant={
                    activeTab === 'pending-received'
                      ? 'pending-received'
                      : activeTab === 'pending-sent'
                      ? 'pending-sent'
                      : 'accepted'
                  }
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onRemove={handleRemove}
                  onMessage={handleMessage}
                />
              ))}
            </div>

            {/* Pagination */}
            <HubPagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        {/* Connection Request Modal */}
        <ConnectionRequestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleConnectionSuccess}
        />
      </div>
    </HubPageLayout>
  );
}

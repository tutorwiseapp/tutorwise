/**
 * Filename: apps/web/src/app/(authenticated)/network/page.tsx
 * Purpose: Network & Connections page - LinkedIn-lite for Tutorwise (SDD v4.5)
 * Created: 2025-11-07
 * Updated: 2025-11-09 - Migrated to React Query for robust data fetching
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyConnections, acceptConnection, rejectConnection, removeConnection } from '@/lib/api/network';
import { Connection } from '@/app/components/network/ConnectionCard';
import ConnectionCard from '@/app/components/network/ConnectionCard';
import ConnectionRequestModal from '@/app/components/network/ConnectionRequestModal';
import { useConnectionsRealtime } from '@/app/hooks/useConnectionsRealtime';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import NetworkStatsWidget from '@/app/components/network/NetworkStatsWidget';
import QuickActionsWidget from '@/app/components/network/QuickActionsWidget';
import ConnectionGroupsWidget from '@/app/components/network/ConnectionGroupsWidget';
import NetworkSkeleton from '@/app/components/network/NetworkSkeleton';
import NetworkError from '@/app/components/network/NetworkError';
import toast from 'react-hot-toast';
import styles from './page.module.css';

type TabType = 'all' | 'pending-received' | 'pending-sent';

export default function NetworkPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // React Query: Fetch connections with automatic retry, caching, and background refetch
  const {
    data: connections = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['connections', profile?.id],
    queryFn: getMyConnections,
    enabled: !!profile && !profileLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes (connections change frequently with realtime)
    gcTime: 5 * 60 * 1000, // 5 minutes
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
    onUpdate: (payload: any) => {
      // Check if connection was accepted
      if (payload.new.status === 'accepted' && payload.old.status === 'pending') {
        const isReceiver = payload.new.receiver_id === profile?.id;
        if (isReceiver) {
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

  const handleMessage = (userId: string) => {
    // TODO: Integrate with Tawk.to chat
    toast('Chat feature coming soon with Tawk.to integration', { icon: '💬' });
  };

  const filteredConnections = useMemo(() => {
    if (!profile) return [];

    return connections.filter((connection: Connection) => {
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
  }, [connections, activeTab, profile]);

  const handleConnectionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['connections', profile?.id] });
  };

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <>
        <NetworkSkeleton />
        <ContextualSidebar>
          <NetworkStatsWidget stats={{ total: 0, pendingReceived: 0, pendingSent: 0 }} connections={[]} />
          <QuickActionsWidget onConnect={() => setIsModalOpen(true)} />
        </ContextualSidebar>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <NetworkError error={error as Error} onRetry={() => refetch()} />
        <ContextualSidebar>
          <NetworkStatsWidget stats={{ total: 0, pendingReceived: 0, pendingSent: 0 }} connections={[]} />
          <QuickActionsWidget onConnect={() => setIsModalOpen(true)} />
        </ContextualSidebar>
      </>
    );
  }

  return (
    <>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>My Network</h1>
          <p className={styles.subtitle}>
            Build your professional tutoring network and amplify your reach
          </p>
        </div>

        {/* Filter Tabs - Same pattern as Listings hub */}
        <div className={styles.filterTabs}>
          <button
            onClick={() => setActiveTab('all')}
            className={`${styles.filterTab} ${
              activeTab === 'all' ? styles.filterTabActive : ''
            }`}
          >
            All Connections ({stats.total})
          </button>
          <button
            onClick={() => setActiveTab('pending-received')}
            className={`${styles.filterTab} ${
              activeTab === 'pending-received' ? styles.filterTabActive : ''
            }`}
          >
            Requests ({stats.pendingReceived})
          </button>
          <button
            onClick={() => setActiveTab('pending-sent')}
            className={`${styles.filterTab} ${
              activeTab === 'pending-sent' ? styles.filterTabActive : ''
            }`}
          >
            Sent ({stats.pendingSent})
          </button>
        </div>

        {/* Content */}
        {filteredConnections.length === 0 ? (
          <div className={styles.emptyState}>
            {activeTab === 'all' && (
              <>
                <h3 className={styles.emptyTitle}>No connections yet</h3>
                <p className={styles.emptyText}>
                  Start building your network by connecting with tutors, agents, and clients.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className={styles.emptyButton}
                >
                  Find Connections
                </button>
              </>
            )}
            {activeTab === 'pending-received' && (
              <>
                <h3 className={styles.emptyTitle}>No pending requests</h3>
                <p className={styles.emptyText}>
                  You&apos;ll see connection requests from others here.
                </p>
              </>
            )}
            {activeTab === 'pending-sent' && (
              <>
                <h3 className={styles.emptyTitle}>No sent requests</h3>
                <p className={styles.emptyText}>
                  Connection requests you send will appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className={styles.connectionsList}>
            {filteredConnections.map((connection) => (
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
        )}

        {/* Connection Request Modal */}
        <ConnectionRequestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleConnectionSuccess}
        />
      </div>

      {/* Contextual Sidebar - Same pattern as Listings hub */}
      <ContextualSidebar>
        {/* Stats Cards at Top */}
        <NetworkStatsWidget
          stats={stats}
          connections={filteredConnections}
        />

        {/* Quick Actions */}
        <QuickActionsWidget onConnect={() => setIsModalOpen(true)} />

        {/* Connection Groups */}
        <ConnectionGroupsWidget
          onGroupSelect={setSelectedGroupId}
          selectedGroupId={selectedGroupId}
          onCreateGroup={() => setIsGroupModalOpen(true)}
        />
      </ContextualSidebar>
    </>
  );
}

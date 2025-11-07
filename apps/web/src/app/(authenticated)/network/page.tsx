/**
 * Filename: apps/web/src/app/(authenticated)/network/page.tsx
 * Purpose: Network & Connections page - LinkedIn-lite for Tutorwise (SDD v4.5)
 * Created: 2025-11-07
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ConnectionCard, { Connection } from '@/app/components/network/ConnectionCard';
import ConnectionRequestModal from '@/app/components/network/ConnectionRequestModal';
import { useConnectionsRealtime } from '@/app/hooks/useConnectionsRealtime';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import NetworkStatsWidget from '@/app/components/network/NetworkStatsWidget';
import QuickActionsWidget from '@/app/components/network/QuickActionsWidget';
import ConnectionGroupsWidget from '@/app/components/network/ConnectionGroupsWidget';
import toast from 'react-hot-toast';
import styles from './page.module.css';

type TabType = 'all' | 'pending-received' | 'pending-sent';

export default function NetworkPage() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pendingReceived: 0,
    pendingSent: 0,
  });

  useEffect(() => {
    if (profile) {
      fetchConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Set up real-time subscriptions
  useConnectionsRealtime({
    userId: profile?.id || '',
    enabled: !!profile,
    onInsert: () => {
      toast.success('New connection request received!');
      fetchConnections();
    },
    onUpdate: (payload) => {
      // Check if connection was accepted
      if (payload.new.status === 'accepted' && payload.old.status === 'pending') {
        const isReceiver = payload.new.receiver_id === profile?.id;
        if (isReceiver) {
          toast.success('Connection request accepted!');
        }
      }
      fetchConnections();
    },
    onDelete: () => {
      toast('A connection was removed');
      fetchConnections();
    },
  });

  const fetchConnections = useCallback(async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          requester_id,
          receiver_id,
          status,
          message,
          created_at,
          requester:requester_id(id, full_name, email, avatar_url, bio),
          receiver:receiver_id(id, full_name, email, avatar_url, bio)
        `)
        .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the Supabase response to our Connection type (requester and receiver are single objects, not arrays)
      const mappedConnections: Connection[] = data.map((conn: any) => ({
        ...conn,
        requester: Array.isArray(conn.requester) ? conn.requester[0] : conn.requester,
        receiver: Array.isArray(conn.receiver) ? conn.receiver[0] : conn.receiver,
      }));

      setConnections(mappedConnections);

      // Calculate stats (use mappedConnections instead of raw data)
      const accepted = mappedConnections.filter((c) => c.status === 'accepted').length;
      const pendingReceived = mappedConnections.filter(
        (c) => c.status === 'pending' && c.receiver_id === profile.id
      ).length;
      const pendingSent = mappedConnections.filter(
        (c) => c.status === 'pending' && c.requester_id === profile.id
      ).length;

      setStats({
        total: accepted,
        pendingReceived,
        pendingSent,
      });
    } catch (error) {
      console.error('[network] Fetch error:', error);
      toast.error('Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const handleAccept = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) throw error;

      await fetchConnections();
    } catch (error) {
      console.error('[network] Accept error:', error);
      throw error;
    }
  };

  const handleReject = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);

      if (error) throw error;

      await fetchConnections();
    } catch (error) {
      console.error('[network] Reject error:', error);
      throw error;
    }
  };

  const handleRemove = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      await fetchConnections();
    } catch (error) {
      console.error('[network] Remove error:', error);
      throw error;
    }
  };

  const handleMessage = (userId: string) => {
    // TODO: Integrate with Tawk.to chat
    toast('Chat feature coming soon with Tawk.to integration', { icon: '💬' });
  };

  const filteredConnections = connections.filter((connection) => {
    if (!profile) return false;

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

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
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
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading connections...</p>
          </div>
        ) : filteredConnections.length === 0 ? (
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
                currentUserId={profile.id}
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
          onSuccess={fetchConnections}
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

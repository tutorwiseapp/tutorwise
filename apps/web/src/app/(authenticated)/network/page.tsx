/**
 * Filename: apps/web/src/app/(authenticated)/network/page.tsx
 * Purpose: Network & Connections page - LinkedIn-lite for Tutorwise (SDD v4.5)
 * Created: 2025-11-07
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ConnectionCard, { Connection } from '@/app/components/network/ConnectionCard';
import ConnectionRequestModal from '@/app/components/network/ConnectionRequestModal';
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

  const fetchConnections = async () => {
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
  };

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
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Network</h1>
          <p className={styles.subtitle}>
            Build your professional tutoring network and amplify your reach
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className={styles.connectButton}
        >
          + Connect
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Connections</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.pendingReceived}</div>
          <div className={styles.statLabel}>Pending Requests</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.pendingSent}</div>
          <div className={styles.statLabel}>Sent Requests</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('all')}
          className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
        >
          All Connections ({stats.total})
        </button>
        <button
          onClick={() => setActiveTab('pending-received')}
          className={`${styles.tab} ${activeTab === 'pending-received' ? styles.tabActive : ''}`}
        >
          Requests ({stats.pendingReceived})
        </button>
        <button
          onClick={() => setActiveTab('pending-sent')}
          className={`${styles.tab} ${activeTab === 'pending-sent' ? styles.tabActive : ''}`}
        >
          Sent ({stats.pendingSent})
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading connections...</p>
          </div>
        ) : filteredConnections.length === 0 ? (
          <div className={styles.empty}>
            {activeTab === 'all' && (
              <>
                <div className={styles.emptyIcon}>🤝</div>
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
                <div className={styles.emptyIcon}>📬</div>
                <h3 className={styles.emptyTitle}>No pending requests</h3>
                <p className={styles.emptyText}>
                  You&apos;ll see connection requests from others here.
                </p>
              </>
            )}
            {activeTab === 'pending-sent' && (
              <>
                <div className={styles.emptyIcon}>⏳</div>
                <h3 className={styles.emptyTitle}>No sent requests</h3>
                <p className={styles.emptyText}>
                  Connection requests you send will appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
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
      </div>

      {/* Connection Request Modal */}
      <ConnectionRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchConnections}
      />
    </div>
  );
}

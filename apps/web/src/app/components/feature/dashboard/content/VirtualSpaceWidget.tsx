/**
 * Filename: VirtualSpaceWidget.tsx
 * Purpose: Dashboard widget for VirtualSpace quick actions (v5.9)
 * Created: 2026-02-14
 *
 * This widget allows users to:
 * - Create a new standalone VirtualSpace session
 * - View recent active sessions
 * - Quick join active sessions
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Plus, Users, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { WidgetSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import type { VirtualSpaceSessionListItem } from '@/lib/virtualspace';
import styles from './VirtualSpaceWidget.module.css';

export function VirtualSpaceWidget() {
  const router = useRouter();
  const [sessions, setSessions] = useState<VirtualSpaceSessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch('/api/virtualspace/sessions?status=active');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Error fetching VirtualSpace sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/virtualspace/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Quick Whiteboard Session' }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Session created!');
        router.push(`/virtualspace/${data.sessionId}`);
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      toast.error('Failed to create session');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return <WidgetSkeleton showIcon={true} />;
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Video className={styles.icon} size={20} />
          <h3 className={styles.title}>VirtualSpace</h3>
        </div>
        <button
          onClick={handleCreateSession}
          disabled={creating}
          className={styles.createButton}
          title="Create new whiteboard session"
        >
          <Plus size={16} />
          {creating ? 'Creating...' : 'New'}
        </button>
      </div>

      <div className={styles.content}>
        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              Start a whiteboard session to collaborate in real-time
            </p>
            <button
              onClick={handleCreateSession}
              disabled={creating}
              className={styles.emptyButton}
            >
              <Plus size={16} />
              Create Session
            </button>
          </div>
        ) : (
          <>
            <p className={styles.description}>Active sessions</p>

            <div className={styles.sessionList}>
              {sessions.map((session) => (
                <div key={session.id} className={styles.sessionItem}>
                  <div className={styles.sessionInfo}>
                    <p className={styles.sessionName}>{session.title}</p>
                    <p className={styles.sessionMeta}>
                      <Users size={12} />
                      {session.participantCount} · {formatRelativeTime(session.lastActivityAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/virtualspace/${session.id}`)}
                    className={styles.joinButton}
                    title="Join session"
                  >
                    <ExternalLink size={14} />
                    Join
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/virtualspace')}
              className={styles.viewAllButton}
            >
              View all sessions →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

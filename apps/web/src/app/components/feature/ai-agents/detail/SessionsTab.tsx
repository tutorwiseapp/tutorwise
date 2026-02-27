/**
 * Filename: SessionsTab.tsx
 * Purpose: AI Tutor Sessions - View past sessions and analytics
 * Created: 2026-02-23
 * Version: v1.0
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import styles from './SessionsTab.module.css';

interface Session {
  id: string;
  client_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  price_paid: number;
  status: 'active' | 'completed' | 'disputed' | 'refunded';
  reviewed: boolean;
  rating: number | null;
  thumbs_up_count: number;
  thumbs_down_count: number;
  fallback_to_sage_count: number;
}

interface SessionStats {
  totalSessions: number;
  totalRevenue: number;
  avgDuration: number;
  avgRating: number;
}

interface SessionsTabProps {
  aiTutorId: string;
}

export default function SessionsTab({ aiTutorId }: SessionsTabProps) {
  // Fetch sessions
  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['ai-tutor-sessions', aiTutorId],
    queryFn: async () => {
      const response = await fetch(`/api/ai-agents/${aiTutorId}/sessions`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
  });

  // Calculate stats
  const stats: SessionStats = {
    totalSessions: sessions.length,
    totalRevenue: sessions.reduce((sum, s) => sum + s.price_paid, 0),
    avgDuration:
      sessions.length > 0
        ? Math.round(
            sessions
              .filter((s) => s.duration_minutes)
              .reduce((sum, s) => sum + (s.duration_minutes || 0), 0) /
              sessions.filter((s) => s.duration_minutes).length
          )
        : 0,
    avgRating:
      sessions.filter((s) => s.rating).length > 0
        ? sessions
            .filter((s) => s.rating)
            .reduce((sum, s) => sum + (s.rating || 0), 0) /
          sessions.filter((s) => s.rating).length
        : 0,
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'In progress';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(Math.round(rating));
  };

  return (
    <div className={styles.container}>
      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Sessions</div>
          <div className={styles.statValue}>{stats.totalSessions}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Revenue</div>
          <div className={styles.statValue}>£{stats.totalRevenue.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Duration</div>
          <div className={styles.statValue}>{formatDuration(stats.avgDuration)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Rating</div>
          <div className={styles.statValue}>
            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className={styles.section}>
        <h3>Session History ({sessions.length})</h3>

        {isLoading ? (
          <div className={styles.emptyState}>
            <p>Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No sessions yet</p>
            <p>Sessions will appear here once clients start booking your AI tutor</p>
          </div>
        ) : (
          <div className={styles.sessionsList}>
            {sessions.map((session) => (
              <div
                key={session.id}
                className={styles.sessionItem}
                onClick={() =>
                  (window.location.href = `/ai-agents/sessions/${session.id}`)
                }
              >
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionDate}>
                    {new Date(session.started_at).toLocaleString()}
                  </div>
                  <div className={styles.sessionMeta}>
                    <span>
                      ⏱️ {formatDuration(session.duration_minutes)}
                    </span>
                    <span>💰 £{session.price_paid.toFixed(2)}</span>
                    {session.reviewed && session.rating && (
                      <span className={styles.rating}>
                        <span className={styles.stars}>
                          {renderStars(session.rating)}
                        </span>
                        ({session.rating})
                      </span>
                    )}
                    {session.fallback_to_sage_count > 0 && (
                      <span title="Sage fallback used">
                        🔄 {session.fallback_to_sage_count}× fallback
                      </span>
                    )}
                    <span>
                      👍 {session.thumbs_up_count} / 👎{' '}
                      {session.thumbs_down_count}
                    </span>
                  </div>
                </div>

                <span
                  className={`${styles.statusBadge} ${styles[session.status]}`}
                >
                  {session.status}
                </span>

                <button className={styles.viewButton}>View Transcript</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

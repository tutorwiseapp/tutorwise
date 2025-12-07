/**
 * Filename: PendingLogsWidget.tsx
 * Purpose: Nudge widget for pending session completions (WiseSpace v5.8)
 * Created: 2025-11-15
 *
 * This widget appears on the tutor dashboard and encourages tutors to
 * mark past sessions as complete, which feeds the CaaS "Proof of Work" metric.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { WidgetSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './PendingLogsWidget.module.css';

interface PendingSession {
  id: string;
  service_name: string;
  session_start_time: string;
  student_name: string;
}

export function PendingLogsWidget() {
  const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingSessions();
  }, []);

  const fetchPendingSessions = async () => {
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch confirmed bookings where session has ended but not marked complete
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          service_name,
          session_start_time,
          session_duration,
          student_id,
          profiles:student_id (
            full_name
          )
        `)
        .eq('tutor_id', user.id)
        .eq('status', 'Confirmed')
        .lt('session_start_time', now)
        .order('session_start_time', { ascending: false })
        .limit(5);

      if (error) throw error;

      const sessions: PendingSession[] = (data || []).map((booking: any) => ({
        id: booking.id,
        service_name: booking.service_name,
        session_start_time: booking.session_start_time,
        student_name: booking.profiles?.full_name || 'Student',
      }));

      setPendingSessions(sessions);
    } catch (error) {
      console.error('Error fetching pending sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompletion = async (sessionId: string) => {
    setCompleting(sessionId);
    try {
      const response = await fetch(`/api/wisespace/${sessionId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark session complete');
      }

      toast.success('Session marked as complete!');

      // Remove from list
      setPendingSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      toast.error('Failed to mark session complete');
      console.error(error);
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return <WidgetSkeleton showIcon={true} />;
  }

  if (pendingSessions.length === 0) {
    return null; // Don't show widget if no pending sessions
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <Clock size={20} />
        <h3 className={styles.title}>Pending Actions</h3>
        <span className={styles.badge}>{pendingSessions.length}</span>
      </div>

      <p className={styles.description}>
        Mark completed sessions to improve your CaaS score
      </p>

      <div className={styles.sessionList}>
        {pendingSessions.map((session) => {
          const sessionDate = new Date(session.session_start_time);
          const formattedDate = sessionDate.toLocaleDateString('en-GB', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <div key={session.id} className={styles.sessionItem}>
              <div className={styles.sessionInfo}>
                <p className={styles.sessionName}>{session.service_name}</p>
                <p className={styles.sessionMeta}>
                  {session.student_name} · {formattedDate}
                </p>
              </div>
              <button
                onClick={() => handleConfirmCompletion(session.id)}
                className={styles.confirmButton}
                disabled={completing === session.id}
              >
                <CheckCircle size={16} />
                {completing === session.id ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
